$ErrorActionPreference = "Stop"

Write-Host "Running project QA checks..."

powershell -ExecutionPolicy Bypass -File .\qa-check.ps1

$required = @(
    "manifest.json",
    "service-worker.js",
    "offline.html",
    "data\content.de.json"
)

foreach ($item in $required) {
    if (-not (Test-Path $item)) {
        throw "Missing required file: $item"
    }
}

$htmlFiles = Get-ChildItem -Recurse -Filter *.html
foreach ($file in $htmlFiles) {
    $raw = Get-Content -Raw -Encoding UTF8 $file.FullName
    if ($raw -notmatch '<meta\s+name="viewport"') {
        throw "Viewport meta missing in $($file.FullName)"
    }
}

Write-Host "Quality checks passed."
