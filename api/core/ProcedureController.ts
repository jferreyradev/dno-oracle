/**
 * Controlador para ejecutar procedimientos almacenados de Oracle
 */

import { RouterContext } from 'https://deno.land/x/oak@v12.6.1/mod.ts';
import * as db from './DatabaseService.ts';

// Interfaces para los tipos de datos
interface ProcedureResult {
  procedureName?: string;
  executedAt?: Date;
  outBinds?: Record<string, unknown>;
  rowsAffected?: number;
}

interface FunctionResult {
  functionName?: string;
  returnValue?: unknown;
  executedAt?: Date;
  outBinds?: Record<string, unknown>;
}

interface CursorResult {
  procedureName?: string;
  rows?: unknown[];
  rowsAffected?: number;
  executedAt?: Date;
  outBinds?: Record<string, unknown>;
}

interface ObjectInfo {
  OWNER: string;
  OBJECT_NAME: string;
  OBJECT_TYPE: string;
  STATUS: string;
  CREATED: Date;
  LAST_DDL_TIME: Date;
}

interface Parameter {
  ARGUMENT_NAME?: string;
  DATA_TYPE: string;
  IN_OUT: string;
  POSITION: number;
  SEQUENCE: number;
  DATA_LENGTH?: number;
  DATA_PRECISION?: number;
  DATA_SCALE?: number;
  DEFAULT_VALUE?: string;
}

export class ProcedureController {
  
  /**
   * Ejecuta un procedimiento almacenado básico
   */
  static async callProcedure(ctx: RouterContext<string>) {
    try {
      const body = await ctx.request.body().value;
      
      if (!body.procedureName) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: 'El nombre del procedimiento es requerido'
        };
        return;
      }

      const { procedureName, params = {}, options = {} } = body;

      console.log(`Ejecutando procedimiento: ${procedureName}`);
      console.log('Parámetros:', JSON.stringify(params, null, 2));

      const result = await db.callProcedure(procedureName, params, options) as ProcedureResult;

