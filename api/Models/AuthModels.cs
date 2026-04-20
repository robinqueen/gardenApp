using System.ComponentModel.DataAnnotations;

namespace GardenApp.Api.Models;

/// <summary>
/// One row per registered user. The PK is a server-generated GUID that
/// becomes the user's HouseholdId — this decouples identity from data.
/// </summary>
public class UserRecord
{
    [Key]
    [MaxLength(36)]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Google's stable "sub" claim. Never changes even if the user's email
    /// or display name changes. Used as the lookup key on every login.
    /// </summary>
    [MaxLength(256)]
    public string GoogleSub { get; set; } = string.Empty;

    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(256)]
    public string DisplayName { get; set; } = string.Empty;

    [MaxLength(1024)]
    public string AvatarUrl { get; set; } = string.Empty;

    /// <summary>"free" | "paid"</summary>
    [MaxLength(32)]
    public string Tier { get; set; } = "free";

    /// <summary>"active" | "trial" | "expired" | "cancelled"</summary>
    [MaxLength(32)]
    public string SubscriptionStatus { get; set; } = "active";

    public DateTime? SubscriptionExpiresAt { get; set; }

    /// <summary>Super-admin flag. Grants access to /api/admin/* endpoints.</summary>
    public bool IsAdmin { get; set; }

    public bool MarketingConsent { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime LastLoginAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Rotating refresh tokens. Only the SHA-256 hash is stored — the raw
/// value lives only in the user's HttpOnly cookie and is never persisted.
/// </summary>
public class RefreshTokenRecord
{
    [Key]
    [MaxLength(36)]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>SHA-256 hex hash of the raw token stored in the browser cookie.</summary>
    [MaxLength(64)]
    public string TokenHash { get; set; } = string.Empty;

    [MaxLength(36)]
    public string UserId { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    /// <summary>Set to true when the token is used (rotation) or on logout.</summary>
    public bool Revoked { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>ID of the token that replaced this one — kept for audit trail.</summary>
    [MaxLength(36)]
    public string? ReplacedBy { get; set; }
}
