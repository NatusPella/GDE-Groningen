// De vier verhaalgebieden als data (#1361): game/js/storyregions.js. Pure test, zonder Electron en zonder netwerk.
//   node scripts/storyregions_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as SR from '../game/js/storyregions.js';
import * as GR from '../game/js/grenzen.js';
import { wgsToWorld } from '../game/js/rdnew.js';
import { VAK_IDS } from '../game/js/loopbaan.js';
import { STEPS, CHARACTERS } from '../game/js/storyarc_nieuw.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

const grenzen = GR.ontvouw(JSON.parse(fs.readFileSync(path.join(ROOT, 'game', 'grenzen.json'), 'utf8')));
assert.ok(grenzen, 'game/grenzen.json is leesbaar');

t('vier gebieden met de afgesproken id, naam, sfeer en muzieklaag', () => {
  assert.deepEqual([...SR.REGION_IDS], ['waddenkust', 'hogeland', 'stad', 'westerkwartier']);
  for (const g of SR.REGIONS) {
    for (const k of ['naam', 'motto', 'sfeer']) assert.ok(typeof g[k] === 'string' && g[k].length > 8, `${g.id}.${k}`);
    assert.ok(g.muzieklaag && g.muzieklaag.id && g.muzieklaag.toon, `${g.id} heeft een muzieklaag`);
    assert.ok(g.gags.length >= 3, `${g.id} heeft gags`);
    assert.ok(g.plekken.length >= 8, `${g.id} heeft minstens acht plekken`);
  }
  const lagen = SR.REGIONS.map((g) => g.muzieklaag.id);
  assert.equal(new Set(lagen).size, lagen.length, 'elke muzieklaag is van een gebied');
});

t('ids zijn uniek: gebieden, plekken, bijfiguren en nieuwe bijfiguren', () => {
  for (const lijst of [SR.REGIONS.map((g) => g.id), SR.ALL_PLACES.map((p) => p.id), SR.REGIONS.flatMap((g) => [...g.bijfiguren, ...g.bijfigurenNieuw])]) {
    assert.equal(new Set(lijst).size, lijst.length, 'dubbele id: ' + lijst.filter((x, i) => lijst.indexOf(x) !== i).join(', '));
  }
  for (const p of SR.ALL_PLACES) assert.match(p.id, /^[a-z0-9-]+$/, p.id);
});

t('alle plekken liggen binnen de provincie Groningen (echte grens) en op de kaart', () => {
  for (const p of SR.ALL_PLACES) {
    assert.ok(GR.puntInGebied(grenzen.provincie, p.x, p.y), `${p.id} ligt buiten de provincie (${p.x}, ${p.y})`);
    const [x, y] = wgsToWorld(p.at[0], p.at[1]);
    assert.ok(Math.abs(x - p.x) < 0.1 && Math.abs(y - p.y) < 0.1, `${p.id}: x en y komen uit at`);
    assert.ok(Math.abs(p.x) < 60000 && Math.abs(p.y) < 60000, `${p.id} ligt buiten de kaart`);
  }
});

t('elke plek ligt in een echte woonplaats of gemeente van de kaart (een bestaande kaartlocatie)', () => {
  for (const p of SR.ALL_PLACES) {
    const wp = GR.gebiedIn(grenzen.woonplaatsen, p.x, p.y);
    const gm = GR.gebiedIn(grenzen.gemeenten, p.x, p.y);
    assert.ok(wp || gm, `${p.id} ligt in geen woonplaats of gemeente`);
  }
  // een plek die naar een dorp of stad heet, ligt in de woonplaats van die naam
  for (const p of SR.ALL_PLACES.filter((q) => ['dorp', 'stad'].includes(q.soort))) {
    const wp = GR.gebiedIn(grenzen.woonplaatsen, p.x, p.y);
    assert.ok(wp && (wp.naam.includes(p.naam) || p.naam.includes(wp.naam)), `${p.id}: woonplaats ${wp && wp.naam}`);
  }
});

t('regionAt klopt op elke plek, ook 250 m ernaast, en geeft het gebied van de plek', () => {
  for (const p of SR.ALL_PLACES) {
    assert.equal(SR.regionAt(p.x, p.y), p.gebied, `${p.id} in ${p.gebied}`);
    for (const [dx, dy] of [[250, 0], [-250, 0], [0, 250], [0, -250]]) assert.equal(SR.regionAt(p.x + dx, p.y + dy), p.gebied, `${p.id} ${dx},${dy}`);
  }
});

t('regionAt: de stad is de stad, ver weg geen gebied, rommel geeft null', () => {
  const [mx, my] = wgsToWorld(53.2192, 6.5669);
  assert.equal(SR.regionAt(mx, my), 'stad');
  assert.equal(SR.regionAt(0, 0), 'stad', 'het midden van het spelframe is de stad');
  assert.equal(SR.regionAt(1e6, 1e6), null);
  for (const v of [NaN, undefined, null, 'x', Infinity]) assert.equal(SR.regionAt(v, 0), null);
});

t('geen twee plekken op dezelfde plaats (anders is regionAt dubbelzinnig)', () => {
  for (const p of SR.ALL_PLACES) for (const q of SR.ALL_PLACES) if (p.id < q.id) assert.ok(Math.hypot(p.x - q.x, p.y - q.y) > 50, `${p.id} en ${q.id} vallen samen`);
});

