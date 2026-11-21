// SFX round 5 (21-11): the central sound map (game/js/sfx/sfxmap.js) and the new clips. Pure, no Electron, no Web Audio.
//   node scripts/sfx_round5_test.mjs
// Checks: every sound of the map exists as a file and as a manifest entry with a licence (CC0 or CC BY, ADR 0039), the sourcing list and
// the map carry the same keys, length / peak / level within bounds, no pop at the start and no noise burst at the end (detectors of
// docs/WITTE-RUIS-21-11.md, run on the decoded file), the added size stays within the budget, the variant pool, the anti-repeat, the
// cool-down per event, the Samen spelen policy (local never heard from another player, world sparingly, no double play) and the coupling
// function sfxEvent with a fake world.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SFX_MAP, SFX_CLIP_KEYS, AREAS, BUSES, MP_POLICIES, sfxClips, pickClip, eventCoolOk, remoteAllowed, newRemoteState, sfxSampleInfo, sfxOpnameAlleen, sfxUiGaps, isSfxEvent } from '../game/js/sfx/sfxmap.js';
import { SAMPLE_INFO, SAMPLE_KEYS, FX_OPNAME_ALLEEN, vervangSleutel, eagerKeys } from '../game/js/sfx/samples.js';
import { CATEGORIES } from '../game/js/sfx/mixplan.js';
import { FX_INFO } from '../game/js/sfx/fxbank.js';
import { UI_COOLDOWN } from '../game/js/sfx/uitaal.js';
import { sfxEvent, resetRemoteState } from '../game/js/sfx/haken.js';
import { GROUPS, TOTAL_CLIPS } from './audio/sfx_round5_list.mjs';
import { popBegin } from './audio/pop_begin.mjs';
import { eindBurst } from './audio/ruisachtig_scan.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SFX = path.join(ROOT, 'game', 'audio', 'sfx');
let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };

const man = JSON.parse(fs.readFileSync(path.join(SFX, 'manifest.json'), 'utf8')).geluiden;
const keys = Object.keys(SFX_MAP);

// -- table shape ---------------------------------------------------------------------------------
ok(keys.length >= 60, 'at least 60 event keys', String(keys.length));
for (const k of keys) {
  const e = SFX_MAP[k];
  ok(/^[a-z][a-z0-9_]*$/.test(k) && !/_\d+$/.test(k), `${k}: key is snake_case English without a variant suffix`);
  ok(AREAS.includes(e.area), `${k}: known area`);
  ok(BUSES.includes(e.bus), `${k}: known bus`);
  ok(CATEGORIES[e.cat], `${k}: mixplan category ${e.cat}`);
  ok(MP_POLICIES.includes(e.mp), `${k}: Samen spelen policy`);
  ok(Number.isInteger(e.n) && e.n >= 1 && e.n <= 4 || e.n === 1, `${k}: 1 to 4 variants`);
  ok(e.gain > 0 && e.gain <= 1 && e.ref > 0 && e.range >= e.ref && e.gap >= 0, `${k}: gain, ref, range and gap sane`);
  ok(['hoog', 'midden', 'laag'].includes(e.prio), `${k}: priority`);
  ok(typeof e.label === 'string' && e.label.length > 3, `${k}: Dutch label`);
  ok(!FX_INFO[k] && !FX_INFO[`${k}_0`], `${k}: no clash with a synth effect of fxbank.js`);
  ok(!(k in SAMPLE_INFO), `${k}: the event key is no clip key`);
  ok(Array.isArray(FX_OPNAME_ALLEEN[k]) && FX_OPNAME_ALLEEN[k].length === e.n, `${k}: coupled in FX_OPNAME_ALLEEN`);
  ok(e.bus !== 'ui' || e.mp === 'local', `${k}: a UI bus sound is local`);
}
ok(SFX_CLIP_KEYS.length >= 150, 'at least 150 new clips', String(SFX_CLIP_KEYS.length));
const areas = new Set(keys.map((k) => SFX_MAP[k].area));
for (const a of ['ui', 'shop', 'interior', 'clothing', 'tuning', 'farm', 'football', 'nature', 'npc', 'transit', 'cutscene', 'phone', 'animal', 'crowd']) ok(areas.has(a), `area ${a} has sounds`);

