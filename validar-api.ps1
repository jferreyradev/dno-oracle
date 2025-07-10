# 🔍 DNO-Oracle - Validador Completo de API
# Verifica que todos los endpoints funcionen según especificación

param(
    [string]$BaseUrl = "http://localhost:8000",
    [switch]$DetailedReport,
    [string]$ReportFile = "validation-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').html"
)

$ErrorActionPreference = "Continue"
$validationResults = @()
$testCategories = @{
    Sistema = @()
    Entidades = @()
    Paginacion = @()
    Conexiones = @()
    Errores = @()
}

Write-Host "🔍 DNO-Oracle - Validador Completo de API" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host "Iniciando validación..." -ForegroundColor Gray
Write-Host ""

function Test-ApiEndpoint {
    param(
        [string]$Endpoint,
        [string]$Description,
        [string]$Category,
        [hashtable]$ExpectedConditions,
        [int]$ExpectedStatusCode = 200,
        [string]$TestType = "Success"
    )
    
    $url = "$BaseUrl$Endpoint"
    $testResult = @{
        Endpoint = $Endpoint
        Description = $Description
        Category = $Category
        TestType = $TestType
        ExpectedStatusCode = $ExpectedStatusCode
        Success = $false
        ActualStatusCode = 0
        ResponseTime = 0
        Issues = @()
        Response = $null
        Timestamp = Get-Date
    }
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        if ($TestType -eq "Error") {
            # Para casos de error, esperamos que falle de forma controlada
            try {
                $response = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 10
                $testResult.ActualStatusCode = 200
                $testResult.Response = $response
            } catch {
                $statusCode = 0
                if ($_.Exception.Response) {
                    $statusCode = [int]$_.Exception.Response.StatusCode
                }
                $testResult.ActualStatusCode = $statusCode
                
                # Intentar obtener el mensaje de error del cuerpo
                try {
                    $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
                    $testResult.Response = $errorBody
                } catch {
                    $testResult.Response = @{ error = $_.Exception.Message }
                }
            }
        } else {
            $response = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 10
            $testResult.ActualStatusCode = 200
            $testResult.Response = $response
        }
        
        $stopwatch.Stop()
        $testResult.ResponseTime = $stopwatch.ElapsedMilliseconds
        
        # Validar condiciones esperadas
        $allConditionsMet = $true
        
        foreach ($condition in $ExpectedConditions.GetEnumerator()) {
            $conditionMet = $false
            
            switch ($condition.Key) {
                "HasSuccessField" { 
                    $conditionMet = $null -ne $testResult.Response.success
                }
                "SuccessIsTrue" { 
                    $conditionMet = $testResult.Response.success -eq $true
                }
                "SuccessIsFalse" { 
                    $conditionMet = $testResult.Response.success -eq $false
                }
                "HasDataField" { 
                    $conditionMet = $null -ne $testResult.Response.data
                }
                "HasMetadataField" { 
                    $conditionMet = $null -ne $testResult.Response.metadata
                }
                "HasErrorField" { 
                    $conditionMet = $null -ne $testResult.Response.error
                }
                "DataIsArray" { 
                    $conditionMet = $testResult.Response.data -is [Array]
                }
                "DataIsObject" { 
                    $conditionMet = $testResult.Response.data -is [PSCustomObject]
                }
                "HasMinRecords" { 
                    if ($testResult.Response.data -is [Array]) {
                        $conditionMet = $testResult.Response.data.Count -ge $condition.Value
                    }
                }
                "HasMaxRecords" { 
                    if ($testResult.Response.data -is [Array]) {
                        $conditionMet = $testResult.Response.data.Count -le $condition.Value
                    }
                }
                "ResponseTimeLessThan" { 
                    $conditionMet = $testResult.ResponseTime -lt $condition.Value
                }
                "HasConnectionInfo" {
                    $conditionMet = $null -ne $testResult.Response.metadata.connection
                }
                "StatusCodeEquals" {
                    $conditionMet = $testResult.ActualStatusCode -eq $condition.Value
                }
            }
            
            if (-not $conditionMet) {
                $allConditionsMet = $false
                $testResult.Issues += "❌ $($condition.Key): esperado $($condition.Value), actual no cumple"
            }
        }
        
        $testResult.Success = $allConditionsMet -and ($testResult.ActualStatusCode -eq $ExpectedStatusCode)
        
        if ($testResult.Success) {
            Write-Host "✅ $Description" -ForegroundColor Green
        } else {
            Write-Host "❌ $Description" -ForegroundColor Red
            foreach ($issue in $testResult.Issues) {
                Write-Host "   $issue" -ForegroundColor Yellow
            }
        }
        
    } catch {
        $testResult.Issues += "❌ Error de conexión: $($_.Exception.Message)"
        Write-Host "❌ $Description - Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    $validationResults += $testResult
    $testCategories[$Category] += $testResult
    
    return $testResult
}

