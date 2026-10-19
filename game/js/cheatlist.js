// Streken (cheats): the list, as pure data, and which ones a story position
// unlocks. Node-safe (no DOM): savemigrate.js and the save migration test
// use it too. cheats.js runs them, cheatsui.js shows them.
//
// kind: 'toggle' (default), 'action' (a button) or 'perk' (widens an action).
// hint: how to get it, when the step title or prestatie says too little.
// group: toggles that exclude each other.
// safe: cosmetic, also on during missions and cutscenes, and prestaties stay
// on; the rest pause there (cheats.js) so no mission can break on them.
// step: the story step (storyarc.js) that unlocks it; ach: the prestatie
// (achievements.js) that does; neither: from the start.
import { STEPS, STEP_ALIAS, stepDone } from './storyarc.js';

export const CHEATS = [
  { id: 'teleport', kind: 'action', name: 'Overal en nergens', desc: 'Kies een plek op de kaart en je staat er. Met auto en al, als je erin zit.' },
  { id: 'voertuig', kind: 'action', name: 'Voertuig hier', desc: 'Henk bezorgt je voertuig naast je neer: gratis en meteen, zonder fooi en zonder wachten.' },
  { id: 'zwaartekracht', name: 'Eierbal-zwaartekracht', desc: 'Springen alsof je net uit de frituur komt: hoog, traag en een beetje vettig. Auto\'s doen mee.' },
  { id: 'grotekoppen', name: 'Grote koppen', safe: true, desc: 'Iedereen krijgt het hoofd dat hij denkt te hebben.' },
  { id: 'gronings', name: 'Gronings ondertiteld', safe: true, desc: 'Alle ondertitels in plat Gronings. Leest het niet lekker? Dan ben je nait van hier.' },
  { id: 'zomeravond', name: 'Altijd zomeravond', group: 'klok', desc: 'De klok blijft op half negen staan. Gouden licht, lange schaduwen, nooit naar bed.' },
  { id: 'nachtstad', name: 'Nachtstad', group: 'klok', desc: 'Het blijft half één. De Poelestraat vindt het prima.' },
  { id: 'geenverkeer', name: 'Zondagochtend', group: 'verkeer', desc: 'Geen verkeer. Heel Grunn ligt nog in bed.' },
  { id: 'fietsenstad', name: 'Fietsenstad', group: 'verkeer', step: 'k-fiets', hint: 'Koop eerst een fiets in het verhaal', desc: 'Al het verkeer stapt over op de fiets. Eindelijk klopt de stad met de folder.' },
  { id: 'stilleweg', name: 'Stille weg', group: 'verkeer', desc: 'Het verkeer sterft langzaam uit. Na een minuut hoor je alleen nog de wind en een enkele trekker.' },
  { id: 'brommerstad', name: 'Brommerstad', group: 'verkeer', step: 'k-fiets', hint: 'Koop eerst een fiets in het verhaal', desc: 'De auto\'s verdwijnen, de brommers komen. Iedereen rijdt vijfenveertig en toetert erbij.' },
  { id: 'avondspits', name: 'Avondspits', group: 'verkeer', ach: 'wrakken_25', desc: 'Alle wegen vol. Drie rijen dik op een tweebaansweg, en iedereen heeft haast.' },
  { id: 'oranjekoorts', name: 'Oranjekoorts', group: 'verkeer', safe: true, desc: 'Elke auto is oranje, alsof er elke dag een wedstrijd is.' },
  { id: 'regenboogverkeer', name: 'Regenboogverkeer', group: 'verkeer', safe: true, desc: 'Elke auto een eigen kleur. De fabriek had een goede week.' },
  { id: 'minimobielen', name: 'Minimobielen', group: 'verkeer', safe: true, desc: 'Alle auto\'s zijn koekjesdoosjes op wielen. Er past precies één boodschappentas in.' },
  { id: 'alleentrekkers', name: 'Alleen trekkers', group: 'verkeer', safe: true, desc: 'Geen fietsen en brommers meer: alleen grote, groene en rode bakbeesten die er de tijd voor nemen.' },
  { id: 'reuzenwagens', name: 'Reuzenwagens', group: 'verkeer', safe: true, desc: 'Auto\'s zo groot als een tractor, en daardoor minder. Parkeren is een probleem.' },
  { id: 'slowmo', name: 'Slow-mo bij botsingen', step: 'H3', desc: 'Elke klapper in vertraging, zodat je rustig kunt zien hoe het misging.' },
  { id: 'duivenstorm', name: 'Duivenstorm', step: 'H4', safe: true, desc: 'Duiven. Overal. Ze hebben iets gehoord over een eierbal.' },
  { id: 'storm', name: 'Zomer? Ja.', step: 'H5', desc: 'Code rood, de hele dag. Een echte Groningse zomer.' },
  { id: 'geenpolitie', name: 'Geen politie', step: 'H6', desc: 'De politie heeft een vrije dag. Na die kraak hebben ze die wel verdiend.' },
  { id: 'eeuwig', name: 'Eeuwige eierbal', step: 'H7', desc: 'Je gaat niet meer neer. Gefrituurd, gepaneerd en onverwoestbaar.' },
  { id: 'frituurvet', name: 'Frituurvet-wegen', step: 'H8', desc: 'Er lekt ergens een tankwagen. Remmen is meer een suggestie.' },
  { id: 'turbo', name: 'Turbo-Escapade', step: 'r-tuning', hint: 'Laat de Escapade eerst tunen in het verhaal', desc: 'De Escapade, maar dan zoals Knal & Kolder hem eigenlijk bedoeld had.' },
  { id: 'stuiter', name: 'Stuiterwagens', ach: 'wrakken_25', desc: 'Je auto stuitert bij elke klap en elke landing. Volgens de fabrikant is dat normaal.' },
  { id: 'snelletijd', name: 'De dag vliegt', group: 'klok', ach: 'zonsopgang', desc: 'De klok loopt vijf keer zo snel. Zo is het zo weer weekend.' },
  { id: 'magazijn', name: 'Vol magazijn', ach: 'ontsnapt_5', desc: 'Je raakt nooit meer door je munitie heen. Waar haal je het vandaan? Niet vragen.' },
  { id: 'alles', kind: 'perk', ach: 'fjord_klaar', name: 'Showroom', desc: 'Voertuig hier levert dan ook alles wat je (nog) niet hebt: elke fiets, auto, boot en de heli.' },
];

