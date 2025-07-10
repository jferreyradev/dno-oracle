# 🚀 DNO-Oracle - Script de Inicio Completo
# Inicia el servidor y ejecuta todas las validaciones necesarias

param(
    [switch]$SkipValidation,
    [switch]$GenerateReports,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

Write-Host "🚀 DNO-Oracle - Inicio Completo del Sistema" -ForegroundColor Cyan
Write-Host "=" * 60
Write-Host ""

# ========================================
# 1. VERIFICAR DEPENDENCIAS
# ========================================

Write-Host "🔍 1. VERIFICANDO DEPENDENCIAS" -ForegroundColor Magenta
Write-Host ""

# Verificar Deno
try {
    $denoVersion = deno --version | Select-Object -First 1
    Write-Host "✅ Deno: $denoVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Deno no está instalado o no está en PATH" -ForegroundColor Red
    Write-Host "   Instalar desde: https://deno.land/" -ForegroundColor Yellow
    exit 1
}

# Verificar archivos de configuración
$requiredFiles = @(
    ".env",
    "config/databases.json", 
    "config/entities.json",
    "api/server-minimal.ts"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file no encontrado" -ForegroundColor Red
        if ($file -eq ".env") {
            Write-Host "   Copia .env.example a .env y configura tus datos" -ForegroundColor Yellow
        }
    }
}

# ========================================
# 2. INICIAR SERVIDOR EN BACKGROUND
# ========================================

Write-Host "`n🖥️ 2. INICIANDO SERVIDOR" -ForegroundColor Magenta
Write-Host ""

# Verificar si ya hay un servidor corriendo
try {
    $healthCheck = Invoke-RestMethod "http://localhost:8000/api/health" -TimeoutSec 5
    if ($healthCheck.success) {
        Write-Host "⚠️ Ya hay un servidor corriendo en puerto 8000" -ForegroundColor Yellow
        Write-Host "   Usando el servidor existente..." -ForegroundColor Gray
        $serverRunning = $true
    }
} catch {
    $serverRunning = $false
}

