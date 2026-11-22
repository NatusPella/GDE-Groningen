import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { toonStartkaart } from './startkaart.js';
import { getSettings } from './settings.js';
import { difficultyRecordKey, cleanDifficulty } from './difficulty.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk } from './models3d_people.js';
import { kitAan, kitUit } from './voetbalkitlive.js';
import { showBanner } from './cinematics.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, MEDALS } from './achievements.js';
import { activityBlock, iconDisc } from './activitykit.js';
import { simHudTik, simHudPop, uitlegGezien, zetUitlegGezien } from './simhud.js';
import { penaltyHudModel, schotPop, UITLEG_ID } from './penaltystatus.js';
import { createBoard, mgThema, key, bubble, clearBubbles, pick, stopPressed, easeCamera, clamp } from './minigamekit.js';
import { PENALTY_LINES } from './minigamelines.js';
import { loopbaanVerdien } from './loopbaanlive.js';
import { pushAudioEvent } from './pedgeom.js';
import { registreerWedstrijd, zetWedGastHaken, wedNodigUit, wedNuStarten, wedHostPunt, wedGastPunt, wedScoreStop, wedGastVerlaat, wedGastReset, wedScoreRijen } from './multiplayerwedstrijd.js';
import { enterActivity, endActivity } from './karakterbonus.js';
import {
  SCHOTEN, DOEL_BREEDTE, DOEL_HOOGTE, PENALTY_AFSTAND, U_MAX, V_MAX, KRACHT_DOEL, LAAD_S, UITKOMSTEN,
  schiet, keeperPlek, nieuweSerie, noteer, doelpunten, genomen, klaar, penaltyMedaille, medailleBij, goalsTekst,
} from './penaltyrules.js';
import { hoofdspeler } from './players.js';
import { characterEnter, karakterEind } from './voetbalkarakter.js'; // de speler schiet als Tessa (dunne laag, #981); zonder haak gebeurt er niets

// Penaltyserie in de Euroborg (#981, Voetbal Sim Light): vijf penalty's op het doel van Grunn-achtig (een verzonnen club, geen echte spelers). De Euroborg is een echt
// gebouw; het veld ligt binnen de tribunes en het stadion is rondom dicht, dus je start bij de spelerspoort aan de zuidkant en wordt het veld op gebracht. A/D richt
// links en rechts, W/S hoog en laag, houd Spatie en laat los bij het streepje voor de kracht. De keeper duikt; de regels en de uitkomsten staan in penaltyrules.js.
// Medaille uit het aantal doelpunten van vijf, record per moeilijkheidsstand. Geen geld in het spel zelf. Samen spelen: iedereen schiet zijn eigen vijf op zijn eigen scherm,
// de host houdt de ranglijst en betaalt per plek (soort 'punt', zoals het skatepark). `window.__penalty` debug.
const ACCENT = mgThema('penalty').accent;
const GOAL = { x: 1804.3, y: 1510.6 };                     // het midden van de doellijn, zuidkant van het veld (de Euroborg-pitch loopt noord-zuid)
const SPOT = { x: GOAL.x, y: GOAL.y - PENALTY_AFSTAND };
const GATE = { x: GOAL.x, y: 1549.5 };                     // de spelerspoort buiten de zuidtribune
const USE_RADIUS = 3.2;
const DETAIL_M = 420;
const HALF_U = DOEL_BREEDTE / 2;                           // m per u-eenheid
const INTRO_S = 1.5, SCHOT_S = 0.62, UITKOMST_S = 2.2, OUTRO_S = 2.6;
const BAL_R = 0.16;                                        // iets groter dan een echte bal, zodat hij van de camera te zien is

let game = null;
let built = null;
let board = null;
let lodT = 0;
let runs = 0;
let ground = 0;

const keeperLook = { shirt: 0xf0c020, skin: 0xd9b48f, variant: 'male', seed: 9811, look: { age: 'adult', build: 'slim', hat: null, top: 'tee', bottom: 'shorts', shoeType: 'sneaker', bag: null, umbrella: null, glasses: false } };

// --- de wereld: het doel, de stip, de lijnen, de bal en de keeper ---------------------------------------------------------------

