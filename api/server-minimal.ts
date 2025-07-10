/**
 * DNO-Oracle - Servidor Mínimo Funcional
 * 
 * Servidor básico para probar la conectividad Oracle
 * y funcionalidad básica de entidades
 */

import { Application, Router } from 'https://deno.land/x/oak@v12.6.1/mod.ts';
import { oakCors } from 'https://deno.land/x/cors@v1.2.2/mod.ts';
import { MultiDatabaseService } from './core/MultiDatabaseService.ts';
import { entityConfig } from './core/EntityConfig.ts';

// Función auxiliar para obtener el siguiente ID auto-incremental
async function getNextAutoIncrementId(entity: any, connectionName: string): Promise<number> {
  try {
    const sql = `SELECT NVL(MAX(${entity.primaryKey}), 0) + 1 as NEXT_ID FROM ${entity.tableName}`;
    const result = await multiDbService.querySQL(sql, [], connectionName);
    const nextId = result.rows?.[0]?.NEXT_ID || 1;
    return nextId;
  } catch (error) {
    console.error(`❌ Error obteniendo siguiente ID para ${entity.tableName}:`, error);
    return 1; // Fallback
  }
}

const app = new Application();
const router = new Router();

// Servicios globales
let multiDbService: MultiDatabaseService;

// Configurar CORS
app.use(oakCors({
  origin: "*",
  credentials: true,
}));

// Middleware para parsing de JSON
app.use(async (ctx, next) => {
  if (ctx.request.hasBody) {
    const body = ctx.request.body();
    if (body.type === "json") {
      try {
        ctx.state.requestBody = await body.value;
      } catch (error) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Invalid JSON in request body",
          details: error.message
        };
        return;
      }
    }
  }
  await next();
});

