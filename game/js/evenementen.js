// Zomerevenementen (#203): een agenda per plaats met kermis, markt, optocht,
// vuurwerk, concert en wielerronde. Puur en gedreven door data: wie een
// evenement is, waar en wanneer het is (kalenderdag en uur), hoeveel menigte
// en geluid het geeft en welk stuk straat het afsluit. De wereldlaag (props,
// menigte, geluid, verkeer en routes) vraagt hier alleen "wat is er actief op
// dag n, uur h" en "wat betekent dat op punt (x, y)". Namen en teksten zijn
// verzonnen; de plaatsen zijn echt. Geen echte merken, geen leed, alleen zomer.
// Het bestaande kermis.js, het Ontzet-vuurwerk (eventrules.js) en de dagkaarten
// van regioleven.js blijven zoals ze zijn: dit is de agenda erbovenop, op
// andere dagen en plaatsen. Tests: scripts/evenementen_test.mjs.

import { day, formatDay, LAST_SUMMER_DAY } from './calendar.js';
import { wgsToWorld } from './rdnew.js';

// Soorten. crowd: 0..1 menigte op het terrein; sound: sleutel voor de sfx-laag
// en gain op de rand van `reach`; closure: straal (m) van de afsluiting rond
// het hart; traffic: factor op het autoverkeer in die straal (0 = dicht);
// props: wat de bouwlaag neerzet (namen van bestaande stijl-props).
export const KINDS = {
  kermis: { naam: 'Kermis', crowd: 0.85, sound: 'kermis', reach: 220, closure: 110, traffic: 0.2, props: ['draaimolen', 'kraam', 'lampjes'], icon: 'kraam' },
  markt: { naam: 'Zomermarkt', crowd: 0.6, sound: 'markt', reach: 90, closure: 70, traffic: 0, props: ['kraam', 'parasol', 'kist'], icon: 'kraam' },
  optocht: { naam: 'Optocht', crowd: 0.75, sound: 'orkest', reach: 260, closure: 160, traffic: 0, props: ['wagen', 'vlaggetjes', 'dranghek'], icon: 'vlag' },
  vuurwerk: { naam: 'Vuurwerkshow', crowd: 0.7, sound: 'vuurwerk', reach: 500, closure: 90, traffic: 0.3, props: ['dranghek', 'lampjes'], icon: 'vlag' },
  concert: { naam: 'Openluchtconcert', crowd: 0.55, sound: 'concert', reach: 150, closure: 60, traffic: 0.5, props: ['podium', 'stoel', 'lampjes'], icon: 'zon' },
  tewaterlating: { naam: 'Tewaterlating', crowd: 0.8, sound: 'speaker', reach: 320, closure: 110, traffic: 0, props: ['dranghek', 'vlaggetjes', 'lampjes'], icon: 'vlag' },
  wielerronde: { naam: 'Wielerronde', crowd: 0.5, sound: 'speaker', reach: 200, closure: 140, traffic: 0, props: ['dranghek', 'vlaggetjes', 'finishboog'], icon: 'vlag' },
};

// De agenda. at = [breedte, lengte]; dag via calendar.day(maand, datum);
// from/to = uren op de 24-uursklok (from > to loopt door middernacht).
// Gekozen om niet samen te vallen met de dagkaarten van regioleven.js.
const E = (id, kind, naam, plaats, at, m, d, dTo, from, to, tekst) => ({
  id, kind, naam, plaats, at, from: day(m, d), to: day(m, dTo ?? d), hours: [from, to], tekst,
});

