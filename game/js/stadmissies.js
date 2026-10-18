// Vijf speelbare zijmissies uit #26 als pure regels, in dezelfde vorm als
// bijbaanregels.js (init, step, result) zodat het sidejob-contract ze met een dunne
// adapter (sidejob_stad.js) kan draaien: Museumbus (Nationaal Busmuseum), Suikerbieten
// (Hoogkerk), Herstelploeg (Delfstof Noord in het Hogeland), Live bij Radio Noordkust
// (OOGTV) en Rave in het Telefoonhuis. Geen THREE, geen wereld, geen Math.random.
//
// Invoer per stap (alles optioneel): speed m/s, decel m/s^2 (positief), lat m/s^2,
// dist m tot het huidige doel, dir -1|0|1 (rave: volume zachter, gelijk, harder).
// Uitkomst van result(s): { base, tip, flawless, text, failed } in euro's.
//
// Alleen Nederlands, verzonnen organisaties, niemand raakt gewond: een misser is een
// kras, een verloren lading, een klacht of een lege zaal. Delfstof Noord is de verzonnen
// zijlijn van de gaswinning: de ploeg helpt, er is geen wraak en geen echte instantie.

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lvlK = (level) => clamp(((level || 1) - 1) / 4, 0, 1);
const pay = (base, tip, flawless, text, failed = false) => ({ base: Math.max(0, Math.round(base)), tip: Math.max(0, Math.round(tip)), flawless: !!flawless, text, failed });

// Staan we stil genoeg bij het doel?
const AT = (i, r, v = 0.6) => (i.dist ?? 99) < r && (i.speed ?? 99) < v;

// 1. Museumbus: een oude bus van het Nationaal Busmuseum rustig naar twee tentoonstellingen rijden.
const museumbus = {
  id: 'museumbus', naam: 'Museumbus', bedrijf: 'Busmuseum Oostermoer', regio: 'veenkolonien', voertuig: 'oudebus',
  plek: { wgs: [53.16496, 6.72935] },
  blurb: 'Een oude museumbus voorzichtig naar de tentoonstelling rijden',
  tagline: 'Zacht optrekken, zacht remmen: de bus is ouder dan jij.',
  intro: ['Busmuseum Oostermoer heeft een bus uit lang geleden die vandaag mee mag naar twee dorpsfeesten.', 'Rijd rustig: harde remmen en scherpe bochten kosten kleur en lak. Bij elke stop even blijven staan voor de foto.'],
  init: (level) => ({ stops: 2, at: 0, wait: 0, shine: 100, limit: 11 - lvlK(level) * 2, hit: 0 }),
  step(s, i, dt) {
    const ev = [];
    let lost = 0;
    if ((i.speed || 0) > s.limit) lost += dt * 2.2;
    if ((i.decel || 0) > 2.6) lost += dt * 6;
    if ((i.lat || 0) > 3.2) lost += dt * 4;
    if (lost > 0) { s.shine = Math.max(0, s.shine - lost); s.hit += dt; ev.push({ type: 'kras' }); }
    if (s.shine <= 0) { ev.push({ type: 'fail', why: 'de bus is een ruïne: het museum wil hem terug' }); return ev; }
    if (AT(i, 5, 0.5)) {
      s.wait += dt;
      if (s.wait >= 2) { s.wait = 0; s.at++; ev.push({ type: 'foto', n: s.at }); if (s.at >= s.stops) ev.push({ type: 'done' }); }
    } else s.wait = 0;
    return ev;
  },
  result: (s) => s.at >= s.stops
    ? pay(34 + s.stops * 14, s.shine > 80 ? 24 : s.shine > 50 ? 10 : 0, s.shine > 90, s.shine > 90 ? 'Glanzend afgeleverd, de conservator kijkt blij.' : 'Afgeleverd, met een paar krasjes.')
    : pay(0, 0, false, 'De bus staat nog in het museum.', true),
};

