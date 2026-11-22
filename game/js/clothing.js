// Kleding (epic Kleding, 21-11): de logica. Puur (geen three, geen DOM): getest in scripts/clothing_test.mjs.
//
// Eén kast per personage (Tammo en Tessa, sleutel 'tammo' en 'anita'), niet per woning: de kast gaat mee als het verhaal je laat
// verhuizen. Een kast heeft de stukken die je bezit, wat je aan hebt per slot, vijf outfit-presets en de uiterlijke setbonus.
//
// De regels:
//  - Eén stuk per slot. Een jurk telt voor shirt en broek (de broek blijft in de kast, maar is niet te zien).
//  - Bij 'bottom' en 'shoes' kun je wisselen maar niet uitdoen; zonder shirt, jas of jurk loop je niet de straat op.
//  - De enige bonus is de setbonus van de oude sets (zwart incognito: de politie raakt je sneller kwijt). Kleding geeft verder geen
//    stats: geen exploits, het is een uiterlijk.
//  - Het verhaal kan een set tijdelijk opleggen (storyOverlay); wat je zelf aan hebt blijft ongemoeid en komt terug.
//  - NPC's gebruiken dezelfde stukken en dezelfde compositie (npcOutfit, outfitToLook): deterministisch uit zaad en rol.
import {
  SLOT_IDS, REQUIRED_SLOTS, ITEMS, ITEM_BY_ID, ITEM_INDEX, SETS, SET_BY_ID, LOOKS, LOOK_BY_ID, KIND_LOOK, PALETTE_IDS, PALETTE_INDEX,
  DEFAULT_WORN, ROLE_POOLS, NPC_MOODS, ROLE_MOODS, MOOD_WEIGHT, MOOD_ACCENT, SHOP_ITEMS, SHOP_STOCK, SHOP_RARE_CHANCE, SALE_DISCOUNT, PRESET_COUNT, PRESET_NAME_MAX, PROFILES,
  parsePiece, pieceLabel, colorHex, colorName, setsFor, setKeyFor,
} from './clothingdata.js';
import { kitShirtSpec, patternGeometry, npcFootballer } from './clothingkit.js';
import { HAIR_STYLE_IDS, HAIR_COLORS, HAIR_COLOR_BY_ID, HAIR_STYLES, DEFAULT_HAIR, NPC_HAIR, NPC_HAIR_COLORS, parseHair, BODY_IDS, BODY_TYPES, NPC_BODY } from './clothinghair.js';

export const CHARS = ['tammo', 'anita'];
export const SAVE_VERSION = 1;
export const CODE_VERSION = 3;
const isChar = (c) => c === 'tammo' || c === 'anita';

