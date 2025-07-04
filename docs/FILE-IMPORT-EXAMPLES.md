# 📁 Importación de Archivos a Tabla Oracle

**Versión**: 2.0.0  
**Última actualización**: 4 de julio de 2025

## 📋 **Descripción**

Esta funcionalidad permite importar archivos CSV a tablas Oracle de forma automática, con validación de datos, mapeo de columnas y manejo de errores.

## 🚀 **Características Principales**

### **✅ Formatos Soportados**
- **CSV**: Archivos separados por comas, punto y coma u otros delimitadores
- **Delimitadores**: `,`, `;`, `|`, `\t` (Tab)
- **Codificación**: UTF-8, Latin1, ASCII

### **✅ Funcionalidades**
- ✅ **Validación previa** sin importar
- ✅ **Mapeo automático** de columnas
- ✅ **Mapeo manual** personalizado
- ✅ **Truncar tabla** antes de importar
- ✅ **Continuar en errores** o detener
- ✅ **Procesamiento por lotes**
- ✅ **Saltar primera fila** (headers)
- ✅ **Transformaciones de datos**

### **✅ Tipos de Datos Soportados**
- `VARCHAR2`, `CHAR`
- `NUMBER`, `INTEGER`
- `DATE`, `TIMESTAMP`
- `CLOB`, `BLOB`

## 📚 **Endpoints API**

### **1. Importar CSV**
```http
POST /api/import/csv
Content-Type: application/json

{
  "csvContent": "ID,DESCRIPCION,MOSTRAR\n1,Proceso Test,1\n2,Otro Proceso,0",
  "tableName": "WORKFLOW.PROC_CAB",
  "mappings": [
    {
      "fileColumn": "0",
      "tableColumn": "ID_PROC_CAB"
    },
    {
      "fileColumn": "1",
      "tableColumn": "DESCRIPCION"
    },
    {
      "fileColumn": "2",
      "tableColumn": "MOSTRAR",
      "transform": "value => parseInt(value)"
    }
  ],
  "options": {
    "skipFirstRow": true,
    "batchSize": 1000,
    "truncateTable": false,
    "continueOnError": true,
    "delimiter": ",",
    "encoding": "utf-8"
  }
}
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "totalRows": 2,
    "processedRows": 2,
    "errorRows": 0,
    "errors": [],
    "warnings": [],
    "summary": {
      "inserted": 2,
      "updated": 0,
      "failed": 0,
      "duplicates": 0
    }
  },
  "message": "Importación exitosa: 2 filas insertadas"
}
```

### **2. Validar CSV**
```http
POST /api/import/validate
Content-Type: application/json

{
  "csvContent": "ID,DESCRIPCION,MOSTRAR\n1,Proceso Test,1\n2,Otro Proceso,texto",
  "tableName": "WORKFLOW.PROC_CAB",
  "mappings": [
    {
      "fileColumn": "0",
      "tableColumn": "ID_PROC_CAB"
    },
    {
      "fileColumn": "1",
      "tableColumn": "DESCRIPCION"
    },
    {
      "fileColumn": "2",
      "tableColumn": "MOSTRAR"
    }
  ],
  "options": {
    "skipFirstRow": true,
    "delimiter": ","
  }
}
```

**Respuesta con errores**:
```json
{
  "success": false,
  "data": {
    "isValid": false,
    "totalRows": 2,
    "errors": [
      {
        "row": 2,
        "column": "MOSTRAR",
        "error": "Valor 'texto' no es un número válido"
      }
    ],
    "warnings": [],
    "preview": "Errores encontrados"
  },
  "message": "Validación con errores: 1 filas con errores"
}
```

### **3. Obtener Columnas de Tabla**
```http
GET /api/import/columns/WORKFLOW.PROC_CAB
```

**Respuesta**:
```json
{
  "success": true,
  "data": [
    {
      "name": "ID_PROC_CAB",
      "type": "NUMBER",
      "required": true,
      "defaultValue": null
    },
    {
      "name": "DESCRIPCION",
      "type": "VARCHAR2",
      "required": false,
      "length": 100,
      "defaultValue": null
    },
    {
      "name": "MOSTRAR",
      "type": "INTEGER",
      "required": true,
      "defaultValue": 0
    }
  ],
  "message": "Columnas obtenidas para tabla WORKFLOW.PROC_CAB"
}
```

### **4. Parsear Headers CSV**
```http
POST /api/import/headers
Content-Type: application/json

{
  "csvContent": "ID,DESCRIPCION,MOSTRAR\n1,Proceso Test,1",
  "delimiter": ","
}
```

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "headers": ["ID", "DESCRIPCION", "MOSTRAR"],
    "count": 3,
    "delimiter": ","
  },
  "message": "Headers parseados: 3 columnas encontradas"
}
```

### **5. Generar Mapping Automático**
```http
POST /api/import/mapping
Content-Type: application/json

