// Controller-review in het spel (22-11): de volledige inventaris van alle spelacties tegen de indeling van toetsenbord en controller.
// Per actie en situatie (te voet, elk voertuigtype, boot, vliegtuig, heli, duif, trein, trekker) zegt dit waar de actie op het pad zit
// (een knop, de stick, een trigger, het acties-wiel van controls.js) of dat ze er niet op zit; het zoekt acties zonder controllerknop,
// botsende toetsen (een toets die in een situatie twee dingen doet, #495), verdringing door Samen spelen (PAD_COOP) en vrije knoppen,
// en controleert dat elke toets in de speltekst ({E}, {6}, ...) in elke situatie een glyph krijgt.
//   node scripts/controller_ingame_audit.mjs            rapport
//   node scripts/controller_ingame_audit.mjs --json     alles als JSON
//   node scripts/controller_ingame_audit.mjs --zonder-wiel   de stand van voor het acties-wiel (alleen PAD_MAPS en PAD_COOP), voor de vergelijking in het reviewdocument
// De borging (met de bekende uitzonderingen en hun reden) staat in scripts/controller_ingame_test.mjs; de indeling als tabel en
// cheatsheet maakt scripts/controller_ingame_doc.mjs. Puur: geen Electron, geen DOM.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PAD_MAPS, PAD_COOP, PAD_BUTTONS, WHEEL_CTX, wheelItemsFor, padSlotFor, padWheelFor, tokenKey, KEY_ACTIONS } from '../game/js/controls.js';
import { padSlotGlyph, keyGlyph } from '../game/js/inputglyphs.js';

// de situaties van het spel waarin de speler zelf loopt, rijdt of vliegt (de activiteiten met een eigen indeling staan in ACTIVITEITEN)
export const SITUATIES = {
  foot: 'Te voet', hengelen: 'Aan de waterkant (hengelen)', vehicle: 'Auto, scooter, fiets', vehicleManual: 'Auto, handmatig schakelen', bus: 'Bus',
  skutsje: 'Boot (zeilen)', trekker: 'Trekker op het erf', heli: 'Helikopter', plane: 'Vliegtuig', pigeon: 'Duif', train: 'Trein (machinist)',
};
export const ACTIVITEITEN = {
  minigame: 'Bijbaan of tekstpaneel', coopvraag: 'Vraag van Samen spelen (J of N)', klokken: 'Carillon', pannenkoek: 'Pannenkoekenschip', klimtoren: 'Klimtoren',
  voetbal: 'Voetbal (Euroborg)', foodtruck: 'Snackwagen', vliegschool: 'Vliegschool (lesmenu)', menu: 'Menu, telefoon en kaart',
};
const VOET = ['foot', 'hengelen'];
const AUTO = ['vehicle', 'vehicleManual', 'bus'];
const ALLES = Object.keys(SITUATIES);

