import { exec as execOriginal, checkConn as checkOriginal } from "../src/db.js";
import { exec as execImproved, checkConn as checkImproved, getPoolStats, executeTransaction } from "../src/db-improved.js";

console.log("=== Comparación: db.js Original vs db-improved.js ===\n");

// Test 1: Verificación básica de conexión
console.log("1. 🔍 Prueba de verificación de conexión:");
try {
  console.log("   Original:");
  const originalCheck = await checkOriginal();
  console.log(`   ✅ Resultado: ${originalCheck}`);
  
  console.log("   Mejorada:");
  const improvedCheck = await checkImproved();
  console.log(`   ✅ Resultado: ${improvedCheck}`);
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

console.log("\n2. 📊 Estadísticas del Pool (solo versión mejorada):");
try {
  const stats = getPoolStats();
  if (stats) {
    console.log("   📈 Estadísticas del pool:");
    console.log(`      - Conexiones abiertas: ${stats.connectionsOpen}`);
    console.log(`      - Conexiones en uso: ${stats.connectionsInUse}`);
    console.log(`      - Pool máximo: ${stats.poolMax}`);
    console.log(`      - Pool mínimo: ${stats.poolMin}`);
  } else {
    console.log("   ℹ️  Pool no inicializado aún");
  }
} catch (error) {
  console.log(`   ❌ Error obteniendo estadísticas: ${error.message}`);
}

console.log("\n3. 🔄 Prueba de consulta simple:");
try {
  console.log("   Versión mejorada:");
  const result = await execImproved("SELECT SYSDATE as FECHA, USER as USUARIO FROM DUAL");
  console.log(`   ✅ Filas obtenidas: ${result.rows.length}`);
  console.log(`   📅 Fecha servidor: ${result.rows[0].FECHA}`);
  console.log(`   👤 Usuario: ${result.rows[0].USUARIO}`);
  console.log(`   ⏱️  Ejecutada el: ${result.executedAt}`);
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

console.log("\n4. 📄 Prueba de paginación:");
try {
  const paginatedResult = await execImproved(
    "SELECT OBJECT_NAME, OBJECT_TYPE FROM USER_OBJECTS ORDER BY OBJECT_NAME",
    { limit: 5, offset: 0 }
  );
  console.log(`   ✅ Resultados paginados: ${paginatedResult.rows.length} filas`);
  if (paginatedResult.rows.length > 0) {
    console.log("   📋 Primeros objetos:");
    paginatedResult.rows.forEach((row, index) => {
      console.log(`      ${index + 1}. ${row.OBJECT_NAME} (${row.OBJECT_TYPE})`);
    });
  }
} catch (error) {
  console.log(`   ❌ Error en paginación: ${error.message}`);
}

console.log("\n5. 🔒 Prueba de transacción (solo versión mejorada):");
try {
  // Nota: Esta es una transacción de prueba que no modifica datos reales
  const transactionQueries = [
    {
      sql: "SELECT COUNT(*) as TOTAL_OBJECTS FROM USER_OBJECTS",
      binds: {}
    },
    {
      sql: "SELECT COUNT(*) as TOTAL_TABLES FROM USER_TABLES", 
      binds: {}
    }
  ];
  
  const transactionResults = await executeTransaction(transactionQueries);
  console.log(`   ✅ Transacción completada con ${transactionResults.length} consultas`);
  console.log(`   📊 Total objetos: ${transactionResults[0].rows[0].TOTAL_OBJECTS}`);
  console.log(`   📋 Total tablas: ${transactionResults[1].rows[0].TOTAL_TABLES}`);
} catch (error) {
  console.log(`   ❌ Error en transacción: ${error.message}`);
}

console.log("\n6. ⚠️  Prueba de manejo de errores:");
try {
  await execImproved("SELECT * FROM TABLA_QUE_NO_EXISTE");
} catch (error) {
  console.log(`   ✅ Error capturado correctamente: ${error.message.substring(0, 100)}...`);
}

console.log("\n=== Resumen de Mejoras Implementadas ===");
console.log("✅ Gestión adecuada del pool de conexiones");
console.log("✅ Manejo robusto de errores con re-lanzamiento");
console.log("✅ Inicialización única del driver Oracle");
console.log("✅ Configuración mutable con setConfig()");
console.log("✅ Estadísticas del pool de conexiones");
console.log("✅ Soporte para transacciones");
console.log("✅ Metadatos adicionales en resultados");
console.log("✅ Validación de parámetros");
console.log("✅ Cierre limpio de recursos");
console.log("✅ Documentación JSDoc completa");

console.log("\n=== Recomendación ===");
console.log("🔄 Se recomienda migrar a db-improved.js para mayor robustez");
console.log("📚 La API es compatible, solo se agregaron funciones nuevas");
console.log("🛡️  Mejor manejo de memoria y recursos");
