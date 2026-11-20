# TTS-achterstand 21-11: welke spreekregels hebben nog geen stem

Gegenereerd door `node scripts/voice_backlog.mjs --write`; niet met de hand aanpassen (`--check` laat zien of dit doc achterloopt). Alleen gelezen uit de bron: er is geen TTS-aanroep gedaan, geen netwerk gebruikt en `.env` is niet geopend. De eigenaar beslist over het opnemen (kosten; besluit 20-10: geen nieuwe TTS zonder akkoord).

## Kern

- **Wat het gereedschap meet is op nul:** `voice_coverage.mjs` meldt 1.283/1.283 geregistreerde regels en 1.394/1.394 verhaalregels (`script.json`) ingesproken; 37 stille appjes zijn bewust zonder stem. De regels die in de melding van de eigenaar en in oudere docs als "nog te doen" staan zijn al opgenomen: Geesje (18), Rotor Roelf (2) en Tessa (10) in commit 7277a5a9c van 20-11 (herkomst in `tts.json`). De docs `EIGENAAR-ACTIELIJST.md`, `EERSTE-30-MINUTEN-20-11.md` en `.specs-fire/standards/verhaal.md` ("37 hebben geen opname") lopen daarop achter.
- **Wat er wel ontbreekt** staat buiten het gereedschap: spreekbronnen in `game/js` die niet in `scripts/voicelines_collect.mjs` zijn geregistreerd. Daarom meldt `voice_coverage` groen terwijl een speler wel ondertitels zonder stem hoort: **379 regels, 22.201 tekens, ca. $0,27** (zonder gebabbel; met alles erbij $0,37).
- Zodra een bron is geregistreerd telt `voice_coverage` hem mee en maakt `tts_lines_list.mjs` er opdrachten van. Tot die code-stap (zie "Voorwaarden") kan geen enkele nieuwe regel worden opgenomen.

## 1. Wat al klopt (geen werk)

| Bron | Stand |
|---|---|
| `voice_coverage.mjs`, geregistreerde tabellen | 1.283/1.283 met stem |
| `script.json` (verhaal), regels met opname | 1.394 van 1.394 (0 zonder) |
| Stille appjes (`channel: app-stil`), bewust | 37 |
| `TECH_HINTS` (technische wachtmelding, geen stem) | 1: "De weg hier wordt nog geladen. Even wachten…" |
| Geesje (18), Rotor Roelf (2), Tessa (10) uit #735 en #924 | opgenomen op 20-11 (7277a5a9c) |
| Tessa's Groningse clips van #924 | opnieuw ingesproken op 15-11 (367 + 21 + 2 clips) |

## 2. Wat er ontbreekt, per categorie

| Categorie | Regels | Tekens | Geschatte duur | Geschatte kosten |
|---|---:|---:|---|---:|
| Restpunten: vertellersregels die de teller uitsluit (PENDING_TTS) | 3 | 107 | 9 s audio | $0,00 |
| Terugkeervignetten (flat, Tammo en Tessa) | 98 | 2.214 | 4 min audio | $0,03 |
| Doelregels van de nieuwe missies (Tammo en Tessa zeggen ze om en om) | 231 | 17.339 | 23 min audio | $0,21 |
| Vragen in keuzegesprekken (Loket, Wiebelwerk, de bond) | 9 | 412 | 35 s audio | $0,01 |
| Heropname na inclusieve taal (oude opname klinkt nog) | 10 | 489 | 41 s audio | $0,01 |
| Reacties in keuzegesprekken (mix van spraak en verteltekst) | 26 | 1.503 | 2 min audio | $0,02 |
| Bewust stil, tekst gewijzigd (voice_stil.json) | 2 | 137 | 11 s audio | $0,00 |
| **Totaal ontbrekend (zonder gebabbel)** | 379 | 22.201 | 30 min audio | $0,27 |
| Opgevangen gebabbel (`gebabbel.js`, bewust alleen tekst) | 236 | 6.747 | 10 min audio | $0,09 |

"Doelregels" tellen twee clips per tekst: het spel laat de partner (de ander dan jij) de kaart voorlezen, dus er zijn een Tammo- en een Tessa-opname nodig (zoals de 224 bestaande hints).

## 3. Per stem

| Stem (personage) | Gebruikte stemnaam | Taal | Regels | Tekens | Kosten | Wacht op Groningse spreektekst |
|---|---|---|---:|---:|---:|---:|
| Tessa (intern Anita) | Callirrhoe | Nederlands | 170 | 9.992 | $0,12 | 0 |
| Tammo | Orus | Gronings (spreektekst nodig) | 165 | 9.893 | $0,12 | 165 |
| Rikus | Schedar | zie profiel | 5 | 212 | $0,00 | 0 |
| Accountmanager | Zubenelgenubi | Gronings (spreektekst nodig) | 3 | 80 | $0,00 | 3 |
| Jelle Terpstra | Fenrir | Nederlands (met accent) | 2 | 106 | $0,00 | 0 |
| Berend Bos | Charon | zie profiel | 2 | 103 | $0,00 | 0 |
| Loketbediende | Autonoe | Gronings (spreektekst nodig) | 2 | 54 | $0,00 | 2 |
| Kapitein Klaas | Enceladus | zie profiel | 1 | 51 | $0,00 | 0 |
| Schipper Wiebe | Alnilam | Gronings (spreektekst nodig) | 1 | 70 | $0,00 | 1 |

