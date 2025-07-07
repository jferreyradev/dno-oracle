/**
 * GenericControllerV2 - Versión mejorada compatible con la API existente
 */

import type { Context } from 'https://deno.land/x/oak@v12.6.1/mod.ts';
import type { EntityConfig } from './EntityConfig.ts';
import { SqlBuilder, type SearchOptions } from './SqlBuilder.ts';
import { DataValidator } from './DataValidator.ts';
import type { MemoryCache } from './CacheService.ts';
import { querySQL, executeSQL } from './DatabaseService.ts';

interface PaginatedResponse<T = Record<string, unknown>> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: {
    cached: boolean;
    executionTime: number;
  };
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  meta?: {
    cached: boolean;
    executionTime: number;
    user?: string;
  };
}

export class GenericControllerV2 {
  private entityName: string;
  private entityConfig: EntityConfig;
  private sqlBuilder: SqlBuilder;
  private validator: DataValidator;
  private cache?: MemoryCache;

  constructor(
    entityName: string, 
    config: EntityConfig, 
    cache?: MemoryCache
  ) {
    this.entityName = entityName;
    this.entityConfig = config;
    this.sqlBuilder = new SqlBuilder(config);
    this.validator = new DataValidator(config);
    this.cache = cache;
  }

  /**
   * Helper para obtener parámetros del contexto de Oak
   */
  private getParam(ctx: Context, paramName: string): string | undefined {
    return (ctx as unknown as {params: Record<string, string>}).params?.[paramName];
  }

  /**
   * Helper para obtener usuario del contexto
   */
  private getUser(ctx: Context): { username?: string; role?: string } | undefined {
    return (ctx.state as { user?: { username?: string; role?: string } })?.user;
  }

  /**
   * Helper para medir tiempo de ejecución
   */
  private measureTime<T>(operation: () => T): { result: T; time: number } {
    const start = performance.now();
    const result = operation();
    const time = performance.now() - start;
    return { result, time };
  }

  /**
   * Verificar permisos básicos (simplificado)
   */
  private hasPermission(_ctx: Context, _operation: string): boolean {
    // Simplificado: permitir todo por ahora, puede expandirse
    return true;
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
    user?: string
  ): ApiResponse<T> {
    return {
      success,
      data,
      message,
      errors,
      meta: {
        cached,
        executionTime,
        user
      }
    };
  }

  /**
   * Manejar errores de forma segura
   */
  private handleError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  /**
   * Listar entidades con paginación, filtros y cache
   */
  async list(ctx: Context): Promise<void> {
    if (!this.hasPermission(ctx, 'read')) {
      ctx.response.status = 403;
      ctx.response.body = this.createResponse(false, null, 'Sin permisos');
      return;
    }

    try {
      const url = new URL(ctx.request.url);
      const params = url.searchParams;
      
      const page = parseInt(params.get('page') || '1');
      const pageSize = Math.min(parseInt(params.get('pageSize') || '10'), 100);
      const search = params.get('search') || '';
      
      // Construir filtros dinámicos
      const filters: Record<string, string | number | boolean> = {};
      for (const [key, value] of params.entries()) {
        if (key.startsWith('filter_') && value) {
          const fieldName = key.substring(7);
          if (this.entityConfig.fields[fieldName]) {
            // Intentar convertir a número si es posible
            const numValue = Number(value);
            filters[fieldName] = !isNaN(numValue) ? numValue : value;
          }
        }
      }

      const searchOptions: SearchOptions = {
        search,
        searchFields: Object.keys(this.entityConfig.fields).filter(
          field => this.entityConfig.fields[field].searchable
        ),
        filters,
        page,
        pageSize,
        orderBy: params.get('orderBy') || this.entityConfig.primaryKey,
        orderDirection: (params.get('orderDirection') as 'ASC' | 'DESC') || 'ASC'
      };

      // Generar clave de cache
      const cacheKey = this.cache?.generateEntityKey(
        this.entityName, 
        JSON.stringify(searchOptions), 
        'list'
      );

      // Intentar obtener del cache
      let cachedResult: PaginatedResponse | null = null;
      if (this.cache && cacheKey) {
        cachedResult = this.cache.get<PaginatedResponse>(cacheKey);
      }

      if (cachedResult) {
        ctx.response.body = this.createResponse(
          true, 
          cachedResult, 
          'Entidades obtenidas (cache)',
          undefined,
          true,
          0,
          this.getUser(ctx)?.username
        );
        return;
      }

      const { result, time } = this.measureTime(() => {
        const selectQuery = this.sqlBuilder.buildSelectQuery(searchOptions);
        const countQuery = this.sqlBuilder.buildCountQuery(searchOptions);
        
        return Promise.all([
          querySQL(selectQuery.sql, selectQuery.params),
          querySQL(countQuery.sql, countQuery.params)
        ]);
      });

      const [rawData, countResult] = await result;
      const data = await this.processOracleData(rawData);
      const total = countResult[0]?.TOTAL || 0;
      const totalPages = Math.ceil(total / pageSize);

      const response: PaginatedResponse = {
        data,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        meta: {
          cached: false,
          executionTime: time
        }
      };

      // Guardar en cache
      if (this.cache && cacheKey) {
        this.cache.set(cacheKey, response, 300); // 5 minutos
      }

      ctx.response.body = this.createResponse(
        true, 
        response, 
        'Entidades obtenidas exitosamente',
        undefined,
        false,
        time,
        this.getUser(ctx)?.username
      );

    } catch (error) {
      console.error('Error en list:', error);
      ctx.response.status = 500;
      ctx.response.body = this.createResponse(
        false, 
        null, 
        'Error interno del servidor',
        [this.handleError(error)]
      );
    }
  }

