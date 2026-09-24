# Operational tests: run intentionally; they restart only this checkout's Apuntes.
# Preflight is read-only. No test notes or migrations; ordinary startup can synchronize pending user saves.
. (Join-Path $PSScriptRoot '..\deploy\windows\common.ps1')
$taskChecks = [Collections.Generic.List[string]]::new()
$taskStartBat = Join-Path $script:ProjectRoot 'levantar-proyecto.bat'
$taskStopBat = Join-Path $script:ProjectRoot 'cerrar-proyecto.bat'
$taskQaRoot = Join-Path $script:StateRoot 'qa'
$taskFixture = $null
$taskTestLock = $null
$taskOriginalProfile = $env:APUNTES_PROFILE
$taskOriginalPort = $env:PORT
New-Item -ItemType Directory -Path $taskQaRoot -Force | Out-Null

function Invoke-TestBat {
  param([string]$File, [string[]]$Arguments, [int]$Expected = 0)
  # A hidden, independent console avoids retaining background descendants in a
  # PowerShell pipeline. The application already writes its own per-profile logs.
  $command = '""' + $File + '" ' + ($Arguments -join ' ') + '"'
  $runner = Start-Process -FilePath $env:ComSpec -ArgumentList @('/d', '/s', '/c', $command) -WindowStyle Hidden -PassThru
  # Keep the process handle open so Windows PowerShell retains ExitCode after exit.
  $null = $runner.Handle
  if (-not $runner.WaitForExit(90000)) { $runner.Kill(); throw "El .bat no devolvio el control en 90 segundos: $File $Arguments" }
  $runner.Refresh()
  if ($runner.ExitCode -ne $Expected) { throw "Resultado inesperado de $File $Arguments (exit $($runner.ExitCode), esperado $Expected). Revisa .local/server-<perfil>-error.log." }
}
function Test-Require { param([bool]$Condition, [string]$Message) if (-not $Condition) { throw $Message } }
function Test-Passed { param([string]$Name) $taskChecks.Add($Name); Write-Host "[PASS] $Name" }
function Start-Fixture {
  param([string]$Path, [int]$Port)
  $fixture = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList @('"' + $Path + '"', [string]$Port) -WindowStyle Hidden -PassThru
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    if (@(Get-NetTCPConnection -State Listen | Where-Object OwningProcess -eq $fixture.Id).Count) { return $fixture }
    $fixture.Refresh()
    if ($fixture.HasExited) { throw 'La fixture no inicio.' }
    Start-Sleep -Milliseconds 100
  }
  throw 'La fixture no abrio su puerto.'
}

