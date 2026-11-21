// Loopbaanmomenten (inspiratie A6 en A19): bij het begin van een loopbaan een "vraag van de dag" (Tessa of Tammo stelt een vraag
// over het vak, de ander antwoordt droog) en bij het eerste niveau omhoog een koppelmoment (twee regels waarin ze samen terugkijken: wie
// was hier goed, en lukte het samen?). Alles is korte ondertitelpraat (storytalk.js), nooit voortgang, geld of een eis. De inhoud volgt
// careertour.js (wie is goed, samen of niet). Tekst zonder opname: tot de TTS-ronde leest hij als ondertitel.
// Zuiver: geen DOM, geen wereld; scripts/careerbeats_test.mjs. Samen spelen: lokaal bij de speler die de loopbaan begint of omhoog gaat.
import { CAREER_FIT } from './careertour.js';

// [vak]: { vraag: [[wie, tekst], ...], koppel: [[wie, tekst], ...] }; wie is 'T' (Tammo) of 'A' (Tessa)
export const CAREER_BEATS = {
  klus: { vraag: [['A', 'Hoeveel schroeven heb jij hier?'], ['T', 'Genoeg. Het zijn er altijd te weinig.']], koppel: [['T', 'Dat ging goed.'], ['A', 'Jij bouwt, ik tel. Zo hoort het.']] },
  taxi: { vraag: [['T', 'Links of rechts?'], ['A', 'Jij rijdt. Ik zeg het wel als het fout gaat.']], koppel: [['A', 'Je bedankt elke klant.'], ['T', 'Dat doet iedereen toch?']] },
  kantoor: { vraag: [['A', 'Heb je een pen?'], ['T', 'Ik had er een. Vanochtend.']], koppel: [['A', 'Ik doe dit liever alleen.'], ['T', 'Dat weet ik. Ik wacht buiten.']] },
  padel: { vraag: [['T', 'Wie slaat?'], ['A', 'Ik. Jij staat daar.']], koppel: [['T', 'Dat was míjn bal.'], ['A', 'Nee.']] },
  vracht: { vraag: [['A', 'Hoe breed is die oplegger?'], ['T', 'Breder dan de weg. Dat is de bedoeling.']], koppel: [['T', 'Dit is een grote auto.'], ['A', 'Je glimlacht.']] },
  bezorg: { vraag: [['T', 'Welk huisnummer?'], ['A', 'Zeventien. Het is altijd zeventien.']], koppel: [['A', 'Ze kennen je al.'], ['T', 'Ik ken hun honden.']] },
  trein: { vraag: [['A', 'Staat de trein er al?'], ['T', 'Hij staat er altijd net niet.']], koppel: [['T', 'Je kijkt de hele rit uit het raam.'], ['A', 'Ik kijk naar jou kijken.']] },
  bus: { vraag: [['T', 'Welke halte was dit?'], ['A', 'De vorige. Ik zeg het toch?']], koppel: [['A', 'Je bedankt de chauffeur.'], ['T', 'Hij reed goed.']] },
  race: { vraag: [['A', 'Hoe hard ga je?'], ['T', 'Hard genoeg om er niet over te praten.']], koppel: [['T', 'Dat was een goede bocht.'], ['A', 'Ik riep hem.']] },
  landbouw: { vraag: [['A', 'Dit is een koe.'], ['T', 'Ik zie het. Hij ziet mij ook.']], koppel: [['A', 'Hij loopt achter je aan.'], ['T', 'Dat is een compliment, toch?']] },
  buiten: { vraag: [['T', 'Is er een bankje?'], ['A', 'Er is een pad.']], koppel: [['A', 'Je zocht een bankje.'], ['T', 'Ik vond er twee.']] },
  horeca: { vraag: [['A', 'Meer zout.'], ['T', 'Hoeveel meer?']], koppel: [['T', 'Dat smaakt naar thuis.'], ['A', 'Dat is het zout.']] },
  hengelen: { vraag: [['T', '...'], ['A', 'Je zegt niks.']], koppel: [['A', 'Drie uur, niks gezegd.'], ['T', 'Het was een goede drie uur.']] },
  water: { vraag: [['A', 'Hoe diep is het hier?'], ['T', 'Dieper dan jij wilt weten.']], koppel: [['T', 'Je bent groen.'], ['A', 'Het was het water.']] },
  lucht: { vraag: [['A', 'Hou je pet vast.'], ['T', 'De duiven vinden hem mooi.']], koppel: [['T', 'Boven de stad is het stil.'], ['A', 'Jij bent stil.']] },
  handhaving: { vraag: [['T', 'Moeten we iets zeggen?'], ['A', 'Ik zeg het wel. Jij kijkt streng.']], koppel: [['A', 'Ze luisterden.'], ['T', 'Door mijn blik.']] },
  kermis: { vraag: [['A', 'Hoeveel kost een kaartje?'], ['T', 'Voor jou niks. Voor mij een euro.']], koppel: [['T', 'De botsauto blijft mijn favoriet.'], ['A', 'Dat weet ik.']] },
  podium: { vraag: [['A', 'Staat het geluid?'], ['T', 'Het geluid staat altijd.']], koppel: [['T', 'Je praat ze warm.'], ['A', 'Jij houdt ze rustig.']] },
  golf: { vraag: [['T', 'Zachtjes.'], ['A', 'Dat is zachtjes.']], koppel: [['A', 'De bal ligt in het water.'], ['T', 'Ik zei zachtjes.']] },
};

const speaker = { T: 'Tammo', A: 'Anita' };
const BEAT_KINDS = ['vraag', 'koppel'];

// De regels als talk-regels voor storytalk.js playTalk (zonder opname: ondertitel).
export function careerTalk(vak, kind) {
  const m = CAREER_BEATS[vak];
  if (!m || !BEAT_KINDS.includes(kind)) return [];
  return m[kind].map(([w, text]) => ({ speaker: speaker[w], text, voice: null, channel: 'stem', textOnly: true }));
}

// Controle voor de tests: alle vakken, korte regels, en het koppelmoment past bij de fit (samen of niet).
export function beatProblems(vakken) {
  const out = [];
  for (const v of vakken) {
    const m = CAREER_BEATS[v];
    if (!m) { out.push(`${v}: geen momenten`); continue; }
    for (const k of BEAT_KINDS) {
      if (!Array.isArray(m[k]) || m[k].length !== 2) out.push(`${v}.${k}: twee regels nodig`);
      for (const [w, t] of m[k] || []) if (!speaker[w] || !t || t.split(/\s+/).length > 12) out.push(`${v}.${k}: een regel is leeg of langer dan twaalf woorden`);
    }
    if (!CAREER_FIT[v]) out.push(`${v}: niet in de tour`);
  }
  return out;
}
