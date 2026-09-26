// With Shift held e.key is '!' etc., so digits are also tracked via e.code.
function digitFromCode(code) {
  const m = /^(?:Digit|Numpad)([0-9])$/.exec(code || '');
  return m ? m[1] : null;
}

export class Input {
  constructor(target = window) {
    this.keys = new Set();
    // dx/dy: relative mouse motion this frame while the pointer is locked
    this.mouse = { x: 0, y: 0, dx: 0, dy: 0, locked: false, down: false, rightDown: false, middleDown: false, wheel: 0 };
    this._justPressed = new Set();

    target.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k !== 'escape') this.tryLock();
      if (!this.keys.has(k)) this._justPressed.add(k);
      this.keys.add(k);
      const digit = digitFromCode(e.code);
      if (digit && digit !== k) {
        if (!this.keys.has(digit)) this._justPressed.add(digit);
        this.keys.add(digit);
      }
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        e.preventDefault();
      }
    });
    target.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
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
      this.mouse.wheel += e.deltaY;
      e.preventDefault();
    }, { passive: false });
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
    return this.mouse.locked || (!!this.lookFallback && !!this.canLock && this.canLock());
  }

  isDown(k) { return this.keys.has(k); }
  wasPressed(k) { return this._justPressed.has(k); }
  // swallow a key press so later handlers this frame don't act on it too
  consume(k) { this._justPressed.delete(k); }

  reset() {
    this.keys.clear();
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
    let x = 0, y = 0;
    if (this.isDown('a') || this.isDown('arrowleft')) x -= 1;
    if (this.isDown('d') || this.isDown('arrowright')) x += 1;
    if (this.isDown('w') || this.isDown('arrowup')) y -= 1;
    if (this.isDown('s') || this.isDown('arrowdown')) y += 1;
    return [x, y];
  }
}
