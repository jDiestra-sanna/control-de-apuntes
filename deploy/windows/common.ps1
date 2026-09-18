# Shared ownership, profile and locking checks. Windows PowerShell 5.1 compatible.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:ProjectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$script:ServerFile = Join-Path $script:ProjectRoot 'server\index.js'
$script:StateRoot = Join-Path $script:ProjectRoot '.local'
$script:Profiles = @{ local = 3188; servidor = 5179 }

function Get-ApuntesProfile {
  param([string]$ExplicitProfile)
  if ($ExplicitProfile) { return $ExplicitProfile }
  $value = $env:APUNTES_PROFILE
  $envFile = Join-Path $script:ProjectRoot '.env'
  if (-not $value -and (Test-Path -LiteralPath $envFile)) {
    foreach ($line in [IO.File]::ReadAllLines($envFile)) {
      if ($line -match '^\s*APUNTES_PROFILE\s*=\s*(.*?)\s*(?:#.*)?$') { $value = $Matches[1].Trim().Trim('"').Trim("'") }
    }
  }
  if (-not $value) { $value = 'local' }
  if (-not $script:Profiles.ContainsKey($value)) { throw 'APUNTES_PROFILE debe ser local o servidor.' }
  return $value.ToLowerInvariant()
}

function Get-ApuntesListeners {
  param([int]$Port)
  # Do not hide access/provider errors as an available port.
  return @(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object LocalPort -eq $Port)
}

function Get-ApuntesIdentity {
  param([int]$ProcessId)
  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction Stop
  if (-not $process) { return $null }
  $escaped = [regex]::Escape($script:ServerFile)
  $pattern = '(?i)(?:^|\s)(?:"' + $escaped + '"|' + $escaped + ')(?=\s|$)'
  $owned = ($process.Name -ieq 'node.exe') -and ($process.CommandLine -match $pattern)
  return [pscustomobject]@{ pid = $ProcessId; owned = $owned; startedAt = $process.CreationDate.ToUniversalTime().ToString('o') }
}

function Get-ApuntesStatePath {
  param([string]$Profile)
  return Join-Path $script:StateRoot "run-$Profile.json"
}

function Read-ApuntesState {
  param([string]$Profile)
  $path = Get-ApuntesStatePath $Profile
  if (Test-Path -LiteralPath $path) {
    try { return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json }
    catch { throw "No se pudo leer $path. No se detuvo ningun proceso." }
  }
  return $null
}

function Enter-ApuntesLock {
  New-Item -ItemType Directory -Path $script:StateRoot -Force | Out-Null
  $path = Join-Path $script:StateRoot 'launcher.lock'
  try { return [IO.File]::Open($path, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None) }
  catch {
    if (($_.Exception.HResult -band 65535) -eq 32) { throw 'Hay otro inicio o cierre de Apuntes en curso. Espera a que termine y vuelve a ejecutar.' }
    throw 'No se pudo abrir .local/launcher.lock. Comprueba los permisos de esta cuenta Windows sobre la carpeta del proyecto.'
  }
}

function Assert-ApuntesPort {
  param([int]$Port)
  $listeners = @(Get-ApuntesListeners $Port)
  foreach ($listener in $listeners) {
    $identity = Get-ApuntesIdentity $listener.OwningProcess
    if (-not $identity -or -not $identity.owned) { throw "Puerto fijo $Port ocupado por otro proceso (PID $($listener.OwningProcess)). No se detuvo ni se cambio el puerto." }
  }
  if (-not $listeners.Count) {
    $probe = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
    $probe.Server.ExclusiveAddressUse = $true
    try { $probe.Start() }
    catch { throw "No se puede reservar el puerto fijo $Port. Comprueba servicios y reservas de Windows; no se eligio otro puerto." }
    finally { $probe.Stop() }
  }
  return $listeners
}

function Stop-ApuntesIdentity {
  param($Identity)
  $current = Get-ApuntesIdentity $Identity.pid
  if (-not $current) { return }
  if (-not $current.owned -or $current.startedAt -ne $Identity.startedAt) { throw "El PID $($Identity.pid) cambio de propietario. No se detuvo." }
  Stop-Process -Id $current.pid -ErrorAction Stop
  $deadline = (Get-Date).AddSeconds(10)
  do {
    if (-not (Get-Process -Id $current.pid -ErrorAction SilentlyContinue)) { return }
    Start-Sleep -Milliseconds 150
  } while ((Get-Date) -lt $deadline)
  throw "El proceso $($current.pid) no termino a tiempo."
}

function Get-ApuntesFingerprint {
  param([string[]]$Paths)
  $entries = foreach ($relative in $Paths) {
    $path = Join-Path $script:ProjectRoot $relative
    if (-not (Test-Path -LiteralPath $path)) { "MISSING:$relative"; continue }
    $item = Get-Item -LiteralPath $path
    $files = if ($item.PSIsContainer) { Get-ChildItem -LiteralPath $path -File -Recurse } else { $item }
    foreach ($file in $files) {
      $fileHash = [Security.Cryptography.SHA256]::Create()
      $stream = [IO.File]::OpenRead($file.FullName)
      try { $file.FullName.Substring($script:ProjectRoot.Length) + '=' + [BitConverter]::ToString($fileHash.ComputeHash($stream)).Replace('-', '') }
      finally { $stream.Dispose(); $fileHash.Dispose() }
    }
  }
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes(($entries | Sort-Object) -join "`n"))).Replace('-', '').ToLowerInvariant() }
  finally { $sha.Dispose() }
}

function Get-ApuntesRuntimeFingerprint {
  $code = Get-ApuntesFingerprint @('server', 'deploy/windows', 'package.json', 'package-lock.json')
  # Configuration content and key never enter process metadata or logs.
  $times = foreach ($relative in @('.env', '.local/master.key')) {
    $item = Get-Item -LiteralPath (Join-Path $script:ProjectRoot $relative) -ErrorAction Stop
    "$relative=$($item.LastWriteTimeUtc.Ticks):$($item.Length)"
  }
  return $code + '|' + ($times -join '|')
}

function Get-ApuntesHealth {
  param([int]$Port)
  return Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -Headers @{ 'X-Apuntes-Client' = 'local' } -TimeoutSec 5
}

function Assert-ApuntesHealth {
  param($Health, $Target)
  if (-not $Health.ok -or $Health.server -ne $Target.server -or $Health.database -ne $Target.database -or $Health.authentication -ne $Target.authentication) {
    throw 'El servidor no responde con la configuracion SQL esperada. Cierra este perfil y vuelve a levantarlo.'
  }
}
