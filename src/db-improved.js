import { oracledb, load } from "../deps.ts";

/**
 * Oracle Database Connection Module
 * Versión mejorada con mejor manejo de pools y errores
 */

// Configuración global de Oracle
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// Variables de entorno
const env = await load();

// Configuración por defecto
let dbConfig = {
  user: env["USER"],
  password: env["PASSWORD"],
  connectString: env["CONNECTIONSTRING"],
  poolMax: Number(env["POOL"]) || 10,
  poolMin: 2,
  poolIncrement: 2,
  poolTimeout: 60,
  poolPingInterval: 60,
  stmtCacheSize: 23
};

// Estado del módulo
let isDriverInitialized = false;
let connectionPool = null;

/**
 * Inicializa el driver de Oracle una sola vez
 */
function initializeDriver() {
  if (!isDriverInitialized) {
    try {
      oracledb.initOracleClient({ libDir: env["LIB_ORA"] });
      isDriverInitialized = true;
      console.log("Oracle Client inicializado correctamente");
    } catch (error) {
      console.error("Error inicializando Oracle Client:", error.message);
      throw error;
    }
  }
}

/**
 * Configura la conexión a la base de datos
 * @param {Object} newConfig - Nueva configuración
 */
function setConfig(newConfig) {
  if (newConfig && typeof newConfig === 'object') {
    dbConfig = { ...dbConfig, ...newConfig };
    console.log("Configuración actualizada");
    
    // Reinicializar pool si existe
    if (connectionPool) {
      console.log("Reiniciando pool de conexiones...");
      close().then(() => open());
    }
  } else {
    throw new Error("La configuración debe ser un objeto válido");
  }
}

/**
 * Genera consulta con paginación usando ROWNUM
 * @param {string} query - Consulta original
 * @returns {string} Consulta con paginación
 */
function getQueryWithPagination(query) {
  return `
    SELECT * FROM (
      SELECT A.*, ROWNUM AS RNUM 
      FROM (${query}) A
      WHERE ROWNUM <= :limit + :offset
    ) WHERE RNUM > :offset
  `;
}

/**
 * Obtiene una conexión del pool
 * @returns {Promise<Object>} Conexión de la base de datos
 */
async function getConnection() {
  if (!connectionPool) {
    await open();
  }
  return await connectionPool.getConnection();
}

/**
 * Ejecuta una consulta SQL
 * @param {string} statement - Consulta SQL
 * @param {Object|Array} binds - Parámetros de la consulta
 * @param {Object} opts - Opciones adicionales
 * @returns {Promise<Object>} Resultado de la consulta
 */
async function exec(statement, binds = {}, opts = {}) {
  if (!statement || typeof statement !== 'string') {
    throw new Error("La consulta SQL es requerida y debe ser una cadena");
  }

  let connection = null;
  let query = statement;
  
  // Configurar opciones por defecto
  const options = {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
    autoCommit: true,
    ...opts
  };

  try {
    // Asegurar que el driver esté inicializado
    initializeDriver();
    
    // Obtener conexión del pool
    connection = await getConnection();
    
    // Manejar paginación si se especifica
    if (binds && typeof binds === 'object' && binds.limit !== undefined) {
      if (binds.offset === undefined) {
        binds.offset = 0;
      }
      query = getQueryWithPagination(statement);
      
      // Validar parámetros de paginación
      if (binds.limit < 0 || binds.offset < 0) {
        throw new Error("Los parámetros limit y offset deben ser >= 0");
      }
    }
    
    // Ejecutar consulta
    const result = await connection.execute(query, binds, options);
    
    // Agregar información adicional al resultado
    result.query = statement;
    result.binds = binds;
    result.executedAt = new Date();
    
    return result;
    
  } catch (error) {
    console.error("Error ejecutando consulta:", error.message);
    console.error("SQL:", statement);
    console.error("Binds:", JSON.stringify(binds));
    
    // Re-lanzar el error para que pueda ser manejado por el código que llama
    throw error;
    
  } finally {
    // Liberar la conexión de vuelta al pool
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error("Error cerrando conexión:", closeError.message);
      }
    }
  }
}

