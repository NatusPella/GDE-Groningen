// Staan op een autodak en op het dek van een boot (#434): het dak en het dek
// zijn solide, je kunt erop lopen, er met Spatie af stappen en er vanaf de kade
// op vallen; een boot drijft op het water (WATER_Y) met zijn dek erboven.
// Ook: een sprong op een dak is een afstapje, geen tweede sprong van een halve
// meter extra (die gaf ruim 2 m boven de straat, "een veel hogere sprong").
//   node scripts/perch_test.mjs
import './node3d.mjs';
import { WATER_Y } from '../game/js/util.js';
import { boatDeck, BOAT_DECK } from '../game/js/waterlevels.js';

const { Vehicle } = await import('../game/js/vehicle.js');
const { Player } = await import('../game/js/player.js');
const { vehicleHeight } = await import('../game/js/vaultkit.js');

let n = 0, fails = 0;
const check = (name, ok, extra = '') => { n++; if (!ok) { fails++; console.log('FAIL', name, extra); } else console.log('ok  ', name); };

const SEDAN = { name: 'sedan', len: 4.4, wid: 1.8, maxSpeed: 15, accel: 3, brake: 6, turnRate: 1.5 };
const SLOEP = { name: 'boat', kind: 'sloep', len: 5.5, wid: 2.0, maxSpeed: 4.5, accel: 1.6, brake: 2.2, turnRate: 1.3 };
const SCHIP = { name: 'boat', kind: 'binnenvaart', len: 38.5, wid: 5.05, maxSpeed: 5.5, accel: 0.35, brake: 0.5, turnRate: 0.3 };

// de boezem: overal water, 2,3 m onder de kade (util.js WATER_Y)
const WATER = { pts: [[-60, -60], [60, -60], [60, 60], [-60, 60]], kind: 'diep', lv: WATER_Y, nav: 4 };
function makeMap(water = true) {
  return {
    waterNear: (x, y, r) => (water && Math.abs(x) < 60 && Math.abs(y) < 60 ? [WATER] : []),
    water: water ? [WATER] : [],
    greenNear: () => [], buildingNear: () => [], buildingsNear: () => [], roadsNear: () => [], roads: [],
    propsNear: () => [], isOnBridge: () => false, coveredAt: () => false,
  };
}
function makeInput() {
  const st = { down: new Set(), pressed: new Set(), ay: 0 };
  return {
    st,
    wasPressed: (k) => st.pressed.has(k),
    isDown: (k) => st.down.has(k),
    axis: () => [0, st.ay],
    lookActive: () => false,
    padAxis: [0, 0],
    mouse: { dx: 0, dy: 0, down: false, rightDown: false, wheel: 0 },
  };
}
function scene(model, { water = true, at = 0 } = {}) {
  const p = new Player(at, 0);
  p.angle = 0;
  const input = makeInput();
  const v = new Vehicle(0, 0, 0, model);
  if (model.name === 'boat') v.isBoat = true; // zoals de spelwereld een boot neerzet (vehicle.js)
  const world = {
    input, map: makeMap(water), vehicles: [v], time: 0, camYaw: 0, audioEvents: [], pedestrians: [], companion: null,
    health: 100, armor: 0, ammo: {}, weapon: null, particles: [], addMessage() {},
  };
  return { p, v, world, input };
}
function step(s, n = 1, keys = {}) {
  for (let i = 0; i < n; i++) {
    s.input.st.ay = keys.fwd ? -1 : 0;
    s.input.st.pressed = new Set(i === 0 && keys.space ? [' '] : []);
    s.p.update(1 / 60, s.world);
    s.world.time += 1 / 60;
  }
}

// ---------------------------------------------------------------- het dek zelf
check('een sloep heeft een loopdek', boatDeck('sloep') === BOAT_DECK.sloep && boatDeck('sloep') > 0);
check('een politieboot (sloep met stuurhut) ook', boatDeck('sloepCabin') === BOAT_DECK.sloepCabin);
for (const k of ['kano', 'kajak', 'sup', 'skiff', 'acht', 'binnenvaart', 'zeeschip', 'sleper']) check(`geen dek om op te staan: ${k}`, boatDeck(k) === null);
check('een onbekende boot heeft geen dek', boatDeck('onderzeeer') === null);

// ------------------------------------------------------- vallen op het dek
{
  // van de kade het water in: de boot vangt je op zijn dek op
  const s = scene(SLOEP);
  s.p.perch = null;
  s.p.water = 'fall';
  s.p.z = 0.5;
  s.p.gz = 0;
  s.p.vz = 0;
  step(s, 90);
  const dek = WATER_Y + BOAT_DECK.sloep;
  check('de val van de kade komt op het dek neer', !!s.p.perch && s.p.perch.v === s.v, `perch=${!!s.p.perch}`);
  check('met de voeten op het dek', Math.abs(s.p.gz + s.p.z - dek) < 1e-9, `voeten=${(s.p.gz + s.p.z).toFixed(3)} dek=${dek.toFixed(3)}`);
  check('niet in het water', !s.p.water && !s.p.swimming);
  const x = s.p.x, y = s.p.y;
  step(s, 120);
  check('je blijft op het dek staan (het water neemt je niet mee)', !!s.p.perch && !s.p.water && Math.hypot(s.p.x - x, s.p.y - y) < 1e-9);
}

