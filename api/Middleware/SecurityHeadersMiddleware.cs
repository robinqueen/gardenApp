namespace GardenApp.Api.Middleware;

/// <summary>
/// Injects security response headers on every request.
/// These headers harden the app against common web attacks even before
/// any auth logic runs.
/// </summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public Task InvokeAsync(HttpContext ctx)
    {
        var h = ctx.Response.Headers;

        // Prevent browsers from MIME-sniffing responses
        h.XContentTypeOptions = "nosniff";

        // Block this app from being embedded in an iframe (clickjacking)
        h.XFrameOptions = "DENY";

        // Modern recommendation: disable the legacy XSS filter (it can introduce bugs)
        h.Append("X-XSS-Protection", "0");

        // Don't send the full Referer URL to third parties
        h.Append("Referrer-Policy", "strict-origin-when-cross-origin");

        // Restrict access to browser features we don't need
        h.Append("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");

        // Content-Security-Policy:
        // - default-src 'self' : only load resources from our own origin
        // - script-src 'self' + analytics CDNs (GA4, Clarity)
        // - style-src 'self' 'unsafe-inline' : inline styles allowed (Vite/React needs this)
        // - img-src 'self' data: https: : allow HTTPS images + data URIs (avatars)
        // - connect-src 'self' + analytics endpoints for GA4 and Clarity
        // - frame-ancestors 'none' : equivalent to X-Frame-Options DENY but for CSP
        h.Append("Content-Security-Policy",
            "default-src 'self'; " +
            "script-src 'self' https://www.googletagmanager.com https://*.clarity.ms https://static.cloudflareinsights.com; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "connect-src 'self' " +
                "https://www.google-analytics.com " +
                "https://analytics.google.com " +
                "https://region1.google-analytics.com " +
                "https://stats.g.doubleclick.net " +
                "https://*.clarity.ms " +
                "https://cloudflareinsights.com; " +
            "font-src 'self'; " +
            "object-src 'none'; " +
            "frame-ancestors 'none'; " +
            "base-uri 'self';");

        return next(ctx);
    }
}