// 2. Suikerbieten: bieten laden bij de hoop, naar de fabriek rijden zonder dat de lading van de kar valt.
const suikerbieten = {
  id: 'suikerbieten', naam: 'Suikerbieten naar de fabriek', bedrijf: 'Suikerhal Hoogkerk', regio: 'stad', voertuig: 'vrachtwagen',
  plek: { wgs: [53.2336, 6.4977] },
  blurb: 'Bieten laden bij Hoogkerk en veilig naar de fabriek rijden',
  tagline: 'Suikercampagne: de bieten gaan dit jaar nog door de fabriek, de straat is niet de bedoeling.',
  intro: ['Het is campagne in Hoogkerk. De bietenhoop wacht, de fabriek ook.', 'Sta stil bij de hoop tot de kar vol is. Rem en stuur zacht: elke bocht die te hard gaat strooit bieten over de weg.'],
  init: (level) => ({ phase: 'laden', fill: 0, load: 100, wait: 0, time: 0, limit: 220 - lvlK(level) * 40, delivered: false }),
  step(s, i, dt) {
    const ev = [];
    s.time += dt;
    if (s.time > s.limit) { ev.push({ type: 'fail', why: 'de campagne is voorbij: de fabriek is dicht' }); return ev; }
    if (s.phase === 'laden') {
      if (AT(i, 6, 0.5)) {
        s.fill = Math.min(1, s.fill + dt / 4);
        ev.push({ type: 'laden' });
        if (s.fill >= 1) { s.phase = 'rijden'; ev.push({ type: 'geladen' }); }
      }
      return ev;
    }
    if ((i.decel || 0) > 3.4 || (i.lat || 0) > 4) { s.load = Math.max(0, s.load - dt * 9); ev.push({ type: 'bieten' }); }
    if (s.load < 35) { ev.push({ type: 'fail', why: 'de kar is leeg gestrooid: de bieten liggen langs de weg' }); return ev; }
    if (AT(i, 7, 1)) { s.delivered = true; ev.push({ type: 'done' }); }
    return ev;
  },
  result: (s) => s.delivered ? pay(30 + s.load * 0.5, s.load > 85 ? 22 : s.load > 65 ? 8 : 0, s.load > 95, s.load > 95 ? 'Alle bieten aan boord afgeleverd!' : 'Bieten afgeleverd, een paar bleven onderweg.') : pay(0, 0, false, 'De bieten liggen nog bij de hoop.', true),
};

// 3. Herstelploeg: Delfstof Noord helpt dorpen met stutwerk en koffie. Vertrouwen groeit bij rustig rijden en stilstaan voor een praatje.
const herstelploeg = {
  id: 'herstelploeg', naam: 'Herstelploeg Delfstof Noord', bedrijf: 'Delfstof Noord', regio: 'hogeland', voertuig: 'bestelbus',
  plek: { wgs: [53.3322, 6.7459] },
  blurb: 'Een ploeg met stutmateriaal langs drie dorpen brengen',
  tagline: 'Geen wraak, geen ruzie: luister, help en drink een kop koffie.',
  intro: ['Delfstof Noord stuurt vandaag een herstelploeg langs drie dorpen met scheuren in de muren.', 'Rijd zacht door de dorpen. Sta bij elk huis even stil en luister: dat is het werk.'],
  init: (level) => ({ stops: 3, at: 0, wait: 0, trust: 100, limit: 15 - lvlK(level) * 2 }),
  step(s, i, dt) {
    const ev = [];
    if ((i.speed || 0) > s.limit) { s.trust = Math.max(0, s.trust - dt * 3); ev.push({ type: 'tehard' }); }
    if ((i.decel || 0) > 4) { s.trust = Math.max(0, s.trust - dt * 4); ev.push({ type: 'hardremmen' }); }
    if (s.trust <= 0) { ev.push({ type: 'fail', why: 'het dorp wil even niemand meer zien' }); return ev; }
    if (AT(i, 5, 0.5)) {
      s.wait += dt;
      if (s.wait >= 4) { s.wait = 0; s.at++; ev.push({ type: 'gehoord', n: s.at }); if (s.at >= s.stops) ev.push({ type: 'done' }); }
    } else s.wait = 0;
    return ev;
  },
  result: (s) => s.at >= s.stops
    ? pay(30 + s.stops * 12, s.trust > 85 ? 22 : s.trust > 60 ? 8 : 0, s.trust > 95, s.trust > 95 ? 'Drie dorpen, drie koppen koffie en geen klacht.' : 'De ploeg is overal geweest.')
    : pay(0, 0, false, 'De dorpen wachten nog.', true),
};

