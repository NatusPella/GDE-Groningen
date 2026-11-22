// Kleding (epic Kleding, 21-11): de menu's van de kledingwinkel en de kast, in de vorm van shopui.js (secties met items). Zonder DOM
// en zonder three; shops.js geeft de dingen mee die in zijn eigen staat zitten (geld, het personage, de preview, het uiterlijk).
//
// De kledingwinkel: een wisselend aanbod per winkel en dag, een uitverkoop op vrijdag, sets en losse stukken, passen in de preview
// (elk stuk laat zich op je eigen personage zien voor je het koopt; slepen draait). De kast: alles wat je hebt per slot, aan of uit,
// vijf outfits, en de sets die compleet zijn.
import { SLOTS, SLOT_IDS, SPORT_IDS, PROFILES, RARITY, SETS, LOOKS, setsFor, parsePiece, pieceLabel, pieceSlot, colorHex, colorName } from './clothingdata.js';
import { soundForSlot } from './clothingsfx.js';
import {
  ownsPiece, ownedPieces, givePiece, effectiveWorn, wornPieces, wearPiece, takeOffSlot, takeOffBlock, wearSet, setPriceFor, missingOf, setBonus,
  presetsOf, presetCode, savePreset, wearPreset, getBody, setBody, shopStock, shopProfiles, shopPrice, saleOn, wornMatches, ownsAll, clothingStats,
} from './clothing.js';
import { euro } from './geldtekst.js';
import { BODY_IDS, BODY_TYPES } from './clothinghair.js';

const GROUPS = [
  { title: 'Hoofd en gezicht', slots: ['hat', 'glasses', 'face', 'neck'] },
  { title: 'Boven', slots: ['top', 'outer'] },
  { title: 'Onder en voeten', slots: ['bottom', 'shoes'] },
  { title: 'Tassen en sieraden', slots: ['back', 'jewel', 'wrist', 'hands'] },
  { title: 'Sport', slots: SLOT_IDS, sport: true }, // voetbalkleding (22-11): alle sportstukken bij elkaar, ook shirt, broek en schoenen
];
// Sportstukken staan onder Sport en niet nog eens onder hun slot (de andere groepen laten ze weg)
const inGroup = (g, piece) => SPORT_IDS.has(parsePiece(piece).item.id) === !!g.sport;
const slotLabel = (id) => (SLOTS.find((s) => s.id === id) || {}).label || id;
const lower = (s) => String(s || '').toLowerCase();

// Wat een lijst toont: het stuk zelf (of de set als compositie), niet het personage. Alleen het pashokje (ctx.fitting) en de samenstellingen
// (outfits, postuur, codes) tonen het personage: daar is "hoe staat het mij" of "hoe ziet de hele look eruit" de vraag.
const viewPiece = (ctx, piece, worn) => (!ctx.fitting && ctx.pieceOf ? ctx.pieceOf(piece) : ctx.previewOf(worn));
const viewSet = (ctx, s, worn) => (!ctx.fitting && ctx.setOf ? ctx.setOf(s.pieces) : ctx.previewOf(worn));
const withPiece = (worn, piece) => { const x = parsePiece(piece); return x ? { ...worn, [x.item.slot]: piece } : worn; };
const withoutSlot = (worn, slot) => { const o = { ...worn }; delete o[slot]; return o; };

function describe(piece) {
  const x = parsePiece(piece);
  if (!x) return '';
  const r = RARITY[x.item.rarity];
  return `${x.item.desc}. ${slotLabel(x.item.slot)}${r && x.item.rarity !== 'g' ? ' · ' + r.label : ''}`;
}

// De kleur als swatch; stukken zonder eigen kleur (baard) tonen er geen.
const swatchOf = (piece, hexCss) => { const x = parsePiece(piece); return x && x.color !== 'natuur' ? [hexCss(x.hex)] : []; };

