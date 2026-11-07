# Cutscene-regie en -techniek — review 01

**Reviewgebied:** regie en techniek van de cutscenes, niet de verhaalinhoud.
**Repo:** `<repo>`, branch `main`.
**Gemeten HEAD:** `41340dd4` — niet de opgegeven `e5e8b712`; dat zijn twee docs/dev-commits later. De cutscene-code is gelijk aan `e5e8b712`, behalve `game/js/postfx3d.js` in de werkboom (ongecodeerde wijziging van een andere sessie: `reduceFlash`/`screenFlash`, #592). De werkboom bevat daarnaast 88 gewijzigde bestanden van andere reviewers; ik heb alleen dit rapport toegevoegd.

**Methode en grens:** statische review. Geen runtime, Electron, spel, testsuite of schermafbeeldingen; geen commits, pushes of GitHub-issues. Waar ik alleen het codepad kon zien en niet het beeld, staat dat erbij. `desktop/main.js` en `.env` zijn niet aangeraakt.

---

## Bevindingen

### F1 — [Kritiek] `pause: true` pauzeert de wereld en de speler niet

**Waar:** `game/js/cinematics.js:300-338` (`begin`), `game/js/cinematics.js:408-472` (`updateCinematics`), `game/js/main.js:672`, `game/js/main.js:683-692`, `game/js/main.js:844-849`, `game/js/player.js:127-263`.
**Wat/scenario:** vrijwel elke regiescène (`playScript`, missie-intro’s, de opening, de intro-montage) zet `pause: true`. Het enige wat `begin` daarmee doet, is één keer `v.speed = 0` zetten bij de auto van de speler (`cinematics.js:331-338`). `world.paused` wordt alleen door menu’s/kaart/winkel/coopHold gezet (`main.js:672`), niet door een cutscene. `updateGameplay` en `player.update` blijven dus elke frame lopen; `player.update` verwerkt gewoon W/A/S/D, sprong, E/F, K en interacties. `cinematicPausesGameplay()` bestaat wel (`cinematics.js:185-187`), maar de enige consument is `phone.js:427`.
**Impact:** tijdens een ingestudeerde scène kan de speler wegwandelen of wegrijden, een auto in/uit stappen, een winkel openen of schieten. De acteurs en camera spelen dan tegen een lege straat; missie- en verkeersklokken lopen door. Dit raakt de opening, elke missie-intro/outro en elke `cutscenehost`-scène. Niet runtime getest, maar het codepad is eenduidig.
**Fix:** blokkeer speler en wereld zolang `cinematicPausesGameplay()` waar is (of een expliciete `world.cinematicPause`), inclusief `player.update` en `input`; laat alleen de scèneklok en audio doorlopen. Maak per scène expliciet welke momenten (crash, wanted, death) juist wél over de live wereld moeten spelen. Test met ingedrukte W tijdens een missie-intro.
**Labels:** `impact-zeer-hoog`, `kosten-M`.

### F2 — [Hoog] Camerahoogten en acteurs staan op absolute z=0, niet op de grondhoogte

**Waar:** `game/js/missionstory.js:1207-1222` (`playStaged`, `z = 0`), `game/js/missionstory.js:1270-1279` (`onFootAnchor` levert alleen x/y), `game/js/missionstory.js:1314`, `:1366-1368`, `:1685`; `game/js/cutscenehost.js:139`, `:173-195`; `game/js/cinematics.js:931-935`, `:973-976`, `:987-989`, `:1044-1049`, `:1070-1072`, `:556-559`; ter contrast `game/js/story.js:476-477` (flat gebruikt wél `pl.gz`).
**Wat/scenario:** `cutscript` ondersteunt een anker met `z`, maar alleen de keuken (`KITCHEN_Z`) en een bootdeel geven die door. `onFootAnchor` en `playStaged` geven standaard `0`; de handgemaakte camera’s van missie-intro, mission-fail, death, crash en wanted5 gebruiken absolute hoogten als `1.7`, `2.2`, `0.7` en `1.6`. Op een dijk (M14 “De dijk”), een viaduct, een brug, een wierde of de vesting Bourtange (M30) staan acteurs en camera dus onder het maaiveld. De scènes zijn niet runtime bekeken; de code geeft geen enkele `groundHeightAt`/`gz`-toevoeging.
**Impact:** onzichtbare of verzonken acteurs, een camera onder de grond (zwart/terrein), zwevende props en een harde sprong bij het begin/einde.
**Fix:** geef elk anker `z = p.gz` (of `map.groundHeightAt`) mee; tel die hoogte op bij alle `W`-keys in `cinematics.js` en bij `anchor.z` in `playStaged`; doe hetzelfde voor `story.js:737` (endcard). Test minimaal op de dijk en op een brug.
**Labels:** `impact-hoog`, `kosten-M`.

### F3 — [Hoog] Stemduur en scèneduur hebben geen één bron; `attachVoices` rekt pas ná het compileren op

**Waar:** `game/js/cutscenehost.js:275` (compile), `:291-306` (playCinematic), `game/js/cinematics.js:275-295` (`attachVoices`), `:431-433` (t en duration), `game/js/cutscript.js:158-168` (shots/cues), `:309-345` (`cameraAt`), `game/js/cinematics.js:923-939` (`playMissionIntro`, vast 4.8 s), `game/js/story.js:735-739` (endcard 6.5 s).
**Wat/scenario:** `playScript` compileert de scène eerst met de originele regels. `playCinematic` voegt daarna via `lineVoiceFor` een stem toe, schuift `at` en rekt `active.duration` op. De gecompileerde scène houdt echter de oude `lines`, de oude shot-/cuetijden en de oude duur. Zodra een regel zonder `voice`-veld een opname vindt (de bedoeling van `linevoice.js`), lopen ondertitel en stem achter de regie aan; aan het einde houdt de laatste shot stil en staan de acteurs stil terwijl de stem nog doorloopt. `playStaged` omzeilt dit met `own: true` (`missionstory.js:1099`), maar de generieke `playScript`-routes (flat, endcard, opening-fallback) en losse `playCinematic`-scènes niet. Daarnaast zijn er vaste duren (4.8/6.5/8/11 s) die niet uit de regels worden afgeleid.
**Impact:** freeze aan het einde, stem die wordt afgekapt of nasleept, verkeerde cue-timing. Fragiel bij elke nieuwe opname of langere regel. Welke huidige scènes precies een stem zonder `voice`-veld krijgen, heb ik niet per scène geverifieerd; het codepad is hard.
**Fix:** bepaal eerst alle stemmen en definitieve `at/dur`, compileer daarna één keer; leid `duration` af uit de laatste regel + tail; valideer dat elke regel binnen de duur past. Gebruik `own: true` alleen waar de host de stem zelf al speelt.
**Labels:** `impact-hoog`, `kosten-M`.

### F4 — [Hoog] Landmark- en Ommelanden-scènes kunnen op topsnelheid, tijdens een race of in pigeonmode starten

**Waar:** `game/js/cinematics.js:574-588` (`checkLandmarks`), `:532-543` (`checkOmmelanden`), `:546-566` (`playOmmelanden`), `:815-816` (alleen de wijkfilm heeft een snelheidsgrens), `:331-338` (auto stopt), `game/js/main.js:731` (pigeoncamera wint), `game/js/cinematics.js:793-795` (`busyWithJob` kent geen race/heliRun).
**Wat/scenario:** `checkLandmarks` heeft geen `pigeonMode`, snelheids-, dwell- of `w.race`-check; `checkOmmelanden` evenmin. Alleen `checkWijk` wacht op snelheid ≤ 12 m/s en 1,5 s dwell. `playLandmark` (3,8 s orbit) en `playOmmelanden` (8 s) zetten `pause: true`, dus de auto wordt bij aanvang stilgezet. In pigeonmode zet `updateCinematics` eerst de scènecamera en direct daarna `updatePigeonCamera`; de scène loopt intussen door. Bij een race of heliRun op de grond kan hetzelfde gebeuren als `mayInterrupt` toevallig ruimte geeft.
**Impact:** onverwachte stop bij 80 km/h, een scène die onder de duivencamera verdwijnt en daarna weer opduikt, of een onderbreking midden in een race.
**Fix:** voeg aan beide checks `w.pigeonMode`, `w.heliRun`, `w.race` en een `WIJK_MAX_SPEED`-achtige drempel toe; gebruik `playerBusy(w, ['missionPhase','sideJob','challenge','race','heliRun'])`. Test op de ringweg en in pigeonmode.
**Labels:** `impact-hoog`, `kosten-S`.

### F5 — [Midden] De stemmenbank laadt asynchroon en wordt nooit opnieuw geprobeerd; een vroege of mislukte fetch maakt scènes stil

**Waar:** `game/js/voicebank.js:26-50` (fetch, `.catch(() => {})`, `ready`), `game/js/linevoice.js:11-18`, `game/js/cinematics.js:275-295` (`attachVoices` synchroon), `:396-399` (alleen `l.voice`), `game/js/story.js:458-465` (duur op basis van `lineVoiceFor`), `game/js/intromontage.js:38` en `:1170-1189` (stem op buildtijd).
**Wat/scenario:** `openBank` start een fetch en vult `entries` later; `lineVoiceFor` geeft vóór die tijd `null`. `attachVoices` doet één synchrone poging en `updateSubtitles` kijkt daarna alleen naar `l.voice`. Een scène die in de eerste seconden na de start begint, of waarvan de fetch faalt, krijgt geen stem en een leestijd-duur; een latere scène werkt wel. `playScript` heeft met `mumble: true` nog een tekst-mumble (`cutscenehost.js:292`, `cinematics.js:399`), maar `playCinematic`-scènes zonder dat veld (o.a. opening-fallback, endcard, `intromontage`) zijn dan volledig stil. `voice_coverage.mjs:29-44` is alleen een build-gate; het vangt geen runtime-misser.
**Impact:** willekeurig stille of verkeerd getimede scènes, vooral op een koude schijf of bij een netwerkfout; niet reproduceerbaar op een snelle machine.
**Fix:** laat de scène wachten op `bank.ready` (met timeout) of vraag de stem lui op wanneer de ondertitel verschijnt en rek de duur dan alsnog op; geef `playCinematic` een mumble-fallback; cache een fout niet als “klaar”.
**Labels:** `impact-hoog`, `kosten-M`.

### F6 — [Midden] De wijk wordt als “gezien” gemarkeerd vóórdat de film is gelukt

**Waar:** `game/js/cinematics.js:819-823` (`markWijk` vóór `playWijk`), `:897-908` (`playWijk`), `game/js/camerapath.js:113-140` (`pickWijkStreet`), `:177-180` (`wijkStreetShot` kan `null` geven).
**Wat/scenario:** `checkWijk` doet `noteMoment`, `markWijk(p)` en `wijkCand = null`, en roept daarna `playWijk`. Vindt `wijkStreetShot` geen geschikte straat (korte of landelijke wijk), dan retourneert `playWijk` `false` en volgt er geen kaart en geen film. De markering staat wel in `wijkenSeen` en is blijvend.
**Impact:** een nieuwe wijk kan voorgoed zonder “Nieuwe wijk”-moment blijven; de speler ziet alleen de HUD-regel. Vooral buiten de binnenstad.
**Fix:** probeer eerst de shot te bouwen; val bij `null` terug op `showWijkCard`; markeer pas na succes (of markeer “kaart gezien” en “film gezien” apart).
**Labels:** `impact-midden`, `kosten-S`.

### F7 — [Midden] De wijkfilm gebruikt een seconde oude voorbereiding en eindigt op een gegokte pose, niet op de live volgcamera

**Waar:** `game/js/cinematics.js:807-809` (prep vanaf dwell−1 s), `:890-902` (`prepWijk`/`playWijk`, `fresh` kijkt alleen naar x/y en 8 s), `:901` (`behindPose(w, 8, 3.8)`), `game/js/camerapath.js:177-216` (laatste `home`-key), `game/js/scene3d.js:3966-3975` (0,9 s uitblenden).
**Wat/scenario:** de shot wordt een seconde vóór de film gebouwd met de toenmalige `heading`. De hergebruikcheck vergelijkt alleen de positie (< 6 m), niet de kijkrichting. Draait de speler in die seconde 180°, dan blijft de oude achterpose staan. Hetzelfde geldt voor het einde: `playWijk` geeft een nieuwe `behindPose` mee in plaats van de live `getFollowPose()`; de camera glijdt daarna 0,9 s terug (of snapt bij > 30 m).
**Impact:** zichtbare zwaai of verkeerde eindkader na de flyover; de speler kijkt een andere kant op dan de camera verwacht.
**Fix:** bewaar ook de heading in `wijkPrep` en keur op > ~30° af; eindig op `getFollowPose()` (zoals `flyInShot`) of zet `follow` op de laatste 25 %.
**Labels:** `impact-midden`, `kosten-M`.

### F8 — [Midden] `skipHoldSince`/`skipShown` worden niet gereset als een scène natuurlijk eindigt of wordt vervangen; een wachtrijscène kan dubbel skippen

**Waar:** `game/js/cinematics.js:342-363` (`finish`), `:365-380` (`updateSkipHold`), `:300-340` (`begin`), `:249-262` (queue/prioriteit).
**Wat/scenario:** de hold-tijd wordt alleen gewist bij een geslaagde skip (`:370`), bij keyup (`:155-159`) of bij blur. Eindigt scène A natuurlijk (of wordt hij door een hogere prioriteit vervangen) terwijl de speler Spatie nog vasthoudt, dan begint wachtrijscène B met de oude `skipHoldSince`. Zodra B’s `t > 0,25` is, is `k` al 1 en wordt B direct overgeslagen. `skipShown` en `--hold` worden evenmin gereset.
**Impact:** één hold skipt twee scènes, bijvoorbeeld een missieresultaat of de volgende akte; de ring blijft vol staan. Dit is ook het “dubbel afspelen”-risico in de wachtrij.
**Fix:** reset in `finish` én `begin` `skipHoldSince = null`, `skipShown = -1`, `--hold = 0`; start een nieuwe hold alleen op een keydown die na `begin` valt. Voeg een test toe met een queue van twee scènes.
**Labels:** `impact-midden`, `kosten-S`.

### F9 — [Midden] Pauzemenu en tabwissel bevriezen de scèneklok, maar niet de stem; `frozen` mist winkel/uiPaused/coopHold

**Waar:** `game/js/cinematics.js:424-439` (`frozen`, `active.t`, `updateSubtitles`, `skipHoldSince`), `:406-431` (wall clock), `game/js/audio.js:1601-1612` (visibility), `:1246-1272` (media-elementstem), `game/js/pausemenu.js:830` (Escape opent tijdens een scène), `:1792` (alleen `menuMuffle`), `game/js/main.js:672`.
**Wat/scenario:** Escape opent het pauzemenu tijdens een cutscene. `updateCinematics` zet `active.t` en de ondertitels stil, maar `storyVoice` is een HTMLAudio-element dat blijft doorspelen; de tabwissel suspendeert alleen de AudioContext, niet het media-element. Na sluiten staat de ondertitel nog op de oude regel terwijl de stem al verder is (of klaar). `frozen` kijkt alleen naar pauzemenu/kaart, terwijl `world.paused` ook shop, `uiPaused` en `coopHold` omvat; een scène loopt achter die overlays gewoon door.
**Impact:** stem en ondertitel lopen uit de pas; een scène eindigt achter een winkel of hold-scherm; de skipplus werkt niet meer.
**Fix:** pauseer/hervat `storyVoice` samen met de scène (bewaar `currentTime`), of laat de scèneklok en audio beide doorlopen; gebruik `world.paused` als gedeelde freeze-voorwaarde. Test met pauzemenu, tabwissel en een winkel die tijdens de scène opent.
**Labels:** `impact-midden`, `kosten-M`.

### F10 — [Midden] `finish` en `skipAllCinematics` ruimen banner, timeScale en HUD-flags niet op; de HUD komt terug vóór de camera

**Waar:** `game/js/cinematics.js:342-363` (`finish`), `:1221-1227` (`skipAllCinematics`), `:1158-1177` (`showBanner`), `game/js/savegame.js:487-498` (load), `game/js/hud_panel.css:311-312` (HUD-transitie), `game/js/scene3d.js:3966-3975` (camera-uitblend).
**Wat/scenario:** `finish` zet `cameraOverride` op null en haalt `cine-hide-hud` weg, maar laat een resultaatbanner staan; `showBanner` kan juist vanuit een `onEnd` komen. `skipAllCinematics` wist de queue en de actieve scène, maar niet `banner`, `chip`, `setNameCard`, `w.timeScale`, `w.cinematicHidePlayers/Nav` of `skipHoldSince`. Bij “laad save” tijdens een resultaat- of mission-fail-scène blijft de kaart dus over de geladen wereld staan. De HUD-fade begint terwijl de camera nog tot 0,9 s terugglijdt (of hard snapt bij > 30 m).
**Impact:** stilstaande banner/overlay na load of “Zet me vrij”; hud-flits over het oude filmbeeld; vastgehouden hide-vlaggen wanneer een `onEnd` niet netjes afloopt. De 20 s/30 s-vangnetten (`cinematics.js:422-430`) verbergen een vastloper maar ruimen de state niet op.
**Fix:** één `clearCinematicUi()` (banner hidden + `banner=null`, naamkaart, chip, `has-sub`, `show-skip`, `timeScale=1`, hide-vlaggen) in `finish` en `skipAll`; houd de HUD verborgen tot de camera-uitblend klaar is. Test een load tijdens een banner.
**Labels:** `impact-midden`, `kosten-S`.

### F11 — [Midden] Handgemaakte camera’s (missie-intro, fail, death, crash, wanted) hebben geen `fitCamera`; bij een gevel volgt een wand of een hijskraan-flip

**Waar:** `game/js/cinematics.js:923-939` (`playMissionIntro`), `:966-977` (`playMissionFailed`), `:979-1009` (`playDeath`), `:1044-1049` (`tryCrashReplay`), `game/js/cutscript.js:512-527` (`fitCamera`), `:529-534` (comment over de flip), `game/js/scene3d.js:3928-3948` (`guardCinematicCamera`).
**Wat/scenario:** alleen `cutscript`-scènes gebruiken `fitCamera` met `env`. De handgemaakte paden gebruiken `clearKeys`, dat alleen keypunten en middens over daken tilt; `keyHits` beoordeelt alleen vier keypunten. Staat de speler met de rug tegen een gevel, dan kan de camera door de muur of, via de guard, met een grote verticale lift over het dak. De comment in `cutscript.js:529-534` beschrijft precies dat “straight up 70 m and down at the street”-effect.
**Impact:** camera door gevels of een onverwachte hijskraanbeweging bij het begin/einde van een missie-intro of fail; vooral bij bijbaantjes die aan een pand starten.
**Fix:** bouw deze keys met dezelfde `fitCamera`/`clearPath`/`roofline`-route als de wijkfilm, of geef ze een `env` en laat `pathShot` door `cameraAt` lopen; keur de zijde op gesamplede punten, niet op vier keys.
**Labels:** `impact-midden`, `kosten-M`.

### F12 — [Midden] Prewarm en `registerShots` worden niet afgewacht; `roofAt` ziet ongeladen tegels als “geen gebouw”

**Waar:** `game/js/cinematics.js:211-218` (`holdShotTiles`), `:305` (`begin`), `:249-260` (`playCinematic`), `game/js/tileworld.js:398-410` (`registerShots`), `game/js/camerapath.js:34-42` (`roofAt`), `game/js/scene3d.js:1892-1930` (prewarm) en `:3911-3925` (`roofTopNear`).
**Wat/scenario:** `holdShotTiles` start `registerShots` en negeert de Promise; `registerShots` pinnt en request tegels, maar de scène begint direct. `prewarmStreamAt` bouwt alleen gebouwen rond punten (geen tegels). `roofAt`, `fitCamera`, `fitAnchor` en de camera-guard gebruiken `map.buildingsNear`, dat op ongeladen tegels niets teruggeeft. De eerste frames van een verre cut (opening, landmark op 55 m, wijkstraat op 260 m) kunnen dus een gat, verre LOD of een camera in een gebouw tonen tot de stream bijwerkt.
**Impact:** eerste seconde(n) van een film visueel kapot; QA-screenshots op een warme cache missen het. De `prewarm`-comment belooft meer dan de code afdwingt.
**Fix:** await `registerShots` (met timeout) of `shotsReady()` vóór `begin`; laat `roofAt` bij ontbrekende tegels conservatief tillen/terugtrekken in plaats van 0 teruggeven; test met een koude cache.
**Labels:** `impact-midden`, `kosten-M`.

### F13 — [Midden] `disposeTree` gooit alleen geometrie weg; de keukenmaterialen/textures en `kit.dispose()` blijven liggen

**Waar:** `game/js/cutscenehost.js:100-104` (`disposeTree`), `:197-200` (`dispose`), `:138-142` (keuken bouwen), `game/js/introkitchen3d.js:286-290` (`kit.dispose()`), `game/js/intromontage.js:1348` (roept die wél aan), `game/js/cutscenehost.js:34-35` (`MATS`).
**Wat/scenario:** `buildKitchen` maakt eigen `MeshStandardMaterial`-objecten en canvas-textures en verzamelt ze in `own`; `kit.dispose()` ruimt die op. `buildScriptRun.dispose()` doet alleen `group.removeFromParent()` + `disposeTree(group)`, en `disposeTree` disposal alleen geometrie. De keukenmaterialen/textures worden dus nooit ge-disposed. Voor losse props wordt alleen geometrie ge-disposed; de `MATS`-cache blijft bewust leven, maar de keuken zit daar niet in.
**Impact:** GPU-geheugenlek per opening/new-game/herstart in hetzelfde proces; de keuken heeft meerdere canvastextures. Geen crash, maar wel trager en meer geheugen.
**Fix:** roep in `buildScriptRun.dispose()` `kit?.dispose()` aan en dispose niet-gedeelde materialen/textures; laat `SHADOW_GEO`/`PERSON_MAT`/wereld-caches met rust.
**Labels:** `impact-midden`, `kosten-S`.

### F14 — [Midden] De landmark-orbit kadert het bovenste deel van hoge gebouwen niet

**Waar:** `game/js/cinematics.js:1018-1028` (`playLandmark`), `:942-963` (`orbitShot`), `:49-52` (`LANDMARK_HEIGHT`), `game/js/scene3d.js:3990` (fov-terugval).
**Wat/scenario:** de camera staat op `h * 0.45 + 9` en kijkt naar `h * 0.42`, met een straal tot 60/80 m en geen eigen `fov`. Voor de Martinitoren (`h = 97`) staat de camera op ~52,6 m en kijkt naar ~40,7 m, terwijl de top op 97 m ligt; de top valt ruim buiten de verticale kijkhoek (ook bij de brede basis-fov). Hetzelfde geldt in mindere mate voor het Forum en de Martinikerk. De titel noemt het landmark, maar de spits ontbreekt.
**Impact:** zwak/onduidelijk kader: de scène onthult niet het hele gebouw; de titelkaart belooft meer dan het beeld geeft.
**Fix:** frame op de top: `lookY = h * 0.55`, camera `h * 0.4 + 6`, of bereken een fit uit `buildingReach`/`fp.top` en zet een expliciete `fov`; test de Martinitoren en het Forum.
**Labels:** `impact-midden`, `kosten-S`.

### F15 — [Midden] Landmark, wanted5, crash en respawn-card hebben geen eigen stem of sfx; er is geen ducking

**Waar:** `game/js/cinematics.js:1018-1028` (landmark), `:1042-1050` (crash), `:1053-1080` (wanted5), `:162-168` (respawn-card), `:326-327` (`voiced` alleen bij regels), `game/js/audio.js:1276-1280` (duck alleen bij stem), `:1220-1230` (`setStoryScene`).
**Wat/scenario:** deze scènes hebben geen `lines`, dus `active.voiced` blijft false, `setStoryScene` wordt niet gezet en de wereldambience/muziek blijven op vol niveau. De titel “Heel Grunn zit achter je aan” wordt niet uitgesproken; een crash van 1,2 s en een landmark van 3,8 s hebben alleen wereldgeluid. De wijk- en Ommelanden-scènes hebben wél een Rikus-regel.
**Impact:** deze “filmische momenten” voelen stil en onaf; geen auditieve bevestiging van vijf sterren of een crash; muziek/ambience loopt ongefilterd door.
**Fix:** voeg een korte Rikus-regel of een bestaande sfx/titelsting toe en zet de ambience/muziek iets terug; of documenteer bewust “stil” en haal de titel uit het beeld als er geen stem is.
**Labels:** `impact-midden`, `kosten-S`.

### F16 — [Midden] De shotgrammatica mist close-up, reactie, over-the-shoulder, insert, tracking, crane en handheld; de ritmeregel is alleen preview/alleen `cut`

**Waar:** `game/js/cutscript.js:22` (`ACTOR_ANIMS`), `:26` (`SHOTS`), `:317-345` (`cameraAt`), `game/js/cutscenes_akte1.js:570-579` (`CAMS`), `:636-667` (automatische coverage), `:696-715` (`drift`), `game/js/cutpreview.js:27` en `:114` (MAX_CAMERA_STILL), `game/js/cutscript.js:124-131` (validatie alleen `cut`).
**Wat/scenario:** er zijn vier shottypen (`cut`, `dolly`, `orbit`, `follow`). Close-up is alleen een dolly met lage fov; een reactie-shot, OTS, insert, tracking, crane of handheld bestaat niet als type. De automatische coverage kiest bijna altijd de spreker; luisteraars krijgen een anim, maar geen eigen kader. `shake` wordt alleen in de opening gebruikt. De “camera staat niet stil”-regel wordt alleen in `drift` (missies) toegepast en in de preview gecontroleerd; `validateScene` keurt alleen `cut`-shots > 10 s af, een lange dolly met minimale beweging glipt erdoor. `look` op een `orbit`-shot wordt door `cameraAt` genegeerd (`cutscript.js:329-336`), terwijl `END_CARD` en `CAMS.orbit` het meegeven.
**Impact:** elke scène krijgt dezelfde cadans; reacties en inserts blijven onbenut; een lange, bijna stilstaande dolly kan ongestraft blijven staan. Ik vond in de door mij geopende scènes geen concrete `cut` > 8 s; dit is een handhavings- en ontwerpgat, geen bewezen datafout.
**Fix:** voeg `close`, `reaction`, `ots`, `insert` en `handheld` toe aan `SHOTS`/`cameraAt`; laat de coverage ook luisteraars en props kiezen; pas de ritmeregel op alle shottypen toe; verwijder of implementeer `look` op orbit.
**Labels:** `impact-midden`, `kosten-M`.

### F17 — [Midden] Reduced motion beïnvloedt alleen camerashake; de aria-live-regio omvat de hele kaart

**Waar:** `game/js/a11y.js:56-58` (`setShakeFilter`), `game/js/cutscript.js:27-29` (shake-filter), `game/js/settings.js:53`, `game/js/pausemenu.js:1515` (“Minder bewegende beelden en schermschudden”), `game/js/cinematics.js:108-123` (`aria-live` op `#cine`), `game/js/touchlogic.js:60` en `:183-184` (touch “Overslaan”), `game/js/touch.js:172-173`.
**Wat/scenario:** “Beweging beperken” verlaagt alleen de shake in `cutscript`; de `pathShot`-vluchten (wijk, opening, missie-intro, landmark-orbit) gaan onverminderd door. De OS-instelling `prefers-reduced-motion` wordt via `reducedMotion()` alleen op die shake toegepast. `#cine` heeft één `aria-live="polite"` op de root met kicker, titel, grote kaart, ondertitel en de statische skip-hint; zonder `aria-atomic`/`role="status"` kan een schermlezer bij elke regel het hele blok oplezen. Toetsenbord (Spatie 0,9 s) en touch (“Overslaan”) werken; gamepad heb ik niet geverifieerd. `cinematicMoments` en `wijkFilm` worden correct gelezen (`cinematics.js:87-89`, `:808`); `wijkFilm` staat standaard uit. Het contrast van de donkere letterbox en de sprekerskleuren lijkt in orde (sprekers hebben een luminance van ~0,17-0,30), maar ik heb geen schermlezer of contrastmeting gedraaid.
**Impact:** motion-gevoelige spelers krijgen alsnog de grote camerabewegingen; schermlezers kunnen de hint en kaart door elkaar horen.
**Fix:** laat `reducedMotion()` ook de scènecamera dempen (kortere/kalmere paden of een statische variant), zet `aria-live` alleen op de ondertitel met `role="status"`/`aria-atomic="true"`, en `aria-hidden` de rest. Voeg een controller-/mobiele hint toe.
**Labels:** `impact-midden`, `kosten-S`.

### F18 — [Midden] De opening is in de keuken “dageraad”, maar de spelklok blijft op 17:30 staan

**Waar:** `game/js/introkitchen3d.js:46-68` (windowtex met dageraad), `:242-252` (eigen lamp/dawn/ambient), `game/js/story.js:496-545` (`playOpening`), `game/js/daynight.js:13` (`START_HOUR = 17.5`), `game/js/story.js:492` (`KITCHEN_Z`).
**Wat/scenario:** de keukenact is geschreven en getekend als dageraad (comments, windowtexture, eigen “dawn”-licht). `playOpening` zet nergens `world.clock`; de nieuwe game start op 17.5. De straatakten (trailer, verhuisdag) gebruiken dus het licht van 17:30, de keuken een ingebakken dageraad, en na de opening staat de klok nog steeds op 17:30. De HUD is tijdens de film verborgen, maar het wereldlicht/de schaduwen kloppen niet met het verhaal.
**Impact:** tijd-van-de-dag-sprong tussen act 1/2/3; de keuken voelt als een ander moment dan de straat, zonder dat de klok dat verklaart.
**Fix:** zet voor de keukenact een vroege klok (bijv. 5,9) en schuif voor de verhuisdag naar de gewenste tijd, of haal de dageraad uit de set en speel de keuken op 17:30. Leg de gekozen klok in de scène-data vast.
**Labels:** `impact-midden`, `kosten-S`.

### F19 — [Laag] De wijkkaart blijft tot 12 s opnieuw proberen en kan verschijnen nadat de speler de wijk al uit is

**Waar:** `game/js/cinematics.js:846-883`, met de retry op `:868-870` (`left = 30`, elke 400 ms).
**Wat/scenario:** staat er een resultaatkaart of keuzepaneel open, dan probeert `showWijkCard` het 30 keer opnieuw. Er wordt niet gecontroleerd of de speler nog in dezelfde wijk staat; na het sluiten van het overlay kan de kaart (en de Rikus-stem) alsnog voor een oude wijk verschijnen.
**Impact:** verkeerde/verlate “Nieuwe wijk”-kaart en stem; verwarrend.
**Fix:** breek de retry af bij een wijkwissel of vertrek, of check `currentWijk(w).name === wijk.name` vóór het tonen.
**Labels:** `impact-laag`, `kosten-S`.

### F20 — [Laag] Verkeerde propmodellen: de trekker-limo is een Escort en de jas is een doos

**Waar:** `game/js/cutscenes_akte2.js:233-234` (`limo: { kind: 'auto' }`), `game/js/cutscenemodels.js:12-21` (`auto` → `escort`), `game/js/cutscenes_akte4.js:466-468` (`jas: { kind: 'doos' }`), `:516` (`limo: { kind: 'auto' }`), vergelijk `game/js/cutscenes_akte4.js:739` (`M26.4` gebruikt `trekker` voor de limo).
**Wat/scenario:** Jelle’s “trekker-limo” wordt in M10 en M26.5 als de gewone Escapade gebouwd; in M26.4 staat hij opeens als trekker. De jas van Tammo in M23.3 is een kartonnen doos. De tankwagen in M07 is een bestelbus. Dat is niet fout in de zin van een crash, maar het is een visuele continuïteitsfout in de enscenering.
**Impact:** het herkenbare voertuig en de props kloppen niet met de scène; de grap/het beeld verliest kracht.
**Fix:** voeg een `limo`/`trekkerlimo`-model toe aan `PROP_SOURCES` (of gebruik `trekker` consequent), en kies voor een jas een `tas`/`koffer` of een eigen decor-soort.
**Labels:** `impact-laag`, `kosten-S`.

---

## Top 5 quick wins

1. **F4 — snelheids-, race-, heli- en pigeonpoort voor landmark/Ommelanden** (`cinematics.js:574-588`, `:532-543`): kleine check, voorkomt een onverwachte stop op de ringweg en een camera onder de duif.
2. **F8 — reset `skipHoldSince`/`skipShown` in `finish` en `begin`** (`cinematics.js:342-380`): één hold mag nooit twee scènes skippen.
3. **F10 — één `clearCinematicUi()` in `finish`/`skipAll`** (`cinematics.js:342-363`, `:1221-1227`): banner, timeScale, chip en hide-vlaggen netjes opruimen; meteen ook de load-tijdens-banner bug.
4. **F6 — wijk pas markeren na een geslaagde kaart/film, met kaart-fallback** (`cinematics.js:819-823`, `:897-908`): geen wijk meer die voorgoed stil blijft.
5. **F13 — `kit.dispose()` aanroepen in `buildScriptRun.dispose()`** (`cutscenehost.js:197-200`): de keukentextures/materialen netjes vrijgeven, zoals `intromontage.js:1348` al doet.

## Wat ik niet heb bekeken

- **Geen runtime, Electron, spel of testsuite gedraaid**: geen beeld, geen audio, geen schermafbeeldingen, geen echte prestatie- of streammeting. Alle visuele uitspraken zijn code-afgeleid en waar nodig als “niet runtime geverifieerd” gemarkeerd.
- **Geen schermlezer/contrastmeting**: de `aria-live`- en contrastbevindingen zijn code-/CSS-lezingen, geen test met NVDA/VoiceOver.
- **Geen `voice_coverage.mjs` uitgevoerd** en geen `cutpreview`-pagina geopend; ik heb `cutpreview.js`/`cutpreviewui.js` gelezen om de scènecatalogus en de previewregels te begrijpen. Welke opnamen precies ontbreken, is dus niet vastgesteld.
- **Niet alle scènedata in beeld**: `cutscenes_akte4.js` en `cutscenes_akte6.js` heb ik grotendeels gelezen; `cutscenes_akte6.js` zegt zelf “Not yet looked at in the game”. `cutscenes_akte1/2/3` en `cutscenes.js` zijn gelezen; de volledige verhaaldata (script.json, missionstory) alleen op de gebruikte punten.
- **Geen `game/world`-tegels**: de wereld is niet gebouwd in deze checkout, dus `roofAt`/`fitCamera` op echte tegels en de eerste-frame-streaming zijn niet getest.
- **Geen bestaande GitHub-issues geraadpleegd** (de opdracht stond issues alleen toe, niet verplicht); ik heb geen issue aangemaakt of gewijzigd.
- **Niet bekeken**: `desktop/main.js`, `.env`, de web-/Electron-shell, mobiel/touch in het echt, gamepad, alle ui-CSS buiten de cutscene-regels, en de volledige `intromontage.js` (alleen de relevante `playCinematic`/`setSub`/cleanup).
