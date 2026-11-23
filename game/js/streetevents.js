// Straatgebeurtenissen (#1316, epic Levende stad): kleine, korte scènes die af en toe ergens in de stad opduiken en weer
// verdwijnen als je wegrijdt. Een straatmuzikant met een open gitaarkoffer, een kraampje op de stoep, een ijscokar met
// een rijtje wachtenden, twee mensen die ruziën over een parkeerplek, een loslopende hond met een baasje erachteraan, een
// fietser met een lekke band en toeristen die de weg kwijt zijn. Satire mag, geweld niet: niemand raakt iemand aan.
//
// Pure regels, Node-safe, zonder wereld, klok of DOM: welke scène waar en wanneer, hoe zeldzaam, hoe lang, wie erbij
// staat en wat ze zeggen. streeteventlive.js zet de scène in de wereld (gewone voetgangers uit pedestrians.js, een hond
// uit wildlife.js), streetevents3d.js tekent de props uit het propregister. Toeval komt van de aanroeper (roll 0..1);
// scripts/streetevents_test.mjs rekent de zeldzaamheid na (een uur vrij spelen geeft er gemiddeld drie tot vijf).
//
// Samen spelen: van de wereld van wie het spel opende. De host kiest en speelt de scène; een gast ziet de figuren via de
// gewone snapshot (plek, richting, tekstballon), de hond in de dierenlijst en de props als tijdelijke rekwisieten
// (coopextra.js registreerRekwisieten). Geen beloning en geen voortgang. Zie docs/COOP-GAST.md, "Levende stad".

export const EVENT = {
  checkEvery: 20,      // s tussen twee kansen op een nieuwe scène
  minGap: 330,         // s na het einde van een scène voordat er een nieuwe kan komen
  chance: 0.07,        // kans per check als alles klopt (gemiddeld bijna 5 min wachten na de minimale pauze)
  firstAfter: 90,      // s na het laden: eerst rustig rondkijken
  spawnMin: 35,        // m van de speler
  spawnMax: 75,
  despawnDist: 110,    // m: verder weg en de scène is voorbij ("verdwijnt als je wegrijdt")
  maxPlayerSpeed: 22,  // m/s: wie over de ring scheurt krijgt geen scène naast de weg
};

// Per soort: uren [van, tot), duur [min, max] s, gewicht, plek ('stoep' | 'plein' | 'park' | 'auto' | 'fietsenrek' | 'bezienswaardigheid'),
// droog (niet bij regen), centrum (alleen in de stad), props (uit het propregister) en de spelers van de scène.
export const EVENT_KINDS = {
  muzikant: {
    nl: 'Straatmuzikant', uren: [10, 22.5], duur: [120, 220], gewicht: 3, plek: 'plein', droog: true, centrum: true,
    props: [{ id: 'gitaarkoffer', dx: 0.9, dy: 0, da: Math.PI / 2 }],
    rollen: [{ rol: 'muzikant', dx: 0, dy: 0, da: 0, pose: 'muziek' }, { rol: 'luisteraar', dx: 3.2, dy: -1.2, da: Math.PI - 0.3, pose: null, kans: 0.7 }, { rol: 'luisteraar', dx: 3.4, dy: 1.0, da: Math.PI + 0.3, pose: 'phone', kans: 0.5 }],
  },
  kraampje: {
    nl: 'Kraampje op de stoep', uren: [10, 18], duur: [150, 260], gewicht: 2, plek: 'stoep', droog: true, centrum: false,
    props: [{ id: 'kraampje', dx: 0, dy: 0, da: 0 }],
    rollen: [{ rol: 'verkoper', dx: -0.75, dy: 0, da: 0, pose: 'vendor' }, { rol: 'klant', dx: 1.3, dy: 0.3, da: Math.PI, pose: null, kans: 0.6 }],
  },
  ijscokar: {
    nl: 'IJscokar', uren: [12, 21], duur: [160, 280], gewicht: 2.5, plek: 'park', droog: true, centrum: false,
    props: [{ id: 'ijscokar', dx: 0, dy: 0, da: 0 }],
    rollen: [{ rol: 'verkoper', dx: -1.05, dy: 0.2, da: 0, pose: 'vendor' }, { rol: 'klant', dx: 1.4, dy: 0, da: Math.PI, pose: null }, { rol: 'klant', dx: 2.3, dy: 0.15, da: Math.PI, pose: 'phone', kans: 0.8 }, { rol: 'klant', dx: 3.2, dy: -0.1, da: Math.PI, pose: null, kans: 0.5 }],
  },
  parkeerruzie: {
    nl: 'Ruzie over een parkeerplek', uren: [8, 20], duur: [60, 110], gewicht: 1.5, plek: 'auto', droog: false, centrum: false,
    props: [],
    rollen: [{ rol: 'bestuurder', dx: 0, dy: -0.9, da: Math.PI / 2, pose: 'angry' }, { rol: 'buurman', dx: 0, dy: -2.3, da: -Math.PI / 2, pose: 'angry' }],
  },
  hond: {
    nl: 'Loslopende hond', uren: [7, 21.5], duur: [45, 80], gewicht: 1.5, plek: 'park', droog: false, centrum: false,
    props: [],
    rollen: [{ rol: 'baasje', dx: 0, dy: 0, da: 0, pose: null }],
    hond: true,
  },
  lekkeband: {
    nl: 'Fietser met een lekke band', uren: [7, 20.5], duur: [60, 120], gewicht: 1.5, plek: 'fietsenrek', droog: false, centrum: false,
    props: [],
    rollen: [{ rol: 'fietser', dx: 0, dy: 0, da: 0, pose: 'crouch' }],
  },
  toeristen: {
    nl: 'Toeristen die de weg kwijt zijn', uren: [9.5, 19], duur: [70, 130], gewicht: 1.5, plek: 'bezienswaardigheid', droog: false, centrum: true,
    props: [],
    rollen: [{ rol: 'toerist', dx: 0, dy: 0, da: 0, pose: 'phone' }, { rol: 'toerist', dx: 0.9, dy: 0.5, da: -2.4, pose: 'talk' }, { rol: 'toerist', dx: 0.7, dy: -0.6, da: 2.6, pose: null, kans: 0.6 }],
  },
};
export const EVENT_IDS = Object.keys(EVENT_KINDS);

