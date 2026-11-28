// Van een bestaande look (buildPersonMesh-opties: shirt, skin, hair, variant, pants, shoes, hairStyle, look.top/bottom/shoeType/hat,
// character) naar een modulaire look (modularpeople.js, ADR 0052): welk hoofd, welke romp, benen en voeten van de rig, in welke
// kleuren, en een pet als die erbij hoort. Zo houden Tammo, Tessa, Jelle en de bijrollen hun kleding-identiteit op de nieuwe mensen.
// Pure data en logica, zonder three.js. Ontbreekt een deel in de rig, dan kiest de mapper het eerstvolgende uit de lijst.

// Per rig: per kledingsoort de delen in volgorde van voorkeur (deel-id's uit game/models/mensen/<rig>.json).
// Dekt de hele kledingcatalogus (clothing.js KIND_LOOK: top, bottom, shoeType, hat; clothinghair.js HAIR_STYLE_IDS); scripts/modularlooks_test.mjs
// controleert dat elk stuk, elk kapsel en elk lichaam een geldige modulaire look geeft.
// Casual2_Head heeft een paardenstaart in het pack (haar tot 12 cm achter en 11 cm onder de kruin): een kort kapsel krijgt hem dus niet (Tammo had ineens een staart, #1351)
const MAN_SHORT = ['Suit_Head', 'Casual_Head', 'Beach_Head'], MAN_CURLY = ['Beach_Head', 'Casual_Head'], MAN_LONG = ['Casual_Head', 'Beach_Head'];
const VR_LONG = ['Casual_Head', 'Suit_Head', 'Formad_Head'], VR_SHORT = ['Formad_Head', 'Casual_Head', 'Suit_Head'];
export const PART_MAP = {
  man: {
    hoofd: { short: MAN_SHORT, buzz: ['Suit_Head', 'Casual_Head'], bald: ['Suit_Head', 'Worker_Head'], quiff: MAN_SHORT, undercut: MAN_SHORT, fringe: MAN_SHORT,
      curly: MAN_CURLY, afro: MAN_CURLY, wavy: MAN_CURLY, long: MAN_LONG, ponytail: MAN_LONG, braid: MAN_LONG, bun: MAN_LONG, pigtails: MAN_LONG,
      bob: MAN_LONG, pixie: MAN_SHORT, mohawk: ['Punk_Head'], default: ['Suit_Head', 'Casual_Head', 'Beach_Head', 'Casual2_Head'] },
    romp: { police: ['Suit_Body'], blazer: ['Suit_Body'], suit: ['Suit_Body'], coat: ['Suit_Body'], raincoat: ['Suit_Body'], jacket: ['Casual_Body'], hoodie: ['Casual_Body'],
      sweater: ['Casual_Body'], longsleeve: ['Casual_Body'], cardigan: ['Casual2_Body'], tee: ['Casual2_Body'], tshirt: ['Casual2_Body'], shirt: ['Casual2_Body'],
      dress: ['Casual2_Body'], swim: ['Beach_Body'], default: ['Casual2_Body'] },
    // Casual_Legs (de hoodie-figuur) is een korte broek; een spijkerbroek is Casual2_Legs
    benen: { jeans: ['Casual2_Legs', 'Worker_Legs'], trousers: ['Suit_Legs'], shorts: ['Casual_Legs', 'Beach_Legs'], skirt: ['Suit_Legs'], dress: ['Suit_Legs'], swim: ['Beach_Legs'], default: ['Casual2_Legs'] },
    voeten: { sneaker: ['Casual2_Feet', 'Casual_Feet'], cleat: ['Casual2_Feet', 'Casual_Feet'], leather: ['Suit_Feet'], boot: ['Worker_Feet'], sandal: ['Beach_Feet'], default: ['Casual_Feet'] },
  },
  vrouw: {
    hoofd: { long: VR_LONG, wavy: VR_LONG, ponytail: VR_LONG, pigtails: VR_LONG, braid: VR_LONG, curly: ['Formad_Head', 'Casual_Head'], afro: ['Formad_Head'],
      bun: ['Adventurer_Head'], short: VR_SHORT, bob: VR_SHORT, pixie: VR_SHORT, fringe: VR_SHORT, quiff: VR_SHORT, undercut: VR_SHORT, buzz: VR_SHORT, bald: VR_SHORT,
      mohawk: ['Punk_Head'], default: ['Casual_Head'] },
    // Formal_Body en Casual_Body zijn topjes zonder mouwen; een jas, vest, trui of colbert is Suit_Body (in de kleur van de look)
    romp: { police: ['Suit_Body'], blazer: ['Suit_Body'], suit: ['Suit_Body'], coat: ['Suit_Body'], raincoat: ['Suit_Body'], jacket: ['Suit_Body'], hoodie: ['Suit_Body'], sweater: ['Suit_Body'],
      longsleeve: ['Suit_Body'], cardigan: ['Suit_Body'], tee: ['Casual_Body'], tshirt: ['Casual_Body'], top: ['Formal_Body'], dress: ['Formal_Body'], default: ['Casual_Body'] },
    benen: { jeans: ['Casual_Legs'], trousers: ['Suit_Legs', 'Formal_Legs'], skirt: ['Formal_Legs'], dress: ['Formal_Legs'], shorts: ['Casual_Legs'], default: ['Casual_Legs'] },
    voeten: { sneaker: ['Casual_Feet'], cleat: ['Casual_Feet'], leather: ['Suit_Feet', 'Formal_Feet'], boot: ['Adventurer_Feet', 'Worker_Feet'], default: ['Casual_Feet'] },
  },
};
// Hoeden die als pet op het hoofd komen (modularpeople.js bouwt een lage koepel met klep op het hoofdbot).
// Kapsels die het pack niet als hoofd heeft: ze komen als staart, vlecht of knot op het hoofdbot (modularpeople.js tailGeometry).
const TAIL_KINDS = new Set(['ponytail', 'braid', 'pigtails', 'bun']);
const CAPS = new Set(['cap', 'tammo', 'beanie', 'flatcap', 'police']);
// het blauw van het uniform (zelfde tint als models3d_people.js COP_NAVY)
export const COP_NAVY = 0x1d2433;

