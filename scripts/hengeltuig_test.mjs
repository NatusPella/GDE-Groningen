// Het hengeltuig (#492): vier hengels, zes soorten aas, de lijnsterkte (0-1) en twee verbeteringen (0-2), met de
// opslag in gde-hengeltuig-v1 en de invloed op het hengelen. Puur, geen browser: een nep-opslag voor het tuig, een
// vaste random en de echte hengelregels.
//   node scripts/hengeltuig_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../game/js/hengeltuig.js';
import * as L from '../game/js/hengeltuiglive.js';
import * as D from '../game/js/visdata.js';
import { createHengel, stepHengel } from '../game/js/hengelrules.js';
import { makeRng } from '../game/js/minigamekit.js';
import { KEYS } from '../game/js/storagekeys.js';
import { winkelMagVoorGast } from '../game/js/coopgast.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n').slice(0, 3).join(' | ')); } };
const read = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
const dichtbij = (a, b) => Math.abs(a - b) < 1e-9;

// ------------------------------------------------------------------ de gegevens
t('vier hengels, van de gratis peurhengel tot de karperhengel: eigen ids, oplopende rang en prijs', () => {
  assert.equal(T.HENGELS.length, 4);
  assert.equal(new Set(T.HENGELS.map((h) => h.id)).size, 4);
  assert.equal(T.HENGELS[0].id, T.HENGEL_STANDAARD);
  assert.equal(T.HENGELS[0].prijs, 0);
  assert.equal(T.HENGELS[0].wacht, 1, 'de standaardhengel wacht precies zo lang als vroeger');
  assert.equal(T.HENGELS[0].lijn, T.LIJN_STANDAARD);
  for (let i = 0; i < T.HENGELS.length; i++) {
    const h = T.HENGELS[i];
    assert.ok(h.naam && h.desc, h.id);
    assert.equal(h.rang, i);
    assert.ok(h.wacht > 0.3 && h.wacht <= 1, h.id + ': wachttijd');
    assert.ok(h.lijn >= 0 && h.lijn <= 1, h.id + ': lijn');
    if (i) { assert.ok(h.prijs > T.HENGELS[i - 1].prijs, h.id + ': prijs loopt op'); assert.ok(h.wacht < T.HENGELS[i - 1].wacht, h.id + ': sneller beet'); }
  }
  // de vier hengels samen geven een duidelijk betere hengel, maar nergens een sprong van meer dan 40%
  assert.ok(T.HENGELS[3].wacht >= 0.6 && T.HENGELS[3].lijn > T.HENGELS[0].lijn);
});

t('zes soorten aas met een prijs; elk aas noemt alleen echte soorten, en die zitten ook echt in een water', () => {
  assert.equal(T.AAS.length, 6);
  assert.equal(new Set(T.AAS.map((a) => a.id)).size, 6);
  for (const a of T.AAS) {
    assert.ok(a.naam && a.desc && a.prijs > 0, a.id);
    assert.ok(a.soorten.length >= 4, a.id + ': te weinig soorten');
    assert.equal(new Set(a.soorten).size, a.soorten.length, a.id + ': dubbele soort');
    for (const id of a.soorten) {
      assert.ok(D.soort(id), `${a.id}: onbekende soort ${id}`);
      assert.ok(D.typenVan(id).length > 0, `${a.id}: ${id} zit in geen water`);
    }
  }
  assert.equal(T.AAS_PER_PAK, 10);
  assert.equal(T.VERBETERINGEN.length, T.UPGRADE_MAX);
  assert.ok(T.VERBETERINGEN[1].prijs > T.VERBETERINGEN[0].prijs);
});

