# Pop-in bij cutscenes die van plek wisselen (22-11-2026, #1016, #1008)

> Opdracht van de eigenaar: cutscenes die over meerdere locaties gaan (de opening, de verhuisdag, reisscènes, intochten,
> overgangsscènes) laten gebouwen, bomen, props, voertuigen, voetgangers, wegen en gras niet zichtbaar verschijnen als een
> shot begint of de camera naar een nieuwe plek springt.
> Tak `cutscene-popin-22-11` vanaf `origin/main` (`80311a16c`). Niets gepusht of gemerged. **Geen Electron en geen build
> gedraaid** (de exclusieve perf-meting liep): alles hieronder is bewezen met pure tests en mocks, het effect in beeld is
> nog niet bekeken (zie "Meetpunten voor de Electron-run").

## 1. Hoe de engine van plek wisselt (inventaris)

| Soort scène | Hoe de plek wisselt | Wat al vooruit werd geladen |
|---|---|---|
| Geregisseerde scène (`cutscenes*.js`, `cutscript.js`, via `cutscenehost.js playScript`) | Alles lokaal aan één anker (`f` vooruit, `s` links); een shot is `cut`, `dolly`, `orbit` of `follow` binnen ca. 45 m van het anker. Het anker zelf verschuift alleen naar vrije grond (`fitAnchor`). Er is geen teleport tussen shots. | `shotPoints` (hoogstens 24 punten, elke 2 s een camera- en kijkpunt) gaan als `prewarm` mee: `holdShotTiles` pint hun tegels (straal 350 m, wachten tot 1,5 s) en `prewarmStreamAt(x, y)` bouwt de gebouwen binnen 110 m, **4 s lang**. |
| Openingsfilm (`intromontage.js buildShots`, `openingfilm.js SEQUENCE`) | Eén `playCinematic` met een `shot(u, t)`-functie; elke shot heeft een eigen `focus` en de camera staat per shot ergens anders (Martinitoren, Vismarkt, de Oosterparkwijk, de keuken 345 m boven de straat, de flat in Paddepoel). Dit zijn de echte teleports. | Het laadscherm (`main.js` warm-stap) pint de tegels en bouwt de gebouwen van `introShotPoints`; daarna niets per shot. |
| Wijkintochten (`intochten.js`, `camerapath.js veroverTourShot`) | Eén doorlopende baan door 3 tot 5 stops met een easing; geen cut, maar de baan passeert de stops snel. | `tourPrewarm`: de eerste 8 punten, bij de start. |
| Reisscènes (`reisrit3d.js`) | Taxi, trein en vlucht volgen een pad. | `warmRoute` (tegels langs de hele route) en `prewarm` begin, eind en tussenpunt. |
| Overige `playCinematic`-aanroepen (`fjordtrain`, `heist`, `stationtravel`, `rondvaartchase`, `respawn`, `story`, `storyfun`, `uitjescene`, `postgame`, `pg_koe`, `missions`) | Elk met een eigen camerafunctie; de meeste zonder `prewarm`. | Niets of alleen wat `cinematics.js` zelf doet. |

### Welke streaminginstellingen tijdens een cutscene gelden

- **Streamfocus:** `tileFocus` (`tilefocus.js`) volgt het kijkpunt van de camera (hoogstens 80 m van het oog, een luchtshot tot 300 m), niet de
  speler. Een sprong (meer dan 150 m in één frame) wist de snelheid: geen kijkrichting-prefetch uit een sprong. **De focus verhuist dus pas
  op de frame van de cut**; wat dan nog niet staat, komt daarna binnen.
- **Budget:** `main.js` zet `cine = true` zodra `intro-montage` of `cine-hide-hud` aan staat of `cineQuiet` loopt. `budgetFor` knipt het
  totale streamingbudget dan op **40 % van het plafond (1,6 ms per frame)** (`streamplanner.js`). Een film krijgt dus bewust weinig; het
  `loading`-budget (20 ms) bestond alleen achter het laadscherm.
- **Urgent:** werk dat de speler nu nodig heeft (`placementurgency.js`) heeft een eigen budget van 6 ms en wordt in een cutscene niet vastgehouden; niets
  daarvan kent de camera van de scène.
