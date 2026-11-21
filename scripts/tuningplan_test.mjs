// Onderdelen en tuning (game/js/tuningplan.js, #196): catalogus, prijzen, effecten, opslag.
import './node3d.mjs';
import { DRAAI_MIN, DRAAI_MAX, GRIP_MAX, PARTS, OPTIONS, optionsFor, optionById, tuningKind, sanitizeTuning, tuningEffects, installPrice, withOption, withoutPart, loadTuning, saveTuning, STORE_VERSION } from '../game/js/tuningplan.js';
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
for (const part of PARTS) for (const kind of ['tweewieler', 'auto']) ok(optionsFor(part, kind).length >= (part === 'ophanging' && kind === 'tweewieler' ? 1 : 2), 'keuze', `${part} ${kind}`);
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
ok(JSON.stringify(tuningEffects({})) === JSON.stringify({ grip: 1, comfort: 1, zicht: 1, geluid: 1, gewicht: 1, draai: 1, opvallend: 0, claxon: null }), 'leeg = niets veranderd');
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

// ophanging en de balansgrenzen (epic Autotuning #1155): comfort tegen draai, nooit een exploit
ok(PARTS.includes('ophanging') && optionsFor('ophanging', 'auto').length === 4 && optionsFor('ophanging', 'tweewieler').length === 2, 'ophanging: vier voor een auto, twee voor een tweewieler');
for (const o of optionsFor('ophanging', 'auto')) ok(o.fx.draai >= 0.9 && o.fx.draai <= 1.08 && o.fx.comfort >= 0.7 && o.fx.comfort <= 1.2, 'ophanging in bereik', o.id);
for (const o of optionsFor('ophanging', 'auto')) ok((o.fx.draai > 1) === (o.fx.comfort < 1), 'wie scherper draait levert comfort in', o.id);
ok(tuningEffects({ ophanging: 'h-laag' }).draai === 1.07 && tuningEffects({ ophanging: 'h-laag' }).comfort === 0.8, 'verlaagd onderstel: scherper en harder');
ok(tuningEffects({ ophanging: 'h-zacht' }).draai === 0.97, 'zachte vering: minder scherp');
// het beste wat je kunt bouwen blijft binnen de grenzen
const best = { banden: 'b-race', uitlaat: 'u-knal', stoel: 's-kuip', verlichting: 'l-fel', geluid: 'g-melodie', ophanging: 'h-laag' };
const fxBest = tuningEffects(best);
ok(fxBest.draai <= DRAAI_MAX && fxBest.grip <= GRIP_MAX && fxBest.draai >= DRAAI_MIN, 'de beste bouw blijft binnen de grenzen', JSON.stringify(fxBest));
// de grens zelf werkt, ook als er ooit een optie met een grotere factor komt
OPTIONS.push({ part: 'stoel', id: 'x-test', label: 'x', price: 1, kinds: ['auto'], fx: { grip: 3, draai: 2 }, desc: '' });
const fxHuge = tuningEffects({ stoel: 'x-test', banden: 'b-race' });
OPTIONS.pop();
ok(fxHuge.draai === DRAAI_MAX && fxHuge.grip === GRIP_MAX, 'draai en grip worden afgekapt', JSON.stringify(fxHuge));
// de draai komt in de rijhaak (vehicle/tuning.js maxYawRate) maar alleen voor de speler
const { maxYawRate } = await import('../game/js/vehicle/tuning.js');
const mk = (tuning, driver) => ({ model: { name: 'sedan', len: 4.4, wid: 1.8, turnRate: 3, maxSpeed: 30 }, speed: 25, driver, tuning });
const base = maxYawRate(mk(null, 'player')), laag = maxYawRate(mk(tuningEffects({ ophanging: 'h-laag' }), 'player')), zacht = maxYawRate(mk(tuningEffects({ ophanging: 'h-zacht' }), 'player'));
ok(laag > base && laag <= base * 1.08 + 1e-9, 'verlaagd draait scherper maar hoogstens 8%', `${base} ${laag}`);
ok(zacht < base, 'zachte vering draait minder scherp', `${base} ${zacht}`);
ok(maxYawRate(mk(tuningEffects({ ophanging: 'h-laag' }), 'ai')) === maxYawRate(mk(null, 'ai')), 'verkeer merkt niets van tuning');
console.log(`tuningplan_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
