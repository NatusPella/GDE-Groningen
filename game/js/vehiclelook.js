// De uiterlijk-tuning van een voertuig (epic Autotuning, #1155): lak-afwerking, strepen, stickers,
// velgen, spoiler, kit, dakdrager, verlichting, underglow, ruitfolie, uitlaat, nummerbord en hanger.
// Pure data en regels, Node-safe, zonder THREE: vehiclelook3d.js bouwt het beeld, vehiclelookstore.js
// bewaart het, tuningplan.js houdt de onderdelen met prestatie-effect.
//
// Een look is een plat object met alleen de velden die afwijken van de standaard; een leeg object is
// een kale auto. De carrosseriekleur zelf blijft bij Spuit & Klaar (model.color); de look kent alleen
// afwerking en tweede kleur. De compacte code (lookCode/parseLook) is wat de opslag, Samen spelen en
// de presets gebruiken: kort, versiegebonden en tolerant bij het lezen.
//
// Alle namen zijn verzonnen (parodie): geen echte merken, logo's of kentekens. Altijd zomer.

export const LOOK_VERSION = 1;
export const CODE_PREFIX = 'L1';
export const PLATE_MAX = 8;
export const PRESETS_PER_VEHICLE = 3;

const O = (id, label, price, desc = '') => ({ id, label, price, desc });

