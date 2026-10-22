// Menu navigation sounds as rules (#413): which key, click or focus in which menu makes which sound, and when it stays silent (no double
// sound from one gesture). Pure: no DOM, no audio. sfx/ui.js turns a DOM event into an `info` (infoOf) and plays what decide() answers with
// the sounds the main menu always had (tick, select, back, toggle, slider) on the existing UI bus. scripts/menugeluid_test.mjs runs the rules.
//
// One list of menus (ROOTS): every menu of the game is one of these roots, so a new menu gets the sounds by taking the class `gm`
// (menu.css) or by being part of the pause menu. The controller needs nothing of its own: it sends the same keys (gamepad.js sendKey)
// and moves the same focus (menuFallback), so the keyboard rules are the controller rules.

// the start screen, the pause menu (with the map, the phone, loopbaan, garage, settings and the rest as its sections), the phone and
// every `gm` menu (menu.css): saved games, shops and wardrobes, Samen spelen, the controller test
export const ROOTS = '#start-screen, #pause-menu, .phone, .gm';
// what can be moved to, chosen or pressed
export const ITEMS = 'button, [role="menuitem"], [role="tab"], [role="option"], [role="radio"], [data-idx], [data-mission], [data-tab], .ss-item, a[href]';
// the way back
export const BACKS = '[data-back], [data-action="cancel"], [data-action="resume"]';
// controls that make their own sound on change (an input event): no select sound for a click or a key on them
export const OWN_SOUND = 'input[type="checkbox"], input[type="range"], select';
// where typing is typing: no menu sound for the keys
export const EDITABLE = 'input:not([type="checkbox"]):not([type="range"]):not([type="button"]):not([type="radio"]), textarea, [contenteditable="true"]';

export const GAP = {
  opened: 0.15, // seconds after a menu appears in which the focus it takes is no move
  pointer: 0.3, // seconds after a press of the mouse in which the focus it gives is no move
  nav: 0.04, // two moves closer than this are one
  keyClick: 0.6, // the click a key makes (a button, the controller's A) comes this long after the key's own sound
  slider: 0.045,
};

export function newNav() {
  return { visible: false, pointerAt: -1e9, openedAt: -1e9, navAt: -1e9, sliderAt: -1e9, keyAt: -1e9 };
}

// The roots of an element as one word; null when it is in none of them. `matches` answers a selector for the element (el.closest(...)).
// pause before start before phone before gm: the pause menu is itself a gm.
export function rootOf(closest) {
  if (closest('#pause-menu')) return 'pause';
  if (closest('#start-screen')) return 'start';
  if (closest('.phone')) return 'phone';
  if (closest('.gm')) return 'gm';
  return null;
}

// info of an element, from a closest() function (a DOM adapter, or a fake in the test)
export function infoOf(closest, tag = '') {
  const root = rootOf(closest);
  return {
    root,
    item: !!root && !!closest(ITEMS),
    back: !!root && !!closest(BACKS),
    ownSound: !!root && !!closest(OWN_SOUND),
    editable: !!closest(EDITABLE),
    range: tag === 'range',
    checkbox: tag === 'checkbox',
  };
}

const tick = (f) => ({ sound: 'tick', f });

// One event. ev: { kind, t, ... } (below); returns { sound: 'tick' | 'select' | 'back' | 'toggle' | 'slider' | null, ... }. Changes `st`.
//   { kind: 'pointer', t }                                a press of the mouse or a finger
//   { kind: 'visible', t, visible }                       once per frame: is a menu on screen
//   { kind: 'focus', t, info }                            the focus moved (keyboard, controller, or a menu that follows the mouse)
//   { kind: 'click', t, info, detail }                    a click (detail 0: made by a key, the controller or a script)
//   { kind: 'input', t, info, checked, u }                a slider, a checkbox or another field changed (u: the slider 0..1)
//   { kind: 'key', t, key, repeat, info }                 a key down; info of the focused element
//   { kind: 'api', t, which }                             a menu without DOM focus says what it did: 'move' | 'select' | 'back' | 'toggle' | 'open'
const NONE = { sound: null };
export function decide(st, ev) {
  const t = ev.t;
  switch (ev.kind) {
    case 'pointer':
      st.pointerAt = t;
      return NONE;
    case 'visible':
      if (ev.visible && !st.visible) st.openedAt = t;
      st.visible = !!ev.visible;
      return NONE;
    case 'focus': {
      const i = ev.info;
      if (!i || !i.root) return NONE;
      // a menu that has just appeared takes the focus: that is no move (the poll of 'visible' may not have run yet)
      if (!st.visible) { st.openedAt = t; st.visible = true; return NONE; }
      if (t - st.pointerAt < GAP.pointer || t - st.openedAt < GAP.opened || t - st.navAt < GAP.nav) return NONE;
      st.navAt = t;
      return tick(i.root === 'start' ? 1500 : 1800);
    }
    case 'click': {
      const i = ev.info;
      if (!i || !i.root) return NONE;
      // the key that made this click (a button, the controller's A) has played its sound already
      if (ev.detail === 0 && t - st.keyAt < GAP.keyClick) return NONE;
      if (i.back) return { sound: 'back' };
      if (i.ownSound || !i.item) return NONE;
      return { sound: 'select' };
    }
    case 'input': {
      const i = ev.info;
      if (!i || !i.root) return NONE;
      if (i.range) {
        if (t - st.sliderAt < GAP.slider) return NONE;
        st.sliderAt = t;
        return { sound: 'slider', u: Math.max(0, Math.min(1, ev.u ?? 0)) };
      }
      if (i.checkbox) return { sound: 'toggle', on: !!ev.checked };
      return i.root === 'pause' ? tick(1400) : NONE;
    }
    case 'key': {
      if (!st.visible || ev.repeat) return NONE;
      const i = ev.info || {};
      if (i.editable) return NONE;
      const k = ev.key;
      if (k === 'Enter' || k === ' ') {
        // a slider, a checkbox or a list make their own sound on change
        if (i.ownSound) return NONE;
        st.keyAt = t;
        return { sound: i.back ? 'back' : 'select' };
      }
      // the pause menu closes on Escape with its own sound (the unfolding phone)
      if (k === 'Escape') return i.root === 'pause' ? NONE : { sound: 'back' };
      if (k === 'Backspace') return { sound: 'back' };
      return NONE;
    }
    case 'api': {
      if (ev.which === 'open') { st.openedAt = t; return NONE; }
      if (ev.which === 'move') {
        if (t - st.navAt < GAP.nav) return NONE;
        st.navAt = t;
        return tick(1800);
      }
      if (ev.which === 'select') { st.keyAt = t; return { sound: 'select' }; }
      if (ev.which === 'back') return { sound: 'back' };
      if (ev.which === 'toggle') return { sound: 'toggle', on: ev.on !== false };
      return NONE;
    }
    default:
      return NONE;
  }
}