t('elke loopbaan heeft een thuisgebied en staat in dat gebied; ook-gebieden bestaan; de vakken bestaan in loopbaan.js', () => {
  assert.ok(SR.LOOPBANEN.length >= 6);
  for (const l of SR.LOOPBANEN) {
    const thuis = SR.regionInfo(l.thuis);
    assert.ok(thuis, `${l.id}: thuisgebied ${l.thuis}`);
    assert.ok(thuis.thuisLoopbanen.includes(l.id) && thuis.loopbanen.includes(l.id), `${l.id} staat in zijn gebied`);
    for (const o of l.ook) { assert.ok(SR.regionInfo(o) && o !== l.thuis, `${l.id}: ook ${o}`); assert.ok(SR.regionInfo(o).loopbanen.includes(l.id)); }
    for (const v of l.vakken) assert.ok(VAK_IDS.includes(v), `${l.id}: vak ${v} bestaat niet`);
  }
  assert.equal(new Set(SR.LOOPBANEN.map((l) => l.id)).size, SR.LOOPBANEN.length);
  for (const g of SR.REGIONS) assert.ok(g.thuisLoopbanen.length >= 1, `${g.id} is thuisbasis van een loopbaan`);
});

t('bijfiguren met een dossier bestaan in het verhaal; nieuwe bijfiguren niet; niemand staat in twee gebieden', () => {
  const alle = new Set();
  for (const g of SR.REGIONS) for (const id of g.bijfiguren) {
    assert.ok(Object.hasOwn(CHARACTERS, id), `${g.id}: bijfiguur ${id} heeft geen dossier`);
    assert.ok(!alle.has(id), `${id} staat in twee gebieden`);
    alle.add(id);
  }
  for (const g of SR.REGIONS) for (const id of g.bijfigurenNieuw) { assert.ok(!Object.hasOwn(CHARACTERS, id), `${id} is al een personage`); assert.ok(!alle.has(id), `${id} dubbel`); alle.add(id); }
});

t('regionsOfStep: reisstap via zijn doelplek, loopbaanstap via zijn thuisgebied, zonder plek een lege lijst', () => {
  assert.deepEqual(SR.regionsOfStep({ goal: { at: [53.3903, 6.5667] } }), ['waddenkust']);
  assert.deepEqual(SR.regionsOfStep({ goal: { at: [53.2192, 6.5669] } }), ['stad']);
  assert.deepEqual(SR.regionsOfStep({ goal: { at: [53.1056, 6.8794] }, loopbanen: ['vracht'] }), ['hogeland', 'stad']);
  assert.deepEqual(SR.regionsOfStep({ loopbanen: ['water', 'boer', 'water'] }), ['waddenkust', 'hogeland']);
  const p = SR.placeInfo('leek');
  assert.deepEqual(SR.regionsOfStep({ x: p.x, y: p.y }), ['westerkwartier']);
  for (const leeg of [null, undefined, 3, 'x', {}, { goal: {} }, { goal: { at: [NaN, 1] } }, { loopbanen: ['onbekend'] }]) assert.deepEqual(SR.regionsOfStep(leeg), []);
});

t('de reisstappen van het verhaal vallen vrijwel allemaal in een gebied; geen stap sluit iets af', () => {
  const reis = STEPS.filter((s) => s.goal && Array.isArray(s.goal.at));
  assert.ok(reis.length >= 10, 'het verhaal heeft reisstappen');
  let zonder = 0;
  for (const s of reis) { const r = SR.regionsOfStep(s); if (!r.length) zonder++; for (const id of r) assert.ok(SR.regionInfo(id), `${s.id}: ${id}`); }
  assert.ok(zonder <= Math.floor(reis.length / 4), `${zonder} van ${reis.length} reisstappen liggen buiten elk gebied`);
});

t('geen winter en geen echt merk in de speltekst van de gebieden; altijd zomer', () => {
  const tekst = JSON.stringify(SR.REGIONS.map((g) => [g.naam, g.motto, g.sfeer, g.gags, g.plekken.map((p) => p.naam + ' ' + p.wat)])).toLowerCase();
  for (const w of ['winter', 'sneeuw', 'vorst', 'albert heijn', 'jumbo', 'hema', 'mcdonald', 'coca']) assert.ok(!tekst.includes(w), 'verboden woord: ' + w);
});

t('de module is puur: geen DOM, geen opslag, geen netwerk, geen THREE; alleen rdnew.js als import', () => {
  const src = fs.readFileSync(path.join(ROOT, 'game', 'js', 'storyregions.js'), 'utf8').split('\n').filter((r) => !r.startsWith('//')).join('\n');
  for (const w of ['document', 'window', 'localStorage', 'fetch(', 'XMLHttpRequest', 'THREE', 'require(']) assert.ok(!src.includes(w), 'niet puur: ' + w);
  assert.deepEqual([...src.matchAll(/^import .* from '(.+)';/gm)].map((m) => m[1]), ['./rdnew.js']);
});

console.log(`${n - fails}/${n} geslaagd`);
process.exit(fails ? 1 : 0);
