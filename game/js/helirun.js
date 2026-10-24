import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene, prewarmStreamAt } from './scene3d.js';
import { basketRiderPose } from './basketrider.js';
import { buildPersonMesh, animatePersonWalk, TAMMO_APPEARANCE } from './models3d_people.js';
import { helipadInfo, scriptHeli, landHeliOnPad } from './skyprops.js';
import { isMissionActive, getActiveRace } from './missionquery.js';
import { isCinematicActive } from './cinematics.js';
import { isShopOpen } from './shopui.js';
import { pushAudioEvent } from './pedgeom.js';
import { unlockAchievement, setStatMax, recordStat, recordChallengeResult } from './achievements.js';
import { makeHeli, flyHeli, helipadById, HELI_MODEL } from './heliflight.js';
import { findClearSpot } from './helispawn.js';
import { ringCounter, landingGuide, guideColor } from './heligrade.js';
import { chaseTarget, followCam } from './helicam.js';
import { lineVoiceFor } from './linevoice.js';
import { playLineVoice } from './audio.js';
import { SPEAKERS, STEP_BY_ID } from './storyarc.js';
import { speakerHtml } from './speakers.js';
import { dualHtml } from './subtitles.js';
import { clamp } from './util.js';
import * as P from './heliplan.js';
import { storyLines } from './storytext.js';
import { getSettings } from './settings.js';
import { keyWord, keyName, physicalKey } from './controls.js';
import { playerBusy } from './busy.js';
import { waarschuwVoorStart } from './coopstatus.js';
const downKey = () => keyWord(getSettings().keyBinds, 'control');
// the key help under the heli HUD, in the player's own key bindings
const kbd = (k) => `<kbd>${k === 'backspace' ? '⌫' : keyName(physicalKey(getSettings().keyBinds, k))}</kbd>`;
const helpHtml = () => `${kbd('w')}${kbd('s')} vooruit en remmen · ${kbd('a')}${kbd('d')} draaien · ${kbd('shift')} sneller · ${kbd(' ')} omhoog · ${kbd('control')} omlaag · ${kbd('backspace')} stoppen`;

// A heli run: one flight in Rotor Roelf's demo heli (the Wieken Wubbo,
// heliflight.js, flown with the normal heli keys) with a plan on top
// (heliplan.js): rings, Jelle's balloon and a landing on a marked H.
//   ballonjacht  (standalone, E at the UMCG spot) off from the UMCG deck: a ring
//                tour over Stad, catch up with the balloon, land on the deck again
//   traumaduif   (story H15) off from Rotor Roelf's pad on Eelde: Dokter Dijkstra
//                calls with a spoedje, land on the UMCG deck, she climbs in with
//                her lier, rings to the Oosterpark, Tammo takes the Eierbal from the
//                basket, back down on the UMCG deck
// An arrow and the distance point at the next ring, pad or the basket; the
// minimap shows the rings where they are and turns with the heli. A little
// steering and height help (heliplan.js assist) keeps it doable.
//
// API
//   startHeliRun({ variant, onFinish }) -> boolean (false: a run is going, or the player can't leave)
//     onFinish(result) once the player is back on the street:
//       { variant, success, aborted, score, medal (0-3), medalName, rings, ringsTotal, time, timeLeft, hits }
//   abortHeliRun(), isHeliRunActive(), getHeliRun() (read-only state)
//   getHeliRunMarks() -> { rings: [{ x, y, state }], pad, balloon, target } for the maps
// main.js calls initHeliRun, updateHeliRun (instead of the player update while
// world.heliRun is set) and tryHeliSpotInteract; prompts.js, hud_panel.js and
// mapview.js use heliSpotPrompt, heliSpotSecondary, getHeliSpotsForRender and
// drawHeliMapIcon. world.heliRunTarget is where routing.js draws the line.
// window.__heliRun (debug): start, abort, autopilot, state, marks.

const USE_RADIUS = 2.6;
const RING_SCORE = 100, CATCH_SCORE = 1000, TIME_SCORE = 10, HIT_PENALTY = 100;
// Brons for any catch; zilver and goud need these scores.
export const HELI_MEDAL_SCORES = [0, 0, 2400, 3000];
const MEDALS = HELI_MEDAL_SCORES;
const MEDAL_NAMES = ['', 'Brons', 'Zilver', 'Goud'];
const INTRO_S = 3.6, RESULT_S = 5.5, PICKUP_S = 2.5, FADE_S = 0.7;
const BALLOON_GONE_M = 1800;
const BALLOON_SEED = 1810;

const VARIANTS = {
  ballonjacht: {
    title: 'Ballonjacht', sub: 'Vlieg door de ringen en haal de ballon in', timeLimit: 300, ringBonus: 3,
    doneText: 'Gekoppeld en geland! De ballonvaarders zwaaien.', failText: 'De ballon is weg…', catchText: 'Koppelen: hou hoogte en snelheid van de mand vast',
  },
  traumaduif: {
    title: 'Het staat niet in het rooster', sub: 'Rotor Roelfs demoheli: op naar Stad', timeLimit: 0, ringBonus: 0,
    doneText: 'Geland, met de Eierbal!', failText: 'De ballon verdwijnt richting de Ommelanden…', catchText: 'Tammo staat in de mand: blijf naast de mand',
  },
  // the new story's M12: Lauwersoog, the lunch at the UMCG, then the aktetas from Jelle's balloon over the Dollard
  rooster: {
    title: 'Het staat niet in het rooster', sub: 'Dijkstra vliegt: eerst het UMCG, dan de ballon boven de Dollard', timeLimit: 0, ringBonus: 0,
    doneText: 'Tammo heeft de aktetas met het koopboek!', failText: 'De ballon verdwijnt over de Dollard…', catchText: 'Tammo hangt aan de lier: blijf naast de mand',
  },
};

let world = null;
let scene = null;
let run = null;
let spot = null;
let hud = null;
let autopilot = false;

function sfx(kind, strength = 0.6) {
  if (run) pushAudioEvent(world, { kind, x: run.v.x, y: run.v.y, strength });
}

// --- pads -------------------------------------------------------------------

// direction from a point to the UMCG deck (the platform at Lauwersoog faces it)
function umcgDir(w, from) {
  const u = helipadInfo(w.map);
  return u ? { x: u.x - from.x, y: u.y - from.y } : { x: 1, y: 0 };
}

function runPads(w) {
  const u = helipadInfo(w.map);
  const out = {};
  if (u) out.umcg = { id: 'umcg', x: u.x, y: u.y, deck: u.deck, r: u.r, angle: u.angle };
  const lw = P.ROOSTER.lauwersoog;
  out.lauwersoog = { id: 'lauwersoog', x: lw.x, y: lw.y, deck: w.map.groundHeightAt ? w.map.groundHeightAt(lw.x, lw.y, 0) : 0, r: 6, angle: Math.atan2(umcgDir(w, lw).y, umcgDir(w, lw).x) };
  const e = helipadById('eelde');
  if (e) out.eelde = { id: 'eelde', x: e.x, y: e.y, deck: e.z, r: e.r, angle: -Math.PI / 2 };
  return out;
}

// --- 3D: rings, the H beacon, Tammo on the lier, the start spot ---------------

