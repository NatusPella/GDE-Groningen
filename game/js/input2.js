export class Input {
  constructor(target = window) {
    this.keys = new Set();
    this.pressed = new Set(); // keys down this frame only
    this.mouse = { x: 0, y: 0, down: false, rightDown: false, wheel: 0 };
    this._justPressed = new Set();

    target.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (!this.keys.has(k)) this._justPressed.add(k);
      this.keys.add(k);
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        e.preventDefault();
      }
    });
    target.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); });

    // bound to window (not the #game canvas) so aiming keeps working when
    // the 2D canvas is hidden behind #game3d in the WebGL follow-cam view -
    // both canvases are always position:fixed;inset:0, so clientX/Y are
    // already canvas-local coordinates without needing a per-canvas rect
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouse.down = true;
      if (e.button === 2) this.mouse.rightDown = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 2) this.mouse.rightDown = false;
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('wheel', (e) => { this.mouse.wheel += e.deltaY; e.preventDefault(); }, { passive: false });
  }

  isDown(k) { return this.keys.has(k); }
  wasPressed(k) { return this._justPressed.has(k); }

  endFrame() {
    this._justPressed.clear();
    this.mouse.wheel = 0;
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
