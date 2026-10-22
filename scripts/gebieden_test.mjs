// Gebieden veroveren (#414): de pure regels (gebieden.js), de haken van het spel (gebiedenlive.js) en hoe het aan het spel hangt.
// De grenzen zelf (grenzen.js, game/grenzen.json, de scripts) staan in scripts/grenzen_test.mjs.
//   node scripts/gebieden_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject; localStorage bestaat in node niet.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as G from '../game/js/gebieden.js';
import * as Live from '../game/js/gebiedenlive.js';
import { ontvouw } from '../game/js/grenzen.js';
import { KEYS, BASE_KEYS } from '../game/js/storagekeys.js';

const JS = fileURLToPath(new URL('../game/js/', import.meta.url));
const { SPEL_SLEUTELS } = G;
const bron = (f) => fs.readFileSync(JS + f, 'utf8');
let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

// ------------------------------------------------------------------ een kleine wereld met echte vormen
// Vierkantjes in het bestandsformaat van game/grenzen.json (ringen als verschillen), door grenzen.js uitgepakt.
const delta = (r) => { const uit = []; let px = 0, py = 0; r.forEach(([x, y], i) => { uit.push(i ? x - px : x, i ? y - py : y); px = x; py = y; }); return uit; };
const vk = (id, naam, x0, y0, x1, y1, extra = {}) => ({ id, naam, c: [Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2)], p: [[delta([[x0, y0], [x1, y0], [x1, y1], [x0, y1]])]], ...extra });
const GRENZEN_BESTAND = {
  v: 1, jaar: 2025, bron: ['test'],
  provincie: vk('PV20', 'Groningen', -1000, -1000, 50000, 30000),
  gemeenten: [vk('GM0014', 'Groningen', 0, 0, 20000, 10000), vk('GM1895', 'Oldambt', 20000, 0, 40000, 10000)],
  woonplaatsen: [
    vk('WP0001', 'Groningen', 0, 0, 12000, 10000, { gm: 'GM0014' }), vk('WP0002', 'Haren', 12000, 0, 20000, 10000, { gm: 'GM0014' }),
    vk('WP0003', 'Winschoten', 20000, 0, 30000, 10000, { gm: 'GM1895' }),
  ],
  wijken: [
    vk('WK001', 'Centrum', 0, 0, 2000, 2000, { gm: 'GM0014' }), vk('WK002', 'Oosterpoort', 2000, 0, 4000, 2000, { gm: 'GM0014' }),
    vk('WK003', 'Centrum', 20000, 0, 22000, 2000, { gm: 'GM1895' }), vk('WK004', 'Wijk 03 Veendam-kern', 22000, 0, 24000, 2000, { gm: 'GM1895' }),
  ],
  buurten: [
    vk('BU001', 'Binnenstad', 0, 0, 1000, 2000, { gm: 'GM0014', wk: 'WK001' }), vk('BU002', 'Noorderplantsoen', 1000, 0, 2000, 2000, { gm: 'GM0014', wk: 'WK001' }),
    vk('BU003', 'Oosterpoort-Noord', 2000, 0, 3000, 2000, { gm: 'GM0014', wk: 'WK002' }),
  ],
};
const GRENZEN = () => ontvouw(GRENZEN_BESTAND);
const WERELD = {
  grenzen: GRENZEN(),
  taken: [
    { id: 'm:a', soort: 'missie', naam: 'Eerste klus', x: 10, y: 10, sleutels: ['m:a'] },
    { id: 'b:taxi', soort: 'baan', naam: 'Taxi', x: 500, y: 500, sleutels: ['u:taxi'] },
    { id: 'a:kart:1', soort: 'spel', naam: 'Kartbaan', x: 1500, y: 100, sleutels: ['s:kartRaces', 'u:kart'] },
    { id: 'a:kart:2', soort: 'spel', naam: 'Kartbaan 2', x: 3, y: 3, sleutels: ['s:kartRaces'] },
    { id: 'a:padel:1', soort: 'spel', naam: 'Padelbaan', x: 2500, y: 500, sleutels: ['u:1'] },
    { id: 'b:boa', soort: 'baan', naam: 'Boa', x: 3500, y: 500, sleutels: ['u:boa'] },
    { id: 'b:bus', soort: 'baan', naam: 'Bus', x: 13000, y: 5000, sleutels: ['u:bus'] },
    { id: 'f:v1', soort: 'vondst', naam: 'Schelp', x: 13100, y: 5100, sleutels: ['v:v1'] },
    { id: 'f:g1', soort: 'geheim', naam: 'Klokje', x: 21000, y: 1000, sleutels: ['v:g1'] },
    { id: 'f:v2', soort: 'vondst', naam: 'Aar', x: 23000, y: 1000, sleutels: ['v:v2'] },
    { id: 'f:ver', soort: 'vondst', naam: 'Ver', x: 45000, y: 5000, sleutels: ['v:ver'] },
    { id: 'f:zee', soort: 'vondst', naam: 'In zee', x: -90000, y: -90000, sleutels: ['v:zee'] },
    { id: 'kapot', soort: 'onbekend', x: 0, y: 0 },
  ],
};
const ind = () => G.bouwIndeling(WERELD);

