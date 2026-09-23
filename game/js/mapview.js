import { drawMapIcon, drawRoute, getHeroCar, forEachPoliceUnit, declutter } from './hud_panel.js';
import { getPickupsForRender } from './pickups.js';
import { getHorecaForRender } from './horeca.js';

const PADDING = 0.94;
const ICON = 1.25;
const FONT = '"Bebas Neue", "Arial Narrow", Arial, sans-serif';
const OVERLAY_Z = 15;

const ROAD_COLORS = {
  major: '#f0ede4',
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
      background: radial-gradient(ellipse at center, #17301f 0%, #0c140e 100%);
      border: 2px solid #1e9e56;
      border-radius: 8px;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
      z-index: ${OVERLAY_Z};
      pointer-events: none;
      font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif;
      color: #f2f2f2;
      overflow: hidden;
    }
    .mapview-overlay.open { display: flex; }
    .mapview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 18px;
      letter-spacing: 1px;
      font-weight: bold;
      color: #3fc97a;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
      border-bottom: 1px solid rgba(63, 201, 122, 0.35);
    }
    .mapview-hint {
      font-weight: normal;
      color: rgba(240, 237, 228, 0.75);
      font-size: 13px;
    }
    .mapview-body {
      position: relative;
      flex: 1;
      min-height: 0;
      display: flex;
    }
    .mapview-canvas {
      flex: 1;
      min-width: 0;
      height: 100%;
      display: block;
      pointer-events: auto;
      cursor: default;
    }
    .mapview-tooltip {
      position: absolute;
      pointer-events: none;
      background: rgba(12, 20, 14, 0.92);
      border: 1px solid rgba(63, 201, 122, 0.6);
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 13px;
      color: #f2f2f2;
      transform: translate(10px, -50%);
      white-space: nowrap;
      display: none;
    }
    .mapview-legend {
      flex: 0 0 auto;
      width: 170px;
      margin: 12px 12px 12px 0;
      padding: 10px 12px;
      align-self: flex-start;
      max-height: calc(100% - 24px);
      overflow-y: auto;
      background: rgba(12, 20, 14, 0.8);
      border: 1px solid rgba(63, 201, 122, 0.35);
      border-radius: 4px;
      pointer-events: auto;
    }
    .mapview-legend h3 {
      margin: 0 0 6px;
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 1px;
      color: #3fc97a;
    }
    .mapview-legend ul { list-style: none; margin: 0; padding: 0; }
    .mapview-legend li {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      letter-spacing: 0.3px;
      line-height: 1;
      padding: 3px 0;
    }
    .mapview-legend canvas { width: 24px; height: 24px; flex: 0 0 24px; }
    .mapview-legend .note { color: rgba(240, 237, 228, 0.55); font-size: 12px; }
    @media (max-width: 700px) { .mapview-legend { display: none; } }
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

function toScreen(x, y) {
  return [x * state.scale + state.ox, y * state.scale + state.oy];
}

function drawLabel(ctx, text, x, y, color, align) {
  ctx.textAlign = align;
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(12, 20, 14, 0.85)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawWijkLabels(ctx, points) {
  ctx.font = '12px ' + FONT;
  ctx.textBaseline = 'middle';
  for (const p of points) {
    const [sx, sy] = toScreen(p.x, p.y);
    drawLabel(ctx, p.name.toUpperCase(), sx, sy, 'rgba(240, 237, 228, 0.45)', 'center');
  }
}

function drawLandmarks(ctx, landmarks) {
  ctx.font = '14px ' + FONT;
  ctx.textBaseline = 'middle';
  for (const l of landmarks) {
    const [sx, sy] = toScreen(l.x, l.y);
    drawMapIcon(ctx, 'landmark', sx, sy, ICON);
    drawLabel(ctx, l.name, sx + 9, sy + 1, '#f5f0e6', 'left');
  }
}

function buildStaticLayer(world) {
  if (!state.staticCanvas) state.staticCanvas = document.createElement('canvas');
  const sc = state.staticCanvas;
  sc.width = state.canvas.width;
  sc.height = state.canvas.height;
  const sctx = sc.getContext('2d');

  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, sc.width, sc.height);

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
  sctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  drawWijkLabels(sctx, world.map.meta.neighbourhoodPoints || []);
  for (const h of declutter(getHorecaForRender(), 14 / state.scale)) {
    const [sx, sy] = toScreen(h.x, h.y);
    drawMapIcon(sctx, 'horeca', sx, sy, ICON);
  }
  for (const f of world.flitspaalen || []) {
    const [sx, sy] = toScreen(f.x, f.y);
    drawMapIcon(sctx, 'flitspaal', sx, sy, ICON);
  }
  drawLandmarks(sctx, world.map.meta.landmarks || []);

  state.targets = buildTeleportTargets(world);
}

