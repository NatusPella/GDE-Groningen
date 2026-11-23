// Zware lading (vettruck 23-11): de tankwagen van Us Mem Vet rijdt als een volle tankwagen en niet als een bestelbus met een
// tank erop. Eén plek met de factoren, puur (geen three, geen wereld); scripts/heavyload_test.mjs houdt ze vast.
// Wie ze leest:
//   vehicle/tuning.js  optrekken, remmen, uitrollen en zijgrip van de speler (lange remweg, wijde bochten)
//   vehicle.js         de vering (duiken, hurken, overhellen in de bocht), de botsmassa en het stuur (traag, als de bus)
//   cammath.js         de volgcamera iets verder weg
//   audio.js           de motor: de lage diesel van de bus (bestaande lus motor_diesel_stationair), voor elke vrachtwagen
// Alleen voor de speler veranderen optrekken, remmen en grip: de AI-tankwagen van M07 (de vlucht naar Friesland) houdt de
// afstelling waar de missie op getest is. Vering en botsmassa gelden voor iedereen: dat is natuurkunde, geen besturing.

export const TANKWAGEN_RIJGEDRAG = Object.freeze({
  massa: 24000,      // kg: wagen van 12 t plus ca. 13.000 l frituurvet (0,91 kg/l); ter informatie en voor de botsmassa
  botsmassa: 2.2,    // factor op de massa uit het grondvlak (vehicle.js vehicleMass): een volle tank duw je niet opzij
  optrek: 0.55,      // factor op de acceleratie van de speler: traag optrekken
  rem: 0.45,         // factor op de remvertraging van de speler: de remweg wordt 1 / 0,45 = 2,2 keer zo lang (80 km/u: ca. 39 m)
  uitrol: 0.6,       // factor op rolweerstand en motorrem van de speler: gas los en hij rolt lang door
  grip: 0.42,        // factor op de zijgrip van de speler: bij snelheid wijde bochten, het vet duwt naar buiten
  vering: 1.9,       // zachtheid van de vering (bus 1,7, bestelbus 1,35, auto 1): meer duiken, hurken en overhellen
  overhel: 1.6,      // factor op de grens van het overhellen in een bocht (vehicle.js updateSuspension)
  camera: 1.15,      // factor op de afstand van de volgcamera
});

// Het rijgedrag van een model met zware lading, of null voor een gewoon voertuig.
export function zwareLading(model) {
  return model && model.name === 'truck' && model.tank ? TANKWAGEN_RIJGEDRAG : null;
}

// Remweg in m van snelheid v (m/s) bij een vertraging `rem` (m/s²): v² / 2a. Voor de test en de afstelling.
export function remweg(v, rem) {
  return rem > 0 ? (v * v) / (2 * rem) : Infinity;
}
