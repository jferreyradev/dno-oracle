/**
 * Servidor API genérico mejorado con Cache y Autenticación
 */

import { Application, Router } from 'https://deno.land/x/oak@v12.6.1/mod.ts';
import { oakCors } from 'https://deno.land/x/cors@v1.2.2/mod.ts';
import { entityConfig } from './core/EntityConfig.ts';
import { GenericControllerV2 } from './core/GenericControllerV2.ts';
import { MemoryCache, type CacheConfig } from './core/CacheService.ts';
import { AuthService, type AuthConfig } from './core/AuthService.ts';

class GenericApiServer {
  private app: Application;
  private router: Router;
  private cache?: MemoryCache;
  private authService?: AuthService;

  constructor() {
    this.app = new Application();
    this.router = new Router();
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
   * Configurar sistema de cache
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
   * Configurar sistema de autenticación
   */
  enableAuth(config: AuthConfig): void {
    this.authService = new AuthService(config);
    
    // Agregar middleware de autenticación
    this.app.use(async (ctx, next) => {
      await this.authService!.authMiddleware(ctx, next);
    });
    
    console.log('✅ Sistema de autenticación habilitado');
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
          name: 'API Genérica Deno + Oracle',
          version: '2.0.0',
          features: {
            cache: !!this.cache,
            authentication: !!this.authService,
            entities: entities.length
          },
          entities: entities.map(name => ({
            name,
            endpoints: [
              `GET /api/${name}`,
              `GET /api/${name}/:id`,
              `POST /api/${name}`,
              `PUT /api/${name}/:id`,
              `DELETE /api/${name}/:id`
            ]
          })),
          cache: this.cache ? {
            stats: this.cache.getStats(),
            endpoints: [
              `GET /api/${entities[0]}/cache/stats`,
              `DELETE /api/${entities[0]}/cache/clear`
            ]
          } : null
        }
      };
    });

    // Ruta de health check mejorada
    this.router.get('/api/health', (ctx) => {
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Deno.osUptime(),
        cache: this.cache ? {
          enabled: true,
          ...this.cache.getStats()
        } : { enabled: false },
        auth: {
          enabled: !!this.authService
        }
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

    // Registrar rutas en la aplicación
    this.app.use(this.router.routes());
    this.app.use(this.router.allowedMethods());
  }

  /**
   * Iniciar servidor
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
      
      if (this.cache) {
        console.log(`💾 Cache: habilitado`);
      }
      
      if (this.authService) {
        console.log(`🔐 Autenticación: habilitada`);
      }

      await this.app.listen({ port });

    } catch (error) {
      console.error('❌ Error al iniciar servidor:', error);
      throw error;
    }
  }

  /**
   * Detener servidor y limpiar recursos
   */
  stop(): void {
    if (this.cache) {
      this.cache.destroy();
      console.log('💾 Cache destruido');
    }
    console.log('🛑 Servidor detenido');
  }
}

// Configuración de ejemplo
const cacheConfig: Partial<CacheConfig> = {
  defaultTTL: 600,       // 10 minutos
  maxSize: 2000,         // 2000 entradas
  cleanupInterval: 30000 // 30 segundos
};

const _authConfig: AuthConfig = {
  jwtSecret: 'your-secret-key-here',
  publicRoutes: [
    '/api/health',
    '/api/info'
  ],
  roles: {
    'admin': ['*'],
    'user': ['*.read', '*.create'],
    'readonly': ['*.read']
  }
};

// Inicialización del servidor
if (import.meta.main) {
  const server = new GenericApiServer();
  
  // Habilitar cache
  server.enableCache(cacheConfig);
  
  // Habilitar autenticación (comentado por ahora)
  // server.enableAuth(authConfig);
  
  // Manejar señales de cierre
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