# ========================================
# VALIDACIONES DE SISTEMA
# ========================================

Write-Host "🔧 VALIDANDO ENDPOINTS DE SISTEMA" -ForegroundColor Magenta
Write-Host "=" * 50

Test-ApiEndpoint "/api/health" "Health Check" "Sistema" @{
    HasSuccessField = $true
    SuccessIsTrue = $true
    ResponseTimeLessThan = 1000
}

Test-ApiEndpoint "/api/info" "Información del Sistema" "Sistema" @{
    HasSuccessField = $true
    SuccessIsTrue = $true
    HasDataField = $true
    DataIsObject = $true
}

Test-ApiEndpoint "/api/connections" "Estado de Conexiones" "Sistema" @{
    HasSuccessField = $true
    SuccessIsTrue = $true
    HasDataField = $true
    DataIsObject = $true
}

Test-ApiEndpoint "/api/entities" "Lista de Entidades" "Sistema" @{
    HasSuccessField = $true
    SuccessIsTrue = $true
    HasDataField = $true
    DataIsObject = $true
}

# ========================================
# VALIDACIONES DE ENTIDADES
# ========================================

Write-Host "`n🗃️ VALIDANDO CONSULTAS DE ENTIDADES" -ForegroundColor Magenta
Write-Host "=" * 50

Test-ApiEndpoint "/api/proc_cab" "Consulta básica proc_cab" "Entidades" @{
    HasSuccessField = $true
    SuccessIsTrue = $true
    HasDataField = $true
    DataIsArray = $true
    HasMetadataField = $true
    HasConnectionInfo = $true
}

Test-ApiEndpoint "/api/tpd_form" "Consulta básica tpd_form" "Entidades" @{
    HasSuccessField = $true
    SuccessIsTrue = $true
    HasDataField = $true
    DataIsArray = $true
    HasMetadataField = $true
    HasConnectionInfo = $true
}

# ========================================
# VALIDACIONES DE PAGINACIÓN
# ========================================

Write-Host "`n📄 VALIDANDO PAGINACIÓN" -ForegroundColor Magenta
Write-Host "=" * 50

Test-ApiEndpoint "/api/proc_cab?limit=3" "Paginación con límite 3" "Paginacion" @{
    HasSuccessField = $true
    SuccessIsTrue = $true
    HasDataField = $true
    DataIsArray = $true
    HasMaxRecords = 3
    HasMetadataField = $true
}

Test-ApiEndpoint "/api/proc_cab?limit=5&offset=2" "Paginación con offset" "Paginacion" @{
    HasSuccessField = $true
    SuccessIsTrue = $true
    HasDataField = $true
    DataIsArray = $true
    HasMaxRecords = 5
    HasMetadataField = $true
}

Test-ApiEndpoint "/api/proc_cab?limit=1" "Límite mínimo (1)" "Paginacion" @{
    HasSuccessField = $true
    SuccessIsTrue = $true
    HasDataField = $true
    DataIsArray = $true
    HasMaxRecords = 1
}

# ========================================
# VALIDACIONES DE CONEXIONES
# ========================================

Write-Host "`n🔌 VALIDANDO SELECCIÓN DE CONEXIÓN" -ForegroundColor Magenta
Write-Host "=" * 50

Test-ApiEndpoint "/api/proc_cab?connection=prod" "Conexión PROD" "Conexiones" @{
    HasSuccessField = $true
    SuccessIsTrue = $true
    HasDataField = $true
    DataIsArray = $true
    HasMetadataField = $true
    HasConnectionInfo = $true
}

Test-ApiEndpoint "/api/proc_cab?connection=desa" "Conexión DESA" "Conexiones" @{
    HasSuccessField = $true
    SuccessIsTrue = $true
    HasDataField = $true
    DataIsArray = $true
    HasMetadataField = $true
    HasConnectionInfo = $true
}

Test-ApiEndpoint "/api/proc_cab?connection=default" "Conexión DEFAULT" "Conexiones" @{
    HasSuccessField = $true
    SuccessIsTrue = $true
    HasDataField = $true
    DataIsArray = $true
    HasMetadataField = $true
    HasConnectionInfo = $true
}

