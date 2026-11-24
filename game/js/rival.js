// De concurrent van de snackwagen (epic #1095, #1102): Jelle Terpstra's snackimperium "Us Mem Snacks" (verzonnen; Jelle is een verhaalpersonage, vriendelijk-venijnig).
// Hij bezit standplaatsen, panden en een eigen keten, breidt zelf uit en komt met overnames, een prijzenoorlog en sabotage als satire: een storing aan de frituurpan,
// een pechdag, een valse recensie, een verkoper die hij wegkoopt. Nooit geweld, nooit een echt slachtoffer: het is zakelijk pesten met een glimlach (constitution 6).
// Puur en deterministisch: alles uit de speldag en de plek (bezithash.js), nooit Math.random, geen klok, geen opslag (scripts/rival_test.mjs). Per speler: iedere speler heeft
// zijn eigen Us Mem en zijn eigen voortgang (#429); Samen spelen deelt alleen de claims op plekken (bezitcoop.js).

import { hashUnit, hashPick, clamp, finite } from './bezithash.js';
import { SPOTS, spotDef, permitPrice } from './pitch.js';

export const RIVAL_NAME = 'Us Mem Snacks';
export const RIVAL_OWNER = 'Jelle Terpstra';
export const OPENING_SPOTS = ['markt', 'station', 'oosterpoort', 'stadion'];     // wat Us Mem heeft als jij begint: de beste plekken van de stad
export const TARGET_SHARE = 0.4;                                              // hij breidt uit tot ongeveer 40% van de plekken (6 van 16) als jij hem niet voor bent
export const EXPAND_MIN = 9, EXPAND_SPAN = 6;                                  // elke 9 tot 14 speldagen een nieuwe plek
export const MAX_MOOD = 100;

export const SERVICE = 'Gemeentelijke Vergunningsdienst Noord';             // verzonnen dienst (constitution 2): geen echte instantie, geen echte ambtenaar
// rep: de naam van Us Mem zelf (0 tot 100): een mislukte omkoping kost hem veel; zie resolveDispute.
export const newRival = () => ({ v: 1, spots: [...OPENING_SPOTS], pand: 3, chain: 1, mood: 20, lastExpand: 0, lastOffer: 0, lastEvent: 0, bought: 0, rep: 60 });

// De ligging van een plek in de lijst van de concurrent.
export const holds = (r, id) => !!r && r.spots.includes(id);

// Hoeveel plekken heeft hij, en welk aandeel van de bezette plekken is van jou (de score 'Snackimperium').
export const shareOf = (mine, r) => { const a = Math.max(0, mine | 0), b = r ? r.spots.length : 0; return a + b === 0 ? 0 : Math.round((a / (a + b)) * 1000) / 1000; };

// Zijn prijs om een plek over te nemen: de vergunningsprijs maal 2,4 bij een naam van nul, maal 1,6 bij een naam van honderd. Je betaalt hem, hij is dan klein af.
// Een slechte naam van Us Mem zelf (rivalRep onder 60, na een mislukte omkoping) maakt hem tot 20% goedkoper: wie zijn naam kapot maakt, verliest zijn onderhandelingspositie.
export const RIVAL_REP_INITIAL = 60;
export const askPrice = (id, rep = 50, rivalRep = RIVAL_REP_INITIAL) => Math.round((permitPrice(id, 0) * (2.4 - 0.8 * clamp(finite(rep, 50), 0, 100) / 100) * (1 - 0.2 * clamp((RIVAL_REP_INITIAL - finite(rivalRep, RIVAL_REP_INITIAL)) / RIVAL_REP_INITIAL, 0, 1))) / 50) * 50;

// Jij neemt een plek van hem over. Geeft { ok, r, price } of { ok: false, why, ask }. Hij wordt er niet vrolijker van: zijn stemming (de kans op sabotage) loopt 25 punten op.
export function acquireSpot(r, id, money, rep = 50) {
  if (!holds(r, id)) return { ok: false, why: 'niet-van-hem' };
  const price = askPrice(id, rep, r.rep);
  if (!(finite(money, 0) >= price)) return { ok: false, why: 'te-weinig-geld', ask: price, tekort: Math.round(price - finite(money, 0)) };
  return { ok: true, price, r: { ...r, spots: r.spots.filter((s) => s !== id), mood: clamp(r.mood + 25, 0, MAX_MOOD), bought: r.bought + 1 } };
}
// Hij neemt een plek over van jou (jij verkoopt aan zijn bod): de plek wordt van hem.
export function acquire(r, id) { return holds(r, id) ? r : { ...r, spots: [...r.spots, id], mood: clamp(r.mood - 10, 0, MAX_MOOD) }; }