// ---------------------------------------------------------------- toevalsbron (deterministisch, zonder globale staat)
export function hash32(str) {
  let h = 2166136261 >>> 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  h ^= h >>> 15; h = Math.imul(h, 2246822507) >>> 0; h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0; h ^= h >>> 16;
  return h >>> 0;
}
export function rng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hash32(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- de staat
const emptyWardrobe = () => ({ owned: new Set(), worn: {}, hair: null, body: 'gemiddeld', presets: Array.from({ length: PRESET_COUNT }, () => null), seen: new Set() });
// kit: het tijdelijke clubtenue (voetbalkleding, 22-11) per personage: { worn, extras, key }. Het komt over wat je aanhebt zoals het verhaaloutfit, maar staat NIET in de save
// en laat w.worn met rust: bij een crash of afsluiten midden in een wedstrijd is je eigen outfit dus nooit aangeraakt en komt hij exact terug.
const store = { tammo: emptyWardrobe(), anita: emptyWardrobe(), forced: null, forcedKey: null, bought: 0, kit: null };

export function resetClothing() {
  for (const c of CHARS) {
    const w = emptyWardrobe();
    for (const p of Object.values(DEFAULT_WORN[c])) w.owned.add(p);
    w.worn = { ...DEFAULT_WORN[c] };
    w.hair = DEFAULT_HAIR[c];
    store[c] = w;
  }
  store.forced = null; store.forcedKey = null; store.bought = 0; store.kit = null;
}
resetClothing();

const W = (ch) => store[isChar(ch) ? ch : 'tammo'];
export const ownsPiece = (ch, p) => W(ch).owned.has(p);
export const ownedPieces = (ch) => [...W(ch).owned];
export const ownedCount = (ch) => W(ch).owned.size;
export const wornPieces = (ch) => ({ ...W(ch).worn });
export const presetsOf = (ch) => W(ch).presets.map((p) => (p ? { name: p.name, worn: { ...p.worn } } : null));
export const boughtCount = () => store.bought;

// Wat je nu echt aan hebt voor het beeld: het verhaaloutfit (tijdelijk) of je eigen kleding.
export function effectiveWorn(ch) {
  const c = isChar(ch) ? ch : 'tammo';
  // het clubtenue (wedstrijd, training, penalty's) gaat voor het verhaaloutfit: hair en body blijven die van het personage
  if (store.kit && store.kit[c]) return { hair: W(c).hair, body: W(c).body, ...store.kit[c].worn };
  // hair: the kapsel is part of the outfit (a forced story look may carry its own, otherwise your own stays)
  if (store.forced && store.forced[c]) return { hair: W(c).hair, body: W(c).body, ...store.forced[c] };
  return { ...W(c).worn, hair: W(c).hair, body: W(c).body };
}

// ---------------------------------------------------------------- het clubtenue (clothingkit.js, footballkit.js)
// setKit(ch, kit): kit = { worn, extras } van kitWorn(); null haalt het weg. Geeft true als er iets veranderde. De eigen outfit (W(ch).worn) blijft onaangeraakt.
export function setKit(ch, kit) {
  const c = isChar(ch) ? ch : 'tammo';
  if (kit == null) {
    if (!store.kit || !store.kit[c]) return false;
    delete store.kit[c];
    if (!Object.keys(store.kit).length) store.kit = null;
    emitKit();
    return true;
  }
  const worn = cleanWornKit(kit.worn);
  if (!Object.keys(worn).length) return false;
  const key = JSON.stringify([worn, kit.extras || null]);
  if (store.kit && store.kit[c] && store.kit[c].key === key) return false;
  store.kit = { ...(store.kit || {}), [c]: { worn, extras: kit.extras || null, key } };
  emitKit();
  return true;
}
const kitListeners = new Set();
// wie meeluistert naar een wissel van het clubtenue (shops.js past dan de looks toe)
export function onKitChange(fn) { kitListeners.add(fn); return () => kitListeners.delete(fn); }
const emitKit = () => { for (const fn of [...kitListeners]) { try { fn(); } catch (e) { /* een luisteraar mag het tenue niet breken */ } } };
export const kitActive = (ch) => !!(store.kit && store.kit[isChar(ch) ? ch : 'tammo']);
export const kitExtrasOf = (ch) => (kitActive(ch) ? store.kit[isChar(ch) ? ch : 'tammo'].extras : null);
export const kitWornOf = (ch) => (kitActive(ch) ? { ...store.kit[isChar(ch) ? ch : 'tammo'].worn } : null);
// de eigen outfit, ook als een tenue erover ligt (voor het bewaren en voor de kast)
export const ownWorn = (ch) => ({ ...W(ch).worn, hair: W(ch).hair, body: W(ch).body });
function cleanWornKit(w) {
  const out = {};
  if (w && typeof w === 'object') for (const slot of SLOT_IDS) if (typeof w[slot] === 'string' && validPiece(w[slot]) && pieceSlot(w[slot]) === slot) out[slot] = w[slot];
  return out;
}

// ---------------------------------------------------------------- haar (clothinghair.js)
// De lichaamsvorm van een personage (clothinghair.js BODY_TYPES): alleen de pasvorm, geen kleding of geslacht.
export const getBody = (ch) => W(ch).body;
export function setBody(ch, id) {
  if (!BODY_TYPES[id] || W(ch).body === id) return false;
  W(ch).body = id;
  return true;
}
export const getHair = (ch) => W(ch).hair;
export function setHair(ch, style, color) {
  const c = isChar(ch) ? ch : 'tammo';
  const h = `${style}.${color}`;
  if (!parseHair(h) || !HAIR_STYLES[c].some(([id]) => id === style)) return false;
  if (W(c).hair === h) return false;
  W(c).hair = h;
  return true;
}
export const storyLookKey = () => store.forcedKey;

// Is dit stuk geldig als kledingstuk (bestaat, kleur klopt)?
export const validPiece = (p) => !!parsePiece(p);

export function givePiece(ch, p, { fromShop = false } = {}) {
  if (!validPiece(p)) return false;
  const w = W(ch);
  if (w.owned.has(p)) return false;
  w.owned.add(p);
  w.seen.add(p);
  if (fromShop) store.bought++;
  return true;
}

// ---------------------------------------------------------------- dragen en uitdoen
export const hasTorso = (worn) => !!(worn.top || worn.outer);

// Waarom kan dit slot niet leeg? '' = het mag.
export function takeOffBlock(ch, slot) {
  if (!SLOT_IDS.includes(slot)) return 'Onbekend slot';
  const worn = W(ch).worn;
  if (!worn[slot]) return 'Daar draag je niets';
  if (REQUIRED_SLOTS.includes(slot)) return slot === 'shoes' ? 'Op blote voeten door Grunn? Kies andere schoenen' : 'Een broek hoort erbij. Kies een andere';
  if ((slot === 'top' || slot === 'outer')) {
    const rest = { ...worn }; delete rest[slot];
    if (!hasTorso(rest)) return 'Zonder shirt of jas loop je niet de straat op';
  }
  return '';
}

// Trek een stuk aan (je moet het bezitten). Geeft { ok, slot, replaced } of { ok: false, reason }.
export function wearPiece(ch, p) {
  const x = parsePiece(p);
  if (!x) return { ok: false, reason: 'Onbekend kledingstuk' };
  const w = W(ch);
  if (!w.owned.has(p)) return { ok: false, reason: 'Dat heb je niet' };
  const slot = x.item.slot;
  if (w.worn[slot] === p) return { ok: false, reason: 'Heb je al aan' };
  const replaced = w.worn[slot] || null;
  w.worn[slot] = p;
  return { ok: true, slot, replaced };
}

export function takeOffSlot(ch, slot) {
  const why = takeOffBlock(ch, slot);
  if (why) return { ok: false, reason: why };
  const w = W(ch);
  const was = w.worn[slot];
  delete w.worn[slot];
  return { ok: true, slot, was };
}

// Alle stukken van een lijst die je bezit tegelijk aan; stukken die je mist, worden overgeslagen en gemeld.
export function wearPieces(ch, pieces) {
  const missing = [];
  let changed = 0;
  for (const p of pieces) {
    if (!ownsPiece(ch, p)) { missing.push(p); continue; }
    if (wearPiece(ch, p).ok) changed++;
  }
  return { changed, missing };
}

// Een hele set aan: de stukken van de set vervangen wat je in die slots aan had; wat de set niet noemt blijft zoals het was,
// behalve hoofddeksel, bril en jas: een set is een uiterlijk, dus een jas of pet van een andere set blijft niet half hangen.
const SET_RESETS = ['hat', 'outer', 'top'];
export function wearSet(ch, set) {
  const s = typeof set === 'string' ? (SET_BY_ID[set] || LOOK_BY_ID[set]) : set;
  if (!s) return { ok: false, reason: 'Onbekende set' };
  const missing = s.pieces.filter((p) => !ownsPiece(ch, p));
  if (missing.length) return { ok: false, reason: 'Nog niet alles in je kast', missing };
  const w = W(ch);
  const slots = new Set(s.pieces.map(pieceSlot));
  for (const slot of SET_RESETS) if (!slots.has(slot) && slot !== 'top') delete w.worn[slot];
  for (const p of s.pieces) wearPiece(ch, p);
  return { ok: true };
}
function pieceSlot(p) { const x = parsePiece(p); return x ? x.item.slot : null; }

export function wornMatches(ch, pieces) {
  const worn = effectiveWorn(ch);
  return pieces.every((p) => worn[pieceSlot(p)] === p);
}
export const ownsAll = (ch, pieces) => pieces.every((p) => ownsPiece(ch, p));
export const missingOf = (ch, pieces) => pieces.filter((p) => !ownsPiece(ch, p));

// De prijs van een set voor deze kast: de oude prijs, naar rato van wat je nog niet hebt.
export function setPriceFor(ch, set) {
  const s = typeof set === 'string' ? (SET_BY_ID[set] || LOOK_BY_ID[set]) : set;
  if (!s) return 0;
  const total = s.pieces.length, miss = missingOf(ch, s.pieces).length;
  if (!miss) return 0;
  const base = s.price != null ? s.price : Math.round(s.pieces.reduce((n, p) => n + (parsePiece(p) ? parsePiece(p).item.price : 0), 0) * 0.85);
  return Math.max(1, Math.round(base * (miss / total)));
}

// De setbonus: alleen als alle stukken van een set aan zijn (uit het bestaande systeem: de zwarte incognito-sets).
export function setBonus(ch) {
  const worn = effectiveWorn(ch);
  let stealth = 0;
  const sets = [];
  for (const s of SETS) {
    if (s.char !== ch) continue;
    if (!s.pieces.every((p) => worn[pieceSlot(p)] === p)) continue;
    sets.push(s.id);
    if (s.bonus && s.bonus.stealth) stealth = Math.max(stealth, s.bonus.stealth);
  }
  return { stealth, sets };
}
// Is dit de set die je draagt (de eerste die past)? Voor het label in Spullen en de kast.
export function wornSet(ch) { const b = setBonus(ch); return b.sets.length ? SET_BY_ID[b.sets[0]] : null; }

// ---------------------------------------------------------------- presets (Outfit 1 tot 5)
const cleanName = (n, i) => {
  const t = String(n == null ? '' : n).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, PRESET_NAME_MAX);
  return t || `Outfit ${i + 1}`;
};
export function savePreset(ch, i, name) {
  if (!(i >= 0 && i < PRESET_COUNT)) return false;
  const w = W(ch);
  w.presets[i] = { name: cleanName(name, i), worn: { ...w.worn, hair: w.hair, body: w.body } };
  return true;
}
// De outfit-code (versie 3) van een bewaarde outfit, om te delen, en een code die een ander deelde als nieuwe outfit bewaren. De stukken
// die je zelf niet hebt blijven weg bij het aantrekken (zoals altijd: wearPreset meldt wat ontbreekt).
export function presetCode(ch, i) {
  const p = W(ch).presets[i];
  return p ? encodeOutfit(p.worn) : null;
}
export function importPresetCode(ch, i, code, name = 'Gedeelde look') {
  if (!(i >= 0 && i < PRESET_COUNT)) return { ok: false, reason: 'Die plek bestaat niet' };
  const worn = cleanOutfitCode(code) && decodeOutfit(code);
  if (!worn) return { ok: false, reason: 'Die code kan ik niet lezen' };
  W(ch).presets[i] = { name: cleanName(name, i), worn: cleanWorn(worn) };
  return { ok: true, missing: Object.values(W(ch).presets[i].worn).filter((x) => validPiece(x) && !ownsPiece(ch, x)) };
}
export function clearPreset(ch, i) { if (!(i >= 0 && i < PRESET_COUNT)) return false; W(ch).presets[i] = null; return true; }
export function wearPreset(ch, i) {
  const p = W(ch).presets[i];
  if (!p) return { ok: false, reason: 'Die outfit is leeg' };
  const w = W(ch);
  const next = {};
  const missing = [];
  for (const slot of SLOT_IDS) {
    const piece = p.worn[slot];
    if (!piece) continue;
    if (w.owned.has(piece)) next[slot] = piece; else missing.push(piece);
  }
  if (!hasTorso(next) && !hasTorso(w.worn)) return { ok: false, reason: 'Er is geen shirt of jas van over' };
  // wat de preset niet noemt (en niet ontbreekt) is leeg, behalve wat je moet dragen
  const merged = { ...next };
  for (const slot of REQUIRED_SLOTS) if (!merged[slot] && w.worn[slot]) merged[slot] = w.worn[slot];
  if (!hasTorso(merged)) { if (w.worn.top) merged.top = w.worn.top; if (w.worn.outer) merged.outer = w.worn.outer; }
  w.worn = merged;
  const hh = p.worn.hair && parseHair(p.worn.hair);
  if (hh && HAIR_STYLES[isChar(ch) ? ch : 'tammo'].some(([id]) => id === hh.style)) w.hair = p.worn.hair;
  if (BODY_TYPES[p.worn.body]) w.body = p.worn.body; // de outfit-code (v3) bewaart ook het postuur
  return { ok: true, missing };
}

