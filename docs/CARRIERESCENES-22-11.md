# Begincutscenes van de carrières (22-11-2026, #1106, #1095)

Opdracht van de eigenaar: twee mooie cutscenes, het begin van de voetbalcarrière en het begin van de landbouwcarrière (Bezit). Tak `cutscenes-carrieres-22-11`. Niets gepusht of gemerged. **Geen Electron en geen build gedraaid:** alles hieronder is bewezen met pure tests, de linter en mocks; het beeld is **nog niet bekeken**.

## De scènes

| | Voetbal (`carriere-voetbal-start`) | Landbouw (`carriere-bezit-start`) |
|---|---|---|
| Plek | het sportpark van de eigen club (echt park uit `voetbalparkendata.js`, het middelpunt van het veld) | het toegangspunt aan de weg van het eerste gekochte perceel (echt perceel uit de Bezit-index), het veld ligt vooruit |
| Cast | Tammo (zaakwaarnemer, met een map), Tessa in het clubtenue (`KIT_LEVELS.amateur`, rugnummer van haar spelersprofiel, eigen kapsel), trainer Eppo, drie ploeggenoten in hetzelfde tenue | Tammo, Tessa met de akte, buurman Aldert, een trekker, twee koeien aan de overkant |
| Toon | Tessa is zenuwachtig en maakt een lijstje; de trainer heeft een scherpe tong ("Potlood gaat weg met een gum"); Tammo is sinds half negen zaakwaarnemer | de akte is zwaar; Aldert heeft verstand van grond; Tammo: "Ik heb geen verstand van koeien" |
| Warme beat | bij het hek: "Waar jij het kunt zien" / "Ik heb ook een map" | Beppe (een bankje met soep), "We hebben een plekje", "Klopt" |
| Duur | 29 regels, ca. 95 s op leestijd, korter met opname | 32 regels, ca. 104 s op leestijd, ca. 85 s met opname |

