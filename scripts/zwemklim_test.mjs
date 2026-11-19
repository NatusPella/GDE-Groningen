// #958: uit het water klimmen gebeurt bij de waterkant, niet meters landinwaarts.
// De oude regel zocht een droog punt binnen 1,3 m en schoof dat nog eens 0,5 m naar
// binnen; bij een kade klom de speler dan door de kademuur omhoog. Deze test draait
// findClimbSpot op een nepkaart met een rechte kade en een grasoever:
//  - de klimplek ligt 0,4 m achter de waterkant, ook als de zwemmer verder weg is;
//  - de richting waarin hij kijkt wint;
//  - een gebouw op de kade is geen klimplek;
//  - een grasoever heet `bank` (daar loopt hij zo uit), een kade niet;
//  - zonder oever binnen bereik is er geen klimplek.
//   node scripts/zwemklim_test.mjs
import './node3d.mjs';

const { findClimbSpot } = await import('../game/js/player.js');

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

// water: x < 0. De kade staat op x = 0.
const water = { pts: [[-60, -60], [0, -60], [0, 60], [-60, 60]] };
const green = [];
const buildings = [];
const map = {
  water: [water],
  waterNear: () => [water],
  greenNear: () => green,
  buildingsNear: () => buildings,
  roadsNear: () => [],
};

const near = (a, b, tol = 0.25) => Math.abs(a - b) <= tol;
const s = findClimbSpot(map, -0.8, 0, 0);
ok(!!s, 'er is een klimplek bij de kade');
if (s) {
  ok(near(s.x, 0.4, 0.3), 'de klimplek ligt 0,4 m achter de waterkant', `x=${s.x.toFixed(2)}`);
  ok(near(s.y, 0, 0.5), 'de klimplek ligt recht voor de zwemmer', `y=${s.y.toFixed(2)}`);
  ok(s.bank === false, 'een kade is geen grasoever');
}

// een zwemmer verder van de kade: de plek schuift niet mee het land op
const far = findClimbSpot(map, -1.2, 0, 0);
ok(!!far && near(far.x, 0.4, 0.3), 'de klimplek blijft bij de waterkant, ook verder weg', far ? `x=${far.x.toFixed(2)}` : 'geen');

// kijken naar de andere kant: de dichtstbijzijnde oever wint op de kijkrichting
const away = findClimbSpot(map, -0.8, 0, Math.PI);
ok(!!away && near(away.x, 0.4, 0.3), 'de kade achter de rug is nog steeds de klimplek', away ? `x=${away.x.toFixed(2)}` : 'geen');

// gebouw op de kade: geen klimplek
buildings.push({ pts: [[0.1, -6], [6, -6], [6, 6], [0.1, 6]], bounds: [0.1, -6, 6, 6], type: 'yes' });
ok(findClimbSpot(map, -0.8, 0, 0) === null, 'een gebouw op de kade blokkeert de klimplek');
buildings.length = 0;

// grasoever: bank = true
green.push({ pts: [[0, -60], [60, -60], [60, 60], [0, 60]], bounds: [0, -60, 60, 60] });
const bank = findClimbSpot(map, -0.8, 0, 0);
ok(!!bank && bank.bank === true, 'een grasoever is een bank (daar loopt hij zo uit)');
green.length = 0;

// midden op ruim water: geen oever binnen klimbereik
ok(findClimbSpot(map, -40, 0, 0) === null, 'zonder oever binnen bereik is er geen klimplek');

// --- (#958, vervolg) de plek zelf moet vrij zijn, en het pad ernaartoe ---------------------
// Een gebouw net achter de kade (0,6 m): de plek 0,4 m voorbij de waterkant ligt dan in de
// strook waar een lichaam niet staat; de botsingsregel zou hem terug het water in duwen.
buildings.push({ pts: [[0.6, -6], [6, -6], [6, 6], [0.6, 6], [0.6, -6]], bounds: [0.6, -6, 6, 6], type: 'yes' });
const strook = findClimbSpot(map, -0.8, 0, 0);
ok(!strook || strook.x <= 0.31, 'een gebouw net achter de kade: nooit een plek in de strook ertussen', strook ? `x=${strook.x.toFixed(2)}` : 'geen');
buildings.length = 0;

