/**
 * Rutas para ejecutar procedimientos almacenados de Oracle
 */

import { Router } from 'https://deno.land/x/oak@v12.6.1/mod.ts';
import { ProcedureController } from './ProcedureController.ts';

export class ProcedureRouter {
  static getRouter(): Router {
    const router = new Router();

    // Ejecutar procedimiento almacenado básico
    router.post('/api/procedures/call', ProcedureController.callProcedure);

    // Ejecutar función almacenada
    router.post('/api/procedures/function', ProcedureController.callFunction);

    // Ejecutar procedimiento que retorna cursor
    router.post('/api/procedures/cursor', ProcedureController.callProcedureWithCursor);

    // Listar procedimientos y funciones disponibles
    router.get('/api/procedures/list', ProcedureController.listProcedures);

    // Obtener información de un procedimiento específico
    router.get('/api/procedures/info/:procedureName', ProcedureController.getProcedureInfo);

    // Endpoint de ayuda/documentación
    router.get('/api/procedures/help', (ctx) => {
      ctx.response.body = {
        success: true,
        data: {
          endpoints: [
            {
              method: 'POST',
              path: '/api/procedures/call',
              description: 'Ejecuta un procedimiento almacenado básico',
              example: {
                procedureName: 'SCHEMA.PROCEDURE_NAME',
                params: {
                  param1: 'valor1',
                  param2: 123,
                  outParam: { dir: 'OUT', type: 'STRING' }
                },
                options: { autoCommit: true }
              }
            },
            {
              method: 'POST',
              path: '/api/procedures/function',
              description: 'Ejecuta una función almacenada que retorna un valor',
              example: {
                functionName: 'SCHEMA.FUNCTION_NAME',
                params: {
                  param1: 'valor1',
                  param2: 123
                },
                returnType: { type: 'STRING' },
                options: { autoCommit: true }
              }
            },
            {
              method: 'POST',
              path: '/api/procedures/cursor',
              description: 'Ejecuta un procedimiento que retorna un REF CURSOR',
              example: {
                procedureName: 'SCHEMA.PROCEDURE_WITH_CURSOR',
                params: {
                  param1: 'valor1',
                  param2: 123
                },
                options: { autoCommit: true }
              }
            },
            {
              method: 'GET',
              path: '/api/procedures/list',
              description: 'Lista todos los procedimientos y funciones disponibles',
              queryParams: {
                owner: 'nombre_del_esquema (opcional)',
                type: 'PROCEDURE|FUNCTION|ALL (opcional, default: ALL)'
              }
            },
            {
              method: 'GET',
              path: '/api/procedures/info/:procedureName',
              description: 'Obtiene información detallada de un procedimiento específico',
              queryParams: {
                owner: 'nombre_del_esquema (opcional)'
              }
            }
          ],
          parameterTypes: {
            input: 'Parámetros de entrada: valor directo (string, number, etc.)',
            output: 'Parámetros de salida: { dir: "OUT", type: "STRING|NUMBER|DATE|CLOB|BLOB" }',
            inout: 'Parámetros entrada/salida: { val: valor, dir: "IN_OUT", type: "STRING" }'
          },
          supportedTypes: [
            'STRING', 'NUMBER', 'DATE', 'TIMESTAMP', 'CLOB', 'BLOB', 'RAW'
          ]
        },
        message: 'Documentación de la API de procedimientos almacenados'
      };
    });

    return router;
  }
}
