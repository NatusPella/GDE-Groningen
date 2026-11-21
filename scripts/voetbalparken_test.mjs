// Test van de voetbalparken en de lokale clubs (#1117): scripts/voetbalparken_test.mjs. Leest game/js/voetbalparkendata.js (gebouwd door scripts/world/build_voetbalparken.mjs), geen packs nodig.
// Dekt: de telling (281 parken, 139 plaatsen, klein), de naamregels (acht sjablonen, nooit VV/SV/FC/SC/RKSV of een echte clubnaam), de acht dichtstbijzijnde clubs bij het huis, reizen en het veld op het park.
import PARKDATA from '../game/js/voetbalparkendata.js';
import assert from 'node:assert/strict';
import { wgsToWorld } from '../game/js/rdnew.js';
import { makeParkIndex, localDivision, nearestClubs, localClubName, adjective, terpParks, travel, pitchPlacement, HOME_WGS, TEMPLATES, LOCAL_DIVISION_SIZE, clubForPlace } from '../game/js/voetbalparken.js';
import { hasForbiddenWord } from './voetbal_verboden.mjs';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const raw = PARKDATA;
const idx = makeParkIndex(raw);
const [hx, hy] = wgsToWorld(HOME_WGS.lat, HOME_WGS.lon);
const home = { x: hx, y: hy };

t('de index: 281 parken bij ongeveer 140 plaatsen, klein en met een thuispark per plaats', () => {
  assert.equal(idx.parkCount, 281);
  assert.ok(idx.plaatsen.length >= 130 && idx.plaatsen.length <= 150, String(idx.plaatsen.length));
  assert.ok(JSON.stringify(PARKDATA).length < 40000, 'houd de data klein');
  for (const p of idx.plaatsen) { assert.ok(p.p[0].a >= p.p[p.p.length - 1].a, 'thuispark is het grootste'); assert.ok(p.p.every((k) => k.r >= 0 && k.r <= Math.PI + 0.01 && k.f >= 1)); }
  assert.equal(new Set(idx.plaatsen.map((p) => p.id)).size, idx.plaatsen.length);
});
t('kapotte data geeft een lege index zonder fouten', () => {
  for (const bad of [null, {}, { v: 2 }, { v: 1, plaatsen: 'x' }, { v: 1, plaatsen: [{ id: 1 }] }]) assert.equal(makeParkIndex(bad).clubs.length, 0);
});
t('clubnamen: acht sjablonen, nooit een voorvoegsel of een echte clubnaam, stabiel per plaats', () => {
  assert.equal(TEMPLATES.length, 8);
  assert.equal(adjective('Winsum'), 'Winsumer'); assert.equal(adjective('Zuidlaren'), 'Zuidlarener'); assert.equal(adjective('Roden'), 'Rodener'); assert.equal(adjective('Haren'), 'Harener'); assert.equal(adjective('Peize'), 'Peizer');
  for (const c of idx.clubs) {
    assert.ok(!/^(VV|SV|FC|SC|RKSV)\b/i.test(c.naam), c.naam);
    assert.ok(!/\b(Boys|'\d\d)\b/.test(c.naam), c.naam);
    const zonderPlaats = c.naam.replace(c.plaats.replace(/^'t\s+/i, '').replace(/^de\s+/i, ''), '');
    assert.ok(!hasForbiddenWord(zonderPlaats), c.naam);
    assert.equal(c.naam, localClubName(c.placeId, c.plaats));
    assert.ok(c.id.startsWith('lc'));
  }
  assert.ok(idx.clubs.length > 100);
  assert.equal(new Set(idx.clubs.map((c) => c.id)).size, idx.clubs.length);
  // alle acht sjablonen komen voor
  const sjablonen = new Set(idx.clubs.map((c) => (c.naam.startsWith('Wees Rap') ? 1 : c.naam.startsWith('Eendenkracht') ? 2 : c.naam.startsWith('Onderling') ? 3 : c.naam.startsWith('Excuseer') ? 4 : c.naam.startsWith('Voorwaarts') ? 5 : c.naam.startsWith('Halfrood') ? 6 : c.naam.startsWith('Nooit') ? 7 : 0)));
  assert.equal(sjablonen.size, 8);
});
t('de Talentenklasse: de acht dichtstbijzijnde plaatsen met een park bij het huis, de pool is de rest', () => {
  const d = localDivision(idx, home);
  assert.equal(d.clubs.length, LOCAL_DIVISION_SIZE);
  assert.equal(new Set(d.clubs.map((c) => c.placeId)).size, 8);
  assert.equal(new Set(d.clubs.map((c) => c.naam)).size, 8, 'unieke namen in de divisie');
  assert.equal(d.home, d.clubs[0]);
  const afst = d.clubs.map((c) => Math.hypot(c.park.x - hx, c.park.y - hy));
  assert.deepEqual(afst.slice().sort((a, b) => a - b), afst, 'op afstand gesorteerd');
  assert.ok(afst[7] < 12000, `de achtste club is dichtbij (${Math.round(afst[7])} m)`);
  assert.equal(d.pool.length + 8, idx.clubs.length);
  assert.deepEqual(localDivision(idx, home).clubs.map((c) => c.id), d.clubs.map((c) => c.id), 'deterministisch');
  assert.ok(nearestClubs(idx, home, 3, new Set([d.clubs[0].id]))[0].id === d.clubs[1].id);
});
t('de Terpklasse: acht parken van de grootste plaatsen', () => {
  const tp = terpParks(idx);
  assert.equal(tp.length, 8);
  assert.equal(new Set(tp.map((x) => x.placeId)).size, 8);
});
t('reizen: ritten tot 15 km kosten een speldag, ver weg twee; geen negatieve of NaN-waarden', () => {
  const a = { x: 0, y: 0 };
  assert.equal(travel(a, { x: 3000, y: 4000 }).days, 1);
  assert.equal(travel(a, { x: 20000, y: 0 }).days, 2);
  const tr = travel(a, { x: 5000, y: 0 });
  assert.ok(tr.bikeMin > tr.carMin && tr.m === 5000);
  const d = localDivision(idx, home);
  for (const c of d.clubs) assert.ok(travel(d.home.park, c.park).m < 30000);
});
t('het veld op het park: middelpunt en hoek van het grootste veld; kleine velden gaan er overheen', () => {
  const p = pitchPlacement({ x: 10, y: 20, r: 1.2, f: 2, a: 20000 });
  assert.equal(p.x, 10); assert.equal(p.angle, 1.2); assert.ok(p.fits && !p.over);
  assert.ok(pitchPlacement({ x: 0, y: 0, r: 0, f: 1, a: 900 }).over);
  assert.equal(pitchPlacement({ x: 0, y: 0, f: 1, a: 9000 }).angle, 0);
});
t('een club voor een plaats heeft palet, patroon, sterkte en trainingsvelden', () => {
  const c = clubForPlace(idx.plaatsen.find((p) => p.p.length > 1));
  assert.ok(c.sterkte >= 30 && c.sterkte <= 48 && c.trainingsvelden.length >= 1);
  assert.ok(['effen', 'brede-streep', 'helften', 'smalle-streep'].includes(c.patroon));
  assert.ok(Number.isInteger(c.shirt) && c.shirt >= 0 && c.shirt <= 0xffffff);
});
console.log(`voetbalparken_test ok (${n} groepen)`);
