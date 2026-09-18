param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$taskPort = 3188
$taskServerFile = Join-Path $PSScriptRoot 'server\index.js'
$taskUrl = "http://127.0.0.1:$taskPort"
$taskListener = Get-NetTCPConnection -State Listen -LocalPort $taskPort -ErrorAction SilentlyContinue
if ($taskListener) {
  $taskRunningProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($taskListener[0].OwningProcess)"
  if ($taskRunningProcess.CommandLine -notlike "*$taskServerFile*") { throw "El puerto $taskPort pertenece a otro proceso. No se ha detenido ni cambiado." }
  $taskHealth = Invoke-RestMethod "$taskUrl/api/health" -Headers @{ 'X-Apuntes-Client' = 'local' } -TimeoutSec 5
  if (-not $taskHealth.ok) { throw 'El proceso existente no responde correctamente.' }
  $taskConfiguredTarget = node --input-type=module -e "import {server,database,authentication} from './server/db.js'; console.log(JSON.stringify({server,database,authentication}));"
  if ($LASTEXITCODE -ne 0) { throw 'La configuración SQL no es válida.' }
  $taskConfiguredTarget = $taskConfiguredTarget | ConvertFrom-Json
  if ($taskHealth.server -ne $taskConfiguredTarget.server -or $taskHealth.database -ne $taskConfiguredTarget.database -or $taskHealth.authentication -ne $taskConfiguredTarget.authentication) { throw 'El proceso abierto usa otra configuración SQL. Reinicia únicamente el servidor de este proyecto para aplicar .env.' }
  Write-Host "Apuntes ya está disponible en $taskUrl"
} else {
  if (-not (Test-Path node_modules)) { node scripts/install.js; if ($LASTEXITCODE -ne 0) { throw 'Falló la instalación de dependencias.' } }
  npm run db:setup
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar SQL Server.' }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar la aplicación.' }
  # Otra apertura puede haber terminado de iniciar mientras se preparaba la base.
  if (Get-NetTCPConnection -State Listen -LocalPort $taskPort -ErrorAction SilentlyContinue) {
    & $PSCommandPath -NoBrowser:$NoBrowser
    return
  }
  $taskNodePath = (Get-Command node).Source
  $taskProcess = Start-Process -FilePath $taskNodePath -ArgumentList @('"' + $taskServerFile + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot '.local\server.log') -RedirectStandardError (Join-Path $PSScriptRoot '.local\server-error.log') -PassThru
  @{ pid = $taskProcess.Id; port = $taskPort; script = $taskServerFile; startedAt = (Get-Date).ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $PSScriptRoot '.local\server.json')
  $taskReady = $false
  for ($taskAttempt = 0; $taskAttempt -lt 20; $taskAttempt++) {
    Start-Sleep -Milliseconds 500
    $taskProcess.Refresh()
    if ($taskProcess.HasExited) { throw 'Node terminó antes de iniciar. Revisa .local/server-error.log.' }
    try { $taskHealth = Invoke-RestMethod "$taskUrl/api/health" -Headers @{ 'X-Apuntes-Client' = 'local' } -TimeoutSec 2; $taskBound = Get-NetTCPConnection -State Listen -LocalPort $taskPort -ErrorAction SilentlyContinue; if ($taskHealth.ok -and $taskBound[0].OwningProcess -eq $taskProcess.Id) { $taskReady = $true; break } } catch {}
  }
  if (-not $taskReady) { throw 'El servidor no inició. Revisa .local/server-error.log.' }
  Write-Host "Apuntes disponible en $taskUrl (PID $($taskProcess.Id))"
}
if (-not $NoBrowser) { Start-Process $taskUrl }
