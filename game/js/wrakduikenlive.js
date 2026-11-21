// #839: een duik bij een wrak is een korte, rustige scène: je ziet het wrak, je vindt één
// voorwerp en dat komt in je album. Geen nieuwe opslagsleutel; de vondsten staan in de
// bestaande prestatieset.
import { hoofdspeler } from './players.js';
import { pushAudioEvent } from './pedgeom.js';
import { ALLEEN_EIGEN_SPEL } from './coopgast.js';
import { recordUnique, hasUnique, recordStat, getSaveSet } from './achievements.js';
import { DUIK_R, WRAKVONDSTEN_SET, WRAKDUIKEN_STAT, duikplekken, duikplekBij, vondstId, duikStand } from './wrakduiken.js';

let worldRef = null;

// Korte, goedkope duikscène: een blauwe waas met bubbels en de naam van het wrak.
// Geen camera-overname en geen per-frame werk; de CSS-animatie doet het.
function speelDuikScene(plek) {
  if (typeof document === 'undefined' || !document.body) return;
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:80;opacity:0;background:radial-gradient(circle at 50% 30%, rgba(63,208,255,0.35), color-mix(in srgb, var(--ds-c-glas) 88%, transparent) 70%)';
  const txt = document.createElement('div');
  txt.textContent = `Je duikt naar ${plek.wrak.naam}…`;
  txt.style.cssText = 'position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);font:800 24px var(--ds-font-zeef-kop);letter-spacing:1px;color:var(--ds-c-ink-inkt);background:var(--ds-c-ink-papier);padding:6px 18px;border:var(--ds-lijn-zeef) solid var(--ds-c-ink-inkt);border-radius:8px;box-shadow:var(--ds-schaduw-hard);white-space:nowrap';
  el.appendChild(txt);
  for (let i = 0; i < 10; i++) {
    const b = document.createElement('i');
    b.style.cssText = `position:absolute;left:${8 + Math.random() * 84}%;bottom:-10%;width:${4 + Math.random() * 7}px;height:${4 + Math.random() * 7}px;border-radius:50%;border:1px solid rgba(63,208,255,0.65)`;
    el.appendChild(b);
    b.animate([{ transform: 'translateY(0)', opacity: 0 }, { opacity: 0.8, offset: 0.2 }, { transform: 'translateY(-70vh)', opacity: 0 }], { duration: 1500 + Math.random() * 900, delay: Math.random() * 300, easing: 'ease-out' });
  }
  document.body.appendChild(el);
  el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 1900, easing: 'ease-in-out' });
  setTimeout(() => el.remove(), 2100);
}

export function initWrakduiken(world) { worldRef = world; return true; }
const gedoken = (id) => hasUnique(WRAKVONDSTEN_SET, id);
export const duikAlbum = () => duikStand(gedoken);
export const getWrakduikSpotsForRender = () => duikplekken().map((p) => ({ ...p, kind: 'wrakduik', gedoken: gedoken(p.vondst.id) }));

export function tryWrakduikInteract(world) {
  if (!world) return false;
  const inp = world.input;
  if (!inp || !inp.wasPressed || !(inp.wasPressed('e') || inp.wasPressed('f'))) return false;
  const p = hoofdspeler(world);
  // Ook vanaf een boot of zwemmend bij het wrak mag je duiken: het Lauwersmeerwrak
  // heeft geen droge oever binnen loopafstand (review 0.61.0).
  if (!p || p.climb || (p.inVehicle && !p.inVehicle.isBoat)) return false;
  const plek = duikplekBij(p.x, p.y);
  if (!plek) return false;
  // De gastwaarschuwing pas bij een echte E-druk bij een wrak, niet elke frame.
  if (world.coopRole === 'client') { inp.consume?.('e'); inp.consume?.('f'); world.addMessage?.(ALLEEN_EIGEN_SPEL, 3); return false; }
  const id = vondstId(plek);
  if (gedoken(id)) {
    world.addMessage('Hier heb je al gedoken; het wrak is leeg.', 2.4);
    return true;
  }
  inp.consume?.('e');
  inp.consume?.('f');
  if (!recordUnique(world, WRAKVONDSTEN_SET, id)) return false;
  recordStat(world, WRAKDUIKEN_STAT);
  pushAudioEvent(world, { kind: 'splash', x: p.x, y: p.y });
  pushAudioEvent(world, { kind: 'whoosh', x: p.x, y: p.y, strength: 0.35 });
  speelDuikScene(plek);
  world.addMessage(`Je duikt naar ${plek.wrak.naam}. ${plek.vondst.naam}: ${plek.vondst.tekst}`, 5, { kind: 'prestatie' });
  const stand = duikStand(gedoken);
  if (stand.klaar) world.addMessage('Alle drie de wrakken gedoken. De Wadden geven hun geheimen niet snel prijs.', 4, { kind: 'tip' });
  return true;
}

// Prompt voor de E-keten: bij een wrak dat je nog niet hebt gedoken.
export function wrakduikPrompt(world) {
  if (!world || world.coopRole === 'client') return null;
  const p = hoofdspeler(world);
  if (!p || p.climb || (p.inVehicle && !p.inVehicle.isBoat)) return null;
  const plek = duikplekBij(p.x, p.y);
  if (!plek || gedoken(vondstId(plek))) return null;
  return { id: 'wrakduik-' + plek.id, x: plek.x, y: plek.y, h: 1.6, key: 'E', label: `Duiken naar ${plek.wrak.naam}`, sub: `${plek.water} · een vondst voor je album`, ring: true };
}
