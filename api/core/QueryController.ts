/**
 * QueryController - Controlador para ejecutar consultas SQL directas
 */

import { exec } from "../../src/db-improved.js";
import { oracledb } from "../../deps.ts";

export interface QueryRequest {
  sql: string;
  params?: Record<string, any>;
  options?: {
    maxRows?: number;
    outFormat?: string;
    autoCommit?: boolean;
  };
}

export interface QueryResponse {
  success: boolean;
  data?: any[];
  metaData?: any[];
  rowsAffected?: number;
  executionTime?: number;
  query?: string;
  error?: string;
}

// Interfaz para el resultado de Oracle
interface OracleResult {
  rows?: any[];
  metaData?: any[];
  rowsAffected?: number;
  lastRowid?: string;
  outBinds?: any;
  query?: string;
  binds?: any;
  executedAt?: Date;
}

export class QueryController {
  /**
   * Ejecuta una consulta SQL SELECT
   */
  async executeSelect(queryRequest: QueryRequest): Promise<QueryResponse> {
    const startTime = Date.now();
    
    try {
      // Validar que sea una consulta SELECT
      const sql = queryRequest.sql.trim().toUpperCase();
      if (!sql.startsWith('SELECT') && !sql.startsWith('WITH')) {
        return {
          success: false,
          error: "Solo se permiten consultas SELECT y WITH"
        };
      }

      // Configurar opciones por defecto
      const options = {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        maxRows: queryRequest.options?.maxRows || 1000,
        autoCommit: false,
        ...queryRequest.options
      };

      // Ejecutar la consulta
      const result = await exec(
        queryRequest.sql,
        queryRequest.params || {},
        options
      ) as OracleResult;

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: result.rows || [],
        metaData: result.metaData,
        rowsAffected: result.rowsAffected,
        executionTime,
        query: queryRequest.sql
      };

    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Error ejecutando consulta';
      
      return {
        success: false,
        error: errorMessage,
        executionTime,
        query: queryRequest.sql
      };
    }
  }

  /**
   * Ejecuta una consulta SQL de modificación (INSERT, UPDATE, DELETE)
   */
  async executeModification(queryRequest: QueryRequest): Promise<QueryResponse> {
    const startTime = Date.now();
    
    try {
      // Validar que sea una consulta de modificación
      const sql = queryRequest.sql.trim().toUpperCase();
      const allowedOperations = ['INSERT', 'UPDATE', 'DELETE', 'MERGE'];
      const isValidOperation = allowedOperations.some(op => sql.startsWith(op));
      
      if (!isValidOperation) {
        return {
          success: false,
          error: "Solo se permiten consultas INSERT, UPDATE, DELETE, MERGE"
        };
      }

      // Configurar opciones por defecto
      const options = {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: queryRequest.options?.autoCommit !== false, // true por defecto para modificaciones
        ...queryRequest.options
      };

      // Ejecutar la consulta
      const result = await exec(
        queryRequest.sql,
        queryRequest.params || {},
        options
      ) as OracleResult;

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: result.rows || [],
        metaData: result.metaData,
        rowsAffected: result.rowsAffected,
        executionTime,
        query: queryRequest.sql
      };

    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Error ejecutando consulta';
      
      return {
        success: false,
        error: errorMessage,
        executionTime,
        query: queryRequest.sql
      };
    }
  }

  /**
   * Ejecuta una consulta preparada con explicación del plan de ejecución
   */
  async explainQuery(queryRequest: QueryRequest): Promise<QueryResponse> {
    const startTime = Date.now();
    
    try {
      // Validar que sea una consulta SELECT
      const sql = queryRequest.sql.trim().toUpperCase();
      if (!sql.startsWith('SELECT') && !sql.startsWith('WITH')) {
        return {
          success: false,
          error: "Solo se puede explicar consultas SELECT y WITH"
        };
      }

      // Crear consulta EXPLAIN PLAN
      const explainSql = `EXPLAIN PLAN FOR ${queryRequest.sql}`;
      
      // Ejecutar EXPLAIN PLAN
      await exec(explainSql, queryRequest.params || {}) as OracleResult;
      
      // Obtener el plan de ejecución
      const planResult = await exec(`
        SELECT operation, options, object_name, object_type, cost, cardinality, bytes, 
               cpu_cost, io_cost, time, level
        FROM plan_table 
        WHERE statement_id IS NULL
        ORDER BY id
      `) as OracleResult;

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: planResult.rows || [],
        metaData: planResult.metaData,
        executionTime,
        query: queryRequest.sql
      };

    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Error obteniendo plan de ejecución';
      
      return {
        success: false,
        error: errorMessage,
        executionTime,
        query: queryRequest.sql
      };
    }
  }

  /**
   * Valida la sintaxis de una consulta SQL sin ejecutarla
   */
  async validateQuery(queryRequest: QueryRequest): Promise<QueryResponse> {
    const startTime = Date.now();
    
    try {
      // Validaciones básicas de sintaxis
      const sql = queryRequest.sql.trim();
      
      if (!sql) {
        return {
          success: false,
          error: "La consulta no puede estar vacía"
        };
      }

      // Verificar que no contenga múltiples statements
      if (sql.includes(';') && sql.lastIndexOf(';') < sql.length - 1) {
        return {
          success: false,
          error: "No se permiten múltiples statements en una consulta"
        };
      }

      // Verificar que no contengan comandos peligrosos
      const dangerousCommands = ['DROP', 'TRUNCATE', 'ALTER', 'CREATE', 'GRANT', 'REVOKE'];
      const upperSql = sql.toUpperCase();
      
      for (const cmd of dangerousCommands) {
        if (upperSql.includes(cmd)) {
          return {
            success: false,
            error: `Comando no permitido: ${cmd}`
          };
        }
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: [{ message: "Consulta válida" }],
        executionTime,
        query: queryRequest.sql
      };

    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Error validando consulta';
      
      return {
        success: false,
        error: errorMessage,
        executionTime,
        query: queryRequest.sql
      };
    }
  }

  /**
   * Obtiene estadísticas de una tabla
   */
  async getTableStats(tableName: string): Promise<QueryResponse> {
    const startTime = Date.now();
    
    try {
      const sql = `
        SELECT 
          table_name,
          num_rows,
          blocks,
          empty_blocks,
          avg_space,
          chain_cnt,
          avg_row_len,
          sample_size,
          last_analyzed
        FROM user_tables 
        WHERE table_name = UPPER(:tableName)
      `;

      const result = await exec(sql, { tableName }) as OracleResult;
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: result.rows || [],
        metaData: result.metaData,
        executionTime,
        query: sql
      };

    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Error obteniendo estadísticas de tabla';
      
      return {
        success: false,
        error: errorMessage,
        executionTime
      };
    }
  }
}
