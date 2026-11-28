// Stadsstand per speler en thuisstanden (#1371, #1372): aangekondigd voor zichtbaar, nooit terug, tolerant lezen, per speler gescheiden.
// node scripts/citystate_test.mjs
import {
  VERANDERINGEN, THUISSTANDEN, readStad, checkStad, voorwaardeKlaar, zichtbareDressing, stadDagboek, thuisStand, thuisProps,
  loadStadSave, getStadSave, runStadCheck, MAX_AANKONDIGING_PER_KEER,
} from '../game/js/citystate.js';
import { STEPS } from '../game/js/storyarc.js';
import { VAK_IDS } from '../game/js/loopbaan.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const ids = STEPS.map((s) => s.id);

// de data
ok(new Set(VERANDERINGEN.map((v) => v.id)).size === VERANDERINGEN.length, 'elke verandering heeft een eigen id');
ok(VERANDERINGEN.every((v) => v.aankondiging && v.dagboek && v.kanaal && v.van && v.dressing), 'elke verandering heeft aankondiging, kanaal, afzender, dagboekregel en dressing');
const alleTriggers = (t) => (t.alle || t.een ? (t.alle || t.een).flatMap(alleTriggers) : [t]);
ok(VERANDERINGEN.every((v) => alleTriggers(v.trigger).every((t) => (t.naStap && ids.includes(t.naStap)) || (t.loopbaan && VAK_IDS.includes(t.loopbaan.vak) && t.loopbaan.niveau >= 2))), 'triggers verwijzen naar bestaande stappen en loopbanen');
ok(VERANDERINGEN.filter((v) => v.soort !== 'thuis' && alleTriggers(v.trigger).every((t) => t.naStap && ids.indexOf(t.naStap) <= ids.indexOf('M02'))).length >= 3, 'minstens drie veranderingen in het eerste uur');
ok(VERANDERINGEN.every((v) => !/winter|sneeuw|ijs/i.test(v.aankondiging + v.dagboek)), 'alles blijft zomers');
ok(VERANDERINGEN.every((v) => !('verwijdert' in v) && !('weg' in v)), 'een verandering neemt niets weg');

// tolerant lezen (oude save, kapotte save, nieuwere save)
const leeg = readStad(undefined);
ok(leeg.v === 1 && Object.keys(leeg.aangekondigd).length === 0 && thuisStand(undefined) === 1, 'een save zonder stad-veld leest als lege stand en thuisstand 1');
for (const slecht of [null, 5, 'kapot{', [], { aangekondigd: [1], doorgevoerd: 'x' }, { aangekondigd: { a: 'x', b: NaN } }]) ok(Object.keys(readStad(slecht).doorgevoerd).length === 0 && Object.keys(readStad(slecht).aangekondigd).length === 0, 'vreemde invoer geeft een lege stand', JSON.stringify(slecht));
const nieuwer = readStad({ v: 9, aangekondigd: { toekomst: 3 }, doorgevoerd: { toekomst: 4 } });
ok(nieuwer.doorgevoerd.toekomst === 4 && zichtbareDressing(nieuwer).length === 0, 'onbekende ids van een nieuwere versie blijven staan en breken niets');
ok(readStad({ doorgevoerd: { thuis_2: 3 } }).aangekondigd.thuis_2 === 3, 'een doorgevoerde verandering telt ook als aangekondigd');
const rondje = readStad({ aangekondigd: { thuis_2: 2 }, doorgevoerd: { thuis_2: 3 } });
ok(JSON.stringify(readStad(rondje)) === JSON.stringify(rondje), 'lezen is idempotent');

// voorwaarden
ok(!voorwaardeKlaar({ naStap: 'M01' }, { stapId: 'M01' }) && voorwaardeKlaar({ naStap: 'M01' }, { stapId: 'M02' }), 'naStap: pas voorbij die stap');
ok(!voorwaardeKlaar({ naStap: 'M01' }, {}) && !voorwaardeKlaar({ naStap: 'bestaat-niet' }, { stapId: 'M30' }), 'zonder stap of met onbekende stap: niet klaar');
ok(voorwaardeKlaar({ loopbaan: { vak: 'taxi', niveau: 2 } }, { niveaus: { taxi: 3 } }) && !voorwaardeKlaar({ loopbaan: { vak: 'taxi', niveau: 2 } }, { niveaus: { taxi: 1 } }), 'loopbaanrang');

// aangekondigd voor zichtbaar
let r = checkStad(null, { stapId: 'M01', dag: 1, moment: 'normaal' });
ok(r.aangekondigd.map((a) => a.id).join() === 'bankje_flatplein' && r.zichtbaar.length === 0, 'na M00 wordt het bankje aangekondigd, nog niet zichtbaar', r.aangekondigd.map((a) => a.id));
ok(r.aangekondigd[0].tekst && r.aangekondigd[0].kanaal === 'kaartje', 'de aankondiging heeft tekst en kanaal');
const st = r.state;
r = checkStad(st, { stapId: 'M01', dag: 1, moment: 'dagwissel' });
ok(r.zichtbaar.length === 0, 'dezelfde dag is een dagwissel nog geen doorvoering');
r = checkStad(st, { stapId: 'M01', dag: 1, moment: 'normaal' });
ok(r.aangekondigd.length === 0 && r.zichtbaar.length === 0, 'een aankondiging komt niet twee keer');
r = checkStad(st, { stapId: 'M01', dag: 2, moment: 'normaal' });
ok(r.zichtbaar.length === 0, 'zonder dagwissel of reis verandert er niets (geen pop-in)');
r = checkStad(st, { stapId: 'M01', dag: 2, moment: 'dagwissel' });
ok(r.zichtbaar.join() === 'bankje_flatplein', 'bij de volgende dagwissel wordt het zichtbaar');
ok(zichtbareDressing(r.state).map((d) => d.prop).join() === 'bankje', 'de wereld toont het bankje');
r = checkStad(st, { stapId: 'M01', dag: 1, moment: 'reis' });
ok(r.zichtbaar.join() === 'bankje_flatplein', 'een reis voert het ook door');
const invoer = JSON.stringify(st);
checkStad(st, { stapId: 'M02', dag: 3, moment: 'reis' });
ok(JSON.stringify(st) === invoer, 'de invoerstand blijft ongemoeid');

