// Loopbaan (#381): de pure regels (loopbaan.js) en de haken van het spel (loopbaanlive.js).
//   node scripts/loopbaan_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject; localStorage bestaat in node niet.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as L from '../game/js/loopbaan.js';
import * as Live from '../game/js/loopbaanlive.js';
import { ACHIEVEMENTS, getStat, isUnlocked } from '../game/js/achievements.js';
import { KEYS, BASE_KEYS } from '../game/js/storagekeys.js';

const JS = fileURLToPath(new URL('../game/js/', import.meta.url));
let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

// ------------------------------------------------------------------ de tabel
t('de vakken: unieke id\'s, een bekende groep, zes verschillende titels van een kaartlengte', () => {
  assert.equal(L.VAKKEN.length, 19);
  assert.equal(new Set(L.VAK_IDS).size, L.VAK_IDS.length);
  const groepen = new Set(L.GROEPEN.map((g) => g.id));
  const titels = new Set();
  for (const v of L.VAKKEN) {
    assert.ok(groepen.has(v.groep), `${v.id}: groep`);
    assert.equal(v.titels.length, L.MAX_NIVEAU, `${v.id}: zes titels`);
    for (const x of v.titels) {
      assert.ok(x.length >= 3 && x.length <= 26, `${v.id}: titel '${x}' past op een kaartje (${x.length} tekens)`);
      assert.ok(!titels.has(x), `titel '${x}' komt twee keer voor`);
      titels.add(x);
    }
    assert.ok(v.naam && v.icoon && v.eenheid && v.uniek && v.wat, `${v.id}: alle velden`);
  }
  for (const g of L.GROEPEN) assert.ok(L.VAKKEN.some((v) => v.groep === g.id), `groep ${g.id} is niet leeg`);
});

t('de drempels stijgen, de loonfactor stijgt en blijft binnen +30%', () => {
  assert.equal(L.XP_DREMPELS.length, L.MAX_NIVEAU);
  assert.equal(L.LOON_FACTOR.length, L.MAX_NIVEAU);
  assert.equal(L.XP_DREMPELS[0], 0);
  assert.equal(L.LOON_FACTOR[0], 1, 'niveau 1 betaalt precies wat het spel altijd betaalde');
  for (let i = 1; i < L.MAX_NIVEAU; i++) { assert.ok(L.XP_DREMPELS[i] > L.XP_DREMPELS[i - 1]); assert.ok(L.LOON_FACTOR[i] > L.LOON_FACTOR[i - 1]); }
  assert.ok(L.LOON_FACTOR[L.MAX_NIVEAU - 1] <= 1.3 + 1e-9);
});

t('niveauVan: op de drempel omhoog, nooit onder 1 of boven het maximum', () => {
  assert.equal(L.niveauVan(0), 1); assert.equal(L.niveauVan(-5), 1); assert.equal(L.niveauVan(NaN), 1);
  for (let i = 0; i < L.MAX_NIVEAU; i++) {
    assert.equal(L.niveauVan(L.XP_DREMPELS[i]), i + 1);
    if (i > 0) assert.equal(L.niveauVan(L.XP_DREMPELS[i] - 1), i);
  }
  assert.equal(L.niveauVan(1e9), L.MAX_NIVEAU);
});

t('titels en factoren per niveau, ook buiten het bereik', () => {
  assert.equal(L.titelVan('trein', 1), 'Perronstaander');
  assert.equal(L.titelVan('trein', 99), L.VAKKEN[0].titels[5]);
  assert.equal(L.titelVan('trein', 0), 'Perronstaander');
  assert.equal(L.titelVan('bestaatniet', 3), '');
  assert.equal(L.factorVoorNiveau(0), 1); assert.equal(L.factorVoorNiveau(99), 1.3);
  assert.equal(L.percentage(1.16), 16);
});

// ------------------------------------------------------------------ tellen
t('tel: de teller, de punten en een niveau omhoog', () => {
  const p = L.nieuwProfiel();
  let r = L.tel(p, 'trein', { n: 12.5, xp: 25 });
  assert.equal(r.xp, 25); assert.equal(r.omhoog, null);
  assert.equal(p.vakken.trein.n, 12.5);
  r = L.tel(p, 'trein', { n: 5, xp: 30 });
  assert.deepEqual(r.omhoog, { vak: 'trein', van: 1, naar: 2, titel: 'Vaste reiziger' });
  assert.equal(L.niveauVoorVak(p, 'trein'), 2);
  r = L.tel(p, 'trein', { xp: 1000 });
  assert.equal(r.omhoog.naar, L.MAX_NIVEAU, 'een grote sprong geeft één melding met het bereikte niveau');
});

