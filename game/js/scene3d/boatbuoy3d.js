// Dobbering van de boten: de romp volgt dezelfde golf als de watershader tekent.
// Afgesplitst uit scene3d.js (#497), zonder inhoudelijke wijziging: dezelfde
// namen, dezelfde volgorde, dezelfde commentaren. Pure functie van (mesh, v, world, dt),
// geen import terug naar scene3d.js.
import { boatHullProfile } from '../models3d_vehicles.js';
import { waterIndexAt } from '../waterindex.js';
import { waterSwellAt, waterSwellAmp } from '../water3d.js';
import { golfWip } from '../golven.js';
import { WATER_Y } from '../util.js';

// Gentle swell: heave, roll and pitch from world.time plus a bow lift with
// speed. Needs rotation.order 'YXZ' (set in buildVehicleActor) so roll and
// pitch stay in the hull's own frame after the yaw.
// Buoyancy: the hull rides the same swell the water shader draws (sampled
// at bow, stern and both sides), long hulls averaging it out more; trim
// from speed (planing craft lift their bow), a dip of the bow when braking,
// a heel in turns, and per kind a little extra draft or lift. Whatever the
// pitch and roll, stern, bow and sides stay above the local water level.
const BOAT_TRIM = { rubberboot: 0.075, sloep: 0.035, dinghy: 0.04, rondvaart: 0.012, skutsje: 0.01, kano: 0.004, kajak: 0.004, sup: 0, waterfiets: 0.01, skiff: 0.004, acht: 0.004 };
const BOAT_LIFT = { skiff: 0.02, acht: 0.02, kano: 0.02, kajak: 0.02, sup: 0.03, rubberboot: 0.015, waterfiets: 0.01 };
const BOAT_CLEAR = { skiff: 0.05, acht: 0.05, sup: 0.035, kajak: 0.05, kano: 0.06 };
export function animateBoat(mesh, v, world, dt) {
  const time = world.time;
  const kind = v.isPolice ? 'sloep' : v.model.kind || 'sloep';
  const L = v.model.len, W = v.model.wid, hl = L / 2, hw = W / 2;
  const prof = boatHullProfile(kind, L, W);
  const now = performance.now();
  let sh = v._shore;
  if (!sh || now - sh.at > 400 || Math.abs(sh.x - v.x) + Math.abs(sh.y - v.y) > 3) {
    const idx = world.map ? waterIndexAt(world.map, v.x, v.y) : null;
    const ns = idx ? idx.nearestShore(v.x, v.y, 24) : { d: 24, i: -1, tx: 1, ty: 0 };
    sh = v._shore = { at: now, x: v.x, y: v.y, d: ns.i >= 0 ? ns.d : 24, tx: ns.i >= 0 ? ns.tx : 1, ty: ns.i >= 0 ? ns.ty : 0, open: ns.i < 0 };
  }
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  const at = (lx, lz) => waterSwellAt(v.x + c * lx - s * lz, v.y + s * lx + c * lz, time, Math.max(0.15, sh.d - Math.abs(lz)), sh.tx, sh.ty);
  const xb = hl * 0.85;
  const hB = at(xb, 0), hS = at(-xb, 0), hP = at(0, -hw), hR = at(0, hw), h0 = at(0, 0);
  const resp = Math.min(1, Math.max(0.25, 3.2 / L));
  const speedT = Math.min(1, Math.abs(v.speed) / (v.model.maxSpeed || 6));
  const st = mesh.userData.buoy || (mesh.userData.buoy = { pitch: 0, roll: 0, heave: 0, speed: v.speed, angle: v.angle, acc: 0, yaw: 0 });
  const k = dt > 0 ? Math.min(1, dt * 4) : 1;
  if (dt > 0) {
    let da = v.angle - st.angle;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    st.yaw += (da / dt - st.yaw) * Math.min(1, dt * 3);
    st.acc += ((v.speed - st.speed) / dt - st.acc) * Math.min(1, dt * 3);
  }
  st.angle = v.angle; st.speed = v.speed;
  const seed = (v.id || 0) * 1.7;
  const trim = (BOAT_TRIM[kind] ?? 0.03) * speedT * (v.speed >= 0 ? 1 : -0.5) - Math.max(-0.03, Math.min(0.03, st.acc * -0.012 * (v.speed > 0 ? 1 : 0)));
  const planing = kind === 'rubberboot' ? 1 : -1;
  const heel = Math.max(-0.08, Math.min(0.08, st.yaw * Math.abs(v.speed) * 0.025 * planing * resp));
  const wip = golfWip(v, time);
  const pitchT = Math.atan2(hB - hS, 2 * xb) * resp + trim + Math.sin(time * 1.1 + seed) * 0.006 + wip.pitch;
  const rollT = Math.atan2(hP - hR, W) * Math.min(1, resp * 1.4) * 0.8 + heel + Math.sin(time * 1.4 + seed * 0.7) * 0.008 + wip.roll;
  const heaveT = (hB + hS + hP + hR + h0 * 2) / 6 * (0.6 + 0.4 * resp) + (BOAT_LIFT[kind] || 0);
  st.pitch += (pitchT - st.pitch) * k;
  st.roll += (rollT - st.roll) * k;
  st.heave += (heaveT - st.heave) * Math.min(1, k * 1.5);
  // no gunwale under the surface: lift the hull by the worst deficit
  const clear = (BOAT_CLEAR[kind] ?? 0.1) + (sh.open ? waterSwellAmp() * 0.5 : 0);
  const sp = Math.sin(st.pitch), sr = Math.sin(st.roll);
  const deficit = Math.max(
    hS + clear - (st.heave + prof.stern - sp * hl),
    hB + clear - (st.heave + prof.bow + sp * hl),
    hP + clear - (st.heave + prof.mid + sr * hw),
    hR + clear - (st.heave + prof.mid - sr * hw),
    0,
  );
  mesh.rotation.order = 'YZX';
  const base = WATER_Y + (v._lift || 0);
  mesh.position.y = base + st.heave + deficit;
  mesh.rotation.z = st.pitch;
  mesh.rotation.x = st.roll;
  v._buoyY = mesh.position.y - base;
}
