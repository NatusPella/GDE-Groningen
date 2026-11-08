// Hoe lang een HUD-kaart blijft staan (#801): puur, zodat
// scripts/cardtime_test.mjs het kan controleren.
export const READING_TIME_CHOICES = ['normaal', 'ruim', 'geen'];
export const CARD_MIN_S = 4;
export const CARD_MAX_S = 10;

// textSeconds = readingSeconds(tekst) uit world.js; duration = de duur die de
// aanroeper meegaf. Dezelfde formule als voorheen, met een leesstand erover.
export function cardSeconds({ textSeconds = 0, duration = 0, mode = 'normaal' } = {}) {
  const text = Number.isFinite(textSeconds) ? Math.max(0, textSeconds) : 0;
  const dur = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const base = Math.min(CARD_MAX_S, Math.max(CARD_MIN_S, dur * 1.2, text * 1.25));
  if (mode === 'ruim') return Math.min(CARD_MAX_S * 1.8, base * 1.7);
  return base;
}

// 'geen' laat een belangrijke kaart (uitleg, les, kaart die een toets leert)
// staan tot de speler klikt of Enter/Spatie geeft; andere kaarten blijven
// gewoon getimed, anders raakt de HUD nooit leeg.
export function stickyCard(mode, important) {
  return mode === 'geen' && !!important;
}
