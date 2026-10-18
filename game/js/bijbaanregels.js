// Tien nieuwe bijbanen als pure regels (#192): elk met eigen mechaniek, regio,
// verzonnen bedrijf en uitbetaling. Geen THREE, geen wereld, geen Math.random:
// de regels krijgen een rng en een abstracte invoer, zodat ze getest en herhaald
// kunnen worden. Het sidejob-contract (sidejobs.js: start, round, update, view,
// c.complete / c.fail) krijgt later per baan een dunne adapter die plaatsen,
// voertuigen en klanten neerzet en deze regels voedt; zolang die adapters er
// niet zijn staan de banen niet in SIDE_JOBS en doen ze in het spel niets.
//
// Invoer per stap (alles optioneel, ontbrekend = 0 of false):
//   speed  m/s van het voertuig    decel  remvertraging m/s^2 (positief)
//   lat    zijdelingse versnelling m/s^2    dist   m tot het huidige doel
//   bump   botsing 0..1 sinds de vorige stap    act  de speler drukt op de actieknop
//   open   (brugwachter) de brug staat open
// Uitkomst van result(s): { base, tip, flawless, text, failed } in euro's; sidejobs.js past
// SIDEJOB_PAY_MULT en het niveau er zelf op toe.
//
// Alleen Nederlands, verzonnen bedrijven, geen getoond leed: een misser is een
// klacht, een boete of een natte lading, nooit een gewonde.

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const lvlK = (level) => clamp(((level || 1) - 1) / 4, 0, 1);       // 0 bij niveau 1 .. 1 bij niveau 5
const pay = (base, tip, flawless, text, failed = false) => ({ base: Math.max(0, Math.round(base)), tip: Math.max(0, Math.round(tip)), flawless: !!flawless, text, failed });

// ---------------------------------------------------------------------------------------------
// 1. Fietsbezorger: soep rondbrengen zonder te knoeien. Hard remmen en scherpe bochten morsen.
const fietsbezorger = {
  id: 'fietssoep', naam: 'Soepkoerier Zoep', bedrijf: 'Zoep Soepkeuken', regio: 'stad', voertuig: 'fiets',
  blurb: 'Soep per fiets rondbrengen zonder te knoeien',
  intro: ['Zoep Soepkeuken bezorgt warme soep per fiets.', 'Rem zacht en neem bochten rustig: elke knoeier kost je fooi.'],
  init: (level) => ({ drops: 3 + Math.round(lvlK(level) * 3), done: 0, spill: 0, maxSpill: 3 + (level >= 4 ? 0 : 1) }),
  step(s, i, dt) {
    const ev = [];
    if ((i.decel || 0) > 3.2 || (i.lat || 0) > 4.2) { s.spill = Math.min(s.maxSpill, s.spill + dt * 1.2); ev.push({ type: 'knoei' }); }
    if (s.spill >= s.maxSpill) { ev.push({ type: 'fail', why: 'de soep is leeg' }); return ev; }
    if ((i.dist ?? 99) < 3) { s.done++; ev.push({ type: 'drop', n: s.done }); if (s.done >= s.drops) ev.push({ type: 'done' }); }
    return ev;
  },
  result: (s) => s.done < s.drops ? pay(0, 0, false, 'De soep is koud geworden.', true)
    : pay(10 + s.drops * 7, Math.max(0, 14 - s.spill * 5), s.spill < 0.3, s.spill < 0.3 ? 'Geen druppel gemorst!' : 'Soep afgeleverd, met wat vlekken.'),
};

// 2. Taxichauffeur: de taximeter loopt mee met de afstand, het geduld van de klant loopt af bij te hard rijden en omwegen.
const taxichauffeur = {
  id: 'taxinacht', naam: 'Nachttaxi Noord', bedrijf: 'Taxi Noordoost', regio: 'stad', voertuig: 'auto',
  blurb: 'Klanten veilig en vlot thuisbrengen',
  intro: ['Taxi Noordoost: de meter loopt, de klant kijkt mee.', 'Te hard of een omweg? Dan zakt de fooi.'],
  init: (level) => ({ fare: 4, patience: 1, trip: 0, tripLen: 900 + lvlK(level) * 1200, distTravelled: 0, direct: 0 }),
  step(s, i, dt) {
    const ev = [];
    const d = (i.speed || 0) * dt;
    s.distTravelled += d;
    s.fare += d * 0.0022;
    if ((i.speed || 0) > 21) s.patience -= dt * 0.04;                      // boven ~75 km/u
    if ((i.decel || 0) > 4) s.patience -= dt * 0.1;
    if ((i.dist ?? 0) > (s.lastDist ?? Infinity) + 0.1 && (i.speed || 0) > 3) s.patience -= dt * 0.03;   // van het doel af
    s.lastDist = i.dist ?? s.lastDist;
    s.patience = clamp(s.patience, 0, 1);
    if (s.patience <= 0) { ev.push({ type: 'fail', why: 'de klant stapt boos uit' }); return ev; }
    if ((i.dist ?? 99) < 6 && (i.speed || 0) < 2) { s.arrived = true; ev.push({ type: 'done' }); }
    return ev;
  },
  result: (s) => s.arrived ? pay(s.fare, s.patience * 15, s.patience > 0.9, s.patience > 0.9 ? 'Een prettige rit, zegt de klant.' : 'Aangekomen, de klant zucht.') : pay(0, 0, false, 'De klant is weg.', true),
};