// De volgende gevulde outfit (Outfit 1 tot 5) na degene die je nu aanhebt, voor de snelwisseltoets. dir 1 vooruit, -1 terug.
export function cyclePreset(ch, dir = 1) {
  const w = W(ch);
  const filled = w.presets.map((p, i) => (p ? i : -1)).filter((i) => i >= 0);
  if (!filled.length) return { ok: false, reason: 'Bewaar eerst een outfit in je kast: Outfit 1 tot 5' };
  const worn = effectiveWorn(ch);
  const same = (p) => SLOT_IDS.every((s) => (p.worn[s] || null) === (worn[s] || null)) && (!p.worn.hair || p.worn.hair === worn.hair);
  const cur = w.presets.findIndex((p) => p && same(p));
  const at = filled.indexOf(cur);
  const next = filled[((at < 0 ? (dir > 0 ? -1 : 0) : at) + (dir > 0 ? 1 : -1) + filled.length) % filled.length];
  const r = wearPreset(ch, next);
  return r.ok ? { ok: true, index: next, name: w.presets[next].name, missing: r.missing } : r;
}

// ---------------------------------------------------------------- van kleding naar een uiterlijk voor het model
// base: de kleuren van het personage ({ shirt, pants, shoes, cap }); worn: slot -> stuk. Het resultaat gaat in de appearance
// (models3d_people.js, TAMMO_APPEARANCE/ANITA_APPEARANCE) of in de opties van buildPersonMesh: { shirt, pants, shoes, cap?, look }.
const DEFAULT_TOP_COLOR = 0xe3ddd0;
// de mouwvorm van het shirt onder een hesje (tee of lange mouw)
const KIT_LOOK_TOP = (top) => ({ ...(KIND_LOOK[top.item.kind] || { top: 'tee' }) });
// extras (alleen het eigen clubtenue): { number, numberStyle, nameBar, sponsor } voor de laag op het shirt
export function outfitToLook(worn, base = {}, extras = null) {
  const out = { ...(base.cap != null ? { cap: base.cap } : {}), shirtBands: null };
  const look = {};
  const px = (slot) => (worn[slot] ? parsePiece(worn[slot]) : null);
  const outer = px('outer'), top = px('top'), bottom = px('bottom'), shoes = px('shoes');
  const dress = top && top.item.kind === 'dress';
  let shirt;
  if (outer) {
    Object.assign(look, KIND_LOOK[outer.item.kind] || {});
    shirt = outer.hex;
    if (outer.item.kind === 'raincoat') look.raincoatColor = outer.hex;
    if (top) look.under = top.hex;
  } else if (top) {
    Object.assign(look, KIND_LOOK[top.item.kind] || {});
    shirt = top.hex;
  } else {
    Object.assign(look, KIND_LOOK.tee);
    shirt = DEFAULT_TOP_COLOR;
  }
  if (dress) look.bottom = 'dress';
  else if (bottom) { Object.assign(look, KIND_LOOK[bottom.item.kind] || {}); out.pants = bottom.hex; }
  if (shoes) { Object.assign(look, KIND_LOOK[shoes.item.kind] || {}); out.shoes = shoes.hex; }
  const hat = px('hat');
  if (hat) {
    Object.assign(look, KIND_LOOK[hat.item.kind] || {});
    if (hat.item.kind === 'tammo') { out.cap = hat.hex; look.capColor = hat.hex; } else look.hatColor = hat.hex;
  } else look.hat = null;
  look.hoodUp = false;
  const glasses = px('glasses');
  if (glasses) Object.assign(look, KIND_LOOK[glasses.item.kind] || {}); else { look.glasses = false; look.shades = false; }
  const face = px('face');
  look.facial = face ? (KIND_LOOK[face.item.kind] || {}).facial || 'none' : 'none';
  const neck = px('neck');
  if (neck) { look.scarf = true; look.scarfColor = neck.hex; } else look.scarf = false;
  const back = px('back');
  if (back) { Object.assign(look, KIND_LOOK[back.item.kind] || {}); look.bagColor = back.hex; } else look.bag = null;
  // voetbalkleding (22-11): kousen, scheenbeschermers, aanvoerdersband, hesje en het shirtpatroon met rugnummer en sponsorpaneel
  const socks = px('legs'), guard = px('guard'), wrist = px('wrist');
  if (socks) look.socks = socks.hex;
  if (guard) look.guard = guard.hex;
  if (wrist && wrist.item.kind === 'captain') look.captain = wrist.hex;
  if (outer && outer.item.kind === 'bib') { look.bib = true; look.under = top ? top.hex : DEFAULT_TOP_COLOR; if (top) Object.assign(look, KIT_LOOK_TOP(top)); else look.top = 'tee'; }
  const spec = kitShirtSpec(top && !outer ? top : null);
  if (spec || (extras && (extras.number || extras.sponsor) && top && !outer)) {
    const geo = spec ? patternGeometry(spec.pattern) : null;
    const sh = { bands: (geo && geo.bands) || [], cells: (geo && geo.cells) || [], color: spec ? spec.hex2 : 0xffffff };
    if (extras && extras.number) { sh.number = extras.number; sh.numberStyle = extras.numberStyle || 'rug'; sh.numberColor = spec ? spec.hex2 : 0xffffff; sh.nameBar = !!extras.nameBar; }
    if (extras && extras.sponsor) sh.sponsor = { color: extras.sponsor.color, size: extras.sponsor.size || 'normaal' };
    if (sh.bands.length || sh.cells.length || sh.number || sh.sponsor) out.shirtBands = sh;
  }
  const acc = {};
  for (const [slot, key] of [['jewel', 'j'], ['wrist', 'w'], ['hands', 'h']]) {
    const a = px(slot);
    if (a && a.item.kind !== 'captain') acc[key] = [a.item.kind, a.hex];
  }
  if (Object.keys(acc).length) look.acc = acc; else look.acc = null;
  const hair = worn.hair && parseHair(worn.hair);
  if (hair) { out.hairStyle = hair.style; if (hair.hex != null) out.hair = hair.hex; }
  if (worn.body && BODY_TYPES[worn.body]) out.body = worn.body;
  out.shirt = shirt;
  out.look = look;
  return out;
}

