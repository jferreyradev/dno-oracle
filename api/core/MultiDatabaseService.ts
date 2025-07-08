/**
 * Servicio de base de datos Oracle con soporte multi-conexión
 * Permite gestionar múltiples conexiones a diferentes bases de datos Oracle
 */

import { oracledb, load } from '../../deps.ts';

// Cargar variables de entorno
await load({ export: true });

// Configuración de conexión
export interface DatabaseConfig {
  name: string;
  user: string;
  password: string;
  connectString: string;
  poolMax?: number;
  poolMin?: number;
  poolIncrement?: number;
  poolTimeout?: number;
  description?: string;
  schema?: string;
}

// Pool de conexiones por configuración
interface PoolManager {
  config: DatabaseConfig;
  pool: oracledb.Pool;
  isActive: boolean;
  createdAt: Date;
  lastUsed: Date;
}

export class MultiDatabaseService {
  private pools: Map<string, PoolManager> = new Map();
  private defaultConnectionName = 'default';
  private isInitialized = false;

  constructor() {
    // Inicializar Oracle Client una sola vez
    this.initializeOracleClient();
  }

  /**
   * Inicializar Oracle Client en modo Thick
   */
  private initializeOracleClient(): void {
    try {
      const libPath = Deno.env.get('LIB_ORA') || 'C:\\oracle\\instantclient_21_11';
      oracledb.initOracleClient({ libDir: libPath });
      console.log('✅ Oracle Client inicializado en modo Thick');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('⚠️  Oracle Client ya inicializado o modo Thin:', message);
    }
  }

  /**
   * Configurar conexiones desde variables de entorno y configuración
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Cargar configuración por defecto desde .env
      const defaultConfig = this.loadDefaultConfig();
      if (defaultConfig) {
        await this.addConnection(defaultConfig);
        this.setDefaultConnection(defaultConfig.name);
      }

      // Cargar configuraciones adicionales desde archivo
      await this.loadAdditionalConfigs();

      this.isInitialized = true;
      console.log(`✅ MultiDatabaseService inicializado con ${this.pools.size} conexiones`);
    } catch (error) {
      console.error('❌ Error inicializando MultiDatabaseService:', error);
      throw error;
    }
  }

  /**
   * Cargar configuración por defecto desde variables de entorno
   */
  private loadDefaultConfig(): DatabaseConfig | null {
    const user = Deno.env.get('DB_USER') || Deno.env.get('USER');
    const password = Deno.env.get('DB_PASSWORD') || Deno.env.get('PASSWORD');
    const host = Deno.env.get('DB_HOST') || 'localhost';
    const port = Deno.env.get('DB_PORT') || '1521';
    const service = Deno.env.get('DB_SERVICE') || Deno.env.get('CONNECTIONSTRING') || 'XE';

    if (!user || !password) {
      console.warn('⚠️  No se encontró configuración de DB en variables de entorno');
      return null;
    }

    // Construir connection string si no está completo
    const connectString = service.includes(':') ? service : `${host}:${port}/${service}`;

    return {
      name: 'default',
      user,
      password,
      connectString,
      poolMax: parseInt(Deno.env.get('POOL_MAX') || '10'),
      poolMin: parseInt(Deno.env.get('POOL_MIN') || '2'),
      poolIncrement: parseInt(Deno.env.get('POOL_INCREMENT') || '1'),
      poolTimeout: parseInt(Deno.env.get('POOL_TIMEOUT') || '4'),
      description: 'Conexión por defecto desde variables de entorno',
      schema: Deno.env.get('DB_SCHEMA')
    };
  }

  /**
   * Cargar configuraciones adicionales desde archivo
   */
  private async loadAdditionalConfigs(): Promise<void> {
    try {
      const configPath = './config/databases.json';
      const configText = await Deno.readTextFile(configPath);
      const configs: DatabaseConfig[] = JSON.parse(configText);

      for (const config of configs) {
        if (!this.pools.has(config.name)) {
          await this.addConnection(config);
          console.log(`✅ Conexión adicional '${config.name}' cargada`);
        }
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.log('ℹ️  Archivo config/databases.json no encontrado - usando solo configuración por defecto');
      } else {
        console.warn('⚠️  Error cargando configuraciones adicionales:', error);
      }
    }
  }

