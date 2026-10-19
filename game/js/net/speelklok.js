// Coöp (#95): de gedeelde speelklok. De host is de baas over de tijd van de dag (world.clock, 0..24 uur):
// hij meldt hem om de paar seconden als gebeurtenis; een gast simuleert de wereld niet en laat zijn klok
// daarom de host volgen. Tussen twee meldingen schuift hij door op de snelheid die uit de laatste twee
// meldingen volgt, en verschillen worden zacht weggewerkt (geen schok in de zon); een grote sprong
// (nieuwe dag, slapen, verhaalsprong) is een snap. Pure logica, geen DOM.

export const KLOK_EVERY = 2;     // s tussen twee meldingen van de host
export const MAX_RATE = 0.5;     // uur per seconde: meer is geen speelklok maar rommel
const wrap = (h) => ((h % 24) + 24) % 24;
// kortste afstand op de 24-uurscirkel, met teken: positief als b later is dan a
export const hourDiff = (a, b) => { const d = wrap(b - a); return d > 12 ? d - 24 : d; };

export function klokEvent(world) {
  const uur = Number(world.clock);
  return { k: 'klok', t: Number(world.time) || 0, uur: Number.isFinite(uur) ? Math.round(wrap(uur) * 1e4) / 1e4 : 0 };
}
export function leesKlokEvent(b) {
  if (!b || b.k !== 'klok' || !Number.isFinite(b.t) || !Number.isFinite(b.uur) || b.uur < 0 || b.uur >= 24) return null;
  return { t: b.t, uur: b.uur };
}

export class KlokVolger {
  constructor({ snapAbove = 0.25, slew = 0.5 } = {}) {
    this.snapAbove = snapAbove; this.slew = slew; // snap vanaf zoveel uur verschil; anders zoveel van het verschil per seconde weg
    this.last = null; this.prev = null; this.rate = null; this.jump = false;
  }
  // een melding van de host; lokaal = eigen tijd in seconden (monotoon)
  observe(msg, lokaal) {
    if (!msg) return false;
    if (this.last && msg.t <= this.last.t) return false; // oud of dubbel
    this.prev = this.last; this.last = { ...msg, lokaal };
    if (this.prev) {
      const dt = this.last.t - this.prev.t, dh = hourDiff(this.prev.uur, this.last.uur);
      if (dt > 0) { const r = dh / dt; this.rate = r >= 0 && r <= MAX_RATE ? r : this.rate; } // negatief = sprong terug, geen snelheid
      if (this.rate != null && (dh < 0 || dh > MAX_RATE * dt * 1.01 + 0.01)) this.jump = true; // een sprong: de volgende stap snapt
    }
    return true;
  }
  // wat de host nu naar verwachting aanwijst
  target(lokaal) {
    if (!this.last) return null;
    const ahead = Math.max(0, Math.min(10, lokaal - this.last.lokaal)); // niet ver doorschuiven als de meldingen stoppen
    return wrap(this.last.uur + (this.rate || 0) * ahead);
  }
  // Nieuwe klokstand voor de gast, uit zijn huidige: zacht bijsturen, snap bij een sprong
  step(huidig, dt, lokaal) {
    const tgt = this.target(lokaal);
    if (tgt == null) return huidig;
    const d = hourDiff(huidig, tgt);
    if (this.jump || Math.abs(d) > this.snapAbove) { this.jump = false; return tgt; }
    const move = Math.sign(d) * Math.min(Math.abs(d), Math.max(Math.abs(d) * this.slew * dt, 0));
    return wrap(huidig + move + (this.rate || 0) * dt);
  }
}
