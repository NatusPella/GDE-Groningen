// De centrale onthulregel van het menu (22-11, docs/MENU-ONTHULLING-22-11.md): wat de speler in het pauzemenu, op de kaart en in de activiteiten
// ziet, volgt uit wat het verhaal hem al liet tegenkomen. Besluit eigenaar (21-11): aktes ontgrendelen werelden; bijbanen en loopbanen (voetbal,
// landbouw en Bezit, de snackwagen) pas via het verhaal. Een nieuwe save begint dus met een kaal menu; een verborgen onderdeel is er niet (geen
// slotje, geen naam: geen spoilers). Bestaande saves verliezen niets (de poort van unlockgate.js leest een save zonder poort als "alles open").
//
// Puur op de poort na: de bron (`open(wereld)` en `owns(wereld)`) wordt van buiten gezet (setRevealSource), zodat de test hem vervangt. Zonder bron
// staat alles open (andere contexten, dev). Een wereld staat open als de poort hem opent OF de speler er al iets van heeft (een perceel, een
// club: de begincutscenes van careerdebut.js zetten daar de vlaggen voor); niets wat de speler al heeft verdwijnt.
// Samen spelen: de bron leest de eigen verhaalstand van deze speler (#429), dus een gast ziet wat hij zelf ontgrendelde.
// Test: scripts/featurereveal_test.mjs.

// Welke wereld (unlockgate.js) welk onderdeel opent.
export const WORLD = { land: 'farm', panden: 'bezit', snack: 'snackwagen', voetbal: 'voetbal', vissen: 'hengelen' };

let source = { open: () => true, owns: () => false };
export function setRevealSource(s) {
  source = {
    open: s && typeof s.open === 'function' ? s.open : () => true,
    owns: s && typeof s.owns === 'function' ? s.owns : () => false,
  };
}
export const resetRevealSource = () => setRevealSource(null);

// Is een wereld voor deze speler zichtbaar? Een falende bron sluit nooit (liever te veel dan een kapot menu).
export function revealOpen(world) {
  try { if (source.owns(world)) return true; } catch (e) { /* bron nog niet klaar */ }
  try { return !!source.open(world); } catch (e) { return true; }
}

// Onderdelen van Land en bedrijf (de menusectie 'boerderij') en welke wereld ze opent. Overzicht staat zodra een van de vijf open is.
const PROPERTY_SUBS = { boerderij: 'land', bedrijven: 'panden', tekoop: 'panden', snack: 'snack', club: 'voetbal' };
const propertyAny = () => Object.values(PROPERTY_SUBS).some((k) => revealOpen(WORLD[k]));

// De secties van het menu die niet altijd staan. Alles wat hier niet staat staat altijd.
const SECTION_RULE = {
  boerderij: propertyAny,
  voetbal: () => revealOpen(WORLD.voetbal),
  visboek: () => revealOpen(WORLD.vissen),
};
export const sectionVisible = (id) => (SECTION_RULE[id] ? SECTION_RULE[id]() : true);

// Tabbladen binnen een sectie. Alleen Land en bedrijf heeft er die verborgen kunnen zijn.
export function subVisible(section, sub) {
  if (section !== 'boerderij') return true;
  if (sub === 'overzicht') return propertyAny();
  const key = PROPERTY_SUBS[sub];
  return key ? revealOpen(WORLD[key]) : true;
}

// Kaartlagen en plekken (mapview.js): welke kaartsoorten wachten op het verhaal.
const MARKER_RULE = { percelen: 'land', tekoop: 'land', standplaats: 'snack', voetbalclub: 'voetbal' };
export const markerVisible = (layer) => (MARKER_RULE[layer] ? revealOpen(WORLD[MARKER_RULE[layer]]) : true);

// Activiteiten (activities.js) die bij een loopbaan of een wereld horen en dus pas na het verhaal meedoen.
const ACTIVITY_RULE = { voetbaltraining: 'voetbal', snackketen: 'snack' };
export const activityVisible = (id) => (ACTIVITY_RULE[id] ? revealOpen(WORLD[ACTIVITY_RULE[id]]) : true);

// ---- de onthulmelding ----
// Eenmaal per onderdeel en per speler; de lijst `told` hoort bij de speler (bezit.x.menuTold). Rustig: de meldingenwachtrij (notifyqueue.js,
// soort 'unlock') laat hem pas zien als niets anders in beeld is, en gaat nooit verloren.
export const ITEMS = [
  { id: 'land', world: WORLD.land, section: 'boerderij', menu: 'Land en bedrijf' },
  { id: 'panden', world: WORLD.panden, section: 'boerderij', menu: 'Land en bedrijf', sub: 'Bedrijven en Te koop' },
  { id: 'snack', world: WORLD.snack, section: 'boerderij', menu: 'Land en bedrijf', sub: 'Snackwagen' },
  { id: 'voetbal', world: WORLD.voetbal, section: 'voetbal', menu: 'Loopbanen', sub: 'Voetbal' },
  { id: 'vissen', world: WORLD.vissen, section: 'visboek', menu: 'Loopbanen', sub: 'Visboek' },
];
export const ITEM_IDS = ITEMS.map((i) => i.id);

// Wat nu open is en nog niet gemeld: { told: de nieuwe lijst, notes: [tekst] }. Binnen een sectie die voor het eerst opengaat komt een melding
// ("Nieuw in je menu: Land en bedrijf"); gaat later een tak van die sectie open, dan noemt de melding die tak.
export function nextReveals(told = []) {
  const had = new Set(Array.isArray(told) ? told.filter((x) => typeof x === 'string') : []);
  const fresh = ITEMS.filter((i) => !had.has(i.id) && revealOpen(i.world));
  const notes = [];
  const before = new Set(ITEMS.filter((i) => had.has(i.id)).map((i) => i.section));
  const batch = new Set();
  for (const i of fresh) {
    if (!before.has(i.section)) {
      if (batch.has(i.section)) continue;                 // alles tegelijk: een melding per sectie
      batch.add(i.section);
      notes.push(`Nieuw in je menu: ${i.sub && i.menu === 'Loopbanen' ? `${i.sub} (bij ${i.menu})` : i.menu}`);
    } else if (i.sub) notes.push(`Nieuw bij ${i.menu}: ${i.sub}`);
  }
  return { told: [...had, ...fresh.map((i) => i.id)], notes };
}

// Migratie: een speler zonder lijst op een oude save (poort "alles open") krijgt alles meteen te zien, zonder melding: de lijst wordt gevuld met wat open is.
export function migrateTold(told, legacy) {
  if (Array.isArray(told)) return { told, silent: false };
  if (!legacy) return { told: [], silent: false };
  return { told: ITEMS.filter((i) => revealOpen(i.world)).map((i) => i.id), silent: true };
}
