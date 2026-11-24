// De glijdende onderstreping van de tabs (dsmicro.js, beeld 24-11): de streep stond onder Snackwagen terwijl Club gekozen was. Gemeten in Electron:
// het menu staat onder een CSS-zoom (uiscale.js, hier 0,92); getBoundingClientRect geeft schermpixels, de transform van de streep rekent in CSS-pixels.
// Getest: de zoom wordt eruit gedeeld, en de streep volgt ook als een tab van maat verandert zonder dat het kader dat doet.
//   node scripts/dsmicro_tablijn_test.mjs
import assert from 'node:assert/strict';
const waarnemers = [];
globalThis.ResizeObserver = class { constructor(f) { this.f = f; this.doelen = []; waarnemers.push(this); } observe(el) { this.doelen.push(el); } };
const { trackTabLine, tabLine } = await import('../game/js/dsmicro.js');
// de zoom: 0,92 schermpixel per CSS-pixel; de tab staat op 479,4 schermpixels van de rand en is 26,4 breed (de meting van 24-11)
assert.deepEqual(tabLine([{ left: 893.4, width: 26.4 }], 0, { left: 414 }, 0.92), { x: 521.1, w: 28.7 });
assert.deepEqual(tabLine([{ left: 893.4, width: 26.4 }], 0, { left: 414 }, 0), tabLine([{ left: 893.4, width: 26.4 }], 0, { left: 414 }), 'een kapotte schaal telt als 1');
const tab = (left, width, sel) => ({ rect: { left, width }, getBoundingClientRect() { return this.rect; }, getAttribute: (k) => (k === 'aria-selected' ? String(sel) : null) });
const tabs = [tab(100, 80, false), tab(200, 40, true)];
const props = {}, lijn = { style: {}, offsetWidth: 1 };
const kader = {
  dataset: {}, offsetWidth: 900, classList: { add() {}, remove() {} }, style: { setProperty: (k, v) => { props[k] = v; } },
  getBoundingClientRect: () => ({ left: 50, width: 900 }), querySelectorAll: (s) => (s === '[role="tab"]' ? tabs : []), querySelector: () => lijn,
};
trackTabLine(kader);
assert.equal(props['--ds-m-tab-x'], '150px'); assert.equal(props['--ds-m-tab-w'], '40');
assert.equal(waarnemers.length, 1); assert.ok(tabs.every((t) => waarnemers[0].doelen.includes(t)), 'de tabs zelf worden gevolgd, niet alleen het kader');
// de eerste tab wordt breder (zijn teller komt binnen): de gekozen tab schuift op, het kader blijft even breed
tabs[0].rect = { left: 100, width: 118 }; tabs[1].rect = { left: 238, width: 44 };
waarnemers[0].f();
assert.equal(props['--ds-m-tab-x'], '188px'); assert.equal(props['--ds-m-tab-w'], '44');
// dezelfde rij onder een zoom van 0,5: het kader is 900 CSS-pixels breed maar 450 op het scherm
const kz = { ...kader, dataset: {}, offsetWidth: 900, getBoundingClientRect: () => ({ left: 50, width: 450 }) };
tabs[1].rect = { left: 150, width: 20 };
trackTabLine(kz);
assert.equal(props['--ds-m-tab-x'], '200px'); assert.equal(props['--ds-m-tab-w'], '40');
console.log('dsmicro_tablijn_test ok');
