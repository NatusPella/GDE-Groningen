// Binnenvaartschip als baan (#1376, W3): de regels van De Drie Zusters op het Van Starkenborghkanaal.
// Puur: geen three.js, geen wereld, geen DOM. De wereldkant (sidejob_binnenvaart.js) zet het schip aan
// de kade en voedt deze regels met plek en snelheid.
//
// De Drie Zusters is een vaste spits (38,5 m) van Noorderspoor Water, het vervoerbedrijf van het Noorden,
// dat ook de bussen en treinen heeft (besluit eigenaar). Een overtocht is van kade naar kade over het
// kanaal: laden aan de kade, varen, rustig aanleggen en lossen. De lading zelf (bieten, graan, kisten, tarief
// per km) is W4; hier ligt alleen vast welke kades er zijn, wat het schip kan en wanneer een overtocht slaagt.
// Zomer, geen leed: een misser is een knorrige kadewachter, geen schade en geen slachtoffer.
//
// Samen spelen: de baan is van wie het spel opende (de wereld), zoals de zeeschepen; een gast ziet het doel en
// de voortgang via coopbijbaan.js en vaart niet mee (geen regel in BIJBAAN_REGELS) tot W6 de bemanningsrollen
// (stuurman, dekhulp) toevoegt. Loon en punten gaan bij de speler die vaart (vak Water).
// Tests: scripts/binnenvaart_test.mjs.

import { BOAT_KINDS } from './boattypes.js';
import { AIR_DRAFT, SHIPPING_CLEAR } from './waterlevels.js';

export const REDERIJ = 'Noorderspoor Water';

// Het schip: de maten komen uit boattypes.js (spits), de naam is vast.
export const SCHIP = Object.freeze({
  id: 'driezusters', naam: 'De Drie Zusters', soort: 'spits',
  len: BOAT_KINDS.spits.len, wid: BOAT_KINDS.spits.wid,
  maxSpeed: BOAT_KINDS.spits.maxSpeed, hoogte: AIR_DRAFT.binnenvaart,
});

// Wat een sluis of brug moet hebben om dit schip door te laten (marge in m).
export const MARGE = { breedte: 0.8, lengte: 2, hoogte: 0.3 };

// De kades langs het Van Starkenborghkanaal, van west naar oost. `water` is een punt midden op het kanaal
// (vaarnet.json, de knopen van de brede route), `kade` waar de speler instapt (de wereldkant zoekt de droge
// plek ernaast). Aan de oostkant ligt de Gaarkeuken-sluis van het kanaal bij de stad.
export const KADES = Object.freeze([
  { id: 'west', naam: 'de Westkade', water: { x: -2597, y: -3562 }, kade: { x: -2597, y: -3562 }, uitleg: 'de kade aan het westelijke eind van de rit' },
  { id: 'rustpunt', naam: 'de Kade bij het Rustpunt', water: { x: 53, y: -2247 }, kade: { x: 53, y: -2247 }, uitleg: 'de thuiskade van De Drie Zusters, bij het rustpunt aan het kanaal' },
  { id: 'oost', naam: 'de Oostkade', water: { x: 1603, y: -1212 }, kade: { x: 1603, y: -1212 }, uitleg: 'de kade vlak voor de sluis bij de stad' },
]);
export const THUIS = 'rustpunt';
export const kadeById = (id) => KADES.find((k) => k.id === id) || null;

// De regels van een overtocht. Maten in meters, snelheid in m/s, tijd in seconden.
export const OVERTOCHT = {
  aanlegR: 45,      // zo dicht bij de kade mag je aanleggen
  aanlegV: 1.2,     // langzamer dan dit ligt een schip van 38 m stil genoeg
  kadeR: 160,       // zo ver rond een kade geldt de kadelimiet
  kadeLimiet: 2.5,  // in de buurt van een kade mag het niet harder
  tehardMax: 8,     // zoveel seconden te hard en de overtocht mislukt
  ladenS: 6,        // laden aan de startkade: zolang stilliggen
  lossenS: 5,       // lossen aan de eindkade
  perM: 0.17,       // s budget per meter route (ca. 6 m/s zou te snel zijn voor dit schip: ruim genomen)
  vast: 120,        // s extra voor laden, lossen en aanleggen
  perNiveau: 0.06,  // zoveel van het budget gaat er per niveau af (hoogstens 5 niveaus)
};

