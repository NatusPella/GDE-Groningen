// Voetbalkleding (22-11, docs/VOETBALKLEDING-22-11.md): de niveau-tabel en het bouwen van een tenue uit gewone kledingstukken. Puur: geen three, geen DOM,
// alleen clothingdata.js (scripts/voetbalkleding_test.mjs). Een tenue is een worn-map (slot -> stuk, zoals elke outfit) plus kleine extra's die alleen
// de eigen speler en de wedstrijdfiguren tekenen (rugnummer, sponsorplek); op het netwerk reist alleen de gewone outfit-code mee.
//
// De tabel hieronder is de enige plek waar het niveau bepaalt wat je draagt: stukkenset, kleurregels, sponsorplek, schoentype en nummerstijl.
// Het niveau volgt de klasse van de club (footballkit.js): Talentenklasse = amateur, Terpklasse = semi-pro, Kroonklasse = pro, Waddenbeker = topniveau.
import { ITEM_BY_ID, KIT_COLORS, KIT_PAIR, KIT_PATTERNS, PALETTE, colorHex, parsePiece } from './clothingdata.js';

export const LEVEL_IDS = ['straat', 'amateur', 'semipro', 'pro', 'top'];
// shoe: item en kleur; patterns: welke patronen de club mag dragen (de eerste is de terugval); number: stijl van het rugnummer;
// name: achternaam boven het nummer; sponsor: geen | lokaal | sponsor | groot; guards: scheenbeschermers zichtbaar; band: aanvoerdersband bij een kapitein;
// keeper: eigen keepersset (shirt, handschoenen); third: een derde tenue (speciale editie); fabric: de omschrijving voor het Club-scherm.
export const KIT_LEVELS = {
  straat: { naam: 'Straatvoetbal', shoe: ['noppen_basis', 'zwart'], patterns: ['effen'], number: 'geen', name: false, sponsor: 'geen', guards: false, band: false, keeper: false, third: false, fabric: 'Een neutrale trainingsset: grijs shirt, donker broekje' },
  amateur: { naam: 'Amateur', shoe: ['noppen_basis', 'zwart'], patterns: ['effen'], number: 'hand', name: false, sponsor: 'lokaal', sponsorShare: 0.5, guards: false, band: false, keeper: true, third: false, fabric: 'Simpel katoenen shirt in één kleur, een handgeschreven nummer en eenvoudige schoenen' },
  semipro: { naam: 'Semi-prof', shoe: ['noppen_semi', 'zwart'], patterns: ['effen', 'brede-streep', 'helften', 'smalle-streep'], number: 'rug', name: true, sponsor: 'lokaal', sponsorShare: 1, guards: true, band: true, keeper: true, third: false, fabric: 'Rugnummer en naam, de sponsor van een lokaal bedrijf en betere schoenen' },
  pro: { naam: 'Prof', shoe: ['noppen_pro', 'zwart'], patterns: ['effen', 'brede-streep', 'helften', 'smalle-streep', 'hoepels'], number: 'techniek', name: true, sponsor: 'sponsor', guards: true, band: true, keeper: true, third: false, fabric: 'Modern technisch shirt met patroon, het sponsorpaneel, rugnummer en achternaam, snelle schoenen' },
  top: { naam: 'Topniveau', shoe: ['noppen_top', 'geel'], patterns: ['effen', 'brede-streep', 'helften', 'smalle-streep', 'hoepels', 'kruis'], number: 'speciaal', name: true, sponsor: 'groot', guards: true, band: true, keeper: true, third: true, fabric: 'Speciale editie met groot sponsorpaneel, een derde tenue en opvallende schoenen' },
};
export const levelOrder = (id) => Math.max(0, LEVEL_IDS.indexOf(id));
// Klasse van de competitie (voetbalseason.js DIV_ORDER plus 'europa' en 'pool') naar het kitniveau
export const DIVISION_LEVEL = { talent: 'amateur', pool: 'amateur', terp: 'semipro', kroon: 'pro', europa: 'top' };
export const levelOfDivision = (division) => DIVISION_LEVEL[division] || 'amateur';
export const levelName = (id) => (KIT_LEVELS[id] || KIT_LEVELS.amateur).naam;

