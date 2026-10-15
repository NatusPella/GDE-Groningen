// Floating origin (docs/PROVINCIE-PLAN.md 2.3). The simulation keeps world
// metres in doubles; what goes to the GPU is relative to a render origin that
// jumps with the camera, so float32 never sees a 40 km coordinate (it has
// ~4 mm of resolution there; modelView is float32 on the GPU).
//
//   toRender(x, y)        world -> render (x - ox, y - oy)
//   fromRender(x, y)      render -> world
//   rebaseIfNeeded(x, y)  camera further than `threshold` from the origin:
//                         the origin moves to the camera and listeners run
//   uRenderOrigin         { value: THREE.Vector2-like } for shaders that read
//                         world positions (ground, water, wind, shadows, night light)
//
// F0: the origin is (0, 0) and stays there (threshold Infinity), so every
// place that calls toRender gets the identity; F1 turns the threshold on once
// the builders emit tile-local geometry. attachRoot(group) keeps a scene
// root at -origin so meshes that are still built in world coordinates move
// with it.
export const REBASE_THRESHOLD_M = 2000;

export class FloatingOrigin {
  constructor({ threshold = Infinity } = {}) {
    this.x = 0;
    this.y = 0;
    this.threshold = threshold;
    this.rebases = 0;
    this.listeners = [];
    this.uRenderOrigin = { value: { x: 0, y: 0, set(a, b) { this.x = a; this.y = b; } } };
    this.roots = [];
  }
  toRender(x, y) { return [x - this.x, y - this.y]; }
  fromRender(x, y) { return [x + this.x, y + this.y]; }
  // three.js order: world (x, y, z) -> render position with y up, z = world y
  toRenderXYZ(x, h, y) { return [x - this.x, h, y - this.y]; }
  attachRoot(group) { this.roots.push(group); this._place(group); }
  onRebase(fn) { this.listeners.push(fn); }
  _place(group) { group.position.set(-this.x, 0, -this.y); }
  setOrigin(x, y) {
    const dx = x - this.x, dy = y - this.y;
    if (!dx && !dy) return null;
    this.x = x; this.y = y;
    this.rebases++;
    this.uRenderOrigin.value.set(x, y);
    for (const g of this.roots) this._place(g);
    for (const f of this.listeners) f(dx, dy, x, y);
    return [dx, dy];
  }
  rebaseIfNeeded(camX, camY) {
    if (Math.hypot(camX - this.x, camY - this.y) <= this.threshold) return null;
    // whole kilometres, so tile-local data keeps its cm grid under the shift
    return this.setOrigin(Math.round(camX / 1000) * 1000, Math.round(camY / 1000) * 1000);
  }
}

export const renderOrigin = new FloatingOrigin();
