/**
 * SqlBuilder - Constructor dinámico de consultas SQL basado en configuración de entidades
 */

import type { EntityConfig } from './EntityConfig.ts';

export interface QueryParams {
  [key: string]: string | number | boolean | null;
}

export interface SearchOptions {
  search?: string;
  searchFields?: string[];
  filters?: Record<string, string | number | boolean>;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface SqlQuery {
  sql: string;
  params: QueryParams;
}

export class SqlBuilder {
  private entityConfig: EntityConfig;

  constructor(entityConfig: EntityConfig) {
    this.entityConfig = entityConfig;
  }

  /**
   * Construye una consulta SELECT con filtros, búsqueda y paginación
   */
  buildSelectQuery(options: SearchOptions = {}): SqlQuery {
    const {
      search,
      searchFields = [],
      filters = {},
      page = 1,
      pageSize = 10,
      orderBy = this.entityConfig.primaryKey,
      orderDirection = 'ASC'
    } = options;

    // Construir lista de columnas explícitamente
    const columns = Object.keys(this.entityConfig.fields).join(', ');
    
    let sql = `SELECT ${columns} FROM ${this.entityConfig.tableName}`;
    const params: QueryParams = {};
    const conditions: string[] = [];

    // Construir condiciones de búsqueda
    if (search && searchFields.length > 0) {
      const searchConditions = searchFields.map((field, index) => {
        const paramName = `search_${index}`;
        params[paramName] = `%${search}%`;
        return `UPPER(${field}) LIKE UPPER(:${paramName})`;
      });
      conditions.push(`(${searchConditions.join(' OR ')})`);
    }

    // Construir filtros
    Object.entries(filters).forEach(([key, value], index) => {
      if (value !== null && value !== undefined) {
        const paramName = `filter_${index}`;
        params[paramName] = value;
        conditions.push(`${key} = :${paramName}`);
      }
    });

    // Aplicar condiciones WHERE
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Aplicar ordenamiento
    sql += ` ORDER BY ${orderBy} ${orderDirection}`;

    // Aplicar paginación (Oracle syntax) - Usar columnas específicas
    const offset = (page - 1) * pageSize;
    sql = `
      SELECT ${columns} FROM (
        SELECT ${columns}, ROWNUM rnum FROM (
          ${sql}
        ) WHERE ROWNUM <= :limit
      ) WHERE rnum > :offset
    `;
    params.limit = offset + pageSize;
    params.offset = offset;

    return { sql, params };
  }

  /**
   * Construye una consulta COUNT para paginación
   */
  buildCountQuery(options: SearchOptions = {}): SqlQuery {
    const { search, searchFields = [], filters = {} } = options;

    let sql = `SELECT COUNT(*) as total FROM ${this.entityConfig.tableName}`;
    const params: QueryParams = {};
    const conditions: string[] = [];

    // Construir condiciones de búsqueda
    if (search && searchFields.length > 0) {
      const searchConditions = searchFields.map((field, index) => {
        const paramName = `search_${index}`;
        params[paramName] = `%${search}%`;
        return `UPPER(${field}) LIKE UPPER(:${paramName})`;
      });
      conditions.push(`(${searchConditions.join(' OR ')})`);
    }

    // Construir filtros
    Object.entries(filters).forEach(([key, value], index) => {
      if (value !== null && value !== undefined) {
        const paramName = `filter_${index}`;
        params[paramName] = value;
        conditions.push(`${key} = :${paramName}`);
      }
    });

    // Aplicar condiciones WHERE
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    return { sql, params };
  }

  /**
   * Construye una consulta SELECT por ID
   */
  buildSelectByIdQuery(id: string | number): SqlQuery {
    const columns = Object.keys(this.entityConfig.fields).join(', ');
    const sql = `SELECT ${columns} FROM ${this.entityConfig.tableName} WHERE ${this.entityConfig.primaryKey} = :id`;
    const params: QueryParams = { id };
    return { sql, params };
  }