// ---------------------------------------------------------------- outfit-code (Samen spelen): compact en met een versie
// 'k1' + per stuk vier tekens in base 36: itemnummer (twee tekens, volgorde in ITEMS) en kleurnummer (twee tekens, volgorde in PALETTE).
// Het slot volgt uit het item. De catalogus is append-only; een onbekend nummer wordt overgeslagen, zodat een oudere client met een
// nieuwere code zonder fout een deel van het uiterlijk toont.
const b36 = (n, len) => n.toString(36).padStart(len, '0');
export function encodeOutfit(worn) {
  let s = 'k' + CODE_VERSION;
  const hair = worn.hair && parseHair(worn.hair);
  s += hair ? b36(HAIR_STYLE_IDS.indexOf(hair.style), 2) + b36(HAIR_COLORS.findIndex((c) => c.id === hair.color), 1) : '---';
  s += b36(Math.max(0, BODY_IDS.indexOf(worn.body)), 1);
  for (const slot of SLOT_IDS) {
    const x = worn[slot] ? parsePiece(worn[slot]) : null;
    if (x) s += b36(ITEM_INDEX[x.item.id], 2) + b36(PALETTE_INDEX[x.color], 2);
  }
  return s;
}
export function decodeOutfit(code) {
  if (typeof code !== 'string' || code.length > 80 || !/^k[0-9]/.test(code)) return null;
  const worn = {};
  let body = code.slice(2);
  if (code[1] === '2') { // versie 2: het kapsel voorop, twee tekens (stijl en kleur), of '--' zonder
    const st = HAIR_STYLE_IDS[parseInt(body[0], 36)], co = HAIR_COLORS[parseInt(body[1], 36)];
    if (st && co) worn.hair = `${st}.${co.id}`;
    body = body.slice(2);
  } else if (code[1] >= '3') { // versie 3: stijl (2 tekens), kleur, lichaamsvorm
    const st = HAIR_STYLE_IDS[parseInt(body.slice(0, 2), 36)], co = HAIR_COLORS[parseInt(body[2], 36)], bd = BODY_IDS[parseInt(body[3], 36)];
    if (st && co) worn.hair = `${st}.${co.id}`;
    if (bd && bd !== 'gemiddeld') worn.body = bd;
    body = body.slice(4);
  }
  for (let i = 0; i + 4 <= body.length; i += 4) {
    const idx = parseInt(body.slice(i, i + 2), 36), ci = parseInt(body.slice(i + 2, i + 4), 36);
    const item = ITEMS[idx], color = PALETTE_IDS[ci];
    if (!item || !color || !item.colors.includes(color)) continue;
    worn[item.slot] = `${item.id}.${color}`;
  }
  return Object.keys(worn).length ? worn : null;
}