// 3. Veerboot: een vaste overtocht met een haven-snelheidslimiet en een meerpunt waar je binnen de marge aanlegt.
const veerboot = {
  id: 'veerdienst', naam: 'Veerdienst Lauwers', bedrijf: 'Veerdienst Lauwerszee', regio: 'wadden', voertuig: 'boot',
  blurb: 'Op tijd overvaren en netjes aanleggen',
  intro: ['Veerdienst Lauwerszee: op de dienstregeling, in de haven stapvoets.', 'Leg zacht aan bij de steiger.'],
  init: (level) => ({ limit: 2.5, speeding: 0, budget: 200 - lvlK(level) * 60, t: 0, bumps: 0, docked: false }),
  step(s, i, dt) {
    const ev = [];
    s.t += dt;
    if (i.harbour && (i.speed || 0) > s.limit) { s.speeding += dt; ev.push({ type: 'harbourSpeed' }); }
    s.bumps += i.bump || 0;
    if (s.t > s.budget) { ev.push({ type: 'fail', why: 'de dienstregeling is gemist' }); return ev; }
    if ((i.dist ?? 99) < 4 && (i.speed || 0) < 1) { s.docked = true; ev.push({ type: 'done' }); }
    return ev;
  },
  result: (s) => s.docked ? pay(60 + (1 - s.t / s.budget) * 40 - s.speeding * 2, s.bumps < 0.2 ? 20 : 0, s.speeding === 0 && s.bumps < 0.2, 'Veilig aan de steiger.') : pay(0, 0, false, 'De passagiers staan nog aan de kant.', true),
};

// 4. Trekkertransport: zware wagen met hooibalen. Bochten te snel nemen laat balen verschuiven en vallen.
const trekkertransport = {
  id: 'balenrit', naam: 'Balenrit', bedrijf: 'Loonbedrijf Hooiland', regio: 'oldambt', voertuig: 'trekker',
  blurb: 'Hooibalen vervoeren zonder verlies',
  intro: ['Loonbedrijf Hooiland: tien balen, één wagen, geen haast.', 'Taai door de bochten: elke bocht te snel kost een baal.'],
  init: (level) => ({ bales: 10, lost: 0, limit: 4.0 - lvlK(level) * 1.2, dropped: false, dist: 0 }),
  step(s, i, dt) {
    const ev = [];
    if ((i.lat || 0) > s.limit && s.bales > 0) {
      s.shift = (s.shift || 0) + dt;
      if (s.shift > 0.8) { s.shift = 0; s.bales--; s.lost++; ev.push({ type: 'baalWeg', left: s.bales }); }
    } else s.shift = Math.max(0, (s.shift || 0) - dt);
    if (s.bales < 5) { ev.push({ type: 'fail', why: 'te veel balen verloren' }); return ev; }
    if ((i.dist ?? 99) < 5) { s.dropped = true; ev.push({ type: 'done' }); }
    return ev;
  },
  result: (s) => s.dropped ? pay(s.bales * 9, s.lost === 0 ? 25 : 0, s.lost === 0, s.lost === 0 ? 'Alle balen heel!' : `${s.bales} balen afgeleverd.`) : pay(0, 0, false, 'De wagen is half leeg.', true),
};

