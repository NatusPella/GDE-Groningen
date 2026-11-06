# Cutscenes in Samen spelen: statische review (multiplayer)

Review van de cutscene- en filmpjeslaag in Samen spelen: wat de gastheer ziet, wat een gast ziet, wie
welke rol krijgt, wat er bij onderbrekingen gebeurt, en wat er aan eerlijkheid en tests ontbreekt.

- **Repo/branch:** `C:\Users\abuis\GIT\GDE-Groningen`, `main`.
- **Stand van de werkboom (belangrijk):** de opdracht noemt HEAD `e5e8b712`, maar `git log` laat twee
  commits daarna zien (`41340dd4`, `400acbeb`) en de werkboom heeft niet-gecommitte wijzigingen, onder
  meer in `game/js/coopnet.js`, `game/js/coopplayers.js` en `game/js/coopspelers.js`. Ik heb de
  bestanden gelezen zoals ze **op schijf** staan, dus inclusief die wijzigingen.
- **Werkwijze:** statisch. Geen spel gedraaid, geen Electron, geen netwerk, geen testsuite, geen
  commits, niets aan `desktop/` en `.env` niet gelezen. Deze review is het enige nieuwe bestand.
- **Niet in beeld geverifieerd:** alles wat met waarneming te maken heeft (staan de balken goed, hoort
  de gast dezelfde stem, is de HUD echt bedekt). Waar ik alleen uit code en CSS concludeer, staat dat
  erbij.

## Kort antwoord op de zeven vragen

1. **Ziet een gast hetzelfde?** Voor een *scriptscène* (cutscenehost `playScript`) grotendeels wel: hij
   speelt dezelfde scène lokaal, met hetzelfde anker, dezelfde acteurs, dezelfde regels en dezelfde
   bedrijven (coopcut stuurt de def, de regels, de duur, het anker en de kaart). Maar: de gast mist de
   verhaalstem-opzet (`own`), waardoor zijn ondertiteltiming en scèneduur afwijken (bevinding 1); bij
   *filmpjes zonder script* (wijk, landmark, crash, wanted5, ommelanden, heist) ziet hij alleen zwarte
   balken en de regel van de gastheer, en bij `landmark`, `crash` en `wanted5` is er **geen regel**, dus
   ziet hij niets dan balken (bevinding 2). Host-only zijn dus alle `playCinematic`-momenten: de
   wijk-flyover, de landmark-orbit, de crash-replay, wanted5, de Ommelanden-scène, het
   openingsfilmpje-terugvalpad, de heist-getaway en -einde, en de uitslag-/bannerkaarten.
2. **Rolverdeling:** er is geen verdeling over spelers. Elke client speelt dezelfde hoofdrol (de rol die
   de gastheer meestuurt) en ziet de andere verhaalrol als metgezel; online-avatars staan nooit in de
   scène. Bij 2, 3 en 4 spelers ziet iedereen dus dezelfde twee (of meer) acteurs; spelers 3 en 4
   verdwijnen volledig. Dubbele acteurs worden verborgen (`cutsceneVerdeling`), dat werkt en is getest.
   Een gast "zonder rol" bestaat niet: zonder eigen save-rol wordt hij Tammo. De eigen speler staat in
   de scène als de hoofdrolacteur, nooit als zijn avatar (bevinding 12).
3. **Onderbrekingen:** de gastheer bepaalt of de groep de scène overslaat; een gast alleen zijn eigen
   weergave. De gast is onderworpen aan de klok van de gastheer (kwart seconde-berichten), maar een
   gast die zijn eigen pauzemenu opent bevriest zijn kopie en springt daarna bij (bevinding 5); een
   gast in een winkel, telefoon of minigame mist de scène helemaal omdat die achter het paneel
   doorspeelt (bevinding 6). Late join en herverbinden midden in een scène leveren alleen de laag op,
   niet de scène (bevinding 4). Bij een hostwissel of hostuitval midden in een scène is er geen
   scènestaat in de herstelmomentopname (bevinding 3).
