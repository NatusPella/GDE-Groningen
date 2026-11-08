// Far LOD (#463): node scripts/farlod_test.mjs   (eenmalig: cd desktop && npm run stage)
// Wat farlod.js van een gebouw maakt: een prisma met de voet en de top van zijn muur in het
// lodWall-attribuut, zodat de gevelshader een plint, een strook hooglichten en een kroonlijst kan
// zetten die ook op afstand en onder een scherpe hoek blijven staan (grote kale vlakken in de verte).
//  - elk gebouw heeft lodWall, met voet < top en elk punt tussen die twee;
//  - de muurpunten staan op de voet of de top, de dakpunten op de top;
//  - alles is eindig (geen NaN in de geometrie, geen NaN in lodWall);
//  - de patch van de gevelshader gebruikt lodWall en laat de ramen op afstand tot hun gemiddelde
//    samenvallen in plaats van te verdwijnen;
//  - de laag tekent: na het bouwen van de tegel zijn er driehoeken en staat de groep aan.
import './node3d.mjs';

// de tegel als losse mesh in plaats van als cel van de multi-draw-pool: dan is de geometrie te lezen
globalThis.window.__perfOffDyn = new Set(['pool']);
const THREE = await import('three');
const { createFarLOD } = await import('../game/js/farlod.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const rect = (cx, cy, w, d) => [[cx - w / 2, cy - d / 2], [cx + w / 2, cy - d / 2], [cx + w / 2, cy + d / 2], [cx - w / 2, cy + d / 2]];
const building = (cx, cy, w, d, h, type = 'yes') => ({ pts: rect(cx, cy, w, d), bounds: [cx - w / 2, cy - d / 2, cx + w / 2, cy + d / 2], h, hm: h * 3.1, type });

// een stadje in een tegel: een hoog pakhuis, een lange hal, een huis en een
// lage schuur (de muur van een schuur is de laagste die de bouwer maakt)
const buildings = [building(40, 40, 20, 14, 4), building(80, 60, 60, 22, 3, 'warehouse'), building(20, 80, 9, 8, 2, 'house'), building(30, 15, 7, 5, 0.2, 'shed')];
// #524: de verre laag leest de rasters (buildingGrid/roadGrid/greenGrid), niet de
// hele kaartarrays; de test bouwt dezelfde rasters als GameMap.
const { SpatialGrid } = await import('../game/js/spatialgrid.js');
const buildingGrid = new SpatialGrid(40);
for (const b of buildings) buildingGrid.insert(b, b.bounds);
const map = { buildingGrid, roadGrid: new SpatialGrid(40), greenGrid: new SpatialGrid(80), terrainOn: false };
const scene = new THREE.Scene();
const lod = createFarLOD(scene, map, {
  flatGeometry: (g) => g,
  colors: { roads: {}, sidewalk: '#8a8a8a', green: '#4a6b3a' },
  sidewalkExtra: 1.2,
  roadColorOf: null,
});

// de tegel bouwen (de laag werkt met een tijdbudget per frame)
for (let i = 0; i < 200 && (!lod.stats.tiles || lod.stats.queued); i++) lod.update(50, 50, 2000, 2000, 60);
ok(lod.stats.tiles > 0, 'de tegel met de gebouwen is gebouwd', JSON.stringify(lod.stats));
ok(lod.root.visible, 'de verre laag staat aan');
ok(lod.stats.triangles > 0, 'de laag telt driehoeken', String(lod.stats.triangles));

let mesh = null;
lod.root.traverse((o) => { if (!mesh && o.isMesh && o.geometry.getAttribute('lodWall')) mesh = o; });
ok(!!mesh, 'er is een gebouwenmesh met een lodWall-attribuut');
const walls = []; // de muurhoogtes van deze tegel, voor de banden hieronder
if (mesh) {
  const pos = mesh.geometry.getAttribute('position');
  const lw = mesh.geometry.getAttribute('lodWall');
  ok(lw && lw.count === pos.count, 'elk punt heeft een voet en een top', lw ? `${lw.count} van ${pos.count}` : 'geen lodWall');
  let finite = true, ordered = true, inside = true, minWall = Infinity;
  const feet = new Set(), tops = new Set();
  for (let i = 0; i < pos.count && lw; i++) {
    const y = pos.getY(i), b = lw.getX(i), t = lw.getY(i);
    if (![pos.getX(i), y, pos.getZ(i), b, t].every(Number.isFinite)) { finite = false; break; }
    if (!(b < t)) ordered = false;
    if (y < b - 1e-3 || y > t + 1e-3) inside = false;
    minWall = Math.min(minWall, t - b);
    feet.add(+b.toFixed(3)); tops.add(+t.toFixed(3));
  }
  ok(finite, 'de geometrie en lodWall zijn eindig');
  ok(ordered, 'de voet ligt onder de top van elke muur');
  ok(inside, 'elk punt ligt tussen de voet en de top van zijn muur');
  ok(feet.size === 1 && [...feet][0] === 0, 'de voeten staan op de grond (geen reliëf)', [...feet].join(','));
  ok(tops.size === buildings.length, 'elk gebouw heeft zijn eigen muurhoogte', `${tops.size} van ${buildings.length}: ${[...tops].join(',')}`);
  ok(minWall >= 2.4, 'geen muur onder het minimum van 2,4 m', minWall.toFixed(2));
  for (const t of tops) walls.push(t - [...feet][0]);
  // de dakpunten (bovenste ring, dakkleur) staan op de top: de prisma's hebben geen losse dakvlakken op een andere hoogte
  let atTop = 0;
  for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getY(i) - lw.getY(i)) < 1e-6) atTop++;
  ok(atTop >= pos.count / 3, 'de bovenste ring staat op de top van zijn muur', `${atTop} van ${pos.count}`);
}

