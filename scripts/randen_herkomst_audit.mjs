// Herkomst van elke rand, sloot, heg, hek, boomrij en veldgrens (#1092, docs/RANDEN-HERKOMST-22-11.md): komt hij uit de kaartdata
// (een rij of vlak van een tegel met een bron-id) of is hij procedureel (door een generator of de runtime verzonnen)?
//   node scripts/randen_herkomst_audit.mjs [--game=<map met game/js>] [--world=<map met index-provincie.json>] [--strict] [--json]
// Drie metingen:
//  A. tegels (minstens 20, landelijke gebieden): per rijsoort het aantal rijen met en zonder bron-id (gid / osm).
//  B. kaart (minimap en grote kaart): de lijnen die drawCountryDetail tekent in de vensters van de minimap en de kaart, per soort en
//     herkomst. Alles wat daar getekend wordt komt uit het hash-rooster van het platteland: procedureel.
//  C. code: de namen van de verwijderde generatoren mogen nergens meer staan (de grep-lijst van geen_fake_randen_test.mjs).
// --game wijst naar een andere versie van de code (voor de meting 'voor': een schone werkboom van de vorige commit).
// --strict: afsluiten met 1 als er één procedurele rand overblijft.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import './node3d.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const GAME = path.resolve(arg('game', path.join(ROOT, 'game')));
const WORLD = path.resolve(arg('world', process.env.GDE_WORLD || path.join(ROOT, 'game/world')));
const STRICT = process.argv.includes('--strict');
const JSON_OUT = process.argv.includes('--json');
const imp = (rel) => import(pathToFileURL(path.join(GAME, 'js', rel)).href);

// de landelijke steekproeflocaties (WGS84; de plaatsen zelf zijn echt, de punten bij benadering)
export const LOCATIES = [
  { id: 'marum-hoornweg', naam: 'Hoornweg, Marum (Westerkwartier)', lat: 53.1427, lon: 6.2690 },
  { id: 'usquert-kerkstraat', naam: 'Kerkstraat, Usquert (Hogeland)', lat: 53.4007, lon: 6.6162 },
  { id: 'warffum-hogeland', naam: 'Warffum (Hogeland)', lat: 53.3894, lon: 6.5614 },
  { id: 'baflo-ommeland', naam: 'Baflo (Ommelanden)', lat: 53.3596, lon: 6.5112 },
  { id: 'terapel-westerwolde', naam: 'Ter Apel (Westerwolde)', lat: 52.8761, lon: 7.0600 },
];

const G = await imp('gdt.js');
const RD = await imp('rdnew.js');
const R = await imp('regions.js');
const CF = await imp('countryfield.js');
const CM = await imp('countrymap.js');

if (!fs.existsSync(path.join(WORLD, 'index-provincie.json'))) { console.log(`SKIP: geen ${path.join(WORLD, 'index-provincie.json')}`); process.exit(0); }
const index = JSON.parse(fs.readFileSync(path.join(WORLD, 'index-provincie.json'), 'utf8'));
const names = Object.fromEntries(Object.entries(G.SECTION).map(([k, v]) => [v, k]));