t('tel: een nieuwe plek geeft eenmalig extra punten; dezelfde plek niet nog eens', () => {
  const p = L.nieuwProfiel();
  assert.equal(L.tel(p, 'padel', { xp: 10, uniek: 'baan-1' }).xp, 10 + L.UNIEK_XP);
  assert.equal(L.tel(p, 'padel', { xp: 10, uniek: 'baan-1' }).xp, 10);
  assert.equal(L.tel(p, 'padel', { xp: 10, uniek: 'baan-2' }).xp, 10 + L.UNIEK_XP);
  assert.deepEqual(p.vakken.padel.uniek, ['baan-1', 'baan-2']);
  assert.equal(L.tel(p, 'padel', { uniek: 'x'.repeat(200) }).xp, 0, 'een te lange naam telt niet als plek');
});

t('tel: onzin verandert niets en gooit niet', () => {
  const p = L.nieuwProfiel();
  const voor = JSON.stringify(p);
  for (const o of [{ n: NaN, xp: NaN }, { n: -5, xp: -9 }, { n: Infinity, xp: undefined }, { uniek: 7 }, {}, undefined]) L.tel(p, 'bus', o);
  assert.equal(JSON.stringify(p), voor);
  assert.deepEqual(L.tel(p, 'bestaatniet', { xp: 50 }), { xp: 0, omhoog: null });
  assert.equal(JSON.stringify(p), voor);
});

t('tel: de limieten houden het profiel klein', () => {
  const p = L.nieuwProfiel();
  for (let i = 0; i < 500; i++) L.tel(p, 'padel', { uniek: 'baan-' + i });
  assert.ok(p.vakken.padel.uniek.length <= 120);
  L.tel(p, 'padel', { xp: 1e12, n: 1e12 });
  assert.ok(p.vakken.padel.xp <= 100000 && p.vakken.padel.n <= 1e7);
});

t('kilometers: meters in, km en punten volgens het vak', () => {
  assert.deepEqual(L.kmPunten('trein', 12000), { n: 12, xp: 18 });
  assert.deepEqual(L.kmPunten('bus', 1000), { n: 1, xp: 3 });
  assert.deepEqual(L.kmPunten('padel', 5000), { n: 5, xp: 0 });
  assert.deepEqual(L.kmPunten('bus', -50), { n: 0, xp: 0 });
});

// ------------------------------------------------------------------ loon
t('loon: niveau 1 betaalt het basisbedrag, hogere niveaus meer, nooit 0 voor een echt bedrag', () => {
  const p = L.nieuwProfiel();
  assert.equal(L.loon(p, 'padel', 200), 200);
  p.vakken.padel.xp = L.XP_DREMPELS[5];
  assert.equal(L.loon(p, 'padel', 200), 260);
  assert.equal(L.loon(p, 'padel', 1), 1);
  assert.equal(L.loon(p, 'padel', 0), 0); assert.equal(L.loon(p, 'padel', -4), 0); assert.equal(L.loon(p, 'padel', NaN), 0);
  assert.equal(L.loon(p, 'bestaatniet', 100), 100, 'een onbekend vak betaalt gewoon');
});

t('volgendDoel: titel, punten en deel; op het hoogste niveau geen volgend doel', () => {
  const p = L.nieuwProfiel();
  let d = L.volgendDoel(p, 'bus');
  assert.equal(d.niveau, 1); assert.equal(d.nodig, 50); assert.equal(d.deel, 0); assert.equal(d.volgend, 'Invalchauffeur'); assert.equal(d.extra, 5);
  p.vakken.bus.xp = 95;
  d = L.volgendDoel(p, 'bus');
  assert.equal(d.niveau, 2); assert.equal(d.nodig, 45); assert.equal(d.deel, 0.5);
  p.vakken.bus.xp = 5000;
  d = L.volgendDoel(p, 'bus');
  assert.equal(d.volgend, null); assert.equal(d.deel, 1); assert.equal(d.nodig, 0);
});

t('tellerTekst en samenvatting', () => {
  const p = L.nieuwProfiel();
  assert.equal(L.tellerTekst(p, 'padel'), '0 potjes');
  p.vakken.padel.n = 1; assert.equal(L.tellerTekst(p, 'padel'), '1 potje');
  p.vakken.trein.n = 86.4; assert.equal(L.tellerTekst(p, 'trein'), '86 km');
  assert.equal(L.samenvatting(p).hoogste, null);
  L.tel(p, 'padel', { xp: 60 });
  const s = L.samenvatting(p);
  assert.equal(s.hoogste.vak, 'padel'); assert.equal(s.hoogste.titel, 'Clublid'); assert.equal(s.som, 19 + 1); assert.equal(s.max, 114); assert.equal(s.aantal, 1);
});

