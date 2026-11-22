// Test van de pure tripwire-logica van het UI-kritiekharnas (scripts/ui_critic/tripwires.mjs), met nepdata en zonder browser.
import assert from 'node:assert/strict';
import { parseColor, composite, contrastRatio, boxOverlap, truncatedText, textMass, emptyBoxes, nativeScrollbars, smallText, lowContrast, outOfFrame, badText, unfocusable, analyseer, DREMPELS } from './ui_critic/tripwires.mjs';
import { SCREENS, RESOLUTIONS, CATEGORIES } from './ui_critic/catalogus.mjs';

const rec = (o = {}) => ({ sel: 'div', tag: 'div', parent: -1, rect: { x: 0, y: 0, w: 100, h: 20 }, ownText: '', fontSize: 16, fontWeight: 400, color: [0, 0, 0, 1], bg: [255, 255, 255, 1], bgOnbekend: false,
  scrollW: 100, clientW: 100, scrollH: 20, clientH: 20, clipsX: false, scroller: false, scrolls: false, customScrollbar: true, inScroller: false, hasBorder: false, hasBg: false,
  childCount: 0, media: false, interactive: false, focusable: false, disabled: false, decor: false, layer: 'root', ...o });

// kleuren en contrast
assert.deepEqual(parseColor('rgb(10, 20, 30)'), [10, 20, 30, 1]);
assert.deepEqual(parseColor('rgba(10, 20, 30, 0.5)'), [10, 20, 30, 0.5]);
assert.equal(parseColor('transparent'), null);
assert.deepEqual(composite([0, 0, 0, 0.5], [255, 255, 255]), [128, 128, 128]);
assert.ok(Math.abs(contrastRatio([0, 0, 0], [255, 255, 255]) - 21) < 0.01);
assert.ok(contrastRatio([119, 119, 119], [255, 255, 255]) < 4.5);

// overlap: twee tekstblokken over elkaar, een nazaat en een andere laag tellen niet
const o = [rec({ sel: 'a', ownText: 'x', rect: { x: 0, y: 0, w: 100, h: 20 } }), rec({ sel: 'b', ownText: 'y', rect: { x: 50, y: 5, w: 100, h: 20 } })];
assert.equal(boxOverlap(o).length, 1);
assert.equal(boxOverlap([o[0], { ...o[1], layer: 'root/9' }]).length, 0);
assert.equal(boxOverlap([o[0], { ...o[1], rect: { x: 99, y: 0, w: 50, h: 20 } }]).length, 0, 'rand die raakt telt niet');
const nested = [rec({ sel: 'p', ownText: 'x' }), rec({ sel: 'c', ownText: 'y', parent: 0 })];
assert.equal(boxOverlap(nested).length, 0, 'een kind in zijn ouder is geen overlap');

// afgekapt, massa, leeg, scrollbar, klein, contrast, kader, code, focus
assert.equal(truncatedText([rec({ ownText: 'lang', clipsX: true, scrollW: 200, clientW: 100 })]).length, 1);
assert.equal(truncatedText([rec({ ownText: 'lang', clipsX: false, scrollW: 200, clientW: 100 })]).length, 0);
assert.equal(textMass([rec({ ownText: 'a'.repeat(500) }), rec({ ownText: 'b'.repeat(2000) })]).boven, true);
assert.equal(textMass([rec({ ownText: 'kort' })]).boven, false);
assert.equal(emptyBoxes([rec({ hasBorder: true })]).length, 1);
assert.equal(emptyBoxes([rec({ hasBorder: true, decor: true })]).length, 0);
assert.equal(emptyBoxes([rec({ hasBorder: true, childCount: 1 })]).length, 0);
assert.equal(nativeScrollbars([rec({ scroller: true, scrolls: true, customScrollbar: false })]).length, 1);
assert.equal(nativeScrollbars([rec({ scroller: true, scrolls: true, customScrollbar: true })]).length, 0);
assert.equal(smallText([rec({ ownText: 'x', fontSize: DREMPELS.minFont - 1 }), rec({ ownText: 'y', fontSize: 11 })]).length, 1);
assert.equal(lowContrast([rec({ ownText: 'x', color: [130, 130, 130, 1] })]).length, 1);
assert.equal(lowContrast([rec({ ownText: 'x', color: [130, 130, 130, 1], fontSize: 30 })]).length, 0, 'grote tekst heeft 3:1 nodig');
assert.equal(lowContrast([rec({ ownText: 'x', color: [150, 150, 150, 1], bgOnbekend: true })]).length, 0, 'achtergrondplaatje: niet te beoordelen');
assert.equal(outOfFrame([rec({ ownText: 'x', rect: { x: 1200, y: 0, w: 200, h: 20 } })], 1280, 720).length, 1);
assert.equal(outOfFrame([rec({ ownText: 'x', rect: { x: 1200, y: 0, w: 200, h: 20 }, inScroller: true })], 1280, 720).length, 0);
assert.equal(badText([rec({ ownText: 'Je hebt undefined euro' }), rec({ ownText: 'NaN%' }), rec({ ownText: 'Moi Grunn' })]).length, 2);
assert.equal(unfocusable([rec({ interactive: true, focusable: false }), rec({ interactive: true, focusable: true }), rec({ interactive: true, disabled: true })]).length, 1);

// analyseer telt alles bij elkaar
const a = analyseer([rec({ ownText: 'undefined', fontSize: 8, rect: { x: 1300, y: 0, w: 10, h: 10 } })], { vw: 1280, vh: 720 });
assert.equal(a.soorten.klein.aantal, 1);
assert.equal(a.soorten.codeTekst.aantal, 1);
assert.equal(a.soorten.buitenKader.aantal, 1);
assert.ok(a.totaal >= 3);

// catalogus: unieke id's, bekende categorieen, drie resoluties
assert.equal(new Set(SCREENS.map((s) => s.id)).size, SCREENS.length, 'id\'s zijn uniek');
for (const s of SCREENS) { assert.ok(CATEGORIES.includes(s.categorie), s.id); assert.ok(s.module && s.setup, s.id); }
assert.deepEqual(RESOLUTIONS.map((r) => r.id), ['720p', '1080p', 'ui15']);
console.log('ui_critic_test: ok (' + SCREENS.length + ' schermen in de catalogus)');
