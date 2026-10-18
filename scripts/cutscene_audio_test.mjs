// Audit (#117, #173, #129, #131): every cutscene with a driving vehicle, a bike or a
// pigeon has a sound for it, and every sound the plan asks for exists and is wired.
//   node scripts/cutscene_audio_test.mjs
import { readFileSync } from 'node:fs';
import { audioPlan, PROP_SOUND } from '../game/js/cutaudio.js';
import { SPECS } from '../game/js/cutscenes_akte1.js';
import { OPENING_ACTS, END_CARD } from '../game/js/cutscenes.js';
import { FX_INFO } from '../game/js/sfx/fxbank.js';
import { bufferNames, renderData } from '../game/js/sfx/dsp.js';
import '../game/js/cutscenes_akte2.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };
const read = (f) => readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
const audioSrc = read('audio.js'), hostSrc = read('cutscenehost.js');

// the sounds themselves
for (const name of ['siren_pass', 'car_pass', 'tyre_screech']) {
  ok(FX_INFO[name] && bufferNames().includes(name), name + ' exists');
  const d = renderData(name, 22050).chs[0];
  let peak = 0, bad = false;
  for (const v of d) { peak = Math.max(peak, Math.abs(v)); if (!Number.isFinite(v)) bad = true; }
  ok(!bad && peak > 0.2 && peak <= 1, name + ' audible, finite, no clipping', String(peak));
}
ok(/audioPlan\(/.test(hostSrc) && /sfx\(f\.kind, f\.name\)/.test(hostSrc), 'the cutscene host fires the plan');

// event kinds the plan may emit are handled by audio.js
for (const kinds of Object.values(PROP_SOUND)) for (const s of kinds) {
  if (s.name) ok(FX_INFO[s.name], 'plan effect ' + s.name + ' exists');
  else ok(new RegExp(`case '${s.kind}'`).test(audioSrc), 'audio.js handles ' + s.kind);
}
ok(/case 'fx': playFx\(e\.name/.test(audioSrc), 'audio.js plays fx events by name');

// a spec (cast, props, open + beats) as a def the plan can read: every cue at t=0
function specDef(spec) {
  const props = { ...(spec.props || {}) };
  for (const [id, p] of Object.entries(spec.cast || {})) void id, void p;
  const cues = [...(spec.open || []), ...(spec.beats || [])].filter((c) => c.prop).map((c) => ({ ...c, t: 0 }));
  return { props, cues };
}
let vehicles = 0, sirens = 0;
for (const [key, spec] of Object.entries(SPECS)) {
  const def = specDef(spec);
  const plan = audioPlan(def, [], 60);
  for (const c of def.cues) {
    const kind = def.props[c.prop] && def.props[c.prop].kind;
    if (!(c.path || c.move) || !PROP_SOUND[kind]) continue;
    vehicles++;
    ok(plan.some((p) => p.prop === c.prop), `${key}: ${c.prop} (${kind}) moves and has a sound`);
    if (kind === 'politie') { sirens++; ok(plan.some((p) => p.name === 'siren_pass'), key + ': police has a siren'); }
  }
  for (const p of plan) ok(p.kind === 'fx' ? FX_INFO[p.name] : true, key + ': plan effect exists', p.name);
}
ok(vehicles > 0 && sirens > 0, 'the audit saw vehicles and a police chase', `${vehicles}/${sirens}`);

// the opening acts and the end card: a moving vehicle or its own sfx entry
for (const def of [...OPENING_ACTS, END_CARD]) {
  const moving = (def.cues || []).some((c) => c.prop && (c.path || c.move) && PROP_SOUND[(def.props[c.prop] || {}).kind]);
  if (moving) ok(audioPlan(def, [], 60).length > 0 || (def.fx || []).some((f) => f.fx === 'sfx'), def.id + ': moving vehicle has a sound');
}

// the plan fires once per prop and sorted in time
const demo = { props: { p: { kind: 'politie' }, f: { kind: 'fiets' } }, cues: [{ t: 2, prop: 'p', path: [[0, 0], [30, 0]], speed: 10 }, { t: 3, prop: 'p', path: [[30, 0], [0, 0]] }, { t: 1, prop: 'f', path: [[0, 1], [9, 1]] }] };
const plan = audioPlan(demo, [], 20);
ok(plan.filter((p) => p.name === 'siren_pass').length === 1, 'one siren per prop');
ok(plan.every((p, i) => i === 0 || plan[i - 1].t <= p.t), 'plan is sorted');
ok(plan.some((p) => p.name === 'tyre_screech' && Math.abs(p.t - 4.5) < 0.01), 'screech where the police stops');
ok(audioPlan(null, [], 5).length === 0, 'no def, no sound');

console.log(fails ? `FAIL ${fails}/${n}` : `PASS ${n} checks`);
process.exit(fails ? 1 : 0);
