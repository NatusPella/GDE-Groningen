import { blurForGameKey } from './spacegate.js';
import { keyTranslation } from './controls.js';
import { onSettingsChange } from './settings.js';
import { probe } from './hitchprobe.js';
import { makeLatch, tapActions } from './holdlatch.js';

// With Shift held e.key is '!' etc., so digits are also tracked via e.code.
function digitFromCode(code) {
  const m = /^(?:Digit|Numpad)([0-9])$/.exec(code || '');
  return m ? m[1] : null;
}

// A canonical key (controls.js) as KeyboardEvent key and code, for the
// events that stand in for a rebound key or a controller button.
const EVENT_KEYS = { ' ': [' ', 'Space'], shift: ['Shift', 'ShiftLeft'], control: ['Control', 'ControlLeft'], tab: ['Tab', 'Tab'], backspace: ['Backspace', 'Backspace'], escape: ['Escape', 'Escape'], enter: ['Enter', 'Enter'], delete: ['Delete', 'Delete'], arrowup: ['ArrowUp', 'ArrowUp'], arrowdown: ['ArrowDown', 'ArrowDown'], arrowleft: ['ArrowLeft', 'ArrowLeft'], arrowright: ['ArrowRight', 'ArrowRight'] };
export function keyEventInit(k) {
  if (EVENT_KEYS[k]) return { key: EVENT_KEYS[k][0], code: EVENT_KEYS[k][1] };
  if (/^[a-z]$/.test(k)) return { key: k, code: 'Key' + k.toUpperCase() };
  if (/^[0-9]$/.test(k)) return { key: k, code: 'Digit' + k };
  return { key: k, code: '' };
}

// Sends a stand-in key event to the focused element, like a real key would.
// `from` marks where it came from ('remap' or 'pad') so it isn't translated again.
export function sendKey(type, k, from, extra = {}) {
  const target = (typeof document !== 'undefined' && document.activeElement) || window;
  const ev = new KeyboardEvent(type, { ...keyEventInit(k), bubbles: true, cancelable: true, ...extra });
  ev.__gde = from;
  target.dispatchEvent(ev);
  return ev;
}

const isTextField = (t) => !!(t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'button'].includes(t.type)) || t.isContentEditable));

// pointer lock (tryLock): refused gestures in a row before the free-cursor fallback, how long a request counts as
// pending, and the least time between two counted refusals
const LOCK_FAILS = 3;
const LOCK_PENDING_MS = 1500;
const LOCK_FAIL_GAP_MS = 2000;

// De muis raakt kwijt (pointerlockchange): alleen dan opent het pauzemenu zelf, niet als er al een menu of een vraagscherm
// open staat dat de muis zelf losliet (afspeelvooruit, hulpaanbod): anders lag het menu er nog over (#435: Escape meerdere keren).
export function lockVerlorenOpentMenu({ gestart, menuOpen, vraagOpen }) { return !!gestart && !menuOpen && !vraagOpen; }

export class Input {
  constructor(target = window) {
    this.keys = new Set();
    this._lockFails = 0;
    this._lockAsked = null;
    this._lockFailedAt = null;
    // dx/dy: relative mouse motion this frame while the pointer is locked
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, locked: false, down: false, rightDown: false, middleDown: false, wheel: 0 };
    this._justPressed = new Set();
    // the key each physical key went down as: its keyup can report another
    // e.key (Option or Shift pressed in between), which would leave it stuck
    this._byCode = new Map();
    // held by the controller (gamepad.js): buttons and the stick's WASD;
    // axis() takes the stick's analog value instead of these
    this.padKeys = new Set();
    this.padAxis = [0, 0];
    this.padLook = false;
    // rebound keys (Instellingen > Besturing): physical key -> canonical key
    this._remap = new Map();
    this._remapByCode = new Map();
    this.captureKey = null;
    this.blocked = false; // samen spelen: de wereld loopt door achter een menu, de lokale invoer staat stil (main.js)
    this.stil = 0; // samen spelen: een gast speelt lokaal een activiteit (hengelen); zijn lichaam bij de host staat stil zolang dit > 0 (aftellend per beeld, coopgastlokaal.js)
    // tik in plaats van ingedrukt houden (holdlatch.js): rennen (Shift) en richten (rechtermuis) blijven na één tik aan; alleen te voet
    this._tik = { rennen: false, richten: false };
    this._lr = makeLatch();
    this._la = makeLatch();
    this.latchOk = null; // main.js: mag een tikstand blijven staan (te voet, geen menu of pauze)
    this._voet = true;
    onSettingsChange((st, key) => {
      if (!key || key === 'keyBinds') this._remap = keyTranslation(st.keyBinds);
      if (!key || key === 'tikStand') { this._tik = tapActions(st.tikStand); this._tikWis(); }
    });

