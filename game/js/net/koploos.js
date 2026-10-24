// Samen spelen (#450): de gastheer zonder lokale speler. De rol van gastheer hoort bij de sessie, niet bij de speler die
// het spel opende: een wereld zonder speler (koploos, zonder venster) draait dezelfde hub en dezelfde protocolberichten.
// Dit is de enige plek die weet welke lichamen zo'n wereld heeft: plek 0 heeft er geen, elke gast (plek 1 en hoger) is een
// figuur die de hub zelf simuleren kan. coopplayers.js houdt plek 0 in de lijst (het protocol verandert niet); de hub
// slaat hem in de snapshots over zolang er geen speler is.

export const isKoploos = (net) => !!(net && net.koploos === true);

// De figuur van een plek in de wereld van de gastheer (coopclient.ensureFigure maakt hem).
export const figuurVan = (world, slot) => ((world && world.coopFigures) || {})[slot] || null;

// Welk lichaam hoort bij een plek? In een gewone wereld is plek 0 de speler en plek 1 zijn metgezel; zonder speler is er
// geen van beide en simuleren alle gasten (plek 1 en hoger) een eigen figuur.
export function lichaamVan(world, slot, koploos) {
  const k = koploos === undefined ? isKoploos(world && world.coopNet) : !!koploos;
  if (slot === 0) return k ? null : ((world && world.player) || null);
  if (k) return figuurVan(world, slot);
  if (slot === 1) return (world && world.companion) || null;
  return figuurVan(world, slot);
}

// De eerste plek met een eigen figuur: zonder lokale speler is dat plek 1 (de gast die anders Tessa zou zijn).
export const eersteGastPlek = (koploos) => (koploos ? 1 : 2);

// Waar komt een nieuwe speler in een koploze wereld? Er is geen speler om naast te staan: de server geeft een startplek
// (world.start of de oorsprong) en zet de spelers daar in een rij. Met een speler is het de oude regel (naast hem).
export function startPlek(world, slot = 1) {
  const p = world && world.player;
  const basis = p && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : ((world && world.start) || { x: 0, y: 0 });
  const x = Number.isFinite(basis.x) ? basis.x : 0, y = Number.isFinite(basis.y) ? basis.y : 0;
  return { x: x + 1.5 * Math.max(0, (slot | 0) - 1), y: y + 1.5 };
}

// De wereld van een server: geen speler en geen metgezel, wel de klok, het weer en de opdracht. Alles wat de hub nodig
// heeft staat erin; verkeer, voetgangers en dieren laat de server leeg of vult hij zelf (die ontstaan rond de spelers).
export function koplozeWereld(opt = {}) {
  const { x = 0, y = 0 } = opt.start || {};
  const berichten = [];
  return {
    player: null, companion: null, coop: { local: false }, start: { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 },
    money: 0, wanted: 0, clock: Number.isFinite(opt.clock) ? opt.clock : 12, time: 0, camYaw: 0,
    paused: false, messages: berichten, addMessage(tekst) { berichten.push(String(tekst)); },
    vehicles: [], pedestrians: [], wildlife: [], mission: { phase: 'idle' },
    weatherState: opt.weatherState || null, calendar: opt.calendar || null, input: null,
  };
}
