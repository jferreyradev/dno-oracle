#!/usr/bin/env -S deno run --allow-all

/**
 * Generador automático de configuración de entidades Oracle
 * 
 * Este script se conecta a Oracle, analiza la estructura de una tabla específica
 * y genera automáticamente la configuración JSON para entities.json
 */

import { load } from "https://deno.land/std@0.204.0/dotenv/mod.ts";
import oracledb from 'npm:oracledb@6.0.2';

// Interfaces para los tipos de datos
interface OracleColumnInfo {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  DATA_LENGTH: number;
  DATA_PRECISION: number;
  DATA_SCALE: number;
  NULLABLE: string;
  COLUMN_DEFAULT: string;
  COLUMN_ID: number;
  COMMENTS: string;
}

interface OracleConstraintInfo {
  CONSTRAINT_NAME: string;
  CONSTRAINT_TYPE: string;
  COLUMN_NAME: string;
  SEARCH_CONDITION: string;
  R_CONSTRAINT_NAME: string;
  DELETE_RULE: string;
}

interface EntityField {
  type: string;
  length?: number;
  precision?: number;
  scale?: number;
  required: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  displayName: string;
  description: string;
  readonly?: boolean;
  searchable?: boolean;
  default?: string | number;
  values?: Array<{ value: string | number; label: string }>;
}

interface EntityConfig {
  tableName: string;
  primaryKey: string;
  autoIncrement: boolean;
  displayName: string;
  description: string;
  fields: Record<string, EntityField>;
}

interface OracleConnection {
  execute: (sql: string, params?: Record<string, string>) => Promise<{ rows: unknown[][] }>;
  close: () => Promise<void>;
}

interface QueryParams {
  [key: string]: string;
}

class OracleEntityGenerator {
  private connection: OracleConnection | null = null;
  private silent: boolean = false;

  constructor(silent: boolean = false) {
    this.silent = silent;
  }

  private log(message: string, level: 'info' | 'error' | 'success' | 'warning' = 'info') {
    if (this.silent) return;
    
    const symbols = {
      info: '🔍',
      error: '❌',
      success: '✅',
      warning: '⚠️'
    };

    console.log(`${symbols[level]} ${message}`);
  }