// ------------------------------------------------------------------ normaal maken
t('een leeg, kapot of verzonnen tuig wordt het standaardtuig: peurhengel, geen aas, lijn 0,5', () => {
  const leeg = T.leegTuig();
  assert.deepEqual(leeg, { v: 1, hengel: 'peur', aas: null, upgrades: 0 });
  for (const raw of [null, undefined, '', 'rommel', '{"v":9}', 42, [], { v: 1 }, { v: 2, hengel: 'karper', upgrades: 9 }]) {
    const x = T.normaliseer(raw);
    assert.deepEqual(x, leeg, JSON.stringify(raw));
  }
  const x = T.normaliseer(JSON.stringify({ v: 1, hengel: 'ruimteschip', aas: { id: 'draak', n: 4 }, upgrades: 17 }));
  assert.equal(x.hengel, 'peur');
  assert.equal(x.aas, null);
  assert.equal(x.upgrades, T.UPGRADE_MAX, 'te veel verbeteringen gaan terug naar het maximum');
  const y = T.normaliseer({ v: 1, hengel: 'werp', aas: { id: 'worm', n: 3.9 }, upgrades: -2 });
  assert.deepEqual(y, { v: 1, hengel: 'werp', aas: { id: 'worm', n: 3 }, upgrades: 0 });
  // een leeg pak is geen aas
  assert.equal(T.normaliseer({ v: 1, hengel: 'werp', aas: { id: 'worm', n: 0 }, upgrades: 0 }).aas, null);
  assert.ok(T.normaliseer({ v: 1, aas: { id: 'worm', n: 1e9 } }).aas.n <= T.MAX_AAS);
});

// ------------------------------------------------------------------ wat het doet
t('zonder tuig verandert er niets: lijn 0,5, beetvenster en wachttijd precies zoals vroeger', () => {
  const leeg = T.leegTuig();
  assert.equal(T.lijnsterkte(leeg), T.LIJN_STANDAARD);
  assert.equal(T.beetFactor(T.LIJN_STANDAARD), 1);
  assert.equal(T.wachtFactor(leeg), 1);
  assert.equal(T.hengelNaam(leeg), 'Peurhengel');
  assert.equal(T.aasNaam(leeg), 'geen aas');
});

t('de lijnsterkte: 0,5 met de peurhengel, elke verbetering er 0,1 bij, nooit buiten 0 tot 1', () => {
  assert.equal(T.lijnVoor('peur', 0), 0.5);
  assert.equal(T.lijnVoor('peur', 1), 0.6);
  assert.equal(T.lijnVoor('peur', 2), 0.7);
  assert.equal(T.lijnVoor('karper', 2), 1, 'de sterkste hengel met twee verbeteringen is precies 1');
  assert.equal(T.lijnVoor('onbekend', 0), 0.5);
  assert.equal(T.lijnsterkte({ v: 1, hengel: 'peur', upgrades: 9 }), 0.7);
  // het beetvenster groeit met de lijn: 0,5 is 1, de sterkste lijn 1,3
  assert.equal(T.beetFactor(0.5), 1);
  assert.ok(dichtbij(T.beetFactor(1), 1.3));
  assert.ok(T.beetFactor(0.75) > 1 && T.beetFactor(0.25) < 1);
  assert.ok(T.beetFactor(-4) > 0 && T.beetFactor(9) < 2, 'ook een onmogelijke lijn blijft bruikbaar');
  // de hengel bepaalt de wachttijd
  assert.equal(T.wachtFactor({ v: 1, hengel: 'karper' }), 0.7);
  assert.equal(T.wachtFactor({ v: 1, hengel: 'werp' }), 0.9);
});