4. **Eerlijkheid:** beloning en verhaalstap zijn per speler geregeld (#429/#452), maar de
   gebiedsverovering (#414) telt voor een gast **niet** mee en hij ziet de veroverkaart niet (bevinding
   9). Wijk-, landmark- en crashmomenten ziet hij niet of nauwelijks (bevinding 2). Een keuze of timing
   op het paneel mag hij meedrukken (#525), en de eerste geldige druk telt, ook als hij van de gast is.
5. **Bugs/randen:** stem- en tijddrift (1), geen scène na late join (4), springen na een menu (5),
   afgebroken eigen scène (7), onbereikbaar `cutvervang` (10), stil wegvallen van grote scènes (11),
   rollen die altijd dezelfde zijn (12), staging die niet meegaat (14). Geheugen/opruimen van de
   gastkopie zelf ziet er ordelijk uit: `run.dispose()` in `onEnd`, en `cutGastStop` bij het stoppen van
   de sessie (`coopnet.js:1612`); ik heb geen lek gevonden in dat pad.
6. **Ontbrekend:** zie de sectie "Ontbrekende en onnodig host-only momenten" onderaan.
7. **Testdekking:** zie bevinding 15 en de sectie "Testdekking".

## Bevindingen

### 1. [Hoog] De gast hoort een andere stem en ziet de ondertitels op een andere tijd

- **Waar:** `game/js/missionstory.js:1099` (`cineLines`, `own: true`), `game/js/missionstory.js:1117`
  (de gastheer speelt de verhaalstem zelf in de `shot`-callback), `game/js/cinematics.js:278-294`
  (`attachVoices`), `game/js/coopcut.js:25` en `:66` (het lijnenpakket), `game/js/cutscenehost.js:291-295`
  en `:313` (de gast roept `playCinematic` met die regels).
- **Wat/scenario:** een verhaalopdracht speelt zijn scène via `playStaged` → `playScript`, met
  `lines: cineLines(...)`. Elke regel krijgt `own: true`; daardoor slaat `attachVoices` de
  stemmentabel over en speelt de gastheer de opname uit de verhaalmap in zijn eigen `shot`. `cutPakket`
  bouwt de regels opnieuw op met alleen `speaker, text, at, dur, voice, radio` — **`own` valt weg**, en
  `cineLines` heeft `voice` nooit meegekopieerd. Bij de gast ziet `attachVoices` dus een gewone regel
  zonder `own` en zoekt in de 'lines'-bank (`lineVoiceFor`). Die bank bevat wél missionaire regels,
  bijvoorbeeld `"Tammo|En de Krolbrug?"` (`game/audio/voicelines/lines/manifest.json`, r. 5006). Als er
  een treffer is, zet `attachVoices` een `voice` en `vdur` op de regel, schuift `at` en `dur` op
  (r. 287-294) en verlengt `a.duration`. De scène zelf (`compileScene`) is op de gast echter met de
  óngeschoven regels opgebouwd.
- **Impact:** de gast hoort een andere opname dan de gastheer (de 'lines'-bank in plaats van de
  verhaalmap), zijn ondertitels lopen uit de pas met de animatie en met het beeld van de gastheer, en
  zijn kopie is langer dan de scène van de gastheer. De gastheer eindigt op zijn eigen duur en stuurt
  `cutend`; `cutGastStop` stopt de gast dan midden in zijn (langere) kopie, dus de laatste regel(s)
  kunnen wegvallen. Dit raakt elke missiescène met opgenomen tekst.
- **Fix:** `own` (en meteen `clue` en `card`) meenemen in `cutPakket` en `leesCutPakket`, of een
  expliciete vlag `stemKlaar: true` meesturen waarop `attachVoices` overslaat. Zet daarna een pure test
  op `cutPakket` → `leesCutPakket` → `attachVoices`-achtige logica (of exporteer de voice-resolver).
- **Labels:** `bug`, `audio`, `ondertitels`, `desync`, `#434`

### 2. [Hoog] Bij een filmpje zonder script ziet de gast geen titel, kaart of naam; bij drie momenten zelfs niets

- **Waar:** `game/js/coopworld.js:382-416` (`schoonScene`: alleen `filmpje`, `pauze`, `regel`, `keuze`,
  `paneel`), `game/js/coopscene.js:105-120` (de laag tekent alleen balken, "kijkt een filmpje", regel,
  keuze en paneel), `game/js/cinematics.js:1018-1028` (`playLandmark`: `kicker`/`title`, **geen**
  `lines`), `:1031-1051` (`tryCrashReplay`: **geen** `lines`), `:1053-1080` (`playWantedFive`:
  `kicker`/`title`, **geen** `lines`), `:546-567` (`playOmmelanden`: één regel), `:897-909` (`playWijk`:
  één regel).
- **Wat/scenario:** de gastheer opent een wijk-flyover (11 s), een landmark-orbit (3,8 s), een
  crash-replay (1,2 s), wanted5 (1,6 s) of de Ommelanden (8 s). `readHostScene` meldt alleen
  `filmpje: true` en eventueel de regel; de titel, de kicker, `big`, de naamkaart en de tint gaan niet
  mee. Bij `landmark`, `crash` en `wanted5` is er ook geen regel, dus de laag bestaat uit twee zwarte
  balken met "X kijkt een filmpje. Je wacht even." en verder niets.
- **Impact:** de gast weet niet wát hij mist: geen plaatsnaam bij een landmark, geen "Heel Grunn zit
  achter je aan" bij vijf sterren, geen crash-moment. Dat is precies de inhoud van die momenten. Het
  maakt de gast ook stuurloos: zijn invoer staat stil (`coopnet.js:1039`) en zijn wereld staat stil
  (de gastheer pauzeert), zonder dat hij ziet waarvoor.
- **Fix:** `kicker`, `title`, `big` en `accent` mee in `schoonScene` (met dezelfde lengtebegrenzing) en
  in `updateHostScene` als kaart tonen; bij een film zonder regels minstens de titel. Voor de drie
  kale momenten: geef ze een regel ("Je rijdt langs de Martinitoren") of maak er een scriptscène van.
- **Labels:** `bug`, `gast-ervaring`, `UI`, `#434`

### 3. [Hoog] Hostwissel of hostuitval midden in een scène: geen scènestaat in de herstelmomentopname

- **Waar:** `game/js/coophostwisselnet.js:63-69` (velden van `maakMomentopname`: ver, zaad, tijd,
  weerstaat, wanted, opdracht, spelers, kapot, voertuigen — **geen** scène, cinematic of cut-id),
  `:133` (de knop "Spel overdragen" wordt geweigerd zolang `sceneNu` een filmpje is), `game/js/story.js:515-531`
  (de opening is een keten van drie `playScript`-scènes via `cine.onEnd`), `game/js/coophold.js:23-34`
  (het wachtscherm op z-index 9000), `game/js/cinematics.js:408-434` (`updateCinematics` kent geen
  `coopHold`).
- **Wat/scenario:** de gastheer crasht of valt weg terwijl de opening (of een andere scène) loopt. De
  andere spelers zien het wachtscherm, maar hun eigen scènekopie loopt door: `updateCinematics` kijkt
  niet naar `world.coopHold`. De opvolger start de wereld uit de herstelmomentopname, waarin niets over
  de scène staat. De keten van de opening zit in `cine.onEnd` van de oude gastheer; de nieuwe gastheer
  heeft die callback nooit, dus bedrijf 2 en 3 starten niet meer. De gasten spelen hun kopie van
  bedrijf 1 af en daarna gebeurt er niets.
- **Impact:** een verhaalreeks breekt halverwege af, zonder melding, en de nieuwe gastheer en de gasten
  zitten op verschillende plekken in het verhaal. De blokkade bij r. 133 dekt alleen de *geplande*
  overdracht, niet de uitval.
- **Fix:** zet in de hold meteen `skipCinematic()` (of bevries de cinematics bij `coopHold`), en zet in
  de momentopname een minimale scènestaat (`cutId`, `defId`, `t`, `rol`, `bedrijf`) zodat de nieuwe
  gastheer de reeks kan hervatten of netjes kan afsluiten. Mislukt hervatten, stuur dan `cutend` en
  meld het.
- **Labels:** `bug`, `#439`, `#434`, `hostwissel`

### 4. [Midden] Wie midden in een scène aansluit of opnieuw verbindt, krijgt alleen de laag, niet de scène

- **Waar:** `game/js/coopnet.js:321-342` (`onJoin`), r. 331 (alleen `{ k: 'scene', ...sceneNu }`),
  `game/js/coopcut.js:111-121` (`cutHostStart` stuurt de stukken één keer; er wordt niets bewaard),
  `game/js/coopscene.js:93` (de laag verschijnt als `coopCutBezig == null`).
- **Wat/scenario:** een gast sluit aan terwijl de gastheer in een scriptscène zit. De host stuurt de
  scène-status (filmpje/regel/keuze) naar de nieuwe plek, maar niet het `cut`-pakket; dat is al
  verstuurd en wordt nergens bewaard. De gast ziet dus de laag met de regel van dit moment, en verder
  niets. Bij een scène zonder regels op dat moment (tussen twee zinnen, of een kale film) ziet hij
  alleen balken. Hetzelfde geldt na een herverbinding: `startClient` → `onJoin` → dezelfde beperking.
- **Impact:** de late gast mist de scène waar hij net bij kwam; erger: bij een *verhaalstap* kan hij
  daarna een keuze of timing van de gastheer meemaken zonder de context.
- **Fix:** bewaar op de gastheer het laatste pakket plus de tijd (`n.cutLaatste = { id, pakket, t }`) en
  stuur dat in `onJoin` opnieuw (de gast springt via `cutGastTempo` meteen naar de juiste tijd). Is het
  pakket te groot, stuur dan een korte "scène loopt"-melding met de titel.
- **Labels:** `bug`, `late-join`, `#434`

### 5. [Midden] Een gast in zijn pauzemenu of op de kaart: zijn scène staat stil en springt daarna bij

- **Waar:** `game/js/cinematics.js:424-434` (`frozen = isPauseMenuOpen() || isMapOpen()`; de tijd loopt
  alleen als `!frozen`), `:450-453` (de `shot`-callback loopt **buiten** die blokkade en roept
  `cutGastTik` aan), `game/js/coopcut.js:53-60` (`CUT_SPRONG = 1`: verder dan 1 s uit de pas = een
  sprong), `game/js/coopcut.js:140-147` (`cutGastTik` → `stel.tijd`).
- **Wat/scenario:** de gast opent Esc of de kaart terwijl de gastheer een scène speelt. Zijn kopie
  bevriest (de pauzelaag van 40 staat boven `#cine` van 15), maar de gastheer speelt door. Elke frame
  blijft `cutGastTik` de tijd van de gastheer volgen; zodra de gast zijn menu sluit, is het verschil
  groter dan 1 s en zet `setCinematicTime` hem midden in de scène. Alle zinnen tussen zijn menu en dat
  moment zijn overgeslagen, en de stem van de dan lopende zin start alsnog.
- **Impact:** de gast mist een willekeurig deel van de scène, zonder waarschuwing; de gastheer merkt
  niets. Bij een lange scène (de opening, een missiescène) is dat zo een halve scène.
- **Fix:** laat een gedeelde scène niet bevriezen door het menu van de gast (haak `frozen` af voor
  `world.coopCutBezig != null` en pauzeer de invoer in plaats van de tijd), of toon bij terugkomst
  "Je hebt een deel van de scène gemist" en speel geen halve zin in. Het eenvoudigst: de gast kan zijn
  menu pas openen als de scène klaar is (zoals bij de opening).
- **Labels:** `bug`, `UI`, `#434`

### 6. [Midden] Een gast in de winkel, de telefoon of een minigame mist de scène volledig

- **Waar:** `game/js/cinematics.js:424` (`frozen` kent alleen pauzemenu en kaart, niet `isShopOpen()`,
  de telefoon, de garage, de boerderij of een activiteitenscherm), `game/js/shopui.css:3` (winkel
  z-index 41), `game/js/hud_panel.css:317-320` (`#cine` z-index 15), `game/js/coopcut.js:195-212`
  (`cutGastSpeel` controleert niet wat de gast op dat moment doet).
- **Wat/scenario:** de gastheer start een scène terwijl de gast in de winkel staat of een pannenkoek
  bakt. `playScript` heeft prioriteit 4 en neemt de cinematic over, maar de winkel/minigame-laag blijft
  erboven (of de minigame pakt de invoer). De scène loopt gewoon door achter het paneel: de tijd
  verstrijkt, de stemmen spelen, de ondertitels wisselen onzichtbaar, en de gast ziet er niets van.
  `cutGastSpeel` heeft geen enkele guard op `world.activityGame`, `world.padelGame`, een open winkel of
  de telefoon.
- **Impact:** de gast is de scène kwijt en heeft niets gemerkt; bij de gastheer is alles goed gegaan.
  Bij een keuze of timing op het paneel kan de gast daarna meedrukken op iets wat hij niet zag.
- **Fix:** sluit of pauzeer die schermen wanneer `coopCutBezig` begint (of wanneer een `cut`-pakket
  binnenkomt), en weiger een scène-start bij een gast die in een eigen activiteit zit tot die klaar is
  — met dezelfde soort melding als `verzoekBlok` ("Er loopt een filmpje").
- **Labels:** `bug`, `UI`, `gast-ervaring`

### 7. [Midden] De scène van de gastheer kapt de eigen scène van de gast af

- **Waar:** `game/js/cutscenehost.js:291-293` (elke `playScript`-kopie krijgt `priority: 4`),
  `game/js/cinematics.js:249-261` (`playCinematic`: hogere prioriteit → `finish(true, true)`),
  `game/js/cinematics.js:897-909` (`playWijk`, prioriteit 1), `:1018-1028` (`playLandmark`, 1),
  `:674-678` (`playGameStart`, 3), `game/js/missionstory.js:1106-1108` (missiescène, 3).
- **Wat/scenario:** een gast kijkt net zijn eerste wijk-flyover of een landmark-moment (prioriteit 1)
  of de missie-intro (3) wanneer de gastheer een scriptscène start. De gastkopie heeft prioriteit 4 en
  vervangt die, met `finish(true, true)`; het eigen moment van de gast wordt afgebroken en komt niet
  terug (de filmpjes zijn momentopnames, geen wachtrij).
- **Impact:** de gast verliest zijn eigen wijk-/landmark-/intro-momenten aan elke scène van de
  gastheer, terwijl de gastheer die van hem nooit verliest. Dat is eenrichtingsverkeer in de
  "gelijkwaardige spelers"-regel.
- **Fix:** geef de gastkopie de prioriteit uit het `cine`-pakket in plaats van altijd 4 (de gastheer
  kan dan 1 of 2 meesturen voor een scène die mag wachten), of laat `playCinematic` het eigen moment
  eerst afmaken en de gastkopie in de wachtrij zetten (`queue: true`) met de tijd die de gastheer
  inmiddels heeft.
- **Labels:** `ontwerp`, `eerlijkheid`, `#434`

### 8. [Midden] De gast staat stil voor een film die hij niet ziet

- **Waar:** `game/js/phone.js:424-431` (`world.uiHard = cinematicPausesGameplay()`), `game/js/main.js:672-693`
  (`world.paused`; de wereld van de gastheer staat stil bij een film), `game/js/coopnet.js:1039`
  (de invoer van de gast wordt op nul gezet zolang `world.coopScene.filmpje`), `game/js/cinematics.js:563`
  (Ommelanden 8 s), `:905` (wijk 11 s).
- **Wat/scenario:** de gastheer krijgt een wijk-flyover van 11 s. Zijn wereld pauzeert; de lichamen van
  de gasten worden in die wereld gesimuleerd en staan dus ook stil. De gast ziet alleen de laag; zijn
  invoer is geblokkeerd, en hij ziet niet waarvoor. Staat hij 500 m verderop te hengelen (eigen focus,
  #429), dan staat hij daar 11 s stil.
- **Impact:** de gast betaalt met tijd en vrijheid voor een moment dat alleen de gastheer ziet. Bij
  elkaar opgeteld (elke eerste wijk, elk landmark, elke crash) is dat een merkbare hapering in het
  spel van de gast.
- **Fix:** pauzeer de wereld alleen voor scènes die de gasten ook echt spelen (het `cut`-pad), of
  pauzeer per groep: de groep van de gastheer staat stil, een losse groep loopt door. Minimaal: zet in
  de laag wat er gebeurt ("Tammo bekijkt de Martinitoren"), zodat de wachttijd betekenis heeft.
- **Labels:** `ontwerp`, `eerlijkheid`, `#429`

### 9. [Midden] Gebieden veroveren (#414) telt niet voor de gast, en de veroverkaart ziet hij niet

- **Waar:** `game/js/gebiedenlive.js:10-11` (comment: "een gast draait updateGameplay niet; zijn missies
  en bijbanen komen dus alleen binnen via wat hij zelf doet, en een gedeelde beloning telt niet voor een
  gebied"), `game/js/loopbaanlive.js:150-163` (`loopbaanDeel` stuurt `vak`, `basis`, `xp`; geen
  gebiedssleutel), `game/js/loopbaanlive.js:190-196` (`loopbaanGast` telt alleen geld en punten),
  `game/js/gebiedenlive.js:121-135` (de meldingen "x van y gedaan" en "veroverd" gaan via
  `world.addMessage` op het apparaat van de gastheer).
- **Wat/scenario:** een gast speelt mee met de missie van de gastheer. De gastheer krijgt de
  gebiedsvoortgang en de veroverkaart; de gast krijgt zijn geld en zijn verhaalstap, maar geen
  gebiedspunt en geen melding. Zijn eigen "Veroverd"-laag blijft dus achter, ook al deed hij hetzelfde
  werk.
- **Impact:** oneerlijk ten opzichte van #429 ("volledige beloning en eigen voortgang"): geld en verhaal
  wel, verovering niet. De gast kan zijn eigen kaart niet volledig krijgen door mee te spelen; dat is
  precies het soort verschil dat de visie wil vermijden. Het staat als comment in de code, maar niet in
  `docs/COOP-GAST.md`.
- **Fix:** stuur bij een gedeelde beloning de gebiedssleutel(s) mee (`m:<missie>`, `u:<plek>`) en laat
  `loopbaanGast` die op het eigen profiel tellen; of tel op de gast de missies die hij meespeelde bij
  het bijbehorende gebied. Zet de regel in `docs/COOP-GAST.md`.
- **Labels:** `eerlijkheid`, `#414`, `#429`, `voortgang`

### 10. [Midden] `cutvervang` is onbereikbaar en wordt door geen enkele gast gelezen

- **Waar:** `game/js/cutscenehost.js:243-264` (de uitleg en `cutHostEinde`), r. 258
  (`if (skipped || !replaced) return cutHostEnd(...)`), r. 263 (`announce({ k: 'cutvervang', ... })`),
  `game/js/cinematics.js:253-254` (`playCinematic`: `finish(true, true)`), `game/js/cinematics.js:342-363`
  (`finish` geeft `skipped` en `replaced` door aan `onEnd`), `game/js/coopnet.js` (geen
  `case 'cutvervang'`), `scripts/coopcut_test.mjs:144-188` (de test roept `cutHostEinde` direct aan met
  `{ skipped: false, replaced: true }`).
- **Wat/scenario:** de enige plek in het spel die `replaced = true` doorgeeft is
  `playCinematic` → `finish(true, true)`, en die geeft tegelijk `skipped = true`. `cutHostEinde` ziet
  `skipped` en gaat dus altijd naar `cutHostEnd`, dat `cutend` met `skip: true` stuurt. Het
  `cutvervang`-bericht wordt in het spel nooit verstuurd; de gasten kennen het niet (en de test
  bevestigt dat een gast het laat liggen). De test dekt dus een combinatie die de engine niet maakt.
- **Impact:** de belofte in de comment en in #502 ("vervangen is geen overslaan") klopt niet met het
  gedrag: een vervangen scène komt bij de gasten aan als een overslaan. Vandaag is het verschil klein
  (er volgt meteen een nieuwe scène), maar het protocol heeft een dood bericht en een test die een
  onmogelijke toestand controleert.
- **Fix:** laat `finish` het onderscheid maken (`finish(true, false)` bij een gebruiker-skip,
  `finish(false, true)` bij vervangen) en `cutHostEinde` daarop laten vertrouwen; voeg in `coopnet.js`
  een `case 'cutvervang'` toe die alleen de eigen kopie opruimt als het id klopt, of haal het bericht
  en de testtak weg.
- **Labels:** `bug`, `protocol`, `dode-code`, `#502`

### 11. [Midden] Een scène groter dan 32.000 tekens komt stil niet aan

- **Waar:** `game/js/coopcut.js:11-13` (`CUT_CHUNK = 800`, `CUT_MAX_CHUNKS = 40`, `CUT_MAX_CHARS`),
  `:32-38` (`cutStukken` geeft `[]` als het pakket te groot is), `:111-121` (`cutHostStart` geeft dan
  `false`), `game/js/cutscenehost.js:335` (het resultaat wordt niet gebruikt; alleen `cutSpoor` legt
  het vast).
- **Wat/scenario:** een scène met veel acteurs, rekwisieten, shots en regels kan boven de 32 kB komen.
  De gastheer speelt hem gewoon; de gasten krijgen niets, zonder melding. De gast ziet dan alleen de
  laag (als de host een filmpje meldt) of helemaal niets. Ik heb **niet geverifieerd** of een van de
  bestaande defs nu boven de grens komt; de grootste bestanden (`cutscenes_akte4.js` is 44 kB bron voor
  meerdere scènes) maken het niet onmogelijk.
- **Impact:** een stille, onzichtbare storing die per scène kan verschillen; de gastheer merkt het niet
  en de gast weet niet beter.
- **Fix:** meet bij de start (of in een pure test) de `JSON.stringify` van elke def en laat de test
  falen boven de grens; verklein het pakket (veel defs staan ook in de bundel van de gast — stuur dan
  een `defId` in plaats van de def) of stuur een melding naar de gastheer als het niet past.
- **Labels:** `bug`, `protocol`, `risico`

### 12. [Laag] Rollen: iedereen speelt dezelfde hoofdrol, de eigen avatar staat nooit in de scène

- **Waar:** `game/js/coopcut.js:19-29` en `:111-121` (`rol` komt van de gastheer; `cutPakket` krijgt
  zelf geen `rol` mee, dus `cutHostStart` neemt `hoofdspeler(w).character`), `:155-161`
  (`cutsceneScene`: `hoofdrol = p.rol`, `avatarsZichtbaar: false`), `:202` (`tijdelijk` wordt alleen in
  het spoor gezet), `game/js/cutscenehost.js:118-120` (`buildScriptRun` gebruikt de verdeling),
  `game/js/coopfigures3d.js:54-67` (alle figuren verborgen tijdens een scène), `game/js/cooproles.js:140-148`
  (`eigenVerhaalrol` valt terug op `tammo`).
- **Wat/scenario:** de gastheer stuurt de rol van de scène mee (de zijne). Elke client — ook een gast
  met een Tessa-save — speelt die hoofdrol en ziet de andere verhaalrol als metgezel. De eigen
  online-avatar van de gast staat nooit in de scène: die is verborgen, en de hoofdrolacteur is een
  computerfiguur. Bij 3 en 4 spelers verdwijnen de andere spelers volledig uit het beeld; niemand ziet
  zijn eigen figuur terug. De `tijdelijk`-vlag maakt het niet zichtbaar voor de speler.
- **Impact:** een Tessa-speler wordt stilzwijgend Tammo in elke Tammo-scène, en bij een viertal is de
  scène een film over twee personages waar de andere twee niet in voorkomen. Dat is de gedocumenteerde
  keuze (#455, `docs/COOP-GAST.md:33-36`), maar de speler krijgt geen enkele aanwijzing en er is geen
  uitzondering voor de gast die zijn eigen rol wél in beeld zou willen zien.
- **Fix:** toon één keer een regel ("Je speelt deze scène als Tammo") of een klein naamkaartje bij de
  hoofdrol; overweeg de eigen avatar als figurant toe te voegen bij 3-4 spelers. Test de rolwissel ook
  met een gast die een andere save-rol heeft (nu alleen in `coopcut_test.mjs` met een nep-profiel).
- **Labels:** `ontwerp`, `#455`, `UI`

### 13. [Laag] De laag: dode code en een veld dat niemand meer toont

- **Waar:** `game/js/coopscene.js:6` (`pauzeTekst` geïmporteerd), `:38` (`pauze` berekend), `:108`
  (`eigenMenu` berekend maar niet gebruikt), `:109` (`const pauze = ''`), `game/js/coopworld.js:384`
  (`pauze` gaat nog mee in `schoonScene`), `:427` (`pauzeTekst` geëxporteerd).
- **Wat/scenario:** de pauzemelding is op verzoek van de eigenaar weggehaald, maar het veld reist nog
  mee in elk `scene`-bericht en de dode variabelen staan er nog. `readHostScene` blijft `pauze`
  berekenen en `sceneBericht` stuurt hem bij elke wijziging. Verder verbergt de laag de HUD niet
  (`body.cine-hide-hud` hoort bij een eigen cinematic); of de 11%-balken de HUD-zones echt afdekken heb
  ik niet in beeld gecontroleerd.
- **Impact:** klein: extra bytes en verwarring bij de volgende lezer; de laag en de HUD kunnen elkaar
  in de weg zitten (top- en onderbalk bedekken een deel van de HUD, de meldingen in het midden niet).
- **Fix:** haal `pauze` uit `schoonScene`, `SCENE_LEEG` en `readHostScene` (of documenteer waarom het
  blijft), en verwijder `eigenMenu` en de ongebruikte import.
- **Labels:** `opruimen`, `UI`

### 14. [Laag] De staging van de gastheer gaat niet mee: `fit`, `env`, `shotOverride`, `frame`, `clue`, `card`

- **Waar:** `game/js/coopcut.js:17` (`kaart` bewaart alleen `id`, `kicker`, `title`, `cardFor`, `tint`),
  `:22-30` (`cutPakket`), `game/js/cutscenehost.js:282-283` (`env` en `fit`), `:319-321`
  (`shotOverride`), `:308-322` (`cine.frame`), `game/js/missionstory.js:1113-1120` (naamkaarten,
  aanwijzingen en stemmen in de `shot`-callback), `:1233` (`showNameCard(cur.card)`).
- **Wat/scenario:** de gastheer speelt de opening met `fit: { radii, ground }`; de gast krijgt alleen
  het eindanker en roept `fitAnchor` opnieuw aan met standaardopties. Een scène met een handgemaakte
  camera (de vallende vlag, M24.3, via `shotOverride`) of met naamkaarten en aanwijzingen in
  `cine.frame` verliest die laag bij de gast: hij ziet de scriptcamera, geen naamkaart en geen
  aanwijzingssting.
- **Impact:** kleine beeldverschillen (de gast staat een paar meter anders of in een gebouw als de
  standaard-fit anders uitpakt) en gemiste naamkaarten/aanwijzingen; niet in beeld geverifieerd hoe
  groot dat in de praktijk is.
- **Fix:** stuur `fit` en `env`-soort mee (of het eindanker plus "niet meer fitten"), en geef
  `cine.card`/`clue` een plaats in het lijnenpakket in plaats van alleen in de host-frame.
- **Labels:** `bug`, `staging`, `#434`

### 15. [Laag] Geen test dekt de gast-kant van een scriptscène

- **Waar:** `scripts/coopcut_test.mjs` (het pakket, de stukjes, het tempo, de rolverdeling, het einde;
  roept `playScript` nooit als gast aan), `scripts/coopcheck434_test.mjs:184-194`
  (`cutsceneVerdeling`), `scripts/coopnet_test.mjs:350-373` (de laag, laat aansluiten, invoer stil),
  `scripts/coopworld_test.mjs:180-185` en `scripts/cooppaneel_test.mjs:48-67` (`sceneBericht`),
  `scripts/coop/testbank.mjs` (suite `opening`) en `scripts/coop/playtest.phases.js`
  (fase `opening`: "samen het openingsfilmpje, de host slaat over", `docs/COOP-TESTBANK.md:70`).
- **Wat/scenario:** de bestaande tests dekken de pure kern goed: chunking, tempo, rollen, de laag, late
  join, het paneel. Maar geen enkele test speelt een *missiescène* (met `own`-regels) door
  `cutPakket` → `leesCutPakket` en controleert of de gast dezelfde regels, tijden en duur houdt; geen
  test controleert `cutvervang` aan de gastkant; geen test controleert een pakket boven de grens; geen
  testbankstap speelt een verhaal- of missiescène met een gast mee (de fase `opening` is de opening, en
  `gastkant` test "een filmpje" via de laag, niet de cutscene).
- **Impact:** de duurste fouten uit deze review (stem/tijddrift, late join, hostwissel) zouden met een
  pure test of één testbankstap zichtbaar zijn geworden.
- **Fix:** voeg een pure test toe in `scripts/coopcut_test.mjs` die een `playStaged`-achtige regel met
  `own: true` door het pakket haalt en bewijst dat `own`/`voice` en de duur gelijk blijven; een test
  voor `cutHostEinde` met de echte `finish`-combinatie; een testbankstap "missiescène met een gast"
  (J bij Meedoen, de gast ziet dezelfde regels en dezelfde duur) in `scripts/coop/testbank.mjs`; en een
  test die alle defs tegen `CUT_MAX_CHARS` legt.
- **Labels:** `test`, `#434`, `#439`

## Spelregels voor cutscenes in Samen spelen

1. **De scène is data, de gastheer is de klok.** Elke client speelt dezelfde scène lokaal, uit hetzelfde
   pakket (def, regels, duur, anker, rol, kaart); de gastheer stuurt alleen zijn tijd, niet het beeld.
   Wat niet in het pakket past, hoort niet in de scène.
2. **Eén rol per speler, niemand dubbel.** De scène tekent elke verhaalrol één keer; een tweede kopie
   of alias gaat op de verberglijst. De eigen avatar van een speler staat nooit in de scène, en een
   speler zonder rol kijkt mee in plaats van een dubbel personage te worden.
3. **Overslaan is van de groep, kijken is van jou.** De gastheer beslist of de scène voor iedereen
   stopt; een gast beslist alleen over zijn eigen weergave. Bij een keuze of timing telt de eerste
   geldige druk, van wie dan ook (#525); niemand kan de stap van een ander laten hangen.
4. **Wat de gastheer ziet, ziet de gast.** Titel, kaart, naam, ondertitel, stem en timing horen aan
   beide kanten gelijk te zijn. Is een moment bewust host-only, dan zegt de laag wat de gast mist; een
   lege laag met alleen balken is geen antwoord.
5. **Geen stille onderbreking.** Een scène start niet achter een menu, een winkel, een minigame of een
   eigen filmpje van een gast zonder dat hij het merkt; en hij stopt niet stil bij een hostwissel,
   uitval, late join of herverbinding. Elk van die gevallen heeft een antwoord: opnieuw insturen,
   overslaan, of eerlijk melden.
6. **De wereld staat alleen stil voor een scène die iedereen ziet.** Een film die alleen de gastheer
   bekijkt, mag de gasten niet 11 seconden stilzetten zonder dat zij iets zien.
7. **Voortgang en beloning per speler (#429).** Wie meespeelt krijgt dezelfde stap, hetzelfde geld en
   dezelfde eer — ook de gebiedsverovering van #414 telt mee voor de gast, en wat de gast zelf doet
   telt in zijn eigen profiel, niet in dat van de gastheer.

## Ontbrekende en onnodig host-only momenten

**Wat een gast zou moeten zien maar niet (goed) ziet:**

- Alle `playCinematic`-momenten: wijk-flyover, landmark, crash-replay, wanted5, Ommelanden, de
  heist-getaway en het heist-einde. Hij ziet balken en (soms) één regel; titel, kaart en naam mist hij.
- De drie kale momenten (`landmark`, `crash`, `wanted5`): geen regel, dus geen enkele tekst.
- Naamkaarten en aanwijzingen uit een missiescène (`cine.frame`), en de handgemaakte camera
  (`shotOverride`).
- De uitslag-/beloningskaart (`showBanner`) van een opdracht: de gast krijgt een regel tekst via het
  `uitslag`-bericht, geen kaart.
- De veroverkaart en de "veroverd"-melding (#414).
- De opening: die gaat wél goed (drie bedrijven, de gast speelt ze), maar hij stopt bij een hostwissel
  (bevinding 3).

**Onnodig host-only (kan een scriptscène of een meegestuurd veld worden):**

- De heist-getaway en het heist-einde: ze hebben al regels en een camera; ze zijn met `playCinematic`
  gebouwd terwijl de museumscènes wél via `cutscene` gaan.
- De missie-intro/outro-kaarten met `big` en `title`: dezelfde velden als `cine.kicker/title` kunnen mee.
- De wijk- en landmark-momenten: met een `title`-veld in `sceneBericht` is de gast al geholpen zonder
  dat hij de camera hoeft te volgen.

**Samen-spelen-momenten zonder filmpje (wens, geen bug):**

- Het begin van een opdracht ("Meedoen?") en de uitslag hebben geen gedeeld moment; de gast ziet een
  regel tekst.
- Een bijbaan of wedstrijd die door een gast gestart wordt, heeft geen gedeelde aftrap.
- Het neergaan van een medespeler in PvP heeft geen gedeeld beeld (en bloed wordt nog niet getekend,
  constitutie 6 staat het toe).

## Top 5 quick wins

1. **`own` (en `clue`/`card`) mee in het lijnenpakket** (`coopcut.js:25` en `:66`). Eén veld, en de
   stem- en tijddrift van bevinding 1 is weg; meteen een pure test erop.
2. **`kicker`/`title`/`big` mee in `sceneBericht` en in `updateHostScene` tonen** (`coopworld.js:382-416`,
   `coopscene.js:110-119`). De gast weet dan wat hij mist; de drie kale momenten krijgen een titel.
3. **Het laatste `cut`-pakket bewaren en bij `onJoin` opnieuw sturen** (`coopnet.js:331`,
   `coopcut.js:111-121`). Lost late join en herverbinden in één keer op.
4. **De hold en een menu laten ingrijpen op de scène** (`coophold.js`/`cinematics.js:424-434`): bij
   `coopHold` de cinematic stoppen of bevriezen, en een gedeelde scène niet door het menu van de gast
   laten bevriezen. Dat maakt bevinding 3 en 5 meteen een stuk minder erg.
5. **`cutvervang` eerlijk maken of weghalen** (`cinematics.js:342-363`, `cutscenehost.js:254-264`,
   `coopnet.js`). Klein, en het haalt een misleidende comment, een dood bericht en een test die een
   onmogelijke toestand dekt weg.

## Testdekking (wat er nu is)

- **Puur, de kern:** `scripts/coopcut_test.mjs` dekt `cutPakket`, `cutStukken` (en de codec/Reliable-rij),
  `nieuwCutVerzamelaar`, `cutHostStart/End/Tik`, `cutGastTempo/Tik`, `geen`/`gastCine`,
  `cutsceneScene`, `cutsceneVerdeling`, `acteurRol`, `cutsceneSpeelt/Klaar` en het `cutvervang`-pad.
- **Rol en laag:** `scripts/coopcheck434_test.mjs:184-194` (elke rol één keer),
  `scripts/coopnet_test.mjs:350-373` (de laag, late join, invoer stil), `scripts/coopworld_test.mjs:180-185`
  en `scripts/cooppaneel_test.mjs:48-67` (`sceneBericht`/`schoonScene`).
- **Testbank/playtest:** suite `opening` in `scripts/coop/testbank.mjs` en de fase `opening` in
  `scripts/coop/playtest.phases.js` ("samen het openingsfilmpje, de host slaat over",
  `docs/COOP-TESTBANK.md:70`); `gastkant` test "een filmpje" als laag, niet als scriptscène.
- **Wat ontbreekt (concreet):** een pure test op `cutPakket` → `leesCutPakket` met `own: true` (bevinding
  1); een test op `cutHostEinde` met de echte `finish`-combinatie (bevinding 10); een test dat elke def
  onder `CUT_MAX_CHARS` blijft (bevinding 11); een test die de gebiedssleutel bij een gedeelde beloning
  controleert (bevinding 9); en een testbankstap "missiescène met een gast" plus "late join midden in
  een scène" (bevinding 4 en 15). Een eigen `scripts/coopscene_test.mjs` bestaat niet; de DOM-kant van
  de laag is alleen indirect gedekt.

## Wat ik niet heb bekeken

- **Geen runtime:** geen spel, geen tweede scherm, geen Electron, geen netwerk, geen testsuite. Alles
  is uit de code, de CSS en de docs gelezen; visuele indrukken (balken, kleuren, HUD-bedekking) zijn
  niet gecontroleerd.
- **Geen audio beluisterd:** ik heb alleen vastgesteld dat de 'lines'-bank missionaire regels bevat
  (`game/audio/voicelines/lines/manifest.json`) en dat de verhaalmap een eigen bank heeft
  (`missionstory.js:40`); of de twee opnamen voor dezelfde regel identiek klinken, weet ik niet.
- **De 32 kB-grens** heb ik niet gemeten: ik weet niet of een bestaande def er nu overheen gaat.
- **Hostwissel en netwerk** heb ik alleen in de code gevolgd (`coophostwisselnet.js`), niet met een
  echte overdracht; de interactie met `desktop/` en de TCP-kant heb ik niet bekeken.
- **`fitAnchor`** heb ik niet doorgerekend met standaardopties, dus de grootte van het staging-verschil
  in bevinding 14 is een vermoeden, geen meting.
- **De PvP-arena (#454)**, chat/voice (#451) en de hostloze gastheer (#450) vallen buiten deze review;
  ik heb ze alleen genoemd waar ze de cutscenelaag raken.
- **Issues:** ik heb #414 en #435 opgezocht; #279, #318, #376, #434, #439, #454 en #429 ken ik alleen
  uit de code en de docs (de `gh`-tool was halverwege de sessie niet meer beschikbaar door een
  sandboxfout). Geen GitHub-issues aangemaakt of gewijzigd.
