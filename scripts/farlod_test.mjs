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
const map = { buildings, roads: [], green: [], terrainOn: false };
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

console.log(fails ? `${fails} of ${n} FAILED` : `ok: ${n} checks`);
process.exit(fails ? 1 : 0);
