# Automatic Backup Script for Timeline Components
# Run this before major changes

param(
    [string]$ProjectPath = "d:\Projects\Chrome Extension Proj"
)

$backupDir = "$ProjectPath\backups\timeline-$(Get-Date -Format 'yyyy-MM-dd-HHmm')"
$sourceDir = "$ProjectPath\src\dashboard\components\timeline"

if (Test-Path $sourceDir) {
    Write-Host "📁 Creating timeline backup..." -ForegroundColor Cyan
    
    # Create backup directory
    New-Item -Path $backupDir -ItemType Directory -Force | Out-Null
    
    # Copy timeline components
    Copy-Item -Path "$sourceDir\*" -Destination $backupDir -Recurse -Force
    
    Write-Host "✅ Backup created: $backupDir" -ForegroundColor Green
    
    # Verify backup integrity
    $sourceFiles = Get-ChildItem -Path $sourceDir -Recurse -File | Measure-Object
    $backupFiles = Get-ChildItem -Path $backupDir -Recurse -File | Measure-Object
    
    if ($sourceFiles.Count -eq $backupFiles.Count) {
        Write-Host "✅ Backup verification passed ($($sourceFiles.Count) files)" -ForegroundColor Green
    } else {
        Write-Host "❌ Backup verification failed!" -ForegroundColor Red
    }
    
    # Cleanup old backups (keep last 5)
    $oldBackups = Get-ChildItem -Path "$ProjectPath\backups" -Directory | 
                  Sort-Object CreationTime -Descending | 
                  Select-Object -Skip 5
                  
    if ($oldBackups) {
        $oldBackups | Remove-Item -Recurse -Force
        Write-Host "🧹 Cleaned up $($oldBackups.Count) old backups" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "❌ Timeline source directory not found: $sourceDir" -ForegroundColor Red
}
