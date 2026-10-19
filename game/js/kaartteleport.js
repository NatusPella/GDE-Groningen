// Shift+klik op de kaart (#180): verplaatst de speler naar die plek. De pure beslissing staat hier;
// mapview.js leest de klik, cheats.js (w.cheatActions.teleport) doet de sprong met alle bewakers
// (niet tijdens een missie of filmpje, niet met de politie op je hielen, niet op het water,
// op begaanbare grond, met je voertuig). scripts/kaartteleport_test.mjs.

// Mag deze klik een teleport worden? `teleportMode` is de cheat 'Overal en nergens' (Streken).
export function wantsTeleport({ shift = false, enabled = true, teleportMode = false } = {}) {
  return !!teleportMode || (!!shift && !!enabled);
}

// De naam die in de melding komt: een straat, anders de wijk, anders 'deze plek'.
export function plekNaam(...namen) {
  for (const n of namen) if (typeof n === 'string' && n.trim()) return n.trim();
  return 'deze plek';
}