// 5. Kermisexploitant: een attractie in drie fases (instappen, draaien, uitstappen); op het juiste moment op de knop.
const kermisexploitant = {
  id: 'kermisdraai', naam: 'Kermisexploitant', bedrijf: 'Kermis De Vrolijke Tol', regio: 'stad', voertuig: null,
  blurb: 'Een attractie draaiende houden',
  intro: ['Kermis De Vrolijke Tol: laad in, draai, laad uit.', 'Druk op het juiste moment: te vroeg en de rij ziet het, te laat en ze worden ongeduldig.'],
  init: (level) => ({ phase: 'laden', clock: 0, window: [1.2, 2.2 - lvlK(level) * 0.8], rides: 0, target: 3 + Math.round(lvlK(level) * 3), happy: 1, perfect: 0 }),
  step(s, i, dt) {
    const ev = [];
    s.clock += dt;
    const lenOf = { laden: 4, draaien: 5, laden_uit: 3 };
    const [from, to] = s.window;
    if (i.act) {
      const inWindow = s.clock >= from && s.clock <= to + from;
      if (inWindow) { s.perfect++; ev.push({ type: 'goed', phase: s.phase }); s.clock = lenOf[s.phase]; }
      else { s.happy = clamp(s.happy - 0.12, 0, 1); ev.push({ type: 'fout', phase: s.phase }); }
    }
    if (s.clock >= lenOf[s.phase]) {
      s.clock = 0;
      s.phase = s.phase === 'laden' ? 'draaien' : s.phase === 'draaien' ? 'laden_uit' : 'laden';
      if (s.phase === 'laden') { s.rides++; ev.push({ type: 'rit', n: s.rides }); if (s.rides >= s.target) ev.push({ type: 'done' }); }
    }
    s.happy = clamp(s.happy - dt * 0.004, 0, 1);
    if (s.happy <= 0.05) ev.push({ type: 'fail', why: 'de rij loopt weg' });
    return ev;
  },
  result: (s) => s.rides >= s.target ? pay(15 + s.rides * 12, s.happy * 20, s.happy > 0.9, 'De kermis draait weer!') : pay(0, 0, false, 'De rij is naar de botsauto\'s.', true),
};

// 6. Bergingsdienst: eerst stil bij het wrak blijven om aan te haken, dan slepen onder een snelheidslimiet.
const bergingsdienst = {
  id: 'berging', naam: 'Bergingsdienst', bedrijf: 'Berging Hunsingo', regio: 'hogeland', voertuig: 'sleepwagen',
  blurb: 'Een gestrande auto ophalen en wegslepen',
  intro: ['Berging Hunsingo: haak aan en sleep naar de garage.', 'Aanhaken kost twee seconden stilstaan. Sleep daarna zacht.'],
  init: (level) => ({ hook: 0, hooked: false, damage: 0, limit: 14 - lvlK(level) * 3, delivered: false }),
  step(s, i, dt) {
    const ev = [];
    if (!s.hooked) {
      if ((i.dist ?? 99) < 3.5 && (i.speed || 0) < 0.6) {
        s.hook += dt;
        if (s.hook >= 2) { s.hooked = true; ev.push({ type: 'aangehaakt' }); }
      } else s.hook = 0;
      return ev;
    }
    if ((i.speed || 0) > s.limit) s.damage += dt * 0.08;
    s.damage += (i.bump || 0) * 0.5;
    if (s.damage >= 1) { ev.push({ type: 'fail', why: 'de auto is losgeraakt' }); return ev; }
    if ((i.dist ?? 99) < 5 && (i.speed || 0) < 1.5) { s.delivered = true; ev.push({ type: 'done' }); }
    return ev;
  },
  result: (s) => s.delivered ? pay(55 + (1 - s.damage) * 25, s.damage < 0.1 ? 20 : 0, s.damage < 0.1, 'Netjes afgeleverd bij de garage.') : pay(0, 0, false, 'De auto staat nog langs de weg.', true),
};

