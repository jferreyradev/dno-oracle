# 🔧 Generador de Configuración de Entidades Oracle

Este directorio contiene herramientas para generar automáticamente la configuración JSON necesaria para el archivo `entities.json` analizando tablas de Oracle.

## 🎯 Características

- **Análisis automático** de estructura de tablas Oracle
- **Detección inteligente** de tipos de datos, constraints y relaciones
- **Generación automática** de filtros, validaciones y acciones personalizadas
- **Soporte multiplataforma** (Windows PowerShell, Linux/macOS Bash)
- **Integración directa** con el archivo `entities.json`

## 📋 Prerequisitos

- [Deno](https://deno.land/) instalado
- Archivo `.env` configurado con credenciales de Oracle
- Conexión a la base de datos Oracle

## 🚀 Uso

### Windows (PowerShell)

```powershell
# Uso básico
.\generate-entity.ps1 -Tabla "USUARIOS"

# Con nombre de entidad personalizado
.\generate-entity.ps1 -Tabla "WORKFLOW.PROC_CAB" -Entidad "proc_cab"

# Guardar en archivo
.\generate-entity.ps1 -Tabla "SYSTEM_LOGS" -Archivo "logs-config.json"

# Agregar automáticamente a entities.json
.\generate-entity.ps1 -Tabla "USUARIOS" -Agregar

# Ver ayuda
.\generate-entity.ps1 -Ayuda
```

### Linux/macOS (Bash)

```bash
# Hacer ejecutable (solo la primera vez)
chmod +x generate-entity.sh

# Uso básico
./generate-entity.sh -t "USUARIOS"

# Con nombre de entidad personalizado
./generate-entity.sh -t "WORKFLOW.PROC_CAB" -e "proc_cab"

# Guardar en archivo
./generate-entity.sh -t "SYSTEM_LOGS" -f "logs-config.json"

# Agregar automáticamente a entities.json
./generate-entity.sh -t "USUARIOS" -a

# Ver ayuda
./generate-entity.sh -h
```

### Uso directo con Deno

```bash
# Generar configuración para una tabla
deno run --allow-net --allow-read --allow-env --allow-sys scripts/generate-entity-config.ts USUARIOS

# Con nombre de entidad personalizado
deno run --allow-net --allow-read --allow-env --allow-sys scripts/generate-entity-config.ts WORKFLOW.PROC_CAB proc_cab
```

## 🛠️ Funcionalidades del Generador

### Análisis Automático

El generador analiza automáticamente:

- **Estructura de columnas**: tipos, longitudes, precisión
- **Constraints**: primary keys, unique constraints, nullability
- **Comentarios**: de tabla y columnas
- **Índices**: para determinar campos searchable
- **Triggers**: para detectar auto-increment
- **Patrones comunes**: campos de estado, fechas, emails

### Generación Inteligente

Genera automáticamente:

- **Configuración de campos** con tipos apropiados
- **Validaciones** basadas en constraints
- **Filtros comunes** (activos/inactivos, recientes)
- **Acciones personalizadas** (activar/desactivar, toggle)
- **Operaciones CRUD** estándar

### Detección de Patrones

Reconoce patrones comunes:

- **Campos de estado**: `IS_ACTIVE`, `ACTIVO`, `MOSTRAR`, `STATUS`
- **Campos de email**: genera validación automática
- **Campos de auditoría**: `CREATED_AT`, `UPDATED_AT`
- **Campos auto-increment**: detecta secuencias y triggers

## 📊 Ejemplo de Salida

Para una tabla `USUARIOS` con columnas básicas:

```json
{
  "usuarios": {
    "tableName": "USUARIOS",
    "primaryKey": "USER_ID",
    "autoIncrement": true,
    "displayName": "Usuarios",
    "description": "Tabla de usuarios del sistema",
    "fields": {
      "USER_ID": {
        "type": "NUMBER",
        "required": true,
        "primaryKey": true,
        "autoIncrement": true,
        "displayName": "ID Usuario",
        "description": "Identificador único del usuario",
        "readonly": true
      },
      "USERNAME": {
        "type": "VARCHAR2",
        "length": 50,
        "required": true,
        "unique": true,
        "displayName": "Nombre de usuario",
        "description": "Nombre único de usuario",
        "searchable": true
      },
      "EMAIL": {
        "type": "VARCHAR2",
        "length": 100,
        "required": true,
        "unique": true,
        "displayName": "Email",
        "description": "Correo electrónico del usuario",
        "searchable": true,
        "format": "email"
      }
    },
    "operations": {
      "create": true,
      "read": true,
      "update": true,
      "delete": true,
      "search": true,
      "paginate": true
    },
    "filters": {
      "active": {
        "field": "IS_ACTIVE",
        "operator": "=",
        "value": 1,
        "displayName": "Solo activos"
      }
    },
    "validations": {
      "USERNAME": {
        "required": true,
        "maxLength": 50,
        "message": "Validación para Nombre de usuario"
      },
      "EMAIL": {
        "required": true,
        "maxLength": 100,
        "format": "email",
        "message": "Validación para Email"
      }
    },
    "customActions": {
      "activate": {
        "type": "UPDATE",
        "sql": "UPDATE USUARIOS SET IS_ACTIVE = 1 WHERE USER_ID = :id",
        "displayName": "Activar",
        "description": "Activa el registro"
      }
    }
  }
}
```

## 📝 Personalización

Después de generar la configuración, puedes personalizarla:

1. **Ajustar nombres de display**
2. **Añadir/modificar validaciones**
3. **Configurar filtros específicos**
4. **Crear acciones personalizadas**
5. **Ajustar operaciones permitidas**

## 🔧 Archivos Incluidos

- **`scripts/generate-entity-config.ts`**: Script principal en TypeScript
- **`generate-entity.ps1`**: Wrapper para Windows PowerShell
- **`generate-entity.sh`**: Wrapper para Linux/macOS Bash
- **`README.md`**: Esta documentación

## 🎭 Troubleshooting

### Error: "Deno no encontrado"
```bash
# Instalar Deno
curl -fsSL https://deno.land/install.sh | sh
```

### Error: "Archivo .env no encontrado"
```bash
# Crear archivo .env con configuración Oracle
echo "USER=tu_usuario" > .env
echo "PASSWORD=tu_password" >> .env
echo "CONNECTIONSTRING=localhost:1521/XE" >> .env
echo "LIB_ORA=C:/oracle/instantclient_19_8" >> .env
```

### Error: "Tabla no encontrada"
- Verifica que la tabla existe
- Asegúrate de tener permisos de lectura
- Usa el nombre completo con schema si es necesario

## 🤝 Contribuir

Si encuentras bugs o quieres agregar funcionalidades:

1. Crea un issue describiendo el problema/mejora
2. Haz un fork del repositorio
3. Implementa los cambios
4. Envía un pull request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver archivo `LICENSE` para más detalles.

---

💡 **Tip**: Siempre revisa y personaliza la configuración generada antes de usarla en producción.
