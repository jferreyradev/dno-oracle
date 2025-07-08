/**
 * Servicio para importar archivos CSV/Excel a tablas Oracle
 */

import * as db from './DatabaseService.ts';
import { entityConfig } from './EntityConfig.ts';

// Interfaces para los tipos de datos
interface ImportColumn {
  name: string;
  type: string;
  required: boolean;
  length?: number;
  defaultValue?: unknown;
}

interface ImportMapping {
  fileColumn: string;
  tableColumn: string;
  transform?: (value: string) => unknown;
}

interface ImportOptions {
  tableName: string;
  mappings: ImportMapping[];
  skipFirstRow?: boolean;
  batchSize?: number;
  validateOnly?: boolean;
  truncateTable?: boolean;
  continueOnError?: boolean;
  dateFormat?: string;
  delimiter?: string;
  encoding?: string;
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  processedRows: number;
  errorRows: number;
  errors: ImportError[];
  warnings: string[];
  summary: {
    inserted: number;
    updated: number;
    failed: number;
    duplicates: number;
  };
}

interface ImportError {
  row: number;
  column?: string;
  error: string;
  data?: unknown;
}

interface ValidationResult {
  isValid: boolean;
  errors: ImportError[];
  warnings: string[];
  preview: unknown[];
}

export class FileImportService {
  
  /**
   * Procesa un archivo CSV y lo importa a una tabla Oracle
   */
  static async importCsvToTable(
    csvContent: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    try {
      console.log(`Iniciando importación CSV a tabla: ${options.tableName}`);
      
      // Validar que la tabla existe y obtener su configuración
      const tableConfig = await this.getTableConfiguration(options.tableName);
      
      // Parsear el CSV
      const rows = this.parseCsv(csvContent, options);
      
      // Validar los datos
      const validation = this.validateData(rows, tableConfig, options);
      
      if (!validation.isValid && !options.continueOnError) {
        return {
          success: false,
          totalRows: rows.length,
          processedRows: 0,
          errorRows: validation.errors.length,
          errors: validation.errors,
          warnings: validation.warnings,
          summary: {
            inserted: 0,
            updated: 0,
            failed: validation.errors.length,
            duplicates: 0
          }
        };
      }
      
      // Si es solo validación, retornar resultado
      if (options.validateOnly) {
        return {
          success: validation.isValid,
          totalRows: rows.length,
          processedRows: 0,
          errorRows: validation.errors.length,
          errors: validation.errors,
          warnings: validation.warnings,
          summary: {
            inserted: 0,
            updated: 0,
            failed: 0,
            duplicates: 0
          }
        };
      }
      
      // Truncar tabla si se solicita
      if (options.truncateTable) {
        await this.truncateTable(options.tableName);
      }
      
      // Procesar los datos en lotes
      const result = await this.processBatch(rows, tableConfig, options);
      
      console.log(`Importación completada: ${result.summary.inserted} insertados, ${result.summary.failed} fallidos`);
      return result;
      
    } catch (error) {
      console.error('Error en importación:', error);
      return {
        success: false,
        totalRows: 0,
        processedRows: 0,
        errorRows: 1,
        errors: [{
          row: 0,
          error: error instanceof Error ? error.message : String(error)
        }],
        warnings: [],
        summary: {
          inserted: 0,
          updated: 0,
          failed: 1,
          duplicates: 0
        }
      };
    }
  }
    /**
   * Obtiene la configuración de una tabla desde entities.json
   */
  private static async getTableConfiguration(tableName: string, connectionName: string = 'default'): Promise<ImportColumn[]> {
    const config = await entityConfig.loadConfig();
    
    // Buscar la entidad por nombre de tabla en la conexión especificada
    const entities = config.connections?.[connectionName]?.entities || config.entities;
    
    if (!entities) {
      throw new Error(`No se encontraron entidades para la conexión ${connectionName}`);
    }
    
    // Buscar la entidad por nombre de tabla
    const entity = Object.values(entities).find(
      (entity) => entity.tableName === tableName
    );
    
    if (!entity) {
      throw new Error(`Tabla ${tableName} no encontrada en la configuración para la conexión ${connectionName}`);
    }
    
    // Convertir campos a columnas de importación
    const columns: ImportColumn[] = [];
    
    for (const [fieldName, fieldConfig] of Object.entries(entity.fields)) {
      columns.push({
        name: fieldName,
        type: fieldConfig.type,
        required: fieldConfig.required || false,
        length: fieldConfig.length,
        defaultValue: fieldConfig.default
      });
    }

    return columns;
  }
  
