// Intocht na een verovering (#704 epic, #705-#708, #716, #736): de wachtrij, de rust-poort,
// de stops uit de catalogus, de scenecatalogus (één bewezen wijk) en de eenmalig-per-speler-regel.
//
// Puur: geen DOM, geen THREE, geen opslag. gebiedenlive.js zet de beloning in de wachtrij,
// int ochten.js speelt hem als de speler rustig is, en de camera-baan komt uit camerapath.js
// (veroverTourShot). De volgorde is bewust: de laatste taak van een wijk valt bijna altijd aan
// het einde van een missie of minigame, dus de film wacht op een rustig moment in plaats van
// meteen de camera over te nemen.
//
// Eén film per veroverde eenheid (wijk of woonplaats). Geliefde buurten waar het verhaal begint
// (#736) krijgen dezelfde motor als korte "thuiskomst"-variant, met de buurt als eenheid en de
// CBS-wijk als verover-eenheid.

import { puntInGebied } from './grenzen.js';
import { huisVan, gebiedenVan, intochtGezien } from './gebieden.js';

export const MOMENT = 'veroverd';          // de attention-groep van deze film (hudbus.js)
export const WACHTVELD = 'veroverWacht';   // de wachtrij staat op de wereld van deze speler
export const RUST_S = 2.5;                 // zo lang na de vorige film is het rustig genoeg
export const NA_BELONING_S = 2;            // en zo lang na de beloning zelf
export const MIN_STOPS = 3;
export const MAX_STOPS = 5;
export const MAX_INTOCHT_SECONDEN = 40;

const SOORT_RANG = { missie: 0, baan: 1, spel: 2, vondst: 3, geheim: 4, plek: 5, landmark: 6, huis: 7 };

// --- de wachtrij en de rust-poort (#705) ---------------------------------------------------

export const wachtrij = (w) => (w && Array.isArray(w[WACHTVELD]) ? w[WACHTVELD] : []);

// De beloning gaat in de wachtrij; dezelfde verovering komt er niet twee keer in. Geeft true als
// er iets bij kwam. `nu` is de speltijd van dit moment, voor de wachttijd na de beloning.
export function wachtOpIntocht(w, beloning, nu = 0) {
  if (!w || !beloning || typeof beloning.gebied !== 'string' || !beloning.gebied) return false;
  if (!Array.isArray(w[WACHTVELD])) w[WACHTVELD] = [];
  if (w[WACHTVELD].some((b) => b && b.gebied === beloning.gebied)) return false;
  w[WACHTVELD].push({ ...beloning, in: Number.isFinite(nu) ? nu : 0 });
  return true;
}

export function neemIntocht(w) {
  return wachtrij(w).length ? w[WACHTVELD].shift() : null;
}

// Is de wereld rustig genoeg voor een film? Zonder de wachtrij-eis, zodat de korte
// "thuiskomst" (#736) dezelfde poort kan gebruiken.
export function isRustig(ctx = {}) {
  if (ctx.cinematic || ctx.banner || ctx.respawn || ctx.busy || ctx.menu || ctx.map) return false;
  if ((Number.isFinite(ctx.wanted) ? ctx.wanted : 0) > 0) return false;
  if (Number.isFinite(ctx.sindsFilm) && ctx.sindsFilm < RUST_S) return false;
  if (Number.isFinite(ctx.sindsBeloning) && ctx.sindsBeloning < NA_BELONING_S) return false;
  return true;
}

// Mag de intocht nu? De wereld moet vrij zijn (zie isRustig) en er moet iets in de wachtrij staan.
// ctx: { cinematic, banner, respawn, busy, menu, map, wanted, sindsFilm, sindsBeloning }
export function magIntocht(w, ctx = {}) {
  return wachtrij(w).length > 0 && isRustig(ctx);
}

// --- de stops uit de catalogus (#706) ------------------------------------------------------