// De inventaris. key: de toets die het spel kent (canoniek, controls.js); shift: met Shift erbij; ctx: waar de actie bestaat;
// samen: alleen in een Samen-spelen-sessie. 'lmb', 'rmb', 'wheel' en 'mouse' zijn de muis.
const A = (groep, id, label, key, ctx, extra = {}) => ({ groep, id, label, key, ctx, ...extra });
export const ACTIES = [
  // lopen, rijden, vliegen: de stick en de triggers
  A('Bewegen', 'vooruit', 'Vooruit, gas', 'w', ALLES), A('Bewegen', 'achteruit', 'Achteruit, remmen', 's', ALLES),
  A('Bewegen', 'links', 'Links, sturen', 'a', ALLES.filter((c) => c !== 'train')), A('Bewegen', 'rechts', 'Rechts, sturen', 'd', ALLES.filter((c) => c !== 'train')),
  A('Bewegen', 'camera', 'Rondkijken (camera)', 'mouse', ALLES),
  A('Bewegen', 'springen', 'Springen, handrem, omhoog, noodrem', ' ', ALLES),
  // bij handmatig schakelen is Shift niet de versnelling: de bumpers schakelen en L3 is de koppeling
  A('Bewegen', 'rennen', 'Rennen, versnelling, duiken', 'shift', ALLES.filter((c) => c !== 'train' && c !== 'vehicleManual')),
  A('Bewegen', 'bukken', 'Bukken, omlaag, neus omlaag', 'control', [...VOET, 'heli', 'plane', 'pigeon']),
  A('Bewegen', 'omhoogschakelen', 'Een versnelling hoger', '.', ['vehicleManual']), A('Bewegen', 'omlaagschakelen', 'Een versnelling lager', ',', ['vehicleManual']),
  A('Bewegen', 'koppeling', 'Koppeling indrukken', 'j', ['vehicleManual']),
  A('Bewegen', 'achterom', 'Achterom kijken', 'q', [...AUTO, 'trekker']),
  // te voet
  // in het vliegtuig is E het roer rechts (planecontrol.js), geen gebruikstoets
  A('Acties', 'gebruiken', 'Instappen, praten, gebruiken', 'e', ALLES.filter((c) => c !== 'plane')), A('Acties', 'gebruiken2', 'Tweede gebruikstoets (uitstappen)', 'f', VOET, { alias: 'e' }),
  A('Acties', 'kusje', 'Kusje', 'k', VOET), A('Acties', 'kleren', 'Andere kleren (toets 6)', '6', [...VOET, ...AUTO, 'skutsje', 'trekker']),
  A('Acties', 'hengelen', 'Hengelen', 'i', ['hengelen', 'vehicle', 'vehicleManual', 'skutsje']),
  A('Acties', 'garage', 'Lak of garagemenu', 'r', [...VOET, 'vehicle', 'vehicleManual']),
  A('Acties', 'toeteren-voet', 'Toeteren te voet', 'h', VOET),
  A('Acties', 'geluid', 'Geluid aan of uit', 'u', ALLES),
  // wapens en spullen
  A('Wapens', 'schieten', 'Aanvallen, schieten', 'lmb', [...VOET, 'pigeon', 'vehicle', 'vehicleManual', 'trekker']),
  A('Wapens', 'richten', 'Richten', 'rmb', VOET), A('Wapens', 'wapenwissel', 'Vorig of volgend wapen', 'wheel', VOET),
  A('Wapens', 'slaan', 'Slaan (direct)', '1', VOET), A('Wapens', 'pistool', 'Pistool (direct)', '2', VOET), A('Wapens', 'geweer', 'Geweer (direct)', '3', VOET),
  A('Wapens', 'gooien', 'Gooien (direct)', '4', VOET), A('Wapens', 'doelwit', 'Volgend doelwit, spelerslijst', 'tab', VOET),
  // kaart, telefoon, verhaal
  A('Menu', 'kaart', 'Kaart', 'm', ALLES), A('Menu', 'menu', 'Pauzemenu en telefoon', 'escape', ALLES),
  A('Menu', 'waypoint', 'Waypoint naar je eigen doel', '5', [...VOET, ...AUTO, 'skutsje', 'trekker', 'heli', 'plane']),
  A('Menu', 'overslaan', 'Verhaalstap overslaan', 'o', [...VOET, 'vehicle', 'vehicleManual', 'trekker']),
  A('Menu', 'stop', 'Minigame of vluchtdienst stoppen', 'backspace', ['plane', 'heli', 'train']),
  // camera
  A('Camera', 'film', 'Filmcamera', 'v', [...VOET, 'vehicle', 'vehicleManual', 'bus', 'skutsje', 'trekker', 'heli']),
  A('Camera', 'eerstepersoon', 'Eerste persoon aan of uit', 'c', [...VOET, ...AUTO, 'skutsje', 'trekker', 'heli', 'plane']),
  A('Camera', 'cabinecamera', 'Cabinecamera (trein)', 'c', ['train']),
  // radio
  A('Radio', 'radio', 'Radio aan of uit', 'n', ALLES), A('Radio', 'zender', 'Volgende zender (Shift + N)', 'n', ALLES, { shift: true }),
  A('Radio', 'vorige-zender', 'Vorige zender (Alt + N)', 'n', ALLES, { alt: true }),
  // voertuigen
  A('Voertuig', 'toeteren', 'Toeteren', 'h', [...AUTO, 'skutsje', 'trekker', 'train']), A('Voertuig', 'sirene', 'Zwaailicht en sirene', 'l', [...AUTO, 'skutsje']),
  A('Voertuig', 'links-aanwijzer', 'Richtingaanwijzer links', '[', [...AUTO, 'trekker']), A('Voertuig', 'rechts-aanwijzer', 'Richtingaanwijzer rechts', ']', [...AUTO, 'trekker']),
  A('Voertuig', 'alarm', 'Alarmlichten', 'p', [...AUTO, 'trekker']),
  A('Voertuig', 'bus-deuren', 'Bus: deuren', 'o', ['bus']), A('Voertuig', 'bus-kneel', 'Bus: kneel', 'k', ['bus']), A('Voertuig', 'busdienst', 'Bus: de dienst overnemen', 'g', ['bus']),
  A('Voertuig', 'zeil-aan', 'Boot: zeil aanhalen', 'q', ['skutsje']), A('Voertuig', 'zeil-vieren', 'Boot: zeil vieren', 'z', ['skutsje']),
  A('Voertuig', 'aftakas', 'Trekker: aftakas', 'g', ['trekker']), A('Voertuig', 'hef', 'Trekker: hef omhoog of omlaag', 't', ['trekker']),
  A('Voertuig', 'ontkoppelen', 'Trekker: werktuig ontkoppelen', 'x', ['trekker']), A('Voertuig', 'tanken', 'Trekker: tanken', 'r', ['trekker']),
  A('Voertuig', 'roer-links', 'Vliegtuig: roer links', 'q', ['plane']), A('Voertuig', 'roer-rechts', 'Vliegtuig: roer rechts', 'e', ['plane']),
  A('Voertuig', 'gestel', 'Vliegtuig: landingsgestel', 'g', ['plane']), A('Voertuig', 'kleppen', 'Vliegtuig: kleppen', 'k', ['plane']),
  A('Voertuig', 'trein-deuren', 'Trein: deuren', 'o', ['train']), A('Voertuig', 'trein-waak', 'Trein: waakzaamheidsknop', 'k', ['train']),
  A('Voertuig', 'trein-start', 'Trein: dienst starten', 'g', ['train']), A('Voertuig', 'trein-lopen', 'Trein: door de trein lopen', 't', ['train']),
  A('Voertuig', 'duif-poepen', 'Duif: poepen', 'f', ['pigeon']), A('Voertuig', 'duif-koeren', 'Duif: koeren', 'c', ['pigeon']), A('Voertuig', 'duif-mens', 'Duif: weer mens worden', 'x', ['pigeon']),
  // Samen spelen
  A('Samen spelen', 'ping-hier', 'Roepen: Kom hier', '7', ALLES, { samen: true }), A('Samen spelen', 'ping-help', 'Roepen: Help!', '8', ALLES, { samen: true }),
  A('Samen spelen', 'ping-kijk', 'Wijzen: Kijk daar', '9', ALLES, { samen: true }),
  A('Samen spelen', 'zinnenwiel', 'Wiel met snelle zinnen', 't', [...VOET, ...AUTO, 'skutsje'], { samen: true }),
  A('Samen spelen', 'stuur', 'Het stuur geven of vragen', 'y', [...AUTO, 'skutsje'], { samen: true }),
  A('Samen spelen', 'bij-groep', 'Bij de groep komen', 'b', VOET, { samen: true }),
];