// Middleware para logging
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.request.method} ${ctx.request.url} - ${ms}ms`);
});

// Health check
router.get('/api/health', (ctx) => {
  ctx.response.body = {
    success: true,
    message: 'DNO-Oracle API está funcionando',
    timestamp: new Date().toISOString(),
    mode: 'minimal',
    version: '1.0.0'
  };
});

// Info de la API
router.get('/api/info', (ctx) => {
  ctx.response.body = {
    success: true,
    data: {
      name: 'DNO-Oracle API',
      version: '1.0.0',
      mode: 'minimal',
      description: 'API REST genérica para Oracle Database',
      endpoints: [
        'GET /api/health',
        'GET /api/info',
        'GET /api/connections',
        'GET /api/connections/test-all',
        'GET /api/entities',
        'GET /api/{entidad}',
        'POST /api/{entidad}',
        'PUT /api/{entidad}/{id}',
        'DELETE /api/{entidad}/{id}',
        'POST /api/{entidad}/batch',
        'POST /api/procedures/{procedureName}',
        'POST /api/functions/{functionName}'
      ],
      features: {
        multiConnectionSupport: true,
        pagination: true,
        dynamicConnectionSelection: true,
        crudOperations: true,
        batchOperations: true,
        storedProcedures: true,
        storedFunctions: true
      }
    }
  };
});

// Listar conexiones disponibles
router.get('/api/connections', async (ctx) => {
  try {
    const connections = multiDbService.getConnectionsInfo();
    
    ctx.response.body = {
      success: true,
      data: {
        connections: connections.map(conn => ({
          name: conn.name,
          status: conn.isActive ? 'active' : 'inactive',
          isDefault: conn.name === multiDbService.getDefaultConnection(),
          description: conn.config.description,
          createdAt: conn.createdAt,
          lastUsed: conn.lastUsed,
          poolStats: conn.poolStats
        })),
        summary: {
          total: connections.length,
          active: connections.filter(c => c.isActive).length,
          default: multiDbService.getDefaultConnection()
        }
      }
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: 'Error al obtener conexiones',
      details: error.message
    };
  }
});

// Probar todas las conexiones
router.get('/api/connections/test-all', async (ctx) => {
  try {
    const connections = multiDbService.getConnectionsInfo();
    const results = [];
    
    for (const connection of connections) {
      try {
        const testResult = await multiDbService.testConnection(connection.name);
        results.push({
          name: connection.name,
          status: testResult.success ? 'connected' : 'error',
          message: testResult.message,
          details: testResult.details
        });
      } catch (error) {
        results.push({
          name: connection.name,
          status: 'error',
          message: error.message
        });
      }
    }
    
    ctx.response.body = {
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          connected: results.filter(r => r.status === 'connected').length,
          failed: results.filter(r => r.status === 'error').length
        }
      }
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: 'Error al probar conexiones',
      details: error.message
    };
  }
});

// Listar entidades configuradas
router.get('/api/entities', async (ctx) => {
  try {
    const entityNames = await entityConfig.getEntityNames();
    const entities = [];
    
    for (const name of entityNames) {
      const entity = await entityConfig.getEntityConfig(name);
      if (entity) {
        entities.push({
          name,
          tableName: entity.tableName,
          primaryKey: entity.primaryKey,
          displayName: entity.displayName || name,
          description: entity.description,
          operations: entity.operations,
          defaultConnection: entity.defaultConnection || 'default',
          allowedConnections: entity.allowedConnections || [entity.defaultConnection || 'default']
        });
      }
    }
    
    ctx.response.body = {
      success: true,
      data: {
        entities,
        summary: {
          total: entities.length,
          availableOperations: entities.map(e => e.operations || {}),
          connectionsUsed: [...new Set(entities.map(e => e.defaultConnection))],
          multiConnectionSupport: true
        }
      }
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: 'Error al obtener entidades',
      details: error.message
    };
  }
});

// Endpoint básico para entidades - GET
router.get('/api/:entity', async (ctx) => {
  const entityName = ctx.params.entity;
  
  try {
    const entity = await entityConfig.getEntityConfig(entityName);
    if (!entity) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        error: `Entidad '${entityName}' no encontrada`
      };
      return;
    }
    
    // Obtener parámetros de paginación
    const limit = Math.min(parseInt(ctx.request.url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(ctx.request.url.searchParams.get('offset') || '0');
    
    // Obtener conexión especificada o usar la por defecto
    const requestedConnection = ctx.request.url.searchParams.get('connection');
    let connectionName = entity.defaultConnection || 'default';
    
    // Validar conexión solicitada
    if (requestedConnection) {
      if (entity.allowedConnections && entity.allowedConnections.includes(requestedConnection)) {
        connectionName = requestedConnection;
      } else {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: `Conexión '${requestedConnection}' no permitida para entidad '${entityName}'`,
          allowedConnections: entity.allowedConnections || [connectionName]
        };
        return;
      }
    }
    
    // Construir consulta SQL con paginación Oracle
    const sql = `
      SELECT * FROM (
        SELECT a.*, ROWNUM rnum FROM (
          SELECT * FROM ${entity.tableName} ORDER BY ${entity.primaryKey}
        ) a WHERE ROWNUM <= ${limit + offset}
      ) WHERE rnum > ${offset}
    `;
    
    const result = await multiDbService.querySQL(sql, [], connectionName);
    
    ctx.response.body = {
      success: true,
      data: result.rows || [],
      pagination: {
        limit,
        offset,
        totalRows: result.rows?.length || 0
      },
      meta: {
        entity: entityName,
        tableName: entity.tableName,
        primaryKey: entity.primaryKey,
        displayName: entity.displayName,
        connectionUsed: connectionName,
        availableConnections: entity.allowedConnections || [connectionName]
      }
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: `Error al consultar entidad '${entityName}'`,
      details: error.message
    };
  }
});

// Ruta raíz - información básica
router.get('/', (ctx) => {
  ctx.response.body = {
    success: true,
    message: 'DNO-Oracle API - Servidor Mínimo',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      info: '/api/info',
      connections: '/api/connections',
      entities: '/api/entities'
    },
    documentation: 'Ver /api/info para más detalles'
  };
});

// ========================================
// OPERACIONES CRUD - CREATE (POST)
// ========================================

// Insertar nuevo registro en entidad
router.post('/api/:entity', async (ctx) => {
  const entityName = ctx.params.entity;
  const requestBody = ctx.state.requestBody;
  
  if (!requestBody) {
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      error: "Request body is required for INSERT operations",
      example: {
        "DESCRIPCION": "Nuevo proceso",
        "ESTADO": "ACTIVO"
      }
    };
    return;
  }

  try {
    const entity = await entityConfig.getEntityConfig(entityName);
    if (!entity) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        error: `Entidad '${entityName}' no encontrada`,
        availableEntities: await entityConfig.getEntityNames()
      };
      return;
    }

    // Obtener conexión especificada o usar la por defecto
    const requestedConnection = ctx.request.url.searchParams.get('connection');
    let connectionName = entity.defaultConnection || 'default';
    
    if (requestedConnection) {
      if (entity.allowedConnections && entity.allowedConnections.includes(requestedConnection)) {
        connectionName = requestedConnection;
      } else {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: `Conexión '${requestedConnection}' no permitida para entidad '${entityName}'`,
          allowedConnections: entity.allowedConnections || [connectionName]
        };
        return;
      }
    }

    // Filtrar campos auto-incrementales y readonly
    const entityFields = entity.fields || {};
    const filteredData = {};
    
    // Verificar si necesitamos auto-incremento para primary key
    const primaryKeyField = entityFields[entity.primaryKey];
    const needsAutoIncrement = entity.autoIncrement === true && 
                               primaryKeyField?.autoIncrement === true && 
                               !requestBody.hasOwnProperty(entity.primaryKey);
    
    // Si necesita auto-incremento, generar el siguiente ID
    if (needsAutoIncrement) {
      const nextId = await getNextAutoIncrementId(entity, connectionName);
      filteredData[entity.primaryKey] = nextId;
    }
    
    // Procesar demás campos del requestBody
    for (const [key, value] of Object.entries(requestBody)) {
      const fieldConfig = entityFields[key];
      
      // Excluir campos auto-incrementales, readonly
      if (fieldConfig) {
        const isAutoIncrement = fieldConfig.autoIncrement === true;
        const isReadonly = fieldConfig.readonly === true;
        
        if (!isAutoIncrement && !isReadonly) {
          filteredData[key] = value;
        }
      } else {
        // Si no hay configuración del campo, incluirlo (compatibilidad hacia atrás)
        filteredData[key] = value;
      }
    }
    
    // Construir consulta INSERT con campos filtrados
    const fields = Object.keys(filteredData);
    const values = Object.values(filteredData);
    
    if (fields.length === 0) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: "No hay campos válidos para insertar (todos son auto-incrementales o readonly)",
        availableFields: Object.keys(entityFields).filter(key => {
          const field = entityFields[key];
          return !field.autoIncrement && !field.readonly && !(field.primaryKey && entity.autoIncrement);
        })
      };
      return;
    }
    
    const placeholders = fields.map((_, index) => `:${index + 1}`).join(', ');
    const sql = `INSERT INTO ${entity.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
    
    const result = await multiDbService.executeSQL(sql, values, connectionName);
    
    ctx.response.status = 201;
    ctx.response.body = {
      success: true,
      message: `Registro insertado en '${entityName}' exitosamente`,
      data: {
        insertedFields: fields,
        affectedRows: result.rowsAffected || 1
      },
      metadata: {
        entity: entityName,
        tableName: entity.tableName,
        connection: connectionName,
        operation: "INSERT",
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: `Error al insertar en '${entityName}'`,
      details: error.message,
      sqlState: error.errorNum || null
    };
  }
});

