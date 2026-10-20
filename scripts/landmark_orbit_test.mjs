// Het bereik van een gebouw voor de landmark-cinematic (#329).  node scripts/landmark_orbit_test.mjs
// De Forum-cirkel van 28 m liep dwars door het gebouw (85 m breed): buildingReach geeft de straal die erbuiten blijft.
import { buildingReach, roofAt } from '../game/js/camerapath.js';

let fails = 0;
const ok = (c, name, extra = '') => { if (!c) { fails++; console.log('FAIL', name, extra); } else console.log('ok  ', name); };

const rect = (x0, y0, x1, y1, h, extra = {}) => ({ bounds: [x0, y0, x1, y1], pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], h, ...extra });
// het Forum: 86 x 37 m, rond (357, 58)
const forum = rect(314, 39, 400, 76, 11, { landmark: true });
const shed = rect(500, 500, 510, 510, 2);
const map = { buildingsNear: (x, y, r) => [forum, shed].filter((b) => Math.hypot((b.bounds[0] + b.bounds[2]) / 2 - x, (b.bounds[1] + b.bounds[3]) / 2 - y) < r + 200) };

const r = buildingReach(map, 357, 58);
ok(r.reach > 43 && r.reach < 50, 'het Forum reikt ~47 m vanaf zijn punt', String(r.reach));
ok(r.top > 30, 'het dak van het Forum', String(r.top));
ok(roofAt(map, 357, 58) === r.top, 'roofAt en buildingReach zien hetzelfde dak');
ok(28 < r.reach, 'de oude baan van 28 m lag binnen het gebouw');

const none = buildingReach(map, 100, 100);
ok(none.reach === 0 && none.top === 0, 'op open grond geen bereik');

// een landmark-punt naast zijn gebouw (de toren staat op een puntje buiten de omtrek) telt binnen de marge
const tower = rect(200, 0, 214, 14, 25, { landmark: true });
const map2 = { buildingsNear: () => [tower] };
const t = buildingReach(map2, 216, 7);
ok(t.reach > 14 && t.reach < 22, 'een landmarkpunt tot 12 m naast het gebouw telt', String(t.reach));
ok(buildingReach(map2, 240, 7).reach === 0, 'verder dan de marge telt niet');

// een gewoon gebouw telt alleen als het punt erin ligt
const plain = rect(200, 0, 214, 14, 5);
ok(buildingReach({ buildingsNear: () => [plain] }, 216, 7).reach === 0, 'een gewoon gebouw naast het punt telt niet');
ok(buildingReach({ buildingsNear: () => [plain] }, 207, 7).reach > 0, 'een gewoon gebouw rond het punt telt wel');

// een toren op een lage, brede plint (de plaza eromheen is ook een "gebouw"): de toren bepaalt de baan, niet de plint
{
  const plint = rect(150, -40, 260, 60, 2);
  const toren = rect(205, 3, 219, 17, 26, { landmark: true });
  const r2 = buildingReach({ buildingsNear: () => [plint, toren] }, 212, 10);
  ok(r2.reach < 12, 'een lage plint onder een toren telt niet mee voor het bereik', String(r2.reach));
  ok(r2.top > 80, 'het dak is dat van de toren', String(r2.top));
  // een landmarkpunt naast twee grote landmarkgebouwen: alleen het dichtstbijzijnde telt
  const dichtbij = rect(218, 0, 230, 14, 8, { landmark: true });
  const groot = rect(150, -80, 213, 60, 8, { landmark: true });
  const r3 = buildingReach({ buildingsNear: () => [groot, dichtbij] }, 216, 7);
  ok(r3.reach < 25, 'naast twee landmarkgebouwen telt het dichtstbijzijnde', String(r3.reach));
}

console.log(fails ? `${fails} FAILED` : 'all ok');
process.exit(fails ? 1 : 0);
