// Bezit-opslag, prijsmodel en namen (#1097) en de poort (#1099): compacte ID-verzameling, normaliseren van kapotte opslag, kopen en verkopen,
// migratie van de boerderij (De Zonnehoek en de andere verzonnen percelen), herkoppelen na een nieuwe wereldbouw, prijsmodel, schaalprijs,
// namen en de poort per akte.   node scripts/bezit_test.mjs
// Schrijft nooit naar echte opslag: de opslag is een nepobject. Met BEZIT_INDEX_DIR (of game/world) ook de echte index.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as Z from '../game/js/bezit.js';
import * as P from '../game/js/bezitprijs.js';
import * as GT from '../game/js/bezitgate.js';
import * as PI from '../game/js/parcelindex.js';
import * as U from '../game/js/unlockgate.js';
import * as PC from '../game/js/percelen.js';
import * as B from '../game/js/boerderij.js';
import { KEYS, BASE_KEYS } from '../game/js/storagekeys.js';
import { streekAt } from '../game/js/regioleven.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nepOpslag = (start = {}) => { const m = new Map(Object.entries(start)); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem(k, v) { m.set(k, String(v)); }, removeItem: (k) => m.delete(k) }; };
const def = (id, o = {}) => ({ id, kind: 'a', ha: 5, x: 1000, y: 1000, ax: 990, ay: 980, access: 'weg', ...o });

// ---- de verzameling ----
t('ID-verzameling: heen en terug, gesorteerd, dubbelen weg', () => {
  const ids = [123456789012, 5, 99, 5, 2700, 1];
  assert.deepEqual(Z.decodeIdSet(Z.encodeIdSet(ids)), [1, 5, 99, 2700, 123456789012]);
  assert.deepEqual(Z.decodeIdSet(Z.encodeIdSet([])), []);
});
t('ID-verzameling: ongeveer 3 byte per pand bij OSM-achtige ID\'s', () => {
  const ids = []; let x = 100000000;
  for (let i = 0; i < 10000; i++) { x += 1 + Math.floor((i * 7919) % 5400); ids.push(x); }
  const s = Z.encodeIdSet(ids);
  assert.ok(s.length / ids.length < 5, `${s.length / ids.length} tekens per pand`);
  assert.equal(Z.decodeIdSet(s).length, ids.length);
});
t('ID-verzameling: kapotte invoer geeft leeg of een deel, nooit een fout', () => {
  for (const x of [null, undefined, 5, '', '!!!', 'AAAA', {}]) assert.ok(Array.isArray(Z.decodeIdSet(x)));
});

// ---- normaliseren en opslag ----
t('kapotte of oude opslag geeft een leeg bezit', () => {
  for (const raw of [null, undefined, 5, 'x', {}, { v: 2, parcels: { pabcdef012345: { k: 'a' } } }, []]) {
    const b = Z.normalizeBezit(raw);
    assert.equal(Z.parcelCount(b), 0); assert.equal(b.buildings.size, 0);
  }
  const s = nepOpslag({ [KEYS.bezit]: '{kapot' });
  assert.equal(Z.parcelCount(Z.loadBezit(s)), 0);
});
t('de opslagsleutel is gde-bezit-v1 en niet in een savegame-lijst', () => {
  assert.equal(KEYS.bezit, 'gde-bezit-v1');
  assert.equal(BASE_KEYS.bezit, 'gde-bezit-v1');
});
t('normaliseren begrenst en gooit rommel weg', () => {
  const b = Z.normalizeBezit({ v: 1, parcels: { pabcdef012345: { k: 'w', ha: 1e9, t: -5, p: 'x', w: 9, m: 'raar', a: [1.4, 2.6] }, 'ONGELDIG ID': { k: 'a' }, pabcdef012346: null }, buildings: Z.encodeIdSet([42, 43]), bstate: { 42: { p: 1000, t: 3, q: 500 }, 99: { p: 5 } }, debt: -3, totals: { bought: 4.7 } });
  assert.equal(Z.parcelCount(b), 1);
  const p = b.parcels.pabcdef012345;
  assert.ok(p.ha <= 5000 && p.t === 0 && p.p === 0 && p.w === 3 && p.m === 'self');
  assert.deepEqual(p.a, [1, 3]);
  assert.equal(b.bstate[42].q, 100); assert.equal(b.bstate[99], undefined);
  assert.equal(b.debt, 0); assert.equal(b.totals.bought, 5);
});
t('opslaan en laden geven hetzelfde bezit terug', () => {
  const b = Z.newBezit();
  assert.ok(Z.buyParcel(b, def('pabcdef012345'), 2400, 5, 5000).ok);
  assert.ok(Z.buyBuilding(b, 123456789, 33000, 6, 40000, 'woning').ok);
  const s = nepOpslag();
  assert.ok(Z.saveBezit(s, b));
  const c = Z.loadBezit(s);
  assert.deepEqual(Object.keys(c.parcels), ['pabcdef012345']);
  assert.ok(c.buildings.has(123456789));
  assert.deepEqual(c.bstate[123456789], { p: 33000, t: 6, q: 100, kind: 'woning' });
  assert.equal(c.totals.spent, 35400);
});
t('opslag blijft klein: 500 percelen onder 70 KB', () => {
  const b = Z.newBezit();
  for (let i = 0; i < 500; i++) Z.buyParcel(b, def('p' + (i * 7919 + 1).toString(16).padStart(12, '0')), 2400, 5, 1e9);
  assert.ok(JSON.stringify(Z.serializeBezit(b)).length < 70000);
});

