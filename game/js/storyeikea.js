// k-eikea (storyarc.js): furnishing the new flat. Drive a car to EIKEA Grunn
// at the Sontweg; at the loading dock a short scene (the list, the cupboard
// that will not fit in the lift, who gets which room) and three boxes go on
// the roof (v.roofBoxes, drawn by scene3d.js). A hard knock on the way home
// costs a box: the lamp first, then the bookcase, the beds last. Unloaded at
// the garage, the boxes are carried up (furniture.js grantFurniture: free,
// they come with the next visit to the flat); upstairs the assembly scene
// plays and the step is done. Skipping the step hands out all three.
//
// story.js merges EIKEA_GOALS into its goal types and calls updateStoryEikea
// every frame with the step's goal state (base). Debug: window.__storyEikea.

import { getShopsForRender } from './shops.js';
import { playCastScene } from './missionstory.js';
import { playCinematic, isCinematicActive } from './cinematics.js';
import { playScript } from './cutscenehost.js';
import { flatScene } from './cutscenes.js';
import { isMissionActive } from './missionquery.js';
import { inHomeFlat, getHomeForRender, flatStage } from './home.js';
import { grantFurniture } from './furniture.js';
import { lineVoiceFor } from './linevoice.js';
import { SPEAKERS } from './storyarc.js';

const DOCK_R = 32;
const HOME_R = 45;
const STILL = 1.5;
const KNOCK = 0.45;
const KNOCK_GAP = 1.2;
const UPSTAIRS_WAIT = 2;
// unloaded in this order of loss: the lamp falls off first, the beds last
const BOXES = ['bed', 'kast', 'lamp'];
const LOST = {
  lamp: 'Klonk. Lichtje Tjoek ligt op straat. Die is nu van Grunn',
  kast: 'Daar gaat de Buukenkaas. 238 schroefjes over het asfalt',
  bed: 'De bedden! Vanavond weer het luchtbed',
};

let world = null;

const carries = (v) => !!v && !v.isBoat && !v.isHeli && !v.isBike && !v.isScooter && !v.wrecked && !v.sinking;
const eikeaShop = () => getShopsForRender().find((s) => s.type === 'eikea') || null;
const homeSpot = () => getHomeForRender()[0] || null;

export const EIKEA_GOALS = {
  eikea: {
    begin: (st, b) => { b.phase = 'go'; b.boxes = []; },
    met: (st, b) => b.phase === 'done',
    place: (st, b) => {
      const s = b && b.phase && b.phase !== 'go' ? homeSpot() : eikeaShop();
      return s ? { x: s.x, y: s.y, name: b && b.phase === 'carry' ? 'Dozen naar huis' : b && b.phase === 'home' ? 'Naar boven, in elkaar zetten' : 'EIKEA Grunn' } : null;
    },
  },
};

function timed(lines) {
  let at = 2.2;
  return lines.map(([k, text]) => {
    const speaker = SPEAKERS[k] || k;
    const v = lineVoiceFor(speaker, text);
    const dur = Math.max(v ? v.dur + 0.3 : 0, 1.6, Math.min(5, 0.8 + text.length * 0.055));
    const l = { speaker, text, at, dur };
    at += dur + 0.25;
    return l;
  });
}

function load(w, st, b, v) {
  b.phase = 'carry';
  b.v = v;
  b.boxes = BOXES.slice();
  b.hitAt = -Infinity;
  b.lastHit = w.lastImpact || null;
  v.roofBoxes = b.boxes.length;
  w.addMessage('Drie dozen op het dak. Rij rustig.', 6, { kind: 'missie', key: 'story-eikea' });
}

function knock(w, b) {
  const box = b.boxes.pop();
  if (b.v) b.v.roofBoxes = b.boxes.length;
  w.addMessage(LOST[box] + (b.boxes.length ? '' : '. Het dak is leeg'), 4, { kind: 'tip' });
}

function unload(w, b) {
  const got = grantFurniture(b.boxes);
  if (b.v) b.v.roofBoxes = 0;
  b.v = null;
  b.phase = 'home';
  b.since = -1;
  w.addMessage(got.length ? `Dozen uitgeladen. Met de lift naar boven: in elkaar zetten` : 'Geen dozen meer op het dak. Ga toch even naar boven: het luchtbed wacht', 5, { kind: 'missie', key: 'story-eikea' });
}

