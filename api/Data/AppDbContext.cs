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
        // Tasks: index on date for range queries
        builder.Entity<TaskRecord>()
            .HasIndex(t => t.Date);

        // Activity logs: index on date for recent-first queries
        builder.Entity<ActivityLogRecord>()
            .HasIndex(a => a.Date);

        // Seasons: index on year for ordering
        builder.Entity<GardenSeasonRecord>()
            .HasIndex(s => s.Year);
    }
}
