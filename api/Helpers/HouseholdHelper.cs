namespace GardenApp.Api.Helpers;

/// <summary>
/// Extracts the household ID from the incoming HTTP request.
///
/// The client sends an <c>X-Household-Id</c> header on every request.
/// When the header is absent (legacy clients or the /health ping) the
/// value falls back to "default" so existing single-user data is untouched.
/// </summary>
public static class HouseholdHelper
{
    private const string HeaderName = "X-Household-Id";
    private const string DefaultId  = "default";

    /// <summary>
    /// Returns the household ID from the request, or "default" if the header
    /// is absent or blank.
    /// </summary>
    public static string GetHouseholdId(HttpRequest request)
    {
        if (request.Headers.TryGetValue(HeaderName, out var values))
        {
            var id = values.FirstOrDefault()?.Trim();
            if (!string.IsNullOrEmpty(id))
                return id;
        }
        return DefaultId;
    }
}
