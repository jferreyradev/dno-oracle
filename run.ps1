# Script principal de gestión para DNO-Oracle (Windows)
param(
    [Parameter(Position=0)]
    [string]$Command
)

$ErrorActionPreference = "Stop"

# Configurar variables de entorno para Oracle
$ORACLE_HOME = "C:\oracle\instantclient_19_25"
$env:PATH = "$ORACLE_HOME;$env:PATH"

switch ($Command) {
    "install" {
        Write-Host "🔧 Configurando proyecto DNO-Oracle..." -ForegroundColor Cyan
        Write-Host "✅ Dependencias ya incluidas en deps.ts" -ForegroundColor Green
        Write-Host "📝 Copia .env.example a .env y configura tus variables" -ForegroundColor Yellow
        Write-Host "🚀 Ejecuta '.\run.ps1 test' para verificar la configuración" -ForegroundColor Blue
    }
    
    "test" {
        Write-Host "🧪 Ejecutando prueba básica..." -ForegroundColor Yellow
        deno run --allow-net --allow-read --allow-env --allow-ffi tests/test-connection.js
    }
    
    "test:advanced" {
        Write-Host "🔬 Ejecutando diagnóstico avanzado..." -ForegroundColor Yellow
        deno run --allow-net --allow-read --allow-env --allow-ffi tests/test-connection-advanced.js
    }
    
    "test:final" {
        Write-Host "🎯 Ejecutando prueba completa..." -ForegroundColor Yellow
        deno run --allow-net --allow-read --allow-env --allow-ffi tests/test-final.js
    }
    
    "test:comparison" {
        Write-Host "⚖️  Ejecutando comparación de rendimiento..." -ForegroundColor Yellow
        deno run --allow-net --allow-read --allow-env --allow-ffi tests/test-comparison.js
    }
    
    "test:logs" {
        Write-Host "📋 Probando funcionalidad de logs..." -ForegroundColor Yellow
        deno run --allow-net --allow-read --allow-env --allow-ffi scripts/common/test-logs-simple.js
    }
    
    "api" {
        Write-Host "🚀 Iniciando servidor API..." -ForegroundColor Green
        deno run --allow-net --allow-read --allow-env --allow-ffi api/server.ts
    }
    
    "api:dev" {
        Write-Host "🔄 Iniciando servidor API en modo desarrollo..." -ForegroundColor Green
        deno run --allow-net --allow-read --allow-env --allow-ffi --watch api/server.ts
    }
    
    "demo" {
        Write-Host "🎬 Ejecutando demostración básica..." -ForegroundColor Magenta
        & ".\scripts\windows\demo-api.ps1"
    }
    
    "demo:complete" {
        Write-Host "🎭 Ejecutando demostración completa..." -ForegroundColor Magenta
        & ".\scripts\windows\demo-complete.ps1"
    }
    
    "setup:logs" {
        Write-Host "📊 Configurando tablas de logs..." -ForegroundColor Cyan
        & ".\scripts\windows\setup-logs-demo.ps1"
    }
    
    "sql" {
        Write-Host "💾 Ejecutando scripts SQL..." -ForegroundColor Blue
        deno run --allow-net --allow-read --allow-env --allow-ffi scripts/common/sql-executor.js
    }
    
    "diagnose" {
        Write-Host "🔍 Ejecutando diagnóstico del sistema..." -ForegroundColor Yellow
        & ".\scripts\windows\diagnose-oracle.ps1"
    }
    
    "fix:dns" {
        Write-Host "🌐 Ejecutando solución de problemas DNS..." -ForegroundColor Yellow
        & ".\scripts\windows\fix-dns.ps1"
    }
    
    "docs" {
        Write-Host "📚 Abriendo documentación..." -ForegroundColor Cyan
        if (Test-Path "docs\README.md") {
            Start-Process "docs\README.md"
        } else {
            Write-Host "Documentación disponible en:" -ForegroundColor White
            Write-Host "  - docs\API.md" -ForegroundColor Gray
            Write-Host "  - docs\INSTALLATION.md" -ForegroundColor Gray
            Write-Host "  - README.md" -ForegroundColor Gray
        }
    }
    
    "clean" {
        Write-Host "🧹 Limpiando archivos temporales..." -ForegroundColor Yellow
        if (Test-Path "*.log") { Remove-Item "*.log" }
        if (Test-Path "temp") { Remove-Item "temp" -Recurse -Force }
        Write-Host "✅ Limpieza completada" -ForegroundColor Green
    }
    
    "help" {
        Write-Host "DNO-Oracle - Herramientas de gestión" -ForegroundColor Cyan
        Write-Host "=====================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Comandos de instalación y configuración:" -ForegroundColor White
        Write-Host "  install      - Configurar proyecto inicial" -ForegroundColor Gray
        Write-Host "  diagnose     - Diagnosticar configuración Oracle" -ForegroundColor Gray
        Write-Host "  fix:dns      - Solucionar problemas de DNS" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Comandos de prueba:" -ForegroundColor White
        Write-Host "  test         - Prueba básica de conexión" -ForegroundColor Gray
        Write-Host "  test:advanced - Diagnóstico avanzado" -ForegroundColor Gray
        Write-Host "  test:final   - Prueba completa" -ForegroundColor Gray
        Write-Host "  test:comparison - Comparación de rendimiento" -ForegroundColor Gray
        Write-Host "  test:logs    - Prueba de funcionalidad de logs" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Comandos de API:" -ForegroundColor White
        Write-Host "  api          - Iniciar servidor API" -ForegroundColor Gray
        Write-Host "  api:dev      - Iniciar API en modo desarrollo" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Comandos de demostración:" -ForegroundColor White
        Write-Host "  demo         - Demostración básica de API" -ForegroundColor Gray
        Write-Host "  demo:complete - Demostración completa" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Comandos de utilidad:" -ForegroundColor White
        Write-Host "  setup:logs   - Configurar tablas de logs" -ForegroundColor Gray
        Write-Host "  sql          - Ejecutar scripts SQL" -ForegroundColor Gray
        Write-Host "  docs         - Abrir documentación" -ForegroundColor Gray
        Write-Host "  clean        - Limpiar archivos temporales" -ForegroundColor Gray
        Write-Host "  help         - Mostrar esta ayuda" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Ejemplos:" -ForegroundColor White
        Write-Host "  .\run.ps1 install" -ForegroundColor Cyan
        Write-Host "  .\run.ps1 test" -ForegroundColor Cyan
        Write-Host "  .\run.ps1 api" -ForegroundColor Cyan
        Write-Host "  .\run.ps1 demo" -ForegroundColor Cyan
    }
    
    default {
        Write-Host "❌ Comando desconocido: $Command" -ForegroundColor Red
        Write-Host ""
        Write-Host "Uso: .\run.ps1 <comando>" -ForegroundColor Yellow
        Write-Host "Ejecuta '.\run.ps1 help' para ver todos los comandos disponibles" -ForegroundColor Gray
        exit 1
    }
}
