/**
 * Servidor API genérico - Solo Backend (Sin interfaz web)
 * Versión optimizada para desarrollo de API
 */

import { Application, Router } from 'https://deno.land/x/oak@v12.6.1/mod.ts';
import { oakCors } from 'https://deno.land/x/cors@v1.2.2/mod.ts';
import { entityConfig } from './core/EntityConfig.ts';
import { GenericControllerV2 } from './core/GenericControllerV2.ts';
import { MemoryCache, type CacheConfig } from './core/CacheService.ts';
import { QueryRouter } from './core/QueryRouter.ts';
import { ProcedureRouter } from './core/ProcedureRouter.ts';
import { FileImportRouter } from './core/FileImportRouter.ts';
import { DatabaseConnectionRouter } from './core/DatabaseConnectionRouter.ts';
import { MultiDatabaseService } from './core/MultiDatabaseService.ts';

class ApiOnlyServer {
  private app: Application;
  private router: Router;
  private cache?: MemoryCache;

  constructor() {
    this.app = new Application();
    this.router = new Router();
    this.setupMiddlewares();
  }

  private setupMiddlewares(): void {
    // CORS más permisivo para desarrollo
    this.app.use(oakCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-Total-Count', 'X-Page-Count']
    }));

    // Logger mejorado para API
    this.app.use(async (ctx, next) => {
      const start = Date.now();
      const method = ctx.request.method;
      const url = ctx.request.url.pathname;
      const query = ctx.request.url.search;
      
      console.log(`🔄 [${new Date().toISOString()}] ${method} ${url}${query}`);
      
      await next();
      
      const ms = Date.now() - start;
      const status = ctx.response.status;
      const statusEmoji = status < 300 ? '✅' : status < 400 ? '⚠️' : '❌';
      console.log(`${statusEmoji} [${new Date().toISOString()}] ${method} ${url} - ${status} (${ms}ms)`);
    });

    // Error handler mejorado
    this.app.use(async (ctx, next) => {
      try {
        await next();
      } catch (error) {
        console.error('💥 Error no manejado:', error);
        
        const err = error as { status?: number; message?: string };
        const status = err.status || 500;
        const message = err.message || 'Error interno del servidor';
        
        ctx.response.status = status;
        ctx.response.body = {
          success: false,
          error: message,
          timestamp: new Date().toISOString(),
          path: ctx.request.url.pathname,
          method: ctx.request.method
        };
      }
    });

    // Middleware para rechazar rutas no-API
    this.app.use(async (ctx, next) => {
      // Solo permitir rutas que empiecen con /api/ o rutas raíz para info
      if (!ctx.request.url.pathname.startsWith('/api/') && ctx.request.url.pathname !== '/') {
        ctx.response.status = 404;
        ctx.response.body = {
          success: false,
          error: 'Esta es una API REST. Las rutas disponibles están en /api/',
          documentation: '/api/info',
          health: '/api/health'
        };
        return;
      }
      await next();
    });
  }

  enableCache(config?: Partial<CacheConfig>): void {
    const defaultConfig: CacheConfig = {
      defaultTTL: 600,
      maxSize: 2000,
      cleanupInterval: 30000
    };

    this.cache = new MemoryCache({ ...defaultConfig, ...config });
    console.log('💾 Cache habilitado para API');
  }

  private async setupRoutes(): Promise<void> {
    // Ruta raíz - Redirigir a documentación
    this.router.get('/', (ctx) => {
      ctx.response.body = {
        success: true,
        message: 'DNO-Oracle API Server',
        version: '2.0.0',
        documentation: '/api/info',
        health: '/api/health',
        timestamp: new Date().toISOString()
      };
    });

    // Documentación de la API
    this.router.get('/api/info', async (ctx) => {
      const config = await entityConfig.loadConfig();
      const entities = Object.keys(config.entities);
      
      ctx.response.body = {
        success: true,
        data: {
          name: 'DNO-Oracle API Server (Solo Backend)',
          version: '2.0.0',
          mode: 'API_ONLY',
          features: {
            cache: !!this.cache,
            entities: entities.length,
            procedures: true,
            fileImport: true,
            staticFiles: false // Explícitamente deshabilitado
          },
          entities: entities.map(name => {
            const entityConfig = config.entities[name];
            return {
              name,
              tableName: entityConfig.tableName,
              displayName: entityConfig.displayName,
              description: entityConfig.description,
              primaryKey: entityConfig.primaryKey,
              endpoints: [
                `GET /api/${name}`,
                `GET /api/${name}/:id`,
                `POST /api/${name}`,
                `PUT /api/${name}/:id`,
                `DELETE /api/${name}/:id`
              ]
            };
          }),
          cache: this.cache ? {
            stats: this.cache.getStats(),
            endpoints: [
              'GET /api/cache/stats',
              'DELETE /api/cache/clear-all'
            ]
          } : null,
          sql: {
            endpoints: [
              'POST /api/query',
              'POST /api/query/select',
              'POST /api/query/modify',
              'POST /api/query/validate',
              'POST /api/query/explain'
            ]
          },
          procedures: {
            endpoints: [
              'POST /api/procedures/call',
              'POST /api/procedures/function',
              'POST /api/procedures/cursor',
              'GET /api/procedures/list',
              'GET /api/procedures/help'
            ]
          },
          import: {
            endpoints: [
              'POST /api/import/csv',
              'POST /api/import/validate',
              'POST /api/import/headers',
              'POST /api/import/mapping',
              'GET /api/import/info',
              'GET /api/import/columns/:tableName'
            ]
          },
          entities: {
            endpoints: [
              'GET /api/entities',
              'GET /api/entities/:name',
              'GET /api/entities/:name/columns',
              'GET /api/entities/:name/data',
              'POST /api/entities',
              'DELETE /api/entities/:name',
              'POST /api/entities/generate',
              'GET /api/db/tables'
            ],
            description: 'Gestión dinámica de entidades desde el frontend'
          },
          connections: {
            multiDatabase: true,
            endpoints: [
              'GET /api/connections',
              'GET /api/connections/:name',
              'GET /api/connections/:name/test',
              'GET /api/connections/test-all',
              'PUT /api/connections/:name/set-default',
              'POST /api/connections',
              'GET /api/connections/stats/summary',
              'GET /api/connections/help'
            ],
            usage: {
              header: 'X-Database-Connection: nombre_conexion',
              queryParam: '?connection=nombre_conexion'
            }
          }
        }
      };
    });

    // Health check mejorado
    this.router.get('/api/health', (ctx) => {
      const health = {
        status: 'ok',
        mode: 'API_ONLY',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(Deno.osUptime()),
        memory: {
          used: Math.round(Deno.memoryUsage().rss / 1024 / 1024),
          unit: 'MB'
        },
        cache: this.cache ? {
          enabled: true,
          ...this.cache.getStats()
        } : { enabled: false }
      };

      ctx.response.body = {
        success: true,
        data: health
      };
    });

    // Endpoint para listar tablas físicas (USER_TABLES) según la conexión
    this.router.get('/api/db/tables', async (ctx) => {
      try {
        const connectionName = ctx.request.url.searchParams.get('connection') ||
                              ctx.request.headers.get('x-connection') ||
                              'default';
        const dbService = globalThis.multiDatabaseService;
        console.log(`[db/tables] Conexión solicitada: ${connectionName}`);
        
        if (!dbService) {
          console.error('❌ Servicio de base de datos no disponible');
          ctx.response.status = 500;
          ctx.response.body = { success: false, message: 'Servicio de base de datos no disponible' };
          return;
        }

        // Usar querySQL del servicio en lugar de getPool
        const sql = `SELECT table_name FROM user_tables ORDER BY table_name`;
        console.log(`[db/tables] Ejecutando SQL: ${sql}`);
        
        const result = await dbService.querySQL(sql, [], connectionName);
        console.log(`[db/tables] Resultado SQL:`, result.rows);
        
        if (!result || !result.rows) {
          ctx.response.body = { 
            success: true, 
            data: [], 
            connectionUsed: result?.connectionUsed || connectionName 
          };
          return;
        }
        
        ctx.response.body = {
          success: true,
          data: result.rows.map(row => row.TABLE_NAME || row.table_name),
          connectionUsed: result.connectionUsed
        };
      } catch (error) {
        console.error('❌ Error listando tablas:', error);
        ctx.response.status = 500;
        ctx.response.body = { 
          success: false, 
          message: 'Error listando tablas', 
          error: error.message 
        };
      }
    });

    // Endpoints para gestión de entidades
    // Crear/actualizar entidad
    this.router.post('/api/entities', async (ctx) => {
      try {
        const body = await ctx.request.body({ type: 'json' }).value;
        const connectionName = body.connection || 'default';
        
        console.log(`[POST /api/entities] Datos recibidos:`, body);
        
        // Cargar configuración actual
        const config = await entityConfig.loadConfig();
        
        // Agregar/actualizar entidades
        if (body.entities) {
          Object.assign(config.entities, body.entities);
        }
        
        // Guardar configuración
        await entityConfig.saveConfig(config);
        
        ctx.response.body = {
          success: true,
          message: 'Entidades guardadas correctamente',
          data: config.entities
        };
      } catch (error) {
        console.error('❌ Error guardando entidades:', error);
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          message: 'Error guardando entidades',
          error: error.message
        };
      }
    });

    // Listar todas las entidades
    this.router.get('/api/entities', async (ctx) => {
      try {
        const config = await entityConfig.loadConfig();
        ctx.response.body = {
          success: true,
          data: config.entities
        };
      } catch (error) {
        console.error('❌ Error listando entidades:', error);
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          message: 'Error listando entidades',
          error: error.message
        };
      }
    });

    // Obtener una entidad específica
    this.router.get('/api/entities/:name', async (ctx) => {
      try {
        const entityName = ctx.params.name;
        const config = await entityConfig.loadConfig();
        const entity = config.entities[entityName];
        
        if (!entity) {
          ctx.response.status = 404;
          ctx.response.body = {
            success: false,
            message: `Entidad '${entityName}' no encontrada`
          };
          return;
        }
        
        ctx.response.body = {
          success: true,
          data: entity
        };
      } catch (error) {
        console.error('❌ Error obteniendo entidad:', error);
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          message: 'Error obteniendo entidad',
          error: error.message
        };
      }
    });

    // Eliminar una entidad
    this.router.delete('/api/entities/:name', async (ctx) => {
      try {
        const entityName = ctx.params.name;
        const config = await entityConfig.loadConfig();
        
        if (!config.entities[entityName]) {
          ctx.response.status = 404;
          ctx.response.body = {
            success: false,
            message: `Entidad '${entityName}' no encontrada`
          };
          return;
        }
        
        delete config.entities[entityName];
        await entityConfig.saveConfig(config);
        
        ctx.response.body = {
          success: true,
          message: `Entidad '${entityName}' eliminada correctamente`
        };
      } catch (error) {
        console.error('❌ Error eliminando entidad:', error);
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          message: 'Error eliminando entidad',
          error: error.message
        };
      }
    });

    // Endpoint para obtener las columnas reales de una entidad desde Oracle
    this.router.get('/api/entities/:name/columns', async (ctx) => {
      try {
        const entityName = ctx.params.name;
        const connectionName = ctx.request.url.searchParams.get('connection') ||
                              ctx.request.headers.get('x-connection') ||
                              'default';
        
        // Cargar configuración de entidades
        const config = await entityConfig.loadConfig();
        const entity = config.entities[entityName];
        
        if (!entity) {
          ctx.response.status = 404;
          ctx.response.body = {
            success: false,
            message: `Entidad '${entityName}' no encontrada`
          };
          return;
        }
        
        const dbService = globalThis.multiDatabaseService;
        if (!dbService) {
          ctx.response.status = 500;
          ctx.response.body = {
            success: false,
            message: 'Servicio de base de datos no disponible'
          };
          return;
        }

        // Obtener el nombre real de la tabla (sin prefijo de esquema si existe)
        const tableName = entity.tableName.includes('.') 
          ? entity.tableName.split('.')[1] 
          : entity.tableName;

        // Consultar columnas reales desde Oracle
        const columnsSql = `
          SELECT 
            column_name,
            data_type,
            data_length,
            data_precision,
            data_scale,
            nullable,
            data_default,
            column_id
          FROM user_tab_columns 
          WHERE table_name = UPPER(:tableName)
          ORDER BY column_id
        `;
        
        const result = await dbService.querySQL(columnsSql, [tableName], connectionName);
        
        if (!result.rows || result.rows.length === 0) {
          ctx.response.status = 404;
          ctx.response.body = {
            success: false,
            message: `No se encontraron columnas para la tabla '${tableName}'`
          };
          return;
        }

        // Formatear columnas
        const columns = result.rows.map(row => ({
          name: row.COLUMN_NAME || row.column_name,
          type: row.DATA_TYPE || row.data_type,
          length: row.DATA_LENGTH || row.data_length,
          precision: row.DATA_PRECISION || row.data_precision,
          scale: row.DATA_SCALE || row.data_scale,
          nullable: (row.NULLABLE || row.nullable) === 'Y',
          defaultValue: row.DATA_DEFAULT || row.data_default,
          position: row.COLUMN_ID || row.column_id
        }));

        ctx.response.body = {
          success: true,
          data: {
            entityName: entityName,
            tableName: entity.tableName,
            totalColumns: columns.length,
            columns: columns,
            connectionUsed: result.connectionUsed
          }
        };

      } catch (error) {
        console.error('❌ Error obteniendo columnas de entidad:', error);
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          message: 'Error obteniendo columnas de entidad',
          error: error.message
        };
      }
    });

    // Endpoint para obtener datos de una entidad
    this.router.get('/api/entities/:name/data', async (ctx) => {
      try {
        const entityName = ctx.params.name;
        const connectionName = ctx.request.url.searchParams.get('connection') ||
                              ctx.request.headers.get('x-connection') ||
                              'default';
        
        // Parámetros de paginación
        const page = parseInt(ctx.request.url.searchParams.get('page') || '1');
        const limit = parseInt(ctx.request.url.searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;
        
        // Cargar configuración de entidades
        const config = await entityConfig.loadConfig();
        const entity = config.entities[entityName];
        
        if (!entity) {
          ctx.response.status = 404;
          ctx.response.body = {
            success: false,
            message: `Entidad '${entityName}' no encontrada`
          };
          return;
        }
        
        const dbService = globalThis.multiDatabaseService;
        if (!dbService) {
          ctx.response.status = 500;
          ctx.response.body = {
            success: false,
            message: 'Servicio de base de datos no disponible'
          };
          return;
        }

        // Obtener datos con paginación
        const dataSql = `
          SELECT * FROM (
            SELECT t.*, ROWNUM as rn 
            FROM (SELECT * FROM ${entity.tableName} ORDER BY ${entity.primaryKey}) t 
            WHERE ROWNUM <= :maxRow
          ) WHERE rn > :minRow
        `;
        
        const dataResult = await dbService.querySQL(dataSql, [offset + limit, offset], connectionName);
        
        // Obtener count total
        const countSql = `SELECT COUNT(*) as total FROM ${entity.tableName}`;
        const countResult = await dbService.querySQL(countSql, [], connectionName);
        const totalRecords = countResult.rows?.[0]?.TOTAL || countResult.rows?.[0]?.total || 0;

        ctx.response.body = {
          success: true,
          data: {
            entityName: entityName,
            tableName: entity.tableName,
            records: dataResult.rows || [],
            pagination: {
              page: page,
              limit: limit,
              totalRecords: totalRecords,
              totalPages: Math.ceil(totalRecords / limit),
              hasNext: page * limit < totalRecords,
              hasPrevious: page > 1
            },
            connectionUsed: dataResult.connectionUsed
          }
        };

      } catch (error) {
        console.error('❌ Error obteniendo datos de entidad:', error);
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          message: 'Error obteniendo datos de entidad',
          error: error.message
        };
      }
    });

    // Nuevo endpoint: Generar entidad automáticamente desde tabla física
    this.router.post('/api/entities/generate', async (ctx) => {
      try {
        const body = await ctx.request.body({ type: 'json' }).value;
        const { tableName, entityName, connectionName = 'default' } = body;
        
        if (!tableName) {
          ctx.response.status = 400;
          ctx.response.body = {
            success: false,
            message: 'tableName es requerido'
          };
          return;
        }
        
        const dbService = globalThis.multiDatabaseService;
        if (!dbService) {
          ctx.response.status = 500;
          ctx.response.body = {
            success: false,
            message: 'Servicio de base de datos no disponible'
          };
          return;
        }

        // Obtener estructura de la tabla
        const columnsSql = `
          SELECT 
            column_name,
            data_type,
            data_length,
            data_precision,
            data_scale,
            nullable,
            data_default
          FROM user_tab_columns 
          WHERE table_name = UPPER(:tableName)
          ORDER BY column_id
        `;
        
        const columnsResult = await dbService.querySQL(columnsSql, [tableName], connectionName);
        
        if (!columnsResult.rows || columnsResult.rows.length === 0) {
          ctx.response.status = 404;
          ctx.response.body = {
            success: false,
            message: `Tabla '${tableName}' no encontrada o sin columnas`
          };
          return;
        }

        // Obtener la clave primaria
        const pkSql = `
          SELECT column_name 
          FROM user_cons_columns ucc
          JOIN user_constraints uc ON ucc.constraint_name = uc.constraint_name
          WHERE uc.table_name = UPPER(:tableName)
          AND uc.constraint_type = 'P'
          ORDER BY ucc.position
        `;
        
        const pkResult = await dbService.querySQL(pkSql, [tableName], connectionName);
        const primaryKey = pkResult.rows && pkResult.rows.length > 0 
          ? pkResult.rows[0].COLUMN_NAME || pkResult.rows[0].column_name
          : columnsResult.rows[0].COLUMN_NAME || columnsResult.rows[0].column_name; // Fallback a primera columna

        // Generar campos de la entidad
        const fields: any = {};
        columnsResult.rows.forEach((col: any) => {
          const columnName = col.COLUMN_NAME || col.column_name;
          const dataType = col.DATA_TYPE || col.data_type;
          const nullable = col.NULLABLE || col.nullable;
          const dataLength = col.DATA_LENGTH || col.data_length;
          const dataPrecision = col.DATA_PRECISION || col.data_precision;
          const dataScale = col.DATA_SCALE || col.data_scale;
          
          fields[columnName] = {
            type: this.mapOracleTypeToEntityType(dataType),
            required: nullable === 'N'
          };
          
          // Agregar longitud para tipos que la necesitan
          if (dataLength && ['VARCHAR2', 'CHAR', 'NVARCHAR2', 'NCHAR'].includes(dataType)) {
            fields[columnName].length = dataLength;
          }
          
          // Agregar precisión para números
          if (dataPrecision && dataType === 'NUMBER') {
            fields[columnName].precision = dataPrecision;
            if (dataScale) {
              fields[columnName].scale = dataScale;
            }
          }
        });

        // Crear la entidad
        const finalEntityName = entityName || tableName.toLowerCase();
        const generatedEntity = {
          name: finalEntityName,
          tableName: tableName,
          displayName: this.generateDisplayName(tableName),
          description: `Entidad generada automáticamente para la tabla ${tableName}`,
          primaryKey: primaryKey,
          fields: fields,
          generatedAt: new Date().toISOString(),
          connection: connectionName
        };

        ctx.response.body = {
          success: true,
          message: `Entidad generada exitosamente para la tabla '${tableName}'`,
          data: {
            entityName: finalEntityName,
            entity: generatedEntity,
            preview: {
              [finalEntityName]: generatedEntity
            }
          }
        };

      } catch (error) {
        console.error('❌ Error generando entidad:', error);
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          message: 'Error generando entidad automáticamente',
          error: error.message
        };
      }
    });

    // Registrar entidades
    const config = await entityConfig.loadConfig();
    Object.entries(config.entities).forEach(([entityName, entityConfig]) => {
      const controller = new GenericControllerV2(entityName, entityConfig, this.cache);

      this.router.get(`/api/${entityName}`, (ctx) => controller.list(ctx));
      this.router.get(`/api/${entityName}/:id`, (ctx) => controller.getById(ctx));
      this.router.post(`/api/${entityName}`, (ctx) => controller.create(ctx));
      this.router.put(`/api/${entityName}/:id`, (ctx) => controller.update(ctx));
      this.router.delete(`/api/${entityName}/:id`, (ctx) => controller.delete(ctx));

      if (this.cache) {
        this.router.get(`/api/${entityName}/cache/stats`, (ctx) => controller.getCacheStats(ctx));
        this.router.delete(`/api/${entityName}/cache/clear`, (ctx) => controller.clearCache(ctx));
      }

      console.log(`🔗 Endpoints registrados para: ${entityName}`);
    });

    // Routers especializados
    const queryRouter = new QueryRouter();
    this.app.use(queryRouter.getRouter().routes());
    this.app.use(queryRouter.getRouter().allowedMethods());
    console.log('🔍 Rutas SQL habilitadas');

    const procedureRouter = ProcedureRouter.getRouter();
    this.app.use(procedureRouter.routes());
    this.app.use(procedureRouter.allowedMethods());
    console.log('⚙️  Rutas de procedimientos habilitadas');

    const fileImportRouter = FileImportRouter.getRouter();
    this.app.use(fileImportRouter.routes());
    this.app.use(fileImportRouter.allowedMethods());
    console.log('📁 Rutas de importación habilitadas');

    // Router de múltiples conexiones
    const connectionRouter = DatabaseConnectionRouter.getRouter();
    this.app.use(connectionRouter.routes());
    this.app.use(connectionRouter.allowedMethods());
    console.log('🔗 Rutas de múltiples conexiones habilitadas');

    // Cache global
    if (this.cache) {
      this.router.get('/api/cache/stats', (ctx) => {
        ctx.response.body = {
          success: true,
          data: this.cache!.getStats(),
          timestamp: new Date().toISOString()
        };
      });

      this.router.delete('/api/cache/clear-all', (ctx) => {
        this.cache!.clear();
        ctx.response.body = {
          success: true,
          message: 'Cache global limpiado',
          timestamp: new Date().toISOString()
        };
      });
    }

    this.app.use(this.router.routes());
    this.app.use(this.router.allowedMethods());
  }

  // Métodos auxiliares para generación de entidades
  private mapOracleTypeToEntityType(oracleType: string): string {
    const typeMap: { [key: string]: string } = {
      'VARCHAR2': 'string',
      'CHAR': 'string',
      'NVARCHAR2': 'string',
      'NCHAR': 'string',
      'CLOB': 'text',
      'NCLOB': 'text',
      'NUMBER': 'number',
      'BINARY_FLOAT': 'number',
      'BINARY_DOUBLE': 'number',
      'DATE': 'date',
      'TIMESTAMP': 'datetime',
      'TIMESTAMP(6)': 'datetime',
      'BLOB': 'blob',
      'RAW': 'binary'
    };
    
    return typeMap[oracleType] || 'string';
  }

  private generateDisplayName(tableName: string): string {
    // Convertir SNAKE_CASE a Title Case
    return tableName
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  async start(port = 8000): Promise<void> {
    try {
      // Inicializar sistema de múltiples bases de datos
      console.log('🔄 Inicializando sistema de múltiples conexiones...');
      // await initializeDatabase(); // Comentado por ahora
      
      const config = await entityConfig.loadConfig();
      console.log(`📊 Configuración: ${Object.keys(config.entities).length} entidades`);

      await this.setupRoutes();

      console.log('');
      console.log('🚀 DNO-Oracle API Server (Solo Backend)');
      console.log(`🌐 Puerto: ${port}`);
      console.log(`📋 Documentación: http://localhost:${port}/api/info`);
      console.log(`❤️  Health Check: http://localhost:${port}/api/health`);
      console.log(`🔍 Consultas SQL: http://localhost:${port}/api/query`);
      console.log(`🔗 Conexiones: http://localhost:${port}/api/connections`);
      
      if (this.cache) {
        console.log(`💾 Cache: HABILITADO`);
      }
      
      console.log('');
      console.log('📡 API REST Lista para recibir peticiones...');
      console.log('');

      await this.app.listen({ port });

    } catch (error) {
      console.error('💥 Error al iniciar servidor:', error);
      throw error;
    }
  }

  stop(): void {
    if (this.cache) {
      this.cache.destroy();
      console.log('💾 Cache destruido');
    }
    console.log('🛑 API Server detenido');
  }
}

// Inicialización
if (import.meta.main) {
  // Exponer la instancia real de la clase MultiDatabaseService
  globalThis.multiDatabaseService = new MultiDatabaseService();

  // Inicializar pools de todas las conexiones configuradas al arrancar
  try {
    const databasesText = await Deno.readTextFile('./config/databases.json');
    const databases = JSON.parse(databasesText);
    const dbService = globalThis.multiDatabaseService;
    
    if (Array.isArray(databases) && dbService) {
      for (const dbConfig of databases) {
        try {
          await dbService.addConnection(dbConfig);
          console.log(`✅ Pool inicializado para conexión: ${dbConfig.name}`);
        } catch (err) {
          console.error(`❌ Error inicializando pool para ${dbConfig.name}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ Error cargando configuración de bases de datos:', err.message);
  }

  const server = new ApiOnlyServer();
  server.enableCache({
    defaultTTL: 600,
    maxSize: 2000,
    cleanupInterval: 30000
  });
  Deno.addSignalListener('SIGINT', () => {
    console.log('\n🛑 Cerrando API Server...');
    server.stop();
    Deno.exit(0);
  });
  const port = parseInt(Deno.env.get('PORT') || '8000');
  await server.start(port);
}

export { ApiOnlyServer };
