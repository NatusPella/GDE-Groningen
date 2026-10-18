@echo off
setlocal EnableExtensions EnableDelayedExpansion
title GDE Groningen - Zomer vol misdaad
cd /d "%~dp0"

echo.
echo   ==========================================
echo    GDE Groningen - Zomer vol misdaad
echo   ==========================================
echo.

rem De speler-zip heeft de webversie in "web-dist"; vanuit een clone moet die
rem eerst gebouwd zijn (node web/build.mjs). Er is geen Python of Node nodig.
set "DIR=%~dp0web-dist"
if not exist "%DIR%\index.html" (
  echo   [!] Kan de map "web-dist" niet vinden.
  echo       Pak eerst de hele ZIP uit en start dit bestand vanuit die map.
  goto :fail
)

rem --- Vrije poort zoeken (8765 t/m 8775) ---
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
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\serve.ps1" -Port %PORT% -Dir "%DIR%"

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
