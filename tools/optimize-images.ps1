param(
    [string]$ImagesPath = ".\images"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$targets = @("kirche", "rathaus", "alte_teppichfabrik", "wasserschloss", "seliger")
$widths = @(480, 768)

foreach ($name in $targets) {
    $input = Join-Path $ImagesPath "$name.jpg"
    if (-not (Test-Path $input)) {
        Write-Warning "Skipping missing source image: $input"
        continue
    }

    try {
        $img = [System.Drawing.Image]::FromFile((Resolve-Path $input))
    }
    catch {
        Write-Warning "Skipping unreadable image: $input"
        continue
    }

    foreach ($w in $widths) {
        $ratio = $w / $img.Width
        $h = [Math]::Max([int]([Math]::Round($img.Height * $ratio)), 1)
        $bmp = New-Object System.Drawing.Bitmap $w, $h
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($img, 0, 0, $w, $h)

        $output = Join-Path $ImagesPath "$name-$w.jpg"
        $bmp.Save($output, [System.Drawing.Imaging.ImageFormat]::Jpeg)

        $g.Dispose()
        $bmp.Dispose()

        if (Get-Command cwebp -ErrorAction SilentlyContinue) {
            $webpOut = Join-Path $ImagesPath "$name-$w.webp"
            & cwebp -quiet -q 82 $output -o $webpOut | Out-Null
        }
    }

    $img.Dispose()
}

Write-Host "Image optimization finished."
if (-not (Get-Command cwebp -ErrorAction SilentlyContinue)) {
    Write-Host "Hint: cwebp not found. Install WebP tools to additionally generate .webp files."
}
