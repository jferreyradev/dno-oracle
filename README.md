# 🔗 DNO-Oracle

API REST genérica para Oracle Database con soporte multi-conexión.

## 🚀 Inicio Rápido

```powershell
# Configurar .env (ver .env.example)
cp .env.example .env

# Iniciar servidor
deno run --allow-net --allow-read --allow-env --allow-ffi api/server-minimal.ts
# O usar: .\start-server.ps1
```

**URL**: http://localhost:8000

## 📡 Endpoints

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/health` | Estado del sistema |
| `GET /api/connections` | Conexiones activas |
| `GET /api/entities` | Lista de entidades |
| `GET /api/{entidad}` | Consultar entidad |
| `POST /api/{entidad}` | Insertar registro |
| `PUT /api/{entidad}/{id}` | Actualizar registro |
| `DELETE /api/{entidad}/{id}` | Eliminar registro |
| `POST /api/{entidad}/batch` | Inserción en lote |
| `POST /api/procedures/{nombre}` | Ejecutar procedimiento |
| `POST /api/functions/{nombre}` | Ejecutar función |

**Parámetros**: `?connection={conn}`, `?limit={n}`, `?offset={n}`

## 🔧 Configuración

### Variables (.env)
```env
DB_USER=WORKFLOW
DB_PASSWORD=workflow
DB_HOST=10.6.177.180
DB_PORT=1521
DB_SERVICE=HPROD04
DB_SCHEMA=WORKFLOW
PORT=8000
LIB_ORA=C:\oracle\instantclient_21_11
```

### Múltiples Conexiones (config/databases.json)
```json
{
  "connections": {
    "prod": { "host": "10.6.177.180", "service": "HPROD04" },
    "desa": { "host": "10.6.46.17", "service": "HTEST01" }
  }
}
```

### Entidades (config/entities.json)
```json
{
  "entities": {
    "proc_cab": {
      "tableName": "WORKFLOW.PROC_CAB",
      "primaryKey": "ID_PROC_CAB",
      "defaultConnection": "prod",
      "allowedConnections": ["prod", "desa"]
    }
  }
}
```

## 📊 Ejemplos

```bash
# Consulta básica
curl "http://localhost:8000/api/proc_cab?limit=5"

# Insertar registro
curl -X POST "http://localhost:8000/api/proc_cab" \
  -H "Content-Type: application/json" \
  -d '{"DESCRIPCION":"Nuevo proceso","ESTADO":"ACTIVO"}'

# Actualizar registro
curl -X PUT "http://localhost:8000/api/proc_cab/123" \
  -H "Content-Type: application/json" \
  -d '{"ESTADO":"MODIFICADO"}'

# Selección de conexión
curl "http://localhost:8000/api/proc_cab?connection=desa&limit=3"

# Eliminar registro
curl -X DELETE "http://localhost:8000/api/proc_cab/123"
```

## ✅ Estado

- **Servidor**: ✅ Funcional
- **Conexiones**: ✅ 3 pools Oracle
- **Entidades**: ✅ 2 funcionales
- **CRUD**: ✅ Create, Read, Update, Delete
- **Batch**: ✅ Inserción múltiple
- **Procedimientos**: ✅ Llamadas a SP y funciones
- **Selección de conexión**: ✅ Implementada
- **Paginación**: ✅ Funcional

## 📁 Archivos Principales

- `api/server-minimal.ts` - Servidor principal
- `.env` - Configuración principal  
- `config/databases.json` - Múltiples conexiones
- `config/entities.json` - Definición de entidades
- `start-server.ps1` - Script de inicio
- `test.ps1` - Script de pruebas

## 🧪 Pruebas

```powershell
# Ejecutar pruebas básicas
.\test.ps1

# Pruebas CRUD completas  
.\test-crud.ps1

# Validación completa de API  
.\validar-api.ps1

# Generar ejemplos en tiempo real
.\ejemplos-completos.ps1
```

## 📚 Documentación

- **GUIA-COMPLETA-API.md** - 📖 Guía completa con todos los endpoints y ejemplos
- **EJEMPLOS-CRUD.md** - 📝 Ejemplos detallados de operaciones CRUD y procedimientos
- **API-EJEMPLOS.md** - 📡 Ejemplos básicos de peticiones API  
- **SISTEMA-FUNCIONANDO.md** - ✅ Estado del sistema y funcionalidades

## 🧪 Scripts de Prueba y Validación

```powershell
# Pruebas básicas automáticas
.\test.ps1

# Pruebas CRUD completas
.\test-crud.ps1

# Validación completa de la API
.\validar-api.ps1

# Generador de ejemplos en tiempo real
.\ejemplos-completos.ps1

# Generar reporte HTML detallado
.\validar-api.ps1 -DetailedReport

# Ver ejemplos con respuestas completas
.\ejemplos-completos.ps1 -Verbose -SaveToFile
```

---

**Sistema listo para uso en producción**
