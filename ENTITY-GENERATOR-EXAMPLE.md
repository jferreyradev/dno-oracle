# 🔧 Generador de Entidades Oracle - Ejemplo de Uso

Este documento muestra cómo usar el generador automático de configuración de entidades.

## ✅ Ejemplo exitoso con WORKFLOW.ADIFDO

```powershell
# Generar configuración para tabla WORKFLOW.ADIFDO
.\generate-entity.ps1 -Tabla "WORKFLOW.ADIFDO" -Entidad "adifdo"
```

## 🎯 Nuevas funcionalidades

### Agregar automáticamente a entities.json

```powershell
# Agregar directamente al archivo entities.json
.\generate-entity.ps1 -Tabla "WORKFLOW.ADIFDO" -Entidad "adifdo" -Agregar
```

```bash
# Usando Deno directamente
deno run --allow-all scripts/generate-entity-config.ts "WORKFLOW.ADIFDO" "adifdo" --add-to-entities
```

### Guardar en archivo específico

```powershell
# Guardar en archivo específico
.\generate-entity.ps1 -Tabla "WORKFLOW.ADIFDO" -Entidad "adifdo" -Archivo "adifdo-config.json"
```

```bash
# Usando Deno directamente
deno run --allow-all scripts/generate-entity-config.ts "WORKFLOW.ADIFDO" "adifdo" --save-file=adifdo-config.json
```

### Combinando funcionalidades

```powershell
# Agregar a entities.json Y guardar en archivo
.\generate-entity.ps1 -Tabla "WORKFLOW.ADIFDO" -Entidad "adifdo" -Agregar -Archivo "adifdo-backup.json"
```

```bash
# Usando Deno directamente
deno run --allow-all scripts/generate-entity-config.ts "WORKFLOW.ADIFDO" "adifdo" --add-to-entities --save-file=adifdo-backup.json
```

## 📋 Todas las opciones disponibles

### PowerShell wrapper
```powershell
.\generate-entity.ps1 -Tabla <TABLA> [-Entidad <ENTIDAD>] [-Archivo <ARCHIVO>] [-Agregar] [-Ayuda]
```

### Deno script directo
```bash
deno run --allow-all scripts/generate-entity-config.ts <TABLA> [ENTIDAD] [--silent] [--add-to-entities] [--save-file=<archivo>]
```

## 🎯 Casos de uso comunes

### 1. Desarrollo rápido - Agregar directamente
```powershell
# Para desarrollo rápido, agregar directamente a entities.json
.\generate-entity.ps1 -Tabla "USUARIOS" -Entidad "usuarios" -Agregar
```

### 2. Revisión antes de integrar - Guardar en archivo
```powershell
# Revisar la configuración antes de integrar
.\generate-entity.ps1 -Tabla "USUARIOS" -Entidad "usuarios" -Archivo "usuarios-review.json"
# Revisar el archivo usuarios-review.json
# Luego agregar manualmente o usar -Agregar
```

### 3. Backup y desarrollo - Ambas opciones
```powershell
# Mantener backup y agregar a entities.json
.\generate-entity.ps1 -Tabla "USUARIOS" -Entidad "usuarios" -Agregar -Archivo "usuarios-backup.json"
```

### 4. Generación masiva
```powershell
# Generar múltiples tablas automáticamente
$tablas = @("USUARIOS", "PERFILES", "PERMISOS")
foreach ($tabla in $tablas) {
    $entidad = $tabla.ToLower()
    .\generate-entity.ps1 -Tabla $tabla -Entidad $entidad -Agregar
}
```

**Resultado:**
```json
{
  "adifdo": {
    "tableName": "WORKFLOW.ADIFDO",
    "primaryKey": "IDOCUPCARG",
    "autoIncrement": false,
    "displayName": "adifdo",
    "description": "Tabla WORKFLOW.ADIFDO",
    "fields": {
      "IDOCUPCARG": {
        "type": "NUMBER",
        "required": false,
        "displayName": "Idocupcarg",
        "description": "Campo Idocupcarg",
        "searchable": false,
        "primaryKey": true,
        "readonly": true
      },
      "DNI": {
        "type": "INTEGER",
        "required": true,
        "displayName": "Dni",
        "description": "Campo Dni",
        "searchable": false
      },
      "APELLIDO": {
        "type": "VARCHAR2",
        "required": false,
        "displayName": "Apellido",
        "description": "Campo Apellido",
        "searchable": true,
        "length": 140
      },
      "IMP": {
        "type": "NUMBER",
        "required": false,
        "displayName": "Imp",
        "description": "Campo Imp",
        "searchable": false,
        "precision": 19,
        "scale": 2
      },
      "FECVTO": {
        "type": "DATE",
        "required": false,
        "displayName": "Fecvto",
        "description": "Campo Fecvto",
        "searchable": false
      }
    }
  }
}
```

## 📋 Características detectadas automáticamente

- ✅ **Clave primaria**: `IDOCUPCARG` detectada automáticamente
- ✅ **Tipos de datos**: Mapeo correcto de NUMBER, INTEGER, VARCHAR2, DATE
- ✅ **Campos requeridos**: `DNI` e `ID` marcados como required
- ✅ **Campos searchable**: `APELLIDO` y `DESCRIPCION` marcados como searchable
- ✅ **Longitud de campos**: VARCHAR2 con longitud específica
- ✅ **Precisión numérica**: Campos NUMBER con precisión y escala
- ✅ **Campos readonly**: Clave primaria marcada como readonly

## 🚀 Comandos útiles

```powershell
# Generar y guardar en archivo
.\generate-entity.ps1 -Tabla "WORKFLOW.ADIFDO" -Archivo "adifdo-config.json"

# Listar tablas disponibles
deno run --allow-all -e "
import { load } from 'https://deno.land/std@0.204.0/dotenv/mod.ts';
import oracledb from 'npm:oracledb@6.0.2';

const env = await load();
oracledb.initOracleClient({ libDir: env.LIB_ORA });

const connection = await oracledb.getConnection({
  user: env.USER,
  password: env.PASSWORD,
  connectString: env.CONNECTIONSTRING
});

const result = await connection.execute('SELECT OWNER, TABLE_NAME FROM ALL_TABLES ORDER BY OWNER, TABLE_NAME');
result.rows.forEach(row => console.log(\`\${row[0]}.\${row[1]}\`));

await connection.close();
"

# Uso directo con Deno
deno run --allow-all scripts/generate-entity-config.ts "WORKFLOW.ADIFDO" "adifdo"
```

## 🎯 Resultado final

La configuración generada automáticamente está lista para usar en `entities.json` o como archivo independiente. No requiere edición manual y incluye todas las características necesarias para la API REST.

**Tiempo de generación:** ~2-3 segundos  
**Tablas soportadas:** Todas las tablas accesibles por el usuario  
**Tipos soportados:** NUMBER, INTEGER, VARCHAR2, DATE, TIMESTAMP, CLOB, BLOB, RAW  
**Esquemas soportados:** Cualquier esquema accesible (ej: WORKFLOW.TABLA)  
