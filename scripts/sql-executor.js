/**
 * Script para ejecutar archivos SQL usando la librería DNO-Oracle
 * Uso: deno run --allow-net --allow-read --allow-env --allow-ffi scripts/sql-executor.js [archivo.sql]
 */

import { exec, open, close } from "../src/db.js";

// Función para leer y procesar archivo SQL
async function readSqlFile(filePath) {
  try {
    const content = await Deno.readTextFile(filePath);
    
    // Limpiar contenido: remover comentarios y líneas vacías
    const cleanContent = content
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('--');
      })
      .join('\n');
    
    // Dividir el contenido en statements individuales
    const statements = [];
    let currentStatement = "";
    let inProcedure = false;
    let bracketLevel = 0;
    
    // Separar por líneas para análisis más preciso
    const lines = cleanContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      if (!trimmedLine) continue;
      
      // Detectar inicio de procedimiento/función/trigger
      const upperLine = trimmedLine.toUpperCase();
      if (upperLine.includes('CREATE OR REPLACE') && 
          (upperLine.includes('PROCEDURE') || 
           upperLine.includes('FUNCTION') ||
           upperLine.includes('TRIGGER'))) {
        inProcedure = true;
      }
      
      // Contar paréntesis para detectar bloques anidados
      for (const char of line) {
        if (char === '(') bracketLevel++;
        if (char === ')') bracketLevel--;
      }
      
      currentStatement += line;
      
      // Determinar si es fin de statement
      let isEndOfStatement = false;
      
      if (trimmedLine === '/') {
        // Delimitador Oracle para procedimientos/funciones/triggers
        isEndOfStatement = true;
        inProcedure = false;
        // No incluir la barra en el statement
        currentStatement = currentStatement.replace(/\s*\/\s*$/, '');
      } else if (trimmedLine.endsWith(';')) {
        if (inProcedure) {
          // Dentro de procedimiento, solo terminar si llegamos al END;
          if (upperLine.includes('END;') && bracketLevel === 0) {
            isEndOfStatement = true;
            inProcedure = false;
          } else {
            // Agregar nueva línea y continuar
            currentStatement += '\n';
          }
        } else {
          // Statement normal terminado
          isEndOfStatement = true;
        }
      } else {
        // Continuar construyendo el statement
        currentStatement += '\n';
      }
      
      if (isEndOfStatement) {
        const cleanStatement = currentStatement.trim();
        if (cleanStatement) {
          statements.push(cleanStatement);
        }
        currentStatement = "";
        bracketLevel = 0;
      }
    }
    
    // Agregar último statement si existe
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    return statements.filter(stmt => stmt.length > 0);
    
  } catch (error) {
    throw new Error(`Error leyendo archivo SQL: ${error.message}`);
  }
}