let mats = null;
function materials() {
  if (mats) return mats;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(255,255,255,0.95)';
  g.lineWidth = 3;
  for (let i = 0; i <= 64; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); }
  const net = new THREE.CanvasTexture(c);
  net.wrapS = net.wrapT = THREE.RepeatWrapping;
  net.repeat.set(10, 4);
  const stripes = document.createElement('canvas');
  stripes.width = 64; stripes.height = 128;
  const sg = stripes.getContext('2d');
  for (let i = 0; i < 8; i++) { sg.fillStyle = i % 2 ? '#5fae52' : '#58a64b'; sg.fillRect(0, i * 16, 64, 16); }
  const gras = new THREE.CanvasTexture(stripes);
  gras.colorSpace = THREE.SRGBColorSpace;
  mats = {
    paal: new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.5, metalness: 0.2 }),
    net: new THREE.MeshBasicMaterial({ map: net, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    lijn: new THREE.MeshBasicMaterial({ color: 0xf4f1e8 }),
    gras: new THREE.MeshStandardMaterial({ map: gras, roughness: 0.95 }),
    bal: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }),
    kruis: new THREE.MeshBasicMaterial({ color: 0xf4c430, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide }),
    bord: new THREE.MeshStandardMaterial({ color: 0x1f3a2a, roughness: 0.8 }),
  };
  return mats;
}

function doos(parent, mat, bx, by, bz, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(bx, by, bz), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function poortBord() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#1f3a2a'; g.fillRect(0, 0, 256, 96);
  g.fillStyle = '#f4f1e8'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center';
  g.fillText('Grunn-achtig', 128, 40);
  g.font = '22px sans-serif'; g.fillText('Penaltyserie', 128, 72);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t });
}

function bouw(w) {
  const M = materials();
  if (w && w.map && typeof w.map.surfaceAt === 'function') { try { const r = w.map.surfaceAt(SPOT.x, SPOT.y, { z: 0, ribbon: null }); if (r && Number.isFinite(r.z)) ground = r.z; } catch (e) { ground = 0; } }
  const root = new THREE.Group();
  root.position.y = ground;
  // een strook gras onder het strafschopgebied en de witte lijnen (het veld zelf komt uit de wereld)
  const gebied = new THREE.Mesh(new THREE.PlaneGeometry(40.32, 16.5).rotateX(-Math.PI / 2), M.gras);
  gebied.position.set(GOAL.x, 0.03, GOAL.y - 8.25);
  gebied.receiveShadow = true;
  root.add(gebied);
  const lijn = (bx, bz, x, z) => doos(root, M.lijn, bx, 0.02, bz, x, 0.05, z);
  lijn(40.32, 0.12, GOAL.x, GOAL.y); lijn(40.32, 0.12, GOAL.x, GOAL.y - 16.5);
  lijn(0.12, 16.5, GOAL.x - 20.16, GOAL.y - 8.25); lijn(0.12, 16.5, GOAL.x + 20.16, GOAL.y - 8.25);
  lijn(18.32, 0.12, GOAL.x, GOAL.y - 5.5); lijn(0.12, 5.5, GOAL.x - 9.16, GOAL.y - 2.75); lijn(0.12, 5.5, GOAL.x + 9.16, GOAL.y - 2.75);
  const stip = new THREE.Mesh(new THREE.CircleGeometry(0.15, 14).rotateX(-Math.PI / 2), M.lijn);
  stip.position.set(SPOT.x, 0.06, SPOT.y);
  root.add(stip);
  // het doel: twee palen, de lat en het net (achter en opzij)
  const pw = HALF_U, ph = DOEL_HOOGTE, diep = 2.1;
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, ph, 8), M.paal);
    p.position.set(GOAL.x + s * pw, ph / 2, GOAL.y); p.castShadow = true; root.add(p);
  }
  const lat = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, DOEL_BREEDTE + 0.12, 8).rotateZ(Math.PI / 2), M.paal);
  lat.position.set(GOAL.x, ph, GOAL.y); lat.castShadow = true; root.add(lat);
  const achter = new THREE.Mesh(new THREE.PlaneGeometry(DOEL_BREEDTE, ph), M.net);
  achter.position.set(GOAL.x, ph / 2, GOAL.y + diep); root.add(achter);
  for (const s of [-1, 1]) {
    const zij = new THREE.Mesh(new THREE.PlaneGeometry(diep, ph).rotateY(Math.PI / 2), M.net);
    zij.position.set(GOAL.x + s * pw, ph / 2, GOAL.y + diep / 2); root.add(zij);
  }
  const dak = new THREE.Mesh(new THREE.PlaneGeometry(DOEL_BREEDTE, diep).rotateX(-Math.PI / 2), M.net);
  dak.position.set(GOAL.x, ph, GOAL.y + diep / 2); root.add(dak);
  // het bord bij de spelerspoort
  const bord = new THREE.Group();
  doos(bord, M.bord, 0.18, 2.4, 0.18, -1.6, 1.2, 0); doos(bord, M.bord, 0.18, 2.4, 0.18, 1.6, 1.2, 0);
  const plaat = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.28), poortBord());
  plaat.position.set(0, 2.1, -0.1); plaat.rotation.y = Math.PI; bord.add(plaat);
  bord.position.set(GATE.x, ground, GATE.y + 1.4);
  const bal = new THREE.Mesh(new THREE.SphereGeometry(BAL_R, 12, 10), M.bal);
  bal.castShadow = true; bal.visible = false;
  const kruis = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.26, 20), M.kruis);
  kruis.visible = false;
  const keeper = buildPersonMesh(keeperLook.shirt, keeperLook.skin, keeperLook);
  keeper.visible = false;
  getScene().add(root, bord, bal, kruis, keeper);
  return { root, bord, bal, kruis, keeper };
}

