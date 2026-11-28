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
import { romanceFor, romanceStage, romanceFlagFor, extraLines } from './storyromance.js';
import { enterChoice, updateChoice, closeChoice } from './stagechoice.js';

const KICKERS = { car: 'In de auto', flat: 'Thuis in Paddepoel', phone: 'Aan de telefoon' };

let calmS = 0;
let waitedS = 0;
let waitingId = null;
let playing = null;   // { id, flags }
let deathAgoS = 1e9;
let keyBound = false;
let choice = null;    // { c, st, S }: de kleine romantische keuze na de scène (storyromance.js)
let forced = null;    // voor de testbank: een scène die zonder wachten speelt

// story.js laat een lopende overgangsscène meetellen als 'say' (de opmerking van de metgezel): autopraat en contacten wachten
export const bridgeActive = () => !!playing;

const flagStore = (view) => view.flags;

export function snapshot(w, view, menuOpen) {
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
  choice = null;
}

// Na de scène een kleine keuze (alleen de toon van het moment, nooit het verloop): stagechoice.js met één ronde.
function afterTalk(b, flags) {
  const c = romanceFor(b.id);
  if (!c || c.flags.some((f) => flags.has(f))) { finish(b.id, flags); return; }
  const st = romanceStage(c);
  const S = {};
  enterChoice(S);
  choice = { c, st, S, flags, id: b.id };
}

function bindKeys() {
  if (keyBound || typeof window === 'undefined') return;
  keyBound = true;
  window.addEventListener('keydown', (e) => {
    if (!playing || choice || e.repeat) return;
    if (e.key !== 'Backspace' && e.key !== 'Escape') return;
    const { id, flags } = playing;
    stopTalk();
    finish(id, flags);
  });
}

function launchBridgeRun(w, view, b) {
  const sc = scene(b.scene);
  const lines = sc ? talkLines(b.scene) : [];
  // een eerdere romantische keuze geeft hooguit een extra regel (kleur), nooit een ander verloop
  const extra = extraLines(b.extra, view.flags).map(([who, text]) => ({ speaker: who, text, voice: null, channel: 'stem', textOnly: true }));
  if (!lines.length) { view.flags.add(bridgeFlag(b.id)); return; }
  bindKeys();
  playing = { id: b.id, flags: flagStore(view) };
  waitingId = null;
  w.addMessage(`${KICKERS[b.via] || KICKERS.car}. {BACKSPACE} slaat over.`, 4);
  playTalk([...extra, ...lines], { id: 'bridge:' + b.id, delay: 1.2, onDone: () => { if (playing && playing.id === b.id) afterTalk(b, view.flags); } });
}

// `view`: story.js storyBridgeView() { done, flags, currentId }; `menuOpen`: main.js geeft mee of een menu open staat.
export function updateStoryBridge(dt, w, view, menuOpen) {
  if (!w || !view || typeof document === 'undefined') return;
  if (w.health <= 0 || w.pendingRespawn) deathAgoS = 0; else deathAgoS += dt;
  if (choice) {
    const r = updateChoice(dt, w, choice.st, choice.S);
    if (r) {
      const { c, S, flags, id } = choice;
      closeChoice();
      flags.add(romanceFlagFor(c, S.picks && S.picks.length ? S.picks[0] : 0));
      finish(id, flags);
    }
    return;
  }
  if (playing) return;
  if (forced) {
    const b = BRIDGES.find((x) => x.id === forced);
    forced = null;
    if (b) { launchBridgeRun(w, view, b); return; }
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
  launchBridgeRun(w, view, b);
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