/**
 * Abre el pool de conexiones
 * @returns {Promise<void>}
 */
async function open() {
  if (connectionPool) {
    console.log("Pool de conexiones ya está abierto");
    return;
  }

  try {
    initializeDriver();
    
    connectionPool = await oracledb.createPool(dbConfig);
    console.log(`Pool de conexiones creado: ${dbConfig.poolMin}-${dbConfig.poolMax} conexiones`);
    
  } catch (error) {
    console.error("Error creando pool de conexiones:", error.message);
    throw error;
  }
}

/**
 * Cierra el pool de conexiones
 * @returns {Promise<void>}
 */
async function close() {
  if (!connectionPool) {
    console.log("No hay pool de conexiones para cerrar");
    return;
  }

  try {
    await connectionPool.close(0);
    connectionPool = null;
    console.log("Pool de conexiones cerrado exitosamente");
    
  } catch (error) {
    console.error("Error cerrando pool de conexiones:", error.message);
    throw error;
  }
}

/**
 * Verifica la conectividad a la base de datos
 * @returns {Promise<boolean>} true si la conexión es exitosa
 */
async function checkConn() {
  let connection = null;
  
  try {
    initializeDriver();
    
    // Crear pool temporal si no existe
    const tempPool = connectionPool || await oracledb.createPool(dbConfig);
    connection = await tempPool.getConnection();
    
    // Ejecutar una consulta simple para verificar conectividad
    await connection.execute("SELECT 1 FROM DUAL");
    
    console.log("Verificación de conexión exitosa");
    return true;
    
  } catch (error) {
    console.error("Error en verificación de conexión:", error.message);
    return false;
    
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error("Error cerrando conexión de prueba:", closeError.message);
      }
    }
    
    // Si creamos un pool temporal, cerrarlo
    if (!connectionPool && connection) {
      try {
        await oracledb.getPool().close(0);
      } catch (poolError) {
        console.error("Error cerrando pool temporal:", poolError.message);
      }
    }
  }
}

/**
 * Obtiene estadísticas del pool de conexiones
 * @returns {Object|null} Estadísticas del pool
 */
function getPoolStats() {
  if (!connectionPool) {
    return null;
  }
  
  return {
    connectionsOpen: connectionPool.connectionsOpen,
    connectionsInUse: connectionPool.connectionsInUse,
    poolAlias: connectionPool.poolAlias,
    poolMax: connectionPool.poolMax,
    poolMin: connectionPool.poolMin,
    poolIncrement: connectionPool.poolIncrement,
    poolTimeout: connectionPool.poolTimeout,
    stmtCacheSize: connectionPool.stmtCacheSize
  };
}

/**
 * Ejecuta múltiples consultas en una transacción
 * @param {Array} queries - Array de objetos {sql, binds}
 * @returns {Promise<Array>} Resultados de todas las consultas
 */
async function executeTransaction(queries) {
  if (!Array.isArray(queries) || queries.length === 0) {
    throw new Error("Se requiere un array de consultas no vacío");
  }

  let connection = null;
  const results = [];
  
  try {
    initializeDriver();
    connection = await getConnection();
    
    // Iniciar transacción (autoCommit = false)
    for (const queryObj of queries) {
      const { sql, binds = {}, opts = {} } = queryObj;
      
      const result = await connection.execute(sql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: false,
        ...opts
      });
      
      results.push(result);
    }
    
    // Confirmar transacción
    await connection.commit();
    console.log(`Transacción completada: ${queries.length} consultas ejecutadas`);
    
    return results;
    
  } catch (error) {
    // Revertir transacción en caso de error
    if (connection) {
      try {
        await connection.rollback();
        console.log("Transacción revertida debido a error");
      } catch (rollbackError) {
        console.error("Error en rollback:", rollbackError.message);
      }
    }
    
    console.error("Error en transacción:", error.message);
    throw error;
    
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error("Error cerrando conexión de transacción:", closeError.message);
      }
    }
  }
}

/**
 * Ejecuta un procedimiento almacenado
 * @param {string} procedureName - Nombre del procedimiento
 * @param {Object} params - Parámetros de entrada y salida
 * @param {Object} opts - Opciones adicionales
 * @returns {Promise<Object>} Resultado con parámetros de salida
 */