const RING_GEO = new THREE.TorusGeometry(P.RING_R, 0.5, 8, 44);
const RING_MATS = {
  next: new THREE.MeshBasicMaterial({ color: 0xffc21a, transparent: true, opacity: 0.95, fog: false }),
  later: new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.55, fog: false }),
  done: new THREE.MeshBasicMaterial({ color: 0x5dff7a, transparent: true, opacity: 0.8, fog: false }),
  miss: new THREE.MeshBasicMaterial({ color: 0xff5a3c, transparent: true, opacity: 0.5, fog: false }),
};

// The Steam trailer (trailer.js) stages a ring tour with these: the real
// rings and the real HUD, without a run.
export function heliTrailerKit() {
  return { hud, ringGeo: RING_GEO, ringMats: RING_MATS };
}

function buildRings(leg) {
  const group = new THREE.Group();
  group.name = 'helirun-rings';
  for (const r of leg.rings) {
    const m = new THREE.Mesh(RING_GEO, RING_MATS.later);
    m.position.set(r.x, r.z, r.y);
    m.rotation.y = -r.yaw + Math.PI / 2;
    group.add(m);
    r.mesh = m;
    r.state = 'later';
  }
  scene.add(group);
  return group;
}

// A tall light column and a pulsing ring on the deck: where to land.
function buildBeacon() {
  const g = new THREE.Group();
  g.name = 'helirun-beacon';
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 90, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x5dff7a, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beam.position.y = 45;
  const ring = new THREE.Mesh(new THREE.RingGeometry(4.6, 5.6, 40).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x5dff7a, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
  ring.position.y = 0.08;
  g.add(beam, ring);
  g.userData.ring = ring;
  g.visible = false;
  scene.add(g);
  return g;
}

function buildHanger() {
  const g = new THREE.Group();
  g.name = 'helirun-lier';
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), new THREE.MeshLambertMaterial({ color: 0x2a2a2a }));
  const man = buildPersonMesh(TAMMO_APPEARANCE.shirt, TAMMO_APPEARANCE.skin, TAMMO_APPEARANCE);
  g.add(rope, man);
  g.userData = { rope, man };
  g.visible = false;
  scene.add(g);
  return g;
}

const SPOT_COLOR = '#f0c21a';

function drawHeliGlyph(g, r, color = '#1c1d20') {
  g.save();
  g.scale(r / 10, r / 10);
  g.fillStyle = color;
  g.strokeStyle = color;
  g.beginPath();
  g.ellipse(-1, 1, 5.2, 3.4, 0, 0, Math.PI * 2);
  g.fill();
  g.fillRect(-10, -0.2, 7, 1.8);
  g.fillRect(-10.5, -2.6, 1.6, 4.4);
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(-8.5, -4.2); g.lineTo(7.5, -4.2);
  g.moveTo(-1, -4.2); g.lineTo(-1, -2.2);
  g.moveTo(-4, 5.8); g.lineTo(3.5, 5.8);
  g.stroke();
  g.restore();
}

export function drawHeliMapIcon(ctx, s) {
  ctx.beginPath();
  ctx.arc(0, 0, 4.6 * s, 0, Math.PI * 2);
  ctx.fillStyle = SPOT_COLOR;
  ctx.fill();
  ctx.lineWidth = 1.2 * s;
  ctx.strokeStyle = '#0c140e';
  ctx.stroke();
  drawHeliGlyph(ctx, 3.2 * s);
}

export function getHeliSpotsForRender() {
  return spot ? [spot] : [];
}

function buildSpotMarker(x, y) {
  const group = new THREE.Group();
  group.position.set(x, 0, y);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.04, 20), new THREE.MeshLambertMaterial({ color: 0xf0c21a, transparent: true, opacity: 0.85 }));
  pad.position.y = 0.03;
  group.add(pad);
  const S = 128, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  g.beginPath(); g.arc(0, 0, S / 2 - 6, 0, Math.PI * 2);
  g.fillStyle = SPOT_COLOR; g.fill();
  g.lineWidth = 7; g.strokeStyle = '#1c1d20'; g.stroke();
  drawHeliGlyph(g, 44);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  badge.scale.set(0.55, 0.55, 1);
  badge.position.y = 2.3;
  badge.onBeforeRender = () => { badge.position.y = 2.3 + Math.sin(performance.now() / 650) * 0.06; };
  group.add(badge);
  return group;
}

// Pilot "Dokter Dijkstra" in an orange flight suit next to the spot.
function buildPilot(map, x, y) {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const [px, py] = map.escapeBuilding(x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 0.4);
    if (Math.hypot(px - x, py - y) > 3.5) continue;
    const m = buildPersonMesh(0xe8641c, 0xe0b48a, { seed: 77, variant: 'male', pants: 0xe8641c, shoes: 0x222222 });
    m.position.set(px, 0, py);
    m.rotation.y = -Math.atan2(y - py, x - px);
    scene.add(m);
    return m;
  }
  return null;
}

function placeSpot(map) {
  const pad = helipadInfo(map);
  if (!pad) return null;
  const open = map.findOpenSpawn(pad.x, pad.y, 250);
  if (!open) return null;
  const s = { id: 'umcg', name: 'Ballonjacht UMCG', x: open.x, y: open.y, marker: buildSpotMarker(open.x, open.y) };
  scene.add(s.marker);
  s.pilot = buildPilot(map, open.x, open.y);
  return s;
}

// --- HUD --------------------------------------------------------------------

