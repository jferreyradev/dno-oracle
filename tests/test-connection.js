import { checkConn, exec } from "../src/db.js";

console.log("=== Prueba de Conexión a Oracle ===");
console.log("Probando conexión...");

try {
  // Probar conexión básica
  const isConnected = await checkConn();
  
  if (isConnected) {
    console.log("✅ Conexión exitosa!");
    
    // Ejecutar una consulta simple para verificar que todo funciona
    console.log("\nProbando consulta simple...");
    const result = await exec("SELECT SYSDATE FROM DUAL");
    
    if (result && result.rows && result.rows.length > 0) {
      console.log("✅ Consulta ejecutada correctamente");
      console.log("Fecha del servidor:", result.rows[0].SYSDATE);
    } else {
      console.log("❌ Error en la consulta");
    }
    
    // Probar información de la base de datos
    console.log("\nObteniendo información de la base de datos...");
    const dbInfo = await exec(`
      SELECT 
        BANNER as VERSION_INFO
      FROM V$VERSION 
      WHERE BANNER LIKE 'Oracle%'
    `);
    
    if (dbInfo && dbInfo.rows && dbInfo.rows.length > 0) {
      console.log("Versión de Oracle:", dbInfo.rows[0].VERSION_INFO);
    }
    
  } else {
    console.log("❌ Error en la conexión");
  }
  
} catch (error) {
  console.error("❌ Error durante la prueba:", error.message);
  console.error("Detalles del error:", error);
}

console.log("\n=== Fin de la prueba ===");
