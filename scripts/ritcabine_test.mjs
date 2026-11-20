// De binnenkant van de rit (#882 taxi, #926 trein): de maten van de cabine van Gele Gans, de meter, het treinraam en het
// perron van de aankomst narekenen (game/js/ritcabine.js). Geen THREE, geen DOM.
//   node scripts/ritcabine_test.mjs
import assert from 'node:assert/strict';
import * as C from '../game/js/ritcabine.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };
const cab = C.taxiCabine();
const alles = [...cab.vast, ...cab.cijfers];

t('de cabine heeft een verzonnen naam en een verzonnen tarief', () => {
  assert.equal(C.TAXI_NAAM, 'Gele Gans');
  assert.ok(C.TAXI_TARIEF.start > 0 && C.TAXI_TARIEF.perKm > 0);
});

t('elk onderdeel heeft een eindige plek, maat, rotatie en kleur', () => {
  assert.ok(alles.length > 80 && alles.length < 260, `het aantal dozen (${alles.length}) blijft klein: één geometrie`);
  for (const d of alles) {
    assert.ok(d.at.length === 3 && d.at.every(Number.isFinite), 'plek');
    assert.ok(d.b.length === 3 && d.b.every((v) => Number.isFinite(v) && v > 0), 'maat');
    assert.ok(d.rot.length === 3 && d.rot.every(Number.isFinite), 'rotatie');
    assert.ok(Number.isInteger(d.c) && d.c >= 0 && d.c <= 0xffffff, 'kleur');
    assert.ok(d.g === 0 || d.g === 1, 'groep');
  }
});

t('alles zit in de taxi: tussen de achterruit en de motorkap, binnen de portieren, onder het dak', () => {
  for (const d of cab.vast.filter((x) => x.g === 0)) {
    assert.ok(d.at[0] > -2.1 && d.at[0] < 3.1, `lengte ${d.at[0]}`);
    assert.ok(Math.abs(d.at[2]) < 1.3, `breedte ${d.at[2]}`);
    assert.ok(d.at[1] > 0.1 && d.at[1] < 1.7, `hoogte ${d.at[1]}`);
  }
});

t('het oog van de passagier zit rechts voorin, op zithoogte', () => {
  const o = C.TAXI_OOG;
  assert.ok(o.z > 0.2 && o.z < 0.6, 'rechts van het midden');
  assert.ok(o.y > 1.1 && o.y < 1.4, 'zithoogte');
});

t('de straat vult het beeld: het dashboard, de stijlen en de hemel nemen minder dan de helft in', () => {
  const pitch = -0.03;
  const recht = C.beeldDekking(alles, C.TAXI_OOG, { yaw: 0, pitch, fov: 70 });
  assert.ok(recht.open >= 0.44, `recht vooruit is ${Math.round(recht.open * 100)}% open`);
  // geen enkel onderdeel (de deur, een A-stijl, het dashboard) vult een groot deel van het beeld
  const top = Math.max(...Object.values(recht.geraakt));
  assert.ok(top < 0.2, `geen onderdeel vult meer dan 20% van het beeld (${Math.round(top * 100)}%)`);
  const naarRaam = C.beeldDekking(alles, C.TAXI_OOG, { yaw: 0.6, pitch, fov: 70 });
  assert.ok(naarRaam.open >= 0.5, `een blik naar rechts is ${Math.round(naarRaam.open * 100)}% open`);
});

t('de chauffeur is te zien als de passagier naar links kijkt, en de meter heeft vier cijfers', () => {
  const m = C.meterDelen();
  const chauffeur = cab.vast.filter((d) => d.at[2] < -0.2 && d.at[2] > -0.65 && d.at[0] < -0.2 && d.at[0] > -0.7 && d.at[1] > 0.9);
  assert.ok(chauffeur.length >= 3, 'romp, hoofd en pet staan op de chauffeursstoel');
  const links = C.beeldDekking(alles, C.TAXI_OOG, { yaw: -0.8, pitch: -0.03, fov: 70 });
  const idx = new Set(chauffeur.map((d) => alles.indexOf(d)));
  const zicht = Object.entries(links.geraakt).filter(([k]) => idx.has(Number(k))).reduce((s, [, v]) => s + v, 0);
  assert.ok(zicht > 0.04, `de chauffeur vult ${Math.round(zicht * 100)}% van het beeld bij een blik naar links`);
  assert.equal(m.cijfers.length, C.METER_CIJFERS * C.SEGMENTEN.length, 'vier cijfers van zeven segmenten');
  assert.ok(m.cijfers.every((d) => d.g === 1), 'het scherm brandt zelf (groep 1)');
});

