// Streekaudit (#61, #66, #67, #68): wat komt er per streek en per stad, en wat ontbreekt.
// Telt winkels en horeca (game/shopplaces.json), padel- en golfbanen
// (game/echteplekken.json), vondsten, geheimen, evenementen, ontmoetingen en steden,
// en controleert de handwerkdata tegen de OSM-packs van het provincie-extract:
// bestaan de straten uit de stadsprofielen, en ligt elke vondst op land, buiten een
// gebouw en bij een weg. Schrijft niets (tenzij --json); een rapport op stdout.
//
//   node scripts/world/streekaudit.mjs                 # rapport; exit 1 bij harde fouten
//   node scripts/world/streekaudit.mjs --no-osm        # alleen de tellingen (geen packs nodig)
//   node scripts/world/streekaudit.mjs --cache <dir>   # andere cache-map (standaard data/cache/province)
//   node scripts/world/streekaudit.mjs --json <file>   # ook als JSON bewaren
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { wgsToWorld } from '../../game/js/rdnew.js';
import { STREKEN, streekAt, FINDS, REGIO_EVENTS, ENCOUNTERS } from '../../game/js/regioleven.js';
import { TOWN_PROFILES } from '../../game/js/stadsprofielen.js';
import { padelDefs, golfVenues } from '../../game/js/echteplekken.js';
import { tally, gaps, checkFind, checkStreets, suggestSpot, normName, distM } from '../../game/js/streekaudit.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const CACHE = path.resolve(arg('--cache', path.join(ROOT, 'data/cache/province')));
const NO_OSM = process.argv.includes('--no-osm');
const JSON_OUT = arg('--json', '');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const gz = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)).toString('utf8'));

// ---- tellingen ----
const sp = readJson('game/shopplaces.json');
const HORECA = new Set(['kroeg', 'cafe', 'restaurant', 'snackbar']);
const items = [];
for (const rows of Object.values(sp.tiles)) {
  for (const r of rows) {
    const [x, y] = wgsToWorld(r[0], r[1]);
    items.push({ kind: HORECA.has(sp.types[r[2]]) ? 'restaurant' : 'winkel', x, y });
  }
}
const ep = readJson('game/echteplekken.json');
// locaties zoals de minigames ze zien (banen gegroepeerd, losse tees en greens tellen niet)
for (const p of padelDefs(ep)) items.push({ kind: 'padel', x: p.x, y: p.y });
for (const g of golfVenues(ep)) items.push({ kind: 'golf', x: g.x, y: g.y });
const ids = STREKEN.map((s) => s.id);
const { perStreek, buiten } = tally(items, streekAt, ids);

const content = {};
for (const s of STREKEN) {
  const t = perStreek[s.id];
  content[s.id] = {
    ...t,
    vondsten: FINDS.filter((f) => f.streek === s.id && f.kind === 'verzamel').length,
    geheimen: FINDS.filter((f) => f.streek === s.id && f.kind === 'geheim').length,
    events: REGIO_EVENTS.filter((e) => e.streek === s.id).length,
    ontmoetingen: ENCOUNTERS.filter((e) => e.streek === s.id).length,
    steden: TOWN_PROFILES.filter((t2) => { const [x, y] = wgsToWorld(t2.at[0], t2.at[1]); const st = streekAt(x, y); return st && st.id === s.id; }).length,
  };
}

console.log('== Per streek ==');
const cols = ['winkel', 'restaurant', 'padel', 'golf', 'vondsten', 'geheimen', 'events', 'ontmoetingen', 'steden'];
console.log(['streek'.padEnd(15), ...cols.map((c) => c.slice(0, 7).padStart(8))].join(' '));
for (const s of STREKEN) console.log([s.name.padEnd(15), ...cols.map((c) => String(content[s.id][c] || 0).padStart(8))].join(' '));
console.log(['buiten'.padEnd(15), ...cols.map((c) => String(buiten[c] || 0).padStart(8))].join(' '));
for (const k of ['padel', 'golf']) {
  const zonder = STREKEN.filter((s) => !content[s.id][k]).map((s) => s.name);
  if (zonder.length) console.log(`geen ${k} in OSM voor: ${zonder.join(', ')} (geen verzonnen banen; de minigame gebruikt daar de oude vaste plek of een andere streek)`);
}
const total = items.length;
const outside = Object.values(buiten).reduce((a, b) => a + b, 0);
console.log(`${total} plekken, ${outside} buiten alle streken (${Math.round((outside / total) * 100)}%)`);

const gapList = gaps(content);
console.log('\n== Ontbreekt per streek ==');
if (!gapList.length) console.log('niets');
for (const g of gapList) console.log(`- ${g.streek}: ${g.what} ${g.have}/${g.want}`);