// De kledingcategorie-iconen (shopicons.js, kl_*): een pictogram per slot, zodat de lijst op één blik leest.
export const SLOT_ICON = {
  hat: 'kl_hoed', glasses: 'kl_bril', face: 'kl_gezicht', neck: 'kl_hals', top: 'kl_shirt', outer: 'kl_jas', bottom: 'kl_broek', shoes: 'schoen',
  back: 'kl_tas', jewel: 'kl_sieraad', wrist: 'kl_horloge', hands: 'kl_hand', legs: 'kl_sok', guard: 'kl_scheen',
};
const iconOf = (piece) => SLOT_ICON[(parsePiece(piece) || { item: {} }).item.slot] || 'kleding';

// Een stuk aan: de winkel krijgt het te horen (prestaties) en het ritselt (clothingsfx.js; een jas gaat dicht met een rits).
function wore(ctx, piece) {
  ctx.onWear && ctx.onWear(piece);
  ctx.sound && ctx.sound(soundForSlot(pieceSlot(piece)));
}

// Een stuk dat je al hebt: aantrekken, of uitdoen als je het aan hebt.
function wardrobeItem(ctx, piece) {
  const x = parsePiece(piece);
  const ch = ctx.ch;
  const worn = wornPieces(ch);
  const on = worn[x.item.slot] === piece;
  const block = on ? takeOffBlock(ch, x.item.slot) : '';
  return {
    id: 'c-' + piece, icon: iconOf(piece),
    label: pieceLabel(x),
    desc: describe(piece),
    price: 0,
    keepFocus: true,
    verb: on ? 'Uitdoen' : 'Aantrekken',
    tag: on ? 'Aan' : '',
    swatch: swatchOf(piece, ctx.hexCss),
    preview: viewPiece(ctx, piece, on ? effectiveWorn(ch) : withPiece(effectiveWorn(ch), piece)),
    disabled: on && block ? block : '',
    buy() {
      if (on) {
        const r = takeOffSlot(ch, x.item.slot);
        if (!r.ok) return null;
        ctx.apply(0);
        ctx.sound && ctx.sound('clothes_rustle');
        return `${x.item.label} uitgedaan`;
      }
      const r = wearPiece(ch, piece);
      if (!r.ok) return null;
      const lost = ctx.apply(1);
      wore(ctx, piece);
      return `${x.item.label} aan${lost ? '. De politie herkent je niet meer zo goed!' : ''}`;
    },
  };
}

function setWardrobeItem(ctx, s) {
  const ch = ctx.ch;
  const on = wornMatches(ch, s.pieces);
  const bonus = s.bonus && s.bonus.stealth ? 'Politie raakt je sneller kwijt' : '';
  return {
    id: 'cs-' + s.id, icon: 'kl_outfit',
    label: s.label,
    desc: s.desc,
    price: 0,
    keepFocus: true,
    verb: 'Aantrekken',
    tag: on ? 'Aan' : '',
    effect: bonus,
    swatch: s.pieces.map((p) => parsePiece(p)).filter(Boolean).slice(0, 4).map((x) => ctx.hexCss(x.hex)),
    preview: viewSet(ctx, s, wornAfterSet(ch, s)),
    disabled: on ? 'Heb je al aan' : '',
    buy() {
      const r = wearSet(ch, s);
      if (!r.ok) return null;
      const lost = ctx.apply(s.bonus && s.bonus.stealth ? s.bonus.stealth : 1);
      wore(ctx, s.pieces[0]);
      return `${s.label} aan${lost ? '. De politie herkent je niet meer zo goed!' : ''}`;
    },
  };
}
// De uitkomst van een set aantrekken, zonder iets te veranderen (voor de preview).
function wornAfterSet(ch, s) {
  const next = { ...effectiveWorn(ch) };
  for (const p of s.pieces) { const x = parsePiece(p); if (x) next[x.item.slot] = p; }
  return next;
}

