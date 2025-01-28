import test from "ava";
import { setTimeout } from "node:timers";
import sinon from "sinon";
import {
  memoryCache,
  CachePendingPolicy,
  CacheUpdatePolicy,
} from "../index.js";

test("cache - sequential - (updatePolicy = DONT_UPDATE) it calls refresh on the first invocation", async (t) => {
  // ARRANGE
  const expected = `my_return_val_${Math.random().toString()}`;
  const fn = sinon.stub().returns(Promise.resolve(expected));

  const cachedFn = memoryCache({
    updatePolicy: () => CacheUpdatePolicy.DONT_UPDATE,
    pendingPolicy: () => CachePendingPolicy.WAIT,
    refresh: fn,
  });

  // ACT
  const actual = await cachedFn();

  // ASSERT
  t.is(actual, expected);
  t.is(fn.callCount, 1);
});

test("cache - sequential - (updatePolicy = UPDATE) it calls refresh on the first invocation", async (t) => {
  // ARRANGE
  const expected = `my_return_val_${Math.random().toString()}`;
  const fn = sinon.stub().returns(Promise.resolve(expected));

  const cachedFn = memoryCache({
    updatePolicy: () => CacheUpdatePolicy.UPDATE,
    pendingPolicy: () => CachePendingPolicy.WAIT,
    refresh: fn,
  });

  // ACT
  const actual = await cachedFn();

  // ASSERT
  t.is(actual, expected);
  t.is(fn.callCount, 1);
});

test("cache - sequential - (updatePolicy = DONT_UPDATE) it does not call refresh on the second invocation", async (t) => {
  // ARRANGE
  const expected = `my_return_val_${Math.random().toString()}`;
  const fn = sinon.stub().returns(Promise.resolve(expected));

  const cachedFn = memoryCache({
    refresh: fn,
    updatePolicy: () => CacheUpdatePolicy.DONT_UPDATE,
    pendingPolicy: () => CachePendingPolicy.WAIT,
  });

  // ACT
  const actual1 = await cachedFn();
  const actual2 = await cachedFn();

  // ASSERT
  t.is(actual1, expected);
  t.is(actual2, expected);
  t.is(fn.callCount, 1);
});

test("cache - sequential - (updatePolicy = UPDATE) it calls refresh on the second invocation", async (t) => {
  // ARRANGE
  const expected = `my_return_val_${Math.random().toString()}`;
  const fn = sinon.stub().returns(Promise.resolve(expected));

  const cachedFn = memoryCache({
    refresh: fn,
    updatePolicy: () => CacheUpdatePolicy.UPDATE,
    pendingPolicy: () => CachePendingPolicy.WAIT,
  });

  // ACT
  const actual1 = await cachedFn();
  const actual2 = await cachedFn();

  // ASSERT
  t.is(actual1, expected);
  t.is(actual2, expected);
  t.is(fn.callCount, 2);
});

test("cache - sequential - (updatePolicy = DONT_UPDATE) it calls refresh if args are different", async (t) => {
  // ARRANGE
  const expected1 = `my_return_val_1_${Math.random().toString()}`;
  const expected2 = `my_return_val_2_${Math.random().toString()}`;

  let callCount = 0;
  const cachedFn = memoryCache({
    refresh: async (inp) => {
      callCount++;
      return inp;
    },
    updatePolicy: () => CacheUpdatePolicy.DONT_UPDATE,
    pendingPolicy: () => CachePendingPolicy.WAIT,
  });

  // ACT
  const actual1 = await cachedFn(expected1);
  const actual2 = await cachedFn(expected1);
  const actual3 = await cachedFn(expected2);

  // ASSERT
  t.is(actual1, expected1);
  t.is(actual2, expected1);
  t.is(actual3, expected2);
  t.is(callCount, 2);
});

test("cache - sequential - (updatePolicy = UPDATE) it calls refresh if args are different", async (t) => {
  // ARRANGE
  const expected1 = `my_return_val_1_${Math.random().toString()}`;
  const expected2 = `my_return_val_2_${Math.random().toString()}`;

  let callCount = 0;
  const cachedFn = memoryCache({
    refresh: async (inp) => {
      callCount++;
      return inp;
    },
    updatePolicy: () => CacheUpdatePolicy.UPDATE,
    pendingPolicy: () => CachePendingPolicy.WAIT,
  });

  // ACT
  const actual1 = await cachedFn(expected1);
  const actual2 = await cachedFn(expected1);
  const actual3 = await cachedFn(expected2);

  // ASSERT
  t.is(actual1, expected1);
  t.is(actual2, expected1);
  t.is(actual3, expected2);
  t.is(callCount, 3);
});

test("cache - parallel - (updatePolicy = DONT_UPDATE, pendingPolicy = WAIT) it only calls refresh once during parallel invocation", async (t) => {
  // ARRANGE
  const expected = `my_return_val_${Math.random().toString()}`;
  const fn = sinon.stub().returns(Promise.resolve(expected));

  const cachedFn = memoryCache({
    refresh: fn,
    updatePolicy: () => CacheUpdatePolicy.DONT_UPDATE,
    pendingPolicy: () => CachePendingPolicy.WAIT,
  });

  // ACT
  await cachedFn();
  const [actual1, actual2] = await Promise.all([cachedFn(), cachedFn()]);

  // ASSERT
  t.is(actual1, expected);
  t.is(actual2, expected);
  t.is(fn.callCount, 1);
});

