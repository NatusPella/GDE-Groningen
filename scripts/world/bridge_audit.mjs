// Brugaudit (#235, #9): per brug de dekhoogte tegen de weg aan beide kanten,
// helling, einden in het water, dubbele bruggen en z-fighting-kandidaten.
// Puur op de kaartdata (game/stad.json, of een ander bestand als argument).
//
//   node scripts/world/bridge_audit.mjs [kaart.json] [--list] [--strict]
//
// Een brug is een weg met `bridge` en zonder `tunnel`. Zonder `z` ligt het dek
// op straatniveau (de stad is vlak; het water ligt eronder). Bevindingen:
//   step       sprong in dekhoogte bij een gedeelde knoop met een aansluitende weg
//   steep      helling boven de grens van de wegklasse
//   wetEnd     een brugeinde ligt in een waterpolygoon (de weg loopt het water in)
//   duplicate  twee bruggen liggen vrijwel op elkaar (zelfde as, zelfde richting)
//   zfight     dek en een andere brug of straatweg liggen op bijna gelijke hoogte
//              over elkaar zonder knoop (twee vlakken in hetzelfde vlak)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nodeKey, gradeLimit, GRADE_TOL } from '../../game/js/roadprofile.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const LIMITS = {
  STEP: 0.15,        // m hoogtesprong bij een knoop
  ZFIGHT: 0.12,      // m: hoogteverschil waaronder twee vlakken flikkeren
  DUP_DIST: 1.5,     // m: assen dichter dan dit zijn dezelfde brug
  DUP_FRAC: 0.6,     // aandeel van de lengte dat zo dicht ligt
  ZF_FRAC: 0.15,     // aandeel van het dek dat over een ander vlak ligt
  END_CLEAR: 6,      // m vanaf een einde die niet meetelt (daar sluit de weg aan)
};

// roadsurface.js GROUND_LAYER: verschillende lagen hebben een eigen tekenvolgorde (geen z-fight);
// dezelfde laag naast elkaar wordt door ribbonClip bijgeknipt, alleen een kruising blijft over
const LAYER = { foot: 3, cycle: 4, minor: 5, normal: 6, major: 7 };
const layerOf = (r) => LAYER[r.cat] || 6;
const zOf = (r, i) => (r.z ? r.z[i] || 0 : 0);
const halfW = (r) => (r.width || 4) / 2;
export const isBridge = (r) => !!r.bridge && !r.tunnel && r.pts && r.pts.length >= 2;

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return { d: Math.hypot(px - ax - dx * t, py - ay - dy * t), i: 0, t };
}
// nearest point of polyline r to (x, y): { d, i, t, z, ux, uy }
export function nearestOn(r, x, y) {
  let best = null;
  for (let i = 0; i + 1 < r.pts.length; i++) {
    const a = r.pts[i], b = r.pts[i + 1];
    const s = segDist(x, y, a[0], a[1], b[0], b[1]);
    if (!best || s.d < best.d) {
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const cap = (i === 0 && s.t === 0) || (i + 2 === r.pts.length && s.t === 1);
      best = { d: s.d, i, t: s.t, cap, z: zOf(r, i) + (zOf(r, i + 1) - zOf(r, i)) * s.t, ux: (b[0] - a[0]) / l, uy: (b[1] - a[1]) / l };
    }
  }
  return best;
}
// punten op de lijn, elke `step` m, zonder de eerste en laatste `skip` m
export function samples(r, step = 2, skip = 0) {
  const out = [];
  let acc = 0;
  const total = r.pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - r.pts[i - 1][0], p[1] - r.pts[i - 1][1]) : 0), 0);
  for (let i = 0; i + 1 < r.pts.length; i++) {
    const a = r.pts[i], b = r.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 1e-6) continue;
    for (let s = 0; s < L; s += step) {
      const at = acc + s;
      if (at < skip || at > total - skip) continue;
      const t = s / L;
      out.push({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, z: zOf(r, i) + (zOf(r, i + 1) - zOf(r, i)) * t, ux: (b[0] - a[0]) / L, uy: (b[1] - a[1]) / L });
    }
    acc += L;
  }
  return out;
}