// ========================================
// OPERACIONES CRUD - UPDATE (PUT)
// ========================================

// Actualizar registro por ID
router.put('/api/:entity/:id', async (ctx) => {
  const entityName = ctx.params.entity;
  const recordId = ctx.params.id;
  const requestBody = ctx.state.requestBody;
  
  if (!requestBody) {
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      error: "Request body is required for UPDATE operations",
      example: {
        "DESCRIPCION": "Proceso actualizado",
        "ESTADO": "MODIFICADO"
      }
    };
    return;
  }

  try {
    const entity = await entityConfig.getEntityConfig(entityName);
    if (!entity) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        error: `Entidad '${entityName}' no encontrada`,
        availableEntities: await entityConfig.getEntityNames()
      };
      return;
    }

    // Obtener conexión
    const requestedConnection = ctx.request.url.searchParams.get('connection');
    let connectionName = entity.defaultConnection || 'default';
    
    if (requestedConnection) {
      if (entity.allowedConnections && entity.allowedConnections.includes(requestedConnection)) {
        connectionName = requestedConnection;
      } else {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: `Conexión '${requestedConnection}' no permitida para entidad '${entityName}'`,
          allowedConnections: entity.allowedConnections || [connectionName]
        };
        return;
      }
    }

    // Construir consulta UPDATE
    const fields = Object.keys(requestBody);
    const values = Object.values(requestBody);
    const setClause = fields.map((field, index) => `${field} = :${index + 1}`).join(', ');
    
    // Agregar el ID al final de los parámetros
    values.push(recordId);
    
    const sql = `UPDATE ${entity.tableName} SET ${setClause} WHERE ${entity.primaryKey} = :${values.length}`;
    
    const result = await multiDbService.executeSQL(sql, values, connectionName);
    
    if (result.rowsAffected === 0) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        error: `Registro con ${entity.primaryKey} = '${recordId}' no encontrado en '${entityName}'`
      };
      return;
    }

    ctx.response.body = {
      success: true,
      message: `Registro actualizado en '${entityName}' exitosamente`,
      data: {
        updatedFields: fields,
        affectedRows: result.rowsAffected,
        recordId: recordId
      },
      metadata: {
        entity: entityName,
        tableName: entity.tableName,
        primaryKey: entity.primaryKey,
        connection: connectionName,
        operation: "UPDATE",
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: `Error al actualizar '${entityName}' con ID '${recordId}'`,
      details: error.message,
      sqlState: error.errorNum || null
    };
  }
});

