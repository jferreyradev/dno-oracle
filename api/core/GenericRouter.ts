/**
 * GenericRouter - Router genérico que registra automáticamente rutas CRUD para todas las entidades
 */

import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { entityConfig } from './EntityConfig.ts';
import { GenericControllerV2 } from './GenericControllerV2.ts';

interface EntityRouterMap {
  [entityName: string]: GenericControllerV2;
}

export class GenericRouter {
  private router: Router;
  private controllers: EntityRouterMap = {};

  constructor() {
    this.router = new Router();
  }

  /**
   * Inicializa todas las rutas basadas en la configuración de entidades
   */
  async initialize(): Promise<void> {
    try {
      // Cargar configuración
      const config = await entityConfig.loadConfig();
      
      // Crear controladores para cada entidad
      for (const [entityName, entityConf] of Object.entries(config.entities)) {
        this.controllers[entityName] = new GenericControllerV2(entityName, entityConf);
        this.registerEntityRoutes(entityName, entityConf);
      }

      // Registrar ruta de información general
      this.registerInfoRoutes();

      console.log(`✅ Router genérico inicializado con ${Object.keys(this.controllers).length} entidades:`);
      console.log(`   - ${Object.keys(this.controllers).join(', ')}`);

    } catch (error) {
      console.error('❌ Error inicializando router genérico:', error);
      throw error;
    }
  }

  /**
   * Registra las rutas CRUD para una entidad específica
   */
  private registerEntityRoutes(entityName: string, entityConf: { operations: { create: boolean; read: boolean; update: boolean; delete: boolean }; filters?: Record<string, unknown>; customActions?: Record<string, unknown> }): void {
    const controller = this.controllers[entityName];
    const basePath = `/api/${entityName}`;

    // Rutas principales CRUD
    if (entityConf.operations.read) {
      // GET /api/{entity} - Listar todos con paginación y filtros
      this.router.get(basePath, async (ctx) => {
        await controller.list(ctx as never);
      });

      // GET /api/{entity}/:id - Obtener por ID
      this.router.get(`${basePath}/:id`, async (ctx) => {
        await controller.getById(ctx as never);
      });
    }

    if (entityConf.operations.create) {
      // POST /api/{entity} - Crear nuevo registro
      this.router.post(basePath, async (ctx) => {
        await controller.create(ctx as never);
      });
    }

    if (entityConf.operations.update) {
      // PUT /api/{entity}/:id - Actualizar registro
      this.router.put(`${basePath}/:id`, async (ctx) => {
        await controller.update(ctx as never);
      });
    }

    if (entityConf.operations.delete) {
      // DELETE /api/{entity}/:id - Eliminar registro
      this.router.delete(`${basePath}/:id`, async (ctx) => {
        await controller.delete(ctx as never);
      });
    }

    // Rutas para filtros predefinidos (comentadas temporalmente)
    /*
    if (entityConf.filters) {
      Object.keys(entityConf.filters).forEach(_filterName => {
        // GET /api/{entity}/filter/{filterName} - Aplicar filtro predefinido
        this.router.get(`${basePath}/filter/:filter`, async (ctx) => {
          await controller.applyFilter(ctx as never);
        });
      });
    }
    */

    // Rutas para acciones personalizadas (comentadas temporalmente)
    /*
    if (entityConf.customActions) {
      Object.keys(entityConf.customActions).forEach(_actionName => {
        // POST /api/{entity}/:id/action/{actionName} - Ejecutar acción personalizada
        this.router.post(`${basePath}/:id/action/:action`, async (ctx) => {
          await controller.executeCustomAction(ctx as never);
        });
      });
    }
    */

    console.log(`   📝 Rutas registradas para '${entityName}':`);
    console.log(`      - GET    ${basePath} (${entityConf.operations.read ? '✅' : '❌'})`);
    console.log(`      - GET    ${basePath}/:id (${entityConf.operations.read ? '✅' : '❌'})`);
    console.log(`      - POST   ${basePath} (${entityConf.operations.create ? '✅' : '❌'})`);
    console.log(`      - PUT    ${basePath}/:id (${entityConf.operations.update ? '✅' : '❌'})`);
    console.log(`      - DELETE ${basePath}/:id (${entityConf.operations.delete ? '✅' : '❌'})`);
    
    if (entityConf.filters) {
      console.log(`      - GET    ${basePath}/filter/:filter (⚠️ ${Object.keys(entityConf.filters).length} filtros - temporalmente deshabilitados)`);
    }
    
    if (entityConf.customActions) {
      console.log(`      - POST   ${basePath}/:id/action/:action (⚠️ ${Object.keys(entityConf.customActions).length} acciones - temporalmente deshabilitadas)`);
    }
  }

