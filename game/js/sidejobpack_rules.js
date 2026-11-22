// Het bijbanenpakket van 22-11: vier korte, zoete bijbaantjes in Grunn die bij Tammo en Tessa passen. Alles hier is puur (geen DOM,
// geen THREE, geen Math.random: de regels krijgen een rng en een abstracte invoer), zodat de regels getest en herhaald kunnen worden.
// sidejob_pack.js is de dunne adapter op het sidejob-contract van sidejobs.js; scripts/sidejobpack_test.mjs dekt dit bestand.
//
//   vismarktkoerier  fiets, de Vismarkt: de vis moet koud en heel aankomen (ijs smelt, schudden kost ijs)   - vak Bezorging
//   studentenfeest   te voet, bar: de gast zegt wat hij wil, jij kiest het juiste drankje op tijd (1, 2, 3)  - vak Horeca
//   marktkraam       te voet, de kraam: weeg de bestelling af op gewicht (1 minder, 3 meer, 2 afrekenen)      - vak Landbouw
//   toeristengids    te voet, de Martinitoren: loop naar de stops en kies het verhaal dat de groep wil horen - vak Podium
//
// Geen leed en geen echte merken of personen: een misser is een klacht, een smeltend ijsblok of een kip op de weegschaal. Alle bedrijven
// en namen zijn verzonnen (constitution 2). De uitkomst van een ronde is { base, tip, flawless, text, failed } in euro's; sidejobs.js
// past SIDEJOB_PAY_MULT, het niveau en de loopbaanfactor er zelf op toe en de beloning is per speler (#429).
//
// Invoer per stap (alles optioneel):
//   vismarktkoerier  { decel, lat, dist }              remvertraging, zijdelingse versnelling, afstand tot het doel
//   studentenfeest   { pick }                          0, 1 of 2: het gekozen drankje
//   marktkraam       { dir, confirm }                  dir -1 of 1: 50 gram minder of meer; confirm: afrekenen
//   toeristengids    { dist, pick }                    afstand tot de stop; pick 0, 1 of 2: het gekozen verhaal
import { makeRng } from './minigamekit.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lvlK = (level) => clamp(((level || 1) - 1) / 4, 0, 1);       // 0 bij niveau 1 .. 1 bij niveau 5
const rngOf = (r) => (typeof r === 'function' ? r : makeRng(r || 1));
const pickOf = (list, rng) => list[Math.floor(rng() * list.length)];
const payout = (base, tip, flawless, text, failed = false) => ({ base: Math.max(0, Math.round(base)), tip: Math.max(0, Math.round(tip)), flawless: !!flawless, text, failed });

