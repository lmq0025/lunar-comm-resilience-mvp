$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ZipPath = "E:\LunarCommMVP\lunar_comm_mvp_final_delivery.zip"
$TempRoot = Join-Path $env:TEMP "lunar_comm_mvp_final_delivery"

Set-Location $ProjectRoot

tree /F /A | Out-File -Encoding utf8 project_tree.txt

if (Test-Path $TempRoot) {
    Remove-Item -LiteralPath $TempRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $TempRoot | Out-Null

$ItemsToPackage = @(
    "README.md",
    "MANIFEST.md",
    "PROJECT_BRIEF.md",
    "requirements.txt",
    "environment.yml",
    "configs",
    "data",
    "docs",
    "lunar_comm_sim",
    "tests",
    "scripts",
    "outputs/final_demo",
    "project_tree.txt"
)

foreach ($Item in $ItemsToPackage) {
    $Source = Join-Path $ProjectRoot $Item
    if (Test-Path $Source) {
        $Destination = Join-Path $TempRoot $Item
        $DestinationParent = Split-Path $Destination -Parent
        if (!(Test-Path $DestinationParent)) {
            New-Item -ItemType Directory -Path $DestinationParent -Force | Out-Null
        }
        Copy-Item -LiteralPath $Source -Destination $Destination -Recurse -Force
    }
}

$ExcludedDirectories = @("__pycache__", ".pytest_cache", "test_outputs", "_runs")
foreach ($Name in $ExcludedDirectories) {
    Get-ChildItem -LiteralPath $TempRoot -Directory -Recurse -Force -Filter $Name |
        Remove-Item -Recurse -Force
}
Get-ChildItem -LiteralPath $TempRoot -File -Recurse -Force -Filter "*.pyc" |
    Remove-Item -Force

if (Test-Path $ZipPath) {
    Remove-Item -LiteralPath $ZipPath -Force
}
Compress-Archive -Path (Join-Path $TempRoot "*") -DestinationPath $ZipPath -Force

$RequiredZipEntries = @(
    "MANIFEST.md",
    "data/baselines/rf_lifetime_reference.csv",
    "data/baselines/dust_gain_reference.csv",
    "docs/final_delivery/final_mvp_summary.md",
    "outputs/final_demo/demo_run/indicator_check.csv"
)

Add-Type -AssemblyName System.IO.Compression.FileSystem
$Zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
try {
    $Entries = $Zip.Entries | ForEach-Object { $_.FullName.Replace("\", "/") }
    $Missing = @()
    foreach ($Entry in $RequiredZipEntries) {
        if ($Entries -notcontains $Entry) {
            $Missing += $Entry
        }
    }
    if ($Missing.Count -gt 0) {
        Write-Host "Package created but required entries are missing:"
        $Missing | ForEach-Object { Write-Host "  $_" }
        exit 1
    }
}
finally {
    $Zip.Dispose()
}

Write-Host "Final delivery package created:"
Write-Host $ZipPath
Write-Host "Verified package includes data/baselines and final demo evidence."
