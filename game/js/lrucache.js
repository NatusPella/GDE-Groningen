// #658: de geoCache van de voertuigmodellen was een onbegrensde Map (kleur zat in
// de sleutel), dus per sessie groeiden er honderden bodygeometrieën. Een kleine
// LRU begrenst dat; een evicted geometrie blijft in leven zolang een mesh hem
// gebruikt en wordt daarna door GC opgeruimd (niet hier disposen: shared).
export class LRUCache {
  constructor(max = 180) { this.max = max; this.map = new Map(); this.evictions = 0; this.hits = 0; this.misses = 0; }
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
    while (this.map.size > this.max) { const k = this.map.keys().next().value; this.map.delete(k); this.evictions++; }
    return value;
  }
  has(key) { return this.map.has(key); }
  clear() { this.map.clear(); }
}
