// Ejemplos de uso de procedimientos almacenados con DNO-Oracle

import { 
  callProcedure, 
  callFunction, 
  callProcedureWithCursor,
  exec,
  checkConn
} from "../src/db-improved.js";

import { oracledb } from "../deps.ts";

console.log("=== Ejemplos de Procedimientos Almacenados ===\n");

// Verificar conexión primero
const isConnected = await checkConn();
if (!isConnected) {
  console.log("❌ No se puede conectar a la base de datos");
  process.exit(1);
}

console.log("✅ Conexión verificada, ejecutando ejemplos...\n");

// ===== EJEMPLO 1: Procedimiento Simple con Parámetros IN =====
console.log("1. 📝 Ejemplo de Procedimiento Simple");
console.log("   Creando procedimiento de ejemplo...");

try {
  // Crear un procedimiento de ejemplo para demostración
  await exec(`
    CREATE OR REPLACE PROCEDURE PROC_EJEMPLO_SIMPLE(
      p_nombre IN VARCHAR2,
      p_mensaje IN VARCHAR2 DEFAULT 'Hola'
    ) AS
    BEGIN
      DBMS_OUTPUT.PUT_LINE(p_mensaje || ' ' || p_nombre);
    END;
  `);
  
  console.log("   ✅ Procedimiento PROC_EJEMPLO_SIMPLE creado");
  
  // Ejecutar el procedimiento
  const resultado1 = await callProcedure('PROC_EJEMPLO_SIMPLE', {
    p_nombre: 'Juan',
    p_mensaje: 'Bienvenido'
  });
  
  console.log("   ✅ Procedimiento ejecutado exitosamente");
  console.log(`   ⏱️  Ejecutado el: ${resultado1.executedAt}`);
  
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// ===== EJEMPLO 2: Procedimiento con Parámetros OUT =====
console.log("\n2. 📤 Ejemplo de Procedimiento con Parámetros OUT");

try {
  // Crear procedimiento con parámetros de salida
  await exec(`
    CREATE OR REPLACE PROCEDURE PROC_CALCULAR(
      p_numero1 IN NUMBER,
      p_numero2 IN NUMBER,
      p_suma OUT NUMBER,
      p_producto OUT NUMBER
    ) AS
    BEGIN
      p_suma := p_numero1 + p_numero2;
      p_producto := p_numero1 * p_numero2;
    END;
  `);
  
  console.log("   ✅ Procedimiento PROC_CALCULAR creado");
  
  // Ejecutar con parámetros OUT
  const resultado2 = await callProcedure('PROC_CALCULAR', {
    p_numero1: 15,
    p_numero2: 3,
    p_suma: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    p_producto: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
  });
  
  console.log("   ✅ Cálculos realizados:");
  console.log(`   ➕ Suma: ${resultado2.outBinds.p_suma}`);
  console.log(`   ✖️  Producto: ${resultado2.outBinds.p_producto}`);
  
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// ===== EJEMPLO 3: Función que Retorna un Valor =====
console.log("\n3. 🔄 Ejemplo de Función con Valor de Retorno");

try {
  // Crear función de ejemplo
  await exec(`
    CREATE OR REPLACE FUNCTION FUNC_SALUDAR(
      p_nombre VARCHAR2
    ) RETURN VARCHAR2 AS
    BEGIN
      RETURN 'Hola, ' || p_nombre || '! Bienvenido al sistema.';
    END;
  `);
  
  console.log("   ✅ Función FUNC_SALUDAR creada");
  
  // Ejecutar la función
  const resultado3 = await callFunction('FUNC_SALUDAR', 
    { p_nombre: 'María' },
    { type: oracledb.STRING, maxSize: 200 }
  );
  
  console.log("   ✅ Función ejecutada:");
  console.log(`   💬 Mensaje: ${resultado3.returnValue}`);
  
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// ===== EJEMPLO 4: Procedimiento con REF CURSOR =====
console.log("\n4. 📊 Ejemplo de Procedimiento con REF CURSOR");

try {
  // Crear procedimiento que retorna cursor
  await exec(`
    CREATE OR REPLACE PROCEDURE PROC_OBTENER_OBJETOS(
      p_tipo IN VARCHAR2 DEFAULT 'TABLE',
      p_cursor OUT SYS_REFCURSOR
    ) AS
    BEGIN
      OPEN p_cursor FOR
        SELECT OBJECT_NAME, OBJECT_TYPE, CREATED, STATUS
        FROM USER_OBJECTS 
        WHERE OBJECT_TYPE = p_tipo
        ORDER BY CREATED DESC;
    END;
  `);
  
  console.log("   ✅ Procedimiento PROC_OBTENER_OBJETOS creado");
  
  // Ejecutar procedimiento con cursor
  const resultado4 = await callProcedureWithCursor('PROC_OBTENER_OBJETOS', {
    p_tipo: 'TABLE'
  });
  
  console.log(`   ✅ Obtenidas ${resultado4.rows.length} tablas:`);
  resultado4.rows.slice(0, 5).forEach((row, index) => {
    console.log(`   ${index + 1}. ${row.OBJECT_NAME} - ${row.STATUS} (${row.CREATED})`);
  });
  
  if (resultado4.rows.length > 5) {
    console.log(`   ... y ${resultado4.rows.length - 5} más`);
  }
  
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// ===== EJEMPLO 5: Procedimiento con Parámetros IN_OUT =====
console.log("\n5. 🔄 Ejemplo de Procedimiento con Parámetros IN_OUT");

try {
  // Crear procedimiento con parámetros IN_OUT
  await exec(`
    CREATE OR REPLACE PROCEDURE PROC_PROCESAR_TEXTO(
      p_texto IN OUT VARCHAR2,
      p_operacion IN VARCHAR2 DEFAULT 'UPPER'
    ) AS
      v_temp VARCHAR2(4000);
    BEGIN
      CASE p_operacion
        WHEN 'UPPER' THEN
          p_texto := UPPER(p_texto);
        WHEN 'LOWER' THEN
          p_texto := LOWER(p_texto);
        WHEN 'REVERSE' THEN
          -- Implementar reverse manualmente
          v_temp := '';
          FOR i IN REVERSE 1..LENGTH(p_texto) LOOP
            v_temp := v_temp || SUBSTR(p_texto, i, 1);
          END LOOP;
          p_texto := v_temp;
        ELSE
          p_texto := 'Operación no válida: ' || p_operacion;
      END CASE;
    END;
  `);
  
  console.log("   ✅ Procedimiento PROC_PROCESAR_TEXTO creado");
  
  // Ejecutar con parámetro IN_OUT
  const resultado5 = await callProcedure('PROC_PROCESAR_TEXTO', {
    p_texto: { 
      val: 'Hola Mundo Oracle', 
      dir: oracledb.BIND_INOUT, 
      type: oracledb.STRING, 
      maxSize: 200 
    },
    p_operacion: 'REVERSE'
  });
  
  console.log("   ✅ Texto procesado:");
  console.log(`   📝 Resultado: ${resultado5.outBinds.p_texto}`);
  
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// ===== EJEMPLO 6: Procedimiento con Manejo de Errores =====
console.log("\n6. ⚠️  Ejemplo de Manejo de Errores en Procedimientos");

try {
  // Crear procedimiento que puede generar error
  await exec(`
    CREATE OR REPLACE PROCEDURE PROC_DIVIDIR(
      p_dividendo IN NUMBER,
      p_divisor IN NUMBER,
      p_resultado OUT NUMBER
    ) AS
    BEGIN
      IF p_divisor = 0 THEN
        RAISE_APPLICATION_ERROR(-20001, 'División por cero no permitida');
      END IF;
      
      p_resultado := p_dividendo / p_divisor;
    END;
  `);
  
  console.log("   ✅ Procedimiento PROC_DIVIDIR creado");
  
  // Intentar división válida
  console.log("   🧮 División válida: 100 / 4");
  const divisionValida = await callProcedure('PROC_DIVIDIR', {
    p_dividendo: 100,
    p_divisor: 4,
    p_resultado: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
  });
  console.log(`   ✅ Resultado: ${divisionValida.outBinds.p_resultado}`);
  
  // Intentar división por cero (debe generar error)
  console.log("   🧮 División por cero: 100 / 0");
  try {
    await callProcedure('PROC_DIVIDIR', {
      p_dividendo: 100,
      p_divisor: 0,
      p_resultado: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    });
  } catch (divisionError) {
    console.log(`   ✅ Error capturado correctamente: ${divisionError.message}`);
  }
  
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

console.log("\n=== Resumen de Funcionalidades ===");
console.log("✅ callProcedure() - Ejecutar procedimientos almacenados");
console.log("✅ callFunction() - Ejecutar funciones con valor de retorno");
console.log("✅ callProcedureWithCursor() - Procedimientos que retornan cursores");
console.log("✅ Soporte para parámetros IN, OUT, IN_OUT");
console.log("✅ Manejo robusto de errores");
console.log("✅ Tipos de datos Oracle (NUMBER, STRING, DATE, etc.)");
console.log("✅ REF CURSOR para conjuntos de resultados grandes");

console.log("\n=== Tipos de Parámetros Soportados ===");
console.log("📥 IN - Parámetros de entrada");
console.log("📤 OUT - Parámetros de salida");
console.log("🔄 IN_OUT - Parámetros de entrada y salida");
console.log("📊 CURSOR - Cursores de resultado");
console.log("🔢 NUMBER - Números");
console.log("📝 STRING - Cadenas de texto");
console.log("📅 DATE - Fechas");
console.log("💾 CLOB/BLOB - Objetos grandes");
