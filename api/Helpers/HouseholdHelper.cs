using System.Security.Claims;

namespace GardenApp.Api.Helpers;

/// <summary>
/// Resolves the HouseholdId that scopes all garden data for a request.
///
/// Priority order:
///   1. JWT claim "household_id" — set when Auth:Enabled = true and the user
///      has a valid access token cookie. This is the authoritative source;
///      a client cannot forge it without the RS256 private key.
///   2. X-Household-Id request header — fallback for self-hosted instances
///      running without authentication (Auth:Enabled = false).
///   3. "default" — legacy single-user fallback.
///
/// Endpoints that use .RequireAuthorization() will reject unauthenticated
/// requests before this helper is ever called in hosted mode.
/// </summary>
public static class HouseholdHelper
{
    private const string ClaimName  = "household_id";
    private const string HeaderName = "X-Household-Id";
    private const string DefaultId  = "default";

    public static string GetHouseholdId(HttpRequest request)
    {
        // Authenticated path: JWT claim is tamper-proof
        var claim = request.HttpContext.User.FindFirstValue(ClaimName);
        if (!string.IsNullOrEmpty(claim))
            return claim;

        // Self-hosted fallback: trust the header (no auth configured)
        if (request.Headers.TryGetValue(HeaderName, out var values))
        {
            var id = values.FirstOrDefault()?.Trim();
            if (!string.IsNullOrEmpty(id))
                return id;
        }

        return DefaultId;
    }
}
