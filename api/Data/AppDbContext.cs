using Microsoft.EntityFrameworkCore;
using GardenApp.Api.Models;

namespace GardenApp.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<SettingsRecord> Settings => Set<SettingsRecord>();
    public DbSet<GardenRecord> Gardens => Set<GardenRecord>();
    public DbSet<UserSeedRecord> UserSeeds => Set<UserSeedRecord>();
    public DbSet<TaskRecord> Tasks => Set<TaskRecord>();
    public DbSet<ActivityLogRecord> ActivityLogs => Set<ActivityLogRecord>();
    public DbSet<GardenSeasonRecord> Seasons => Set<GardenSeasonRecord>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        // Tasks: composite index on household + date for filtered range queries
        builder.Entity<TaskRecord>()
            .HasIndex(t => new { t.HouseholdId, t.Date });

        // Activity logs: composite index on household + date for recent-first queries
        builder.Entity<ActivityLogRecord>()
            .HasIndex(a => new { a.HouseholdId, a.Date });

        // User seeds: index on household
        builder.Entity<UserSeedRecord>()
            .HasIndex(s => s.HouseholdId);

        // Seasons: composite index on household + year for ordering
        builder.Entity<GardenSeasonRecord>()
            .HasIndex(s => new { s.HouseholdId, s.Year });
    }
}
