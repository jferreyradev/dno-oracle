# 🗃️ Configuración de Múltiples Bases de Datos - DNO-Oracle

## Descripción

Este archivo muestra cómo configurar múltiples conexiones a bases de datos Oracle en DNO-Oracle. El sistema permite conectarse a diferentes bases de datos simultáneamente y enrutar peticiones específicas a cada una.

## Configuración

### Variables de Entorno (Conexión Por Defecto)

La conexión por defecto se configura mediante variables de entorno en el archivo `.env`:

```env
# Conexión principal
DB_USER=usuario_principal
DB_PASSWORD=password_principal
DB_HOST=oracle-prod.empresa.com
DB_PORT=1521
DB_SERVICE=PROD
DB_SCHEMA=APP_SCHEMA

# Configuración de pool
POOL_MAX=20
POOL_MIN=5
POOL_INCREMENT=2
POOL_TIMEOUT=4
```

### Conexiones Adicionales

Las conexiones adicionales se configuran en el archivo `config/databases.json`:

```json
[
  {
    "name": "desarrollo",
    "user": "dev_user",
    "password": "dev_password",
    "connectString": "oracle-dev.empresa.com:1521/DEV",
    "poolMax": 10,
    "poolMin": 2,
    "description": "Base de datos de desarrollo",
    "schema": "DEV_SCHEMA"
  },
  {
    "name": "reportes",
    "user": "reports_user",
    "password": "reports_password",
    "connectString": "oracle-bi.empresa.com:1521/REPORTS",
    "poolMax": 15,
    "poolMin": 3,
    "description": "Base de datos de reportes y BI",
    "schema": "REPORTS_SCHEMA"
  },
  {
    "name": "testing",
    "user": "test_user",
    "password": "test_password",
    "connectString": "localhost:1521/XE",
    "poolMax": 5,
    "poolMin": 1,
    "description": "Base de datos local para pruebas",
    "schema": "TEST_SCHEMA"
  }
]
```

### Configuración de Entidades con Conexiones Específicas

Puedes configurar que ciertas entidades usen conexiones específicas modificando `config/entities.json`:

```json
{
  "entities": {
    "usuarios": {
      "tableName": "USUARIOS",
      "primaryKey": "ID",
      "displayName": "Usuarios",
      "description": "Gestión de usuarios del sistema",
      "defaultConnection": "default",
      "allowedConnections": ["default", "desarrollo"],
      "fields": {
        "ID": { "type": "NUMBER", "primaryKey": true },
        "NOMBRE": { "type": "VARCHAR2", "length": 100, "required": true },
        "EMAIL": { "type": "VARCHAR2", "length": 200, "required": true }
      }
    },
    "reportes_ventas": {
      "tableName": "VENTAS_SUMMARY",
      "primaryKey": "ID",
      "displayName": "Reportes de Ventas",
      "description": "Reportes consolidados de ventas",
      "defaultConnection": "reportes",
      "allowedConnections": ["reportes"],
      "fields": {
        "ID": { "type": "NUMBER", "primaryKey": true },
        "PERIODO": { "type": "VARCHAR2", "length": 20 },
        "TOTAL": { "type": "NUMBER", "precision": 15, "scale": 2 }
      }
    }
  }
}
```

## Uso de Múltiples Conexiones

### 1. Mediante Headers HTTP

```bash
# Usar conexión específica con header
curl -H "X-Database-Connection: desarrollo" \
     http://localhost:8000/api/usuarios

# Usar conexión de reportes
curl -H "X-Database-Connection: reportes" \
     http://localhost:8000/api/reportes_ventas
```

### 2. Mediante Query Parameters

```bash
# Usar conexión específica con query parameter
curl "http://localhost:8000/api/usuarios?connection=desarrollo"

# Usar conexión de reportes
curl "http://localhost:8000/api/reportes_ventas?connection=reportes"
```

### 3. Programáticamente (JavaScript)

```javascript
// Usando fetch con header específico
const response = await fetch('/api/usuarios', {
  headers: {
    'X-Database-Connection': 'desarrollo',
    'Content-Type': 'application/json'
  }
});

// Usando query parameter
const response2 = await fetch('/api/usuarios?connection=desarrollo');

// La respuesta incluye información de la conexión usada
const data = await response.json();
console.log('Conexión usada:', data.meta.connectionUsed);
```

## Gestión de Conexiones

### Endpoints de Administración

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/connections` | GET | Listar todas las conexiones |
| `/api/connections/:name` | GET | Información de conexión específica |
| `/api/connections/:name/test` | GET | Probar conectividad |
| `/api/connections/test-all` | GET | Probar todas las conexiones |
| `/api/connections/:name/set-default` | PUT | Establecer conexión por defecto |
| `/api/connections` | POST | Añadir nueva conexión |
| `/api/connections/stats/summary` | GET | Estadísticas generales |
| `/api/connections/help` | GET | Ayuda y documentación |

### Ejemplos de Gestión

```bash
# Listar todas las conexiones
curl http://localhost:8000/api/connections

