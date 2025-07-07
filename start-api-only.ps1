# Script para iniciar SOLO la API de DNO-Oracle (sin interfaz web)
# Versión optimizada para desarrollo de API

param(
    [int]$Puerto = 8000,
    [switch]$Ayuda,
    [switch]$Debug,
    [switch]$Watch
)

if ($Ayuda) {
    Write-Host "🔧 DNO-Oracle API Server (Solo Backend)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Uso:" -ForegroundColor Yellow
    Write-Host "  .\start-api-only.ps1              # Iniciar API en puerto 8000"
    Write-Host "  .\start-api-only.ps1 -Puerto 3000 # Iniciar API en puerto 3000"
    Write-Host "  .\start-api-only.ps1 -Debug       # Modo debug con logs verbosos"
    Write-Host "  .\start-api-only.ps1 -Watch       # Modo watch (reinicia al cambiar archivos)"
    Write-Host "  .\start-api-only.ps1 -Ayuda       # Mostrar esta ayuda"
    Write-Host ""
    Write-Host "Endpoints de la API disponibles:" -ForegroundColor Green
    Write-Host "  • GET  /api/health                 # Health check"
    Write-Host "  • GET  /api/info                   # Documentación de la API"
    Write-Host "  • GET  /api/{entidad}              # Listar entidades"
    Write-Host "  • POST /api/{entidad}              # Crear entidad"
    Write-Host "  • GET  /api/{entidad}/:id          # Obtener por ID"
    Write-Host "  • PUT  /api/{entidad}/:id          # Actualizar entidad"
    Write-Host "  • DELETE /api/{entidad}/:id        # Eliminar entidad"
    Write-Host "  • POST /api/query                  # Ejecutar consultas SQL"
    Write-Host "  • POST /api/procedures/call        # Ejecutar procedimientos"
    Write-Host "  • POST /api/import/csv             # Importar archivos CSV"
    Write-Host ""
    Write-Host "Características:" -ForegroundColor Green
    Write-Host "  ✅ Solo backend API REST"
    Write-Host "  ✅ Sin interfaz web (archivos estáticos deshabilitados)"
    Write-Host "  ✅ Optimizado para desarrollo de API"
    Write-Host "  ✅ CORS habilitado para desarrollo"
    Write-Host "  ✅ Cache y logging completo"
    Write-Host ""
    exit 0
}

Write-Host "🔧 Iniciando DNO-Oracle API Server (Solo Backend)..." -ForegroundColor Cyan
Write-Host ""

# Verificar Deno
try {
    $denoVersion = deno --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deno detectado" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Deno no está instalado" -ForegroundColor Red
    exit 1
}

# Verificar configuración
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Archivo .env no encontrado - usando valores por defecto" -ForegroundColor Yellow
}

if (-not (Test-Path "config/entities.json")) {
    Write-Host "⚠️  Archivo entities.json no encontrado - usando configuración por defecto" -ForegroundColor Yellow
}

# Terminar procesos Deno existentes
$denoProcesses = Get-Process -Name "deno" -ErrorAction SilentlyContinue
if ($denoProcesses) {
    Write-Host "🔄 Terminando procesos Deno existentes..." -ForegroundColor Yellow
    $denoProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host "🔧 Configuración del API Server:" -ForegroundColor Cyan
Write-Host "   Puerto: $Puerto"
Write-Host "   Modo Debug: $($Debug ? 'Habilitado' : 'Deshabilitado')"
Write-Host "   Modo Watch: $($Watch ? 'Habilitado' : 'Deshabilitado')"
Write-Host "   URL Base: http://localhost:$Puerto/api"
Write-Host ""

# Configurar variables de entorno
$env:PORT = $Puerto
if ($Debug) {
    $env:LOG_LEVEL = "DEBUG"
}

# Preparar argumentos de Deno
$denoArgs = @("run", "--allow-all")

if ($Watch) {
    $denoArgs += "--watch"
    Write-Host "👀 Modo watch habilitado - El servidor se reiniciará automáticamente al cambiar archivos" -ForegroundColor Yellow
}

$denoArgs += "api/server-enhanced.ts"

Write-Host "🚀 Iniciando servidor API..." -ForegroundColor Green
Write-Host "   Comando: deno $($denoArgs -join ' ')" -ForegroundColor DarkGray
Write-Host ""

try {
    # Iniciar servidor
    $env:API_ONLY = "true"
    & deno @denoArgs
    
} catch {
    Write-Host "❌ Error iniciando el servidor: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🛑 Servidor API detenido" -ForegroundColor Yellow