function updateLod(w) {
  const p = hoofdspeler(w);
  const d = Math.hypot(p.x - GOAL.x, p.y - GOAL.y);
  if (!built && d < DETAIL_M) built = bouw(w);
  if (!built) return;
  built.root.visible = d < DETAIL_M + 80 || !!game;
  built.bord.visible = built.root.visible;
}

// --- kaartpictogram -------------------------------------------------------------------------------------------------------------

function drawIcon(ctx, s) {
  iconDisc(ctx, s, ACCENT);
  ctx.save();
  ctx.scale(s, s);
  ctx.fillStyle = '#f2ede0';
  ctx.strokeStyle = '#f2ede0';
  ctx.lineWidth = 0.8;
  // een voetbal met een vijfhoek in het midden, en een lijn voor het gras
  ctx.beginPath(); ctx.arc(0, -0.2, 2.5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; ctx.lineTo(Math.cos(a) * 1.1, -0.2 + Math.sin(a) * 1.1); }
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-3, 3); ctx.lineTo(3, 3); ctx.stroke();
  ctx.restore();
}

// --- prompt en start ------------------------------------------------------------------------------------------------------------

function nearGate(w) {
  const p = hoofdspeler(w);
  if (game || w.pigeonMode || w.heliRun || p.inVehicle || p.swimming) return false;
  return Math.hypot(p.x - GATE.x, p.y - GATE.y) < USE_RADIUS;
}

function recText() {
  const rec = getChallengeRecord(difficultyRecordKey(cleanDifficulty(getSettings().difficulty), 'penalty'));
  return rec && rec.best != null ? `Record: ${goalsTekst(Math.round(rec.best))}${rec.medal ? ' · ' + MEDALS[rec.medal].toLowerCase() : ''}` : null;
}

function prompt(w) {
  if (!nearGate(w)) return null;
  const why = activityBlock(w);
  return { id: 'penalty', x: GATE.x, y: GATE.y, h: 2.2, key: 'E', label: 'Penalty’s (minigame)', sub: why || recText() || 'Bonusspel naast de wedstrijd · gratis', ring: true, dim: !!why };
}

function secondary(w) {
  if (game || hoofdspeler(w).inVehicle) return [];
  if (Math.hypot(hoofdspeler(w).x - GATE.x, hoofdspeler(w).y - GATE.y) > 160) return [];
  return [{ id: 'penalty-2', x: GATE.x, y: GATE.y, h: 2.2, label: 'Penaltyserie Euroborg', sub: 'Loop naar de spelerspoort en druk E', kind: 'place' }];
}

