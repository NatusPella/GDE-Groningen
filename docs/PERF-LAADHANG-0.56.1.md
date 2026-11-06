# Laadhang 0.56.1: de wegen-idle-guard (#553)

> Onderzoek naar de melding dat 0.56.1 op sommige machines in het laadscherm bleef
> hangen. De twee prestatie-wijzigingen van 0.56.1 zijn in 0.56.2 teruggedraaid.
> Dit rapport wijst de schuldige aan, bewijst de gevaarlijke toestand met een
> deterministische test en doet een veilig voorstel voor de wegen-optimalisatie.
> Gerefereerd wordt aan de code van tag `v0.56.1`. De terugdraai staat inmiddels
> op main (commit `7a50f149`) en in de hotfix `0.56.2`; op main is `syncRoads`
> dus weer de versie van 0.56.0.

## Samenvatting

- **Oorzaak:** de wegen-idle-guard in `syncRoads` (scene3d.js) sloeg de
  grid-bevraging over zolang de focus stil stond, maar `streamStat.r` (de teller
  waar `streamPending().roads` en dus het laadscherm op wachten) wordt alleen in
  de volledige pas gezet. De guard keert daar vóór terug en controleerde nergens
  dat er niets meer open stond.
- **De ontsnapping van 6 frames was dode code.** `update3D` zette het
  idle-record (`roadSyncIdle`) aan het eind van *elke* frame opnieuw, ook na een
  overgeslagen pas. `roadSyncFrame - roadSyncIdle.frame` was daardoor altijd 1,
  dus de geplande volledige pas na 6 frames kwam nooit.
- **Gevolg:** na een sprong (of bij de eerste streaming) blijft `roads` op de
  waarde van de eerste pas staan zolang de speler stil staat. Het laadscherm
  haalt daardoor alleen zijn klok-time-out (12 s in plaats van ~1,4 s), het
  startscherm zijn poort-time-out (20 s, plus 2 s), en de garageplanning
  (`mapQuiet()`, zonder time-out) wacht onbegrensd.
- **Eerlijk:** een *letterlijk* oneindige hang heb ik in deze code niet kunnen
  aantonen — beide schermen hebben een time-out. Wat wél overtuigend is
  aangetoond: de teller bevriest deterministisch, en daarmee hangt elk scherm
  dat op `streamPending` wacht aan zijn time-out. "Eindeloos" in de melding past
  bij een scherm dat alleen op zo'n noodgreep verdergaat (en bij de garage, die
  geen noodgreep heeft).
- **De terugdraai in 0.56.2 is terecht.** Hetzelfde bestand laat zien hoe het
  veilig moet: de gebouw-guard in `syncBuildings` doet het al goed (zie
  "Veilig voorstel").

## Wat 0.56.1 veranderde

Alleen in `game/js/scene3d.js` (commit `21bdae99`, tag `v0.56.1`):

1. `syncRoads` kreeg een idle-guard (regel 2054 en 2062-2064):

   ```js
   let roadSyncIdle = null, roadSyncFrame = 0;
   // …
   roadSyncFrame++;
   if (roadSyncIdle && !openSpans.size && !world.quake && roadSyncIdle.q === roadQuality
       && roadSyncIdle.dist === DRAW_DIST && roadSyncIdle.meshes === roadMeshes.size
       && roadSyncFrame - roadSyncIdle.frame < 6
       && Math.hypot(px - roadSyncIdle.x, py - roadSyncIdle.y) < 0.15) return;
   roadSyncIdle = null;
   ```

2. Het record werd aan het eind van `update3D` gezet (regel 2543), dus na
   *elke* frame:

   ```js
   roadSyncIdle = { x: focus.x, y: focus.y, q: roadQuality, dist: DRAW_DIST,
                    meshes: roadMeshes.size, frame: roadSyncFrame };
   ```

3. Bouw- en wegmeshes kregen `matrixAutoUpdate = false` (regels 1758 en 2099).

## Welke waarden zet `syncRoads` in `streamStat.r`

`streamStat` staat op regel 1837-1838; `streamPending()` geeft die twee tellers
aan het laadscherm. `streamStat.r` wordt op precies drie plekken gezet, alle drie
binnen de volledige pas van `syncRoads`:

| Regel (v0.56.1) | Waarde | Wanneer |
|---|---|---|
| 2108 | `0` | begin van de telling, als er ontbrekende wegen zijn; daarna telt 2111 |
| 2111 | aantal ontbrekende wegen | per weg in het zicht die nog geen mesh heeft, ook als de geometrie nog niet klaar is |
| 2116 | `0` | `roadsNear()` gaf geen ontbrekende wegen (alles is al gebouwd) |

