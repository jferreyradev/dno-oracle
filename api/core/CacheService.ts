export interface CacheConfig {
  defaultTTL: number; // tiempo de vida en segundos
  maxSize: number;    // número máximo de entradas
  cleanupInterval: number; // intervalo de limpieza en ms
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccess: number;
}

export class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private cleanupTimer?: number;

  constructor(private config: CacheConfig) {
    this.startCleanup();
  }

  set<T>(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      accessCount: 0,
      lastAccess: Date.now()
    };

    // Si está lleno, remover el elemento menos usado
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, entry);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Verificar si ha expirado
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    // Actualizar estadísticas de acceso
    entry.accessCount++;
    entry.lastAccess = Date.now();

    return entry.value as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Generar clave para consultas SQL
  generateQueryKey(sql: string, params?: unknown[]): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `query:${btoa(sql + paramStr)}`;
  }

  // Generar clave para entidades
  generateEntityKey(entity: string, id?: string | number, operation?: string): string {
    const parts = ['entity', entity];
    if (id !== undefined) parts.push(String(id));
    if (operation) parts.push(operation);
    return parts.join(':');
  }

  // Invalidar cache por patrón
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  // Estadísticas del cache
  getStats() {
    const entries = Array.from(this.cache.values());
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: this.calculateHitRate(),
      averageAccessCount: entries.reduce((sum, e) => sum + e.accessCount, 0) / entries.length || 0,
      oldestEntry: Math.min(...entries.map(e => e.timestamp)),
      newestEntry: Math.max(...entries.map(e => e.timestamp))
    };
  }

  private calculateHitRate(): number {
    // Implementación simple - en producción usar contadores más precisos
    const entries = Array.from(this.cache.values());
    const totalAccess = entries.reduce((sum, e) => sum + e.accessCount, 0);
    return totalAccess > 0 ? (entries.length / totalAccess) * 100 : 0;
  }

  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let leastUsedCount = Number.MAX_SAFE_INTEGER;
    let oldestAccess = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < leastUsedCount || 
         (entry.accessCount === leastUsedCount && entry.lastAccess < oldestAccess)) {
        leastUsedKey = key;
        leastUsedCount = entry.accessCount;
        oldestAccess = entry.lastAccess;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl * 1000) {
          this.cache.delete(key);
        }
      }
    }, this.config.cleanupInterval);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
  }
}
