// Golven op zee en kielzog (#417): de golfhoogte groeit met kust en wind, het kielzog is een V achter snelle boten, kleine
// vaartuigen wiebelen en de speler valt nat (zonder schade) in het water bij een te grote golf.
//   node scripts/golven_test.mjs
import fs from 'node:fs';
import { windSterkte, seaExtraVoorWind, golfAmplitude, kielzogHoogte, kielzogOp, golfBelasting, golfWip, updateGolven, omvalDrempel } from '../game/js/golven.js';
import { KIELZOG_VELD_MAX, KIELZOG_VELD_REIK, KIELZOG_VELD_TOP, KIELZOG_VELD_HOEK, kielzogGolf, kielzogSterkte, bouwKielzogVeld, setKielzogVeld, kielzogVeld, veldHoogte, KIELZOG_GLSL } from '../game/js/kielzogveld.js';

let n = 0, bad = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

check('wind: windstil en storm liggen in 0..1', windSterkte(null) >= 0 && windSterkte({ intensity: 1, overcast: 1 }, 0) <= 1 && windSterkte({ intensity: 1 }, 0) > windSterkte({ intensity: 0 }, 0));
check('seaExtra groeit met de wind', seaExtraVoorWind(1) > seaExtraVoorWind(0) && seaExtraVoorWind(0) > 0);
check('kalm binnenwater: bij de kant geen extra golf', golfAmplitude(3, 1) === golfAmplitude(3, 0));
check('op zee hoger dan op het kanaal', golfAmplitude(24, 0.5) > 2 * golfAmplitude(6, 0.5));
check('meer wind, hogere golf', golfAmplitude(24, 1) > golfAmplitude(24, 0.2));
check('regen verhoogt de golf', golfAmplitude(24, 0.5, 1) > golfAmplitude(24, 0.5, 0));

const snel = { isBoat: true, x: 0, y: 0, angle: 0, speed: 9, model: { len: 8, kind: 'sloep' } };
check('geen kielzog voor de boot', kielzogHoogte(snel, 10, 0) === 0);
check('kielzog achter de boot', kielzogHoogte(snel, -8, 0) > 0.15);
check('kielzog buiten de V is nul', kielzogHoogte(snel, -8, 12) === 0);
check('kielzog dooft uit met de afstand', kielzogHoogte(snel, -6, 0) > kielzogHoogte(snel, -40, 0) && kielzogHoogte(snel, -80, 0) === 0);
check('langzame boot maakt geen kielzog', kielzogHoogte({ ...snel, speed: 2 }, -8, 0) === 0);
check('langere boot, hoger kielzog', kielzogHoogte({ ...snel, model: { len: 14 } }, -8, 0) > kielzogHoogte(snel, -8, 0));
check('kielzogOp slaat de boot zelf over', kielzogOp(snel, [snel]) === 0);

const sup = () => ({ id: 3, isBoat: true, x: -8, y: 0, angle: 0, speed: 0, model: { kind: 'sup', maxSpeed: 1.9, len: 3.2 }, driver: 'player' });
check('een supper slaat eerder om dan een kano', omvalDrempel(sup()) < omvalDrempel({ isBoat: true, model: { kind: 'kano' } }));
check('een sloep slaat niet om', omvalDrempel({ isBoat: true, model: { kind: 'sloep' } }) === Infinity);
check('zeegang telt zwaarder met vaart', golfBelasting({ speed: 1.9, model: { maxSpeed: 1.9 } }, 0, 0.3) > golfBelasting({ speed: 0, model: { maxSpeed: 1.9 } }, 0, 0.3));
check('golfWip is 0 voor een rustig vaartuig', golfWip({ id: 1 }, 5).roll === 0);

