/**
 * Router principal de la API
 */

import { addCorsHeaders } from "../middleware/cors.ts";
import { healthController } from "../controllers/healthController.ts";
import { userController } from "../controllers/userController.ts";
import { queryController } from "../controllers/queryController.ts";
import { logController } from "../controllers/logController.ts";

export async function router(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  let response: Response;

  try {
    // Rutas de la API
    if (path === "/api/health" && method === "GET") {
      response = await healthController.getHealth();
    } else if (path === "/api/users" && method === "GET") {
      response = await userController.getUsers(request);
    } else if (path === "/api/users" && method === "POST") {
      response = await userController.createUser(request);
    } else if (path.startsWith("/api/users/") && method === "GET") {
      const id = path.split("/")[3];
      response = await userController.getUserById(id);
    } else if (path.startsWith("/api/users/") && method === "PUT") {
      const id = path.split("/")[3];
      response = await userController.updateUser(id, request);
    } else if (path.startsWith("/api/users/") && method === "DELETE") {
      const id = path.split("/")[3];
      response = await userController.deleteUser(id);
    } else if (path === "/api/execute" && method === "POST") {
      response = await queryController.executeQuery(request);
    } else if (path === "/api/procedure" && method === "POST") {
      response = await queryController.executeProcedure(request);
    } else if (path === "/api/transaction" && method === "POST") {
      response = await queryController.executeTransaction(request);
    } else if (path === "/api/schema" && method === "GET") {
      response = await queryController.getTableSchema(request);
    } else if (path === "/api/tables" && method === "GET") {
      response = await queryController.getTables(request);
      
    } else if (path === "/api/logs" && method === "GET") {
      response = await logController.getLogs(request);
      
    } else if (path === "/api/logs" && method === "POST") {
      response = await logController.createLog(request);
      
    } else if (path.startsWith("/api/logs/") && method === "GET") {
      const id = path.split("/")[3];
      response = await logController.getLogById(id);
      
    } else if (path === "/api/logs/stats" && method === "GET") {
      response = await logController.getLogStats(request);
      
    } else if (path === "/api/logs/cleanup" && method === "POST") {
      response = await logController.cleanupLogs(request);
    } else if (path === "/" || path === "/api") {
      // Página de inicio
      response = new Response(
        JSON.stringify({
          name: "DNO-Oracle API",
          version: "1.0.0",
          description: "API REST para Oracle Database con Deno",
          endpoints: {
            "GET /api/health": "Estado de la API",
            "GET /api/users": "Obtener usuarios",
            "POST /api/users": "Crear usuario",
            "GET /api/users/:id": "Obtener usuario por ID",
            "PUT /api/users/:id": "Actualizar usuario",
            "DELETE /api/users/:id": "Eliminar usuario",
            "POST /api/execute": "Ejecutar consulta SQL",
            "POST /api/procedure": "Ejecutar procedimiento almacenado",
            "POST /api/transaction": "Ejecutar transacción",
            "GET /api/schema": "Obtener esquema de tabla",
            "GET /api/tables": "Listar tablas disponibles",
            "GET /api/logs": "Obtener logs del sistema",
            "POST /api/logs": "Crear nuevo log",
            "GET /api/logs/:id": "Obtener log por ID",
            "GET /api/logs/stats": "Estadísticas de logs",
            "POST /api/logs/cleanup": "Limpiar logs antiguos",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } else {
      // Ruta no encontrada
      response = new Response(
        JSON.stringify({
          error: true,
          message: "Endpoint no encontrado",
          path: path,
          method: method,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error("Error en router:", error);
    response = new Response(
      JSON.stringify({
        error: true,
        message: "Error interno del servidor",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Agregar headers CORS a la respuesta
  return addCorsHeaders(response);
}
