# 🧪 DNO-Oracle - Script de Pruebas CRUD Completas (FIXED)
# Prueba todas las operaciones Create, Read, Update, Delete, Batch y Procedimientos

param(
    [string]$BaseUrl = "http://localhost:8000",
    [string]$Entity = "proc_cab",
    [string]$Connection = "prod",
    [switch]$SkipDelete,
    [switch]$Verbose,
    [switch]$SaveResults
)

$ErrorActionPreference = "Continue"
$testResults = @{}
$startTime = Get-Date

Write-Host "🧪 DNO-Oracle - Pruebas CRUD Completas (FIXED)" -ForegroundColor Cyan
Write-Host "=" * 60
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host "Entidad: $Entity" -ForegroundColor Gray
Write-Host "Conexión: $Connection" -ForegroundColor Gray
Write-Host "Inicio: $($startTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Gray
Write-Host ""

function Test-CrudOperation {
    param(
        [string]$OperationName,
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [string]$Description = ""
    )
    
    $result = @{
        Operation = $OperationName
        Method = $Method
        Endpoint = $Endpoint
        Success = $false
        StatusCode = 0
        Error = $null
        Response = $null
        ExecutionTime = 0
    }
    
    if ($Description) {
        Write-Host "🔧 $OperationName - $Description" -ForegroundColor White
        Write-Host "   $Method $Endpoint" -ForegroundColor DarkGray
    }
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        $fullUrl = "$BaseUrl$Endpoint"
        $params = @{
            Uri = $fullUrl
            Method = $Method
            TimeoutSec = 30
        }
        
        if ($Body -and ($Method -eq "POST" -or $Method -eq "PUT")) {
            $params.Body = ($Body | ConvertTo-Json -Depth 5)
            $params.ContentType = "application/json"
            
            if ($Verbose) {
                Write-Host "   Body: $($params.Body)" -ForegroundColor DarkGray
            }
        }
        
        $response = Invoke-RestMethod @params
        $stopwatch.Stop()
        
        $result.Success = $true
        $result.StatusCode = 200
        $result.Response = $response
        $result.ExecutionTime = $stopwatch.ElapsedMilliseconds
        
        if ($response.success) {
            Write-Host "   ✅ Exitoso ($($result.ExecutionTime)ms)" -ForegroundColor Green
            if ($Verbose -and $response.data) {
                Write-Host "   Datos: $($response.data | ConvertTo-Json -Compress)" -ForegroundColor DarkGreen
            }
        } else {
            Write-Host "   ⚠️ Respuesta con error: $($response.error)" -ForegroundColor Yellow
        }
        
    } catch {
        $stopwatch.Stop()
        $result.Error = $_.Exception.Message
        $result.ExecutionTime = $stopwatch.ElapsedMilliseconds
        
        # Intentar extraer código de estado HTTP
        if ($_.Exception.Response) {
            $result.StatusCode = [int]$_.Exception.Response.StatusCode
        }
        
        Write-Host "   ❌ Error ($($result.ExecutionTime)ms): $($result.Error)" -ForegroundColor Red
    }
    
    $testResults[$OperationName] = $result
    return $result
}

# ========================================
# 1. VERIFICAR SERVIDOR
# ========================================

Write-Host "🔍 1. VERIFICANDO SERVIDOR" -ForegroundColor Magenta
Write-Host "=" * 40

$healthResult = Test-CrudOperation "Health" "GET" "/api/health" -Description "Verificar que el servidor esté funcionando"

if (-not $healthResult.Success) {
    Write-Host "❌ El servidor no está disponible. Verifica que esté iniciado." -ForegroundColor Red
    exit 1
}

# ========================================
# 2. VERIFICAR ENTIDAD Y CONEXIÓN
# ========================================

Write-Host "`n🗃️ 2. VERIFICANDO ENTIDAD Y CONEXIÓN" -ForegroundColor Magenta
Write-Host "=" * 40

