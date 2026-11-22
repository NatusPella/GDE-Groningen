# Taalregel: Stad, Ommeland en Grunn (22-11)

Besluit van de eigenaar, gesteund door de coördinator: "Als iets onderdeel is van de Stad Groningen, ook gewoon Stad zeggen in plaats van Grunn? Het is immers Stad en Ommeland." Zo zeggen Groningers het zelf. De regel staat ook in AGENTS.md (constitution 1), `.specs-fire/standards/ui-taal.md` en `.specs-fire/standards/verhaal.md`. De bewaking is `scripts/stad_grunn_test.mjs`; de lijst van voorkomens staat in [STAD-GRUNN-AUDIT-22-11.md](STAD-GRUNN-AUDIT-22-11.md).

## De regel

| Woord | Betekent | Voorbeelden |
|---|---|---|
| **de Stad** | de stad Groningen zelf (hoofdletter S als eigennaam; "in de Stad", "naar de Stad", "uit de Stad", Stadjer) | wijken, straten, de Martinitoren, de Vismarkt, de Euroborg, het station, Paddepoel, de grachten, de Poelestraat |
| **Ommeland**, de Ommelanden, in het Ommeland | de rest van de provincie, buiten de stad | de dorpen, de kust, de Veenkoloniën; de bestaande gebiedslabels ("Marum · Ommeland") |
| **Grunn** | het geheel: de provincie, het gevoel, de naam van het spel | slogans ("Ontdek jezelf in Grunn"), titels, "Grunn is nooit klaar", "Moi, Grunn", "Heel Grunn klapt", prestatietitels, NPC-dialoog waar de hele provincie of de eigen identiteit bedoeld wordt |
| **Groningen** | de officiële naam | titels, credits, bordteksten, een station ("Station Groningen"), de zin "het beleg van Groningen" waar het een naam is |

Daarbij:

1. Nooit "de Grunn". Wel "Grunn" zonder lidwoord, en "de Stad" met.
2. "Grunners" en "Grunnegers" blijven voor mensen uit de provincie, "Stadjers" voor mensen uit de stad. Grunneger, Grunnegs en Grunn-achtig (de verzonnen club) blijven zoals ze zijn.
3. In dialoog mag een personage afwisselen, maar een uitspraak over een plek in de Stad zegt Stad: "In de Stad hebben we de Martinitoren", niet "In Grunn hebben we de Martinitoren".
4. Een uitspraak over het geheel blijft Grunn: "In Grunn heet dat zomer", "Welkom in Grunn", "regen in Grunn is een levenshouding".
5. Twijfel je? Blijf bij Grunn. Een gewone zin over het weer, het eten of het gevoel is bijna altijd het geheel.

## Gebiedsmeldingen en kaartlabels

De wijken van de Stad tonen **Stad**, de rest toont **Ommeland** of de plaatsnaam (`districtat.js`, `hud_panel.js`):

- Locatieregel naast de minimap: "Bisschopskwartier · Stad" in de stad, "Marum · Ommeland" erbuiten.
- Straatpraatkaartje: "Opgevangen in de Stad" (`gebabbel.js`, `AREA_NAMES`).
- Onweerbericht in de stad: "Onweer boven de Stad" (`weather.js`). Storm en code rood gelden voor het hele gebied en blijven "boven Grunn".
- Valt een plek niet in een wijk en ook niet in een dorp, dan blijft de terugval "Grunn" (het geheel).

## Voorbeelden

| Was | Nu | Waarom |
|---|---|---|
| Ik ken elke brug in Grunn. | Ik ken elke brug in de Stad. | bruggen en grachten zijn Stad |
| Station Grunn | Station Groningen | de naam van het station is officieel |
| Het hart van Grunn. (Binnenstad) | Het hart van de Stad. | een wijk van de Stad |
| Het grootste plein van Grunn. (Grote Markt) | Het grootste plein van de Stad. | een plek in de Stad |
| Dat is Veendam. Bijna net zo groot als Grunn. | ... als de Stad. | vergelijking met de stad |
| Ontdek jezelf in Grunn. | blijft | slogan, het geheel |
| Heel Grunn klapt voor een duif. | blijft | heel Grunn is idioom voor het geheel |
| Groeten uit Grunn (ansichtkaart) | blijft | slogan, de kaart groet de provincie |

## Wat is aangepast (22-11)

De audit (`node scripts/stad_grunn_audit.mjs`) telt per categorie: A (hoort Stad), B (blijft Grunn), C (twijfel). Alle duidelijke A zijn aangepast, in de bron en in wat daarvan is afgeleid:

- bronnen: `docs/verhaal/nieuw/09-script-akte*.md`, `game/js` (rondvaart, wijkintro's, plekregels, reisbeats, tips), `game/storydata/humor.ronde4.json`, `website/slideshows.mjs`;
- afgeleid: `game/storydata/script.json` (met `node scripts/build_story_data.mjs`), `scripts/gronings_spoken.json` (Nederlands en gesproken vorm), `scripts/tts_lines.json`, `scripts/tts_waiting.json`, `scripts/voice_wacht.json`.

De stemregels waarvan de tekst veranderde hebben nog geen opname. Ze staan op `scripts/voice_wacht.json` tot de TTS-ronde klaar is; de tekst en de ondertitel zijn al aangepast. De oude opnames blijven in `game/audio/voicelines` staan (ze worden niet meer gevonden). Wie een Stad-zin met stem toevoegt, volgt dezelfde weg: tekst aanpassen, `node scripts/build_story_data.mjs`, `node scripts/tts_lines_list.mjs`, `node scripts/voice_wacht.mjs --write`.

## Beslist (22-11, tweede ronde)

De eigenaar liet de regel zelf toepassen op de 139 twijfelgevallen en de open A-regel. Uitkomst: alle twijfel blijft Grunn (regel 5), behalve drie regels over de stad zelf:

- de verhuizer-bijbaan: "half Nederland zoekt een kamer in de Stad" (`sidejob_verhuizing.js`; de oude opname staat nog in `jobs/`, de nieuwe tekst staat op `voice_wacht` met een cast in `tts_lines_list.mjs`);
- de reklametaxi: "Rinkelbel kent elke omweg van de Stad" (`reklametaxi.js`, geen stem);
- de slugregel van de openingsfilm: "EXT. DE STAD, VAN D’OLLE GRIEZE …" (`openingfilm.js`, een regieregel, niet zichtbaar).

Bewust Grunn gelaten ondanks een stadsbeeld: de toeristen bij de toren ("Is dit nou Grunn?"), de blauwalg in de plassen rond Grunn, het uitzicht van boven en de stadsbus ("in Grunn erger dan te laat"). De audit (`docs/STAD-GRUNN-AUDIT-22-11.md`) bewaart de lijst met dit besluit erbij; een nieuwe Stad-zin hoort in `DECISIONS` van het auditscript.
