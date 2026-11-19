// De regelkaart per missiestap (bouwsteen): declaratieve step.kaart -> doelkaart en daarna één regel tegelijk,
// pas wanneer ze nodig is, daarna stil; een stap zonder kaart (of met een kapotte) werkt ongewijzigd; elke speler
// heeft zijn eigen staat en er wordt niets geschreven buiten de kaartstaat.
//   node scripts/regelkaart_test.mjs
import './node3d.mjs';
const { kaartVan, startKaart, tikKaart, meldKaart, MAX_REGELS, DUUR_DOEL } = await import('../game/js/regelkaart.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const diep = (o) => { Object.freeze(o); for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) diep(v); return o; };
const woorden = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;

const stap = () => ({
  kind: 'goto', label: 'Breng de eieren naar Tinus',
  kaart: {
    doel: 'Breng de eieren heel naar Tinus', druk: 'drie minuten', afloop: 'alle eieren stuk: opnieuw',
    regels: [
      { type: 'limiet', inv: { waarde: 0, limiet: 40, label: 'Snelheid' } },
      { type: 'voorraad', inv: { heel: 60, totaal: 60, icoon: 'ei', label: 'Eieren' }, bij: 'eierstoot' },
      { type: 'teller', inv: { rest: 180, totaal: 180, label: 'Tijd' }, na: 30 },
    ],
  },
});

// zonder kaart, of met een kapotte kaart: niets
for (const s of [null, undefined, {}, { kaart: null }, { kaart: 'x' }, { kaart: {} }, { kaart: { regels: [] } },
  { kaart: { doel: '   ', regels: [{ type: 'nietbestaand' }, null, { type: 'limiet', inv: {} }] } }]) {
  ok(kaartVan(s) === null && startKaart(s, 'x') === null, 'een stap zonder bruikbare kaart geeft null', JSON.stringify(s));
}
ok(tikKaart(null, 1) === null, 'tikken zonder staat is veilig');

// normalisatie: invoer blijft heel, maximaal drie regels, getallen kapot -> regel valt weg
const inv = diep(stap());
const k = kaartVan(inv);
ok(k && k.doel === 'Breng de eieren heel naar Tinus' && k.regels.length === 3, 'drie regels uit de beschrijving');
ok(kaartVan({ kaart: { doel: 'd', regels: Array.from({ length: 7 }, () => ({ type: 'limiet', inv: { waarde: 1, limiet: 40 } })) } }).regels.length === MAX_REGELS, 'hoogstens drie regels');
const kapot = kaartVan({ kaart: { doel: 'd', regels: [{ type: 'limiet', inv: { waarde: NaN, limiet: NaN } }, { type: 'limiet', inv: { waarde: 5, limiet: 40 } }] } });
ok(kapot.regels.length === 1, 'een regel met NaN-invoer valt weg, de rest blijft');
ok(kaartVan({ kaart: { doel: 'd', regels: [{ type: 'limiet', inv: {}, tekst: 'Niet te snel rijden' }] } }).regels[0].zin === 'Niet te snel rijden', 'eigen tekst vervangt een kapotte invoer');
ok(k.regels.every((r) => r.zin && woorden(r.zin) < 16), 'elke regel is een korte zin');
ok(k.regels[1].na === Infinity && k.regels[1].bij === 'eierstoot', 'een regel met bij wacht op de melding');

// progressive disclosure: doel eerst, dan één regel tegelijk, pas wanneer nodig, daarna stil
function speel(staat, seconden, bijTijd = {}) {
  const log = [];
  for (let t = 0; t < seconden; t += 0.1) {
    for (const [sleutel, tt] of Object.entries(bijTijd)) if (Math.abs(tt - t) < 0.05) meldKaart(staat, sleutel);
    const spec = tikKaart(staat, 0.1);
    if (spec) log.push({ t: Math.round(t * 10) / 10 + 0.1, key: spec.key, kicker: spec.kicker, duration: spec.duration, spec });
  }
  return log;
}
const a = startKaart(inv, 'M09:0');
const log = speel(a, 120);
ok(log.length === 3, 'doel, limiet en teller; de eierregel wacht op zijn gebeurtenis', log.map((l) => l.key).join());
ok(log[0].kicker === 'Doel' && log[0].t <= 0.2, 'het doel komt meteen');
ok(/Tijd: drie minuten/.test(log[0].spec.body) && /Afloop: alle eieren stuk/.test(log[0].spec.body), 'tijdsdruk en afloop staan bij het doel');
ok(log[1].kicker === 'Regel' && log[1].t >= DUUR_DOEL, 'de eerste regel komt pas na het doel');
for (let i = 1; i < log.length; i++) ok(log[i].t >= log[i - 1].t + log[i - 1].duration - 0.15, 'nooit twee kaartjes tegelijk', `${i}`);
ok(log[2].t >= 30, 'een regel met na verschijnt niet eerder');
ok(a.klaar === false, 'een regel die op een gebeurtenis wacht houdt de kaart open');
// bij: de regel verschijnt na de melding, en nooit eerder
const b = startKaart(inv, 'M09:0');
const logB = speel(b, 60, { eierstoot: 12 });
const ei = logB.find((l) => /-1$/.test(l.key));
ok(ei && ei.t >= 12 && ei.t < 20, 'de eierregel komt bij de eierstoot', ei && String(ei.t));
ok(logB.every((l) => !/-1$/.test(l.key) || l.t >= 12), 'niet voor de melding');
ok(b.klaar === true, 'alles getoond: de kaart is stil');
ok(speel(b, 30).length === 0, 'stil blijft stil');
ok(tikKaart(b, 1) === null, 'ook na klaar geen kaart meer');
// zonder bij of na: de regels volgen elkaar
const c = startKaart({ kaart: { doel: 'd', regels: [1, 2, 3].map((i) => ({ type: 'limiet', inv: { waarde: i, limiet: 40 } })) } }, 'x');
const logC = speel(c, 60);
ok(logC.length === 4 && c.klaar, 'doel plus drie regels achter elkaar', String(logC.length));
ok(logC.every((l, i) => i === 0 || l.t >= logC[i - 1].t + logC[i - 1].duration - 0.15), 'de rij houdt de duur aan');
// een kaart zonder doel begint met zijn eerste regel
const d = startKaart({ kaart: { regels: [{ type: 'limiet', inv: { waarde: 1, limiet: 40 } }] } }, 'x');
const logD = speel(d, 30);
ok(logD.length === 1 && logD[0].kicker === 'Regel', 'zonder doel alleen de regel', JSON.stringify(logD.map((l) => l.key)));
// grote dt (een hapering) slaat geen regels over en geeft niet twee kaartjes
const e = startKaart(inv, 'x');
ok(tikKaart(e, 5) && !tikKaart(e, 5), 'een grote dt geeft niet twee kaartjes in één tik');
ok(Number.isFinite(e.t) && e.t <= 1.0, 'dt is begrensd');
ok(tikKaart(startKaart(inv, 'x'), NaN) !== undefined, 'NaN-dt crasht niet');

// Samen spelen: elke speler zijn eigen staat; de invoer blijft onaangeroerd
const p1 = startKaart(inv, 'M09:0'), p2 = startKaart(inv, 'M09:0');
speel(p1, 20);
ok(p1.t > 19 && p2.t === 0 && !p2.doelGetoond, 'twee spelers delen geen staat');
meldKaart(p1, 'eierstoot');
ok(!p2.bij.eierstoot, 'een melding bij de ene speler raakt de andere niet');
ok(Object.isFrozen(inv) && Object.isFrozen(inv.kaart.regels[0]), 'de beschrijving is niet gewijzigd (bevroren invoer werkte)');
ok(JSON.stringify(Object.keys(startKaart(inv, 'x')).sort()) === JSON.stringify(['bij', 'doelGetoond', 'getoond', 'id', 'kaart', 'klaar', 't', 'regelGetoond', 'vrijVanaf'].sort()), 'de staat bevat alleen kaartgegevens, niets van wereld of beloning');
ok(new Set(log.map((l) => l.key)).size === log.length, 'elke kaart een eigen sleutel');

console.log(`${n - fails}/${n} regelkaart`);
process.exit(fails ? 1 : 0);
