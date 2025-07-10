# 🧪 Pruebas DNO-Oracle

Write-Host "🧪 Pruebas DNO-Oracle API" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Cyan

$baseUrl = "http://localhost:8000"

# Verificar servidor
try {
    $test = Test-NetConnection -ComputerName "localhost" -Port 8000 -InformationLevel Quiet
    if (-not $test) {
        Write-Host "❌ Servidor no ejecutándose. Usar: .\start-server.ps1" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Servidor activo" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Función de prueba
function Test-API {
    param([string]$Url, [string]$Desc)
    Write-Host "� $Desc" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri $Url -TimeoutSec 10
        if ($response.success) {
            Write-Host "   ✅ OK" -ForegroundColor Green
            if ($response.meta.connectionUsed) {
                Write-Host "   🔗 Conexión: $($response.meta.connectionUsed)" -ForegroundColor Cyan
            }
        } else {
            Write-Host "   ❌ Error: $($response.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   � Fallo: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Pruebas básicas
Test-API "$baseUrl/api/health" "Health Check"
Test-API "$baseUrl/api/connections" "Conexiones"
Test-API "$baseUrl/api/entities" "Entidades"

# Pruebas de datos
Test-API "$baseUrl/api/proc_cab?limit=3" "proc_cab (conexión por defecto)"
Test-API "$baseUrl/api/proc_cab?connection=desa&limit=3" "proc_cab (conexión desa)"
Test-API "$baseUrl/api/TMP_RENOV_CARGO?connection=prod&limit=3" "TMP_RENOV_CARGO (conexión prod)"

Write-Host ""
Write-Host "� Pruebas completadas" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Cyan
