/**
 * Servicio de base de datos Oracle
 * Proporciona funciones para ejecutar consultas SQL y statements
 */

import { oracledb, load } from '../../deps.ts';

// Cargar variables de entorno
await load({ export: true });

// Inicializar Oracle en modo Thick para mayor compatibilidad
try {
  const libPath = Deno.env.get('LIB_ORA') || 'C:\\oracle\\instantclient_21_11';
  oracledb.initOracleClient({ libDir: libPath });
  console.log('✅ Oracle Client inicializado en modo Thick');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn('⚠️  Oracle Client ya inicializado o modo Thin:', message);
}

// Configuración de la conexión a Oracle
const dbConfig = {
  user: Deno.env.get('USER') || 'hr',
  password: Deno.env.get('PASSWORD') || 'password',
  connectString: Deno.env.get('CONNECTIONSTRING') || 'localhost:1521/XE',
  poolMax: parseInt(Deno.env.get('POOL') || '10'),
  poolMin: 2,
  poolIncrement: 1,
  poolTimeout: 4
};

// Debug: Mostrar configuración (sin contraseña)
console.log('🔧 Configuración de Oracle:');
console.log(`   Usuario: ${dbConfig.user}`);
console.log(`   Conexión: ${dbConfig.connectString}`);
console.log(`   Pool Max: ${dbConfig.poolMax}`);

// Pool de conexiones
let connectionPool: oracledb.Pool | null = null;

/**
 * Inicializa el pool de conexiones
 */
export async function initializePool(): Promise<void> {
  try {
    if (!connectionPool) {
      connectionPool = await oracledb.createPool(dbConfig);
      console.log('✅ Pool de conexiones Oracle inicializado');
    }
  } catch (error) {
    console.error('❌ Error inicializando pool de conexiones:', error);
    throw error;
  }
}

/**
 * Obtiene una conexión del pool
 */
async function getConnection(): Promise<oracledb.Connection> {
  if (!connectionPool) {
    await initializePool();
  }
  return await connectionPool!.getConnection();
}

/**
 * Ejecuta una consulta SQL SELECT
 */
export async function querySQL(
  sql: string, 
  binds: oracledb.BindParameters = []
): Promise<oracledb.Result<unknown>> {
  let connection: oracledb.Connection | null = null;
  
  try {
    connection = await getConnection();
    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      fetchArraySize: 1000
    });
    return result;
  } catch (error) {
    console.error('❌ Error ejecutando consulta SQL:', error);
    console.error('SQL:', sql);
    console.error('Binds:', binds);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('❌ Error cerrando conexión:', error);
      }
    }
  }
}

/**
 * Ejecuta una declaración SQL (INSERT, UPDATE, DELETE, etc.)
 */
export async function executeSQL(
  sql: string, 
  binds: oracledb.BindParameters = []
): Promise<oracledb.Result<unknown>> {
  let connection: oracledb.Connection | null = null;
  
  try {
    connection = await getConnection();
    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: true
    });
    return result;
  } catch (error) {
    console.error('❌ Error ejecutando declaración SQL:', error);
    console.error('SQL:', sql);
    console.error('Binds:', binds);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('❌ Error cerrando conexión:', error);
      }
    }
  }
}

/**
 * Ejecuta múltiples declaraciones SQL en una transacción
 */
export async function executeTransaction(
  statements: Array<{ sql: string; binds?: oracledb.BindParameters }>
): Promise<void> {
  let connection: oracledb.Connection | null = null;
  
  try {
    connection = await getConnection();
    
    // Deshabilitar autocommit para transacción manual
    for (const statement of statements) {
      await connection.execute(statement.sql, statement.binds || [], {
        autoCommit: false
      });
    }
    
    // Commit manual
    await connection.commit();
  } catch (error) {
    console.error('❌ Error ejecutando transacción:', error);
    
    // Rollback en caso de error
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('❌ Error en rollback:', rollbackError);
      }
    }
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('❌ Error cerrando conexión:', error);
      }
    }
  }
}

/**
 * Ejecuta un procedimiento almacenado
 */
export async function callProcedure(
  procedureName: string,
  parameters: oracledb.BindParameters = [],
  options: Record<string, unknown> = {}
): Promise<oracledb.Result<unknown>> {
  let connection: oracledb.Connection | null = null;
  
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `BEGIN ${procedureName}; END;`,
      parameters,
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: true,
        ...options
      }
    );
    return result;
  } catch (error) {
    console.error('❌ Error ejecutando procedimiento:', error);
    console.error('Procedimiento:', procedureName);
    console.error('Parámetros:', parameters);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('❌ Error cerrando conexión:', error);
      }
    }
  }
}

/**
 * Ejecuta una función almacenada
 */
