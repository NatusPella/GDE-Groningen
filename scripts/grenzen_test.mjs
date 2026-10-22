// De echte grenzen voor gebieden veroveren (#414): grenzen.js (uitpakken en punt-in-polygoon), de omzetting in
// scripts/world/grenzen.mjs, het meegeleverde game/grenzen.json en het fetch-script (zonder netwerk: alleen het plan).
//   node scripts/grenzen_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as GR from '../game/js/grenzen.js';
import { dp, ring, vlak, delta, binnenpunt, oppervlak } from './world/grenzen.mjs';
import { wgsToWorld, rdToWorld } from '../game/js/rdnew.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

// ------------------------------------------------------------------ punt-in-polygoon
const vierkant = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
t('puntInRing: binnen, buiten, op een hoek van een concaaf vlak (even-odd)', () => {
  const l = [[0, 0], [10, 0], [10, 10], [5, 10], [5, 5], [0, 5]];  // een L
  assert.equal(GR.puntInRing(2, 2, l), true);
  assert.equal(GR.puntInRing(8, 8, l), true);
  assert.equal(GR.puntInRing(2, 8, l), false, 'de uitgesneden hoek van de L');
  assert.equal(GR.puntInRing(-1, 2, l), false);
  assert.equal(GR.puntInRing(11, 2, l), false);
});
t('puntInGebied: een gat is geen gebied, meerdere delen tellen, de doos snijdt snel af', () => {
  const g = { p: [[vierkant(0, 0, 100, 100), vierkant(40, 40, 60, 60)], [vierkant(200, 0, 300, 100)]] };
  g.b = GR.bboxVan(g);
  assert.deepEqual(g.b, [0, 0, 300, 100]);
  assert.equal(GR.puntInGebied(g, 10, 10), true);
  assert.equal(GR.puntInGebied(g, 50, 50), false, 'in het gat');
  assert.equal(GR.puntInGebied(g, 250, 50), true, 'het tweede deel');
  assert.equal(GR.puntInGebied(g, 150, 50), false, 'ertussen');
  assert.equal(GR.puntInGebied(g, 500, 50), false);
});
t('ontvouwRing en delta zijn elkaars spiegel; een kapotte of oneven lijst geeft geen fout', () => {
  const r = [[10, -5], [14, -5], [14, 9], [10, 9]];
  assert.deepEqual(GR.ontvouwRing(delta(r)), r);
  assert.deepEqual(GR.ontvouwRing(delta([[7, 7]])), [[7, 7]]);
  assert.deepEqual(GR.ontvouwRing([1, 2, 3]), [[1, 2]]);
  assert.deepEqual(GR.ontvouwRing([]), []);
});
t('ontvouw: kapotte, lege of oude bestanden geven null; ontbrekende lagen geven lege lijsten', () => {
  for (const x of [null, undefined, 7, 'tekst', {}, { v: 2 }, { v: 1 }, { v: 1, provincie: {}, gemeenten: 'nee' }]) assert.equal(GR.ontvouw(x), null);
  const g = (id) => ({ id, naam: 'N' + id, c: [5, 5], p: [[delta(vierkant(0, 0, 10, 10))]] });
  const ok = GR.ontvouw({ v: 1, provincie: g('PV'), gemeenten: [g('GM1'), { naam: 'zonder id' }, null], woonplaatsen: 'rommel' });
  assert.equal(ok.gemeenten.length, 1);
  assert.deepEqual(ok.woonplaatsen, []);
  assert.deepEqual(ok.provincie.b, [0, 0, 10, 10]);
});
t('gebiedIn en grensVan: de laag waar de plek in ligt; bij overlap het dichtstbijzijnde binnenpunt; buiten alles null', () => {
  const mk = (id, x0, x1) => ({ id, naam: id, c: [(x0 + x1) / 2, 5], p: [[vierkant(x0, 0, x1, 10)]], b: [x0, 0, x1, 10] });
  const laag = [mk('A', 0, 12), mk('B', 10, 20)];   // overlappen tussen 10 en 12
  assert.equal(GR.gebiedIn(laag, 3, 5).id, 'A');
  assert.equal(GR.gebiedIn(laag, 11.5, 5).id, 'B', 'het binnenpunt van B (15) is dichterbij dan dat van A (6)');
  assert.equal(GR.gebiedIn(laag, 50, 5), null);
  const grenzen = { provincie: mk('PV', 0, 20), gemeenten: laag, woonplaatsen: [], wijken: [], buurten: [] };
  const r = GR.grensVan(grenzen, 3, 5);
  assert.equal(r.provincie.id, 'PV'); assert.equal(r.gemeente.id, 'A'); assert.equal(r.woonplaats, null);
  assert.deepEqual(Object.values(GR.grensVan(null, 3, 5)), [null, null, null, null, null]);
  assert.deepEqual(Object.values(GR.grensVan(grenzen, NaN, 5)), [null, null, null, null, null]);
});

