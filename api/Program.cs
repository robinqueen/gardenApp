using System.Security.Claims;
using System.Threading.RateLimiting;
using GardenApp.Api.Auth;
using Microsoft.AspNetCore.Authorization;
using GardenApp.Api.Data;
using GardenApp.Api.Endpoints;
using GardenApp.Api.Middleware;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var config  = builder.Configuration;

// ─── Database ──────────────────────────────────────────────────────────────
// Switch between SQLite (dev / self-hosted) and PostgreSQL (hosted / Unraid)
// via the "DatabaseProvider" config key. Connection string comes from the
// environment variable ConnectionStrings__DefaultConnection — never hardcoded.

var dbProvider = config["DatabaseProvider"] ?? "SQLite";

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connStr = config.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException(
            "ConnectionStrings:DefaultConnection is not set. " +
            "For PostgreSQL: Host=...;Database=...;Username=...;Password=... " +
            "For SQLite: Data Source=/path/to/gardenapp.db");

    if (dbProvider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
        options.UseNpgsql(connStr);
    else
        options.UseSqlite(connStr);
});

// ─── Auth ──────────────────────────────────────────────────────────────────
// Auth is opt-in via Auth:Enabled. Self-hosters run with it off and continue
// using the X-Household-Id header. Hosted (Unraid) sets it to true.

var authEnabled = config.GetValue<bool>("Auth:Enabled");

