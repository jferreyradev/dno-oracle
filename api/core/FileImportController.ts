/**
 * Controlador para importar archivos CSV/Excel a tablas Oracle
 */

import { RouterContext } from 'https://deno.land/x/oak@v12.6.1/mod.ts';
import { FileImportService } from './FileImportService.ts';

export class FileImportController {
  
  /**
   * Importa un archivo CSV a una tabla Oracle
   */
  static async importCsv(ctx: RouterContext<string>) {
    try {
      const body = await ctx.request.body().value;
      
      if (!body.csvContent || !body.tableName || !body.mappings) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: 'csvContent, tableName y mappings son requeridos'
        };
        return;
      }

      const { csvContent, tableName, mappings, options = {} } = body;

      console.log(`Importando CSV a tabla: ${tableName}`);
      console.log(`Mappings: ${JSON.stringify(mappings, null, 2)}`);

      const importOptions = {
        tableName,
        mappings,
        skipFirstRow: options.skipFirstRow || false,
        batchSize: options.batchSize || 1000,
        validateOnly: options.validateOnly || false,
        truncateTable: options.truncateTable || false,
        continueOnError: options.continueOnError || false,
        delimiter: options.delimiter || ',',
        dateFormat: options.dateFormat || 'YYYY-MM-DD',
        encoding: options.encoding || 'utf-8'
      };

      const result = await FileImportService.importCsvToTable(csvContent, importOptions);

      ctx.response.body = {
        success: result.success,
        data: result,
        message: result.success 
          ? `Importación exitosa: ${result.summary.inserted} filas insertadas`
          : `Importación con errores: ${result.summary.failed} filas fallidas`
      };

    } catch (error) {
      console.error('Error en importación CSV:', error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        message: 'Error en importación CSV',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Valida un archivo CSV sin importarlo
   */
  static async validateCsv(ctx: RouterContext<string>) {
    try {
      const body = await ctx.request.body().value;
      
      if (!body.csvContent || !body.tableName || !body.mappings) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: 'csvContent, tableName y mappings son requeridos'
        };
        return;
      }

      const { csvContent, tableName, mappings, options = {} } = body;

      console.log(`Validando CSV para tabla: ${tableName}`);

      const importOptions = {
        tableName,
        mappings,
        skipFirstRow: options.skipFirstRow || false,
        validateOnly: true,
        delimiter: options.delimiter || ',',
        dateFormat: options.dateFormat || 'YYYY-MM-DD',
        encoding: options.encoding || 'utf-8'
      };

      const result = await FileImportService.importCsvToTable(csvContent, importOptions);

      ctx.response.body = {
        success: result.success,
        data: {
          isValid: result.success,
          totalRows: result.totalRows,
          errors: result.errors,
          warnings: result.warnings,
          preview: result.errors.length === 0 ? 'Datos válidos para importación' : 'Errores encontrados'
        },
        message: result.success 
          ? `Validación exitosa: ${result.totalRows} filas válidas`
          : `Validación con errores: ${result.errorRows} filas con errores`
      };

    } catch (error) {
      console.error('Error en validación CSV:', error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        message: 'Error en validación CSV',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Obtiene las columnas disponibles de una tabla
   */
  static async getTableColumns(ctx: RouterContext<string>) {
    try {
      const { tableName } = ctx.params;
      
      if (!tableName) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: 'tableName es requerido'
        };
        return;
      }

      console.log(`Obteniendo columnas de tabla: ${tableName}`);

      const columns = await FileImportService.getTableColumns(tableName);

      ctx.response.body = {
        success: true,
        data: columns,
        message: `Columnas obtenidas para tabla ${tableName}`
      };

    } catch (error) {
      console.error('Error obteniendo columnas:', error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        message: 'Error obteniendo columnas de la tabla',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Genera un mapping automático basado en headers CSV
   */
  static async generateAutoMapping(ctx: RouterContext<string>) {
    try {
      const body = await ctx.request.body().value;
      
      if (!body.csvHeaders || !body.tableName) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: 'csvHeaders y tableName son requeridos'
        };
        return;
      }

      const { csvHeaders, tableName } = body;

      console.log(`Generando mapping automático para tabla: ${tableName}`);

      const mappings = await FileImportService.generateAutoMapping(csvHeaders, tableName);

      ctx.response.body = {
        success: true,
        data: {
          mappings,
          matched: mappings.length,
          total: csvHeaders.length
        },
        message: `Mapping generado: ${mappings.length} de ${csvHeaders.length} columnas mapeadas`
      };

    } catch (error) {
      console.error('Error generando mapping:', error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        message: 'Error generando mapping automático',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Obtiene información sobre el formato de importación
   */
  static getImportInfo(ctx: RouterContext<string>) {
    try {
      ctx.response.body = {
        success: true,
        data: {
          supportedFormats: ['CSV'],
          supportedDelimiters: [',', ';', '|', '\t'],
          supportedEncodings: ['utf-8', 'latin1', 'ascii'],
          maxFileSize: '10MB',
          maxRows: 100000,
          features: {
            skipFirstRow: true,
            validateOnly: true,
            truncateTable: true,
            continueOnError: true,
            autoMapping: true,
            batchProcessing: true
          },
          supportedDataTypes: [
            'VARCHAR2',
            'CHAR',
            'NUMBER',
            'INTEGER',
            'DATE',
            'TIMESTAMP',
            'CLOB',
            'BLOB'
          ]
        },
        message: 'Información de importación obtenida'
      };

    } catch (error) {
      console.error('Error obteniendo información de importación:', error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        message: 'Error obteniendo información de importación',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Parsea headers de un archivo CSV
   */
  static async parseHeaders(ctx: RouterContext<string>) {
    try {
      const body = await ctx.request.body().value;
      
      if (!body.csvContent) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: 'csvContent es requerido'
        };
        return;
      }

      const { csvContent, delimiter = ',' } = body;

      // Obtener primera línea y parsear headers
      const firstLine = csvContent.split('\n')[0];
      const headers = firstLine.split(delimiter).map((h: string) => h.trim().replace(/"/g, ''));

      console.log(`Headers parseados: ${headers.length} columnas`);

      ctx.response.body = {
        success: true,
        data: {
          headers,
          count: headers.length,
          delimiter: delimiter
        },
        message: `Headers parseados: ${headers.length} columnas encontradas`
      };

    } catch (error) {
      console.error('Error parseando headers:', error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        message: 'Error parseando headers CSV',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