  /**
   * Parsea el contenido CSV
   */
  private static parseCsv(csvContent: string, options: ImportOptions): string[][] {
    const delimiter = options.delimiter || ',';
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    const rows: string[][] = [];
    
    for (let i = 0; i < lines.length; i++) {
      if (i === 0 && options.skipFirstRow) {
        continue; // Saltar la primera fila (headers)
      }
      
      const row = this.parseCsvLine(lines[i], delimiter);
      if (row.length > 0) {
        rows.push(row);
      }
    }
    
    return rows;
  }
  
  /**
   * Parsea una línea CSV manejando comillas y delimitadores
   */
  private static parseCsvLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Comilla doble escapada
          current += '"';
          i++;
        } else {
          // Cambiar estado de comillas
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
  
  /**
   * Valida los datos contra la configuración de la tabla
   */
  private static validateData(
    rows: string[][],
    tableConfig: ImportColumn[],
    options: ImportOptions
  ): ValidationResult {
    const errors: ImportError[] = [];
    const warnings: string[] = [];
    const preview: unknown[] = [];
    
    // Validar mappings
    for (const mapping of options.mappings) {
      const column = tableConfig.find(col => col.name === mapping.tableColumn);
      if (!column) {
        errors.push({
          row: 0,
          column: mapping.tableColumn,
          error: `Columna ${mapping.tableColumn} no existe en la tabla`
        });
      }
    }
    
    // Validar cada fila
    for (let i = 0; i < Math.min(rows.length, 100); i++) { // Limitar preview a 100 filas
      const row = rows[i];
      const rowData: Record<string, unknown> = {};
      
      // Aplicar mappings
      for (const mapping of options.mappings) {
        const fileColumnIndex = parseInt(mapping.fileColumn);
        let value: unknown = row[fileColumnIndex] || '';
        
        // Aplicar transformación si existe
        if (mapping.transform) {
          try {
            value = mapping.transform(String(value));
          } catch (error) {
            errors.push({
              row: i + 1,
              column: mapping.tableColumn,
              error: `Error en transformación: ${error instanceof Error ? error.message : String(error)}`
            });
            continue;
          }
        }
        
        rowData[mapping.tableColumn] = value;
      }
      
      // Validar tipos y requerimientos
      for (const column of tableConfig) {
        const value = rowData[column.name];
        
        // Validar campos requeridos
        if (column.required && (value === null || value === undefined || value === '')) {
          if (column.defaultValue === undefined) {
            errors.push({
              row: i + 1,
              column: column.name,
              error: `Campo ${column.name} es requerido`
            });
          }
        }
        
        // Validar tipos
        if (value !== null && value !== undefined && value !== '') {
          const validationError = this.validateFieldType(value, column);
          if (validationError) {
            errors.push({
              row: i + 1,
              column: column.name,
              error: validationError
            });
          }
        }
      }
      
      // Agregar al preview
      if (i < 10) {
        preview.push(rowData);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      preview
    };
  }
  
  /**
   * Valida que un valor coincida con el tipo de campo
   */
  private static validateFieldType(value: unknown, column: ImportColumn): string | null {
    const strValue = String(value);
    
    switch (column.type) {
      case 'NUMBER':
      case 'INTEGER':
        if (isNaN(Number(strValue))) {
          return `Valor '${strValue}' no es un número válido`;
        }
        break;
        
      case 'DATE':
      case 'TIMESTAMP':
        if (isNaN(Date.parse(strValue))) {
          return `Valor '${strValue}' no es una fecha válida`;
        }
        break;
        
      case 'VARCHAR2':
      case 'CHAR':
        if (column.length && strValue.length > column.length) {
          return `Valor '${strValue}' excede la longitud máxima de ${column.length}`;
        }
        break;
    }
    
    return null;
  }
  
  /**
   * Trunca una tabla
   */
  private static async truncateTable(tableName: string): Promise<void> {
    const sql = `TRUNCATE TABLE ${tableName}`;
    await db.executeSQL(sql);
    console.log(`Tabla ${tableName} truncada`);
  }
  
  /**
   * Procesa los datos en lotes
   */
  private static async processBatch(
    rows: string[][],
    tableConfig: ImportColumn[],
    options: ImportOptions
  ): Promise<ImportResult> {
    const _batchSize = options.batchSize || 1000;
    const errors: ImportError[] = [];
    const warnings: string[] = [];
    let inserted = 0;
    let failed = 0;
    const duplicates = 0;
    
    // Preparar SQL de inserción
    const columnNames = options.mappings.map(m => m.tableColumn);
    const placeholders = columnNames.map((_, index) => `:${index + 1}`).join(', ');
    const sql = `INSERT INTO ${options.tableName} (${columnNames.join(', ')}) VALUES (${placeholders})`;
    
    // Procesar fila por fila
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowData: unknown[] = [];
      
      try {
        // Mapear datos
        for (const mapping of options.mappings) {
          const fileColumnIndex = parseInt(mapping.fileColumn);
          let value: unknown = row[fileColumnIndex] || '';
          
          // Aplicar transformación
          if (mapping.transform) {
            value = mapping.transform(String(value));
          }
          
          // Convertir tipos
          const column = tableConfig.find(col => col.name === mapping.tableColumn);
          if (column) {
            value = this.convertValue(value, column);
          }
          
          rowData.push(value);
        }
        
        // Ejecutar inserción individual
        await db.executeSQL(sql, rowData);
        inserted++;
        
        // Log progress cada 100 filas
        if (i % 100 === 0) {
          console.log(`Procesando fila ${i + 1} de ${rows.length}`);
        }
        
      } catch (error) {
        errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : String(error),
          data: row
        });
        failed++;
        
        if (!options.continueOnError) {
          break;
        }
      }
    }
    
    return {
      success: failed === 0,
      totalRows: rows.length,
      processedRows: inserted + failed,
      errorRows: failed,
      errors,
      warnings,
      summary: {
        inserted,
        updated: 0,
        failed,
        duplicates
      }
    };
  }
  
  /**
   * Convierte un valor al tipo apropiado
   */
  private static convertValue(value: unknown, column: ImportColumn): unknown {
    if (value === null || value === undefined || value === '') {
      return column.defaultValue || null;
    }
    
    const strValue = String(value);
    
    switch (column.type) {
      case 'NUMBER':
      case 'INTEGER':
        return Number(strValue);
        
      case 'DATE':
      case 'TIMESTAMP':
        return new Date(strValue);
        
      case 'VARCHAR2':
      case 'CHAR':
        return strValue;
        
      default:
        return strValue;
    }
  }
  
  /**
   * Obtiene las columnas disponibles de una tabla
   */
  static getTableColumns(tableName: string, connectionName: string = 'default'): Promise<ImportColumn[]> {
    return this.getTableConfiguration(tableName, connectionName);
  }
  
  /**
   * Genera un mapping automático basado en los nombres de columnas
   */
  static async generateAutoMapping(
    csvHeaders: string[],
    tableName: string,
    connectionName: string = 'default'
  ): Promise<ImportMapping[]> {
    const tableColumns = await this.getTableConfiguration(tableName, connectionName);
    const mappings: ImportMapping[] = [];
    
    for (let i = 0; i < csvHeaders.length; i++) {
      const header = csvHeaders[i].trim().toUpperCase();
      
      // Buscar coincidencia exacta o similar
      const matchedColumn = tableColumns.find(col => 
        col.name.toUpperCase() === header ||
        col.name.toUpperCase().includes(header) ||
        header.includes(col.name.toUpperCase())
      );
      
      if (matchedColumn) {
        mappings.push({
          fileColumn: i.toString(),
          tableColumn: matchedColumn.name
        });
      }
    }
    
    return mappings;
  }
}