// --- de catalogus ---------------------------------------------------------------------------
// Elke lijst begint met de standaard (prijs 0). Een kleurveld heeft een vaste prijs (COLOR_PRICE).
export const OPTIONS = {
  finish: [
    O('gloss', 'Glanslak', 0, 'Gewoon glad en glanzend'),
    O('metallic', 'Metallic', 45, 'Fijne glitters in de lak'),
    O('pearl', 'Parelmoer', 70, 'Schuift mee met het licht'),
    O('matte', 'Mat', 55, 'Geen glans, wel stoer'),
  ],
  stripe: [
    O('none', 'Geen strepen', 0),
    O('racing', 'Racestrepen', 30, 'Twee banen van neus tot staart'),
    O('flank', 'Zijband', 25, 'Een band langs de flank'),
    O('hood', 'Motorkap-band', 20, 'Alleen op de motorkap'),
    O('duo', 'Dubbele zijband', 35, 'Twee smalle banden naast elkaar'),
    O('checker', 'Finishvlag-band', 32, 'Zwart-witte blokjes langs de flank'),
  ],
  decal: [
    O('none', 'Geen stickers', 0),
    O('frituur', 'Frituur Zonnedijk', 22, 'De friet van de buurt, op je portier'),
    O('kwark', 'Kwark Racing', 22, 'Wit en snel, met een zuivelgeurtje'),
    O('wiebel', 'Wiebelwerk Garage', 22, 'Wiebelt niet, zegt de sticker'),
    O('grunn', 'Grunn Drift Team', 26, 'Sleur door de bocht, thuis in Grunn'),
    O('rally', 'Ommelanden Rally', 26, 'Modder niet meegerekend'),
    O('vlam', 'Zomervlammen', 30, 'Oranje tongen langs de zijkant'),
    O('ster', 'Sterrenregen', 24, 'Zeven sterren op een rij'),
  ],
  rimStyle: [
    O('stock', 'Standaard velgen', 0),
    O('spoke', 'Spaakvelgen', 40, 'Tien dunne spaken'),
    O('mesh', 'Gaasvelgen', 55, 'Fijn gaas, veel glans'),
    O('disc', 'Schijfvelgen', 35, 'Dicht en rustig'),
    O('star', 'Sterrenvelgen', 60, 'Vijf scherpe punten'),
    O('twist', 'Draaivelgen', 58, 'Gedraaide spaken, ze lijken te draaien als je stilstaat'),
    O('dish', 'Schotelvelgen', 48, 'Diepe schotel met bouten langs de rand'),
  ],
  rimSize: [O('m', 'Middel', 0), O('s', 'Klein', 0), O('l', 'Groot', 25, 'Grote velg, dunne band')],
  tire: [
    O('standard', 'Standaard banden', 0),
    O('lowprofile', 'Lage profielbanden', 30, 'Dunne band, groot beeld'),
    O('whitewall', 'Witte flank', 28, 'Een witte ring zoals vroeger'),
    O('offroad', 'Veenpad-profiel', 28, 'Dikke noppen voor de polder'),
  ],
  spoiler: [
    O('none', 'Geen spoiler', 0),
    O('lip', 'Lip', 35, 'Een nette kraag op de kofferbak'),
    O('wing', 'Vleugel', 60, 'Op twee pootjes boven de kont'),
    O('gt', 'Hoge vleugel', 85, 'Je ziet hem van de volgende wijk'),
    O('duck', 'Eendenstaart', 50, 'Een korte opstaande rand, klein maar brutaal'),
  ],
  kit: [
    O('none', 'Geen bodykit', 0),
    O('sport', 'Sportkit', 70, 'Lip voor, drempels opzij'),
    O('wide', 'Brede kit', 110, 'Verbrede spatborden en drempels'),
    O('rally', 'Rallykit', 95, 'Modderflappen en een stoere beugel voor de neus'),
  ],
  diffuser: [O('off', 'Geen diffuser', 0), O('on', 'Diffuser', 45, 'Lamellen onder de achterbumper')],
  roof: [
    O('none', 'Kale dak', 0),
    O('rack', 'Dakdrager', 40, 'Twee dwarsbalken en een rand'),
    O('box', 'Dakkoffer', 65, 'Voor het kampeerspul'),
    O('bike', 'Fietsendrager', 48, 'Je fiets mee op het dak, want dit is Grunn'),
    O('surf', 'Surfplank', 42, 'Voor een zomerse dag bij het Lauwersmeer'),
  ],
  lamps: [
    O('stock', 'Standaard koplampen', 0),
    O('halo', 'Ringlampen', 40, 'Een lichtring om elke lamp'),
    O('slit', 'Smalle koplampen', 45, 'Spleetogen'),
    O('wide', 'Brede lampen', 35, 'Een grote lichtbak'),
    O('angry', 'Strenge lampen', 42, 'Schuine ogen die scherp kijken'),
  ],
  tint: [
    O('0', 'Geen folie', 0),
    O('1', 'Lichte folie', 20),
    O('2', 'Donkere folie', 32),
    O('3', 'Limousinefolie', 45, 'Vanaf de stoep zie je niets'),
  ],
  exhaust: [
    O('stock', 'Standaard uitlaat', 0),
    O('twin', 'Dubbele pijpen', 40, 'Twee chroompijpen'),
    O('big', 'Dikke pijp', 35, 'Een pijp zo dik als een emmer'),
    O('side', 'Zij-uitlaat', 50, 'Onder de drempel, naast het portier'),
    O('stack', 'Schoorsteenpijpen', 55, 'Twee pijpen omhoog achter het dak'),
  ],
  hanger: [
    O('none', 'Geen hanger', 0),
    O('dice', 'Dobbelsteen', 8, 'Aan de spiegel'),
    O('tree', 'Geurboompje', 6, 'Ruikt naar een zomerse tuin'),
    O('flag', 'Vlaggetje', 8, 'Rood, wit en blauw in de wind'),
    O('duck', 'Badeendje', 9, 'Geel, tevreden en aan de spiegel'),
    O('fries', 'Frietpunt', 9, 'Een puntzakje aan een koordje'),
  ],
  // alleen voor de snackwagen (het eindvoertuig van het verhaal): luifel, uitstalling, bakkenlicht, lucht en belettering
  awning: [
    O('stock', 'Standaard luifel', 0),
    O('zon', 'Zonnige luifel', 35, 'Geel en wit, vrolijk vanaf de straat'),
    O('bos', 'Bordgroene luifel', 35, 'Groen en wit, rustig voor het oog'),
    O('roze', 'Zomerroze luifel', 40, 'Roze en wit, valt op in de rij'),
  ],
  display: [
    O('none', 'Geen uitstalling', 0),
    O('bord', 'Krijtbord', 25, 'De dagaanbieding in krijt'),
    O('tafel', 'Klaptafel met krukjes', 60, 'Even zitten bij je bakje friet'),
    O('vlaggen', 'Vlaggenlijn', 30, 'Wimpels langs de luifel'),
  ],
  beacon: [
    O('none', 'Geen bakkenlicht', 0),
    O('bak', 'Bakkenlicht', 55, 'Een gloeiende frituurmand op het dak, je ziet hem van ver'),
    O('ring', 'Lampjesrand', 75, 'Een rij warme lampjes langs het dak'),
  ],
  air: [
    O('none', 'Gewoon lucht', 0),
    O('damp', 'Frituurdamp', 30, 'Dampwolkjes uit de afzuiger'),
    O('geur', 'Geurpakket', 45, 'Je ruikt hem al voor je hem ziet'),
    O('bijtjes', 'Bijtjes', 50, 'Een paar bijtjes zoemen rond de uitstalling'),
  ],
  snackName: [
    O('tamtes', 'TAM & TES', 0, 'De naam van de snackwagen: Tammo en Tessa'),
    O('none', 'Geen belettering', 0),
    O('zonnedijk', 'Frituur Zonnedijk', 40),
    O('kwark', 'Kwarkbakkie', 40),
    O('eierbal', 'Eierbal Express', 40),
    O('vethap', 'De Vette Hap', 40),
    O('knabbel', 'Knabbel en Babbel', 40),
    O('tammo', "Tammo's Friet", 40, 'Zijn eigen naam op de zijkant'),
  ],
};
export const COLOR_PRICE = { color2: 18, rimColor: 20, lampColor: 15, glow: 55 };

