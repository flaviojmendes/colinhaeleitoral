import { kv as vercelKv } from "@vercel/kv";

interface MemoryValue {
  value: unknown;
  expiresAt: number;
}

interface KvAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}

const memoryStore = new Map<string, MemoryValue>();
const MEMORY_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const hasVercelKv =
  Boolean(process.env.KV_REST_API_URL) &&
  Boolean(process.env.KV_REST_API_TOKEN);

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

  async set(key: string, value: unknown) {
    memoryStore.set(key, {
      value,
      expiresAt: Date.now() + MEMORY_TTL_MS,
    });
  },
};

export const kv: KvAdapter = hasVercelKv
  ? {
      async get<T>(key: string) {
        return vercelKv.get<T>(key);
      },
      async set(key: string, value: unknown) {
        await vercelKv.set(key, value);
      },
    }
  : memoryKv;
