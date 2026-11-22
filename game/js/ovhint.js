// De lichte OV-/taxihint (#1091, eigenaarsmelding 21-11): bij een ver doel zegt het ANDERE personage (wie je niet speelt) een
// korte zin dat het ook met de taxi of het OV kan, in plaats van een keuzescherm met 1, 2 en 3 dat het spel stilzet.
// Puur: geen DOM, geen wereld, geen opslag. De dunne laag (ovhintlive.js) leest de wereld, bewaart de stand per apparaat en
// toont de kaart. De bewuste keuze via de kaart (Reis erheen) blijft het enige echte aanbod. Tests: scripts/ovhint_test.mjs.
//
// Samen spelen: de hint is lokaal en per speler. Een gast kan niet reizen (de wereld is van wie het spel opende, kaartactie
// GAST_REIS_MELDING), dus krijgt hij geen hint. Er hangt geen beloning of voortgang aan.
import { OV_HINT_LINES } from './ovhintlines.js';

export const FAR_M = 4000;                  // m hemelsbreed: pas daarboven is het doel echt ver
export const GAP_S = 600;                   // spelseconden tussen twee hints
export const MAX_UNUSED_SHOWS = 4;        // zo vaak getoond zonder dat de speler OV/taxi pakte, daarna zwijgt de hint
export const GENOEG_GEBRUIKT = 3;           // wie het OV of de taxi zo vaak pakte, weet het
export const STIL_NA_GEBRUIK_MS = 30 * 60 * 1000; // direct na een rit met OV/taxi geen hint
export const TAXI_MIN_MONEY = 25;            // eronder past een taxi niet bij een hint
export const HALTE_NABIJ_M = 600;           // een halte zo dichtbij: het OV is een optie (ovopties STOP_NEAR_M)
export const GOAL_CELL_M = 800;             // doelen in dezelfde cel tellen als één doel (één hint per doel)

// Redenen waarom het scherm van de speler van iets anders is. Eerste die geldt wint; de sleutels leest ovhintlive.js uit de wereld.
export const BEZET_REDENEN = ['pauze', 'dood', 'cinematic', 'verhaal', 'missie', 'bijbaan', 'minigame', 'race', 'achtervolging', 'gevecht', 'telefoon', 'paneel', 'kaart'];
export const bezetReden = (bezet) => BEZET_REDENEN.find((r) => bezet && bezet[r]) || null;

// Vervoer waarin een hint niets zegt: je zit al in een bus, boot, trein of in de lucht.
export const SILENT_TRANSPORT = ['bus', 'boot', 'lucht', 'trein', 'ov'];

export const freshState = () => ({ getoond: 0, gebruikt: 0, gebruiktOp: 0, laatsteId: '' });

// Opslag: kapotte of vreemde data wordt een lege stand.
export function readState(raw) {
  try {
    const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!d || typeof d !== 'object') return freshState();
    const n = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
    return { getoond: n(d.getoond), gebruikt: n(d.gebruikt), gebruiktOp: Number.isFinite(d.gebruiktOp) ? d.gebruiktOp : 0, laatsteId: typeof d.laatsteId === 'string' ? d.laatsteId.slice(0, 40) : '' };
  } catch (e) {
    return freshState();
  }
}

export const state2json = (s) => JSON.stringify({ getoond: s.getoond, gebruikt: s.gebruikt, gebruiktOp: s.gebruiktOp, laatsteId: s.laatsteId });

// De speler pakte het OV of een taxi (een rit via de kaart of het verhaal).
export function noteGebruikt(stand, nuMs) {
  return { ...stand, gebruikt: stand.gebruikt + 1, gebruiktOp: nuMs };
}

export const goalKey = (g) => `${Math.floor(g.x / GOAL_CELL_M)},${Math.floor(g.y / GOAL_CELL_M)}`;

// Welke soorten regels passen: met een halte dichtbij mag het OV genoemd worden, anders alleen de taxi.
export const kindsFor = ({ halteNabij }) => (halteNabij ? ['beide', 'taxi'] : ['taxi']);

// Wisselend: nooit twee keer dezelfde regel achter elkaar (als er een keuze is). rnd: () => [0,1).
export function pickLine(soorten, laatsteId, rnd = Math.random, regels = OV_HINT_LINES) {
  const pool = regels.filter((r) => soorten.includes(r.soort));
  if (!pool.length) return null;
  const anders = pool.filter((r) => r.id !== laatsteId);
  const uit = anders.length ? anders : pool;
  return uit[Math.min(uit.length - 1, Math.floor(rnd() * uit.length))];
}

// Wie spreekt: het andere personage (hudcards.js companionSays gebruikt dezelfde regel: Tammo als je Anita speelt).
export const sprekerVoor = (character) => (character === 'anita' ? 'Tammo' : 'Anita');

// i: { goal: {x,y} | null, speler: {x,y}, nu (spelseconden), nuMs (echte tijd), aan (instelling Uitleg voor nieuwe spelers),
//      rol: 'host' | 'gast' | null, vervoer: 'voet' | 'auto' | 'fiets' | 'bus' | ..., halteNabij, geld, bezet: { reden: bool } }
// s: de stand per apparaat (freshState), sessie: { laatsteAt (-Infinity), doelen: Set } van deze sessie.
// Geeft { regel, soorten, doel } of null; hij verandert niets (de aanroeper roept gaToond() aan na het tonen).
export function beslis(i, s, sessie, opties = {}) {
  if (i.aan === false) return null;
  if (i.rol === 'gast') return null;                                   // een gast kan niet reizen
  if (!i.goal || !i.speler) return null;
  if (bezetReden(i.bezet)) return null;
  if (SILENT_TRANSPORT.includes(i.vervoer)) return null;
  const d = Math.hypot(i.goal.x - i.speler.x, i.goal.y - i.speler.y);
  if (!(d >= FAR_M)) return null;
  if (s.gebruikt >= GENOEG_GEBRUIKT) return null;
  if (s.gebruikt === 0 && s.getoond >= MAX_UNUSED_SHOWS) return null;
  // een tijd in de toekomst (systeemklok teruggezet) telt als verlopen, anders zweeg de hint voor altijd
  const sindsGebruik = i.nuMs - s.gebruiktOp;
  if (s.gebruiktOp && sindsGebruik >= 0 && sindsGebruik < STIL_NA_GEBRUIK_MS) return null;
  // na het laden van een oudere save loopt de spelklok terug: dan begint de wachttijd opnieuw
  if (i.nu < sessie.laatsteAt) sessie.laatsteAt = -Infinity;
  if (i.nu - sessie.laatsteAt < GAP_S) return null;
  const sleutel = goalKey(i.goal);
  if (sessie.doelen.has(sleutel)) return null;
  const halteNabij = !!i.halteNabij;
  if (!halteNabij && !(i.geld >= TAXI_MIN_MONEY)) return null;          // geen halte en geen geld voor een taxi: niets te hinten
  const kinds = kindsFor({ halteNabij });
  const line = pickLine(kinds, s.laatsteId, opties.rnd);
  return line ? { regel: line, soorten: kinds, doel: sleutel } : null;
}

// Na het tonen: de stand (opslaan) en de sessie (in het geheugen) bijwerken.
export function gaToond(s, sessie, besluit, nu) {
  sessie.laatsteAt = nu;
  sessie.doelen.add(besluit.doel);
  return { ...s, getoond: s.getoond + 1, laatsteId: besluit.regel.id };
}

export const verseSessie = () => ({ laatsteAt: -Infinity, doelen: new Set() });
