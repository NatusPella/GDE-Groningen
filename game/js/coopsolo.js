// Alleen spelen is sinds #554 een sessie van één: dezelfde gastheer-sessie als
// Samen spelen, maar met ruimte voor alleen de speler zelf (#553, besluit van de
// eigenaar). Zo lopen alle functies door hetzelfde multiplayer-pad en werkt een
// latere gast of hostwissel precies zoals in een gewone sessie; de hub heeft
// geen gasten en er gaat niets naar buiten (geen aankondiging, geen poort).
//
// De sessie start pas als het spel te besturen is en er geen Samen-scherm open
// staat (main.js); wie Samen spelen opent, stopt de solo-sessie eerst en de
// lobby neemt het over. Stoppen kan altijd met stopSoloHost().

import { handshakeInfo, startHost, stopCoopNet } from './coopnet.js';

export const SOLO_MAX = 1;

export const isSoloHost = (world) => !!(world && world.coopSolo && world.coopNet && world.coopRole === 'host');

// Start de sessie van één. Bestaat er al een sessie (of een hostwissel), dan
// doet deze niets en geeft hij null terug.
export function startSoloHost(world, opts = {}) {
  if (!world || world.coopNet || world.coopWissel) return null;
  const info = opts.info || handshakeInfo({ tiles: opts.tiles || '-', story: opts.story || 'nieuw' });
  startHost(world, info, { seed: opts.seed ?? 1, max: SOLO_MAX, solo: true, ...(opts.host || {}) });
  world.coopSolo = true;
  return world.coopNet || null;
}

export function stopSoloHost(world) {
  if (!world || !world.coopSolo) return false;
  world.coopSolo = false;
  try { stopCoopNet(world); } catch (e) { /* de sessie was al weg */ }
  return true;
}



