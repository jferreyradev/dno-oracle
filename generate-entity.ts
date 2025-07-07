#!/usr/bin/env deno run --allow-net --allow-read --allow-write --allow-env

/**
 * Generador de entidades para DNO-Oracle
 * Permite agregar nuevas entidades de forma interactiva
 */

import { load } from './deps.ts';
import { oracledb } from './deps.ts';

// Cargar variables de entorno
await load({ export: true });

// Configuración de la conexión Oracle
const dbConfig = {
  user: Deno.env.get('USER') || 'WORKFLOW',
  password: Deno.env.get('PASSWORD') || 'workflow',
  connectString: Deno.env.get('CONNECTIONSTRING') || 'localhost:1521/XE',
  poolMax: 1,
  poolMin: 1,
  poolIncrement: 0,
  poolTimeout: 4
};

// Configuración de tipos Oracle a tipos del sistema
const oracleTypeMap: Record<string, string> = {
  'NUMBER': 'NUMBER',
  'VARCHAR2': 'VARCHAR2',
  'CHAR': 'CHAR',
  'DATE': 'DATE',
  'TIMESTAMP': 'TIMESTAMP',
  'CLOB': 'CLOB',
  'BLOB': 'BLOB',
  'INTEGER': 'INTEGER',
  'FLOAT': 'FLOAT'
};

interface TableInfo {
  tableName: string;
  columns: ColumnInfo[];
  primaryKey?: string;
}

interface ColumnInfo {
  name: string;
  type: string;
  length?: number;
  precision?: number;
  scale?: number;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
}

class EntityGenerator {
  private connection: any = null;