  /**
   * Añadir una nueva conexión
   */
  async addConnection(config: DatabaseConfig): Promise<void> {
    if (this.pools.has(config.name)) {
      throw new Error(`Ya existe una conexión con el nombre '${config.name}'`);
    }

    try {
      const poolConfig = {
        user: config.user,
        password: config.password,
        connectString: config.connectString,
        poolMax: config.poolMax || 10,
        poolMin: config.poolMin || 2,
        poolIncrement: config.poolIncrement || 1,
        poolTimeout: config.poolTimeout || 4
      };

      const pool = await oracledb.createPool(poolConfig);
      
      this.pools.set(config.name, {
        config,
        pool,
        isActive: true,
        createdAt: new Date(),
        lastUsed: new Date()
      });

      console.log(`✅ Pool '${config.name}' creado: ${config.connectString}`);
    } catch (error) {
      console.error(`❌ Error creando pool '${config.name}':`, error);
      throw error;
    }
  }

  /**
   * Obtener conexión de un pool específico
   */
  private async getConnection(connectionName?: string): Promise<{
    connection: oracledb.Connection;
    poolName: string;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const poolName = connectionName || this.defaultConnectionName;
    const poolManager = this.pools.get(poolName);

    if (!poolManager) {
      throw new Error(`No existe la conexión '${poolName}'. Conexiones disponibles: ${Array.from(this.pools.keys()).join(', ')}`);
    }

    if (!poolManager.isActive) {
      throw new Error(`La conexión '${poolName}' está inactiva`);
    }

    try {
      const connection = await poolManager.pool.getConnection();
      poolManager.lastUsed = new Date();
      return { connection, poolName };
    } catch (error) {
      console.error(`❌ Error obteniendo conexión de '${poolName}':`, error);
      throw error;
    }
  }