function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// --- de vier banen: gegevens voor de adapter, de banen-app, de gate en de docs ------------------------------------------------
// vak: het loopbaanvak (loopbaan.js BAAN_VAK); family: 'dienst' of 'kantoorklus' (sidejobprofiel.js); glyph: een bestaand kaartpictogram.
// place: waar de baan begint (een landmark uit de kaart of een straat); fallback: een open plek als de kaart die niet kent.
export const PACK_JOBS = {
  vismarktkoerier: {
    id: 'vismarktkoerier', name: 'Vismarktkoerier', firm: 'Vishandel De Zilveren Brasem', boss: 'Visboer Dobbe', vak: 'bezorg', family: 'dienst', glyph: 'fietsdepot', color: '#3b8ad0',
    place: { landmark: 'Vismarkt', fallback: [213.81, 9.9] },
    blurb: 'Breng verse vis per fiets van de Vismarkt naar de restaurants, met het ijs nog heel',
    tagline: 'Vishandel De Zilveren Brasem: rij rustig, het ijs smelt in de zon.',
    intro: [
      'Visboer Dobbe vult een kist met ijs en verse vis: die moet naar de terrassen rond de Vismarkt, per fiets.',
      'Rem zacht en neem bochten rustig. Elke schok kost ijs en elke minuut in de zon ook, maar de koks geven bij elk adres een schep ijs terug.',
    ],
    boss1: 'Visboer Dobbe: "Tessa zei dat jij snel kon trappen. Tammo zei dat je ook kunt remmen. Ik hoop op allebei."',
    bossStop: 'Visboer Dobbe: "De kist is leeg, het ijs is op. Ik doe wel net alsof ik het niet zie."',
  },
  studentenfeest: {
    id: 'studentenfeest', name: 'Bediening op het studentenfeest', firm: 'Studentenhuis De Slapeloze Slak', boss: 'Feestcommissaris Lotte', vak: 'horeca', family: 'kantoorklus', glyph: 'snackbar', color: '#a05ab0',
    place: { street: 'Poelestraat', fallback: [213.81, 9.9] },
    blurb: 'Schenk de juiste drankjes op het studentenfeest, voor de gast je ongeduldig aankijkt',
    tagline: 'Studentenhuis De Slapeloze Slak: de gast zegt wat hij wil, jij kiest het juiste drankje. Alles zonder alcohol.',
    intro: [
      'Feestcommissaris Lotte heeft een tekort aan bediening: de gasten komen binnen voor de dorst, niet voor de gezelligheid.',
      'Luister naar wat de gast zegt en kies met 1, 2 of 3 het drankje dat past. Te lang wachten en de gast loopt naar de buurman.',
    ],
    boss1: 'Feestcommissaris Lotte: "Tammo kent iedereen in de commissie, dus iemand moest je wel aannemen. Niet te veel morsen."',
    bossStop: 'Feestcommissaris Lotte: "Het feest gaat door, ook zonder jou. Dat was ook het plan."',
  },
  marktkraam: {
    id: 'marktkraam', name: 'Boerenmarktkraam', firm: 'Boerderij De Blije Bonk', boss: 'Boerin Aaltje', vak: 'landbouw', family: 'kantoorklus', glyph: 'suikerbieten', color: '#7a8a3a',
    place: { landmark: 'Grote Markt', fallback: [213.81, 9.9] },
    blurb: 'Weeg kaas, aardappelen en bessen af op de boerenmarkt, op de gram nauwkeurig',
    tagline: 'Boerderij De Blije Bonk: weeg af wat de klant vraagt: niet te veel en niet te weinig. Pas op voor de kip.',
    intro: [
      'Boerin Aaltje staat met haar kraam op de boerenmarkt en haar handen vol: kun jij even afwegen?',
      'Druk 1 voor minder, 3 voor meer en 2 om af te rekenen. Te veel weggeven is zonde, te weinig is een klacht, en de kip springt wanneer ze wil op de weegschaal.',
    ],
    boss1: 'Boerin Aaltje: "Tessa kent mij van de markt. Ze zei: die kan het wel. Ik zei: weeg het dan maar eens."',
    bossStop: 'Boerin Aaltje: "Geen punt. De kaas wacht wel, die is gewend aan wachten."',
  },
  toeristengids: {
    id: 'toeristengids', name: 'Toeristengids bij de Martinitoren', firm: 'Gidsenbureau De Verdwaalde Toerist', boss: 'Gids Hindrik', vak: 'podium', family: 'kantoorklus', glyph: 'vigilantia', color: '#d8a31c',
    place: { landmark: 'Martinitoren', fallback: [213.81, 9.9] },
    blurb: 'Loop met een groep toeristen langs drie stops en vertel het verhaal dat ze willen horen',
    tagline: 'Gidsenbureau De Verdwaalde Toerist: elke groep wil iets anders horen: vraag, luister en vertel.',
    intro: [
      'Gids Hindrik heeft een groep bij de Martinitoren en een stem die het begeeft: kun jij het van hem overnemen?',
      'Loop naar de stops. Per stop zegt de groep wat ze willen: geschiedenis, een grap of een uitzicht. Kies met 1, 2 of 3 het verhaal dat past.',
    ],
    boss1: 'Gids Hindrik: "Tammo zei dat jij alles over de stad wist. Ik zei: dat zullen we nog zien. Begin maar."',
    bossStop: 'Gids Hindrik: "De groep vindt zelf wel een terras. Dat vinden ze altijd."',
  },
};
export const PACK_IDS = Object.keys(PACK_JOBS);
export const packJob = (id) => (Object.prototype.hasOwnProperty.call(PACK_JOBS, id) ? PACK_JOBS[id] : null);

