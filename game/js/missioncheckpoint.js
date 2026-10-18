// Checkpoints binnen een missie, grace bij het verlaten van het missievoertuig en het
// Opnieuw-aanbod na falen (#213, #214). Pure regels, geen THREE, geen wereld: missions.js
// geeft de stand en past de uitkomst toe. Scripts/missioncheckpoint_test.mjs test ze.
//
// Checkpoint: een momentopname bij het begin van een stage die na een rustpunt komt. Bij
// falen begint de volgende poging bij die stage, met de resterende tijd, de voortgang
// (eieren, klokstand) en het missievoertuig op de plek waar het toen stond.

// Na deze stages is de speler even op adem; de stage erna is een goed hervatpunt.
export const CHECKPOINT_KINDS = ['scene', 'board', 'hold', 'bake'];

// Stages waarvan de eigen toestand (planscherm, keuze, menu's) niet opnieuw op te bouwen is.
const NEVER = ['plan', 'choice'];

// Mag een nieuwe poging bij stage k beginnen? `checkpoint: true` op de stage forceert het,
// `checkpoint: false` verbiedt het; `def.checkpoints === false` zet het voor de missie uit.
// Inbraakmissies (def.heist) bewaren alleen op een stage die het zelf vraagt, want hun
// deuren, lampen en bewakers zijn eigen toestand.
export function isCheckpointStage(def, k) {
  if (!def || !def.stages || def.checkpoints === false) return false;
  const st = def.stages[k];
  if (!st || k <= 0) return false;
  if (st.checkpoint === false) return false;
  if (NEVER.includes(st.kind)) return false;
  if (st.checkpoint === true) return true;
  if (def.heist) return false;
  const prev = def.stages[k - 1];
  return !!prev && CHECKPOINT_KINDS.includes(prev.kind);
}

// De velden van de missiestand (chain) die een hervatting terugzet.
const PROGRESS_KEYS = ['eggs', 'eggWarn', 'clockRate', 'windowT', 'windowExtended', 'hijacked', 'stopIndex'];

// snap: { missionIndex, stageIndex, timeLeft, chain, player: {x, y, angle}, vehicle: {x, y, angle, inside} | null }
export function makeCheckpoint(snap) {
  const progress = {};
  for (const key of PROGRESS_KEYS) if (snap.chain && snap.chain[key] !== undefined) progress[key] = snap.chain[key];
  return {
    missionIndex: snap.missionIndex,
    stageIndex: snap.stageIndex,
    timeLeft: Number.isFinite(snap.timeLeft) ? snap.timeLeft : null,
    progress,
    player: snap.player ? { x: snap.player.x, y: snap.player.y, angle: snap.player.angle || 0 } : null,
    vehicle: snap.vehicle ? { x: snap.vehicle.x, y: snap.vehicle.y, angle: snap.vehicle.angle || 0, inside: !!snap.vehicle.inside } : null,
  };
}

// Zet de bewaarde voortgang terug op de missiestand. Tijd: minstens `minTime` seconden over,
// zodat een checkpoint vlak voor de klok nul nooit meteen weer faalt.
export function applyCheckpointProgress(cp, chain, minTime = 45) {
  Object.assign(chain, cp.progress);
  if (cp.timeLeft != null && Number.isFinite(chain.timeLeft)) chain.timeLeft = Math.max(cp.timeLeft, minTime);
  return chain;
}

// Eén checkpoint per missie; de nieuwste wint, maar nooit een eerdere dan de bewaarde.
export function recordCheckpoint(store, cp) {
  const old = store.get(cp.missionIndex);
  if (old && old.stageIndex > cp.stageIndex) return false;
  store.set(cp.missionIndex, cp);
  return true;
}

// --- grace bij het verlaten van het missievoertuig -------------------------------------------

export const GRACE_S = 25;

export const createGrace = () => ({ left: GRACE_S, active: false, warned: false });

// status: 'near' (in of bij het voertuig), 'away' (verder dan de afstandsgrens), 'gone'
// (kapot of weg: geen grace). Geeft { state: 'ok'|'grace'|'fail', left }.
export function stepGrace(g, dt, status) {
  if (status === 'gone') return { state: 'fail', left: 0 };
  if (status === 'near') { g.active = false; g.left = GRACE_S; g.warned = false; return { state: 'ok', left: GRACE_S }; }
  g.active = true;
  g.left = Math.max(0, g.left - dt);
  return { state: g.left <= 0 ? 'fail' : 'grace', left: g.left };
}

// --- Opnieuw-aanbod na falen -----------------------------------------------------------------

export const RETRY_OFFER_S = 40;

export const createRetryOffer = (missionIndex, now) => ({ missionIndex, until: now + RETRY_OFFER_S, done: false });

export const retryOfferLive = (o, now) => !!o && !o.done && now < o.until;

// Wat de speler kan indrukken: Enter, of E (gamepad en touch sturen E).
export const RETRY_KEYS = ['enter', 'e'];
