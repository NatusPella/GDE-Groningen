@echo off
setlocal EnableExtensions
title GDE Groningen - Zomer vol misdaad
cd /d "%~dp0"

rem Uitgepakte ZIP: de game staat naast dit bestand
if exist "%~dp0GDE-Groningen\start.bat" (
  call "%~dp0GDE-Groningen\start.bat"
  exit /b
)

rem Direct vanuit de ZIP geopend: Windows heeft alleen dit ene bestand
rem uitgepakt. Zoek de ZIP op en pak hem eenmalig uit naar %LOCALAPPDATA%\GDE-Groningen.
echo.
echo   GDE Groningen wordt klaargezet, een moment...
echo.
set "GDE_HERE=%~dp0"
set "GDE_SELF=%~f0"
set "GDE_DEST=%LOCALAPPDATA%\GDE-Groningen"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s = Get-Content -LiteralPath $env:GDE_SELF -Raw; $m = '#PS' + '-BEGIN'; iex $s.Substring($s.IndexOf($m))"
if errorlevel 1 (
  echo.
  pause
  exit /b 1
)
call "%GDE_DEST%\GDE-Groningen\start.bat"
exit /b

#PS-BEGIN
$ErrorActionPreference = 'Stop'
$here = $env:GDE_HERE
$dest = $env:GDE_DEST
$name = $null
if ($here -match '\\Temp\d*_([^\\]+?\.zip)\\') { $name = $Matches[1] }
$userDir = if ($env:GDE_TEST_HOME) { $env:GDE_TEST_HOME } else { [Environment]::GetFolderPath('UserProfile') }
$dirs = @((Join-Path $userDir 'Downloads'), [Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('MyDocuments'), $userDir)
$zip = $null
foreach ($d in $dirs) {
  if (-not $d -or -not (Test-Path -LiteralPath $d)) { continue }
  $found = @()
  if ($name) { $found = @(Get-ChildItem -LiteralPath $d -Filter $name -File -ErrorAction SilentlyContinue) }
  if (-not $found.Count) { $found = @(Get-ChildItem -LiteralPath $d -Filter 'GDE-Groningen*.zip' -File -ErrorAction SilentlyContinue) }
  if ($found.Count) { $zip = ($found | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName; break }
}
if (-not $zip) {
  Write-Host '  [!] De ZIP is niet gevonden in Downloads, Bureaublad of Documenten.'
  Write-Host '      Pak de ZIP uit (rechtermuisklik op de ZIP > Alles uitpakken)'
  Write-Host '      en dubbelklik daarna op START DE GAME.bat in de uitgepakte map.'
  exit 1
}
Write-Host "  Uitpakken van $zip"
Write-Host "  naar $dest ..."
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Expand-Archive -Force -LiteralPath $zip -DestinationPath $dest
if (-not (Test-Path -LiteralPath (Join-Path $dest 'GDE-Groningen\start.bat'))) {
  Write-Host '  [!] Uitpakken is mislukt. Pak de ZIP zelf uit en start START DE GAME.bat daaruit.'
  exit 1
}
Write-Host '  Klaar.'
exit 0