De teller telt dus **alle** ontbrekende wegen in het zicht, ook wegen waarvan de
geometrie nog van de geometry-worker moet komen. De guard staat vóór al deze
regels (regel 2063): een overgeslagen pas laat `streamStat.r` staan op de waarde
van de vorige volledige pas.

## Wanneer blijft `roads` > 0

Na een sprong (snelreizen, teleport, respawn, save laden) of bij de eerste
streaming is de eerste volledige pas zelden meteen klaar:

- Het budget is `ROAD_BUILD_MS = 2,5 ms` per pas (regel 1833/2081); de lus bouwt
  minstens één weg en stopt daarna bij de deadline.
- De geometrie komt asynchroon van de worker (`roadGeometryReady`,
  roadsurface.js): zodra één weg nog niet klaar is, wacht de lus
  (`waiting = true`) en blijven de volgende wegen van die pas liggen.
- `DRAW_DIST` is 140-190 m (`viewdist.js`); in de stad betekent dat tientallen
  ontbrekende wegsegmenten. Eén pas van 2,5 ms bouwt daar maar een handvol van.

Zodra die eerste pas klaar is, geldt voor de guard: focus staat stil (het
laadscherm zet `world.uiPaused = true`, loadscreen.js regel 111-112), geen brug
open, geen quake, dezelfde kwaliteit en afstand, en `roadMeshes.size` verandert
niet meer. De guard slaat daarna **elke** volgende pas over — en omdat het
record elke frame ververst, komt de ontsnapping van 6 frames nooit. Alleen een
beweging van meer dan 0,15 m, een open brug of een quake doorbreekt de stilte.

Op een machine waar de eerste pas toevallig alles bouwt (alle geometrie al klaar
en binnen 2,5 ms) is er niets aan de hand; daarom trof het niet iedereen even
hard. Op de meeste machines blijft er echter werk over, en dus staat de teller
stil.

## Hoe vaak draait `syncRoads` tijdens het laden

`syncRoads` wordt alleen vanuit `update3D` aangeroepen (regel 2536). Tijdens het
laden draait `update3D`:

- **startscherm:** via de renderlus van `startscreen.js` (regel 858) op
  `MENU_FRAME_S[1] = 1/30` s, dus ~30 keer per seconde;
- **laadscherm-overlay en spel:** via de hoofdlus (`main.js` regel 743), elke
  frame, omdat er geen menu-cover open is; de wereld is wel gepauzeerd.

Van al die aanroepen is er in de gevaarlijke toestand **één** nuttig: de eerste
pas direct na de sprong. Daarna doet elke aanroep een vroege return. De
grid-bevraging en Set-opbouw worden dus inderdaad bespaard — maar de wegenbouw
staat ook stil, en dat is precies wat het laadscherm ziet.

## Waarom het laadscherm dan wacht

- **Overlay** (`loadscreen.js` regel 143-154): leest elke frame
  `streamPending()` en geeft `st.buildings + st.roads` aan `stepProgress`.
  Klaar is het pas bij `done`, en dat vereist volgens `loadlogic.js` regel 33-34
  twaalf frames op rij met `pending === 0` (`calm >= 12`) **of** `elapsedS > 12`.
  Met een bevroren `roads` komt die rust-teller nooit vol; het scherm wacht de
  volle 12 s uit.
- **Startscherm** (`startscreen.js` regel 838-839): de poort `makeMenuGate`
  (menuready.js) gaat pas open bij `pending === 0`, anders op zijn time-out van
  20 s (regel 8 en 22-23), met daarnaast een `setTimeout` op 22 s (regel 814).
  Ook hier: de volle time-out.
- **Garageplanning** (`parkeergarage.js` regel 466-471 en 484): `mapQuiet()`
  wacht op `streamPending().buildings + .roads === 0` en heeft **geen**
  time-out. Dit is de enige wachter die echt onbegrensd is: zolang de speler
  stil bij een garage staat, wordt er geen poort gepland.

De matrixbevriezing (`matrixAutoUpdate = false`) is hier niet de verdachte: die
meshes zijn statisch, verplaatsen niet, en `updateMatrix()` gebeurt direct na het
zetten. Er is geen pad gevonden waarin dat de teller of het laden beïnvloedt.
Mee terugdraaien was verstandig omdat de oorzaak niet geïsoleerd was, maar het
is niet deze wijziging die de teller bevriest.

## Bewijs: de deterministische test

`scripts/loadstall_test.mjs` (nieuw, puur, geen DOM/THREE, ~0,1 s; draait mee in
de lichte fase). `scene3d.js` is daar nagebouwd — de guard van 0.56.1 inclusief
de per-frame verversing — met de **echte** `stepProgress` uit `loadlogic.js` en
de **echte** `makeMenuGate` uit `menuready.js`. De test laat zien:

