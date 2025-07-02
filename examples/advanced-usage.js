// Ejemplos avanzados de uso del módulo dno-oracle

import { exec, checkConn, open, close, setConfig } from "../src/db.js";

console.log("=== Ejemplos Avanzados de DNO-Oracle ===\n");

// Ejemplo 1: Configuración dinámica
console.log("1. Configuración Dinámica");
const customConfig = {
  user: "otro_usuario",
  password: "otra_password",
  connectString: "192.168.1.100:1521/XE",
  poolMax: 5
};

// setConfig(customConfig); // Descomenta para usar config personalizada

// Ejemplo 2: Manejo de errores robusto
console.log("2. Manejo de Errores");
async function safeQuery(sql, binds = {}) {
  try {
    const result = await exec(sql, binds);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error en consulta:", error.message);
    return { success: false, error: error.message };
  }
}

// Ejemplo 3: Consultas complejas con joins
console.log("3. Consultas con JOINS");
const complexQuery = `
  SELECT 
    u.ID,
    u.NOMBRE,
    u.EMAIL,
    d.NOMBRE as DEPARTAMENTO,
    COUNT(p.ID) as TOTAL_PROYECTOS
  FROM USUARIOS u
  LEFT JOIN DEPARTAMENTOS d ON u.DEPT_ID = d.ID
  LEFT JOIN PROYECTOS p ON u.ID = p.USUARIO_ID
  WHERE u.ACTIVO = :activo
  GROUP BY u.ID, u.NOMBRE, u.EMAIL, d.NOMBRE
  ORDER BY u.NOMBRE
`;

const usersWithProjects = await safeQuery(complexQuery, { activo: 1 });
if (usersWithProjects.success) {
  console.log("Usuarios encontrados:", usersWithProjects.data.rows.length);
}

// Ejemplo 4: Paginación avanzada
console.log("4. Paginación Avanzada");
async function getPaginatedResults(baseQuery, page = 1, pageSize = 10) {
  const offset = (page - 1) * pageSize;
  
  // Contar total de registros
  const countQuery = `SELECT COUNT(*) as TOTAL FROM (${baseQuery})`;
  const countResult = await exec(countQuery);
  const total = countResult.rows[0].TOTAL;
  
  // Obtener datos paginados
  const dataResult = await exec(baseQuery, { limit: pageSize, offset: offset });
  
  return {
    data: dataResult.rows,
    pagination: {
      page: page,
      pageSize: pageSize,
      total: total,
      totalPages: Math.ceil(total / pageSize),
      hasNext: page < Math.ceil(total / pageSize),
      hasPrev: page > 1
    }
  };
}

const paginatedUsers = await getPaginatedResults(
  "SELECT * FROM USUARIOS WHERE ACTIVO = 1 ORDER BY NOMBRE",
  1,
  5
);
console.log("Página 1 de usuarios:", paginatedUsers.pagination);

// Ejemplo 5: Transacciones simuladas (usando autoCommit)
console.log("5. Operaciones en Lote");
async function bulkInsert(tableName, records) {
  const results = [];
  
  for (const record of records) {
    try {
      const columns = Object.keys(record).join(', ');
      const placeholders = Object.keys(record).map(key => `:${key}`).join(', ');
      const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
      
      const result = await exec(sql, record);
      results.push({ success: true, record, result });
    } catch (error) {
      results.push({ success: false, record, error: error.message });
    }
  }
  
  return results;
}

// Ejemplo de datos para insertar
const newUsers = [
  { nombre: 'Juan Pérez', email: 'juan@email.com', activo: 1 },
  { nombre: 'María García', email: 'maria@email.com', activo: 1 },
  { nombre: 'Carlos López', email: 'carlos@email.com', activo: 1 }
];

// const insertResults = await bulkInsert('USUARIOS', newUsers);
// console.log("Resultados de inserción:", insertResults);

// Ejemplo 6: Consultas dinámicas con filtros
console.log("6. Consultas Dinámicas");
function buildDynamicQuery(filters = {}) {
  let query = "SELECT * FROM USUARIOS WHERE 1=1";
  const binds = {};
  
  if (filters.nombre) {
    query += " AND UPPER(NOMBRE) LIKE UPPER(:nombre)";
    binds.nombre = `%${filters.nombre}%`;
  }
  
  if (filters.email) {
    query += " AND UPPER(EMAIL) LIKE UPPER(:email)";
    binds.email = `%${filters.email}%`;
  }
  
  if (filters.activo !== undefined) {
    query += " AND ACTIVO = :activo";
    binds.activo = filters.activo;
  }
  
  if (filters.fechaDesde) {
    query += " AND FECHA_CREACION >= :fechaDesde";
    binds.fechaDesde = filters.fechaDesde;
  }
  
  query += " ORDER BY NOMBRE";
  
  return { query, binds };
}

