// Samen spelen: de verbinding van een speler in gewone woorden (Goed, Matig, Slecht, Weg), zonder milliseconden in de hoofdweergave.
// Pure module, geen DOM en geen netwerk. De drempels zijn VOORLOPIG: ze zijn niet gemeten met een echte sessie over internet
// (docs/SAMEN-VERBINDING-MEETNOTITIE.md). Zonder meting geen valse precisie: pas alleen deze constanten aan na een meting.
// De invoer is wat het spel al heeft: `verbinding` ('ok', 'lag', 'lost' uit net/session.js en hub.js; 'lag' = LAG_AFTER, 0,6 s zonder bericht) en `ms` (rtt, of null).

export const MATIG_MS = 150;  // vanaf hier merkt een speler het: een tikje achter
export const SLECHT_MS = 350; // vanaf hier hapert het merkbaar
export const NIVEAUS = ['goed', 'matig', 'slecht', 'weg'];
export const NIVEAU_TEKST = { goed: 'Goed', matig: 'Matig', slecht: 'Slecht', weg: 'Weg', bezig: 'Verbindt' };

// r: { verbinding: 'ok'|'lag'|'lost'|'bezig'|undefined, ms: number|null }
export function verbindingNiveau(r = {}) {
  const v = r && r.verbinding;
  if (v === 'lost') return 'weg';
  if (v === 'lag') return 'slecht'; // 0,6 s zonder bericht is al merkbaar
  const ms = Number.isFinite(r && r.ms) ? r.ms : null;
  if (ms != null && ms >= SLECHT_MS) return 'slecht';
  if (ms != null && ms >= MATIG_MS) return 'matig';
  return 'goed';
}

// Eén zin per niveau, voor een ander (`eigen` false) of voor jezelf (`eigen` true), met wat je kunt doen. Goed heeft er geen nodig.
export function verbindingUitleg(niveau, { eigen = false, naam = 'De ander' } = {}) {
  if (niveau === 'matig') return eigen
    ? 'Anderen zien je soms schokken en jij ziet hen met een tikje vertraging. Het spel loopt gewoon door.'
    : `Het beeld van ${naam} loopt soms een tikje achter. Dat lost meestal vanzelf op. Het ligt aan zijn internet, niet aan dat van jou.`;
  if (niveau === 'slecht') return eigen
    ? 'Het hapert merkbaar. Zit dichter bij je router of gebruik een kabel; stap bij een race eventueel uit en kijk mee.'
    : `Het beeld van ${naam} hapert merkbaar. Vraag hem eventueel dichter bij zijn router te gaan zitten.`;
  if (niveau === 'weg') return eigen
    ? 'Geen contact. Het spel probeert opnieuw te verbinden; je eigen voortgang blijft veilig.'
    : `Het spel wacht even. Komt ${naam} niet terug, dan gaat het door zonder hem; zijn voortgang blijft veilig.`;
  return '';
}