const CSS = `
body.heli-run #hud .hud-top-left, body.heli-run #hud .hud-wanted, body.heli-run #hud .hud-money,
body.heli-run #hud .hud-money-delta, body.heli-run #hud .hud-weapon, body.heli-run #hud .hud-mission,
body.heli-run #hud .hud-speedo, body.heli-run #hud .hud-route, body.heli-run #hud .hud-damage, body.heli-run .phonefeed-card { display: none !important; }
#heli-hud[hidden] { display: none; }
#heli-hud { position: fixed; inset: 0; pointer-events: none; font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; color: #f0ede4; z-index: 5; }
#heli-hud .hh-panel { position: absolute; top: 14px; left: 14px; min-width: 200px; padding: 10px 14px 12px; background: linear-gradient(160deg, rgba(20,16,6,0.8), rgba(20,16,6,0.5)); border-left: 4px solid #f0c21a; border-radius: 0 6px 6px 0; box-shadow: 0 4px 18px rgba(0,0,0,0.35); }
#heli-hud .hh-title { font-size: 24px; letter-spacing: 2px; color: #f0c21a; line-height: 1; max-width: 260px; }
#heli-hud .hh-row { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; margin-top: 4px; font-size: 16px; letter-spacing: 1px; color: rgba(240,237,228,0.75); }
#heli-hud .hh-row[hidden] { display: none; }
#heli-hud .hh-row b { font-weight: normal; font-size: 24px; color: #f0ede4; }
#heli-hud .hh-row b.low { color: #ff6a4a; }
#heli-hud .hh-score b { color: #f0c21a; font-size: 30px; }
#heli-hud .hh-alt { position: absolute; right: 26px; top: 50%; transform: translateY(-50%); width: 46px; height: 260px; background: rgba(20,16,6,0.55); border-radius: 6px; border: 1px solid rgba(240,194,26,0.4); }
#heli-hud .hh-alt i { position: absolute; left: 4px; right: 4px; height: 4px; margin-top: -2px; border-radius: 2px; }
#heli-hud .hh-alt .me { background: #f0c21a; box-shadow: 0 0 8px #f0c21a; }
#heli-hud .hh-alt .bal { background: #ff7ab6; }
#heli-hud .hh-alt .ring { background: rgba(93,255,122,0.85); height: 3px; }
#heli-hud .hh-alt span { position: absolute; left: -2px; right: -2px; bottom: -22px; text-align: center; font-size: 15px; }
#heli-hud .hh-guide { position: absolute; left: 50%; top: 12px; transform: translateX(-50%); text-align: center; padding: 6px 16px 8px; background: rgba(20,16,6,0.6); border-radius: 8px; min-width: 220px; max-width: 90vw; }
#heli-hud .hh-guide[hidden] { display: none; }
#heli-hud .hh-arrow { display: block; width: 46px; height: 46px; margin: 0 auto; }
#heli-hud .hh-arrow path { fill: #5dff7a; stroke: #0c140e; stroke-width: 2; }
#heli-hud .hh-goal { font-size: 20px; letter-spacing: 1px; line-height: 1.1; }
#heli-hud .hh-goal small { display: block; font: 14px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.85); letter-spacing: 0; }
#heli-hud .hh-goal .up, #heli-hud .hh-goal .down { color: #ffc21a; }
#heli-hud .hh-catch { position: absolute; left: 50%; bottom: 17%; transform: translateX(-50%); width: min(520px, 90vw); text-align: center; }
#heli-hud .hh-catch[hidden] { display: none; }
#heli-hud .hh-catch .lbl { font-size: 20px; letter-spacing: 1px; text-shadow: 0 2px 6px rgba(0,0,0,0.7); }
#heli-hud .hh-catch .bar { height: 10px; margin-top: 6px; background: rgba(240,237,228,0.15); border-radius: 5px; overflow: hidden; }
#heli-hud .hh-catch .bar i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #f0c21a, #5dff7a); }
#heli-hud .hh-catch .tips { margin-top: 5px; font: 14px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.85); }
#heli-hud .hh-catch .tips .ok { color: #5dff7a; }
#heli-hud .hh-msg { position: absolute; left: 50%; top: 24%; transform: translateX(-50%); font-size: 34px; letter-spacing: 2px; color: #f0c21a; text-shadow: 0 2px 10px rgba(0,0,0,0.75); opacity: 0; transition: opacity .2s; white-space: nowrap; }
#heli-hud .hh-msg.on { opacity: 1; }
#heli-hud .hh-say { position: absolute; left: 50%; bottom: 27%; transform: translateX(-50%); width: max-content; max-width: min(640px, 90vw); padding: 6px 14px; background: rgba(12,12,12,0.66); border-radius: 6px; font: 18px/1.3 'Arial Narrow', Arial, sans-serif; text-align: center; opacity: 0; transition: opacity .2s; }
#heli-hud .hh-say.on { opacity: 1; }
#heli-hud .hh-help { position: absolute; left: 50%; bottom: 7%; transform: translateX(-50%); max-width: 92vw; font: 15px 'Arial Narrow', Arial, sans-serif; letter-spacing: .5px; padding: 6px 14px; background: rgba(20,16,6,0.6); border-radius: 6px; transition: opacity .6s; text-align: center; }
#heli-hud .hh-help kbd { display: inline-block; min-width: 12px; margin: 0 2px; padding: 1px 6px; border: 1px solid rgba(240,237,228,0.6); border-bottom-width: 3px; border-radius: 5px; background: rgba(255,255,255,0.08); color: #f3efe4; font: bold 12px/1.2 system-ui, sans-serif; text-align: center; }
#heli-hud .hh-fade { position: absolute; inset: 0; background: #000; opacity: 0; transition: opacity .6s; }
#heli-hud .hh-fade.on { opacity: 1; }
#heli-hud .hh-fade span { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: 30px; letter-spacing: 3px; color: #f0c21a; white-space: nowrap; }
#heli-hud .hh-card { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(.96); min-width: min(340px, 90vw); padding: 18px 26px; text-align: center; background: rgba(20,16,6,0.86); border-top: 4px solid #f0c21a; border-radius: 8px; opacity: 0; transition: opacity .35s, transform .35s; }
#heli-hud .hh-card.on { opacity: 1; transform: translate(-50%, -50%) scale(1); }
#heli-hud .hh-card h2 { margin: 0; font-size: 42px; font-weight: normal; letter-spacing: 3px; color: #f0c21a; }
#heli-hud .hh-card p { margin: 4px 0 0; font: 16px 'Arial Narrow', Arial, sans-serif; color: rgba(240,237,228,0.85); }
#heli-hud .hh-card .medal { font-size: 30px; letter-spacing: 2px; margin-top: 8px; }
`;

function initHudDom() {
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const root = document.createElement('div');
  root.id = 'heli-hud';
  root.hidden = true;
  root.innerHTML = `<div class="hh-panel"><div class="hh-title"></div>
    <div class="hh-row" data-r="time"><span>Tijd</span><b data-k="time">0</b></div>
    <div class="hh-row"><span>Snelheid</span><b data-k="speed">0</b></div>
    <div class="hh-row" data-r="rings"><span>Ringen</span><b data-k="rings">0</b></div>
    <div class="hh-row"><span>Ballon</span><b data-k="dist">-</b></div>
    <div class="hh-row hh-score"><span>Score</span><b data-k="score">0</b></div></div>
    <div class="hh-guide" hidden><svg class="hh-arrow" viewBox="-24 -24 48 48" aria-hidden="true"><path d="M0 -20 L14 10 L0 3 L-14 10 Z"/></svg><div class="hh-goal"></div></div>
    <div class="hh-alt"><i class="ring"></i><i class="bal"></i><i class="me"></i><span>0 m</span></div>
    <div class="hh-catch" hidden><div class="lbl"></div><div class="bar"><i></i></div><div class="tips"></div></div>
    <div class="hh-msg"></div>
    <div class="hh-say" role="status"></div>
    <div class="hh-help"></div>
    <div class="hh-fade"><span></span></div>
    <div class="hh-card"><h2></h2><p class="sub"></p><div class="medal"></div><p class="rows"></p></div>`;
  document.body.appendChild(root);
  const q = (s) => root.querySelector(s);
  hud = {
    root, title: q('.hh-title'), vals: {}, cache: {}, rows: { time: q('[data-r="time"]'), rings: q('[data-r="rings"]') },
    guide: q('.hh-guide'), arrow: q('.hh-arrow'), goal: q('.hh-goal'),
    altMe: q('.hh-alt .me'), altBal: q('.hh-alt .bal'), altRing: q('.hh-alt .ring'), altLbl: q('.hh-alt span'),
    catchEl: q('.hh-catch'), catchLbl: q('.hh-catch .lbl'), catchBar: q('.hh-catch .bar i'), catchTips: q('.hh-catch .tips'),
    msg: q('.hh-msg'), say: q('.hh-say'), help: q('.hh-help'), fade: q('.hh-fade'), fadeText: q('.hh-fade span'), card: q('.hh-card'),
  };
  for (const el of root.querySelectorAll('[data-k]')) hud.vals[el.dataset.k] = el;
}

function setVal(k, text, cls) {
  if (hud.cache[k] === text) return;
  hud.cache[k] = text;
  hud.vals[k].textContent = text;
  if (cls !== undefined) hud.vals[k].className = cls;
}

function flash(text, s = 1.6) {
  if (!run) return;
  hud.msg.textContent = text;
  hud.msg.classList.add('on');
  run.msgT = s;
}