// Wie meeluistert naar een wijziging van wat dit apparaat draagt (coopnet.js stuurt dan de nieuwe code naar de anderen).
const outfitListeners = new Set();
export function onLocalOutfitChange(fn) { outfitListeners.add(fn); return () => outfitListeners.delete(fn); }
export function emitLocalOutfitChange() { for (const fn of [...outfitListeners]) { try { fn(); } catch (e) { /* een luisteraar mag de kast niet breken */ } } }

// Het personage van dit apparaat en wat het aan heeft, als code voor de anderen (coopnet.js handshakeInfo): shops.js meldt wie het is.
let localCharProvider = () => 'tammo';
export const setLocalCharProvider = (fn) => { if (typeof fn === 'function') localCharProvider = fn; };
export function localOutfitCode() {
  let ch = 'tammo';
  try { ch = localCharProvider() === 'anita' ? 'anita' : 'tammo'; } catch (e) { /* standaard */ }
  return encodeOutfit(effectiveWorn(ch));
}
// Een code van een ander: alleen een geldige, korte code komt door (anders null).
export const cleanOutfitCode = (c) => (typeof c === 'string' && c.length <= 80 && decodeOutfit(c) ? c : null);

// ---------------------------------------------------------------- NPC-outfits
// Deterministisch uit zaad, rol en context; zelfde uitkomst op elke client (geen netwerk nodig). ctx: { rain, hot, female, area }.
export function pickWeighted(list, r) {
  let total = 0;
  for (const e of list) total += e[1];
  let x = r() * total;
  for (const e of list) { x -= e[1]; if (x < 0) return e[0]; }
  return list[list.length - 1][0];
}
// De kleur van een stuk: kleuren uit de stemming van de NPC wegen zwaar, de rest weegt 1 (het accent). Altijd een kleur van het stuk.
function pickColor(item, mood, r) {
  const cols = item.colors;
  if (!mood || !mood.length || cols.length < 3 || r() < MOOD_ACCENT) return cols[Math.floor(r() * cols.length)];
  let total = 0;
  const w = cols.map((c) => { const x = mood.includes(c) ? MOOD_WEIGHT : 1; total += x; return x; });
  let x = r() * total;
  for (let i = 0; i < cols.length; i++) { x -= w[i]; if (x < 0) return cols[i]; }
  return cols[cols.length - 1];
}
// Lichaamsvorm per rol: een kleine gewichtsverschuiving bovenop NPC_BODY, zodat sporters vaker smal of lang zijn en bouwvakkers breed.
const ROLE_BODY = { sporter: { smal: 2, lang: 1.6, breed: 0.5 }, bouwvakker: { breed: 2, kort: 1.4, smal: 0.6 }, boer: { breed: 1.6 }, zakenman: { lang: 1.4 }, student: { smal: 1.4 } };
function npcBody(seed, role) {
  const adj = ROLE_BODY[role] || {};
  return pickWeighted(NPC_BODY.map(([id, w]) => [id, w * (adj[id] || 1)]), rng(`${seed}|lijf|${role}`));
}
export function npcOutfit(seed, role = 'voetganger', ctx = {}) {
  if (role === 'voetballer') {
    const k = npcFootballer(seed, ctx, rng(`${seed}|voetballer`));
    const worn = { ...k.worn };
    if (ctx.hair) { const hr = rng(`${seed}|haar|${role}`); worn.hair = `${pickWeighted(NPC_HAIR.all, hr)}.${pickWeighted(NPC_HAIR_COLORS, hr)}`; }
    if (ctx.body) worn.body = npcBody(seed, 'sporter');
    return worn;
  }
  const pool = ROLE_POOLS[role] || ROLE_POOLS.voetganger;
  const r = rng(`${seed}|${role}|${ctx.area || ''}`);
  const mood = NPC_MOODS[pickWeighted(Object.entries(ROLE_MOODS[role] || ROLE_MOODS.standaard), rng(`${seed}|stemming|${role}`))];
  const worn = {};
  for (const slot of SLOT_IDS) {
    const list = pool[slot];
    if (!list) continue;
    let id = pickWeighted(list, r);
    // het weer: bij regen vaker een jas, bij hitte korte broeken en geen jas
    if (slot === 'outer' && ctx.rain && !id && r() < 0.5) id = 'regenjas';
    if (slot === 'outer' && ctx.hot && id && id !== 'veiligheidsjas' && id !== 'koksjas') id = null;
    if (slot === 'bottom' && ctx.hot && (id === 'jeans' || id === 'pantalon') && r() < 0.5) id = 'korte_broek';
    if (slot === 'bottom' && ctx.rain && id === 'korte_broek') id = 'jeans';
    if (!id) continue;
    const item = ITEM_BY_ID[id];
    if (!item) continue;
    const color = pickColor(item, mood, r);
    worn[slot] = `${id}.${color}`;
  }
  // een jurk dekt shirt en broek: geen losse jurk onder een korte broek
  if (worn.top && parsePiece(worn.top).item.kind === 'dress') delete worn.bottom;
  if (!worn.bottom && !(worn.top && parsePiece(worn.top).item.kind === 'dress')) worn.bottom = `jeans.${ITEM_BY_ID.jeans.colors[Math.floor(r() * 4)]}`;
  if (!worn.shoes) worn.shoes = 'gympen.ecru';
  if (!hasTorso(worn)) worn.top = 'tshirt.wit';
  // het kapsel (clothinghair.js): man of vrouw, een natuurlijke kleur, een oudere NPC wordt grijs; geen kapsel voor wie het niet vraagt
  if (ctx.hair) {
    const hr = rng(`${seed}|haar|${role}`);
    const style = pickWeighted(NPC_HAIR.all, hr);
    const color = ctx.old ? ['grijs', 'platina', 'lichtgrijs'].filter((id) => HAIR_COLOR_BY_ID[id])[Math.floor(hr() * 2)] : pickWeighted(NPC_HAIR_COLORS, hr);
    worn.hair = `${style}.${color}`;
  }
  if (ctx.body) worn.body = npcBody(seed, role);
  return worn;
}
// Welke rol een voetganger heeft: gewogen per buurtprofiel (trafficfleet.js WIJK_PROFILE) en uur van de dag, deterministisch uit zijn zaad.
// Een gewone voetganger blijft de meerderheid; studenten rond de campus, zakenlieden in het centrum, feestgangers in de avond.
const AREA_ROLES = {
  standaard: { voetganger: 64, student: 6, toerist: 3, sporter: 4, zakenman: 3, bouwvakker: 3, boer: 3, winkelier: 3, feestganger: 3, ambtenaar: 3, wandelaar: 5 },
  student: { voetganger: 34, student: 44, toerist: 2, sporter: 6, zakenman: 1, bouwvakker: 1, winkelier: 2, feestganger: 6, ambtenaar: 2, wandelaar: 2 },
  chic: { voetganger: 52, student: 3, toerist: 5, sporter: 8, zakenman: 12, bouwvakker: 1, winkelier: 6, feestganger: 5, ambtenaar: 5, wandelaar: 3 },
  bakfiets: { voetganger: 68, student: 6, toerist: 2, sporter: 8, zakenman: 3, bouwvakker: 2, winkelier: 3, feestganger: 2, ambtenaar: 3, wandelaar: 3 },
  industrie: { voetganger: 38, student: 1, toerist: 0, sporter: 2, zakenman: 8, bouwvakker: 42, winkelier: 1, feestganger: 0, boer: 6, ambtenaar: 2 },
  centrum: { voetganger: 42, student: 8, toerist: 14, sporter: 2, zakenman: 8, bouwvakker: 1, winkelier: 7, feestganger: 8, ambtenaar: 12, wandelaar: 3 },
};
export function pedRole(seed, ctx = {}) {
  const base = AREA_ROLES[ctx.area] || AREA_ROLES.standaard;
  const h = Number.isFinite(ctx.hour) ? ctx.hour : 12;
  const day = h >= 8 && h < 18, evening = h >= 20 || h < 3;
  const r = rng('rol|' + seed);
  const list = [];
  for (const [role, w0] of Object.entries(base)) {
    let w = w0;
    if (role === 'zakenman' || role === 'winkelier' || role === 'ambtenaar') w *= day ? 1.4 : 0.15;
    if (role === 'bouwvakker') w *= h >= 6 && h < 17 ? 1.4 : 0.1;
    if (role === 'feestganger') w *= evening ? 4 : 0.3;
    if (role === 'boer') w *= h >= 6 && h < 19 ? 1.3 : 0.2;
    if (role === 'wandelaar') w *= (day ? 1.2 : 0.3) * (ctx.rain ? 0.5 : 1);
    if (role === 'toerist' || role === 'sporter') w *= h >= 22 || h < 6 ? 0.2 : 1;
    if (role === 'student' && ctx.rain) w *= 0.9;
    list.push([role, w]);
  }
  return pickWeighted(list, r);
}