const wachtTijd = (v, standaard) => (Number.isFinite(v) && v >= 0 ? Math.min(120, v) : standaard);
const clampNiveau = (l) => Math.max(1, Math.min(5, Math.round(Number.isFinite(l) ? l : 1)));
const afstand = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Past dit schip door een obstakel? o: { kind: 'vast'|'beweegbaar'|'sluis', clear?, width?, length? } (m).
// - vaste brug: de doorvaarthoogte moet hoger zijn dan het schip (leeg, de stuurhut ingeklapt).
// - beweegbare brug: hij gaat open; altijd een doorgang.
// - sluis: breed en lang genoeg voor schip plus marge.
export function schipPast(o, schip = SCHIP) {
  if (!o || typeof o !== 'object') return { ok: false, reden: 'onbekend' };
  if (o.kind === 'beweegbaar') return { ok: true, reden: 'opent' };
  if (o.kind === 'sluis') {
    if (!(o.width >= schip.wid + MARGE.breedte)) return { ok: false, reden: 'te-smal' };
    if (Number.isFinite(o.length) && o.length < schip.len + MARGE.lengte) return { ok: false, reden: 'te-kort' };
    return { ok: true, reden: 'sluis' };
  }
  if (o.kind === 'vast') {
    const clear = Number.isFinite(o.clear) ? o.clear : SHIPPING_CLEAR;
    return clear >= schip.hoogte + MARGE.hoogte ? { ok: true, reden: 'ruim' } : { ok: false, reden: 'te-laag' };
  }
  return { ok: false, reden: 'onbekend' };
}

// Alle obstakels van een route: { ok, blokkades: [{ obstakel, reden }] }.
export function routeControle(obstakels, schip = SCHIP) {
  const blokkades = [];
  for (const o of obstakels || []) {
    const r = schipPast(o, schip);
    if (!r.ok) blokkades.push({ obstakel: o, reden: r.reden });
  }
  return { ok: blokkades.length === 0, blokkades };
}

// De overtochten die er zijn: van elke kade naar elke andere. Lengte in m (hemelsbreed * 1,25 voor de kromming).
export function overtochten() {
  const lijst = [];
  for (const a of KADES) for (const b of KADES) {
    if (a.id === b.id) continue;
    lijst.push({ id: `${a.id}-${b.id}`, van: a.id, naar: b.id, lengte: Math.round(afstand(a.water, b.water) * 1.25) });
  }
  return lijst;
}
export const overtochtById = (id) => overtochten().find((o) => o.id === id) || null;

// Welke overtocht hoort bij dit niveau en deze beurt (afwisselen): vanaf de thuiskade eerst de korte,
// op hoger niveau de lange; aan een andere kade terug naar huis.
export function kiesOvertocht(level = 1, beurt = 0, vanKade = THUIS) {
  const alle = overtochten().filter((o) => o.van === vanKade).sort((a, b) => a.lengte - b.lengte);
  if (!alle.length) return null;
  const i = clampNiveau(level) >= 3 ? (beurt % alle.length) : 0;
  const o = alle[Math.min(i, alle.length - 1)];
  return o;
}

