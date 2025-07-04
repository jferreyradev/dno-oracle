/**
 * Script de demostración del generador de entidades
 * Muestra cómo funciona el generador con datos mock (sin conexión real a Oracle)
 */

// Datos mock que simula la respuesta de Oracle
const mockTableData = {
  columns: [
    {
      COLUMN_NAME: 'ID_PRODUCTO',
      DATA_TYPE: 'NUMBER',
      DATA_LENGTH: 22,
      DATA_PRECISION: null,
      DATA_SCALE: null,
      NULLABLE: 'N',
      DATA_DEFAULT: null,
      COLUMN_ID: 1,
      CONSTRAINT_TYPE: 'P',
      CONSTRAINT_NAME: 'PK_PRODUCTOS',
      IS_PRIMARY_KEY: 'YES'
    },
    {
      COLUMN_NAME: 'NOMBRE',
      DATA_TYPE: 'VARCHAR2',
      DATA_LENGTH: 100,
      DATA_PRECISION: null,
      DATA_SCALE: null,
      NULLABLE: 'N',
      DATA_DEFAULT: null,
      COLUMN_ID: 2,
      CONSTRAINT_TYPE: null,
      CONSTRAINT_NAME: null,
      IS_PRIMARY_KEY: 'NO'
    },
    {
      COLUMN_NAME: 'DESCRIPCION',
      DATA_TYPE: 'VARCHAR2',
      DATA_LENGTH: 500,
      DATA_PRECISION: null,
      DATA_SCALE: null,
      NULLABLE: 'Y',
      DATA_DEFAULT: null,
      COLUMN_ID: 3,
      CONSTRAINT_TYPE: null,
      CONSTRAINT_NAME: null,
      IS_PRIMARY_KEY: 'NO'
    },
    {
      COLUMN_NAME: 'PRECIO',
      DATA_TYPE: 'NUMBER',
      DATA_LENGTH: 22,
      DATA_PRECISION: 10,
      DATA_SCALE: 2,
      NULLABLE: 'N',
      DATA_DEFAULT: null,
      COLUMN_ID: 4,
      CONSTRAINT_TYPE: null,
      CONSTRAINT_NAME: null,
      IS_PRIMARY_KEY: 'NO'
    },
    {
      COLUMN_NAME: 'STOCK',
      DATA_TYPE: 'NUMBER',
      DATA_LENGTH: 22,
      DATA_PRECISION: null,
      DATA_SCALE: null,
      NULLABLE: 'Y',
      DATA_DEFAULT: ' 0',
      COLUMN_ID: 5,
      CONSTRAINT_TYPE: null,
      CONSTRAINT_NAME: null,
      IS_PRIMARY_KEY: 'NO'
    },
    {
      COLUMN_NAME: 'CATEGORIA',
      DATA_TYPE: 'VARCHAR2',
      DATA_LENGTH: 50,
      DATA_PRECISION: null,
      DATA_SCALE: null,
      NULLABLE: 'Y',
      DATA_DEFAULT: null,
      COLUMN_ID: 6,
      CONSTRAINT_TYPE: null,
      CONSTRAINT_NAME: null,
      IS_PRIMARY_KEY: 'NO'
    },
    {
      COLUMN_NAME: 'ACTIVO',
      DATA_TYPE: 'NUMBER',
      DATA_LENGTH: 1,
      DATA_PRECISION: 1,
      DATA_SCALE: null,
      NULLABLE: 'Y',
      DATA_DEFAULT: ' 1',
      COLUMN_ID: 7,
      CONSTRAINT_TYPE: null,
      CONSTRAINT_NAME: null,
      IS_PRIMARY_KEY: 'NO'
    },
    {
      COLUMN_NAME: 'FECHA_CREACION',
      DATA_TYPE: 'DATE',
      DATA_LENGTH: 7,
      DATA_PRECISION: null,
      DATA_SCALE: null,
      NULLABLE: 'Y',
      DATA_DEFAULT: ' SYSDATE',
      COLUMN_ID: 8,
      CONSTRAINT_TYPE: null,
      CONSTRAINT_NAME: null,
      IS_PRIMARY_KEY: 'NO'
    },
    {
      COLUMN_NAME: 'FECHA_ACTUALIZACION',
      DATA_TYPE: 'DATE',
      DATA_LENGTH: 7,
      DATA_PRECISION: null,
      DATA_SCALE: null,
      NULLABLE: 'Y',
      DATA_DEFAULT: null,
      COLUMN_ID: 9,
      CONSTRAINT_TYPE: null,
      CONSTRAINT_NAME: null,
      IS_PRIMARY_KEY: 'NO'
    }
  ],
  uniqueColumns: [],
  indexedColumns: ['NOMBRE', 'CATEGORIA', 'ACTIVO'],
  comments: {
    table: 'Catálogo de productos del sistema',
    columns: {
      'ID_PRODUCTO': 'Identificador único del producto',
      'NOMBRE': 'Nombre del producto',
      'DESCRIPCION': 'Descripción detallada del producto',
      'PRECIO': 'Precio unitario del producto',
      'STOCK': 'Cantidad disponible en inventario',
      'CATEGORIA': 'Categoría del producto',
      'ACTIVO': 'Indica si el producto está activo (1) o inactivo (0)'
    }
  },
  autoIncrementColumns: ['ID_PRODUCTO']
};

