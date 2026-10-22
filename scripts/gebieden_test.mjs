// Gebieden veroveren (#414): de pure regels (gebieden.js) en de haken van het spel (gebiedenlive.js).
//   node scripts/gebieden_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject; localStorage bestaat in node niet.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as G from '../game/js/gebieden.js';
import * as Live from '../game/js/gebiedenlive.js';
import { KEYS, BASE_KEYS } from '../game/js/storagekeys.js';

const JS = fileURLToPath(new URL('../game/js/', import.meta.url));
const { SPEL_SLEUTELS } = G;
const bron = (f) => fs.readFileSync(JS + f, 'utf8');
let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

// Een kleine wereld: twee wijken in de stad, twee dorpen, een gehucht, twee streken.
const WERELD = {
  wijken: [{ naam: 'Oosterpark', x: 0, y: 0 }, { naam: 'Hoornse Plas', x: 1200, y: 0 }, { naam: 'Verweggistan', x: 40000, y: 0 }],
  plaatsen: [
    { name: 'Groningen', kind: 'city', x: 600, y: 0 },
    { name: 'Haren', kind: 'town', x: 0, y: 5000 }, { name: 'Glimmen', kind: 'village', x: 600, y: 5000 }, { name: 'Onnen', kind: 'hamlet', x: 5000, y: 5000 },
  ],
  streken: [{ id: 'hogeland', naam: 'Hogeland', x: 0, y: 20000, reach: 9000 }, { id: 'oldambt', naam: 'Oldambt', x: 30000, y: 0, reach: 9000 }],
  stad: { x: 600, y: 0 },
  taken: [
    { id: 'm:a', soort: 'missie', naam: 'Eerste klus', x: 10, y: 10, sleutels: ['m:a'] },
    { id: 'b:taxi', soort: 'baan', naam: 'Taxi', x: -50, y: 20, sleutels: ['u:taxi'] },
    { id: 'a:padel:1', soort: 'spel', naam: 'Padelbaan', x: 1250, y: 30, sleutels: ['u:1'] },
    { id: 'a:kart:1', soort: 'spel', naam: 'Kartbaan', x: 1100, y: -40, sleutels: ['s:kartRaces', 'u:kart'] },
    { id: 'a:kart:2', soort: 'spel', naam: 'Kartbaan 2', x: 3, y: 3, sleutels: ['s:kartRaces'] },
    { id: 'b:bus', soort: 'baan', naam: 'Bus', x: 20, y: 5010, sleutels: ['u:bus'] },
    { id: 'f:v1', soort: 'vondst', naam: 'Schelp', x: 620, y: 5010, sleutels: ['v:v1'] },
    { id: 'f:g1', soort: 'geheim', naam: 'Klokje', x: 0, y: 21000, sleutels: ['v:g1'] },
    { id: 'f:v2', soort: 'vondst', naam: 'Aar', x: 30100, y: 100, sleutels: ['v:v2'] },
    { id: 'f:ver', soort: 'vondst', naam: 'Ver', x: 40000, y: 100, sleutels: ['v:ver'] },
    { id: 'f:zee', soort: 'vondst', naam: 'In zee', x: -90000, y: -90000, sleutels: ['v:zee'] },
    { id: 'kapot', soort: 'onbekend', x: 0, y: 0 },
  ],
};
const ind = () => G.bouwIndeling(WERELD);