  /**
   * Obtener entidad por ID con cache
   */
  async getById(ctx: Context): Promise<void> {
    if (!this.hasPermission(ctx, 'read')) {
      ctx.response.status = 403;
      ctx.response.body = this.createResponse(false, null, 'Sin permisos');
      return;
    }

    try {
      const id = this.getParam(ctx, 'id');
      
      if (!id) {
        ctx.response.status = 400;
        ctx.response.body = this.createResponse(false, null, 'ID requerido');
        return;
      }

      // Generar clave de cache
      const cacheKey = this.cache?.generateEntityKey(this.entityName, id, 'getById');
      
      // Intentar obtener del cache
      let cachedResult: unknown = null;
      if (this.cache && cacheKey) {
        cachedResult = this.cache.get(cacheKey);
      }

      if (cachedResult) {
        ctx.response.body = this.createResponse(
          true, 
          cachedResult, 
          'Entidad obtenida (cache)',
          undefined,
          true,
          0,
          this.getUser(ctx)?.username
        );
        return;
      }

      const { result, time } = this.measureTime(() => {
        const sql = this.sqlBuilder.buildSelectByIdQuery(id);
        return querySQL(sql.sql, sql.params);
      });

      const rawData = await result;
      
      if (!rawData || rawData.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = this.createResponse(false, null, 'Entidad no encontrada');
        return;
      }

      const processedData = await this.processOracleData(rawData);
      const entity = processedData[0];

      // Guardar en cache
      if (this.cache && cacheKey) {
        this.cache.set(cacheKey, entity, 600); // 10 minutos
      }

      ctx.response.body = this.createResponse(
        true, 
        entity, 
        'Entidad obtenida exitosamente',
        undefined,
        false,
        time,
        this.getUser(ctx)?.username
      );

    } catch (error) {
      console.error('Error en getById:', error);
      ctx.response.status = 500;
      ctx.response.body = this.createResponse(
        false, 
        null, 
        'Error interno del servidor',
        [this.handleError(error)]
      );
    }
  }

  /**
   * Crear nueva entidad con invalidación de cache
   */
  async create(ctx: Context): Promise<void> {
    if (!this.hasPermission(ctx, 'create')) {
      ctx.response.status = 403;
      ctx.response.body = this.createResponse(false, null, 'Sin permisos');
      return;
    }

    try {
      const body = await ctx.request.body().value;
      
      // Validar datos
      const validation = this.validator.validate(body);
      if (!validation.isValid) {
        ctx.response.status = 400;
        ctx.response.body = this.createResponse(
          false, 
          null, 
          'Datos inválidos',
          validation.errors.map(e => e.message)
        );
        return;
      }

      const { result, time } = this.measureTime(() => {
        const sql = this.sqlBuilder.buildInsertQuery(validation.validData);
        return executeSQL(sql.sql, sql.params);
      });

      await result;

      // Invalidar cache relacionado
      if (this.cache) {
        this.cache.invalidatePattern(`entity:${this.entityName}:.*`);
      }

      ctx.response.status = 201;
      ctx.response.body = this.createResponse(
        true, 
        validation.validData, 
        'Entidad creada exitosamente',
        undefined,
        false,
        time,
        this.getUser(ctx)?.username
      );

    } catch (error) {
      console.error('Error en create:', error);
      ctx.response.status = 500;
      ctx.response.body = this.createResponse(
        false, 
        null, 
        'Error interno del servidor',
        [this.handleError(error)]
      );
    }
  }

  /**
   * Actualizar entidad con invalidación de cache
   */
  async update(ctx: Context): Promise<void> {
    if (!this.hasPermission(ctx, 'update')) {
      ctx.response.status = 403;
      ctx.response.body = this.createResponse(false, null, 'Sin permisos');
      return;
    }

    try {
      const id = this.getParam(ctx, 'id');
      const body = await ctx.request.body().value;
      
      if (!id) {
        ctx.response.status = 400;
        ctx.response.body = this.createResponse(false, null, 'ID requerido');
        return;
      }

      // Validar datos (parcial para updates)
      const validation = this.validator.validate(body, false);
      if (!validation.isValid) {
        ctx.response.status = 400;
        ctx.response.body = this.createResponse(
          false, 
          null, 
          'Datos inválidos',
          validation.errors.map(e => e.message)
        );
        return;
      }

      const { result, time } = this.measureTime(() => {
        const sql = this.sqlBuilder.buildUpdateQuery(id, validation.validData);
        return executeSQL(sql.sql, sql.params);
      });

      await result;

      // Invalidar cache relacionado
      if (this.cache) {
        this.cache.invalidatePattern(`entity:${this.entityName}:.*`);
      }

      ctx.response.body = this.createResponse(
        true, 
        { id, ...validation.validData }, 
        'Entidad actualizada exitosamente',
        undefined,
        false,
        time,
        this.getUser(ctx)?.username
      );

    } catch (error) {
      console.error('Error en update:', error);
      ctx.response.status = 500;
      ctx.response.body = this.createResponse(
        false, 
        null, 
        'Error interno del servidor',
        [this.handleError(error)]
      );
    }
  }

