@echo off
setlocal enabledelayedexpansion

REM DNO-Oracle API Server - Script de inicio para Windows (cmd/batch)
REM Detecta automáticamente las rutas apropiadas y configura el servidor

REM Variables por defecto
set PORT=8000
set MODE=minimal
set HELP=false

REM Colores (simulados con echo)
set COLOR_INFO=echo [INFO]
set COLOR_SUCCESS=echo [OK]
set COLOR_WARNING=echo [WARNING]
set COLOR_ERROR=echo [ERROR]
set COLOR_HEADER=echo [DNO-Oracle]

REM Procesar argumentos
:parse_args
if "%~1"=="" goto end_parse
if "%~1"=="/?" goto show_help
if "%~1"=="-h" goto show_help
if "%~1"=="--help" goto show_help
if "%~1"=="-p" (
    set PORT=%~2
    shift
    shift
    goto parse_args
)
if "%~1"=="--port" (
    set PORT=%~2
    shift
    shift
    goto parse_args
)
if "%~1"=="-m" (
    set MODE=%~2
    shift
    shift
    goto parse_args
)
if "%~1"=="--mode" (
    set MODE=%~2
    shift
    shift
    goto parse_args
)
shift
goto parse_args

:end_parse

REM Función para mostrar ayuda
:show_help
echo.
echo 🚀 DNO-Oracle API Server - Script de inicio para Windows
echo.
echo USO:
echo     %~nx0 [OPTIONS]
echo.
echo OPCIONES:
echo     -p, --port PORT     Puerto en el que ejecutar el servidor (por defecto: 8000)
echo     -m, --mode MODE     Modo de ejecución: minimal (por defecto) o enhanced
echo     -h, --help          Muestra esta ayuda
echo.
echo EJEMPLOS:
echo     # Ejecutar en el puerto por defecto (8000)
echo     %~nx0
echo.
echo     # Ejecutar en puerto específico
echo     %~nx0 --port 3000
echo.
echo     # Mostrar ayuda
echo     %~nx0 --help
echo.
echo REQUISITOS:
echo     - Deno 1.30 o superior
echo     - Oracle Instant Client configurado
echo     - Archivos .env y config/entities.json
echo.
goto :eof

REM Función para mostrar banner
:show_banner
echo.
echo 🚀 DNO-Oracle API Server
echo ========================
echo.
goto :eof

REM Función para verificar Deno
:check_deno
deno --version >nul 2>&1
if errorlevel 1 (
    set DENO_INSTALLED=false
) else (
    set DENO_INSTALLED=true
)
goto :eof

REM Función para mostrar instrucciones de instalación de Deno
:show_deno_install_instructions
echo ❌ Deno no está instalado o no está en el PATH
echo.
echo 📦 Instrucciones de instalación para Windows:
echo.
echo PowerShell:
echo   irm https://deno.land/install.ps1 ^| iex
echo.
echo Scoop:
echo   scoop install deno
echo.
echo Chocolatey:
echo   choco install deno
echo.
echo Winget:
echo   winget install deno
echo.
echo 🔗 Más información: https://deno.land/manual/getting_started/installation
goto :eof

REM Función para verificar configuración
:check_configuration
set CONFIG_VALID=true

REM Verificar .env
if not exist ".env" (
    echo ⚠️  Archivo .env no encontrado
    echo    Copiando desde .env.example...
    
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo    ✅ Archivo .env creado desde .env.example
    ) else (
        echo    ❌ Archivo .env.example no encontrado
        set CONFIG_VALID=false
    )
)

REM Verificar config/entities.json
if not exist "config\entities.json" (
    echo ⚠️  Archivo config/entities.json no encontrado
    set CONFIG_VALID=false
)

REM Verificar servidor
set SERVER_FILE=api\server-%MODE%.ts
if not exist "%SERVER_FILE%" (
    echo ❌ Servidor %SERVER_FILE% no encontrado
    set CONFIG_VALID=false
)

goto :eof

REM Función para obtener configuración del puerto
:get_configured_port
set CONFIGURED_PORT=8000
if exist ".env" (
    for /f "tokens=2 delims==" %%a in ('findstr /r "^PORT=" ".env" 2^>nul') do (
        set CONFIGURED_PORT=%%a
    )
)
goto :eof

REM Función principal
:start_server
call :show_banner

REM Verificar Deno
echo 🔍 Verificando instalación de Deno...
call :check_deno
if "%DENO_INSTALLED%"=="false" (
    call :show_deno_install_instructions
    exit /b 1
)

REM Mostrar versión de Deno
for /f "tokens=*" %%a in ('deno --version 2^>nul ^| findstr /r "^deno"') do (
    echo    ✅ %%a
)

REM Verificar configuración
echo 🔧 Verificando configuración...
call :check_configuration
if "%CONFIG_VALID%"=="false" (
    echo ❌ Configuración incompleta. Revisa los archivos mencionados.
    exit /b 1
)

echo    ✅ Configuración válida

REM Configurar puerto
call :get_configured_port
if "%PORT%"=="8000" if not "%CONFIGURED_PORT%"=="8000" (
    set PORT=%CONFIGURED_PORT%
    echo 🔧 Usando puerto configurado en .env: !PORT!
)

REM Configurar servidor
set SERVER_FILE=api\server-%MODE%.ts
echo 🚀 Iniciando servidor DNO-Oracle...
echo    📄 Archivo: %SERVER_FILE%
echo    🌐 Puerto: %PORT%
echo    🖥️  Plataforma: Windows
echo.

REM Configurar variable de entorno del puerto si es diferente
if not "%PORT%"=="%CONFIGURED_PORT%" (
    set PORT=%PORT%
)

REM Comando de Deno
set DENO_ARGS=run --allow-net --allow-read --allow-env --allow-ffi %SERVER_FILE%

echo 🎯 Ejecutando comando:
echo    deno %DENO_ARGS%
echo.
echo 🛑 Presiona Ctrl+C para detener el servidor
echo.

REM Ejecutar servidor
deno %DENO_ARGS%
if errorlevel 1 (
    echo ❌ Error al ejecutar el servidor
    exit /b 1
)

goto :eof

REM Validar argumentos
echo %PORT% | findstr /r "^[0-9][0-9]*$" >nul
if errorlevel 1 (
    echo ❌ Puerto debe ser un número válido
    exit /b 1
)

if not "%MODE%"=="minimal" if not "%MODE%"=="enhanced" (
    echo ❌ Modo debe ser 'minimal' o 'enhanced'
    exit /b 1
)

REM Ejecutar función principal
call :start_server