const hashf = (seed, k) => { const x = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
// Natuurlijke haarkleuren (donkerbruin tot blond en rossig) en huidtinten (licht tot donker, gewogen naar de straat), per zaad.
const HAIRS = [0x2a1d14, 0x3b2a1e, 0x5a3d26, 0x7a5636, 0x9c7a4c, 0xb08f5c, 0xcdb485, 0x93462a, 0x1b1b1d, 0x4a3022];
const TONES = [0xf1cfae, 0xe8c09a, 0xe0b48a, 0xd9a47a, 0xcb946a, 0xb07c54, 0x8f5f3e, 0x6e4a32];
const TONE_W = [1, 1.4, 1.4, 1.2, 0.8, 0.5, 0.35, 0.25];
function pickTone(u) { const tot = TONE_W.reduce((x, y) => x + y, 0); let k = u * tot; for (let i = 0; i < TONES.length; i++) { k -= TONE_W[i]; if (k < 0) return TONES[i]; } return TONES[3]; }
const OLD_HAIR = [0x8a8580, 0xb4afa6, 0xd2cec6, 0x6e6a66];
const pick = (rigParts, list) => { for (const id of list) if (rigParts.has(id)) return id; return null; };

// Eén van de passende delen: de eerste twee zijn de beste (de rest is een minder passende terugval), dus hash over de eerste twee.
const pickVary = (rigParts, list, u, wide) => { const ok = [...new Set(list)].filter((id) => rigParts.has(id)); if (!ok.length) return null; const n = wide ? Math.min(ok.length, 4) : Math.min(ok.length, 2); return ok[Math.floor(u * n) % n]; };
// appearance = wat buildPersonMesh krijgt (een vaste look zoals TAMMO_APPEARANCE of JELLE_LOOK). partIds = Set van de deel-id's van
// de rig (modularpeople.js levert ze). Geeft { rig, parts, skin, shirt, hair, pants, cap, capColor, old } of null als het niet kan.
export function lookFromAppearance(a, partIds) {
  if (!a) return null;
  const L = a.look || {};
  const female = a.variant === 'female';
  const rig = female ? 'vrouw' : 'man';
  const M = PART_MAP[rig];
  const ids = partIds && partIds[rig];
  if (!ids) return null;
  // politie: uniformjas, pantalon en nette schoenen in het blauw van het korps, de politiepet en de uniformdetails (modularwear.js)
  // (het eigen model herkent een agent aan het shirt in het korpsblauw, models3d_people.js COP_BLUE en COP_CAR_BLUE)
  const cop = !a.character && !!(a.cop || L.top === 'police' || a.shirt === 0x1c3fae || a.shirt === 0x1f3f8f);
  let top = cop ? 'police' : L.top || (a.character === 'tammo' ? 'jacket' : a.character === 'anita' ? 'coat' : null);
  let bottom = cop ? 'trousers' : L.bottom || (a.character ? 'jeans' : null);
  let shoe = cop ? 'leather' : L.shoeType || (a.character === 'tammo' ? 'sneaker' : a.character === 'anita' ? 'boot' : null);
  const hairStyle = a.hairStyle || L.hairStyle || (cop && !female ? 'buzz' : null);
  if (L.bottom === 'dress') top = 'dress';
  // a.vary (gewone figuren, geen verhaalfiguur): kies uit de passende delen op het zaad, zodat niet elke 'korte haar' hetzelfde hoofd is
  const SLOT_K = { hoofd: 61, romp: 62, benen: 63, voeten: 64 };
  const choose = (slot, kind) => (a.vary && !cop ? pickVary(ids, [...((kind && M[slot][kind]) || []), ...(slot === 'hoofd' && kind && M[slot][kind] ? [] : M[slot].default)], hashf(a.seed ?? 1, SLOT_K[slot]), slot === 'hoofd') : pick(ids, [...((kind && M[slot][kind]) || []), ...(slot === 'hoofd' && kind && M[slot][kind] ? [] : M[slot].default)])) || [...ids].find((id) => id.endsWith(slot === 'benen' ? '_Legs' : slot === 'voeten' ? '_Feet' : slot === 'hoofd' ? '_Head' : '_Body'));
  const parts = { hoofd: choose('hoofd', hairStyle), romp: choose('romp', top), benen: choose('benen', bottom), voeten: choose('voeten', shoe) };
  if (!parts.hoofd || !parts.romp || !parts.benen || !parts.voeten) return null;
  // voetbalshirt met patroon, rugnummer en sponsor (footballkit.js): het patroon komt als kledingdeel op de romp (modularwear.js)
  const sb = a.shirtBands, kit = sb && ((sb.bands && sb.bands.length) || (sb.cells && sb.cells.length) || sb.number || sb.sponsor) ? sb : null;
  // kleding die het pack mist (modularwear.js): bril, sjaal, rugzak en schoudertas; de kleur komt uit de look
  const extras = kit ? ['voetbalshirt'] : [], wearParams = {};
  if (L.glasses || L.shades) { extras.push('bril'); wearParams.bril = { shades: !!L.shades }; }
  if (L.scarf) { extras.push('sjaal'); wearParams.sjaal = { color: L.scarfColor }; }
  if (L.bag === 'backpack') { extras.push('rugzak'); wearParams.rugzak = { color: L.bagColor }; }
  else if (L.bag === 'shoulder') { extras.push('schoudertas'); wearParams.schoudertas = { color: L.bagColor }; }
  // de hoed van de look gaat voor (een uitgeklede Tammo draagt zijn pet niet); zonder look.hat draagt Tammo zijn eigen pet
  // personen uit een zaad (a.vary) krijgen een eigen kop: haarkleur, huidtint (a.skinVary), kaal, baard, uitdrukking en gezichtsvorm
  const vary = !!a.vary && !cop, sd = a.seed ?? 1;
  let hairColor = a.hair, skinColor = a.skin, mood = a.character ? 'vrolijk' : 'neutraal', faceScale = null;
  if (vary) {
    const old = L.age === 'old';
    if (a.hair == null) hairColor = old ? OLD_HAIR[Math.floor(hashf(sd, 20) * OLD_HAIR.length)] : HAIRS[Math.floor(hashf(sd, 70) * HAIRS.length)];
    if (a.skinVary) skinColor = pickTone(hashf(sd, 71));
    const m = hashf(sd, 72);
    mood = m < 0.5 ? 'neutraal' : m < 0.82 ? 'vrolijk' : 'mokkend';
    faceScale = L.age === 'child' ? null : [0.95 + 0.1 * hashf(sd, 73), 0.96 + 0.1 * hashf(sd, 74), 0.94 + 0.12 * hashf(sd, 75)];
    const style = hairStyle || 'default';
    if (!female && !old && style === 'default' && hashf(sd, 76) < 0.06) hairColor = skinColor;   // kaal: het haar in de kleur van de huid
    const wantBeard = L.facial === 'beard' || L.facial === 'moustache' || L.facial === 'goatee' || (!female && (a.role || !a.look) && L.age !== 'child' && hashf(sd, 77) < 0.17);
    if (wantBeard && !female) { const kind = L.facial === 'moustache' ? 'snor' : L.facial === 'goatee' ? 'sik' : hashf(sd, 78) < 0.55 ? 'baard' : hashf(sd, 78) < 0.8 ? 'snor' : 'sik'; extras.push('baard'); wearParams.baard = { kind, color: hairColor }; }
  }
  const hat = 'hat' in L && !cop ? L.hat : a.character === 'tammo' ? 'tammo' : cop ? 'police' : L.hat;
  return {
    seed: a.seed ?? 1, rig, parts,
    skin: skinColor ?? 0xd9a47a, shirt: cop ? COP_NAVY : L.topColor ?? a.shirt ?? null, hair: a.vary && L.age === 'old' ? OLD_HAIR[Math.floor(hashf(a.seed ?? 1, 20) * OLD_HAIR.length)] : hairColor ?? 0x3b2a1e, pants: cop ? COP_NAVY : a.pants ?? 0x2f3b52,
    wear: cop ? ['politiepet', 'politieuniform'] : extras.length ? extras : null, kit, wearParams: cop ? null : wearParams,
    shoes: a.shoes ?? null,   // schoenkleur uit de kleding (clothing.js outfitToLook), op het voetdeel
    tail: TAIL_KINDS.has(hairStyle) ? hairStyle : null, cap: CAPS.has(hat) ? hat : null, capColor: hat === 'tammo' ? (a.cap ?? L.capColor ?? 0xc8621e) : (L.hatColor ?? L.capColor ?? 0x2b2f36),
    old: L.age === 'old', child: L.age === 'child', scale: null, body: a.body || null, mood, face: faceScale,
  };
}
