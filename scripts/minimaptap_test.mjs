import assert from 'node:assert/strict';
import { bindMinimapOpen } from '../game/js/minimaptap.js';

const handlers = {};
const el = { addEventListener: (t, f) => { handlers[t] = f; } };
let opened = 0, geblokkeerd = false;
bindMinimapOpen(el, () => { opened++; }, () => geblokkeerd);
const ev = (extra = {}) => ({ preventDefault() { this.pd = true; }, stopPropagation() { this.sp = true; }, ...extra });

const e1 = ev(); handlers.click(e1);
assert.equal(opened, 1, 'een klik opent de kaart');
assert.ok(e1.pd && e1.sp, 'de klik lekt niet door naar het spel');
handlers.keydown(ev({ key: 'Enter' }));
handlers.keydown(ev({ key: ' ' }));
assert.equal(opened, 3, 'Enter en spatie op de focus werken ook');
handlers.keydown(ev({ key: 'a' }));
assert.equal(opened, 3, 'andere toetsen niet');
geblokkeerd = true; handlers.click(ev());
assert.equal(opened, 3, 'geblokkeerd (menu al open): niets');
console.log('minimaptap_test: ok');
