using GardenApp.Api.Data;
using GardenApp.Api.Helpers;
using GardenApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GardenApp.Api.Endpoints;

/// <summary>
/// Garden and seed inventory endpoints.
/// Every endpoint is scoped to the household identified by the X-Household-Id header.
/// The garden document is stored as a raw JSON string (schema-free) and
/// echoed back as-is — the client owns the shape.
/// </summary>
public static class GardenEndpoints
{
    public static void MapGardenEndpoints(this WebApplication app, bool requireAuth = false)
    {
        // ── Garden ─────────────────────────────────────────────
        var garden = app.MapGroup("/api/garden").WithTags("Garden");
        if (requireAuth) garden.RequireAuthorization("PaidOrAllowed");

        garden.MapGet("/", async (HttpRequest req, AppDbContext db) =>
        {
            var hid    = HouseholdHelper.GetHouseholdId(req);
            var record = await db.Gardens.FindAsync(hid);
            if (record is null) return Results.NotFound();
            return Results.Content(record.DataJson, "application/json");
        });

        garden.MapPut("/", async (HttpRequest req, AppDbContext db) =>
        {
            var hid = HouseholdHelper.GetHouseholdId(req);

            using var reader = new StreamReader(req.Body);
            var json = await reader.ReadToEndAsync();

            var record = await db.Gardens.FindAsync(hid);
            if (record is null)
            {
                record = new GardenRecord { Id = hid, DataJson = json };
                db.Gardens.Add(record);
            }
            else
            {
                record.DataJson = json;
            }

            await db.SaveChangesAsync();
            return Results.Ok();
        });

        // ── Seeds ─────────────────────────────────────────────
        var seeds = app.MapGroup("/api/seeds").WithTags("Seeds");
        if (requireAuth) seeds.RequireAuthorization("PaidOrAllowed");

        seeds.MapGet("/", async (HttpRequest req, AppDbContext db) =>
        {
            var hid = HouseholdHelper.GetHouseholdId(req);
            return Results.Ok(await db.UserSeeds
                .Where(s => s.HouseholdId == hid)
                .ToListAsync());
        });

        seeds.MapPut("/{id}", async (string id, HttpRequest req, UserSeedRecord dto, AppDbContext db) =>
        {
            var hid    = HouseholdHelper.GetHouseholdId(req);
            var record = await db.UserSeeds.FindAsync(id);
            if (record is null)
            {
                dto.Id          = id;
                dto.HouseholdId = hid;
                db.UserSeeds.Add(dto);
            }
            else
            {
                // Only allow mutation within the same household
                if (record.HouseholdId != hid) return Results.Forbid();

                record.SeedId       = dto.SeedId;
                record.Owned        = dto.Owned;
                record.PurchaseYear = dto.PurchaseYear;
                record.Notes        = dto.Notes;
            }
            await db.SaveChangesAsync();
            return Results.Ok();
        });

        seeds.MapDelete("/{id}", async (string id, HttpRequest req, AppDbContext db) =>
        {
            var hid    = HouseholdHelper.GetHouseholdId(req);
            var record = await db.UserSeeds.FindAsync(id);
            if (record is null)           return Results.NotFound();
            if (record.HouseholdId != hid) return Results.Forbid();
            db.UserSeeds.Remove(record);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // ── Seasons ────────────────────────────────────────────
        var seasons = app.MapGroup("/api/seasons").WithTags("Seasons");
        if (requireAuth) seasons.RequireAuthorization("PaidOrAllowed");

        seasons.MapGet("/", async (HttpRequest req, AppDbContext db) =>
        {
            var hid = HouseholdHelper.GetHouseholdId(req);
            return Results.Ok(await db.Seasons
                .Where(s => s.HouseholdId == hid)
                .OrderByDescending(s => s.Year)
                .ToListAsync());
        });

        seasons.MapPut("/{id}", async (string id, HttpRequest req, GardenSeasonRecord dto, AppDbContext db) =>
        {
            var hid    = HouseholdHelper.GetHouseholdId(req);
            var record = await db.Seasons.FindAsync(id);
            if (record is null)
            {
                dto.Id          = id;
                dto.HouseholdId = hid;
                db.Seasons.Add(dto);
            }
            else
            {
                if (record.HouseholdId != hid) return Results.Forbid();

                record.Year                 = dto.Year;
                record.GardenSnapshotJson   = dto.GardenSnapshotJson;
                record.ActivitySnapshotJson = dto.ActivitySnapshotJson ?? "[]";
                record.Notes                = dto.Notes ?? string.Empty;
            }
            await db.SaveChangesAsync();
            return Results.Ok();
        });
    }
}
