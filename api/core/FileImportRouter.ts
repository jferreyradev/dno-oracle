/**
 * Router para importar archivos CSV/Excel a tablas Oracle
 */

import { Router } from 'https://deno.land/x/oak@v12.6.1/mod.ts';
import { FileImportController } from './FileImportController.ts';

export class FileImportRouter {
  static getRouter(): Router {
    const router = new Router();

    // Rutas para importación de archivos
    router.post('/api/import/csv', FileImportController.importCsv);
    router.post('/api/import/validate', FileImportController.validateCsv);
    router.post('/api/import/headers', FileImportController.parseHeaders);
    router.post('/api/import/mapping', FileImportController.generateAutoMapping);
    router.get('/api/import/info', FileImportController.getImportInfo);
    router.get('/api/import/columns/:tableName', FileImportController.getTableColumns);

    return router;
  }
}
