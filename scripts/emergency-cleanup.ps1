# Emergency VS Code Process Management
Write-Host "🚨 EMERGENCY: Reducing VS Code processes to prevent further corruption" -ForegroundColor Red

# Get all VS Code processes
$codeProcesses = Get-Process "Code" -ErrorAction SilentlyContinue | Sort-Object WorkingSet -Descending

Write-Host "Found $($codeProcesses.Count) VS Code processes consuming $([math]::Round(($codeProcesses | Measure-Object WorkingSet -Sum).Sum / 1MB, 2)) MB"

if ($codeProcesses.Count -gt 3) {
    Write-Host "⚠️  Keeping largest 2 processes, terminating others..." -ForegroundColor Yellow
    
    # Keep the 2 largest processes (likely the main windows)
    $processesToKeep = $codeProcesses | Select-Object -First 2
    $processesToKill = $codeProcesses | Select-Object -Skip 2
    
    Write-Host "Keeping processes:"
    $processesToKeep | ForEach-Object { 
        Write-Host "  - PID $($_.Id): $([math]::Round($_.WorkingSet / 1MB, 2)) MB" -ForegroundColor Green 
    }
    
    Write-Host "Terminating processes:"
    $processesToKill | ForEach-Object { 
        Write-Host "  - PID $($_.Id): $([math]::Round($_.WorkingSet / 1MB, 2)) MB" -ForegroundColor Red
        try {
            Stop-Process -Id $_.Id -Force
            Write-Host "    ✅ Terminated" -ForegroundColor Green
        } catch {
            Write-Host "    ❌ Failed to terminate" -ForegroundColor Red
        }
    }
    
    Start-Sleep 3
    Write-Host "`n🎯 Process cleanup complete!" -ForegroundColor Green
} else {
    Write-Host "✅ Process count is acceptable" -ForegroundColor Green
}
