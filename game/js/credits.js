// Third-party credits and the parody disclaimer, shown in the pause menu's Over section, the
// old start screen (QA/trailer) and after the ending. NOTICE.md in the repo root is the full
// list; keep the two in line. The Over screen folds credits and licences separately (#612), so
// the two halves are also available on their own; ABOUT_HTML is both together.
import { GAME_TITLE, SERIES, SERIES_MEANING } from './logo.js';
import { AUDIO_CREDITS } from './sfx/audiocredits.js';
import { escapeHtml as esc } from './htmlescape.js';

// The one disclaimer (#72, #37); README.md, NOTICE.md and docs/PRIVACY-EN-CREDITS.md carry the same text.
// It deliberately names no other game or publisher (constitution 2); the end credits only say 'alles verzonnen'.
const DISCLAIMER = `${GAME_TITLE} is een gratis, niet-commerciële fanparodie, niet gelieerd aan, gesponsord door of goedgekeurd door enige andere gameontwikkelaar of -uitgever. Namen, personages, bedrijven, merken en gebeurtenissen zijn verzonnen; gelijkenis met bestaande personen of bedrijven berust op toeval. Echte straten en openbare gebouwen zijn alleen het decor.`;

const OSM_ATTRIBUTION = '© OpenStreetMap-bijdragers';
// building heights and roof shapes (scripts/world/fetch_3dbag.py; CC BY 4.0)
// terrain heights (scripts/world/fetch_ahn.py; CC0, credit is a courtesy)
const AHN_ATTRIBUTION = 'Actueel Hoogtebestand Nederland (AHN) via PDOK';
const BAG3D_ATTRIBUTION = '3DBAG door de 3D geoinformation onderzoeksgroep (TU Delft) en 3DGI';
// gemeente-, woonplaats-, wijk- en buurtgrenzen (scripts/world/fetch_grenzen.mjs -> game/grenzen.json; CC BY 4.0 en Public Domain Mark)
const GRENZEN_ATTRIBUTION = 'Gemeentegrenzen: Kadaster (Bestuurlijke Gebieden), woonplaatsen: Kadaster (BAG), wijken en buurten: CBS (Gebiedsindelingen), via PDOK';

// De mensen die meehielpen, in volgorde van gemeten effort. AI-assistenten staan bewust
// niet in deze lijst: die noemen we bij de tech-stack (docs/CREDITS.md). Geen echte namen
// van anderen dan de eigenaar (constitution 4); handles zijn GitHub-gebruikersnamen.
export const CONTRIBUTORS = [
  { who: 'NatusPella', role: 'maker: idee, verhaal, regie, code en alles daartussen' },
  { who: 'astnagrath', role: 'tester en meedenker: feedback en issues' },
  { who: 'pixel-maus', role: 'tester en meedenker: feedback en issues' },
  { who: 'alexkramer98', role: 'tester en meedenker: feedback en een pull request' },
  { who: 'Teungritter', role: 'tester en meedenker: feedback' },
  { who: 'MathijsG', role: 'had toegang tot de repo en hielp als tester' },
  { who: 'ArmEagle', role: 'had toegang tot de repo en hielp als tester' },
  { who: 'wisskid', role: 'had toegang tot de repo en hielp als tester' },
  { who: 'Agnilor', role: 'had toegang tot de repo en hielp als tester' },
  { who: 'jonathanbuist', role: 'had toegang tot de repo en hielp als tester' },
  { who: 'de playtesters', role: 'alle spelers die builds uitprobeerden en feedback gaven' },
];

// AI-assistenten en ander gereedschap: geen credits, wel eerlijk vermeld als tech-stack
// (op verzoek van de eigenaar, 13-11-2026). Zie ook docs/CREDITS.md.
export const AI_ASSISTENTS = [
  ['Claude (Sonnet 5.5 en Opus 5.5)', 'code, tests, review en documentatie'],
  ['OpenHands', 'code, tests en reviewrondes'],
  ['chat1 en agent', 'test- en meetrondes'],
  ['DeepSeek V4.1 Flash via DeepSeek Harness', 'deze opschoon- en publicatieronde'],
  ['Google Gemini', 'stemmen en muziek'],
  ['Claude Design', 'het Martinitoren-model'],
];

