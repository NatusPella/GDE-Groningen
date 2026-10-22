// De windaanwijzer op de minikaart (windmini.js, #399). Puur, geen browser.
//   node scripts/windmini_test.mjs
import { miniWind, windSterkte, windPijlHoek, windTekst } from '../game/js/windmini.js';
import { windOp, windHoek, weerWindVan, WIND, WEER_WIND_SNELHEID, wrap } from '../game/js/zeilrules.js';
import { windPijlGraden } from '../game/js/zeilvaren.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;
const deg = (d) => (d * Math.PI) / 180;

const boat = (extra = {}) => ({ isBoat: true, driver: 'player', model: { zeil: true }, ...extra });
const wereld = (v, extra = {}) => ({ player: { inVehicle: v }, ...extra });
const wind = { dir: 1.2, speed: 6 };

// alleen tijdens zeilen
check('te voet: geen windpijl', miniWind(wereld(null, { wind })) === null);
check('geen wereld of speler: geen windpijl', miniWind(null) === null && miniWind({}) === null);
check('in een auto: geen windpijl', miniWind(wereld({ isBoat: false, driver: 'player' }, { wind })) === null);
check('roeiboot: geen windpijl', miniWind(wereld(boat({ model: { soort: 'roeiboot' } }), { wind })) === null);
check('motorboot: geen windpijl', miniWind(wereld({ isBoat: true, driver: 'player', model: {} }, { wind })) === null);
check('zeilboot als passagier: geen windpijl', miniWind(wereld(boat({ driver: 'npc' }), { wind })) === null);

// zeilboot (open water en regatta): de wind van de zeilcode zelf
const w1 = miniWind(wereld(boat(), { wind }));
check('zeilboot: de wind uit world.wind', w1 && w1.van === wind.dir && w1.snelheid === wind.speed, JSON.stringify(w1));
check('zeilboot zonder wind: geen windpijl', miniWind(wereld(boat(), {})) === null && miniWind(wereld(boat(), { wind: { dir: NaN, speed: 4 } })) === null);

// skûtsje-sprint: het weer, alleen tijdens de sprint
const skutsje = { isBoat: true, driver: 'player', model: {}, sailTop: 6 };
const weer = { windAngle: 2.2 };
const w2 = miniWind(wereld(skutsje, { weather: weer, challenge: { id: 'skutsje' } }));
check('skûtsje: de wind van het weer, vandaan = hoek + 180°', w2 && near(w2.van, wrap(2.2 + Math.PI)) && w2.snelheid === WEER_WIND_SNELHEID, JSON.stringify(w2));
check('skûtsje zonder sprint (de boot blijft liggen): geen windpijl', miniWind(wereld(skutsje, { weather: weer })) === null && miniWind(wereld({ ...skutsje, sailTop: null }, { weather: weer, challenge: { id: 'skutsje' } })) === null);
check('andere uitdaging: geen windpijl', miniWind(wereld(skutsje, { weather: weer, challenge: { id: 'padel' } })) === null);
check('weerWindVan houdt zijn oude gedrag (hoek + π, zonder weer 0,4)', near(wrap(weerWindVan({ windAngle: 1 }) - (1 + Math.PI)), 0) && near(wrap(weerWindVan(null) - (0.4 + Math.PI)), 0));
check('de middensterkte ligt in het bereik van de zeilcode', WEER_WIND_SNELHEID > WIND.min && WEER_WIND_SNELHEID < WIND.max);

// sterkte: 1 tot 3 streepjes, groeit met de wind
check('zwakste wind: 1 streepje, t = 0', windSterkte(WIND.min).streepjes === 1 && windSterkte(WIND.min).t === 0);
check('sterkste wind: 3 streepjes, t = 1', windSterkte(WIND.max).streepjes === 3 && windSterkte(WIND.max).t === 1);
check('midden: 2 streepjes', windSterkte(5.5).streepjes === 2);
check('buiten het bereik wordt begrensd', windSterkte(0).t === 0 && windSterkte(30).t === 1);
let vorig = -1, mono = true;
for (let s = WIND.min; s <= WIND.max; s += 0.25) { const st = windSterkte(s); if (st.t < vorig || st.streepjes < 1 || st.streepjes > 3) mono = false; vorig = st.t; }
check('sterkte en streepjes nemen alleen toe met de wind', mono);
const seen = new Set();
for (let dag = 0; dag < 40; dag++) for (let uur = 0; uur < 24; uur += 1.5) seen.add(windSterkte(windOp(dag, uur).speed).streepjes);
check('de echte wind van dag en uur laat alle drie de streepjes zien', seen.size === 3, [...seen].join());

// richting: de pijl wijst waarheen de wind waait, op het scherm van de kaart
check('wind uit het oosten (0), kaart noord boven: de pijl wijst naar links (west)', near(Math.abs(windPijlHoek(0, 0)), Math.PI));
check('wind naar +x gedraaid (van = 180°): de pijl wijst naar rechts', near(windPijlHoek(Math.PI, 0), 0));
check('een gedraaide kaart draait de pijl mee', near(wrap(windPijlHoek(0.7, deg(90)) - windPijlHoek(0.7, 0)), deg(90)));
// de pijl op de kaart en de windwijzer van zeilvaren.js zeggen hetzelfde: gezien vanaf de boeg
let gelijk = true;
for (const heading of [0, 0.8, -2.1, 3]) for (const rot of [0, -1.1, 2.4]) for (const dir of [-3, -0.5, 1.4, 2.9]) {
  const w = { dir, speed: 5 };
  const opKaart = wrap(windPijlHoek(w.dir, rot) - (heading + rot)); // pijl ten opzichte van de boeg op het scherm
  if (!near(opKaart, wrap(windHoek(heading, w) + Math.PI))) gelijk = false;
}
check('pijl ten opzichte van de boeg = windHoek + 180° (zoals de windwijzer), voor elke kaartdraaiing', gelijk);
check('windwijzer: wind recht van voren wijst de pijl naar achter (180 graden)', near(windPijlGraden(0), 180));
check('windtekst: afgerond in m/s', windTekst(5.6) === '6 m/s' && windTekst(2) === '2 m/s');

console.log(bad ? `${bad} van ${n} mislukt` : `windmini_test ok (${n} checks)`);
process.exit(bad ? 1 : 0);