function wereld(extra = {}) {
  const msgs = [], parts = [];
  const speler = { x: -8, y: 0, inVehicle: null, ejected: 0, ejectIntoWater(v) { this.ejected++; this.inVehicle = null; v.driver = null; } };
  const w = { time: 100, vehicles: [], player: speler, particles: parts, addMessage: (t) => msgs.push(t), weather: { intensity: 0 }, ...extra };
  return { w, msgs, parts, speler };
}
{
  const { w, msgs, parts, speler } = wereld();
  const s = sup(); speler.inVehicle = s;
  w.vehicles.push(snel, s);
  let t = 0;
  while (t < 4 && speler.inVehicle) { updateGolven(w, 0.05); w.time += 0.05; t += 0.05; }
  check('de speler valt van de supper in het kielzog', speler.ejected === 1 && !speler.inVehicle, `ejected ${speler.ejected}`);
  check('de melding is Nederlands, zonder leed, met E', msgs.length >= 1 && /E om weer op te klimmen/.test(msgs[msgs.length - 1]));
  check('een plons laat zien dat de speler nat is', parts.some((p) => p.kind === 'splash'));
  check('de supper blijft drijven (stil)', s.speed === 0 && s._golf.genade > w.time);
  s.driver = 'player'; speler.inVehicle = s;
  for (let i = 0; i < 40; i++) { updateGolven(w, 0.05); w.time += 0.05; }
  check('na het terugklimmen is er even genade', speler.ejected === 1);
}
{
  const { w, speler } = wereld();
  const s = sup(); s.x = -8; s.y = 40; speler.inVehicle = s; speler.x = -8; speler.y = 40;
  w.vehicles.push(snel, s);
  for (let i = 0; i < 80; i++) { updateGolven(w, 0.05); w.time += 0.05; }
  check('buiten de V blijft de supper overeind', speler.ejected === 0);
}
for (const [regen, verwacht] of [[0, 0], [1, 1]]) {
  const { w, speler } = wereld({ weather: { intensity: regen, overcast: regen } });
  const s = sup(); s.speed = 1.9; s._shore = { open: true, d: 24 }; speler.inVehicle = s;
  w.vehicles.push(s);
  for (let i = 0; i < 400; i++) { updateGolven(w, 0.05); w.time += 0.05; }
  check(`zee met regen ${regen}: omvallen ${verwacht ? 'ja' : 'nee'}`, speler.ejected === verwacht, String(speler.ejected));
}
{
  const { w } = wereld();
  const leeg = { ...sup(), driver: null, driftX: 0, driftY: 0 };
  w.vehicles.push(snel, leeg);
  for (let i = 0; i < 20; i++) updateGolven(w, 0.05);
  check('een lege supper drijft weg in de richting van het kielzog', leeg.driftX > 0.05);
}
{
  const { w } = wereld();
  for (let i = 0; i < 300; i++) w.vehicles.push({ id: i, isBoat: true, x: (i % 30) * 20 - 300, y: Math.floor(i / 30) * 20 - 100, angle: i, speed: i % 3 ? 6 : 0, model: { kind: i % 2 ? 'sup' : 'sloep', len: 5, maxSpeed: 6 } });
  const t0 = performance.now();
  for (let i = 0; i < 500; i++) updateGolven(w, 0.016);
  const ms = (performance.now() - t0) / 500;
  const doelen = w.vehicles.filter((v) => v._golf).length;
  check('hooguit 6 doelen per frame', doelen <= 6, String(doelen));
  check('een frame kost minder dan 0,2 ms', ms < 0.2, ms.toFixed(3) + ' ms');
}
// Het golfveld (#417): het kielzog tilt het wateroppervlak zelf op, met een vaste vorm en een bovengrens; de shader
// (water3d.js) en de drijfkracht (waterSwellAt) lezen dezelfde formule uit kielzogveld.js.
{
  const boot = { x: 0, y: 0, cx: 1, cy: 0, sterkte: 0.2 };
  check('geen golf voor de boot', kielzogGolf(boot, 8, 0) === 0);
  check('golf achter de boot', kielzogGolf(boot, -6, 0) > 0.02);
  check('golf buiten de V is nul', kielzogGolf(boot, -6, 20) === 0);
  check('golf dooft uit met de afstand', kielzogGolf(boot, -4, 0) > kielzogGolf(boot, -40, 0));
  check('voorbij de reikwijdte is er niets', kielzogGolf(boot, -KIELZOG_VELD_REIK - 1, 0) === 0);
  check('harder varen, hogere golf', kielzogSterkte(11, 8) > kielzogSterkte(6, 8));
  check('langer schip, hogere golf', kielzogSterkte(9, 12) > kielzogSterkte(9, 4));
  check('de golf heeft een bovengrens', kielzogSterkte(80, 60) <= KIELZOG_VELD_TOP && kielzogSterkte(80, 60) > 0.1);

  const vlot = { id: 1, isBoat: true, x: 0, y: 0, angle: 0, speed: 9, model: { len: 8 } };
  const veld = bouwKielzogVeld([vlot, { ...vlot, id: 2, speed: 1 }, { ...vlot, id: 3, isBoat: false, speed: 9 }, { ...vlot, id: 4, x: 900, y: 0 }], 0, 0);
  check('alleen varende boten in de buurt komen in het veld', veld.length === 1 && veld[0].sterkte > 0);
  check('hooguit vier golven in het veld', bouwKielzogVeld(Array.from({ length: 12 }, (_, i) => ({ ...vlot, id: i })), 0, 0).length === KIELZOG_VELD_MAX);
  setKielzogVeld(Array.from({ length: 6 }, () => ({ x: 0, y: 0, cx: 1, cy: 0, sterkte: Math.min(KIELZOG_VELD_TOP, kielzogSterkte(9, 8)) })));
  check('opgetelde golven blijven onder de bovengrens', veldHoogte(-6, 0) > 0 && veldHoogte(-6, 0) <= KIELZOG_VELD_TOP + 1e-9, String(veldHoogte(-6, 0)));
  check('het veld is de bron voor deze frame', kielzogVeld().length === 6);
  setKielzogVeld(null);
  check('een leeg veld is vlak water', veldHoogte(-6, 0) === 0 && kielzogVeld().length === 0);

  const g = { w: { ...vlot, _golf: undefined }, s: sup() };
  const w2 = { time: 5, player: g.s, vehicles: [g.w, g.s], particles: [], addMessage: () => {}, weather: { intensity: 0 } };
  updateGolven(w2, 0.05);
  check('updateGolven zet het kielzog in het wateroppervlak', kielzogVeld().length === 1 && veldHoogte(-6, 0) > 0, String(kielzogVeld().length));
  setKielzogVeld(null);

  check('de shader gebruikt dezelfde getallen als de CPU', KIELZOG_GLSL.includes(KIELZOG_VELD_HOEK.toFixed(2)) && KIELZOG_GLSL.includes(KIELZOG_VELD_REIK.toFixed(2)) && KIELZOG_GLSL.includes(KIELZOG_VELD_TOP.toFixed(2)));
  const wsrc = fs.readFileSync(new URL('../game/js/water3d.js', import.meta.url), 'utf8');
  check('het wateroppervlak tilt op met het golfveld', /KIELZOG_GLSL/.test(wsrc) && /kielzogVeld\(wp0\.xz\)/.test(wsrc) && /veldHoogte\(x, z\)/.test(wsrc));
}
console.log(`golven_test: ${n - bad}/${n}`);
process.exit(bad ? 1 : 0);