  async connect() {
    try {
      // Inicializar Oracle Client si no está inicializado
      const libPath = Deno.env.get('LIB_ORA') || 'C:\\oracle\\instantclient_21_11';
      try {
        oracledb.initOracleClient({ libDir: libPath });
      } catch {
        // Ya está inicializado
      }

      this.connection = await oracledb.getConnection(dbConfig);
      console.log('✅ Conectado a Oracle Database');
    } catch (error) {
      console.error('❌ Error conectando a Oracle:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.close();
      console.log('🔌 Desconectado de Oracle');
    }
  }

  async getTableInfo(tableName: string): Promise<TableInfo> {
    const sql = `
      SELECT 
        c.COLUMN_NAME,
        c.DATA_TYPE,
        c.DATA_LENGTH,
        c.DATA_PRECISION,
        c.DATA_SCALE,
        c.NULLABLE,
        c.DATA_DEFAULT,
        CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 'Y' ELSE 'N' END as IS_PRIMARY_KEY
      FROM USER_TAB_COLUMNS c
      LEFT JOIN (
        SELECT cc.COLUMN_NAME, cc.TABLE_NAME
        FROM USER_CONSTRAINTS con
        JOIN USER_CONS_COLUMNS cc ON con.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
        WHERE con.CONSTRAINT_TYPE = 'P'
      ) pk ON c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME
      WHERE c.TABLE_NAME = UPPER(:tableName)
      ORDER BY c.COLUMN_ID
    `;

    const result = await this.connection.execute(sql, { tableName });
    const columns: ColumnInfo[] = [];
    let primaryKey: string | undefined;

    for (const row of result.rows) {
      const column: ColumnInfo = {
        name: row[0],
        type: oracleTypeMap[row[1]] || row[1],
        length: row[2],
        precision: row[3],
        scale: row[4],
        nullable: row[5] === 'Y',
        defaultValue: row[6],
        isPrimaryKey: row[7] === 'Y'
      };

      if (column.isPrimaryKey) {
        primaryKey = column.name;
      }

      columns.push(column);
    }

    return {
      tableName,
      columns,
      primaryKey
    };
  }

  async generateEntity(tableName: string, entityName: string): Promise<any> {
    const tableInfo = await this.getTableInfo(tableName);
    
    if (tableInfo.columns.length === 0) {
      throw new Error(`La tabla ${tableName} no existe o no se puede acceder`);
    }

    const fields: any = {};
    
    for (const col of tableInfo.columns) {
      const field: any = {
        type: col.type,
        required: !col.nullable,
        displayName: this.formatDisplayName(col.name),
        description: `Campo ${col.name.toLowerCase()}`
      };

      if (col.isPrimaryKey) {
        field.primaryKey = true;
        field.readonly = true;
        if (col.type === 'NUMBER') {
          field.autoIncrement = true;
        }
      }

      if (col.length && (col.type === 'VARCHAR2' || col.type === 'CHAR')) {
        field.length = col.length;
      }

      if (col.precision && col.type === 'NUMBER') {
        field.precision = col.precision;
        if (col.scale !== null) {
          field.scale = col.scale;
        }
      }

      if (col.defaultValue) {
        field.default = col.defaultValue.trim();
      }

      // Hacer campos de texto buscables
      if (col.type === 'VARCHAR2' || col.type === 'CHAR') {
        field.searchable = true;
      }

      fields[col.name] = field;
    }

    const entity = {
      tableName: tableName,
      primaryKey: tableInfo.primaryKey,
      autoIncrement: tableInfo.primaryKey ? true : false,
      displayName: this.formatDisplayName(entityName),
      description: `Entidad ${entityName} generada automáticamente`,
      fields,
      operations: {
        create: true,
        read: true,
        update: true,
        delete: true
      },
      endpoints: [
        `/api/${entityName}`,
        `/api/${entityName}/:id`
      ]
    };

    return entity;
  }

  private formatDisplayName(name: string): string {
    return name.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  async addEntityToConfig(entityName: string, entityConfig: any) {
    const configPath = './config/entities.json';
    
    let config: any;
    try {
      const content = await Deno.readTextFile(configPath);
      config = JSON.parse(content);
    } catch {
      config = { entities: {}, config: {} };
    }

    config.entities[entityName] = entityConfig;

    await Deno.writeTextFile(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ Entidad '${entityName}' agregada a ${configPath}`);
  }

  async listTables(): Promise<string[]> {
    const sql = `
      SELECT TABLE_NAME 
      FROM USER_TABLES 
      ORDER BY TABLE_NAME
    `;

    const result = await this.connection.execute(sql);
    return result.rows.map((row: any) => row[0]);
  }

  async showTablePreview(tableName: string) {
    const sql = `SELECT * FROM ${tableName} WHERE ROWNUM <= 3`;
    
    try {
      const result = await this.connection.execute(sql);
      
      console.log(`\n📋 Vista previa de ${tableName}:`);
      console.log('Columnas:', result.metaData.map((col: any) => col.name).join(', '));
      console.log(`Registros (primeros 3):`);
      
      if (result.rows.length === 0) {
        console.log('  (Sin datos)');
      } else {
        result.rows.forEach((row: any, i: number) => {
          console.log(`  ${i + 1}:`, row.join(' | '));
        });
      }
    } catch (error) {
      console.log(`❌ Error accediendo a ${tableName}:`, error.message);
    }
  }
}

// Función principal interactiva
async function main() {
  console.log('🚀 Generador de Entidades DNO-Oracle\n');
  
  const generator = new EntityGenerator();
  
  try {
    await generator.connect();
    
    // Mostrar tablas disponibles
    const tables = await generator.listTables();
    console.log('📊 Tablas disponibles:');
    tables.forEach((table, i) => {
      console.log(`  ${i + 1}. ${table}`);
    });
    
    // Solicitar entrada del usuario
    const tableName = prompt('\n🔍 Nombre de la tabla (ej: USUARIOS):');
    if (!tableName) {
      console.log('❌ Nombre de tabla requerido');
      return;
    }
    
    const entityName = prompt('📝 Nombre de la entidad (ej: usuarios):') || tableName.toLowerCase();
    
    // Mostrar vista previa
    await generator.showTablePreview(tableName);
    
    // Confirmar
    const confirm = prompt('\n❓ ¿Generar entidad? (s/N):');
    if (confirm?.toLowerCase() !== 's') {
      console.log('❌ Operación cancelada');
      return;
    }
    
    // Generar entidad
    console.log('\n🔄 Generando entidad...');
    const entityConfig = await generator.generateEntity(tableName, entityName);
    
    // Mostrar configuración generada
    console.log('\n📋 Configuración generada:');
    console.log(JSON.stringify(entityConfig, null, 2));
    
    // Agregar a entities.json
    await generator.addEntityToConfig(entityName, entityConfig);
    
    console.log('\n✅ ¡Entidad generada exitosamente!');
    console.log('🔄 Reinicia el servidor para aplicar los cambios');
    console.log(`📡 Endpoints disponibles:`);
    console.log(`   GET    /api/${entityName}`);
    console.log(`   GET    /api/${entityName}/:id`);
    console.log(`   POST   /api/${entityName}`);
    console.log(`   PUT    /api/${entityName}/:id`);
    console.log(`   DELETE /api/${entityName}/:id`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await generator.disconnect();
  }
}

// Ejecutar solo si es el módulo principal
if (import.meta.main) {
  await main();
}

export { EntityGenerator };
