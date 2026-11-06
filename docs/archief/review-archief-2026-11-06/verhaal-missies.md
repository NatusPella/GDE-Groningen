# Review verhaal, missies en minigames

## Dekking

Diep gelezen (functie plus aanroepers): `game/js/missions.js` (ketenhouder 227-346, `initMissions`
268-320, `setNextMission`/`markMissionCompleted` 605-631, `startMissionVoorGast` 672-702,
`getMissionProgress`/`setMissionProgress` 704-744, `succeed` 1138-1213, `fail`/`endInFailure`
1247-1281, `startMission` 1690-1797, `updateRetry` 2005-2036, `updateMissions` 2038-2210,
`enterStage`/`saveCheckpoint`/`resumeFromCheckpoint`/`nextStage` 2596-2716,
`updateStages` 3336-3629 en de stage-updates 3632-3733, `requirements` 391-580,
`releaseMissionVehicle`/`handBack`/`rideFirst` 958-1090), `game/js/story.js` (state, `currentStep`,
`markDone`, `skipCurrent`, `updateStory`, `getStorySave`/`applyStorySave`, `updateHomeWait`),
`game/js/storyarc.js` (facade, `stepDone`, `nextStoryStep`, loopbaan-poort), `game/js/missionstory.js`
(`runScene`, `playStaged`, `playStoryIntro`/`playStoryOutro`/`playStoryFail`, `cleanupRun`,
`playEndingShot`), `game/js/heist.js` (start/stage/rollen/O-skip/eindshot, niet de volledige
camera/bewaker-details), `game/js/heistrollen.js` (volledig), `game/js/sidejobs.js` (376-795),
`game/js/bakeround.js` (volledig), `game/js/coopgast.js:199-221`, `game/js/coopmissie.js` (181-283),
`game/js/coopverhaal.js` (volledig), `game/js/heistrollen.js` + `game/js/coopbeloning.js`,
`game/js/stagegroep.js`, `game/js/spelersregister.js` (101-164), `game/js/achievementtracker.js`
(medaille-run 380-451), `game/js/cinematics.js` (`playCinematic`/`finish`/`skipCinematic` 249-363),
`game/js/coopglue.js:86-117`.

Niet diep gelezen (eerlijk): `padel.js`/`padelmatch.js`, `arcadeplane.js`, `regatta.js` en de
`pg_*`-minigames — de gevraagde steekproef van 3-5 complexe minigames is er niet van gekomen;
`pigeonmode.js` alleen op API-niveau (`startPigeonMode`/`stopPigeonMode`/`getPigeonFlight`) en via de
gebruiker `updatePigeonStage`; `storyarc_nieuw.js` alleen als facade plus steekproeven op
missiedata; de dialoogtabellen van `missionstory.js` en `cutscenes_akte*`; `intromontage.js`;
`achievements.js` buiten het medaillepad; `coopnet.js` alleen op de belonings- en rolpaden;
`storydata/script.json` uitsluitend als structuur (via de spec). Geen testsuite, geen Electron, geen
spel gedraaid.

## Bevindingen (op ernst)

### [Hoog] `bestuurInvoer` leest `world.coopFigures` als array terwijl het een object is (Al gemeld: #555)
- **Waar:** `game/js/coopgast.js:217-219`; aanroepers `game/js/heliflight.js:243` en `game/js/planeflight.js:155`.
- **Scenario:** `world.coopFigures` is een object per slot (`game/js/coopclient.js:17`,
  `game/js/coopnet.js:236` en `:249` zetten `{}`). `bestuurInvoer` doet `figs = world.coopFigures || []`
  en daarna `figs.slice(1)`; zolang `coopWielSlot` leeg is — de normale stand — is `.slice` geen functie.
  De eerste frame dat de gastheer een helikopter (H15) of een vliegtuig bestuurt, gooit de simulatie
  een `TypeError`.
- **Impact:** vliegen is met een gestarte sessie onbruikbaar. Dat geldt ook voor een sessie van één
  speler: `coopnet.js:236` zet de figurenlijst al bij het starten van de sessie op `{}`, dus #554's
  sessie-van-één is genoeg. De fout gooit midden in de frame-update, dus dezelfde frame sneuvelt ook
  wat erna komt (HUD, missievoortgang).
- **Aanvulling op #555:** de bug zit in precies één lezer; alle andere lezers doen het goed
  (`Object.values` in `businterieur3d.js:97`, `coopentities3d.js:72`, `coopfigures3d.js:58`, of
  indexeren zoals `heistrollen.js:177`). Er is geen test op `bestuurInvoer` (geen treffer in
  `scripts/`), waardoor dit niet opviel. Twee aanroepers delen dezelfde fout, dus één fix dekt heli én vliegtuig.
