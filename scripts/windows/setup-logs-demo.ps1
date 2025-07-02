# Script para configurar el demo de logs en Windows

Write-Host "📊 Configurando Demo de Logs para DNO-Oracle" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Configurar variables de entorno para Oracle
$ORACLE_HOME = "C:\oracle\instantclient_19_25"
$env:PATH = "$ORACLE_HOME;$env:PATH"

Write-Host "🔧 Configurando entorno Oracle..." -ForegroundColor Yellow
Write-Host "Oracle Home: $ORACLE_HOME" -ForegroundColor Gray

# Función para ejecutar scripts SQL
function Invoke-SqlScript {
    param(
        [string]$ScriptPath,
        [string]$Description
    )
    
    if (Test-Path $ScriptPath) {
        Write-Host "📝 $Description" -ForegroundColor Yellow
        Write-Host "   Ejecutando: $ScriptPath" -ForegroundColor Gray
        
        try {
            deno run --allow-net --allow-read --allow-env --allow-ffi scripts/common/sql-executor.js $ScriptPath
            Write-Host "✅ Script ejecutado correctamente" -ForegroundColor Green
        } catch {
            Write-Host "❌ Error ejecutando script: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "❌ Script no encontrado: $ScriptPath" -ForegroundColor Red
        return $false
    }
    return $true
}

# 1. Crear tabla de usuarios si no existe
Write-Host "`n=== Paso 1: Configurando tabla de usuarios ===" -ForegroundColor Cyan
if (-not (Invoke-SqlScript -ScriptPath "scripts\common\create-users-table.sql" -Description "Creando tabla de usuarios")) {
    Write-Host "⚠️  Continuando sin tabla de usuarios..." -ForegroundColor Yellow
}

# 2. Crear tabla de logs
Write-Host "`n=== Paso 2: Configurando tabla de logs ===" -ForegroundColor Cyan
$logScripts = @(
    @{ Path = "scripts\common\create-logs-table.sql"; Desc = "Tabla de logs principal" },
    @{ Path = "scripts\common\create-logs-table-simple.sql"; Desc = "Tabla de logs simple (fallback)" },
    @{ Path = "scripts\common\create-logs-table-11g.sql"; Desc = "Tabla de logs para Oracle 11g" }
)

$logTableCreated = $false
foreach ($script in $logScripts) {
    if (Test-Path $script.Path) {
        Write-Host "Intentando crear tabla con: $($script.Path)" -ForegroundColor Gray
        if (Invoke-SqlScript -ScriptPath $script.Path -Description $script.Desc) {
            $logTableCreated = $true
            break
        }
    }
}

if (-not $logTableCreated) {
    Write-Host "❌ No se pudo crear la tabla de logs" -ForegroundColor Red
    exit 1
}

# 3. Insertar datos de prueba
Write-Host "`n=== Paso 3: Insertando datos de prueba ===" -ForegroundColor Cyan
if (Test-Path "scripts\common\test-logs-table.sql") {
    Invoke-SqlScript -ScriptPath "scripts\common\test-logs-table.sql" -Description "Insertando logs de prueba"
}

# 4. Verificar la configuración
Write-Host "`n=== Paso 4: Verificando configuración ===" -ForegroundColor Cyan
Write-Host "🧪 Ejecutando prueba de logs..." -ForegroundColor Yellow

try {
    deno run --allow-net --allow-read --allow-env --allow-ffi scripts/common/test-logs-simple.js
    Write-Host "✅ Configuración de logs verificada" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en la verificación: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Mostrar información de uso
Write-Host "`n=== Configuración Completada ===" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. Iniciar la API:" -ForegroundColor White
Write-Host "   .\run.ps1 api" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Probar la funcionalidad de logs:" -ForegroundColor White
Write-Host "   .\run.ps1 test:logs" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Ejecutar demo completo:" -ForegroundColor White
Write-Host "   .\run.ps1 demo" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Ver logs en tiempo real (API debe estar ejecutándose):" -ForegroundColor White
Write-Host "   curl http://localhost:8000/api/logs" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 Documentación disponible en:" -ForegroundColor Cyan
Write-Host "   - docs\API.md" -ForegroundColor Gray
Write-Host "   - docs\STORED-PROCEDURES.md" -ForegroundColor Gray
Write-Host "   - LOGS-DEMO-README.md" -ForegroundColor Gray