// --- de ontgrendelpoort: een loopbaan komt pas vrij via het verhaal (unlockgate.js, #1131) -------------------------------------
// Geen harde muur voor een oude save of voor wie het vak al begonnen is. `gate` is { open(vak), begun(vak), hint(vak) }: de
// adapter geeft storyquery.js en loopbaanlive.js mee, de test geeft een mock. Geeft null als de baan open is, anders de zachte
// hint van het personage dat het vak inleidt.
export function gateReason(id, gate) {
  const job = packJob(id);
  if (!job) return 'Die bijbaan kennen we niet.';
  if (!gate) return null;
  if (typeof gate.begun === 'function' && gate.begun(job.vak)) return null;
  if (typeof gate.open === 'function' && gate.open(job.vak)) return null;
  return (typeof gate.hint === 'function' && gate.hint(job.vak)) || 'Dit komt later in het verhaal.';
}

// --- 1. Vismarktkoerier ------------------------------------------------------------------------------------------------------
export const FISH = { melt: 0.0036, refill: 0.12, shakeDecel: 3.4, shakeLat: 4.4, shakeLoss: 0.01, base: 12, perStop: 8, tipMax: 16 };

function initFish(level) {
  const k = lvlK(level);
  return { stops: 3 + Math.round(k * 2), done: 0, ice: 1, shake: 0, maxShake: level >= 4 ? 3 : 4, t: 0 };
}
function stepFish(s, i, dt) {
  const ev = [];
  s.t += dt;
  s.ice = clamp(s.ice - dt * FISH.melt, 0, 1);
  if ((i.decel || 0) > FISH.shakeDecel || (i.lat || 0) > FISH.shakeLat) {
    s.shake = Math.min(s.maxShake, s.shake + dt * 1.2);
    s.ice = clamp(s.ice - dt * FISH.shakeLoss, 0, 1);
    ev.push({ type: 'shake' });
  }
  if (s.ice <= 0) { ev.push({ type: 'fail', why: 'het ijs is gesmolten en de vis is niet meer fris' }); return ev; }
  if (s.shake >= s.maxShake) { ev.push({ type: 'fail', why: 'de kist is te veel door elkaar geschud' }); return ev; }
  if ((i.dist ?? 99) < 3) {
    s.done++;
    s.ice = clamp(s.ice + FISH.refill, 0, 1);
    ev.push({ type: 'delivered', n: s.done });
    if (s.done >= s.stops) ev.push({ type: 'done' });
  }
  return ev;
}
function resultFish(s) {
  if (s.done < s.stops) return payout(0, 0, false, 'De vis ligt nog in de zon.', true);
  const fresh = s.ice > 0.5 && s.shake < 0.5;
  return payout(FISH.base + s.stops * FISH.perStop, s.ice * FISH.tipMax, fresh,
    fresh ? 'Ijskoud afgeleverd: de koks willen alleen nog jou.' : 'Afgeleverd, de vis lag een beetje warm.');
}