// -- the sourcing list and the map agree -------------------------------------------------------------
const listKeys = new Map(GROUPS.map((g) => [g[0], g[1]]));
for (const k of keys) ok(listKeys.get(k) === SFX_MAP[k].n, `${k}: sourcing list has the same variant count`, `${listKeys.get(k)} vs ${SFX_MAP[k].n}`);
for (const k of listKeys.keys()) ok(SFX_MAP[k], `${k}: sourcing row has a map entry`);
ok(TOTAL_CLIPS === SFX_CLIP_KEYS.length, 'the list and the map count the same clips', `${TOTAL_CLIPS} vs ${SFX_CLIP_KEYS.length}`);

// -- files, manifest, licence ---------------------------------------------------------------------
let bytes = 0;
const rows = [];
for (const c of SFX_CLIP_KEYS) {
  const m = man[c];
  ok(m, `${c}: manifest entry`);
  if (!m) continue;
  const f = path.join(SFX, m.bestand);
  ok(fs.existsSync(f), `${c}: file exists`);
  if (!fs.existsSync(f)) continue;
  bytes += fs.statSync(f).size;
  ok(m.herkomst && /^https:\/\/freesound\.org\/people\/[^/]+\/sounds\/\d+\/$/.test(m.herkomst.url || ''), `${c}: source URL`);
  ok(m.herkomst && /^Creative Commons (0 \(CC0 1\.0\)|Attribution (3|4)\.0)$/.test(m.herkomst.licentie || ''), `${c}: CC0 or CC BY licence`, m.herkomst && m.herkomst.licentie);
  ok(m.herkomst && m.herkomst.auteur && m.herkomst.freesound_id, `${c}: author handle and id registered`);
  ok(m.duur_s >= 0.04 && m.duur_s <= 8, `${c}: duration within 0.04-8 s`, String(m.duur_s));
  ok(m.niveau && m.niveau.piek_db <= -1, `${c}: peak at most -1 dBFS`, m.niveau && String(m.niveau.piek_db));
  ok(m.niveau && m.niveau.rms_db >= -40 && m.niveau.rms_db <= -14, `${c}: level between -40 and -14 dB RMS`, m.niveau && String(m.niveau.rms_db));
  ok(m.loop === false, `${c}: no loop`);
  ok(SAMPLE_INFO[c] && SAMPLE_KEYS.includes(c), `${c}: in SAMPLE_INFO`);
  // decode and run the detectors of the white-noise round
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-ac', '1', '-ar', '44100', '-f', 'f32le', '-'], { maxBuffer: 1 << 26 });
  const x = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));
  let mean = 0, pk = 0; for (const v of x) { mean += v; pk = Math.max(pk, Math.abs(v)); } mean /= x.length || 1;
  ok(Math.abs(mean) < 0.002, `${c}: no DC offset`, String(mean));
  ok(pk <= 0.95 && pk > 0.01, `${c}: decoded peak in range`, String(pk));
  ok(Math.abs(x[0]) < 0.05 && Math.abs(x[x.length - 1]) < 0.05, `${c}: starts and ends near zero (no click)`, `${x[0]} ${x[x.length - 1]}`);
  ok(!popBegin(x, 44100).pop, `${c}: no pop at the start`);
  const h = new Float32Array(x.length >> 1); for (let i = 0; i < h.length; i++) h[i] = 0.5 * (x[2 * i] + x[2 * i + 1]);
  const eb = eindBurst(h, 22050);
  ok(!(eb && eb.burst), `${c}: no noise burst at the end`);
  rows.push([c, m.duur_s]);
}
ok(bytes <= 25 * 1048576, 'added size within the 25 MB budget', `${(bytes / 1048576).toFixed(1)} MB`);
const manifestExtra = Object.keys(man).filter((k) => /^(ui_|shop_|bar_|coffee_|fryer_|snack_|door_(interior|bell)|stairs_|elevator_|key_|light_|step_(tile|parquet|carpet)|clothes_|zipper_|curtain_|scissors_|hair|wrench_|spray_|impact_|neon_|hood_|car_(horn|blinker)|handbrake_|seatbelt_|tractor_|harvest_|dig_|grain_|milking_|chicken_|cow_|sheep_|fence_|gate_|bucket_|deed_|football_|crowd_|referee_|ball_|sport_|bird_|rain_drips|wind_gust|frog_|church_|owl_|dog_|cat_|npc_|train_air|tram_doors|bus_stop|station_|cutscene_|phone_)/.test(k) && /_\d+$/.test(k));
for (const k of manifestExtra) ok(SFX_CLIP_KEYS.includes(k) || SAMPLE_INFO[k], `manifest clip ${k} belongs to the map or an older round`);