// Bekende uitzonderingen: actie-id naar reden. Een actie zonder plek op het pad die hier niet staat laat de test falen; een uitzondering
// die niet meer nodig is ook. De reden is de onderbouwing (besluit van de eigenaar, bron, alternatief).
// samen: true = alleen in een Samen-spelen-sessie (PAD_COOP neemt de plek); dan blijft de actie buiten de sessie op haar knop.
export const ZONDER_PAD = {
  achterom: { samen: true, reden: 'Samen spelen: R3 opent dan de spelerslijst (Tab, #636, besluit eigenaar); achterom kijken is een vasthouden en past niet in het wiel. Op het toetsenbord blijft Q.' },
  'toeteren-voet': { reden: 'Eigenaarsbesluit: te voet heeft de toeter geen knop (pad_input_audit); in voertuigen zit hij op X.' },
  geluid: { reden: 'Geluid aan of uit staat ook in Instellingen > Geluid; een knop voor een instelling die je zelden wisselt hoeft niet (pad_input_audit).' },
};

// Bekende botsingen: toets@situatie naar reden. Dezelfde toets met twee betekenissen in een situatie. Leeg: de audit vond T (hef en trein lopen tegen het zinnenwiel van Samen spelen) en loste ze op in multiplayerphrasesradial.js canOpen; O in de bus (deuren, overslaan) is bewust.
export const BOTSINGEN = {};
// Een botsing buiten de inventaris: zie docs/CONTROLLER-REVIEW-22-11-ingame.md
export const BEKEND_BROWSER = 'In de browser is G de verplaatste eerste-persoonstoets (BROWSER_KEYS in controls.js): de canonieke G (aftakas, busdienst, trein starten) is op het toetsenbord dan niet te bereiken; controller en desktop-app hebben het niet.';

