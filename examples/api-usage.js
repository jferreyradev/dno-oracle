/**
 * Ejemplos de uso de la API DNO-Oracle
 */

// Configuración base
const API_BASE_URL = "http://localhost:8000/api";
const headers = {
  "Content-Type": "application/json",
  // "Authorization": "Bearer dno-oracle-api-key-2025" // Opcional
};

console.log("🚀 Ejemplos de uso de la API DNO-Oracle");
console.log("==========================================");

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
    console.log("⏱️  Tiempo activo:", data.api.uptime);
    
    return data;
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

/**
 * 2. Crear un usuario
 */
async function createUser() {
  console.log("\n2. 👤 Creando usuario...");
  
  const userData = {
    username: "testuser",
    email: "test@example.com",
    fullName: "Usuario de Prueba",
    isActive: true
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: "POST",
      headers,
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log("✅ Usuario creado:", data.data.USERNAME);
      console.log("🆔 ID:", data.data.USER_ID);
      return data.data;
    } else {
      console.log("❌ Error:", data.error);
      return null;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return null;
  }
}

/**
 * 3. Obtener lista de usuarios
 */
async function getUsers() {
  console.log("\n3. 📋 Obteniendo lista de usuarios...");
  
  try {
    const response = await fetch(`${API_BASE_URL}/users?page=1&limit=5`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${data.data.length} usuarios encontrados`);
      console.log("📄 Página:", data.pagination.page, "de", data.pagination.totalPages);
      
      data.data.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.USERNAME} (${user.EMAIL})`);
      });
      
      return data.data;
    } else {
      console.log("❌ Error:", data.error);
      return [];
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return [];
  }
}

/**
 * 4. Ejecutar consulta SQL personalizada
 */
async function executeCustomQuery() {
  console.log("\n4. 🔍 Ejecutando consulta SQL personalizada...");
  
  const queryData = {
    sql: `
      SELECT 
        table_name,
        num_rows,
        tablespace_name
      FROM user_tables 
      WHERE rownum <= 5
      ORDER BY table_name
    `,
    binds: []
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/execute`, {
      method: "POST",
      headers,
      body: JSON.stringify(queryData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${data.rowCount} registros encontrados`);
      
      data.data.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.TABLE_NAME} (${row.NUM_ROWS || 'N/A'} filas)`);
      });
      
      return data.data;
    } else {
      console.log("❌ Error:", data.error);
      return [];
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return [];
  }
}

/**
 * 5. Obtener esquema de una tabla
 */
async function getTableSchema() {
  console.log("\n5. 📝 Obteniendo esquema de tabla...");
  
  try {
    const response = await fetch(`${API_BASE_URL}/schema?table=USERS`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Tabla: ${data.table} (${data.columnCount} columnas)`);
      
      data.columns.forEach(col => {
        const nullable = col.NULLABLE === 'Y' ? '(nullable)' : '(required)';
        console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${nullable}`);
      });
      
      return data.columns;
    } else {
      console.log("❌ Error:", data.error);
      return [];
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return [];
  }
}

/**
 * 6. Listar tablas disponibles
 */
async function listTables() {
  console.log("\n6. 📊 Listando tablas disponibles...");
  
  try {
    const response = await fetch(`${API_BASE_URL}/tables`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${data.tableCount} tablas encontradas en el esquema ${data.owner}`);
      
      data.tables.slice(0, 10).forEach((table, index) => {
        const rows = table.NUM_ROWS ? `${table.NUM_ROWS} filas` : 'Sin estadísticas';
        console.log(`   ${index + 1}. ${table.TABLE_NAME} (${rows})`);
      });
      
      if (data.tables.length > 10) {
        console.log(`   ... y ${data.tables.length - 10} tablas más`);
      }
      
      return data.tables;
    } else {
      console.log("❌ Error:", data.error);
      return [];
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return [];
  }
}

/**
 * 7. Ejecutar procedimiento almacenado (ejemplo)
 */
async function callProcedure() {
  console.log("\n7. 🔧 Ejecutando procedimiento almacenado...");
  
  const procedureData = {
    procedure: "DBMS_OUTPUT.PUT_LINE",
    binds: {
      line: "Hola desde la API!"
    },
    type: "procedure"
  };
  
  try {
    const response = await fetch(`${API_BASE_URL}/procedure`, {
      method: "POST",
      headers,
      body: JSON.stringify(procedureData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log("✅ Procedimiento ejecutado correctamente");
      console.log("📋 Resultado:", JSON.stringify(data.data, null, 2));
      return data.data;
    } else {
      console.log("❌ Error:", data.error);
      return null;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return null;
  }
}

/**
 * Ejecutar todos los ejemplos
 */
async function runAllExamples() {
  console.log("🚀 Ejecutando todos los ejemplos...\n");
  
  // Verificar que la API esté funcionando
  const health = await checkHealth();
  if (!health || health.status !== 'ok') {
    console.log("❌ La API no está disponible. Verifica que esté ejecutándose.");
    return;
  }
  
  // Ejecutar ejemplos
  await getUsers();
  await executeCustomQuery();
  await listTables();
  await getTableSchema();
  await callProcedure();
  
  // Intentar crear usuario (puede fallar si la tabla no existe)
  await createUser();
  
  console.log("\n✅ Ejemplos completados!");
  console.log("\n📚 Para más información:");
  console.log("   - Documentación: README.md");
  console.log("   - Endpoints: http://localhost:8000/api");
  console.log("   - Estado: http://localhost:8000/api/health");
}

// Ejecutar ejemplos si el archivo se ejecuta directamente
if (import.meta.main) {
  runAllExamples();
}
