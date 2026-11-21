// Gepimpte auto's in de wereld (epic Autotuning, #1155): hoe vaak, waar en wanneer. Pure functies, Node-safe, zonder
// THREE en zonder wereldstand: de aanroepers (vehicle.js voor verkeer, parkedcars.js voor geparkeerde auto's) geven
// het wijkprofiel en de uren mee. De look zelf komt uit vehiclelook.js generateLook, dus dezelfde generator als de werkplaats.
//
// "Soms, maar niet te veel": de totale kans blijft onder MAX_SHARE (5%), de stad meer dan de rand, het platteland niets;
// 's avonds en in het weekend meer, 's ochtends minder. Een voertuig krijgt zijn look deterministisch uit zijn id of
// zijn parkeervak: dezelfde auto ziet er elke keer hetzelfde uit en een gast (die dezelfde id's ziet) ook.
//
// Budgetten (zie docs/TUNING-21-11.md): hoogstens MAX_TUNED_TRAFFIC rijdende gepimpte auto's tegelijk in de wereld, hoogstens
// MAX_GLOW_VISIBLE auto's tegelijk met zichtbare underglow (het dichtstbij), en geen dynamische lichten: alleen een emissief vlak.
//
// Politie: een gepimpte auto is geen reden tot optreden. Wie de wet overtreedt wordt gezocht, wie een mooie auto heeft niet.
import { generateLook, seedOf, STYLES } from './vehiclelook.js';

export const MAX_SHARE = 0.03; // eigenaarsbesluit 21-11: liever 2 tot 3% dan 5%
export const MAX_TUNED_TRAFFIC = 8;
export const MAX_GLOW_VISIBLE = 6;
export const MEET_SHARE = 0.3;

// Aandeel per wijkprofiel (trafficfleet.js PROFILES). Het platteland (country) is altijd 0.
export const PROFILE_SHARE = { centrum: 0.018, student: 0.02, chic: 0.015, industrie: 0.008, bakfiets: 0.005, standaard: 0.006 };
export const STYLE_BY_PROFILE = {
  centrum: ['show', 'race', 'cruiser'], student: ['race', 'show', 'cruiser'], chic: ['show', 'cruiser'],
  industrie: ['rally', 'cruiser'], bakfiets: ['cruiser'], standaard: ['cruiser', 'rally', 'show'],
};
// Welke soorten verkeer (trafficfleet.js CAR-soorten) ervoor in aanmerking komen en hoe waarschijnlijk (vermenigvuldiger).
export const KIND_WEIGHT = { hatch: 1, sedan: 0.8, wagon: 0.7, sport: 2.4, suv: 0.9, tokkie: 2, elektrisch: 0.5, roestbak: 0.3, van: 0.2 };
export const eligibleKind = (k) => k in KIND_WEIGHT;

// De kans (0..MAX_SHARE) dat een auto gepimpt is. hour 0..24, weekday 0 (zondag) tot 6, parked: een geparkeerde auto (iets minder:
// de eigenaar rijdt hem juist), meet: een actief autotreffen op deze plek.
export function tunedShare(profile, { country = false, hour = 12, weekday = 3, kind = 'hatch', parked = false, meet = false } = {}) {
  if (country && !meet) return 0;
  if (!eligibleKind(kind)) return 0;
  let p = (PROFILE_SHARE[profile] ?? PROFILE_SHARE.standaard) * KIND_WEIGHT[kind];
  const h = ((hour % 24) + 24) % 24;
  p *= h >= 18 || h < 2 ? 1.6 : h >= 6 && h < 9 ? 0.5 : 1;
  if (weekday === 5 || weekday === 6) p *= 1.3;
  if (parked) p *= 0.8;
  if (meet) return MEET_SHARE;
  return Math.min(MAX_SHARE, p);
}

// Een getal in [0,1) uit een zaad (zonder Math.random: dezelfde auto, dezelfde uitkomst).
export const unit = (...parts) => (seedOf(...parts) % 100000) / 100000;

// Is dit voertuig (id) gepimpt? Geeft { look, bodyColor, style } of null. `budget`: { tuned, glow } wat er al is (verkeer).
export function tunedLookFor(id, profile, opts = {}, budget = null) {
  const share = tunedShare(profile, opts);
  if (share <= 0 || unit('pimp', id) >= share) return null;
  if (budget && !opts.parked && budget.tuned >= MAX_TUNED_TRAFFIC) return null;
  const styles = STYLE_BY_PROFILE[profile] || STYLE_BY_PROFILE.standaard;
  const style = styles[seedOf('stijl', id) % styles.length];
  return generateLook(seedOf('look', id), { kind: 'auto', style, noGlow: !!(budget && budget.glow >= MAX_GLOW_VISIBLE) });
}

// --- autotreffen -----------------------------------------------------------------------------------------------
// Vrijdag- en zaterdagavond (19 tot 01 uur) en zondagmiddag (13 tot 17 uur). weekday: 0 zondag tot 6 zaterdag.
export function meetActive(weekday, hour) {
  const h = ((hour % 24) + 24) % 24;
  if ((weekday === 5 || weekday === 6) && h >= 19) return true;
  if ((weekday === 6 || weekday === 0) && h < 1) return true; // het treffen loopt door tot na middernacht
  return weekday === 0 && h >= 13 && h < 17;
}

// Welke parkeerplaatsen zijn treffenplekken? Eén op de zestig (zeldzaam, eigenaarsbesluit 21-11), uit zijn id (parkinglots.js geeft elke plaats een stabiel id), alleen in
// de stad (de aanroeper laat het platteland weg). Op zo'n plek staat de hele week 30% gepimpt; vrijdag- en zaterdagavond en
// zondagmiddag staat dan ook het treffen "aan": een melding bij het naderen en voorbijgangers die erover praten.
export const isMeetLotId = (id) => seedOf('treffen', id) % 60 === 0;

// Wat voorbijgangers zeggen bij een treffen; geen echte merken, Nederlands, gezellig.
export const MEET_LINES = [
  'Die lak, ongelooflijk. Staat hij op hypotheek?',
  'Heb jij die vleugel zelf gemaakt? Hij staat recht, hoor.',
  'Pak je een frietje? De snackwagen staat daar.',
  'Mijn buurman zegt dat verlaagd niet kan. Kijk naar deze.',
  'Zachtjes starten, de buren slapen.',
  'Stickers van Kwark Racing, dat is nog eens smaak.',
  'Ik kom hier alleen voor de underglow. En de friet.',
  'Mooi zo, iedereen netjes parkeren.',
];

// Een bericht voor de speler die een treffen nadert (HUD-kaart): { title, text } of null.
export function meetNotice(active, distance) {
  if (!active || distance > 70) return null;
  return { title: 'Autotreffen', text: 'Gepimpte auto\'s op een rij. Kijk rustig rond, praat met de eigenaars en neem een frietje.' };
}

// --- zichtbare underglow (het budget per beeld) -------------------------------------------------------------------
// entries: [{ id, dist, glow }] voor alle getekende auto's; geeft de Set van id's die hun underglow mogen tonen: de dichtstbijzijnde max.
export function glowBudget(entries, max = MAX_GLOW_VISIBLE) {
  const show = new Set();
  for (const e of entries.filter((x) => x.glow).sort((a, b) => a.dist - b.dist || String(a.id).localeCompare(String(b.id))).slice(0, max)) show.add(e.id);
  return show;
}

export { STYLES };
