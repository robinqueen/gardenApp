using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace GardenApp.Api.Auth;

/// <summary>
/// Requirement: the user must pass at least one of three checks to access
/// cloud sync (garden data endpoints):
///   1. IsAdmin claim = "true"   — admins always have full access
///   2. Tier claim   = "paid"    — active subscribers
///   3. Email in Auth:AllowedEmails — whitelisted accounts (testers, friends, etc.)
///
/// Free Google sign-in accounts receive 403 — the React client falls back to
/// local (browser) storage for them. They can still use the app, just not cloud sync.
/// </summary>
public class PaidOrAllowedRequirement : IAuthorizationRequirement { }

public class PaidOrAllowedHandler : AuthorizationHandler<PaidOrAllowedRequirement>
{
    private readonly IConfiguration _config;
    private readonly ILogger<PaidOrAllowedHandler> _logger;

    public PaidOrAllowedHandler(IConfiguration config, ILogger<PaidOrAllowedHandler> logger)
    {
        _config = config;
        _logger = logger;
    }

    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PaidOrAllowedRequirement requirement)
    {
        var claims = context.User;

        // ── 1. Admin bypass ────────────────────────────────────────────────
        if (claims.FindFirstValue("is_admin") == "true")
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        // ── 2. Paid tier ───────────────────────────────────────────────────
        if (claims.FindFirstValue("tier") == "paid")
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        // ── 3. Whitelisted email ───────────────────────────────────────────
        var allowedEmails = _config.GetSection("Auth:AllowedEmails").Get<string[]>() ?? [];
        var email = claims.FindFirstValue("email")
                 ?? claims.FindFirstValue(ClaimTypes.Email)
                 ?? string.Empty;

        if (!string.IsNullOrEmpty(email) &&
            allowedEmails.Any(e => string.Equals(e.Trim(), email, StringComparison.OrdinalIgnoreCase)))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        // ── Not allowed → 403 (client falls back to local storage) ────────
        _logger.LogInformation(
            "Cloud sync denied for {Email} — not admin, paid, or whitelisted. Using local storage.",
            string.IsNullOrEmpty(email) ? "(unknown)" : email);

        return Task.CompletedTask;
    }
}
