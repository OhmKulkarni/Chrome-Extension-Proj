# Production Build Script for Chrome Extension
# This script creates an optimized production build

Write-Host "🧹 Cleaning previous build..." -ForegroundColor Yellow
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "📦 Building extension for production..." -ForegroundColor Green
$env:NODE_ENV = "production"
& npm run build

Write-Host "📊 Analyzing final extension size..." -ForegroundColor Cyan
$distSize = (Get-ChildItem -Path "dist" -Recurse -File | Measure-Object -Property Length -Sum).Sum
$distSizeMB = [math]::Round($distSize/1MB,2)

Write-Host "✅ Production build complete!" -ForegroundColor Green
Write-Host "📏 Final extension size: $distSizeMB MB" -ForegroundColor White

# Show largest files in build
Write-Host "`n📋 Largest files in extension:" -ForegroundColor Yellow
Get-ChildItem -Path "dist" -Recurse -File | Sort-Object Length -Descending | Select-Object -First 10 Name, @{Name="SizeKB";Expression={[math]::Round($_.Length/1KB,2)}} | Format-Table -AutoSize

# Check for source maps in production
$sourceMaps = Get-ChildItem -Path "dist" -Recurse -Filter "*.map"
if ($sourceMaps.Count -gt 0) {
    Write-Host "⚠️  Warning: Source maps found in production build!" -ForegroundColor Red
    Write-Host "   Consider removing them to reduce size further." -ForegroundColor Red
} else {
    Write-Host "✅ No source maps found - good for production!" -ForegroundColor Green
}

