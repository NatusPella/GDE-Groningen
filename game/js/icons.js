// De ene iconenmodule van het spel (ADR 0041): Phosphor, gevraagd op betekenis. Node-safe
// (geen DOM): geeft alleen strings. De SVG's komen uit phosphordata.js (door
// scripts/ui/phosphor_kies.mjs gebundeld, geen netwerk); de betekenisnamen staan in iconmap.js.
// Kleur is currentColor; de maat komt uit de ds-tokens (s 16, m 20, l 24, xl 32) of uit de
// CSS van de plek. Een inline style zet fill/stroke vast, zodat de oude lijnregels per scherm niets breken. Eén gewicht: regular, bold bij 16 px en kleiner.
import { ICON_MAP, ICON_SIZES, ICON_BOLD_BELOW } from './iconmap.js';
import { PHOSPHOR } from './phosphordata.js';
import { escapeHtml as esc } from './htmlescape.js';

// Veilige terugval bij een onbekende naam: een vierkantje met een vraagteken (Phosphor 'question').
const FALLBACK = 'vraag';

const resolve = (naam) => (ICON_MAP[naam] ? naam : FALLBACK);

export const iconBekend = (naam) => !!ICON_MAP[naam];
export const iconNamen = () => Object.keys(ICON_MAP);

// De binnenkant van de SVG (paden), voor wie zelf een <svg viewBox="0 0 256 256"> bouwt.
export function iconInner(naam, bold = false) {
  const ph = PHOSPHOR[ICON_MAP[resolve(naam)]];
  return ph ? ph[bold ? 1 : 0] : '';
}

// icoon('geld') of icoon('geld', { maat: 'm', label: 'Geld', cls: 'hud-ic', bold: true }).
// maat: 's' | 'm' | 'l' | 'xl' of een getal in px; weglaten = de CSS van de plek bepaalt.
// label: zonder label is het icoon decoratief (aria-hidden); met label een role="img".
export function icoon(naam, opties = {}) {
  const { maat, label, cls = '', bold } = opties;
  const px = typeof maat === 'number' ? maat : ICON_SIZES[maat];
  const vet = bold != null ? bold : (px != null && px < ICON_BOLD_BELOW);
  const size = px ? ` width="${px}" height="${px}"` : '';
  const aria = label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true" focusable="false"';
  return `<svg class="ic${cls ? ' ' + esc(cls) : ''}" viewBox="0 0 256 256" fill="currentColor" style="fill:currentColor;stroke:none"${size}${aria}>${iconInner(naam, vet)}</svg>`;
}
