// tilt: 0 = classic straight-down GTA1/2-style view, 1 = fully tilted
// "modern" angled view. Purely a rendering concern - world-space gameplay
// (collision, road-following, spawning) never reads this.
const TILT_Y_MIN = 0.58;

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = 16; // pixels per meter
    this.targetZoom = 16;
    this.w = 800;
    this.h = 600;
    this.tilt = 0;
    this.tiltTarget = 0;
    this.tiltYFactor = 1;
  }

  resize(w, h) { this.w = w; this.h = h; }

  follow(x, y, t = 0.12) {
    this.x += (x - this.x) * t;
    this.y += (y - this.y) * t;
  }

  update(dt) {
    this.zoom += (this.targetZoom - this.zoom) * Math.min(1, dt * 4);
    this.tilt += (this.tiltTarget - this.tilt) * Math.min(1, dt * 3);
    this.tiltYFactor = 1 - this.tilt * (1 - TILT_Y_MIN);
  }

  worldToScreen(x, y) {
    return [(x - this.x) * this.zoom + this.w / 2, (y - this.y) * this.zoom * this.tiltYFactor + this.h / 2];
  }

  screenToWorld(sx, sy) {
    return [(sx - this.w / 2) / this.zoom + this.x, (sy - this.h / 2) / (this.zoom * this.tiltYFactor) + this.y];
  }

  // the Y-squish from tilt means the view actually reaches further in world
  // Y than a naive w/h/zoom box would say - widen the culling box so tilted
  // mode doesn't pop buildings/roads in right at the edge of the screen
  viewBounds(margin = 0) {
    const halfW = this.w / 2 / this.zoom + margin;
    const halfH = this.h / 2 / (this.zoom * this.tiltYFactor) + margin;
    return [this.x - halfW, this.y - halfH, this.x + halfW, this.y + halfH];
  }
}