// ------------------------------------------------------------------------------------------------ de kast
// De melding na het aantrekken van een outfit: "ontbreekt" bij een stuk, "ontbreken" bij meer (review 22-11).
export const outfitMessage = (naam, ontbreekt) => (ontbreekt ? `${naam} aan, maar ${ontbreekt} ${ontbreekt === 1 ? 'stuk ontbreekt' : 'stukken ontbreken'}` : `${naam} aan`);

export function wardrobeSections(ctx) {
  const ch = ctx.ch;
  const sections = [];
  const completeSets = [...setsFor(ch), ...LOOKS].filter((s) => ownsAll(ch, s.pieces));
  const presets = presetsOf(ch);
  const worn = wornPieces(ch);
  if (presets.some(Boolean)) {
    sections.push({
      title: 'Outfits', keys: true, note: 'Eén druk en je staat er anders bij, ook onderweg met {6}. Bewaar de nieuwe met "Bewaar" hieronder',
      items: presets.map((p, i) => (p ? {
        id: 'cp-' + i, icon: 'kl_outfit', label: p.name, desc: Object.values(p.worn).map((x) => (parsePiece(x) || { item: { label: '' } }).item.label).filter(Boolean).join(', '),
        price: 0, keepFocus: true, verb: 'Aantrekken',
        tag: SLOT_IDS.every((s) => (p.worn[s] || null) === (worn[s] || null)) ? 'Aan' : '',
        preview: ctx.previewOf({ ...p.worn }),
        disabled: SLOT_IDS.every((s) => (p.worn[s] || null) === (worn[s] || null)) ? 'Heb je al aan' : '',
        buy() { const r = wearPreset(ch, i); if (!r.ok) return null; ctx.apply(1); ctx.sound && ctx.sound('clothes_rustle'); return outfitMessage(p.name, r.missing.length); },
      } : null)).filter(Boolean),
    });
  }
  sections.push({
    title: 'Bewaar', note: 'Sla wat je nu aan hebt op in een van de vijf outfits',
    items: presets.map((p, i) => ({
      id: 'cv-' + i, icon: 'kl_outfit', label: p ? `Overschrijf ${p.name}` : `Bewaar als Outfit ${i + 1}`, desc: p ? 'Vervangt wat daar nu staat' : 'Een lege plek',
      price: 0, keepFocus: true, verb: 'Bewaren', preview: ctx.previewOf(effectiveWorn(ch)),
      buy() { savePreset(ch, i, p ? p.name : `Outfit ${i + 1}`); return `Bewaard in outfit ${i + 1}`; },
    })),
  });
  if (completeSets.length) sections.push({ title: 'Sets', note: 'Alle stukken erbij? Dan zit er een set in je kast', items: completeSets.map((s) => setWardrobeItem(ctx, s)) });
  for (const g of GROUPS) {
    const items = [];
    for (const slot of g.slots) {
      for (const piece of ownedPieces(ch).filter((p) => parsePiece(p).item.slot === slot && inGroup(g, p)).sort()) items.push(wardrobeItem(ctx, piece));
    }
    if (items.length) sections.push({ title: g.title, note: `${items.filter((it) => it.tag === 'Aan').length} aan`, items });
  }
  // Postuur: de lichaamsvorm (clothinghair.js). Kleding en haar zijn voor iedereen; alleen de pasvorm hangt van het lichaam af.
  sections.push({
    title: 'Postuur', note: 'Alleen de pasvorm: elk kledingstuk en elk kapsel past bij elke vorm',
    items: BODY_IDS.map((id) => ({
      id: 'cb-' + id, icon: 'kl_postuur', label: BODY_TYPES[id].label, desc: 'Je lichaamsvorm', price: 0, keepFocus: true, verb: 'Kiezen',
      tag: getBody(ch) === id ? 'Aan' : '', disabled: getBody(ch) === id ? 'Heb je al' : '',
      preview: ctx.previewOf({ ...effectiveWorn(ch), body: id }),
      buy() { if (!setBody(ch, id)) return null; ctx.apply(0); return `Postuur: ${BODY_TYPES[id].label.toLowerCase()}`; },
    })),
  });
  return sections;
}

