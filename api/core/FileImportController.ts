/**
 * Controlador para importación de archivos CSV/Excel a tablas Oracle
 */

import { Context, RouterContext } from 'https://deno.land/x/oak@v12.6.1/mod.ts';
import { FileImportServiceSimple } from './FileImportServiceSimple.ts';
import { entityConfig } from './EntityConfig.ts';

export class FileImportController {
  
  /**
   * Importar archivo CSV a una tabla Oracle (soporta FormData y JSON)
   */
  static async importCsv(ctx: Context) {
    try {
      let csvContent: string;
      let tableName: string;
      let mappings: Array<{fileColumn: string; tableColumn: string}> = [];
      let options: Record<string, unknown> = {};

      // Verificar si es FormData (archivo) o JSON
      const contentType = ctx.request.headers.get('content-type') || '';
      
      if (contentType.includes('multipart/form-data')) {
        // Manejar FormData (archivo)
        const body = ctx.request.body({ type: 'form-data' });
        const formData = await body.value.read();
        
        const file = formData.files?.find((f: { name: string; filename?: string }) => f.name === 'file');
        if (!file || !file.filename) {
          ctx.response.status = 400;
          ctx.response.body = {
            success: false,
            error: "Se requiere un archivo en el campo 'file'"
          };
          return;
        }
        
        // Leer contenido del archivo
        csvContent = await Deno.readTextFile(file.filename);
        tableName = formData.fields.tableName;
        
        // Parsear mappings si existe
        if (formData.fields.mapping) {
          try {
            mappings = JSON.parse(formData.fields.mapping);
          } catch (_e) {
            mappings = [];
          }
        }
        
        // Parsear opciones
        options = {
          skipFirstRow: formData.fields.skipFirstRow === 'true',
          batchSize: parseInt(formData.fields.batchSize || '100'),
          validateOnly: formData.fields.validateOnly === 'true',
          truncateTable: formData.fields.truncateTable === 'true',
          continueOnError: formData.fields.continueOnError === 'false',
          delimiter: formData.fields.delimiter || ',',
          dateFormat: formData.fields.dateFormat || 'YYYY-MM-DD'
        };
        
      } else {
        // Manejar JSON
        const requestBody = ctx.state.requestBody;
        
        if (!requestBody || !requestBody.csvContent || !requestBody.tableName) {
          ctx.response.status = 400;
          ctx.response.body = {
            success: false,
            error: "Se requiere 'csvContent' y 'tableName'",
            example: {
              csvContent: "col1,col2,col3\nval1,val2,val3",
              tableName: "PROC_CAB",
              mappings: [
                { fileColumn: "col1", tableColumn: "DESCRIPCION" },
                { fileColumn: "col2", tableColumn: "MOSTRAR" }
              ],
              options: {
                skipFirstRow: true,
                batchSize: 100,
                continueOnError: false
              }
            }
          };
          return;
        }
        
        csvContent = requestBody.csvContent;
        tableName = requestBody.tableName;
        mappings = requestBody.mappings || [];
        options = {
          skipFirstRow: requestBody.options?.skipFirstRow ?? true,
          batchSize: requestBody.options?.batchSize ?? 100,
          validateOnly: requestBody.options?.validateOnly ?? false,
          truncateTable: requestBody.options?.truncateTable ?? false,
          continueOnError: requestBody.options?.continueOnError ?? false,
          delimiter: requestBody.options?.delimiter ?? ',',
          dateFormat: requestBody.options?.dateFormat ?? 'YYYY-MM-DD'
        };
      }

      // Opciones finales para el servicio
      const finalOptions = {
        tableName,
        mappings,
        skipFirstRow: Boolean(options.skipFirstRow),
        connection: typeof options.connection === 'string' ? options.connection : 'default'
      };

      // Importar datos usando el servicio
      const result = await FileImportServiceSimple.importCsvToTable(csvContent, finalOptions);

      if (result.success) {
        ctx.response.status = 200;
        ctx.response.body = {
          success: true,
          message: `Importación completada: ${result.summary.inserted} registros insertados`,
          data: result,
          metadata: {
            operation: 'CSV_IMPORT',
            table: tableName,
            timestamp: new Date().toISOString()
          }
        };
      } else {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: `Importación falló: ${result.summary.failed} errores encontrados`,
          data: result,
          metadata: {
            operation: 'CSV_IMPORT',
            table: tableName,
            timestamp: new Date().toISOString()
          }
        };
      }

    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : String(error),
        metadata: {
          operation: 'CSV_IMPORT',
          timestamp: new Date().toISOString()
        }
      };
    }
  }
  
  /**
   * Validar archivo CSV sin importar
   */
  static async validateCsv(ctx: Context) {
    try {
      const requestBody = ctx.state.requestBody;
      
      if (!requestBody || !requestBody.csvContent || !requestBody.tableName) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Se requiere 'csvContent' y 'tableName' para validación"
        };
        return;
      }
      
      const options = {
        tableName: requestBody.tableName,
        mappings: requestBody.mappings || [],
        skipFirstRow: requestBody.options?.skipFirstRow ?? true,
        validateOnly: true,
        delimiter: requestBody.options?.delimiter ?? ',',
        dateFormat: requestBody.options?.dateFormat ?? 'YYYY-MM-DD'
      };
      
      const result = await FileImportServiceSimple.importCsvToTable(
        requestBody.csvContent,
        options
      );
      
      ctx.response.body = {
        success: result.success,
        message: result.success 
          ? "Archivo válido para importación"
          : `Se encontraron ${result.errorRows} errores de validación`,
        validation: {
          isValid: result.success,
          totalRows: result.totalRows,
          errors: result.errors,
          warnings: []
        },
        metadata: {
          operation: "CSV_VALIDATION",
          table: requestBody.tableName,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "Error en validación CSV",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Extraer headers de un archivo CSV (soporta FormData y JSON)
   */
  static async parseHeaders(ctx: Context) {
    try {
      let csvContent: string;
      let delimiter = ',';

      // Verificar si es FormData (archivo) o JSON
      const contentType = ctx.request.headers.get('content-type') || '';
      
      if (contentType.includes('multipart/form-data')) {
        // Manejar FormData (archivo)
        const body = ctx.request.body({ type: 'form-data' });
        const formData = await body.value.read();
        
        const file = formData.files?.find((f: { name: string }) => f.name === 'file');
        if (!file || !file.filename) {
          ctx.response.status = 400;
          ctx.response.body = {
            success: false,
            error: "Se requiere un archivo en el campo 'file'"
          };
          return;
        }
        
        // Leer contenido del archivo
        csvContent = await Deno.readTextFile(file.filename);
        delimiter = formData.fields.delimiter || ',';
        
      } else {
        // Manejar JSON
        const requestBody = ctx.state.requestBody;
        
        if (!requestBody || !requestBody.csvContent) {
          ctx.response.status = 400;
          ctx.response.body = {
            success: false,
            error: "Se requiere 'csvContent'",
            example: {
              csvContent: "col1,col2,col3\nval1,val2,val3",
              delimiter: ","
            }
          };
          return;
        }
        
        csvContent = requestBody.csvContent;
        delimiter = requestBody.delimiter || ',';
      }
      
      const lines = csvContent.split('\n');
      
      if (lines.length === 0) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "El archivo CSV está vacío"
        };
        return;
      }
      
      const headers = lines[0].split(delimiter).map((h: string) => h.trim().replace(/"/g, ''));
      const sampleData = lines.slice(1, 6).map((line: string) => {
        const values = line.split(delimiter).map((v: string) => v.trim().replace(/"/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((header: string, index: number) => {
          row[header] = values[index] || '';
        });
        return row;
      });
      
      ctx.response.body = {
        success: true,
        data: {
          headers,
          sampleData,
          totalColumns: headers.length,
          preview: {
            totalLines: lines.length,
            hasHeaders: true,
            delimiter: delimiter
          }
        },
        metadata: {
          operation: "PARSE_HEADERS",
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "Error procesando headers CSV",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Generar mapeo automático entre columnas CSV y tabla Oracle
   */
  static async generateAutoMapping(ctx: Context) {
    try {
      const requestBody = ctx.state.requestBody;
      
      if (!requestBody || !requestBody.csvHeaders || !requestBody.tableName) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Se requiere 'csvHeaders' y 'tableName'",
          example: {
            csvHeaders: ["col1", "col2", "col3"],
            tableName: "PROC_CAB"
          }
        };
        return;
      }
      
      // Obtener columnas de la tabla
      const connectionName = requestBody.connection || 'default';
      const tableColumns = await FileImportServiceSimple.getTableColumns(requestBody.tableName, connectionName);
      
      // Generar mapeo automático
      const mappings = [];
      const csvHeaders = requestBody.csvHeaders;
      
      interface TableColumn {
        name: string;
        type: string;
        required: boolean;
      }
      
      for (const csvHeader of csvHeaders) {
        // Buscar coincidencia exacta primero
        let tableColumn = tableColumns.find((col: TableColumn) => 
          col.name.toLowerCase() === csvHeader.toLowerCase()
        );
        
        // Si no hay coincidencia exacta, buscar similitudes
        if (!tableColumn) {
          tableColumn = tableColumns.find((col: TableColumn) => 
            col.name.toLowerCase().includes(csvHeader.toLowerCase()) ||
            csvHeader.toLowerCase().includes(col.name.toLowerCase())
          );
        }
        
        if (tableColumn) {
          mappings.push({
            fileColumn: csvHeader,
            tableColumn: tableColumn.name,
            dataType: tableColumn.type,
            required: tableColumn.required,
            confidence: tableColumn.name.toLowerCase() === csvHeader.toLowerCase() ? 'high' : 'medium'
          });
        } else {
          mappings.push({
            fileColumn: csvHeader,
            tableColumn: null,
            confidence: 'none',
            suggestion: 'Mapeo manual requerido'
          });
        }
      }
      
      ctx.response.body = {
        success: true,
        data: {
          mappings,
          tableColumns,
          statistics: {
            totalCsvColumns: csvHeaders.length,
            mappedColumns: mappings.filter(m => m.tableColumn !== null).length,
            unmappedColumns: mappings.filter(m => m.tableColumn === null).length
          }
        },
        metadata: {
          operation: "AUTO_MAPPING",
          table: requestBody.tableName,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "Error generando mapeo automático",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Obtener información general de importación
   */
  static async getImportInfo(ctx: Context) {
    try {
      const entities = await entityConfig.getEntityNames();
      
      ctx.response.body = {
        success: true,
        data: {
          availableTables: entities,
          supportedFormats: ['CSV'],
          defaultOptions: {
            batchSize: 100,
            skipFirstRow: true,
            continueOnError: false,
            dateFormat: 'YYYY-MM-DD',
            delimiter: ','
          },
          maxFileSize: '10MB',
          features: [
            'Validación de datos antes de importar',
            'Mapeo automático de columnas',
            'Procesamiento en lotes',
            'Manejo de errores detallado',
            'Vista previa de datos'
          ]
        },
        metadata: {
          operation: "IMPORT_INFO",
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "Error obteniendo información de importación",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Obtener columnas de una tabla específica
   */
  static async getTableColumns(ctx: Context) {
    try {
      // Obtener tableName del path manualmente
      const url = new URL(ctx.request.url);
      const pathSegments = url.pathname.split('/');
      const tableName = pathSegments[pathSegments.length - 1];
      
      if (!tableName) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Se requiere nombre de tabla"
        };
        return;
      }
      
      const columns = await FileImportServiceSimple.getTableColumns(tableName, 'default');
      
      ctx.response.body = {
        success: true,
        data: {
          tableName,
          columns,
          totalColumns: columns.length
        },
        metadata: {
          operation: "GET_TABLE_COLUMNS",
          table: tableName,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "Error obteniendo columnas de tabla",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