// ------------------------------------------------- Spatie op het dek en op een dak
{
  const s = scene(SLOEP);
  s.p.startPerch(s.world, s.v, 0, 0);
  step(s, 30);
  const dek = WATER_Y + BOAT_DECK.sloep;
  check('op het dek: je staat er', !!s.p.perch && Math.abs(s.p.gz + s.p.z - dek) < 1e-9);
  let top = dek;
  for (let i = 0; i < 40; i++) { step(s, 1, { space: i === 0 }); top = Math.max(top, s.p.gz + s.p.z); }
  check('Spatie op het dek is een afstapje, geen sprong', top - dek < 0.2, `stijging=${(top - dek).toFixed(3)}`);
}
{
  // hetzelfde op het dak van een auto: geen 2 m hoge sprong meer (#434)
  const s = scene(SEDAN, { water: false, at: 0 });
  s.p.startPerch(s.world, s.v, 0, 0);
  step(s, 30);
  const dak = vehicleHeight(s.v);
  let top = 0;
  for (let i = 0; i < 40; i++) { step(s, 1, { space: i === 0 }); top = Math.max(top, s.p.z); }
  check('op een autodak sta je op het dak', Math.abs(s.p.gz + s.p.z - dak) < 1e-9);
  check('Spatie op een autodak is een afstapje: hooguit 0,2 m erboven', top - dak < 0.2, `stijging=${(top - dak).toFixed(3)}`);
  check('en je komt weer op het dak neer', !!s.p.perch || s.p.z === 0);
}
{
  // een sprong op de grond blijft de gewone sprong (ongeveer 0,6 m)
  const s = scene(SEDAN, { water: false, at: 10 });
  let top = 0;
  for (let i = 0; i < 60; i++) { step(s, 1, { space: i === 0 }); top = Math.max(top, s.p.z); }
  check('op de grond spring je nog steeds ongeveer 0,6 m', top > 0.5 && top < 0.7, `top=${top.toFixed(3)}`);
}

// ------------------------------------------------------------- van het dek af
{
  const s = scene(SLOEP);
  s.p.startPerch(s.world, s.v, 0, 0);
  step(s, 30);
  s.world.camYaw = Math.PI / 2; // naar stuurboord het water in lopen
  let off = false;
  for (let i = 0; i < 240; i++) { step(s, 1, { fwd: true }); if (!s.p.perch && (s.p.water || s.p.swimming)) { off = true; break; } }
  check('van het dek af het water in: je valt en zwemt', off, `water=${s.p.water} swimming=${s.p.swimming} z=${s.p.z.toFixed(2)}`);
  check('de zwemmer rekent weer vanaf de straat (gz 0)', s.p.gz === 0);
}
{
  // een groot schip heeft geen dek om op te staan: geen perch
  const s = scene(SCHIP);
  s.p.water = 'fall';
  s.p.z = 0.5;
  s.p.gz = 0;
  s.p.vz = 0;
  step(s, 120);
  check('een binnenvaartschip heeft geen dek om op te vallen', !s.p.perch && !!s.p.water);
}

// --------------------------------------------------- het voertuig is solide
{
  // iemand die op de hoogte van het dek naast de romp staat wordt eruit geduwd
  const s = scene(SLOEP, { water: false, at: 0.2 });
  s.p.z = 0;
  s.p.gz = WATER_Y; // op het water, naast de romp
  s.p.resolveBodyContacts(1 / 60, s.world);
  const buiten = Math.abs(s.p.x) > s.v.halfLen || Math.abs(s.p.y) > s.v.halfWid;
  check('de romp is solide: je wordt eruit geduwd', buiten, `x=${s.p.x.toFixed(2)} y=${s.p.y.toFixed(2)}`);
}
{
  // wie op het dek staat wordt er niet af geduwd
  const s = scene(SLOEP);
  s.p.startPerch(s.world, s.v, 0, 0);
  const x = s.p.x, y = s.p.y;
  s.p.perch = null;
  s.p.update(1 / 60, s.world);
  check('op het dek duwt de romp je niet weg', Math.hypot(s.p.x - x, s.p.y - y) < 0.05, `dx=${(s.p.x - x).toFixed(3)}`);
}

console.log(fails ? `${fails} failed` : `all ${n} passed`);
process.exit(fails ? 1 : 0);
