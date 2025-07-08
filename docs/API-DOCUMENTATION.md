# DNO-Oracle API Documentation

## Resumen

DNO-Oracle es un sistema completo de gestión de datos Oracle con una API REST robusta y una interfaz web moderna. Proporciona funcionalidades avanzadas para la gestión de entidades, consultas SQL, procedimientos almacenados, importación de archivos y más.

## Características Principales

- ✅ **Gestión dinámica de entidades** desde el frontend
- ✅ **Generación automática de entidades** desde tablas físicas Oracle
- ✅ **Múltiples conexiones Oracle** (default, prod, desa) con validación
- ✅ **Visualización de datos reales** con paginación
- ✅ **Consultas SQL directas** y seguras
- ✅ **Ejecución de procedimientos almacenados**
- ✅ **Importación de archivos CSV**
- ✅ **Sistema de cache en memoria**
- ✅ **Interfaz web moderna** (modo FULL)
- ✅ **Solo API** (modo API_ONLY)
- ✅ **Validación de conexiones** por entidad
- ✅ **Manejo robusto de errores** con mensajes específicos

## Estado Actual - Depuración y Robustecimiento

### 🛠️ Mejoras de Depuración Implementadas

1. **Configuración de Conexiones por Entidad:**
   - Agregado `allowedConnections` a todas las entidades
   - Validación previa antes de operaciones
   - Mensajes de error específicos para conexiones no válidas

2. **Manejo Mejorado de Errores:**
   - Errores específicos por tipo (Oracle, conexión, tabla no existente)
   - Mensajes informativos para el usuario
   - Logging detallado en servidor

3. **Validaciones Frontend:**
   - Verificación de conexiones disponibles antes de operaciones
   - Feedback visual para conexiones no válidas
   - Mejor manejo de errores de red y timeout

4. **Robustecimiento Backend:**
   - Validación de `allowedConnections` en endpoints de entidades
   - Mejor manejo de excepciones Oracle
   - Logging mejorado para depuración

## Configuración de Conexiones por Entidad

### Estructura Mejorada de Entidades

Todas las entidades ahora incluyen configuración de conexiones válidas:

```json
{
  "entities": {
    "proc_cab": {
      "tableName": "WORKFLOW.PROC_CAB",
      "primaryKey": "ID_PROC_CAB",
      "defaultConnection": "prod",
      "allowedConnections": ["prod", "desa"],
      "fields": { ... }
    },
    "USUARIOS": {
      "tableName": "USUARIOS",
      "primaryKey": "ID_USUARIO", 
      "defaultConnection": "default",
      "allowedConnections": ["default", "prod"],
      "fields": { ... }
    }
  }
}
```

### Validaciones Implementadas

- **allowedConnections**: Array de conexiones válidas para la entidad
- **Validación previa**: Se verifica que la conexión esté permitida antes de ejecutar operaciones
- **Mensajes específicos**: Errores informativos cuando se usa una conexión no válida

## Manejo Robusto de Errores

### Tipos de Errores Identificados

1. **Errores de Conexión Oracle**:
   ```json
   {
     "success": false,
     "error": "ORA-12154: TNS:could not resolve the connect identifier specified",
     "connectionUsed": "desa"
   }
   ```

2. **Entidad No Encontrada**:
   ```json
   {
     "success": false,
     "message": "Entidad 'USUARIOS' no encontrada en la configuración"
   }
   ```

3. **Conexión No Permitida**:
   ```json
   {
     "success": false,
     "message": "La conexión 'desa' no está permitida para la entidad 'USUARIOS'. Conexiones válidas: default, prod"
   }
   ```

4. **Tabla No Existe en Conexión**:
   ```json
   {
     "success": false,
     "message": "La tabla 'USUARIOS' no existe en la conexión 'desa'"
   }
   ```

### Frontend - Feedback Mejorado

- **Validación visual**: Bordes de color para conexiones válidas/inválidas
- **Mensajes específicos**: Toast notifications con información detallada
- **Prevención de errores**: Validación antes de operaciones costosas

## Endpoints Principales

### Sistema y Documentación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/info` | Documentación completa de la API |
| GET | `/api/health` | Estado de salud del sistema |
| GET | `/` | Página de inicio (modo FULL) |

