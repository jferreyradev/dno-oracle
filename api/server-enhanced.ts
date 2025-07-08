/**
 * Servidor API DNO-Oracle - Versión Enhanced
 * 
 * Servidor API REST completo para integración con bases de datos Oracle.
 * Incluye funcionalidades avanzadas de:
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
          },genérico para entidades configuradas
 * - Consultas SQL directas y seguras
 * - Importación de archivos CSV a tablas Oracle
 * - Ejecución de procedimientos almacenados
 * - Sistema de cache en memoria
 * - Interfaz web opcional (modo completo)
 * - Modo "solo API" para despliegues backend
 * 
 * Modos de funcionamiento:
 * - COMPLETO: API + interfaz web estática (por defecto)
 * - API_ONLY: Solo endpoints REST (env: API_ONLY=true)
 * 
 * Variables de entorno importantes:
 * - PORT: Puerto del servidor (default: 8000)
 * - API_ONLY: true para modo solo API (default: false)
 * - DB_HOST, DB_PORT, DB_SERVICE, DB_USER, DB_PASSWORD: Conexión Oracle
 * 
 * @version 2.0.0
 * @author DNO-Oracle Team
 */

import { Application, Router } from 'https://deno.land/x/oak@v12.6.1/mod.ts';
import { oakCors } from 'https://deno.land/x/cors@v1.2.2/mod.ts';
import { entityConfig } from './core/EntityConfig.ts';
import { MultiConnectionController } from './core/MultiConnectionController.ts';
import { MemoryCache, type CacheConfig } from './core/CacheService.ts';
import { MultiQueryRouter } from './core/MultiQueryRouter.ts';
import { ProcedureRouter } from './core/ProcedureRouter.ts';
import { FileImportRouter } from './core/FileImportRouter.ts';
import { MultiDatabaseService } from './core/MultiDatabaseService.ts';

/**
 * Servidor API Genérico para Oracle
 * 
 * Clase principal que gestiona:
 * - Configuración de middlewares (CORS, logging, error handling)
 * - Registro automático de rutas para entidades
 * - Sistema opcional de cache en memoria
 * - Servir archivos estáticos (cuando está habilitado)
 * - Endpoints de salud y documentación
 */
class GenericApiServer {
  private app: Application;
  private router: Router;
  private cache?: MemoryCache;
  private staticFilesEnabled: boolean = true;

  /**
   * Constructor del servidor
   * @param options - Opciones de configuración
   * @param options.staticFiles - Habilitar servir archivos estáticos (default: true)
   */
  constructor(options?: { staticFiles?: boolean }) {
    this.app = new Application();
    this.router = new Router();
    this.staticFilesEnabled = options?.staticFiles !== false;
    this.setupMiddlewares();
  }

