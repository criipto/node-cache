# node-cache

Cache implementations for Node.js/TypeScript

## Policies

All the cache implementations allow you to inject policy decision callbacks.

Policies help you define how the cache should behave when it is updating or hold stale data.

```js
import {CacheUpdatePolicy, CachePendingPolicy} from '@criipto/cache';
```

**CacheUpdatePolicy**

- `CacheUpdatePolicy.UPDATE`: Trigger update of value for cache key
- `CacheUpdatePolicy.DONT_UPDATE`: No-op, keep current value

**CachePendingPolicy**

- `CachePendingPolicy.WAIT`: Blocks the read while waiting for cache refresh to finish
- `CachePendingPolicy.STALE`: Return stale cache data while the cache updates

## Memory backed cache

### Example

```js

import {CacheUpdatePolicy, CachePendingPolicy, memoryCache} from '@criipto/cache';

const metadataCache = memoryCache({
  updatePolicy: (url, {lastUpdatedAt}) => {
    // Update metadata if data is more than an hour old
    if (lastUpdatedAt.valueOf() < (Date.now() - 60 * 60 * 1000)) {
      return CacheUpdatePolicy.UPDATE;
    }
    return CacheUpdatePolicy.DONT_UPDATE;
  },
  pendingPolicy: () => CachePendingPolicy.STALE,
  refresh: async (url: URL) => {
    return await fetch(url);
  }
});
```

## Storage backed cache

### Example

```js

import {CacheUpdatePolicy, CachePendingPolicy, storedCache} from '@criipto/cache';

const metadataCache = storedCache({
  updatePolicy: (url, {lastUpdatedAt}) => {
    // Update metadata if data is more than an hour old
    if (lastUpdatedAt.valueOf() < (Date.now() - 60 * 60 * 1000)) {
      return CacheUpdatePolicy.UPDATE;
    }
    return CacheUpdatePolicy.DONT_UPDATE;
  },
  pendingPolicy: () => CachePendingPolicy.STALE,
  refresh: async (url: URL) => {
    const response = await fetch(url);
    if (response.status !== 200) throw new Error('Not 200');
    return response.json() as Promise<{metadata: string}>
  },
  storage: {
    getItem: async (url) => {
      return await fetchFromStorageImplementation(url);
    },
    setItem: async (url, data) => {
      return await upsertInStorageImplementation(url, data);
    }
  }
});
```