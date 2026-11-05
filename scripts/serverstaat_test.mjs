// De wereldstaat van een koploze gastheer (#450, slice C): de pure serializer.
//   node scripts/serverstaat_test.mjs
import { vangStaat, herstelStaat, leesStaat, schrijfStaat, STAAT_VERSIE } from '../game/js/net/serverstaat.js';

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ` (${info})` : ''}`); } };

const world = { clock: 20.5, time: 1234.5, wanted: 2, weatherState: { kind: 'regen', t: 3 }, mission: { phase: 'active', id: 'M01' } };
const staat = vangStaat(world);
ok(staat.v === STAAT_VERSIE, 'versie');
ok(staat.clock === 20.5 && staat.time === 1234.5 && staat.wanted === 2, 'klok, tijd en wanted');
ok(staat.mission.phase === 'active' && staat.mission.id === 'M01', 'missie');
ok(staat.weatherState.kind === 'regen', 'weer');

const tekst = schrijfStaat(staat);
const terug = leesStaat(tekst);
ok(terug && terug.clock === 20.5, 'tekst heen en terug');

const w2 = {};
ok(herstelStaat(w2, terug) === true, 'herstel lukt');
ok(w2.clock === 20.5 && w2.time === 1234.5 && w2.wanted === 2, 'waarden teruggezet');
ok(w2.weatherState.kind === 'regen', 'weer teruggezet');
ok(w2.mission.phase === 'active' && w2.mission.id === 'M01', 'missie teruggezet');

ok(herstelStaat({}, null) === false, 'geen staat');
ok(herstelStaat({}, { v: 99 }) === false, 'verkeerde versie');
ok(leesStaat('{half') === null, 'kapotte tekst');
ok(leesStaat('') === null && leesStaat(null) === null, 'lege tekst');
ok(vangStaat(null).clock === 12 && vangStaat(null).mission.phase === 'idle', 'lege wereld krijgt veilige waarden');

const rommel = { v: STAAT_VERSIE, clock: 'x', time: NaN, wanted: null, weatherState: 'ja', mission: 5 };
const w3 = {};
herstelStaat(w3, rommel);
ok(w3.clock === undefined && w3.time === undefined && w3.weatherState === undefined && w3.mission === undefined, 'kapotte velden laten de wereld met rust');

console.log(bad ? `serverstaat_test: ${bad} van ${n} mislukt` : `serverstaat_test: ${n} controles ok`);
process.exit(bad ? 1 : 0);