const ctxLabel = { ...SITUATIES, ...ACTIVITEITEN };
export const labelVan = (ctx) => ctxLabel[ctx] || ctx;

// ---- waar zit een actie op het pad ----
const ZONDER_WIEL = process.argv.includes('--zonder-wiel');
const MUIS = { lmb: ['@fire', '@gas'], rmb: ['@aim'], wheel: ['@wheel+'] };

/** De plek van een actie in een situatie: een knop ('y', 'rt'), 'lstick', 'rstick', 'wiel' (acties-wiel) of null. samen: een Samen-spelen-sessie. */
export function plek(actie, ctx, { samen = false } = {}) {
  const map = PAD_MAPS[ctx];
  if (!map) return null;
  const coop = (samen && PAD_COOP[ctx]) || {};
  const eff = (s) => (Object.hasOwn(coop, s) ? coop[s] : map[s]);
  const key = actie.key;
  if (key === 'mouse') return 'rstick';
  if (key === 'escape') return PAD_BUTTONS.find((s) => eff(s) === 'escape') || null;
  if (MUIS[key]) { for (const w of MUIS[key]) { const s = PAD_BUTTONS.find((b) => eff(b) === w); if (s) return s; } return null; }
  if (!actie.shift && !actie.alt) {
    const direct = PAD_BUTTONS.find((s) => eff(s) === key);
    if (direct) return direct;
    // de stick of de triggers maken W, A, S en D
    if (key.length === 1 && 'wasd'.includes(key)) {
      if (map.stick === 'move') return 'lstick';
      if (map.stick === 'steer') {
        if (key === 'a' || key === 'd') return 'lstick';
        const s = PAD_BUTTONS.find((b) => eff(b) === (key === 'w' ? '@gas' : '@brake'));
        if (s) return s;
      }
    }
    if (actie.alias) { const a = PAD_BUTTONS.find((s) => eff(s) === actie.alias); if (a) return a; }
  }
  // het wiel (zonder tikstand: de lange druk; met tikstand is dezelfde lijst bereikbaar met een tik)
  if (ZONDER_WIEL) return null;
  for (const p of wheelItemsFor(ctx, { samen })) for (const it of p.items) if (it.key === key && !!it.shift === !!actie.shift && !!it.alt === !!actie.alt) return 'wiel';
  return null;
}

export function inventaris() {
  const rijen = [];
  for (const a of ACTIES) for (const ctx of a.ctx) {
    for (const samen of a.samen ? [true] : [false, true]) rijen.push({ actie: a.id, ctx, samen, plek: plek(a, ctx, { samen }) });
  }
  return rijen;
}

/** Acties zonder plek op het pad, zonder de bekende uitzonderingen: [{ actie, ctx, samen }] */
export function gaten() {
  const out = [];
  for (const r of inventaris()) { const u = ZONDER_PAD[r.actie]; if (!r.plek && !(u && (!u.samen || r.samen))) out.push(r); }
  return out;
}

/** Dezelfde toets met twee betekenissen in een situatie (uit de inventaris): [{ sleutel, acties }] */
export function botsingen() {
  const per = new Map();
  for (const a of ACTIES) {
    if (['lmb', 'rmb', 'wheel', 'mouse', 'escape'].includes(a.key)) continue;
    for (const ctx of a.ctx) {
      const k = `${a.shift ? 'shift+' : ''}${a.alt ? 'alt+' : ''}${a.key}@${ctx}`;
      if (!per.has(k)) per.set(k, new Set());
      per.get(k).add(a.id);
    }
  }
  const out = [];
  for (const [k, ids] of per) if (ids.size > 1) out.push({ sleutel: k, acties: [...ids] });
  return out;
}

/** Wat Samen spelen van de gewone indeling afpakt (PAD_COOP) en of het wiel of een andere knop het teruggeeft: [{ ctx, slot, was, nu, terug }] */
export function verdringing() {
  const out = [];
  for (const [ctx, ov] of Object.entries(PAD_COOP)) for (const [slot, nu] of Object.entries(ov)) {
    const was = PAD_MAPS[ctx][slot];
    if (was == null || was === nu) continue;
    const heeft = (k) => PAD_BUTTONS.some((s) => (Object.hasOwn(ov, s) ? ov[s] : PAD_MAPS[ctx][s]) === k);
    const terug = was === 'f' && heeft('e') ? 'alias' : heeft(was) ? 'knop' : wheelItemsFor(ctx, { samen: true }).some((p) => p.items.some((it) => it.key === was && !it.shift && !it.alt)) ? 'wiel' : null;
    out.push({ ctx, slot, was, nu, terug });
  }
  return out;
}

