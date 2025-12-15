
import { AnalysisResult } from "../types";

const CACHE_PREFIX = 'lifelens_cache_';
const MAX_CACHE_SIZE = 200; // Limit total cached entries

interface CacheEntry {
  result: AnalysisResult;
  timestamp: number;
}

/**
 * Retrieves a cached analysis result by image hash.
 * Returns null if not found.
 */
export const getCachedAnalysis = (hash: string): AnalysisResult | null => {
  try {
    const key = `${CACHE_PREFIX}${hash}`;
    const item = localStorage.getItem(key);
    if (item) {
      const entry: CacheEntry = JSON.parse(item);
      // Update timestamp on access (LRU behavior)
      entry.timestamp = Date.now();
      localStorage.setItem(key, JSON.stringify(entry));
      return { ...entry.result, fromCache: true };
    }
  } catch (e) {
    console.error("Cache read error", e);
  }
  return null;
};

/**
 * Stores an analysis result in localStorage.
 * Enforces LRU eviction if cache size exceeds limit.
 */
export const cacheAnalysis = (hash: string, result: AnalysisResult) => {
  try {
    const key = `${CACHE_PREFIX}${hash}`;
    const entry: CacheEntry = {
      result,
      timestamp: Date.now()
    };
    
    // Attempt to save
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (e) {
      // If quota exceeded, try clearing old items then save again
      enforceCacheLimit(0); // clear aggressive
      localStorage.setItem(key, JSON.stringify(entry));
    }

    // Regular cleanup
    enforceCacheLimit(MAX_CACHE_SIZE);
  } catch (e) {
    console.error("Cache write error", e);
  }
};

/**
 * Removes oldest entries if cache exceeds `limit`.
 */
const enforceCacheLimit = (limit: number) => {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) {
      keys.push(key);
    }
  }

  if (keys.length > limit) {
    const entries = keys.map(key => {
      try {
        const item = localStorage.getItem(key);
        return { key, timestamp: item ? JSON.parse(item).timestamp : 0 };
      } catch {
        return { key, timestamp: 0 };
      }
    });

    // Sort by timestamp ascending (oldest first)
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest until we fit within limit
    const toRemove = entries.slice(0, keys.length - limit);
    toRemove.forEach(e => localStorage.removeItem(e.key));
  }
};

/**
 * Clears all LifeLens analysis cache entries.
 */
export const clearAnalysisCache = () => {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) {
      keys.push(key);
    }
  }
  keys.forEach(key => localStorage.removeItem(key));
  console.log(`Cleared ${keys.length} cached analyses.`);
};