async function callProcedure(procedureName, params = {}, opts = {}) {
  if (!procedureName || typeof procedureName !== 'string') {
    throw new Error("El nombre del procedimiento es requerido");
  }

  let connection = null;
  
  // Separar parámetros de entrada y salida
  const binds = {};
  const paramNames = [];
  
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'object' && value !== null && value.dir) {
      // Parámetro con dirección específica (IN, OUT, IN_OUT)
      binds[key] = value;
    } else {
      // Parámetro de entrada simple
      binds[key] = {
        val: value,
        dir: oracledb.BIND_IN
      };
    }
    paramNames.push(`:${key}`);
  }

  // Construir la llamada al procedimiento
  const sql = `BEGIN ${procedureName}(${paramNames.join(', ')}); END;`;

  try {
    initializeDriver();
    connection = await getConnection();
    
    const options = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: true,
      ...opts
    };

    const result = await connection.execute(sql, binds, options);
    
    // Agregar información adicional
    result.procedureName = procedureName;
    result.executedAt = new Date();
    
    console.log(`Procedimiento ${procedureName} ejecutado exitosamente`);
    return result;
    
  } catch (error) {
    console.error(`Error ejecutando procedimiento ${procedureName}:`, error.message);
    console.error("SQL:", sql);
    console.error("Parámetros:", JSON.stringify(binds, null, 2));
    throw error;
    
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error("Error cerrando conexión:", closeError.message);
      }
    }
  }
}

/**
 * Ejecuta una función almacenada que retorna un valor
 * @param {string} functionName - Nombre de la función
 * @param {Object} params - Parámetros de entrada
 * @param {Object} returnType - Tipo de dato del valor de retorno
 * @param {Object} opts - Opciones adicionales
 * @returns {Promise<Object>} Resultado con el valor de retorno
 */
async function callFunction(functionName, params = {}, returnType = { type: oracledb.STRING }, opts = {}) {
  if (!functionName || typeof functionName !== 'string') {
    throw new Error("El nombre de la función es requerido");
  }

  let connection = null;
  
  // Preparar parámetros
  const binds = {
    returnValue: {
      dir: oracledb.BIND_OUT,
      ...returnType
    }
  };
  
  const paramNames = [];
  
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'object' && value !== null && value.dir) {
      binds[key] = value;
    } else {
      binds[key] = {
        val: value,
        dir: oracledb.BIND_IN
      };
    }
    paramNames.push(`:${key}`);
  }

  // Construir la llamada a la función
  const sql = `BEGIN :returnValue := ${functionName}(${paramNames.join(', ')}); END;`;

  try {
    initializeDriver();
    connection = await getConnection();
    
    const options = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: true,
      ...opts
    };

    const result = await connection.execute(sql, binds, options);
    
    // Agregar información adicional
    result.functionName = functionName;
    result.returnValue = result.outBinds.returnValue;
    result.executedAt = new Date();
    
    console.log(`Función ${functionName} ejecutada exitosamente`);
    return result;
    
  } catch (error) {
    console.error(`Error ejecutando función ${functionName}:`, error.message);
    console.error("SQL:", sql);
    console.error("Parámetros:", JSON.stringify(binds, null, 2));
    throw error;
    
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error("Error cerrando conexión:", closeError.message);
      }
    }
  }
}

/**
 * Ejecuta un procedimiento que retorna un cursor (REF CURSOR)
 * @param {string} procedureName - Nombre del procedimiento
 * @param {Object} params - Parámetros de entrada
 * @param {Object} opts - Opciones adicionales
 * @returns {Promise<Object>} Resultado con las filas del cursor
 */
