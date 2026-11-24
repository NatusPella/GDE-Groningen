// Van een bestaande look (buildPersonMesh-opties: shirt, skin, hair, variant, pants, shoes, hairStyle, look.top/bottom/shoeType/hat,
// character) naar een modulaire look (modularpeople.js, ADR 0052): welk hoofd, welke romp, benen en voeten van de rig, in welke
// kleuren, en een pet als die erbij hoort. Zo houden Tammo, Tessa, Jelle en de bijrollen hun kleding-identiteit op de nieuwe mensen.
// Pure data en logica, zonder three.js. Ontbreekt een deel in de rig, dan kiest de mapper het eerstvolgende uit de lijst.

// Per rig: per kledingsoort de delen in volgorde van voorkeur (deel-id's uit game/models/mensen/<rig>.json).
// Dekt de hele kledingcatalogus (clothing.js KIND_LOOK: top, bottom, shoeType, hat; clothinghair.js HAIR_STYLE_IDS); scripts/modularlooks_test.mjs
// controleert dat elk stuk, elk kapsel en elk lichaam een geldige modulaire look geeft.
const MAN_SHORT = ['Casual2_Head', 'Suit_Head'], MAN_CURLY = ['Beach_Head', 'Casual_Head'], MAN_LONG = ['Casual_Head', 'Beach_Head'];
const VR_LONG = ['Casual_Head', 'Suit_Head'], VR_SHORT = ['Formad_Head', 'Casual_Head'];
export const PART_MAP = {
  man: {
    hoofd: { short: MAN_SHORT, buzz: ['Suit_Head', 'Casual2_Head'], bald: ['Suit_Head'], quiff: MAN_SHORT, undercut: MAN_SHORT, fringe: MAN_SHORT,
      curly: MAN_CURLY, afro: MAN_CURLY, wavy: MAN_CURLY, long: MAN_LONG, ponytail: MAN_LONG, braid: MAN_LONG, bun: MAN_LONG, pigtails: MAN_LONG,
      bob: MAN_LONG, pixie: MAN_SHORT, mohawk: ['Punk_Head'], default: ['Casual2_Head'] },
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
const CAPS = new Set(['cap', 'tammo', 'beanie', 'flatcap', 'police']);
// het blauw van het uniform (zelfde tint als models3d_people.js COP_NAVY)
export const COP_NAVY = 0x1d2433;

const pick = (rigParts, list) => { for (const id of list) if (rigParts.has(id)) return id; return null; };

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
  const choose = (slot, kind) => pick(ids, [...((kind && M[slot][kind]) || []), ...M[slot].default]) || [...ids].find((id) => id.endsWith(slot === 'benen' ? '_Legs' : slot === 'voeten' ? '_Feet' : slot === 'hoofd' ? '_Head' : '_Body'));
  const parts = { hoofd: choose('hoofd', hairStyle), romp: choose('romp', top), benen: choose('benen', bottom), voeten: choose('voeten', shoe) };
  if (!parts.hoofd || !parts.romp || !parts.benen || !parts.voeten) return null;
  const hat = a.character === 'tammo' ? 'tammo' : cop ? 'police' : L.hat;
  return {
    seed: a.seed ?? 1, rig, parts,
    skin: a.skin ?? 0xd9a47a, shirt: cop ? COP_NAVY : L.topColor ?? a.shirt ?? null, hair: a.hair ?? 0x3b2a1e, pants: cop ? COP_NAVY : a.pants ?? 0x2f3b52,
    wear: cop ? ['politiepet', 'politieuniform'] : null,
    cap: CAPS.has(hat) ? hat : null, capColor: a.character === 'tammo' ? (a.cap ?? 0xc8621e) : (L.hatColor ?? L.capColor ?? 0x2b2f36),
    old: L.age === 'old', scale: null, body: a.body || null,
  };
}
