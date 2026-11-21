// The conversation panel of the Beppe arc (issue #1063): a text scene in the same
// panel as the text jobs (choicepanel.js), in a warm accent. Beppe has no voice,
// so her lines appear here as text, with the speaker as the kicker. E, Enter or
// Space go on; a choice is answered with 1, 2 or 3; Backspace skips what is left
// of an ordinary visit (never the first visit or the farewell: those are short).
//
// The runner is pure (beppe_boog_rules.js createRunner). Nothing is stored here:
// the caller sets its marks when onDone runs, so a save loaded in the middle of
// a scene simply plays it again from the start (the scene is atomic).

import { createChoicePanel, keycap } from './choicepanel.js';
import { createRunner } from './beppe_boog_rules.js';
import { NAME } from './beppe_boog_texts.js';

let panel = null;
let run = null;
let onDone = null;
let canSkip = false;

const ensure = () => panel || (panel = createChoicePanel('var(--ds-c-ink-geel, #e8c93a)'));

export const gesprekActive = () => !!run;

export function openDialogue(w, script, { done = null, skippable = false } = {}) {
  if (run) return false;
  run = createRunner(script);
  onDone = done;
  canSkip = !!skippable;
  if (run.done) { finish(w, false); return false; }
  ensure().show();
  render();
  return true;
}

function render() {
  if (!run || !panel) return;
  const b = run.current();
  if (!b) return;
  if (b.choice) {
    panel.set({
      kicker: NAME.tessa, text: '', options: b.choice.map((c, i) => ({ key: String(i + 1), label: c.label })),
      help: `${keycap('1')}${keycap('2')}${keycap('3')} kiezen`,
    });
    return;
  }
  panel.set({
    kicker: NAME[b.who] || '', text: b.text, options: [],
    help: `${keycap('E')} verder${canSkip ? ` · ${keycap('Backspace')} overslaan` : ''}`,
  });
}

function finish(w, skipped) {
  if (panel) panel.hide();
  const cb = onDone;
  run = null;
  onDone = null;
  if (cb) { try { cb(w, skipped); } catch (e) { console.error('beppe-gesprek', e); } }
}

export function stopGesprek(w) { if (run) { if (panel) panel.hide(); run = null; onDone = null; } }

// Per frame while a conversation is open. Returns true while it holds the player.
export function tickGesprek(w) {
  if (!run) return false;
  const input = w.input;
  w.minigameUntil = w.time + 0.25; // the number keys must not switch weapons
  if (run.isChoice()) {
    for (const [i, k] of ['1', '2', '3'].entries()) {
      if (input.wasPressed(k)) { input.consume(k); if (run.choose(i)) { run.done ? finish(w, false) : render(); } return true; }
    }
    return true;
  }
  if (canSkip && input.wasPressed('backspace')) { input.consume('backspace'); finish(w, true); return true; }
  for (const k of ['e', 'enter', 'space', 'f']) {
    if (input.wasPressed(k)) {
      input.consume(k);
      run.advance();
      if (run.done) finish(w, false); else render();
      return true;
    }
  }
  return true;
}
