// De levende kant van de OV-/taxihint (#1091): leest de wereld, houdt de stand per apparaat bij (gde-ovhint-v1) en toont de
// hint als kaart met de naam van het andere personage. De regels staan in ovhint.js (getest), de zinnen in ovhintlines.js.
// Vervangt het keuzescherm met 1, 2 en 3 bij een reisstap (storytravel.js, reispanel.js): niets blokkeert, niets hoeft te worden gekozen.
import { hoofdspeler } from './players.js';
import { showCard, cardsBusy } from './hudcards.js';
import { mayStart } from './narrative.js';
import { isCinematicActive } from './cinematics.js';
import { isPauseMenuOpen, isPhoneOpen, isMapOpen } from './pausestate.js';
import { getSettings } from './settings.js';
import { physicalKey, keyName, tokenKey } from './controls.js';
import { glyphHtml } from './prompts.js';
import { KEYS } from './storagekeys.js';
import { playerBusy } from './busy.js';
import { getGoal } from './goal.js';
import { getBusLines } from './vehicle.js';
import { dichtsteHalte } from './ovmissie.js';
import { readState, state2json, noteGebruikt, beslis, gaToond, verseSessie, sprekerVoor, hintDoel, HALTE_NABIJ_M } from './ovhint.js';
import { STEP_BY_ID } from './storyarc.js';
import { escapeHtml as escHtml } from './htmlescape.js';

const KEY_TOKEN = /\{(\w+)\}/g;
const plainKeys = (t) => t.replace(KEY_TOKEN, (m, k) => keyName(physicalKey(getSettings().keyBinds || {}, tokenKey(k))));
const htmlKeys = (t) => t.split(KEY_TOKEN).map((part, i) => (i % 2 ? glyphHtml(part) : escHtml(part))).join('');

const CHECK_EVERY_S = 2;     // de beslissing hoeft niet elk frame
const DUUR_S = 8;

let state = null;
let sessie = verseSessie();
let acc = 0;

const laad = () => {
  if (state) return state;
  try { state = readState(localStorage.getItem(KEYS.ovHint)); } catch (e) { state = readState(null); }
  return state;
};
const bewaar = () => { try { localStorage.setItem(KEYS.ovHint, state2json(state)); } catch (e) { /* alleen geheugen */ } };

// reisrit.js: de speler pakte een taxi, bus of trein (kaart of verhaal): de hint hoeft dan niet meer of even niet.
export function noteOvGebruikt() {
  laad();
  state = noteGebruikt(state, Date.now());
  bewaar();
}

function transportOf(w, p) {
  if (w.trainDriving) return 'trein';
  const v = p.inVehicle;
  if (!v) return 'voet';
  if (v.isBus) return 'bus';
  if (v.isBoat) return 'boot';
  if (v.isHeli || v.isPlane) return 'lucht';
  return 'auto';
}

function bezetVan(w) {
  const b = playerBusy(w, ['sideJob', 'challenge', 'race', 'padel', 'activityGame', 'heliRun', 'pigeon', 'train', 'respawn', 'missionPhase', 'mission', 'activity', 'activeRace']);
  const why = b.why;
  return {
    pauze: !!(w.paused || isPauseMenuOpen()),
    dood: !!(w.health <= 0 || w.pendingRespawn),
    cinematic: !!isCinematicActive(),
    verhaal: !!(w.storyContact || w.cameraOverride),
    missie: why === 'mission' || why === 'missionPhase',
    bijbaan: why === 'sideJob',
    minigame: !!why && why !== 'mission' && why !== 'missionPhase' && why !== 'sideJob',
    race: false,
    achtervolging: (w.wanted || 0) > 0,
    gevecht: false,
    telefoon: !!isPhoneOpen(),
    paneel: cardsBusy() || !mayStart('card'),
    kaart: !!isMapOpen(),
  };
}

// per frame vanuit story.js (alleen wie het spel opende; een gast draait dit niet en kan ook niet reizen).
export function tickOvHint(w, dt) {
  if (!w || typeof document === 'undefined' || !document.body.classList.contains('game-started')) return;
  acc += dt;
  if (acc < CHECK_EVERY_S) return;
  acc = 0;
  const sg = w.storyGuide, stap = sg && STEP_BY_ID.get(sg.step);
  const goal = hintDoel(getGoal(), sg, stap ? stap.kind : '', !!w.storyFreePlay); // ook de start van de volgende verhaalmissie
  if (!goal) return;
  const p = hoofdspeler(w);
  if (!p) return;
  laad();
  const lines = getBusLines();
  const i = {
    goal: { x: goal.x, y: goal.y }, speler: { x: p.x, y: p.y }, nu: w.time, nuMs: Date.now(),
    aan: getSettings().onboardingTips !== false,
    rol: w.coopRole === 'client' ? 'gast' : w.coopRole === 'host' ? 'host' : null,
    vervoer: transportOf(w, p),
    halteNabij: !!(lines && lines.length && !p.inVehicle && dichtsteHalte(lines, p.x, p.y, HALTE_NABIJ_M)),
    geld: w.money,
    bezet: bezetVan(w),
  };
  const b = beslis(i, state, sessie);
  if (!b) return;
  const wie = sprekerVoor(p.character);
  showCard(w, { kind: 'tip', kicker: wie, title: '', body: plainKeys(b.regel.tekst), bodyHtml: htmlKeys(b.regel.tekst), say: b.regel.say, key: 'ovhint-' + b.regel.id, duration: DUUR_S });
  state = gaToond(state, sessie, b, w.time);
  bewaar();
}

function resetOvHint() { sessie = verseSessie(); state = null; acc = 0; }
if (typeof window !== 'undefined') window.__ovHint = { stand: () => ({ ...laad() }), reset: resetOvHint };