# Probar conectividad de una conexión
curl http://localhost:8000/api/connections/desarrollo/test

# Probar todas las conexiones
curl http://localhost:8000/api/connections/test-all

# Estadísticas de conexiones
curl http://localhost:8000/api/connections/stats/summary

# Establecer conexión por defecto
curl -X PUT http://localhost:8000/api/connections/desarrollo/set-default

# Añadir nueva conexión
curl -X POST http://localhost:8000/api/connections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "nueva_db",
    "user": "usuario",
    "password": "password",
    "connectString": "host:puerto/servicio",
    "description": "Nueva base de datos",
    "poolMax": 10
  }'
```

## Ventajas del Sistema Multi-Conexión

### ✅ **Flexibilidad**
- Conectar a múltiples bases de datos Oracle simultáneamente
- Enrutar peticiones específicas a bases de datos específicas
- Configuración por entidad o por petición

### ✅ **Rendimiento**
- Pools de conexiones independientes para cada base de datos
- Cache separado por conexión
- Optimización específica por entorno

### ✅ **Seguridad**
- Credenciales separadas por base de datos
- Restricciones de acceso por entidad
- Aislamiento de datos entre entornos

### ✅ **Escalabilidad**
- Distribución de carga entre múltiples bases de datos
- Configuración de pools específica por entorno
- Fácil añadir/quitar conexiones

## Casos de Uso Comunes

### 1. **Separación por Entornos**
```
- Producción: oracle-prod.empresa.com
- Desarrollo: oracle-dev.empresa.com  
- Pruebas: oracle-test.empresa.com
```

### 2. **Separación Funcional**
```
- Transaccional: oracle-oltp.empresa.com
- Reportes: oracle-olap.empresa.com
- Archivos: oracle-arch.empresa.com
```

### 3. **Separación Geográfica**
```
- América: oracle-us.empresa.com
- Europa: oracle-eu.empresa.com
- Asia: oracle-ap.empresa.com
```

## Troubleshooting

### Problemas Comunes

1. **Conexión no encontrada**
   ```json
   {
     "success": false,
     "error": "No existe la conexión 'nombre_conexion'"
   }
   ```
   **Solución**: Verificar que la conexión esté configurada en `databases.json`

2. **Sin permisos para usar conexión**
   ```json
   {
     "success": false,
     "error": "Conexión no permitida para esta entidad"
   }
   ```
   **Solución**: Añadir la conexión a `allowedConnections` en la configuración de la entidad

3. **Error de conectividad**
   ```json
   {
     "success": false,
     "error": "ORA-12541: TNS:no listener"
   }
   ```
   **Solución**: Verificar host, puerto y servicio en la configuración

### Scripts de Diagnóstico

```bash
# Probar script de múltiples conexiones
.\test-multi-connections.ps1

# Verificar configuración
.\verify-setup.ps1

# Ver logs del servidor
# Los logs mostrarán qué conexión se usa para cada petición
```

## Configuración de Producción

### Recomendaciones

1. **Variables de Entorno**: Usar variables de entorno para credenciales sensibles
2. **Pools de Conexiones**: Configurar pools apropiados para cada entorno
3. **Monitoreo**: Usar endpoints de estadísticas para monitorear salud de conexiones
4. **Backup**: Mantener múltiples conexiones para alta disponibilidad
5. **Seguridad**: Usar credenciales mínimas necesarias por conexión

### Ejemplo de Configuración de Producción

```json
[
  {
    "name": "primary",
    "user": "${PROD_DB_USER}",
    "password": "${PROD_DB_PASSWORD}", 
    "connectString": "${PROD_DB_HOST}:${PROD_DB_PORT}/${PROD_DB_SERVICE}",
    "poolMax": 50,
    "poolMin": 10,
    "description": "Base de datos principal de producción"
  },
  {
    "name": "readonly",
    "user": "${RO_DB_USER}",
    "password": "${RO_DB_PASSWORD}",
    "connectString": "${RO_DB_HOST}:${RO_DB_PORT}/${RO_DB_SERVICE}",
    "poolMax": 30,
    "poolMin": 5,
    "description": "Base de datos de solo lectura para reportes"
  }
]
```

---

**¡El sistema de múltiples conexiones está listo para usar!** 🚀

Para más información, consulta:
- `test-multi-connections.ps1` - Script de pruebas completo
- `/api/connections/help` - Ayuda en línea
- `/api/info` - Documentación de la API