function interact(w) {
  if (!nearGate(w)) return false;
  const why = activityBlock(w);
  if (why) { w.addMessage(why, 2.5); return true; }
  // met gasten in de sessie is de serie een uitnodiging aan iedereen (Meedoen? J/N); nog eens E start meteen
  const uit = wedNodigUit(w, 'penalty');
  if (uit.ok) { if (uit.reden === 'wacht') wedNuStarten(w); return true; }
  start(w);
  return true;
}

function start(w, { force = false, online = null } = {}) {
  if (game) return false;
  if (!force && !online && activityBlock(w)) return false;
  if (!built) built = bouw(w);
  const p = hoofdspeler(w);
  enterActivity(w, 'voetbal');   // voetballen doe je als Tessa (karakterbonus.js); end() wisselt terug
  kitAan(w, { mode: 'wedstrijd' });   // het clubtenue (of de neutrale trainingsset), voetbalkleding 22-11; end() geeft de eigen kleren terug
  if (p.inVehicle && p.exitVehicle) p.exitVehicle(w.map, w);
  if (online) { ensureBoard(); board.show(); } // solo staat de strook (simhud.js) in beeld; het bord blijft voor de stand van de anderen
  runs++;
  game = { t: 0, fase: 'intro', faseT: INTRO_S, serie: nieuweSerie(), u: 0, v: 0.45, kracht: 0, laden: false, res: null, laatste: null, tekst: '', flash: null, cam: null, said: 0, online, mode: cleanDifficulty(getSettings().difficulty), schotT: 0, dt: 0, bon: characterEnter(w, 'voetbal') };
  built.root.visible = true; built.bord.visible = true;
  built.bal.visible = true; built.keeper.visible = true; built.kruis.visible = false;
  zetKeeper(0, 0, 0);
  zetBal(SPOT.x, 0.0, SPOT.y);
  zetSpeler(w, 0);
  w.companionHold = { x: SPOT.x - 6, y: SPOT.y - 4, face: Math.PI / 2 };
  if (online !== 'gast') toonStartkaart(w, 'penalty', { record: recText() });
  say(w, 'start', true);
  return true;
}

// --- de serie -------------------------------------------------------------------------------------------------------------------

function zetBal(x, y, z) { if (built) built.bal.position.set(x, ground + y + BAL_R, z); }

// De keeper staat op de doellijn; duik: -1/0/1, f: 0..1 hoe ver in zijn duik (rechts is rechts gezien vanaf de schutter: die kijkt naar het zuiden, dus naar lagere x).
function zetKeeper(duik, f, t) {
  if (!built) return;
  const k = built.keeper;
  const e = f < 0 ? 0 : 1 - (1 - Math.min(1, f)) * (1 - Math.min(1, f));
  const dx = keeperPlek(duik) * HALF_U * e;
  k.position.set(GOAL.x - dx, ground + (duik ? Math.sin(Math.min(1, f) * Math.PI) * 0.5 : 0), GOAL.y - 0.4);
  k.rotation.order = 'ZYX'; // eerst de kijkrichting, dan het kantelen om de as naar het doel
  k.rotation.y = Math.PI / 2;
  k.rotation.z = duik ? duik * 1.15 * e : 0;
  if (!duik && !(f > 0)) k.position.x = GOAL.x + Math.sin(t * 1.7) * 0.5; // hij wiegt heen en weer tot het schot
}

function zetSpeler(w, loop) {
  const p = hoofdspeler(w);
  const y = SPOT.y - 1.6 + loop * 1.2;
  p.x = SPOT.x - 0.5 * (1 - loop); p.y = y; p.angle = Math.PI / 2;
  p.speed = loop > 0 && loop < 1 ? 2.4 : 0; p.moving = loop > 0 && loop < 1; p.vx = 0; p.vy = 0; p.z = ground; p.crouching = false;
}

function say(w, kind, force = false, after = false) {
  const list = PENALTY_LINES[kind];
  if (!list || !built) return;
  const g = game;
  if (g && !force && g.t - g.said < 7) return;
  if (g) g.said = g.t;
  bubble(w, { x: GOAL.x + 3.2, y: GOAL.y - 1.4, name: PENALTY_LINES.who, text: pick(list), h: 2.1, tag: 'penalty', ttl: after ? 4 : 0 });
}

