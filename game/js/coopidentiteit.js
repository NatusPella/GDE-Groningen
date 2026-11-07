// Samen spelen: één identiteitstabel voor de online-avatar en de partnerlabels (#636).
// De kleuren zijn dezelfde set die de speler in de lobby kiest; de partner-HUD gebruikt
// dezelfde tabel als terugval in plaats van eigen hexen, zodat kleur, naam en vorm per
// speler één waarheid hebben. Geen DOM, geen netwerk.
export const PROFIEL_KLEUREN = [
  { hex: '#4fb3ff', naam: 'Blauw' },
  { hex: '#5bd6a0', naam: 'Groen' },
  { hex: '#f2b134', naam: 'Geel' },
  { hex: '#ff9a62', naam: 'Oranje' },
  { hex: '#ff7ab8', naam: 'Roze' },
  { hex: '#b78cff', naam: 'Paars' },
  { hex: '#e86a6a', naam: 'Rood' },
  { hex: '#6fd3e0', naam: 'Turquoise' },
];
export const STANDAARD_KLEUR = PROFIEL_KLEUREN[0].hex;
const KLEUREN = new Set(PROFIEL_KLEUREN.map((c) => c.hex));

// Een kleur uit de vaste set; alles anders wordt de standaardkleur.
export const isProfielKleur = (kleur) => KLEUREN.has(String(kleur || '').toLowerCase());

// Een vaste kleur per plek, voor een speler zonder (geldige) avatar: deterministisch,
// zodat dezelfde speler in dezelfde sessie dezelfde kleur houdt.
export function identiteitsKleur(slot = 0) {
  const n = PROFIEL_KLEUREN.length, s = Number.isInteger(slot) ? slot : 0;
  return PROFIEL_KLEUREN[((s % n) + n) % n].hex;
}

// De kleur van een speler: de avatar gaat voor, anders de vaste kleur van zijn plek.
export function kleurVoorSpeler(speler = {}) {
  const av = speler && speler.avatar && typeof speler.avatar === 'object' ? speler.avatar : null;
  const kleur = speler && (speler.kleur || (av && av.kleur));
  return isProfielKleur(kleur) ? String(kleur).toLowerCase() : identiteitsKleur(speler && speler.slot);
}