// ------------------------------------------------------------------ de indeling
t('gebiedenVan: de stad heeft wijken en geen plaats, een dorp heeft een plaats en een streek', () => {
  const i = ind();
  assert.deepEqual(G.gebiedenVan(i, 20, 20), { wijk: 'w:Oosterpark', plaats: null, streek: 's:stad' }, 'de plaats Groningen telt niet: dat is de streek stad');
  assert.deepEqual(G.gebiedenVan(i, 1300, 10), { wijk: 'w:Hoornse Plas', plaats: null, streek: 's:stad' });
  assert.deepEqual(G.gebiedenVan(i, 20, 5010), { wijk: null, plaats: 'p:Haren', streek: null }, 'Haren ligt buiten elke streek in dit voorbeeld');
  assert.deepEqual(G.gebiedenVan(i, 0, 21000), { wijk: null, plaats: null, streek: 's:hogeland' });
  assert.equal(G.gebiedenVan(i, -90000, -90000).streek, null);
  assert.deepEqual(G.gebiedenVan(i, NaN, 0), { wijk: null, plaats: null, streek: null });
});
t('gebiedenVan: voorbij WIJK_REACH van het dichtstbijzijnde wijkpunt is er geen wijk', () => {
  const i = ind();
  assert.equal(G.gebiedenVan(i, 0, G.WIJK_REACH - 5).wijk, 'w:Oosterpark');
  assert.equal(G.gebiedenVan(i, 0, G.WIJK_REACH + 5).wijk, null);
});
t('gebiedenVan: de dichtstbijzijnde plaats ten opzichte van zijn bereik wint', () => {
  const i = G.bouwIndeling({ plaatsen: [{ name: 'Groot', kind: 'town', x: 0, y: 0 }, { name: 'Klein', kind: 'hamlet', x: 300, y: 0 }] });
  assert.equal(G.gebiedenVan(i, 250, 0).plaats, 'p:Klein');
  assert.equal(G.gebiedenVan(i, 100, 0).plaats, 'p:Groot');
  assert.equal(G.gebiedenVan(i, 1000, 0).plaats, 'p:Groot', 'het gehucht reikt maar 350 m');
});
t('bouwIndeling: kapotte invoer valt weg, een taak buiten elk gebied wordt wel onthouden, een gebied met één taak is niet te veroveren', () => {
  const i = ind();
  assert.ok(!i.taak.has('kapot'));
  assert.ok(i.taak.has('f:zee') && i.perTaak.get('f:zee').length === 0, 'in zee: geen gebied, maar wel gedaan als je hem doet');
  assert.equal(i.taak.size, 11);
  assert.ok(i.gebied.get('w:Oosterpark').veroverbaar, 'drie taken: m:a, b:taxi, kart:2');
  assert.deepEqual(i.gebied.get('w:Oosterpark').taken.sort(), ['a:kart:2', 'b:taxi', 'm:a']);
  assert.equal(i.gebied.get('w:Hoornse Plas').taken.length, 2);
  assert.equal(i.gebied.get('w:Verweggistan').taken.length, 1);
  assert.equal(i.gebied.get('w:Verweggistan').veroverbaar, false);
  assert.equal(i.gebied.get('p:Onnen').taken.length, 0);
  assert.ok(i.gebied.get('s:stad').veroverbaar && i.gebied.get('s:stad').taken.length === 6);
  assert.deepEqual(G.bouwIndeling({}).gebieden, []);
  assert.deepEqual(G.bouwIndeling(null).gebieden, [], 'null is geen wereld maar crasht ook niet');
});
t('bouwIndeling: dubbele namen en ontbrekende velden geven geen dubbele gebieden', () => {
  const i = G.bouwIndeling({ wijken: [{ naam: 'A', x: 0, y: 0 }, { naam: 'A', x: 5, y: 5 }, { naam: '', x: 1, y: 1 }, { naam: 'B' }], plaatsen: [{ name: 'P', kind: 'town', x: 0, y: 0 }, { name: 'P', kind: 'town', x: 9, y: 9 }, { name: 'Q', kind: 'nieuw', x: 0, y: 0 }] });
  assert.deepEqual(i.gebieden.map((g) => g.id), ['w:A', 'p:P']);
});
t('de schijf van een wijk op de kaart: de helft van de afstand tot de buur, tussen 180 en 700 m', () => {
  const i = ind();
  assert.equal(i.gebied.get('w:Oosterpark').r, 600);
  const dicht = G.bouwIndeling({ wijken: [{ naam: 'A', x: 0, y: 0 }, { naam: 'B', x: 100, y: 0 }] });
  assert.equal(dicht.gebied.get('w:A').r, 180);
  assert.equal(G.bouwIndeling({ wijken: [{ naam: 'A', x: 0, y: 0 }] }).gebied.get('w:A').r, 400);
});

// ------------------------------------------------------------------ de taak bij een melding
t('kiesTaak: de taak met die sleutel het dichtst bij de speler; een onbekende sleutel is niets', () => {
  const i = ind();
  assert.equal(G.kiesTaak(i, 's:kartRaces', 1100, -30), 'a:kart:1');
  assert.equal(G.kiesTaak(i, 's:kartRaces', 5, 5), 'a:kart:2');
  assert.equal(G.kiesTaak(i, 'u:kart', 5, 5), 'a:kart:1', 'één taak met die sleutel: waar je staat doet er niet toe');
  assert.equal(G.kiesTaak(i, 's:kartRaces', NaN, NaN), 'a:kart:1', 'zonder plek de eerste');
  assert.equal(G.kiesTaak(i, 'u:bestaatniet', 0, 0), null);
});

