# API REST - DNO-Oracle

API REST completa para interactuar con bases de datos Oracle usando Deno.

## 🚀 Inicio Rápido

### 1. Configurar Variables de Entorno

```bash
# Copiar archivo de configuración
cp .env.example .env

# Editar variables de Oracle
nano .env
```

### 2. Iniciar Servidor API

```bash
# Modo producción
./run.sh api

# Modo desarrollo (con auto-reload)
./run.sh api:dev
```

El servidor estará disponible en: `http://localhost:8000`

## 📋 Endpoints Disponibles

### Estado y Información

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api` | Información general de la API |
| GET | `/api/health` | Estado de la API y base de datos |

### Gestión de Usuarios

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/users` | Obtener usuarios (con paginación) |
| POST | `/api/users` | Crear nuevo usuario |
| GET | `/api/users/:id` | Obtener usuario por ID |
| PUT | `/api/users/:id` | Actualizar usuario |
| DELETE | `/api/users/:id` | Eliminar usuario |

### Consultas SQL

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/execute` | Ejecutar consulta SELECT |
| POST | `/api/procedure` | Ejecutar procedimiento almacenado |
| POST | `/api/transaction` | Ejecutar múltiples consultas en transacción |

### Metadatos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/tables` | Listar tablas disponibles |
| GET | `/api/schema` | Obtener esquema de una tabla |

## 🔧 Ejemplos de Uso

### Verificar Estado

```bash
curl http://localhost:8000/api/health
```

### Crear Usuario

```bash
curl -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "fullName": "Usuario de Prueba",
    "isActive": true
  }'
```

### Obtener Usuarios con Paginación

```bash
curl "http://localhost:8000/api/users?page=1&limit=10&search=admin"
```

### Ejecutar Consulta SQL

```bash
curl -X POST http://localhost:8000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT table_name FROM user_tables WHERE rownum <= 5",
    "binds": []
  }'
```

### Ejecutar Procedimiento Almacenado

```bash
curl -X POST http://localhost:8000/api/procedure \
  -H "Content-Type: application/json" \
  -d '{
    "procedure": "DBMS_OUTPUT.PUT_LINE",
    "binds": {"line": "Hola desde la API!"},
    "type": "procedure"
  }'
```

### Obtener Esquema de Tabla

```bash
curl "http://localhost:8000/api/schema?table=USERS&owner=MYSCHEMA"
```

### Listar Tablas

```bash
curl "http://localhost:8000/api/tables?search=user"
```

## 🏗️ Estructura del Proyecto API

```
api/
├── server.ts              # Servidor principal
├── routes/
│   └── index.ts          # Enrutador principal
├── controllers/
│   ├── healthController.ts   # Estado de la API
│   ├── userController.ts     # Gestión de usuarios
│   └── queryController.ts    # Consultas SQL
├── middleware/
│   ├── cors.ts              # CORS
│   ├── logger.ts            # Logging
│   ├── errorHandler.ts      # Manejo de errores
│   └── auth.ts              # Autenticación (opcional)
└── models/
    ├── User.ts              # Modelo de usuario
    └── ApiTypes.ts          # Tipos de la API
```

## 📊 Respuestas de la API

### Respuesta Exitosa

```json
{
  "success": true,
  "data": { ... },
  "message": "Operación exitosa"
}
```

### Respuesta con Paginación

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false,
    "nextPage": 2,
    "prevPage": null
  }
}
```

### Respuesta de Error

```json
{
  "success": false,
  "error": "Descripción del error",
  "details": "Detalles técnicos"
}
```

## 🔒 Seguridad

### Autenticación (Opcional)

La API soporta autenticación con Bearer Token:

```http
Authorization: Bearer tu-api-key-aqui
```

Para habilitar, configure la variable de entorno:

```bash
API_TOKEN=tu-token-secreto
```

### Rate Limiting

- Límite: 100 requests por minuto por IP
- Headers de respuesta incluyen información de límites

### Validación de Consultas

- Solo consultas SELECT permitidas en `/api/execute`
- Validación de parámetros en todos los endpoints
- Sanitización de entradas

## 🛠️ Configuración Avanzada

### Variables de Entorno API

```bash
# Puerto del servidor (default: 8000)
API_PORT=8000

# Host del servidor (default: localhost)  
API_HOST=localhost

# Token de autenticación (opcional)
API_TOKEN=tu-token-secreto

# Habilitar logs detallados
DEBUG=true
```

### Middleware Personalizado

Para agregar middleware personalizado, edite `api/server.ts`:

```typescript
// Ejemplo: middleware de logging personalizado
function customLogger(request: Request) {
  console.log(`${new Date().toISOString()} ${request.method} ${request.url}`);
}
```

## 🧪 Testing de la API

### Ejecutar Ejemplos

```bash
# Ejecutar ejemplos interactivos
deno run --allow-net examples/api-usage.js
```

### Crear Tabla de Prueba

```bash
# Ejecutar script SQL para crear tabla de usuarios
sqlplus usuario/password@host:puerto/servicio @scripts/create-users-table.sql
```

### Usar herramientas de Testing

- **Postman**: Importar colección de endpoints
- **curl**: Comandos de ejemplo incluidos
- **HTTPie**: `http GET localhost:8000/api/health`

## 📝 Logs y Monitoreo

### Logs del Servidor

Los logs incluyen:
- Todas las peticiones HTTP
- Errores de base de datos
- Estadísticas de conexiones
- Información de autenticación

### Monitoreo de Salud

El endpoint `/api/health` proporciona:
- Estado de la conexión a Oracle
- Estadísticas del pool de conexiones
- Tiempo de actividad del servidor
- Versión de la API

## 🤝 Contribuir

1. Fork del proyecto
2. Crear rama para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

## 🆘 Soporte

- **Documentación**: Ver `README.md` principal
- **Issues**: Reportar en GitHub
- **Ejemplos**: Carpeta `examples/`
- **Logs**: Revisar salida del servidor para debug