  /**
   * Configurar middlewares básicos
   */
  private setupMiddlewares(): void {
    // CORS
    this.app.use(oakCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Logger de requests
    this.app.use(async (ctx, next) => {
      const start = Date.now();
      const method = ctx.request.method;
      const url = ctx.request.url.pathname;
      
      console.log(`[${new Date().toISOString()}] ${method} ${url} - Iniciando`);
      
      await next();
      
      const ms = Date.now() - start;
      const status = ctx.response.status;
      console.log(`[${new Date().toISOString()}] ${method} ${url} - ${status} (${ms}ms)`);
    });

    // Error handler
    this.app.use(async (ctx, next) => {
      try {
        await next();
      } catch (error) {
        console.error('Error no manejado:', error);
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          message: 'Error interno del servidor',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
  }

  /**
   * Habilitar sistema de cache en memoria
   * 
   * Configura un cache LRU con limpieza automática para mejorar
   * el rendimiento de las consultas a la base de datos.
   * 
   * @param config - Configuración personalizada del cache
   * @param config.defaultTTL - Tiempo de vida por defecto en segundos (default: 300)
   * @param config.maxSize - Número máximo de entradas (default: 1000)
   * @param config.cleanupInterval - Intervalo de limpieza en ms (default: 60000)
   */
  enableCache(config?: Partial<CacheConfig>): void {
    const defaultConfig: CacheConfig = {
      defaultTTL: 300,       // 5 minutos
      maxSize: 1000,         // 1000 entradas
      cleanupInterval: 60000 // 1 minuto
    };

    this.cache = new MemoryCache({ ...defaultConfig, ...config });
    console.log('✅ Sistema de cache habilitado');
  }

  /**
   * Registrar rutas para todas las entidades configuradas
   */
  private async setupRoutes(): Promise<void> {
    // Rutas de información del sistema
    this.router.get('/api/info', async (ctx) => {
      const config = await entityConfig.loadConfig();
      const entities = Object.keys(config.entities);
      
      ctx.response.body = {
        success: true,
        data: {
          name: 'DNO-Oracle API Server',
          version: '2.0.0',
          mode: this.staticFilesEnabled ? 'FULL' : 'API_ONLY',
          description: 'Sistema completo de gestión de datos Oracle con funcionalidades avanzadas',
          timestamp: new Date().toISOString(),
          features: {
            cache: !!this.cache,
            entities: entities.length,
            procedures: true,
            fileImport: true,
            staticFiles: this.staticFilesEnabled,
            multiConnection: true,
            entityGeneration: true,
            realTimeData: true
          },
          entities: {
            summary: {
              total: entities.length,
              configured: entities
            },
            list: entities.map(name => {
              const entityConfig = config.entities[name];
              return {
                name,
                tableName: entityConfig.tableName,
                displayName: entityConfig.displayName,
                description: entityConfig.description,
                primaryKey: entityConfig.primaryKey,
                connections: ['default', 'prod', 'desa'],
                endpoints: [
                  `GET /api/${name}`,
                  `GET /api/${name}/:id`,
                  `POST /api/${name}`,
                  `PUT /api/${name}/:id`,
                  `DELETE /api/${name}/:id`
                ]
              };
            }),
            management: {
              description: 'Gestión dinámica de entidades',
              endpoints: [
                'GET /api/entities - Listar todas las entidades',
                'GET /api/entities/:name - Obtener una entidad específica',
                'GET /api/entities/:name/columns - Obtener columnas reales de Oracle',
                'GET /api/entities/:name/data - Obtener datos reales con paginación',
                'POST /api/entities - Crear/actualizar entidades',
                'DELETE /api/entities/:name - Eliminar una entidad',
                'POST /api/entities/generate - Generar entidad desde tabla física'
              ]
            }
          },
          database: {
            description: 'Gestión de base de datos y tablas físicas',
            multiConnection: true,
            connections: ['default', 'prod', 'desa'],
            endpoints: [
              'GET /api/db/tables - Listar tablas físicas',
              'GET /api/query/connections - Listar conexiones disponibles'
            ]
          },
          sql: {
            description: 'Ejecución de consultas SQL directas y seguras',
            endpoints: [
              'POST /api/query - Consulta SQL general',
              'POST /api/query/select - Consulta SELECT segura',
              'POST /api/query/modify - Consultas de modificación',
              'POST /api/query/validate - Validar sintaxis SQL',
              'POST /api/query/explain - Plan de ejecución'
            ]
          },
          procedures: {
            description: 'Ejecución de procedimientos almacenados Oracle',
            endpoints: [
              'POST /api/procedures/call - Ejecutar procedimiento',
              'POST /api/procedures/function - Ejecutar función',
              'POST /api/procedures/cursor - Procesar cursor',
              'GET /api/procedures/list - Listar procedimientos',
              'GET /api/procedures/info/:name - Información del procedimiento',
              'GET /api/procedures/help - Ayuda sobre procedimientos'
            ]
          },
          fileImport: {
            description: 'Importación de archivos CSV a tablas Oracle',
            endpoints: [
              'POST /api/import/csv - Importar archivo CSV',
              'POST /api/import/validate - Validar datos',
              'POST /api/import/headers - Obtener headers',
              'POST /api/import/mapping - Mapear columnas',
              'GET /api/import/info - Información de importación',
              'GET /api/import/columns/:tableName - Columnas de tabla'
            ]
          },
          cache: this.cache ? {
            description: 'Sistema de cache en memoria para optimización',
            enabled: true,
            stats: this.cache.getStats(),
            endpoints: [
              'GET /api/cache/stats - Estadísticas globales',
              'DELETE /api/cache/clear-all - Limpiar cache global',
              'GET /api/:entity/cache/stats - Stats por entidad',
              'DELETE /api/:entity/cache/clear - Limpiar por entidad'
            ]
          } : {
            enabled: false,
            description: 'Cache no habilitado'
          },
          systemEndpoints: {
            description: 'Endpoints del sistema y utilidades',
            endpoints: [
              'GET /api/info - Esta documentación',
              'GET /api/health - Estado de salud del sistema',
              'GET / - Página de inicio (si modo FULL)'
            ]
          },
          usage: {
            multiConnection: {
              description: 'Uso de múltiples conexiones Oracle',
              methods: [
                'Header: X-Connection: nombre_conexion',
                'Query param: ?connection=nombre_conexion',
                'Body param: connection: "nombre_conexion"'
              ],
              availableConnections: ['default', 'prod', 'desa']
            },
            pagination: {
              description: 'Paginación automática en endpoints de datos',
              parameters: [
                'page: número de página (default: 1)',
                'limit: registros por página (default: 50)'
              ]
            },
            cors: {
              enabled: true,
              description: 'CORS habilitado para desarrollo'
            }
          }
        }
      };
    });

    // Ruta de health check mejorada
    this.router.get('/api/health', (ctx) => {
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(Deno.osUptime()),
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

    // Endpoint para crear/gestionar entidades
    this.router.post('/api/entities', async (ctx) => {
      try {
        const body = await ctx.request.body({ type: 'json' }).value;
        const { connection, entities } = body;
        
        if (!entities || typeof entities !== 'object') {
          ctx.response.status = 400;
          ctx.response.body = { 
            success: false, 
            message: 'Se requiere un objeto entities válido' 
          };
          return;
        }
        
        // Validar estructura de entidades
        for (const [entityName, entityConfig] of Object.entries(entities)) {
          if (!entityConfig.name || !entityConfig.tableName || !entityConfig.primaryKey) {
            ctx.response.status = 400;
            ctx.response.body = { 
              success: false, 
              message: `Entidad ${entityName} incompleta: se requieren name, tableName y primaryKey` 
            };
            return;
          }
        }
        
        // Cargar configuración actual
        const currentConfig = await entityConfig.loadConfig();
        
        // Agregar/actualizar entidades
        Object.assign(currentConfig.entities, entities);
        
        // Guardar configuración actualizada
        await entityConfig.saveConfig(currentConfig);
        
        console.log(`✅ Entidades guardadas: ${Object.keys(entities).join(', ')}`);
        
        ctx.response.body = {
          success: true,
          message: `${Object.keys(entities).length} entidad(es) guardada(s) correctamente`,
          entities: Object.keys(entities),
          connectionUsed: connection || 'default'
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

    // Endpoint para obtener todas las entidades
    this.router.get('/api/entities', async (ctx) => {
      try {
        const config = await entityConfig.loadConfig();
        
        ctx.response.body = {
          success: true,
          data: config.entities,
          count: Object.keys(config.entities).length
        };
      } catch (error) {
        console.error('❌ Error obteniendo entidades:', error);
        ctx.response.status = 500;
        ctx.response.body = { 
          success: false, 
          message: 'Error obteniendo entidades', 
          error: error.message 
        };
      }
    });

    // Endpoint para obtener una entidad específica
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

    // Endpoint para eliminar una entidad
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
        
        console.log(`🗑️ Entidad eliminada: ${entityName}`);
        
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
            message: `Entidad '${entityName}' no encontrada en la configuración`
          };
          return;
        }

        // Validar que la conexión está permitida para esta entidad
        if (entity.allowedConnections && !entity.allowedConnections.includes(connectionName)) {
          ctx.response.status = 400;
          ctx.response.body = {
            success: false,
            message: `La conexión '${connectionName}' no está permitida para la entidad '${entityName}'. Conexiones válidas: ${entity.allowedConnections.join(', ')}`
          };
          return;
        }
        
        const dbService = globalThis.multiDatabaseService || globalThis.databaseService;
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
            message: `Entidad '${entityName}' no encontrada en la configuración`
          };
          return;
        }

        // Validar que la conexión está permitida para esta entidad
        if (entity.allowedConnections && !entity.allowedConnections.includes(connectionName)) {
          ctx.response.status = 400;
          ctx.response.body = {
            success: false,
            message: `La conexión '${connectionName}' no está permitida para la entidad '${entityName}'. Conexiones válidas: ${entity.allowedConnections.join(', ')}`
          };
          return;
        }
        
        const dbService = globalThis.multiDatabaseService || globalThis.databaseService;
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
        
        const dbService = globalThis.multiDatabaseService || globalThis.databaseService;
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

    // Endpoint para listar tablas físicas (USER_TABLES) según la conexión
    this.router.get('/api/db/tables', async (ctx) => {
      try {
        const connectionName = ctx.request.url.searchParams.get('connection') ||
                              ctx.request.headers.get('x-connection') ||
                              'default';
        // Obtener el servicio de base de datos multi-conexión
        const dbService = globalThis.multiDatabaseService || globalThis.databaseService;
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

    // Registrar rutas para cada entidad con soporte multi-conexión
    const config = await entityConfig.loadConfig();
    Object.entries(config.entities).forEach(([entityName, entityConfig]) => {
      const controller = new MultiConnectionController(entityName, entityConfig, this.cache);

      // Rutas CRUD básicas
      this.router.get(`/api/${entityName}`, (ctx) => controller.list(ctx));
      this.router.get(`/api/${entityName}/:id`, (ctx) => controller.getById(ctx));
      this.router.post(`/api/${entityName}`, (ctx) => controller.create(ctx));
      this.router.put(`/api/${entityName}/:id`, (ctx) => controller.update(ctx));
      this.router.delete(`/api/${entityName}/:id`, (ctx) => controller.delete(ctx));

      // Rutas de administración de cache
      if (this.cache) {
        this.router.get(`/api/${entityName}/cache/stats`, (ctx) => controller.getCacheStats(ctx));
        this.router.delete(`/api/${entityName}/cache/clear`, (ctx) => controller.clearCache(ctx));
      }

      console.log(`✅ Rutas multi-conexión registradas para entidad: ${entityName}`);
    });

    // Registrar rutas de consultas SQL directas con soporte multi-conexión
    const queryRouter = new MultiQueryRouter();
    this.app.use(queryRouter.getRouter().routes());
    this.app.use(queryRouter.getRouter().allowedMethods());
    console.log(`✅ Rutas de consultas SQL multi-conexión registradas`);

    // Registrar rutas de procedimientos almacenados
    const procedureRouter = ProcedureRouter.getRouter();
    this.app.use(procedureRouter.routes());
    this.app.use(procedureRouter.allowedMethods());
    console.log(`✅ Rutas de procedimientos almacenados registradas`);

    // Ruta para limpiar todo el cache
    if (this.cache) {
      this.router.delete('/api/cache/clear-all', (ctx) => {
        this.cache!.clear();
        ctx.response.body = {
          success: true,
          message: 'Cache global limpiado',
          timestamp: new Date().toISOString()
        };
      });

      this.router.get('/api/cache/stats', (ctx) => {
        ctx.response.body = {
          success: true,
          data: this.cache!.getStats(),
          timestamp: new Date().toISOString()
        };
      });
    }

    // Registrar rutas de importación de archivos
    const fileImportRouter = FileImportRouter.getRouter();
    this.app.use(fileImportRouter.routes());
    this.app.use(fileImportRouter.allowedMethods());
    console.log(`✅ Rutas de importación de archivos registradas`);

    // Servir archivos estáticos (solo si está habilitado)
    if (this.staticFilesEnabled) {
      this.app.use(async (ctx, next) => {
        // Si es una ruta de API, continuar con el siguiente middleware
        if (ctx.request.url.pathname.startsWith('/api/')) {
          await next();
          return;
        }
        
        try {
          // Servir archivos estáticos desde la carpeta public
          const filePath = ctx.request.url.pathname === '/' ? '/index.html' : ctx.request.url.pathname;
          const fullPath = `${Deno.cwd()}/public${filePath}`;
          
          // Verificar si el archivo existe
          const fileInfo = await Deno.stat(fullPath);
          if (fileInfo.isFile) {
            const content = await Deno.readFile(fullPath);
            
            // Determinar el tipo de contenido
            const ext = filePath.split('.').pop()?.toLowerCase();
            const mimeTypes: Record<string, string> = {
              'html': 'text/html',
              'css': 'text/css',
              'js': 'application/javascript',
              'json': 'application/json',
              'png': 'image/png',
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'gif': 'image/gif',
              'svg': 'image/svg+xml',
              'ico': 'image/x-icon'
            };
            
            ctx.response.headers.set('Content-Type', mimeTypes[ext || ''] || 'text/plain');
            ctx.response.body = content;
            return;
          }
        } catch (_error) {
          // Si no se encuentra el archivo, intentar servir index.html (SPA)
          if (ctx.request.url.pathname !== '/') {
            try {
              const indexPath = `${Deno.cwd()}/public/index.html`;
              const content = await Deno.readFile(indexPath);
              ctx.response.headers.set('Content-Type', 'text/html');
              ctx.response.body = content;
              return;
            } catch {
              // Si no se puede servir index.html, continuar con 404
            }
          }
        }
        
        await next();
      });
    } else {
      // Middleware para rechazar rutas no-API cuando los archivos estáticos están deshabilitados
      this.app.use(async (ctx, next) => {
        if (!ctx.request.url.pathname.startsWith('/api/') && ctx.request.url.pathname !== '/') {
          ctx.response.status = 404;
          ctx.response.body = {
            success: false,
            error: 'Esta es una API REST. Solo están disponibles las rutas /api/*',
            documentation: '/api/info',
            health: '/api/health'
          };
          return;
        }
        
        // Ruta raíz redirige a documentación
        if (ctx.request.url.pathname === '/') {
          ctx.response.body = {
            success: true,
            message: 'DNO-Oracle API Server (Solo Backend)',
            version: '2.0.0',
            mode: 'API_ONLY',
            documentation: '/api/info',
            health: '/api/health',
            timestamp: new Date().toISOString()
          };
          return;
        }
        
        await next();
      });
    }

    // Registrar rutas en la aplicación
    this.app.use(this.router.routes());
    this.app.use(this.router.allowedMethods());
  }

  /**
   * Iniciar el servidor
   * 
   * Configura todas las rutas, carga la configuración de entidades
   * y arranca el servidor HTTP en el puerto especificado.
   * 
   * @param port - Puerto en el que escuchar (default: 8000)
   * @throws Error si no se puede cargar la configuración o iniciar el servidor
   */
  async start(port = 8000): Promise<void> {
    try {
      // Cargar configuración de entidades
      const config = await entityConfig.loadConfig();
      console.log(`✅ Configuración cargada: ${Object.keys(config.entities).length} entidades`);

      // Configurar rutas
      await this.setupRoutes();

      // Iniciar servidor
      console.log(`🚀 Servidor iniciando en puerto ${port}...`);
      console.log(`📋 Documentación: http://localhost:${port}/api/info`);
      console.log(`❤️  Health check: http://localhost:${port}/api/health`);
      console.log(`🔧 Modo: ${this.staticFilesEnabled ? 'COMPLETO (API + Web)' : 'SOLO API'}`);
      
      if (this.cache) {
        console.log(`💾 Cache: habilitado`);
      }

      await this.app.listen({ port });

    } catch (error) {
      console.error('❌ Error al iniciar servidor:', error);
      throw error;
    }
  }

  /**
   * Detener el servidor y limpiar recursos
   * 
   * Destruye el cache si está habilitado y realiza limpieza
   * de recursos antes del cierre del servidor.
   */
  stop(): void {
    if (this.cache) {
      this.cache.destroy();
      console.log('💾 Cache destruido');
    }
    console.log('🛑 Servidor detenido');
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

}

/**
 * Inicialización y arranque del servidor
 * Determina el modo de funcionamiento (API+Web o solo API) y configura el servidor
 */
if (import.meta.main) {
  // Determinar modo según variable de entorno
  const apiOnly = Deno.env.get('API_ONLY') === 'true';

  // Inicializar y exponer el servicio multi-conexión globalmente
  globalThis.multiDatabaseService = new MultiDatabaseService();

  const server = new GenericApiServer({ 
    staticFiles: !apiOnly 
  });
  
  // Habilitar cache con configuración predeterminada
  server.enableCache({
    defaultTTL: 600,       // 10 minutos
    maxSize: 2000,         // 2000 entradas
    cleanupInterval: 30000 // 30 segundos
  });
  
  // Manejar señales de cierre del sistema
  Deno.addSignalListener('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    server.stop();
    Deno.exit(0);
  });

  // Iniciar servidor
  const port = parseInt(Deno.env.get('PORT') || '8000');
  await server.start(port);
}

export { GenericApiServer };
