// Perrons en trappen (#436):  node scripts/perrons_test.mjs
// - de bouw (scripts/world/perrons.mjs) op een klein nepstation: een perron op de hoogte van de spoorvloer + 1,02 m, het spoor erlangs
//   vrij (PLATFORM_EDGE), een helling voor een laag perron en een trap voor een hoog perron (station op een dijk), niets in de weg;
// - het hoogtemodel: je loopt op het perron (groundHeightAt, surfaceAt), je komt er via de trap op, een auto niet; een trein raakt
//   wie op het perron staat niet, wie op het spoor staat wel.
import './node3d.mjs';

const { derivePerrons, stripsOf } = await import('./world/perrons.mjs');
const P = await import('../game/js/perrons.js');
const E = await import('../game/js/elevation.js');
const R = await import('../game/js/railprofile.js');

let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const near = (a, b, e = 0.02) => Math.abs(a - b) <= e;
const line = (x0, x1, y, z, step = 25) => { const pts = [], zs = []; for (let x = x0; x <= x1; x += step) { pts.push([x, y]); zs.push(z); } return { pts, z: zs }; };
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

// 1. een laag station: twee sporen op het maaiveld, een eilandperron ertussen (de OSM-vlak ligt slordig over de sporen heen)
{
  const data = {
    rails: [line(-200, 200, 0, 0), line(-200, 200, 10, 0)],
    railPlatforms: [{ pts: rect(-80, -2.5, 80, 12.5), layer: 0, ref: '1' }],
    roads: [], buildings: [], water: [], stations: [{ name: 'Groningen Proef', x: 0, y: 5 }],
  };
  const { rows, rep } = derivePerrons(data);
  ok(rows.length >= 1, 'er komt een strook', JSON.stringify(rep));
  const row = rows[0];
  ok(row.p.every((q) => near(q[3], R.RAIL_TOP + R.PLATFORM_ABOVE_RAIL)), 'bovenkant 1,02 m boven het maaiveld', row.p[0][3]);
  // het spoor blijft vrij: elk punt van de strook ligt minstens PLATFORM_EDGE van beide hartlijnen
  const edgeOk = rows.every((r) => r.p.every((q) => Math.abs(q[1] - 0) - q[2] >= R.PLATFORM_EDGE - 0.001 && Math.abs(q[1] - 10) - q[2] >= R.PLATFORM_EDGE - 0.001));
  ok(edgeOk, 'het perron raakt de baan van de trein niet', rows.map((r) => r.p.slice(0, 2).join('|')).join(' ; '));
  ok(row.r.length >= 1 && row.r.every((r) => r.k === 'helling'), 'een helling bij een laag perron', JSON.stringify(row.r));
  ok(!rep.zonderTrap.length, 'een trap of helling past', JSON.stringify(rep.zonderTrap));
  const hl = row.r[0];
  ok(near(hl.za, row.p[0][3], 0.05) && hl.zb === 0, 'de helling loopt van het perron naar het maaiveld');
  const len = Math.hypot(hl.b[0] - hl.a[0], hl.b[1] - hl.a[1]);
  ok(near(len, 1.02 / 0.085, 0.3), 'een helling van 1:12', len.toFixed(1));
}