### Gestión de Entidades

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/entities` | Listar todas las entidades configuradas |
| GET | `/api/entities/:name` | Obtener una entidad específica |
| GET | `/api/entities/:name/columns` | **NUEVO**: Columnas reales desde Oracle |
| GET | `/api/entities/:name/data` | **NUEVO**: Datos reales con paginación |
| POST | `/api/entities` | Crear/actualizar entidades |
| DELETE | `/api/entities/:name` | Eliminar una entidad |
| POST | `/api/entities/generate` | **NUEVO**: Generar entidad desde tabla física |

### Base de Datos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/db/tables` | Listar tablas físicas Oracle |
| GET | `/api/query/connections` | Listar conexiones disponibles |

### Consultas SQL

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/query` | Consulta SQL general |
| POST | `/api/query/select` | Consulta SELECT segura |
| POST | `/api/query/modify` | Consultas de modificación |
| POST | `/api/query/validate` | Validar sintaxis SQL |
| POST | `/api/query/explain` | Plan de ejecución |

### Procedimientos Almacenados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/procedures/call` | Ejecutar procedimiento |
| POST | `/api/procedures/function` | Ejecutar función |
| POST | `/api/procedures/cursor` | Procesar cursor |
| GET | `/api/procedures/list` | Listar procedimientos |
| GET | `/api/procedures/info/:name` | Información del procedimiento |
| GET | `/api/procedures/help` | Ayuda sobre procedimientos |

### Importación de Archivos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/import/csv` | Importar archivo CSV |
| POST | `/api/import/validate` | Validar datos |
| POST | `/api/import/headers` | Obtener headers |
| POST | `/api/import/mapping` | Mapear columnas |
| GET | `/api/import/info` | Información de importación |
| GET | `/api/import/columns/:tableName` | Columnas de tabla |

### Cache (si habilitado)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/cache/stats` | Estadísticas globales |
| DELETE | `/api/cache/clear-all` | Limpiar cache global |
| GET | `/api/:entity/cache/stats` | Stats por entidad |
| DELETE | `/api/:entity/cache/clear` | Limpiar por entidad |

## Funcionalidades Avanzadas

### 1. Múltiples Conexiones Oracle

El sistema soporta múltiples conexiones Oracle simultáneas:

**Conexiones disponibles:**
- `default`: Conexión principal
- `prod`: Producción
- `desa`: Desarrollo/Testing

**Uso:**
```bash
# Header HTTP
X-Connection: prod

# Query parameter
GET /api/db/tables?connection=desa

# Body parameter (POST/PUT)
{
  "connection": "prod",
  "data": { ... }
}
```

### 2. Generación Automática de Entidades

**Endpoint:** `POST /api/entities/generate`

Genera entidades automáticamente desde tablas físicas Oracle:

```bash
curl -X POST "http://localhost:8000/api/entities/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "PROC_CAB",
    "connectionName": "default",
    "entityName": "procesos_cabecera"
  }'
```

**Características:**
- ✅ Detección automática de columnas
- ✅ Mapeo de tipos Oracle a tipos estándar
- ✅ Detección de claves primarias
- ✅ Información de longitud, precisión y restricciones
- ✅ Vista previa antes de guardar

### 3. Visualización de Datos Reales

**Endpoint:** `GET /api/entities/:name/data`

Obtiene datos reales de las tablas Oracle:

```bash
curl "http://localhost:8000/api/entities/proc_cab/data?page=1&limit=25&connection=prod"
```

**Características:**
- ✅ Paginación automática
- ✅ Ordenamiento por clave primaria
- ✅ Información de totales
- ✅ Navegación entre páginas

### 4. Inspección de Estructura

**Endpoint:** `GET /api/entities/:name/columns`

Obtiene la estructura real de las tablas:

```bash
curl "http://localhost:8000/api/entities/proc_cab/columns?connection=default"
```

**Información retornada:**
- Nombre de columna
- Tipo de datos Oracle
- Longitud/Precisión
- Nullable (Sí/No)
- Valor por defecto
- Posición en la tabla

## Formatos de Respuesta

### Respuesta Exitosa
```json
{
  "success": true,
  "data": {
    // Datos solicitados
  },
  "meta": {
    // Información adicional (opcional)
  }
}
```