- **Fix:** `const figs = Object.values(world.coopFigures || {});` en dan
  `world.coopWielSlot != null ? [world.coopFigures[world.coopWielSlot]] : figs.filter((f) => f && f.slot >= 1)`,
  plus een pure test met een object van twee figuren en met `coopWielSlot` gezet.
- **Zekerheid:** zeker.

### [Midden] Mislukte start van een gast-opdracht laat de missieketen van de gastheer op de opdracht van de gast staan
- **Waar:** `game/js/missions.js:672-688` (met name `:676`, `:684`, `:685`), bereikt via `game/js/coopglue.js:97`.
- **Scenario:** een gast vraagt een opdracht aan. `startMissionVoorGast` bewaart `eigenIndex`, zet
  `chainState().index = i` en roept `startMission`. Die kan vroegtijdig terugkeren in het
  `lazyStart`-pad (`missions.js:1695-1703`: nog geen wegdata op de gestreamde tegel). Dan is
  `phase !== 'active'`, en `:684` keert terug zonder `gastStart` te zetten en zonder `eigenIndex`
  terug te zetten. Het herstelpad `sluitGastStart` (`:696-702`, dat `index = g.eigenIndex` doet) wordt
  dus nooit bereikt.
- **Impact:** de keten van de gastheer wijst daarna naar de opdracht van de gast: verkeerde markeer-
  punt en doel, en de in-loop-trigger van die opdracht staat klaar. Zijn eigen volgende verhaalmissie
  is niet langer het ketendoel. `story.js` herstelt dat pas laat: `refreshGuide` zet de keten alleen
  terug als de speler binnen 40 m van de eigen missiestart staat en er geen missiedoel loopt
  (`game/js/story.js:372-373`). De gast krijgt intussen "onbekende opdracht" (`coopglue.js:97`),
  terwijl de gastheer "De weg hier wordt nog geladen" ziet. Dit raakt #557 (streaming) maar is een
  eigen fout: de opruiming ontbreekt, niet het streamen.
- **Fix:** in `startMissionVoorGast` vóór de `return false` de keten herstellen
  (`chainState().index = eigenIndex; chainState().phase = 'idle'; chainState().armed = true;`) of
  `gastStart` vóór `startMission` zetten en bij falen weer weghalen; daarna `syncPub`.
- **Zekerheid:** zeker voor de code (pad is aantoonbaar); waarschijnlijk voor het scenario (vereist
  een `lazyStart`-missie plus een streaminggat op precies dat moment).

### [Midden] Een chase-stage heeft één spawnpoging; een mislukte spawn laat de missie meteen falen
- **Waar:** `game/js/missions.js:2627-2630` (spawn in `enterStage`), `:2373-2377`
  (`spawnChaseVehicle` geeft `null` als er geen `road` is) en `:3510-3515` (falend check).
- **Scenario:** `enterStage` zet `S.target = spawnChaseVehicle(...)`. Levert die `null` op (geen
  wegdata onder `st.from`, geen road op `def.start`), dan ziet de `chase`-tak in de volgende frame
  `!t` en roept direct `fail(..., st.gone || 'de tankwagen is foetsie')`. Er is geen herkansing binnen
  de stap en de speler heeft niets fout gedaan.
- **Impact:** een schone mislukking met een onzinnige melding ("de tankwagen is foetsie") als de
  wereld nog niet klaar is; na "Opnieuw" komt de speler via het checkpoint in dezelfde stage en dus
  in dezelfde één-poging-situatie. Met de streamingdrukte van #557 is dit een reële faalroute; bij een
  vast ontbrekende road is de missie onwinbaar tot de tegel er is.
- **Fix:** bij `!target` niet falen maar `enterStage(world, def, chainState().stageIndex)` opnieuw
  proberen na een korte wachttijd (of `retry`/`stagePending` gebruiken), en pas na N pogingen of een
  echte timeout falen met een eerlijke reden.
- **Zekerheid:** zeker dat de code zo faalt; waarschijnlijk dat `null` in de praktijk voorkomt.

### [Laag] Dode zone: vlak bij de start falen levert geen Opnieuw-aanbod én geen nieuwe trigger
- **Waar:** `game/js/missions.js:1273` (`armed = false` bij falen), `:2020-2023` (retry vervalt binnen
  `triggerRadius*3+10` m) en `:2068` (opnieuw armeren pas boven `R+2` m).
- **Scenario:** de speler faalt binnen ~6 m van het missiestartpunt (tijd op, knock-out bij de start).
  Het Opnieuw-aanbod wordt weggegooid omdat hij te dichtbij staat, en de idle-tak zet `armed` niet
  terug zolang hij binnen 6 m blijft. Er gebeurt niets tot hij een paar meter wegloopt en terugkomt.
- **Impact:** korte verwarring, geen blijvende softlock; de markeer staat wel in beeld.
- **Fix:** de dode zone dichten: `armed` bij een mislukking niet alleen op afstand herstellen, of het
  Opnieuw-aanbod ook binnen de straal aanbieden (het staat toch al op Enter).
