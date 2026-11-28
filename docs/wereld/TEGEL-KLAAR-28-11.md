# Wanneer is een tegel klaar voor de speler? (28-11-2026, #1354)

> Aanleiding (eigenaar, 28-11): "Je vindt al te snel dat een tegel klaar is voor de speler, dan krijg je pop-in." En voor cutscenes:
> "pop-in is killing voor de beleving". Code: `game/js/tileready.js` (de definitie, puur), `readysensors.js` (de tellers), `texturewarm.js`,
> `cutsceneready.js`. Tests: `tileready_test`, `cutsceneready_test`, `texturewarm_test`, `tegelklaar_echt_test`.

## 1. Hoe het was (onderzoek)

"Klaar" betekende op elke plek hetzelfde, en te weinig: het laadscherm (`loadscreen.js`), de opstart-warm (`main.js`), de benchmarkpoort
(`benchsettle.js`, `trailer.js`) en de wachtpoort van een cutscene-sprong (`cutscenewarm.js readiness`) keken naar vier getallen: de tegels rond
de plek zijn binnen, de rijen staan in de kaart (`tileQueue`), de gebouwen in de ring zijn gebouwd (`streamPending().buildings`) en de wegen
(`.roads`), plus de vooruit-warm (`prewarmPending`). Wat daarna nog kwam, verscheen binnen het zicht:

