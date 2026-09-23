import { getPickupsForRender } from './pickups.js';
import { isMuted } from './audio.js';

const MINIMAP_SIZE = 160;
const MM_SCALE = 0.5; // px per meter (css pixels)
const MM_RADIUS_M = MINIMAP_SIZE / 2 / MM_SCALE;

let els = null;

export function initHud(world) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./hud_panel.css', import.meta.url).href;
  document.head.appendChild(link);

  const root = document.getElementById('hud');

  const topLeft = document.createElement('div');
  topLeft.className = 'hud-top-left';
  topLeft.innerHTML =
    '<div class="hud-character"></div>' +
    '<div class="hud-bar"><div class="hud-bar-fill health"></div></div>' +
    '<div class="hud-bar"><div class="hud-bar-fill armor"></div></div>' +
    '<div class="hud-mute" role="status" aria-label="Geluid uit" title="Geluid uit (U)" hidden>🔇</div>';
  root.appendChild(topLeft);

  const topRight = document.createElement('div');
  topRight.className = 'hud-top-right';
  topRight.innerHTML =
    '<div class="hud-wanted"></div>' +
    '<div class="hud-money"></div>' +
    '<div class="hud-weapon"></div>';
  root.appendChild(topRight);

  const hint = document.createElement('div');
  hint.className = 'hud-hint';
  root.appendChild(hint);

  const mission = document.createElement('div');
  mission.className = 'hud-mission';
  mission.innerHTML = '<div class="hud-mission-label"></div><div class="hud-mission-progress"></div><div class="hud-mission-timer"></div>';
  root.appendChild(mission);

  const toasts = document.createElement('div');
  toasts.className = 'hud-toasts';
  toasts.setAttribute('aria-live', 'polite');
  root.appendChild(toasts);

  const location = document.createElement('div');
  location.className = 'hud-location';
  location.innerHTML = '<div class="hud-district"></div><div class="hud-street"></div>';
  root.appendChild(location);

  const mmWrap = document.createElement('div');
  mmWrap.className = 'hud-minimap-wrap';
  const mmCanvas = document.createElement('canvas');
  mmWrap.appendChild(mmCanvas);
  root.appendChild(mmWrap);

  const dpr = window.devicePixelRatio || 1;
  mmCanvas.width = MINIMAP_SIZE * dpr;
  mmCanvas.height = MINIMAP_SIZE * dpr;

  els = {
    character: topLeft.querySelector('.hud-character'),
    healthFill: topLeft.querySelector('.health'),
    armorFill: topLeft.querySelector('.armor'),
    mute: topLeft.querySelector('.hud-mute'),
    wanted: topRight.querySelector('.hud-wanted'),
    money: topRight.querySelector('.hud-money'),
    weapon: topRight.querySelector('.hud-weapon'),
    hint,
    missionLabel: mission.querySelector('.hud-mission-label'),
    missionProgress: mission.querySelector('.hud-mission-progress'),
    missionTimer: mission.querySelector('.hud-mission-timer'),
    district: location.querySelector('.hud-district'),
    street: location.querySelector('.hud-street'),
    toasts,
    mmCanvas,
    mmCtx: mmCanvas.getContext('2d'),
  };
}

export function updateHud(dt, world) {
  updateCharacter(world);
  updateBars(world);
  els.mute.hidden = !isMuted();
  updateWanted(world);
  updateMoneyWeapon(world);
  updateMission(world);
  updateToasts(world);
  updateLocation(dt, world);
  updateHint(world);
  drawMinimap(dt, world);
}

// Context-aware on-screen prompts, shown only when relevant, instead of a
// static always-visible controls list on the start screen. Each key renders
// as a little keycap chip instead of plain "[X]" bracket text.
function keycap(key) {
  return '<span class="hud-key">' + escapeHtml(key) + '</span>';
}
function hintHtml(pairs) {
  return pairs.map(([key, label]) => keycap(key) + '<span class="hud-hint-label">' + escapeHtml(label) + '</span>').join('');
}

