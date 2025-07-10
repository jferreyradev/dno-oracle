# 📝 DNO-Oracle - Ejemplos CRUD y Procedimientos

## 🎯 Operaciones CRUD Completas

La API DNO-Oracle ahora soporta operaciones completas de **Create, Read, Update, Delete** más llamadas a procedimientos almacenados y funciones.

---

## 📋 Resumen de Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| **GET** | `/api/{entidad}` | Consultar registros |
| **POST** | `/api/{entidad}` | Insertar nuevo registro |
| **PUT** | `/api/{entidad}/{id}` | Actualizar registro por ID |
| **DELETE** | `/api/{entidad}/{id}` | Eliminar registro por ID |
| **POST** | `/api/{entidad}/batch` | Inserción en lote (múltiples registros) |
| **POST** | `/api/procedures/{nombre}` | Ejecutar procedimiento almacenado |
| **POST** | `/api/functions/{nombre}` | Ejecutar función almacenada |

---

## 🔍 1. CONSULTAS (READ) - GET

### Consulta Básica
```bash
GET /api/proc_cab?limit=5
```

**Respuesta**:
```json
{
  "success": true,
  "data": [
    {
      "ID_PROC_CAB": 1,
      "DESCRIPCION": "Proceso ejemplo",
      "ESTADO": "ACTIVO",
      "FECHA_CREACION": "2025-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "limit": 5,
    "offset": 0,
    "totalRows": 1
  },
  "meta": {
    "entity": "proc_cab",
    "connectionUsed": "prod"
  }
}
```

### Con Selección de Conexión
```bash
GET /api/proc_cab?connection=desa&limit=3
```

---

## ➕ 2. INSERCIÓN (CREATE) - POST

### Insertar Registro Individual

**Endpoint**: `POST /api/proc_cab`

**Body (JSON)**:
```json
{
  "DESCRIPCION": "Nuevo proceso de prueba",
  "ESTADO": "ACTIVO",
  "FECHA_CREACION": "2025-07-10T15:30:00.000Z",
  "USUARIO_CREACION": "ADMIN"
}
```

**Comando PowerShell**:
```powershell
$body = @{
    DESCRIPCION = "Nuevo proceso de prueba"
    ESTADO = "ACTIVO"
    FECHA_CREACION = "2025-07-10T15:30:00.000Z"
    USUARIO_CREACION = "ADMIN"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/proc_cab" -Method POST -Body $body -ContentType "application/json"
```

**Comando curl**:
```bash
curl -X POST "http://localhost:8000/api/proc_cab" \
  -H "Content-Type: application/json" \
  -d '{
    "DESCRIPCION": "Nuevo proceso de prueba",
    "ESTADO": "ACTIVO", 
    "FECHA_CREACION": "2025-07-10T15:30:00.000Z",
    "USUARIO_CREACION": "ADMIN"
  }'
```

**Respuesta Exitosa (201)**:
```json
{
  "success": true,
  "message": "Registro insertado en 'proc_cab' exitosamente",
  "data": {
    "insertedFields": ["DESCRIPCION", "ESTADO", "FECHA_CREACION", "USUARIO_CREACION"],
    "affectedRows": 1
  },
  "metadata": {
    "entity": "proc_cab",
    "tableName": "WORKFLOW.PROC_CAB",
    "connection": "prod",
    "operation": "INSERT",
    "timestamp": "2025-07-10T15:30:45.123Z"
  }
}
```

### Insertar con Conexión Específica

**Endpoint**: `POST /api/proc_cab?connection=desa`

```powershell
# Insertar en entorno de desarrollo
$body = @{
    DESCRIPCION = "Proceso de desarrollo"
    ESTADO = "PRUEBA"
    USUARIO_CREACION = "DEVELOPER"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/proc_cab?connection=desa" -Method POST -Body $body -ContentType "application/json"
```

---

## ✏️ 3. ACTUALIZACIÓN (UPDATE) - PUT

### Actualizar Registro por ID

**Endpoint**: `PUT /api/proc_cab/{ID}`

**Body (JSON)**:
```json
{
  "DESCRIPCION": "Proceso actualizado",
  "ESTADO": "MODIFICADO",
  "FECHA_MODIFICACION": "2025-07-10T16:00:00.000Z",
  "USUARIO_MODIFICACION": "ADMIN"
}
```

