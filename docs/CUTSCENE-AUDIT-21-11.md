# Cutscene-audit 21-11 (uitkomsten van de statische linter)

Dit document bevat alleen de uitkomsten van `node scripts/cutscene_lint.mjs` (laag 2 van het cutscene-kwaliteitssysteem) op de cutscenes zoals ze op 21-11 in de repo staan. De regels zelf staan in de regie-bijbel (`docs/CUTSCENE-REGIE-21-11.md`, door de Opus-agent); de kwalitatieve beoordeling staat in `docs/CUTSCENE-AUDIT-OPUS-21-11.md`. Regel-ID's hieronder zijn de voorlopige ID's van de linter (`CS-T` tekst, `CS-C` camera, `CS-V` visuele logica, `CS-R` projectiemeting); `scripts/lib/cutscene_lint.mjs` koppelt ze aan de R-nummers van de bijbel zodra `scripts/release/cutscene-regels.json` bestaat.

Wat dit **niet** is: geen oordeel over smaak of humor (de 239 komische beats zijn alleen gelabeld voor het panel), geen gerenderde controle (laag 3 draait later in Electron), geen botsingscontrole met gebouwen of terrein (daar is de wereld voor nodig). Alles is gemeten op de pure scène (`compileScene` plus bemonstering op 0,1 s) met een eigen projectie van de spreker naar het scherm.

## Uitkomst in cijfers

- **204 cutscenes** gelezen: 101 geregisseerd (opening, missies, thuisavond; elk met acteurs, cues en shots) en 103 kale scriptscènes (alleen tekst, telefoon, radio, appjes).
- Globale score **90 van 100** (blokkerend telt 25 punten, belangrijk 8, nit 1, per cutscene, daarna gemiddeld). Per akte: akte 1 score 85 (41 cutscenes, 5 blokkerend), akte 2 score 92, akte 3 score 88 (3 blokkerend), akte 4 score 88, akte 5 score 90 (3 blokkerend), akte 6 score 97.
- **11 blokkerend** in 10 cutscenes, **216 belangrijk**, **85 nit**; **113 cutscenes zijn schoon** (geen blokkerend, geen belangrijk).
- Eigenaar-besluit 21-11: **streng voor alles**. Er is geen baseline en geen ratel: de regels gelden voor alle cutscenes, ook de bestaande. Een regel die bij een bestaande cutscene bewust niet geldt, staat met een reden in `scripts/release/cutscene-uitzonderingen.json` (op 21-11 leeg). Overgang: de releasegate (static) blokkeert op `blokkerend`; `belangrijk` en `nit` tellen mee in de score. De release wordt pas groen als de faallijst leeg of uitgezonderd is (`docs/CUTSCENE-FAALLIJST-21-11.md`).

## Schendingen per regel

| Regel | Wat | Aantal | In cutscenes | Ernst |
|---|---|---|---|---|
| CS-T01 | leessnelheid boven 20 tekens per seconde | 1 | 1 | belangrijk |
| CS-T02 | beurt van meer dan 25 woorden (exposie) | 19 | 17 | belangrijk |
| CS-T03 | meer dan drie beurten van één spreker achter elkaar | 7 | 7 | belangrijk (alleen een niet-radio-spreker met zes of meer beurten is blokkerend) |
| CS-T04 | meer dan drie sprekers in één scène | 27 | 27 | belangrijk |
| CS-T08 | personage zonder aankondiging of naamkaart; radio of telefoon als introductie; twee nieuwe personages in één scène | 17 | 15 | belangrijk |
| CS-T05, T06, T07, T10 | echt merk, "de Grunn", winter, Engels, kapotte plaatshouder, onbekend personage, ontbrekende stemclip | 0 | 0 | (schoon) |
| CS-C04 | shotduur buiten de grenzen: 21 shots korter dan 0,8 s, 36 shots langer dan het maximum van hun type | 57 | 40 | belangrijk |
| CS-C05 | spreker nergens in beeld tijdens zijn regel | 1 | 1 | blokkerend |
| CS-R03 | de geprojecteerde spreker staat niet op het scherm of achter de camera | 12 | 10 | 6 blokkerend, 6 belangrijk |
| CS-R04 | ondertitel bedekt een kwart van de spreker | 4 | 4 | belangrijk |
| CS-C06 | camera springt over de as: 23 scènes met drie of meer sprongen (belangrijk), 80 losse sprongen (nit) | 103 | 85 | belangrijk en nit |
| CS-C07 | jump cut | 4 | 3 | nit |
| CS-C10 | geen shot-variatie (alleen wide) | 1 | 1 | belangrijk |
| CS-V01 | spreker staat niet in de scène | 4 | 4 | blokkerend |
| CS-V03 | positie onlogisch (figuren in elkaar, figuur 44 en 60 m weg, staand in een voertuig) | 8 | 4 | belangrijk |
| CS-V04 | gebaar tegen de tekst in (knikken bij "Nee", nee schudden bij "Natuurlijk") | 2 | 2 | belangrijk |
| CS-V05 | spreker staat met zijn rug naar de ander (meer dan 120 graden, op twee momenten in de regel) | 45 | 32 | belangrijk |
| CS-C01, C02, C03, C08 | NaN of lege camera, onder de grond, in een figuur of voertuig, scène valideert niet | 0 | 0 | (schoon) |
| CS-H01, H02 | humor: grap uitgelegd, geen ruimte na de punch (smaak, telt niet mee) | 0 | 0 | |

