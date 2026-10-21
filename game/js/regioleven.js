// Leven per streek (#68): zomerevenementen op echte plekken in de verzonnen
// zomerkalender, toevalsontmoetingen onderweg, en verzamelen en geheimen per
// regio. Pure data and rules, Node-safe: calendar.js adds REGIO_EVENTS to its
// special days, regiolevenrt.js runs the encounters and the finds. Every name
// of an event, person or shop is made up; the places are real. Text only, no voice.
import { wgsToWorld } from './rdnew.js';

// --- the regions (streken) ------------------------------------------------------------------
// at: lat/lon of the heart, reach: metres to the edge. Nearest centre within reach wins.
export const STREKEN = [
  { id: 'eemsdelta', name: 'Eemsdelta', at: [53.327, 6.89], reach: 9000 },
  { id: 'veenkolonien', name: 'Veenkoloniën', at: [53.12, 6.87], reach: 11000 },
  { id: 'oldambt', name: 'Oldambt', at: [53.15, 7.05], reach: 9000 },
  { id: 'westerkwartier', name: 'Westerkwartier', at: [53.17, 6.4], reach: 11000 },
  { id: 'hogeland', name: 'Hogeland', at: [53.4, 6.65], reach: 11000 },
  { id: 'westerwolde', name: 'Westerwolde', at: [52.96, 7.04], reach: 13000 },
  { id: 'lauwerskust', name: 'Lauwerskust', at: [53.365, 6.32], reach: 10000 },
  { id: 'hunsingo', name: 'Hunsingo', at: [53.31, 6.58], reach: 9000 },
];

export function streekAt(x, y) {
  let best = null, bestD = Infinity;
  for (const s of STREKEN) {
    const [cx, cy] = wgsToWorld(s.at[0], s.at[1]);
    const d = Math.hypot(cx - x, cy - y);
    if (d <= s.reach && d < bestD) { best = s; bestD = d; }
  }
  return best;
}

// --- summer events ------------------------------------------------------------------------
// month/date (to: toMonth/toDate for more days) in the summer of calendar.js; calendar.js turns
// them into day numbers. icon: a CAL_ICONS key.
export const REGIO_EVENTS = [
  { id: 'rv-havendag', name: 'Havendag in Delfzijl', month: 8, date: 22, rank: 5, icon: 'vlag', streek: 'eemsdelta',
    card: ['Havendag in Delfzijl', 'Sleepboten, een draaiorgel en kraampjes langs de Handelskade. De kapitein van de Kielzog deelt gratis worst uit.'] },
  { id: 'rv-brugdag', name: 'Brugdag in Appingedam', month: 8, date: 16, rank: 5, icon: 'kraam', streek: 'eemsdelta',
    card: ['Brugdag in Appingedam', 'Elke brug over het Damsterdiep gaat één keer open, voor de foto. De hangende keukens hangen vol vlaggetjes.'] },
  { id: 'rv-veendag', name: 'Veendag in Veendam', month: 8, date: 23, rank: 5, icon: 'aar', streek: 'veenkolonien',
    card: ['Veendag in Veendam', 'Kramen met aardappelen en een schuitenparade over het Winschoterdiep. Winnaar is de schuit die het langst blijft drijven.'] },
  { id: 'rv-aardappelmarkt', name: 'Aardappelmarkt in Hoogezand', month: 9, date: 5, rank: 4, icon: 'kraam', streek: 'veenkolonien',
    card: ['Aardappelmarkt in Hoogezand', 'Zakken, kisten en een jury die ernstig kijkt. De grootste aardappel wint een eigen standbeeld van karton.'] },
  { id: 'rv-molendag', name: 'Molendag in Winschoten', month: 8, date: 30, rank: 5, icon: 'aar', streek: 'oldambt',
    card: ['Molendag in Winschoten', 'De molens draaien en je mag naar boven. Op de wal staat een kraam met versgebakken broodjes.'] },
  { id: 'rv-ringrijden', name: 'Ringrijden in Leek', month: 9, date: 12, rank: 5, icon: 'vlag', streek: 'westerkwartier',
    card: ['Ringrijden in Leek', 'Ruiters in witte broeken steken een ring van een paal. Het is oud, het is serieus, en het gaat vaak mis.'] },
  { id: 'rv-dijkdag', name: 'Dijkdag in Uithuizen', month: 9, date: 6, rank: 4, icon: 'zon', streek: 'hogeland',
    card: ['Dijkdag in Uithuizen', 'Picknick op de dijk, schapen op de achtergrond. De wind staat gunstig voor vliegers.'] },
  { id: 'rv-kanaaldag', name: 'Kanaaldag in Stadskanaal', month: 9, date: 4, rank: 5, icon: 'kraam', streek: 'westerwolde',
    card: ['Kanaaldag in Stadskanaal', 'Platbodems langs de lange kanalen en een brug die voor de gelegenheid ook echt opengaat. Er is een kraam met kanaalkoek.'] },
  { id: 'rv-garnalendag', name: 'Garnalendag in Zoutkamp', month: 9, date: 2, rank: 5, icon: 'vlag', streek: 'lauwerskust',
    card: ['Garnalendag in Zoutkamp', 'Kotters in de haven, pellen op het dek en een prijs voor de snelste pelster. Het ruikt naar zout en zomer.'] },
  { id: 'rv-wierdedag', name: 'Wierdedag in Winsum', month: 9, date: 9, rank: 4, icon: 'zon', streek: 'hunsingo',
    card: ['Wierdedag in Winsum', 'Wandelen over de terpen, met een gids die alles weet over klei. De molen draait, de koffie staat klaar.'] },
];