- **Zekerheid:** zeker.

### [Laag] `lazyStart` zonder wegdata laat de opdracht ongestart en ongearmd achter; "even wachten" start niets
- **Waar:** `game/js/missions.js:1695-1703` en `:2066-2077`.
- **Scenario:** bij de trigger is de weg nog niet gestreamd: `startMission` zet `phase = 'cooldown'`,
  `armed = false` en toont "De weg hier wordt nog geladen. Even wachten…". Na vijf seconden gaat de
  fase naar idle, maar `armed` blijft `false`; de speler die blijft staan (precies wat de melding
  vraagt) start de opdracht nooit. Pas boven `R+2` m wordt hij weer arm.
- **Impact:** speler ziet een belofte die niet uitkomt; met #557 is dit dezelfde faalroute als hierboven.
- **Fix:** na de cooldown automatisch opnieuw proberen zolang de speler in de trigger staat, of
  `armed` in dit pad niet uitzetten.
- **Zekerheid:** zeker.

### [Laag] De O-skip in de inbraak loopt via de debug-haak en betaalt de volle beloning plus een rolpunt
- **Waar:** `game/js/missions.js:3365-3372` (`missionDebug.complete(world)`), `game/js/heist.js:686-690`
  (O vasthouden), `game/js/missions.js:3761-3779` (`complete`/"finishes the current objective").
- **Scenario:** na 50 s in een heist-stage of twee keer gezien te zijn biedt de UI een skip aan; O
  vasthouden roept `missionDebug.complete`, die de stap "onafhankelijk van het pad" afmaakt. De speler
  krijgt daarmee de kluis-/laser-/deurstap cadeau, plus via `heistLeaveStage` het rolpunt voor de
  buitverdeling, en aan het eind de volle missiebeloning.
- **Impact:** beloningsintegriteit wijkt af van de verhaal-skip, die maar 50% betaalt
  (`game/js/story.js:906-924`); een speler kan de inbraak grotendeels overslaan met volle buit. Als
  dit bewust zo is, hoort er een regel over in de changelog; nu staat een debughaak op een
  spelerspad.
- **Fix:** een eigen, spelersgerichte skip voor de heist die dezelfde 50%-regel of een eigen deel
  aanhoudt in plaats van `missionDebug`, of `complete` achter de dev-vlag zetten.
- **Zekerheid:** zeker dat dit pad bestaat; waarschijnlijk dat de uitkomst ongewenst is (het kan
  bewust zijn).

## Wat ik controleerde en in orde vond

- **Bakronde is niet vast te lopen:** `bakeAdd` zet bij "te veel mislukt" `round` en `misses` terug
  (`game/js/bakeround.js:28-50`), dus er is geen eindstand waarin de speler de stage niet meer kan
  halen; de missie faalt niet op de bakstage.
- **Groepsstappen wachten niet op een weggevallen speler:** `opdrachtSpelers` laat gasten met status
  `neer`/`weg` vallen (`game/js/spelersregister.js:109-123`), en `doelStand`/`groepKlaar` in
  `game/js/stagegroep.js:40-54` gebruiken dat; `iedereen`-stappen kunnen dus niet eindeloos op een
  neergegane gast wachten. De rolverdeling van de kraak herverdeelt rollen wanneer een gast
  wegvalt (`heistrollen.js:141-162` met `verbinding !== 'lost'`).
- **Save/load midden in een missie ruimt netjes op:** `setMissionProgress` wist storyprops, het
  missievoertuig, pigeonmode, checkpoints, retry en `gastStart` (`game/js/missions.js:709-744`), en
  `scripts/missioncheckpoint_test.mjs:104` bewaakt dat checkpoints niet in de save staan. Een gast
  die een opdracht start waar de gastheer alleen toekeek, kan hem geen beloning of verhaalstap
  dubbel geven (`succeed` 1138-1213 met `sluitGastStart` 696-702); medaillebonussen zijn met
  `medalPaid` gededupliceerd en gaan mee in de save.
- **Een onvervulbare aankoopvereiste is geen harde softlock:** na 90 s blijft de stap onvervuld en
  wordt hij skippable (`game/js/story.js:886-898`, `game/js/missions.js:367-370`, `checkVoorschot`
  schiet geld voor).

## Al gemeld en niet gedupliceerd

- #555: de `figs.slice`-crash. Ik voeg het tweede aanroeppad, de solo-sessie als trigger, de
  vergelijking met de andere lezers en het ontbrekende testdeel toe (bevinding 1). De rest van mijn
  bevindingen overlapt niet met #556-#577; #557 en #560 raken de scenario's van bevinding 2 en 5,
  maar hebben een eigen oorzaak (opruiming en `armed`-vlag, geen laadscherm).
