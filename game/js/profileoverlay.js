// Profile overlay (?dev, desktop --dev; F8): the lengthwise profile of the
// road or rail deck under the player (docs/PROVINCIE-PLAN.md 2.11), so a
// height fault is a picture instead of a number. Shows ±150 m of the ribbon
// the player (or the player's vehicle) stands on (map.surfaceAt state), its
// vertices, each segment coloured by its grade against the class limit
// (roadprofile.js: green within, amber near, red over), the player, the
// other ribbons within 12 m at their height there, and a line of text: the
// road, height, grade, limit, structure (deck, embankment, cutting,
// tunnel), OSM grade order and network.
import { gradeLimit, GRADE_TOL, segmentStructures, gradeOrder } from './roadprofile.js';
import { closestPointOnSegment } from './util.js';
import { hoofdspeler } from './players.js'; // de speler van dit apparaat (#500)

const W = 380, H = 170, SPAN = 150;
const STRUCT_NAME = ['ground', 'deck', 'embankment', 'cutting', 'tunnel'];
let world = null, canvas = null, on = false;

export function initProfileOverlay(w) {
  world = w;
  canvas = document.createElement('canvas');
  canvas.width = W * 2; canvas.height = H * 2;
  Object.assign(canvas.style, { position: 'fixed', left: '8px', top: '8px', width: W + 'px', height: H + 'px', zIndex: 9999, pointerEvents: 'none', display: 'none', background: 'rgba(12,14,18,0.82)', borderRadius: '6px' });
  document.body.appendChild(canvas);
  window.addEventListener('keydown', (e) => { if (e.key === 'F8') { e.preventDefault(); toggle(); } });
  window.__profileOverlay = { toggle, draw };
  setInterval(() => { if (on) draw(); }, 100);
}

function toggle() {
  on = !on;
  canvas.style.display = on ? 'block' : 'none';
  if (on) draw();
}

// arc length per vertex
function stations(r) {
  const S = [0];
  for (let i = 1; i < r.pts.length; i++) S.push(S[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]));
  return S;
}

function project(r, x, y) {
  let best = null;
  const S = stations(r);
  for (let i = 0; i < r.pts.length - 1; i++) {
    const cp = closestPointOnSegment(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]);
    if (!best || cp.dist2 < best.d2) best = { d2: cp.dist2, i, t: cp.t, s: S[i] + (S[i + 1] - S[i]) * cp.t, S };
  }
  return best;
}

const zOf = (r, i, t) => (r.z ? r.z[i] + (r.z[i + 1] - r.z[i]) * t : 0);

export function draw() {
  if (!world || !canvas) return;
  const map = world.map, p = hoofdspeler(world); // het eigen lichaam, niet de singleton (#500)
  const v = p.inVehicle;
  const st = (v && v.surf) || p.surf || null;
  const x = v ? v.x : p.x, y = v ? v.y : p.y;
  let r = st && st.ribbon && st.ribbon.pts ? st.ribbon : null;
  if (!r) {
    let bd = 144;
    for (const q of map.roadsNear(x, y, 12)) {
      if (!q.z) continue;
      const pr = project(q, x, y);
      if (pr.d2 < bd) { bd = pr.d2; r = q; }
    }
  }
  const g = canvas.getContext('2d');
  g.setTransform(2, 0, 0, 2, 0, 0);
  g.clearRect(0, 0, W, H);
  g.font = '11px monospace';
  g.fillStyle = '#dfe6ee';
  const zNow = v ? (v.z || 0) : (p.gz || 0);
  if (!r) {
    g.fillText(`street level  z ${zNow.toFixed(2)}  ${st ? st.kind || '' : ''}`, 10, 18);
    return;
  }
  const pr = project(r, x, y), S = pr.S;
  const s0 = pr.s - SPAN, s1 = pr.s + SPAN;
  let zlo = Infinity, zhi = -Infinity;
  for (let i = 0; i < r.pts.length; i++) if (S[i] >= s0 - 20 && S[i] <= s1 + 20) { const z = r.z ? r.z[i] : 0; zlo = Math.min(zlo, z); zhi = Math.max(zhi, z); }
  zlo = Math.min(zlo, zNow, -1) - 1; zhi = Math.max(zhi, zNow, 1) + 1;
  const X = (s) => 10 + (s - s0) / (s1 - s0) * (W - 20);
  const Y = (z) => H - 26 - (z - zlo) / (zhi - zlo) * (H - 56);
  // street level
  g.strokeStyle = 'rgba(255,255,255,0.18)';
  g.beginPath(); g.moveTo(10, Y(0)); g.lineTo(W - 10, Y(0)); g.stroke();
  // the profile, a colour per segment by its grade
  const lim = gradeLimit(r), structs = r.z ? (r.st || segmentStructures(r)) : [];
  for (let i = 0; i < r.pts.length - 1; i++) {
    if (S[i + 1] < s0 || S[i] > s1) continue;
    const L = S[i + 1] - S[i], gr = L > 0.5 ? Math.abs(zOf(r, i, 1) - zOf(r, i, 0)) / L : 0;
    g.strokeStyle = gr > lim + GRADE_TOL ? '#ff4d4d' : gr > lim * 0.8 ? '#ffb347' : '#5fd17a';
    g.lineWidth = structs[i] === 1 ? 3 : 2;
    g.beginPath(); g.moveTo(X(S[i]), Y(zOf(r, i, 0))); g.lineTo(X(S[i + 1]), Y(zOf(r, i, 1))); g.stroke();
    g.fillStyle = '#9fb3c8';
    g.fillRect(X(S[i]) - 1, Y(zOf(r, i, 0)) - 1, 2, 2);
  }
  // other ribbons right here, at their height
  g.fillStyle = '#7fb2ff';
  for (const q of map.roadsNear(x, y, 12)) {
    if (q === r || q.cat === 'foot') continue;
    const qp = project(q, x, y);
    if (qp.d2 > 144) continue;
    const z = zOf(q, qp.i, qp.t);
    g.fillRect(X(pr.s) - 14, Y(z), 28, 1.5);
    g.fillText((q.ref || q.name || q.type).slice(0, 12), X(pr.s) + 16, Y(z) + 4);
  }
  // the player
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(X(pr.s), Y(zNow), 3.5, 0, Math.PI * 2); g.fill();
  const L = S[pr.i + 1] - S[pr.i], grade = L > 0.5 ? (zOf(r, pr.i, 1) - zOf(r, pr.i, 0)) / L : 0;
  g.fillStyle = '#dfe6ee';
  g.fillText(`${(r.ref ? r.ref + ' ' : '') + (r.name || r.type)}`.slice(0, 52), 10, 16);
  g.fillText(`z ${zOf(r, pr.i, pr.t).toFixed(2)} (you ${zNow.toFixed(2)})  grade ${(grade * 100).toFixed(1)} % of ${(lim * 100).toFixed(0)} %`, 10, 30);
  g.fillText(`${STRUCT_NAME[structs[pr.i]] || 'ground'}  order ${gradeOrder(r)}  net ${r.pnet ?? '-'}  ${st ? 'on ' + (st.ribbon === r ? 'this ribbon' : st.kind) : ''}`, 10, H - 8);
}
