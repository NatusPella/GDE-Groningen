// Haar (de kapper) in het kledingsysteem: de gegevens. Puur, zonder three of DOM.
//
// Haar is geen slot met een stuk, maar hoort bij de outfit: worn.hair = 'stijl.kleur' (ook in presets, de outfit-code en het
// verhaaloutfit). Het model kent deze stijlen al (models3d_people.js buildHair): geen extra geometrie, het haar blijft een deel van
// de ene rompmesh. De volgorde van stijlen en kleuren is append-only (de outfit-code gebruikt de nummers).
export const HAIR_STYLE_IDS = ['short', 'buzz', 'bald', 'curly', 'afro', 'long', 'bun', 'ponytail', 'bob'];
export const HAIR_COLORS = [
  { id: 'naturel', label: 'Naturel', price: 30 },
  { id: 'zwart', label: 'Ravenzwart', price: 30, hair: 0x1b1716 },
  { id: 'bruin', label: 'Kastanjebruin', price: 30, hair: 0x5a3d26 },
  { id: 'blond', label: 'Strandblond', price: 35, hair: 0xcdb485 },
  { id: 'ros', label: 'Rossig', price: 35, hair: 0x93462a },
  { id: 'grijs', label: 'Grijs-chic', price: 35, hair: 0xb4afa6 },
  { id: 'groen', label: 'Stadjersgroen', price: 55, hair: 0x1e9e56 },
  { id: 'roze', label: 'Knalroze', price: 55, hair: 0xd0457a },
  { id: 'blauw', label: 'Zeeblauw', price: 55, hair: 0x2f6fb0 },
  { id: 'platina', label: 'Platina', price: 45, hair: 0xe6e2d8 },
  { id: 'zonnegeel', label: 'Zonnegeel', price: 50, hair: 0xe0c24a },
];
export const HAIR_COLOR_BY_ID = Object.fromEntries(HAIR_COLORS.map((c) => [c.id, c]));
export const HAIR_STYLES = {
  tammo: [['short', 'Kort en netjes'], ['buzz', 'Tondeuse op 3'], ['curly', 'Krullenbol'], ['bald', 'Kaal en trots'], ['bun', 'Mannenknotje'], ['ponytail', 'Staartje']],
  anita: [['long', 'Lang en los'], ['ponytail', 'Paardenstaart'], ['bun', 'Knotje'], ['bob', 'Bob'], ['curly', 'Krullen'], ['short', 'Kort en pittig'], ['afro', 'Volle krullen']],
};
export const HAIR_STYLE_PRICE = 40;
export const HAIR_STYLE_PRICE_BALD = 25;
export const DEFAULT_HAIR = { tammo: 'short.naturel', anita: 'long.naturel' };
export const hairPrice = (style) => (style === 'bald' ? HAIR_STYLE_PRICE_BALD : HAIR_STYLE_PRICE);

export function parseHair(h) {
  if (typeof h !== 'string') return null;
  const [style, color] = h.split('.');
  if (!HAIR_STYLE_IDS.includes(style) || !HAIR_COLOR_BY_ID[color]) return null;
  return { style, color, hex: HAIR_COLOR_BY_ID[color].hair ?? null };
}

// Het kapsel van een NPC: gewogen per soort (man of vrouw) en een natuurlijke kleur, af en toe een speelse (het is zomer in Grunn).
export const NPC_HAIR = {
  male: [['short', 40], ['buzz', 15], ['curly', 14], ['bald', 8], ['afro', 5], ['long', 6], ['bun', 4], ['ponytail', 4]],
  female: [['long', 30], ['ponytail', 20], ['bun', 14], ['bob', 14], ['curly', 10], ['afro', 5], ['short', 7]],
};
export const NPC_HAIR_COLORS = [['zwart', 26], ['bruin', 32], ['blond', 20], ['ros', 9], ['grijs', 4], ['platina', 3], ['groen', 2], ['roze', 2], ['blauw', 1], ['zonnegeel', 1]];

// Wat Tammo of Tessa zegt als de nieuwe haren er zijn: een korte melding in beeld, geen stem.
export const HAIR_REACTIONS = {
  tammo: [
    'Tammo kijkt in de spiegel en zegt niets. Dat is ook een antwoord.',
    'Tammo: "Voelt als nieuw." Het ziet er precies zo uit.',
    'Tammo draait zijn hoofd een kwartslag. Dat is zijn goedkeuring.',
    'Tammo bekijkt zichzelf drie keer en loopt naar buiten alsof het niks is.',
  ],
  anita: [
    'Tessa: "Plan A was dit kapsel. Plan B ook."',
    'Tessa kijkt in de spiegel en knikt. Zakelijk tevreden.',
    'Tessa: "Rijden, niet praten." Maar eerst nog één blik in de spiegel.',
    'Tessa schudt haar haar los en zegt dat het feitelijk beter zit.',
  ],
};
