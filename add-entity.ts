#!/usr/bin/env deno run --allow-read --allow-write

/**
 * Script simple para agregar entidades manualmente
 * Uso: deno run --allow-read --allow-write add-entity.ts
 */

interface EntityField {
  type: string;
  required?: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  displayName?: string;
  description?: string;
  length?: number;
  precision?: number;
  scale?: number;
  default?: string | number;
  readonly?: boolean;
  searchable?: boolean;
  unique?: boolean;
  values?: Array<{ value: string | number; label: string }>;
}

interface EntityConfig {
  tableName: string;
  primaryKey: string;
  autoIncrement?: boolean;
  displayName: string;
  description: string;
  fields: Record<string, EntityField>;
  operations: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
  validations?: Record<string, {
    pattern?: string;
    message?: string;
  }>;
  filters?: Record<string, {
    condition: string;
    description: string;
  }>;
  endpoints: string[];
}

interface ConfigFile {
  entities: Record<string, EntityConfig>;
  config?: Record<string, unknown>;
}

class EntityAdder {
  private configPath = './config/entities.json';

  async loadConfig(): Promise<ConfigFile> {
    try {
      const content = await Deno.readTextFile(this.configPath);
      return JSON.parse(content);
    } catch {
      return { entities: {}, config: {} };
    }
  }

  async saveConfig(config: ConfigFile): Promise<void> {
    await Deno.writeTextFile(this.configPath, JSON.stringify(config, null, 2));
  }

  async addEntity(name: string, entity: EntityConfig): Promise<void> {
    const config = await this.loadConfig();
    config.entities[name] = entity;
    await this.saveConfig(config);
    console.log(`✅ Entidad '${name}' agregada exitosamente`);
  }

  createEntityTemplate(name: string, tableName: string): EntityConfig {
    return {
      tableName,
      primaryKey: `ID_${name.toUpperCase()}`,
      autoIncrement: true,
      displayName: this.formatDisplayName(name),
      description: `Entidad ${name}`,
      fields: {
        [`ID_${name.toUpperCase()}`]: {
          type: 'NUMBER',
          required: true,
          primaryKey: true,
          autoIncrement: true,
          displayName: 'ID',
          description: 'Identificador único',
          readonly: true
        },
        'NOMBRE': {
          type: 'VARCHAR2',
          length: 100,
          required: true,
          displayName: 'Nombre',
          description: 'Nombre del registro',
          searchable: true
        },
        'ACTIVO': {
          type: 'INTEGER',
          required: true,
          default: 1,
          displayName: 'Activo',
          description: 'Estado activo/inactivo',
          values: [
            { value: 0, label: 'Inactivo' },
            { value: 1, label: 'Activo' }
          ]
        },
        'FECHA_CREACION': {
          type: 'DATE',
          required: false,
          displayName: 'Fecha de Creación',
          description: 'Fecha de creación del registro',
          readonly: true
        }
      },
      operations: {
        create: true,
        read: true,
        update: true,
        delete: true
      },
      validations: {},
      filters: {
        'activos': {
          condition: 'ACTIVO = 1',
          description: 'Solo registros activos'
        }
      },
      endpoints: [
        `/api/${name}`,
        `/api/${name}/:id`
      ]
    };
  }

