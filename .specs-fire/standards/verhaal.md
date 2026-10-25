# Spec: Verhaal, personages en stem

> Canonieke spec. `AGENTS.md` wint bij twijfel (constitutie 1, 2, 5 en 6). De code
> en `docs/verhaal/nieuw/` zijn de bron; `docs/verhaal/STIJLGIDS.md` is de
> schrijfnaslag. Eén verhaal: *Alles voor één eierbal*, in het spel
> *GDE Groningen - Zomer vol misdaad* (`game/js/logo.js:10-11`).

## Doel

Eén doorlopend verhaal van de Stad de provincie in en terug, in vijf akten met een
korte Deel 4 erna. Elke regel die een speler ziet of hoort is Nederlands, verzonnen,
zomer en in de stem van de vaste cast. Tekst is data: canon, script, build, spel —
in die volgorde, en nooit met de hand in de gebouwde data.

## De keten

1. **Canon**: `docs/verhaal/nieuw/00-OVERZICHT.md` (titel, cast, akten, kalender,
   plakjesbord, kanalen) en `01-akte1.md` … `05-akte5.md` (per akte alle missies met
   opening en sleutelscène). `DEEL4.md` is de canon van Deel 4.
2. **Script**: `09-script-akte1.md` … `09-script-akte6.md`. Formaat: kop
   `## [ID] Titel - regio/plaats - voertuig`, dan `(regie: ...)`, dan
   `SPREKER: tekst [BEHOUDEN|NIEUW]`; kanalen zijn `(radio)`, `(telefoon)` en
   `APP VAN→NAAR (stil)` (`09-script-akte1.md:3`).
3. **Build**: `node scripts/build_story_data.mjs` leest elke `09-script-akteN.md`
   (`scripts/build_story_data.mjs:110`) en schrijft `game/storydata/script.json`;
   dat bestand zegt zelf "Do not edit by hand" (`:206`). `--check` faalt als het
   achterloopt.
4. **Spel**: `game/js/storytext.js` leest `script.json` en geeft scènes, radioblokken,
   appjes en autogesprekken aan `story.js` en `missionstory.js`; `game/js/storyarc.js`
   is de enige facade voor de rest van het spel (`:7`, `:16`).

Stand van de data: 207 scènes en 1.450 regels over act 1 tot en met 6; 37 zijn
stille appjes en 1.074 hebben geen opname, dus die toont het spel als ondertitel
met leestijd (`game/js/storytext.js:52`). Een `[BEHOUDEN]`-regel heeft een opname:
één andere letter maakt hem stil. Nieuwe opnames zijn er niet; alle `[NIEUW]`-regels
blijven tekst (`docs/verhaal/nieuw/07-TTS-RAMING.md:3`).

## Structuur

- **Vijf akten** (`PARTS`, `game/js/storyarc_nieuw.js:147-198`): 1 Moi, Grunn (Stad,
  vr 14 aug), 2 Het Noorden is groot, 3 Aan de Eems, 4 Zuidwaarts, 5 Ontzet (vr 28
  aug), met **Deel 4: Nazomer** erna (`:201`), dat pas opent als de eindkaart van
  akte 5 is gespeeld (`game/js/story.js:170`).
- **Stappen**: opening M00, 26 missies M01-M26, vier reisbeats T1-T4 en epiloog E;
  Deel 4 voegt M27-M30 en T5 toe: samen 30 missies en vijf reisbeats
  (`game/js/storyarc_nieuw.js:219-346`). Elke missie heeft één functie: inschrijven,
  een plakje van Jelle blokkeren, de waarheid over de bal, of de wagen en het recept
  gereedmaken (`00-OVERZICHT.md:143`).
- **Kalender** (`game/js/calendar.js`): dag 1 is vrijdag 14 augustus 2026, het
  Gronings Ontzet dag 15 (vr 28 aug), de epiloog dag 29 (vr 11 sep, `:16-18`); Deel 4
  loopt van 14 tot 19 september (`:93`). De nazomer loopt tot 22 september en daarna
  blijft het zomer (`LAST_SUMMER_DAY` 40, `:15`): geen winter, sneeuw of ijs.
- **Wat weten we?**: `WHY` en `CLUES` (`game/js/storyarc_nieuw.js:349-406`) zijn de
  enige bron; een clue verschijnt pas als zijn stap klaar is.

## Personages

Vaste cast, met de stem uit `scripts/tts_cast.mjs` en `scripts/tts_lines_list.mjs`:

