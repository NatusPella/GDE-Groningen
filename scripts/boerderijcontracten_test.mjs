// De leveringscontracten van de boerderij (#492): het aanbod per speldag en het aannemen, leveren, afronden en verlopen
// (boerderijcontracten.js). Puur: geen DOM, THREE, klok, opslag of Math.random.
//   node scripts/boerderijcontracten_test.mjs
// De gewassen en hun basisprijs komen uit boerderij.js en gewasmarkt.js, zodat de test bewaakt dat er één bron blijft.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as C from '../game/js/boerderijcontracten.js';
import * as B from '../game/js/boerderij.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

const perGewas = (lijst, gewas) => lijst.filter((x) => x.gewas === gewas);
const opCenten = (x) => Math.round(x * 100) / 100;
const verse = (dag = 0, zaad = C.ZAAD) => C.leeg(zaad, dag);

t('het aanbod: één contract per gewas, met een ronde vracht, een uiterste tijd en een bonus per kilo', () => {
  const a = C.aanbod(3, 12345);
  assert.equal(a.length, B.GEWAS_IDS.length);
  assert.deepEqual(a.map((x) => x.gewas), B.GEWAS_IDS);
  assert.equal(new Set(a.map((x) => x.id)).size, a.length, 'elk contract heeft een eigen id');
  for (const x of a) {
    assert.ok(Number.isInteger(x.kg) && x.kg > 0, `${x.gewas}: kg ${x.kg}`);
    assert.equal(x.kg % 10, 0, `${x.gewas}: geen ronde vracht`);
    assert.ok(x.kg <= B.GEWASSEN[x.gewas].kgBasis, `${x.gewas}: meer dan een hele oogst`);
    assert.ok(x.deadlineUren >= C.MIN_UREN && x.deadlineUren <= C.MAX_UREN, `${x.gewas}: ${x.deadlineUren} uur`);
    assert.equal(x.deadlineUren, Math.round(x.deadlineUren), 'hele speluren');
    assert.ok(x.bonusPerKg > 0 && x.bonusPerKg < B.GEWASSEN[x.gewas].prijsKg, `${x.gewas}: bonus per kg ${x.bonusPerKg}`);
    assert.equal(x.bonusPerKg, opCenten(x.bonusPerKg), `${x.gewas}: bonus per kg niet op centen`);
    assert.equal(x.bonus, Math.round(x.kg * x.bonusPerKg), `${x.gewas}: het totaal is één keer afgerond`);
    assert.match(x.id, new RegExp(`^contract-3-${x.gewas}$`));
  }
});

t('het aanbod is deterministisch: dezelfde dag en hetzelfde zaad geven altijd hetzelfde, in elke volgorde', () => {
  const eerste = C.aanbod(7, 4242);
  assert.deepEqual(C.aanbod(7, 4242), eerste);
  assert.deepEqual(C.aanbod(7, 4242), JSON.parse(JSON.stringify(C.aanbod(7, 4242))));
  const tweede = C.GEWAS_IDS.map((g) => perGewas(C.aanbod(7, 4242), g)[0]).reverse();
  assert.deepEqual(tweede.reverse(), eerste);
});

t('de dag en het boerderijzaad veranderen het aanbod: elke speler en elke speldag heeft zijn eigen vracht', () => {
  // een andere dag: minstens één contract wijkt af, en over dertig dagen wisselt het merendeel
  const dag0 = C.aanbod(0, C.ZAAD);
  const dag1 = C.aanbod(1, C.ZAAD);
  assert.notDeepEqual(dag0, dag1);
  assert.notEqual(dag0[0].id, dag1[0].id, 'de id noemt de dag');
  let wissels = 0;
  for (let dag = 1; dag <= 30; dag++) {
    const nu = C.aanbod(dag, C.ZAAD), vorige = C.aanbod(dag - 1, C.ZAAD);
    B.GEWAS_IDS.forEach((g, i) => { if (nu[i].kg !== vorige[i].kg || nu[i].bonus !== vorige[i].bonus || nu[i].deadlineUren !== vorige[i].deadlineUren) wissels++; });
  }
  assert.ok(wissels >= 30 * B.GEWAS_IDS.length * 0.6, `${wissels} wissels in dertig dagen`);
  // een ander zaad: een andere boerderij vraagt andere vrachten
  assert.notDeepEqual(C.aanbod(5, 1), C.aanbod(5, 987654));
  // de uren lopen mee met de vracht: de kleinste en de grootste vracht krijgen niet dezelfde tijd
  const tijden = C.aanbod(9, 77).map((x) => x.deadlineUren);
  assert.ok(Math.max(...tijden) > Math.min(...tijden));
});