export const AGENDA = [
  E('ev-kermis-zuidbroek', 'kermis', 'Zomerkermis Zuidbroek', 'Zuidbroek', [53.1717, 6.8697], 8, 21, 23, 14, 24,
    'Draaimolens, suikerspin en een oliebollenkraam in augustus. Niemand vraagt waarom.'),
  E('ev-markt-winsum', 'markt', 'Zomermarkt Winsum', 'Winsum', [53.3317, 6.5195], 8, 19, 19, 8, 16,
    'Kramen met kaas, fruit en een man die zegt dat zijn tomaten van gisteren zijn. Dat klopt.'),
  E('ev-optocht-hoogezand', 'optocht', 'Zomeroptocht Hoogezand', 'Hoogezand', [53.16179, 6.7578], 8, 29, 29, 13, 16,
    'Versierde wagens, een brassband en een tractor met een reuzenaardappel. De route is afgesloten.'),
  E('ev-concert-grotemarkt', 'concert', 'Muziek op de Grote Markt', 'Groningen', [53.2194, 6.56665], 8, 26, 26, 19, 22,
    'Een orkestje onder de sterren. Het publiek zit op de trappen en klapt een tel te vroeg.'),
  E('ev-markt-bedum', 'markt', 'Boerenmarkt Bedum', 'Bedum', [53.3, 6.6], 9, 12, 12, 9, 15,
    'Streekproducten en een draaiorgel. Het scheefstaande torentje kijkt toe.'),
  E('ev-vuurwerk-delfzijl', 'vuurwerk', 'Lichtjesavond Delfzijl', 'Delfzijl', [53.333, 6.9166], 9, 5, 5, 22, 23.5,
    'Vuurwerk boven de haven. De boten hangen vol lampjes en de meeuwen zijn er niet blij mee.'),
  E('ev-ronde-appingedam', 'wielerronde', 'Ronde van Appingedam', 'Appingedam', [53.3195, 6.8586], 9, 6, 6, 12, 17,
    'Renners over de kasseien langs de hangende keukens. De omgeving is dicht, ook voor jou.'),
  E('ev-kermis-leek', 'kermis', 'Nazomerkermis Leek', 'Leek', [53.1625, 6.38185], 9, 18, 20, 14, 24,
    'Botsauto\'s en een rad van fortuin met alleen prijzen. Het gaat om het idee.'),
  E('ev-optocht-winschoten', 'optocht', 'Molenoptocht Winschoten', 'Winschoten', [53.1431, 7.0356], 9, 19, 19, 13, 16,
    'Wagens in de vorm van molens, met echte wieken. De wind werkt mee.'),
  // Scheepswerf De Kielhaal (werf.js, #398): het schip glijdt om 15:00 op zijn zij het water in; de golf spoelt over de kade
  E('ev-werf-1', 'tewaterlating', 'Tewaterlating bij Scheepswerf De Kielhaal', 'Zoutkamp', [53.33263, 6.29302], 8, 23, 23, 14, 16.5,
    'Een nieuw schip glijdt op zijn zij het water in. Blijf achter het hek: de golf is niet bijzonder beleefd.'),
  E('ev-werf-2', 'tewaterlating', 'Tewaterlating bij Scheepswerf De Kielhaal', 'Zoutkamp', [53.33263, 6.29302], 9, 6, 6, 14, 16.5,
    'Alweer een schip van de helling. De bouwers zeggen dat ze het nu echt onder de knie hebben.'),
  E('ev-werf-3', 'tewaterlating', 'Tewaterlating bij Scheepswerf De Kielhaal', 'Zoutkamp', [53.33263, 6.29302], 9, 20, 20, 14, 16.5,
    'Het laatste schip van de zomer. Wie droog wil blijven, staat bij de koffiekar.'),
  E('ev-concert-veendam', 'concert', 'Avondconcert Veendam', 'Veendam', [53.10571, 6.8786], 9, 9, 9, 19, 22,
    'Zomeravond, een podium aan het Winschoterdiep en een zangeres die iedereen een beetje kent.'),
];

// Wereldcoördinaten van het hart, eenmaal berekend.
const centre = new Map();
export function centreOf(ev) {
  let c = centre.get(ev.id);
  if (!c) { const [x, y] = wgsToWorld(ev.at[0], ev.at[1]); c = { x, y }; centre.set(ev.id, c); }
  return c;
}