# ========================================
# VALIDACIONES DE ERRORES CONTROLADOS
# ========================================

Write-Host "`n❌ VALIDANDO MANEJO DE ERRORES" -ForegroundColor Magenta
Write-Host "=" * 50

Test-ApiEndpoint "/api/entidad_inexistente" "Entidad inexistente" "Errores" @{
    HasSuccessField = $true
    SuccessIsFalse = $true
    HasErrorField = $true
} -ExpectedStatusCode 404 -TestType "Error"

Test-ApiEndpoint "/api/proc_cab?connection=conexion_inexistente" "Conexión inexistente" "Errores" @{
    HasSuccessField = $true
    SuccessIsFalse = $true
    HasErrorField = $true
} -ExpectedStatusCode 400 -TestType "Error"

Test-ApiEndpoint "/api/proc_cab?limit=abc" "Parámetro limit inválido" "Errores" @{
    HasSuccessField = $true
    SuccessIsFalse = $true
    HasErrorField = $true
} -ExpectedStatusCode 400 -TestType "Error"

Test-ApiEndpoint "/api/proc_cab?offset=-5" "Parámetro offset negativo" "Errores" @{
    HasSuccessField = $true
    SuccessIsFalse = $true
    HasErrorField = $true
} -ExpectedStatusCode 400 -TestType "Error"

# ========================================
# GENERAR REPORTE
# ========================================

Write-Host "`n📊 GENERANDO REPORTE FINAL" -ForegroundColor Magenta
Write-Host "=" * 50

$totalTests = $validationResults.Count
$successfulTests = ($validationResults | Where-Object { $_.Success }).Count
$failedTests = $totalTests - $successfulTests
$successRate = [math]::Round(($successfulTests / $totalTests) * 100, 2)

Write-Host "`nRESUMEN GENERAL:" -ForegroundColor White
Write-Host "Total de pruebas: $totalTests" -ForegroundColor White
Write-Host "Exitosas: $successfulTests" -ForegroundColor Green
Write-Host "Fallidas: $failedTests" -ForegroundColor Red
Write-Host "Tasa de éxito: $successRate%" -ForegroundColor $(if ($successRate -ge 90) { "Green" } elseif ($successRate -ge 70) { "Yellow" } else { "Red" })

Write-Host "`nPOR CATEGORÍA:" -ForegroundColor White
foreach ($category in $testCategories.GetEnumerator()) {
    if ($category.Value.Count -gt 0) {
        $categorySuccess = ($category.Value | Where-Object { $_.Success }).Count
        $categoryTotal = $category.Value.Count
        $categoryRate = [math]::Round(($categorySuccess / $categoryTotal) * 100, 2)
        Write-Host "  $($category.Key): $categorySuccess/$categoryTotal ($categoryRate%)" -ForegroundColor $(if ($categoryRate -ge 90) { "Green" } elseif ($categoryRate -ge 70) { "Yellow" } else { "Red" })
    }
}

# Mostrar pruebas fallidas
$failedValidations = $validationResults | Where-Object { -not $_.Success }
if ($failedValidations.Count -gt 0) {
    Write-Host "`n❌ PRUEBAS FALLIDAS:" -ForegroundColor Red
    foreach ($failed in $failedValidations) {
        Write-Host "  • $($failed.Description)" -ForegroundColor Yellow
        foreach ($issue in $failed.Issues) {
            Write-Host "    $issue" -ForegroundColor Gray
        }
    }
}

# Estadísticas de rendimiento
$avgResponseTime = [math]::Round(($validationResults | Measure-Object ResponseTime -Average).Average, 2)
$maxResponseTime = ($validationResults | Measure-Object ResponseTime -Maximum).Maximum
Write-Host "`n⏱️ RENDIMIENTO:" -ForegroundColor White
Write-Host "  Tiempo promedio de respuesta: $avgResponseTime ms" -ForegroundColor Gray
Write-Host "  Tiempo máximo de respuesta: $maxResponseTime ms" -ForegroundColor Gray

# ========================================
# GENERAR REPORTE HTML (OPCIONAL)
# ========================================

