using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using GardenApp.Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace GardenApp.Api.Auth;

/// <summary>
/// Issues RS256-signed access JWTs and generates cryptographically random
/// refresh tokens. Refresh tokens are never persisted in plain form —
/// only their SHA-256 hash is stored in the database.
/// </summary>
public sealed class JwtService(RsaKeyProvider keys, IConfiguration config)
{
    private static readonly JwtSecurityTokenHandler Handler = new();

    private string Issuer        => config["Auth:Issuer"]            ?? "gardenapp";
    private string Audience      => config["Auth:Audience"]          ?? "gardenapp-api";
    private int    AccessMinutes => int.TryParse(config["Auth:AccessTokenMinutes"],  out var v) ? v : 15;
    private int    RefreshDays   => int.TryParse(config["Auth:RefreshTokenDays"],    out var v) ? v : 7;

    /// <summary>
    /// Creates a short-lived RS256-signed JWT for the given user.
    /// Claims are minimal — sensitive decisions (paid gating) are always
    /// re-verified from the database, not trusted from the token alone.
    /// </summary>
    public string CreateAccessToken(UserRecord user)
    {
        var now = DateTime.UtcNow;

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Name,  user.DisplayName),
            // Unique token ID — can be used for revocation lists if needed
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            // household_id is the key used by HouseholdHelper to scope data
            new Claim("household_id", user.Id),
            new Claim("tier",         user.Tier),
            new Claim("is_admin",     user.IsAdmin.ToString().ToLowerInvariant()),
        };

        var descriptor = new SecurityTokenDescriptor
        {
            Subject            = new ClaimsIdentity(claims),
            Expires            = now.AddMinutes(AccessMinutes),
            IssuedAt           = now,
            NotBefore          = now,
            Issuer             = Issuer,
            Audience           = Audience,
            SigningCredentials = keys.SigningCredentials,
        };

        return Handler.WriteToken(Handler.CreateToken(descriptor));
    }

    /// <summary>
    /// Generates a cryptographically random 64-byte refresh token.
    /// Returns the raw value (set in HttpOnly cookie), its hash (stored in DB),
    /// and the expiry timestamp.
    /// </summary>
    public (string Raw, string Hash, DateTime Expires) CreateRefreshToken()
    {
        var raw     = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var hash    = HashToken(raw);
        var expires = DateTime.UtcNow.AddDays(RefreshDays);
        return (raw, hash, expires);
    }

    /// <summary>SHA-256 hex digest of a raw token string.</summary>
    public static string HashToken(string raw)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    /// <summary>
    /// Parameters used by JWT Bearer middleware to validate incoming tokens.
    /// Uses the RSA public key only — the private key is never exposed for validation.
    /// </summary>
    public TokenValidationParameters ValidationParameters => new()
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey         = keys.Key,   // RSA key — .NET uses public half for validation
        ValidateIssuer           = true,
        ValidIssuer              = Issuer,
        ValidateAudience         = true,
        ValidAudience            = Audience,
        ValidateLifetime         = true,
        // Minimal clock skew — tight windows limit replay attack surface
        ClockSkew                = TimeSpan.FromSeconds(30),
        NameClaimType            = JwtRegisteredClaimNames.Sub,
    };
}
