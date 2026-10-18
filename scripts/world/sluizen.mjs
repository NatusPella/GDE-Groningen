// Sluizen (#236): de gegevens voor het sluismechaniek en de audit dat het water aan
// beide zijden van elke sluis verbonden is.
//
//   node scripts/world/sluizen.mjs            audit: loopt het water door elke sluis?
//   node scripts/world/sluizen.mjs --write    schrijf game/sluizen.json
//   node scripts/world/sluizen.mjs --strict   afsluiten met 1 als een sluis een gat heeft
//
// Elke sluis komt uit game/waterplekken.json (OSM waterway=lock, lock=yes: plek, richting a,
// kolklengte l, breedte w). Het peil aan beide kanten komt uit de waterpolygonen van de
// provincie (lv); zijde 0 ligt aan de -as-kant, zijde 1 aan de +as-kant. Alleen lezen:
// data/cache en game/world worden niet geschreven (in een worktree: WORLD_DIR=<pad>).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadProvinceVaar } from './vaarnet_data.mjs';
import { pointInStaticPolygon } from '../../game/js/waterlevels.js';

const root = new URL('../../', import.meta.url);
export const SIDE_PAD = 60;      // m water dat we buiten de kolk aan elke kant verwachten
const SIDE_SCAN = 300;       // m waarover we zoeken naar het water voorbij een lange kolkstrook
const STEP = 1.5;                // m tussen de meetpunten langs de as
const GAP_OK = 4;                // m onderbreking in de kaart die de wereldbouwer (gaten, vaarnet_fixes) dicht

// Zeesluizen: Lauwersmeer en haven, Eemskanaal en Eems. Peilverschil is er het grootst.
const ZEE = /robbengat|zeesluis|lauwersoog|delfzijl|eemshaven/i;

function worldDir() {
  if (process.env.WORLD_DIR) return pathToFileURL(path.resolve(process.env.WORLD_DIR) + path.sep);
  const here = new URL('game/world/', root);
  if (fs.existsSync(new URL('index-provincie.json', here))) return here;
  // een worktree heeft geen game/world: de hoofdmap staat drie mappen boven .claude/worktrees/<naam>
  const main = new URL('../../../game/world/', root);
  return main;
}

function makeIndex(water) {
  const C = 250, cells = new Map();
  for (const w of water) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of w.pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    w._b = [x0, y0, x1, y1];
    for (let cx = Math.floor(x0 / C); cx <= Math.floor(x1 / C); cx++) for (let cy = Math.floor(y0 / C); cy <= Math.floor(y1 / C); cy++) {
      const k = cx * 100003 + cy;
      (cells.get(k) || cells.set(k, []).get(k)).push(w);
    }
  }
  return (x, y) => {
    for (const w of cells.get(Math.floor(x / C) * 100003 + Math.floor(y / C)) || []) {
      const b = w._b;
      if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
      if (pointInStaticPolygon(x, y, w.pts)) return w;
    }
    return null;
  };
}

// De waterstukjes uit game/vaarnet_fixes.json als polygonen: gaten [x, y, lengte, breedte, hoek, nav]
// en verbindingen {from, to, width}.
export function fixWater() {
  const f = JSON.parse(fs.readFileSync(new URL('game/vaarnet_fixes.json', root)));
  const rect = (x, y, l, w, a, nav) => {
    const c = Math.cos(a), s = Math.sin(a), pts = [[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]].map(([u, v]) => [x + u * c - v * s, y + u * s + v * c]);
    return { pts, kind: 'diep', lv: -2.3, nav, body: -1, name: 'fix', lock: false };
  };
  return [...(f.gaten || []).concat(f.sluisgaten || []).map((g) => rect(g[0], g[1], g[2], g[3], g[4], g[5])),
    ...(f.links || []).map((k) => rect((k.from[0] + k.to[0]) / 2, (k.from[1] + k.to[1]) / 2, Math.hypot(k.to[0] - k.from[0], k.to[1] - k.from[1]) + 2, k.width, Math.atan2(k.to[1] - k.from[1], k.to[0] - k.from[0]), 4))];
}

// De sluizen met peilen en de meting van het water langs de as.
export function measure(plekken, water) {
  const at = makeIndex(water);
  const out = [];
  for (const p of plekken.filter((q) => q.t === 'sluis')) {
    const c = Math.cos(p.a), s = Math.sin(p.a), half = p.l / 2;
    const probe = (u) => at(p.x + c * u, p.y + s * u);
    // het water aan een kant: het eerste stuk buiten de kolk dat geen kolk is (de kolkpolygoon van
    // OSM is vaak een lange strook kanaal), anders de kolk zelf; zonder water: null
    const side = (sg) => {
      let first = null;
      for (let u = half + 4; u <= half + SIDE_SCAN; u += 3) {
        const w = probe(sg * u);
        if (!w) { if (u <= half + SIDE_PAD) return first && u > half + 4 ? first : null; continue; }
        if (!first) first = w;
        if (!w.lock) return w;
      }
      return first;
    };
    const w0 = side(-1), w1 = side(1);
    // langs de as van het ene water naar het andere: waar ontbreekt water?
    let gap = 0, worst = 0, worstEnd = 0, total = 0;
    for (let u = -(half + SIDE_PAD); u <= half + SIDE_PAD; u += STEP) {
      if (probe(u)) { gap = 0; continue; }
      gap += STEP; total += STEP;
      if (gap > worst) { worst = gap; worstEnd = u; }
    }
    // het stuk water dat de kaart mist, als gat voor game/vaarnet_fixes.json (sluisgaten)
    const mid = worstEnd - worst / 2, nav = Math.min(w0 ? w0.nav ?? 3 : 3, w1 ? w1.nav ?? 3 : 3) || 3;
    const patch = worst > GAP_OK ? [Math.round((p.x + c * mid) * 10) / 10, Math.round((p.y + s * mid) * 10) / 10, Math.round((worst + 2) * 10) / 10, Math.max(6, Math.round((p.w || 8) * 10) / 10), p.a, Math.max(2, nav)] : null;
    out.push({ patch,
      id: p.id, n: p.n || '', x: p.x, y: p.y, a: p.a, l: p.l, w: p.w || 8,
      lv: [w0 ? w0.lv : null, w1 ? w1.lv : null],
      kind: [w0 ? w0.kind : null, w1 ? w1.kind : null],
      nav: [w0 ? w0.nav ?? 0 : 0, w1 ? w1.nav ?? 0 : 0],
      body: [w0 ? w0.body : null, w1 ? w1.body : null],
      gap: Math.round(worst * 10) / 10, gapTotal: Math.round(total), zee: ZEE.test(p.n || ''),
    });
  }
  return out;
}