const fmtDist = (d) => (d > 950 ? `${(d / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(d / 10) * 10} m`);
const Z_LO = 0, Z_HI = 130;
const altY = (z) => (1 - clamp((z - Z_LO) / (Z_HI - Z_LO), 0, 1)) * 100 + '%';

function updateHud(dt) {
  const r = run, v = r.v, b = r.b;
  if (r.msgT > 0 && (r.msgT -= dt) <= 0) hud.msg.classList.remove('on');
  if (r.V.timeLimit) {
    const t = Math.max(0, r.timeLeft);
    setVal('time', `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`, t < 20 ? 'low' : '');
  }
  setVal('speed', `${Math.round(Math.hypot(v.vx || 0, v.vy || 0) * 3.6)} km/u`);
  setVal('rings', ringCounter(r.st, r.ringsTotal).text);
  setVal('dist', b.phase === 'ground' ? 'nog aan de grond' : fmtDist(Math.hypot(b.x - v.x, b.y - v.y)));
  setVal('score', String(Math.max(0, Math.round(r.score))));
  hud.altMe.style.top = altY(v.z);
  hud.altBal.style.top = altY(b.z);
  const tgt = r.tgt;
  hud.altRing.style.display = tgt && r.phase === 'fly' ? '' : 'none';
  if (tgt) hud.altRing.style.top = altY(tgt.z);
  const lbl = `${Math.round(Math.max(0, v.z - (v.groundZ ?? 0)))} m`;
  if (hud.cache.alt !== lbl) { hud.cache.alt = lbl; hud.altLbl.textContent = lbl; }
  if (r.t > 16) hud.help.style.opacity = '0';
  // the arrow: the target's bearing relative to the nose, its distance and height
  const guide = r.phase === 'fly' && !!tgt;
  hud.guide.hidden = !guide;
  if (guide) {
    const rel = Math.atan2(tgt.y - v.y, tgt.x - v.x) - v.angle;
    hud.arrow.style.transform = `rotate(${(rel * 180 / Math.PI + 90).toFixed(1)}deg)`;
    const d = Math.hypot(tgt.x - v.x, tgt.y - v.y);
    const dz = tgt.z - v.z;
    const lg = tgt.kind === 'pad' ? landingGuide(v, { x: tgt.x, y: tgt.y, r: tgt.r, deck: tgt.z }) : null;
    const hint = lg ? (d < 60 && !v.onGround ? `<span class="${lg.ok ? 'down' : 'up'}">${lg.text} · ${Math.round(lg.alt)} m · ${(Math.round(lg.vs * 10) / 10).toString().replace('.', ',')} m/s</span>` : '') :
      dz > 4 ? '<span class="up">▲ hoger</span>' : dz < -4 ? '<span class="down">▼ lager</span>' : 'hoogte goed';
    const html = `${r.legLabel}<small>${tgt.label ? tgt.label + ' · ' : ''}${fmtDist(d)}${hint ? ' · ' + hint : ''}</small>`;
    if (hud.cache.goal !== html) { hud.cache.goal = html; hud.goal.innerHTML = html; }
  }
}

// --- lines over the headsets (storyarc.js H15, contacts `on: 'flight:*'`) -------

// the new story's M12 says its flight lines from the script (scenes M12.2 and M12.3, text only)
const ROOSTER_LINES = { pickup: { ids: ['M12.2'] }, hang: { ids: ['M12.3'], to: 8 }, caught: { ids: ['M12.3'], from: 8 } };

const withLier = (variant) => variant === 'traumaduif' || variant === 'rooster';

function flightLines(key) {
  if (run && run.variant === 'rooster') {
    const q = ROOSTER_LINES[key];
    return q ? storyLines(q.ids, { from: q.from || 0, to: q.to ?? Infinity }) : [];
  }
  const st = STEP_BY_ID.get('H15');
  const c = st && (st.contact || []).find((q) => q.on === 'flight:' + key);
  return c ? c.lines : [];
}

function sayLines(key) {
  if (!run || !withLier(run.variant) || run.said.has(key)) return;
  run.said.add(key);
  for (const l of flightLines(key)) run.say.queue.push(l);
}

function updateSay(dt) {
  const s = run.say;
  if (world.paused) return;
  if (s.cur) {
    s.t += dt;
    if (s.t < s.until) return;
    s.cur = null;
    hud.say.classList.remove('on');
  }
  if (!s.queue.length) return;
  const [k, text] = s.queue.shift();
  const name = SPEAKERS[k] || k;
  const v = lineVoiceFor(name, text);
  if (v) playLineVoice(v.src, v.dur, 'call');
  s.cur = text;
  s.t = 0;
  s.until = v ? v.dur + 0.35 : Math.max(2.2, 1 + text.length * 0.055);
  hud.say.innerHTML = speakerHtml(name) + dualHtml(text);
  hud.say.classList.add('on');
}

// --- start / stop -----------------------------------------------------------

function blockReason(w) {
  if (w.wanted > 0) return 'Niet nu: eerst de politie kwijt';
  if (playerBusy(w, ['mission', 'activeRace']).busy) return 'Niet nu: maak eerst je missie af';
  if (playerBusy(w, ['sideJob']).busy) return 'Niet nu: je bent aan het werk';
  return null;
}

// The demo heli Rotor Roelf parked on the pad (storyfun.js), or a new one.
// Where the run's heli may stand: the pad itself, or on open ground beside it when
// another heli (the player's own) is in the way; null on a deck that is taken (#166).
function clearSpotFor(w, pad) {
  const demo = w.vehicles.find((q) => q.isHeli && q.storyDemo && !q.wrecked && !q.sinking && Math.hypot(q.x - pad.x, q.y - pad.y) < 20);
  const blockers = w.vehicles.filter((q) => q !== demo && q.isHeli && !q.wrecked && !q.sinking).map((q) => ({ x: q.x, y: q.y, z: q.z }));
  return findClearSpot(pad, blockers, { deck: pad.id === 'umcg' });
}

function heliOn(w, pad, spot = null) {
  let v = w.vehicles.find((q) => q.isHeli && q.storyDemo && !q.wrecked && !q.sinking && Math.hypot(q.x - pad.x, q.y - pad.y) < 20);
  if (!v) {
    v = makeHeli(spot ? spot.x : pad.x, spot ? spot.y : pad.y, pad.deck, pad.angle, { ...HELI_MODEL, color: '#e8e6e0' });
    v.missionCar = true;
    w.vehicles.push(v);
  }
  v.x = spot ? spot.x : pad.x; v.y = spot ? spot.y : pad.y; v.z = pad.deck; v.angle = pad.angle;
  v.vx = 0; v.vy = 0; v.vz = 0; v.speed = 0; v.driftX = 0; v.driftY = 0; v.yawRate = 0;
  v.onGround = true; v.groundZ = pad.deck; v.landKind = spot && spot.moved ? 'ground' : 'pad'; v.landPad = spot && spot.moved ? null : helipadById(pad.id);
  v.health = 100;
  v.disabled = false;
  v.heliRun = true;
  return v;
}

