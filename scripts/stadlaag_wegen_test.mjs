// De wegen en het spoor van de stad uit de OSM-tegelbouw (STAD_LAAG=roads,rails, #90 fase B3/B4) tegenover citymap.json:
// geometrie, hoogte langs de wegen en op een raster, bruggen en tunnels per stuk, rijstroken, kruispunten, de ring en het spoor.
// Slaat over zonder provincie-extract (data/cache/province, of GDE_PROVINCE_SRC). De OSM-bouw duurt vier minuten:
// STAD_LAAG_CACHE=<bestand> bewaart hem voor een volgende run (wis het bestand na een codewijziging).
import assert from 'node:assert/strict';
import { haveProvince } from './world/build_province.mjs';
if (!haveProvince()) { console.log('SKIP stadlaag_wegen_test: geen data/cache/province'); process.exit(0); }
const P = await import('./world/pack_tiles.mjs');
const { compare } = await import('./world/city_roads_diff.mjs');
const PR = await import('./world/profile.mjs');
const RP = await import('./world/railprofile.mjs');
const A = P.loadSources().map;
const src = await P.loadSourcesLaag(undefined, ['roads', 'rails']);
const B = src.map;
const rep = compare(A, B);
const j = (o) => JSON.stringify(o);
console.log('klassen oud', j(rep.klassen.A), '\n        nieuw', j(rep.klassen.B));
console.log(`geometrie: oud in nieuw ${rep.geometrie.oudInNieuw.p1}% binnen 1 m (${j(Object.fromEntries(Object.entries(rep.geometrie.oudInNieuw.perGroup).map(([k, v]) => [k, v.p1])))}); nieuw in oud ${rep.geometrie.nieuwInOud.p1}%`);
console.log(`hoogte langs de wegen met profiel: binnen 0,25 m ${rep.hoogteLangsWegen.metProfiel.w25}%, 0,5 m ${rep.hoogteLangsWegen.metProfiel.w50}%, 1 m ${rep.hoogteLangsWegen.metProfiel.w100}%; ring ${rep.hoogteLangsWegen.ring.w50}% binnen 0,5 m; raster ${rep.hoogteRaster.w50}% binnen 0,5 m`);
console.log('vlaggen', j(Object.fromEntries(Object.entries(rep.vlaggen).map(([k, v]) => [k, `${v.gelijk}/${v.A}`]))));
console.log(`rijstroken (op OSM-id, ${rep.rijstroken.paren} paren): lanes ${rep.rijstroken.p_lanes}%, vooruit ${rep.rijstroken.p_lanesFwd}%, breedte ${rep.rijstroken.p_width05}%, eenrichting ${rep.rijstroken.p_oneway}%`);
console.log(`kruispunten oud ${rep.kruispunten.A}, nieuw ${rep.kruispunten.B}; besturing gelijk ${rep.kruispunten.besturingGelijk}%, armen ${rep.kruispunten.armenGelijk}%, regels ${rep.kruispunten.regelsGelijk}%; lichten ${rep.kruispunten.lichtenA}/${rep.kruispunten.lichtenB}`);
console.log(`ring: ${j(rep.ring)}`);
console.log(`spoor: ${rep.spoor.km.A}/${rep.spoor.km.B} km, overwegen ${rep.spoor.overwegen.gekoppeld}/${rep.spoor.overwegen.A} (nieuw ${rep.spoor.overwegen.B}), liften ${rep.spoor.liften.gekoppeld}/${rep.spoor.liften.A} (nieuw ${rep.spoor.liften.B}), hoogte langs het spoor binnen 0,5 m ${rep.spoor.hoogteLangsSpoor.w50}%`);

// geometrie: wat de oude kaart had, ligt er (OSM kent meer paden: nieuw-in-oud telt niet)
assert.ok(rep.geometrie.oudInNieuw.p1 >= 99, 'wegen van de oude stad ontbreken');
for (const g of ['car', 'foot', 'cycle']) assert.ok(rep.geometrie.oudInNieuw.perGroup[g].p1 >= 99, `${g}: wegen ontbreken`);
// hoogte
assert.ok(rep.hoogteLangsWegen.metProfiel.w100 >= 95, 'wegen met profiel binnen 1 m');
assert.ok(rep.hoogteLangsWegen.metProfiel.w50 >= 90, 'wegen met profiel binnen 0,5 m');
assert.ok(rep.hoogteLangsWegen.ring.w50 >= 93, 'ring binnen 0,5 m');
assert.ok(rep.hoogteRaster.w50 >= 99, 'raster binnen 0,5 m');
// kunstwerken per stuk
for (const f of ['viaduct', 'tunnel', 'embankment', 'cutting', 'movable']) assert.ok(rep.vlaggen[f].gelijk >= rep.vlaggen[f].A * 0.95, `${f} per stuk`);
assert.ok(rep.vlaggen.bridge.gelijk >= rep.vlaggen.bridge.A * 0.95, 'bruggen per stuk');
// rijstroken en kruispunten
assert.ok(rep.rijstroken.p_lanes >= 99 && rep.rijstroken.p_oneway >= 99.5, 'rijstroken');
assert.ok(rep.kruispunten.gekoppeld >= rep.kruispunten.A * 0.99, 'kruispunten ontbreken');
assert.ok(rep.kruispunten.besturingGelijk >= 98 && rep.kruispunten.armenGelijk >= 99, 'kruispuntbesturing');
// de ring
assert.ok(parseFloat(rep.ring.route.binnen4) >= 99 && parseFloat(rep.ring.route.hoogteBinnen05) >= 93, 'ringroute ligt op de ring');
// spoor
assert.equal(B.railRoutes.length, A.railRoutes.length, 'treinroutes');
assert.deepEqual(B.stations.map((s) => s.name).sort(), A.stations.map((s) => s.name).sort(), 'stations');
assert.ok(rep.spoor.overwegen.gekoppeld === rep.spoor.overwegen.A, 'overwegen');
assert.ok(rep.spoor.liften.gekoppeld >= rep.spoor.liften.A * 0.9, 'spoorliften');
assert.ok(rep.spoor.hoogteLangsSpoor.w50 >= 90, 'spoorhoogte');
// de oplossers: geen te steile weg, geen weg onder de vrije hoogte, geen spoorfout
const data = { roads: B.roads, rails: B.rails, levelCrossings: B.levelCrossings, railLifts: B.railLifts, water: B.water };
const pa = PR.audit(data);
assert.equal(pa.steep.length, 0, 'wegen steiler dan de klasse');
assert.equal(pa.clearance.length, 0, 'wegen onder de vrije hoogte');
const ra = RP.audit(data);
assert.equal(RP.problems(ra), 0, 'spoorprofiel');
// rijen: geen dubbele opeenvolgende punten, z hoort bij pts
for (const r of B.roads) {
  assert.ok(r.pts.length >= 2, 'weg met minder dan twee punten');
  if (r.z) assert.equal(r.z.length, r.pts.length, 'z per punt');
  for (let i = 1; i < r.pts.length; i++) assert.ok(r.pts[i][0] !== r.pts[i - 1][0] || r.pts[i][1] !== r.pts[i - 1][1], `dubbel punt in weg ${r.osm}`);
}
// de tegels van de nieuwe stad
const built = P.build(src);
assert.ok(built.counts.roads > 11000 && built.counts.rails > 150, 'tegels met wegen en spoor');
console.log('stadlaag_wegen_test: ok');
