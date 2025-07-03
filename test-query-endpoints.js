/**
 * Script de prueba para endpoints de consultas SQL directas
 */

const BASE_URL = 'http://localhost:8000';

// Función auxiliar para hacer requests
async function makeRequest(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    console.log(`\n🔹 ${method} ${endpoint}`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return { response, data };
  } catch (error) {
    console.error(`❌ Error en ${method} ${endpoint}:`, error.message);
    return null;
  }
}

async function testQueryEndpoints() {
  console.log('🚀 Probando endpoints de consultas SQL...\n');

  // 1. Probar información del servicio
  await makeRequest('/api/query/info');

  // 2. Probar validación de consulta
  await makeRequest('/api/query/validate', 'POST', {
    sql: 'SELECT COUNT(*) FROM dual'
  });

  // 3. Probar consulta SELECT simple
  await makeRequest('/api/query/select', 'POST', {
    sql: 'SELECT SYSDATE, USER, SYS_CONTEXT(\'USERENV\', \'DATABASE_ROLE\') FROM dual',
    options: { maxRows: 1 }
  });

  // 4. Probar consulta con parámetros
  await makeRequest('/api/query/select', 'POST', {
    sql: 'SELECT :mensaje as mensaje, :numero as numero FROM dual',
    params: { mensaje: 'Hola Query!', numero: 42 }
  });

  // 5. Probar validación con consulta inválida
  await makeRequest('/api/query/validate', 'POST', {
    sql: 'DROP TABLE usuarios'
  });

  // 6. Probar explain plan
  await makeRequest('/api/query/explain', 'POST', {
    sql: 'SELECT * FROM dual WHERE 1=1'
  });

  console.log('\n✅ Pruebas completadas!');
}

// Ejecutar pruebas
testQueryEndpoints().catch(console.error);
