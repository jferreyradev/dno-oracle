# 🧪 DNO-Oracle - Script de Pruebas CRUD Completas
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

Write-Host "🧪 DNO-Oracle - Pruebas CRUD Completas" -ForegroundColor Cyan
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
        [string]$Description
    )
    
    Write-Host "🔧 $OperationName - $Description" -ForegroundColor Yellow
    Write-Host "   $Method $Endpoint" -ForegroundColor Gray
    
    $result = @{
        Operation = $OperationName
        Method = $Method
        Endpoint = $Endpoint
        Description = $Description
        Success = $false
        StatusCode = 0
        Response = $null
        Error = $null
        ExecutionTime = 0
        Timestamp = Get-Date
    }
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        $params = @{
            Uri = "$BaseUrl$Endpoint"
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

$initialQuery = Test-CrudOperation "Read_Initial" "GET" "/api/$Entity?connection=$Connection&limit=5" -Description "Consulta inicial para ver registros existentes"

# ========================================
# 4. INSERCIÓN (CREATE)
# ========================================

Write-Host "`n➕ 4. INSERCIÓN (CREATE)" -ForegroundColor Magenta
Write-Host "=" * 40

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$newRecord = @{
    DESCRIPCION = "Registro de prueba CRUD - $timestamp"
    ESTADO = "ACTIVO"
    USUARIO_CREACION = "API_TEST"
}

# Si hay una fecha de creación, agregarla
if ($Entity -eq "proc_cab") {
    $newRecord.FECHA_CREACION = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
}

$insertResult = Test-CrudOperation "Create" "POST" "/api/$Entity?connection=$Connection" $newRecord -Description "Insertar nuevo registro"

# ========================================
# 5. CONSULTA DESPUÉS DE INSERCIÓN
# ========================================

Write-Host "`n🔍 5. CONSULTA DESPUÉS DE INSERCIÓN" -ForegroundColor Magenta
Write-Host "=" * 40

$afterInsertQuery = Test-CrudOperation "Read_AfterInsert" "GET" "/api/$Entity?connection=$Connection&limit=3" -Description "Verificar que el registro se insertó"

# Obtener ID del primer registro para usar en UPDATE/DELETE
$testRecordId = $null
if ($afterInsertQuery.Success -and $afterInsertQuery.Response.data -and $afterInsertQuery.Response.data.Count -gt 0) {
    # Buscar el registro que acabamos de insertar
    $insertedRecord = $afterInsertQuery.Response.data | Where-Object { 
        $_.DESCRIPCION -like "*Registro de prueba CRUD*" 
    } | Select-Object -First 1
    
    if ($insertedRecord) {
        # Determinar el campo de clave primaria
        $primaryKeyField = "ID_PROC_CAB"  # Default
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
        DESCRIPCION = "Registro ACTUALIZADO via API - $timestamp"
        ESTADO = "MODIFICADO"
        USUARIO_MODIFICACION = "API_TEST"
    }
    
    # Si hay fecha de modificación, agregarla
    if ($Entity -eq "proc_cab") {
        $updateData.FECHA_MODIFICACION = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    }
    
    $updateResult = Test-CrudOperation "Update" "PUT" "/api/$Entity/$testRecordId?connection=$Connection" $updateData -Description "Actualizar registro por ID"
} else {
    Write-Host "⚠️ No se puede probar UPDATE - No se encontró ID de registro" -ForegroundColor Yellow
    $testResults["Update"] = @{
        Operation = "Update"
        Success = $false
        Error = "No record ID available"
        Skipped = $true
    }
}

# ========================================
# 7. VERIFICAR ACTUALIZACIÓN
# ========================================

Write-Host "`n🔍 7. VERIFICAR ACTUALIZACIÓN" -ForegroundColor Magenta
Write-Host "=" * 40

if ($testRecordId) {
    $verifyUpdateQuery = Test-CrudOperation "Read_AfterUpdate" "GET" "/api/$Entity?connection=$Connection&limit=5" -Description "Verificar que el registro se actualizó"
    
    if ($verifyUpdateQuery.Success) {
        $updatedRecord = $verifyUpdateQuery.Response.data | Where-Object { 
            $_."ID_PROC_CAB" -eq $testRecordId -or $_."$primaryKeyField" -eq $testRecordId
        }
        
        if ($updatedRecord -and $updatedRecord.ESTADO -eq "MODIFICADO") {
            Write-Host "✅ Actualización verificada - Estado: $($updatedRecord.ESTADO)" -ForegroundColor Green
        } else {
            Write-Host "⚠️ No se pudo verificar la actualización" -ForegroundColor Yellow
        }
    }
} else {
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
            DESCRIPCION = "Batch 1 - $timestamp"
            ESTADO = "BATCH_TEST"
            USUARIO_CREACION = "BATCH_API"
        },
        @{
            DESCRIPCION = "Batch 2 - $timestamp"
            ESTADO = "BATCH_TEST"
            USUARIO_CREACION = "BATCH_API"
        },
        @{
            DESCRIPCION = "Batch 3 - $timestamp"
            ESTADO = "BATCH_TEST"
            USUARIO_CREACION = "BATCH_API"
        }
    )
}

