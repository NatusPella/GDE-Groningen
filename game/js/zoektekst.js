// Zoeken in een scherm (#435): de zoekvelden van Besturing en Spullen werken
// hetzelfde. Alle woorden van de opdracht moeten ergens in de tekst van een rij
// staan; hoofdletters en extra spaties maken niet uit. Puur (geen DOM), zodat
// scripts/besturing_zoek_test.mjs het kan natrekken.
export function woordenVan(q) {
  return String(q == null ? '' : q).toLowerCase().trim().split(/\s+/).filter(Boolean);
}

// Staat elk woord in de tekst? Een lege opdracht past altijd.
export function past(tekst, woorden) {
  const t = String(tekst == null ? '' : tekst).toLowerCase();
  return (Array.isArray(woorden) ? woorden : woordenVan(woorden)).every((w) => t.includes(w));
}

// Dezelfde twee stappen in één keer, voor een rij die één lap tekst heeft.
export const pastZoek = (tekst, q) => past(tekst, woordenVan(q));
