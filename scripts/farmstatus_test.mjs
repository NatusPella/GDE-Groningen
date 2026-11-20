// De stand van een veld (farmstatus.js), de veldkaarten (farmcards.js), de HUD-strook (farmhud.js, alleen het model) en de
// kaartstatus (perceelmap.js) zonder DOM of Electron (#985).   node scripts/farmstatus_test.mjs
import assert from 'node:assert/strict';
import './node3d.mjs';
const B = await import('../game/js/boerderij.js');
const PC = await import('../game/js/percelen.js');
const S = await import('../game/js/farmstatus.js');
const K = await import('../game/js/farmcards.js');
const H = await import('../game/js/farmhud.js');
const Live = await import('../game/js/boerderijlive.js');
const PM = await import('../game/js/perceelmap.js');

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nepOpslag = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
Live.zetBoerderijVoorTest(null, nepOpslag());
const b = Live.getBoerderij();
const id = b.bedrijf.actief;

t('stadia: een derde, twee derde, rijp', () => {
  assert.equal(S.stadiumVan(0), 0); assert.equal(S.stadiumVan(0.33), 0); assert.equal(S.stadiumVan(0.34), 1);
  assert.equal(S.stadiumVan(0.66), 1); assert.equal(S.stadiumVan(0.67), 2); assert.equal(S.stadiumVan(0.999), 2); assert.equal(S.stadiumVan(1), 3);
  assert.equal(S.stadiumVan(NaN), 0); assert.equal(S.stadiumVan(7), 3);
});

t('de lus van een veld: braak, geploegd, zaailing, groeiend, bijna, rijp, stoppel', () => {
  assert.equal(S.veldStatus(b, id).statusId, 'braak');
  assert.equal(S.veldStatus(b, id).volgende, 'ploegen');
  B.rondTaakAf(b, 'ploegen', 0.9, { vrij: true });
  let s = S.veldStatus(b, id);
  assert.equal(s.statusId, 'geploegd'); assert.equal(s.volgende, 'zaaien'); assert.equal(s.aandacht, true);
  B.rondTaakAf(b, 'zaaien', 0.9, { gewas: 'graan', vrij: true });
  s = S.veldStatus(b, id);
  assert.equal(s.statusId, 'zaailing'); assert.equal(s.gewas, 'graan'); assert.equal(s.volgende, null); assert.equal(s.aandacht, false);
  B.tikUren(b, 40 * 0.4);
  assert.equal(S.veldStatus(b, id).statusId, 'groeiend');
  B.tikUren(b, 40 * 0.3);
  s = S.veldStatus(b, id);
  assert.equal(s.statusId, 'bijna'); assert.ok(s.urenRest > 0);
  B.tikUren(b, 40);
  s = S.veldStatus(b, id);
  assert.equal(s.statusId, 'rijp'); assert.equal(s.klaar, true); assert.equal(s.volgende, 'oogsten'); assert.equal(s.stadium, 3);
  B.rondTaakAf(b, 'oogsten', 0.9, { vrij: true });
  s = S.veldStatus(b, id);
  assert.equal(s.statusId, 'stoppel'); assert.equal(s.gewas, 'graan'); assert.equal(s.volgende, 'ploegen');
  B.rondTaakAf(b, 'ploegen', 0.9, { vrij: true });
  assert.equal(S.veldStatus(b, id).statusId, 'geploegd', 'ploegen haalt het stoppelveld weg');
});

t('stoppel overleeft opslaan en laden, een oude opslag zonder stoppel blijft braak', () => {
  B.rondTaakAf(b, 'zaaien', 1, { gewas: 'bieten', vrij: true }); B.tikUren(b, 100); B.rondTaakAf(b, 'oogsten', 1, { vrij: true });
  const kopie = B.normaliseer(JSON.parse(JSON.stringify(b)));
  assert.equal(S.veldStatus(kopie, id).statusId, 'stoppel');
  const oud = JSON.parse(JSON.stringify(b)); delete oud.veld.stoppel;
  assert.equal(S.veldStatus(B.normaliseer(oud), id).statusId, 'braak');
  const kapot = JSON.parse(JSON.stringify(b)); kapot.veld.stoppel = 'bestaatniet';
  assert.equal(S.veldStatus(B.normaliseer(kapot), id).statusId, 'braak');
});

