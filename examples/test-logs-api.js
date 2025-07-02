/**
 * Script de prueba para los endpoints de logs
 */

// Configuración base
const API_BASE_URL = "http://localhost:8000/api";
const headers = {
  "Content-Type": "application/json"
};

console.log("🚀 Probando endpoints de LOGS de la API DNO-Oracle");
console.log("===================================================");

/**
 * 1. Verificar estado de la API
 */
async function checkHealth() {
  console.log("\n1. 🏥 Verificando estado de la API...");
  
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    
    console.log("✅ Estado:", data.status);
    console.log("📊 Base de datos:", data.database.connected ? "Conectada" : "Desconectada");
    
    return data.status === "ok";
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

/**
 * 2. Crear algunos logs de prueba
 */
async function createTestLogs() {
  console.log("\n2. 📝 Creando logs de prueba...");
  
  const testLogs = [
    {
      level: "INFO",
      module: "API_TEST",
      message: "Test de API iniciado - creando logs de ejemplo",
      userId: 1,
      responseStatus: 200,
      executionTime: 45
    },
    {
      level: "WARN",
      module: "API_TEST", 
      message: "Este es un log de warning para probar filtros",
      userId: 2,
      responseStatus: 429,
      executionTime: 12
    },
    {
      level: "ERROR",
      module: "API_TEST",
      message: "Error simulado para testing - no es un error real",
      responseStatus: 500,
      executionTime: 234
    },
    {
      level: "DEBUG",
      module: "API_TEST",
      message: "Log de debug con información detallada para desarrollo",
      userId: 1,
      responseStatus: 200,
      executionTime: 8
    }
  ];
  
  let created = 0;
  
  for (const logData of testLogs) {
    try {
      const response = await fetch(`${API_BASE_URL}/logs`, {
        method: "POST",
        headers,
        body: JSON.stringify(logData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Log creado: ${logData.level} - ${logData.module}`);
        created++;
      } else {
        console.log(`❌ Error creando log: ${result.error}`);
      }
      
      // Pausa pequeña entre creaciones
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
  
  console.log(`📊 Total logs creados: ${created}/${testLogs.length}`);
  return created > 0;
}

/**
 * 3. Obtener logs con diferentes filtros
 */
async function testGetLogs() {
  console.log("\n3. 📋 Probando consulta de logs...");
  
  const tests = [
    {
      name: "Todos los logs (primera página)",
      params: "?page=1&limit=5"
    },
    {
      name: "Solo logs de ERROR",
      params: "?level=ERROR&limit=10"
    },
    {
      name: "Logs del módulo API_TEST",
      params: "?module=API_TEST&limit=10"
    },
    {
      name: "Logs de hoy",
      params: `?dateFrom=${new Date().toISOString().split('T')[0]}&limit=10`
    },
    {
      name: "Búsqueda por texto",
      params: "?search=test&limit=5"
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(`\n📍 ${test.name}:`);
      
      const response = await fetch(`${API_BASE_URL}/logs${test.params}`);
      const data = await response.json();
      
      if (data.success) {
        console.log(`   ✅ ${data.data.length} logs encontrados`);
        console.log(`   📄 Página ${data.pagination.page} de ${data.pagination.totalPages} (${data.pagination.total} total)`);
        
        // Mostrar algunos logs
        data.data.slice(0, 3).forEach((log, index) => {
          const time = new Date(log.CREATED_AT).toLocaleTimeString();
          console.log(`   ${index + 1}. [${log.LOG_LEVEL}] ${log.MODULE}: ${log.MESSAGE.substring(0, 50)}... (${time})`);
        });
      } else {
        console.log(`   ❌ Error: ${data.error}`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }
}

/**
 * 4. Obtener estadísticas de logs
 */
async function testLogStats() {
  console.log("\n4. 📊 Obteniendo estadísticas de logs...");
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(`${API_BASE_URL}/logs/stats?date=${today}`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Estadísticas para ${data.date}:`);
      console.log(`   📊 Total logs: ${data.data.total.TOTAL_LOGS || 0}`);
      console.log(`   👥 Usuarios únicos: ${data.data.total.UNIQUE_USERS || 0}`);
      console.log(`   📦 Módulos únicos: ${data.data.total.UNIQUE_MODULES || 0}`);
      console.log(`   ⏱️  Tiempo promedio: ${data.data.total.AVG_EXECUTION_TIME || 0}ms`);
      
      console.log("\n   📈 Por nivel:");
      data.data.byLevel.forEach(stat => {
        console.log(`      ${stat.LOG_LEVEL}: ${stat.COUNT} logs (avg: ${stat.AVG_EXECUTION_TIME || 0}ms)`);
      });
      
      console.log("\n   📦 Por módulo (top 5):");
      data.data.byModule.slice(0, 5).forEach(stat => {
        console.log(`      ${stat.MODULE}: ${stat.COUNT} logs`);
      });
      
    } else {
      console.log(`❌ Error: ${data.error}`);
    }
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

/**
 * 5. Obtener log específico por ID
 */
async function testGetLogById() {
  console.log("\n5. 🔍 Obteniendo log específico por ID...");
  
  try {
    // Primero obtener algunos logs para tener IDs
    const response = await fetch(`${API_BASE_URL}/logs?limit=1`);
    const data = await response.json();
    
    if (data.success && data.data.length > 0) {
      const logId = data.data[0].LOG_ID;
      console.log(`📋 Consultando log ID: ${logId}`);
      
      const logResponse = await fetch(`${API_BASE_URL}/logs/${logId}`);
      const logData = await logResponse.json();
      
      if (logData.success) {
        const log = logData.data;
        console.log(`✅ Log encontrado:`);
        console.log(`   ID: ${log.LOG_ID}`);
        console.log(`   Nivel: ${log.LOG_LEVEL}`);
        console.log(`   Módulo: ${log.MODULE}`);
        console.log(`   Usuario: ${log.USERNAME || 'N/A'}`);
        console.log(`   IP: ${log.IP_ADDRESS || 'N/A'}`);
        console.log(`   Estado: ${log.RESPONSE_STATUS || 'N/A'}`);
        console.log(`   Tiempo: ${log.EXECUTION_TIME_MS || 0}ms`);
        console.log(`   Mensaje: ${log.MESSAGE.substring(0, 100)}...`);
        console.log(`   Creado: ${new Date(log.CREATED_AT).toLocaleString()}`);
      } else {
        console.log(`❌ Error: ${logData.error}`);
      }
    } else {
      console.log("⚠️  No hay logs disponibles para consultar");
    }
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

/**
 * 6. Probar otros endpoints de la API
 */
async function testOtherEndpoints() {
  console.log("\n6. 🔧 Probando otros endpoints...");
  
  // Listar tablas
  try {
    console.log("\n📊 Listando tablas:");
    const response = await fetch(`${API_BASE_URL}/tables`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${data.tableCount} tablas encontradas`);
      data.tables.slice(0, 5).forEach(table => {
        console.log(`   - ${table.TABLE_NAME} (${table.NUM_ROWS || 'N/A'} filas)`);
      });
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
  
  // Esquema de tabla de logs
  try {
    console.log("\n📝 Esquema de tabla SYSTEM_LOGS:");
    const response = await fetch(`${API_BASE_URL}/schema?table=SYSTEM_LOGS`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Tabla ${data.table} - ${data.columnCount} columnas:`);
      data.columns.slice(0, 5).forEach(col => {
        console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE}`);
      });
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
  
  // Consulta SQL personalizada
  try {
    console.log("\n🔍 Consulta SQL personalizada:");
    const queryData = {
      sql: "SELECT log_level, COUNT(*) as count FROM system_logs GROUP BY log_level ORDER BY count DESC",
      binds: []
    };
    
    const response = await fetch(`${API_BASE_URL}/execute`, {
      method: "POST",
      headers,
      body: JSON.stringify(queryData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${data.rowCount} registros:`);
      data.data.forEach(row => {
        console.log(`   - ${row.LOG_LEVEL}: ${row.COUNT} logs`);
      });
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

/**
 * Ejecutar todas las pruebas
 */
async function runAllTests() {
  console.log("\n🚀 Iniciando pruebas de la API de logs...");
  
  // Verificar que la API esté funcionando
  const isHealthy = await checkHealth();
  if (!isHealthy) {
    console.log("\n❌ La API no está disponible. Asegúrate de:");
    console.log("   1. Ejecutar el script SQL: scripts/create-logs-table.sql");
    console.log("   2. Iniciar la API: ./run.sh api");
    console.log("   3. Verificar la configuración en .env");
    return;
  }
  
  // Ejecutar todas las pruebas
  await createTestLogs();
  await testGetLogs();
  await testLogStats();
  await testGetLogById();
  await testOtherEndpoints();
  
  console.log("\n✅ ¡Pruebas completadas exitosamente!");
  console.log("\n📚 Próximos pasos:");
  console.log("   - Explorar más filtros en /api/logs");
  console.log("   - Probar cleanup: POST /api/logs/cleanup");
  console.log("   - Ver documentación: docs/API.md");
  console.log("   - Usar Postman con: docs/postman-collection.json");
}

// Ejecutar pruebas si el archivo se ejecuta directamente
if (import.meta.main) {
  runAllTests();
}