const inHours = (h, [a, b]) => (a <= b ? h >= a && h < b : h >= a || h < b);

// Loopt het evenement nu? Een nachtvenster (to < from, of 24) hoort bij de dag waarop het begon.
export function isActive(ev, n, hour) {
  if (n < ev.from || n > ev.to || n > LAST_SUMMER_DAY) return false;
  const [a, b] = ev.hours;
  return a <= b ? hour >= a && hour < b : hour >= a || (hour < b && n > ev.from);
}

export const activeEvents = (n, hour) => AGENDA.filter((ev) => isActive(ev, n, hour));

// De vuurwerkshow die nu loopt (#131): { on, progress (0..1 door het venster), at: { x, y }, id },
// of { on: false }. De wereldlaag (worldevents.js) laat er schoten en knallen van opgaan.
export function showFor(n, hour) {
  const ev = activeEvents(n, hour).find((e) => e.kind === 'vuurwerk');
  if (!ev) return { on: false, progress: 0 };
  const [a, b] = ev.hours, h = hour < a && a > b ? hour + 24 : hour, end = b < a ? b + 24 : b;
  return { on: true, progress: Math.max(0, Math.min(1, (h - a) / (end - a))), at: centreOf(ev), id: ev.id };
}

// Wat er vandaag nog komt (en wat loopt), op tijd gesorteerd: voor de agenda in het menu.
export function agendaOn(n) {
  return AGENDA.filter((ev) => n >= ev.from && n <= ev.to)
    .sort((a, b) => a.hours[0] - b.hours[0] || a.id.localeCompare(b.id));
}

// De eerstvolgende evenementen vanaf dag n (lopende meegeteld), voor het menu.
export function upcoming(n, count = 4) {
  return AGENDA.filter((ev) => ev.to >= n)
    .sort((a, b) => Math.max(a.from, n) - Math.max(b.from, n) || a.id.localeCompare(b.id))
    .slice(0, count)
    .map((ev) => ({ ev, label: dateLabel(ev, n) }));
}

export function dateLabel(ev, n) {
  const f = (k) => formatDay(k).short.toLowerCase();
  if (ev.from <= n && ev.to >= n) return ev.to > n ? `nu, t/m ${f(ev.to)}` : 'vandaag';
  const start = ev.from === n + 1 ? 'morgen' : f(ev.from);
  return ev.to > ev.from ? `${start} t/m ${f(ev.to)}` : start;
}

export const timeLabel = (ev) => {
  const t = (h) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
  return `${t(ev.hours[0])} - ${ev.hours[1] >= 24 ? '24:00' : t(ev.hours[1])}`;
};

// --- wat een evenement betekent op een punt --------------------------------------------------

const d2 = (ev, x, y) => { const c = centreOf(ev); return Math.hypot(c.x - x, c.y - y); };

// Afsluitingen die nu gelden: [{ id, x, y, r, traffic }] voor het verkeer en de routeplanner.
export function closures(n, hour) {
  return activeEvents(n, hour).map((ev) => {
    const k = KINDS[ev.kind], c = centreOf(ev);
    return { id: ev.id, x: c.x, y: c.y, r: k.closure, traffic: k.traffic };
  });
}

// Factor op het autoverkeer op (x, y): 1 vrij, 0 dicht. De rand loopt zacht af.
export function trafficFactor(x, y, n, hour) {
  let f = 1;
  for (const c of closures(n, hour)) {
    const d = Math.hypot(c.x - x, c.y - y);
    if (d >= c.r) continue;
    const edge = Math.min(1, (c.r - d) / (c.r * 0.25)); // 0 aan de rand, 1 vanaf 25% naar binnen
    f = Math.min(f, 1 - edge * (1 - c.traffic));
  }
  return f;
}

// Mag een auto hier staan of rijden? Dicht is alleen waar de factor 0 is.
export const roadClosed = (x, y, n, hour) => trafficFactor(x, y, n, hour) <= 0;

