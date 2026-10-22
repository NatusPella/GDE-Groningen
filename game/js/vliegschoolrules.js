// Vliegschool (#397): de lessen, de banen en het oordeel, puur: geen DOM, geen THREE, geen wereld. vliegschool.js is de
// lijm met het spel (het vliegtuig en de helikopter, de ringen, het bord); scripts/vliegschool_test.mjs vliegt het
// echte arcade-vliegtuig (arcadeplane.js) door elke les met de piloot onderaan dit bestand.
//
// Zes soorten oefeningen, voor allebei de toestellen, plus hoveren voor de helikopter (13 lessen):
//   ringen    vlieg door ringen langs een bocht
//   landen    zet het toestel op een markering (de baan van Eelde, het helidek)
//   water     laag over open water, tussen een onder- en bovengrens boven het water
//   slalom    links en rechts om echte molens, om en om
//   nood      de motor haperst: zet hem neer in het weiland dat in beeld staat
//   opening   tussen twee hoge gebouwen door, op plekken die op de tegels gemeten zijn (game/vliegplekken.json)
//   hoveren   stil boven een cirkel hangen (helikopter)
// Een les heeft een baan (bouwBaan, uit de gemeten plekken), een staat (nieuweStaat) en per beeld een stap(). Wat het
// toestel doet komt binnen als `c`: { x, y, z, agl, speed, vz, heading, onGround, touchdown: null|'zacht'|'hard',
// crashed, opBaan }. agl is de hoogte boven de grond, of boven het water als het toestel daarboven vliegt.
// Alle teksten en namen zijn verzonnen (constitution 2); molens en plaatsen zijn echt.

export const MEDAL_NAMEN = ['', 'Brons', 'Zilver', 'Goud'];

// Wat een toestel nodig heeft: de halve spanwijdte (voor de smalle openingen) en de gewone snelheid.
export const KIST = {
  vliegtuig: { naam: 'Kist Kees', halveSpan: 5.3, vaart: 45, ringR: 26, voorbij: 160, slalom: { dmin: 28, dmax: 170, hoog: 220 } },
  heli: { naam: 'de Wieken Wubbo', halveSpan: 4.6, vaart: 30, ringR: 11, voorbij: 70, slalom: { dmin: 18, dmax: 110, hoog: 130 } },
};

// Beloning per medaille (euro, eenmalig per les en medaille; Loopbaan, vak Lucht, telt de loonfactor erover).
export const BELONING = [0, 25, 40, 60];
export const OEFEN_XP = 6; // wie een les opnieuw doet krijgt alleen een paar punten
export const MEDAILLE_XP = [0, 14, 20, 28];

export const LESSEN = [
  { id: 'vt-ringen', kist: 'vliegtuig', soort: 'ringen', titel: 'Door de ringen', kort: 'Acht ringen langs een bocht', grenzen: [4, 6, 8], tijd: 240 },
  { id: 'vt-landen', kist: 'vliegtuig', soort: 'landen', titel: 'Landen op de markering', kort: 'Zet hem op de gele streep', grenzen: [1, 2, 3], tijd: 150 },
  { id: 'vt-water', kist: 'vliegtuig', soort: 'water', titel: 'Laag over het water', kort: 'Twaalfhonderd meter boven het meer', grenzen: [0.55, 0.75, 0.92], tijd: 150, band: [4, 22], breed: 70, veilig: 2 },
  { id: 'vt-slalom', kist: 'vliegtuig', soort: 'slalom', titel: 'Molenslalom', kort: 'Om en om langs vier molens', grenzen: [2, 3, 4], tijd: 260, molens: 4 },
  { id: 'vt-nood', kist: 'vliegtuig', soort: 'nood', titel: 'Noodlanding', kort: 'De motor haperst: dat weiland in', grenzen: [1, 2, 3], tijd: 200, gas: 0.3, veld: 0 },
  { id: 'vt-opening', kist: 'vliegtuig', soort: 'opening', titel: 'Door de opening', kort: 'Tussen hoge gebouwen door, steeds krapper', grenzen: [1, 2, 3], tijd: 240, lo: 2.5 },

  { id: 'hk-ringen', kist: 'heli', soort: 'ringen', titel: 'Door de ringen', kort: 'Zeven ringen laag langs een bocht', grenzen: [4, 5, 7], tijd: 240 },
  { id: 'hk-landen', kist: 'heli', soort: 'landen', titel: 'Landen op het helidek', kort: 'Op het midden van de H', grenzen: [1, 2, 3], tijd: 150 },
  { id: 'hk-water', kist: 'heli', soort: 'water', titel: 'Laag over het water', kort: 'Twaalfhonderd meter vlak boven het meer', grenzen: [0.55, 0.75, 0.92], tijd: 200, band: [2, 10], breed: 50, veilig: 1 },
  { id: 'hk-hoveren', kist: 'heli', soort: 'hoveren', titel: 'Hoveren boven de cirkel', kort: 'Twaalf seconden stil in de cirkel', grenzen: [90, 55, 35], tijd: 90, straal: 8, nodig: 12 },
  { id: 'hk-slalom', kist: 'heli', soort: 'slalom', titel: 'Molenslalom', kort: 'Om en om langs drie molens', grenzen: [2, 2, 3], tijd: 300, molens: 3 },
  { id: 'hk-nood', kist: 'heli', soort: 'nood', titel: 'Noodlanding', kort: 'De motor rookt: binnen honderd seconden aan de grond', grenzen: [1, 2, 3], tijd: 100, veld: 1 },
  { id: 'hk-opening', kist: 'heli', soort: 'opening', titel: 'Door de opening', kort: 'Tussen hoge gebouwen door, steeds krapper', grenzen: [1, 2, 3], tijd: 240, lo: 1.5 },
];
export const LES_IDS = LESSEN.map((l) => l.id);
export const lesVan = (id) => LESSEN.find((l) => l.id === id) || null;
export const lessenVan = (kist) => LESSEN.filter((l) => l.kist === kist);

