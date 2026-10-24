// Katten en honden aaien (#437): dichtbij een tamme kat of een hond aan de lijn krijg je een toetstip (E, Aaien).
// De speler zakt door de knieën en strijkt over de vacht, het dier gaat zitten, spint of kwispelt, en na een
// paar tellen krijg je een klein beloninkje (+5 gezondheid) en telt het mee voor de prestatie 'Knuffelkampioen'.
// Alles hier is puur (geen three.js): wildlife.js leest `a.aaiT` voor de reactie van het dier, scene3d.js de
// `player.aaien` voor de houding. Een gast in een coöp-sessie doet dit niet (hij draait geen dierenwereld).
import { recordStat } from './achievements.js';

export const AAI_M = 2;          // binnen deze afstand (m) kan het
export const AAI_S = 2.4;        // duur van één aai (s)
export const AAI_BELOONING_U = 0.55; // vanaf dit deel van de aai valt de beloning
export const AAI_HP = 5;
export const AAI_PAUZE_S = 20;   // hetzelfde dier wil niet meteen weer
export const AAI_STAT = 'aaien';

// Wie mag worden geaaid: een kat (alleen een tamme: een schuwe loopt weg), een hond bij zijn baasje.
// Niet: een dood, vluchtend, losgelopen of agressief dier, of een dier dat net is geaaid.
export function aaibaar(a, nu = 0) {
  if (!a || a.dead || a.gone || a.ontvoerd || a.agressief) return false;
  if (a.kind !== 'cat' && a.kind !== 'dog') return false;
  if (a.state === 'flee' || a.state === 'stray') return false;
  if (a.kind === 'cat' && !a.tam) return false;
  if (a.aaiNaT != null && nu < a.aaiNaT) return false;
  return typeof a.x === 'number' && typeof a.y === 'number';
}

// Het dichtstbijzijnde aaibare dier binnen AAI_M, of null.
export function zoekAaibaar(dieren, p, nu = 0) {
  let best = null, bd = AAI_M;
  for (const a of dieren || []) {
    if (!aaibaar(a, nu)) continue;
    const d = Math.hypot(a.x - p.x, a.y - p.y);
    if (d <= bd) { bd = d; best = a; }
  }
  return best;
}

// Kan de speler nu aaien? (te voet, niet zwemmend, niet in een activiteit of in beeld)
export function magAaien(w) {
  const p = w && w.player;
  if (!p || p.inVehicle || p.swimming || p.dead || (w.health != null && w.health <= 0)) return false;
  if (w.paused || w.uiPaused || w.activityGame || w.padelGame || w.pigeonMode || w.cinematicHidePlayers || w.coopInVoertuig) return false;
  return true;
}

export function aaiPrompt(w) {
  if (!magAaien(w)) return null;
  if (w.player.aaien) return null;
  const a = zoekAaibaar(w.wildlife, w.player, w.time);
  if (!a) return null;
  const naam = a.kind === 'cat' ? 'de kat' : 'de hond';
  return { id: 'aaien-' + a.kind, x: a.x, y: a.y, h: 0.9, key: 'E', label: 'Aaien', sub: `Even over ${naam} strijken`, ring: true };
}

// E: de aai begint. Het dier gaat zitten en kijkt naar je, de speler zakt door de knieën.
export function startAaien(w) {
  if (!magAaien(w) || w.player.aaien) return false;
  const a = zoekAaibaar(w.wildlife, w.player, w.time);
  if (!a) return false;
  w.player.aaien = { dier: a, t: 0, u: 0, beloond: false };
  a.aaiT = AAI_S;
  a.aaiNaT = w.time + AAI_PAUZE_S;
  if (a.kind === 'cat') { a.state = 'sit'; a.stateTimer = AAI_S + 1; a.speed = 0; }
  const q = w.audioEvents || (w.audioEvents = []);
  q.push({ kind: a.kind === 'cat' ? 'purr' : 'yip', x: a.x, y: a.y });
  w.player.angle = Math.atan2(a.y - w.player.y, a.x - w.player.x);
  return true;
}

export function tryAaien(w) {
  const input = w && w.input;
  if (!input || !(input.wasPressed('e') || input.wasPressed('f'))) return false;
  if (!aaiPrompt(w)) return false;
  input.consume('e');
  input.consume('f');
  return startAaien(w);
}

// Elk beeld. Wegrennen of een voertuig nemen breekt de aai af (dan geen beloning).
export function updateAaien(dt, w) {
  const p = w && w.player;
  if (!p || !p.aaien) return;
  const s = p.aaien, a = s.dier;
  const weg = !a || a.dead || a.gone || Math.hypot(a.x - p.x, a.y - p.y) > AAI_M + 0.8
    || p.inVehicle || p.swimming || Math.hypot(p.vx || 0, p.vy || 0) > 1.5 || !magAaien(w);
  if (weg) { if (a) a.aaiT = 0; p.aaien = null; return; }
  s.t += dt;
  s.u = Math.min(1, s.t / AAI_S);
  a.aaiT = Math.max(0, AAI_S - s.t);
  if (!s.beloond && s.u >= AAI_BELOONING_U) {
    s.beloond = true;
    beloon(w);
    if (a.kind === 'cat') (w.audioEvents || (w.audioEvents = [])).push({ kind: 'purr', x: a.x, y: a.y });
  }
  if (s.u >= 1) { a.aaiT = 0; p.aaien = null; }
}

// +5 gezondheid en een punt voor de prestatie; elke tiende aai een gezellig berichtje.
export function beloon(w) {
  if ((w.health || 0) < 100) w.health = Math.min(100, (w.health || 0) + AAI_HP);
  recordStat(w, AAI_STAT);
  const n = (w.aaiTelling = (w.aaiTelling || 0) + 1);
  w.addMessage && w.addMessage(n % 10 === 0 ? 'Dierenvriend in hart en nieren: nog eentje!' : 'Aaien: +5 gezondheid', 2.5);
}
