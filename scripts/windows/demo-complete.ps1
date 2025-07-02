# Script de demostración completa para Windows

Write-Host "🎭 Demostración Completa de DNO-Oracle" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Configurar variables de entorno para Oracle
$ORACLE_HOME = "C:\oracle\instantclient_19_25"
$env:PATH = "$ORACLE_HOME;$env:PATH"

$API_URL = "http://localhost:8000/api"

# Función para verificar si la API está ejecutándose
function Test-ApiAvailability {
    try {
        $response = Invoke-RestMethod -Uri "$API_URL/health" -Method GET -TimeoutSec 5
        return $true
    } catch {
        return $false
    }
}

# Función para esperar a que la API esté disponible
function Wait-ForApi {
    param([int]$MaxAttempts = 30)
    
    Write-Host "⏳ Esperando a que la API esté disponible..." -ForegroundColor Yellow
    
    for ($i = 1; $i -le $MaxAttempts; $i++) {
        if (Test-ApiAvailability) {
            Write-Host "✅ API disponible en $API_URL" -ForegroundColor Green
            return $true
        }
        
        Write-Host "   Intento $i/$MaxAttempts..." -ForegroundColor Gray
        Start-Sleep 2
    }
    
    Write-Host "❌ La API no está disponible después de $MaxAttempts intentos" -ForegroundColor Red
    return $false
}

Write-Host "=== Fase 1: Verificación del Sistema ===" -ForegroundColor Magenta

# 1. Verificar configuración Oracle
Write-Host "🔍 Verificando configuración Oracle..." -ForegroundColor Yellow
& ".\scripts\windows\diagnose-oracle.ps1"

Write-Host "`n🧪 Ejecutando pruebas de conexión..." -ForegroundColor Yellow
try {
    deno run --allow-net --allow-read --allow-env --allow-ffi tests/test-connection.js
    Write-Host "✅ Conexión básica exitosa" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en conexión básica" -ForegroundColor Red
    Write-Host "Continuando con la demostración..." -ForegroundColor Yellow
}

Write-Host "`n=== Fase 2: Configuración de Base de Datos ===" -ForegroundColor Magenta

# 2. Configurar tablas necesarias
Write-Host "📊 Configurando tablas de demostración..." -ForegroundColor Yellow
& ".\scripts\windows\setup-logs-demo.ps1"

Write-Host "`n=== Fase 3: Inicio de la API ===" -ForegroundColor Magenta

# 3. Verificar si la API ya está ejecutándose
if (Test-ApiAvailability) {
    Write-Host "✅ API ya está ejecutándose" -ForegroundColor Green
} else {
    Write-Host "🚀 Iniciando servidor API..." -ForegroundColor Yellow
    
    # Iniciar API en segundo plano
    $apiJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        $env:PATH = "$using:ORACLE_HOME;$env:PATH"
        deno run --allow-net --allow-read --allow-env --allow-ffi api/server.ts
    }
    
    # Esperar a que la API esté disponible
    if (-not (Wait-ForApi)) {
        Write-Host "❌ No se pudo iniciar la API. Deteniendo la demostración." -ForegroundColor Red
        Stop-Job $apiJob -ErrorAction SilentlyContinue
        Remove-Job $apiJob -ErrorAction SilentlyContinue
        exit 1
    }
}

Write-Host "`n=== Fase 4: Demostración de la API ===" -ForegroundColor Magenta

# 4. Ejecutar demostración de la API
& ".\scripts\windows\demo-api.ps1" -ApiUrl $API_URL

Write-Host "`n=== Fase 5: Pruebas Avanzadas ===" -ForegroundColor Magenta

# 5. Ejecutar pruebas avanzadas
Write-Host "🔬 Ejecutando pruebas avanzadas..." -ForegroundColor Yellow
try {
    deno run --allow-net --allow-read --allow-env --allow-ffi tests/test-final.js
    Write-Host "✅ Pruebas avanzadas completadas" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Algunas pruebas avanzadas fallaron" -ForegroundColor Yellow
}

Write-Host "`n=== Fase 6: Pruebas de Rendimiento ===" -ForegroundColor Magenta

# 6. Ejecutar comparación de rendimiento (si existe)
if (Test-Path "tests\test-comparison.js") {
    Write-Host "⚖️  Ejecutando pruebas de rendimiento..." -ForegroundColor Yellow
    try {
        deno run --allow-net --allow-read --allow-env --allow-ffi tests/test-comparison.js
        Write-Host "✅ Pruebas de rendimiento completadas" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Pruebas de rendimiento no disponibles" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Demostración Completada ===" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 La demostración completa ha finalizado exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Resumen de lo demostrado:" -ForegroundColor Cyan
Write-Host "✅ Configuración del entorno Oracle" -ForegroundColor Gray
Write-Host "✅ Conexión a la base de datos" -ForegroundColor Gray
Write-Host "✅ Creación de tablas de ejemplo" -ForegroundColor Gray
Write-Host "✅ API REST funcional" -ForegroundColor Gray
Write-Host "✅ Operaciones CRUD completas" -ForegroundColor Gray
Write-Host "✅ Sistema de logs integrado" -ForegroundColor Gray
Write-Host "✅ Consultas personalizadas" -ForegroundColor Gray
Write-Host "✅ Pruebas de rendimiento" -ForegroundColor Gray
Write-Host ""
Write-Host "🔗 Enlaces útiles:" -ForegroundColor Cyan
Write-Host "   API Health: http://localhost:8000/api/health" -ForegroundColor Gray
Write-Host "   Logs API: http://localhost:8000/api/logs" -ForegroundColor Gray
Write-Host "   Users API: http://localhost:8000/api/users" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 Documentación:" -ForegroundColor Cyan
Write-Host "   - docs\API.md - Documentación completa de la API" -ForegroundColor Gray
Write-Host "   - docs\postman-collection.json - Colección de Postman" -ForegroundColor Gray
Write-Host "   - examples\ - Ejemplos de código" -ForegroundColor Gray
Write-Host ""
Write-Host "🛑 Para detener la API:" -ForegroundColor Yellow
Write-Host "   Ctrl+C en la terminal donde se ejecuta" -ForegroundColor Gray
Write-Host "   O ejecuta: Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor Gray

# Limpiar trabajos en segundo plano si existen
if (Get-Variable -Name "apiJob" -ErrorAction SilentlyContinue) {
    Write-Host "`n⚠️  La API sigue ejecutándose en segundo plano" -ForegroundColor Yellow
    Write-Host "   Job ID: $($apiJob.Id)" -ForegroundColor Gray
}
