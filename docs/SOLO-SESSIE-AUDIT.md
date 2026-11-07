# Audit: "Alleen spelen" als gastheer-sessie van één

Stand: worktree `w77-coop-bake-vault`, commit `78db7781` (de werkboom bevatte bij deze audit
alleen gewijzigde TTS-scripts van een andere taak; `game/js` was ongewijzigd). `game/js/coopsolo.js`
bestond nog niet, dus dit rapport toetst het plan tegen de bestaande `startHost`/`stopCoopNet` en
tegen elke plek die nu op `world.coopNet`, `world.coopRole`, `world.coopRoster`, `world.coopPartner`
of `world.coopFoci` leunt. Er is niets aan code veranderd en er is niets met `--write` gedraaid.

**Stand na de fixronde (7-11-2026).** H4, M2, M3 en het solo-baken zijn opgelost (#559, #560, #568,
#567); de aanbevelingen hieronder zijn een momentopname van de review en niet meer de bedoelde
richting. De sessie van één zet `world.coop.local` juist op `false` (dan neemt de volg-AI de metgezel
over; #559) en de consumenten vragen `isSamenSessie()` of kijken naar de gasten in de hub in plaats van
naar `world.coopNet` alleen. Tests: `scripts/coopsolo_test.mjs`, `scripts/gamepad_live_test.mjs`,
`scripts/onboarding_test.mjs` en `scripts/coopbestuur_test.mjs`.

## Uitgangspunt

De eigenaar wil "Alleen spelen" als een gastheer-sessie van één: dezelfde multiplayer-code, een hub
met alleen plek 0, geen gasten en geen aankondiging. Dat sluit aan op ADR
[0022](../.specs-fire/standards/adr/0022-altijd-online-met-toestemming.md) ("Nee: het spel start een
besloten sessie van één; er gaat niets naar buiten, er staat niets in een lijst en niemand kan
binnenkomen") en op docs/MULTIPLAYER-VISIE.md punt 2. De sessie is dus een implementatiedetail van
het solospel en mag voor de speler nergens als "Samen spelen" voelen.

`startHost` (`game/js/coopnet.js:306`) maakt inderdaad geen netwerkverbinding en doet geen
aankondiging: `HostHub` wordt alleen in het geheugen opgebouwd en er wordt pas iets naar buiten
gedaan via `addGuest`/`sessionboot.hostSession`. Dat deel van het plan klopt. De risico's zitten in
wat `startHost` verder aanzet en in code die "er is een `coopNet`" leest als "er doen andere
mensen mee".

## Samenvatting: de drie ernstigste punten

1. **De automatische solo-sessie vecht met het online-startpad (#528).** `sessionBootTick`
   (`game/js/sessionboot.js:61-68`, `game/js/main.js:643`) start met toestemming een achtergrond-
   zoektocht, maar `canBootSession` weigert zodra `world.coopNet` bestaat. Start de solo-sessie in
   dezelfde frame, dan komt de speler die "Meedoen" koos nooit online; start de zoektocht al en
   maakt de solo-sessie intussen een hub, dan kan de zoektocht er later een tweede sessie
   overheen zetten (`hostSession`/`startClient`) zonder de eerste op te ruimen.
2. **De solo-sessie blokkeert opslaan-UI die niets met een zichtbare sessie te maken heeft.**
   `coopSessieLoopt` (`game/js/savegame.js:439`) blokkeert `applySave` en `loadSlot`
   (`savegame.js:180`, `:443`) en via `pausemenu.js:1299` en `saveslotsui.js:279`, `:365`, `:368`
   ook "Nieuw spel" en "Spel verwijderen", met de tekst "Samen spelen loopt nog. Stop eerst de
   sessie". Er is in een solo-sessie geen zichtbare sessie en geen stopknop; de speler zit muurvast
   tenzij hij toevallig het Samen-scherm opent (dat de sessie dan stopt).
3. **Het Samen-paneel adopteert de solo-sessie en toont een dode kamer.** Wordt de solo-sessie pas
   gestopt nadat het paneel al getekend is, dan ziet `renderSamenPanel` een lopende sessie
   (`samenpanel.js:48-54`, `:99`, `:128`) en toont de lobby "Iemand uitnodigen" met een kamercode en
   "Wacht op een medespeler" (`lobby.js:419-426`) terwijl de solo-hub geen uitnodiging, geen kamer en
   geen verbinding heeft. Wie de code deelt, wacht voor altijd. Dit is een race die je met een
   expliciete stop vóór het tekenen moet wegnemen.

## Bevindingen

Ernst: **Hoog** = breekt gedrag of laat de speler vastlopen; **Midden** = zichtbaar verkeerd of
raakt een doelgroep (controller, nieuwe speler); **Laag** = cosmetisch, latent of alleen kosten.

### Hoog

**H1. Solo-sessie en het online-startpad (#528) sluiten elkaar uit**
- Waar: `game/js/sessionboot.js:61-68` (`canBootSession`), `:237-260` (`sessionBootTick`),
  `:155-169` (`hostSession`, inclusief openbare aankondiging), `game/js/main.js:643`, en de
  geplande start in `frameBody` (`main.js:626-643`).
- Wat: zolang `world.coopNet` bestaat, doet `sessionBootTick` niets. Start de solo-sessie meteen in
  `frameBody`, dan is de "Ja"-keuze uit het eerste-startscherm (ADR 0022) permanent een "Nee".
  Andersom: is `bootSession` al bezig (lijst ophalen, verbinden), dan kan de solo-sessie intussen
  ontstaan en zet de afrondende `hostSession`/`startClient` een tweede sessie neer. `startHost`
  stopt een bestaande sessie niet en `startClient` vervangt `world.coopNet` zonder de oude hub te
  sluiten; de oude hub blijft dan rondslingeren (geen netwerk, maar wel state en hooks).
- Gewenst: één eigenaar van "er is een sessie". Ofwel `sessionboot` beslist (en de solo-sessie is
  alleen de terugval als de speler "Nee" zei of de boot na zijn pogingen stopt), ofwel `coopsolo`
  beslist en `sessionBootTick` blijft uit. Nooit beide naast elkaar.
- Aanbeveling: start de solo-sessie alleen als (a) `!magOnline()` of de boot definitief klaar/af is,
  (b) `!sessionBootState(world)` (geen lopende of openstaande boot), (c) `!wantsOpenSamen()`,
  (d) geen Samen-scherm open. Laat `startSoloHost` eerst een bestaande sessie stoppen en maak hem
  idempotent. Overweeg `sessionboot` bij "geen sessie gevonden / opgegeven" expliciet
  `startSoloHost` te laten aanroepen in plaats van een tweede startpad in `frameBody`.
- Test: `scripts/sessionboot_test.mjs` uitbreiden met een wereld waarin de solo-sessie start tijdens
  een lopende boot (verwacht: boot geeft op of host zelf; nooit twee hubs) en met de "Nee"-route
  (verwacht: precies één solo-host, geen WebSocket).

**H2. Opslaan/laden/nieuw spel/verwijderen denken dat er een stopbare sessie is**
- Waar: `game/js/savegame.js:437-439` (`COOP_NIEUW_TEKST`, `COOP_WISSEN_TEKST`,
  `coopSessieLoopt`), `:179-180` (`loadSlot`), `:441-443` (`applySave`), `game/js/pausemenu.js:1234-1255`,
  `:1299`, `game/js/saveslotsui.js:279`, `:365`, `:368`.
- Wat: in een solo-sessie is `coopSessieLoopt(world)` waar. Daardoor:
  - "Nieuw spel" in het pauzemenu en de saves-lade melden "Samen spelen loopt nog. Stop eerst de
    sessie" — maar er is geen sessie in de UI en geen stopknop.
  - "Spel verwijderen" van het actieve spel wordt om dezelfde reden geweigerd.
  - "Spel laden" opent eerst een bevestiging "Ja, sessie beëindigen en laden" met de gastheertekst
    "de andere spelers gaan terug naar hun eigen spel" (`saveslotsui.js:160-161`,
    `cooploadrules.js:6-11`).
  De laadpaden werken technisch (stop → save → load), maar de tekst en de blokkades horen bij een
  echte sessie met anderen.
- Gewenst: de solo-sessie is voor opslaan/laden geen sessie. `saveGame` werkt al (host schrijft zijn
  eigen save, `savegame.js:250-267`); alleen de blokkades en teksten moeten solo-bewust worden.
- Aanbeveling: laat `coopSessieLoopt` (of een nieuwe `coopSessieMetAnderen`) `isSoloHost(world)`
  uitsluiten, of stop de solo-sessie impliciet (met de bestaande `runCoopLoad`-volgorde) zonder
  bevestiging en met een solo-tekst. Pas `COOP_NIEUW_TEKST`, `COOP_WISSEN_TEKST` en
  `coopLoadTekst` aan. Let op: `scripts/coopladen_test.mjs` toetst nu letterlijk de hosttekst
  ("beëindigt de sessie voor iedereen") en `COOP_NIEUW_TEKST`; die test moet mee.
- Test: nieuwe pure test die `coopSessieLoopt`/`loadSlot`/`applySave` met een solo-host toetst, plus
  een broncheck dat "Nieuw spel" en "Verwijderen" in solo niet meer geblokkeerd worden.

**H3. Het Samen-paneel adopteert een solo-hub en toont een wachtkamer die niet bestaat**
- Waar: `game/js/samenpanel.js:48-54` (`huidigeSessie`), `:82-128` (`renderSamenPanel`, `adopt` op
  `:128`), `game/js/pausemenu.js:1583-1594` (`afterSpelSub` → `renderSamenPanel`),
  `game/js/lobbyui.js:53-66`, `game/js/lobby.js:419-426`.
- Wat: `huidigeSessie` ziet iedere `world.coopNet` met een hub als een lopende sessie. Een solo-hub
  heeft echter geen `hostRoom` en geen uitnodigingslus die een gast kan binnenlaten (de hub wordt
  alleen via `addGuest` gevuld); de lobby toont wel de kamercode en "Wacht op een medespeler: je
  kunt het spel starten zodra er minstens twee spelers zijn". Delen van die code levert niemand op.
  De stop die het plan voor "Samen spelen openen" bedoelt, gebeurt in `frameBody` (volgende frame)
  en het paneel wordt in `afterSpelSub` al getekend; zonder hertekening blijft de adoptie-UI staan.
- Gewenst: nooit adopteren als het om een solo-sessie gaat; eerst stoppen, dan pas de hub/lobby
  tekenen, en daarna een echte `startHost` (met uitnodiging) als de speler host.
- Aanbeveling: stop de solo-sessie in één choke point vóór het tekenen — bijvoorbeeld bovenaan
  `renderSamenPanel` (of in `openPauseMenu('samen')`/`afterSpelSub` vóór `renderSamenPanel`) — en
  laat `huidigeSessie`/`adopt` `isSoloHost` weigeren. Regel ook meteen `setGate(false)`.
- Test: paneeltest met een solo-host: na openen is `world.coopNet` weg, de hub-stap verschijnt, en
  er is geen `adopt`/kamercode/"Wacht op een medespeler" uit de oude sessie. Een broncheck op de
  volgorde (stop vóór `renderSamenPanel`/`afterSpelSub`) kan dit bewaken.

**H4. `startHost` verandert het solospel zelf: vaste personages en lokale invoer uit**
- Waar: `game/js/coopnet.js:309` (`world.coop.prevLocal = ...; world.coop.local = false`),
  `:361` (`setFixedCharacters(world, 0)`), `:362` (`world.coop.leash = Infinity`),
  `game/js/coopclient.js:45-53` (zet `world.coop.fixedChars = true`),
  `game/js/story.js:777`, `:801`, `game/js/coopglue.js:35`, `game/js/companion.js:776`,
  `game/js/main.js:441` (`FLAGS.coop`).
- Wat:
  - `fixedChars` zet de verhaalwissel permanent uit: `story.js` `swapDone` geeft altijd `true` en
    `updateCharacter` doet niets meer. De huidige verhaalboog (`storyarc.js`) gebruikt geen
    `step.player`, dus er is nu geen zichtbare breuk, maar de eigenschap "eenspeler doet wat het
    deed" is weg en een toekomstige stap met een andere hoofdrol zou niet meer wisselen. De
    companion-rol wordt elke frame toch door `companion.js:760` herzet, dus alleen de spelerskant
    blijft "vast".
  - `world.coop.local = false` zet de lokale tweede-spelerinvoer uit. Met `?coop` (lokaal samen op
    één toetsenbord, `main.js:441`) verliest speler 2 de besturing zodra de solo-sessie start; de
    companion valt dan terug op de volg-AI (`coopglue.js:35`). Voor gewoon solospel is die
    terugval juist gewenst (de companion hoort de normale AI te houden), maar de `?coop`-modus
    wordt er stil mee uitgezet.
  - `world.coopPings` wordt aangemaakt (`coopnet.js:235`), waardoor de roepjestekens 7/8/9 ook in
    solo werken (`coopnet.js:1003-1006`, `:1433-1443`) en je je eigen baken ziet. Zie M7.
- Gewenst: een solo-sessie laat de personages, de lokale invoer en de companion met rust; alleen de
  sessieadministratie (hub, rol, roster van één) komt erbij.
- Aanbeveling: geef `startHost` een optie `solo` (of laat `coopsolo.js` de effecten terugdraaien):
  sla `setFixedCharacters`, `world.coop.local = false`, `leash = Infinity` en de pings over, of
  markeer de sessie (`world.coopNet.solo = true`) en laat de consumenten daarop checken. Behoud
  eventueel `world.coop.remote = false` en de companion-AI; test dat `?coop` lokaal blijft werken.
- Test: pure test die na `startSoloHost` controleert dat `world.coop.fixedChars` niet waar is,
  `world.coop.local` niet op `false` staat en dat `story.js`-achtige wissel beslist zoals zonder
  sessie; een test met `?coop`-vlag voor de lokale invoer.

### Midden

**M1. Spelerslijst, "1 speler"-badge en profielteksten duiken op in solo**
- Waar: `game/js/main.js:719` (`updatePartnerChip` elke frame), `game/js/coophud.js:22`,
  `game/js/coopspelersui.js:87-104` (Tab-overlay), `:120` (profielhint),
  `game/js/pausemenu.js:1560-1561` (railbadge), `:1737` (Spelers-subtab zichtbaar),
  `:1696` + `game/js/pausemenu.css:478-479` (`[data-coop="1"]` maakt de rail compacter).
- Wat: `bouwSpelers` (`coopnet.js:1008-1009`) bouwt elke 0,25 s een lijst met alleen de gastheer;
  Tab toont dan een overlay "Spelers" met jezelf. De pauzebalk zet een teller 1 met aria-label
  "1 spelers" (grammaticaal fout en semantisch vreemd) en het tabblad Spelers is zichtbaar. De hint
  zegt "Je nieuwe naam en kleur gelden zodra je opnieuw meedoet", wat voor een gastheer-sessie niet
  klopt. De CSS maakt de rail smaller puur omdat `dataset.coop = '1'` is.
- Gewenst: in een sessie van één blijft de HUD stil; geen Tab-lijst, geen teller, geen
  Spelers-tabblad (of expliciet "Sessie van één" als de eigenaar dat wil).
- Aanbeveling: `isSoloHost` als extra voorwaarde in `updateSpelersOverlay`, `renderSpelersPanel`,
  de railbadge en `afterSpelSub`; zet `root.dataset.coop` alleen bij een sessie met meer dan één
  speler; pas de hint aan.
- Test: `scripts/coopspelers_test.mjs`/`scripts/partnerhud_test.mjs` uitbreiden met een solo-host,
  plus een DOM-loze check dat de Tab-lijst leeg blijft; een broncheck voor de badge.

**M2. Controllerindeling verandert zodra `coopNet` bestaat**
- Waar: `game/js/gamepad.js:185` (`PAD_COOP[ctx]` als `world.coopNet` bestaat),
  `game/js/controls.js:261` (`PAD_COOP`), `game/js/gamepad.js:387`
  (`sticky: !!(world && world.coop)`).
- Wat: in een solo-sessie wordt op de controller D-pad omhoog 'y' en links/omlaag/rechts 7/8/9
  (te voet), en in een voertuig omhoog 'y' (stuur geven). De radio, toeter en andere D-pad-functies
  zijn dan niet bereikbaar "zolang er een sessie loopt" — maar er loopt in solo niemand mee. De
  `sticky`-padkeuze (speler 1 houdt zijn pad) is eveneens een coöpmaatregel die in solo ongemerkt
  aangaat.
- Gewenst: zonder tweede speler de normale controllerindeling.
- Aanbeveling: `PAD_COOP` en `sticky` achter `meerSpelers(world)` zetten (of `!isSoloHost`).
- Test: `scripts/padlogic_test.mjs`/`scripts/gamepad_live_test.mjs` uitbreiden met
  "coopNet-host zonder gasten → geen PAD_COOP, niet sticky".

**M3. De "Samen spelen"-uitlegkaart voor nieuwe spelers verdwijnt**
- Waar: `game/js/onboarding.js:70` (`!w.coopNet`).
- Wat: de kaart "Samen spelen" na de eerste missie verschijnt nooit meer, want een solo-sessie heeft
  altijd een `coopNet`. Nieuwe spelers leren de functie zo niet kennen.
- Gewenst: de kaart blijft, tenzij er echt iemand meespeelt.
- Aanbeveling: `!w.coopNet || isSoloHost(w)` (of `!meerSpelers(w)`).
- Test: `scripts/onboarding`-dekking (bestaat nog niet als pure test; broncheck kan volstaan) plus
  een kleine pure test op de `when`-regel.

**M4. De PvP-arena gedraagt zich als "samen" in plaats van "niet beschikbaar"**
- Waar: `game/js/multiplayerpvpwereld.js:263-272` (`arenaStartBlok`), `:312-322`
  (`pvpArenaStart`), `:536-538` (`pvpArenaPrompt`), activiteit `PVP_ARENA_ACT`.
- Wat: in solo bestaan `world.coopPvp` en `world.coopNet`, dus de prompt valt niet in de
  `promptSolo`-tak; E bij het veld meldt "minstens twee spelers" in plaats van "dit werkt alleen
  samen". Er kan geen ronde starten (goed), maar de tekst is misleidend.
- Gewenst: zonder andere spelers dezelfde "alleen in Samen spelen"-boodschap als nu in solospel.
- Aanbeveling: in `arenaStartBlok`/`pvpArenaPrompt` ook `verbondenGasten(world).length < 1`
  meenemen (of `isSoloHost`) en `promptSolo` tonen.
- Test: `scripts/cooppvp_test.mjs` uitbreiden met een host zonder gasten.

**M5. De "Meedoen met andere spelers"-schakelaar geeft in solo een verkeerde uitleg**
- Waar: `game/js/onlineconsent.js:52-61` (`zetMeedoen`), `:30` (`uitSessie`).
- Wat: uitzetten in een solo-sessie meldt "Deze sessie blijft besloten: wie al meespeelt blijft,
  nieuwe spelers komen er alleen nog bij met de kamercode." Die code bestaat in een solo-hub niet.
- Gewenst: "Je speelt alleen. Je sessie gaat niet naar buiten." (de `uit`-tekst).
- Aanbeveling: in `zetMeedoen` een solo-host als "geen sessie" behandelen.
- Test: pure test op `zetMeedoen` met een solo-host-hub.

**M6. Extra autosaves en een synchrone save bij het stoppen**
- Waar: `game/js/savegame.js:561-567` (`coopCheckpointTik`, elke 60 s via
  `game/js/coopcheckpoint.js:3`), `game/js/coopdeel.js:11-16` (`verrekenBeloning` → `markDirty`),
  `game/js/coopnet.js:1589` (`verrekenEinde` bij `stopCoopNet`).
- Wat: zodra `world.coopRole` bestaat, schrijft de checkpoint-tik elke minuut (en direct na een
  geslaagde missie) een volledige save, ook als er niets veranderd is. Elke missie-/bijbaanbeloning
  roept via `world.coopDeel`/`loopbaanVerdien`/`completeRound` (`missions.js:1171`,
  `loopbaanlive.js:163`, `sidejobs.js:477-478`) `verrekenBeloning` aan, wat de gewone autosave
  uitstelt/plant. Bij het openen van Samen doet `stopCoopNet` bovendien een synchrone
  `saveGame` (`verrekenEinde`). Voor #448 is dit veilig, maar het is meer schrijfwerk dan het oude
  solospel (dat op wijzigingen en na missies opslaat) en op een telefoon merkbaar.
- Gewenst: in solo de normale autosave-logica houden; de checkpoints zijn voor sessies met anderen.
- Aanbeveling: `coopCheckpointTik` overslaan bij `isSoloHost` (of alleen de gewone
  `markDirty`-route), en documenteren dat het stoppen van een solo-sessie de lopende save bijwerkt.
- Test: `scripts/coopduur_test.mjs` (of een nieuwe pure test) telt de schrijfacties met een
  solo-host en vergelijkt die met een gewone wereld.

**M7. Roepjes (7/8/9) werken in solo en zetten een eigen baken in de wereld**
- Waar: `game/js/coopnet.js:1003-1006`, `:1433-1443`, `game/js/partnerhud.js:57-69`,
  `game/js/coopping.js:35-43`, `game/js/cooppings3d.js:44-61`, `game/js/main.js:721`.
- Wat: in een solo-sessie accepteert `tickCoopNet` de roepjestekens (`n.role === 'host'`) en
  `sendPing` zet de ping lokaal; je ziet je eigen baken en de regel "Je riep: Kom hier". Dat is
  speelbare maar onbedoelde multiplayer-UI in het solospel.
- Gewenst: zonder andere spelers geen roepjes.
- Aanbeveling: de roepjetoetsen achter `meerSpelers(world)` zetten; `world.coopPings` mag blijven
  bestaan (kost bijna niets) maar de tekens/het baken niet.
- Test: pure test dat een solo-host na 7/8/9 geen `coopPings.lijst`-item en geen bericht krijgt.

### Laag

**L1. `players.js` leest de gastheerroster als object**
- Waar: `game/js/players.js:44`: `world.coopRoster && Array.isArray(world.coopRoster.spelers)`.
  `startHost` zet `world.coopRoster = lijst(hub.roster)` (`coopnet.js:358/364`), en `lijst()`
  (`coopplayers.js:115`) geeft een array, geen `{ spelers }`. De tak is dus altijd leeg en
  `spelerMetId(world, 'tammo')` valt terug op het eigen lichaam.
- Waarom nu relevant: zonder solo-sessie was `coopRoster` meestal `null`; nu is het altijd gevuld
  (met een array) en wordt de fout vaker geraakt. Geen crash, wel een verkeerde aanname.
- Aanbeveling: `Array.isArray(world.coopRoster) ? world.coopRoster : (world.coopRoster.spelers || [])`.
- Test: `scripts/players_test.mjs` uitbreiden met een host-roster als array.

**L2. De scene-hook kost DOM-leeswerk als `coopsolo` hem meegeeft**
- Waar: `game/js/samenpanel.js:103`/`:108` en `game/js/sessionboot.js:158` geven
  `scene: () => readHostScene(world)` mee; `readHostScene` (`coopscene.js:20-43`) leest
  `document.getElementById`, klassen, tekst en panelen, en `tickCoopNet` roept hem 4×/s aan
  (`coopnet.js:1089-1100`). In solo is er geen gast die iets met dat bericht doet.
- Aanbeveling: `coopsolo.js` geeft géén `scene` mee (of `startHost` slaat de scene-tak over als er
  geen sessies zijn). Dit is de goedkoopste van de performancemaatregelen.

**L3. Cutscene-berichten worden in solo gebouwd en "verstuurd"**
- Waar: `game/js/cutscenehost.js:334` (`cutHostStart` voor elke scène), `game/js/coopcut.js:110-136`
  (`cutHostStart`/`cutHostTik`, tijdbericht elke `CUT_TIK` = 0,25 s).
- Wat: elke scène splitst een JSON-pakket in stukken en roept `hub.announce` aan (nul sessies); elke
  0,25 s wordt een tijdbericht gemaakt. Geen netwerk, wel allocaties en werk in de warme scène.
- Aanbeveling: in de host-tak van `cutscenehost`/`coopcut` niets doen als `hub.sessions.size` 0 is
  (of als `isSoloHost`).

**L4. De bakronde bouwt elke frame een gastenpaneel**
- Waar: `game/js/missions.js:3643` (`world.coopStagePanel = bakePanel(...)`),
  `game/js/bakeround.js:60-69`, gelezen door `coopscene.js:41`.
- Wat: tijdens de bakstage wordt per frame een paneelobject met strings gemaakt en in
  `world.coopStagePanel` gezet; alleen een gast leest het via de scene-hook. In solo is het
  overbodig.
- Aanbeveling: alleen bakken als er een gast is (of als de scene-hook bestaat).
- Test: pure test op de stage-tick met een solo-host: `coopStagePanel` blijft leeg.

**L5. Opdrachtgroepen en kaartdoelen worden in solo bijgehouden**
- Waar: `game/js/coopnet.js:1104-1107` (`werkGroepenBij`, `missieBericht`, `nodigUit`),
  `:826-844`, `game/js/coopmissie.js:122-133` (`kaartDoelen`), gebruikt in
  `game/js/hud_panel.js:2614-2618` en `game/js/mapview.js:1314-1320`.
- Wat: elke frame tijdens een opdracht wordt een groep van één bijgewerkt (deelnemers `[0]`,
  doelen, stap) en bouwt de HUD/kaart de lijst opnieuw. Zolang de eigen opdracht op de kaart staat,
  onderdrukken `showMission` de eigen groep (geen dubbele markers), dus spelers zien niets geks;
  het is wel werk en state voor niemand.
- Aanbeveling: in `isSoloHost` de gastengroepen overslaan (de eigen missiemarker bestaat al), of
  minstens `kaartDoelen` niet elke HUD-frame opnieuw opbouwen.

**L6. Per-frame allocaties voor een lege spelerslijst**
- Waar: `game/js/coopnet.js:1008-1009` (`bouwSpelers` elke 0,25 s), `:1114-1116`
  (`partnersInfo` + `ververs` elke frame), `game/js/spelersregister.js:27-49`,
  `game/js/coopspelers.js:43-70`.
- Wat: elke frame worden een nieuwe `coopPartners`-array en (via `ververs`) vaak een nieuwe
  `world.players`-array van één record gemaakt; elke 0,25 s een rij met teksten. Kleine kosten,
  maar zonder gasten volledig overbodig; `world.players` hoeft alleen bij de start gevuld te worden
  (architectuur #446).
- Aanbeveling: bij `isSoloHost` één keer `ververs` doen en daarna overslaan; `bouwSpelers` alleen
  als er gasten zijn.

**L7. De per-frame visuele coop-lagen draaien mee**
- Waar: `game/js/main.js:719-721` (`updatePartnerChip`, `syncFigures`, `syncPings`),
  `game/js/coophud.js:22`, `game/js/coopfigures3d.js:51-92`, `game/js/coopbezig3d.js:48-53`,
  `game/js/cooppings3d.js:44-61`.
- Wat: `updatePartnerChip` doet elke frame `document.getElementById`/`classList`; `syncFigures`
  doet `getScene`, cinematiek- en planwerk; `syncPings` bouwt een Set. Alles met lege collecties,
  dus goedkoop, maar het is nieuwe per-frame code in het solospel.
- Aanbeveling: de drie regels in `main.js` achter `!isSoloHost` zetten (of `meerSpelers`), net als de
  `coopScene`-tak.

**L8. Het hek/`gate` staat los van de wereld en moet bij het starten/stoppen mee**
- Waar: `game/js/coopgate.js:4-14`, `game/js/main.js:636-638`, `game/js/story.js:242`,
  `game/js/coopnet.js:1584` (stop zet hem uit), `game/js/samenpanel.js:60` (`requestOpenSamen` zet
  hem aan).
- Wat: `gate` is een modulevariabele. `startHost` raakt hem niet aan; `stopCoopNet` zet hem uit.
  Een achtergebleven `gate=true` (bijvoorbeeld na een afgebroken Samen-start) laat `story.js` de
  verhaaltriggers overslaan en `main.js` het Samen-menu openen. In de normale stroom is dat al
  afgedekt, maar `startSoloHost` hoort hem defensief uit te zetten.
- Aanbeveling: `setGate(false)` in `startSoloHost` en in de stop vóór het tekenen van het
  Samen-paneel (zie H3).

## Per plek: wat gebeurt er met een host-sessie zonder gasten, is dat gewenst, en welke test dekt het?

| Plek | Wat er nu gebeurt (host, 0 gasten) | Gewenst? | Dekkende test |
|---|---|---|---|
| HUD/partnermeldingen (`coophud.js`, `coopspelersui.js`, `partnerhud.js`) | `coopPartners` leeg; Tab toont jezelf (M1); geen "wacht op spelers"-HUD buiten de lobby | Nee, stil blijven | Geen; `coopspelers_test.mjs` en `partnerhud_test.mjs` dekken alleen sessies met spelers |
| Wachtkamer/hek (`coopgate.js`, `main.js:636-638`, `story.js:242`) | `gate` blijft in de normale stroom uit; niemand wacht; `startHost` meldt niets aan gasten | Ja, mits `startSoloHost` hem defensief uit zet (L8) | `coopnet_test.mjs` (stop zet hek uit), niet de start |
| Pauze/menu (`pausemenu.js`) | Menu pauzeert zoals altijd (`coopWereldDoorloop` eist 2 spelers, `coopnet.js:1576-1579`); badge/Spelers-tab verschijnen (M1); Samen-paneel adopteren is H3 | Deels: pauze ok, badge/tab niet, adoptie fout | `coopladen_test.mjs` raakt de teksten; geen test voor de badge/adoptie in solo |
| Opslaan/laden (`savegame.js`, `coopsave.js`, `saveslotsui.js`) | `saveGame` schrijft de host-save; laden vraagt een sessiebevestiging; nieuw/verwijderen geblokkeerd (H2); extra checkpoints (M6); `coopsave.js` bewaart alleen een gastcode, geen hostdata (geen wijziging nodig) | Nee, solo mag geen sessie voelen | `coopladen_test.mjs`, `coopsave_test.mjs`, `saveslots_test.mjs`; geen solo-variant |
| Verrekening (`coopdeel.js`, `coopnet.js:975-988`) | `deelMetGasten` betaalt alleen gasten (0) en zet de host-save klaar; gastheer krijgt zijn geld via het gewone pad (geen dubbele uitbetaling); `verrekenEinde` schrijft bij stop | Ja (wél extra autosave, M6) | `coopdeel_test.mjs` (geen solo-case) |
| Hostwissel (`coophostwissel*.js`) | Geen UI: `kanOverdragen` eist een andere speler (`coopspelers.js:80-82`); `wisselTik` draait alleen met `world.coopWissel` | Ja | `coophostwissel_test.mjs`, `hostwissel_test.mjs` (met spelers) |
| Coopfiguren (`coopfigures*.js`, `coopbezig3d.js`) | Geen figuren; `world.coopFigures` blijft leeg; `syncFigures` draait mee (L7) | Ja (leeg), kosten overbodig | `coopfigures_test.mjs`, `coopfiguur_test.mjs` (met spelers) |
| Camera (`coop.js`, `coopnet.js:76/1119`) | `CAMERA_DELEN` is `false`; `world.coopCam` blijft `null`; companion-AI ongemoeid | Ja | `coop388_test.mjs`, `gastkant_388.mjs` (gastkant) |
| Politie/wanted (`coopgezocht.js`, `coopnet.js:1109`, `hud_panel.js:1008`) | `world.coopWanted` leeg; `zichtbaarWanted` geeft `world.wanted`; `hudWanted` 0; `politieMetDoelwit` doet de gewone `updatePolice`; sterren-HUD gelijk | Ja | `coopbestuur_test.mjs` (gezocht per speler), `coopgezocht`-delen; geen solo-case |
| Missies/story (`missions.js`, `story.js`, `heist.js`, `coopmissie.js`) | `coopOpdrachtDoor` geeft `false` (`teamDown([])`), dus missie faalt bij respawn zoals altijd; `coopGroepDeelnemers` geeft `[0]`, dus groepsbonus-factor 1; inbraakbuit met één plek = gewone beloning (`heist.js:765-780`); `coopUitslag`/`coopDeel` zijn no-ops zonder gasten; `fixedChars` zet de verhaalwissel uit (H4) | Ja, op H4 na | `coopmissie_test.mjs`, `coopverhaal_test.mjs`, `mission_chain_test.mjs`, `heistrollen_test.mjs`; geen test met een host zonder gasten |
| Prestaties (`achievements.js`, `achievementtracker.js`) | `coop_uur` telt alleen met `w.coop.remote` (`achievementtracker.js:265`), dus niet in solo; geen andere coop-koppeling | Ja | `achievements`-tests dekken dit niet expliciet; pure check toevoegen |
| Voertuigen (`ownedvehicles.js`, `coopbezit.js`, `coopbijbaan.js`, `sidejobs.js`, `buscoop.js`) | `eigenVoertuigen` wordt alleen bij een gast opzijgezet (`coopnet.js:484-496`, `ownedvehicles.js:395/513`); bijbanen met samen-regels vallen terug op de gewone hostbeloning (`coopbijbaan.js:238-245`, `sidejobs.js:463-478`); buscoop doet niets bij minder dan 2 deelnemers (`buscoop.js:85`) | Ja | `coopbezit_test.mjs`, `bijbaan_test.mjs`, `buscoop_test.mjs`; geen solo-case |
| Sessie-start/online (#528, `sessionboot.js`) | Solo-sessie blokkeert `canBootSession` en kan een lopende boot kruisen (H1) | Nee | `sessionboot_test.mjs` (zonder solo-host) |
| Aankondiging/openbare lijst (`net/hub.js`, `sessionboot.js:197-211`) | `startHost` maakt geen `openbaar`-regel en opent geen broker; `sessionboot.hostSession` doet dat wél | Ja, mits `coopsolo` `startHost` gebruikt en niet `hostSession` | `nodehost_lijst_test.mjs`, `sessionboot_test.mjs` |

## Performance

Gemeten in Node op deze worktree (microbenchmark, geen browser; wereld zonder kaart, voor de
missietest met een nep-opdracht; 5.000 ticks van `tickCoopNet` met een host zonder gasten):

| Scenario | Kosten per tick | Bijzonderheden |
|---|---|---|
| host, 0 gasten, geen missie | ~5,3 µs | 57 `hub.announce`-aanroepen in 5.000 ticks (klok en hash; het weerbericht verviel omdat de nepwereld geen weerstand had), allemaal naar nul sessies |
| host, 0 gasten, actieve missie | ~8,8 µs | groep van één wordt bijgehouden; `missieBericht` 2×/frame |
| host, 0 gasten, met `scene`-hook | ~8,4 µs in Node | `readHostScene` 312× in 5.000 ticks (4×/s); in de browser komen daar echte DOM/layout-lezingen bij |
| `startHost` / `stopCoopNet` | ~1,4 ms / ~0,5 ms | stop doet ook de `verrekenEinde`-save |

De absolute kosten zijn beperkt, maar dit is nieuwe code in elke frame van het solospel. Wat er per
frame draait in de host-tak (`coopnet.js:1000-1120`):

- `hub.tick` (leeg: geen sessies, geen wachtenden), `tickPings`, de 7/8/9-toetsen (M7);
- `bouwSpelers` elke 0,25 s, `werkFoci` elke frame, `stepFigures` + `bandFiguren` +
  `bandMetgezel` (meteen terug), `bestuurTick`/`treinTick`/`wapenTick` (lege tabellen),
  `stapMetgezelInPauze` (geen `remote`);
- klok elke 2 s (`net/speelklok.js:7`), weer elke 4 s (`coopweer.js:7`), hash + `hostView` elke 5 s
  (`net/desync.js:7`), scene 4×/s als de hook bestaat, plus `meldVoertuig` en `meldNeer`;
- `werkGroepenBij` + `missieBericht` (2×) + `nodigUit` elke frame zolang een missie loopt;
- `partnersInfo`/`ververs` (nieuwe arrays) en `coopPartner` elke frame;
- in `main.js` daarnaast `updatePartnerChip`, `syncFigures` en `syncPings` (L7).

Wat zonder gasten overgeslagen kan worden zonder de sessie stuk te maken:

1. **Alle uitzendingen** naar `hub` (klok, weer, hash, scene, meldingen, uitslag, `coopDeel`) als
   `hub.sessions.size === 0 && hub.pending.size === 0`. `HostHub.announce` (`net/hub.js:140-143`)
   doet dan toch niets. Let op: `onJoin` (`coopnet.js:316-336`) verwacht bij een late gast dat
   `n.missie` bestaat. Een solo-hub heeft geen transport (niemand kan binnenkomen, ADR 0022), dus
   dat is geen probleem; wordt "later alsnog iemand toelaten op dezelfde hub" ooit gewenst, dan moet
   de missiestand bij `onJoin` uit `world.mission` komen.
2. **Gastenboekhouding**: `bouwSpelers`/`coopSpelers`, `partnersInfo`/`ververs` (na één keer zetten
   voor #446), `werkFoci`, `stepFigures`/band, `meldVoertuig`, `meldNeer`, de scene-hook,
   `cutHostStart`/`cutHostTik`, `bakePanel`, `werkGroepenBij`/`missieBericht`/`nodigUit`, de
   wedstrijd-/bijbaan-/PvP-hostticks. De sessie blijft intact: `world.coopRole`/`coopNet` blijven
   staan voor #448, en `stopCoopNet` ruimt alles op (`coopnet.js:1581-1612`).
3. **`hub.tick`** mag overgeslagen worden zolang er geen sessies en geen wachtenden zijn; hij doet
   alleen sessies en pending verbindingen.
4. **`main.js:719-721`**: `updatePartnerChip`/`syncFigures`/`syncPings` overslaan bij
   `isSoloHost`; de `else`-tak van `main.js:722` is al goedkoop.
5. **Extra saves** (M6): de 60 s-checkpoint en de `markDirty` bij elke beloning zijn voor #448
   bedoeld; in solo kan de gewone autosave het werk doen. Het stoppen van de solo-sessie (één keer,
   bij het openen van Samen) mag best een save doen.

De eenvoudigste implementatie is een expliciete markering (`world.coopNet.solo = true`, gezet door
`coopsolo.js` na `startHost`) plus een vroege, kleine host-tick in `tickCoopNet`: als
`isSoloHost(world)`, alleen doen wat de sessie zelf nodig heeft (tijd bijhouden, `world.players` één
keer zetten, `verrekenBeloning` blijft markeren) en de gastentak overslaan. Een alternatief is een
`startHost(..., { solo: true })`-optie die de gasten-opzet meteen niet aanzet; dat is beter
onderhoudbaar, maar vraagt een kleine uitbreiding van `coopnet.js` en tests.

## Tests die volgens mij ontbreken

Naast de bestaande tests (`scripts/coopnet_test.mjs`, `scripts/coopladen_test.mjs`,
`scripts/sessionboot_test.mjs`, `scripts/coopsave_test.mjs`, `scripts/coopspelers_test.mjs`,
`scripts/alleenspelen_test.mjs`) mis ik:

1. **`scripts/coopsolo_test.mjs` (nieuw, puur):** `startSoloHost`/`stopSoloHost`/`isSoloHost` op een
   nepwereld: precies één hub, roster alleen plek 0, geen `hub.sessions`/`pending`, `coopRole`
   host; stoppen zet alles terug (`coopNet` null, `coopRole` null, personages/local hersteld) en doet
   één save.
2. **Geen netwerk/aankondiging:** een test die `WebSocket`/`fetch`/`RTCPeerConnection` afvangt en
   bewijst dat een solo-start er geen opent, en dat `hub.zetOpenbaar`/`maakAankondiger` niet worden
   aangeroepen (dit is de "geen aankondiging"-eis uit het besluit).
3. **Startvolgorde in `main.js` (broncheck):** solo-start alleen als geen `coopNet`/`coopWissel`,
   geen `wantsOpenSamen`, geen Samen-scherm, geen lopende `sessionBootState`; en de stop vóór het
   tekenen van het Samen-paneel.
4. **#528-interactie:** met toestemming "Ja" mag de solo-sessie de boot niet blokkeren; met "Nee" of
   een mislukte boot komt er precies één solo-sessie. Inclusief een boot die tijdens het starten
   alsnog een sessie opent (geen tweede hub).
5. **Opslaan/laden/nieuw/verwijderen in solo:** `coopSessieLoopt`/`loadSlot`/`applySave` en de
   teksten; "Nieuw spel" en "Verwijderen" werken zonder sessie-jargon; de `coopladen_test`-teksten
   zijn aangepast.
6. **Samen-paneel met een solo-host:** na openen geen adoptie, geen kamercode en geen "Wacht op een
   medespeler" uit een hub zonder transport; daarna een echte host kunnen starten.
7. **HUD/UI in solo:** Tab toont niets, geen "1 spelers"-badge, Spelers-tabblad verborgen, geen
   roepjes/baken bij 7/8/9, geen PvP-arena-"minstens twee spelers" maar de bestaande
   "alleen in Samen spelen"-tekst.
8. **Controller en lokaal spel:** met een solo-host geen `PAD_COOP` en geen `sticky`; `?coop` lokaal
   blijft speler 2 besturen.
9. **Onboarding:** de kaart "Samen spelen" verschijnt nog steeds in een solo-sessie.
10. **Missies/story/prestaties/voertuigen in solo:** geen dubbele beloning (host krijgt zijn geld
    één keer), `coopOpdrachtDoor` laat een missie bij respawn falen zoals vroeger, inbraakbuit ongewijzigd,
    `coop_uur` komt niet vrij, `world.players`/`world.coopRoster` blijven consistent; de
    `step.player`-wissel (testfixture) blijft werken als `fixedChars` niet gezet wordt.
11. **Performance/geen werk voor niemand:** tel met een solo-host de `hub.announce`-aanroepen en
    `readHostScene`-aanroepen (0, respectievelijk 0 zonder scene-hook) over een paar honderd frames,
    zodat de gastentak niet per ongeluk terugkomt.

## Wat ik niet heb bekeken

- `game/js/coopsolo.js` bestond nog niet; dit rapport toetst het plan, niet de uiteindelijke
  implementatie. De regelnummers gelden voor commit `78db7781`; na het toevoegen van de solo-start
  in `main.js` kunnen ze verschuiven.
- Geen browser- of Electron-run, geen screenshots, geen echte controller, geen audio: de DOM- en
  framekosten zijn beredeneerd en in Node gemeten, niet in het spel zelf gevoeld.
- Geen netwerktest: dat `startHost` geen verbinding opent is uit de code gelezen (en in de
  Node-benchmark gebeurde er niets), maar niet met een echte broker/STUN gecontroleerd.
- De Electron-testbank en `node scripts/test_all.mjs` heb ik niet gedraaid (dat is aan de
  coördinator); de genoemde tests zijn op naam en inhoud gelezen, niet uitgevoerd.
- De nieuwe documentatie van de koerswijziging (het werk van de docs-taak) heb ik niet als
  uitgangspunt genomen; dit rapport gaat uit van de code en ADR 0022.