const TUTORIAL_HINT_DURATION = 9;
function updateHint(world) {
  const player = world.player;

  if (player.inVehicle) {
    els.hint.innerHTML = hintHtml([['E', 'Uitstappen'], ['SPATIE', 'Remmen']]);
    return;
  }

  let nearestVehicleDist = Infinity;
  for (const v of world.vehicles) {
    if (v.wrecked || v.driver) continue;
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < nearestVehicleDist) nearestVehicleDist = d;
  }
  const nearCompanion = world.companion && !world.companion.inVehicle
    && Math.hypot(world.companion.x - player.x, world.companion.y - player.y) < 1.8;
  if (nearCompanion) {
    els.hint.innerHTML = hintHtml([['E', 'Kus']]);
    return;
  }
  if (nearestVehicleDist < 3) {
    els.hint.innerHTML = hintHtml([['E', 'Instappen']]);
    return;
  }

  if (world.wanted > 0) {
    els.hint.innerHTML = hintHtml([['A/D', 'Richten'], ['KLIK', 'Aanvallen'], ['1-4', 'Wapen']]);
    return;
  }

  if (world.time < TUTORIAL_HINT_DURATION) {
    els.hint.innerHTML = hintHtml([['WASD', 'Lopen'], ['SPATIE', 'Springen'], ['CTRL', 'Kruipen'], ['E', 'Instappen'], ['C', 'Wissel'], ['M', 'Kaart']]);
    return;
  }

  els.hint.innerHTML = '';
}

function pointInPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function currentDistrict(world) {
  const { x, y } = world.player;
  const meta = world.map.meta;
  // Only 2 of the real admin boundaries actually reach into this play area,
  // and they're coarse (e.g. plain "Groningen") - the ~66 named
  // neighbourhood/quarter points give a far more specific, GTA-style
  // district name ("Binnenstad", "Ebbingekwartier", ...), so prefer those
  // and only fall back to a boundary polygon if literally nothing is near.
  let best = null, bestD2 = Infinity;
  for (const p of meta.neighbourhoodPoints || []) {
    const d2 = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d2 < bestD2) { bestD2 = d2; best = p.name; }
  }
  if (best) return best;
  for (const d of meta.districts || []) {
    for (const ring of d.rings) {
      if (pointInPoly(x, y, ring)) return d.name;
    }
  }
  return null;
}

let locationTimer = 0;
function updateLocation(dt, world) {
  locationTimer -= dt;
  if (locationTimer > 0) return;
  locationTimer = 0.5;
  const district = currentDistrict(world);
  const rp = world.map.nearestRoadPoint(world.player.x, world.player.y, 60, false);
  const street = rp && rp.road && rp.road.name;
  els.district.textContent = district || '';
  els.street.textContent = street || '';
}

const CHARACTER_LABELS = { tammo: 'Tammo', anita: 'Anita' };

function updateCharacter(world) {
  els.character.textContent = CHARACTER_LABELS[world.player.character] || 'Tammo';
}

function updateBars(world) {
  els.healthFill.style.width = Math.max(0, Math.min(100, world.health)) + '%';
  els.healthFill.classList.toggle('low', world.health < 30);
  els.armorFill.style.width = Math.max(0, Math.min(100, world.armor)) + '%';
}

function updateWanted(world) {
  let html = '';
  for (let i = 0; i < 5; i++) {
    html += i < world.wanted ? '★' : '<span class="off">★</span>';
  }
  els.wanted.innerHTML = html;
}

const WEAPON_LABELS = { fists: 'VUISTEN', pistol: 'PISTOOL', uzi: 'UZI', shotgun: 'HAGELGEWEER' };

function updateMoneyWeapon(world) {
  els.money.textContent = '€' + Math.max(0, Math.floor(world.money)).toLocaleString('nl-NL');
  const ammo = world.ammo ? world.ammo[world.weapon] : undefined;
  const ammoText = ammo === undefined ? '' : ammo === Infinity ? ' ∞' : ' ' + ammo;
  els.weapon.textContent = (WEAPON_LABELS[world.weapon] || 'VUISTEN') + ammoText;
}

function updateMission(world) {
  const m = world.mission;
  if (!m) {
    els.missionLabel.textContent = '';
    els.missionProgress.textContent = '';
    els.missionTimer.textContent = '';
    return;
  }
  els.missionLabel.textContent = m.label || '';
  els.missionProgress.textContent = missionProgressText(m);
  els.missionTimer.textContent = m.timeLeft != null ? Math.ceil(m.timeLeft) + 's' : '';
}

// missions.js leaves these fields set after a mission ends, so gate on the
// current type and phase instead of trusting their presence.
function missionProgressText(m) {
  if (m.phase !== 'active') return '';
  if (m.type === 'rampage' && m.killTarget != null) return `Kills: ${Math.max(0, m.killProgress || 0)}/${m.killTarget}`;
  if ((m.type === 'checkpoint' || m.type === 'boat') && m.wpTotal) return `Checkpoint ${Math.min(m.wpTotal, (m.wpIndex || 0) + 1)}/${m.wpTotal}`;
  if (m.type === 'fatbike' && m.fatbikeMaxHits != null) return `Geschept: ${m.fatbikeHits || 0}/${m.fatbikeMaxHits}`;
  return '';
}

