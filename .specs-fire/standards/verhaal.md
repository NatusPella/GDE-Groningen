# Spec: Verhaal, personages en stem

> **Terminologie (#716):** in speltekst zijn de 66 punten uit `stad.json` **buurten** (kaartje "Nieuwe buurt"); de CBS-lagen uit `grenzen.json` zijn **gebieden/wijken** (Veroverd, intocht, titels). Zie `docs/GEBIEDEN.md` en `ui-taal.md`.

**Echte openbare gebouwen (#698).** Het UMCG (een openbaar ziekenhuis) en de woontoren "House of Groningen" blijven als echte, openbare plek in de tekst: ze zijn decor, geen merk of bedrijf, en er wordt niets verkocht of aanbevolen. Ze staan niet op de verboden lijst van `text_audit`; in `MERKENREGISTER.md` staan ze als "echte openbare plaats/gebouw — toegestaan (constitutie 2)". Een nieuwe echte instelling of bedrijfsnaam komt er niet zomaar bij: die gaat eerst langs de eigenaar en `MERKENREGISTER.md`.
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

De data: 298 scènes, 2.317 regels in act 1 tot en met 6; 57 zijn stille appjes en 261 hebben geen opname (de 37 appjes zijn bewust stil; 4 regels wachten sinds de verhaalcanon van 21-11 op een nieuwe opname, zie docs/VERHAALCANON-21-11.md; de
1.390 andere gesproken regels hebben een opname, stand 21-11). Een regel zonder opname toont
het spel als ondertitel met leestijd (`game/js/storytext.js:53`). Een `[BEHOUDEN]`-regel heeft een opname: één andere
letter maakt hem stil. Nieuwe opnames komen er in rondes bij op Flash-Lite (ADR 0019,
#462); wat nog geen opname heeft blijft ondertitel (`docs/verhaal/nieuw/07-TTS-RAMING.md:3`).

## Structuur

- **Vijf akten** (`PARTS`, `game/js/storyarc_nieuw.js:154-222`): 1 Moi, Grunn (Stad,
  vr 14 aug), 2 Het Noorden is groot, 3 Aan de Eems, 4 Zuidwaarts, 5 Ontzet (vr 28
  aug), met **Deel 4: Nazomer** erna (`:209`), dat pas opent als de eindkaart van
  akte 5 is gespeeld (`game/js/story.js:182`).
- **Stappen**: opening M00, 26 missies M01-M26, vier reisbeats T1-T4, twee stille
  tussenstappen A1-A2 (bietenoogst en kermisrit, #845) en epiloog E;
  Deel 4 voegt M27-M30 en T5 toe: samen 30 missies en vijf reisbeats
  (`game/js/storyarc_nieuw.js:224-358`). Elke missie heeft één functie: inschrijven,
  een plakje blokkeren, de waarheid over de bal, of de wagen en het recept
  (`docs/verhaal/nieuw/00-OVERZICHT.md:142`).
- **Kalender** (`game/js/calendar.js`): dag 1 is vrijdag 14 augustus 2026, het
  Gronings Ontzet dag 15 (vr 28 aug), de epiloog dag 29 (vr 11 sep, `:16-18`); Deel 4
  loopt van 14 tot 19 september (`:93`). De nazomer loopt tot 22 september en daarna
  blijft het zomer (`LAST_SUMMER_DAY` 40, `:15`): geen winter, sneeuw of ijs.

## Personages

Vaste cast, stem uit `scripts/tts_cast.mjs` en `scripts/tts_lines_list.mjs`
(bijrollen: `docs/personages.md`; per personage een volledige castingkaart in `game/js/characterdossiers*.js`, zie `docs/PERSONAGES-DOSSIERS-21-11.md`):

| Wie | Rol | Stem en taal |
|---|---|---|
| Tammo | held, Stadjer | Orus, Gronings, droog en kort |
| Tessa (intern `anita`) | heldin, de snackwagen | Callirrhoe; **standaard Nederlands** (#134) |
| Rikus | nacht-dj Nachtstreek | Schedar, warm en droog |
| Jelle Terpstra | tegenstander, Us Mem Snacks | Fenrir, Nederlands met Friese woorden |
| Mem (Gerda) Terpstra | Jelles oma, 91, werd tweede in 1953; Jelle en Tessa noemen haar Mem. Jelles moeder blijft onbenoemd en zonder stem (O6, J5) | Gacrux, Nederlands met Friese woorden |
| Oma Trijntje | mentor, won in 1953 | Sulafat, Gronings, stellig |
| Berend Bos | Bommen Berend, jurylid | Charon, nors |
| Durk en Douwe | Jelles tweeling | Algieba en Algenib, traag |
| Femke | keeper van Tessa's dorpsteam en vriendin van Tessa; belt Rikus (R4.0b), dubbele date met Rikus (J4), appjes (A4.2) | stem in J4 |
| Sjabbe, Klaas, Bert, Dijkstra, Sjoerd, Henk, Jelmer, Geert, de torenwachter | bijrollen | zie `docs/personages.md` |

Geesje, Lammert, Roelfien, Wubbo, Tinus, mevrouw Hoving en Willemien zijn nieuw en
hadden geen stem; Geesje, Rotor Roelf en de tien Tessa-regels zijn op 20-11 ingesproken. Wat buiten `script.json` nog geen stem heeft staat in `docs/verhaal/TTS-ACHTERSTAND-21-11.md`. **Geschrapt** zijn
Harm, Hilly, Hilje, Boer Roelf en Femke als eierbezorger van H7 (`docs/verhaal/nieuw/00-OVERZICHT.md:71`;
`game/js/storyarc_nieuw.js:107-108`); Rotor Roelf blijft alleen een stem. Femke zelf
blijft als keeper en vriendin van Tessa in akte 4 (besluit coördinator 23-11).

- **Tessa spreekt standaard Nederlands** (#134), ook in de opname: geen Gronings
  accent of dialectspelling; een Gronings woord is een grap over haar
  (`docs/verhaal/STIJLGIDS.md:42-49`).
- **Naamkaart** bij de eerste ontmoeting: de kaart staat in `CHARACTERS` (`card` en
  `step`, `game/js/storyarc_nieuw.js:125-154`) en verschijnt alleen als een regel hem
  meegeeft met `card: '<key>'` (`game/js/missionstory.js:1119`,
  `game/js/storycontact.js:321`). De `Naamkaart:`-opdracht in het script is de regie,
  geen trigger (#475).
- **Verzonnen namen zijn verplicht**: Kiezelweek, Plantsoenfestijn, Us Mem Snacks,
  Delfstof Noord, Wiebelwerk, EIKEA, Pand & Poen, Oldenhuis Bakt, Kiekdoar. Echte
  straten, plekken en gebouwen mogen als decor (`docs/personages.md:7`).
- **Feitenblad** (`docs/verhaal/STIJLGIDS.md:102-115`): Tammo 24 (net afgestudeerd, zie docs/VERHAALCANON-21-11.md), Oma 92, Mem 91;
  vijf juryleden, drie stemmen beslissen; Hoving bewaart de bal sinds 1998, Berend is
  jurylid sinds 1982; Jelle had de bal op 12 augustus, de kraak is op 17 augustus.
  Gevoelige cijfers alleen uit `docs/TESSA-CIJFERS.md`, met bron en jaar.
- **Kanalen** strikt gescheiden: radio is wereld en dimt bij een missie, telefoon
  doet briefings en hints, het gesprek de relatie, appjes zijn stil
  (`docs/verhaal/nieuw/00-OVERZICHT.md:310-321`).

**De boer: hoeve Zeldenrust (#1373, 28-11).** Aanleiding van de boerenloopbaan is het bezoek aan een boerderij: scène `N5` (hoeve Zeldenrust bij Warffum; Oom Hindrik de Jong gaat naar Huize Waddenzicht, hij overlijdt niet; Tante Aaltje komt in beeld) en daarna `N5.2` (de akte bij de notaris: de hoeve wordt een schenking aan Tammo en Tessa, Ypie Boekema wordt ingeleid). `boerstoryrun.js` speelt `N5.2` op een rustig moment en roept dan `schenkHoeveCompleet` aan; de vlag `boer:bezoek` staat zodra N5 achter de rug is, `boer:schenking` volgt na de akte (beide door `boerstoryrun.js`). Tijdens een sessie of voor een meespeler schrijft het de hoeve stil bij. Per rang van Landbouw is er een kort rangmoment (`farmrankscenes.js`) met Ypie, Lutje de melkrijder, mevrouw Hofstra van de coöperatie en Jorrit Tilma; elke naam wordt eerst ingeleid. Er zijn twaalf koeien, geen veertig (de weide is vijf hectare).

## Regels voor een nieuwe missie of scène

1. **Nederlands**, met Gronings en Fries alleen met zorg en altijd met een
   Nederlandse ondertitel (`game/js/subtitles.js`, `FY`); "Grunn", nooit "de Grunn"; Stad = de stad Groningen, Ommeland = de rest, Grunn = het geheel (docs/TAALREGEL-STAD-OMMELAND-22-11.md).
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
   (`game/js/storytext.js:53`).
7. **Eén functie per missie** met een oorzaak-gevolg-beat, anders wordt het een
   zijmissie of reisbeat (`docs/verhaal/nieuw/00-OVERZICHT.md:142`).
8. **Samen spelen en film**: elke scène met een scènebeschrijving (`playScript`) gaat als data naar de gasten en speelt een gast lokaal na; alle andere momenten (`playCinematic`: wijkflyover, landmerk, crash, wanted5, missie-intro's, intocht, thuiskomst, dood, aftiteling) zijn **host-only** en hebben minstens één regel voor de gastkaart (#712, `COOP-GAST.md`). Eén regel per missie of scène — doet een gast mee (J of N), wat
   ziet hij (snapshot of EXTRA-bericht), wie krijgt de beloning en de eigen voortgang
   (#429), wat gebeurt er bij wegvallen of later aansluiten, en welke test het dekt.
   Een gast krijgt geen gesprekken met personages en geen verhaalstap van een ander
   (sectie "Wat een gast wel en niet kan" in `.specs-fire/standards/multiplayer.md`).
9. **Bewijs**: de stap met zijn `scenes` in `game/js/storyarc_nieuw.js`, de scène in
   het `09`-script, en daarna `node scripts/build_story_data.mjs`,
   `node scripts/storydata_test.mjs`, `node scripts/story_similarity_test.mjs`,
   `node scripts/text_audit.mjs` en `node scripts/voice_coverage.mjs --quiet`.
10. **Een plek is een verhaalfeit.** Een missie of scène noemt de plek die het verhaal
    nodig heeft (de kotter, het woonschip, de boshut) en wat daar gebeurt, niet wat het
    systeem ermee doet. Rusten, opslaan, de prijs en de sleutel zijn de mechanic
    (`docs/GEBIEDEN.md`, `game/js/safehuizen.js`); valt de plek samen met een safehouse,
    dan is dat dezelfde deur (ADR 0021).

## Tests

`scripts/characterdossiers_test.mjs` bewaakt de personagedossiers (velden, wederzijdse relaties, leeftijden, stemmen, scenes);
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

## Cutscenes en assets (eigenaar, 23-11)

Een cutscene gebruikt **alleen de echte assets en systemen van het spel**, nooit eigen aankleding:

- **Mensen:** alleen het personage-/kledingsysteem van de wereld (`buildPersonMesh`, dezelfde kleding, kapsels en animaties); geen eigen mannetjes.
- **Dieren:** alleen de modellen van het dierenregister (`dierenregister.js`, `PROP_SOURCES` in `cutscenemodels.js`).
- **Voertuigen:** alleen de echte voertuigmodellen (`PROP_SOURCES`: escort, van, tractor, police, bike, foodtruck, truck, trekkerlimo).
- **Voorwerpen, meubels, gebouwen:** alleen de gedeelde bibliotheken: losse voorwerpen in `storyprops.js` (`DECOR_MAKERS`, het ene register), kamers in `realsets.js` en de interieurbibliotheek (`interiorfill.js`).
- **Een nieuw voorwerp mag**, maar alleen in dat register, op het detailniveau van de beste wereldmodellen, met de checklist `PROP_NORM` (`cutscenemodels.js`) en het budget van `DECOR_BUDGET`. Geen losse `BoxGeometry`, `CylinderGeometry` of `SphereGeometry` in scène- of montagecode.
- **Bewaking:** `scripts/cutscene_assets_audit.mjs` (met `scripts/cutscene_assets_audit_test.mjs`) faalt als een propsoort niet in een register staat, als een bouwer in het register ontbreekt of als scènecode meer losse primitieven bouwt dan de baseline (de bestaande schuld, alleen te verlagen). `scripts/verhaal_props_audit.mjs` meet de budgetten. De stand en de schuld staan in [docs/CUTSCENE-ISSUES-23-11.md](../../docs/CUTSCENE-ISSUES-23-11.md).
- **Plaatsing op een voertuig of boot:** figuren staan alleen waar ze passen. Op de rondvaartboot praat het paar op de bank onder het glazen dak (staand zou het hoofd door het dak steken); een romp te smal om op te staan (kano, kajak, SUP, roeiboot) zet ze op hun eigen zitplaatsen; `boatdeck.js` en `scripts/boatdeck_test.mjs` bewaken dat, `scripts/cutscene_regie_audit.mjs` de rest (niemand loopt door of staat in een voertuig).

## Regie: contactvellen, licht en camerablik (24-11, #1322-#1325)

- **Bekijken zonder spel:** `scripts/cutscene_contactvel.mjs` maakt per cutscene een contactvel (keyframe per shot, spreker, ondertitel,
  camera, licht, lintvondsten) in één webpagina; altijd een schets door de echte camera, met een vrij Electron-slot ook het echte beeld.
  Test: `scripts/cutscene_contactvel_test.mjs`.
- **Licht is data:** `light` op een shot of een scène, in een missiespec ook `lights: [{ on, light }]` (`game/js/shotlight.js`, presets en
  key/fill/rim); zonder licht het wereldlicht. Test: `scripts/shotlight_test.mjs`.
- **Camera- en blikregels:** de cutscene-lint toetst ook afgekapt hoofd, camera in of achter geometrie, spreker van achteren, te snelle
  snedes, ondertitel te kort in beeld en lopen door objecten; de telling staat in `scripts/release/cutscene-regie-baseline.json` en mag
  alleen dalen. Test: `scripts/cutscene_regieregels_test.mjs`.
- **Dekking:** `coverage: 'ots'` of `'front'` in een missiespec (opt-in); een `close`/`reaction`-shot staat vóór het gezicht.
  De regieronde staat in [docs/REGIE-RONDE-24-11.md](../../docs/REGIE-RONDE-24-11.md).

## Open punten (met issue)

- **#472, #474, #475, #489 en #490 zijn op 25-10 gesloten.** `docs/personages.md`
  volgt nu de canon (Geesje, Lammert, Roelfien, Wubbo, Tinus, Hoving en Willemien
  erbij, Hilly eruit, Femke als keeper (besluit 23-11), Tessa standaard Nederlands); de kop van
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
  verhaalstappen (H4, H10, H13, H16, H18). De vertaling is één tabel: `STEP_ALIAS`
  (`game/js/storyarc_nieuw.js:118-122`) zegt H4 → M04, H10 → M24, H13 → M11, H16 → M21
  en H18 → M26. De kus is M16 (`docs/verhaal/nieuw/09-script-akte3.md:201`; canon
  `docs/verhaal/nieuw/03-akte3.md:141` noemt hem "was H11"), dus `docs/personages.md:275`
  zet de kus ten onrechte op H13; volgens de tabel hoort H13 bij M11, de kustmissie.

## De verhaal-epic van 21-11 (#1121)

De kern (eigenaar, 21-11): twee net afgestudeerde vrienden zoeken een plekje in de wereld en zijn bang elkaar kwijt te raken; de snackwagen is een verhaaltwist (rond akte 4 en 5) en het eind een open wereld; Jelle is de gelaagde tegenstander (eikel tot de verzoening aan het eind). Uitgewerkt in [docs/verhaal/RUGGENGRAAT.md](../../docs/verhaal/RUGGENGRAAT.md), [docs/VERHAAL-RELATIE-21-11.md](../../docs/VERHAAL-RELATIE-21-11.md) en het gegenereerde [filmscript](../../docs/verhaal/FILMSCRIPT-21-11.md). Wat de bouw toevoegt, met zijn test:

- **Overgangsscènes** (`BRIDGES` in `storyarc_nieuw.js`, `storybridge.js`, `storybridgerun.js`; `storybridge_test`): twaalf korte scènes tussen missies, nooit twee na opeenvolgende missies, overslaanbaar, lokaal, zonder voortgang.
- **Ontgrendelpoort** (`unlockgate.js`; `unlockgate_test`): werelden per akte, een nieuw spel begint dicht, een oude save houdt alles; Bezit en voetbal registreren met `registerGateWorld`. Ook de bijbaantjes in de wereld volgen hem (`sidejobgate.js`; `sidejobgate_test`): een dichte bijbaan heeft een gedimd startpunt en kaarticoon en bij E de zin van het personage.
- **Mijlpalen en romantiek** (`storymilestones.js`, `storyromance.js`): stille vlaggen `wagen:*` en `romantiek:*`, alleen toevoegen; een keuze verandert nooit het verloop of het einde.
- **Humorkeuze** (`game/storydata/humor*.json`, `humor_panel_prepare.mjs`, `humor_doc.mjs`; `humor_test`): elke nieuwe komische beat heeft drie varianten en een neutrale terugval; een paneel van drie onafhankelijke beoordelaars kiest; de eigenaar heeft een veto-lijst ([HUMOR-KEUZELIJST.md](../../docs/verhaal/HUMOR-KEUZELIJST.md)).
- **Dialoogvorm** (`dialogueform.js`; `dialoogvorm_test`): `{ov}`, `{cut}`, `{pause}` per regel; zonder tag verandert niets.
- **Toetsen op de tekst** (`dialogue_rhythm_test`, `introduction_test`, `story_spine_test`): ritme, introducties en de ruggengraat; de allowlists worden alleen korter.
- **Reputatie, thuis en carrière-tour** (`reputation.js`, `homebase.js`, `careertour.js`): zuivere modellen met tests; de koppeling aan de wereld staat in [docs/VERHAAL-VERIFICATIE-21-11.md](../../docs/VERHAAL-VERIFICATIE-21-11.md).
- **Beppe** (`beppe_boog.js`, `beppe_visit_rules.js`, `beppe_binnen.js`; `beppe_boog_test`, `beppe_visit_test`): haar huis is open na M01, ze overlijdt na M06 en de herinnering blijft; afgeleid uit de verhaalstand, geen migratie, binnen met een vaste kamercamera. Zie docs/BEPPE-HUIS-21-11.md.
- **Samen spelen:** iedereen is lokaal de hoofdpersoon die de stap nodig heeft en ziet de ander als partner-NPC; alles hierboven is per speler lokaal of scènetekst (zie docs/COOP-GAST.md).

## Afwijkingen tussen docs en code

| Waar | Wat |
|---|---|
| `docs/verhaal/nieuw/00-OVERZICHT.md:118` | T1 heet daar "Station Groningen → Winsum", met een losse rit naar Warffum erna (`:119`); `docs/verhaal/nieuw/09-script-akte2.md:225` en `game/js/storyarc_nieuw.js:257` zeggen allebei dat T1 naar Warffum gaat. |
| `docs/verhaal/nieuw/00-OVERZICHT.md:80` | De totaalrij zegt nog "26 missies, 4 reisbeats" (het plan van vóór Deel 4, `:82`); de code heeft er 30 en 5 door Deel 4 (`docs/verhaal/nieuw/DEEL4.md:21-25`). |
| `docs/verhaal/nieuw/07-TTS-RAMING.md:24` | 172 scènes en 1.164 uitingen voor de vijf akten; `game/storydata/script.json` telt er 298 en 2317 |

Opgelost op 25-10: de dubbele kermisdatum, "KEI-week" op vier plekken, Tessa's
stemprofiel, en de verouderde `built`-comment.