// 7. Strandwacht: patrouilleren; een oproep (zwemmer in problemen) moet binnen de tijd beantwoord worden door er te komen en de actieknop (fluit).
const strandwacht = {
  id: 'strandpost', naam: 'Strandwacht', bedrijf: 'Strandpost De Dollard', regio: 'eemsdelta', voertuig: 'quad',
  blurb: 'Het strand bewaken en oproepen beantwoorden',
  intro: ['Strandpost De Dollard: houd het water in de gaten.', 'Bij een oproep ben je er snel, en je fluit.'],
  init: (level, rng) => ({ calls: 2 + Math.round(lvlK(level) * 3), answered: 0, missed: 0, active: null, gap: 8 + rng() * 6, t: 0, limit: 40 - lvlK(level) * 14, rng }),
  step(s, i, dt) {
    const ev = [];
    s.t += dt;
    if (!s.active) {
      s.gap -= dt;
      if (s.gap <= 0 && s.answered + s.missed < s.calls) { s.active = { left: s.limit }; ev.push({ type: 'oproep' }); }
    } else {
      s.active.left -= dt;
      if ((i.dist ?? 99) < 4 && i.act) { s.answered++; s.active = null; s.gap = 6 + s.rng() * 6; ev.push({ type: 'geholpen', n: s.answered }); }
      else if (s.active.left <= 0) { s.missed++; s.active = null; s.gap = 6 + s.rng() * 6; ev.push({ type: 'gemist' }); }
    }
    if (s.missed >= 2) ev.push({ type: 'fail', why: 'twee oproepen gemist' });
    else if (s.answered + s.missed >= s.calls && !s.active) ev.push({ type: 'done' });
    return ev;
  },
  result: (s) => s.missed >= 2 ? pay(0, 0, false, 'Te veel oproepen gemist.', true) : pay(10 + s.answered * 14, s.missed === 0 ? 18 : 0, s.missed === 0, s.missed === 0 ? 'Alle oproepen beantwoord!' : 'Dienst gedraaid, een oproep gemist.'),
};

// 8. Schoolbus: haltes in volgorde, nooit te hard, nooit een halte overslaan; zacht optrekken en remmen.
const schoolbus = {
  id: 'schoolrit', naam: 'Schoolbus', bedrijf: 'Schoolvervoer Westerkwartier', regio: 'westerkwartier', voertuig: 'bus',
  blurb: 'Kinderen veilig naar school brengen',
  intro: ['Schoolvervoer Westerkwartier: halte voor halte naar school.', 'Rijd rustig. Alles boven de limiet kost je punten.'],
  init: (level) => ({ stops: 3 + Math.round(lvlK(level) * 2), at: 0, points: 10, limit: 13.8 - lvlK(level) * 2.5, wait: 0 }),
  step(s, i, dt) {
    const ev = [];
    if ((i.speed || 0) > s.limit) { s.points -= dt * 0.8; ev.push({ type: 'tehard' }); }
    if ((i.decel || 0) > 3.5) { s.points -= dt * 1.5; ev.push({ type: 'hardremmen' }); }
    s.points = Math.max(0, s.points);
    if (s.points <= 0) { ev.push({ type: 'fail', why: 'de school belt: dit gaat zo niet' }); return ev; }
    if ((i.dist ?? 99) < 4 && (i.speed || 0) < 0.4) {
      s.wait += dt;
      if (s.wait >= 1.5) { s.wait = 0; s.at++; ev.push({ type: 'halte', n: s.at }); if (s.at >= s.stops) ev.push({ type: 'done' }); }
    } else s.wait = 0;
    return ev;
  },
  result: (s) => s.at >= s.stops ? pay(20 + s.stops * 9, s.points * 2, s.points > 9, s.points > 9 ? 'Alle kinderen op tijd, rustig gereden.' : 'Op school aangekomen.') : pay(0, 0, false, 'De kinderen zijn te laat.', true),
};

// 9. Melkrijder: melk warmt op tijdens de rit; de rit moet af voordat de tank te warm wordt, en elke boerderij vult de tank aan.
const melkrijder = {
  id: 'melkrit', naam: 'Melkrijder', bedrijf: 'Zuivel Noordpolder', regio: 'veenkolonien', voertuig: 'tankwagen',
  blurb: 'Melk ophalen en op tijd bij de fabriek afleveren',
  intro: ['Zuivel Noordpolder: de melk moet koud blijven.', 'Elke boerderij is een halte; de klok loopt, en de tank warmt langzaam op.'],
  init: (level) => ({ farms: 3 + Math.round(lvlK(level) * 2), at: 0, temp: 4, heat: 0.04 + lvlK(level) * 0.03, litres: 0, delivered: false }),
  step(s, i, dt) {
    const ev = [];
    s.temp += s.heat * dt * (1 + s.at * 0.2);
    if (s.temp >= 12) { ev.push({ type: 'fail', why: 'de melk is warm geworden' }); return ev; }
    if (s.at < s.farms) {
      if ((i.dist ?? 99) < 4 && (i.speed || 0) < 0.6) { s.at++; s.litres += 1500; ev.push({ type: 'boerderij', n: s.at }); }
    } else if ((i.dist ?? 99) < 6 && (i.speed || 0) < 1) { s.delivered = true; ev.push({ type: 'done' }); }
    return ev;
  },
  result: (s) => s.delivered ? pay(s.litres / 100 * 1.1, s.temp < 7 ? 25 : s.temp < 9 ? 10 : 0, s.temp < 7, s.temp < 7 ? 'Ijskoud afgeleverd!' : 'Melk afgeleverd, nét op tijd.') : pay(0, 0, false, 'De melk is zuur.', true),
};

