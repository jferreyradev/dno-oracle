// Modulos que se utilizarán en la app

import oracledb from 'npm:oracledb@6.0.2';
export { oracledb };

export { load } from "https://deno.land/std@0.204.0/dotenv/mod.ts";

// Servidor HTTP
export { serve } from "https://deno.land/std@0.204.0/http/server.ts";