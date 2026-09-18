@echo off
setlocal DisableDelayedExpansion
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy\windows\project.ps1" -Action Start %*
set "APUNTES_EXIT=%errorlevel%"
if not "%APUNTES_EXIT%"=="0" if "%~1"=="" pause
exit /b %APUNTES_EXIT%
