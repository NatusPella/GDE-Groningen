// Minigame-foley (#460): de drie minigames die wel een stem hadden maar geen
// eigen geluid — discgolf (discgolf.js), het skatepark (skatepark.js) en de
// klimtoren (klimtoren.js) — krijgen hier hun effecten. Dit bestand is puur:
// per gebeurtenis van de spellogica staat er welk geluid erbij hoort, met het
// niveau en waar het vandaan komt (MINIGAME_FX). De minigame duwt het resultaat
// met pushFoley de gewone audio-rij in (`world.audioEvents`), die audio.js al
// afspeelt; hier staat dus geen Web Audio, geen wereld en geen timer, zodat
// scripts/minigamefoley_test.mjs de tabel kan nalopen.
//
// Samen spelen: deze geluiden zijn van de speler die speelt. Elke speler heeft
// zijn eigen potje (het eigen scherm, dezelfde baan), dus de minigame duwt ze in
// zijn eigen wereld en niet naar de host; er komt niets in de snapshot en er is
// geen tweede speler die hetzelfde geluid nog eens hoort.

// De rij van audio.js: world.audioEvents, met hetzelfde plafond als
// pushAudioEvent (pedgeom.js). Hier inline zodat dit bestand niets van de
// wereld of van Three hoeft te importeren.
const MAX_EVENTS = 64;

// De effecten van fxbank.js die alleen een minigame gebruikt (audit en
// linkup-test zien hier hun bron). De rest van de gebeurtenissen leent een
// bestaand geluid (de plons) en staat daarom niet in deze tabel.
export const MINIGAME_FX = {
  disc_whoosh: 'discgolf.js: throwDisc (de worp)',
  disc_ketting: 'discgolf.js: afterFlight (de disc raakt de kettingen, erin of er weer uit)',
  disc_boom: 'discgolf.js: afterFlight (de disc tegen een boom)',
  skate_pop: 'skatepark.js: onEvent air met pop (de tail tikt)',
  skate_land: 'skatepark.js: onEvent land (weer op het beton)',
  skate_grind: 'skatepark.js: onEvent grind (over een leuning)',
  skate_val: 'skatepark.js: onEvent bail en grindfall (vallen)',
  klim_greep: 'klimtoren.js: stepClimb grip (de hand sluit om de greep)',
  klim_kalk: 'klimtoren.js: stepClimb chalk (magnesium)',
  klim_val: 'klimtoren.js: stepClimb fall (op de mat)',
};

const fx = (name, gain) => (gain === undefined ? { kind: 'fx', name } : { kind: 'fx', name, gain });
const clamp01 = (x) => Math.max(0, Math.min(1, Number(x) || 0));

// Discgolf: de worp sist weg, de kettingen rinkelen (dat is het geluid van de
// sport), een boom klinkt dof en een plons is de plons van het water.
// ev: { type: 'worp', power } of { type: 'landing', reason, holed }.
export function discgolfFx(ev) {
  if (!ev) return [];
  if (ev.type === 'worp') return [fx('disc_whoosh', 0.55 + 0.45 * clamp01(ev.power))];
  if (ev.type !== 'landing') return [];
  if (ev.holed) return [fx('disc_ketting', 1)];
  if (ev.reason === 'rattle') return [fx('disc_ketting', 0.85)];
  if (ev.reason === 'tree') return [fx('disc_boom', 0.9)];
  if (ev.reason === 'water') return [{ kind: 'splash' }];
  return [];
}

// Skatepark: de pop van de tail, het staal van de leuning, de landing (harder
// van hoger) en de klap van een val. ev is een gebeurtenis van
// skatetricks.js stepBoard: { type, height, pop, why }.
export function skateFx(ev) {
  if (!ev) return [];
  switch (ev.type) {
    case 'air': return ev.pop ? [fx('skate_pop', 0.9)] : [];
    case 'grind': return [fx('skate_grind', 0.9)];
    case 'land': return [fx('skate_land', 0.65 + 0.6 * clamp01((ev.height || 0) / 2.5))];
    case 'bail': case 'grindfall': return [fx('skate_val', 0.95)];
    default: return [];
  }
}

// Klimtoren: de hand op de greep, magnesium tussen de handen, en de mat. De
// gebeurtenissen komen uit climbrules.js stepClimb: { type, hold, height }.
export function climbFx(ev) {
  if (!ev) return [];
  switch (ev.type) {
    case 'grip': return [fx('klim_greep', ev.hold && ev.hold.big ? 1 : 0.85)];
    case 'chalk': return [fx('klim_kalk')];
    case 'fall': return [fx('klim_val', 0.8 + 0.4 * clamp01((ev.height || 0) / 12))];
    default: return [];
  }
}

// De lijst van een minigame in de audio-rij van deze wereld, op een plek (zonder
// x en y klinkt het bij de speler, en dat is hier de speler zelf).
export function pushFoley(world, list, x, y) {
  if (!world || !list || !list.length) return 0;
  if (!world.audioEvents) world.audioEvents = [];
  let n = 0;
  for (const e of list) {
    if (world.audioEvents.length >= MAX_EVENTS) break;
    world.audioEvents.push(x === undefined ? e : { ...e, x, y });
    n++;
  }
  return n;
}