t('een onbekende, negatieve of kapotte dag of zaad valt terug op dag nul en het standaardzaad', () => {
  assert.deepEqual(C.aanbod(NaN, 'x'), C.aanbod(0, C.ZAAD));
  assert.deepEqual(C.aanbod(-5, -9), C.aanbod(0, 9));
  assert.deepEqual(C.aanbod(Infinity, undefined), C.aanbod(0, C.ZAAD));
  assert.deepEqual(C.aanbod(3.9, 12.7), C.aanbod(3, 12));
  assert.deepEqual(C.leeg().aanbod, C.aanbod(0, C.ZAAD));
  assert.deepEqual(C.leeg().actief, []);
  assert.deepEqual(C.leeg().historie, []);
  assert.equal(C.leeg(5, 2).dag, 2);
});

t('een nieuwe speldag: een nieuw aanbod, maar je lopende contracten en de historie blijven staan', () => {
  const s = verse(0);
  assert.equal(C.ververs(s, 0), false, 'dezelfde dag verandert niets');
  C.neemAan(s, s.aanbod[0].id, 10);
  assert.equal(C.ververs(s, 1), true);
  assert.equal(s.dag, 1);
  assert.equal(s.actief.length, 1);
  assert.deepEqual(s.aanbod, C.aanbod(1, C.ZAAD));
  assert.equal(C.ververs(s, 0), true, 'een sprong terug is ook een nieuwe dag');
  assert.deepEqual(s.aanbod, C.aanbod(0, C.ZAAD));
});

t('aannemen: de uiterste tijd begint nu te lopen, de vracht staat op nul, en hetzelfde contract kan maar één keer', () => {
  const s = verse(2);
  const a = s.aanbod.find((x) => x.gewas === 'bieten');
  const r = C.neemAan(s, a.id, 50);
  assert.equal(r.ok, true);
  assert.deepEqual(s.actief[0], { id: a.id, gewas: 'bieten', kg: a.kg, geleverd: 0, bonus: a.bonus, bonusPerKg: a.bonusPerKg, aangenomen: 50, deadline: 50 + a.deadlineUren });
  assert.equal(C.neemAan(s, a.id, 50).ok, false, 'niet twee keer hetzelfde contract');
  assert.match(C.neemAan(s, a.id, 50).reden, /loopt al/);
  assert.equal(C.neemAan(s, 'contract-2-graan', 50).ok, true, 'een ander gewas mag wel');
  assert.equal(C.neemAan(s, 'bestaatniet', 50).ok, false);
  assert.match(C.neemAan(s, 'bestaatniet', 50).reden, /staat er niet/);
  // een kapotte urenstand telt als nul
  const s2 = verse(0);
  assert.equal(C.neemAan(s2, s2.aanbod[0].id, NaN).contract.deadline, s2.aanbod[0].deadlineUren);
});

t('maximaal drie contracten tegelijk; de vierde wordt geweigerd en de knop kan dat laten zien', () => {
  const s = verse(4);
  for (const a of s.aanbod.slice(0, C.MAX_ACTIEF)) assert.equal(C.neemAan(s, a.id, 0).ok, true);
  assert.equal(s.actief.length, C.MAX_ACTIEF);
  const teveel = C.neemAan(s, s.aanbod[C.MAX_ACTIEF].id, 0);
  assert.equal(teveel.ok, false);
  assert.match(teveel.reden, /3 contracten/);
  assert.equal(s.actief.length, C.MAX_ACTIEF);
  // een afgerond contract maakt weer plek
  const c = s.actief[0];
  C.lever(s, c.gewas, c.kg, 0);
  assert.equal(C.neemAan(s, s.aanbod[C.MAX_ACTIEF].id, 0).ok, true);
});

t('deellevering: de kilo\'s tellen mee, maar de bonus komt pas als de vracht vol is', () => {
  const s = verse(1);
  const a = s.aanbod.find((x) => x.gewas === 'graan');
  C.neemAan(s, a.id, 0);
  const half = Math.floor(a.kg / 2);
  const een = C.lever(s, 'graan', half, 10);
  assert.equal(een.kg, half);
  assert.equal(een.bonus, 0);
  assert.deepEqual(een.afgerond, []);
  assert.equal(s.actief[0].geleverd, half);
  assert.equal(s.historie.length, 0);
  const twee = C.lever(s, 'graan', a.kg - half, 20);
  assert.equal(twee.kg, a.kg - half);
  assert.equal(twee.bonus, a.bonus);
  assert.equal(twee.afgerond.length, 1);
  assert.equal(twee.afgerond[0].resultaat, 'klaar');
  assert.equal(s.actief.length, 0);
  assert.equal(s.historie.length, 1);
  assert.equal(s.historie[0].geleverd, a.kg);
});