// --- 2. Studentenfeest -------------------------------------------------------------------------------------------------------
// De drankjes zijn alle vier zonder alcohol (soort: fris, wakker, warm, zuivel); elke gast zegt in gewone woorden welke soort hij wil.
export const DRINKS = [
  { id: 'ranja', label: 'Een glas ranja met ijs', kind: 'fris' },
  { id: 'spuitwater', label: 'Spuitwater met een schijfje citroen', kind: 'fris' },
  { id: 'koffie', label: 'Een sterke koffie', kind: 'wakker' },
  { id: 'thee', label: 'Zwarte thee, extra sterk', kind: 'wakker' },
  { id: 'chocomel', label: 'Een warme chocolademelk', kind: 'warm' },
  { id: 'kruidenthee', label: 'Een kop hete kruidenthee', kind: 'warm' },
  { id: 'karnemelk', label: 'Een glas karnemelk', kind: 'zuivel' },
  { id: 'yoghurt', label: 'Een bekertje drinkyoghurt', kind: 'zuivel' },
];
export const DRINK_KINDS = ['fris', 'wakker', 'warm', 'zuivel'];
export const GUESTS = [
  { id: 'tentamen', kind: 'wakker', ask: 'Ik heb morgen om negen uur tentamen. Geef mij iets waar ik wakker van word.', right: 'Mijn hart klopt sneller. Voor de wetenschap, hoor.', wrong: 'Hier word ik alleen maar slaperiger van. Maar bedankt.' },
  { id: 'hitte', kind: 'fris', ask: 'Het is snikheet in deze zaal. Iets kouds en fris, graag!', right: 'Koud! Ik hou van je. Niet op een enge manier.', wrong: 'Dit is lauw. Mijn dorst is er niet blijer door.' },
  { id: 'airco', kind: 'warm', ask: 'De airco blaast mij in mijn nek. Heb je iets warms om vast te houden?', right: 'Heerlijk. Nu voel ik mijn vingers weer.', wrong: 'Mijn handen zijn nog steeds ijsblokjes.' },
  { id: 'koe', kind: 'zuivel', ask: 'Ik ben een echte Groninger. Geef mij maar iets uit de koe.', right: 'Zo hoort het. Mijn oma zou trots zijn.', wrong: 'Dit komt niet uit een koe. Ik voel het.' },
  { id: 'dans', kind: 'fris', ask: 'Ik heb net drie uur gedanst. Alles mag, als het maar koud en fris is.', right: 'Ah. Mijn voeten leven weer.', wrong: 'Ik ben nog steeds dorstig, en nu ook teleurgesteld.' },
  { id: 'verliefd', kind: 'warm', ask: 'Ik ben verliefd en mijn handen zijn koud. Geef mij iets warms, dan durf ik hem aan te spreken.', right: 'Het werkt! Hij kijkt al.', wrong: 'Nu zijn mijn handen koud en zit ik alleen.' },
  { id: 'dj', kind: 'wakker', ask: 'Ik ben de dj. Nog twee uur draaien en ik zie nu al dubbel. Iets met veel pit, alsjeblieft.', right: 'Ik zie weer één zaal. Dank je, hoor.', wrong: 'Ik draai door, maar het wordt wel een slaapliedje.' },
  { id: 'oma', kind: 'zuivel', ask: 'Mijn oma zei altijd dat een glas karnemelk of yoghurt alles oplost. Heb je dat?', right: 'Oma had gelijk. Zoals altijd.', wrong: 'Oma zou dit niet goedkeuren.' },
];
export const PARTY = { base: 10, perGood: 9, tipFast: 4, tipClean: 8, maxMiss: 3 };

function initParty(level, rng) {
  const k = lvlK(level);
  const n = 5 + Math.round(k * 3);
  const orders = [];
  let prev = null;
  for (let g = 0; g < n; g++) {
    let guest;
    do guest = pickOf(GUESTS, rng); while (guest === prev && GUESTS.length > 1);
    prev = guest;
    const right = DRINKS.filter((d) => d.kind === guest.kind);
    const wrong = DRINKS.filter((d) => d.kind !== guest.kind);
    const good = pickOf(right, rng);
    const w1 = pickOf(wrong, rng);
    const w2 = pickOf(wrong.filter((d) => d !== w1 && d.kind !== w1.kind), rng);
    const options = shuffle([good, w1, w2], rng);
    orders.push({ guest, options, right: options.indexOf(good) });
  }
  return { orders, i: 0, t: 0, time: 10 - k * 3, good: 0, fast: 0, wrong: 0, late: 0, maxMiss: PARTY.maxMiss };
}
function stepParty(s, i, dt) {
  const ev = [];
  const o = s.orders[s.i];
  if (!o) return [{ type: 'done' }];
  s.t += dt;
  const n = s.orders.length;
  if (Number.isInteger(i.pick) && i.pick >= 0 && i.pick < o.options.length) {
    if (i.pick === o.right) {
      const fast = s.t <= s.time / 2;
      s.good++;
      if (fast) s.fast++;
      ev.push({ type: 'good', fast, text: o.guest.right });
    } else {
      s.wrong++;
      ev.push({ type: 'wrong', text: o.guest.wrong });
    }
    s.i++; s.t = 0;
  } else if (s.t >= s.time) {
    s.late++;
    ev.push({ type: 'late', text: 'Dit duurt te lang. Ik ga naar de buurman.' });
    s.i++; s.t = 0;
  }
  if (s.wrong + s.late >= s.maxMiss) { ev.push({ type: 'fail', why: 'te veel klachten aan de bar' }); return ev; }
  if (s.i >= n) ev.push({ type: 'done' });
  return ev;
}
function resultParty(s) {
  if (s.i < s.orders.length) return payout(0, 0, false, 'De bar staat vol lege glazen.', true);
  const clean = s.wrong + s.late === 0;
  return payout(PARTY.base + s.good * PARTY.perGood, s.fast * PARTY.tipFast + (clean ? PARTY.tipClean : 0), clean,
    clean ? 'Geen gast ontevreden: de commissie wil een foto van jou achter de bar.' : `${s.good} van ${s.orders.length} gasten blij geholpen.`);
}

