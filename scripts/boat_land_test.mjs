// #948: een boot vaart niet het land op en verdwijnt niet onder de grond.
// De missie "Open, dicht" (M17) zette de sloep op een punt dat 86 m van het water lag;
// een boot die eenmaal op de kant stond, reed op volle snelheid door (op het land is de
// afstand tot de wal overal gelijk, dus de walregel zag geen verschil) en zakte onder de
// grond. Deze test dekt de regel en de gemeten missiepunten:
//  - keepBoatOffShore houdt een boot die op het water ligt van de kant;
//  - rescueBoat zet een gestrande boot terug op de laatste waterplek;
//  - de missie start op de kade en legt de boot op het water (bron);
//  - de vier tussenpunten liggen noordwaarts op de Boven Oosterdiep, in de volgorde
//    van de elf bruggen.
// Met --wereld (en game/world met de provincie) wordt op de echte tegels gemeten dat de
// start en de vier punten op water met genoeg ruimte liggen.
//   node scripts/boat_land_test.mjs [--wereld]
import './node3d.mjs';
import fs from 'node:fs';
const { keepBoatOffShore } = await import('../game/js/util.js');
const { rescueBoat } = await import('../game/js/vehicle.js');
const { PLACES } = await import('../game/js/missions_akte4.js');
const { wgsToWorld } = await import('../game/js/rdnew.js');

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

// --- de regel op een nepkaart: water is x < 0 -------------------------------------------
const water = { pts: [[-200, -200], [0, -200], [0, 200], [-200, 200]], bounds: [-200, -200, 0, 200] };
const map = { water: [water], waterNear: () => [water] };
const boat = (x, y) => ({ x, y, angle: 0, speed: 4, driftX: 0, driftY: 0, model: { len: 4.4, wid: 1.7 }, halfLen: 2.2, halfWid: 0.85 });
{
  const v = boat(-3, 0);
  ok(keepBoatOffShore(map, v, -3, 0, 0) === true, 'op het water blijft de boot varen');
  v.x = -2; v.y = 1;
  ok(keepBoatOffShore(map, v, -2, -1, 0) === true, 'een stap langs de wal mag');
  v.x = 1; v.y = 0;
  ok(keepBoatOffShore(map, v, -1, 0, 0) === false, 'een stap van het water het land op wordt geweigerd');
  ok(v.x === -1 && v.y === 0, 'de boot blijft op de waterplek staan', `${v.x},${v.y}`);
}
// --- rescueBoat -------------------------------------------------------------------------
{
  const v = boat(-3, 0);
  ok(rescueBoat(map, v) === false, 'op het water hoeft er niets teruggezet');
  ok(v._wetPose && v._wetPose.x === -3, 'de laatste waterplek wordt onthouden');
  v.x = 5; v.y = 2; v.angle = 1;
  ok(rescueBoat(map, v) === true, 'van het land wordt de boot tegengehouden');
  ok(v.x === -3 && v.y === 0 && v.angle === 0, 'en teruggezet op de laatste waterplek', `${v.x},${v.y}`);
  ok(v.speed === 0, 'de snelheid gaat eruit');
  const stranded = boat(4, 4);
  ok(rescueBoat(map, stranded) === true, 'ook zonder waterplek wordt er niet verder gevaren');
  ok(stranded.x === 4 && stranded.speed === 0, 'hij blijft staan waar hij stond');
}

