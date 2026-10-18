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
import { wgsToWorld, worldToWgs } from '../../game/js/rdnew.js';
import { planTown, placeAll, roadside, tallyPlan } from '../../game/js/stadsplan.js';
import { STREKEN, streekAt, FINDS, REGIO_EVENTS, ENCOUNTERS } from '../../game/js/regioleven.js';
import { TOWN_PROFILES } from '../../game/js/stadsprofielen.js';
import { padelDefs, golfVenues } from '../../game/js/echteplekken.js';
import { inRing, tally, gaps, checkFind, checkStreets, suggestSpot, normName, distM } from '../../game/js/streekaudit.js';

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
    // padel sites and Pitch & Putt courses: do their courts, tees and cups lie on free ground (#174)
    const venues = [];
    for (const p of padelDefs(ep)) {
      const pts = (p.courts && p.courts.length ? p.courts : [p]).map((c) => ({ ...c, what: 'padelbaan' }));
      venues.push({ id: 'padel ' + (p.name || p.plaats || '?'), pts, x: p.x, y: p.y, m: 140, geo: { buildings: [], water: [] } });
    }
    for (const g of golfVenues(ep)) {
      const pts = g.holes.flatMap((h, i) => [{ ...h.tee, what: `hole ${i + 1} tee` }, { ...h.cup, what: `hole ${i + 1} cup` }]);
      const m = Math.max(...pts.map((q) => Math.hypot(q.x - g.x, q.y - g.y))) + 80;
      venues.push({ id: g.name + (g.real ? ' (echte tees/greens)' : ' (rooster)'), pts, x: g.x, y: g.y, m, geo: { buildings: [], water: [] } });
    }
    for (const v of venues) { const [la, lo] = worldToWgs(v.x, v.y); boxes.push({ kind: 'venue', ref: v, lat: la, lon: lo, m: v.m }); }
    const inBox = (b, p) => Math.abs(p[0] - b.lat) <= dLat(b.m) && Math.abs(p[1] - b.lon) <= dLat(b.m) / Math.cos(b.lat * Math.PI / 180);
    const names = new Map(TOWN_PROFILES.map((t) => [t.id, new Set()]));
    const townGeo = new Map(TOWN_PROFILES.map((t) => [t.id, { roads: [], buildings: [], water: [] }]));
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
          if (b.kind === 'venue') {
            if (isB) b.ref.geo.buildings.push(e.g);
            else if (isWater && e.g.length > 3) b.ref.geo.water.push(e.g);
          } else if (b.kind === 'town') {
            if ((isRoad || isWl) && tg.name) names.get(b.ref.id).add(normName(tg.name));
            const tg2 = townGeo.get(b.ref.id);
            if (isRoad && !/^(footway|path|steps|cycleway|service|track|pedestrian)$/.test(tg.highway)) tg2.roads.push(e.g);
            else if (isB) tg2.buildings.push(e.g);
            else if (isWater || isWl) tg2.water.push(e.g);
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
    console.log('\n== Stadsplan: props en winkels per stad (kerbplekken op de OSM-packs) ==');
    report.plan = [];
    for (const t of TOWN_PROFILES) {
      const g = townGeo.get(t.id);
      const toW = (line) => line.map((pt) => wgsToWorld(pt[0], pt[1]));
      const roads = g.roads.map((l) => ({ pts: toW(l), width: 6 }));
      const box = (pts) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return [x0, y0, x1, y1]; };
      const closed = (l) => l.length > 3 && l[0][0] === l[l.length - 1][0] && l[0][1] === l[l.length - 1][1];
      const blds = g.buildings.filter(closed).map((l) => { const pts = toW(l); return { pts, b: box(pts) }; });
      const wat = g.water.map((l) => { const pts = toW(l); return { pts, b: box(pts), closed: closed(l) }; });
      const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
      const segD = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)); return Math.hypot(x - a[0] - dx * u, y - a[1] - dy * u); };
      const waterD = (x, y, R) => { let best = Infinity; for (const w of wat) { if (x < w.b[0] - R || x > w.b[2] + R || y < w.b[1] - R || y > w.b[3] + R) continue; if (w.closed && inPoly(x, y, w.pts)) return 0; for (let i = 0; i < w.pts.length - 1; i++) best = Math.min(best, segD(x, y, w.pts[i], w.pts[i + 1])); } return best; };
      const free = (x, y) => !blds.some((b) => x >= b.b[0] - 1 && x <= b.b[2] + 1 && y >= b.b[1] - 1 && y <= b.b[3] + 1 && inPoly(x, y, b.pts)) && waterD(x, y, 2) > 2;
      const plan = planTown(t);
      const { placed, missing } = placeAll(plan, (x, y, it) => { const q = roadside(x, y, roads, free); return q && (!it.water || waterD(q.x, q.y, 35) <= 35) ? q : null; });
      const tl = tallyPlan(plan, placed);
      const shops = placed.filter((p) => p.kind === 'winkel').length;
      const props = placed.length - shops;
      const wantProps = plan.items.length - t.shops.length;
      report.plan.push({ town: t.id, props, wantProps, shops, wantShops: t.shops.length, skipped: plan.skipped, byKind: tl, missing: missing.map((m) => m.kind) });
      console.log(`${t.name.padEnd(22)} props ${String(props).padStart(3)}/${String(wantProps).padEnd(3)} winkelborden ${shops}/${t.shops.length}${plan.skipped.length ? ' | tegelwerk (niet geplaatst): ' + [...new Set(plan.skipped)].join(', ') : ''}${missing.length ? ' | geen plek: ' + [...new Set(missing.map((m) => m.kind))].join(', ') : ''}`);
      if (shops < t.shops.length) hard++;
    }
    console.log('\n== Padel en Pitch & putt tegen OSM (liggen banen, tees en cups op vrije grond?) ==');
    report.venues = [];
    let vBad = 0, vN = 0, vHall = 0;
    for (const v of venues) {
      const issues = [];
      for (const q of v.pts) {
        const [la, lo] = worldToWgs(q.x, q.y);
        vN++;
        if (v.geo.buildings.some((r) => inRing([la, lo], r))) issues.push(q.what + ' in een gebouw');
        else if (v.geo.water.some((r) => inRing([la, lo], r))) issues.push(q.what + ' in water');
      }
      // a padel court OSM draws inside a hall is an indoor court: padel.js (fits/searchCourt) puts the
      // outdoor court on free ground within 160 m, so that is a note; a tee or cup there is an error
      const hard2 = issues.filter((q) => !q.startsWith('padelbaan'));
      vBad += hard2.length;
      vHall += issues.length - hard2.length;
      report.venues.push({ id: v.id, punten: v.pts.length, issues });
      if (hard2.length) console.log(`FOUT ${v.id}: ${hard2.join(', ')}`);
      else if (issues.length) console.log(`let op ${v.id}: ${issues.join(', ')} (binnenbaan; het spel zoekt een vrije plek in de buurt)`);
    }
    console.log(`${venues.length} locaties, ${vN} punten gecontroleerd, ${vBad} tees/cups op een gebouw of in water, ${vHall} padelbanen in een hal`);
    hard += vBad;
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