// per stad: winkels/horeca binnen bereik
console.log('\n== Per stad: zaken binnen bereik (echt, uit OSM) vs profielwinkels (verzonnen) ==');
for (const t of TOWN_PROFILES) {
  const [cx, cy] = wgsToWorld(t.at[0], t.at[1]);
  const near = items.filter((i) => (i.kind === 'winkel' || i.kind === 'restaurant') && Math.hypot(i.x - cx, i.y - cy) <= t.reach);
  console.log(`${t.name.padEnd(22)} ${String(near.filter((i) => i.kind === 'winkel').length).padStart(3)} winkels ${String(near.filter((i) => i.kind === 'restaurant').length).padStart(3)} horeca | profiel: ${t.shops.length} winkels, ${t.props.length} props, ${t.streets.length} straten`);
}

let hard = 0;
const report = { content, buiten, gaps: gapList, streets: [], finds: [] };

// ---- OSM-controle ----
if (!NO_OSM) {
  const packs = fs.existsSync(CACHE) ? fs.readdirSync(CACHE).filter((f) => /^c-?\d+_-?\d+\.json\.gz$/.test(f)) : [];
  if (!packs.length) {
    console.log(`\nGeen packs in ${CACHE}: OSM-controle overgeslagen (--no-osm om dit te zeggen).`);
  } else {
    const dLat = (m) => m / 111320;
    const boxes = [];
    for (const t of TOWN_PROFILES) boxes.push({ kind: 'town', ref: t, lat: t.at[0], lon: t.at[1], m: t.reach });
    for (const f of FINDS) boxes.push({ kind: 'find', ref: f, lat: f.at[0], lon: f.at[1], m: 320 });
    const inBox = (b, p) => Math.abs(p[0] - b.lat) <= dLat(b.m) && Math.abs(p[1] - b.lon) <= dLat(b.m) / Math.cos(b.lat * Math.PI / 180);
    const names = new Map(TOWN_PROFILES.map((t) => [t.id, new Set()]));
    const geo = new Map(FINDS.map((f) => [f.id, { roads: [], buildings: [], water: [], waterLines: [] }]));
    for (const p of packs) {
      const d = gz(path.join(CACHE, p));
      for (const e of d.elements) {
        if (e.type !== 'way' || !e.g || !e.tags) continue;
        const tg = e.tags;
        const isRoad = !!tg.highway, isB = !!tg.building, isWater = tg.natural === 'water' || tg.landuse === 'basin', isWl = !!tg.waterway;
        if (!isRoad && !isB && !isWater && !isWl) continue;
        for (const b of boxes) {
          if (!e.g.some((pt) => inBox(b, pt))) continue;
          if (b.kind === 'town') {
            if ((isRoad || isWl) && tg.name) names.get(b.ref.id).add(normName(tg.name));
          } else {
            const g = geo.get(b.ref.id);
            if (isRoad) g.roads.push(e.g);
            else if (isB) g.buildings.push(e.g);
            else if (isWater) g.water.push(e.g);
            else if (isWl) g.waterLines.push(e.g);
          }
        }
      }
    }
    console.log('\n== Straten uit de stadsprofielen tegen OSM ==');
    for (const t of TOWN_PROFILES) {
      const r = checkStreets(t, names.get(t.id));
      report.streets.push(r);
      console.log(`${t.name.padEnd(22)} ${r.found.length}/${t.streets.length} gevonden${r.missing.length ? ' | ontbreekt: ' + r.missing.join(', ') : ''}`);
      hard += r.missing.length;
    }
    console.log('\n== Vondsten tegen OSM ==');
    for (const f of FINDS) {
      const g = geo.get(f.id);
      const r = checkFind(f, g, { maxRoad: f.kind === 'geheim' ? 150 : 60 });
      const bad = r.issues.length > 0;
      const alt = bad ? suggestSpot(f.at, g, 300) : null;
      report.finds.push({ ...r, suggest: alt });
      console.log(`${bad ? 'FOUT' : 'ok  '} ${f.id.padEnd(10)} weg ${String(r.road).padStart(4)} m${bad ? ' | ' + r.issues.join(', ') + (alt ? ` | beter: [${alt.at[0]}, ${alt.at[1]}] (${alt.d} m)` : '') : ''}`);
      if (bad) hard++;
    }
  }
}

if (JSON_OUT) fs.writeFileSync(path.resolve(JSON_OUT), JSON.stringify(report, null, 1));
console.log(`\n${hard} harde fouten`);
process.exit(hard ? 1 : 0);