// ========================================
// OPERACIONES CRUD - DELETE
// ========================================

// Eliminar registro por ID
router.delete('/api/:entity/:id', async (ctx) => {
  const entityName = ctx.params.entity;
  const recordId = ctx.params.id;

  try {
    const entity = await entityConfig.getEntityConfig(entityName);
    if (!entity) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        error: `Entidad '${entityName}' no encontrada`,
        availableEntities: await entityConfig.getEntityNames()
      };
      return;
    }

    // Obtener conexión
    const requestedConnection = ctx.request.url.searchParams.get('connection');
    let connectionName = entity.defaultConnection || 'default';
    
    if (requestedConnection) {
      if (entity.allowedConnections && entity.allowedConnections.includes(requestedConnection)) {
        connectionName = requestedConnection;
      } else {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: `Conexión '${requestedConnection}' no permitida para entidad '${entityName}'`,
          allowedConnections: entity.allowedConnections || [connectionName]
        };
        return;
      }
    }

    // Primero verificar que el registro existe
    const checkSql = `SELECT COUNT(*) as count FROM ${entity.tableName} WHERE ${entity.primaryKey} = :1`;
    const checkResult = await multiDbService.querySQL(checkSql, [recordId], connectionName);
    
    if (checkResult.rows[0].COUNT === 0) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        error: `Registro con ${entity.primaryKey} = '${recordId}' no encontrado en '${entityName}'`
      };
      return;
    }

    // Eliminar el registro
    const deleteSql = `DELETE FROM ${entity.tableName} WHERE ${entity.primaryKey} = :1`;
    const result = await multiDbService.executeSQL(deleteSql, [recordId], connectionName);

    ctx.response.body = {
      success: true,
      message: `Registro eliminado de '${entityName}' exitosamente`,
      data: {
        deletedRecordId: recordId,
        affectedRows: result.rowsAffected
      },
      metadata: {
        entity: entityName,
        tableName: entity.tableName,
        primaryKey: entity.primaryKey,
        connection: connectionName,
        operation: "DELETE",
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: `Error al eliminar '${entityName}' con ID '${recordId}'`,
      details: error.message,
      sqlState: error.errorNum || null
    };
  }
});

// ========================================
// LLAMADAS A PROCEDIMIENTOS ALMACENADOS
// ========================================

// Ejecutar procedimiento almacenado
router.post('/api/procedures/:procedureName', async (ctx) => {
  const procedureName = ctx.params.procedureName;
  const requestBody = ctx.state.requestBody || {};
  
  try {
    // Obtener conexión
    const requestedConnection = ctx.request.url.searchParams.get('connection') || 'default';
    
    // Validar que la conexión existe
    const availableConnections = await multiDbService.getConnectionNames();
    if (!availableConnections.includes(requestedConnection)) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: `Conexión '${requestedConnection}' no está disponible`,
        availableConnections: availableConnections
      };
      return;
    }

    // Extraer parámetros del body
    const parameters = requestBody.parameters || [];
    const outputParams = requestBody.outputParams || [];
    
    // Construir llamada al procedimiento
    let paramPlaceholders = '';
    if (parameters.length > 0) {
      paramPlaceholders = parameters.map((_, index) => `:${index + 1}`).join(', ');
    }
    
    const sql = `BEGIN ${procedureName}(${paramPlaceholders}); END;`;
    
    const result = await multiDbService.executeSQL(sql, parameters, requestedConnection);

    ctx.response.body = {
      success: true,
      message: `Procedimiento '${procedureName}' ejecutado exitosamente`,
      data: {
        procedureName: procedureName,
        inputParameters: parameters,
        outputParameters: outputParams,
        affectedRows: result.rowsAffected || 0
      },
      metadata: {
        connection: requestedConnection,
        operation: "CALL_PROCEDURE",
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: `Error al ejecutar procedimiento '${procedureName}'`,
      details: error.message,
      sqlState: error.errorNum || null
    };
  }
});