// ---- A. tegels --------------------------------------------------------------------------------------------------------
const fds = new Map();
function loadTile(key) {
  const t = index.tiles[key];
  if (!t) return null;
  const f = index.packs[t.pack].file;
  if (!fds.has(f)) fds.set(f, fs.openSync(path.join(WORLD, f), 'r'));
  const buf = Buffer.alloc(t.len);
  fs.readSync(fds.get(f), buf, 0, t.len, t.off);
  return G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf)));
}
// randsoorten in een tegel: furniture fence/hedge/wall met lijn, water kind sloot (de OSM-waterway=ditch|drain|stream), landgebruikvlakken
const bron = (r) => (typeof r.osm === 'number' || typeof r.gid === 'number' ? 'kaartdata' : 'procedureel');
const tegelTelling = {};   // locatie -> { tegels, soorten: { soort: { kaartdata, procedureel } } }
let tegelsTotaal = 0;
for (const loc of LOCATIES) {
  const [wx, wy] = RD.wgsToWorld(loc.lat, loc.lon);
  const [rx, ry] = RD.worldToRd(wx, wy);
  const tx = Math.floor(rx / 1000), ty = Math.floor(ry / 1000);
  const T = { tegels: 0, soorten: {} };
  const bump = (soort, b) => { const o = T.soorten[soort] || (T.soorten[soort] = { kaartdata: 0, procedureel: 0 }); o[b]++; };
  for (let i = tx - 1; i <= tx + 1; i++) for (let j = ty - 1; j <= ty + 1; j++) {
    const blob = loadTile(`${i}_${j}`);
    if (!blob) continue;
    T.tegels++;
    for (const s of blob.sections) {
      const n = names[s.type];
      for (const r of s.rows) {
        if (n === 'FURNITURE' && (r.k === 'fence' || r.k === 'hedge' || r.k === 'wall' || r.k === 'gate') && (r.pts || r.k === 'gate')) bump(`furniture:${r.k}`, bron(r));
        else if (n === 'WATER' && r.kind === 'sloot') bump('water:sloot (waterway)', bron(r));
        else if (n === 'PARCELS') bump(`landgebruikvlak:${r.use}`, bron(r));
      }
    }
  }
  tegelTelling[loc.id] = T;
  tegelsTotaal += T.tegels;
}

// ---- B. kaart ---------------------------------------------------------------------------------------------------------
// het platteland van de kaart zoals het spel het ziet: de tegels van de provincie dekken de blokken (setProvinceBlocks), het land is het provincieland
R.setRegionData(index.global || index.layers.provincie.global);
CF.setCountryBounds([-2000, -2000, 2000, 2000]);   // de stad; alles daarbuiten is 'platteland' voor de kaart
{
  const BL = CF.BLOCK;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const rects = [];
  for (const k of Object.keys(index.tiles)) {
    const [a, b] = k.split('_').map(Number);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    const [wx0, wy1] = RD.rdToWorld(a * 1000, b * 1000), [wx1, wy0] = RD.rdToWorld((a + 1) * 1000, (b + 1) * 1000);
    rects.push([wx0, Math.min(wy0, wy1), wx1, Math.max(wy0, wy1)]);
  }
  for (const r of rects) { x0 = Math.min(x0, r[0]); y0 = Math.min(y0, r[1]); x1 = Math.max(x1, r[2]); y1 = Math.max(y1, r[3]); }
  const bx0 = Math.floor(x0 / BL), by0 = Math.floor(y0 / BL), w = Math.floor(x1 / BL) - bx0 + 1, h = Math.floor(y1 / BL) - by0 + 1;
  const data = new Uint8Array(w * h);
  for (const r of rects) for (let bx = Math.floor(r[0] / BL); bx <= Math.floor((r[2] - 0.01) / BL); bx++) for (let by = Math.floor(r[1] / BL); by <= Math.floor((r[3] - 0.01) / BL); by++) data[(by - by0) * w + (bx - bx0)] = 1;
  CF.setProvinceBlocks({ x0: bx0, y0: by0, w, h, data });
}
const STIJLEN = [CM.MINI_STYLE, CM.MAP_STYLE];
const isK = (c, k) => STIJLEN.some((q) => q[k] === c);
const soortVanKleur = (c) => (isK(c, 'ditch') ? 'sloot (hash-rooster)' : isK(c, 'water') ? 'maar (hash-rooster)' : isK(c, 'tree') ? 'boomrij langs polderweg' : isK(c, 'road') ? 'polderweg' : isK(c, 'turbine') ? 'windturbine (tegel)' : 'overig');
function tel(x0, y0, x1, y1, pxPerM, stijl) {
  const per = {};
  let last = null, segs = 0, kleur = null;
  const ctx = new Proxy({}, {
    get: (_, k) => {
      if (k === 'beginPath') return () => { segs = 0; last = null; };
      if (k === 'moveTo') return (x, y) => { last = [x, y]; };
      if (k === 'lineTo') return (x, y) => { if (last) segs++; last = [x, y]; };
      if (k === 'stroke') return () => { if (segs) per[soortVanKleur(kleur)] = (per[soortVanKleur(kleur)] || 0) + segs; segs = 0; };
      if (k === 'strokeStyle') return kleur;
      return () => {};
    },
    set: (_, k, v) => { if (k === 'strokeStyle') kleur = v; return true; },
  });
  CM.drawCountryDetail(ctx, x0, y0, x1, y1, pxPerM, stijl);
  return per;
}
const kaartTelling = {};
for (const loc of LOCATIES) {
  const [wx, wy] = RD.wgsToWorld(loc.lat, loc.lon);
  const o = {};
  // de minimap (straal ca. 300 m bij 1,2 px/m; het spel tekent de tegels op het venster van MM_RADIUS_M), de kaart op stadsschaal (0,6 px/m, 1,5 km) en uitgezoomd (0,15 px/m, 6 km)
  for (const [naam, r, ppm, st] of [['minimap', 380, 1.2, CM.MINI_STYLE], ['kaart-dichtbij', 750, 0.6, CM.MAP_STYLE], ['kaart-uitgezoomd', 3000, 0.15, CM.MAP_STYLE]]) o[naam] = tel(wx - r, wy - r, wx + r, wy + r, ppm, st);
  kaartTelling[loc.id] = o;
}

