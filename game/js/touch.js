// Touch controls for phones and tablets: a floating stick on the left half,
// camera swipes on the right half and buttons for the situation. It feeds
// input.js the way gamepad.js does (padAxis, padHold, mouse), so every
// action works unchanged. Does nothing on a desktop; ?touch=1 forces it on
// and ?touch=0 off. Menus and the phone stay plain taps.
import { detectTouch, stickVector, knobOffset, lookDelta, stickKeys, touchPlan, touchContext, touchUiActive, STICK_RADIUS } from './touchlogic.js';
import { getSettings } from './settings.js';
import { sendKey } from './input.js';

const CSS = `
#touch-ui { position: fixed; inset: 0; z-index: 20; pointer-events: none; display: none; touch-action: none; -webkit-user-select: none; user-select: none; }
html.touch-play #touch-ui { display: block; }
#touch-ui .t-zone { position: absolute; top: 0; bottom: 0; pointer-events: auto; touch-action: none; }
#touch-ui .t-left { left: 0; width: 45%; }
#touch-ui .t-right { right: 0; width: 55%; }
#touch-ui .t-ring { position: absolute; width: 112px; height: 112px; margin: -56px 0 0 -56px; border-radius: 50%; border: 2px solid rgba(240, 237, 228, 0.45); background: rgba(10, 19, 13, 0.25); display: none; }
#touch-ui .t-knob { position: absolute; left: 50%; top: 50%; width: 52px; height: 52px; margin: -26px 0 0 -26px; border-radius: 50%; background: rgba(63, 201, 122, 0.7); }
#touch-ui .t-btn { position: absolute; pointer-events: auto; touch-action: none; min-width: 64px; height: 64px; padding: 0 8px; box-sizing: border-box; border-radius: 32px; border: 2px solid rgba(240, 237, 228, 0.55);
  background: rgba(10, 19, 13, 0.5); color: #f0ede4; font: 17px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; letter-spacing: 1px; display: flex; align-items: center; justify-content: center; }
#touch-ui .t-btn.on { background: rgba(63, 201, 122, 0.75); color: #0c140e; }
#touch-ui .t-pause { top: max(10px, env(safe-area-inset-top)); right: max(10px, env(safe-area-inset-right)); min-width: 48px; height: 48px; border-radius: 24px; font-size: 20px; }
`;

// button spots from the bottom right corner, in px: [right, bottom]
const SPOTS_RIGHT = [[24, 110], [96, 40], [96, 180], [168, 110], [30, 240]];
const SPOTS_LEFT = [[24, 40], [24, 120], [96, 40]];

