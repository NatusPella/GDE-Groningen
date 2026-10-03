@echo off
setlocal EnableExtensions EnableDelayedExpansion
title GDE Groningen - Zomer vol misdaad
cd /d "%~dp0"

echo.
echo   ==========================================
echo    GDE Groningen - Zomer vol misdaad
echo   ==========================================
echo.

if not exist "game\index.html" (
  echo   [!] Kan de map "game" niet vinden.
  echo       Pak eerst de hele ZIP uit en start dit bestand vanuit die map.
  goto :fail
)

rem --- 1. Python zoeken: eerst een eerder gedownloade, dan een geinstalleerde ---
set "PY="
if exist "%~dp0.python\python.exe" set "PY="%~dp0.python\python.exe""
if not defined PY (
  py -3 -c "import http.server" >nul 2>&1 && set "PY=py -3"
)
if not defined PY (
  python -c "import sys, http.server; sys.exit(0 if sys.version_info[0] == 3 else 1)" >nul 2>&1 && set "PY=python"
)

rem --- 2. Geen Python? Download de officiele portable versie (eenmalig) ---
if not defined PY (
  set "PYVER=3.12.8"
  set "ARCH=amd64"
  if /i "%PROCESSOR_ARCHITECTURE%"=="ARM64" set "ARCH=arm64"
  if /i "%PROCESSOR_ARCHITEW6432%"=="ARM64" set "ARCH=arm64"
  set "PYZIP=python-!PYVER!-embed-!ARCH!.zip"
  set "PYURL=https://www.python.org/ftp/python/!PYVER!/!PYZIP!"
  echo   Python niet gevonden. Portable Python !PYVER! wordt eenmalig gedownload
  echo   van python.org naar de map ".python" naast de game. Even geduld...
  echo.
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ErrorActionPreference='Stop'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; $ProgressPreference='SilentlyContinue';" ^
    "Invoke-WebRequest -UseBasicParsing -Uri '!PYURL!' -OutFile '%TEMP%\!PYZIP!';" ^
    "if (Test-Path '%~dp0.python') { Remove-Item -Recurse -Force '%~dp0.python' };" ^
    "Expand-Archive -Force -Path '%TEMP%\!PYZIP!' -DestinationPath '%~dp0.python';" ^
    "Remove-Item -Force '%TEMP%\!PYZIP!'"
  if errorlevel 1 (
    echo.
    echo   [!] Downloaden van Python is mislukt. Check je internetverbinding,
    echo       of installeer Python zelf via https://www.python.org/downloads/
    echo       en start dit bestand daarna opnieuw.
    goto :fail
  )
  if not exist "%~dp0.python\python.exe" (
    echo   [!] Python is gedownload maar python.exe ontbreekt. Probeer het opnieuw.
    goto :fail
  )
  set "PY="%~dp0.python\python.exe""
  echo   Python staat klaar.
  echo.
)

rem --- 3. Vrije poort zoeken (8765 t/m 8775) ---
set "PORT="
for /l %%P in (8765,1,8775) do (
  if not defined PORT (
    netstat -an | findstr /r /c:":%%P .*LISTENING" >nul 2>&1 || set "PORT=%%P"
  )
)
if not defined PORT (
  echo   [!] Geen vrije poort gevonden tussen 8765 en 8775.
  echo       Sluit andere GDE-vensters en probeer het opnieuw.
  goto :fail
)

set "URL=http://127.0.0.1:%PORT%/"
echo   De game draait op %URL%
echo   Je browser gaat zo vanzelf open. Gebeurt dat niet, open dan dat adres
echo   zelf in Chrome of Edge.
echo.
echo   LAAT DIT VENSTER OPEN zolang je speelt. Sluit het venster om te stoppen.
echo.

rem browser openen zodra de server even de tijd heeft gehad om te starten
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process '%URL%'"

rem alleen op deze pc luisteren (127.0.0.1): geen firewall-melding
%PY% "%~dp0scripts\devserver.py" %PORT% "%~dp0game" 127.0.0.1

echo.
echo   De server is gestopt.
goto :end

:fail
echo.
pause
exit /b 1

:end
pause
endlocal