// Verzonnen lokale sponsors (amateur en semi-prof): geen echte merken. Het sponsorpaneel in beeld is een gekleurd vlak zonder letters; de naam staat in het Club-scherm.
export const LOCAL_SPONSORS = ['Bakkerij De Gouden Korst', 'Garage Rondje Om', 'Tuincentrum Groene Duim', 'Café De Derde Helft', 'Dakdekker Boven Water', 'Slagerij Worst Case'];
export const SPONSOR_COLORS = [0xe0701e, 0x2f6fb5, 0xc9a227, 0x2e9e5b, 0xc13a2e, 0x6a4a8a, 0x2a9d9a];

// Kleuren: een tenue gebruikt alleen paletkleuren uit KIT_COLORS. Een club heeft zijn kleuren als hex (voetbalclubs.js): de dichtstbijzijnde paletkleur.
const rgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
export function nearestKitColor(hex, allowed = KIT_COLORS) {
  const a = rgb(hex >>> 0);
  let best = allowed[0], bd = Infinity;
  for (const id of allowed) {
    const b = rgb(colorHex(id)), d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
    if (d < bd) { bd = d; best = id; }
  }
  return best;
}
export const pairOf = (color) => KIT_PAIR[color] || 'wit';

// Patroon van de club binnen wat het niveau toestaat: een dorpsclub speelt effen, een topclub heeft alles.
export const patternKey = (pattern) => Object.keys(KIT_PATTERNS).find((k) => KIT_PATTERNS[k] === pattern) || 'effen';
export function levelPattern(pattern, level) {
  const L = KIT_LEVELS[level] || KIT_LEVELS.amateur;
  return L.patterns.includes(pattern) ? pattern : L.patterns[0];
}
export const shirtItemFor = (patternId, long = false) => `voetbalshirt${long ? '_lang' : ''}_${patternKey(patternId)}`;
// Welk patroon draagt dit shirtstuk, en in welke kleuren? null als het geen voetbalshirt is (keepersshirt en trainingsjack zijn effen)
export function kitShirtSpec(piece) {
  const x = typeof piece === 'string' ? parsePiece(piece) : piece;
  if (!x) return null;
  const m = /^voetbalshirt(?:_lang)?_([a-z]+)$/.exec(x.item.id);
  if (!m) return null;
  const pattern = KIT_PATTERNS[m[1]];
  const c2 = pairOf(x.color);
  return { pattern, c1: x.color, c2, hex1: colorHex(x.color), hex2: colorHex(c2) };
}

// Een deterministische hash (zelfde uitkomst op elke client, zonder netwerk)
export function hashStr(str) {
  let h = 2166136261 >>> 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  h ^= h >>> 15; h = Math.imul(h, 2246822507) >>> 0; h ^= h >>> 13; h = Math.imul(h, 3266489909) >>> 0; h ^= h >>> 16;
  return h >>> 0;
}
export const sponsorColor = (name) => SPONSOR_COLORS[hashStr(name) % SPONSOR_COLORS.length];

// Welke sponsor staat er op het shirt? clubId bepaalt een lokale sponsor; de sponsorlijst uit het sponsorsysteem (voetbalsponsors.js, namen van het Bezit-systeem) gaat voor.
export function sponsorFor(level, { clubId = '', sponsors = [] } = {}) {
  const L = KIT_LEVELS[level] || KIT_LEVELS.amateur;
  if (L.sponsor === 'geen') return null;
  if (L.sponsor === 'lokaal') {
    const h = hashStr(`sponsor|${clubId}`);
    if (L.sponsorShare < 1 && (h % 100) / 100 >= L.sponsorShare) return null;   // sommige dorpsclubs hebben nog geen sponsor
    const name = LOCAL_SPONSORS[(h >>> 8) % LOCAL_SPONSORS.length];
    return { name, color: sponsorColor(name), size: 'klein', lokaal: true };
  }
  const name = (sponsors && sponsors[0]) || LOCAL_SPONSORS[hashStr(`sponsor|${clubId}`) % LOCAL_SPONSORS.length];
  return { name, color: sponsorColor(name), size: L.sponsor === 'groot' ? 'groot' : 'normaal', lokaal: false };
}