- **Achtergrondvensters** (`bgQueue`) worden tijdens een film vastgehouden (`holdBackground`, `cineQuiet`), zie `docs/PERF-REGRESSIE-22-11.md`.
- **LOD-hysterese** (`lodstable.js`): de detailring groeit niet binnen 300 ms na een krimp, een gebouw dat uit beeld raakt blijft 4 s gebouwd. Een cut
  naar een plek die al in de vorige ring lag, is dus goedkoper dan een cut naar een nieuwe plek.

**Waar de pop-in dus zit:** bij een sprong naar een nieuwe plek staan de tegels gepind (als de scène een `prewarm` heeft) maar de rijen, de gebouwmeshes
met detail, de wegen, het gras, de voertuigen en de voetgangers van die plek worden pas na de cut gevraagd, met 1,6 ms per frame. De
gebouw-prewarm van de scène is na 4 s verlopen en dekt een shot op 100 of 150 s niet.

## 2. Audit: `scripts/cutscene_locaties_audit.mjs`

`node scripts/cutscene_locaties_audit.mjs [--json] [--strict] [--top=N] [id-filter]`: pure data, geen render. Loopt de hele catalogus (`cutpreview.js`:
108 scènes met een scrubbare camera) plus de openingsfilm (`openingfilm.js SEQUENCE`) door en meldt per scène de sprongen (afstand van het eind van het vorige
shot naar het begin van het volgende, het streamfocus zoals `tilefocus.js` het kiest), het stuk van de baan buiten de gepinde tegels, de snelste focusbeweging
en welke sprongen de vooruit-warm nu dekt. `--strict` faalt op een harde sprong zonder poort.

**Uitkomst (22-11):**

- **108 scènes uit de catalogus plus de openingsfilm; 1 scène heeft een sprong (de openingsfilm), 1 een harde.** Alle geregisseerde scènes blijven om hun anker
  (grootste cut 32 m, `story-opening-trailer`): daar is geen locatiesprong, de eigen prewarm dekt ze.
- **Openingsfilm (171 s), vier harde sprongen:** Martinitoren naar de bikes bij de Vismarkt (315 m, t = 8,6 s), Vismarkt naar de Oosterparkwijk (1.672 m, 15,2 s),
  de keuken naar de woontoren in Paddepoel (130,2 s) en naar de zweefvlucht (166,4 s) (de laatste twee hangen aan de gegenereerde wereld en zijn als 3.000 m aangenomen).
  De keukenshots (Zolderkeuken, zolder, kiosk) staan op dezelfde x en y en tellen niet. Het laadscherm warmt alles bij de start; shots later dan ca. 10 s zijn
  daarna vooral afhankelijk van wat de ring nog heeft.
- **Wijkintochten: geen cuts, wel snelle banen.** De focus loopt tot 194 m/s (Oud-Oost), 178 (Oud-West), 142 (Nieuw-Noord), 129 (Oud-Noord), 102 (Zuidwest): ver
  boven wat `tileFocus` als snelheid doorgeeft (begrensd op 80 m/s) en boven de 25 m/s waarbij het budget al terugvalt. Nieuw-Noord heeft 3 % van zijn baan buiten de
  gepinde tegels.
- **18 bestanden roepen `playCinematic` aan; 13 zonder `prewarm`** (`fjordtrain`, `heist`, `missions`, `missionstory`, `pg_koe`, `postgame`, `respawn`, `rondvaartchase`,
  `stationtravel`, `story`, `storyeikea`, `storyfun`, `uitjescene`). Hun camera is een functie zonder vaste punten: de audit kan hun sprongen niet tellen, de Electron-run wel.

## 3. Wat er gebouwd is

### `game/js/cutscenewarm.js` (puur, `scripts/cutscenewarm_test.mjs`, 78 controles)

1. **Sprongdetectie.** `jumpsFromStops` (lijst shots met focus), `jumpsFromScene` (een gecompileerde scène, per cut het focus vlak voor en na) en
   `warmStopsFromKeys` (een doorlopende baan met easing: waar is sleutelbeeld *i* bereikt). Een sprong is `soft` vanaf 60 m en `hard` vanaf 150 m
   (de drempel waarop `tilefocus.js` een sprong herkent). Korte afstand doet niets.
2. **Vooruit-warm.** `warmDue`: `leadS` = 3 s vóór de cut vraagt de loper de nieuwe plek, één keer. In `cinematics.js` is dat `prewarmStreamAt(x, y, 8 s, 150 m)`
   (gebouwen) en `TileWorld.warmPoint(x, y)` (de tegels rond de plek, 400 m, gepind met prioriteit -500 tot `releaseWarm` bij het einde van de scène). Zolang
   er gewarmd wordt, krijgt de cutscene **70 % in plaats van 40 %** van het plafond (`cineWarmFrac`, via `world.cineWarming` in `main.js`). Buiten een cutscene verandert
   er niets (geteste invariant: `budgetFor(10, { cineWarm: true }) === budgetFor(10)`).
