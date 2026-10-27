// Eigen boerderij (#415): het model (boerderij.js), het werk op het land (werkgang.js) en de haken (boerderijlive.js).
//   node scripts/boerderij_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject; localStorage bestaat in node niet.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as B from '../game/js/boerderij.js';
import * as GM from '../game/js/gewasmarkt.js';
import * as PC from '../game/js/percelen.js';
import * as W from '../game/js/werkgang.js';
import * as Live from '../game/js/boerderijlive.js';
import * as LL from '../game/js/loopbaanlive.js';
import { KEYS, BASE_KEYS } from '../game/js/storagekeys.js';

const JS = fileURLToPath(new URL('../game/js/', import.meta.url));
let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nepOpslag = (start = {}) => { const m = new Map(Object.entries(start)); return { m, log: [], getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { this.log.push(k); m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
const nepWereld = (money = 1000) => ({ money, clock: 8, time: 0, msgs: [], addMessage(x, d, o) { this.msgs.push({ x, o }); } });

// een speler die een rijtaak netjes rijdt
function werk(s, { speed = 4.5, across = 0, dt = 0.1 } = {}) {
  for (let r = 0; r < s.rijen && !s.klaar; r++) {
    const rij = s.rij;
    let along = -3;
    while (along <= s.len + 2 && s.rij === rij && !s.klaar) { const e = W.step(s, { along, across, speed }, dt); if (e.some((x) => x.type === 'fail')) return false; along += speed * dt; }
  }
  return s.klaar;
}
const doe = (b, taak, { speed = 4.5 } = {}) => {
  const s = W.init(taak, { eigen: b.machines[B.machineVoor(taak)] === 'eigen' });
  werk(s, { speed });
  return B.rondTaakAf(b, taak, W.fractie(s));
};

// ------------------------------------------------------------------ model
t('de tabellen: gewassen, machines en taken horen bij elkaar', () => {
  assert.deepEqual(B.GEWAS_IDS, ['aardappelen', 'bieten', 'graan', 'gras', 'uien']);
  assert.equal(B.MACHINE_IDS.length, 3);
  for (const g of Object.values(B.GEWASSEN)) { assert.ok(g.zaaigoed > 0 && g.groeiUren > 0 && g.kgBasis > 0 && g.prijsKg > 0 && g.afnemer && g.naam); assert.ok(['struik', 'kegel', 'halm'].includes(g.vorm), `${g.naam}: vorm ${g.vorm}`); }
  for (const taak of ['ploegen', 'zaaien', 'bemesten', 'oogsten']) { assert.ok(B.machineVoor(taak), taak); assert.ok(W.BAND[taak], taak); assert.ok(B.TAKEN[taak].rijen); }
  assert.equal(B.machineVoor('afleveren'), null);
  for (const m of Object.values(B.MACHINES)) assert.ok(m.koop > m.huur * 5, 'kopen loont pas na meerdere keren huren');
});

t('de levenscyclus: braak, ploegen, zaaien, groeien, oogsten, afleveren, braak', () => {
  const b = B.nieuweBoerderij();
  assert.equal(B.fase(b), 'braak'); assert.equal(B.volgendeTaak(b), 'ploegen');
  assert.deepEqual(B.opties(b), [{ taak: 'ploegen', verplicht: true }]);
  doe(b, 'ploegen');
  assert.equal(B.fase(b), 'geploegd'); assert.equal(B.volgendeTaak(b), 'zaaien'); assert.ok(b.veld.bodem > 0.95);
  doe(b, 'zaaien');
  assert.equal(B.fase(b), 'groeit'); assert.equal(b.veld.gewas, 'aardappelen');
  assert.deepEqual(B.opties(b).map((o) => o.taak), ['bemesten'], 'bemesten kan, oogsten nog niet');
  assert.equal(B.volgendeTaak(b), 'bemesten');
  assert.equal(B.magTaak(b, 'oogsten').ok, false);
  assert.match(B.magTaak(b, 'oogsten').reden, /groeit nog 30 uur/);
  B.tikUren(b, 29.5);
  assert.equal(B.fase(b), 'groeit'); assert.ok(B.groei(b) > 0.98 && B.groei(b) < 1);
  B.tikUren(b, 0.5);
  assert.equal(B.fase(b), 'rijp'); assert.equal(B.volgendeTaak(b), 'oogsten'); assert.equal(B.groei(b), 1);
  const o = doe(b, 'oogsten');
  assert.ok(o.kg > 1500 && o.kg <= 1800, String(o.kg));
  assert.equal(B.fase(b), 'braak'); assert.equal(b.schuur.kg, o.kg);
  assert.deepEqual(B.opties(b).map((x) => x.taak), ['afleveren', 'ploegen'], 'afleveren en alvast opnieuw ploegen');
  assert.equal(B.volgendeTaak(b), 'afleveren', 'eerst afleveren, dan pas opnieuw ploegen');
  const l = B.lever(b, 1);
  assert.equal(l.bedrag, Math.round(o.kg * GM.dagprijs('aardappelen', 1)), 'de dagprijs van speldag 1');
  assert.equal(b.schuur.kg, 0);
  assert.equal(b.totaal.oogsten, 1); assert.equal(b.totaal.leveringen, 1); assert.equal(b.totaal.omzet, l.bedrag);
});

t('het perceel kan niet in de verkeerde volgorde: zaaien op braak, oogsten onrijp, bemesten twee keer', () => {
  const b = B.nieuweBoerderij();
  assert.equal(B.magTaak(b, 'zaaien').ok, false); assert.equal(B.magTaak(b, 'oogsten').ok, false); assert.equal(B.magTaak(b, 'afleveren').ok, false);
  assert.equal(B.magTaak(b, 'bestaatniet').ok, false);
  doe(b, 'ploegen'); doe(b, 'zaaien'); doe(b, 'bemesten');
  assert.equal(B.magTaak(b, 'bemesten').ok, false, 'een keer bemesten is genoeg');
  assert.ok(b.veld.mest > 0.9);
});

t('een volle schuur: eerst afleveren, dan pas oogsten (een tweede oogst overschrijft de eerste niet)', () => {
  const b = B.nieuweBoerderij();
  doe(b, 'ploegen'); doe(b, 'zaaien'); B.tikUren(b, 100);
  b.schuur = { gewas: 'bieten', kg: 500, kwaliteit: 1 };
  assert.deepEqual(B.opties(b), [{ taak: 'afleveren', verplicht: true }]);
  assert.equal(B.magTaak(b, 'oogsten').ok, false); assert.equal(B.volgendeTaak(b), 'afleveren');
  B.lever(b, 1);
  assert.equal(B.volgendeTaak(b), 'oogsten');
});

t('een rondTaakAf in de verkeerde fase maakt geen onzin: zaaien zonder gewas, oogsten van niets', () => {
  const b = B.nieuweBoerderij();
  B.rondTaakAf(b, 'zaaien', 1, { gewas: 'bestaatniet' });
  assert.equal(B.fase(b), 'braak');
  const o = B.rondTaakAf(b, 'oogsten', 1);
  assert.equal(o.kg, 0); assert.equal(b.schuur.kg, 0);
});

t('de opbrengst volgt het werk: goed ploegen, zaaien en bemesten loont, slordig of overslaan niet', () => {
  const opbrengst = (ploeg, zaai, mest) => { const b = B.nieuweBoerderij(); B.rondTaakAf(b, 'ploegen', ploeg); B.rondTaakAf(b, 'zaaien', zaai); if (mest != null) B.rondTaakAf(b, 'bemesten', mest); B.tikUren(b, 100); return B.opbrengstKg(b); };
  const top = opbrengst(1, 1, 1), basis = opbrengst(1, 1, null), slordig = opbrengst(0.3, 0.3, null), niets = opbrengst(0, 0, null);
  assert.ok(top > basis && basis > slordig && slordig > niets && niets > 0);
  assert.ok(Math.abs(top / basis - 1.2) < 1e-9, 'volledig bemest is +20%');
  assert.equal(Math.round(basis), 1800);
  assert.equal(Math.round(niets), Math.round(1800 * 0.6 * 0.5));
});

t('de kosten: huur van de machine, nul voor een eigen machine, zaaigoed en mest', () => {
  const b = B.nieuweBoerderij();
  assert.deepEqual(B.kosten(b, 'ploegen'), { huur: 15, materiaal: 0, totaal: 15 });
  assert.deepEqual(B.kosten(b, 'zaaien'), { huur: 10, materiaal: 40, totaal: 50 });
  assert.deepEqual(B.kosten(b, 'zaaien', 'bieten'), { huur: 10, materiaal: 30, totaal: 40 });
  assert.deepEqual(B.kosten(b, 'bemesten'), { huur: 10, materiaal: 25, totaal: 35 });
  assert.deepEqual(B.kosten(b, 'afleveren'), { huur: 0, materiaal: 0, totaal: 0 });
  assert.equal(B.koop(b, 'ploeg', 500).ok, true);
  assert.equal(B.kosten(b, 'ploegen').totaal, 0);
  assert.equal(B.kosten(b, 'zaaien').huur, 10, 'een andere machine blijft huur');
});

t('machines kopen: te weinig geld, al van jou, onbekend', () => {
  const b = B.nieuweBoerderij();
  assert.equal(B.koop(b, 'rooier', 599).ok, false); assert.equal(b.machines.rooier, 'huur');
  assert.equal(B.koop(b, 'rooier', 600).ok, true); assert.equal(b.machines.rooier, 'eigen'); assert.equal(b.totaal.uitgaven, 600);
  assert.equal(B.koop(b, 'rooier', 9999).ok, false);
  assert.equal(B.koop(b, 'bestaatniet', 9999).ok, false);
  assert.equal(B.koop(b, 'ploeg', NaN).ok, false);
});

t('lever: de kwaliteit van de rit telt, een lege schuur levert niets, het bedrag is nooit negatief', () => {
  const b = B.nieuweBoerderij();
  assert.deepEqual(B.lever(b, 1), { bedrag: 0, kg: 0, gewas: null });
  b.schuur = { gewas: 'bieten', kg: 4000, kwaliteit: 1 };
  assert.equal(B.lever(b, 0.5).bedrag, 200);
  b.schuur = { gewas: 'bieten', kg: 4000, kwaliteit: 1 };
  assert.equal(B.lever(b, 7).bedrag, 400);
  assert.equal(B.lever(B.nieuweBoerderij(), -3).bedrag, 0);
  b.schuur = { gewas: 'bieten', kg: 4000, kwaliteit: 1 };
  assert.equal(B.lever(b, NaN).bedrag, 0);
});

t('de dagprijs: leveren gaat tegen de prijs van de speldag uit b.uren, en de basis blijft de terugval', () => {
  const b = B.nieuweBoerderij();
  b.schuur = { gewas: 'bieten', kg: 10000, kwaliteit: 1 };
  const dag0 = B.lever(b, 1);
  assert.equal(dag0.dag, 0); assert.equal(dag0.prijs, B.GEWASSEN.bieten.prijsKg); assert.equal(dag0.bedrag, 1000);
  b.uren = 4 * 24 + 5;                                                    // speldag 4, ook al is het pas vijf uur
  b.schuur = { gewas: 'bieten', kg: 10000, kwaliteit: 1 };
  const dag4 = B.lever(b, 1);
  assert.equal(dag4.dag, 4); assert.equal(dag4.prijs, GM.dagprijs('bieten', 4));
  assert.notEqual(dag4.prijs, B.GEWASSEN.bieten.prijsKg, 'de dagprijs wijkt af van de basis');
  assert.equal(dag4.bedrag, Math.round(10000 * GM.dagprijs('bieten', 4)));
  // een onbekend gewas of een kapotte vracht levert niets op, ook niet met een dagprijs
  assert.deepEqual(B.leverVracht(b, { gewas: 'tarwe', kg: 100, kwaliteit: 1 }, 1), { bedrag: 0, kg: 0, gewas: null });
  assert.deepEqual(B.leverVracht(b, { gewas: 'bieten', kg: 0, kwaliteit: 1 }, 1), { bedrag: 0, kg: 0, gewas: null });
});

t('de markt in de samenvatting: de dag van de boerderij en per gewas de prijs en de trend', () => {
  const b = B.nieuweBoerderij();
  const s0 = B.samenvatting(b);
  assert.equal(s0.dag, 0);
  for (const id of B.GEWAS_IDS) { assert.equal(s0.prijzen[id].prijs, B.GEWASSEN[id].prijsKg); assert.equal(s0.prijzen[id].trend, 'gelijk'); }
  b.uren = 24 * 3;
  const s3 = B.samenvatting(b);
  assert.equal(s3.dag, 3);
  for (const id of B.GEWAS_IDS) {
    const m = GM.markt(id, 3);
    assert.equal(s3.prijzen[id].prijs, m.prijs); assert.equal(s3.prijzen[id].trend, m.trend);
    assert.ok(['op', 'neer', 'gelijk'].includes(m.trend));
  }
  // per speler: twee boerderijen op dezelfde dag hebben dezelfde prijs, ook met andere uren erin
  const ander = B.nieuweBoerderij(); ander.uren = 24 * 3 + 11;
  assert.deepEqual(B.samenvatting(ander).prijzen, s3.prijzen);
});

t('de economie: een volle ronde van een perceel levert meer op dan ze kost, en de winst blijft in de buurt van een bijbaan', () => {
  for (const gewas of B.GEWAS_IDS.filter((g) => B.GEWASSEN[g].soort === 'akker')) {
    const b = B.nieuweBoerderij();
    B.kiesGewas(b, gewas);
    let kosten = 0;
    for (const taak of ['ploegen', 'zaaien', 'bemesten']) { kosten += B.kosten(b, taak, gewas).totaal; doe(b, taak); }
    B.tikUren(b, 100);
    kosten += B.kosten(b, 'oogsten').totaal;
    const o = doe(b, 'oogsten');
    const bedrag = B.lever(b, 1).bedrag;
    assert.ok(bedrag > kosten * 3, `${gewas}: ${bedrag} tegen ${kosten}`);
    const winst = bedrag - kosten;
    // een ronde werk duurt ruim tien minuten: de winst per uur blijft bij de bijbanen (ongeveer 1500 tot 3000 euro per uur)
    assert.ok(winst * 6 >= 1000 && winst * 6 <= 4000, `${gewas}: winst ${winst} per ronde van tien minuten, ${winst * 6} per uur`);
    assert.ok(o.kg > 0);
  }
});

t('normaliseer: leeg, oud en kapot geven een geldige boerderij; onzin gaat weg; heen en terug is stabiel', () => {
  for (const raw of [null, undefined, '', '{', 'null', '[]', '7', { v: 2 }, { v: 1, veld: 5 }, true]) {
    const b = B.normaliseer(raw);
    assert.equal(b.v, 1); assert.equal(B.fase(b), 'braak'); assert.equal(b.perceel, null); assert.equal(b.uren, 0);
  }
  const b = B.normaliseer(JSON.stringify({ v: 1, uren: -5, perceel: { x: 10, y: 'a' }, keuze: 'tarwe', veld: { fase: 'gezaaid', gewas: 'bieten', gezaaidOp: 3, bodem: 5, zaai: -1, mest: 'x' }, schuur: { gewas: 'bestaatniet', kg: 9 }, machines: { ploeg: 'eigen', rooier: 'gestolen', onbekend: 'eigen' }, totaal: { omzet: 12.7, uitgaven: 'veel' }, rommel: 1 }));
  assert.equal(b.uren, 0); assert.equal(b.perceel, null); assert.deepEqual(b.plan, {}, 'een onbekende keuze geeft geen plan');
  assert.equal(b.veld.fase, 'gezaaid'); assert.equal(b.veld.bodem, 1); assert.equal(b.veld.zaai, 0); assert.equal(b.veld.mest, 0);
  assert.equal(b.schuur.kg, 0); assert.deepEqual(b.machines, { ploeg: 'eigen', zaaimachine: 'huur', rooier: 'huur' });
  assert.equal(b.totaal.omzet, 13); assert.equal(b.totaal.uitgaven, 0); assert.ok(!('rommel' in b));
  const goed = B.normaliseer({ v: 1, uren: 50, perceel: { x: 1, y: 2, a: 0.5 }, keuze: 'bieten', veld: { fase: 'gezaaid', gewas: 'bieten', gezaaidOp: 10, bodem: 0.9, zaai: 0.8, mest: 0.5 }, schuur: { gewas: 'bieten', kg: 300, kwaliteit: 0.8 } });
  assert.deepEqual(B.normaliseer(JSON.parse(JSON.stringify(goed))), goed);
  assert.equal(B.fase(goed), 'groeit', '40 uur van 48');
  assert.ok(!('markt' in goed) && !('prijzen' in goed), 'de markt wordt niet in de boerderij bewaard');
  assert.ok(!('markt' in B.normaliseer({ v: 1, markt: { dag: 9, prijzen: {} } })), 'een oud of vreemd marktveld gaat weg');
});

t('een gezaaid veld zonder gewas of zaaitijd wordt braak (een beschadigde opslag zet geen rijp gewas neer)', () => {
  assert.equal(B.fase(B.normaliseer({ v: 1, veld: { fase: 'gezaaid', gewas: null, gezaaidOp: 5 } })), 'braak');
  assert.equal(B.fase(B.normaliseer({ v: 1, veld: { fase: 'gezaaid', gewas: 'bieten' } })), 'braak');
});

t('tikUren: negatief, NaN en oneindig doen niets; groei is begrensd', () => {
  const b = B.nieuweBoerderij();
  for (const x of [-5, NaN, Infinity, undefined, 'x']) B.tikUren(b, x);
  assert.ok(b.uren <= B.MAX_UREN && b.uren >= 0);
  B.rondTaakAf(b, 'ploegen', 1); B.rondTaakAf(b, 'zaaien', 1);
  B.tikUren(b, 1e9);
  assert.equal(B.groei(b), 1); assert.equal(B.urenTotRijp(b), 0);
});

// ------------------------------------------------------------------ teeltplan per perceel (#492)
t('het teeltplan: elk perceel een eigen gewas voor het volgende zaaien; wisselen overschrijft een ander plan niet', () => {
  const b = B.nieuweBoerderij();
  assert.equal(B.actiefGewas(b), 'aardappelen', 'zonder plan geldt de standaard van de akker');
  assert.deepEqual(b.plan, {});
  assert.equal(B.kiesGewas(b, 'bieten'), true);
  assert.equal(B.actiefGewas(b), 'bieten');
  assert.equal(B.kiesGewas(b, 'tarwe'), false);
  assert.equal(B.kiesGewas(b, 'gras'), true);
  assert.equal(B.actiefGewas(b), 'aardappelen', 'gras past niet op een akker: de standaard van de grond');
  assert.equal(B.kiesGewas(b, 'bieten'), true);
  // een tweede akker kopen en daar werken
  assert.equal(PC.koop(b.bedrijf, 'perceel', 'wierdeakker', 1e6).ok, true);
  assert.equal(PC.zetActief(b.bedrijf, 'wierdeakker'), true);
  assert.equal(B.syncVeld(b), true);
  assert.equal(B.actiefGewas(b), 'aardappelen', 'een nieuw perceel begint met de standaard');
  assert.equal(B.kiesGewas(b, 'uien'), true);
  assert.equal(B.actiefGewas(b), 'uien');
  assert.deepEqual(B.veldenOverzicht(b).map((v) => [v.id, v.plan]), [[PC.START_PERCEEL, 'bieten'], ['wierdeakker', 'uien']]);
  assert.equal(B.planVoor(b, PC.START_PERCEEL), 'bieten');
  // terug naar de Zonnehoek: het plan van de Wierdeakker blijft staan
  assert.equal(PC.zetActief(b.bedrijf, PC.START_PERCEEL), true);
  B.syncVeld(b);
  assert.equal(B.actiefGewas(b), 'bieten');
  assert.equal(B.planVoor(b, 'wierdeakker'), 'uien');
  // op een weiland is het plan gras, ook als je een akkerbouwgewas kiest
  assert.equal(PC.huur(b.bedrijf, 'perceel', 'dijkweide', 'dag', 0, 1e6).ok, true);
  PC.zetActief(b.bedrijf, 'dijkweide'); B.syncVeld(b);
  assert.equal(B.actiefGewas(b), 'gras');
  B.kiesGewas(b, 'bieten');
  assert.equal(B.actiefGewas(b), 'gras');
  // zaaien zaait het plan van het perceel waar je werkt
  doe(b, 'ploegen');
  assert.equal(doe(b, 'zaaien').gewas, 'gras');
  assert.equal(b.veld.gewas, 'gras');
  assert.equal(B.planVoor(b, PC.START_PERCEEL), 'bieten', 'de Zonnehoek houdt zijn eigen plan');
});

t('een oude opslag met alleen keuze migreert naar het actieve perceel, zonder nieuwe opslagsleutel', () => {
  const b = B.normaliseer({ v: 1, uren: 30, keuze: 'bieten', veld: { fase: 'braak' } });
  assert.deepEqual(b.plan, { [PC.START_PERCEEL]: 'bieten' });
  assert.equal(B.actiefGewas(b), 'bieten');
  assert.ok(!('keuze' in b), 'het plan is de enige bron; de oude keuze gaat weg');
  assert.deepEqual(B.normaliseer(JSON.parse(JSON.stringify(b))), b, 'heen en terug is stabiel');
  // de oude keuze hoort bij het perceel waar de boerderij werkte, niet bij de Zonnehoek
  const c = B.normaliseer({ v: 1, keuze: 'graan', bedrijf: { v: 1, percelen: { [PC.START_PERCEEL]: { status: 'gekocht', sinds: 0 }, wierdeakker: { status: 'gekocht', sinds: 0 } }, actief: 'wierdeakker' } });
  assert.deepEqual(c.plan, { wierdeakker: 'graan' });
  assert.equal(B.actiefGewas(c), 'graan');
  // een keuze die niet bij de grond past wordt de standaard van die grond
  assert.deepEqual(B.normaliseer({ v: 1, keuze: 'gras' }).plan, { [PC.START_PERCEEL]: 'aardappelen' });
  // een plan met een onbekend gewas of een rare sleutel gaat weg
  assert.deepEqual(B.normaliseer({ v: 1, plan: { [PC.START_PERCEEL]: 'tarwe', wierdeakker: 'uien', onbekend: 'graan' } }).plan, { wierdeakker: 'uien' });
});

// ------------------------------------------------------------------ werk op het land
t('werk: netjes rijden maakt alle rijen af; te hard de helft; te langzaam of naast de rij niets', () => {
  for (const taak of Object.keys(W.BAND)) {
    const s = W.init(taak); assert.ok(werk(s), taak); assert.ok(W.fractie(s) > 0.95, `${taak} ${W.fractie(s)}`);
    const hard = W.init(taak); werk(hard, { speed: W.BAND[taak].vMax + 2 }); assert.ok(W.fractie(hard) > 0.4 && W.fractie(hard) < 0.55, `${taak} te hard ${W.fractie(hard)}`);
    const traag = W.init(taak); werk(traag, { speed: W.BAND[taak].vMin - 0.5 }); assert.equal(W.fractie(traag), 0);
    const naast = W.init(taak); werk(naast, { across: 6 }); assert.equal(W.fractie(naast), 0);
  }
});

t('werk: een eigen machine geeft een ruimere rij; de banden zijn voor een trekker te rijden', () => {
  assert.ok(W.init('ploegen', { eigen: true }).tol > W.init('ploegen').tol);
  for (const [taak, b] of Object.entries(W.BAND)) assert.ok(b.vMax - b.vMin >= 2.5 && b.vMax <= 8 && b.tol >= 2, taak); // een trekker haalt 11 m/s
});

t('werk: een stuk overslaan is gemist, achteruit rijden maakt geen meters, de klok mislukt het werk', () => {
  const s = W.init('zaaien');
  W.step(s, { along: 5, across: 0, speed: 4 }, 0.1); W.step(s, { along: 50, across: 0, speed: 4 }, 0.1);
  assert.ok(s.gemist >= 38);
  const g = s.goed; for (const a of [40, 30, 10]) W.step(s, { along: a, across: 0, speed: 4 }, 0.1);
  assert.equal(s.goed, g);
  const klok = W.init('ploegen'); let fail = false;
  for (let i = 0; i < 4000 && !fail; i++) fail = W.step(klok, { along: -50, across: 30, speed: 0 }, 0.1).some((e) => e.type === 'fail');
  assert.ok(fail);
});

t('afleverrit: zacht rijden levert alles af, hard remmen strooit leeg, de kwaliteit telt mee', () => {
  const rit = (opt) => {
    const s = W.init('afleveren', { kwaliteit: 1 });
    const ev = [];
    for (let i = 0; i < 400 && !s.klaar; i++) { const dist = Math.max(0, 300 - i * 0.8); const e = W.step(s, { dist, speed: dist < 7 ? 0.2 : 8, ...opt }, 0.1); ev.push(...e); if (e.some((x) => x.type === 'fail')) break; }
    return { s, ev };
  };
  const goed = rit({}); assert.ok(goed.s.klaar && goed.s.kwaliteit === 1);
  const slecht = rit({ decel: 5 }); assert.ok(slecht.ev.some((e) => e.type === 'fail') && !slecht.s.klaar);
  const deels = W.init('afleveren', { kwaliteit: 0.5 }); assert.equal(W.fractie(deels), 0.5);
});

// ------------------------------------------------------------------ de haken
t('de tijd: speluren uit de klok, ook over middernacht en na slapen; een sprong terug telt niet', () => {
  Live.initBoerderij({ opslag: nepOpslag() });
  const w = nepWereld();
  w.clock = 10; assert.equal(Live.boerderijTijd(w), 0, 'de eerste keer weet het nog niets');
  w.clock = 10.5; assert.ok(Math.abs(Live.boerderijTijd(w) - 0.5) < 1e-9);
  w.clock = 23.9; Live.boerderijTijd(w); w.clock = 0.1; assert.ok(Math.abs(Live.boerderijTijd(w) - 0.2) < 1e-9, 'over middernacht');
  w.clock = 8.1; assert.ok(Math.abs(Live.boerderijTijd(w) - 8) < 1e-9, 'slapen: acht uur erbij');
  w.clock = 5; assert.equal(Live.boerderijTijd(w), 0, 'een lading zet de klok terug');
  w.clock = NaN; assert.equal(Live.boerderijTijd(w), 0);
  Live.zetBoerderijVoorTest(null, null);
});

t('taken uit het geld: te weinig geld weigert, genoeg betaalt de huur en het zaaigoed, en het vak Landbouw telt punten', () => {
  Live.zetBoerderijVoorTest(null, nepOpslag());
  LL.zetProfielVoorTest(null, nepOpslag());
  const w = nepWereld(100);
  assert.equal(Live.neemTaak(w, 'zaaien').ok, false, 'op braak kan niet gezaaid worden');
  assert.equal(Live.neemTaak(w, 'ploegen').ok, true); assert.equal(w.money, 85);
  Live.rondAf(w, 'ploegen', 1);
  w.money = 49; const arm = Live.neemTaak(w, 'zaaien'); assert.equal(arm.ok, false); assert.match(arm.reden, /€50/); assert.equal(w.money, 49);
  w.money = 100; assert.equal(Live.neemTaak(w, 'zaaien').ok, true); assert.equal(w.money, 50);
  Live.rondAf(w, 'zaaien', 1);
  assert.ok(LL.getProfiel().vakken.landbouw.xp >= 24, 'punten voor de taken');
  assert.ok(LL.getProfiel().vakken.landbouw.uniek.includes('gewas-aardappelen'));
  Live.zetBoerderijVoorTest(null, null); LL.zetProfielVoorTest(null, null);
});

t('verkopen: met de loonfactor van Landbouw, de gasten krijgen hun deel, en machines kopen kost geld', () => {
  Live.zetBoerderijVoorTest(null, nepOpslag());
  const p = LL.getProfiel(); p.vakken.landbouw.xp = 950; LL.zetProfielVoorTest(p, nepOpslag());
  const w = nepWereld(0); w.gedeeld = []; w.coopDeel = (b, i) => w.gedeeld.push({ b, i });
  const b = Live.getBoerderij(); b.schuur = { gewas: 'bieten', kg: 4000, kwaliteit: 1 };
  const r = Live.leverAf(w, 1);
  assert.equal(r.bedrag, 400); assert.equal(r.betaald, 520, 'niveau 6 betaalt 30% meer'); assert.equal(w.money, 520);
  assert.equal(w.gedeeld.length, 1); assert.equal(w.gedeeld[0].i.vak, 'landbouw'); assert.equal(w.gedeeld[0].i.basis, 400);
  assert.equal(Live.leverAf(w, 1).betaald, 0, 'de schuur is leeg');
  w.money = 700; assert.equal(Live.koopMachine(w, 'rooier').ok, true); assert.equal(w.money, 100);
  assert.equal(Live.koopMachine(w, 'rooier').ok, false);
  Live.zetBoerderijVoorTest(null, null); LL.zetProfielVoorTest(null, null);
});

t('contracten: de bonus loopt via de bestaande haak, één keer, en een deellevering telt in kg (#492)', () => {
  Live.zetBoerderijVoorTest(null, nepOpslag());
  LL.zetProfielVoorTest(null, nepOpslag());
  const p = LL.getProfiel(); p.vakken.landbouw.xp = 950; LL.zetProfielVoorTest(p, nepOpslag());  // niveau 6: de loonfactor van het vak telt mee
  const w = nepWereld(0);
  const b = Live.getBoerderij();
  const a = Live.contracten().aanbod.find((x) => x.gewas === 'bieten');
  assert.equal(Live.neemContract(a.id).ok, true);
  assert.equal(Live.neemContract(a.id).ok, false, 'hetzelfde contract twee keer aannemen kan niet');
  assert.equal(Live.contracten().actief.length, 1);
  // een deellevering: de kilo's tellen, de bonus komt pas als de vracht vol is
  const half = Math.floor(a.kg / 2);
  b.schuur = { gewas: 'bieten', kg: half, kwaliteit: 1 };
  const eerste = Live.leverAf(w, 1);
  assert.equal(eerste.contract.kg, half);
  assert.equal(eerste.contract.bonus, 0);
  assert.equal(eerste.contract.betaald, 0);
  assert.equal(w.money, eerste.betaald, 'alleen de verkoop, nog geen bonus');
  assert.equal(Live.contracten().actief[0].geleverd, half);
  // de rest: de bonus erbij, via loopbaanVerdien (dus met de loonfactor van het vak), nooit met world.money +=
  b.schuur = { gewas: 'bieten', kg: a.kg - half, kwaliteit: 1 };
  const rest = Live.leverAf(w, 1);
  assert.equal(rest.contract.afgerond.length, 1);
  assert.ok(rest.contract.betaald > rest.contract.bonus, 'de bonus gaat met de loonfactor van het vak, via loopbaanVerdien');
  assert.equal(w.money, eerste.betaald + rest.betaald + rest.contract.betaald);
  assert.ok(w.msgs.some((m) => /Contract voldaan/.test(m.x)), 'de speler hoort dat het contract klaar is');
  assert.equal(LL.getProfiel().vakken.landbouw.xp > 0, true);
  assert.equal(Live.contracten().actief.length, 0);
  assert.equal(Live.contracten().historie.filter((c) => c.resultaat === 'klaar').length, 1);
  // nog eens hetzelfde gewas leveren betaalt niets meer: geen dubbele afronding
  b.schuur = { gewas: 'bieten', kg: 500, kwaliteit: 1 };
  const na = Live.leverAf(w, 1);
  assert.equal(na.contract.betaald, 0); assert.equal(na.contract.bonus, 0);
  assert.equal(w.money, eerste.betaald + rest.betaald + rest.contract.betaald + na.betaald);
  assert.equal(Live.getBoerderij().contracten.historie.filter((c) => c.resultaat === 'klaar').length, 1);
  Live.zetBoerderijVoorTest(null, null); LL.zetProfielVoorTest(null, null);
});

t('contracten: bij het tikken van de speltijd verloopt een contract zonder boete (#492)', () => {
  Live.zetBoerderijVoorTest(null, nepOpslag());
  LL.zetProfielVoorTest(null, nepOpslag());
  const w = nepWereld(1000);
  const b = Live.getBoerderij();
  const a = Live.contracten().aanbod[0];
  assert.equal(Live.neemContract(a.id).ok, true);
  b.uren = a.deadlineUren + 1;                     // de uiterste tijd is voorbij
  w.clock = 8; Live.boerderijTijd(w);               // de eerste tik kent de klok nog niet
  w.clock = 9; Live.boerderijTijd(w);               // en nu tikt de tijd
  assert.equal(Live.contracten().actief.length, 0);
  assert.equal(Live.contracten().historie.length, 1);
  assert.equal(Live.contracten().historie[0].resultaat, 'verlopen');
  assert.equal(w.money, 1000, 'verlopen kost niets');
  assert.ok(w.msgs.some((m) => /Contract verlopen/.test(m.x)));
  Live.zetBoerderijVoorTest(null, null); LL.zetProfielVoorTest(null, null);
});

t('contracten: een oude opslag zonder contracten werkt en de roundtrip blijft stabiel (#492)', () => {
  const oud = { v: 1, uren: 30, keuze: 'bieten', veld: { fase: 'braak' } };
  const b = B.normaliseer(oud);
  assert.equal(b.contracten.dag, 1);
  assert.deepEqual(b.contracten.actief, []);
  assert.deepEqual(b.contracten.historie, []);
  assert.equal(b.contracten.aanbod.length, B.GEWAS_IDS.length);
  assert.deepEqual(B.normaliseer(JSON.parse(JSON.stringify(b))), b);
  // een contract dat buiten het spel te laat werd, is bij het laden meteen verlopen (en kost niets)
  const teLaat = { v: 1, uren: 500, contracten: { zaad: 4, dag: 20, actief: [{ id: 'contract-20-bieten', gewas: 'bieten', kg: 100, geleverd: 0, bonus: 10, bonusPerKg: 0.1, aangenomen: 0, deadline: 400 }] } };
  Live.initBoerderij({ opslag: nepOpslag({ [KEYS.boerderij]: JSON.stringify(teLaat) }) });
  assert.equal(Live.contracten().actief.length, 0, 'de tijd liep door terwijl het spel dicht was');
  assert.equal(Live.contracten().historie.at(-1).resultaat, 'verlopen');
  assert.equal(Live.contracten().historie.at(-1).bonus, 10);
  // en de haken spelen gewoon: het aanbod staat klaar en een verkoop gaat door
  Live.zetBoerderijVoorTest(oud, nepOpslag());
  assert.equal(Live.contracten().aanbod.length, B.GEWAS_IDS.length);
  const w = nepWereld(0);
  Live.getBoerderij().schuur = { gewas: 'bieten', kg: 100, kwaliteit: 1 };
  assert.ok(Live.leverAf(w, 1).bedrag > 0);
  Live.zetBoerderijVoorTest(null, null);
});

t('opslag: de eigen sleutel, geen savegame, een kapotte opslag geeft een lege boerderij, vol of geblokkeerd breekt niets', () => {
  assert.equal(BASE_KEYS.boerderij, 'gde-boerderij-v1'); assert.equal(KEYS.boerderij, 'gde-boerderij-v1');
  for (const [k, v] of Object.entries(KEYS)) if (k !== 'boerderij') assert.notEqual(v, KEYS.boerderij);
  const src = fs.readFileSync(JS + 'savegame.js', 'utf8') + fs.readFileSync(JS + 'coopsave.js', 'utf8');
  assert.ok(!/boerderij/i.test(src), 'de boerderij zit niet in de savegame-code');
  const st = nepOpslag({ 'gde-save-v1-nieuw': 'SAVE', [KEYS.boerderij]: '{kapot' });
  const b = Live.initBoerderij({ opslag: st });
  assert.equal(B.fase(b), 'braak');
  Live.zetPerceel({ x: 5, y: 6, a: 1 }); Live.kiesGewas('bieten'); Live.schrijfNu();
  assert.deepEqual(st.log, [KEYS.boerderij], 'alleen de eigen sleutel'); assert.equal(st.m.get('gde-save-v1-nieuw'), 'SAVE');
  const weer = Live.initBoerderij({ opslag: st });
  assert.deepEqual(weer.perceel, { x: 5, y: 6, a: 1 }); assert.equal(B.actiefGewas(weer), 'bieten', 'het plan van het actieve perceel');
  st.setItem = () => { throw Object.assign(new Error('vol'), { name: 'QuotaExceededError' }); };
  Live.kiesGewas('aardappelen'); assert.doesNotThrow(() => Live.schrijfNu());
  assert.doesNotThrow(() => Live.initBoerderij({ opslag: { getItem() { throw new Error('geblokkeerd'); }, setItem() { throw new Error('vol'); } } }));
  assert.equal(Live.zetPerceel({ x: NaN, y: 1 }), false); assert.equal(Live.kiesGewas('tarwe'), false);
  Live.zetBoerderijVoorTest(null, null);
});

t('Samen spelen: elke speler heeft zijn eigen boerderij; een gast draait updateGameplay niet, dus zijn tijd loopt niet in andermans wereld', () => {
  const main = fs.readFileSync(JS + 'main.js', 'utf8');
  const i = main.indexOf('function updateGameplay');
  const gast = main.indexOf("world.coopRole === 'client'", i);
  const tijd = main.indexOf('boerderijTijd(', i);
  assert.ok(i > 0 && gast > 0 && tijd > gast, 'boerderijTijd staat na de vroege terugkeer van een gast');
  assert.ok(/initBoerderij\(/.test(main));
});

console.log(`boerderij_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
