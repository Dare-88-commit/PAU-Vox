param(
  [string]$ConnectionString = $env:DATABASE_URL,
  [string]$OutputDir = "backups"
)

if (-not $ConnectionString) {
  Write-Error "DATABASE_URL is not set."
  exit 1
}

if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outputFile = Join-Path $OutputDir "pau_vox_$timestamp.dump"

pg_dump "$ConnectionString" -Fc -f "$outputFile"

if ($LASTEXITCODE -ne 0) {
  Write-Error "Backup failed."
  exit $LASTEXITCODE
}

Write-Output "Backup created: $outputFile"