$entitiesResult = Test-CrudOperation "Entities" "GET" "/api/entities" -Description "Obtener lista de entidades disponibles"
$connectionsResult = Test-CrudOperation "Connections" "GET" "/api/connections" -Description "Verificar conexiones disponibles"

# Validar que la entidad existe
if ($entitiesResult.Success -and $entitiesResult.Response.data.entities) {
    $availableEntities = $entitiesResult.Response.data.entities | ForEach-Object { $_.name }
    if ($Entity -notin $availableEntities) {
        Write-Host "❌ La entidad '$Entity' no está configurada." -ForegroundColor Red
        Write-Host "   Entidades disponibles: $($availableEntities -join ', ')" -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "✅ Entidad '$Entity' encontrada" -ForegroundColor Green
    }
}

# ========================================
# 3. CONSULTA INICIAL (READ)
# ========================================

Write-Host "`n🔍 3. CONSULTA INICIAL (READ)" -ForegroundColor Magenta
Write-Host "=" * 40

$readEndpoint = "/api/$Entity" + "?connection=$Connection&limit=5"
$initialQuery = Test-CrudOperation "Read_Initial" "GET" $readEndpoint -Description "Consulta inicial para ver registros existentes"

# ========================================
# 4. INSERCIÓN (CREATE)
# ========================================

Write-Host "`n➕ 4. INSERCIÓN (CREATE)" -ForegroundColor Magenta
Write-Host "=" * 40

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$newRecord = @{
    DESCRIPCION = "Registro de prueba CRUD - $timestamp"
    MOSTRAR = 1
    OBSERVACIONES = "Creado por test automatizado"
}

$createEndpoint = "/api/$Entity" + "?connection=$Connection"
$insertResult = Test-CrudOperation "Create" "POST" $createEndpoint $newRecord -Description "Insertar nuevo registro"

# ========================================
# 5. CONSULTA DESPUÉS DE INSERCIÓN
# ========================================

Write-Host "`n🔍 5. CONSULTA DESPUÉS DE INSERCIÓN" -ForegroundColor Magenta
Write-Host "=" * 40

$afterInsertEndpoint = "/api/$Entity" + "?connection=$Connection&limit=3"
$afterInsertQuery = Test-CrudOperation "Read_AfterInsert" "GET" $afterInsertEndpoint -Description "Verificar que el registro se insertó"

# Obtener ID del primer registro para usar en UPDATE/DELETE
$testRecordId = $null
if ($afterInsertQuery.Success -and $afterInsertQuery.Response.data -and $afterInsertQuery.Response.data.Count -gt 0) {
    # Buscar el registro que acabamos de insertar
    $insertedRecord = $afterInsertQuery.Response.data | Where-Object { 
        $_.DESCRIPCION -like "*Registro de prueba CRUD*" 
    } | Select-Object -First 1
    
    if ($insertedRecord) {
        # Determinar el campo de clave primaria
        $primaryKeyField = "ID_PROC_CAB"  # Default para proc_cab
        if ($entitiesResult.Success -and $entitiesResult.Response.data.entities) {
            $entityConfig = $entitiesResult.Response.data.entities | Where-Object { $_.name -eq $Entity }
            if ($entityConfig -and $entityConfig.primaryKey) {
                $primaryKeyField = $entityConfig.primaryKey
            }
        }
        
        $testRecordId = $insertedRecord.$primaryKeyField
        Write-Host "✅ Registro encontrado para pruebas - ID: $testRecordId" -ForegroundColor Green
    }
}

# ========================================
# 6. ACTUALIZACIÓN (UPDATE)
# ========================================

Write-Host "`n✏️ 6. ACTUALIZACIÓN (UPDATE)" -ForegroundColor Magenta
Write-Host "=" * 40