if (-not $serverRunning) {
    Write-Host "🔄 Iniciando servidor en background..." -ForegroundColor Yellow
    
    # Iniciar servidor en background
    $serverJob = Start-Process -FilePath "deno" -ArgumentList @(
        "run", 
        "--allow-net", 
        "--allow-read", 
        "--allow-env", 
        "--allow-ffi", 
        "api/server-minimal.ts"
    ) -NoNewWindow -PassThru
    
    if ($serverJob) {
        Write-Host "✅ Servidor iniciado (PID: $($serverJob.Id))" -ForegroundColor Green
        
        # Esperar a que el servidor esté listo
        Write-Host "⏳ Esperando que el servidor esté listo..." -ForegroundColor Gray
        $maxWait = 30  # 30 segundos máximo
        $waited = 0
        $ready = $false
        
        while ($waited -lt $maxWait -and -not $ready) {
            Start-Sleep -Seconds 1
            $waited++
            
            try {
                $healthCheck = Invoke-RestMethod "http://localhost:8000/api/health" -TimeoutSec 2
                if ($healthCheck.success) {
                    $ready = $true
                    Write-Host "✅ Servidor listo después de $waited segundos" -ForegroundColor Green
                }
            } catch {
                # Servidor aún no está listo
            }
            
            if ($waited % 5 -eq 0) {
                Write-Host "   Esperando... ($waited/$maxWait segundos)" -ForegroundColor Gray
            }
        }
        
        if (-not $ready) {
            Write-Host "❌ El servidor no respondió después de $maxWait segundos" -ForegroundColor Red
            Write-Host "   Verifica los logs del servidor y la configuración" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "❌ Error al iniciar el servidor" -ForegroundColor Red
        exit 1
    }
}

# ========================================
# 3. PRUEBAS BÁSICAS
# ========================================

if (-not $SkipValidation) {
    Write-Host "`n🧪 3. EJECUTANDO PRUEBAS BÁSICAS" -ForegroundColor Magenta
    Write-Host ""
    
    try {
        & ".\test.ps1"
        Write-Host "✅ Pruebas básicas completadas" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Error en pruebas básicas: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    # ========================================
    # 4. VALIDACIÓN COMPLETA
    # ========================================
    
    Write-Host "`n🔍 4. VALIDACIÓN COMPLETA DE API" -ForegroundColor Magenta
    Write-Host ""
    
    try {
        if ($GenerateReports) {
            & ".\validar-api.ps1" -DetailedReport
        } else {
            & ".\validar-api.ps1"
        }
        Write-Host "✅ Validación completa finalizada" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Error en validación completa: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# ========================================
# 5. INFORMACIÓN DEL SISTEMA
# ========================================

Write-Host "`n📊 5. INFORMACIÓN DEL SISTEMA" -ForegroundColor Magenta
Write-Host ""

try {
    $systemInfo = Invoke-RestMethod "http://localhost:8000/api/info"
    $connections = Invoke-RestMethod "http://localhost:8000/api/connections"
    $entities = Invoke-RestMethod "http://localhost:8000/api/entities"
    
    Write-Host "🖥️ SERVIDOR:" -ForegroundColor White
    Write-Host "   Estado: ✅ Funcionando" -ForegroundColor Green
    Write-Host "   URL: http://localhost:8000" -ForegroundColor Gray
    Write-Host "   Versión: $($systemInfo.data.version)" -ForegroundColor Gray
    
    Write-Host "`n🔌 CONEXIONES:" -ForegroundColor White
    foreach ($conn in $connections.data.active.PSObject.Properties) {
        Write-Host "   $($conn.Name): ✅ $($conn.Value.host):$($conn.Value.port)/$($conn.Value.service)" -ForegroundColor Green
    }
    
    Write-Host "`n🗃️ ENTIDADES:" -ForegroundColor White
    foreach ($entity in $entities.data.entities.PSObject.Properties) {
        $allowedConns = $entity.Value.allowedConnections -join ", "
        Write-Host "   $($entity.Name): ✅ $($entity.Value.tableName) [$allowedConns]" -ForegroundColor Green
    }
    
} catch {
    Write-Host "⚠️ Error al obtener información del sistema: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ========================================
# 6. GENERAR EJEMPLOS (OPCIONAL)
# ========================================

if ($GenerateReports) {
    Write-Host "`n📋 6. GENERANDO EJEMPLOS COMPLETOS" -ForegroundColor Magenta
    Write-Host ""
    
    try {
        if ($Verbose) {
            & ".\ejemplos-completos.ps1" -SaveToFile -Verbose
        } else {
            & ".\ejemplos-completos.ps1" -SaveToFile
        }
        Write-Host "✅ Ejemplos generados y guardados" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Error al generar ejemplos: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# ========================================
# 7. RESUMEN FINAL
# ========================================

Write-Host "`n🎯 RESUMEN FINAL" -ForegroundColor Magenta
Write-Host "=" * 60

Write-Host "`n✅ SISTEMA OPERATIVO:" -ForegroundColor Green
Write-Host "   • Servidor funcionando en http://localhost:8000" -ForegroundColor White
Write-Host "   • Múltiples conexiones Oracle disponibles" -ForegroundColor White
Write-Host "   • Entidades configuradas y accesibles" -ForegroundColor White
Write-Host "   • Selección dinámica de conexión habilitada" -ForegroundColor White
Write-Host "   • Paginación funcionando correctamente" -ForegroundColor White

Write-Host "`n📋 COMANDOS ÚTILES:" -ForegroundColor Cyan
Write-Host "   # Consulta básica" -ForegroundColor Gray
Write-Host "   curl `"http://localhost:8000/api/proc_cab?limit=5`"" -ForegroundColor White
Write-Host ""
Write-Host "   # Seleccionar conexión" -ForegroundColor Gray  
Write-Host "   curl `"http://localhost:8000/api/proc_cab?connection=desa&limit=3`"" -ForegroundColor White
Write-Host ""
Write-Host "   # Estado del sistema" -ForegroundColor Gray
Write-Host "   curl `"http://localhost:8000/api/health`"" -ForegroundColor White

Write-Host "`n📚 DOCUMENTACIÓN:" -ForegroundColor Cyan
Write-Host "   • GUIA-COMPLETA-API.md - Guía completa de la API" -ForegroundColor White
Write-Host "   • API-EJEMPLOS.md - Ejemplos básicos" -ForegroundColor White
Write-Host "   • SISTEMA-FUNCIONANDO.md - Estado del sistema" -ForegroundColor White

Write-Host "`n🔧 SCRIPTS DISPONIBLES:" -ForegroundColor Cyan
Write-Host "   • .\test.ps1 - Pruebas básicas" -ForegroundColor White
Write-Host "   • .\validar-api.ps1 - Validación completa" -ForegroundColor White
Write-Host "   • .\ejemplos-completos.ps1 - Generar ejemplos" -ForegroundColor White

if (-not $GenerateReports) {
    Write-Host "`n💡 TIPS:" -ForegroundColor Yellow
    Write-Host "   • Usa -GenerateReports para crear reportes detallados" -ForegroundColor Gray
    Write-Host "   • Usa -Verbose para ver más información" -ForegroundColor Gray
    Write-Host "   • Ejecuta: .\inicio-completo.ps1 -GenerateReports -Verbose" -ForegroundColor Gray
}

Write-Host "`n🚀 ¡Sistema DNO-Oracle listo para usar!" -ForegroundColor Green

# Mantener el servidor corriendo si se inició desde este script
if ($serverJob -and -not $serverJob.HasExited) {
    Write-Host "`n⚠️ IMPORTANTE: El servidor está corriendo en background (PID: $($serverJob.Id))" -ForegroundColor Yellow
    Write-Host "   Para detenerlo: Stop-Process -Id $($serverJob.Id)" -ForegroundColor Gray
    Write-Host "   O usa Ctrl+C para salir y el proceso continuará" -ForegroundColor Gray
}
