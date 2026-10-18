// Samen spelen (#95): N spelers. De host (sterntopologie) speelt Tammo, de eerste
// gast Tessa (vaste personages); extra spelers (3e, 4e, ... tot het ingestelde
// maximum) spelen een eigen figuur uit een vaste lijst, zonder hoofdrol in het
// verhaal: ze doen mee in de open wereld en bij de coöp-activiteiten.
// Pure logica: de lijst met spelers (roster), plekken, figuren en kleuren,
// verwijderen, en wat er gebeurt als iemand wegvalt. Geen DOM, geen netwerk.

export const MIN_MAX = 4;   // de online modus laat minimaal 4 spelers toe
export const ABS_MAX = 8;   // harde bovengrens van het protocol
export const DEFAULT_MAX = 4;

// De vaste personages van de eerste twee plekken.
export const MAIN_CHARS = [
  { id: 'tammo', naam: 'Tammo', kleur: '#4fb3ff', vorm: 'driehoek' },
  { id: 'anita', naam: 'Tessa', kleur: '#ff7ab8', vorm: 'ruit' }, // 'anita' is het id van Tessa in storyarc
];
// Extra figuren: NPC-achtig, met een eigen uiterlijk (kleur/kleding) en naam. Verzonnen namen (constitution 2).
export const EXTRA_CHARS = [
  { id: 'rik', naam: 'Rik', kleur: '#f2b134', vorm: 'vierkant', kleding: 'geel overhemd' },
  { id: 'sanne', naam: 'Sanne', kleur: '#5bd6a0', vorm: 'cirkel', kleding: 'groene jas' },
  { id: 'bram', naam: 'Bram', kleur: '#b78cff', vorm: 'vijfhoek', kleding: 'paarse trui' },
  { id: 'lotte', naam: 'Lotte', kleur: '#ff9a62', vorm: 'ster', kleding: 'oranje regenjas' },
  { id: 'daan', naam: 'Daan', kleur: '#6fd3e0', vorm: 'plus', kleding: 'lichtblauwe pet' },
  { id: 'fenna', naam: 'Fenna', kleur: '#e86a6a', vorm: 'kruis', kleding: 'rode sjaal' },
];
const ALL = [...MAIN_CHARS, ...EXTRA_CHARS];
export const charInfo = (id) => ALL.find((c) => c.id === id) || null;
export const slotChar = (slot) => (slot < MAIN_CHARS.length ? MAIN_CHARS[slot].id : null);

export const clampMax = (n) => Math.min(ABS_MAX, Math.max(MIN_MAX, Number.isInteger(n) ? n : DEFAULT_MAX));

export function createRoster(max = DEFAULT_MAX) {
  return { max: clampMax(max), spelers: [{ slot: 0, char: 'tammo', rol: 'host', verbinding: 'ok' }] };
}
export const bezet = (r) => r.spelers.map((s) => s.slot);
export const heeftPlek = (r) => r.spelers.length < r.max;
export const speler = (r, slot) => r.spelers.find((s) => s.slot === slot) || null;

// De host kan het maximum veranderen; zit er al meer volk, dan blijft het minstens zo groot als nu.
export function zetMax(r, n) { r.max = Math.max(clampMax(n), r.spelers.length); return r.max; }

// Eerste vrije plek en het personage dat erbij hoort. Plek 1 is altijd Tessa; vanaf plek 2 een figuur
// uit de lijst: de gewenste als die vrij is, anders de eerste vrije. Geeft { slot, char } of null (vol).
export function wijsPlekToe(r, wens = null) {
  if (!heeftPlek(r)) return null;
  const vrij = []; for (let s = 1; s < r.max; s++) if (!bezet(r).includes(s)) vrij.push(s);
  if (!vrij.length) return null;
  const slot = vrij[0];
  if (slot === 1) { r.spelers.push({ slot, char: 'anita', rol: 'gast', verbinding: 'ok' }); return { slot, char: 'anita' }; }
  const genomen = new Set(r.spelers.map((s) => s.char));
  const vrijeFiguren = EXTRA_CHARS.filter((c) => !genomen.has(c.id));
  if (!vrijeFiguren.length) return null;
  const gekozen = vrijeFiguren.find((c) => c.id === wens) || vrijeFiguren[0];
  r.spelers.push({ slot, char: gekozen.id, rol: 'gast', verbinding: 'ok' });
  return { slot, char: gekozen.id };
}
export function verwijder(r, slot) {
  if (slot === 0) return false; // de host gaat nooit uit de lijst
  const i = r.spelers.findIndex((s) => s.slot === slot);
  if (i < 0) return false;
  r.spelers.splice(i, 1); return true;
}
export function zetVerbinding(r, slot, v) { const s = speler(r, slot); if (s) s.verbinding = v; return !!s; }

// Wat de ander ziet: naam, kleur, vorm per speler (de volgorde is de slotvolgorde).
export function lijst(r) {
  return [...r.spelers].sort((a, b) => a.slot - b.slot).map((s) => {
    const c = charInfo(s.char) || {};
    return { slot: s.slot, char: s.char, naam: c.naam || '?', kleur: c.kleur || '#cccccc', vorm: c.vorm || 'cirkel', rol: s.rol, verbinding: s.verbinding, hoofdrol: s.slot < 2 };
  });
}
// Kort bericht met de lijst voor alle spelers (reliable event); de ontvanger controleert het.
export const lijstEvent = (r) => ({ k: 'spelers', max: r.max, lijst: lijst(r).map(({ slot, char, rol, verbinding }) => ({ slot, char, rol, verbinding })) });
export function leesLijstEvent(b) {
  if (!b || b.k !== 'spelers' || !Array.isArray(b.lijst) || b.lijst.length > ABS_MAX) return null;
  const seen = new Set(); const out = [];
  for (const s of b.lijst) {
    if (!s || !Number.isInteger(s.slot) || s.slot < 0 || s.slot >= ABS_MAX || seen.has(s.slot) || !charInfo(s.char)) return null;
    seen.add(s.slot); out.push({ slot: s.slot, char: s.char, rol: s.rol === 'host' ? 'host' : 'gast', verbinding: ['ok', 'lag', 'lost'].includes(s.verbinding) ? s.verbinding : 'ok' });
  }
  return { max: clampMax(b.max), spelers: out };
}

// Pauze bij wegvallen, per speler. Tessa (de eerste gast) is een hoofdpersoon: het spel wacht op haar.
// Een extra speler houdt de rest niet op, tenzij de missie of activiteit hem nodig heeft.
// ctx: { vereist: [slots die de huidige missie of activiteit nodig heeft] }
export function holdBeleid(slot, ctx = {}) {
  if (slot === 1) return { pauze: true, reden: 'Tessa is weg; het spel wacht op haar.' };
  if (slot >= 2 && (ctx.vereist || []).includes(slot)) return { pauze: true, reden: 'De opdracht kan niet zonder deze speler.' };
  return { pauze: false, reden: slot >= 2 ? 'Het spel gaat door; de speler kan terugkomen.' : '' };
}

// Rol van een slot in het hoofdverhaal: hoofdpersonen spelen mee, extra spelers lopen in de open wereld.
export function verhaalRol(slot) { return slot === 0 ? 'host-hoofdrol' : slot === 1 ? 'gast-hoofdrol' : 'wereld'; }
