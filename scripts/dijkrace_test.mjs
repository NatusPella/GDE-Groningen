// De straatrace van M14 (De dijk) als wedstrijd tegen elkaar (#443): de etappes op de dijk en de regel bij de
// wedstrijdlaag (multiplayerwedstrijd.js). De race zelf staat in missions.js (de race-tak van de opdracht).
//   node scripts/dijkrace_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';

const M = await import('../game/js/missions.js');
const W = await import('../game/js/multiplayerwedstrijd.js');

// ---- de etappes: de afstand tot de sluis verdeelt de dijk in even stukken
assert.deepEqual(M.dijkEtappe(8000, 8000), { cp: 0, s: 0, klaar: false }, 'bij de start nog geen etappe');
const halverwege = M.dijkEtappe(4000, 8000);
assert.equal(halverwege.cp, 3, 'halverwege de dijk: drie van zes');
assert.ok(halverwege.s >= 0 && halverwege.s < 1000, 'de meters binnen een etappe');
assert.equal(M.dijkEtappe(0, 8000).cp, 6, 'bij de sluis is de race klaar');
assert.equal(M.dijkEtappe(0, 8000).klaar, true);
assert.equal(M.dijkEtappe(19, 8000, 6, 18).klaar, false, 'de finish is de sluis zelf, niet eerder');
assert.equal(M.dijkEtappe(18, 8000, 6, 18).klaar, true);
let vorig = -1;
for (let af = 8200; af >= 0; af -= 50) {
  const e = M.dijkEtappe(af, 8000);
  assert.ok(e.cp >= vorig || e.klaar, `de etappe zakt niet (${af} m)`);
  assert.ok(e.cp >= 0 && e.cp <= 6 && e.s >= 0, `nette waarden bij ${af} m`);
  vorig = e.klaar ? 7 : e.cp;
}
assert.deepEqual(M.dijkEtappe(100, 0), { cp: 0, s: 0, klaar: false }, 'zonder baan geen etappe');

// ---- de wedstrijd bij de laag: een baanwedstrijd met een gezamenlijke start, geen rematch
const regel = W.WEDSTRIJDEN.get('dijkrace');
assert.ok(regel, 'de straatrace staat bij de wedstrijden');
assert.equal(regel.soort, 'baan', 'de straatrace loopt via de baanlaag');
assert.equal(regel.vak, 'race', 'de beloning telt voor het vak race');
assert.equal(regel.geenHerhaling, true, 'geen rematch: de race hoort bij een opdrachtstap');
const opties = regel.opties({});
assert.equal(opties.cps, 6);
assert.equal(opties.cpNaam, 'etappes');
assert.ok(opties.cap > 300 && opties.naEerste > 0, 'een tijdslimiet en tijd na de eerste');
assert.equal(regel.blok({}), 'Deze race hoort bij de opdracht De dijk.', 'buiten de opdracht start een gast hem niet');
assert.equal(regel.start({}, { baan: true, deeln: [] }), false, 'zonder de race-stap van de opdracht start hij niet');

// ---- samen: de etappes door de baanlaag, van de start tot de uitslag
const B = await import('../game/js/coopwedstrijdbaan.js');
const deeln = [{ slot: 0, naam: 'Tammo', char: 'tammo' }, { slot: 1, naam: 'Tessa', char: 'anita' }];
const sc = B.maakBaan('dijkrace', deeln, regel.opties({}));
const rij = (slot, af, tijd) => { const e = M.dijkEtappe(af, 8000, sc.cps, 18); return B.meldBaan(sc, slot, { cp: e.cp, s: e.s, klaar: e.klaar, tijd: e.klaar ? tijd : null }); };
let t = 0;
for (let af = 8000; af > 0; af -= 300) { t += 12; rij(0, af, t); rij(1, af + 500, t); B.tikBaan(sc, 12); }
rij(1, 0, t + 6);
const tussen = B.standBaan(sc);
assert.equal(tussen[0].slot, 1, 'wie dichter bij de sluis is staat bovenaan');
assert.ok(tussen[1].cp >= 5, 'de etappes lopen op');
rij(0, 0, t + 20);
const na = B.tikBaan(sc, 1);
assert.ok(na.some((e) => e.type === 'klaar') && sc.fase === 'klaar', 'de race is klaar als iedereen binnen is');
const uitslag = B.uitslagBaan(sc);
assert.equal(uitslag[0].slot, 1, 'de snelste tijd wint');
assert.equal(uitslag[0].fin, true);
assert.ok(uitslag[1].tekst.includes(':'), 'de uitslag toont de finishtijd');

console.log('dijkrace_test: 23 checks ok');
process.exit(0);
