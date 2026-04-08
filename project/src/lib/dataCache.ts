// Simple in-memory cache with TTL support
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default

  constructor(defaultTTL?: number) {
    if (defaultTTL) {
      this.defaultTTL = defaultTTL;
    }
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  remove(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get all keys (useful for debugging)
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Check if key exists and is valid
  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

// Export a singleton instance for global use
export const cache = new DataCache();

// Export the class for custom instances if needed
export { DataCache };

// Helper function to create cache keys
export function createCacheKey(prefix: string, ...args: (string | number | undefined | null)[]): string {
  return `${prefix}:${args.filter(Boolean).join(':')}`;
}