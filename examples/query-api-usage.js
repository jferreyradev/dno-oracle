/**
 * Ejemplos prácticos de uso del API de consultas SQL directas
 * Ejecutar: deno run --allow-net examples/query-api-usage.js
 */

const BASE_URL = 'http://localhost:8000';

// Función auxiliar para hacer requests
async function queryAPI(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    console.log(`\n🔹 ${method} ${endpoint}`);
    console.log(`Status: ${response.status}`);
    
    if (data.success) {
      console.log(`✅ Éxito en ${data.executionTime}ms`);
      if (data.data && data.data.length > 0) {
        console.log(`📊 Registros: ${data.data.length}`);
        console.log('Muestra:', JSON.stringify(data.data[0], null, 2));
      }
    } else {
      console.log(`❌ Error: ${data.error}`);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Error de conexión: ${error.message}`);
    return null;
  }
}

// Ejemplos de uso práctico
async function ejemplosBasicos() {
  console.log('🚀 === EJEMPLOS BÁSICOS DE CONSULTAS SQL ===\n');

  // 1. Información del sistema
  await queryAPI('/api/query/info');

  // 2. Consulta simple de fecha y usuario actual
  await queryAPI('/api/query/select', 'POST', {
    sql: 'SELECT SYSDATE as fecha_actual, USER as usuario_bd FROM dual'
  });

  // 3. Consulta con parámetros
  await queryAPI('/api/query/select', 'POST', {
    sql: 'SELECT :mensaje as mensaje, :numero as numero, SYSDATE as timestamp FROM dual',
    params: { 
      mensaje: 'Hola desde API!', 
      numero: 2025 
    }
  });

  // 4. Validación de consulta compleja
  await queryAPI('/api/query/validate', 'POST', {
    sql: `
      SELECT u.*, p.nombre as perfil 
      FROM usuarios u 
      LEFT JOIN perfiles p ON u.id_perfil = p.id 
      WHERE u.activo = 1
    `
  });
}

async function ejemplosAvanzados() {
  console.log('\n🎯 === EJEMPLOS AVANZADOS ===\n');

  // 1. Consulta con CTE (Common Table Expression)
  await queryAPI('/api/query/select', 'POST', {
    sql: `
      WITH numeros AS (
        SELECT 1 as num FROM dual
        UNION ALL SELECT 2 FROM dual
        UNION ALL SELECT 3 FROM dual
        UNION ALL SELECT 4 FROM dual
        UNION ALL SELECT 5 FROM dual
      )
      SELECT 
        num,
        num * num as cuadrado,
        POWER(num, 3) as cubo,
        CASE 
          WHEN MOD(num, 2) = 0 THEN 'Par'
          ELSE 'Impar'
        END as tipo
      FROM numeros
      ORDER BY num
    `
  });

  // 2. Consulta con funciones de fecha
  await queryAPI('/api/query/select', 'POST', {
    sql: `
      SELECT 
        SYSDATE as ahora,
        TRUNC(SYSDATE) as solo_fecha,
        ADD_MONTHS(SYSDATE, 1) as siguiente_mes,
        EXTRACT(YEAR FROM SYSDATE) as anio_actual,
        TO_CHAR(SYSDATE, 'DD/MM/YYYY HH24:MI:SS') as fecha_formateada
      FROM dual
    `
  });

  // 3. Análisis de rangos de fechas
  await queryAPI('/api/query/select', 'POST', {
    sql: `
      SELECT 
        'Últimos 7 días' as periodo,
        TRUNC(SYSDATE - 7) as fecha_inicio,
        TRUNC(SYSDATE) as fecha_fin
      FROM dual
      UNION ALL
      SELECT 
        'Este mes' as periodo,
        TRUNC(SYSDATE, 'MM') as fecha_inicio,
        LAST_DAY(SYSDATE) as fecha_fin
      FROM dual
      UNION ALL
      SELECT 
        'Este año' as periodo,
        TRUNC(SYSDATE, 'YYYY') as fecha_inicio,
        ADD_MONTHS(TRUNC(SYSDATE, 'YYYY'), 12) - 1 as fecha_fin
      FROM dual
    `
  });
}

async function ejemplosUtilidad() {
  console.log('\n🛠️ === EJEMPLOS DE UTILIDAD ===\n');

  // 1. Información de la sesión
  await queryAPI('/api/query/select', 'POST', {
    sql: `
      SELECT 
        SYS_CONTEXT('USERENV', 'SESSION_USER') as usuario_sesion,
        SYS_CONTEXT('USERENV', 'DATABASE_ROLE') as rol_bd,
        SYS_CONTEXT('USERENV', 'SERVER_HOST') as servidor,
        SYS_CONTEXT('USERENV', 'IP_ADDRESS') as ip_cliente,
        SYS_CONTEXT('USERENV', 'SESSIONID') as id_sesion
      FROM dual
    `
  });

  // 2. Información de tablespaces
  await queryAPI('/api/query/select', 'POST', {
    sql: `
      SELECT 
        tablespace_name,
        status,
        contents,
        extent_management,
        segment_space_management
      FROM user_tablespaces
      WHERE ROWNUM <= 5
    `
  });

  // 3. Tablas del usuario actual
  await queryAPI('/api/query/select', 'POST', {
    sql: `
      SELECT 
        table_name,
        num_rows,
        blocks,
        last_analyzed,
        CASE 
          WHEN num_rows IS NULL THEN 'Sin estadísticas'
          WHEN num_rows = 0 THEN 'Vacía'
          WHEN num_rows < 1000 THEN 'Pequeña'
          WHEN num_rows < 100000 THEN 'Mediana'
          ELSE 'Grande'
        END as tamaño_estimado
      FROM user_tables
      WHERE ROWNUM <= 10
      ORDER BY NVL(num_rows, 0) DESC
    `
  });
}

async function ejemplosAnalisisDatos() {
  console.log('\n📊 === EJEMPLOS DE ANÁLISIS DE DATOS ===\n');

  // 1. Generación de datos de ejemplo
  await queryAPI('/api/query/select', 'POST', {
    sql: `
      WITH datos_ejemplo AS (
        SELECT 
          LEVEL as id,
          'Usuario' || LEVEL as nombre,
          ROUND(DBMS_RANDOM.VALUE(18, 65)) as edad,
          CASE MOD(LEVEL, 3)
            WHEN 0 THEN 'Administrador'
            WHEN 1 THEN 'Usuario'
            ELSE 'Invitado'
          END as tipo_usuario,
          ROUND(DBMS_RANDOM.VALUE(1000, 50000), 2) as salario
        FROM dual
        CONNECT BY LEVEL <= 10
      )
      SELECT 
        id,
        nombre,
        edad,
        tipo_usuario,
        salario,
        CASE 
          WHEN edad < 25 THEN 'Joven'
          WHEN edad < 40 THEN 'Adulto'
          ELSE 'Senior'
        END as categoria_edad
      FROM datos_ejemplo
    `,
    options: { maxRows: 15 }
  });

  // 2. Estadísticas agregadas
  await queryAPI('/api/query/select', 'POST', {
    sql: `
      WITH datos AS (
        SELECT 
          LEVEL as id,
          ROUND(DBMS_RANDOM.VALUE(100, 1000)) as valor
        FROM dual
        CONNECT BY LEVEL <= 20
      )
      SELECT 
        COUNT(*) as total_registros,
        MIN(valor) as valor_minimo,
        MAX(valor) as valor_maximo,
        ROUND(AVG(valor), 2) as promedio,
        ROUND(STDDEV(valor), 2) as desviacion_estandar,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY valor) as mediana
      FROM datos
    `
  });

  // 3. Distribución por rangos
  await queryAPI('/api/query/select', 'POST', {
    sql: `
      WITH datos AS (
        SELECT ROUND(DBMS_RANDOM.VALUE(1, 100)) as puntuacion
        FROM dual
        CONNECT BY LEVEL <= 50
      )
      SELECT 
        CASE 
          WHEN puntuacion <= 20 THEN '0-20'
          WHEN puntuacion <= 40 THEN '21-40'
          WHEN puntuacion <= 60 THEN '41-60'
          WHEN puntuacion <= 80 THEN '61-80'
          ELSE '81-100'
        END as rango,
        COUNT(*) as cantidad,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as porcentaje
      FROM datos
      GROUP BY 
        CASE 
          WHEN puntuacion <= 20 THEN '0-20'
          WHEN puntuacion <= 40 THEN '21-40'
          WHEN puntuacion <= 60 THEN '41-60'
          WHEN puntuacion <= 80 THEN '61-80'
          ELSE '81-100'
        END
      ORDER BY rango
    `
  });
}

async function ejemplosValidacionErrores() {
  console.log('\n🛡️ === EJEMPLOS DE VALIDACIÓN Y ERRORES ===\n');

  // 1. Consulta válida
  await queryAPI('/api/query/validate', 'POST', {
    sql: 'SELECT COUNT(*) FROM dual WHERE 1=1'
  });

  // 2. Consulta con comando bloqueado
  await queryAPI('/api/query/validate', 'POST', {
    sql: 'DROP TABLE usuarios'
  });

  // 3. Consulta con sintaxis incorrecta
  await queryAPI('/api/query/validate', 'POST', {
    sql: 'SELEC * FROOM dual'
  });

  // 4. Múltiples statements (no permitido)
  await queryAPI('/api/query/validate', 'POST', {
    sql: 'SELECT 1 FROM dual; SELECT 2 FROM dual;'
  });
}

// Función principal
async function ejecutarEjemplos() {
  console.log('🎯 EJEMPLOS PRÁCTICOS DEL API DE CONSULTAS SQL DIRECTAS');
  console.log('=====================================================\n');

  try {
    await ejemplosBasicos();
    await ejemplosAvanzados();
    await ejemplosUtilidad();
    await ejemplosAnalisisDatos();
    await ejemplosValidacionErrores();

    console.log('\n✅ TODOS LOS EJEMPLOS COMPLETADOS');
    console.log('\n📚 Consulta docs/QUERY-EXAMPLES.md para más ejemplos');
    console.log('🌐 Documentación completa: http://localhost:8000/api/query/info');

  } catch (error) {
    console.error('\n❌ Error ejecutando ejemplos:', error.message);
    console.log('\n💡 Asegúrate de que el servidor esté ejecutándose:');
    console.log('   deno run --allow-all api/server-enhanced.ts');
  }
}

// Ejecutar si es el archivo principal
if (import.meta.main) {
  ejecutarEjemplos();
}