// Ejecutar función almacenada (con retorno)
router.post('/api/functions/:functionName', async (ctx) => {
  const functionName = ctx.params.functionName;
  const requestBody = ctx.state.requestBody || {};
  
  try {
    // Obtener conexión
    const requestedConnection = ctx.request.url.searchParams.get('connection') || 'default';
    
    // Validar que la conexión existe
    const availableConnections = await multiDbService.getConnectionNames();
    if (!availableConnections.includes(requestedConnection)) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: `Conexión '${requestedConnection}' no está disponible`,
        availableConnections: availableConnections
      };
      return;
    }

    // Extraer parámetros del body
    const parameters = requestBody.parameters || [];
    
    // Construir llamada a la función
    let paramPlaceholders = '';
    if (parameters.length > 0) {
      paramPlaceholders = parameters.map((_, index) => `:${index + 1}`).join(', ');
    }
    
    const sql = `SELECT ${functionName}(${paramPlaceholders}) as result FROM DUAL`;
    
    const result = await multiDbService.querySQL(sql, parameters, requestedConnection);

    ctx.response.body = {
      success: true,
      message: `Función '${functionName}' ejecutada exitosamente`,
      data: {
        functionName: functionName,
        inputParameters: parameters,
        result: result.rows[0]?.RESULT
      },
      metadata: {
        connection: requestedConnection,
        operation: "CALL_FUNCTION",
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: `Error al ejecutar función '${functionName}'`,
      details: error.message,
      sqlState: error.errorNum || null
    };
  }
});

// ========================================
// OPERACIONES EN BATCH
// ========================================