export class Grid {
  constructor(cell = 32) { this.cell = cell; this.m = new Map(); }
  add(item, x0, y0, x1, y1) {
    const c = this.cell;
    for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++) for (let j = Math.floor(y0 / c); j <= Math.floor(y1 / c); j++) {
      const k = i * 100003 + j;
      (this.m.get(k) || this.m.set(k, []).get(k)).push(item);
    }
  }
  near(x, y, r) {
    const c = this.cell, out = new Set();
    for (let i = Math.floor((x - r) / c); i <= Math.floor((x + r) / c); i++) for (let j = Math.floor((y - r) / c); j <= Math.floor((y + r) / c); j++) for (const it of this.m.get(i * 100003 + j) || []) out.add(it);
    return out;
  }
}
function roadGrid(roads) {
  const g = new Grid();
  for (const r of roads) {
    if (!r.pts || r.pts.length < 2) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of r.pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    g.add(r, x0 - 1, y0 - 1, x1 + 1, y1 + 1);
  }
  return g;
}

function inPoly(x, y, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
  }
  return c;
}

// Het audit-resultaat: { bridges: [...], findings: { step: [], ... }, stats }
export function auditBridges(data) {
  const roads = data.roads || [];
  const bridges = roads.filter(isBridge);
  const grid = roadGrid(roads);
  const bgrid = roadGrid(bridges);
  const water = data.water || [];
  const wgrid = new Grid(64);
  for (const w of water) {
    if (!w.pts || w.pts.length < 3) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of w.pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    wgrid.add(w, x0, y0, x1, y1);
  }
  const inWater = (x, y) => { for (const w of wgrid.near(x, y, 0)) if (inPoly(x, y, w.pts)) return true; return false; };
  // knopen -> [road, vertex]
  const nodes = new Map();
  for (const r of roads) if (r.pts) r.pts.forEach((p, i) => { const k = nodeKey(p); (nodes.get(k) || nodes.set(k, []).get(k)).push([r, i]); });

  const F = { step: [], steep: [], wetEnd: [], duplicate: [], zfight: [], noProfileRaised: [] };
  const rows = [];
  const seenPair = new Set();
  for (const r of bridges) {
    const row = { r, name: r.name || '', len: 0, steps: [], maxGrade: 0 };
    rows.push(row);
    for (let i = 0; i + 1 < r.pts.length; i++) row.len += Math.hypot(r.pts[i + 1][0] - r.pts[i][0], r.pts[i + 1][1] - r.pts[i][1]);
    // 1. sprongen bij de einden en tussenknopen
    for (let i = 0; i < r.pts.length; i++) {
      for (const [o, j] of nodes.get(nodeKey(r.pts[i])) || []) {
        if (o === r) continue;
        const dz = Math.abs(zOf(r, i) - zOf(o, j));
        if (dz > LIMITS.STEP) { row.steps.push(dz); F.step.push({ r, other: o, at: r.pts[i], dz, z: zOf(r, i), zOther: zOf(o, j) }); }
      }
    }
    // 2. helling
    if (r.z) {
      const lim = gradeLimit(r) + GRADE_TOL;
      for (let i = 0; i + 1 < r.pts.length; i++) {
        const L = Math.hypot(r.pts[i + 1][0] - r.pts[i][0], r.pts[i + 1][1] - r.pts[i][1]);
        if (L < 2) continue;
        const g = Math.abs(r.z[i + 1] - r.z[i]) / L;
        row.maxGrade = Math.max(row.maxGrade, g);
        if (g > lim) F.steep.push({ r, seg: i, g, lim });
      }
    }
    // 3. einden in het water (een aansluitende weg die er ook ligt telt niet: dan is het een veer-/steiger-gat)
    for (const k of [0, r.pts.length - 1]) {
      const p = r.pts[k];
      const dir = k === 0 ? 1 : -1, q = r.pts[k + dir];
      const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      // (1,5 m voorbij het einde, op het verlengde van de as)
      const x = p[0] - ((q[0] - p[0]) / L) * 1.5, y = p[1] - ((q[1] - p[1]) / L) * 1.5;
      if (inWater(x, y) && !(nodes.get(nodeKey(p)) || []).some(([o]) => o !== r && !o.bridge)) F.wetEnd.push({ r, at: p });
    }
    // 4. dubbele bruggen: meer dan DUP_FRAC van de as ligt binnen DUP_DIST van een andere brug
    const S = samples(r, 1.5, 0);
    for (const o of bgrid.near(r.pts[0][0], r.pts[0][1], row.len + 20)) {
      if (o === r) continue;
      const key = roads.indexOf(r) < roads.indexOf(o) ? `${roads.indexOf(r)}:${roads.indexOf(o)}` : `${roads.indexOf(o)}:${roads.indexOf(r)}`;
      if (seenPair.has(key)) continue;
      let close = 0, parallel = 0, zeq = 0;
      for (const s of S) {
        const n = nearestOn(o, s.x, s.y);
        if (n.d <= LIMITS.DUP_DIST) { close++; if (Math.abs(n.ux * s.ux + n.uy * s.uy) > 0.9) parallel++; if (Math.abs(n.z - s.z) < LIMITS.ZFIGHT) zeq++; }
      }
      if (S.length && close / S.length > LIMITS.DUP_FRAC && parallel / close > 0.8) {
        seenPair.add(key);
        F.duplicate.push({ a: r, b: o, frac: close / S.length, sameHeight: zeq / close > 0.8 });
      }
    }
    // 5. z-fighting: het dek (buiten de einden) over een ander vlak op bijna gelijke hoogte, zonder knoop
    const mid = samples(r, 2, LIMITS.END_CLEAR);
    const hits = new Map();
    for (const s of mid) {
      for (const o of grid.near(s.x, s.y, 12)) {
        if (o === r || o.tunnel || o.pts.length < 2 || o.cat === 'foot' && o.type === 'steps') continue;
        const n = nearestOn(o, s.x, s.y);
        if (n.cap || n.d > halfW(r) + halfW(o) - 0.5) continue;
        if (layerOf(o) !== layerOf(r)) continue;
        // naast elkaar (zelfde richting) knipt ribbonClip bij; het gaat om kruisingen
        if (Math.abs(n.ux * s.ux + n.uy * s.uy) > 0.9) continue;
        // alleen echt over elkaar, geen aansluiting: een zijtak langs de brug (zelfde richting) rekent ook mee
        if (Math.abs(n.z - s.z) < LIMITS.ZFIGHT) { const h = hits.get(o) || { n: 0 }; h.n++; hits.set(o, h); }
      }
    }
    for (const [o, h] of hits) {
      const key = roads.indexOf(r) < roads.indexOf(o) ? `z${roads.indexOf(r)}:${roads.indexOf(o)}` : `z${roads.indexOf(o)}:${roads.indexOf(r)}`;
      if (o.bridge && seenPair.has(key)) continue;
      seenPair.add(key);
      if (h.n / Math.max(1, mid.length) > LIMITS.ZF_FRAC) F.zfight.push({ r, other: o, frac: h.n / mid.length, otherBridge: !!o.bridge, flatDeck: !r.z });
    }
  }
  return { bridges, rows, findings: F };
}

