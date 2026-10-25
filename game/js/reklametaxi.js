// De reclametaxi (#404): af en toe rijdt een van de bestaande taxi's met een dakbord, een lopende tekstband, een
// goedkoop chiptune-deuntje en een megafoon die reclame omroept. De stijl is die van een ouderwetse
// bedrijfssite: opsommend, overdreven, het telefoonnummer in koeienletters. Alles is verzonnen: de naam, het
// nummer (een nepnummer met 555), de slogans en het deuntje (een eigen toonreeks, procedureel, geen opname).
// Dit bestand is de pure kant (teksten, deuntje, wanneer en welke taxi); reklametaxi3d.js is de lijm met het
// geluid, de tekstballon en het dakbord. Tests: scripts/reklametaxi_test.mjs.

export const REKLAME = {
  naam: 'Taxi Rinkelbel',
  nummer: '050-555 01 23',
  // één bal per keer; de megafoon roept ze in deze volgorde (door elkaar per rit), elk hooguit 16 woorden
  slogans: [
    'TAXI RINKELBEL! Bel nu: 050-555 01 23!',
    'Rinkelbel rijdt altijd! Ook voor uw tante, uw kat (in mandje) en uw kratje!',
    'Goedkoop! Snel! Schoon! Bijna altijd! Bel 050-555 01 23!',
    'Staat u in de regen? Bel Rinkelbel, dan staat u straks in de taxi!',
    'Station, kroeg, tandarts: Rinkelbel rijdt u overal heen. Bel nu!',
    'Geen taxi nodig? Bel toch maar. De koffie is gratis (op dinsdag).',
    'Rinkelbel kent elke omweg van Grunn persoonlijk! Bel 050-555 01 23!',
    'Pakketjes, tantes, studenten! Alles kan mee, behalve de fiets van de buurman!',
  ],
  // de lopende tekstband op het dakbord
  band: '*** TAXI RINKELBEL *** BEL NU 050-555 01 23 *** GOEDKOOP SNEL SCHOON *** DAG EN NACHT *** TAXI RINKELBEL *** ',
  beschrijving: 'reclametaxi',
};

// --- het deuntje: een eigen toonreeks, vier maten in a-klein (Am F C G), 16e stappen ---------------------------

export const SONG = { bpm: 112, stappen: 64 };
export const STAP_S = 60 / SONG.bpm / 4; // een zestiende in seconden

// lead: [stap, midi-nootnummer, lengte in stappen]
const LEAD = [
  [0, 69, 2], [2, 72, 2], [4, 76, 2], [6, 72, 2], [8, 69, 2], [10, 72, 2], [12, 76, 4],
  [16, 77, 2], [18, 72, 2], [20, 69, 2], [22, 72, 2], [24, 77, 2], [26, 81, 2], [28, 77, 4],
  [32, 72, 2], [34, 76, 2], [36, 79, 2], [38, 76, 2], [40, 72, 2], [42, 76, 2], [44, 79, 4],
  [48, 74, 2], [50, 71, 2], [52, 67, 2], [54, 71, 2], [56, 74, 4], [60, 79, 2], [62, 76, 2],
];
// bas: wortel op elke tel, per maat
const BAS_WORTELS = [45, 41, 48, 43];

const OP_STAP = new Map();
const zet = (stap, noot) => { if (!OP_STAP.has(stap)) OP_STAP.set(stap, []); OP_STAP.get(stap).push(noot); };
for (const [s, midi, len] of LEAD) zet(s, { stem: 'lead', midi, stappen: len });
BAS_WORTELS.forEach((w, maat) => { for (let k = 0; k < 4; k++) zet(maat * 16 + k * 4, { stem: 'bas', midi: w, stappen: 3 }); });
for (let s = 2; s < SONG.stappen; s += 4) zet(s, { stem: 'hat', midi: 0, stappen: 1 });

export const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const LUS_S = SONG.stappen * STAP_S;

// De noten die beginnen in [t0, t1) seconden sinds het begin van het deuntje (het deuntje loopt in een lus):
// [{ t, stem, midi, dur }] met t in seconden sinds het begin.
export function nootenTussen(t0, t1) {
  const uit = [];
  const eerste = Math.ceil(t0 / STAP_S - 1e-9);
  for (let n = eerste; n * STAP_S < t1 - 1e-9; n++) {
    const noten = OP_STAP.get(((n % SONG.stappen) + SONG.stappen) % SONG.stappen);
    if (!noten) continue;
    for (const q of noten) uit.push({ t: n * STAP_S, stem: q.stem, midi: q.midi, dur: q.stappen * STAP_S });
  }
  return uit;
}

// --- de lopende tekstband ----------------------------------------------------------------------------------

