// Regels van de fotomodus (fotomodus.js, #199). Puur, geen browser.
//   node scripts/fotomodus_test.mjs
import * as F from '../game/js/fotomodus.js';
import { BASE_KEYS } from '../game/js/storagekeys.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

const p = F.createPhoto({ x: 100, y: 50, z: 1.7 }, 14.5);
check('start: nog niet actief, hud verborgen, wereld bevroren', !p.active && p.hideHud && p.frozen);
p.fov = 5; p.dof = 3; p.focus = 9999; p.cam.roll = 2; p.cam.pitch = 5; p.cam.z = -4;
F.clampPhoto(p);
check('clamp fov/dof/focus/roll/pitch/hoogte', p.fov === 20 && p.dof === 1 && p.focus === 200 && p.cam.roll === 0.5 && p.cam.pitch === 1.45 && p.cam.z === 0.3, JSON.stringify(p));

for (let i = 0; i < 400; i++) F.stepFreeCam(p, { fwd: 1, boost: true }, 0.1);
const d = Math.hypot(p.cam.x - 100, p.cam.y - 50);
check('vrije camera blijft binnen de straal', d <= F.LIMITS.roamRadius + 1e-6, d);
const q = F.createPhoto({ x: 0, y: 0 }, 12);
F.stepFreeCam(q, { fwd: 1 }, 1);
check('vooruit bij yaw 0 gaat in +y', q.cam.y > 0 && Math.abs(q.cam.x) < 1e-9);
F.stepFreeCam(q, { up: 1 }, 100);
check('hoogte begrensd', q.cam.z <= 60);

check('zeven filters, eerste is geen', F.FILTERS.length === 7 && F.FILTER_IDS[0] === 'geen');
F.setFilter(q, 'bestaatniet'); check('onbekend filter wordt geen', q.filter === 'geen');
F.cycleFilter(q, -1); check('cyclisch terug naar laatste', q.filter === F.FILTER_IDS[F.FILTER_IDS.length - 1]);
F.cycleFilter(q, 1); check('en weer vooruit', q.filter === 'geen' && F.filterCss(q) === 'none');
check('geen filter is winters', !F.FILTERS.some((f) => /sneeuw|winter|vorst|ijs/i.test(f.naam + f.id)));

const w0 = q.weather; F.cycleWeather(q, 1);
check('weer cyclisch: null -> helder', w0 === null && q.weather === 'helder');
F.cycleWeather(q, -1); F.cycleWeather(q, -1);
check('terug langs null naar onweer', q.weather === 'onweer');
check('zoals het is', F.weatherLabel(F.createPhoto()) === 'Zoals het is');
q.hour = -1; F.clampPhoto(q); check('uur wikkelt rond', q.hour === 23);
check('uurlabel', F.hourLabel(7.5) === '07:30' && F.hourLabel(24) === '00:00');

const r = F.createPhoto(); r.focus = 10;
check('geen dof geen waas', F.blurAt(r, 100) === 0);
r.dof = 1;
check('op focus scherp, ver weg waas', F.blurAt(r, 10) === 0 && F.blurAt(r, 100) > 0.5);
check('waas binnen 0..1', F.blurAt(r, 1e6) <= 1 && F.blurAt(r, 0.01) <= 1);

const mk = (i, extra = {}) => F.makeShot({ id: 's' + i, plaats: 'Groningen', dagLabel: 'Vr 14 aug', hour: 9, weather: 'helder', filter: 'zomer', ...extra });
let list = [];
for (let i = 0; i < 30; i++) list = F.addShot(list, mk(i));
check('galerij begrensd, nieuwste eerst', list.length === F.GALLERY.max && list[0].id === 's29');
list = F.addShot(list, mk(25));
check('zelfde id komt vooraan en niet dubbel', list[0].id === 's25' && list.filter((s) => s.id === 's25').length === 1);
check('verwijderen', F.removeShot(list, 's25').length === list.length - 1);
check('te grote thumb valt weg', mk(1, { thumb: 'data:image/jpeg;base64,' + 'A'.repeat(20000) }).thumb === '');
check('kleine thumb blijft', mk(1, { thumb: 'data:image/jpeg;base64,AAAA' }).thumb.length > 0);
check('geen javascript: als thumb', mk(1, { thumb: 'javascript:alert(1)' }).thumb === '');
check('onbekend filter/weer genormaliseerd', mk(1, { filter: 'x' }).filter === 'geen' && mk(1, { weather: 'sneeuw' }).weer === null);

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) }; };
const st = mem();
check('lege opslag geeft lege galerij', F.loadGallery(st).length === 0);
check('opslaan en laden', F.saveGallery(st, list) && F.loadGallery(st).length === list.length);
st.setItem(F.GALLERY.key, '{kapot');
check('kapotte opslag geeft lege galerij', F.loadGallery(st).length === 0);
check('geen opslag breekt niet', F.loadGallery(null).length === 0 && F.saveGallery(null, list) === false);
const full = { getItem: () => null, setItem(k, v) { if (v.includes('data:image')) throw new Error('vol'); this.last = v; } };
check('volle schijf: thumbs vallen weg', F.saveGallery(full, [mk(1, { thumb: 'data:image/jpeg;base64,AAAA' })]) && !full.last.includes('data:image'));
const never = { getItem: () => null, setItem() { throw new Error('vol'); } };
check('altijd vol geeft false zonder te crashen', F.saveGallery(never, list) === false);

check('opslagsleutel geregistreerd', BASE_KEYS.gallery === F.GALLERY.key);
check('bestandsnaam veilig', F.shotFileName('Zuidlaren / Ünï', 7) === 'gde-zuidlaren-uni-007.png' && F.shotFileName('', 1) === 'gde-groningen-001.png');

// terug bij de speler (#435): de vrije camera dwaalt, maar H brengt hem thuis
const thuis = F.createPhoto({ x: 5, y: 6, z: 2 }, 10);
F.stepFreeCam(thuis, { fwd: 1, up: 1 }, 2);
thuis.cam.yaw = 0.7; thuis.cam.pitch = 0.5; thuis.cam.roll = 0.3;
F.resetFreeCam(thuis);
check('reset: terug op de plek van de speler', thuis.cam.x === 5 && thuis.cam.y === 6 && thuis.cam.z === 5, JSON.stringify(thuis.cam));
check('reset: kijkt recht vooruit, zonder kanteling, zelfde richting', thuis.cam.pitch === 0 && thuis.cam.roll === 0 && thuis.cam.yaw === 0.7, JSON.stringify(thuis.cam));

console.log(bad ? `${bad} van ${n} mislukt` : `fotomodus_test ok (${n} checks)`);
process.exit(bad ? 1 : 0);