// Only touch the DOM when the list changes, so the aria-live region
// doesn't get re-announced every frame.
let lastToastHtml = '';
function updateToasts(world) {
  world.messages = world.messages.filter((m) => m.until >= world.time);
  const html = world.messages
    .map((m) => {
      const big = m.text === 'DOOD' || m.text === 'OPGEPAKT';
      return `<div class="hud-toast${big ? ' big' : ''}">${escapeHtml(m.text)}</div>`;
    })
    .join('');
  if (html === lastToastHtml) return;
  lastToastHtml = html;
  els.toasts.innerHTML = html;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function missionTarget(mission) {
  if (!mission) return null;
  if (mission.marker && typeof mission.marker.x === 'number') return mission.marker;
  if (typeof mission.x === 'number' && typeof mission.y === 'number') return { x: mission.x, y: mission.y };
  if (mission.target && typeof mission.target.x === 'number') return mission.target;
  if (Array.isArray(mission.waypoints) && mission.waypoints.length) return mission.waypoints[0];
  return null;
}

function drawMinimap(dt, world) {
  const ctx = els.mmCtx;
  const dpr = window.devicePixelRatio || 1;
  const player = world.player;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, els.mmCanvas.width, els.mmCanvas.height);

  const cx = MINIMAP_SIZE / 2, cy = MINIMAP_SIZE / 2;
  // GTA5-style: the map itself rotates so the player's facing direction
  // always points up on screen, instead of a fixed north-up map with a
  // rotating player arrow. mapRotation is the screen-space angle any
  // world-space angle needs to add to become correct on screen post-
  // rotation (derived once here, reused below for the player arrow, the
  // off-screen mission arrow, and the new north indicator).
  const mapRotation = -Math.PI / 2 - player.angle;
  ctx.translate(cx * dpr, cy * dpr);
  ctx.rotate(mapRotation);
  ctx.scale(MM_SCALE * dpr, MM_SCALE * dpr);
  ctx.translate(-player.x, -player.y);

  ctx.fillStyle = '#22262a';
  ctx.fillRect(player.x - MM_RADIUS_M, player.y - MM_RADIUS_M, MM_RADIUS_M * 2, MM_RADIUS_M * 2);

  const view = world.map.queryView(
    player.x - MM_RADIUS_M, player.y - MM_RADIUS_M,
    player.x + MM_RADIUS_M, player.y + MM_RADIUS_M
  );

  drawNeighbourhoodBorders(ctx, dt, world, player);

  ctx.fillStyle = '#6b9450';
  for (const g of view.green) fillPoly(ctx, g.pts);

  ctx.fillStyle = '#3a86a8';
  for (const w of view.water) fillPoly(ctx, w.pts);

  for (const r of view.roads) {
    if (r.pts.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(r.pts[0][0], r.pts[0][1]);
    for (let i = 1; i < r.pts.length; i++) ctx.lineTo(r.pts[i][0], r.pts[i][1]);
    ctx.strokeStyle = r.cat === 'major' ? '#e8c93a' : r.cat === 'cycle' ? '#c9603f' : '#a8ada2';
    ctx.lineWidth = Math.max(r.width, 3);
    ctx.stroke();
  }

  const MM_BUILDING_COLORS = ['#b98a6a', '#9a8a7a', '#c9a876', '#8a96a0', '#a88a9a'];
  for (const b of view.buildings) {
    ctx.fillStyle = b.landmark ? '#ffd23f' : MM_BUILDING_COLORS[Math.floor(mmHash(b.pts[0][0], b.pts[0][1]) * MM_BUILDING_COLORS.length)];
    fillPoly(ctx, b.pts);
  }

  drawLandmarkIcons(ctx, world, player);
  drawPickupIcons(ctx, world, player);

  const dotR = 2.5 / MM_SCALE;
  for (const v of world.vehicles) {
    if (!v.isPolice || v.hijacked || !v.driver) continue;
    if (Math.abs(v.x - player.x) > MM_RADIUS_M || Math.abs(v.y - player.y) > MM_RADIUS_M) continue;
    ctx.beginPath();
    ctx.arc(v.x, v.y, dotR, 0, Math.PI * 2);
    ctx.fillStyle = '#dd2222';
    ctx.fill();
  }

  const target = missionTarget(world.mission);
  let targetOffscreen = null;
  if (target) {
    const dx = target.x - player.x, dy = target.y - player.y;
    if (Math.hypot(dx, dy) <= MM_RADIUS_M) drawMissionRing(ctx, world, target);
    else targetOffscreen = Math.atan2(dy, dx);
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // the map itself now rotates to keep the player's heading pointing up
  // (see mapRotation above), so the player marker is always just "up" -
  // no rotation needed here any more, unlike the old fixed-north map
  // where this arrow had to carry the player's own heading.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#ffcc33';
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(-4, 4);
  ctx.lineTo(4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // North indicator: a fixed point in the WORLD (north = world angle
  // -PI/2, since y increases south per ARCHITECTURE.md) swept through
  // mapRotation into screen space, same conversion the mission edge
  // arrow already needs - swings around the minimap's rim as the player
  // turns, always pointing toward true north, GTA5-style.
  drawNorthIndicator(ctx, cx, cy, mapRotation + -Math.PI / 2);

  if (targetOffscreen != null) drawMissionEdgeArrow(ctx, world, cx, cy, targetOffscreen + mapRotation);
}

function drawNorthIndicator(ctx, cx, cy, screenAngle) {
  const R = MINIMAP_SIZE / 2 - 5;
  ctx.save();
  ctx.translate(cx + Math.cos(screenAngle) * R, cy + Math.sin(screenAngle) * R);
  ctx.rotate(screenAngle + Math.PI / 2);
  ctx.fillStyle = '#3fc97a';
  ctx.strokeStyle = '#0c140e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(-3.5, 3.5);
  ctx.lineTo(3.5, 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.font = 'bold 8px "Bebas Neue", "Arial Narrow", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', 0, 6);
  ctx.restore();
}

function inMinimapRange(player, x, y) {
  return Math.abs(x - player.x) <= MM_RADIUS_M && Math.abs(y - player.y) <= MM_RADIUS_M;
}

const LANDMARK_COLOR = '#f5f0e6';
function drawLandmarkIcons(ctx, world, player) {
  const landmarks = world.map.meta.landmarks;
  if (!landmarks) return;
  for (const lm of landmarks) {
    if (!inMinimapRange(player, lm.x, lm.y)) continue;
    drawStarIcon(ctx, lm.x, lm.y, 3.2 / MM_SCALE, LANDMARK_COLOR);
  }
}

function drawPickupIcons(ctx, world, player) {
  const p = getPickupsForRender();

  for (const m of p.money) {
    if (!inMinimapRange(player, m.x, m.y)) continue;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 1.8 / MM_SCALE, 0, Math.PI * 2);
    ctx.fillStyle = '#3fbf3f';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 0.5 / MM_SCALE;
    ctx.stroke();
  }

  for (const w of p.weapons) {
    if (!inMinimapRange(player, w.x, w.y)) continue;
    drawTriangleIcon(ctx, w.x, w.y, 2.2 / MM_SCALE, '#ff9500');
  }

  if (p.health && inMinimapRange(player, p.health.x, p.health.y)) {
    drawCrossIcon(ctx, p.health.x, p.health.y, 2.1 / MM_SCALE, '#ff4d6d');
  }
  if (p.armor && inMinimapRange(player, p.armor.x, p.armor.y)) {
    drawSquareIcon(ctx, p.armor.x, p.armor.y, 1.9 / MM_SCALE, '#4a90d9');
  }

  for (const g of p.garages) {
    if (!inMinimapRange(player, g.x, g.y)) continue;
    drawDiamondIcon(ctx, g.x, g.y, 2.6 / MM_SCALE, '#b06fe0');
  }
}

function drawStarIcon(ctx, x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const oa = -Math.PI / 2 + i * (Math.PI * 2 / 5);
    const ia = oa + Math.PI / 5;
    if (i === 0) ctx.moveTo(Math.cos(oa) * r, Math.sin(oa) * r);
    else ctx.lineTo(Math.cos(oa) * r, Math.sin(oa) * r);
    ctx.lineTo(Math.cos(ia) * r * 0.45, Math.sin(ia) * r * 0.45);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 0.5 / MM_SCALE;
  ctx.stroke();
  ctx.restore();
}

function drawTriangleIcon(ctx, x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.87, r * 0.6);
  ctx.lineTo(-r * 0.87, r * 0.6);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 0.5 / MM_SCALE;
  ctx.stroke();
  ctx.restore();
}

function drawSquareIcon(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 0.5 / MM_SCALE;
  ctx.strokeRect(x - r, y - r, r * 2, r * 2);
}

function drawDiamondIcon(ctx, x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = color;
  ctx.fillRect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 0.5 / MM_SCALE;
  ctx.strokeRect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5);
  ctx.restore();
}