  /**
   * Eliminar entidad con invalidación de cache
   */
  async delete(ctx: Context): Promise<void> {
    if (!this.hasPermission(ctx, 'delete')) {
      ctx.response.status = 403;
      ctx.response.body = this.createResponse(false, null, 'Sin permisos');
      return;
    }

    try {
      const id = this.getParam(ctx, 'id');
      
      if (!id) {
        ctx.response.status = 400;
        ctx.response.body = this.createResponse(false, null, 'ID requerido');
        return;
      }

      const { result, time } = this.measureTime(() => {
        const sql = this.sqlBuilder.buildDeleteQuery(id);
        return executeSQL(sql.sql, sql.params);
      });

      await result;

      // Invalidar cache relacionado
      if (this.cache) {
        this.cache.invalidatePattern(`entity:${this.entityName}:.*`);
      }

      ctx.response.body = this.createResponse(
        true, 
        null, 
        'Entidad eliminada exitosamente',
        undefined,
        false,
        time,
        this.getUser(ctx)?.username
      );

    } catch (error) {
      console.error('Error en delete:', error);
      ctx.response.status = 500;
      ctx.response.body = this.createResponse(
        false, 
        null, 
        'Error interno del servidor',
        [this.handleError(error)]
      );
    }
  }

  /**
   * Estadísticas de cache para esta entidad
   */
  getCacheStats(ctx: Context): void {
    if (!this.cache) {
      ctx.response.status = 404;
      ctx.response.body = this.createResponse(false, null, 'Cache no configurado');
      return;
    }

    const stats = this.cache.getStats();
    ctx.response.body = this.createResponse(
      true, 
      { 
        entity: this.entityName,
        ...stats 
      }, 
      'Estadísticas de cache obtenidas',
      undefined,
      false,
      0,
      this.getUser(ctx)?.username
    );
  }

  /**
   * Limpiar cache para esta entidad
   */
  clearCache(ctx: Context): void {
    if (!this.cache) {
      ctx.response.status = 404;
      ctx.response.body = this.createResponse(false, null, 'Cache no configurado');
      return;
    }

    this.cache.invalidatePattern(`entity:${this.entityName}:.*`);
    
    ctx.response.body = this.createResponse(
      true, 
      { cleared: true, pattern: `entity:${this.entityName}:*` }, 
      `Cache limpiado para entidad ${this.entityName}`,
      undefined,
      false,
      0,
      this.getUser(ctx)?.username
    );
  }

  /**
   * Procesar datos de Oracle para convertir CLOBs a strings
   */
  private async processOracleData(data: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
    if (!data || data.length === 0) return data;

    const processedData = [];
    
    for (const row of data) {
      const processedRow: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(row)) {
        // Detectar si es un objeto CLOB de Oracle
        if (value && typeof value === 'object' && value !== null) {
          const clobObj = value as { 
            _type?: { name?: string }; 
            _length?: number; 
            getData?: () => Promise<string>;
            toString?: () => string;
            valueOf?: () => string;
            _isActive?: boolean;
          };
          
          // Múltiples formas de detectar un CLOB
          const isClob = (clobObj._type && clobObj._type.name === 'DB_TYPE_CLOB') ||
                        (clobObj._length !== undefined && typeof clobObj.getData === 'function') ||
                        (clobObj._isActive !== undefined);
          
          if (isClob) {
            try {
              // Intentar diferentes métodos para obtener el contenido
              let content: string | null = null;
              
              if (clobObj.getData) {
                content = await clobObj.getData();
              } else if (clobObj.toString && typeof clobObj.toString === 'function') {
                content = clobObj.toString();
              } else if (clobObj.valueOf && typeof clobObj.valueOf === 'function') {
                content = String(clobObj.valueOf());
              }
              
              processedRow[key] = content;
              console.log(`✅ CLOB ${key} procesado: ${content ? content.substring(0, 50) + '...' : 'null'}`);
            } catch (error) {
              console.warn(`⚠️ Error leyendo CLOB ${key}:`, error);
              processedRow[key] = null;
            }
          } else {
            processedRow[key] = value;
          }
        } else {
          processedRow[key] = value;
        }
      }
      
      processedData.push(processedRow);
    }
    
    return processedData;
  }
}