// ------------------------------------------------------------------ het profiel
t('markeer: een taak telt eenmaal, onbekende taken niet; een gebied is klaar als alles gedaan is', () => {
  const i = ind(), p = G.nieuwProfiel();
  assert.equal(G.markeer(p, i, 'nepnaam').nieuw, false);
  let r = G.markeer(p, i, 'm:a');
  assert.ok(r.nieuw);
  assert.deepEqual(r.beloningen, []);
  assert.equal(G.markeer(p, i, 'm:a').nieuw, false, 'dezelfde taak nog eens: niets');
  assert.deepEqual(p.gedaan, ['m:a']);
  const v = G.voortgang(p, i, 'w:Oosterpark');
  assert.equal(v.klaar, 1); assert.equal(v.totaal, 3); assert.ok(Math.abs(v.deel - 1 / 3) < 1e-9); assert.equal(v.voltooid, false);
  G.markeer(p, i, 'b:taxi');
  r = G.markeer(p, i, 'a:kart:2');
  assert.deepEqual(r.beloningen.map((b) => b.gebied), ['w:Oosterpark']);
  assert.equal(G.voortgang(p, i, 'w:Oosterpark').voltooid, true);
});
t('markeer: één taak kan twee gebieden tegelijk afmaken, elk met zijn eigen beloning, en geen gebied dubbel', () => {
  const i = ind(), p = G.nieuwProfiel();
  for (const id of ['b:bus']) G.markeer(p, i, id);
  const r = G.markeer(p, i, 'f:v1');
  // Haren (bus) en Glimmen (schelp) hebben elk maar één taak: niet te veroveren, dus geen beloning
  assert.deepEqual(r.beloningen, []);
  const ind2 = G.bouwIndeling({ ...WERELD, taken: [...WERELD.taken, { id: 'f:w1', soort: 'vondst', naam: 'Extra', x: 10, y: 10, sleutels: ['v:w1'] }] });
  const q = G.nieuwProfiel();
  for (const id of ind2.gebied.get('s:stad').taken.filter((x) => x !== 'm:a')) G.markeer(q, ind2, id);
  const laatste = G.markeer(q, ind2, 'm:a');
  assert.deepEqual(laatste.beloningen.map((b) => b.gebied).sort(), ['s:stad', 'w:Oosterpark'], 'de wijk en de stad in één keer');
  assert.deepEqual(G.markeer(q, ind2, 'm:a').beloningen, []);
});
t('een gebied met minder dan MIN_TAKEN taken geeft nooit een beloning en staat niet in het overzicht', () => {
  const i = ind(), p = G.nieuwProfiel();
  assert.deepEqual(G.markeer(p, i, 'f:ver').beloningen, []);
  assert.equal(G.voortgang(p, i, 'w:Verweggistan').voltooid, false);
  const ids = G.overzicht(p, i).flatMap((o) => o.gebieden.map((r) => r.gebied.id));
  assert.ok(!ids.includes('w:Verweggistan') && !ids.includes('p:Onnen'));
});
t('de beloning: titel per laag, geld per laag, een vlag, een regel; de stad heet Stadsbaas van Grunn', () => {
  const i = ind();
  assert.equal(G.beloningVan(i, 'w:Oosterpark').titel, 'Wijkheld van Oosterpark');
  assert.equal(G.beloningVan(i, 'p:Haren').titel, 'Burgemeester van Haren');
  assert.equal(G.beloningVan(i, 's:hogeland').titel, 'Streekbaas van Hogeland');
  assert.equal(G.beloningVan(i, 's:stad').titel, 'Stadsbaas van Grunn');
  assert.ok(G.beloningVan(i, 'w:Oosterpark').geld < G.beloningVan(i, 'p:Haren').geld && G.beloningVan(i, 'p:Haren').geld < G.beloningVan(i, 's:hogeland').geld);
  assert.equal(G.beloningVan(i, 'nergens'), null);
  for (const nv of G.NIVEAUS) {
    assert.match(nv.vlag, /^#[0-9a-f]{6}$/);
    assert.ok(nv.titel('X').length < 40);
  }
});
t('de teksten: Nederlands, rustig, geen geweld en geen echte merken', () => {
  const bron = fs.readFileSync(JS + 'gebieden.js', 'utf8');
  for (const w of ['winter', 'sneeuw', 'schiet', 'doodsl', 'vermoord', 'bloed', 'oorlog']) assert.ok(!bron.toLowerCase().includes(w), w);
  const i = ind();
  for (const id of ['w:Oosterpark', 'p:Haren', 's:hogeland']) { const b = G.beloningVan(i, id); assert.ok(b.regel.length > 20 && b.regel.length < 120, b.regel); }
});
t('normaliseer: kapot, oud of vreemd geeft een geldig profiel; getallen en lijsten begrensd', () => {
  for (const raw of [null, undefined, '', '{kapot', 'null', 7, [], { v: 0 }, { v: 2, gedaan: ['x'] }]) assert.deepEqual(G.normaliseer(raw), G.nieuwProfiel());
  const p = G.normaliseer(JSON.stringify({ v: 1, gedaan: ['a', 'a', 5, '', null, 'b'], beloond: 'nee', zaad: true, rommel: 1 }));
  assert.deepEqual(p, { v: 1, gedaan: ['a', 'b'], beloond: [], huizen: [], zaad: true });
  assert.deepEqual(G.normaliseer(JSON.parse(JSON.stringify(p))), p, 'heen en terug is stabiel');
  const groot = G.normaliseer({ v: 1, gedaan: Array.from({ length: 5000 }, (_, k) => 'x' + k) });
  assert.equal(groot.gedaan.length, 2000);
  assert.deepEqual(G.normaliseer({ v: 1, gedaan: ['x'.repeat(200), 'ok'] }).gedaan, ['ok']);
});
t('voegSamen: wat in een van beide gedaan is, is gedaan; de invoer blijft heel', () => {
  const a = { v: 1, gedaan: ['m:a'], beloond: [] }, b = { v: 1, gedaan: ['b:taxi', 'm:a'], beloond: ['w:Oosterpark'], zaad: true };
  const voor = JSON.stringify([a, b]);
  const m = G.voegSamen(a, JSON.stringify(b));
  assert.deepEqual(m.gedaan.sort(), ['b:taxi', 'm:a']);
  assert.deepEqual(m.beloond, ['w:Oosterpark']);
  assert.equal(m.zaad, true);
  assert.equal(JSON.stringify([a, b]), voor);
  assert.deepEqual(G.voegSamen(null, '{kapot'), G.nieuwProfiel());
});
t('zaai: een oude speler begint niet bij nul; een klaar gebied krijgt zijn titel, zonder dat markeer er geld voor geeft', () => {
  const i = ind(), p = G.nieuwProfiel();
  const aantal = G.zaai(p, i, ['m:a', 'u:taxi', 's:kartRaces', 'v:bestaat-niet']);
  assert.equal(aantal, 4, 'm:a, b:taxi en beide karttaken (een teller zonder plek zaait alle plekken)');
  assert.ok(p.zaad);
  assert.deepEqual(p.beloond, ['w:Oosterpark']);
  assert.equal(G.voortgang(p, i, 'w:Oosterpark').voltooid, true);
  assert.deepEqual(G.markeer(p, i, 'b:taxi').beloningen, [], 'al gedaan, al beloond');
  assert.equal(G.zaai(G.nieuwProfiel(), i, []), 0);
});
t('een gebied dat later nieuwe taken krijgt blijft veroverd', () => {
  const p = G.nieuwProfiel();
  const klein = G.bouwIndeling({ ...WERELD, taken: WERELD.taken.filter((x) => x.id !== 'a:kart:2') });
  for (const id of ['m:a', 'b:taxi']) G.markeer(p, klein, id);
  assert.deepEqual(p.beloond, ['w:Oosterpark']);
  const groot = ind();
  assert.equal(G.voortgang(p, groot, 'w:Oosterpark').voltooid, true);
  assert.equal(G.voortgang(p, groot, 'w:Oosterpark').klaar, 2);
});
t('overzicht: per laag, voltooid eerst, dan het verst gevorderd; samenvatting telt mee', () => {
  const i = ind(), p = G.nieuwProfiel();
  G.markeer(p, i, 'a:padel:1');
  for (const id of ['m:a', 'b:taxi', 'a:kart:2']) G.markeer(p, i, id);
  const o = G.overzicht(p, i);
  assert.deepEqual(o.map((x) => x.niveau.id), ['wijk', 'plaats', 'streek']);
  assert.deepEqual(o[0].gebieden.map((r) => r.gebied.naam), ['Oosterpark', 'Hoornse Plas']);
  assert.equal(o[0].voltooid, 1);
  assert.equal(o[0].begonnen, 2);
  const s = G.samenvatting(p, i);
  assert.equal(s.voltooid, 1);
  assert.equal(s.totaal, o.reduce((a, x) => a + x.gebieden.length, 0));
  assert.deepEqual(G.titels(p, i).map((x) => x.titel), ['Wijkheld van Oosterpark']);
});
t('kaartKleur: niets gedaan is niet getekend, onderweg loopt van oker naar groen, veroverd heeft de kleur van zijn vlag', () => {
  assert.equal(G.kaartKleur({ veroverbaar: true, deel: 0, voltooid: false }, '#fff'), null);
  assert.equal(G.kaartKleur({ veroverbaar: false, deel: 0.5, voltooid: false }, '#fff'), null);
  const laag = G.kaartKleur({ veroverbaar: true, deel: 0.1, voltooid: false }, '#fff'), hoog = G.kaartKleur({ veroverbaar: true, deel: 0.9, voltooid: false }, '#fff');
  assert.match(laag.kleur, /^rgb\(\d+,\d+,\d+\)$/);
  const rood = (k) => Number(k.kleur.match(/\d+/)[0]);
  assert.ok(rood(laag) > rood(hoog), 'meer gedaan is groener (minder rood)');
  assert.ok(hoog.alpha > laag.alpha);
  assert.deepEqual(G.kaartKleur({ veroverbaar: true, deel: 1, voltooid: true }, '#4fb3a6'), { kleur: '#4fb3a6', alpha: 0.3 });
});
t('de tabel van de soorten klopt: alleen bekende soorten, elk met een naam', () => {
  for (const s of G.SOORTEN) assert.ok(s.naam && s.enkel && s.meer);
  assert.deepEqual(new Set(WERELD.taken.filter((x) => G.soortInfo(x.soort)).map((x) => x.soort)), new Set(['missie', 'baan', 'spel', 'vondst', 'geheim']));
});


// ------------------------------------------------------------------ safehouses (fase 2)
t('huisVan: alleen wijken en plaatsen die te veroveren zijn; een verzonnen adres dat bij het gebied blijft', () => {
  const i = ind();
  assert.equal(G.huisVan(i, 's:stad'), null, 'een streek heeft geen woning');
  assert.equal(G.huisVan(i, 'w:Verweggistan'), null, 'te weinig te doen');
  assert.equal(G.huisVan(i, 'w:nergens'), null);
  const h = G.huisVan(i, 'w:Oosterpark');
  assert.equal(h.id, 'h:w:Oosterpark');
  assert.equal(h.naam, 'Safehouse Oosterpark');
  assert.match(h.adres, /^[A-Za-z' ]+ [0-9]{1,2}$/);
  assert.ok(h.makelaar.length > 8);
  assert.deepEqual(G.huisVan(ind(), 'w:Oosterpark'), h, 'elke keer hetzelfde adres');
  assert.notEqual(G.huisVan(i, 'w:Hoornse Plas').adres, h.adres);
  assert.deepEqual(G.huizenLijst(i).map((x) => x.gebied).sort(), ['w:Hoornse Plas', 'w:Oosterpark']);
});
t('huisPrijs: de basisprijs van de laag, tot de helft korting als je bijna klaar bent', () => {
  const i = ind(), p = G.nieuwProfiel();
  assert.equal(G.huisPrijs(p, i, 'h:w:Oosterpark'), G.HUIS_PRIJS.wijk);
  G.markeer(p, i, 'm:a');
  const een = G.huisPrijs(p, i, 'h:w:Oosterpark');
  assert.ok(een < G.HUIS_PRIJS.wijk && een > G.HUIS_PRIJS.wijk / 2 && een % 5 === 0, String(een));
  G.markeer(p, i, 'b:taxi');
  assert.ok(G.huisPrijs(p, i, 'h:w:Oosterpark') < een);
  assert.equal(G.huisPrijs(p, i, 'h:s:stad'), null);
  assert.equal(G.huisPrijs(p, i, 'kapot'), null);
  assert.ok(G.HUIS_PRIJS.plaats > G.HUIS_PRIJS.wijk);
});
t('koopHuis: te weinig geld, genoeg geld, al gekocht en onbekend; de aanroeper trekt het geld af', () => {
  const i = ind(), p = G.nieuwProfiel();
  assert.deepEqual(G.koopHuis(p, i, 'h:w:Oosterpark', 100), { ok: false, prijs: 1800, reden: 'geld' });
  assert.deepEqual(p.huizen, []);
  const r = G.koopHuis(p, i, 'h:w:Oosterpark', 5000);
  assert.deepEqual(r, { ok: true, prijs: 1800, reden: '' });
  assert.deepEqual(p.huizen, ['h:w:Oosterpark']);
  assert.equal(G.koopHuis(p, i, 'h:w:Oosterpark', 5000).reden, 'al');
  assert.equal(G.koopHuis(p, i, 'h:s:stad', 5000).reden, 'onbekend');
  assert.equal(G.koopHuis(p, i, 'h:w:Oosterpark', NaN).ok, false);
});
t('een veroverde wijk of plaats geeft de woning cadeau, een streek niet; zaaien ook, zonder geld', () => {
  const i = ind(), p = G.nieuwProfiel();
  for (const id of ['m:a', 'b:taxi']) G.markeer(p, i, id);
  const r = G.markeer(p, i, 'a:kart:2');
  assert.deepEqual(p.huizen, ['h:w:Oosterpark']);
  assert.equal(r.beloningen[0].huis, true);
  assert.equal(G.beloningVan(i, 's:stad').huis, false);
  const q = G.nieuwProfiel();
  G.zaai(q, i, ['m:a', 'u:taxi', 's:kartRaces']);
  assert.deepEqual(q.huizen, ['h:w:Oosterpark']);
  assert.equal(G.koopHuis(p, i, 'h:w:Oosterpark', 5000).reden, 'al', 'cadeau: niet nog eens kopen');
});
t('huizen in het profiel: genormaliseerd, samengevoegd en oude profielen zonder huizen blijven geldig', () => {
  assert.deepEqual(G.normaliseer({ v: 1, gedaan: ['a'], beloond: [] }).huizen, []);
  assert.deepEqual(G.normaliseer({ v: 1, huizen: ['h:x', 'h:x', 5, ''] }).huizen, ['h:x']);
  assert.deepEqual(G.voegSamen({ v: 1, huizen: ['h:a'] }, { v: 1, huizen: ['h:b', 'h:a'] }).huizen.sort(), ['h:a', 'h:b']);
});
t('inrichting: vijf stappen die meegroeien met de voortgang; de laatste pas als alles gedaan is', () => {
  assert.equal(G.inrichting(0, false).niveau, 0);
  assert.equal(G.inrichting(0.3, false).niveau, 1);
  assert.equal(G.inrichting(0.5, false).niveau, 2);
  assert.equal(G.inrichting(0.99, false).niveau, 3);
  assert.equal(G.inrichting(0.2, true).niveau, 4, 'veroverd is volledig ingericht');
  assert.equal(G.inrichting(NaN, false).niveau, 0);
  assert.equal(G.inrichting(0, false).stappen.length, 5);
  assert.equal(G.ONDERDUIK_UREN.length, 5);
  assert.ok(G.ONDERDUIK_UREN.every((u, k, a) => k === 0 || u <= a[k - 1]), 'beter ingericht is korter onderduiken');
});
t('de woningen zijn verzonnen: geen echte makelaars en geen geweld in de teksten', () => {
  const src = fs.readFileSync(JS + 'gebieden.js', 'utf8');
  const blok = src.slice(src.indexOf('// --- safehouses'));
  for (const w of ['schiet', 'bloed', 'moord', 'wapen', 'inbraak']) assert.ok(!blok.toLowerCase().includes(w), w);
  for (const echt of ['Funda', 'Pararius', 'Jaap', 'Rabobank']) assert.ok(!blok.includes(echt), echt);
});

// ------------------------------------------------------------------ de haken van het spel
function nepOpslag(vooraf = {}) {
  const m = new Map(Object.entries(vooraf)), log = [];
  return { m, log, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { log.push(k); m.set(k, String(v)); }, removeItem: (k) => m.delete(k) };
}
const nepWereld = (x = 0, y = 0) => { const w = { money: 100, player: { x, y }, berichten: [], addMessage(t, d, o) { this.berichten.push({ t, o }); } }; return w; };
const bronVan = (bekend = () => new Set()) => () => ({ ...WERELD, bekend });
function begin(st, b = bronVan(), gate = null) { Live.initGebieden({ gate, bron: b, opslag: st }); }

t('de sleutel is eigen en nieuw: gde-gebieden-v1, buiten elke savegame en verhaallijn', () => {
  assert.equal(BASE_KEYS.gebieden, 'gde-gebieden-v1');
  assert.equal(KEYS.gebieden, 'gde-gebieden-v1');
  for (const [k, v] of Object.entries(KEYS)) if (k !== 'gebieden') assert.notEqual(v, KEYS.gebieden);
  const savegame = bron('savegame.js') + bron('coopsave.js');
  assert.ok(!/gebieden/i.test(savegame), 'de voortgang staat niet in een savegame');
});
t('opSleutel: de taak bij de speler is gedaan, de voortgang komt als kaartje, een tweede keer niets', () => {
  const st = nepOpslag(); begin(st);
  const w = nepWereld(5, 5);
  assert.deepEqual(Live.opSleutel(w, 'm:a'), []);
  assert.equal(w.berichten.length, 1);
  assert.match(w.berichten[0].t, /Oosterpark: 1 van 3 gedaan/);
  Live.opSleutel(w, 'm:a');
  assert.equal(w.berichten.length, 1, 'niets nieuws, dus geen kaartje');
  assert.deepEqual(Live.getProfiel().gedaan, ['m:a']);
});
t('de laatste taak van een wijk: titel, geld en een kaartje, één keer', () => {
  const st = nepOpslag(); begin(st);
  const w = nepWereld(5, 5);
  Live.opSleutel(w, 'm:a'); Live.gebiedenOpUniek(w, 'taxi');
  const voor = w.money;
  const b = Live.gebiedenOpStat(w, 'kartRaces');
  assert.deepEqual(b.map((x) => x.titel), ['Wijkheld van Oosterpark']);
  assert.equal(w.money, voor + 150);
  const kaart = w.berichten.at(-1);
  assert.match(kaart.t, /Wijkheld van Oosterpark! .*\+€150/);
  assert.equal(kaart.o.key, 'gebied-w:Oosterpark');
  Live.gebiedenOpStat(w, 'kartRaces'); Live.gebiedenOpUniek(w, 'taxi');
  assert.equal(w.money, voor + 150, 'nooit twee keer betaald');
});
t('een teller met meer plekken telt de plek bij de speler: de kart in Oosterpark, niet die op de Hoornse Plas', () => {
  const st = nepOpslag(); begin(st);
  Live.gebiedenOpStat(nepWereld(1100, -20), 'kartRaces');
  assert.deepEqual(Live.getProfiel().gedaan, ['a:kart:1']);
});
t('vondsten en loopbaanplekken tellen via hun eigen sleutel', () => {
  const st = nepOpslag(); begin(st);
  const w = nepWereld(600, 5000);
  Live.gebiedenOpVondst(w, 'streekverzamel', 'v1');
  Live.gebiedenOpUniek(w, '1');
  assert.deepEqual(Live.getProfiel().gedaan.sort(), ['a:padel:1', 'f:v1']);
  Live.gebiedenOpVondst(w, 'x', 'bestaat-niet'); Live.opSleutel(w, ''); Live.opSleutel(w, 7); Live.opSleutel(null, 'm:a');
  assert.equal(Live.getProfiel().gedaan.length, 3, 'm:a telt ook zonder wereld, een raar geluid niet');
});
t('zolang de wereld er niet is (de bron geeft null) telt er niets en gaat er niets mis', () => {
  const st = nepOpslag(); begin(st, () => null);
  assert.equal(Live.getIndeling(), null);
  assert.deepEqual(Live.opSleutel(nepWereld(), 'm:a'), []);
  assert.deepEqual(Live.getProfiel().gedaan, []);
  assert.equal(Live.getOverzicht(), null);
  assert.doesNotThrow(() => Live.updateGebieden(10, nepWereld(), () => ['a']));
});
t('een bron die faalt breekt het spel niet', () => {
  const st = nepOpslag(); begin(st, () => { throw new Error('stuk'); });
  assert.deepEqual(Live.opSleutel(nepWereld(), 'm:a'), []);
  assert.doesNotThrow(() => Live.getOverzicht());
});
t('cheats blokkeren het tellen, net als bij de prestaties', () => {
  const st = nepOpslag(); let cheat = true; begin(st, bronVan(), () => cheat);
  Live.opSleutel(nepWereld(5, 5), 'm:a');
  assert.deepEqual(Live.getProfiel().gedaan, []);
  cheat = false;
  Live.opSleutel(nepWereld(5, 5), 'm:a');
  assert.deepEqual(Live.getProfiel().gedaan, ['m:a']);
});
t('missies die klaar zijn in de save tellen mee, om de paar seconden', () => {
  const st = nepOpslag(); begin(st);
  const w = nepWereld();
  let vraag = 0;
  const klaar = () => { vraag++; return ['a', 'onbekend']; };
  Live.updateGebieden(0.1, w, klaar);
  assert.equal(vraag, 1);
  assert.deepEqual(Live.getProfiel().gedaan, ['m:a']);
  Live.updateGebieden(1, w, klaar);
  assert.equal(vraag, 1, 'niet elk beeld');
  Live.updateGebieden(5, w, klaar);
  assert.equal(vraag, 2);
});
t('een nieuwe sleutel neemt over wat het spel al wist, eenmaal, zonder geld', () => {
  const st = nepOpslag(); const w = nepWereld();
  begin(st, bronVan(() => new Set(['m:a', 'u:taxi', 's:kartRaces'])));
  const voor = w.money;
  Live.getIndeling();
  const p = Live.getProfiel();
  assert.ok(p.zaad);
  assert.deepEqual(p.beloond, ['w:Oosterpark']);
  assert.equal(w.money, voor);
  let nogEens = 0;
  Live.zetVoorTest(JSON.stringify(p), st, bronVan(() => { nogEens++; return new Set(['v:ver']); }));
  Live.getIndeling();
  assert.equal(nogEens, 0, 'een profiel dat al gezaaid is, zaait niet opnieuw');
});
t('een nieuwe indeling (de plaatsen komen later binnen) geeft klaar-gebieden hun titel zonder geld, en het eerder gedane blijft', () => {
  const st = nepOpslag(); const w = nepWereld(20, 5010);
  let b = () => ({ ...WERELD, plaatsen: [], bekend: () => new Set() });
  begin(st, b);
  Live.getIndeling(0);
  Live.opSleutel(w, 'u:bus');
  Live.opSleutel(w, 'v:v1');
  const geld = w.money;
  const p = Live.getProfiel();
  assert.deepEqual(p.gedaan.sort(), ['b:bus', 'f:v1'], 'ook zonder plaatsen onthouden');
  assert.deepEqual(p.beloond, []);
  b = () => ({ ...WERELD, plaatsen: [{ name: 'Haren', kind: 'town', x: 0, y: 5000 }], bekend: () => new Set() });
  Live.zetVoorTest(JSON.stringify(p), st, b);
  Live.getIndeling(1e9);
  assert.deepEqual(Live.getProfiel().beloond, ['p:Haren']);
  assert.equal(w.money, geld, 'een titel, geen geld');
});
t('opslag: een schrijfactie op de eigen sleutel; kapot en leeg geven een leeg profiel; voegt een tweede tabblad samen', () => {
  const st = nepOpslag(); begin(st);
  Live.opSleutel(nepWereld(5, 5), 'm:a');
  assert.deepEqual(st.log, []);
  Live.schrijfNu();
  assert.deepEqual(st.log, [KEYS.gebieden]);
  assert.deepEqual(JSON.parse(st.m.get(KEYS.gebieden)).gedaan, ['m:a']);
  st.m.set(KEYS.gebieden, JSON.stringify({ v: 1, gedaan: ['b:taxi'], beloond: [] }));
  Live.opSleutel(nepWereld(5, 5), 'a:kart:2'); Live.opSleutel(nepWereld(5, 5), 's:kartRaces');
  Live.schrijfNu();
  assert.deepEqual(JSON.parse(st.m.get(KEYS.gebieden)).gedaan.sort(), ['a:kart:2', 'b:taxi', 'm:a']);
  assert.deepEqual(st.log.filter((k) => k !== KEYS.gebieden), []);
  for (const raw of ['{kapot', '', 'null', JSON.stringify({ v: 0 }), JSON.stringify({ v: 1, gedaan: 'x' })]) {
    begin(nepOpslag({ [KEYS.gebieden]: raw }));
    assert.deepEqual(Live.getProfiel().gedaan, [], raw);
  }
});
t('opslag geblokkeerd of vol: de voortgang blijft in het spel, niets gooit', () => {
  const stuk = { getItem() { throw new Error('geblokkeerd'); }, setItem() { throw new Error('vol'); } };
  begin(stuk);
  assert.doesNotThrow(() => { Live.opSleutel(nepWereld(5, 5), 'm:a'); Live.schrijfNu(); });
  assert.deepEqual(Live.getProfiel().gedaan, ['m:a']);
});
t('opVeranderen hoort van elke verandering en laat zich weghalen', () => {
  const st = nepOpslag(); begin(st);
  Live.getIndeling();
  let k = 0;
  const weg = Live.opVeranderen(() => k++);
  Live.opSleutel(nepWereld(5, 5), 'm:a');
  assert.equal(k, 1);
  weg();
  Live.opSleutel(nepWereld(5, 5), 'u:taxi');
  assert.equal(k, 1);
});

// ------------------------------------------------------------------ de bronnen in het spel
t('elke teller of plek die de bronnen noemen, bestaat ook echt in de code van het spel', () => {
  const alles = fs.readdirSync(JS).filter((f) => f.endsWith('.js') && !/^gebieden/.test(f)).map(bron).join('\n');
  for (const [act, sl] of Object.entries(SPEL_SLEUTELS)) {
    assert.ok(sl.length > 0, act);
    for (const s of sl) {
      const naam = s.slice(2);
      if (s.startsWith('s:')) assert.ok(new RegExp(`recordStat\\([^)]*'${naam}'`).test(alles), `teller ${naam} wordt nergens geteld (${act})`);
      else assert.ok(new RegExp(`uniek: '${naam}'`).test(alles), `plek ${naam} wordt nergens gemeld (${act})`);
    }
  }
});
t('de haken staan op hun plek: loopbaanTel, loopbaanOpStat, de vondsten en het tikken in de tracker', () => {
  const lb = bron('loopbaanlive.js');
  assert.match(lb, /gebiedenOpUniek\(w, opties\.uniek\)/);
  assert.match(lb, /gebiedenOpStat\(w, key\)/);
  assert.match(bron('achievements.js'), /uniekListener\(world, key, value\)/);
  const tr = bron('achievementtracker.js');
  assert.match(tr, /initGebieden\(\{ gate: achievementsGated/);
  assert.match(tr, /setUniekListener\(gebiedenOpVondst\)/);
  assert.match(tr, /updateGebieden\(dt, w,/);
  assert.match(bron('mapview.js'), /layerOn\('veroverd'\)/);
  assert.match(bron('loopbaanui.js'), /gebiedenHtml/);
});
t('de safehouses hangen aan het spel: een activiteit, een laag op de kaart, de knop Reis erheen en de teksten', () => {
  const heeft = (f, s, m) => assert.ok(bron(f).includes(s), m || `${f}: ${s}`);
  heeft('activities.js', 'EVENEMENTEN, REGATTA_GAME, SAFEHUIS]');
  heeft('mapview.js', "layers: ['safehuis']");
  heeft('mapview.js', "filter((l) => l !== 'safehuis')", 'de laag hoort niet bij de schakelaar van de minigames');
  heeft('loopbaanui.js', 'data-reis');
  heeft('pausemenu.js', "'[data-panel=\"loopbaan\"] .pm-inner'), closePauseMenu)");
  heeft('safehuizen.js', 'cheatActions.teleport', 'snelreizen met de bewakers van de kaartteleport');
  heeft('safehuizen.js', 'policeWatching(w)', 'de deur is dicht als de politie je ziet');
  heeft('safehuizen.js', 'w.wanted = 0', 'onderduiken zet het gezocht-niveau op nul');
  const s = bron('safehuizen.js');
  for (const w of ['winter', 'sneeuw', 'schiet', 'bloed', 'moord']) assert.ok(!s.toLowerCase().includes(w), w);
});
t('de bronnen zijn alleen de bronnen: gebieden.js en gebiedenlive.js importeren geen DOM of spelmodules', () => {
  const imports = (f) => [...bron(f).matchAll(/^import .* from '(.+?)';/gm)].map((m) => m[1]);
  assert.deepEqual(imports('gebieden.js'), []);
  assert.deepEqual(imports('gebiedenlive.js').sort(), ['./finance.js', './gebieden.js', './storagekeys.js']);
  assert.ok(!/document\.|window\./.test(bron('gebieden.js').replace(/\/\/.*$/gm, '')));
});

console.log(`${n - fails}/${n} geslaagd`);
process.exit(fails ? 1 : 0);