// Velden in codevolgorde. Voeg alleen achteraan toe en bump LOOK_VERSION bij een andere betekenis.
const ENUMS = ['finish', 'stripe', 'decal', 'rimStyle', 'rimSize', 'tire', 'spoiler', 'kit', 'diffuser', 'roof', 'lamps', 'tint', 'exhaust', 'hanger', 'awning', 'display', 'beacon', 'air', 'snackName'];
const COLORS = ['color2', 'rimColor', 'lampColor', 'glow'];
export const ENUM_FIELDS = ENUMS;
export const LOOK_FIELDS = [...ENUMS, ...COLORS, 'plate'];

const idsOf = (f) => OPTIONS[f].map((o) => o.id);
export const optionOf = (field, id) => (OPTIONS[field] || []).find((o) => o.id === id) || null;
export const defaultOf = (field) => OPTIONS[field][0].id;

// --- categorieën en wat past op welke soort ---------------------------------------------------
export const CATEGORIES = [
  { id: 'lak', label: 'Lak', fields: ['finish', 'color2'] },
  { id: 'strepen', label: 'Strepen en stickers', fields: ['stripe', 'decal'] },
  { id: 'velgen', label: 'Velgen en banden', fields: ['rimStyle', 'rimColor', 'rimSize', 'tire'] },
  { id: 'carrosserie', label: 'Carrosserie', fields: ['spoiler', 'kit', 'diffuser', 'roof', 'exhaust'] },
  { id: 'licht', label: 'Licht en ruiten', fields: ['lamps', 'lampColor', 'glow', 'tint'] },
  { id: 'details', label: 'Details', fields: ['plate', 'hanger'] },
  { id: 'snack', label: 'Snackwagen', fields: ['awning', 'display', 'beacon', 'air', 'snackName'] },
];

export const FIELD_LABELS = {
  finish: 'Afwerking', color2: 'Tweede kleur', stripe: 'Strepen', decal: 'Sticker', rimStyle: 'Velgstijl', rimColor: 'Velgkleur',
  rimSize: 'Velgmaat', tire: 'Banden', spoiler: 'Spoiler', kit: 'Bodykit', diffuser: 'Diffuser', roof: 'Dak', lamps: 'Koplampen',
  lampColor: 'Lampkleur', glow: 'Underglow', tint: 'Raamfolie', exhaust: 'Uitlaat', hanger: 'Hanger', plate: 'Nummerbord',
  awning: 'Luifel', display: 'Uitstalling', beacon: 'Bakkenlicht', air: 'Lucht', snackName: 'Belettering',
};