// De stops van een intocht: eerst de vaste ankers van de scène (1-2 plekken), dan de taken van
// het gebied (belangrijkste eerst, per beurt een andere soort), dan landmarks binnen de
// polygoon, dan het safehouse. Altijd 3-5 stops, ook als een wijk weinig taken heeft.
export function kiesStops(ind, gebiedId, { scene = null, landmarks = [], max = MAX_STOPS } = {}) {
  const uit = [];
  const seen = new Set();
  const duw = (s) => { if (s && !seen.has(s.id) && uit.length < max) { seen.add(s.id); uit.push(s); } };
  for (const a of (scene && scene.ankers) || []) duw({ id: 'a:' + a.naam, soort: 'plek', naam: a.naam, x: a.x, y: a.y, hoog: a.h || 0 });
  const g = ind && ind.gebied && ind.gebied.get(gebiedId);
  if (!g) return uit;
  const taken = (g.taken || []).map((id) => ind.taak && ind.taak.get(id)).filter(Boolean)
    .sort((a, b) => (SOORT_RANG[a.soort] ?? 9) - (SOORT_RANG[b.soort] ?? 9) || String(a.id).localeCompare(String(b.id)));
  let vorigeSoort = null;
  const rest = taken.slice();
  while (rest.length && uit.length < max - 1) {
    let k = rest.findIndex((t) => t.soort !== vorigeSoort);
    if (k < 0) k = 0;
    const t = rest.splice(k, 1)[0];
    vorigeSoort = t.soort;
    duw({ id: t.id, soort: t.soort, naam: t.naam, x: t.x, y: t.y, hoog: 0 });
  }
  if (g.grens) for (const l of landmarks || []) { if (!l || !Number.isFinite(l.x) || !Number.isFinite(l.y)) continue; if (puntInGebied(g.grens, l.x, l.y)) duw({ id: 'l:' + l.name, soort: 'landmark', naam: l.name, x: l.x, y: l.y, hoog: 0 }); }
  const huis = huisVan(ind, gebiedId);
  if (huis) duw({ id: huis.id, soort: 'huis', naam: huis.naam, x: huis.x, y: huis.y, hoog: 0 });
  // een wijk met twee taken en geen huis: het midden van het gebied is de derde stop
  if (uit.length < MIN_STOPS && Number.isFinite(g.x) && Number.isFinite(g.y)) duw({ id: 'g:' + g.id, soort: 'plek', naam: g.naam, x: g.x, y: g.y, hoog: 0 });
  return uit.slice(0, max);
}

// De keyframes van de tocht (#706): overzicht → 3-5 stops → eindbeeld achter de speler. De
// hoogte wisselt per stop (laag op ooghoogte, hoog over de daken); camerapath.js tilt ze met
// clearPath over de gebouwen en maakt er een vloeiende baan van.
export function tourKeys(gebied, stops, behind, { hoog = 26 } = {}) {
  const g = gebied || {};
  const keys = [];
  const gx = Number.isFinite(g.x) ? g.x : (stops[0] && stops[0].x) || 0;
  const gy = Number.isFinite(g.y) ? g.y : (stops[0] && stops[0].y) || 0;
  keys.push({ pos: { x: gx - 24, y: gy - 34, z: hoog }, look: { x: gx, y: 4, z: gy }, fov: 55 });
  let vorige = { x: gx, y: gy };
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i];
    const dx = s.x - vorige.x, dy = s.y - vorige.y;
    const d = Math.hypot(dx, dy) || 1;
    const af = 9;
    const z = i % 2 ? 12 : 2.2;
    keys.push({ pos: { x: s.x - (dx / d) * af, y: s.y - (dy / d) * af, z }, look: { x: s.x, y: 1.6, z: s.y }, fov: i % 2 ? 52 : 58 });
    vorige = s;
  }
  if (behind && behind.pos && behind.look) keys.push({ pos: { ...behind.pos }, look: { ...behind.look }, fov: 60 });
  return keys;
}

// --- de scenecatalogus (#707: één bewezen wijk) --------------------------------------------

// Eén volledig uitgewerkte scène als eerste slice (docs/archief/review-cutscenes-2026-11-06/
// 07-wijk-scenes-ontwerp.md §3): Oud-Oost "De stoep". De andere wijken volgen in dezelfde vorm:
// { wijk, titel, seconden, sfeer, ankers: [{ naam, x, y, h? }], regels: [{ stem, tekst }] }.
export const INTOCHTEN = [
  {
    wijk: 'Oud-Oost',
    titel: 'De stoep',
    seconden: 34,
    sfeer: 'energiek, dan stil',
    ankers: [
      { naam: 'Korenbloemstraat', x: 1308, y: -805, h: 1.6 },
      { naam: 'Trompsingel', x: 594, y: 635, h: 2.2 },
      { naam: 'Kop van Oost', x: 1256, y: 228, h: 24 },
    ],
    regels: [
      { stem: 'Rikus', tekst: 'Hier repeteert elke band die later beroemd wordt. Of niet.' },
      { stem: 'Tammo', tekst: 'Hij had een mengtafel van karton.' },
      { stem: 'Rikus', tekst: 'En twee luisteraars.' },
    ],
  },
];

export const intochtVoor = (naam) => INTOCHTEN.find((s) => s && s.wijk === naam) || null;

// De generieke variant voor een veroverd gebied zonder eigen scène: kort, met de titel en de
// veilige stops uit de catalogus. Zo krijgt elke verovering een film, ook zonder handwerk.
export function generiekVoor(beloning) {
  const naam = (beloning && beloning.naam) || 'de wijk';
  return {
    wijk: naam, titel: 'Intocht', seconden: 24, sfeer: 'droog, welkom', ankers: [],
    regels: [
      { stem: 'Rikus', tekst: `Daar is ${naam}. Het is niet groter geworden, maar het is van jou.` },
      { stem: 'Tammo', tekst: 'Mooi. Wat nu?' },
      { stem: 'Rikus', tekst: 'Nu doen alsof het altijd zo was.' },
    ],
  };
}