  async connect(): Promise<boolean> {
    try {
      // Cargar variables de entorno
      const env = await load();
      
      // Configurar Oracle Instant Client en modo Thick si está definido
      const libPath = env.LIB_ORA || Deno.env.get('LIB_ORA');
      if (libPath) {
        try {
          oracledb.initOracleClient({ libDir: libPath });
          this.log(`Oracle Instant Client configurado: ${libPath}`);
        } catch (error) {
          // Ignorar si ya está inicializado
          if (!(error instanceof Error && error.message.includes('DPI-1047'))) {
            this.log(`Advertencia configurando Oracle Client: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'warning');
          }
        }
      }
      
      const config = {
        user: env.USER || Deno.env.get('USER'),
        password: env.PASSWORD || Deno.env.get('PASSWORD'),
        connectString: env.CONNECTIONSTRING || Deno.env.get('CONNECTIONSTRING'),
        poolMin: 1,
        poolMax: 1,
        poolIncrement: 0
      };

      if (!config.user || !config.password || !config.connectString) {
        this.log('Faltan variables de entorno Oracle', 'error');
        this.log('Verifica que estén configuradas: USER, PASSWORD, CONNECTIONSTRING', 'error');
        this.log(`Valores encontrados: USER=${config.user}, PASSWORD=${config.password ? '***' : 'undefined'}, CONNECTIONSTRING=${config.connectString}`, 'error');
        return false;
      }

      this.log('Conectando a Oracle...');
      this.connection = await oracledb.getConnection(config);
      this.log('Conexión establecida exitosamente', 'success');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.log(`Error conectando a Oracle: ${errorMessage}`, 'error');
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.close();
        this.log('Conexión cerrada');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        this.log(`Error cerrando conexión: ${errorMessage}`, 'error');
      }
    }
  }

  private mapOracleTypeToGeneric(dataType: string, _dataLength: number, dataPrecision: number, dataScale: number): string {
    const type = dataType.toUpperCase();
    
    switch (type) {
      case 'NUMBER':
        if (dataScale === 0) {
          return dataPrecision && dataPrecision <= 10 ? 'INTEGER' : 'NUMBER';
        }
        return 'NUMBER';
      case 'VARCHAR2':
      case 'CHAR':
      case 'NVARCHAR2':
      case 'NCHAR':
        return 'VARCHAR2';
      case 'DATE':
        return 'DATE';
      case 'TIMESTAMP':
        return 'TIMESTAMP';
      case 'CLOB':
      case 'NCLOB':
        return 'CLOB';
      case 'BLOB':
        return 'BLOB';
      case 'RAW':
        return 'RAW';
      default:
        return type;
    }
  }

  private generateDisplayName(columnName: string): string {
    // Convertir nombre de columna a formato más legible
    return columnName
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/^Id\b/, 'ID');
  }

  private generateDescription(columnName: string, comments: string): string {
    if (comments && comments.trim()) {
      return comments.trim();
    }
    
    // Generar descripción básica basada en el nombre de la columna
    const displayName = this.generateDisplayName(columnName);
    return `Campo ${displayName}`;
  }

  async getTableColumns(tableName: string): Promise<OracleColumnInfo[]> {
    if (!this.connection) {
      throw new Error('No hay conexión a la base de datos');
    }

    const [schema, table] = tableName.includes('.') ? tableName.split('.') : ['', tableName];
    
    const query = `
      SELECT 
        c.COLUMN_NAME,
        c.DATA_TYPE,
        c.DATA_LENGTH,
        c.DATA_PRECISION,
        c.DATA_SCALE,
        c.NULLABLE,
        c.DATA_DEFAULT as COLUMN_DEFAULT,
        c.COLUMN_ID,
        cc.COMMENTS
      FROM 
        ALL_TAB_COLUMNS c
        LEFT JOIN ALL_COL_COMMENTS cc ON c.OWNER = cc.OWNER 
          AND c.TABLE_NAME = cc.TABLE_NAME 
          AND c.COLUMN_NAME = cc.COLUMN_NAME
      WHERE 
        c.TABLE_NAME = :table_name
        ${schema ? 'AND c.OWNER = :schema' : ''}
      ORDER BY 
        c.COLUMN_ID
    `;

    const params: QueryParams = { table_name: table };
    if (schema) {
      params.schema = schema;
    }

    const result = await this.connection.execute(query, params);
    return result.rows.map((row: unknown[]) => ({
      COLUMN_NAME: row[0] as string,
      DATA_TYPE: row[1] as string,
      DATA_LENGTH: row[2] as number,
      DATA_PRECISION: row[3] as number,
      DATA_SCALE: row[4] as number,
      NULLABLE: row[5] as string,
      COLUMN_DEFAULT: row[6] as string,
      COLUMN_ID: row[7] as number,
      COMMENTS: row[8] as string
    }));
  }

  async getTableConstraints(tableName: string): Promise<OracleConstraintInfo[]> {
    if (!this.connection) {
      throw new Error('No hay conexión a la base de datos');
    }

    const [schema, table] = tableName.includes('.') ? tableName.split('.') : ['', tableName];
    
    const query = `
      SELECT 
        c.CONSTRAINT_NAME,
        c.CONSTRAINT_TYPE,
        cc.COLUMN_NAME,
        c.SEARCH_CONDITION,
        c.R_CONSTRAINT_NAME,
        c.DELETE_RULE
      FROM 
        ALL_CONSTRAINTS c
        LEFT JOIN ALL_CONS_COLUMNS cc ON c.OWNER = cc.OWNER 
          AND c.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
      WHERE 
        c.TABLE_NAME = :table_name
        ${schema ? 'AND c.OWNER = :schema' : ''}
        AND c.CONSTRAINT_TYPE IN ('P', 'R', 'C', 'U')
      ORDER BY 
        c.CONSTRAINT_TYPE, cc.POSITION
    `;

    const params: QueryParams = { table_name: table };
    if (schema) {
      params.schema = schema;
    }

    const result = await this.connection.execute(query, params);
    return result.rows.map((row: unknown[]) => ({
      CONSTRAINT_NAME: row[0] as string,
      CONSTRAINT_TYPE: row[1] as string,
      COLUMN_NAME: row[2] as string,
      SEARCH_CONDITION: row[3] as string,
      R_CONSTRAINT_NAME: row[4] as string,
      DELETE_RULE: row[5] as string
    }));
  }

  async checkTableExists(tableName: string): Promise<boolean> {
    if (!this.connection) {
      throw new Error('No hay conexión a la base de datos');
    }

    const [schema, table] = tableName.includes('.') ? tableName.split('.') : ['', tableName];
    
    const query = `
      SELECT COUNT(*) as TABLE_COUNT
      FROM ALL_TABLES
      WHERE TABLE_NAME = :table_name
      ${schema ? 'AND OWNER = :schema' : ''}
    `;

    const params: QueryParams = { table_name: table };
    if (schema) {
      params.schema = schema;
    }

    const result = await this.connection.execute(query, params);
    return (result.rows[0][0] as number) > 0;
  }

  async generateEntityConfig(tableName: string, entityName?: string): Promise<EntityConfig | null> {
    try {
      this.log(`Analizando tabla: ${tableName}`);
      
      // Verificar que la tabla existe
      const tableExists = await this.checkTableExists(tableName);
      if (!tableExists) {
        this.log(`La tabla ${tableName} no existe o no es accesible`, 'error');
        return null;
      }

      // Obtener información de columnas
      const columns = await this.getTableColumns(tableName);
      if (columns.length === 0) {
        this.log(`No se encontraron columnas para la tabla ${tableName}`, 'error');
        return null;
      }

      // Obtener información de constraints
      const constraints = await this.getTableConstraints(tableName);
      
      // Identificar clave primaria
      const primaryKeyConstraint = constraints.find(c => c.CONSTRAINT_TYPE === 'P');
      const primaryKey = primaryKeyConstraint?.COLUMN_NAME || columns[0].COLUMN_NAME;
      
      // Verificar si la clave primaria es auto-incrementable (secuencia)
      const autoIncrement = await this.checkAutoIncrement(tableName, primaryKey);

      this.log(`Encontradas ${columns.length} columnas`);
      this.log(`Clave primaria: ${primaryKey}`);

      // Generar configuración de campos
      const fields: Record<string, EntityField> = {};
      
      for (const column of columns) {
        const isPrimaryKey = column.COLUMN_NAME === primaryKey;
        const genericType = this.mapOracleTypeToGeneric(
          column.DATA_TYPE,
          column.DATA_LENGTH,
          column.DATA_PRECISION,
          column.DATA_SCALE
        );

        const field: EntityField = {
          type: genericType,
          required: column.NULLABLE === 'N',
          displayName: this.generateDisplayName(column.COLUMN_NAME),
          description: this.generateDescription(column.COLUMN_NAME, column.COMMENTS),
          searchable: genericType === 'VARCHAR2' && !isPrimaryKey
        };

        // Agregar propiedades específicas del tipo
        if (genericType === 'VARCHAR2' && column.DATA_LENGTH) {
          field.length = column.DATA_LENGTH;
        }
        
        if (genericType === 'NUMBER' && column.DATA_PRECISION) {
          field.precision = column.DATA_PRECISION;
          if (column.DATA_SCALE !== null) {
            field.scale = column.DATA_SCALE;
          }
        }

        // Propiedades de clave primaria
        if (isPrimaryKey) {
          field.primaryKey = true;
          field.readonly = true;
          field.searchable = false;
          if (autoIncrement) {
            field.autoIncrement = true;
          }
        }

        // Valor por defecto
        if (column.COLUMN_DEFAULT) {
          const defaultValue = column.COLUMN_DEFAULT.trim();
          if (defaultValue !== 'NULL') {
            if (genericType === 'INTEGER' || genericType === 'NUMBER') {
              field.default = parseInt(defaultValue) || 0;
            } else {
              field.default = defaultValue.replace(/^'|'$/g, '');
            }
          }
        }

        fields[column.COLUMN_NAME] = field;
      }

      const entityConfig: EntityConfig = {
        tableName: tableName,
        primaryKey: primaryKey,
        autoIncrement: autoIncrement,
        displayName: entityName || this.generateDisplayName(tableName.split('.').pop() || tableName),
        description: `Tabla ${tableName}`,
        fields: fields
      };

      this.log(`Configuración generada exitosamente`, 'success');
      return entityConfig;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.log(`Error generando configuración: ${errorMessage}`, 'error');
      return null;
    }
  }

  private async checkAutoIncrement(tableName: string, columnName: string): Promise<boolean> {
    try {
      if (!this.connection) {
        throw new Error('No hay conexión a la base de datos');
      }

      const [schema, table] = tableName.includes('.') ? tableName.split('.') : ['', tableName];
      
      // Buscar triggers que implementen auto-increment
      const query = `
        SELECT COUNT(*) as TRIGGER_COUNT
        FROM ALL_TRIGGERS
        WHERE TABLE_NAME = :table_name
        ${schema ? 'AND OWNER = :schema' : ''}
        AND TRIGGER_TYPE = 'BEFORE EACH ROW'
        AND TRIGGERING_EVENT = 'INSERT'
        AND UPPER(TRIGGER_BODY) LIKE '%${columnName.toUpperCase()}%'
        AND UPPER(TRIGGER_BODY) LIKE '%NEXTVAL%'
      `;

      const params: QueryParams = { table_name: table };
      if (schema) {
        params.schema = schema;
      }

      const result = await this.connection.execute(query, params);
      return (result.rows[0][0] as number) > 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.log(`Error verificando auto-increment: ${errorMessage}`, 'warning');
      return false;
    }
  }
}

// Función para agregar entidad al archivo entities.json
async function addToEntitiesFile(entityConfig: Record<string, EntityConfig>, entityKey: string, silent: boolean = false): Promise<boolean> {
  const entitiesFile = 'config/entities.json';
  
  try {
    // Verificar que el archivo existe
    let currentContent: { entities: Record<string, EntityConfig> };
    try {
      const fileContent = await Deno.readTextFile(entitiesFile);
      currentContent = JSON.parse(fileContent);
    } catch (_error) {
      if (!silent) {
        console.log(`⚠️ Archivo ${entitiesFile} no encontrado, creando nuevo archivo...`);
      }
      currentContent = { entities: {} };
    }

    // Asegurar que existe la estructura entities
    if (!currentContent.entities) {
      currentContent.entities = {};
    }

    // Agregar la nueva entidad
    currentContent.entities[entityKey] = entityConfig[entityKey];

    // Guardar el archivo actualizado
    await Deno.writeTextFile(entitiesFile, JSON.stringify(currentContent, null, 2));

    if (!silent) {
      console.log(`✅ Entidad '${entityKey}' agregada exitosamente a ${entitiesFile}`);
      console.log(`🔄 Reinicia el servidor para aplicar los cambios`);
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    if (!silent) {
      console.error(`❌ Error agregando entidad a ${entitiesFile}: ${errorMessage}`);
    }
    return false;
  }
}

// Función principal
async function main() {
  const args = Deno.args;
  
  if (args.length === 0) {
    console.log(`
🔧 Generador de Configuración de Entidades Oracle

USO:
  deno run --allow-all scripts/generate-entity-config.ts <TABLA> [ENTIDAD] [--silent] [--add-to-entities] [--save-file=<archivo>]

PARÁMETROS:
  TABLA               Nombre de la tabla Oracle (requerido)
  ENTIDAD             Nombre de la entidad en el JSON (opcional)
  --silent            Modo silencioso (solo salida JSON)
  --add-to-entities   Agregar automáticamente a config/entities.json
  --save-file=<archivo> Guardar en archivo específico

EJEMPLOS:
  deno run --allow-all scripts/generate-entity-config.ts USUARIOS
  deno run --allow-all scripts/generate-entity-config.ts WORKFLOW.ADIFDO adifdo
  deno run --allow-all scripts/generate-entity-config.ts USUARIOS --add-to-entities
  deno run --allow-all scripts/generate-entity-config.ts USUARIOS --save-file=usuarios.json
  deno run --allow-all scripts/generate-entity-config.ts USUARIOS --silent --add-to-entities
`);
    Deno.exit(1);
  }

  const tableName = args[0];
  const entityName = args.length > 1 && !args[1].startsWith('--') ? args[1] : undefined;
  const silent = args.includes('--silent');
  const addToEntities = args.includes('--add-to-entities');
  
  // Extraer nombre de archivo de --save-file=archivo
  const saveFileArg = args.find(arg => arg.startsWith('--save-file='));
  const saveFile = saveFileArg ? saveFileArg.split('=')[1] : undefined;

  const generator = new OracleEntityGenerator(silent);

  try {
    // Conectar a la base de datos
    const connected = await generator.connect();
    if (!connected) {
      Deno.exit(1);
    }

    // Generar configuración
    const config = await generator.generateEntityConfig(tableName, entityName);
    
    if (!config) {
      Deno.exit(1);
    }

    // Crear el objeto de salida con la estructura correcta
    const entityKey = entityName || tableName.split('.').pop()?.toLowerCase() || tableName.toLowerCase();
    const output = {
      [entityKey]: config
    };

    // Agregar a entities.json si se solicita
    if (addToEntities) {
      const added = await addToEntitiesFile(output, entityKey, silent);
      if (!added) {
        Deno.exit(1);
      }
    }

    // Guardar en archivo si se solicita
    if (saveFile) {
      try {
        await Deno.writeTextFile(saveFile, JSON.stringify(output, null, 2));
        if (!silent) {
          console.log(`💾 Configuración guardada en: ${saveFile}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error(`❌ Error guardando archivo ${saveFile}: ${errorMessage}`);
        Deno.exit(1);
      }
    }

    // Mostrar resultado solo si no es silencioso y no se está agregando a entities.json
    if (!silent && !addToEntities) {
      console.log(JSON.stringify(output, null, 2));
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`❌ Error: ${errorMessage}`);
    Deno.exit(1);
  } finally {
    await generator.disconnect();
  }
}

// Ejecutar solo si es el módulo principal
if (import.meta.main) {
  main();
}