// Streken that no longer exist; savemigrate.js drops them from old saves.
export const RETIRED_CHEATS = ['geld'];

export const CHEAT_BY_ID = new Map(CHEATS.map((c) => [c.id, c]));

// Ids the story has unlocked (and the ones open from the start; the
// prestatie ones are cheats.js's). doneId(stepId), missionPassed(index): as
// storyarc.js stepDone takes them.
export function storyCheatUnlocks(doneId, missionPassed) {
  const out = [];
  for (const c of CHEATS) {
    if (c.ach) continue;
    if (!c.step) { out.push(c.id); continue; }
    const k = STEPS.findIndex((s) => s.id === (STEP_ALIAS[c.step] || c.step));
    if (k >= 0 && stepDone(k, doneId, missionPassed)) out.push(c.id);
  }
  return out;
}

// The same from a save's story and missions sections.
export function cheatUnlocksFromSave(d) {
  const st = d && d.story && typeof d.story === 'object' && Array.isArray(d.story.done) ? d.story.done : [];
  const passed = d && d.missions && Array.isArray(d.missions.completed) ? d.missions.completed : [];
  // an older save names the steps of the first version of the story: they stand for the steps of the story that is left
  const done = new Set([...st, ...st.map((id) => STEP_ALIAS[id]).filter(Boolean)]), ok = new Set(passed);
  return storyCheatUnlocks((id) => done.has(id), (i) => ok.has(i));
}
