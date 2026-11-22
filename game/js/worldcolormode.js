// De stand van "Wereldkleur" (Instellingen > Beeld, 21-11): uit, subtiel (standaard) of drukwerk (sterker). Blad zonder THREE en DOM,
// zodat worldpalette.js (de materiaalkleuren, vastgelegd bij het bouwen) en worldgrade.js (licht, mist en nabewerking, elk beeld)
// dezelfde keuze lezen. De stand is lokaal per speler (bij Samen spelen niet gesynchroniseerd) en staat in gde-settings.
import { KEYS } from './storagekeys.js';

export const WORLD_COLOR_MODES = ['uit', 'subtiel', 'drukwerk'];
const WORLD_COLOR_DEFAULT = 'subtiel';

// Per stand: de menging van de materiaalkleuren met de inkten (worldpalette.js; subtiel is het besluit van 21-11, 0,4) en de sterkte
// van de lichtgrading (worldgrade.js: 1 = de waarden in de dataset, 0 = niets).
export const WORLD_COLOR_STRENGTH = Object.freeze({
  uit: { meng: 0, grade: 0 },
  subtiel: { meng: 0.4, grade: 1 },
  drukwerk: { meng: 0.65, grade: 1.8 },
});

export function cleanWorldColor(v) {
  return WORLD_COLOR_MODES.includes(v) ? v : WORLD_COLOR_DEFAULT;
}

// De opgeslagen stand, rechtstreeks uit de opslag gelezen (de materiaalkleuren worden vastgelegd voordat de instellingen klaar zijn).
// Zonder opslag (Node, tests) of met een kapot bestand: de standaard. Schrijft nooit.
export function storedWorldColor(storage = (typeof window !== 'undefined' ? window.localStorage : null)) {
  try {
    const raw = storage && storage.getItem(KEYS.settings);
    if (!raw) return WORLD_COLOR_DEFAULT;
    const s = JSON.parse(raw);
    return cleanWorldColor(s && s.worldColor);
  } catch (e) { return WORLD_COLOR_DEFAULT; }
}