// ------------------------------------------------------------------ de omzetting (vereenvoudigen, afronden, verschillen)
t('dp: een rechte lijn wordt twee punten, een hoek blijft, de tolerantie bepaalt wat weg mag', () => {
  const lijn = Array.from({ length: 50 }, (_, i) => [i * 10, 0]);
  assert.deepEqual(dp(lijn, 1), [[0, 0], [490, 0]]);
  const hoek = [[0, 0], [100, 0], [200, 0], [200, 100], [200, 200]];
  assert.deepEqual(dp(hoek, 1), [[0, 0], [200, 0], [200, 200]]);
  const golf = [[0, 0], [50, 3], [100, 0]];
  assert.equal(dp(golf, 5).length, 2);
  assert.equal(dp(golf, 1).length, 3);
});
t('ring: naar het spelframe op hele meters, gesloten ringen zonder dubbel eindpunt, te klein valt weg', () => {
  const rd = [[233670, 582075], [233770, 582075], [233770, 581975], [233670, 581975], [233670, 582075]]; // het spelnulpunt en 100 m oost/zuid
  const r = ring(rd, 1, 0);
  assert.equal(r.length, 4);
  assert.deepEqual(r.map((p) => p.join(',')).sort(), ['0,0', '0,100', '100,0', '100,100']);
  assert.ok(r.every((p) => Number.isInteger(p[0]) && Number.isInteger(p[1])));
  assert.equal(ring(rd, 1, 1e6), null, 'kleiner dan de ondergrens');
  assert.equal(ring([[1, 1], [2, 2]], 1, 0), null, 'twee punten is geen ring');
});
t('vlak: kleine eilandjes en gaten vallen weg, maar het grootste deel blijft altijd', () => {
  const rd = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]].map(([x, y]) => [233670 + x, 582075 - y]);
  const groot = rd(0, 0, 1000, 1000), eiland = rd(2000, 0, 2010, 10), gat = rd(100, 100, 110, 110);
  const g = vlak({ type: 'MultiPolygon', coordinates: [[groot, gat], [eiland]] }, 1, 500);
  assert.equal(g.length, 1, 'het eilandje van 100 m2 valt weg');
  assert.equal(g[0].length, 1, 'het gat van 100 m2 ook');
  const alleenKlein = vlak({ type: 'Polygon', coordinates: [eiland] }, 1, 5000);
  assert.equal(alleenKlein.length, 1, 'bestaat het gebied alleen uit iets kleins, dan blijft dat');
});
t('binnenpunt ligt altijd in het gebied, ook bij een C-vorm waar het zwaartepunt buiten valt', () => {
  const c = [[[0, 0], [100, 0], [100, 20], [20, 20], [20, 80], [100, 80], [100, 100], [0, 100]]];
  const bp = binnenpunt([c]);
  assert.equal(GR.puntInRing(bp[0], bp[1], c[0]), true);
  const v = [vierkant(0, 0, 50, 50)];
  assert.deepEqual(binnenpunt([v]), [25, 25]);
  assert.equal(oppervlak(vierkant(0, 0, 10, 10)), 100);
});

