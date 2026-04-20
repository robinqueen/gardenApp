using System.Security.Claims;
using GardenApp.Api.Data;
using GardenApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GardenApp.Api.Endpoints;

/// <summary>
/// Back-of-house admin endpoints. All require the "AdminOnly" authorization policy,
/// which verifies both the JWT claim AND re-checks IsAdmin from the database so that
/// revoked admins cannot use an outstanding token.
/// </summary>
public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/admin")
            .WithTags("Admin")
            .RequireAuthorization("AdminOnly");

        // ── User list ──────────────────────────────────────────────────────
        group.MapGet("/users", async (AppDbContext db, int page = 1, int pageSize = 50) =>
        {
            pageSize = Math.Clamp(pageSize, 1, 200);
            var skip = (Math.Max(1, page) - 1) * pageSize;

            var total = await db.Users.CountAsync();
            var users = await db.Users
                .OrderByDescending(u => u.CreatedAt)
                .Skip(skip)
                .Take(pageSize)
                .Select(u => new UserSummaryDto(
                    u.Id,
                    u.Email,
                    u.DisplayName,
                    u.Tier,
                    u.SubscriptionStatus,
                    u.SubscriptionExpiresAt,
                    u.IsAdmin,
                    u.CreatedAt,
                    u.LastLoginAt))
                .ToListAsync();

            return Results.Ok(new { total, page, pageSize, users });
        });

        // ── Single user detail ─────────────────────────────────────────────
        group.MapGet("/users/{id}", async (string id, AppDbContext db) =>
        {
            var user = await db.Users.FindAsync(id);
            return user is null ? Results.NotFound() : Results.Ok(user);
        });

        // ── Update tier (free ↔ paid) ──────────────────────────────────────
        group.MapPatch("/users/{id}/tier", async (string id, TierUpdateDto dto, AppDbContext db) =>
        {
            if (dto.Tier is not ("free" or "paid"))
                return Results.BadRequest("Tier must be 'free' or 'paid'.");

            var user = await db.Users.FindAsync(id);
            if (user is null) return Results.NotFound();

            user.Tier = dto.Tier;
            await db.SaveChangesAsync();
            return Results.Ok(new { user.Id, user.Tier });
        });

        // ── Update subscription status ─────────────────────────────────────
        group.MapPatch("/users/{id}/subscription", async (
            string id, SubscriptionUpdateDto dto, AppDbContext db) =>
        {
            if (dto.Status is not ("active" or "trial" or "expired" or "cancelled"))
                return Results.BadRequest("Status must be active | trial | expired | cancelled.");

            var user = await db.Users.FindAsync(id);
            if (user is null) return Results.NotFound();

            user.SubscriptionStatus    = dto.Status;
            user.SubscriptionExpiresAt = dto.ExpiresAt;
            await db.SaveChangesAsync();
            return Results.Ok(new { user.Id, user.SubscriptionStatus, user.SubscriptionExpiresAt });
        });

        // ── Toggle admin flag ──────────────────────────────────────────────
        group.MapPatch("/users/{id}/admin", async (
            string id, AdminFlagDto dto, HttpContext ctx, AppDbContext db) =>
        {
            // Prevent self-demotion — accidental lockout protection
            var callerId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (id == callerId && !dto.IsAdmin)
                return Results.BadRequest("You cannot remove your own admin privileges.");

            var user = await db.Users.FindAsync(id);
            if (user is null) return Results.NotFound();

            user.IsAdmin = dto.IsAdmin;
            await db.SaveChangesAsync();
            return Results.Ok(new { user.Id, user.IsAdmin });
        });

        // ── Delete user + all their data ───────────────────────────────────
        group.MapDelete("/users/{id}", async (string id, HttpContext ctx, AppDbContext db) =>
        {
            var callerId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (id == callerId)
                return Results.BadRequest("You cannot delete your own account via the admin panel.");

            var user = await db.Users.FindAsync(id);
            if (user is null) return Results.NotFound();

            // Delete all household data for this user
            await db.Database.ExecuteSqlRawAsync(
                "DELETE FROM Gardens       WHERE \"Id\"         = {0}", id);
            await db.Database.ExecuteSqlRawAsync(
                "DELETE FROM Settings      WHERE \"Id\"         = {0}", id);
            await db.Database.ExecuteSqlRawAsync(
                "DELETE FROM UserSeeds     WHERE \"HouseholdId\" = {0}", id);
            await db.Database.ExecuteSqlRawAsync(
                "DELETE FROM Tasks         WHERE \"HouseholdId\" = {0}", id);
            await db.Database.ExecuteSqlRawAsync(
                "DELETE FROM ActivityLogs  WHERE \"HouseholdId\" = {0}", id);
            await db.Database.ExecuteSqlRawAsync(
                "DELETE FROM Seasons       WHERE \"HouseholdId\" = {0}", id);

            // Revoke all refresh tokens
            var tokens = await db.RefreshTokens.Where(t => t.UserId == id).ToListAsync();
            db.RefreshTokens.RemoveRange(tokens);

            db.Users.Remove(user);
            await db.SaveChangesAsync();

            return Results.NoContent();
        });

        // ── Aggregate stats ────────────────────────────────────────────────
        group.MapGet("/stats", async (AppDbContext db) =>
        {
            var totalUsers  = await db.Users.CountAsync();
            var paidUsers   = await db.Users.CountAsync(u => u.Tier == "paid");
            var activeToday = await db.Users.CountAsync(u =>
                u.LastLoginAt >= DateTime.UtcNow.AddHours(-24));
            var newThisMonth = await db.Users.CountAsync(u =>
                u.CreatedAt >= new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc));

            return Results.Ok(new
            {
                totalUsers,
                paidUsers,
                freeUsers   = totalUsers - paidUsers,
                activeToday,
                newThisMonth,
            });
        });
    }
}

// ── DTOs ───────────────────────────────────────────────────────────────────

public record UserSummaryDto(
    string    Id,
    string    Email,
    string    DisplayName,
    string    Tier,
    string    SubscriptionStatus,
    DateTime? SubscriptionExpiresAt,
    bool      IsAdmin,
    DateTime  CreatedAt,
    DateTime  LastLoginAt);

public record TierUpdateDto(string Tier);

public record SubscriptionUpdateDto(string Status, DateTime? ExpiresAt);

public record AdminFlagDto(bool IsAdmin);
