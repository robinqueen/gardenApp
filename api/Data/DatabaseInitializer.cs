using Microsoft.EntityFrameworkCore;

namespace GardenApp.Api.Data;

/// <summary>
/// Initialises the SQLite database on startup.
///
/// Strategy:
///   1. <c>EnsureCreated</c> — creates all tables from the current EF model if
///      the DB file does not yet exist.  For a new install this is all that runs.
///   2. Safe <c>ALTER TABLE … ADD COLUMN</c> statements — adds any columns that
///      were introduced in later versions so existing DB files are upgraded
///      without losing data.  SQLite does not support IF NOT EXISTS on ALTER
///      TABLE, so we catch and swallow the "duplicate column" error.
/// </summary>
public static class DatabaseInitializer
{
    public static async Task InitializeAsync(AppDbContext db)
    {
        // Create tables that don't exist yet (no-op if already up to date)
        await db.Database.EnsureCreatedAsync();

        // Safely apply additive schema changes for installs that pre-date
        // the HouseholdId column on each list table.
        await AddColumnSafe(db, "ALTER TABLE UserSeeds     ADD COLUMN HouseholdId TEXT NOT NULL DEFAULT 'default'");
        await AddColumnSafe(db, "ALTER TABLE Tasks         ADD COLUMN HouseholdId TEXT NOT NULL DEFAULT 'default'");
        await AddColumnSafe(db, "ALTER TABLE ActivityLogs  ADD COLUMN HouseholdId TEXT NOT NULL DEFAULT 'default'");
        await AddColumnSafe(db, "ALTER TABLE Seasons       ADD COLUMN HouseholdId TEXT NOT NULL DEFAULT 'default'");

        // YieldAmount / YieldUnit were added in the yield-log feature
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

    /// <summary>
    /// Runs an ALTER TABLE … ADD COLUMN statement and silently ignores the
    /// "duplicate column name" error that SQLite raises if the column
    /// already exists.
    /// </summary>
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
