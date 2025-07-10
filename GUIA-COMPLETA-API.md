# 📡 DNO-Oracle - Guía Completa de API

## 🎯 Resumen de Funcionalidades

La API DNO-Oracle proporciona acceso genérico a bases de datos Oracle con soporte para:
- ✅ Múltiples conexiones simultáneas
- ✅ Selección dinámica de conexión por petición
- ✅ Paginación automática
- ✅ Validación de entidades y conexiones
- ✅ Metadatos en respuestas
- ✅ Pool de conexiones optimizado

---

## 🚀 Inicio Rápido

```powershell
# 1. Configurar entorno
cp .env.example .env
# Editar .env con tus datos

# 2. Iniciar servidor
.\start-server.ps1
# O manualmente: deno run --allow-net --allow-read --allow-env --allow-ffi api/server-minimal.ts

# 3. Verificar funcionamiento
.\test.ps1
```

**Base URL**: `http://localhost:8000`

---

## 📊 Endpoints del Sistema

### 1. Health Check
Verifica que la API esté funcionando.

```bash
GET /api/health
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "DNO-Oracle API está funcionando",
  "timestamp": "2025-07-10T15:30:45.123Z",
  "mode": "minimal",
  "version": "1.0.0"
}
```

### 2. Información del Sistema
Obtiene metadatos de la API y sus capacidades.

```bash
GET /api/info
```

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "name": "DNO-Oracle API",
    "version": "1.0.0",
    "mode": "minimal",
    "description": "API REST genérica para Oracle Database",
    "endpoints": [
      "GET /api/health",
      "GET /api/info", 
      "GET /api/connections",
      "GET /api/entities",
      "GET /api/{entidad}"
    ],
    "features": {
      "multiConnectionSupport": true,
      "pagination": true,
      "dynamicConnectionSelection": true
    }
  }
}
```

### 3. Estado de Conexiones
Muestra el estado de todas las conexiones configuradas.

```bash
GET /api/connections
```

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "active": {
      "default": {
        "host": "10.6.177.180",
        "port": 1521,
        "service": "HPROD04",
        "schema": "WORKFLOW",
        "status": "connected"
      },
      "prod": {
        "host": "10.6.177.180", 
        "port": 1521,
        "service": "HPROD04",
        "schema": "WORKFLOW",
        "status": "connected"
      },
      "desa": {
        "host": "10.6.46.17",
        "port": 1521,
        "service": "HTEST01", 
        "schema": "WORKFLOW",
        "status": "connected"
      }
    },
    "count": 3,
    "timestamp": "2025-07-10T15:30:45.123Z"
  }
}
```

### 4. Lista de Entidades
Muestra todas las entidades configuradas y sus conexiones permitidas.

```bash
GET /api/entities
```

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "entities": {
      "proc_cab": {
        "tableName": "WORKFLOW.PROC_CAB",
        "primaryKey": "ID_PROC_CAB",
        "defaultConnection": "prod",
        "allowedConnections": ["prod", "desa"]
      },
      "tpd_form": {
        "tableName": "WORKFLOW.TPD_FORM",
        "primaryKey": "ID_TPD_FORM",
        "defaultConnection": "prod",
        "allowedConnections": ["prod", "desa"]
      }
    },
    "count": 2,
    "availableConnections": ["default", "prod", "desa"]
  }
}
```

---

## 🗃️ Consulta de Entidades

### 1. Consulta Básica
Obtiene registros de una entidad usando su conexión por defecto.

```bash
GET /api/proc_cab
```

**Respuesta**:
```json
{
  "success": true,
  "data": [
    {
      "ID_PROC_CAB": 1,
      "DESCRIPCION": "Proceso ejemplo 1",
      "FECHA_CREACION": "2025-01-15T10:30:00.000Z",
      "ESTADO": "ACTIVO"
    },
    {
      "ID_PROC_CAB": 2,
      "DESCRIPCION": "Proceso ejemplo 2", 
      "FECHA_CREACION": "2025-01-16T14:20:00.000Z",
      "ESTADO": "PENDIENTE"
    }
  ],
  "metadata": {
    "entity": "proc_cab",
    "connection": "prod",
    "totalRecords": 2,
    "queryTime": "45ms",
    "timestamp": "2025-07-10T15:30:45.123Z"
  }
}
```

### 2. Paginación
Controla cuántos registros obtener y desde qué posición.

```bash
# Primeros 5 registros
GET /api/proc_cab?limit=5

# Registros del 11 al 20
GET /api/proc_cab?limit=10&offset=10

