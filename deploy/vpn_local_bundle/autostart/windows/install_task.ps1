param(
  [Parameter(Mandatory = $true)]
  [string]$AppDir,
  [string]$TaskName = "NolBotVpnSwitch"
)

$startScript = Join-Path $AppDir "start_windows.bat"
if (-not (Test-Path $startScript)) {
  throw "start_windows.bat not found in $AppDir"
}

$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$startScript`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "NOL Bot local VPN switch backend" -Force | Out-Null
Write-Host "Installed task: $TaskName"