// 4. Live bij Radio Noordkust: drie plekken, per plek een kort live-venster waarin de camerabus stil moet staan voor een scherp beeld.
const oogtv = {
  id: 'oogtv', naam: 'Live bij Radio Noordkust', bedrijf: 'Radio Noordkust', regio: 'stad', voertuig: 'camerabus',
  plek: { stad: true },
  blurb: 'Een camerabus naar drie plekken rijden en live in beeld komen',
  tagline: 'Op de plek, stilstaan, en de verslaggever doet de rest.',
  intro: ['Radio Noordkust heeft een camerabus en een verslaggever zonder rijbewijs. Dat ben jij dus.', 'Op elke plek heb je een kort live-venster. Sta stil binnen de ring tot het beeld scherp is, en haal het venster.'],
  init: (level) => ({ spots: 3, at: 0, focus: 0, window: 50 - lvlK(level) * 15, left: null, missed: 0, rig: 0 }),
  step(s, i, dt) {
    const ev = [];
    if (s.left == null) s.left = s.window + 25;
    s.left -= dt;
    if (AT(i, 6, 0.4)) {
      s.focus += dt;
      if (s.focus >= 3) {
        s.at++; s.focus = 0; s.left = null;
        ev.push({ type: 'live', n: s.at });
        if (s.at + s.missed >= s.spots) ev.push({ type: 'done' });
        return ev;
      }
    } else s.focus = 0;
    if (s.left <= 0) {
      s.missed++; s.left = null; s.focus = 0;
      ev.push({ type: 'gemist' });
      if (s.missed >= 2) ev.push({ type: 'fail', why: 'twee keer geen beeld: de zender gaat over op muziek' });
      else if (s.at + s.missed >= s.spots) ev.push({ type: 'done' });
    }
    return ev;
  },
  result: (s) => s.missed >= 2 ? pay(0, 0, false, 'Geen beeld, wel een lange bus.', true)
    : pay(18 + s.at * 17, s.missed === 0 ? 24 : 0, s.missed === 0, s.missed === 0 ? 'Drie keer live, de verslaggever straalt.' : 'Twee keer live, één plek ging in de ruis.'),
};

