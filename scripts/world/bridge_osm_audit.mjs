// Brugaudit op de ruwe provincie-extract (#235): de bruggen die build_province uit
// data/cache/province/c*.json.gz haalt. Daar heeft geen brug een hoogteprofiel
// (de hoogtesolver draait alleen op de stadskaart), dus elke kruising van een
// brug met een andere weg of spoorlijn zonder gedeelde knoop is een viaduct dat
// vlak op straatniveau doorloopt.
//
//   node scripts/world/bridge_osm_audit.mjs [map-met-packs] [--list]
//
// Telt: bruggen, beweegbare, dubbele bruggen (twee OSM-wegen op elkaar),
// viaductkruisingen (brug over weg/spoor zonder knoop) en kruisingen waarvan
// beide wegen op dezelfde `layer` staan (geen hoogteverschil in de data).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { wgsToWorld } from '../../game/js/rdnew.js';
import { nearestOn, samples, Grid, LIMITS } from './bridge_audit.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CAR = new Set(['motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary', 'tertiary_link', 'residential', 'unclassified', 'living_street', 'service']);
const WAY = new Set([...CAR, 'cycleway', 'footway', 'path', 'pedestrian', 'track', 'steps']);

// Alle wegen en spoorlijnen van de packs, eenmalig per OSM-id, in wereldmeters.
export function loadWays(dir) {
  const byId = new Map();
  for (const f of fs.readdirSync(dir)) {
    if (!/^c-?\d+_-?\d+\.json\.gz$/.test(f)) continue;
    const d = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, f))));
    for (const e of d.elements) {
      if (e.type !== 'way' || !e.g || e.g.length < 2 || byId.has(e.id)) continue;
      const t = e.tags || {};
      const hw = t.highway, rail = t.railway === 'rail' || t.railway === 'light_rail';
      if (!(hw && WAY.has(hw)) && !rail) continue;
      const br = t.bridge && t.bridge !== 'no';
      const layer = parseInt(t.layer, 10) || 0;
      byId.set(e.id, {
        id: e.id, name: t.name || '', type: hw || 'rail', rail, bridge: !!br && !t.tunnel, movable: t['bridge:movable'] || (t.bridge === 'movable' ? 'yes' : ''),
        layer, tunnel: !!t.tunnel && t.tunnel !== 'no' || t.covered === 'yes',
        width: parseFloat(t.width) || (rail ? 3 : CAR.has(hw) ? 6 : 2),
        pts: e.g.map(([la, lo]) => wgsToWorld(la, lo)),
      });
    }
  }
  return [...byId.values()];
}

export const cross = (a, b, c, d) => {
  const rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1];
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den, u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { t, u, x: a[0] + rx * t, y: a[1] + ry * t } : null;
};

export function auditOsm(ways) {
  const grid = new Grid(64);
  for (const w of ways) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of w.pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    grid.add(w, x0, y0, x1, y1);
    w.box = [x0, y0, x1, y1];
  }
  const bridges = ways.filter((w) => w.bridge && !w.rail);
  const dup = [], over = [];
  const seen = new Set();
  for (const b of bridges) {
    const near = [...grid.near((b.box[0] + b.box[2]) / 2, (b.box[1] + b.box[3]) / 2, Math.max(b.box[2] - b.box[0], b.box[3] - b.box[1]) / 2 + 40)];
    // dubbele bruggen
    const S = samples(b, 1.5, 0);
    for (const o of near) {
      if (o === b || !o.bridge || o.rail) continue;
      const k = b.id < o.id ? `${b.id}:${o.id}` : `${o.id}:${b.id}`;
      if (seen.has(k)) continue;
      let close = 0, par = 0;
      for (const s of S) { const n = nearestOn(o, s.x, s.y); if (n.d <= LIMITS.DUP_DIST) { close++; if (Math.abs(n.ux * s.ux + n.uy * s.uy) > 0.9) par++; } }
      if (S.length && close / S.length > LIMITS.DUP_FRAC && par / close > 0.8) { seen.add(k); dup.push({ a: b, b: o, frac: close / S.length }); }
    }
    // viaductkruisingen: segmentsnijpunten met andere wegen/sporen, niet in een knoop
    for (const o of near) {
      if (o === b || o.tunnel || o.bridge) continue;
      let hit = null;
      for (let i = 0; i + 1 < b.pts.length && !hit; i++) for (let j = 0; j + 1 < o.pts.length && !hit; j++) {
        const c = cross(b.pts[i], b.pts[i + 1], o.pts[j], o.pts[j + 1]);
        if (!c) continue;
        const atVertex = [b.pts[i], b.pts[i + 1], o.pts[j], o.pts[j + 1]].some((p) => Math.hypot(p[0] - c.x, p[1] - c.y) < 0.5);
        if (!atVertex) hit = c;
      }
      if (hit) over.push({ bridge: b, under: o, x: hit.x, y: hit.y, dLayer: b.layer - o.layer });
    }
  }
  return { bridges, dup, over, ways: ways.length };
}

const fmt = (w) => `${w.name || '(naamloos)'} ${w.type}${w.movable ? ' ' + w.movable : ''} #${w.id}`;
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv.slice(2).find((a) => !a.startsWith('--')) || path.resolve(HERE, '../../data/cache/province');
  const res = auditOsm(loadWays(dir));
  const car = res.bridges.filter((b) => CAR.has(b.type));
  console.log(`wegen en sporen: ${res.ways}; bruggen: ${res.bridges.length} (auto ${car.length}, beweegbaar ${res.bridges.filter((b) => b.movable).length})`);
  console.log(`dubbele bruggen (twee OSM-wegen op elkaar): ${res.dup.length}`);
  const under = { road: 0, rail: 0 };
  for (const o of res.over) under[o.under.rail ? 'rail' : 'road']++;
  const flat = res.over.filter((o) => o.dLayer <= 0);
  console.log(`viaductkruisingen zonder hoogteprofiel (brug over weg ${under.road}, over spoor ${under.rail}): ${res.over.length}; waarvan zelfde layer: ${flat.length}`);
  if (process.argv.includes('--list')) {
    for (const d of res.dup.slice(0, 30)) console.log(`  dubbel ${fmt(d.a)} = ${fmt(d.b)} ${(d.frac * 100).toFixed(0)} %`);
    for (const o of res.over.slice(0, 30)) console.log(`  ${fmt(o.bridge)} over ${fmt(o.under)} layer ${o.bridge.layer} vs ${o.under.layer} @${o.x.toFixed(0)},${o.y.toFixed(0)}`);
  }
}
