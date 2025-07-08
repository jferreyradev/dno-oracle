/**
 * MultiQueryRouter - Rutas para ejecutar consultas SQL directas con soporte multi-conexión
 */

import { Router } from 'https://deno.land/x/oak@v12.6.1/mod.ts';
import type { Context } from 'https://deno.land/x/oak@v12.6.1/mod.ts';
import { MultiQueryController, type MultiQueryRequest } from './MultiQueryController.ts';

export class MultiQueryRouter {
  private router: Router;
  private queryController: MultiQueryController;

  constructor() {
    this.router = new Router();
    this.queryController = new MultiQueryController();
    this.setupRoutes();
  }

  private setupRoutes() {
    // POST /api/query - Ejecutar cualquier consulta SQL (ruta genérica)
    this.router.post('/api/query', async (ctx) => {
      await this.handleQuery(ctx, 'generic');
    });

    // POST /api/query/select - Ejecutar consulta SELECT
    this.router.post('/api/query/select', async (ctx) => {
      await this.handleQuery(ctx, 'select');
    });

    // POST /api/query/modify - Ejecutar consulta de modificación
    this.router.post('/api/query/modify', async (ctx) => {
      await this.handleQuery(ctx, 'modify');
    });

    // GET /api/query/connections - Listar conexiones disponibles
    this.router.get('/api/query/connections', async (ctx) => {
      try {
        const result = await this.queryController.getConnections();
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

    // POST /api/query/test-connection - Probar una conexión específica
    this.router.post('/api/query/test-connection', async (ctx) => {
      try {
        const body = await ctx.request.body({ type: 'json' }).value as { connectionName?: string };
        const result = await this.queryController.testConnection(ctx, body.connectionName);
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
  }

  /**
   * Manejar consultas con soporte multi-conexión
   */
  private async handleQuery(ctx: Context, queryType: 'generic' | 'select' | 'modify') {
    try {
      const body = await ctx.request.body({ type: 'json' }).value as MultiQueryRequest;
      
      if (!body.sql) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: 'El campo sql es requerido'
        };
        return;
      }

      let result;
      
      switch (queryType) {
        case 'select':
          result = await this.queryController.executeSelect(ctx, body);
          break;
        case 'modify':
          result = await this.queryController.executeModification(ctx, body);
          break;
        default: // generic
          // Determinar el tipo de consulta automáticamente
          const sql = body.sql.trim().toUpperCase();
          if (sql.startsWith('SELECT') || sql.startsWith('WITH')) {
            result = await this.queryController.executeSelect(ctx, body);
          } else if (sql.startsWith('INSERT') || sql.startsWith('UPDATE') || sql.startsWith('DELETE') || sql.startsWith('MERGE')) {
            result = await this.queryController.executeModification(ctx, body);
          } else {
            ctx.response.status = 400;
            ctx.response.body = {
              success: false,
              error: 'Tipo de consulta no soportado. Use SELECT, INSERT, UPDATE, DELETE o MERGE'
            };
            return;
          }
      }
      
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
  }

  /**
   * Obtener el router para uso en la aplicación principal
   */
  getRouter(): Router {
    return this.router;
  }
}
