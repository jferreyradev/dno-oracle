import { oracledb, load } from "../deps.ts";

// Configuración de Oracle
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// OBtiene las variables del archivo .env

// Configuración de la conexión a la base de datos Oracle

const env = await load();

const dbConfig = {
  user: env["USER"],
  password: env["PASSWORD"],
  connectString: env["CONNECTIONSTRING"],
  poolMax: Number(env["POOL"])||10,
};

//let dbConfig;

const defaultThreadPoolSize = 4;

//process.env.UV_THREADPOOL_SIZE = dbConfig.poolMax + defaultThreadPoolSize;

function setConfig(objconf) {
  dbConfig = objconf;
  setDriver();
}

function setDriver() {

  //oracledb.initOracleClient({ libDir: dbConfig["lib"] });
  oracledb.initOracleClient({ libDir: env["LIB_ORA"] });

  /*
  if ( process.platform === "win32") {
    // Windows
    oracledb.initOracleClient({ libDir: "C:\\instantclient_21_10" });
  } else if (process.platform === "darwin") {
    // macOS
    oracledb.initOracleClient({
      libDir: process.env.HOME + "/Downloads/instantclient_19_8",
    });
  }
  */
}

function getQueryLimits(query) {
  return `SELECT * FROM (SELECT A.*, ROWNUM AS MY_RNUM FROM ( ${query} ) A
             WHERE ROWNUM <= :limit + :offset) WHERE MY_RNUM > :offset`;
}


async function exec(statement, binds = [], opts = {}) {  
  let conn;
  let query;
  opts.outFormat = oracledb.OBJECT;
  opts.autoCommit = true;
  try {    
    setDriver();
    await oracledb.createPool(dbConfig);
    conn = await oracledb.getConnection();
    if (binds.limit !== undefined) {
      if (binds.offset == undefined) {
        binds.offset = 0;
      }
      query = getQueryLimits(statement);
    } else {
      query = statement;
    }
    const result = await conn.execute(query, binds, opts);
    return result;
  } catch (err) {
    console.error(err);
  } finally {
    if (conn) {
      try {
        await oracledb.getPool().close(0);
      } catch (err) {
        console.log(err);
      }
    }
  }
}

async function open() {
  setDriver();
  await oracledb.createPool(dbConfig);
  console.log("Conexión a Base de datos Oracle establecida.");
}

async function close() {
  try {
    const pool = oracledb.getPool();
    if (pool) {
      await pool.close(0);
      console.log("Desconexión a Base de datos Oracle exitosa.");
    }
  } catch (error) {
    // Pool no existe o ya fue cerrado - no es un error crítico
    if (error.message.includes('NJS-047')) {
      console.log("Pool de conexiones ya estaba cerrado.");
    } else {
      console.log("Error cerrando conexión:", error.message);
    }
  }
}

async function checkConn() {
  let conn = null;  
  try {
    setDriver();
    await oracledb.createPool(dbConfig);
    conn = await oracledb.getConnection();
    console.log("connected to database");    
  } catch (err) {
    console.error(err.message);    
  } finally {
    if (conn) {
      try {
        // Always close connections
        await oracledb.getPool().close(0);
        console.log("close connection success");
        return true;
      } catch (err) {
        console.error(err.message);
        return false;
      }
    }
  }
}

export { open, close, checkConn, exec, setConfig };