// Het tenue. spec: { color, color2?, pattern, level, role ('veld' | 'keeper'), variant ('thuis' | 'uit' | 'derde'), long, captain, mode ('wedstrijd' | 'training' | 'intro'),
// number, name, clubId, sponsors, shorts, socks, keeperColor }. Geeft { worn, extras, level, variant, note }.
export function kitWorn(spec = {}) {
  const level = KIT_LEVELS[spec.level] ? spec.level : 'amateur';
  const L = KIT_LEVELS[level];
  const mode = spec.mode || 'wedstrijd';
  const role = spec.role === 'keeper' ? 'keeper' : 'veld';
  let variant = spec.variant || 'thuis';
  if (variant === 'derde' && !L.third) variant = 'uit';
  const base = KIT_COLORS.includes(spec.color) ? spec.color : 'grijs';
  const shortsColor = KIT_COLORS.includes(spec.shorts) ? spec.shorts : (KIT_COLORS.includes(spec.color2) ? spec.color2 : pairOf(base));
  const worn = {};
  let shirtColor = base, pattern = levelPattern(spec.pattern || 'effen', level);
  if (level === 'straat') { shirtColor = 'grijs'; pattern = 'effen'; }
  if (variant === 'uit') { shirtColor = pairOf(base); pattern = 'effen'; }            // uit: effen in de andere clubkleur
  if (variant === 'derde') { shirtColor = base === 'zwart' ? 'wit' : 'zwart'; pattern = 'kruis'; }
  const long = !!spec.long;
  if (mode === 'training' || mode === 'intro') pattern = 'effen';
  if (role === 'keeper') {
    shirtColor = KIT_COLORS.includes(spec.keeperColor) ? spec.keeperColor : 'geel';
    worn.top = `keepersshirt.${['geel', 'mosterd', 'oranje', 'knalroze', 'turquoise', 'groen', 'zwart', 'felrood', 'lichtblauw'].includes(shirtColor) ? shirtColor : 'geel'}`;
    shirtColor = parsePiece(worn.top).color;
    pattern = 'effen';
  } else {
    worn.top = `${shirtItemFor(pattern, long)}.${shirtColor}`;
  }
  const bottomColor = level === 'straat' ? 'antraciet' : role === 'keeper' ? (shirtColor === 'zwart' ? 'antraciet' : 'zwart') : (variant === 'uit' ? base : shortsColor);
  worn.bottom = `voetbalbroekje.${bottomColor}`;
  const sockColor = level === 'straat' ? 'grijs' : role === 'keeper' ? shirtColor : (variant === 'uit' ? base : (pattern === 'effen' && level === 'amateur' ? shirtColor : shortsColor));
  worn.legs = `voetbalsokken.${KIT_COLORS.includes(sockColor) ? sockColor : 'wit'}`;
  if (L.guards && mode !== 'intro') worn.guard = 'scheenbeschermers.zwart';
  const [shoeItem, shoeColor] = L.shoe;
  worn.shoes = `${shoeItem}.${shoeColor}`;
  if (role === 'keeper' && L.keeper && mode !== 'intro') worn.hands = 'keepershandschoenen.geel';
  if (spec.captain && L.band && role === 'veld' && mode === 'wedstrijd') worn.wrist = `aanvoerdersband.${shirtColor === 'geel' ? 'oranje' : 'geel'}`;
  if (mode === 'training') {
    // het opwarmhesje over het effen shirt: opvallend, een andere kleur dan het shirt
    const bib = ['oranje', 'geel', 'mint', 'knalroze'].find((c) => c !== shirtColor) || 'oranje';
    worn.outer = `opwarmhesje.${bib}`;
    delete worn.guard;
  }
  if (mode === 'intro') {
    // het trainingspak van de club: jack in de clubkleur, broek in de tweede kleur (of donker), schoenen van de club
    worn.outer = `trainingsjack.${base}`;
    worn.top = `${shirtItemFor('effen', false)}.${pairOf(base)}`;
    worn.bottom = `trainingsbroek.${base === 'antraciet' ? 'zwart' : 'antraciet'}`;
    delete worn.legs; delete worn.guard;
    worn.shoes = 'noppen_basis.zwart';
  }
  const showNumber = L.number !== 'geen' && mode === 'wedstrijd';
  const extras = {
    pattern, level, variant, role,
    number: showNumber ? Math.max(1, Math.min(99, spec.number | 0 || 1)) : 0,
    numberStyle: L.number, nameBar: showNumber && L.name && !!spec.name,
    sponsor: mode === 'wedstrijd' && role === 'veld' ? sponsorFor(level, { clubId: spec.clubId, sponsors: spec.sponsors }) : null,
  };
  return { worn, extras, level, variant, role, mode, note: `${levelName(level)}: ${L.fabric}` };
}