// Een routeplanner die afsluitingen mijdt: is dit punt te mijden?
export const avoidPoint = (x, y, n, hour) => trafficFactor(x, y, n, hour) < 0.5;

// Extra meters voor de routeplanner op (x, y): 0 vrij, oplopend tot ROUTE_PENALTY_M in een dichte afsluiting.
export const ROUTE_PENALTY_M = 600;
export const routePenalty = (x, y, n, hour) => (1 - trafficFactor(x, y, n, hour)) * ROUTE_PENALTY_M;

// Menigte (0..1) op (x, y): dichtheid van voetgangers voor de spawnlaag.
export function crowdAt(x, y, n, hour) {
  let best = 0;
  for (const ev of activeEvents(n, hour)) {
    const k = KINDS[ev.kind], d = d2(ev, x, y), r = k.closure * 1.4;
    if (d >= r) continue;
    best = Math.max(best, k.crowd * (1 - d / r));
  }
  return best;
}

// Geluid: de sterkste bron op (x, y) als { sound, gain }, of null buiten bereik.
export function soundAt(x, y, n, hour) {
  let best = null;
  for (const ev of activeEvents(n, hour)) {
    const k = KINDS[ev.kind], d = d2(ev, x, y);
    if (d >= k.reach) continue;
    const gain = Math.pow(1 - d / k.reach, 1.5);
    if (!best || gain > best.gain) best = { sound: k.sound, gain, id: ev.id };
  }
  return best;
}

// Het evenement waar (x, y) middenin zit (binnen de afsluiting), voor het activiteitencontract
// ("er is hier iets te doen") en de kaartmarker. Nu actief of binnen `ahead` uur.
export function eventHere(x, y, n, hour, ahead = 0) {
  for (const ev of AGENDA) {
    if (n < ev.from || n > ev.to) continue;
    const live = isActive(ev, n, hour);
    const soon = !live && n === ev.from && hour < ev.hours[0] && ev.hours[0] - hour <= ahead;
    if (!live && !soon) continue;
    if (d2(ev, x, y) <= KINDS[ev.kind].closure) return { ev, live };
  }
  return null;
}

// Markers voor de kaart in de GTA/Watch-Dogs-stijl: { id, x, y, icon, label, live }
export function mapMarkers(n, hour) {
  return AGENDA.filter((ev) => n >= ev.from && n <= ev.to).map((ev) => {
    const c = centreOf(ev);
    return { id: ev.id, x: c.x, y: c.y, icon: KINDS[ev.kind].icon, label: ev.naam, live: isActive(ev, n, hour) };
  });
}

// --- gezien -----------------------------------------------------------------------------------

export const SEEN_KEY = 'gde-evenementen-v1';
export function loadSeen(storage, key = SEEN_KEY) {
  try {
    const a = JSON.parse((storage && storage.getItem(key)) || '[]');
    const ids = new Set(AGENDA.map((e) => e.id));
    return Array.isArray(a) ? a.filter((id) => ids.has(id)) : [];
  } catch (e) { return []; }
}
export function markSeen(storage, seen, id, key = SEEN_KEY) {
  if (seen.includes(id)) return seen;
  const out = [...seen, id];
  try { storage && storage.setItem(key, JSON.stringify(out)); } catch (e) { /* vol: het is maar een hint */ }
  return out;
}

// --- activiteitenkind (activities.js) --------------------------------------------------------
// Plekken voor kaart en spotcheck: alle evenementen van vandaag (nu bezig of nog te komen), of met
// `all` de hele agenda. { id, name, x, y, live, sub }
export function activitySpotsFor(n, hour, all = false) {
  const out = [];
  for (const ev of AGENDA) {
    const today = n >= ev.from && n <= ev.to;
    if (!all && !today) continue;
    const c = centreOf(ev), live = today && isActive(ev, n, hour);
    out.push({ id: ev.id, name: ev.naam, x: c.x, y: c.y, live, sub: `${ev.plaats} · ${timeLabel(ev)}${live ? ' · nu bezig' : ''}` });
  }
  return out;
}
