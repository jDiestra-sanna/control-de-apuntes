param(
  [ValidateSet('Start', 'Stop')][string]$Action = 'Start',
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$Options
)
. (Join-Path $PSScriptRoot 'common.ps1')
$taskLock = $null
$taskChildIdentity = $null
$taskPreviousPort = $env:PORT
$taskExit = 0
Push-Location -LiteralPath $script:ProjectRoot
try {
  $taskProfileOption = ''
  $taskNoBrowser = $false
  $taskCheck = $false
  $taskInstall = $false
  $taskRebuild = $false
  $taskAll = $false
  $taskHelp = $false
  foreach ($option in $Options) {
    switch ($option.ToLowerInvariant()) {
      '--local' { if ($taskProfileOption) { throw 'Selecciona un solo perfil.' }; $taskProfileOption = 'local' }
      '--servidor' { if ($taskProfileOption) { throw 'Selecciona un solo perfil.' }; $taskProfileOption = 'servidor' }
      '--todos' { $taskAll = $true }
      '--no-browser' { $taskNoBrowser = $true }
      '--check' { $taskCheck = $true }
      '--install-dependencies' { $taskInstall = $true }
      '--rebuild' { $taskRebuild = $true }
      '--help' { $taskHelp = $true }
      default { throw "Opcion desconocida: $option. Usa --help." }
    }
  }
  if ($taskHelp) {
    Write-Host @'
Apuntes | Windows local y servidor
  levantar-proyecto.bat [--local|--servidor] [--no-browser] [--rebuild]
  levantar-proyecto.bat [--local|--servidor] --check
  levantar-proyecto.bat --install-dependencies
  cerrar-proyecto.bat [--local|--servidor|--todos]

Sin perfil: APUNTES_PROFILE en el entorno o .env; por defecto local.
Puertos fijos: local 3188; servidor 5179. Web y API comparten puerto.
Ambos escuchan en 127.0.0.1. No se abren firewall ni tuneles.
Servidor: ejecutar en el host Windows destino con .env y master.key originales.
Para publicar en red se requiere una capa de acceso autenticado y HTTPS.
--check valida requisitos, puerto, conexion SQL y clave sin iniciar ni compilar.
--install-dependencies instala el lockfile y termina, sin iniciar ni migrar SQL.
El inicio normal reutiliza dependencias y compila solo si hay cambios.
Los registros estan en .local/server-<perfil>.log y server-<perfil>-error.log.
'@
    return
  }
  if ($Action -eq 'Stop' -and ($taskCheck -or $taskInstall -or $taskRebuild -or $taskNoBrowser)) { throw 'Para cerrar utiliza --local, --servidor o --todos.' }
  if ($taskAll -and ($Action -ne 'Stop' -or $taskProfileOption)) { throw '--todos solo se admite al cerrar y sin otro perfil.' }
  if ($taskInstall -and ($taskCheck -or $taskRebuild)) { throw 'La instalacion es una operacion separada de --check y --rebuild.' }
  if ($taskCheck -and $taskRebuild) { throw '--check no compila; no lo combines con --rebuild.' }
  $taskProfile = Get-ApuntesProfile $taskProfileOption
  $taskPort = $script:Profiles[$taskProfile]
  $taskUrl = "http://127.0.0.1:$taskPort"
  $taskLock = Enter-ApuntesLock

  if ($Action -eq 'Stop') {
    $taskSelected = if ($taskAll) { @('local', 'servidor') } else { @($taskProfile) }
    $taskStop = @{}
    # Validate every selected listener before stopping anything.
    foreach ($profile in $taskSelected) {
      foreach ($listener in @(Get-ApuntesListeners $script:Profiles[$profile])) {
        $identity = Get-ApuntesIdentity $listener.OwningProcess
        if (-not $identity -or -not $identity.owned) { throw "Puerto $($script:Profiles[$profile]) ocupado por otro proceso (PID $($listener.OwningProcess)). No se ha detenido." }
        $taskStop[$identity.pid] = $identity
      }
      $state = Read-ApuntesState $profile
      if ($state) {
        $identity = Get-ApuntesIdentity $state.pid
        $matchesProfile = $state.profile -eq $profile -and $state.port -eq $script:Profiles[$profile] -and $state.script -ieq $script:ServerFile
        $otherPort = @()
        if ($identity) { $otherPort = @(Get-NetTCPConnection -State Listen | Where-Object { $_.OwningProcess -eq $identity.pid -and $_.LocalPort -ne $script:Profiles[$profile] }) }
        if ($identity -and $identity.owned -and $identity.startedAt -eq $state.startedAt -and $matchesProfile -and -not $otherPort.Count) { $taskStop[$identity.pid] = $identity }
        elseif ($identity) { Write-Host "Registro antiguo de ${profile}: el PID no coincide; se conserva ese proceso." }
      }
    }
    foreach ($identity in $taskStop.Values) { Stop-ApuntesIdentity $identity }
    foreach ($profile in $taskSelected) {
      if (@(Get-ApuntesListeners $script:Profiles[$profile]).Count) { throw "El puerto $($script:Profiles[$profile]) sigue ocupado. No se cerraran procesos adicionales." }
      $path = Get-ApuntesStatePath $profile
      if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force }
      Write-Host "[OK] Apuntes $profile detenido. Puerto fijo $($script:Profiles[$profile]) libre."
    }
    return
  }

  $taskNode = (Get-Command node.exe -ErrorAction Stop).Source
  $taskVersion = & $taskNode -p 'process.versions.node'
  if ($LASTEXITCODE -ne 0 -or [version]$taskVersion -lt [version]'22.12.0') { throw 'Instala Node.js 22.12 o superior antes de iniciar.' }
  $taskNpm = (Get-Command npm.cmd -ErrorAction Stop).Source
  if ($taskInstall) {
    if (@(Get-NetTCPConnection -State Listen | Where-Object LocalPort -in 3188,5179).Count) { throw 'La instalacion requiere los puertos 3188 y 5179 libres. Cierra Apuntes y comprueba que no haya otros servicios en esos puertos.' }
    $taskRunning = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -match [regex]::Escape($script:ServerFile) })
    if ($taskRunning.Count) { throw 'Cierra Apuntes con cerrar-proyecto.bat --todos antes de instalar dependencias.' }
    & $taskNode (Join-Path $script:ProjectRoot 'scripts\install.js')
    if ($LASTEXITCODE -ne 0) { throw 'La instalacion fallo. Revisa el error; no se iniciaron servicios.' }
    Write-Host '[OK] Dependencias instaladas. No se iniciaron servicios.'
    return
  }
  $taskListeners = @(Assert-ApuntesPort $taskPort)
  if (-not (Test-Path -LiteralPath (Join-Path $script:ProjectRoot 'node_modules\vite\bin\vite.js'))) { throw 'Faltan dependencias. Ejecuta levantar-proyecto.bat --install-dependencies.' }
  if (-not (Test-Path -LiteralPath (Join-Path $script:ProjectRoot '.env'))) { throw 'Falta .env. Copia .env.example y configura la conexion SQL de este equipo.' }
  if (-not (Test-Path -LiteralPath (Join-Path $script:StateRoot 'master.key'))) { throw 'Falta .local/master.key. Lleva la clave original para abrir la base existente; no generes otra.' }
  $env:PORT = [string]$taskPort
  $taskTargetJson = & $taskNode (Join-Path $script:ProjectRoot 'scripts\check-runtime.js')
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo validar SQL y la clave. No se inicio ni modifico la base.' }
  $taskTarget = $taskTargetJson | ConvertFrom-Json
  $taskRuntimeHash = Get-ApuntesRuntimeFingerprint
  $taskBuildHash = Get-ApuntesFingerprint @('src', 'public', 'index.html', 'vite.config.js', 'package.json', 'package-lock.json')
  if ($taskListeners.Count) {
    $taskIdentity = Get-ApuntesIdentity $taskListeners[0].OwningProcess
    Assert-ApuntesHealth (Get-ApuntesHealth $taskPort) $taskTarget
    $taskState = Read-ApuntesState $taskProfile
    if (-not $taskState -or $taskState.pid -ne $taskIdentity.pid -or $taskState.startedAt -ne $taskIdentity.startedAt -or $taskState.runtimeFingerprint -ne $taskRuntimeHash -or $taskState.buildFingerprint -ne $taskBuildHash -or $taskRebuild) {
      throw "Apuntes ya esta activo pero requiere reinicio para esta version. Ejecuta cerrar-proyecto.bat --$taskProfile y luego levantar-proyecto.bat --$taskProfile."
    }
    Write-Host "[OK] Apuntes $taskProfile ya esta disponible en $taskUrl (PID $($taskIdentity.pid))."
    if (-not $taskNoBrowser -and -not $taskCheck -and $taskProfile -eq 'local') { Start-Process $taskUrl }
    return
  }
  if ($taskCheck) {
    Write-Host "[OK] Perfil $taskProfile. Puerto fijo $taskPort libre. Node $taskVersion. SQL $($taskTarget.server)/$($taskTarget.database) y clave verificados."
    return
  }
  $taskBuildStatePath = Join-Path $script:StateRoot 'build-state.json'
  $taskBuildState = $null
  if (Test-Path -LiteralPath $taskBuildStatePath) { try { $taskBuildState = Get-Content -LiteralPath $taskBuildStatePath -Raw | ConvertFrom-Json } catch {} }
  $taskDistReady = Test-Path -LiteralPath (Join-Path $script:ProjectRoot 'dist\index.html')
  if ($taskRebuild -or -not $taskDistReady -or -not $taskBuildState -or $taskBuildState.source -ne $taskBuildHash -or $taskBuildState.output -ne (Get-ApuntesFingerprint @('dist'))) {
    Write-Host '[INFO] Compilando la aplicacion con las dependencias existentes...'
    & $taskNpm run build
    if ($LASTEXITCODE -ne 0) { throw 'Fallo la compilacion. No se inicio el proyecto.' }
    @{ source = $taskBuildHash; output = Get-ApuntesFingerprint @('dist') } | ConvertTo-Json | Set-Content -LiteralPath $taskBuildStatePath -Encoding UTF8
  } else { Write-Host '[INFO] Compilacion vigente; se reutiliza dist.' }
  if (@(Assert-ApuntesPort $taskPort).Count) { throw 'Otro proceso ocupo el puerto durante la preparacion. Vuelve a ejecutar el lanzador.' }
  $taskLog = Join-Path $script:StateRoot "server-$taskProfile.log"
  $taskErrorLog = Join-Path $script:StateRoot "server-$taskProfile-error.log"
  $taskChild = Start-Process -FilePath $taskNode -ArgumentList @('"' + $script:ServerFile + '"') -WorkingDirectory $script:ProjectRoot -WindowStyle Hidden -RedirectStandardOutput $taskLog -RedirectStandardError $taskErrorLog -PassThru
  $taskChildIdentity = Get-ApuntesIdentity $taskChild.Id
  if (-not $taskChildIdentity -or -not $taskChildIdentity.owned) { throw 'No se pudo verificar el proceso iniciado.' }
  $taskStatePath = Get-ApuntesStatePath $taskProfile
  @{ pid = $taskChildIdentity.pid; startedAt = $taskChildIdentity.startedAt; profile = $taskProfile; port = $taskPort; script = $script:ServerFile; runtimeFingerprint = $taskRuntimeHash; buildFingerprint = $taskBuildHash } | ConvertTo-Json | Set-Content -LiteralPath $taskStatePath -Encoding UTF8
  $taskReady = $false
  $taskDeadline = (Get-Date).AddSeconds(40)
  while ((Get-Date) -lt $taskDeadline) {
    $taskChild.Refresh()
    if ($taskChild.HasExited) { throw "Node termino antes de iniciar. Revisa $taskErrorLog." }
    try {
      $taskBound = @(Get-ApuntesListeners $taskPort)
      if ($taskBound.Count -and $taskBound[0].OwningProcess -eq $taskChild.Id) {
        Assert-ApuntesHealth (Get-ApuntesHealth $taskPort) $taskTarget
        $taskPage = Invoke-WebRequest -UseBasicParsing -Uri $taskUrl -TimeoutSec 5
        if ($taskPage.StatusCode -eq 200 -and $taskPage.Content -match 'id="root"') { $taskReady = $true; break }
      }
    } catch {}
    Start-Sleep -Milliseconds 500
  }
  if (-not $taskReady) { throw "No se pudo validar la web y API. Revisa $taskErrorLog." }
  Write-Host "[OK] Apuntes $taskProfile disponible en $taskUrl (PID $($taskChild.Id)). SQL: $($taskTarget.server)/$($taskTarget.database)."
  if (-not $taskNoBrowser -and $taskProfile -eq 'local') { Start-Process $taskUrl }
} catch {
  $taskExit = 1
  $taskError = $_.Exception.Message
  if ($taskChildIdentity) {
    try { Stop-ApuntesIdentity $taskChildIdentity } catch { Write-Host '[ERROR] No se pudo limpiar el proceso de este intento. Revisa su PID.' }
    $taskFailedState = Get-ApuntesStatePath $taskProfile
    if (Test-Path -LiteralPath $taskFailedState) { Remove-Item -LiteralPath $taskFailedState -Force }
  }
  Write-Host "[ERROR] $taskError" -ForegroundColor Red
} finally {
  $env:PORT = $taskPreviousPort
  if ($taskLock) { $taskLock.Dispose() }
  Pop-Location
}
if ($taskExit) { exit $taskExit }
