/**
 * Middleware para logging de peticiones HTTP
 */

export function logger(request: Request): void {
  const url = new URL(request.url);
  const timestamp = new Date().toISOString();
  const method = request.method;
  const path = url.pathname + url.search;

  console.log(`[${timestamp}] ${method} ${path}`);
}