  /**
   * Ejecutar consulta SQL SELECT
   */
  async querySQL(
    sql: string,
    binds: oracledb.BindParameters = [],
    connectionName?: string
  ): Promise<oracledb.Result<unknown> & { connectionUsed: string }> {
    const { connection, poolName } = await this.getConnection(connectionName);

    try {
      const result = await connection.execute(sql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchArraySize: 1000
      });

      return { ...result, connectionUsed: poolName };
    } catch (error) {
      console.error(`❌ Error ejecutando consulta en '${poolName}':`, error);
      console.error('SQL:', sql);
      console.error('Binds:', binds);
      throw error;
    } finally {
      await this.closeConnection(connection);
    }
  }

  /**
   * Ejecutar declaración SQL (INSERT, UPDATE, DELETE)
   */
  async executeSQL(
    sql: string,
    binds: oracledb.BindParameters = [],
    connectionName?: string
  ): Promise<oracledb.Result<unknown> & { connectionUsed: string }> {
    const { connection, poolName } = await this.getConnection(connectionName);

    try {
      const result = await connection.execute(sql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: true
      });

      return { ...result, connectionUsed: poolName };
    } catch (error) {
      console.error(`❌ Error ejecutando declaración en '${poolName}':`, error);
      console.error('SQL:', sql);
      console.error('Binds:', binds);
      throw error;
    } finally {
      await this.closeConnection(connection);
    }
  }

  /**
   * Ejecutar transacción en una conexión específica
   */
  async executeTransaction(
    statements: Array<{ sql: string; binds?: oracledb.BindParameters }>,
    connectionName?: string
  ): Promise<{ connectionUsed: string }> {
    const { connection, poolName } = await this.getConnection(connectionName);

    try {
      for (const statement of statements) {
        await connection.execute(statement.sql, statement.binds || [], {
          autoCommit: false
        });
      }

      await connection.commit();
      return { connectionUsed: poolName };
    } catch (error) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('❌ Error en rollback:', rollbackError);
      }
      console.error(`❌ Error en transacción en '${poolName}':`, error);
      throw error;
    } finally {
      await this.closeConnection(connection);
    }
  }

  /**
   * Cerrar conexión de forma segura
   */
  private async closeConnection(connection: oracledb.Connection): Promise<void> {
    try {
      await connection.close();
    } catch (error) {
      console.error('❌ Error cerrando conexión:', error);
    }
  }

  /**
   * Obtener información de todas las conexiones
   */
  getConnectionsInfo(): Array<{
    name: string;
    config: Omit<DatabaseConfig, 'password'>;
    isActive: boolean;
    createdAt: Date;
    lastUsed: Date;
    poolStats?: {
      poolMax: number;
      poolMin: number;
      connectionsOpen: number;
      connectionsInUse: number;
    } | null;
  }> {
    return Array.from(this.pools.entries()).map(([name, manager]) => ({
      name,
      config: {
        ...manager.config,
        password: '***'
      },
      isActive: manager.isActive,
      createdAt: manager.createdAt,
      lastUsed: manager.lastUsed,
      poolStats: manager.isActive ? {
        poolMax: manager.pool.poolMax,
        poolMin: manager.pool.poolMin,
        connectionsOpen: manager.pool.connectionsOpen,
        connectionsInUse: manager.pool.connectionsInUse
      } : null
    }));
  }

  /**
   * Probar conectividad de una conexión
   */
  async testConnection(connectionName?: string): Promise<{
    success: boolean;
    connectionName: string;
    responseTime: number;
    error?: string;
  }> {
    const poolName = connectionName || this.defaultConnectionName;
    const startTime = Date.now();

    try {
      const _result = await this.querySQL('SELECT 1 AS test FROM DUAL', [], poolName);
      const responseTime = Date.now() - startTime;

      return {
        success: true,
        connectionName: poolName,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        connectionName: poolName,
        responseTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Establecer conexión por defecto
   */
  setDefaultConnection(connectionName: string): void {
    if (!this.pools.has(connectionName)) {
      throw new Error(`No existe la conexión '${connectionName}'`);
    }
    this.defaultConnectionName = connectionName;
    console.log(`🔧 Conexión por defecto establecida: '${connectionName}'`);
  }

  /**
   * Obtener nombre de la conexión por defecto
   */
  getDefaultConnection(): string {
    return this.defaultConnectionName;
  }

  /**
   * Desactivar una conexión
   */
  async deactivateConnection(connectionName: string): Promise<void> {
    const poolManager = this.pools.get(connectionName);
    if (!poolManager) {
      throw new Error(`No existe la conexión '${connectionName}'`);
    }

    try {
      await poolManager.pool.close(0);
      poolManager.isActive = false;
      console.log(`🔒 Conexión '${connectionName}' desactivada`);
    } catch (error) {
      console.error(`❌ Error desactivando '${connectionName}':`, error);
      throw error;
    }
  }

  /**
   * Cerrar todas las conexiones
   */
  async closeAll(): Promise<void> {
    const promises = Array.from(this.pools.entries()).map(async ([name, manager]) => {
      if (manager.isActive) {
        try {
          await manager.pool.close(0);
          console.log(`🔒 Pool '${name}' cerrado`);
        } catch (error) {
          console.error(`❌ Error cerrando pool '${name}':`, error);
        }
      }
    });

    await Promise.all(promises);
    this.pools.clear();
    this.isInitialized = false;
    console.log('🔒 Todas las conexiones cerradas');
  }
}

// Instancia singleton
const multiDbService = new MultiDatabaseService();
export const multiDatabaseService = multiDbService;

// Funciones de compatibilidad con la API anterior
export const querySQL = (sql: string, binds: oracledb.BindParameters = [], connectionName?: string) =>
  multiDbService.querySQL(sql, binds, connectionName);

export const executeSQL = (sql: string, binds: oracledb.BindParameters = [], connectionName?: string) =>
  multiDbService.executeSQL(sql, binds, connectionName);

export const executeTransaction = (statements: Array<{ sql: string; binds?: oracledb.BindParameters }>, connectionName?: string) =>
  multiDbService.executeTransaction(statements, connectionName);

// Funciones específicas del multi-database
export const initializeDatabase = () => multiDbService.initialize();
export const addConnection = (config: DatabaseConfig) => multiDbService.addConnection(config);
export const getConnectionsInfo = () => multiDbService.getConnectionsInfo();
export const testConnection = (connectionName?: string) => multiDbService.testConnection(connectionName);
export const setDefaultConnection = (connectionName: string) => multiDbService.setDefaultConnection(connectionName);
export const getDefaultConnection = () => multiDbService.getDefaultConnection();
export const deactivateConnection = (connectionName: string) => multiDbService.deactivateConnection(connectionName);
export const closeAllConnections = () => multiDbService.closeAll();

// Auto-inicialización
export const DatabaseService = {
  getInstance: () => multiDbService
};
