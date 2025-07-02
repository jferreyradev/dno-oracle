/**
 * Test con el módulo original db.js
 */

import { open, close, exec } from "../../src/db.js";

async function testOriginal() {
  console.log("🧪 Test con módulo original");
  
  try {
    await open();
    console.log("✅ Conexión abierta");
    
    // Test simple
    const result = await exec("SELECT 'Hola' as mensaje FROM dual");
    console.log("Resultado:", result);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await close();
    console.log("🔌 Conexión cerrada");
  }
}

testOriginal();