// ---- C. code ----------------------------------------------------------------------------------------------------------
export const VERBODEN = ['ROAD_ROW', 'ditchRamp', 'thinDitchOn', 'genBridges', 'reedItems', 'addReeds', 'polderLines', 'perceelVlak', 'PERCEEL_MAP_SCALE'];
const codeTreffers = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js')) { const t = fs.readFileSync(p, 'utf8').split('\n'); t.forEach((l, i) => { for (const w of VERBODEN) if (new RegExp(`\\b${w}\\b`).test(l)) codeTreffers.push(`${path.relative(GAME, p)}:${i + 1} ${w}`); }); } } };
walk(path.join(GAME, 'js'));

// ---- rapport ----------------------------------------------------------------------------------------------------------
let procedureel = 0;
for (const T of Object.values(tegelTelling)) for (const s of Object.values(T.soorten)) procedureel += s.procedureel;
let kaartProc = 0;
for (const o of Object.values(kaartTelling)) for (const per of Object.values(o)) for (const [k, n] of Object.entries(per)) if (/hash-rooster|boomrij|polderweg/.test(k)) kaartProc += n;
const rapport = { game: GAME, world: WORLD, tegels: tegelsTotaal, tegelTelling, kaartTelling, procedureleTegelrijen: procedureel, procedureleKaartlijnen: kaartProc, verbodenNamenInCode: codeTreffers.length, codeTreffers };
if (JSON_OUT) console.log(JSON.stringify(rapport, null, 1));
else {
  console.log(`code: ${GAME}\nwereld: ${WORLD}\ntegels bekeken: ${tegelsTotaal} (${LOCATIES.length} locaties, 3x3 tegels van 1 km)`);
  console.log('\nA. tegelrijen per soort (kaartdata = rij met bron-id; procedureel = zonder)');
  for (const loc of LOCATIES) { const T = tegelTelling[loc.id]; console.log(`  ${loc.naam}: ${T.tegels} tegels`); for (const [s, v] of Object.entries(T.soorten)) console.log(`    ${s.padEnd(30)} kaartdata ${String(v.kaartdata).padStart(5)}  procedureel ${v.procedureel}`); }
  console.log('\nB. lijnen die de kaartrenderer (drawCountryDetail) tekent: alleen hash-rooster van het platteland, dus procedureel; de tegellijnen (wegen, water) tekent de kaart elders');
  for (const loc of LOCATIES) { console.log(`  ${loc.naam}`); for (const [v, per] of Object.entries(kaartTelling[loc.id])) console.log(`    ${v.padEnd(17)} ${Object.keys(per).length ? Object.entries(per).map(([k, n]) => `${k}: ${n}`).join(', ') : '0 lijnen'}`); }
  console.log(`\nC. verboden generatornamen in de code: ${codeTreffers.length}${codeTreffers.length ? '\n  ' + codeTreffers.slice(0, 30).join('\n  ') : ''}`);
  console.log(`\nprocedurele tegelrijen: ${procedureel}; procedurele kaartlijnen: ${kaartProc}; verboden namen: ${codeTreffers.length}`);
}
process.exit(STRICT && (procedureel || kaartProc || codeTreffers.length) ? 1 : 0);