// Wat ze zeggen (tekstballonnen, Nederlands, af en toe een Gronings woord). Per soort, per rol.
export const EVENT_LINES = {
  muzikant: { muzikant: ['Een muntje voor de muziek?', 'Deze is voor Grunn!', 'Verzoeknummers? Ik ken er drie.', 'Zing maar mee, hoor!', 'Dank je wel, mooi mens!'] },
  kraampje: { verkoper: ['Verse limonade, één euro!', 'Boeken, drie voor een tientje!', 'Alles moet weg, behalve de tafel!', 'Zelf geplukt, die aardbeien!'] },
  ijscokar: { verkoper: ['Wie wil er een ijsje?', 'Aardbei is op, sorry!', 'Twee bollen, met of zonder slagroom?', 'Niet duwen, er is genoeg!'], klant: ['Hoe lang duurt het nog?', 'Ik neem gewoon vanille.'] },
  parkeerruzie: {
    bestuurder: ['Dit was míjn plek!', 'Ik stond hier al tien minuten te wachten!', 'Ik heb hier de hele ochtend voor gedraaid!'],
    buurman: ['Er staat geen naam op, hè!', 'Dan had je maar sneller moeten zijn!', 'Ik bel de wijkagent, hoor!'],
  },
  hond: { baasje: ['Bello! Hier!', 'Hij doet niks, hoor!', 'Bello, kom nou!', 'Wie heeft de riem losgelaten? O, ik.'] },
  lekkeband: { fietser: ['Alweer lek!', 'Wie heeft hier glas laten liggen?', 'Nou loop ik dus naar huis.', 'Heeft iemand een plakset?'] },
  toeristen: { toerist: ['Waar is die toren nou?', 'Volgens de kaart staan we in het water.', 'Is dit nog Groningen?', 'Even een foto, iedereen lachen!'] },
};

const normHour = (h) => (Number.isFinite(h) ? ((h % 24) + 24) % 24 : 12);
const inHours = (h, [a, b]) => { const x = normHour(h); return a <= b ? x >= a && x < b : x >= a || x < b; };

// Mag er nu een nieuwe scène beginnen? st: { lastEndAt, active }, ctx: { playerSpeed, busy }.
export function mayStart(st, now, ctx = {}) {
  if (st.active) return false;
  if (now < EVENT.firstAfter) return false;
  if (now - (st.lastEndAt ?? -Infinity) < EVENT.minGap) return false;
  if (ctx.busy) return false;
  if ((ctx.playerSpeed || 0) > EVENT.maxPlayerSpeed) return false;
  return true;
}

// De kans van deze check (roll 0..1 van de aanroeper).
export const rollsStart = (roll) => roll < EVENT.chance;

