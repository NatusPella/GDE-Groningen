// Samen spelen (#528, ADR 0022): de keuze die het bootpad maakt voordat de wereld begint — meedoen met een
// bestaande sessie, zelf hosten, of besloten blijven. Pure regels, geen DOM, geen netwerk, geen opslag, zodat de
// keuze testbaar is zonder browser en dezelfde lijst altijd hetzelfde antwoord geeft.
//   node scripts/sessiekeuze_test.mjs
//
// De invoer is de lijst die net/serverlijst.js al oplevert (rijen met spelers, max, versie, anders, vol, kan,
// room en id). We herberekenen niets van die vlaggen: één bron voor "kan ik hierbij".
export const KEUZE = { MEEDOEN: 'meedoen', HOSTEN: 'hosten', BESLOTEN: 'besloten' };

const tekst = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');

// De redenen die de UI kan tonen. Nederlands, kort, en zonder iets over een andere speler te beweren dat we niet weten.
export function reden(soort, rij = null) {
  switch (soort) {
    case 'anders': return 'Die sessie heeft een andere versie.';
    case 'vol': return `${rij && rij.naam ? `De sessie van ${rij.naam}` : 'Die sessie'} is vol.`;
    case 'eigen': return ''; // je eigen sessie telt niet als kandidaat; geen melding nodig
    case 'leeg': return 'Er speelt nog niemand. Je opent zelf een sessie.';
    case 'alleen': return 'Je speelt alleen.';
    case 'niets': return 'Er is nu geen sessie om bij aan te sluiten.';
    default: return '';
  }
}

// Waarom een rij afvalt, of null als hij mag. `eigen` is het id van je eigen sessie (mag leeg zijn).
function afwijzing(rij, eigenId) {
  if (!rij) return 'leeg';
  if (eigenId && rij.id === eigenId) return 'eigen';
  if (rij.anders) return 'anders';
  if (rij.vol) return 'vol';
  if (rij.kan === false) return 'anders';
  return null;
}

// De rangorde als er meer dan één sessie past: de drukste eerst (een volle(re) sessie is gezelliger en houdt het
// aantal sessies klein), daarna de langst bestaande aankondiging, daarna het id. Geen willekeur en geen Math.random:
// dezelfde lijst moet twee keer hetzelfde antwoord geven.
function beter(a, b) {
  if (b.spelers !== a.spelers) return b.spelers - a.spelers;
  if (b.ouderdom !== a.ouderdom) return b.ouderdom - a.ouderdom;
  return (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

// Alle kandidaten op volgorde. De aanroeper kan de eerste proberen en bij een mislukte verbinding de volgende pakken
// (tussen twee pogingen kan een sessie vol raken; dat weet je pas bij het verbinden).
export function kandidaten(rijen, { eigenId = '' } = {}) {
  const uit = [];
  for (const rij of Array.isArray(rijen) ? rijen : []) {
    if (afwijzing(rij, eigenId)) continue;
    uit.push(rij);
  }
  return uit.sort(beter).map((rij, i) => ({ sessie: rij, rang: i + 1, kandidaten: uit.length }));
}

// Het volledige besluit. `meedoen` is de instelling onlineMeedoen: alleen strikt true mag tot contact leiden
// (null betekent "nog nooit gevraagd" en is dus geen ja; zie settings.magOnline).
export function kies({ rijen = [], meedoen = null, eigenId = '' } = {}) {
  if (meedoen !== true) return { doen: KEUZE.BESLOTEN, sessie: null, kandidaten: [], reden: reden('alleen') };
  const k = kandidaten(rijen, { eigenId });
  if (k.length) return { doen: KEUZE.MEEDOEN, sessie: k[0].sessie, kandidaten: k, reden: '' };
  // Niets bruikbaars: onderscheid "er was niets" van "het paste niet", zodat de speler weet waarom hij host.
  const eerste = (Array.isArray(rijen) ? rijen : []).find((r) => r && (!eigenId || r.id !== eigenId) && (r.anders || r.vol || r.kan === false));
  return { doen: KEUZE.HOSTEN, sessie: null, kandidaten: [], reden: eerste ? (eerste.anders ? reden('anders') : reden('vol', eerste)) : reden('leeg') };
}

// Een volgende kandidaat na een mislukte poging. Geeft null als de lijst op is (dan host je zelf). `geprobeerd`
// is één id of een lijst id's: alles wat al mislukte, slaan we over.
export function volgende(kandidatenLijst, geprobeerd) {
  const gehad = new Set(Array.isArray(geprobeerd) ? geprobeerd : geprobeerd ? [geprobeerd] : []);
  const lijst = Array.isArray(kandidatenLijst) ? kandidatenLijst : [];
  return lijst.find((k) => k.sessie && !gehad.has(k.sessie.id))?.sessie || null;
}