// ------------------------------------------------------------------ het bestand game/grenzen.json
const BESTAND = path.join(ROOT, 'game', 'grenzen.json');
const bestaat = fs.existsSync(BESTAND);
const data = bestaat ? JSON.parse(fs.readFileSync(BESTAND, 'utf8')) : null;
t('game/grenzen.json bestaat, is compact en heeft het goede formaat', () => {
  assert.ok(bestaat, 'game/grenzen.json ontbreekt: node scripts/world/fetch_grenzen.mjs --haal-op en node scripts/world/grenzen.mjs');
  assert.equal(data.v, 1);
  assert.ok(data.jaar >= 2024 && /^\d{4}-\d{2}-\d{2}$/.test(data.opgehaald));
  assert.ok(fs.statSync(BESTAND).size < 1.2e6, 'groter dan 1,2 MB');
  assert.equal(data.provincie.naam, 'Groningen');
  assert.ok(data.gemeenten.length >= 9 && data.gemeenten.length <= 12, 'de gemeenten van de provincie: ' + data.gemeenten.length);
  assert.ok(data.woonplaatsen.length > 150 && data.wijken.length > 80 && data.buurten.length > 400);
});
const g = bestaat ? GR.ontvouw(data) : null;
t('het bestand verwijst naar zichzelf: unieke codes, elke gemeente bestaat, elke buurt hoort bij een wijk van dezelfde gemeente', () => {
  const unieken = (l) => new Set(l.map((x) => x.id)).size === l.length;
  for (const l of ['gemeenten', 'woonplaatsen', 'wijken', 'buurten']) assert.ok(unieken(g[l]), l + ' heeft dubbele codes');
  const gm = new Set(g.gemeenten.map((x) => x.id));
  for (const l of ['woonplaatsen', 'wijken', 'buurten']) for (const x of g[l]) assert.ok(gm.has(x.gm), `${l}: ${x.id} ${x.naam} noemt gemeente ${x.gm}`);
  const wk = new Map(g.wijken.map((x) => [x.id, x]));
  let zonderWijk = 0;
  for (const b of g.buurten) { if (!b.wk) { zonderWijk++; continue; } assert.ok(wk.has(b.wk) && wk.get(b.wk).gm === b.gm, `buurt ${b.id} ${b.naam}: wijk ${b.wk}`); }
  assert.ok(zonderWijk < g.buurten.length * 0.05, `buurten zonder wijk: ${zonderWijk}`);
});
t('elk gebied heeft zijn binnenpunt in zichzelf en alle ringen hebben minstens drie punten', () => {
  for (const l of ['gemeenten', 'woonplaatsen', 'wijken', 'buurten']) {
    for (const x of g[l]) {
      assert.ok(GR.puntInGebied(x, x.c[0], x.c[1]), `${l} ${x.id} ${x.naam}: het binnenpunt ligt er niet in`);
      for (const poly of x.p) for (const r of poly) assert.ok(r.length >= 3, `${x.id}: een ring met ${r.length} punten`);
    }
  }
});
t('bekende plekken liggen in het goede gebied (de echte grenzen, niet de wijkpunten van het HUD)', () => {
  const welke = (lat, lon) => { const [x, y] = wgsToWorld(lat, lon); return GR.grensVan(g, x, y); };
  const gm = (lat, lon) => welke(lat, lon).gemeente && welke(lat, lon).gemeente.naam;
  assert.equal(gm(53.2194, 6.5665), 'Groningen');
  assert.equal(welke(53.2194, 6.5665).woonplaats.naam, 'Groningen');
  assert.equal(gm(53.3218, 6.8564), 'Eemsdelta', 'Appingedam');
  assert.equal(welke(53.3218, 6.8564).woonplaats.naam, 'Appingedam');
  assert.equal(gm(53.1435, 7.0349), 'Oldambt', 'Winschoten');
  assert.equal(gm(53.1052, 6.8791), 'Veendam');
  assert.equal(gm(52.8772, 7.061), 'Westerwolde', 'Ter Apel');
  assert.equal(gm(53.4, 6.65), 'Het Hogeland');
  assert.equal(welke(53.2194, 6.5665).provincie.naam, 'Groningen');
  const buiten = welke(52.9967, 6.5625); // Assen
  assert.equal(buiten.provincie, null); assert.equal(buiten.gemeente, null);
  assert.ok(rdToWorld(233670, 582075).every((v) => v === 0));
});
t('de gemeenten dekken de provincie: een raster van punten in het land valt niet in een gat', () => {
  let binnen = 0, gat = 0;
  for (let lat = 52.95; lat <= 53.4; lat += 0.05) for (let lon = 6.3; lon <= 7.1; lon += 0.05) {
    const [x, y] = wgsToWorld(lat, lon);
    const r = GR.grensVan(g, x, y);
    if (r.provincie) { binnen++; if (!r.gemeente) gat++; }
  }
  assert.ok(binnen > 100);
  assert.ok(gat / binnen < 0.05, `punten in de provincie maar in geen gemeente: ${gat} van ${binnen} (zee en randen tellen mee)`);
});
t('punt-in-polygoon is snel genoeg voor het spel: een honderd plekken in een paar milliseconden', () => {
  const t0 = performance.now();
  for (let i = 0; i < 100; i++) GR.grensVan(g, -3000 + i * 130, -2000 + i * 70);
  assert.ok(performance.now() - t0 < 300, `${(performance.now() - t0).toFixed(0)} ms voor 100 plekken`);
});
t('het bestand is deterministisch uit de cache te maken (alleen als de cache er is)', () => {
  const inv = path.join(ROOT, 'data', 'cache', 'grenzen');
  if (!fs.existsSync(path.join(inv, 'bron.json'))) return;
  const uit = path.join(os.tmpdir(), `gde-grenzen-test-${process.pid}.json`);
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'world', 'grenzen.mjs'), `--uit=${uit}`], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const gelijk = fs.readFileSync(uit).equals(fs.readFileSync(BESTAND));
  fs.rmSync(uit, { force: true });
  assert.ok(gelijk, 'game/grenzen.json komt niet overeen met wat grenzen.mjs uit data/cache/grenzen maakt (opnieuw genereren en committen)');
});