t('elke status heeft icoon, kaartstijl met letter, wereldkleur en een verschillende letter of vorm', () => {
  for (const sid of S.STATUS_IDS) {
    assert.ok(S.STATUS[sid].icoon.startsWith('<path'), sid);
    assert.ok(S.KAART_STIJL[sid].letter, sid); assert.ok(Number.isInteger(S.WERELD_KLEUR[sid]), sid);
  }
  assert.equal(new Set(S.STATUS_IDS.map((x) => S.WERELD_KLEUR[x])).size, S.STATUS_IDS.length, 'elke stand een eigen wereldkleur');
  assert.equal(S.KAART_STIJL.rijp.vul, 'yellow'); assert.equal(Object.values(S.KAART_STIJL).filter((x) => x.vul === 'yellow').length, 1, 'geel is alleen oogstklaar');
});

t('watNu: oogsten, ploegen, zaaien, wachten en de oogst afleveren', () => {
  const basis = { statusId: 'rijp', klaar: true, urenRest: 0 };
  assert.equal(S.watNu(basis), 'Oogsten');
  assert.equal(S.watNu({ statusId: 'braak', klaar: false }), 'Ploegen');
  assert.equal(S.watNu({ statusId: 'geploegd', klaar: false }), 'Zaaien');
  assert.match(S.watNu({ statusId: 'groeiend', klaar: false, urenRest: 12.4 }), /Wacht nog 12 speluren/);
  assert.equal(S.watNu({ statusId: 'stoppel', klaar: false }, 500), 'Lever de oogst af');
});

t('de lus in stappen: klaar, nu en straks', () => {
  assert.equal(S.lusKlaar({ statusId: 'braak' }), 0); assert.equal(S.lusKlaar({ statusId: 'geploegd' }), 1);
  assert.equal(S.lusKlaar({ statusId: 'groeiend', klaar: false }), 2); assert.equal(S.lusKlaar({ statusId: 'rijp', klaar: true }), 3);
  assert.equal(S.lusKlaar({ statusId: 'stoppel' }, 800), 4);
  const html = K.lusHtml({ statusId: 'geploegd', klaar: false });
  assert.match(html, /data-stand="klaar"[\s\S]*data-stand="nu" aria-current="step"[\s\S]*data-stand="straks"/);
});

t('Samen spelen: een veld als één byte-achtig record en terug', () => {
  const s = { statusId: 'bijna', gewas: 'graan', groei: 0.7 };
  const c = S.codeerVeld(s);
  assert.ok(c.s >= 0 && c.s < 8 && c.g < 32 && c.f >= 0 && c.f <= 255);
  const d = S.decodeerVeld(c);
  assert.equal(d.statusId, 'bijna'); assert.equal(d.gewas, 'graan'); assert.ok(Math.abs(d.groei - 0.7) < 0.01);
  assert.equal(S.decodeerVeld({ s: 99 }), null); assert.equal(S.decodeerVeld(null), null);
});

t('veldkaarten: status, voortgang en de ene knop; de uitleg verdwijnt na Begrepen', () => {
  const b2 = B.nieuweBoerderij();
  B.rondTaakAf(b2, 'ploegen', 1, { vrij: true }); B.rondTaakAf(b2, 'zaaien', 1, { gewas: 'aardappelen', vrij: true }); B.tikUren(b2, 5);
  const html = K.kaartenBlok(b2);
  assert.match(html, /bd-veld/); assert.match(html, /data-status="zaailing"/); assert.match(html, /role="progressbar"/); assert.match(html, /Legenda van de kaart/);
  assert.equal((html.match(/class="ds-knop"/g) || []).length, 1, 'één gele hoofdknop');
  assert.match(html, /data-bd-naar=/);
  assert.match(html, /bd-uitleg-kaart/);
});

