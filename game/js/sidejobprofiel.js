// Eén profiel per bijbaan (#631/#667/#668): bij welk vak hij hoort, welke sfeer daarbij hoort, of het een
// **dienst** of een **kantoorklus** is, en hoe het niveau telt. Puur en zonder DOM, zodat de HUD, "Te doen", de
// banen-app en de tests dezelfde bron gebruiken. Geen nieuwe kleuren: de sfeer komt uit carrieresfeer.js en de
// families krijgen een naam en uitleg, geen losse hex.
import { BAAN_IDS, vakVanBaan } from './loopbaan.js';
import { sfeerVan, sfeerTint } from './carrieresfeer.js';

export const FAMILIES = Object.freeze({
  dienst: { naam: 'Dienst', uitleg: 'Een rit of dienst met een voertuig, tijd en een doel.' },
  kantoorklus: { naam: 'Kantoorklus', uitleg: 'Kort werk achter een balie of met een tekstpaneel.' },
});
export const FAMILIE_IDS = Object.keys(FAMILIES);

// De tekst-/keuzebanen (#667): de tien keuzewerk-banen, de drie paneelbanen, de rechtbank, het cabaret, de BOA
// en de snackoverlast. Alles wat hier niet in staat is een dienst (rit, voertuig, tijd).
export const KANTOORKLUS = new Set([
  'loket', 'studiestaat', 'vigilantia', 'promotie', 'kamerkoning', 'wolkenhal', 'helix', 'niemeyer', 'bernard', 'energielabel',
  'strandpost', 'kermisdraai', 'brugdienst',
  'rechtbank', 'cabaret', 'boa', 'snackoverlast',
]);

export const familieVan = (id) => (KANTOORKLUS.has(id) ? 'kantoorklus' : 'dienst');
export const familieInfo = (id) => FAMILIES[familieVan(id)];

// Het profiel van één baan: vak, sfeernaam, familie en de korte uitleg voor de kaart en de banen-app.
export function sidejobProfiel(id) {
  if (!id) return null;
  const vak = vakVanBaan(id);
  const sfeer = sfeerVan(vak);
  const familie = familieVan(id);
  return { id, vak, sfeer: sfeer.naam || '', motief: sfeer.motief || '', accent: sfeerTint(vak), familie, familieNaam: FAMILIES[familie].naam, uitleg: FAMILIES[familie].uitleg };
}

// Alle banen met hun profiel; de HUD, "Te doen" en de app filteren hierop.
export function alleProfielen() {
  return BAAN_IDS.map((id) => sidejobProfiel(id));
}

// --- het niveau (#668): variatie telt mee ---------------------------------------------------
// De niveaus blijven dezelfde rondes-drempels; alleen de eerste ronde van een baan telt dubbel, zodat een speler
// die nieuwe banen probeert even snel opschiet als iemand die dezelfde baan blijft herhalen. Geen loonwijziging.
export const LEVEL_AT = [0, 5, 12, 25, 45];
export const LEVEL_TITELS = ['Nieuweling', 'Invaller', 'Vaste kracht', 'Routinier', 'Legende'];

export function jobLevel(rounds) {
  const n = Number.isFinite(rounds) ? Math.max(0, rounds) : 0;
  let lvl = 1;
  for (let i = 0; i < LEVEL_AT.length; i++) if (n >= LEVEL_AT[i]) lvl = i + 1;
  return lvl;
}

export function titelVanNiveau(lvl) {
  return LEVEL_TITELS[Math.max(0, Math.min(LEVEL_TITELS.length - 1, (lvl | 0) - 1))];
}

// Hoeveel rondes telt deze ronde? De eerste ronde van een baan (nog geen rondes gedaan) telt dubbel.
export function rondeWaarde(huidigeRondes) {
  return (Number.isFinite(huidigeRondes) ? huidigeRondes : 0) === 0 ? 2 : 1;
}

// De twee balken in één regel (#668): de baan wordt beter van vaak doen, het vak van variëren.
export const BALKEN_UITLEG = {
  baan: 'Deze baan wordt beter als je hem vaak doet.',
  vak: 'Dit vak wordt beter als je varieert: elke nieuwe plek en elke nieuwe baan telt extra.',
};

// Voor de banen-app: één zin per baan die beide balken uitlegt (#668), en de familie (#667).
export function appRegel(id, profiel = sidejobProfiel(id)) {
  if (!profiel) return '';
  return `${profiel.familieNaam} · sfeer ${profiel.sfeer}. ${BALKEN_UITLEG.baan} ${BALKEN_UITLEG.vak}`;
}

// De verdeling over de twee families, voor "Te doen" en de app (en de test): elke baan hoort ergens bij.
export function familieVerdeling() {
  const uit = { dienst: [], kantoorklus: [] };
  for (const id of BAAN_IDS) uit[familieVan(id)].push(id);
  return uit;
}
