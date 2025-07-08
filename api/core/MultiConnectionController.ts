/**
 * MultiConnectionController - Controlador con soporte para múltiples conexiones
 * Utiliza composición en lugar de herencia para evitar problemas de acceso
 */

import type { Context } from 'https://deno.land/x/oak@v12.6.1/mod.ts';
import type { EntityConfig } from './EntityConfig.ts';
import { SqlBuilder, type SearchOptions } from './SqlBuilder.ts';
import { DataValidator } from './DataValidator.ts';
import type { MemoryCache } from './CacheService.ts';
import { querySQL, executeSQL } from './MultiDatabaseService.ts';

export interface MultiConnectionEntityConfig extends EntityConfig {
  defaultConnection?: string;
  allowedConnections?: string[];
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  meta?: {
    cached: boolean;
    executionTime: number;
    connectionUsed?: string;
    user?: string;
  };
}

export class MultiConnectionController {
  private entityName: string;
  private entityConfig: MultiConnectionEntityConfig;
  private sqlBuilder: SqlBuilder;
  private validator: DataValidator;
  private cache?: MemoryCache;

  constructor(
    entityName: string,
    config: MultiConnectionEntityConfig,
    cache?: MemoryCache
  ) {
    this.entityName = entityName;
    this.entityConfig = config;
    this.sqlBuilder = new SqlBuilder(config);
    this.validator = new DataValidator(config);
    this.cache = cache;
  }

  /**
   * Determinar qué conexión usar basado en el contexto y configuración
   */
  private getConnectionName(ctx: Context): string | undefined {
    // 1. Prioridad: Header específico
    const headerConnection = ctx.request.headers.get('X-Database-Connection');
    if (headerConnection && this.isConnectionAllowed(headerConnection)) {
      return headerConnection;
    }

    // 2. Query parameter
    const queryConnection = ctx.request.url.searchParams.get('connection');
    if (queryConnection && this.isConnectionAllowed(queryConnection)) {
      return queryConnection;
    }

    // 3. Configuración de la entidad
    if (this.entityConfig.defaultConnection) {
      return this.entityConfig.defaultConnection;
    }

    // 4. Conexión por defecto del sistema
    return undefined;
  }

  /**
   * Verificar si una conexión está permitida para esta entidad
   */
  private isConnectionAllowed(connectionName: string): boolean {
    if (!this.entityConfig.allowedConnections) {
      return true; // Si no hay restricciones, permitir cualquiera
    }
    return this.entityConfig.allowedConnections.includes(connectionName);
  }

  /**
   * Helper para obtener parámetros del contexto de Oak
   */
  private getParam(ctx: Context, paramName: string): string | undefined {
    return (ctx as unknown as {params: Record<string, string>}).params?.[paramName];
  }

  /**
   * Crear respuesta API estandarizada
   */
  private createResponse<T>(
    success: boolean,
    data?: T,
    message?: string,
    errors?: string[],
    cached = false,
    executionTime = 0,
    connectionUsed?: string
  ): ApiResponse<T> {
    return {
      success,
      data,
      message,
      errors,
      meta: {
        cached,
        executionTime,
        connectionUsed
      }
    };
  }

  /**
   * Verificar permisos básicos (simplificado)
   */
  private hasPermission(_ctx: Context, _operation: string): boolean {
    // Simplificado: permitir todo por ahora, puede expandirse
    return true;
  }

