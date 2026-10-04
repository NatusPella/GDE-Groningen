// Who gets a Space (or Enter) press while playing: kept small and DOM-free so
// node scripts/space_gate_test.mjs can check it.

// A cutscene swallows a fresh Space press (it starts the hold-to-skip, and no
// handbrake or jump fires when it ends), unless it is only a camera for a
// minigame that wants the key itself (`passKeys`: the fierljep aim).
export function cutsceneTakesSpace(active, { repeat = false, started = true, menuOpen = false } = {}) {
  if (repeat || !active || !started || menuOpen) return false;
  return !active.passKeys;
}

// A UI control left focused by a menu, card or dialog would turn a Space or
// Enter meant for the game into a click: while playing it loses the focus.
const CONTROL = new Set(['BUTTON', 'A', 'SUMMARY', 'SELECT']);
export function blurForGameKey(key, el, playing) {
  if (!playing || !el || (key !== ' ' && key !== 'Enter')) return false;
  if (el.isContentEditable) return false;
  const tag = String(el.tagName || '').toUpperCase();
  if (tag === 'INPUT') return /^(button|submit|checkbox|radio|range|reset)$/i.test(el.type || '');
  if (tag === 'TEXTAREA') return false;
  return CONTROL.has(tag) || !!(el.getAttribute && /^(button|tab|menuitem|option|switch)$/.test(el.getAttribute('role') || ''));
}
