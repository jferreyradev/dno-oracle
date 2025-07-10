# 📡 DNO-Oracle - Generador de Ejemplos API Completos
# Ejecuta todas las peticiones soportadas y muestra las respuestas reales

param(
    [string]$BaseUrl = "http://localhost:8000",
    [switch]$Verbose,
    [switch]$SaveToFile,
    [string]$OutputFile = "ejemplos-api-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
)

$ErrorActionPreference = "Continue"
$results = @{}

Write-Host "🚀 DNO-Oracle - Generador Completo de Ejemplos API" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host "Fecha: $(Get-Date)" -ForegroundColor Gray
Write-Host ""

function Invoke-ApiRequest {
    param(
        [string]$Endpoint,
        [string]$Description,
        [string]$Category = "General"
    )
    
    $url = "$BaseUrl$Endpoint"
    Write-Host "[$Category] $Description" -ForegroundColor Yellow
    Write-Host "GET $Endpoint" -ForegroundColor Gray
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 10
        
        if ($Verbose) {
            Write-Host ($response | ConvertTo-Json -Depth 3) -ForegroundColor Green
        } else {
            if ($response.success) {
                Write-Host "✅ Éxito" -ForegroundColor Green
                if ($response.metadata) {
                    Write-Host "   Registros: $($response.metadata.totalRecords), Tiempo: $($response.metadata.queryTime)" -ForegroundColor DarkGreen
                }
                if ($response.data -and $response.data.count) {
                    Write-Host "   Elementos: $($response.data.count)" -ForegroundColor DarkGreen
                }
            } else {
                Write-Host "⚠️ Respuesta con error controlado" -ForegroundColor Yellow
            }
        }
        
        $results[$Endpoint] = @{
            Description = $Description
            Category = $Category
            Success = $true
            Response = $response
            Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
        }
        
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        $results[$Endpoint] = @{
            Description = $Description
            Category = $Category
            Success = $false
            Error = $_.Exception.Message
            Timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
        }
    }
    
    Write-Host ""
}

# ========================================
# 1. ENDPOINTS DEL SISTEMA
# ========================================

Write-Host "🔧 ENDPOINTS DEL SISTEMA" -ForegroundColor Magenta
Write-Host "=" * 50

Invoke-ApiRequest "/api/health" "Health Check - Verificar que la API funciona" "Sistema"
Invoke-ApiRequest "/api/info" "Información del Sistema - Metadatos y capacidades" "Sistema"
Invoke-ApiRequest "/api/connections" "Estado de Conexiones - Pools Oracle activos" "Sistema"
Invoke-ApiRequest "/api/entities" "Lista de Entidades - Configuración disponible" "Sistema"

# ========================================
# 2. CONSULTAS BÁSICAS DE ENTIDADES
# ========================================

Write-Host "🗃️ CONSULTAS BÁSICAS DE ENTIDADES" -ForegroundColor Magenta
Write-Host "=" * 50

Invoke-ApiRequest "/api/proc_cab" "Consulta básica - proc_cab (conexión por defecto)" "Entidades"
Invoke-ApiRequest "/api/tpd_form" "Consulta básica - tpd_form (conexión por defecto)" "Entidades"

# ========================================
# 3. PAGINACIÓN
# ========================================

Write-Host "📄 EJEMPLOS DE PAGINACIÓN" -ForegroundColor Magenta
Write-Host "=" * 50

Invoke-ApiRequest "/api/proc_cab?limit=3" "Paginación - Primeros 3 registros" "Paginación"
Invoke-ApiRequest "/api/proc_cab?limit=5&offset=0" "Paginación - Página 1 (5 registros)" "Paginación"
Invoke-ApiRequest "/api/proc_cab?limit=5&offset=5" "Paginación - Página 2 (registros 6-10)" "Paginación"
Invoke-ApiRequest "/api/tpd_form?limit=2" "Paginación - Primeros 2 registros de tpd_form" "Paginación"

# ========================================
# 4. SELECCIÓN DE CONEXIÓN
# ========================================

Write-Host "🔌 SELECCIÓN DE CONEXIÓN" -ForegroundColor Magenta
Write-Host "=" * 50

Invoke-ApiRequest "/api/proc_cab?connection=prod" "Conexión específica - proc_cab en PRODUCCIÓN" "Conexiones"
Invoke-ApiRequest "/api/proc_cab?connection=desa" "Conexión específica - proc_cab en DESARROLLO" "Conexiones"
Invoke-ApiRequest "/api/proc_cab?connection=default" "Conexión específica - proc_cab en DEFAULT" "Conexiones"

Invoke-ApiRequest "/api/tpd_form?connection=prod" "Conexión específica - tpd_form en PRODUCCIÓN" "Conexiones"
Invoke-ApiRequest "/api/tpd_form?connection=desa" "Conexión específica - tpd_form en DESARROLLO" "Conexiones"

# ========================================
# 5. COMBINACIÓN DE PARÁMETROS
# ========================================

Write-Host "🔧 COMBINACIÓN DE PARÁMETROS" -ForegroundColor Magenta
Write-Host "=" * 50