function fmt(r) { return `${r.name || '(naamloos)'} ${r.type}${r.movable ? ' ' + r.movable : ''} @${r.pts[0][0].toFixed(0)},${r.pts[0][1].toFixed(0)}`; }

export function printAudit(res, list = false) {
  const F = res.findings;
  console.log(`bruggen: ${res.bridges.length} (met profiel ${res.bridges.filter((r) => r.z).length}, beweegbaar ${res.bridges.filter((r) => r.movable).length})`);
  for (const k of Object.keys(F)) {
    console.log(`${k}: ${F[k].length}`);
    if (!list) continue;
    for (const f of F[k].slice(0, 40)) {
      if (k === 'step') console.log(`  ${fmt(f.r)} sprong ${f.dz.toFixed(2)} m (${f.z.toFixed(2)} vs ${f.zOther.toFixed(2)}) met ${f.other.name || f.other.type}`);
      else if (k === 'steep') console.log(`  ${fmt(f.r)} helling ${(f.g * 100).toFixed(1)} % > ${(f.lim * 100).toFixed(1)} %`);
      else if (k === 'wetEnd') console.log(`  ${fmt(f.r)} einde in water`);
      else if (k === 'duplicate') console.log(`  ${fmt(f.a)} = ${fmt(f.b)} (${(f.frac * 100).toFixed(0)} %, zelfde hoogte ${f.sameHeight})`);
      else if (k === 'zfight') console.log(`  ${fmt(f.r)} over ${f.other.name || f.other.type}${f.other.bridge ? ' (brug)' : ''} ${(f.frac * 100).toFixed(0)} % ${f.flatDeck ? 'plat dek' : 'met profiel'}`);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const data = file ? JSON.parse(fs.readFileSync(file, 'utf8')) : await (await import('../lib/loadworld.mjs')).loadStadData();
  const res = auditBridges(data);
  printAudit(res, process.argv.includes('--list'));
  if (process.argv.includes('--strict') && (res.findings.step.length || res.findings.steep.length || res.findings.duplicate.length)) process.exit(1);
}