Een stem met "Gronings (spreektekst nodig)" kan pas worden opgenomen als de regel in `scripts/gronings_spoken.json` staat (`say_of` in `gemini_tts.py` stopt anders met een KeyError). Tessa spreekt standaard Nederlands (#134), dus haar regels hebben geen spreektekst nodig.

## 4. Per missie

| Missie of scène | Prioriteit | Regels | Tekens | Kosten | Wacht op spreektekst |
|---|---|---:|---:|---:|---:|
| akte 1-3: De dijk | hoog | 6 | 494 | $0,01 | 3 |
| akte 1-3: Het containerlabyrint | hoog | 8 | 524 | $0,01 | 4 |
| akte 1-3: Het Loket | hoog | 8 | 390 | $0,00 | 5 |
| akte 1-3: Laag over het graan | hoog | 16 | 1.170 | $0,01 | 8 |
| akte 1-3: Nul krassen, vijftienhonderd punten | hoog | 3 | 239 | $0,00 | 1 |
| akte 1-3: Vlieg Dijkstra's lunch naar het UMCG, haal dan de… | hoog | 4 | 522 | $0,01 | 2 |
| akte 2: Een trekker-limo op de wierde | hoog | 12 | 956 | $0,01 | 6 |
| akte 2: Geleend van de Friezen | hoog | 12 | 1.288 | $0,01 | 6 |
| akte 2: Heel aankomen is ook een kunst | hoog | 10 | 838 | $0,01 | 5 |
| wereld | hoog | 3 | 107 | $0,00 | 0 |
| akte 4: Eerst de kras van de wagon: Tinus kijkt ernaar | middel | 4 | 348 | $0,00 | 2 |
| akte 4: Het beleg van Bourtange | middel | 30 | 1.858 | $0,02 | 15 |
| akte 4: Open, dicht | middel | 12 | 964 | $0,01 | 6 |
| akte 4: Spring van wagon naar wagon naar de Escapade | middel | 7 | 650 | $0,01 | 3 |
| akte 4: Stoom | middel | 6 | 460 | $0,01 | 3 |
| akte 4: Wie draaide de camera's uit? | middel | 19 | 1.310 | $0,02 | 11 |
| akte 5: De colonne | middel | 27 | 2.098 | $0,02 | 12 |
| akte 5: Een luik erin | middel | 14 | 972 | $0,01 | 7 |
| akte 6: De wisselwoning | middel | 6 | 276 | $0,00 | 3 |
| akte 6: Het proefbeleg | middel | 20 | 1.246 | $0,02 | 10 |
| akte 6: Inpakken | middel | 10 | 720 | $0,01 | 5 |
| akte 6: Terug | middel | 6 | 428 | $0,01 | 3 |
| Terugkeer fase 1 | middel | 24 | 653 | $0,01 | 12 |
| Terugkeer fase 2 | middel | 24 | 581 | $0,01 | 11 |
| Terugkeer fase 3 | middel | 26 | 485 | $0,01 | 12 |
| Terugkeer fase 4 | middel | 24 | 495 | $0,01 | 11 |
| inclusieve taal | middel | 10 | 489 | $0,01 | 5 |

## 5. Eerst tekstueel controleren, of botst met de constitution

| Wat | Omvang | Waarom eerst controleren |
|---|---|---|
| Reacties in keuzegesprekken | 26 regels | Veel reacties zijn verteltekst ("Berend knikt langzaam. Hij schrijft niks op") of beginnen met een naam en een citaat. Eerst per regel bepalen: spreekregel van een NPC, of ondertitel van het scherm. Niet opnemen zonder die keuze. |
| Terugkeervignetten: spreker "Tessa" | 52 regels | De scène zoekt de opname onder de spreker "Tessa" (`terugkeerRegels`, `NAME`), terwijl alle andere Tessa-opnames onder "Anita" staan en `linevoice.js` exact zoekt. Besluit eerst: de spreker in de vignetten op "Anita" zetten, of de opname onder "Tessa" bewaren. |
| Terugkeervignetten: Tammo | 46 regels | Tammo spreekt Gronings; elke regel heeft een spreektekst nodig die een kenner schrijft of goedkeurt (een agent verzint geen Gronings, constitution 1). Tessa's regels zijn gewoon Nederlands. |
| Doelregels van Tammo | 115 van 115 regels | Zelfde reden: Groningse spreektekst voor Tammo. Verwerk eerst `gronings_merge_draft.mjs`. |
| Doelregels met cijfers, plaatsnamen en bedrijfsnamen | (steekproef) | Een voorgelezen regel moet `node scripts/text_audit.mjs` en het merkenregister (`docs/MERKENREGISTER.md`) halen: Wiebelwerk, Spuit & Klaar, Delfstof Noord en EIKEA zijn verzonnen; alle namen opnieuw tegen het register leggen. |
| Doelregels met toetsen en tekens | (steekproef) | "W/S", "{W}", "(E)" worden door `spoken()` in `voicelines_collect.mjs` omgezet; bij nieuwe doelregels hetzelfde doen, anders leest de stem "slash" voor. |
| #987 M03.2 (Mevrouw Hoving, 1998, 1982, "sinds woensdag") | 5 regels van Mevrouw Hoving staan al op de band | De tekst is de dichtste van de eerste 30 minuten (`EERSTE-30-MINUTEN-20-11.md`, punt 6). Wordt de tekst herschreven, dan zijn die clips niet meer geldig (een andere letter maakt de regel stil): eerst tekst, dan eventueel opnieuw opnemen. Niet in een batch zetten. |
| Heropnames inclusieve taal | 10 regels | De oude opname ("jongens") klinkt nog en is mild; de nieuwe tekst is al gekozen. Alleen opnemen als de eigenaar dat wil: de oude regel verdwijnt dan uit het spel zodra de tekst wisselt. |
| Kiekdoar-aankondiging Kiezelweek | 1 regel | De opname zegt "KEI-week", een echt evenement; de nieuwe tekst is stil. Opnemen is een duidelijke fix van een merk, dus wel meenemen in batch 3 of eerder. |

Echte namen of merken in de ontbrekende regels: een steekproef over de hoofdletterwoorden in de lijst vond alleen verzonnen namen en echte plaatsen (UMCG staat in het merkenregister als plek); het is geen volledige controle, want de controle loopt via `node scripts/text_audit.mjs` en het merkenregister, niet via dit script.

## 6. Bewust stil of geen spreektekst (staat niet in de batches)

- **37 stille appjes** (`channel: app-stil`) en de telefoonmeldingen zonder `say`.
- **Opgevangen gebabbel** (`game/js/gebabbel.js`): 236 korte regels van verzonnen figuren (Student, Bakker, Toerist en dergelijke), 6.747 tekens, ca. $0,09. Ontwerp: alleen tekst. De regels zijn kort en van wisselende sprekers zonder vast stemprofiel; opnemen levert veel clips op voor weinig gehoor. Niet aanbevolen.
- **Systeemmeldingen** (`world.addMessage`, bijvoorbeeld "Te weinig geld: een eierbal kost €2"): HUD-tekst, geen spreekregel; ze worden alleen voorgelezen als ze in de hints-bank staan.
- **Taxi-, bus- en treinstatus** (`taxistatus.js`, `busstatus.js`, `ovmissie.js`), de **regelkaarten**, de **kaartmeldingen** (`kaartonthulling.js`) en het **politielabel**: statuslabels in de HUD. Er is geen spreekregel gevonden; ze horen niet in een TTS-ronde.
- `missionsdata_zij.js` (de bijzaken van de snackbar, Fatbikes in de Herenstraat), `missie_snackbar.js` en `kiekdoarregels.js` (`voiced: false`): in de bron staat "alles is tekst: geen opname, geen TTS". Dat blijft zo tot de eigenaar anders beslist.

## 7. Voorwaarden voor elk van de batches

1. **Registreren (code, geen TTS):** zet de bronnen in `scripts/voicelines_collect.mjs`, zodat `voice_coverage.mjs` ze meetelt en `tts_lines_list.mjs` er opdrachten van maakt (terugkeer: `VIGNETTEN` uit `terugkeerscenes.js`; doelregels: de `say:`-velden van `missions_nieuw.js` en `missions_akte2/4/5/6.js` naar de `hints`-bank met `hintWho`; vragen naar `lines`). Dit commit is klein en kost niets, maar `voice_coverage` wordt er rood van tot de opnames er zijn, dus alleen registreren per batch.
2. **Groningse spreektekst voor Tammo** in `scripts/gronings_spoken.json` (kenner of eigenaar), daarna `node scripts/gronings_merge_draft.mjs --write`.
3. **Besluit over de speaker "Tessa"** van de terugkeervignetten (zie punt 5).
4. **Sleutel:** `LITELLM_API_KEY` in de omgeving of in de eigen `.env` van de eigenaar; een agent leest die niet. Route en model: `google/gemini-3.8-flash-lite-tts` via `litellm.natuspella.nl` (ADR 0019: nooit Flash).

## 8. Aanbevolen volgorde in drie batches

| Batch | Inhoud | Omvang | Looptijd | Wacht op |
|---|---|---|---|---|
| 1 | De restpunten en de doelregels en vragen van het begin van het verhaal (Het Loket, akte 1 tot 3: de regels die iedere speler hoort) | 82 clips, 6.528 tekens, 9 min audio, ca. $0,08 | ca. 4 tot 8 min (ruwe schatting, 3 tot 6 s per clip met normalisatie) | registreren; spreektekst voor Tammo (40 regels) |
| 2 | De terugkeervignetten en de doelregels en vragen van akte 4, 5 en 6 | 259 clips, 13.544 tekens, 19 min audio, ca. $0,17 | ca. 13 tot 26 min (ruwe schatting, 3 tot 6 s per clip met normalisatie) | registreren; besluit speaker "Tessa"; spreektekst voor Tammo (126 regels) |
| 3 | Heropnames inclusieve taal, de stille Kiezelweek-regel en de reacties die na tekstcontrole een spreekregel blijken | 38 clips, 2.129 tekens, 3 min audio, ca. $0,03 | ca. 2 tot 4 min (ruwe schatting, 3 tot 6 s per clip met normalisatie) | tekstcontrole en akkoord van de eigenaar |

Alles samen 379 clips, 22.201 tekens, 30 min audio, ca. $0,27. Ter vergelijking: het hele nieuwe verhaal kostte op flash-lite ca. $0,55 (ADR 0019). De schatting volgt het prijsmodel van `gemini_tts.py` (25 audiotokens per seconde, $6 per miljoen, tekens gedeeld door 14 plus 0,6 s per clip) en is een bovengrens: de echte kosten lagen bij de laatste rondes lager.

### Commando's per batch (niet uitgevoerd)

Draai ze in deze volgorde, op een schone werkboom, na stap 1 en 2 van "Voorwaarden". De droogloop vraagt geen sleutel en schrijft niets.

**Batch 1**

```
node scripts/tts_lines_list.mjs
node scripts/tts_opnameronde.mjs --dry --budget 0.25 --max 92
node scripts/tts_opnameronde.mjs --budget 0.25 --max 92
node scripts/voice_coverage.mjs --quiet
node scripts/opnamelijst.mjs --check
node scripts/voice_backlog.mjs --write
```

**Batch 2**

```
node scripts/tts_lines_list.mjs
node scripts/tts_opnameronde.mjs --dry --budget 0.50 --max 269
node scripts/tts_opnameronde.mjs --budget 0.50 --max 269
node scripts/voice_coverage.mjs --quiet
node scripts/opnamelijst.mjs --check
node scripts/voice_backlog.mjs --write
```

**Batch 3**

```
node scripts/tts_lines_list.mjs
node scripts/tts_opnameronde.mjs --dry --budget 0.25 --max 48
node scripts/tts_opnameronde.mjs --budget 0.25 --max 48
node scripts/voice_coverage.mjs --quiet
node scripts/opnamelijst.mjs --check
node scripts/voice_backlog.mjs --write
```

`tts_opnameronde.mjs` doet zelf de wachtrij, de opname (`scripts/tts_lines.py`) en `build_story_data.mjs`, en leest de sleutel niet. Het budget is het dubbele van de schatting; het script stopt als het bereikt is.

## 9. Risico's

- **Groen is geen dekking:** `voice_coverage` kijkt alleen naar wat is geregistreerd. Een nieuwe spreektabel zonder registratie valt buiten alle checks; deze lijst laat dat zien. Overweeg een regel in de regelaudit of `voice_backlog --check` in de releasegate.
- **Een andere letter maakt een regel stil:** wordt een bronregel na de opname herschreven, dan is de clip weg (sleutel `<stem>|<tekst>`). Eerst de tekst vastzetten (batch 1 en 2 pas na de tekstcontrole van punt 5).
- **Gronings voor Tammo:** zonder spreektekst stopt `tts_lines.py` met een KeyError; de regels staan dan als "GEBLOKKEERD" in de droogloop.
- **Afspelen is niet bekeken:** of de terugkeerscène en de doelkaart de nieuwe clips goed afspelen (duur, volgorde, `plannedVoiceLines`) is niet getest; dit rapport gebruikt alleen de bron. Na een batch: één Electron-run met `--story-test` en luisteren naar de eerste scènes.
- **Kosten en tegoed:** de gateway rekent per clip; de schatting is grof. De eerdere beperking (AI Studio: 100 aanvragen per dag, 29-10) geldt alleen voor de directe route, niet voor de gateway.
- **Merken en echte namen:** ieder nieuw stuk tekst moet door `text_audit.mjs` en het merkenregister voordat het wordt opgenomen; een opname van een fout merk is niet terug te draaien zonder heropname.

## 10. Wat de eigenaar moet beslissen

1. Wil de eigenaar de doelregels van de nieuwe missies laten voorlezen (ca. dezelfde stijl als de bestaande 224 hints), of blijven ze kaarten zonder stem? (Batch 1 en 2.)
2. Wil de eigenaar de terugkeervignetten inspreken? Dat vraagt een Groningse spreektekst voor Tammo en een besluit over de naam "Tessa" in de bank.
3. Mogen de heropnames voor inclusieve taal en de Kiezelweek-regel mee (batch 3)?
4. Welk budget geldt voor deze ronde (de schatting staat in de tabellen; opnemen wordt pas gestart na zijn akkoord)?
5. Blijft het gebabbel en de bijzaken-tekst (`missionsdata_zij.js`, `missie_snackbar.js`) bewust stil?

## Bijlage: alle ontbrekende regels

### Restpunten: vertellersregels die de teller uitsluit (PENDING_TTS) (3)

| Bron | Missie of scène | Stem | Tekst | Opmerking |
|---|---|---|---|---|
| cinematics.js (PENDING_TTS) | wereld | Rikus | Weer een stukje Grunn dat je nu kent. |  |
| cinematics.js (PENDING_TTS) | wereld | Rikus | Krak. Iemand lette even niet op. |  |
| cinematics.js (PENDING_TTS) | wereld | Rikus | Vijf sterren. Nu even rustig aan doen. |  |

### Terugkeervignetten (flat, Tammo en Tessa) (98)

| Bron | Missie of scène | Stem | Tekst | Opmerking |
|---|---|---|---|---|
| terugkeerscenes.js | Terugkeer fase 1 | Anita | Die pan staat hier al sinds gisteren. |  |
| terugkeerscenes.js | Terugkeer fase 1 | Tammo | Dat is een pan met een verhaal. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 1 | Anita | Het verhaal heet: wie wast hem af. |  |
| terugkeerscenes.js | Terugkeer fase 1 | Tammo | Ik. Morgen. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 1 | Tammo | Wie neemt de badkamer als eerste? | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 1 | Anita | Ik. Ik sta er al drie minuten voor. |  |
| terugkeerscenes.js | Terugkeer fase 1 | Tammo | Je zit hier aan tafel. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 1 | Anita | In gedachten. |  |
| terugkeerscenes.js | Terugkeer fase 1 | Anita | Wie heeft mijn yoghurt opgegeten? |  |
| terugkeerscenes.js | Terugkeer fase 1 | Tammo | Er stond geen naam op. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 1 | Anita | Er stond Tessa op. |  |
| terugkeerscenes.js | Terugkeer fase 1 | Tammo | Ik las dat als een suggestie. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 1 | Tammo | Koffie? | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 1 | Anita | Ja. Eh, nee. Ja. |  |
| terugkeerscenes.js | Terugkeer fase 1 | Tammo | Ik zet er twee neer. Dan kies jij zelf. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 1 | Anita | Dat is eigenlijk heel redelijk. |  |
| terugkeerscenes.js | Terugkeer fase 1 | Anita | Ik heb een schoonmaakrooster gemaakt. |  |
| terugkeerscenes.js | Terugkeer fase 1 | Tammo | Ik zie mijn naam. Zeven keer. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 1 | Anita | Ik zie jouw pan. Zeven keer. |  |
| terugkeerscenes.js | Terugkeer fase 1 | Tammo | Dat is een eerlijke ruil. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 1 | Tammo | Je wekker ging om zes uur af. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 1 | Anita | Dat weet ik. Ik leg hem ver weg. |  |
| terugkeerscenes.js | Terugkeer fase 1 | Tammo | Dat wist de hele flat nu ook. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 1 | Anita | Dan zijn we eerlijk tegen elkaar. |  |
| terugkeerscenes.js | Terugkeer fase 2 | Tammo | Roerei of spiegelei? | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 2 | Anita | Wat wordt het als jij er verstand van hebt? |  |
| terugkeerscenes.js | Terugkeer fase 2 | Tammo | Roerei. Dan zie je niet dat het mislukt is. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 2 | Anita | Ik eet het toch op. |  |
| terugkeerscenes.js | Terugkeer fase 2 | Anita | Proef eens. |  |
| terugkeerscenes.js | Terugkeer fase 2 | Tammo | Het is goed. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 2 | Anita | Dat zeg je altijd. |  |
| terugkeerscenes.js | Terugkeer fase 2 | Tammo | Omdat het altijd goed is. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 2 | Anita | Je hebt een kruimel op je kin. |  |
| terugkeerscenes.js | Terugkeer fase 2 | Tammo | Waar? | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 2 | Anita | Links. Nee, jouw links. |  |
| terugkeerscenes.js | Terugkeer fase 2 | Anita | Nu zit hij op je mouw. |  |
| terugkeerscenes.js | Terugkeer fase 2 | Tammo | Je haar zit anders. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 2 | Anita | Het is dinsdag. |  |
| terugkeerscenes.js | Terugkeer fase 2 | Tammo | Het staat je goed. Op dinsdag. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 2 | Anita | Dank je. Eet je boterham. |  |
| terugkeerscenes.js | Terugkeer fase 2 | Tammo | Ik heb een eierbal gebakken, voor de oefening. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 2 | Anita | Hij is vierkant. |  |
| terugkeerscenes.js | Terugkeer fase 2 | Tammo | Hij is creatief. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 2 | Anita | Ik eet hem toch op. Voor de vriendschap. |  |
| terugkeerscenes.js | Terugkeer fase 2 | Anita | Als we winnen, wat dan? |  |
| terugkeerscenes.js | Terugkeer fase 2 | Tammo | Dan krijgt de frietwagen een nieuwe lamp. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 2 | Anita | Een lamp. |  |
| terugkeerscenes.js | Terugkeer fase 2 | Tammo | Een grote. Zodat jij hem ziet. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 3 | Anita | Wat kijken we? |  |
| terugkeerscenes.js | Terugkeer fase 3 | Tammo | Maakt niet uit. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 3 | Anita | Dat zeg je altijd. |  |
| terugkeerscenes.js | Terugkeer fase 3 | Tammo | Omdat jij naast me zit. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 3 | Anita | Dat was aardig. Zet maar iets aan. |  |
| terugkeerscenes.js | Terugkeer fase 3 | Anita | Dit nummer ken ik. |  |
| terugkeerscenes.js | Terugkeer fase 3 | Tammo | Dans je mee? | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 3 | Anita | In de keuken? |  |
| terugkeerscenes.js | Terugkeer fase 3 | Tammo | Overal waar jij staat. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 3 | Anita | Goedemorgen. |  |
| terugkeerscenes.js | Terugkeer fase 3 | Tammo | Koffie staat klaar. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 3 | Anita | Je bent de beste. |  |
| terugkeerscenes.js | Terugkeer fase 3 | Tammo | Wacht. Ik moet even gaan zitten. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 3 | Anita | Eerst de Vismarkt. |  |
| terugkeerscenes.js | Terugkeer fase 3 | Tammo | Dan de kade. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 3 | Anita | En daarna? |  |
| terugkeerscenes.js | Terugkeer fase 3 | Tammo | Daarna iets met jou. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 3 | Anita | Dat staat al op de lijst. |  |
| terugkeerscenes.js | Terugkeer fase 3 | Anita | Met melk. Niet te veel. |  |
| terugkeerscenes.js | Terugkeer fase 3 | Tammo | Je weet het nog. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 3 | Anita | Ik weet alles van jou. |  |
| terugkeerscenes.js | Terugkeer fase 3 | Tammo | Dat is veel. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 3 | Tammo | Het is tweeëntwintig graden. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 3 | Anita | Dat zeg je elke dag. |  |
| terugkeerscenes.js | Terugkeer fase 3 | Tammo | Omdat ik het fijn vind. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 3 | Anita | Ik ook. |  |
| terugkeerscenes.js | Terugkeer fase 4 | Anita | Het is stil in de flat. |  |
| terugkeerscenes.js | Terugkeer fase 4 | Tammo | Niemand zoekt ons. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 4 | Anita | Dat is nieuw. |  |
| terugkeerscenes.js | Terugkeer fase 4 | Tammo | Ik wen eraan. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 4 | Tammo | Roerei. Zoals jij het wilt. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 4 | Anita | Zonder dat het mislukt is? |  |
| terugkeerscenes.js | Terugkeer fase 4 | Tammo | Dat was de oefening. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 4 | Anita | En dit is de les. |  |
| terugkeerscenes.js | Terugkeer fase 4 | Anita | Hoeveel woorden waren het ook alweer? |  |
| terugkeerscenes.js | Terugkeer fase 4 | Tammo | Vijf. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 4 | Anita | Zeg ze nog eens. |  |
| terugkeerscenes.js | Terugkeer fase 4 | Anita | Dat bedoelde ik ook. |  |
| terugkeerscenes.js | Terugkeer fase 4 | Anita | Je wast af. |  |
| terugkeerscenes.js | Terugkeer fase 4 | Tammo | Ik zei toch: morgen. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 4 | Anita | Dat was twee weken geleden. |  |
| terugkeerscenes.js | Terugkeer fase 4 | Tammo | Ik ben een man van mijn woord. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 4 | Tammo | Wat doen we vandaag? | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 4 | Anita | Niks. |  |
| terugkeerscenes.js | Terugkeer fase 4 | Tammo | Niks is een goed plan. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 4 | Anita | Dan is het al gelukt. |  |
| terugkeerscenes.js | Terugkeer fase 4 | Anita | Rikus zegt dat het zomer blijft. |  |
| terugkeerscenes.js | Terugkeer fase 4 | Tammo | Rikus heeft altijd gelijk. | spreektekst nodig |
| terugkeerscenes.js | Terugkeer fase 4 | Anita | Dat zegt hij zelf ook. |  |
| terugkeerscenes.js | Terugkeer fase 4 | Tammo | Dan zal het wel kloppen. | spreektekst nodig |

### Doelregels van de nieuwe missies (Tammo en Tessa zeggen ze om en om) (231)

| Bron | Missie of scène | Stem | Tekst | Opmerking |
|---|---|---|---|---|
| missions_akte2.js | akte 2: Geleend van de Friezen | Tammo | Haal Jelles skûtsje in en spring aan boord. Daarna het zout: blijf uit het licht van de k… | spreektekst nodig |
| missions_akte2.js | akte 2: Geleend van de Friezen | Anita | Haal Jelles skûtsje in en spring aan boord. Daarna het zout: blijf uit het licht van de k… |  |
| missions_akte2.js | akte 2: Geleend van de Friezen | Tammo | Klaas zit bovenin en kijkt de andere kant op. Instappen, Tammo stuurt. | spreektekst nodig |
| missions_akte2.js | akte 2: Geleend van de Friezen | Anita | Klaas zit bovenin en kijkt de andere kant op. Instappen, Tammo stuurt. |  |
| missions_akte2.js | akte 2: Geleend van de Friezen | Tammo | Daar vaart hij, het Reitdiep af! Zwart skûtsje, rood zeil. Ga er vlak naast varen, dan sp… | spreektekst nodig |
| missions_akte2.js | akte 2: Geleend van de Friezen | Anita | Daar vaart hij, het Reitdiep af! Zwart skûtsje, rood zeil. Ga er vlak naast varen, dan sp… |  |
| missions_akte2.js | akte 2: Geleend van de Friezen | Tammo | Het zout van Oma ligt bij Noordpolderzijl. Eerst de zandplaat: de wind duwt het water weg… | spreektekst nodig |
| missions_akte2.js | akte 2: Geleend van de Friezen | Anita | Het zout van Oma ligt bij Noordpolderzijl. Eerst de zandplaat: de wind duwt het water weg… |  |
| missions_akte2.js | akte 2: Geleend van de Friezen | Tammo | Drie zoutkuipen op de kwelder. Het water komt over een kleine vier minuten. Het licht van… | spreektekst nodig |
| missions_akte2.js | akte 2: Geleend van de Friezen | Anita | Drie zoutkuipen op de kwelder. Het water komt over een kleine vier minuten. Het licht van… |  |
| missions_akte2.js | akte 2: Geleend van de Friezen | Tammo | Drie kuipen zout. Rennen naar de steiger, Klaas wacht. | spreektekst nodig |
| missions_akte2.js | akte 2: Geleend van de Friezen | Anita | Drie kuipen zout. Rennen naar de steiger, Klaas wacht. |  |
| missions_akte2.js | akte 2: Heel aankomen is ook een kunst | Tammo | Breng Geesjes zestig eieren heel naar de kerkkelder in Usquert. Vol gas mag tot 40 km/u; … | spreektekst nodig |
| missions_akte2.js | akte 2: Heel aankomen is ook een kunst | Anita | Breng Geesjes zestig eieren heel naar de kerkkelder in Usquert. Vol gas mag tot 40 km/u; … |  |
| missions_akte2.js | akte 2: Heel aankomen is ook een kunst | Tammo | De trekker staat bij de schuur. Instappen, de kratten staan achterop. | spreektekst nodig |
| missions_akte2.js | akte 2: Heel aankomen is ook een kunst | Anita | De trekker staat bij de schuur. Instappen, de kratten staan achterop. |  |
| missions_akte2.js | akte 2: Heel aankomen is ook een kunst | Tammo | De Dorpsweg is afgezet. Via de wierdepaden dan: bulten en gaten. Rustig aan. | spreektekst nodig |
| missions_akte2.js | akte 2: Heel aankomen is ook een kunst | Anita | De Dorpsweg is afgezet. Via de wierdepaden dan: bulten en gaten. Rustig aan. |  |
| missions_akte2.js | akte 2: Heel aankomen is ook een kunst | Tammo | Halfweg. Even stil: de kratten zijn op de bulten verschoven. Achterin nog niets gebroken? | spreektekst nodig |
| missions_akte2.js | akte 2: Heel aankomen is ook een kunst | Anita | Halfweg. Even stil: de kratten zijn op de bulten verschoven. Achterin nog niets gebroken? |  |
| missions_akte2.js | akte 2: Heel aankomen is ook een kunst | Tammo | Door naar Usquert. De kerk staat op de wierde, de kelder is koel. | spreektekst nodig |
| missions_akte2.js | akte 2: Heel aankomen is ook een kunst | Anita | Door naar Usquert. De kerk staat op de wierde, de kelder is koel. |  |
| missions_akte2.js | akte 2: Een trekker-limo op de wierde | Tammo | Als Jelle de koffer loslaat, pakken wij hem. Op de quad. Schud de limo af en haal de sloo… | spreektekst nodig |
| missions_akte2.js | akte 2: Een trekker-limo op de wierde | Anita | Als Jelle de koffer loslaat, pakken wij hem. Op de quad. Schud de limo af en haal de sloo… |  |
| missions_akte2.js | akte 2: Een trekker-limo op de wierde | Tammo | De quad van Geesjes neef staat klaar. Springen, Tammo, hij rijdt. | spreektekst nodig |
| missions_akte2.js | akte 2: Een trekker-limo op de wierde | Anita | De quad van Geesjes neef staat klaar. Springen, Tammo, hij rijdt. |  |
| missions_akte2.js | akte 2: Een trekker-limo op de wierde | Tammo | Over het kerkenpad, door de kerktuin, langs de wierdepaden. De limo kan niet overal heen. | spreektekst nodig |
| missions_akte2.js | akte 2: Een trekker-limo op de wierde | Anita | Over het kerkenpad, door de kerktuin, langs de wierdepaden. De limo kan niet overal heen. |  |
| missions_akte2.js | akte 2: Een trekker-limo op de wierde | Tammo | Bijna bij de sloot. Jelle zit er nog achter, dus blijf rijden. | spreektekst nodig |
| missions_akte2.js | akte 2: Een trekker-limo op de wierde | Anita | Bijna bij de sloot. Jelle zit er nog achter, dus blijf rijden. |  |
| missions_akte2.js | akte 2: Een trekker-limo op de wierde | Tammo | Jelle ligt in de sloot. Naar de bushalte, we hebben nog een bus te halen. | spreektekst nodig |
| missions_akte2.js | akte 2: Een trekker-limo op de wierde | Anita | Jelle ligt in de sloot. Naar de bushalte, we hebben nog een bus te halen. |  |
| missions_akte2.js | akte 2: Een trekker-limo op de wierde | Tammo | Loop heelhuids door de fatbikes naar Oma Trijntje, dan vertelt ze iets over die bal. | spreektekst nodig |
| missions_akte2.js | akte 2: Een trekker-limo op de wierde | Anita | Loop heelhuids door de fatbikes naar Oma Trijntje, dan vertelt ze iets over die bal. |  |
| missions_akte4.js | akte 4: Open, dicht | Tammo | Een sloep op het Oosterdiep, elf bruggen en Jelles mosterdschip erachteraan. | spreektekst nodig |
| missions_akte4.js | akte 4: Open, dicht | Anita | Een sloep op het Oosterdiep, elf bruggen en Jelles mosterdschip erachteraan. |  |
| missions_akte4.js | akte 4: Open, dicht | Tammo | Instappen. De sloep ligt aan de kant, Wubbo wacht bij de eerste brug. | spreektekst nodig |
| missions_akte4.js | akte 4: Open, dicht | Anita | Instappen. De sloep ligt aan de kant, Wubbo wacht bij de eerste brug. |  |
| missions_akte4.js | akte 4: Open, dicht | Tammo | Toeter bij een gesloten brug, Wubbo opent op het ritme van de fanfare. | spreektekst nodig |
| missions_akte4.js | akte 4: Open, dicht | Anita | Toeter bij een gesloten brug, Wubbo opent op het ritme van de fanfare. |  |
| missions_akte4.js | akte 4: Open, dicht | Tammo | De fanfare is weg: Jelle kocht haar voor zijn optocht. Wubbo fluit: één keer is open, twe… | spreektekst nodig |
| missions_akte4.js | akte 4: Open, dicht | Anita | De fanfare is weg: Jelle kocht haar voor zijn optocht. Wubbo fluit: één keer is open, twe… |  |
| missions_akte4.js | akte 4: Open, dicht | Tammo | Brug acht, negen en tien. Niet te vroeg: een dichte brug is dicht. | spreektekst nodig |
| missions_akte4.js | akte 4: Open, dicht | Anita | Brug acht, negen en tien. Niet te vroeg: een dichte brug is dicht. |  |
| missions_akte4.js | akte 4: Open, dicht | Tammo | Brug elf. Aan de overkant staat de limo met de gouden koffer. De brug draait niet voor ee… | spreektekst nodig |
| missions_akte4.js | akte 4: Open, dicht | Anita | Brug elf. Aan de overkant staat de limo met de gouden koffer. De brug draait niet voor ee… |  |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | Tammo | Wiebelwerk, websites met karakter. Wij zijn klant. | spreektekst nodig |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | Anita | Wiebelwerk, websites met karakter. Wij zijn klant. |  |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | Tammo | Wiebelwerk, websites met karakter. Binnen doen we alsof we een website willen. | spreektekst nodig |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | Anita | Wiebelwerk, websites met karakter. Binnen doen we alsof we een website willen. |  |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | Tammo | Beantwoord de intake. Een fout antwoord maakt de manager wantrouwig; hij loopt dan mee na… | spreektekst nodig |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | Anita | Beantwoord de intake. Een fout antwoord maakt de manager wantrouwig; hij loopt dan mee na… |  |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | Tammo | De accountmanager belt een collega. Nu snel naar de serverkamer. | spreektekst nodig |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | Anita | De accountmanager belt een collega. Nu snel naar de serverkamer. |  |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | Tammo | Hij loopt twee stappen achter je. De camera's draaien sneller en het groen is smaller. | spreektekst nodig |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | Anita | Hij loopt twee stappen achter je. De camera's draaien sneller en het groen is smaller. |  |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | Tammo | Drie camera's in de gang. Wacht tot de streep in het vak staat, dan sluip je door. | spreektekst nodig |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | Anita | Drie camera's in de gang. Wacht tot de streep in het vak staat, dan sluip je door. |  |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | Tammo | Het logboek van 12 augustus. Blijf bij de server staan tot alles gelezen is. | spreektekst nodig |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | Anita | Het logboek van 12 augustus. Blijf bij de server staan tot alles gelezen is. |  |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | Tammo | Tessa heeft het logboek geprint. Nu weg voor de accountmanager terug is. | spreektekst nodig |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | Anita | Tessa heeft het logboek geprint. Nu weg voor de accountmanager terug is. |  |
| missions_akte4.js | akte 4: Stoom | Tammo | Het perron in Veendam. De machinist eet een eierbal op een bank. | spreektekst nodig |
| missions_akte4.js | akte 4: Stoom | Anita | Het perron in Veendam. De machinist eet een eierbal op een bank. |  |
| missions_akte4.js | akte 4: Stoom | Tammo | De trein staat stil, de machinist zit op een bank. Naar de kop van de trein. | spreektekst nodig |
| missions_akte4.js | akte 4: Stoom | Anita | De trein staat stil, de machinist zit op een bank. Naar de kop van de trein. |  |
| missions_akte4.js | akte 4: Stoom | Tammo | Instappen met E bij de kop. W is gas, S is rem, H is de fluit. Rem op tijd bij het perron. | spreektekst nodig |
| missions_akte4.js | akte 4: Stoom | Anita | Instappen met E bij de kop. W is gas, S is rem, H is de fluit. Rem op tijd bij het perron. |  |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Tammo | Vesting Bourtange, fakkels, een gracht en kartonnen kanonnen. | spreektekst nodig |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Anita | Vesting Bourtange, fakkels, een gracht en kartonnen kanonnen. |  |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Tammo | Het Beleg begint. Berend is de bisschop en valt aan. Wij verdedigen de wallen. | spreektekst nodig |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Anita | Het Beleg begint. Berend is de bisschop en valt aan. Wij verdedigen de wallen. |  |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Tammo | Blijf op de wal staan. De kartonnen kogels zijn confetti, maar ze duwen je wel om. | spreektekst nodig |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Anita | Blijf op de wal staan. De kartonnen kogels zijn confetti, maar ze duwen je wel om. |  |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Tammo | Het leger van de bisschop komt aan de andere kant. Ren naar de noordwal. | spreektekst nodig |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Anita | Het leger van de bisschop komt aan de andere kant. Ren naar de noordwal. |  |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Tammo | Blijf op de noordwal staan tot het beleg voorbij is. | spreektekst nodig |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Anita | Blijf op de noordwal staan tot het beleg voorbij is. |  |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Tammo | Durk en Douwe houden je bezig. Naar de gracht. | spreektekst nodig |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Anita | Durk en Douwe houden je bezig. Naar de gracht. |  |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Tammo | Durk en Douwe springen mee. Aanloop, polsstok, klimmen: druk als de streep in het vak sta… | spreektekst nodig |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Anita | Durk en Douwe springen mee. Aanloop, polsstok, klimmen: druk als de streep in het vak sta… |  |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Tammo | Mem en Oma Trijntje zitten in de kruitkelder. Jelle heeft de bal in een koffer. | spreektekst nodig |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Anita | Mem en Oma Trijntje zitten in de kruitkelder. Jelle heeft de bal in een koffer. |  |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Tammo | Houd de deur van de kruitkelder met de kartonnen kanonnen. Jelles mannen komen in colbert… | spreektekst nodig |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Anita | Houd de deur van de kruitkelder met de kartonnen kanonnen. Jelles mannen komen in colbert… |  |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Tammo | De tweede deur geeft mee. Rennen. | spreektekst nodig |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Anita | De tweede deur geeft mee. Rennen. |  |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Tammo | Houd ook de tweede deur. Daarna de derde. | spreektekst nodig |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Anita | Houd ook de tweede deur. Daarna de derde. |  |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Tammo | De derde deur. De bal blijft hier. | spreektekst nodig |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Anita | De derde deur. De bal blijft hier. |  |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Tammo | De laatste deur. Daarna naar de poort. | spreektekst nodig |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Anita | De laatste deur. Daarna naar de poort. |  |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Tammo | Links is vrij. Naar de poort, Berends bakkie staat klaar. | spreektekst nodig |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Anita | Links is vrij. Naar de poort, Berends bakkie staat klaar. |  |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Tammo | De naspeling is klaar. Blijf even staan voor het publiek en de fotograaf. | spreektekst nodig |
| missions_akte4.js | akte 4: Het beleg van Bourtange | Anita | De naspeling is klaar. Blijf even staan voor het publiek en de fotograaf. |  |
| missions_akte4.js | akte 4: Eerst de kras van de wagon: Tinus kijkt e… | Tammo | De kras van de wagon zit op de Escapade. Tinus schudt zijn hoofd: "Die tel ik niet mee." | spreektekst nodig |
| missions_akte4.js | akte 4: Eerst de kras van de wagon: Tinus kijkt e… | Anita | De kras van de wagon zit op de Escapade. Tinus schudt zijn hoofd: "Die tel ik niet mee." |  |
| missions_akte4.js | akte 4: Eerst de kras van de wagon: Tinus kijkt e… | Tammo | Mems appje: de trein met de rode auto stopt om middernacht bij de overweg in Zuidhorn. | spreektekst nodig |
| missions_akte4.js | akte 4: Eerst de kras van de wagon: Tinus kijkt e… | Anita | Mems appje: de trein met de rode auto stopt om middernacht bij de overweg in Zuidhorn. |  |
| missions_akte4.js | akte 4: Spring van wagon naar wagon naar de Escap… | Tammo | De trein rijdt. Druk als de streep in het vak staat om naar de volgende wagon te springen. | spreektekst nodig |
| missions_akte4.js | akte 4: Spring van wagon naar wagon naar de Escap… | Anita | De trein rijdt. Druk als de streep in het vak staat om naar de volgende wagon te springen. |  |
| missions_akte4.js | akte 4: Spring van wagon naar wagon naar de Escap… | Tammo | Jelles mannen staan op de wagon. Jelle belt: de auto redden of de bal houden. Niet allebe… | spreektekst nodig |
| missions_akte4.js | akte 4: Spring van wagon naar wagon naar de Escap… | Anita | Jelles mannen staan op de wagon. Jelle belt: de auto redden of de bal houden. Niet allebe… |  |
| missions_akte4.js | akte 4: Spring van wagon naar wagon naar de Escap… | Tammo | Oma heeft alle vrienden met hun ingrediënten naar de schuur geroepen. Jelles advocaten be… | spreektekst nodig |
| missions_akte4.js | akte 4: Spring van wagon naar wagon naar de Escap… | Anita | Oma heeft alle vrienden met hun ingrediënten naar de schuur geroepen. Jelles advocaten be… |  |
| missions_akte5.js | akte 5: Een luik erin | Tammo | Blijf bij de wagen: Henk bouwt het luik in. | spreektekst nodig |
| missions_akte5.js | akte 5: Een luik erin | Anita | Blijf bij de wagen: Henk bouwt het luik in. |  |
| missions_akte5.js | akte 5: Een luik erin | Tammo | Henk zaagt een gat in de zijkant. Blijf bij de wagen tot het luik erin zit. | spreektekst nodig |
| missions_akte5.js | akte 5: Een luik erin | Anita | Henk zaagt een gat in de zijkant. Blijf bij de wagen tot het luik erin zit. |  |
| missions_akte5.js | akte 5: Een luik erin | Tammo | Instappen. Tinus wijst naar het weiland: de modder wacht. | spreektekst nodig |
| missions_akte5.js | akte 5: Een luik erin | Anita | Instappen. Tinus wijst naar het weiland: de modder wacht. |  |
| missions_akte5.js | akte 5: Een luik erin | Tammo | Gas, sturen, niet vastlopen. Henk wil zien dat de achteras het houdt. | spreektekst nodig |
| missions_akte5.js | akte 5: Een luik erin | Anita | Gas, sturen, niet vastlopen. Henk wil zien dat de achteras het houdt. |  |
| missions_akte5.js | akte 5: Een luik erin | Tammo | Houd de snelheid erin. In de modder zakt hij weg als je stilstaat. | spreektekst nodig |
| missions_akte5.js | akte 5: Een luik erin | Anita | Houd de snelheid erin. In de modder zakt hij weg als je stilstaat. |  |
| missions_akte5.js | akte 5: Een luik erin | Tammo | Rij hem de modder in. Als de achteras het houdt, houdt hij het ook op de Grote Markt. | spreektekst nodig |
| missions_akte5.js | akte 5: Een luik erin | Anita | Rij hem de modder in. Als de achteras het houdt, houdt hij het ook op de Grote Markt. |  |
| missions_akte5.js | akte 5: Een luik erin | Tammo | Vast. Tinus haakt de trekker aan: wip mee op het ritme, druk als de streep in het groen i… | spreektekst nodig |
| missions_akte5.js | akte 5: Een luik erin | Anita | Vast. Tinus haakt de trekker aan: wip mee op het ritme, druk als de streep in het groen i… |  |
| missions_akte5.js | akte 5: De colonne | Tammo | Rij voorop. De colonne volgt zolang je hem niet kwijtraakt. | spreektekst nodig |
| missions_akte5.js | akte 5: De colonne | Anita | Rij voorop. De colonne volgt zolang je hem niet kwijtraakt. |  |
| missions_akte5.js | akte 5: De colonne | Tammo | Eén vriend rijdt vlak naast jullie en houdt Jelle bezig. Wie? 1 tot en met 3. | spreektekst nodig |
| missions_akte5.js | akte 5: De colonne | Anita | Eén vriend rijdt vlak naast jullie en houdt Jelle bezig. Wie? 1 tot en met 3. |  |
| missions_akte5.js | akte 5: De colonne | Tammo | Instappen. Tessa zei: wij voorop. | spreektekst nodig |
| missions_akte5.js | akte 5: De colonne | Anita | Instappen. Tessa zei: wij voorop. |  |
| missions_akte5.js | akte 5: De colonne | Tammo | Rij voorop naar Aduard. Wie te ver achterblijft, valt weg: wacht op ze. | spreektekst nodig |
| missions_akte5.js | akte 5: De colonne | Anita | Rij voorop naar Aduard. Wie te ver achterblijft, valt weg: wacht op ze. |  |
| missions_akte5.js | akte 5: De colonne | Tammo | Wubbo opent de brug op afstand, met zijn sleutel, voor de colonne. Niet te hard, de aanha… | spreektekst nodig |
| missions_akte5.js | akte 5: De colonne | Anita | Wubbo opent de brug op afstand, met zijn sleutel, voor de colonne. Niet te hard, de aanha… |  |
| missions_akte5.js | akte 5: De colonne | Tammo | Nog vijf kilometer. De hele colonne, de Grote Markt op. | spreektekst nodig |
| missions_akte5.js | akte 5: De colonne | Anita | Nog vijf kilometer. De hele colonne, de Grote Markt op. |  |
| missions_akte5.js | akte 5: De colonne | Tammo | Bak in Oma's keuken: ei, zout, grof meel, vet en mosterd. | spreektekst nodig |
| missions_akte5.js | akte 5: De colonne | Anita | Bak in Oma's keuken: ei, zout, grof meel, vet en mosterd. |  |
| missions_akte5.js | akte 5: De colonne | Tammo | Oma's volgorde: eerst het ei, dan het zout, dan het grove meel, het vet en de mosterd. To… | spreektekst nodig |
| missions_akte5.js | akte 5: De colonne | Anita | Oma's volgorde: eerst het ei, dan het zout, dan het grove meel, het vet en de mosterd. To… |  |
| missions_akte5.js | akte 5: De colonne | Tammo | Kwart voor drie. De limo rijdt naar de notaris: zet de wagen dwars in de straat, voor dri… | spreektekst nodig |
| missions_akte5.js | akte 5: De colonne | Anita | Kwart voor drie. De limo rijdt naar de notaris: zet de wagen dwars in de straat, voor dri… |  |
| missions_akte5.js | akte 5: De colonne | Tammo | Oma's volgorde: ei, zout, grof meel, vet. Toetsen 1 tot en met 4. Gebruik alleen het grov… | spreektekst nodig |
| missions_akte5.js | akte 5: De colonne | Anita | Oma's volgorde: ei, zout, grof meel, vet. Toetsen 1 tot en met 4. Gebruik alleen het grov… |  |
| missions_akte5.js | akte 5: De colonne | Tammo | Kwart voor drie. Instappen: de limo rijdt naar de notaris. | spreektekst nodig |
| missions_akte5.js | akte 5: De colonne | Anita | Kwart voor drie. Instappen: de limo rijdt naar de notaris. |  |
| missions_akte5.js | akte 5: De colonne | Tammo | Berend proeft voor het laatst. Zeg wat jullie bal Gronings maakt: 1 tot en met 3. | spreektekst nodig |
| missions_akte5.js | akte 5: De colonne | Anita | Berend proeft voor het laatst. Zeg wat jullie bal Gronings maakt: 1 tot en met 3. |  |
| missions_akte6.js | akte 6: Inpakken | Tammo | Willemiens huis in Loppersum. Boeken in kleine dozen, breekbaar in de krant, en de kat is… | spreektekst nodig |
| missions_akte6.js | akte 6: Inpakken | Anita | Willemiens huis in Loppersum. Boeken in kleine dozen, breekbaar in de krant, en de kat is… |  |
| missions_akte6.js | akte 6: Inpakken | Tammo | Boeken in kleine dozen. Blijf bij de kast staan tot hij leeg is. | spreektekst nodig |
| missions_akte6.js | akte 6: Inpakken | Anita | Boeken in kleine dozen. Blijf bij de kast staan tot hij leeg is. |  |
| missions_akte6.js | akte 6: Inpakken | Tammo | Breekbaar in de krant. Blijf in de keuken staan tot de kasten leeg zijn. | spreektekst nodig |
| missions_akte6.js | akte 6: Inpakken | Anita | Breekbaar in de krant. Blijf in de keuken staan tot de kasten leeg zijn. |  |
| missions_akte6.js | akte 6: Inpakken | Tammo | De kat wil nergens in. Blijf bij hem staan tot de mand dicht is. | spreektekst nodig |
| missions_akte6.js | akte 6: Inpakken | Anita | De kat wil nergens in. Blijf bij hem staan tot de mand dicht is. |  |
| missions_akte6.js | akte 6: Inpakken | Tammo | De dozen staan klaar. Naar de verhuisbus voor het huis. | spreektekst nodig |
| missions_akte6.js | akte 6: Inpakken | Anita | De dozen staan klaar. Naar de verhuisbus voor het huis. |  |
| missions_akte6.js | akte 6: De wisselwoning | Tammo | De verhuisbus staat voor het huis. Willemien zit al voorin. | spreektekst nodig |
| missions_akte6.js | akte 6: De wisselwoning | Anita | De verhuisbus staat voor het huis. Willemien zit al voorin. |  |
| missions_akte6.js | akte 6: De wisselwoning | Tammo | Instappen, Tammo rijdt. Rustig. | spreektekst nodig |
| missions_akte6.js | akte 6: De wisselwoning | Anita | Instappen, Tammo rijdt. Rustig. |  |
| missions_akte6.js | akte 6: De wisselwoning | Tammo | Rustig rijden. Niet om de spullen, om Willemien. | spreektekst nodig |
| missions_akte6.js | akte 6: De wisselwoning | Anita | Rustig rijden. Niet om de spullen, om Willemien. |  |
| missions_akte6.js | akte 6: Terug | Tammo | Een buurtfeest op het erf in Loppersum. Rikus staat bij zijn busje. | spreektekst nodig |
| missions_akte6.js | akte 6: Terug | Anita | Een buurtfeest op het erf in Loppersum. Rikus staat bij zijn busje. |  |
| missions_akte6.js | akte 6: Terug | Tammo | Tafels op het erf. Blijf staan tot ze goed staan, de boer helpt mee. | spreektekst nodig |
| missions_akte6.js | akte 6: Terug | Anita | Tafels op het erf. Blijf staan tot ze goed staan, de boer helpt mee. |  |
| missions_akte6.js | akte 6: Terug | Tammo | De foto hangt in de gang. Waar je hem ziet als je weggaat, en als je terugkomt. | spreektekst nodig |
| missions_akte6.js | akte 6: Terug | Anita | De foto hangt in de gang. Waar je hem ziet als je weggaat, en als je terugkomt. |  |
| missions_akte6.js | akte 6: Het proefbeleg | Tammo | Een hooiberg op de heide ten noorden van Vesting Bourtange. Berend staat bij een kaart me… | spreektekst nodig |
| missions_akte6.js | akte 6: Het proefbeleg | Anita | Een hooiberg op de heide ten noorden van Vesting Bourtange. Berend staat bij een kaart me… |  |
| missions_akte6.js | akte 6: Het proefbeleg | Tammo | Aanvallen. Eerst de gracht: Lammert zet de sluis open, Klaas vaart. | spreektekst nodig |
| missions_akte6.js | akte 6: Het proefbeleg | Anita | Aanvallen. Eerst de gracht: Lammert zet de sluis open, Klaas vaart. |  |
| missions_akte6.js | akte 6: Het proefbeleg | Tammo | Wubbo staat bij de lier. Hij opent een tel te vroeg. | spreektekst nodig |
| missions_akte6.js | akte 6: Het proefbeleg | Anita | Wubbo staat bij de lier. Hij opent een tel te vroeg. |  |
| missions_akte6.js | akte 6: Het proefbeleg | Tammo | Boven jullie komt meel. Hoofd omlaag, naar het eerste bolwerk. | spreektekst nodig |
| missions_akte6.js | akte 6: Het proefbeleg | Anita | Boven jullie komt meel. Hoofd omlaag, naar het eerste bolwerk. |  |
| missions_akte6.js | akte 6: Het proefbeleg | Tammo | Blijf op het bolwerk staan tot de vlag staat. | spreektekst nodig |
| missions_akte6.js | akte 6: Het proefbeleg | Anita | Blijf op het bolwerk staan tot de vlag staat. |  |
| missions_akte6.js | akte 6: Het proefbeleg | Tammo | Het tweede bolwerk. De duiven luisteren naar Tammo. | spreektekst nodig |
| missions_akte6.js | akte 6: Het proefbeleg | Anita | Het tweede bolwerk. De duiven luisteren naar Tammo. |  |
| missions_akte6.js | akte 6: Het proefbeleg | Tammo | Het derde bolwerk. Tinus trekt de toren, Durk en Douwe duwen het kanon om. | spreektekst nodig |
| missions_akte6.js | akte 6: Het proefbeleg | Anita | Het derde bolwerk. Tinus trekt de toren, Durk en Douwe duwen het kanon om. |  |
| missions_akte6.js | akte 6: Het proefbeleg | Tammo | Blijf op het bolwerk staan tot de laatste vlag staat. | spreektekst nodig |
| missions_akte6.js | akte 6: Het proefbeleg | Anita | Blijf op het bolwerk staan tot de laatste vlag staat. |  |
| missions_akte6.js | akte 6: Het proefbeleg | Tammo | Drie vlaggen. Naar de poort, Berend wil binnenrijden. | spreektekst nodig |
| missions_akte6.js | akte 6: Het proefbeleg | Anita | Drie vlaggen. Naar de poort, Berend wil binnenrijden. |  |
| missions_akte6.js | akte 6: Het proefbeleg | Tammo | De Fjord Frituur staat open. Iedereen eet eierballen op de wal. | spreektekst nodig |
| missions_akte6.js | akte 6: Het proefbeleg | Anita | De Fjord Frituur staat open. Iedereen eet eierballen op de wal. |  |
| missions_nieuw.js | akte 1-3: Het Loket | Tammo | De rij staat binnen, achter de glazen deuren. Nummer 4117. | spreektekst nodig |
| missions_nieuw.js | akte 1-3: Het Loket | Anita | De rij staat binnen, achter de glazen deuren. Nummer 4117. |  |
| missions_nieuw.js | akte 1-3: Het Loket | Tammo | Blijf in de rij staan tot 4117 wordt omgeroepen. | spreektekst nodig |
| missions_nieuw.js | akte 1-3: Het Loket | Anita | Blijf in de rij staan tot 4117 wordt omgeroepen. |  |
| missions_nieuw.js | akte 1-3: Het Loket | Tammo | Alles bij elkaar: nu inschrijven, honderdvijftig euro contant. | spreektekst nodig |
| missions_nieuw.js | akte 1-3: Het Loket | Anita | Alles bij elkaar: nu inschrijven, honderdvijftig euro contant. |  |
| missions_nieuw.js | akte 1-3: Nul krassen, vijftienhonderd punten | Anita | Berend pakt zijn sleutels terug en rijdt weg. Wij lopen, Tessa. |  |
| missions_nieuw.js | akte 1-3: Nul krassen, vijftienhonderd punten | Tammo | Eerst de Grote Markt: vijftienhonderd stuntpunten, zonder krassen. Daarna het Boterdiep. | spreektekst nodig |
| missions_nieuw.js | akte 1-3: Nul krassen, vijftienhonderd punten | Anita | Eerst de Grote Markt: vijftienhonderd stuntpunten, zonder krassen. Daarna het Boterdiep. |  |
| missions_nieuw.js | akte 1-3: Het containerlabyrint | Tammo | In de kooi van de kraan. Lammert belt: de bewaker kijkt bij het tweede piepje omhoog. Nie… | spreektekst nodig |
| missions_nieuw.js | akte 1-3: Het containerlabyrint | Anita | In de kooi van de kraan. Lammert belt: de bewaker kijkt bij het tweede piepje omhoog. Nie… |  |
| missions_nieuw.js | akte 1-3: Het containerlabyrint | Tammo | Van boven zag je hem: de blauwe, naast de rode. Container 4471. | spreektekst nodig |
| missions_nieuw.js | akte 1-3: Het containerlabyrint | Anita | Van boven zag je hem: de blauwe, naast de rode. Container 4471. |  |
| missions_nieuw.js | akte 1-3: Het containerlabyrint | Tammo | Papieren eruit, papieren erin. Even rustig staan. | spreektekst nodig |
| missions_nieuw.js | akte 1-3: Het containerlabyrint | Anita | Papieren eruit, papieren erin. Even rustig staan. |  |
| missions_nieuw.js | akte 1-3: Het containerlabyrint | Tammo | Klaar. Terug naar de kade, voor het schip vertrekt. | spreektekst nodig |
| missions_nieuw.js | akte 1-3: Het containerlabyrint | Anita | Klaar. Terug naar de kade, voor het schip vertrekt. |  |
| missions_nieuw.js | akte 1-3: De dijk | Tammo | De auto blijft bij de sluis, Lammert regelt de rest. Wij gaan te voet verder. | spreektekst nodig |
| missions_nieuw.js | akte 1-3: De dijk | Anita | De auto blijft bij de sluis, Lammert regelt de rest. Wij gaan te voet verder. |  |
| missions_nieuw.js | akte 1-3: De dijk | Tammo | Instappen. De trekker-limo van Jelle staat al te ronken. | spreektekst nodig |
| missions_nieuw.js | akte 1-3: De dijk | Anita | Instappen. De trekker-limo van Jelle staat al te ronken. |  |
| missions_nieuw.js | akte 1-3: De dijk | Tammo | Naar de sluis van Delfzijl, over de dijk. Eerste aan de sluis houdt de voorraden. Let op … | spreektekst nodig |
| missions_nieuw.js | akte 1-3: De dijk | Anita | Naar de sluis van Delfzijl, over de dijk. Eerste aan de sluis houdt de voorraden. Let op … |  |
| missions_nieuw.js | akte 1-3: Laag over het graan | Tammo | Roelfiens rode gewasspuiter staat op de strook. Instappen, Tessa stuurt. | spreektekst nodig |
| missions_nieuw.js | akte 1-3: Laag over het graan | Anita | Roelfiens rode gewasspuiter staat op de strook. Instappen, Tessa stuurt. |  |
| missions_nieuw.js | akte 1-3: Laag over het graan | Tammo | Opstijgen en laag over het graan. Eerst het spandoek aan de paal oppikken, dan naar de ke… | spreektekst nodig |
| missions_nieuw.js | akte 1-3: Laag over het graan | Anita | Opstijgen en laag over het graan. Eerst het spandoek aan de paal oppikken, dan naar de ke… |  |
| missions_nieuw.js | akte 1-3: Laag over het graan | Tammo | Spandoek opgepikt! Laag blijven, naar de kermis. | spreektekst nodig |
| missions_nieuw.js | akte 1-3: Laag over het graan | Anita | Spandoek opgepikt! Laag blijven, naar de kermis. |  |
| missions_nieuw.js | akte 1-3: Laag over het graan | Tammo | Ze lezen het! Door de rij kramen. | spreektekst nodig |
| missions_nieuw.js | akte 1-3: Laag over het graan | Anita | Ze lezen het! Door de rij kramen. |  |
| missions_nieuw.js | akte 1-3: Laag over het graan | Tammo | Voorbij de kermis. Nu terug naar de strook. | spreektekst nodig |
| missions_nieuw.js | akte 1-3: Laag over het graan | Anita | Voorbij de kermis. Nu terug naar de strook. |  |
| missions_nieuw.js | akte 1-3: Laag over het graan | Tammo | Terug naar de strook. Gas terug maar niet helemaal eraf (houd ongeveer 90 km/u aan), neus… | spreektekst nodig |
| missions_nieuw.js | akte 1-3: Laag over het graan | Anita | Terug naar de strook. Gas terug maar niet helemaal eraf (houd ongeveer 90 km/u aan), neus… |  |
| missions_nieuw.js | akte 1-3: Laag over het graan | Tammo | Podium in de Kiezelrace, dan vertelt Sjoerd over het museum. Altijd tegenwind, op een eig… | spreektekst nodig |
| missions_nieuw.js | akte 1-3: Laag over het graan | Anita | Podium in de Kiezelrace, dan vertelt Sjoerd over het museum. Altijd tegenwind, op een eig… |  |
| missions_nieuw.js | akte 1-3: Laag over het graan | Tammo | Instappen. De tankwagen staat bij de groothandel. | spreektekst nodig |
| missions_nieuw.js | akte 1-3: Laag over het graan | Anita | Instappen. De tankwagen staat bij de groothandel. |  |
| missions_nieuw.js | akte 1-3: Vlieg Dijkstra's lunch naar het UMCG, h… | Tammo | Instappen bij Dijkstra. Spatie omhoog, W vooruit, A/D draaien. Dijkstra vliegt de lange s… | spreektekst nodig |
| missions_nieuw.js | akte 1-3: Vlieg Dijkstra's lunch naar het UMCG, h… | Anita | Instappen bij Dijkstra. Spatie omhoog, W vooruit, A/D draaien. Dijkstra vliegt de lange s… |  |
| missions_nieuw.js | akte 1-3: Vlieg Dijkstra's lunch naar het UMCG, h… | Tammo | Loop langs drie tenten en drink in elke tent mee. De menigte duwt, dus blijf overeind en … | spreektekst nodig |
| missions_nieuw.js | akte 1-3: Vlieg Dijkstra's lunch naar het UMCG, h… | Anita | Loop langs drie tenten en drink in elke tent mee. De menigte duwt, dus blijf overeind en … |  |

### Vragen in keuzegesprekken (Loket, Wiebelwerk, de bond) (9)

| Bron | Missie of scène | Stem | Tekst | Opmerking |
|---|---|---|---|---|
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | Accountmanager | Wat is uw merkpersoonlijkheid? | spreektekst nodig |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | Accountmanager | Wilt u een chatbot? | spreektekst nodig |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | Accountmanager | En hoe lang bestaat uw bedrijf? | spreektekst nodig |
| missions_akte4.js | akte 4: Spring van wagon naar wagon naar de Escap… | Jelle | U kunt de auto redden of de bal houden. Beide tegelijk is juridisch niet mogelijk. |  |
| missions_akte5.js | akte 5: De colonne | Tessa | Alle vrienden rijden mee, maar één rijdt naast ons. Wie neemt Jelles limo voor zijn reken… |  |
| missions_akte5.js | akte 5: De colonne | Berend | Wat maakt deze eierbal Gronings? Eén zin, en nog niet zeuren. |  |
| missions_akte5.js | akte 5: De colonne | Berend | En waarom moet de standplaats naar jullie? |  |
| missions_nieuw.js | akte 1-3: Het Loket | Loketbediende | Welk formulier had u nodig? | spreektekst nodig |
| missions_nieuw.js | akte 1-3: Het Loket | Loketbediende | En waar haalt u de stempel? | spreektekst nodig |

### Heropname na inclusieve taal (oude opname klinkt nog) (10)

| Bron | Missie of scène | Stem | Tekst | Opmerking |
|---|---|---|---|---|
| game/js/intromontage.js, script.json (akte 1) | inclusieve taal | Rikus | Voor wie wakker ligt van de huur: ik ook, luisteraars. | oude opname klinkt nog; nieuwe tekst vervangt hem |
| game/js/missions.js | inclusieve taal | Anita | En ik kom voor hem. Opzij, allemaal. | oude opname klinkt nog; nieuwe tekst vervangt hem |
| game/js/missions.js | inclusieve taal | Tammo | Kom op, allemaal. Eén keer luisteren. | oude opname klinkt nog; nieuwe tekst vervangt hem |
| script.json (akte 3) | inclusieve taal | Tammo | Moi, allemaal. Lekker gebotst? | oude opname klinkt nog; nieuwe tekst vervangt hem |
| game/js/missionstory.js, script.json (akte 2) | inclusieve taal | Kapitein Klaas | Mensen. Ik heb net twee reuzen uit de haven gevist. | oude opname klinkt nog; nieuwe tekst vervangt hem |
| game/js/missions.js, subtitles.js | inclusieve taal | Jelle Terpstra | Jim fytse mar, allegear. | oude opname klinkt nog; nieuwe tekst vervangt hem |
| game/js/rondvaartlines.js | inclusieve taal | Tammo | Dat was het rondje, beste mensen. / Beste mensen, aan uw rechterhand: Schipper Wiebe. | oude opname klinkt nog; nieuwe tekst vervangt hem |
| game/js/rondvaartchase.js | inclusieve taal | Schipper Wiebe | Beste mensen, u zit op een gestolen boot! / Hou je vast, beste mensen! | oude opname klinkt nog; nieuwe tekst vervangt hem |
| game/js/banterlines.js | inclusieve taal | Tammo | Zodat iedereen kan zien dat die niet in de bus zit. | oude opname klinkt nog; nieuwe tekst vervangt hem |
| game/js/radio.js, sikkomfeed.js | inclusieve taal | Rikus | Mysterieuze klusser weer aan het werk in Groningen. | oude opname klinkt nog; nieuwe tekst vervangt hem |

### Reacties in keuzegesprekken (mix van spraak en verteltekst) (26)

| Bron | Missie of scène | Stem | Tekst | Opmerking |
|---|---|---|---|---|
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | NPC (zie vraag) | Dat is een product, geen persoonlijkheid. | tekst en spreker eerst bevestigen |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | NPC (zie vraag) | Dat noteer ik. | tekst en spreker eerst bevestigen |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | NPC (zie vraag) | Dan beginnen we met een workshop. Die duurt een week. | tekst en spreker eerst bevestigen |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | NPC (zie vraag) | Dat vraagt een klant niet. Bent u wel een klant? | tekst en spreker eerst bevestigen |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | NPC (zie vraag) | Iedereen wil een chatbot. Dan doen wij hem toch. | tekst en spreker eerst bevestigen |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | NPC (zie vraag) | Prachtig. Dat noteer ik ook. | tekst en spreker eerst bevestigen |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | NPC (zie vraag) | Een start-up. Dat zie ik graag. Dat noteer ik. | tekst en spreker eerst bevestigen |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | NPC (zie vraag) | Dat is het jaar van het Ontzet. U bent geen bedrijf, u bent een geschiedenisles. | tekst en spreker eerst bevestigen |
| missions_akte4.js | akte 4: Wie draaide de camera's uit? | NPC (zie vraag) | Dit is de derde vraag die u niet kent. Ik loop even mee. | tekst en spreker eerst bevestigen |
| missions_akte4.js | akte 4: Spring van wagon naar wagon naar de Escap… | NPC (zie vraag) | Tessa laat de rugzak vallen. Jelles mannen springen met de bal naar een limo. | tekst en spreker eerst bevestigen |
| missions_akte4.js | akte 4: Spring van wagon naar wagon naar de Escap… | NPC (zie vraag) | Tessa houdt de bal tot een belegger hem uit haar handen trekt. Dan springt ze terug naar … | tekst en spreker eerst bevestigen |
| missions_akte5.js | akte 5: De colonne | NPC (zie vraag) | Wubbo: "Een bus is breed. Ik zet hem dwars als het moet." | verteltekst, geen spreekregel |
| missions_akte5.js | akte 5: De colonne | NPC (zie vraag) | Tinus: "Ik trek hem weg." Hij zegt altijd hetzelfde, maar het klopt. | verteltekst, geen spreekregel |
| missions_akte5.js | akte 5: De colonne | NPC (zie vraag) | Geesje: "Ik ken elk steegje. Hij is sneller dan hij lijkt, hè, mijn scooter." | verteltekst, geen spreekregel |
| missions_akte5.js | akte 5: De colonne | NPC (zie vraag) | Berend knikt langzaam. Hij schrijft niks op, dat is een goed teken. | verteltekst, geen spreekregel |
| missions_akte5.js | akte 5: De colonne | NPC (zie vraag) | Berend: "Dat is Fries." Tessa schuift het meel snel weg. | verteltekst, geen spreekregel |
| missions_akte5.js | akte 5: De colonne | NPC (zie vraag) | Berend: "Een luik is geen smaak." Henk, achterin, knikt toch. | verteltekst, geen spreekregel |
| missions_akte5.js | akte 5: De colonne | NPC (zie vraag) | Mem kucht. Trijntje kijkt de andere kant op, tevreden. | tekst en spreker eerst bevestigen |
| missions_akte5.js | akte 5: De colonne | NPC (zie vraag) | Berend: "Daar stem ik niet op." Jelle slikt. | verteltekst, geen spreekregel |
| missions_akte5.js | akte 5: De colonne | NPC (zie vraag) | Berend: "Friet erbij. Dat noteer ik." Het is een beetje een gok. | verteltekst, geen spreekregel |
| missions_nieuw.js | akte 1-3: Het Loket | NPC (zie vraag) | In drievoud. Niet vouwen, dat staat er niet voor niets. | tekst en spreker eerst bevestigen |
| missions_nieuw.js | akte 1-3: Het Loket | NPC (zie vraag) | Gevouwen? Dan is het formulier 7C. Dat bestaat niet. | tekst en spreker eerst bevestigen |
| missions_nieuw.js | akte 1-3: Het Loket | NPC (zie vraag) | Dat is loket B. Loket B is vandaag loket A. | tekst en spreker eerst bevestigen |
| missions_nieuw.js | akte 1-3: Het Loket | NPC (zie vraag) | De stempel is vanmiddag bij loket C. De kopieermachine is van niemand. | tekst en spreker eerst bevestigen |
| missions_nieuw.js | akte 1-3: Het Loket | NPC (zie vraag) | Loket B is nu loket A. De stempel is bij C. Zo gaat dat hier. | tekst en spreker eerst bevestigen |
| missions_nieuw.js | akte 1-3: Het Loket | NPC (zie vraag) | Die bewaart de bal, niet de stempel. Loket C. | tekst en spreker eerst bevestigen |

### Bewust stil, tekst gewijzigd (voice_stil.json) (2)

| Bron | Missie of scène | Stem | Tekst | Opmerking |
|---|---|---|---|---|
| voice_stil.json | inclusieve taal | Voetganger (bel) | Politie? Iemand slaat hier mensen in elkaar! | 'een gek' voor een gewelddadig mens maakt een psychische aandoening tot scheldwoord; de oude opname is niet meer in gebruik |
| voice_stil.json | inclusieve taal | Kiekdoar-redactie | Kiezelweek! Groepjes nieuwe Stadjers in de binnenstad en het Noorderplantsoen. Rustig rij… | de opname zegt nog 'KEI-week', een echt evenement; de nieuwe tekst wacht op een nieuwe opname (#489) |