// De appearance-opties voor buildPersonMesh van een NPC (rol en zaad): kleding, geen haar of huid.
export function npcLook(seed, role, ctx, base) {
  return outfitToLook(npcOutfit(seed, role, ctx), base);
}

// ---------------------------------------------------------------- de winkel: aanbod per winkel en dag, uitverkoop
const DAYS_PER_WEEK = 7;
// De afdelingen van een winkel: een of twee, vast per winkel (naam of plek), gekozen uit de zeven.
export function shopProfiles(shopKey) {
  const ids = Object.keys(PROFILES);
  const r = rng('afdeling|' + shopKey);
  const a = ids[Math.floor(r() * ids.length)];
  const rest = ids.filter((x) => x !== a);
  const b = rest[Math.floor(r() * rest.length)];
  return r() < 0.55 ? [a, b] : [a];
}
// De uitverkoop: een dag per week is één afdeling goedkoper. day: de kalenderdag (calendar.today).
export function saleOn(day) {
  const d = Math.floor(Number.isFinite(day) ? day : 0);
  if (((d % DAYS_PER_WEEK) + DAYS_PER_WEEK) % DAYS_PER_WEEK !== 5) return null; // vrijdag
  const ids = Object.keys(PROFILES);
  return { profile: ids[Math.floor(rng('uitverkoop|' + Math.floor(d / DAYS_PER_WEEK))() * ids.length)], discount: SALE_DISCOUNT };
}
// Het aanbod van een winkel op een dag: stukken uit zijn afdelingen met een kleur, wisselend per dag, met af en toe een zeldzaam stuk.
// Geeft stukken ('jack.blauw'), gesorteerd per slot. De winkel is hetzelfde voor iedereen en dezelfde op elke client.
export function shopStock(shopKey, day, size = SHOP_STOCK) {
  const profs = shopProfiles(shopKey);
  const r = rng(`aanbod|${shopKey}|${Math.floor(day || 0)}`);
  const pool = SHOP_ITEMS.filter((it) => it.profiles.some((p) => profs.includes(p)));
  const common = pool.filter((it) => it.rarity === 'g');
  const special = pool.filter((it) => it.rarity !== 'g');
  const items = new Set();
  const want = Math.min(size, pool.length);
  let guard = 0;
  while (items.size < want && guard++ < 400) {
    const list = special.length && r() < SHOP_RARE_CHANCE ? special : common;
    if (!list.length) break;
    items.add(list[Math.floor(r() * list.length)].id);
  }
  // elk slot waarvoor de winkel iets heeft, krijgt minstens één soort
  for (const slot of SLOT_IDS) {
    const l = pool.filter((it) => it.slot === slot);
    if (l.length && ![...items].some((id) => ITEM_BY_ID[id].slot === slot) && r() < 0.8) items.add(l[Math.floor(r() * l.length)].id);
  }
  // mix en match: elke soort ligt er in al zijn kleuren, zodat je zelf kiest en combineert (sets zijn alleen een snelkoppeling)
  const out = [];
  for (const id of items) for (const color of ITEM_BY_ID[id].colors) out.push(`${id}.${color}`);
  return out.sort((a, b) => SLOT_IDS.indexOf(pieceSlot(a)) - SLOT_IDS.indexOf(pieceSlot(b)) || a.localeCompare(b));
}
// De prijs van een stuk in een winkel op een dag (uitverkoop meegerekend), in hele euro's.
export function shopPrice(piece, shopKey, day) {
  const x = parsePiece(piece);
  if (!x) return 0;
  const sale = saleOn(day);
  const profs = shopProfiles(shopKey);
  const inSale = sale && x.item.profiles.includes(sale.profile) && profs.includes(sale.profile);
  return Math.max(1, Math.round(x.item.price * (inSale ? 1 - sale.discount : 1)));
}

