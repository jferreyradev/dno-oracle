# Script de demostración completa de la API DNO-Oracle para Windows
param(
    [string]$ApiUrl = "http://localhost:8000/api"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Demostración de la API DNO-Oracle" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Función para hacer peticiones con formato
function Invoke-ApiRequest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Data = $null,
        [string]$Description
    )
    
    Write-Host "📡 $Description" -ForegroundColor Yellow
    Write-Host "   $Method $Endpoint" -ForegroundColor Gray
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($Data) {
            Write-Host "   Datos: $Data" -ForegroundColor Gray
            $response = Invoke-RestMethod -Uri "$ApiUrl$Endpoint" -Method $Method -Body $Data -Headers $headers
        } else {
            $response = Invoke-RestMethod -Uri "$ApiUrl$Endpoint" -Method $Method -Headers $headers
        }
        
        Write-Host "   Respuesta:" -ForegroundColor Gray
        $response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor Green
        Write-Host ""
        Start-Sleep 1
        return $response
    } catch {
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        return $null
    }
}

# Verificar que la API esté ejecutándose
Write-Host "🔍 Verificando que la API esté disponible..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-RestMethod -Uri "$ApiUrl/health" -Method GET -TimeoutSec 5
    Write-Host "✅ API disponible" -ForegroundColor Green
} catch {
    Write-Host "❌ La API no está disponible en $ApiUrl" -ForegroundColor Red
    Write-Host "   Ejecuta: .\run.ps1 api" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# 1. Estado de la API
Invoke-ApiRequest -Method "GET" -Endpoint "/health" -Description "Verificar estado de la API"

# 2. Información de la base de datos
Invoke-ApiRequest -Method "GET" -Endpoint "/db/info" -Description "Obtener información de la base de datos"

# 3. Crear un usuario de prueba
$userData = @{
    name = "Usuario Demo"
    email = "demo@example.com"
    role = "user"
} | ConvertTo-Json

$newUser = Invoke-ApiRequest -Method "POST" -Endpoint "/users" -Data $userData -Description "Crear usuario de prueba"

# 4. Listar usuarios
Invoke-ApiRequest -Method "GET" -Endpoint "/users" -Description "Listar todos los usuarios"

# 5. Obtener usuario específico (si se creó correctamente)
if ($newUser -and $newUser.id) {
    Invoke-ApiRequest -Method "GET" -Endpoint "/users/$($newUser.id)" -Description "Obtener usuario específico"
}

# 6. Crear un log de prueba
$logData = @{
    level = "INFO"
    message = "Mensaje de prueba desde script de demostración"
    metadata = @{
        script = "demo-api.ps1"
        timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    }
} | ConvertTo-Json -Depth 3

Invoke-ApiRequest -Method "POST" -Endpoint "/logs" -Data $logData -Description "Crear log de prueba"

# 7. Listar logs recientes
Invoke-ApiRequest -Method "GET" -Endpoint "/logs?limit=5" -Description "Obtener logs recientes"

# 8. Ejecutar consulta personalizada
$queryData = @{
    query = "SELECT SYSDATE as fecha_actual FROM DUAL"
    params = @()
} | ConvertTo-Json

Invoke-ApiRequest -Method "POST" -Endpoint "/query" -Data $queryData -Description "Ejecutar consulta personalizada"

# 9. Obtener estadísticas
Invoke-ApiRequest -Method "GET" -Endpoint "/stats" -Description "Obtener estadísticas del sistema"

Write-Host "🎉 Demostración completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Para más información, consulta:" -ForegroundColor Cyan
Write-Host "   - docs/API.md - Documentación completa de la API" -ForegroundColor Gray
Write-Host "   - docs/postman-collection.json - Colección de Postman" -ForegroundColor Gray
Write-Host "   - examples/ - Más ejemplos de uso" -ForegroundColor Gray