// 2. een hoog station: spoor op een dijk van 5,6 m, een zijperron ernaast, vrije grond aan de buitenkant, een gebouw aan de andere kant
{
  const data = {
    rails: [line(-200, 200, 0, 5.6)],
    railPlatforms: [{ pts: rect(-60, 2.5, 60, 8), layer: 1, ref: '2' }],
    roads: [], buildings: [{ pts: rect(-30, -30, 30, -8) }], water: [], stations: [{ name: 'Groningen Hoog', x: 0, y: 5 }],
  };
  const { rows, rep } = derivePerrons(data);
  ok(rows.length === 1, 'één strook', String(rows.length));
  const row = rows[0];
  ok(near(row.p[0][3], 5.6 + 1.02), 'perron op de hoogte van de spoorvloer + 1,02 m', row.p[0][3]);
  ok(row.r.length >= 1 && row.r.every((r) => r.k === 'trap'), 'een trap bij een hoog perron', JSON.stringify(row.r));
  ok(!rep.zonderTrap.length, 'een trap past', JSON.stringify(rep.zonderTrap));
  const tr = row.r[0];
  const len = Math.hypot(tr.b[0] - tr.a[0], tr.b[1] - tr.a[1]);
  ok(near(len, (5.6 + 1.02) / 0.28, 0.4), 'een trap van 1:3,6', len.toFixed(1));
  // niets in de weg: de voet van de trap ligt niet in het gebouw
  ok(!(tr.b[1] < -8 && Math.abs(tr.b[0]) < 30), 'de trap staat niet in het gebouw', tr.b.join(','));
  ok(stripsOf(rect(-60, 2.5, 60, 8), [data.rails[0].pts]).length === 1, 'stripsOf: één strook langs een enkel spoor');

  // het hoogtemodel
  const map = { perrons: rows, roads: [], rails: data.rails, terrainOn: false };
  const elev = E.addPerrons(map, { has: false });
  ok(elev.has && !!elev.perrons, 'het model kent de perrons');
  const top = row.p[0][3];
  const x = 0, y = 5.2;
  ok(near(E.groundHeightAt(elev, x, y, top), top, 0.01), 'je staat op het perron', String(E.groundHeightAt(elev, x, y, top)));
  ok(near(E.groundHeightAt(elev, x, y, 0), 0, 0.01), 'vanaf straatniveau kom je er niet zomaar op');
  // de trap op lopen: de hoogte loopt mee van de voet naar boven
  const s0 = { z: 0, ribbon: null };
  const steps = 200;
  let maxJump = 0, zTop = 0;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, px = tr.b[0] + (tr.a[0] - tr.b[0]) * t, py = tr.b[1] + (tr.a[1] - tr.b[1]) * t;
    const before = s0.z;
    elev.map = elev.map || map;
    E.surfaceAt(elev, px, py, s0);
    maxJump = Math.max(maxJump, Math.abs(s0.z - before));
    zTop = s0.z;
  }
  ok(maxJump < 0.5, 'de trap is zonder sprong te belopen', maxJump.toFixed(2));
  ok(near(zTop, top, 0.1), 'boven aan de trap sta je op het perron', zTop.toFixed(2));
  // de rand: te voet een muur, een voertuig komt er niet op, ook niet vanaf de dijk
  const edgeY = row.p[10][1] + row.p[10][2];
  const wall = E.resolveElevWalls(elev, row.p[10][0], edgeY - 0.1, 0, 0.35);
  ok(wall && wall[1] > edgeY, 'een voetganger op de grond komt niet door de rand', JSON.stringify(wall));
  ok(!E.resolveElevWalls(elev, row.p[10][0], edgeY - 1, top, 0.35), 'wie op het perron staat wordt niet teruggezet');
  const veh = E.elevWallContact(elev, row.p[10][0], edgeY - 0.3, 0.2, 1.4, false, null);
  ok(!!veh, 'een auto op de grond wordt bij de rand tegengehouden');
  // bij de trap is de rand open: een voetganger op de trap wordt niet teruggezet
  const midRamp = [(tr.a[0] + tr.b[0]) / 2, (tr.a[1] + tr.b[1]) / 2];
  ok(!E.resolveElevWalls(elev, midRamp[0], midRamp[1], (top) / 2, 0.35), 'op de trap staat niets in de weg');
  const P2 = P.buildPerrons(rows);
  ok(P2.posts.length >= 2, 'paaltjes aan de voet van de trap (een auto past er niet tussen)', String(P2.posts.length));
  const gap = P2.posts.filter((p) => Math.hypot(p.x - tr.b[0], p.y - tr.b[1]) < 1).map((p) => p).sort((a, b) => a.x - b.x || a.y - b.y);
  void gap;
  ok(P.onPerron(P2, 0, 5.2, top), 'onPerron: op het vloertje');
  ok(!P.onPerron(P2, 0, 5.2, 0), 'onPerron: niet vanaf de grond');
  ok(!P.onPerron(P2, midRamp[0], midRamp[1], top / 2), 'onPerron: een trap telt niet (een trein raakt je er wel)');
}

// 3. een trein raakt wie op het perron staat niet, wel wie op het spoor staat (railway.js)
{
  const rows = [{ id: 't', nm: 'Perron 1', p: [[-30, 3.8, 1.9, 1.02], [0, 3.8, 1.9, 1.02], [30, 3.8, 1.9, 1.02]], r: [] }];
  const map = { perrons: rows, roads: [], rails: [], terrainOn: false };
  const elev = E.addPerrons(map, { has: false });
  const PP = elev.perrons;
  ok(P.onPerron(PP, 0, 3.8, 1.02), 'speler op het perron');
  ok(!P.onPerron(PP, 0, 0, 0.26), 'speler op het spoor: niet op het perron');
}

// 4. de onderkant van een perronkap is licht (#463): de kap boven een perron
//    krijgt een lichte plaat onder de donkere slab, een kap elders niet
{
  const C = await import('../game/js/canopies3d.js');
  const row = { id: 'k', nm: 'Perron 1', p: [[-20, 5, 2, 1.02], [0, 5, 2, 1.02], [20, 5, 2, 1.02]], r: [] };
  const ring = (cx, cy) => [[cx - 8, cy - 3], [cx + 8, cy - 3], [cx + 8, cy + 3], [cx - 8, cy + 3]];
  const map = { perrons: [row], canopies: [{ pts: ring(0, 5) }, { pts: ring(200, 5) }], rails: [], roads: [], roadsNear: () => [], railNear: () => [] };
  const grp = C.buildCanopies(map);
  const under = [];
  grp.traverse((o) => { if (o.name === 'perronkap-onder') under.push(o); });
  ok(under.length === 1, 'alleen de kap boven het perron krijgt een lichte onderkant', String(under.length));
  if (under[0]) {
    const c = under[0].material.color;
    ok(c.r > 0.5 && c.g > 0.5 && c.b > 0.5, 'de onderkant van de perronkap is licht', `${c.r.toFixed(2)},${c.g.toFixed(2)},${c.b.toFixed(2)}`);
    const y = under[0].geometry.attributes.position.getY(0);
    ok(near(y, 5.17, 0.01), 'de lichte plaat hangt net onder de kap (geen z-fighting)', y.toFixed(3));
  }
}

console.log(`${n - fails}/${n} perron-controles gehaald`);
process.exit(fails ? 1 : 0);
