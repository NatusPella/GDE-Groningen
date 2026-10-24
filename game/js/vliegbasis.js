// Vliegschool (#397): de eerste lessen, puur (geen DOM, THREE of wereld). vliegschoolrules.js roept dit aan voor de soorten
// die het zelf niet kent; scripts/vliegschool_test.mjs vliegt ze met de piloot uit de regels.
//
//   opstijgen  gas op de baan, trek bij de rotatiesnelheid op en klim naar 60 m, recht langs de middenlijn (vliegtuig)
//   koers      rechtdoor of de hoogte houden, een strook van een paar honderd meter (vliegtuig en helikopter: "naar voren")
//   peiling    bochten: een reeks koersen aanvliegen en elk een paar seconden vasthouden (vliegtuig)
//   rondje     een rondje om de vliegplek langs ringen (vliegtuig); een baan van soort 'ringen', de rest regelt vliegschoolrules.js
//   plek       landen op een plek in het veld (helikopter); een baan van soort 'landen'
// Wat een soort aan de regels teruggeeft: bouw (de baan), stap (events), beoordeel, bordRij, doel en richt (de piloot).

import { kompasGraden, kompasLetters } from './instrumenten.js';

const TWEEPI = Math.PI * 2;
const hoekVerschil = (a, b) => { let d = a - b; while (d > Math.PI) d -= TWEEPI; while (d < -Math.PI) d += TWEEPI; return d; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const naar = (x, y, hoek, d) => ({ x: x + Math.cos(hoek) * d, y: y + Math.sin(hoek) * d });
const r1 = (v) => Math.round(v * 10) / 10;
const HOEK = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const medalje = (waarde, grenzen) => { let m = 0; for (let i = 0; i < grenzen.length; i++) if (waarde >= grenzen[i]) m = i + 1; return m; };

export const BASIS_SOORTEN = ['opstijgen', 'koers', 'peiling', 'rondje', 'plek'];
export const isBasis = (soort) => BASIS_SOORTEN.includes(soort);

export const OPSTIJG_HOOGTE = 60;
// de koersen van de bochtenles, ten opzichte van de startkoers (graden, plus is rechtsaf)
export const PEILINGEN = [-90, 90, 0, 180];

export function beschikbaar(les, env) {
  const P = (env && env.plekken) || {};
  switch (les.soort) {
    case 'plek': return (P.velden || []).length ? '' : 'Geen vrije plek';
    default: return env && env.strip ? '' : 'Er is geen baan bij Eelde';
  }
}

// b: het begin van de baan ({ les, soort, kist, tijd }); startOp en de hulpjes komen van de regels.
export function bouw(les, env, K, b, startOp) {
  const eelde = env.eelde || { x: 0, y: 0 };
  const grond = env.ground || (() => 0);
  const dak = env.roofAt || (() => 0);
  const plane = les.kist === 'vliegtuig';
  const s = env.strip;
  switch (les.soort) {
    case 'opstijgen': {
      if (!s) return null;
      const p0 = s.point(6, 0);
      b.start = startOp(env, 'vliegtuig', p0, s.heading, 0, 0);
      b.start.grond = true;
      b.baan = s;
      b.hoogte = OPSTIJG_HOOGTE;
      return b;
    }
    case 'koers': {
      if (!s) return null;
      const p0 = s.point(plane ? 40 : 60, 0);
      b.corridor = { a: { x: p0.x, y: p0.y }, hoek: s.heading, lengte: les.lengte, breed: les.breed };
      b.band = les.band ? { lo: les.band[0], hi: les.band[1] } : null;
      b.start = startOp(env, les.kist, p0, s.heading, plane ? 100 : 20, plane ? K.vaart : 0);
      return b;
    }
    case 'peiling': {
      if (!s) return null;
      const p0 = s.point(40, 0);
      b.start = startOp(env, 'vliegtuig', p0, s.heading, 110, K.vaart);
      b.koersen = PEILINGEN.map((g) => ({ hoek: s.heading + g * Math.PI / 180, graden: g }));
      b.marge = 0.17;          // rad (10 graden)
      b.houd = 2.5;            // s vasthouden
      b.perKoers = 45;         // s per koers
      return b;
    }
    case 'rondje': {
      if (!s) return null;
      // twaalf ringen, elk een stuk verder en een kwart radiaal links: samen een cirkel van ruim zes honderd meter om de vliegplek
      const stap = 330, draai = -0.52;
      const hoog = [80, 90, 100, 110, 100, 90, 80, 90, 100, 110, 100, 90];
      const p0 = s.point(40, 0);
      let hoek = s.heading, pos = { x: p0.x, y: p0.y };
      b.soort = 'ringen';
      b.start = startOp(env, 'vliegtuig', pos, hoek, 90, K.vaart);
      b.ringen = [];
      hoog.forEach((h) => {
        hoek += draai;
        pos = naar(pos.x, pos.y, hoek, stap);
        const z = Math.max(grond(pos.x, pos.y) + h, dak(pos.x, pos.y) + 10 + K.ringR);
        b.ringen.push({ x: r1(pos.x), y: r1(pos.y), z, nx: Math.cos(hoek), ny: Math.sin(hoek), r: K.ringR });
      });
      b.voorbij = K.voorbij;
      return b;
    }
    case 'plek': {
      const v = (env.plekken.velden || [])[0];
      if (!v) return null;
      const z = grond(v.x, v.y);
      b.soort = 'landen';
      b.merk = { x: v.x, y: v.y, r: 6, z };
      const van = HOEK(v, eelde);
      const st = naar(v.x, v.y, van, 320);
      b.start = startOp(env, 'heli', st, van + Math.PI, 45, 0);
      return b;
    }
    default: return null;
  }
}

// h = { klaar, mislukt, goed, fout, info } van de regels. Geeft true als dit de stap van een basisles was.
export function stap(baan, st, c, dt, ev, h, o = {}) {
  const widen = o.widen > 0 ? o.widen : 1;
  switch (baan.soort) {
    case 'opstijgen': {
      const s = baan.baan;
      const across = -(c.x - s.x) * Math.sin(s.heading) + (c.y - s.y) * Math.cos(s.heading);
      if (c.onGround && !st.los) {
        st.maxDwars = Math.max(st.maxDwars || 0, Math.abs(across));
        if (c.speed > 1 && !st.gas) { st.gas = true; ev.push(h.info('Gas erbij met W')); }
        if (c.speed >= 30 && !st.optrek) { st.optrek = true; ev.push(h.info('Nu optrekken met Spatie')); }
        if (Math.abs(across) > s.width / 2 + 6) { h.mislukt(st, ev, 'Van de baan af'); return true; }
      }
      if (!c.onGround && !st.los) { st.los = true; st.losSnelheid = c.speed; ev.push(h.info('Los van de baan: klim naar ' + baan.hoogte + ' m')); }
      if (st.los) {
        st.maxDwars = Math.max(st.maxDwars || 0, Math.min(Math.abs(across), 60) * 0.5);
        if (c.onGround) { h.mislukt(st, ev, 'Weer aan de grond'); return true; }
        if (c.agl >= baan.hoogte) h.klaar(st, ev, 'Op hoogte');
      }
      return true;
    }
    case 'koers': {
      const a = baan.corridor, ux = Math.cos(a.hoek), uy = Math.sin(a.hoek);
      const along = (c.x - a.a.x) * ux + (c.y - a.a.y) * uy, across = -(c.x - a.a.x) * uy + (c.y - a.a.y) * ux;
      const breed = a.breed * widen;
      if (st.vorige == null) st.vorige = Math.max(0, along);
      const ds = Math.max(0, Math.min(along, a.lengte) - st.vorige);
      if (ds > 0) {
        st.afgelegd += ds;
        if (Math.abs(across) <= breed && (!baan.band || (c.agl >= baan.band.lo && c.agl <= baan.band.hi))) st.binnen += ds;
      }
      st.vorige = Math.max(st.vorige, Math.min(along, a.lengte));
      if (Math.abs(across) > breed + 120) { h.mislukt(st, ev, 'Uit de koers gevlogen'); return true; }
      if (along >= a.lengte) { h.klaar(st, ev, 'Het einde van de strook'); return true; }
      if ((st.hint || 0) < st.t - 4) {
        if (baan.band && c.agl > baan.band.hi) { st.hint = st.t; ev.push(h.fout('Te hoog: een stukje zakken', -1)); }
        else if (baan.band && c.agl < baan.band.lo) { st.hint = st.t; ev.push(h.fout('Te laag: een stukje omhoog', -1)); }
        else if (Math.abs(across) > breed) { st.hint = st.t; ev.push(h.fout(across > 0 ? 'Te ver naar rechts: stuur naar links' : 'Te ver naar links: stuur naar rechts', -1)); }
      }
      return true;
    }
    case 'peiling': {
      const k = baan.koersen[st.i];
      if (!k) { h.klaar(st, ev, 'Alle koersen gehad'); return true; }
      st.tK = (st.tK || 0) + dt;
      if (st.tK <= dt) ev.push(h.info(`Koers ${kompasGraden(k.hoek)} graden, ${kompasLetters(kompasGraden(k.hoek))}`));
      const fout = Math.abs(hoekVerschil(c.heading, k.hoek));
      if (fout <= baan.marge * widen && Math.abs(c.roll || 0) < 0.3) st.hold = (st.hold || 0) + dt; else st.hold = Math.max(0, (st.hold || 0) - dt * 2);
      st.tijdIn = st.hold;
      if (st.hold >= baan.houd) { st.goed++; ev.push(h.goed('Koers ' + (st.i + 1), st.i)); st.i++; st.hold = 0; st.tK = 0; }
      else if (st.tK >= baan.perKoers) { st.fout++; ev.push(h.fout('Koers ' + (st.i + 1) + ' niet gehaald', st.i)); st.i++; st.hold = 0; st.tK = 0; }
      if (st.i >= baan.koersen.length) h.klaar(st, ev, 'Alle koersen gehad');
      return true;
    }
    default: return false;
  }
}

// Wat er na de tijdslimiet gebeurt: koers telt wat er was, de rest mislukt.
export const tijdKlaar = (soort) => soort === 'koers';

// null als dit geen basisles is, anders { medaille, punten, regels }
export function beoordeel(les, baan, st) {
  const g = les.grenzen;
  switch (baan.soort) {
    case 'opstijgen': {
      const klaar = st.fase === 'klaar';
      const dwars = st.maxDwars || 0;
      let medaille = 0;
      if (klaar) medaille = dwars <= 4 && st.t <= 30 ? 3 : dwars <= 8 ? 2 : 1;
      return { medaille, punten: klaar ? Math.max(0, Math.round(1000 - dwars * 20 - st.t * 5)) : 0, regels: [['Hoogte', baan.hoogte + ' m'], ['Afwijking', r1(dwars) + ' m'], ['Tijd', Math.round(st.t) + ' s']] };
    }
    case 'koers': {
      const aandeel = baan.corridor.lengte > 0 ? st.binnen / baan.corridor.lengte : 0;
      return { medaille: st.fase === 'klaar' ? medalje(aandeel, g) : 0, punten: Math.round(aandeel * 1000), regels: [['Binnen de lijnen', Math.round(aandeel * 100) + '%']] };
    }
    case 'peiling':
      return { medaille: medalje(st.goed, g), punten: st.goed * 250, regels: [['Koersen', `${st.goed}/${baan.koersen.length}`]] };
    default: return null;
  }
}

export function bordRij(baan, st) {
  switch (baan.soort) {
    case 'opstijgen': return [['Hoogte', `${Math.round(st.p ? st.p.agl : 0)}/${baan.hoogte} m`], ['Afwijking', Math.round(st.maxDwars || 0) + ' m']];
    case 'koers': return [['Binnen de lijnen', baan.corridor.lengte > 0 ? Math.round(st.binnen / baan.corridor.lengte * 100) + '%' : '0%'], ['Afgelegd', `${Math.round(Math.min(st.afgelegd, baan.corridor.lengte))}/${Math.round(baan.corridor.lengte)} m`]];
    case 'peiling': {
      const k = baan.koersen[st.i];
      return [['Koersen', `${st.goed}/${baan.koersen.length}`], ['Koers', k ? `${kompasGraden(k.hoek)}° ${kompasLetters(kompasGraden(k.hoek))}` : '-']];
    }
    default: return null;
  }
}

export function doel(baan, st, grond) {
  switch (baan.soort) {
    case 'opstijgen': { const s = baan.baan, p = s.point(s.length + 600, 0); return { x: p.x, y: p.y, z: grond(p.x, p.y) + baan.hoogte, label: 'Klim naar ' + baan.hoogte + ' m' }; }
    case 'koers': { const a = baan.corridor, p = naar(a.a.x, a.a.y, a.hoek, a.lengte); return { x: p.x, y: p.y, z: grond(p.x, p.y) + (baan.band ? (baan.band.lo + baan.band.hi) / 2 : 0), label: 'Einde van de strook' }; }
    case 'peiling': {
      const k = baan.koersen[Math.min(st.i, baan.koersen.length - 1)], van = st.p || baan.start;
      const p = naar(van.x, van.y, k.hoek, 400);
      return { x: p.x, y: p.y, z: grond(p.x, p.y) + 110, label: `Koers ${kompasGraden(k.hoek)}°` };
    }
    default: return null;
  }
}

// Het punt waar de piloot naartoe vliegt (zie richt() in vliegschoolrules.js).
export function richt(baan, st, c) {
  const plane = baan.kist === 'vliegtuig';
  switch (baan.soort) {
    case 'opstijgen': {
      const s = baan.baan, ca = Math.cos(s.heading), sa = Math.sin(s.heading);
      const lang = (c.x - s.x) * ca + (c.y - s.y) * sa, dwars = -(c.x - s.x) * sa + (c.y - s.y) * ca;
      const kijk = clamp(Math.abs(dwars) * 4 + 120, 120, 500);
      const aim = s.point(lang + kijk, 0);
      return { x: aim.x, y: aim.y, dz: baan.hoogte + 25 - c.agl, vaart: 42, grondStart: true };
    }
    case 'koers': {
      const a = baan.corridor, ux = Math.cos(a.hoek), uy = Math.sin(a.hoek);
      const along = (c.x - a.a.x) * ux + (c.y - a.a.y) * uy, across = -(c.x - a.a.x) * uy + (c.y - a.a.y) * ux;
      const kijk = clamp(Math.abs(across) * 3 + (plane ? 90 : 30), plane ? 90 : 30, plane ? 320 : 120);
      const mid = baan.band ? (baan.band.lo + baan.band.hi) / 2 : 100;
      return { x: a.a.x + ux * (along + kijk), y: a.a.y + uy * (along + kijk), dz: (plane ? mid : Math.max(mid, 22)) - c.agl, vaart: plane ? 45 : 14, stil: 4 };
    }
    case 'peiling': {
      const k = baan.koersen[Math.min(st.i, baan.koersen.length - 1)];
      const p = naar(c.x, c.y, k.hoek, 500);
      return { x: p.x, y: p.y, dz: 110 - c.agl, vaart: 45, stil: 4 };
    }
    default: return null;
  }
}
