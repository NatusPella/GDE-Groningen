// Het autotreffen op een vaste plek (epic Autotuning ronde 4, #1155): zeldzaam, per spelkalenderdag, met eigenaars die je kunt aanspreken.
// Pure functies, Node-safe, zonder THREE en zonder wereldstand. De aanroepers (parkedcars.js voor de vakken, tuningtraffic.js voor de
// melding en het praatje) geven de dag en het uur mee. Alles komt uit de kalenderdag: dezelfde dag geeft bij elke speler, ook bij een gast
// die de dag van de host volgt (gezamenlijke tijd), dezelfde plek, dezelfde auto's en dezelfde zinnen. Er is geen netwerkverkeer voor.
//
// Hoe zeldzaam: een gewone dag is het ongeveer 1 op 20, vrijdag en zaterdag ongeveer 1 op 6; één plek tegelijk; het treffen is "aan" van
// 19 tot 01 uur. De auto's staan die hele dag in de vakken van de plek (het vak krijgt zijn look bij het laden van het blok).
import { seedOf, optionOf } from './vehiclelook.js';
import { weekdayOf } from './calendar.js';
import { hourOf } from './streetlifedata.js';
import { meetActive, meetNotice, MEET_LINES, unit } from './tuningworld.js';

// De plekken: een punt (het centrum van het dorp of de buurt, in spelmeters) en een straal waarbinnen de parkeervakken meedoen.
// Haren: het Witte Kerkje; Reitdiep: de westkant van de stad, bij Hoogkerk. De punten komen uit herkenningspunten.js; of er in die straal
// echte parkeervakken liggen is nog niet in beeld bekeken (zie docs/TUNING-21-11.md).
export const MEET_SITES = [
  { id: 'haren', name: 'Haren', x: 3087, y: 5158, r: 650 },
  { id: 'reitdiep', name: 'het Reitdiep bij Hoogkerk', x: -4265, y: 412, r: 650 },
];
export const MEET_DAY_CHANCE = { weekend: 0.16, week: 0.05 };
const MEET_FROM_HOUR = 19, MEET_TO_HOUR = 1; // van 19 uur 's avonds tot 01 uur 's nachts
const MEET_SITE_BAY_SHARE = 0.5;             // van de vakken in de straal doet de helft mee (de rest blijft een gewone auto)

const unit01 = (...p) => (seedOf(...p) % 100000) / 100000;

// Is het op deze spelkalenderdag een treffendag, en waar? weekday: 0 zondag tot 6 zaterdag. Geeft de plek of null.
export function meetOfDay(day, weekday = 3) {
  if (!Number.isFinite(day)) return null;
  const chance = weekday === 5 || weekday === 6 ? MEET_DAY_CHANCE.weekend : MEET_DAY_CHANCE.week;
  if (unit01('treffendag', day) >= chance) return null;
  return MEET_SITES[seedOf('treffenplek', day) % MEET_SITES.length];
}

// De plek van een punt (of null): alleen als dit de plek van vandaag is; een andere plek blijft een gewone parkeerplaats.
export function meetSiteAt(x, y, day, weekday = 3) {
  const s = meetOfDay(day, weekday);
  if (!s) return null;
  return Math.hypot(x - s.x, y - s.y) <= s.r ? s : null;
}

// Doet dit parkeervak mee? Deterministisch uit de plek van het vak en de dag.
export const bayJoinsMeet = (x, y, day) => unit01('treffenvak', Math.round(x), Math.round(y), day) < MEET_SITE_BAY_SHARE;

// Het uur van het treffen (de eerste uren na middernacht horen bij de dag ervoor: de aanroeper rekent met de datum van de avond).
export const meetHourOn = (hour) => { const h = ((hour % 24) + 24) % 24; return h >= MEET_FROM_HOUR || h < MEET_TO_HOUR; };
// De kalenderdag waar dit uur bij hoort: na middernacht is het de avond van gisteren.
export const eveningDay = (day, hour) => (((hour % 24) + 24) % 24 < MEET_TO_HOUR ? day - 1 : day);

// Is het treffen op deze plek nu aan? Geeft de plek of null. weekdayOfDay: (dag) => 0..6 (de aanroeper geeft calendar.weekdayOf).
export function meetNow(day, hour, weekdayOfDay) {
  if (!meetHourOn(hour)) return null;
  const d = eveningDay(day, hour);
  return meetOfDay(d, weekdayOfDay ? weekdayOfDay(d) : 3);
}

// --- de eigenaars ------------------------------------------------------------------------------------------------------
// Een eigenaar zegt iets over zijn eigen auto: de zin komt uit wat er echt op zit (uit de look), dus hij klopt met wat je ziet.
// Geen merken, geen echte namen, Nederlands.
const LABEL_OF = (field, id) => { const o = optionOf(field, id); return o && o.label ? String(o.label).toLowerCase() : ''; };

const BUILD_LINES = [
  ['finish', (v) => `De lak is ${v}. Drie lagen en veel geduld.`],
  ['rimStyle', (v) => `Kijk naar de velgen: ${v}. Staan ze niet prachtig?`],
  ['spoiler', (v) => `De spoiler is ${v}. Ja, hij doet echt iets. Niet veel, maar iets.`],
  ['kit', (v) => `De bodykit is ${v}. Zelf gemonteerd, met een slagmoersleutel en ruzie.`],
  ['exhaust', (v) => `De uitlaat is ${v}. De buren hebben nog niet geklaagd. Dat is wat ik zeg.`],
  ['decal', (v) => `De sticker is ${v}. Het is een lang verhaal en een korte sticker.`],
  ['tint', (v) => `Raamfolie ${v}. Nu kijkt niemand meer naar binnen.`],
];
const GLOW_LINE = 'De underglow is vers. Kijk hoe hij gloeit als het donker wordt.';
const PLAIN_LINES = [
  'Mooi weertje voor een autotreffen, hè? Het is eigenlijk altijd mooi weer in Grunn.',
  'Ik kom hier elke keer. Niemand kijkt, maar iedereen weet wie het mooist is.',
  'Pak een frietje, dan heb je het meteen goed gedaan.',
  'Niet aanraken, wel bewonderen. Dat is de enige regel.',
];

