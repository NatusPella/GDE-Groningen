// Pure audit of sound coverage (issues #131, #129, #117, #173): without
// hearing anything, check in the code that every audio event the game pushes
// has a case in audio.js, that every effect of the bank can be reached and
// that the places that should make a noise do push one.
//   node scripts/sfx_audit_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FX_INFO } from '../game/js/sfx/fxbank.js';
import { LINK_RULES, SELF_PUSHED } from '../game/js/sfx/linkups.js';

const JS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'js');
const files = fs.readdirSync(JS).filter((f) => f.endsWith('.js'));
const src = Object.fromEntries(files.map((f) => [f, fs.readFileSync(path.join(JS, f), 'utf8')]));
let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };

// 1. every pushed kind is handled by playAudioEvents
const audio = src['audio.js'];
const body = audio.slice(audio.indexOf('function playAudioEvents'));
const handled = new Set([...body.slice(0, body.indexOf('return n;')).matchAll(/case '([a-z_-]+)'/g)].map((m) => m[1]));
const pushed = new Map();
const add = (k, f) => { if (!pushed.has(k)) pushed.set(k, new Set()); pushed.get(k).add(f); };
for (const [f, s] of Object.entries(src)) {
  if (f === 'audio.js' || f === 'cutscenes.js') continue;
  for (const m of s.matchAll(/(?:audioEvents\.push|pushAudioEvent)\s*\(([^\n]*)/g)) {
    const k = /kind:\s*'([a-z_-]+)'/.exec(m[1]);
    if (k) add(k[1], f);
  }
  for (const m of s.matchAll(/\b(?:audio|sfx|pushVehicleAudio)\s*\([^'\n]*?'([a-z_]+)'(?:\s*,\s*'([a-z_]+)')?/g)) {
    if (handled.has(m[1]) || /^(door|engine|horn|bell|train|crossing)/.test(m[1])) add(m[1], f);
    if (m[2]) add(m[2], f);
  }
}
for (const [k, fs_] of pushed) ok(handled.has(k), `event '${k}' has a case in audio.js`, [...fs_].join(','));
ok(pushed.size >= 15, 'the audit really finds the pushed events', String(pushed.size));
// the previously silent ones (#131/#173)
for (const k of ['step', 'impact']) ok(handled.has(k), `'${k}' was silent, now handled`);

// 2. cutscene sfx kinds
const cut = src['cutscenes.js'];
for (const m of cut.matchAll(/fx:\s*'sfx',\s*kind:\s*'([a-z_]+)'/g)) ok(handled.has(m[1]), `cutscene sfx '${m[1]}' is handled`);

// 3. every effect in the bank is reachable: a rule, a self push, a handler or cutaudio
const reach = new Set([...LINK_RULES.flatMap((r) => [r.fx, ...(r.also || [])]), ...SELF_PUSHED.map((s) => s.fx)]);
const cutaudio = src['cutaudio.js'] + src['sidejob_vracht.js'];
for (const name of Object.keys(FX_INFO)) {
  const used = reach.has(name) || new RegExp(`['"\`]${name.replace(/_\d$/, '')}`).test(audio + cutaudio);
  ok(used, `effect ${name} is played somewhere`);
}

// 3b. a sample that is not rendered yet is silent on first play: every bank effect must be on the warm list
ok(audio.includes("for (const n of bufferNames()) if (!warmList.includes(n)) warmList.unshift(n)") && audio.includes("for (const n of Object.keys(FX_INFO)) warmList.push(n)"), "audio.js warms every sample of the bank at start, the fxbank effects first");

ok(/recordChallengeResult[^]*?kind: medal >= 2/.test(src['achievements.js']), 'minigame end: recordChallengeResult pushes a cue');

// 4. spots that must make a noise (regression list: the thing, where, what)
const MUST = [
  ['vuurwerk (worp)', 'throwables.js', /firework/],
  ['vuurwerk (show)', 'worldevents.js', /firework/],
  ['carbid', 'carbid.js', /carbid/],
  ['fietsbel', 'sfx/dsp.js', /bikebell/],
  ['deur van de speler', 'player.js', /door_open/],
  ['winkelbel', 'shops.js', /shop_bell/],
  ['kermis', 'kermis.js', /kermis_ding/],
  ['cutscene-voertuigen', 'cutaudio.js', /siren_pass/],
  ['voertuigdelen', 'sfx/linkups.js', /part_rip/],
];
for (const [what, f, re] of MUST) ok(re.test(src[f] ?? fs.readFileSync(path.join(JS, f), 'utf8')), `${what}: ${f} makes a sound`);

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
