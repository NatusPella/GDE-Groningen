// Bewaakt voor altijd (#1092): geen rand, sloot, heg, hek, boomrij of veldgrens in het spel die niet uit echte kaartdata komt.
//  (a) de laadkant slaat een randrij zonder bron-id over (isProceduralEdgeRow, tileworld.js) en de bouwers kennen het hash-rooster niet;
//  (b) de kaartrenderer (drawCountryDetail: minimap en grote kaart) tekent geen sloot, maar, boomrij of binnenlijn van een perceel;
//  (c) de verwijderde generatoren en constanten komen nergens meer voor (grep op de namen);
//  (d) elke lijn die de kaartrenderer nog tekent is een polderweg of een windturbine van de tegels; in de blokken die de tegels dekken is het er geen één;
//      de rijen van een echte tegel (als er een wereld ligt) hebben allemaal een bron-id;
//  plus: het hash-rooster geeft geen sloot als grondsoort meer en een eigen veld heeft geen verzonnen perceelvlak.
// Samen spelen: de wereld is van de host en deterministisch; dit verandert niets aan het netwerk.
//   node scripts/geen_fake_randen_test.mjs    (optioneel GDE_WORLD=<map met index-provincie.json> voor de tegelcontrole)
import './node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ---- (a) laadkant en bouwers -------------------------------------------------------------------------------------------
const { isProceduralEdgeRow } = await import('../game/js/edgeclasses.js');
ok(isProceduralEdgeRow('furniture', { k: 'hedge', pts: [[0, 0], [5, 0]] }, undefined) === true, 'een heglijn zonder bron-id is procedureel');
ok(isProceduralEdgeRow('furniture', { k: 'fence', pts: [[0, 0], [5, 0]] }, undefined) === true, 'een hek zonder bron-id is procedureel');
ok(isProceduralEdgeRow('water', { kind: 'sloot', pts: [] }, undefined) === true, 'een slootlint zonder bron-id is procedureel');
ok(isProceduralEdgeRow('parcels', { use: 'akker', pts: [] }, undefined) === true, 'een landgebruikvlak zonder bron-id is procedureel');
ok(isProceduralEdgeRow('furniture', { k: 'hedge', pts: [[0, 0], [5, 0]] }, 20010441) === false, 'een heglijn met gid is kaartdata');
ok(isProceduralEdgeRow('furniture', { k: 'fence', pts: [[0, 0], [5, 0]], osm: 569368298 }, undefined) === false, 'een hek met osm-nummer is kaartdata');
ok(isProceduralEdgeRow('water', { kind: 'sloot' }, 7) === false && isProceduralEdgeRow('parcels', {}, 7) === false, 'water en vlakken met gid zijn kaartdata');
ok(isProceduralEdgeRow('furniture', { k: 'lamp' }, undefined) === false && isProceduralEdgeRow('roads', {}, undefined) === false && isProceduralEdgeRow('water', { kind: 'vaart' }, undefined) === false, 'andere rijen zijn geen rand en blijven met rust');
ok(isProceduralEdgeRow('furniture', null, undefined) === false, 'zonder rij niets');
const tw = read('game/js/tileworld.js');
ok(/import \{ isProceduralEdgeRow \} from '\.\/edgeclasses\.js'/.test(tw) && /if \(isProceduralEdgeRow\(kind, obj, gid\)\)[^\n]*continue;/.test(tw), 'tileworld.js slaat procedurele randrijen over bij het laden');
// de bouwers (wereld en tegels) lezen het hash-rooster van het platteland niet: een rand komt daar alleen uit OSM-tags
for (const f of ['game/js/worldbuilder.js', 'scripts/world/build_province.mjs', 'scripts/world/derive_tiles.mjs']) {
  const t = read(f);
  ok(!/countryfield|countryplan|countryside|chash\(/.test(t.replace(/\/\/[^\n]*/g, '')), `${f} leest het hash-rooster niet (geen countryfield, countryplan, countryside of chash)`);
}

// ---- (b) en (d) de kaartrenderer ---------------------------------------------------------------------------------------
const CF = await import('../game/js/countryfield.js');
const CM = await import('../game/js/countrymap.js');
CF.setCountryBounds([-2000, -2000, 2000, 2000]);
const recorder = () => {
  const strokes = {};   // strokeStyle -> aantal lijnstukken
  const fills = [];
  let segs = 0, last = null, style = null;
  const ctx = new Proxy({}, {
    get: (_, k) => {
      if (k === 'beginPath') return () => { segs = 0; last = null; };
      if (k === 'moveTo') return (x, y) => { last = [x, y]; };
      if (k === 'lineTo') return (x, y) => { if (last) segs++; last = [x, y]; };
      if (k === 'stroke') return () => { if (segs) strokes[style] = (strokes[style] || 0) + segs; segs = 0; };
      if (k === 'fillRect') return (x, y, w, h) => { fills.push([x, y, w, h]); };
      return () => {};
    },
    set: (_, k, v) => { if (k === 'strokeStyle') style = v; return true; },
  });
  return { ctx, strokes, fills };
};
const bad2 = (st) => [st.ditch, st.water, st.tree];                 // de kleuren van sloot, maar en boomrij: mogen niet meer getekend worden
const okStyles = (st) => [st.road, st.turbine];                     // alles wat de kaartrenderer nog mag tekenen
const SIZE = 4000;
for (const [naam, st] of [['minimap', CM.MINI_STYLE], ['kaart', CM.MAP_STYLE]]) {
  for (const ppm of [1.2, 0.6, 0.3, 0.15]) {
    for (const [wx, wy, dekt] of [[3000 + 123, 700, false], [26000 + 17, -9000 + 31, true]]) {
      // dekt: de tegels van de provincie dekken de blokken (setProvinceBlocks); anders is het open platteland buiten de kaartdata
      CF.setProvinceBlocks(dekt ? { x0: Math.floor((wx - 2000) / CF.BLOCK), y0: Math.floor((wy - 2000) / CF.BLOCK), w: 10, h: 10, data: new Uint8Array(100).fill(1) } : null);
      const r = recorder();
      CM.drawCountryDetail(r.ctx, wx, wy, wx + SIZE, wy + SIZE, ppm, st);
      const soorten = Object.keys(r.strokes);
      ok(!soorten.some((k) => bad2(st).includes(k) && !okStyles(st).includes(k)), `${naam} ${ppm} px/m ${dekt ? 'op gedekt land' : 'op open land'}: geen sloot, maar of boomrij getekend`, JSON.stringify(r.strokes));
      ok(soorten.every((k) => okStyles(st).includes(k)), `${naam} ${ppm} px/m ${dekt ? 'op gedekt land' : 'op open land'}: alleen polderwegen en turbines`, soorten.join(','));
      if (dekt) ok(soorten.length === 0, `${naam} ${ppm} px/m: in de blokken die de tegels dekken tekent de renderer geen enkele lijn (die komen uit de tegelrijen met bron-id)`, JSON.stringify(r.strokes));
      // geen 'rasterfill': geen reeks vulrechthoeken in een regelmatig rooster voor landbouw (alleen boerderijen en kerken, losse rechthoeken)
      const rooster = r.fills.length > 400;
      ok(!rooster, `${naam} ${ppm} px/m: geen rooster van vulrechthoeken`, String(r.fills.length));
    }
  }
}
CF.setProvinceBlocks(null);
// de bron van de renderer noemt de verwijderde lagen niet meer
const cm = read('game/js/countrymap.js').replace(/\/\/[^\n]*/g, '');
ok(!/\.ditch\b|MAIN_HW|MAAR_WATER|maarX|maarY|BUILT_R \* |ditchRamp/.test(cm), 'countrymap.js tekent geen slootrooster meer (geen st.ditch, MAIN_HW, maarX of maarY)');

// ---- het hash-rooster als grondsoort en als afstand -----------------------------------------------------------------------
{
  let sloot = 0, kleinste = Infinity;
  for (let x = 4000; x < 5200; x += 3.7) for (let y = 4000; y < 4300; y += 3.7) { if (CF.countrySurface(x, y) === 'sloot') sloot++; const p = CF.parcelAt(x, y); kleinste = Math.min(kleinste, p.dDitch, p.dMain, p.dMaar); }
  ok(sloot === 0, 'het hash-rooster geeft geen sloot als grondsoort', String(sloot));
  ok(kleinste >= 1e3, 'het hash-rooster kent geen afstand tot een perceel-, hoofd- of maarsloot', String(kleinste));
  const glsl = CF.COUNTRY_GLSL.replace(/\/\/[^\n]*/g, '');
  ok(/dD = 1e3; dM = 1e3;/.test(glsl) && !/cMaarX\(bx\)\) dQ|cMaarY\(by\)\) dQ/.test(glsl), 'de grondshader schildert geen strooksloten, hoofdsloten of maaren');
}