// --- 3. Boerenmarktkraam -----------------------------------------------------------------------------------------------------
// Een ons is 100 gram en een pond 500 gram, zoals op de markt. Alles gaat in stappen van 50 gram.
export const STEP_G = 50;
export const MAX_G = 3000;
export const PRODUCTS = [
  { id: 'kaas', name: 'boerenkaas', asks: [{ g: 250, say: 'een half pond' }, { g: 500, say: 'een pond' }, { g: 750, say: 'driekwart kilo' }, { g: 1000, say: 'twee pond' }] },
  { id: 'aardappel', name: 'aardappelen', asks: [{ g: 1000, say: 'twee pond' }, { g: 1500, say: 'drie pond' }, { g: 2000, say: 'vier pond' }] },
  { id: 'bessen', name: 'kruisbessen', asks: [{ g: 250, say: 'een half pond' }, { g: 500, say: 'een pond' }] },
  { id: 'worst', name: 'droge worst', asks: [{ g: 200, say: 'twee ons' }, { g: 300, say: 'drie ons' }, { g: 400, say: 'vier ons' }] },
];
export const MARKET = { base: 8, perfect: 11, close: 8, over: 5, under: 2, tipAll: 14, tipEach: 2, maxComplaints: 3 };

// De uitkomst van één afweging, uit het gevraagde en het gewogen gewicht: 'perfect', 'close', 'over' (te veel) of 'under' (te weinig).
export function judgeWeight(target, grams, tol) {
  const d = grams - target;
  if (Math.abs(d) <= tol) return 'perfect';
  if (Math.abs(d) <= tol * 3) return 'close';
  return d > 0 ? 'over' : 'under';
}

