// Meegevoerd worden door een rijdend voertuig (#1023): wie op een dak staat, erft de verplaatsing en draaiing van het
// voertuig; een stilstaand voertuig geeft geen drift; een harde rem of een te hoge snelheid gooit je eraf.
//   node scripts/perchrijden_test.mjs
import './node3d.mjs';

const { Vehicle } = await import('../game/js/vehicle.js');
const { Player } = await import('../game/js/player.js');
const { vehicleHeight, perchThrown, perchCarryVelocity, PERCH_RIDE_MAX, PERCH_BRAKE_LIMIT } = await import('../game/js/vaultkit.js');

let n = 0, fails = 0;
const check = (name, ok, extra = '') => { n++; if (!ok) { fails++; console.log('FAIL', name, extra); } else console.log('ok  ', name); };

const SEDAN = { name: 'sedan', len: 4.4, wid: 1.8, maxSpeed: 15, accel: 3, brake: 6, turnRate: 1.5 };
const MAP = {
  waterNear: () => [], water: [], greenNear: () => [], buildingNear: () => [], buildingsNear: () => [], roadsNear: () => [], roads: [],
  propsNear: () => [], isOnBridge: () => false, coveredAt: () => false,
};
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
function scene() {
  const p = new Player(0, 0);
  p.angle = 0;
  const input = makeInput();
  const v = new Vehicle(0, 0, 0, SEDAN);
  const world = {
    input, map: MAP, vehicles: [v], time: 0, camYaw: 0, audioEvents: [], pedestrians: [], companion: null,
    health: 100, armor: 0, ammo: {}, weapon: null, particles: [], addMessage() {},
  };
  return { p, v, world, input };
}
function step(s, n = 1, keys = {}) {
  for (let i = 0; i < n; i++) {
    s.input.st.ay = 0;
    s.input.st.pressed = new Set(i === 0 && keys.space ? [' '] : []);
    s.p.update(1 / 60, s.world);
    s.world.time += 1 / 60;
  }
}
// het voertuig rijdt rechtdoor op v0 (zoals een AI-auto: de snelheid staat op het voertuig)
const rij = (s, v0, sec) => {
  for (let i = 0; i < sec * 60; i++) {
    s.v.speed = v0; s.v.x += Math.cos(s.v.angle) * v0 / 60; s.v.y += Math.sin(s.v.angle) * v0 / 60;
    step(s, 1);
  }
};