// ---- een dag: de concurrent groeit ----
// ctx: { taken(id) waar als de plek van jou of een medespeler is, mine: aantal plekken van jou }. Geeft de nieuwe stand.
// Hij neemt de beste vrije plek zodra de wachttijd om is en hij onder zijn doelaandeel zit; panden en keten groeien met de tijd; zijn stemming zakt twee punten per dag.
export function stepRival(r, day, ctx = {}) {
  const d = Math.floor(finite(day, 0));
  let n = { ...r, mood: clamp(r.mood - 2, 5, MAX_MOOD) };
  if (d > 0 && d % 20 === 0) n.pand = Math.min(24, n.pand + 1);
  if (d > 0 && d % 45 === 0) n.chain = Math.min(4, n.chain + 1);
  const taken = ctx.taken || (() => false);
  const wait = EXPAND_MIN + Math.floor(hashUnit('usmem-wacht', Math.floor(d / 7)) * EXPAND_SPAN);
  if (d - n.lastExpand >= wait && n.spots.length < Math.round(SPOTS.length * TARGET_SHARE)) {
    const free = SPOTS.filter((s) => !holds(n, s.id) && !taken(s.id)).sort((a, b) => b.foot - a.foot || a.id.localeCompare(b.id));
    if (free.length) { n = { ...n, spots: [...n.spots, free[0].id], lastExpand: d }; n.expandedTo = free[0].id; }
    else n.lastExpand = d;
  }
  return n;
}

// ---- zijn bod op een plek van jou ----
// mine: [{ id, paid }] (je geldige vergunningen). Hij komt elke 18 tot 25 speldagen met een bod op je beste plek (hoogste druk), tot 1,8 tot 2,2 keer de vergunningsprijs.
// Geeft { id, price, text } of null. Aan de aanroeper om het één keer te tonen (lastOffer bijwerken met noteOffer).
export function offerOn(r, day, mine = []) {
  const d = Math.floor(finite(day, 0));
  if (!mine.length) return null;
  const wait = 18 + Math.floor(hashUnit('usmem-bod', Math.floor(d / 5)) * 8);
  if (d - r.lastOffer < wait) return null;
  const best = [...mine].map((m) => ({ ...m, def: spotDef(m.id) })).filter((m) => m.def).sort((a, b) => b.def.foot - a.def.foot || a.id.localeCompare(b.id))[0];
  if (!best || holds(r, best.id)) return null;
  const mult = 1.8 + 0.4 * hashUnit('usmem-bodprijs', best.id, d);
  const price = Math.round((permitPrice(best.id, 0) * mult) / 50) * 50;
  return { id: best.id, price, text: `Jelle Terpstra biedt ${price.toLocaleString('nl-NL')} euro voor je plek bij ${best.def.short}. "Je kunt het geld beter gebruiken."` };
}
export const noteOffer = (r, day) => ({ ...r, lastOffer: Math.floor(finite(day, 0)) });