// De soorten voertuig die je kunt pimpen en wat erop kan. 'boot' is alleen cosmetisch, een NPC-bus kan niet.
const SNACK_FIELDS = ['awning', 'display', 'beacon', 'air', 'snackName'];
export const KIND_FIELDS = {
  auto: LOOK_FIELDS.filter((f) => !SNACK_FIELDS.includes(f)),
  snackwagen: ['finish', 'color2', 'stripe', 'decal', 'rimStyle', 'rimColor', 'rimSize', 'tire', 'lampColor', 'glow', 'tint', 'exhaust', 'plate', 'hanger', ...SNACK_FIELDS],
  tweewieler: ['finish', 'rimColor', 'glow'],
  bus: ['finish', 'color2', 'stripe', 'decal', 'rimStyle', 'rimColor', 'glow', 'plate'],
  boot: ['finish', 'color2', 'stripe', 'decal'],
};
export const KIND_LABELS = { auto: 'Auto', snackwagen: 'Snackwagen', tweewieler: 'Tweewieler', bus: 'Bus', boot: 'Boot' };

// Het soort uit de vlaggen van het voertuig; null = niet te pimpen (politie, wrak, trekker, vliegtuig, ...).
export function lookKind(v) {
  if (!v || v.wrecked || v.isPolice || v.isHeli || v.isPlane || v.isAmbulance || v.isCashVan) return null;
  if (v.isBoat) return 'boot';
  if (v.isBike || v.isScooter) return 'tweewieler';
  if (v.isBus) return v.driver === 'player' || v.playerOwned ? 'bus' : null; // NPC-bussen blijven zoals ze zijn
  const n = v.model && v.model.name;
  if (n === 'foodtruck' || n === 'snackwagen' || v.isSnackwagen) return 'snackwagen'; // het eindvoertuig van het verhaal (docs/TUNING-21-11.md)
  if (n === 'truck' || n === 'tractor' || n === 'quad' || n === 'maaidorser' || n === 'laadmachine' || n === 'trekkerlimo') return null;
  return 'auto';
}
export const fieldsFor = (kind) => KIND_FIELDS[kind] || [];
export const categoriesFor = (kind) => CATEGORIES.map((c) => ({ ...c, fields: c.fields.filter((f) => fieldsFor(kind).includes(f)) })).filter((c) => c.fields.length);

// --- kleuren ---------------------------------------------------------------------------------
// De paletten komen uit de inkten van het ontwerpsysteem (ds-tokens.css) en de spuiterij (shops.js PAINTS),
// zodat een gepimpte auto in dezelfde wereld past. Een eigen kleur mag ook (kleurkiezer), alleen niet te
// donker of te grijs om 's nachts op te vallen is geen eis: het is gewoon een kleur.
const P = (id, label, c) => ({ id, label, color: c });
export const DEFAULT_CUSTOM_COLOR = '#2e5f9e'; // waar de kleurkiezer begint
export const BODY_COLORS = [
  P('rood', 'Brandweerrood', '#a11f1f'), P('groen', 'Stadjersgroen', '#1e9e56'),
  P('zwart', 'Nachtzwart', '#1b1c1f'), P('wit', 'Kwarkwit', '#e8e6e0'),
  P('geel', 'Koolzaadgeel', '#d9b21b'), P('oranje', 'Oranje', '#d8641c'),
  P('blauw', 'Reitdiepblauw', '#2e5f9e'), P('paars', 'Paars-pimp', '#6a2e8a'),
  P('roze', 'Zomerroze', '#e8505b'), P('turkoois', 'Zeeblauw', '#1ba3b8'),
  P('limoen', 'Limoen', '#8ccf2a'), P('borduur', 'Bordgroen', '#0e6b3c'),
];
export const ACCENT_COLORS = [
  P('wit', 'Wit', '#f3ead3'), P('zwart', 'Zwart', '#1d1b17'),
  P('geel', 'Zonnegeel', '#f9c80e'), P('rood', 'Rood', '#d93f3f'),
  P('blauw', 'Blauw', '#4fb3ff'), P('groen', 'Groen', '#3fc97a'),
  P('oranje', 'Oranje', '#ff9a62'), P('roze', 'Roze', '#ff7ab8'),
  P('paars', 'Paars', '#b78cff'), P('zilver', 'Zilver', '#b9b7ad'),
];
export const GLOW_COLORS = [
  P('cyaan', 'Cyaan', '#6fd3e0'), P('blauw', 'Blauw', '#4fb3ff'),
  P('groen', 'Groen', '#5bd6a0'), P('roze', 'Roze', '#ff7ab8'),
  P('paars', 'Paars', '#b78cff'), P('oranje', 'Oranje', '#ff9a62'),
];
export const PALETTES = { body: BODY_COLORS, color2: ACCENT_COLORS, rimColor: ACCENT_COLORS, lampColor: ACCENT_COLORS, glow: GLOW_COLORS };

