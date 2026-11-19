// A one-value cache that expires: compute() runs again when the key changes or `ttl` seconds
// passed. For a result that is cheap to be slightly stale and costly to find every frame
// (the nearest care target, routing.js). Pure, no timers: the caller passes the clock.
export function createTtlCache(ttl) {
  let key = null, at = -Infinity, value = null, has = false;
  return {
    get(now, k, compute) {
      if (has && k === key && now - at < ttl) return value;
      value = compute(); key = k; at = now; has = true;
      return value;
    },
    clear() { has = false; value = null; },
  };
}
