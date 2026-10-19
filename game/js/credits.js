// Third-party credits and the parody disclaimer, shown in the start screen's
// "Over" panel and after the ending. NOTICE.md in the repo root is the full
// list; keep the two in line.

import { GAME_TITLE, SERIES, SERIES_MEANING } from './logo.js';

const DISCLAIMER = `${SERIES} is een fanparodie op GTA, niet gelieerd aan of goedgekeurd door Rockstar Games of Take-Two Interactive. Namen, personages, merken en gebeurtenissen zijn verzonnen.`;

const OSM_ATTRIBUTION = '© OpenStreetMap-bijdragers';
// building heights and roof shapes (scripts/world/fetch_3dbag.py; CC BY 4.0)
// terrain heights (scripts/world/fetch_ahn.py; CC0, credit is a courtesy)
const AHN_ATTRIBUTION = 'Actueel Hoogtebestand Nederland (AHN) via PDOK';
const BAG3D_ATTRIBUTION = '3DBAG door de 3D geoinformation onderzoeksgroep (TU Delft) en 3DGI';

// [title, kicker] cards for the end credits (story.js)
export const THIRD_PARTY_CARDS = [
  [OSM_ATTRIBUTION, 'kaartdata (ODbL) · openstreetmap.org/copyright'],
  ['3DBAG', 'gebouwhoogtes en daken (CC BY 4.0) · TU Delft en 3DGI · 3dbag.nl'],
  ['AHN', 'terreinhoogte (CC0) · ahn.nl · pdok.nl'],
  ['Google Gemini', 'muziek en stemmen, gemaakt met AI'],
  ['three.js · Bebas Neue · Big Shoulders Display', 'MIT-licentie · SIL Open Font License'],
  ['Fanparodie', 'niet van Rockstar Games of Take-Two. Alles verzonnen'],
];

export const ABOUT_HTML = `
<h3>${GAME_TITLE}</h3>
<p>Een gratis, niet-commercieel fanproject uit Groningen. ${SERIES} staat voor ${SERIES_MEANING}. ${DISCLAIMER}</p>
<h4>Kaart</h4>
<p>Straten, gebouwen, water en plekken: kaartdata ${OSM_ATTRIBUTION}, beschikbaar onder de Open Database License (ODbL). Zie openstreetmap.org/copyright.</p>
<p>Gebouwhoogtes en dakvormen: ${BAG3D_ATTRIBUTION}, onder CC BY 4.0. Zie 3dbag.nl.</p>
<p>Terreinhoogte (dijken, wierden, hellingen): ${AHN_ATTRIBUTION}, CC0. Zie ahn.nl en pdok.nl.</p>
<h4>Muziek en stemmen</h4>
<p>De muziek (G-Music, Nachtstreek, het titelnummer) en alle stemmen zijn gemaakt met Google Gemini (muziek en Gemini TTS via OpenRouter). De Martinitoren is gemodelleerd met Claude Design. Geluidseffecten worden in het spel zelf gesynthetiseerd.</p>
<h4>Software en lettertypes</h4>
<ul>
<li>three.js, © three.js authors, MIT-licentie</li>
<li>Bebas Neue, © 2010 Dharma Type, SIL Open Font License 1.1</li>
<li>Big Shoulders Display (het logo), © 2019 The Big Shoulders Project Authors, SIL Open Font License 1.1</li>
<li>Desktopversie: Electron en electron-builder (MIT), met Chromium (diverse open-sourcelicenties, zie LICENSES.chromium.html bij de app)</li>
</ul>
<h4>Licenties</h4>
<p>De code is vrije software onder de GPL-3.0 (of later). Stemmen, muziek, verhaal en dialogen vallen onder CC BY-NC-SA 4.0. De naam ${SERIES} en het logo zijn niet vrij te gebruiken. Zie LICENSE, LICENSE-CONTENT.md en NOTICE.md bij de broncode.</p>
<h4>Privacy</h4>
<p>Het spel bewaart je voortgang en instellingen alleen op dit apparaat (localStorage). Er gaat niets naar een server: geen account, geen tracking, geen statistieken. Fouten schrijft het spel op in een eigen logboek op dit apparaat (Instellingen › Foutrapport); dat verstuurt niets, je kunt het zelf kopiëren als je een fout wilt melden. Alleen de browserversie haalt bij het laden three.js en de lettertypes op bij jsDelivr en Google Fonts.</p>
<p>Samen spelen (alleen als je het zelf aanzet) deelt je IP-adres met je medespeler. Met een kamercode gebruikt het spel daarbij openbare servers om elkaar te vinden: een openbare STUN-server en openbare signaleringsservers, waar alleen versleutelde berichten langsgaan. Met een IP-adres verbindt de ander rechtstreeks met jou en opent je router een poort; die sluit weer als je stopt. Je krijgt altijd eerst een melding en je kiest zelf. Er is geen account, geen telemetrie en niets van je voortgang gaat mee.</p>
`;