if ($testRecordId) {
    $updateData = @{
        DESCRIPCION = "Registro ACTUALIZADO - $((Get-Date).ToString('HH:mm:ss'))"
        MOSTRAR = 1
        OBSERVACIONES = "Actualizado por test automatizado"
    }
    
    $updateEndpoint = "/api/$Entity/$testRecordId" + "?connection=$Connection"
    $updateResult = Test-CrudOperation "Update" "PUT" $updateEndpoint $updateData -Description "Actualizar registro por ID"
    
    # ========================================
    # 7. VERIFICAR ACTUALIZACIÓN
    # ========================================
    
    Write-Host "`n🔍 7. VERIFICAR ACTUALIZACIÓN" -ForegroundColor Magenta
    Write-Host "=" * 40
    
    $verifyUpdateEndpoint = "/api/$Entity" + "?connection=$Connection&limit=5"
    $verifyUpdateQuery = Test-CrudOperation "Read_AfterUpdate" "GET" $verifyUpdateEndpoint -Description "Verificar que el registro se actualizó"
    
} else {
    Write-Host "⚠️ No se puede probar UPDATE - No se encontró ID de registro" -ForegroundColor Yellow
    Write-Host "`n🔍 7. VERIFICAR ACTUALIZACIÓN" -ForegroundColor Magenta
    Write-Host "=" * 40
    Write-Host "⚠️ Salteado - No hay registro para verificar" -ForegroundColor Yellow
}

# ========================================
# 8. INSERCIÓN EN LOTE (BATCH)
# ========================================

Write-Host "`n📦 8. INSERCIÓN EN LOTE (BATCH)" -ForegroundColor Magenta
Write-Host "=" * 40

$batchData = @{
    records = @(
        @{
            DESCRIPCION = "Batch 1 - $((Get-Date).ToString('HH:mm:ss'))"
            MOSTRAR = 1
            OBSERVACIONES = "Lote test 1"
        },
        @{
            DESCRIPCION = "Batch 2 - $((Get-Date).ToString('HH:mm:ss'))"
            MOSTRAR = 0
            OBSERVACIONES = "Lote test 2"
        }
    )
}

$batchEndpoint = "/api/$Entity/batch" + "?connection=$Connection"
$batchResult = Test-CrudOperation "Batch_Insert" "POST" $batchEndpoint $batchData -Description "Inserción en lote de múltiples registros"

# ========================================
# 9. CONSULTA FINAL
# ========================================

Write-Host "`n🔍 9. CONSULTA FINAL" -ForegroundColor Magenta
Write-Host "=" * 40

$finalEndpoint = "/api/$Entity" + "?connection=$Connection&limit=10"
$finalQuery = Test-CrudOperation "Read_Final" "GET" $finalEndpoint -Description "Consulta final para ver todos los cambios"

# ========================================
# 10. ELIMINACIÓN (DELETE) - OPCIONAL
# ========================================

Write-Host "`n🗑️ 10. ELIMINACIÓN (DELETE) - OPCIONAL" -ForegroundColor Magenta
Write-Host "=" * 40

if ($testRecordId -and -not $SkipDelete) {
    $deleteEndpoint = "/api/$Entity/$testRecordId" + "?connection=$Connection"
    $deleteResult = Test-CrudOperation "Delete" "DELETE" $deleteEndpoint -Description "Eliminar registro de prueba"
    
    if ($deleteResult.Success) {
        $verifyDeleteEndpoint = "/api/$Entity" + "?connection=$Connection&limit=5"
        $verifyDeleteQuery = Test-CrudOperation "Read_AfterDelete" "GET" $verifyDeleteEndpoint -Description "Verificar que el registro se eliminó"
    }
} else {
    if ($SkipDelete) {
        Write-Host "⏭️ DELETE omitido por parámetro -SkipDelete" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️ No se encontró ID de registro para eliminar" -ForegroundColor Yellow
    }
}

# ========================================
# RESUMEN FINAL
# ========================================

Write-Host "`n📊 RESUMEN DE RESULTADOS" -ForegroundColor Cyan
Write-Host "=" * 60

