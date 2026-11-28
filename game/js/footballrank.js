// De rangenboog van de voetbalcarrière (#1374, taak V3, bijbel 28-11 deel 02 bij 2b): per rang 2 tot 6 een verhaalmoment via de rangmomentenhaak (rankmoments.js,
// docs/RANKMOMENTS.md). Rang 1 is de invalbeurt (careerdebut_football.js). De zes rangen en hun bijfiguren staan als data in footballstory.js (storyRank, RANKS).
//
// Puur (geen THREE, geen DOM): de momenten worden bij het laden aangemeld; `feedFootballRank` vergelijkt de rang van het profiel met de laatst geziene rang en voert de
// haak. De haak is die van loopbaanlive.js (rankHook): het gezien-zijn staat in het profiel van de speler (momenten), het afspelen gaat via de rustregels van rankmomentsrun.js.
// De regels staan ook als docs/verhaal/nieuw/09-script-voetbal.md (scènes V3.2 tot V3.6; scripts/football_rank_test.mjs bewaakt dat ze gelijk blijven).
//
// Een oude carrière die al op een hogere rang staat krijgt de momenten van de lagere rangen nooit achteraf: de eerste keer dat de laatst geziene rang ontbreekt, wordt hij
// stil op de huidige rang gezet. Een rang die weer zakt (degradatie) zet de laatst geziene rang niet terug: een moment speelt nooit twee keer.
//
// Samen spelen: lokaal per speler. Rang en gezien-zijn zitten in het eigen profiel (carrièrevlag `rankSeen` en `momenten`); niets gaat over het netwerk, een gast of gastheer
// ziet het moment van een ander niet, en wie wegvalt of later aansluit verliest of mist niets: het moment speelt bij de eigen volgende stijging.
import { registerRankMoment, registerRankKind } from './rankmoments.js';
import { storyRank } from './footballstory.js';

export const FOOTBALL_KIND = 'voetbal';
export const RANK_SEEN_FLAG = 'rankSeen';        // een getal in de carrièrevlaggen: de hoogste rang waarvoor de haak al gevoed is

// Rang -> moment. De spreker van een regel is de spreeksleutel van de ondertitel ('Anita' is Tessa); elke regel hooguit 25 woorden (rankmoments.js).
export const RANK_SCENES = [
  { rang: 2, id: 'voetbal-rang2-debuut', scene: 'V3.2', naam: 'Debuut', regels: [
    ['Hilbrand', 'Hilbrand van de krant. Je eerste doelpunt, Tessa, en het halve dorp stond langs de lijn.'],
    ['Femke', 'Femke, de keeper van De Hoekers. Ik ken je van vroeger. Jij schiet, ik pak de rest.'],
    ['Tammo', 'Dat is een goede afspraak.'],
  ] },
  { rang: 3, id: 'voetbal-rang3-selectie', scene: 'V3.3', naam: 'Selectie', regels: [
    ['Eppo Rozema', 'Promotie. Ik heb het klontje bewaard voor de foto.'],
    ['Albert Teuben', 'De ledenlijst is er twaalf bij. Ze klopt nog steeds niet.'],
    ['Femke', 'Ik kwam een dag te laat voor het feest. Zoals altijd.'],
  ] },
  { rang: 4, id: 'voetbal-rang4-doorbraak', scene: 'V3.4', naam: 'Doorbraak', regels: [
    ['Mevrouw De Vries-Jansen', 'Mevrouw De Vries-Jansen, scout van De Stadjers. U speelde goed langs het wad.'],
    ['Tammo', 'Schrijft u dat op?'],
    ['Mevrouw De Vries-Jansen', 'Ik schrijf zelden iets op. Dat is mijn methode.'],
  ] },
  { rang: 5, id: 'voetbal-rang5-kapitein', scene: 'V3.5', naam: 'Kapitein', regels: [
    ['Jaap Roorda', 'Jaap Roorda, de bakker. Een kapitein krijgt koeken. Dat staat nergens, maar zo is het.'],
    ['Anita', 'Dank u. Ik draag de band nog even rustig.'],
    ['Jaap Roorda', 'Rustig kan niet. Een band om je arm weegt meer dan hij lijkt.'],
  ] },
  { rang: 6, id: 'voetbal-rang6-euroborg', scene: 'V3.6', naam: 'Euroborg', regels: [
    ['Mevrouw De Vries-Jansen', 'Ik zei het al. Wie langs het wad begint, eindigt in de Euroborg.'],
    ['Tammo', 'Het stadion ruikt naar frietjes.'],
    ['Anita', 'Dat is een goed teken.'],
  ] },
];

let registered = false;
// Meld de vijf momenten aan (idempotent; wordt bij het laden aangeroepen). Geeft het aantal nieuw aangemelde momenten terug.
export function registerFootballRankMoments() {
  registerRankKind(FOOTBALL_KIND);
  if (registered) return 0;
  registered = true;
  let n = 0;
  for (const m of RANK_SCENES) {
    // alleen voor een voetbalcarrière: de stijging komt uit feedFootballRank, dus de voorwaarde hoeft niets extra's te toetsen
    const r = registerRankMoment({ id: m.id, vak: FOOTBALL_KIND, rang: m.rang, scene: { soort: 'talk', regels: m.regels } });
    if (r.ok) n++;
  }
  return n;
}
registerFootballRankMoments();

// Voed de haak als de rang van de carrière hoger is dan de laatst geziene. Geeft { career, fired }: een nieuw profiel als de vlag verandert (anders dezelfde verwijzing)
// en het aantal momenten dat in de wachtrij kwam. `hook` is loopbaanlive.rankHook (of een nep in de test); `w` de wereld (alleen doorgegeven).
export function feedFootballRank(career, hook, w = null) {
  if (!career || !career.started || !hook) return { career, fired: 0 };
  const naar = storyRank(career);
  const flags = career.flags || {};
  const had = Number.isInteger(flags[RANK_SEEN_FLAG]) ? flags[RANK_SEEN_FLAG] : null;
  if (had === null) return { career: { ...career, flags: { ...flags, [RANK_SEEN_FLAG]: naar } }, fired: 0 };       // stil: een profiel van voor deze haak
  if (naar <= had) return { career, fired: 0 };
  let fired = 0;
  try { fired = hook.omhoog(w, { vak: FOOTBALL_KIND, van: had, naar }) | 0; } catch (e) { fired = 0; }
  return { career: { ...career, flags: { ...flags, [RANK_SEEN_FLAG]: naar } }, fired };
}