// -- derived tables ----------------------------------------------------------------------------------
const info = sfxSampleInfo(), ops = sfxOpnameAlleen(), gaps = sfxUiGaps();
ok(Object.keys(info).length === SFX_CLIP_KEYS.length, 'one SAMPLE_INFO row per clip');
ok(Object.keys(ops).length === keys.length, 'one FX_OPNAME_ALLEEN row per event');
for (const k of keys) if (SFX_MAP[k].bus === 'ui') ok(UI_COOLDOWN[k] === gaps[k], `${k}: UI cool-down taken from the map`);
const eager = new Set(eagerKeys());
let eagerN = 0;
for (const c of SFX_CLIP_KEYS) { const e = SFX_MAP[info[c].event]; ok(eager.has(c) === (e.eager && ['ui', 'deur', 'voetstap', 'winkel'].includes(e.cat)), `${c}: eager only for short frequent UI sounds`); if (eager.has(c)) eagerN++; }
const eagerKb = SFX_CLIP_KEYS.filter((c) => eager.has(c)).reduce((s, c) => s + (man[c] ? man[c].duur_s : 0), 0) * 44100 * 4 / 1024;
ok(eagerKb < 3500, 'the new eager clips decode to less than 3.5 MB of PCM', `${Math.round(eagerKb)} kB`);

// -- variant pool and anti-repeat ----------------------------------------------------------------
{
  const last = new Map();
  for (const k of keys.filter((x) => SFX_MAP[x].n > 1)) {
    let prev = null, seen = new Set(), repeat = false, seed = 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 60; i++) { const c = pickClip(k, null, last, rnd()); if (c === prev) repeat = true; prev = c; seen.add(c); }
    ok(!repeat, `${k}: never the same clip twice in a row`);
    ok(seen.size === SFX_MAP[k].n, `${k}: every variant gets used`);
  }
  ok(pickClip('ui_toggle_off', null, new Map(), 0.5) === 'ui_toggle_off_0', 'a single clip is always that clip');
  ok(pickClip('nope', null, new Map(), 0.5) === null, 'unknown event gives null');
  ok(pickClip('ui_button_press', ['ui_button_press_1'], new Map(), 0.9) === 'ui_button_press_1', 'only loaded clips are picked');
  // vervangSleutel (the path of haakFx and haakUi) also has the anti-repeat
  let prev = null, rep = false, cnt = 0;
  for (let i = 0; i < 40; i++) { const c = vervangSleutel('shop_buy_coins', () => true, () => 0); if (c === prev) rep = true; prev = c; cnt++; }
  ok(!rep && cnt === 40, 'vervangSleutel: anti-repeat for an event of the map even with a fixed random');
  ok(vervangSleutel('ui_toggle_off', (k) => k === 'ui_toggle_off_0') === 'ui_toggle_off_0', 'vervangSleutel: single clip');
  ok(vervangSleutel('shop_buy_coins', () => false) === null, 'vervangSleutel: nothing loaded gives null (silent, no error)');
}

// -- cool-down per event ---------------------------------------------------------------------------
{
  const st = new Map();
  ok(eventCoolOk(st, 'shop_buy_coins', 10) && !eventCoolOk(st, 'shop_buy_coins', 10.2) && eventCoolOk(st, 'shop_buy_coins', 10.6), 'cool-down per event');
  ok(eventCoolOk(st, 'ui_toggle_off', 10) && eventCoolOk(st, 'ui_toggle_off', 10.2), 'a different event is independent');
}

