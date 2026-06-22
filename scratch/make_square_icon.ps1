Add-Type -AssemblyName System.Drawing
$srcPath = "D:\New folder\master-typing-pro\public\icon.png"
if (Test-Path $srcPath) {
    Write-Output "Loading icon.png..."
    $src = [System.Drawing.Image]::FromFile($srcPath)
    Write-Output "Original width: $($src.Width), height: $($src.Height)"
    
    # Create a 1024x1024 bitmap
    $bmp = New-Object System.Drawing.Bitmap 1024, 1024
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Enable high quality rendering
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    $g.Clear([System.Drawing.Color]::Transparent)
    
    # We want to fit the 1024x682 centered.
    # The height is 682, so the top offset is (1024 - 682)/2 = 171
    $yOffset = [math]::Round((1024 - $src.Height) / 2)
    $xOffset = [math]::Round((1024 - $src.Width) / 2)
    
    Write-Output "Drawing image at X: $xOffset, Y: $yOffset"
    $g.DrawImage($src, $xOffset, $yOffset, $src.Width, $src.Height)
    
    # Clean up source
    $src.Dispose()
    $g.Dispose()
    
    # Backup original
    Copy-Item $srcPath "D:\New folder\master-typing-pro\public\icon_backup.png" -Force
    
    # Save as new icon.png
    $bmp.Save($srcPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Successfully saved square icon.png"
} else {
    Write-Error "Could not find public/icon.png!"
}
