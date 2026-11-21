// De locatiekaart naast de minimap (#1079): standaard onderin, alleen omhoog voor wat eronder komt, met hysterese.
//   node scripts/hudlinks_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { locatieLift, locatieHysterese, locatieVerschuiving, LOCATIE_GAP, LOCATIE_OMHOOG_MS, LOCATIE_OMLAAG_MS, LOCATIE_MOVE_MS } from '../game/js/hudlinks.js';

const lees = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (naam, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 3).join('\n   ')); } };

t('geen items: de kaart staat onderin (lift 0)', () => {
  assert.equal(locatieLift({}).lift, 0);
  assert.equal(locatieLift({ onder: [] }).lift, 0);
  assert.equal(locatieLift({ onder: [{ id: 'speler', h: 90, zichtbaar: false }] }).lift, 0, 'een verborgen blok telt niet mee');
});

t('één item: omhoog met zijn hoogte plus de gap', () => {
  const r = locatieLift({ onder: [{ id: 'speler', h: 90, zichtbaar: true }] });
  assert.equal(r.lift, 90 + LOCATIE_GAP);
  assert.equal(r.door, 'speler');
});

t('meerdere items: de hoogtes en gaps tellen op', () => {
  const r = locatieLift({ onder: [{ id: 'a', h: 40 }, { id: 'b', h: 30 }, { id: 'c', h: 20, zichtbaar: false }] });
  assert.equal(r.lift, 40 + 30 + 2 * LOCATIE_GAP);
});

t('een ondertitel onder de kaart tilt hem precies zijn overlap plus de gap; een ondertitel ernaast niet', () => {
  const kaart = { x0: 312, x1: 560, bodem: 674 };
  assert.equal(locatieLift({ hindernissen: [{ id: 'sub', x0: 700, x1: 1000, top: 600 }], kaart }).lift, 0, 'staat rechts van de kaart');
  const onder = locatieLift({ hindernissen: [{ id: 'sub', x0: 400, x1: 900, top: 620 }], kaart });
  assert.equal(onder.lift, 674 - 620 + LOCATIE_GAP);
  assert.equal(onder.door, 'sub');
  assert.equal(locatieLift({ hindernissen: [{ id: 'sub', x0: 400, x1: 900, top: 300 }], kaart, max: 200 }).lift, 200, 'nooit hoger dan het maximum');
  assert.equal(locatieLift({ hindernissen: [{ id: 'sub', x0: 400, x1: 900, top: 674 + LOCATIE_GAP + 5 }], kaart }).lift, 0, 'een hindernis onder de gap raakt de kaart niet');
});

t('stroom en hindernis tellen niet dubbel: de hoogste eis wint', () => {
  const kaart = { x0: 0, x1: 300, bodem: 700 };
  assert.equal(locatieLift({ onder: [{ id: 'speler', h: 90 }], hindernissen: [{ id: 'sub', x0: 0, x1: 300, top: 640 }], kaart }).lift, 100, 'het speler-blok (100) is hoger dan de ondertitel (70)');
  assert.equal(locatieLift({ onder: [{ id: 'speler', h: 20 }], hindernissen: [{ id: 'sub', x0: 0, x1: 300, top: 640 }], kaart }).lift, 70);
});

t('de verschuiving: onderin zakt de kaart door de ruimte van het verborgen blok', () => {
  assert.equal(locatieVerschuiving(90, LOCATIE_GAP, 0), 100, 'lift 0: omlaag met blok + gap');
  assert.equal(locatieVerschuiving(90, LOCATIE_GAP, 100), 0, 'lift is blok + gap: de stroom zet hem');
  assert.equal(locatieVerschuiving(90, LOCATIE_GAP, 300), 0, 'nooit omhoog door de stroom');
});

t('hysterese: de start geldt meteen; omhoog wacht 300 ms, omlaag 600 ms', () => {
  let r = locatieHysterese(null, 100, 0);
  assert.equal(r.lift, 100, 'de eerste stand meteen');
  r = locatieHysterese(r.staat, 0, 1000);
  assert.equal(r.lift, 100); assert.equal(r.wacht, LOCATIE_OMLAAG_MS);
  r = locatieHysterese(r.staat, 0, 1000 + LOCATIE_OMLAAG_MS - 1);
  assert.equal(r.lift, 100, 'nog net niet');
  r = locatieHysterese(r.staat, 0, 1000 + LOCATIE_OMLAAG_MS);
  assert.equal(r.lift, 0, 'na 600 ms omlaag');
  r = locatieHysterese(r.staat, 100, 5000);
  assert.equal(r.lift, 0); assert.equal(r.wacht, LOCATIE_OMHOOG_MS);
  r = locatieHysterese(r.staat, 100, 5000 + LOCATIE_OMHOOG_MS);
  assert.equal(r.lift, 100, 'na 300 ms omhoog');
});

