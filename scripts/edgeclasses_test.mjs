// #1092: de ene tabel van de randen rond percelen (game/js/edgeclasses.js) en de regel "geen kaartlijn, geen rand".
//  - elke randklasse met uiterlijk heeft een collision en omgekeerd, en een kaartbron;
//  - streetfurniture.js (colliders) en streetfurniture3d.js (maat en kleur) lezen die tabel, geen eigen getallen;
//  - de hoogte van een gemapte heg is overal dezelfde regel (OSM-hoogte, anders de klassehoogte);
//  - het hashraster van countryside.js zet geen paal, draad, poort, berm of bies meer;
//  - sloot- en boomrijbreedte van de wereldbouwer komen uit dezelfde tabel.
//   node scripts/edgeclasses_test.mjs
import fs from 'node:fs';
import './node3d.mjs';
const EC = await import('../game/js/edgeclasses.js');
const SF = await import('../game/js/streetfurniture.js');
const WB = await import('../game/js/worldbuilder.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// 1. de tabel hangt samen
ok(EC.edgeClassProblems().length === 0, 'de tabel is consistent', EC.edgeClassProblems().join('; '));
ok(['ditch', 'hedge', 'fence', 'treerow'].every((k) => EC.EDGE_CLASSES[k]), 'sloot, heg, hek en boomrij staan in de tabel');
const kapot = { a: { source: { osm: ['x=y'] }, visual: {} }, b: { source: { osm: ['x=y'] }, collider: { kind: 'k', r: 1 } }, c: { visual: {}, collider: { kind: 'k', r: 1 } } };
const p = EC.edgeClassProblems(kapot).join('|');
ok(/a: wel visual maar geen collision/.test(p), 'een uiterlijk zonder collision wordt afgekeurd');
ok(/b: geen visual maar wel collision/.test(p), 'een collision zonder uiterlijk wordt afgekeurd');
ok(/c: geen kaartbron/.test(p), 'een rand zonder kaartbron wordt afgekeurd');
ok(Object.isFrozen(EC.EDGE_CLASSES) && Object.isFrozen(EC.EDGE_CLASSES.hedge), 'de tabel is bevroren');

// 2. de collision van een stuk komt uit de tabel (en dus ook wat streetfurniture.js doorgeeft)
const hedge = { k: 'hedge', x: 1, y: 2, a: 0.5, s: 3, h: 1.4, key: 'h1' };
const hedgeZonder = { ...hedge, h: undefined, key: 'h2' };
const fence = { k: 'fence', x: 3, y: 4, a: 0, s: 3, key: 'f1' };
const col = SF.furnitureColliders([hedge, hedgeZonder, fence]);
ok(col.length === 3, 'een heg en een hek geven elk een collider');
ok(JSON.stringify(col[0]) === JSON.stringify(EC.edgeCollider('hedge', hedge)), 'de heg-collider is die van de tabel');
ok(col[0].kind === 'heg' && col[0].static === true && col[0].r === 0.4 && col[0].top === 1.4, 'een heg is vast en 1,4 m hoog');
ok(col[1].top === EC.EDGE_CLASSES.hedge.height, 'een heg zonder hoogte krijgt de klassehoogte');
ok(JSON.stringify(col[2]) === JSON.stringify(EC.edgeCollider('fence', fence)), 'de hek-collider is die van de tabel');
ok(col[2].kind === 'hek' && !col[2].static && col[2].r === 0.08, 'een hek is dun en breekt');
ok(EC.edgeHeight('hedge', 2.2) === 2.2 && EC.edgeHeight('hedge', 0) === 1.4 && EC.edgeHeight('hedge', NaN) === 1.4, 'de heghoogte: OSM-hoogte, anders de klasse');

// 3. de collisionprofielen van de tabel zijn die van de breekbare props (breakables.js)
const br = read('game/js/breakables.js');
const propR = (kind) => { const m = new RegExp('\\n  ' + kind + ': \\{ r: ([0-9.]+)').exec(br); return m ? Number(m[1]) : null; };
ok(propR('hek') === EC.EDGE_CLASSES.fence.collider.r, 'hek: dezelfde straal in breakables.js en de tabel', String(propR('hek')));
ok(propR('tree') === EC.EDGE_CLASSES.treerow.collider.r, 'boom: dezelfde stamstraal in breakables.js en de tabel', String(propR('tree')));

// 4. het tekenen leest de tabel
const f3 = read('game/js/streetfurniture3d.js');
ok(/EDGE_CLASSES\.fence\.visual/.test(f3) && /EDGE_CLASSES\.hedge\.visual/.test(f3), 'streetfurniture3d.js leest maten uit de tabel');
ok(!/0x3f6a30|0x4a7838|0x4f5a52|0x3d4640/.test(f3), 'en heeft geen eigen heg- of hekkleur meer');
ok(/edgeHeight\('hedge', it\.h\)/.test(f3), 'de heghoogte volgt dezelfde regel als de collider');
const fs1 = read('game/js/streetfurniture.js');
ok(/edgeCollider\('fence', it\)/.test(fs1) && /edgeCollider\('hedge', it\)/.test(fs1), 'streetfurniture.js geeft de collider van de tabel');
ok(!/kind: 'hek', x: it\.x/.test(fs1) && !/kind: 'heg', x: it\.x/.test(fs1), 'en heeft geen eigen hek- of hegprofiel meer');
ok(/h: k === 'noise' \? \(m\.h \|\| 4\) : k === 'hedge' \? edgeHeight\('hedge', m\.h\)/.test(fs1), 'een gemapte heg krijgt zijn hoogte uit de tabel');
ok(/DITCH_WIDTH = EDGE_CLASSES\.ditch\.width/.test(read('game/js/worldbuilder.js')), 'de slootbreedte komt uit de tabel');
ok(WB.DITCH_WIDTH.ditch === 2.4 && WB.DITCH_WIDTH.drain === 1.6 && WB.DITCH_WIDTH.stream === 3, 'de slootbreedtes zijn gelijk gebleven');
ok(WB.TREE_ROW_SPACING === 6, 'de boomrij houdt zijn 6 m');

// 5. de stukken die streetfurniture.js maakt, staan op de gemapte lijn (geen rand zonder bronlijn)
{
  const line = [[0, 0], [30, 0], [30, 20]];
  const res = SF.furnitureForTile({
    x0: -100, y0: -100, size: 400, roads: [], water: [], rails: [], buildings: [],
    mapped: [{ k: 'fence', pts: line, osm: 1 }, { k: 'hedge', pts: [[50, 50], [80, 50]], osm: 2 }], opts: { towns: [] },
  });
  const pieces = res.items.filter((it) => it.k === 'fence' || it.k === 'hedge');
  ok(pieces.length >= 12, 'een gemapte lijn geeft stukken', String(pieces.length));
  const seg = (x, y, P) => { let best = 1e9; for (let i = 0; i + 1 < P.length; i++) { const [ax, ay] = P[i], [bx, by] = P[i + 1]; const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))); best = Math.min(best, Math.hypot(ax + dx * t - x, ay + dy * t - y)); } return best; };
  const bron = { fence: line, hedge: [[50, 50], [80, 50]] };
  ok(pieces.every((it) => seg(it.x, it.y, bron[it.k]) < 1.5), 'elk stuk ligt op zijn bronlijn');
  ok(res.items.filter((it) => it.k === 'fence' || it.k === 'hedge').every((it) => it.src === 'osm'), 'elk stuk draagt de herkomst osm');
  ok(SF.furnitureColliders(res.items).every((c) => c.kind === 'hek' || c.kind === 'heg' || c.kind === 'vangrail' || c.kind === 'paal' || c.kind === 'wall' || c.kind === 'mast' || c.kind === 'bord' || c.kind === 'bench' || c.kind === 'bin' || c.kind === 'rail' || c.kind === 'lamp' || c.kind === 'abri'), 'elke collider is een bekend profiel');
}

