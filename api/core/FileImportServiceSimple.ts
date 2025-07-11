/**
 * Servicio simplificado para importación de archivos CSV a tablas Oracle
 * Versión integrada con MultiDatabaseService
 */

import { MultiDatabaseService } from './MultiDatabaseService.ts';
import { EntityConfig, FieldConfig, entityConfig } from './EntityConfig.ts';

export class FileImportServiceSimple {
  private static multiDbService: MultiDatabaseService;
  
  static setDatabaseService(service: MultiDatabaseService) {
    this.multiDbService = service;
  }
  
  static async importCsvToTable(csvData: string, options: {
    tableName: string;
    mappings: Array<{fileColumn: string; tableColumn: string;}>;
    skipFirstRow?: boolean;
    connection?: string;
  }) {
    try {
      const connectionName = options.connection || 'default';
      
      // Parsear CSV básico
      const lines = csvData.trim().split('\n');
      if (lines.length === 0) {
        throw new Error('El archivo CSV está vacío');
      }
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const dataLines = options.skipFirstRow ? lines.slice(1) : lines;
      
      let inserted = 0;
      const errors = [];
      
      for (let i = 0; i < dataLines.length; i++) {
        try {
          const values = dataLines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          
          // Mapear campos
          const mappedData: Record<string, unknown> = {};
          if (options.mappings && options.mappings.length > 0) {
            for (const mapping of options.mappings) {
              if (row[mapping.fileColumn] !== undefined) {
                mappedData[mapping.tableColumn] = row[mapping.fileColumn];
              }
            }
          } else {
            Object.assign(mappedData, row);
          }
          
          // Insertar datos
          if (Object.keys(mappedData).length > 0) {
            const fields = Object.keys(mappedData);
            const vals = Object.values(mappedData);
            const placeholders = fields.map((_, idx) => `:${idx + 1}`).join(', ');
            const sql = `INSERT INTO ${options.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
            
            await this.multiDbService.executeSQL(sql, vals, connectionName);
            inserted++;
          }
          
        } catch (error) {
          errors.push({
            row: i + 1,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      return {
        success: errors.length === 0,
        totalRows: dataLines.length,
        processedRows: inserted + errors.length,
        errorRows: errors.length,
        errors,
        summary: { inserted, failed: errors.length }
      };
      
    } catch (error) {
      return {
        success: false,
        totalRows: 0,
        processedRows: 0,
        errorRows: 1,
        errors: [{ row: 0, error: error instanceof Error ? error.message : String(error) }],
        summary: { inserted: 0, failed: 1 }
      };
    }
  }
  
  static async getTableColumns(tableName: string, connectionName = 'default') {
    try {
      const sql = `
        SELECT column_name, data_type, nullable, data_length
        FROM user_tab_columns 
        WHERE table_name = UPPER(:1)
        ORDER BY column_id
      `;
      
      const result = await this.multiDbService.querySQL(sql, [tableName], connectionName);
      return (result.rows || []).map((row: Record<string, unknown>) => ({
        name: row.COLUMN_NAME,
        type: row.DATA_TYPE,
        required: row.NULLABLE === 'N',
        length: row.DATA_LENGTH
      }));
      
    } catch (error) {
      console.error(`Error obteniendo columnas de ${tableName}:`, error);
      return [];
    }
  }
}