// ---- kopen en verkopen ----
t('kopen: te weinig geld verandert niets, genoeg geld trekt de prijs af (door de aanroeper)', () => {
  const b = Z.newBezit();
  const r = Z.buyParcel(b, def('pabcdef012345'), 2400, 1, 1000);
  assert.equal(r.ok, false); assert.equal(r.why, 'te-weinig-geld'); assert.equal(r.tekort, 1400);
  assert.equal(Z.parcelCount(b), 0); assert.equal(b.totals.spent, 0);
  assert.ok(Z.buyParcel(b, def('pabcdef012345'), 2400, 1, 2400).ok);
  assert.equal(Z.buyParcel(b, def('pabcdef012345'), 2400, 1, 9999).why, 'al-van-jou');
  assert.equal(Z.buyParcel(b, def('pabcdef012399'), 0, 1, 9999).why, 'niet-te-koop');
});
t('verkopen levert 75% en kopen-en-verkopen kost dus altijd geld (geen lus)', () => {
  const b = Z.newBezit();
  Z.buyParcel(b, def('pabcdef012345'), 2400, 1, 1e6);
  const r = Z.sellParcel(b, 'pabcdef012345');
  assert.equal(r.refund, 1800);
  assert.ok(r.refund < 2400);
  assert.equal(Z.sellParcel(b, 'pabcdef012345').ok, false);
  Z.buyBuilding(b, 77, 10000, 1, 1e6);
  assert.equal(Z.sellBuilding(b, 77).refund, 7500);
});
t('schaalprijs telt eigen koopstappen, niet de hand-gezette percelen', () => {
  const b = Z.newBezit();
  Z.syncLegacyParcels(b, B.nieuweBoerderij().bedrijf);
  assert.equal(Z.ownedCount(b), 0);
  Z.buyParcel(b, def('pabcdef000001'), 2400, 1, 1e6);
  Z.buyBuilding(b, 5, 1000, 1, 1e6);
  assert.equal(Z.ownedCount(b), 2);
});

// ---- migratie ----
t('migratie: De Zonnehoek en gekochte verzonnen percelen komen mee als legacy, zonder dubbelen en zonder iets te wissen', () => {
  const bd = PC.nieuwBedrijf();
  bd.percelen.wierdeakker = { status: 'gekocht', sinds: 48 };
  const b = Z.newBezit();
  assert.equal(Z.syncLegacyParcels(b, bd), 2);
  assert.equal(Z.syncLegacyParcels(b, bd), 0);
  assert.ok(b.parcels[PC.START_PERCEEL].lg && b.parcels.wierdeakker.lg);
  assert.equal(b.parcels.wierdeakker.t, 2);
  assert.equal(Z.sellParcel(b, PC.START_PERCEEL).why, 'start');
  const c = Z.normalizeBezit(JSON.parse(JSON.stringify(Z.serializeBezit(b))));
  assert.ok(c.parcels[PC.START_PERCEEL] && c.parcels.wierdeakker);
});
t('een oud profiel met alleen een boerderij geeft een leeg bezit (niets te migreren behalve legacy)', () => {
  const s = nepOpslag({ [KEYS.boerderij]: JSON.stringify(B.nieuweBoerderij()) });
  assert.equal(Z.parcelCount(Z.loadBezit(s)), 0);
});
t('herkoppelen: een bestaand ID blijft, een verschoven perceel wordt herkoppeld, een verdwenen perceel wordt volledig terugbetaald', () => {
  const rows = [['pbbbbbbbbbbbb', 1000, 1000, 500, 1, 0, 1010, 990], ['pnieuwnieuw01', 2000, 2000, 300, 0, 0, 2010, 2020]].map((r) => r.slice());
  const ix = PI.createParcelIndex({ v: 1, kinds: ['w', 'a', 'b'], access: ['weg', 'pad', 'wegNabij', 'padNabij', 'geen'], rows });
  const b = Z.newBezit();
  Z.buyParcel(b, def('pbbbbbbbbbbbb', { ha: 5, ax: 1010, ay: 990 }), 6000, 1, 1e9);
  Z.buyParcel(b, def('poudoudoud001', { kind: 'w', ha: 3, ax: 2000, ay: 2020 }), 4000, 1, 1e9);
  Z.buyParcel(b, def('pverdwenen001', { ha: 9, ax: 50000, ay: 50000 }), 7000, 1, 1e9);
  Z.syncLegacyParcels(b, PC.nieuwBedrijf());
  const r = Z.reconcileWithIndex(b, ix);
  assert.equal(r.rematched.length, 1);
  assert.deepEqual(r.rematched[0], ['poudoudoud001', 'pnieuwnieuw01']);
  assert.deepEqual(r.refunded, ['pverdwenen001']);
  assert.equal(r.refund, 7000);
  assert.ok(b.parcels.pbbbbbbbbbbbb && b.parcels.pnieuwnieuw01 && b.parcels[PC.START_PERCEEL]);
  assert.equal(Z.reconcileWithIndex(b, PI.createParcelIndex(null)).kept, 0);   // lege index (laden mislukt): niets aanraken
  assert.ok(b.parcels.pbbbbbbbbbbbb);
});