// de shaderpatch: lodWall erin, en de ramen vallen op afstand samen tot hun gemiddelde
const FR = await import('../game/js/farlod.js');
const stub = () => ({
  uniforms: {},
  vertexShader: '#include <common>\nvoid main() {\n#include <project_vertex>\n}',
  fragmentShader: '#include <common>\nvoid main() {\n#include <color_fragment>\n#include <emissivemap_fragment>\n}',
});
const mat = mesh && mesh.material;
ok(!!(mat && mat.onBeforeCompile), 'het gevelmateriaal heeft een shaderpatch');
if (mat && mat.onBeforeCompile) {
  const sh = stub();
  mat.onBeforeCompile(sh);
  ok(/attribute vec2 lodWall/.test(sh.vertexShader), 'de vertexshader leest lodWall');
  ok(/vFarWall = lodWall/.test(sh.vertexShader), 'de vertexshader geeft de muur door');
  ok(/varying vec2 vFarWall/.test(sh.fragmentShader), 'de fragmentshader kent vFarWall');
  ok(/plinth/.test(sh.fragmentShader) && /crown/.test(sh.fragmentShader), 'de gevel heeft een plint en een kroonlijst');
  ok(/mix\(wwin, 0\.18, wblur\)/.test(sh.fragmentShader), 'de ramen blijven op afstand als hun gemiddelde staan');
  ok(!/wwin \* \(1\.0 - wblur\)/.test(sh.fragmentShader), 'de oude formule laat geen kale muur meer achter');
  // de shader rekent met dezelfde getallen als facadeBands (één bron, geen drift)
  const F2 = FR.FACADE;
  ok(sh.fragmentShader.includes(`max(vFarWall.y - vFarWall.x, ${F2.minWall.toFixed(2)})`), 'de shader kent dezelfde muurondergrens');
  ok(sh.fragmentShader.includes(`wh * ${F2.plinthShare.toFixed(2)}`) && sh.fragmentShader.includes(`wh - ${F2.crownLow.toFixed(2)}`), 'en dezelfde plint en kroonlijst');
  ok(sh.fragmentShader.includes(`wh > ${F2.ventMinWall.toFixed(1)}`), 'en dezelfde hoogte waarboven een hal hooglichten krijgt');
}

// (#463) de banden (plint, hooglichten, kroonlijst) blijven binnen de muur,
// ook bij een lage schuur: de plint eindigt onder de kroonlijst, de kroonlijst
// hangt onder de dakrand en de hooglichten vallen tussen die twee in
{
  const F = FR.FACADE;
  // de laagste muur die de bouwer maakt, een schuur, een huis, de maten uit
  // deze tegel en een hoge hal
  const heights = [F.minWall, 2.5, 2.6, 3, 3.1, 3.6, 5.4, 5.6, 6.5, 12, 40, ...walls];
  for (const w of heights) {
    const b = FR.facadeBands(0, w);
    const tag = w.toFixed(2) + ' m';
    ok(b.wall >= F.minWall && b.wall >= w - 1e-9, `de muur van ${tag} is minstens het minimum`, b.wall.toFixed(2));
    ok(b.plinth > 0 && b.plinthEnd > b.plinth, `de plint van ${tag} heeft een onderkant en een einde`, `${b.plinth.toFixed(2)}..${b.plinthEnd.toFixed(2)}`);
    ok(b.plinthEnd <= b.crownFrom - 1e-9, `de plint van ${tag} eindigt onder de kroonlijst`, `${b.plinthEnd.toFixed(2)} < ${b.crownFrom.toFixed(2)}`);
    ok(b.crownTo > b.crownFrom && b.crownTo <= b.wall + 1e-9, `de kroonlijst van ${tag} hangt binnen de muur`, `${b.crownFrom.toFixed(2)}..${b.crownTo.toFixed(2)} van ${b.wall.toFixed(2)}`);
    if (b.vent) ok(b.vent.from >= b.plinthEnd - 1e-9 && b.vent.to <= b.crownFrom + 1e-9, `de hooglichten van ${tag} vallen tussen plint en kroonlijst`, `${b.vent.from.toFixed(2)}..${b.vent.to.toFixed(2)}`);
    else ok(b.wall <= F.ventMinWall + 1e-9, `een muur van ${tag} is te laag voor hooglichten`, String(b.wall));
  }
  // onder het minimum rekent de shader met minWall: de banden schuiven niet mee
  ok(FR.facadeBands(10, 10.1).wall === F.minWall, 'een muur onder het minimum rekent met minWall');
}

