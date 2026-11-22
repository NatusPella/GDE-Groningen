// De verhaalbeats van de voetbalcarrière (#1112, epic #1106, docs/VOETBAL-CARRIERE-21-11.md hoofdstuk 2): puur, geen DOM (scripts/voetbal_beats_test.mjs). Tien korte beats (B1 tot en met B10): stille appjes en
// een tribuneregel, hooguit 14 woorden per HUD-bericht. Canon (21-11): Tammo en Tessa zijn net afgestudeerd en werkloos (vrienden uit hun studietijd), geld is krap, alles begint klein: geen tekst over
// jeugd, kinderen, "al jaren" of een leeftijd. De figuur die niet speelt regelt de papieren (speel je Tessa, dan appt Tammo; speel je Tammo, dan appt Tessa). Altijd zomer: geen winterstop.
// "Grunn" nooit "de Grunn". Ontgrendeling: akte 4 via voetbalpoort.js; een beat komt nooit tijdens een missie of scène en hooguit een per speldag; een gemiste beat wacht, hij vervalt niet.
import { WORD_BUDGET } from './hudtext.js';

export const BEAT_MAX_WORDS = WORD_BUDGET.phone;       // 14
// Per beat: de trigger (een functie van het profiel), de tekst per speler (`anita`: je speelt Tessa, Tammo regelt; `tammo`: je speelt Tammo, Tessa regelt) en wie spreekt.
export const BEATS = [
  { id: 'B1', naam: 'Uitnodiging', when: () => true, once: true, uitnodiging: true,
    anita: { wie: 'Tammo', tekst: 'De club hier in de buurt zoekt spelers. Ik heb je aangemeld.' }, tammo: { wie: 'Tessa', tekst: 'De club hier in de buurt zoekt spelers. Ik heb jou opgegeven. Niet zeuren.' } },
  { id: 'B2', naam: 'Eerste training', when: (c) => !!c.flags.trained,
    anita: { wie: 'Tessa', tekst: 'Het ruikt hier naar gras en oud zweet. Net als bij het dorpsteam.' }, tammo: { wie: 'Tammo', tekst: 'Het ruikt naar gras en oud zweet. Ik heb hier geen spijt van.' } },
  { id: 'B3', naam: 'Debuut', when: (c) => !!c.flags.debut,
    anita: { wie: 'Tammo', tekst: 'Je speelde alsof je dit al jaren doet. Het dorpsteam, hè.' }, tammo: { wie: 'Tessa', tekst: 'Je bleef overeind. Dat is meer dan ik van je verwachtte.' } },
  { id: 'B4', naam: 'Eerste doelpunt', when: (c) => !!c.flags.firstGoal,
    anita: { wie: 'Oma Trijntje', tekst: 'Oma Trijntje juicht op de tribune. Haar hoed vliegt de gracht in.' }, tammo: { wie: 'Oma Trijntje', tekst: 'Oma Trijntje juicht op de tribune. Haar hoed vliegt de gracht in.' } },
  { id: 'B5', naam: 'Promotie', when: (c) => !!(c.result && /promotie/.test(c.result.outcome)),
    anita: { wie: 'Tammo', tekst: 'Terpklasse. Je vergoeding gaat omhoog. Mijn baan betaalt nog steeds minder.' }, tammo: { wie: 'Tessa', tekst: 'Terpklasse. Je vergoeding gaat omhoog. Ik reken op een rondje.' } },
  { id: 'B6', naam: 'Het eerste bod', when: (c) => c.seasonNr >= 2 && !!c.flags.bid,
    anita: { wie: 'Tammo', tekst: 'Een club biedt. Jij kiest, ik regel de papieren. Geen druk.' }, tammo: { wie: 'Tessa', tekst: 'Een club biedt. Jij kiest, ik regel de papieren. Zonder druk.' } },
  { id: 'B7', naam: 'Beker', when: (c) => !!c.flags.cupFinal,
    anita: { wie: 'Hilbrand', tekst: 'De Dijkbeker is binnen! Tessa kijkt of ze moet huilen of lachen.' }, tammo: { wie: 'Hilbrand', tekst: 'De Dijkbeker is binnen! Tammo kijkt of hij moet huilen of lachen.' } },
  { id: 'B8', naam: 'Kapitein', when: (c) => c.seasonNr >= 3 && !!c.flags.captain,
    anita: { wie: 'Tammo', tekst: 'De selectie heeft gestemd. Jij draagt de band.' }, tammo: { wie: 'Tessa', tekst: 'De selectie heeft gestemd. Jij draagt de band. Dat meen ik.' } },
  { id: 'B9', naam: 'Trainer', when: (c) => !!c.roles.trainer,
    anita: { wie: 'Tammo', tekst: 'Ik regel de papieren naast mijn klusjes. Jij regelt de opstelling.' }, tammo: { wie: 'Tessa', tekst: 'Ik regel de papieren naast mijn klusjes. Jij regelt de opstelling.' } },
  { id: 'B10', naam: 'Manager', when: (c) => !!c.roles.manager,
    anita: { wie: 'Tammo', tekst: 'Het eerste aandeel kan. Bezit, tabblad Club. Ik kijk mee.' }, tammo: { wie: 'Tessa', tekst: 'Het eerste aandeel kan. Bezit, tabblad Club. Ik kijk mee.' } },
];
export const beatText = (beat, char) => (char === 'tammo' ? beat.tammo : beat.anita);
// De figuur die de papieren regelt: de ander dan de speler.
export const partnerOf = (char) => (char === 'tammo' ? 'Tessa' : 'Tammo');

