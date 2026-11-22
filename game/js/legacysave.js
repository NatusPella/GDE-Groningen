// De kaart "Nieuw verhaal" bij een oude save (22-11, besluit eigenaar). Een save van een eerdere versie heeft het nieuwe verhaal
// niet meegekregen: geen ontgrendelpoort (unlockgate.js, `story.gate`), een verhaalsave van de eerste vorm (`story.v` 1), of een
// save van het eerste verhaal (`oudGemigreerd`). Zo'n save blijft werken zoals hij is (alles open, geen dataverlies, de migraties
// van savemigrate.js blijven gelden); de kaart zegt alleen eerlijk dat een nieuw spel het nieuwe verhaal het best laat zien.
//
// Zuiver: geen DOM, geen opslag. De kaart verschijnt eenmaal per save: `legacyCardSeen` staat in de save zelf (savegame.js schrijft
// hem mee, saveslots.js zet hem vóór het laden). Samen spelen: alles lokaal, er gaat niets over het netwerk.
import { GATE_VERSION } from './unlockgate.js';

export const LEGACY_CARD = {
  titel: 'Nieuw verhaal',
  tekst: 'Dit spel komt van een eerdere versie. Voor het nieuwe verhaal werkt een nieuw spel het best.',
  doorgaan: 'Doorgaan',
  nieuw: 'Nieuw spel',
  tag: 'Oude versie',
};

const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);

// Een gate die de poort van nu kent (zelfde regel als unlockgate.js isNewGate, zonder die intern te exporteren).
const isCurrentGate = (g) => isObj(g) && g.v === GATE_VERSION && Array.isArray(g.open) && g.legacy !== true;

// Heeft deze (gemigreerde) save voortgang die een nieuw spel niet zou hebben? Een leeg spel heeft niets te verliezen en niets te melden.
function hasProgress(d) {
  const st = isObj(d.story) ? d.story : null;
  const stepsDone = st && Array.isArray(st.done) ? st.done.length : 0;
  const missions = isObj(d.missions) && Array.isArray(d.missions.completed) ? d.missions.completed.length : 0;
  return stepsDone > 0 || missions > 0;
}

// Is dit een save van een eerdere versie van het verhaal?
export function isLegacyStorySave(d) {
  if (!isObj(d)) return false;
  if (d.oudGemigreerd === true) return true;
  if (!hasProgress(d)) return false;
  const st = isObj(d.story) ? d.story : null;
  if (!st) return true;
  return st.v === 1 || !isCurrentGate(st.gate);
}

// Moet de kaart nu getoond worden? Eenmaal per save.
export const legacyCardNeeded = (d) => isLegacyStorySave(d) && !(isObj(d) && d.legacyCardSeen === true);

// De save met de vlag erbij (een kopie; raakt voortgang en geld nooit aan).
export const withCardSeen = (d) => (isObj(d) ? { ...d, legacyCardSeen: true } : d);

// Zet de vlag in de ruwe tekst van een save, zonder te migreren: de rest blijft byte voor byte wat de parser eruit haalt.
// Geeft de nieuwe tekst, of null als de tekst geen JSON-object is.
export function textWithCardSeen(raw) {
  try {
    const d = JSON.parse(raw);
    if (!isObj(d)) return null;
    if (d.legacyCardSeen === true) return raw;
    return JSON.stringify(withCardSeen(d));
  } catch (e) { return null; }
}
