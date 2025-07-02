import type { Context } from "https://deno.land/x/oak@v12.6.1/mod.ts";

// Simulación simple de JWT sin dependencias externas por ahora
interface JWTPayload {
  id: string;
  username: string;
  role: string;
  exp: number;
}

export interface AuthConfig {
  jwtSecret: string;
  publicRoutes: string[];
  roles: Record<string, string[]>; // role -> permissions
}

export interface UserInfo {
  id: string;
  username: string;
  role: string;
  permissions: string[];
}

export class AuthService {
  constructor(private config: AuthConfig) {}

  validateToken(token: string): UserInfo | null {
    try {
      // Simulación simple de validación de token
      // En producción, usar una librería JWT real
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(atob(parts[1])) as JWTPayload;
      
      // Verificar expiración
      if (payload.exp < Date.now() / 1000) return null;
      
      const userInfo: UserInfo = {
        id: payload.id,
        username: payload.username,
        role: payload.role,
        permissions: this.config.roles[payload.role] || []
      };
      return userInfo;
    } catch {
      return null;
    }
  }

  isPublicRoute(path: string): boolean {
    return this.config.publicRoutes.some(route => 
      path.startsWith(route) || path === route
    );
  }

  hasPermission(user: UserInfo, operation: string): boolean {
    return user.permissions.includes(operation) || 
           user.permissions.includes('*') || 
           user.role === 'admin';
  }

  async authMiddleware(ctx: Context, next: () => Promise<unknown>) {
    // Permitir rutas públicas
    if (this.isPublicRoute(ctx.request.url.pathname)) {
      await next();
      return;
    }

    const authHeader = ctx.request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Token requerido" };
      return;
    }

    const token = authHeader.substring(7);
    const user = this.validateToken(token);
    
    if (!user) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Token inválido" };
      return;
    }

    // Guardar información del usuario en el contexto
    ctx.state.user = user;
    await next();
  }
}