if ($DetailedReport) {
    Write-Host "`n📄 Generando reporte HTML detallado..." -ForegroundColor Yellow
    
    $htmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>DNO-Oracle API - Reporte de Validación</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #ecf0f1; padding: 15px; border-radius: 6px; text-align: center; }
        .success { color: #27ae60; }
        .warning { color: #f39c12; }
        .error { color: #e74c3c; }
        .category { margin-bottom: 30px; }
        .category h3 { color: #2c3e50; border-bottom: 1px solid #bdc3c7; padding-bottom: 10px; }
        .test-item { margin: 10px 0; padding: 15px; border-radius: 4px; border-left: 4px solid #95a5a6; background: #f8f9fa; }
        .test-success { border-left-color: #27ae60; }
        .test-failure { border-left-color: #e74c3c; }
        .test-details { margin-top: 10px; font-size: 0.9em; color: #7f8c8d; }
        .issues { margin-top: 5px; }
        .issue { color: #e74c3c; font-size: 0.85em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 DNO-Oracle API - Reporte de Validación</h1>
            <p>Generado el: $(Get-Date -Format "dd/MM/yyyy HH:mm:ss")</p>
            <p>Base URL: $BaseUrl</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Total de Pruebas</h3>
                <div style="font-size: 2em; font-weight: bold;">$totalTests</div>
            </div>
            <div class="summary-card">
                <h3>Exitosas</h3>
                <div style="font-size: 2em; font-weight: bold;" class="success">$successfulTests</div>
            </div>
            <div class="summary-card">
                <h3>Fallidas</h3>
                <div style="font-size: 2em; font-weight: bold;" class="error">$failedTests</div>
            </div>
            <div class="summary-card">
                <h3>Tasa de Éxito</h3>
                <div style="font-size: 2em; font-weight: bold;" class="$(if ($successRate -ge 90) { "success" } elseif ($successRate -ge 70) { "warning" } else { "error" })">$successRate%</div>
            </div>
        </div>
"@

    foreach ($category in $testCategories.GetEnumerator()) {
        if ($category.Value.Count -gt 0) {
            $htmlContent += "<div class='category'><h3>$($category.Key)</h3>"
            
            foreach ($test in $category.Value) {
                $statusClass = if ($test.Success) { "test-success" } else { "test-failure" }
                $statusIcon = if ($test.Success) { "✅" } else { "❌" }
                
                $htmlContent += @"
                <div class="test-item $statusClass">
                    <strong>$statusIcon $($test.Description)</strong>
                    <div class="test-details">
                        <strong>Endpoint:</strong> $($test.Endpoint)<br>
                        <strong>Tiempo de respuesta:</strong> $($test.ResponseTime) ms<br>
                        <strong>Código de estado:</strong> $($test.ActualStatusCode)
"@
                
                if ($test.Issues.Count -gt 0) {
                    $htmlContent += "<div class='issues'><strong>Problemas encontrados:</strong><br>"
                    foreach ($issue in $test.Issues) {
                        $htmlContent += "<div class='issue'>• $issue</div>"
                    }
                    $htmlContent += "</div>"
                }
                
                $htmlContent += "</div></div>"
            }
            
            $htmlContent += "</div>"
        }
    }

    $htmlContent += @"
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bdc3c7; text-align: center; color: #7f8c8d;">
            <p>Reporte generado por DNO-Oracle API Validator</p>
        </div>
    </div>
</body>
</html>
"@

    try {
        $htmlContent | Out-File -FilePath $ReportFile -Encoding UTF8
        Write-Host "✅ Reporte HTML guardado en: $ReportFile" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error al guardar reporte HTML: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ========================================
# CONCLUSIÓN
# ========================================

Write-Host "`n🎯 CONCLUSIÓN" -ForegroundColor Magenta
Write-Host "=" * 50

if ($successRate -ge 95) {
    Write-Host "🎉 ¡EXCELENTE! La API está funcionando perfectamente." -ForegroundColor Green
    Write-Host "   El sistema está listo para producción." -ForegroundColor Green
} elseif ($successRate -ge 80) {
    Write-Host "✅ BUENO. La API funciona correctamente con algunas observaciones menores." -ForegroundColor Yellow
    Write-Host "   Revisar las pruebas fallidas para optimización." -ForegroundColor Yellow
} else {
    Write-Host "⚠️ ATENCIÓN. Hay problemas importantes que requieren corrección." -ForegroundColor Red
    Write-Host "   Revisar y corregir las pruebas fallidas antes de usar en producción." -ForegroundColor Red
}

if (-not $DetailedReport) {
    Write-Host "`n💡 Tip: Usa -DetailedReport para generar un reporte HTML completo" -ForegroundColor Cyan
    Write-Host "   Ejemplo: .\validar-api.ps1 -DetailedReport" -ForegroundColor Gray
}

Write-Host "`n🚀 Validación completada!" -ForegroundColor Green
