// Het hoofdmenu bij de start (ontwerp Spel-UI 24-11): Doorgaan als held met het laatst gespeelde spel, daarna Nieuw spel, Opgeslagen spellen,
// Samen spelen, Instellingen en Afsluiten. Het vervangt de keuzekaart "Hoe wil je spelen?" met dezelfde uitkomst: Doorgaan, Nieuw spel en
// Opgeslagen spellen zijn Alleen spelen (geen netwerk), Samen spelen is Samen. De keuze Hoe pittig moet het zijn? (#1169) blijft bij Nieuw spel.
//
// Puur: geen DOM, geen wereld, geen opslag. De schermlaag staat in launchchoiceui.js (openHoofdmenu); scripts/hoofdmenu_test.mjs draait dit in node.
// Samen spelen: de keuze is lokaal en van elke speler zelf; er gaat niets over het netwerk voor Samen is gekozen (constitutie 4 en 10).

// De rijen. heeftSave: er is een spel om mee door te gaan; desktop: Afsluiten bestaat alleen in de app; aantal: opgeslagen spellen.
export function menuItems({ heeftSave = false, desktop = false, aantal = 0 } = {}) {
  const items = [];
  if (heeftSave) {
    items.push({ id: 'doorgaan', label: 'Doorgaan', uitleg: 'Verder met je laatste spel', icoon: 'hervat', held: true });
    items.push({ id: 'nieuw', label: 'Nieuw spel', uitleg: 'Op een nieuwe plek; je andere spellen blijven staan', icoon: 'nieuw' });
  } else items.push({ id: 'nieuw', label: 'Nieuw spel', uitleg: 'Begin je zomer in Grunn. Je kiest straks hoe pittig het is.', icoon: 'nieuw', held: true });
  // Opgeslagen spellen staat er zodra er een plek in gebruik is (ook als de actieve plek net nieuw en leeg is)
  if (aantal > 0) items.push({ id: 'laden', label: 'Opgeslagen spellen', uitleg: 'Laden, hernoemen of verwijderen', icoon: 'laden', meta: `${aantal} ${aantal === 1 ? 'spel' : 'spellen'}` });
  items.push({ id: 'samen', label: 'Samen spelen', uitleg: 'Speel met vrienden in een eigen, besloten sessie', icoon: 'samen' });
  items.push({ id: 'instellingen', label: 'Instellingen', uitleg: 'Beeld, geluid, besturing en moeilijkheid', icoon: 'instellingen' });
  if (desktop) items.push({ id: 'afsluiten', label: 'Afsluiten', uitleg: 'Sluit het spel', icoon: 'uitgang' });
  return items;
}

// Welke rij heeft de focus als het menu opent: Samen spelen als de speler de vorige keer Samen koos (startKeuze), anders de held.
export function startFocus(items, startKeuze) {
  if (startKeuze === 'samen') { const i = items.findIndex((x) => x.id === 'samen'); if (i >= 0) return i; }
  return 0;
}

// Toetsen. index = de rij met focus. Geeft { focus: i } of { kies: id } of null. Pijlen en WASD lopen door de rijen (rond), 1 tot 9 kiezen een
// rij, Enter en spatie kiezen de rij met focus. Escape en Backspace doen niets: Afsluiten is een rij en het menu is het begin van het spel.
export function menuToets(key, index, items) {
  const n = items.length;
  if (!n) return null;
  const k = String(key);
  if (['ArrowUp', 'ArrowLeft', 'w', 'W', 'a', 'A'].includes(k)) return { focus: (index + n - 1) % n };
  if (['ArrowDown', 'ArrowRight', 's', 'S', 'd', 'D'].includes(k)) return { focus: (index + 1) % n };
  if (k === 'Home') return { focus: 0 };
  if (k === 'End') return { focus: n - 1 };
  if (/^[1-9]$/.test(k)) { const i = Number(k) - 1; return i < n ? { kies: items[i].id } : null; }
  if (k === 'Enter' || k === ' ') return { kies: items[((index % n) + n) % n].id };
  return null;
}

// De uitkomst naar de startvraag (launchchoice.js): alleen 'alleen' of 'samen'. Instellingen en Afsluiten komen niet uit het menu.
export const uitkomstVan = (id) => (id === 'samen' ? 'samen' : ['doorgaan', 'nieuw', 'laden'].includes(id) ? 'alleen' : null);