De regels die schoon zijn, zijn dat omdat het bestaande werk ze al afdwingt (`validateScene`, de camerakamer van 1,5 m, `text_audit`, `voice_coverage`); ze blijven in de linter staan als vangnet voor nieuwe scènes.

## Blokkerende vondsten (11)

| Cutscene | Regel | Wat |
|---|---|---|
| story-opening-keuken | CS-R03 | shot 8 (20 s): Anita praat maar staat achter de camera; shot 28 (78,6 s): Tammo idem |
| M04.outro | CS-R03 | shot 11 (48,6 s): Anita praat maar is niet in beeld |
| M05.intro | CS-R03 | shot 11 (42 s): Tammo praat maar is niet in beeld |
| M14.intro | CS-R03 | shot 11 (50,7 s): Tammo praat maar is niet in beeld |
| M14.outro | CS-R03 | shot 10 (37,2 s): Jelle Terpstra praat maar is niet in beeld |
| M06.0 | CS-C05 | Anita praat (regel 8) en is nergens in beeld |
| M15.outro | CS-V01 | Jelle Terpstra praat (regel 1) maar staat niet in de scène |
| M19.intro | CS-V01 | Douwe praat (regel 9) maar staat niet in de scène |
| M23.intro | CS-V01 | Tinus praat (regel 4) maar staat niet in de scène |
| M26.intro | CS-V01 | Jelle Terpstra praat (regel 12) maar staat niet in de scène |

Issues: #1144 (spreker niet in beeld, bug), #1145 (spreker ontbreekt in de scène, bug), #1146 (de 216 belangrijke vondsten, wens); alle drie in de mijlpaal "Verhaal: rode draad, introducties en natuurlijke dialogen" en bij WP15 regie #1138 en WP11 dialoogvorm #1134.

Twee groepen: **spreker niet in beeld** (7 vondsten in 6 cutscenes) en **spreker ontbreekt in de scène** (4 cutscenes). Beide zijn voor de speler zichtbaar als een stem zonder gezicht; de eerste groep is vaak een shot dat te lang op de luisteraar of een prop blijft, de tweede is een personage dat wel praat maar geen acteur in de regie heeft (zo hoort het alleen bij radio, telefoon of voicemail; anders hoort hij in `cast`).

## De 20 slechtste cutscenes

| # | Cutscene | Score | Blokkerend | Belangrijk | Nit |
|---|---|---|---|---|---|
| 1 | story-opening-keuken | 0 | 2 | 10 | 2 |
| 2 | M02.intro | 26 | 0 | 9 | 2 |
| 3 | M26.intro | 41 | 1 | 4 | 2 |
| 4 | M01.intro | 44 | 0 | 7 | 0 |
| 5 | M14.intro | 51 | 1 | 3 | 0 |
| 6 | M23.intro | 51 | 1 | 3 | 0 |
| 7 | M08.outro | 52 | 0 | 6 | 0 |
| 8 | M11.intro | 52 | 0 | 6 | 0 |
| 9 | M20.outro | 52 | 0 | 6 | 0 |
| 10 | M06.0 | 59 | 1 | 2 | 0 |
| 11 | M10.intro | 59 | 0 | 5 | 1 |
| 12 | M19.outro | 59 | 0 | 5 | 1 |
| 13 | M20.3 | 59 | 0 | 5 | 1 |
| 14 | M03.outro | 60 | 0 | 5 | 0 |
| 15 | M13.intro | 60 | 0 | 5 | 0 |
| 16 | M16.outro | 60 | 0 | 5 | 0 |
| 17 | M19.intro | 65 | 1 | 1 | 2 |
| 18 | M14.outro | 66 | 1 | 1 | 1 |
| 19 | M15.outro | 66 | 1 | 1 | 1 |
| 20 | M04.outro | 67 | 1 | 1 | 0 |

