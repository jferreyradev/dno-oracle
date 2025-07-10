# 📡 DNO-Oracle - Ejemplos de API

## 🚀 Peticiones Soportadas

### 1. Endpoints del Sistema

#### Health Check
```bash
GET /api/health
```
**Respuesta**:
```json
{
  "success": true,
  "message": "DNO-Oracle API está funcionando",
  "timestamp": "2025-07-10T15:30:45.123Z",
  "mode": "minimal",
  "version": "1.0.0"
}
```

#### Información del Sistema
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

### 2. Gestión de Conexiones

#### Listar Conexiones
```bash
GET /api/connections
```
**Respuesta**:
```json
{
  "success": true,
  "data": {
    "connections": [
      {
        "name": "default",
        "host": "10.6.177.180",
        "port": 1521,
        "service": "HPROD04",
        "isActive": true,
        "isDefault": true
      },
      {
        "name": "prod",
        "host": "10.6.177.180", 
        "port": 1521,
        "service": "HPROD04",
        "isActive": true,
        "isDefault": false
      },
      {
        "name": "desa",
        "host": "10.6.46.17",
        "port": 1521,
        "service": "HTEST01",
        "isActive": true,
        "isDefault": false
      }
    ],
    "summary": {
      "total": 3,
      "active": 3,
      "default": "default"
    }
  }
}
```

#### Probar Todas las Conexiones
```bash
GET /api/connections/test-all
```
**Respuesta**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "name": "default",
        "success": true,
        "responseTime": 45,
        "timestamp": "2025-07-10T15:30:45.123Z"
      },
      {
        "name": "prod",
        "success": true,
        "responseTime": 38,
        "timestamp": "2025-07-10T15:30:45.156Z"
      },
      {
        "name": "desa",
        "success": true,
        "responseTime": 52,
        "timestamp": "2025-07-10T15:30:45.189Z"
      }
    ],
    "summary": {
      "total": 3,
      "successful": 3,
      "failed": 0,
      "averageResponseTime": 45
    }
  }
}
```

### 3. Gestión de Entidades

#### Listar Entidades
```bash
GET /api/entities
```
**Respuesta**:
```json
{
  "success": true,
  "data": {
    "entities": [
      {
        "name": "proc_cab",
        "tableName": "WORKFLOW.PROC_CAB",
        "primaryKey": "ID_PROC_CAB",
        "displayName": "Procesos de Cabecera",
        "description": "Tabla de procesos de cabecera del sistema workflow",
        "operations": {
          "create": true,
          "read": true,
          "update": true,
          "delete": true
        },
        "defaultConnection": "prod",
        "allowedConnections": ["prod", "desa"]
      },
      {
        "name": "TMP_RENOV_CARGO",
        "tableName": "WORKFLOW.TMP_RENOV_CARGO",
        "primaryKey": "ID",
        "displayName": "Tmp Renov Cargo",
        "description": "Tabla temporal de renovación de cargos",
        "operations": {
          "create": true,
          "read": true,
          "update": true,
          "delete": true
        },
        "defaultConnection": "prod",
        "allowedConnections": ["prod", "desa"]
      }
    ],
    "summary": {
      "total": 2,
      "connectionsUsed": ["prod"],
      "multiConnectionSupport": true
    }
  }
}
```

### 4. Consulta de Datos

#### Consulta Básica
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
      "DESCRIPCION": "CAMBIO DE PERIODO",
      "OBSERVACIONES": "Genera presentismo para docentes y transferidos...",
      "MOSTRAR": 0,
      "RNUM": 1
    },
    {
      "ID_PROC_CAB": 2,
      "DESCRIPCION": "FDO CONTROL",
      "OBSERVACIONES": "GENERA CARGOS, ACUMULADOS Y PENSIONES",
      "MOSTRAR": 0,
      "RNUM": 2
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "totalRows": 2
  },
  "meta": {
    "entity": "proc_cab",
    "tableName": "WORKFLOW.PROC_CAB",
    "primaryKey": "ID_PROC_CAB",
    "displayName": "Procesos de Cabecera",
    "connectionUsed": "prod",
    "availableConnections": ["prod", "desa"]
  }
}
```

#### Consulta con Límite
```bash
GET /api/proc_cab?limit=5
```

#### Consulta con Paginación
```bash
GET /api/proc_cab?limit=10&offset=20
```

### 5. Selección de Conexión

