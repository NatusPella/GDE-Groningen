import { icoon } from './icons.js';
import { vehicleVerb } from './vehicleverb.js';
import { toggleChoice } from './difficulty.js'; // #1169
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getCamera } from './scene3d.js';
import { getGaragesForRender, garagePrompt } from './garages.js';
import { getHorecaForRender, nearestHorecaSpot, horecaState } from './horeca.js';
import { shopPrimaryPrompt, shopSecondaryPrompts } from './shops.js';
import { homePrompt, homeSecondary, isInsideHome } from './home.js';
import { vehicleDisplayLabel } from './vehiclenames.js';
import { findEnterableVehicle, distToVehicleBody } from './vehicle.js';
import { findRideableProp } from './rideprops.js';
import { deurBijSpeler, deurNaam, heeftInstapdeur } from './vehicledoors.js';
import { getSettings } from './settings.js';
import { physicalKey, tokenKey, keyName, PAD_LAYOUTS } from './controls.js';
import { glyphHtml, keyTextHtml } from './keycap.js';
import { KEYS } from './storagekeys.js';
import { promptSub, explains, explainId, markSeen, parseSeen } from './hudtext.js';
import { hoofdspeler } from './players.js';
import { isPadActive, padState } from './gamepad.js';
import { getUiScale } from './uiscale.js';
import { isPhoneOpen, isPauseMenuOpen } from './pausestate.js';
import { lineOfSight } from './pedgeom.js';
import { pigeonSpotPrompt, pigeonSpotSecondary } from './pigeonspots.js';
import { sideJobPrompt, sideJobSecondary } from './sidejobs.js';
import { stationPrompt, stationSecondary } from './stationtravel.js';
import { bushaltePrompt } from './bushalte.js';
import { machinePrompt } from './snackautomaat.js';
import { boerderijPrompt } from './boerderijwereld.js';
import { streetLifePrompt } from './streetlife.js';
import { weaponDropPrompt } from './weapondrops.js';
import { trainPrompt } from './traindrive.js';
import { heliSpotPrompt, heliSpotSecondary } from './helirun.js';
import { padelPrompt, padelSecondary } from './padel.js';
import { activityPrompt, activitySecondary } from './activities.js';
import { hengelVrijPrompt } from './hengelen.js';
import { postgamePrompt, postgameSecondary } from './postgame.js';
import { ommelandPrompt, ommelandSecondary } from './ommelandfun.js';
import { beppePrompt } from './beppe_garden.js';
import { interiorPrompt } from './interiors.js'; // de plekken binnen in een pand (#1150)
import { renderAimReticle } from './aimassist.js';
import { WEAPONS, isMeleeWeapon, isRangedWeapon } from './combat.js';
import { gameBusy } from './busy.js';
import { aaiPrompt } from './aaien.js';
import { kaartjesPrompt } from './kaartjescontrole.js';
import { viewpointPrompt } from './explorationlive.js';
import { wrakduikPrompt } from './wrakduikenlive.js'; // #839
import { onderdeelPrompt } from './onderdelenlive.js'; // #837
import { streekuitdagingPrompt } from './streekuitdaginglive.js'; // #835
import { makePromptClock, blockedInChase } from './prompttick.js';
import { labelDy, anchorCovered } from './promptclear.js';
import { setBubbleObstacles } from './hudrules.js';
import { readCounters } from './opslaglezen.js';

const USES_KEY = KEYS.hintUses;
const LEARN_USES = 3;
const MASTER_USES = 3;
const KISS_DIST = 1.8;
const KISS_COOLDOWN = 3;
const SECONDARY_INTERVAL = 0.15;
const MAX_SECONDARY = 1;
const HERO_LABEL_NEAR = 4; // m: binnen deze afstand van de eigen auto geen "Loop erheen"-label meer
const MAX_ROWS = 2;
// key hints come up one by one: a moment after spawning or a cutscene, then one more per stagger
const ROWS_DELAY = 2.5;
const ROWS_STAGGER = 1.4;

let root = null;
let wps = [];
let rowsEl = null;
let rowsKey = '';
let uses = {};
let usesDirty = false;
let saveTimer = 0;
let secondaryTimer = 0;
let secondary = [];
// #659: de primaire zoeker draait op een klok (8 Hz) in plaats van elke frame
const primaryClock = makePromptClock();
let primary = null;
let kissUntil = 0;
let pressFlash = 0;
let prev = { inVehicle: false, mouseDown: false };
let lastPrimaryKey = '';
const admitted = new Set();
let rowGate = ROWS_DELAY;
let hiddenT = 0;
const tmp = new THREE.Vector3();
const camDir = new THREE.Vector3();

function loadUses() {
  try {
    uses = readCounters(localStorage.getItem(USES_KEY)); // alleen eindige getallen: een tekst zou bij het optellen aan elkaar plakken
  } catch (e) { uses = {}; }
}

function saveUses() {
  usesDirty = false;
  try { localStorage.setItem(USES_KEY, JSON.stringify(uses)); } catch (e) { /* ignore */ }
}

function used(id, n = 1) {
  const cur = uses[id] || 0;
  if (cur >= MASTER_USES + 4) return;
  uses[id] = cur + n;
  usesDirty = true;
}

const count = (id) => uses[id] || 0;
export const hintUses = count;

// "Uitleg opnieuw tonen" (Hints & uitleg): de toetshints beginnen weer als nieuw, dus de
// geleerde toetsen en hun tellers gaan weg. De uitlegkaarten en contexthints hebben hun eigen
// reset in onboarding.js en contexthints.js; pausemenu.js roept die drie bij elkaar aan.
export function resetHintUses() {
  uses = {};
  saveUses();
}
const learning = (id) => count(id) < LEARN_USES;
const mastered = (id) => count(id) >= MASTER_USES;

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export { glyphHtml };

// Hold-to-interact / cooldown ring around a glyph; p in 0..1.
function setHoldProgress(el, p) {
  const ring = el && el.querySelector('.r-fg');
  if (!ring) return;
  const v = Math.max(0, Math.min(1, p));
  ring.style.strokeDashoffset = String(100 - v * 100);
  el.querySelector('.hud-hold').classList.toggle('holding', v > 0 && v < 1);
}