// 10. Brugwachter: een rij boten en auto's wacht; open de brug als er genoeg boten zijn, sluit hem voordat het autoverkeer te lang staat.
const brugwachter = {
  id: 'brugdienst', naam: 'Brugwachter', bedrijf: 'Brugdienst Damsterdiep', regio: 'eemsdelta', voertuig: null,
  blurb: 'De brug op het juiste moment openen en sluiten',
  intro: ['Brugdienst Damsterdiep: boten willen erdoor, auto\'s willen erover.', 'Open op tijd, sluit op tijd. Niemand wacht graag.'],
  init: (level, rng) => ({ boats: 0, cars: 0, open: false, shift: 0, length: 90, passed: 0, wait: 0, complaints: 0, rng, rate: 0.35 + lvlK(level) * 0.35, openT: 0 }),
  step(s, i, dt) {
    const ev = [];
    s.shift += dt;
    if (s.rng() < s.rate * 0.12 * dt * 10) s.boats++;
    if (s.rng() < s.rate * 0.5 * dt * 10) s.cars++;
    if (i.act) { s.open = !s.open; s.openT = 0; ev.push({ type: s.open ? 'open' : 'dicht' }); }
    s.openT += dt;
    if (s.open) {
      if (s.openT > 4 && s.boats > 0) { s.boats--; s.passed++; s.openT = 1; ev.push({ type: 'bootDoor' }); }
      s.wait += (s.cars > 0 ? s.cars : 0) * dt * 0.02;
      if (s.cars > 6 && !s.warned) { s.warned = true; s.complaints++; ev.push({ type: 'klacht' }); }
    } else {
      s.warned = false;
      if (s.cars > 0) { s.cars = Math.max(0, s.cars - dt * 1.2); }
      s.wait += s.boats * dt * 0.05;
    }
    if (s.complaints >= 4) { ev.push({ type: 'fail', why: 'te veel klachten' }); return ev; }
    if (s.shift >= s.length) ev.push({ type: 'done' });
    return ev;
  },
  result: (s) => s.complaints >= 4 ? pay(0, 0, false, 'De gemeente wil een gesprek.', true) : pay(12 + s.passed * 12, Math.max(0, 20 - s.complaints * 8 - s.wait), s.complaints === 0, s.complaints === 0 ? 'Geen klachten, wel veel schepen.' : `Dienst gedraaid, ${s.complaints} klachten.`),
};

export const BIJBANEN = [fietsbezorger, taxichauffeur, veerboot, trekkertransport, kermisexploitant, bergingsdienst, strandwacht, schoolbus, melkrijder, brugwachter];
export const BIJBAAN_IDS = BIJBANEN.map((b) => b.id);
export const bijbaanById = (id) => BIJBANEN.find((b) => b.id === id) || null;

// Een schone ronde starten: { rule, s } met de rng van de ronde.
export function startRonde(id, level = 1, rng = Math.random) {
  const rule = bijbaanById(id);
  if (!rule) return null;
  return { rule, s: rule.init(level, rng), level, events: [], over: null };
}

// Eén stap met invoer; geeft de gebeurtenissen en zet `over` ('done' | 'fail') bij het einde.
export function stapRonde(r, input, dt) {
  if (r.over) return [];
  const ev = r.rule.step(r.s, input || {}, dt);
  for (const e of ev) {
    r.events.push(e);
    if (e.type === 'fail') r.over = 'fail';
    else if (e.type === 'done' && !r.over) r.over = 'done';
  }
  return ev;
}

export const rondeResultaat = (r) => r.rule.result(r.s);

// Hoeveel doelen een ronde heeft en welke de huidige is, per baan.
export const DOELEN = {
  fietssoep: { total: (s) => s.drops, at: (s) => s.done },
  taxinacht: { total: () => 1, at: () => 0 },
  balenrit: { total: () => 1, at: () => 0 },
  berging: { total: () => 2, at: (s) => (s.hooked ? 1 : 0) },
  schoolrit: { total: (s) => s.stops, at: (s) => s.at },
  melkrit: { total: (s) => s.farms + 1, at: (s) => Math.min(s.at, s.farms) },
};