// ------------------------------------------------------------------ de banen
const bronIds = () => {
  const ids = new Set();
  const uit = (f, re) => { const s = fs.readFileSync(JS + f, 'utf8'); for (const m of s.matchAll(re)) ids.add(m[1]); };
  for (const f of fs.readdirSync(JS).filter((x) => /^sidejob_(?!keuze|bijbaan|paneel|stad|kit|voice)[a-z]+\.js$/.test(x))) uit(f, /^\s*id: '([a-z]+)',/gm);
  uit('keuzewerk.js', /^\s*id: '([a-z]+)',/gm);
  uit('bijbaanregels.js', /^\s*id: '([a-z]+)', naam:/gm);
  uit('sidejob_stad.js', /^\s{2}(museumbus|suikerbieten|herstelploeg|oogtv|telefoonrave|vandermeden|schouwburg|bernardrit)\b/gm);
  uit('zeeschipvaart.js', /^\s*id: '([a-z]+)',/gm); // de zeeschip-bijbanen (#438): hun id staat bij de haven
  return ids;
};
t('elke bijbaan uit de bron heeft een vak, en elke baan in de tabel bestaat echt', () => {
  const ids = bronIds();
  assert.ok(ids.size >= 25, `genoeg banen gevonden (${ids.size})`);
  for (const id of ids) assert.ok(L.BAAN_IDS.includes(id) || id === 'veerdienst', `baan '${id}' staat niet in BAAN_VAK`);
  for (const id of L.BAAN_IDS) assert.ok(ids.has(id) || ['museumbus', 'suikerbieten', 'herstelploeg', 'oogtv', 'telefoonrave', 'vandermeden', 'schouwburg', 'bernardrit'].includes(id), `'${id}' in BAAN_VAK bestaat niet als baan`);
});

t('vakVanBaan: een onbekende baan is een klus; banenVan verdeelt alle banen over de vakken', () => {
  assert.equal(L.vakVanBaan('lijn'), 'bus'); assert.equal(L.vakVanBaan('taxi'), 'taxi'); assert.equal(L.vakVanBaan('iets-nieuws'), 'klus');
  const alle = L.VAK_IDS.flatMap((v) => L.banenVan(v));
  assert.equal(alle.length, L.BAAN_IDS.length); assert.equal(new Set(alle).size, alle.length);
  for (const id of L.BAAN_IDS) assert.ok(L.vakInfo(L.vakVanBaan(id)), id);
  assert.equal(L.vakVanUitdaging('bruggen'), 'race'); assert.equal(L.vakVanUitdaging('fjord'), 'horeca'); assert.equal(L.vakVanUitdaging('onbekend'), 'buiten');
});

t('de prestatie-tellers die een vak voeden bestaan echt in het spel', () => {
  const bron = fs.readdirSync(JS).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(JS + f, 'utf8')).join('\n');
  for (const [key, r] of Object.entries(L.STAT_VAK)) {
    assert.ok(L.vakInfo(r.vak), `${key}: vak`);
    assert.ok(new RegExp(`recordStat\\([a-zA-Z.]+, '${key}'`).test(bron), `${key} wordt nergens geteld`);
    assert.ok(Number.isInteger(r.xp) && r.xp > 0 && r.n > 0 && (r.premie === undefined || (Number.isInteger(r.premie) && r.premie > 0 && r.premie <= 40)), `${key}: getallen`);
  }
});

// ------------------------------------------------------------------ oud, leeg en kapot
t('normaliseer: leeg, oud en kapot geven een geldig profiel zonder te gooien', () => {
  for (const raw of [null, undefined, '', '{', 'null', '[]', '42', { v: 2, vakken: {} }, { v: 1 }, { v: 1, vakken: 5 }, { v: 1, vakken: [] }, true, () => 1]) {
    const p = L.normaliseer(raw);
    assert.equal(p.v, 1);
    assert.deepEqual(Object.keys(p.vakken), L.VAK_IDS);
    for (const id of L.VAK_IDS) assert.deepEqual(p.vakken[id], { xp: 0, n: 0, uniek: [] });
  }
});

t('normaliseer: bewaart wat klopt, begrenst en negeert de rest', () => {
  const p = L.normaliseer(JSON.stringify({ v: 1, vakken: { trein: { xp: 120.9, n: 33, uniek: ['Haren', 'Haren', 7, '', 'Zuidhorn'] }, padel: { xp: -5, n: 'veel' }, onbekend: { xp: 9 }, bus: null, golf: { xp: 1e99, n: 1e99 } }, rommel: 1 }));
  assert.equal(p.vakken.trein.xp, 120); assert.equal(p.vakken.trein.n, 33); assert.deepEqual(p.vakken.trein.uniek, ['Haren', 'Zuidhorn']);
  assert.equal(p.vakken.padel.xp, 0); assert.equal(p.vakken.padel.n, 0);
  assert.equal(p.vakken.golf.xp, 100000); assert.equal(p.vakken.golf.n, 1e7);
  assert.ok(!('onbekend' in p.vakken)); assert.ok(!('rommel' in p));
  assert.deepEqual(L.normaliseer(JSON.parse(JSON.stringify(p))), p, 'heen en terug is stabiel');
});

