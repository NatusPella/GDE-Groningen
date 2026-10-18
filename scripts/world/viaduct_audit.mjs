// Viaductaudit (#235): hoeveel bruggen van de provincie liggen over een weg of spoorlijn
// zonder dat de hoogteprofielen ze van elkaar scheiden? Leest de packs van data/cache/province,
// bouwt de wegen zoals build_province ze maakt, en telt de kruisingen van een brug met een
// andere weg/spoor (zonder gedeelde knoop) waar de hoogte op het kruispunt minder dan
// MIN_SEP m verschilt. Zonder profiel (de bouw van voor #235) is dat elke kruising.
//
//   node scripts/world/viaduct_audit.mjs [map-met-packs] [--noprofile] [--list] [--strict]
//
// --strict: afgekeurd bij meer onscheiden kruisingen dan LIMIT (de drempel kan alleen dalen).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as WB from '../../game/js/worldbuilder.js';
import { features } from './build_corridor.mjs';
import { profileFeats } from './province_profile.mjs';
import { Grid, nearestOn } from './bridge_audit.mjs';
import { cross } from './bridge_osm_audit.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const MIN_SEP = 2.5; // m hoogteverschil waaronder brug en wat eronder gaat niet gescheiden zijn
export const LIMIT = 58; // was 819 voor #235 (zonder profiel); mag alleen dalen
const ROADWAY = /^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|cycleway|footway|path|pedestrian|track|steps)/;

// De bruggen en wat ze kruisen, gegeven wegrijen (met optioneel z) en spoorrijen.
export function auditViaducts(roads, rails) {
  const others = roads.filter((r) => !r.bridge && !r.tunnel).concat(rails);
  const grid = new Grid(64);
  const box = (r) => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of r.pts) { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); } return [a, b, c, d]; };
  for (const o of others) { const q = box(o); o._box = q; grid.add(o, ...q); }
  const out = [];
  for (const b of roads) {
    if (!b.bridge || b.tunnel || !b.pts || b.pts.length < 2) continue;
    const [x0, y0, x1, y1] = box(b);
    for (const o of grid.near((x0 + x1) / 2, (y0 + y1) / 2, Math.max(x1 - x0, y1 - y0) / 2 + 40)) {
      let hit = null;
      for (let i = 0; i + 1 < b.pts.length && !hit; i++) for (let j = 0; j + 1 < o.pts.length && !hit; j++) {
        const c = cross(b.pts[i], b.pts[i + 1], o.pts[j], o.pts[j + 1]);
        if (!c) continue;
        // (a junction: the two ways share a vertex next to the crossing; a vertex the solver added does not count)
        if (o.pts.some((q) => Math.hypot(q[0] - c.x, q[1] - c.y) < 3 && b.pts.some((p) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.05))) continue;
        hit = c;
      }
      if (!hit) continue;
      const zb = b.z ? nearestOn(b, hit.x, hit.y).z : 0, zo = o.z ? nearestOn(o, hit.x, hit.y).z : 0;
      out.push({ bridge: b, under: o, x: hit.x, y: hit.y, sep: zb - zo, separated: zb - zo >= MIN_SEP });
    }
  }
  return out;
}

// Elke pack apart, zoals build_province hem bouwt (een tegel krijgt zijn weg uit zijn eigen pack):
// per pack de wegen en sporen, met of zonder profiel. onPack({ roads, rails, info }).
export function eachPack(dir, { profile = true } = {}, onPack) {
  for (const f of fs.readdirSync(dir).sort()) {
    if (!/^c-?\d+_-?\d+\.json\.gz$/.test(f)) continue;
    const els = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, f)))).elements
      .filter((e) => e.type === 'way' && e.tags && (e.tags.highway || e.tags.railway === 'rail'));
    if (!els.length) continue;
    const feats = features(els, { urbanAt: () => 0, village: () => false, signs: false });
    WB.applyDuals(feats.filter((q) => q.kind === 'roads').map((q) => q.row));
    const info = profile ? profileFeats(feats) : null;
    onPack({
      pack: f,
      roads: feats.filter((q) => q.kind === 'roads' && ROADWAY.test(q.row.type || '')).map((q) => q.row),
      rails: feats.filter((q) => q.kind === 'rails').map((q) => q.row),
      info,
    });
  }
}

// Alle packs samen: elke kruising (brug-id, weg-id, plek op 1 m) één keer; gescheiden zodra
// één pack hem scheidt (de pack waarin de tegel ligt wint in het spel; de randen tellen mee als open)
export function auditProvince(dir, opts = {}) {
  const seen = new Map();
  let bridges = 0, profiled = 0;
  const audit = { before: {}, after: {} };
  eachPack(dir, opts, ({ roads, rails, info }) => {
    if (info) for (const w of ['before', 'after']) for (const [k, v] of Object.entries(info[w])) audit[w][k] = (audit[w][k] || 0) + v;
    bridges += roads.filter((r) => r.bridge).length;
    profiled += roads.filter((r) => r.z).length;
    for (const c of auditViaducts(roads, rails)) {
      const key = `${c.bridge.osm}:${c.under.osm ?? 'rail'}:${Math.round(c.x)}:${Math.round(c.y)}`;
      const was = seen.get(key);
      if (!was) seen.set(key, c); else if (c.separated && !was.separated) seen.set(key, c);
    }
  });
  const all = [...seen.values()];
  return { all, open: all.filter((c) => !c.separated), bridges, profiled, audit };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv.slice(2).find((a) => !a.startsWith('--')) || path.resolve(HERE, '../../data/cache/province');
  const profile = !process.argv.includes('--noprofile');
  const t0 = Date.now();
  const res = auditProvince(dir, { profile });
  const open = res.open;
  console.log(`${profile ? 'met' : 'zonder'} profiel: ${res.profiled} wegen met profiel, ${res.all.length} kruisingen van een brug met een weg/spoor, onscheiden: ${open.length} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  if (res.audit.before.roads !== undefined) for (const k of ['steep', 'radius', 'joints', 'clearance', 'overlap']) console.log(`  profielaudit ${k}: ${res.audit.before[k]} -> ${res.audit.after[k]}`);
  if (process.argv.includes('--list')) for (const c of open.slice(0, 40)) console.log(`  ${c.bridge.name || c.bridge.type} #${c.bridge.osm} over ${c.under.name || c.under.type} @${c.x.toFixed(0)},${c.y.toFixed(0)} verschil ${c.sep.toFixed(2)} m`);
  if (process.argv.includes('--strict') && open.length > LIMIT) process.exit(1);
}
