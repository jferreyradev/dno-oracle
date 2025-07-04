/**
 * Script de ejemplo para probar la importación de archivos CSV
 */

// Datos de ejemplo en formato CSV
const csvData = `DESCRIPCION,OBSERVACIONES,MOSTRAR
Proceso de Importación Test,Observaciones del proceso de prueba,1
Segundo Proceso,Más observaciones para el segundo proceso,0
Tercer Proceso,Observaciones adicionales,1`;

// Configuración de importación
const importConfig = {
  csvContent: csvData,
  tableName: "WORKFLOW.PROC_CAB",
  mappings: [
    {
      fileColumn: "0",
      tableColumn: "DESCRIPCION"
    },
    {
      fileColumn: "1", 
      tableColumn: "OBSERVACIONES"
    },
    {
      fileColumn: "2",
      tableColumn: "MOSTRAR",
      transform: "(value) => parseInt(value)"
    }
  ],
  options: {
    skipFirstRow: true,
    batchSize: 1000,
    validateOnly: false,
    truncateTable: false,
    continueOnError: true,
    delimiter: ",",
    encoding: "utf-8"
  }
};

// Función para probar la importación
async function testFileImport() {
  const baseUrl = "http://localhost:8000";
  
  try {
    console.log("🚀 Iniciando prueba de importación de archivos...\n");
    
    // 1. Parsear headers
    console.log("📋 1. Parseando headers del CSV...");
    const headersResponse = await fetch(`${baseUrl}/api/import/headers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        csvContent: csvData,
        delimiter: ","
      })
    });
    
    const headersResult = await headersResponse.json();
    console.log("Headers encontrados:", headersResult.data.headers);
    console.log("✅ Headers parseados correctamente\n");
    
    // 2. Obtener columnas de tabla
    console.log("🏛️ 2. Obteniendo columnas de la tabla...");
    const columnsResponse = await fetch(`${baseUrl}/api/import/columns/WORKFLOW.PROC_CAB`);
    const columnsResult = await columnsResponse.json();
    console.log("Columnas disponibles:", columnsResult.data.map((c: {name: string}) => c.name));
    console.log("✅ Columnas obtenidas correctamente\n");
    
    // 3. Generar mapping automático
    console.log("🔗 3. Generando mapping automático...");
    const mappingResponse = await fetch(`${baseUrl}/api/import/mapping`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        csvHeaders: headersResult.data.headers,
        tableName: "WORKFLOW.PROC_CAB"
      })
    });
    
    const mappingResult = await mappingResponse.json();
    console.log("Mapping generado:", mappingResult.data.mappings);
    console.log(`✅ Mapping generado: ${mappingResult.data.matched} de ${mappingResult.data.total} columnas\n`);
    
    // 4. Validar datos antes de importar
    console.log("🔍 4. Validando datos antes de importar...");
    const validationResponse = await fetch(`${baseUrl}/api/import/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        csvContent: csvData,
        tableName: "WORKFLOW.PROC_CAB",
        mappings: importConfig.mappings,
        options: {
          skipFirstRow: true,
          delimiter: ","
        }
      })
    });
    
    const validationResult = await validationResponse.json();
    console.log("Resultado de validación:", validationResult.success ? "✅ Válido" : "❌ Con errores");
    
    if (!validationResult.success) {
      console.log("Errores encontrados:", validationResult.data.errors);
      console.log("❌ Validación falló, no se procederá con la importación\n");
      return;
    }
    
    console.log(`✅ Validación exitosa: ${validationResult.data.totalRows} filas válidas\n`);
    
    // 5. Importar datos
    console.log("📥 5. Importando datos...");
    const importResponse = await fetch(`${baseUrl}/api/import/csv`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(importConfig)
    });
    
    const importResult = await importResponse.json();
    console.log("Resultado de importación:", importResult.success ? "✅ Exitoso" : "❌ Con errores");
    
    if (importResult.success) {
      console.log(`📊 Resumen de importación:`);
      console.log(`   - Total filas: ${importResult.data.totalRows}`);
      console.log(`   - Filas insertadas: ${importResult.data.summary.inserted}`);
      console.log(`   - Filas fallidas: ${importResult.data.summary.failed}`);
      console.log(`   - Filas procesadas: ${importResult.data.processedRows}`);
      console.log("✅ Importación completada exitosamente\n");
    } else {
      console.log("❌ Errores en importación:", importResult.data.errors);
    }
    
    // 6. Obtener información del sistema
    console.log("ℹ️ 6. Obteniendo información del sistema...");
    const infoResponse = await fetch(`${baseUrl}/api/import/info`);
    const infoResult = await infoResponse.json();
    console.log("Formatos soportados:", infoResult.data.supportedFormats);
    console.log("Funcionalidades:", Object.keys(infoResult.data.features));
    console.log("✅ Información obtenida correctamente\n");
    
    console.log("🎉 ¡Prueba de importación completada exitosamente!");
    
  } catch (error) {
    console.error("❌ Error en la prueba:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : String(error));
  }
}

// Función para verificar el estado del servidor
async function checkServerStatus() {
  try {
    const response = await fetch("http://localhost:8000/api/health");
    const result = await response.json();
    
    if (result.status === "ok") {
      console.log("✅ Servidor activo y funcionando");
      return true;
    } else {
      console.log("❌ Servidor no disponible");
      return false;
    }
  } catch (error) {
    console.log("❌ Error conectando al servidor:", error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Función principal
async function main() {
  console.log("🔧 Script de Prueba de Importación de Archivos");
  console.log("=" .repeat(50));
  
  // Verificar estado del servidor
  console.log("🌐 Verificando estado del servidor...");
  const serverActive = await checkServerStatus();
  
  if (!serverActive) {
    console.log("\n❌ El servidor no está disponible.");
    console.log("💡 Asegúrate de que el servidor esté ejecutándose:");
    console.log("   deno run --allow-all api/server-enhanced.ts");
    return;
  }
  
  console.log("=" .repeat(50));
  
  // Ejecutar prueba
  await testFileImport();
}

// Ejecutar si es el módulo principal
if (import.meta.main) {
  await main();
}

export { testFileImport, checkServerStatus };