// Welke soort past nu? ctx: { hour, wet, inCity, has: { plein, stoep, park, auto, fietsenrek, bezienswaardigheid } }.
export function eligibleKinds(ctx) {
  const out = [];
  for (const id of EVENT_IDS) {
    const k = EVENT_KINDS[id];
    if (!inHours(ctx.hour, k.uren)) continue;
    if (k.droog && (ctx.wet || 0) > 0.25) continue;
    if (k.centrum && !ctx.inCity) continue;
    if (ctx.has && ctx.has[k.plek] === false) continue;
    out.push(id);
  }
  return out;
}

export function pickKind(ctx, roll) {
  const list = eligibleKinds(ctx);
  let total = 0;
  for (const id of list) total += EVENT_KINDS[id].gewicht;
  if (total <= 0) return null;
  let r = Math.max(0, Math.min(0.999999, Number.isFinite(roll) ? roll : 0)) * total;
  for (const id of list) { r -= EVENT_KINDS[id].gewicht; if (r < 0) return id; }
  return list[list.length - 1];
}

// De duur van een scène (s), roll 0..1.
export function durationOf(id, roll = 0.5) {
  const k = EVENT_KINDS[id];
  if (!k) return 0;
  return k.duur[0] + (k.duur[1] - k.duur[0]) * Math.max(0, Math.min(1, roll));
}

// Plek en richting van elke rol en prop: (x, y, angle) is het anker van de scène, angle de kijkrichting van de hoofdrol
// (naar de straat). rolls: toeval per optionele rol (kans). -> { rollen: [{ rol, x, y, angle, pose }], props: [{ id, x, y, angle }] }
export function layout(id, x, y, angle, rolls = []) {
  const k = EVENT_KINDS[id];
  if (!k) return null;
  const c = Math.cos(angle), s = Math.sin(angle);
  const at = (dx, dy) => ({ x: x + c * dx - s * dy, y: y + s * dx + c * dy });
  const rollen = [];
  k.rollen.forEach((r, i) => {
    if (r.kans != null && !((rolls[i] ?? 0) < r.kans)) return;
    const p = at(r.dx, r.dy);
    rollen.push({ rol: r.rol, x: p.x, y: p.y, angle: angle + r.da, pose: r.pose });
  });
  const props = k.props.map((p) => { const q = at(p.dx, p.dy); return { id: p.id, x: q.x, y: q.y, angle: angle + p.da }; });
  return { rollen, props };
}

// Is de scène voorbij? ev: { until }, dPlayer: afstand van de dichtstbijzijnde speler. -> null | 'tijd' | 'weg'
export function endReason(ev, now, dPlayer) {
  if (dPlayer > EVENT.despawnDist) return 'weg';
  if (now >= ev.until) return 'tijd';
  return null;
}

// De volgende regel van een scène: om de beurt per rol, niet te vaak (gap s). -> { rolIndex, line } of null.
export const LINE_GAP = 7;
export function nextLine(id, ev, now, roll = 0.5, hearDist = 0) {
  if (hearDist > 26) return null;
  if (now - (ev.lineAt ?? -Infinity) < LINE_GAP) return null;
  const lines = EVENT_LINES[id];
  if (!lines || !ev.rollen || !ev.rollen.length) return null;
  for (let k = 0; k < ev.rollen.length; k++) {
    const i = ((ev.turn || 0) + k) % ev.rollen.length;
    const pool = lines[ev.rollen[i].rol];
    if (!pool || !pool.length) continue;
    return { rolIndex: i, line: pool[Math.floor(Math.max(0, Math.min(0.999999, roll)) * pool.length)] };
  }
  return null;
}

// Hoeveel scènes geeft een uur (of n s) vrij spelen met deze regels? Voor de test en de beeldpagina: een simulatie met
// een gegeven toevalsbron, zonder wereld (elke check heeft een plek). De klok loopt mee: een speldag duurt 24 minuten
// (daynight.js DAY_LENGTH_S), dus een uur spelen is tweeënhalve dag met nachten zonder scènes.
const GAME_HOURS_PER_S = 24 / (24 * 60);
export function simulateCount(seconds, rng, ctx = { hour: 14, wet: 0, inCity: true }) {
  const st = { lastEndAt: -Infinity, active: null };
  let n = 0;
  for (let t = 0; t < seconds; t += EVENT.checkEvery) {
    if (st.active && t >= st.active.until) { st.lastEndAt = st.active.until; st.active = null; }
    if (!mayStart(st, t, {}) || !rollsStart(rng())) continue;
    const id = pickKind({ ...ctx, hour: ctx.hour + t * GAME_HOURS_PER_S }, rng());
    if (!id) continue;
    st.active = { id, until: t + durationOf(id, rng()) };
    n++;
  }
  return n;
}