// ---------------------------------------------------------------- opslag en migratie
// Eén blok in de save van de winkels (shops.js getShopSave, onder 'kleding'): bij het laden van een slot dat ook de nieuwe versie
// kent komt alles in één keer binnen; een oude save zonder dit blok wordt gemigreerd uit de oude sets (ownedOutfits en outfit).
const arr = (a) => (Array.isArray(a) ? a : []);
export function getClothingSave() {
  const per = {};
  for (const c of CHARS) {
    const w = store[c];
    per[c] = {
      o: [...w.owned].sort(),
      w: { ...w.worn },
      p: w.presets.map((p) => (p ? { n: p.name, w: { ...p.worn } } : null)),
      s: [...w.seen].sort(),
      h: w.hair,
      b: w.body,
    };
  }
  return { v: SAVE_VERSION, ...per, story: store.forcedKey || null, bought: store.bought };
}

const cleanWorn = (w) => {
  const out = {};
  if (w && typeof w === 'object') for (const slot of SLOT_IDS) if (typeof w[slot] === 'string' && validPiece(w[slot]) && pieceSlot(w[slot]) === slot) out[slot] = w[slot];
  if (w && typeof w === 'object' && parseHair(w.hair)) out.hair = w.hair;
  if (w && typeof w === 'object' && BODY_TYPES[w.body]) out.body = w.body;
  return out;
};

