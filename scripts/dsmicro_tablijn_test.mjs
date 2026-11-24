// De glijdende onderstreping van de tabs (dsmicro.js trackTabLine, beeld 24-11): de streep volgt ook als een tab van maat verandert zonder dat het
// kader dat doet (een teller die later binnenkomt, een tab die verschijnt). Eerder stond hij dan onder Snackwagen terwijl Club gekozen was.
//   node scripts/dsmicro_tablijn_test.mjs
import assert from 'node:assert/strict';
const waarnemers = [];
globalThis.ResizeObserver = class { constructor(f) { this.f = f; this.doelen = []; waarnemers.push(this); } observe(el) { this.doelen.push(el); } };
const { trackTabLine } = await import('../game/js/dsmicro.js');
const tab = (left, width, sel) => ({ rect: { left, width }, getBoundingClientRect() { return this.rect; }, getAttribute: (k) => (k === 'aria-selected' ? String(sel) : null) });
const tabs = [tab(100, 80, false), tab(200, 40, true)];
const props = {}, lijn = { style: {}, offsetWidth: 1 };
const kader = {
  dataset: {}, classList: { add() {}, remove() {} }, style: { setProperty: (k, v) => { props[k] = v; } },
  getBoundingClientRect: () => ({ left: 50, width: 900 }), querySelectorAll: (s) => (s === '[role="tab"]' ? tabs : []), querySelector: () => lijn,
};
trackTabLine(kader);
assert.equal(props['--ds-m-tab-x'], '150px'); assert.equal(props['--ds-m-tab-w'], '40');
assert.equal(waarnemers.length, 1); assert.ok(tabs.every((t) => waarnemers[0].doelen.includes(t)), 'de tabs zelf worden gevolgd, niet alleen het kader');
// de eerste tab wordt breder (zijn teller komt binnen): de gekozen tab schuift op, het kader blijft even breed
tabs[0].rect = { left: 100, width: 118 }; tabs[1].rect = { left: 238, width: 44 };
waarnemers[0].f();
assert.equal(props['--ds-m-tab-x'], '188px'); assert.equal(props['--ds-m-tab-w'], '44');
console.log('dsmicro_tablijn_test ok');