t('meer leveren dan gevraagd telt niet extra en betaalt de bonus maar één keer', () => {
  const s = verse(1);
  const a = s.aanbod.find((x) => x.gewas === 'aardappelen');
  C.neemAan(s, a.id, 0);
  const r = C.lever(s, 'aardappelen', a.kg * 3, 1);
  assert.equal(r.kg, a.kg, 'alleen de vracht van het contract telt');
  assert.equal(r.bonus, a.bonus);
  assert.equal(r.afgerond.length, 1);
  const nog = C.lever(s, 'aardappelen', a.kg, 2);
  assert.equal(nog.kg, 0, 'er loopt geen contract meer');
  assert.equal(nog.bonus, 0);
  assert.equal(s.historie.length, 1);
});

t('twee contracten van hetzelfde gewas: de oudste uiterste tijd krijgt eerst, daarna de volgende', () => {
  const s = verse(1);
  // twee contracten van hetzelfde gewas met een eigen vracht en deadline (de dag geeft er maar één per gewas)
  s.actief.push({ id: 'contract-1-bieten-a', gewas: 'bieten', kg: 100, geleverd: 0, bonus: 10, bonusPerKg: 0.1, aangenomen: 0, deadline: 30 });
  s.actief.push({ id: 'contract-1-bieten-b', gewas: 'bieten', kg: 200, geleverd: 0, bonus: 20, bonusPerKg: 0.1, aangenomen: 0, deadline: 60 });
  const r = C.lever(s, 'bieten', 250, 1);
  assert.equal(r.kg, 250);
  assert.equal(s.historie.length, 1);
  assert.equal(s.historie[0].id, 'contract-1-bieten-a');
  assert.equal(s.actief.length, 1);
  assert.equal(s.actief[0].geleverd, 150);
  assert.equal(r.bonus, 10);
});

t('verlopen: de vracht gaat naar de historie, de kilo\'s van daarna tellen niet meer mee en er gaat geen geld af', () => {
  const s = verse(1);
  const a = s.aanbod.find((x) => x.gewas === 'gras');
  const r = C.neemAan(s, a.id, 100);
  assert.equal(C.verval(s, r.contract.deadline - 1).verlopen.length, 0, 'nog niet te laat');
  const v = C.verval(s, r.contract.deadline);
  assert.equal(v.verlopen.length, 1);
  assert.equal(v.verlopen[0].resultaat, 'verlopen');
  assert.equal(s.actief.length, 0);
  assert.equal(s.historie[0].resultaat, 'verlopen');
  const na = C.lever(s, 'gras', a.kg, r.contract.deadline + 5);
  assert.equal(na.kg, 0);
  assert.equal(na.bonus, 0);
  // een contract dat net te laat is, telt ook niet mee als je vergeet te verversen
  const s2 = verse(1);
  const a2 = s2.aanbod[0];
  C.neemAan(s2, a2.id, 0);
  assert.equal(C.lever(s2, a2.gewas, a2.kg, a2.deadlineUren + 1).kg, 0);
  assert.equal(s2.actief.length, 1, 'leveren laat het verlopen contract met rust');
});

t('grenzen: geen kg, een onbekend gewas of geen contract levert niets op en gooit niet', () => {
  const s = verse(1);
  for (const kg of [0, -10, NaN, Infinity, undefined, 'veel']) {
    const r = C.lever(s, 'bieten', kg, 0);
    assert.equal(r.kg, 0, String(kg));
    assert.equal(r.bonus, 0);
  }
  const a = s.aanbod.find((x) => x.gewas === 'bieten');
  C.neemAan(s, a.id, 0);
  for (const gewas of ['tarwe', '', null, undefined, 7]) assert.equal(C.lever(s, gewas, 100, 0).kg, 0, String(gewas));
  assert.equal(C.lever(null, 'bieten', 100, 0).kg, 0);
  assert.deepEqual(C.verval(null, 100), { verlopen: [] });
  assert.equal(C.neemAan(null, a.id, 0).ok, false);
  assert.equal(s.actief[0].geleverd, 0, 'niets van de mislukte leveringen bleef hangen');
});

