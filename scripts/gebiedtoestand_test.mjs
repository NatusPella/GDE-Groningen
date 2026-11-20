// De vier toestanden van een gebied op de kaart (game/js/gebiedtoestand.js): onzichtbaar, zichtbaar, bezig, veroverd.
// Pure regels: de toestand uit het profiel van deze speler, het uiterlijk (nooit alleen kleur), de legenda en de iconen.
//   node scripts/gebiedtoestand_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TOESTANDEN, TOESTAND_INFO, zichtbareGebieden, toestandVan, telToestanden, toestandStijl, legendaRijen, toonNaam } from '../game/js/gebiedtoestand.js';
import { iconBekend } from '../game/js/icons.js';
import { contrast, dsKleur } from '../game/js/kaartkleuren.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

// een kleine indeling: provincie > gemeente > wijk > twee buurten, plus een tweede wijk met één buurt
const ind = { gebied: new Map() };
const maak = (id, ouder = null) => ind.gebied.set(id, { id, ouder });
maak('pv:1'); maak('gm:1', 'pv:1'); maak('wk:1', 'gm:1'); maak('wk:2', 'gm:1'); maak('bu:1', 'wk:1'); maak('bu:2', 'wk:1'); maak('bu:3', 'wk:2');

t('een bezochte buurt maakt zijn hele keten zichtbaar, de rest niet', () => {
  const z = zichtbareGebieden(ind, ['bu:1']);
  assert.deepEqual([...z].sort(), ['bu:1', 'gm:1', 'pv:1', 'wk:1']);
  assert.ok(!z.has('bu:2') && !z.has('wk:2') && !z.has('bu:3'));
  assert.equal(zichtbareGebieden(ind, []).size, 0);
  assert.equal(zichtbareGebieden(null, ['bu:1']).size, 0);
  assert.equal(zichtbareGebieden(ind, null).size, 0);
  assert.equal(zichtbareGebieden(ind, ['bestaat-niet']).size, 0);
});
t('toestandVan: veroverd gaat voor bezig, bezig voor zichtbaar, zichtbaar voor onzichtbaar', () => {
  const z = zichtbareGebieden(ind, ['bu:1']);
  const r = (id, klaar, voltooid = false) => ({ gebied: { id }, klaar, voltooid });
  assert.equal(toestandVan(r('wk:1', 0), z), 'zichtbaar');
  assert.equal(toestandVan(r('wk:2', 0), z), 'onzichtbaar');
  assert.equal(toestandVan(r('wk:2', 3), z), 'bezig', 'wat je deed telt ook zonder bezoek');
  assert.equal(toestandVan(r('wk:1', 3), z), 'bezig');
  assert.equal(toestandVan(r('wk:1', 5, true), z), 'veroverd');
  assert.equal(toestandVan(r('wk:2', 0, true), z), 'veroverd');
  assert.equal(toestandVan(null, z), 'onzichtbaar');
  assert.equal(toestandVan(r('wk:1', 0), null), 'onzichtbaar');
});
t('telToestanden telt per toestand', () => {
  const c = telToestanden([{ toestand: 'bezig' }, { toestand: 'bezig' }, { toestand: 'veroverd' }, { toestand: 'onzichtbaar' }, { toestand: 'rommel' }, null]);
  assert.deepEqual(c, { onzichtbaar: 1, zichtbaar: 0, bezig: 2, veroverd: 1 });
});
t('elke toestand ziet er anders uit, ook zonder kleur: lijnsoort, raster, ring of icoon', () => {
  const stijlen = TOESTANDEN.map((id) => toestandStijl({ toestand: id, vlag: '#4fb3a6', deel: 0.5 }, dsKleur('creme')));
  const sleutel = (s) => `${s.streep}|${s.raster}|${s.ring}|${s.icoon}`;
  assert.equal(new Set(stijlen.map(sleutel)).size, 4, stijlen.map(sleutel).join(' / '));
  const [onz, zicht, bezig, ver] = stijlen;
  assert.equal(onz.raster, true); assert.equal(zicht.streep, true);
  assert.ok(bezig.ring === 0.5 && bezig.lijnAlpha === 1 && bezig.streep === false);
  assert.ok(ver.breed > bezig.breed && ver.breed > zicht.breed && ver.alpha > bezig.alpha && ver.alpha > zicht.alpha, 'veroverd is de zwaarste');
  assert.ok(onz.lijnAlpha < zicht.lijnAlpha && onz.breed < zicht.breed, 'onzichtbaar is de zachtste');
  assert.equal(ver.vul, '#4fb3a6', 'veroverd: de inkt van het gebied');
});
t('de accentkleur van bezig is het geel van de zeefdruk en verschilt van de rest', () => {
  const g = toestandStijl({ toestand: 'bezig', deel: 0.3 });
  assert.equal(g.lijn, dsKleur('ink-geel'));
  assert.ok(contrast(g.lijn, dsKleur('glas')) >= 7 && contrast(g.lijn, dsKleur('ink-inkt')) >= 7);
});
t('de legenda heeft de vier toestanden in vaste volgorde, met woorden en een icoon uit de iconenset', () => {
  const rijen = legendaRijen();
  assert.deepEqual(rijen.map((r) => r.id), ['onzichtbaar', 'zichtbaar', 'bezig', 'veroverd']);
  assert.deepEqual(rijen.map((r) => r.naam), ['Nog onzichtbaar', 'Zichtbaar', 'Aan het veroveren', 'Veroverd']);
  for (const r of rijen) { assert.ok(r.uitleg && r.lijn, r.id); assert.ok(iconBekend(TOESTAND_INFO[r.id].icoon), 'icoon ' + r.id); }
});
t('een onzichtbaar gebied heeft geen naam op de kaart', () => {
  assert.equal(toonNaam('onzichtbaar'), false);
  for (const id of ['zichtbaar', 'bezig', 'veroverd']) assert.equal(toonNaam(id), true);
});
t('de module is puur (geen DOM, geen netwerk) en de kaart kent geen nieuw netwerkveld', () => {
  const src = fs.readFileSync(new URL('../game/js/gebiedtoestand.js', import.meta.url), 'utf8');
  assert.ok(!/document\.|window\.|fetch\(|WebSocket|localStorage/.test(src));
  const net = fs.readFileSync(new URL('../game/js/gebiedenkaart.js', import.meta.url), 'utf8');
  assert.ok(!/EXTRA|snapshot|sendTo|broadcast/i.test(net), 'de kaart blijft lokaal');
});

console.log(fails ? `${n - fails}/${n} geslaagd` : `${n}/${n} geslaagd`);
process.exit(fails ? 1 : 0);