// --- chance encounters --------------------------------------------------------------------
// hours: [from, to) on a 24h clock (from > to wraps midnight); weight: relative; reward: euros (small)
export const ENCOUNTERS = [
  { id: 'e-schipper', streek: 'eemsdelta', hours: [6, 18], weight: 3, who: 'Een schipper',
    lines: ['Een schipper zwaait vanaf zijn dek. Vraagt of je weet hoe laat de brug opengaat. Niemand weet het ooit.'], reward: 0 },
  { id: 'e-keuken', streek: 'eemsdelta', hours: [8, 20], weight: 2, who: 'Een toerist',
    lines: ['Een toerist wijst omhoog: Is dat een echte keuken? Iemand zwaait terug met een pan.'], reward: 0 },
  { id: 'e-veenboer', streek: 'veenkolonien', hours: [5, 14], weight: 3, who: 'Een boer',
    lines: ['Een boer rijdt je voorbij op een trekker en roept iets over aardappelen. Je hoort alleen aardappelen.'], reward: 5 },
  { id: 'e-schuit', streek: 'veenkolonien', hours: [10, 20], weight: 2, who: 'Een schuitenvaarder',
    lines: ['Op het diep dobbert een schuit zonder bemanning. Op het dek staat een kopje thee, nog warm.'], reward: 0 },
  { id: 'e-graan', streek: 'oldambt', hours: [7, 19], weight: 3, who: 'Een bakker',
    lines: ['Een bakker rent met een mandje naar buiten. Hier, nog warm. Je krijgt een broodje mee.'], reward: 0 },
  { id: 'e-molenaar', streek: 'oldambt', hours: [9, 17], weight: 2, who: 'De molenaar',
    lines: ['De molenaar kijkt naar de wieken en dan naar jou. Windkracht drie. Prima dag voor niks.'], reward: 0 },
  { id: 'e-koets', streek: 'westerkwartier', hours: [9, 18], weight: 3, who: 'Een koetsier',
    lines: ['Een koetsier houdt in en tikt aan zijn hoed. Het paard kijkt jou aan alsof jij de koets bent.'], reward: 0 },
  { id: 'e-wandelaar', streek: 'westerkwartier', hours: [6, 21], weight: 2, who: 'Een wandelaar',
    lines: ['Een wandelaar met een kaart die op zijn kop hangt, vraagt de weg naar het park dat achter hem ligt.'], reward: 0 },
  { id: 'e-schaap', streek: 'hogeland', hours: [0, 24], weight: 3, who: 'Een schaap',
    lines: ['Midden op de dijk staat een schaap. Het kijkt, kauwt en beweegt niet. Je gaat er maar omheen.'], reward: 0 },
  { id: 'e-gids', streek: 'hogeland', hours: [10, 17], weight: 2, who: 'Een gids',
    lines: ['Een gids oefent haar verhaal over de borg, hardop, op een bankje. Je krijgt de korte versie.'], reward: 0 },
  { id: 'e-avond-haven', streek: 'eemsdelta', hours: [17, 23], weight: 2, who: 'Een visser',
    lines: ['Een visser maakt zijn netten vast en zegt dat het morgen mooi weer wordt. Dat zegt hij elke avond.'], reward: 0 },
  { id: 'e-avond-diep', streek: 'veenkolonien', hours: [17, 23], weight: 2, who: 'Een fietser',
    lines: ['Langs het diep fietst iemand met een stoel op de bagagedrager. Waar naartoe? Naar de zonsondergang, natuurlijk.'], reward: 0 },
  { id: 'e-avond-graan', streek: 'oldambt', hours: [17, 23], weight: 2, who: 'Een boer',
    lines: ['Een boer leunt op een hek en kijkt naar zijn graan. Dat doet hij elke avond. Het graan vindt het prima.'], reward: 0 },
  { id: 'e-nacht', streek: null, hours: [22, 4], weight: 1, who: 'Een uil',
    lines: ['Ergens boven je hoofd roept een uil. Het klinkt als een vraag waar je het antwoord niet op weet.'], reward: 0 },
  { id: 'e-kanaal', streek: 'westerwolde', hours: [6, 18], weight: 3, who: 'Een kanaalwachter',
    lines: ['Een kanaalwachter zwaait je door over de brug. Dat doet hij voor iedereen, ook als er geen schip komt.'], reward: 0 },
  { id: 'e-bourtange', streek: 'westerwolde', hours: [9, 19], weight: 2, who: 'Een wandelaar',
    lines: ['Een wandelaar loopt voor de derde keer om dezelfde wal. Hij zegt dat hij de vesting uit het hoofd leert.'], reward: 0 },
  { id: 'e-avond-wolde', streek: 'westerwolde', hours: [17, 23], weight: 2, who: 'Een fietser',
    lines: ['Langs het kanaal fietst iemand met een lamp op de hoed. Het licht schuift mee over het water.'], reward: 5 },
  { id: 'e-kotter', streek: 'lauwerskust', hours: [6, 18], weight: 3, who: 'Een visser',
    lines: ['Een visser sjort aan een net en zegt zonder op te kijken: Garnalen, geen mensen. Je loopt maar weer door.'], reward: 0 },
  { id: 'e-wadloper', streek: 'lauwerskust', hours: [8, 20], weight: 2, who: 'Een wadloper',
    lines: ['Een wadloper met blote voeten vraagt hoe laat het eb is. Je weet het niet. Hij ook niet, maar hij gaat toch.'], reward: 0 },
  { id: 'e-avond-kust', streek: 'lauwerskust', hours: [17, 23], weight: 2, who: 'Een vogelaar',
    lines: ['Een vogelaar wijst naar de lucht en fluistert dat het een wulp is. Het is een meeuw. Hij is blij.'], reward: 0 },
  { id: 'e-klei', streek: 'hunsingo', hours: [6, 18], weight: 3, who: 'Een boer',
    lines: ['Een boer staat tot zijn enkels in de klei en groet je met een nikje. Zijn trekker staat er twee akkers verderop.'], reward: 5 },
  { id: 'e-wierde', streek: 'hunsingo', hours: [9, 19], weight: 2, who: 'Een gids',
    lines: ['Een gids legt uit dat deze heuvel gemaakt is door mensen. Een kind vraagt: Waarom? De gids denkt nog na.'], reward: 0 },
  { id: 'e-avond-klei', streek: 'hunsingo', hours: [17, 23], weight: 2, who: 'Een molenaar',
    lines: ['De molenaar bindt zijn wieken vast voor de nacht en wenst je een goede avond. De wieken wensen terug.'], reward: 0 },
  { id: 'e-avond-west', streek: 'westerkwartier', hours: [17, 23], weight: 2, who: 'Een ruiter',
    lines: ['Een ruiter stapt af en laat het paard grazen langs de berm. Het paard kijkt jou aan, kauwt en kijkt weer weg.'], reward: 0 },
  { id: 'e-avond-hog', streek: 'hogeland', hours: [17, 23], weight: 2, who: 'Een boer',
    lines: ['Een boer sluit het hek van de wei en roept dat de zon vanavond bijna weer terugkomt. Je gelooft hem op zijn woord.'], reward: 0 },
];

