param(
    [string]$Root = "."
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path $Root).Path
$htmlFiles = Get-ChildItem -Path $projectRoot -Recurse -Filter *.html | Sort-Object FullName

if (-not $htmlFiles) {
    Write-Host "No HTML files found."
    exit 1
}

$issues = New-Object System.Collections.Generic.List[string]

function Add-Issue {
    param([string]$Message)
    $issues.Add($Message)
}

foreach ($file in $htmlFiles) {
    $content = Get-Content -Raw $file.FullName
    $relativeFile = $file.FullName.Substring($projectRoot.Length).TrimStart('\')

    if ($content -notmatch "<title>.+</title>") {
        Add-Issue "${relativeFile}: missing <title>"
    }

    if ($content -notmatch '<meta\s+name="description"\s+content="[^"]+') {
        Add-Issue "${relativeFile}: missing meta description"
    }

    if ($relativeFile -notmatch '^404\.html$$|^wasserschloß\.html$' -and $content -notmatch '<link\s+rel="canonical"\s+href="[^"]+') {
        Add-Issue "${relativeFile}: missing canonical link"
    }

    $linkMatches = [regex]::Matches($content, '<a\s+[^>]*href="([^"]+)"', 'IgnoreCase')
    foreach ($match in $linkMatches) {
        $href = $match.Groups[1].Value.Trim()

        if ($href -eq "" -or $href.StartsWith("#") -or $href -match '^(https?:|mailto:|tel:|javascript:)') {
            continue
        }

        $cleanHref = $href.Split('#')[0].Split('?')[0]
        if ($cleanHref -eq "") {
            continue
        }

        $resolvedPath = Join-Path $file.DirectoryName $cleanHref
        try {
            $target = Resolve-Path -Path $resolvedPath -ErrorAction Stop
            if (-not (Test-Path $target)) {
                Add-Issue "${relativeFile}: broken link -> $href"
            }
        }
        catch {
            Add-Issue "${relativeFile}: broken link -> $href"
        }
    }
}

$requiredFiles = @(
    "index.html",
    "Orte/kirche.html",
    "Orte/rathaus.html",
    "Orte/seliger.html",
    "Orte/wasserschloss.html",
    "Orte/alte_teppichfabrik.html",
    "Orte/feuerwehr.html",
    "Orte/heimatmuseum.html",
    "Orte/kletterwald.html",
    "Orte/naturbad.html",
    "impressum.html",
    "datenschutz.html",
    "barrierefreiheit.html",
    "404.html"
)

foreach ($required in $requiredFiles) {
    if (-not (Test-Path (Join-Path $projectRoot $required))) {
        Add-Issue "Missing required file: $required"
    }
}

if ($issues.Count -eq 0) {
    Write-Host "QA check passed: no issues found."
    exit 0
}

Write-Host "QA check found $($issues.Count) issue(s):"
$issues | ForEach-Object { Write-Host "- $_" }
exit 1