if (authEnabled)
{
    // Key provider + JWT service are singletons — loaded once on startup
    builder.Services.AddSingleton<RsaKeyProvider>();
    builder.Services.AddSingleton<JwtService>();

    builder.Services.AddAuthentication(options =>
    {
        // JWT Bearer is the default for API calls
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
        // Cookie is used only for the short-lived OAuth dance state
        options.DefaultSignInScheme       = CookieAuthenticationDefaults.AuthenticationScheme;
    })
    .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, cookie =>
    {
        // This cookie exists only for the seconds between Google's redirect
        // and our /auth/signin handler. It is destroyed immediately after.
        cookie.Cookie.Name        = AuthEndpoints.OAuthCookieName_;
        cookie.Cookie.HttpOnly    = true;
        cookie.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        // Lax (not Strict) is required here: Google redirects back to us as a
        // top-level navigation, which Strict would block.
        cookie.Cookie.SameSite    = SameSiteMode.Lax;
        cookie.ExpireTimeSpan     = TimeSpan.FromMinutes(5);
        cookie.SlidingExpiration  = false;
    })
    .AddGoogle(google =>
    {
        google.ClientId     = config["Auth:Google:ClientId"]
            ?? throw new InvalidOperationException(
                "Auth:Google:ClientId is not set. Use the environment variable Auth__Google__ClientId.");
        google.ClientSecret = config["Auth:Google:ClientSecret"]
            ?? throw new InvalidOperationException(
                "Auth:Google:ClientSecret is not set. Use the environment variable Auth__Google__ClientSecret.");

        // Where Google sends the browser back after consent
        google.CallbackPath = "/auth/callback";

        // We don't need Google's access/refresh tokens after the ID token exchange
        google.SaveTokens = false;

        // Capture the profile picture claim — not included by default
        google.Events.OnCreatingTicket = ctx =>
        {
            if (ctx.User.TryGetProperty("picture", out var pic))
                ctx.Identity?.AddClaim(new Claim("picture", pic.GetString() ?? string.Empty));
            return Task.CompletedTask;
        };

        // Belt-and-suspenders: force https:// in the redirect_uri we send to Google.
        // Even if UseForwardedHeaders hasn't corrected the scheme yet (e.g. NPM
        // doesn't forward X-Forwarded-Proto), this ensures Google always receives
        // the registered https:// URI and never rejects with redirect_uri_mismatch.
        google.Events.OnRedirectToAuthorizationEndpoint = ctx =>
        {
            var uri = ctx.RedirectUri;
            // The redirect_uri query param is URL-encoded; http%3A → https%3A
            if (uri.Contains("redirect_uri=http%3A", StringComparison.OrdinalIgnoreCase))
                uri = uri.Replace("redirect_uri=http%3A", "redirect_uri=https%3A",
                                  StringComparison.OrdinalIgnoreCase);
            ctx.Response.Redirect(uri);
            return Task.CompletedTask;
        };
    })
    .AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, _ => { /* configured below via IConfigureOptions */ });

    // Configure JWT Bearer after DI is wired so we can inject JwtService
    // (avoids the BuildServiceProvider() anti-pattern)
    builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
        .Configure<JwtService>((options, jwtSvc) =>
        {
            options.TokenValidationParameters = jwtSvc.ValidationParameters;
            options.Events = new JwtBearerEvents
            {
                // Read the JWT from our HttpOnly cookie instead of the Authorization header.
                // This prevents XSS from stealing tokens via JavaScript (no localStorage).
                OnMessageReceived = ctx =>
                {
                    ctx.Token = ctx.Request.Cookies[AuthEndpoints.AccessCookieName_];
                    return Task.CompletedTask;
                },
                OnChallenge = ctx =>
                {
                    // Return clean 401 JSON rather than a redirect to a login page
                    ctx.HandleResponse();
                    ctx.Response.StatusCode  = 401;
                    ctx.Response.ContentType = "application/json";
                    return ctx.Response.WriteAsync(
                        "{\"error\":\"unauthorized\",\"message\":\"Authentication required.\"}");
                },
                OnForbidden = ctx =>
                {
                    ctx.Response.StatusCode  = 403;
                    ctx.Response.ContentType = "application/json";
                    return ctx.Response.WriteAsync(
                        "{\"error\":\"forbidden\",\"message\":\"Insufficient permissions.\"}");
                },
            };
        });

    // Register the custom authorization handler as a singleton —
    // it only reads config, no scoped dependencies.
    builder.Services.AddSingleton<IAuthorizationHandler, PaidOrAllowedHandler>();

    builder.Services.AddAuthorization(opts =>
    {
        opts.AddPolicy("AuthenticatedUser", p => p.RequireAuthenticatedUser());

        // AdminOnly: JWT claim gate (quick). Endpoint handlers re-check the DB
        // for revocation within the 15-minute token window.
        opts.AddPolicy("AdminOnly", p =>
            p.RequireAuthenticatedUser()
             .RequireClaim("is_admin", "true"));

        // PaidOrAllowed: gates all garden data endpoints.
        // Passes if: IsAdmin=true  OR  Tier=paid  OR  email in AllowedEmails whitelist.
        // Everyone else gets 403 — their data endpoints return "subscription required".
        opts.AddPolicy("PaidOrAllowed", p =>
            p.RequireAuthenticatedUser()
             .AddRequirements(new PaidOrAllowedRequirement()));
    });
}

// ─── Rate limiting ─────────────────────────────────────────────────────────
// Tight limits on auth endpoints to blunt credential-stuffing and brute-force.
// General API uses a relaxed window to accommodate normal use.

builder.Services.AddRateLimiter(rl =>
{
    // Global limiter: 120 requests / minute per IP across all routes
    rl.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
    {
        var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit         = 600,
            Window              = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit          = 5,
        });
    });

    // Auth endpoints: strict 10 requests / minute per IP to blunt brute-force
    rl.AddFixedWindowLimiter("auth", options =>
    {
        options.PermitLimit         = 10;
        options.Window              = TimeSpan.FromMinutes(1);
        options.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        options.QueueLimit          = 0;
    });

    rl.RejectionStatusCode = 429;
});

// ─── CORS ──────────────────────────────────────────────────────────────────
// In production, lock this to your actual domain(s) via Auth:AllowedOrigins.
// Credentials (cookies) require an explicit origin — wildcard is NOT allowed.

