import { match } from "ts-pattern";
import {
  memoryCache,
  CacheOptions as MemoryCacheOptions,
} from "./memory-cache";
import { CacheUpdatePolicy } from "./policies";

export type JSONLiteral = String | Number | Boolean | null;
export type JSONObject = { [key: string]: Json };
export type Json = JSONLiteral | JSONObject | Json[];

export interface IStorage<TKey, TData extends Json> {
  getItem: (
    key: TKey
  ) => Promise<{ value: TData; metadata: { lastUpdatedAt: Date } } | null>;
  setItem: (
    key: TKey,
    value: TData,
    metadata: { lastUpdatedAt: Date }
  ) => Promise<void>;
}

export type CacheOptions<TKey, TData extends Json> = MemoryCacheOptions<
  TData,
  TKey[]
> & {
  storage: IStorage<TKey, TData>;
};

/**
 * A cache implementation that holds values in storage (as well as memory)
 */
export function storedCache<TKey, TData extends Json>(
  options: CacheOptions<TKey, TData>
): (key: TKey) => Promise<TData> {
  const { storage, updatePolicy } = options;
  const cache = memoryCache({
    ...options,
    async refresh(key: TKey) {
      const existing = await storage.getItem(key);
      if (existing !== null) {
        const policy = updatePolicy(existing.value, existing.metadata);
        return match(policy)
          .with(CacheUpdatePolicy.DONT_UPDATE, async () => existing.value)
          .with(CacheUpdatePolicy.UPDATE, () => options.refresh(key))
          .exhaustive();
      }
      const update = await options.refresh(key);
      await storage.setItem(key, update, { lastUpdatedAt: new Date() });
      return update;
    },
  });
  return (key: TKey): Promise<TData> => {
    return cache(key);
  };
}