// --- de missiepunten --------------------------------------------------------------------
const src = fs.readFileSync(new URL('../game/js/missions_akte4.js', import.meta.url), 'utf8');
ok(/boatAt: \{ \.\.\.xy\('veendamBoot'\), angle: -1\.2 \}/.test(src), 'de sloep wordt op veendamBoot gelegd, met de neus noordwaarts');
ok(/start: spot\('veendamKade'\)/.test(src), 'de speler start op de kade, niet in het water');
const boot = PLACES.veendamBoot, kade = PLACES.veendamKade;
const [bx, by] = wgsToWorld(boot[0], boot[1]), [kx, ky] = wgsToWorld(kade[0], kade[1]);
ok(Math.hypot(bx - kx, by - ky) < 20, 'de kade ligt naast de boot', `${Math.hypot(bx - kx, by - ky).toFixed(1)} m`);
const pts = ['veendamA', 'veendamB', 'veendamC', 'veendamD'].map((k) => PLACES[k]);
ok(pts[0][0] < pts[1][0] && pts[1][0] < pts[2][0], 'de tussenpunten gaan noordwaarts langs de diep');
ok(pts.every((p) => p[1] > boot[1]), 'ze liggen oostelijk van de start (langs de diep)');
ok(Math.abs(pts[3][1] - pts[2][1]) < 0.02 && Math.abs(pts[3][0] - pts[2][0]) < 0.002, 'brug elf ligt naast de vorige groep (de diep buigt daar)');
// #955: het vaarnet liep bij brug 1 dood (13,3 km omweg voor 1,2 km kanaal) en de etappe-limiet van 105 s was korter dan de rit zelf
{
  const { createVaarNet, planVaarRoute } = await import('../game/js/vaarnet.js');
  const { buildAkte4Defs } = await import('../game/js/missions_akte4.js');
  const net = createVaarNet(JSON.parse(fs.readFileSync(new URL('../game/vaarnet.json', import.meta.url), 'utf8')));
  const stops = [boot, ...pts].map((p) => wgsToWorld(p[0], p[1]));
  const def = buildAkte4Defs().find((d) => d.label === 'Open, dicht');
  const legs = def.stages.filter((s) => s.kind === 'goto');
  let totaal = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const r = planVaarRoute(net, stops[i], stops[i + 1], 'sloep');
    const recht = Math.hypot(stops[i + 1][0] - stops[i][0], stops[i + 1][1] - stops[i][1]);
    ok(r && r.length < recht * 1.5 + 100, `etappe ${i + 1}: de vaarroute van de sloep is geen omweg`, r ? `${r.length} m voor ${Math.round(recht)} m recht` : 'geen route');
    // de sloep haalt 11 m/s (playerTop): de limiet moet ruimte laten voor de bruggen en de bochten
    ok(legs[i].limit >= (r ? r.length : recht) / 11 * 1.5, `etappe ${i + 1}: de limiet laat ruimte (${legs[i].limit} s)`);
    totaal += legs[i].limit;
  }
  ok(def.timeLimit >= totaal, 'de totaaltijd past bij de som van de etappes', `${def.timeLimit} s voor ${totaal} s`);
}
// de oude schatting lag 3 km noordelijker: die mag niet terugkomen
ok(Math.abs(PLACES.veendamBoot[0] - 53.1050) > 0.01, 'de oude start op het land is weg');

// --- op de echte tegels (--wereld) ------------------------------------------------------
if (process.argv.includes('--wereld')) {
  const root = new URL('../game/world/', import.meta.url);
  if (!fs.existsSync(new URL('index-provincie.json', root))) {
    console.log('SKIP --wereld: geen game/world met de provincie');
  } else {
    await import('./node3d.mjs');
    const S = await import('../game/js/tilestore.js');
    const TW = await import('../game/js/tileworld.js');
    const PW = await import('../game/js/provinceworld.js');
    const G = await import('../game/js/gdt.js');
    const U = await import('../game/js/util.js');
    const WI = await import('../game/js/waterindex.js');
    const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
    const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
    PW.initProvince({ index: T.index, world: T.world });
    for (const [k, [lat, lon]] of Object.entries({ veendamBoot: boot, veendamA: pts[0], veendamB: pts[1], veendamC: pts[2], veendamD: pts[3] })) {
      const [x, y] = wgsToWorld(lat, lon);
      for (let dx = -200; dx <= 200; dx += 100) for (let dy = -200; dy <= 200; dy += 100) {
        const [i, j] = G.tileIndexOf(x + dx, y + dy);
        const t = G.tileKey(i, j);
        if (T.index.tiles[t]) await T.store.request(t, { priority: -1 });
      }
    }
    T.world.tileQueue.run(1e9);
    for (const [k, [lat, lon]] of Object.entries({ boot, A: pts[0], B: pts[1], C: pts[2], D: pts[3] })) {
      const [x, y] = wgsToWorld(lat, lon);
      const wet = U.inMapWater(T.world, x, y);
      const clear = WI.waterClearance(T.world, x, y, 12);
      ok(wet, `${k} ligt op het water`);
      ok(clear >= 1.5, `${k} heeft ruimte voor de sloep`, `clearance ${clear.toFixed(1)}`);
    }
    ok(!U.inMapWater(T.world, kx, ky), 'de kade is droog');
  }
}

console.log(bad ? `${bad} van ${n} mislukt` : `boat_land_test: ok (${n} controles)`);
process.exit(bad ? 1 : 0);