  /**
   * Construye una consulta INSERT
   */
  buildInsertQuery(data: Record<string, unknown>): SqlQuery {
    const writableFields = this.getWritableFields();
    const fieldsToInsert = writableFields.filter(field => data[field] !== undefined);
    
    if (fieldsToInsert.length === 0) {
      throw new Error('No hay campos válidos para insertar');
    }

    const fieldNames = fieldsToInsert.join(', ');
    const placeholders = fieldsToInsert.map(field => `:${field}`).join(', ');
    
    let sql = `INSERT INTO ${this.entityConfig.tableName} (${fieldNames}) VALUES (${placeholders})`;
    
    // Si hay auto-increment, agregar RETURNING para obtener el ID generado
    if (this.entityConfig.autoIncrement) {
      sql += ` RETURNING ${this.entityConfig.primaryKey} INTO :new_id`;
    }

    const params: QueryParams = {};
    fieldsToInsert.forEach(field => {
      params[field] = data[field] as string | number | boolean | null;
    });

    return { sql, params };
  }

  /**
   * Construye una consulta UPDATE
   */
  buildUpdateQuery(id: string | number, data: Record<string, unknown>): SqlQuery {
    const writableFields = this.getWritableFields();
    const fieldsToUpdate = writableFields.filter(field => 
      data[field] !== undefined && field !== this.entityConfig.primaryKey
    );
    
    if (fieldsToUpdate.length === 0) {
      throw new Error('No hay campos válidos para actualizar');
    }

    const setClause = fieldsToUpdate.map(field => `${field} = :${field}`).join(', ');
    const sql = `UPDATE ${this.entityConfig.tableName} SET ${setClause} WHERE ${this.entityConfig.primaryKey} = :id`;
    
    const params: QueryParams = { id };
    fieldsToUpdate.forEach(field => {
      params[field] = data[field] as string | number | boolean | null;
    });

    return { sql, params };
  }

  /**
   * Construye una consulta DELETE
   */
  buildDeleteQuery(id: string | number): SqlQuery {
    const sql = `DELETE FROM ${this.entityConfig.tableName} WHERE ${this.entityConfig.primaryKey} = :id`;
    const params: QueryParams = { id };
    return { sql, params };
  }

  /**
   * Construye una consulta para acción personalizada
   */
  buildCustomActionQuery(actionSql: string, id: string | number, additionalParams: QueryParams = {}): SqlQuery {
    const params: QueryParams = { id, ...additionalParams };
    return { sql: actionSql, params };
  }

  /**
   * Obtiene los campos que se pueden escribir (no readonly, no autoIncrement)
   */
  private getWritableFields(): string[] {
    return Object.entries(this.entityConfig.fields)
      .filter(([_, fieldConfig]) => !fieldConfig.readonly && !fieldConfig.autoIncrement)
      .map(([fieldName, _]) => fieldName);
  }

  /**
   * Valida que los campos requeridos estén presentes
   */
  validateRequiredFields(data: Record<string, unknown>, isUpdate = false): void {
    const requiredFields = Object.entries(this.entityConfig.fields)
      .filter(([_, fieldConfig]) => 
        fieldConfig.required && 
        !fieldConfig.autoIncrement && 
        (!isUpdate || data[_] !== undefined)
      )
      .map(([fieldName, _]) => fieldName);

    const missingFields = requiredFields.filter(field => 
      data[field] === undefined || data[field] === null || data[field] === ''
    );

    if (missingFields.length > 0) {
      throw new Error(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Aplica filtros predefinidos de la configuración
   */
  applyPredefinedFilter(filterName: string, baseOptions: SearchOptions = {}): SearchOptions {
    const filterConfig = this.entityConfig.filters?.[filterName];
    if (!filterConfig) {
      throw new Error(`Filtro '${filterName}' no encontrado`);
    }

    const filters = { ...baseOptions.filters };
    filters[filterConfig.field] = filterConfig.value;

    return {
      ...baseOptions,
      filters
    };
  }

  /**
   * Construye condiciones WHERE dinámicas
   */
  private buildWhereConditions(
    search?: string,
    searchFields: string[] = [],
    filters: Record<string, string | number | boolean> = {}
  ): { conditions: string[]; params: QueryParams } {
    const conditions: string[] = [];
    const params: QueryParams = {};

    // Condiciones de búsqueda
    if (search && searchFields.length > 0) {
      const searchConditions = searchFields.map((field, index) => {
        const paramName = `search_${index}`;
        params[paramName] = `%${search}%`;
        return `UPPER(${field}) LIKE UPPER(:${paramName})`;
      });
      conditions.push(`(${searchConditions.join(' OR ')})`);
    }

    // Filtros específicos
    Object.entries(filters).forEach(([key, value], index) => {
      if (value !== null && value !== undefined) {
        const paramName = `filter_${index}`;
        params[paramName] = value;
        conditions.push(`${key} = :${paramName}`);
      }
    });

    return { conditions, params };
  }
}
