// De boerenregels van Tessa (epic #1095, #1101; ontwerp docs/BEZIT-21-11.md 5.9): korte, af en toe getoonde regels bij het eerste perceel per
// streek, de eerste oogst van een nieuw gewas, het eerste vee, het eerste personeel en de eerste pacht. Alleen tekst: geen gesproken regel en
// dus geen TTS (besluit van 20-10), de regels staan buiten de voice-lijst. Puur: geen DOM, geen klok, geen Math.random; de kans komt uit een
// vaste hash van gebeurtenis, sleutel en speldag, zodat dezelfde speler op dezelfde dag altijd hetzelfde ziet (scripts/tessarules_test.mjs).
// Tessa is het personage 'anita' (world.player.character): Tammo krijgt deze regels niet. Samen spelen: per speler (#429); de staat zit in het
// eigen bezit (bezit.x.tessa) en wordt niet gedeeld.

export const TESSA_CHARACTER = 'anita';
export const COOLDOWN_DAYS = 2;      // tussen twee regels minstens zoveel speldagen
export const DEFAULT_CHANCE = 0.75;

// Grondsoort per streek van bezitprijs.js (klei, zand of veen) voor de regel bij het eerste perceel in een streek.
export const GROUND_OF_REGION = {
  hogeland: 'klei', hunsingo: 'klei', oldambt: 'klei', eemsdelta: 'klei', lauwerskust: 'klei',
  westerkwartier: 'zand', westerwolde: 'zand', overig: 'zand', veenkolonien: 'veen',
};

// gebeurtenis -> { kans, regels }. Een regel is een korte zin in de eerste persoon.
export const TESSA_REGELS = {
  'perceel-klei': { kans: 0.8, regels: ['Klei blijft aan je laarzen, zand niet. Dit ruikt naar thuis.', 'Zware klei: dat is werk, maar het geeft ook wat terug.'] },
  'perceel-zand': { kans: 0.8, regels: ['Zand loopt je door de vingers. Dit land vraagt om vers water en goed voer.', 'Zand werkt licht, maar het houdt niets vast. Zuinig mee zijn.'] },
  'perceel-veen': { kans: 0.8, regels: ['Zwarte veengrond, zacht onder je voeten. Daar moet je voorzichtig mee zijn.', 'Veen is eigenzinnig, maar met geduld krijg je er wat uit.'] },
  'eerste-oogst': { kans: 0.7, regels: ['Dit gewas heb ik nog niet eerder geoogst. Kijken hoe het valt.', 'Nieuw gewas, nieuwe kennis. Het veld leert ons ook wat.'] },
  'eerste-vee': { kans: 0.85, regels: ['Beesten vragen elke dag aandacht. Gelukkig staan ze in de zomer buiten.', 'Ik kon vroeger met koeien praten. Meestal waren ze het eens met me.'] },
  'eerste-personeel': { kans: 0.9, regels: ['Eerst leren we het zelf, dan pas een ander.', 'Iemand anders op mijn trekker. Ik moet er even aan wennen.'] },
  'eerste-pacht': { kans: 0.7, regels: ['Een ander op mijn land, maar de pacht komt wel binnen.', 'Verpachten is rustig geld verdienen. Het land blijft van ons.'] },
};
export const TESSA_EVENTS = Object.keys(TESSA_REGELS);

// ---- de staat: { seen: { '<gebeurtenis>|<sleutel>': true }, last: laatste speldag met een regel (-1 = nog nooit) } ----
export const newTessaState = () => ({ seen: {}, last: -1 });
export function normalizeTessa(raw) {
  const s = newTessaState();
  if (!raw || typeof raw !== 'object') return s;
  if (Number.isFinite(raw.last)) s.last = Math.round(Math.max(-1, Math.min(1e7, raw.last)));
  if (raw.seen && typeof raw.seen === 'object') {
    for (const k of Object.keys(raw.seen).slice(0, 200)) {
      const ev = k.split('|')[0];
      if (raw.seen[k] && TESSA_REGELS[ev] && k.length < 64) s.seen[k] = true;
    }
  }
  return s;
}
const done = new WeakSet();
export function tessaOf(bezit) {
  if (!bezit.x.tessa || !done.has(bezit.x.tessa)) { bezit.x.tessa = normalizeTessa(bezit.x.tessa); done.add(bezit.x.tessa); }
  return bezit.x.tessa;
}

// Een stabiele ruis 0..1 uit tekst en dag (FNV met Math.imul, daarna gemengd), zoals gewasmarkt.js.
function noise(text, day) {
  let h = 0x811c9dc5;
  const s = String(text);
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  h = Math.imul((h ^ Math.imul((day | 0) + 1, 0x85ebca6b)) >>> 0, 0x01000193);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// De gebeurtenis bij het eerste perceel in een streek: 'perceel-klei', 'perceel-zand' of 'perceel-veen', met de streek als sleutel.
export const parcelEventFor = (regionId) => ({ event: `perceel-${GROUND_OF_REGION[regionId] || 'zand'}`, key: String(regionId || 'overig') });

// Moet er nu een regel komen? Alleen voor Tessa, elke (gebeurtenis, sleutel) hooguit één keer, met een cooldown en een kans. Geeft { id, text } en
// legt het vast in de staat (de aanroeper bewaart de staat), of null. Een regel die door kans of cooldown niet komt, kan bij een volgende
// gelegenheid (andere speldag) nog komen: "eerste" betekent de eerste die getoond is.
export function pickTessaLine(state, { character, event, key = '', day = 0 }) {
  if (character !== TESSA_CHARACTER) return null;
  const rule = TESSA_REGELS[event];
  if (!rule || !state) return null;
  const id = `${event}|${key}`;
  if (state.seen[id]) return null;
  if (state.last >= 0 && day - state.last < COOLDOWN_DAYS) return null;
  if (noise(`kans|${id}`, day) >= (rule.kans || DEFAULT_CHANCE)) return null;
  const text = rule.regels[Math.floor(noise(`tekst|${id}`, day) * rule.regels.length) % rule.regels.length];
  state.seen[id] = true;
  state.last = Math.max(0, Math.round(day));
  return { id, text };
}
