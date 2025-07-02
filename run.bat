@echo off
REM Script batch simple para DNO-Oracle en Windows
REM Uso: run.bat <comando>

REM Configurar Oracle Instant Client
set ORACLE_HOME=C:\oracle\instantclient_19_25
set PATH=%ORACLE_HOME%;%PATH%

if "%1"=="" goto help
if "%1"=="help" goto help
if "%1"=="install" goto install
if "%1"=="test" goto test
if "%1"=="api" goto api
if "%1"=="demo" goto demo
if "%1"=="diagnose" goto diagnose

REM Para otros comandos, usar PowerShell
echo Ejecutando comando con PowerShell...
powershell.exe -ExecutionPolicy Bypass -File ".\run.ps1" %*
goto end

:help
echo DNO-Oracle - Scripts para Windows
echo =================================
echo.
echo Comandos principales:
echo   install    - Configurar proyecto inicial
echo   test       - Prueba basica de conexion
echo   api        - Iniciar servidor API
echo   demo       - Demostracion de la API
echo   diagnose   - Diagnostico del sistema
echo   help       - Mostrar esta ayuda
echo.
echo Para comandos avanzados, usar PowerShell:
echo   .\run.ps1 help
echo.
goto end

:install
echo Configurando proyecto DNO-Oracle...
echo Dependencias ya incluidas en deps.ts
echo Copia .env.example a .env y configura tus variables
echo Ejecuta 'run.bat test' para verificar la configuracion
goto end

:test
echo Ejecutando prueba basica...
deno run --allow-net --allow-read --allow-env --allow-ffi tests/test-connection.js
goto end

:api
echo Iniciando servidor API...
deno run --allow-net --allow-read --allow-env --allow-ffi api/server.ts
goto end

:demo
echo Ejecutando demostracion...
powershell.exe -ExecutionPolicy Bypass -File ".\scripts\windows\demo-api.ps1"
goto end

:diagnose
echo Ejecutando diagnostico...
powershell.exe -ExecutionPolicy Bypass -File ".\scripts\windows\diagnose-oracle.ps1"
goto end

:end
