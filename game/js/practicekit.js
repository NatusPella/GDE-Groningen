// Oefenronde (#201), the pure part: seven small steps for a new player, one hint
// card each, ticked off by what the player does (walk, run, map, get in, drive,
// get out, the menu). No mission, no failing, no money: it can be started from
// Hulp in the pause menu and stopped any time. practice.js feeds it the world;
// scripts/practice_test.mjs checks it. {KEY} tokens become the player's own key
// or controller button, as in hintkit.js.

export const STEPS = [
  { id: 'lopen', title: 'Lopen', body: 'Loop een stukje met {WASD}. Kijk om je heen met de muis of de rechterstick.', need: { walk: 8 } },
  { id: 'rennen', title: 'Rennen', body: 'Houd {SHIFT} ingedrukt terwijl je loopt om te rennen.', need: { sprint: 1.5 } },
  { id: 'kaart', title: 'De kaart', body: 'Open de kaart met {M}. Daar kies je zelf waar je heen wilt; sluit hem weer met {M}.', need: { map: 1 } },
  { id: 'instappen', title: 'Instappen', body: 'Loop naar een fiets of auto en stap in met {E}.', need: { enter: 1 } },
  { id: 'rijden', title: 'Rijden', body: 'Rijd een stukje met {WASD}. Rem op tijd en let op het verkeer.', need: { drive: 40 } },
  { id: 'uitstappen', title: 'Uitstappen', body: 'Stap weer uit met {E}.', need: { exit: 1 } },
  { id: 'menu', title: 'Het menu', body: 'Open het menu met {ESC}. Onder Verhaal en Activiteiten staat alles wat nog openstaat.', need: { menu: 1 } },
];
export const DONE = { title: 'Oefenronde klaar', body: 'Dat was het. Onder {ESC} › Instellingen › Besturing › Hulp staat alles nog een keer, en je kunt de oefenronde daar opnieuw doen.' };

export function startPractice() {
  return { i: 0, prog: {}, done: false, was: { veh: false, map: false, menu: false } };
}

export const currentStep = (st) => (st && !st.done ? STEPS[st.i] : null);

// obs: { dist (m moved this frame), dt (s), inVehicle, sprinting, mapOpen, menuOpen }
// Returns { st, advanced } where advanced is the step just finished (or null).
export function stepPractice(st, obs) {
  if (!st || st.done) return { st, advanced: null };
  const was = st.was;
  const edge = (now, prev) => (now && !prev ? 1 : 0);
  const p = { ...st.prog };
  const add = (k, n) => { if (n) p[k] = (p[k] || 0) + n; };
  if (!obs.inVehicle) {
    add('walk', obs.dist || 0);
    if (obs.sprinting && (obs.dist || 0) > 0) add('sprint', obs.dt || 0);
  } else add('drive', obs.dist || 0);
  add('enter', edge(obs.inVehicle, was.veh));
  add('exit', edge(!obs.inVehicle, !was.veh) && was.veh ? 1 : 0);
  add('map', edge(obs.mapOpen, was.map));
  add('menu', edge(obs.menuOpen, was.menu));
  const next = { ...st, prog: p, was: { veh: !!obs.inVehicle, map: !!obs.mapOpen, menu: !!obs.menuOpen } };
  const step = STEPS[st.i];
  if (Object.entries(step.need).every(([k, n]) => (p[k] || 0) >= n)) {
    next.i = st.i + 1;
    next.prog = {};
    if (next.i >= STEPS.length) next.done = true;
    return { st: next, advanced: step };
  }
  return { st: next, advanced: null };
}
