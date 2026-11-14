<#
.SYNOPSIS
    Deploys the Rental Ledger PWA to GitHub Pages.
.DESCRIPTION
    Initializes a git repository (if needed), prompts for your GitHub repo URL,
    and pushes the PWA files directly to the 'main' branch for instant GitHub Pages hosting.
#>

param(
    [string]$RepoUrl
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Rental Ledger - Deploy PWA to GitHub Pages             " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$GitCmd = Get-Command "git" -ErrorAction SilentlyContinue
if (-not $GitCmd) {
    Write-Host "[INFO] Git CLI is not installed or not in PATH." -ForegroundColor Yellow
    Write-Host "You can easily upload these files directly on GitHub.com:" -ForegroundColor White
    Write-Host "  1. Create a new Public repo on GitHub (e.g. rental-ledger-pwa)" -ForegroundColor Gray
    Write-Host "  2. Drag and drop all files from this folder into GitHub's upload page" -ForegroundColor Gray
    Write-Host "  3. Go to Settings -> Pages -> Deploy from branch 'main' -> Save!" -ForegroundColor Gray
    Write-Host ""
    exit 0
}

if (-not $RepoUrl) {
    $RepoUrl = Read-Host "Enter your GitHub Repository URL (e.g. https://github.com/username/rental-ledger-pwa.git)"
}

if (-not $RepoUrl) {
    Write-Error "Repository URL is required."
    exit 1
}

Write-Host "[1/3] Initializing local repository..." -ForegroundColor Yellow
if (-not (Test-Path ".git")) {
    git init
    git branch -M main
}

git remote remove origin -ErrorAction SilentlyContinue | Out-Null
git remote add origin $RepoUrl

Write-Host "[2/3] Staging and committing PWA files..." -ForegroundColor Yellow
git add -A
git commit -m "Deploy Rental Ledger PWA for iPhone & mobile devices"

Write-Host "[3/3] Pushing to GitHub (main branch)..." -ForegroundColor Yellow
git push -u origin main --force

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] PWA repository successfully pushed to GitHub!  " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Next steps on GitHub.com:"
Write-Host " 1. Go to repository Settings -> Pages"
Write-Host " 2. Source: 'Deploy from a branch' -> Select 'main' -> Save"
Write-Host " 3. In ~60 seconds, open the URL on your iPhone in Safari!"
Write-Host " 4. Tap Share -> 'Add to Home Screen'!"