export function startHeliRun(opts = {}) {
  const w = world;
  if (!w || run || w.pigeonMode || isCinematicActive() || document.body.classList.contains('intro-montage')) return false;
  const pl = w.player;
  if (pl.inVehicle && !pl.inVehicle.storyDemo) return false;
  const pads = runPads(w);
  if (!pads.umcg) return false;
  const variant = VARIANTS[opts.variant] ? opts.variant : 'ballonjacht';
  const V = { ...VARIANTS[variant] };
  const plan = P.makePlan(variant, pads);
  const st = P.newRunState();
  let startPad = pads.umcg;
  if (variant === 'rooster') startPad = pads.lauwersoog;
  if (variant === 'traumaduif') {
    if (pads.eelde) startPad = pads.eelde;
    // no Eelde pad: start on the UMCG deck with Dijkstra already aboard
    else st.leg = plan.legs.findIndex((l) => l.kind === 'rings');
  }
  // no heli through the player's own heli: a free spot, or wait until it is moved (#166)
  const spot = clearSpotFor(w, startPad);
  if (!spot) { w.addMessage('Het helidek is bezet: zet je eigen heli eerst ergens anders neer', 4, { kind: 'tip', key: 'helirun-bezet' }); return false; }
  if (pl.inVehicle) pl.inVehicle.driver = null;
  const v = heliOn(w, startPad, spot);
  // the yellow trauma heli is in for a service meanwhile (it would sit on the deck)
  const sky = scriptHeli(w);
  if (sky) Object.assign(sky, { x: startPad.x, y: startPad.y, z: -400, rotor: 0 });

  const bAt = variant === 'rooster' ? P.ROOSTER.dollard : P.BALLOON_AT;
  const gz = w.map.groundHeightAt ? w.map.groundHeightAt(bAt.x, bAt.y, 0) : 0;
  const b = {
    x: bAt.x, y: bAt.y, z: gz, ground: gz, phase: 'ground', vz: 0, spin: 0.01, yaw: 0.4, seed: BALLOON_SEED,
    timer: 0, burn: 0, burnLeft: 0, nextBurn: 2, burnSeq: 0, burnDur: 0, age: 0, scripted: true,
  };
  if (!w.balloons) w.balloons = [];
  w.balloons.push(b);

  const ringLeg = plan.legs.find((l) => l.kind === 'rings');
  run = {
    V, variant, plan, st, pads, v, b, onFinish: opts.onFinish || null,
    phase: 'intro', t: 0, phaseT: 0, timeLeft: V.timeLimit || 0, elapsed: 0, score: 0, hits: 0, msgT: 0,
    ringsTotal: ringLeg ? ringLeg.rings.length : 0, tgt: null, legLabel: '', said: new Set(), faded: false,
    say: { queue: [], cur: null, t: 0, until: 0 }, startPad, cam: null,
    prevCine: { hide: w.cinematicHidePlayers, nav: w.cinematicHideNav },
    start: { x: pl.x, y: pl.y, angle: pl.angle }, result: null,
  };
  run.rings = ringLeg ? buildRings(ringLeg) : null;
  run.beacon = buildBeacon();
  run.hanger = buildHanger();
  pl.inVehicle = v;
  v.driver = 'player';
  pl.x = v.x; pl.y = v.y; pl.angle = v.angle;
  // the other one rides along (and hangs from the lier later)
  const c = w.companion;
  if (c && c.state !== 'dead' && !c.inVehicle) { c.inVehicle = v; v.passenger = 'companion'; }
  w.camYaw = v.angle;
  w.heliRun = true;
  w.cinematicHidePlayers = true;
  document.body.classList.add('heli-run');
  hud.root.hidden = false;
  hud.help.innerHTML = helpHtml();
  hud.cache = {};
  hud.title.textContent = V.title.toUpperCase();
  hud.rows.time.hidden = !V.timeLimit;
  hud.rows.rings.hidden = !run.ringsTotal;
  hud.card.classList.remove('on');
  hud.catchEl.hidden = true;
  hud.guide.hidden = true;
  hud.help.style.opacity = '1';
  hud.fade.classList.remove('on');
  flash(V.sub, 3.5);
  w.input.reset();
  return true;
}

function finish(success, why = '') {
  const r = run;
  if (!r || r.phase === 'result') return;
  const timeBonus = success && r.V.timeLimit ? Math.round(Math.max(0, r.timeLeft) * TIME_SCORE) : 0;
  if (success) r.score += timeBonus;
  const score = Math.max(0, Math.round(r.score));
  let medal = 0;
  if (success) for (let m = 3; m >= 1; m--) if (score >= MEDALS[m]) { medal = m; break; }
  if (success && !medal) medal = 1;
  r.result = {
    variant: r.variant, success, aborted: false, score, medal, medalName: MEDAL_NAMES[medal], rings: r.st.ringsHit,
    ringsTotal: r.ringsTotal, time: Math.round(r.elapsed * 10) / 10, timeLeft: Math.max(0, Math.round(r.timeLeft)), hits: r.hits,
  };
  r.phase = 'result';
  r.phaseT = 0;
  hud.catchEl.hidden = true;
  hud.guide.hidden = true;
  hud.msg.classList.remove('on');
  hud.card.querySelector('h2').textContent = success ? r.V.doneText.split('!')[0] + '!' : 'Mislukt';
  hud.card.querySelector('.sub').textContent = success ? r.V.doneText : why || r.V.failText;
  hud.card.querySelector('.medal').textContent = medal ? `${MEDAL_NAMES[medal]} · ${score} punten` : `${score} punten`;
  hud.card.querySelector('.rows').textContent = `Ringen ${r.st.ringsHit}/${r.ringsTotal}${timeBonus ? ` · tijdbonus ${timeBonus}` : ''} · botsingen ${r.hits}`;
  hud.card.classList.add('on');
  sfx(success ? 'prestatie' : 'notify', 0.8);
  if (success) {
    recordStat(world, 'heliRuns');
    setStatMax(world, 'heliBest', score);
    unlockAchievement(world, 'ballonjacht');
    unlockAchievement(world, 'umcg_heli');
    if (r.variant === 'ballonjacht') recordChallengeResult(world, 'ballonjacht', { value: score, medal });
    if (medal === 3) unlockAchievement(world, 'ballonjacht_goud');
  }
}

function cleanup(aborted) {
  const r = run;
  const w = world;
  run = null;
  for (const o of [r.rings, r.beacon, r.hanger]) if (o) scene.remove(o);
  const bi = w.balloons.indexOf(r.b);
  if (bi >= 0) {
    if (r.result && r.result.success) { r.b.scripted = false; r.b.phase = 'float'; r.b.targetZ = r.b.z; r.b.drift = P.BALLOON_SPEED; }
    else w.balloons.splice(bi, 1);
  }
  landHeliOnPad(w, 30);
  // Rotor Roelf takes his demo heli back
  const v = r.v;
  v.driver = null;
  v.passenger = null;
  v.heliRun = false;
  const vi = w.vehicles.indexOf(v);
  if (vi >= 0) w.vehicles.splice(vi, 1);
  w.heliRun = false;
  w.heliRunTarget = null;
  w.cinematicHidePlayers = r.prevCine.hide || false;
  w.cinematicHideNav = r.prevCine.nav || false;
  w.cameraOverride = null;
  document.body.classList.remove('heli-run');
  hud.root.hidden = true;
  hud.card.classList.remove('on');
  hud.say.classList.remove('on');
  hud.fade.classList.remove('on');
  const pl = w.player;
  pl.inVehicle = null;
  // back on the street by the UMCG (a run given up at Eelde stays at Eelde)
  const atEelde = r.startPad.id === 'eelde' && Math.hypot(v.x - r.startPad.x, v.y - r.startPad.y) < 400;
  // the new M12 ends on the quay of the Eemshaven, where Dijkstra sets them down
  const back = r.variant === 'rooster' && r.result && r.result.success ? { x: P.ROOSTER.eemshaven.x, y: P.ROOSTER.eemshaven.y }
    : r.variant === 'rooster' ? { x: r.startPad.x - 7, y: r.startPad.y + 5 }
    : atEelde ? { x: r.startPad.x - 7, y: r.startPad.y + 5 } : spot || r.start;
  pl.x = back.x; pl.y = back.y;
  pl.angle = r.start.angle;
  pl.vx = 0; pl.vy = 0; pl.z = 0; pl.vz = 0;
  pl.water = null; pl.swimming = false; pl.climb = null;
  w.camYaw = pl.angle;
  const c = w.companion;
  if (c && c.state !== 'dead') {
    if (c.inVehicle === v) c.inVehicle = null;
    if (!c.inVehicle) { c.x = pl.x + 1.2; c.y = pl.y + 0.6; }
  }
  w.input.reset();
  const result = r.result || {
    variant: r.variant, success: false, aborted: true, score: 0, medal: 0, medalName: '', rings: r.st.ringsHit,
    ringsTotal: r.ringsTotal, time: r.elapsed, timeLeft: Math.round(r.timeLeft), hits: r.hits,
  };
  if (aborted) result.aborted = true;
  if (r.onFinish) { try { r.onFinish(result); } catch (e) { console.error('heli run onFinish', e); } }
}