function updateGo(w, st, b) {
  const s = eikeaShop();
  const p = w.player;
  if (!s || Math.hypot(p.x - s.x, p.y - s.y) > DOCK_R || isCinematicActive() || isMissionActive() || w.pigeonMode) return;
  const v = p.inVehicle;
  if (!carries(v)) {
    if (!b.hinted) { b.hinted = true; w.addMessage(v ? 'Daar gaan geen dozen op. Haal een auto, de Escapade of een busje' : 'Lopend? Dan sjouw je drie dozen naar Paddepoel. Haal een auto, de Escapade of een busje', 5, { kind: 'tip' }); }
    return;
  }
  if (Math.abs(v.speed || 0) > STILL) return;
  const sc = st.dock;
  const ok = sc && playCastScene(w, { at: { x: p.x, y: p.y }, lookTo: { x: s.x, y: s.y }, lines: sc.lines, kicker: sc.kicker || '' });
  load(w, st, b, v);
  if (ok) b.docked = true;
}

function updateCarry(w, st, b) {
  const v = b.v;
  const p = w.player;
  if (!v || v.wrecked || v.sinking || !w.vehicles.includes(v)) {
    if (b.boxes.length) w.addMessage('De auto met de dozen is weg. EIKEA heeft vast nog meer', 4, { kind: 'tip' });
    b.boxes = [];
    unloadLater(w, b);
    return;
  }
  const hit = w.lastImpact;
  if (hit && hit !== b.lastHit && p.inVehicle === v && hit.strength >= KNOCK && w.time - b.hitAt > KNOCK_GAP && b.boxes.length) {
    b.lastHit = hit;
    b.hitAt = w.time;
    knock(w, b);
  }
  const h = homeSpot();
  if (h && Math.hypot(v.x - h.x, v.y - h.y) < HOME_R && Math.abs(v.speed || 0) < STILL) unload(w, b);
}

// lost the car on the way: home is still where the step ends
function unloadLater(w, b) {
  b.v = null;
  b.phase = 'home';
  b.since = -1;
}

function updateHome(w, st, b) {
  if (!inHomeFlat() || isCinematicActive() || w.pigeonMode) { b.since = -1; return; }
  if (b.since < 0) b.since = w.time;
  if (w.time - b.since < UPSTAIRS_WAIT) return;
  const sc = st.homeScene;
  const lines = timed((sc && sc.lines) || []);
  b.phase = 'assembling';
  const done = () => { b.phase = 'done'; };
  const cine = {
    id: 'story-eikea', priority: 2, duration: lines.length ? lines[lines.length - 1].at + lines[lines.length - 1].dur + 0.4 : 0, pause: true, letterbox: true, skippable: true, hideHud: true,
    big: (sc && sc.big) || '', lines, onEnd: done,
  };
  // staged in the flat (cutscenes.js flatScene), the plain scene as the fallback
  const pl = w.player;
  const stage = flatStage();
  const ok = lines.length && ((lines.length > 2 && playScript(w, flatScene('eikea', lines), {
    lines, duration: cine.duration, anchor: stage ? stage.anchor : { x: pl.x, y: pl.y, facing: pl.angle || 0, z: pl.gz || 0 }, env: stage ? stage.env : null, cine,
  })) || playCinematic(cine));
  if (!ok) done();
}

// story.js, every frame: step is the current step (or { end }), base its goal state.
export function updateStoryEikea(dt, w, step, base) {
  world = w;
  if (!step || step.end || !step.goal || step.goal.type !== 'eikea' || !base || !base.phase) return;
  if (base.phase === 'go') updateGo(w, step, base);
  else if (base.phase === 'carry') updateCarry(w, step, base);
  else if (base.phase === 'home') updateHome(w, step, base);
}

// Skipping the step (story.js applyWaive): the furniture anyway.
export function waiveEikea() {
  return grantFurniture(BOXES);
}

export function initStoryEikea(w, base) {
  world = w;
  window.__storyEikea = {
    state: () => { const b = base(); return b ? { phase: b.phase, boxes: [...(b.boxes || [])], docked: !!b.docked, roof: b.v ? b.v.roofBoxes : null } : null; },
    shop: () => eikeaShop(),
    home: () => homeSpot(),
  };
}
