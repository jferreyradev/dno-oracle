#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env
/**
 * Script de inicio para el servidor API mejorado
 * Uso: deno run --allow-net --allow-read --allow-env run-enhanced.ts [puerto]
 */

console.log("🚀 Iniciando API Genérica Mejorada...");
console.log("📋 Características:");
console.log("   ✅ CRUD automático basado en configuración");
console.log("   ✅ Cache en memoria configurable");
console.log("   ✅ Métricas de rendimiento");
console.log("   ✅ Logging mejorado");
console.log("   ✅ Manejo de errores robusto");
console.log("   ⚠️  Autenticación (disponible pero deshabilitada)");
console.log("");

// Importar e iniciar servidor
const { GenericApiServer } = await import("./api/server-enhanced.ts");

const server = new GenericApiServer();

// Configuración de cache
server.enableCache({
  defaultTTL: 600,       // 10 minutos
  maxSize: 2000,         // 2000 entradas
  cleanupInterval: 30000 // 30 segundos
});

// Configuración de autenticación (comentada)
// server.enableAuth({
//   jwtSecret: 'your-secret-key-here',
//   publicRoutes: ['/api/health', '/api/info'],
//   roles: {
//     'admin': ['*'],
//     'user': ['*.read', '*.create'],
//     'readonly': ['*.read']
//   }
// });

// Manejar señales de cierre
Deno.addSignalListener('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  server.stop();
  Deno.exit(0);
});

// Obtener puerto
const port = parseInt(Deno.args[0] || Deno.env.get('PORT') || '8000');

// Iniciar servidor
try {
  await server.start(port);
} catch (error) {
  console.error("❌ Error al iniciar servidor:", error);
  Deno.exit(1);
}