function initMarket(level, rng) {
  const k = lvlK(level);
  const n = 5 + Math.round(k * 2);
  const orders = [];
  let prev = null;
  for (let c = 0; c < n; c++) {
    let product;
    do product = pickOf(PRODUCTS, rng); while (product === prev && PRODUCTS.length > 1);
    prev = product;
    const ask = pickOf(product.asks, rng);
    orders.push({ product, target: ask.g, say: ask.say, henAt: rng() < 0.4 + k * 0.25 ? 3 + rng() * 8 : null, hen: false });
  }
  return { orders, i: 0, grams: 0, t: 0, time: 25 - k * 5, tol: 50 - 25 * k, perfect: 0, close: 0, over: 0, under: 0, complaints: 0, maxComplaints: MARKET.maxComplaints };
}
function nextCustomer(s) { s.i++; s.grams = 0; s.t = 0; }
function stepMarket(s, i, dt) {
  const ev = [];
  const o = s.orders[s.i];
  if (!o) return [{ type: 'done' }];
  s.t += dt;
  if (o.henAt != null && !o.hen && s.t >= o.henAt && s.grams > 0) {
    o.hen = true;
    s.grams = clamp(s.grams + 100, 0, MAX_G);
    ev.push({ type: 'hen', text: 'Een kip springt op de weegschaal en gaat er niet meer af. Er komen honderd gram bij.' });
  }
  if (i.dir) s.grams = clamp(s.grams + (i.dir > 0 ? STEP_G : -STEP_G), 0, MAX_G);
  if (i.confirm && s.grams > 0) {
    const r = judgeWeight(o.target, s.grams, s.tol);
    s[r]++;
    if (r === 'under') s.complaints++;
    ev.push({ type: r, grams: s.grams, target: o.target });
    nextCustomer(s);
  } else if (s.t >= s.time) {
    s.complaints++;
    ev.push({ type: 'gone', text: 'De klant loopt door naar de buurkraam.' });
    nextCustomer(s);
  }
  if (s.complaints >= s.maxComplaints) { ev.push({ type: 'fail', why: 'de klanten lopen naar de buurkraam' }); return ev; }
  if (s.i >= s.orders.length) ev.push({ type: 'done' });
  return ev;
}
function resultMarket(s) {
  const n = s.orders.length;
  if (s.i < n) return payout(0, 0, false, 'De kraam staat vol halfvolle zakjes.', true);
  const all = s.perfect === n;
  return payout(MARKET.base + s.perfect * MARKET.perfect + s.close * MARKET.close + s.over * MARKET.over + s.under * MARKET.under,
    all ? MARKET.tipAll : s.perfect * MARKET.tipEach, all,
    all ? 'Elke bestelling op de gram: Aaltje noemt je haar beste kraamhulp.' : `${s.perfect} van ${n} bestellingen precies afgewogen.`);
}

// --- 4. Toeristengids ----------------------------------------------------------------------------------------------------------
// De verhalen zijn kort en kloppen met wat het spel van de toren weet (bijna honderd meter hoog, meer dan vijfhonderd jaar oud, bij de
// Groningers bekend als d'Olle Grieze); de grappen zijn duidelijk grappen.
export const STORY_KINDS = ['geschiedenis', 'grap', 'uitzicht'];
export const STORIES = {
  geschiedenis: [
    'Vertel dat de toren al meer dan vijfhonderd jaar over de stad staat',
    'Vertel waarom de Groningers hem d\'Olle Grieze noemen: de oude grijze',
  ],
  grap: [
    'Vertel dat de toren elk jaar een centimeter groeit, maar dat niemand het kan bewijzen',
    'Vertel dat de toren de enige Groninger is die nooit te laat komt: hij staat er al eeuwen',
  ],
  uitzicht: [
    'Wijs naar de horizon: bijna honderd meter hoog en dan zie je de ruimte van het Noorden',
    'Laat de groep foto\'s maken met de toren in de zomerzon',
  ],
};
export const TOURISTS = [
  { id: 'wandelaars', who: 'een groep wandelaars met te veel kaarten', wish: 'geschiedenis', ask: 'Wij willen alles weten over vroeger. Liefst met jaartallen.', right: 'Hoor je dat? Meer dan vijfhonderd jaar. Schrijf maar op, schat!', wrong: 'Leuk, maar wij wilden eigenlijk iets over vroeger.' },
  { id: 'schoolreis', who: 'een schoolklas met bijna lege batterijen', wish: 'grap', ask: 'Is het nog ver? Is er ook iets grappigs aan deze toren?', right: 'Hahaha! Nog een keer! Nog een keer!', wrong: 'Is dit het leuke gedeelte? Dan was het niet erg leuk.' },
  { id: 'fotografen', who: 'een stel met drie camera\'s', wish: 'uitzicht', ask: 'Waar vinden we het mooiste licht en het grootste uitzicht?', right: 'Dit is precies waar we voor kwamen. Klik, klik, klik.', wrong: 'Mooi verhaal, maar we staan nog steeds met onze rug naar het licht.' },
  { id: 'fietsers', who: 'een bus vol bejaarde fietsers', wish: 'geschiedenis', ask: 'Vertel eens, jongen, hoe oud is dat ding eigenlijk?', right: 'Zo oud al? Net als mijn knieën.', wrong: 'Dat vroeg ik niet, maar ik luister graag.' },
  { id: 'bruid', who: 'een bruidspaar dat de verkeerde kant op liep', wish: 'uitzicht', ask: 'Waar kunnen we het beste trouwfoto\'s maken, met het hele Noorden erachter?', right: 'Perfect. Nu alleen de fotograaf nog vinden.', wrong: 'Leuk, maar waar moeten we nu staan?' },
  { id: 'verhalenverteller', who: 'een stel dat zelf ook gids is', wish: 'grap', ask: 'Wij hebben alles al gehoord. Verras ons.', right: 'Die kenden we nog niet. Mogen we hem lenen?', wrong: 'Dat verhaal hebben we in elke stad gehoord.' },
];
export const TOUR = { base: 14, perStop: 9, tipMax: 18, start: 0.6, gain: 0.2, lossWrong: 0.1, lossQuiet: 0.2, talkTime: 14, arrive: 5 };

