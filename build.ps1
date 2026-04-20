param(
    [switch]$Minor,
    [switch]$Major,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$Image   = 'fitsomewhat/mylivinggarden'
$PkgPath = Join-Path $PSScriptRoot 'client\package.json'

# Read current version
$pkg     = Get-Content -Raw $PkgPath | ConvertFrom-Json
$current = $pkg.version
$parts   = $current -split '\.'
$maj     = [int]$parts[0]
$min     = [int]$parts[1]
$pat     = [int]$parts[2]

# Bump
if ($Major)        { $maj++; $min = 0; $pat = 0 }
elseif ($Minor)    { $min++; $pat = 0 }
else               { $pat++ }

$newVersion = "$maj.$min.$pat"

Write-Host ""
Write-Host "  My Living Garden -- Build" -ForegroundColor Green
Write-Host "  $current -> $newVersion" -ForegroundColor Cyan
Write-Host "  Image: ${Image}:${newVersion}" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "  DryRun -- nothing written or built." -ForegroundColor Yellow
    exit 0
}

# Update package.json — write UTF-8 WITHOUT BOM.
# PowerShell's Set-Content -Encoding utf8 adds a BOM which breaks JSON.parse() in Node.
$pkg.version = $newVersion
$json = $pkg | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($PkgPath, $json, [System.Text.UTF8Encoding]::new($false))
Write-Host "  package.json updated to $newVersion" -ForegroundColor Green

# Build
Write-Host "  Building Docker image..." -ForegroundColor Yellow
$buildDir = $PSScriptRoot
docker build `
    --build-arg VITE_APP_VERSION=$newVersion `
    -t "${Image}:${newVersion}" `
    -t "${Image}:latest" `
    $buildDir

if ($LASTEXITCODE -ne 0) {
    Write-Host "  Build failed." -ForegroundColor Red
    exit 1
}
Write-Host "  Build complete" -ForegroundColor Green

# Push
Write-Host "  Pushing ${Image}:${newVersion}..." -ForegroundColor Yellow
docker push "${Image}:${newVersion}"

Write-Host "  Pushing ${Image}:latest..." -ForegroundColor Yellow
docker push "${Image}:latest"

Write-Host ""
Write-Host "  Done! ${Image}:${newVersion} is live." -ForegroundColor Green
Write-Host "  On Unraid: docker compose pull && docker compose up -d --force-recreate api" -ForegroundColor Cyan
Write-Host ""
