# DNO-Oracle 🚀

**Módulo de conexión a Oracle Database para Deno**

Una librería simple y robusta para conectar aplicaciones Deno con bases de datos Oracle, con soporte completo para Oracle Instant Client y gestión de pools de conexiones.

[![Deno](https://img.shields.io/badge/deno-v1.40+-green.svg)](https://deno.land)
[![Oracle](https://img.shields.io/badge/oracle-11g%2B-red.svg)](https://www.oracle.com/database/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![API](https://img.shields.io/badge/REST_API-included-blue.svg)](#-api-rest)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue.svg)](https://www.typescriptlang.org/)
[![SQL](https://img.shields.io/badge/SQL_executor-included-orange.svg)](#-scripts-y-utilidades)

## 🎯 Características

- ✅ **Conexión robusta** a Oracle Database 11g+
- ✅ **Pool de conexiones** configurable
- ✅ **Gestión automática** de transacciones
- ✅ **Consultas parametrizadas** con protección SQL injection
- ✅ **Paginación automática** con LIMIT/OFFSET
- ✅ **Procedimientos almacenados** con soporte completo para IN/OUT/IN_OUT
- ✅ **Funciones Oracle** con valores de retorno
- ✅ **REF CURSOR** para conjuntos de resultados grandes
- ✅ **Transacciones** multi-consulta con rollback automático
- ✅ **API REST completa** con endpoints para todas las operaciones
- ✅ **Diagnósticos integrados** para troubleshooting
- ✅ **Scripts de configuración** automatizados
- ✅ **Soporte para variables de entorno**

## 🌐 API REST

**DNO-Oracle incluye una API REST completa** que permite interactuar con la base de datos Oracle a través de HTTP:

- 🚀 **Servidor HTTP** con Deno
- 📊 **Endpoints CRUD** para gestión de datos
- 🔍 **Consultas SQL** personalizadas
- 🔧 **Procedimientos almacenados** vía REST
- 📈 **Paginación** automática
- 🛡️ **Validación** de entrada
- 📝 **Documentación** OpenAPI-style

### Inicio Rápido de la API

```bash
# Configurar variables de entorno
cp .env.example .env
nano .env

# Iniciar API
./run.sh api

# API disponible en: http://localhost:8000
```

Ver documentación completa: [docs/API.md](docs/API.md)

## 🌐 Comandos de la API

```bash
# Iniciar servidor API en puerto 8000
./run.sh api

# Servidor API en modo desarrollo (auto-reload)
./run.sh api:dev

# Demostración completa de la API
./run.sh api:demo

# Ejemplos de uso de la API
./run.sh api-examples
```

### Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Estado de la API |
| GET | `/api/users` | Obtener usuarios |
| POST | `/api/users` | Crear usuario |
| POST | `/api/execute` | Ejecutar consulta SQL |
| POST | `/api/procedure` | Ejecutar procedimiento |
| GET | `/api/tables` | Listar tablas |
| GET | `/api/schema` | Esquema de tabla |

Ver documentación completa: [docs/API.md](docs/API.md)

## 🏗️ Estructura del Proyecto

```
dno-oracle/
├── src/
│   ├── db.js                 # Módulo original
│   └── db-improved.js        # Módulo mejorado con todas las funcionalidades
├── api/                      # API REST completa
│   ├── server.ts             # Servidor HTTP
│   ├── routes/               # Rutas de la API
│   ├── controllers/          # Controladores
│   ├── middleware/           # Middleware (CORS, auth, etc.)
│   └── models/               # Modelos de datos
├── tests/
│   ├── test-connection.js         # Prueba básica
│   ├── test-connection-advanced.js # Diagnóstico avanzado
│   └── test-final.js             # Prueba completa con ejemplos
├── examples/
│   ├── advanced-usage.js          # Ejemplos avanzados
│   ├── stored-procedures.js       # Procedimientos almacenados
│   └── api-usage.js              # Ejemplos de uso de la API
├── scripts/
│   ├── oracle-setup.sh           # Script principal de gestión
│   ├── diagnose-oracle.sh        # Diagnóstico Oracle Client
│   ├── demo-api.sh              # Demostración de la API
│   └── fix-dns.sh               # Solución problemas DNS
├── docs/
│   ├── README-connection.md      # Documentación técnica
│   ├── API.md                   # Documentación de la API
│   └── postman-collection.json  # Colección de Postman
├── .env                          # Variables de entorno  
├── deps.ts                       # Dependencias de Deno
├── deno.json                     # Configuración del proyecto
├── run.sh                       # Script de comandos unificado
└── README.md                     # Este archivo
```

## 📦 Instalación

### Prerrequisitos

1. **Deno v1.40+**
   ```bash
   curl -fsSL https://deno.land/install.sh | sh
   ```

2. **Oracle Instant Client**
   ```bash
   # Descargar desde Oracle oficial
   # https://www.oracle.com/database/technologies/instant-client.html
   # Extraer en /home/usuario/bin/instantclient_XX_XX
   ```

### Configuración Rápida

```bash
git clone <repo-url> dno-oracle
cd dno-oracle

# Configurar variables de entorno
cp .env.example .env
nano .env

# Ejecutar diagnóstico
./scripts/oracle-setup.sh diagnose

# Probar conexión
./scripts/oracle-setup.sh test
```

## ⚙️ Configuración

### Variables de Entorno (.env)

```bash
# Configuración de la base de datos Oracle
USER=tu_usuario_oracle
PASSWORD=tu_password_oracle
CONNECTIONSTRING=192.168.1.34:1521/desa
POOL=10
LIB_ORA=/home/usuario/bin/instantclient_19_25
```

### Formatos de Connection String Soportados

```bash
# Formato simple
CONNECTIONSTRING=host:puerto/servicio

# Formato con IP
CONNECTIONSTRING=192.168.1.100:1521/XE

# Formato TNS completo
CONNECTIONSTRING=(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.1.100)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=XE)))
```

## 🚀 Uso

### Importar el Módulo

```javascript
import { exec, checkConn, open, close } from "./src/db.js";
```

### Ejemplos Básicos

```javascript
// Verificar conexión
const isConnected = await checkConn();
if (isConnected) {
    console.log("✅ Conectado a Oracle");
}

// Ejecutar consulta simple
const result = await exec("SELECT SYSDATE FROM DUAL");
console.log("Fecha:", result.rows[0].SYSDATE);

// Consulta con parámetros
const users = await exec(
    "SELECT * FROM USUARIOS WHERE ACTIVO = :activo", 
    { activo: 1 }
);

// Consulta con paginación
const paginated = await exec(
    "SELECT * FROM PRODUCTOS ORDER BY ID", 
    { limit: 10, offset: 20 }
);

// Ejecutar procedimiento almacenado
const procResult = await callProcedure('MI_PROCEDIMIENTO', {
  p_entrada: 'valor',
  p_salida: { dir: oracledb.BIND_OUT, type: oracledb.STRING }
});

// Ejecutar función Oracle
const funcResult = await callFunction('MI_FUNCION',
  { p_param: 100 },
  { type: oracledb.NUMBER }
);
```

### Funciones Disponibles

| Función | Descripción | Parámetros |
|---------|-------------|------------|
| `checkConn()` | Verificar conexión | - |
| `exec(sql, binds, opts)` | Ejecutar consulta | sql, parámetros, opciones |
| `callProcedure(name, params, opts)` | Ejecutar procedimiento | nombre, parámetros, opciones |
| `callFunction(name, params, returnType, opts)` | Ejecutar función | nombre, parámetros, tipo retorno, opciones |
| `callProcedureWithCursor(name, params, opts)` | Procedimiento con cursor | nombre, parámetros, opciones |
| `executeTransaction(queries)` | Transacción multi-consulta | array de consultas |
| `open()` | Abrir pool de conexiones | - |
| `close()` | Cerrar pool de conexiones | - |
| `setConfig(config)` | Configurar conexión | objeto config |
| `getPoolStats()` | Estadísticas del pool | - |

## 🧪 Testing

### Scripts de Prueba Disponibles

```bash
# Prueba básica de conexión
./scripts/oracle-setup.sh test

# Diagnóstico completo
./scripts/oracle-setup.sh test-advanced  

# Prueba final con ejemplos
./scripts/oracle-setup.sh test-final

# Ejemplos de procedimientos almacenados
./scripts/oracle-setup.sh procedures

# Diagnóstico Oracle Client
./scripts/oracle-setup.sh diagnose

# Ayuda resolución DNS
./scripts/oracle-setup.sh fix-dns
```

### Usando Deno Tasks

```bash
# Configurado en deno.json
deno task test                    # Prueba básica
deno task test:advanced          # Diagnóstico avanzado  
deno task test:final             # Prueba completa
```

## 🔧 Troubleshooting

### Errores Comunes

#### Error: "Cannot locate a 64-bit Oracle Client library"

**Solución:**
```bash
export LD_LIBRARY_PATH=/ruta/a/instantclient:$LD_LIBRARY_PATH
# O ejecutar: ./scripts/oracle-setup.sh diagnose
```

#### Error: "ORA-12154: TNS:could not resolve the connect identifier"

**Solución:**
```bash
# Usar IP directamente en lugar de hostname
CONNECTIONSTRING=192.168.1.100:1521/XE

# O ejecutar diagnóstico DNS
./scripts/oracle-setup.sh fix-dns
```

#### Error: "Name or service not known"

**Solución:**
```bash
# Verificar conectividad de red
ping hostname_oracle
nc -zv hostname_oracle 1521

# Agregar entrada en /etc/hosts
echo "192.168.1.100 hostname_oracle" | sudo tee -a /etc/hosts
```

### Logs y Diagnóstico

```bash
# Ver logs detallados
DEBUG=oracle deno run --allow-all tests/test-connection.js

# Verificar librerías Oracle
ldd /ruta/a/instantclient/libclntsh.so.19.1

# Verificar variables de entorno
printenv | grep ORACLE
```

## 📚 API Reference

### exec(statement, binds, opts)

Ejecuta una consulta SQL con parámetros opcionales.

```javascript
const result = await exec(sql, binds, options);
```

**Parámetros:**
- `statement` (string): Consulta SQL
- `binds` (object): Parámetros de la consulta
- `opts` (object): Opciones adicionales

**Ejemplo con paginación:**
```javascript
const result = await exec(
    "SELECT * FROM PRODUCTOS ORDER BY ID",
    { limit: 10, offset: 0 }
);
```

**Retorna:**
```javascript
{
    rows: [...],        // Filas de resultados
    rowsAffected: 0,    // Filas afectadas
    metaData: [...],    // Metadatos de columnas
}
```

## 🤝 Estado del Proyecto

### ✅ Completado
- [x] Conexión básica a Oracle
- [x] Pool de conexiones
- [x] Consultas parametrizadas
- [x] Paginación automática
- [x] Procedimientos almacenados
- [x] Funciones Oracle con retorno
- [x] REF CURSOR support
- [x] Transacciones multi-consulta
- [x] Scripts de diagnóstico
- [x] Documentación completa
- [x] Estructura de proyecto organizada

### 🔄 En Desarrollo
- [ ] Soporte para CLOB/BLOB avanzado
- [ ] Conexión a múltiples bases de datos
- [ ] Cache de consultas
- [ ] Métricas y monitoring avanzado

### 📋 Roadmap
- [ ] Soporte para procedimientos almacenados
- [ ] ORM simple integrado
- [ ] Migración automática de esquemas
- [ ] Dashboard web de administración

## 🛠️ Configuración de Desarrollo

```bash
# Clonar repositorio
git clone <repo-url>
cd dno-oracle

# Configurar entorno
cp .env.example .env
nano .env

# Ejecutar pruebas
deno task test

# Formato de código
deno fmt

# Linting
deno lint
```

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

## 🙏 Contribución

Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crear una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Crear un Pull Request

## 📞 Soporte

- 📧 **Email**: soporte@proyecto.com
- 🐛 **Issues**: [GitHub Issues](issues)
- 📖 **Docs**: [Documentación completa](docs/)

## 🔗 Enlaces Útiles

- [Oracle Database Documentation](https://docs.oracle.com/database/)
- [Deno Manual](https://deno.land/manual)
- [Oracle Instant Client Downloads](https://www.oracle.com/database/technologies/instant-client.html)
- [node-oracledb Documentation](https://oracle.github.io/node-oracledb/)

---

**Hecho con ❤️ para la comunidad Deno + Oracle**