export function initPrompts(hudRoot) {
  loadUses();
  loadSeen();
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./prompts.css', import.meta.url).href;
  document.head.appendChild(link);

  root = document.createElement('div');
  root.className = 'hud-prompts';
  for (let i = 0; i < 1 + MAX_SECONDARY; i++) {
    const el = document.createElement('div');
    el.className = 'wp' + (i === 0 ? ' wp-primary' : ' wp-secondary');
    el.innerHTML = '<i class="wp-dot"></i><i class="wp-line"></i><div class="wp-chip"></div>';
    root.appendChild(el);
    wps.push({ el, chip: el.querySelector('.wp-chip'), key: '', shown: false });
  }
  hudRoot.appendChild(root);

  rowsEl = document.createElement('div');
  rowsEl.className = 'hud-ctx';
  rowsEl.setAttribute('aria-live', 'polite');
  hudRoot.appendChild(rowsEl);

  window.addEventListener('pagehide', () => { if (usesDirty) saveUses(); });
}

function hiddenNow(world) {
  if (!toggleChoice('hints', getSettings().showHints)) return true; // #1169
  const b = document.body.classList;
  if (!b.contains('game-started') || b.contains('cine-hide-hud') || b.contains('pigeon-mode') || b.contains('bm-eindkaart')) return true; // achter de eindkaart geen sleutelhints (#1188)
  if (world.pigeonMode) return true;
  if (world.cameraOverride || world.uiPaused || world.paused || world.menuCam) return true;
  if (isPhoneOpen() || isPauseMenuOpen()) return true;
  const cine = document.getElementById('cine');
  return !!(cine && cine.classList.contains('active'));
}

// The key hints step aside for a HUD card, a phone call, the story's skip offer or a subtitle.
function hintsQuiet() {
  const b = document.body.classList;
  if (b.contains('hud-card-on') || b.contains('hud-call-on') || b.contains('story-skip-on')) return true;
  const sub = document.getElementById('banter-sub');
  return !!(sub && sub.style.opacity === '1');
}

export function updatePrompts(dt, world) {
  renderAimReticle(world);
  if (!root) return;
  trackUsage(dt, world);
  saveTimer -= dt;
  if (usesDirty && saveTimer <= 0) { saveTimer = 2; saveUses(); }
  pressFlash = Math.max(0, pressFlash - dt);

  const hidden = hiddenNow(world);
  root.classList.toggle('off', hidden);
  rowsEl.classList.toggle('off', hidden || hintsQuiet());
  hudObstacles(); // ook als de hints zwijgen blijven de bellen van voorbijgangers van de HUD-kaarten af (cache van 0,2 s; #1198)
  if (hidden) {
    // after a scene or a respawn the hints build up again from nothing
    if ((hiddenT += dt) > 1.5) { admitted.clear(); rowGate = ROWS_DELAY; }
    primary = null;
    primaryClock.reset();
    return;
  }
  hiddenT = 0;

  if (primaryClock.due(dt)) { primary = findPrimary(world); if (blockedInChase(primary, world.wanted)) primary = null; }
  secondaryTimer -= dt;
  if (secondaryTimer <= 0) {
    secondaryTimer = SECONDARY_INTERVAL;
    secondary = findSecondary(world, primary);
  }
  renderWorldPrompts(world, primary);
  renderRows(world, primary, dt);
}

// --- usage tracking (drives the tutorial level of every hint) ---------------

function trackUsage(dt, world) {
  const input = world.input;
  if (!input || !document.body.classList.contains('game-started')) return;
  const ik = hoofdspeler(world);
  const inV = !!ik.inVehicle;
  const pressed = (k) => input.wasPressed(k);

  if (pressed('m')) used('map');
  const menu = isPauseMenuOpen();
  if (menu && !prev.menu) used('pause');
  prev.menu = menu;
  if (world.paused || world.uiPaused) { prev.mouseDown = input.mouse.down; return; }

  if (world.pigeonMode) { prev.mouseDown = input.mouse.down; return; }

  if (inV && !prev.inVehicle) used('enter');
  if (!inV && prev.inVehicle) used('exit');
  prev.inVehicle = inV;
  const swim = !!ik.swimming;
  if (prev.swimming && !swim && ik.water !== 'fall') used('climb');
  prev.swimming = swim;

  if (pressed('e') || pressed('f')) pressFlash = 0.22;
  if (pressed('c')) used('switch');
  for (let i = 1; i <= 4; i++) if (pressed(String(i))) used('weapon');
  if (input.mouse.down && !prev.mouseDown) used(isMeleeWeapon(world.weapon) ? 'punch' : world.weapon === 'carbidbus' ? 'throw' : 'shoot');
  prev.mouseDown = input.mouse.down;
  if (input.mouse.rightDown && !prev.rightDown && isRangedWeapon(world.weapon)) used(WEAPONS[world.weapon].scope ? 'scope' : 'aim');
  prev.rightDown = input.mouse.rightDown;

  if (inV && ik.inVehicle.isHeli) {
    if (pressed(' ') || pressed('control')) used('heliUp');
    if (pressed('a') || pressed('d')) used('heliYaw');
    if (['w', 's', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].some(pressed)) used('heliFly');
    if (pressed('shift')) used('heliBoost');
    return;
  }
  // the train's own controls (the basics, WASD, mouse, Shift, Space, need no hint)
  if (world.trainDriving) {
    if (pressed('w') || pressed('s') || pressed('arrowup') || pressed('arrowdown')) used('drive');
    if (pressed(' ')) used('handbrake');
    if (pressed('k')) used('waak');
    if (pressed('o')) used('deuren');
    if (pressed('h')) used('horn');
  }
}

// --- world-anchored prompts -------------------------------------------------

function vehicleName(v) {
  if (v.isHeroCar) return 'Jouw ouwe Fjord Escapade';
  if (v.playerOwned) return 'Jouw ' + vehicleDisplayLabel(v);
  return vehicleDisplayLabel(v);
}

function doorAnchor(v, p, deur = null) {
  if (deur) return { x: deur.x, y: deur.y, h: v.isBus || v.isTram || v.isTrain ? 1.7 : 1.2 };
  if (v.isBike || v.isScooter) return { x: v.x, y: v.y, h: 1.25 };
  const nx = -Math.sin(v.angle), ny = Math.cos(v.angle);
  const side = (p.x - v.x) * nx + (p.y - v.y) * ny >= 0 ? 1 : -1;
  const fwd = v.halfLen * 0.18;
  return {
    x: v.x + nx * side * v.halfWid + Math.cos(v.angle) * fwd,
    y: v.y + ny * side * v.halfWid + Math.sin(v.angle) * fwd,
    h: v.isBus ? 1.7 : v.isBoat ? 1.0 : 1.2,
  };
}


