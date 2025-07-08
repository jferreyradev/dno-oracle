/**
 * Router para gestión de múltiples conexiones de base de datos
 */

import { Router } from 'https://deno.land/x/oak@v12.6.1/mod.ts';
import { 
  getConnectionsInfo, 
  testConnection, 
  setDefaultConnection, 
  getDefaultConnection,
  addConnection,
  type DatabaseConfig
} from './MultiDatabaseService.ts';

export class DatabaseConnectionRouter {
  private router: Router;

  constructor() {
    this.router = new Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Información de todas las conexiones
    this.router.get('/api/connections', (ctx) => {
      try {
        const connections = getConnectionsInfo();
        ctx.response.body = {
          success: true,
          data: {
            connections,
            default: getDefaultConnection(),
            total: connections.length,
            active: connections.filter(c => c.isActive).length
          }
        };
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    // Probar conectividad de una conexión específica
    this.router.get('/api/connections/:name/test', async (ctx) => {
      try {
        const connectionName = ctx.params.name;
        const result = await testConnection(connectionName);
        
        ctx.response.body = {
          success: result.success,
          data: result,
          message: result.success 
            ? `Conexión '${connectionName}' exitosa` 
            : `Error en conexión '${connectionName}'`
        };
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    // Probar todas las conexiones
    this.router.get('/api/connections/test-all', async (ctx) => {
      try {
        const connections = getConnectionsInfo();
        const results = await Promise.all(
          connections.map(async (conn) => {
            if (!conn.isActive) {
              return {
                connectionName: conn.name,
                success: false,
                responseTime: 0,
                error: 'Conexión inactiva'
              };
            }
            return await testConnection(conn.name);
          })
        );

        const summary = {
          total: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          averageResponseTime: Math.round(
            results.filter(r => r.success).reduce((sum, r) => sum + r.responseTime, 0) / 
            Math.max(results.filter(r => r.success).length, 1)
          )
        };

        ctx.response.body = {
          success: true,
          data: {
            summary,
            results
          }
        };
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    // Establecer conexión por defecto
    this.router.put('/api/connections/:name/set-default', (ctx) => {
      try {
        const connectionName = ctx.params.name;
        setDefaultConnection(connectionName);
        
        ctx.response.body = {
          success: true,
          message: `Conexión por defecto establecida: '${connectionName}'`,
          data: {
            previousDefault: getDefaultConnection(),
            newDefault: connectionName
          }
        };
      } catch (error) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    // Añadir nueva conexión
    this.router.post('/api/connections', async (ctx) => {
      try {
        const body = await ctx.request.body({ type: 'json' }).value;
        const config: DatabaseConfig = body;

        // Validar campos requeridos
        if (!config.name || !config.user || !config.password || !config.connectString) {
          ctx.response.status = 400;
          ctx.response.body = {
            success: false,
            error: 'Campos requeridos: name, user, password, connectString'
          };
          return;
        }

        await addConnection(config);
        
        ctx.response.status = 201;
        ctx.response.body = {
          success: true,
          message: `Conexión '${config.name}' añadida exitosamente`,
          data: {
            name: config.name,
            description: config.description,
            connectString: config.connectString
          }
        };
      } catch (error) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    // Información detallada de una conexión específica
    this.router.get('/api/connections/:name', (ctx) => {
      try {
        const connectionName = ctx.params.name;
        const connections = getConnectionsInfo();
        const connection = connections.find(c => c.name === connectionName);

        if (!connection) {
          ctx.response.status = 404;
          ctx.response.body = {
            success: false,
            error: `Conexión '${connectionName}' no encontrada`,
            available: connections.map(c => c.name)
          };
          return;
        }

        ctx.response.body = {
          success: true,
          data: connection
        };
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    // Estadísticas de conexiones
    this.router.get('/api/connections/stats/summary', (ctx) => {
      try {
        const connections = getConnectionsInfo();
        const now = new Date();
        
        const stats = {
          total: connections.length,
          active: connections.filter(c => c.isActive).length,
          inactive: connections.filter(c => !c.isActive).length,
          oldestConnection: connections.reduce((oldest, current) => 
            current.createdAt < oldest.createdAt ? current : oldest
          ).name,
          mostRecentlyUsed: connections.reduce((recent, current) => 
            current.lastUsed > recent.lastUsed ? current : recent
          ).name,
          totalPools: connections.reduce((sum, c) => 
            sum + (c.poolStats?.poolMax || 0), 0
          ),
          connectionsInUse: connections.reduce((sum, c) => 
            sum + (c.poolStats?.connectionsInUse || 0), 0
          ),
          connectionsOpen: connections.reduce((sum, c) => 
            sum + (c.poolStats?.connectionsOpen || 0), 0
          )
        };

        ctx.response.body = {
          success: true,
          data: stats,
          timestamp: now.toISOString()
        };
      } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    // Documentación de endpoints de conexiones
    this.router.get('/api/connections/help', (ctx) => {
      ctx.response.body = {
        success: true,
        data: {
          title: 'API de Gestión de Conexiones Oracle',
          description: 'Endpoints para gestionar múltiples conexiones a bases de datos Oracle',
          endpoints: [
            {
              method: 'GET',
              path: '/api/connections',
              description: 'Listar todas las conexiones disponibles'
            },
            {
              method: 'GET', 
              path: '/api/connections/:name',
              description: 'Información detallada de una conexión específica'
            },
            {
              method: 'GET',
              path: '/api/connections/:name/test',
              description: 'Probar conectividad de una conexión'
            },
            {
              method: 'GET',
              path: '/api/connections/test-all',
              description: 'Probar conectividad de todas las conexiones'
            },
            {
              method: 'PUT',
              path: '/api/connections/:name/set-default',
              description: 'Establecer conexión por defecto'
            },
            {
              method: 'POST',
              path: '/api/connections',
              description: 'Añadir nueva conexión'
            },
            {
              method: 'GET',
              path: '/api/connections/stats/summary',
              description: 'Estadísticas generales de conexiones'
            }
          ],
          examples: {
            addConnection: {
              method: 'POST',
              url: '/api/connections',
              body: {
                name: 'nueva_db',
                user: 'usuario',
                password: 'contraseña',
                connectString: 'host:puerto/servicio',
                description: 'Nueva base de datos',
                poolMax: 10
              }
            },
            testConnection: {
              method: 'GET',
              url: '/api/connections/produccion/test'
            }
          }
        }
      };
    });
  }

  getRouter(): Router {
    return this.router;
  }

  static getRouter(): Router {
    return new DatabaseConnectionRouter().getRouter();
  }
}

export default DatabaseConnectionRouter;