// -- Samen spelen --------------------------------------------------------------------------------------
{
  const s = newRemoteState();
  ok(!remoteAllowed(s, 'ui_button_press', 1, 1), 'a local event of another player is never heard');
  ok(!remoteAllowed(s, 'deed_stamp', 1, 1), 'the deed stamp (own progress) is local');
  ok(remoteAllowed(s, 'football_kick', 20, 1), 'a world event nearby is heard');
  ok(!remoteAllowed(s, 'football_kick', 20, 1.3), 'but only once per 0.8 s');
  ok(!remoteAllowed(s, 'football_net', SFX_MAP.football_net.range, 5), 'not beyond 60% of the range');
  let pass = 0;
  for (let i = 0; i < 20; i++) if (remoteAllowed(s, ['ball_bounce', 'football_post', 'referee_whistle', 'crowd_groan', 'dog_bark'][i % 5], 10, 20 + i * 0.05)) pass++;
  ok(pass <= 4, 'at most four remote sounds in a second', String(pass));
  ok(!remoteAllowed(s, 'nope', 1, 99), 'unknown event not heard');
}

// -- coupling function with a fake world ---------------------------------------------------------------
{
  resetRemoteState();
  const world = { audioEvents: [], player: { x: 5, y: 6 } };
  ok(sfxEvent(world, 'shop_door_chime', 10, 20) && world.audioEvents.length === 1, 'a world event becomes an audio event');
  const ev = world.audioEvents[0];
  ok(ev.kind === 'fx' && ev.name === 'shop_door_chime' && ev.x === 10 && ev.y === 20, 'the event carries name and place');
  ok(!sfxEvent(world, 'does_not_exist', 1, 1), 'unknown key is refused');
  ok(!sfxEvent(null, 'shop_door_chime', 1, 1), 'no world: refused, no throw');
  ok(!sfxEvent(world, 'ui_button_press', 1, 1, { from: 'p2', d: 3, now: 100 }), 'a UI sound of another player is refused');
  ok(!sfxEvent(world, 'football_kick', 1, 1, { from: 'p2', d: 400, now: 100 }), 'a far sound of another player is refused');
  ok(sfxEvent(world, 'football_kick', 1, 1, { from: 'p2', d: 30, now: 100 }), 'a near world sound of another player passes');
  ok(!sfxEvent(world, 'football_kick', 1, 1, { from: 'p3', d: 30, now: 100.2 }), 'and is not doubled by a second report');
  ok(isSfxEvent('ui_confirm') && !isSfxEvent('ui_confirm_0') && !isSfxEvent('toString'), 'isSfxEvent');
}

// -- every event is hooked in the code, or handed to a lead in docs/SFX-DEKKING-21-11.md (section 'Voor de leads') -----------------
{
  const JS = path.join(ROOT, 'game', 'js');
  const files = fs.readdirSync(JS, { recursive: true }).filter((f) => f.endsWith('.js') && !/sfx[\\/]sfxmap\.js$/.test(f));
  const code = files.map((f) => fs.readFileSync(path.join(JS, f), 'utf8')).join('\n');
  const doc = fs.readFileSync(path.join(ROOT, 'docs', 'SFX-DEKKING-21-11.md'), 'utf8');
  const leads = doc.slice(doc.indexOf('## Voor de leads'));
  let hooked = 0;
  for (const k of keys) {
    const inCode = code.includes(`'${k}'`);
    if (inCode) hooked++;
    ok(inCode || leads.includes('`' + k + '`'), `${k}: hooked in the code or listed for a lead`);
  }
  ok(hooked >= 35, 'at least 35 events are hooked in this round', String(hooked));
}

// -- no real brands or names in what the player can see (labels) --------------------------------------
for (const k of keys) ok(!/\b(nokia|iphone|samsung|coca|heineken|albert|jumbo|ajax|fc groningen|volvo|ford|opel)\b/i.test(SFX_MAP[k].label), `${k}: no brand in the label`);

console.log(fails ? `sfx_round5_test: ${fails} fouten van ${n}` : `sfx_round5_test: ok (${n} controles, ${SFX_CLIP_KEYS.length} clips, ${(bytes / 1048576).toFixed(1)} MB)`);
process.exit(fails ? 1 : 0);