3. **Wacht-tot-klaar voor harde sprongen.** `createJumpGate` (idle, out, wait, in): bij de cut meet de loper of de tegels van de nieuwe plek erin zitten en de
   voorgebouwde gebouwen klaar zijn. Is dat zo, dan blijft het een gewone cut (geen zwart, geen wachten). Zo niet: het beeld duikt in **240 ms** naar zwart
   (`respawnFade`, het bestaande zwart; DS3-ritme, tokens 120 en 150 ms), de scèneklok staat stil en de camera staat al op het eerste beeld van het nieuwe shot, zodat
   het streamfocus verhuist; `world.cineJumpLoading` geeft het streamen dan het **laadbudget (20 ms)**. Minimaal 120 ms onder zwart (zodat de streams hun focus gevolgd
   hebben), daarna "klaar" (tegels, voorgebouwde gebouwen, detail van gebouwen en wegen, lege tegelrij) of **na 1,2 s time-out** (terugval: de film gaat door). Dan komt het beeld in
   **260 ms** terug. Een kapotte meting, een scène die stopt (`dispose`) of een skip haalt het zwart weg en zet de vlaggen terug.
4. **Voice en ondertitels.** De klok staat stil, dus de ondertitels staan stil; de stem pauzeert mee (`pauseStoryVoice`, dezelfde route als het pauzemenu, `voicePaused`) en
   hervat daarna. Duren, `plannedVoiceLines` en `lines[].at` blijven ongewijzigd (`cutscenes_voicedur_test` groen). De scène duurt in wandkloktijd hoogstens 1,2 s plus 260 ms per harde sprong
   langer, alleen als de plek niet op tijd klaar was.
5. **Samen spelen.** Cutscenes zijn lokaal per speler; er is geen netwerkwijziging. `jumps` gaat niet in `cutPakket`. Een gast (`cutId`) warmt wel maar houdt zijn klok nooit vast (die volgt
   de gastheer, `setCinematicTime`).

### Waar het hangt

- `cinematics.js`: `spec.jumps` maakt de loper (`jumpEnv`), `tick` laat de klok via de loper lopen, de stem pauzeert mee, `finish` ruimt op (`endJumps`).
- `cutscenehost.js`: `jumps = jumpsFromScene(...)` voor elke geregisseerde scène (nu leeg, maar een toekomstige scène die van wijk wisselt is gedekt).
- `intromontage.js`: de film geeft zijn shot-plekken mee (`jumpsFromStops`).
- `intochten.js`: `warmStopsFromKeys(tourKeys(...), seconden, easeInOut)`: de stops warmen zacht vooruit, nooit een poort.
- `main.js`: `planner.openFrame({ loading: !!world.cineJumpLoading, cineWarm: !!world.cineWarming })` en de links `prewarmPending`, `streamPending` voor de klaar-meting.
- `streamplanner.js`: `cineWarmFrac`, `budgetFor(..., { cineWarm })`. `tileworld.js`: `warmPoint`, `releaseWarm`.

### Regie (opdracht 3)

Er is **niets aan regiedata veranderd**: de geregisseerde scènes springen niet (grootste cut 32 m), en de plekvolgorde van de opening volgt het script van de verhaal-lead
(`09-script-akte1.md`). `cutscene_lint --strict` is dus ongewijzigd 0 blokkerend. Kandidaten voor de Electron-ronde, nu bewust niet gedaan omdat ze beeld vragen:

- `c1-fietsen` (Grote Markt) is gebouwd bij de Vismarkt-straat, 315 m van de torenshot ervoor. Bouwen bij een straat naast de Martinitoren haalt een harde sprong weg.
- Een korte cutaway op een nabij object (de meeuw, een duif van het dak) over de cut van de Vismarkt naar de Oosterparkwijk (c1-meeuw naar c1-duiven): de zwerm duiven die
  wegstuift is al een beweging die de cut kan dragen.

## 4. Meetpunten voor de Electron-run (nog niet gedaan)

Nu beschikbaar in het spel (alleen tijdens een scène met `jumps`, geen kosten daarbuiten):

