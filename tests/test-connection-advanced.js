import { oracledb, load } from "../deps.ts";

console.log("=== Diagnóstico Completo de Conexión a Oracle ===");

// Cargar variables de entorno
const env = await load();

console.log("Variables de entorno cargadas:");
console.log("- USER:", env["USER"]);
console.log("- PASSWORD:", env["PASSWORD"] ? "***configurado***" : "NO CONFIGURADO");
console.log("- CONNECTIONSTRING:", env["CONNECTIONSTRING"]);
console.log("- POOL:", env["POOL"]);
console.log("- LIB_ORA:", env["LIB_ORA"]);

// Configurar Oracle Client
try {
  oracledb.initOracleClient({ libDir: env["LIB_ORA"] });
  console.log("✅ Oracle Client inicializado correctamente");
} catch (error) {
  console.error("❌ Error inicializando Oracle Client:", error.message);
  Deno.exit(1);
}

// Configuración de la base de datos
const dbConfig = {
  user: env["USER"],
  password: env["PASSWORD"],
  connectString: env["CONNECTIONSTRING"],
  poolMax: Number(env["POOL"]) || 10,
};

console.log("\n=== Probando diferentes formatos de conexión ===");

// Formato 1: Como está configurado
console.log("\n1. Probando con formato actual:", dbConfig.connectString);
await testConnection(dbConfig);

// Formato 2: Con protocolo TCP
const dbConfig2 = {
  ...dbConfig,
  connectString: `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${env["CONNECTIONSTRING"].split(':')[0]})(PORT=${env["CONNECTIONSTRING"].split(':')[1].split('/')[0]}))(CONNECT_DATA=(SERVICE_NAME=${env["CONNECTIONSTRING"].split('/')[1]})))`
};
console.log("\n2. Probando con formato TNS completo:", dbConfig2.connectString);
await testConnection(dbConfig2);

// Formato 3: Solo host y puerto
const hostPort = env["CONNECTIONSTRING"].split('/')[0];
const dbConfig3 = {
  ...dbConfig,
  connectString: hostPort
};
console.log("\n3. Probando solo host:puerto:", dbConfig3.connectString);
await testConnection(dbConfig3);

async function testConnection(config) {
  try {
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    await oracledb.createPool(config);
    const conn = await oracledb.getConnection();
    
    console.log("✅ Conexión exitosa!");
    
    // Probar una consulta simple
    const result = await conn.execute("SELECT SYSDATE FROM DUAL");
    console.log("   Fecha del servidor:", result.rows[0].SYSDATE);
    
    await oracledb.getPool().close(0);
    return true;
    
  } catch (error) {
    console.log("❌ Error:", error.message);
    if (error.errorNum) {
      console.log("   Código de error Oracle:", error.errorNum);
    }
    return false;
  }
}

console.log("\n=== Verificación de red ===");
const host = env["CONNECTIONSTRING"].split(':')[0];
const port = env["CONNECTIONSTRING"].split(':')[1].split('/')[0];

console.log(`Verificando conectividad a ${host}:${port}...`);

// Crear un simple verificador de puerto
try {
  const conn = await Deno.connect({ hostname: host, port: parseInt(port) });
  conn.close();
  console.log("✅ El puerto está accesible");
} catch (error) {
  console.log("❌ No se puede conectar al puerto:", error.message);
  console.log("   Posibles causas:");
  console.log("   - El servidor Oracle no está ejecutándose");
  console.log("   - Firewall bloqueando la conexión");
  console.log("   - Dirección IP o puerto incorrectos");
}