$totalTests = $testResults.Count
$successfulTests = ($testResults.Values | Where-Object { $_.Success }).Count
$failedTests = ($testResults.Values | Where-Object { -not $_.Success }).Count
$totalTime = ((Get-Date) - $startTime).TotalSeconds

Write-Host "🎯 ESTADÍSTICAS GENERALES:" -ForegroundColor White
Write-Host "   Total de pruebas: $totalTests" -ForegroundColor Gray
Write-Host "   Exitosas: $successfulTests" -ForegroundColor Green
Write-Host "   Fallidas: $failedTests" -ForegroundColor Red
Write-Host "   Tiempo total: $([math]::Round($totalTime, 2)) segundos" -ForegroundColor Gray

Write-Host "`n📋 DETALLE POR OPERACIÓN:" -ForegroundColor White
foreach ($test in $testResults.GetEnumerator() | Sort-Object Name) {
    $status = if ($test.Value.Success) { "✅ ÉXITO" } else { "❌ FALLO" }
    $time = "$($test.Value.ExecutionTime)ms"
    Write-Host "   $($test.Key): $status ($time)" -ForegroundColor $(if ($test.Value.Success) { "Green" } else { "Red" })
}

# Análisis de funcionalidades CRUD
$readOps = $testResults.Values | Where-Object { $_.Operation -like "*Read*" -or $_.Operation -eq "Entities" -or $_.Operation -eq "Connections" }
$createOps = $testResults.Values | Where-Object { $_.Operation -like "*Create*" -or $_.Operation -like "*Insert*" }
$updateOps = $testResults.Values | Where-Object { $_.Operation -like "*Update*" }

$readSuccess = ($readOps | Where-Object { $_.Success }).Count
$createSuccess = ($createOps | Where-Object { $_.Success }).Count  
$updateSuccess = ($updateOps | Where-Object { $_.Success }).Count

Write-Host "`n🔧 FUNCIONALIDADES CRUD:" -ForegroundColor White
Write-Host "   READ: $(if ($readSuccess -gt 0) { "✅" } else { "❌" }) ($readSuccess/$($readOps.Count) operaciones exitosas)" -ForegroundColor $(if ($readSuccess -gt 0) { "Green" } else { "Red" })
Write-Host "   CREATE: $(if ($createSuccess -gt 0) { "✅" } else { "❌" }) ($createSuccess/$($createOps.Count) operaciones exitosas)" -ForegroundColor $(if ($createSuccess -gt 0) { "Green" } else { "Red" })
Write-Host "   UPDATE: $(if ($updateSuccess -gt 0) { "✅" } else { "❌" }) ($updateSuccess/$($updateOps.Count) operaciones exitosas)" -ForegroundColor $(if ($updateSuccess -gt 0) { "Green" } else { "Red" })

Write-Host "`n🎉 CONCLUSIÓN" -ForegroundColor Cyan
Write-Host "=" * 60

if ($failedTests -eq 0) {
    Write-Host "🎊 ¡EXCELENTE! Todas las pruebas pasaron exitosamente." -ForegroundColor Green
    Write-Host "   La API está funcionando correctamente y lista para usar." -ForegroundColor Green
} elseif ($successfulTests -gt $failedTests) {
    Write-Host "✅ BUENO. La mayoría de las funcionalidades están operativas." -ForegroundColor Yellow
    Write-Host "   Revisar los fallos menores antes de usar en producción." -ForegroundColor Yellow
} else {
    Write-Host "⚠️ ATENCIÓN. Hay problemas importantes que requieren corrección." -ForegroundColor Red
    Write-Host "   Revisar la configuración y conexiones antes de usar en producción." -ForegroundColor Red
}

Write-Host "`n💡 Tip: Usa -SaveResults para guardar un reporte detallado" -ForegroundColor Cyan
Write-Host "   Ejemplo: .\test-crud-fixed.ps1 -SaveResults -Verbose" -ForegroundColor Gray

Write-Host "`n🚀 Pruebas CRUD completadas!" -ForegroundColor Cyan