function drawCrossIcon(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 0.4 / MM_SCALE;
  ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 0.6 / MM_SCALE;
  const a = r * 0.5;
  ctx.beginPath();
  ctx.moveTo(x - a, y);
  ctx.lineTo(x + a, y);
  ctx.moveTo(x, y - a);
  ctx.lineTo(x, y + a);
  ctx.stroke();
}

// A static ring blends into the gold major-road strokes at a glance, so this
// pulses size/width/alpha over world.time and adds a bright core dot -
// nothing else on the minimap animates, which is what makes it read as
// "the objective" instead of just another gold shape.
function drawMissionRing(ctx, world, target) {
  const pulse = 0.5 + 0.5 * Math.sin(world.time * 5);
  ctx.beginPath();
  ctx.arc(target.x, target.y, (3 + pulse * 1.4) / MM_SCALE, 0, Math.PI * 2);
  ctx.strokeStyle = '#e8c93a';
  ctx.lineWidth = (1.6 - pulse * 0.5) / MM_SCALE;
  ctx.globalAlpha = 0.65 + pulse * 0.35;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(target.x, target.y, 1 / MM_SCALE, 0, Math.PI * 2);
  ctx.fillStyle = '#fff6d0';
  ctx.fill();
}

// GTA-style edge-of-radar arrow: once the mission target scrolls outside the
// minimap's visible circle, its ring (drawn in world-space) simply never
// gets painted, so without this the player loses all sense of direction -
// this draws in the already-reset screen-space transform, at a fixed pixel
// radius just inside the minimap's circular mask, pointing along the same
// player-to-target angle the in-range ring would sit at.
function drawMissionEdgeArrow(ctx, world, cx, cy, angle) {
  const pulse = 0.5 + 0.5 * Math.sin(world.time * 5);
  const R = MINIMAP_SIZE / 2 - 11;
  const size = 7 + pulse * 1.5;
  ctx.save();
  ctx.translate(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.6, size * 0.62);
  ctx.lineTo(-size * 0.6, -size * 0.62);
  ctx.closePath();
  ctx.fillStyle = '#e8c93a';
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

function fillPoly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

function mmHash(x, y) {
  const h = Math.sin(x * 91.3 + y * 197.1) * 27183.6;
  return h - Math.floor(h);
}

// We only have real polygon boundaries for 2 districts, but 66 named
// neighbourhood points with citywide coverage - and the HUD's "which wijk
// are you in" readout already answers that with "nearest named point", so
// sampling a coarse grid for nearest-point and drawing where the answer
// changes between neighbouring cells gives boundaries that agree with the
// HUD instead of showing unrelated administrative lines.
let borderCache = null; // {ox, oy, rects}
let borderCacheTimer = 0;
function drawNeighbourhoodBorders(ctx, dt, world, player) {
  const points = world.map.meta.neighbourhoodPoints;
  if (!points || !points.length) return;
  const cell = 14; // meters
  const half = Math.ceil(MM_RADIUS_M / cell) + 1;
  const ox = Math.round(player.x / cell), oy = Math.round(player.y / cell);

  borderCacheTimer -= dt;
  if (!borderCache || borderCacheTimer <= 0 || borderCache.ox !== ox || borderCache.oy !== oy) {
    borderCacheTimer = 0.3;
    const rects = [];
    const width = half * 2 + 2;
    let prevRow = null;
    for (let gy = oy - half; gy <= oy + half; gy++) {
      const curRow = new Array(width);
      for (let gx = ox - half; gx <= ox + half; gx++) {
        const wx = gx * cell, wy = gy * cell;
        let best = -1, bestD2 = Infinity;
        for (let i = 0; i < points.length; i++) {
          const d2 = (points[i].x - wx) ** 2 + (points[i].y - wy) ** 2;
          if (d2 < bestD2) { bestD2 = d2; best = i; }
        }
        const col = gx - (ox - half);
        curRow[col] = best;
        const leftIdx = col > 0 ? curRow[col - 1] : best;
        const upIdx = prevRow ? prevRow[col] : best;
        if (best !== leftIdx || best !== upIdx) rects.push([wx - cell / 2, wy - cell / 2]);
      }
      prevRow = curRow;
    }
    borderCache = { ox, oy, rects };
  }

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (const [rx, ry] of borderCache.rects) ctx.fillRect(rx, ry, cell * 0.5, cell * 0.5);
}
