/**
 * Test directo usando el API básico
 */

import { open, close, exec } from "../../src/db-improved.js";

async function testBasic() {
  console.log("🧪 Test directo con API básico");
  
  try {
    await open();
    console.log("✅ Conexión abierta");
    
    // Test 1: Consulta básica
    console.log("\n1. Probando consulta básica:");
    const result1 = await exec("SELECT SYSDATE FROM dual");
    console.log("Resultado:", result1.rows);
    
    // Test 2: Consulta con texto
    console.log("\n2. Probando consulta con texto:");
    const result2 = await exec("SELECT 'Hola' as mensaje FROM dual");
    console.log("Resultado:", result2.rows);
    
    // Test 3: CREATE TABLE
    console.log("\n3. Probando CREATE TABLE:");
    const result3 = await exec(`CREATE TABLE test_temp (
      id NUMBER PRIMARY KEY,
      name VARCHAR2(50)
    )`);
    console.log("Resultado:", result3.rowsAffected);
    
    // Test 4: INSERT
    console.log("\n4. Probando INSERT:");
    const result4 = await exec("INSERT INTO test_temp (id, name) VALUES (1, 'Test')");
    console.log("Resultado:", result4.rowsAffected);
    
    // Test 5: SELECT
    console.log("\n5. Probando SELECT:");
    const result5 = await exec("SELECT * FROM test_temp");
    console.log("Resultado:", result5.rows);
    
    // Cleanup
    console.log("\n6. Limpiando:");
    await exec("DROP TABLE test_temp");
    console.log("✅ Tabla eliminada");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await close();
    console.log("🔌 Conexión cerrada");
  }
}

testBasic();