// Mag er nu een beat komen? ctx = { unlocked: de poort, busy: een missie, scène of kaart loopt, day: de speldag }. Allemaal waar, anders wacht hij.
export const beatMayShow = (c, ctx = {}) => !!ctx.unlocked && !ctx.busy && (c.flags.beatDay | 0) !== (ctx.day | 0) + 1;
// De volgende beat van het profiel: de eerste die zijn trigger haalt en nog niet gedaan is. B1 hoort bij het niet-gestarte profiel (`inviteBeat`).
export function nextBeat(c, ctx = {}) {
  if (!c || !c.started || !beatMayShow(c, ctx)) return null;
  const seen = c.flags.beats | 0;
  for (let i = 1; i < BEATS.length; i++) {
    if (seen & (1 << i)) continue;
    if (BEATS[i].when(c)) return BEATS[i];   // een beat wacht niet op een eerdere die zijn trigger nooit haalt (B6 zonder bod)
  }
  return null;
}
// Een beat als gedaan markeren (een nieuw profiel; de beat-dag voorkomt twee beats op een dag).
export function markBeat(c, beat, day = 0) {
  const i = BEATS.findIndex((b) => b.id === beat.id);
  if (i < 0) return c;
  return { ...c, flags: { ...c.flags, beats: (c.flags.beats | 0) | (1 << i), beatDay: (day | 0) + 1 } };
}
export const beatsDone = (c) => BEATS.filter((b, i) => ((c.flags && c.flags.beats) | 0) & (1 << i)).map((b) => b.id);

// De uitnodiging (B1): voor een speler die nog niet begon. progress is wat de poort nodig heeft (voetbalpoort.js); busy = missie of scène.
export function inviteBeat(c, ctx = {}, char = 'anita') {
  if (c && c.started) return null;
  if (!ctx.unlocked || ctx.busy) return null;
  if (c && c.inviteDay != null && (c.inviteDay | 0) === (ctx.day | 0)) return null;      // hooguit een keer per speldag
  return { beat: BEATS[0], ...beatText(BEATS[0], char) };
}

// Wat de regelaar voorstelt in het scherm Vandaag: één voorstel, in de persona van de figuur die niet speelt (droog en praktisch).
export function proposal(c, getNext = null) {
  if (!c || !c.started) return null;
  const partner = partnerOf(c.char);
  const m = getNext;
  if (c.injury) return { wie: partner, tekst: `Rust uit. ${c.injury.text}.` };
  if (c.fatigue >= 75) return { wie: partner, tekst: 'Je bent moe. Een dag rust is geen schande.' };
  if (m && m.status === 'open') return { wie: partner, tekst: 'De wedstrijd wacht. Speel hem zelf voor het volle bedrag.' };
  if (!c.trainedDay || c.trainedDay < 0) return { wie: partner, tekst: c.char === 'anita' ? 'Train op schot: dat is je beste wapen.' : 'Train op pass: dat is waar je baat bij hebt.' };
  return { wie: partner, tekst: 'Train vandaag nog een keer. Het kost niets.' };
}
// De regel voor de HUD (hooguit 14 woorden).
export const hudLine = (beat, char) => { const b = beatText(beat, char); return `${b.wie}: ${b.tekst}`; };
