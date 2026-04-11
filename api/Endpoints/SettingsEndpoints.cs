using GardenApp.Api.Data;
using GardenApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GardenApp.Api.Endpoints;

public static class SettingsEndpoints
{
    public static void MapSettingsEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/settings").WithTags("Settings");

        group.MapGet("/", async (AppDbContext db) =>
        {
            var record = await db.Settings.FindAsync("singleton");
            return record is null ? Results.NotFound() : Results.Ok(ToDto(record));
        });

        group.MapPut("/", async (SettingsDto dto, AppDbContext db) =>
        {
            var record = await db.Settings.FindAsync("singleton");
            if (record is null)
            {
                record = new SettingsRecord { Id = "singleton" };
                db.Settings.Add(record);
            }

            record.Zipcode = dto.Zipcode;
            record.LastFrostDate = dto.LastFrostDate;
            record.FirstFallFrostDate = dto.FirstFallFrostDate;
            record.StorageMode = dto.StorageMode;
            record.ApiBaseUrl = dto.ApiBaseUrl;
            record.SetupComplete = dto.SetupComplete;

            await db.SaveChangesAsync();
            return Results.Ok(ToDto(record));
        });
    }

    private static SettingsDto ToDto(SettingsRecord r) => new(
        r.Zipcode,
        r.LastFrostDate,
        r.FirstFallFrostDate,
        r.StorageMode,
        r.ApiBaseUrl,
        r.SetupComplete
    );
}

public record SettingsDto(
    string Zipcode,
    string? LastFrostDate,
    string? FirstFallFrostDate,
    string StorageMode,
    string ApiBaseUrl,
    bool SetupComplete
);
