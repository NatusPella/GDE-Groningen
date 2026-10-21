// De schermen en situaties van het spel als graaf: welke toets gaat van het
// ene naar het andere, in welke controllersituatie (PAD_MAPS in controls.js).
// Pure data, geen DOM: scripts/padscreens_test.mjs controleert met alleen een
// pad dat elk scherm vanaf de titel bereikbaar is en weer te verlaten (#151).
import { PAD_MAPS } from './controls.js';

// from -> to, ctx = de PAD_MAPS-situatie die op `from` geldt, key = de toets die het nodig heeft
export const PAD_SCREEN_EDGES = [
  // titelscherm (menusituatie: A is Enter, B gaat terug)
  { from: 'titel', to: 'saveslots', ctx: 'menu', key: 'enter', note: 'Alleen spelen: Opgeslagen spellen' },
  { from: 'saveslots', to: 'voet', ctx: 'menu', key: 'enter', note: 'Doorgaan, Nieuw spel of een opgeslagen spel laden' },
  { from: 'titel', to: 'nieuws', ctx: 'menu', key: 'enter', note: 'Wat is er nieuw' },
  { from: 'nieuws', to: 'titel', ctx: 'menu', key: 'escape' },
  { from: 'saveslots', to: 'titel', ctx: 'menu', key: 'escape' },
  { from: 'saveslots', to: 'pauze', ctx: 'menu', key: 'escape', note: 'vanuit het pauzemenu geopend' },
  // pauze, kaart, telefoon
  { from: 'voet', to: 'pauze', ctx: 'foot', key: 'escape' },
  { from: 'voet', to: 'kaart', ctx: 'foot', key: 'm' },
  { from: 'kaart', to: 'voet', ctx: 'menu', key: 'm' },
  { from: 'kaart', to: 'voet', ctx: 'menu', key: 'escape' },
  { from: 'pauze', to: 'voet', ctx: 'menu', key: 'escape' },
  { from: 'pauze', to: 'telefoon', ctx: 'menu', key: 'enter' },
  { from: 'pauze', to: 'instellingen', ctx: 'menu', key: 'enter' },
  { from: 'pauze', to: 'besturing', ctx: 'menu', key: 'enter' },
  { from: 'pauze', to: 'saveslots', ctx: 'menu', key: 'enter' },
  { from: 'telefoon', to: 'pauze', ctx: 'menu', key: 'escape' },
  { from: 'instellingen', to: 'pauze', ctx: 'menu', key: 'escape' },
  { from: 'besturing', to: 'pauze', ctx: 'menu', key: 'escape' },
  { from: 'pauze', to: 'pauze', ctx: 'menu', key: ']', note: 'volgend tabblad' },
  { from: 'pauze', to: 'pauze', ctx: 'menu', key: '[', note: 'vorig tabblad' },
  // winkels en dialogen op straat
  { from: 'voet', to: 'winkel', ctx: 'foot', key: 'e' },
  { from: 'winkel', to: 'voet', ctx: 'menu', key: 'escape' },
  { from: 'voet', to: 'vraag', ctx: 'foot', key: 'e', note: 'vooruitspelen en andere ja/nee-vragen' },
  { from: 'vraag', to: 'voet', ctx: 'menu', key: 'escape' },
  // voertuigen
  { from: 'voet', to: 'auto', ctx: 'foot', key: 'e' },
  { from: 'auto', to: 'voet', ctx: 'vehicle', key: 'e' },
  { from: 'auto', to: 'pauze', ctx: 'vehicle', key: 'escape' },
  { from: 'auto', to: 'kaart', ctx: 'vehicle', key: 'm' },
  { from: 'voet', to: 'heli', ctx: 'foot', key: 'e' },
  { from: 'heli', to: 'voet', ctx: 'heli', key: 'e' },
  { from: 'heli', to: 'pauze', ctx: 'heli', key: 'escape' },
  { from: 'voet', to: 'skutsje', ctx: 'foot', key: 'e' },
  { from: 'skutsje', to: 'voet', ctx: 'skutsje', key: 'e' },
  { from: 'skutsje', to: 'pauze', ctx: 'skutsje', key: 'escape' },
  { from: 'voet', to: 'trein', ctx: 'foot', key: 'e' },
  { from: 'trein', to: 'voet', ctx: 'train', key: 'backspace' },
  { from: 'trein', to: 'pauze', ctx: 'train', key: 'escape' },
  { from: 'voet', to: 'duif', ctx: 'foot', key: 'e', note: 'duif-missie' },
  { from: 'duif', to: 'voet', ctx: 'pigeon', key: 'x' },
  { from: 'duif', to: 'pauze', ctx: 'pigeon', key: 'escape' },
  // minigames
  { from: 'voet', to: 'minigame', ctx: 'foot', key: 'e' },
  { from: 'minigame', to: 'voet', ctx: 'minigame', key: 'backspace' },
  { from: 'minigame', to: 'pauze', ctx: 'minigame', key: 'escape' },
  { from: 'voet', to: 'klokken', ctx: 'foot', key: 'e' },
  { from: 'klokken', to: 'voet', ctx: 'klokken', key: 'backspace' },
  { from: 'klokken', to: 'pauze', ctx: 'klokken', key: 'escape' },
  { from: 'voet', to: 'pannenkoek', ctx: 'foot', key: 'e' },
  { from: 'pannenkoek', to: 'voet', ctx: 'pannenkoek', key: 'backspace' },
  { from: 'pannenkoek', to: 'pauze', ctx: 'pannenkoek', key: 'escape' },
  { from: 'voet', to: 'frituur', ctx: 'foot', key: 'e' },
  { from: 'frituur', to: 'voet', ctx: 'foodtruck', key: 'backspace' },
  { from: 'frituur', to: 'pauze', ctx: 'foodtruck', key: 'escape' },
  // reuzenrad: Y (E) stapt uit, de rechterstick kijkt rond (voetsituatie)
  { from: 'voet', to: 'reuzenrad', ctx: 'foot', key: 'e' },
  { from: 'reuzenrad', to: 'voet', ctx: 'foot', key: 'e' },
  { from: 'reuzenrad', to: 'pauze', ctx: 'foot', key: 'escape' },
  // tekstvelden (naam, coöpcode, zoeken): A opent het schermtoetsenbord (padkeyboard.js), B sluit het
  { from: 'saveslots', to: 'toetsenbord', ctx: 'menu', key: 'enter' },
  { from: 'kaart', to: 'toetsenbord', ctx: 'menu', key: 'enter' },
  { from: 'pauze', to: 'toetsenbord', ctx: 'menu', key: 'enter' },
  { from: 'toetsenbord', to: 'pauze', ctx: 'menu', key: 'escape' },
];

