using GardenApp.Api.Data;
using GardenApp.Api.Helpers;
using GardenApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GardenApp.Api.Endpoints;

public static class SettingsEndpoints
{
    public static void MapSettingsEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/settings").WithTags("Settings");

        group.MapGet("/", async (HttpRequest req, AppDbContext db) =>
        {
            var hid    = HouseholdHelper.GetHouseholdId(req);
            var record = await db.Settings.FindAsync(hid);
            return record is null ? Results.NotFound() : Results.Ok(ToDto(record));
        });

        group.MapPut("/", async (HttpRequest req, SettingsDto dto, AppDbContext db) =>
        {
            var hid    = HouseholdHelper.GetHouseholdId(req);
            var record = await db.Settings.FindAsync(hid);
            if (record is null)
            {
                record = new SettingsRecord { Id = hid };
                db.Settings.Add(record);
            }

            record.Zipcode            = dto.Zipcode;
            record.LastFrostDate      = dto.LastFrostDate;
            record.FirstFallFrostDate = dto.FirstFallFrostDate;
            record.StorageMode        = dto.StorageMode;
            record.ApiBaseUrl         = dto.ApiBaseUrl;
            record.SetupComplete      = dto.SetupComplete;
            record.PlotWidthFt        = dto.PlotWidthFt;
            record.PlotLengthFt       = dto.PlotLengthFt;
            record.PlotTopEdge        = dto.PlotTopEdge;

            await db.SaveChangesAsync();
            return Results.Ok(ToDto(record));
        });
    }

    private static SettingsDto ToDto(SettingsRecord r) => new(
        r.Id,
        r.Zipcode,
        r.LastFrostDate,
        r.FirstFallFrostDate,
        r.StorageMode,
        r.ApiBaseUrl,
        r.SetupComplete,
        r.PlotWidthFt,
        r.PlotLengthFt,
        r.PlotTopEdge
    );
}

public record SettingsDto(
    string HouseholdId,
    string Zipcode,
    string? LastFrostDate,
    string? FirstFallFrostDate,
    string StorageMode,
    string ApiBaseUrl,
    bool SetupComplete,
    int? PlotWidthFt,
    int? PlotLengthFt,
    string? PlotTopEdge
);
