# Spec: Verhaal, personages en stem

> Canonieke spec. `AGENTS.md` wint bij twijfel (constitutie 1, 2, 5 en 6). Bron: de
> code en `docs/verhaal/nieuw/`; `docs/verhaal/STIJLGIDS.md` is naslag. Eén verhaal:
> *Alles voor één eierbal*, in het spel *GDE Groningen - Zomer vol misdaad*
> (`game/js/logo.js:10-11`).

## Doel

Eén doorlopend verhaal van de Stad de provincie in en terug, in vijf akten met een
korte Deel 4 erna. Elke regel die een speler ziet of hoort is Nederlands, verzonnen,
zomer en in de stem van de vaste cast; tekst is data (canon, script, build, spel).

## De keten

1. **Canon**: `docs/verhaal/nieuw/00-OVERZICHT.md` (titel, cast, kalender, kanalen) en
   `docs/verhaal/nieuw/01-akte1.md` … `docs/verhaal/nieuw/05-akte5.md` (per akte alle
   missies met opening en sleutelscène); `docs/verhaal/nieuw/DEEL4.md` is de canon van
   Deel 4.
2. **Script**: `docs/verhaal/nieuw/09-script-akte1.md` …
   `docs/verhaal/nieuw/09-script-akte6.md`. Formaat: kop
   `## [ID] Titel - regio/plaats - voertuig`, dan `(regie: ...)`, dan
   `SPREKER: tekst [BEHOUDEN|NIEUW]`; kanalen zijn `(radio)`, `(telefoon)` en
   `APP VAN→NAAR (stil)` (`docs/verhaal/nieuw/09-script-akte1.md:3`).
3. **Build**: `node scripts/build_story_data.mjs` leest de zes `09`-scripts
   (`scripts/build_story_data.mjs:110`) en schrijft `game/storydata/script.json`; dat
   zegt zelf "Do not edit by hand" (`:206`) en `--check` faalt als het achterloopt.
4. **Spel**: `game/js/storytext.js` leest `game/storydata/script.json`;
   `game/js/storyarc.js` is de enige facade voor de rest van het spel (`:7`, `:16`).

De data: 207 scènes, 1.450 regels in act 1 tot en met 6; 37 zijn stille appjes en
1.074 hebben geen opname, dus die toont het spel als ondertitel met leestijd
(`game/js/storytext.js:51`). Een `[BEHOUDEN]`-regel heeft een opname: één andere
letter maakt hem stil. Nieuwe opnames komen er niet; alle `[NIEUW]`-regels blijven
tekst (`docs/verhaal/nieuw/07-TTS-RAMING.md:3`).

## Structuur

- **Vijf akten** (`PARTS`, `game/js/storyarc_nieuw.js:147-198`): 1 Moi, Grunn (Stad,
  vr 14 aug), 2 Het Noorden is groot, 3 Aan de Eems, 4 Zuidwaarts, 5 Ontzet (vr 28
  aug), met **Deel 4: Nazomer** erna (`:201`), dat pas opent als de eindkaart van
  akte 5 is gespeeld (`game/js/story.js:170`).
- **Stappen**: opening M00, 26 missies M01-M26, vier reisbeats T1-T4 en epiloog E;
  Deel 4 voegt M27-M30 en T5 toe: samen 30 missies en vijf reisbeats
  (`game/js/storyarc_nieuw.js:219-346`). Elke missie heeft één functie: inschrijven,
  een plakje blokkeren, de waarheid over de bal, of de wagen en het recept
  (`docs/verhaal/nieuw/00-OVERZICHT.md:143`).
- **Kalender** (`game/js/calendar.js`): dag 1 is vrijdag 14 augustus 2026, het
  Gronings Ontzet dag 15 (vr 28 aug), de epiloog dag 29 (vr 11 sep, `:16-18`); Deel 4
  loopt van 14 tot 19 september (`:93`). De nazomer loopt tot 22 september en daarna
  blijft het zomer (`LAST_SUMMER_DAY` 40, `:15`): geen winter, sneeuw of ijs.

## Personages

Vaste cast, stem uit `scripts/tts_cast.mjs` en `scripts/tts_lines_list.mjs`
(bijrollen: `docs/personages.md`):

