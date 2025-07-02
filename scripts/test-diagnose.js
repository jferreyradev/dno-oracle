/**
 * Script de diagnóstico simple para probar la conexión Oracle
 */

import { exec, open, close } from "../src/db-improved.js";

async function testConnection() {
  try {
    console.log("🔌 Conectando a Oracle...");
    await open();
    console.log("✅ Conexión exitosa");
    
    console.log("🧪 Probando consulta simple...");
    const result = await exec("SELECT SYSDATE FROM dual");
    console.log("✅ Resultado:", result);
    
    console.log("🧪 Probando consulta con caracteres especiales...");
    const result2 = await exec("SELECT 'Hola Mundo' as mensaje FROM dual");
    console.log("✅ Resultado:", result2);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await close();
    console.log("🔌 Conexión cerrada");
  }
}

await testConnection();
