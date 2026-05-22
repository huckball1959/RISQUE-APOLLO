#Requires -Version 5.1
<#
.SYNOPSIS
  UNIFIED lab: close RISQUE Chrome windows and wipe launcher TEMP profiles.

.DESCRIPTION
  Run before each serious test on any machine:
    powershell -NoProfile -ExecutionPolicy Bypass -File Prep-Risque-Browser.ps1

  Does NOT clear daily Chrome (Settings profile). Only game launcher profiles.
#>
$ErrorActionPreference = 'SilentlyContinue'

function Stop-RisqueLauncherChrome {
    $flag = '--risque-launcher-instance=risque-gemini-local'
    Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
        Where-Object { $_.CommandLine -and $_.CommandLine -like "*$flag*" } |
        ForEach-Object {
            Write-Host "Stopping Chrome PID $($_.ProcessId) (RISQUE launcher)"
            Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        }
    Start-Sleep -Seconds 2
}

$dirs = @(
    Join-Path $env:TEMP 'risque-host-chrome'
    Join-Path $env:TEMP 'risque-browser-profiles'
)

Write-Host 'RISQUE browser prep...' -ForegroundColor Cyan
Stop-RisqueLauncherChrome

foreach ($d in $dirs) {
    if (Test-Path -LiteralPath $d) {
        $mb = [math]::Round(
            (Get-ChildItem -LiteralPath $d -Recurse -Force |
                Measure-Object -Property Length -Sum).Sum / 1MB, 2)
        Write-Host "Removing $d (${mb} MB)" -ForegroundColor Yellow
        Remove-Item -LiteralPath $d -Recurse -Force
    }
    $gone = -not (Test-Path -LiteralPath $d)
    Write-Host ("  {0} -> {1}" -f $d, $(if ($gone) { 'cleared' } else { 'STILL PRESENT (close Chrome and retry)' }))
}

Write-Host ''
Write-Host 'Next launch (OLD BEDROOM lab — recommended):' -ForegroundColor Green
Write-Host '  <DRIVE>:\github\RISQUE-UNIFIED\Launch-Lab.bat'
Write-Host '  (prep + NoReplayDebug + lsReplayLite=1). Menu: 1 (local).'
Write-Host '  Autosave tier: battle_stills (5) like KITCHEN.'
Write-Host '  Optional A/B: Launch-Lab.bat -SingleWindow'
Write-Host ''
