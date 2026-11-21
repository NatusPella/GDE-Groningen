// De kapper aan de stoel (epic Autotuning ronde 4, #1155): een dunne adapter tussen het kapsel-menu (shops.js hairSections) en de kapsels van het
// kledingsysteem (clothinghair.js, 17 stijlen in epic-kleding). Dit bestand wijzigt niets aan die data: het leest alleen de lijst die het menu al
// heeft ([[id, label], ...]) en deelt hem in groepen in, zodat 17 kapsels geen muur van knoppen worden. Een stijl die hier niet bekend is
// (een toekomstig kapsel) komt onder "Overig" terecht; een stijl die in de lijst ontbreekt (de oudere 9) valt weg. Puur, zonder three of DOM.
// Test: scripts/kapperkeuze_test.mjs.

// De groepen, in de volgorde van de stoel: de stijl-ids zijn die van clothinghair.js HAIR_STYLE_IDS (append-only).
export const HAIR_GROUPS = [
  { id: 'kort', title: 'Kort', ids: ['short', 'buzz', 'bald', 'pixie', 'quiff', 'undercut', 'mohawk'] },
  { id: 'lang', title: 'Halflang en lang', ids: ['bob', 'fringe', 'wavy', 'long'] },
  { id: 'krul', title: 'Krullen', ids: ['curly', 'afro'] },
  { id: 'op', title: 'Opgestoken en gevlochten', ids: ['bun', 'ponytail', 'pigtails', 'braid'] },
];
const OTHER_GROUP = { id: 'overig', title: 'Overig', ids: [] };

// styles: [[id, label], ...] zoals HAIR_STYLES[personage]. Geeft [{ id, title, items: [[id, label], ...] }] zonder lege groepen.
export function hairGroups(styles) {
  const list = Array.isArray(styles) ? styles.filter((s) => Array.isArray(s) && typeof s[0] === 'string') : [];
  const taken = new Set();
  const out = [];
  for (const g of HAIR_GROUPS) {
    const items = g.ids.map((id) => list.find((s) => s[0] === id)).filter(Boolean);
    items.forEach((s) => taken.add(s[0]));
    if (items.length) out.push({ id: g.id, title: g.title, items });
  }
  const rest = list.filter((s) => !taken.has(s[0]));
  if (rest.length) out.push({ id: OTHER_GROUP.id, title: OTHER_GROUP.title, items: rest });
  return out;
}

// Wat de kapper zegt als hij begint, per soort ingreep (geen stem, alleen een regel in beeld). Geen merken, Nederlands.
export const CUT_LINES = {
  knippen: ['De kapper pakt de schaar en tikt hem twee keer tegen de kam.', 'Knip, knip. De kapper neuriet iets zonder melodie.'],
  tondeuse: ['De tondeuse gaat aan. Je weet niet meer wat er van je hoofd overblijft.', 'Zzzzz. De kapper werkt rustig, van achter naar voren.'],
  kleur: ['De kapper mengt de kleur en zegt dat het ze niet lang duurt.', 'De föhn gaat aan en het ruikt even naar zomer en zeep.'],
};
export const cutKind = (style, colorChanged) => (colorChanged ? 'kleur' : ['bald', 'buzz', 'undercut', 'mohawk'].includes(style) ? 'tondeuse' : 'knippen');
export const cutLine = (style, colorChanged, n = 0) => { const l = CUT_LINES[cutKind(style, colorChanged)]; return l[Math.abs(Math.floor(n)) % l.length]; };