function updateGame(w, dt) {
  const g = game;
  const input = w.input;
  g.t += dt;
  g.dt = dt;
  if (g.online === 'gast' && (!w.coopNet || w.coopRole !== 'client')) { wedGastReset(w); end(w, { quit: true, extern: true }); return; } // de verbinding is weg
  if (g.flash && (g.flash.t -= dt) <= 0) g.flash = null;
  if (stopPressed(input)) { end(w, { quit: true }); return; }
  g.faseT -= dt;
  if (g.fase === 'intro') {
    zetKeeper(0, 0, g.t); zetSpeler(w, 0);
    if (g.faseT <= 0) { g.fase = 'richten'; g.faseT = 0; }
  } else if (g.fase === 'richten') {
    zetKeeper(0, 0, g.t); zetSpeler(w, 0);
    const traag = input.isDown('shift') ? 0.4 : 1;
    const ax = (input.isDown('d') || input.isDown('arrowright') ? 1 : 0) - (input.isDown('a') || input.isDown('arrowleft') ? 1 : 0);
    const ay = (input.isDown('w') || input.isDown('arrowup') ? 1 : 0) - (input.isDown('s') || input.isDown('arrowdown') ? 1 : 0);
    g.u = clamp(g.u + ax * dt * 1.1 * traag, -U_MAX, U_MAX);
    g.v = clamp(g.v + ay * dt * 0.8 * traag, 0.02, V_MAX);
    if (input.isDown(' ')) {
      g.laden = true;
      zetUitlegGezien(UITLEG_ID);
      g.kracht = Math.min(1, g.kracht + dt / (LAAD_S * (input.isDown('shift') ? 1.6 : 1)));
    } else if (g.laden) {
      g.laden = false;
      neemSchot(w, Math.max(0.05, g.kracht));
      g.kracht = 0;
    }
  } else if (g.fase === 'schot') {
    g.schotT += dt;
    schotTik(w, g);
  } else if (g.fase === 'uitkomst') {
    schotTik(w, g);
    if (g.faseT <= 0) {
      if (klaar(g.serie)) { g.fase = 'klaar'; g.faseT = OUTRO_S; g.laatste = null; }
      else { g.fase = 'richten'; g.faseT = 0; g.res = null; g.kracht = 0; zetBal(SPOT.x, 0, SPOT.y); g.cam = null; g.tekst = ''; }
    }
  } else if (g.fase === 'klaar') {
    if (g.faseT <= 0) { end(w); return; }
  }
  if (built) {
    built.kruis.visible = g.fase === 'richten' || g.fase === 'schot';
    built.kruis.position.set(GOAL.x - g.u * HALF_U, ground + g.v * DOEL_HOOGTE, GOAL.y - 0.05);
    if (built.keeper.visible && g.fase === 'intro') animatePersonWalk(built.keeper, 0, dt);
  }
}

function neemSchot(w, kracht) {
  const g = game;
  g.res = schiet({ u: g.u, v: g.v, kracht, stand: g.mode });
  g.fase = 'schot'; g.faseT = SCHOT_S + UITKOMST_S; g.schotT = 0; g.afgehandeld = false;
  pushAudioEvent(w, { kind: 'golf', sub: 'slag', strength: 0.5 + 0.5 * kracht, x: SPOT.x, y: SPOT.y });
}

