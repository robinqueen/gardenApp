# ── Stage 1: Build React PWA ───────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app
COPY client/package*.json ./
RUN npm ci --prefer-offline

COPY client/ ./

# Tell the React build that auth is enabled (JWT + Google OAuth).
ARG VITE_AUTH_ENABLED=true
ENV VITE_AUTH_ENABLED=$VITE_AUTH_ENABLED

# Version is passed from build.ps1 via --build-arg so it matches package.json exactly.
# Falls back to "dev" when building manually without the script.
ARG VITE_APP_VERSION=dev
ENV VITE_APP_VERSION=$VITE_APP_VERSION

RUN npm run build
# Output: /app/dist


# ── Stage 2: Build .NET API ────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS api-builder

WORKDIR /app
# Copy project file first so layer cache survives source changes
COPY api/*.csproj ./
RUN dotnet restore

COPY api/ ./
RUN dotnet publish -c Release -o /publish --no-restore


# ── Stage 3: Runtime ───────────────────────────────────────────
# Use the slim ASP.NET runtime (no SDK, no build tools)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

# Create a non-root user to run the app — never run as root in production
RUN addgroup --system --gid 1001 gardenapp \
 && adduser  --system --uid 1001 --ingroup gardenapp --no-create-home gardenapp

WORKDIR /app

# Copy the published API
COPY --from=api-builder --chown=gardenapp:gardenapp /publish ./

# Copy the React build into wwwroot so ASP.NET serves it via UseStaticFiles
COPY --from=frontend-builder --chown=gardenapp:gardenapp /app/dist ./wwwroot

# Create the keys directory with correct ownership.
# The RSA key is mounted here at runtime via a Docker volume (never baked in).
RUN mkdir -p /var/gardenapp/keys \
 && chown -R gardenapp:gardenapp /var/gardenapp

USER gardenapp

# .NET 8 defaults to port 8080 in Docker
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "GardenApp.Api.dll"]
