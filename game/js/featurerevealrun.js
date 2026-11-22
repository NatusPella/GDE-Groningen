// De dunne laag met de wereld voor de onthulregel van het menu (featurereveal.js, docs/MENU-ONTHULLING-22-11.md): de bron van de poort en van
// wat de speler al heeft, en de rustige melding "Nieuw in je menu: Land en bedrijf" zodra het verhaal een onderdeel opent.
// De lijst van wat al gemeld is hoort bij de speler (bezit.x.menuTold, zoals bezit.x.told). Samen spelen: lokaal per speler, geen netwerkverkeer.
import { storyWorldOpen, storyFlag } from './storyquery.js';
import { setRevealSource, nextReveals, migrateTold } from './featurereveal.js';
import { getBoerderij } from './boerderijlive.js';
import { getBezit } from './bezitlive.js';
import { getCareer } from './voetbalcarrierelive.js';
import { FOOTBALL_FLAG, FARM_FLAG } from './careerdebut.js';

const EVERY_S = 2;
let t = EVERY_S;

const safe = (fn) => { try { return !!fn(); } catch (e) { return false; } };

// Wat de speler al heeft (nooit wegmoffelen; gate 0.65: een akker is begonnen met een perceel, niet met speluren: boerderijBegonnen telt elke verstreken spelklok en hield Land en bedrijf in een nieuw spel meteen open): een begonnen akker of gekocht perceel, een pand, een gestarte club, of de vlag van de begincutscene.
export function owns(world) {
  if (world === 'farm') return safe(() => !!getBoerderij().perceel) || safe(() => storyFlag(FARM_FLAG)) || safe(() => (getBezit().totals.bought | 0) > 0);
  if (world === 'bezit') return safe(() => { const b = getBezit(); return Object.keys(b.bstate || {}).length > 0 || !!(b.buildings && b.buildings.size); });
  if (world === 'voetbal') return safe(() => getCareer().started) || safe(() => storyFlag(FOOTBALL_FLAG));
  return false;
}

export function initFeatureReveal() {
  setRevealSource({ open: storyWorldOpen, owns });
}

// `legacy`: de poort van deze save is oud ("alles open"): wie al voorbij het moment is krijgt alles meteen, zonder melding. Mag een functie zijn: die wordt alleen op de tik van 2 s aangeroepen.
export function updateFeatureReveal(dt, w, legacy) {
  if (!w || typeof document === 'undefined' || !document.body.classList.contains('game-started')) return;
  t += dt;
  if (t < EVERY_S) return;
  t = 0;
  let b;
  try { b = getBezit(); } catch (e) { return; }
  if (!b || !b.x) return;
  const mig = migrateTold(Array.isArray(b.x.menuTold) ? b.x.menuTold.filter((k) => typeof k === 'string').slice(0, 16) : undefined, typeof legacy === 'function' ? !!legacy() : legacy);
  const r = mig.silent ? { told: mig.told, notes: [] } : nextReveals(mig.told);
  if (!Array.isArray(b.x.menuTold) || r.told.length !== b.x.menuTold.length) b.x.menuTold = r.told;
  if (typeof w.addMessage === 'function') for (const text of r.notes) w.addMessage(text, 6, { kind: 'tip', key: `menu-onthuld-${text}`, important: true });
}
