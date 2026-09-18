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
    '<div class="hud-bar"><div class="hud-bar-fill armor"></div></div>';
  root.appendChild(topLeft);

  const topRight = document.createElement('div');
  topRight.className = 'hud-top-right';
  topRight.innerHTML =
    '<div class="hud-wanted"></div>' +
    '<div class="hud-money"></div>' +
    '<div class="hud-weapon"></div>' +
    '<div class="hud-radio"></div>';
  root.appendChild(topRight);

  const hint = document.createElement('div');
  hint.className = 'hud-hint';
  root.appendChild(hint);

  const mission = document.createElement('div');
  mission.className = 'hud-mission';
  mission.innerHTML = '<div class="hud-mission-label"></div><div class="hud-mission-timer"></div>';
  root.appendChild(mission);

  const toasts = document.createElement('div');
  toasts.className = 'hud-toasts';
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
    wanted: topRight.querySelector('.hud-wanted'),
    money: topRight.querySelector('.hud-money'),
    weapon: topRight.querySelector('.hud-weapon'),
    radio: topRight.querySelector('.hud-radio'),
    hint,
    missionLabel: mission.querySelector('.hud-mission-label'),
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
  updateWanted(world);
  updateMoneyWeapon(world);
  updateRadio(world);
  updateMission(world);
  updateToasts(world);
  updateLocation(world);
  updateHint(world);
  drawMinimap(world);
}

const RADIO_STATIONS = [
  'FM Sikkom', 'Radio Eierbal', 'Ommelander Beats', 'Grunn Grondig FM', 'Diepenring Live',
];

function updateRadio(world) {
  const v = world.player.inVehicle;
  if (!v) { els.radio.textContent = ''; return; }
  const station = RADIO_STATIONS[Math.abs(Math.floor(v.id || 0)) % RADIO_STATIONS.length];
  els.radio.textContent = '📻 ' + station;
}

// Context-aware on-screen prompts, shown only when relevant, instead of a
// static always-visible controls list on the start screen.
const TUTORIAL_HINT_DURATION = 9;
function updateHint(world) {
  const player = world.player;

  if (player.inVehicle) {
    els.hint.textContent = '[E] Uitstappen   [SPATIE] Remmen';
    return;
  }

  let nearestVehicleDist = Infinity;
  for (const v of world.vehicles) {
    if (v.wrecked || v.driver) continue;
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < nearestVehicleDist) nearestVehicleDist = d;
  }
  if (nearestVehicleDist < 3) {
    els.hint.textContent = '[E] Instappen';
    return;
  }

  if (world.wanted > 0) {
    els.hint.textContent = '[Muis] Richten/aanvallen   [1-4] Wapen wisselen';
    return;
  }

  if (world.time < TUTORIAL_HINT_DURATION) {
    els.hint.textContent = '[WASD] Lopen  ·  [E] Instappen  ·  [C] Wissel  ·  [M] Kaart';
    return;
  }

  els.hint.textContent = '';
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
function updateLocation(world) {
  locationTimer -= 1 / 60;
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
    els.missionTimer.textContent = '';
    return;
  }
  els.missionLabel.textContent = m.label || '';
  els.missionTimer.textContent = m.timeLeft != null ? Math.ceil(m.timeLeft) + 's' : '';
}

function updateToasts(world) {
  world.messages = world.messages.filter((m) => m.until >= world.time);
  els.toasts.innerHTML = world.messages
    .map((m) => {
      const big = m.text === 'DOOD' || m.text === 'OPGEPAKT';
      return `<div class="hud-toast${big ? ' big' : ''}">${escapeHtml(m.text)}</div>`;
    })
    .join('');
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

function drawMinimap(world) {
  const ctx = els.mmCtx;
  const dpr = window.devicePixelRatio || 1;
  const player = world.player;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, els.mmCanvas.width, els.mmCanvas.height);

  const cx = MINIMAP_SIZE / 2, cy = MINIMAP_SIZE / 2;
  ctx.setTransform(MM_SCALE * dpr, 0, 0, MM_SCALE * dpr, (cx - player.x * MM_SCALE) * dpr, (cy - player.y * MM_SCALE) * dpr);

  ctx.fillStyle = '#22262a';
  ctx.fillRect(player.x - MM_RADIUS_M, player.y - MM_RADIUS_M, MM_RADIUS_M * 2, MM_RADIUS_M * 2);

  const view = world.map.queryView(
    player.x - MM_RADIUS_M, player.y - MM_RADIUS_M,
    player.x + MM_RADIUS_M, player.y + MM_RADIUS_M
  );

  drawNeighbourhoodBorders(ctx, world, player);

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

  const dotR = 2.5 / MM_SCALE;
  for (const v of world.vehicles) {
    if (!v.isPolice || !v.driver) continue;
    if (Math.abs(v.x - player.x) > MM_RADIUS_M || Math.abs(v.y - player.y) > MM_RADIUS_M) continue;
    ctx.beginPath();
    ctx.arc(v.x, v.y, dotR, 0, Math.PI * 2);
    ctx.fillStyle = '#dd2222';
    ctx.fill();
  }

  const target = missionTarget(world.mission);
  if (target) {
    ctx.beginPath();
    ctx.arc(target.x, target.y, 3 / MM_SCALE, 0, Math.PI * 2);
    ctx.strokeStyle = '#e8c93a';
    ctx.lineWidth = 1 / MM_SCALE;
    ctx.stroke();
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(player.angle);
  ctx.fillStyle = '#ffcc33';
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4, 4);
  ctx.lineTo(-4, -4);
  ctx.closePath();
  ctx.fill();
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
function drawNeighbourhoodBorders(ctx, world, player) {
  const points = world.map.meta.neighbourhoodPoints;
  if (!points || !points.length) return;
  const cell = 14; // meters
  const half = Math.ceil(MM_RADIUS_M / cell) + 1;
  const ox = Math.round(player.x / cell), oy = Math.round(player.y / cell);

  borderCacheTimer -= 1 / 60;
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
