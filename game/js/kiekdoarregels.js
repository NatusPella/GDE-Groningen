// Kiekdoar: de koppen en de pure selectie (#812/#818). De telefoonmeldingen van
// sikkomfeed.js zijn lokaal en per speler; deze module bevat alleen de regels: welke
// gebeurtenis nieuws is, welke kop erbij hoort, de volgorde en de cooldowns. Geen DOM,
// geen audio en geen wereld, zodat een Node-test de selectie kan narekenen.
//
// Volgorde (uit #818): sterren, ontsnappen, snelheid, overval, race, schade, kills, missie.
// Nieuwe soorten (ontsnappen, snelheid, overval, race) hebben geen opname: `voiced: false`
// en `audioKey: null`. De bestaande soorten houden hun bestaande opname en dus hun gedrag.

export const COOLDOWN = 90;            // s tussen twee Kiekdoar-meldingen
export const SAME_KIND_COOLDOWN = 300; // s voordat dezelfde soort weer mag (5 min)
export const CHANCE = 0.5;             // niet elke gebeurtenis haalt de krant
export const SPEED_MIN_KMH = 120;      // alleen een echt record is nieuws

export const KIEKDOAR = {
  wanted: {
    headlines: [
      'KIEKDOAR MELDT: onrust in Grunn, politie massaal op pad',
      'KIEKDOAR: gierende sirenes in het centrum, politie zit iemand op de hielen',
    ],
    audio: ['wanted_up_1', 'wanted_up_2'],
  },
  escape: {
    headlines: [
      'KIEKDOAR: politie zoekt nog uren, maar de dader is gevlogen',
      'KIEKDOAR: achtervolging eindigt zonder arrestatie, korps baalt',
    ],
    audio: [null, null],
  },
  speed: {
    headlines: [
      'KIEKDOAR: hardrijder gespot op de ringweg, {n} km/u',
      'KIEKDOAR: verkeerscamera meldt {n} km/u, en de auto is al weg',
    ],
    audio: [null, null],
  },
  heist: {
    headlines: [
      'KIEKDOAR: overval in de stad, buit binnen en daders verdwenen',
      'KIEKDOAR: museum bevestigt inbraak, de politie zoekt getuigen',
    ],
    audio: [null, null],
  },
  race: {
    headlines: [
      'KIEKDOAR: lokale coureur wint race, concurrenten in shock',
      'KIEKDOAR: finish juicht, de rest kijkt naar de achterkant van een auto',
    ],
    audio: [null, null],
  },
  wrecked: {
    headlines: [
      'KIEKDOAR: auto afgeschreven in het centrum, buurtbewoners verbijsterd',
      'KIEKDOAR: wéér een auto afgeschreven in Groningen, garages wrijven in hun handen',
    ],
    audio: ['wrecked_up_1', 'wrecked_up_2'],
  },
  copkill: {
    headlines: ['KIEKDOAR: agent flink geschrokken tijdens dienst, korps in rep en roer'],
    audio: ['copkill_up'],
  },
  pedkill: {
    headlines: ['KIEKDOAR: voetganger met de schrik vrijgekomen, buurtapp ontploft van de reacties'],
    audio: ['pedkill_up'],
  },
  kill: {
    headlines: ['KIEKDOAR: opnieuw onrust in de straten, politie tast in het duister'],
    audio: ['kill_up'],
  },
  mission: {
    headlines: ['KIEKDOAR: mysterieuze klusjesman weer aan het werk in Groningen'],
    audio: ['mission_up'],
  },
};

export const ORDER = ['wanted', 'escape', 'speed', 'heist', 'race', 'wrecked', 'copkill', 'pedkill', 'kill', 'mission'];

// De momentopname in sikkomfeed.js heeft deze velden; alleen deze vergelijkingen tellen.
const CHANGED = {
  wanted: (p, c) => c.wanted > p.wanted,
  // een respawn (gepakt of neer) zet de sterren ook op nul: dat is geen ontsnapping
  escape: (p, c) => !c.inRespawn && (p.wanted || 0) >= 2 && (c.wanted || 0) === 0,
  speed: (p, c) => (c.topSpeed || 0) > (p.topSpeed || 0) && (c.topSpeed || 0) >= SPEED_MIN_KMH,
  heist: (p, c) => (c.heistsDone || 0) > (p.heistsDone || 0),
  race: (p, c) => (c.racesWon || 0) > (p.racesWon || 0),
  wrecked: (p, c) => (c.wrecked || 0) > (p.wrecked || 0),
  copkill: (p, c) => (c.copKills || 0) > (p.copKills || 0),
  pedkill: (p, c) => (c.pedKills || 0) > (p.pedKills || 0),
  kill: (p, c) => (c.kills || 0) > (p.kills || 0),
  mission: (p, c) => (c.missionsDone || 0) > (p.missionsDone || 0),
};

// Eén kop per keer: de eerste soort in ORDER die veranderd is, mits de cooldowns en de kans
// het toelaten. `random` wordt twee keer gebruikt (kans, dan de kop); tests geven een vaste
// functie mee zodat de keuze deterministisch is.
// -> { kind, text, audioKey, voiced } of null
export function kiesKiekdoar(prev, cur, tijd, { lastToastAt = -Infinity, lastKindAt = {}, random = Math.random } = {}) {
  if (!prev || !cur) return null;
  if (tijd - lastToastAt < COOLDOWN) return null;
  for (const kind of ORDER) {
    if (!CHANGED[kind](prev, cur)) continue;
    if (tijd - (lastKindAt[kind] ?? -Infinity) < SAME_KIND_COOLDOWN) return null;
    if (random() > CHANCE) return null;
    const regel = KIEKDOAR[kind];
    const i = Math.min(regel.headlines.length - 1, Math.floor(random() * regel.headlines.length));
    const n = kind === 'speed' ? Math.max(0, Math.round(cur.topSpeed || 0)) : null;
    const text = regel.headlines[i].replace('{n}', String(n));
    const audioKey = regel.audio[i] || null;
    return { kind, text, audioKey, voiced: !!audioKey };
  }
  return null;
}