# Página 3, mostrando 5 por página  
GET /api/proc_cab?limit=5&offset=10
```

**Respuesta con paginación**:
```json
{
  "success": true,
  "data": [
    {
      "ID_PROC_CAB": 11,
      "DESCRIPCION": "Proceso página 3",
      "FECHA_CREACION": "2025-01-20T09:15:00.000Z",
      "ESTADO": "ACTIVO"
    }
  ],
  "metadata": {
    "entity": "proc_cab",
    "connection": "prod",
    "totalRecords": 1,
    "pagination": {
      "limit": 5,
      "offset": 10,
      "requested": 5,
      "returned": 1
    },
    "queryTime": "32ms",
    "timestamp": "2025-07-10T15:30:45.123Z"
  }
}
```

### 3. Selección de Conexión
Consulta la misma entidad en diferentes bases de datos.

```bash
# Conexión por defecto (prod)
GET /api/proc_cab?limit=3

# Conexión específica (desarrollo)
GET /api/proc_cab?connection=desa&limit=3

# Conexión default (desde .env)
GET /api/proc_cab?connection=default&limit=3
```

**Respuesta con conexión específica**:
```json
{
  "success": true,
  "data": [
    {
      "ID_PROC_CAB": 1001,
      "DESCRIPCION": "Proceso desarrollo 1",
      "FECHA_CREACION": "2025-01-10T08:00:00.000Z",
      "ESTADO": "PRUEBA"
    },
    {
      "ID_PROC_CAB": 1002,
      "DESCRIPCION": "Proceso desarrollo 2",
      "FECHA_CREACION": "2025-01-11T10:30:00.000Z",
      "ESTADO": "TEST"
    }
  ],
  "metadata": {
    "entity": "proc_cab",
    "connection": "desa",
    "connectionInfo": {
      "host": "10.6.46.17",
      "service": "HTEST01",
      "schema": "WORKFLOW"
    },
    "totalRecords": 2,
    "queryTime": "38ms",
    "timestamp": "2025-07-10T15:30:45.123Z"
  }
}
```

### 4. Combinación de Parámetros
Usa múltiples parámetros en una sola consulta.

```bash
# Conexión específica + paginación
GET /api/tpd_form?connection=desa&limit=5&offset=15

# Máximo de registros con conexión específica
GET /api/proc_cab?connection=prod&limit=100
```

**Respuesta combinada**:
```json
{
  "success": true,
  "data": [
    {
      "ID_TPD_FORM": 1015,
      "NOMBRE": "Formulario Test 15",
      "TIPO": "DINAMICO",
      "ACTIVO": "S"
    }
  ],
  "metadata": {
    "entity": "tpd_form",
    "connection": "desa",
    "connectionInfo": {
      "host": "10.6.46.17",
      "service": "HTEST01",
      "schema": "WORKFLOW"
    },
    "totalRecords": 1,
    "pagination": {
      "limit": 5,
      "offset": 15,
      "requested": 5,
      "returned": 1
    },
    "queryTime": "28ms",
    "timestamp": "2025-07-10T15:30:45.123Z"
  }
}
```

---

## ❌ Manejo de Errores

### 1. Entidad No Encontrada
```bash
GET /api/entidad_inexistente
```

**Respuesta (404)**:
```json
{
  "success": false,
  "error": "Entity not found",
  "message": "La entidad 'entidad_inexistente' no está configurada",
  "availableEntities": ["proc_cab", "tpd_form"],
  "timestamp": "2025-07-10T15:30:45.123Z"
}
```

### 2. Conexión No Permitida
```bash
GET /api/proc_cab?connection=conexion_inexistente
```

**Respuesta (400)**:
```json
{
  "success": false,
  "error": "Invalid connection",
  "message": "La conexión 'conexion_inexistente' no está permitida para la entidad 'proc_cab'",
  "allowedConnections": ["prod", "desa"],
  "availableConnections": ["default", "prod", "desa"],
  "timestamp": "2025-07-10T15:30:45.123Z"
}
```

### 3. Parámetros Inválidos
```bash
GET /api/proc_cab?limit=abc&offset=-10
```

**Respuesta (400)**:
```json
{
  "success": false,
  "error": "Invalid parameters",
  "message": "Parámetros de consulta inválidos",
  "details": {
    "limit": "Debe ser un número entero positivo",
    "offset": "Debe ser un número entero no negativo"
  },
  "timestamp": "2025-07-10T15:30:45.123Z"
}
```

### 4. Error de Base de Datos
```bash
GET /api/proc_cab?connection=prod
# (cuando hay problemas de conexión)
```

**Respuesta (500)**:
```json
{
  "success": false,
  "error": "Database error",
  "message": "Error al consultar la base de datos",
  "connection": "prod",
  "timestamp": "2025-07-10T15:30:45.123Z"
}
```

---

## 🔧 Parámetros de Consulta

| Parámetro | Tipo | Descripción | Ejemplo | Por Defecto |
|-----------|------|-------------|---------|-------------|
| `connection` | string | Selecciona la conexión a usar | `?connection=desa` | default |
| `limit` | integer | Número máximo de registros | `?limit=50` | 1000 |
| `offset` | integer | Número de registros a saltar | `?offset=20` | 0 |

**Validaciones**:
- `limit`: Entre 1 y 1000
- `offset`: Número entero ≥ 0  
- `connection`: Debe estar en la lista de conexiones permitidas para la entidad

---

## 🧪 Ejemplos con PowerShell

### Script de Pruebas Básicas
```powershell
# Variables
$baseUrl = "http://localhost:8000"