// Het bord op het dak van een taxi (#404, #436): de tekstband schuift per seconde, niet per beeld, zodat
// hij bij een wisselende beeldtijd even snel blijft lopen. offset in delen van de band (0..1).
export const BAND_SNELHEID = 0.09; // delen van de band per seconde
export function scrollBand(offset, dt) {
  const o = (Number(offset) || 0) + (Number(dt) || 0) * BAND_SNELHEID;
  return ((o % 1) + 1) % 1;
}

// Wat er met het dakbord van de reclametaxi gebeurt (#436). De mesh van een taxi bestaat niet altijd: ver
// weg of net opnieuw gebouwd is er even geen model. Dan blijft het bord staan (het is van de taxi, niet
// van de mesh) en hangt het er weer aan zodra de mesh terug is. Alleen een ánder, levend model vervangt het.
//   heeftBord, levendMesh (er is nu een mesh), zelfdeMesh (die mesh is de zijne), hangt (het bord hangt eraan)
export function bordActie({ heeftBord = false, levendMesh = false, zelfdeMesh = false, hangt = false } = {}) {
  if (!heeftBord) return 'maak';
  if (levendMesh && !zelfdeMesh) return 'vervang';
  return hangt ? 'laat' : 'hang';
}

// --- wanneer en welke taxi ---------------------------------------------------------------------------------

export const REKLAME_REGELS = {
  eerstWacht: [60, 150],    // s speltijd tot de eerste reclametaxi
  daarnaWacht: [150, 330],  // s tussen twee reclametaxi's
  duur: [35, 55],           // s dat de taxi omroept
  sloganEerst: 1.5,         // s na de start de eerste kreet
  sloganEvery: [7, 10],
  vanaf: 45, tot: 130,      // m van de speler waarbinnen een taxi gekozen wordt
  weg: 190,                 // m: verder weg stopt de reclame
};

const tussen = ([a, b], rng) => a + (b - a) * rng();

// Een bestaande taxi uit het verkeer: rijdend, niet van de speler of een bijbaan, niet te dichtbij en niet te ver.
export function isReklameTaxi(v, speler) {
  if (!v || !v.isTaxi || v.wrecked || v.sinking || v.parked || !v.road || v.driver || v.missionCar || v.sideJob || v.isPolice) return false;
  return true;
}

export function kiesReklameTaxi(voertuigen, speler, rng = Math.random, regels = REKLAME_REGELS) {
  const kandidaten = [];
  for (const v of voertuigen) {
    if (!isReklameTaxi(v, speler)) continue;
    const d = Math.hypot(v.x - speler.x, v.y - speler.y);
    if (d < regels.vanaf || d > regels.tot || Math.abs(v.speed) < 2) continue;
    kandidaten.push(v);
  }
  return kandidaten.length ? kandidaten[Math.floor(rng() * kandidaten.length)] : null;
}

export function maakReklame(rng = Math.random, nu = 0) {
  return { taxi: null, eind: 0, volgende: nu + tussen(REKLAME_REGELS.eerstWacht, rng), sloganAt: 0, volgorde: [], songT: 0 };
}

function wisselSlogans(rng) {
  const rij = REKLAME.slogans.map((_, i) => i);
  for (let i = rij.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [rij[i], rij[j]] = [rij[j], rij[i]]; }
  return rij;
}

// Eén stap. Geeft gebeurtenissen: { type: 'start', taxi }, { type: 'slogan', taxi, tekst } en { type: 'stop', taxi, reden }.
// Hooguit één reclametaxi tegelijk (st.taxi).
export function stapReklame(st, dt, nu, { voertuigen = [], speler, rng = Math.random, mag = true, regels = REKLAME_REGELS } = {}) {
  const ev = [];
  if (!st.taxi) {
    if (nu >= st.volgende && mag) {
      const t = kiesReklameTaxi(voertuigen, speler, rng, regels);
      if (!t) st.volgende = nu + 15;
      else {
        st.taxi = t; st.eind = nu + tussen(regels.duur, rng); st.sloganAt = nu + regels.sloganEerst; st.songT = 0; st.volgorde = wisselSlogans(rng);
        ev.push({ type: 'start', taxi: t });
      }
    }
    return ev;
  }
  const t = st.taxi;
  const d = Math.hypot(t.x - speler.x, t.y - speler.y);
  let reden = null;
  if (!voertuigen.includes(t) || !isReklameTaxi(t, speler)) reden = 'taxi weg';
  else if (d > regels.weg) reden = 'te ver';
  else if (nu >= st.eind) reden = 'klaar';
  if (reden) {
    st.taxi = null;
    st.volgende = nu + tussen(regels.daarnaWacht, rng);
    ev.push({ type: 'stop', taxi: t, reden });
    return ev;
  }
  st.songT += dt;
  if (nu >= st.sloganAt) {
    if (!st.volgorde.length) st.volgorde = wisselSlogans(rng);
    ev.push({ type: 'slogan', taxi: t, tekst: REKLAME.slogans[st.volgorde.pop()] });
    st.sloganAt = nu + tussen(regels.sloganEvery, rng);
  }
  return ev;
}