t('de meter rekent: instaptarief, per kilometer, en eindigt op wat de rit kost', () => {
  assert.equal(C.taxiBedrag(0), C.TAXI_TARIEF.start);
  assert.ok(C.taxiBedrag(5000) > C.taxiBedrag(1000), 'loopt op met de afstand');
  assert.equal(C.taxiBedrag(5000, { totaalM: 10000, prijs: 20 }), Math.round((C.TAXI_TARIEF.start + (20 - C.TAXI_TARIEF.start) / 2) * 100) / 100);
  assert.equal(C.taxiBedrag(10000, { totaalM: 10000, prijs: 20 }), 20, 'aan het eind staat de prijs die de speler betaalt');
  assert.equal(C.taxiBedrag(99999999), 99.99, 'nooit meer dan het scherm kan tonen');
  assert.ok(Number.isFinite(C.taxiBedrag(NaN)) && C.taxiBedrag(-50) === C.TAXI_TARIEF.start);
  assert.equal(C.taxiBedrag(1000, { totaalM: 2000, prijs: 1 }), 1, 'een prijs onder het instaptarief wordt niet overschreden');
});

t('de segmenten van de meter kloppen met de cijfers', () => {
  assert.deepEqual(C.meterSegmenten(12.4), ['bc', 'abged', 'fgbc', 'abcdef']);
  assert.deepEqual(C.meterSegmenten(3.4), ['', 'abgcd', 'fgbc', 'abcdef'], 'een nul voorop blijft uit');
  assert.deepEqual(C.meterSegmenten(0), ['', 'abcdef', 'abcdef', 'abcdef']);
  assert.equal(C.zevenSegment(8), 'abcdefg');
  assert.equal(C.zevenSegment(1), 'bc');
  assert.equal(C.meterSegmenten(NaN).length, C.METER_CIJFERS);
  assert.equal(C.meterSegmenten(1e6).join('|'), C.meterSegmenten(99.99).join('|'));
});

t('een staaf loopt van punt naar punt en een straal langs hem raakt hem', () => {
  const s = C.staaf([0, 0, 0], [3, 0, 4], 0.1, 0xffffff);
  assert.ok(Math.abs(s.b[0] - 5) < 1e-9, 'lengte');
  assert.ok(Math.abs(s.at[0] - 1.5) < 1e-9 && Math.abs(s.at[2] - 2) < 1e-9);
  assert.ok(Number.isFinite(C.straalDoos([0, 1, 0], [0, -1, 0], s)), 'een straal van boven af raakt het midden van de staaf');
  assert.equal(C.straalDoos([0, 5, 0], [0, 1, 0], s), Infinity, 'een straal die wegkijkt mist');
});

t('het treinraam laat een groot raam open en dekt de rest', () => {
  const k = C.treinKaderDelen();
  // in kaderruimte kijkt de lens naar -z; beeldDekking kijkt langs +x: draai de dozen mee
  const gedraaid = k.map((d) => ({ ...d, at: [-d.at[2], d.at[1], d.at[0]], b: [d.b[2], d.b[1], d.b[0]] }));
  const r = C.beeldDekking(gedraaid, { x: 0, y: 0, z: 0 }, { fov: 62, aspect: 16 / 9 });
  assert.ok(r.open > 0.35 && r.open < 0.85, `${Math.round(r.open * 100)}% van het beeld is raam`);
  assert.ok(k.every((d) => d.at[2] <= -C.KADER_D + 0.4 && d.at[2] >= -C.KADER_D - 0.2), 'het kader staat 0,6 tot 1,2 m voor de lens, voorbij het near-vlak');
});

t('het perron van de aankomst: de plek op de middellijn van het dichtstbijzijnde perron', () => {
  const rijen = [
    { id: 'a', st: 'Groningen', p: [[0, 0, 4, 1.02], [100, 0, 4, 1.02]] },
    { id: 'b', st: 'Haren', p: [[0, 30, 4, 1.02], [100, 30, 4, 1.02]] },
  ];
  const k = C.perronPlek(rijen, [40, 6]);
  assert.ok(k && Math.abs(k.x - 40) < 1e-9 && Math.abs(k.y) < 1e-9 && k.z === 1.02 && k.rij === 'a', 'het dichtstbijzijnde perron, recht tegenover de trein');
  assert.equal(C.perronPlek(rijen, [40, 6], { naam: 'Haren', maxM: 60 }).rij, 'b', 'het perron van het station gaat voor');
  assert.equal(C.perronPlek(rijen, [400, 400]), null, 'te ver: geen perron');
  assert.equal(C.perronPlek([], [0, 0]), null);
  assert.equal(C.perronPlek(null, [0, 0]), null);
  assert.equal(C.perronPlek(rijen, [NaN, 0]), null);
  const eind = C.perronPlek(rijen, [-30, 4]);
  assert.ok(eind && eind.x === 0, 'voorbij de kop van het perron: het eerste punt');
  const lopend = C.perronPlek([{ id: 'c', st: 'X', p: [[0, 0, 4, 1], [100, 0, 4, 2]] }], [50, 3]);
  assert.ok(Math.abs(lopend.z - 1.5) < 1e-9, 'de hoogte loopt mee met het perron');
});

console.log(`ritcabine_test: ${n}/${n} ok`);