t('aas verschuift de doelsoort: zonder aas precies de keuze van visdata, met aas vaker de vis waar het voor is', () => {
  for (const type of D.WATERTYPE_IDS) {
    const a = makeRng(11), b = makeRng(11);
    for (let i = 0; i < 500; i++) {
      const nu = { uur: 13, regen: false };
      assert.equal(T.kiesMetAas(type, a, nu, null).id, D.kiesVis(type, b, nu).id, `${type}: dezelfde volgorde als kiesVis`);
    }
  }
  const tel = (type, aasId, n = 40000) => {
    const rand = makeRng(7);
    const uit = {};
    for (let i = 0; i < n; i++) { const s = T.kiesMetAas(type, rand, { uur: 13 }, aasId); uit[s.id] = (uit[s.id] || 0) + 1; }
    return uit;
  };
  const kaal = tel('meer', null), kunstaas = tel('meer', 'kunstaas');
  const roof = (x) => (x.snoek || 0) + (x.snoekbaars || 0) + (x.baars || 0);
  assert.ok(roof(kunstaas) > roof(kaal) * 1.5, 'kunstaas lokt de roofvis');
  assert.ok(kunstaas.snoek > kaal.snoek * 1.5, 'de snoek bijt vaker');
  assert.equal(Object.keys(kunstaas).sort().join(), Object.keys(kaal).sort().join(), 'geen soorten erbij of af');
  const zeepier = tel('wad', 'zeepier');
  assert.ok((zeepier.schol || 0) > (tel('wad', null).schol || 0), 'zeepier lokt de schol');
  // aas voor ander water verandert daar niets
  const a = makeRng(3), b = makeRng(3);
  for (let i = 0; i < 200; i++) assert.equal(T.kiesMetAas('sloot', a, { uur: 13 }, 'zeepier').id, T.kiesMetAas('sloot', b, { uur: 13 }, null).id);
  assert.ok(T.kiesMetAas('onbekend', makeRng(5)).id, 'een onbekend water geeft toch een vis');
});

// ------------------------------------------------------------------ kopen
t('een hengel kopen: nooit terug, nooit zonder geld, en het oude tuig blijft staan', () => {
  const leeg = T.leegTuig();
  assert.equal(T.heeftHengel(leeg, 'peur'), true);
  assert.equal(T.heeftHengel(leeg, 'werp'), false);
  assert.equal(T.heeftHengel(leeg, 'draak'), false);
  assert.equal(T.hengelBlokkade(leeg, 'peur', 999), 'Heb je al (of een betere)');
  assert.equal(T.hengelBlokkade(leeg, 'draak', 999), 'Onbekende hengel');
  assert.equal(T.hengelBlokkade(leeg, 'werp', 10), 'Te weinig geld');
  assert.equal(T.hengelBlokkade(leeg, 'werp', 60), null);
  const r = T.koopHengel(leeg, 'werp', 60);
  assert.equal(r.prijs, 60);
  assert.equal(r.tuig.hengel, 'werp');
  assert.equal(leeg.hengel, 'peur', 'het oude tuig is niet aangepast');
  // terug naar de peurhengel kan niet, een betere wel
  assert.equal(T.koopHengel(r.tuig, 'peur', 999).fout, 'Heb je al (of een betere)');
  assert.equal(T.koopHengel(r.tuig, 'voer', 999).tuig.hengel, 'voer');
});

t('de lijn verbeteren: twee stappen, elk duurder, daarna is het op', () => {
  let t0 = T.leegTuig();
  assert.equal(T.upgradePrijs(t0), T.VERBETERINGEN[0].prijs);
  assert.equal(T.upgradeBlokkade(t0, 1), 'Te weinig geld');
  assert.equal(T.upgradeBlokkade(t0, 35), null);
  const a = T.koopUpgrade(t0, 35);
  assert.equal(a.tuig.upgrades, 1);
  assert.equal(T.lijnsterkte(a.tuig), 0.6);
  const b = T.koopUpgrade(a.tuig, 90);
  assert.equal(b.tuig.upgrades, 2);
  assert.equal(T.lijnsterkte(b.tuig), 0.7);
  assert.equal(T.upgradeBlokkade(b.tuig, 9999), 'De lijn is al op zijn sterkst');
  assert.equal(T.koopUpgrade(b.tuig, 9999).fout, 'De lijn is al op zijn sterkst');
  assert.equal(b.tuig.upgrades, T.UPGRADE_MAX);
  assert.equal(t0.upgrades, 0, 'het oorspronkelijke tuig blijft staan');
});