// --- wat er gezegd wordt --------------------------------------------------------------------------------------
// De instructeur: één stem in tekst, geen opgenomen stem.
export const INSTRUCTEUR = 'Instructeur Wolkje';
export const SCHOOL = 'Vliegschool De Windwijzer';
export const LIJNEN = {
  welkom: ['Moi! Welkom bij De Windwijzer. Kies een les: eerst het vliegtuig of de helikopter?'],
  'vt-ringen': { uitleg: 'Door de gele ringen, om en om. Gas met W en S, rollen met A en D, neus met Spatie en Ctrl.', goed: ['Mooi door de ring.', 'Netjes. De volgende!'], fout: ['Naast de ring. Rustig bijsturen.', 'Gemist. Zakken of stijgen kan ook.'] },
  'vt-landen': { uitleg: 'Zet hem neer op de gele streep van de baan. Gas terug, neus iets omhoog vlak voor de grond.', goed: ['Zacht en op de streep. Mooi.'], fout: ['Daar had de streep gelegen. Volgende keer.'] },
  'vt-water': { uitleg: 'Vlieg laag over het water, tussen de twee lijnen. Niet te hoog en niet nat worden.', goed: [], fout: ['Te hoog. Zakken.', 'Te laag! Een stukje omhoog.'] },
  'vt-slalom': { uitleg: 'Om en om langs de molens: eerst links, dan rechts. Houd de molen aan de goede kant.', goed: ['Netjes om de molen.'], fout: ['Verkeerde kant van de molen.', 'Te dicht op de wieken!'] },
  'vt-nood': { uitleg: 'Motorstoring! Hij geeft maar dertig procent. Zweef naar het weiland met de gele rand en zet hem neer.', goed: ['Geland in het weiland. Koeien keken toe.'], fout: ['Naast het weiland. De boer was niet blij.'] },
  'vt-opening': { uitleg: 'Tussen de twee gebouwen door, onder de gele lijn. Steeds krapper: let op je vleugels.', goed: ['Door de opening!'], fout: ['Te hoog, te laag of te scheef.'] },
  'hk-ringen': { uitleg: 'Door de ringen, laag en rustig. W vooruit, A en D draaien, Spatie omhoog, Ctrl omlaag.', goed: ['Mooi door de ring.'], fout: ['Naast de ring. Even terug en bijsturen.'] },
  'hk-landen': { uitleg: 'Op het midden van de H. Hang stil boven het dek en zak dan rustig met Ctrl.', goed: ['Zachtjes. Zo moet het.'], fout: ['Naast de H. Probeer het nog eens.'] },
  'hk-water': { uitleg: 'Vlak boven het water vliegen, tussen de twee lijnen. De rotor moet droog blijven.', goed: [], fout: ['Te hoog. Een stukje zakken.', 'Te laag! Omhoog.'] },
  'hk-hoveren': { uitleg: 'Hang stil boven de gele cirkel. Laat W los en houd de hoogte met Spatie en Ctrl.', goed: ['Stil. Houd vol.'], fout: ['De cirkel uit. Rustig terug.'] },
  'hk-slalom': { uitleg: 'Om en om langs de molens, eerst links, dan rechts. De wieken blijven buiten de rotor.', goed: ['Netjes om de molen.'], fout: ['Verkeerde kant van de molen.'] },
  'hk-nood': { uitleg: 'De motor rookt! Je hebt honderd seconden: naar het weiland met de gele rand en neerzetten.', goed: ['Aan de grond. De rook trekt weg.'], fout: ['Naast het weiland.'] },
  'hk-opening': { uitleg: 'Tussen de twee gebouwen door, onder de gele lijn. Je rotor is ruim negen meter breed.', goed: ['Erdoor!'], fout: ['Te hoog, te laag of te scheef.'] },
  eind: { goud: ['Goud! Dat vieren we met koffie.', 'Strak gevlogen. De Windwijzer draait mee.'], zilver: ['Zilver. Nog even en het is goud.'], brons: ['Brons. Geslaagd, en dat telt.'], geen: ['Nog even oefenen. De lucht is gratis.', 'Niet gelukt, maar je leeft nog. Volgende keer.'] },
};

