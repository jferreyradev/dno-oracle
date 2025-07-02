/**
 * Test simple para verificar que las tablas de logs funcionan
 */

import { open, close, exec } from "../../src/db.js";

async function testLogsTable() {
  console.log("🧪 Probando tabla de logs...");
  
  try {
    await open();
    console.log("✅ Conexión establecida");
    
    // Test 1: Verificar que las tablas existen
    console.log("\n1. Verificando tablas...");
    const tables = await exec("SELECT table_name FROM user_tables WHERE table_name IN ('SYSTEM_LOGS', 'USERS')");
    console.log("Tablas encontradas:", tables.rows.map(r => r.TABLE_NAME));
    
    // Test 2: Contar registros
    console.log("\n2. Contando registros...");
    const userCount = await exec("SELECT COUNT(*) as count FROM users");
    const logCount = await exec("SELECT COUNT(*) as count FROM system_logs");
    console.log(`Usuarios: ${userCount.rows[0].COUNT}, Logs: ${logCount.rows[0].COUNT}`);
    
    // Test 3: Insertar un nuevo log
    console.log("\n3. Insertando nuevo log...");
    const insertResult = await exec(`
      INSERT INTO system_logs (
        log_id, log_level, module, message, user_id, ip_address, response_status, execution_time_ms
      ) VALUES (
        seq_system_logs.NEXTVAL, 'INFO', 'TEST_API', 'Log de prueba desde Deno', 1, '127.0.0.1', 200, 15
      )
    `);
    console.log("Filas insertadas:", insertResult.rowsAffected);
    
    // Test 4: Leer logs recientes
    console.log("\n4. Leyendo logs recientes...");
    const recentLogs = await exec(`
      SELECT log_id, log_level, module, message, created_at 
      FROM system_logs 
      WHERE module = 'TEST_API'
      ORDER BY log_id DESC
    `);
    console.log("Logs de test encontrados:", recentLogs.rows.length);
    if (recentLogs.rows.length > 0) {
      console.log("Último log:", {
        id: recentLogs.rows[0].LOG_ID,
        level: recentLogs.rows[0].LOG_LEVEL,
        module: recentLogs.rows[0].MODULE,
        message: recentLogs.rows[0].MESSAGE
      });
    }
    
    // Test 5: Probar la vista con join
    console.log("\n5. Probando vista con usuarios...");
    const viewTest = await exec(`
      SELECT log_id, log_level, module, username, ip_address 
      FROM v_logs_with_user 
      WHERE module = 'TEST_API'
    `);
    console.log("Registros en vista:", viewTest.rows.length);
    
    console.log("\n🎉 ¡Todas las pruebas pasaron exitosamente!");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await close();
    console.log("🔌 Conexión cerrada");
  }
}

testLogsTable();
