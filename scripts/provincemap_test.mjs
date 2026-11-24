// #1191: de basiskaart van de provincie (provincemap.js) laat een tegel die nog laadt invallen door de fijnste
// grovere laag die er al is, alleen binnen die tegel. Daarvoor werd elke grovere laag over het hele venster
// getekend, de grofste (160 m per pixel) als laatste en bovenop: een korrelig mozaïek met harde randen.
// Puur: een nep-Image die meteen laadt en een ctx die de tekenopdrachten bijhoudt.
import assert from 'node:assert/strict';
import { setProvinceMap, fallbackPlan, preloadProvinceMap, drawProvinceBase } from '../game/js/provincemap.js';

let ok = 0;
const t = (naam, fn) => { fn(); ok++; };

// Een piramide van drie lagen: z0 160 m, z1 80 m, z2 40 m per pixel, tegels van 4 px.
const meta = {
  x0: 0, y0: 0, tile: 4, dir: 'pm/',
  levels: [
    { z: 0, m: 160, w: 4, h: 4, tiles: ['0_0'] },
    { z: 1, m: 80, w: 8, h: 8, tiles: ['0_0', '1_0', '0_1', '1_1'] },
    { z: 2, m: 40, w: 16, h: 16, tiles: ['0_0', '1_0', '2_0', '3_0', '0_1', '1_1'] },
  ],
};

t('een ladende tegel krijgt de fijnste grovere laag die er is, niet de grofste', () => {
  setProvinceMap(meta);
  const span2 = 4 * 40;
  const pending = [[0, 0, span2], [span2, 0, span2], [2 * span2, 0, span2]];
  const plan = fallbackPlan(2, pending, () => true);
  assert.deepEqual(plan.map((p) => p.k), [1, 1], 'twee tegels van z1, geen z0');
  assert.equal(plan[0].rects.length, 2, 'de eerste z1-tegel dekt de twee ladende z2-tegels links');
  assert.deepEqual([plan[1].tx, plan[1].ty], [1, 0]);
});

t('is de fijnere invaller nog niet binnen, dan de grovere; zonder tegel op die plek verder zoeken', () => {
  setProvinceMap(meta);
  const plan = fallbackPlan(2, [[0, 0, 160]], (k) => k === 0);
  assert.deepEqual(plan.map((p) => p.k), [0]);
  const leeg = { ...meta, levels: [meta.levels[0], { ...meta.levels[1], tiles: [] }, meta.levels[2]] };
  setProvinceMap(leeg);
  assert.deepEqual(fallbackPlan(2, [[0, 0, 160]], () => true).map((p) => p.k), [0], 'z1 heeft daar geen tegel: z0 valt in');
  assert.deepEqual(fallbackPlan(2, [], () => true), [], 'niets te laden, geen invaller');
});

// Nep-Image: laadt meteen, zodat de tweede vraag het beeld geeft.
const gevraagd = [];
globalThis.Image = class {
  set src(v) { this._src = v; gevraagd.push(v); this.complete = true; this.naturalWidth = 4; this.naturalHeight = 4; if (this.onload) this.onload(); }
  get src() { return this._src; }
};
globalThis.requestAnimationFrame = () => 0;

t('bij openen van de kaart laden alle grovere lagen vooraf, de fijnste niet', () => {
  setProvinceMap(meta);
  gevraagd.length = 0;
  preloadProvinceMap();
  assert.equal(gevraagd.length, 1 + 4, 'z0 en z1 (5 beelden)');
  assert.ok(gevraagd.every((s) => !/\/z2-/.test(s)), 'z2 alleen op vraag');
});

t('tekenen: de invaller staat geknipt op de ladende tegel en de grofste laag ligt er niet bovenop', () => {
  setProvinceMap(meta);
  preloadProvinceMap();
  // z2-0_0 is binnen, z2-1_0 laadt nog (de nep-Image laadt bij de eerste vraag, dus zet het daarna terug)
  const ops = [];
  const ctx = {
    save() {}, restore() { ops.push('restore'); }, beginPath() {}, clip() { ops.push('clip'); },
    rect(x, y, w, h) { ops.push(`rect ${x},${y},${w}`); },
    drawImage(im, x, y, w) { ops.push(`img ${im._src.replace('pm/', '')} ${x},${y},${w}`); },
  };
  const OrigImage = globalThis.Image;
  globalThis.Image = class { set src(v) { this._src = v; } }; // nieuwe beelden blijven laden
  drawProvinceBase(ctx, 0, 0, 319, 159, 1 / 40);
  globalThis.Image = OrigImage;
  const imgs = ops.filter((o) => o.startsWith('img'));
  assert.ok(!imgs.some((o) => /z0-/.test(o)), `geen 160 m-mozaïek: ${imgs.join(' | ')}`);
  assert.ok(imgs.some((o) => /z1-0_0/.test(o)), 'z1 valt in');
  assert.ok(ops.includes('rect 0,0,160') && ops.includes('rect 160,0,160'), 'alleen binnen de ladende z2-tegels geknipt');
  assert.ok(ops.indexOf('clip') < ops.findIndex((o) => /z1-0_0/.test(o)), 'eerst knippen, dan tekenen');
});

console.log(`provincemap_test: ${ok} controles ok`);