t('een item dat korter dan 400 ms zichtbaar is laat de kaart niet bewegen', () => {
  let r = locatieHysterese(null, 0, 0);
  r = locatieHysterese(r.staat, 100, 1000);
  r = locatieHysterese(r.staat, 100, 1200);
  assert.equal(r.lift, 0);
  r = locatieHysterese(r.staat, 0, 1350);
  assert.equal(r.lift, 0); assert.equal(r.wacht, null, 'terug op de eigen stand: geen timer');
  r = locatieHysterese(r.staat, 0, 2500);
  assert.equal(r.lift, 0, 'de kaart heeft niet bewogen');
});

t('een knipperend item (aan en uit binnen de wachttijden) pompt de kaart niet', () => {
  let r = locatieHysterese(null, 100, 0);
  let tijd = 0;
  for (let i = 0; i < 20; i++) { tijd += 250; r = locatieHysterese(r.staat, i % 2 ? 100 : 0, tijd); assert.equal(r.lift, 100, `stap ${i}`); }
});

t('meetruis (minder dan 2 px) verplaatst niets', () => {
  let r = locatieHysterese(null, 100, 0);
  r = locatieHysterese(r.staat, 101, 5000);
  assert.equal(r.lift, 100); assert.equal(r.wacht, null);
});

t('schaal 1,0 tot 1,5 en 1024x600: de lift blijft binnen het maximum en de kaart in beeld', () => {
  for (const ui of [1, 1.25, 1.5]) for (const [w, h] of [[1024, 600], [1280, 720], [1920, 1080]]) {
    const vh = h / ui, vw = w / ui, bodem = vh - 46;
    const kaart = { x0: 46 + 266, x1: 46 + 266 + 250, bodem };
    const sub = { id: 'sub', x0: vw / 2 - 280, x1: vw / 2 + 280, top: bodem - 60 };
    const r = locatieLift({ onder: [{ id: 'speler', h: 96 }], hindernissen: [sub], kaart });
    assert.ok(r.lift >= 0 && r.lift <= 400, `${w}x${h} @${ui}`);
    assert.ok(bodem - r.lift > 0, 'de kaart blijft in beeld');
  }
});

t('de verschuiving is kort (<= 250 ms) en uit bij Rustig drukwerk en Beweging beperken', () => {
  assert.ok(LOCATIE_MOVE_MS <= 250);
  const css = lees('game/js/hud_panel.css');
  assert.match(css, /#hud \.hud-location \{ translate: 0 var\(--hud-loc-y, 0px\); transition: translate 0\.2s/);
  assert.match(css, /html\.rustig-drukwerk #hud \.hud-location, html\.reduce-motion #hud \.hud-location \{ transition: none; \}/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{ #hud \.hud-location \{ transition: none; \}/);
});

t('de bedrading: één bron (hudlinks.js), metingen bij een verandering, de kaart onderaan de kolom', () => {
  const js = lees('game/js/hud_panel.js');
  assert.match(js, /from '\.\/hudlinks\.js'/);
  assert.match(js, /watchLocatie\(root, fcol, location, topLeft\)/);
  assert.match(js, /new ResizeObserver\(\(\) => requestAnimationFrame\(meet\)\)\.observe\(topLeft\)/);
  assert.match(js, /locatieHysterese\(staat, wil\(\), performance\.now\(\)\)/);
  const fn = js.slice(js.indexOf('function watchLocatie'), js.indexOf('function fitEdge'));
  assert.ok(fn.length > 200 && !/updateHud|requestAnimationFrame\(function tick/.test(fn), 'geen per-frame meting');
  const css = lees('game/js/hud_panel.css');
  assert.match(css, /left: calc\(var\(--hud-edge\) \+ var\(--mm-size\) \+ 16px\); bottom: var\(--mm-bottom\);/, 'de kolom staat gelijk met de onderkant van de minimap');
});

console.log(`${n - fails}/${n} geslaagd`);
if (fails) process.exit(1);