| Wie | Rol | Stem en taal |
|---|---|---|
| Tammo | held, Stadjer | Orus, Gronings, droog en kort |
| Tessa (intern `anita`) | heldin, de Fjord Frituur | Callirrhoe; **standaard Nederlands** (#134) |
| Rikus | nacht-dj Nachtstreek | Schedar, warm en droog |
| Jelle Terpstra | tegenstander, Us Mem Snacks | Fenrir, Nederlands met Friese woorden |
| Mem (Gerda) Terpstra | Jelles moeder | Gacrux, Nederlands met Friese woorden |
| Oma Trijntje | mentor, won in 1953 | Sulafat, Gronings, stellig |
| Berend Bos | Bommen Berend, jurylid | Charon, nors |
| Durk en Douwe | Jelles tweeling | Algieba en Algenib, traag |
| Sjabbe, Klaas, Bert, Dijkstra, Sjoerd, Henk, Jelmer, Geert, de torenwachter | bijrollen | zie `docs/personages.md` |

Geesje, Lammert, Roelfien, Wubbo, Tinus, mevrouw Hoving en Willemien zijn nieuw en
hebben nog geen stem (`docs/verhaal/nieuw/07-TTS-RAMING.md:67`). **Geschrapt** zijn
Femke, Harm, Hilly, Hilje en Boer Roelf (`docs/verhaal/nieuw/00-OVERZICHT.md:68`;
`game/js/storyarc_nieuw.js:104-105`); Rotor Roelf blijft alleen een stem.

- **Tessa spreekt standaard Nederlands** (#134), ook in de opname: geen Gronings
  accent of dialectspelling; een Gronings woord is een grap over haar
  (`docs/verhaal/STIJLGIDS.md:42-49`).
- **Naamkaart** bij de eerste ontmoeting: de kaart staat in `CHARACTERS` (`card` en
  `step`, `game/js/storyarc_nieuw.js:118-142`) en verschijnt alleen als een regel hem
  meegeeft met `card: '<key>'` (`game/js/missionstory.js:1119`,
  `game/js/storycontact.js:321`). De `Naamkaart:`-opdracht in het script is de regie,
  geen trigger (#475).
- **Verzonnen namen zijn verplicht**: Kiezelweek, Plantsoenfestijn, Us Mem Snacks,
  Delfstof Noord, Wiebelwerk, EIKEA, Pand & Poen, Oldenhuis Bakt, Kiekdoar. Echte
  straten, plekken en gebouwen mogen als decor (`docs/personages.md:7`).
- **Feitenblad** (`docs/verhaal/STIJLGIDS.md:102-115`): Tammo 34, Oma 92, Mem 91;
  vijf juryleden, drie stemmen beslissen; Hoving bewaart de bal sinds 1998, Berend is
  jurylid sinds 1982; Jelle had de bal op 12 augustus, de kraak is op 17 augustus.
  Gevoelige cijfers alleen uit `docs/TESSA-CIJFERS.md`, met bron en jaar.
- **Kanalen** strikt gescheiden: radio is wereld en dimt bij een missie, telefoon
  doet briefings en hints, het gesprek de relatie, appjes zijn stil
  (`docs/verhaal/nieuw/00-OVERZICHT.md:311-321`).

## Regels voor een nieuwe missie of scène

1. **Nederlands**, met Gronings en Fries alleen met zorg en altijd met een
   Nederlandse ondertitel (`game/js/subtitles.js`, `FY`); "Grunn", nooit "de Grunn".
2. **Geen echte merken, bedrijven of personen**; verzin de parodie. Echte plaatsen
   en gebouwen mogen, en moeten kloppen (`docs/verhaal/STIJLGIDS.md:92-96`).
3. **Altijd zomer**: geen winter, sneeuw, ijs of "volgend voorjaar"; de kalender
   hierboven is leidend.
4. **Eén taak per zin in het HUD-doel**, geen tellingen of scoreboekhouding in
   dialoog (`docs/verhaal/REVIEWS-RONDE3.md:27`, `docs/verhaal/STIJLGIDS.md:77`).
5. **Een `Naamkaart:`-opdracht** waar de speler iemand voor het eerst ziet, plus de
   `card`-optie op die regel, anders verschijnt er niets.
6. **Een stem of een ondertitel**: elke uiting is `stem`, `radio`, `telefoon` of
   bewust stil (`app-stil`); zonder opname volgt de tekst met leestijd
   (`game/js/storytext.js:51`).
7. **Eén functie per missie** met een oorzaak-gevolg-beat, anders wordt het een
   zijmissie of reisbeat (`docs/verhaal/nieuw/00-OVERZICHT.md:143`).
8. **Samen spelen**: één regel per missie of scène — doet een gast mee (J of N), wat
   ziet hij (snapshot of EXTRA-bericht), wie krijgt de beloning en de eigen voortgang
   (#429), wat gebeurt er bij wegvallen of later aansluiten, en welke test het dekt.
   Een gast krijgt geen gesprekken met personages en geen verhaalstap van een ander
   (`.specs-fire/standards/multiplayer.md:75`).
9. **Bewijs**: de stap met zijn `scenes` in `game/js/storyarc_nieuw.js`, de scène in
   het `09`-script, en daarna `node scripts/build_story_data.mjs`,
   `node scripts/storydata_test.mjs`, `node scripts/story_similarity_test.mjs`,
   `node scripts/text_audit.mjs` en `node scripts/voice_coverage.mjs --quiet`.

## Tests

`scripts/storydata_test.mjs` bewaakt formaat, sprekers, de verse build en dat elke
scène op een stap staat; `scripts/story_similarity_test.mjs` de verboden zinsbouw;
`scripts/text_audit.mjs` de verboden woorden, merken en "de Grunn";
`scripts/storyflow_nieuw_test.mjs` en `scripts/storyapps_test.mjs` de volgorde en de
stille appjes; `scripts/calendar_test.mjs` de datums;
`scripts/opnamelijst.mjs --check` de openstaande opnames. Per akte:
`scripts/akte1_doelen_test.mjs`, `scripts/akte2_doelen_test.mjs`,
`scripts/akte3_test.mjs` … `scripts/akte6_test.mjs`, en de regie in
`scripts/cutscenes_akte1_test.mjs` … `scripts/cutscenes_akte4_test.mjs` en
`scripts/cutscenes_akte6_test.mjs`. De Electron-verhaaltest draait de coördinator.

## Open punten (met issue)

- **#472, #474, #475, #489 en #490 zijn op 25-10 gesloten.** `docs/personages.md`
  volgt nu de canon (Geesje, Lammert, Roelfien, Wubbo, Tinus, Hoving en Willemien
  erbij, Femke en Hilly eruit, Tessa standaard Nederlands); de kop van
  `storyarc_nieuw.js` noemt 30 missies en 5 reisbeats; `DEEL4_STEP_DAYS` en
  `VOORRONDE_STEPS` zijn weg (inclusief hun testblok); de kermis in Winschoten staat
  op één datum (22-23 augustus); de introweek heet overal Kiezelweek; en Tessa's
  stemprofiel in `scripts/tts_cast.mjs` is accent-loos. Mevrouw Hoving krijgt haar
  naamkaart via een `Naamkaart:`-regie in `09-script-akte1.md`, met een
  regressiecheck in `scripts/storydata_test.mjs`.
- **Nog open:** de Kiekdoar-aankondiging van Kiezelweek is **stil** tot hij opnieuw
  wordt ingesproken (de opname zegt nog "KEI-week"); dat staat met reden in
  `scripts/voice_stil.json` en vraagt een TTS-run met akkoord van de eigenaar.
  Tessa's bestaande clips zijn ook nog Gronings.
- **Nog open:** `docs/personages.md` gebruikt verderop nog de oude H-nummering voor
  verhaalstappen (H4, H10, H13, H16, H18); de M-mapping is niet overal eenduidig
  (`STEP_ALIAS` zegt H13 → M11, de canon noemt de kus M16).

## Afwijkingen tussen docs en code

| Waar | Wat |
|---|---|
| `docs/verhaal/nieuw/00-OVERZICHT.md:117` | T1 gaat naar Winsum; `docs/verhaal/nieuw/09-script-akte2.md:111` en `game/js/storyarc_nieuw.js:252` zeggen Warffum. |
| `docs/verhaal/nieuw/00-OVERZICHT.md:79` | "26 missies, 4 reisbeats"; de code heeft er 30 en 5 door Deel 4 (`docs/verhaal/nieuw/DEEL4.md:19-25`). |
| `docs/verhaal/nieuw/07-TTS-RAMING.md:24` | 172 scènes en 1.164 uitingen voor de vijf akten; `game/storydata/script.json` telt er 185 en 1.300. |

Opgelost op 25-10: de dubbele kermisdatum, "KEI-week" op vier plekken, Tessa's
stemprofiel, en de verouderde `built`-comment.
