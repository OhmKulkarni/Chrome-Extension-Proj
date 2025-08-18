# File Integrity Monitoring Script
param([string]$ProjectPath = "d:\Projects\Chrome Extension Proj")

Write-Host "File Integrity Check for Chrome Extension" -ForegroundColor Cyan

# 1. Check for corrupted files
Write-Host "`n1. Checking for corrupted files..." -ForegroundColor Yellow
$corruptedFiles = Get-ChildItem -Path "$ProjectPath\src" -Recurse -File | Where-Object {
    ($_.Extension -match "\.(tsx|ts|js|jsx)$" -and $_.Length -eq 0) -or
    ($_.Name -match "\.(new|tmp|backup)$")
}

if ($corruptedFiles.Count -gt 0) {
    Write-Host "FOUND corrupted files:" -ForegroundColor Red
    $corruptedFiles | ForEach-Object { Write-Host "  - $($_.FullName)" -ForegroundColor Red }
} else {
    Write-Host "No corrupted files found" -ForegroundColor Green
}

# 2. Check VS Code processes
Write-Host "`n2. Checking VS Code processes..." -ForegroundColor Yellow
$codeProcesses = Get-Process "Code" -ErrorAction SilentlyContinue
$totalMemory = ($codeProcesses | Measure-Object WorkingSet -Sum).Sum / 1MB

Write-Host "VS Code processes: $($codeProcesses.Count)" -ForegroundColor $(if($codeProcesses.Count -gt 5) {"Red"} else {"Green"})
Write-Host "Total memory usage: $([math]::Round($totalMemory, 2)) MB" -ForegroundColor $(if($totalMemory -gt 1000) {"Red"} else {"Green"})

# 3. Check git status
Write-Host "`n3. Checking git status..." -ForegroundColor Yellow
Push-Location $ProjectPath
try {
    $gitStatus = git status --porcelain 2>$null
    $modifiedFiles = ($gitStatus | Measure-Object).Count
    Write-Host "Modified files: $modifiedFiles" -ForegroundColor $(if($modifiedFiles -gt 10) {"Red"} elseif($modifiedFiles -gt 5) {"Yellow"} else {"Green"})
} catch {
    Write-Host "Could not check git status" -ForegroundColor Red
} finally {
    Pop-Location
}

Write-Host "`nFile integrity check complete!" -ForegroundColor Green
