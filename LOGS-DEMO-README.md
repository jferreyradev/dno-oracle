# 🎉 ¡API REST con Tabla de Logs Lista para Probar!

## ⚡ Inicio Rápido (2 minutos)

```bash
# 1. Configurar variables de entorno (solo una vez)
cp .env.example .env
nano .env  # Configurar Oracle

# 2. Demo automático completo (configura todo automáticamente)
./run.sh demo-complete
```

¡Eso es todo! El script configura las tablas, inicia la API y ejecuta pruebas automáticamente.

---

## 🚀 Resumen de lo Creado

Hemos creado una **API REST completa** con un sistema de logs robusto:

### 📊 Base de Datos
- **Tabla `SYSTEM_LOGS`**: Para logs del sistema con campos completos
- **Tabla `USERS`**: Para usuarios con relación a logs
- **Procedimientos almacenados**: `create_log`, `get_log_stats`
- **Vista `V_LOGS_WITH_USER`**: Join optimizado entre logs y usuarios
- **Índices optimizados** para consultas rápidas

### 🌐 API Endpoints
- `GET /api/logs` - Obtener logs con filtros y paginación
- `POST /api/logs` - Crear nuevo log
- `GET /api/logs/:id` - Obtener log específico
- `GET /api/logs/stats` - Estadísticas de logs
- `POST /api/logs/cleanup` - Limpiar logs antiguos
- `GET /api/users` - CRUD completo de usuarios
- `POST /api/execute` - Consultas SQL personalizadas
- `GET /api/tables` - Listar tablas
- `GET /api/schema` - Esquema de tablas

## 🔧 Pasos para Probar

### 1. Crear las Tablas en Oracle
```bash
# Opción 1: Usando nuestro ejecutor SQL (RECOMENDADO)
./run.sh setup-logs

# Opción 2: Ejecutar cualquier archivo SQL
./run.sh sql scripts/create-logs-table.sql

# Opción 3: Método tradicional (si prefieres)
sqlplus tu_usuario/tu_password@tu_host:1521/tu_servicio @scripts/create-logs-table.sql
```

**¡Ventajas del ejecutor integrado:**
- ✅ Usa la misma configuración de .env
- ✅ No necesitas recordar credenciales
- ✅ Procesa procedimientos almacenados correctamente
- ✅ Muestra progreso y resultados detallados
- ✅ Maneja errores graciosamente

### 2. Iniciar la API
```bash
# Opción 1: Servidor normal
./run.sh api

# Opción 2: Servidor en modo desarrollo (auto-reload)
./run.sh api:dev
```

### 3. Probar la API
```bash
# Opción 1: Demo automático completo (TODO EN UNO) ⭐
./run.sh demo-complete

# Opción 2: Demo completo con tabla de logs
./run.sh logs:demo

# Opción 3: Solo probar endpoints de logs
./run.sh logs:test

# Opción 4: Demo general de la API
./run.sh api:demo
```

**⭐ RECOMENDADO: `demo-complete`** - Configura todo automáticamente

## 🧪 Pruebas Manuales

### Verificar Estado
```bash
curl http://localhost:8000/api/health
```

### Crear Log
```bash
curl -X POST http://localhost:8000/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "level": "INFO",
    "module": "TEST",
    "message": "Probando la API desde curl",
    "userId": 1,
    "responseStatus": 200,
    "executionTime": 45
  }'
```

### Obtener Logs
```bash
# Todos los logs
curl http://localhost:8000/api/logs?page=1&limit=10

# Solo errores
curl http://localhost:8000/api/logs?level=ERROR

# Buscar por texto
curl http://localhost:8000/api/logs?search=api

# Por fecha
curl http://localhost:8000/api/logs?dateFrom=2025-01-02
```

### Estadísticas
```bash
curl http://localhost:8000/api/logs/stats?date=2025-01-02
```

## 📋 Filtros Disponibles

La API de logs soporta múltiples filtros:

- `page` - Número de página (default: 1)
- `limit` - Registros por página (default: 20, max: 100)
- `level` - Nivel de log (DEBUG, INFO, WARN, ERROR, FATAL)
- `module` - Módulo que generó el log
- `dateFrom` - Fecha desde (YYYY-MM-DD)
- `dateTo` - Fecha hasta (YYYY-MM-DD)
- `userId` - ID del usuario
- `search` - Búsqueda en mensaje, módulo y usuario

**Ejemplo:**
```
GET /api/logs?level=ERROR&module=API&dateFrom=2025-01-01&limit=50
```

## 🔧 Herramientas de Testing

### 1. Postman
```bash
# Importar colección desde:
docs/postman-collection.json
```

### 2. Scripts Automatizados
```bash
# Demo automático completo (configura todo)
./run.sh demo-complete

# Configurar solo las tablas
./run.sh setup-logs

# Ejecutar cualquier archivo SQL
./run.sh sql mi-script.sql

# Prueba completa con setup automático (legacy)
./scripts/setup-logs-demo.sh

# Solo pruebas de logs
deno run --allow-net examples/test-logs-api.js
```

### 3. Comandos del Proyecto
```bash
./run.sh help  # Ver todos los comandos disponibles
```

## 📊 Datos de Ejemplo

El script SQL crea automáticamente:
- **5 usuarios** de ejemplo
- **13+ logs** con diferentes niveles y módulos  
- **Datos históricos** con fechas variadas
- **Procedimientos** y funciones de utilidad

## 🛠️ Personalización

### Agregar Nuevos Campos
Modifica `scripts/create-logs-table.sql` y `api/controllers/logController.ts`

### Nuevos Filtros
Agrega parámetros en `logController.getLogs()`

### Middleware Personalizado
Edita archivos en `api/middleware/`

## 📚 Documentación Completa

- **API General**: `docs/API.md`  
- **Postman**: `docs/postman-collection.json`
- **Ejemplos**: `examples/` (varios archivos .js)
- **Scripts SQL**: `scripts/create-logs-table.sql`

## 🎯 Próximos Pasos

1. **Ejecutar el script SQL** en tu base de datos
2. **Iniciar la API**: `./run.sh api`
3. **Probar endpoints**: `./run.sh logs:test`
4. **Usar Postman** con la colección incluida
5. **Personalizar** según tus necesidades

¡Tu API REST con sistema de logs está **100% funcional** y lista para usar! 🚀