// 6. het hashraster van countryside.js zet geen paal, draad, poort, berm of bies meer (bron en uitkomst)
{
  const src = read('game/js/countryside.js');
  for (const naam of ['genFieldEdges', 'fenceLine', 'hedgeLine', 'fencedParcel', 'parcelGate'])
    ok(!src.includes(naam), 'countryside.js kent ' + naam + ' niet meer');
  const CS = await import('../game/js/countryside.js');
  const CF = await import('../game/js/countryfield.js');
  CF.setCountryBounds([-2000, -2000, 2000, 2000]);
  const tel = { post: 0, wire: 0, gate: 0, bank: 0, rush: 0, hedge: 0 };
  let tegels = 0, willows = 0;
  for (const [x0, y0] of [[0, 0], [40, 40], [90, -30], [-60, 120]]) {
    for (let tx = x0; tx < x0 + 8; tx++) for (let ty = y0; ty < y0 + 8; ty++) {
      const t = CS.countryTileItems(tx, ty);
      tegels++;
      for (const k of Object.keys(tel)) tel[k] += ((t.items[k] || { m: [] }).m.length) / 16;
      willows += ((t.items.willow || { m: [] }).m.length) / 16;
      ok(!t.walls, 'een tegel registreert geen loopmuren van randen meer');
    }
  }
  ok(tegels === 256 && Object.values(tel).every((v) => v === 0), 'geen paal, draad, poort, berm, bies of heg uit het hashraster, de erven en de dorpen', JSON.stringify(tel));
}

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