t('zaaiUitPrestaties: wie al lang speelt begint niet bij nul, maar hooguit op niveau 3', () => {
  const leeg = L.zaaiUitPrestaties({}, {});
  for (const id of L.VAK_IDS) assert.equal(L.niveauVoorVak(leeg, id), 1);
  assert.equal(leeg.zaad, true);
  const veel = L.zaaiUitPrestaties({ trainTrips: 500, padelMatches: 400, kartRaces: 9, nietsvanbelang: 5, driftRuns: -3, regatta: 'x' }, { trainStations: ['Haren', 'Zuidhorn', 7] });
  assert.equal(L.niveauVoorVak(veel, 'padel'), 3); assert.equal(veel.vakken.padel.xp, L.ZAAD_MAX_XP); assert.equal(veel.vakken.padel.n, 400);
  assert.equal(L.niveauVoorVak(veel, 'trein'), 3); assert.deepEqual(veel.vakken.trein.uniek, ['Haren', 'Zuidhorn']);
  assert.equal(veel.vakken.race.xp, 45, 'kart telt mee, drift (negatief) en regatta (tekst) niet');
  assert.equal(L.niveauVoorVak(veel, 'bus'), 1, 'wat de prestaties niet telden blijft op niveau 1');
  assert.doesNotThrow(() => L.zaaiUitPrestaties(null, null));
});

t('voegSamen: per vak het grootste (een tweede tabblad schreef ook)', () => {
  const a = L.nieuwProfiel(), b = L.nieuwProfiel();
  a.vakken.bus.xp = 100; b.vakken.bus.xp = 60; b.vakken.bus.uniek = ['lijn'];
  b.vakken.padel.n = 4; a.vakken.padel.xp = 7;
  const m = L.voegSamen(a, JSON.stringify(b));
  assert.equal(m.vakken.bus.xp, 100); assert.deepEqual(m.vakken.bus.uniek, ['lijn']); assert.equal(m.vakken.padel.n, 4); assert.equal(m.vakken.padel.xp, 7);
  assert.equal(L.voegSamen(a, 'kapot').vakken.bus.xp, 100);
});

t('gastBedrag: de gast verdient volgens zijn eigen niveau over het deel van de gastheer', () => {
  const gast = L.nieuwProfiel();
  assert.equal(L.gastBedrag(gast, 100, 'bus'), 100);
  gast.vakken.bus.xp = L.XP_DREMPELS[5];
  assert.equal(L.gastBedrag(gast, 100, 'bus'), 130);
  assert.equal(L.gastBedrag(gast, 100, 'taxi'), 100, 'een ander vak, een ander niveau');
  assert.equal(L.gastBedrag(gast, 100, ''), 100); assert.equal(L.gastBedrag(gast, 100, 'bestaatniet'), 100);
});

// ------------------------------------------------------------------ opslag
t('de sleutel: eigen gde-sleutel, niet in een savegame, geen kopie van een andere', () => {
  assert.equal(BASE_KEYS.loopbaan, 'gde-loopbaan-v1');
  assert.equal(KEYS.loopbaan, 'gde-loopbaan-v1', 'geen -nieuw-achtervoegsel: de loopbaan hoort niet bij een verhaallijn');
  for (const [k, v] of Object.entries(KEYS)) if (k !== 'loopbaan') assert.notEqual(v, KEYS.loopbaan);
  const savegame = fs.readFileSync(JS + 'savegame.js', 'utf8') + fs.readFileSync(JS + 'coopsave.js', 'utf8');
  assert.ok(!/loopbaan/i.test(savegame), 'de loopbaan zit niet in de savegame-code');
});

function nepOpslag(start = {}) {
  const m = new Map(Object.entries(start));
  const log = [];
  return { m, log, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { log.push(k); m.set(k, String(v)); }, removeItem: (k) => m.delete(k) };
}
const nepWereld = () => ({ money: 0, msgs: [], gedeeld: [], addMessage(text, d, o) { this.msgs.push({ text, o }); }, coopDeel(b, info) { this.gedeeld.push({ b, info }); } });
const schoon = () => Live.zetProfielVoorTest(null, null);

t('een eerste keer zaait uit de prestaties en schrijft alleen de eigen sleutel', () => {
  const st = nepOpslag({ 'gde-save-v1-nieuw': 'SAVE', 'gde-settings': 'S', 'gde-prestaties-v1-nieuw': 'P' });
  const p = Live.initLoopbaan({ opslag: st, snapshot: () => ({ stats: { padelMatches: 30 }, sets: {} }) });
  assert.equal(p.vakken.padel.xp, L.ZAAD_MAX_XP);
  assert.deepEqual(st.log, [KEYS.loopbaan], 'precies één schrijfactie, op de eigen sleutel');
  assert.equal(st.m.get('gde-save-v1-nieuw'), 'SAVE'); assert.equal(st.m.get('gde-settings'), 'S'); assert.equal(st.m.get('gde-prestaties-v1-nieuw'), 'P');
  const again = Live.initLoopbaan({ opslag: st, snapshot: () => ({ stats: { padelMatches: 9999 }, sets: {} }) });
  assert.equal(again.vakken.padel.n, 30, 'een tweede keer leest de opslag en zaait niet opnieuw');
  schoon();
});