export async function callFunction(
  functionName: string,
  parameters: oracledb.BindParameters = [],
  returnType: string = 'VARCHAR2',
  options: Record<string, unknown> = {}
): Promise<oracledb.Result<unknown>> {
  let connection: oracledb.Connection | null = null;
  
  try {
    connection = await getConnection();
    
    // Preparar los parámetros con el valor de retorno
    const binds = {
      ret: { dir: oracledb.BIND_OUT, type: returnType === 'NUMBER' ? oracledb.NUMBER : oracledb.STRING },
      ...parameters
    };
    
    const result = await connection.execute(
      `BEGIN :ret := ${functionName}; END;`,
      binds,
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: true,
        ...options
      }
    );
    return result;
  } catch (error) {
    console.error('❌ Error ejecutando función:', error);
    console.error('Función:', functionName);
    console.error('Parámetros:', parameters);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('❌ Error cerrando conexión:', error);
      }
    }
  }
}

/**
 * Ejecuta un procedimiento que devuelve un cursor
 */
export async function callProcedureWithCursor(
  procedureName: string,
  parameters: oracledb.BindParameters = [],
  options: Record<string, unknown> = {}
): Promise<oracledb.Result<unknown>> {
  let connection: oracledb.Connection | null = null;
  
  try {
    connection = await getConnection();
    
    // Preparar los parámetros con el cursor de salida
    const binds = {
      cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
      ...parameters
    };
    
    const result = await connection.execute(
      `BEGIN ${procedureName}(:cursor); END;`,
      binds,
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: true,
        ...options
      }
    );
    
    // Procesar el cursor si existe
    if (result.outBinds && (result.outBinds as Record<string, unknown>).cursor) {
      const cursor = (result.outBinds as Record<string, unknown>).cursor as oracledb.ResultSet<unknown>;
      const rows = await cursor.getRows();
      await cursor.close();
      
      return {
        ...result,
        rows: rows,
        outBinds: { ...result.outBinds, cursor: undefined }
      };
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error ejecutando procedimiento con cursor:', error);
    console.error('Procedimiento:', procedureName);
    console.error('Parámetros:', parameters);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('❌ Error cerrando conexión:', error);
      }
    }
  }
}

/**
 * Cierra el pool de conexiones
 */
export async function closePool(): Promise<void> {
  if (connectionPool) {
    try {
      await connectionPool.close();
      connectionPool = null;
      console.log('✅ Pool de conexiones Oracle cerrado');
    } catch (error) {
      console.error('❌ Error cerrando pool:', error);
      throw error;
    }
  }
}

/**
 * Obtiene información del estado de la base de datos
 */
export async function getDatabaseInfo(): Promise<Record<string, unknown>> {
  try {
    const result = await querySQL(`
      SELECT 
        INSTANCE_NAME,
        HOST_NAME,
        VERSION,
        STATUS,
        DATABASE_STATUS,
        STARTUP_TIME
      FROM V$INSTANCE
    `);
    
    return result.rows?.[0] as Record<string, unknown> || {};
  } catch (error) {
    console.error('❌ Error obteniendo información de la base de datos:', error);
    throw error;
  }
}

/**
 * Verifica si una tabla existe
 */
export async function tableExists(tableName: string): Promise<boolean> {
  try {
    const [schema, table] = tableName.includes('.') 
      ? tableName.split('.')
      : [null, tableName];
    
    const sql = schema 
      ? `SELECT COUNT(*) as COUNT FROM ALL_TABLES WHERE OWNER = :schema AND TABLE_NAME = :table`
      : `SELECT COUNT(*) as COUNT FROM USER_TABLES WHERE TABLE_NAME = :table`;
    
    const binds = schema ? [schema.toUpperCase(), table.toUpperCase()] : [table.toUpperCase()];
    
    const result = await querySQL(sql, binds);
    const count = (result.rows?.[0] as { COUNT: number })?.COUNT || 0;
    
    return count > 0;
  } catch (error) {
    console.error('❌ Error verificando existencia de tabla:', error);
    return false;
  }
}

/**
 * Obtiene información de columnas de una tabla
 */
export async function getTableColumns(tableName: string): Promise<Array<{
  COLUMN_NAME: string;
  DATA_TYPE: string;
  DATA_LENGTH: number;
  NULLABLE: string;
  DATA_DEFAULT: string;
}>> {
  try {
    const [schema, table] = tableName.includes('.') 
      ? tableName.split('.')
      : [null, tableName];
    
    const sql = schema 
      ? `SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          DATA_LENGTH,
          NULLABLE,
          DATA_DEFAULT
        FROM ALL_TAB_COLUMNS 
        WHERE OWNER = :schema AND TABLE_NAME = :table
        ORDER BY COLUMN_ID`
      : `SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          DATA_LENGTH,
          NULLABLE,
          DATA_DEFAULT
        FROM USER_TAB_COLUMNS 
        WHERE TABLE_NAME = :table
        ORDER BY COLUMN_ID`;
    
    const binds = schema ? [schema.toUpperCase(), table.toUpperCase()] : [table.toUpperCase()];
    
    const result = await querySQL(sql, binds);
    return result.rows as Array<{
      COLUMN_NAME: string;
      DATA_TYPE: string;
      DATA_LENGTH: number;
      NULLABLE: string;
      DATA_DEFAULT: string;
    }>;
  } catch (error) {
    console.error('❌ Error obteniendo columnas de tabla:', error);
    throw error;
  }
}