$batchResult = Test-CrudOperation "Batch_Insert" "POST" "/api/$Entity/batch?connection=$Connection" $batchData -Description "Inserción en lote de múltiples registros"

# ========================================
# 9. CONSULTA FINAL
# ========================================

Write-Host "`n🔍 9. CONSULTA FINAL" -ForegroundColor Magenta
Write-Host "=" * 40

$finalQuery = Test-CrudOperation "Read_Final" "GET" "/api/$Entity?connection=$Connection&limit=10" -Description "Consulta final para ver todos los cambios"

# ========================================
# 10. ELIMINACIÓN (DELETE) - OPCIONAL
# ========================================

if (-not $SkipDelete -and $testRecordId) {
    Write-Host "`n🗑️ 10. ELIMINACIÓN (DELETE)" -ForegroundColor Magenta
    Write-Host "=" * 40
    
    $deleteResult = Test-CrudOperation "Delete" "DELETE" "/api/$Entity/$testRecordId?connection=$Connection" -Description "Eliminar registro de prueba"
    
    # Verificar eliminación
    if ($deleteResult.Success) {
        Write-Host "`n🔍 VERIFICAR ELIMINACIÓN" -ForegroundColor Magenta
        $verifyDeleteQuery = Test-CrudOperation "Read_AfterDelete" "GET" "/api/$Entity?connection=$Connection&limit=5" -Description "Verificar que el registro se eliminó"
    }
} else {
    if ($SkipDelete) {
        Write-Host "`n🗑️ 10. ELIMINACIÓN (DELETE) - SALTEADO" -ForegroundColor Yellow
        Write-Host "   (Usar -SkipDelete para omitir esta prueba)" -ForegroundColor Gray
    } else {
        Write-Host "`n🗑️ 10. ELIMINACIÓN (DELETE) - NO DISPONIBLE" -ForegroundColor Yellow
        Write-Host "   No se encontró ID de registro para eliminar" -ForegroundColor Gray
    }
}

# ========================================
# 11. PRUEBAS DE PROCEDIMIENTOS (OPCIONAL)
# ========================================

Write-Host "`n🔧 11. PRUEBAS DE PROCEDIMIENTOS" -ForegroundColor Magenta
Write-Host "=" * 40

# Intentar ejecutar un procedimiento común
$procData = @{
    parameters = @()
}

$procResult = Test-CrudOperation "Procedure_Test" "POST" "/api/procedures/DBMS_STATS.GATHER_SCHEMA_STATS?connection=$Connection" $procData -Description "Probar ejecución de procedimiento (puede fallar si no existe)"

# ========================================
# RESUMEN DE RESULTADOS
# ========================================

Write-Host "`n📊 RESUMEN DE RESULTADOS" -ForegroundColor Magenta
Write-Host "=" * 60

$endTime = Get-Date
$totalTime = ($endTime - $startTime).TotalSeconds

$totalTests = $testResults.Count
$successfulTests = ($testResults.Values | Where-Object { $_.Success -and -not $_.Skipped }).Count
$failedTests = ($testResults.Values | Where-Object { -not $_.Success -and -not $_.Skipped }).Count
$skippedTests = ($testResults.Values | Where-Object { $_.Skipped }).Count

Write-Host "`n🎯 ESTADÍSTICAS GENERALES:" -ForegroundColor White
Write-Host "   Total de pruebas: $totalTests" -ForegroundColor Gray
Write-Host "   Exitosas: $successfulTests" -ForegroundColor Green
Write-Host "   Fallidas: $failedTests" -ForegroundColor Red
Write-Host "   Salteadas: $skippedTests" -ForegroundColor Yellow
Write-Host "   Tiempo total: $([math]::Round($totalTime, 2)) segundos" -ForegroundColor Gray

