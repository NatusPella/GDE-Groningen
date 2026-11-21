// Wereld, beeld en geluid van de voetbalcarrière als pure gegevens en regels (#1115, epic #1106, docs/VOETBAL-CARRIERE-21-11.md hoofdstuk 10): geen DOM en geen THREE (scripts/voetbal_wereld_test.mjs).
// Wat hier staat is de BESLISSING (patronen, aantallen, namen van geluiden, bijschriften, kaartmarkers, trainende teams); het tekenen (canvas, InstancedMesh) hangt eraan in voetbal.js en is niet door een mens in beeld bekeken
// (docs/VOETBAL-CARRIERE-VERIFICATIE-21-11.md). Geluiden: alleen CC0 of CC-BY van Freesound, Kenney of OpenGameArt (ADR 0039) met de handle in docs/AUDIO-LICENTIES.md; zonder bestand valt het geluid terug op gefilterde ruis
// (WebAudio). Geen liedjes of zang met tekst. Elk geluid heeft een bijschrift (ui-taal regel 4).
import { hashSeed } from './voetbalspelers.js';
import { makeRng } from './minigamekit.js';

// ---- shirts: een patroon per club zodat kleur nooit het enige verschil is (128 x 128, voor beide teams hergebruikt) ----
export const SHIRT_SIZE = 128;
// Geeft de vlakken van een shirttextuur als rechthoeken { x, y, w, h, kleur: 'shirt' | 'accent' } op een raster van 128; de tekenaar vult ze met de kleuren van het team.
export function shirtRects(patroon) {
  const S = SHIRT_SIZE;
  switch (patroon) {
    case 'brede-streep': return [0, 1, 2, 3].map((i) => ({ x: i * 32, y: 0, w: 32, h: S, kleur: i % 2 ? 'accent' : 'shirt' }));
    case 'smalle-streep': return Array.from({ length: 8 }, (_, i) => ({ x: i * 16, y: 0, w: 16, h: S, kleur: i % 2 ? 'accent' : 'shirt' }));
    case 'helften': return [{ x: 0, y: 0, w: S / 2, h: S, kleur: 'shirt' }, { x: S / 2, y: 0, w: S / 2, h: S, kleur: 'accent' }];
    default: return [{ x: 0, y: 0, w: S, h: S, kleur: 'shirt' }];
  }
}
const hex = (v) => `#${(v >>> 0).toString(16).padStart(6, '0')}`;
// Tekent het shirt op een canvas-context (de aanroeper maakt de canvas): geen logo, geen wapen, alleen vlakken.
export function drawShirt(ctx, team) {
  for (const r of shirtRects(team.patroon)) { ctx.fillStyle = hex(r.kleur === 'accent' ? (team.accent != null ? team.accent : team.broek) : team.shirt); ctx.fillRect(r.x, r.y, r.w, r.h); }
}
// Twee teams moeten op het veld te onderscheiden zijn: een andere kleur of een ander patroon, anders speelt de uitploeg in het keepershirt-palet. Geeft true als er iets te kiezen valt.
export const colorDistance = (a, b) => Math.hypot(((a >> 16) & 255) - ((b >> 16) & 255), ((a >> 8) & 255) - ((b >> 8) & 255), (a & 255) - (b & 255));
export function awayKit(home, away) {
  if (colorDistance(home.shirt, away.shirt) >= 90 || home.patroon !== away.patroon) return away;
  return { ...away, shirt: away.keeperShirt != null ? away.keeperShirt : away.broek, patroon: 'effen' };
}

// ---- publiek: een InstancedMesh met 600 tot 2.000 toeschouwers, vulling per capaciteitsfase; een tijdoffset in de shader, geen CPU-update per persoon ----
export const CROWD = { min: 600, max: 2000, budgetMs: 0.3 };
export const crowdCount = ({ capacity = 800, fill = 0.7 } = {}) => Math.round(Math.min(CROWD.max, Math.max(CROWD.min, capacity * Math.min(1, Math.max(0.2, fill)))));
// De vulling volgt de klasse, de plek in de stand en de vorm: een volle Kroonklasse, een lege Talentenklasse.
export const crowdFill = (division, rank = 4, form = 1) => Math.min(1, Math.max(0.2, ({ talent: 0.35, terp: 0.55, kroon: 0.8, europa: 0.95 }[division] || 0.4) + (4.5 - rank) * 0.03 + (form - 1) * 0.6));
export const crowdState = (fase, tijdSindsGoal = 99) => (fase === 'goal' || tijdSindsGoal < 4 ? 'juichen' : 'zitten');
// De plekken: rijen op twee tribunes langs de lange zijden (deterministisch uit het zaad); `reduceMotion` of de laagste kwaliteit: stilstaand (geen animatie) of uit.
export function crowdSeats(count, seed, { B = 56, L = 90, rows = 14 } = {}) {
  const rng = makeRng(hashSeed('crowd', seed));
  const out = [];
  for (let i = 0; i < count; i++) {
    const zijde = i % 2 ? 1 : -1, rij = Math.floor(rng() * rows), langs = (rng() - 0.5) * (L - 4);
    out.push({ x: zijde * (B / 2 + 4 + rij * 0.8), y: langs, z: 1 + rij * 0.55, fase: rng() });
  }
  return out;
}
export const crowdVisible = ({ reduceMotion = false, quality = 'hoog' } = {}) => (quality === 'laagst' ? 'uit' : reduceMotion ? 'stil' : 'animatie');

