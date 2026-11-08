// #658: de geoCache van de voertuigmodellen was een onbegrensde Map (kleur zat in
// de sleutel), dus per sessie groeiden er honderden bodygeometrieën. Een kleine
// LRU begrenst dat. De cache zelf ruimt niets op: een waarde kan nog door levende
// meshes gebruikt worden. Een eigenaar die GPU-buffers bezit (models3d_vehicles.js)
// zet `onEvict` en geeft een geëvicteerde waarde pas vrij als niemand hem meer tekent.
export class LRUCache {
  constructor(max = 180) { this.max = max; this.map = new Map(); this.evictions = 0; this.hits = 0; this.misses = 0; this.onEvict = null; }
  get size() { return this.map.size; }
  get(key) {
    const v = this.map.get(key);
    if (v === undefined) { this.misses++; return undefined; }
    this.hits++;
    this.map.delete(key); this.map.set(key, v); // recency
    return v;
  }
  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.max) {
      const k = this.map.keys().next().value;
      const v = this.map.get(k);
      this.map.delete(k);
      this.evictions++;
      if (this.onEvict) this.onEvict(v, k);
    }
    return value;
  }
  has(key) { return this.map.has(key); }
  clear() { this.map.clear(); }
}
