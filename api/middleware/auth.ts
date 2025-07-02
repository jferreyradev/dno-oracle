/**
 * Middleware de autenticación básica (opcional)
 */

export function authMiddleware(request: Request): Response | null {
  // Por ahora, autenticación deshabilitada
  // Se puede implementar JWT, API Keys, etc.

  const authHeader = request.headers.get("Authorization");

  // Si no hay header de autorización, continuar sin autenticación
  if (!authHeader) {
    return null;
  }

  // Ejemplo de validación simple con API Key
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const validTokens = [
      "dno-oracle-api-key-2025", // Token de ejemplo
      // @ts-ignore - Acceso a variable de entorno
      globalThis.Deno?.env?.get("API_TOKEN"), // Token desde variable de entorno
    ].filter(Boolean);

    if (!validTokens.includes(token)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Token de autorización inválido",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  return null; // Autorización exitosa
}

/**
 * Middleware de validación de rate limiting (básico)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimitMiddleware(request: Request): Response | null {
  const clientIP = request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const maxRequests = 100; // Máximo 100 requests por minuto
  const windowMs = 60 * 1000; // 1 minuto
  const now = Date.now();

  const clientData = requestCounts.get(clientIP);

  if (!clientData || now > clientData.resetTime) {
    // Nuevo cliente o ventana de tiempo expirada
    requestCounts.set(clientIP, {
      count: 1,
      resetTime: now + windowMs,
    });
    return null;
  }

  if (clientData.count >= maxRequests) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Límite de requests excedido",
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": Math.ceil((clientData.resetTime - now) / 1000)
            .toString(),
        },
      },
    );
  }

  clientData.count++;
  return null;
}