export function abortHeliRun() {
  if (!run) return false;
  cleanup(true);
  return true;
}

export function isHeliRunActive() {
  return !!run;
}

function getHeliRun() {
  if (!run) return null;
  const leg = run.plan.legs[run.st.leg];
  return {
    phase: run.phase, leg: leg ? leg.kind : null, legIndex: run.st.leg, ring: run.st.ring, rings: run.st.ringsHit, catchP: run.st.catchP,
    x: run.v.x, y: run.v.y, z: run.v.z, speed: Math.hypot(run.v.vx || 0, run.v.vy || 0), onGround: !!run.v.onGround, variant: run.variant,
    balloon: { x: run.b.x, y: run.b.y, z: run.b.z, phase: run.b.phase }, target: run.tgt,
  };
}

// For the minimap and the big map: rings where they are, the H and the balloon.
export function getHeliRunMarks() {
  if (!run) return null;
  const leg = run.plan.legs.find((l) => l.kind === 'rings');
  const cur = run.plan.legs[run.st.leg];
  const rings = leg ? leg.rings.map((q) => ({ x: q.x, y: q.y, state: q.state })) : [];
  const pad = cur && (cur.kind === 'pad' || cur.kind === 'pickup') ? run.pads[cur.pad || 'umcg'] : null;
  return { rings, pad: pad ? { x: pad.x, y: pad.y } : null, balloon: run.b.phase === 'ground' && cur && cur.kind !== 'rings' ? null : { x: run.b.x, y: run.b.y }, target: run.tgt };
}

// --- flight -----------------------------------------------------------------

const HELD = ['w', 's', 'a', 'd', ' ', 'control', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];

// One frame of real flight with the given keys (null: the player's own).
function flyWith(dt, keys) {
  const w = world, v = run.v;
  if (!keys) {
    flyHeli(v, dt, w);
    return new Set(HELD.filter((k) => w.input.isDown(k)));
  }
  const real = w.input;
  w.input = { isDown: (k) => keys.has(k), lookActive: () => false, mouse: { dx: 0, dy: 0 } };
  try { flyHeli(v, dt, w); } finally { w.input = real; }
  return keys;
}

// the autopilot flight of a cruise leg (the first of the old story, the long stretches of the new M12)
function beginCruise(leg) {
  const r = run;
  r.phase = 'cruise';
  r.phaseT = 0;
  r.faded = false;
  r.legLabel = (leg && leg.label) || 'Op weg naar Stad';
  sayLines('call');
  const c = leg && leg.cut;
  prewarmStreamAt(c ? c.x : r.pads.umcg.x, c ? c.y : r.pads.umcg.y + P.ENTRY.back * 0.5);
  if (!c) prewarmStreamAt(r.pads.umcg.x, r.pads.umcg.y);
}

function legStarted(leg) {
  const r = run;
  r.legLabel = leg ? leg.label || '' : '';
  if (!leg) return;
  if (leg.kind === 'rings') {
    if (r.b.phase === 'ground') P.launchBalloon(r.b);
    sayLines('spot');
    flash(withLier(r.variant) ? 'De ballon stijgt op!' : 'Door de ringen!', 2);
  } else if (leg.kind === 'catch') {
    if (r.b.phase === 'ground') P.launchBalloon(r.b);
    hud.catchEl.hidden = false;
    hud.catchLbl.textContent = r.V.catchText;
    sayLines('hang');
    flash('Naar de mand!', 1.6);
  } else if (leg.kind === 'pad') {
    hud.catchEl.hidden = true;
    flash(leg.why === 'spoed' ? 'Spoedje: naar het UMCG' : 'Terug naar het UMCG', 2);
  } else if (leg.kind === 'cruise') {
    beginCruise(leg);
  } else if (leg.kind === 'pickup') {
    r.phase = 'pickup';
    r.phaseT = 0;
    sayLines('pickup');
  }
}

function onEvents(events) {
  const r = run;
  const ringLeg = r.plan.legs.find((l) => l.kind === 'rings');
  for (const [e, d] of events) {
    if (e === 'ring') {
      r.score += RING_SCORE;
      r.timeLeft += r.V.ringBonus;
      ringLeg.rings[d].state = 'done';
      flash(r.V.ringBonus ? `Ring! +${RING_SCORE}  +${r.V.ringBonus} s` : `Ring! +${RING_SCORE}`, 1.1);
      sfx('notify', 0.7);
    } else if (e === 'miss') {
      ringLeg.rings[d].state = 'miss';
      flash('Ring gemist', 1);
    } else if (e === 'bump') {
      r.hits++;
      r.score -= HIT_PENALTY;
      sfx('bonk', 1);
      flash('Pas op de ballon! Niet erop, ernaast', 1.8);
    } else if (e === 'caught') {
      r.score += CATCH_SCORE;
      sfx('prestatie', 0.7);
      flash(r.variant === 'rooster' ? 'Tammo heeft de aktetas!' : r.variant === 'traumaduif' ? 'Tammo heeft de Eierbal!' : 'Gekoppeld!', 2.2);
      sayLines('caught');
      // the new M12 ends at the basket: the flight on to the Eemshaven is the scene after it
      if (r.variant === 'rooster') { r.finishAt = r.t + 7; }
    } else if (e === 'landed' && d === 'home') {
      finish(true);
      return;
    } else if (e === 'landed') {
      flash('Geland op de H', 1.4);
    }
    if (e === 'leg' && run && run.phase !== 'result') legStarted(r.plan.legs[r.st.leg]);
  }
}

function updateRingMeshes() {
  const leg = run.plan.legs.find((l) => l.kind === 'rings');
  if (!leg) return;
  const active = run.plan.legs[run.st.leg] === leg;
  leg.rings.forEach((q, i) => {
    let state = q.state;
    if (state !== 'done' && state !== 'miss') state = active && i === run.st.ring ? 'next' : 'later';
    q.state = state;
    if (q.mesh.material !== RING_MATS[state]) q.mesh.material = RING_MATS[state];
    q.mesh.visible = state === 'next' || state === 'later' || (active && i >= run.st.ring - 1);
    // far rings grow so they stay readable from a distance (#166)
    const s = P.ringScale(Math.hypot(q.x - run.v.x, q.y - run.v.y, q.z - run.v.z));
    q.mesh.scale.setScalar(state === 'next' ? s : Math.min(s, 2));
  });
}