// Wat Nieuw spel doet voor de boot, zodat de oude saves nooit stuk gaan: zonder save begint het spel gewoon (de boot start zelf een nieuw spel);
// met een save en een vrije plek komt er een verse plek bij (startNewSlot); zonder vrije plek gebeurt er niets en zegt het menu waarom.
export function nieuwSpelPlan({ heeftSave = false, vrijePlek = true } = {}) {
  if (!heeftSave) return { actie: 'direct' };
  return vrijePlek ? { actie: 'nieuwe-plek' } : { actie: 'vol', tekst: 'Alle plekken zijn in gebruik. Verwijder eerst een opgeslagen spel om een nieuw spel te beginnen.' };
}

// Samen spelen (28-11, besluit eigenaar): eerst de opslagkeuze, daarna pas de rest van de stroom (naam, akkoord, Een spel openen of Meedoen).
// Wie host kiest de wereld waarin de anderen meespelen; wie met een code meedoet kiest zijn eigen spel voor zijn eigen geld, voortgang en kleding
// (per speler, #429). Zonder enig opgeslagen spel valt er niets te kiezen: Nieuw spel is dan de keuze (ook voor de gast). Een kapotte of te nieuwe
// save blijft in de lijst zichtbaar maar is niet te kiezen (saveslotsui.js); er wordt nooit iets overschreven: Nieuw spel neemt een vrije plek.
// rol: de laatst gebruikte rol (launchchoice.js rolVoorkeur): 'host' | 'gast' | 'lijst'.
export function samenKeuzePlan({ aantal = 0, rol = 'host' } = {}) {
  if (!(aantal > 0)) return { actie: 'nieuw' };
  const gast = rol === 'gast' || rol === 'lijst';
  return {
    actie: 'kies',
    eyebrow: 'Samen spelen',
    titel: gast ? 'Kies je eigen spel' : 'Kies welke wereld je host',
    loadLabel: 'Dit spel gebruiken',
    hint: 'Host je? Dan spelen de anderen mee in de wereld die je hier kiest. Doe je mee met een code? Dan bewaart dit spel jouw eigen geld, voortgang en kleding. Er wordt niets overschreven: een nieuw spel krijgt een lege plek.',
  };
}

// Wat de boot doet na de keuze: een gekozen plek blijft de plek (markStay), Nieuw spel volgt dezelfde regel als in het hoofdmenu.
export function samenGekozen(keuze, { heeftSave = false, vrijePlek = true } = {}) {
  if (keuze === 'nieuw') return { soort: 'nieuw', ...nieuwSpelPlan({ heeftSave, vrijePlek }) };
  const p = ladenPlan(keuze);
  return p.actie === 'stay' ? { soort: 'plek', ...p } : { soort: 'geen', actie: 'geen' };
}

// Laden: de gekozen plek wordt de plek waar de boot mee verder gaat (markStay), niet de laatst bewaarde.
export const ladenPlan = (n) => (Number.isInteger(n) && n >= 1 ? { actie: 'stay', n } : { actie: 'geen' });

// De regels op de held: naam en speler, de stap, speeltijd en geld en wanneer. summary: getSaveSummary() (savegame.js).
export function heldRegels(summary, nu = Date.now()) {
  if (!summary) return null;
  const s = summary;
  const min = Math.floor((Number(s.playSeconds) || 0) / 60);
  const speel = min < 60 ? `${min} min` : `${Math.floor(min / 60)} u ${String(min % 60).padStart(2, '0')}`;
  const ago = s.savedAt ? Math.max(0, Math.round((nu - s.savedAt) / 60000)) : null;
  const wanneer = ago == null ? '' : ago < 1 ? 'net opgeslagen' : ago < 120 ? `${ago} min geleden` : ago < 60 * 24 ? `${Math.floor(ago / 60)} u geleden` : ago < 60 * 48 ? 'gisteren' : `${Math.floor(ago / 1440)} dagen geleden`;
  const stap = (s.story && s.story.next) || s.goal || '';
  return {
    naam: s.name || 'Je spel',
    wie: s.character || 'Tammo',
    stap,
    meta: [speel, `€${Math.round(Number(s.money) || 0).toLocaleString('nl-NL')}`, wanneer].filter(Boolean).join(' · '),
  };
}
