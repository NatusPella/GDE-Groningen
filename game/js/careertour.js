// De carrière-tour (verhaalkern 21-11): Tammo en Tessa proberen allerlei loopbanen om een plekje in de wereld te vinden. Per vak staat
// wie goed is (Tammo, Tessa of samen) en of ze er samen kunnen werken. Dit is de data en de voortgangsregel voor het overzicht in het
// Loopbaan-menu en voor de prestaties `tour-*`; de bron van de inhoud is docs/VERHAAL-RELATIE-21-11.md (paragraaf 3). Het spel dwingt
// niets af: de loopbanen blijven voor iedereen vrij (unlockgate.js opent ze per akte, een gesloten vak is een zachte hint); het overzicht
// voedt tekst (autopraat, klusbeschrijvingen, grappen).
//
// Zuiver: geen DOM, geen wereld, geen opslag. `profiel` is het loopbaanprofiel van de speler (loopbaan.js: `gestart` is de lijst begonnen
// vakken). Samen spelen: elke speler heeft zijn eigen profiel en dus zijn eigen tour; niets over het net. Wiring in het menu: loopbaanui.js
// (nog te koppelen, zie docs/VERHAAL-VERIFICATIE-21-11.md). Test: scripts/careertour_test.mjs.
export const FIT = { tammo: 'Tammo', tessa: 'Tessa', samen: 'Samen' };

// [vak]: { fit, together, why }; `together: false` = ze kunnen hier niet goed samenwerken (de grap zit in de ruzie of het misverstand)
export const CAREER_FIT = {
  klus: { fit: 'tammo', together: true, why: 'Hij rijdt, zij heeft de planning.' },
  taxi: { fit: 'tammo', together: true, why: 'Rijden is zijn ding; zij leest de kaart.' },
  kantoor: { fit: 'tessa', together: false, why: 'Hij raakt de stempels kwijt, zij loopt hem voorbij.' },
  padel: { fit: 'tessa', together: false, why: 'Zodra het een dubbel is: ruzie over wie de bal had.' },
  vracht: { fit: 'tammo', together: true, why: 'Zware wagens zijn zijn terrein; zij houdt de papieren bij.' },
  bezorg: { fit: 'tammo', together: true, why: 'Elke straat kent hij; zij kent de klant.' },
  trein: { fit: 'tammo', together: true, why: 'Hij houdt van de dienstregeling, zij van het raam.' },
  bus: { fit: 'tammo', together: true, why: 'Hij bedankt de chauffeur; zij zoekt de overstap.' },
  race: { fit: 'tammo', together: true, why: 'Hij stuurt, zij roept de bochten.' },
  landbouw: { fit: 'tessa', together: false, why: 'De boerendochter; hij is bang voor koeien.' },
  buiten: { fit: 'tessa', together: false, why: 'Zij loopt voorop, hij zoekt een bankje.' },
  horeca: { fit: 'tessa', together: true, why: 'Zij kookt, hij draagt; samen een goed team.' },
  hengelen: { fit: 'tammo', together: false, why: 'Hij kan uren zwijgen aan het water; zij niet.' },
  water: { fit: 'tammo', together: false, why: 'Hij houdt van het water, zij wordt er zeeziek van.' },
  lucht: { fit: 'tammo', together: true, why: 'De duiven en de heli; zij houdt zijn pet vast.' },
  handhaving: { fit: 'tessa', together: true, why: 'Zij praat, hij staat er streng bij te kijken.' },
  kermis: { fit: 'tessa', together: true, why: 'Haar eerste eigen kraam, zijn botsauto\'s.' },
  podium: { fit: 'tessa', together: true, why: 'Zij praat het publiek warm, hij houdt het geluid.' },
  golf: { fit: 'tammo', together: false, why: 'Hij is precies; zij slaat te hard.' },
};

export const TOUR_ACHIEVEMENTS = [
  { id: 'tour-5', need: 5, titel: 'Het eerste halve dozijn', tekst: 'Vijf loopbanen geprobeerd.' },
  { id: 'tour-10', need: 10, titel: 'Een plekje zoeken', tekst: 'Tien loopbanen geprobeerd.' },
  { id: 'tour-alles', need: 19, titel: 'Een plekje in de wereld', tekst: 'Alle loopbanen geprobeerd.' },
];

// De voortgang van de tour: wat is geprobeerd, wat per fit, en welke prestaties daarbij horen. `vakken` is de lijst vak-id's (VAK_IDS).
export function tourProgress(profiel, vakken = Object.keys(CAREER_FIT)) {
  const began = new Set(profiel && Array.isArray(profiel.gestart) ? profiel.gestart : []);
  const tried = vakken.filter((v) => began.has(v));
  const by = { tammo: 0, tessa: 0, samen: 0 };
  let notTogether = 0;
  for (const v of tried) {
    const f = CAREER_FIT[v];
    if (!f) continue;
    by[f.fit]++;
    if (!f.together) notTogether++;
  }
  const earned = TOUR_ACHIEVEMENTS.filter((a) => tried.length >= Math.min(a.need, vakken.length)).map((a) => a.id);
  return { tried, total: vakken.length, by, notTogether, earned, done: tried.length === vakken.length && vakken.length > 0 };
}

// Het overzicht voor het menu: per vak naam, wie goed is, of ze samen kunnen werken en of de speler het al probeerde.
export function tourRows(profiel, naamVan = (v) => v) {
  const began = new Set(profiel && Array.isArray(profiel.gestart) ? profiel.gestart : []);
  return Object.entries(CAREER_FIT).map(([vak, f]) => ({ vak, naam: naamVan(vak), goed: FIT[f.fit], samen: f.together, waarom: f.why, geprobeerd: began.has(vak) }));
}