function facing(world) {
  const cam = getCamera();
  if (cam) {
    cam.getWorldDirection(camDir);
    const l = Math.hypot(camDir.x, camDir.z) || 1;
    return { fx: camDir.x / l, fy: camDir.z / l };
  }
  const ik = hoofdspeler(world);
  return { fx: Math.cos(ik.angle), fy: Math.sin(ik.angle) };
}

function angleOff(p, x, y) {
  const a = Math.atan2(y - p.y, x - p.x) - p.angle;
  return Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
}

function pedInReach(world, range, cone) {
  const p = hoofdspeler(world);
  let best = null, bestD = range;
  for (const ped of world.pedestrians || []) {
    if (ped.state === 'dead') continue;
    const dx = ped.x - p.x, dy = ped.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > bestD || d < 0.01) continue;
    if (angleOff(p, ped.x, ped.y) > cone) continue;
    bestD = d; best = ped;
  }
  return best;
}

// Mirrors the order player.js resolves an E press in (kissing is K now): the
// nearest vehicle; clicks come next.
function findPrimary(world) {
  const p = hoofdspeler(world);
  // upstairs in the flat only the flat's own uses: the street is 34 m below
  if (isInsideHome()) return homePrompt(world);
  // a mission stage's own prompt (heist.js: the distraction, the pickpocket)
  if (world.missionPrompt && !p.inVehicle) return world.missionPrompt;
  const train = trainPrompt(world);
  if (train) return train;
  const job = sideJobPrompt(world);
  if (job) return job;
  const gar = garagePrompt(world);
  if (gar) return gar;
  const pg = postgamePrompt(world);
  if (pg) return pg;
  const boer = boerderijPrompt(world);
  if (boer) return boer;
  const muur = machinePrompt(world);
  if (muur) return muur;
  const drop = weaponDropPrompt(world);
  if (drop) return drop;
  const straat = streetLifePrompt(world);
  if (straat) return straat;
  const shop = shopPrimaryPrompt(world);
  if (shop) return shop;
  const thuis = homePrompt(world);
  if (thuis) return thuis;
  // hengelen overal (#412): in een boot die stilligt gaat het prompt voor de andere, anders pas als er niets anders te doen is
  const visBoot = hengelVrijPrompt(world, true);
  if (visBoot) return visBoot;
  const wad = streekuitdagingPrompt(world);
  if (wad) return wad;
  if (p.inVehicle) return null;
  if (p.swimming) {
    // E boards a boat alongside, Space climbs out: a quay next to a boat
    // never puts you aboard by accident
    const boat = findEnterableVehicle(p.x, p.y, world.vehicles, 1.4);
    if (boat && boat.isBoat) return { id: 'board-' + boat.id, x: boat.x, y: boat.y, h: 1.6, key: 'E', label: 'Aan boord klimmen', sub: p.canClimbOut && !isPadActive() ? '{SPACE}: de kade op' : '', ring: true };
    if (!p.canClimbOut) return null;
    return { id: 'climb', x: p.x, y: p.y, h: 0.6, key: 'SPATIE', label: 'Eruit klimmen', sub: learning('climb') ? 'Klim de kade weer op' : '', learn: learning('climb'), ring: true };
  }
  const wrak = wrakduikPrompt(world);
  if (wrak) return wrak;
  const onderdeel = onderdeelPrompt(world);
  if (onderdeel) return onderdeel;
  const duif = pigeonSpotPrompt(world);
  if (duif) return duif;
  const heli = heliSpotPrompt(world);
  if (heli) return heli;
  const padel = padelPrompt(world);
  if (padel) return padel;
  const act = activityPrompt(world);
  if (act) return act;
  const aai = aaiPrompt(world);
  if (aai) return aai;
  const dorp = ommelandPrompt(world);
  if (dorp) return dorp;
  // het eerbetoonbankje (#832): de twee bankjes aan de westgrens
  const beppe = beppePrompt(world);
  if (beppe) return beppe;
  const binnen = interiorPrompt(world);
  if (binnen) return binnen;
  const knip = kaartjesPrompt(world);
  if (knip) return knip;
  const halte = bushaltePrompt(world);
  if (halte) return halte;
  const trein = stationPrompt(world);
  if (trein) return trein;
  const food = nearestHorecaSpot(world);
  if (food) {
    const st = horecaState(world, food);
    const name = food.name || 'Kroeg';
    if (st === 'ready') return { id: 'food-' + name, x: food.x, y: food.y, h: 2.75, key: 'E', label: 'Iets bestellen', sub: `${name}: hapje + drankje, +15 gezondheid`, ring: true };
    return { id: 'food-' + name, x: food.x, y: food.y, h: 2.75, key: 'E', label: 'Iets bestellen', sub: st === 'broke' ? 'Te weinig geld (min. €12)' : 'Even laten zakken…', ring: true, dim: true };
  }
  const c = world.companion;
  const kissable = !!world.kissUnlocked && c && c.state !== 'dead' && !c.inVehicle && Math.hypot(c.x - p.x, c.y - p.y) <= KISS_DIST;
  const kissReady = world.time >= kissUntil;
  if (kissable && kissReady && world.input && world.input.wasPressed('k')) {
    kissUntil = world.time + KISS_COOLDOWN;
    used('kiss');
  }
  const facingC = kissable && angleOff(p, c.x, c.y) < (learning('kiss') ? 1.4 : 0.8);
  const v = findEnterableVehicle(p.x, p.y, world.vehicles);
  const pr = findRideableProp(p.x, p.y);
  if (pr && (!v || pr.dist < distToVehicleBody(v, p.x, p.y))) {
    const scooter = pr.prop.kind === 'scooter';
    const label = scooter ? 'Scooter jatten' : 'Fiets jatten';
    const sub = pr.prop.locked ? 'Op slot: even het slot kraken' : scooter ? 'Staat gewoon los geparkeerd' : 'Staat niet eens op slot';
    return { id: 'prop-' + pr.prop.key, x: pr.prop.x, y: pr.prop.y, h: 1.25, key: 'E', label, sub, ring: true, steal: true };
  }
  if (v) {
    const verb = vehicleVerb(v);
    // bij een auto, bus of trein verschijnt de hint bij de deur waar je staat en kun je
    // alleen daar instappen (#459); een fiets, step, boot of quad heeft geen deur
    const deur = deurBijSpeler(v, p.x, p.y);
    if (!deur && heeftInstapdeur(v)) return null;
    const deurTxt = deur ? deurNaam(v, deur.deur) : '';
    const a = doorAnchor(v, p, deur);
    const learn = learning('enter');
    let sub = deurTxt ? `Bij de ${deurTxt}` : vehicleName(v);
    if (learn) sub = verb.steal ? 'Sleur de bestuurder eruit en rij weg' : 'Stap in en rij weg, niemand die het ziet';
    return { id: 'veh-' + v.id + verb.label + deurTxt, ...a, key: 'E', label: verb.label, sub, deur: deurTxt, learn, ring: true, steal: !!verb.steal };
  }
  if (facingC && kissReady) {
    const name = c.character === 'tammo' ? 'Tammo' : 'Tessa';
    return { id: 'kiss-' + name, x: c.x, y: c.y, h: 1.55, key: 'K', label: 'Kusje', sub: learning('kiss') ? `Geef ${name} een smakkerd: +25 gezondheid` : name, learn: learning('kiss'), ring: true, cooldown: 0 };
  }
  if (facingC) {
    const name = c.character === 'tammo' ? 'Tammo' : 'Tessa';
    return { id: 'kiss-' + name, x: c.x, y: c.y, h: 1.55, key: 'K', label: 'Kusje', sub: 'Even bijkomen…', ring: true, cooldown: (kissUntil - world.time) / KISS_COOLDOWN, dim: true };
  }
  const weapon = world.weapon || 'fists';
  if (isMeleeWeapon(weapon)) {
    const ped = pedInReach(world, WEAPONS[weapon].range + 0.4, Math.PI / 3);
    if (ped) return { id: 'punch-' + (ped.id ?? ''), x: ped.x, y: ped.y, h: 1.75, key: 'LMB', label: 'Slaan', sub: ped.isCop ? 'Een agent? Durf je dat?' : learning('punch') ? '{LMB} om uit te delen' : '', learn: learning('punch'), danger: true };
  }
  // aan de kant bij water en niets anders te doen: hengelen (#412)
  const vis = hengelVrijPrompt(world, false);
  if (vis) return vis;
  // #825: helemaal onderaan, want de E-actie van een uitkijkpunt loopt in de wereld ook als laatste
  return viewpointPrompt(world);
}

