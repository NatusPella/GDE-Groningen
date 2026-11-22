// Controller op de kaart (#985): op het kaartdoek panen de pijlen, dus de knoppen op de kaart zelf (zoeken, lagen, zoom,
// Naar jezelf, de kaartkaart met Zet routepunt en Reis erheen) waren met een controller niet te bereiken. L3 (menu: Tab)
// gaat van het doek naar die knoppen en weer terug, en met de focus op een knop loopt de D-pad er van knop naar knop doorheen
// (spatialNext, padlogic.js); omhoog of naar links voorbij de eerste knop geeft de kaart terug aan de D-pad.
// pausemenu.js roept dit alleen aan voor invoer van het pad (e.__gde === 'pad'): muis en toetsenbord gedragen zich zoals eerst.
import { spatialNext } from './padlogic.js';

const FOCUSABLE = 'button, input, select, [tabindex]';

// De knoppen op de kaart: alles in de kaartlaag behalve het doek zelf, in DOM-volgorde.
export function mapControlList(root) {
  const overlay = root && root.querySelector('.mapview-overlay');
  if (!overlay) return [];
  // een open kaartvenster (de reispopup of de eerste-keer-uitleg) is modaal: de D-pad blijft erin en loopt niet naar de knoppen eronder (21-11)
  const scope = overlay.querySelector('.mv-reispop, .mv-help') || overlay;
  return [...scope.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length && !el.closest('[hidden]') && !el.matches('canvas, .mapview-canvas'));
}

const focusCanvas = (root) => { const cv = root.querySelector('.mapview-canvas'); if (cv) cv.focus({ preventScroll: true }); };

// D-pad vanaf een kaartknop; true als de toets hier is afgehandeld.
export function stepMapControls(root, cur, dir) {
  const list = mapControlList(root);
  const i = list.indexOf(cur);
  if (i < 0) return false;
  const rects = list.map((b) => { const r = b.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const j = spatialNext(rects, i, dir);
  if (j >= 0) list[j].focus({ preventScroll: true });
  else if (dir === 'up' || dir === 'left') focusCanvas(root);
  return true;
}

// L3: van het doek naar de eerste kaartknop, vanaf een kaartknop terug naar het doek.
export function toggleMapControls(root, cur) {
  const list = mapControlList(root);
  if (list.includes(cur) || !list.length) focusCanvas(root);
  else list[0].focus({ preventScroll: true });
}
