// #497: mute-stand en opslag los van de mixer, met een host-naad.
//   node scripts/audiomute_test.mjs
import assert from 'node:assert/strict';
import { loadMuted, saveMuted, createMuteController } from '../game/js/audiomute.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

t('laden en bewaren werkt met een storage', () => {
  const s = mem();
  assert.equal(loadMuted('gde-muted', s), false);
  saveMuted('gde-muted', true, s);
  assert.equal(s.getItem('gde-muted'), '1');
  assert.equal(loadMuted('gde-muted', s), true);
  saveMuted('gde-muted', false, s);
  assert.equal(loadMuted('gde-muted', s), false);
});

t('de controller zet de stand, past de uitgang toe en meldt het', () => {
  let muted = false, applied = 0, refreshed = 0, melding = null;
  const ctl = createMuteController({
    key: 'gde-muted', storage: mem(), get: () => muted, set: (v) => { muted = v; },
    apply: () => { applied++; }, refresh: () => { refreshed++; }, world: () => null,
    notify: (aan) => { melding = aan ? 'gedempt' : 'aan'; return melding; },
  });
  assert.equal(ctl.setMuted(true), true);
  assert.equal(muted, true); assert.equal(applied, 1); assert.equal(refreshed, 1);
  assert.equal(ctl.setMuted(true), true, 'idempotent');
  assert.equal(applied, 1);
  assert.equal(ctl.toggleMute(), false);
  assert.equal(muted, false);
});

console.log(`audiomute_test: ${n}/${n} ok`);