// ---- sabotage en andere streken (satire) ----
export const EVENT_KINDS = {
  storing: { label: 'Storing aan de frituurpan', weight: 3 },
  pech: { label: 'Pechdag', weight: 2 },
  recensie: { label: 'Valse recensie', weight: 3 },
  oorlog: { label: 'Prijzenoorlog', weight: 2 },
  overkoop: { label: 'Verkoper weggekocht', weight: 1 },
  vergunning: { label: 'Gedoe met de vergunning', weight: 2 },
};
export const LEGES_PAY = 400, LEGES_LOSS = 300;           // de leges bij betalen, en wat een verloren geschil kost (nooit fataal: de plek blijft van jou)
export const EVENT_COOLDOWN = 3;                       // speldagen tussen twee gebeurtenissen
// De kans per dag op een gebeurtenis: 5% plus zijn stemming (tot 12%) plus 4% als jij verder bent dan hij; hoogstens 22%. protect (0 tot 1): wat een upgrade of goede naam afvangt.
// Een slechte naam van Us Mem (rep onder 60) maakt hem voorzichtiger: de kans zakt tot 70%, en stijgt tot 120% bij een naam van honderd.
export function eventChance(r, { share = 0.5, protect = 0 } = {}) {
  const own = clamp(0.7 + 0.3 * finite(r.rep, RIVAL_REP_INITIAL) / RIVAL_REP_INITIAL, 0.7, 1.2);
  return Math.round(clamp((0.05 + 0.12 * clamp(r.mood, 0, MAX_MOOD) / MAX_MOOD + (share > 0.5 ? 0.04 : 0)) * (1 - clamp(protect, 0, 0.6)) * own, 0, 0.22) * 1000) / 1000;
}
// De zinnen van Jelle: vriendelijk en venijnig, nooit grof.
export const QUOTES = {
  storing: ['"Een frituurpan is net een vriendschap: ze gaat stuk als je er niet op let," zegt Jelle Terpstra.', '"Pech, hè? Niks persoonlijks, het is gewoon friet," appt Jelle.'],
  pech: ['"Ik hoorde dat je wagen niet wilde starten. Ik stuur gratis een folder over openbaar vervoer," zegt Jelle.', '"Een rustdag heeft nog niemand kwaad gedaan," zegt Jelle.'],
  recensie: ['Er staat een recensie online: "Friet zonder ziel." De schrijver heet toevallig net als de neef van een Us Mem-chauffeur.', '"Kritiek hoort erbij," zegt Jelle. "Vooral andermans."'],
  oorlog: ['Us Mem Snacks zet alle friet in de stad in de aanbieding. Jelle: "Voor de klant, natuurlijk."', '"Gratis saus bij elke friet!" Jelle zwaait vriendelijk vanaf zijn wagen.'],
  overkoop: ['Jelle heeft je verkoper uitgenodigd voor een koffie. Met een hoger loon op tafel.', '"Goede mensen moet je koesteren," zegt Jelle, "liefst bij mij."'],
  bod: ['"Een mooi plekje. Het past beter bij mij," zegt Jelle.'],
  // Bureaucratie (Jelle speelt met regels): een extra formulier, een vergunning die "ter beoordeling" ligt, en (satire) een enveloppe voor de verzonnen Gemeentelijke Vergunningsdienst Noord.
  vergunning: ['De Gemeentelijke Vergunningsdienst Noord vraagt ineens om een extra formulier (model 7b) voor je standplaats. Jelle: "Regels zijn regels, dat weet jij ook."', 'Je vergunning ligt "ter beoordeling" bij de Gemeentelijke Vergunningsdienst Noord. Jelle: "Dat duurt soms even. Soms heel even niet voor een ander."'],
  vergunningOmkoop: ['Op een bureau van de Gemeentelijke Vergunningsdienst Noord ligt een dikke enveloppe met een Us Mem-sticker. Jelle: "Een kleine attentie, meer niet."', 'Bij de Gemeentelijke Vergunningsdienst Noord is plotseling de vergunning van een ander zoek. Jelle knipoogt: "Je weet hoe dat gaat."'],
};
// Het antwoord dat de speler kan kiezen, per soort: { id, label, cost } (cost in euro, 0 is gratis). Het eerste is het antwoord dat het meest kost en het best helpt.
export const CHOICES = {
  storing: [{ id: 'repareer', label: 'Direct laten repareren', cost: 350 }, { id: 'wacht', label: 'Wachten tot het weer gaat', cost: 0, def: true }],
  pech: [{ id: 'sleep', label: 'Sleepdienst bellen', cost: 250 }, { id: 'wacht', label: 'Een dag extra rust', cost: 0, def: true }],
  recensie: [{ id: 'actie', label: 'Gratis friet-dag', cost: 200 }, { id: 'reageer', label: 'Netjes reageren', cost: 0 }, { id: 'negeer', label: 'Negeren', cost: 0, def: true }],
  oorlog: [{ id: 'reclame', label: 'Reclame op de markt', cost: 600 }, { id: 'meeprijzen', label: 'Meeprijzen', cost: 0 }, { id: 'negeer', label: 'Negeren', cost: 0, def: true }],
  overkoop: [{ id: 'loon', label: 'Loonsverhoging geven', cost: 0 }, { id: 'laatgaan', label: 'Laten gaan', cost: 0, def: true }],
  bod: [{ id: 'verkoop', label: 'Verkopen', cost: 0 }, { id: 'weiger', label: 'Weigeren', cost: 0, def: true }],
  // Een vergunningsgeschil: bondgenoten vragen (uit eerdere hulp aan de buurt) of in beroep gaan; de leges betalen is de snelle, saaie uitweg. Zie resolveDispute.
  vergunning: [{ id: 'bondgenoten', label: 'Bondgenoten om steun vragen', cost: 0 }, { id: 'beroep', label: 'In beroep gaan', cost: 0, def: true }, { id: 'betaal', label: 'De leges betalen en doorgaan', cost: LEGES_PAY }],
};
// De gebeurtenis van vandaag, of null. ctx: { wagons: [{ id, spot }] (wagens op een plek), share, protect, hasFleet (is er een verkoper om weg te kopen), pending (er loopt er al een) }.
// Geeft { kind, wagon (id), spot, depth (oorlog), text, choices, day, deadline } of null. Hoogstens één tegelijk en daarna EVENT_COOLDOWN dagen rust.
export function rollEvent(r, day, ctx = {}) {
  const d = Math.floor(finite(day, 0));
  if (d < 1 || ctx.pending) return null;
  const wagons = ctx.wagons || [];
  if (!wagons.length) return null;
  if (d - finite(r.lastEvent, 0) < EVENT_COOLDOWN) return null;
  if (hashUnit('usmem-streek', d) >= eventChance(r, ctx)) return null;
  const kinds = Object.keys(EVENT_KINDS).filter((k) => (k !== 'overkoop' || ctx.hasFleet));
  const pool = []; for (const k of kinds) for (let i = 0; i < EVENT_KINDS[k].weight; i++) pool.push(k);
  const kind = hashPick(pool, 'usmem-soort', d);
  const w = hashPick(wagons, 'usmem-wagen', d);
  const depth = kind === 'oorlog' ? Math.round((0.12 + 0.02 * r.chain + 0.06 * hashUnit('usmem-diepte', d)) * 100) / 100 : 0;
  const bribed = kind === 'vergunning' && hashUnit('usmem-envelop', d) < 0.35;                // een derde van de geschillen komt met een enveloppe (satire)
  const text = hashPick(QUOTES[bribed ? 'vergunningOmkoop' : kind], 'usmem-zin', kind, d);
  return { kind, wagon: w.id, spot: w.spot, depth, bribed, text, choices: CHOICES[kind], day: d, deadline: d + (kind === 'vergunning' ? 5 : 3) };
}

