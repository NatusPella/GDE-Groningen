// All draw functions assume ctx has already been transformed so that
// world-space coordinates (meters) can be used directly (see main.js).

// Road/roof/water/green tones below are not invented - they're pulled from
// scripts/extract_palette.py sampling real Esri satellite imagery of this
// exact bbox (see data/satellite_reference.jpg), so the palette matches what
// Groningen actually looks like from above rather than a generic "brick
// town" guess. Dutch roofs read as dark grey/charcoal tile and bitumen from
// directly overhead (not the warm brick you'd see from street level - that's
// only visible on the parallax wall band, which is styled separately).
const ROAD_COLOR = { major: '#565c53', normal: '#454943', minor: '#3a3d39' };
const ROAD_EDGE = { major: '#f2d54c', normal: '#d8d8d8', minor: '#6a6d72' };
const SIDEWALK_COLOR = '#9a9184';
const CYCLEWAY_COLOR = '#a1402f';
const CYCLEWAY_EDGE = '#5c2419';
const FOOTWAY_COLOR = '#a89f8d';

const BUILDING_PALETTE = [
  [102, 106, 98], [102, 106, 98], [102, 106, 98], [102, 106, 98],
  [123, 127, 118], [123, 127, 118], [123, 127, 118], [123, 127, 118],
  [79, 85, 80], [79, 85, 80], [79, 85, 80],
  [58, 62, 59], [58, 62, 59], [58, 62, 59],
  [151, 151, 136], [151, 151, 136], [151, 151, 136],
  [35, 38, 37], [35, 38, 37],
  [180, 178, 162], [180, 178, 162],
  [215, 213, 196],
  [98, 83, 64], // terracotta/tile roof accent
];

function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

export function applyCameraTransform(ctx, cam) {
  ctx.setTransform(cam.zoom, 0, 0, cam.zoom, cam.w / 2 - cam.x * cam.zoom, cam.h / 2 - cam.y * cam.zoom);
}

let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const size = 96;
  grainTile = document.createElement('canvas');
  grainTile.width = size;
  grainTile.height = size;
  const tctx = grainTile.getContext('2d');
  const imgData = tctx.createImageData(size, size);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const v = Math.random() * 255;
    imgData.data[i] = v; imgData.data[i + 1] = v; imgData.data[i + 2] = v;
    imgData.data[i + 3] = Math.random() * 255;
  }
  tctx.putImageData(imgData, 0, 0);
  return grainTile;
}

