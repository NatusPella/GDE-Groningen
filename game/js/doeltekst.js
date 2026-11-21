// De tekst van de doelbalk (#1175, eigenaar 21-11): een doel dat je nog moet BEREIKEN krijgt een werkwoord
// ("Ga naar: Haven Delfzijl", "Rij naar: ...", "Vaar naar: ...", "Vlieg naar: ..."); een opdracht die je nu al
// DOET staat als "Bezig: ...". Zonder dat las een kale plaatsnaam als iets wat je op dat moment aan het doen was.
// Pure logica, geen DOM; hud_panel.js past het toe, scripts/doeltekst_test.mjs dekt alle soorten en vervoersmodi.

// Vervoer -> werkwoord. vehicleKind (hudlook.js) geeft car/motor/scooter/bike/boat/heli/train; plane komt van isPlane.
export const REIS_WERKWOORD = {
  voet: 'Ga naar', car: 'Rij naar', motor: 'Rij naar', scooter: 'Rij naar', bike: 'Fiets naar',
  boat: 'Vaar naar', heli: 'Vlieg naar', plane: 'Vlieg naar', train: 'Rij naar',
};

export const reisWerkwoord = (modus) => REIS_WERKWOORD[modus] || REIS_WERKWOORD.voet;

// Een titel die al met een opdracht begint ("Ga naar het museum", "Eerst naar de auto, dan: ...", "Onderduiken: ...",
// "Breng de pakketjes weg") krijgt geen tweede werkwoord erbij.
const AL_WERKWOORD = /^(ga|rij|rijd|fiets|vaar|vlieg|loop|breng|haal|pak|neem|stap|eerst|volg|wacht|koop|spreek|praat|zoek|bak|bouw|onderduiken|blijf|ontsnap|kies|klim|duik|ren|spring|schiet|stuur)\b/i;
// Een titel met al een voorvoegsel ("Bezig: ...", "Eerst: koop een fiets", "Geschept: 3/10", "Onderduiken: ...") blijft ook staan.
const AL_PREFIX = /^[^:]{1,24}:/;

export const heeftWerkwoord = (titel) => AL_WERKWOORD.test(String(titel || '').trim()) || AL_PREFIX.test(String(titel || '').trim());

// Een bestemming (een plaats waar je heen moet): "Ga naar: Haven Delfzijl". Een naam met een eigen werkwoord blijft staan.
export function bestemmingTitel(naam, modus = 'voet') {
  const t = String(naam || '').trim();
  if (!t) return '';
  if (heeftWerkwoord(t)) return t;
  return `${reisWerkwoord(modus)}: ${t}`;
}

// Een actieve opdracht: "Bezig: ...". Een titel met een eigen werkwoord ("Breng de pakketjes weg") blijft zoals hij is:
// die is zelf al een opdracht, en "Bezig: Breng ..." leest als twee zinnen.
export function bezigTitel(titel) {
  const t = String(titel || '').trim();
  if (!t) return '';
  if (heeftWerkwoord(t)) return t;
  return `Bezig: ${t}`;
}

// De modus van de speler: te voet, of de soort van het voertuig (zie vehicleKind in hudlook.js).
export function reisModus(v, kind) {
  if (!v) return 'voet';
  if (v.isPlane) return 'plane';
  return kind || 'car';
}

// Eén ingang voor de doelbalk. soort: 'goal' en 'story' zijn bestemmingen; 'job' en 'mission' zijn actieve opdrachten;
// 'police' (Ontsnap aan de politie) is een opdracht met een eigen werkwoord en blijft staan.
export function doelTitel(soort, tekst, modus = 'voet') {
  if (soort === 'goal' || soort === 'story') return bestemmingTitel(tekst, modus);
  if (soort === 'job' || soort === 'mission') return bezigTitel(tekst);
  return String(tekst || '');
}