function inFront(world, x, y, f) {
  const ik = hoofdspeler(world);
  const dx = x - ik.x, dy = y - ik.y;
  const d = Math.hypot(dx, dy) || 1;
  return { d, dot: (dx * f.fx + dy * f.fy) / d };
}

function findSecondary(world, primary) {
  const p = hoofdspeler(world);
  if (isInsideHome()) return [];
  const f = facing(world);
  const out = [];
  const add = (c, maxD) => {
    const { d, dot } = inFront(world, c.x, c.y, f);
    if (d > maxD || dot < -0.1) return;
    if (d > 3 && c.kind !== 'mission' && !lineOfSight(world.map, p.x, p.y, c.x, c.y)) return;
    c.score = d * (1.6 - dot) * (c.boost || 1);
    out.push(c);
  };
  const inV = p.inVehicle;
  for (const g of getGaragesForRender()) {
    add({ id: 'g' + g.x + g.y, x: g.x, y: g.y, h: 4.4, label: g.name, sub: inV ? 'Rij naar binnen en druk R: repareren, spuiten, opvoeren' : 'Kom met een voertuig', kind: 'place' }, inV ? 45 : 20);
  }
  if (!inV && world.money >= 12) {
    const spots = getHorecaForRender();
    for (let i = 0; i < spots.length; i++) {
      const s = spots[i];
      if (Math.abs(s.x - p.x) > 12 || Math.abs(s.y - p.y) > 12) continue;
      if (world.time - s.lastUsed < 60) continue;
      add({ id: 'h' + i, x: s.x, y: s.y, h: 1.9, label: s.name || 'Kroeg', sub: 'Loop erheen en druk E voor een hapje', kind: 'place' }, 10);
    }
  }
  for (const c of shopSecondaryPrompts(world)) add(c, 14);
  for (const c of homeSecondary(world)) add(c, 30);
  for (const c of pigeonSpotSecondary(world)) add(c, 18);
  for (const c of heliSpotSecondary(world)) add(c, 20);
  for (const c of padelSecondary(world)) add(c, 25);
  for (const c of activitySecondary(world)) add(c, 30);
  for (const c of postgameSecondary(world)) add(c, 25);
  for (const c of sideJobSecondary(world)) add(c, c.maxD || 20);
  for (const c of stationSecondary(world)) add(c, 22);
  for (const c of ommelandSecondary(world)) add(c, 24);
  const m = world.mission;
  const inGameBusy = gameBusy(world);
  if (m && (m.phase === 'idle') && m.label && !(world.sideJob && world.sideJob.active) && !inGameBusy) {
    add({ id: 'mis', x: m.marker.x, y: m.marker.y, h: 3.2, label: 'Missie: ' + m.label, kind: 'mission' }, 60);
  }
  const g = world.storyGuide;
  const onMarker = m && m.phase === 'idle' && Math.hypot(m.marker.x - g?.x, m.marker.y - g?.y) < 4;
  if (g && !onMarker && !inGameBusy && !(m && m.phase === 'active') && !(world.sideJob && world.sideJob.active)) {
    add({ id: 'story', x: g.x, y: g.y, h: 3.2, label: g.name, sub: g.buy ? 'Voor het verhaal: loop naar binnen (E)' : 'Volgende stap in het verhaal', kind: 'mission' }, 80);
  }
  if (!inV && learning('enter') && !primary) {
    for (const v of world.vehicles) {
      // a new player's first ride wins over the place labels around it
      // wie al naast de auto staat, krijgt de deurhint en niet meer "Loop erheen" (video-QA 23-11)
      if (v.isHeroCar && !v.wrecked && !v.driver && Math.hypot(v.x - p.x, v.y - p.y) > HERO_LABEL_NEAR) add({ id: 'hero' + v.id, x: v.x, y: v.y, h: 1.6, label: 'Jouw ouwe Escapade', sub: 'Loop erheen, dan {E}', kind: 'place', boost: 0.2 }, 40);
    }
  }
  out.sort((a, b) => a.score - b.score);
  return out.slice(0, MAX_SECONDARY);
}

