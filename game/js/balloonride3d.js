// De THREE- en DOM-kant van de ballonrit (#1377, L3b): de twee inzittenden in de mand en de HUD-regel. De regels staan in balloonride.js, het model van de ballon zelf
// (envelop, mand, brander, vlam) tekent skyprops3d.js uit de scripted ingang in world.balloons.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene, disposeObject } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { basketRiderPose } from './basketrider.js';
import { hoofdspeler } from './players.js';
import { rideHud } from './balloonride.js';

let group = null;
let riders = null;   // { pilot, passenger }: elk { holder, man }
let hudEl = null;

function persoon(app) {
  const holder = new THREE.Group();
  const man = buildPersonMesh(app.shirt, app.skin, app);
  holder.add(man);
  return { holder, man, app };
}

function ensureRiders(w) {
  const scene = getScene();
  if (!scene) return null;
  if (!group) { group = new THREE.Group(); group.name = 'balloonride'; scene.add(group); }
  const anita = hoofdspeler(w) && hoofdspeler(w).character === 'anita';
  const pilotApp = anita ? ANITA_APPEARANCE : TAMMO_APPEARANCE;
  const passApp = anita ? TAMMO_APPEARANCE : ANITA_APPEARANCE;
  if (!riders || riders.pilot.app !== pilotApp) {
    if (riders) { for (const r of [riders.pilot, riders.passenger]) { group.remove(r.holder); disposeObject(r.holder); } }
    riders = { pilot: persoon(pilotApp), passenger: persoon(passApp) };
    group.add(riders.pilot.holder, riders.passenger.holder);
  }
  return riders;
}

function ensureHud() {
  if (hudEl || typeof document === 'undefined') return hudEl;
  hudEl = document.createElement('div');
  hudEl.id = 'balloon-hud';
  hudEl.setAttribute('role', 'status');
  hudEl.style.cssText = 'position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:40;padding:8px 16px;border-radius:10px;background:rgba(20,24,30,.74);color:#f4f1e8;font:600 15px/1.4 system-ui,sans-serif;text-align:center;pointer-events:none;display:none;max-width:90vw';
  hudEl.innerHTML = '<div class="bh-regel"></div><div class="bh-waarschuwing" style="color:#ffcf6a"></div><div class="bh-toetsen" style="font-weight:500;opacity:.8;font-size:13px"></div>';
  document.body.appendChild(hudEl);
  return hudEl;
}

// Elk frame (main.js, na de wereldupdate). De inzittenden staan alleen zolang je meevaart; buiten de rit is alles verborgen.
export function updateBalloonRide3D(w, dt) {
  const ride = w && w.balloonRide;
  if (!ride) {
    if (group) group.visible = false;
    if (hudEl) hudEl.style.display = 'none';
    return;
  }
  const r = ensureRiders(w);
  const v = ride.craft.visual;
  if (r && v) {
    group.visible = true;
    r.pilot.holder.visible = true;
    for (const [rider, slot] of [[r.pilot, 0], [r.passenger, 1]]) {
      const pose = basketRiderPose(v, slot);
      rider.holder.position.set(pose.x, pose.z, pose.y);
      rider.holder.rotation.z = pose.sway;
      rider.man.rotation.y = -pose.heading + Math.PI / 2;
      animatePersonWalk(rider.man, 0, dt);
    }
    r.passenger.holder.visible = !!w.companion;
  }
  const el = ensureHud();
  const h = rideHud(w);
  if (el && h) {
    el.style.display = 'block';
    el.querySelector('.bh-regel').textContent = h.regel;
    el.querySelector('.bh-waarschuwing').textContent = h.waarschuwing || '';
    el.querySelector('.bh-toetsen').textContent = h.toetsen;
  }
}
