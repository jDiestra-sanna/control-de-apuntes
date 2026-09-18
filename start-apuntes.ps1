param([switch]$NoBrowser, [ValidateSet('local', 'servidor')][string]$Profile, [switch]$Check)
# Compatibility with the original shortcut. The two .bat files share one launcher.
$taskOptions = @()
if ($Profile) { $taskOptions += "--$Profile" }
if ($NoBrowser) { $taskOptions += '--no-browser' }
if ($Check) { $taskOptions += '--check' }
& (Join-Path $PSScriptRoot 'deploy\windows\project.ps1') -Action Start -Options $taskOptions
