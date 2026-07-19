# gstack setup for OpenHRApp contributors
# Run this once after cloning the repo to install gstack skills.
# Prerequisites: git, bun (https://bun.sh)
#
# Usage: powershell -ExecutionPolicy Bypass -File scripts/setup-gstack.ps1

$ErrorActionPreference = "Stop"

$gstackDir = "$env:USERPROFILE\.claude\skills\gstack"

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host "bun is required but not installed." -ForegroundColor Red
    Write-Host "Install from: https://bun.sh" -ForegroundColor Yellow
    Write-Host 'Then re-run: powershell -ExecutionPolicy Bypass -File scripts\setup-gstack.ps1'
    exit 1
}

if (Test-Path $gstackDir) {
    Write-Host "gstack already installed at $gstackDir" -ForegroundColor Green
    Write-Host "Updating..." -ForegroundColor Cyan
    Push-Location $gstackDir
    git pull
    & bash ./setup
    Pop-Location
    Write-Host "gstack updated successfully." -ForegroundColor Green
} else {
    Write-Host "Installing gstack..." -ForegroundColor Cyan
    $parentDir = Split-Path $gstackDir -Parent
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Force -Path $parentDir | Out-Null
    }
    & git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git $gstackDir
    Push-Location $gstackDir
    & bash ./setup
    Pop-Location
    Write-Host "gstack installed successfully." -ForegroundColor Green
}

Write-Host ""
Write-Host "gstack skills are now available. Use /browse for web browsing." -ForegroundColor Cyan
Write-Host "Full skill list: /office-hours, /review, /ship, /qa, /investigate, /browse, etc." -ForegroundColor Cyan
