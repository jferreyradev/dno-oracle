/**
 * Controlador para gestión de logs del sistema
 */

import { querySQL, executeSQL, paginate, callProcedure } from "../../src/db-improved.js";

class LogController {
  
  /**
   * Obtener logs con filtros y paginación
   */
  async getLogs(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const level = url.searchParams.get("level") || "";
      const module = url.searchParams.get("module") || "";
      const dateFrom = url.searchParams.get("dateFrom") || "";
      const dateTo = url.searchParams.get("dateTo") || "";
      const userId = url.searchParams.get("userId") || "";
      const search = url.searchParams.get("search") || "";
      
      let sql = `
        SELECT 
          l.log_id,
          l.log_level,
          l.module,
          l.message,
          l.user_id,
          u.username,
          u.full_name as user_name,
          l.ip_address,
          l.user_agent,
          l.response_status,
          l.execution_time_ms,
          l.created_at
        FROM system_logs l
        LEFT JOIN users u ON l.user_id = u.user_id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      if (level) {
        sql += ` AND l.log_level = UPPER(:level)`;
        params.push(level);
      }
      
      if (module) {
        sql += ` AND UPPER(l.module) LIKE UPPER(:module)`;
        params.push(`%${module}%`);
      }
      
      if (dateFrom) {
        sql += ` AND l.created_at >= TO_DATE(:dateFrom, 'YYYY-MM-DD')`;
        params.push(dateFrom);
      }
      
      if (dateTo) {
        sql += ` AND l.created_at <= TO_DATE(:dateTo, 'YYYY-MM-DD') + INTERVAL '1' DAY`;
        params.push(dateTo);
      }
      
      if (userId) {
        sql += ` AND l.user_id = :userId`;
        params.push(parseInt(userId));
      }
      
      if (search) {
        sql += ` AND (
          UPPER(l.message) LIKE UPPER(:search) 
          OR UPPER(l.module) LIKE UPPER(:search)
          OR UPPER(u.username) LIKE UPPER(:search)
        )`;
        params.push(`%${search}%`);
      }
      
      sql += ` ORDER BY l.created_at DESC`;
      
      const result = await paginate(sql, params, page, limit);
      
      return new Response(JSON.stringify({
        success: true,
        data: result.data,
        pagination: result.pagination,
        filters: {
          level,
          module,
          dateFrom,
          dateTo,
          userId,
          search
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      
    } catch (error) {
      console.error("Error en getLogs:", error);
      return new Response(JSON.stringify({
        success: false,
        error: "Error al obtener logs",
        details: error.message
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  
  /**
   * Crear nuevo log
   */
  async createLog(request: Request): Promise<Response> {
    try {
      const body = await request.json();
      
      // Validar campos requeridos
      if (!body.level || !body.module || !body.message) {
        return new Response(JSON.stringify({
          success: false,
          error: "Los campos level, module y message son requeridos"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // Usar el procedimiento almacenado
      await callProcedure("create_log", {
        p_level: body.level,
        p_module: body.module,
        p_message: body.message,
        p_user_id: body.userId || null,
        p_ip_address: body.ipAddress || request.headers.get("x-forwarded-for") || "unknown",
        p_response_status: body.responseStatus || null,
        p_execution_time: body.executionTime || null
      });
      
      return new Response(JSON.stringify({
        success: true,
        message: "Log creado exitosamente"
      }), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      });
      
    } catch (error) {
      console.error("Error en createLog:", error);
      return new Response(JSON.stringify({
        success: false,
        error: "Error al crear log",
        details: error.message
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  
  /**
   * Obtener log por ID
   */
  async getLogById(id: string): Promise<Response> {
    try {
      if (!id || isNaN(Number(id))) {
        return new Response(JSON.stringify({
          success: false,
          error: "ID de log inválido"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const sql = `
        SELECT 
          l.log_id,
          l.log_level,
          l.module,
          l.message,
          l.user_id,
          u.username,
          u.full_name as user_name,
          l.ip_address,
          l.user_agent,
          l.request_data,
          l.response_status,
          l.execution_time_ms,
          l.created_at
        FROM system_logs l
        LEFT JOIN users u ON l.user_id = u.user_id
        WHERE l.log_id = :id
      `;
      
      const result = await querySQL(sql, [Number(id)]);
      
      if (!result || result.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: "Log no encontrado"
        }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      return new Response(JSON.stringify({
        success: true,
        data: result[0]
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      
    } catch (error) {
      console.error("Error en getLogById:", error);
      return new Response(JSON.stringify({
        success: false,
        error: "Error al obtener log",
        details: error.message
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  
  /**
   * Obtener estadísticas de logs
   */
  async getLogStats(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const date = url.searchParams.get("date") || new Date().toISOString().split('T')[0];
      
      // Estadísticas por nivel
      const statsByLevel = await querySQL(`
        SELECT 
          log_level,
          COUNT(*) as count,
          ROUND(AVG(execution_time_ms), 2) as avg_execution_time,
          MAX(execution_time_ms) as max_execution_time,
          MIN(created_at) as first_log,
          MAX(created_at) as last_log
        FROM system_logs
        WHERE created_date = TO_DATE(:date, 'YYYY-MM-DD')
        GROUP BY log_level
        ORDER BY 
          CASE log_level
            WHEN 'FATAL' THEN 1
            WHEN 'ERROR' THEN 2  
            WHEN 'WARN' THEN 3
            WHEN 'INFO' THEN 4
            WHEN 'DEBUG' THEN 5
          END
      `, [date]);
      
      // Estadísticas por módulo
      const statsByModule = await querySQL(`
        SELECT 
          module,
          COUNT(*) as count,
          ROUND(AVG(execution_time_ms), 2) as avg_execution_time
        FROM system_logs
        WHERE created_date = TO_DATE(:date, 'YYYY-MM-DD')
        GROUP BY module
        ORDER BY count DESC
        FETCH FIRST 10 ROWS ONLY
      `, [date]);
      
      // Total general
      const totalStats = await querySQL(`
        SELECT 
          COUNT(*) as total_logs,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT module) as unique_modules,
          ROUND(AVG(execution_time_ms), 2) as avg_execution_time,
          MIN(created_at) as first_log_time,
          MAX(created_at) as last_log_time
        FROM system_logs
        WHERE created_date = TO_DATE(:date, 'YYYY-MM-DD')
      `, [date]);
      
      return new Response(JSON.stringify({
        success: true,
        date: date,
        data: {
          byLevel: statsByLevel,
          byModule: statsByModule,
          total: totalStats[0] || {}
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      
    } catch (error) {
      console.error("Error en getLogStats:", error);
      return new Response(JSON.stringify({
        success: false,
        error: "Error al obtener estadísticas",
        details: error.message
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  
  /**
   * Eliminar logs antiguos
   */
  async cleanupLogs(request: Request): Promise<Response> {
    try {
      const body = await request.json();
      const daysToKeep = body.daysToKeep || 30;
      
      if (daysToKeep < 1 || daysToKeep > 365) {
        return new Response(JSON.stringify({
          success: false,
          error: "Los días a mantener deben estar entre 1 y 365"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const sql = `
        DELETE FROM system_logs 
        WHERE created_at < CURRENT_TIMESTAMP - INTERVAL ':days' DAY
      `;
      
      const result = await executeSQL(sql, [daysToKeep]);
      
      return new Response(JSON.stringify({
        success: true,
        message: `Limpieza completada. ${result.rowsAffected || 0} logs eliminados`,
        daysToKeep: daysToKeep
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
      
    } catch (error) {
      console.error("Error en cleanupLogs:", error);
      return new Response(JSON.stringify({
        success: false,
        error: "Error al limpiar logs",
        details: error.message
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
}

export const logController = new LogController();
