/**
 * EntityConfig - Carga y gestiona la configuración de entidades desde JSON
 */

export interface FieldConfig {
  type: string;
  length?: number;
  required?: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  unique?: boolean;
  readonly?: boolean;
  default?: string | number | boolean;
  displayName?: string;
  description?: string;
  searchable?: boolean;
  format?: string;
  values?: Array<{ value: string | number | boolean; label: string }>;
}

export interface FilterConfig {
  field: string;
  operator: string;
  value: string | number | boolean;
  displayName: string;
}

export interface ValidationConfig {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  allowedValues?: (string | number | boolean)[];
  message: string;
}

export interface CustomActionConfig {
  type: string;
  sql: string;
  displayName: string;
  description: string;
}

export interface EntityConfig {
  tableName: string;
  primaryKey: string;
  autoIncrement?: boolean;
  displayName: string;
  description: string;
  fields: Record<string, FieldConfig>;
  operations: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    search: boolean;
    paginate: boolean;
  };
  filters?: Record<string, FilterConfig>;
  validations?: Record<string, ValidationConfig>;
  customActions?: Record<string, CustomActionConfig>;
}

export interface AppConfig {
  entities: Record<string, EntityConfig>;
  settings: {
    defaultPageSize: number;
    maxPageSize: number;
    dateFormat: string;
    timestampFormat: string;
    errorMessages: Record<string, string>;
    features: Record<string, boolean>;
  };
}

class EntityConfigManager {
  private config: AppConfig | null = null;
  private configPath = "./config/entities.json";

  /**
   * Carga la configuración desde el archivo JSON
   */
  async loadConfig(): Promise<AppConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      const configText = await Deno.readTextFile(this.configPath);
      this.config = JSON.parse(configText) as AppConfig;
      
      // Validar configuración básica
      this.validateConfig();
      
      return this.config;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(`Error cargando configuración: ${errorMessage}`);
    }
  }

  /**
   * Obtiene la configuración de una entidad específica
   */
  async getEntityConfig(entityName: string): Promise<EntityConfig | null> {
    const config = await this.loadConfig();
    return config.entities[entityName] || null;
  }

  /**
   * Obtiene la lista de todas las entidades configuradas
   */
  async getEntityNames(): Promise<string[]> {
    const config = await this.loadConfig();
    return Object.keys(config.entities);
  }

  /**
   * Obtiene la configuración global
   */
  async getSettings(): Promise<AppConfig['settings']> {
    const config = await this.loadConfig();
    return config.settings;
  }

  /**
   * Valida que la configuración tenga la estructura requerida
   */
  private validateConfig(): void {
    if (!this.config) {
      throw new Error("Configuración no cargada");
    }

    if (!this.config.entities || typeof this.config.entities !== 'object') {
      throw new Error("La configuración debe tener una sección 'entities'");
    }

    // Validar cada entidad
    for (const [entityName, entityConfig] of Object.entries(this.config.entities)) {
      this.validateEntityConfig(entityName, entityConfig);
    }
  }

  /**
   * Valida la configuración de una entidad específica
   */
  private validateEntityConfig(entityName: string, config: EntityConfig): void {
    if (!config.tableName) {
      throw new Error(`Entidad '${entityName}': tableName es requerido`);
    }

    if (!config.primaryKey) {
      throw new Error(`Entidad '${entityName}': primaryKey es requerido`);
    }

    if (!config.fields || typeof config.fields !== 'object') {
      throw new Error(`Entidad '${entityName}': fields es requerido`);
    }

    // Verificar que la clave primaria existe en los campos
    if (!config.fields[config.primaryKey]) {
      throw new Error(`Entidad '${entityName}': el campo primaryKey '${config.primaryKey}' no existe en fields`);
    }

    // Validar que la clave primaria esté marcada como tal
    if (!config.fields[config.primaryKey].primaryKey) {
      throw new Error(`Entidad '${entityName}': el campo primaryKey '${config.primaryKey}' debe tener primaryKey: true`);
    }

    // Validar operaciones
    if (!config.operations) {
      throw new Error(`Entidad '${entityName}': operations es requerido`);
    }
  }

  /**
   * Recarga la configuración (útil para desarrollo)
   */
  async reloadConfig(): Promise<AppConfig> {
    this.config = null;
    return await this.loadConfig();
  }

  /**
   * Obtiene los campos buscables de una entidad
   */
  async getSearchableFields(entityName: string): Promise<string[]> {
    const entityConfig = await this.getEntityConfig(entityName);
    if (!entityConfig) return [];

    return Object.entries(entityConfig.fields)
      .filter(([_, fieldConfig]) => fieldConfig.searchable === true)
      .map(([fieldName, _]) => fieldName);
  }

  /**
   * Obtiene los campos que no son de solo lectura para operaciones CRUD
   */
  async getWritableFields(entityName: string): Promise<string[]> {
    const entityConfig = await this.getEntityConfig(entityName);
    if (!entityConfig) return [];

    return Object.entries(entityConfig.fields)
      .filter(([_, fieldConfig]) => !fieldConfig.readonly && !fieldConfig.autoIncrement)
      .map(([fieldName, _]) => fieldName);
  }

  /**
   * Obtiene los campos requeridos de una entidad
   */
  async getRequiredFields(entityName: string): Promise<string[]> {
    const entityConfig = await this.getEntityConfig(entityName);
    if (!entityConfig) return [];

    return Object.entries(entityConfig.fields)
      .filter(([_, fieldConfig]) => fieldConfig.required === true && !fieldConfig.autoIncrement)
      .map(([fieldName, _]) => fieldName);
  }

  /**
   * Guarda la configuración en el archivo JSON
   */
  async saveConfig(config: AppConfig): Promise<void> {
    try {
      // Validar la configuración antes de guardar
      this.config = config;
      this.validateConfig();
      
      // Convertir a JSON con formato bonito
      const configJson = JSON.stringify(config, null, 2);
      
      // Guardar archivo
      await Deno.writeTextFile(this.configPath, configJson);
      
      console.log(`✅ Configuración guardada en ${this.configPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(`Error guardando configuración: ${errorMessage}`);
    }
  }
}

// Instancia singleton
export const entityConfig = new EntityConfigManager();
