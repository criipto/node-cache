# node-cache

Cache implementations for Node.js/TypeScript

## Policies

All the cache implementations allow you to inject policy decision callbacks.

Policies help you define how the cache should behave when it is updating or hold stale data.

```
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