| Onderdeel | Hoe het nog later kwam |
|---|---|
| Texturen (canvastexturen van gevels, props) | three.js uploadt pas bij de eerste draw (`renderer.compile` doet alleen programma's); er was geen uploadbudget: een haperende frame precies als het gebouw in beeld komt |
| Shaders | gebouwen wachtten wel op hun link (`progReady`), maar de laadpoorten niet: `programsPending`, `compileQueue`, `linkPending` telden nergens mee |
| Het verre LOD | `farLod.stats.queued` (de verre kopie in aanbouw) telde nergens mee |
| Platteland (bomen, velden, dieren) | `countryside` genereert per tegel in een eigen wachtrij; geen enkele poort wachtte erop |
| Geparkeerde auto's | `parked3d` bakt chunks verspreid over frames; niemand wachtte |
| Voetgangers, chauffeurs | zonder geladen rigs (`modularReady()`) bouwde `buildPedActor` en `ensureDriverFigure` het procedurele terugvalmodel, dat de hele levensduur van de figuur bleef: een gemengde wereld, geen wissel |
| Verkeer | gebouwd binnen een budget van 3 ms; het laadscherm wachtte er niet op |

De tegeldata zelf was niet het probleem: `TileStore.prefetch` vraagt al `1500 m + snelheid x 10 s` vooruit, gewogen naar de rijrichting.

## 2. De definitie: zes niveaus in een keten

Een tegel zit op niveau N als niveau 0 t/m N allemaal klaar zijn en voor geen daarvan nog een taak openstaat. Opent er later weer een taak op een
laag niveau, dan valt de tegel terug (`createTileLedger`: `open`, `close`, `complete`, `regress`).

| # | Niveau | Betekent | Sensor (`readysensors.js`) |
|---|---|---|---|
| 0 | `data` | de rijen van de tegel zijn gedecodeerd en binnen | `store.missing(keysAround(focus, 400 m))` |
| 1 | `colliders` | de rijen staan in de kaart: rasters, wegen, gebouwen, hoogte (botsing en hoogtevragen kloppen) | `queueNear(tileQueue.items)` (`add:`-stukken) |
| 2 | `geometry` | gebouwen met detail, wegen, water, het platteland en de vooruit-warm zijn gebouwd en staan in de scene | `streamStat.b + .r`, `prewarmPending`, `countrysideQueued` |
| 3 | `gpu` | shaders gelinkt, texturen op de GPU: de eerste draw kost niets | `programsPending`, `compileQueue`, `linkPending`, `texWarm.pending` |
| 4 | `lod` | de verre laag dekt de rand van de ring (de verre kopie, de kroonlaag) | `farLod.stats.queued` |
| 5 | `population` | auto's, geparkeerde auto's en mensen staan op hun eindmodel; de rigs zijn geladen | `rigsWaiting`, ontbrekende mensen en voertuigen binnen 70/120 m, `parkedPending` |

**Wat telt waar** (`requiredLevels(afstand)`): binnen de nabije ring (`READY.nearM` 160 m, groeit met snelheid en vervoermiddel, zie 4) alle zes;
binnen de zichtafstand (700 m) t/m `lod`; daarbuiten alleen `data`. Buiten de nabije ring mag de bevolking dus geleidelijk komen (natuurlijk
gedrag), maar nooit met een zichtbare modelwissel: een mens of chauffeur wordt pas gebouwd als de rigs er zijn (`modularWaiting()` in
`scene3d.js`; na het laden, ook een mislukt, of 30 s geldt de terugval).

**Gebouwen** zijn alleen "klaar" als de detailmesh er staat, zijn shaders gelinkt zijn **en** zijn texturen geüpload (`progReady`, nu met
`meshTexturesReady`), en de verre kopie (`farLod.covers`) bestaat: het naastliggende niveau, zodat de dither-overgang (`buildingfade.js`) nooit een
gat laat. De audit hiervoor zit in de probe (zie 5).

**Poorten** (`createReadyGate`): minimaal `minMs`, `calmTicks` metingen achter elkaar zonder open niveau, en een maximum (`maxMs` 20 s): daarna
gaat de poort toch open met een Nederlandse reden (`waitText`: "We wachten nog even op de gebouwen, wegen en bomen."). Nooit eeuwig hangen.

## 3. Waar de definitie afgedwongen wordt

- `loadscreen.js`, `main.js` (opstart-warm): tellen `gpu + lod + population` mee (`loadPending(..., extra)`), met de bestaande maximumtijd.
- `cutscenewarm.js readiness` (wachtpoort van een sprong, de benchmark `trailer.js`): wacht ook op `gpu`, `lod` en `population`.
- **Cutscenes** (`cutsceneready.js`, `cinematics.js begin()`): `ensureCutsceneReady(poses, { env, shot })` geeft een belofte. De camerastanden
  en acteursplekken komen uit de bestaande scènedata (`posesFromScene`: `scene.sample(t).camera` en `.actors`, elke seconde en rond elke cut).
  Het pad wordt gebieden (`shotRegions`: begin, midden, eind, de baan ertussen om de 40 m, acteurs op 60 m; een luchtshot kijkt verder), elk
  gebied wordt vooruit-gewarmd (`prewarmStreamAt` + `warmPoint`) en de scèneklok staat stil tot alle zes niveaus rond alle gebieden leeg zijn.
  Duurt het langer dan 250 ms, dan duikt het beeld naar zwart (liever een korte zwarte duik dan pop-in); maximum 8 s bij het begin, 4 s bij een
  shot-wissel, daarna gaat de film door. Een gast (`cutId`) warmt wel maar wacht niet (zijn klok volgt de gastheer).
- Texturen: `texturewarm.js` zet de texturen van elk nieuw gebouw en elke batch in een wachtrij en uploadt ze met `renderer.initTexture` binnen
  een budget van de gebouwklasse van de planner (minstens één per frame, hoogstens zes). `?perfoff=texwarm` is het oude gedrag.

## 4. Vooruit bouwen per vervoermiddel

`tileready.js leadFor(mode, snelheid)`: lopen 4 s (max 40 m), fiets 4 s (80 m), auto 4 s (200 m), boot 4 s (160 m), trein 6 s (400 m),
heli 5 s (300 m), vliegtuig 6 s (600 m). De gebouwen worden verder voorgebouwd dan de vaste marge van 30 m, tot `BUILDING_AHEAD_MAX` (120 m),
alleen in een kegel van 60 graden rond de rijrichting. **Standaard uit** (`?vooruitbouw` zet het aan): in twee gepaarde a7-runs (zelfde build, voor en na) kwam er meer pop-in binnen 60 m bij (12,4 naar 18,2 en 11,4 naar 16,9 per seconde), net als bij de eerdere poging van #1016. De tegeldata (1500 m + 10 s) hoefde niet groter.

## 5. Meten

`node scripts/qa/popin.mjs --tag=voor|na [--only=foot,cdrive,a7,dorp,heli] [--cuts=M01.intro,...] [--flags=perfoff=texwarm+mensenwacht+vooruitbouw]`
(slot en stille-machinepoort: `--slot --quiet`). Per route: zichtbare pop-in per seconde en per km, binnen 60 m, na "klaar" (oude en nieuwe
definitie), zichtbare wissels (`geoswap`), texture-uploads en shaderlinks per frame (GL-aanroepen omwikkeld), de LOD-dekking per afstandsband
(`lod.bands[].okPct`, gaten, wissels naar niets), een tijdlijn per tegel en voor cutscenes het aantal per shot. Resultaten: zie het eindrapport
en `docs/beeld-28-11/tegelklaar/`.

## 6. Samen spelen

Elke speler laadt zijn eigen tegels en bouwt zijn eigen wereld; de poort, de sensoren en het uploaden zijn lokaal. Niets gaat over het net.
Een gast die een gastheerscène volgt (`cutId`) warmt zijn plek maar houdt zijn klok nooit vast (de klok komt van de gastheer, `setCinematicTime`);
een gast die zelf teleporteert krijgt zijn eigen laadscherm met dezelfde definitie. Wie wegvalt of later aansluit heeft geen invloed op de poort:
de tellers kijken alleen naar wat rond het eigen streamfocus ontbreekt. Test: `cutsceneready_test` (gast), `tegelklaar_echt_test` (tegelopbouw).

## 7. Niet gedekt (eerlijk)

- Bomen en props (`treesync`, `cityprops`) hebben geen eigen taakteller: ze zitten achter de gebouw- en plattelandstellers. Een eigen sensor is een vervolg.
- Texturen van voertuigen en mensen worden niet vooraf geüpload (hun materialen zijn gedeeld en worden in de boot-warm getekend).
- Een lokale LOD-vergrendeling per cutsceneshot is er niet: de ring volgt het kijkpunt van het shot, dat binnen 45 m van het anker blijft; de probe telt de wissels.
