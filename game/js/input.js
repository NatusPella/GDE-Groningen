import { blurForGameKey } from './spacegate.js';
import { keyTranslation } from './controls.js';
import { onSettingsChange } from './settings.js';
import { probe } from './hitchprobe.js';

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

export class Input {
  constructor(target = window) {
    this.keys = new Set();
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
    onSettingsChange((st, key) => { if (!key || key === 'keyBinds') this._remap = keyTranslation(st.keyBinds); });

    // capture, and registered before every other key listener: a rebound key
    // is swallowed here and sent on as the key it stands in for
    window.addEventListener('keydown', (e) => this._translate(e), true);
    window.addEventListener('keyup', (e) => this._translate(e), true);

    target.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      // een tekstveld (kamercode, naam, zoekveld) krijgt alle toetsen, ook WASD, spatie en pijlen: geen speltoets, geen preventDefault
      if (isTextField(e.target) && e.__gde !== 'pad') return;
      if (e.__gde === 'pad') {
        if (!this.padKeys.has(k) && !this.keys.has(k)) this._justPressed.add(k);
        this.padKeys.add(k);
        if (k === ' ' || k === 'tab' || k.startsWith('arrow')) e.preventDefault();
        return;
      }
      if (k !== 'escape') this.tryLock();
      if (!this.keys.has(k) && !this.padKeys.has(k)) this._justPressed.add(k);
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
      if (!this.mouse.locked) this.mouse.down = false;
    });
    window.addEventListener('mousedown', (e) => {
      // the click that captures the mouse for looking around shouldn't also fire
      const onUi = e.target && e.target.closest && e.target.closest('button, input, select, a, #pause-menu, #start-screen, .phone, [role="dialog"]');
      if (e.button === 1 && !onUi) e.preventDefault(); // no autoscroll: middle button looks back
      if (!onUi && this.tryLock()) return;
      if (e.button === 0) this.mouse.down = true;
      if (e.button === 1) this.mouse.middleDown = true;
      if (e.button === 2) this.mouse.rightDown = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 1) this.mouse.middleDown = false;
      if (e.button === 2) this.mouse.rightDown = false;
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
    if (e.metaKey || e.ctrlKey && raw !== 'control' || e.altKey) return;
    let canon;
    if (e.type === 'keyup' && e.code && this._remapByCode.has(e.code)) {
      canon = this._remapByCode.get(e.code);
      this._remapByCode.delete(e.code);
    } else {
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

  // Controller (gamepad.js): hold or release a key without a DOM event.
  padHold(k, on) {
    if (on) {
      if (!this.padKeys.has(k) && !this.keys.has(k)) this._justPressed.add(k);
      this.padKeys.add(k);
    } else this.padKeys.delete(k);
  }

  // Captures the mouse for looking around; needs a user gesture (click or
  // key). Embedded browsers (e.g. an app's preview pane) refuse pointer
  // lock, so then plain cursor movement over the game steers instead.
  tryLock() {
    const canvas = document.getElementById('game3d');
    if (this.lookFallback || this.mouse.locked || !this.canLock || !this.canLock() || !canvas || !canvas.requestPointerLock) return false;
    try {
      const req = canvas.requestPointerLock();
      if (req && req.catch) req.catch(() => { this.lookFallback = true; });
    } catch (err) {
      this.lookFallback = true;
    }
    return true;
  }

  // true while mouse motion should steer the camera: pointer captured, or the
  // uncaptured fallback while playing (no menu open)
  lookActive() {
    return this.mouse.locked || ((!!this.lookFallback || this.padLook) && !!this.canLock && this.canLock());
  }

  // zolang een tekstveld focus heeft, staat de spelbesturing stil (ook een controller of een toets die al ingedrukt was)
  get typing() { return typeof document !== 'undefined' && isTextField(document.activeElement); }
  isDown(k) { return !this.typing && (this.keys.has(k) || this.padKeys.has(k)); }
  wasPressed(k) { return !this.typing && this._justPressed.has(k); }
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
    this._justPressed.clear();
    this.mouse.wheel = 0;
    this.mouse.dx = 0;
    this.mouse.dy = 0;
  }

  axis() {
    if (this.typing) return [0, 0];
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