// 5. Rave in het Telefoonhuis: te voet het volume regelen. Te zacht en de zaal loopt leeg, te hard en de buren bellen.
export const RAVE_PHASES = [
  { name: 'binnenkomst', lo: 3, hi: 6, len: 20 },
  { name: 'opbouw', lo: 5, hi: 8, len: 25 },
  { name: 'piek', lo: 7, hi: 9, len: 25 },
  { name: 'afbouw', lo: 3, hi: 6, len: 20 },
];
export const RAVE_LENGTH = RAVE_PHASES.reduce((a, p) => a + p.len, 0);
export const raveBand = (t) => {
  let a = 0;
  for (const p of RAVE_PHASES) { a += p.len; if (t < a) return p; }
  return RAVE_PHASES[RAVE_PHASES.length - 1];
};
const telefoonrave = {
  id: 'telefoonrave', naam: 'Rave in het Telefoonhuis', bedrijf: 'Stichting Oude Lijn', regio: 'stad', voertuig: null,
  plek: { gebouw: 'Telefoonhuis', fallback: [595, 636] },
  blurb: 'Het geluid regelen van een rave in een oud kantoor',
  tagline: 'Niet te zacht, niet te hard: de zaal en de buren hebben allebei een mening.',
  intro: ['In het oude Telefoonhuis is een rave. De geluidsman is ziek, dus jij staat aan de knoppen.', 'Pijl omhoog of 3 is harder, pijl omlaag of 1 zachter. Blijf in de groene band van het moment: de zaal wil volume, de buren willen slapen.'],
  init: () => ({ t: 0, vol: 5, mood: 100, annoy: 0, complaints: 0, inBand: 0, over: 0 }),
  step(s, i, dt) {
    const ev = [];
    s.t += dt;
    if (i.dir) s.vol = clamp(s.vol + Math.sign(i.dir), 0, 10);
    const b = raveBand(s.t);
    if (s.vol < b.lo) { s.mood = Math.max(0, s.mood - dt * 4); ev.push({ type: 'leeg' }); }
    else if (s.vol > b.hi) {
      s.annoy += dt;
      if (s.annoy >= 6) { s.annoy = 0; s.complaints++; ev.push({ type: 'klacht', n: s.complaints }); }
    } else { s.inBand += dt; s.annoy = Math.max(0, s.annoy - dt); s.mood = Math.min(100, s.mood + dt * 1.5); }
    if (s.mood <= 0) { ev.push({ type: 'fail', why: 'de zaal loopt leeg' }); return ev; }
    if (s.complaints >= 3) { ev.push({ type: 'fail', why: 'de buren bellen drie keer: het feest is uit' }); return ev; }
    if (s.t >= RAVE_LENGTH) ev.push({ type: 'done' });
    return ev;
  },
  result: (s) => (s.mood <= 0 || s.complaints >= 3) ? pay(0, 0, false, 'De avond is geen succes.', true)
    : pay(20 + s.inBand * 0.7, s.complaints === 0 && s.mood > 70 ? 24 : 0, s.complaints === 0 && s.mood > 85, s.complaints === 0 ? 'Het geluid zat goed, de buren sliepen door.' : `Feest gered, ${s.complaints} klacht${s.complaints > 1 ? 'en' : ''} van de buren.`),
};

export const STAD_MISSIES = [museumbus, suikerbieten, herstelploeg, oogtv, telefoonrave];
export const STAD_MISSIE_IDS = STAD_MISSIES.map((m) => m.id);
export const stadMissieById = (id) => STAD_MISSIES.find((m) => m.id === id) || null;

export function startStadRonde(id, level = 1) {
  const rule = stadMissieById(id);
  if (!rule) return null;
  return { rule, s: rule.init(level), level, events: [], over: null };
}

export function stapStadRonde(r, input, dt) {
  if (r.over) return [];
  const ev = r.rule.step(r.s, input || {}, dt);
  for (const e of ev) {
    r.events.push(e);
    if (e.type === 'fail') r.over = 'fail';
    else if (e.type === 'done' && !r.over) r.over = 'done';
  }
  return ev;
}

export const stadRondeResultaat = (r) => r.rule.result(r.s);

// Hoeveel doelen en welk nu (voertuigmissies). Suikerbieten: eerst de hoop, dan de fabriek.
export const STAD_DOELEN = {
  museumbus: { total: (s) => s.stops, at: (s) => s.at },
  suikerbieten: { total: () => 2, at: (s) => (s.phase === 'laden' ? 0 : 1) },
  herstelploeg: { total: (s) => s.stops, at: (s) => s.at },
  oogtv: { total: (s) => s.spots, at: (s) => s.at + s.missed },
};

export const STAD_MELDING = {
  kras: 'Pas op de lak, rustig aan!', foto: 'Foto genomen, de bus staat er mooi op.', laden: 'De bieten rollen de kar in.', geladen: 'Kar vol. Op naar de fabriek!',
  bieten: 'Bieten rollen van de kar!', tehard: 'Rustig door het dorp, hè.', hardremmen: 'Zachter remmen, mensen kijken.', gehoord: 'Je hebt geluisterd. Er komt koffie.',
  live: 'Je staat live! De verslaggever zwaait.', gemist: 'Het venster is dicht: geen beeld.', leeg: 'De zaal wordt stil: harder!', klacht: 'De buren bellen: zachter!',
};
