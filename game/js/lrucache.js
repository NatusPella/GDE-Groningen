// Een kleine LRU-cache met bovengrens (#1040): caches die per sleutel een texture, geometrie of buffer vasthouden mogen niet
// onbegrensd groeien. Het oudst gebruikte item gaat eruit zodra de grens overschreden wordt; onEvict(waarde, sleutel) krijgt de
// kans om te disposen (texture.dispose(), geometry.dispose()). Een Map houdt de invoegvolgorde: get() zet het item achteraan.
// Zuiver, zonder DOM of three: scripts/lrucache_test.mjs.
export function createLru(max, onEvict = null) {
  if (!(max >= 1)) max = 1;
  const m = new Map();
  const stats = { evicted: 0 };
  const evictOldest = () => {
    const k = m.keys().next().value;
    const v = m.get(k);
    m.delete(k);
    stats.evicted++;
    if (onEvict) { try { onEvict(v, k); } catch (e) { /* een mislukte dispose breekt de cache niet */ } }
  };
  return {
    get(k) {
      if (!m.has(k)) return undefined;
      const v = m.get(k);
      m.delete(k);
      m.set(k, v);
      return v;
    },
    has: (k) => m.has(k),
    set(k, v) {
      if (m.has(k)) m.delete(k);
      m.set(k, v);
      while (m.size > max) evictOldest();
      return v;
    },
    delete: (k) => m.delete(k),
    clear() { if (onEvict) for (const [k, v] of [...m]) { try { onEvict(v, k); } catch (e) { /* idem */ } } m.clear(); },
    get size() { return m.size; },
    keys: () => [...m.keys()],
    stats,
  };
}