1. **0.56.1 op het startscherm:** 40 wegen in het zicht, bouwbudget 3 per pas
   (de 2,5 ms in het echt) → na de eerste pas staat `roads` op 37 en er volgt
   nooit meer een volledige pas. De poort gaat pas open op 20 s en meldt
   `timedOut`. Het verschil `roadSyncFrame - roadSyncIdle.frame` is bij elke skip
   1 en komt nooit bij de grens van 6: de ontsnapping is dode code.
2. **Zonder guard (0.56.2):** dezelfde 40 wegen zijn na 14 frames gebouwd, de
   poort opent na ~0,25 s, het laadscherm is op de rust-teller klaar (~1,4 s) en
   gebruikt de time-out niet.
3. **Een guard met een echte 6-frame-ontsnapping maar zonder nul-toets**
   ("half"): herstelt zichzelf (maximale skip-afstand 5, scherm klaar binnen
   2 s). Dat bewijst dat het de *combinatie* is: geen nul-toets én de
   per-frame verversing.
4. **De veilige guard** (alleen skippen als `roads === 0`, record alleen na een
   pas zonder ontbrekende wegen): bouwt de wegen normaal af, slaat tijdens het
   laden nooit over terwijl er werk open staat, en bespaart daarna bij
   stilstand nog steeds het wegenwerk (een op de zes frames blijft een
   volledige pas, precies zoals `SYNC_IDLE_FRAMES` bedoelt).
5. **Broncheck op de echte code:** elke vroege `return` in `syncRoads` vóór de
   eerste `streamStat.r =` moet `streamStat.r === 0` (of
   `streamPending().roads === 0`) toetsen. De test bewijst dat die controle de
   letterlijke regel van 0.56.1 afkeurt (geverifieerd op tag `v0.56.1`) en een
   guard met de nul-toets goedkeurt. Zo kan de gevaarlijke guard niet
   terugsluipen zonder dat de test rood wordt.

## Veilig voorstel om de wegen-optimalisatie later terug te zetten

De gebouw-guard in hetzelfde bestand (`syncBuildings`, regel 1686-1700 en
1806-1808) doet precies wat de wegen-guard had moeten doen. Neem dat patroon
over:

1. **Alleen skippen als er niets meer open staat.** Zet in de guard
   `streamStat.r === 0` (equivalent: de pas eindigde met `missing.length === 0`).
   Een guard die een teller > 0 kan bevriezen is per definitie fout, want dat is
   de teller waar het laadscherm op wacht.
2. **Zet het idle-record alleen na een echte, volledige pas** — niet aan het eind
   van elke `update3D`. Dan werkt de ontsnapping `roadSyncFrame - idle.frame < N`
   echt (maximaal N-1 overgeslagen frames) en is een vastgelopen situatie na
   hooguit N frames weer bekeken. Laat de ontsnapping staan, ook met de
   nul-toets.
3. **Sla de optimalisatie niet aan tijdens het laden.** Extra veiligheid:
   `document.body.classList.contains('game-started')` (of `!world.uiPaused`) in
   de guard, zodat laadscherm en startscherm nooit op de snelweg wachten. Een
   `perfOff('wegsync')`-uitlezer, zoals `perfOff('bouwsync')` bij gebouwen, maakt
   het meten makkelijk.
4. **Meet eerst.** `docs/PERF-METING-2026-11-05.md` laat zien dat de winst in de
   staart zit (streamen, mesh-werk, GC), niet in de mediaan. Bewijs met een
   CDP-profiel dat `roadsNear` + Set-opbouw echt de kosten zijn vóór er weer een
   guard in gaat; een goedkopere variant (bijv. de uitslag cachen per focuscel)
   is misschien veiliger én effectiever.
5. **Test mee.** `scripts/loadstall_test.mjs` modelleert de veilige guard al;
   breid hem uit zodra de echte guard terugkomt (de broncheck dekt de
   nul-toets). Noteer de meting en de test in #553.

## Wat niet is getest

- Geen echte 0.56.1-build op een trage machine of in Electron gedraaid; het
  bewijs is codeanalyse plus de deterministische modeltest.
- Geen profiler- of CDP-meting van de wegenpas; de uitspraak dat de guard werk
  bespaart komt uit de code, niet uit een meting.
- Een letterlijk oneindige hang is niet gereproduceerd: de twee schermen hebben
  time-outs (12 s en 20/22 s). Alleen de garageplanning heeft er geen.
- De matrixbevriezing is niet apart gemeten; alleen beredeneerd dat die de
  laadteller niet raakt.

## Bestanden

- `scripts/loadstall_test.mjs` — nieuwe deterministische test (lichte fase).
- `docs/PERF-LAADHANG-0.56.1.md` — dit rapport.
- Geen gamecode gewijzigd; de terugdraai staat op main (`7a50f149`) en in de
  hotfix `0.56.2`.
