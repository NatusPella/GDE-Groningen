// Haptiek van de controller (game feel, #985): pure profielen en regels, Node-safe, zonder DOM.
// gamepad.js leest de wereld elke frame in een kleine momentopname (`snap`), hapticFrame() zegt
// welke trilling er nu bij hoort (of null) en playHaptic() speelt hem af met veilige feature-detectie
// (dual-rumble, daarna hapticActuators, anders niets). Alles is lokaal per speler: er gaat niets over
// het netwerk. Uit bij 'Trillen' uit en bij 'Beweging beperken'; de sterkte-instelling schaalt alles.
// Geen allocaties per frame: hapticFrame hergebruikt een resultaatobject.

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// vaste profielen: [sterk (zware motor), zwak (lichte motor), duur in ms]; `k` (0..1) schaalt de klap
export const HAPTIC_EVENTS = {
  impact: (k) => [0.35 + 0.65 * k, 0.4 + 0.5 * k, 110 + 260 * k],
  hurt: (k) => [0.3 + 0.6 * k, 0.5 + 0.4 * k, 120 + 220 * k],
  land: (k) => [0.25 + 0.5 * k, 0.3 + 0.4 * k, 90 + 150 * k],
  shot: (k) => [0.15 + 0.35 * k, 0.5 + 0.3 * k, 55],
  melee: (k) => [0.4 + 0.4 * k, 0.3, 90],
  enter: () => [0.2, 0.45, 70],
  money: (k) => [0, 0.25 + 0.4 * k, 70 + 60 * k],
  pass: () => [0.35, 0.8, 260],
  fail: () => [0.8, 0.2, 380],
  bite: () => [0.6, 0.9, 200],
  beat: (k) => [0.25 + 0.2 * k, 0.05, 90],
};

export const STRENGTHS = [['zacht', 0.5], ['normaal', 1], ['sterk', 1.4]];

// Wat is er aan: de schakelaar, de sterkte en de bewegingsreductie.
// Geeft de factor (0 = uit) waarmee elke magnitude wordt vermenigvuldigd.
export function hapticScale({ rumble = true, rumbleStrength = 1, reduceMotion = false } = {}) {
  if (!rumble || reduceMotion) return 0;
  const s = Number(rumbleStrength);
  return Number.isFinite(s) ? clamp(s, 0, 1.5) : 1;
}

export function eventProfile(name, k = 0.5, scale = 1, out = { strong: 0, weak: 0, ms: 0 }) {
  const f = HAPTIC_EVENTS[name];
  if (!f || !(scale > 0)) { out.strong = out.weak = out.ms = 0; return out; }
  const kk = clamp(Number.isFinite(k) ? k : 0.5, 0, 1);
  const p = f(kk);
  out.strong = clamp(p[0] * scale, 0, 1);
  out.weak = clamp(p[1] * scale, 0, 1);
  out.ms = Math.round(clamp(p[2], 20, 600));
  return out;
}

// --- wachtrij voor gebeurtenissen die geen wereldveld hebben (missie, beet) ---------------------
const queue = [];
export function hapticEvent(name, k = 0.5) {
  if (HAPTIC_EVENTS[name] && queue.length < 8) queue.push(name, k);
}
export function drainHapticEvents(cb) {
  while (queue.length) { const name = queue.shift(); const k = queue.shift(); cb(name, k); }
}

// --- doorlopende trilling per frame ------------------------------------------------------------
export function makeHapticState() {
  return { hp: null, speed: null, money: null, veh: false, camFov: 0, lastImpact: null, lastMelee: null, beatT: 0, accel: 0, out: { strong: 0, weak: 0, ms: 0, name: '' } };
}