function project(x, y, h) {
  const cam = getCamera();
  if (!cam) return null;
  tmp.set(x, h, y).project(cam);
  if (tmp.z > 1 || tmp.z < -1) return null;
  const sx = (tmp.x + 1) * 0.5 * window.innerWidth;
  const sy = (1 - tmp.y) * 0.5 * window.innerHeight;
  if (sx < -40 || sx > window.innerWidth + 40 || sy < -40 || sy > window.innerHeight + 40) return null;
  return { sx, sy };
}

// how often each long explanation has shown (hudtext.js): after a couple of times only the label stays
let hudSeen = {};
function loadSeen() {
  try { hudSeen = parseSeen(localStorage.getItem(KEYS.hudSeen)); } catch (e) { hudSeen = {}; }
}
function noteExplained(id) {
  hudSeen = markSeen(hudSeen, id);
  try { localStorage.setItem(KEYS.hudSeen, JSON.stringify(hudSeen)); } catch (e) { /* ignore */ }
}

function chipHtml(c, primary) {
  const sub = promptSub(c, hudSeen);
  const glyph = primary && c.key ? '<span class="wp-glyph">' + glyphHtml(c.key, { ring: c.ring }) + '</span>' : '<i class="wp-tick"></i>';
  return glyph + '<span class="wp-text"><b>' + esc(c.label) + '</b>' + (sub ? '<small>' + keyTextHtml(esc(sub)) + '</small>' : '') + '</span>';
}

function placeWp(slot, c, primary, hold = null) {
  if (!c) {
    if (slot.shown) { slot.el.classList.remove('in'); slot.shown = false; }
    return;
  }
  const pos = project(c.x, c.y, c.h);
  if (!pos) {
    if (slot.shown) { slot.el.classList.remove('in'); slot.shown = false; }
    return;
  }
  const key = c.id + '|' + c.label + '|' + c.sub + '|' + (c.learn ? 1 : 0);
  if (key !== slot.key) {
    slot.key = key;
    if (explains(c, hudSeen)) noteExplained(explainId(c));
    slot.chip.innerHTML = chipHtml(c, primary);
    slot.el.dataset.kind = c.kind || (c.danger ? 'danger' : c.steal ? 'steal' : 'act');
    slot.el.classList.toggle('wp-learn', !!c.learn);
    slot.w = 0;
  }
  slot.el.classList.toggle('dim', !!c.dim);
  hudObstacles();
  slot.el.classList.toggle('wp-weg', anchorCovered(pos.sx, pos.sy, obstacleCache.boards)); // #985: het anker ligt onder een bord
  // #826: de chip is een label boven/naast de stip; meet hem elke keer en houd hem met zijn
  // echte hoogte en breedte binnen het scherm (de stip mag dichter bij de rand).
  slot.w = slot.chip.offsetWidth + 40;
  const chipW = slot.chip.offsetWidth || 112, chipH = slot.chip.offsetHeight || 31;
  const ui = getUiScale();
  const w = chipW * ui;
  // #826: flip alleen als de chip links écht past; anders blijft hij rechts en klemt de ouder hem binnen.
  const roomLeft = pos.sx - 26 * ui - w;
  const useFlip = roomLeft >= 8 * ui;
  slot.el.classList.toggle('flip', useFlip);
  const cx = useFlip ? pos.sx : Math.max(8 * ui, Math.min(window.innerWidth - w - 34 * ui, pos.sx));
  // de chip hangt boven de stip: zijn onderkant zit 18 px boven de stip, dus de stip moet
  // minimaal chiphoogte + 18 px + 8 px van de bovenrand blijven.
  const cy = Math.max((8 + chipH + 18) * ui, Math.min(window.innerHeight - 8 * ui, pos.sy));
  slot.el.style.transform = `translate3d(${(cx / ui).toFixed(1)}px, ${(cy / ui).toFixed(1)}px, 0)`;
  // #826: de bovenstaande marge is een model; meet de echte chip en schuif hem alsnog binnen
  // het scherm (portret, korte labels, ui-schaal).
  const cr = slot.chip.getBoundingClientRect();
  const over = cr.right - (window.innerWidth - 4);
  if (over > 0) slot.el.style.transform = `translate3d(${((cx - over) / ui).toFixed(1)}px, ${(cy / ui).toFixed(1)}px, 0)`;
  else if (cr.left < 4) slot.el.style.transform = `translate3d(${((cx + 4 - cr.left) / ui).toFixed(1)}px, ${(cy / ui).toFixed(1)}px, 0)`;
  if (!slot.shown) {
    slot.shown = true;
    void slot.el.offsetWidth;
    slot.el.classList.add('in');
  }
  if (primary && c.ring) {
    const p = c.cooldown > 0 ? 1 - c.cooldown : hold != null ? hold : pressFlash > 0 ? 1 - pressFlash / 0.22 : 0;
    setHoldProgress(slot.chip, p);
  }
}

let heldPrimary = null;
let heldAt = 0;