      ctx.response.body = {
        success: true,
        data: {
          procedureName: result.procedureName,
          executedAt: result.executedAt,
          outBinds: result.outBinds || {},
          rowsAffected: result.rowsAffected || 0
        },
        message: `Procedimiento ${procedureName} ejecutado exitosamente`
      };

    } catch (error) {
      console.error('Error ejecutando procedimiento:', error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        message: 'Error ejecutando procedimiento',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Ejecuta una función almacenada que retorna un valor
   */
  static async callFunction(ctx: RouterContext<string>) {
    try {
      const body = await ctx.request.body().value;
      
      if (!body.functionName) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: 'El nombre de la función es requerido'
        };
        return;
      }

      const { functionName, params = {}, returnType = { type: 'STRING' }, options = {} } = body;

      console.log(`Ejecutando función: ${functionName}`);
      console.log('Parámetros:', JSON.stringify(params, null, 2));

      // Convertir tipo de retorno string a constante de oracledb
      let actualReturnType = returnType;
      if (typeof returnType.type === 'string') {
        const oracledb = await import('npm:oracledb@6.0.2');
        const typeMapping: { [key: string]: number } = {
          'STRING': oracledb.default.STRING,
          'NUMBER': oracledb.default.NUMBER,
          'DATE': oracledb.default.DATE,
          'CLOB': oracledb.default.CLOB,
          'BLOB': oracledb.default.BLOB
        };
        
        actualReturnType = {
          ...returnType,
          type: typeMapping[returnType.type] || oracledb.default.STRING
        };
      }

      const result = await db.callFunction(functionName, params, actualReturnType, options) as FunctionResult;

      ctx.response.body = {
        success: true,
        data: {
          functionName: result.functionName,
          returnValue: result.returnValue,
          executedAt: result.executedAt,
          outBinds: result.outBinds || {}
        },
        message: `Función ${functionName} ejecutada exitosamente`
      };

    } catch (error) {
      console.error('Error ejecutando función:', error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        message: 'Error ejecutando función',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Ejecuta un procedimiento que retorna un cursor (REF CURSOR)
   */
  static async callProcedureWithCursor(ctx: RouterContext<string>) {
    try {
      const body = await ctx.request.body().value;
      
      if (!body.procedureName) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: 'El nombre del procedimiento es requerido'
        };
        return;
      }

      const { procedureName, params = {}, options = {} } = body;

      console.log(`Ejecutando procedimiento con cursor: ${procedureName}`);
      console.log('Parámetros:', JSON.stringify(params, null, 2));

      const result = await db.callProcedureWithCursor(procedureName, params, options) as CursorResult;

      ctx.response.body = {
        success: true,
        data: {
          procedureName: result.procedureName,
          rows: result.rows,
          rowsAffected: result.rowsAffected,
          executedAt: result.executedAt,
          outBinds: result.outBinds || {}
        },
        message: `Procedimiento ${procedureName} ejecutado exitosamente - ${result.rowsAffected} filas obtenidas`
      };

    } catch (error) {
      console.error('Error ejecutando procedimiento con cursor:', error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        message: 'Error ejecutando procedimiento con cursor',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Lista procedimientos y funciones disponibles en el esquema
   */
  static async listProcedures(ctx: RouterContext<string>) {
    try {
      const queryParams = ctx.request.url.searchParams;
      const owner = queryParams.get('owner') || null;
      const type = queryParams.get('type') || 'ALL'; // PROCEDURE, FUNCTION, ALL

      let whereClause = '';
      const binds: { [key: string]: string } = {};

      if (owner) {
        whereClause += ' AND OWNER = :owner';
        binds.owner = owner.toUpperCase();
      }

      if (type !== 'ALL') {
        whereClause += ' AND OBJECT_TYPE = :object_type';
        binds.object_type = type.toUpperCase();
      }

      const sql = `
        SELECT 
          OWNER,
          OBJECT_NAME,
          OBJECT_TYPE,
          STATUS,
          CREATED,
          LAST_DDL_TIME
        FROM ALL_OBJECTS 
        WHERE OBJECT_TYPE IN ('PROCEDURE', 'FUNCTION')
        ${whereClause}
        ORDER BY OWNER, OBJECT_TYPE, OBJECT_NAME
      `;

      const result = await db.querySQL(sql, binds);

      // Obtener información adicional de parámetros para cada procedimiento/función
      const enrichedResults = [];
      for (const obj of result) {
        const paramsResult = await db.querySQL(`
          SELECT 
            ARGUMENT_NAME,
            DATA_TYPE,
            IN_OUT,
            POSITION,
            SEQUENCE
          FROM ALL_ARGUMENTS 
          WHERE OWNER = :owner 
            AND OBJECT_NAME = :object_name 
            AND PACKAGE_NAME IS NULL
          ORDER BY POSITION, SEQUENCE
        `, {
          owner: obj.OWNER,
          object_name: obj.OBJECT_NAME
        });

        enrichedResults.push({
          ...obj,
          parameters: paramsResult
        });
      }

      ctx.response.body = {
        success: true,
        data: enrichedResults,
        message: `${enrichedResults.length} procedimientos/funciones encontrados`
      };

    } catch (error) {
      console.error('Error listando procedimientos:', error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        message: 'Error listando procedimientos',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Obtiene información detallada de un procedimiento específico
   */
  static async getProcedureInfo(ctx: RouterContext<string>) {
    try {
      const { procedureName } = ctx.params;
      const queryParams = ctx.request.url.searchParams;
      const owner = queryParams.get('owner') || null;

      if (!procedureName) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: 'El nombre del procedimiento es requerido'
        };
        return;
      }

      const binds: { [key: string]: string } = {
        object_name: procedureName.toUpperCase()
      };

      let whereClause = '';
      if (owner) {
        whereClause = ' AND OWNER = :owner';
        binds.owner = owner.toUpperCase();
      }

      // Información básica del objeto
      const objectInfo = await db.querySQL(`
        SELECT 
          OWNER,
          OBJECT_NAME,
          OBJECT_TYPE,
          STATUS,
          CREATED,
          LAST_DDL_TIME
        FROM ALL_OBJECTS 
        WHERE OBJECT_NAME = :object_name 
          AND OBJECT_TYPE IN ('PROCEDURE', 'FUNCTION')
          ${whereClause}
      `, binds);

      if (objectInfo.length === 0) {
        ctx.response.status = 404;
        ctx.response.body = {
          success: false,
          message: 'Procedimiento/función no encontrado'
        };
        return;
      }

      // Parámetros del procedimiento/función
      const parameters = await db.querySQL(`
        SELECT 
          ARGUMENT_NAME,
          DATA_TYPE,
          IN_OUT,
          POSITION,
          SEQUENCE,
          DATA_LENGTH,
          DATA_PRECISION,
          DATA_SCALE,
          DEFAULT_VALUE
        FROM ALL_ARGUMENTS 
        WHERE OWNER = :owner 
          AND OBJECT_NAME = :object_name 
          AND PACKAGE_NAME IS NULL
        ORDER BY POSITION, SEQUENCE
      `, {
        owner: objectInfo[0].OWNER,
        object_name: objectInfo[0].OBJECT_NAME
      });

      // Código fuente (si está disponible)
      let sourceCode = null;
      try {
        const sourceResult = await db.querySQL(`
          SELECT TEXT
          FROM ALL_SOURCE 
          WHERE OWNER = :owner 
            AND NAME = :object_name 
            AND TYPE = :object_type
          ORDER BY LINE
        `, {
          owner: objectInfo[0].OWNER,
          object_name: objectInfo[0].OBJECT_NAME,
          object_type: objectInfo[0].OBJECT_TYPE
        });

        if (sourceResult.length > 0) {
          sourceCode = sourceResult.map((row: Record<string, unknown>) => row.TEXT).join('');
        }
      } catch (sourceError) {
        console.warn('No se pudo obtener el código fuente:', sourceError);
      }

      ctx.response.body = {
        success: true,
        data: {
          ...objectInfo[0],
          parameters,
          sourceCode,
          exampleUsage: this.generateExampleUsage(objectInfo[0], parameters)
        },
        message: `Información de ${objectInfo[0].OBJECT_TYPE.toLowerCase()} obtenida exitosamente`
      };

    } catch (error) {
      console.error('Error obteniendo información del procedimiento:', error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        message: 'Error obteniendo información del procedimiento',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Genera ejemplo de uso para un procedimiento/función
   */
  private static generateExampleUsage(objectInfo: ObjectInfo, parameters: Parameter[]): Record<string, unknown> {
    const isFunction = objectInfo.OBJECT_TYPE === 'FUNCTION';
    const inputParams: { [key: string]: unknown } = {};
    const outputParams: { [key: string]: unknown } = {};

    parameters.forEach(param => {
      if (param.ARGUMENT_NAME) { // Excluir el valor de retorno de funciones
        const example = this.getExampleValue(param.DATA_TYPE);
        
        if (param.IN_OUT === 'IN' || param.IN_OUT === 'IN/OUT') {
          inputParams[param.ARGUMENT_NAME] = example;
        }
        
        if (param.IN_OUT === 'OUT' || param.IN_OUT === 'IN/OUT') {
          outputParams[param.ARGUMENT_NAME] = {
            dir: 'OUT',
            type: param.DATA_TYPE
          };
        }
      }
    });

    const endpoint = isFunction ? '/api/procedures/function' : '/api/procedures/call';
    const nameField = isFunction ? 'functionName' : 'procedureName';

    const example: Record<string, unknown> = {
      method: 'POST',
      url: endpoint,
      body: {
        [nameField]: `${objectInfo.OWNER}.${objectInfo.OBJECT_NAME}`,
        params: { ...inputParams, ...outputParams }
      }
    };

    if (isFunction) {
      (example.body as Record<string, unknown>).returnType = { type: 'STRING' };
    }

    return example;
  }

  /**
   * Genera valor de ejemplo para un tipo de dato
   */
  private static getExampleValue(dataType: string): string | number {
    switch (dataType.toUpperCase()) {
      case 'NUMBER':
        return 123;
      case 'VARCHAR2':
      case 'CHAR':
      case 'NVARCHAR2':
      case 'NCHAR':
        return 'ejemplo';
      case 'DATE':
        return '2024-01-01';
      case 'TIMESTAMP':
        return '2024-01-01 12:00:00';
      case 'CLOB':
        return 'texto largo';
      default:
        return 'valor';
    }
  }
}