export function applyClothingSave(d, legacy = null) {
  resetClothing();
  if (d && typeof d === 'object' && d.v === SAVE_VERSION) {
    for (const c of CHARS) {
      const src = d[c] || {};
      const w = store[c];
      w.owned = new Set(arr(src.o).filter(validPiece));
      w.seen = new Set(arr(src.s).filter(validPiece));
      const worn = cleanWorn(src.w);
      // wat je aan hebt, bezit je ook (een save die dat niet klopt wordt rechtgezet, niet weggegooid)
      for (const p of Object.values(worn)) w.owned.add(p);
      w.worn = Object.keys(worn).length && hasTorso(worn) && worn.bottom && worn.shoes ? worn : { ...DEFAULT_WORN[c], ...worn };
      for (const p of Object.values(w.worn)) if (validPiece(p)) w.owned.add(p);
      if (BODY_TYPES[src.b]) w.body = src.b;
      if (parseHair(src.h) && HAIR_STYLES[c].some(([id]) => id === src.h.split('.')[0])) w.hair = src.h;
      w.presets = Array.from({ length: PRESET_COUNT }, (_, i) => {
        const p = arr(src.p)[i];
        if (!p || typeof p !== 'object') return null;
        return { name: cleanName(p.n, i), worn: cleanWorn(p.w) };
      });
    }
    store.bought = Number.isFinite(d.bought) ? Math.max(0, Math.floor(d.bought)) : 0;
    store.forcedKey = null;
    return 'nieuw';
  }
  if (legacy) { migrateLegacy(legacy); return 'migratie'; }
  return 'leeg';
}

// De oude save: outfit { tammo: 'stadjer', anita: 'classic' } en ownedOutfits ['tammo:stadjer', ...]. Elke bezeten set geeft zijn
// stukken; de gedragen set wordt aangetrokken. Niets gaat verloren en wat je aan had, heb je nog aan.
export function migrateLegacy(legacy) {
  const owned = new Set(arr(legacy.ownedOutfits).filter((k) => typeof k === 'string'));
  for (const c of CHARS) {
    const w = store[c];
    for (const s of setsFor(c)) if (owned.has(s.id)) for (const p of s.pieces) w.owned.add(p);
    const wearing = legacy.outfit && legacy.outfit[c];
    const s = wearing && setKeyFor(c, wearing);
    if (s) {
      // de standaardstukken van de oude set (incl. de stoppels van Tammo) blijven kloppen met wat hij toen droeg
      const next = { ...DEFAULT_WORN[c] };
      for (const p of s.pieces) next[pieceSlot(p)] = p;
      w.worn = next;
      for (const p of Object.values(next)) w.owned.add(p);
    }
    const lh = legacy.hair && legacy.hair[c]; // het kapsel van de oude save (shops.js: { color, style })
    if (lh && typeof lh === 'object') setHair(c, lh.style, lh.color);
  }
  store.forcedKey = null;
}

// ---------------------------------------------------------------- het verhaaloutfit
// Een set (sleutel zoals 'incognito') of een kaart per personage ({ tammo: set-sleutel of een worn-map }); null haalt het weg.
// Het verhaaloutfit komt over wat je aan hebt, wordt niet bewaard als kleding en verdwijnt zonder iets te kosten.
export function forceStoryLook(spec) {
  if (spec == null) { const had = !!store.forced; store.forced = null; store.forcedKey = null; return had; }
  const forced = {};
  let key = typeof spec === 'string' ? spec : null;
  for (const c of CHARS) {
    let w = null;
    const s = typeof spec === 'string' ? spec : spec && spec[c];
    if (typeof s === 'string') { const set = setKeyFor(c, s) || SET_BY_ID[s] || LOOK_BY_ID[s]; if (set) { w = { ...DEFAULT_WORN[c] }; for (const p of set.pieces) w[pieceSlot(p)] = p; } }
    else if (s && typeof s === 'object') { w = cleanWorn(s); if (!hasTorso(w)) w = { ...W(c).worn, ...w }; } // alleen een kapsel forceren kan ook
    if (w && hasTorso(w)) forced[c] = w;
  }
  if (!Object.keys(forced).length) return false;
  if (!key) key = 'eigen';
  if (store.forcedKey === key && JSON.stringify(store.forced) === JSON.stringify(forced)) return false;
  store.forced = forced; store.forcedKey = key;
  return true;
}

// ---------------------------------------------------------------- prestaties en tellers
export function completeSetIds(ch) {
  const w = W(ch);
  return [...setsFor(ch), ...LOOKS].filter((s) => s.pieces.every((p) => w.owned.has(p))).map((s) => s.id);
}
export function clothingStats(ch) {
  const w = W(ch);
  const full = [...setsFor(ch), ...LOOKS].filter((s) => s.pieces.every((p) => w.owned.has(p)));
  const itemsOwned = new Set([...w.owned].map((p) => p.slice(0, p.indexOf('.'))));
  const shopItems = ITEMS.filter((it) => !it.npc);
  return {
    pieces: w.owned.size, items: itemsOwned.size, shopItems: shopItems.length, fullSets: full.length,
    allItems: shopItems.every((it) => itemsOwned.has(it.id)),
    presetsUsed: w.presets.filter(Boolean).length,
    slotsFilled: Object.keys(w.worn).length,
  };
}
export const catalogSize = () => ({ items: ITEMS.filter((i) => !i.npc).length, pieces: ITEMS.filter((i) => !i.npc).reduce((n, i) => n + i.colors.length, 0), sets: SETS.length + LOOKS.length });

export { pieceLabel, colorHex, colorName, parsePiece };