/** Vrije knoppen per situatie (PAD_MAPS). */
export function vrijeKnoppen() {
  const out = {};
  for (const [ctx, map] of Object.entries(PAD_MAPS)) out[ctx] = PAD_BUTTONS.filter((s) => map[s] == null);
  return out;
}

// Dubbele knoppen binnen een situatie (twee knoppen, een actie): bewuste aliassen met de reden.
export const ALIASSEN = {
  'heli:" "': 'A en RT zijn beide omhoog: de trigger voor wie het gas op de schouder wil.', 'heli:"control"': 'B en LT zijn beide omlaag.', 'heli:"shift"': 'RB en L3 zijn beide sneller.',
  'plane:" "': 'A en RT zijn beide neus omhoog.', 'plane:"control"': 'B en LT zijn beide neus omlaag.', 'plane:"shift"': 'RB en L3 zijn beide remmen op de baan.',
  'pigeon:"shift"': 'LT en L3 zijn beide sneller vliegen.', 'train:"o"': 'L3 en D-pad links zijn beide de deuren (twee plekken, bewust zo gelaten).',
  'foodtruck:"backspace"': 'B en X zijn beide terug: de snackwagen heeft geen tweede knop nodig.', 'klimtoren:"a"': 'LB en D-pad links zijn beide de linkerhand.',
  'klimtoren:"d"': 'RB en D-pad rechts zijn beide de rechterhand.', 'menu:"escape"': 'B en Start zijn beide terug uit een menu.',
};
export function dubbelen() {
  const out = [];
  for (const [ctx, map] of Object.entries(PAD_MAPS)) {
    const per = {};
    for (const s of PAD_BUTTONS) if (map[s]) (per[map[s]] = per[map[s]] || []).push(s);
    for (const [actie, slots] of Object.entries(per)) if (slots.length > 1) out.push({ ctx, actie, slots, bekend: Object.hasOwn(ALIASSEN, `${ctx}:${JSON.stringify(actie)}`) });
  }
  return out;
}

// ---- de toetsen in de speltekst ----
const TOETS_TOKEN = /^(?:[A-Z0-9]|SPACE|SPATIE|SHIFT|CTRL|TAB|ESC|ENTER|BACKSPACE|WASD|ARROWS|LMB|RMB|MOUSE|WHEEL|DRAG)$/;
const TOKEN_RE = /[{]([A-Z0-9]{1,8})[}]|glyphHtml[(].([A-Za-z0-9]{1,8})/g;
export function tekstTokens() {
  const dir = new URL('../game/js/', import.meta.url);
  const tel = new Map();
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.js'))) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    for (const m of src.matchAll(TOKEN_RE)) {
      const t = (m[1] || m[2]).toUpperCase();
      if (TOETS_TOKEN.test(t)) tel.set(t, (tel.get(t) || 0) + 1);
    }
  }
  return tel;
}

/** Elke toets uit de speltekst: heeft ze op het pad een plek in minstens een situatie (anders verdwijnt de hint altijd)? */
export function tokensZonderPad() {
  const out = [];
  for (const [t, n] of tekstTokens()) {
    const ergens = Object.keys(PAD_MAPS).some((c) => padSlotFor(t, c) || padWheelFor(t, c));
    if (!ergens) out.push({ token: t, toets: tokenKey(t), keren: n });
  }
  return out;
}

const TOKEN_VAN = { ' ': 'SPACE', shift: 'SHIFT', control: 'CTRL', tab: 'TAB', backspace: 'BACKSPACE', escape: 'ESC', lmb: 'LMB', rmb: 'RMB', wheel: 'WHEEL', mouse: 'MOUSE' };
const FACE = { xbox: { a: 'A', b: 'B', x: 'X', y: 'Y' }, deck: { a: 'A', b: 'B', x: 'X', y: 'Y' }, ps: { a: 'cross', b: 'circle', x: 'square', y: 'triangle' } };

