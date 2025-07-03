# 🚀 Oracle API Server - Proyecto Independiente

## ✅ **Configuración Finalizada**

Este proyecto ahora es **completamente independiente** y no requiere librerías externas adicionales. Todos los módulos necesarios están incluidos en el proyecto.

---

## 📁 **Estructura del Proyecto**

```
dno-oracle/
├── api/
│   ├── server-enhanced.ts       # 🚀 Servidor principal
│   └── core/                    # 🧩 Módulos internos
│       ├── AuthService.ts       # 🔐 Autenticación
│       ├── CacheService.ts      # 💾 Cache en memoria
│       ├── DataValidator.ts     # ✅ Validación de datos
│       ├── EntityConfig.ts      # ⚙️ Configuración de entidades
│       ├── GenericControllerV2.ts # 🎮 Controlador CRUD
│       ├── GenericRouter.ts     # 🛣️ Rutas automáticas
│       └── SqlBuilder.ts        # 🏗️ Constructor de SQL
├── config/                      # ⚙️ Configuraciones
├── src/
│   └── db-improved.js          # 🗄️ Conexión Oracle mejorada
├── deno.json                   # 📦 Configuración Deno
├── test-integration.ts         # 🧪 Tests de integración
└── README.md                   # 📖 Documentación
```

---

## 🎯 **Características del Proyecto**

### ✅ **Completamente Independiente**
- ✅ **Sin dependencias externas** - Todos los módulos están incluidos
- ✅ **Autocontenido** - No necesita librerías adicionales
- ✅ **Plug-and-play** - Funciona directamente después del clone

### 🚀 **Funcionalidades Incluidas**

#### **🔥 API Server Avanzado**
- ✅ **Servidor HTTP** con Oak framework
- ✅ **CORS habilitado** para desarrollo
- ✅ **Rutas automáticas** basadas en configuración
- ✅ **Health check** endpoint
- ✅ **Documentación** endpoint automático

#### **🏗️ Módulos Core Internos**
- ✅ **GenericControllerV2** - CRUD automático para cualquier tabla
- ✅ **SqlBuilder** - Construcción dinámica y segura de SQL
- ✅ **CacheService** - Cache en memoria con TTL
- ✅ **DataValidator** - Validación configurable de datos
- ✅ **AuthService** - Sistema de autenticación básico
- ✅ **EntityConfig** - Gestión de configuraciones

#### **🗄️ Base de Datos**
- ✅ **Oracle Database** connection con pool
- ✅ **Reconexión automática** en caso de pérdida
- ✅ **Consultas parametrizadas** (prevención SQL injection)
- ✅ **Paginación automática** en consultas

---

## 🚀 **Inicio Rápido**

### **1. Clonar e Instalar**
```bash
git clone <tu-repositorio>
cd dno-oracle
```

### **2. Configurar Variables de Entorno**
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar configuración Oracle
nano .env
```

```env
# Oracle Database Configuration
ORACLE_USER=tu_usuario
ORACLE_PASSWORD=tu_password
ORACLE_CONNECTION_STRING=localhost:1521/XE
ORACLE_POOL_MIN=2
ORACLE_POOL_MAX=10
```

### **3. Iniciar el Servidor**
```bash
# Desarrollo (con auto-reload)
deno task dev

# Producción
deno task start
```

### **4. Verificar Funcionamiento**
```bash
# Test de integración
deno task test

# Health check
curl http://localhost:8000/api/health

# Documentación
curl http://localhost:8000/api/info
```

---

## 🛠️ **Comandos Disponibles**

```bash
# Iniciar servidor
deno task start

# Desarrollo con auto-reload
deno task dev

# Ejecutar tests
deno task test

# Verificar tipos TypeScript
deno task check

# Formatear código
deno task fmt

# Lint del código
deno task lint
```

---

## 🎮 **Uso de la API**

### **Endpoints Automáticos**

Para cada entidad configurada en `config/entities.json`:

```http
GET    /api/{entidad}           # Listar con paginación
GET    /api/{entidad}/{id}      # Obtener por ID
POST   /api/{entidad}           # Crear nuevo
PUT    /api/{entidad}/{id}      # Actualizar
DELETE /api/{entidad}/{id}      # Eliminar
GET    /api/{entidad}/search    # Búsqueda avanzada
```

### **Ejemplo de Uso**

```bash
# Listar usuarios con paginación
curl "http://localhost:8000/api/users?page=1&pageSize=10"

# Buscar usuarios activos
curl "http://localhost:8000/api/users/search?filters[activo]=true"

# Crear nuevo usuario
curl -X POST "http://localhost:8000/api/users" \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Juan","email":"juan@test.com"}'
```

---

## ⚙️ **Configuración de Entidades**

Edita `config/entities.json` para agregar nuevas tablas:

```json
{
  "usuarios": {
    "tableName": "usuarios",
    "primaryKey": "id",
    "displayName": "Usuarios",
    "description": "Gestión de usuarios del sistema",
    "fields": {
      "id": { "type": "number", "required": true, "autoIncrement": true },
      "nombre": { "type": "string", "required": true, "maxLength": 100 },
      "email": { "type": "string", "required": true, "maxLength": 255 },
      "activo": { "type": "boolean", "defaultValue": true }
    },
    "operations": {
      "create": true,
      "read": true,
      "update": true,
      "delete": true,
      "search": true,
      "paginate": true
    }
  }
}
```

---

## 📊 **Monitoreo y Logs**

### **Health Check**
```bash
curl http://localhost:8000/api/health
```

```json
{
  "status": "ok",
  "database": "connected",
  "cache": "enabled",
  "timestamp": "2025-07-03T10:30:00Z"
}
```

### **Información del Sistema**
```bash
curl http://localhost:8000/api/info
```

---

## 🔧 **Personalización**

### **Agregar Nuevos Endpoints**
Edita `api/server-enhanced.ts`:

```typescript
// Agregar ruta personalizada
this.router.get('/api/custom', async (ctx) => {
  ctx.response.body = { message: 'Endpoint personalizado' };
});
```

### **Modificar Validaciones**
Edita `api/core/DataValidator.ts` para agregar reglas personalizadas.

### **Configurar Cache**
Modifica la configuración del cache en `api/server-enhanced.ts`:

```typescript
const cacheConfig = {
  ttl: 600000,    // 10 minutos
  maxSize: 5000,  // 5000 entradas
  enabled: true
};
```

---

## 🚀 **Deployment**

### **Docker (Recomendado)**
```dockerfile
FROM denoland/deno:1.40.0

WORKDIR /app
COPY . .

EXPOSE 8000
CMD ["task", "start"]
```

### **Servidor**
```bash
# Usando PM2 o similar
deno task start

# O directamente
deno run --allow-all api/server-enhanced.ts
```

---

## 🤝 **Contribuciones**

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## 📄 **Licencia**

MIT License - Ver archivo `LICENSE` para detalles.

---

## 🎉 **¡Proyecto Listo!**

Tu servidor Oracle API está **completamente configurado y listo para usar**. 

- ✅ **Independiente** - No necesita librerías externas
- ✅ **Escalable** - Fácil agregar nuevas entidades
- ✅ **Mantenible** - Código limpio y documentado
- ✅ **Seguro** - Validaciones y prevención de inyecciones SQL

**¡Disfruta desarrollando con tu nuevo API server!** 🚀
