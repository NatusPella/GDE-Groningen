// Touch controls for phones and tablets: a floating stick on the left half,
// camera swipes on the right half and buttons for the situation. It feeds
// input.js the way gamepad.js does (padAxis, padHold, mouse), so every
// action works unchanged. Does nothing on a desktop; ?touch=1 forces it on
// and ?touch=0 off. Menus and the phone stay plain taps.
import { detectTouch, touchMode, touchLayout, touchMore, stickVector, knobOffset, lookDelta, stickKeys, touchPlacement, leftOffset, touchContext, stickless, touchUiActive, STICK_RADIUS } from './touchlogic.js';
import { refreshGlyphs } from './glyphs.js';
import { getSettings } from './settings.js';
import { FLAGS } from './devflags.js';
import { sendKey } from './input.js';
import { applyMobileProfile } from './gfxprofile.js';

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
/* pause and Meer share the top row (the Gas button sits right under it); 60 px x the lowest button scale (0.75) stays above 44 px */
#touch-ui .t-more { right: calc(max(10px, env(safe-area-inset-right)) + 64px); top: max(10px, env(safe-area-inset-top)); min-width: 60px; height: 60px; font-size: 15px; }
#touch-ui .t-panel { position: absolute; right: max(10px, env(safe-area-inset-right)); top: calc(max(10px, env(safe-area-inset-top)) + 64px); display: none; flex-wrap: wrap; gap: 8px; max-width: 60%; justify-content: flex-end; pointer-events: auto; }
#touch-ui .t-panel.open { display: flex; }
#touch-ui .t-panel .t-btn { position: static; }
#touch-ui .t-turn { position: absolute; left: 50%; top: 12px; transform: translateX(-50%); padding: 8px 14px; border-radius: 18px; background: rgba(10, 19, 13, 0.8); color: #f0ede4; font: 15px Arial, sans-serif; display: none; pointer-events: none; text-align: center; max-width: 90%; }
html.touch-portrait #touch-ui .t-turn { display: block; }
#touch-ui .t-pause { top: max(10px, env(safe-area-inset-top)); right: max(10px, env(safe-area-inset-right)); min-width: 60px; height: 60px; border-radius: 30px; font-size: 20px; }