const searchFilters = {
  nombre: 'juan',
  activo: 1
};

const { query: dynamicQuery, binds: dynamicBinds } = buildDynamicQuery(searchFilters);
const searchResults = await safeQuery(dynamicQuery, dynamicBinds);
console.log("Búsqueda dinámica completada");

// Ejemplo 7: Validación de esquema
console.log("7. Validación de Esquema");
async function validateTableExists(tableName) {
  const checkQuery = `
    SELECT COUNT(*) as COUNT
    FROM USER_TABLES 
    WHERE TABLE_NAME = UPPER(:tableName)
  `;
  
  const result = await exec(checkQuery, { tableName });
  return result.rows[0].COUNT > 0;
}

async function getTableColumns(tableName) {
  const columnsQuery = `
    SELECT 
      COLUMN_NAME,
      DATA_TYPE,
      DATA_LENGTH,
      NULLABLE,
      DATA_DEFAULT
    FROM USER_TAB_COLUMNS 
    WHERE TABLE_NAME = UPPER(:tableName)
    ORDER BY COLUMN_ID
  `;
  
  const result = await exec(columnsQuery, { tableName });
  return result.rows;
}

// const tableExists = await validateTableExists('USUARIOS');
// if (tableExists) {
//   const columns = await getTableColumns('USUARIOS');
//   console.log("Estructura de la tabla USUARIOS:", columns);
// }

// Ejemplo 8: Caché simple de consultas
console.log("8. Caché de Consultas");
class QueryCache {
  constructor(ttl = 300000) { // 5 minutos por defecto
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  generateKey(sql, binds) {
    return `${sql}:${JSON.stringify(binds)}`;
  }
  
  get(sql, binds) {
    const key = this.generateKey(sql, binds);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }
    
    return null;
  }
  
  set(sql, binds, data) {
    const key = this.generateKey(sql, binds);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  clear() {
    this.cache.clear();
  }
}

const queryCache = new QueryCache(60000); // 1 minuto TTL

async function cachedExec(sql, binds = {}) {
  // Verificar caché
  const cached = queryCache.get(sql, binds);
  if (cached) {
    console.log("Resultado desde caché");
    return cached;
  }
  
  // Ejecutar consulta y cachear resultado
  const result = await exec(sql, binds);
  queryCache.set(sql, binds, result);
  console.log("Resultado desde base de datos");
  return result;
}

// Ejemplo 9: Métricas y monitoring
console.log("9. Métricas de Rendimiento");
class PerformanceMonitor {
  constructor() {
    this.queries = [];
  }
  
  async timedExec(sql, binds = {}) {
    const startTime = Date.now();
    
    try {
      const result = await exec(sql, binds);
      const duration = Date.now() - startTime;
      
      this.queries.push({
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        duration,
        success: true,
        timestamp: new Date(),
        rowCount: result.rows ? result.rows.length : 0
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.queries.push({
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        duration,
        success: false,
        error: error.message,
        timestamp: new Date()
      });
      
      throw error;
    }
  }
  
  getStats() {
    const successful = this.queries.filter(q => q.success);
    const failed = this.queries.filter(q => !q.success);
    
    return {
      totalQueries: this.queries.length,
      successful: successful.length,
      failed: failed.length,
      averageDuration: successful.reduce((sum, q) => sum + q.duration, 0) / successful.length || 0,
      slowestQuery: successful.reduce((slowest, q) => q.duration > slowest.duration ? q : slowest, { duration: 0 }),
      recentQueries: this.queries.slice(-10)
    };
  }
}

const monitor = new PerformanceMonitor();

// Ejemplo de uso con monitoring
const monitoredResult = await monitor.timedExec("SELECT SYSDATE FROM DUAL");
console.log("Estadísticas:", monitor.getStats());

console.log("\n=== Ejemplos completados ===");
console.log("Revisa el código para ver implementaciones detalladas de:");
console.log("- Configuración dinámica");
console.log("- Manejo robusto de errores"); 
console.log("- Consultas complejas con JOINs");
console.log("- Paginación avanzada");
console.log("- Operaciones en lote");
console.log("- Consultas dinámicas con filtros");
console.log("- Validación de esquemas");
console.log("- Caché de consultas");
console.log("- Monitoreo de rendimiento");