function initTour(level, rng) {
  const k = lvlK(level);
  const n = 3 + (level >= 3 ? 1 : 0);
  const stopsOf = [];
  let prev = null;
  for (let c = 0; c < n; c++) {
    let tourist;
    do tourist = pickOf(TOURISTS, rng); while (tourist === prev && TOURISTS.length > 1);
    prev = tourist;
    const options = shuffle(STORY_KINDS, rng).map((kind) => ({ kind, label: pickOf(STORIES[kind], rng) }));
    stopsOf.push({ tourist, options, right: options.findIndex((o) => o.kind === tourist.wish) });
  }
  return { stopsOf, n, i: 0, phase: 'walk', t: 0, time: TOUR.talkTime - k * 4, attention: TOUR.start, good: 0, wrong: 0, quiet: 0 };
}
function stepTour(s, i, dt) {
  const ev = [];
  const stop = s.stopsOf[s.i];
  if (!stop) return [{ type: 'done' }];
  if (s.phase === 'walk') {
    if ((i.dist ?? 99) < TOUR.arrive) { s.phase = 'tell'; s.t = 0; ev.push({ type: 'arrive', n: s.i + 1 }); }
    return ev;
  }
  s.t += dt;
  let told = false;
  if (Number.isInteger(i.pick) && i.pick >= 0 && i.pick < stop.options.length) {
    if (i.pick === stop.right) { s.good++; s.attention = clamp(s.attention + TOUR.gain, 0, 1); ev.push({ type: 'good', text: stop.tourist.right }); }
    else { s.wrong++; s.attention = clamp(s.attention - TOUR.lossWrong, 0, 1); ev.push({ type: 'wrong', text: stop.tourist.wrong }); }
    told = true;
  } else if (s.t >= s.time) {
    s.quiet++;
    s.attention = clamp(s.attention - TOUR.lossQuiet, 0, 1);
    ev.push({ type: 'quiet', text: 'Stilte. De groep kijkt op zijn horloge.' });
    told = true;
  }
  if (told) { s.i++; s.phase = 'walk'; s.t = 0; }
  if (s.attention <= 0) { ev.push({ type: 'fail', why: 'de groep haakt af en zoekt zelf een terras' }); return ev; }
  if (told && s.i >= s.n) ev.push({ type: 'done' });
  return ev;
}
function resultTour(s) {
  if (s.i < s.n) return payout(0, 0, false, 'De groep staat nog onder de toren te wachten.', true);
  const clean = s.good === s.n;
  return payout(TOUR.base + s.n * TOUR.perStop, s.attention * TOUR.tipMax, clean,
    clean ? 'Elk verhaal raak: de groep applaudisseert en Hindrik wil je bureau overdragen.' : 'De groep gaat tevreden naar het terras.');
}