t('een kapotte of oude opslag geeft een leeg profiel en breekt niets', () => {
  for (const raw of ['{kapot', '', 'null', JSON.stringify({ v: 0 }), JSON.stringify({ v: 1, vakken: { padel: { xp: 'x' } } })]) {
    const st = nepOpslag({ [KEYS.loopbaan]: raw });
    const p = Live.initLoopbaan({ opslag: st, snapshot: () => ({ stats: { padelMatches: 30 }, sets: {} }) });
    assert.equal(p.vakken.padel.xp, 0, 'een bestaande (kapotte) sleutel wordt niet opnieuw gezaaid');
  }
  assert.doesNotThrow(() => Live.initLoopbaan({ opslag: null, snapshot: () => { throw new Error('stuk'); } }));
  assert.doesNotThrow(() => Live.initLoopbaan({ opslag: { getItem() { throw new Error('geblokkeerd'); }, setItem() { throw new Error('vol'); } } }));
  schoon();
});

t('loopbaanVerdien: loon met de eigen factor, punten, een melding bij niveau omhoog, en de gasten krijgen hun deel', () => {
  const st = nepOpslag();
  Live.initLoopbaan({ opslag: st });
  const w = nepWereld();
  assert.equal(Live.loopbaanVerdien(w, 'padel', 200, { xp: 55, n: 1, uniek: 'baan-1' }), 200); // niveau 1: precies het basisbedrag
  assert.equal(w.money, 200);
  assert.deepEqual(w.gedeeld, [{ b: 200, info: { vak: 'padel', basis: 200, xp: 55 } }]);
  const lvl = w.msgs.find((m) => m.o && m.o.kicker === 'Loopbaan');
  assert.ok(lvl, 'een niveau omhoog (55 + 8 punten) geeft een kaartje');
  assert.match(lvl.text, /^Clublid: Padel niveau 2, 5% meer loon$/);
  assert.equal(lvl.o.kind, 'prestatie');
  assert.equal(Live.loopbaanVerdien(w, 'padel', 200, { xp: 1 }), 210, 'nu betaalt het vak 5% meer');
  assert.equal(w.gedeeld[1].info.basis, 200, 'de gast krijgt het deel van het bedrag voor de eigen factor van de gastheer');
  assert.equal(Live.loopbaanVerdien(w, 'padel', 0, { xp: 1, n: 1 }), 0); assert.equal(w.gedeeld.length, 2, 'zonder geld niets te delen');
  assert.equal(Live.loopbaanVerdien(w, 'padel', 100, { deel: false }), 105); assert.equal(w.gedeeld.length, 2);
  schoon();
});

t('de cheat-poort: geen punten meer, wel gewoon loon', () => {
  Live.initLoopbaan({ opslag: nepOpslag(), gate: () => true });
  const w = nepWereld();
  assert.equal(Live.loopbaanVerdien(w, 'bus', 50, { xp: 500, n: 3 }), 50);
  assert.equal(Live.getProfiel().vakken.bus.xp, 0); assert.equal(Live.getProfiel().vakken.bus.n, 0);
  assert.equal(w.msgs.length, 0);
  schoon();
});

t('schrijven: na een tel komt de stand in de eigen sleutel, een tweede tabblad gaat niet verloren, vol geeft geen fout', () => {
  const st = nepOpslag();
  Live.initLoopbaan({ opslag: st });
  const w = nepWereld();
  Live.loopbaanTel(w, 'taxi', { n: 1, xp: 12 });
  Live.schrijfNu();
  assert.equal(JSON.parse(st.m.get(KEYS.loopbaan)).vakken.taxi.xp, 12);
  const ander = L.nieuwProfiel(); ander.vakken.bus.xp = 77; ander.vakken.taxi.xp = 5;
  st.m.set(KEYS.loopbaan, JSON.stringify(ander));
  Live.loopbaanTel(w, 'taxi', { xp: 3 }); Live.schrijfNu();
  const na = JSON.parse(st.m.get(KEYS.loopbaan));
  assert.equal(na.vakken.bus.xp, 77, 'wat het andere tabblad schreef blijft'); assert.equal(na.vakken.taxi.xp, 15);
  st.setItem = () => { throw Object.assign(new Error('vol'), { name: 'QuotaExceededError' }); };
  Live.loopbaanTel(w, 'taxi', { xp: 1 });
  assert.doesNotThrow(() => Live.schrijfNu());
  assert.deepEqual(st.log.filter((k) => k !== KEYS.loopbaan), []);
  schoon();
});

