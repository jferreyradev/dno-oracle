# 📡 Generador de Ejemplos DNO-Oracle

Write-Host "📡 Generador de Ejemplos DNO-Oracle" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:8000"

# Verificar servidor
try {
    $test = Test-NetConnection -ComputerName "localhost" -Port 8000 -InformationLevel Quiet
    if (-not $test) {
        Write-Host "❌ Servidor no ejecutándose. Iniciar con: .\start-server.ps1" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Servidor activo" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Función para mostrar ejemplo
function Show-Example {
    param([string]$Url, [string]$Description)
    
    Write-Host "📋 $Description" -ForegroundColor Yellow
    Write-Host "🔗 $Url" -ForegroundColor Gray
    
    try {
        $response = Invoke-RestMethod -Uri $Url -TimeoutSec 10
        Write-Host "📄 Respuesta:" -ForegroundColor Cyan
        Write-Host ($response | ConvertTo-Json -Depth 5) -ForegroundColor White
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ("-" * 80) -ForegroundColor DarkGray
    Write-Host ""
}

# Generar ejemplos
Write-Host "🔍 Generando ejemplos de API..." -ForegroundColor Cyan
Write-Host ""

Show-Example "$baseUrl/api/health" "Health Check"
Show-Example "$baseUrl/api/connections" "Lista de Conexiones"
Show-Example "$baseUrl/api/entities" "Lista de Entidades"
Show-Example "$baseUrl/api/proc_cab?limit=3" "Consulta Básica (proc_cab, límite 3)"
Show-Example "$baseUrl/api/proc_cab?connection=desa&limit=2" "Consulta con Conexión Específica (desa)"
Show-Example "$baseUrl/api/TMP_RENOV_CARGO?connection=prod&limit=2" "Otra Entidad con Conexión (prod)"

Write-Host "🎉 Ejemplos generados exitosamente" -ForegroundColor Green
Write-Host "📚 Ver más ejemplos en: API-EJEMPLOS.md" -ForegroundColor Cyan
