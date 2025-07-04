# 🔧 Generador de Configuración de Entidades Oracle

Este directorio contiene herramientas para generar automáticamente la configuración JSON necesaria para el archivo `entities.json` analizando tablas de Oracle.

## 🎯 Características

- ✅ **Conexión automática a Oracle** con soporte para Instant Client
- ✅ **Análisis automático de estructura** de tabla (columnas, tipos, constraints)
- ✅ **Detección automática de clave primaria** y auto-increment
- ✅ **Mapeo de tipos Oracle** a tipos genéricos del sistema
- ✅ **Generación de campos searchable** para tipos VARCHAR2
- ✅ **Soporte para esquemas** (ej: WORKFLOW.TABLA)
- ✅ **Interfaz de línea de comandos** amigable con PowerShell
- ✅ **Guardado automático** en archivo o integración con entities.json

## 📋 Prerrequisitos

1. **Deno** instalado y en el PATH
2. **Oracle Instant Client** instalado y configurado
3. **Archivo .env** con configuración de Oracle
4. **Permisos** de lectura en las vistas ALL_TABLES, ALL_TAB_COLUMNS, etc.

## ⚙️ Configuración

Asegúrate de tener configuradas las siguientes variables en tu archivo `.env`:

```env
USER=tu_usuario_oracle
PASSWORD=tu_contraseña
CONNECTIONSTRING=host:puerto/servicio
LIB_ORA=C:\instantclient_21_10
```

## 🚀 Uso

### Uso básico (PowerShell)

```powershell
# Generar configuración para una tabla
.\generate-entity.ps1 -Tabla "WORKFLOW.PROC_CAB"

# Generar con nombre de entidad específico
.\generate-entity.ps1 -Tabla "WORKFLOW.ADIFDO" -Entidad "adifdo"

# Guardar en archivo específico
.\generate-entity.ps1 -Tabla "USUARIOS" -Archivo "usuarios-config.json"

# Agregar automáticamente al archivo entities.json
.\generate-entity.ps1 -Tabla "USUARIOS" -Agregar
```

### Uso directo (Deno)

```bash
# Generar configuración básica
deno run --allow-all scripts/generate-entity-config.ts "WORKFLOW.PROC_CAB"

# Generar con nombre de entidad específico
deno run --allow-all scripts/generate-entity-config.ts "WORKFLOW.ADIFDO" "adifdo"

# Modo silencioso (solo salida JSON)
deno run --allow-all scripts/generate-entity-config.ts "USUARIOS" --silent
```

## 📤 Salida

El script genera una configuración JSON completa que incluye:

```json
{
  "nombre_entidad": {
    "tableName": "ESQUEMA.TABLA",
    "primaryKey": "ID_CAMPO",
    "autoIncrement": false,
    "displayName": "Nombre Entidad",
    "description": "Tabla ESQUEMA.TABLA",
    "fields": {
      "CAMPO1": {
        "type": "NUMBER",
        "required": true,
        "displayName": "Campo 1",
        "description": "Campo Campo 1",
        "searchable": false,
        "primaryKey": true,
        "readonly": true
      },
      "CAMPO2": {
        "type": "VARCHAR2",
        "required": false,
        "displayName": "Campo 2",
        "description": "Campo Campo 2",
        "searchable": true,
        "length": 100
      }
    }
  }
}
```

## 🗂️ Tipos soportados

El script mapea automáticamente los tipos de Oracle a tipos genéricos del sistema:

| Tipo Oracle | Tipo Genérico | Observaciones |
|-------------|---------------|---------------|
| NUMBER (escala=0, precisión≤10) | INTEGER | Números enteros |
| NUMBER (otros) | NUMBER | Números decimales |
| VARCHAR2, CHAR, NVARCHAR2, NCHAR | VARCHAR2 | Cadenas de texto |
| DATE | DATE | Fechas |
| TIMESTAMP | TIMESTAMP | Fechas con hora |
| CLOB, NCLOB | CLOB | Texto largo |
| BLOB | BLOB | Datos binarios |
| RAW | RAW | Datos binarios raw |

## 🔍 Características detectadas automáticamente

- **Clave primaria**: Se detecta automáticamente desde constraints
- **Campos requeridos**: Basado en columnas NOT NULL
- **Campos searchable**: Automáticamente para tipos VARCHAR2
- **Longitud de campos**: Para tipos VARCHAR2
- **Precisión y escala**: Para tipos NUMBER
- **Valores por defecto**: Se extraen de la definición de la tabla
- **Auto-increment**: Se detecta buscando triggers con secuencias

## 💡 Ejemplos de uso común

### Generar configuración para tabla de usuarios

```powershell
.\generate-entity.ps1 -Tabla "SISTEMA.USUARIOS" -Entidad "usuarios"
```

### Generar múltiples configuraciones

```powershell
# Generar configuraciones para múltiples tablas
$tablas = @("SISTEMA.USUARIOS", "SISTEMA.PERFILES", "SISTEMA.PERMISOS")
foreach ($tabla in $tablas) {
    $entidad = $tabla.Split('.')[1].ToLower()
    .\generate-entity.ps1 -Tabla $tabla -Entidad $entidad -Archivo "$entidad-config.json"
}
```

### Integración con entities.json

```powershell
# Agregar automáticamente al archivo entities.json
.\generate-entity.ps1 -Tabla "SISTEMA.USUARIOS" -Agregar
```

## 🔧 Solución de problemas

### Error: "Tabla no existe o no es accesible"

1. Verifica que el nombre de la tabla sea correcto
2. Asegúrate de incluir el esquema si es necesario
3. Confirma que el usuario tiene permisos de lectura en la tabla

### Error: "Faltan variables de entorno Oracle"

1. Verifica que el archivo `.env` existe
2. Confirma que las variables USER, PASSWORD, y CONNECTIONSTRING están definidas
3. Revisa que no haya espacios extra en las líneas del archivo `.env`

### Error: "connections to this database server version are not supported"

1. Verifica que Oracle Instant Client esté instalado correctamente
2. Confirma que la variable LIB_ORA apunte al directorio correcto
3. Asegúrate de que la versión de Instant Client sea compatible con tu Oracle Server

## 📁 Archivos del proyecto

- `scripts/generate-entity-config.ts`: Script principal en TypeScript
- `generate-entity.ps1`: Wrapper PowerShell multiplataforma
- `generate-entity.sh`: Wrapper Bash para Linux/macOS
- `config/entities.json`: Archivo de configuración principal

## 🤝 Contribuir

Para contribuir al proyecto:

1. Crea un fork del repositorio
2. Realiza tus cambios en una rama nueva
3. Ejecuta las pruebas: `deno test`
4. Formatea el código: `deno fmt`
5. Envía un pull request

## 📄 Licencia

Este proyecto está bajo la misma licencia que el proyecto DNO-Oracle.
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