// ---- prijsmodel ----
const kleiWeide = def('p0000000000a1', { kind: 'w', ha: 1.6 });
t('prijs: minimumprijs, afronding op 50, geen toegang is niet te koop', () => {
  const small = def('p0000000000a2', { kind: 'w', ha: 0.3 });
  assert.equal(P.basePrice(small, 'westerwolde'), P.MIN_PRICE);
  assert.equal(P.basePrice(def('p0000000000a3', { access: 'geen' }), 'hogeland'), 0);
  assert.equal(P.isForSale(def('p0000000000a3', { access: 'geen' })), false);
  for (const r of ['hogeland', 'westerwolde', 'overig']) assert.equal(P.basePrice(def('p0000000000a4', { ha: 7.7 }), r) % 50, 0);
});
t('prijs: Sauwerd-achtige weide van 1,6 ha blijft rond de 2.400 (de goedkoopste uit percelen.js)', () => {
  const p = P.basePrice(kleiWeide, 'lauwerskust');
  assert.ok(p >= 1200 && p <= 3200, String(p));
});
t('prijs: streek, soort en ligging werken door', () => {
  const a = def('p0000000000b1', { ha: 6 });
  assert.ok(P.basePrice(a, 'hogeland') > P.basePrice(a, 'westerwolde'));
  assert.ok(P.basePrice({ ...a, kind: 'b' }, 'hogeland') > P.basePrice({ ...a, kind: 'a' }, 'hogeland'));
  assert.ok(P.basePrice({ ...a, kind: 'a' }, 'hogeland') > P.basePrice({ ...a, kind: 'w' }, 'hogeland'));
  assert.ok(P.basePrice(a, 'hogeland') > P.basePrice({ ...a, access: 'padNabij' }, 'hogeland'));
});
t('schaalprijs: x1 bij niets, x2 bij 100, max x3 bij 200 en meer', () => {
  assert.equal(P.scaleFactor(0), 1); assert.equal(P.scaleFactor(100), 2); assert.equal(P.scaleFactor(200), 3); assert.equal(P.scaleFactor(5000), 3);
  const a = def('p0000000000b2', { ha: 6 });
  assert.ok(P.parcelPrice(a, 'hogeland', 200) >= 2.9 * P.basePrice(a, 'hogeland'));
});
t('bodem: vast per ID, 0..1, streekgemiddelde plus of min 0,1', () => {
  for (const r of ['hogeland', 'westerwolde']) for (let i = 0; i < 50; i++) {
    const id = 'p' + (i * 104729 + 7).toString(16).padStart(12, '0');
    const q = P.soilQuality(id, r);
    assert.equal(q, P.soilQuality(id, r));
    assert.ok(q >= 0 && q <= 1 && Math.abs(q - { hogeland: 0.85, westerwolde: 0.45 }[r]) <= 0.1001, `${r} ${q}`);
  }
});
t('pacht blijft onder de huur van een huurder (1,2%): geen geldmachine', () => {
  assert.ok(P.LEASE_OUT_RATE < 0.012);
  assert.equal(P.leaseOutPerDay(10000), 90);
  assert.ok(P.sellValue(10000) < 10000);
});