  private formatDisplayName(name: string): string {
    return name.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  async listEntities(): Promise<void> {
    const config = await this.loadConfig();
    console.log('📋 Entidades existentes:');
    Object.keys(config.entities).forEach((name, i) => {
      console.log(`  ${i + 1}. ${name} → ${config.entities[name].tableName}`);
    });
  }

  // Plantillas predefinidas
  createUserEntity(): EntityConfig {
    return {
      tableName: 'WORKFLOW.USUARIOS',
      primaryKey: 'ID_USUARIO',
      autoIncrement: true,
      displayName: 'Usuarios',
      description: 'Tabla de usuarios del sistema',
      fields: {
        'ID_USUARIO': {
          type: 'NUMBER',
          required: true,
          primaryKey: true,
          autoIncrement: true,
          displayName: 'ID Usuario',
          description: 'Identificador único del usuario',
          readonly: true
        },
        'NOMBRE': {
          type: 'VARCHAR2',
          length: 100,
          required: true,
          displayName: 'Nombre',
          description: 'Nombre completo del usuario',
          searchable: true
        },
        'EMAIL': {
          type: 'VARCHAR2',
          length: 150,
          required: true,
          displayName: 'Email',
          description: 'Dirección de correo electrónico',
          searchable: true,
          unique: true
        },
        'ACTIVO': {
          type: 'INTEGER',
          required: true,
          default: 1,
          displayName: 'Activo',
          description: 'Estado del usuario',
          values: [
            { value: 0, label: 'Inactivo' },
            { value: 1, label: 'Activo' }
          ]
        },
        'FECHA_CREACION': {
          type: 'DATE',
          required: false,
          displayName: 'Fecha de Creación',
          description: 'Fecha de creación del usuario',
          readonly: true
        }
      },
      operations: {
        create: true,
        read: true,
        update: true,
        delete: true
      },
      validations: {
        'EMAIL': {
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          message: 'El formato del email no es válido'
        }
      },
      filters: {
        'activos': {
          condition: 'ACTIVO = 1',
          description: 'Solo usuarios activos'
        },
        'por_nombre': {
          condition: 'UPPER(NOMBRE) LIKE UPPER(\'%\' || :nombre || \'%\')',
          description: 'Buscar por nombre'
        }
      },
      endpoints: [
        '/api/usuarios',
        '/api/usuarios/:id'
      ]
    };
  }

  createProductEntity(): EntityConfig {
    return {
      tableName: 'INVENTARIO.PRODUCTOS',
      primaryKey: 'ID_PRODUCTO',
      autoIncrement: true,
      displayName: 'Productos',
      description: 'Tabla de productos del inventario',
      fields: {
        'ID_PRODUCTO': {
          type: 'NUMBER',
          required: true,
          primaryKey: true,
          autoIncrement: true,
          displayName: 'ID Producto',
          description: 'Identificador único del producto',
          readonly: true
        },
        'NOMBRE': {
          type: 'VARCHAR2',
          length: 100,
          required: true,
          displayName: 'Nombre',
          description: 'Nombre del producto',
          searchable: true
        },
        'DESCRIPCION': {
          type: 'VARCHAR2',
          length: 500,
          required: false,
          displayName: 'Descripción',
          description: 'Descripción del producto',
          searchable: true
        },
        'PRECIO': {
          type: 'NUMBER',
          precision: 10,
          scale: 2,
          required: true,
          displayName: 'Precio',
          description: 'Precio del producto'
        },
        'CATEGORIA': {
          type: 'VARCHAR2',
          length: 50,
          required: true,
          displayName: 'Categoría',
          description: 'Categoría del producto',
          searchable: true
        },
        'ACTIVO': {
          type: 'INTEGER',
          required: true,
          default: 1,
          displayName: 'Activo',
          description: 'Estado del producto',
          values: [
            { value: 0, label: 'Inactivo' },
            { value: 1, label: 'Activo' }
          ]
        }
      },
      operations: {
        create: true,
        read: true,
        update: true,
        delete: true
      },
      validations: {
        'PRECIO': {
          pattern: '^[0-9]+(\\.[0-9]{1,2})?$',
          message: 'El precio debe ser un número válido con máximo 2 decimales'
        }
      },
      filters: {
        'activos': {
          condition: 'ACTIVO = 1',
          description: 'Solo productos activos'
        },
        'por_categoria': {
          condition: 'UPPER(CATEGORIA) = UPPER(:categoria)',
          description: 'Filtrar por categoría'
        },
        'precio_rango': {
          condition: 'PRECIO BETWEEN :precio_min AND :precio_max',
          description: 'Filtrar por rango de precios'
        }
      },
      endpoints: [
        '/api/productos',
        '/api/productos/:id'
      ]
    };
  }
}

// Función principal
async function main() {
  console.log('🚀 Agregador de Entidades DNO-Oracle\n');
  
  const adder = new EntityAdder();
  
  // Mostrar entidades existentes
  await adder.listEntities();
  
  console.log('\n📝 Plantillas disponibles:');
  console.log('  1. usuarios - Entidad de usuarios');
  console.log('  2. productos - Entidad de productos');
  console.log('  3. personalizada - Plantilla personalizable');
  
  const option = prompt('\n🔍 Selecciona una opción (1-3):');
  
  if (!option || !['1', '2', '3'].includes(option)) {
    console.log('❌ Opción inválida');
    return;
  }
  
  let entityConfig: EntityConfig;
  let entityName: string;
  
  switch (option) {
    case '1': {
      entityName = 'usuarios';
      entityConfig = adder.createUserEntity();
      break;
    }
    case '2': {
      entityName = 'productos';
      entityConfig = adder.createProductEntity();
      break;
    }
    case '3': {
      entityName = prompt('📝 Nombre de la entidad:') || 'mi_entidad';
      const tableName = prompt('📝 Nombre de la tabla:') || `WORKFLOW.${entityName.toUpperCase()}`;
      entityConfig = adder.createEntityTemplate(entityName, tableName);
      break;
    }
    default:
      return;
  }
  
  // Confirmar
  console.log('\n📋 Configuración a agregar:');
  console.log(`  Entidad: ${entityName}`);
  console.log(`  Tabla: ${entityConfig.tableName}`);
  console.log(`  Campos: ${Object.keys(entityConfig.fields).length}`);
  
  const confirm = prompt('\n❓ ¿Agregar entidad? (s/N):');
  if (confirm?.toLowerCase() !== 's') {
    console.log('❌ Operación cancelada');
    return;
  }
  
  try {
    await adder.addEntity(entityName, entityConfig);
    console.log('\n✅ ¡Entidad agregada exitosamente!');
    console.log('🔄 Reinicia el servidor para aplicar los cambios');
    console.log(`📡 Endpoints disponibles:`);
    entityConfig.endpoints.forEach(endpoint => {
      console.log(`   ${endpoint}`);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Error:', message);
  }
}

// Ejecutar si es el módulo principal
if (import.meta.main) {
  await main();
}

export { EntityAdder };
