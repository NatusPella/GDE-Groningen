// De THREE- en DOM-kant van de ballonrit (#1377, L3b): de twee inzittenden in de mand en de HUD-regel. De regels staan in balloonride.js, het model van de ballon zelf
// (envelop, mand, brander, vlam) tekent skyprops3d.js uit de scripted ingang in world.balloons.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene, disposeObject } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { basketRiderPose } from './basketrider.js';
import { hoofdspeler } from './players.js';
import { rideHud } from './balloonride.js';
import { keyWord } from './controls.js';
import { getSettings } from './settings.js';

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

// Dezelfde papieren kaart als de heli-HUD (helirun.js): de kleuren en maten komen uit de ds-tokens, geen eigen kleuren.
const CSS = `
#balloon-hud[hidden] { display: none; }
#balloon-hud { position: fixed; left: 50%; bottom: 92px; transform: translateX(-50%); z-index: 5; pointer-events: none; text-align: center; max-width: 90vw; padding: 8px 18px 10px; background: var(--ds-c-ink-papier); color: var(--ds-c-ink-inkt); border: var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt); border-radius: var(--ds-r); box-shadow: var(--ds-schaduw-hard); font-family: var(--ds-font-zeef-kop); font-weight: 600; }
#balloon-hud .bh-regel { font-size: 20px; letter-spacing: 1px; }
#balloon-hud .bh-waarschuwing { font-size: 16px; color: var(--ds-c-rood-tx); }
#balloon-hud .bh-waarschuwing:empty { display: none; }
#balloon-hud .bh-toetsen { font: 14px var(--ds-font-zeef-tekst); color: var(--ds-c-inkt-zacht); }
`;

function ensureHud() {
  if (hudEl || typeof document === 'undefined') return hudEl;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  hudEl = document.createElement('div');
  hudEl.id = 'balloon-hud';
  hudEl.hidden = true;
  hudEl.setAttribute('role', 'status');
  hudEl.innerHTML = '<div class="bh-regel"></div><div class="bh-waarschuwing"></div><div class="bh-toetsen"></div>';
  document.body.appendChild(hudEl);
  return hudEl;
}

// Elk frame (main.js, na de wereldupdate). De inzittenden staan alleen zolang je meevaart; buiten de rit is alles verborgen.
export function updateBalloonRide3D(w, dt) {
  const ride = w && w.balloonRide;
  if (!ride) {
    if (group) group.visible = false;
    if (hudEl) hudEl.hidden = true;
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
    el.hidden = false;
    el.querySelector('.bh-regel').textContent = h.regel;
    el.querySelector('.bh-waarschuwing').textContent = h.waarschuwing || '';
    el.querySelector('.bh-toetsen').textContent = h.toetsen.map(({ k, wat }) => `${keyWord(getSettings().keyBinds, k)}: ${wat}`).join('   ');
  }
}