// stilstaand: geen drift
{
  const s = scene();
  s.p.startPerch(s.world, s.v, 0.5, 0.2);
  step(s, 5);
  const x = s.p.x, y = s.p.y;
  step(s, 120);
  check('een stilstaande auto: geen drift', !!s.p.perch && Math.hypot(s.p.x - x, s.p.y - y) < 1e-9);
}
// rijdend: je gaat mee
{
  const s = scene();
  s.p.startPerch(s.world, s.v, 0.5, 0.2);
  step(s, 5);
  const x0 = s.p.x - s.v.x;
  rij(s, 10, 3);
  check('10 m/s: je staat nog op het dak', !!s.p.perch && s.p.perch.v === s.v);
  check('en je bent 30 m meegevoerd', Math.abs(s.p.x - s.v.x - x0) < 1e-6 && s.v.x > 29, 'voertuig x=' + s.v.x.toFixed(2) + ' speler x=' + s.p.x.toFixed(2));
  check('zonder te zakken of op te springen', Math.abs(s.p.gz + s.p.z - vehicleHeight(s.v)) < 1e-9);
}
// draaiend: je draait mee
{
  const s = scene();
  s.p.startPerch(s.world, s.v, 1, 0);
  step(s, 5);
  for (let i = 0; i < 60; i++) {
    s.v.angle += 0.4 / 60; s.v.speed = 4;
    s.v.x += Math.cos(s.v.angle) * 4 / 60; s.v.y += Math.sin(s.v.angle) * 4 / 60;
    step(s, 1);
  }
  const ex = s.v.x + Math.cos(s.v.angle), ey = s.v.y + Math.sin(s.v.angle);
  const d = Math.hypot(s.p.x - ex, s.p.y - ey);
  check('een bocht: je blijft op dezelfde plek van het dak', !!s.p.perch && d < 0.02, 'afwijking=' + d.toFixed(3));
}
// te snel
{
  const s = scene();
  s.p.startPerch(s.world, s.v, 0, 0);
  step(s, 5);
  rij(s, PERCH_RIDE_MAX + 4, 0.5);
  check('boven de maximale snelheid word je eraf geworpen', !s.p.perch);
}
// abrupt remmen
{
  const s = scene();
  s.p.startPerch(s.world, s.v, 0, 0);
  step(s, 5);
  rij(s, 12, 1);
  check('voor de rem: nog op het dak', !!s.p.perch);
  s.v.speed = 2; step(s, 1);
  check('een abrupte stop gooit je eraf', !s.p.perch);
}
// een AI-auto die vanaf 3 m/s in een paar beelden stopt (een rij, een licht): je blijft staan (beeldcheck 24-11)
{
  const s = scene();
  s.p.startPerch(s.world, s.v, 0, 0);
  step(s, 5);
  rij(s, 3.2, 1);
  for (const v of [2.4, 1.6, 0.8, 0]) { s.v.speed = v; step(s, 1); }
  step(s, 30);
  check('een stop vanaf 3 m/s: nog op het dak', !!s.p.perch);
}
// verlaten van het dak (over de rand stappen) stopt het meevoeren
{
  const s = scene();
  s.p.startPerch(s.world, s.v, 0, 0);
  step(s, 5);
  rij(s, 8, 1);
  s.p.y += 3; // naast het dak: je stapt eraf (de plek op het dak klopt dan niet meer)
  step(s, 2);
  check('over de rand: je staat niet meer op het dak', !s.p.perch);
  const x = s.p.x;
  for (let i = 0; i < 120; i++) { s.v.speed = 8; s.v.x += 8 / 60; step(s, 1); }
  check('en het voertuig voert je niet meer mee', s.v.x - x > 10 && !s.p.perch, 'speler x=' + s.p.x.toFixed(2) + ' voertuig x=' + s.v.x.toFixed(2));
}
// de pure regels
check('perchThrown: rustig rijden is veilig', perchThrown({ speed: 10 }, 10, 1 / 60) === false);
check('perchThrown: een rem van 12 m/s2 gooit je eraf', perchThrown({ speed: 8 }, 8 + 12 / 60, 1 / 60) === true);
check('perchThrown: met weinig verlies (2 m/s) gooit dezelfde rem je er niet af', perchThrown({ speed: 8 }, 8 + 12 / 60, 1 / 60, 2) === false);
check('perchThrown: met veel verlies (5 m/s) wel', perchThrown({ speed: 8 }, 8 + 12 / 60, 1 / 60, 5) === true);
check('perchThrown: een rem net onder de grens niet', perchThrown({ speed: 8 }, 8 + (PERCH_BRAKE_LIMIT - 0.5) / 60, 1 / 60) === false);
check('perchThrown: een scherpe bocht op snelheid wel', perchThrown({ speed: 12, yawRate: 1.5 }, 12, 1 / 60) === true);
check('perchThrown: een scherpe bocht stapvoets niet', perchThrown({ speed: 3, yawRate: 1.5 }, 3, 1 / 60) === false);
{
  const a = perchCarryVelocity({ speed: 10, angle: 0, yawRate: 0 }, 1, 0.5);
  check('meeneemsnelheid recht vooruit', Math.abs(a.x - 10) < 1e-9 && Math.abs(a.y) < 1e-9);
  const b = perchCarryVelocity({ speed: 0, angle: 0, yawRate: 1 }, 2, 0);
  check('draaiing om het midden geeft zijwaartse snelheid', Math.abs(b.x) < 1e-9 && Math.abs(b.y - 2) < 1e-9);
}

console.log('perchrijden_test: ' + (n - fails) + '/' + n);
process.exit(fails ? 1 : 0);
