/**
 * QueryRouter - Rutas para ejecutar consultas SQL directas
 */

import { Router } from 'https://deno.land/x/oak@v12.6.1/mod.ts';
import { QueryController, type QueryRequest } from './QueryController.ts';

export class QueryRouter {
  private router: Router;
  private queryController: QueryController;

  constructor() {
    this.router = new Router();
    this.queryController = new QueryController();
    this.setupRoutes();
  }

  private setupRoutes() {
    // POST /api/query/select - Ejecutar consulta SELECT
    this.router.post('/api/query/select', async (ctx) => {
      try {
        const body = await ctx.request.body({ type: 'json' }).value as QueryRequest;
        
        if (!body.sql) {
          ctx.response.status = 400;
          ctx.response.body = {
            success: false,
            error: 'El campo sql es requerido'
          };
          return;
        }

        const result = await this.queryController.executeSelect(body);
        
        ctx.response.status = result.success ? 200 : 400;
        ctx.response.body = result;

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          error: errorMessage
        };
      }
    });

    // POST /api/query/modify - Ejecutar consulta de modificación
    this.router.post('/api/query/modify', async (ctx) => {
      try {
        const body = await ctx.request.body({ type: 'json' }).value as QueryRequest;
        
        if (!body.sql) {
          ctx.response.status = 400;
          ctx.response.body = {
            success: false,
            error: 'El campo sql es requerido'
          };
          return;
        }

        const result = await this.queryController.executeModification(body);
        
        ctx.response.status = result.success ? 200 : 400;
        ctx.response.body = result;

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          error: errorMessage
        };
      }
    });

    // POST /api/query/explain - Obtener plan de ejecución
    this.router.post('/api/query/explain', async (ctx) => {
      try {
        const body = await ctx.request.body({ type: 'json' }).value as QueryRequest;
        
        if (!body.sql) {
          ctx.response.status = 400;
          ctx.response.body = {
            success: false,
            error: 'El campo sql es requerido'
          };
          return;
        }

        const result = await this.queryController.explainQuery(body);
        
        ctx.response.status = result.success ? 200 : 400;
        ctx.response.body = result;

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          error: errorMessage
        };
      }
    });

    // POST /api/query/validate - Validar consulta sin ejecutar
    this.router.post('/api/query/validate', async (ctx) => {
      try {
        const body = await ctx.request.body({ type: 'json' }).value as QueryRequest;
        
        if (!body.sql) {
          ctx.response.status = 400;
          ctx.response.body = {
            success: false,
            error: 'El campo sql es requerido'
          };
          return;
        }

        const result = await this.queryController.validateQuery(body);
        
        ctx.response.status = result.success ? 200 : 400;
        ctx.response.body = result;

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          error: errorMessage
        };
      }
    });

    // GET /api/query/tables/{tableName}/stats - Estadísticas de tabla
    this.router.get('/api/query/tables/:tableName/stats', async (ctx) => {
      try {
        const tableName = ctx.params.tableName;
        
        if (!tableName) {
          ctx.response.status = 400;
          ctx.response.body = {
            success: false,
            error: 'El nombre de la tabla es requerido'
          };
          return;
        }

        const result = await this.queryController.getTableStats(tableName);
        
        ctx.response.status = result.success ? 200 : 400;
        ctx.response.body = result;

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
        ctx.response.status = 500;
        ctx.response.body = {
          success: false,
          error: errorMessage
        };
      }
    });

    // GET /api/query/info - Información sobre el servicio de consultas
    this.router.get('/api/query/info', (ctx) => {
      ctx.response.body = {
        service: 'Query Service',
        version: '1.0.0',
        description: 'Servicio para ejecutar consultas SQL directas',
        endpoints: {
          select: {
            method: 'POST',
            path: '/api/query/select',
            description: 'Ejecutar consultas SELECT',
            example: {
              sql: 'SELECT * FROM usuarios WHERE activo = :activo',
              params: { activo: true },
              options: { maxRows: 100 }
            }
          },
          modify: {
            method: 'POST',
            path: '/api/query/modify',
            description: 'Ejecutar consultas INSERT, UPDATE, DELETE',
            example: {
              sql: 'UPDATE usuarios SET activo = :activo WHERE id = :id',
              params: { activo: false, id: 1 },
              options: { autoCommit: true }
            }
          },
          explain: {
            method: 'POST',
            path: '/api/query/explain',
            description: 'Obtener plan de ejecución',
            example: {
              sql: 'SELECT * FROM usuarios WHERE email = :email',
              params: { email: 'test@example.com' }
            }
          },
          validate: {
            method: 'POST',
            path: '/api/query/validate',
            description: 'Validar sintaxis sin ejecutar',
            example: {
              sql: 'SELECT COUNT(*) FROM usuarios'
            }
          },
          tableStats: {
            method: 'GET',
            path: '/api/query/tables/{tableName}/stats',
            description: 'Obtener estadísticas de tabla'
          }
        },
        security: {
          allowedOperations: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'WITH'],
          blockedOperations: ['DROP', 'TRUNCATE', 'ALTER', 'CREATE', 'GRANT', 'REVOKE'],
          maxRows: 1000,
          autoCommit: 'Configurable por consulta'
        }
      };
    });
  }

  getRouter(): Router {
    return this.router;
  }
}
