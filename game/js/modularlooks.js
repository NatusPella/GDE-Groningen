// Van een bestaande look (buildPersonMesh-opties: shirt, skin, hair, variant, pants, shoes, hairStyle, look.top/bottom/shoeType/hat,
// character) naar een modulaire look (modularpeople.js, ADR 0052): welk hoofd, welke romp, benen en voeten van de rig, in welke
// kleuren, en een pet als die erbij hoort. Zo houden Tammo, Tessa, Jelle en de bijrollen hun kleding-identiteit op de nieuwe mensen.
// Pure data en logica, zonder three.js. Ontbreekt een deel in de rig, dan kiest de mapper het eerstvolgende uit de lijst.

// Per rig: per kledingsoort de delen in volgorde van voorkeur (deel-id's uit game/models/mensen/<rig>.json).
export const PART_MAP = {
  man: {
    hoofd: { short: ['Casual2_Head', 'Suit_Head'], buzz: ['Suit_Head', 'Casual2_Head'], long: ['Casual_Head', 'Beach_Head'], curly: ['Beach_Head', 'Casual_Head'], bald: ['Suit_Head'], default: ['Casual2_Head'] },
    romp: { blazer: ['Suit_Body'], suit: ['Suit_Body'], coat: ['Suit_Body'], jacket: ['Casual_Body'], hoodie: ['Casual_Body'], cardigan: ['Casual2_Body'], tshirt: ['Casual2_Body'], shirt: ['Casual2_Body'], swim: ['Beach_Body'], default: ['Casual2_Body'] },
    benen: { jeans: ['Casual_Legs', 'Casual2_Legs'], trousers: ['Suit_Legs'], shorts: ['Beach_Legs'], skirt: ['Suit_Legs'], swim: ['Beach_Legs'], default: ['Casual2_Legs', 'Casual_Legs'] },
    voeten: { sneaker: ['Casual2_Feet', 'Casual_Feet'], leather: ['Suit_Feet'], boot: ['Worker_Feet'], sandal: ['Beach_Feet'], default: ['Casual_Feet'] },
  },
  vrouw: {
    hoofd: { long: ['Casual_Head', 'Suit_Head'], bun: ['Adventurer_Head'], short: ['Formad_Head', 'Casual_Head'], curly: ['Formad_Head'], default: ['Casual_Head'] },
    romp: { blazer: ['Suit_Body'], suit: ['Suit_Body'], coat: ['Formal_Body', 'Suit_Body'], jacket: ['Casual_Body'], hoodie: ['Casual_Body'], cardigan: ['Casual_Body'], tshirt: ['Casual_Body'], default: ['Casual_Body'] },
    benen: { jeans: ['Casual_Legs'], trousers: ['Suit_Legs', 'Formal_Legs'], skirt: ['Formal_Legs'], shorts: ['Casual_Legs'], default: ['Casual_Legs'] },
    voeten: { sneaker: ['Casual_Feet'], leather: ['Suit_Feet', 'Formal_Feet'], boot: ['Adventurer_Feet', 'Worker_Feet'], default: ['Casual_Feet'] },
  },
};
// Hoeden die als pet op het hoofd komen (modularpeople.js bouwt een lage koepel met klep op het hoofdbot).
const CAPS = new Set(['cap', 'tammo', 'beanie', 'flatcap', 'police']);

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
  let top = L.top || (a.character === 'tammo' ? 'jacket' : a.character === 'anita' ? 'coat' : null);
  let bottom = L.bottom || (a.character ? 'jeans' : null);
  let shoe = L.shoeType || (a.character === 'tammo' ? 'sneaker' : a.character === 'anita' ? 'boot' : null);
  const hairStyle = a.hairStyle || L.hairStyle || null;
  const choose = (slot, kind) => pick(ids, [...((kind && M[slot][kind]) || []), ...M[slot].default]) || [...ids].find((id) => id.endsWith(slot === 'benen' ? '_Legs' : slot === 'voeten' ? '_Feet' : slot === 'hoofd' ? '_Head' : '_Body'));
  const parts = { hoofd: choose('hoofd', hairStyle), romp: choose('romp', top), benen: choose('benen', bottom), voeten: choose('voeten', shoe) };
  if (!parts.hoofd || !parts.romp || !parts.benen || !parts.voeten) return null;
  const hat = a.character === 'tammo' ? 'tammo' : L.hat;
  return {
    seed: a.seed ?? 1, rig, parts,
    skin: a.skin ?? 0xd9a47a, shirt: L.topColor ?? a.shirt ?? null, hair: a.hair ?? 0x3b2a1e, pants: a.pants ?? 0x2f3b52,
    cap: CAPS.has(hat) ? hat : null, capColor: a.character === 'tammo' ? (a.cap ?? 0xc8621e) : (L.hatColor ?? L.capColor ?? 0x2b2f36),
    old: L.age === 'old', scale: null,
  };
}