t('loopbaanOpStat: punten en een premie voor een prestatie-teller; onbekende tellers doen niets', () => {
  Live.initLoopbaan({ opslag: nepOpslag() });
  const w = nepWereld();
  Live.loopbaanOpStat(w, 'driven', 12.5); Live.loopbaanOpStat(w, 'trainTrips', 1); Live.loopbaanOpStat(w, 'kartRaces', 0);
  assert.equal(w.money, 0); assert.equal(L.samenvatting(Live.getProfiel()).aantal, 0);
  Live.loopbaanOpStat(w, 'discgolfRounds', 1);
  assert.equal(w.money, 20); assert.equal(Live.getProfiel().vakken.golf.xp, 40);
  assert.ok(w.msgs.some((m) => m.text === 'Premie: €20'));
  Live.loopbaanOpStat(w, 'zwemRuns', 1);
  assert.equal(w.money, 20, 'zwemmen geeft punten maar geen premie'); assert.equal(Live.getProfiel().vakken.buiten.xp, 8);
  schoon();
});

t('loopbaanPrijs: vaste reizigers krijgen korting, niveau 1 betaalt het gewone bedrag', () => {
  const p = L.nieuwProfiel();
  Live.zetProfielVoorTest(p);
  assert.equal(Live.loopbaanPrijs('trein', 8), 8); assert.equal(Live.loopbaanPrijs('trein', 0), 0);
  p.vakken.trein.xp = L.XP_DREMPELS[5];
  Live.zetProfielVoorTest(p);
  assert.equal(Live.loopbaanPrijs('trein', 8), 6); assert.equal(Live.loopbaanPrijs('trein', 4), 3); assert.ok(Live.loopbaanPrijs('trein', 1) >= 1);
  schoon();
});

t('vaardigheden: een niveau geeft een handeling, niet alleen een titel (#437)', () => {
  assert.equal(L.vaardigheidVan('trein', 1), null, 'niveau 1 geeft nog niets extra');
  assert.equal(L.vaardigheidVan('trein', 2).titel, 'Vaste reiziger', 'niveau 2: korting op het kaartje');
  const knip = L.vaardigheidVan('trein', 3);
  assert.equal(knip.titel, 'Kaartjesknipper', 'niveau 3: kaartjes knippen');
  assert.match(knip.wat, /perron/); assert.match(knip.wat, /druk E/);
  assert.equal(L.vaardigheidVan('trein', 6).titel, 'Kaartjesknipper', 'de hoogste blijft daarna gelden');
  assert.equal(L.vaardigheidVan('padel', 6), null, 'een vak zonder eigen handeling geeft null');
  assert.equal(L.vaardigheidVan('onbekend', 3), null, 'een onbekend vak geeft null');
  for (const [vak, lijst] of Object.entries(L.VAARDIGHEDEN)) {
    assert.ok(L.vakInfo(vak), `${vak}: bekend vak`);
    for (const v of lijst) {
      assert.ok(v.niveau >= 1 && v.niveau <= L.MAX_NIVEAU, `${vak}: niveau binnen de trap`);
      assert.ok(v.titel && v.wat && v.titel.length <= 26, `${vak}: korte titel en uitleg`);
      assert.equal(v.titel, L.titelVan(vak, v.niveau), `${vak} ${v.niveau}: de titel van dat niveau`);
    }
  }
});

t('een niveau met een handeling zegt wat je nu kunt (#437)', () => {
  Live.initLoopbaan({ opslag: nepOpslag() });
  const w = nepWereld();
  Live.loopbaanTel(w, 'trein', { xp: L.XP_DREMPELS[2] }); // van niveau 1 naar 3: Kaartjesknipper
  const kaart = w.msgs.find((m) => m.o && m.o.kind === 'prestatie');
  const tip = w.msgs.find((m) => m.o && m.o.kind === 'tip');
  assert.ok(kaart && kaart.text.startsWith('Kaartjesknipper:'), 'het kaartje van het niveau');
  assert.ok(tip && tip.text.startsWith('Kaartjesknipper: ') && /perron/.test(tip.text), 'de tip noemt het perron');
  assert.equal(tip.o.key, 'loopbaan-kan-trein');
  schoon();
});

t('de volledige dienst als machinist hoort bij Spoor, met de stand als hij loopt (#437)', () => {
  const leeg = L.dienstTekst(null);
  assert.match(leeg, /Dienst als machinist/);
  assert.match(leeg, /druk dan G/);
  assert.match(leeg, /telt mee voor Spoor/);
  const stops = [{ name: 'Haren', done: true }, { name: 'Zuidhorn', done: false, next: true }, { name: 'Grijpskerk', done: false }];
  assert.equal(L.dienstTekst({ stops }), 'Dienst als machinist: 1 van 3 halten klaar, volgende Zuidhorn.');
  assert.match(L.dienstTekst({ stops: [stops[0]] }), /laatste halte/);
  assert.match(L.dienstTekst({ stops: [] }), /stap bij de cabine/, 'een lege dienst valt terug op de uitleg');
  assert.match(L.dienstTekst({ stops: 'kapot' }), /stap bij de cabine/, 'onzin valt terug op de uitleg');
  assert.match(L.startVan('trein').klus, /machinist/);
  assert.match(L.startVan('trein').klus, /druk E en dan G/);
});