// De bal vliegt naar het vlak van het doel in SCHOT_S; de keeper duikt mee; daarna rolt hij uit (net, terug van de keeper, weg).
function schotTik(w, g) {
  const r = g.res;
  if (!r) return;
  const s = Math.min(1, g.schotT / SCHOT_S);
  const tx = GOAL.x - r.u * HALF_U, tz = GOAL.y, ty = r.v * DOEL_HOOGTE;
  const lift = Math.sin(Math.PI * s) * (0.5 + 1.2 * Math.max(0, r.kracht - 0.4));
  if (s < 1) {
    zetBal(SPOT.x + (tx - SPOT.x) * s, ty * s + lift * (1 - s), SPOT.y + (tz - SPOT.y) * s);
    zetKeeper(r.duik, (g.schotT - 0.08) / (SCHOT_S - 0.1), g.t);
    zetSpeler(w, Math.min(1, g.schotT / 0.35));
    return;
  }
  zetKeeper(r.duik, 1, g.t);
  const na = g.schotT - SCHOT_S;
  const e = Math.min(1, na / 0.5);
  if (r.uitkomst === 'goal') zetBal(tx, Math.max(0, ty * (1 - e)), tz + 1.3 * e);
  else if (r.uitkomst === 'redding') zetBal(tx + r.duik * 0.4 * e, Math.max(0, ty * (1 - e * 1.3)), tz - 1.4 * e);
  else if (r.uitkomst === 'paal' || r.uitkomst === 'lat') zetBal(tx - Math.sign(r.u || 1) * 0.6 * e, Math.max(0, ty * (1 - e)), tz - 2.2 * e);
  else zetBal(tx - Math.sign(r.u || 1) * 0.5 * e, Math.max(0, ty + 0.4 - e * 1.6), tz + 6 * e);
  if (!g.afgehandeld) {
    g.afgehandeld = true;
    noteer(g.serie, r.uitkomst);
    g.laatste = r.uitkomst;
    const goals = doelpunten(g.serie);
    const pop = schotPop(r.uitkomst, goals);
    if (pop) simHudPop(pop.tekst, pop.geluid);
    pushAudioEvent(w, { kind: 'golf', sub: r.uitkomst === 'goal' ? 'hole' : 'rand', strength: 0.8, x: GOAL.x, y: GOAL.y });
    say(w, r.uitkomst === 'goal' ? 'goal' : r.uitkomst === 'redding' ? 'redding' : 'mis', true);
    g.fase = 'uitkomst'; g.faseT = UITKOMST_S;
    g.flash = { tekst: (UITKOMSTEN[r.uitkomst] || {}).tekst || '', t: UITKOMST_S };
  }
}

function eindeScore(g) { return doelpunten(g.serie); }

function end(w, { quit = false, extern = false, uitslag = null } = {}) {
  const g = game;
  if (!g) return;
  game = null;
  endActivity(w, 'voetbal');
  kitUit();
  karakterEind(w, g.bon);
  w.companionHold = null;
  w.cameraOverride = null;
  const p = hoofdspeler(w);
  p.z = 0; p.moving = false; p.speed = 0;
  if (board) board.hide();
  simHudTik(0, null);
  clearBubbles(w, 'penalty');
  if (built) { built.bal.visible = false; built.kruis.visible = false; built.keeper.visible = false; }
  p.x = GATE.x; p.y = GATE.y; p.angle = -Math.PI / 2;
  const goals = eindeScore(g);
  if (g.online && !quit && !g.gemeld) { // zijn serie gaat naar wie het spel opende
    g.gemeld = true;
    if (g.online === 'host') wedHostPunt(w, 0, goals); else wedGastPunt(w, 0, goals);
  }
  if (g.online) { eindeOnline(w, g, quit, extern, uitslag); return; }
  if (quit) { w.addMessage('Penaltyserie gestopt', 2.5); return; }
  const medal = penaltyMedaille(goals, g.mode);
  const rec = recordChallengeResult(w, difficultyRecordKey(g.mode, 'penalty'), { value: goals, medal });
  recordStat(w, 'penaltySeries');
  const stats = [['Doelpunten', goalsTekst(goals)], ['Gered', String(g.serie.schoten.filter((x) => x === 'redding').length)], ['Naast of over', String(g.serie.schoten.filter((x) => x === 'naast' || x === 'over' || x === 'paal' || x === 'lat').length)]];
  if (medal) stats.push(['Medaille', MEDALS[medal]]);
  const volgende = medailleBij(g.mode).find((v) => goals < v);
  if (medal < 3 && volgende) stats.push(['Volgende', `${volgende} doelpunten`]);
  if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
  showBanner({ kind: medal ? 'pass' : 'fail', title: goals >= SCHOTEN ? 'ALLES BINNEN IN DE EUROBORG' : medal ? 'KOELBLOEDIG' : 'DE KEEPER WON', reason: medal ? `${goalsTekst(goals)} doelpunten tegen Grunn-achtig` : 'Mik in de hoek en schiet niet te hard of te zacht', reward: 0, stats });
  say(w, medal >= 2 ? 'endGood' : 'endPoor', true, true);
}