// Een schone overtocht; null bij een onbekende. `opties.ladenS` en `opties.lossenS` komen uit het contract (vaarvracht.js); zonder is het de standaardtijd.
export function maakOvertocht(id, level = 1, opties = {}) {
  const o = overtochtById(id);
  if (!o) return null;
  const budget = (o.lengte * OVERTOCHT.perM + OVERTOCHT.vast) * (1 - (clampNiveau(level) - 1) * OVERTOCHT.perNiveau);
  const van = kadeById(o.van), naar = kadeById(o.naar);
  return {
    id: o.id, van: o.van, naar: o.naar, lengte: o.lengte, fase: 'laden', t: 0, budget: Math.round(budget),
    wacht: 0, tehard: 0, stoten: 0, klaar: false, mislukt: false, anker: false, verteld: false,
    ladenS: wachtTijd(opties.ladenS, OVERTOCHT.ladenS), lossenS: wachtTijd(opties.lossenS, OVERTOCHT.lossenS),
    koers: Math.atan2(naar.water.y - van.water.y, naar.water.x - van.water.x),
  };
}

// Waar de volgende stap heen gaat.
export function doelVan(s) {
  const k = kadeById(s && (s.fase === 'laden' ? s.van : s.naar));
  return k ? { x: k.water.x, y: k.water.y, label: k.naam } : null;
}