{
  "csvHeaders": ["ID", "DESCRIPCION", "MOSTRAR"],
  "tableName": "WORKFLOW.PROC_CAB"
}
```

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "mappings": [
      {
        "fileColumn": "1",
        "tableColumn": "DESCRIPCION"
      },
      {
        "fileColumn": "2",
        "tableColumn": "MOSTRAR"
      }
    ],
    "matched": 2,
    "total": 3
  },
  "message": "Mapping generado: 2 de 3 columnas mapeadas"
}
```

### **6. Información de Importación**
```http
GET /api/import/info
```

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "supportedFormats": ["CSV"],
    "supportedDelimiters": [",", ";", "|", "\t"],
    "supportedEncodings": ["utf-8", "latin1", "ascii"],
    "maxFileSize": "10MB",
    "maxRows": 100000,
    "features": {
      "skipFirstRow": true,
      "validateOnly": true,
      "truncateTable": true,
      "continueOnError": true,
      "autoMapping": true,
      "batchProcessing": true
    },
    "supportedDataTypes": [
      "VARCHAR2", "CHAR", "NUMBER", "INTEGER", 
      "DATE", "TIMESTAMP", "CLOB", "BLOB"
    ]
  },
  "message": "Información de importación obtenida"
}
```

## 🛠️ **Opciones de Configuración**

### **ImportOptions**
```typescript
interface ImportOptions {
  tableName: string;              // Nombre de la tabla Oracle
  mappings: ImportMapping[];      // Mapeos de columnas
  skipFirstRow?: boolean;         // Saltar primera fila (headers)
  batchSize?: number;             // Tamaño de lote (default: 1000)
  validateOnly?: boolean;         // Solo validar sin importar
  truncateTable?: boolean;        // Truncar tabla antes de importar
  continueOnError?: boolean;      // Continuar en errores
  dateFormat?: string;            // Formato de fecha (default: 'YYYY-MM-DD')
  delimiter?: string;             // Delimitador CSV (default: ',')
  encoding?: string;              // Codificación (default: 'utf-8')
}
```

### **ImportMapping**
```typescript
interface ImportMapping {
  fileColumn: string;             // Índice de columna en archivo (0, 1, 2...)
  tableColumn: string;            // Nombre de columna en tabla Oracle
  transform?: (value: string) => unknown; // Función de transformación
}
```

## 🔄 **Flujo de Trabajo Recomendado**

### **1. Preparar el Archivo CSV**
```csv
ID,DESCRIPCION,OBSERVACIONES,MOSTRAR
1,Proceso de Prueba,Observaciones del proceso,1
2,Otro Proceso,Más observaciones,0
```

### **2. Parsear Headers**
```bash
curl -X POST http://localhost:8000/api/import/headers \
  -H "Content-Type: application/json" \
  -d '{"csvContent": "ID,DESCRIPCION,OBSERVACIONES,MOSTRAR\n1,Proceso de Prueba,Observaciones del proceso,1", "delimiter": ","}'
```

### **3. Obtener Columnas de Tabla**
```bash
curl -X GET http://localhost:8000/api/import/columns/WORKFLOW.PROC_CAB
```

### **4. Generar Mapping Automático**
```bash
curl -X POST http://localhost:8000/api/import/mapping \
  -H "Content-Type: application/json" \
  -d '{"csvHeaders": ["ID", "DESCRIPCION", "OBSERVACIONES", "MOSTRAR"], "tableName": "WORKFLOW.PROC_CAB"}'
```

### **5. Validar Datos**
```bash
curl -X POST http://localhost:8000/api/import/validate \
  -H "Content-Type: application/json" \
  -d '{
    "csvContent": "ID,DESCRIPCION,OBSERVACIONES,MOSTRAR\n1,Proceso de Prueba,Observaciones del proceso,1\n2,Otro Proceso,Más observaciones,0",
    "tableName": "WORKFLOW.PROC_CAB",
    "mappings": [
      {"fileColumn": "1", "tableColumn": "DESCRIPCION"},
      {"fileColumn": "2", "tableColumn": "OBSERVACIONES"},
      {"fileColumn": "3", "tableColumn": "MOSTRAR"}
    ],
    "options": {"skipFirstRow": true}
  }'
```

### **6. Importar Datos**
```bash
curl -X POST http://localhost:8000/api/import/csv \
  -H "Content-Type: application/json" \
  -d '{
    "csvContent": "ID,DESCRIPCION,OBSERVACIONES,MOSTRAR\n1,Proceso de Prueba,Observaciones del proceso,1\n2,Otro Proceso,Más observaciones,0",
    "tableName": "WORKFLOW.PROC_CAB",
    "mappings": [
      {"fileColumn": "1", "tableColumn": "DESCRIPCION"},
      {"fileColumn": "2", "tableColumn": "OBSERVACIONES"},
      {"fileColumn": "3", "tableColumn": "MOSTRAR"}
    ],
    "options": {
      "skipFirstRow": true,
      "batchSize": 1000,
      "continueOnError": true
    }
  }'