- **`window.__cineJumps`**: hoogstens 60 gebeurtenissen `{ scene, at, ev, idx, t, dist, ... }`: `warm` (de plek wordt gevraagd, `dist` = sprong in m), `cut` (op tijd klaar, een gewone cut),
  `gate` (niet klaar bij de cut, `why` = tegels, gebouwen) en `release` (`reason` = klaar of time-out, `waitedMs`). Tel per scène hoeveel van de harde sprongen `cut` waren en hoeveel een `gate` kregen,
  en of er `time-out` bij zit.
- **Pop-in tellen:** `scripts/qa/popin.mjs` (zie `docs/POPIN-21-11.md`) telt per frame wat nieuw zichtbaar wordt; draai hem op de openingsfilm (`?openingfilm`) en de intochten
  (Oud-Oost, Oud-West) en tel de gebeurtenissen in de 2 s na elke cut (`window.__cineJumps` geeft de cut-tijden). Doel: minder dan voor de wijziging, vergeleken op dezelfde wereld en machine, gepaard.
- **`tiles.cancels`** (`store.stats.cancels`) en `window.__streamPlanner.stats()` (`by.tile`, `by.building`, `by.road`, `by.ground`, `by.actors`, `queued`) aan het begin en eind van de scène: de warm-tegels moeten er zijn
  (`store.missing` leeg bij de cut) en `cancels` mag niet oplopen door `warmPoint`.
- **Schermafbeelding bij elke sprong** (de eerste 0,3 s na de cut, `--story-test` of `--clip` met de bekende klok): geen gebouwen die uit lucht komen, geen kale grond, geen lege wegen, geen voertuigen of
  voetgangers die plots verschijnen.
- **Frametijd:** ring-, foot- en spoorroute moeten ongewijzigd zijn (alleen scènes met `jumps` zetten `cineWarming`/`cineJumpLoading`); meet de openingsfilm op hitches (`--hitch`) vóór en na: de 70 % en het laadbudget onder zwart mogen
  geen hapering buiten het zwart geven.
- **Zwart:** controleer dat het zwart niet langer dan 240 ms uit en 260 ms in duurt, dat de time-out (1,2 s) in de praktijk niet voorkomt en dat de stem na het zwart op de goede regel hervat.

### Scènes voor de hertest (grootste sprongen en banen)

| Scène | Waarom | Wat kijken |
|---|---|---|
| Openingsfilm (171 s) | 4 harde sprongen (315 m, 1.672 m, twee naar Paddepoel) | elke cut van `c1-fietsen`, `c1-duiven`, `c3-toren`, `c3-zweef`: `__cineJumps`, pop-in in de eerste 2 s |
| `intocht:Oud-Oost` | focus tot 194 m/s | gebouwen en gras langs de baan, na elke stop |
| `intocht:Oud-West` | 178 m/s | idem |
| `intocht:Nieuw-Noord` | 142 m/s en 3 % buiten de gepinde tegels | kale stukken |
| `intocht:Oud-Noord`, `intocht:Zuidwest` | 129 en 102 m/s | idem |
| `story-opening-trailer` | grootste cut van de geregisseerde scènes (32 m) en een kraanshot tot 18 m | de overgang straat naar kraan |
| `M02.intro` | focus 72 m/s | shots rond het anker |
| Reisscènes (`reisrit3d`: taxi, trein) en `stationtravel` | lange paden, geen `jumps` | pop-in langs de route; of `warmRoute` volstaat |
| `fjordtrain`, `heist`, `rondvaartchase`, `respawn` | `playCinematic` zonder `prewarm` | eerste frames na het begin |

## 5. Wat niet is gedaan of bewezen

- Geen Electron, geen beeld: het effect op de pop-in zelf, de lengte van het zwart in de praktijk en de frametijd zijn niet gemeten.
- Het streamfocus verhuist onder zwart naar het eerste beeld van het nieuwe shot; of alle systemen (gras, voertuigen, voetgangers) daarvan binnen 120 ms tot 1,2 s volledig bijkomen is aan de run.
- De afstand van de twee Paddepoel-sprongen is aangenomen (de flat hangt aan de gegenereerde wereld); de audit meldt ze als zodanig.
- De momenten van `cinematics.js` (landmerk, ommelanden, respawn) hebben geen vaste punten en zijn niet in de audit.
- `tileworld_test.mjs` heeft in deze worktree geen `data/cache` en is niet gedraaid; `warmPoint` is getest met een nepstore in `cutscenewarm_test.mjs`.
