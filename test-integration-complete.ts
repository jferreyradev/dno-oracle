/**
 * Test de integración completo para el proyecto DNO-Oracle
 * Incluye todas las funcionalidades: CRUD, Procedimientos, Consultas SQL e Importación
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";

const BASE_URL = "http://localhost:8000";

// Función auxiliar para hacer requests
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  };

  const response = await fetch(url, defaultOptions);
  const data = await response.json();
  
  return { response, data };
}

// Test 1: Health Check
Deno.test("Health Check", async () => {
  const { response, data } = await apiRequest("/api/health");
  
  assertEquals(response.status, 200);
  assertEquals(data.status, "ok");
  assertExists(data.timestamp);
  console.log("✅ Health Check - OK");
});

// Test 2: API Info
Deno.test("API Info", async () => {
  const { response, data } = await apiRequest("/api/info");
  
  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data.features);
  assertEquals(data.data.features.fileImport, true);
  assertEquals(data.data.features.procedures, true);
  
  // Verificar que tiene endpoints de importación
  assertExists(data.data.fileImport);
  assertExists(data.data.fileImport.endpoints);
  assertEquals(data.data.fileImport.endpoints.length, 6);
  
  // Verificar que tiene endpoints de procedimientos
  assertExists(data.data.procedures);
  assertExists(data.data.procedures.endpoints);
  assertEquals(data.data.procedures.endpoints.length, 6);
  
  console.log("✅ API Info - OK");
});

// Test 3: Importación - Info del Sistema
Deno.test("File Import - Info", async () => {
  const { response, data } = await apiRequest("/api/import/info");
  
  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data.supportedFormats);
  assertEquals(data.data.supportedFormats.includes("CSV"), true);
  assertExists(data.data.features);
  assertEquals(data.data.features.validateOnly, true);
  
  console.log("✅ File Import Info - OK");
});

// Test 4: Importación - Columnas de Tabla
Deno.test("File Import - Table Columns", async () => {
  const { response, data } = await apiRequest("/api/import/columns/WORKFLOW.PROC_CAB");
  
  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data);
  assertEquals(Array.isArray(data.data), true);
  
  // Verificar que tiene las columnas esperadas
  const columnNames = data.data.map((col: {name: string}) => col.name);
  assertEquals(columnNames.includes("ID_PROC_CAB"), true);
  assertEquals(columnNames.includes("DESCRIPCION"), true);
  assertEquals(columnNames.includes("MOSTRAR"), true);
  
  console.log("✅ File Import Table Columns - OK");
});

// Test 5: Importación - Parse Headers
Deno.test("File Import - Parse Headers", async () => {
  const csvContent = "ID,DESCRIPCION,MOSTRAR\n1,Test,1";
  
  const { response, data } = await apiRequest("/api/import/headers", {
    method: "POST",
    body: JSON.stringify({
      csvContent,
      delimiter: ","
    })
  });
  
  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data.headers);
  assertEquals(data.data.headers.length, 3);
  assertEquals(data.data.headers, ["ID", "DESCRIPCION", "MOSTRAR"]);
  
  console.log("✅ File Import Parse Headers - OK");
});

// Test 6: Importación - Auto Mapping
Deno.test("File Import - Auto Mapping", async () => {
  const csvHeaders = ["ID", "DESCRIPCION", "MOSTRAR"];
  
  const { response, data } = await apiRequest("/api/import/mapping", {
    method: "POST",
    body: JSON.stringify({
      csvHeaders,
      tableName: "WORKFLOW.PROC_CAB"
    })
  });
  
  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data.mappings);
  assertEquals(Array.isArray(data.data.mappings), true);
  assertEquals(data.data.matched > 0, true);
  
  console.log("✅ File Import Auto Mapping - OK");
});

// Test 7: Importación - Validación
Deno.test("File Import - Validation", async () => {
  const csvContent = "DESCRIPCION,MOSTRAR\nTest Process,1\nAnother Process,0";
  const mappings = [
    { fileColumn: "0", tableColumn: "DESCRIPCION" },
    { fileColumn: "1", tableColumn: "MOSTRAR" }
  ];
  
  const { response, data } = await apiRequest("/api/import/validate", {
    method: "POST",
    body: JSON.stringify({
      csvContent,
      tableName: "WORKFLOW.PROC_CAB",
      mappings,
      options: {
        skipFirstRow: true,
        delimiter: ","
      }
    })
  });
  
  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data.isValid);
  assertEquals(data.data.totalRows, 2);
  
  console.log("✅ File Import Validation - OK");
});

// Test 8: Procedimientos - Help
Deno.test("Procedures - Help", async () => {
  const { response, data } = await apiRequest("/api/procedures/help");
  
  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data.endpoints);
  assertExists(data.data.examples);
  
  console.log("✅ Procedures Help - OK");
});

// Test 9: Procedimientos - List
Deno.test("Procedures - List", async () => {
  const { response, data } = await apiRequest("/api/procedures/list");
  
  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data);
  
  console.log("✅ Procedures List - OK");
});

// Test 10: Entidades CRUD - Listar
Deno.test("Entities - List proc_cab", async () => {
  const { response, data } = await apiRequest("/api/proc_cab");
  
  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data);
  
  console.log("✅ Entities List - OK");
});

// Test 11: Cache Stats
Deno.test("Cache - Stats", async () => {
  const { response, data } = await apiRequest("/api/cache/stats");
  
  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data);
  
  console.log("✅ Cache Stats - OK");
});

// Test 12: Consultas SQL - Info
Deno.test("SQL Queries - Info", async () => {
  const { response, data } = await apiRequest("/api/query/info");
  
  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertExists(data.data.endpoints);
  
  console.log("✅ SQL Queries Info - OK");
});

// Función para ejecutar todos los tests
async function runAllTests() {
  console.log("🧪 Ejecutando Suite Completa de Tests de Integración");
  console.log("=" .repeat(60));
  
  try {
    // Verificar que el servidor esté activo
    console.log("🌐 Verificando conexión al servidor...");
    const healthCheck = await apiRequest("/api/health");
    
    if (healthCheck.response.status !== 200) {
      throw new Error("Servidor no disponible");
    }
    
    console.log("✅ Servidor activo y funcionando");
    console.log("=" .repeat(60));
    
    // Los tests individuales se ejecutarán automáticamente por Deno
    console.log("📋 Tests completados. Ver resultados arriba.");
    
  } catch (error) {
    console.error("❌ Error en tests:", error);
    throw error;
  }
}

// Ejecutar si es el módulo principal
if (import.meta.main) {
  await runAllTests();
}