// ---- geluid: de keuze van een geluid bij een wedstrijdgebeurtenis, met bijschrift; zonder bestand valt het terug op gefilterde ruis ----
export const CUES = {
  fluit_aftrap: { tekst: 'Fluitsignaal: de aftrap', bron: 'fluit', synth: { type: 'toon', freq: 2900, duur: 0.35 } },
  fluit_einde: { tekst: 'Fluitsignaal: het einde', bron: 'fluit', synth: { type: 'toon', freq: 2900, duur: 0.8 } },
  fluit_overtreding: { tekst: 'Fluitsignaal: overtreding', bron: 'fluit', synth: { type: 'toon', freq: 3100, duur: 0.3 } },
  publiek_loop: { tekst: 'Het publiek zingt zonder woorden', bron: 'crowd', synth: { type: 'ruis', filter: 900, duur: 4 } },
  doelpunt: { tekst: 'Het publiek brult: doelpunt', bron: 'crowd', synth: { type: 'ruis', filter: 1600, duur: 2.4 } },
  teleurgesteld: { tekst: 'Het publiek mompelt teleurgesteld', bron: 'crowd', synth: { type: 'ruis', filter: 500, duur: 1.6 } },
};
export const CUE_FOR_EVENT = { aftrap: 'fluit_aftrap', eind: 'fluit_einde', overtreding: 'fluit_overtreding', doelpunt: 'doelpunt', gemist: 'teleurgesteld', paal: 'teleurgesteld' };
export const cueFor = (event) => (CUE_FOR_EVENT[event] ? { id: CUE_FOR_EVENT[event], ...CUES[CUE_FOR_EVENT[event]] } : null);
// Het volume van het publiek volgt de spanning: dichte stand en de laatste minuten zijn luider; nooit boven 1 en volgt het effectvolume van de speler.
export const crowdVolume = ({ tension = 0, fill = 0.5, effects = 1 } = {}) => Math.round(Math.min(1, (0.25 + 0.5 * fill + 0.25 * tension)) * Math.min(1, Math.max(0, effects)) * 100) / 100;
export const tension = ({ klok = 60, duur = 150, verschil = 0 } = {}) => Math.min(1, (1 - Math.min(1, klok / duur)) * 0.6 + (Math.abs(verschil) <= 1 ? 0.4 : 0));

// ---- kaartlaag Voetbal: alleen wat in beeld is; de club van de speler, de volgende tegenstander en de trainingsvelden ----
export function parkMarkers(index, bounds, { homeId = null, nextId = null } = {}) {
  const out = [];
  for (const c of index.clubs) {
    const p = c.park;
    if (p.x < bounds.x0 || p.x > bounds.x1 || p.y < bounds.y0 || p.y > bounds.y1) continue;
    const type = c.id === homeId ? 'thuis' : c.id === nextId ? 'volgende' : 'park';
    out.push({ id: c.id, x: p.x, y: p.y, type, label: c.naam, sub: type === 'thuis' ? 'Jouw club' : type === 'volgende' ? 'Volgende tegenstander' : `${c.plaats}: ${c.trainingsvelden.length + 1} velden` });
    if (type === 'thuis') for (const t of c.trainingsvelden) if (t.x >= bounds.x0 && t.x <= bounds.x1 && t.y >= bounds.y0 && t.y <= bounds.y1) out.push({ id: `${c.id}:t`, x: t.x, y: t.y, type: 'training', label: 'Trainingsveld', sub: c.naam });
  }
  return out.slice(0, 120);
}

// ---- trainende teams op de velden binnen 150 m van de speler: 6 tot 10 poppetjes en een bal, geen sim, uit als de speler weg is ----
export const TRAIN_RADIUS = 150;
export function trainingSquads(index, player, seed = 1) {
  const out = [];
  for (const c of index.clubs) {
    for (const p of [c.park, ...c.trainingsvelden]) {
      if (Math.hypot(p.x - player.x, p.y - player.y) > TRAIN_RADIUS) continue;
      const rng = makeRng(hashSeed('train', seed, c.id, Math.round(p.x)));
      out.push({ club: c.id, x: p.x, y: p.y, r: p.r, n: 6 + Math.floor(rng() * 5), shirt: c.shirt, patroon: c.patroon });
    }
  }
  return out.slice(0, 6);
}