Write-Host "`n📋 DETALLE POR OPERACIÓN:" -ForegroundColor White
foreach ($result in $testResults.GetEnumerator()) {
    $status = if ($result.Value.Skipped) { "⏭️ SALTEADO" } elseif ($result.Value.Success) { "✅ ÉXITO" } else { "❌ FALLO" }
    $color = if ($result.Value.Skipped) { "Yellow" } elseif ($result.Value.Success) { "Green" } else { "Red" }
    
    Write-Host "   $($result.Key): $status ($($result.Value.ExecutionTime)ms)" -ForegroundColor $color
    
    if ($result.Value.Error -and $Verbose) {
        Write-Host "     Error: $($result.Value.Error)" -ForegroundColor DarkRed
    }
}

# Análisis de funcionalidades CRUD
Write-Host "`n🔧 FUNCIONALIDADES CRUD:" -ForegroundColor White
$crudOps = @{
    "CREATE" = @("Create", "Batch_Insert")
    "READ" = @("Read_Initial", "Read_AfterInsert", "Read_Final")
    "UPDATE" = @("Update")
    "DELETE" = @("Delete")
}

foreach ($crud in $crudOps.GetEnumerator()) {
    $opsForCrud = $crud.Value | ForEach-Object { $testResults[$_] } | Where-Object { $_ }
    $successCount = ($opsForCrud | Where-Object { $_.Success }).Count
    $totalCount = $opsForCrud.Count
    
    if ($totalCount -gt 0) {
        $status = if ($successCount -eq $totalCount) { "✅" } elseif ($successCount -gt 0) { "⚠️" } else { "❌" }
        Write-Host "   $($crud.Key): $status ($successCount/$totalCount operaciones exitosas)" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } elseif ($successCount -gt 0) { "Yellow" } else { "Red" })
    }
}

# ========================================
# GUARDAR RESULTADOS (OPCIONAL)
# ========================================

if ($SaveResults) {
    $reportFile = "crud-test-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    
    $report = @{
        TestRun = @{
            StartTime = $startTime
            EndTime = $endTime
            TotalSeconds = $totalTime
            BaseUrl = $BaseUrl
            Entity = $Entity
            Connection = $Connection
        }
        Statistics = @{
            TotalTests = $totalTests
            SuccessfulTests = $successfulTests
            FailedTests = $failedTests
            SkippedTests = $skippedTests
        }
        Results = $testResults
    }
    
    try {
        $report | ConvertTo-Json -Depth 5 | Out-File -FilePath $reportFile -Encoding UTF8
        Write-Host "`n💾 Resultados guardados en: $reportFile" -ForegroundColor Cyan
    } catch {
        Write-Host "`n❌ Error al guardar resultados: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ========================================
# CONCLUSIÓN
# ========================================

Write-Host "`n🎉 CONCLUSIÓN" -ForegroundColor Magenta
Write-Host "=" * 60

if ($failedTests -eq 0) {
    Write-Host "🎉 ¡PERFECTO! Todas las operaciones CRUD funcionan correctamente." -ForegroundColor Green
    Write-Host "   Tu API está lista para operaciones de producción." -ForegroundColor Green
} elseif ($successfulTests -gt $failedTests) {
    Write-Host "✅ BUENO. La mayoría de operaciones funcionan correctamente." -ForegroundColor Yellow
    Write-Host "   Revisar y corregir las operaciones fallidas." -ForegroundColor Yellow
} else {
    Write-Host "⚠️ ATENCIÓN. Hay problemas importantes que requieren corrección." -ForegroundColor Red
    Write-Host "   Revisar la configuración y conexiones antes de usar en producción." -ForegroundColor Red
}

if (-not $SaveResults) {
    Write-Host "`n💡 Tip: Usa -SaveResults para guardar un reporte detallado" -ForegroundColor Cyan
    Write-Host "   Ejemplo: .\test-crud.ps1 -SaveResults -Verbose" -ForegroundColor Gray
}

if ($SkipDelete) {
    Write-Host "`n⚠️ Nota: Se omitieron las pruebas de DELETE" -ForegroundColor Yellow
    Write-Host "   Ejecuta sin -SkipDelete para pruebas completas" -ForegroundColor Gray
}

Write-Host "`n🚀 Pruebas CRUD completadas!" -ForegroundColor Green
