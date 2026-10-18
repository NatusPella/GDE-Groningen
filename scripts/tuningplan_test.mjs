// Onderdelen en tuning (game/js/tuningplan.js, #196): catalogus, prijzen, effecten, opslag.
import { PARTS, OPTIONS, optionsFor, optionById, tuningKind, sanitizeTuning, tuningEffects, installPrice, withOption, withoutPart, loadTuning, saveTuning, STORE_VERSION } from '../game/js/tuningplan.js';
import { BASE_KEYS } from '../game/js/storagekeys.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };

ok(BASE_KEYS.tuning === 'gde-tuning-v1', 'sleutel geregistreerd');
ok(new Set(OPTIONS.map((o) => o.id)).size === OPTIONS.length, 'unieke id\'s');
for (const o of OPTIONS) {
  ok(PARTS.includes(o.part) && o.price > 0 && o.price < 200 && o.kinds.length >= 1, 'geldige optie', o.id);
  const txt = o.label + ' ' + o.desc;
  ok(!/sneeuw|winter|vorst|\b(bmw|audi|shimano|bosch|pirelli|michelin|yamaha|honda|vespa)\b/i.test(txt), 'geen merken of winter', o.id);
  ok(!/de Grunn/i.test(txt), 'Grunn', o.id);
}
// elk onderdeel heeft opties voor tweewielers en voor auto's
for (const part of PARTS) for (const kind of ['tweewieler', 'auto']) ok(optionsFor(part, kind).length >= 2, 'keuze', `${part} ${kind}`);
// effecten blijven redelijk
for (const o of OPTIONS) for (const [k, v] of Object.entries(o.fx)) if (typeof v === 'number' && k !== 'opvallend') ok(v >= 0.7 && v <= 1.5, 'effect in bereik', `${o.id} ${k}`);
ok(tuningKind({ isBike: true }) === 'tweewieler' && tuningKind({ isScooter: true }) === 'tweewieler' && tuningKind({}) === 'auto' && tuningKind(null) === 'auto', 'tuningKind');

// opbouwen, inruilen, passen
let t = {};
const kind = 'tweewieler';
t = withOption(t, 'b-race', kind);
ok(t.banden === 'b-race', 'banden erop');
ok(withOption(t, 's-leer', kind) === null, 'autostoel past niet op een fiets');
ok(withOption(t, 'bestaat-niet', kind) === null, 'onbekende optie');
ok(installPrice(t, 'b-race') === null, 'al gemonteerd');
ok(installPrice(t, 'b-stad') === Math.max(0, optionById('b-stad').price - 30), 'inruil: helft van de oude', String(installPrice(t, 'b-stad')));
ok(installPrice({}, 'b-stad') === 18 && installPrice({}, 'xx') === null, 'prijs zonder oude');
t = withOption(t, 'u-knal', kind);
t = withOption(t, 'g-melodie', kind);
const fx = tuningEffects(t);
ok(fx.grip > 1.19 && fx.geluid === 1.5 && fx.claxon === 'melodie', 'effecten opgeteld', JSON.stringify(fx));
ok(fx.opvallend > 0.5 && fx.opvallend <= 1, 'opvallend gesommeerd en begrensd', String(fx.opvallend));
ok(JSON.stringify(tuningEffects({})) === JSON.stringify({ grip: 1, comfort: 1, zicht: 1, geluid: 1, gewicht: 1, opvallend: 0, claxon: null }), 'leeg = niets veranderd');
ok(!('uitlaat' in withoutPart(t, 'uitlaat')) && withoutPart(t, 'uitlaat').banden === 'b-race', 'onderdeel eraf');
// sanitize
ok(JSON.stringify(sanitizeTuning({ banden: 'b-race', uitlaat: 'b-race', stoel: 5, zzz: 'x' })) === '{"banden":"b-race"}', 'rommel eruit');
ok(Object.keys(sanitizeTuning({ stoel: 's-leer' }, 'tweewieler')).length === 0, 'niet-passend eruit');
ok(Object.keys(sanitizeTuning(null)).length === 0 && Object.keys(sanitizeTuning('x')).length === 0, 'null en string');

// opslag met een nepopslag
const mem = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, raw: m }; };
const st = mem();
ok(JSON.stringify(loadTuning(st, 'k')) === '{}', 'leeg laden');
ok(saveTuning(st, 'k', { hero: { banden: 'b-race', uitlaat: 'u-knal' }, fiets1: { geluid: 'g-bel' }, leeg: {} }), 'opslaan');
const back = loadTuning(st, 'k');
ok(back.hero.banden === 'b-race' && back.fiets1.geluid === 'g-bel' && !('leeg' in back), 'terug laden');
ok(JSON.parse(st.raw.k).versie === STORE_VERSION, 'versie in opslag');
st.raw.k = '{kapot';
ok(JSON.stringify(loadTuning(st, 'k')) === '{}', 'kapotte opslag geeft leeg');
st.raw.k = JSON.stringify({ versie: 99, voertuigen: { a: { banden: 'b-race' } } });
ok(JSON.stringify(loadTuning(st, 'k')) === '{}', 'onbekende versie geeft leeg');
st.raw.k = JSON.stringify({ versie: 1, voertuigen: { a: { banden: 'weg', stoel: 's-sport' } } });
ok(JSON.stringify(loadTuning(st, 'k')) === '{"a":{"stoel":"s-sport"}}', 'oude keuze die niet meer bestaat valt weg');
ok(loadTuning(null, 'k') && saveTuning(null, 'k', {}) === false, 'zonder opslag');
const boom = { getItem() { throw new Error('x'); }, setItem() { throw new Error('vol'); } };
ok(JSON.stringify(loadTuning(boom, 'k')) === '{}' && saveTuning(boom, 'k', { a: { banden: 'b-race' } }) === false, 'opslag die faalt');
// de save zelf blijft ongemoeid: de sleutel is geen onderdeel van ARC_KEYS (gde-tuning-v1 zonder -nieuw)
console.log(`tuningplan_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
