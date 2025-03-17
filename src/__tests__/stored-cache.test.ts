import test from "ava";
import {
  IStorage,
  storedCache,
  CachePendingPolicy,
  CacheUpdatePolicy,
} from "../index.js";
import sinon from "sinon";
import type { Json } from "../index.js";

type StorageFake<TKey, TData extends Json> = IStorage<TKey, TData> & {
  getItem: sinon.SinonSpy<
    TKey[],
    Promise<{ value: TData; metadata: { lastUpdatedAt: Date } } | null>
  >;
  setItem: sinon.SinonSpy<
    [TKey, TData, { lastUpdatedAt: Date }],
    Promise<void>
  >;
};

const storageFake = <TKey, TData extends Json>(): StorageFake<TKey, TData> => {
  return {
    getItem: sinon.fake.resolves(null),
    setItem: sinon.fake(),
  };
};

test("checks storage before refreshing cache", async (t) => {
  const expected = `my_return_val_${Math.random().toString()}`;
  const storage = {
    ...storageFake<string, string>(),
    getItem: sinon.fake.resolves({
      value: expected,
      metadata: { lastUpdatedAt: new Date() },
    }),
  };

  const cachedFn = storedCache<string, string>({
    updatePolicy: () => CacheUpdatePolicy.DONT_UPDATE,
    pendingPolicy: () => CachePendingPolicy.WAIT,
    refresh: async () => {
      throw new Error("nah");
    },
    storage,
  });

  // ACT
  const actual = await cachedFn("key");

  // ASSERT
  t.is(storage.getItem.callCount, 1);
  t.is(actual, expected);
});

test("refreshes if stored value does not match update policy", async (t) => {
  const expected = `my_return_val_${Math.random().toString()}`;
  const storage = {
    ...storageFake<string, string>(),
    getItem: sinon.fake.resolves({
      value: Math.random().toString(),
      metadata: { lastUpdatedAt: new Date("2000-01-01T00:00:00Z") },
    }),
  };

  const cachedFn = storedCache<string, string>({
    updatePolicy: (v, { lastUpdatedAt }) => {
      if (Date.now() - lastUpdatedAt.valueOf() < 3600) {
        return CacheUpdatePolicy.DONT_UPDATE;
      }
      return CacheUpdatePolicy.UPDATE;
    },
    pendingPolicy: () => CachePendingPolicy.WAIT,
    refresh: async () => expected,
    storage,
  });

  // ACT
  const actual = await cachedFn("key");

  // ASSERT
  t.is(storage.getItem.callCount, 1);
  t.is(actual, expected);
});

test("updates stored value after refresh", async (t) => {
  const expected = `my_return_val_${Math.random().toString()}`;
  const storage = {
    ...storageFake<string, string>(),
    getItem: sinon.fake.resolves(null),
  };

  const cachedFn = storedCache<string, string>({
    updatePolicy: () => CacheUpdatePolicy.UPDATE,
    pendingPolicy: () => CachePendingPolicy.WAIT,
    refresh: async () => expected,
    storage,
  });

  // ACT
  const actual = await cachedFn("key");

  // ASSERT
  t.is(
    storage.setItem.callCount,
    1,
    `setItem was not called once, but ${storage.setItem.callCount} times`
  );
  t.is(storage.setItem.firstCall.args[0], "key");
  t.is(storage.setItem.firstCall.args[1], expected);
  t.is(actual, expected);
});