  /**
   * Listar registros con paginación y filtros
   */
  async list(ctx: Context): Promise<void> {
    try {
      if (!this.hasPermission(ctx, 'read')) {
        ctx.response.status = 403;
        ctx.response.body = this.createResponse(false, undefined, 'Sin permisos para leer esta entidad');
        return;
      }

      // Extraer parámetros de paginación y búsqueda
      const page = parseInt(ctx.request.url.searchParams.get('page') || '1');
      const pageSize = parseInt(ctx.request.url.searchParams.get('pageSize') || '20');
      const search = ctx.request.url.searchParams.get('search') || undefined;
      const orderBy = ctx.request.url.searchParams.get('orderBy') || undefined;
      const orderDir = ctx.request.url.searchParams.get('orderDir') as 'ASC' | 'DESC' || 'ASC';

      // Extraer filtros dinámicos
      const filters: Record<string, unknown> = {};
      for (const [key, value] of ctx.request.url.searchParams.entries()) {
        if (!['page', 'pageSize', 'search', 'orderBy', 'orderDir', 'connection'].includes(key)) {
          filters[key] = value;
        }
      }

      const searchOptions: SearchOptions = {
        search,
        filters,
        orderBy,
        orderDir,
        page,
        pageSize
      };

      // Determinar conexión y generar clave de cache
      const connectionName = this.getConnectionName(ctx);
      const cacheKey = `${this.entityName}:list:${JSON.stringify(searchOptions)}:conn:${connectionName}`;
      
      // Verificar cache
      if (this.cache) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          ctx.response.body = {
            ...cached,
            meta: {
              ...(cached as ApiResponse).meta,
              cached: true,
              connectionUsed: connectionName
            }
          };
          return;
        }
      }

      // Construir consultas SQL
      const countQuery = this.sqlBuilder.buildCountQuery(searchOptions);
      const selectQuery = this.sqlBuilder.buildSelectQuery(searchOptions);

      // Ejecutar consultas con conexión específica
      const start = performance.now();
      
      const [countResult, dataResult] = await Promise.all([
        querySQL(countQuery.sql, countQuery.params, connectionName),
        querySQL(selectQuery.sql, selectQuery.params, connectionName)
      ]);

      const executionTime = performance.now() - start;

      const total = countResult.rows && Array.isArray(countResult.rows) && countResult.rows[0] 
        ? (countResult.rows[0] as { COUNT: number }).COUNT : 0;
      const totalPages = Math.ceil(total / pageSize);

      const response = this.createResponse(true, {
        data: Array.isArray(dataResult.rows) ? dataResult.rows : [],
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }, undefined, undefined, false, executionTime, connectionName);

      // Cachear resultado
      if (this.cache) {
        this.cache.set(cacheKey, response);
      }