function drawDynamicMarkers(ctx, world) {
  const t = performance.now() / 1000;
  const icon = (kind, x, y, opts) => {
    const [sx, sy] = toScreen(x, y);
    drawMapIcon(ctx, kind, sx, sy, ICON, { t, ...opts });
  };

  const p = getPickupsForRender();
  for (const m of p.money) icon('money', m.x, m.y);
  for (const w of p.weapons) icon('weapon', w.x, w.y);
  for (const g of p.garages) icon('garage', g.x, g.y);
  if (p.health) icon('health', p.health.x, p.health.y);
  if (p.armor) icon('armor', p.armor.x, p.armor.y);

  const m = world.mission;
  if (m && m.marker && m.phase !== 'cooldown') {
    const wps = m.phase === 'active' ? m.remainingWaypoints || [] : [];
    if (wps.length) {
      drawRoute(ctx, [m.marker, ...wps].map((w) => toScreen(w.x, w.y)), ICON);
      for (const w of wps) icon('waypoint', w.x, w.y);
    }
    icon(m.phase === 'active' ? 'missionActive' : 'missionIdle', m.marker.x, m.marker.y);
  }

  const hero = getHeroCar(world);
  if (hero && world.player.inVehicle !== hero) icon('car', hero.x, hero.y);

  const c = world.companion;
  if (c && c.state !== 'dead' && !c.inVehicle) icon('companion', c.x, c.y);

  if (world.wanted > 0) forEachPoliceUnit(world, (x, y) => icon('police', x, y));

  icon('player', world.player.x, world.player.y, { angle: world.player.angle });
}

const LEGEND = [
  ['player', 'Jij'],
  ['companion', 'Maat'],
  ['car', 'Jouw auto'],
  ['missionIdle', 'Missie starten'],
  ['missionActive', 'Missiedoel'],
  ['waypoint', 'Checkpoints'],
  ['money', 'Geld'],
  ['weapon', 'Wapen'],
  ['health', 'Gezondheid'],
  ['armor', 'Kogelwerend vest'],
  ['garage', 'Garage'],
  ['horeca', 'Horeca'],
  ['flitspaal', 'Flitspaal'],
  ['landmark', 'Bezienswaardigheid'],
  ['police', 'Politie', 'alleen met sterren'],
];

function buildLegend(root) {
  const dpr = window.devicePixelRatio || 1;
  const list = document.createElement('ul');
  for (const [kind, label, note] of LEGEND) {
    const li = document.createElement('li');
    const cv = document.createElement('canvas');
    cv.width = cv.height = 24 * dpr;
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (kind === 'waypoint') {
      drawRoute(ctx, [[3, 18], [21, 6]], ICON);
      drawMapIcon(ctx, 'waypoint', 5, 17, ICON);
      drawMapIcon(ctx, 'waypoint', 19, 7, ICON);
    } else {
      drawMapIcon(ctx, kind, 12, 12, ICON, { t: 0 });
    }
    const span = document.createElement('span');
    span.textContent = label;
    if (kind === 'companion') state.legendMaat = span;
    li.append(cv, span);
    if (note) {
      const n = document.createElement('span');
      n.className = 'note';
      n.textContent = note;
      span.append(document.createElement('br'), n);
    }
    list.appendChild(li);
  }
  root.innerHTML = '<h3>LEGENDA</h3>';
  root.appendChild(list);
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
  const vehicle = world.player.inVehicle;
  if (vehicle && vehicle.isBoat) {
    world.addMessage('Met een boot kun je niet teleporteren', 2.5);
    return;
  }
  const spot = world.map.nearestRoadPoint(target.x, target.y, 400) || { x: target.x, y: target.y };
  const [sx, sy] = world.map.escapeBuilding(spot.x, spot.y);
  if (vehicle) {
    vehicle.x = sx;
    vehicle.y = sy;
    vehicle.speed = 0;
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
  const c = world.companion;
  if (state.legendMaat) state.legendMaat.textContent = c ? `Maat (${c.character === 'tammo' ? 'Tammo' : 'Anita'})` : 'Maat';
}

function closeMap() {
  state.open = false;
  state.overlay.classList.remove('open');
  state.tooltip.style.display = 'none';
}

function render(world) {
  const { ctx, staticCanvas } = state;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
  ctx.drawImage(staticCanvas, 0, 0);
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  drawDynamicMarkers(ctx, world);
}

export function initMapView(world) {
  if (state) return;
  injectStyles();

  const overlay = document.createElement('div');
  overlay.className = 'mapview-overlay';
  overlay.innerHTML =
    '<div class="mapview-header"><span>KAART VAN GRONINGEN</span>' +
    '<span class="mapview-hint">Klik een punt om te teleporteren — M sluiten</span></div>' +
    '<div class="mapview-body"><canvas class="mapview-canvas"></canvas>' +
    '<div class="mapview-tooltip"></div><aside class="mapview-legend"></aside></div>';
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
    legendMaat: null,
  };
  state.ctx = state.canvas.getContext('2d');
  buildLegend(overlay.querySelector('.mapview-legend'));

  // Input listens on window; a map click must not also register as firing.
  overlay.addEventListener('mousedown', (e) => e.stopPropagation());

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

export function isMapOpen() {
  return !!(state && state.open);
}

export function updateMapView(dt, world) {
  if (!state) return;
  if (world.input.wasPressed('m')) {
    if (state.open) closeMap(); else openMap(world);
  }
  if (!state.open) return;
  render(world);
}