const HEX = /^#[0-9a-f]{6}$/i;
export const cleanColor = (c) => (typeof c === 'string' && HEX.test(c) ? c.toLowerCase() : null);

// --- nummerbord ------------------------------------------------------------------------------
// Verzonnen tekst: hoogstens 8 tekens (A-Z, 0-9, spatie, streepje). Een echt Nederlands kenteken heeft
// de vorm XX-99-XX en is dus niet toegestaan; scheldwoorden en merken ook niet.
const BANNED = /(KUT|LUL|HOER|NSB|FUCK|SHIT|NAZI|HITLER|SS\b|ISIS|BMW|AUDI|FORD|OPEL|VOLVO|FIAT|MERC|TESLA|SEAT|MAZDA|TOYOTA)/;
export function cleanPlate(s) {
  if (typeof s !== 'string') return '';
  const full = s.toUpperCase().replace(/[^A-Z0-9 -]/g, '').replace(/\s+/g, ' ').trim();
  if (BANNED.test(full.replace(/[ -]/g, ''))) return '';
  const t = full.slice(0, PLATE_MAX);
  if (!t) return '';
  if (/^[A-Z0-9]{2}-[A-Z0-9]{2}-[A-Z0-9]{2}$/.test(t)) return ''; // zou een echt kenteken kunnen zijn
  return t;
}

// --- opschonen, vergelijken, prijs --------------------------------------------------------------
// Alleen bekende velden en waarden die bij het soort passen; alles op de standaard valt weg.
export function sanitizeLook(look, kind = 'auto') {
  const out = {};
  if (!look || typeof look !== 'object') return out;
  const allowed = new Set(fieldsFor(kind));
  for (const f of ENUMS) {
    const id = look[f];
    if (!allowed.has(f) || typeof id !== 'string' && typeof id !== 'number') continue;
    const o = optionOf(f, String(id));
    if (o && o.id !== defaultOf(f)) out[f] = o.id;
  }
  for (const f of COLORS) {
    const c = cleanColor(look[f]);
    if (c && allowed.has(f)) out[f] = c;
  }
  if (allowed.has('plate')) { const p = cleanPlate(look.plate); if (p) out.plate = p; }
  return out;
}
export const isStock = (look) => !look || Object.keys(look).length === 0;
export const looksEqual = (a, b) => {
  const x = a || {}, y = b || {};
  return LOOK_FIELDS.every((f) => (x[f] ?? null) === (y[f] ?? null));
};
export const changedFields = (from, to) => LOOK_FIELDS.filter((f) => ((from || {})[f] ?? null) !== ((to || {})[f] ?? null));

// Prijs van een enkel veld op zijn waarde (0 voor de standaard).
export function fieldPrice(field, value) {
  if (value == null) return 0;
  if (COLORS.includes(field)) return COLOR_PRICE[field];
  if (field === 'plate') return value ? 30 : 0;
  const o = optionOf(field, String(value));
  return o ? o.price : 0;
}
// Wat het kost om van `from` naar `to` te gaan: alleen de veranderde velden, voor de nieuwe waarde.
// Terugdraaien naar de standaard kost niets; een vervangen onderdeel levert de helft van de oude prijs op (inruil).
export function lookPrice(from, to) {
  let sum = 0;
  for (const f of changedFields(from, to)) {
    const nu = fieldPrice(f, (to || {})[f]);
    const oud = Math.floor(fieldPrice(f, (from || {})[f]) / 2);
    sum += Math.max(0, nu - (nu > 0 ? oud : 0));
  }
  return sum;
}
// De volle waarde van een look (voor de inruil en voor "wat is mijn build waard").
export const lookValue = (look) => LOOK_FIELDS.reduce((s, f) => s + fieldPrice(f, (look || {})[f]), 0);

// Hoeveel een build opvalt in beeld (0..1): voor de HUD-chip en de autotreffen. Geeft de politie geen reden (zie docs/TUNING-21-11.md).
export function flashiness(look) {
  if (isStock(look)) return 0;
  let s = 0;
  if (look.glow) s += 0.25;
  if (look.spoiler && look.spoiler !== 'none') s += look.spoiler === 'gt' ? 0.2 : 0.12;
  if (look.kit && look.kit !== 'none') s += 0.15;
  if (look.stripe) s += 0.1;
  if (look.decal) s += 0.1;
  if (look.finish === 'pearl' || look.finish === 'metallic') s += 0.1;
  if (look.rimStyle) s += 0.08;
  if (look.exhaust) s += 0.05;
  return Math.min(1, +s.toFixed(2));
}

