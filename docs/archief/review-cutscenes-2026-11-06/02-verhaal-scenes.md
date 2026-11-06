# 02 · Verhaal- en missiescènes: inhoud en regiedekking

**Reviewer:** GDE-review, inhoud/regie · **Stand:** `main` @ `64ef33bb` (cutscene-code gelijk aan `e5e8b712`) · **Datum:** 6 november 2026
**Methode:** gerichte lezing van `missionstory.js`, de vijf `cutscenes_akte*.js`, `story.js`, `storyarc_nieuw.js`, de scripts en `BALANS-TEMPO.md`/`verhaal.md`. Niet gespeeld/gerenderd; geen testsuite. Durées: leestijd uit `script.json`.

## 1. Inventaris

| Akte | Missies | Intro-specs | Outro-specs | Missiescènes | Bijzonderheden |
|---|---:|---:|---:|---:|---|
| 1 · Moi, Grunn (M01-M06) | 6 | 6 | 5 | 31 | M06 geen outro-spec |
| 2 · Het Noorden is groot (M07-M11) | 5 | 5 | 4 | 27 | M10 geen outro-spec |
| 3 · Aan de Eems (M12-M16) | 5 | 5 | 5 | 24 | M16-outro bundelt vier scènes |
| 4 · Zuidwaarts (M17-M21) | 5 | 5 | 4 | 27 | M21 geen outro-spec |
| 5 · Ontzet (M22-M26, E) | 5 | 5 | 3 | 38 (+ E1/E2) | M22 en M24 geen outro-spec |
| 6 · Nazomer (M27-M30, T5) | 4 | 4 | 4 | 19 (+ T5.1-T5.3) | Deel 4, na de finale |
| **Totaal** | **30** | **30** | **25** | **166** | 5 missies zonder outro |

- **169/207/89:** 169 = 166 missiescènes + C00.1-C00.3; 207 inclusief 38 radio-, banter-, app-, reis-, epiloog- en zijscènes; 89 specs = 30 intro + 25 outro + 34 in-missie/variant/slice. Tekstduur: 97,6 min (207 scènes), 79,4 min missiescènes. Zonder spec: fallback `play()` (`missionstory.js:1160-1185`).

### 1.1 Vijf missies zonder outro: bewust of gat?

- **M06 — bewust, zwak.** M06.3 stage + radio/escape-talk; `story.outro: null`, alleen de pass-banner (`missionstory.js:1355`).
- **M10 — bewust, zwak.** M10.3 is een handgemaakte fierljep-scène; M10.4 is optionele banter.
- **M21 — gat.** Tessa's deel eindigt met M21.3/M21.6; Tammo's deel is een lege `scene` met `lines: []` en een keuzepaneel (`missions_akte4.js:270`). M21.4 (59 s) staat in `script.json` en `STEPS.scenes`, maar wordt nergens gespeeld; de keuzepuzzel is bewust (`08-IMPLEMENTATIE.md:53`), de dode scène niet.
- **M22 — bewust.** M22.4 (66 s, de schuur, de knuffel) is een in-missie-stage (`cutscenes_akte4.js:437`), niet als "outro" gekeyd.
- **M24 — bewust.** M24.3 (de vlag valt) is een in-missie-stage (`cutscenes_akte4.js:776`).

### 1.2 De vier "lange scènes zonder eigen regie"

M03.4, M08.3, M20.5 en M30.1 zijn geen gaten: ze worden gedekt door `M03.outro` (`cutscenes_akte1.js:280`), `M08.outro` (`cutscenes_akte2.js:115`), `M20.outro` (`cutscenes_akte4.js:137`) en `M30.intro` (`cutscenes_akte6.js:140`). Het probleem is lengte (85, 85, 80 en 76 s), net als M01.intro (105 s), M16.outro (96 s) en M26.intro (77 s).

## 2. Waar missen cutscenes