export const ENCOUNTER_GAP = [150, 300]; // seconds between two rolls
export const ENCOUNTER_REWARD_MAX = 10;

const inHours = (h, [a, b]) => (a === b ? true : a < b ? h >= a && h < b : h >= a || h < b);

export function encountersFor(streekId, hour) {
  const h = ((hour % 24) + 24) % 24;
  return ENCOUNTERS.filter((e) => (e.streek === null || e.streek === streekId) && inHours(h, e.hours));
}

// One roll: an encounter of the streek and the hour, never one in `recent` (ids) when
// there is a choice; null when nothing fits. rng() in [0, 1).
export function rollEncounter(streekId, hour, rng = Math.random, recent = []) {
  let pool = encountersFor(streekId, hour);
  const fresh = pool.filter((e) => !recent.includes(e.id));
  if (fresh.length) pool = fresh;
  const total = pool.reduce((s, e) => s + e.weight, 0);
  if (!total) return null;
  let r = rng() * total;
  for (const e of pool) { r -= e.weight; if (r < 0) return { ...e, line: e.lines[Math.floor(rng() * e.lines.length) % e.lines.length] }; }
  const e = pool[pool.length - 1];
  return { ...e, line: e.lines[0] };
}

export const rollGap = (rng = Math.random) => ENCOUNTER_GAP[0] + rng() * (ENCOUNTER_GAP[1] - ENCOUNTER_GAP[0]);