| Wie | Rol | Stem en taal |
|---|---|---|
| Tammo | held, Stadjer, duivenfluisteraar | Orus, Gronings, droog en kort |
| Tessa (intern `anita`) | heldin, regelt alles, de Fjord Frituur | Callirrhoe; **standaard Nederlands** (#134) |
| Rikus | nacht-dj Nachtstreek, jeugdvriend | Schedar, warm en droog |
| Jelle Terpstra | tegenstander, Us Mem Snacks | Fenrir, Nederlands met Friese woorden |
| Mem (Gerda) Terpstra | Jelles moeder, neemt de bal af | Gacrux, Nederlands met Friese woorden |
| Oma Trijntje | mentor, won in 1953 | Sulafat, Gronings, stellig |
| Berend Bos | Bommen Berend, jurylid, chauffeur | Charon, nors |
| Durk en Douwe | Jelles tweeling | Algieba en Algenib, traag |
| Sjabbe, Klaas, Bert, Dijkstra, Sjoerd, Henk, Jelmer, Geert, de torenwachter | bijrollen met één trek | zie `docs/personages.md` |

Geesje, Lammert, Roelfien, Wubbo, Tinus, mevrouw Hoving en Willemien zijn nieuw en
hebben nog geen stem: hun regels blijven tekst tot een latere opnameronde
(`07-TTS-RAMING.md:67`). **Geschrapt** zijn Femke, Harm, Hilly, Hilje en Boer Roelf
(`00-OVERZICHT.md:68`; de sprekers zijn uit de lijst gehaald in
`game/js/storyarc_nieuw.js:104-105`); Rotor Roelf blijft alleen een stem.

- **Tessa is Nederlandse en spreekt standaard Nederlands** (#134), ook in de opname:
  geen Gronings accent, geen dialectspelling. Een Gronings woord mag als grap over
  haar (voorzichtig, soms verbeterd door een Groninger); de opgenomen uitzonderingen
  blijven staan (`docs/verhaal/STIJLGIDS.md:42-49`).
- **Naamkaart** bij de eerste ontmoeting: de kaart staat in `CHARACTERS` (`card` en
  `step`, `game/js/storyarc_nieuw.js:118-142`) en verschijnt via `showNameCard`
  (`game/js/namecard.js:42`) alleen als een regel hem meegeeft met `card: '<key>'`
  (`game/js/missionstory.js:1119`, `game/js/storycontact.js:321`). Een `Naamkaart:`-
  opdracht in het script is de regie; zonder die `card`-optie in de data ziet de
  speler niets (#475).
- **Verzonnen namen zijn verplicht**: Kiezelweek, Plantsoenfestijn, Us Mem Snacks,
  Delfstof Noord, Wiebelwerk, EIKEA, Pand & Poen, Oldenhuis Bakt, Kiekdoar. Echte
  straten, plekken en gebouwen mogen als decor (`docs/personages.md:7`).
- **Feitenblad** (`STIJLGIDS.md:102-115`): Tammo 34, Oma 92, Mem 91; vijf juryleden,
  drie stemmen beslissen; Hoving bewaart de bal sinds 1998, Berend is jurylid sinds
  1982; Jelle had de bal op 12 augustus, de kraak is op 17 augustus. Cijfers over
  gevoelige onderwerpen alleen uit `docs/TESSA-CIJFERS.md`, met bron en jaar.
- **Kanalen** strikt gescheiden: de radio is wereld en dimt bij een missie, de
  telefoon doet briefings en hints, het gesprek ter plekke doet de relatie, appjes
  zijn stil (`00-OVERZICHT.md:311-321`).

## Regels voor een nieuwe missie of scène

1. **Nederlands**, met Gronings en Fries alleen met zorg en altijd met een
   Nederlandse ondertitel (`game/js/subtitles.js`, `FY`); "Grunn", nooit "de Grunn".
2. **Geen echte merken, bedrijven of personen**; verzin de parodie. Echte plaatsen
   en gebouwen mogen, en moeten kloppen (`STIJLGIDS.md:92-96`).
3. **Altijd zomer**: geen winter, sneeuw, ijs of "volgend voorjaar"; de kalender
   hierboven is leidend.
4. **Eén taak per zin in het HUD-doel**, geen tellingen of scoreboekhouding in
   dialoog (`docs/verhaal/REVIEWS-RONDE3.md:27`, `STIJLGIDS.md:77`).
5. **Een `Naamkaart:`-opdracht** waar de speler iemand voor het eerst ziet, plus de
   `card`-optie op die regel, anders verschijnt er niets.
6. **Een stem of een ondertitel**: elke uiting is `stem`, `radio`, `telefoon` of
   bewust stil (`app-stil`); zonder opname toont het spel de tekst met leestijd
   (`game/js/storytext.js:52`).
7. **Eén functie per missie** met een oorzaak-gevolg-beat; anders wordt het een
   zijmissie of een reisbeat (`00-OVERZICHT.md:143`).
8. **Samen spelen**: één regel per missie of scène — doet een gast mee (J of N), wat
   ziet hij (snapshot of EXTRA-bericht), wie krijgt de beloning en de eigen
   voortgang (#429), wat gebeurt er bij wegvallen of later aansluiten, en welke test
   het dekt. Een gast krijgt geen gesprekken met personages en geen verhaalstap van
   een ander (`.specs-fire/standards/multiplayer.md:75`); de wereld en de keuzes
   zijn gezamenlijk.
9. **Bewijs**: de stap in `game/js/storyarc_nieuw.js` met zijn `scenes`, de scène in
   het `09`-script, en daarna `node scripts/build_story_data.mjs`,
   `node scripts/storydata_test.mjs`, `node scripts/story_similarity_test.mjs`,
   `node scripts/text_audit.mjs` en `node scripts/voice_coverage.mjs --quiet`.

## Tests

`storydata_test.mjs` bewaakt het formaat, de sprekers, de verse build en dat elke
scène op een stap staat; `story_similarity_test.mjs` en `text_audit.mjs` tellen de
verboden zinsbouw en verboden woorden; `storyflow_nieuw_test.mjs` en
`storyapps_test.mjs` bewaken de volgorde en de stille appjes; `calendar_test.mjs`
de datums; `opnamelijst.mjs --check` de openstaande opnames. Per akte:
`akte1_doelen_test.mjs`, `akte2_doelen_test.mjs`, `akte3_test.mjs` … `akte6_test.mjs`,
en de regie in `cutscenes_akte1_test.mjs` … `cutscenes_akte4_test.mjs` en
`cutscenes_akte6_test.mjs`. De Electron-verhaaltest en de volledige suite draait de
coördinator bij een release, niet de agent.

## Open punten (met issue)

- **#472 — `docs/personages.md` loopt achter**: het verwijst voor het verhaal naar
  een document dat niet meer bestaat (`:13`), noemt nog H-nummers en de geschrapte
  Femke, Harm en Hilly (`:252-255`), en geeft Tessa een "Groningse" stem (`:73`,
  `:78`) tegen #134 in.
- **#474 — verouderde data**: de kop van `game/js/storyarc_nieuw.js:7-9` zegt dat
  alleen akte 1 en M07 gebouwd zijn terwijl elke stap `built: true` heeft; in
  `game/js/calendar.js:74-90` staat dode Deel 4-data (`DEEL4_STEP_DAYS`,
  `VOORRONDE_STEPS`) van de oude Ommelander Ronde; en de kermis in Winschoten staat
  op twee datums (zie hieronder).
- **#475 — mevrouw Hoving krijgt geen naamkaart**: `game/js/storyarc_nieuw.js:131`
  heeft de kaart, maar geen regel geeft hem door; in `script.json` heeft geen enkele
  scène een `card`-optie. Dezelfde leemte geldt voor de andere nieuwe sprekers.

## Afwijkingen tussen docs en code

| Waar | Wat |
|---|---|
| `00-OVERZICHT.md:117` | T1 gaat naar Winsum; `09-script-akte2.md:111` en `game/js/storyarc_nieuw.js:252` zeggen Warffum. De code volgt het script. |
| `00-OVERZICHT.md:79` | "26 missies, 4 reisbeats"; de code heeft er 30 en 5, omdat Deel 4 (`DEEL4.md:19-25`) erbij kwam. |
| `game/js/calendar.js:193` | De kermis in Winschoten staat op 29 september-4 oktober met "een week" in de kaart, terwijl `:205` hem naar 22-23 augustus zet (en `:62` M16 op 22 augustus). |
| `game/js/missionstory.js:2104` | De kicker zegt "KEI-week", een echte introweek; `calendar.js:162` en `:203` gebruiken elders "Kiezelweek" (`00-OVERZICHT.md:108`). |
| `07-TTS-RAMING.md:24` | 172 scènes en 1.164 uitingen voor de vijf akten; `script.json` telt er 185 en 1.300 spreekregels. |
| `scripts/tts_cast.mjs:16` | Tessa's stemprofiel zegt "Groningse vrouw", tegen #134 en `STIJLGIDS.md:42`. |
| `game/js/banterlines.js:474` | "KEI-week" in een autogesprek; buiten het verhaal staat het nog op meer plekken (`game/js/flavourlines.js:153`). Dat is de lijst uit `docs/verhaal/nieuw/ronde2-besluiten.md:30`, geen verhaaltekst. |
