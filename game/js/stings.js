// Korte geluidjes (stings) bij de afteller, de finish, de uitslag, Meedoen?, het vertrek van de trein en een halte.
// Alles procedureel: noten als data (MIDI-nootnummers, duur, golfvorm), geen opname en geen AI-muziek. De WebAudio-uitvoering
// staat naast de andere procedurele geluiden in audio.js (playSting); dit bestand is puur, zodat Node het kan testen en renderen
// (scripts/stings_test.mjs, scripts/audio/render_previews.mjs). Alle melodieën zijn verzonnen.

export const STING_MIN_S = 2;
export const STING_MAX_S = 4;
export const NOOT_MIN = 40;   // MIDI-nootnummer (E2), ruim onder de laagste noot
export const NOOT_MAX = 112;  // ruim onder de bovengrens van de pieptonen
export const COOLDOWN_S = 0.6; // stilte na een sting voordat een gelijke of lagere prioriteit weer mag
export const MAX_STIL_S = 1.0; // langste gat tussen twee noten binnen één sting

export const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// n(t, midi, duur, gain, golf, extra): één noot. extra: { to: eindnoot (glijdt), lp: laagdoorlaat in Hz }
const n = (t, m, d, g, w = 'sine', x = null) => ({ t, m, d, g, w, ...(x || null) });
// een glockenspielslag: de grondtoon en een kort bovenpartiaal (ongeveer een duodecime hoger)
const bel = (t, m, d, g) => [n(t, m, d, g, 'sine'), n(t, m + 19, d * 0.35, g * 0.35, 'sine')];

export const STINGS = {
  // drie stijgende pieptonen op 0, 1 en 2 s (de startlichten van de kartbaan) en een felle 'go' op 3 s
  kart_countdown: {
    prio: 5,
    noten: [
      n(0, 72, 0.3, 0.07, 'square', { lp: 2600 }),
      n(1, 76, 0.3, 0.07, 'square', { lp: 2600 }),
      n(2, 79, 0.3, 0.07, 'square', { lp: 2600 }),
      n(3, 84, 0.7, 0.085, 'square', { to: 86, lp: 3600 }),
      n(3, 88, 0.7, 0.06, 'square', { to: 90, lp: 3600 }),
      n(3, 91, 0.7, 0.05, 'sawtooth', { lp: 3600 }),
      n(3, 60, 0.35, 0.09, 'triangle'),
    ],
  },
  // een korte fanfare: ta-ta-ta-taaa en een volle slotklank
  kart_finish: {
    prio: 5,
    noten: [
      n(0, 72, 0.13, 0.08, 'square', { lp: 2800 }),
      n(0.15, 72, 0.13, 0.08, 'square', { lp: 2800 }),
      n(0.3, 72, 0.13, 0.08, 'square', { lp: 2800 }),
      n(0.45, 76, 0.45, 0.09, 'square', { lp: 2800 }),
      n(0.45, 64, 0.45, 0.06, 'triangle'),
      n(1.0, 72, 1.3, 0.06, 'square', { lp: 2600 }),
      n(1.0, 76, 1.3, 0.055, 'square', { lp: 2600 }),
      n(1.0, 79, 1.3, 0.055, 'square', { lp: 2600 }),
      n(1.0, 84, 1.3, 0.05, 'triangle'),
      n(1.0, 60, 1.3, 0.08, 'triangle'),
    ],
  },
  // vrolijk glockenspiel: omhoog in kleine stapjes en een lange slottoon
  winnaar: {
    prio: 6,
    noten: [
      ...bel(0, 76, 0.7, 0.1), ...bel(0.22, 79, 0.7, 0.1), ...bel(0.44, 83, 0.7, 0.1), ...bel(0.66, 88, 0.9, 0.1),
      ...bel(1.2, 86, 0.6, 0.09), ...bel(1.42, 88, 0.6, 0.09), ...bel(1.64, 91, 1.6, 0.11),
      n(1.64, 79, 1.4, 0.04, 'sine'),
    ],
  },
  // komisch dalend: wah, wah, wah, waaaah, zoals een slappe trombone
  verliezer: {
    prio: 6,
    noten: [
      n(0, 58, 0.4, 0.12, 'sawtooth', { to: 57, lp: 900 }),
      n(0.5, 57, 0.4, 0.12, 'sawtooth', { to: 56, lp: 850 }),
      n(1.0, 56, 0.4, 0.12, 'sawtooth', { to: 55, lp: 800 }),
      n(1.5, 55, 1.4, 0.13, 'sawtooth', { to: 46, lp: 700 }),
    ],
  },
  // de uitnodiging Meedoen?: twee zachte stijgende tonen met een lange nagalm
  meedoen: {
    prio: 4,
    noten: [
      n(0, 72, 1.0, 0.07, 'sine'), n(0, 84, 0.5, 0.02, 'sine'),
      n(0.5, 79, 1.7, 0.07, 'sine'), n(0.5, 91, 0.8, 0.02, 'sine'),
    ],
  },
  // een korte welkom-ping: twee heldere tikken en een lange uitklinker
  speler_sluit_aan: {
    prio: 2,
    noten: [
      n(0, 88, 0.5, 0.07, 'sine'), n(0, 100, 0.2, 0.02, 'sine'),
      n(0.14, 93, 1.9, 0.07, 'sine'), n(0.14, 105, 0.5, 0.02, 'sine'),
    ],
  },
  // twee heldere belletjes en een fluitje
  trein_vertrek: {
    prio: 4,
    noten: [
      ...bel(0, 84, 0.8, 0.09), ...bel(0.5, 84, 0.9, 0.09),
      n(1.4, 90, 0.35, 0.05, 'sine', { to: 93 }),
      n(1.4, 91, 0.35, 0.025, 'triangle', { to: 94 }),
      n(1.8, 93, 0.9, 0.05, 'sine', { to: 91 }),
      n(1.8, 94, 0.9, 0.025, 'triangle', { to: 92 }),
    ],
  },
  // drie zachte dalende tonen (ook voor de bus)
  halte: {
    prio: 3,
    noten: [
      n(0, 79, 1.0, 0.07, 'triangle', { lp: 2400 }),
      n(0.55, 76, 1.0, 0.07, 'triangle', { lp: 2400 }),
      n(1.1, 72, 1.5, 0.07, 'triangle', { lp: 2400 }),
    ],
  },
};