export function initTouch(input, world, hooks = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const q = new URLSearchParams(location.search);
  const mm = (s) => !!(window.matchMedia && window.matchMedia(s).matches);
  const on = detectTouch({
    maxTouchPoints: navigator.maxTouchPoints || 0,
    coarse: mm('(pointer: coarse)'), fine: mm('(any-pointer: fine)'), hover: mm('(hover: hover)'),
    forced: q.has('touch') ? q.get('touch') !== '0' : null,
  });
  if (!on) return false;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  document.documentElement.classList.add('touch-device');

  const root = document.createElement('div');
  root.id = 'touch-ui';
  root.innerHTML = '<div class="t-zone t-left"></div><div class="t-zone t-right"></div><div class="t-ring"><div class="t-knob"></div></div>';
  document.body.appendChild(root);
  const left = root.querySelector('.t-left'), right = root.querySelector('.t-right');
  const ring = root.querySelector('.t-ring'), knob = root.querySelector('.t-knob');
  const btnHost = document.createElement('div');
  root.appendChild(btnHost);

  let ctx = 'foot';
  let shown = false;
  let stick = null; // { id, origin }
  let look = null; // { id, last }
  let held = new Set(); // stick keys held
  const pressed = new Map(); // pointerId -> { b, el }

  const hold = (k, v) => input.padHold(k, v);
  const act = (b, down) => {
    const a = b.action;
    if (a === '@fire') input.mouse.down = down;
    else if (a === '@aim') input.mouse.rightDown = down;
    else if (a.startsWith('@wheel')) { if (down) input.mouse.wheel += a === '@wheel+' ? 100 : -100; }
    else if (a === '@gas') hold('w', down);
    else if (a === '@brake') hold('s', down);
    else hold(a, down);
  };

  function releaseAll() {
    for (const { b, el } of pressed.values()) { act(b, false); el.classList.remove('on'); }
    pressed.clear();
    for (const k of held) hold(k, false);
    held = new Set();
    input.padAxis = [0, 0];
    stick = look = null;
    ring.style.display = 'none';
  }

  function addButton(b, spot, side) {
    const el = document.createElement('div');
    el.className = 't-btn';
    el.textContent = b.label;
    el.style[side] = spot[0] + 'px';
    el.style.bottom = spot[1] + 'px';
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
      pressed.set(e.pointerId, { b, el });
      el.classList.add('on');
      act(b, true);
    });
    const up = (e) => {
      const p = pressed.get(e.pointerId);
      if (!p) return;
      pressed.delete(e.pointerId);
      el.classList.remove('on');
      act(b, false);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    btnHost.appendChild(el);
  }

  function build() {
    btnHost.textContent = '';
    const plan = touchPlan(ctx);
    let r = 0, l = 0;
    for (const b of plan) {
      if (b.side === 'right') addButton(b, SPOTS_RIGHT[r++ % SPOTS_RIGHT.length], 'right');
      else addButton(b, SPOTS_LEFT[l++ % SPOTS_LEFT.length], 'left');
    }
    const pause = document.createElement('div');
    pause.className = 't-btn t-pause';
    pause.textContent = 'II';
    pause.setAttribute('aria-label', 'Pauze');
    pause.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      sendKey('keydown', 'escape', 'pad');
      sendKey('keyup', 'escape', 'pad');
    });
    btnHost.appendChild(pause);
  }

  const pt = (e) => ({ x: e.clientX, y: e.clientY });

  left.addEventListener('pointerdown', (e) => {
    if (stick) return;
    e.preventDefault();
    left.setPointerCapture && left.setPointerCapture(e.pointerId);
    stick = { id: e.pointerId, origin: pt(e) };
    ring.style.left = e.clientX + 'px';
    ring.style.top = e.clientY + 'px';
    ring.style.display = 'block';
    knob.style.transform = 'none';
  });
  left.addEventListener('pointermove', (e) => {
    if (!stick || stick.id !== e.pointerId) return;
    const v = stickVector(stick.origin, pt(e), STICK_RADIUS);
    const o = knobOffset(stick.origin, pt(e), STICK_RADIUS);
    knob.style.transform = `translate(${o.x}px, ${o.y}px)`;
    // steering keeps only the sideways part; gas and brake are buttons
    const steer = ctx === 'vehicle' || ctx === 'vehicleManual' || ctx === 'skutsje';
    input.padAxis = steer ? [v[0], 0] : v;
    const next = stickKeys(steer ? [v[0], 0] : v, held);
    for (const k of held) if (!next.has(k)) hold(k, false);
    for (const k of next) if (!held.has(k)) hold(k, true);
    held = next;
  });
  const stickEnd = (e) => {
    if (!stick || stick.id !== e.pointerId) return;
    for (const k of held) hold(k, false);
    held = new Set();
    input.padAxis = [0, 0];
    stick = null;
    ring.style.display = 'none';
  };
  left.addEventListener('pointerup', stickEnd);
  left.addEventListener('pointercancel', stickEnd);

  right.addEventListener('pointerdown', (e) => {
    if (look) return;
    e.preventDefault();
    right.setPointerCapture && right.setPointerCapture(e.pointerId);
    look = { id: e.pointerId, last: pt(e) };
  });
  right.addEventListener('pointermove', (e) => {
    if (!look || look.id !== e.pointerId) return;
    const [dx, dy] = lookDelta(look.last, pt(e), getSettings().padLookSensitivity || 1);
    look.last = pt(e);
    input.mouse.dx += dx;
    input.mouse.dy += dy;
  });
  const lookEnd = (e) => { if (look && look.id === e.pointerId) look = null; };
  right.addEventListener('pointerup', lookEnd);
  right.addEventListener('pointercancel', lookEnd);

  // follows the game: shown while playing, rebuilt when the situation changes
  setInterval(() => {
    const active = touchUiActive({ started: document.body.classList.contains('game-started'), menuOpen: hooks.menuOpen ? hooks.menuOpen() : false });
    const nctx = active ? touchContext(world, { started: true, menuOpen: false, shiftMode: getSettings().shiftMode }) : 'menu';
    if (active !== shown) {
      shown = active;
      document.documentElement.classList.toggle('touch-play', active);
      input.padLook = active;
      releaseAll();
      if (active) { ctx = nctx; build(); }
    } else if (active && nctx !== ctx) {
      releaseAll();
      ctx = nctx;
      build();
    }
  }, 200);
  window.addEventListener('blur', releaseAll);
  return true;
}
