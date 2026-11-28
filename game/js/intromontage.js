import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene, getCamera, disposeObject, releaseWarmupSamples, releaseHeldMaterials, setCinematicBatches } from './scene3d.js';
import { setHoldGrass } from './grass.js';
import { buildPersonMesh, animatePersonWalk, seatPose, seatedY, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { modularHoldPose } from './modularpeople.js';
import { vehicleSeat } from './seating3d.js';
import { Vehicle, MODELS, makeTwoWheeler, spawnHeroCarNear, spawnVehicleOnRoad, manageTrafficPopulation, manageBikePopulation, updateTrafficAI, resolveVehicleBuildingCollision } from './vehicle.js';
import { BOAT_KINDS } from './boattypes.js';
import { spawnPedestriansNear, updatePedestrians } from './pedestrians.js';
import { updateTrafficLights } from './trafficlights.js';
import { refreshDayNight } from './daynight.js';
import { playCinematic, skipCinematic } from './cinematics.js';
import { roofAt } from './camerapath.js';
import { cellPropSpots, CLUTTER_CELL } from './cityprops.js';
import { lineVoiceFor, NARRATOR } from './linevoice.js';
import { dualHtml } from './subtitles.js';
import { speakerHtml } from './speakers.js';
import { playStoryVoice, stopStoryVoice, setStoryScene } from './audio.js';
import { buildRadioStudio } from './radiostudio.js';
import { setThemeDuck, cueTheme } from './theme.js';
import { sfxEvent } from './sfx/haken.js';
import { scriptHeli } from './skyprops.js';
import { buildPigeonBird, posePigeonBird } from './pigeonmode.js';
import { routeAt as canalAt, ROUTE_LENGTH as CANAL_LENGTH } from './rondvaartchase.js';
import { RING_ROUTE } from './ringroute.js';
import { smoothPath, pathHeights, cineDrive } from './cinedrive.js';
import { WATER_Y, isInWater } from './util.js';
import { waterPointNear, quaySpotFor } from './introwater.js';
import { KITCHEN, buildKitchen, buildAtmTrailer, buildWetBike, buildFrikandel, buildRope } from './introkitchen3d.js';
import { logoHtml } from './logo.js';
import { PARTS, partNumber } from './storyarc.js';
import { homeSpawnPoint } from './home.js';
import { DECOR_MAKERS, shadowDisc, disposeModel } from './storyprops.js';
import { jumpsFromStops, stopsFromStart } from './cutscenewarm.js';
import { KEYS } from './storagekeys.js';
import { TABLE_SIT } from './cutscenemodels.js';
import { BIRDS, makeBirds, scatterBirds, updateBirds } from './birds.js';
import { setIntroPlaying } from './trailerstate.js';
import { openBank } from './voicebank.js';
import { hoofdspeler } from './players.js'; // de speler van dit apparaat (#500)
import { ensureSubtitleCss } from './subtitleui.js';
import { TITLE, SEQUENCE, NAME_CARDS, FILM_VOICES, SFX_KOPPELING, engineLines, themeEntryShot } from './openingfilm.js'; // titelkaart en slogan komen uit de filmdata (docs/verhaal/OPENING-FILMSCRIPT-21-11.md)

// Recorded montage dialogue: the story manifest ("<speaker>|<text>"), then the
// lines manifest (linevoice.js) for the newer lines.
const VOICE_DIR = openBank('story').dir;
const voices = openBank('story').entries;

// Opening of a fresh game, cut to the theme's beat (docs/verhaal/nieuw/09-script-akte1.md,
// "Trailer" and "Opening"): first a game-trailer parody (sun on d'Olle
// Grieze, cyclists, a gull with a frikandel, freeze frames with name cards
// for Tessa and Tammo, flashes ahead in the story, the title), then the
// opening scene: dawn in the Oosterparkwijk, Rikus on Nachtstreek, the
// attic kitchen table where the snack van gets its car and the two of
// them a flat (the rent split in two), then moving day at the House of
// Groningen in Paddepoel. Ends in the swoop down to the spawn there, their
// new home. Narration it told is skipped in H1's intro.

const SEEN_KEY = KEYS.introSeen;
const PED_TARGET = 40;

function markIntroSeen() {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* ignore */ }
}

const P = (x, y, z) => ({ x, y, z });
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };

function shake(t, amp, seed = 0) {
  return P(
    (Math.sin(t * 1.3 + seed) + Math.sin(t * 2.9 + seed * 2) * 0.5) * amp,
    (Math.sin(t * 1.7 + seed * 3) + Math.sin(t * 3.3 + seed) * 0.5) * amp,
    (Math.sin(t * 1.1 + seed * 5) + Math.sin(t * 2.3 + seed * 4) * 0.4) * amp * 0.6,
  );
}

function pose(pos, look, fov, t = 0, amp = 0) {
  const s = shake(t, amp, 1), l = shake(t, amp * 1.6, 7);
  return {
    position: P(pos.x + s.x, pos.y + s.y, pos.z + s.z),
    lookAt: P(look.x + l.x, look.y + l.y, look.z + l.z),
    fov, cut: true,
  };
}

function polyline(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1];
  return {
    len,
    at(s) {
      s = Math.max(0, Math.min(len - 1e-3, s));
      let i = 1;
      while (i < cum.length - 1 && cum[i] < s) i++;
      const a = pts[i - 1], b = pts[i];
      const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      return { x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t), a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    },
  };
}

// --- styling -----------------------------------------------------------------

const CSS = `
#intro-montage { position: fixed; inset: 0; z-index: 16; pointer-events: none; font-family: var(--ds-font-zeef-kop); color: var(--ds-c-ink-papier); opacity: 0; transition: opacity 0.3s; } /* ds3-film: scene */
#intro-montage.on { opacity: 1; }
#intro-montage > div:not(.ds-sub) { position: absolute; inset: 0; }
#intro-montage .im-grade { background: linear-gradient(160deg, rgba(0, 150, 170, 0.22) 0%, color-mix(in srgb, var(--ds-c-ink-inkt) 0%, transparent) 45%, rgba(255, 128, 40, 0.2) 100%); mix-blend-mode: soft-light; }
#intro-montage .im-vig { background: radial-gradient(ellipse at center, color-mix(in srgb, var(--ds-c-ink-inkt) 0%, transparent) 55%, rgba(4, 10, 8, 0.55) 100%); }
#intro-montage .im-grain { background-image: var(--grain); opacity: 0.07; animation: grain 0.5s steps(4) infinite; } /* ds3-film: scene */
#intro-montage .im-flare { opacity: 0; transition: opacity 0.8s; mix-blend-mode: screen;
  background: radial-gradient(circle at var(--fx, 80%) var(--fy, 20%), rgba(255, 214, 150, 0.75) 0, rgba(255, 170, 80, 0.28) 7%, rgba(255, 140, 60, 0) 26%),
    radial-gradient(circle at calc(100% - var(--fx, 80%)) calc(100% - var(--fy, 20%)), rgba(120, 220, 200, 0.18) 0, rgba(120, 220, 200, 0) 7%),
    radial-gradient(circle at calc(50% + (50% - var(--fx, 80%)) * 0.4) calc(50% + (50% - var(--fy, 20%)) * 0.4), rgba(255, 190, 120, 0.14) 0, rgba(255, 190, 120, 0) 4%),
    linear-gradient(90deg, rgba(255, 180, 90, 0) 0%, rgba(255, 180, 90, 0.08) 50%, rgba(255, 180, 90, 0) 100%); }
#intro-montage .im-flare.on { opacity: var(--fa, 1); }
#intro-montage .im-black { background: var(--ds-c-glas); opacity: 0; transition: opacity 0.35s; } /* ds3-film: scene */
#intro-montage .im-black.on { opacity: 1; transition: opacity 0.12s; }
#intro-montage .im-flash { background: var(--ds-c-papier); opacity: 0; }
#intro-montage .im-flash.go { animation: im-flash 0.28s ease-out; }
@keyframes im-flash { 0% { opacity: 0.85; } 100% { opacity: 0; } }
#intro-montage .im-card { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; opacity: 0; padding: 0 6vw; text-shadow: 3px 3px 0 var(--ds-c-ink-roze); }
#intro-montage .im-card .im-tagline { margin-top: 14px; font-size: clamp(22px, 2.8vw, 38px); letter-spacing: 1px; }
#intro-montage .im-card .im-tagline + .im-kicker { margin-top: 10px; }
#intro-montage .im-card.on { animation: im-card-in 2.4s cubic-bezier(0.15, 0.7, 0.2, 1) forwards; }
@keyframes im-card-in { 0% { opacity: 0; transform: scale(1.18); letter-spacing: 0.02em; } 18% { opacity: 1; } 82% { opacity: 1; } 100% { opacity: 0; transform: scale(1); letter-spacing: 0.12em; } }
#intro-montage .im-kicker { font-size: clamp(16px, 2vw, 26px); letter-spacing: 6px; color: var(--ds-c-ink-papier); text-transform: uppercase; margin-bottom: 6px; }
#intro-montage .im-title { font-size: clamp(56px, 11vw, 160px); line-height: 0.9; text-transform: uppercase; text-shadow: 3px 3px 0 var(--ds-c-ink-roze); }
#intro-montage .im-title .amp { color: var(--ds-c-ink-roze); }
#intro-montage .im-card .gde-logo { font-size: clamp(110px, 19vw, 230px); text-shadow: none; }
#intro-montage .im-lower { top: auto; bottom: calc(11vh + 6vh); left: 6vw; right: auto; opacity: 0; transform: translateX(-30px); transition: opacity 0.5s, transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1); text-shadow: 2px 2px 0 var(--ds-c-ink-inkt); } /* ds3-film: scene */
#intro-montage .im-lower.on { opacity: 1; transform: none; }
#intro-montage .im-lower .im-title { font-size: clamp(48px, 8vw, 110px); }
#intro-montage .im-lower .im-title::after { content: ''; display: block; width: 130px; height: 4px; margin-top: 10px; background: var(--ds-c-ink-geel); border: 2px solid var(--ds-c-ink-inkt); box-shadow: 3px 3px 0 var(--ds-c-ink-roze); }
#intro-montage .im-cap { top: calc(11vh + 3.5vh); left: 6vw; right: auto; bottom: auto; max-width: min(70vw, 760px); opacity: 0; transform: translateY(-10px); transition: opacity 0.6s, transform 0.8s cubic-bezier(0.2, 0.7, 0.2, 1); text-shadow: 2px 2px 0 var(--ds-c-ink-inkt); } /* ds3-film: scene */
#intro-montage .im-cap.on { opacity: 1; transform: none; }
#intro-montage .im-cap small { display: block; font-size: clamp(14px, 1.4vw, 19px); letter-spacing: 4px; color: var(--ds-c-ink-papier); }
#intro-montage .im-cap span { display: block; margin-top: 2px; font-size: clamp(26px, 3.2vw, 44px); line-height: 1; letter-spacing: 1px; }
#intro-montage .im-lower .im-role { font-family: var(--ds-font-tekst); font-size: clamp(18px, 2vw, 28px); letter-spacing: 0.4px; margin-top: 8px; max-width: min(70vw, 640px); color: color-mix(in srgb, var(--ds-c-ink-papier) 92%, transparent); }
@keyframes im-card-fade { 0% { opacity: 0; } 18% { opacity: 1; } 82% { opacity: 1; } 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { #intro-montage .im-card.on { animation-name: im-card-fade; } #intro-montage .im-grain { animation: none; } }
html.reduce-motion #intro-montage .im-card.on { animation-name: im-card-fade; }
html.reduce-motion #intro-montage .im-grain { animation: none; }
/* De kleurcorrectie van de montage zit in de im-grade-overlay; een CSS-filter op het WebGL-canvas kost op de echte GPU meetbaar fps (intro 5->11 fps bij 0 s, 11->28 fps bij 25 s). */

`;

let ui = null;

function ensureUi() {
  if (ui) return ui;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'intro-montage';
  root.setAttribute('aria-live', 'polite');
  root.innerHTML = '<div class="im-grade"></div><div class="im-vig"></div><div class="im-flare"></div><div class="im-grain"></div>' +
    '<div class="im-flash"></div><div class="im-black"></div><div class="im-card"></div><div class="im-cap"></div><div class="im-lower"></div><div class="ds-sub ds-sub--film im-sub" role="status" aria-live="polite"></div>';
  document.body.appendChild(root);
  const q = (s) => root.querySelector(s);
  ensureSubtitleCss();
  ui = { root, flare: q('.im-flare'), flash: q('.im-flash'), black: q('.im-black'), card: q('.im-card'), cap: q('.im-cap'), lower: q('.im-lower'), sub: q('.im-sub'), subKey: '', tagKey: '' };
  return ui;
}

function flash() {
  ui.flash.classList.remove('go');
  void ui.flash.offsetWidth;
  ui.flash.classList.add('go');
}

function setSub(line) {
  const key = line ? line.who + line.text : '';
  if (key === ui.subKey) return;
  ui.subKey = key;
  // a new line starts its recording; clearing the subtitle lets it finish.
  // The theme dips under the voices and swells between them.
  if (line && line.voice) playStoryVoice(line.voice, { radio: !!line.radio });
  setThemeDuck(!!line);
  ui.sub.classList.toggle('on', !!line);
  if (line) ui.sub.innerHTML = speakerHtml(line.who) + dualHtml(line.text, { gloss: true });
}

