// #839: een duik bij een wrak is een korte, rustige scène: je ziet het wrak, je vindt één
// voorwerp en dat komt in je album. Geen nieuwe opslagsleutel; de vondsten staan in de
// bestaande prestatieset.
import { hoofdspeler } from './players.js';
import { recordUnique, getSaveSet, recordStat } from './achievements.js';
import { DUIK_R, WRAKVONDSTEN_SET, WRAKDUIKEN_STAT, duikplekken, duikplekBij, vondstId, duikStand } from './wrakduiken.js';

let worldRef = null;

export function initWrakduiken(world) { worldRef = world; return true; }
export const duikAlbum = () => duikStand(getSaveSet(WRAKVONDSTEN_SET));
export const getWrakduikSpotsForRender = () => duikplekken().map((p) => ({ ...p, kind: 'wrakduik', gedoken: getSaveSet(WRAKVONDSTEN_SET).has(p.vondst.id) }));

export function tryWrakduikInteract(world) {
  if (!world || world.coopRole === 'client') return false;
  const inp = world.input;
  if (!inp || !inp.wasPressed || !(inp.wasPressed('e') || inp.wasPressed('f'))) return false;
  const p = hoofdspeler(world);
  if (!p || p.inVehicle || p.swimming || p.climb) return false;
  const plek = duikplekBij(p.x, p.y);
  if (!plek) return false;
  const id = vondstId(plek);
  if (getSaveSet(WRAKVONDSTEN_SET).has(id)) {
    world.addMessage('Hier heb je al gedoken; het wrak is leeg.', 2.4);
    return true;
  }
  inp.consume?.('e');
  inp.consume?.('f');
  if (!recordUnique(world, WRAKVONDSTEN_SET, id)) return false;
  recordStat(world, WRAKDUIKEN_STAT);
  world.addMessage(`Je duikt naar ${plek.wrak.naam}. ${plek.vondst.naam}: ${plek.vondst.tekst}`, 5, { kind: 'prestatie' });
  const stand = duikStand(getSaveSet(WRAKVONDSTEN_SET));
  if (stand.klaar) world.addMessage('Alle drie de wrakken gedoken. De Wadden geven hun geheimen niet snel prijs.', 4, { kind: 'tip' });
  return true;
}