function renderWorldPrompts(world, primary) {
  const now = performance.now();
  if (hoofdspeler(world).inVehicle) heldPrimary = null;
  if (primary) { heldPrimary = primary; heldAt = now; }
  else if (heldPrimary && now - heldAt < 150) primary = heldPrimary;
  const hold = typeof world.promptHold === 'number' && primary && primary.steal ? world.promptHold : null;
  const pk = primary ? primary.id : '';
  if (pk !== lastPrimaryKey) {
    lastPrimaryKey = pk;
    if (primary) { wps[0].el.classList.remove('in'); wps[0].shown = false; }
  }
  placeWp(wps[0], primary, true, hold);
  // only the nearest interaction: no place labels next to an E prompt
  const sec = primary ? [] : secondary;
  for (let i = 0; i < MAX_SECONDARY; i++) placeWp(wps[i + 1], sec[i] || null, false);
  // #826: laatste vangnet — meet de echte chip en schuif hem met de CSS-translate binnen
  // het scherm. De modelmatige marge in placeWp kent niet elke ui-schaal/labelcombinatie.
  const ui = getUiScale();
  for (const s of wps) {
    if (!s.el.classList.contains('in')) { s.chip.style.translate = ''; s.el.classList.remove('wp-los'); continue; }
    s.chip.style.translate = '';
    const r = s.chip.getBoundingClientRect();
    const dx = r.right > window.innerWidth - 4 ? window.innerWidth - 4 - r.right : r.left < 4 ? 4 - r.left : 0;
    // #985: ook niet over een kaart, de minikaart of het doel heen: onder of boven dat onderdeel
    const dy = labelDy({ left: r.left + dx, right: r.right + dx, top: r.top, bottom: r.bottom }, hudObstacles(), { w: window.innerWidth, h: window.innerHeight });
    s.chip.style.translate = dx || dy ? `${(dx / ui).toFixed(1)}px ${(dy / ui).toFixed(1)}px` : '';
    // #1189 (hertest 24-11): een label dat onder de doelbalk is geschoven hangt niet meer aan zijn stip; de schuine lijn wees dan
    // dwars door de tekst. Los van het anker: geen lijn, alleen de stip op de plek zelf.
    s.el.classList.toggle('wp-los', !!dy);
  }
}