De romantiek is een kleine beat (een blik, een woord), geen keuze en geen kus, zodat de scène bij elke stand van hun relatie klopt. Trainer Eppo en buurman Aldert zijn verzonnen; er staat geen echte club, merk of persoon in. Gronings alleen als "Moi". Tammo 24, Tessa Nederlands (#134).

## Hoe het werkt

- `game/js/careerdebut.js` (puur): de regels (`[wie, tekst, { ov }]`), de regie als spec voor `missionScene` (`footballSpec`, `farmSpec`), de tijdlijn met overlap (`debutTimeline`, `ov` uit `dialogueform.js`: een reactie valt erdoorheen), het clubtenue (`clubLook`, `teamLooks` via `footballkit.js actorLook`), de voorwaarden (`footballDue`, `farmDue`) en de blokkades (`debutBlockers`).
- `game/js/careerdebutrun.js` (dunne laag): kijkt elke seconde of een scène aan de beurt is en wacht dan op een rustig moment; speelt via `missionstory.js playSpecScene` (nieuw: eigen spec, eigen regels en eigen plek, bovenop `playStaged`; `playStaged` kreeg `spec`, `onEnd` en pakt bij overlappende regels de laatst begonnen regel).
- **Trigger voetbal:** een carrière die gestart is, zonder gespeelde of berekende wedstrijd, in seizoen 1. **Trigger landbouw:** het eerste gekochte perceel dat geen startperceel is (hooguit twee aankopen; een oud bezit met veel aankopen heeft de scène nooit gezien en krijgt hem niet meer).
- **Eenmaal per speler (#429):** de vlag `carriere:voetbal-start` of `carriere:bezit-start` staat in de verhaalvlaggen (`story.js storyBridgeView().flags`, wordt met de save bewaard) en gaat erin zodra de scène begint, dus overslaan telt als gezien en een nieuwe carrière toont hem niet nog eens. Mislukt het starten drie keer (film bezet, geen veld), dan telt hij ook als gezien.
- **Niet over iets heen:** `debutBlockers` wacht op laadscherm, menu, kaart, telefoon, winkel, recapkaart, film (en 2,5 s erna), missie, duifstand, minigame, terugzetten, politie, vlak na de dood, de opening en op alles wat de meldingenpoort vasthoudt (`noticeHeldBy()`: laadscherm, opstart, cutscene, schermvullende kaart, gesprek, missie) en een melding in beeld (`noticeQueue.shown()`); daarna 2,5 s rust (`DEBUT_CALM_S`) en `mayStart('say')`. De Electron-verhaaltest en de proefspeler (`STORY_TEST`, `AUTOPLAY`) laten hem uit tenzij `window.__careerdebut.enable()`; `window.__careerdebut.play('voetbal'|'bezit')` speelt hem in de testbank direct.
- **Overslaan:** de filmlaag (`skippable`), zoals elke geregisseerde scène. De speler wordt niet verplaatst en niets in de scène is voortgang.
- **Catalogus en linter:** `cutpreview.js buildCatalog` heeft de groep "Carrière"; `scripts/lib/cutscene_data.mjs` neemt hem mee, dus `cutscene_lint --strict` toetst ze (0 blokkerend; voetbal 98, landbouw 92 van 100: de rest is `CS-C06` over de as en één kijkrichting-nit).

## Samen spelen

Zie `docs/COOP-GAST.md`, "Begincutscenes van de carrières", en het systeem `careerdebut` in `scripts/coop_coverage.json`. Kort: de scène is van wie de carrière start of het perceel koopt; een gastheer stuurt hem als geregisseerde scène (data, inclusief Tessa's tenue) naar de gasten, die hem lokaal nakijken en overslaan kunnen; een gast die zelf begint speelt hem voor zichzelf. Geen beloning, geen voortgang, niets te herstellen bij wegvallen. Wie de voetbalcarrière met Tammo speelt ziet dezelfde scène (Tessa speelt, Tammo regelt): de scène volgt het verhaal, niet het gekozen personage.

## Stemmen en opnames

De regels (`FOOTBALL_LINES`, `FARM_LINES`, plat in `DEBUT_LINES`) worden gelezen door `scripts/voicelines_collect.mjs` (gebied "Carrièrescènes", manifest `lines`; Tessa heet in de bank "Anita"). Twee nieuwe sprekers in `scripts/tts_lines_list.mjs`: **Trainer Eppo** (Alnilam, droog en bazig) en **Buurman Aldert** (Enceladus, nuchter en hartelijk). `node scripts/tts_lines_list.mjs` en `node scripts/voice_wacht.mjs --write` zijn gedraaid: **57 nieuwe sleutels** in `tts_lines.json` (224 naar 281 opdrachten) en `voice_wacht.json`, zodat `voice_coverage` groen is (3925/3925). **Er is geen TTS gedraaid en niets beluisterd.** Tot de TTS-ronde volgt de tekst met leestijd als ondertitel; met opnames wordt de scène korter. `script.json` is niet veranderd: deze regels zijn geen verhaalscène.

## Niet gedaan en niet bekeken

- **Niet in beeld bekeken** (geen Electron, geen build): de camera, de plek op een echt park en een echt perceel, het clubtenue van Tessa en de ploeggenoten, de rollende bal, de loop van trainer en buurman, de trekker en de koeien, en hoe de scène valt bij een echte melding of menu. De positie in meters is geschat uit bestaande scènes (`cutscenes_akte5.js`).
- Het veld is het middelpunt van het park; er is geen doelprop, dus de training speelt zich af met bal, hek en hesjes. Een doel zou een nieuw propmodel vragen.
- De humorpanel-werkwijze (drie varianten per grap en een panel van beoordelaars, `docs/verhaal/HUMOR-KEUZELIJST.md`) is niet gedraaid: de grappen zijn door de auteur geschreven en wachten op de smaakronde van de eigenaar.
- `CS-C06` (de camera springt over de as) staat nog in de landbouwscène (belangrijk, niet blokkerend).
- Samen spelen is niet met twee echte instanties geprobeerd; het bewijs is de JSON-stabiliteit van de definitie en de bestaande `coopcut`-route.
- `scripts/opnameronde_test.mjs` en `scripts/cutpreview_test.mjs` waren/zijn bijgewerkt voor de nieuwe tellingen (281 opdrachten, 46 wachtende regels; twee extra catalogusscènes).

## De invalbeurt voor de eerste training (28-11, #1374, V2)

Een carrière die bij De Hoekers begint (de dorpsclub in Warffum, `footballstory.js`) krijgt eerst de invalbeurt (`carriere-voetbal-invalbeurt`, `game/js/careerdebut_football.js`) en daarna de eerste training hierboven. De invalbeurt is een scène van drie delen (de trainingsavond, de zondag, het clubhuis; script V1.1 tot V1.3), met Albert Teuben (nieuwe NPC `albert` in `missionstory.js`), Eppo (de bestaande sleutel `trainer`), Tammo en Tessa in haar eigen kleren; het licht loopt van avond via dag naar gouden uur. `careerdebutrun.js` kiest eerst de invalbeurt (`invallerDue`), dan de training (`footballDue`); de vlag `carriere:voetbal-invalbeurt` gaat erin zodra de scène begint. Een carrière met een andere startclub krijgt alleen de training. De regels, de regie en de voorwaarde staan in `scripts/careerdebut_football_test.mjs`. **Niet in beeld bekeken**: camera, positie van bord en koffieautomaat (props `bord` en `automaat` op de grond, geschat), de nieuwe figuur Albert, het licht. De scène staat nog niet in de catalogus van `cutpreview.js` (een volgende stap voor de beeldronde V10) en de regels staan nog niet in `DEBUT_LINES` (geen stemopdracht: zie `docs/verhaal/TTS-NIEUW-28-11.md`).