# Health check
Invoke-RestMethod "$baseUrl/api/health" | ConvertTo-Json -Depth 3

# Lista de entidades
Invoke-RestMethod "$baseUrl/api/entities" | ConvertTo-Json -Depth 3

# Consulta básica
Invoke-RestMethod "$baseUrl/api/proc_cab?limit=5" | ConvertTo-Json -Depth 3

# Conexión específica
Invoke-RestMethod "$baseUrl/api/proc_cab?connection=desa&limit=3" | ConvertTo-Json -Depth 3
```

### Script de Comparación de Conexiones
```powershell
$entity = "proc_cab"
$limit = 5

Write-Host "=== Comparando $entity en diferentes conexiones ===" -ForegroundColor Cyan

# Consulta en producción
Write-Host "`n--- PRODUCCIÓN ---" -ForegroundColor Yellow
$prod = Invoke-RestMethod "$baseUrl/api/$entity?connection=prod&limit=$limit"
Write-Host "Registros en PROD: $($prod.metadata.totalRecords)"

# Consulta en desarrollo  
Write-Host "`n--- DESARROLLO ---" -ForegroundColor Yellow
$desa = Invoke-RestMethod "$baseUrl/api/$entity?connection=desa&limit=$limit"
Write-Host "Registros en DESA: $($desa.metadata.totalRecords)"
```

---

## 📋 Lista de Verificación

### ✅ Funcionalidades Confirmadas

- **Servidor**: ✅ Puerto 8000, rutas configuradas
- **Conexiones**: ✅ 3 pools Oracle (default, prod, desa)
- **Entidades**: ✅ 2 entidades configuradas (proc_cab, tpd_form)
- **Selección de conexión**: ✅ Parámetro `connection` funcional
- **Paginación**: ✅ Parámetros `limit` y `offset` funcionales
- **Validación**: ✅ Entidades y conexiones validadas
- **Metadatos**: ✅ Información de consulta en respuestas
- **Manejo de errores**: ✅ Respuestas estructuradas para errores

### 🎯 Casos de Uso Típicos

1. **Consulta rápida**: `GET /api/proc_cab?limit=10`
2. **Comparar ambientes**: `GET /api/proc_cab?connection=desa`
3. **Navegación paginada**: `GET /api/proc_cab?limit=20&offset=40`
4. **Verificar diferencias**: Consultar misma entidad en prod y desa
5. **Monitoreo**: `GET /api/health` y `/api/connections`

---

## 📚 Referencias

- **README.md** - Configuración y inicio rápido
- **SISTEMA-FUNCIONANDO.md** - Estado detallado del sistema  
- **EJEMPLOS-CRUD.md** - 📝 Guía completa de operaciones CRUD y procedimientos
- **start-server.ps1** - Script de inicio
- **test.ps1** - Script de pruebas automatizadas
- **test-crud.ps1** - 🧪 Script de pruebas CRUD completas
- **ejemplos.ps1** - Generador de ejemplos en tiempo real

## 🧪 Scripts de Prueba Especializados

```powershell
# Pruebas CRUD completas
.\test-crud.ps1

# Pruebas CRUD con reportes detallados
.\test-crud.ps1 -SaveResults -Verbose

# Pruebas sin eliminar registros
.\test-crud.ps1 -SkipDelete

# Probar en conexión específica
.\test-crud.ps1 -Connection desa -Entity proc_cab
```

---

**🚀 Sistema listo para producción - Todas las funcionalidades probadas y documentadas**