async function callProcedureWithCursor(procedureName, params = {}, opts = {}) {
  if (!procedureName || typeof procedureName !== 'string') {
    throw new Error("El nombre del procedimiento es requerido");
  }

  let connection = null;
  
  // Preparar parámetros incluyendo el cursor de salida
  const binds = {};
  const paramNames = [];
  
  // Agregar parámetros de entrada primero
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'object' && value !== null && value.dir) {
      binds[key] = value;
    } else {
      binds[key] = {
        val: value,
        dir: oracledb.BIND_IN
      };
    }
    paramNames.push(key);
  }
  
  // Agregar cursor al final
  binds['cursor'] = {
    dir: oracledb.BIND_OUT,
    type: oracledb.CURSOR
  };
  paramNames.push('cursor');

  // Construir la llamada al procedimiento
  const sql = `BEGIN ${procedureName}(${paramNames.map(p => `:${p}`).join(', ')}); END;`;

  try {
    initializeDriver();
    connection = await getConnection();
    
    const options = {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: true,
      ...opts
    };

    const result = await connection.execute(sql, binds, options);
    
    // Obtener datos del cursor
    const cursor = result.outBinds.cursor;
    const rows = [];
    let row;
    
    while ((row = await cursor.getRow())) {
      rows.push(row);
    }
    
    await cursor.close();
    
    // Preparar resultado final
    const finalResult = {
      rows: rows,
      rowsAffected: rows.length,
      procedureName: procedureName,
      executedAt: new Date(),
      outBinds: result.outBinds
    };
    
    console.log(`Procedimiento ${procedureName} ejecutado exitosamente - ${rows.length} filas obtenidas`);
    return finalResult;
    
  } catch (error) {
    console.error(`Error ejecutando procedimiento con cursor ${procedureName}:`, error.message);
    console.error("SQL:", sql);
    console.error("Parámetros:", JSON.stringify(binds, null, 2));
    throw error;
    
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error("Error cerrando conexión:", closeError.message);
      }
    }
  }
}

// Manejo de cierre limpio del proceso
process.on('SIGINT', async () => {
  console.log('Cerrando conexiones...');
  await close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Cerrando conexiones...');
  await close();
  process.exit(0);
});

/**
 * Funciones de conveniencia para la API
 */

/**
 * Ejecuta una consulta SELECT y devuelve los resultados
 * @param {string} sql - Consulta SQL
 * @param {Array|Object} binds - Parámetros de la consulta
 * @returns {Array} Resultados de la consulta
 */
async function querySQL(sql, binds = []) {
  const result = await exec(sql, binds);
  return result.rows || [];
}

/**
 * Ejecuta una consulta INSERT, UPDATE o DELETE
 * @param {string} sql - Consulta SQL
 * @param {Array|Object} binds - Parámetros de la consulta
 * @returns {Object} Resultado de la ejecución
 */
async function executeSQL(sql, binds = []) {
  return await exec(sql, binds);
}

/**
 * Ejecuta una consulta con paginación
 * @param {string} sql - Consulta SQL base
 * @param {Array} binds - Parámetros de la consulta
 * @param {number} page - Número de página (inicia en 1)
 * @param {number} limit - Cantidad de registros por página
 * @returns {Object} Resultados paginados
 */
async function paginate(sql, binds = [], page = 1, limit = 10) {
  if (page < 1) page = 1;
  if (limit < 1) limit = 10;
  if (limit > 100) limit = 100; // Límite máximo de seguridad
  
  const offset = (page - 1) * limit;
  
  // Consulta para obtener el total de registros
  const countSql = `SELECT COUNT(*) as TOTAL FROM (${sql})`;
  const countResult = await exec(countSql, binds);
  const total = countResult.rows[0]?.TOTAL || 0;
  
  // Consulta paginada
  const paginatedSql = `
    SELECT * FROM (
      SELECT ROWNUM as RN, sub.* FROM (
        ${sql}
      ) sub
      WHERE ROWNUM <= :maxRow
    )
    WHERE RN > :minRow
  `;
  
  const paginatedBinds = [...binds, offset + limit, offset];
  const result = await exec(paginatedSql, paginatedBinds);
  
  // Calcular información de paginación
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    data: result.rows || [],
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
      nextPage: hasNext ? page + 1 : null,
      prevPage: hasPrev ? page - 1 : null
    }
  };
}

export { 
  open, 
  close, 
  checkConn, 
  exec, 
  setConfig, 
  getPoolStats, 
  executeTransaction,
  callProcedure,
  callFunction,
  callProcedureWithCursor,
  querySQL,
  executeSQL,
  paginate
};
