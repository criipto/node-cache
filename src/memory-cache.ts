import { match } from "ts-pattern";
import { CachePendingPolicy, CacheUpdatePolicy } from "./policies";

type UpdateResult<TData> =
  | {
      status: "ok";
      data: TData;
    }
  | {
      status: "error";
      error: unknown;
    };
function unwrap<TData>(r: UpdateResult<TData>): TData {
  return match(r)
    .with({ status: "ok" }, (r) => r.data)
    .with({ status: "error" }, (r) => {
      throw r.error;
    })
    .exhaustive();
}

export type CacheOptions<TData, TArgs extends unknown[]> = {
  updatePolicy: (
    cachedValue: TData,
    metadata: { lastUpdatedAt: Date }
  ) => CacheUpdatePolicy;
  pendingPolicy: (
    cachedValue: TData,
    metadata: { lastUpdatedAt: Date }
  ) => CachePendingPolicy;
  refresh: (...args: TArgs) => Promise<TData>;
};

type CacheItem<TData> =
  | {
      value: TData | null;
      metadata: { lastUpdatedAt: Date | null };
      promise: Promise<UpdateResult<TData>>;
      state: "pending";
    }
  | {
      value: TData;
      metadata: { lastUpdatedAt: Date };
      promise: Promise<UpdateResult<TData>>;
      state: "completed";
    }
  | {
      value: TData | null;
      error: unknown;
      metadata: { lastUpdatedAt: Date | null };
      promise: Promise<UpdateResult<TData>>;
      state: "failed";
    };

export function memoryCache<TData, TArgs extends unknown[]>(
  options: CacheOptions<TData, TArgs>
): (...args: TArgs) => Promise<TData> {
  const { refresh, updatePolicy, pendingPolicy } = options;

  const cache = new Map<string, CacheItem<TData>>();

  return (...args: TArgs): Promise<TData> => {
    const key = JSON.stringify(args);

    /** Updates the cache while and after the value is being refreshed */
    const update = (
      existing: CacheItem<TData> | null
    ): Promise<UpdateResult<TData>> => {
      const promise = refresh(...args)
        .then((val) => {
          cache.set(key, {
            value: val,
            promise,
            state: "completed",
            metadata: { lastUpdatedAt: new Date() },
          });
          return { status: "ok" as const, data: val };
        })
        .catch((err: unknown) => {
          cache.set(key, {
            value: existing?.value ?? null,
            promise,
            state: "failed",
            error: err,
            metadata: existing?.metadata ?? { lastUpdatedAt: null },
          });
          return { status: "error" as const, error: err };
        });
      cache.set(key, {
        value: existing?.value ?? null,
        promise,
        state: "pending",
        metadata: existing?.metadata ?? { lastUpdatedAt: null },
      });
      return promise;
    };

    /** Returns the cached/newly returned item according to the pendingPolicy */
    const resolveValue = (item: CacheItem<TData>): Promise<TData> => {
      if (item.value === null) {
        return item.promise.then(unwrap);
      }

      // We know that if the value is defined, then lastUpdatedAt is also defined
      const metadata = item.metadata as { lastUpdatedAt: Date };
      return match(pendingPolicy(item.value, metadata))
        .with(CachePendingPolicy.STALE, async () => item.value!)
        .with(CachePendingPolicy.WAIT, () => item.promise.then(unwrap))
        .exhaustive();
    };

    const existing = cache.get(key);
    return match(existing)
      .with(undefined, () => update(null).then(unwrap))
      .with({ state: "pending" }, (existing) => resolveValue(existing))
      .with({ state: "completed" }, (existing) => {
        const policy = updatePolicy(existing.value, existing.metadata);
        return match(policy)
          .with(CacheUpdatePolicy.DONT_UPDATE, async () => existing.value)
          .with(CacheUpdatePolicy.UPDATE, () =>
            resolveValue({
              ...existing,
              // NOTE: This promise is being evaluated here, but it is decided whether it's awaited by resolveValue (based on the pendingPolicy)
              promise: update(existing),
            })
          )
          .exhaustive();
      })
      .with({ state: "failed" }, (existing) => {
        // If the promise has failed, then we ALWAYS update
        // (counter to checking the policy in the 'completed' state)
        // however, the client can elect to allow STALE data if the request failed.
        return resolveValue({
          ...existing,
          // NOTE: This promise is being evaluated here, but it is decided whether it's awaited by resolveValue (based on the pendingPolicy)
          promise: update(existing),
        });
      })
      .exhaustive();
  };
}
