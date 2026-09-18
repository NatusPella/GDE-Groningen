const PADDING = 0.94;
const OVERLAY_Z = 15;

const ROAD_COLORS = {
  major: '#e8c93a',
  normal: '#c7c7c2',
  minor: '#8f9095',
  cycle: '#d9823f',
  foot: '#6d6f66',
};

const ROAD_WIDTH_PX = {
  major: 2.4,
  normal: 1.5,
  minor: 1.0,
  cycle: 1.0,
  foot: 0.6,
};

const LANDMARK_COLORS = {
  tower: '#e8c93a',
  church: '#c9b1e6',
  square: '#f2f2f2',
  modern: '#3fd0ff',
  museum: '#ff9f4a',
  station: '#ff5c5c',
  garden: '#8fd17f',
  university: '#7fa8ff',
  historic: '#d1a15a',
  park: '#5a9c4a',
  mall: '#ff6fae',
  stadium: '#4ad1a0',
};

let state = null;
let stylesInjected = false;

function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .mapview-overlay {
      position: fixed;
      inset: 4vh 4vw;
      display: none;
      flex-direction: column;
      background: rgba(10, 12, 9, 0.95);
      border: 2px solid #e8c93a;
      border-radius: 8px;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
      z-index: ${OVERLAY_Z};
      pointer-events: none;
      font-family: 'Arial Narrow', Arial, sans-serif;
      color: #f2f2f2;
    }
    .mapview-canvas { pointer-events: auto; cursor: default; }
    .mapview-tooltip {
      position: absolute;
      pointer-events: none;
      background: rgba(20, 22, 18, 0.92);
      border: 1px solid rgba(232, 201, 58, 0.6);
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 13px;
      color: #f2f2f2;
      transform: translate(10px, -50%);
      white-space: nowrap;
      display: none;
    }
    .mapview-overlay.open { display: flex; }
    .mapview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 18px;
      letter-spacing: 1px;
      font-weight: bold;
      color: #e8c93a;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
      border-bottom: 1px solid rgba(232, 201, 58, 0.35);
    }
    .mapview-hint {
      font-weight: normal;
      color: #cfcfcf;
      font-size: 13px;
    }
    .mapview-canvas {
      flex: 1;
      width: 100%;
      min-height: 0;
      display: block;
    }
  `;
  document.head.appendChild(style);
}

function px(n) {
  return n / state.scale;
}

function fillPoly(ctx, pts) {
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

function sizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = state.canvas.getBoundingClientRect();
  state.dpr = dpr;
  state.canvas.width = Math.max(1, Math.round(rect.width * dpr));
  state.canvas.height = Math.max(1, Math.round(rect.height * dpr));
}

function computeTransform(world) {
  const [minx, miny, maxx, maxy] = world.map.meta.bounds;
  const w = Math.max(1, maxx - minx), h = Math.max(1, maxy - miny);
  const cw = state.canvas.width / state.dpr, ch = state.canvas.height / state.dpr;
  state.scale = Math.min(cw / w, ch / h) * PADDING;
  state.ox = cw / 2 - state.scale * (minx + maxx) / 2;
  state.oy = ch / 2 - state.scale * (miny + maxy) / 2;
}

function applyWorldTransform(ctx) {
  ctx.setTransform(
    state.scale * state.dpr, 0, 0, state.scale * state.dpr,
    state.ox * state.dpr, state.oy * state.dpr
  );
}

function drawRoadsSimple(ctx, roads) {
  for (const r of roads) {
    if (r.pts.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(r.pts[0][0], r.pts[0][1]);
    for (let i = 1; i < r.pts.length; i++) ctx.lineTo(r.pts[i][0], r.pts[i][1]);
    ctx.strokeStyle = ROAD_COLORS[r.cat] || ROAD_COLORS.normal;
    ctx.lineWidth = px(ROAD_WIDTH_PX[r.cat] || ROAD_WIDTH_PX.normal);
    ctx.stroke();
  }
}

// Every named wijk gets a small, dim, clickable dot too (not just the 14
// hand-picked landmarks) - meta.neighbourhoodPoints already has exactly one
// entry per named wijk (it's what the HUD's "which wijk am I in" readout
// uses), so this is a free way to guarantee full teleport coverage without
// needing any new data.
function drawWijkPoints(ctx, points) {
  const r = px(2.4);
  for (const p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200, 200, 190, 0.55)';
    ctx.fill();
    ctx.lineWidth = px(1);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.stroke();
  }
}

// Combined list of everything clickable-to-teleport-to on the map.
function buildTeleportTargets(world) {
  const targets = [];
  for (const l of world.map.meta.landmarks || []) {
    targets.push({ x: l.x, y: l.y, name: l.name, kind: 'landmark' });
  }
  for (const p of world.map.meta.neighbourhoodPoints || []) {
    targets.push({ x: p.x, y: p.y, name: p.name, kind: 'wijk' });
  }
  return targets;
}

function drawLandmarks(ctx, landmarks) {
  const r = px(4);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = px(12) + 'px "Arial Narrow", Arial, sans-serif';
  for (const l of landmarks) {
    ctx.beginPath();
    ctx.arc(l.x, l.y, r, 0, Math.PI * 2);
    ctx.fillStyle = LANDMARK_COLORS[l.kind] || '#f2f2f2';
    ctx.fill();
    ctx.lineWidth = px(1.4);
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.stroke();

    ctx.lineWidth = px(2.5);
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.fillStyle = '#f2f2f2';
    ctx.strokeText(l.name, l.x + r * 1.6, l.y);
    ctx.fillText(l.name, l.x + r * 1.6, l.y);
  }
}

function buildStaticLayer(world) {
  if (!state.staticCanvas) state.staticCanvas = document.createElement('canvas');
  const sc = state.staticCanvas;
  sc.width = state.canvas.width;
  sc.height = state.canvas.height;
  const sctx = sc.getContext('2d');

  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.fillStyle = '#1c2018';
  sctx.fillRect(0, 0, sc.width, sc.height);

  const prevCtx = state.ctx;
  state.ctx = sctx;
  applyWorldTransform(sctx);

  const [minx, miny, maxx, maxy] = world.map.meta.bounds;
  const view = world.map.queryView(minx, miny, maxx, maxy);

  sctx.fillStyle = '#3f6b3a';
  for (const g of view.green) fillPoly(sctx, g.pts);

  sctx.fillStyle = '#2c5a68';
  for (const w of view.water) fillPoly(sctx, w.pts);

  sctx.fillStyle = 'rgba(184, 179, 168, 0.85)';
  for (const b of view.buildings) fillPoly(sctx, b.pts);

  drawRoadsSimple(sctx, view.roads);
  drawWijkPoints(sctx, world.map.meta.neighbourhoodPoints || []);
  drawLandmarks(sctx, world.map.meta.landmarks || []);

  state.ctx = prevCtx;
  state.targets = buildTeleportTargets(world);
}

function drawMissionMarker(ctx, world) {
  const m = world.mission;
  if (!m || !m.marker) return;
  const pulse = 1 + Math.sin(world.time * 4) * 0.3;
  ctx.beginPath();
  ctx.arc(m.marker.x, m.marker.y, px(7) * pulse, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = px(2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(m.marker.x, m.marker.y, px(3), 0, Math.PI * 2);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
}

function drawPlayerMarker(ctx, world) {
  const p = world.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  const s = px(9);
  ctx.beginPath();
  ctx.moveTo(s, 0);
  ctx.lineTo(-s * 0.7, s * 0.65);
  ctx.lineTo(-s * 0.7, -s * 0.65);
  ctx.closePath();
  ctx.fillStyle = '#ff3b3b';
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = px(1.5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

const HOVER_PX = 14;
function findNearestTarget(offsetX, offsetY) {
  let best = null, bestD2 = HOVER_PX * HOVER_PX;
  for (const t of state.targets || []) {
    const sx = t.x * state.scale + state.ox, sy = t.y * state.scale + state.oy;
    const d2 = (sx - offsetX) ** 2 + (sy - offsetY) ** 2;
    if (d2 < bestD2) { bestD2 = d2; best = t; }
  }
  return best;
}

function teleportTo(world, target) {
  const spot = world.map.nearestRoadPoint(target.x, target.y, 400) || { x: target.x, y: target.y };
  const [sx, sy] = world.map.escapeBuilding(spot.x, spot.y);
  if (world.player.inVehicle) {
    world.player.inVehicle.x = sx;
    world.player.inVehicle.y = sy;
  }
  world.player.x = sx;
  world.player.y = sy;
  world.addMessage(`Geteleporteerd naar ${target.name}`, 3);
  closeMap();
}

function openMap(world) {
  state.open = true;
  state.overlay.classList.add('open');
  sizeCanvas();
  computeTransform(world);
  buildStaticLayer(world);
}

function closeMap() {
  state.open = false;
  state.overlay.classList.remove('open');
  state.tooltip.style.display = 'none';
}

function render(world) {
  const { ctx, canvas, staticCanvas } = state;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(staticCanvas, 0, 0);
  applyWorldTransform(ctx);
  drawMissionMarker(ctx, world);
  drawPlayerMarker(ctx, world);
}

export function initMapView(world) {
  if (state) return;
  injectStyles();

  const overlay = document.createElement('div');
  overlay.className = 'mapview-overlay';
  overlay.innerHTML =
    '<div class="mapview-header"><span>KAART VAN GRONINGEN</span>' +
    '<span class="mapview-hint">Klik een punt om te teleporteren — M sluiten</span></div>' +
    '<canvas class="mapview-canvas"></canvas>' +
    '<div class="mapview-tooltip"></div>';
  document.body.appendChild(overlay);

  state = {
    open: false,
    overlay,
    canvas: overlay.querySelector('canvas'),
    tooltip: overlay.querySelector('.mapview-tooltip'),
    staticCanvas: null,
    scale: 1,
    ox: 0,
    oy: 0,
    dpr: window.devicePixelRatio || 1,
    targets: [],
  };
  state.ctx = state.canvas.getContext('2d');

  state.canvas.addEventListener('mousemove', (e) => {
    const t = findNearestTarget(e.offsetX, e.offsetY);
    state.canvas.style.cursor = t ? 'pointer' : 'default';
    if (t) {
      state.tooltip.textContent = t.name;
      state.tooltip.style.left = e.offsetX + 'px';
      state.tooltip.style.top = e.offsetY + 'px';
      state.tooltip.style.display = 'block';
    } else {
      state.tooltip.style.display = 'none';
    }
  });
  state.canvas.addEventListener('mouseleave', () => { state.tooltip.style.display = 'none'; });
  state.canvas.addEventListener('click', (e) => {
    const t = findNearestTarget(e.offsetX, e.offsetY);
    if (t) teleportTo(world, t);
  });

  window.addEventListener('resize', () => {
    if (!state.open) return;
    sizeCanvas();
    computeTransform(world);
    buildStaticLayer(world);
  });
}

export function updateMapView(dt, world) {
  if (!state) return;
  if (world.input.wasPressed('m')) {
    if (state.open) closeMap(); else openMap(world);
  }
  if (!state.open) return;
  render(world);
}