function updateProps(dt) {
  const r = run, v = r.v;
  const cur = r.plan.legs[r.st.leg];
  const padLeg = cur && (cur.kind === 'pad' || cur.kind === 'pickup');
  r.beacon.visible = !!padLeg && r.phase !== 'result';
  if (padLeg) {
    const p = r.pads[cur.pad || 'umcg'];
    r.beacon.position.set(p.x, p.deck, p.y);
    const k = 1 + Math.sin(r.t * 4) * 0.08;
    const rr = (p.r || 6) / 5.1;
    r.beacon.userData.ring.scale.set(k * rr, 1, k * rr);
    // the landing circle shows how the landing goes: green good, yellow line up, red too fast (#166)
    const gs = landingGuide(v, { x: p.x, y: p.y, r: p.r, deck: p.deck }).state;
    r.beacon.userData.ring.material.color.setHex(guideColor(gs));
  }
  // Tammo on the lier from the catch until the heli is low over the H
  const hang = withLier(r.variant) && cur && (cur.kind === 'catch' || (cur.kind === 'pad' && cur.why === 'home' && !v.onGround && v.z - (v.groundZ ?? 0) > 12));
  r.hanger.visible = !!hang;
  if (hang) {
    const { rope, man } = r.hanger.userData;
    if (cur.kind === 'catch') {
      // Tammo stands in the basket (its floor, heading and swing), not at the heli's height
      const b = r.b;
      const pose = basketRiderPose(b, 0, Math.atan2(v.y - b.y, v.x - b.x));
      rope.visible = false;
      r.hanger.position.set(pose.x, pose.z, pose.y);
      r.hanger.rotation.z = pose.sway;
      man.position.y = 0;
      man.rotation.y = -pose.heading + Math.PI / 2;
    } else {
      // with the Eierbal on the lier under the heli
      const L = 4;
      rope.visible = true;
      r.hanger.rotation.z = 0;
      r.hanger.position.set(v.x, v.z, v.y);
      rope.scale.y = L;
      rope.position.y = -L / 2;
      man.position.y = -L - 1.7;
      man.rotation.y = -v.angle + Math.PI / 2;
    }
    animatePersonWalk(man, 0, dt);
  }
}

// After the cruise: the cut to the city, south of the UMCG, nose north.
function cutToCity(leg) {
  const r = run, v = r.v, u = r.pads.umcg;
  const c = leg && leg.cut;
  v.x = c ? c.x : u.x; v.y = c ? c.y : u.y + P.ENTRY.back; v.z = c ? c.z : P.ENTRY.z;
  v.angle = c ? c.angle : -Math.PI / 2;
  v.vx = c ? Math.cos(v.angle) * 22 : 0; v.vy = c ? Math.sin(v.angle) * 22 : -22; v.vz = 0; v.speed = 22; v.driftX = 0; v.driftY = 0; v.yawRate = 0;
  v.onGround = false;
  v.rotor = 1;
  r.cam = null;
  world.camYaw = v.angle;
}

const PILOT_CRUISE = new Set();

export function updateHeliRun(dt, w) {
  if (!run) return;
  const r = run, v = r.v;
  r.t += dt;
  r.phaseT += dt;
  P.stepBalloon(r.b, dt);
  animateBurner(dt);
  if (w.input.wasPressed('backspace') && r.phase !== 'result') {
    w.input.consume('backspace');
    w.addMessage('Vlucht afgebroken: Rotor Roelf haalt zijn heli op', 3);
    cleanup(true);
    return;
  }
  const leg = r.plan.legs[r.st.leg];
  if (r.phase === 'intro') {
    // the rotor spools up on the pad
    v.rotor = Math.min(1, 0.35 + r.phaseT * 0.4);
    if (r.phaseT >= INTRO_S) {
      if (leg && leg.kind === 'cruise') {
        beginCruise(leg);
      } else { r.phase = 'fly'; r.phaseT = 0; legStarted(leg); }
    }
  } else if (r.phase === 'cruise') {
    // autopilot: up, then north at full speed while Dijkstra calls; a cut to the city
    PILOT_CRUISE.clear();
    if (v.z - (v.groundZ ?? 0) < 45) PILOT_CRUISE.add(' ');
    if (r.phaseT > 2) { PILOT_CRUISE.add('w'); PILOT_CRUISE.add('shift'); }
    const head = leg && leg.heading != null ? leg.heading : -Math.PI / 2;
    const err = Math.atan2(Math.sin(head - v.angle), Math.cos(head - v.angle));
    if (Math.abs(err) > 0.1) PILOT_CRUISE.add(err > 0 ? 'd' : 'a');
    flyWith(dt, PILOT_CRUISE);
    if (r.phaseT > P.CRUISE_S - FADE_S && !r.faded) { r.faded = true; hud.fadeText.textContent = (leg && leg.fadeText) || 'Even later, boven Stad'; hud.fade.classList.add('on'); }
    if (r.phaseT >= P.CRUISE_S + 0.5) {
      cutToCity(leg);
      hud.fade.classList.remove('on');
      P.nextLeg(r.st);
      r.phase = 'fly';
      r.phaseT = 0;
      legStarted(r.plan.legs[r.st.leg]);
    }
  } else if (r.phase === 'pickup') {
    // on the UMCG deck: Dijkstra climbs in with the lier
    v.rotor = 1;
    if (r.phaseT >= PICKUP_S && !r.say.cur && !r.say.queue.length) {
      P.nextLeg(r.st);
      r.phase = 'fly';
      r.phaseT = 0;
      legStarted(r.plan.legs[r.st.leg]);
    }
  } else if (r.phase === 'fly') {
    r.elapsed += dt;
    if (r.V.timeLimit) r.timeLeft -= dt;
    const mode = P.legMode(leg);
    r.tgt = P.legTarget(r.plan, r.st, r.b, r.pads, v);
    const held = flyWith(dt, autopilot ? P.pilotKeys(v, r.tgt, mode) : null);
    if (!v.wrecked) P.assist(v, held, r.tgt, dt, mode, r.b);
    const hp = v.health;
    onEvents(P.advance(r.plan, r.st, v, r.b, dt));
    if (!run) return;
    if (run.phase === 'fly') {
      if (r.lastHp !== undefined && hp < r.lastHp - 2) { r.hits++; r.score -= HIT_PENALTY; }
      r.lastHp = v.health;
      updateCatchHud();
      const far = r.b.phase !== 'ground' && Math.hypot(r.b.x - v.x, r.b.y - v.y) > BALLOON_GONE_M && !!leg && (leg.kind === 'rings' || leg.kind === 'catch');
      if (v.wrecked || v.health <= 0) finish(false, 'De Wieken Wubbo is neergestort. Rotor Roelf is niet blij.');
      else if (far) finish(false, r.V.failText);
      else if (r.finishAt && r.t >= r.finishAt && !r.say.cur && !r.say.queue.length) finish(true);
      else if (r.V.timeLimit && r.timeLeft <= 0) finish(false);
    }
  } else if (r.phase === 'result') {
    if (!v.onGround && !v.wrecked) flyWith(dt, new Set());
    if (r.phaseT >= RESULT_S) { cleanup(false); return; }
  }
  if (!run) return;
  w.heliRunTarget = r.phase === 'fly' && r.tgt ? { x: r.tgt.x, y: r.tgt.y, name: r.tgt.label || r.legLabel } : null;
  updateRingMeshes();
  updateProps(dt);
  updateCamera(dt);
  syncPlayer();
  updateSay(dt);
  updateHud(dt);
}