// Samen spelen: wie stopt laat de anderen doorschieten; de uitslag en de beloning komen van wie het spel opende (multiplayerwedstrijd.js).
function eindeOnline(w, g, quit, extern, res) {
  if (quit) {
    if (!extern) { if (g.online === 'host') wedScoreStop(w); else wedGastVerlaat(w); }
    w.addMessage('Penaltyserie gestopt', 2.5);
    return;
  }
  if (g.online === 'gast' || !res) return; // een gast: de uitslagkaart en het geld komen van de host
  beloonOnline(w, res);
}
function beloonOnline(w, res) {
  recordStat(w, 'penaltySeries');
  const jij = res.jij || { plek: 0, geld: 0, xp: 0 };
  loopbaanVerdien(w, 'buiten', jij.geld, { xp: jij.xp, n: 1, uniek: 'penalty', deel: false });
  if (jij.geld > 0) w.addMessage(`Beloning: €${jij.geld.toLocaleString('nl-NL')}`, 4);
}

// --- camera en HUD --------------------------------------------------------------------------------------------------------------

function camera(w) {
  const g = game;
  if (!g) return;
  const pos = { x: SPOT.x - 0.9, y: SPOT.y - 5.2, z: ground + 1.9 };
  const at = { x: GOAL.x - g.u * 0.9, y: GOAL.y, z: ground + 1.1 };
  const c = easeCamera(g, pos, at, 0.12);
  w.cameraOverride = { position: c.position, lookAt: c.lookAt, fov: 56, cut: true };
}

function ensureBoard() {
  if (!board) board = createBoard('penalty');
  return board;
}

function updateHud(w) {
  const g = game;
  if (!g) return;
  const goals = doelpunten(g.serie);
  const gen = genomen(g.serie);
  if (!g.online) {
    simHudTik(0, penaltyHudModel({
      fase: g.fase, laden: g.laden, lading: g.kracht, schot: g.fase === 'richten' || g.fase === 'intro' ? gen + 1 : Math.max(1, gen), goals, gemist: gen - goals,
      laatste: g.laatste, tekst: g.fase === 'uitkomst' && g.flash ? g.flash.tekst : '', uitleg: !uitlegGezien(UITLEG_ID),
    }));
    return;
  }
  if (!board) return;
  const online = wedScoreRijen(w);
  const stand = online.length ? `<span>${online.map((r) => `${r.weg ? '<s>' : ''}${r.naam} ${r.slagen || 0}${r.weg ? '</s>' : ''}`).join(' · ')}</span>` : '';
  const row = `${stand}<span>Schot <b>${Math.min(SCHOTEN, gen + 1)}/${SCHOTEN}</b></span><span>Doelpunten <b>${goals}</b></span>`;
  const cells = g.serie.schoten.map((x, i) => ({ t: x == null ? String(i + 1) : x === 'goal' ? 'G' : 'X', cls: `${i === gen && g.fase === 'richten' ? 'on' : ''} ${x == null ? '' : x === 'goal' ? 'good' : 'bad'}` }));
  const meter = g.fase === 'richten' ? { v: g.kracht, mark: KRACHT_DOEL, color: g.kracht > KRACHT_DOEL + 0.1 ? 'var(--mk-job, #ff9a3c)' : ACCENT, text: `${Math.round(g.kracht * 100)}%` } : null;
  const flash = g.flash ? g.flash.tekst : g.fase === 'intro' ? 'Leg de bal op de stip' : '';
  const help = `${key('A')}${key('D')}${key('W')}${key('S')} richten · ${key('SPATIE')} kracht · ${key('BACKSPACE')} stoppen`;
  board.set({ row, cells, meter, flash, bad: !!(g.flash && g.laatste && g.laatste !== 'goal'), help });
}

// --- tegen elkaar (Samen spelen): iedereen schiet zijn eigen vijf, wie het spel opende houdt de ranglijst -------------------------