function clockText(h) {
  const m = Math.round((((h % 24) + 24) % 24) * 60);
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// Name tag in the lower third while a character is introduced.
function setTag(tag) {
  const key = tag ? tag.name : '';
  if (key === ui.tagKey) return;
  ui.tagKey = key;
  if (!tag) { ui.lower.classList.remove('on'); return; }
  ui.lower.innerHTML = `<div class="im-title">${tag.name}</div><div class="im-role">${tag.role}</div>`;
  ui.lower.classList.remove('on');
  void ui.lower.offsetWidth;
  ui.lower.classList.add('on');
}

function showCard(html, dur) {
  ui.card.classList.remove('on');
  ui.card.style.animationDuration = dur + 's';
  ui.card.innerHTML = html;
  void ui.card.offsetWidth;
  ui.card.classList.add('on');
}

// --- props -------------------------------------------------------------------

// one shadow under every montage actor, from the shared factory (storyprops.js shadowDisc): its geometry and material are flagged
// as shared, so the scene's cleaner keeps them when a single actor is removed (disposeObject checks this flag)

export function makeActor(app) {
  const m = buildPersonMesh(app.shirt, app.skin, app);
  m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const sh = shadowDisc();
  sh.position.y = 0.03;
  sh.renderOrder = 1;
  m.add(sh);
  m.userData.blob = sh;
  return m;
}

function resetArms(ud) {
  if (ud.qRig) { ud.qParams = null; ud.gazeT = 0; return; }   // modulaire mens (ADR 0050): de state-machine zet de armen zelf
  for (const k of ['armL', 'armR']) { ud[k].rotation.x = 0; ud[k].rotation.y = 0; }
  if (ud.head) ud.head.rotation.y = 0;
}

// De houdingen van de montage op een modulaire mens: dragen en vasthouden met de hand-IK, kijken met de blik; de rest (kus, leunen,
// handen in de zij) laat de clip staan.
function applyPoseModular(m, name) {
  const ud = m.userData;
  if (name === 'cups' || name === 'door' || name === 'bag' || name === 'pull') modularHoldPose(m, 'low');
  else if (name === 'rope') modularHoldPose(m, 'up');
  else if (name === 'lookL') ud.gazeT = 0.35;
  else if (name === 'lookR') ud.gazeT = -0.35;
  else if (name === 'lean') m.rotation.z = 0.13;
}

function applyPose(m, name, t) {
  const ud = m.userData;
  if (ud.qRig) { applyPoseModular(m, name); return; }
  const arm = (a, e, z, ez, x = 0) => { a.rotation.set(x, 0, z); if (e) e.rotation.z = ez; };
  switch (name) {
    case 'bag':
      arm(ud.armR, ud.elbowR, 0.08, 0.15, 0.12);
      break;
    case 'throw': {
      const k = 0.5 + Math.sin(t * 5) * 0.5;
      arm(ud.armL, ud.elbowL, 2.2 + k * 0.5, 0.4, -0.3);
      break;
    }
    case 'kissT':
      ud.chest.rotation.z = -0.1;
      ud.head.rotation.z = -0.22;
      arm(ud.armL, ud.elbowL, 0.75, 1.25, -0.5);
      arm(ud.armR, ud.elbowR, 0.75, 1.25, 0.5);
      break;
    case 'kissA':
      ud.chest.rotation.z = -0.04;
      ud.head.rotation.z = 0.12;
      arm(ud.armL, ud.elbowL, 2.05, 1.3, -0.45);
      arm(ud.armR, ud.elbowR, 2.05, 1.3, 0.45);
      break;
    case 'lean':
      m.rotation.z = 0.13;
      ud.head.rotation.z = 0.08;
      ud.head.rotation.y = 0.25 + Math.sin(t * 0.6) * 0.08;
      arm(ud.armL, ud.elbowL, 0.3, 1.55, 0.5);
      arm(ud.armR, ud.elbowR, 0.35, 1.5, -0.5);
      break;
    case 'hips':
      arm(ud.armL, ud.elbowL, -0.35, 1.9, 0.55);
      arm(ud.armR, ud.elbowR, -0.35, 1.9, -0.55);
      break;
    case 'lookL':
      ud.head.rotation.y = 0.35;
      break;
    case 'lookR':
      ud.head.rotation.y = -0.35;
      break;
    // two coffees carried in front of the chest
    case 'cups':
      arm(ud.armL, ud.elbowL, 0.25, 1.35, 0.1);
      arm(ud.armR, ud.elbowR, 0.25, 1.35, -0.1);
      break;
    // coffee in the left hand, the right holding a door open; a guilty look
    case 'door':
      arm(ud.armL, ud.elbowL, 0.25, 1.35, 0.1);
      arm(ud.armR, ud.elbowR, 1.2, 0.3, -0.45);
      ud.head.rotation.z = -0.1;
      break;
    // towing: the right hand back on a drawbar, leaning into it
    case 'pull':
      ud.chest.rotation.z = -0.1;
      arm(ud.armR, ud.elbowR, -0.45, 0.2, -0.15);
      arm(ud.armL, ud.elbowL, 0.3 + Math.sin(t * 6) * 0.15, 0.4);
      break;
    // hanging from a rope, both hands up
    case 'rope':
      ud.head.rotation.z = 0.25;
      arm(ud.armL, ud.elbowL, 2.9, 0.15, -0.1);
      arm(ud.armR, ud.elbowR, 2.9, 0.15, 0.1);
      break;
  }
}

// --- montage runtime ----------------------------------------------------------

let run = null;

// Debug/test: when each shot (and each camera within it) starts.
export function introClock() {
  return run ? run.lastT + run.offset : null;
}

export function introTimeline() {
  return run && run.shots.map((s, i) => ({ i, start: run.starts[i], dur: s.dur, cams: s.camAt || [0], lines: s.timed.map((l) => [l.who, +l.at.toFixed(2), +l.dur.toFixed(2)]) }));
}

export function stage(m, x, y, a, { h = 0, speed = 0, pose: name = null, dt = 0, t = 0 } = {}) {
  const ud = m.userData;
  m.visible = true;
  if (ud.seated) {
    ud.seated = false;
    ud.walkBlend = 0;
  }
  m.position.set(x, h, y);
  m.rotation.set(0, -a, 0);
  resetArms(ud);
  animatePersonWalk(m, speed, dt);
  if (name) applyPose(m, name, t);
  ud.blob.visible = true;
}

// Seats a cast member like the game seats anyone (seating3d.js vehicleSeat);
// the driver's seat then has no generic NPC driver figure drawn on it.
export function seat(m, v, driver) {
  const st = vehicleSeat(v, driver);
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  m.visible = true;
  resetArms(m.userData);
  seatPose(m, st.pose);
  m.position.set(v.x + c * st.x - s * st.z, (v.z || 0) + seatedY(m, st.y), v.y + s * st.x + c * st.z);
  m.rotation.set(0, -v.angle, 0);
  m.userData.blob.visible = false;
  if (driver) v.castDriver = true;
}

function moveSet(r, x, y) {
  const w = r.w, map = w.map;
  const [sx, sy] = map.escapeBuilding(x, y);
  // de montage zet de speler zelf neer tussen twee shots: een schrijfactie op het
  // eigen lichaam, dus bewust hoofdspeler(world) en niet hoofdspeler (#500)
  const p = hoofdspeler(w);
  p.x = sx; p.y = sy; p.vx = 0; p.vy = 0;
  const c = w.companion;
  if (c && !c.inVehicle) { c.x = sx + 0.8; c.y = sy; c.vx = 0; c.vy = 0; }
  try {
    manageTrafficPopulation(w);
    manageBikePopulation(w);
    w.pedestrians = w.pedestrians.filter((q) => q.state === 'dead' || Math.hypot(q.x - sx, q.y - sy) < 150);
    if (w.pedestrians.length < PED_TARGET) w.pedestrians.push(...spawnPedestriansNear(map, sx, sy, PED_TARGET - w.pedestrians.length, Math.random));
  } catch (e) { console.warn(e); }
}

// Per shot: clear skies, or a little morning mist.
function setWeather(w, mist = 0) {
  w.weather = { active: false, timer: 1e9, kind: undefined, peak: 0, intensity: 0, wet: 0, overcast: mist * 0.5, mist, windAngle: 0.9, elapsed: 0, duration: Infinity };
}

function setClock(w, h) {
  w.clock = ((h % 24) + 24) % 24;
  refreshDayNight(w);
}

// hero: the red Fjord Escapade; model: that vehicle model; otherwise the Fjord too
function tempCar(r, x, y, a, { police = false, model = null } = {}) {
  const w = r.w, map = w.map;
  let v;
  if (model) v = new Vehicle(x, y, a, model);
  else if (police) {
    const rp = map.nearestRoadPoint(x, y, 200, true);
    if (!rp) return null;
    v = spawnVehicleOnRoad(map, rp.road, true, Math.random, false, false, rp);
  } else {
    v = spawnHeroCarNear(map, x, y);
    if (!v) return null;
    v.isHeroCar = false;
  }
  v.x = x; v.y = y; v.angle = a; v.speed = 0;
  v.road = null; v.plan = [];
  v.driver = 'cine';
  v.cineTemp = true;
  v.missionCar = true;
  v.z = map.spawnZ ? map.spawnZ(x, y) : 0;
  w.vehicles.push(v);
  r.cars.push(v);
  return v;
}

// a cyclist (bike with its own rider) moved by the shot
function tempBike(r, x, y, a) {
  const v = makeTwoWheeler('bike', x, y, a);
  Object.assign(v, { road: null, plan: [], driver: 'cine', cineTemp: true, missionCar: true, z: r.w.map.spawnZ ? r.w.map.spawnZ(x, y) : 0 });
  r.w.vehicles.push(v);
  r.cars.push(v);
  return v;
}

function tempBoat(r, x, y, a, model) {
  const v = new Vehicle(x, y, a, model);
  Object.assign(v, { isBoat: true, road: null, plan: [], driver: 'cine', cineTemp: true, missionCar: true });
  r.w.vehicles.push(v);
  r.cars.push(v);
  return v;
}

function disposeOwned(o) {
  o.removeFromParent();
  for (const x of (o.userData && o.userData.own) || []) x.dispose();
}

// a mesh tree with cached materials (birds): only its geometry goes
function disposeGeometry(o) {
  o.removeFromParent();
  o.traverse((x) => { if (x.geometry) x.geometry.dispose(); });
}

function canalNear(x, y) {
  let best = 0, bd = Infinity;
  for (let s = 0; s < CANAL_LENGTH; s += 6) {
    const q = canalAt(s);
    const d = Math.hypot(q.x - x, q.y - y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

function clearRoadNear(r, path, dist) {
  const w = r.w;
  w.vehicles = w.vehicles.filter((v) => {
    if (v.cineTemp || v.isHeroCar || v.driver === 'player' || v.isBoat) return true;
    for (let s = 0; s < path.len; s += 4) {
      const q = path.at(s);
      if (Math.hypot(v.x - q.x, v.y - q.y) < dist) return false;
    }
    return true;
  });
}

function removeTempCars(r) {
  if (!r.cars.length) return;
  const set = new Set(r.cars);
  r.w.vehicles = r.w.vehicles.filter((v) => !set.has(v));
  r.cars = [];
}

function ambient(r, dt, slow) {
  if (r.ambientBroken || dt <= 0) return;
  const w = r.w;
  try {
    updateTrafficLights(dt, w);
    if (slow > 0.8) {
      for (const v of w.vehicles) {
        if (v.driver === 'player' || v.isPolice || v.isBoat || v.cineTemp || v.isHeroCar || v.wrecked) continue;
        updateTrafficAI(v, dt, w.map, w, Math.random);
        resolveVehicleBuildingCollision(v, w.map, dt);
      }
    }
    updatePedestrians(dt, w);
    if (slow < 1) for (const q of w.pedestrians) if (q.speed) q.speed *= Math.max(0.3, slow);
  } catch (e) {
    console.warn('intro ambient', e);
    r.ambientBroken = true;
  }
}

function sfx(w, kind, x, y, extra = {}) {
  (w.audioEvents || (w.audioEvents = [])).push({ kind, x, y, ...extra });
}

function landmark(w, name, fb) {
  const lm = (w.map.meta.landmarks || []).find((l) => l.name === name);
  return lm ? { x: lm.x, y: lm.y } : fb;
}

// --- geometry helpers ---------------------------------------------------------------

// The nearest drivable street point to (x, y) with the street's heading.
function street(map, x, y) {
  const rp = map.nearestRoadPoint(x, y, 200, true, true);
  if (!rp) return { x, y, a: 0 };
  let best = null;
  const p = rp.road.pts;
  for (let i = 0; i < p.length - 1; i++) {
    const ax = p[i][0], ay = p[i][1], dx = p[i + 1][0] - ax, dy = p[i + 1][1] - ay;
    const L2 = dx * dx + dy * dy || 1;
    const u = Math.max(0, Math.min(1, ((rp.x - ax) * dx + (rp.y - ay) * dy) / L2));
    const d = Math.hypot(ax + dx * u - rp.x, ay + dy * u - rp.y);
    if (!best || d < best.d) best = { d, a: Math.atan2(dy, dx) };
  }
  return { x: rp.x, y: rp.y, a: best ? best.a : 0, road: rp.road };
}

// A camera position is never inside a building: lifted over its roof.
function clearCam(map, q) {
  const top = roofAt(map, q.x, q.y);
  return top && q.z < top + 1.2 ? P(q.x, q.y, top + 1.2) : q;
}

// The street clutter (parked bikes, racks, stalls) is merged into static
// cell meshes, so a low camera can't move it: it moves itself instead.
const propCells = new Map();
function propsAround(map, x, y, r) {
  const out = [];
  for (let gx = Math.floor((x - r) / CLUTTER_CELL); gx <= Math.floor((x + r) / CLUTTER_CELL); gx++) {
    for (let gy = Math.floor((y - r) / CLUTTER_CELL); gy <= Math.floor((y + r) / CLUTTER_CELL); gy++) {
      const k = gx + ',' + gy;
      if (!propCells.has(k)) propCells.set(k, cellPropSpots(map, gx, gy));
      for (const q of propCells.get(k)) if (Math.hypot(q.x - x, q.y - y) <= r) out.push(q);
    }
  }
  return out;
}

// Whether no prop stands in the first `near` metres in front of a camera at
// pos looking at look (a cone a little wider than the frame).
function viewClear(map, pos, look, near = 4) {
  const dx = look.x - pos.x, dy = look.y - pos.y, dl = Math.hypot(dx, dy) || 1;
  const fx = dx / dl, fy = dy / dl;
  return propsAround(map, pos.x, pos.y, near + 1).every((q) => {
    const rx = q.x - pos.x, ry = q.y - pos.y;
    const f = rx * fx + ry * fy, side = Math.abs(rx * fy - ry * fx);
    return Math.hypot(rx, ry) > 1.2 && (f < 0 || f > near || side > 0.8 + f * 0.6);
  });
}

// The first candidate camera spot with a clear view (or the first one).
function clearSpot(map, spots, look, near) {
  return spots.find((q) => viewClear(map, q, look, near)) || spots[0];
}

// --- shots ---------------------------------------------------------------------

// The theme restarts with the montage: 111 bpm, first beat at 0.33 s, so
// shots end on a beat.
const BEAT = 60 / 111;
const BEAT0 = 0.331;

// The kitchen set is shared by several shots: built once, hidden between them.
function useKitchen(r, at) {
  if (!r.kit) {
    r.kit = buildKitchen(at.x, at.y, at.z);
    getScene().add(r.kit.group);
  }
  r.kit.group.visible = true;
  r.kit.reset();
  return r.kit;
}

// Trailer: sun on d'Olle Grieze, cyclists, a gull, a work boat, freeze
// frames with name cards for Tessa and Tammo, flashes ahead (a pigeon over
// the museum, the trekker-limo on the ring, a skidding tanker, a man on a
// rope under a helicopter over the Oosterpark), the title. Opening: dawn in
// the Oosterparkwijk, Rikus on the radio, the kitchen table.
function buildShots(w, film = false) {
  const map = w.map;
  const tower = landmark(w, 'Martinitoren', { x: 213.81, y: 9.9 });
  const vismarkt = landmark(w, 'Vismarkt', { x: 16.36, y: 255.74 });
  const museum = landmark(w, 'Groninger Museum', { x: 83.35, y: 802.56 });
  // the Oosterpark itself (the park polygon in the city tiles) and Tammo's
  // street on its south-east edge: the Korenbloemstraat
  const park = { x: 1142.19, y: -942.61 };
  const homeSt = { x: 1308.82, y: -805.45 }, homeDoor = { x: 1309.06, y: -791.36 };
  const home = street(map, homeSt.x, homeSt.y);
  const hf = { x: Math.cos(home.a), y: Math.sin(home.a) };
  let hn = { x: -hf.y, y: hf.x };
  if (hn.x * (homeDoor.x - home.x) + hn.y * (homeDoor.y - home.y) < 0) hn = { x: -hn.x, y: -hn.y };
  const car = { x: home.x + hn.x * 2.3, y: home.y + hn.y * 2.3 };
  const attic = { x: home.x + hn.x * 9.5, y: home.y + hn.y * 9.5 };
  // the kitchen and the radio studio, high above the street
  const KIT = { x: home.x, y: home.y, z: 345 };
  const K = (u, v, h) => P(KIT.x + u, KIT.y + v, KIT.z + h);
  const toE = Math.atan2(home.y - tower.y, home.x - tower.x);

  const stageK = (m, u, v, a, o = {}) => stage(m, KIT.x + u, KIT.y + v, a, { ...o, h: KIT.z });
  const sitK = (m, s, a, headPitch = 0, headYaw = 0) => {
    const ud = m.userData;
    m.visible = true;
    resetArms(ud);
    seatPose(m, TABLE_SIT);
    m.position.set(KIT.x + s.u, KIT.z + seatedY(m, KITCHEN.seatH), KIT.y + s.v);
    m.rotation.set(0, -a, 0);
    // seatPose has just set the head, so the look is added on top of it
    if (ud.head && ud.pelvis) { ud.head.rotation.z += headPitch; ud.head.rotation.y = headYaw; }
    ud.blob.visible = false;
  };
  const anitaHead = K(KITCHEN.anitaSeat.u, KITCHEN.anitaSeat.v, 1.14);
  const tammoHead = K(KITCHEN.tammoSeat.u, KITCHEN.tammoSeat.v, 1.18);

  // --- trailer ---------------------------------------------------------------

  // sun on d'Olle Grieze instead of palm trees: a crane up along the tower
  const sun = {
    minDur: 2.4, clock: 5.4, focus: tower, flare: { x: 78, y: 22, a: 0.9 },
    card: '<div class="im-title">Grunn.</div>', cardDur: 2.6,
    cams: [[0, (u, t) => {
      const k = smooth(u), a = toE + Math.PI + 0.5;
      const pos = P(tower.x + Math.cos(a) * 52, tower.y + Math.sin(a) * 52, lerp(16, 70, k));
      return pose(clearCam(map, pos), P(tower.x, tower.y, lerp(38, 92, k)), lerp(50, 44, k), t, 0.05);
    }]],
  };

  // cyclists instead of flamingos: a nature-film long lens at the kerb
  const bst = street(map, vismarkt.x, vismarkt.y);
  const bf = { x: Math.cos(bst.a), y: Math.sin(bst.a) }, bn = { x: -bf.y, y: bf.x };
  const blane = (d, off) => ({ x: bst.x + bf.x * d + bn.x * off, y: bst.y + bf.y * d + bn.y * off });
  const bikes = {
    minDur: 1.9, clock: 9.1, focus: bst,
    card: '<div class="im-title">Een zomer.</div>', cardDur: 2.5,
    enter(r, s) {
      clearRoadNear(r, polyline([[bst.x - bf.x * 30, bst.y - bf.y * 30], [bst.x + bf.x * 30, bst.y + bf.y * 30]]), 6);
      s.b = [0, 1, 2, 3, 4, 5].map((i) => ({ d: -16 + i * 2.6 + Math.random() * 0.8, off: (i % 2 ? 0.9 : -0.6) + Math.random() * 0.3, sp: 4.4 + Math.random() * 0.6 }));
      for (const b of s.b) { const q = blane(b.d, b.off); b.v = tempBike(r, q.x, q.y, bst.a); }
      s.mid = blane(s.b[2].d, 0);
      sfx(r.w, 'bell', bst.x, bst.y);
    },
    tick(r, s, t, dt) {
      for (const b of s.b) {
        b.d += b.sp * dt;
        const q = blane(b.d, b.off);
        if (b.v) Object.assign(b.v, { x: q.x, y: q.y, angle: bst.a, speed: b.sp });
      }
      s.mid = blane(s.b[2].d, 0);
    },
    cams: [[0, (u, t, s) => {
      const c = blane(7, 3.3);
      return pose(P(c.x, c.y, 0.45), P(s.mid.x, s.mid.y, 0.95), 28, t, 0.02);
    }]],
  };

  // a gull steals a frikandel on the Vismarkt; the pigeons scatter. Shot
  // from a few metres back, from a side with no bike rack in front of the lens.
  const gullDir = Math.atan2(tower.y - vismarkt.y, tower.x - vismarkt.x);
  const gullSpot = (a, d) => ({ x: vismarkt.x + Math.cos(a) * d, y: vismarkt.y + Math.sin(a) * d, z: 1.3 });
  const gullCams = [];
  for (const d of [7.5, 6, 9]) for (const da of [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05]) gullCams.push(gullSpot(gullDir + 2.1 + da, d));
  const gull = {
    minDur: 1.9, clock: 12.6, focus: vismarkt,
    enter(r, s) {
      s.cam = clearSpot(map, gullCams.filter((q) => !roofAt(map, q.x, q.y)), P(vismarkt.x, vismarkt.y, 0.5), 5);
      s.birds = makeBirds(r.group, vismarkt.x + 1.5, vismarkt.y, 2.5, BIRDS, { avoid: 7 });
      s.gull = buildPigeonBird('gull');
      s.gull.scale.multiplyScalar(2.2);
      s.snack = buildFrikandel();
      s.snack.position.set(0.24, 0.19, 0);
      s.gull.add(s.snack);
      r.group.add(s.gull);
      s.p = P(vismarkt.x, vismarkt.y, 0.05);
      sfx(r.w, 'caw', vismarkt.x, vismarkt.y);
    },
    exit(r, s) {
      if (s.snack) disposeOwned(s.snack);
      if (s.gull) disposeGeometry(s.gull);
    },
    tick(r, s, t, dt) {
      if (!s.gone && t > 0.25) { s.gone = true; scatterBirds(s.birds, vismarkt.x, vismarkt.y); }
      updateBirds(s.birds, dt, t);
      const k = Math.max(0, t - 0.15), d = k * 3.2;
      s.p = P(vismarkt.x + Math.cos(gullDir) * d, vismarkt.y + Math.sin(gullDir) * d, 0.05 + k * k * 1.4);
      s.gull.position.set(s.p.x, s.p.z, s.p.y);
      s.gull.rotation.set(0, -gullDir, -Math.min(0.5, k * 0.5));
      posePigeonBird(s.gull, { flapPhase: t * 13, amp: k > 0 ? 0.95 : 0, fold: k > 0 ? 0 : 1, grounded: k <= 0 });
    },
    cams: [[0, (u, t, s) => pose(P(s.cam.x, s.cam.y, s.cam.z + u * 0.6), P(s.p.x, s.p.y, s.p.z + 0.3), 36, t, 0.03)]],
  };

  // a work boat fishes a bike out of the Diepenring
  const bqNear = { x: 454.24, y: -58.47 };
  const bq = waterPointNear((x, y) => isInWater(map, x, y), canalAt(canalNear(bqNear.x, bqNear.y)));
  const cn = { x: -Math.sin(bq.a), y: Math.cos(bq.a) };
  // the camera stands on the quay, on the dry side of the sloep (the route normal points either way)
  const bqSpot = quaySpotFor((x, y) => isInWater(map, x, y), { x: bq.x + cn.x * 1.3, y: bq.y + cn.y * 1.3 }, Math.atan2(cn.y, cn.x), 2.2);
  const boat = {
    minDur: 1.9, clock: 10.4, focus: bq,
    enter(r, s) {
      s.boat = tempBoat(r, bq.x, bq.y, bq.a, BOAT_KINDS.sloepGrijs);
      s.bike = buildWetBike();
      r.group.add(s.bike);
      sfx(r.w, 'splash', bq.x, bq.y);
    },
    exit(r, s) { if (s.bike) disposeOwned(s.bike); },
    tick(r, s, t) {
      const k = smooth(t / 2.4);
      s.bike.position.set(bq.x + cn.x * 1.3, WATER_Y + lerp(-0.6, 1.5, k), bq.y + cn.y * 1.3);
      s.bike.rotation.set(Math.sin(t * 2.2) * 0.12, -bq.a + 0.4 + t * 0.2, Math.sin(t * 1.7) * 0.1);
    },
    cams: [[0, (u, t) => {
      const pos = clearCam(map, bqSpot || P(bq.x + cn.x * 9 + Math.cos(bq.a) * 3, bq.y + cn.y * 9 + Math.sin(bq.a) * 3, 2.2));
      return pose(pos, P(bq.x + cn.x * 1.3, bq.y + cn.y * 1.3, WATER_Y + lerp(0.2, 1.4, u)), 40, t, 0.03);
    }]],
  };

  // Tessa in the Herestraat, a cash machine on a trailer behind her: freeze
  const hereSt = { x: 235.26, y: 401.14 };
  const here = street(map, hereSt.x, hereSt.y);
  const rf = { x: Math.cos(here.a), y: Math.sin(here.a) }, rn = { x: -rf.y, y: rf.x };
  const lane = (d, off) => ({ x: here.x + rf.x * d + rn.x * off, y: here.y + rf.y * d + rn.y * off });
  const anitaCard = {
    minDur: 3.1, clock: 8.4, focus: here, freeze: 1.2,
    tags: [[1.5, 99, 'Tessa', 'Heeft altijd een plan B. Plan A is ook van haar.']],
    enter(r, s) {
      clearRoadNear(r, polyline([[here.x - rf.x * 30, here.y - rf.y * 30], [here.x + rf.x * 30, here.y + rf.y * 30]]), 6);
      s.trailer = buildAtmTrailer();
      r.group.add(s.trailer);
      s.d = -2;
      s.q = lane(s.d, 2.4);
      // the camera keeps to the side of the street with no parked bikes in front of it
      const clearAt = (d, off) => viewClear(map, lane(d + 4.4, 2.4 + off), lane(d, 2.4), 4.5);
      s.side = [1.7, 0.4, -0.8, -1.8].find((off) => clearAt(s.d, off) && clearAt(s.d + 1.9, off)) ?? 0.4;
    },
    exit(r, s) { if (s.trailer) disposeOwned(s.trailer); },
    tick(r, s, t, dt) {
      s.d += 1.6 * dt;
      s.q = lane(s.d, 2.4);
      stage(r.anita, s.q.x, s.q.y, here.a, { speed: 1.6, pose: 'pull', dt, t });
      s.trailer.position.set(s.q.x - rf.x * 1.85, 0, s.q.y - rf.y * 1.85);
      s.trailer.rotation.set(0, -here.a, 0);
    },
    cams: [[0, (u, t, s) => {
      const q = s.q, d = lerp(4.6, 4.0, u);
      return pose(P(q.x + rf.x * d + rn.x * s.side, q.y + rf.y * d + rn.y * s.side, 0.9), P(q.x - rf.x * 0.7, q.y - rf.y * 0.7, 1.15), 44, t, 0.02);
    }]],
  };

  // Tammo holds the kitchen door open and looks guiltily into the lens: freeze
  const door = KITCHEN.door;
  const tammoCard = {
    minDur: 3.1, clock: 5.1, focus: home, kitchen: true, freeze: 1.1,
    tags: [[1.3, 99, 'Tammo', 'Stadjer met een Escapade die nauwelijks rijdt.']],
    enter(r, s) {
      s.kit = useKitchen(r, KIT);
      s.kit.holdCups(r.tammo, true, 1.6, 'L');
      sfx(r.w, 'door_open', home.x, home.y);
    },
    tick(r, s, t, dt) {
      s.kit.hinge.rotation.y = lerp(-0.25, -1.25, smooth(t / 0.7));
      stageK(r.tammo, door.u, lerp(KITCHEN.hallStart, door.v, smooth(t / 1.1)), -Math.PI / 2, { speed: t < 1.1 ? 0.9 : 0, pose: 'door', dt, t });
    },
    // framed on his head, not his chest (VQA 23-11 #2: the chin touched the top of the frame): eye height, 1,6 to 1,4 m away, with
    // headroom for a 1,78 m Tammo (the Quaternius people) inside the letterbox
    cams: [[0, (u, t) => pose(K(door.u - 0.05, lerp(0.02, 0.22, u), 1.66), K(door.u, door.v, 1.62), 34, t, 0.004)]],
  };

  // flash: a pigeon past the Groninger Museum
  const pigeon = {
    minDur: 1.5, clock: 17.3, focus: museum,
    enter(r, s) {
      s.bird = buildPigeonBird('pigeon');
      s.bird.scale.multiplyScalar(1.6);
      r.group.add(s.bird);
      s.a = 0.6;
      s.p = P(museum.x + Math.cos(s.a) * 40, museum.y + Math.sin(s.a) * 40, 20);
    },
    exit(r, s) { if (s.bird) disposeGeometry(s.bird); },
    tick(r, s, t) {
      s.a = 0.6 + t * 0.42;
      s.p = P(museum.x + Math.cos(s.a) * 40, museum.y + Math.sin(s.a) * 40, 20 + t * 1.5);
      s.bird.position.set(s.p.x, s.p.z, s.p.y);
      s.bird.rotation.set(0, -(s.a + Math.PI / 2), -0.2);
      posePigeonBird(s.bird, { flapPhase: t * 17, amp: 0.9, fold: 0, grounded: false });
    },
    cams: [[0, (u, t, s) => {
      const a = s.a - 0.05;
      return pose(P(museum.x + Math.cos(a) * 47, museum.y + Math.sin(a) * 47, s.p.z + 0.8), P(s.p.x, s.p.y, s.p.z), 52, t, 0.04);
    }]],
  };

  // flash: the black trekker-limo on Ring Zuid
  const ring = smoothPath(RING_ROUTE.slice(0, 16));
  let ringZ = null;
  const limo = {
    minDur: 1.5, clock: 19.6, focus: ring.at(30),
    enter(r, s) {
      clearRoadNear(r, ring, 8);
      ringZ = ringZ || pathHeights(map, ring, map.spawnZ ? map.spawnZ(RING_ROUTE[0][0], RING_ROUTE[0][1]) : 0);
      s.d = 10;
      s.q = ring.at(s.d);
      s.z = ringZ(s.d);
      s.v = tempCar(r, s.q.x, s.q.y, s.q.a, { model: { ...MODELS[0], name: 'trekkerlimo', len: 5.6, wid: 2.0, color: '#0d0d0f' } });
      cineDrive(s.v, map, s.q, 15, 0, s.z);
      sfx(r.w, 'horn', s.q.x, s.q.y);
    },
    tick(r, s, t, dt) {
      s.d += 15 * dt;
      s.q = ring.at(s.d);
      s.z = ringZ(s.d);
      if (s.v) cineDrive(s.v, map, s.q, 15, dt, s.z);
    },
    cams: [[0, (u, t, s) => {
      const q = s.q, f = { x: Math.cos(q.a), y: Math.sin(q.a) };
      return pose(P(q.x - f.y * 4.4 + f.x * lerp(3, 1, u), q.y + f.x * 4.4 + f.y * lerp(3, 1, u), s.z + 0.7), P(q.x, q.y, s.z + 1.1), 46, t, 0.05);
    }]],
  };

  // flash: a tanker skids on the Europaweg
  const euSt = { x: 1261.38, y: 561.37 };
  const eu = street(map, euSt.x, euSt.y);
  const ef = { x: Math.cos(eu.a), y: Math.sin(eu.a) }, en = { x: -ef.y, y: ef.x };
  const tanker = {
    minDur: 1.5, clock: 14.2, focus: eu,
    enter(r, s) {
      clearRoadNear(r, polyline([[eu.x - ef.x * 40, eu.y - ef.y * 40], [eu.x + ef.x * 40, eu.y + ef.y * 40]]), 7);
      s.d = -16;
      s.q = { x: eu.x + ef.x * s.d, y: eu.y + ef.y * s.d };
      s.v = tempCar(r, s.q.x, s.q.y, eu.a, { model: { name: 'truck', tank: true, len: 8.5, wid: 2.5, maxSpeed: 24, accel: 4.5, brake: 14, turnRate: 1.5, color: '#e8e6e0' } });
      sfx(r.w, 'horn', eu.x, eu.y);
    },
    tick(r, s, t, dt) {
      s.d += 13 * dt;
      const k = smooth(t / 1.7);
      s.q = { x: eu.x + ef.x * s.d + en.x * k * 2, y: eu.y + ef.y * s.d + en.y * k * 2 };
      if (s.v) Object.assign(s.v, { x: s.q.x, y: s.q.y, angle: eu.a + k * 0.6, speed: 13, roll: k * 0.06 });
    },
    cams: [[0, (u, t, s) => pose(P(eu.x + ef.x * 12 - en.x * 5.5, eu.y + ef.y * 12 - en.y * 5.5, 0.55), P(s.q.x, s.q.y, 1.6), 48, t, 0.06)]],
  };

  // flash: a helicopter over the Oosterpark, a man on a rope beneath it
  const HELI_Z = 52;
  const heli = {
    minDur: 1.6, clock: 13, focus: park,
    enter(r, s) {
      s.prev = r.w.skyHeli || null;
      try { s.h = scriptHeli(r.w); } catch (e) { s.h = null; }
      s.rope = buildRope();
      r.group.add(s.rope);
      s.mid = P(park.x, park.y, HELI_Z - 7);
    },
    exit(r, s) {
      if (s.rope) disposeOwned(s.rope);
      if (s.h) r.w.skyHeli = s.prev;
    },
    tick(r, s, t, dt) {
      const hx = park.x + t * 5, hy = park.y;
      if (s.h) Object.assign(s.h, { x: hx, y: hy, z: HELI_Z, heading: 0, pitch: -0.06, bank: 0.04, rotor: 1 });
      const sw = Math.sin(t * 1.5) * 0.7;
      const feet = HELI_Z - 13.2;
      stage(r.tammo, hx - 1 + sw, hy, Math.PI / 2, { h: feet, pose: 'rope', dt, t });
      r.tammo.userData.blob.visible = false;
      const top = new THREE.Vector3(hx, HELI_Z - 1.1, hy), hand = new THREE.Vector3(hx - 1 + sw, feet + 2.05, hy);
      const dir = hand.clone().sub(top);
      s.rope.position.copy(top);
      s.rope.scale.set(1, dir.length(), 1);
      s.rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
      s.mid = P(hx, hy, HELI_Z - 7);
    },
    cams: [[0, (u, t, s) => pose(P(park.x + t * 5 - 4, park.y + 19, 40 + u * 2), s.mid, 54, t, 0.08)]],
  };

  const title = {
    minDur: 3.6, black: true,
    card: logoHtml() + `<div class="im-tagline">${TITLE.tagline}</div><div class="im-kicker">${TITLE.sub}</div>`,
  };

  // --- opening ---------------------------------------------------------------

  // Early morning, not a red filter: a low sun more gold than orange, cool
  // blue sky light in the shadows, so the brick terraces read as brick.
  const DAWN = { sun: new THREE.Color(0xffc48a), sky: new THREE.Color(0x8fa6cc), gnd: new THREE.Color(0x5b5650), fog: new THREE.Color(0xb4bccb), horizon: new THREE.Color(0xe9c3a0), shadow: new THREE.Color(0xc4d6ee) };
  const dawnMood = (L) => {
    L.sun.lerp(DAWN.sun, 0.7);
    L.sunI *= 0.8;
    L.hemiSky.lerp(DAWN.sky, 0.7);
    L.hemiGnd.lerp(DAWN.gnd, 0.6);
    L.hemiI *= 1.1;
    L.fog.lerp(DAWN.fog, 0.75);
    L.horizon.lerp(DAWN.horizon, 0.6);
    L.shadowTint.lerp(DAWN.shadow, 0.6);
    L.glowI *= 0.45;
    L.sat = 0.94;
    L.bloomStr *= 0.6;
  };

  const dateCard = { minDur: 1.6, black: true, card: `<div class="im-kicker">${partNumber('kop')} · ${PARTS.kop.date}</div><div class="im-title">${PARTS.kop.name}</div>` };

  // sunrise: down along d'Olle Grieze, over the Oosterparkwijk into a narrow
  // street, the red Escapade with a flat tyre at the door, Rikus at his mic
  const dawn = {
    minDur: 9, clock: 5.62, clockTo: 5.8, stamp: '05:48', focus: home, flare: { x: 82, y: 30, a: 0.8 },
    caption: ['OOSTERPARKWIJK', 'Korenbloemstraat. Een zolderraam en een lekke band.'], capAt: 'L0+1',
    lead: 0.6,
    lines: [['V', 'Moi, Nachtstreek, het laatste uur. Het is twijduustern geweest, en nu wordt het licht. Voor wie wakker ligt van de huur: ik ook, jongens.', 'warm, zacht, als nacht-dj op de radio in het laatste uur van de nacht']],
    enter(r, s) {
      s.car = tempCar(r, car.x, car.y, home.a) || tempCar(r, car.x, car.y, home.a, { model: { ...MODELS[0], color: '#a11f1f' } });
      s.st = buildRadioStudio(home.x + 40, home.y);
      r.group.add(s.st.group);
      r.w.lightMood = dawnMood;
    },
    exit(r, s) {
      if (r.w.lightMood === dawnMood) r.w.lightMood = null;
      if (s.st) { s.st.dispose(); s.st = null; }
    },
    tick(r, s, t) {
      // sagging on the flat front tyre
      if (s.car) { s.car.roll = 0.06; s.car.pitch = -0.025; }
      const l = dawn.timed[0];
      if (s.st) s.st.tick(t, !!l && t > l.at && t < l.at + l.dur);
    },
    cams: [
      [0, (u, t) => {
        const k = smooth(u);
        const pos = P(tower.x + Math.cos(toE) * 46, tower.y + Math.sin(toE) * 46, lerp(98, 56, k));
        return pose(clearCam(map, pos), P(tower.x, tower.y, lerp(90, 52, k)), 48, t, 0.04);
      }],
      ['L0+0.6', (u, t) => {
        const k = smooth(u);
        const from = P(lerp(park.x, home.x, 0.35), lerp(park.y, home.y, 0.35), 70);
        const to = P(home.x - hn.x * 24 - hf.x * 8, home.y - hn.y * 24 - hf.y * 8, 15);
        const pos = clearCam(map, P(lerp(from.x, to.x, k), lerp(from.y, to.y, k), lerp(from.z, to.z, k)));
        return pose(pos, P(car.x, car.y, lerp(0, 1, k)), lerp(52, 44, k), t, 0.05);
      }],
      ['L0+3.4', (u, t) => {
        const k = smooth(u);
        const pos = clearCam(map, P(car.x - hn.x * 5.2 + hf.x * 3.5, car.y - hn.y * 5.2 + hf.y * 3.5, lerp(1.1, 1.5, k)));
        return pose(pos, P(lerp(car.x, attic.x, k), lerp(car.y, attic.y, k), lerp(0.7, 8.2, k)), lerp(46, 40, k), t, 0.02);
      }],
      ['L0+5.6', (u, t, s) => ({ ...s.st.shot(0)(u), cut: true })],
    ],
  };

  // inside: Tessa with her papers, Tammo in with two coffees from the night shop
  const tStand = { u: 0.78, v: 0.72 };
  const tFace = Math.atan2(KITCHEN.anitaSeat.v - tStand.v, KITCHEN.anitaSeat.u - tStand.u);
  const tl = Math.hypot(tStand.u - KITCHEN.anitaSeat.u, tStand.v - KITCHEN.anitaSeat.v);
  const toT = { x: (tStand.u - KITCHEN.anitaSeat.u) / tl, y: (tStand.v - KITCHEN.anitaSeat.v) / tl };
  const kitchenIn = {
    minDur: 6, clock: 5.85, focus: home, kitchen: true, lead: 1.1,
    lines: [
      ['T', 'Moi. De bank?', 'droog, slaperig, voorzichtig'],
      ['A', '"Uw plan is sympathiek." Dat betekent nee, met een strikje.', 'ad rem, cynisch, moe'],
      ['T', 'Sympathiek is toch goed?', 'hoopvol, een beetje naïef'],
      ['A', 'Een kat is ook sympathiek. Die krijgt ook geen lening.', 'droog, cynisch, net niet lachend'],
    ],
    enter(r, s) {
      s.kit = useKitchen(r, KIT);
      s.kit.holdCups(r.tammo, true);
      sfx(r.w, 'door_open', home.x, home.y);
    },
    tick(r, s, t, dt) {
      const L = kitchenIn.timed;
      s.kit.hinge.rotation.y = lerp(-0.3, -1.25, smooth(t / 0.8));
      const k = clamp01((t - 0.3) / 1.4);
      const u = lerp(door.u, tStand.u, k), v = lerp(KITCHEN.hallStart, tStand.v, k);
      const walkA = Math.atan2(tStand.v - KITCHEN.hallStart, tStand.u - door.u);
      stageK(r.tammo, u, v, k < 1 ? walkA : tFace, { speed: k > 0 && k < 1 ? 1 : 0, pose: 'cups', dt, t });
      // reading until he speaks, then up at him
      const up = L[0] && t > L[0].at;
      sitK(r.anita, KITCHEN.anitaSeat, 0, up ? 0.06 : -0.32, up ? -0.42 : 0);
    },
    cams: [
      [0, (u, t) => pose(K(-1.85, -1.3, 1.7), K(lerp(1.1, 0.8, u), lerp(1.3, 0.8, u), 1.25), 50, t, 0.006)],
      ['L1', (u, t) => {
        const c = K(tStand.u + toT.x * 0.7 - toT.y * 0.32, tStand.v + toT.y * 0.7 + toT.x * 0.32, 1.72);
        return pose(c, anitaHead, lerp(36, 33, u), t, 0.004);
      }],
      ['L2', (u, t) => {
        const c = K(KITCHEN.anitaSeat.u - toT.x * 0.55 + toT.y * 0.3, KITCHEN.anitaSeat.v - toT.y * 0.55 - toT.x * 0.3, 1.3);
        return pose(c, K(tStand.u, tStand.v, 1.6), 38, t, 0.004);
      }],
      ['L3', (u, t) => {
        const c = K(tStand.u + toT.x * lerp(0.75, 0.55, u) - toT.y * 0.28, tStand.v + toT.y * lerp(0.75, 0.55, u) + toT.x * 0.28, 1.68);
        return pose(c, anitaHead, lerp(32, 29, u), t, 0.004);
      }],
    ],
  };

  // the car: seated across the table, the coffee down, the drawing between them
  const kitchenCar = {
    minDur: 6, clock: 5.88, focus: home, kitchen: true, lead: 0.4,
    lines: [
      ['A', 'Een frietwagen is een auto met een luik, Tammo. En ik heb geen auto.', 'zakelijk, ad rem, een beetje moedeloos'],
      ['T', 'Ik wel. De Escapade.', 'droog, terloops'],
      ['A', 'Die rijdt nauwelijks.', 'droog, ongelovig'],
      ['T', 'Dan rijdt hij nauwelijks voor jou. Een snackwagen die nauwelijks rijdt. Dat is een concept.', 'warm, verlegen, droog, alsof het niks is'],
    ],
    enter(r, s) {
      s.kit = useKitchen(r, KIT);
      for (const c of s.kit.tableCups) c.visible = true;
    },
    tick(r, s, t) {
      const L = kitchenCar.timed;
      const tTalks = L[3] && t > L[3].at;
      sitK(r.anita, KITCHEN.anitaSeat, 0, L[0] && t < L[0].at + 1.4 ? -0.3 : 0.04);
      sitK(r.tammo, KITCHEN.tammoSeat, Math.PI, tTalks ? -0.12 : 0);
    },
    cams: [
      [0, (u, t) => pose(K(lerp(-0.15, 0.1, u), -1.3, 1.3), K(0, 0, 1.0), 46, t, 0.005)],
      ['L0+1.4', (u, t) => pose(K(0.36, 0.12, 1.24), K(KITCHEN.drawing.u - 0.04, KITCHEN.drawing.v, KITCHEN.tableH), lerp(36, 32, u), t, 0.003)],
      ['L1', (u, t) => pose(K(-1.4, -0.32, 1.3), tammoHead, 30, t, 0.004)],
      ['L2', (u, t) => pose(K(1.4, 0.3, 1.3), anitaHead, 30, t, 0.004)],
      ['L3', (u, t) => pose(K(lerp(-1.55, -1.12, smooth(u)), lerp(-0.36, -0.26, u), 1.27), tammoHead, lerp(31, 26, u), t, 0.003)],
    ],
  };

  // nobody talks: she looks at him, he looks at his coffee; then a slow push-in on Tessa
  const liefste = {
    minDur: 4, clock: 5.92, focus: home, kitchen: true, lead: 1.5,
    lines: [['A', '…Dat is het liefste wat iemand ooit tegen mijn papieren heeft gezegd.', 'zacht, ontroerd, verrast, met een glimlach die ze probeert in te houden']],
    enter(r, s) {
      s.kit = useKitchen(r, KIT);
      for (const c of s.kit.tableCups) c.visible = true;
    },
    tick(r, s, t) {
      const L = liefste.timed;
      sitK(r.anita, KITCHEN.anitaSeat, 0, L[0] && t > L[0].at ? -0.04 : 0.05);
      sitK(r.tammo, KITCHEN.tammoSeat, Math.PI, L[0] && t > L[0].at + 1.8 ? -0.1 : -0.42);
    },
    cams: [
      [0, (u, t) => pose(K(0, -1.38, 1.24), K(0, 0, 1.02), 40, t, 0.002)],
      ['L0-0.1', (u, t) => {
        const k = smooth(u);
        return pose(K(lerp(1.7, 0.98, k), lerp(0.38, 0.2, k), lerp(1.32, 1.2, k)), anitaHead, lerp(34, 27, k), t, 0.002);
      }],
    ],
  };

  // the attic is too small for a frietwagen, and for the two of them: the
  // flat in Paddepoel, the rent split in two (docs/verhaal/nieuw/09-script-akte1.md, "Opening")
  const huur = {
    minDur: 6, clock: 5.93, focus: home, kitchen: true, lead: 0.5,
    lines: [
      ['T', 'En waar moet hij staan? Jij kunt hier niet eens rechtop staan.', 'droog, kijkt omhoog naar het schuine dak'],
      ['A', 'Daarom. Paddepoel, elfde verdieping. Twee kamers en een garage, voor de Fjord.', 'zakelijk, snel, stiekem trots, schuift een papier over tafel'],
      ['T', 'Paddepoel? Dat is buitenland.', 'geschrokken, droog'],
      ['A', 'Alleen kan ik de huur niet betalen. Jij ook niet. Samen net.', 'nuchter, ad rem'],
      ['T', '…Samen.', 'zacht, overvallen'],
      ['A', 'Als huisgenoten, Tammo. Teken nou maar.', 'snel, net te zakelijk, ontwijkend'],
    ],
    enter(r, s) {
      s.kit = useKitchen(r, KIT);
      for (const c of s.kit.tableCups) c.visible = true;
    },
    tick(r, s, t) {
      const L = huur.timed;
      const said = (i, d = 0) => !!L[i] && t > L[i].at + d;
      // he looks up at the sloping roof, she down at the papers, then at him
      sitK(r.tammo, KITCHEN.tammoSeat, Math.PI, said(0) && !said(0, 1.6) ? 0.32 : said(4) ? -0.3 : -0.05);
      sitK(r.anita, KITCHEN.anitaSeat, 0, said(1) && !said(1, 1.4) ? -0.32 : 0.04, said(5) ? 0.25 : 0);
    },
    cams: [
      [0, (u, t) => pose(K(-1.4, -0.32, 1.3), tammoHead, 30, t, 0.004)],
      ['L1', (u, t) => pose(K(0.36, 0.12, 1.24), K(KITCHEN.drawing.u - 0.04, KITCHEN.drawing.v, KITCHEN.tableH), lerp(36, 32, u), t, 0.003)],
      ['L1+2.2', (u, t) => pose(K(1.4, 0.3, 1.3), anitaHead, 30, t, 0.004)],
      ['L2', (u, t) => pose(K(-1.4, -0.32, 1.3), tammoHead, 30, t, 0.004)],
      ['L3', (u, t) => pose(K(1.4, 0.3, 1.3), anitaHead, 30, t, 0.004)],
      ['L4', (u, t) => pose(K(lerp(-1.55, -1.12, smooth(u)), lerp(-0.36, -0.26, u), 1.27), tammoHead, lerp(31, 26, u), t, 0.003)],
      ['L5', (u, t) => pose(K(0, -1.38, 1.24), K(0, 0, 1.02), 40, t, 0.002)],
    ],
  };

  // Rikus on the old radio with advice for Tammo, then her phone buzzes
  const radioTip = {
    minDur: 6, clock: 5.95, focus: home, kitchen: true, lead: 0.4,
    gaps: { 1: 1.0 },
    lines: [
      ['V', 'En voor Tammo, als je luistert: ze zegt nooit "kom" tegen iemand die ze niet mee wil hebben. Doe er wat mee.', 'warm, als nacht-dj op de radio, zacht, met een knipoog'],
      ['A', 'Kom. Werk.', 'kortaf, zakelijk, net te snel'],
    ],
    enter(r, s) {
      s.kit = useKitchen(r, KIT);
      for (const c of s.kit.tableCups) c.visible = true;
    },
    tick(r, s, t) {
      const L = radioTip.timed;
      const buzz = !!L[0] && t > L[0].at + L[0].dur;
      if (buzz && !s.rang) { s.rang = true; sfx(r.w, 'notify', home.x, home.y, { strength: 1 }); }
      s.kit.buzz(t, buzz && !(L[1] && t > L[1].at + 0.6));
      if (L[1] && t > L[1].at) stageK(r.anita, KITCHEN.anitaSeat.u + 0.1, KITCHEN.anitaSeat.v - 0.5, Math.atan2(0.5, KITCHEN.tammoSeat.u - KITCHEN.anitaSeat.u));
      else sitK(r.anita, KITCHEN.anitaSeat, 0, buzz ? -0.4 : 0.02, buzz ? 0.3 : 0);
      // he looks up at the radio, caught
      const caught = !!L[0] && t > L[0].at + 1 && !buzz;
      sitK(r.tammo, KITCHEN.tammoSeat, Math.PI, caught ? 0.06 : -0.2, caught ? 0.25 : 0);
    },
    cams: [
      [0, (u, t) => pose(K(-1.25, lerp(1.0, 0.9, u), 1.24), K(KITCHEN.radio.u, KITCHEN.radio.v, KITCHEN.radio.h + 0.02), lerp(34, 30, u), t, 0.002)],
      ['L0+3.4', (u, t) => pose(K(lerp(0.1, -0.1, u), -1.32, 1.28), K(0, 0, 1.04), 44, t, 0.004)],
      ['L1-1.3', (u, t) => pose(K(-0.2, -0.5, 1.02), K(KITCHEN.phone.u, KITCHEN.phone.v, KITCHEN.tableH), 30, t, 0.002)],
      ['L1', (u, t) => pose(K(1.45, -0.75, 1.5), K(KITCHEN.anitaSeat.u + 0.1, KITCHEN.anitaSeat.v - 0.5, 1.45), 40, t, 0.005)],
    ],
  };

  // moving day: the Escapade at the House of Groningen, a mattress on the
  // roof and a box in his arms, the tower up to the eleventh floor
  const lobby = homeSpawnPoint();
  const kerb = street(map, lobby.x + Math.cos(lobby.angle) * 10, lobby.y + Math.sin(lobby.angle) * 10);
  const kf = { x: Math.cos(kerb.a), y: Math.sin(kerb.a) };
  // AAA30 regie: where Tessa stands and from where she is filmed (she speaks, so the camera stands where she faces, in a three-quarter view). The first
  // combination of side (of the door axis) and turn where nobody and no lens stands in a building and no wall hangs 2,5 m behind her is used; checked on the real map.
  const ANITA_FRAME = (() => {
    const o = { x: Math.cos(lobby.angle), y: Math.sin(lobby.angle) }, sd2 = { x: -o.y, y: o.x };
    const tx = lobby.x + o.x * 1.6, ty = lobby.y + o.y * 1.6;
    const make = (side, turn) => {
      const ax = lobby.x + o.x * 4.2 + sd2.x * side, ay = lobby.y + o.y * 4.2 + sd2.y * side;
      const fo = (tx - ax) * o.x + (ty - ay) * o.y, fs2 = (tx - ax) * sd2.x + (ty - ay) * sd2.y, fl = Math.hypot(fo, fs2) || 1;
      const c = Math.cos(turn), sn = Math.sin(turn), ro = (fo * c - fs2 * sn) / fl, rs = (fo * sn + fs2 * c) / fl;
      const dx = o.x * ro + sd2.x * rs, dy = o.y * ro + sd2.y * rs;
      return { side, turn, ax, ay, cx: ax + dx * 3.2, cy: ay + dy * 3.2, bx: ax - dx * 2.5, by: ay - dy * 2.5 };
    };
    const free = (q) => !roofAt(map, q.ax, q.ay) && !roofAt(map, q.cx, q.cy) && !roofAt(map, q.bx, q.by);
    const list = [];
    for (const side of [1.6, -1.6, 2.4, -2.4, 0.8, -0.8]) for (const turn of [Math.PI / 4, -Math.PI / 4]) list.push(make(side, turn));
    return list.find(free) || list[0];
  })();
  const verhuis = {
    minDur: 6.5, clock: 10.6, stamp: '10:36', focus: lobby,
    caption: ['PADDEPOEL', 'House of Groningen. Elf hoog, de huur door twee.'], capAt: 0.6,
    lead: 2.2,
    lines: [
      ['T', 'Elf hoog. Met een lift. Ik voel me rijk.', 'droog, trots, met een verhuisdoos in zijn armen'],
      ['A', 'Je bent niet rijk, Tammo. Je bent huisgenoot.', 'plagend, warm, net te snel'],
    ],
    enter(r, s) {
      const at = { x: lobby.x + (kerb.x - lobby.x) * 0.85, y: lobby.y + (kerb.y - lobby.y) * 0.85 };
      s.car = tempCar(r, at.x, at.y, kerb.a);
      // de matras en de verhuisdozen uit het register (storyprops.js): oorsprong op de grond, niet in het midden
      s.bed = DECOR_MAKERS.matras();
      s.box = DECOR_MAKERS.doos();
      s.boxes = [0, 1, 2].map(() => DECOR_MAKERS.doos());
      for (const m of [s.bed, s.box, ...s.boxes]) r.group.add(m);
    },
    exit(r, s) { for (const m of [s.bed, s.box, ...(s.boxes || [])]) if (m) disposeModel(m); },
    tick(r, s, t, dt) {
      const c = s.car;
      if (c) {
        s.bed.position.set(c.x, (c.z || 0) + 1.51, c.y);
        s.bed.rotation.set(0, -c.angle, 0.05);
        // a stack of boxes on the pavement behind the car
        s.boxes.forEach((b, k) => {
          b.position.set(c.x - kf.x * 3.4 + (lobby.x - c.x) * 0.25, (c.z || 0) + (k === 2 ? 0.42 : 0), c.y - kf.y * 3.4 + (lobby.y - c.y) * 0.25 + (k === 1 ? 0.6 : 0));
          b.rotation.y = k * 0.4;
        });
      }
      const a = lobby.angle + Math.PI;
      // Tammo walks to the door with a box, Tessa by the car, hands on her hips
      // AAA30 regie: he arrives at the door at 2 s and TURNS to Tessa before he speaks (2,2 s): the street camera then sees his face, not his back
      const k = clamp01(t / 2.0);
      const tx = lerp(lobby.x + Math.cos(lobby.angle) * 5, lobby.x + Math.cos(lobby.angle) * 1.6, k);
      const ty = lerp(lobby.y + Math.sin(lobby.angle) * 5, lobby.y + Math.sin(lobby.angle) * 1.6, k);
      const z = r.w.map.spawnZ ? r.w.map.spawnZ(tx, ty) : 0;
      const ax = ANITA_FRAME.ax, ay = ANITA_FRAME.ay;
      const toA = Math.atan2(ay - ty, ax - tx), turn = Math.atan2(Math.sin(toA - a), Math.cos(toA - a));
      const aT = a + turn * smooth((t - 2.0) / 0.8);
      stage(r.tammo, tx, ty, aT, { h: z, speed: k < 1 ? 1 : 0, pose: 'cups', dt, t });
      s.box.position.set(tx + Math.cos(aT) * 0.38, z + 0.89, ty + Math.sin(aT) * 0.38);
      s.box.rotation.set(0, -aT, 0);
      stage(r.anita, ax, ay, Math.atan2(ty - ay, tx - ax), { h: r.w.map.spawnZ ? r.w.map.spawnZ(ax, ay) : 0, pose: 'hips', dt, t });
    },
    cams: [
      // up the tower to the eleventh floor, then down to the two of them
      [0, (u, t) => {
        const k = smooth(u);
        const out = lobby.angle, side = lobby.angle + Math.PI / 2;
        const pos = clearCam(map, P(lobby.x + Math.cos(out) * 16 + Math.cos(side) * 7, lobby.y + Math.sin(out) * 16 + Math.sin(side) * 7, lerp(2, 3.2, k)));
        return pose(pos, P(lobby.x - Math.cos(out) * 6, lobby.y - Math.sin(out) * 6, lerp(38, 3, k)), lerp(58, 46, k), t, 0.01);
      }],
      ['L0', (u, t) => {
        const out = lobby.angle, side = lobby.angle - Math.PI / 2;
        const pos = clearCam(map, P(lobby.x + Math.cos(out) * 7.5 + Math.cos(side) * 3.2, lobby.y + Math.sin(out) * 7.5 + Math.sin(side) * 3.2, 1.75));
        return pose(pos, P(lobby.x + Math.cos(out) * 2.6, lobby.y + Math.sin(out) * 2.6, 1.45), lerp(40, 36, u), t, 0.006);
      }],
      ['L1', (u, t) => {
        // Tessa speaks: the camera stands where she faces (ANITA_FRAME), no longer behind her
        const ax = ANITA_FRAME.ax, ay = ANITA_FRAME.ay;
        const pos = clearCam(map, P(ANITA_FRAME.cx, ANITA_FRAME.cy, 1.6));
        return pose(pos, P(ax, ay, 1.5), lerp(34, 30, u), t, 0.004);
      }],
    ],
  };

  const swoop = {
    minDur: 4.6, home: true,
    lower: '<div class="im-kicker">Welkom in</div><div class="im-title">Grunn</div>',
    enter(r, s) { s.shot = r.flyShot(); },
    // soft for the last moment, so the follow camera below has its collision again
    cams: [[0, (u, t, s) => ({ ...s.shot(u), cut: u < 0.9 })]],
  };

  const OLD = [
    sun, bikes, gull, boat, anitaCard, tammoCard, pigeon, limo, tanker, heli, title,
    dateCard, dawn, kitchenIn, kitchenCar, liefste, huur, radioTip, verhuis, swoop,
  ];
  if (!film) return OLD;

  // --- THE FILM (?openingfilm, openingfilm.js SEQUENCE; docs/verhaal/OPENING-FILMSCRIPT-21-11.md) ------------------------------------------
  // New shots plus the proven ones (gull, kitchen set, moving day, swoop) patched with the lines and the cuts of the film. A shot never reads the
  // `.timed` of an OLD shot object (it is not in this list): a new shot reads its own through `self`. No white flashes (r.film, enterShot).
  // The 180 degree rule in the kitchen: every over-the-shoulder camera sits on the same side of the line between the seats (v = -0.32).
  const base = (id, extra = {}) => { const e = SEQUENCE.find((q) => q.id === id); return { filmId: id, minDur: e.minDur, lead: e.lead, gaps: e.gaps, lines: engineLines(id), film: true, ...extra }; };
  const zAt = (x, y) => (map.spawnZ ? map.spawnZ(x, y) : 0);
  const ESCAPADE_RED = '#' + (0xa11f1f).toString(16);
  const withDawn = (shot) => ({
    ...shot,
    enter(r, s) { r.w.lightMood = dawnMood; if (shot.enter) shot.enter(r, s); },
    exit(r, s) { if (r.w.lightMood === dawnMood) r.w.lightMood = null; if (shot.exit) shot.exit(r, s); },
  });
  const said = (L, i, t, d = 0) => !!L && !!L[i] && t > L[i].at + d;
  const camAnita = (fovA = 30, fovB = fovA) => (u, t) => pose(K(1.4, -0.32, 1.3), anitaHead, lerp(fovA, fovB, smooth(u)), t, 0.004);
  const camTammo = (fovA = 30, fovB = fovA) => (u, t) => pose(K(-1.4, -0.32, 1.3), tammoHead, lerp(fovA, fovB, smooth(u)), t, 0.004);
  const camDrawing = (u, t) => pose(K(0.36, 0.12, 1.24), K(KITCHEN.drawing.u - 0.04, KITCHEN.drawing.v, KITCHEN.tableH), lerp(34, 30, u), t, 0.003);
  const camTable = (u, t) => pose(K(0, -1.38, 1.24), K(0, 0, 1.02), 40, t, 0.002);
  const cupsOn = (r, s) => { s.kit = useKitchen(r, KIT); for (const c of s.kit.tableCups) c.visible = true; return s.kit; };
  const sit = (r, aPitch = 0, aYaw = 0, tPitch = 0, tYaw = 0) => { sitK(r.anita, KITCHEN.anitaSeat, 0, aPitch, aYaw); sitK(r.tammo, KITCHEN.tammoSeat, Math.PI, tPitch, tYaw); };

  // C00.1: the cold open
  const fBlack = { ...base('c1-zwart'), black: true, radio: true };
  const fCrane = withDawn({
    ...sun, ...base('c1-markt'), clock: 6.2, clockTo: 6.5, mist: 0.3, card: undefined, cardDur: undefined,
    // a slow crane up along the tower: 3,6 m in the length of the shot, the lens at 50
    cams: [[0, (u, t) => {
      // AAA30 regie: from 85 m, above the first roofs, so the whole tower stands in the frame (from 52 m and 4 m high the tower left the picture: sky and one roof)
      const a = toE + Math.PI * 4 / 3; // checked on the real map: the clock tower in front, the church behind it, the sun on the right
      const pos = P(tower.x + Math.cos(a) * 85, tower.y + Math.sin(a) * 85, lerp(22, 25.6, smooth(u)));
      return pose(clearCam(map, pos), P(tower.x, tower.y, lerp(44, 54, smooth(u))), 50, t, 0.03);
    }]],
  });
  // AAA30 regie (28-11): the city seen before the people. An aerial glide over the roofs round the tower, the tower on the right third (the camera
  // aims a little left of it), chimneys and tiles in the foreground, the low sun raking across them; high enough to clear every roof (clearCam as a net).
  const fRoofs = withDawn({
    ...base('c1-daken'), clock: 6.35, mist: 0.3, focus: tower,
    cams: [[0, (u, t) => {
      const R = 98, a = toE + Math.PI - 0.95 + lerp(-0.05, 0.05, smooth(u));
      const c = P(tower.x + Math.cos(a) * R, tower.y + Math.sin(a) * R, lerp(36, 40, smooth(u)));
      const dx = tower.x - c.x, dy = tower.y - c.y, dl = Math.hypot(dx, dy) || 1;
      const side = -22; // metres to the left of the tower: the tower stands on the right third
      return pose(clearCam(map, c), P(tower.x + (dy / dl) * side, tower.y - (dx / dl) * side, 50), 54, t, 0.02);
    }]],
  });
  // The Grote Markt at first light: a slow low dolly over the empty square, the tower on the right third of the frame, long shadows on the cobbles.
  // (The first plan was the Noorderplantsoen; its pond and trees did not render in the checked build, so the square is the safe, recognisable second place.)
  // Candidate dollies on the square, checked free on the real map (no roof, no tree within 6 m of the path, and the line to the tower open at 1,8 m);
  // the first free one plays. The pick is made when the shot is built, from the world data, so a changed map never puts the lens in a crown or a wall.
  const PLEIN_CANDIDATES = [
    { from: { x: 150, y: 72 }, to: { x: 154.2, y: 67.6 } }, { from: { x: 162, y: 66 }, to: { x: 166, y: 61.6 } },
    { from: { x: 140, y: 58 }, to: { x: 144, y: 53.6 } }, { from: { x: 172, y: 76 }, to: { x: 176, y: 71.6 } }, { from: { x: 128, y: 70 }, to: { x: 132, y: 65.6 } },
  ];
  const pleinFree = (c) => {
    for (let k = 0; k <= 4; k++) {
      const x = lerp(c.from.x, c.to.x, k / 4), y = lerp(c.from.y, c.to.y, k / 4);
      if (roofAt(map, x, y)) return false;
      if (map.treesNear && map.treesNear(x, y, 6).some((q) => Math.hypot(q[0] - x, q[1] - y) < 6)) return false;
    }
    return true;
  };
  const PLEIN = PLEIN_CANDIDATES.find(pleinFree) || PLEIN_CANDIDATES[0];
  const fPlein = withDawn({
    ...base('c1-plein'), clock: 6.45, mist: 0.25, focus: PLEIN.from,
    cams: [[0, (u, t) => {
      const k = smooth(u), x = lerp(PLEIN.from.x, PLEIN.to.x, k), y = lerp(PLEIN.from.y, PLEIN.to.y, k), z = zAt(x, y);
      const dx = tower.x - x, dy = tower.y - y, dl = Math.hypot(dx, dy) || 1, side = -24;
      return pose(clearCam(map, P(x, y, z + lerp(1.4, 1.8, k))), P(tower.x + (dy / dl) * side, tower.y - (dx / dl) * side, z + lerp(40, 46, k)), 50, t, 0.012);
    }]],
  });
  const fBikes = withDawn({
    ...bikes, ...base('c1-fietsen'), clock: 6.3, card: undefined, cardDur: undefined,
    cams: [[0, (u, t, s) => { const c = blane(7, 3.3); return pose(P(c.x, c.y, 1.0), P(s.mid.x, s.mid.y, 1.0), 46, t, 0.02); }]],
  });
  const fGull = withDawn({ ...gull, ...base('c1-meeuw'), clock: 6.4 });

  const fTitle = { ...title, ...base('c1-titel'), film: true, minDur: 4.4 };

  // Tammo walks down the Korenbloemstraat with a cup of coffee, the pigeons follow him at a respectable distance; then one lands on his shoulder
  const walkOff = 5.2;
  const sd = (d, off) => ({ x: home.x + hf.x * d + hn.x * off, y: home.y + hf.y * d + hn.y * off });
  const TRAIL = [[3.2, 0.4], [4.0, -0.5], [4.8, 0.7], [5.4, -0.2], [6.3, 0.5], [7.0, -0.7]];
  const cupInHand = (r, s) => { s.kit = useKitchen(r, KIT); s.kit.holdCups(r.tammo, true, 1.6, 'L'); s.kit.group.visible = false; };
  const fStreet = withDawn({
    ...base('c1-duiven'), clock: 6.4, mist: 0.2, focus: home,
    tags: [[NAME_CARDS.tammo.at ?? 1.0, 99, 'Tammo', NAME_CARDS.tammo.line]],
    enter(r, s) {
      cupInHand(r, s);
      s.birds = TRAIL.map(() => { const b = buildPigeonBird('pigeon'); r.group.add(b); return b; });
    },
    exit(r, s) { for (const b of s.birds || []) disposeGeometry(b); },
    tick(r, s, t, dt) {
      const d = -9 + 1.5 * t, q = sd(d, walkOff);
      stage(r.tammo, q.x, q.y, home.a, { h: zAt(q.x, q.y), speed: 1.4, pose: 'cups', dt, t });
      s.birds.forEach((b, i) => {
        const [back, side] = TRAIL[i];
        const p = sd(d - back - Math.sin(t * 2 + i) * 0.15, walkOff + side);
        b.position.set(p.x, zAt(p.x, p.y), p.y);
        b.rotation.set(0, -home.a, 0);
        posePigeonBird(b, { flapPhase: 0, amp: 0, fold: 1, grounded: true, walkPhase: t * 9 + i * 1.3, peck: Math.sin(t * 3 + i * 2) > 0.92 ? 1 : 0 });
      });
    },
    // beside him, a camera that walks at his pace (1,5 m/s): he in front, the trail of pigeons behind
    cams: [[0, (u, t) => {
      const d = -9 + 1.5 * t, c = sd(d - 2.2, walkOff - 3.4), m = sd(d - 2.2, walkOff + 0.1), z = zAt(c.x, c.y);
      return pose(clearCam(map, P(c.x, c.y, z + 1.55)), P(m.x, m.y, z + 1.0), 48, t, 0.015);
    }]],
  });
  const fShoulder = withDawn({
    ...base('c1-schouder'), clock: 6.45, mist: 0.2, focus: home,
    enter(r, s) { cupInHand(r, s); s.bird = buildPigeonBird('pigeon'); r.group.add(s.bird); },
    exit(r, s) { if (s.bird) disposeGeometry(s.bird); },
    tick(r, s, t, dt) {
      const q = sd(0.5, walkOff), z = zAt(q.x, q.y);
      stage(r.tammo, q.x, q.y, home.a, { h: z, speed: 0, pose: 'cups', dt, t });
      const k = smooth(t / 0.9);
      const sh = { x: q.x + hn.x * 0.18, y: q.y + hn.y * 0.18 };
      const from = { x: sh.x - hf.x * 1.6 + hn.x * 0.6, y: sh.y - hf.y * 1.6 + hn.y * 0.6, z: z + 2.2 };
      s.bird.position.set(lerp(from.x, sh.x, k), lerp(from.z, z + 1.55, k), lerp(from.y, sh.y, k));
      s.bird.rotation.set(0, -home.a, 0);
      posePigeonBird(s.bird, { flapPhase: t * 20, amp: k < 1 ? 0.9 : 0.1, fold: k < 1 ? 0 : 1, grounded: k >= 1 });
      // the sigh of the script, when the pigeon has landed (openingfilm.js SFX_KOPPELING)
      if (k >= 1 && !s.sighed) { s.sighed = true; sfxEvent(r.w, SFX_KOPPELING['c1-schouder'], q.x, q.y); }
    },
    // in front of him, looking back at him and the pigeon on his shoulder
    cams: [[0, (u, t) => {
      const q = sd(0.5, walkOff), z = zAt(q.x, q.y), c = { x: q.x + hf.x * 2.5 - hn.x * 1.0, y: q.y + hf.y * 2.5 - hn.y * 1.0 };
      return pose(clearCam(map, P(c.x, c.y, z + 1.55)), P(q.x, q.y, z + 1.5), 40, t, 0.01);
    }]],
  });
  // he holds the door open with his elbow (the kitchen door of the old name card shot, without the freeze frame and the card)
  const fDoor = withDawn({ ...tammoCard, ...base('c1-deur'), clock: 6.6, freeze: undefined, tags: undefined });

  // C00.2: the kitchen. The facade first: from the street up to the attic window, a slow dolly (7 m in the shot) with a tilt up
  const fFacade = withDawn({
    ...base('c2-gevel'), clock: 7.35, focus: home,
    enter(r, s) { s.car = tempCar(r, car.x, car.y, home.a) || tempCar(r, car.x, car.y, home.a, { model: { ...MODELS[0], color: ESCAPADE_RED } }); },
    tick(r, s) { if (s.car) { s.car.roll = 0.06; s.car.pitch = -0.025; } },
    cams: [[0, (u, t) => {
      const k = smooth(u);
      const pos = clearCam(map, P(car.x - hn.x * 12 - hf.x * 4 + hf.x * 7 * k, car.y - hn.y * 12 - hf.y * 4 + hf.y * 7 * k, lerp(1.4, 3.0, k)));
      return pose(pos, P(lerp(car.x, attic.x, k), lerp(car.y, attic.y, k), lerp(0.7, 8.2, k)), 50, t, 0.02);
    }]],
  });
  const fBank = (() => {
    const self = {
      ...base('c2-bank'), clock: 7.4, focus: home, kitchen: true,
      tags: [[NAME_CARDS.tessa.at ?? 1.0, 99, 'Tessa', NAME_CARDS.tessa.line]],
      enter(r, s) { s.kit = useKitchen(r, KIT); s.kit.holdCups(r.tammo, true); sfx(r.w, 'door_open', home.x, home.y); },
      tick(r, s, t, dt) {
        const L = self.timed;
        s.kit.hinge.rotation.y = lerp(-0.3, -1.25, smooth(t / 0.8));
        const k = clamp01((t - 0.3) / 1.4);
        const u = lerp(door.u, tStand.u, k), v = lerp(KITCHEN.hallStart, tStand.v, k);
        const walkA = Math.atan2(tStand.v - KITCHEN.hallStart, tStand.u - door.u);
        stageK(r.tammo, u, v, k < 1 ? walkA : tFace, { speed: k > 0 && k < 1 ? 1 : 0, pose: 'cups', dt, t });
        const up = said(L, 0, t);
        sitK(r.anita, KITCHEN.anitaSeat, 0, up ? 0.06 : -0.32, up ? -0.42 : 0);
      },
      cams: [
        [0, (u, t) => pose(K(-1.85, -1.3, 1.7), K(lerp(1.1, 0.8, u), lerp(1.3, 0.8, u), 1.25), 50, t, 0.006)],
        ['L1', (u, t) => { const c = K(tStand.u + toT.x * 0.7 - toT.y * 0.32, tStand.v + toT.y * 0.7 + toT.x * 0.32, 1.72); return pose(c, anitaHead, lerp(36, 33, u), t, 0.004); }],
        // after her punch line: Tammo's face over her shoulder
        ['L1E', (u, t) => { const c = K(KITCHEN.anitaSeat.u - toT.x * 0.55 + toT.y * 0.3, KITCHEN.anitaSeat.v - toT.y * 0.55 - toT.x * 0.3, 1.3); return pose(c, K(tStand.u, tStand.v, 1.6), 38, t, 0.004); }],
      ],
    };
    return self;
  })();
  const fCar = (() => {
    const self = {
      ...base('c2-wagen'), clock: 7.42, focus: home, kitchen: true,
      enter: cupsOn,
      tick(r, s, t) {
        const L = self.timed;
        sit(r, 0.04, 0, said(L, 3, t) ? -0.12 : 0);
        if (said(L, 0, t) && !said(L, 0, t, 1.4)) sitK(r.anita, KITCHEN.anitaSeat, 0, -0.3);
      },
      cams: [
        [0, (u, t) => pose(K(lerp(-0.15, 0.1, u), -1.3, 1.3), K(0, 0, 1.0), 46, t, 0.005)],
        ['L0', camAnita(30)],
        ['L1', camTammo(30)],
        ['L2', camAnita(30)],
        ['L3', camTammo(31, 26)],
      ],
    };
    return self;
  })();
  // the competition and the plan: shot / reverse shot per line, a close-up on "Het is een tekening", a reaction on "Dan rijd ik hem"
  const fPlan = (() => {
    const self = {
      ...base('c2-plan'), clock: 7.44, focus: home, kitchen: true,
      enter: cupsOn,
      tick(r, s, t) {
        const L = self.timed;
        sit(r, said(L, 4, t) && !said(L, 4, t, 2.6) ? -0.28 : 0.03, 0, said(L, 6, t) ? 0.25 : -0.04);
      },
      cams: [
        [0, camTable],
        ['L0', camAnita(30)],
        ['L1', camTammo(30)],
        ['L2', camAnita(30)],
        ['L3', camTammo(30)],
        ['L4', camAnita(34, 27)],
        ['L5', camTammo(32, 27)],
        ['L6', camTammo(30)],
      ],
    };
    return self;
  })();
  const fHome = (() => {
    const self = {
      ...base('c2-thuis'), clock: 7.46, focus: home, kitchen: true,
      enter: cupsOn,
      tick(r, s, t) {
        const L = self.timed;
        sit(r, said(L, 2, t) ? -0.04 : 0.05, 0, said(L, 1, t) ? 0.3 : -0.04);
      },
      cams: [
        [0, camAnita(32)],
        ['L1', camTammo(32)],
        ['L2', camAnita(34, 27)],
        ['L2E', camTammo(30)],
      ],
    };
    return self;
  })();
  // the confession: "…Samen." gets a slow zoom and silence, then the contract slides over the table
  const fRent = (() => {
    const self = {
      ...base('c2-huur'), clock: 7.48, focus: home, kitchen: true,
      enter: cupsOn,
      tick(r, s, t) {
        const L = self.timed;
        sit(r, said(L, 2, t) ? 0.04 : -0.04, said(L, 2, t) ? 0.25 : 0, said(L, 1, t) ? -0.3 : -0.05);
      },
      cams: [
        [0, camAnita(30)],
        ['L1-0.1', camTammo(31, 26)],
        ['L2-0.8', camDrawing],
        ['L2', camAnita(30)],
        ['L2E', camTammo(30)],
      ],
    };
    return self;
  })();
  // the Fries in a blue blazer, seen from the attic window: a sticker VERKOCHT on the chip shop across the street
  const kp = (d, off) => sd(d, -off);
  const fKiosk = withDawn({
    ...base('c2-raam'), clock: 7.5, focus: home,
    enter(r, s) {
      s.car = tempCar(r, car.x, car.y, home.a) || tempCar(r, car.x, car.y, home.a, { model: { ...MODELS[0], color: ESCAPADE_RED } });
      const o = kp(3, 6.4);
      const gz = zAt(o.x, o.y);
      // de kiosk uit het register (storyprops.js kiosk): kast, dak, luik met toonbank
      s.kiosk = DECOR_MAKERS.kiosk();
      s.kiosk.position.set(o.x, gz, o.y);
      r.group.add(s.kiosk);
      s.o = o; s.gz = gz;
      // the sticker VERKOCHT from the register (storyprops.js sticker), which grows when he sticks it on
      s.sticker = DECOR_MAKERS.sticker();
      s.sticker.position.set(o.x + hn.x * 1.02, gz + 1.14, o.y + hn.y * 1.02); // oorsprong onderaan de sticker
      s.sticker.lookAt(s.sticker.position.x + hn.x, s.sticker.position.y, s.sticker.position.z + hn.y);
      s.sticker.scale.setScalar(0.001);
      r.group.add(s.sticker);
      // the man: tall, blue blazer, back to the camera, hands on his hips
      s.man = makeActor({ shirt: 0x24398a, skin: 0xe2b48c, variant: 'male', seed: 4711, pants: 0x1d2a4a });
      s.man.scale.setScalar(1.14);
      r.group.add(s.man);
      // a pigeon on the roof of the kiosk, watching
      s.bird = buildPigeonBird('pigeon');
      r.group.add(s.bird);
    },
    exit(r, s) {
      if (s.kiosk) disposeModel(s.kiosk);
      if (s.sticker) disposeModel(s.sticker);
      if (s.man) disposeObject(s.man);
      if (s.bird) disposeGeometry(s.bird);
    },
    tick(r, s, t, dt) {
      if (s.car) { s.car.roll = 0.06; s.car.pitch = -0.025; }
      const m = { x: s.o.x + hn.x * 2.0, y: s.o.y + hn.y * 2.0 };
      stage(s.man, m.x, m.y, Math.atan2(-hn.y, -hn.x), { h: zAt(m.x, m.y), speed: 0, pose: 'hips', dt, t });
      s.sticker.scale.setScalar(clamp01((t - 2.2) / 1.0) * 0.999 + 0.001);
      // the slap of the sticker (openingfilm.js SFX_KOPPELING)
      if (t >= 2.2 && !s.slapped) { s.slapped = true; sfxEvent(r.w, SFX_KOPPELING['c2-raam'], s.o.x, s.o.y); }
      s.bird.position.set(s.o.x, s.gz + 2.5, s.o.y);
      s.bird.rotation.set(0, -(home.a + 0.4), 0);
      posePigeonBird(s.bird, { flapPhase: 0, amp: 0, fold: 1, grounded: true, walkPhase: 0, peck: t % 3 > 2.7 ? 1 : 0 });
    },
    // from the attic window height, a slow dolly along the street (3 m in the shot), looking across at the kiosk
    cams: [[0, (u, t, s) => {
      const k = smooth(u);
      const c = P(attic.x + hf.x * lerp(-1.5, 1.5, k), attic.y + hf.y * lerp(-1.5, 1.5, k), 8.4);
      return pose(c, P(s.o.x + hn.x * 1.2, s.o.y + hn.y * 1.2, s.gz + 1.5), 46, t, 0.01);
    }]],
  });
  // her phone buzzes on the table: "Kom. Werk."
  const fPhone = (() => {
    const self = {
      ...base('c2-kom'), clock: 7.5, focus: home, kitchen: true, lead: 1.4,
      enter: cupsOn,
      tick(r, s, t) {
        const L = self.timed;
        if (t > 0.3 && !s.rang) { s.rang = true; sfx(r.w, 'notify', home.x, home.y, { strength: 1 }); }
        s.kit.buzz(t, t > 0.3 && !said(L, 0, t, 0.6));
        if (said(L, 0, t)) stageK(r.anita, KITCHEN.anitaSeat.u + 0.1, KITCHEN.anitaSeat.v - 0.5, Math.atan2(0.5, KITCHEN.tammoSeat.u - KITCHEN.anitaSeat.u));
        else sitK(r.anita, KITCHEN.anitaSeat, 0, t > 0.3 ? -0.4 : 0.02, t > 0.3 ? 0.3 : 0);
        sitK(r.tammo, KITCHEN.tammoSeat, Math.PI, t > 0.3 ? 0.06 : -0.2, t > 0.3 ? 0.25 : 0);
      },
      cams: [
        [0, (u, t) => pose(K(-0.2, -0.5, 1.02), K(KITCHEN.phone.u, KITCHEN.phone.v, KITCHEN.tableH), 30, t, 0.002)],
        ['L0', (u, t) => pose(K(1.45, -0.75, 1.5), K(KITCHEN.anitaSeat.u + 0.1, KITCHEN.anitaSeat.v - 0.5, 1.45), 40, t, 0.005)],
      ],
    };
    return self;
  })();

  // C00.3: moving day. The proven moving-day shot with its own two lines, then a second shot with the competition, the tyre and the kicker
  const fMoveIn = { ...verhuis, ...base('c3-toren'), clock: 10.6 };
  const camMoveTammo = verhuis.cams[1][1], camMoveAnita = verhuis.cams[2][1];
  const fMoveMoney = {
    ...verhuis, ...base('c3-geld'), clock: 10.65, caption: undefined, stamp: undefined,
    tick(r, s, t, dt) { verhuis.tick(r, s, 99, dt); if (s.car) { s.car.roll = 0.05; s.car.pitch = -0.02; } },
    // the camera: Tessa, Tammo, Tessa, Tessa for the kicker, Tammo for the reaction after it (AAA30 regie: no cutaway to the tyre while she says it)
    cams: [
      [0, camMoveAnita],
      ['L1', camMoveTammo],
      ['L2', camMoveAnita],
      ['L3', camMoveAnita],
      ['L3E', camMoveTammo],
    ],
  };
  const fSwoop = { ...swoop, ...base('c3-zweef'), film: true };

  return [fBlack, fCrane, fRoofs, fPlein, fBikes, fGull, fTitle, fStreet, fShoulder, fDoor, fFacade, fBank, fCar, fPlan, fHome, fRent, fKiosk, fPhone, fMoveIn, fMoveMoney, fSwoop];
}

// Speaker keys: T, A, V (Rikus, the narrator, always on the radio).
const WHO = { T: 'Tammo', A: 'Anita', V: NARRATOR };

function voiceOf(who, text) {
  const v = voices[who + '|' + text];
  if (v) return { src: VOICE_DIR + v.src, dur: v.dur };
  if (FILM_VOICES[who + '|' + text]) return FILM_VOICES[who + '|' + text];
  return lineVoiceFor(who, text);
}

const readDur = (text) => Math.max(1.6, text.length / 14);

// Lines play back to back from the shot's `lead` (a recorded line holds
// until its recording ends); the shot then ends on the next beat of the
// theme. "L2+1.5" in cams/tags = 1.5 s after line 2 starts.
function timeShots(shots) {
  let T = 0;
  for (const s of shots) {
    let t = s.lead ?? 0.5;
    s.timed = (s.lines || []).map(([k, text], i) => {
      t += (s.gaps && s.gaps[i]) || 0;
      const who = WHO[k] || k;
      const v = voiceOf(who, text);
      const l = { who, text, at: t, dur: v ? v.dur + 0.12 : readDur(text), voice: v && v.src, radio: !!s.radio || k === 'V' };
      t = l.at + l.dur + 0.06;
      return l;
    });
    const want = Math.max(s.minDur || 3, t + (s.lines ? 0.3 : 0));
    const k = Math.ceil((T + want - BEAT0) / BEAT);
    s.dur = BEAT0 + k * BEAT - T;
    const at = (spec) => {
      if (typeof spec === 'number') return spec;
      const m = /^L(\d+)(E)?(?:([+-][\d.]+))?$/.exec(spec);
      const l = m && s.timed[+m[1]];
      // "L1E": the END of line 1 (AAA30 regie: a reaction shot starts when the line is over, never in the middle of it)
      return l ? l.at + (m[2] ? l.dur : 0) + (m[3] ? +m[3] : 0) : 0;
    };
    if (s.cams) s.camAt = s.cams.map(([spec]) => Math.max(0, Math.min(s.dur - 0.3, at(spec))));
    if (s.tags) s.tagAt = s.tags.map(([a, b, name, role]) => [at(a), at(b), name, role]);
    s.capFrom = s.capAt != null ? at(s.capAt) : 0.35;
    T += s.dur;
  }
  return T;
}

function enterShot(r, i) {
  const prev = r.shots[r.idx];
  if (prev && prev.exit) prev.exit(r, r.state);
  removeTempCars(r);
  for (const o of [...r.group.children]) {
    if (o === r.tammo || o === r.anita) continue;
    r.group.remove(o);
    if (o.isInstancedMesh) o.dispose();
  }
  r.tammo.visible = false;
  r.anita.visible = false;
  r.idx = i;
  r.state = {};
  r.camIdx = 0;
  r.frozen = false;
  document.body.classList.remove('im-frozen');
  const shot = r.shots[i];
  const w = r.w;
  if (r.kit) {
    r.kit.holdCups(r.tammo, false);
    r.kit.group.visible = !!shot.kitchen;
  }
  setSub(null);
  setTag(null);
  ui.lower.classList.remove('on');
  ui.cap.classList.remove('on');
  if (shot.caption) {
    const [place, text] = shot.caption;
    const stamp = shot.stamp || (shot.clock != null ? clockText(shot.clock) : '');
    ui.cap.innerHTML = `<small>${[stamp, place].filter(Boolean).join(' · ')}</small><span>${text}</span>`;
  }
  if (shot.black) {
    ui.black.classList.add('on');
    if (shot.card) showCard(shot.card, shot.dur);
    if (!r.film) sfx(w, 'camera_shutter', hoofdspeler(w).x, hoofdspeler(w).y);
  } else {
    ui.black.classList.remove('on');
    // a big trailer word over the picture
    if (shot.card) showCard(shot.card, shot.cardDur || shot.dur);
    else ui.card.classList.remove('on');
    if (!r.film && (!prev || !prev.black)) flash();
    sfx(w, 'whoosh', hoofdspeler(w).x, hoofdspeler(w).y);
  }
  if (r.film && !r.themeOn && shot.filmId && shot.filmId === themeEntryShot()) { r.themeOn = true; cueTheme(0); }
  ui.flare.classList.toggle('on', !!shot.flare);
  if (shot.flare) {
    ui.flare.style.setProperty('--fx', shot.flare.x + '%');
    ui.flare.style.setProperty('--fy', shot.flare.y + '%');
    ui.flare.style.setProperty('--fa', String(shot.flare.a ?? 1));
  }
  if (shot.restore || shot.home) restoreHome(r);
  else if (shot.focus) {
    w.cinematicHidePlayers = true;
    w.cinematicHideNav = true;
    moveSet(r, shot.focus.x, shot.focus.y);
  }
  if (shot.clock != null) { setClock(w, shot.clock); setWeather(w, shot.mist || 0); }
  if (shot.enter) shot.enter(r, r.state);
  if (shot.lower) setTimeout(() => { if (run === r && r.idx === i) { ui.lower.innerHTML = shot.lower; ui.lower.classList.add('on'); } }, 500);
}

function restoreHome(r) {
  const w = r.w, s = r.saved;
  // de montage zet het eigen lichaam terug op de bewaarde plek: schrijven, dus
  // hoofdspeler(world); de rest van dit bestand leest via hoofdspeler (#500)
  w.player.x = s.px; w.player.y = s.py; w.player.angle = s.pa; w.player.vx = 0; w.player.vy = 0;
  const c = w.companion;
  if (c && s.comp) { c.x = s.comp.x; c.y = s.comp.y; c.angle = s.comp.angle; c.vx = 0; c.vy = 0; }
  setClock(w, s.clock);
  if (s.weather) w.weather = s.weather;
  w.wanted = s.wanted;
  w.cinematicHidePlayers = false;
  w.cinematicHideNav = false;
  if (!r.homeLoaded) {
    r.homeLoaded = true;
    try {
      manageTrafficPopulation(w);
      manageBikePopulation(w);
      w.pedestrians = w.pedestrians.filter((q) => q.state === 'dead' || Math.hypot(q.x - s.px, q.y - s.py) < 150);
      if (w.pedestrians.length < PED_TARGET) w.pedestrians.push(...spawnPedestriansNear(w.map, s.px, s.py, PED_TARGET - w.pedestrians.length, Math.random));
    } catch (e) { console.warn(e); }
  }
}

function frame(r, t) {
  const dtReal = Math.max(0, Math.min(0.1, t - r.lastT));
  r.lastT = t;
  const T = t + r.offset;
  let i = r.idx < 0 ? 0 : r.idx;
  while (i < r.shots.length - 1 && T >= r.starts[i + 1]) i++;
  if (i !== r.idx) enterShot(r, i);
  const shot = r.shots[i];
  const st = T - r.starts[i];
  const w = r.w;
  // a freeze frame: from shot.freeze on, the camera, the actors and the city stand still
  const frozen = shot.freeze != null && st >= shot.freeze;
  if (frozen && !r.frozen) {
    r.frozen = true;
    flash();
    sfx(w, 'camera_shutter', hoofdspeler(w).x, hoofdspeler(w).y);
    document.body.classList.add('im-frozen');
  }
  const sv = frozen ? shot.freeze : st;
  const slow = shot.slow ? shot.slow(sv) : 1;
  const dt = frozen ? 0 : dtReal * slow;
  if (shot.clockTo != null) setClock(w, lerp(shot.clock, shot.clockTo, clamp01(sv / shot.dur)));
  if (!shot.black && dt > 0) {
    w.time += dt;
    ambient(r, dt, slow);
  }
  if (shot.tick && dtReal > 0) shot.tick(r, r.state, sv, dt);
  if (shot.timed.length) {
    const l = shot.timed.find((q) => st >= q.at && st < q.at + q.dur);
    setSub(l || null);
    // narration heard here is not repeated when H1 opens (missionstory.js)
    if (l && l.who === NARRATOR && st > l.at + l.dur * 0.6 && !w.introTold.includes(l.text)) w.introTold.push(l.text);
  }
  // on the shot's own clock: slow frames must not drift the caption off
  ui.cap.classList.toggle('on', !!shot.caption && st > shot.capFrom && st < Math.min(shot.capFrom + 4.05, shot.dur - 0.6));
  if (shot.tagAt) {
    const g = shot.tagAt.find(([a, b]) => st >= a && st < b);
    setTag(g ? { name: g[2], role: g[3] } : null);
  }
  if (shot.cams) {
    let k = 0;
    while (k < shot.cams.length - 1 && sv >= shot.camAt[k + 1]) k++;
    // a cut inside a shot: a hard cut on the line, only a soft whoosh
    if (k !== r.camIdx) { r.camIdx = k; sfx(w, 'whoosh', hoofdspeler(w).x, hoofdspeler(w).y, { strength: 0.4 }); }
    const a = shot.camAt[k], b = k + 1 < shot.cams.length ? shot.camAt[k + 1] : shot.dur;
    r.pose = shot.cams[k][1](clamp01((sv - a) / Math.max(0.1, b - a)), sv, r.state);
  }
  return r.pose;
}

function cleanup(r, skipped) {
  const prev = r.shots[r.idx];
  // whatever a shot left behind, the montage itself must always end
  try { if (prev && prev.exit) prev.exit(r, r.state); } catch (e) { console.error('intro exit', e); }
  try { removeTempCars(r); } catch (e) { console.error('intro cars', e); }
  try { if (r.kit) { r.kit.dispose(); r.kit = null; } } catch (e) { console.error('intro kitchen', e); }
  try { if (r.w && r.w.__openingWarm) { disposeObject(r.w.__openingWarm); r.w.__openingWarm = null; } } catch (e) { console.warn('opening-assets vrij', e); }
  try { releaseWarmupSamples(); } catch (e) { console.warn('warm-samples vrij', e); }
  try { setCinematicBatches(false); } catch (e) { /* niet erg */ }
  try { if (r.w) r.w.cineQuiet = performance.now() + 15000; } catch (e) { /* niet erg */ }
  try { releaseHeldMaterials(); } catch (e) { console.warn('vastgehouden materialen vrij', e); }
  try { setHoldGrass(false); } catch (e) { console.warn('gras-hold vrij', e); }
  try { if (r.w && r.w.map && r.w.map.releaseShots) r.w.map.releaseShots(); } catch (e) { console.warn('intro-tegels vrij', e); }
  r.group.removeFromParent();
  // #796: de twee intro-acteurs delen hun rompgeometrie met de rest van het spel; via de gewone
  // opruimer gaat die ref terug (en het skelet weg) in plaats van te blijven staan.
  for (const m of [r.tammo, r.anita]) if (m) disposeObject(m);
  document.body.classList.remove('im-frozen');
  try { restoreHome(r); } catch (e) { console.error('intro home', e); }
  if (ui) {
    ui.root.classList.remove('on');
    if (skipped) {
      ui.black.classList.add('on');
      setTimeout(() => { if (!run) ui.black.classList.remove('on'); }, 350);
    } else ui.black.classList.remove('on');
    ui.card.classList.remove('on');
    ui.lower.classList.remove('on');
    ui.cap.classList.remove('on');
    ui.flare.classList.remove('on');
    setSub(null);
    setTag(null);
  }
  if (r.w) r.w.cinemaLean = false;
  document.body.classList.remove('intro-montage');
  stopStoryVoice();
  setStoryScene(false, 'intro');
  setThemeDuck(false);
  markIntroSeen();
  run = null;
  setIntroPlaying(false);
}

// De vaste, unieke assets van de opening (twee acteurs, keuken, duivenvlucht en
// losse props) één keer bouwen zodat scene3d ze tijdens het laadscherm voor
// beide lichtstanden compileert. De montage bouwt ze bij het spelen gewoon
// opnieuw; de winst is dat de shaderprogramma's dan al gelinkt zijn (#804).
export function prepareOpeningWarm() {
  const group = new THREE.Group();
  const probe = (fn) => { try { const o = fn(); if (o) group.add(o); } catch (e) { console.warn('opening-warm', e); } };
  probe(() => { group.add(makeActor(TAMMO_APPEARANCE), makeActor(ANITA_APPEARANCE)); return null; });
  probe(() => buildKitchen(0, 0, 0).group);
  probe(() => { makeBirds(group, 0, 0, 2.5, 8); return null; });
  probe(buildAtmTrailer); probe(buildWetBike); probe(buildFrikandel); probe(buildRope);
  return group;
}
// flyShot(): the camera path from the sky down to behind the player; built by cinematics.js.
// De plekken waar de montage langskomt (de focus van elk shot). De boot laadt
// en pint hun tegels al tijdens het laadscherm en bouwt de gebouwen voor, zodat
// de film niet elke cut shaders en buurten voor het eerst hoeft te doen (#804).
export function introShotPoints(w) {
  const out = [];
  const seen = new Set();
  try {
    for (const s of buildShots(w)) {
      const f = s.focus;
      if (!f || !Number.isFinite(f.x) || !Number.isFinite(f.y)) continue;
      const k = `${Math.round(f.x / 40)},${Math.round(f.y / 40)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ x: f.x, y: f.y });
    }
  } catch (e) { console.warn('intro-shotpunten', e); }
  return out;
}
// #738: `maxShots` speelt alleen het eerste deel (de trailerbeelden: zon op
// d'Olle Grieze, fietsers, meeuw met frikandel, werkboot, naam- en titelkaart).
// story.js hergebruikt dat deel als C00.1 en speelt daarna de keuken en de
// verhuisdag uit cutscenes.js.
export function playTrailerMontage(w, { onDone } = {}) {
  return playIntroMontage(w, { maxShots: 12, onDone });
}

// The staged film (openingfilm.js, ?openingfilm). false when it cannot start (the caller plays the old opening); onDone(skipped, failed): failed means
// a shot threw while playing, the film was stopped and the caller plays the old opening instead.
// QA-haak (scripts/qa/opening_film_beelden.page.js): welk shot van de film speelt nu
if (typeof window !== 'undefined') window.__introFilm = () => (run ? { idx: run.idx, id: (run.shots[run.idx] || {}).filmId || null, st: Math.round((run.lastT + run.offset - (run.starts[run.idx] || 0)) * 10) / 10, starts: run.starts.map((x) => Math.round(x * 100) / 100), ids: run.shots.map((q) => q.filmId || null), durs: run.shots.map((q) => Math.round(q.dur * 100) / 100) } : null);

export function playOpeningFilm(w, { onDone } = {}) {
  try { return playIntroMontage(w, { onDone, film: true }); } catch (e) { console.warn('opening-film', e); return false; }
}

export function playIntroMontage(w, { startAt = 0, flyShot, onDone, maxShots = Infinity, film = false } = {}) {
  if (run) return false;
  ensureUi();
  const scene = getScene();
  const group = new THREE.Group();
  group.name = 'intro-montage';
  scene.add(group);
  const tammo = makeActor(TAMMO_APPEARANCE);
  const anita = makeActor(ANITA_APPEARANCE);
  tammo.visible = anita.visible = false;
  group.add(tammo, anita);
  let alle;
  try { alle = buildShots(w, film); } catch (e) { if (!film) throw e; console.warn('opening-film bouwen', e); group.removeFromParent(); disposeObject(tammo); disposeObject(anita); return false; }
  const shots = Number.isFinite(maxShots) ? alle.slice(0, Math.max(1, Math.floor(maxShots))) : alle;
  const total = timeShots(shots);
  const starts = [];
  let acc = 0;
  for (const s of shots) { starts.push(acc); acc += s.dur; }
  w.introTold = [];
  const p = hoofdspeler(w), c = w.companion;
  const r = {
    w, group, tammo, anita, shots, starts, cars: [], idx: -1, state: {}, lastT: 0, offset: Math.max(0, Math.min(total - 1, startAt)),
    camIdx: 0, pose: null, flyShot, film, failed: false,
    saved: { px: p.x, py: p.y, pa: p.angle, clock: typeof w.clock === 'number' ? w.clock : 17.5, wanted: w.wanted || 0, weather: w.weather, comp: c ? { x: c.x, y: c.y, angle: c.angle } : null },
  };
  run = r;
  w.cinemaLean = true;
  setIntroPlaying(true);
  document.body.classList.add('intro-montage');
  setCinematicBatches(true); // nieuwe batches gespreid compileren/tonen tijdens de film
  setStoryScene(true, 'intro');
  // from the top, so the cuts land on the song's beats
  // the film opens in silence (street sound, Rikus): its theme falls in on the first crane shot (MUSIC cue thema-in, see enterShot)
  if (!r.offset && !film) cueTheme(0);
  ui.root.classList.add('on');
  // de plekken wisselen in de film (de Grote Markt, de Oosterparkwijk, Paddepoel): de volgende plek warmt vooruit en een harde sprong
  // wacht onder zwart tot de buurt er staat (cutscenewarm.js, #1016). Tijd t van de cinematic = montagetijd min het beginpunt.
  // #1171: ook het eerste shot is een sprong (van de speler naar de toren): stopsFromStart zet de speler vooraan, zodat het begin onder zwart wacht tot de plek er staat
  const jumps = jumpsFromStops(stopsFromStart(shots.map((s, i) => (s.focus && Number.isFinite(s.focus.x) && Number.isFinite(s.focus.y) ? { t: starts[i] - r.offset, x: s.focus.x, y: s.focus.y } : null)), { x: p.x, y: p.y }));
  const ok = playCinematic({
    id: 'intro', priority: 6, jumps, duration: total - r.offset, pause: true, letterbox: true, skippable: true, hideHud: true, realtime: true,
    // the film runs longer than the safety watch's 150 s cap (cinelimit.js): without `long` it was cut at 150 s, in the middle of the moving-day shots, and the swoop never played
    long: true,
    shot: (u, t) => {
      if (!r.film) return frame(r, t);
      // the film must never take the game down: an error stops it and the old opening takes over
      try { return frame(r, t); } catch (e) { if (!r.failed) { r.failed = true; console.warn('opening-film speelfout', e); setTimeout(() => skipCinematic(), 0); } return r.pose; }
    },
    onEnd: (skipped) => {
      cleanup(r, skipped);
      if (onDone) onDone(skipped, !!r.failed);
    },
  });
  if (!ok) cleanup(r);
  return ok;
}