// (#502) Prefetch-marge en hysterese: een tegel begint te bouwen vóórdat hij in
// beeld komt, zodat hij klaar is als de speler hem ziet (playtest 27-10: "het
// plopt nu een beetje per chunk in de verte"), en valt pas ruim achter de
// zichtafstand weg, zodat omdraaien of een sprong in de zichtafstand hem niet
// meteen opnieuw hoeft te bouwen.
{
  const P = FR.PRELOAD;
  // de marge zelf, per zichtafstand die het spel kent (viewdist.js)
  for (const view of [150, 350, 600, 900]) {
    const r = FR.lodRanges(view);
    const lead = r.start - view;
    ok(lead > 0, `de tegel begint bij ${view} m al voorbij de zichtafstand (prefetch)`, lead.toFixed(0) + ' m');
    ok(lead >= P.min - 1e-9 && lead >= view * P.share - 1e-9, `de marge bij ${view} m is een deel van de zichtafstand met een minimum`, lead.toFixed(0));
    ok(r.drop > r.start + 1e-9, `de tegel valt bij ${view} m pas achter de marge weg`, `${r.start.toFixed(0)} -> ${r.drop.toFixed(0)}`);
    ok(r.drop - view > 160, `de weggooiafstand bij ${view} m is ruimer dan de oude halve tegel`, `${(r.drop - view).toFixed(0)} m achter de zichtafstand`);
  }
  ok(FR.lodRanges(600).start > FR.lodRanges(350).start, 'een grotere zichtafstand schuift de marge mee naar buiten');

  // een eigen laag met alleen het stadje (0..320), zodat de tellingen van
  // hierboven niet meewegen: de speler staat op afstand d van de tegelrand
  const opts = { flatGeometry: (g) => g, colors: { roads: {}, sidewalk: '#8a8a8a', green: '#4a6b3a' }, sidewalkExtra: 1.2, roadColorOf: null };
  const makeLod = () => createFarLOD(new THREE.Scene(), map, opts);
  const settle = (l, d, view = 400) => {
    // minstens twee passes: een nieuwe tegel telt pas mee in de stats van de
    // pass ná de bouw (farlod.js: "a pass that built something shows the new
    // meshes with the next one")
    for (let i = 0; i < 40; i++) {
      l.update(320 + d, 160, view, view, 60);
      if (i >= 1 && !l.stats.queued) return;
    }
  };

  // 460 m: buiten de zichtafstand (400) maar binnen de marge (start 520)
  const edge = makeLod();
  settle(edge, 460);
  // De idle-pass kan een ronde overslaan; forceer met kleine focusverschuivingen.
  for (let k = 0; k < 10 && !(edge.stats.tiles + edge.stats.queued + edge.stats.visible); k++) edge.update(320 + 460 + 1.1 * (k + 1), 160, 400, 400, 60);
  ok(edge.stats.tiles + edge.stats.queued > 0, 'een tegel buiten de zichtafstand maar binnen de marge is al in de maak', JSON.stringify(edge.stats));
  ok(edge.stats.visible === 0, 'die tegel staat nog niet in beeld', String(edge.stats.visible));

  // voorbij de marge begint er niets: de prefetch is begrensd
  const beyond = makeLod();
  settle(beyond, FR.lodRanges(400).start + 40);
  ok(beyond.stats.tiles === 0 && beyond.stats.queued === 0, 'voorbij de marge begint er nog geen tegel', JSON.stringify(beyond.stats));

  // dezelfde tegel zakt naar 600 m (voorbij de oude grens van 400 + 160) en
  // blijft staan tot voorbij `drop`
  settle(edge, 600);
  ok(edge.stats.tiles === 1, 'een tegel ruim buiten beeld maar binnen de hysterese blijft staan', JSON.stringify(edge.stats));
  settle(edge, FR.lodRanges(400).drop + 60);
  ok(edge.stats.tiles === 0, 'pas ver achter de zichtafstand valt de tegel weg', JSON.stringify(edge.stats));

  // binnen de zichtafstand wordt nooit iets weggegooid, ook niet als de speler
  // eromheen loopt of de zichtafstand verspringt
  const near = makeLod();
  let kept = true, lastD = -1;
  for (const view of [400, 900, 350, 150, 600, 400]) {
    for (const d of [0, 40, view * 0.5, view - 5]) {
      settle(near, d, view);
      if (near.stats.tiles !== 1) { kept = false; lastD = d; }
    }
  }
  ok(kept, 'een tegel binnen de zichtafstand wordt nooit weggegooid', lastD < 0 ? 'bij elke afstand en zichtafstand' : `weg bij ${lastD} m`);
}

