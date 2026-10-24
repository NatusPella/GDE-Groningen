// Logic test for the gate of an app text on the phone (#425), without Electron:
//   node scripts/app_text_gate_test.mjs
//
// game/js/phonefeed.js shows a waiting note only when the HUD is not busy, nothing holds the cards back, zone A is
// free and narrative.js lets a toast start; a story text (P1) is let through a busy moment, an app text (P2) is not.
// The Electron verhaaltest could not see the app text when the harness left a wanted level or a fresh fight behind
// (storytest.js phoneQuiet/phoneReady now first puts the world in a quiet moment), so these are the rules it relies
// on: with the same tables as the game, and a fake clock for the scheduler.
import * as N from '../game/js/narrative.js';
import { mayShow, P1, P2 } from '../game/js/hudbus.js';
import { ZoneBoard } from '../game/js/hudrules.js';

let t = 5000;
N.setNarrativeClock(() => t);
let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info, JSON.stringify(N.narrativeState())); } };
const on = {}, wait = {};
for (const k of ['scene', 'contact', 'call', 'text', 'say', 'banter', 'sub-cine', 'sub-banter']) N.registerNarrative(k, { active: () => !!on[k], pending: () => !!wait[k] });
const step = (s) => { t += s; N.updateNarrative(); };

// The one line of updatePhoneFeed that shows a note, reduced to its gates (no DOM, no clock of its own).
const mayShowNote = (note, { busy = false, held = false, zone = new ZoneBoard() } = {}) =>
  zone.free('A', 'phone') && !held && !(busy && !note.story) && N.mayStart(note.story ? 'text' : 'phone');
// The HUD itself: an app text is a P2 card in zone A, a story text a P1 card there (hudbus.js KINDS).
const hudShows = (note, busy) => mayShow('hud', { p: note.story ? P1 : P2, busy, dialogue: false, zone: 'A' });
const APP = { from: 'Tessa', text: 'Ik ben bij het Loket. Kom niet. Je brengt ze in de war.', duration: 5, silent: true };
const STORY = { from: 'Tessa', text: 'Bel Rikus.', story: true };

// 1. a quiet world: the app text comes through on both gates
step(60);
ok(mayShowNote(APP) && hudShows(APP, false), 'quiet: an app text passes the scheduler and the HUD');

// 2. what the harness can leave behind: a wanted level or a fight in the last 5 s keeps the HUD busy. The app text
// then waits on two gates (phonefeed and the P2 card), and a story text still goes through (P1 is not held).
ok(!mayShowNote(APP, { busy: true }) && !hudShows(APP, true), 'busy: a chase or a fight holds the app text back');
ok(mayShowNote(STORY, { busy: true }) && hudShows(STORY, true), 'busy: a story text is not held by a chase');
// the harness puts the world back to rest (wanted 0, no race): the card is not lost, it shows on the next quiet frame
ok(mayShowNote(APP) && hudShows(APP, false), 'after the chase the app text still comes through (a note is not dropped)');

// 3. the flake itself: a story contact or a cutscene that starts while the app text waits holds every toast
// (narrative.js decideStart). The card only comes after it, so the harness skips these while it waits.
on.contact = true; step(0.1);
ok(!mayShowNote(APP) && N.heldBack(), 'a radio contact holds the app text back');
ok(!N.mayStart('phone'), 'toasts wait for a story contact');
on.contact = false; step(0);
ok(mayShowNote(APP), 'the app text right after the contact (only a scene adds a beat)');
on.scene = true; step(0.1);
ok(!mayShowNote(APP) && N.heldBack(), 'a cutscene holds the app text back too');
on.scene = false; step(0); step(1);
ok(!mayShowNote(APP), 'a toast waits a beat after a cutscene (TOAST_AFTER_SCENE)');
step(1);
ok(mayShowNote(APP), 'and comes through when the cutscene is a beat behind');
on['sub-banter'] = true; step(0.1);
ok(!mayShowNote(APP), 'a subtitle holds the app text back');
on['sub-banter'] = false; step(0); step(2);

// 4. zone A: a HUD card, a call or a text that is up takes the zone; the app text waits for it and shows after
{
  const zone = new ZoneBoard();
  zone.occupy('A', 'card', P1);
  ok(!mayShowNote(APP, { zone }), 'zone A taken by a HUD card: the app text waits');
  zone.vacate('A', 'card');
  ok(mayShowNote(APP, { zone }), 'zone A free again: the app text shows');
  zone.occupy('A', 'phone', P2);
  ok(mayShowNote(APP, { zone }), 'the phone keeps its own zone (a second card waits inside phonefeed)');
}

// 5. two toasts never overlap, also not for an app text
N.noteToast();
ok(!mayShowNote(APP), 'the toast gap after another toast');
step(1.6);
ok(mayShowNote(APP), 'the app text after the toast gap');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