t('aas kopen: een pak van tien beten, een ander soort vervangt je zak, en elk beet gaat er een af', () => {
  const leeg = T.leegTuig();
  assert.equal(T.aasBlokkade(leeg, 'draak', 99), 'Onbekend aas');
  assert.equal(T.aasBlokkade(leeg, 'maden', 1), 'Te weinig geld');
  const a = T.koopAas(leeg, 'maden', 2);
  assert.equal(a.prijs, 2);
  assert.deepEqual(a.tuig.aas, { id: 'maden', n: T.AAS_PER_PAK });
  assert.equal(leeg.aas, null);
  const b = T.koopAas({ ...a.tuig, aas: { id: 'maden', n: 3 } }, 'worm', 3);
  assert.deepEqual(b.tuig.aas, { id: 'worm', n: T.AAS_PER_PAK });
  let x = { v: 1, hengel: 'peur', aas: { id: 'worm', n: 2 }, upgrades: 0 };
  x = T.gebruikAas(x);
  assert.deepEqual(x.aas, { id: 'worm', n: 1 });
  x = T.gebruikAas(x);
  assert.equal(x.aas, null, 'het laatste beet laat de zak leeg achter');
  assert.equal(T.gebruikAas(T.leegTuig()).aas, null, 'zonder aas gebeurt er niets');
  assert.ok(T.aasNaam({ v: 1, aas: { id: 'worm', n: 4 } }).includes('4'));
});

// ------------------------------------------------------------------ de opslag
function nepOpslag() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => m.delete(k), _m: m };
}

t('opslag: een eigen sleutel buiten elke savegame, standaard hetzelfde gedrag, en een kapotte opslag kraakt niet', () => {
  assert.equal(KEYS.hengeltuig, 'gde-hengeltuig-v1');
  for (const [k, v] of Object.entries(KEYS)) if (k !== 'hengeltuig') assert.notEqual(v, KEYS.hengeltuig);
  const st = nepOpslag();
  L.initHengeltuig({ opslag: st });
  assert.deepEqual(L.getTuig(), T.leegTuig(), 'een lege opslag geeft het standaardtuig');
  assert.equal(st.getItem(KEYS.hengeltuig), null, 'vissen zonder tuig schrijft niets');
  L.zetTuig({ v: 1, hengel: 'voer', aas: { id: 'deeg', n: 4 }, upgrades: 1 });
  L.schrijfNu();
  const bewaard = JSON.parse(st.getItem(KEYS.hengeltuig));
  assert.deepEqual(bewaard, { v: 1, hengel: 'voer', aas: { id: 'deeg', n: 4 }, upgrades: 1 });
  // een nieuwe start leest het tuig terug
  L.initHengeltuig({ opslag: st });
  assert.equal(L.getTuig().hengel, 'voer');
  assert.equal(L.getTuig().upgrades, 1);
  // een beet van het pak gaat ook naar de opslag
  assert.equal(L.gebruikAas(), true);
  assert.equal(L.getTuig().aas.n, 3);
  L.schrijfNu();
  assert.equal(JSON.parse(st.getItem(KEYS.hengeltuig)).aas.n, 3);
  assert.equal(L.gebruikAas(), true);
  L.schrijfNu(); // het tuig van dit spel staat in de opslag voordat we die kapotmaken
  // kapotte opslag: het standaardtuig, geen fout
  st.setItem(KEYS.hengeltuig, '{kapot');
  L.initHengeltuig({ opslag: st });
  assert.deepEqual(L.getTuig(), T.leegTuig());
  const stuk = { getItem() { throw new Error('geblokkeerd'); }, setItem() { throw new Error('vol'); } };
  L.initHengeltuig({ opslag: stuk });
  assert.deepEqual(L.getTuig(), T.leegTuig());
  assert.doesNotThrow(() => { L.zetTuig({ v: 1, hengel: 'werp' }); L.schrijfNu(); L.gebruikAas(); });
  assert.equal(L.getTuig().hengel, 'werp');
  L.initHengeltuig({ opslag: nepOpslag() });
});