// A screen-space (not world-space) noise overlay drawn last, after every
// world layer - breaks up the flat-vector look everywhere at once far more
// cheaply than texturing each road/building/field individually.
export function drawFilmGrain(ctx, alpha = 0.05) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  const pattern = ctx.createPattern(getGrainTile(), 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

// A screen-space wink at both ends of the series without copying any actual
// asset: tilt=0 (classic top-down) leans retro - scanlines + a tighter
// vignette, closer to how GTA1/2's low-res sprite rendering read; tilt=1
// (angled 3D) leans modern - a warm cinematic highlight/shadow grade with a
// soft glow, the "AAA trailer" look, crossfaded smoothly with the camera
// tilt amount so switching views feels like one continuous shift in mood.
let scanlineTile = null;
function getScanlineTile() {
  if (scanlineTile) return scanlineTile;
  scanlineTile = document.createElement('canvas');
  scanlineTile.width = 4;
  scanlineTile.height = 4;
  const tctx = scanlineTile.getContext('2d');
  tctx.fillStyle = 'rgba(0,0,0,0)';
  tctx.fillRect(0, 0, 4, 4);
  tctx.fillStyle = 'rgba(0,0,0,0.5)';
  tctx.fillRect(0, 0, 4, 1);
  return scanlineTile;
}

export function drawViewModeGrade(ctx, tilt = 0) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const retro = 1 - tilt;
  if (retro > 0.02) {
    ctx.globalAlpha = retro * 0.35;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = ctx.createPattern(getScanlineTile(), 'repeat');
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = retro * 0.5;
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(5,10,5,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  if (tilt > 0.02) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = tilt * 0.6;
    const grade = ctx.createLinearGradient(0, 0, 0, h);
    grade.addColorStop(0, 'rgba(255,190,120,0.55)');
    grade.addColorStop(0.5, 'rgba(255,255,255,0)');
    grade.addColorStop(1, 'rgba(40,60,110,0.4)');
    ctx.fillStyle = grade;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = tilt * 0.16;
    const glow = ctx.createRadialGradient(w * 0.5, h * 0.12, 0, w * 0.5, h * 0.12, Math.max(w, h) * 0.55);
    glow.addColorStop(0, 'rgba(255,225,180,0.9)');
    glow.addColorStop(1, 'rgba(255,225,180,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = tilt * 0.35;
    const vg2 = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg2.addColorStop(0, 'rgba(0,0,0,0)');
    vg2.addColorStop(1, 'rgba(10,10,25,0.5)');
    ctx.fillStyle = vg2;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();
}

export function drawGround(ctx) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#6b6459';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

export function drawGreen(ctx, items, zoom = 16) {
  for (const g of items) {
    poly(ctx, g.pts);
    ctx.fillStyle = g.kind === 'forest' ? '#4a6b3f' : g.kind === 'cemetery' ? '#5a6b52' : '#6b8a4a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 0.25;
    ctx.stroke();

    if (zoom < 5) continue;
    ctx.save();
    poly(ctx, g.pts);
    ctx.clip();
    drawGreenTexture(ctx, g);
    ctx.restore();
  }
}

function drawGreenTexture(ctx, g) {
  const [minx, miny, maxx, maxy] = g.bounds;
  const area = (maxx - minx) * (maxy - miny);
  const forest = g.kind === 'forest';
  const cell = forest ? 3.2 : 2.4;
  const count = Math.min(260, Math.ceil(area / (cell * cell)));
  for (let i = 0; i < count; i++) {
    const hx = hash2(minx + i * 3.13, maxy - i * 1.71);
    const hy = hash2(minx - i * 2.07, miny + i * 4.41);
    const x = minx + hx * (maxx - minx);
    const y = miny + hy * (maxy - miny);
    const hv = hash2(x * 0.37, y * 0.53);
    if (forest) {
      const r = 0.9 + hv * 1.1;
      ctx.beginPath();
      ctx.arc(x + r * 0.15, y + r * 0.15, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      const gg = Math.floor(70 + hv * 40);
      ctx.fillStyle = `rgb(${Math.floor(35 + hv * 18)},${gg},${Math.floor(32 + hv * 15)})`;
      ctx.fill();
    } else {
      ctx.fillStyle = hv > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      ctx.beginPath();
      ctx.arc(x, y, 0.5 + hv * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawWater(ctx, items, time = 0) {
  ctx.fillStyle = '#3f5c4a';
  for (const w of items) { poly(ctx, w.pts); ctx.fill(); }

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 0.15;
  for (const w of items) {
    poly(ctx, w.pts);
    ctx.clip();
    const [minx, miny, maxx, maxy] = w.bounds;
    const spacing = 3.5;
    const phase = (time * 0.6) % spacing;
    for (let x = minx - (maxy - miny) - phase; x < maxx + (maxy - miny); x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, miny);
      ctx.lineTo(x + (maxy - miny), maxy);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
  }
  ctx.restore();
}

function drawSidewalks(ctx, roads, zoom) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = SIDEWALK_COLOR;
  for (const r of roads) {
    if (r.cat === 'foot' || r.cat === 'cycle' || r.width < 4) continue;
    ctx.beginPath();
    ctx.moveTo(r.pts[0][0], r.pts[0][1]);
    for (let i = 1; i < r.pts.length; i++) ctx.lineTo(r.pts[i][0], r.pts[i][1]);
    // scale with the road's own width instead of a flat +1.8m - a flat
    // sidewalk reads fine on a normal street but visually doubles a narrow
    // 4m service road and looks like a rounding error on a 12m arterial
    const sidewalk = Math.min(2.6, Math.max(1.0, r.width * 0.3));
    ctx.lineWidth = r.width + sidewalk * 2;
    ctx.stroke();
  }
  if (zoom > 6) drawPaverJoints(ctx, roads);
}

// Dutch sidewalks/plazas are almost always laid in "klinkers" (small brick
// pavers) - a few perpendicular tick marks sampled along each sidewalk
// stroke reads as brick joints without the cost of tiling an actual pattern
// across every road polygon.
function drawPaverJoints(ctx, roads) {
  ctx.strokeStyle = 'rgba(0,0,0,0.16)';
  ctx.lineWidth = 0.08;
  const SPACING = 1.4;
  for (const r of roads) {
    if (r.cat === 'foot' || r.cat === 'cycle' || r.width < 4) continue;
    const halfSpan = r.width / 2 + 0.5;
    let carry = 0;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [ax, ay] = r.pts[i], [bx, by] = r.pts[i + 1];
      const segLen = Math.hypot(bx - ax, by - ay);
      if (segLen < 1e-6) continue;
      const nx = -(by - ay) / segLen, ny = (bx - ax) / segLen;
      let d = carry;
      while (d < segLen) {
        const t = d / segLen;
        const px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
        ctx.beginPath();
        ctx.moveTo(px + nx * halfSpan, py + ny * halfSpan);
        ctx.lineTo(px - nx * halfSpan, py - ny * halfSpan);
        ctx.stroke();
        d += SPACING;
      }
      carry = d - segLen;
    }
  }
}

function strokeLine(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

export function drawRoads(ctx, items, zoom) {
  const drivable = [];
  const cycle = [];
  const foot = [];
  for (const r of items) {
    if (r.cat === 'cycle') cycle.push(r);
    else if (r.cat === 'foot') foot.push(r);
    else drivable.push(r);
  }
  drivable.sort((a, b) => b.width - a.width);

  drawSidewalks(ctx, drivable, zoom);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = FOOTWAY_COLOR;
  ctx.lineWidth = 1.6;
  for (const r of foot) strokeLine(ctx, r.pts);

  ctx.strokeStyle = CYCLEWAY_EDGE;
  for (const r of cycle) { ctx.lineWidth = r.width + 0.35; strokeLine(ctx, r.pts); }
  ctx.strokeStyle = CYCLEWAY_COLOR;
  for (const r of cycle) { ctx.lineWidth = r.width; strokeLine(ctx, r.pts); }
  if (zoom > 5) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 0.1;
    ctx.setLineDash([0.6, 0.9]);
    for (const r of cycle) strokeLine(ctx, r.pts);
    ctx.setLineDash([]);
  }

  for (const r of drivable) {
    ctx.strokeStyle = ROAD_COLOR[r.cat] || '#43464c';
    ctx.lineWidth = r.width;
    strokeLine(ctx, r.pts);
  }

  if (zoom > 4) {
    for (const r of drivable) {
      if (r.width < 5.5) continue;
      ctx.strokeStyle = ROAD_EDGE[r.cat] || '#d8d8d8';
      ctx.lineWidth = Math.max(0.15, r.width * 0.045);
      ctx.setLineDash([r.width * 0.9, r.width * 1.2]);
      strokeLine(ctx, r.pts);
      ctx.setLineDash([]);
    }
  }
}

// The minimap is a fixed circle in the bottom-right of the viewport (see
// hud_panel.css) - a world-space label whose screen position happens to
// land there would render invisibly underneath that DOM overlay, so any
// label drawer needs to know to skip it.
const MINIMAP_MARGIN = 16, MINIMAP_RADIUS = 84;
function underMinimap(wx, wy, zoom, camX, camY, camW, camH) {
  if (!camW || !camH) return false;
  const sx = (wx - camX) * zoom + camW / 2;
  const sy = (wy - camY) * zoom + camH / 2;
  const cx = camW - MINIMAP_MARGIN - MINIMAP_RADIUS + 6, cy = camH - MINIMAP_MARGIN - MINIMAP_RADIUS + 6;
  return Math.hypot(sx - cx, sy - cy) < MINIMAP_RADIUS;
}

export function drawRoadLabels(ctx, items, zoom) {
  if (zoom < 4.5) return;
  const seen = new Set();
  const picks = [];
  for (const r of items) {
    if (!r.name || r.cat === 'foot' || r.cat === 'cycle') continue;
    if (seen.has(r.name)) continue;
    let len = 0;
    for (let i = 0; i < r.pts.length - 1; i++) len += Math.hypot(r.pts[i + 1][0] - r.pts[i][0], r.pts[i + 1][1] - r.pts[i][1]);
    if (len < 14) continue;
    seen.add(r.name);
    picks.push(r);
  }

  ctx.save();
  ctx.font = `${Math.min(2.6, 26 / zoom)}px "Arial Narrow", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 0.28;
  ctx.strokeStyle = 'rgba(20,20,22,0.75)';
  ctx.fillStyle = '#f2f0ea';

  for (const r of picks) {
    const pts = r.pts;
    let bestI = 0, bestLen = -1;
    for (let i = 0; i < pts.length - 1; i++) {
      const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      if (l > bestLen) { bestLen = l; bestI = i; }
    }
    const a = pts[bestI], b = pts[bestI + 1];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    let angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;

    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(angle);
    ctx.strokeText(r.name, 0, 0);
    ctx.fillText(r.name, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

export function drawLandmarkLabels(ctx, landmarks, zoom, viewBounds, camX = 0, camY = 0, camW = 0, camH = 0) {
  if (zoom < 4 || !landmarks) return;
  const [minx, miny, maxx, maxy] = viewBounds;
  ctx.save();
  ctx.font = `${Math.min(2.6, 24 / zoom)}px "Arial Narrow", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 0.26;
  ctx.strokeStyle = 'rgba(15,15,15,0.8)';
  ctx.fillStyle = '#bfe8a8';
  for (const l of landmarks) {
    if (l.buildingMatched) continue; // already labeled directly on its roof
    if (l.x < minx || l.x > maxx || l.y < miny || l.y > maxy) continue;
    if (underMinimap(l.x, l.y, zoom, camX, camY, camW, camH)) continue;
    ctx.strokeText(l.name, l.x, l.y);
    ctx.fillText(l.name, l.x, l.y);
  }
  ctx.restore();
}

export function drawTrees(ctx, items, zoom, tilt = 0) {
  if (zoom < 3) return;
  const trunkH = 4.5; // an average street tree is taller than our old flat dot suggested
  for (const [x, y] of items) {
    const h = hash2(x, y);
    const h2 = hash2(x * 1.7 + 3.1, y * 1.3 - 2.7);
    const r = 1.1 + h * 1.0;
    const liftX = 0, liftY = -trunkH * tilt;

    ctx.beginPath();
    ctx.ellipse(x + r * 0.2, y + r * 0.35, r * 1.05, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fill();

    if (tilt > 0.05) {
      ctx.strokeStyle = 'rgba(60,45,30,0.9)';
      ctx.lineWidth = Math.max(0.08, r * 0.12);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + liftX, y + liftY);
      ctx.stroke();
    }

    const cx = x + liftX, cy = y + liftY;
    // three overlapping lobes instead of one flat disc read as a fluffier,
    // less obviously-geometric canopy
    const lobes = [[0, 0, 1], [-r * 0.55, r * 0.15, 0.72], [r * 0.5, r * 0.2, 0.68]];
    for (const [lx, ly, ls] of lobes) {
      const gg = Math.floor(85 + (h + h2) * 22);
      ctx.beginPath();
      ctx.arc(cx + lx, cy + ly, r * ls, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${Math.floor(38 + h2 * 22)},${gg},${Math.floor(38 + h * 16)})`;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.32, r * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fill();
  }
}

// Buildings are drawn twice: once as a dark "wall" silhouette at their true
// footprint (this is also what lines up with collision), and once as the
// colored roof translated away from the camera's screen center, scaled by
// height - since both shapes are identical just translated, the sliver of
// dark wall left uncovered by the shifted roof automatically falls on the
// side facing the camera, giving a cheap but convincing oblique/parallax
// look without per-edge visibility math.
function parallaxOffset(b, zoom, camX, camY, tilt = 0) {
  const [minx, miny, maxx, maxy] = b.bounds;
  const bx = (minx + maxx) / 2, by = (miny + maxy) / 2;
  const dx = bx - camX, dy = by - camY;
  const dist = Math.hypot(dx, dy) || 1;
  const effH = b.landmarkKind === 'tower' ? 30 : b.h; // Martinitoren is ~95m, not "3 levels"
  // top-down (tilt=0): near-zero at screen center, growing toward the
  // edges, radiating outward - a cheap fisheye-ish height cue.
  // tilted 3D (tilt=1): every building leans the SAME screen-up direction
  // regardless of where it sits, like a real camera looking down at an
  // angle from one consistent side - and it leans much further, since the
  // Y-squish transform makes "up" read as "away/into the distance".
  const distFactor = Math.min(1, dist / 18);
  const topMag = Math.min(11, (0.5 + effH * 0.5) * Math.min(1, zoom / 10) * distFactor);
  const tiltMag = Math.min(16, (0.6 + effH * 0.62) * Math.min(1, zoom / 10));
  const rx = (dx / dist) * topMag, ry = (dy / dist) * topMag;
  const ux = 0, uy = -tiltMag;
  return [rx + (ux - rx) * tilt, ry + (uy - ry) * tilt];
}

const LANDMARK_COLOR = {
  tower: [120, 60, 40], church: [90, 85, 90], modern: [60, 110, 130],
  museum: [180, 70, 40], station: [70, 90, 110], university: [80, 60, 45],
  historic: [140, 110, 50], mall: [70, 100, 130], stadium: [60, 120, 70],
};

export function drawBuildings(ctx, items, zoom, camX = 0, camY = 0, camW = 0, camH = 0, tilt = 0) {
  if (zoom > 3) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    for (const b of items) {
      poly(ctx, b.pts);
      ctx.fill();
    }
  }
  const labels = [];
  for (const b of items) {
    const [ox, oy] = zoom > 3 ? parallaxOffset(b, zoom, camX, camY, tilt) : [0, 0];
    const [bx, by] = b.pts[0];
    const h = hash2(bx, by);
    const landmarkRgb = b.landmark && LANDMARK_COLOR[b.landmarkKind];
    const [pr, pg, pb] = landmarkRgb || BUILDING_PALETTE[Math.floor(h * BUILDING_PALETTE.length)];
    const shade = Math.max(0.68, 1 - b.h * 0.018);
    const r = Math.floor(pr * shade);
    const g = Math.floor(pg * shade);
    const bl = Math.floor(pb * shade);
    ctx.save();
    ctx.translate(ox, oy);
    poly(ctx, b.pts);
    ctx.fillStyle = `rgb(${r},${g},${bl})`;
    ctx.fill();

    if (zoom > 7) {
      ctx.save();
      ctx.clip();
      drawFacadeDetail(ctx, b, h);
      if (zoom > 9 && !b.landmark) drawRoofProps(ctx, b, h);
      ctx.restore();
    }

    if (b.landmark) {
      ctx.strokeStyle = 'rgba(255,224,140,0.9)';
      ctx.lineWidth = 0.28;
      ctx.stroke();
      const [minx, miny, maxx, maxy] = b.bounds;
      const cx = (minx + maxx) / 2 + ox, cy = (miny + maxy) / 2 + oy;
      if (zoom > 5) drawLandmarkIcon(ctx, b.landmarkKind, cx, cy, Math.min(maxx - minx, maxy - miny));
      if (zoom > 4 && !underMinimap(cx, cy, zoom, camX, camY, camW, camH)) labels.push({ name: b.landmark, x: cx, y: cy });
    }

    if (zoom > 6) {
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 0.15;
      ctx.stroke();
    }
    if (zoom > 9 && b.h >= 3) {
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 0.3;
      ctx.stroke();
    }
    ctx.restore();
  }

  if (labels.length) {
    ctx.save();
    ctx.font = `${Math.min(2.4, 22 / zoom)}px "Arial Narrow", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 0.26;
    ctx.strokeStyle = 'rgba(15,15,15,0.8)';
    ctx.fillStyle = '#ffe08c';
    for (const l of labels) {
      ctx.strokeText(l.name, l.x, l.y);
      ctx.fillText(l.name, l.x, l.y);
    }
    ctx.restore();
  }
}

function drawLandmarkIcon(ctx, kind, cx, cy, size) {
  const s = Math.min(3.2, Math.max(1.4, size * 0.28));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = 'rgba(20,16,10,0.85)';
  ctx.strokeStyle = 'rgba(255,224,140,0.9)';
  ctx.lineWidth = s * 0.08;
  if (kind === 'tower') {
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.3); ctx.lineTo(s * 0.5, s * 0.6); ctx.lineTo(-s * 0.5, s * 0.6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (kind === 'church') {
    ctx.fillRect(-s * 0.12, -s * 0.9, s * 0.24, s * 1.6);
    ctx.fillRect(-s * 0.5, -s * 0.3, s, s * 0.24);
  } else if (kind === 'station') {
    ctx.beginPath();
    ctx.roundRect(-s * 0.7, -s * 0.5, s * 1.4, s, s * 0.3);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,224,140,0.9)';
    ctx.beginPath(); ctx.arc(-s * 0.35, s * 0.15, s * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.35, s * 0.15, s * 0.14, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'university') {
    ctx.beginPath();
    ctx.moveTo(-s * 0.9, 0); ctx.lineTo(0, -s * 0.55); ctx.lineTo(s * 0.9, 0); ctx.lineTo(0, s * 0.55);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (kind === 'museum') {
    for (const dx of [-s * 0.6, 0, s * 0.6]) {
      ctx.beginPath();
      ctx.moveTo(dx, -s * 0.9); ctx.lineTo(dx, s * 0.9);
      ctx.lineWidth = s * 0.22;
      ctx.stroke();
    }
  } else if (kind === 'stadium') {
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.65, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === 'mall') {
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, -s * 0.4); ctx.lineTo(s * 0.7, -s * 0.4);
    ctx.lineTo(s * 0.55, s * 0.9); ctx.lineTo(-s * 0.55, s * 0.9);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

function drawFacadeDetail(ctx, b, h) {
  const [minx, miny, maxx, maxy] = b.bounds;
  const spacing = 2.6;
  const jitter = h * spacing;
  ctx.fillStyle = 'rgba(30,32,40,0.16)';
  for (let x = minx + jitter % spacing; x < maxx; x += spacing) {
    for (let y = miny + (jitter * 1.7) % spacing; y < maxy; y += spacing) {
      ctx.fillRect(x, y, spacing * 0.35, spacing * 0.35);
    }
  }
}

// Dutch rooftops seen from directly above are cluttered with vents, AC
// condensers, skylights and (increasingly) solar panel clusters - a couple
// of these per roof, placed deterministically from the building's own
// footprint so they don't jitter frame to frame, reads far less "flat" than
// a bare color fill at close zoom.
function drawRoofProps(ctx, b, h) {
  const [minx, miny, maxx, maxy] = b.bounds;
  const w = maxx - minx, ht = maxy - miny;
  const area = w * ht;
  if (area < 26) return;
  const count = Math.min(5, 1 + Math.floor(area / 90));
  for (let i = 0; i < count; i++) {
    const hx = hash2(minx * 7 + i * 13.7, maxy * 11 - i * 5.3);
    const hy = hash2(minx * 5 - i * 9.1, miny * 13 + i * 7.7);
    const ht2 = hash2(maxx * 3 + i * 17.3, maxy * 9 - i * 3.1);
    const hr = hash2(minx * 2 - i * 4.4, maxy * 6 + i * 8.8);
    const px = minx + (0.14 + hx * 0.62) * w;
    const py = miny + (0.14 + hy * 0.62) * ht;
    const type = Math.floor(ht2 * 4);
    const rot = hr * Math.PI * 2;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    if (type === 0) {
      ctx.fillStyle = 'rgba(20,20,22,0.55)';
      ctx.beginPath();
      ctx.arc(0, 0, 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 1) {
      ctx.fillStyle = 'rgba(150,152,148,0.85)';
      ctx.fillRect(-0.35, -0.28, 0.7, 0.56);
      ctx.strokeStyle = 'rgba(20,20,22,0.4)';
      ctx.lineWidth = 0.04;
      ctx.strokeRect(-0.35, -0.28, 0.7, 0.56);
    } else if (type === 2) {
      ctx.fillStyle = 'rgba(140,175,190,0.55)';
      ctx.fillRect(-0.3, -0.4, 0.6, 0.8);
    } else {
      ctx.fillStyle = 'rgba(15,20,35,0.7)';
      ctx.fillRect(-0.55, -0.4, 1.1, 0.8);
      ctx.strokeStyle = 'rgba(80,100,130,0.5)';
      ctx.lineWidth = 0.03;
      for (let gx = -0.55; gx <= 0.55; gx += 0.27) {
        ctx.beginPath(); ctx.moveTo(gx, -0.4); ctx.lineTo(gx, 0.4); ctx.stroke();
      }
    }
    ctx.restore();
  }
}