// Función para ejecutar un statement SQL individual
async function executeStatement(sql, index, total) {
  // Limpiar el SQL: remover punto y coma final y espacios extra
  const cleanSql = sql.trim().replace(/;?\s*$/, '');
  
  const shortSql = cleanSql.substring(0, 100).replace(/\s+/g, ' ');
  console.log(`\n📋 Ejecutando statement ${index + 1}/${total}:`);
  console.log(`   ${shortSql}${cleanSql.length > 100 ? '...' : ''}`);
  
  try {
    const startTime = Date.now();
    const result = await exec(cleanSql);
    const duration = Date.now() - startTime;
    
    if (result && result.rowsAffected !== undefined) {
      console.log(`   ✅ Completado en ${duration}ms - ${result.rowsAffected} filas afectadas`);
    } else if (result && result.rows && result.rows.length > 0) {
      console.log(`   ✅ Completado en ${duration}ms - ${result.rows.length} filas devueltas`);
      
      // Mostrar algunas filas si es una consulta SELECT
      if (result.rows.length <= 5) {
        result.rows.forEach((row, idx) => {
          console.log(`   📊 Fila ${idx + 1}:`, JSON.stringify(row, null, 2));
        });
      } else {
        console.log(`   📊 Primeras 3 filas:`);
        result.rows.slice(0, 3).forEach((row, idx) => {
          console.log(`   📊 Fila ${idx + 1}:`, JSON.stringify(row, null, 2));
        });
        console.log(`   ... y ${result.rows.length - 3} filas más`);
      }
    } else {
      console.log(`   ✅ Completado en ${duration}ms - Statement ejecutado`);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error(`Error ejecutando statement: ${error.message}`);
    console.error(`SQL limpio: ${cleanSql}`);
    console.error(`   ❌ Error: ${error.message}`);
    
    // Análisis del error para mejor diagnóstico
    if (error.message.includes('ORA-00911')) {
      console.error(`   💡 Posible causa: Caracteres especiales o delimitadores incorrectos`);
    } else if (error.message.includes('ORA-02000')) {
      console.error(`   💡 Posible causa: Sintaxis SQL incorrecta o palabra clave faltante`);
    } else if (error.message.includes('ORA-00942')) {
      console.error(`   💡 Posible causa: Tabla o vista no existe`);
    }
    
    console.log(`   ⚠️  Continuando con el siguiente statement...`);
    return { success: false, error: error.message };
  }
}

// Función principal
async function executeSqlFile(filePath) {
  console.log("🚀 Ejecutor de archivos SQL - DNO-Oracle");
  console.log("========================================");
  console.log(`📄 Archivo: ${filePath}`);
  console.log("");
  
  try {
    // Verificar que el archivo existe
    try {
      await Deno.stat(filePath);
    } catch {
      throw new Error(`Archivo no encontrado: ${filePath}`);
    }
    
    // Abrir conexión a la base de datos
    console.log("🔌 Conectando a la base de datos Oracle...");
    await open();
    console.log("✅ Conexión establecida");
    
    // Leer y procesar archivo SQL
    console.log("📖 Leyendo y procesando archivo SQL...");
    const statements = await readSqlFile(filePath);
    console.log(`✅ ${statements.length} statements encontrados`);
    
    if (statements.length === 0) {
      console.log("⚠️  No se encontraron statements SQL para ejecutar");
      return;
    }
    
    // Mostrar resumen de statements
    console.log("\n📋 Resumen de statements:");
    statements.forEach((sql, index) => {
      const type = sql.trim().toUpperCase().split(' ')[0];
      const preview = sql.substring(0, 80).replace(/\s+/g, ' ');
      console.log(`   ${index + 1}. ${type}: ${preview}${sql.length > 80 ? '...' : ''}`);
    });
    
    // Confirmar ejecución
    console.log("");
    const proceed = confirm("¿Deseas ejecutar todos estos statements? (y/N)");
    if (!proceed) {
      console.log("❌ Ejecución cancelada por el usuario");
      return;
    }
    
    // Ejecutar todos los statements
    console.log("\n🔄 Ejecutando statements...");
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < statements.length; i++) {
      const result = await executeStatement(statements[i], i, statements.length);
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        errors.push({
          index: i + 1,
          sql: statements[i].substring(0, 100),
          error: result.error
        });
      }
    }
    
    // Resumen final
    console.log("\n📊 Resumen de ejecución:");
    console.log(`   ✅ Exitosos: ${successCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log(`   📋 Total: ${statements.length}`);
    
    if (errorCount === 0) {
      console.log("\n🎉 ¡Todos los statements se ejecutaron exitosamente!");
    } else {
      console.log(`\n⚠️  Se completó con ${errorCount} errores:`);
      errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. Statement ${err.index}: ${err.error}`);
        console.log(`      SQL: ${err.sql}...`);
      });
    }
    
  } catch (error) {
    console.error("❌ Error fatal:", error.message);
    Deno.exit(1);
    
  } finally {
    // Cerrar conexión
    try {
      await close();
      console.log("🔌 Conexión cerrada");
    } catch (error) {
      console.error("⚠️  Error cerrando conexión:", error.message);
    }
  }
}

// Función para mostrar ayuda
function showHelp() {
  console.log("🚀 Ejecutor de archivos SQL - DNO-Oracle");
  console.log("========================================");
  console.log("");
  console.log("Uso:");
  console.log("  deno run --allow-net --allow-read --allow-env --allow-ffi scripts/sql-executor.js <archivo.sql>");
  console.log("");
  console.log("Ejemplos:");
  console.log("  deno run --allow-net --allow-read --allow-env --allow-ffi scripts/sql-executor.js scripts/create-logs-table.sql");
  console.log("  deno run --allow-net --allow-read --allow-env --allow-ffi scripts/sql-executor.js mi-script.sql");
  console.log("");
  console.log("Características:");
  console.log("  ✅ Usa la librería DNO-Oracle nativa");
  console.log("  ✅ Procesa procedimientos almacenados");
  console.log("  ✅ Maneja comentarios y statements múltiples");
  console.log("  ✅ Muestra progreso y resultados");
  console.log("  ✅ Continúa en caso de errores");
  console.log("");
  console.log("Prerrequisitos:");
  console.log("  - Archivo .env configurado");
  console.log("  - Oracle Instant Client instalado");
  console.log("  - Conexión a base de datos Oracle");
}

// Punto de entrada
if (import.meta.main) {
  const args = Deno.args;
  
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    showHelp();
    Deno.exit(0);
  }
  
  const sqlFile = args[0];
  await executeSqlFile(sqlFile);
}
