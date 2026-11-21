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
  DEFAULT_WORN, ROLE_POOLS, SHOP_ITEMS, SHOP_STOCK, SHOP_RARE_CHANCE, SALE_DISCOUNT, PRESET_COUNT, PRESET_NAME_MAX, PROFILES,
  parsePiece, pieceLabel, colorHex, colorName, setsFor, setKeyFor,
} from './clothingdata.js';

export const CHARS = ['tammo', 'anita'];
export const SAVE_VERSION = 1;
export const CODE_VERSION = 1;
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
const emptyWardrobe = () => ({ owned: new Set(), worn: {}, presets: Array.from({ length: PRESET_COUNT }, () => null), seen: new Set() });
const store = { tammo: emptyWardrobe(), anita: emptyWardrobe(), forced: null, forcedKey: null, bought: 0 };

export function resetClothing() {
  for (const c of CHARS) {
    const w = emptyWardrobe();
    for (const p of Object.values(DEFAULT_WORN[c])) w.owned.add(p);
    w.worn = { ...DEFAULT_WORN[c] };
    store[c] = w;
  }
  store.forced = null; store.forcedKey = null; store.bought = 0;
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
  if (store.forced && store.forced[isChar(ch) ? ch : 'tammo']) return { ...store.forced[isChar(ch) ? ch : 'tammo'] };
  return { ...W(ch).worn };
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
  w.presets[i] = { name: cleanName(name, i), worn: { ...w.worn } };
  return true;
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
  return { ok: true, missing };
}

// ---------------------------------------------------------------- van kleding naar een uiterlijk voor het model
// base: de kleuren van het personage ({ shirt, pants, shoes, cap }); worn: slot -> stuk. Het resultaat gaat in de appearance
// (models3d_people.js, TAMMO_APPEARANCE/ANITA_APPEARANCE) of in de opties van buildPersonMesh: { shirt, pants, shoes, cap?, look }.
const DEFAULT_TOP_COLOR = 0xe3ddd0;
export function outfitToLook(worn, base = {}) {
  const out = { ...(base.cap != null ? { cap: base.cap } : {}) };
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
  const acc = {};
  for (const [slot, key] of [['jewel', 'j'], ['wrist', 'w'], ['hands', 'h']]) {
    const a = px(slot);
    if (a) acc[key] = [a.item.kind, a.hex];
  }
  if (Object.keys(acc).length) look.acc = acc; else look.acc = null;
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
  for (const slot of SLOT_IDS) {
    const x = worn[slot] ? parsePiece(worn[slot]) : null;
    if (x) s += b36(ITEM_INDEX[x.item.id], 2) + b36(PALETTE_INDEX[x.color], 2);
  }
  return s;
}
export function decodeOutfit(code) {
  if (typeof code !== 'string' || code.length > 80 || !/^k[0-9]/.test(code)) return null;
  const worn = {};
  const body = code.slice(2);
  for (let i = 0; i + 4 <= body.length; i += 4) {
    const idx = parseInt(body.slice(i, i + 2), 36), ci = parseInt(body.slice(i + 2, i + 4), 36);
    const item = ITEMS[idx], color = PALETTE_IDS[ci];
    if (!item || !color || !item.colors.includes(color)) continue;
    worn[item.slot] = `${item.id}.${color}`;
  }
  return Object.keys(worn).length ? worn : null;
}

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
export function npcOutfit(seed, role = 'voetganger', ctx = {}) {
  const pool = ROLE_POOLS[role] || ROLE_POOLS.voetganger;
  const r = rng(`${seed}|${role}|${ctx.area || ''}`);
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
    const color = item.colors[Math.floor(r() * item.colors.length)];
    worn[slot] = `${id}.${color}`;
  }
  // een jurk dekt shirt en broek: geen losse jurk onder een korte broek
  if (worn.top && parsePiece(worn.top).item.kind === 'dress') delete worn.bottom;
  if (!worn.bottom && !(worn.top && parsePiece(worn.top).item.kind === 'dress')) worn.bottom = `jeans.${ITEM_BY_ID.jeans.colors[Math.floor(r() * 4)]}`;
  if (!worn.shoes) worn.shoes = 'gympen.ecru';
  if (!hasTorso(worn)) worn.top = 'tshirt.wit';
  return worn;
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
  const out = new Set();
  const want = Math.min(size, pool.length * 2);
  let guard = 0;
  while (out.size < want && guard++ < 400) {
    const list = special.length && r() < SHOP_RARE_CHANCE ? special : common;
    if (!list.length) break;
    const it = list[Math.floor(r() * list.length)];
    out.add(`${it.id}.${it.colors[Math.floor(r() * it.colors.length)]}`);
  }
  // elk slot waarvoor de winkel iets heeft, krijgt minstens één stuk
  for (const slot of SLOT_IDS) {
    const l = pool.filter((it) => it.slot === slot);
    if (l.length && ![...out].some((p) => pieceSlot(p) === slot) && r() < 0.8) {
      const it = l[Math.floor(r() * l.length)];
      out.add(`${it.id}.${it.colors[Math.floor(r() * it.colors.length)]}`);
    }
  }
  return [...out].sort((a, b) => SLOT_IDS.indexOf(pieceSlot(a)) - SLOT_IDS.indexOf(pieceSlot(b)) || a.localeCompare(b));
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
    };
  }
  return { v: SAVE_VERSION, ...per, story: store.forcedKey || null, bought: store.bought };
}

const cleanWorn = (w) => {
  const out = {};
  if (w && typeof w === 'object') for (const slot of SLOT_IDS) if (typeof w[slot] === 'string' && validPiece(w[slot]) && pieceSlot(w[slot]) === slot) out[slot] = w[slot];
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
      for (const p of Object.values(w.worn)) w.owned.add(p);
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
    else if (s && typeof s === 'object') w = cleanWorn(s);
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
