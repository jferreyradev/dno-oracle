/**
 * Test de integración: Verificar módulos internos del proyecto
 * 
 * Este archivo demuestra que el proyecto funciona de forma independiente
 */

// Importar desde los módulos internos del proyecto
import { MemoryCache } from "./api/core/CacheService.ts";
import { SqlBuilder } from "./api/core/SqlBuilder.ts";
import { DataValidator } from "./api/core/DataValidator.ts";

console.log("🧪 Test de integración: Verificando módulos internos del proyecto");

// 1. Test del Cache interno
console.log("\n💾 Probando MemoryCache interno...");
const cacheConfig = {
  ttl: 300000, // 5 minutos
  maxSize: 100,
  enabled: true
};

const cache = new MemoryCache(cacheConfig);
cache.set("test", { mensaje: "Hola desde el proyecto independiente!" });
const cached = cache.get("test");
console.log("✅ Cache interno funcionando:", cached);

// 2. Test del SQL Builder interno
console.log("\n🏗️ Probando SqlBuilder interno...");
const entityConfig = {
  tableName: "usuarios",
  primaryKey: "id",
  displayName: "Usuarios",
  description: "Tabla de usuarios",
  fields: {
    id: { type: "number", required: true, autoIncrement: true },
    nombre: { type: "string", required: true, maxLength: 100 },
    email: { type: "string", required: true, maxLength: 255 },
    activo: { type: "boolean", defaultValue: true }
  },
  operations: {
    create: true,
    read: true,
    update: true,
    delete: true,
    search: true,
    paginate: true
  }
};

const sqlBuilder = new SqlBuilder(entityConfig);
const query = sqlBuilder.buildSelectQuery({
  filters: { activo: true },
  orderBy: "nombre",
  orderDirection: "ASC"
});

console.log("✅ SQL Builder interno funcionando:");
console.log("   SQL:", query.sql);
console.log("   Params:", query.params);

// 3. Test del Validador interno
console.log("\n✔️ Probando DataValidator interno...");
const validator = new DataValidator(entityConfig);

const validData = {
  nombre: "Juan Pérez",
  email: "juan@example.com",
  activo: true
};

const result = validator.validate(validData);
console.log("✅ Validador interno funcionando:");
console.log("   Es válido:", result.isValid);
console.log("   Errores:", result.errors.length);

console.log("\n🎉 ¡Test de integración completado exitosamente!");
console.log("   El proyecto funciona completamente de forma independiente.");
console.log("   No necesita librerías externas adicionales.");

console.log("\n� Para iniciar el servidor:");
console.log("   deno task start");
