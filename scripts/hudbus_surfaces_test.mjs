// New channels have to go through the one planner (#104). Two parts:
//  1. the SURFACES table of game/js/hudbus.js is consistent (every gate names a channel and a kind that exist);
//  2. the source is scanned: a module that puts its own overlay on screen (an injected <style>, a CSS string
//     with position: fixed) or defines its own show-a-banner/card/toast function must be listed in SURFACES.
//     A new channel therefore fails this test until it says how it is planned: through a gate of hudbus.js,
//     or `own` with the reason. The kind names modules pass to mayStart, registerNarrative, mayInterrupt and
//     isOverlayHeld must exist in the tables.
//   node scripts/hudbus_surfaces_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as B from '../game/js/hudbus.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'js');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
const src = Object.fromEntries(files.map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));

let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };

// --- 1. the table ------------------------------------------------------------
const kindsOf = {
  narrative: B.NARRATIVE.KINDS,
  moment: Object.keys(B.MOMENTS),
  overlay: Object.keys(B.OVERLAY_RANK),
  speech: Object.keys(B.SPEECH_PRIO),
  voice: null, hud: null, tip: null,
};
const owners = new Map(); // file -> surfaces
for (const [id, s] of Object.entries(B.SURFACES)) {
  ok(Array.isArray(s.files) && s.files.length > 0, `${id}: has files`);
  ok(Array.isArray(s.gates) !== (typeof s.own === 'string'), `${id}: either gates or own (the reason), not both`);
  for (const f of s.files || []) {
    ok(files.includes(f), `${id}: ${f} exists`);
    if (!owners.has(f)) owners.set(f, []);
    owners.get(f).push(id);
  }
  for (const [channel, kind] of s.gates || []) {
    ok(channel in B.CHANNELS, `${id}: channel ${channel} exists`);
    if (kind) ok(kindsOf[channel] && kindsOf[channel].includes(kind), `${id}: ${channel} knows kind ${kind}`);
  }
  for (const k of s.kinds || []) ok(k in B.KINDS, `${id}: card kind ${k}`);
  ok(B.surfaceP(id) === null || [B.P0, B.P1, B.P2, B.P3].includes(B.surfaceP(id)), `${id}: P0..P3`);
  const z = B.surfaceZone(id);
  ok(z === null || 'ABCDEFGH'.includes(z), `${id}: zone A..H`);
}
// every channel has at least one surface that goes through it
for (const c of Object.keys(B.CHANNELS)) ok(Object.values(B.SURFACES).some((s) => (s.gates || []).some(([ch]) => ch === c)), `a surface uses channel ${c}`);
// every moment, overlay, narrative kind and speech class is used by a surface
for (const [ch, list] of Object.entries(kindsOf)) {
  if (!list) continue;
  for (const k of list) ok(Object.values(B.SURFACES).some((s) => (s.gates || []).some(([c, kk]) => c === ch && kk === k)) || ch === 'speech' && ['radio', 'ambient', 'react', 'job', 'mission', 'story'].includes(k),
    `${ch} kind ${k} belongs to a surface`);
}
// a card kind is in KINDS or the surface table, a shown card kind has a P and a zone
for (const k of Object.keys(B.KINDS)) ok(B.cardPrio(k) !== undefined && 'AE'.includes(B.cardZone(k)), `card kind ${k}`);

// --- 2. the source -------------------------------------------------------------
// who may draw its own overlay: every module that injects a <style> or writes position: fixed
const ownsOverlay = (s) => /position:\s*'?fixed/.test(s) || /createElement\(['"]style['"]\)/.test(s);
// the planner modules and the DOM side of the overlay rules are not surfaces themselves
const PLANNERS = ['hudbus.js', 'hudrules.js', 'overlayrules.js', 'overlayhold.js', 'narrative.js', 'attention.js'];
const unlisted = files.filter((f) => ownsOverlay(src[f]) && !owners.has(f) && !PLANNERS.includes(f));
ok(unlisted.length === 0, `own overlay without a row in SURFACES (hudbus.js): ${unlisted.join(', ')} -- add the module to the surface it belongs to, or give it a row with gates or own`);

// the show-a-banner/card/toast functions: defined only in modules that are listed
const DEFINES = /(?:function|const|let)\s+((?:show|push|flash|announce|notify|add)(?:Banner|Card|Toast|Notice|Popup|Message|Note|Alert|Splash))\b/g;
for (const f of files) {
  for (const m of src[f].matchAll(DEFINES)) ok(owners.has(f), `${f} defines ${m[1]} but is not in SURFACES`);
}
// the shared APIs have one home
const HOME = { showBanner: 'cinematics.js', showNameCard: 'namecard.js', createChoicePanel: 'choicepanel.js', startCall: 'phonefeed.js', flashScreen: 'postfx3d.js' };
for (const [fn, home] of Object.entries(HOME)) {
  const defs = files.filter((f) => new RegExp(`export\\s+function\\s+${fn}\\b`).test(src[f]));
  ok(defs.length === 1 && defs[0] === home, `${fn} is defined once, in ${home} (found: ${defs.join(', ') || 'nowhere'})`);
}
ok(/\baddMessage\s*\(/.test(src['world.js']), 'addMessage lives in world.js (the cardSink)');

// kind names passed to the planners exist
const literals = (re) => files.flatMap((f) => [...src[f].matchAll(re)].map((m) => ({ f, k: m[1] })));
for (const { f, k } of literals(/\bmayStart\('([a-z-]+)'/g)) ok(B.NARRATIVE.KINDS.includes(k), `${f}: mayStart('${k}') is a narrative kind`);
for (const { f, k } of literals(/\bregisterNarrative\('([a-z-]+)'/g)) ok(B.NARRATIVE.KINDS.includes(k), `${f}: registerNarrative('${k}') is a narrative kind`);
for (const { f, k } of literals(/\bmayInterrupt\('([a-z0-9]+)'/g)) ok(k in B.MOMENTS, `${f}: mayInterrupt('${k}') is a moment`);
for (const { f, k } of literals(/\bnoteMoment\('([a-z0-9]+)'/g)) ok(k in B.MOMENTS || k === 'scene', `${f}: noteMoment('${k}') is a moment`);
for (const { f, k } of literals(/\bisOverlayHeld\('([a-z]+)'/g)) ok(k in B.OVERLAY_RANK, `${f}: isOverlayHeld('${k}') is an overlay`);

console.log(`${n - bad}/${n} hudbus surfaces ok`);
process.exit(bad ? 1 : 0);