1. **M00/C00.1: trailerbeelden ontbreken.** De regie vraagt zon op d'Olle Grieze, een werkboot die een fiets uit de Diepenring vist, een meeuw met frikandel, naamkaarten TESSA/TAMMO en de titelkaart "GDE, GRONINGEN, Zomer vol misdaad" (`09-script-akte1.md:6-10`). `ACT_TRAILER` bevat alleen fietsers, een postbode, een meeuw en de Escapade (`cutscenes.js:39-76`); `openingActs` geeft alleen regels door (`cutscenes.js:251-259`).
2. **M16.6: de dijk komt niet in beeld.** Eén `M16.outro`-spec met de kermis/botsauto's als set (`cutscenes_akte3.js:193-227`) volgt alle vier de scènes, maar M16.6 is de dijk bij Blauwestad bij zonsondergang (`09-script-akte3.md:239`). Plek, water en dagdeel gaan verloren.
3. **M21.4: dode scène, geen Tammo-afloop.** "Tammo, de vrienden" (59 s, Tinus' schuur) staat in script en docs (`09-script-akte4.md:317`), maar `M21.4` wordt niet gebruikt; de Tammo-stage is leeg en de afloop is een keuzepaneel.
4. **M20.5 en M21.3 missen de klomp en de Escapade.** De regie vraagt een klomp met briefje (`09-script-akte4.md:244`) en "de Escapade staat veilig op de weg. Er ligt weer een klomp op de bijrijdersstoel" (`09-script-akte4.md:298`). Beide specs hebben `props: {}` (`cutscenes_akte4.js:143,396`).
5. **M11.5/M11.6: zandplaat en sterren zonder eigen regie.** De 58 s nachtscène (Melkweg, "de lange blik", `09-script-akte2.md:260,271`) heeft geen `S['M11.5']`/`S['M11.6']` en draait op de generieke `deckCam`-drift langs de scheepshuid (`missions.js:3346`). M11.3 (chocoladebal) heeft hetzelfde probleem, maar is korter en heeft een handmatige prop.
6. **M18.3: de logboek-onthulling is een tekstblok tijdens een sluipmissie.** 54 s en 12 regels, als `talk` met `delay: 1` (`missions_akte4.js:136`, `09-script-akte4.md:82`). De centrale clue ("Jelle had de bal vijf dagen vóór ons") leest als een app/telefoon- of na-de-missie-scène.
7. **Naamkaarten.** Oma's `Naamkaart` staat in M08.1 (telefoon) in plaats van M08.3 (haar kamer); `storyLines` hangt hem daardoor aan de telefoonregel (`storytext.js:75-113`). Durk & Douwe hebben nergens een kaart: in M02 zitten ze verborgen (`cutscenes_akte1.js:159-160,172`), hun eerste zichtbare optreden is M10.1. De Tessa/Tammo-kaarten uit C00.1 worden niet aangestuurd.

## 3. Waar is te veel

| Scène | Duur* | Type | Oordeel |
|---|---:|---|---|
| M01.1+M01.2 (M01.intro) | 105 s | 23 regels | **Te lang.** De speler heeft nog niet gereden; de complimentenladder en de klus worden hier uitgelegd. `BALANS-TEMPO.md:30` noemt dit al de langste. |
| M16.outro (M16.3-6) | 96 s | vier scènes, twee locaties | **Te lang én te veel.** Splitsen; M16.6 hoort op de dijk. |
| M03.4 (M03.outro) | 85 s | 17 regels | **Te lang na de wachtrijpuzzel.** De Bert-telefoon kan een aparte beat of app zijn. |
| M08.3 (M08.outro) | 85 s | 21 regels | **Te veel exposition in één kamer.** Het lijstje van vijf vrienden kan deels naar een kaart/telefoon. |
| M26.intro (M26.1+2) | 77 s | 14 regels | **Lang:** juryregels en logboek vlak voor de wedstrijd. Deel naar telefoon of jurytafel. |

\* Leestijd uit `script.json`. `BALANS-TEMPO.md:243-253` telt alleen M01.intro en M16.outro boven 90 s.

- **E2 (96 s)** is terecht radio; **C00.2 (107 s)** is lang maar volledig gestaged.

## 4. Logica en continuïteit

1. **Opening: één plek voor drie locaties.** `playOpening` gebruikt de spelerpositie als `spot` (`story.js:511`) en zet alle acts daar neer; alleen de keuken gaat naar `KITCHEN_Z = 345` (`story.js:492,520`). De docs plaatsen C00.1 op de Grote Markt, C00.2 in de Oosterparkwijk en C00.3 in Paddepoel (`09-script-akte1.md:6,12,39`); de code laat geen tweede anker zien.
2. **Opening: dagdeel en bailout.** Een nieuw spel start op `START_HOUR = 17.5` (`daynight.js:13`); `playOpening` zet geen klok, terwijl C00.1 "zonsopgang" en C00.2 "ochtend" zeggen (`09-script-akte1.md:7,13`). M00 wordt na 40 s zonder storydata `done` (`story.js:238-244`), en als act 1 lukt maar act 2 faalt, gaan C00.2/C00.3 verloren (`story.js:515-528`).
3. **M21/M22: de vrienden zijn weg en toch terug.** Alleen de nooit gespeelde M21.4 bevat de scène waarin ze weggaan; de keuzepuzzel kan ook takken hebben waarin ze vertrekken. M22.1 begint met Tinus en Henk alsof er niets is gebeurd; de terugkeer staat alleen in een mission-outro-string.
4. **M20.5/M21.3: voorwerpen.** De klomp met het briefje en de Escapade zijn de visuele inzet; beide specs hebben `props: {}`. De tekst vertelt wat de speler niet ziet.
5. **Naamkaarten.** Oma's kaart hangt aan M08.1 (telefoon) in plaats van M08.3 (eerste verschijning); Durk & Douwe hebben geen kaart; Tessa/Tammo's C00.1-kaarten ontbreken. Dit botst met "Naamkaart bij de eerste ontmoeting" (`verhaal.md:78-81,104-105`).
6. **Stage-parameter genegeerd.** `startMission` geeft `storyStage(i)` mee (`missions.js:1815`), maar `playStoryIntro` zet `stage = i` (`missionstory.js:1308`) en `playStoryOutro` doet hetzelfde (`missionstory.js:1344`). Een missie die buiten de verhaallijn is gestart, speelt dus altijd de volledige intro/outro.
7. **Dubbel, kanaal, montage.** E1/E2 staan dubbel in `PARTS.ontzet.card` (`storyarc_nieuw.js:169-197`); `playFinale` gebruikt alleen de card. Jelle belt in M06.3 live op de radio tijdens de missie, terwijl `08-IMPLEMENTATIE.md:24` bellers alleen na een missie toestaat. De intromontage is onbereikbaar: `intromontage.js` wordt geladen (`cinematics.js:171`), maar `playIntro` wordt alleen door `replayIntro` aangeroepen en dat wordt nergens geïmporteerd.
8. **Finale.** M26.13 eindigt op de Grote Markt; de E-stap is meteen klaar en `playEndCard` -> `playFinale` speelt de epiloog. De teleport gebeurt alleen buiten een voertuig (`story.js:629`); de camera-orbit en Fjord-reveal zijn op de markt geankerd. De flow klopt als de speler na M26 niet wegrijdt; E1/E2 zijn niet de bron, de card is dat.

## 5. Bevindingen

**F1 · Hoog · M16-outro.** **Waar:** `storyarc_nieuw.js:288`, `cutscenes_akte3.js:193-227`, `09-script-akte3.md:239`. **Wat:** één kermis-spec volgt alle vier de scènes; M16.6 is de dijk bij Blauwestad bij zonsondergang en de beats lopen op de kermis. **Impact:** plek, water en dagdeel kloppen niet; de kus/dijk-scène verliest haar beeld. **Fix:** splits in M16.3-M16.5 (kermis) en M16.6 op een dijk-anker, of geef M16.6 een eigen `playStaged` met sunset. **Labels:** impact-verhaal, impact-regie; kosten-M.

**F2 · Hoog · M00-opening.** **Waar:** `story.js:492,496-533`; `cutscenes.js:39-76,251-259`; `09-script-akte1.md:6-13,39`. **Wat:** alle acts hangen aan de spelerpositie; de keuken op `KITCHEN_Z=345`; C00.1 mist trailerbeelden, naamkaarten en voorgeschreven titelkaart; klok start op 17:30 terwijl de regie zonsopgang/ochtend zegt. **Impact:** eerste indruk wijkt af; de 40 s-bailout en het act-verlies (`story.js:238-244,515-528`) kunnen de opening overslaan. **Fix:** aparte ankers, klok op dageraad, kaarten en beelden toevoegen, fallback bij act-falen. **Labels:** impact-verhaal, impact-presentatie; kosten-M/L.

**F3 · Hoog · M21.4 is dood.** **Waar:** `storyarc_nieuw.js:307-308`, `missions_akte4.js:270`, `09-script-akte4.md:317`. **Wat:** de 59 s-scène "Tammo, de vrienden" wordt nergens aangeroepen; de Tammo-stage is een lege `scene` met keuzepaneel. **Impact:** het dieptepunt (beiden alleen, de vrienden weg) is niet in beeld; een complete scène staat dood in de data. **Fix:** speel M21.4 als stage-outro, of verwijder de scène en neem de beats op in de keuzescène. **Labels:** impact-verhaal, impact-regie; kosten-S/M.

**F4 · Hoog · M20.5/M21.3 missen klomp en Escapade.** **Waar:** `cutscenes_akte4.js:137-160,391-405` (`props: {}`); `09-script-akte4.md:244,298`. **Wat:** de regie vraagt een klomp met briefje en een Escapade; de specs spawnen ze niet. **Impact:** de speler hoort over de auto en het briefje, maar ziet het briefje niet. **Fix:** voeg `klomp`/`briefje` en `escapade` toe met een push-in; hergebruik M22.2-props. **Labels:** impact-verhaal, impact-regie; kosten-S.

**F5 · Midden · Naamkaarten.** **Waar:** `storytext.js:75-113`; `09-script-akte2.md:63,78`; `cutscenes_akte1.js:159-160,172`; C00.1-regie. **Wat:** Oma's kaart hangt aan M08.1 (telefoon) in plaats van M08.3 (haar kamer); Durk & Douwe hebben geen kaart (M02 verborgen, M10.1 eerste zichtbare optreden); Tessa/Tammo's openingkaarten worden niet aangestuurd. **Impact:** eerste ontmoetingen zijn mis-cued of missen. **Fix:** Oma-kaart naar M08.3, tweelingkaart in M10.1, openingkaarten via `fx naam`/`card`. **Labels:** impact-verhaal, impact-toegankelijkheid; kosten-S.

**F6 · Midden · M11.5/M11.6 zonder eigen regie.** **Waar:** `09-script-akte2.md:260,271`; `cutscenes_akte2.js:8` (geen spec); `missions.js:3346`. **Wat:** de 58 s nachtscène draait op de generieke `deckCam`-drift; geen sterren, geen zandplaat, geen close op de "lange blik". **Impact:** een van de weinige romantische keerpunten is niet geregisseerd; de speler ziet een boot, niet de plek. **Fix:** schrijf een spec (Melkweg, zand, handen/gezichten) of hergebruik `playDeckMoment` met een zandplaat-anker. **Labels:** impact-verhaal, impact-regie; kosten-M.

**F7 · Midden · M18.3 als 54 s talk tijdens het sluipen.** **Waar:** `missions_akte4.js:136`; `09-script-akte4.md:82`. **Wat:** twaalf regels logboek-uitleg worden als `talk` met `delay: 1` afgespeeld tijdens de stealth-stage. **Impact:** de speler kan de centrale onthulling missen; het is een data-readout, geen gesprek. **Fix:** maak er een app/telefoonmoment of korte scene na de heist van; of blokkeer de stage even voor de clue. **Labels:** impact-verhaal, impact-tempo; kosten-S/M.

**F8 · Midden · Te lange tekstscènes.** **Waar:** M01.intro 105 s, M16.outro 96 s, M03.outro 85 s, M08.outro 85 s, M26.intro 77 s, M30.intro 76 s; `BALANS-TEMPO.md:243-253`. **Wat:** lange dialoogblokken, deels vóór de eerste gameplay (M01) of vlak voor een climax (M26). **Impact:** tempo zakt; spelers klikken weg of missen de clue. **Fix:** splitsen/inkorten; M03/M08 deels naar app/kaart, M01 de ladderuitleg naar latere banter. **Labels:** impact-tempo; kosten-M.

**Samenvatting:** 4 Hoog, 4 Midden; geen Kritiek gevonden.

## 6. Top 5 quick wins

1. **F4:** klomp/briefje en Escapade als props in M20.5/M21.3 (S).
2. **F5:** Oma's naamkaart naar M08.3, kaart voor Durk & Douwe in M10.1, openingkaarten voor Tessa/Tammo (S).
3. **F7:** de logboekclue uit de sluipstage halen en als app/telefoon of korte scene tonen (S/M).
4. **F3:** M21.4 echt spelen of definitief verwijderen; nu is het dood gewicht (S/M).
5. **F8:** M01.intro en M16.outro splitsen; de twee langste blokken (M).

## 7. Wat ik niet heb bekeken

- Geen runtime, Electron, browser, spel, testsuite of `node scripts/*_test.mjs`; niets visueel waargenomen. Geen opname-/voicemanifest: durées zijn leestijd uit `script.json`. `voice_coverage` niet gedraaid.
- Niet alle 207 scènes volledig gelezen: wel alle koppen/regie, de relevante dialoog en de vijf missies zonder outro; M12-M15 en M23-M30 zijn steekproefsgewijs bekeken. Geen save/load-, co-op- of late-join-test; de `stage`-bevinding is code-analyse.
- De spawncoördinaat en de eerste klok zijn uit `daynight.js`/`startscreen.js` afgeleid, niet uit een live run. `desktop/main.js` niet aangeraakt; geen `.env` gelezen; geen commits, pushes of issues gemaakt; geen bestaande bestanden gewijzigd.