export const STING_KEYS = Object.keys(STINGS);

// de duur: het einde van de laatste noot
export function stingDuur(key) {
  const s = STINGS[key];
  return s ? Math.max(...s.noten.map((x) => x.t + x.d)) : 0;
}

// Een noot als uit te voeren tonen (Hz in plaats van MIDI), voor audio.js en de renderer.
export function stingNoten(key) {
  const s = STINGS[key];
  if (!s) return [];
  return s.noten.map((x) => ({ freq: midiHz(x.m), ...(x.to !== undefined ? { freqEnd: midiHz(x.to) } : null), type: x.w, duration: x.d, gain: x.g, delay: x.t, ...(x.lp ? { filterFreq: x.lp } : null) }));
}

// Nooit twee stings tegelijk: het hoogste prioriteit wint (en breekt een lopende af), daarna een korte afkoeling.
// request(key, now) -> { ok, afbreken }: afbreken is true als een lopende sting moet stoppen.
export function createStingGate({ cooldown = COOLDOWN_S } = {}) {
  let prio = 0, tot = -Infinity, sleutel = null;
  return {
    request(key, now) {
      const s = STINGS[key];
      if (!s || !Number.isFinite(now)) return { ok: false, afbreken: false };
      const speelt = now < tot;
      if (speelt && s.prio <= prio) return { ok: false, afbreken: false };
      if (!speelt && now < tot + cooldown && s.prio <= prio) return { ok: false, afbreken: false };
      sleutel = key; prio = s.prio; tot = now + stingDuur(key);
      return { ok: true, afbreken: speelt };
    },
    actief(now) { return now < tot ? sleutel : null; },
    tot() { return tot; },
    reset() { prio = 0; tot = -Infinity; sleutel = null; },
  };
}

// De uitslag voor jezelf: 'winnaar' (jij of jouw team won), 'verliezer', of null (je deed niet mee of reed niet uit).
// rijen: [{ plek, fin, team? }] gesorteerd op plek; jij: { plek, fin, weg, team? } of null.
export function uitslagUitkomst(rijen, jij) {
  if (!jij || jij.weg || !Array.isArray(rijen) || !rijen.length) return null;
  if (jij.team != null && rijen.some((x) => x.team != null)) {
    const eerste = rijen.find((x) => x.plek === 1) || rijen[0];
    return eerste.team === jij.team ? 'winnaar' : 'verliezer';
  }
  return jij.plek === 1 && jij.fin ? 'winnaar' : 'verliezer';
}

// Verbindt er een speler? roster: [{ slot, verbinding? }] (world.coopRoster); vorige: de lijst slots van de vorige keer of null
// (de eerste keer is alleen een beginstand, zodat wie zelf net binnenkomt niet de hele zaal hoort aanschuiven).
// Geeft { slots, nieuw }: nieuw is true als er een slot bij kwam dat niet 'lost' is.
export function spelersVerbonden(vorige, roster) {
  const slots = (Array.isArray(roster) ? roster : []).filter((s) => s && s.verbinding !== 'lost' && Number.isFinite(s.slot)).map((s) => s.slot);
  if (!vorige) return { slots, nieuw: false };
  return { slots, nieuw: slots.some((s) => !vorige.includes(s)) };
}

// Welke sting hoort bij een verandering van het kaartje op het scherm (kaartModel van coopwedstrijd3d.js):
// een nieuwe 'Meedoen?'-uitnodiging of een nieuwe uitslag. Geeft { sleutel, uitkomst } of null.
export function kaartSting(vorige, model, uitslagGegevens = null) {
  const sig = (m) => (m ? `${m.soort}|${m.titel}` : '');
  if (!model || sig(vorige) === sig(model)) return null;
  if (model.soort === 'uitnodiging' && model.titel === 'Meedoen?') return 'meedoen';
  if (model.soort === 'uitslag' && uitslagGegevens) return uitslagUitkomst(uitslagGegevens.rijen, uitslagGegevens.jij);
  return null;
}