// De vorm van het patroon als vakken op de romp (clothing.outfitToLook -> models3d_people.attachShirtBands). 4 rijen hoog (SHIRT_BAND_Y), 8 stukken breed.
// bands: delen van de breedte over alle rijen; cells: [rij, t0, t1] voor een enkele rij. Effen heeft niets.
export function patternGeometry(pattern) {
  const eight = (row) => Array.from({ length: 8 }, (_, i) => [row, i / 8, (i + 1) / 8]);
  switch (pattern) {
    case 'brede-streep': return { bands: [[0.25, 0.5], [0.75, 1]], cells: [] };
    case 'smalle-streep': return { bands: [1, 3, 5, 7].map((i) => [i / 8, (i + 1) / 8]), cells: [] };
    case 'helften': return { bands: [[0.5, 1]], cells: [] };
    case 'hoepels': return { bands: [], cells: [...eight(1), ...eight(3)] };
    case 'kruis': return { bands: [[0.4375, 0.5625]], cells: [...[0, 1, 2].map((i) => [2, i / 8, (i + 1) / 8]), [2, 0.375, 0.4375], [2, 0.5625, 0.625], ...[5, 6, 7].map((i) => [2, i / 8, (i + 1) / 8])] };
    default: return null;
  }
}

// Een voetballer als NPC (rolpool 'voetballer'): één kleur uit het zaad, het niveau uit ctx.level. Dezelfde stukken als de speler; geen netwerk nodig.
export function npcFootballer(seed, ctx = {}, rng = Math.random) {
  const r = typeof rng === 'function' ? rng : Math.random;
  const color = ctx.color && KIT_COLORS.includes(ctx.color) ? ctx.color : KIT_COLORS[Math.floor(r() * KIT_COLORS.length)];
  const level = KIT_LEVELS[ctx.level] ? ctx.level : 'amateur';
  const pats = KIT_LEVELS[level].patterns;
  const pattern = ctx.pattern ? levelPattern(ctx.pattern, level) : pats[Math.floor(r() * pats.length)];
  const k = kitWorn({ color, pattern, level, role: ctx.role === 'keeper' ? 'keeper' : 'veld', variant: ctx.variant || 'thuis', mode: ctx.mode || 'wedstrijd', number: ctx.number || 1 + (hashStr(`nr|${seed}`) % 30), clubId: ctx.clubId || '', long: ctx.long });
  return k;
}

export { ITEM_BY_ID, PALETTE };
