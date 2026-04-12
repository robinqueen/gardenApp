using GardenApp.Api.Data;
using GardenApp.Api.Endpoints;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ─── Services ─────────────────────────────────────────────────

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(
        builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Data Source=gardenapp.db"));

// Allow the React dev server and any same-origin PWA requests.
// X-Household-Id is a custom header so it must be explicitly allowed.
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy
            .WithOrigins("http://localhost:3000", "http://localhost:4173", "http://localhost:5173")
            .AllowAnyHeader()   // includes X-Household-Id
            .AllowAnyMethod()));

builder.Services.AddOpenApi();

var app = builder.Build();

// ─── Middleware ────────────────────────────────────────────────

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseCors();

// Serve built React PWA in production (files in wwwroot/dist)
app.UseDefaultFiles();
app.UseStaticFiles();

// ─── Health Check ──────────────────────────────────────────────
// The React StorageAdapter pings this to decide whether to use remote mode.
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }))
   .WithTags("System");

// ─── API Endpoints ─────────────────────────────────────────────

app.MapSettingsEndpoints();
app.MapGardenEndpoints();
app.MapActivityEndpoints();

// ─── Database Initialisation ───────────────────────────────────
// EnsureCreated + safe ALTER TABLE for additive column migrations.
// No EF migration files required.

using var scope = app.Services.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
await DatabaseInitializer.InitializeAsync(db);

app.Run();
