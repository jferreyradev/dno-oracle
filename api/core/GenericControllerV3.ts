/**
 * GenericControllerV3 - Versión con soporte multi-conexión
 * Extiende GenericControllerV2 añadiendo soporte para múltiples bases de datos
 */

import type { Context } from 'https://deno.land/x/oak@v12.6.1/mod.ts';
import { GenericControllerV2 } from './GenericControllerV2.ts';
import type { EntityConfig } from './EntityConfig.ts';
import type { MemoryCache } from './CacheService.ts';
import { querySQL, executeSQL } from './MultiDatabaseService.ts';

export interface MultiConnectionEntityConfig extends EntityConfig {
  defaultConnection?: string;
  allowedConnections?: string[];
}

export class GenericControllerV3 extends GenericControllerV2 {
  private multiEntityConfig: MultiConnectionEntityConfig;

  constructor(
    entityName: string,
    config: MultiConnectionEntityConfig,
    cache?: MemoryCache
  ) {
    super(entityName, config, cache);
    this.multiEntityConfig = config;
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
    if (this.multiEntityConfig.defaultConnection) {
      return this.multiEntityConfig.defaultConnection;
    }

    // 4. Conexión por defecto del sistema
    return undefined;
  }

  /**
   * Verificar si una conexión está permitida para esta entidad
   */
  private isConnectionAllowed(connectionName: string): boolean {
    if (!this.multiEntityConfig.allowedConnections) {
      return true; // Si no hay restricciones, permitir cualquiera
    }
    return this.multiEntityConfig.allowedConnections.includes(connectionName);
  }

  /**
   * Ejecutar consulta SQL con conexión específica
   */
  protected async executeQuery(
    sql: string,
    binds: unknown[] = [],
    ctx: Context
  ): Promise<{ rows: unknown[]; executionTime: number; connectionUsed: string }> {
    const connectionName = this.getConnectionName(ctx);
    const start = performance.now();
    
    try {
      const result = await querySQL(sql, binds, connectionName);
      const executionTime = performance.now() - start;
      
      return {
        rows: Array.isArray(result.rows) ? result.rows : [],
        executionTime,
        connectionUsed: result.connectionUsed
      };
    } catch (error) {
      console.error(`❌ Error en consulta (conexión: ${connectionName}):`, error);
      throw error;
    }
  }

  /**
   * Ejecutar statement SQL con conexión específica
   */
  protected async executeStatement(
    sql: string,
    binds: unknown[] = [],
    ctx: Context
  ): Promise<{ rowsAffected: number; executionTime: number; connectionUsed: string }> {
    const connectionName = this.getConnectionName(ctx);
    const start = performance.now();
    
    try {
      const result = await executeSQL(sql, binds, connectionName);
      const executionTime = performance.now() - start;
      
      return {
        rowsAffected: result.rowsAffected || 0,
        executionTime,
        connectionUsed: result.connectionUsed
      };
    } catch (error) {
      console.error(`❌ Error en statement (conexión: ${connectionName}):`, error);
      throw error;
    }
  }

