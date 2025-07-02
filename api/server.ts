/**
 * Servidor API REST para DNO-Oracle
 * Proporciona endpoints para interactuar con la base de datos Oracle
 */

import { serve } from "../deps.ts";
import { router } from "./routes/index.ts";
import { corsMiddleware } from "./middleware/cors.ts";
import { errorHandler } from "./middleware/errorHandler.ts";
import { logger } from "./middleware/logger.ts";
import { close as closeDB, open as openDB } from "../src/db.js";

// Configuración del servidor
const PORT = Number(Deno.env.get("API_PORT")) || 8000;
const HOST = Deno.env.get("API_HOST") || "localhost";

console.log("🚀 Iniciando servidor API DNO-Oracle...");

// Inicializar conexión a la base de datos
try {
  await openDB();
  console.log("✅ Conexión a Oracle Database establecida");
} catch (error) {
  console.error("❌ Error conectando a Oracle:", error.message);
  Deno.exit(1);
}

// Manejar peticiones HTTP
async function handler(request: Request): Promise<Response> {
  try {
    // Aplicar middleware de logging
    logger(request);

    // Aplicar middleware CORS
    const corsResponse = corsMiddleware(request);
    if (corsResponse) return corsResponse;

    // Procesar la petición con el router
    const response = await router(request);

    return response;
  } catch (error) {
    console.error("Error en handler:", error);
    return errorHandler(error);
  }
}

// Iniciar servidor
console.log(`🌐 Servidor corriendo en http://${HOST}:${PORT}`);
console.log("📚 Endpoints disponibles:");
console.log("  GET  /api/health      - Estado de la API");
console.log("  GET  /api/users       - Obtener usuarios");
console.log("  POST /api/users       - Crear usuario");
console.log("  GET  /api/users/:id   - Obtener usuario por ID");
console.log("  PUT  /api/users/:id   - Actualizar usuario");
console.log("  DELETE /api/users/:id - Eliminar usuario");
console.log("  POST /api/execute     - Ejecutar consulta SQL");
console.log("  POST /api/procedure   - Ejecutar procedimiento almacenado");
console.log("  POST /api/transaction - Ejecutar transacción");
console.log("  GET  /api/schema      - Obtener esquema de tabla");
console.log("  GET  /api/tables      - Listar tablas disponibles");
console.log("  GET  /api/logs        - Obtener logs del sistema");
console.log("  POST /api/logs        - Crear nuevo log");
console.log("  GET  /api/logs/:id    - Obtener log por ID");
console.log("  GET  /api/logs/stats  - Estadísticas de logs");
console.log("  POST /api/logs/cleanup - Limpiar logs antiguos");

await serve(handler, { port: PORT, hostname: HOST });

// Manejo de cierre limpio
async function cleanup() {
  console.log("\n🛑 Cerrando servidor...");
  try {
    await closeDB();
    console.log("✅ Conexión a base de datos cerrada");
  } catch (error) {
    console.error("❌ Error cerrando base de datos:", error.message);
  }
}

// Interceptar señales de cierre
try {
  // @ts-ignore - Deno específico
  Deno.addSignalListener?.("SIGINT", cleanup);
  // @ts-ignore - Deno específico
  Deno.addSignalListener?.("SIGTERM", cleanup);
} catch {
  // Ignorar errores si no está en Deno
}
