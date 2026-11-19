// Kaartontdekking (#899): de onbezochte buurten uitgrijzen. Pure checks op
// kaartontdekking.js (welke buurten nog niet bezocht zijn, de maat van het masker, de
// dekking en de fade) op de echte grenzen, plus bronchecks op de kaart: het masker
// wordt getekend, de namen van onbezochte buurten wachten en de oude mist is weg.
//   node scripts/kaartontdekking_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ontvouw } from '../game/js/grenzen.js';
import { bouwIndeling } from '../game/js/gebieden.js';
import { unseenDistricts, discoveryRatio, revealAlpha, maskSize, DISCOVERY_RES_M, REVEAL_MS } from '../game/js/kaartontdekking.js';

let n = 0, fails = 0;
const ok = (c, naam, extra = '') => { n++; if (!c) { fails++; console.log('FAIL ' + naam + (extra ? ' :: ' + extra : '')); } };

// De echte indeling (zonder taken): 644 buurten van de provincie.
const grenzen = ontvouw(JSON.parse(fs.readFileSync(new URL('../game/grenzen.json', import.meta.url), 'utf8')));
const ind = bouwIndeling({ grenzen, taken: [] });
const buurten = ind.gebieden.filter((g) => g.niveau === 'buurt');
{
  ok(buurten.length >= 600, 'de indeling heeft de buurten van de provincie', String(buurten.length));
  const leeg = unseenDistricts(ind, { bezocht: [] });
  ok(leeg.length === buurten.length, 'zonder bezoeken is elke buurt onbezocht', `${leeg.length}/${buurten.length}`);
  ok(leeg.every((g) => g.niveau === 'buurt' && g.grens), 'alleen buurten met een grens');
  const eerste = buurten[0].id;
  const gezien = unseenDistricts(ind, { bezocht: [eerste] });
  ok(gezien.length === buurten.length - 1, 'een bezochte buurt valt uit het masker');
  ok(!gezien.some((g) => g.id === eerste), 'de bezochte buurt staat er niet meer in');
  assert.deepEqual(unseenDistricts(null, {}), []);
  assert.deepEqual(unseenDistricts({ gebieden: null }, {}), []);
  // de dekking telt dezelfde buurten, naar beneden afgerond
  const nul = discoveryRatio(ind, { bezocht: [] });
  ok(nul.done === 0 && nul.total === buurten.length && nul.pct === 0, 'zonder bezoeken 0%');
  const half = discoveryRatio(ind, { bezocht: buurten.slice(0, Math.floor(buurten.length / 2)).map((g) => g.id) });
  ok(half.pct === Math.floor((Math.floor(buurten.length / 2) / buurten.length) * 100), 'de helft geeft de afgeronde dekking', String(half.pct));
  const vol = discoveryRatio(ind, { bezocht: buurten.map((g) => g.id) });
  ok(vol.pct === 100 && vol.done === vol.total, 'alles bezocht is 100%');
  assert.deepEqual(discoveryRatio(null, {}), { done: 0, total: 0, pct: 0 });
}

{
  const m = maskSize([0, 0, 1600, 800], 80);
  ok(m.w === 20 && m.h === 10, 'de maskermaat volgt de wereldbox en de resolutie', JSON.stringify(m));
  ok(maskSize([0, 0, 10, 10], 80) !== null, 'een kleine box krijgt nog een masker');
  assert.equal(maskSize(null, 80), null);
  assert.equal(maskSize([0, 0, 0, 10], 80), null);
  assert.equal(maskSize([0, 0, 10, 10], 0), null);
  ok(DISCOVERY_RES_M >= 40 && DISCOVERY_RES_M <= 160, 'de resolutie is grof genoeg voor een masker en fijn genoeg voor een zachte rand');
}

{
  ok(revealAlpha(1000, 1000) === 1, 'vlak na het bezoek is de fade vol');
  ok(revealAlpha(1000 + REVEAL_MS, 1000) === 0, 'na de fade is hij weg');
  ok(revealAlpha(1000 + REVEAL_MS + 5000, 1000) === 0, 'hij blijft weg');
  let vorig = 1, daalt = true;
  for (let t = 0; t <= REVEAL_MS; t += 50) { const a = revealAlpha(1000 + t, 1000); if (a > vorig + 1e-9) daalt = false; vorig = a; }
  ok(daalt, 'de fade daalt gelijkmatig');
  ok(revealAlpha(NaN, 1000) === 0 && revealAlpha(1000, NaN) === 0, 'kapotte tijd geeft geen fade');
}

// De haken in de kaart: het masker, de namen en het einde van de oude mist.
{
  const map = fs.readFileSync(new URL('../game/js/mapview.js', import.meta.url), 'utf8');
  ok(map.includes("from './kaartontdekking.js'"), 'de kaart importeert de ontdekkingsregels');
  ok(map.includes('drawDiscovery(c, performance.now())'), 'de kaart tekent het masker boven de tegels');
  ok(map.includes('traceAreas(c, d.unseen)') && map.includes("c.fill('evenodd')"), 'alle onbezochte buurten in één pad en één vulling (geen antialias-naden)');
  ok(!map.includes("globalCompositeOperation = 'saturation'"), 'geen blend-modi meer die het masker blokkerig maakten');
  ok(map.includes('imageSmoothingQuality') && map.includes('blurEdge(d)'), 'het masker wordt zacht geschaald en de rand geblurd');
  ok(map.includes('c.globalAlpha = 1;') && map.includes('mistByte(') && map.includes('applyStreekMist('), 'de dekking zit per cel in het masker (kaartonthulling.js, #990)');
  ok(map.includes('unseenDistricts(o.ind, profiel)') && map.includes('buildDiscoveryMask()'), 'het masker komt uit de onbezochte buurten');
  ok(map.includes('function discoveryHidden(x, y)'), 'de kaart kan een plek in een onbezochte buurt herkennen');
  ok(map.includes('if (discoveryHidden(v.x, v.y)) continue;') && map.includes('if (discoveryHidden(p.x, p.y)) continue;'), 'de plaats- en wijknamen van onbezochte buurten wachten');
  ok(map.includes('revealAlpha(now, r.at)'), 'een net bezochte buurt gloeit zacht uit');
  ok(map.includes('opVeranderen as onGebiedenChange') && map.includes('refreshDiscovery(true)'), 'de kaart hoort meteen bij een nieuwe buurt');
  ok(map.includes('o.kaart && o.kaart.totaal') && map.includes('o.kaart.pct / 100'), 'het percentage op de kaart komt uit dezelfde teller als de prestatie');
  ok(!map.includes('initFog(') && !map.includes('updateFog(') && !map.includes('FOG_CELL'), 'de oude mist is weg');
  const sett = fs.readFileSync(new URL('../game/js/settings.js', import.meta.url), 'utf8');
  ok(sett.includes('showFog: true'), 'de instelling "Verkende gebieden op de kaart" blijft bestaan');
  const pausemenu = fs.readFileSync(new URL('../game/js/pausemenu.js', import.meta.url), 'utf8');
  ok(pausemenu.includes("toggle('showFog', 'Verkende gebieden op de kaart')"), 'de instelling staat nog in het menu');
}

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