// Inserción en batch (múltiples registros)
router.post('/api/:entity/batch', async (ctx) => {
  const entityName = ctx.params.entity;
  const requestBody = ctx.state.requestBody;
  
  if (!requestBody || !Array.isArray(requestBody.records)) {
    ctx.response.status = 400;
    ctx.response.body = {
      success: false,
      error: "Request body must contain 'records' array for batch operations",
      example: {
        "records": [
          { "DESCRIPCION": "Proceso 1", "ESTADO": "ACTIVO" },
          { "DESCRIPCION": "Proceso 2", "ESTADO": "PENDIENTE" }
        ]
      }
    };
    return;
  }

  try {
    const entity = await entityConfig.getEntityConfig(entityName);
    if (!entity) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        error: `Entidad '${entityName}' no encontrada`,
        availableEntities: await entityConfig.getEntityNames()
      };
      return;
    }

    // Obtener conexión
    const requestedConnection = ctx.request.url.searchParams.get('connection');
    let connectionName = entity.defaultConnection || 'default';
    
    if (requestedConnection) {
      if (entity.allowedConnections && entity.allowedConnections.includes(requestedConnection)) {
        connectionName = requestedConnection;
      } else {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: `Conexión '${requestedConnection}' no permitida para entidad '${entityName}'`,
          allowedConnections: entity.allowedConnections || [connectionName]
        };
        return;
      }
    }

    const records = requestBody.records;
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Obtener configuración de campos para filtrado
    const entityFields = entity.fields || {};

    // Procesar cada registro
    for (let i = 0; i < records.length; i++) {
      try {
        const record = records[i];
        
        // Aplicar la misma lógica que en INSERT individual
        const filteredData = {};
        
        // Verificar si necesitamos auto-incremento para primary key
        const primaryKeyField = entityFields[entity.primaryKey];
        const needsAutoIncrement = entity.autoIncrement === true && 
                                   primaryKeyField?.autoIncrement === true && 
                                   !record.hasOwnProperty(entity.primaryKey);
        
        // Si necesita auto-incremento, generar el siguiente ID
        if (needsAutoIncrement) {
          const nextId = await getNextAutoIncrementId(entity, connectionName);
          filteredData[entity.primaryKey] = nextId;
        }
        
        // Procesar demás campos del record
        for (const [key, value] of Object.entries(record)) {
          const fieldConfig = entityFields[key];
          if (fieldConfig) {
            const isAutoIncrement = fieldConfig.autoIncrement === true;
            const isReadonly = fieldConfig.readonly === true;
            
            if (!isAutoIncrement && !isReadonly) {
              filteredData[key] = value;
            }
          } else {
            // Si no hay configuración del campo, incluirlo
            filteredData[key] = value;
          }
        }
        
        const fields = Object.keys(filteredData);
        const values = Object.values(filteredData);
        
        if (fields.length === 0) {
          results.push({
            index: i,
            success: false,
            data: record,
            error: "No hay campos válidos para insertar (todos son auto-incrementales o readonly)"
          });
          errorCount++;
          continue;
        }
        
        const placeholders = fields.map((_, index) => `:${index + 1}`).join(', ');
        const sql = `INSERT INTO ${entity.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
        
        const result = await multiDbService.executeSQL(sql, values, connectionName);
        
        results.push({
          index: i,
          success: true,
          data: filteredData,
          affectedRows: result.rowsAffected || 1
        });
        successCount++;
        
      } catch (error) {
        results.push({
          index: i,
          success: false,
          data: records[i],
          error: error.message
        });
        errorCount++;
      }
    }

    const status = errorCount === 0 ? 201 : (successCount === 0 ? 500 : 207); // 207 = Multi-Status
    ctx.response.status = status;
    ctx.response.body = {
      success: errorCount === 0,
      message: `Batch insert completado: ${successCount} exitosos, ${errorCount} errores`,
      data: {
        totalRecords: records.length,
        successfulInserts: successCount,
        failedInserts: errorCount,
        results: results
      },
      metadata: {
        entity: entityName,
        tableName: entity.tableName,
        connection: connectionName,
        operation: "BATCH_INSERT",
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: `Error en batch insert para '${entityName}'`,
      details: error.message
    };
  }
});

// Registrar rutas
app.use(router.routes());
app.use(router.allowedMethods());

// Manejar errores
app.addEventListener('error', (evt) => {
  console.error('Error del servidor:', evt.error);
});

// Inicializar servicios
console.log('🔧 Inicializando servicios...');

try {
  // Inicializar servicio de múltiples bases de datos
  multiDbService = new MultiDatabaseService();
  await multiDbService.initialize();
  console.log('✅ MultiDatabaseService inicializado');
  
  // Verificar configuración de entidades
  const entityNames = await entityConfig.getEntityNames();
  console.log(`✅ ${entityNames.length} entidades configuradas`);
  
} catch (error) {
  console.error('❌ Error al inicializar servicios:', error.message);
  console.log('⚠️ El servidor continuará, pero algunas funciones pueden no estar disponibles');
}

// Configurar puerto
const port = parseInt(Deno.env.get('PORT') || '8000');

console.log('🚀 Iniciando DNO-Oracle API (Servidor Completo)...');
console.log(`📡 Servidor ejecutándose en: http://localhost:${port}`);
console.log('📋 Endpoints disponibles:');
console.log(`   GET    http://localhost:${port}/api/health`);
console.log(`   GET    http://localhost:${port}/api/info`);
console.log(`   GET    http://localhost:${port}/api/connections`);
console.log(`   GET    http://localhost:${port}/api/connections/test-all`);
console.log(`   GET    http://localhost:${port}/api/entities`);
console.log(`   GET    http://localhost:${port}/api/{entidad}`);
console.log(`   POST   http://localhost:${port}/api/{entidad}`);
console.log(`   PUT    http://localhost:${port}/api/{entidad}/{id}`);
console.log(`   DELETE http://localhost:${port}/api/{entidad}/{id}`);
console.log(`   POST   http://localhost:${port}/api/{entidad}/batch`);
console.log(`   POST   http://localhost:${port}/api/procedures/{nombre}`);
console.log(`   POST   http://localhost:${port}/api/functions/{nombre}`);

await app.listen({ port });