function animateBurner(dt) {
  const b = run.b;
  if (b.phase === 'ground' && run.st.leg < 1) return;
  if (b.burnLeft > 0) b.burnLeft -= dt;
  else if ((b.nextBurn -= dt) <= 0) { b.burnLeft = b.phase === 'rise' ? 2.5 : 1.6; b.nextBurn = 3 + Math.random() * 5; b.burnSeq++; }
  b.burn += ((b.burnLeft > 0 ? 1 : 0) - b.burn) * Math.min(1, dt * 10);
  b.yaw += 0.01 * dt;
}

function updateCatchHud() {
  const r = run;
  const c = r.st.check;
  if (!c || hud.catchEl.hidden) return;
  hud.catchBar.style.width = `${(r.st.catchP / P.CATCH.need) * 100}%`;
  const tip = (ok, good, bad) => `<span class="${ok ? 'ok' : ''}">${ok ? good : bad}</span>`;
  const tips = [
    tip(c.okZ, 'hoogte goed', c.dz > 0 ? `lager (${downKey()})` : 'hoger (Spatie)'),
    tip(c.okLat, 'afstand goed', c.lat <= P.CATCH.near ? 'verder weg' : 'dichterbij'),
    tip(c.okV, 'snelheid goed', 'rustiger: laat W los'),
  ].join(' · ');
  if (hud.cache.tips !== tips) { hud.cache.tips = tips; hud.catchTips.innerHTML = tips; }
}

function syncPlayer() {
  const pl = world.player, v = run.v;
  pl.x = v.x; pl.y = v.y; pl.angle = v.angle;
  pl.vx = 0; pl.vy = 0;
}

// --- camera -----------------------------------------------------------------

// Flying: the normal heli follow cam (scene3d.js), so the minimap turns with
// the heli. The intro, the cruise, the pickup and the result card get a shot.
function updateCamera(dt) {
  const r = run, v = r.v, b = r.b;
  let pos = null, look = null, fov = 55;
  if (r.phase === 'intro' || r.phase === 'pickup') {
    const a = (r.startPad.angle || 0) + 2.2 + r.phaseT * 0.12;
    pos = { x: v.x + Math.cos(a) * 26, y: v.y + Math.sin(a) * 26, z: v.z + 8 + r.phaseT * 0.6 };
    look = { x: v.x, y: v.y, z: v.z + 1.5 };
  } else if (r.phase === 'cruise') {
    const ch = Math.cos(v.angle), sh = Math.sin(v.angle);
    pos = { x: v.x - ch * 30 + sh * 12, y: v.y - sh * 30 - ch * 12, z: v.z + 9 };
    look = { x: v.x + ch * 30, y: v.y + sh * 30, z: v.z };
    fov = 60;
  } else if (r.phase === 'result') {
    const a = r.phaseT * 0.18 + v.angle + 2.4;
    const near = Math.hypot(b.x - v.x, b.y - v.y) < 200;
    const mx = near ? (v.x + b.x) / 2 : v.x, my = near ? (v.y + b.y) / 2 : v.y, mz = (near ? (v.z + b.z) / 2 : v.z) + 4;
    pos = { x: mx + Math.cos(a) * 45, y: my + Math.sin(a) * 45, z: mz + 12 };
    look = { x: mx, y: my, z: mz };
  } else if (r.phase === 'fly' && !v.wrecked) {
    // behind the heli, a little ahead along where it really goes (helicam.js, #166)
    const T = chaseTarget(v);
    r.cam = followCam(r.cam, T, dt);
    world.cameraOverride = { position: { ...r.cam }, lookAt: T.look, fov: T.fov, cut: true };
    world.camYaw = T.dir;
    return;
  }
  if (!pos) { r.cam = null; world.cameraOverride = null; return; }
  if (!r.cam) r.cam = { ...pos };
  else {
    const s = 1 - Math.exp(-(r.phase === 'cruise' ? 6 : 3) * dt);
    r.cam.x += (pos.x - r.cam.x) * s; r.cam.y += (pos.y - r.cam.y) * s; r.cam.z += (pos.z - r.cam.z) * s;
  }
  world.cameraOverride = { position: { ...r.cam }, lookAt: look, fov, cut: true };
  world.camYaw = v.angle;
}

// --- start spot ---------------------------------------------------------------

function nearSpot(w) {
  const p = w.player;
  if (!spot || w.pigeonMode || w.heliRun || p.inVehicle || p.swimming || p.water) return false;
  return Math.hypot(spot.x - p.x, spot.y - p.y) < USE_RADIUS;
}

export function heliSpotPrompt(w) {
  if (!nearSpot(w)) return null;
  const why = blockReason(w);
  return { id: 'heli-umcg', x: spot.x, y: spot.y, h: 2.75, key: 'E', label: 'Ballonjacht', sub: why || 'Dokter Dijkstra laat je meevliegen', ring: true, dim: !!why };
}

export function heliSpotSecondary(w) {
  if (!spot || w.heliRun || w.pigeonMode || w.player.inVehicle) return [];
  const { x, y } = w.player;
  if (Math.abs(spot.x - x) > 20 || Math.abs(spot.y - y) > 20) return [];
  return [{ id: 'heli2-umcg', x: spot.x, y: spot.y, h: 2.2, label: 'Ballonjacht', sub: 'Loop erheen en druk E', kind: 'place' }];
}

// Runs before the shop/horeca/player E handlers.
export function tryHeliSpotInteract(w) {
  const input = w.input;
  if (!input || isShopOpen() || isCinematicActive() || w.heliRun) return false;
  if (!(input.wasPressed('e') || input.wasPressed('f'))) return false;
  if (!nearSpot(w)) return false;
  input.consume('e');
  input.consume('f');
  const why = blockReason(w);
  if (why) { w.addMessage(why, 2.5); return true; }
  waarschuwVoorStart(w, 'minigame', 'heli'); // samen spelen: een melding als dit nog niet samen werkt; de start gaat door
  startHeliRun({ variant: 'ballonjacht' });
  return true;
}

function animatePilot(dt) {
  if (!spot || !spot.pilot) return;
  const p = world.player;
  if (Math.abs(spot.x - p.x) > 60 || Math.abs(spot.y - p.y) > 60) return;
  animatePersonWalk(spot.pilot, 0, dt);
}

export function updateHeliSpot(dt) {
  if (!world) return;
  if (spot) spot.marker.visible = !world.heliRun;
  animatePilot(dt);
}

export function initHeliRun(w) {
  world = w;
  scene = getScene();
  initHudDom();
  spot = placeSpot(w.map);
  // T (phone) stays shut while flying
  window.addEventListener('keydown', (e) => {
    if (w.heliRun && e.key.toLowerCase() === 't') e.stopImmediatePropagation();
  }, true);
  window.__heliRun = {
    start: (variant = 'ballonjacht', onFinish = (res) => console.log('[helirun]', JSON.stringify(res))) => startHeliRun({ variant, onFinish }),
    abort: abortHeliRun,
    set autopilot(v) { autopilot = !!v; },
    get autopilot() { return autopilot; },
    state: getHeliRun,
    marks: getHeliRunMarks,
    spot: () => spot,
  };
}