// --- collecting and secrets, per streek ----------------------------------------------------
// kind 'verzamel' = a thing lying about (3 per streek), 'geheim' = a hidden spot (1 per streek).
// at: lat/lon; r: metres to pick it up. Found once, remembered by the prestatie sets
// SET_VERZAMEL and SET_GEHEIM (achievements.js).
export const SET_VERZAMEL = 'streekverzamel';
export const SET_GEHEIM = 'streekgeheimen';

export const FINDS = [
  { id: 'v-eems-1', streek: 'eemsdelta', kind: 'verzamel', name: 'Gouden schelp', at: [53.3318, 6.9215], r: 14, text: 'Een schelp op de Zeedijk, zo glad dat de zee hem wel moest bewaren.' },
  { id: 'v-eems-2', streek: 'eemsdelta', kind: 'verzamel', name: 'Keukenlepel', at: [53.32236, 6.85938], r: 14, text: 'Een lepel die uit een hangende keuken is gevallen. Er hangt nog een briefje aan: Sorry.' },
  { id: 'v-eems-3', streek: 'eemsdelta', kind: 'verzamel', name: 'Scheepsbel', at: [53.3302, 6.9144], r: 14, text: 'Een kleine koperen bel bij de kade. Hij klingelt zacht als je hem optilt.' },
  { id: 'g-eems', streek: 'eemsdelta', kind: 'geheim', name: 'Het klokje onder de brug', at: [53.3232, 6.8571], r: 10, text: 'Onder de brug hangt een klokje voor wie echt zoekt. De brugwachter heeft het er zelf neergehangen.' },
  { id: 'v-veen-1', streek: 'veenkolonien', kind: 'verzamel', name: 'Veenaardappel', at: [53.1062, 6.8761], r: 14, text: 'Een aardappel zo zwart als turf. Hij blijkt een steen. Je houdt hem toch.' },
  { id: 'v-veen-2', streek: 'veenkolonien', kind: 'verzamel', name: 'Schippersknoop', at: [53.10535, 6.88048], r: 14, text: 'Een touw met een knoop erin die niemand kan losmaken. Eigenlijk een kunstwerk.' },
  { id: 'v-veen-3', streek: 'veenkolonien', kind: 'verzamel', name: 'Turfstekersmes', at: [53.1621, 6.7712], r: 14, text: 'Een oud mes in de berm langs het diep. De houten steel is helemaal glad.' },
  { id: 'g-veen', streek: 'veenkolonien', kind: 'geheim', name: 'De rechtste weg', at: [53.0961, 6.9102], r: 12, text: 'Op de lange rechte weg staat een bordje: Hier is het echt het rechtst. Dank voor uw geduld.' },
  { id: 'v-old-1', streek: 'oldambt', kind: 'verzamel', name: 'Gouden aar', at: [53.1447, 7.0362], r: 14, text: 'Een korenaar van messing, achtergelaten door een molenaar die het bij zich had.' },
  { id: 'v-old-2', streek: 'oldambt', kind: 'verzamel', name: 'Kermiskaartje', at: [53.1438, 7.0344], r: 14, text: 'Een oud ritkaartje voor de zweefmolen. Het is nog goed voor één rondje.' },
  { id: 'v-old-3', streek: 'oldambt', kind: 'verzamel', name: 'Windwijzer', at: [53.1502, 7.0451], r: 14, text: 'Een haantje dat altijd naar het westen wijst, ook als het waait uit het oosten.' },
  { id: 'g-old', streek: 'oldambt', kind: 'geheim', name: 'Het graanspoor', at: [53.13952, 7.06346], r: 12, text: 'Tussen het graan loopt een smal pad dat nergens op staat. Aan het einde ligt een verzonken bankje met uitzicht.' },
  { id: 'v-west-1', streek: 'westerkwartier', kind: 'verzamel', name: 'Koetslantaarn', at: [53.16343, 6.37686], r: 14, text: 'Een koperen lantaarn bij het park. De kaars is bijna op.' },
  { id: 'v-west-2', streek: 'westerkwartier', kind: 'verzamel', name: 'Hoefijzer', at: [53.1655, 6.3801], r: 14, text: 'Een hoefijzer dat al jaren geluk beloofd. Het werkt, zeggen ze, op de tweede dinsdag.' },
  { id: 'v-west-3', streek: 'westerkwartier', kind: 'verzamel', name: 'Kasteelsleutel', at: [53.1672, 6.3694], r: 14, text: 'Een sleutel zo groot als je hand. Er past geen enkel slot in dat jij kent.' },
  { id: 'g-west', streek: 'westerkwartier', kind: 'geheim', name: 'De stalkamer', at: [53.1689, 6.3721], r: 10, text: 'Achter de stal zit een deurtje. Binnen hangen foto’s van paarden die nooit hebben gewonnen, en toch trots kijken.' },
  { id: 'v-hog-1', streek: 'hogeland', kind: 'verzamel', name: 'Wierdescherf', at: [53.4101, 6.6759], r: 14, text: 'Een stukje aardewerk uit de wierde. Waarschijnlijk van een kopje. Waarschijnlijk met oor.' },
  { id: 'v-hog-2', streek: 'hogeland', kind: 'verzamel', name: 'Veren van een gans', at: [53.4155, 6.6821], r: 14, text: 'Een bosje grijze veren, vers losgelaten. De gans staat er nog bij en kijkt streng.' },
  { id: 'v-hog-3', streek: 'hogeland', kind: 'verzamel', name: 'Dijkbord', at: [53.4205, 6.6902], r: 14, text: 'Een verweerd bordje met de tekst: Niet op de dijk. De schapen hebben er een mening over.' },
  { id: 'g-hog', streek: 'hogeland', kind: 'geheim', name: 'De stille wierde', at: [53.4256, 6.6602], r: 12, text: 'Op een kleine heuvel in de klei is alles stil. De wind draait weg, je hoort alleen jezelf denken.' },
  { id: 'v-wolde-1', streek: 'westerwolde', kind: 'verzamel', name: 'Kanaalklomp', at: [52.98891, 6.95003], r: 14, text: 'Een houten klomp, langs het kanaal aangespoeld. Er zit een briefje in: Voor wie hem vindt, de volgende brug is van jou.' },
  { id: 'v-wolde-2', streek: 'westerwolde', kind: 'verzamel', name: 'Vestingkogel', at: [53.0075, 7.1905], r: 14, text: 'Een steenkogel uit de wal. Zo zwaar dat je begrijpt waarom niemand hem hier heeft gelaten.' },
  { id: 'v-wolde-3', streek: 'westerwolde', kind: 'verzamel', name: 'Kloosterschelp', at: [52.8760, 7.0605], r: 14, text: 'Een schelp uit de kloostertuin, die niemand daar heeft gelegd. Hij is warm van de zon.' },
  { id: 'g-wolde', streek: 'westerwolde', kind: 'geheim', name: 'De verborgen schans', at: [53.0068, 7.1880], r: 12, text: 'Achter de wal ligt een schans die op geen enkele kaart staat. Er hangt een bordje: Ook deze is af.' },
  { id: 'v-kust-1', streek: 'lauwerskust', kind: 'verzamel', name: 'Garnalenzeef', at: [53.33296, 6.29855], r: 14, text: 'Een zeef met nog een paar garnalen erin. Ze zijn weg voor je het doorhebt.' },
  { id: 'v-kust-2', streek: 'lauwerskust', kind: 'verzamel', name: 'Pierpaaltje', at: [53.40452, 6.20333], r: 14, text: 'Een afgebroken paaltje van de pier, glad van de zee. Er zit een meeuw op die niet wil verhuizen.' },
  { id: 'v-kust-3', streek: 'lauwerskust', kind: 'verzamel', name: 'Wadlopersklomp', at: [53.40037, 6.45856], r: 14, text: 'Een slijtage-vaste schoen vol klei. Hij rook vroeger naar zee, nu naar thuis.' },
  { id: 'g-kust', streek: 'lauwerskust', kind: 'geheim', name: 'Het stille vogelhut', at: [53.3800, 6.2300], r: 12, text: 'In een uithoek van het Lauwersmeer staat een hut met één stoel. Op de leuning zit een vogel die wacht tot je weggaat.' },
  { id: 'v-hun-1', streek: 'hunsingo', kind: 'verzamel', name: 'Molensteen', at: [53.3315, 6.5170], r: 14, text: 'Een kleine molensteen, zo rond dat hij nog lijkt te draaien als je niet kijkt.' },
  { id: 'v-hun-2', streek: 'hunsingo', kind: 'verzamel', name: 'Scheve baksteen', at: [53.29987, 6.60101], r: 14, text: 'Een baksteen die licht helt. Een passant zegt dat de toren het ook zo doet en dat het geen fout is.' },
  { id: 'v-hun-3', streek: 'hunsingo', kind: 'verzamel', name: 'Kleischep', at: [53.2760, 6.6970], r: 14, text: 'Een oude schep met klei erop die nooit droog wordt. Er zit een initiaal in het hout gekerfd.' },
  { id: 'g-hun', streek: 'hunsingo', kind: 'geheim', name: 'De wierdeput', at: [53.3180, 6.5400], r: 12, text: 'Op een wierde ligt een put met een deksel. Eronder hangt een emmer met een briefje: Even wachten, ik kom zo.' },
];

export function findsOf(streekId, kind = null) {
  return FINDS.filter((f) => f.streek === streekId && (!kind || f.kind === kind));
}

// world position of a find
export function findPos(f) { const [x, y] = wgsToWorld(f.at[0], f.at[1]); return { x, y }; }

// the not-yet-found find the player stands on, or null. found: a Set or array of ids.
export function findNear(x, y, found = []) {
  const have = found instanceof Set ? found : new Set(found);
  for (const f of FINDS) {
    if (have.has(f.id)) continue;
    const p = findPos(f);
    if (Math.abs(p.x - x) > f.r || Math.abs(p.y - y) > f.r) continue;
    if (Math.hypot(p.x - x, p.y - y) <= f.r) return f;
  }
  return null;
}

// progress per streek: { total, found } for a kind
export function streekProgress(streekId, found = [], kind = null) {
  const have = found instanceof Set ? found : new Set(found);
  const all = findsOf(streekId, kind);
  return { total: all.length, found: all.filter((f) => have.has(f.id)).length };
}

export const VERZAMEL_TOTAL = FINDS.filter((f) => f.kind === 'verzamel').length;
export const GEHEIM_TOTAL = FINDS.filter((f) => f.kind === 'geheim').length;