// Geldt hier de kadelimiet? (binnen kadeR van de start- of eindkade)
export function bijKade(s, x, y) {
  if (!s || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  return [kadeById(s.van), kadeById(s.naar)].some((k) => k && afstand(k.water, { x, y }) <= OVERTOCHT.kadeR);
}

export const faseTekst = (s) => (!s ? '' : s.fase === 'laden' ? 'Laden aan de kade' : s.fase === 'lossen' ? 'Lossen aan de kade' : 'Op weg naar ' + (doelVan(s) || {}).label);

// Eén stap. Geeft de gebeurtenissen: 'tehard', 'geladen', 'aangelegd', 'klaar' of 'fail' (met `why`).
export function stapOvertocht(s, { x, y, speed = 0, bump = 0 } = {}, dt = 0) {
  const ev = [];
  if (!s || s.klaar || s.mislukt || !(dt > 0)) return ev;
  if (s.anker) return ev;       // voor anker: er verstrijkt niets, de kadewachter wacht (W6: de stuurman is even weg)
  s.t += dt;
  if (bump > 0) s.stoten += bump;
  if (bijKade(s, x, y) && speed > OVERTOCHT.kadeLimiet) {
    s.tehard += dt;
    ev.push({ type: 'tehard', rest: Math.max(0, OVERTOCHT.tehardMax - s.tehard) });
    if (s.tehard >= OVERTOCHT.tehardMax) { s.mislukt = true; ev.push({ type: 'fail', why: 'te vaak te hard gevaren bij de kade' }); return ev; }
  }
  if (s.t > s.budget) { s.mislukt = true; ev.push({ type: 'fail', why: 'de kadewachter staat niet langer te wachten' }); return ev; }
  const d = doelVan(s), dist = Math.hypot(d.x - x, d.y - y);
  const stil = speed <= OVERTOCHT.aanlegV;
  if (s.fase === 'laden') {
    // je ligt aan de startkade: stilliggen tot de lading aan boord is, daarna vaar je
    if (dist <= OVERTOCHT.aanlegR && stil) {
      s.wacht += dt;
      if (s.wacht >= s.ladenS) { s.fase = 'varen'; s.wacht = 0; ev.push({ type: 'geladen' }); }
    } else s.wacht = 0;
  } else if (s.fase === 'varen') {
    if (dist <= OVERTOCHT.aanlegR && stil) { s.fase = 'lossen'; s.wacht = 0; ev.push({ type: 'aangelegd' }); }
  } else if (s.fase === 'lossen') {
    if (dist <= OVERTOCHT.aanlegR * 1.4 && stil) {
      s.wacht += dt;
      if (s.wacht >= s.lossenS) { s.klaar = true; ev.push({ type: 'klaar' }); }
    } else s.wacht = 0;
  }
  return ev;
}

// Wat de overtocht oplevert: lengte telt mee, op tijd en zonder stoten geeft de fooi.
export function uitslagVan(s) {
  if (!s || !s.klaar) return { base: 0, tip: 0, flawless: false, text: 'De Drie Zusters ligt nog niet aan de eindkade.', failed: true };
  const opTijd = Math.max(0, 1 - s.t / s.budget);
  const schoon = s.tehard === 0 && s.stoten < 0.2;
  const km = s.lengte / 1000;
  return {
    base: Math.round(Math.max(0, 100 + km * 30 + opTijd * 60 - s.tehard * 4)),
    tip: (schoon ? 35 : 0) + (s.verteld ? GIDS_FOOI : 0),
    flawless: schoon,
    text: schoon ? 'Netjes aangelegd: de kadewachter steekt zijn duim op.' : 'De lading staat aan wal, de kadewachter keek even.',
    failed: false,
  };
}

// --- Samen spelen (W6): de bemanning ---------------------------------------------------------------------------------------------------------
// De baan is van wie het spel opende: die is de stuurman en vaart. Een meespelende gast is dekhulp (helpt met E bij het laden en lossen), de volgende
// gast is gids (vertelt tijdens het varen met E; dat levert elke deelnemer een extra fooi op), wie daarna komt vaart mee als bemanning.
// Valt de stuurman even weg van het roer, dan ligt het schip voor anker: de overtocht staat stil en niets mislukt.
export const ROLLEN = Object.freeze(['stuurman', 'dekhulp', 'gids']);
export const GIDS_FOOI = 20;
export const ROL_TEKST = Object.freeze({
  stuurman: 'Je staat aan het roer: je vaart.',
  dekhulp: 'Je bent dekhulp: druk bij de kade op E om te helpen bij het laden en lossen.',
  gids: 'Je bent gids: druk tijdens het varen op E om iets te vertellen; dat levert een extra fooi op.',
  bemanning: 'Je vaart mee als bemanning.',
});
// plek (slot) -> rol. `deelnemers` zijn de plekken die meedoen, in de volgorde waarin ze zich meldden (de stuurman mag erbij staan of niet): de eerste is
// dekhulp, de tweede gids, de rest bemanning.
export function bemanningVan(deelnemers, stuurman = 0) {
  const uit = { [stuurman]: 'stuurman' };
  const rest = [...new Set((Array.isArray(deelnemers) ? deelnemers : []).filter((n) => Number.isInteger(n) && n !== stuurman))];
  rest.forEach((slot, i) => { uit[slot] = i < ROLLEN.length - 1 ? ROLLEN[i + 1] : 'bemanning'; });
  return uit;
}
// Voor anker leggen of weer losgooien. Alleen een lopende overtocht kan voor anker.
export function zetAnker(s, aan) {
  if (!s || s.klaar || s.mislukt) return false;
  s.anker = !!aan;
  return true;
}
// De gids vertelt iets: alleen tijdens het varen, hoogstens één keer per overtocht. Geeft true als het meetelt.
export function vertelAanBoord(s) {
  if (!s || s.fase !== 'varen' || s.verteld || s.anker || s.klaar || s.mislukt) return false;
  s.verteld = true;
  return true;
}
// De dekhulp helpt: alleen bij laden of lossen aan de kade, vlak bij het schip. Geeft de nieuwe resterende wachttijd of null als hij niet kan helpen.
export function helpAanKade(s, stap = 1.5) {
  if (!s || s.klaar || s.mislukt || s.anker) return null;
  if (s.fase !== 'laden' && s.fase !== 'lossen') return null;
  const totaal = s.fase === 'laden' ? s.ladenS : s.lossenS;
  const rest = Math.max(0, totaal - s.wacht);
  if (!(rest > 0)) return null;
  s.wacht = Math.min(totaal, s.wacht + Math.max(0, stap));
  return Math.max(0, totaal - s.wacht);
}

export const voortgangTekst = (s) => {
  if (!s) return '';
  if (s.klaar) return 'Aan de eindkade';
  return `${faseTekst(s)} · nog ${Math.max(0, Math.ceil(s.budget - s.t))} s`;
};
