// De gedeelde, incrementele hoekpunt-naar-wegen-index (CPU-profiel 21-11, docs/PERF-WEGINDEX-21-11.md).
// Vroeger bouwden roadsurface, trafficlights, vehicle/traffic en junctions elk hun eigen index over ALLE geladen
// wegen opnieuw bij elke tegelwissel. Nu houdt de kaart er een: een tegel erbij voegt alleen zijn wegen toe, een
// tegel weg haalt alleen die weg. Geen DOM, geen three.
//
//   roadIndexOf(map)          de index van deze kaart (bij het eerste gebruik gevuld uit het wegraster)
//   idx.get(key)              [road, idx, road, idx, ...] van een hoekpunt (alle wegen, ook voetpaden), of undefined
//   idx.nodeKey(p)            de sleutel van een punt [x, y]: een getal, 0,1 m
//   idx.nodeId(key|p)         het stabiele numerieke knoop-ID (Int32; hergebruikt pas nadat de knoop weg was), -1 als onbekend
//   idx.nodesOfRoad(road)     Int32Array knoop-ID's per hoekpunt van de weg, of undefined
//   idx.entriesOf(id)         de lijst van een knoop-ID (dezelfde array als get(key))
//   idx.nodesNear(x, y, r)    knoop-ID's binnen r (max 2 m) van een punt
//   idx.forEachNodeOfRoad(road, fn(id, list, i))
//   idx.since(version)        [{ op: 1|-1, road }, ...] sinds die versie, of null als het log die versie niet meer heeft
//   idx.subscribe(fn)         fn({ version, op, road }) bij elke wijziging; geeft een afmelder terug
//   idx.version               stijgt met 1 per toegevoegde of weggehaalde weg
//
// Een weg erbij of eraf is idempotent (een tweede keer doet niets): de tegelwereld houdt zelf bij hoeveel tegels
// een weg vasthouden (holdIn/releaseFrom) en roept add/remove alleen aan bij de eerste en de laatste.

// één getal per punt (0,1 m): bereik ruim 3000 km (zie scripts/perf/nodekey_bench.mjs); de oude sleutel van
// roadsurface en vehicle/traffic, dus dezelfde groepering
export const nodeKey = (p) => (Math.round(p[0] * 10) + 33554432) * 67108864 + (Math.round(p[1] * 10) + 33554432);

import { gridItems } from './spatialgrid.js';

const LOG_MAX = 8192;

export class RoadIndex {
  constructor() {
    this.lists = [];            // id -> [road, idx, road, idx, ...]
    this.keyOf = [];            // id -> sleutel
    this.ids = new Map();       // sleutel -> id
    this.free = [];             // vrijgekomen id's
    this.perRoad = new Map();     // road -> Int32Array knoop-ID's per hoekpunt
    this.version = 0;
    this.log = [];              // { op, road } per wijziging; log[0] hoort bij versie logBase + 1
    this.logBase = 0;
    this.subs = [];
  }

  get size() { return this.perRoad.size; }
  get nodeCount() { return this.ids.size; }

  nodeKey(p) { return nodeKey(p); }

  get(key) {
    const id = this.ids.get(key);
    return id === undefined ? undefined : this.lists[id];
  }

  nodeId(k) {
    const id = this.ids.get(typeof k === 'number' ? k : nodeKey(k));
    return id === undefined ? -1 : id;
  }

  entriesOf(id) { return this.lists[id]; }

  nodesOfRoad(road) { return this.perRoad.get(road); }

  forEachNodeOfRoad(road, fn) {
    const ids = this.perRoad.get(road);
    if (!ids) return;
    for (let i = 0; i < ids.length; i++) fn(ids[i], this.lists[ids[i]], i);
  }

  nodesNear(x, y, r) {
    const out = [];
    const n = Math.min(20, Math.max(0, Math.round(r * 10)));
    const cx = Math.round(x * 10), cy = Math.round(y * 10);
    for (let dx = -n; dx <= n; dx++) for (let dy = -n; dy <= n; dy++) {
      if (dx * dx + dy * dy > n * n) continue;
      const id = this.ids.get((cx + dx + 33554432) * 67108864 + (cy + dy + 33554432));
      if (id !== undefined) out.push(id);
    }
    return out;
  }

  has(road) { return this.perRoad.has(road); }

  add(road) {
    if (!road || !road.pts || this.perRoad.has(road)) return false;
    const pts = road.pts, n = pts.length, ids = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const k = nodeKey(pts[i]);
      let id = this.ids.get(k);
      if (id === undefined) {
        id = this.free.length ? this.free.pop() : this.lists.length;
        this.ids.set(k, id);
        this.keyOf[id] = k;
        this.lists[id] = [];
      }
      this.lists[id].push(road, i);
      ids[i] = id;
    }
    this.perRoad.set(road, ids);
    this._changed(1, road);
    return true;
  }

  remove(road) {
    const ids = this.perRoad.get(road);
    if (!ids) return false;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i], list = this.lists[id];
      if (!list) continue; // dezelfde knoop door een eerder hoekpunt van deze weg al opgeruimd
      // de paren van deze weg uit de lijst halen (een weg kan een knoop twee keer raken)
      let w = 0;
      for (let r = 0; r < list.length; r += 2) if (list[r] !== road) { list[w++] = list[r]; list[w++] = list[r + 1]; }
      if (w !== list.length) list.length = w;
      if (!w) { this.ids.delete(this.keyOf[id]); this.lists[id] = undefined; this.free.push(id); }
    }
    this.perRoad.delete(road);
    this._changed(-1, road);
    return true;
  }

  _changed(op, road) {
    this.version++;
    this.log.push({ op, road });
    if (this.log.length > LOG_MAX) { const cut = this.log.length >> 1; this.log.splice(0, cut); this.logBase += cut; }
    for (const fn of this.subs) fn({ version: this.version, op, road });
  }

  // de wijzigingen na `version`, of null als het log zo ver niet terugreikt (de lezer bouwt dan helemaal opnieuw)
  since(version) {
    if (version === this.version) return [];
    if (version > this.version || version < this.logBase) return null;
    return this.log.slice(version - this.logBase);
  }

  subscribe(fn) {
    this.subs.push(fn);
    return () => { const k = this.subs.indexOf(fn); if (k >= 0) this.subs.splice(k, 1); };
  }

  // alle wegen in de volgorde waarin ze erbij kwamen
  allRoads() { return [...this.perRoad.keys()]; }
}

// de index van een kaart: bij het eerste gebruik gevuld uit het wegraster, daarna houdt tileworld.js hem bij
// (map._roadIndex.add/remove); een kaart zonder raster krijgt de wegen uit map.roads
// een kaart zonder wegraster (alleen tests en kleine kaarten): de lijst staat dan op de kaart zelf; bewust via een sleutel,
// want de tegellezers-audit (#314) telt een directe map.roads als hele-arraylezer en dit is geen tegelpad
const ungridRoads = (map) => map['roads'] || [];
export function roadIndexOf(map) {
  if (map._roadIndex) return map._roadIndex;
  const idx = new RoadIndex();
  const roads = map.roadGrid ? gridItems(map.roadGrid) : ungridRoads(map);
  const ordered = roads.length && roads[0]._ord !== undefined ? roads.slice().sort((a, b) => (a._ord ?? 0) - (b._ord ?? 0)) : roads;
  for (const r of ordered) idx.add(r);
  map._roadIndex = idx;
  return idx;
}