// nooit een stortvloed, nooit terug
r = checkStad(null, { stapId: 'M30', niveaus: { taxi: 6 }, dag: 5, moment: 'normaal' });
ok(r.aangekondigd.length === MAX_AANKONDIGING_PER_KEER, 'hoogstens twee aankondigingen per keer');
let alles = r.state;
for (let i = 1; i <= 10; i++) alles = checkStad(alles, { stapId: 'M30', niveaus: { taxi: 6 }, dag: 5 + i, moment: 'dagwissel' }).state;
ok(VERANDERINGEN.every((v) => v.id in alles.doorgevoerd), 'na genoeg dagen is alles aangekondigd en doorgevoerd');
const terug = checkStad(alles, { stapId: 'M00', niveaus: {}, dag: 30, moment: 'dagwissel' });
ok(JSON.stringify(terug.state) === JSON.stringify(alles) && thuisStand(terug.state) === 4, 'een lagere stap of rang draait niets terug');

// loopbaan en thuis
r = checkStad(null, { stapId: 'M00', niveaus: { taxi: 2 }, dag: 2, moment: 'normaal' });
ok(r.aangekondigd.some((a) => a.id === 'taxi_standplaats'), 'taxi niveau 2 kondigt de standplaats aan');
ok(thuisStand(r.state) === 1, 'aangekondigd is nog geen nieuwe thuisstand');
let t = checkStad(null, { stapId: 'M00', niveaus: { bezorg: 2 }, dag: 2, moment: 'normaal' }).state;
ok(t.aangekondigd.thuis_2 === 2 && thuisStand(t) === 1, 'de eerste mijlpaal kondigt thuisstand 2 aan, nog niet te zien');
t = checkStad(t, { stapId: 'M00', niveaus: { bezorg: 2 }, dag: 3, moment: 'dagwissel' }).state;
ok(thuisStand(t) === 2, 'na de dagwissel is de flat opgeknapt (stand 2)');
ok(THUISSTANDEN.length === 4 && THUISSTANDEN.every((s, i) => s.stand === i + 1 && s.props.length >= 3), 'vier thuisstanden met props');
const p1 = thuisProps(1), p2 = thuisProps(2);
ok(p1.every((x) => p2.includes(x)) && p2.length > p1.length, 'stand 2 houdt alles van stand 1 en voegt toe (bestaand bezit blijft staan)');
ok(p2.includes('foto_beppe') && p1.includes('gele_fiets') && p1.includes('bed'), 'de flat heeft bed en gele fiets, opgeknapt ook de foto van Beppe');
ok(THUISSTANDEN[2].eerstHuisBlijft && THUISSTANDEN[2].verplicht === false && THUISSTANDEN.every((s) => s.bezoekbaar), 'het nieuwe huis is niet verplicht en het eerste blijft bezoekbaar');
ok(thuisProps(0).join() === p1.join() && thuisProps(99).join() === thuisProps(4).join(), 'een vreemde stand wordt begrensd');

// per speler: twee spelers delen niets
const a = checkStad(null, { stapId: 'M02', dag: 1 }).state, b = readStad(undefined);
ok(Object.keys(a.aangekondigd).length > 0 && Object.keys(b.aangekondigd).length === 0, 'twee spelers hebben elk hun eigen stand');

// de lokale stand en de save
loadStadSave(undefined);
ok(Object.keys(getStadSave().aangekondigd).length === 0, 'een nieuw spel start leeg');
runStadCheck({ stapId: 'M02', dag: 1, moment: 'normaal' });
const bewaard = getStadSave();
ok(bewaard.aangekondigd.bankje_flatplein === 1, 'de lokale stand wordt bijgewerkt en bewaard');
loadStadSave(JSON.parse(JSON.stringify(bewaard)));
ok(JSON.stringify(getStadSave()) === JSON.stringify(bewaard), 'bewaren en laden geeft dezelfde stand');
ok(runStadCheck({ stapId: 'M02', dag: 1, moment: 'normaal' }).aangekondigd.length === 0, 'na laden komt een aankondiging niet opnieuw');
loadStadSave(undefined);
const dag = stadDagboek(checkStad(null, { stapId: 'M01', dag: 1 }).state);
ok(dag.length === 1 && dag[0].zichtbaar === false && dag[0].tekst, 'het dagboek bevat wat is aangekondigd');

console.log(`${n} controles, ${fails} fout`);
process.exit(fails ? 1 : 0);
