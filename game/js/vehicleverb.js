// Het werkwoord van de E-hint bij een voertuig (prompts.js), puur en zonder DOM zodat scripts/verfijn_wereld_test.mjs het kan nalopen.
// Verfijning 22-11: een geparkeerde fiets, scooter, boot of paard stond als "Auto jatten" in beeld; nu noemt de hint wat het is.
// Samen spelen: de hint is lokaal per speler; wie het voertuig in handen heeft is al in de snapshot terug te zien (v.driver/v.road).

// Het zelfstandig naamwoord bij "jatten" voor een geparkeerd voertuig.
export function stealNoun(v) {
  if (v.isBus) return 'Bus';
  if (v.isBoat) return 'Boot';
  if (v._mount === 'horse') return 'Paard';
  if (v.isBike) return 'Fiets';
  if (v.isScooter) return 'Scooter';
  return 'Auto';
}

export function vehicleVerb(v) {
  const moving = Math.abs(v.speed || 0) > 0.3;
  const occupied = v.isBoat ? moving : !v.isHeroCar && !!v.road;
  if (v.fallen) return { label: 'Fiets rechtzetten' }; // #1018: eerst overeind, dan opstappen
  // your own ride (hero car, bought, rented, job vehicle) is never theft
  if (v.isHeroCar || v.playerOwned || v.missionCar) return { label: v.isBoat ? 'Aan boord' : v.isHeli ? 'Instappen en vliegen' : v.isBike || v.isScooter ? 'Opstappen' : 'Instappen' };
  if (v.isPolice) return { label: 'Jatten', steal: true };
  if (v.parked) return { label: `${stealNoun(v)} jatten`, steal: true };
  if (v.isBoat) return occupied ? { label: 'Kapen', steal: true } : { label: 'Aan boord' };
  if (v._mount === 'horse') return occupied ? { label: 'Paard jatten', steal: true } : { label: 'Opstijgen' };
  if (v.isBike) return occupied ? { label: 'Fiets jatten', steal: true } : { label: 'Opstappen' };
  if (v.isScooter) return occupied ? { label: 'Scooter jatten', steal: true } : { label: 'Opstappen' };
  if (v.isBus) return occupied ? { label: 'Bus kapen', steal: true } : { label: 'Instappen' };
  return occupied ? { label: 'Jatten', steal: true } : { label: 'Instappen' };
}