    // capture, and registered before every other key listener: a rebound key
    // is swallowed here and sent on as the key it stands in for
    window.addEventListener('keydown', (e) => this._translate(e), true);
    window.addEventListener('keyup', (e) => this._translate(e), true);

    target.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      // een tekstveld (kamercode, naam, zoekveld) krijgt alle toetsen, ook WASD, spatie en pijlen: geen speltoets, geen preventDefault
      if (isTextField(e.target) && e.__gde !== 'pad') return;
      if (e.__gde === 'pad') {
        if (!this.padKeys.has(k) && !this.keys.has(k)) { this._justPressed.add(k); this._tikDruk(k); }
        this.padKeys.add(k);
        if (k === ' ' || k === 'tab' || k.startsWith('arrow')) e.preventDefault();
        return;
      }
      if (k !== 'escape') this.tryLock();
      if (!this.keys.has(k) && !this.padKeys.has(k)) { this._justPressed.add(k); this._tikDruk(k); }
      this.keys.add(k);
      if (e.code) this._byCode.set(e.code, k);
      const digit = digitFromCode(e.code);
      if (digit && digit !== k) {
        if (!this.keys.has(digit)) this._justPressed.add(digit);
        this.keys.add(digit);
      }
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        e.preventDefault();
      }
      // Tab switches the aim lock in play; leave it to menus otherwise
      if (k === 'tab' && this.canLock && this.canLock()) e.preventDefault();
    });
    target.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (e.__gde === 'pad') { this.padKeys.delete(k); return; }
      this.keys.delete(k);
      if (e.code && this._byCode.has(e.code)) { this.keys.delete(this._byCode.get(e.code)); this._byCode.delete(e.code); }
      // macOS sends no keyup for keys pressed while Cmd is held
      if (k === 'meta') { this.keys.clear(); this._byCode.clear(); }
      const digit = digitFromCode(e.code);
      if (digit) this.keys.delete(digit);
    });
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.reset();
    });

    // bound to window (not the #game canvas) so aiming keeps working when
    // the 2D canvas is hidden behind #game3d in the WebGL follow-cam view -
    // both canvases are always position:fixed;inset:0, so clientX/Y are
    // already canvas-local coordinates without needing a per-canvas rect
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      if (this.lookActive()) {
        this.mouse.dx += e.movementX || 0;
        this.mouse.dy += e.movementY || 0;
      }
    });
    document.addEventListener('pointerlockchange', () => {
      this.mouse.locked = !!document.pointerLockElement;
      this._lockAsked = null;
      if (this.mouse.locked) this._lockFails = 0;
      else this.mouse.down = false;
    });
    window.addEventListener('mousedown', (e) => {
      // the click that captures the mouse for looking around shouldn't also fire
      const onUi = e.target && e.target.closest && e.target.closest('button, input, select, a, #pause-menu, #start-screen, .phone, [role="dialog"]');
      if (e.button === 1 && !onUi) e.preventDefault(); // no autoscroll: middle button looks back
      if (!onUi && this.tryLock()) return;
      if (e.button === 0) this.mouse.down = true;
      if (e.button === 1) this.mouse.middleDown = true;
      if (e.button === 2) this.setAim(true);
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 1) this.mouse.middleDown = false;
      if (e.button === 2) this.setAim(false);
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('wheel', (e) => {
      if (e.ctrlKey) return;
      // the title screen's panels (what's new, about) scroll natively
      if (e.target && e.target.closest && e.target.closest('#start-screen')) return;
      this.mouse.wheel += e.deltaY;
      e.preventDefault();
    }, { passive: false });
  }

  _translate(e) {
    if (e.__gde) return;
    // a real key hands the hints back to the keyboard (gamepad.js)
    if (e.isTrusted && e.type === 'keydown') probe.input();
    if (e.isTrusted && e.type === 'keydown' && this.onRealKey) this.onRealKey();
    // a button still focused from a card or menu would take Space/Enter as a click
    if (e.type === 'keydown' && typeof document !== 'undefined' && blurForGameKey(e.key, document.activeElement, !!(this.canLock && this.canLock()))) document.activeElement.blur();
    const raw = (e.key || '').toLowerCase();
    if (e.type === 'keydown' && this.captureKey) {
      if (e.repeat) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const cb = this.captureKey;
      this.captureKey = null;
      cb(raw, e);
      return;
    }
    // a shortcut (Cmd, Alt, Ctrl) is not a game key - unless Ctrl is held as the game's own key (crouch): a rebound key
    // then still stands in for its action. The release of a key that went down translated is always translated back,
    // whatever is held by then; else that action stays stuck.
    const shortcut = e.metaKey || e.altKey || (e.ctrlKey && raw !== 'control' && !this.keys.has('control'));
    let canon;
    if (e.type === 'keyup' && e.code && this._remapByCode.has(e.code)) {
      canon = this._remapByCode.get(e.code);
      this._remapByCode.delete(e.code);
    } else {
      if (shortcut) return;
      if (!this._remap.size || !this._remap.has(raw) || isTextField(e.target)) return;
      canon = this._remap.get(raw);
      if (e.type === 'keydown' && e.code) this._remapByCode.set(e.code, canon);
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    if (canon == null) return;
    const ev = new KeyboardEvent(e.type, { ...keyEventInit(canon), repeat: e.repeat, shiftKey: e.shiftKey && canon !== 'shift', bubbles: true, cancelable: true });
    ev.__gde = 'remap';
    (e.target || window).dispatchEvent(ev);
  }

  // Tik in plaats van ingedrukt houden: een verse druk op Shift wisselt het rennen, een druk op de richtknop het richten; loslaten doet
  // niets. Buiten de te-voet-stand (voertuig, menu) en bij 'uit' blijft alles gewoon ingedrukt houden.
  _tikRennen() { return this._tik.rennen && this._voet; }
  _tikRichten() { return this._tik.richten && this._voet; }
  _tikDruk(k) { if (k === 'shift' && this._tikRennen()) this._lr.press(); }
  _tikWis() { this._lr.clear(); if (this._la.on) { this._la.clear(); this.mouse.rightDown = false; } }
  // de richtknop (muis, controller, aanraken): een tik is aan, een tweede tik uit
  setAim(down) {
    if (!this._tikRichten()) { if (this._la.on) this._la.clear(); this.mouse.rightDown = !!down; return; }
    if (down) this.mouse.rightDown = this._la.press();
  }

  // Controller (gamepad.js): hold or release a key without a DOM event.
  padHold(k, on) {
    if (on) {
      if (!this.padKeys.has(k) && !this.keys.has(k)) { this._justPressed.add(k); this._tikDruk(k); }
      this.padKeys.add(k);
    } else this.padKeys.delete(k);
  }

  // Captures the mouse for looking around; needs a user gesture (click or
  // key). Embedded browsers (e.g. an app's preview pane) refuse pointer
  // lock, so then plain cursor movement over the game steers instead - but
  // only after LOCK_FAILS refused gestures in a row (#328): one refusal is
  // normal (a request without a gesture after a long load, one right after
  // Esc released the lock, a key repeat while the first is pending) and used
  // to switch to the free cursor for the rest of the session, so with more
  // than one monitor the cursor left the window after ~160 degrees.
  // gesture=false: a request the game makes itself (the start of a game),
  // which may be refused without counting.
  tryLock(gesture = true) {
    const canvas = document.getElementById('game3d');
    if (this.lookFallback || this.mouse.locked || !this.canLock || !this.canLock() || !canvas || !canvas.requestPointerLock) return false;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // a request still pending (key repeats come every 30 ms): that one decides
    if (this._lockAsked != null && now - this._lockAsked < LOCK_PENDING_MS) return true;
    this._lockAsked = now;
    const failed = () => {
      this._lockAsked = null;
      if (!gesture || this.mouse.locked) return;
      if (now - (this._lockFailedAt ?? -Infinity) < LOCK_FAIL_GAP_MS) return; // one refusal per gap
      this._lockFailedAt = now;
      if (++this._lockFails >= LOCK_FAILS) this.lookFallback = true;
    };
    try {
      const req = canvas.requestPointerLock();
      if (req && req.catch) req.catch(failed);
    } catch (err) {
      failed();
    }
    return true;
  }

  // Het menu, de kaart of de winkel gaat dicht (main.js geeft elk beeld de stand door): meteen de muis weer vragen (#435).
  // Sluit je met een klik of een toets (niet Escape, die telt voor de browser niet als gebaar), dan lukt dat zonder dat je
  // eerst nog eens in het spel moet klikken; een weigering telt niet mee (gesture=false).
  menuStand(open) {
    const was = this._menuOpen;
    this._menuOpen = !!open;
    return !!was && !open && this.tryLock(false);
  }

  // true while mouse motion should steer the camera: pointer captured, or the
  // uncaptured fallback while playing (no menu open)
  lookActive() {
    return this.mouse.locked || ((!!this.lookFallback || this.padLook) && !!this.canLock && this.canLock());
  }

  // zolang een tekstveld focus heeft, staat de spelbesturing stil (ook een controller of een toets die al ingedrukt was)
  get typing() { return typeof document !== 'undefined' && isTextField(document.activeElement); }
  isDown(k) {
    if (this.stil > 0 && (k === ' ' || k === 'shift' || k === 'control')) return false;
    if (this.typing || this.blocked) return false;
    if (k === 'shift' && this._tikRennen()) return this._lr.on; // tikstand: het rennen blijft aan tot de volgende tik
    return this.keys.has(k) || this.padKeys.has(k);
  }
  wasPressed(k) { return !this.typing && !this.blocked && this._justPressed.has(k); }
  // swallow a key press so later handlers this frame don't act on it too
  consume(k) { this._justPressed.delete(k); }

  reset() {
    this.keys.clear();
    this._byCode.clear();
    this._remapByCode.clear();
    this.padKeys.clear();
    this._justPressed.clear();
    this.mouse.down = false;
    this.mouse.middleDown = false;
    this.mouse.rightDown = false;
    this.mouse.wheel = 0;
    this.mouse.dx = 0;
    this.mouse.dy = 0;
  }

  endFrame() {
    if (this.stil > 0) this.stil--;
    // real seconds since the last frame, at most one slow frame (a tab switch is not a long standstill)
    const endNow = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const endDt = this._endAt != null ? Math.min(0.05, Math.max(0, (endNow - this._endAt) / 1000)) : 1 / 60;
    this._endAt = endNow;
    if (this._lr.on || this._la.on || this._tik.rennen || this._tik.richten) {
      this._voet = this.latchOk ? !!this.latchOk() : true;
      const [ax, ay] = this.axis();
      this._lr.step({ allowed: this._voet, moving: !!(ax || ay), idleReleases: true, dt: endDt });
      if (this._la.on && !this._voet) { this._la.clear(); this.mouse.rightDown = false; }
    } else this._voet = true;
    this._justPressed.clear();
    this.mouse.wheel = 0;
    this.mouse.dx = 0;
    this.mouse.dy = 0;
  }

  axis() {
    if (this.typing || this.blocked || this.stil > 0) return [0, 0];
    // per axis: a pad stick (or the touch steering, sideways only) wins on its own axis; the other axis still
    // follows the keys, so touch steering plus the gas button (W) drives (#227)
    let x = this.padAxis[0], y = this.padAxis[1];
    if (!x) {
      if (this.isDown('a') || this.isDown('arrowleft')) x -= 1;
      if (this.isDown('d') || this.isDown('arrowright')) x += 1;
    }
    if (!y) {
      if (this.isDown('w') || this.isDown('arrowup')) y -= 1;
      if (this.isDown('s') || this.isDown('arrowdown')) y += 1;
    }
    return [x, y];
  }
}