// ---- (c) verboden namen -----------------------------------------------------------------------------------------------
const VERBODEN = ['ROAD_ROW', 'ditchRamp', 'thinDitchOn', 'genBridges', 'reedItems', 'addReeds', 'polderLines', 'perceelVlak', 'PERCEEL_MAP_SCALE', 'fadeKeep', 'spawnBoat(p.x'];
const treffers = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js')) { const lines = fs.readFileSync(p, 'utf8').split('\n'); lines.forEach((l, i) => { const code = l.replace(/\/\/.*$/, ''); for (const w of VERBODEN) if (code.includes(w)) treffers.push(`${path.relative(ROOT, p)}:${i + 1} ${w}`); }); } } };
walk(path.join(ROOT, 'game/js'));
ok(treffers.length === 0, 'de verwijderde randgeneratoren komen nergens meer voor', treffers.slice(0, 5).join('; '));
// de generatoren in de wereldbouw zelf: geen gesynthetiseerde heg, hek of boomrij met een hashfunctie
for (const f of ['game/js/countryside.js', 'game/js/grass.js']) {
  const t = read(f).replace(/\/\/[^\n]*/g, '');
  ok(!/push\(tile, '(hedge|fence|wire|post|gate|bank|rush)'/.test(t), `${f} plaatst geen hek, heg, draad, paal, poort, berm of bies uit een hash`);
}
const cs = read('game/js/countryside.js').replace(/\/\/[^\n]*/g, '');
ok(!/push\(tile, kind, x, y/.test(cs) && !/genBridges|REED_R/.test(cs), 'countryside.js heeft geen bomenlanen langs polderwegen, bruggen over maaren of oeverriet meer');

// ---- eigen velden en percelen op de kaart ------------------------------------------------------------------------------
{
  const PC = await import('../game/js/percelen.js');
  ok(PC.perceelVlak === undefined && PC.veldBij === undefined, 'percelen.js heeft geen verzonnen perceelvlak meer');
  const F = await import('../game/js/forsalemap.js');
  const fs2 = read('game/js/forsalemap.js').replace(/\/\/[^\n]*/g, '');
  ok(!/perceelVlak/.test(fs2) && /punten: \[\], real: false/.test(fs2), 'Te koop: een perceel zonder echte omtrek krijgt geen verzonnen omtrek');
  ok(typeof F.pickShape === 'function', 'forsalemap exporteert nog pickShape');
}

// ---- (d) de tegelrijen van een echte wereld hebben een bron-id --------------------------------------------------------
{
  const dir = process.env.GDE_WORLD || path.join(ROOT, 'game/world');
  const ix = path.join(dir, 'index-provincie.json');
  if (!fs.existsSync(ix)) console.log('SKIP tegelcontrole: geen index-provincie.json (zet GDE_WORLD)');
  else {
    const G = await import('../game/js/gdt.js');
    const index = JSON.parse(fs.readFileSync(ix, 'utf8'));
    const names = Object.fromEntries(Object.entries(G.SECTION).map(([k, v]) => [v, k]));
    const keys = Object.keys(index.tiles).filter((k) => /^\d+_\d+$/.test(k));
    let tegels = 0, rijen = 0, zonder = 0;
    for (let i = 0; i < keys.length; i += Math.max(1, Math.floor(keys.length / 24))) {
      const t = index.tiles[keys[i]];
      const buf = Buffer.alloc(t.len);
      const fd = fs.openSync(path.join(dir, index.packs[t.pack].file), 'r');
      fs.readSync(fd, buf, 0, t.len, t.off); fs.closeSync(fd);
      const blob = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf)));
      tegels++;
      for (const s of blob.sections) {
        const kind = names[s.type] === 'FURNITURE' ? 'furniture' : names[s.type] === 'WATER' ? 'water' : names[s.type] === 'PARCELS' ? 'parcels' : null;
        if (!kind) continue;
        for (const r of s.rows) {
          if (!(kind === 'parcels' || (kind === 'water' && r.kind === 'sloot') || (kind === 'furniture' && r.pts && ['hedge', 'fence', 'wall'].includes(r.k)))) continue;
          rijen++;
          if (isProceduralEdgeRow(kind, r, r.gid)) zonder++;
        }
      }
    }
    ok(tegels >= 20, 'minstens 20 tegels bekeken', String(tegels));
    ok(rijen > 100 && zonder === 0, `elke randrij van ${tegels} tegels heeft een bron-id (${rijen} rijen)`, `${zonder} zonder`);
  }
}

console.log(bad ? `${bad} van ${n} mislukt` : `geen_fake_randen_test: ok (${n} controles)`);
process.exit(bad ? 1 : 0);