try {
  Invoke-TestBat $taskStartBat @('--help') | Out-Null
  Invoke-TestBat $taskStartBat @('--unknown') 1 | Out-Null
  Invoke-TestBat $taskStopBat @('--local', '--servidor') 1 | Out-Null
  Test-Passed 'Ayuda y argumentos invalidos devuelven codigos correctos'
  Invoke-TestBat $taskStopBat @('--servidor') | Out-Null
  Invoke-TestBat $taskStopBat @('--servidor') | Out-Null
  Test-Passed 'Cerrar un perfil detenido es idempotente'

  $fixtureFile = Join-Path $taskQaRoot 'launcher-foreign.cjs'
  [IO.File]::WriteAllText($fixtureFile, "require('node:net').createServer().listen(Number(process.argv[2]),'127.0.0.1');")
  $taskFixture = Start-Fixture $fixtureFile 5179
  Invoke-TestBat $taskStartBat @('--servidor', '--check') 1 | Out-Null
  Invoke-TestBat $taskStopBat @('--servidor') 1 | Out-Null
  $taskFixture.Refresh()
  Test-Require (-not $taskFixture.HasExited) 'Se detuvo el proceso ajeno.'
  Test-Passed 'Inicio y cierre rechazan un puerto fijo ocupado sin matar al proceso ajeno'
  $taskFixture.Kill(); $taskFixture.WaitForExit(); $taskFixture = $null

  $taskFixture = Start-Fixture $fixtureFile 0
  $identity = Get-ApuntesIdentity $taskFixture.Id
  @{ pid=$identity.pid; startedAt=$identity.startedAt; profile='servidor'; port=5179; script=$script:ServerFile } | ConvertTo-Json | Set-Content -LiteralPath (Get-ApuntesStatePath 'servidor')
  Invoke-TestBat $taskStopBat @('--servidor') | Out-Null
  $taskFixture.Refresh()
  Test-Require (-not $taskFixture.HasExited) 'Un PID obsoleto detuvo otro proceso.'
  Test-Passed 'Un registro de PID obsoleto no permite cerrar otro ejecutable'
  $taskFixture.Kill(); $taskFixture.WaitForExit(); $taskFixture = $null

  $localListener = @(Get-ApuntesListeners 3188)
  if ($localListener.Count) {
    $identity = Get-ApuntesIdentity $localListener[0].OwningProcess
    Test-Require $identity.owned 'El puerto local pertenece a otra aplicacion.'
    @{ pid=$identity.pid; startedAt=$identity.startedAt; profile='servidor'; port=5179; script=$script:ServerFile } | ConvertTo-Json | Set-Content -LiteralPath (Get-ApuntesStatePath 'servidor')
    Invoke-TestBat $taskStopBat @('--servidor') | Out-Null
    Test-Require (@(Get-ApuntesListeners 3188).Count -eq 1) 'El perfil servidor detuvo el local.'
    Test-Passed 'Los metadatos cruzados no permiten detener el otro perfil'
  }

  $taskTestLock = Enter-ApuntesLock
  Invoke-TestBat $taskStartBat @('--servidor', '--check') 1 | Out-Null
  Invoke-TestBat $taskStopBat @('--servidor') 1 | Out-Null
  $taskTestLock.Dispose(); $taskTestLock = $null
  Test-Passed 'El bloqueo evita operaciones de inicio y cierre simultaneas'

  $spaceRoot = Join-Path $taskQaRoot ('launcher path with spaces ' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path (Join-Path $spaceRoot 'deploy\windows'), (Join-Path $spaceRoot 'server') -Force | Out-Null
  Copy-Item -LiteralPath $taskStopBat -Destination $spaceRoot
  Copy-Item -LiteralPath (Join-Path $script:ProjectRoot 'deploy\windows\common.ps1'), (Join-Path $script:ProjectRoot 'deploy\windows\project.ps1') -Destination (Join-Path $spaceRoot 'deploy\windows')
  $spaceServer = Join-Path $spaceRoot 'server\index.js'
  [IO.File]::WriteAllText($spaceServer, "import net from 'node:net'; net.createServer().listen(Number(process.argv[2]),'127.0.0.1');")
  $taskFixture = Start-Fixture $spaceServer 5179
  Invoke-TestBat (Join-Path $spaceRoot 'cerrar-proyecto.bat') @('--servidor') | Out-Null
  $taskFixture.Refresh()
  Test-Require $taskFixture.HasExited 'El cierre no reconocio su ruta con espacios.'
  $taskFixture = $null
  Test-Passed 'El .bat identifica y cierra su proceso desde una ruta con espacios'

  Invoke-TestBat $taskStartBat @('--servidor', '--check') | Out-Null
  Test-Require (@(Get-ApuntesListeners 5179).Count -eq 0) '--check inicio un servicio.'
  Test-Passed 'Preflight valida almacenamiento y clave sin iniciar procesos'
  $env:APUNTES_PROFILE = 'servidor'
  $env:PORT = '65432'
  Invoke-TestBat $taskStartBat @('--no-browser') | Out-Null
  $serverState = Read-ApuntesState 'servidor'
  Test-Require ($serverState.port -eq 5179) 'El perfil cambio a un puerto no fijo.'
  Test-Require ((Get-ApuntesHealth 5179).ok) 'Health servidor no disponible.'
  Test-Passed 'Perfil servidor arranca en 5179 aunque PORT externo indique otro valor'
  Invoke-TestBat $taskStartBat @('--servidor', '--no-browser') | Out-Null
  Test-Require ((Read-ApuntesState 'servidor').pid -eq $serverState.pid) 'Abrir dos veces duplico el servidor.'
  Test-Passed 'Un segundo inicio reutiliza el mismo PID verificado'
  Invoke-TestBat $taskStartBat @('--install-dependencies') 1 | Out-Null
  Test-Passed 'Se bloquea reinstalar dependencias con Apuntes abierto'

  Invoke-TestBat $taskStopBat @('--local') | Out-Null
  Test-Require ((Get-ApuntesHealth 5179).ok) 'Cerrar local detuvo servidor.'
  Invoke-TestBat $taskStartBat @('--local', '--no-browser') | Out-Null
  Test-Require ((Get-ApuntesHealth 3188).ok) 'Health local no disponible.'
  Test-Passed 'Perfil local inicia en 3188 y su cierre no afecta al servidor'
  Invoke-TestBat $taskStopBat @('--todos') | Out-Null
  Test-Require ((@(Get-ApuntesListeners 3188).Count + @(Get-ApuntesListeners 5179).Count) -eq 0) '--todos no libero ambos puertos.'
  Test-Passed 'Cierre de ambos perfiles libera solo los dos puertos de Apuntes'
} catch {
  Write-Host "[FAIL] $($_.Exception.Message)" -ForegroundColor Red
  throw
} finally {
  if ($taskTestLock) { $taskTestLock.Dispose() }
  if ($taskFixture) { $taskFixture.Refresh(); if (-not $taskFixture.HasExited) { $taskFixture.Kill(); $taskFixture.WaitForExit() } }
  $env:APUNTES_PROFILE = $taskOriginalProfile
  $env:PORT = $taskOriginalPort
  # Leave the user's local application available even after a failed check.
  Invoke-TestBat $taskStopBat @('--local') | Out-Null
  Invoke-TestBat $taskStartBat @('--local', '--no-browser') | Out-Null
  @{ checkedAt=(Get-Date).ToString('o'); checks=@($taskChecks.ToArray()); count=$taskChecks.Count } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $taskQaRoot 'launchers.json') -Encoding UTF8
}
Write-Host "[OK] $($taskChecks.Count) pruebas de lanzadores completadas."