```

## 🎯 **Transformaciones de Datos**

### **Ejemplos de Transformaciones**
```typescript
// Convertir a número
{
  "fileColumn": "2",
  "tableColumn": "MOSTRAR",
  "transform": "value => parseInt(value)"
}

// Convertir a fecha
{
  "fileColumn": "3",
  "tableColumn": "FECHA_CREACION",
  "transform": "value => new Date(value).toISOString()"
}

// Limpiar texto
{
  "fileColumn": "1",
  "tableColumn": "DESCRIPCION",
  "transform": "value => value.trim().toUpperCase()"
}

// Valor condicional
{
  "fileColumn": "4",
  "tableColumn": "ACTIVO",
  "transform": "value => value === 'SI' ? 1 : 0"
}
```

## 🚨 **Manejo de Errores**

### **Tipos de Errores**
- **Validation Errors**: Tipos de datos incorrectos
- **Required Field Errors**: Campos requeridos faltantes
- **Database Errors**: Errores de inserción en Oracle
- **Format Errors**: Errores de formato CSV

### **Estrategias de Manejo**
- **continueOnError: true**: Continúa procesando otras filas
- **continueOnError: false**: Detiene en el primer error
- **validateOnly: true**: Solo valida sin importar

## 📊 **Métricas y Resultados**

### **ImportResult**
```typescript
interface ImportResult {
  success: boolean;               // Importación exitosa
  totalRows: number;              // Total de filas en el archivo
  processedRows: number;          // Filas procesadas
  errorRows: number;              // Filas con errores
  errors: ImportError[];          // Detalles de errores
  warnings: string[];             // Advertencias
  summary: {
    inserted: number;             // Filas insertadas
    updated: number;              // Filas actualizadas
    failed: number;               // Filas fallidas
    duplicates: number;           // Duplicados encontrados
  };
}
```

## 📝 **Mejores Prácticas**

### **1. Preparación de Datos**
- ✅ Validar formato CSV antes de importar
- ✅ Asegurar que los headers coincidan con las columnas
- ✅ Verificar tipos de datos

### **2. Importación**
- ✅ Usar `validateOnly: true` primero
- ✅ Configurar `batchSize` apropiado (1000-5000)
- ✅ Usar `continueOnError: true` para datasets grandes

### **3. Rendimiento**
- ✅ Procesar archivos grandes en lotes
- ✅ Usar `truncateTable: true` para reemplazar datos
- ✅ Monitorear logs de progreso

### **4. Seguridad**
- ✅ Validar permisos de tabla antes de importar
- ✅ Limitar tamaño de archivo
- ✅ Sanitizar contenido CSV

## 🔧 **Configuración Técnica**

### **Requisitos**
- ✅ Tabla Oracle configurada en `entities.json`
- ✅ Permisos de INSERT en la tabla
- ✅ Oracle Client instalado

### **Limitaciones**
- **Tamaño máximo**: 10MB por archivo
- **Filas máximas**: 100,000 por importación
- **Formatos**: Solo CSV actualmente

## 🎉 **Ejemplos Completos**

### **Ejemplo 1: Importación Simple**
```json
{
  "csvContent": "DESCRIPCION,MOSTRAR\nProceso Test,1\nOtro Proceso,0",
  "tableName": "WORKFLOW.PROC_CAB",
  "mappings": [
    {"fileColumn": "0", "tableColumn": "DESCRIPCION"},
    {"fileColumn": "1", "tableColumn": "MOSTRAR"}
  ],
  "options": {
    "skipFirstRow": true,
    "continueOnError": true
  }
}
```

### **Ejemplo 2: Importación con Transformaciones**
```json
{
  "csvContent": "descripcion,activo,fecha\nProceso Test,SI,2025-01-01\nOtro Proceso,NO,2025-01-02",
  "tableName": "WORKFLOW.PROC_CAB",
  "mappings": [
    {
      "fileColumn": "0",
      "tableColumn": "DESCRIPCION",
      "transform": "value => value.toUpperCase()"
    },
    {
      "fileColumn": "1",
      "tableColumn": "MOSTRAR",
      "transform": "value => value === 'SI' ? 1 : 0"
    }
  ],
  "options": {
    "skipFirstRow": true,
    "truncateTable": true
  }
}
```

---

**🎯 La funcionalidad de importación de archivos está completamente implementada y lista para uso en producción.**

**Desarrollado por**: GitHub Copilot  
**Documentación**: Completa con ejemplos y mejores prácticas  
**Estado**: ✅ Implementado y probado
