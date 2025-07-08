#!/usr/bin/env deno run --allow-net --allow-read --allow-env

/**
 * Script de Verificación de Configuración DNO-Oracle
 * 
 * Verifica la configuración de entidades y conexiones
 * para identificar problemas potenciales.
 */

import { load } from 'https://deno.land/std@0.224.0/dotenv/mod.ts';

// Cargar variables de entorno
await load({ export: true });

interface EntityConfig {
  name: string;
  tableName: string;
  primaryKey: string;
  defaultConnection?: string;
  allowedConnections?: string[];
  fields: Record<string, any>;
  operations: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
  validation?: {
    enabled: boolean;
    strictMode: boolean;
  };
  cache?: {
    enabled: boolean;
    ttl: number;
  };
}

interface Config {
  entities: Record<string, EntityConfig>;
}

// Colores para consola
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

async function verificarConfiguracion() {
  console.log(`${colors.cyan}🔍 Verificador de Configuración DNO-Oracle${colors.reset}`);
  console.log(`${colors.cyan}================================================${colors.reset}\n`);

  let erroresEncontrados = 0;
  let advertenciasEncontradas = 0;

  // 1. Verificar archivo de configuración
  console.log(`${colors.blue}📁 Verificando archivo de configuración...${colors.reset}`);
  
  try {
    const configText = await Deno.readTextFile('./config/entities.json');
    const config: Config = JSON.parse(configText);
    console.log(`${colors.green}✅ Archivo entities.json leído correctamente${colors.reset}`);

    // 2. Verificar estructura de entidades
    console.log(`\n${colors.blue}🔧 Verificando entidades configuradas...${colors.reset}`);
    
    const entidades = Object.keys(config.entities);
    console.log(`📋 Entidades encontradas: ${entidades.length}`);
    
    for (const [nombre, entidad] of Object.entries(config.entities)) {
      console.log(`\n  ${colors.magenta}▶ Entidad: ${nombre}${colors.reset}`);
      
      // Verificaciones básicas
      if (!entidad.name) {
        console.log(`    ${colors.red}❌ Falta campo 'name'${colors.reset}`);
        erroresEncontrados++;
      }
      
      if (!entidad.tableName) {
        console.log(`    ${colors.red}❌ Falta campo 'tableName'${colors.reset}`);
        erroresEncontrados++;
      } else {
        console.log(`    📊 Tabla: ${entidad.tableName}`);
      }
      
      if (!entidad.primaryKey) {
        console.log(`    ${colors.red}❌ Falta campo 'primaryKey'${colors.reset}`);
        erroresEncontrados++;
      } else {
        console.log(`    🔑 Clave primaria: ${entidad.primaryKey}`);
      }

      // Verificar configuración de conexiones
      if (!entidad.allowedConnections) {
        console.log(`    ${colors.yellow}⚠️  Sin 'allowedConnections' configuradas - puede causar errores multi-conexión${colors.reset}`);
        advertenciasEncontradas++;
      } else {
        console.log(`    🔗 Conexiones permitidas: ${entidad.allowedConnections.join(', ')}`);
        
        if (entidad.defaultConnection && !entidad.allowedConnections.includes(entidad.defaultConnection)) {
          console.log(`    ${colors.red}❌ 'defaultConnection' (${entidad.defaultConnection}) no está en 'allowedConnections'${colors.reset}`);
          erroresEncontrados++;
        }
      }

      // Verificar campos
      if (!entidad.fields || Object.keys(entidad.fields).length === 0) {
        console.log(`    ${colors.red}❌ Sin campos definidos${colors.reset}`);
        erroresEncontrados++;
      } else {
        console.log(`    📋 Campos: ${Object.keys(entidad.fields).length}`);
        
        // Verificar que la clave primaria esté en los campos
        if (!entidad.fields[entidad.primaryKey]) {
          console.log(`    ${colors.red}❌ Campo de clave primaria '${entidad.primaryKey}' no encontrado en 'fields'${colors.reset}`);
          erroresEncontrados++;
        }
      }

      // Verificar operaciones
      if (!entidad.operations) {
        console.log(`    ${colors.yellow}⚠️  Sin configuración de 'operations'${colors.reset}`);
        advertenciasEncontradas++;
      }

      // Verificar validación
      if (!entidad.validation) {
        console.log(`    ${colors.yellow}⚠️  Sin configuración de 'validation'${colors.reset}`);
        advertenciasEncontradas++;
      }

      // Verificar cache
      if (!entidad.cache) {
        console.log(`    ${colors.yellow}⚠️  Sin configuración de 'cache'${colors.reset}`);
        advertenciasEncontradas++;
      }
    }

  } catch (error) {
    console.log(`${colors.red}❌ Error leyendo configuración: ${error.message}${colors.reset}`);
    erroresEncontrados++;
    return;
  }

  // 3. Verificar variables de entorno
  console.log(`\n${colors.blue}🌐 Verificando variables de entorno...${colors.reset}`);
  
  const varsRequeridas = ['USER', 'PASSWORD', 'CONNECTIONSTRING'];
  const varsOpcionales = ['PORT', 'API_ONLY', 'LIB_ORA'];
  
  for (const varName of varsRequeridas) {
    const value = Deno.env.get(varName);
    if (!value) {
      console.log(`  ${colors.red}❌ Variable requerida '${varName}' no encontrada${colors.reset}`);
      erroresEncontrados++;
    } else {
      console.log(`  ${colors.green}✅ ${varName}: [configurada]${colors.reset}`);
    }
  }
  
  for (const varName of varsOpcionales) {
    const value = Deno.env.get(varName);
    if (value) {
      console.log(`  ${colors.green}✅ ${varName}: ${varName === 'PASSWORD' ? '[configurada]' : value}${colors.reset}`);
    } else {
      console.log(`  ${colors.yellow}⚠️  ${varName}: no configurada (usando default)${colors.reset}`);
    }
  }

  // 4. Resumen final
  console.log(`\n${colors.cyan}📊 Resumen de Verificación${colors.reset}`);
  console.log(`${colors.cyan}========================${colors.reset}`);
  
  if (erroresEncontrados === 0) {
    console.log(`${colors.green}✅ Sin errores críticos encontrados${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ ${erroresEncontrados} error(es) crítico(s) encontrado(s)${colors.reset}`);
  }
  
  if (advertenciasEncontradas === 0) {
    console.log(`${colors.green}✅ Sin advertencias${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  ${advertenciasEncontradas} advertencia(s) encontrada(s)${colors.reset}`);
  }

  // 5. Recomendaciones
  if (erroresEncontrados > 0 || advertenciasEncontradas > 0) {
    console.log(`\n${colors.blue}💡 Recomendaciones:${colors.reset}`);
    
    if (advertenciasEncontradas > 0) {
      console.log(`  • Agregar 'allowedConnections' a todas las entidades para evitar errores multi-conexión`);
      console.log(`  • Configurar 'validation', 'cache' y 'operations' para entidades incompletas`);
    }
    
    if (erroresEncontrados > 0) {
      console.log(`  • Corregir errores críticos antes de ejecutar el servidor`);
      console.log(`  • Verificar que todas las entidades tengan campos básicos requeridos`);
    }
  }

  console.log(`\n${colors.cyan}🚀 Para ejecutar el servidor:${colors.reset}`);
  console.log(`   deno run --allow-all api/server-enhanced.ts`);
  console.log(`\n${colors.cyan}📋 Para ver documentación:${colors.reset}`);
  console.log(`   http://localhost:8000/api/info`);
}

// Ejecutar verificación
if (import.meta.main) {
  await verificarConfiguracion();
}