// kademuren en hekken uit het hoogtemodel: een muursegment duwt een lichaam eruit (zoals
// resolveWalls van de echte kaart); water staat links van x = 0 zoals hierboven.
const muren = [];
const pushUit = (x, y, r) => {
  for (const w of muren) {
    const ex = w.bx - w.ax, ey = w.by - w.ay, l2 = ex * ex + ey * ey;
    const t = Math.max(0, Math.min(1, ((x - w.ax) * ex + (y - w.ay) * ey) / l2));
    const cx = w.ax + ex * t, cy = w.ay + ey * t, d = Math.hypot(x - cx, y - cy);
    if (d < r) { const k = d > 1e-6 ? (r - d) / d : 0; x += (x - cx) * k; y += d > 1e-6 ? (y - cy) * k : r; }
  }
  return [x, y];
};
map.elev = { has: true };
map.terrainOn = true;
map.resolveWalls = (x, y, z, r) => pushUit(x, y, r);

// recht: een kademuur langs de hele waterkant: nergens een klimplek
muren.push({ ax: 0.15, ay: -8, bx: 0.15, by: 8 });
ok(findClimbSpot(map, -0.8, 0, 0) === null, 'een kademuur langs de waterkant: geen klimplek erdoorheen');
ok(findClimbSpot(map, -0.8, 5, 0) === null, 'ook niet verderop langs dezelfde muur');
muren.length = 0;

// kade met een trap: de muur heeft een opening (y 1 tot 2,5); alleen daar klim je uit het water
muren.push({ ax: 0.15, ay: -8, bx: 0.15, by: 1 }, { ax: 0.15, ay: 2.5, bx: 0.15, by: 8 });
ok(findClimbSpot(map, -0.8, 0, 0) === null, 'kade met trap: naast de trap is de muur dicht');
const trap = findClimbSpot(map, -0.8, 1.75, 0);
ok(!!trap && near(trap.x, 0.4, 0.3) && trap.y > 1 && trap.y < 2.5, 'kade met trap: bij de trap klim je wel uit het water', trap ? `x=${trap.x.toFixed(2)} y=${trap.y.toFixed(2)}` : 'geen');
// vlak naast de trap kijkt de zwemmer de trap in: de andere richtingen worden overgeslagen
const schuin = findClimbSpot(map, -0.8, 0.6, 0);
ok(!schuin || (schuin.y > 1 && schuin.y < 2.5), 'naast de trap kiest hij nooit een plek in de muur', schuin ? `y=${schuin.y.toFixed(2)}` : 'geen');
muren.length = 0;

// een hek op de oever, 0,25 m achter de waterkant: de plek ligt tegen het hek
muren.push({ ax: 0.25, ay: -8, bx: 0.25, by: 8 });
ok(findClimbSpot(map, -0.8, 0, 0) === null, 'een hek net achter de waterkant: geen plek eraan vast');
muren.length = 0;
// zonder muren is alles weer zoals voorheen
ok(!!findClimbSpot(map, -0.8, 0, 0), 'zonder muur klimt hij gewoon uit');

// hoekige kade: water in een L-vorm (de hoek x > 0, y > 0 is land): de binnenhoek geeft een plek
// die op droog land ligt, nooit in het water of in de hoek van het water
const hoekWater = { pts: [[-60, -60], [0, -60], [0, 0], [60, 0], [60, 60], [-60, 60]] };
// land: x >= 0, y <= 0 (rechtsonder) -- gespiegeld: water links en boven
const hoekMap = Object.assign({}, map, { water: [hoekWater], waterNear: () => [hoekWater] });
for (const [px, py, ang] of [[-0.6, -0.6, 0], [-0.5, -0.2, 0], [0.5, 0.5, Math.PI * 1.5], [2, 0.8, Math.PI * 1.5], [-0.3, 0.4, 0]]) {
  const h = findClimbSpot(hoekMap, px, py, ang);
  if (!h) continue;
  const inWater = (x, y) => pointInPoly(hoekWater.pts, x, y);
  ok(!inWater(h.x, h.y), 'een plek bij een hoekige kade ligt op droog land', `van (${px}, ${py}): (${h.x.toFixed(2)}, ${h.y.toFixed(2)})`);
}
function pointInPoly(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
delete map.elev; delete map.terrainOn; delete map.resolveWalls;

// en de klim zelf: de speler komt op de oever uit, niet in het gebouw
console.log(bad ? `${bad} van ${n} mislukt` : `zwemklim_test: ok (${n} controles)`);
process.exit(bad ? 1 : 0);