// Tipos de datos Oracle
const oracleTypeMap: Record<string, string> = {
  'NUMBER': 'NUMBER',
  'VARCHAR2': 'VARCHAR2',
  'CHAR': 'CHAR',
  'DATE': 'DATE',
  'TIMESTAMP': 'TIMESTAMP',
  'CLOB': 'CLOB',
  'BLOB': 'BLOB'
};

// Interfaces
interface ColumnInfo {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  DATA_LENGTH?: number | null;
  DATA_PRECISION?: number | null;
  DATA_SCALE?: number | null;
  NULLABLE: string;
  DATA_DEFAULT?: string | null;
  COLUMN_ID: number;
  CONSTRAINT_TYPE?: string | null;
  CONSTRAINT_NAME?: string | null;
  IS_PRIMARY_KEY: string;
}

interface FieldConfig {
  type: string;
  required: boolean;
  displayName: string;
  description: string;
  length?: number;
  precision?: number;
  scale?: number;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  readonly?: boolean;
  unique?: boolean;
  searchable?: boolean;
  default?: string;
  format?: string;
}

// Función para formatear nombres
function formatDisplayName(columnName: string): string {
  return columnName
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

// Función para generar configuración de campo
function generateFieldConfig(
  column: ColumnInfo, 
  uniqueColumns: string[], 
  indexedColumns: string[], 
  comments: Record<string, string>, 
  autoIncrementColumns: string[]
): FieldConfig {
  const fieldConfig: FieldConfig = {
    type: oracleTypeMap[column.DATA_TYPE] || column.DATA_TYPE,
    required: column.NULLABLE === 'N',
    displayName: formatDisplayName(column.COLUMN_NAME),
    description: comments[column.COLUMN_NAME] || `Campo ${formatDisplayName(column.COLUMN_NAME)}`
  };

  // Añadir longitud si aplica
  if (column.DATA_LENGTH && ['VARCHAR2', 'CHAR', 'NVARCHAR2', 'NCHAR'].includes(column.DATA_TYPE)) {
    fieldConfig.length = column.DATA_LENGTH;
  }

  // Añadir precisión y escala para números
  if (column.DATA_PRECISION && column.DATA_TYPE === 'NUMBER') {
    fieldConfig.precision = column.DATA_PRECISION;
    if (column.DATA_SCALE) {
      fieldConfig.scale = column.DATA_SCALE;
    }
  }

  // Marcar como clave primaria
  if (column.IS_PRIMARY_KEY === 'YES') {
    fieldConfig.primaryKey = true;
  }

  // Marcar como auto-increment
  if (autoIncrementColumns.includes(column.COLUMN_NAME)) {
    fieldConfig.autoIncrement = true;
    fieldConfig.readonly = true;
  }

  // Marcar como único
  if (uniqueColumns.includes(column.COLUMN_NAME)) {
    fieldConfig.unique = true;
  }

  // Marcar como searchable si está indexado o es texto
  if (indexedColumns.includes(column.COLUMN_NAME) || 
      ['VARCHAR2', 'CHAR', 'NVARCHAR2', 'NCHAR', 'CLOB'].includes(column.DATA_TYPE)) {
    fieldConfig.searchable = true;
  }

  // Valor por defecto
  if (column.DATA_DEFAULT) {
    fieldConfig.default = column.DATA_DEFAULT.trim();
  }

  // Marcar campos de auditoría como readonly
  if (['CREATED_AT', 'UPDATED_AT', 'CREATED_DATE', 'UPDATED_DATE', 'FECHA_CREACION', 'FECHA_ACTUALIZACION'].includes(column.COLUMN_NAME)) {
    fieldConfig.readonly = true;
  }

  return fieldConfig;
}

// Función para generar filtros
function generateCommonFilters(columns: ColumnInfo[]) {
  const filters: Record<string, unknown> = {};

  // Buscar campos de estado activo/inactivo
  const statusField = columns.find(col => 
    ['IS_ACTIVE', 'ACTIVO', 'ESTADO', 'STATUS', 'MOSTRAR'].includes(col.COLUMN_NAME)
  );

  if (statusField) {
    const fieldName = statusField.COLUMN_NAME;
    filters.active = {
      field: fieldName,
      operator: "=",
      value: 1,
      displayName: "Solo activos"
    };
    filters.inactive = {
      field: fieldName,
      operator: "=",
      value: 0,
      displayName: "Solo inactivos"
    };
  }

  // Buscar campos de fecha para filtro "recientes"
  const dateField = columns.find(col => 
    ['CREATED_AT', 'CREATED_DATE', 'FECHA_CREACION'].includes(col.COLUMN_NAME)
  );

  if (dateField) {
    filters.recent = {
      field: dateField.COLUMN_NAME,
      operator: ">=",
      value: "SYSDATE - 30",
      displayName: "Últimos 30 días"
    };
  }

  return filters;
}

// Función para generar validaciones
function generateCommonValidations(columns: ColumnInfo[]) {
  const validations: Record<string, unknown> = {};

  columns.forEach(column => {
    const validation: Record<string, unknown> = {};

    // Validación de requerido
    if (column.NULLABLE === 'N' && column.IS_PRIMARY_KEY !== 'YES') {
      validation.required = true;
    }

    // Validación de longitud
    if (column.DATA_LENGTH && ['VARCHAR2', 'CHAR', 'NVARCHAR2', 'NCHAR'].includes(column.DATA_TYPE)) {
      validation.maxLength = column.DATA_LENGTH;
    }

    // Validación de campos de estado
    if (['IS_ACTIVE', 'ACTIVO', 'ESTADO', 'STATUS', 'MOSTRAR'].includes(column.COLUMN_NAME)) {
      validation.allowedValues = [0, 1];
    }

    // Mensaje de validación
    if (Object.keys(validation).length > 0) {
      validation.message = `Validación para ${formatDisplayName(column.COLUMN_NAME)}`;
      validations[column.COLUMN_NAME] = validation;
    }
  });

  return validations;
}

// Función para generar acciones personalizadas
function generateCommonActions(columns: ColumnInfo[], tableName: string) {
  const actions: Record<string, unknown> = {};

  // Buscar campos de estado para generar acciones toggle
  const statusField = columns.find(col => 
    ['IS_ACTIVE', 'ACTIVO', 'ESTADO', 'STATUS', 'MOSTRAR'].includes(col.COLUMN_NAME)
  );

  if (statusField) {
    const fieldName = statusField.COLUMN_NAME;
    const pkField = columns.find(col => col.IS_PRIMARY_KEY === 'YES');
    
    if (pkField) {
      actions[`toggle-${fieldName.toLowerCase()}`] = {
        type: "UPDATE",
        sql: `UPDATE ${tableName} SET ${fieldName} = CASE WHEN ${fieldName} = 1 THEN 0 ELSE 1 END WHERE ${pkField.COLUMN_NAME} = :id`,
        displayName: `Cambiar ${formatDisplayName(fieldName)}`,
        description: `Cambia el estado de ${formatDisplayName(fieldName)}`
      };

      actions[`activate`] = {
        type: "UPDATE",
        sql: `UPDATE ${tableName} SET ${fieldName} = 1 WHERE ${pkField.COLUMN_NAME} = :id`,
        displayName: "Activar",
        description: "Activa el registro"
      };

      actions[`deactivate`] = {
        type: "UPDATE",
        sql: `UPDATE ${tableName} SET ${fieldName} = 0 WHERE ${pkField.COLUMN_NAME} = :id`,
        displayName: "Desactivar",
        description: "Desactiva el registro"
      };
    }
  }

  return actions;
}

// Función principal de demostración
function generateDemoEntityConfig(tableName: string, entityName?: string) {
  const columns = mockTableData.columns;
  const uniqueColumns = mockTableData.uniqueColumns;
  const indexedColumns = mockTableData.indexedColumns;
  const comments = mockTableData.comments;
  const autoIncrementColumns = mockTableData.autoIncrementColumns;

  // Generar configuración
  const entityKey = entityName || tableName.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
  const primaryKeyField = columns.find(col => col.IS_PRIMARY_KEY === 'YES');

  const entityConfig = {
    tableName: tableName,
    primaryKey: primaryKeyField?.COLUMN_NAME || columns[0].COLUMN_NAME,
    autoIncrement: autoIncrementColumns.length > 0,
    displayName: formatDisplayName(tableName),
    description: comments.table || `Tabla ${formatDisplayName(tableName)}`,
    fields: {} as Record<string, FieldConfig>,
    operations: {
      create: true,
      read: true,
      update: true,
      delete: true,
      search: true,
      paginate: true
    },
    filters: generateCommonFilters(columns),
    validations: generateCommonValidations(columns),
    customActions: generateCommonActions(columns, tableName)
  };

  // Generar configuración de campos
  columns.forEach(column => {
    entityConfig.fields[column.COLUMN_NAME] = generateFieldConfig(
      column, 
      uniqueColumns, 
      indexedColumns, 
      comments.columns, 
      autoIncrementColumns
    );
  });

  return { [entityKey]: entityConfig };
}

// Función principal
function main() {
  const args = Deno.args;
  
  console.log(`
🎭 Demostración del Generador de Entidades Oracle

📊 Generando configuración para tabla de ejemplo: PRODUCTOS
  `);

  const tableName = args[0] || "PRODUCTOS";
  const entityName = args[1] || "productos";

  try {
    const config = generateDemoEntityConfig(tableName, entityName);
    
    console.log(`✅ Configuración generada exitosamente!`);
    console.log(`\n📋 Configuración JSON:`);
    console.log('─'.repeat(50));
    
    // Mostrar JSON con formato bonito
    console.log(JSON.stringify(config, null, 2));
    
    console.log('─'.repeat(50));
    console.log(`\n💡 Esta es una demostración con datos mock.`);
    console.log(`   Para usar datos reales, usa: generate-entity-config.ts`);
    console.log(`\n🚀 Ejemplo de uso real:`);
    console.log(`   deno run --allow-net --allow-read --allow-env scripts/generate-entity-config.ts PRODUCTOS productos`);

  } catch (error) {
    console.error(`\n❌ Error: ${error}`);
  }
}

// Ejecutar demostración
if (import.meta.main) {
  main();
}