// ------------------------------------------------------------------------------------------------ de winkel
function shopItem(ctx, piece, shopKey) {
  const x = parsePiece(piece);
  const ch = ctx.ch;
  const owned = ownsPiece(ch, piece);
  const worn = wornPieces(ch);
  const on = worn[x.item.slot] === piece;
  const price = shopPrice(piece, shopKey, ctx.day);
  const sale = saleOn(ctx.day);
  const inSale = !!sale && price < x.item.price;
  return {
    id: 'c-' + piece, icon: iconOf(piece),
    label: pieceLabel(x),
    desc: describe(piece),
    price: owned ? 0 : price,
    keepFocus: true,
    verb: owned && !on ? 'Aantrekken' : undefined,
    tag: on ? 'Aan' : owned ? 'In je kast' : inSale ? 'Uitverkoop' : '',
    swatch: swatchOf(piece, ctx.hexCss),
    preview: viewPiece(ctx, piece, withPiece(effectiveWorn(ch), piece)),
    disabled: on ? 'Heb je al aan' : owned ? '' : ctx.broke(price),
    buy() {
      if (!owned) {
        if (!ctx.pay(price)) return null;
        givePiece(ch, piece, { fromShop: true });
      }
      const r = wearPiece(ch, piece);
      if (!r.ok) return null;
      const lost = ctx.apply(1);
      wore(ctx, piece);
      return (owned ? `${x.item.label} aangetrokken` : `${x.item.label} gekocht en meteen aan`) + (lost ? '. De politie herkent je niet meer zo goed!' : '');
    },
  };
}

function shopSetItem(ctx, s) {
  const ch = ctx.ch;
  const price = setPriceFor(ch, s);
  const miss = missingOf(ch, s.pieces);
  const on = wornMatches(ch, s.pieces);
  const bonus = s.bonus && s.bonus.stealth ? 'Politie raakt je sneller kwijt' : '';
  return {
    id: 'cs-' + s.id, icon: 'kl_outfit',
    label: s.label,
    desc: `${s.desc}${miss.length && miss.length < s.pieces.length ? ` (nog ${miss.length} van ${s.pieces.length} stukken)` : ''}`,
    price,
    keepFocus: true,
    verb: !miss.length && !on ? 'Aantrekken' : undefined,
    tag: on ? 'Aan' : !miss.length ? 'In je kast' : '',
    effect: bonus,
    swatch: s.pieces.map((p) => parsePiece(p)).filter(Boolean).slice(0, 4).map((x) => ctx.hexCss(x.hex)),
    preview: viewSet(ctx, s, wornAfterSet(ch, { pieces: s.pieces })),
    disabled: on ? 'Heb je al aan' : miss.length ? ctx.broke(price) : '',
    buy() {
      if (miss.length) {
        if (!ctx.pay(price)) return null;
        for (const p of miss) givePiece(ch, p, { fromShop: true });
      }
      const r = wearSet(ch, s);
      if (!r.ok) return null;
      const lost = ctx.apply(s.bonus && s.bonus.stealth ? s.bonus.stealth : 1);
      wore(ctx, s.pieces[0]);
      ctx.onSet && ctx.onSet(s);
      return (miss.length ? `${s.label} gekocht en meteen aan` : `${s.label} aangetrokken`) + (lost ? '. De politie herkent je niet meer zo goed!' : '');
    },
  };
}