// the HUD parts a world label must stay clear of (rects in screen px, measured at most every 0.2 s)
const BOARD_SEL = '.mg-board, .cw-panel, .stunt-hud, .hud-instr';
const OBSTACLE_SEL = BOARD_SEL + ', .hud-top-right, .hud-cards .hud-card, .hud-cards-e .hud-card, .hud-mission, .hud-location, .hud-minimap-wrap, .hud-gps, .hud-nowplaying, .hud-speedo, .hud-race, .pf-card';
let obstacleCache = { at: 0, list: [], boards: [] };
function hudObstacles() {
  const now = performance.now();
  if (now - obstacleCache.at < 200) return obstacleCache.list;
  const list = [], boards = [];
  const hud = root && root.parentElement;
  if (hud) for (const el of hud.querySelectorAll(OBSTACLE_SEL)) {
    if (el.hidden) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    let o = 1; for (let a = el; a && a !== hud.parentElement; a = a.parentElement) o *= parseFloat(getComputedStyle(a).opacity);
    if (o > 0.3) { const q = { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; list.push(q); if (el.matches(BOARD_SEL)) boards.push(q); }
  }
  obstacleCache = { at: now, list, boards };
  setBubbleObstacles(list); // #985: speech bubbles keep clear of the same HUD parts
  return list;
}

// --- compact context stack (bottom right) -----------------------------------
// One chip per control: key cap + pictogram, at most MAX_ROWS, the most
// relevant for what you're doing first, coming up one by one. Only the first
// new one (fewer than LEARN_USES uses) gets text: the big tutorial look with
// a description; once used MASTER_USES times a chip fades out for good. The
// objective (mission, bijbaan, police) lives in the objective line at the top.

const PIC = {
  move: '<circle cx="12" cy="4.2" r="2"/><path d="M12 7.5l-1.2 5.5 3 3v5.5M10.8 13l-2.6 7.5M12 8l3.8 3M12 8l-3.8 2.6"/>',
  look: '<path d="M20 12a8 4 0 1 1-4.5-3.6"/><path d="M13.5 6.6l2.3 1.9-2.6 1.5"/><circle cx="12" cy="12" r="1.6"/>',
  sprint: '<circle cx="14.5" cy="4" r="2"/><path d="M13.5 7.2l-3 5 4 2.2-1.2 7M10.5 12.2l-4.2 1M13.5 7.2l4 3 2.8-1M2 9.5h3.5M1 13.5h3.5"/>',
  jump: '<circle cx="12" cy="3.6" r="2"/><path d="M12 6.4v5.8M12 8.4l-4-2M12 8.4l4-2M12 12.2l-3.2 4M12 12.2l3.2 4M4 21.5h16M6 18.5l-2-2M18 18.5l2-2"/>',
  crouch: '<circle cx="9" cy="8" r="2"/><path d="M9 11l2.2 3.6H16M11.2 14.6l-3 2.6v4M16 14.6v6.6M3.5 21.5h15M20 3.5v6M17.6 7.2L20 9.6l2.4-2.4"/>',
  shoot: '<circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5"/><circle cx="12" cy="12" r="0.8"/>',
  punch: '<path d="M7 11V8a1.6 1.6 0 0 1 3.2 0v2.5M10.2 10V6.8a1.6 1.6 0 0 1 3.2 0V10M13.4 10V7.6a1.6 1.6 0 0 1 3.2 0v3M16.6 10.8V9.8a1.6 1.6 0 0 1 3.2 0v4a6.2 6.2 0 0 1-6.2 6.2H12a5 5 0 0 1-5-5v-4.4a1.6 1.6 0 0 1 3.2 0"/>',
  weapon: '<path d="M3 8.5h16l1 3h-7.5l-1.2 2.2H9.5L8.3 19H4.4l1.5-5.3H3z"/>',
  map: '<path d="M3 6.2l6-2.2 6 2.2 6-2.2v13.8l-6 2.2-6-2.2-6 2.2zM9 4v13.8M15 6.2V20"/>',
  phone: '<rect x="7.5" y="2.5" width="9" height="19" rx="2.2"/><path d="M9.4 3v18"/><circle cx="12.6" cy="5" r=".5"/>',
  // the pause menu is the unfolded phone
  pause: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M12 5v14"/><circle cx="16.8" cy="7.6" r=".5"/>',
  drive: '<circle cx="12" cy="12" r="8.8"/><circle cx="12" cy="12" r="2.4"/><path d="M3.6 10.4l6.2 1M20.4 10.4l-6.2 1M12 14.4v6.4"/>',
  handbrake: '<path d="M5 20c0-8.5 5.5-12.5 13.5-12.5"/><path d="M15 3.8l3.8 3.7-3.8 3.7"/><path d="M3 15.5h2.5M2.5 11.5h2.5" opacity="0.6"/>',
  horn: '<path d="M3 9.8v4.4h4l5 4V5.8l-5 4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18.2 6.4a7.6 7.6 0 0 1 0 11.2"/>',
  cinecam: '<rect x="2.5" y="9" width="12.5" height="9.5" rx="1.5"/><path d="M15 12.2l6-3v9.3l-6-3"/><circle cx="6" cy="5.6" r="2.3"/><circle cx="11.5" cy="5.6" r="2.3"/>',
  lookback: '<path d="M8 20.5V10a5 5 0 0 1 10 0v2.2"/><path d="M5 17.5l3 3 3-3"/>',
  exit: '<path d="M4 3h9.5v18H4z"/><path d="M13.5 12H21M17.8 8.6L21 12l-3.2 3.4"/>',
  swim: '<circle cx="16" cy="6.5" r="2"/><path d="M4.5 12.5l5.2-3.2 4.2 2.4M2 16.5c2 0 3-1.8 5-1.8s3 1.8 5 1.8 3-1.8 5-1.8 3 1.8 5 1.8M2 20.5c2 0 3-1.8 5-1.8s3 1.8 5 1.8 3-1.8 5-1.8 3 1.8 5 1.8"/>',
  swimfast: '<path d="M2 16.5c2 0 3-1.8 5-1.8s3 1.8 5 1.8 3-1.8 5-1.8 3 1.8 5 1.8M2 20.5c2 0 3-1.8 5-1.8s3 1.8 5 1.8 3-1.8 5-1.8 3 1.8 5 1.8M6 4l4 4-4 4M12 4l4 4-4 4"/>',
  climb: '<path d="M3 21h8.5v-8H21"/><path d="M16 9.5V2.5M12.8 5.6L16 2.5l3.2 3.1"/>',
  heliUp: '<path d="M12 3v18M7.5 7.5L12 3l4.5 4.5M7.5 16.5L12 21l4.5-4.5"/>',
  heliYaw: '<path d="M19 12a7 7 0 1 1-2.1-5"/><path d="M17.5 2.8l-.6 4.3-4.2-.9"/>',
  heliFly: '<path d="M3 6h16M11 6v3"/><path d="M5.5 13a4.5 3.5 0 0 1 9 0v1.5h-9zM14.5 12.5h6.5M20 10v4.5M6 19h8"/>',
  heliBoost: '<path d="M4 6l7 6-7 6M12 6l7 6-7 6"/>',
  heliHover: '<path d="M5 9h14M5 15h14"/><circle cx="12" cy="12" r="1.5"/>',
};
// Waar Phosphor een betekenis heeft (icons.js) gebruiken we die; de overige beelden (kijken, springen, bukken...) blijven eigen tekeningen.
const PIC_BETEKENIS = { move: 'lopen', sprint: 'rennen', shoot: 'doel', map: 'kaart', phone: 'telefoon', drive: 'stuur' };
const pic = (id) => (PIC_BETEKENIS[id] ? icoon(PIC_BETEKENIS[id], { cls: 'ctx-pic' }) : PIC[id] ? `<svg class="ctx-pic" viewBox="0 0 24 24" aria-hidden="true">${PIC[id]}</svg>` : '');

function tut(id, keys, label, desc, rare = false) {
  const pd = isPadActive() && PAD_DESC[id];
  return { id, keys, label, desc: pd ? pd(PAD_LAYOUTS[padState().family] || PAD_LAYOUTS.xbox) : desc, rare, kind: 'tut' };
}

// The same lessons in controller words (L: the layout's button names).
const PAD_DESC = {
  move: () => 'Linkerstick: lopen, indrukken: rennen',
  look: () => 'De rechterstick draait de camera om je heen',
  swim: () => 'Linkerstick: zwem de kant op die je kijkt',
  climb: (L) => `${L.a === 'cross' ? 'Kruisje' : L.a}: de kade op, ${L.y === 'triangle' ? 'driehoek' : L.y}: in een boot`,
  drive: (L) => `${L.rt} gas, ${L.lt} remmen en achteruit, linkerstick sturen`,
  handbrake: (L) => `${L.a === 'cross' ? 'Kruisje' : L.a} in een bocht = driften`,
  cinecam: () => 'D-pad omlaag: filmische shots',
  lookback: () => 'Druk de rechterstick in',
  heliUp: (L) => `${L.rt} omhoog, ${L.lt} omlaag: landen doe je laag en langzaam`,
  heliYaw: () => 'Linkerstick opzij of de rechterstick draait de neus',
  heliFly: () => 'Linkerstick: vooruit, terugtrekken remt en gaat achteruit',
  heliBoost: (L) => `${L.rb} of de linkerstick indrukken: sneller`,
  heliHover: () => 'Remt af tot je stil in de lucht hangt',
  shoot: (L) => `${L.rt} schiet waar de camera kijkt; in de auto ${L.rb}`,
  aim: (L) => `Houd ${L.lt} vast: richt vanzelf op een doelwit, ${L.rs} wisselt`,
  scope: (L) => `Houd ${L.lt} vast om in te zoomen, ${L.rt} schiet`,
  throw: (L) => `Bukken en ${L.rt} zet de bus neer. Wegwezen!`,
  weapon: (L) => `${L.lb}/${L.rb} wisselen van wapen`,
  punch: (L) => `${L.rt} om uit te halen`,
};

function contextRows(world, primary) {
  const p = hoofdspeler(world);
  const rows = [];
  // #824: tijdens de eierrit blijven de rij- en rembediening staan, ook als de
  // speler ze allang kent; de HUD noemt de limiet en waarschuwt op tijd.
  const egg = world.mission && world.mission.eggLimit ? world.mission : null;
  if (egg) {
    rows.push({ id: 'egg-speed', keys: ['W', 'S'], label: `Eierrit · max ${egg.eggLimit} km/u`, desc: 'Vol gas tot de limiet; hard remmen of stoten breekt eieren.', permanent: true, kind: 'tut' });
    rows.push({ id: 'egg-brake', keys: ['S'], label: 'Zacht remmen', desc: 'Rem vroeg en rustig; een klap kost eieren.', permanent: true, kind: 'tut' });
  }
  const armed = isRangedWeapon(world.weapon);
  if (world.trainDriving) {
    rows.push(tut('drive', ['W', 'S'], 'Tractiehendel', '{W} trekt de hendel omhoog (tractie), {S} zet hem terug en dan op Rem 1 tot 3'));
    rows.push(tut('waak', ['K'], 'Waakzaamheid', 'Druk K als de trein erom vraagt, anders remt hij vanzelf'));
    rows.push(tut('deuren', ['O'], 'Deuren', 'Open of dicht op een halte tijdens de dienst'));
    rows.push(tut('handbrake', [' '], 'Noodrem', 'Stopt sneller, maar niet meteen', true));
    rows.push(tut('horn', ['H'], 'Toeter', 'Van het spoor af!'));
    rows.push(tut('dienst', ['G'], 'Dienst rijden', 'Halte voor halte, op tijd en op de streep: {BACKSPACE} stopt'));
  } else if (p.inVehicle && p.inVehicle.isHeli) {
    rows.push(tut('heliUp', [' ', 'CTRL'], 'Omhoog & omlaag', `{SPACE} omhoog, {CTRL} omlaag: landen doe je laag en langzaam`));
    rows.push(tut('heliFly', ['W', 'S'], 'Vooruit & remmen', '{W} vooruit, {S} remt af tot je stilhangt, dan achteruit'));
    rows.push(tut('heliYaw', ['A', 'D'], 'Draaien', '{A}/{D} of {MOUSE} draait de neus'));
    rows.push(tut('heliBoost', ['SHIFT'], 'Sneller', 'Vol gas vooruit'));
    rows.push(tut('exit', ['E'], 'Uitstappen', 'Alleen als je geland bent'));
  } else if (p.inVehicle) {
    rows.push(tut('exit', ['E'], 'Uitstappen', 'Laat de bak gewoon staan'));
    if (armed) rows.push(tut('shoot', ['LMB'], 'Schieten', getSettings().autoAim !== false ? 'Vuren vanuit de auto, houd {RMB} vast om te richten' : 'Vuren vanuit de auto'));
  } else if (p.swimming) {
    if (p.canClimbOut) rows.push(tut('climb', ['SPATIE'], 'Eruit klimmen', 'Klim de kade op (E stapt in een boot)'));
  } else if (armed) {
    const w = WEAPONS[world.weapon];
    if (w.scope) rows.push(tut('scope', ['RMB'], 'Kijker', 'Houd {RMB} vast om in te zoomen, {LMB} om te schieten'));
    else rows.push(tut('aim', ['RMB'], 'Richten', getSettings().autoAim !== false ? 'Houd vast: richt vanzelf op een doelwit, {TAB} wisselt' : 'Houd vast om te richten'));
    if (world.weapon === 'carbidbus') rows.push(tut('throw', ['LMB'], 'Gooien', `Bukken ({CTRL}) en {LMB} zet de bus neer. Wegwezen!`));
    else rows.push(tut('shoot', ['LMB'], 'Schieten', 'Je schiet waar de camera kijkt'));
    rows.push(tut('weapon', ['1-4'], 'Wapen', '1 slaan, 2 pistolen, 3 geweren, 4 knallers; nog eens drukken wisselt, of {WHEEL}'));
  }
  rows.push(tut('map', ['M'], 'Kaart', 'Zet een bestemming', true));
  rows.push(tut('pause', ['ESC'], 'Telefoon', 'Bellen, berichten, te doen, kaart en instellingen', true));

  const out = [];
  for (const r of rows) {
    if (primary && primary.key === 'E' && r.keys[0] === 'E') continue;
    if (mastered(r.id) && !r.permanent) continue;
    r.fresh = learning(r.id);
    out.push(r);
    if (out.length >= MAX_ROWS) break;
  }
  return out;
}

function rowState(r) {
  return r.learn ? 'learn' : r.fresh ? 'new' : 'icon';
}

// Text only on the one row being taught; the others are key cap + pictogram.
function rowHtml(r) {
  const state = rowState(r);
  const glyphs = r.keys.map((k) => glyphHtml(k)).join('');
  const text = state !== 'learn' ? '' : '<span class="ctx-text"><b>' + esc(r.label) + '</b>' + (r.desc ? '<small>' + keyTextHtml(esc(r.desc)) + '</small>' : '') + '</span>';
  return '<span class="ctx-glyphs">' + glyphs + '</span>' + pic(r.id) + text;
}

const rowEls = new Map();

// The rows that are already up stay; a new one joins at most every ROWS_STAGGER
// seconds (not while the hints step aside), in the context's order.
function admitRows(want, dt, quiet) {
  for (const id of admitted) if (!want.some((r) => r.id === id)) admitted.delete(id);
  if (!quiet) rowGate -= dt;
  const out = [];
  for (const r of want) {
    if (!admitted.has(r.id)) {
      if (quiet || rowGate > 0) continue;
      admitted.add(r.id);
      rowGate = ROWS_STAGGER;
    }
    out.push(r);
  }
  const learn = out.find((r) => r.fresh);
  for (const r of out) r.learn = r === learn;
  return out;
}

function renderRows(world, primary, dt = 0) {
  const rows = admitRows(contextRows(world, primary), dt, hintsQuiet());
  const key = rows.map((r) => r.id + ':' + rowState(r)).join('|') + (isPadActive() ? '|pad' : '');
  if (key === rowsKey) return;
  rowsKey = key;
  const keep = new Set(rows.map((r) => r.id));
  for (const [id, el] of rowEls) {
    if (keep.has(id)) continue;
    rowEls.delete(id);
    el.classList.add('gone');
    setTimeout(() => el.remove(), 450);
  }
  let before = null;
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    let el = rowEls.get(r.id);
    const state = rowState(r);
    if (!el) {
      el = document.createElement('div');
      rowEls.set(r.id, el);
      el.dataset.id = r.id;
    }
    const dev = isPadActive() ? 'pad' : 'keys';
    if (el.dataset.state !== state || el.dataset.dev !== dev) {
      el.dataset.state = state;
      el.dataset.dev = dev;
      el.className = 'ctx-row ' + state;
      el.innerHTML = rowHtml(r);
      el.title = r.label;
    }
    if (el.nextSibling !== before || el.parentNode !== rowsEl) rowsEl.insertBefore(el, before);
    before = el;
  }
  rowsEl.classList.toggle('quiet', rows.length > 0 && !rows.some((r) => r.fresh));
}

// the key hints on screen (hudrules.js: at most two, gone after 3 uses)
export const hintCount = () => rowsEl ? rowsEl.querySelectorAll('.ctx-row:not(.gone)').length : 0;