  /**
   * Registra rutas de información y utilidades
   */
  private registerInfoRoutes(): void {
    // GET /api/info - Información general de la API
    this.router.get('/api/info', async (ctx) => {
      try {
        const config = await entityConfig.loadConfig();
        const entities = Object.keys(config.entities);
        
        const entitiesInfo = await Promise.all(
          entities.map(async (entityName) => {
            const entityConf = config.entities[entityName];
            const searchableFields = await entityConfig.getSearchableFields(entityName);
            const writableFields = await entityConfig.getWritableFields(entityName);
            const requiredFields = await entityConfig.getRequiredFields(entityName);

            return {
              name: entityName,
              displayName: entityConf.displayName,
              description: entityConf.description,
              tableName: entityConf.tableName,
              primaryKey: entityConf.primaryKey,
              operations: entityConf.operations,
              searchableFields,
              writableFields,
              requiredFields,
              filters: entityConf.filters ? Object.keys(entityConf.filters) : [],
              customActions: entityConf.customActions ? Object.keys(entityConf.customActions) : [],
              endpoints: this.generateEndpointsList(entityName, entityConf)
            };
          })
        );

        ctx.response.body = {
          success: true,
          data: {
            apiVersion: '1.0.0',
            description: 'API genérica basada en configuración para entidades Oracle',
            entities: entitiesInfo,
            settings: config.settings
          }
        };

      } catch (error) {
        console.error('Error en /api/info:', error);
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          message: 'Error obteniendo información de la API'
        };
      }
    });

    // GET /api/entities - Lista de entidades disponibles
    this.router.get('/api/entities', async (ctx) => {
      try {
        const entities = await entityConfig.getEntityNames();
        ctx.response.body = {
          success: true,
          data: entities
        };
      } catch (error) {
        console.error('Error en /api/entities:', error);
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          message: 'Error obteniendo lista de entidades'
        };
      }
    });

    // GET /api/entities/:entityName - Información detallada de una entidad
    this.router.get('/api/entities/:entityName', async (ctx) => {
      try {
        const entityName = ctx.params.entityName;
        if (!entityName) {
          ctx.response.status = 400;
          ctx.response.body = {
            success: false,
            message: 'Nombre de entidad es requerido'
          };
          return;
        }

        const entityConf = await entityConfig.getEntityConfig(entityName);
        if (!entityConf) {
          ctx.response.status = 404;
          ctx.response.body = {
            success: false,
            message: `Entidad '${entityName}' no encontrada`
          };
          return;
        }

        const searchableFields = await entityConfig.getSearchableFields(entityName);
        const writableFields = await entityConfig.getWritableFields(entityName);
        const requiredFields = await entityConfig.getRequiredFields(entityName);

        ctx.response.body = {
          success: true,
          data: {
            name: entityName,
            config: entityConf,
            searchableFields,
            writableFields,
            requiredFields,
            endpoints: this.generateEndpointsList(entityName, entityConf)
          }
        };

      } catch (error) {
        console.error('Error en /api/entities/:entityName:', error);
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          message: 'Error obteniendo información de la entidad'
        };
      }
    });

    // GET /api/health - Health check
    this.router.get('/api/health', (ctx) => {
      ctx.response.body = {
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          entitiesLoaded: Object.keys(this.controllers).length
        }
      };
    });
  }

  /**
   * Genera la lista de endpoints disponibles para una entidad
   */
  private generateEndpointsList(entityName: string, entityConf: { operations: { create: boolean; read: boolean; update: boolean; delete: boolean }; filters?: Record<string, unknown>; customActions?: Record<string, unknown> }): string[] {
    const endpoints: string[] = [];
    const basePath = `/api/${entityName}`;

    if (entityConf.operations.read) {
      endpoints.push(`GET ${basePath}`);
      endpoints.push(`GET ${basePath}/:id`);
    }

    if (entityConf.operations.create) {
      endpoints.push(`POST ${basePath}`);
    }

    if (entityConf.operations.update) {
      endpoints.push(`PUT ${basePath}/:id`);
    }

    if (entityConf.operations.delete) {
      endpoints.push(`DELETE ${basePath}/:id`);
    }

    if (entityConf.filters) {
      Object.keys(entityConf.filters).forEach(filterName => {
        endpoints.push(`GET ${basePath}/filter/${filterName}`);
      });
    }

    if (entityConf.customActions) {
      Object.keys(entityConf.customActions).forEach(actionName => {
        endpoints.push(`POST ${basePath}/:id/action/${actionName}`);
      });
    }

    return endpoints;
  }

  /**
   * Recarga la configuración y reinicializa las rutas
   */
  async reload(): Promise<void> {
    console.log('🔄 Recargando configuración del router genérico...');
    
    // Limpiar controladores existentes
    this.controllers = {};
    
    // Crear un nuevo router
    this.router = new Router();
    
    // Reinicializar
    await this.initialize();
    
    console.log('✅ Router genérico recargado exitosamente');
  }

  /**
   * Obtiene la instancia del router de Oak
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Obtiene el controlador de una entidad específica
   */
  getController(entityName: string): GenericControllerV2 | undefined {
    return this.controllers[entityName];
  }

  /**
   * Obtiene la lista de entidades registradas
   */
  getRegisteredEntities(): string[] {
    return Object.keys(this.controllers);
  }
}

// Instancia singleton del router genérico
export const genericRouter = new GenericRouter();
