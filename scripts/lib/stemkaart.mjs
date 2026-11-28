// Stemkaarten (#1367): leidt per personageblad (leeftijd, geslacht, dialectniveau, spreekstijl) de stemkaart af
// die de TTS-scripts nodig hebben: wie-beschrijving, accent, stijlpoel, tempo, taal en de gedeelde-stemlijst.
// Puur: geen netwerk, geen sleutel, geen audio. De bladen staan in scripts/stemkaarten.json; de bron van de
// inhoud is docs/verhaal/bijbel-28-11/01-verhaal-en-personages.md §2.
import { GRO_ACCENT, styleOf, langOf } from '../tts_cast.mjs';

// de dertig vaste Gemini-stemmen (alle dertig zijn al in gebruik: een nieuwe rol deelt een stem en onderscheidt zich)
export const GEMINI_VOICES = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede', 'Callirrhoe', 'Autonoe',
  'Enceladus', 'Iapetus', 'Umbriel', 'Algieba', 'Despina', 'Erinome', 'Algenib', 'Rasalgethi', 'Laomedeia', 'Achernar',
  'Alnilam', 'Schedar', 'Gacrux', 'Pulcherrima', 'Achird', 'Zubenelgenubi', 'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat'];

// dialectniveau (bijbel 01 §2.0): 0 standaard, 1 een Gronings woord, 2 Gronings in doses, 3 plat Gronings, F1/F2 Fries
export const DIALECTEN = {
  '0': { regio: 'Nederlandse', accent: 'spoken in standard Dutch, clear, without a regional accent', gronings: false, fries: false },
  '1': { regio: 'Groningse', accent: GRO_ACCENT, gronings: true, fries: false },
  '2': { regio: 'Groningse', accent: GRO_ACCENT, gronings: true, fries: false },
  '3': { regio: 'Groningse', accent: 'spoken in plat Gronings dialect (Grunnegs) exactly as written, broad Groningen accent', gronings: true, fries: false },
  F1: { regio: 'Friese', accent: 'spoken in Dutch with a warm Frisian accent, the Frisian words said in Frisian (Frysk)', gronings: false, fries: true },
  F2: { regio: 'Friese', accent: 'spoken in Dutch with a strong Frisian accent, short Frisian phrases said in Frisian (Frysk)', gronings: false, fries: true },
};

const SNEL = /^(snel|haastig|gehaast|vlot|energiek|onderbrekend)$/;
const TRAAG = /^(rustig|plechtig|langzaam|traag|bedachtzaam|zacht|loom|droog-vertellend)$/;

export function leeftijdsklasse(leeftijd) {
  if (leeftijd < 30) return 'jong';
  if (leeftijd < 50) return 'volwassen';
  if (leeftijd < 65) return 'rijper';
  if (leeftijd < 80) return 'oud';
  return 'zeer oud';
}
const LEEFTIJDSWOORD = { jong: 'jonge', volwassen: 'volwassen', rijper: 'rijpe', oud: 'oude', 'zeer oud': 'hele oude' };

// tempo: een expliciet blad.tempo wint, dan een snel of traag stijlwoord, anders de leeftijd (vanaf 65 langzaam)
export function tempoVan(blad) {
  if (blad.tempo) return blad.tempo;
  if (blad.stijl.some((s) => SNEL.test(s))) return 'snel';
  if (blad.stijl.some((s) => TRAAG.test(s))) return 'langzaam';
  return blad.leeftijd >= 65 ? 'langzaam' : 'gemiddeld';
}

// stijlpoel: de stijlwoorden in paren ("droog, kort"), zoals CAST.pool in tts_lines_list.mjs
export function poelVan(stijl) {
  if (stijl.length === 1) return [stijl[0]];
  const out = [];
  for (let i = 0; i < stijl.length; i++) for (let j = i + 1; j < stijl.length; j++) out.push(`${stijl[i]}, ${stijl[j]}`);
  return out.slice(0, 3);
}

export function buildStemkaart(blad) {
  const d = DIALECTEN[blad.dialect];
  const klasse = leeftijdsklasse(blad.leeftijd);
  const wie = `${LEEFTIJDSWOORD[klasse]} ${d.regio} ${blad.geslacht === 'v' ? 'vrouw' : 'man'}${blad.rol ? ` (${blad.rol})` : ''}, ${blad.stijl.slice(0, 2).join(' en ')}`;
  const pool = poelVan(blad.stijl);
  return {
    id: blad.id,
    naam: blad.naam,
    stem: blad.stem,
    wie,
    accent: d.accent,
    pool,
    tempo: tempoVan(blad),
    klasse,
    dialect: blad.dialect,
    taal: langOf(d.accent),
    // de stijlregel zoals gemini_tts.py hem krijgt: accent; wie. Tone: eerste poelstijl
    stijl: styleOf(wie, pool[0], d.accent),
    proefzinnen: blad.proef,
  };
}

// alle kaarten, met per kaart de ids die dezelfde stem delen
export function buildAll(bladen) {
  const kaarten = bladen.map(buildStemkaart);
  for (const k of kaarten) k.deelt = kaarten.filter((o) => o.id !== k.id && o.stem === k.stem).map((o) => o.id);
  return kaarten;
}

// twee kaarten op dezelfde stem zijn te onderscheiden als leeftijdsklasse, tempo of dialectniveau verschilt
export function onderscheidbaar(a, b) {
  return a.klasse !== b.klasse || a.tempo !== b.tempo || a.dialect !== b.dialect;
}
