// Samen spelen (#872): labels boven een speler en bij een ping hebben een vaste kaart.
// Deze pure functie past de tekst daaraan aan: eerst wordt het lettertype kleiner tot de
// tekst binnen de breedte past, en pas als dat niet lukt kort ze in met een ellipsis.
// `meet(tekst, px)` meet de breedte in kaartpixels (in de browser: canvas.measureText).
// Zo blijven lange online-namen leesbaar in plaats van buiten het vlak te vallen.
const ELLIPSIS = '…';

export function pasLabel(tekst, { maxBreedte, px = 34, minPx = 18, meet, stap = 1, ellipsis = ELLIPSIS } = {}) {
  const heel = String(tekst == null ? '' : tekst) || '?';
  const basis = Math.max(1, Math.round(px));
  if (typeof meet !== 'function' || !(maxBreedte > 0)) return { tekst: heel, px: basis };
  const min = Math.max(1, Math.min(basis, Math.round(minPx)));
  const af = Math.max(1, Math.floor(stap));
  let maat = basis;
  while (maat > min && meet(heel, maat) > maxBreedte) maat = Math.max(min, maat - af);
  let uit = heel;
  if (meet(uit, maat) > maxBreedte) {
    const puntjes = String(ellipsis || ELLIPSIS);
    while (uit.length > 1 && meet(uit + puntjes, maat) > maxBreedte) uit = uit.slice(0, -1);
    // past zelfs één teken met puntjes niet, dan blijft het eerste teken over; zo blijft
    // het label altijd binnen de kaart, ook bij een extreme naam.
    uit = meet(uit + puntjes, maat) <= maxBreedte ? uit + puntjes : uit.slice(0, 1);
  }
  return { tekst: uit, px: maat };
}
