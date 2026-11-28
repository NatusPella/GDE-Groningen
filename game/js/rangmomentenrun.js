// Rangmomenten (R1/B1), het afspelen: elk frame kijkt dit of een aangemeld moment (rangmomenten.js) aan de beurt is en of het rustig is.
// De regels staan in rangmomenten.js (puur, getest); dit is de dunne laag met de wereld, naar het voorbeeld van careerdebutrun.js.
// Samen spelen: lokaal per speler; niets gaat over het netwerk (docs/RANGMOMENTEN.md).
import { isCinematicActive, sinceCinematic } from './cinematics.js';
import { isMissionActive } from './missions.js';
import { noticeHeldBy, noticeQueue } from './notifyqueue.js';
import { playerBusy, BUSY_ALL } from './busy.js';
import { talkActive } from './storytalk.js';
import { rangHaak } from './loopbaanlive.js';

function snapshot(w, menuOpen) {
  const druk = playerBusy(w, BUSY_ALL);
  return {
    started: document.body.classList.contains('game-started'),
    loading: !!document.getElementById('load-screen'),
    held: noticeHeldBy(),
    noticeShown: noticeQueue.shown(),
    missionActive: isMissionActive(),
    cinematicActive: isCinematicActive(),
    sinceCinematicS: sinceCinematic(),
    pigeon: !!w.pigeonMode,
    activity: druk.busy,
    sideJob: !!w.sideJob,
    respawn: !!w.pendingRespawn,
    wanted: w.wanted || 0,
    menuOpen: !!(w.uiPaused || w.devPanelOpen || w.paused || (menuOpen && menuOpen())),
    talkBusy: talkActive(),
  };
}

// main.js: naast updateCareerDebuts. `menuOpen`: staat een menu, de kaart, de telefoon of een winkel open.
export function updateRangmomenten(dt, w, menuOpen) {
  if (!w || typeof document === 'undefined' || !rangHaak.wachtrij().length) return;
  rangHaak.tik(dt, w, snapshot(w, menuOpen));
}