// Kan deze situatie de toets met alleen de controller maken? Eerst knoppen,
// dan de linkerstick (pijlen in menu's en de klokken).
export function padCan(ctx, key) {
  const map = PAD_MAPS[ctx];
  if (!map) return false;
  const buttons = ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'ls', 'rs', 'up', 'down', 'left', 'right', 'view', 'start'];
  if (buttons.some((b) => map[b] === key)) return true;
  if (key.startsWith('arrow')) return map.stick === 'nav' || map.stick === 'arrows';
  return false;
}

// Schermen die vanaf `start` te bereiken zijn over randen die het pad kan drukken.
export function reachable(start, edges = PAD_SCREEN_EDGES) {
  const seen = new Set([start]);
  const todo = [start];
  while (todo.length) {
    const s = todo.pop();
    for (const e of edges) if (e.from === s && !seen.has(e.to) && padCan(e.ctx, e.key)) { seen.add(e.to); todo.push(e.to); }
  }
  return seen;
}

// Schermen zonder padroute terug naar `target`.
export function stuckScreens(target = 'voet', edges = PAD_SCREEN_EDGES) {
  const all = new Set(edges.flatMap((e) => [e.from, e.to]));
  return [...all].filter((s) => s !== 'titel' && !reachable(s, edges).has(target));
}