  /**
   * Override del método list para incluir información de conexión
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
      const search = ctx.request.url.searchParams.get('search');
      const orderBy = ctx.request.url.searchParams.get('orderBy');
      const orderDir = ctx.request.url.searchParams.get('orderDir') as 'ASC' | 'DESC' || 'ASC';

      // Extraer filtros dinámicos
      const filters: Record<string, unknown> = {};
      for (const [key, value] of ctx.request.url.searchParams.entries()) {
        if (!['page', 'pageSize', 'search', 'orderBy', 'orderDir', 'connection'].includes(key)) {
          filters[key] = value;
        }
      }

      const searchOptions = {
        search,
        filters,
        orderBy,
        orderDir,
        page,
        pageSize
      };

      // Generar clave de cache incluyendo conexión
      const connectionName = this.getConnectionName(ctx);
      const cacheKey = `${this.entityName}:list:${JSON.stringify(searchOptions)}:conn:${connectionName}`;
      
      // Verificar cache
      if (this.cache) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          ctx.response.body = {
            ...cached,
            meta: {
              ...cached.meta,
              cached: true,
              connectionUsed: connectionName
            }
          };
          return;
        }
      }

      // Construir consultas SQL
      const countSql = this.sqlBuilder.buildCountQuery(searchOptions);
      const selectSql = this.sqlBuilder.buildSelectQuery(searchOptions);
      const binds = this.sqlBuilder.buildBinds(searchOptions);

      // Ejecutar consultas con conexión específica
      const [countResult, dataResult] = await Promise.all([
        this.executeQuery(countSql, binds, ctx),
        this.executeQuery(selectSql, binds, ctx)
      ]);

      const total = countResult.rows[0] ? (countResult.rows[0] as { COUNT: number }).COUNT : 0;
      const totalPages = Math.ceil(total / pageSize);

      const response = this.createResponse(true, {
        data: dataResult.rows,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }, undefined, undefined, false, dataResult.executionTime);

      // Agregar información de conexión al meta
      if (response.meta) {
        response.meta.connectionUsed = dataResult.connectionUsed;
      }

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
   * Override del método getById para incluir información de conexión
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

      // Generar clave de cache incluyendo conexión
      const connectionName = this.getConnectionName(ctx);
      const cacheKey = `${this.entityName}:${id}:conn:${connectionName}`;

      // Verificar cache
      if (this.cache) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          ctx.response.body = {
            ...cached,
            meta: {
              ...cached.meta,
              cached: true,
              connectionUsed: connectionName
            }
          };
          return;
        }
      }

      // Construir y ejecutar consulta
      const sql = this.sqlBuilder.buildSelectByIdQuery();
      const binds = [id];

      const result = await this.executeQuery(sql, binds, ctx);

      if (result.rows.length === 0) {
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
        result.executionTime
      );

      // Agregar información de conexión
      if (response.meta) {
        response.meta.connectionUsed = result.connectionUsed;
      }

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
   * Override del método create para incluir información de conexión
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
      const sql = this.sqlBuilder.buildInsertQuery();
      const binds = this.sqlBuilder.buildInsertBinds(validation.data);

      const result = await this.executeStatement(sql, binds, ctx);

      const response = this.createResponse(
        true,
        { created: true, rowsAffected: result.rowsAffected },
        'Registro creado exitosamente',
        undefined,
        false,
        result.executionTime
      );

      // Agregar información de conexión
      if (response.meta) {
        response.meta.connectionUsed = result.connectionUsed;
      }

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
   * Override del método update para incluir información de conexión
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
      const sql = this.sqlBuilder.buildUpdateQuery();
      const binds = [...this.sqlBuilder.buildUpdateBinds(validation.data), id];

      const result = await this.executeStatement(sql, binds, ctx);

      if (result.rowsAffected === 0) {
        ctx.response.status = 404;
        ctx.response.body = this.createResponse(false, undefined, `${this.entityName} no encontrado`);
        return;
      }

      const response = this.createResponse(
        true,
        { updated: true, rowsAffected: result.rowsAffected },
        'Registro actualizado exitosamente',
        undefined,
        false,
        result.executionTime
      );

      // Agregar información de conexión
      if (response.meta) {
        response.meta.connectionUsed = result.connectionUsed;
      }

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
   * Override del método delete para incluir información de conexión
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
      const sql = this.sqlBuilder.buildDeleteQuery();
      const binds = [id];

      const result = await this.executeStatement(sql, binds, ctx);

      if (result.rowsAffected === 0) {
        ctx.response.status = 404;
        ctx.response.body = this.createResponse(false, undefined, `${this.entityName} no encontrado`);
        return;
      }

      const response = this.createResponse(
        true,
        { deleted: true, rowsAffected: result.rowsAffected },
        'Registro eliminado exitosamente',
        undefined,
        false,
        result.executionTime
      );

      // Agregar información de conexión
      if (response.meta) {
        response.meta.connectionUsed = result.connectionUsed;
      }

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
   * Endpoint para obtener información de conexiones disponibles para esta entidad
   */
  getConnectionsInfo(ctx: Context): void {
    try {
      const info = {
        entityName: this.entityName,
        defaultConnection: this.multiEntityConfig.defaultConnection,
        allowedConnections: this.multiEntityConfig.allowedConnections || ['all'],
        currentConnection: this.getConnectionName(ctx),
        restrictions: !this.multiEntityConfig.allowedConnections ? 'none' : 'limited'
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

export default GenericControllerV3;