// ---- het vergunningsgeschil: bureaucratie tegen goodwill ----
// Jelle speelt met regels en een enveloppe; jij wint met wat je in de buurt hebt opgebouwd. Sterkte van jou: goodwill (35%), de vaste klanten op die plek (25%), 8 punten per bondgenoot
// (hoogstens vier), 20 als je ze nu om steun vraagt, een deel van je naam en een kleine vaste ruis. Zijn sterkte: 45, zijn stemming en 25 voor een geslaagde enveloppe. Een enveloppe kan
// mislukken (kans 30% plus je goodwill en bondgenoten): dan weigert de dienst, wint jij en verliest Jelle 15 naam. Een verloren geschil kost leges en drie dagen halve verkoop; de plek blijft van jou.
// p: { spot, day, bribed, goodwill, loyal, allies (aantal), allyCall, rep (jouw naam), mood, rivalRep }. Geeft { win, yours, his, bribeFailed, rivalRepDelta, text }.
export function resolveDispute(p) {
  const d = Math.floor(finite(p.day, 0)), allies = clamp(Math.round(finite(p.allies, 0)), 0, 4);
  const noise = (hashUnit('geschil', p.spot || '', d) - 0.5) * 8;
  const yours = 0.35 * clamp(finite(p.goodwill, 0), 0, 100) + 0.25 * clamp(finite(p.loyal, 0), 0, 100) + 8 * allies + (p.allyCall && allies > 0 ? 20 : 0) + 0.15 * clamp(finite(p.rep, 50), 0, 100) + noise;
  const bribeFailed = !!p.bribed && hashUnit('omkoping', p.spot || '', d) < clamp(0.3 + 0.4 * clamp(finite(p.goodwill, 0), 0, 100) / 100 + 0.1 * allies, 0, 0.9);
  const his = 45 + 0.15 * clamp(finite(p.mood, 20), 0, MAX_MOOD) + (p.bribed && !bribeFailed ? 25 : 0) - (bribeFailed ? 10 : 0);
  const win = bribeFailed || yours >= his;
  const rivalRepDelta = bribeFailed ? -15 : win ? -8 : 2;
  const text = bribeFailed ? `De ${SERVICE} weigert de enveloppe en beslist in jouw voordeel. Het komt in de krant: Us Mem Snacks staat voor schut.`
    : win ? `De ${SERVICE} bevestigt je vergunning. De buurt staat achter je; Jelle Terpstra glimlacht een beetje minder.`
      : `De ${SERVICE} beslist in het voordeel van de regels (en van Us Mem). Je betaalt ${LEGES_LOSS} euro leges en een paar dagen gaat het langzamer, maar de plek blijft van jou.`;
  return { win, yours: Math.round(yours * 10) / 10, his: Math.round(his * 10) / 10, bribeFailed, rivalRepDelta, text };
}
export const noteEvent = (r, day) => ({ ...r, lastEvent: Math.floor(finite(day, 0)) });