// ------------------------------------------------------------------ in het hengelen
t('de hengelregels: het beetvenster uit het tuig rekt de beet op, zonder tuig blijft het zoals het was', () => {
  const vis = { id: 'voorn', name: 'Blankvoorn', kg: 0.3, window: 1 };
  const bijt = (venster) => {
    const st = createHengel(makeRng(5), { kies: () => vis, duur: Infinity, wacht: [1, 1], venster });
    stepHengel(st, { cast: true }, 0.01);
    stepHengel(st, {}, 0.9);   // de worp is klaar: wachten
    const ev = stepHengel(st, {}, 1.05);
    assert.ok(ev.some((e) => e.type === 'bite'), 'een beet');
    return st.bite;
  };
  assert.equal(bijt(1), 1, 'zonder tuig precies het oude venster');
  assert.ok(Math.abs(bijt(1.3) - 1.3) < 1e-9, 'een sterke lijn houdt de dobber langer onder');
  assert.ok(bijt(0.7) < 1);
  // het standaardtuig geeft in de vrije hengel precies het oude gedrag
  const leeg = T.leegTuig();
  assert.equal(T.beetFactor(T.lijnsterkte(leeg)), 1);
  assert.equal(T.wachtFactor(leeg), 1);
});

// ------------------------------------------------------------------ in het spel gehaakt
t('hengelen en de winkel gebruiken het tuig: HUD, visboek, de hengelhoek en de eigen opslag', () => {
  const hengelen = read('hengelen.js'), shops = read('shops.js'), boekui = read('visboekui.js');
  assert.ok(/hengeltuiglive\.js/.test(hengelen) && /kiesMetAas/.test(hengelen) && /beetFactor/.test(hengelen), 'hengelen gebruikt het tuig');
  assert.ok(/hengelNaam\(tuig\)/.test(hengelen) && /aasNaam\(tuig\)/.test(hengelen), 'de HUD noemt hengel en aas');
  assert.ok(/gebruikAas/.test(hengelen), 'elke worp bij het vrije hengelen kost een beet aas');
  assert.match(hengelen, /g\.castAas\s*=/, 'de aas van de worp wordt vóór het verbruik vastgelegd');
  assert.match(hengelen, /game\.castAas/, 'en bij het kiezen van de vis gebruikt, ook als het pakje net leeg is');
  assert.ok(/hengelSections/.test(shops), 'de hengelhoek staat in de winkel');
  assert.ok(/super: \(w\) => \[[^\]]*hengelSections/.test(shops), 'de Avondwinkel verkoopt hengels en aas');
  assert.ok(/boot: \(w\) => [^\n]*hengelSections/.test(shops), 'de botenverhuur aan de steiger ook');
  assert.ok(/getTuig/.test(boekui) && /lijnsterkte/.test(boekui), 'het visboek noemt je tuig');
  assert.ok(/gde-hengeltuig-v1/.test(read('storagekeys.js')));
  // een gast koopt zelf: de Avondwinkel is een winkel voor eigen spullen
  assert.ok(winkelMagVoorGast('super'));
});

t('hengeltuig.js is puur: geen DOM, geen THREE, geen klok, geen opslag en geen random', () => {
  const src = read('hengeltuig.js');
  assert.ok(!/document\.|window\.|localStorage|sessionStorage|Math\.random|Date\.now|performance\.now|setTimeout|THREE\./.test(src), 'geen browser of klok');
  assert.ok(/export function normaliseer/.test(src) && /export function kiesMetAas/.test(src));
});

console.log(`hengeltuig_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
