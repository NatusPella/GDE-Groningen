# Perf-regressie ring, foot en spoor sinds v0.64.0 (22-11-2026, #1052)

> Opdracht van de coördinator: de gate voor 0.65.0 was rood op perf (`docs/GATE-RAPPORT-22-11.md` op `gate-0.65-22-11`: ring p95 106 ms met `--hitch`, foot 54,7, spoor 51,5, tegen 34,3, 35,3 en 36,4 met de JS van v0.64.0). Vind de commit(s), fix, meet opnieuw.
> Tak `perf-regressie-22-11` vanaf `gate-0.65-22-11` (`3f0f4acc7`). Niets gepusht of gemerged.

## Uitkomst in zes regels

1. **De regressie is geen tegelbeleid in het algemeen maar één commit: `c5b375720` ("plaatsingsvensters werken de tegels niet meer in één klap af", #1052)** op de route foot, en voor ring en spoor de latere planner-commits die dezelfde afvoer verder uitrekken. Bisect: `bc4473474` (de commit ervoor) foot p95 34,3 (18,4; 34,3; 36,3), `c5b375720` 105,9; 107,5; 128,8.
2. **Mechanisme.** De plaatsingsvensters (`placement` 187 tegels: garages, cafés en winkels in de Ommelanden; `kits` 76; `koe` 42) werken hun tegels niet meer in één klap af, maar in een achtergrondwachtrij (`bgQueue`) die tijdens de openingsfilm plus `cineQuiet` (tot ca. 50 s) wordt vastgehouden. Daarna stonden 261 tegels te wachten die de eerste speelminuten (en in de gate dus de routes foot, ring en spoor) haperingen van 50 tot 100 ms gaven. In v0.64.0 was dit werk klaar op 21 s, midden in de film, vóór de routes.
3. **Waarom het erger werd na `c5b375720`:** een achtergrondvenster met slice 6 (de plaatsing bij het laden in `main.js`) kreeg in de pomp het **urgente** budget (6 ms per frame, los van frametijd, schuld en film); de rijen van 261 tegels liepen round-robin (alle tegels tegelijk bijna af); elke tegel verhoogde `junctionVer` en `geoVer`, waarna het kruispuntmodel, de signaalgrid, de lichtenlijst en het straatmeubilair over alle tegels heen herbouwden (`nearestOnRoadList` via `furnitureForTile` ca. 1 s CPU per 17 s rit).
4. **Fix (3 commits, `1ca119f31` en `df6ea5c4b`):** zie "Wat er gewijzigd is".
5. **Resultaat (p95, `--hitch`, drie runs, dezelfde wereld en machine):** foot 33,4 (was 54; v0.64.0 35,5), ring los 33,4, spoor en ring in de reeks nog 50 (zie "Wat niet opgelost is").
6. **Niet bereikt:** ring en spoor in de reeks foot, ring, spoor staan op 50 ms (3 vsync); de afvoer blijft een druppel die in de gate-run over de routes loopt. Zie "Wat niet opgelost is".

## Meetopzet

`node scripts/perf/run.mjs <naam> --hitch` met `PERF_ONLY=foot,ring,spoor` (de gate-set `release` is te lang voor een bisect), 1920x1080, `--force-device-scale-factor=1`, RTX 3060, Electron uit de hoofdmap, één Electron tegelijk, eigen profiel en uitvoermap in de worktree (Electron schrijft hier alleen binnen de worktree). **De wereld is de gecachte wereld van 20-11** (`desktop/.world-cache/world-68e7e2ca9c0580ff`, 82 packs, 3.221 tegels, zonder `bezit-percelen.json`): de wereld van de gate is verloren gegaan met zijn worktree. Elk punt is een eigen stage met `GDE_PREBUILT_WORLD` (alleen de JS wisselt, 17 s). De JS van v0.64.0 komt uit een losse worktree op de tag. De absolute cijfers verschillen daardoor van het gate-rapport (HEAD foot 54 tegen 54,7: gelijk; ring 71 tot 88 tegen 106), de verhoudingen niet.

De meting is bimodaal: p95 valt op 33,4 (twee vsync) of 50 (drie) en springt over de norm van 37 bij een paar procent frames meer of minder. Daarom drie runs per punt en bij de bisect de route die per punt het duidelijkst was.

## Bevestiging (HEAD `3f0f4acc7` tegen v0.64.0, drie runs, p95 ms)

| route | HEAD (3 runs) | v0.64.0 (3 runs) |
|---|---|---|
| foot | 54,4; 54,6; 53,6 | 36,3; 35,5; 35,5 |
| ring | 88,4; 87,6; 70,8 | 35,5; 35,3; 18,7 |
| spoor | 53,6; 53,4; 53,0 | 51,5; 36,5; 36,6 |

Spoor is op de tag zelf bimodaal (33 of 50): daar is de regressie het kleinst.

## Bisect (first-parent, 402 commits tussen v0.64.0 en HEAD)

Index = plaats in `git log --first-parent v0.64.0..HEAD` (1 = nieuwste).

| punt | commit | foot p95 | ring p95 | opmerking |
|---|---|---|---|---|
| v0.64.0 | `9d4f791a7` | 35,5 | 35,5 | norm |
| 325 | `a1d58cdd1` | 34,8; 35,3 | 36,0; 35,3 | goed |
| 290 | `bc1a3a72c` | 35,5; 34,8; 35,4 | | goed |
| 270 | `9621714f7` | 34,3; 34,5; 18,4 | | goed |
| 266 | `bc4473474` | 18,4; 34,3; 36,3 | | goed |
| **265** | **`c5b375720`** | **105,9; 107,5; 128,8** | | **slecht** |
| 260 | `c453593b1` | 123,1; 119,6; 122,3 | | slecht |
| 250 | `3d77171bf` | 121,6; 105,7 | 18,3; 34,5 | foot slecht, ring goed (afvoer klaar vóór ring) |
| 175 | `70afc3095` | 71,2; 53,6 | 36,4; 71,2 | gemengd |
| 100 | `f51c3fc2b` | 109,4; 53,5 | 53,5; 87,0 | slecht |
| HEAD | `3f0f4acc7` | 54 | 71 tot 88 | slecht |

Het patroon (foot meteen slecht, ring pas later) volgt de afvoer: op `c5b375720` loopt de rij binnen een route leeg (zonder planner, round-robin), met de planner-commits van de reeks #1016 (`9b17b97cf` tot `fe6d83022`) duurt de afvoer tot in ring en spoor. Spoor los gemeten (twee runs per punt) is op elk punt 50 of slechter en op de tag zelf 33 tot 50; daar zit geen eigen schuldige commit achter.

## Oorzaak in cijfers

- Tijdlijn in een gedebugde run (log per seconde): `placement` laadt 187 tegels op t = 16 s (8,9 s laden), `kits` 76 op 17,8 s, `koe` 42 op 19 s. De wachtrij `bgQueue` staat op 261 items vanaf 20 s en wordt vastgehouden (`intro-montage cine-hide-hud`, daarna `cineQuiet` 15 s) tot t = 50 s. Foot loopt van 36 tot 56 s en ziet het begin van de afvoer; ring (56 tot 76 s) en spoor de rest.
- CPU-profiel foot (twee runs van 15 s): "other game" 10,8 s tegen 4,6 s op v0.64.0; bovenaan `markDryRoad` (1.046 ms), `junctionModel` (517), `tileJunctionNodes` (466), `furnitureForTile` (408), `assignSubLayers` van het gras (454): alles werk dat bij een tegel-add hoort, voor tegels ver van de speler.
- `tiles.cancels`, `resident` en het adaptieve niveau (`simLevel` 2 tot 3, dus 33 tegen 77 voertuigen) zijn gevolg, geen oorzaak: de trage frames laten `simload.js` de stad uitdunnen.
- Zonder afvoer (`backgroundHeld` altijd waar, proef) zijn ring 16,8 en 33,3 en foot 33,4: de afvoer is dus de hefboom voor foot en ring.
- Bij de losse ring (zonder voorgaande routes, de afvoer nog vastgehouden) is `f3` gelijk aan v0.64.0 (33,4; 33,5 tegen 33,3; 33,4).

## Wat er gewijzigd is

| commit | wijziging | effect |
|---|---|---|
| `1ca119f31` | De pomp kiest de klasse (`urgent` of `tile`) naar de stand van het venster (`wm.mode`), niet naar de grootte van zijn slice. Een achtergrondvenster met slice 6 nam het urgente budget. De pomp geeft het venster hoogstens `BG_PUMP_MS` en `follow()` hoogstens `BG_FOLLOW_MS` per frame. `junctionVer` en `signalVer` van een achtergrondtegel worden gebundeld (`_bumpJunctions`, `flushJunctions` hoogstens eens per `BG_JUNCTION_FLUSH_MS` 1,5 s). Een achtergrondtegel waar de speler binnen `BG_PROMOTE_M` (700 m) heen komt, gaat naar de gewone wachtrij (`promoteBgTiles`): anders kroop hij als druppel binnen terwijl de speler er al staat. | foot 54 naar 33,4 (3 van 3 runs); ring en spoor in de reeks 50 |
| `df6ea5c4b` | Een achtergrondtegel verder dan `BG_GEO_M` (3000 m) van de focus verhoogt `geoVer` en `greenVer` niet, bij add en bij drop (`_farBgTile`): het straatmeubilair (`tileItems`) herbouwde anders elke twee seconden alle tegels rond de speler. `BG_PUMP_MS` 0,6 en `BG_FOLLOW_MS` 0,3 (was 1,2 en 0,6), `BG_DRAIN_MAX_MS` 120 s. `markDryRoad` en `misplacedBuilding` knippen op de klok per item (`slowDue`), niet per achtste. | `nearestOnRoadList` 950 naar 495 ms per 17 s ring; ring p99 233 naar 100 tot 150 ms |

Pure tests: `scripts/tilebg_test.mjs` (19 controles: bgQueue en tileQueue, bundelen, promotie, `_farBgTile`, budget van `follow`) en een uitbreiding van `scripts/streamwindows_test.mjs` (de klasse volgt de stand, 34 controles).

## Meetpunten in de nieuwe code (p95 ms, `--hitch`, drie runs, reeks foot, ring, spoor)

| stand | foot | ring | spoor | opmerking |
|---|---|---|---|---|
| `f3` = `1ca119f31` | 33,4; 33,4; 33,5 | 50; 50; 50 | 50; 50; 50 | |
| `f5` (druppel 0,6 en 0,3 zonder geoVer) | 33,4; 33,5; 49,9 | 33,5; 50,1; 50 | 50; 66,7; 66,6 | geen winst: de druppel zelf is niet de rest |
| `f6` (+ geoVer) | 50,1; 33,4; 33,4 | 49,9; 50; 50,1 | 49,9; 50; 50 | `nearestOnRoadList` weg uit de top |
| `f7` = `df6ea5c4b` | 33,4; 33,4; 33,4 | 50; 49,9; 50,1 | 50; 50; 50 | |
| afvoer proef uit | 33,4; 33,4 | 16,8; 33,3 | 50,1; 50,2 | spoor zit er dus los van |
| v0.64.0 | 36,3; 35,5; 35,5 | 35,5; 35,3; 18,7 | 51,5; 36,5; 36,6 | |

Een proef die geen effect had en is teruggedraaid: elke listener en de groenopruiming in een eigen stuk (`yield`) in `addTileSteps` (`f4`): geen winst, wel meer stappen.

## Wat niet opgelost is

- **Ring en spoor in de reeks (50 tegen 35,5 en 36,6)**: de resterende afvoer (nog ca. 6 s tegelwerk, 305 tegels) loopt over de routes. Het werk zelf is hetzelfde als in v0.64.0, maar toen klaar op 21 s. De stukken zijn niet meer te knippen zonder de plaatsing te veranderen: een tegel in `addTileSteps` heeft ongeknipte onderdelen (de laatste stap met de listeners `farlod`, `canopies` en `trimTileGreenery`) van 20 tot 73 ms (`byKind.add` max 73 ms, over20 9 van 556).
- **Keuzes voor de coördinator** (deze wijken af van wat ik zelf heb gedaan, omdat ze gedrag raken):
  1. De plaatsingen (`placement`, `kits`, `koe`) niet vasthouden tijdens `cineQuiet` maar meteen na de film laten beginnen: de afvoer is dan vóór de routes (ca. 35 s) klaar. De film zelf wordt er niet zwaarder van (hij houdt zijn eigen budget) maar de eerste speelseconden na de film wel.
  2. `prepareKoeSites` (42 tegels in een straal van 2,7 km rond Ten Boer) pas starten als de nabeschouwing-uitdaging bereikbaar is (`pg_koe.js` is een post-game challenge): 14% van de tegels vervalt.
  3. De plaatsingsgegevens (deur van een café, garage of winkel in de Ommelanden, een kit voor een kerk zonder omtrek) bij de wereldbouw bakken in plaats van bij elke start uit 305 tegels lezen.
- **De wereld van de gate** (met `bezit-percelen.json`) was weg; de meting loopt op de wereld van 20-11. Een gate-run op de merge-commit moet de cijfers bevestigen.
- Niet gemeten: zonder `--hitch` (zie hieronder), de volledige `release`-set, `heli`, `a7`, `platteland`, `varen`, `druk`, `nacht` en `regen` (die waren in het gate-rapport binnen de norm), beeld en geluid, het effect van de wijziging op de zichtbaarheid van tegels bij een snelle sprong (ongemeten: een achtergrondtegel kan er door `promoteBgTiles` pas na maximaal 20 frames bij komen).
- Geen Samen-spelen-aanpassing: de tegelstroom is per speler lokaal (host en gast streamen elk hun eigen tegels); er is geen nieuw bericht en geen nieuwe voortgang. Een gast die later aansluit werkt zijn plaatsing zelf af.

## Vervolg (opdracht coördinator: de resterende 6 s tegelwerk uit de speelfase)

| stap | wat | uitkomst |
|---|---|---|
| (b) | `prepareKoeSites` (42 tegels, straal 2,7 km) start niet meer 12 s na het begin maar pas als de speler binnen `KOE_PREP_M` (6 km) van Ten Boer komt (`koeNear`, elke 2 s gecontroleerd in `updateOmmelandFun`). De uitdaging zelf (`KOE.spots`/`start`) heeft de plekken pas dan; `__ommeland.prepare` (storytest) laat de koe nog altijd direct laden. | ring en spoor in de reeks onveranderd: 50 in 3 van 3 runs (ring 50,1; 50,1; 50,1, spoor 50; 50; 50, foot 33,4 in 3 van 3). 305 tegels worden 263; dat is te weinig om de 3 vsync-grens te halen. |
| (c) | bakken van placement/kits/koe bij de wereldbouw | **Niet gedaan.** `placeSites`, `countryDoor` en `placeCountryShops` zijn geen pure functies van een tegel: ze lezen gebouwen, wegen en water van meerdere tegels, verwijderen bomen uit het raster (`clearTreesFor`) en vullen module-toestand (`shops`, `spots`, `sites`). Bakken vraagt een nieuwe sectie in het `.gdt`-formaat, een herschreven loader met terugval en een gelijkheidstest op een sample van de hele wereldbouw (de wereld is hier niet bouwbaar zonder `data/cache`). Dat is geen kleine wijziging; als eigen issue oppakken. |
| (a) | vasthouding na de film korter (geen `cineQuiet` van 15 s) met een grotere druppel (3 en 1,5 ms) | **Slechter**: ring 50; 50,7; 66,6, spoor 49,9; 149,9; 66,5, foot 33,4; 33,5; 50. De afvoer valt dan helemaal in de routes. Niet overnemen. |

Conclusie: zolang het werk bij de start van het spel gedaan wordt, valt het in de eerste 100 s en dus in ring en spoor van de gate. Alleen het werk wegnemen (bakken, of pas bij nabijheid per faciliteit plaatsen) haalt de 37 ms. Spoor op de tag zelf is 33 of 50 (zie boven); ring en spoor zijn na de fix niet slechter dan dat in de reeks, behalve ring (35,5 tegen 50).

## Zonder `--hitch`

Twee runs per stand, reeks foot, ring, spoor, p95 ms (de eerste run van `f7` had een uitschieter van 950 ms in foot: de machine was dan niet helemaal stil; de eerste run van HEAD leverde alleen foot op):

| stand | foot | ring | spoor |
|---|---|---|---|
| HEAD `3f0f4acc7` | 50; 66,6 | 66,7 (1 run) | 50 (1 run) |
| `df6ea5c4b` | 66,7; 33,5 | 50; 50 | 49,9; 50,2 |
| v0.64.0 | 33,3; 33,4 | 16,8; 33,4 | 33,5; 50 |

Zonder `--hitch` is dus hetzelfde beeld: foot is terug op de norm, ring en spoor in de reeks nog net erboven.