t('normalisatie: leeg, oud en kapot geven een geldige stand met het aanbod van die dag', () => {
  for (const raw of [null, undefined, '', '{', 'null', '[]', '7', true, 42]) {
    const s = C.normaliseer(raw, 5);
    assert.equal(s.dag, 5);
    assert.deepEqual(s.actief, []);
    assert.deepEqual(s.historie, []);
    assert.deepEqual(s.aanbod, C.aanbod(5, C.ZAAD));
  }
  const kapot = C.normaliseer({ zaad: 'x', actief: [{}, { id: 5 }, { id: 'a', gewas: 'tarwe', kg: 10 }, { id: 'b', gewas: 'bieten', kg: -5 }, { id: 'c', gewas: 'bieten', kg: 10, geleverd: 99, bonus: -3, deadline: 'x' }], historie: 'geen lijst' }, 2);
  assert.equal(kapot.actief.length, 1);
  assert.equal(kapot.actief[0].id, 'c');
  assert.equal(kapot.actief[0].geleverd, 10, 'meer geleverd dan gevraagd wordt de vracht');
  assert.equal(kapot.actief[0].bonus, 0);
  assert.equal(kapot.actief[0].deadline, 0);
  assert.deepEqual(kapot.historie, []);
  assert.equal(kapot.zaad, C.ZAAD, 'een kapot zaad valt terug op de standaard');
  // het bewaarde aanbod telt niet: het wordt uit de dag en het zaad opnieuw gemaakt
  const nep = C.normaliseer({ zaad: 99, dag: 2, aanbod: [{ id: 'gratis-geld', gewas: 'bieten', kg: 1, deadlineUren: 1, bonusPerKg: 999, bonus: 999 }], actief: [] }, 2);
  assert.deepEqual(nep.aanbod, C.aanbod(2, 99));
  assert.ok(!nep.aanbod.some((x) => x.id === 'gratis-geld'));
});

t('normalisatie is begrensd en stabiel: hooguit drie actieve contracten, een korte historie, en heen en terug hetzelfde', () => {
  const s = verse(3, 4711);
  for (const a of s.aanbod) C.neemAan(s, a.id, 0);
  const actief = s.actief.map((c) => ({ ...c }));
  const raw = { zaad: 4711, dag: 3, actief: [...actief, ...actief, ...actief], historie: Array.from({ length: 40 }, (_, i) => ({ ...actief[0], id: 'oud-' + i, resultaat: i % 2 ? 'klaar' : 'verlopen' })) };
  const schoon = C.normaliseer(raw, 3);
  assert.equal(schoon.actief.length, C.MAX_ACTIEF);
  assert.equal(new Set(schoon.actief.map((c) => c.id)).size, C.MAX_ACTIEF, 'geen dubbel contract');
  assert.equal(schoon.historie.length, C.MAX_HISTORIE);
  assert.equal(schoon.historie[schoon.historie.length - 1].id, 'oud-39', 'de nieuwste posten blijven');
  assert.equal(schoon.zaad, 4711);
  assert.deepEqual(C.normaliseer(JSON.parse(JSON.stringify(schoon)), 3), schoon);
  // een ronde door de boerderijstand heen blijft ook staan
  const b = B.nieuweBoerderij();
  b.uren = 24 * 3;
  b.contracten = schoon;
  assert.deepEqual(B.normaliseer(JSON.parse(JSON.stringify(b))).contracten, schoon);
});

t('het open aanbod: wat je aannam, afrondde of liet verlopen staat er niet meer als knop', () => {
  const s = verse(1);
  const [een, twee] = s.aanbod;
  assert.equal(C.openAanbod(s).length, C.GEWAS_IDS.length);
  C.neemAan(s, een.id, 0);
  assert.ok(!C.openAanbod(s).some((x) => x.id === een.id));
  C.lever(s, een.gewas, een.kg, 0);
  assert.ok(!C.openAanbod(s).some((x) => x.id === een.id), 'ook na het afronden niet opnieuw');
  C.neemAan(s, twee.id, 0);
  C.verval(s, twee.deadlineUren + 1);
  assert.ok(!C.openAanbod(s).some((x) => x.id === twee.id), 'en een verlopen contract komt niet terug');
});

t('geen klok, geen toeval en geen opslag in de regelmodule', () => {
  const src = fs.readFileSync(fileURLToPath(new URL('../game/js/boerderijcontracten.js', import.meta.url)), 'utf8');
  const code = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const verboden of ['Math.random', 'Date.now', 'performance.now', 'localStorage', 'THREE', 'document', 'window', 'setTimeout']) {
    assert.ok(!code.includes(verboden), `boerderijcontracten.js gebruikt ${verboden}`);
  }
});

console.log(`boerderijcontracten_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
