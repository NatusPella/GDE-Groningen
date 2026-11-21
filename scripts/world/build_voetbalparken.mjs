// Bouwt game/js/voetbalparkendata.js (een gegevensmodule, lui geladen met import(): geen netwerkaanroep): de sportparken met voetbalvelden uit de kaartdata, gekoppeld aan hun plaats (epic Voetbalcarrière, #1117, docs/VOETBAL-CARRIERE-21-11.md hoofdstuk 3b).
// Alleen geometrie en een plaatsnaam uit de packs (geen namen van echte clubs: de data bevat die niet en we lezen ze niet). Klein (ongeveer 20 kB) en deterministisch: dezelfde packs geven dezelfde index.
//
//   node scripts/world/build_voetbalparken.mjs [--packs=data/cache/province] [--uit=game/js/voetbalparkendata.js] [--check]
//
// Per plaats met minstens één park: { id (plaats-id, het ID van de club), n (plaatsnaam), k (soort), x, y (de plaats, wereldmeters), p: [park, ...] } met het thuispark (het grootste park binnen 3 km) eerst.
// Per park: { x, y (het middelpunt van het grootste veld, wereldmeters), r (de lengteas van dat veld in radialen, 0 is oost, y wijst naar het zuiden), f (aantal velden), a (oppervlakte in m2), c (kunstgras: aantal velden), l (verlicht: aantal) }.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { wgsToWorld } from '../../game/js/rdnew.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const PACKS = path.resolve(arg('packs', path.join(ROOT, 'data/cache/province')));
const UIT = path.resolve(arg('uit', path.join(ROOT, 'game/js/voetbalparkendata.js')));
const BUNDEL_M = 150, MAX_PLAATS_M = 3000;
const lees = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)).toString('utf8'));
const isVoetbal = (t) => /(^|;)(soccer|football)(;|$)/.test(t.sport || '');
const isVeld = (t) => t.leisure === 'pitch' || t.leisure === 'sports_centre' || t.leisure === 'stadium';
const r1 = (v) => Math.round(v * 10) / 10;

if (!fs.existsSync(PACKS)) { console.error(`Geen packs in ${PACKS}`); process.exit(2); }
const areaM2 = (pts) => { let s = 0; for (let i = 0; i < pts.length - 1; i++) s += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]; return Math.abs(s) / 2; };
// De lengteas van een veld: de hoofdrichting van de hoekpunten (PCA op de twee assen).
function lengteAs(pts) {
  const n = pts.length, mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (const p of pts) { const dx = p[0] - mx, dy = p[1] - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  let a = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  if (a < 0) a += Math.PI;                         // een as, geen pijl: 0 tot pi
  return Math.round(a * 100) / 100;
}

const gezien = new Map();
for (const f of fs.readdirSync(PACKS).filter((x) => /^c-?\d+_-?\d+\.json\.gz$/.test(x)).sort()) {
  for (const e of lees(path.join(PACKS, f)).elements || []) {
    const t = e.tags || {};
    if (!isVeld(t) || !isVoetbal(t) || !Array.isArray(e.g) || e.g.length < 3 || gezien.has(`${e.type}${e.id}`)) continue;
    const pts = e.g.map(([la, lo]) => wgsToWorld(la, lo));
    const c = pts.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]).map((v) => v / pts.length);
    gezien.set(`${e.type}${e.id}`, { c, a: areaM2(pts), r: lengteAs(pts), kunst: /artificial|astroturf|rubber/.test(t.surface || ''), lit: t.lit === 'yes', stadion: t.leisure === 'stadium' });
  }
}
const velden = [...gezien.values()];
// parken: velden binnen 150 m van elkaar (union-find met een raster)
const ouder = velden.map((_, i) => i);
const wortel = (i) => { while (ouder[i] !== i) { ouder[i] = ouder[ouder[i]]; i = ouder[i]; } return i; };
const raster = new Map();
velden.forEach((v, i) => { const k = `${Math.floor(v.c[0] / BUNDEL_M)},${Math.floor(v.c[1] / BUNDEL_M)}`; (raster.get(k) || raster.set(k, []).get(k)).push(i); });
velden.forEach((v, i) => {
  const cx = Math.floor(v.c[0] / BUNDEL_M), cy = Math.floor(v.c[1] / BUNDEL_M);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of raster.get(`${cx + dx},${cy + dy}`) || []) if (j > i && Math.hypot(v.c[0] - velden[j].c[0], v.c[1] - velden[j].c[1]) <= BUNDEL_M) ouder[wortel(j)] = wortel(i);
});
const groepen = new Map();
velden.forEach((v, i) => { const r = wortel(i); (groepen.get(r) || groepen.set(r, []).get(r)).push(v); });
const parken = [...groepen.values()].map((l) => {
  const groot = l.slice().sort((a, b) => b.a - a.a)[0];
  return { x: r1(groot.c[0]), y: r1(groot.c[1]), r: groot.r, f: l.length, a: Math.round(l.reduce((s, v) => s + v.a, 0)), c: l.filter((v) => v.kunst).length, l: l.filter((v) => v.lit).length };
}).sort((a, b) => a.x - b.x || a.y - b.y);

const prov = lees(path.join(PACKS, 'province.json.gz'));
const plaatsen = (prov.places || []).filter((p) => ['city', 'town', 'village', 'hamlet'].includes(p.kind) && p.name && Number.isFinite(p.lat)).map((p) => ({ id: p.id, n: p.name, k: p.kind, xy: wgsToWorld(p.lat, p.lon) }));
const perPlaats = new Map();
let zonder = 0;
for (const pk of parken) {
  let best = null, bd = Infinity;
  for (const p of plaatsen) { const d = Math.hypot(pk.x - p.xy[0], pk.y - p.xy[1]); if (d < bd || (d === bd && best && p.id < best.id)) { bd = d; best = p; } }
  if (!best || bd > MAX_PLAATS_M) { zonder++; continue; }
  (perPlaats.get(best.id) || perPlaats.set(best.id, { id: best.id, n: best.n, k: best.k, x: r1(best.xy[0]), y: r1(best.xy[1]), p: [] }).get(best.id)).p.push(pk);
}
const uit = [...perPlaats.values()].map((pl) => ({ ...pl, p: pl.p.sort((a, b) => b.a - a.a || a.x - b.x) })).sort((a, b) => a.id - b.id);
const json = `// Gebouwd door scripts/world/build_voetbalparken.mjs uit de kaartdata (alleen geometrie en plaatsnamen; niet met de hand bewerken). #1117
export default ${JSON.stringify({ v: 1, plaatsen: uit })};
`;
if (process.argv.includes('--check')) {
  const huidig = fs.existsSync(UIT) ? fs.readFileSync(UIT, 'utf8') : '';
  console.log(huidig === json ? 'voetbalparkendata.js is actueel' : 'voetbalparkendata.js wijkt af van de packs');
  process.exit(huidig === json ? 0 : 1);
}
fs.writeFileSync(UIT, json);
console.log(`${velden.length} velden, ${parken.length} parken (${zonder} zonder plaats binnen ${MAX_PLAATS_M} m), ${uit.length} plaatsen, ${(json.length / 1024).toFixed(1)} kB -> ${path.relative(ROOT, UIT)}`);