#### Consulta con Conexión Específica
```bash
GET /api/proc_cab?connection=desa&limit=5
```
**Respuesta**:
```json
{
  "success": true,
  "data": [
    {
      "ID_PROC_CAB": 1,
      "DESCRIPCION": "CAMBIO DE PERIODO",
      "OBSERVACIONES": "Genera presentismo para docentes...",
      "MOSTRAR": 3,
      "RNUM": 1
    }
  ],
  "pagination": {
    "limit": 5,
    "offset": 0,
    "totalRows": 1
  },
  "meta": {
    "entity": "proc_cab",
    "tableName": "WORKFLOW.PROC_CAB",
    "primaryKey": "ID_PROC_CAB",
    "displayName": "Procesos de Cabecera",
    "connectionUsed": "desa",
    "availableConnections": ["prod", "desa"]
  }
}
```

#### Consulta con Conexión + Paginación
```bash
GET /api/proc_cab?connection=prod&limit=10&offset=5
```

#### Otra Entidad con Conexión
```bash
GET /api/TMP_RENOV_CARGO?connection=desa&limit=3
```

### 6. Manejo de Errores

#### Conexión No Permitida
```bash
GET /api/proc_cab?connection=default
```
**Respuesta**:
```json
{
  "success": false,
  "error": "Conexión 'default' no permitida para entidad 'proc_cab'",
  "allowedConnections": ["prod", "desa"]
}
```

#### Entidad No Encontrada
```bash
GET /api/entidad_inexistente
```
**Respuesta**:
```json
{
  "success": false,
  "error": "Entidad 'entidad_inexistente' no encontrada"
}
```

#### Tabla Inexistente
```bash
GET /api/USUARIOS
```
**Respuesta**:
```json
{
  "success": false,
  "error": "Error al consultar entidad 'USUARIOS'",
  "details": "ORA-00942: table or view does not exist"
}
```

## 📋 Parámetros de Consulta

### Paginación
- **`limit`**: Número máximo de registros (1-100, default: 20)
- **`offset`**: Desplazamiento inicial (default: 0)

### Selección de Conexión
- **`connection`**: Nombre de la conexión a usar (debe estar en allowedConnections)

### Ejemplos Combinados
```bash
# Límite simple
GET /api/proc_cab?limit=5

# Paginación
GET /api/proc_cab?limit=10&offset=20

# Conexión específica
GET /api/proc_cab?connection=desa

# Conexión + límite
GET /api/proc_cab?connection=prod&limit=15

# Conexión + paginación completa
GET /api/proc_cab?connection=desa&limit=10&offset=30
```

## 🔧 Herramientas de Prueba

### Script Incluido
```powershell
# Generar ejemplos en tiempo real
.\ejemplos.ps1
```

### PowerShell
```powershell
# Usando Invoke-RestMethod
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/proc_cab?limit=5"
$response | ConvertTo-Json -Depth 10

# Usando curl
curl -s "http://localhost:8000/api/proc_cab?limit=5" | ConvertFrom-Json
```

### Bash/Linux
```bash
# Usando curl
curl -s "http://localhost:8000/api/proc_cab?limit=5" | jq '.'

# Usando wget
wget -qO- "http://localhost:8000/api/proc_cab?limit=5"
```

### Script de Prueba
```powershell
# Ejecutar script de pruebas
.\test.ps1
```

## 📊 Códigos de Respuesta HTTP

- **200 OK**: Petición exitosa
- **400 Bad Request**: Conexión no permitida o parámetros inválidos
- **404 Not Found**: Entidad no encontrada
- **500 Internal Server Error**: Error de base de datos o servidor

## 🎯 Casos de Uso Comunes

### 1. Exploración del Sistema
```bash
GET /api/health          # Verificar estado
GET /api/connections     # Ver conexiones disponibles
GET /api/entities        # Ver entidades disponibles
```

### 2. Consulta de Datos
```bash
GET /api/proc_cab?limit=10                    # Primeros 10 registros
GET /api/proc_cab?connection=desa&limit=5     # Datos de desarrollo
GET /api/proc_cab?limit=5&offset=10           # Página 2 (registros 11-15)
```

### 3. Comparación entre Entornos
```bash
GET /api/proc_cab?connection=prod&limit=5     # Datos de producción
GET /api/proc_cab?connection=desa&limit=5     # Datos de desarrollo
```

### 4. Validación de Conectividad
```bash
GET /api/connections/test-all                 # Probar todas las conexiones
GET /api/health                               # Estado general del sistema
```

---

**Todos los endpoints están disponibles en**: http://localhost:8000