function gastTik(w, dt) {
  if (!game || game.online !== 'gast') return false;
  updateGame(w, dt);
  if (game) { if ((lodT -= dt) <= 0) { lodT = 0.5; updateLod(w); } updateHud(w); }
  return true;
}
registreerWedstrijd('penalty', {
  naam: 'Penaltyserie Euroborg', soort: 'punt', vak: 'buiten',
  opties: () => ({ beurten: 1, naEerste: 120, format: (p) => goalsTekst(Math.round(p)), max: SCHOTEN }), // een serie heeft SCHOTEN schoten: meer melden kan niet
  start: (w) => start(w, { online: 'host', force: true }),
  plek: () => ({ ...GATE }),
  gastPlek: (w, x, y) => !game && !hoofdspeler(w).inVehicle && Math.hypot(x - GATE.x, y - GATE.y) < 4.5, // een gast vraagt het bij de spelerspoort
  eind: (w, res) => {
    if (game && game.online === 'host') end(w, res ? { uitslag: res } : { quit: true, extern: true });
    else if (res) beloonOnline(w, res);
  },
  solo: (w) => start(w),
});
zetWedGastHaken('penalty', {
  dichtbij: (w) => !game && !hoofdspeler(w).inVehicle && Math.hypot(hoofdspeler(w).x - GATE.x, hoofdspeler(w).y - GATE.y) < 3.4,
  start: (w) => start(w, { online: 'gast', force: true }),
  eind: (w, uit) => { if (game && game.online === 'gast') end(w, uit.gestopt ? { quit: true, extern: true } : { uitslag: uit }); },
  tik: gastTik,
});

// --- de activiteit --------------------------------------------------------------------------------------------------------------

export const PENALTY = {
  id: 'penalty',
  layer: 'penalty',
  legend: { kind: 'act-penalty', label: 'Penaltyserie', note: 'vijf penalty’s in de Euroborg: richt, schiet en versla de keeper' },
  init(w) {
    window.__penalty = {
      spot: () => ({ ...GATE }),
      goal: () => ({ ...GOAL }),
      start: (force = true) => start(w, { force }),
      state: () => (game ? { fase: game.fase, u: game.u, v: game.v, goals: doelpunten(game.serie), genomen: genomen(game.serie), schoten: game.serie.schoten.slice() } : null),
      aim: (u, v) => { if (!game) return false; game.u = clamp(u, -U_MAX, U_MAX); game.v = clamp(v, 0.02, V_MAX); return true; },
      shoot: (kracht = KRACHT_DOEL) => { if (!game || game.fase !== 'richten') return false; neemSchot(w, kracht); return true; },
      finish: () => { if (!game) return false; while (!klaar(game.serie)) noteer(game.serie, 'goal'); game.fase = 'klaar'; game.faseT = 0.01; return true; },
      quit: () => { if (!game) return false; end(w, { quit: true }); return true; },
    };
  },
  spots: () => [{ id: 'penalty', name: 'Penaltyserie Euroborg', x: GATE.x, y: GATE.y }],
  prompt,
  secondary,
  interact,
  active: () => !!game,
  quit: (w) => end(w, { quit: true }),
  update(dt, w) {
    if (!game) return;
    if (w.pendingRespawn) { end(w, { quit: true }); return; }
    updateGame(w, dt);
  },
  tick(dt, w) {
    if ((lodT -= dt) <= 0) { lodT = 0.5; updateLod(w); }
    updateHud(w);
  },
  camera,
  icon: drawIcon,
  mapSub: () => recText() || 'Penaltyserie: vijf schoten op de keeper',
  ubbo(w) {
    const d = Math.hypot(GATE.x - hoofdspeler(w).x, GATE.y - hoofdspeler(w).y);
    const rec = getChallengeRecord(difficultyRecordKey(cleanDifficulty(getSettings().difficulty), 'penalty'));
    return { name: 'Penaltyserie Euroborg', sub: rec && rec.medal ? `record: ${MEDALS[rec.medal].toLowerCase()}` : 'vijf penalty’s, gratis', dist: d, x: GATE.x, y: GATE.y, play: 'penalty', where: 'de spelerspoort van de Euroborg', hint: 'loop naar de poort en druk E' };
  },
  runs: () => runs,
};