html.touch-device, html.touch-device body { overscroll-behavior: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
html.touch-device body { touch-action: manipulation; }
html.touch-device button, html.touch-device [role="button"], html.touch-device select { min-height: 44px; }
html.touch-device #touch-ui .t-btn { min-height: 0; }
/* the HUD around the touch layer (#96): zone C (clock, stars) left of pause and Meer, the speedometer between the thumbs, the street name above the minimap */
html.touch-device #hud .hud-top-right { right: calc(var(--hud-edge) + 128px / var(--ui, 1)); }
html.touch-device #hud .hud-speedo, html.touch-device #hud .hud-heli { right: auto; left: 50%; transform: translateX(-50%); }
html.touch-device #hud .hud-vehname, html.touch-device #hud .hud-race { right: calc(var(--hud-edge) + 120px / var(--ui, 1)); }
/* the key-hint rows (Kaart, Radio, ...) lay under the right thumb: the buttons carry those labels; keyboard hints mean nothing, a map has a close button */
html.touch-device #hud .hud-ctx { display: none; }
html.touch-device .mv-close { display: inline-flex !important; }
html.touch-device .m-hint, html.touch-device #start-screen .ss-foot { display: none; }
html.touch-device #hud .hud-fcol { left: var(--hud-edge); bottom: calc(var(--mm-bottom) + var(--mm-size) + 6px); }
/* small HUD texts stay at 11 px on screen after the phone's HUD scale (0.62-0.8) */
html.touch-device #hud :is(small, .hud-key, .ach-kicker, .ach-desc, .ach-pct, .pf-time, .pf-more, .nl-sub, .hud-mission-progress) { font-size: max(12px, calc(11px / var(--ui, 1))); }
/* the pause menu is a landscape layout: on a portrait phone it says so */
html.touch-portrait #pause-menu.visible::before { content: 'Draai je toestel voor het menu'; position: absolute; left: 50%; top: 8px; transform: translateX(-50%); z-index: 5; padding: 8px 14px; border-radius: 18px; background: rgba(10, 19, 13, 0.9); color: #f0ede4; font: 15px Arial, sans-serif; white-space: nowrap; }
#touch-ui .t-left-btns, #touch-ui .t-right-btns { position: absolute; bottom: env(safe-area-inset-bottom); }
#touch-ui .t-left-btns { left: env(safe-area-inset-left); width: 0; height: 0; }
#touch-ui .t-right-btns { right: env(safe-area-inset-right); width: 0; height: 0; }
`;


export function initTouch(input, world, hooks = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const mm = (s) => !!(window.matchMedia && window.matchMedia(s).matches);
  const detected = detectTouch({
    maxTouchPoints: navigator.maxTouchPoints || 0,
    coarse: mm('(pointer: coarse)'), fine: mm('(any-pointer: fine)'), hover: mm('(hover: hover)'),
    forced: FLAGS.touch !== null ? FLAGS.touch !== '0' : null,
  });
  const on = FLAGS.touch !== null ? detected : touchMode(getSettings().touchControls, detected);
  if (!on) return false;

  // lighter graphics on the first start (only while the settings are untouched)
  applyMobileProfile({ width: window.innerWidth, height: window.innerHeight, cores: navigator.hardwareConcurrency || 0, memory: navigator.deviceMemory || 0 });

  // the notch and the home bar stay clear, and the page doesn't zoom or bounce
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp && !/viewport-fit/.test(vp.content)) vp.content += ', viewport-fit=cover, maximum-scale=1, user-scalable=no';

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  document.documentElement.classList.add('touch-device');
  window.dispatchEvent(new Event('touchmode'));

  const root = document.createElement('div');
  root.id = 'touch-ui';
  root.innerHTML = '<div class="t-zone t-left"></div><div class="t-zone t-right"></div><div class="t-ring"><div class="t-knob"></div></div>';
  document.body.appendChild(root);
  const left = root.querySelector('.t-left'), right = root.querySelector('.t-right');
  const ring = root.querySelector('.t-ring'), knob = root.querySelector('.t-knob');
  const btnHost = document.createElement('div');
  root.appendChild(btnHost);
  const turn = document.createElement('div');
  turn.className = 't-turn';
  root.appendChild(turn);

  // screen class and orientation: button scale, zone widths, the turn-device hint
  function layout() {
    const L = touchLayout({ width: window.innerWidth, height: window.innerHeight });
    root.style.setProperty('--t-scale', String(L.scale));
    btnHost.style.zoom = String(L.scale);
    const off = leftOffset({ width: window.innerWidth, height: window.innerHeight });
    root.style.setProperty('--t-lright', off.right + 'px');
    root.style.setProperty('--t-lup', off.up + 'px');
    left.style.width = Math.round(L.leftShare * 100) + '%';
    right.style.width = Math.round((1 - L.leftShare) * 100) + '%';
    turn.textContent = L.hint;
    const h = document.documentElement;
    h.classList.toggle('touch-portrait', L.portrait);
    h.classList.toggle('touch-tablet', L.cls === 'tablet');
    h.dataset.touchClass = L.cls;
  }
  layout();
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', layout);

  let ctx = 'foot';
  let shown = false;
  let stick = null; // { id, origin }
  let look = null; // { id, last }
  let held = new Set(); // stick keys held
  const pressed = new Map(); // pointerId -> { b, el }

  const hold = (k, v) => input.padHold(k, v);
  const act = (b, down) => {
    const a = b.action;
    // cinematics.js counts the Space it sees (a real key event) for hold-to-skip; padHold alone never reaches it
    if (ctx === 'cutscene') sendKey(down ? 'keydown' : 'keyup', a, 'pad');
    else if (a === '@fire') input.mouse.down = down;
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
    // the left buttons keep clear of the minimap (leftOffset, set in layout())
    el.style[side] = side === 'left' ? `calc(${spot[0]}px + var(--t-lright, 0px))` : spot[0] + 'px';
    el.style.bottom = side === 'left' ? `calc(${spot[1]}px + var(--t-lup, 0px))` : spot[1] + 'px';
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
    for (const { b, spot, side } of touchPlacement(ctx)) addButton(b, spot, side);
    const more = touchMore(ctx);
    if (more.length) {
      const panel = document.createElement('div');
      panel.className = 't-panel';
      const toggle = document.createElement('div');
      toggle.className = 't-btn t-more';
      toggle.textContent = 'Meer';
      toggle.addEventListener('pointerdown', (e) => { e.preventDefault(); panel.classList.toggle('open'); });
      for (const m of more) {
        const el = document.createElement('div');
        el.className = 't-btn';
        el.textContent = m.label;
        // a tap is a short press; the panel closes after it
        el.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          el.classList.add('on');
          act(m, true);
          setTimeout(() => { act(m, false); el.classList.remove('on'); panel.classList.remove('open'); }, 90);
        });
        panel.appendChild(el);
      }
      btnHost.appendChild(toggle);
      btnHost.appendChild(panel);
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
    const next = stickless(ctx) ? new Set() : stickKeys(steer ? [v[0], 0] : v, held);
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

  // a cutscene (cinematics.js) owns the screen: the buttons give way to one Overslaan
  const cineActive = () => { const c = document.getElementById('cine'); return !!c && c.classList.contains('active'); };

  // follows the game: shown while playing, rebuilt when the situation changes
  setInterval(() => {
    const active = touchUiActive({ started: document.body.classList.contains('game-started'), menuOpen: hooks.menuOpen ? hooks.menuOpen() : false });
    const nctx = active ? touchContext(world, { started: true, menuOpen: false, shiftMode: getSettings().shiftMode, cine: cineActive() }) : 'menu';
    if (active !== shown) {
      shown = active;
      document.documentElement.classList.toggle('touch-play', active);
      input.padLook = active;
      releaseAll();
      if (active) { ctx = nctx; build(); }
      document.documentElement.dataset.touchCtx = ctx; refreshGlyphs();
    } else if (active && nctx !== ctx) {
      releaseAll();
      ctx = nctx;
      build();
      document.documentElement.dataset.touchCtx = ctx; refreshGlyphs();
    }
  }, 200);
  window.addEventListener('blur', releaseAll);
  return true;
}