      ctx.response.body = response;

    } catch (error) {
      console.error('❌ Error en list:', error);
      ctx.response.status = 500;
      ctx.response.body = this.createResponse(
        false,
        undefined,
        'Error interno del servidor',
        [error instanceof Error ? error.message : String(error)]
      );
    }
  }

  /**
   * Obtener registro por ID
   */
  async getById(ctx: Context): Promise<void> {
    try {
      const id = this.getParam(ctx, 'id');
      if (!id) {
        ctx.response.status = 400;
        ctx.response.body = this.createResponse(false, undefined, 'ID requerido');
        return;
      }

      if (!this.hasPermission(ctx, 'read')) {
        ctx.response.status = 403;
        ctx.response.body = this.createResponse(false, undefined, 'Sin permisos para leer esta entidad');
        return;
      }

      // Determinar conexión y generar clave de cache
      const connectionName = this.getConnectionName(ctx);
      const cacheKey = `${this.entityName}:${id}:conn:${connectionName}`;

      // Verificar cache
      if (this.cache) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          ctx.response.body = {
            ...cached,
            meta: {
              ...(cached as ApiResponse).meta,
              cached: true,
              connectionUsed: connectionName
            }
          };
          return;
        }
      }

      // Construir y ejecutar consulta
      const query = this.sqlBuilder.buildSelectByIdQuery(id);
      const start = performance.now();
      
      const result = await querySQL(query.sql, query.params, connectionName);
      const executionTime = performance.now() - start;

      if (!result.rows || !Array.isArray(result.rows) || result.rows.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = this.createResponse(false, undefined, `${this.entityName} no encontrado`);
        return;
      }

      const response = this.createResponse(
        true,
        result.rows[0],
        undefined,
        undefined,
        false,
        executionTime,
        connectionName
      );

      // Cachear resultado
      if (this.cache) {
        this.cache.set(cacheKey, response);
      }

      ctx.response.body = response;

    } catch (error) {
      console.error('❌ Error en getById:', error);
      ctx.response.status = 500;
      ctx.response.body = this.createResponse(
        false,
        undefined,
        'Error interno del servidor',
        [error instanceof Error ? error.message : String(error)]
      );
    }
  }

  /**
   * Crear nuevo registro
   */
  async create(ctx: Context): Promise<void> {
    try {
      if (!this.hasPermission(ctx, 'create')) {
        ctx.response.status = 403;
        ctx.response.body = this.createResponse(false, undefined, 'Sin permisos para crear en esta entidad');
        return;
      }

      const body = await ctx.request.body({ type: 'json' }).value;
      
      // Validar datos
      const validation = this.validator.validate(body, 'create');
      if (!validation.isValid) {
        ctx.response.status = 400;
        ctx.response.body = this.createResponse(false, undefined, 'Datos inválidos', validation.errors);
        return;
      }

      // Construir y ejecutar INSERT
      const query = this.sqlBuilder.buildInsertQuery(validation.data);
      
      const connectionName = this.getConnectionName(ctx);
      const start = performance.now();
      
      const result = await executeSQL(query.sql, query.params, connectionName);
      const executionTime = performance.now() - start;

      const response = this.createResponse(
        true,
        { created: true, rowsAffected: result.rowsAffected || 0 },
        'Registro creado exitosamente',
        undefined,
        false,
        executionTime,
        connectionName
      );

      // Limpiar cache relacionado
      if (this.cache) {
        this.cache.invalidatePattern(`${this.entityName}:list:`);
      }

      ctx.response.status = 201;
      ctx.response.body = response;

    } catch (error) {
      console.error('❌ Error en create:', error);
      ctx.response.status = 500;
      ctx.response.body = this.createResponse(
        false,
        undefined,
        'Error interno del servidor',
        [error instanceof Error ? error.message : String(error)]
      );
    }
  }

  /**
   * Actualizar registro existente
   */
  async update(ctx: Context): Promise<void> {
    try {
      const id = this.getParam(ctx, 'id');
      if (!id) {
        ctx.response.status = 400;
        ctx.response.body = this.createResponse(false, undefined, 'ID requerido');
        return;
      }

      if (!this.hasPermission(ctx, 'update')) {
        ctx.response.status = 403;
        ctx.response.body = this.createResponse(false, undefined, 'Sin permisos para actualizar esta entidad');
        return;
      }

      const body = await ctx.request.body({ type: 'json' }).value;

      // Validar datos
      const validation = this.validator.validate(body, 'update');
      if (!validation.isValid) {
        ctx.response.status = 400;
        ctx.response.body = this.createResponse(false, undefined, 'Datos inválidos', validation.errors);
        return;
      }

      // Construir y ejecutar UPDATE
      const query = this.sqlBuilder.buildUpdateQuery(id, validation.data);
      
      const connectionName = this.getConnectionName(ctx);
      const start = performance.now();
      
      const result = await executeSQL(query.sql, query.params, connectionName);
      const executionTime = performance.now() - start;

      if ((result.rowsAffected || 0) === 0) {
        ctx.response.status = 404;
        ctx.response.body = this.createResponse(false, undefined, `${this.entityName} no encontrado`);
        return;
      }

      const response = this.createResponse(
        true,
        { updated: true, rowsAffected: result.rowsAffected || 0 },
        'Registro actualizado exitosamente',
        undefined,
        false,
        executionTime,
        connectionName
      );

      // Limpiar cache relacionado
      if (this.cache) {
        this.cache.invalidatePattern(`${this.entityName}:`);
      }

      ctx.response.body = response;

    } catch (error) {
      console.error('❌ Error en update:', error);
      ctx.response.status = 500;
      ctx.response.body = this.createResponse(
        false,
        undefined,
        'Error interno del servidor',
        [error instanceof Error ? error.message : String(error)]
      );
    }
  }

  /**
   * Eliminar registro
   */
  async delete(ctx: Context): Promise<void> {
    try {
      const id = this.getParam(ctx, 'id');
      if (!id) {
        ctx.response.status = 400;
        ctx.response.body = this.createResponse(false, undefined, 'ID requerido');
        return;
      }

      if (!this.hasPermission(ctx, 'delete')) {
        ctx.response.status = 403;
        ctx.response.body = this.createResponse(false, undefined, 'Sin permisos para eliminar en esta entidad');
        return;
      }

      // Construir y ejecutar DELETE
      const query = this.sqlBuilder.buildDeleteQuery(id);
      const connectionName = this.getConnectionName(ctx);
      const start = performance.now();
      
      const result = await executeSQL(query.sql, query.params, connectionName);
      const executionTime = performance.now() - start;

      if ((result.rowsAffected || 0) === 0) {
        ctx.response.status = 404;
        ctx.response.body = this.createResponse(false, undefined, `${this.entityName} no encontrado`);
        return;
      }

      const response = this.createResponse(
        true,
        { deleted: true, rowsAffected: result.rowsAffected || 0 },
        'Registro eliminado exitosamente',
        undefined,
        false,
        executionTime,
        connectionName
      );

      // Limpiar cache relacionado
      if (this.cache) {
        this.cache.invalidatePattern(`${this.entityName}:`);
      }

      ctx.response.body = response;

    } catch (error) {
      console.error('❌ Error en delete:', error);
      ctx.response.status = 500;
      ctx.response.body = this.createResponse(
        false,
        undefined,
        'Error interno del servidor',
        [error instanceof Error ? error.message : String(error)]
      );
    }
  }

  /**
   * Obtener estadísticas de cache para esta entidad
   */
  getCacheStats(ctx: Context): void {
    try {
      if (!this.cache) {
        ctx.response.body = this.createResponse(false, undefined, 'Cache no habilitado');
        return;
      }

      const stats = this.cache.getStats();
      ctx.response.body = this.createResponse(true, stats);
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = this.createResponse(
        false,
        undefined,
        'Error obteniendo estadísticas de cache',
        [error instanceof Error ? error.message : String(error)]
      );
    }
  }

  /**
   * Limpiar cache para esta entidad
   */
  clearCache(ctx: Context): void {
    try {
      if (!this.cache) {
        ctx.response.body = this.createResponse(false, undefined, 'Cache no habilitado');
        return;
      }

      this.cache.invalidatePattern(`${this.entityName}:`);
      ctx.response.body = this.createResponse(true, undefined, `Cache de ${this.entityName} limpiado`);
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = this.createResponse(
        false,
        undefined,
        'Error limpiando cache',
        [error instanceof Error ? error.message : String(error)]
      );
    }
  }

  /**
   * Obtener información de conexiones disponibles para esta entidad
   */
  getConnectionsInfo(ctx: Context): void {
    try {
      const info = {
        entityName: this.entityName,
        defaultConnection: this.entityConfig.defaultConnection,
        allowedConnections: this.entityConfig.allowedConnections || ['all'],
        currentConnection: this.getConnectionName(ctx),
        restrictions: !this.entityConfig.allowedConnections ? 'none' : 'limited',
        usage: {
          header: 'X-Database-Connection: nombre_conexion',
          queryParam: '?connection=nombre_conexion'
        }
      };

      ctx.response.body = this.createResponse(true, info);
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = this.createResponse(
        false,
        undefined,
        'Error obteniendo información de conexiones',
        [error instanceof Error ? error.message : String(error)]
      );
    }
  }
}

export default MultiConnectionController;
