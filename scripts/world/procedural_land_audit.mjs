// De procedurele platteland-objecten (palen, draad, heggen, bermen, riet, bomen, hekken, boerderijen, vee: countryside.js)
// buiten het land van de provincie (#233): over de Waddenzee, de Noordzee, de Eems en Dollard, in Drenthe, Friesland en
// Duitsland. Het raster van sloten en randen mag alleen op provincieland (regions.js provinceLandAt) staan.
// Telt per gebied de objecten in vensters van 1 km (willekeurig, vaste seed) met en zonder het landmasker.
//   node scripts/world/procedural_land_audit.mjs [--nomask] [--strict] [--windows N] [--seed S]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../node3d.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = await import('../../game/js/regions.js');
const CE = await import('../../game/js/countryedge.js');
const CF = await import('../../game/js/countryfield.js');
const CS = await import('../../game/js/countryside.js');

// wat --strict toestaat: buiten het land niets
// (het raster van 100 m laat aan de kust een paar objecten door: hoogstens 0,1 % van wat op het land staat)
export const MAX_OFF_SHARE = 0.001;
const OFF = ['waddenzee', 'noordzee', 'eems', 'dollard', 'duitsland', 'friesland', 'drenthe'];

export function setup(index, { mask = true } = {}) {
  R.setRegionData(index.global || index.layers.provincie.global);
  const land = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/world/provincie-land.json'), 'utf8'));
  const pairs = (p) => { const o = []; for (let i = 0; i < p.length; i += 2) o.push([p[i], p[i + 1]]); return o; };
  CF.setCountryBounds([-2000, -2000, 2000, 2000]);
  CE.initCountryEdge({ meta: { bounds: [-2000, -2000, 2000, 2000] }, railRoutes: [], countryRails: (land.rails || []).map(pairs), roads: [], buildings: [], water: [], green: [] });
  CE.setLandMask(mask ? R.provinceLandAt : null);
}

// de objecten van een venster van 1 km op (x, y), per soort
export function countWindow(x, y) {
  const c = {};
  const T = 160;
  for (let tx = Math.floor(x / T); tx <= Math.floor((x + 1000) / T); tx++) {
    for (let ty = Math.floor(y / T); ty <= Math.floor((y + 1000) / T); ty++) {
      const t = CS.countryTileItems(tx, ty);
      for (const [k, v] of Object.entries(t.items)) c[k] = (c[k] || 0) + v.m.length / 16;
      c.farms = (c.farms || 0) + (t.farms || 0);
      c.animals = (c.animals || 0) + (t.animals || []).length + (t.flocks || []).length;
    }
  }
  return c;
}
export const total = (c) => Object.values(c).reduce((n, v) => n + v, 0);

export function pickWindows(index, { n = 8, seed = 7 } = {}) {
  const g = index.global || index.layers.provincie.global;
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const r of g.outline) for (const p of r) { if (p[0] < a) a = p[0]; if (p[0] > c) c = p[0]; if (p[1] < b) b = p[1]; if (p[1] > d) d = p[1]; }
  let s = seed >>> 0;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const per = {};
  // the window's four corners and middle must all lie in the one region (a window across a coast is no sample)
  for (let tries = 0; tries < 60000; tries++) {
    const x = a - 20000 + rnd() * (c - a + 40000), y = b - 20000 + rnd() * (d - b + 40000);
    const ids = [[0, 0], [1000, 0], [0, 1000], [1000, 1000], [500, 500]].map(([dx, dy]) => R.regionAt(x + dx, y + dy).id);
    if (new Set(ids).size !== 1) continue;
    const id = ids[0];
    const list = per[id] || (per[id] = []);
    if (list.length < n) list.push([Math.round(x), Math.round(y)]);
    if (['waddenzee', 'noordzee', 'eems', 'dollard', 'duitsland', 'friesland', 'drenthe', 'groningen'].every((k) => (per[k] || []).length >= n)) break;
  }
  return per;
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? Number(args[i + 1]) : d; };
  const file = path.join(ROOT, 'game/world/index-provincie.json');
  if (!fs.existsSync(file)) { console.log('SKIP geen game/world met de provinciegegevens'); return; }
  const index = JSON.parse(fs.readFileSync(file, 'utf8'));
  setup(index, { mask: !args.includes('--nomask') });
  const per = pickWindows(index, { n: opt('windows', 6), seed: opt('seed', 7) });
  let off = 0, on = 0;
  console.log(`landmasker ${args.includes('--nomask') ? 'UIT' : 'aan'}; vensters van 1 km, ${opt('windows', 6)} per gebied`);
  for (const [id, list] of Object.entries(per)) {
    let n = 0;
    for (const [x, y] of list) n += total(countWindow(x, y));
    console.log(`  ${id.padEnd(10)} ${String(list.length).padStart(3)} vensters, ${Math.round(n)} objecten`);
    if (OFF.includes(id)) off += n; else on += n;
  }
  console.log(`buiten het land: ${Math.round(off)} objecten, op provincieland: ${Math.round(on)}`);
  if (args.includes('--strict') && (off > on * MAX_OFF_SHARE || on < 1000)) process.exit(1);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
