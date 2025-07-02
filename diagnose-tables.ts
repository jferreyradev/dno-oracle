/**
 * Script para verificar la estructura real de las tablas
 */

import { querySQL } from './src/db-improved.js';

async function verificarTablas() {
  console.log('🔍 Verificando estructura de tablas...\n');

  const tablas = [
    'WORKFLOW.PROC_CAB',
    'USERS',
    'SYSTEM_LOGS'
  ];

  for (const tabla of tablas) {
    console.log(`📋 Tabla: ${tabla}`);
    console.log('─'.repeat(50));
    
    try {
      // Consultar estructura de la tabla
      const columnas = await querySQL(`
        SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE, DATA_DEFAULT
        FROM USER_TAB_COLUMNS 
        WHERE TABLE_NAME = UPPER('${tabla.split('.').pop()}')
        ORDER BY COLUMN_ID
      `);

      if (columnas.length === 0) {
        console.log('❌ Tabla no encontrada o sin acceso');
      } else {
        console.log('✅ Columnas encontradas:');
        columnas.forEach(col => {
          console.log(`   ${col.COLUMN_NAME} (${col.DATA_TYPE}${col.DATA_LENGTH ? `(${col.DATA_LENGTH})` : ''}) ${col.NULLABLE === 'Y' ? 'NULL' : 'NOT NULL'}`);
        });
      }
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    console.log('');
  }

  // Verificar si las tablas existen
  console.log('🔍 Verificando existencia de tablas...\n');
  
  for (const tabla of tablas) {
    try {
      const resultado = await querySQL(`SELECT COUNT(*) as total FROM ${tabla} WHERE ROWNUM <= 1`);
      console.log(`✅ ${tabla}: Accesible (${resultado[0].TOTAL >= 0 ? 'con datos' : 'vacía'})`);
    } catch (error) {
      console.log(`❌ ${tabla}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log('\n🎯 Diagnóstico completado');
}

// Ejecutar diagnóstico
if (import.meta.main) {
  try {
    await verificarTablas();
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
  Deno.exit(0);
}