// Wat de eigenaar zegt als je hem aanspreekt. look: de look van de auto, id: het vak of de auto (stabiele zaadwaarde),
// turn: de hoeveelste keer (0, 1, ...), zodat een tweede praatje een andere zin geeft.
export function ownerLine(look, id, turn = 0) {
  const pool = [];
  if (look) {
    for (const [field, fmt] of BUILD_LINES) { const l = look[field] && LABEL_OF(field, look[field]); if (l) pool.push(fmt(l)); }
    if (look.glow) pool.push(GLOW_LINE);
  }
  for (const p of PLAIN_LINES) pool.push(p);
  const i = (seedOf('eigenaarzin', id) + Math.max(0, turn | 0)) % pool.length;
  return pool[i];
}

// Afstand en wachttijd om een eigenaar aan te spreken: hij hoort je binnen TALK_RANGE; daarna wacht hij TALK_COOLDOWN s.
export const TALK_RANGE = 3.2;
export const TALK_COOLDOWN = 25;
const TALK_LABEL = 'Eigenaar';

// --- de haken in de wereld ----------------------------------------------------------------------------------------------
const weekdayNow = (world) => (world && world.calendar && Number.isFinite(world.calendar.day) ? weekdayOf(world.calendar.day) : 3);
export const dayNow = (world) => (world && world.calendar && Number.isFinite(world.calendar.day) ? world.calendar.day : null);
// Het id van een parkeervak voor zijn look: uit zijn plek; op een treffen op een vaste plek ook uit de dag (andere dag, andere auto's).
export const parkedBayId = (slot, day = null) => 'p' + Math.round(slot.x) + '_' + Math.round(slot.y) + (day === null || day === undefined ? '' : 'd' + day);

// Doet het parkeervak op (x, y) vandaag mee aan het autotreffen op een vaste plek (Haren of het Reitdiep)? Zeldzaam: de plek van vandaag, een
// dag op de twintig, de helft van zijn vakken.
export function siteMeetBay(world, x, y) {
  const day = dayNow(world);
  if (day === null) return false;
  return !!meetSiteAt(x, y, day, weekdayOf(day)) && bayJoinsMeet(x, y, day);
}

// Een treffen in de buurt (geparkeerde gepimpte auto's van een treffenplek: vrijdag- en zaterdagavond en zondagmiddag op een parkeerplaats, of de
// avond van een treffendag in Haren of bij het Reitdiep): één melding bij het naderen, af en toe een zin van een voorbijganger, en een eigenaar die iets
// zegt over zijn auto als je dichtbij blijft staan. sleeping: de slapende geparkeerde auto's (parkedcars.js). Alles lokaal: elke speler hoort het in zijn
// eigen scherm, zonder netwerkbericht, beloning of voortgang.
const meetState = new WeakMap();
export function tickMeet(world, player, sleeping, now) {
  if (!player || !sleeping) return;
  let st = meetState.get(world);
  if (!st) { st = { next: 0, told: -1e9, said: -1e9, owner: new Map() }; meetState.set(world, st); }
  if (now < st.next) return;
  st.next = now + 2;
  const day = dayNow(world), hr = hourOf(world);
  const lotOn = meetActive(weekdayNow(world), hr);
  const siteOn = day !== null && !!meetNow(day, hr, weekdayOf);
  if (!lotOn && !siteOn) return;
  let n = 0, nearest = Infinity, closest = null;
  for (const v of sleeping) {
    if (!v.parkSlot || !v.parkSlot.meet) continue;
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d < 70) { n++; if (d < nearest) { nearest = d; closest = v; } }
  }
  if (n < 3) return;
  const note = meetNotice(true, nearest);
  if (note && now - st.told > 600) { st.told = now; world.addMessage(`${note.title}: ${note.text}`, 5); }
  else if (closest && nearest < TALK_RANGE + closest.halfLen && ownerTalk(world, st, closest, now)) { /* een eigenaar sprak je aan */ }
  else if (nearest < 25 && now - st.said > 45 && now - st.told > 8) { st.said = now; world.addMessage('Een bezoeker: "' + MEET_LINES[Math.floor(unit('zin', Math.floor(now / 45)) * MEET_LINES.length)] + '"', 4); }
}

// De eigenaar van een gepimpte auto aan het treffen zegt iets over zijn auto (tuningmeet.js ownerLine): hoogstens eens per TALK_COOLDOWN s per auto.
function ownerTalk(world, st, v, now) {
  const id = v.parkSlot ? Math.round(v.parkSlot.x) + '_' + Math.round(v.parkSlot.y) : String(v.id);
  const last = st.owner.get(id);
  if (last && now - last.t < TALK_COOLDOWN) return false;
  const turn = last ? last.n + 1 : 0;
  st.owner.set(id, { t: now, n: turn });
  if (st.owner.size > 64) st.owner.delete(st.owner.keys().next().value);
  world.addMessage(`${TALK_LABEL}: "${ownerLine(v.look, id, turn)}"`, 5);
  return true;
}
