// De pictogrammen voor de cijfers van de light-sim-strook (#985, #980): één bron voor de icoonpaden (24x24, lijn, currentColor) die de modellen per sim
// (kartstatus.js, padelstatus.js, discgolfstatus.js, pitchstatus.js, ...) in hun cijfers zetten. Elk getal in de strook heeft zo een pictogram naast zijn woord.
export const SIMICOON = {
  plaats: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3"/><path d="M12 13v4M9 20h6"/>',
  ronde: '<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v4h-4"/>',
  klok: '<circle cx="12" cy="13" r="7"/><path d="M12 9v4l3 2M10 3h4"/>',
  tempo: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5"/>',
  wind: '<path d="M3 9h11a3 3 0 1 0-3-3"/><path d="M3 14h15a3 3 0 1 1-3 3"/>',
  vlag: '<path d="M8 21V3"/><path d="M8 4l9 3-9 3"/>',
  worp: '<circle cx="10" cy="14" r="4"/><path d="M15 9l5-5"/>',
  par: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  stand: '<path d="M4 20V10M10 20V4M16 20v-7M2 20h20"/>',
  punt: '<circle cx="12" cy="12" r="8"/><path d="M8 12l3 3 5-6"/>',
  rally: '<path d="M4 15c3-9 13-9 16 0"/><path d="M4 9c3 9 13 9 16 0"/>',
};
