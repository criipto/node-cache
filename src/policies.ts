export const CacheUpdatePolicy = {
  UPDATE: "UPDATE",
  DONT_UPDATE: "DONT_UPDATE",
} as const;
export type CacheUpdatePolicy =
  (typeof CacheUpdatePolicy)[keyof typeof CacheUpdatePolicy];

export const CachePendingPolicy = {
  STALE: "STALE",
  WAIT: "WAIT",
} as const;
export type CachePendingPolicy =
  (typeof CachePendingPolicy)[keyof typeof CachePendingPolicy];
