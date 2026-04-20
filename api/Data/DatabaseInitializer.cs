using Microsoft.EntityFrameworkCore;

namespace GardenApp.Api.Data;

/// <summary>
/// Initialises the database on startup.
///
/// Strategy:
///   - EnsureCreated: creates all tables from the current EF model if they don't
///     exist yet. Works for both SQLite (dev/self-hosted) and PostgreSQL (hosted).
///   - SQLite-only ALTER TABLE: applies additive column migrations for existing
///     SQLite installs that pre-date certain columns. PostgreSQL fresh installs
///     get the full schema from EnsureCreated and don't need these.
/// </summary>
public static class DatabaseInitializer
{
    public static async Task InitializeAsync(AppDbContext db)
    {
        // Creates all tables that don't yet exist; no-op if schema is up to date
        await db.Database.EnsureCreatedAsync();

        // The ALTER TABLE workarounds below are SQLite-specific.
        // PostgreSQL (and any fresh install) gets the correct schema from EnsureCreated above.
        var isSqlite = db.Database.ProviderName?
            .Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true;

        if (!isSqlite)
            return;

        // ── Additive column migrations for SQLite upgrades ─────────────────
        // SQLite does not support ALTER TABLE … ADD COLUMN IF NOT EXISTS, so we
        // catch the "duplicate column" error and treat it as a no-op.

        await AddColumnSafe(db, "ALTER TABLE UserSeeds     ADD COLUMN HouseholdId TEXT NOT NULL DEFAULT 'default'");
        await AddColumnSafe(db, "ALTER TABLE Tasks         ADD COLUMN HouseholdId TEXT NOT NULL DEFAULT 'default'");
        await AddColumnSafe(db, "ALTER TABLE ActivityLogs  ADD COLUMN HouseholdId TEXT NOT NULL DEFAULT 'default'");
        await AddColumnSafe(db, "ALTER TABLE Seasons       ADD COLUMN HouseholdId TEXT NOT NULL DEFAULT 'default'");

        // YieldAmount / YieldUnit added in the yield-log feature
        await AddColumnSafe(db, "ALTER TABLE ActivityLogs  ADD COLUMN YieldAmount REAL");
        await AddColumnSafe(db, "ALTER TABLE ActivityLogs  ADD COLUMN YieldUnit   TEXT");

        // Season snapshot fields added in API-gaps fix
        await AddColumnSafe(db, "ALTER TABLE Seasons ADD COLUMN ActivitySnapshotJson TEXT NOT NULL DEFAULT '[]'");
        await AddColumnSafe(db, "ALTER TABLE Seasons ADD COLUMN Notes                TEXT NOT NULL DEFAULT ''");

        // Settings fields added in API-gaps fix
        await AddColumnSafe(db, "ALTER TABLE Settings ADD COLUMN PlotWidthFt  INTEGER");
        await AddColumnSafe(db, "ALTER TABLE Settings ADD COLUMN PlotLengthFt INTEGER");
        await AddColumnSafe(db, "ALTER TABLE Settings ADD COLUMN PlotTopEdge  TEXT");
    }

    private static async Task AddColumnSafe(AppDbContext db, string sql)
    {
        try
        {
            await db.Database.ExecuteSqlRawAsync(sql);
        }
        catch (Exception ex) when (
            ex.Message.Contains("duplicate column name", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("already exists",        StringComparison.OrdinalIgnoreCase))
        {
            // Column already present — nothing to do
        }
    }
}