test("cache - parallel - (updatePolicy = UPDATE, pendingPolicy = WAIT) it only calls refresh once during parallel invocation", async (t) => {
  // ARRANGE
  const expected = `my_return_val_${Math.random().toString()}`;
  const fn = sinon.stub().returns(Promise.resolve(expected));

  const cachedFn = memoryCache({
    refresh: fn,
    updatePolicy: () => CacheUpdatePolicy.UPDATE,
    pendingPolicy: () => CachePendingPolicy.WAIT,
  });

  // ACT
  await cachedFn();
  const [actual1, actual2] = await Promise.all([cachedFn(), cachedFn()]);

  // ASSERT
  t.is(actual1, expected);
  t.is(actual2, expected);
  t.is(fn.callCount, 2);
});

test("cache - parallel - (updatePolicy = DONT_UPDATE, pendingPolicy = WAIT) parallel invocations does not pollute return values of other invocations", async (t) => {
  // ARRANGE
  const expected1 = `my_return_val_1_${Math.random().toString()}`;
  const expected2 = `my_return_val_2_${Math.random().toString()}`;
  const expected3 = `my_return_val_3_${Math.random().toString()}`;

  const cachedFn = memoryCache({
    refresh: async (inp) => inp,
    updatePolicy: () => CacheUpdatePolicy.DONT_UPDATE,
    pendingPolicy: () => CachePendingPolicy.WAIT,
  });

  // ACT
  const [actual1, actual2] = await Promise.all([
    cachedFn(expected1),
    cachedFn(expected2),
  ]);

  const actual3 = await cachedFn(expected3);

  // ASSERT
  t.is(actual1, expected1);
  t.is(actual2, expected2);
  t.is(actual3, expected3);
});

test("cache - parallel - (updatePolicy = UPDATE and pendingPolicy = WAIT) it waits for the new value", async (t) => {
  // ARRANGE
  let callCount = 0;
  const cachedFn = memoryCache({
    refresh: async () => ++callCount,
    updatePolicy: () => CacheUpdatePolicy.UPDATE,
    pendingPolicy: () => CachePendingPolicy.WAIT,
  });

  // ACT
  const actual1 = await cachedFn();
  const [actual2, actual3] = await Promise.all([cachedFn(), cachedFn()]);

  // ASSERT
  t.is(actual1, 1);
  t.is(actual2, 2);
  t.is(actual3, 2);
  t.is(callCount, 2);
});

test("cache - sequential - clients can select STALE for failed requests", async (t) => {
  // ARRANGE
  let callCount = 0;
  let pendingPolicy: CachePendingPolicy = CachePendingPolicy.STALE;
  const cachedFn = memoryCache({
    refresh: async () => {
      if (callCount === 1) {
        ++callCount;
        throw new Error("Oh no i failed");
      }
      return ++callCount;
    },
    updatePolicy: () => CacheUpdatePolicy.UPDATE,
    pendingPolicy: () => pendingPolicy,
  });

  // ACT
  const actual1 = await cachedFn();
  const actual2 = await cachedFn();

  // Wait for pending promise to resolve in the background
  await Promise.resolve();
  pendingPolicy = CachePendingPolicy.WAIT;
  const actual3 = await cachedFn();

  // ASSERT
  t.is(actual1, 1);
  t.is(actual2, 1);
  t.is(actual3, 3);
  t.is(callCount, 3);
});

test("cache - sequential - WAIT - failed requests bubble", async (t) => {
  // ARRANGE
  const error = new Error("Oh no i failed");
  let callCount = 0;
  const cachedFn = memoryCache({
    refresh: async () => {
      if (callCount === 1) {
        ++callCount;
        throw error;
      }
      return ++callCount;
    },
    updatePolicy: () => CacheUpdatePolicy.UPDATE,
    pendingPolicy: () => CachePendingPolicy.WAIT,
  });

  await cachedFn();

  // ACT
  const result = await t.throwsAsync(() => cachedFn());

  // ASSERT
  t.is(result, error);
});

test("cache - sequential - metadata.lastUpdatedAt is updated", async (t) => {
  // ARRANGE
  const lastUpdatedAts: Date[] = [];
  let callCount = 0;
  const cachedFn = memoryCache({
    refresh: async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return ++callCount;
    },
    updatePolicy: (value, metadata) => {
      lastUpdatedAts.push(metadata.lastUpdatedAt);
      return CacheUpdatePolicy.UPDATE;
    },
    pendingPolicy: () => {
      return CachePendingPolicy.WAIT;
    },
  });

  // ACT
  await cachedFn();
  await cachedFn();
  await cachedFn();

  // ASSERT
  t.is(lastUpdatedAts.length, 2);
  t.is(new Set(lastUpdatedAts.map((v) => v.valueOf())).size, 2);
});