/** Krijgt elke actie in elke situatie een glyph per apparaat? Het toetsenbord een toetsplaatje, elke controllerfamilie een knopplaatje. */
export function glyphChecks() {
  const bad = [];
  for (const a of ACTIES) {
    if (a.shift || a.alt) continue; // de hint noemt Shift, Alt en N los
    const t = TOKEN_VAN[a.key] || a.key.toUpperCase();
    for (const ctx of a.ctx) {
      const slot = padSlotFor(t, ctx) || (padWheelFor(t, ctx) ? 'view' : null);
      if (!slot) { if (!a.samen && !ZONDER_PAD[a.id]) bad.push({ actie: a.id, ctx, reden: 'geen knop voor de hint' }); continue; }
      for (const fam of ['xbox', 'ps', 'deck']) {
        const g = padSlotGlyph(slot, fam, FACE[fam][slot] || '');
        // PlayStation heeft geen glyph voor Delen en Opties: glyphs.js tekent dan zelf een plaatje met het woord
        if (!g && !(fam === 'ps' && ['view', 'start'].includes(slot))) bad.push({ actie: a.id, ctx, reden: 'geen glyph voor ' + slot + ' bij ' + fam });
      }
    }
    // . , [ ] en ; hebben geen glyph in de set: keycap.js zet er een tekstplaatje voor
    if (!['mouse', 'lmb', 'rmb', 'wheel', '.', ',', '[', ']'].includes(a.key) && !keyGlyph(a.key === ' ' ? 'space' : a.key === 'control' ? 'ctrl' : a.key)) bad.push({ actie: a.id, ctx: '(toetsenbord)', reden: 'geen toetsplaatje voor ' + a.key });
  }
  return bad;
}

/** Elke toets van het toetsenbord (KEY_ACTIONS) die in de inventaris ontbreekt: een nieuwe toets zonder regel hier laat de test falen. */
export function toetsenZonderInventaris() {
  const inInv = new Set(ACTIES.map((a) => a.key));
  return KEY_ACTIONS.map(([k]) => k).filter((k) => !inInv.has(k));
}

export function rapport() {
  const inv = inventaris();
  return {
    acties: ACTIES.length, situaties: Object.keys(SITUATIES).length, combinaties: inv.length, gaten: gaten(), botsingen: botsingen(), verdringing: verdringing(), vrij: vrijeKnoppen(),
    dubbelen: dubbelen(), tokensZonderPad: tokensZonderPad(), glyphs: glyphChecks(), toetsenZonderInventaris: toetsenZonderInventaris(),
    wiel: WHEEL_CTX.map((c) => ({ ctx: c, paginas: wheelItemsFor(c, { samen: true, tap: true }).map((p) => p.title + ': ' + p.items.length) })),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = rapport();
  if (process.argv.includes('--json')) { console.log(JSON.stringify(r, null, 1)); process.exit(0); }
  console.log(`controller_ingame_audit: ${r.acties} acties in ${r.situaties} situaties (${r.combinaties} combinaties met en zonder Samen spelen)`);
  console.log(`\nActies zonder plek op het pad: ${r.gaten.length}`);
  for (const x of r.gaten) console.log(`  ${x.actie} in ${x.ctx}${x.samen ? ' (Samen spelen)' : ''}`);
  console.log(`\nBotsende toetsen: ${r.botsingen.length}`);
  for (const x of r.botsingen) console.log(`  ${x.sleutel}: ${x.acties.join(' + ')}`);
  console.log(`\nVerdrongen door Samen spelen: ${r.verdringing.length}`);
  for (const x of r.verdringing) console.log(`  ${x.ctx} ${x.slot}: ${x.was} wordt ${x.nu}; ${x.terug ? 'terug via ' + x.terug : 'NIET terug'}`);
  console.log('\nVrije knoppen per situatie');
  for (const [c, s] of Object.entries(r.vrij)) console.log(`  ${c}: ${s.join(', ') || '-'}`);
  console.log(`\nDubbele knoppen: ${r.dubbelen.length} (${r.dubbelen.filter((d) => !d.bekend).length} zonder reden)`);
  console.log(`Toetsen in de speltekst zonder enige padplek: ${r.tokensZonderPad.map((t) => t.token).join(', ') || '-'}`);
  console.log(`Glyph-problemen: ${r.glyphs.length}`);
  for (const x of r.glyphs) console.log(`  ${x.actie} ${x.ctx}: ${x.reden}`);
  console.log(`Toetsen zonder inventarisregel: ${r.toetsenZonderInventaris.join(' ') || '-'}`);
}
