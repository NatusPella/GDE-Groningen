// Halteren van een lijnbus in het verkeer (wens eigenaar 23-11): afremmen, aan de stoeprand bij de halte stoppen,
// deuren open, wachten, knipperen en weer invoegen. Puur: geen THREE, geen wereld; de verkeers-AI (vehicle/traffic.js)
// geeft per beeld de afstand tot de halte en de snelheid, en leest terug wat de bus moet doen (maximale snelheid,
// naar de stoeprand, richtingaanwijzer, deuren, aankomst). Tests: scripts/halteren_test.mjs.
//
// Fasen: rijden -> nadering (remt af, schuift naar de stoeprand, knippert rechts) -> staan (deuren open, wachttijd)
// -> invoegen (knippert links, terug in de rijstrook) -> rijden. Een bus die de halte voorbij schiet of te lang in de
// file voor de halte staat, slaat hem over. Een live bus (#395) stopt waar en zo lang de echte bus stilstaat.
// Ander verkeer: een staande bus telt als obstakel waar een auto omheen mag (traffic.js); wie niet kan, wacht erachter.

export const HALTE = {
  NADER_M: 90,      // m voor het stoppunt: vanaf hier remt de bus naar de halte toe
  VOORUIT: 3,       // m: het midden van de bus stopt zoveel voorbij de halte, de voordeur staat dan bij de paal
  STOEP_M: 40,      // m: vanaf hier schuift de bus naar de stoeprand
  KNIPPER_M: 55,    // m: vanaf hier knippert hij rechts
  STIL_V: 0.3,      // m/s: stil
  STOP_M: 3,        // m: binnen deze afstand van het stoppunt telt stilstaan als halteren
  MIS_M: 8,         // m voorbij het stoppunt zonder te stoppen: halte gemist
  NADER_MAX_S: 60,  // s in de nadering (file voor de halte): dan overslaan
  DECEL: 1.3,       // m/s2: comfortabel afremmen
  KRUIP_V: 1.2,     // m/s: het laatste stukje
  DEUR_DICHT_S: 1.2,// s voor vertrek gaan de deuren dicht
  INVOEG_S: 3,      // s knipperen bij het invoegen
  INVOEG_V: 6,      // m/s: daarboven is het invoegen klaar
  LIVE_R: 15,       // m: een live bus die binnen deze afstand van de halte stilstaat, haltert
};

export function makeHalteStaat() {
  return { fase: 'rijden', stop: null, t: 0, wacht: 0, vmax: Infinity, stoep: false, knipper: null, deurOpen: false, aankomst: false, gemist: false };
}

// Afstand (m, langs de lijn) van de bus tot het stoppunt van een halte, in de rijrichting; negatief = voorbij.
// runner: { line: { length, loop }, s, dir }. Het stoppunt ligt VOORUIT voorbij de halte, maar nooit zo dicht bij
// het eind van een niet-ronde lijn dat de rit daar al keert (busroutes.js stepRunner keert op 6 m).
export function halteAfstand(runner, stop, vooruit = HALTE.VOORUIT) {
  const L = runner.line, len = L.length || 0, dir = runner.dir < 0 ? -1 : 1;
  let doel = stop.s + dir * vooruit;
  if (!L.loop) doel = Math.max(8, Math.min(len - 8, doel));
  let d = (doel - runner.s) * dir;
  if (L.loop && len > 0) { if (d < -len / 2) d += len; else if (d > len / 2) d -= len; }
  return d;
}

// Snelheid waarmee je nog op d meter tot stilstand komt (met een kruipgang voor het laatste stukje).
export function remSnelheid(d, decel = HALTE.DECEL) {
  if (d <= 0) return 0;
  return Math.max(Math.min(HALTE.KRUIP_V, d), Math.sqrt(2 * decel * d));
}

// Eén stap. in: { stop (de volgende halte van de rit of null), afstand (halteAfstand tot stop), speed, dt, dwell,
// decel, live (rijdt een echte bus mee), liveStil (de echte bus staat stil) }. Schrijft in st; aankomst en gemist
// zijn een tik lang waar. Geen allocaties.
export function stapHalte(st, inp) {
  const dt = inp.dt || 0, sp = Math.abs(inp.speed || 0);
  st.aankomst = false; st.gemist = false;
  if (st.fase === 'rijden') {
    if (inp.stop && inp.stop !== st.vorige && inp.afstand <= HALTE.NADER_M && inp.afstand > -HALTE.MIS_M) {
      st.fase = 'nadering'; st.stop = inp.stop; st.t = 0;
    }
  }
  if (st.fase === 'nadering') {
    // de afstand hoort bij de halte waarvoor we remmen (in.afstand gaat over st.stop als de aanroeper die doorgeeft)
    const d = inp.afstand;
    st.t += dt;
    if (inp.live) {
      st.vmax = Infinity;
      if (inp.liveStil && Math.abs(d) < HALTE.LIVE_R && sp < 2) return aankomen(st, inp);
    } else {
      st.vmax = remSnelheid(d, inp.decel || HALTE.DECEL);
      if (sp < HALTE.STIL_V && d < HALTE.STOP_M) return aankomen(st, inp);
    }
    if (d < -HALTE.MIS_M || st.t > HALTE.NADER_MAX_S) {
      st.vorige = st.stop; st.stop = null; st.fase = 'rijden'; st.gemist = true;
      st.vmax = Infinity; st.stoep = false; st.knipper = null; st.deurOpen = false;
      return st;
    }
    st.stoep = d < HALTE.STOEP_M;
    st.knipper = d < HALTE.KNIPPER_M ? 'right' : null;
    st.deurOpen = false;
    return st;
  }
  if (st.fase === 'staan') {
    st.wacht -= dt;
    st.vmax = 0; st.stoep = true; st.knipper = null;
    const klaar = inp.live ? !inp.liveStil : st.wacht <= 0;
    st.deurOpen = inp.live ? !!inp.liveStil : st.wacht > HALTE.DEUR_DICHT_S;
    if (klaar) { st.fase = 'invoegen'; st.t = HALTE.INVOEG_S; st.vmax = Infinity; st.stoep = false; st.knipper = 'left'; st.deurOpen = false; }
    return st;
  }
  if (st.fase === 'invoegen') {
    st.t -= dt;
    st.vmax = Infinity; st.stoep = false; st.knipper = 'left'; st.deurOpen = false;
    if (st.t <= 0 || sp > HALTE.INVOEG_V) { st.fase = 'rijden'; st.knipper = null; st.stop = null; }
    return st;
  }
  st.vmax = Infinity; st.stoep = false; st.knipper = null; st.deurOpen = false;
  return st;
}

function aankomen(st, inp) {
  st.fase = 'staan'; st.wacht = inp.dwell || 0; st.vorige = st.stop; st.aankomst = true;
  st.vmax = 0; st.stoep = true; st.knipper = null; st.deurOpen = true;
  return st;
}
