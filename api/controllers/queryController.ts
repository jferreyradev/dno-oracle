/**
 * Controlador para ejecutar consultas SQL y procedimientos almacenados
 */

import {
  callFunction,
  callProcedure,
  callProcedureWithCursor,
  executeSQL,
  executeTransaction,
  querySQL,
} from "../../src/db-improved.js";

class QueryController {
  /**
   * Ejecutar consulta SQL personalizada
   */
  async executeQuery(request: Request): Promise<Response> {
    try {
      const body = await request.json();

      if (!body.sql || typeof body.sql !== "string") {
        return new Response(
          JSON.stringify({
            success: false,
            error: "La consulta SQL es requerida",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Validar que solo sean consultas SELECT por seguridad
      const sqlTrimmed = body.sql.trim().toLowerCase();
      if (!sqlTrimmed.startsWith("select")) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Solo se permiten consultas SELECT por seguridad",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const binds = body.binds || [];
      const result = await querySQL(body.sql, binds);

      return new Response(
        JSON.stringify({
          success: true,
          data: result,
          rowCount: result.length,
          executedAt: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error en executeQuery:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error ejecutando consulta SQL",
          details: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  /**
   * Ejecutar procedimiento almacenado
   */
  async executeProcedure(request: Request): Promise<Response> {
    try {
      const body = await request.json();

      if (!body.procedure || typeof body.procedure !== "string") {
        return new Response(
          JSON.stringify({
            success: false,
            error: "El nombre del procedimiento es requerido",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const binds = body.binds || {};
      const type = body.type || "procedure"; // procedure, function, cursor

      let result;

      switch (type.toLowerCase()) {
        case "function":
          result = await callFunction(body.procedure, binds);
          break;
        case "cursor":
          result = await callProcedureWithCursor(body.procedure, binds);
          break;
        case "procedure":
        default:
          result = await callProcedure(body.procedure, binds);
          break;
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: result,
          procedure: body.procedure,
          type: type,
          executedAt: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error en executeProcedure:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error ejecutando procedimiento almacenado",
          details: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  /**
   * Ejecutar múltiples consultas en transacción
   */
  async executeTransaction(request: Request): Promise<Response> {
    try {
      const body = await request.json();

      if (
        !body.queries || !Array.isArray(body.queries) ||
        body.queries.length === 0
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Se requiere un array de consultas para la transacción",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Validar que todas las consultas sean válidas
      for (let i = 0; i < body.queries.length; i++) {
        const query = body.queries[i];
        if (!query.sql || typeof query.sql !== "string") {
          return new Response(
            JSON.stringify({
              success: false,
              error: `La consulta ${i + 1} no tiene SQL válido`,
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }

      // Preparar las consultas para la transacción
      const queries = body.queries.map((q) => ({
        sql: q.sql,
        binds: q.binds || [],
      }));

      const result = await executeTransaction(queries);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Transacción ejecutada exitosamente",
          results: result,
          queryCount: queries.length,
          executedAt: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error en executeTransaction:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error ejecutando transacción",
          details: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  /**
   * Obtener esquema de una tabla
   */
  async getTableSchema(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const tableName = url.searchParams.get("table");
      const owner = url.searchParams.get("owner") || "USER";

      if (!tableName) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "El nombre de la tabla es requerido",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const sql = `
        SELECT 
          column_name,
          data_type,
          data_length,
          data_precision,
          data_scale,
          nullable,
          default_value,
          column_id
        FROM all_tab_columns 
        WHERE table_name = UPPER(:tableName)
        AND owner = UPPER(:owner)
        ORDER BY column_id
      `;

      const result = await querySQL(sql, [tableName, owner]);

      if (result.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Tabla no encontrada o sin permisos de acceso",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          table: tableName,
          owner: owner,
          columns: result,
          columnCount: result.length,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error en getTableSchema:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error obteniendo esquema de tabla",
          details: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  /**
   * Listar tablas disponibles
   */
  async getTables(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const owner = url.searchParams.get("owner") || "USER";
      const search = url.searchParams.get("search") || "";

      let sql = `
        SELECT 
          table_name,
          owner,
          tablespace_name,
          num_rows,
          blocks,
          avg_row_len,
          last_analyzed
        FROM all_tables 
        WHERE owner = UPPER(:owner)
      `;

      const params: any[] = [owner];

      if (search) {
        sql += ` AND LOWER(table_name) LIKE LOWER(:search)`;
        params.push(`%${search}%`);
      }

      sql += ` ORDER BY table_name`;

      const result = await querySQL(sql, params);

      return new Response(
        JSON.stringify({
          success: true,
          owner: owner,
          tables: result,
          tableCount: result.length,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error en getTables:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error obteniendo lista de tablas",
          details: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }
}

export const queryController = new QueryController();