// De secties van een kledingwinkel. ctx: { ch, name, day, shopKey, hexCss, broke, pay, apply, previewOf, ownedBySlot, ... }.
export function shopSections(ctx) {
  const ch = ctx.ch;
  const stock = shopStock(ctx.shopKey, ctx.day);
  const profs = shopProfiles(ctx.shopKey);
  const sale = saleOn(ctx.day);
  const out = [];
  // sets: de oude vaste sets van dit personage, altijd te koop (een stuk daaruit kan dagelijks wisselen, een set blijft)
  out.push({ title: `Sets voor ${ctx.name}`, note: 'Alle stukken in één keer. Heb je er al een paar, dan betaal je alleen de rest', items: setsFor(ch).map((s) => shopSetItem(ctx, s)) });
  const note = (slots) => {
    const lbl = slots.length ? slots.map(slotLabel).join(', ').toLowerCase() : 'voetbal- en trainingskleding';
    return `${lbl}. Deze winkel: ${profs.map((p) => PROFILES[p]).join(' en ')}${sale && profs.includes(sale.profile) ? `. Vandaag uitverkoop op ${PROFILES[sale.profile].toLowerCase()} (${Math.round(sale.discount * 100)} procent)` : ''}`;
  };
  for (const g of GROUPS) {
    const items = stock.filter((p) => g.slots.includes(parsePiece(p).item.slot) && inGroup(g, p)).map((p) => shopItem(ctx, p, ctx.shopKey));
    if (items.length) out.push({ title: g.title, note: note(g.sport ? [] : g.slots), items });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ het pashokje
// Het pashokje van een kledingwinkel (interior, epic Interieurs): gordijn dicht en alles in één menu. Je past wat de winkel vandaag heeft (elk
// stuk over je eigen outfit, slepen draait), je trekt aan wat je al hebt, je bewaart de look in een van de vijf outfits en je kunt de code
// ervan lezen om te delen (outfit-code versie 3: stukken, kapsel en postuur). Kopen kan hier ook: de kassa is een stap verderop, de
// pasbon is dezelfde. Ids van winkelstukken krijgen 'p-' voorop, zodat ze niet botsen met dezelfde stukken uit de kast.
export function fittingSections(base) {
  const ctx = { ...base, fitting: true }; // in het pashokje past je het stuk over je eigen outfit: de lijst toont jou, niet het losse stuk
  const ch = ctx.ch;
  const out = [];
  const wardrobe = wardrobeSections(ctx);
  // eerst wat je wilt kiezen en bewaren, dan wat de winkel heeft, dan de rest van de kast
  const head = wardrobe.filter((s) => s.title === 'Outfits' || s.title === 'Bewaar');
  const rest = wardrobe.filter((s) => !head.includes(s));
  out.push(...head);
  if (ctx.shopKey) {
    for (const s of shopSections(ctx)) {
      out.push({ ...s, title: `Passen: ${s.title}`, items: s.items.map((it) => ({ ...it, id: 'p-' + it.id })) });
    }
  }
  out.push(...rest.map((s) => ({ ...s, items: s.items.map((it) => ({ ...it, id: it.id.startsWith('c-') ? 'k-' + it.id : it.id })) })));
  const code = codeSection(ctx);
  if (code) out.push(code);
  return out;
}

// De outfit-code van elke bewaarde outfit, om te delen: het menu toont hem en zegt hem in de melding (de code zelf is geen persoonsgegeven).
export function codeSection(ctx) {
  const ch = ctx.ch;
  const items = presetsOf(ch).map((p, i) => (p ? {
    id: 'cc-' + i, icon: 'kl_outfit', label: `Code van ${p.name}`, desc: presetCode(ch, i), price: 0, keepFocus: true, verb: 'Code tonen',
    preview: ctx.previewOf({ ...p.worn }),
    buy() { const c = presetCode(ch, i); ctx.copy && ctx.copy(c); return `Code van ${p.name}: ${c}`; },
  } : null)).filter(Boolean);
  return items.length ? { title: 'Deel je look', note: 'Een korte code met je stukken, kapsel en postuur. Een ander ziet dezelfde look; wat hij niet heeft, blijft weg', items } : null;
}

export function clothingSummary(ch) {
  const st = clothingStats(ch);
  const b = setBonus(ch);
  return { ...st, bonusStealth: b.stealth };
}
export { colorHex, colorName, euro, SETS };