// ------------------------------------------------------------------ de indeling
t('gebiedenVan: een plek hoort bij precies één gebied per laag, volgens de echte vormen', () => {
  const i = ind();
  assert.deepEqual(G.gebiedenVan(i, 10, 10), { provincie: 'pv:PV20', gemeente: 'gm:GM0014', woonplaats: 'wp:WP0001', wijk: 'wk:WK001', buurt: 'bu:BU001' });
  assert.deepEqual(G.gebiedenVan(i, 13000, 5000), { provincie: 'pv:PV20', gemeente: 'gm:GM0014', woonplaats: 'wp:WP0002', wijk: null, buurt: null });
  assert.deepEqual(G.gebiedenVan(i, 45000, 5000), { provincie: 'pv:PV20', gemeente: null, woonplaats: null, wijk: null, buurt: null });
  assert.deepEqual(G.gebiedenVan(i, -90000, -90000), { provincie: null, gemeente: null, woonplaats: null, wijk: null, buurt: null });
  assert.equal(G.gebiedenVan(i, NaN, 0).gemeente, null);
  assert.equal(G.gebiedenVan(G.bouwIndeling({ taken: [] }), 10, 10).gemeente, null, 'zonder grenzen geen gebieden');
});
t('bouwIndeling: vijf lagen met hun ouders, taken per gebied, en een gebied met één taak is niet te veroveren', () => {
  const i = ind();
  assert.deepEqual(G.NIVEAUS.map((x) => x.id), ['provincie', 'gemeente', 'woonplaats', 'wijk', 'buurt']);
  assert.equal(i.gebieden.length, 1 + 2 + 3 + 4 + 3);
  assert.equal(i.gebied.get('gm:GM0014').ouder, 'pv:PV20');
  assert.equal(i.gebied.get('wp:WP0002').ouder, 'gm:GM0014');
  assert.equal(i.gebied.get('wk:WK004').ouder, 'gm:GM1895');
  assert.equal(i.gebied.get('bu:BU003').ouder, 'wk:WK002', 'een buurt hoort bij haar wijk');
  assert.equal(i.gebied.get('pv:PV20').taken.length, 11, 'de provincie telt alles wat erin ligt');
  assert.deepEqual([...i.gebied.get('wk:WK001').taken].sort(), ['a:kart:1', 'a:kart:2', 'b:taxi', 'm:a']);
  assert.equal(i.gebied.get('bu:BU001').taken.length, 3);
  assert.equal(i.gebied.get('gm:GM0014').taken.length, 8, 'de gemeente telt wat in haar woonplaatsen en wijken ligt');
  assert.equal(i.gebied.get('wp:WP0002').taken.length, 2);
  assert.equal(i.gebied.get('wk:WK004').taken.length, 1);
  assert.equal(i.gebied.get('wk:WK004').veroverbaar, false);
  assert.equal(i.gebied.get('wp:WP0001').veroverbaar, true);
  assert.ok(!i.taak.has('kapot'));
  assert.ok(i.taak.has('f:zee') && i.perTaak.get('f:zee').length === 0, 'in zee: geen gebied, maar wel gedaan als je hem doet');
  assert.deepEqual(G.bouwIndeling(null).gebieden, []);
  assert.equal(G.bouwIndeling({ taken: WERELD.taken }).taak.size, 12, 'zonder grenzen blijven de taken bewaard');
});
t('weergaveNamen: het CBS-wijknummer valt weg en dubbele namen krijgen hun gemeente erbij', () => {
  const i = ind();
  assert.equal(i.gebied.get('wk:WK004').naam, 'Veendam-kern');
  assert.equal(i.gebied.get('wk:WK001').naam, 'Centrum (Groningen)');
  assert.equal(i.gebied.get('wk:WK003').naam, 'Centrum (Oldambt)');
  assert.equal(i.gebied.get('wk:WK002').naam, 'Oosterpoort');
  assert.equal(i.gebied.get('wp:WP0001').naam, 'Groningen');
  const nm = new Map([['GM1', 'Eemsdelta']]);
  assert.deepEqual(G.weergaveNamen([{ naam: 'Wijk 16', gm: 'GM1' }, { naam: 'Wijk 02 Noord', gm: 'GM1' }], nm), ['Wijk 16', 'Noord']);
});
t('keten: van de provincie af tot het gebied, met de wijk tussen de gemeente en de buurt', () => {
  const i = ind();
  assert.deepEqual(G.keten(i, 'bu:BU001').map((g) => g.id), ['pv:PV20', 'gm:GM0014', 'wk:WK001', 'bu:BU001']);
  assert.deepEqual(G.keten(i, 'wp:WP0003').map((g) => g.id), ['pv:PV20', 'gm:GM1895', 'wp:WP0003']);
  assert.deepEqual(G.keten(i, 'pv:PV20').map((g) => g.id), ['pv:PV20']);
  assert.deepEqual(G.keten(i, 'nergens'), []);
});
t('kiesTaak: de taak met die sleutel het dichtst bij de speler; een onbekende sleutel is niets', () => {
  const i = ind();
  assert.equal(G.kiesTaak(i, 's:kartRaces', 1400, 50), 'a:kart:1');
  assert.equal(G.kiesTaak(i, 's:kartRaces', 5, 5), 'a:kart:2');
  assert.equal(G.kiesTaak(i, 'u:kart', 5, 5), 'a:kart:1', 'één taak met die sleutel: waar je staat doet er niet toe');
  assert.equal(G.kiesTaak(i, 's:kartRaces', NaN, NaN), 'a:kart:1');
  assert.equal(G.kiesTaak(i, 'u:bestaatniet', 0, 0), null);
});