// De regel: aan beide kanten water, en geen onderbreking langs de as die de wereld niet dichtmaakt.
export function verdict(m) {
  const why = [];
  if (!m.kind[0]) why.push('geen water aan zijde 0');
  if (!m.kind[1]) why.push('geen water aan zijde 1');
  if (m.gap > GAP_OK) why.push(`gat van ${m.gap} m langs de as`);
  return why;
}

// Het peil dat het mechaniek gebruikt: de gemeten peilen, met een schutverschil van minstens
// 0,4 m op een zeesluis zodat het schutten in beeld te zien is.
export function levelsFor(m) {
  let a = m.lv[0] ?? m.lv[1] ?? -2.3, b = m.lv[1] ?? a;
  if (m.zee && Math.abs(a - b) < 0.4) b = a + 1.0;
  return [Math.round(a * 100) / 100, Math.round(b * 100) / 100];
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const P = loadProvinceVaar(worldDir());
  const plekken = JSON.parse(fs.readFileSync(new URL('game/waterplekken.json', root))).plekken;
  // de stad staat in game/citymap.json; de gaten en verbindingen van vaarnet_fixes.json maakt de wereldbouwer water
  const city = JSON.parse(fs.readFileSync(new URL('game/citymap.json', root))).water.map((w) => ({ ...w, lock: false }));
  const list = measure(plekken, P.water.concat(city, fixWater()));
  let bad = 0;
  for (const m of list.sort((p, q) => (p.n || '').localeCompare(q.n || ''))) {
    const why = verdict(m);
    if (why.length) bad++;
    console.log(`${why.length ? 'GAT ' : 'ok  '} ${m.n || '(zonder naam)'} (${Math.round(m.x)},${Math.round(m.y)}) peil ${m.lv.join(' / ')} ${m.kind.join(' / ')}${why.length ? ' : ' + why.join(', ') : ''}`);
  }
  for (const m of list) if (m.patch && verdict(m).length) console.log('   sluisgat voor vaarnet_fixes.json: ' + JSON.stringify(m.patch) + ' // ' + (m.n || m.id));
  console.log(`${list.length} sluizen, ${bad} met een gat of een ontbrekende zijde`);
  if (process.argv.includes('--raster')) {
    // het vaarnetraster (vaarnet.mjs): liggen de twee kanten in hetzelfde waterstuk, voor klasse 2 en 3?
    const { buildRaster, components, cellOf, nearestOpenCell } = await import('./vaarnet.mjs');
    const built = buildRaster({ worldDir: worldDir() });
    let apart = 0;
    for (const cls of [2, 3]) {
      const comp = components(built.R, cls);
      for (const m of list) {
        const c = Math.cos(m.a), s = Math.sin(m.a), h = Math.min(90, Math.max(24, m.l)) / 2 + 10;
        const cell = (sg) => { const o = nearestOpenCell(built.R, m.x + sg * c * h, m.y + sg * s * h, cls, 6); return o ? comp.label(o[0], o[1]) : 0; };
        const a = cell(-1), b = cell(1);
        if (!a || !b || Math.min(...m.nav) < cls) continue;   // een kant is voor deze klasse geen vaarwater (sloot): niet nodig
        if (a !== b) { apart++; console.log('   sluisgat: ' + JSON.stringify([m.x, m.y, Math.round(Math.min(90, Math.max(24, m.l)) + 6), Math.round((m.w + 2.5) * 10) / 10, m.a, cls]));
        console.log(`GESCHEIDEN klasse ${cls}: ${m.n || m.id} (${Math.round(m.x)},${Math.round(m.y)}): waterstukken ${a} en ${b}`); }
      }
    }
    console.log(`raster: ${apart} sluizen met gescheiden waterstukken`);
    if (process.argv.includes('--strict') && apart) process.exit(1);
  }
  if (process.argv.includes('--write')) {
    const rows = list.map((m) => ({ id: m.id, n: m.n, x: m.x, y: m.y, a: m.a, l: m.l, w: m.w, lv: levelsFor(m), zee: m.zee ? 1 : 0 }));
    fs.writeFileSync(new URL('game/sluizen.json', root), JSON.stringify({ v: 1, uitleg: 'Sluizen voor het sluismechaniek (game/js/sluizen.js), gemaakt door scripts/world/sluizen.mjs: plek, richting a (zijde 0 aan de -as-kant), kolklengte l, breedte w, peil lv aan beide zijden.', sluizen: rows }, null, 0) + '\n');
    console.log('game/sluizen.json geschreven: ' + rows.length);
  }
  if (process.argv.includes('--strict') && bad) process.exit(1);
}