// --- de bouwstenen ------------------------------------------------------------------------------------------------
const TWEEPI = Math.PI * 2;
export const hoekVerschil = (a, b) => { let d = a - b; while (d > Math.PI) d -= TWEEPI; while (d < -Math.PI) d += TWEEPI; return d; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const getal = (v, d = 0) => (Number.isFinite(v) ? v : d);
const afstand = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const naar = (x, y, hoek, d) => ({ x: x + Math.cos(hoek) * d, y: y + Math.sin(hoek) * d });
const r1 = (v) => Math.round(v * 10) / 10;

// Het snijpunt van de baan van het toestel met het vlak van een poort of ring (normaal n): { across, dz, agl, dir } of null.
export function kruising(p, c, g) {
  if (!p) return null;
  const s0 = (p.x - g.x) * g.nx + (p.y - g.y) * g.ny, s1 = (c.x - g.x) * g.nx + (c.y - g.y) * g.ny;
  if (!((s0 < 0 && s1 >= 0) || (s0 > 0 && s1 <= 0))) return null;
  const t = s0 / (s0 - s1);
  const x = p.x + (c.x - p.x) * t, y = p.y + (c.y - p.y) * t, z = p.z + (c.z - p.z) * t;
  return { across: (x - g.x) * -g.ny + (y - g.y) * g.nx, dz: z - (g.z || 0), agl: p.agl + (c.agl - p.agl) * t, dir: s1 > s0 ? 1 : -1 };
}

// De baan van een les, uit de omgeving: env = { plekken, eelde, strip, pad, ground(x, y), roofAt?(x, y) }.
// Geeft null als de les hier niet kan (met `reden` in beschikbaar()).
export function beschikbaar(les, env) {
  const P = (env && env.plekken) || {};
  switch (les.soort) {
    case 'landen': return les.kist === 'vliegtuig' ? (env && env.strip ? '' : 'Er is geen baan bij Eelde') : (env && env.pad ? '' : 'Er is geen helidek bij Eelde');
    case 'water': return (P.water || []).length ? '' : 'Geen open water in de buurt';
    case 'slalom': return (P.molens || []).length >= (les.molens || 3) ? '' : 'Te weinig molens in de buurt';
    case 'nood': return (P.velden || []).length > (les.veld || 0) ? '' : 'Geen weiland gevonden';
    case 'opening': return (P.openingen || []).length >= 3 ? '' : 'Geen openingen gemeten';
    case 'hoveren': return (P.velden || []).length ? '' : 'Geen vrije plek';
    default: return env && (env.strip || env.pad) ? '' : 'Geen veld bij Eelde';
  }
}

const HOEK = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

// De startpositie: een punt, de kijkrichting, de hoogte boven de grond en de vaart.
function startOp(env, kist, p, hoek, agl, vaart) {
  const g = env.ground(p.x, p.y);
  return { x: p.x, y: p.y, z: g + agl, heading: hoek, speed: vaart === undefined ? KIST[kist].vaart : vaart };
}

export function bouwBaan(les, env) {
  const K = KIST[les.kist];
  const eelde = env.eelde || { x: 0, y: 0 };
  const grond = env.ground || (() => 0);
  const dak = env.roofAt || (() => 0);
  const b = { les: les.id, soort: les.soort, kist: les.kist, tijd: les.tijd };
  switch (les.soort) {
    case 'ringen': {
      const plane = les.kist === 'vliegtuig';
      const draai = plane ? [0, 0.35, -0.35, 0.35, -0.5, 0.5, -0.35, 0] : [0, 0.6, -0.6, 0.6, -0.9, 0.9, -0.6];
      const stap = plane ? 380 : 170;
      const hoog = plane ? [70, 90, 110, 90, 70, 60, 80, 100] : [26, 30, 38, 30, 26, 30, 36];
      const h0 = env.strip ? env.strip.heading : 0;
      const o = env.strip ? env.strip.point(40, 0) : eelde;
      let hoek = h0, pos = { x: o.x, y: o.y };
      b.start = startOp(env, les.kist, pos, hoek, plane ? 90 : 28, plane ? K.vaart : 0);
      b.ringen = [];
      draai.forEach((d, i) => {
        hoek += d;
        pos = naar(pos.x, pos.y, hoek, stap);
        let z = grond(pos.x, pos.y) + hoog[i];
        z = Math.max(z, dak(pos.x, pos.y) + (plane ? 10 : 12) + K.ringR);
        b.ringen.push({ x: r1(pos.x), y: r1(pos.y), z, nx: Math.cos(hoek), ny: Math.sin(hoek), r: K.ringR });
      });
      b.voorbij = K.voorbij;
      return b;
    }
    case 'landen': {
      if (les.kist === 'vliegtuig') {
        const s = env.strip;
        if (!s) return null;
        const merk = s.point(s.length * 0.35, 0);
        b.merk = { x: r1(merk.x), y: r1(merk.y), r: 30 };
        const aanloop = s.point(-1400, 0);
        b.start = startOp(env, 'vliegtuig', aanloop, s.heading, 140, 40);
        b.baan = s;
      } else {
        const p = env.pad;
        if (!p) return null;
        b.merk = { x: p.x, y: p.y, r: Math.max(5, p.r || 6) };
        const hoek = (env.strip ? env.strip.heading : 0) + Math.PI;
        const st = naar(p.x, p.y, hoek, 260);
        b.start = startOp(env, 'heli', st, HOEK(st, p), 55, 0);
        b.start.z = Math.max(b.start.z, (p.z || 0) + 55);
      }
      return b;
    }
    case 'water': {
      const w = (env.plekken.water || [])[0];
      if (!w) return null;
      const hoek = HOEK(w.a, w.b);
      b.band = { lo: les.band[0], hi: les.band[1] };
      b.corridor = { a: { x: w.a.x, y: w.a.y }, b: { x: w.b.x, y: w.b.y }, hoek, lengte: afstand(w.a, w.b), breed: Math.min(les.breed, w.halveBreedte || les.breed) };
      b.veilig = les.veilig;
      const st = naar(w.a.x, w.a.y, hoek + Math.PI, 500);
      b.start = startOp(env, les.kist, st, hoek, les.kist === 'vliegtuig' ? 45 : 18, les.kist === 'vliegtuig' ? K.vaart : 0);
      b.naam = w.naam || null;
      return b;
    }
    case 'slalom': {
      const lijst = (env.plekken.molens || []).slice(0, les.molens);
      if (lijst.length < les.molens) return null;
      b.molens = lijst.map((m, i) => ({ naam: m.naam, x: m.x, y: m.y, kant: i % 2 === 0 ? 1 : -1 }));
      b.regels = K.slalom;
      const h = HOEK(eelde, b.molens[0]);
      const st = naar(eelde.x, eelde.y, h, 0);
      b.start = startOp(env, les.kist, env.strip ? env.strip.point(40, 0) : st, h, les.kist === 'vliegtuig' ? 100 : 40, les.kist === 'vliegtuig' ? K.vaart : 0);
      return b;
    }
    case 'nood': {
      const v = (env.plekken.velden || [])[les.veld || 0];
      if (!v) return null;
      b.veld = { x: v.x, y: v.y, heading: v.heading, lengte: v.lengte, breed: v.breedte, naam: v.naam || null };
      b.merk = { x: v.x, y: v.y, r: les.kist === 'vliegtuig' ? 60 : 18 };
      if (les.kist === 'vliegtuig') {
        // het weiland ligt recht voor je, aan de kant van Eelde, met een kleine zijwaartse afwijking om te corrigeren
        const ca = Math.cos(v.heading), sa = Math.sin(v.heading);
        const voor = (eelde.x - v.x) * ca + (eelde.y - v.y) * sa >= 0 ? -1 : 1; // de landingsrichting: van Eelde af
        const st = { x: v.x - ca * voor * 1600 - sa * 110, y: v.y - sa * voor * 1600 + ca * 110 };
        b.start = startOp(env, 'vliegtuig', st, Math.atan2(sa * voor, ca * voor), 190, 40);
      } else {
        const van = HOEK(v, eelde);
        const st = naar(v.x, v.y, van, 700);
        b.start = startOp(env, 'heli', st, van + Math.PI, 100, 0);
      }
      b.gas = les.gas || 1;
      return b;
    }
    case 'opening': {
      const o = (env.plekken.openingen || []).slice(0, 3);
      if (o.length < 3) return null;
      b.poorten = o.map((p, i) => ({ id: p.id, naam: p.naam, x: p.x, y: p.y, nx: p.nx, ny: p.ny, breedte: p.breedte, hi: p.hoogte, lo: les.lo, daken: p.daken, i }));
      b.marge = K.halveSpan;
      const g0 = b.poorten[0];
      const hoek = Math.atan2(g0.ny, g0.nx);
      const st = naar(g0.x, g0.y, hoek + Math.PI, les.kist === 'vliegtuig' ? 700 : 260);
      b.start = startOp(env, les.kist, st, hoek, les.kist === 'vliegtuig' ? 35 : 20, les.kist === 'vliegtuig' ? K.vaart : 0);
      b.voorbij = les.kist === 'vliegtuig' ? 200 : 90;
      return b;
    }
    case 'hoveren': {
      const v = (env.plekken.velden || [])[0];
      if (!v) return null;
      b.cirkel = { x: v.x, y: v.y, r: les.straal };
      b.band = { lo: 4, hi: 30 };
      b.nodig = les.nodig;
      const van = HOEK(v, eelde);
      const st = naar(v.x, v.y, van, 220);
      b.start = startOp(env, 'heli', st, van + Math.PI, 40, 0);
      b.merk = { x: v.x, y: v.y, r: les.straal };
      return b;
    }
    default: return null;
  }
}

// --- de staat en de stap -----------------------------------------------------------------------------------------
export function nieuweStaat(les, baan) {
  const st = { fase: 'vlieg', t: 0, p: null, i: 0, goed: 0, fout: 0, reden: '', punten: 0, geland: false, tdAfstand: null, tdKwaliteit: null, na: 0, binnen: 0, afgelegd: 0, nat: false, vorige: null, laagste: Infinity, kant: 0, in: 0, uit: 0, tijdIn: 0 };
  if (baan && baan.soort === 'water') st.s0 = null;
  return st;
}

const goed = (tekst, i) => ({ k: 'goed', tekst, i });
const fout = (tekst, i) => ({ k: 'fout', tekst, i });
const info = (tekst) => ({ k: 'info', tekst });

function klaar(st, ev, reden = '') { if (st.fase === 'vlieg') { st.fase = 'klaar'; st.reden = reden; ev.push({ k: 'klaar', tekst: reden }); } }
function mislukt(st, ev, reden) { if (st.fase === 'vlieg') { st.fase = 'mislukt'; st.reden = reden; ev.push({ k: 'mislukt', tekst: reden }); } }

// Eén stap van de les. o = { widen (hulp: ruimere ringen, 1 = normaal), timeK (hulp: meer tijd) }.
export function stap(les, baan, st, c, dt, o = {}) {
  const ev = [];
  if (st.fase !== 'vlieg' || !(dt >= 0)) return ev;
  const widen = o.widen > 0 ? o.widen : 1, timeK = o.timeK > 0 ? o.timeK : 1;
  st.t += dt;
  if (c.crashed) { mislukt(st, ev, les.kist === 'heli' ? 'Hard neergekomen' : 'Neergestort'); st.p = { x: c.x, y: c.y, z: c.z, agl: c.agl }; return ev; }
  const prev = st.p;
  const limiet = (baan.tijd || 240) * timeK;
  switch (baan.soort) {
    case 'ringen': {
      for (let guard = 0; guard < 4 && st.i < baan.ringen.length; guard++) {
        const g = baan.ringen[st.i];
        const k = kruising(prev, c, g);
        if (k && k.dir > 0) {
          const d = Math.hypot(k.across, k.dz);
          if (d <= g.r * widen) { st.goed++; ev.push(goed('Ring ' + (st.i + 1), st.i)); st.i++; continue; }
          if (d <= g.r * 4) { st.fout++; ev.push(fout('Naast ring ' + (st.i + 1), st.i)); st.i++; continue; }
        } else if (!k && (c.x - g.x) * g.nx + (c.y - g.y) * g.ny > baan.voorbij) { st.fout++; ev.push(fout('Ring ' + (st.i + 1) + ' gemist', st.i)); st.i++; continue; }
        break;
      }
      if (st.i >= baan.ringen.length) klaar(st, ev, 'Alle ringen gehad');
      break;
    }
    case 'landen': {
      if (c.touchdown && !st.geland) {
        st.geland = true;
        st.tdAfstand = Math.hypot(c.x - baan.merk.x, c.y - baan.merk.y);
        st.tdKwaliteit = c.touchdown;
        st.tdOpBaan = c.opBaan !== false;
        ev.push(info(`Geland, ${Math.round(st.tdAfstand)} m van de markering`));
      }
      if (st.geland) { st.na += dt; if (st.na > 2) klaar(st, ev, 'Geland'); }
      break;
    }
    case 'water': {
      const a = baan.corridor, ux = Math.cos(a.hoek), uy = Math.sin(a.hoek);
      const along = (c.x - a.a.x) * ux + (c.y - a.a.y) * uy, across = -(c.x - a.a.x) * uy + (c.y - a.a.y) * ux;
      if (st.s0 === null && along >= 0 && along <= a.lengte && Math.abs(across) <= a.breed) { st.s0 = along; st.vorige = along; ev.push(info('Het water is begonnen')); }
      if (st.s0 !== null) {
        const ds = Math.max(0, Math.min(along, a.lengte) - st.vorige);
        if (ds > 0) {
          st.afgelegd += ds;
          if (c.agl >= baan.band.lo && c.agl <= baan.band.hi) st.binnen += ds;
        }
        st.vorige = Math.max(st.vorige, Math.min(along, a.lengte));
        if (c.agl < baan.veilig) { st.nat = true; mislukt(st, ev, 'Het water geraakt'); break; }
        if (Math.abs(across) > a.breed + 40) { mislukt(st, ev, 'Uit de baan gevlogen'); break; }
        if (along >= a.lengte) klaar(st, ev, 'Het einde van het water');
        else if (c.agl > baan.band.hi + 3 && (st.hint || 0) < st.t - 4) { st.hint = st.t; ev.push(fout('Te hoog: zakken', -1)); }
        else if (c.agl < baan.band.lo && (st.hint || 0) < st.t - 4) { st.hint = st.t; ev.push(fout('Te laag: omhoog', -1)); }
      }
      break;
    }
    case 'slalom': {
      const R = baan.regels;
      const m = baan.molens[st.i];
      if (m) {
        const d = Math.hypot(c.x - m.x, c.y - m.y);
        if (d < st.laagste) {
          st.laagste = d;
          // de kant van de molen ten opzichte van de vliegrichting: links (+1) of rechts (-1)
          const hx = Math.cos(c.heading), hy = Math.sin(c.heading);
          st.kant = Math.sign(hx * (m.y - c.y) - hy * (m.x - c.x)) || 1;
          st.hoogteBij = c.agl;
        }
        const weg = d > st.laagste + (baan.kist === 'heli' ? 30 : 45);
        if (weg && st.laagste < 900) {
          let reden = '';
          if (st.kant !== m.kant) reden = 'Verkeerde kant van ' + m.naam;
          else if (st.laagste < R.dmin) reden = 'Te dicht op ' + m.naam;
          else if (st.laagste > R.dmax) reden = 'Te ver van ' + m.naam;
          else if (st.hoogteBij > R.hoog) reden = 'Te hoog boven ' + m.naam;
          if (reden) { st.fout++; ev.push(fout(reden, st.i)); } else { st.goed++; ev.push(goed(m.naam, st.i)); }
          st.i++; st.laagste = Infinity;
        }
      }
      if (st.i >= baan.molens.length) klaar(st, ev, 'Alle molens gehad');
      break;
    }
    case 'nood': {
      if (c.touchdown && !st.geland) {
        st.geland = true;
        const v = baan.veld, ca = Math.cos(v.heading), sa = Math.sin(v.heading);
        const u = (c.x - v.x) * ca + (c.y - v.y) * sa, w = -(c.x - v.x) * sa + (c.y - v.y) * ca;
        st.inVeld = Math.abs(u) <= v.lengte / 2 + 15 && Math.abs(w) <= v.breed / 2 + 8;
        st.tdAfstand = Math.hypot(c.x - baan.merk.x, c.y - baan.merk.y);
        st.tdKwaliteit = c.touchdown;
        st.over = Math.max(0, limiet - st.t);
        ev.push(info(st.inVeld ? 'Geland in het weiland' : 'Geland naast het weiland'));
      }
      if (st.geland) { st.na += dt; if (st.na > 1.5) klaar(st, ev, st.inVeld ? 'Geland in het weiland' : 'Naast het weiland'); }
      break;
    }
    case 'opening': {
      const g = baan.poorten[st.i];
      if (g) {
        const k = kruising(prev, c, g);
        const d = Math.hypot(c.x - g.x, c.y - g.y);
        if (d < st.laagste) st.laagste = d;
        if (k) {
          const ruimte = g.breedte / 2 - baan.marge / widen;
          let reden = '';
          if (Math.abs(k.across) > g.breedte / 2) reden = 'Tegen het gebouw';
          else if (Math.abs(k.across) > ruimte) reden = 'Te scheef: je vleugel raakt';
          else if (k.agl > g.hi) reden = 'Te hoog';
          else if (k.agl < g.lo) reden = 'Te laag';
          if (reden) { st.fout++; ev.push(fout(reden, st.i)); } else { st.goed++; ev.push(goed('Poort ' + (st.i + 1), st.i)); }
          st.i++; st.laagste = Infinity;
        } else if (st.laagste < 320 && d > st.laagste + 90) { st.fout++; ev.push(fout('Poort ' + (st.i + 1) + ' gemist', st.i)); st.i++; st.laagste = Infinity; }
      }
      if (st.i >= baan.poorten.length) klaar(st, ev, 'Alle openingen gehad');
      break;
    }
    case 'hoveren': {
      const k = baan.cirkel;
      const d = Math.hypot(c.x - k.x, c.y - k.y);
      const goedHier = d <= k.r && c.speed < 3.5 && c.agl >= baan.band.lo && c.agl <= baan.band.hi && !c.onGround;
      if (goedHier) st.in += dt; else st.in = Math.max(0, st.in - dt * 1.5);
      st.tijdIn = st.in;
      if (st.in >= baan.nodig) klaar(st, ev, 'Lang genoeg stil');
      break;
    }
    default: break;
  }
  if (st.fase === 'vlieg' && st.t >= limiet) {
    if (baan.soort === 'ringen' || baan.soort === 'water' || baan.soort === 'slalom' || baan.soort === 'opening') klaar(st, ev, 'De tijd is om');
    else mislukt(st, ev, 'De tijd is om');
  }
  st.p = { x: c.x, y: c.y, z: c.z, agl: c.agl };
  return ev;
}

// --- het oordeel ----------------------------------------------------------------------------------------------------
function medalje(waarde, grenzen, lager = false) {
  let m = 0;
  for (let i = 0; i < grenzen.length; i++) if (lager ? waarde <= grenzen[i] : waarde >= grenzen[i]) m = i + 1;
  return m;
}

// { geslaagd, medaille 0..3, punten, regels: [[label, waarde]], titel }
export function beoordeel(les, baan, st) {
  const regels = [];
  let medaille = 0, punten = 0;
  const g = les.grenzen;
  switch (baan.soort) {
    case 'ringen':
      medaille = medalje(st.goed, g);
      punten = st.goed * 100 + Math.max(0, Math.round((baan.tijd - st.t) * 2)) * (st.goed === baan.ringen.length ? 1 : 0);
      regels.push(['Ringen', `${st.goed}/${baan.ringen.length}`], ['Tijd', Math.round(st.t) + ' s']);
      break;
    case 'landen': {
      if (!st.geland) break;
      const d = st.tdAfstand, zacht = st.tdKwaliteit === 'zacht';
      const ok = baan.kist === 'heli' ? d <= baan.merk.r + 1.5 : st.tdOpBaan;
      const gout = baan.kist === 'heli' ? 2.5 : 25, zilver = baan.kist === 'heli' ? 5 : 60;
      if (ok) medaille = 1;
      if (ok && ((zacht && d <= zilver) || d <= gout)) medaille = 2;
      if (ok && zacht && d <= gout) medaille = 3;
      punten = Math.max(0, Math.round(1000 - d * (baan.kist === 'heli' ? 50 : 8) + (zacht ? 200 : 0)));
      regels.push(['Afstand', Math.round(d * 10) / 10 + ' m'], ['Landing', zacht ? 'zacht' : 'hard']);
      break;
    }
    case 'water': {
      const aandeel = baan.corridor.lengte > 0 ? st.binnen / baan.corridor.lengte : 0;
      if (st.fase === 'klaar') medaille = medalje(aandeel, g);
      punten = Math.round(aandeel * 1000);
      regels.push(['Binnen de lijnen', Math.round(aandeel * 100) + '%']);
      break;
    }
    case 'slalom':
      medaille = medalje(st.goed, g);
      punten = st.goed * 250;
      regels.push(['Molens', `${st.goed}/${baan.molens.length}`]);
      break;
    case 'nood': {
      if (!st.geland || !st.inVeld) break;
      const zacht = st.tdKwaliteit === 'zacht';
      medaille = 1;
      if (zacht) medaille = 2;
      if (zacht && st.tdAfstand <= baan.merk.r) medaille = 3;
      punten = Math.round(600 + (zacht ? 200 : 0) + Math.max(0, 200 - st.tdAfstand));
      regels.push(['Afstand tot het midden', Math.round(st.tdAfstand) + ' m'], ['Landing', zacht ? 'zacht' : 'hard']);
      break;
    }
    case 'opening':
      medaille = medalje(st.goed, g);
      punten = st.goed * 300;
      regels.push(['Openingen', `${st.goed}/${baan.poorten.length}`]);
      break;
    case 'hoveren':
      if (st.fase === 'klaar') medaille = medalje(st.t, [g[0], g[1], g[2]], true);
      punten = st.fase === 'klaar' ? Math.max(0, Math.round(1000 - st.t * 8)) : 0;
      regels.push(['Tijd', Math.round(st.t) + ' s']);
      break;
    default: break;
  }
  if (st.fase === 'mislukt') medaille = 0;
  return { geslaagd: medaille > 0, medaille, punten, regels, naam: MEDAL_NAMEN[medaille], reden: st.reden };
}

// De regels op het bord: [[label, waarde]].
export function bordRij(les, baan, st) {
  const over = Math.max(0, Math.round((baan.tijd || 0) - st.t));
  switch (baan.soort) {
    case 'ringen': return [['Ringen', `${st.goed}/${baan.ringen.length}`], ['Tijd', over + ' s']];
    case 'landen': return [['Afstand', st.tdAfstand != null ? Math.round(st.tdAfstand) + ' m' : '-'], ['Tijd', over + ' s']];
    case 'water': return [['Binnen de lijnen', baan.corridor.lengte > 0 ? Math.round(st.binnen / baan.corridor.lengte * 100) + '%' : '0%'], ['Afgelegd', `${Math.round(Math.min(st.afgelegd, baan.corridor.lengte))}/${Math.round(baan.corridor.lengte)} m`]];
    case 'slalom': return [['Molens', `${st.goed}/${baan.molens.length}`], ['Volgende', baan.molens[st.i] ? baan.molens[st.i].naam + (baan.molens[st.i].kant > 0 ? ' (links)' : ' (rechts)') : '-']];
    case 'nood': return [['Tijd', over + ' s'], ['Weiland', baan.veld.naam || 'in beeld']];
    case 'opening': return [['Openingen', `${st.goed}/${baan.poorten.length}`], ['Breedte', baan.poorten[st.i] ? Math.round(baan.poorten[st.i].breedte) + ' m' : '-']];
    case 'hoveren': return [['Stil', `${Math.floor(st.in)}/${baan.nodig} s`], ['Tijd', over + ' s']];
    default: return [];
  }
}

// Het volgende punt om naartoe te vliegen (voor de pijl op het bord en voor de piloot): { x, y, z, label } of null.
export function doel(les, baan, st, env = {}) {
  const grond = env.ground || (() => 0);
  switch (baan.soort) {
    case 'ringen': { const g = baan.ringen[st.i]; return g ? { x: g.x, y: g.y, z: g.z, label: `Ring ${st.i + 1}` } : null; }
    case 'landen': return { x: baan.merk.x, y: baan.merk.y, z: grond(baan.merk.x, baan.merk.y), label: 'Markering' };
    case 'water': { const a = baan.corridor; return { x: st.s0 === null ? a.a.x : a.b.x, y: st.s0 === null ? a.a.y : a.b.y, z: grond(a.a.x, a.a.y) + (baan.band.lo + baan.band.hi) / 2, label: st.s0 === null ? 'Begin van het water' : 'Einde van het water' }; }
    case 'slalom': { const m = baan.molens[st.i]; return m ? { x: m.x, y: m.y, z: grond(m.x, m.y), label: m.naam } : null; }
    case 'nood': return { x: baan.veld.x, y: baan.veld.y, z: grond(baan.veld.x, baan.veld.y), label: 'Weiland' };
    case 'opening': { const g = baan.poorten[st.i]; return g ? { x: g.x, y: g.y, z: grond(g.x, g.y) + (g.lo + g.hi) / 2, label: 'Opening ' + (st.i + 1) } : null; }
    case 'hoveren': return { x: baan.cirkel.x, y: baan.cirkel.y, z: grond(baan.cirkel.x, baan.cirkel.y) + 12, label: 'Cirkel' };
    default: return null;
  }
}

// Geld en punten voor een afgeronde les: alleen de medailles die je nog niet had geven geld. `eerder`: de beste medaille tot nu toe.
export function beloning(medaille, eerder = 0) {
  let geld = 0;
  for (let m = Math.max(1, eerder + 1); m <= medaille; m++) geld += BELONING[m];
  const xp = medaille > 0 ? (medaille > eerder ? MEDAILLE_XP[medaille] : OEFEN_XP) : 0;
  return { geld, xp };
}

// --- de piloot (tests en de bot) -------------------------------------------------------------------------------
// Wat een speler indrukt om de les te halen: { w, s, a, d, spatie, ctrl, shift }. Vliegtuig: gas met W/S (blijft staan),
// rollen met A/D (D draait linksom: de hoek loopt tegen de klok in), neus met Spatie en Ctrl, Shift remt op de baan.
// Helikopter: W vooruit, S remt, A/D draaien, Spatie omhoog, Ctrl omlaag, Shift sneller.
const nietsIngedrukt = () => ({ w: false, s: false, a: false, d: false, spatie: false, ctrl: false, shift: false });

// t = { x, y, dz (hoogte erbij, + is omhoog), vaart }
export function vliegtuigToetsen(c, t) {
  const k = nietsIngedrukt();
  const fout = hoekVerschil(Math.atan2(t.y - c.y, t.x - c.x), c.heading);
  if (!c.onGround) { if (fout > 0.05) k.d = true; else if (fout < -0.05) k.a = true; }
  const vt = t.vaart || 45;
  if (c.speed < vt - 2) k.w = true; else if (c.speed > vt + 3) k.s = true;
  const dvz = clamp(t.dz * 0.3, -5, 6);
  if (!c.onGround) { if (c.vz < dvz - 0.8) k.spatie = true; else if (c.vz > dvz + 0.8) k.ctrl = true; }
  return k;
}

export function heliToetsen(c, t) {
  const k = nietsIngedrukt();
  const dx = t.x - c.x, dy = t.y - c.y, d = Math.hypot(dx, dy);
  const stil = t.stil === undefined ? 6 : t.stil;
  const fout = hoekVerschil(Math.atan2(dy, dx), c.heading);
  if (d > stil) { if (fout > 0.08) k.d = true; else if (fout < -0.08) k.a = true; }
  const vt = t.vaart === undefined ? Math.min(30, d * 0.35) : t.vaart;
  if (d > stil && Math.abs(fout) < 0.5 && c.speed < vt) k.w = true;
  else if (c.speed > vt + 3 || (d <= stil && c.speed > 1.2)) k.s = true;
  if (t.vaart === undefined && d > 600 && Math.abs(fout) < 0.3) k.shift = true;
  if (t.dz > 1.2 && c.vz < 6) k.spatie = true; else if (t.dz < -1.2 && c.vz > -4) k.ctrl = true;
  return k;
}

// Het punt waar de piloot naartoe vliegt: { x, y, dz, vaart, stil, rem } voor deze les op dit moment.
export function richt(les, baan, st, c, env = {}) {
  const plane = baan.kist === 'vliegtuig';
  const grond = env.ground || (() => 0);
  switch (baan.soort) {
    case 'ringen': {
      const g = baan.ringen[Math.min(st.i, baan.ringen.length - 1)];
      return { x: g.x, y: g.y, dz: g.z - c.z, vaart: plane ? 45 : undefined, stil: 12 };
    }
    case 'landen': {
      const m = baan.merk;
      if (plane) {
        const h = baan.baan.heading, ca = Math.cos(h), sa = Math.sin(h);
        const aim = { x: m.x - ca * 130, y: m.y - sa * 130 };
        const rest = (aim.x - c.x) * ca + (aim.y - c.y) * sa;
        const tagl = rest > 250 ? rest * 0.075 : Math.max(0, (rest - 30) * 0.06);
        const doelP = { x: aim.x + ca * 400, y: aim.y + sa * 400 };
        let dz = tagl - c.agl;
        let vaart = rest > 500 ? 40 : 32;
        if (c.agl < 7) { dz = -8; vaart = 25; }
        return { x: doelP.x, y: doelP.y, dz, vaart, uitrol: c.onGround };
      }
      const d = Math.hypot(m.x - c.x, m.y - c.y);
      return { x: m.x, y: m.y, dz: d < 4 ? -8 : Math.min(55, 6 + d * 0.5) - c.agl, vaart: d < 40 ? Math.min(14, d * 0.25) : undefined, stil: 1.2 };
    }
    case 'water': {
      const a = baan.corridor, mid = (baan.band.lo + baan.band.hi) / 2;
      const ux = Math.cos(a.hoek), uy = Math.sin(a.hoek);
      const along = (c.x - a.a.x) * ux + (c.y - a.a.y) * uy;
      const dz = (along < 0 ? mid + Math.min(40, -along * 0.07) : mid) - c.agl;
      return { x: a.b.x + ux * 400, y: a.b.y + uy * 400, dz, vaart: plane ? 40 : 22, stil: 8 };
    }
    case 'slalom': {
      const klein = baan.regels;
      let i = Math.min(st.i, baan.molens.length - 1);
      if (st.laagste < Infinity && Math.hypot(c.x - baan.molens[i].x, c.y - baan.molens[i].y) > st.laagste + 8 && baan.molens[i + 1]) i++;
      const m = baan.molens[i], van = i > 0 ? baan.molens[i - 1] : baan.start;
      // de aanvliegrichting is van de vorige molen naar deze; de zijwaartse afstand ligt daar vast (niet aan de neus)
      const ex = m.x - van.x, ey = m.y - van.y, el = Math.hypot(ex, ey) || 1;
      const zij = (klein.dmin + klein.dmax) / 2 * 0.8;
      const px = m.kant > 0 ? ey / el : -ey / el, py = m.kant > 0 ? -ex / el : ex / el;
      const aim = { x: m.x + px * zij + ex / el * 150, y: m.y + py * zij + ey / el * 150 };
      return { x: aim.x, y: aim.y, dz: (plane ? 60 : 30) - c.agl, vaart: plane ? 45 : undefined, stil: 10 };
    }
    case 'nood': {
      const v = baan.veld;
      const ca = Math.cos(v.heading), sa = Math.sin(v.heading);
      const d = Math.hypot(v.x - c.x, v.y - c.y);
      if (plane) {
        // aanvliegen langs de lengte van het weiland, aan de kant waar het toestel al voor ligt, en op de middellijn inschuiven
        const rx = c.x - v.x, ry = c.y - v.y;
        const lang = rx * ca + ry * sa, dwars = -rx * sa + ry * ca;
        const voor = Math.cos(c.heading) * ca + Math.sin(c.heading) * sa >= 0 ? 1 : -1;
        const ds = -voor * lang;
        const kijk = clamp(Math.abs(dwars) * 1.2 + 120, 120, 500);
        const aimS = lang + voor * kijk;
        const rest = ds - 130 + Math.abs(dwars) * 0.5;
        let dz = (rest > 250 ? rest * 0.075 : Math.max(0, (rest - 30) * 0.06)) - c.agl;
        let vaart = 33;
        if (c.agl < 7) { dz = -8; vaart = 25; }
        // vlak voor de grond geen bochten meer: de vleugels recht langs de middellijn
        const recht = c.agl < 16 || c.onGround;
        return { x: recht ? c.x + ca * voor * 500 : v.x + ca * aimS, y: recht ? c.y + sa * voor * 500 : v.y + sa * aimS, dz, vaart, uitrol: c.onGround };
      }
      return { x: v.x, y: v.y, dz: d < 4 ? -8 : Math.min(90, 4 + d * 0.3) - c.agl, vaart: d < 40 ? Math.min(14, d * 0.25) : undefined, stil: 1.2 };
    }
    case 'opening': {
      const g = baan.poorten[Math.min(st.i, baan.poorten.length - 1)];
      const mid = (g.lo + g.hi) / 2;
      const sa = (c.x - g.x) * g.nx + (c.y - g.y) * g.ny;
      const lat = -(c.x - g.x) * g.ny + (c.y - g.y) * g.nx;
      const dirn = sa <= 0 ? 1 : -1; // de richting waarin je door de poort gaat
      const ds = Math.abs(sa);
      const nodig = clamp(Math.abs(lat) * (plane ? 2.5 : 1.2) + (plane ? 160 : 60), plane ? 160 : 60, plane ? 600 : 300);
      let aim;
      if (ds < nodig && Math.abs(lat) > 12) aim = { x: g.x - g.nx * dirn * (nodig + 120), y: g.y - g.ny * dirn * (nodig + 120) };
      else { const kijk = clamp(ds * 0.5 + 60, 100, 400); aim = { x: g.x + g.nx * (sa + dirn * kijk), y: g.y + g.ny * (sa + dirn * kijk) }; }
      const d = Math.hypot(c.x - g.x, c.y - g.y);
      const dz = mid + Math.min(45, d * 0.04) - c.agl;
      return { x: aim.x, y: aim.y, dz, vaart: plane ? 45 : undefined, stil: 6 };
    }
    case 'hoveren': {
      const k = baan.cirkel;
      const d = Math.hypot(k.x - c.x, k.y - c.y);
      return { x: k.x, y: k.y, dz: 14 - c.agl, vaart: d < 30 ? Math.min(8, d * 0.2) : undefined, stil: 1.5 };
    }
    default: return { x: c.x, y: c.y, dz: 0 };
  }
}

export function piloot(les, baan, st, c, env = {}) {
  const t = richt(les, baan, st, c, env);
  const k = baan.kist === 'vliegtuig' ? vliegtuigToetsen(c, t) : heliToetsen(c, t);
  if (t.uitrol) { k.w = false; k.s = true; k.spatie = false; k.shift = true; k.a = false; k.d = false; }
  return k;
}
