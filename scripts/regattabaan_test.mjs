// De regattabaan (regattabaan.js, #197): kiezen, vrij langs de omtrek, richttijd.
//   node scripts/regattabaan_test.mjs
import { kiesBaan, baanIsVrij, richtTijd, BAAN } from '../game/js/regattabaan.js';
import { createRegatta, stepRegatta, regattaMedaille } from '../game/js/zeilrules.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

const overal = () => true, nergens = () => false;
const b1 = kiesBaan(0, 0, overal);
check('open water: baan op de eerste kandidaat', b1 && b1.tonnen.length === BAAN.tonnen);
check('baan is vast', JSON.stringify(b1) === JSON.stringify(kiesBaan(0, 0, overal)));
check('geen water: geen baan', kiesBaan(0, 0, nergens) === null);
// alleen een meer van 400 m rond (1000, 0): de baan moet erin vallen
const meer = (x, y) => Math.hypot(x - 1000, y) < 200;
const b2 = kiesBaan(700, 0, meer);
check('meer: baan gevonden', !!b2);
check('meer: alle tonnen in het water', b2 && b2.tonnen.every((t) => meer(t.x, t.y)));
check('meer: omtrek vrij', b2 && baanIsVrij(b2.tonnen, meer));
check('ton op het land maakt de baan onvrij', !baanIsVrij(b1.tonnen, (x, y) => Math.hypot(x - b1.tonnen[0].x, y - b1.tonnen[0].y) > 3));
// een ton direct langs de kant (water alleen op de baan zelf) is geen goede baan
const smal = (x, y) => { const q = b1.tonnen[0]; return Math.hypot(x - q.x, y - q.y) < 5; };
check('ton zonder water eromheen is onvrij', !baanIsVrij(b1.tonnen, (x, y) => b1.tonnen.some((q) => Math.hypot(x - q.x, y - q.y) < 5) || (Math.abs(x) > 1e9)));
const tijd = richtTijd(b1.tonnen);
check('richttijd redelijk (2 tot 10 minuten)', tijd > 120 && tijd < 600, tijd);
// een hele regatta langs de tonnen geeft goud bij de richttijd
const r = createRegatta(b1.tonnen, { richttijd: tijd });
for (let ronde = 0; ronde < 2; ronde++) for (const t of b1.tonnen) stepRegatta(r, t.x, t.y, tijd / 8);
check('regatta uitgevaren', r.klaar && regattaMedaille(r) === 1, JSON.stringify([r.klaar, r.tijd, regattaMedaille(r)]));

console.log(bad ? `${bad} van ${n} mislukt` : `regattabaan_test ok (${n} checks)`);
process.exit(bad ? 1 : 0);