// (#755) De incrementele basisindex: na een geoVer-wissel (tegel-add/drop in de sparse
// wereld) wordt hij in stukken van BUDGET_MS herbouwd. Valt het budget midden in een
// rastercel, dan moet de rest van die cel alsnog in de index komen; de vergelijking met
// een build zonder budget (de verse laag hierboven) legt dat vast.
{
  const opts = { flatGeometry: (g) => g, colors: { roads: {}, sidewalk: '#8a8a8a', green: '#4a6b3a' }, sidewalkExtra: 1.2, roadColorOf: null };
  // 300 gebouwen in één rastercel (SpatialGrid(40): cel 480..520), zodat de 64-item-
  // budgetcontrole van stepBaseBuild gegarandeerd midden in die cel valt.
  const menigte = [];
  for (let i = 0; i < 300; i++) menigte.push(building(500 + (i % 17), 500 + Math.floor(i / 17), 2, 2, 3));
  const maakMap = (geoVer) => {
    const buildingGrid = new SpatialGrid(40);
    for (const b of menigte) buildingGrid.insert(b, b.bounds);
    return { buildingGrid, roadGrid: new SpatialGrid(40), greenGrid: new SpatialGrid(80), terrainOn: false, geoVer };
  };
  const telGebouwen = (lod) => {
    let verts = 0, meshes = 0;
    lod.root.traverse((o) => {
      if (!o.isMesh || !o.geometry.getAttribute || !o.geometry.getAttribute('lodWall')) return;
      verts += o.geometry.getAttribute('position').count;
      meshes++;
    });
    return { verts, meshes };
  };
  const settleLod = (lod, px, py) => {
    for (let i = 0; i < 200; i++) {
      lod.update(px, py, 400, 400, 60);
      if (i >= 1 && lod.stats.tiles > 0 && !lod.stats.queued) return;
    }
  };
  // Referentie: dezelfde kaart, basisindex in één keer (geen budget).
  const ref = createFarLOD(new THREE.Scene(), maakMap(0), opts);
  settleLod(ref, 500, 500);
  const zonderBudget = telGebouwen(ref);
  ok(zonderBudget.verts > 0, 'de referentielaag heeft gebouwen', JSON.stringify(zonderBudget));

  // Incrementeel: na een geoVer-wissel bouwt update() de basisindex in stukken. De klok
  // springt per aanroep 5 ms vooruit, zodat elke budgetcontrole na 64 items afgaat en er
  // dus meerdere frames nodig zijn; daarna weer echte tijd om de tegels te bouwen.
  const mapIncrementeel = maakMap(0);
  const inc = createFarLOD(new THREE.Scene(), mapIncrementeel, opts);
  const echteNow = performance.now;
  try {
    let fake = 1e6;
    performance.now = () => { fake += 5; return fake; };
    mapIncrementeel.geoVer = 1;
    for (let i = 0; i < 40; i++) inc.update(500, 500, 400, 400, 60);
  } finally {
    performance.now = echteNow;
  }
  settleLod(inc, 500, 500);
  const metBudget = telGebouwen(inc);
  ok(metBudget.verts === zonderBudget.verts && metBudget.meshes === zonderBudget.meshes,
    'de incrementele basisindex verliest geen celhelft bij het budget', `${JSON.stringify(metBudget)} van ${JSON.stringify(zonderBudget)}`);
}

console.log(fails ? `${fails} of ${n} FAILED` : `ok: ${n} checks`);
process.exit(fails ? 1 : 0);

