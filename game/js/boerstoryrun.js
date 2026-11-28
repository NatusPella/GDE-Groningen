// De akte bij de notaris (N5.2) en de schenking van hoeve Zeldenrust spelen (#1373, audit B2/B4): wacht op een rustig moment na het bezoek aan de hoeve (N5), speelt de scène
// als ondertitelpraat (storytalk.js, overslaan met Backspace of Escape) en schrijft daarna de hoeve bij (bezitlive.schenkHoeveCompleet: erf, percelen en twaalf koeien).
// De regels (wanneer, wat houdt het tegen) staan in boerstory.js en zijn getest; dit is de dunne laag met de wereld, naar het voorbeeld van storybridgerun.js.
// Samen spelen: lokaal per speler, zie boerstory.js. Er gaat niets over het net; tijdens een sessie of bij een meespeler schrijft het de hoeve stil bij.
import { mayStart } from './narrative.js';
import { storyDataReady, scene, talkLines } from './storytext.js';
import { playTalk, stopTalk } from './storytalk.js';
import { snapshot } from './storybridgerun.js';
import { BRIDGE_CALM_S } from './storybridge.js';
import { schenkHoeveCompleet } from './bezitlive.js';
import { heeftHoeve } from './boerderijlive.js';
import './farmrankscenes.js';   // meldt de rangmomenten van de boer aan (rankmoments.js)
import { schenkingStand, schenkingBlockers, schenkingBesluit, SCHENKING_FLAG, SCHENKING_SCENE, SCHENKING_REGEL, SCHENKING_REGEL_STIL } from './boerstory.js';

let calmS = 0;
let playing = false;
let keyBound = false;
let forced = false;   // de testbank: speel zonder te wachten

function afronden(w, flags, stil, overslaan = false) {
  playing = false;
  if (overslaan) stopTalk();
  const r = schenkHoeveCompleet();
  // ook bij een mislukte schenking (hij was er al) is de vlag klaar: de akte speelt nooit twee keer
  flags.add(SCHENKING_FLAG);
  if (r.ok && w && typeof w.addMessage === 'function') w.addMessage(stil ? SCHENKING_REGEL_STIL : SCHENKING_REGEL, 9);
}

function bindKeys(w, view) {
  if (keyBound || typeof window === 'undefined') return;
  keyBound = true;
  window.addEventListener('keydown', (e) => {
    if (!playing || e.repeat || (e.key !== 'Backspace' && e.key !== 'Escape')) return;
    afronden(w, view.flags, false, true);
  });
}

// main.js: naast updateStoryBridge. `view`: story.js storyBridgeView() { done, flags, currentId }.
export function updateBoerStory(dt, w, view, menuOpen) {
  if (!w || !view || typeof document === 'undefined' || playing) return;
  const stand = schenkingStand({ done: view.done, flags: view.flags, hoeve: heeftHoeve() });
  if (stand === 'nog-niet' || stand === 'klaar') { calmS = 0; return; }
  const { blockers, sessie } = schenkingBlockers(snapshot(w, view, menuOpen));
  calmS = stand === 'scene' && !blockers.length ? calmS + dt : 0;
  const lines = stand === 'scene' && storyDataReady() && scene(SCHENKING_SCENE) ? talkLines(SCHENKING_SCENE) : [];
  const besluit = schenkingBesluit({ stand, blockers, sessie, calmS: forced ? 99 : calmS, calmNodig: BRIDGE_CALM_S, mag: forced || mayStart('say'), kan: lines.length > 0 });
  if (besluit === 'markeer') { view.flags.add(SCHENKING_FLAG); return; }
  if (besluit === 'stil') { forced = false; afronden(w, view.flags, true); return; }
  if (besluit !== 'speel') return;
  forced = false;
  playing = true;
  bindKeys(w, view);
  w.addMessage('Bij de notaris in Warffum. {BACKSPACE} slaat over.', 4);
  playTalk(lines, { id: 'boer:' + SCHENKING_SCENE, delay: 1.2, onDone: () => { if (playing) afronden(w, view.flags, false); } });
}

// De testbank en de verhaaltest: speel de akte zonder te wachten (alleen via window.__boerstory).
if (typeof window !== 'undefined') {
  window.__boerstory = { play: () => { forced = true; }, state: () => ({ playing, calmS }) };
}