Invoke-ApiRequest "/api/proc_cab?connection=prod&limit=3" "Combinado - PROD + límite 3" "Combinaciones"
Invoke-ApiRequest "/api/proc_cab?connection=desa&limit=2&offset=1" "Combinado - DESA + paginación" "Combinaciones"
Invoke-ApiRequest "/api/tpd_form?connection=prod&limit=5&offset=0" "Combinado - tpd_form PROD + página 1" "Combinaciones"

# ========================================
# 6. CASOS DE ERROR (CONTROLADOS)
# ========================================

Write-Host "❌ CASOS DE ERROR CONTROLADOS" -ForegroundColor Magenta
Write-Host "=" * 50

Invoke-ApiRequest "/api/entidad_inexistente" "Error - Entidad que no existe" "Errores"
Invoke-ApiRequest "/api/proc_cab?connection=conexion_inexistente" "Error - Conexión no permitida" "Errores" 
Invoke-ApiRequest "/api/proc_cab?limit=abc" "Error - Parámetro limit inválido" "Errores"
Invoke-ApiRequest "/api/proc_cab?offset=-5" "Error - Parámetro offset negativo" "Errores"
Invoke-ApiRequest "/api/proc_cab?limit=2000" "Error - Limit excede máximo permitido" "Errores"

# ========================================
# 7. CASOS EXTREMOS
# ========================================

Write-Host "🎯 CASOS EXTREMOS Y LÍMITES" -ForegroundColor Magenta
Write-Host "=" * 50

Invoke-ApiRequest "/api/proc_cab?limit=1" "Límite mínimo - 1 registro" "Límites"
Invoke-ApiRequest "/api/proc_cab?limit=1000" "Límite máximo - 1000 registros" "Límites"
Invoke-ApiRequest "/api/proc_cab?offset=999999" "Offset muy alto - Sin resultados esperados" "Límites"

# ========================================
# RESUMEN Y ESTADÍSTICAS
# ========================================

Write-Host "📊 RESUMEN DE EJECUCIÓN" -ForegroundColor Magenta
Write-Host "=" * 50

$totalRequests = $results.Count
$successfulRequests = ($results.Values | Where-Object { $_.Success }).Count
$failedRequests = $totalRequests - $successfulRequests

Write-Host "Total de peticiones: $totalRequests" -ForegroundColor White
Write-Host "Exitosas: $successfulRequests" -ForegroundColor Green
Write-Host "Con errores: $failedRequests" -ForegroundColor Red

# Estadísticas por categoría
$categories = $results.Values | Group-Object Category
Write-Host "`nPor categoría:" -ForegroundColor White
foreach ($category in $categories) {
    $categorySuccess = ($category.Group | Where-Object { $_.Success }).Count
    $categoryTotal = $category.Count
    Write-Host "  $($category.Name): $categorySuccess/$categoryTotal exitosas" -ForegroundColor Gray
}

# ========================================
# GUARDAR RESULTADOS
# ========================================

if ($SaveToFile) {
    Write-Host "`n💾 Guardando resultados en: $OutputFile" -ForegroundColor Yellow
    
    $exportData = @{
        Metadata = @{
            GeneratedAt = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
            BaseUrl = $BaseUrl
            TotalRequests = $totalRequests
            SuccessfulRequests = $successfulRequests
            FailedRequests = $failedRequests
            Categories = ($categories | ForEach-Object { 
                @{
                    Name = $_.Name
                    Total = $_.Count
                    Successful = ($_.Group | Where-Object { $_.Success }).Count
                }
            })
        }
        Results = $results
    }
    
    try {
        $exportData | ConvertTo-Json -Depth 5 | Out-File -FilePath $OutputFile -Encoding UTF8
        Write-Host "✅ Archivo guardado exitosamente" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error al guardar archivo: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ========================================
# INSTRUCCIONES FINALES
# ========================================

Write-Host "`n🎯 PRÓXIMOS PASOS" -ForegroundColor Magenta
Write-Host "=" * 50
Write-Host "1. Revisar que todas las peticiones exitosas devuelvan datos esperados" -ForegroundColor White
Write-Host "2. Verificar que los errores controlados se manejen correctamente" -ForegroundColor White
Write-Host "3. Probar con datos reales en cada conexión (prod/desa)" -ForegroundColor White
Write-Host "4. Validar rendimiento con límites altos (limit=1000)" -ForegroundColor White

if (-not $SaveToFile) {
    Write-Host "`n💡 Tip: Usa -SaveToFile para guardar todos los resultados en JSON" -ForegroundColor Cyan
    Write-Host "   Ejemplo: .\ejemplos-completos.ps1 -SaveToFile -Verbose" -ForegroundColor Gray
}

if (-not $Verbose) {
    Write-Host "`n💡 Tip: Usa -Verbose para ver las respuestas JSON completas" -ForegroundColor Cyan
    Write-Host "   Ejemplo: .\ejemplos-completos.ps1 -Verbose" -ForegroundColor Gray
}

Write-Host "`n🚀 ¡Sistema DNO-Oracle completamente probado!" -ForegroundColor Green
