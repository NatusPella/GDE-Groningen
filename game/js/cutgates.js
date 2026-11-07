// Poorten voor de losse regiemomenten (landmark-orbit, Ommelanden-scène, …): zo'n
// scène zet de camera over en pauzeert de wereld, dus hij mag nooit beginnen midden in
// een race, in een wedstrijd, in de lucht (heli/vliegtuig), in duifmodus of op snelheid
// (#732). puur en zonder DOM, zodat dit los te testen is; cinematics.js leest de
// bestuurder via spelersregister.js en geeft alleen het voertuig mee.
export const MOMENT_MAX_SPEED = 12; // m/s; sneller dan dit wacht een moment

// Waarom mag dit moment nu niet? Leeg = het mag.
// w: de world (pigeonMode, race, wedstrijd), opts.vehicle: het voertuig van de speler of null.
export function momentReason(w, { vehicle = null, speed = MOMENT_MAX_SPEED } = {}) {
  if (!w) return 'geen-world';
  if (w.pigeonMode) return 'duif';
  // een wedstrijd op de kaart (kartbaan, dijk, polderbaan, …) houdt de speler in zijn eigen camera
  if (w.race) return 'race';
  const wed = w.wedstrijd;
  if (wed && (wed.actief || wed.loopt || wed.baan)) return 'wedstrijd';
  // in een voertuig, en sneller dan een rustig tempo: de wereld pauzeren zou hier schokken
  if (vehicle && Math.abs(vehicle.speed || 0) > speed) return 'snelheid';
  return '';
}

export const momentAllowed = (w, opts = {}) => momentReason(w, opts) === '';
