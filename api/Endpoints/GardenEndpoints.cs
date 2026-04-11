using GardenApp.Api.Data;
using GardenApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GardenApp.Api.Endpoints;

/// <summary>
/// Garden and seed inventory endpoints.
/// The garden document is stored as a raw JSON string (schema-free) and
/// echoed back as-is — the client owns the shape.
/// </summary>
public static class GardenEndpoints
{
    public static void MapGardenEndpoints(this WebApplication app)
    {
        // ── Garden ─────────────────────────────────────────────
        var garden = app.MapGroup("/api/garden").WithTags("Garden");

        garden.MapGet("/", async (AppDbContext db) =>
        {
            var record = await db.Gardens.FindAsync("current");
            if (record is null) return Results.NotFound();
            return Results.Content(record.DataJson, "application/json");
        });

        garden.MapPut("/", async (HttpRequest req, AppDbContext db) =>
        {
            using var reader = new StreamReader(req.Body);
            var json = await reader.ReadToEndAsync();

            var record = await db.Gardens.FindAsync("current");
            if (record is null)
            {
                record = new GardenRecord { Id = "current", DataJson = json };
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

        seeds.MapGet("/", async (AppDbContext db) =>
            Results.Ok(await db.UserSeeds.ToListAsync()));

        seeds.MapPut("/{id}", async (string id, UserSeedRecord dto, AppDbContext db) =>
        {
            var record = await db.UserSeeds.FindAsync(id);
            if (record is null)
            {
                dto.Id = id;
                db.UserSeeds.Add(dto);
            }
            else
            {
                record.SeedId = dto.SeedId;
                record.Owned = dto.Owned;
                record.PurchaseYear = dto.PurchaseYear;
                record.Notes = dto.Notes;
            }
            await db.SaveChangesAsync();
            return Results.Ok();
        });

        seeds.MapDelete("/{id}", async (string id, AppDbContext db) =>
        {
            var record = await db.UserSeeds.FindAsync(id);
            if (record is null) return Results.NotFound();
            db.UserSeeds.Remove(record);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // ── Seasons ────────────────────────────────────────────
        var seasons = app.MapGroup("/api/seasons").WithTags("Seasons");

        seasons.MapGet("/", async (AppDbContext db) =>
            Results.Ok(await db.Seasons.OrderByDescending(s => s.Year).ToListAsync()));

        seasons.MapPut("/{id}", async (string id, GardenSeasonRecord dto, AppDbContext db) =>
        {
            var record = await db.Seasons.FindAsync(id);
            if (record is null)
            {
                dto.Id = id;
                db.Seasons.Add(dto);
            }
            else
            {
                record.Year = dto.Year;
                record.GardenSnapshotJson = dto.GardenSnapshotJson;
            }
            await db.SaveChangesAsync();
            return Results.Ok();
        });
    }
}