// De intocht van een beloning: de eigen scène of de generieke, met de stops uit de catalogus.
export function maakIntocht(ind, beloning, { landmarks = [] } = {}) {
  if (!beloning || !beloning.gebied) return null;
  const scene = intochtVoor(beloning.naam) || generiekVoor(beloning);
  const stops = kiesStops(ind, beloning.gebied, { scene, landmarks });
  const g = ind && ind.gebied && ind.gebied.get(beloning.gebied);
  return { ...scene, gebied: beloning.gebied, naam: beloning.naam, titel: beloning.titel || scene.titel, x: g ? g.x : 0, y: g ? g.y : 0, stops };
}

// --- terminologie (#716) -------------------------------------------------------------------
// Twee lagen heten allebei "wijk" in het spel: de 66 buurtpunten van stad.json (HUD/kaart) en de
// 123 CBS-wijken van grenzen.json (veroveren, titels, safehouses). Eén term per laag: de buurt is
// de emotionele eenheid en de plek waar je woont, de wijk is de verover-eenheid met titel en vlag.
export const TERMEN = Object.freeze({ provincie: 'provincie', gemeente: 'gemeente', woonplaats: 'woonplaats', wijk: 'wijk', buurt: 'buurt' });
export const termVoor = (laag) => TERMEN[laag] || String(laag || '');
export const termUitleg = (laag) => (laag === 'buurt'
  ? 'Een buurt is een plek waar je woont en die je bij naam kent (de buurtpunten van de kaart).'
  : laag === 'wijk'
    ? 'Een wijk is de verover-eenheid met titel en vlag (de CBS-wijken van de kaart).'
    : '');

// --- geliefde buurten (#736) ----------------------------------------------------------------
// Buurten waar het verhaal begint en waar de speler herinneringen heeft, halen op de vaste
// taakankers 0-1 taken en zijn dus niet veroverbaar. Ze krijgen dezelfde motor als korte
// "thuiskomst"-film, met de buurt als eenheid; de CBS-wijk blijft de verover-eenheid.
export const GELIEFDE_BUURTEN = ['Oosterparkwijk', 'Korrewegwijk', 'Noorderplantsoenbuurt', 'Selwerd', 'Herewegbuurt', 'De Hoogte', 'Westerhaven', 'Ebbingekwartier'];
export const THUISKOMST_SECONDEN = 12;
export const BUURT_STRAAL = 140;

// De dichtstbijzijnde geliefde buurt bij (x, y) binnen de straal, of null.
export function geliefdeBuurt(punten, x, y, straal = BUURT_STRAAL) {
  if (!Array.isArray(punten) || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  let best = null;
  for (const q of punten) {
    if (!q || !GELIEFDE_BUURTEN.includes(q.name) || !Number.isFinite(q.x) || !Number.isFinite(q.y)) continue;
    const d = Math.hypot(q.x - x, q.y - y);
    if (d <= straal && (!best || d < best.afstand)) best = { naam: q.name, x: q.x, y: q.y, afstand: d };
  }
  return best;
}

// De korte thuiskomst-film voor een geliefde buurt (zelfde motor, korter).
export function buurtIntocht(ind, buurtId, { landmarks = [] } = {}) {
  const g = ind && ind.gebied && ind.gebied.get(buurtId);
  if (!g) return null;
  return {
    gebied: buurtId, naam: g.naam, wijk: g.naam, titel: 'Thuiskomst', seconden: THUISKOMST_SECONDEN, x: g.x, y: g.y,
    sfeer: 'warm, even stil', ankers: [],
    regels: [{ stem: 'Rikus', tekst: `Weer op de stoep van ${g.naam}. Niemand vraagt waar je was.` }],
    stops: kiesStops(ind, buurtId, { landmarks, max: MIN_STOPS }),
  };
}

// #736: de thuiskomst die nu past, of null. De buurt is de emotionele eenheid (waar je woont en
// waar het verhaal begint), de CBS-wijk de verover-eenheid. De film komt pas als de ouder-wijk
// veroverd is, de speler echt in de buurt staat en de buurt nog niet gezien is.
export function thuiskomstVoor(ind, profiel, punten, x, y, { landmarks = [], straal = BUURT_STRAAL } = {}) {
  const buurt = geliefdeBuurt(punten, x, y, straal);
  if (!buurt || !ind) return null;
  const ids = gebiedenVan(ind, x, y);
  const g = ids.buurt && ind.gebied.get(ids.buurt);
  if (!g || g.naam !== buurt.naam) return null;
  if (intochtGezien(profiel, g.id)) return null;
  const ouder = g.ouder && ind.gebied.get(g.ouder);
  if (!ouder || !profiel || !Array.isArray(profiel.beloond) || !profiel.beloond.includes(ouder.id)) return null;
  const film = buurtIntocht(ind, g.id, { landmarks });
  return film && film.stops.length >= MIN_STOPS ? film : null;
}
