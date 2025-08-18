# File Integrity Monitoring Script
# Run this before major development sessions

param(
    [string]$ProjectPath = "d:\Projects\Chrome Extension Proj"
)

Write-Host "🔍 Chrome Extension File Integrity Check" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# 1. Check for corrupted/empty files
Write-Host "`n1. Checking for corrupted files..." -ForegroundColor Yellow
$corruptedFiles = Get-ChildItem -Path "$ProjectPath\src" -Recurse -File | Where-Object {
    ($_.Extension -match "\.(tsx|ts|js|jsx)$" -and $_.Length -eq 0) -or
    ($_.Name -match "\.(new|tmp|backup)$")
}

if ($corruptedFiles.Count -gt 0) {
    Write-Host "❌ Found corrupted files:" -ForegroundColor Red
    $corruptedFiles | ForEach-Object { Write-Host "  - $($_.FullName)" -ForegroundColor Red }
} else {
    Write-Host "✅ No corrupted files found" -ForegroundColor Green
}

# 2. Check VS Code processes
Write-Host "`n2. Checking VS Code processes..." -ForegroundColor Yellow
$codeProcesses = Get-Process "Code" -ErrorAction SilentlyContinue
$totalMemory = ($codeProcesses | Measure-Object WorkingSet -Sum).Sum / 1MB

Write-Host "VS Code processes: $($codeProcesses.Count)" -ForegroundColor $(if($codeProcesses.Count -gt 5) {"Red"} else {"Green"})
Write-Host "Total memory usage: $([math]::Round($totalMemory, 2)) MB" -ForegroundColor $(if($totalMemory -gt 1000) {"Red"} else {"Green"})

if ($codeProcesses.Count -gt 8) {
    Write-Host "⚠️  Too many VS Code processes. Consider closing some instances." -ForegroundColor Yellow
}

# 3. Check git status
Write-Host "`n3. Checking git status..." -ForegroundColor Yellow
Push-Location $ProjectPath
try {
    $gitStatus = git status --porcelain 2>$null
    $modifiedFiles = ($gitStatus | Measure-Object).Count
    
    Write-Host "Modified files: $modifiedFiles" -ForegroundColor $(if($modifiedFiles -gt 10) {"Red"} elseif($modifiedFiles -gt 5) {"Yellow"} else {"Green"})
    
    if ($modifiedFiles -gt 10) {
        Write-Host "⚠️  Many modified files. Consider committing recent changes." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Could not check git status" -ForegroundColor Red
} finally {
    Pop-Location
}

# 4. Check file locks
Write-Host "`n4. Checking for file locks..." -ForegroundColor Yellow
$timelineFiles = Get-ChildItem -Path "$ProjectPath\src\dashboard\components\timeline" -Recurse -File -Filter "*.tsx"
$lockedFiles = @()

foreach ($file in $timelineFiles) {
    try {
        $stream = [System.IO.File]::OpenWrite($file.FullName)
        $stream.Close()
    } catch {
        $lockedFiles += $file.FullName
    }
}

if ($lockedFiles.Count -gt 0) {
    Write-Host "❌ Locked files detected:" -ForegroundColor Red
    $lockedFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
} else {
    Write-Host "✅ No file locks detected" -ForegroundColor Green
}

# 5. Cleanup recommendations
Write-Host "`n5. Cleanup recommendations:" -ForegroundColor Cyan
Write-Host "  - Close excess VS Code windows (keep 1-2 max)" -ForegroundColor White
Write-Host "  - Commit or stash changes regularly" -ForegroundColor White  
Write-Host "  - Restart VS Code if memory usage > 1GB" -ForegroundColor White
Write-Host "  - Run 'npm run build' to verify file integrity" -ForegroundColor White

Write-Host "`nFile integrity check complete!" -ForegroundColor Green