// snap: { hp, speed, kind ('car'|'bike'|'bus'|'train'|'heli'|'plane'|'boat'|''), ground, slip, money, wanted,
//         impact (world.lastImpact), melee (world.lastMeleeHit), kickFov, inVehicle }
// Geeft het (hergebruikte) uitvoerobject met name '' als er niets te voelen is.
export function hapticFrame(st, snap, dt, scale) {
  const o = st.out;
  o.strong = o.weak = o.ms = 0; o.name = '';
  if (!(scale > 0) || !snap) { st.hp = st.speed = st.money = null; return o; }
  const sp = Number.isFinite(snap.speed) ? snap.speed : null;
  // klap: de wereld meldt hem als lastImpact (botsing, landing, trein), eenmalig per object
  if (snap.impact && snap.impact !== st.lastImpact) {
    st.lastImpact = snap.impact;
    if (st.hp != null) pick(o, scale, snap.impact.landing ? 'land' : 'impact', clamp(snap.impact.strength || 0, 0, 1));
  }
  if (snap.melee && snap.melee !== st.lastMelee) { st.lastMelee = snap.melee; pick(o, scale, 'melee', 0.5); }
  // schade
  if (st.hp != null && snap.hp < st.hp - 1.5) pick(o, scale, 'hurt', clamp((st.hp - snap.hp) / 40, 0, 1));
  st.hp = snap.hp;
  // schot: de terugslag van de camera springt omhoog
  if (snap.kickFov > st.camFov + 0.05) pick(o, scale, 'shot', clamp(snap.kickFov / 1.5, 0, 1));
  st.camFov = snap.kickFov || 0;
  // geld binnen
  if (st.money != null && snap.money > st.money) pick(o, scale, 'money', clamp(Math.log10(1 + snap.money - st.money) / 3, 0, 1));
  st.money = snap.money;
  // in- of uitstappen
  const inV = !!snap.inVehicle;
  if (st.veh !== inV && st.hp != null && st.speed != null) pick(o, scale, 'enter', 0.5);
  st.veh = inV;
  // harde snelheidsverandering (frontale botsing zonder lastImpact)
  if (sp != null && st.speed != null && Math.abs(sp - st.speed) > 4.5) pick(o, scale, 'impact', clamp((Math.abs(sp - st.speed) - 4.5) / 12, 0, 1));
  // versnellen en remmen van bus en trein: een zachte, lage dreun
  if (sp != null && st.speed != null && dt > 0) {
    st.accel += (((sp - st.speed) / dt) - st.accel) * Math.min(1, dt * 6);
    if ((snap.kind === 'bus' || snap.kind === 'train') && Math.abs(st.accel) > 1.4) {
      const k = clamp((Math.abs(st.accel) - 1.4) / 4, 0, 1);
      cont(o, 0.15 + 0.25 * k, 0.05, 110, scale, 'ov');
    }
  } else st.accel = 0;
  st.speed = sp;
  if (sp != null) {
    const a = Math.abs(sp);
    // ruwe ondergrond: gras, grind, zand en sloot trillen zacht mee met de snelheid
    if ((snap.kind === 'car' || snap.kind === 'bus' || snap.kind === 'bike') && (snap.ground === 'gras' || snap.ground === 'grind' || snap.ground === 'zand' || snap.ground === 'ditch') && a > 2) {
      const k = clamp(a / 25, 0, 1);
      cont(o, 0.08 + 0.2 * k, 0.15 + 0.25 * k, 110, scale, 'ruw');
    }
    // heli en vliegtuig: motor- of rotortrilling
    if (snap.kind === 'heli' || snap.kind === 'plane') {
      const k = snap.kind === 'heli' ? 0.5 : clamp(a / 60, 0.2, 1);
      cont(o, 0.06 + 0.08 * k, 0.1 + 0.12 * k, 110, scale, 'motor');
    }
    // driften: stapelt op met de slip
    if (snap.kind === 'car' && Math.abs(snap.slip || 0) > 0.25 && a > 8) {
      const k = clamp((Math.abs(snap.slip) - 0.25) / 0.6, 0, 1);
      cont(o, 0.1 + 0.2 * k, 0.25 + 0.4 * k, 110, scale, 'drift');
    }
  }
  // politie in de buurt: een hartslag per seconde, sneller bij meer sterren
  if (snap.wanted > 0 && dt > 0) {
    st.beatT -= dt;
    if (st.beatT <= 0) {
      const w = clamp(snap.wanted, 1, 5);
      st.beatT = 1.3 - w * 0.12;
      pick(o, scale, 'beat', (w - 1) / 4);
    }
  } else st.beatT = 0;
  return o;
}

const _tmp = { strong: 0, weak: 0, ms: 0 };
function pick(o, scale, name, k) {
  const p = eventProfile(name, k, scale, _tmp);
  if (p.strong + p.weak > o.strong + o.weak) { o.strong = p.strong; o.weak = p.weak; o.ms = p.ms; o.name = name; }
}
// doorlopende bron: neemt het over als hij sterker is dan wat er al ligt (de hoogste wint, niet de som)
function cont(o, strong, weak, ms, scale, name) {
  const s = clamp(strong * scale, 0, 1), w = clamp(weak * scale, 0, 1);
  if (s + w > o.strong + o.weak) { o.strong = s; o.weak = w; o.ms = ms; o.name = name; }
}

// --- afspelen met feature-detectie ---------------------------------------------------------------
export function canRumble(pad) {
  if (!pad) return false;
  const a = pad.vibrationActuator;
  if (a && typeof a.playEffect === 'function') return true;
  const h = pad.hapticActuators;
  return !!(h && h[0] && typeof h[0].pulse === 'function');
}

// Speelt een trilling af. Geeft true als er iets is gestuurd; nooit een fout naar buiten.
export function playHaptic(pad, strong, weak, ms) {
  if (!pad || !(strong > 0 || weak > 0)) return false;
  const s = clamp(strong, 0, 1), w = clamp(weak, 0, 1);
  try {
    const a = pad.vibrationActuator;
    if (a && typeof a.playEffect === 'function') {
      const p = a.playEffect(a.type || 'dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: s, weakMagnitude: w });
      if (p && p.catch) p.catch(() => {});
      return true;
    }
    const h = pad.hapticActuators && pad.hapticActuators[0];
    if (h && typeof h.pulse === 'function') {
      const p = h.pulse(Math.max(s, w), ms);
      if (p && p.catch) p.catch(() => {});
      return true;
    }
  } catch (e) { /* niet ondersteund */ }
  return false;
}