// ---- namen ----
const BANNED = /\b(jan|piet|klaas|henk|de jong|de vries|jansen|bakker|visser|smit|meijer|mulder|bos|boer)\b/i;
t('namen: vast per ID, Nederlands, geen persoonsnaam, geen merk', () => {
  const seen = new Set();
  for (let i = 0; i < 400; i++) {
    const p = def('p' + (i * 2654435 + 13).toString(16).padStart(12, '0'), { kind: ['w', 'a', 'b'][i % 3] });
    const nm = P.parcelName(p, 'Winsum');
    assert.equal(nm, P.parcelName(p, 'Winsum'));
    assert.match(nm, /^[A-Za-zë]+ bij Winsum \(K\d{4}\)$/);
    assert.ok(!BANNED.test(nm), nm);
    const v = P.sellerName(p);
    assert.match(v, /^(Maatschap|Veehouderij|Akkerbouwbedrijf|Familiebedrijf|Landbouwbedrijf) [A-Z][a-z]+$/);
    seen.add(nm);
  }
  assert.ok(seen.size > 380);
});

// ---- de poort per akte (stub met de vorm van de gedeelde poort) ----
t('poort: standaard open (stub), per akte met makeActGate, een bestaand profiel verliest niets', () => {
  GT.resetUnlockGate();
  assert.equal(GT.branchOpen('land'), true);
  let act = 1, legacy = false;
  GT.setUnlockGate(GT.makeActGate(() => act, () => legacy));
  assert.equal(GT.branchOpen('land'), false); assert.equal(GT.branchOpen('business'), false);
  act = 2; assert.equal(GT.branchOpen('land'), true); assert.equal(GT.branchOpen('business'), false);
  act = 3; assert.equal(GT.branchOpen('business'), true);
  act = 1; legacy = true; assert.equal(GT.branchOpen('business'), true);
  assert.match(GT.branchClosedText('business'), /Aan de Eems/);
  assert.deepEqual(GT.openBranches(), ['land', 'business']);
  GT.resetUnlockGate();
});

t('poort van de verhaal-epic: nieuw spel dicht, akte 2 opent Percelen, akte 3 Bedrijven, een oude save houdt alles', () => {
  const gate = U.newGate();
  GT.setGateProgress(() => ({ partNow: 'kop', gate }));
  assert.equal(GT.branchOpen('land'), false); assert.match(GT.branchHint('land'), /via de familie/);
  GT.setGateProgress(() => ({ partNow: 'romp', gate }));
  assert.equal(GT.branchOpen('land'), true); assert.equal(GT.branchOpen('business'), false);
  GT.setGateProgress(() => ({ partNow: 'staart', gate }));
  assert.equal(GT.branchOpen('business'), true);
  GT.setGateProgress(() => ({ partNow: 'kop', gate: undefined }));
  assert.equal(GT.branchOpen('business'), true, 'een oude save is alles open');
  GT.setGateProgress(null);
  assert.equal(GT.branchOpen('land'), true);
});

// ---- de echte index (alleen als die er is) ----
const dir = process.env.BEZIT_INDEX_DIR || path.resolve(import.meta.dirname, '../game/world');
const f = path.join(dir, 'bezit-percelen.json');
if (fs.existsSync(f)) {
  const ix = PI.createParcelIndex(JSON.parse(fs.readFileSync(f, 'utf8')));
  t(`echte index: ${ix.size} percelen, prijzen, bodem en namen`, () => {
    assert.ok(ix.size > 5000);
    const all = ix.all().filter(P.isForSale);
    const prices = all.map((p) => P.basePrice(p, streekAt(p.x, p.y))).sort((a, b) => a - b);
    const med = prices[prices.length >> 1];
    assert.equal(prices[0], P.MIN_PRICE);
    assert.ok(med > 6000 && med < 20000, 'mediaan ' + med);
    assert.ok(prices.filter((x) => x <= 2400).length > 800, 'goedkope percelen');
    const names = new Set(ix.all().map((p) => P.parcelName(p, 'Plaats' + (P.idNumbers(p.id)[0] % 150))));   // ongeveer 90 percelen per plaats
    assert.ok(names.size / ix.size > 0.95, 'namen uniek genoeg');
    for (const p of ix.all().slice(0, 3000)) assert.ok(!BANNED.test(P.parcelName(p, 'Plaats') + ' ' + P.sellerName(p)));
  });
} else console.log('SKIP echte index: geen ' + f);

console.log(`bezit_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
