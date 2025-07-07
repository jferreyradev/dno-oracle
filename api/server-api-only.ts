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

  async start(port = 8000): Promise<void> {
    try {
      const config = await entityConfig.loadConfig();
      console.log(`📊 Configuración: ${Object.keys(config.entities).length} entidades`);

      await this.setupRoutes();

      console.log('');
      console.log('🚀 DNO-Oracle API Server (Solo Backend)');
      console.log(`🌐 Puerto: ${port}`);
      console.log(`📋 Documentación: http://localhost:${port}/api/info`);
      console.log(`❤️  Health Check: http://localhost:${port}/api/health`);
      console.log(`🔍 Consultas SQL: http://localhost:${port}/api/query`);
      
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
