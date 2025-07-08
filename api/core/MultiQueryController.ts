/**
 * MultiQueryController - Controlador para ejecutar consultas SQL directas con soporte multi-conexión
 */

import type { Context } from 'https://deno.land/x/oak@v12.6.1/mod.ts';
import { multiDatabaseService, querySQL, executeSQL } from './MultiDatabaseService.ts';

export interface MultiQueryRequest {
  sql: string;
  params?: Record<string, unknown>;
  connectionName?: string;  // Nombre específico de conexión
  options?: {
    maxRows?: number;
    outFormat?: string;
    autoCommit?: boolean;
  };
}

export interface MultiQueryResponse {
  success: boolean;
  data?: unknown[];
  metaData?: unknown[];
  rowsAffected?: number;
  executionTime?: number;
  query?: string;
  connectionUsed?: string;
  error?: string;
}

// Interfaz para el resultado de Oracle
interface OracleResult {
  rows?: unknown[];
  metaData?: unknown[];
  rowsAffected?: number;
  lastRowid?: string;
  outBinds?: unknown;
  query?: string;
  binds?: unknown;
  executedAt?: Date;
}

export class MultiQueryController {
  
  constructor() {
    // Asegurar que el servicio multi-conexión esté inicializado
    this.ensureInitialized();
  }

  /**
   * Asegurar que el servicio esté inicializado
   */
  private async ensureInitialized(): Promise<void> {
    try {
      await multiDatabaseService.initialize();
    } catch (error) {
      console.error('❌ Error inicializando MultiDatabaseService:', error);
    }
  }

  /**
   * Determinar qué conexión usar basado en el contexto y la solicitud
   */
  private getConnectionName(ctx: Context, request: MultiQueryRequest): string | undefined {
    // 1. Prioridad: Conexión especificada en la request
    if (request.connectionName) {
      return request.connectionName;
    }

    // 2. Header específico
    const headerConnection = ctx.request.headers.get('X-Database-Connection');
    if (headerConnection) {
      return headerConnection;
    }

    // 3. Query parameter
    const queryConnection = ctx.request.url.searchParams.get('connection');
    if (queryConnection) {
      return queryConnection;
    }

    // 4. Usar conexión por defecto
    return undefined;
  }

  /**
   * Ejecuta una consulta SQL SELECT con soporte multi-conexión
   */
  async executeSelect(ctx: Context, queryRequest: MultiQueryRequest): Promise<MultiQueryResponse> {
    const startTime = Date.now();
    const connectionName = this.getConnectionName(ctx, queryRequest);
    
    try {
      // Validar que sea una consulta SELECT
      const sql = queryRequest.sql.trim().toUpperCase();
      if (!sql.startsWith('SELECT') && !sql.startsWith('WITH')) {
        return {
          success: false,
          error: "Solo se permiten consultas SELECT y WITH",
          executionTime: Date.now() - startTime
        };
      }

      console.log(`🔍 Ejecutando SELECT en conexión: ${connectionName || 'default'}`);
      console.log(`📝 SQL: ${queryRequest.sql.substring(0, 100)}...`);

      // Ejecutar la consulta con conexión específica
      const result = await querySQL(
        queryRequest.sql,
        queryRequest.params || {},
        connectionName
      ) as OracleResult;

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: result.rows || [],
        metaData: result.metaData,
        rowsAffected: result.rowsAffected,
        executionTime,
        query: queryRequest.sql,
        connectionUsed: connectionName || 'default'
      };

    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Error ejecutando consulta';
      
      console.error(`❌ Error en SELECT (conexión: ${connectionName || 'default'}):`, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        executionTime,
        query: queryRequest.sql,
        connectionUsed: connectionName || 'default'
      };
    }
  }

  /**
   * Ejecuta una consulta SQL de modificación (INSERT, UPDATE, DELETE) con soporte multi-conexión
   */
  async executeModification(ctx: Context, queryRequest: MultiQueryRequest): Promise<MultiQueryResponse> {
    const startTime = Date.now();
    const connectionName = this.getConnectionName(ctx, queryRequest);
    
    try {
      // Validar que sea una consulta de modificación
      const sql = queryRequest.sql.trim().toUpperCase();
      const allowedOperations = ['INSERT', 'UPDATE', 'DELETE', 'MERGE'];
      const isValidOperation = allowedOperations.some(op => sql.startsWith(op));
      
      if (!isValidOperation) {
        return {
          success: false,
          error: "Solo se permiten consultas INSERT, UPDATE, DELETE y MERGE",
          executionTime: Date.now() - startTime
        };
      }

      console.log(`✏️  Ejecutando modificación en conexión: ${connectionName || 'default'}`);
      console.log(`📝 SQL: ${queryRequest.sql.substring(0, 100)}...`);

      // Ejecutar la consulta con conexión específica
      const result = await executeSQL(
        queryRequest.sql,
        queryRequest.params || {},
        connectionName
      ) as OracleResult;

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: result.rows || [],
        metaData: result.metaData,
        rowsAffected: result.rowsAffected,
        executionTime,
        query: queryRequest.sql,
        connectionUsed: connectionName || 'default'
      };

    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Error ejecutando consulta';
      
      console.error(`❌ Error en modificación (conexión: ${connectionName || 'default'}):`, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        executionTime,
        query: queryRequest.sql,
        connectionUsed: connectionName || 'default'
      };
    }
  }

  /**
   * Obtener información de conexiones disponibles
   */
  async getConnections(): Promise<MultiQueryResponse> {
    const startTime = Date.now();
    
    try {
      await this.ensureInitialized();
      const connections = await multiDatabaseService.getConnectionsInfo();
      
      return {
        success: true,
        data: connections,
        executionTime: Date.now() - startTime
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error obteniendo conexiones';
      
      return {
        success: false,
        error: errorMessage,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Probar una conexión específica
   */
  async testConnection(ctx: Context, connectionName?: string): Promise<MultiQueryResponse> {
    const startTime = Date.now();
    const finalConnectionName = connectionName || this.getConnectionName(ctx, { sql: '' });
    
    try {
      console.log(`🧪 Probando conexión: ${finalConnectionName || 'default'}`);
      
      // Ejecutar una consulta simple para probar la conexión
      const testQuery = 'SELECT \'Connection test\' as test, SYSDATE as current_time FROM DUAL';
      const result = await querySQL(testQuery, {}, finalConnectionName) as OracleResult;

      return {
        success: true,
        data: result.rows || [],
        metaData: result.metaData,
        executionTime: Date.now() - startTime,
        connectionUsed: finalConnectionName || 'default',
        query: testQuery
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error probando conexión';
      
      console.error(`❌ Error probando conexión ${finalConnectionName || 'default'}:`, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        executionTime: Date.now() - startTime,
        connectionUsed: finalConnectionName || 'default'
      };
    }
  }
}