t('elke loopbaan heeft een weg naar de volgende klus (#435)', () => {
  const ui = fs.readFileSync(JS + 'loopbaanui.js', 'utf8');
  // per bezigheid die je nu kunt doen staat er één knop die het doel zet: de waypoint in het spel
  assert.match(ui, /data-todo-goal="job:\$\{esc\(b\)\}"/, 'de knop zet de bijbaan als doel (waypoint)');
  assert.match(ui, /lb-volg">Volgende klus<\/span>/, 'de volgende klus heeft een eigen label');
  // en de kaart-van-de-loopbaan zet de eerste klus als doel als je nog niets koos
  assert.match(ui, /data-todo-goal="job:\$\{esc\(s\.baan\)\}">Eerste klus als doel/, 'ook zonder keuze is er een eerste klus');
  const pm = fs.readFileSync(JS + 'pausemenu.js', 'utf8');
  assert.match(pm, /if \(panel && tab === 'loopbaan' && todoClick\(e, world, panel, todoApi\)\) return;/, 'de klikken van de loopbaan gaan naar dezelfde todo-afhandeling');
  const td = fs.readFileSync(JS + 'todoui.js', 'utf8');
  assert.match(td, /const goal = t\.closest\('\[data-todo-goal\]'\)/, 'en die kent data-todo-goal');
  // Veroverd hoort bij Verhaal, niet bij Loopbaan
  assert.match(pm, /verhaal: \[\['opdrachten', 'Opdrachten'\], \['personages', 'Personages'\], \['aanwijzingen', 'Aanwijzingen'\]/, 'Verhaal heeft zijn eigen tabbladen');
  assert.match(pm, /\['veroverd', 'Veroverd', /, 'Veroverd is een eigen railrij (#676)');
  assert.ok(!/data-sub="veroverd"/.test(pm) && !/'loopbaan'[^\n]*'Veroverd'/.test(pm), 'Veroverd staat niet onder Loopbaan');
});

// (#671) de eerstvolgende stap in gewone taal: hoeveel punten nog, hoeveel nieuwe plekken of rondes dat is,
// waar je die doet, en dat de regel uit het eigen profiel komt (dus per speler anders bij Samen spelen)
t('#671: volgendeStap zegt in gewone taal wat de eerstvolgende stap is en waar', () => {
  const p = L.nieuwProfiel();
  const golf = L.volgendeStap(p, 'golf');
  assert.equal(golf.niveau, 1);
  assert.equal(golf.volgendNiveau, 2);
  assert.equal(golf.nodig, 50);
  assert.equal(golf.plekken, Math.ceil(50 / L.UNIEK_XP), 'nieuwe banen: 8 punten per plek');
  assert.equal(golf.rondes, Math.ceil(50 / 40), 'discgolf geeft 40 punten per ronde');
  assert.match(golf.tekst, /^Nog 50 punten tot niveau 2 \(/);
  assert.match(golf.tekst, new RegExp(`${Math.ceil(50 / L.UNIEK_XP)} banen`), golf.tekst);
  assert.match(golf.tekst, new RegExp(`${Math.ceil(50 / 40)} rondes`), golf.tekst);
  assert.equal(golf.plek, 'Het Stadspark of een golfbaan', 'waar je het doet');
  const taxi = L.volgendeStap(p, 'taxi');
  assert.equal(taxi.waar, 'taxi', 'de eerste nog niet gedane baan van het vak');
  assert.match(taxi.tekst, /diensten of \d+ ritten/, taxi.tekst);
  const trein = L.volgendeStap(p, 'trein');
  assert.match(trein.tekst, /stations of \d+ km/, 'bij km-vakken zegt de regel kilometers: ' + trein.tekst);
  assert.equal(trein.plek, 'Station Groningen');
  // de volgende baan schuift op als je er een gedaan hebt
  p.vakken.taxi.uniek.push('taxi');
  assert.equal(L.volgendeStap(p, 'taxi').waar, 'taxinacht');
  // het hoogste niveau: geen stap meer, maar wel een eerlijke regel
  p.vakken.golf.xp = L.XP_DREMPELS[L.MAX_NIVEAU - 1];
  const klaar = L.volgendeStap(p, 'golf');
  assert.equal(klaar.klaar, true);
  assert.equal(klaar.nodig, 0);
  assert.match(klaar.tekst, /Hoogste niveau van Golf bereikt/);
  // per speler: dezelfde functie met een ander profiel geeft een andere stap
  const ander = L.nieuwProfiel();
  ander.vakken.golf.xp = 300;
  assert.notEqual(L.volgendeStap(ander, 'golf').tekst, L.volgendeStap(L.nieuwProfiel(), 'golf').tekst);
  assert.equal(L.volgendeStap(p, 'bestaatniet'), null);
  assert.equal(L.volgendeStap(null, 'golf'), null);
  // het scherm toont de regel en de knop naar Te doen
  const ui = fs.readFileSync(JS + 'loopbaanui.js', 'utf8');
  assert.match(ui, /Eerstvolgende stap:/, 'de regel staat in het paneel');
  assert.match(ui, /Waar kan ik dat doen\?/, 'de knop bestaat');
  assert.match(ui, /data-todo-goal="job:\$\{esc\(stap\.waar\)\}"/, 'en zet de baan als doel');
});

// (#846) de overkoepelende teller, de prestatie en de eenmalige beloning: het bedrag is één keer, lokaal en zonder
// coopDeel. De maatstaf is de eerste klus die echt gedaan is (punten of teller), niet de knop in het menu.
t('#846: bij de negentiende eerste klus eenmalig €750, de teller en de prestatie De Duizendpoot', () => {
  const st = nepOpslag();
  Live.initLoopbaan({ opslag: st });
  const p = Live.getProfiel();
  for (const id of L.VAK_IDS.slice(0, -1)) L.tel(p, id, { xp: 10 }); // achttien echt gedaan
  const w = nepWereld();
  Live.loopbaanTel(w, L.VAK_IDS[L.VAK_IDS.length - 1], { xp: 10 });
  assert.equal(L.eersteKlussen(Live.getProfiel()), L.VAKKEN.length, 'alle negentien geteld');
  assert.equal(w.money, L.DUIZENDPOOT_EURO, 'eenmalig €750');
  assert.equal(w.gedeeld.length, 0, 'niet met gasten gedeeld: het is een prestatie van deze speler');
  assert.ok(w.msgs.some((m) => /De Duizendpoot/.test(m.text) && /€750/.test(m.text)), 'een melding met de titel en het bedrag');
  assert.equal(getStat(Live.EERSTE_KLUS_STAT), L.VAKKEN.length, 'de levensduur-teller staat op negentien');
  assert.ok(isUnlocked('duizendpoot'), 'de prestatie is ontgrendeld');
  const a = ACHIEVEMENTS.find((x) => x.id === 'duizendpoot');
  assert.equal(a.goal, L.VAKKEN.length); assert.equal(a.cat, 'bijbaan');
  // nooit twee keer: nog een loopbaangebeurtenis betaalt niets meer uit
  Live.loopbaanTel(w, 'trein', { xp: 1, n: 1 });
  assert.equal(w.money, L.DUIZENDPOOT_EURO);
  assert.equal(L.duizendpootKlaar(Live.getProfiel()), true);
  Live.schrijfNu();
  assert.equal(JSON.parse(st.m.get(KEYS.loopbaan)).duizendpoot, true, 'de eenmaligheid staat in het profiel');
  schoon();
});

t('#846: wat het scherm en Te doen tonen komt uit dezelfde teller', () => {
  const ui = fs.readFileSync(JS + 'loopbaanui.js', 'utf8');
  assert.match(ui, /L\.eersteKlusStand\(profiel\)/, 'het Loopbanen-scherm leest de stand');
  assert.match(ui, /van \$\{eerste\.totaal\} eerste klussen/, 'de teller staat in het scherm');
  assert.match(ui, /L\.DUIZENDPOOT_TITEL/, 'de blijvende titel is zichtbaar bij negentien');
  const todo = fs.readFileSync(JS + 'todo.js', 'utf8');
  assert.match(todo, /\['loopbanen', 'Loopbanen'/, 'de groep Loopbanen staat in Te doen');
  assert.match(todo, /key: 'lb:loopbanen'/, 'één overkoepelende rij');
  assert.match(todo, /eerste klussen/, 'de rij noemt de teller');
  assert.match(todo, /L\.DUIZENDPOOT_TITEL/, 'en bij negentien de titel');
  assert.match(todo, /kind: 'place', name: `\$\{info\.naam\} · \$\{eerste\.plek\}`/, 'het doel wijst naar de dichtstbijzijnde startplek');
  const kaarten = fs.readFileSync(JS + 'loopbaankaarten.js', 'utf8');
  assert.match(kaarten, /export function maybeCareerCards\(world, stepId\)/, 'de afgesproken ingang voor story.js');
  assert.match(kaarten, /voice: false/, 'de kaartjes zijn stil');
  assert.ok(!/from '\.\/story\.js'/.test(kaarten), 'geen import van story.js (geen cyclus)');
});

console.log(`loopbaan_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