// De stops van de tour liggen op een ring rond de plek waar de baan begint: n punten op `radius` meter, vanaf hoek `a0` (radialen),
// elk iets verder weg dan het vorige zodat ze niet op elkaar vallen. Puur; de adapter zoekt er open grond bij.
export function ringPoints(cx, cy, n, radius = 38, a0 = 0.6) {
  const out = [];
  for (let k = 0; k < Math.max(0, n | 0); k++) {
    const a = a0 + (k * 2 * Math.PI) / Math.max(1, n);
    const r = radius + k * 7;
    out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return out;
}

// --- de ronde: één ingang voor de adapter en de tests -------------------------------------------------------------------------
const ENGINES = {
  vismarktkoerier: { init: (level) => initFish(level), step: stepFish, result: resultFish, lost: 'De vis is niet meer te redden.' },
  studentenfeest: { init: (level, rng) => initParty(level, rng), step: stepParty, result: resultParty, lost: 'De bar staat vol lege glazen.' },
  marktkraam: { init: (level, rng) => initMarket(level, rng), step: stepMarket, result: resultMarket, lost: 'De kraam staat vol halfvolle zakjes.' },
  toeristengids: { init: (level, rng) => initTour(level, rng), step: stepTour, result: resultTour, lost: 'De groep zoekt zelf een terras.' },
};

export function newRound(id, level = 1, rng = Math.random) {
  const e = ENGINES[id];
  if (!e) throw new Error('onbekende bijbaan in het pakket: ' + id);
  return { id, s: e.init(Math.max(1, level | 0), rngOf(rng)) };
}
export function stepRound(round, input = {}, dt = 0) {
  const e = ENGINES[round.id];
  const ev = e.step(round.s, input || {}, Number.isFinite(dt) ? Math.max(0, dt) : 0);
  if (ev.some((x) => x.type === 'fail')) round.s.failed = true; // een mislukte ronde blijft mislukt, ook als de laatste gast of stop al aan de beurt was
  return ev;
}
export const roundResult = (round) => (round.s.failed ? payout(0, 0, false, ENGINES[round.id].lost, true) : ENGINES[round.id].result(round.s));

// Het aantal doelen dat de rijbaan nodig heeft (vismarktkoerier) of de stops van de tour: de adapter zet er plekken bij.
export const goalCount = (round) => (round.id === 'vismarktkoerier' ? round.s.stops : round.id === 'toeristengids' ? round.s.n : 0);
export const goalIndex = (round) => (round.id === 'vismarktkoerier' ? round.s.done : round.id === 'toeristengids' ? round.s.i : 0);

// De meldingen bij een gebeurtenis (alleen tekst; sfx staat in de adapter).
export const PACK_MESSAGE = {
  shake: 'Pas op, de kist schudt: er gaat ijs verloren.',
  delivered: 'Afgeleverd! De kok geeft een schep ijs terug.',
  hen: null, // de tekst zit in de gebeurtenis zelf
  arrive: 'Je bent bij de stop: vertel de groep iets.',
};

// De humorregels die hier als voorstel zijn gedaan, voor de docs en de tests: een korte lijst per baan met de grap en de plek.
export const HUMOR_PROPOSALS = {
  vismarktkoerier: [
    'Visboer Dobbe: "Een fiets is geen vis. Probeer dat niet te vergeten."',
    'Een kok bij het afleveren: "Is dit vers? Hij kijkt me zo verwijtend aan."',
    'Een meeuw volgt je drie straten lang en kijkt naar de kist. Hij heeft geen ervaring, wel veel geduld.',
  ],
  studentenfeest: [
    'Lotte: "De dj vraagt om water. Of om genade. Ik kon het niet verstaan."',
    'Een gast: "Heb je iets met bubbels? Nee, geen alcohol. Gewoon bubbels, voor het gevoel."',
    'Een gast die zijn tentamen vergeten is: "Wat voor dag is het? O. Dat verklaart veel."',
  ],
  marktkraam: [
    'Aaltje: "Een pond is vijfhonderd gram, een ons is honderd. En een boer is altijd een beetje te veel."',
    'Een klant over de kip op de weegschaal: "Wegen jullie die ook af? Ik neem hem voor de gezelligheid."',
    'Een klant, na een perfecte weging: "Dat is zo precies dat ik me bijna schuldig voel."',
  ],
  toeristengids: [
    'Hindrik: "Kijk omhoog. Nee, hoger. Nee, dat is een duif."',
    'Een toerist: "En wat zit er aan de andere kant?" Gids: "Meer Grunn."',
    'Een kind: "Wie heeft die toren gebouwd?" Gids: "Een heel grote Tammo." Tammo, ergens in de buurt, knikt trots.',
  ],
};
