// Bietenoogst (#393): de bietentijd als bijbaan. Eerst rooien met de trekker, vier rijen over een akker, in een vaste
// snelheidsband en binnen de rij; daarna de oogst naar de bietenhoop van Suikerhal Hoogkerk brengen zonder dat de kar leeg
// strooit. Altijd een zonnige dag (geen modder). Pure regels, geen THREE, geen wereld, geen Math.random
// (scripts/bietenrules_test.mjs); sidejob_bieten.js is de adapter die de akker neerzet en de regels voedt.
//
// Invoer per stap (alles optioneel): along m langs de huidige rij vanaf het begin, across m zijdelings van de rij,
// speed m/s, decel m/s^2 (positief), lat m/s^2, dist m tot de hoop.
// Uitkomst van oogstResultaat(s): { base, tip, flawless, text, failed } in euro's, zoals bijbaanregels.js.
// Verzonnen: Akkerbouw Zonnehoek en Suikerhal Hoogkerk, niemand raakt gewond; een misser is een verloren lading.

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lvlK = (level) => clamp(((level || 1) - 1) / 4, 0, 1);
const pay = (base, tip, flawless, text, failed = false) => ({ base: Math.max(0, Math.round(base)), tip: Math.max(0, Math.round(tip)), flawless: !!flawless, text, failed });

export const RIJEN = 4;
export const RIJ_LEN = 100;       // m per rij
export const RIJ_AFSTAND = 7;     // m tussen twee rijen
export const V_MIN = 2.0;         // m/s: langzamer rooit niets
export const MAX_SPRONG = 6;      // m: dit stuk achter elkaar telt als rooien, daarna is er een gat gevallen
export const LAAD_AF = 9;         // procent kwaliteit per seconde bij een harde bocht of rem
export const HARD_REM = 3.4;
export const HARD_BOCHT = 4;

// De vier rijen van de akker: begin en eind, om en om de andere kant op (de keer aan de kop). center/angle: het midden en de
// richting van de rijen; de rijen liggen naast elkaar, RIJ_AFSTAND uit elkaar.
export function akkerRijen(center, angle, { rijen = RIJEN, len = RIJ_LEN, afstand = RIJ_AFSTAND } = {}) {
  const ux = Math.cos(angle), uy = Math.sin(angle), nx = -uy, ny = ux;
  const out = [];
  for (let i = 0; i < rijen; i++) {
    const off = (i - (rijen - 1) / 2) * afstand;
    const mx = center.x + nx * off, my = center.y + ny * off;
    const dir = i % 2 ? -1 : 1;
    const ax = mx - ux * len / 2 * dir, ay = my - uy * len / 2 * dir;
    out.push({ ax, ay, bx: ax + ux * len * dir, by: ay + uy * len * dir, ux: ux * dir, uy: uy * dir, len });
  }
  return out;
}

// Waar staat een punt ten opzichte van een rij: along vanaf het begin, across zijdelings (rechts positief).
export function rijPositie(rij, x, y) {
  const dx = x - rij.ax, dy = y - rij.ay;
  return { along: dx * rij.ux + dy * rij.uy, across: dx * -rij.uy + dy * rij.ux };
}

export const init = (level = 1) => {
  const k = lvlK(level);
  return {
    phase: 'rooien', rij: 0, rijen: RIJEN, len: RIJ_LEN, voortgang: 0, geoogst: 0, gemist: 0, tehard: 0,
    tol: 2.8 - 0.9 * k, vMax: 7.5 - 1.5 * k, kwaliteit: 100, time: 0, limit: 330 - 70 * k, delivered: false, scheefT: 0,
  };
};

export const oogstFractie = (s) => clamp(s.geoogst / (s.rijen * s.len), 0, 1);

export function step(s, i, dt) {
  const ev = [];
  s.time += dt;
  if (s.time > s.limit) { ev.push({ type: 'fail', why: 'de bietentijd is voorbij: de fabriek is dicht' }); return ev; }
  if (s.phase === 'rooien') {
    const speed = i.speed || 0;
    const binnen = Math.abs(i.across ?? 99) <= s.tol && (i.along ?? -99) > -1 && (i.along ?? -99) <= s.len + 3;
    if (binnen && speed >= V_MIN) {
      const along = clamp(i.along, 0, s.len);
      const delta = along - s.voortgang;
      if (delta > 0) {
        const goed = Math.min(delta, MAX_SPRONG);
        // te hard rooit slordig: de helft van die meters gaat in de grond
        const winst = speed > s.vMax ? goed * 0.5 : goed;
        s.geoogst += winst;
        if (speed > s.vMax) { s.tehard += dt; ev.push({ type: 'tehard' }); }
        s.gemist += delta - goed;
        s.voortgang = along;
        s.scheefT = 0;
      }
    } else if (!binnen && s.voortgang > 0 && s.voortgang < s.len - 2 && (i.along ?? -99) > 0 && (i.along ?? -99) < s.len) {
      s.scheefT += dt;
      if (s.scheefT > 1.2) { s.scheefT = 0; ev.push({ type: 'scheef' }); }
    }
    if (s.voortgang >= s.len - 2) {
      s.rij++;
      s.voortgang = 0;
      ev.push({ type: 'rij', n: s.rij });
      if (s.rij >= s.rijen) { s.phase = 'rijden'; ev.push({ type: 'geoogst' }); }
    }
    return ev;
  }
  if ((i.decel || 0) > HARD_REM || (i.lat || 0) > HARD_BOCHT) { s.kwaliteit = Math.max(0, s.kwaliteit - dt * LAAD_AF); ev.push({ type: 'bieten' }); }
  if (s.kwaliteit < 35) { ev.push({ type: 'fail', why: 'de kar is leeg gestrooid: de bieten liggen langs de weg' }); return ev; }
  if ((i.dist ?? 99) < 7 && (i.speed ?? 99) < 1) { s.delivered = true; ev.push({ type: 'done' }); }
  return ev;
}

export function result(s) {
  if (!s.delivered) return pay(0, 0, false, 'De bieten liggen nog op de akker.', true);
  const f = oogstFractie(s), q = s.kwaliteit / 100;
  const heel = f > 0.95 && q > 0.95;
  return pay(24 + 70 * f * q, f > 0.9 && q > 0.85 ? 24 : f > 0.7 && q > 0.65 ? 8 : 0,
    heel, heel ? 'Een schone akker en alle bieten aan de hoop!' : f < 0.7 ? 'Afgeleverd, maar er bleef nogal wat op het land.' : 'Bieten afgeleverd, een paar bleven onderweg.');
}

// Hoeveel meters er nog te rooien zijn, voor de melding "nog X rijen".
export const rijenOver = (s) => Math.max(0, s.rijen - s.rij);