// --- compacte code ---------------------------------------------------------------------------
// 'L1' + één teken per opsomming (base36 van de plek in de lijst) + per kleur '-' of zes hexcijfers
// + eventueel '~' en het nummerbord. Een kale auto is 'L1' + alleen nullen en streepjes; die slaan
// we niet op (lookCode geeft '' bij een kale look).
export function lookCode(look, kind = 'auto') {
  const l = sanitizeLook(look, kind);
  if (isStock(l)) return '';
  let s = CODE_PREFIX;
  for (const f of ENUMS) s += Math.max(0, idsOf(f).indexOf(l[f] ?? defaultOf(f))).toString(36);
  for (const f of COLORS) s += l[f] ? l[f].slice(1) : '-';
  if (l.plate) s += '~' + l.plate.replace(/ /g, '_');
  return s;
}

// Tolerant: onzin, een onbekende versie of een te lange code geeft null; een onbekende waarde valt terug op de standaard.
export function parseLook(code, kind = 'auto') {
  if (typeof code !== 'string' || code.length < CODE_PREFIX.length + ENUMS.length + COLORS.length || code.length > 96 || !code.startsWith(CODE_PREFIX)) return null;
  let i = CODE_PREFIX.length;
  const out = {};
  for (const f of ENUMS) {
    const idx = parseInt(code[i++], 36);
    const list = idsOf(f);
    if (Number.isFinite(idx) && idx > 0 && idx < list.length) out[f] = list[idx];
  }
  for (const f of COLORS) {
    if (code[i] === '-') { i++; continue; }
    const c = cleanColor('#' + code.slice(i, i + 6));
    if (!c) return null;
    out[f] = c; i += 6;
  }
  if (code[i] === '~') out.plate = code.slice(i + 1).replace(/_/g, ' ');
  return sanitizeLook(out, kind);
}

