/**
 * Controlador para verificar el estado de la API
 */

import { checkConn, getPoolStats } from "../../src/db-improved.js";

export const healthController = {
  async getHealth(): Promise<Response> {
    try {
      const dbStatus = await checkConn();
      const poolStats = getPoolStats();

      const healthInfo = {
        status: "ok",
        timestamp: new Date().toISOString(),
        database: {
          connected: dbStatus,
          pool: poolStats || "Pool no inicializado",
        },
        api: {
          version: "1.0.0",
          uptime: `${Math.round(performance.now() / 1000)}s`,
        },
      };

      return new Response(
        JSON.stringify(healthInfo),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          status: "error",
          timestamp: new Date().toISOString(),
          error: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