// ------------------------------------------------------------------ het fetch-script en de licenties
t('fetch_grenzen.mjs haalt zonder --haal-op niets op en noemt alleen open bronnen van PDOK', () => {
  const uit = path.join(os.tmpdir(), `gde-fetch-test-${process.pid}`);
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'world', 'fetch_grenzen.mjs'), `--uit=${uit}`], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /niets opgehaald/);
  assert.ok(!fs.existsSync(uit), 'zonder --haal-op wordt er niets aangemaakt');
  const hosts = new Set([...r.stdout.matchAll(/https:\/\/([^/\s]+)/g)].map((m) => m[1]));
  assert.deepEqual([...hosts], ['api.pdok.nl']);
  for (const w of ['bestuurlijkegebieden', 'woonplaats', 'wijk_gegeneraliseerd', 'buurt_gegeneraliseerd']) assert.ok(r.stdout.includes(w), w);
  assert.ok(r.stdout.includes('28992'), 'de coördinaten komen rechtstreeks in RD New');
});
t('de spelcode haalt nergens zelf grenzen van het netwerk: alleen het bestand naast index.html', () => {
  const JS = path.join(ROOT, 'game', 'js');
  for (const f of ['gebieden.js', 'grenzen.js', 'gebiedenlive.js', 'gebiedenbronnen.js', 'gebiedenkaart.js', 'gebiedenui.js', 'safehuizen.js']) {
    const s = fs.readFileSync(path.join(JS, f), 'utf8');
    assert.ok(!/https?:\/\/(?!cdn\.jsdelivr\.net\/npm\/three)/.test(s.replace(/\/\/.*$/gm, '')), `${f} noemt een externe url`);
  }
});
t('de licenties en de aftiteling noemen PDOK, het Kadaster en het CBS', () => {
  const lic = fs.readFileSync(path.join(ROOT, 'docs', 'LICENTIES.md'), 'utf8');
  for (const w of ['Bestuurlijke Gebieden', 'BAG', 'Gebiedsindelingen', 'CC BY 4.0', 'Public Domain', 'grenzen.json']) assert.ok(lic.includes(w), 'docs/LICENTIES.md mist ' + w);
  const credits = ['game/js/credits.js', 'NOTICE.md', 'docs/LICENTIES.md'].map((f) => fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : '').join('\n');
  assert.ok(/Kadaster/.test(credits) && /CBS/.test(credits), 'Kadaster en CBS staan niet in de aftiteling');
});

console.log(`${n - fails}/${n} geslaagd`);
process.exit(fails ? 1 : 0);
