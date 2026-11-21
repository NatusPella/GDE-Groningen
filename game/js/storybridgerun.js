// Overgangsscènes spelen (#1125): wacht op een rustig moment en speelt dan de scène die aan de beurt is als ondertitelpraat
// (storytalk.js playTalk), met een regel erboven die zegt waar en wanneer. Overslaan met Backspace of Escape.
// De regels (welke scène, wanneer) staan in storybridge.js, getest door scripts/storybridge_test.mjs; dit is de dunne
// laag met de wereld. Wat dit nooit doet: voortgang schrijven (alleen de vlag `bridge:<id>` dat hij gezien is), iets
// over het net sturen of de speler verplaatsen. Samen spelen: lokaal, zie storybridge.js.
import { isCinematicActive, sinceCinematic } from './cinematics.js';
import { mayStart } from './narrative.js';
import { storyDataReady, scene, talkLines } from './storytext.js';
import { playTalk, stopTalk } from './storytalk.js';
import { hoofdspeler } from './players.js';
import { isMissionActive } from './missions.js';
import { isRecapOpen } from './recapstate.js';
import { BRIDGES } from './storyarc.js';
import { AUTOPLAY, STORY_TEST } from './devflags.js';
import { bridgeDue, bridgeFlag, bridgeBlockers, bridgeDecide } from './storybridge.js';

const KICKERS = { car: 'In de auto', flat: 'Thuis in Paddepoel', phone: 'Aan de telefoon' };

let calmS = 0;
let waitedS = 0;
let waitingId = null;
let playing = null;   // { id, flags }
let deathAgoS = 1e9;
let keyBound = false;
let forced = null;    // voor de testbank: een scène die zonder wachten speelt

// story.js laat een lopende overgangsscène meetellen als 'say' (de opmerking van de metgezel): autopraat en contacten wachten
export const bridgeActive = () => !!playing;

const flagStore = (view) => view.flags;

function snapshot(w, view, menuOpen) {
  const p = hoofdspeler(w);
  const step = view.currentId ? { id: view.currentId } : null;
  return {
    started: document.body.classList.contains('game-started'),
    loading: !!document.getElementById('load-screen'),
    client: w.coopRole === 'client',
    session: !!(w.coopNet && !w.coopSolo),
    openingDue: view.currentId === 'M00',
    missionActive: isMissionActive(),
    cinematicActive: isCinematicActive(),
    sinceCinematicS: sinceCinematic(),
    pigeon: !!w.pigeonMode,
    activity: !!w.activityGame,
    respawn: !!w.pendingRespawn,
    wanted: w.wanted || 0,
    sinceDeathS: deathAgoS,
    menuOpen: !!(w.uiPaused || w.devPanelOpen || w.paused || (menuOpen && menuOpen())),
    recapOpen: isRecapOpen(),
    dataReady: storyDataReady(),
    inVehicle: !!(p && p.inVehicle),
    step,
  };
}

function finish(id, flags) {
  flags.add(bridgeFlag(id));
  playing = null;
}

function bindKeys() {
  if (keyBound || typeof window === 'undefined') return;
  keyBound = true;
  window.addEventListener('keydown', (e) => {
    if (!playing || e.repeat) return;
    if (e.key !== 'Backspace' && e.key !== 'Escape') return;
    const { id, flags } = playing;
    stopTalk();
    finish(id, flags);
  });
}

function start(w, view, b) {
  const sc = scene(b.scene);
  const lines = sc ? talkLines(b.scene) : [];
  if (!lines.length) { view.flags.add(bridgeFlag(b.id)); return; }
  bindKeys();
  playing = { id: b.id, flags: flagStore(view) };
  waitingId = null;
  w.addMessage(`${KICKERS[b.via] || KICKERS.car}. Backspace slaat over.`, 4);
  playTalk(lines, { id: 'bridge:' + b.id, delay: 1.2, onDone: () => { if (playing && playing.id === b.id) finish(b.id, view.flags); } });
}

// `view`: story.js storyBridgeView() { done, flags, currentId }; `menuOpen`: main.js geeft mee of een menu open staat.
export function updateStoryBridge(dt, w, view, menuOpen) {
  if (!w || !view || typeof document === 'undefined') return;
  if (w.health <= 0 || w.pendingRespawn) deathAgoS = 0; else deathAgoS += dt;
  if (playing) return;
  if (forced) {
    const b = BRIDGES.find((x) => x.id === forced);
    forced = null;
    if (b) { start(w, view, b); return; }
  }
  if ((AUTOPLAY || STORY_TEST) && !window.__bridgesOn) return;
  const b = bridgeDue({ done: view.done, flags: view.flags, currentId: view.currentId });
  if (!b) { waitingId = null; calmS = 0; waitedS = 0; return; }
  if (waitingId !== b.id) { waitingId = b.id; calmS = 0; waitedS = 0; }
  const snap = snapshot(w, view, menuOpen);
  const blockers = bridgeBlockers(snap);
  calmS = blockers.length ? 0 : calmS + dt;
  waitedS += dt;
  const decision = bridgeDecide({ via: b.via, blockers, calmS, waitedS, inVehicle: snap.inVehicle });
  if (decision !== 'speel' || !mayStart('say')) return;
  start(w, view, b);
}

// De testbank en de verhaaltest: speel een scène zonder te wachten (alleen via window.__storybridge).
if (typeof window !== 'undefined') {
  window.__storybridge = {
    due: (view) => bridgeDue(view),
    play: (id) => { forced = id; },
    state: () => ({ playing: playing && playing.id, waiting: waitingId, calmS }),
    enable: () => { window.__bridgesOn = true; },
  };
}
