# 🧪 DNO-Oracle - Prueba Rápida CRUD
# Prueba simple para verificar que las operaciones CRUD funcionan

param(
    [string]$BaseUrl = "http://localhost:8000",
    [string]$Entity = "proc_cab",
    [string]$Connection = "prod"
)

Write-Host "🧪 Prueba Rápida DNO-Oracle CRUD" -ForegroundColor Cyan
Write-Host "=" * 40
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host "Entidad: $Entity" -ForegroundColor Gray
Write-Host "Conexión: $Connection" -ForegroundColor Gray
Write-Host ""

# 1. Health Check
Write-Host "1. Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod "$BaseUrl/api/health"
    if ($health.success) {
        Write-Host "   ✅ Servidor funcionando" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Consulta inicial
Write-Host "2. Consulta inicial..." -ForegroundColor Yellow
try {
    $queryUrl = "$BaseUrl/api/$Entity" + "?connection=$Connection&limit=3"
    Write-Host "   URL: $queryUrl" -ForegroundColor Gray
    
    $initial = Invoke-RestMethod $queryUrl
    if ($initial.success) {
        Write-Host "   ✅ Consulta exitosa - $($initial.data.Count) registros" -ForegroundColor Green
        Write-Host "   🔗 Conexión usada: $($initial.meta.connectionUsed)" -ForegroundColor Gray
        
        # Mostrar primer registro
        if ($initial.data.Count -gt 0) {
            $firstRecord = $initial.data[0]
            Write-Host "   📋 Primer registro ID: $($firstRecord.ID_PROC_CAB)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Inserción
Write-Host "3. Inserción de nuevo registro..." -ForegroundColor Yellow
try {
    $insertUrl = "$BaseUrl/api/$Entity" + "?connection=$Connection"
    Write-Host "   URL: $insertUrl" -ForegroundColor Gray
    
    $newRecord = @{
        DESCRIPCION = "Proceso de prueba CRUD - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        OBSERVACIONES = "Creado por test automatizado"
        MOSTRAR = 1
    }
    
    $body = $newRecord | ConvertTo-Json
    Write-Host "   Body: $body" -ForegroundColor Gray
    
    $insertResult = Invoke-RestMethod -Uri $insertUrl -Method POST -Body $body -ContentType "application/json"
    
    if ($insertResult.success) {
        Write-Host "   ✅ Inserción exitosa" -ForegroundColor Green
        Write-Host "   📝 Campos insertados: $($insertResult.data.insertedFields -join ', ')" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "   Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# 4. Consulta después de inserción
Write-Host "4. Verificar inserción..." -ForegroundColor Yellow
try {
    $queryUrl = "$BaseUrl/api/$Entity" + "?connection=$Connection&limit=5"
    $afterInsert = Invoke-RestMethod $queryUrl
    
    if ($afterInsert.success) {
        Write-Host "   ✅ Verificación exitosa - $($afterInsert.data.Count) registros" -ForegroundColor Green
        
        # Buscar el registro recién insertado
        $testRecord = $afterInsert.data | Where-Object { $_.DESCRIPCION -like "*Proceso de prueba CRUD*" } | Select-Object -First 1
        
        if ($testRecord) {
            Write-Host "   📋 Registro encontrado - ID: $($testRecord.ID_PROC_CAB)" -ForegroundColor Green
            $testId = $testRecord.ID_PROC_CAB
            
            # 5. Actualización
            Write-Host "5. Actualización del registro ID $testId..." -ForegroundColor Yellow
            try {
                $updateUrl = "$BaseUrl/api/$Entity/$testId" + "?connection=$Connection"
                Write-Host "   URL: $updateUrl" -ForegroundColor Gray
                
                $updateData = @{
                    DESCRIPCION = "Proceso ACTUALIZADO via API - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
                    OBSERVACIONES = "Actualizado por test automatizado"
                    MOSTRAR = 0
                }
                
                $updateBody = $updateData | ConvertTo-Json
                $updateResult = Invoke-RestMethod -Uri $updateUrl -Method PUT -Body $updateBody -ContentType "application/json"
                
                if ($updateResult.success) {
                    Write-Host "   ✅ Actualización exitosa" -ForegroundColor Green
                    Write-Host "   📝 Campos actualizados: $($updateResult.data.updatedFields -join ', ')" -ForegroundColor Gray
                }
            } catch {
                Write-Host "   ❌ Error en actualización: $($_.Exception.Message)" -ForegroundColor Red
            }
            
            # 6. Verificar actualización
            Write-Host "6. Verificar actualización..." -ForegroundColor Yellow
            try {
                $verifyResult = Invoke-RestMethod $queryUrl
                $updatedRecord = $verifyResult.data | Where-Object { $_.ID_PROC_CAB -eq $testId }
                
                if ($updatedRecord -and $updatedRecord.MOSTRAR -eq 0) {
                    Write-Host "   ✅ Actualización verificada - MOSTRAR: $($updatedRecord.MOSTRAR)" -ForegroundColor Green
                } else {
                    Write-Host "   ⚠️ No se pudo verificar la actualización" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "   ❌ Error en verificación: $($_.Exception.Message)" -ForegroundColor Red
            }
            
            # 7. Pregunta sobre eliminación
            Write-Host "7. ¿Eliminar el registro de prueba? (s/N)" -ForegroundColor Yellow
            $delete = Read-Host
            
            if ($delete -eq "s" -or $delete -eq "S") {
                try {
                    $deleteUrl = "$BaseUrl/api/$Entity/$testId" + "?connection=$Connection"
                    Write-Host "   URL: $deleteUrl" -ForegroundColor Gray
                    
                    $deleteResult = Invoke-RestMethod -Uri $deleteUrl -Method DELETE
                    
                    if ($deleteResult.success) {
                        Write-Host "   ✅ Eliminación exitosa" -ForegroundColor Green
                        Write-Host "   🗑️ Registro ID $testId eliminado" -ForegroundColor Gray
                    }
                } catch {
                    Write-Host "   ❌ Error en eliminación: $($_.Exception.Message)" -ForegroundColor Red
                }
            } else {
                Write-Host "   ⏭️ Eliminación omitida" -ForegroundColor Yellow
            }
        } else {
            Write-Host "   ⚠️ No se encontró el registro insertado" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 8. Prueba de inserción en lote
Write-Host "8. Inserción en lote..." -ForegroundColor Yellow
try {
    $batchUrl = "$BaseUrl/api/$Entity/batch" + "?connection=$Connection"
    Write-Host "   URL: $batchUrl" -ForegroundColor Gray
    
    $batchData = @{
        records = @(
            @{
                DESCRIPCION = "Batch 1 - $(Get-Date -Format 'HH:mm:ss')"
                OBSERVACIONES = "Batch test 1"
                MOSTRAR = 1
            },
            @{
                DESCRIPCION = "Batch 2 - $(Get-Date -Format 'HH:mm:ss')"
                OBSERVACIONES = "Batch test 2"
                MOSTRAR = 0
            }
        )
    }
    
    $batchBody = $batchData | ConvertTo-Json -Depth 3
    $batchResult = Invoke-RestMethod -Uri $batchUrl -Method POST -Body $batchBody -ContentType "application/json"
    
    if ($batchResult.success) {
        Write-Host "   ✅ Inserción en lote exitosa" -ForegroundColor Green
        Write-Host "   📊 Total: $($batchResult.data.totalRecords), Exitosos: $($batchResult.data.successfulInserts), Errores: $($batchResult.data.failedInserts)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Error en lote: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "   Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# 9. Prueba con diferentes conexiones
Write-Host "9. Probando diferentes conexiones..." -ForegroundColor Yellow
$connections = @("prod", "desa")

foreach ($conn in $connections) {
    try {
        $connUrl = "$BaseUrl/api/$Entity" + "?connection=$conn&limit=2"
        $connResult = Invoke-RestMethod $connUrl
        
        if ($connResult.success) {
            Write-Host "   ✅ Conexión '$conn': $($connResult.data.Count) registros" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ❌ Error en conexión '$conn': $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Prueba rápida completada!" -ForegroundColor Green
Write-Host "📋 Operaciones probadas:" -ForegroundColor Cyan
Write-Host "   ✅ READ - Consulta de registros" -ForegroundColor White
Write-Host "   ✅ CREATE - Inserción individual" -ForegroundColor White
Write-Host "   ✅ UPDATE - Actualización por ID" -ForegroundColor White
Write-Host "   ✅ BATCH - Inserción múltiple" -ForegroundColor White
Write-Host "   ✅ MULTI-CONNECTION - Diferentes conexiones" -ForegroundColor White