De opening (`story-opening-keuken`, 17 regels, tien minuten spreektijd van Rikus, Tessa en Tammo) is de slechtste: drieëndertig shots, drie keer een shot van 0,3 s, spreker achter de camera, camera 11 s zonder wissel, jump cuts en een ondertitel over Anita. Dat is de eerste indruk van de speler.

## Wat de epic-verhaal-lead moet fixen

**WP15 regie (#1138), de camera:**
1. De elf blokkerende vondsten hierboven (zes cutscenes met een spreker buiten beeld, vier met een ontbrekende acteur, één kale M06.0).
2. Shotduur (CS-C04, 57 keer in 40 cutscenes): 21 shots korter dan 0,8 s, vooral gestapelde sjablonen (`L3`, `L3+0.3`, `L3+0.6` in de keuken); 36 shots die langer dan 10 s (medium) of 14 s (wide) stilstaan. Een shot-sjabloon dat een ander shot binnen 1,2 s overschrijft hoort het eerste shot te laten vallen: de regie-engine doet dat (`game/js/cutdirector.js`, MIN_SHOT).
3. De as (CS-C06): 23 scènes springen drie keer of vaker over de lijn tussen de sprekers; de automatische dekking (`CAMS` in `cutscenes_akte1.js`) wisselt de kant per spreker (`duoSide`). Houd per paar één kant aan.
4. Kijkrichting (CS-V05, 45 keer): de spreker staat met zijn rug naar de ander omdat alleen de luisteraars naar de spreker draaien; laat de spreker ook naar zijn luisteraar draaien.
5. De ondertitel bedekt een kwart van de spreker in vier cutscenes (M01.intro, M20.3, M30.intro, keuken): kies daar een ander shot of een andere beeldverhouding.
6. Positie (CS-V03): Durk en Douwe staan in elkaar en in de trekker (M02.intro), twee figuren in elkaar (M21.intro), fietsers 44 en 60 m weg (M08.intro, verhuisdag; mogelijk bedoelde achtergrondfiguren, dan een `bg`-vlag).

**WP11 dialoogvorm (#1134), de tekst:**
1. Exposie (CS-T02, 19 beurten boven 25 woorden in 17 cutscenes): splits met een reactie; het hoogste woordental staat in M10.intro (34) en M08.outro (32).
2. Te veel sprekers (CS-T04, 27 scènes boven drie): M03.2 en M14.outro en M15.outro hebben er vijf.
3. Introducties (CS-T08, 17 vondsten): Berend Bos (M01.intro, 76 regels in het verhaal), Durk en Douwe (M02.intro: twee nieuwe personages tegelijk), Dokter Dijkstra, Henk, Sjabbe, Duivenmelker Bert, Tinus en anderen praten zonder aankondiging of naamkaart; Rikus en de Torenwachter worden voor het eerst via radio of telefoon gehoord, wat het introductieprotocol uitsluit.
4. Beurten achter elkaar (CS-T03, 7 scènes): de jury in M26.10 tot M26.12 en Rikus in R5.2 en E2 houden vier tot vijftien beurten achter elkaar vol.
5. Gebaren tegen de tekst (CS-V04): M12.intro (nee schudden bij "Natuurlijk hang ík.") en M24.3 (knikken bij "Nee. Gewoon."); de eerste kan bedoeld zijn.

## Beperkingen en vermoedelijke vals-positieven

- De bemonstering gebruikt een vast anker; botsingen met gebouwen en terrein ontbreken (laag 3).
- CS-V03 en CS-R03 kijken naar acteurs en shots in de regie; een bewust achtergrondfiguur zonder `bg`-vlag of een bewust off-screen shot zonder `offscreen`-veld wordt gemeld.
- CS-C06 meet de kant van de camera op het begin van een shot; een camera die tijdens een shot de as kruist, wordt niet gezien.
- De tekstregels zijn structureel. Ze zeggen niets over of een uitleg overtuigt of een grap werkt; dat doen de reviewers van laag 4.

## Zo draai je het opnieuw

```
node scripts/cutscene_lint.mjs                       # volledig rapport, top 20
node scripts/cutscene_lint.mjs --only=M01.intro      # één cutscene met alle vondsten
node scripts/cutscene_lint.mjs --strict --quiet     # de releasegate (static): exit 1 bij een blokkerende vondst zonder uitzondering
node scripts/cutscene_lint.mjs --lijst=docs/CUTSCENE-FAALLIJST-21-11.md   # de faallijst voor de verhaal-lead opnieuw maken
```

## Stand na de camera- en regieronde (#1146)

Gemeten met `node scripts/cutscene_lint.mjs` op 21-11 na de ronde (alles pure data, niets in beeld bekeken). De blokkerende vondsten waren al weg (`--strict` geeft 0); deze ronde ging over de belangrijke.

| | Voor | Na |
|---|---|---|
| belangrijk | 208 | 114 (+ 10 uitgezonderd met reden) |
| nit | 89 | 83 |
| blokkerend | 0 | 0 |
| globale score | 93 | 96 |
| cutscenes zonder belangrijke of blokkerende vondst | 153 | 179 |

Per regel (belangrijk, voor naar na):

| Regel | Voor | Na | Hoe |
|---|---|---|---|
| CS-C04 shotduur | 50 | 0 | `splitLongShots` in `missionScene` (`cutscenes_akte1.js`): een shot staat nooit langer dan 7,2 s, een lange beurt krijgt een tweede hoek die op een andere plek staat dan de shots ervoor en erna; een eerste shot start niet voor 0,9 s; het slotbeeld komt minstens een seconde na het shot ervoor. De gestapelde sjablonen in de keuken (`L3`, `L3+0.3`, `L3+0.6`, `L10+0.3`, `L10+0.6`) zijn teruggebracht tot één shot per beurt of reactie; M01.intro had een sjabloon met `dt: 0.8` direct na een automatisch shot. |
| CS-C10 geen variatie | 1 | 0 | M21.intro: een inzetshot op de bakkie (de stemmen zitten verborgen in de cabine). |
| CS-R03 spreker niet op het scherm | 8 | 0 | Slotbeeld kijkt naar het midden van het eerste personage en de laatste spreker (`wendLook`, in M10.intro een eigen `endLook`); reactieshots (keuken, M26.5) en het voice-overshot van de verhuisdag hebben het veld `offscreen`; M18.3 snijdt niet meer 0,2 s te laat naar Anita. |
| CS-R04 ondertitel over de spreker | 1 | 0 | Keuken: de orbit van L8 kijkt iets hoger (`@1.0`). |
| CS-V03 positie | 8 | 0 | De linter telt een verborgen inzittende (`road` of vanaf de eerste seconde `hide`) niet meer als figuur in de scène: Durk en Douwe in de trekker (M02.intro), Tessa en Berend in de bakkie (M21.intro), de passanten op 44 en 60 m. |
| CS-V04 gebaar tegen de tekst | 3 | 0 | Schudden en knikken zijn schouderophalen geworden (M12.intro, M17.outro, M24.3). |
| CS-T08 introductie | 18 | 0 | Rikus is bekend in de linter (de radiostem die het verhaal opent); Berend, Durk en Douwe, Veldkamp, Klaas en Tinus staan met een naamkaart in de regie van hun eerste scène (`docs/verhaal/nieuw/09-script-akte*.md`, `script.json` opnieuw gebouwd); tien stemmen en rolfiguren staan met een reden in `scripts/release/cutscene-uitzonderingen.json`. |
| CS-V05 kijkrichting | 51 | 43 | De spreker draait zich naar wie hij antwoordt (de laatste andere spreker, anders de volgende). De rest is een luisteraar of omstander die dichterbij staat dan de gesprekspartner; daar helpt alleen eigen regie per scène. |
| CS-C06 as (belangrijk, scènes met drie of meer sprongen) | 23 | 29 | Niet opgelost. Een vaste kant voor de automatische dekking gaf bijna geen verschil (de sprongen komen van sjablonen en handgemaakte shots); het aantal steeg waarschijnlijk doordat er extra shots zijn bijgekomen. Per scène te regisseren. |
| CS-T02, T03, T04 (tekst) | 4, 7, 30 | 4, 7, 30 | Niet aangeraakt: ze vragen een tekstwijziging (splitsen, een spreker schrappen, korter) en dus het paneel van drie reviewers en nieuwe opnames op `scripts/voice_wacht.json`. Er is in deze ronde geen gesproken regel gewijzigd, dus er staat niets nieuws op de wachtlijst. |
| CS-T01 leessnelheid | 1 | 1 | M06.intro regel 3 ("En daarna brengen we hem terug."): de opname is 1,27 s lang voor 31 tekens (20,4 tekens per seconde); alleen een nieuwe opname lost dat op. |

Nog niet gedaan en niet bekeken: geen van de nieuwe shots is in beeld gezien (Electron draaide niet); de tweede hoeken, het inzetshot in M21.intro en de draaiende sprekers zijn alleen op de cijfers van de linter en de scenetests (`cutscenes_*_test`, `cutscene_lint_test`) beoordeeld. Hertest in beeld is nodig (label `hertest`).

## Tweede ronde (21-11, #1146): van 114 naar 48 belangrijke vondsten

Gemeten met `node scripts/cutscene_lint.mjs`: 0 blokkerend (`--strict` blijft 0), 48 belangrijk (was 114), 65 nit (was 83), 18 uitgezonderd met reden (was 10), globale score 98 (was 96). Geen gesproken regel is gewijzigd, dus er staat niets nieuws op `scripts/voice_wacht.json`.

| Regel | Voor | Na | Hoe |
|---|---|---|---|
| CS-V05 kijkrichting | 43 | 0 | Twee fouten zaten in de meting, de rest in de regie. De linter nam elke figuur met een naam (ook een figurant zonder regel) als gesprekspartner en mat tegen de dichtstbijzijnde; hij meet nu tegen wie de spreker echt aanspreekt (de laatste andere spreker vóór de regel en de eerstvolgende erna; kijkt hij naar een van de twee, dan is het goed) en een figurant praat niet mee. In de regie draaide een beat naar een rekwisiet of een figurant aan het begin van een regel, terwijl de spreker nog tegen zijn gesprekspartner praatte: die draai komt nu aan het eind van de regel (M01.intro, M01.3, M02.intro, M04.intro, M06.intro, M08.outro, M25.3). Wie wegloopt tijdens zijn regel draait daarna weer naar de ander (M02.intro, M01.intro, M18.2, M26.intro); Berend in M26.6 praat tegen Anita en niet tegen de radiostem. |
| CS-C06 as (belangrijk) | 29 | 14 | De automatische dekking (`missionScene`) houdt één kant aan (`duoSide`, voorheen per spreker een andere), de orbit van een duospreker blijft vóór het duo en die van een figurant tussen figurant en duo, en een shot zonder spreker staat vóór het duo in plaats van erachter. De 14 die blijven komen van sjablonen, handgemaakte shots en paren die tijdens de scène van plaats wisselen (onder meer de keuken, M01.intro, M16.outro, M15.outro). |
| CS-T04 te veel sprekers | 30 | 22 | Acht groepsscènes (zes tot elf sprekers: M15.outro, M20.3, M20.outro, M23.intro, M25.outro, M26.13, M26.intro, M30.intro) staan met een reden in `scripts/release/cutscene-uitzonderingen.json`; de reden is een voorstel van de agent en nog niet door verhaal-lead of eigenaar bekeken. De andere 22 vragen een tekstwijziging. |
| CS-T01, T02, T03 | 1, 4, 7 | 1, 4, 7 | Niet aangeraakt: tekst (en voor T01 een nieuwe opname). |

Nog open: CS-C06 (14), CS-T04 (22), CS-T03 (7), CS-T02 (4), CS-T01 (1). Geen van de verplaatste camera's en beats is in beeld bekeken (Electron draaide niet); de nieuwe vaste kant van de dekking kan hier en daar een shot opleveren dat te dicht op een ander staat (CS-C07 steeg van 5 naar 6 nits). Hertest in beeld is nodig (label `hertest`).
