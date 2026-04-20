using System.Security.Claims;
using GardenApp.Api.Auth;
using GardenApp.Api.Data;
using GardenApp.Api.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.EntityFrameworkCore;

namespace GardenApp.Api.Endpoints;

public static class AuthEndpoints
{
    // Cookie names — keep them generic so they don't leak app details
    private const string AccessCookieName  = "ga_at";
    private const string RefreshCookieName = "ga_rt";
    private const string OAuthCookieName   = "ga_oa";

    public static void MapAuthEndpoints(this WebApplication app)
    {
        // Only the OAuth flow + logout use the strict auth rate limit.
        // /me and /refresh are called on every page load — they use the global limiter.
        var group = app.MapGroup("/auth").WithTags("Auth");

        // ── Step 1: Start Google OAuth flow ───────────────────────────────
        // Browser navigates here → server issues a challenge → redirect to Google.
        // The state parameter (CSRF nonce) is handled automatically by the middleware.
        group.MapGet("/google", (HttpContext ctx, IConfiguration config) =>
        {
            var frontendUrl = config["Auth:FrontendUrl"] ?? "/";
            var props = new AuthenticationProperties
            {
                RedirectUri = "/auth/signin",
                Items       = { ["returnUrl"] = frontendUrl },
            };
            return ctx.ChallengeAsync(GoogleDefaults.AuthenticationScheme, props);
        }).RequireRateLimiting("auth");

        // ── Step 2: Post-OAuth handler ─────────────────────────────────────
        // Google redirects to /auth/callback (handled by middleware), which then
        // signs the user in via the short-lived OAuth session cookie and redirects
        // here. We read the Google claims, upsert the user, and issue our own JWT.
        group.MapGet("/signin", async (HttpContext ctx, AppDbContext db, JwtService jwtService) =>
        {
            // Read the Google identity from the OAuth session cookie
            var result = await ctx.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            if (!result.Succeeded)
                return Results.Redirect("/auth/error?reason=google_auth_failed");

            var principal = result.Principal!;

            // Google's stable identifier — never changes, even if email/name does
            var googleSub = principal.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(googleSub))
                return Results.Redirect("/auth/error?reason=missing_sub");

            var email      = principal.FindFirstValue(ClaimTypes.Email)      ?? string.Empty;
            var name       = principal.FindFirstValue(ClaimTypes.Name)       ?? string.Empty;
            var avatarUrl  = principal.FindFirstValue("picture")             ?? string.Empty;

            // Bootstrap admin: if this Google account's email matches Auth:BootstrapAdminEmail
            // in config, it is automatically granted admin on first login.
            // Set this to your own Gmail address before first boot, then remove it after.
            var bootstrapEmail = ctx.RequestServices
                .GetRequiredService<IConfiguration>()["Auth:BootstrapAdminEmail"] ?? string.Empty;
            var isBootstrapAdmin = !string.IsNullOrEmpty(bootstrapEmail)
                && email.Equals(bootstrapEmail, StringComparison.OrdinalIgnoreCase);

            // Upsert user — create on first login, update profile on subsequent logins
            var user = await db.Users.FirstOrDefaultAsync(u => u.GoogleSub == googleSub);
            if (user is null)
            {
                user = new UserRecord
                {
                    Id          = Guid.NewGuid().ToString(),
                    GoogleSub   = googleSub,
                    Email       = email,
                    DisplayName = name,
                    AvatarUrl   = avatarUrl,
                    IsAdmin     = isBootstrapAdmin,
                    CreatedAt   = DateTime.UtcNow,
                    LastLoginAt = DateTime.UtcNow,
                };
                db.Users.Add(user);
            }
            else
            {
                user.Email       = email;
                user.DisplayName = name;
                user.AvatarUrl   = avatarUrl;
                user.LastLoginAt = DateTime.UtcNow;
                // Promote to admin if bootstrap email matches and not already admin
                if (isBootstrapAdmin && !user.IsAdmin)
                    user.IsAdmin = true;
            }
            await db.SaveChangesAsync();

            // Destroy the short-lived OAuth session cookie — it has served its purpose
            await ctx.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

            // Issue our own JWT access token (15 min) + rotating refresh token (7 days)
            var accessToken = jwtService.CreateAccessToken(user);
            var (rawRefresh, hashRefresh, refreshExpiry) = jwtService.CreateRefreshToken();

            db.RefreshTokens.Add(new RefreshTokenRecord
            {
                UserId    = user.Id,
                TokenHash = hashRefresh,
                ExpiresAt = refreshExpiry,
            });
            await db.SaveChangesAsync();

            SetAccessCookie(ctx, accessToken, DateTime.UtcNow.AddMinutes(15));
            SetRefreshCookie(ctx, rawRefresh, refreshExpiry);

            var returnUrl = result.Properties?.Items["returnUrl"] ?? "/";
            return Results.Redirect(returnUrl);
        }).RequireRateLimiting("auth");