var allowedOrigins = config.GetSection("Auth:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173", "http://localhost:3000", "http://localhost:4173"];

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()));   // Required for HttpOnly cookie auth

// ─── Forwarded headers (reverse proxy support) ─────────────────────────────
// NPM terminates HTTPS and forwards plain HTTP to this container.
// We must tell ASP.NET Core to trust the X-Forwarded-Proto header so it
// knows the original request was HTTPS — otherwise it builds Google OAuth
// redirect URIs with http:// and Google rejects them (redirect_uri_mismatch).
//
// Registered here in services (before Build) so the options are wired up
// before UseForwardedHeaders() is called in the pipeline.
// KnownNetworks + KnownProxies are cleared so we trust any proxy IP —
// safe because the container is VLAN-isolated and only reachable from NPM.
builder.Services.Configure<ForwardedHeadersOptions>(fwd =>
{
    fwd.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    fwd.KnownNetworks.Clear();   // removes default loopback-only restriction
    fwd.KnownProxies.Clear();    // trust any upstream proxy IP (IPv4 and IPv6)
});

// ─── Build app ─────────────────────────────────────────────────────────────
var app = builder.Build();

// ─── Middleware pipeline (ORDER MATTERS) ───────────────────────────────────

// Forwarded headers — MUST be first so every subsequent middleware sees the
// correct scheme (https) and client IP.
app.UseForwardedHeaders();

// HTTPS redirect is intentionally omitted — NPM already handles TLS.
// UseHttpsRedirection here would cause redirect loops because the container
// only listens on HTTP (port 8080) and has no HTTPS listener to redirect to.
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

// Security headers on every response
app.UseMiddleware<SecurityHeadersMiddleware>();

// CORS before auth so preflight OPTIONS requests are answered correctly
app.UseCors();

// Rate limiting
app.UseRateLimiter();

// Auth middleware (reads JWT cookie, populates HttpContext.User)
if (authEnabled)
{
    app.UseAuthentication();
    app.UseAuthorization();
}

// ─── Static files (React PWA) ──────────────────────────────────────────────
// index.html and sw.js must never be HTTP-cached so the browser always fetches
// the latest version after a deploy (prevents stale PWA after update).
// Hashed JS/CSS assets get default long-lived caching.
var noCacheHtml = new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        var name = ctx.File.Name;
        if (name.EndsWith(".html", StringComparison.OrdinalIgnoreCase) || name == "sw.js")
        {
            ctx.Context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            ctx.Context.Response.Headers.Pragma = "no-cache";
        }
    }
};

app.UseDefaultFiles();
app.UseStaticFiles(noCacheHtml);

// SPA fallback: any unmatched path (e.g. /settings, /dashboard after Ctrl+Shift+R)
// returns index.html so the React router can take over client-side.
// Must come AFTER UseStaticFiles so real assets (JS, CSS, images) are still served.
app.MapFallbackToFile("index.html", noCacheHtml);

// ─── Health check ──────────────────────────────────────────────────────────
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }))
   .WithTags("System");

// ─── Auth endpoints (public — no RequireAuthorization) ─────────────────────
if (authEnabled)
{
    app.MapAuthEndpoints();
    app.MapAdminEndpoints();
}

// ─── API endpoints ──────────────────────────────────────────────────────────
// In hosted mode all data endpoints require a valid JWT.
// In self-hosted mode they are open (rely on X-Household-Id header).

if (authEnabled)
{
    app.MapSettingsEndpoints(requireAuth: true);
    app.MapGardenEndpoints(requireAuth: true);
    app.MapActivityEndpoints(requireAuth: true);
}
else
{
    app.MapSettingsEndpoints(requireAuth: false);
    app.MapGardenEndpoints(requireAuth: false);
    app.MapActivityEndpoints(requireAuth: false);
}

// ─── Database init ─────────────────────────────────────────────────────────
using var scope = app.Services.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
await DatabaseInitializer.InitializeAsync(db);

app.Run();