// --- deterministische generator voor de wereld ----------------------------------------------------
// Dezelfde zaad geeft dezelfde look (een geparkeerde auto ziet er elke keer hetzelfde uit). Vier stijlen,
// zodat een build samenhangt in plaats van een willekeurige stapel onderdelen.
function rng(seed) {
  let a = (Number(seed) * 2654435761 + 0x9e3779b9) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const STYLES = ['race', 'show', 'rally', 'cruiser'];
const STYLE_PLAN = {
  race: { finish: ['gloss', 'metallic'], stripe: ['racing', 'flank', 'checker'], decal: ['kwark', 'grunn', 'vlam'], rimStyle: ['star', 'spoke'], rimSize: ['l'], tire: ['lowprofile'], spoiler: ['wing', 'gt'], kit: ['sport', 'wide'], diffuser: ['on'], exhaust: ['big', 'twin'], lamps: ['slit'], glow: 0.2 },
  show: { finish: ['pearl', 'metallic'], stripe: ['duo', 'hood'], decal: ['ster', 'vlam'], rimStyle: ['mesh', 'star'], rimSize: ['l'], tire: ['lowprofile', 'whitewall'], spoiler: ['lip'], kit: ['sport'], exhaust: ['twin'], lamps: ['halo'], tint: ['2', '3'], glow: 0.7 },
  rally: { finish: ['matte', 'gloss'], stripe: ['hood', 'flank'], decal: ['rally', 'wiebel'], rimStyle: ['disc', 'spoke'], rimSize: ['m'], tire: ['offroad'], roof: ['rack', 'box', 'bike', 'surf'], kit: ['rally'], lamps: ['wide', 'angry'], glow: 0 },
  cruiser: { finish: ['metallic', 'pearl', 'gloss'], stripe: ['flank', 'none'], decal: ['frituur', 'none'], rimStyle: ['disc', 'mesh'], rimSize: ['m'], tire: ['whitewall'], hanger: ['dice', 'tree', 'flag', 'duck', 'fries'], tint: ['1', '2'], glow: 0.35, lamps: ['stock', 'halo'] },
};
const pick = (r, a) => a[Math.floor(r() * a.length)];

// Een look voor een voertuig in de wereld. ctx.kind: soort (standaard 'auto'); ctx.style: vaste stijl.
// Geeft { look, bodyColor, style }. De look is al opgeschoond voor het soort.
export function generateLook(seed, ctx = {}) {
  const r = rng(seed);
  const kind = ctx.kind || 'auto';
  const style = ctx.style && STYLE_PLAN[ctx.style] ? ctx.style : pick(r, STYLES);
  const p = STYLE_PLAN[style];
  const bodyList = style === 'rally' ? BODY_COLORS.filter((c) => ['wit', 'oranje', 'blauw', 'geel', 'groen'].includes(c.id)) : BODY_COLORS;
  const bodyColor = pick(r, bodyList).color;
  const accent = pick(r, style === 'race' ? ACCENT_COLORS.filter((c) => ['wit', 'zwart', 'geel', 'rood'].includes(c.id)) : ACCENT_COLORS).color;
  const raw = { finish: pick(r, p.finish), color2: accent, stripe: pick(r, p.stripe), decal: pick(r, p.decal), rimStyle: pick(r, p.rimStyle), rimSize: pick(r, p.rimSize), tire: pick(r, p.tire), rimColor: pick(r, ACCENT_COLORS).color };
  if (p.spoiler && r() < 0.8) raw.spoiler = pick(r, p.spoiler);
  if (p.kit && r() < 0.55) raw.kit = pick(r, p.kit);
  if (p.diffuser && r() < 0.5) raw.diffuser = pick(r, p.diffuser);
  if (p.exhaust && r() < 0.7) raw.exhaust = pick(r, p.exhaust);
  if (p.roof) raw.roof = pick(r, p.roof);
  if (p.lamps) raw.lamps = pick(r, p.lamps);
  if (p.hanger && r() < 0.6) raw.hanger = pick(r, p.hanger);
  if (p.tint && r() < 0.7) raw.tint = pick(r, p.tint);
  if (p.glow && r() < p.glow) raw.glow = pick(r, GLOW_COLORS).color;
  if (kind === 'snackwagen') {
    raw.awning = pick(r, ['zon', 'bos', 'roze', 'stock']);
    raw.display = pick(r, ['bord', 'tafel', 'vlaggen', 'none']);
    raw.beacon = pick(r, ['bak', 'ring', 'none']);
    raw.air = pick(r, ['damp', 'geur', 'bijtjes', 'none']);
    raw.snackName = pick(r, idsOf('snackName').filter((x) => x !== 'none'));
  }
  if (ctx.noGlow) delete raw.glow;
  return { look: sanitizeLook(raw, kind), bodyColor, style };
}

// Kleine hulp: de zaad uit een tekst of getal (stabiel over runs).
export function seedOf(...parts) {
  let h = 2166136261;
  for (const s of parts) for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// --- de speler-opdrachten: stap voor stap bouwen -------------------------------------------------
// Een nieuwe look met één veld gezet (null = terug naar de standaard). Geeft null als het niet past of niet kan.
export function withField(look, field, value, kind = 'auto') {
  if (!LOOK_FIELDS.includes(field) || !fieldsFor(kind).includes(field)) return null;
  const next = { ...sanitizeLook(look, kind) };
  if (value == null || value === defaultOf0(field)) delete next[field];
  else next[field] = value;
  const clean = sanitizeLook(next, kind);
  if (value != null && value !== defaultOf0(field) && clean[field] === undefined) return null; // onzinwaarde
  return clean;
}
function defaultOf0(field) { return ENUMS.includes(field) ? defaultOf(field) : null; }

// Hoeveel velden van de look staan op "iets anders dan standaard" (voor 'Hele show' en de HUD).
export const lookDepth = (look) => Object.keys(look || {}).length;

// Een versie van de look zonder de dingen die 's nachts anders zijn (voor de preview overdag).
export const hasGlow = (look) => !!(look && look.glow);

// Presets ('builds'): { naam, code }. De naam is hoogstens 16 tekens, schoon.
export function cleanBuildName(s) {
  const t = typeof s === 'string' ? s.replace(/[^\p{L}\p{N} '\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16) : '';
  return t || 'Mijn build';
}