        // ── Current user info ──────────────────────────────────────────────
        // React calls this on load to know who is logged in and their tier.
        group.MapGet("/me", async (HttpContext ctx, AppDbContext db) =>
        {
            var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            // Re-read from DB so revoked accounts / tier changes take effect immediately
            var user = await db.Users.FindAsync(userId);
            if (user is null)
                return Results.Unauthorized();

            return Results.Ok(new
            {
                user.Id,
                user.Email,
                user.DisplayName,
                user.AvatarUrl,
                user.Tier,
                user.SubscriptionStatus,
                user.SubscriptionExpiresAt,
                user.IsAdmin,
                user.CreatedAt,
                user.LastLoginAt,
            });
        }).RequireAuthorization();

        // ── Refresh access token ───────────────────────────────────────────
        // Called automatically by the React client when a 401 is received.
        // Rotation: the old refresh token is revoked and a new pair is issued.
        group.MapPost("/refresh", async (HttpContext ctx, AppDbContext db, JwtService jwtService) =>
        {
            var rawToken = ctx.Request.Cookies[RefreshCookieName];
            if (string.IsNullOrEmpty(rawToken))
                return Results.Unauthorized();

            var hash   = JwtService.HashToken(rawToken);
            var stored = await db.RefreshTokens
                .FirstOrDefaultAsync(t => t.TokenHash == hash && !t.Revoked);

            if (stored is null || stored.ExpiresAt < DateTime.UtcNow)
            {
                // Token is invalid, expired, or already used — clear cookies and force re-login
                ClearAuthCookies(ctx);
                return Results.Unauthorized();
            }

            var user = await db.Users.FindAsync(stored.UserId);
            if (user is null)
            {
                ClearAuthCookies(ctx);
                return Results.Unauthorized();
            }

            // Rotate: revoke old token, issue new pair
            stored.Revoked = true;

            var accessToken = jwtService.CreateAccessToken(user);
            var (rawNew, hashNew, newExpiry) = jwtService.CreateRefreshToken();

            var newToken = new RefreshTokenRecord
            {
                UserId    = user.Id,
                TokenHash = hashNew,
                ExpiresAt = newExpiry,
            };
            stored.ReplacedBy = newToken.Id;
            db.RefreshTokens.Add(newToken);

            user.LastLoginAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            SetAccessCookie(ctx, accessToken, DateTime.UtcNow.AddMinutes(15));
            SetRefreshCookie(ctx, rawNew, newExpiry);

            return Results.Ok();
        });

        // ── Logout ─────────────────────────────────────────────────────────
        group.MapPost("/logout", async (HttpContext ctx, AppDbContext db) =>
        {
            // Revoke all refresh tokens for this user
            var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrEmpty(userId))
            {
                var tokens = await db.RefreshTokens
                    .Where(t => t.UserId == userId && !t.Revoked)
                    .ToListAsync();
                foreach (var t in tokens)
                    t.Revoked = true;
                await db.SaveChangesAsync();
            }

            ClearAuthCookies(ctx);
            return Results.Ok();
        }).RequireRateLimiting("auth");

        // ── Auth error landing page ────────────────────────────────────────
        group.MapGet("/error", (string? reason) =>
            Results.Problem(
                detail:     $"Authentication failed. Reason: {reason ?? "unknown"}",
                statusCode: 401,
                title:      "Authentication Error"));
    }

    // ── Cookie helpers ─────────────────────────────────────────────────────

    internal static void SetAccessCookie(HttpContext ctx, string token, DateTime expires) =>
        ctx.Response.Cookies.Append(AccessCookieName, token, new CookieOptions
        {
            HttpOnly = true,
            Secure   = true,
            SameSite = SameSiteMode.Strict,
            Expires  = expires,
            Path     = "/",
        });

    internal static void SetRefreshCookie(HttpContext ctx, string token, DateTime expires) =>
        ctx.Response.Cookies.Append(RefreshCookieName, token, new CookieOptions
        {
            HttpOnly = true,
            Secure   = true,
            SameSite = SameSiteMode.Strict,
            Expires  = expires,
            // Scope the refresh cookie to only the refresh endpoint —
            // the browser will NOT send it on any other request
            Path     = "/auth/refresh",
        });

    internal static void ClearAuthCookies(HttpContext ctx)
    {
        ctx.Response.Cookies.Delete(AccessCookieName,  new CookieOptions { Path = "/" });
        ctx.Response.Cookies.Delete(RefreshCookieName, new CookieOptions { Path = "/auth/refresh" });
    }

    // Exposed for Program.cs configuration — keeps the cookie name in one place
    internal const string AccessCookieName_ = AccessCookieName;
    internal const string OAuthCookieName_  = OAuthCookieName;
}