**Comando PowerShell**:
```powershell
$body = @{
    DESCRIPCION = "Proceso actualizado"
    ESTADO = "MODIFICADO"
    FECHA_MODIFICACION = "2025-07-10T16:00:00.000Z"
    USUARIO_MODIFICACION = "ADMIN"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/proc_cab/123" -Method PUT -Body $body -ContentType "application/json"
```

**Comando curl**:
```bash
curl -X PUT "http://localhost:8000/api/proc_cab/123" \
  -H "Content-Type: application/json" \
  -d '{
    "DESCRIPCION": "Proceso actualizado",
    "ESTADO": "MODIFICADO",
    "FECHA_MODIFICACION": "2025-07-10T16:00:00.000Z",
    "USUARIO_MODIFICACION": "ADMIN"
  }'
```

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Registro actualizado en 'proc_cab' exitosamente",
  "data": {
    "updatedFields": ["DESCRIPCION", "ESTADO", "FECHA_MODIFICACION", "USUARIO_MODIFICACION"],
    "affectedRows": 1,
    "recordId": "123"
  },
  "metadata": {
    "entity": "proc_cab",
    "tableName": "WORKFLOW.PROC_CAB",
    "primaryKey": "ID_PROC_CAB",
    "connection": "prod",
    "operation": "UPDATE",
    "timestamp": "2025-07-10T16:00:45.123Z"
  }
}
```

### Actualizar con Conexión Específica

```powershell
# Actualizar en desarrollo
$body = @{
    ESTADO = "APROBADO"
    FECHA_APROBACION = "2025-07-10T16:30:00.000Z"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/proc_cab/456?connection=desa" -Method PUT -Body $body -ContentType "application/json"
```

---

## 🗑️ 4. ELIMINACIÓN (DELETE) - DELETE

### Eliminar Registro por ID

**Endpoint**: `DELETE /api/proc_cab/{ID}`

**Comando PowerShell**:
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/proc_cab/123" -Method DELETE
```

**Comando curl**:
```bash
curl -X DELETE "http://localhost:8000/api/proc_cab/123"
```

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Registro eliminado de 'proc_cab' exitosamente",
  "data": {
    "deletedRecordId": "123",
    "affectedRows": 1
  },
  "metadata": {
    "entity": "proc_cab",
    "tableName": "WORKFLOW.PROC_CAB",
    "primaryKey": "ID_PROC_CAB",
    "connection": "prod",
    "operation": "DELETE",
    "timestamp": "2025-07-10T16:45:45.123Z"
  }
}
```

### Eliminar con Conexión Específica

```powershell
# Eliminar en desarrollo
Invoke-RestMethod -Uri "http://localhost:8000/api/proc_cab/789?connection=desa" -Method DELETE
```

---

## 📦 5. INSERCIÓN EN LOTE (BATCH) - POST

### Insertar Múltiples Registros

**Endpoint**: `POST /api/proc_cab/batch`

**Body (JSON)**:
```json
{
  "records": [
    {
      "DESCRIPCION": "Proceso batch 1",
      "ESTADO": "ACTIVO",
      "USUARIO_CREACION": "BATCH_USER"
    },
    {
      "DESCRIPCION": "Proceso batch 2", 
      "ESTADO": "PENDIENTE",
      "USUARIO_CREACION": "BATCH_USER"
    },
    {
      "DESCRIPCION": "Proceso batch 3",
      "ESTADO": "ACTIVO",
      "USUARIO_CREACION": "BATCH_USER"
    }
  ]
}
```

**Comando PowerShell**:
```powershell
$batchBody = @{
    records = @(
        @{
            DESCRIPCION = "Proceso batch 1"
            ESTADO = "ACTIVO"
            USUARIO_CREACION = "BATCH_USER"
        },
        @{
            DESCRIPCION = "Proceso batch 2"
            ESTADO = "PENDIENTE"
            USUARIO_CREACION = "BATCH_USER"
        },
        @{
            DESCRIPCION = "Proceso batch 3"
            ESTADO = "ACTIVO"
            USUARIO_CREACION = "BATCH_USER"
        }
    )
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:8000/api/proc_cab/batch" -Method POST -Body $batchBody -ContentType "application/json"
```

**Respuesta Exitosa (201)**:
```json
{
  "success": true,
  "message": "Batch insert completado: 3 exitosos, 0 errores",
  "data": {
    "totalRecords": 3,
    "successfulInserts": 3,
    "failedInserts": 0,
    "results": [
      {
        "index": 0,
        "success": true,
        "data": { "DESCRIPCION": "Proceso batch 1", "ESTADO": "ACTIVO", "USUARIO_CREACION": "BATCH_USER" },
        "affectedRows": 1
      },
      {
        "index": 1,
        "success": true,
        "data": { "DESCRIPCION": "Proceso batch 2", "ESTADO": "PENDIENTE", "USUARIO_CREACION": "BATCH_USER" },
        "affectedRows": 1
      },
      {
        "index": 2,
        "success": true,
        "data": { "DESCRIPCION": "Proceso batch 3", "ESTADO": "ACTIVO", "USUARIO_CREACION": "BATCH_USER" },
        "affectedRows": 1
      }
    ]
  },
  "metadata": {
    "entity": "proc_cab",
    "tableName": "WORKFLOW.PROC_CAB",
    "connection": "prod",
    "operation": "BATCH_INSERT",
    "timestamp": "2025-07-10T17:00:45.123Z"
  }
}
```

---

## 🔧 6. PROCEDIMIENTOS ALMACENADOS

### Ejecutar Procedimiento sin Parámetros

**Endpoint**: `POST /api/procedures/SP_ACTUALIZAR_ESTADISTICAS`

**Body (JSON)**:
```json
{
  "parameters": []
}
```

**Comando PowerShell**:
```powershell
$procBody = @{
    parameters = @()
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/procedures/SP_ACTUALIZAR_ESTADISTICAS" -Method POST -Body $procBody -ContentType "application/json"
```

### Ejecutar Procedimiento con Parámetros

**Endpoint**: `POST /api/procedures/SP_CREAR_PROCESO`

**Body (JSON)**:
```json
{
  "parameters": [
    "Nuevo proceso desde API",
    "ACTIVO",
    "API_USER"
  ]
}
```

**Comando PowerShell**:
```powershell
$procBody = @{
    parameters = @(
        "Nuevo proceso desde API",
        "ACTIVO", 
        "API_USER"
    )
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/procedures/SP_CREAR_PROCESO" -Method POST -Body $procBody -ContentType "application/json"
```

**Comando curl**:
```bash
curl -X POST "http://localhost:8000/api/procedures/SP_CREAR_PROCESO" \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": [
      "Nuevo proceso desde API",
      "ACTIVO",
      "API_USER"
    ]
  }'
```

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Procedimiento 'SP_CREAR_PROCESO' ejecutado exitosamente",
  "data": {
    "procedureName": "SP_CREAR_PROCESO",
    "inputParameters": ["Nuevo proceso desde API", "ACTIVO", "API_USER"],
    "outputParameters": [],
    "affectedRows": 1
  },
  "metadata": {
    "connection": "default",
    "operation": "CALL_PROCEDURE",
    "timestamp": "2025-07-10T17:15:45.123Z"
  }
}
```

### Procedimiento con Conexión Específica

```powershell
# Ejecutar en desarrollo
$procBody = @{
    parameters = @("TEST_PROCESS", "PRUEBA")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/procedures/SP_TEST_PROCEDURE?connection=desa" -Method POST -Body $procBody -ContentType "application/json"
```

---

## ⚙️ 7. FUNCIONES ALMACENADAS

### Ejecutar Función con Retorno

**Endpoint**: `POST /api/functions/FN_OBTENER_SIGUIENTE_ID`

**Body (JSON)**:
```json
{
  "parameters": ["PROC_CAB"]
}
```

**Comando PowerShell**:
```powershell
$funcBody = @{
    parameters = @("PROC_CAB")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/functions/FN_OBTENER_SIGUIENTE_ID" -Method POST -Body $funcBody -ContentType "application/json"
```

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Función 'FN_OBTENER_SIGUIENTE_ID' ejecutada exitosamente",
  "data": {
    "functionName": "FN_OBTENER_SIGUIENTE_ID",
    "inputParameters": ["PROC_CAB"],
    "result": 1001
  },
  "metadata": {
    "connection": "default",
    "operation": "CALL_FUNCTION", 
    "timestamp": "2025-07-10T17:30:45.123Z"
  }
}
```

### Función de Validación

**Endpoint**: `POST /api/functions/FN_VALIDAR_ESTADO`

```powershell
$funcBody = @{
    parameters = @("ACTIVO", "PROC_CAB")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/functions/FN_VALIDAR_ESTADO" -Method POST -Body $funcBody -ContentType "application/json"
```

---

## ❌ 8. MANEJO DE ERRORES

### Error de Inserción - Campo Obligatorio Faltante

**Request**:
```json
{
  "ESTADO": "ACTIVO"
  // Falta DESCRIPCION que es obligatorio
}
```

**Respuesta (500)**:
```json
{
  "success": false,
  "error": "Error al insertar en 'proc_cab'",
  "details": "ORA-01400: cannot insert NULL into (\"WORKFLOW\".\"PROC_CAB\".\"DESCRIPCION\")",
  "sqlState": 1400
}
```

### Error de Actualización - Registro No Encontrado

**Request**: `PUT /api/proc_cab/99999`

**Respuesta (404)**:
```json
{
  "success": false,
  "error": "Registro con ID_PROC_CAB = '99999' no encontrado en 'proc_cab'"
}
```

### Error de Procedimiento - No Existe

**Request**: `POST /api/procedures/SP_NO_EXISTE`

**Respuesta (500)**:
```json
{
  "success": false,
  "error": "Error al ejecutar procedimiento 'SP_NO_EXISTE'",
  "details": "ORA-00942: table or view does not exist",
  "sqlState": 942
}
```

---

## 🧪 9. SCRIPT DE PRUEBAS COMPLETO

```powershell
# 🧪 DNO-Oracle - Pruebas CRUD Completas
$baseUrl = "http://localhost:8000"

Write-Host "🧪 Iniciando pruebas CRUD completas..." -ForegroundColor Cyan

# 1. INSERTAR REGISTRO
Write-Host "`n➕ 1. INSERTANDO NUEVO REGISTRO" -ForegroundColor Yellow
$newRecord = @{
    DESCRIPCION = "Proceso de prueba CRUD - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    ESTADO = "ACTIVO"
    USUARIO_CREACION = "API_TEST"
} | ConvertTo-Json

try {
    $insertResult = Invoke-RestMethod -Uri "$baseUrl/api/proc_cab" -Method POST -Body $newRecord -ContentType "application/json"
    Write-Host "✅ Inserción exitosa" -ForegroundColor Green
    Write-Host "   Campos insertados: $($insertResult.data.insertedFields -join ', ')" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error en inserción: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. CONSULTAR REGISTROS
Write-Host "`n🔍 2. CONSULTANDO REGISTROS RECIENTES" -ForegroundColor Yellow
try {
    $queryResult = Invoke-RestMethod -Uri "$baseUrl/api/proc_cab?limit=5"
    Write-Host "✅ Consulta exitosa" -ForegroundColor Green
    Write-Host "   Registros encontrados: $($queryResult.data.Count)" -ForegroundColor Gray
    
    # Obtener ID del primer registro para usar en UPDATE/DELETE
    if ($queryResult.data.Count -gt 0) {
        $testId = $queryResult.data[0].ID_PROC_CAB
        Write-Host "   Usando ID para pruebas: $testId" -ForegroundColor Gray
        
        # 3. ACTUALIZAR REGISTRO
        Write-Host "`n✏️ 3. ACTUALIZANDO REGISTRO ID: $testId" -ForegroundColor Yellow
        $updateData = @{
            DESCRIPCION = "Proceso ACTUALIZADO via API - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            ESTADO = "MODIFICADO"
        } | ConvertTo-Json
        
        try {
            $updateResult = Invoke-RestMethod -Uri "$baseUrl/api/proc_cab/$testId" -Method PUT -Body $updateData -ContentType "application/json"
            Write-Host "✅ Actualización exitosa" -ForegroundColor Green
            Write-Host "   Campos actualizados: $($updateResult.data.updatedFields -join ', ')" -ForegroundColor Gray
        } catch {
            Write-Host "❌ Error en actualización: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # 4. VERIFICAR ACTUALIZACIÓN
        Write-Host "`n🔍 4. VERIFICANDO ACTUALIZACIÓN" -ForegroundColor Yellow
        try {
            $verifyResult = Invoke-RestMethod -Uri "$baseUrl/api/proc_cab?limit=1"
            $updatedRecord = $verifyResult.data | Where-Object { $_.ID_PROC_CAB -eq $testId }
            if ($updatedRecord) {
                Write-Host "✅ Verificación exitosa" -ForegroundColor Green
                Write-Host "   Estado actual: $($updatedRecord.ESTADO)" -ForegroundColor Gray
                Write-Host "   Descripción: $($updatedRecord.DESCRIPCION)" -ForegroundColor Gray
            }
        } catch {
            Write-Host "❌ Error en verificación: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "❌ Error en consulta: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. INSERCIÓN EN LOTE
Write-Host "`n📦 5. INSERTANDO REGISTROS EN LOTE" -ForegroundColor Yellow
$batchData = @{
    records = @(
        @{
            DESCRIPCION = "Batch 1 - $(Get-Date -Format 'HH:mm:ss')"
            ESTADO = "BATCH_TEST"
            USUARIO_CREACION = "BATCH_API"
        },
        @{
            DESCRIPCION = "Batch 2 - $(Get-Date -Format 'HH:mm:ss')"
            ESTADO = "BATCH_TEST"
            USUARIO_CREACION = "BATCH_API"
        }
    )
} | ConvertTo-Json -Depth 3

try {
    $batchResult = Invoke-RestMethod -Uri "$baseUrl/api/proc_cab/batch" -Method POST -Body $batchData -ContentType "application/json"
    Write-Host "✅ Inserción en lote exitosa" -ForegroundColor Green
    Write-Host "   Total: $($batchResult.data.totalRecords), Exitosos: $($batchResult.data.successfulInserts), Errores: $($batchResult.data.failedInserts)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error en inserción en lote: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. PROBAR DIFERENTES CONEXIONES
Write-Host "`n🔌 6. PROBANDO DIFERENTES CONEXIONES" -ForegroundColor Yellow
$connections = @("prod", "desa", "default")

foreach ($conn in $connections) {
    try {
        $connResult = Invoke-RestMethod -Uri "$baseUrl/api/proc_cab?connection=$conn&limit=2"
        Write-Host "✅ Conexión '$conn': $($connResult.data.Count) registros" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error en conexión '$conn': $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Pruebas CRUD completadas!" -ForegroundColor Green
Write-Host "📊 Resumen de operaciones probadas:" -ForegroundColor Cyan
Write-Host "   ✅ CREATE (POST) - Inserción individual" -ForegroundColor White
Write-Host "   ✅ READ (GET) - Consulta con paginación" -ForegroundColor White
Write-Host "   ✅ UPDATE (PUT) - Actualización por ID" -ForegroundColor White
Write-Host "   ✅ BATCH INSERT - Inserción múltiple" -ForegroundColor White
Write-Host "   ✅ MULTI-CONNECTION - Diferentes conexiones" -ForegroundColor White
```

---

## 🎯 Resumen de Capacidades

### ✅ Operaciones Soportadas

| Operación | Método | Soporte Multi-Conexión | Validaciones |
|-----------|--------|------------------------|--------------|
| **Consultar** | GET | ✅ | Entidad existe, conexión permitida |
| **Insertar** | POST | ✅ | Campos requeridos, tipos de datos |
| **Actualizar** | PUT | ✅ | Registro existe, campos válidos |
| **Eliminar** | DELETE | ✅ | Registro existe, confirmación |
| **Lote** | POST | ✅ | Validación por registro |
| **Procedimientos** | POST | ✅ | Parámetros correctos |
| **Funciones** | POST | ✅ | Retorno de valores |

### 🔧 Parámetros Globales

- **`?connection=nombre`**: Selecciona la conexión de base de datos
- **`?limit=N`**: Limita el número de registros (solo GET)
- **`?offset=N`**: Desplazamiento para paginación (solo GET)

### 🛡️ Validaciones Automáticas

- ✅ Existencia de entidades configuradas
- ✅ Conexiones permitidas por entidad
- ✅ Validación de parámetros de entrada
- ✅ Verificación de registros antes de UPDATE/DELETE
- ✅ Manejo de errores SQL con códigos específicos

---

**🚀 Tu API DNO-Oracle ahora soporta operaciones CRUD completas y llamadas a procedimientos almacenados**