t('HUD-model: voortgang, snelheid in de band, diesel laag en wat nu', () => {
  const stand = { machine: 'Kleine trekker', taak: 'ploegen', veld: 'Akker De Zonnehoek', bezig: true, voortgang: 0.42, snelheid: 4, band: { vMin: 2.5, vMax: 5 }, diesel: 0.1, nodig: [], lading: null };
  const m = H.hudModel(stand);
  assert.equal(m.taak, 'Ploegen'); assert.equal(m.voortgang, 42); assert.equal(m.staat, 'goed'); assert.equal(m.dieselLaag, true);
  assert.match(m.snelheidTekst, /km\/u · netjes/); assert.ok(m.zoneA < m.zoneB && m.naald >= m.zoneA && m.naald <= m.zoneB);
  assert.equal(H.hudModel({ ...stand, snelheid: 7 }).staat, 'te'); assert.match(H.hudModel({ ...stand, snelheid: 7 }).nu, /Gas terug/);
  assert.equal(H.hudModel({ ...stand, snelheid: 1 }).staat, 'lang');
  assert.match(H.hudModel({ ...stand, bezig: false, nodig: ['hef omlaag (T)'] }).nu, /Nog nodig: hef omlaag \(T\)/);
  assert.equal(H.hudModel(null), null);
  assert.equal(H.hudModel({ taak: null, lading: { kg: 3200 }, snelheid: 3, band: null, diesel: 0.8, nodig: [] }).lading, 'Lading 3.200 kg');
});

t('kaart: een veld van jou krijgt een kaartstijl en een statusicoon, aangeboden velden niet', () => {
  const spots = PM.perceelMapSpots();
  const eigen = spots.find((q) => q.id === PC.START_PERCEEL);
  assert.match(eigen.kind, /^perceel-eigen-[a-z]+$/); assert.match(eigen.sub, /nu: /);
  assert.ok(spots.some((q) => /^perceel-(koop|huur)$/.test(q.kind)));
  const vlakken = PM.eigenPerceelVlakken();
  assert.ok(vlakken.length >= 1 && vlakken[0].stijl && vlakken[0].stijl.letter && vlakken[0].statusNaam);
  const calls = []; const ctx = new Proxy({}, { get: (o, k) => (k in o ? o[k] : (...a) => { calls.push(k); }), set: (o, k, v) => { o[k] = v; return true; } });
  assert.equal(PM.drawPerceelMapIcon(ctx, 'perceel-eigen-rijp', 1), true);
  assert.ok(calls.includes('fillText'), 'de letter wordt getekend');
  assert.equal(PM.drawPerceelMapIcon(ctx, 'perceel-eigen-bestaatniet', 1), true, 'een onbekende stand valt terug op groen of faalt niet');
});

t('kaart: je machines staan er met hun dieselstand, en zonder bron geen machines', () => {
  assert.deepEqual(S.machinePlekken(), []);
  S.zetMachinePlekken(() => [{ uid: 'm1', x: 10, y: 20, naam: 'Kleine trekker', diesel: 0.1 }]);
  const m = PM.perceelMapSpots().find((q) => q.kind === 'perceel-machine');
  assert.ok(m && /diesel 10%/.test(m.sub) && /bijna leeg/.test(m.sub) && m.goal.x === 10);
  const calls = []; const ctx = new Proxy({}, { get: (o, k) => (k in o ? o[k] : (...a) => { calls.push(k); }), set: (o, k, v) => { o[k] = v; return true; } });
  assert.equal(PM.drawPerceelMapIcon(ctx, 'perceel-machine', 1), true); assert.ok(calls.includes('fillText'));
  S.zetMachinePlekken(() => { throw new Error('kapot'); });
  assert.deepEqual(S.machinePlekken(), [], 'een kapotte bron telt niet mee');
  S.zetMachinePlekken(null);
});

console.log(`farmstatus_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