// De opnames van Freesound (ADR 0039): per bron titel, auteurshandle en licentie, uit game/audio/sfx/manifest.json (via audiocredits.js).
export function geluidenHtml(lijst = AUDIO_CREDITS) {
  const link = (url, tekst) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${tekst}</a>`;
  // CC BY: titel (zoals gegeven), auteur, bronlink en licentielink; CC0 houdt de korte regel
  const li = (c) => (c.by && c.bron && c.licentieUrl
    ? `<li>${esc(c.beschrijving)}: ${link(c.bron, c.titel ? `${esc(c.titel)}` : `Freesound ${c.id}`)} van ${esc(c.auteur)}, ${link(c.licentieUrl, c.licentie)}, Freesound ${c.id}</li>`
    : `<li>${esc(c.beschrijving)}: ${esc(c.auteur)}, ${c.licentie}, Freesound ${c.id}</li>`);
  const by = lijst.filter((c) => c.by), cc0 = lijst.filter((c) => !c.by);
  return ['<h4>Geluiden</h4>',
    '<p>Voetstappen, weer, motoren, deuren en ander geluid zijn opnames van Freesound (freesound.org), bewerkt voor dit spel (ingekort, in niveau gelijkgetrokken, tot lussen gemaakt). Dank aan de makers.</p>',
    ...(by.length ? ['<p>Onder een Creative Commons-licentie met naamsvermelding:</p>', '<ul>', ...by.map(li), '</ul>'] : []),
    ...(cc0.length ? ['<p>Onder CC0 (publiek domein, met dank):</p>', '<ul>', ...cc0.map(li), '</ul>'] : [])].join('\n');
}

// [title, kicker] cards for the end credits (story.js)
export const THIRD_PARTY_CARDS = [
  ['NatusPella', 'ontwerp, verhaal, regie en code'],
  ['astnagrath · pixel-maus · alexkramer98 · Teungritter', 'testers en meedenkers'],
  ['MathijsG · ArmEagle · wisskid · Agnilor · jonathanbuist', 'hadden toegang en hielpen als tester'],
  [OSM_ATTRIBUTION, 'kaartdata (ODbL) · openstreetmap.org/copyright'],
  ['3DBAG', 'gebouwhoogtes en daken (CC BY 4.0) · TU Delft en 3DGI · 3dbag.nl'],
  ['AHN', 'terreinhoogte (CC0) · ahn.nl · pdok.nl'],
  ['Kadaster · CBS', 'gemeente-, woonplaats-, wijk- en buurtgrenzen (CC BY 4.0, Public Domain) · pdok.nl'],
  ['three.js · Bebas Neue · Big Shoulders Display', 'MIT-licentie · SIL Open Font License'],
  ['Phosphor Icons', 'alle iconen (MIT-licentie) · phosphoricons.com'],
  ['Quaternius', 'modulaire mensen, hun animaties en de Universal Animation Library (CC0) · quaternius.com'],
  ['Fanparodie', 'alles verzonnen'],
];

export const CREDITS_HTML = `
<h3>${GAME_TITLE}</h3>
<p>Een gratis, niet-commercieel fanproject uit Groningen. ${SERIES} staat voor ${SERIES_MEANING}. ${DISCLAIMER}</p>
<h4>Met dank aan</h4>
<p>In volgorde van bijdrage, van groot naar klein. Zonder hen was dit er niet.</p>
<ul>
${CONTRIBUTORS.map((c) => `<li><strong>${c.who}</strong> — ${c.role}</li>`).join('\n')}
</ul>
<h4>Kaart</h4>
<p>Straten, gebouwen, water en plekken: kaartdata ${OSM_ATTRIBUTION}, beschikbaar onder de Open Database License (ODbL). Zie openstreetmap.org/copyright.</p>
<p>Gebouwhoogtes en dakvormen: ${BAG3D_ATTRIBUTION}, onder CC BY 4.0. Zie 3dbag.nl.</p>
<p>Terreinhoogte (dijken, wierden, hellingen): ${AHN_ATTRIBUTION}, CC0. Zie ahn.nl en pdok.nl.</p>
<p>Grenzen van gemeenten, woonplaatsen, wijken en buurten (gebieden veroveren): ${GRENZEN_ATTRIBUTION}. Gemeenten, wijken en buurten onder CC BY 4.0, woonplaatsen als Public Domain Mark. Zie pdok.nl.</p>
<h4>Muziek en stemmen</h4>
<p>De muziek (G-Music, Nachtstreek, het titelnummer) en alle stemmen zijn gemaakt met Google Gemini (muziek en Gemini TTS via OpenRouter). De Martinitoren is gemodelleerd met Claude Design. Geluidseffecten worden grotendeels in het spel zelf gesynthetiseerd, aangevuld met opnames van Freesound (zie Geluiden hieronder).</p>
${geluidenHtml()}
<h4>Software en lettertypes</h4>
<p>Gemaakt met hulp van AI-assistenten: ${AI_ASSISTENTS.map(([who, role]) => `${who} (${role})`).join('; ')}. Zij staan hier als tech-stack, niet als credits.</p>
<ul>
<li>three.js, © three.js authors, MIT-licentie</li>
<li>Phosphor Icons (@phosphor-icons/core), © 2023 Phosphor Icons, MIT-licentie: alle iconen in het spel</li>
<li>Quaternius (quaternius.com), Ultimate Modular Men, Ultimate Modular Women en Universal Animation Library, CC0: de modulaire mensen en hun animaties (ADR 0050)</li>
<li>Bebas Neue, © 2010 Dharma Type, SIL Open Font License 1.1</li>
<li>Big Shoulders Display (het logo), © 2019 The Big Shoulders Project Authors, SIL Open Font License 1.1</li>
<li>Desktopversie: Electron en electron-builder (MIT), met Chromium (diverse open-sourcelicenties, zie LICENSES.chromium.html bij de app)</li>
</ul>
`;

export const LICENSES_HTML = `
<h4>Licenties</h4>
<p>De code is vrije software onder de GPL-3.0 (of later). Stemmen, muziek, verhaal en dialogen vallen onder CC BY-NC-SA 4.0. De naam ${SERIES} en het logo zijn niet vrij te gebruiken. Zie LICENSE, LICENSE-CONTENT.md en NOTICE.md bij de broncode.</p>
<h4>Privacy</h4>
<p>Het spel bewaart je voortgang en instellingen alleen op dit apparaat (localStorage): geen account, geen tracking, geen statistieken. Bij elke start kies je Alleen spelen of Samen spelen. Alleen spelen gebruikt het netwerk niet voor Samen spelen; bij Samen spelen speel je in een eigen besloten sessie en daarvoor gaat je IP-adres naar een openbare STUN-server en lopen de versleutelde signaleringsberichten via openbare brokers. Deel je de sessie niet, dan zie je geen andere spelers. Fouten schrijft het spel op in een eigen logboek op dit apparaat (Over › Problemen); dat verstuurt niets, je kunt het zelf kopiëren als je een fout wilt melden. Live bussen en live treinen staan standaard aan, ook bij Alleen spelen, en elk heeft een eigen uitzetter (pauzemenu › Instellingen › Spelregels): daarvoor vraagt het spel openbare gegevens op (de busposities, en in de desktopapp eens per minuut de treinvertragingen, ongeveer 1 MB), zonder gegevens van jou. In Samen spelen vraagt het spel geen live treinen op. Alleen de browserversie haalt bij het laden three.js en de lettertypes op bij jsDelivr en Google Fonts.</p>
<p>Samen spelen (als je een sessie deelt of met iemand meespeelt) deelt je IP-adres met je medespeler. Met een kamercode gebruikt het spel daarbij openbare servers om elkaar te vinden: een openbare STUN-server en openbare signaleringsservers, waar alleen versleutelde berichten langsgaan. Met een IP-adres verbindt de ander rechtstreeks met jou en opent je router een poort; die sluit weer als je stopt. Je krijgt altijd eerst een melding en je kiest zelf. Er is geen account, geen telemetrie en niets van je voortgang gaat mee.</p>
`;

// Both halves together: the old start screen's "Over" panel (startscreen.js) still uses this.
export const ABOUT_HTML = CREDITS_HTML + LICENSES_HTML;
