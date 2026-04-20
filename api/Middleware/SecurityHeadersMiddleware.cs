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
        // - script-src 'self' : no inline scripts, no CDN scripts
        // - style-src 'self' 'unsafe-inline' : inline styles allowed (Vite/React needs this)
        // - img-src 'self' data: https: : allow HTTPS images + data URIs (avatars)
        // - connect-src 'self' : API calls go to same origin only
        // - frame-ancestors 'none' : equivalent to X-Frame-Options DENY but for CSP
        // Tighten 'unsafe-inline' further by adding a nonce in a future pass.
        h.Append("Content-Security-Policy",
            "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "connect-src 'self'; " +
            "font-src 'self'; " +
            "object-src 'none'; " +
            "frame-ancestors 'none'; " +
            "base-uri 'self';");

        return next(ctx);
    }
}
