import { kv as vercelKv } from "@vercel/kv";

interface MemoryValue {
  value: unknown;
  expiresAt: number;
}

interface KvAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
}

const memoryStore = new Map<string, MemoryValue>();
const MEMORY_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function hasVercelKv() {
  return (
    Boolean(process.env.KV_REST_API_URL) &&
    Boolean(process.env.KV_REST_API_TOKEN)
  );
}

const memoryKv: KvAdapter = {
  async get<T>(key: string) {
    const item = memoryStore.get(key);

    if (!item) {
      return null;
    }

    if (item.expiresAt <= Date.now()) {
      memoryStore.delete(key);
      return null;
    }

    return item.value as T;
  },

  async set(key: string, value: unknown, ttlSeconds?: number) {
    memoryStore.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds ? ttlSeconds * 1000 : MEMORY_TTL_MS),
    });
  },
};

export const kv: KvAdapter = {
  async get<T>(key: string) {
    if (hasVercelKv()) {
      return vercelKv.get<T>(key);
    }

    return memoryKv.get<T>(key);
  },
  async set(key: string, value: unknown, ttlSeconds?: number) {
    if (hasVercelKv()) {
      if (ttlSeconds) {
        await vercelKv.set(key, value, { ex: ttlSeconds });
        return;
      }

      await vercelKv.set(key, value);
      return;
    }

    await memoryKv.set(key, value, ttlSeconds);
  },
};