### Respuesta con Error
```json
{
  "success": false,
  "message": "Descripción del error",
  "error": "Detalles técnicos",
  "timestamp": "2025-07-08T18:00:00.000Z"
}
```

### Respuesta con Paginación
```json
{
  "success": true,
  "data": {
    "records": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalRecords": 150,
      "totalPages": 3,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

## Configuración de Entidades

Las entidades se configuran en `config/entities.json`:

```json
{
  "entities": {
    "proc_cab": {
      "tableName": "WORKFLOW.PROC_CAB",
      "primaryKey": "ID_PROC_CAB",
      "displayName": "Procesos de Cabecera",
      "description": "Tabla de procesos de cabecera del sistema workflow",
      "fields": {
        "ID_PROC_CAB": {
          "type": "NUMBER",
          "required": true,
          "primaryKey": true,
          "autoIncrement": true
        },
        // ... más campos
      },
      "operations": {
        "create": true,
        "read": true,
        "update": true,
        "delete": true
      },
      "cache": {
        "enabled": true,
        "ttl": 300
      }
    }
  }
}
```

## Ejemplos de Uso

### 1. Listar Tablas Físicas
```bash
curl "http://localhost:8000/api/db/tables?connection=desa"
```

### 2. Generar Entidad desde Tabla
```bash
curl -X POST "http://localhost:8000/api/entities/generate" \
  -H "Content-Type: application/json" \
  -d '{"tableName": "AGENTESJUB", "connectionName": "desa"}'
```

### 3. Ver Datos de Entidad
```bash
curl "http://localhost:8000/api/entities/proc_cab/data?page=1&limit=10"
```

### 4. Ver Estructura de Tabla
```bash
curl "http://localhost:8000/api/entities/proc_cab/columns"
```

### 5. Ejecutar Consulta SQL
```bash
curl -X POST "http://localhost:8000/api/query/select" \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM PROC_CAB WHERE MOSTRAR = 1",
    "connection": "prod"
  }'
```

## Estados del Sistema

### Health Check
```bash
curl "http://localhost:8000/api/health"
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2025-07-08T18:00:00.000Z",
    "uptime": 3600,
    "cache": {
      "enabled": true,
      "size": 42,
      "hitRate": 0.85
    }
  }
}
```

## Interfaz Web

En modo FULL, el sistema incluye una interfaz web moderna en `http://localhost:8000`:

### Pestañas Disponibles:
- **📤 Importar Archivos**: Subir y procesar archivos CSV
- **🗂️ Gestionar Tablas**: Explorar tablas físicas de Oracle
- **🏗️ Entidades**: Gestión dinámica de entidades
  - ➕ Nueva Entidad (manual)
  - 🔧 Generar desde Tabla (automático)
  - 👁️ Ver Datos reales
  - 🔍 Ver Columnas reales
- **🔍 Consultas SQL**: Ejecutar consultas directas
- **⚙️ Procedimientos**: Ejecutar procedimientos almacenados

### Funcionalidades del Frontend:
- ✅ Selector de conexión multi-base
- ✅ Generación automática de entidades
- ✅ Vista previa de datos con paginación
- ✅ Modales de estructura de tablas
- ✅ Editor JSON con validación
- ✅ Actualización en tiempo real

## Solución de Problemas

### Errores Comunes

1. **Tabla no encontrada (ORA-00942)**
   - Verificar que la tabla existe en la conexión especificada
   - Comprobar permisos de acceso

2. **Entidad no configurada**
   - Generar entidad desde tabla física
   - Verificar `config/entities.json`

3. **Error de conexión**
   - Verificar configuración en `config/databases.json`
   - Comprobar conectividad de red

4. **Cache no actualizado**
   - Usar endpoint de limpiar cache
   - Reiniciar servidor si es necesario

### Logs del Sistema

El sistema registra todas las operaciones:
- Conexiones de base de datos
- Operaciones de entidades
- Consultas SQL ejecutadas
- Errores y excepciones

## Versión y Compatibilidad

- **Versión:** 2.0.0
- **Deno:** Requerido
- **Oracle Database:** 11g+
- **Node.js OracleDB:** 6.0.2+

## Soporte

Para soporte técnico o reportar problemas:
- Verificar logs del servidor
- Usar endpoints de health check
- Revisar esta documentación
- Consultar la documentación interactiva en `/api/info`