// De afloop per soort en antwoord: wat het doet voor de wagen en je naam. Geeft { cost, mods: [{ k, until, ... }], rep (blijvend), repTemp: { d, days }, text }.
// De dagen tellen vanaf de dag van het antwoord (day). choice = null: het antwoord dat de speler niet gaf (na de deadline) is altijd het goedkoopste.
export function outcome(ev, choiceId, day) {
  const d = Math.floor(finite(day, 0));
  const c = (CHOICES[ev.kind] || []).find((x) => x.id === choiceId) || (CHOICES[ev.kind] || []).find((x) => x.def);
  if (!c) return { cost: 0, mods: [], rep: 0, text: '' };
  const o = { cost: c.cost, choice: c.id, mods: [], rep: 0, text: '' };
  if (ev.kind === 'storing') {
    if (c.id === 'repareer') { o.mods.push({ k: 'omzet', wagon: ev.wagon, until: d, mult: 0.6 }); o.text = 'De pan is binnen een uur gemaakt: de rest van de dag draait gewoon.'; }
    else { o.mods.push({ k: 'omzet', wagon: ev.wagon, until: d + 1, mult: 0.3 }); o.text = 'Twee dagen een halve pan: minder omzet.'; }
  } else if (ev.kind === 'pech') {
    if (c.id === 'sleep') { o.mods.push({ k: 'dicht', wagon: ev.wagon, until: d }); o.text = 'De sleepdienst was snel: een dag zonder verkoop.'; }
    else { o.mods.push({ k: 'dicht', wagon: ev.wagon, until: d + 1 }); o.text = 'Twee dagen zonder verkoop: de wagen moet rusten.'; }
  } else if (ev.kind === 'recensie') {
    if (c.id === 'actie') { o.repTemp = { d: -2, days: 4 }; o.rep = 3; o.text = 'De gratis friet-dag maakt de recensie goed: je naam herstelt.'; }
    else if (c.id === 'reageer') { o.repTemp = { d: -4, days: 6 }; o.rep = 1; o.text = 'Je reactie is netjes: iedereen ziet wie hier fatsoenlijk blijft.'; }
    else { o.repTemp = { d: -8, days: 6 }; o.text = 'De recensie blijft staan: je naam lijdt een week.'; }
  } else if (ev.kind === 'oorlog') {
    const depth = finite(ev.depth, 0.15);
    o.war = { until: d + 8, depth, matched: c.id === 'meeprijzen' };
    if (c.id === 'reclame') { o.war.softened = true; o.rep = 4; o.text = 'De reclame werkt: minder klanten lopen over.'; }
    else if (c.id === 'meeprijzen') o.text = 'Je prijst mee: klanten blijven, de marge is dun.';
    else o.text = 'Je negeert het: klanten lopen een week naar Us Mem.';
  } else if (ev.kind === 'overkoop') {
    if (c.id === 'loon') { o.wageUp = { wagon: ev.wagon, pct: 20 }; o.text = 'Je verkoper blijft voor 20% meer loon.'; }
    else { o.mods.push({ k: 'dicht', wagon: ev.wagon, until: d + 1 }); o.leave = ev.wagon; o.text = 'Je verkoper vertrekt; er komt twee dagen later een nieuwe.'; }
  }
  return o;
}

export function normalizeRival(raw) {
  const r = newRival();
  if (!raw || typeof raw !== 'object') return r;
  if (Array.isArray(raw.spots)) r.spots = [...new Set(raw.spots.filter((s) => spotDef(s)))].slice(0, 16);
  r.pand = Math.round(clamp(finite(raw.pand, r.pand), 0, 99)); r.chain = Math.round(clamp(finite(raw.chain, 1), 1, 4));
  r.mood = Math.round(clamp(finite(raw.mood, r.mood), 0, MAX_MOOD));
  r.rep = Math.round(clamp(finite(raw.rep, RIVAL_REP_INITIAL), 0, 100));
  for (const k of ['lastExpand', 'lastOffer', 'lastEvent', 'bought']) r[k] = Math.round(clamp(finite(raw[k], 0), 0, 1e7));
  return r;
}
