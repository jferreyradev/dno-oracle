# Script para configurar el entorno Oracle y ejecutar pruebas en Windows
param(
    [Parameter(Position=0)]
    [string]$Action
)

# Configurar el PATH para Oracle Instant Client (ajustar según tu instalación)
$ORACLE_HOME = "C:\oracle\instantclient_19_25"
$env:PATH = "$ORACLE_HOME;$env:PATH"

Write-Host "=== Configuración del Entorno Oracle ===" -ForegroundColor Cyan
Write-Host "Oracle Home configurado: $ORACLE_HOME" -ForegroundColor Green

switch ($Action) {
    "test" {
        Write-Host "Ejecutando prueba básica de conexión..." -ForegroundColor Yellow
        deno run --allow-net --allow-read --allow-env --allow-ffi tests/test-connection.js
    }
    "test-advanced" {
        Write-Host "Ejecutando diagnóstico avanzado..." -ForegroundColor Yellow
        deno run --allow-net --allow-read --allow-env --allow-ffi tests/test-connection-advanced.js
    }
    "test-final" {
        Write-Host "Ejecutando prueba final completa..." -ForegroundColor Yellow
        deno run --allow-net --allow-read --allow-env --allow-ffi tests/test-final.js
    }
    "diagnose" {
        Write-Host "Ejecutando diagnóstico de Oracle Client..." -ForegroundColor Yellow
        & ".\scripts\windows\diagnose-oracle.ps1"
    }
    "fix-dns" {
        Write-Host "Ejecutando solución DNS..." -ForegroundColor Yellow
        & ".\scripts\windows\fix-dns.ps1"
    }
    default {
        Write-Host "Uso: .\scripts\oracle-setup.ps1 {test|test-advanced|test-final|diagnose|fix-dns}" -ForegroundColor Red
        Write-Host ""
        Write-Host "Comandos disponibles:" -ForegroundColor White
        Write-Host "  test         - Prueba básica de conexión" -ForegroundColor Gray
        Write-Host "  test-advanced - Diagnóstico completo de conexión" -ForegroundColor Gray
        Write-Host "  test-final   - Prueba final con ejemplos de consultas" -ForegroundColor Gray
        Write-Host "  diagnose     - Diagnóstico de Oracle Client" -ForegroundColor Gray
        Write-Host "  fix-dns      - Ayuda para resolver problemas DNS" -ForegroundColor Gray
    }
}
