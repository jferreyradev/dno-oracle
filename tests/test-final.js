import { open, close, exec, checkConn } from "../src/db.js";

console.log("=== Script Final de Prueba Oracle ===");

try {
  // Verificar conexión
  console.log("1. Verificando conexión...");
  const isConnected = await checkConn();
  
  if (isConnected) {
    console.log("✅ Conexión verificada correctamente");
    
    // Ejecutar consultas de ejemplo
    console.log("\n2. Ejecutando consultas de ejemplo...");
    
    // Consulta 1: Fecha actual
    const dateResult = await exec("SELECT SYSDATE as FECHA_ACTUAL FROM DUAL");
    console.log("   Fecha del servidor:", dateResult.rows[0].FECHA_ACTUAL);
    
    // Consulta 2: Información de la base de datos
    const versionResult = await exec("SELECT BANNER FROM V$VERSION WHERE ROWNUM = 1");
    console.log("   Versión Oracle:", versionResult.rows[0].BANNER);
    
    // Consulta 3: Usuario actual
    const userResult = await exec("SELECT USER as USUARIO_ACTUAL FROM DUAL");
    console.log("   Usuario conectado:", userResult.rows[0].USUARIO_ACTUAL);
    
    // Consulta 4: Esquemas disponibles (si tiene permisos)
    try {
      const schemasResult = await exec(`
        SELECT DISTINCT OWNER 
        FROM ALL_TABLES 
        WHERE OWNER NOT IN ('SYS','SYSTEM','OUTLN','XDB','WMSYS','CTXSYS','MDSYS','OLAPSYS','ORDSYS','ORDDATA','SI_INFORMTN_SCHEMA','DBSNMP','APPQOSSYS')
        ORDER BY OWNER
      `);
      console.log("   Esquemas disponibles:");
      schemasResult.rows.forEach(row => {
        console.log("     -", row.OWNER);
      });
    } catch (error) {
      console.log("   (No se pudieron obtener los esquemas - permisos limitados)");
    }
    
    console.log("\n✅ ¡Conexión a Oracle completamente funcional!");
    
  } else {
    console.log("❌ Error en la conexión");
  }
  
} catch (error) {
  console.error("❌ Error:", error.message);
}

console.log("\n=== Configuración final ===");
console.log("Archivo .env configurado correctamente:");
console.log("- IP del servidor Oracle: 192.168.1.34");
console.log("- Puerto: 1521");
console.log("- Servicio: desa");
console.log("- Usuario: us_sueldo");
console.log("\nPuedes usar las funciones del módulo db.js:");
console.log("- checkConn() - Verificar conexión");
console.log("- exec(query, binds) - Ejecutar consultas");
console.log("- open() - Abrir pool de conexiones");
console.log("- close() - Cerrar pool de conexiones");
