/**
 * Servidor API DNO-Oracle - Versión Enhanced
 * 
 * Servidor API REST completo para integración con bases de datos Oracle.
 * Incluye funcionalidades avanzadas de:
 * - CRUD genérico para entidades configuradas
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
import { GenericControllerV2 } from './core/GenericControllerV2.ts';
import { MemoryCache, type CacheConfig } from './core/CacheService.ts';
import { QueryRouter } from './core/QueryRouter.ts';
import { ProcedureRouter } from './core/ProcedureRouter.ts';
import { FileImportRouter } from './core/FileImportRouter.ts';

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
          features: {
            cache: !!this.cache,
            entities: entities.length,
            procedures: true,
            fileImport: true,
            staticFiles: this.staticFilesEnabled
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
              `GET /api/${entities[0]}/cache/stats`,
              `DELETE /api/${entities[0]}/cache/clear`
            ]
          } : null,
          fileImport: {
            endpoints: [
              'POST /api/import/csv',
              'POST /api/import/validate',
              'POST /api/import/headers',
              'POST /api/import/mapping',
              'GET /api/import/info',
              'GET /api/import/columns/:tableName'
            ]
          },
          procedures: {
            endpoints: [
              'POST /api/procedures/call',
              'POST /api/procedures/function',
              'POST /api/procedures/cursor',
              'GET /api/procedures/list',
              'GET /api/procedures/info/:procedureName',
              'GET /api/procedures/help'
            ]
          },
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

    // Registrar rutas para cada entidad
    const config = await entityConfig.loadConfig();
    Object.entries(config.entities).forEach(([entityName, entityConfig]) => {
      const controller = new GenericControllerV2(entityName, entityConfig, this.cache);

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

      console.log(`✅ Rutas registradas para entidad: ${entityName}`);
    });

    // Registrar rutas de consultas SQL directas
    const queryRouter = new QueryRouter();
    this.app.use(queryRouter.getRouter().routes());
    this.app.use(queryRouter.getRouter().allowedMethods());
    console.log(`✅ Rutas de consultas SQL registradas`);

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
}

/**
 * Inicialización y arranque del servidor
 * Determina el modo de funcionamiento (API+Web o solo API) y configura el servidor
 */
if (import.meta.main) {
  // Determinar modo según variable de entorno
  const apiOnly = Deno.env.get('API_ONLY') === 'true';
  
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