// ------------------------------------------------------------------ het profiel
t('markeer: een taak telt eenmaal; een gebied is klaar als alles erin gedaan is, en dan ook alles erboven dat daarmee klaar is', () => {
  const i = ind(), p = G.nieuwProfiel();
  assert.equal(G.markeer(p, i, 'nepnaam').nieuw, false);
  let r = G.markeer(p, i, 'm:a');
  assert.ok(r.nieuw);
  assert.deepEqual(r.beloningen, []);
  assert.equal(G.markeer(p, i, 'm:a').nieuw, false);
  const v = G.voortgang(p, i, 'bu:BU001');
  assert.equal(v.klaar, 1); assert.equal(v.totaal, 3); assert.equal(v.voltooid, false);
  G.markeer(p, i, 'b:taxi');
  r = G.markeer(p, i, 'a:kart:2');
  assert.deepEqual(r.beloningen.map((b) => b.gebied), ['bu:BU001'], 'alleen de buurt is al klaar; de wijk heeft nog de kart in het Noorderplantsoen');
  r = G.markeer(p, i, 'a:kart:1');
  assert.deepEqual(r.beloningen.map((b) => b.gebied), ['wk:WK001'], 'de buurt Noorderplantsoen heeft maar één ding te doen en is niet te veroveren');
  assert.deepEqual(G.markeer(p, i, 'a:padel:1').beloningen, [], 'de wijk Oosterpoort wil ook nog de boa');
  assert.deepEqual(G.markeer(p, i, 'b:boa').beloningen.map((b) => b.gebied).sort(), ['wk:WK002', 'wp:WP0001'], 'de wijk én de hele woonplaats Groningen zijn dan klaar');
  assert.equal(G.voortgang(p, i, 'wk:WK001').voltooid, true);
  assert.deepEqual(G.markeer(p, i, 'm:a').beloningen, []);
});
t('de hele provincie veroveren: de laatste taak maakt ook de provincie af, en alles wat veroverbaar is is veroverd', () => {
  const i = ind(), p = G.nieuwProfiel();
  let laatste = null;
  for (const id of i.taak.keys()) if (i.perTaak.get(id).includes('pv:PV20')) laatste = G.markeer(p, i, id);
  assert.ok(laatste.beloningen.some((b) => b.gebied === 'pv:PV20'), 'de provincie krijgt zijn beloning');
  assert.equal(G.voortgang(p, i, 'pv:PV20').deel, 1);
  const s = G.samenvatting(p, i);
  assert.equal(s.voltooid, s.totaal, 'alles wat veroverbaar is, is veroverd');
});
t('een gebied met minder dan MIN_TAKEN taken geeft nooit een beloning en staat niet in het overzicht', () => {
  const i = ind(), p = G.nieuwProfiel();
  assert.deepEqual(G.markeer(p, i, 'f:v2').beloningen, []);
  assert.equal(G.voortgang(p, i, 'wk:WK004').voltooid, false);
  const ids = G.overzicht(p, i).flatMap((o) => o.gebieden.map((r) => r.gebied.id));
  assert.ok(!ids.includes('wk:WK004'));
});
t('de beloning: titel per laag, geld oplopend per laag, een vlag in een eigen kleur, een regel', () => {
  const i = ind();
  assert.equal(G.beloningVan(i, 'bu:BU001').titel, 'Buurtheld van Binnenstad');
  assert.equal(G.beloningVan(i, 'wk:WK002').titel, 'Wijkheld van Oosterpoort');
  assert.equal(G.beloningVan(i, 'wp:WP0002').titel, 'Burgemeester van Haren');
  assert.equal(G.beloningVan(i, 'gm:GM1895').titel, 'Gemeentebaas van Oldambt');
  assert.equal(G.beloningVan(i, 'pv:PV20').titel, 'Provinciebaas van Grunn');
  assert.equal(G.beloningVan(i, 'nergens'), null);
  const geld = G.NIVEAUS.map((x) => x.geld);
  assert.deepEqual([...geld].sort((a, b) => b - a), geld, 'groter gebied, meer geld');
  assert.equal(new Set(G.NIVEAUS.map((x) => x.vlag)).size, 5);
  for (const nv of G.NIVEAUS) { assert.match(nv.vlag, /^#[0-9a-f]{6}$/); assert.ok(nv.titel('X').length < 40); }
  assert.equal(G.beloningVan(i, 'bu:BU001').huis, false);
  assert.equal(G.beloningVan(i, 'wk:WK002').huis, true);
  assert.equal(G.beloningVan(i, 'wp:WP0002').huis, true);
  assert.equal(G.beloningVan(i, 'gm:GM1895').huis, false);
});
t('de teksten: Nederlands, rustig, geen geweld en geen echte merken', () => {
  const src = bron('gebieden.js');
  for (const w of ['winter', 'sneeuw', 'schiet', 'doodsl', 'vermoord', 'bloed', 'oorlog']) assert.ok(!src.toLowerCase().includes(w), w);
  const i = ind();
  for (const id of ['bu:BU001', 'wk:WK002', 'wp:WP0002', 'gm:GM1895', 'pv:PV20']) { const b = G.beloningVan(i, id); assert.ok(b.regel.length > 20 && b.regel.length < 120, b.regel); }
});
t('normaliseer: kapot, oud of vreemd geeft een geldig profiel; v1 houdt zijn taken maar niet zijn gebieden', () => {
  for (const raw of [null, undefined, '', '{kapot', 'null', 7, [], { v: 0 }, { v: 3, gedaan: ['x'] }]) assert.deepEqual(G.normaliseer(raw), G.nieuwProfiel());
  const p = G.normaliseer(JSON.stringify({ v: 2, gedaan: ['a', 'a', 5, '', null, 'b'], beloond: 'nee', zaad: true, rommel: 1 }));
  assert.deepEqual(p, { v: 2, gedaan: ['a', 'b'], beloond: [], huizen: [], zaad: true });
  assert.deepEqual(G.normaliseer(JSON.parse(JSON.stringify(p))), p, 'heen en terug is stabiel');
  const v1 = G.normaliseer({ v: 1, gedaan: ['m:a', 'b:taxi'], beloond: ['w:Oosterpark'], huizen: ['h:w:Oosterpark'], zaad: true });
  assert.deepEqual(v1, { v: 2, gedaan: ['m:a', 'b:taxi'], beloond: [], huizen: [] }, 'de oude gebieden bestaan niet meer: opnieuw gezaaid');
  assert.equal(G.normaliseer({ v: 2, gedaan: Array.from({ length: 5000 }, (_, k) => 'x' + k) }).gedaan.length, 2000);
  assert.deepEqual(G.normaliseer({ v: 2, gedaan: ['x'.repeat(200), 'ok'] }).gedaan, ['ok']);
});
t('voegSamen: wat in een van beide gedaan is, is gedaan; de invoer blijft heel', () => {
  const a = { v: 2, gedaan: ['m:a'], beloond: [] }, b = { v: 2, gedaan: ['b:taxi', 'm:a'], beloond: ['bu:BU001'], zaad: true };
  const voor = JSON.stringify([a, b]);
  const m = G.voegSamen(a, JSON.stringify(b));
  assert.deepEqual(m.gedaan.sort(), ['b:taxi', 'm:a']);
  assert.deepEqual(m.beloond, ['bu:BU001']);
  assert.equal(m.zaad, true);
  assert.equal(JSON.stringify([a, b]), voor);
  assert.deepEqual(G.voegSamen(null, '{kapot'), G.nieuwProfiel());
});
t('zaai: een oude speler begint niet bij nul; klaar-gebieden krijgen hun titel zonder geld; het huis erbij', () => {
  const i = ind(), p = G.nieuwProfiel();
  const aantal = G.zaai(p, i, ['m:a', 'u:taxi', 's:kartRaces', 'v:bestaat-niet']);
  assert.equal(aantal, 4, 'm:a, b:taxi en beide karttaken (een teller zonder plek zaait alle plekken)');
  assert.ok(p.zaad);
  assert.ok(p.beloond.includes('bu:BU001') && p.beloond.includes('wk:WK001'));
  assert.ok(p.huizen.includes('h:wk:WK001'));
  assert.deepEqual(G.markeer(p, i, 'b:taxi').beloningen, [], 'al gedaan, al beloond');
  assert.equal(G.zaai(G.nieuwProfiel(), i, []), 0);
});
t('overzicht: per laag, voltooid eerst, dan het verst gevorderd; samenvatting telt mee', () => {
  const i = ind(), p = G.nieuwProfiel();
  G.markeer(p, i, 'a:padel:1');
  for (const id of ['m:a', 'b:taxi', 'a:kart:2']) G.markeer(p, i, id);
  const o = G.overzicht(p, i);
  assert.deepEqual(o.map((x) => x.niveau.id), G.NIVEAUS.map((x) => x.id));
  const buurten = o.find((x) => x.niveau.id === 'buurt');
  assert.equal(buurten.gebieden[0].gebied.id, 'bu:BU001', 'de klaar-buurt staat bovenaan');
  assert.equal(buurten.voltooid, 1);
  const s = G.samenvatting(p, i);
  assert.equal(s.voltooid, 1);
  assert.equal(s.totaal, o.reduce((a, x) => a + x.gebieden.length, 0));
  assert.deepEqual(G.titels(p, i).map((x) => x.titel), ['Buurtheld van Binnenstad']);
});
t('kaartKleur: niets gedaan is niet gekleurd, onderweg loopt van oker naar groen, veroverd heeft de kleur van zijn vlag', () => {
  assert.equal(G.kaartKleur({ veroverbaar: true, deel: 0, voltooid: false }, '#fff'), null);
  assert.equal(G.kaartKleur({ veroverbaar: false, deel: 0.5, voltooid: false }, '#fff'), null);
  const laag = G.kaartKleur({ veroverbaar: true, deel: 0.1, voltooid: false }, '#fff'), hoog = G.kaartKleur({ veroverbaar: true, deel: 0.9, voltooid: false }, '#fff');
  assert.match(laag.kleur, /^rgb\(\d+,\d+,\d+\)$/);
  const rood = (k) => Number(k.kleur.match(/\d+/)[0]);
  assert.ok(rood(laag) > rood(hoog) && hoog.alpha > laag.alpha);
  assert.deepEqual(G.kaartKleur({ veroverbaar: true, deel: 1, voltooid: true }, '#4fb3a6'), { kleur: '#4fb3a6', alpha: 0.3 });
});
t('de tabel van de soorten klopt', () => {
  for (const s of G.SOORTEN) assert.ok(s.naam && s.enkel && s.meer);
  assert.deepEqual(new Set(WERELD.taken.filter((x) => G.soortInfo(x.soort)).map((x) => x.soort)), new Set(['missie', 'baan', 'spel', 'vondst', 'geheim']));
});

// ------------------------------------------------------------------ safehouses (fase 2)
t('huisVan: alleen woonplaatsen en wijken die te veroveren zijn; een verzonnen adres dat bij het gebied blijft', () => {
  const i = ind();
  for (const id of ['pv:PV20', 'gm:GM0014', 'bu:BU001']) assert.equal(G.huisVan(i, id), null, id + ' heeft geen woning');
  assert.equal(G.huisVan(i, 'wk:WK004'), null, 'te weinig te doen');
  assert.equal(G.huisVan(i, 'w:nergens'), null);
  const h = G.huisVan(i, 'wk:WK002');
  assert.equal(h.id, 'h:wk:WK002');
  assert.equal(h.naam, 'Safehouse Oosterpoort');
  assert.match(h.adres, /^[A-Za-z' ]+ [0-9]{1,2}$/);
  assert.ok(h.makelaar.length > 8);
  assert.deepEqual(G.huisVan(ind(), 'wk:WK002'), h, 'elke keer hetzelfde adres');
  assert.deepEqual(G.huizenLijst(i).map((x) => x.gebied).sort(), ['wk:WK001', 'wk:WK002', 'wp:WP0001', 'wp:WP0002', 'wp:WP0003'].filter((x) => i.gebied.get(x).veroverbaar));
});
t('huisPrijs en koopHuis: de basisprijs van de laag, korting naarmate je meer deed, en alle weigeringen', () => {
  const i = ind(), p = G.nieuwProfiel();
  assert.equal(G.huisPrijs(p, i, 'h:wk:WK002'), G.HUIS_PRIJS.wijk);
  G.markeer(p, i, 'a:padel:1');
  const een = G.huisPrijs(p, i, 'h:wk:WK002');
  assert.ok(een < G.HUIS_PRIJS.wijk && een >= G.HUIS_PRIJS.wijk / 2 && een % 5 === 0, String(een));
  assert.equal(G.huisPrijs(p, i, 'h:pv:PV20'), null);
  assert.ok(G.HUIS_PRIJS.woonplaats > G.HUIS_PRIJS.wijk);
  const q = G.nieuwProfiel();
  assert.deepEqual(G.koopHuis(q, i, 'h:wk:WK002', 100), { ok: false, prijs: 1800, reden: 'geld' });
  assert.deepEqual(G.koopHuis(q, i, 'h:wk:WK002', 5000), { ok: true, prijs: 1800, reden: '' });
  assert.deepEqual(q.huizen, ['h:wk:WK002']);
  assert.equal(G.koopHuis(q, i, 'h:wk:WK002', 5000).reden, 'al');
  assert.equal(G.koopHuis(q, i, 'h:pv:PV20', 5000).reden, 'onbekend');
  assert.equal(G.koopHuis(q, i, 'h:wk:WK001', NaN).ok, false);
});
t('een veroverde wijk of woonplaats geeft de woning cadeau, een buurt of gemeente niet; zaaien ook', () => {
  const i = ind(), p = G.nieuwProfiel();
  for (const id of ['a:padel:1', 'b:boa', 'm:a', 'b:taxi', 'a:kart:2']) G.markeer(p, i, id);
  const r = G.markeer(p, i, 'a:kart:1');
  assert.ok(p.huizen.includes('h:wk:WK001') && p.huizen.includes('h:wk:WK002'));
  assert.ok(!p.huizen.some((h) => h.startsWith('h:bu:')));
  assert.equal(G.koopHuis(p, i, 'h:wk:WK001', 5000).reden, 'al', 'cadeau: niet nog eens kopen');
  assert.ok(r.beloningen.find((b) => b.gebied === 'wk:WK001').huis);
  const q = G.nieuwProfiel();
  G.zaai(q, i, ['m:a', 'u:taxi', 's:kartRaces']);
  assert.ok(q.huizen.includes('h:wk:WK001'));
});
t('huizen in het profiel: genormaliseerd, samengevoegd en oude profielen zonder huizen blijven geldig', () => {
  assert.deepEqual(G.normaliseer({ v: 2, gedaan: ['a'], beloond: [] }).huizen, []);
  assert.deepEqual(G.normaliseer({ v: 2, huizen: ['h:x', 'h:x', 5, ''] }).huizen, ['h:x']);
  assert.deepEqual(G.voegSamen({ v: 2, huizen: ['h:a'] }, { v: 2, huizen: ['h:b', 'h:a'] }).huizen.sort(), ['h:a', 'h:b']);
});
t('inrichting: vijf stappen die meegroeien met de voortgang; de laatste pas als alles gedaan is', () => {
  assert.equal(G.inrichting(0, false).niveau, 0);
  assert.equal(G.inrichting(0.3, false).niveau, 1);
  assert.equal(G.inrichting(0.5, false).niveau, 2);
  assert.equal(G.inrichting(0.99, false).niveau, 3);
  assert.equal(G.inrichting(0.2, true).niveau, 4);
  assert.equal(G.inrichting(NaN, false).niveau, 0);
  assert.equal(G.inrichting(0, false).stappen.length, 5);
  assert.ok(G.ONDERDUIK_UREN.every((u, k, a) => k === 0 || u <= a[k - 1]));
});
t('de woningen zijn verzonnen: geen echte makelaars en geen geweld in de teksten', () => {
  const src = bron('gebieden.js');
  const blok = src.slice(src.indexOf('// --- safehouses'));
  for (const w of ['schiet', 'bloed', 'moord', 'wapen', 'inbraak']) assert.ok(!blok.toLowerCase().includes(w), w);
  for (const echt of ['Funda', 'Pararius', 'Jaap', 'Rabobank']) assert.ok(!blok.includes(echt), echt);
});

// ------------------------------------------------------------------ de haken van het spel
function nepOpslag(vooraf = {}) {
  const m = new Map(Object.entries(vooraf)), log = [];
  return { m, log, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { log.push(k); m.set(k, String(v)); }, removeItem: (k) => m.delete(k) };
}
const nepWereld = (x = 0, y = 0) => ({ money: 100, player: { x, y }, berichten: [], addMessage(tekst, d, o) { this.berichten.push({ t: tekst, o }); } });
const bronVan = (bekend = () => new Set(), wereld = WERELD) => () => ({ ...wereld, grenzen: GRENZEN(), bekend });
function begin(st, b = bronVan(), gate = null) { Live.initGebieden({ gate, bron: b, opslag: st }); }

t('de sleutel is eigen en nieuw: gde-gebieden-v1, buiten elke savegame en verhaallijn', () => {
  assert.equal(BASE_KEYS.gebieden, 'gde-gebieden-v1');
  assert.equal(KEYS.gebieden, 'gde-gebieden-v1');
  for (const [k, v] of Object.entries(KEYS)) if (k !== 'gebieden') assert.notEqual(v, KEYS.gebieden);
  assert.ok(!/gebieden/i.test(bron('savegame.js') + bron('coopsave.js')), 'de voortgang staat niet in een savegame');
});
t('opSleutel: de taak bij de speler is gedaan, de voortgang komt als kaartje voor het kleinste gebied, een tweede keer niets', () => {
  const st = nepOpslag(); begin(st);
  const w = nepWereld(5, 5);
  assert.deepEqual(Live.opSleutel(w, 'm:a'), []);
  assert.equal(w.berichten.length, 1);
  assert.equal(w.berichten[0].t, '1 van 3 gedaan');
  assert.equal(w.berichten[0].o.kicker, 'Veroveren: Binnenstad', 'de buurt: het kleinste gebied dat te veroveren is');
  Live.opSleutel(w, 'm:a');
  assert.equal(w.berichten.length, 1, 'niets nieuws, dus geen kaartje');
  assert.deepEqual(Live.getProfiel().gedaan, ['m:a']);
});
t('de laatste taak van een buurt: titel, geld en een kaartje, één keer', () => {
  const st = nepOpslag(); begin(st);
  const w = nepWereld(5, 5);
  Live.opSleutel(w, 'm:a'); Live.gebiedenOpUniek(w, 'taxi');
  const voor = w.money;
  const b = Live.gebiedenOpStat(w, 'kartRaces');
  assert.deepEqual(b.map((x) => x.titel), ['Buurtheld van Binnenstad']);
  assert.equal(w.money, voor + 80);
  const kaart = w.berichten.at(-1);
  assert.match(kaart.t, /Buurtheld van Binnenstad! .*\+€80/);
  assert.equal(kaart.o.key, 'gebied-bu:BU001');
  Live.gebiedenOpStat(w, 'kartRaces'); Live.gebiedenOpUniek(w, 'taxi');
  assert.equal(w.money, voor + 80, 'nooit twee keer betaald');
});
t('een teller met meer plekken telt de plek bij de speler: de kart bij Noorderplantsoen, niet die bij Binnenstad', () => {
  const st = nepOpslag(); begin(st);
  Live.gebiedenOpStat(nepWereld(1450, 80), 'kartRaces');
  assert.deepEqual(Live.getProfiel().gedaan, ['a:kart:1']);
});
t('vondsten en loopbaanplekken tellen via hun eigen sleutel', () => {
  const st = nepOpslag(); begin(st);
  const w = nepWereld(13000, 5000);
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
  assert.ok(p.beloond.includes('bu:BU001'));
  assert.equal(w.money, voor);
  let nogEens = 0;
  Live.zetVoorTest(JSON.stringify(p), st, bronVan(() => { nogEens++; return new Set(['v:ver']); }));
  Live.getIndeling();
  assert.equal(nogEens, 0, 'een profiel dat al gezaaid is, zaait niet opnieuw');
});
t('een oud profiel (v1) krijgt zijn taken mee en wordt opnieuw gezaaid met de echte gebieden', () => {
  const st = nepOpslag({ [KEYS.gebieden]: JSON.stringify({ v: 1, gedaan: ['m:a', 'b:taxi', 'a:kart:2', 'a:kart:1'], beloond: ['w:Oosterpark'], huizen: ['h:w:Oosterpark'], zaad: true }) });
  begin(st);
  assert.deepEqual(Live.getProfiel().gedaan, ['m:a', 'b:taxi', 'a:kart:2', 'a:kart:1']);
  assert.deepEqual(Live.getProfiel().beloond, []);
  assert.ok(!Live.getProfiel().zaad);
  Live.getIndeling();
  assert.ok(Live.getProfiel().beloond.includes('wk:WK001'), 'wat al klaar was heeft nu zijn titel in de nieuwe indeling');
});
t('nieuwe grenzen (ze komen later binnen) geven klaar-gebieden hun titel zonder geld, en het eerder gedane blijft', () => {
  const st = nepOpslag(); const w = nepWereld(13000, 5000);
  let b = () => ({ taken: WERELD.taken, grenzen: null, bekend: () => new Set() });
  begin(st, b);
  Live.getIndeling(0);
  Live.opSleutel(w, 'u:bus');
  Live.opSleutel(w, 'v:v1');
  const geld = w.money;
  const p = Live.getProfiel();
  assert.deepEqual(p.gedaan.sort(), ['b:bus', 'f:v1'], 'ook zonder grenzen onthouden');
  assert.deepEqual(p.beloond, []);
  b = bronVan();
  Live.zetVoorTest(JSON.stringify(p), st, b);
  Live.getIndeling(1e9);
  assert.ok(Live.getProfiel().beloond.includes('wp:WP0002'));
  assert.equal(w.money, geld, 'een titel, geen geld');
});
t('opslag: een schrijfactie op de eigen sleutel; kapot en leeg geven een leeg profiel; voegt een tweede tabblad samen', () => {
  const st = nepOpslag(); begin(st);
  Live.opSleutel(nepWereld(5, 5), 'm:a');
  assert.deepEqual(st.log, []);
  Live.schrijfNu();
  assert.deepEqual(st.log, [KEYS.gebieden]);
  assert.deepEqual(JSON.parse(st.m.get(KEYS.gebieden)).gedaan, ['m:a']);
  assert.equal(JSON.parse(st.m.get(KEYS.gebieden)).v, 2);
  st.m.set(KEYS.gebieden, JSON.stringify({ v: 2, gedaan: ['b:taxi'], beloond: [], huizen: [] }));
  Live.opSleutel(nepWereld(5, 5), 'a:kart:2'); Live.opSleutel(nepWereld(5, 5), 's:kartRaces');
  Live.schrijfNu();
  assert.deepEqual(JSON.parse(st.m.get(KEYS.gebieden)).gedaan.sort(), ['a:kart:2', 'b:taxi', 'm:a']);
  assert.deepEqual(st.log.filter((k) => k !== KEYS.gebieden), []);
  for (const raw of ['{kapot', '', 'null', JSON.stringify({ v: 0 }), JSON.stringify({ v: 2, gedaan: 'x' })]) {
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
t('koopHuisLive: geld eraf, huis erbij, weigering bij te weinig geld', () => {
  const st = nepOpslag(); begin(st);
  const w = nepWereld(); w.money = 5000;
  const r = Live.koopHuisLive(w, 'h:wk:WK001');
  assert.deepEqual([r.ok, r.prijs], [true, 1800]);
  assert.equal(w.money, 3200);
  assert.ok(Live.heeftHuisLive('h:wk:WK001'));
  w.money = 10;
  assert.equal(Live.koopHuisLive(w, 'h:wk:WK002').reden, 'geld');
  assert.equal(w.money, 10);
  assert.equal(Live.koopHuisLive(null, 'h:wk:WK002').ok, false);
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
t('de haken staan op hun plek: loopbaanTel, loopbaanOpStat, de vondsten, het tikken, de grenzen en de kaart', () => {
  const lb = bron('loopbaanlive.js');
  assert.ok(lb.includes('gebiedenOpUniek(w, opties.uniek)') && lb.includes('gebiedenOpStat(w, key)'));
  assert.ok(bron('achievements.js').includes('uniekListener(world, key, value)'));
  const tr = bron('achievementtracker.js');
  for (const s of ['initGebieden({ gate: achievementsGated', 'setUniekListener(gebiedenOpVondst)', 'updateGebieden(dt, w,']) assert.ok(tr.includes(s), s);
  assert.ok(bron('mapview.js').includes("layerOn('veroverd')"));
  assert.ok(bron('loopbaanui.js').includes('gebiedenHtml'));
  const gb = bron('gebiedenbronnen.js');
  assert.ok(gb.includes("'grenzen.json'") && gb.includes('ontvouw'), 'de bronnen laden game/grenzen.json');
  assert.ok(!gb.includes('neighbourhoodPoints') && !gb.includes('STREKEN'), 'de oude indeling (wijkpunten en streken) is weg');
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
  heeft('safehuizen.js', 'isInWater', 'een huisje staat nooit in het water');
  heeft('safehuizen.js', 'provinceLandAt', 'en nooit in de zee: alleen op het land van de provincie');
  heeft('safehuizen.js', 'onbruikbaar', 'een woonplaats zonder droge plek krijgt geen huisje');
  const s = bron('safehuizen.js');
  for (const w of ['winter', 'sneeuw', 'schiet', 'bloed', 'moord']) assert.ok(!s.toLowerCase().includes(w), w);
});
t('de bronnen zijn alleen de bronnen: gebieden.js en gebiedenlive.js importeren geen DOM of spelmodules', () => {
  const imports = (f) => [...bron(f).matchAll(/^import .* from '(.+?)';/gm)].map((m) => m[1]);
  assert.deepEqual(imports('gebieden.js'), ['./grenzen.js']);
  assert.deepEqual(imports('grenzen.js'), []);
  assert.deepEqual(imports('gebiedenlive.js').sort(), ['./finance.js', './gebieden.js', './storagekeys.js']);
  assert.ok(!/document\.|window\./.test(bron('gebieden.js').replace(/\/\/.*$/gm, '')));
});

console.log(`${n - fails}/${n} geslaagd`);
process.exit(fails ? 1 : 0);
