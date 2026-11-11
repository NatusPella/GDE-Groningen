# Prestatiemeting 9 november 2026 (#804/#806, verificatie na de merge)

> Vervolg op `docs/PERF-METING-2026-11-05.md`. Dit is de verificatieronde van de
> gemergede #804/#806: de norm-tool en de latentietest zijn nagekeken en er is
> opnieuw met de hitchprobe gemeten. De cijfers hieronder zijn **niet** op een
> volledig stille machine gehaald: deze werkboom wordt door meerdere agents
> gebruikt en de runs deden 110-130 s over een route van 15 s. De rangorde van
> de hitchbronnen is consistent; de absolute waarden zijn indicatief.

## Meetopzet

- Stage: `cd desktop && npm run stage` (v0.59.0, wereld uit `game/world`, 3221 tegels).
- `PERF_DUR=15000`, `--preset=quality:hoog --hitch --no-sandbox`, 1904x993 CSS-px bij dpr 1.
- Runs: `rustig3-1109-a7` (a7), `rustig4-1109-spoor-heli` (spoor, heli);
  bewaard in `.test-temp/perf804/out3` en `out4` (niet in git).
- Norm: `node scripts/perf/norm_check.mjs <json>` met de regels uit
  `scripts/perf/normrules.mjs` (p95 <= 25 ms, max <= 100 ms, 0 frames > 50/100 ms).

## Eerst gevonden en gerepareerd: per-frame crash in de opruimpaden

De eerste run was onbruikbaar: elke frame gooide
`TypeError: Cannot read properties of undefined (reading 'userData')` in
`releasePersonGeometry`/`disposeObject` (scene3d.js). Een geometrie zonder
`userData` en een persoonsmesh zonder `userData.body` werden niet afgevangen.
Gerepareerd met twee null-guards (`scene3d.js`, `models3d_people.js`) en
vastgelegd in `scripts/opruimpaden_test.mjs` (46 checks). Vóór de fix: a7
gem. 592 ms, 11 draw calls/frame. Daarna: 334 calls, 652k tris — de crash
verklaarde de eerste "meting" volledig.

## Uitkomst (na de fix)

| route | gem. ms | p95 | p99 | max | frames | >50 ms | >100 ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| a7 | 41,8 | 83,3 | 616,7 | 1300 | 1437 | 145 | 51 |
| spoor | 49,2 | 83,4 | 500,0 | 1900 | 915 | 165 | 32 |
| heli | 327,3 | 1316,6 | 1783,3 | 1783,3 | 47 | 43 | 25 |

`norm_check`: **0/3 routes binnen de norm**. De heli-route haalde in 15 s maar
47 frames: dat is geen speelbaar beeld. De oude meting (5-11) had 20,8 / 24,3 /
19,0 ms gemiddeld. Dat verschil is groter dan de onrust van de machine
verklaart; eerst opnieuw meten op een stille machine, en als het dan blijft:
bisecten tussen de meting van 5-11 en nu (kandidaten: de tegel/netwerk-caches
uit `de499c52`/`c10163ce`).

## Top-5 hitchbronnen per route (hitchprobe)

Dezelfde vijf komen op alle routes terug; de volgorde is per route:

**a7** (secties / pieken in ms, aantal frames tussen haakjes)
1. `3d:roads` — piek 922 ms (45x)
2. `cityprops` — piek 886 ms (18x)
3. `populate` — piek 485 ms (32x)
4. `3d:render:hoofdpas+post` — piek 351 ms (35x)
5. `traffic` — piek 142 ms (38x)

**spoor**
1. `3d:roads` — piek 1366 ms (34x); trage frames met 830 en 1036 ms in roads
2. `populate` — piek 391 ms (22x)
3. `cityprops` — piek 303 ms (6x)
4. `traffic` — piek 165 ms (18x)
5. `hud` — piek 135 ms (398x)

**heli**
1. `3d:roads` — piek 1749 ms (17x)
2. `populate` — piek 667 ms (8x)
3. `cityprops` — piek 558 ms (1x)
4. `peds` — piek 197 ms (3x)
5. `traffic` — piek 135 ms (13x)

De trage frames laten hetzelfde zien: `3d:roads` van 550-1036 ms op één frame,
`populate` 236 ms, `cityprops` 303 ms. `3d:roads` is de grote gemene deler: het
(opnieuw) opbouwen van wegen/cityprops bij het streamen van een nieuw gebied,
precies op de snelle routes (a7, heli) waar de ring het snelst verschuift.

## Wat dit betekent voor #804

- De **norm en de top-5-analyse werken** en zijn herhaalbaar
  (`scripts/perf/norm_check.mjs`, `scripts/perf_norm_test.mjs`).
- De acceptatie (geen frame > 100 ms, p95 <= 25 ms) is **niet gehaald** op deze
  meting. Grootste haalbare demper volgens de meting: `3d:roads` (streaming)
  minder synchroon laten bouwen — prewarmen/splitsen over frames, zoals
  `prewarmStreamAt`/`streambudget.js` al kunnen — gevolgd door `cityprops` en
  `populate`.
- Geen optimalisatie zonder nieuwe meting: eerst een stille run (geen andere
  Electron/agents, CPU < 2%), daarna dezelfde routes en `norm_check`.

## #806: latentie (geverifieerd)

De gemergede tests zijn groen: `scripts/netlatency_test.mjs` (LAN 30 ms /
jitter 10 ms: gast→host 50 ms, host→gast 150 ms; mobiel 80/30: 100 en 217 ms;
mobiel met PvP-interpolatie van 60 ms: 100 en 150 ms) en
`scripts/pvpvertraging_test.mjs` (60 ms zodra `pvpAanDeGang`, anders 120 ms).
De PvP-drempel van **200 ms** wordt op LAN en op mobiel-met-PvP gehaald, niet
op mobiel zonder PvP. Dat staat al in `docs/COOP-TESTBANK.md` (sectie
Latentiemeting) en is daar niet gedupliceerd. Wat ontbreekt blijft echte
hardware/echte netwerken (#806 punten 68/69) en is hier niet te meten.

## Vervolg: de road-hitch gedempt (#804, na de top-5)

De top-5 wees `3d:roads` als grootste gemene deler aan. In `syncRoads` stopte de
lus alleen voor de eerste weg bij de deadline: alle volgende "goedkope" wegen
met kant-en-klare surfaces werden in één frame alsnog gebouwd. Eén frame bouwde
zo de hele ring (pieken 0,9-1,7 s). Twee dingen zijn aangepast, met meting:

- `roadBuildAllowed` (`game/js/roadbudget.js`): de deadline geldt nu voor élke
  weg, plus een harde cap van 4 wegen per frame (8 tijdens de streamboost).
  De eerste weg mag altijd, zodat de streaming vooruit blijft.
- `roadSyncStats` in scene3d (frames, gebouwd, max per frame, laatste ms,
  deadline-stops) maakt de opbouw meetbaar.

Zelfde routes, zelfde harness, na de fix:

| route | gem. ms | p95 | p99 | max | >50 ms | >100 ms |
|---|---:|---:|---:|---:|---:|---:|
| a7 (was 41,8 / 83,3 / 616,7 / 1300) | **25,8** | 50,0 | 183,3 | **533,4** | 110 | 35 |
| spoor (was 49,2 / 83,4 / 500 / 1900) | **27,4** | 50,0 | 83,5 | **400,1** | 64 | 13 |
| heli (was 327,3 / 1316,6 / 1783,3) | **235,4** | 866,6 | 1283,4 | **1283,4** | 43 | 27 |

De road-piek zelf is sterk gedaald: a7 922 -> 265 ms, spoor 1366 -> 276 ms,
heli 1749 -> 835 ms. Gemiddelden bijna gehalveerd op a7 en spoor; de norm
(p95 <= 25, max <= 100) is nog niet gehaald. De nieuwe top-5 na de fix:

- **a7**: `populate` (piek 597 ms), `3d:render:hoofdpas+post` (297), `3d:roads`
  (265), `cityprops` (215), `traffic` (157).
- **spoor**: `populate` (309), `3d:roads` (276), `peds` (77), `traffic` (68),
  `3d:water` (51).
- **heli**: `3d:roads` (835, nog de eerste koude/heavy weg op snelheid),
  `cityprops` (412), `populate` (346), `hud` (179), `traffic` (126).

Volgende demper volgens de meting is dus niet de weg meer maar **`populate`**
(300-600 ms pieken); daarna `cityprops`/`3d:render:hoofdpas+post` en op de heli
de eerste heavy weg (viaduct/civil works) — die vraagt om vooraf bouwen
(`prewarmStreamAt` geeft nu maar ~2-4 s) of om een harde heavy-cap met uitstel,
geen extra budget verhogen. Geen van die twee is zonder nieuwe meting doorgevoerd.

## MacBook Air M1: hoog vs vlot/middel (#804)

De eigenaar meldt op zijn M1: **Hoog onspeelbaar** (29 fps gemiddeld, stad 13),
**Laag te doen maar niet geweldig**, eerder >60 fps. Op de Windows-meetmachine
is het verschil tussen de presets nagemeten met dezelfde harness; de M1 zelf is
hier niet te meten. De runs zijn op een gedeelde machine gedaan (110-240 s per
route van 12 s) en met `--force-device-scale-factor=2` om een Retina-scherm na
te bootsen. Let op: de app zet zijn eigen venstermaat, dus `--window-size` werd
niet overgenomen; de CSS-views werden half zo groot. De **relatieve** verschillen
zijn bruikbaar, de absolute cijfers niet.

| configuratie (a7, 12 s) | gem. ms | p95 | max | gpu ms | calls |
|---|---:|---:|---:|---:|---:|
| hoog (heelver), dpr 2 | 109,4 | 583,3 | 2066,6 | 43,4 | 227 |
| hoog (heelver), dpr 2, resolutie 75% | 33,8 | 66,7 | 983,4 | 21,4 | 266 |
| vlot (kort), dpr 2 | 24,0 | 50,0 | 599,8 | 9,1 | 238 |
| middel (normaal), dpr 2 | 28,2 | 66,6 | 966,9 | 12,2 | 216 |

Wat de cijfers laten zien:

1. **Resolutie is de grootste knop.** Zelfde preset, alleen 75% resolutie:
   109 -> 34 ms gemiddeld en 43 -> 21 ms GPU. Precies wat een Retina-scherm
   (dpr 2) met pixelRatio 2 doet: vier keer zoveel pixels als dpr 1. Dat
   verklaart waarom Laag (resolutie 75%, geen schaduwen) op de M1 nog te doen
   is en Hoog niet.
2. **Zichtafstand heelver is duur.** Vlot is kwaliteit hoog met een korte
   zichtafstand: 24 ms en 9 ms GPU tegenover 109/43 bij heelver. Minder draw
   calls en minder verkeer/vegetatie/LOD; dat is de "60 fps"-stand die al in de
   presets zat (docs/PERF-METING-2026-10-19.md, Vervolg 8).
3. Middel valt tussen beide in (28 ms) en is op een Retina-laptop de
   tussenstand: schaduwen aan, resolutie 1,5x, geen bloom (postfx alleen op
   hoog), normale zichtafstand.

Concreet doorgevoerd (met bewijs, geen gok):

- **Standaardpreset is Vlot** in plaats van Hoog (al in main: `06623285`/
  `cb9f4494`, hier geverifieerd; niet gedupliceerd).
- **Goedkopere hoog-stand**: `QUALITY_PRESETS.hoog.pixelRatio` 2 -> **1,5**. Op
  dpr 1 verandert er niets (`min(preset, dpr)`), op een Retina-scherm scheelt
  het 44% pixels. De resolutie-meting hierboven is de onderbouwing (75% gaf
  ~3x winst; 1,5x zit daar tussen).
- **Auto-advies op Apple-basis**: `classifyGpu` zet een M1/M2/M3 (niet Pro/Max/
  Ultra) op tier **middel** i.p.v. hoog, zodat het eerste-start-advies niet
  "Hoog" laat staan; de speler kan in Instellingen > Beeld altijd hoger kiezen.
  `scripts/gfx_profile_test.mjs` dekt Apple M1 (middel), M1 Pro en M2 Max
  (hoog) en de 1,5x-hoogstand.

Advies voor de M1-eigenaar: begin op **Vlot** (nieuwe default; hoog uiterlijk,
korte zichtafstand). Is dat nog niet vloeiend: **Gemiddeld** (resolutie 1,5x,
schaduwen aan, geen bloom) of Vlot met **resolutie 75%**; **Laag** (geen
schaduwen, 75%) is de zuinigste stand. Meet daarna op de Mac zelf met de
hitchprobe (`--hitch --preset=preset:vlot`) om te bevestigen.

## Vervolg: `populate` was een meetartefact (#804, meting 9-11 namiddag)

De top-5 na de road-cap noemde `populate` (300-600 ms). Bij het openleggen van
die sectie met submarks (`pop-traffic`, `pop-bikes`, `pop-bus`, `pop-scooters`,
`pop-motors`, `pop-boats`, `pop-peds`) bleek dat een **meetfout**: de mark
`probe.mark('populate')` stond aan het eind van `updateGameplay`, maar de vorige
mark (`hud`) valt in `frameBody` **na** die functie. De sectie met de naam
`populate` mat dus het einde van de vorige frame (render + GPU-wacht), niet de
populatielus. Bewijs: in dezelfde run waren de echte populatie-submarks pieken
van 34 ms (pop-bus), 21 ms (pop-bikes) en 44 ms (pop-traffic); de 300-600 ms zat
in de lege "populate"-sectie.

Gerepareerd (met test): een `probe.mark('frame')` direct na `probe.begin` geeft
het frame-gat een eigen naam, en `probe.mark('populate-pre')` opent de
populatielus. `scripts/hitchmarks_test.mjs` bewaakt de volgorde. Correcte
meting daarna (a7/spoor, 12 s, hoog):

| route | gem. ms | p95 | p99 | max | >50 | >100 |
|---|---:|---:|---:|---:|---:|---:|
| a7 | 24,3 | 50 | 250 | 833 | 92 | 38 |
| spoor | 37,5 | 66,7 | 117 | 933 | 167 | 17 |

Echte top-5 (pieken, a7 / spoor): `3d:roads` 398 / 336 ms, `traffic` 274 / 105,
`cityprops` 235 / —, `3d:render:hoofdpas+post` 67 / 33 (a7) en 5,5 ms gemiddeld
op spoor, `peds` 45 / 97; de populatielus zelf blijft onder 35 ms. De gemiddelde
`frame`-sectie (19,8 / 33,5 ms) is het gat tussen frames (GPU/vsync-wacht), geen
CPU-werk. `norm_check`: nog steeds 0/2 routes binnen de norm (p95 <= 25,
max <= 100), dus de norm blijft het doel.

Volgende demper volgens deze meting: de **eerste zware/koude wegen** (roads-piek
~400 ms, zie ook de heli), daarna de **traffic-burst** (274 ms: veel nieuwe
voertuigen die in één frame hun pad opbouwen) en **cityprops** (235 ms: één
dichte cel bouwt in één keer). Die drie zijn niet zonder nieuwe meting
aangepast; de road-cap en de populatie-verdenking zijn nu wel correct gemeten.
De submarks blijven in de build staan zodat de volgende run dezelfde indeling
houdt.

## Vervolg: traffic-burst-budget (#804, demper 1)

Na de correcte meting was de tweede echte bron `traffic` (piek 274 ms op a7):
na een spawngolf bouwden tientallen nieuwe voertuigen in hetzelfde frame hun
pad op. Nieuw: `game/js/pathbudget.js` (`consumePathBudget`, 4 eerste
padopbouwen per frame), meegegeven vanuit `main.js` aan de verkeerslus;
`traffic.js` laat een vers voertuig zonder budget één frame wachten
(`v.aiDeferred`) en pakt het de volgende frame op. `scripts/pathbudget_test.mjs`
bewaakt de cap en de bedrading (6/6).

Meting opnieuw geprobeerd (a7, 8-12 s, `--hitch`, stage v0.60.2), maar de
machine was bezet: **8-9 Electron-processen van andere agents** stonden de hele
periode aan; runs duurden 125-210 s voor 8-12 s route en de laatste run kwam
niet eens door (PARTIAL). De cijfers zijn daarom niet vergelijkbaar met de
stille reeks:

| run (a7) | gem. ms | p95 | max | traffic-piek | roads-piek | cityprops-piek |
|---|---:|---:|---:|---:|---:|---:|
| vorige ronde (rustiger) | 24,3 | 50 | 833 | 274 | 398 | 235 |
| na budget (bezet) | 34,4 | 83,2 | 1267 | **163,5** | 321 | 288 |

De traffic-piek daalt in deze bezette run naar 163 ms (-40%) terwijl de machine
drukker was; dat is een aanwijzing, geen bewijs. Een stille herhaling is nodig
voor de acceptatie. De overige twee dempers uit de meting (cityprops-dichte cel
235 ms en de eerste koude/heavy weg ~400 ms) zijn **niet** aangepast: dat zou
zonder stille meting speculatief zijn. Plan: eerst een rustige run (geen andere
Electron/agents, CPU < 2%) met dezelfde routes, daarna cityprops-cel splitsen en
de heavy weg uitstellen/prewarmen, elk met een eigen voor/na-meting.

## Vervolg: heavy wegen uitgesteld (#804, demper 2, 10-11 ochtend)

Op een stille machine eerst opnieuw gemeten (a7/spoor, 12 s, hoog, `--hitch`,
inclusief de pacing-velden uit `hook.js`). Uitgangspunt: a7 gem. 28,9 / p95 66,7
/ p99 233 / max 867, spoor 37,4 / 66,7 / 167 / 483; cityprops-piek was inmiddels
207 ms (a7) en 33 ms (spoor) — de oude 235 ms is dus deels achterhaald door
andere fixes, maar de dichte cel is op a7 nog zichtbaar.

Daarna in `syncRoads` de **heavy weg** (surfaces niet kant-en-klaar of de
civiele werken worden hier gebouwd) uitgesteld: hij bouwt alleen op een verder
leeg frame (geen andere weg dit frame en `streamStat.r <= 2`), anders schuift
hij door (`roadSyncStats.heavyDeferred`). Gemeten met dezelfde harness:

| route | gem. ms (was) | p95 (was) | p99 (was) | max (was) | >50 (was) | >100 (was) |
|---|---:|---:|---:|---:|---:|---:|
| a7 | **22,6** (28,9) | **33,5** (66,7) | **116,7** (233) | 850 (867) | **65** (165) | 29 (49) |
| spoor | **27,0** (37,4) | **50,0** (66,7) | **100** (167) | 783 (483) | **73** (148) | 15 (28) |

Pacing (a7): 2224 van 2655 frames in de 16,7 ms-emmer (was 1476/2071), 127
frames boven twee beelden (was 275); spoor 1060/1667 in de eerste emmer (was
393/1204), 136 boven twee beelden (was 396). Gemiddelde en p95 zijn dus flink
gezakt; de **max** blijft hoog (850/783 ms) door wat er nog overblijft.

Wat er na deze demper nog piekt (a7/spoor): `populate-pre` 300/416 ms (het
frame-gat vóór de populatielus, dus GPU-wacht/gat, geen populatie), `3d:roads`
228/253 (de eerste heavy weg die alsnog op een leeg frame bouwt), `cityprops`
207/33, `3d:render:hoofdpas+post` (spoor 280), `systems` 168 (a7), `traffic`
137/85, `3d:grass` 118. Om de max onder 100 ms te krijgen moet de heavy weg
zelf gesplitst of naar de laadtijd/prewarm verplaatst worden (één weg kost nog
honderden ms); dat is een grotere ingreep en niet zonder eigen meting gedaan.
Cityprops (dichte cel, 207 ms) is de volgende kandidaat voor de geplande
celextra-splitsing.

## Vervolg: heavy weg en cityprops doorgemeten (10-11 middag)

Voor de laatste twee dempers eerst de kosten opengelegd met submarks in
`syncRoads` (`roads-entry`, `roads-net`, `roads-query`, `road-build`,
`road-lift`, `road-add`) en in `cityprops` (`cp-gen`, `cp-merge-start`,
`cp-reg-items`, `cp-reg-walls`, `cp-merge`). Twee runs op a7/spoor (12 s, hoog,
`--hitch`), maar de machine was weer bezet (4 andere Electron-processen,
runs 192-201 s voor 12 s route), dus p95/max zijn onbetrouwbaar. De
**submark-pieken zijn wel consistent**:

- **Heavy weg:** `buildRoadGroup` en `liftRoadGroup` zijn *niet* de kosten —
  hun pieken blijven onder 8 ms. De grootste wegsub-piek is `roads-net`
  (`setRoadNetwork`) met 35 ms op a7 en 12 ms op spoor. De 850 ms-max uit de
  vorige ronde is dus geen "dure weggeometrie" die je in stukken kunt knippen;
  op deze (bezette) run kwam de max uit dezelfde frame-gaten/contention
  (`hud`, `render`, `roads-net`, `cityprops` in de trage frames). Conclusie:
  **geen split van de weggeometrie doorvoeren** — de meting onderbouwt dat
  niet. Een volgende stap zou `setRoadNetwork` zelf zijn (35 ms), niet de
  build/lift.
- **Cityprops:** `generateCell` piekt 42 ms (a7) en de merge/registratie
  blijft onder ~12 ms per stuk. Een traag frame toonde 107 ms in de
  cityprops-sectie die **niet** in `cp-gen`/`cp-merge`/`cp-reg*` valt — dat is
  het restdeel van `updateCityProps` (de slot-/publiekmakers en
  `updateBreakables`), niet de dichte cel. Ook hier is een cel-split dus niet
  de juiste demper zonder die fase eerst apart te meten; de cell-splitsing is
  **niet doorgevoerd**.

Wat er deze ronde dus is gedaan: de instrumentatie (submarks) staat klaar voor
de volgende meting; er is bewust **geen** speculatieve split gebouwd. Volgende
stap volgens bewijs: (1) `setRoadNetwork` (35 ms) en (2) de restfase van
`updateCityProps` (slot-publiek/breakables, 107 ms) instrumenteren en dan pas
splitsen/begrenzen. De machine moet daarvoor stil zijn; de vorige stille run
gaf a7 p95 33,5 / spoor 50 met de heavy-uitstel-fix.

## Schone meting + demper: straatmeubel-streamer (#804, 10-11 namiddag)

Op de stille machine één schone meting (a7/spoor, 15 s, hoog, `--hitch`):

| route | gem. ms | p95 | p99 | max | >50 | >100 |
|---|---:|---:|---:|---:|---:|---:|
| a7 | 24,8 | 50 | 116,9 | 566,7 | 99 | 30 |
| spoor | 28,2 | 50 | 83,4 | 566,6 | 69 | 20 |

Daarna de twee aangewezen posten onderzocht met submarks:

- **`setRoadNetwork` (~35 ms):** de knooppuntindex wordt al **gedeeltelijk**
  ververst (`netState`: chunk van `NET_CHUNK` wegen per frame, oude index
  blijft bruikbaar, 8 ms-throttle). De scherpe sub-pieken zijn
  `roadnet-chunk` 11,4 ms en `roadnet-grid` 4,4 ms — géén volledige herbouw per
  frame. **Geen wijziging** nodig; een verdere split levert volgens de meting
  niets op.
- **Restfase van `updateCityProps` (~107 ms):** met marks bleek dat niet de
  dichte cel of de registratie te zijn maar de **straatmeubel-streamer** in
  `updateBreakables` (`br-stream`): 261,4 ms piek (a7), 44-47 ms in de trage
  frames. Die streamt elke 0,25 s alle tegels rond de speler en bouwt nieuwe
  tegels (`furnitureForTile` met alle kaartvragen) in één beurt.
- **Kleine demper (met bewijs):** `streetfurniture3d.streamFurnitureProps`
  bouwt nu per streambeurt **hoogstens 2 nieuwe tegels**; bestaande tegels
  blijven gewoon stromen. Nieuwe test `scripts/streetfurniture_budget_test.mjs`.
  Gemeten na de fix (zelfde harness, stille machine):

| route | gem. ms | p95 | p99 | max | >50 | >100 | br-stream-piek |
|---|---:|---:|---:|---:|---:|---:|---:|
| a7 | **21,3** | **33,4** | **66,7** | 550 | **50** | 14 | **31,8** (was 261) |
| spoor | **25,7** | **49,9** | **83,3** | 417 | **50** | 13 | **24,4** (was 28) |

De straatmeubel-piek is dus weg (261 -> 32 ms) en p95 daalt op a7 van 50 naar
33,4. `norm_check` haalt nog niet de norm (p95 33,4/49,9, max 550/417): de
resterende max zit in de frame-gaten (`populate-pre`/`frame`) en de eerste
heavy weg die alsnog op een leeg frame bouwt. Volgende stappen volgens meting:
de heavy weg zelf splitsen of naar laadtijd/prewarm verplaatsen (groot werk) en
de frame-gat-oorzaak (GPU-wacht) apart onderzoeken; geen speculatieve wijziging
doorgevoerd.

## Frame-gaten: shader-linkblokkade (#804, 11-11)

Doel van deze ronde: de resterende max (550/417 ms) in de frame-gaten
(`populate-pre`/`frame`) en de eerste heavy weg aanwijzen. Eén schone meting
(a7/spoor, 15 s, hoog, `--hitch`, met de bestaande submarks; de machine was
stil): a7 gem. 21,7 / p95 33,4 / max 1600 (19 frames >100), spoor 33,4 / 66,5 /
483 (13 >100). De uitschieter is reproduceerbaar en nu precies te benoemen:

- **a7, frame op 60,13 s:** cpu 1584,9 ms, `3d:render:hoofdpas+post` 1540,7 ms,
  `gl:getProgramParameter` **1525,7 ms**; in dat frame zijn de programma's
  `Mesh/MeshStandardMaterial building (hidden)` en
  `Mesh/MeshStandardMaterial pool` nieuw. De route-programmalijst toont daarna
  nog de building/pool-varianten. Dat is dus een **shader-linkblokkade in de
  render** (three.js vraagt LINK_STATUS/COMPLETION_STATUS synchroon op en wacht
  de GPU-backlog uit), geen CPU-streaming en geen dichte cel.
- **spoor, max 483 ms:** daar staan geen nieuwe programma's; de trage frames
  hebben `geo` +38 / `tex` +1 (upload) en `3d:render:*`-werk. Kleinere orde dan
  a7.
- **Eerste heavy weg:** de road-submarks laten zien dat `buildRoadGroup` en
  `liftRoadGroup` < 8 ms blijven; de weg is dus niet de max-oorzaak. De eerdere
  aanname "eerste heavy weg ~400 ms" is met deze meting weerlegd; wat overblijft
  op de weg is `roads-net` (chunk 11 ms) en incidentele uploads.

Er zit al een link-guard in de build (`LINK_POLL_MS = 25`,
`BUILDING_LINK_WAIT_MS = 2000`, `hookLinkGuard`, `meshProgramsReady`), maar de
meting laat zien dat één poll op een nog-niet-gelinkt programma zelf 1,5 s kan
blokkeren wanneer de GPU-backlog groot is. Een veilige vervolgstap is daarom:
de poll alleen doen als de GPU niet bezig is (of na de render), en nagaan welk
niet-gebouw-materiaal (`pool`) de draw zonder wacht passeert; dat vraagt een
gerichte profielrun en is **niet** zonder meting doorgevoerd. De norm
(p95 <= 25, max <= 100) is met deze bron nog niet haalbaar; dat staat hier
eerlijk als restpunt.

Schone stand na de straatmeubel-fix (uit de vorige sectie): a7 p95 33,4 /
max 550; spoor p95 49,9 / max 417. Deze ronde leverde geen codewijziging op —
alleen de meting en deze analyse.

## Link-guard niet-blokkerend (#804, 11-11)

De 1,5 s-piek uit de vorige sectie kwam uit `programLinked`: de draw-guard
vroeg `p.isReady()` en dat doet een **synchrone LINK_STATUS-query** die wacht
tot de link klaar is. In `scene3d.js` vraagt de guard nu
`KHR_parallel_shader_compile`'s **COMPLETION_STATUS_KHR** (niet-blokkerend) en
markeert een programma pas als gelinkt als die true zegt; zonder de extensie
valt hij terug op `isReady()`. De poll blijft op 25 ms en in de draw wordt geen
LINK_STATUS meer gevraagd. Dit is de (2) uit het plan; (1) een warme compile van
de twee varianten bij de start is niet meer nodig zolang de guard niet blokkeert
en is niet apart gebouwd.

Meting na de wijziging (a7/spoor, 15 s, hoog, `--hitch`):

| run | route | gem. ms | p95 | max | `gl:getProgramParameter` (gem.) |
|---|---|---:|---:|---:|---:|
| 1 | a7 | 32,8 | 66,8 | 1383 | **0,33 ms** (was 1525 ms in één frame) |
| 1 | spoor | 34,7 | 50,2 | 433 | 0 |
| 2 | a7 | 53,4 | 116,8 | 3533 | — |
| 2 | spoor | 42,5 | 66,7 | 733 | — |

De **blokkerende LINK_STATUS-query is weg** (geen 1,5 s
`gl:getProgramParameter` meer in de trage frames; de teller zakt naar
honderden µs). Een schone voor/na-tabel voor p95/max kon niet worden gemaakt:
de tweede run was veel slechter dan de eerste terwijl er geen andere
Electron/node-processen stonden (systeemactiviteit), en de eerste run had ook
al een langere looptijd dan de stille metingen. De p95/max-verschillen zijn dus
niet toe te schrijven aan de wijziging. Wat wel vaststaat: de draw wacht niet
meer synchroon op een link; de resterende max moet op een echt stille machine
opnieuw worden gemeten voordat er conclusies aan vastzitten. De norm
(p95 <= 25, max <= 100) blijft daarmee open; de volgende meting moet uitwijzen
of de max dan uit frame-gaten/GPU-wacht of uit iets anders komt.

## CPU-profiel a7/spoor (#804, 11-11 avond)

Doel: de CPU-mediaan (20-24 ms op a7/spoor) uitsplitsen in render en
wereldupdate, top-5 benoemen en één kleine bewezen optimalisatie doen. De
machine was deze keer **niet stil**: 5 Electron-processen van andere agents,
runs van 172-205 s voor 12-15 s route. De nieuwe profielruns zijn daardoor niet
bruikbaar (a7 140/86 ms, daarna 40/43 ms, nog een 24/32 met max 3400); de
cijfers hieronder komen uit de **schone runs van de vorige secties** (zelfde
build op de link-guard na, a7/spoor 15 s, hoog, `--hitch`), waar de
sectie-totalen per frame zijn opgeslagen.

Top-5 CPU-posters (ms per frame, gemiddeld over de route; `frame` is de totale
CPU-tijd van het frame en telt de onderdelen hieronder):

| # | a7 (schoon) | ms/frame | spoor (schoon) | ms/frame |
|---|---|---|---:|---:|---:|
| 1 | `3d:render:hoofdpas+post` | 3,1-3,7 | `hud` | 4,3-5,1 |
| 2 | `hud` | 1,7 | `3d:render:hoofdpas+post` | 3,4-4,2 |
| 3 | `traffic` | 1,5-2,2 | `3d:buildings` | 2,3-2,4 |
| 4 | `3d:render:voorpas` | 1,9-2,0 | `3d:render:voorpas` | 2,1-2,2 |
| 5 | `3d:buildings` | 1,0-1,1 | `traffic` | 1,2-1,5 |
| | daarna | | `police+collide` 0,8-0,9, `3d:render:schaduwpas` 0,7-1,0, `3d:roads` 0,8-1,1 | |

Verdeling: **render** (hoofd-/voorpas/schaduw) ongeveer 6-7,5 ms per frame,
**wereldupdate** (traffic, buildings, roads, police+collide, peds) ongeveer
4-6 ms, **HUD** 1,7 (a7) tot 5,1 (spoor), en de rest van de totale CPU-tijd
(17-25 ms) zit in de vele kleine posten en GC. Draw calls: 184-262 per frame;
de diag-tellers (uit de bezette profielrun, alleen als ruwe verhouding) noemen
o.a. losse tekenaanroepen per materiaalsoort: op spoor `building Extrude<100`
~36/frame, `[sh] building:detail` 12-19/frame, `pool` 9, `countrylife` 9,
`cityprops` 6-11; op a7 `u:Mesh ShaderMaterial` 15, terrain 7-8, road 7,
green-chunk 6.

Er is deze ronde **geen codewijziging** doorgevoerd: met de machine in deze
staat is geen betrouwbare voor/na-meting te maken, en zonder meting is een
optimalisatie speculatief. De eerstvolgende kandidaten op basis van dit profiel
(elk met eigen voor/na-meting op een stille machine): (a) HUD op spoor
(4,3-5,1 ms; eerst de HUD-fasen met submarks uitsplitsen, de minimap is de
grootste verdachte), (b) render-hoofdpass (draw calls/batches: de diag noemt
tientallen losse bouw- en detailtrekken op spoor), (c) `3d:buildings`
streaming. De norm (p95 <= 25, max <= 100) blijft op deze machine onhaalbaar te
verifiëren; dat staat hier eerlijk als restpunt.

## Koudstart-hermeting 0.60.8 (13-11, Electron 45, schone machine)

Opnieuw `--profile-load=20000` (CPU-profiel van de eerste 20 s na navigatie;
totaal 21,1 s gesampled) en de benchmark, na `npm run stage`:

| post (self-tijd) | nu | eerder (0.60.7) |
|---|---:|---:|
| `(program)` shader first-use | 6,3% | 4,7% (0,94 s) |
| tile-decode (`tilestore onmessage`) | 4,5% | 4,7% (0,95 s) |
| `pointInPolygon` | 4,1% | 3,4% (0,70 s) |
| garbage collector | 4,1% | — |
| `inWater` (waterindex) | 3,1% | 4,4% (0,89 s) |
| `project` (busroutes) | 2,1% | — |
| `query` (spatialgrid) | 2,0% | — |
| `WebGLUniforms` | 1,9% | — |
| `gridItems` (spatialgrid) | 1,7% | — |
| `createBrickDetailTexture` (pixelart3d) | **niet in de top-30** | **2,85 s (14%)** |

De eerste Canvas2D-post (`createBrickDetailTexture`) is dus **weg**: de
startring/warm-up-palette heeft hem uit het koude pad gehaald (pixelart3d.js
als bestand nog 2,1%, inclusief `fitText` 0,8% en `createFlatRoofTexture`
0,4%). Een vervanging door een vooraf gebakken tegel/DataTexture is daarmee
**niet nodig** en niet gebouwd (zou ook een visuele vergelijking vragen). De
koude restpost is nu shader-first-use (6,3%), tile-decode (4,5%) en de
polygoon/water-queries (pointInPolygon 4,1%, inWater 3,1%).

Benchmark (Vlot: kwaliteit hoog, schaduwen aan, korte zichtafstand, 1600x900,
twee runs op een verder stille machine):

| run | gem. fps | p95 frametijd | JS-heap (piek) |
|---|---:|---:|---:|
| nu, run 1 | 28 | 84 ms | 1,6 GB |
| nu, run 2 | 33 | 50 ms | 2,4 GB |
| eerder (0.60.7) | **46,7** | — | **2,76 GB** |

De JS-heap is duidelijk lager (1,6-2,4 GB tegen 2,76 GB), maar de fps liggen
onder de eerdere 46,7 en verschillen sterk tussen twee runs (28 vs 33) zonder
andere processen; dat is niet schoon genoeg om een regressie te noemen. Let op:
de Electron-binary in `desktop/node_modules` verdween tijdens deze sessie
tweemaal (andere agents deden npm-acties in de gedeelde werkboom); na
herinstallatie (`npm install --no-save electron@45.2.3` + `install.js`, lokaal,
niet gecommit) zijn de runs hierboven gedaan. Een eerlijke vervolgstap is drie
benchmarkruns achter elkaar op een stille machine (mediaan) en de eerste
benchmark-shots apart profileren; de koude start zelf is met de startring/
warm-up-palette aantoonbaar verbeterd op de Canvas2D-post.

## Reproduceren

```
cd desktop && npm run stage
cd .. && PERF_DUR=15000 node scripts/perf/run.mjs <naam> --preset=quality:hoog --hitch
node scripts/perf/norm_check.mjs <PERF_OUT>/<naam>.json
```

## Eindmeting 0.60.6 (11-11-2026, schone machine)

Na de straatmeubel- en shaderlink-fix opnieuw gemeten met de hitchprobe (a7/spoor, 15 s, quality:hoog, dpr 1, 1904x993, --hitch, --url-flags=touch=0). Machine idle (geen andere Electron/node-processen; load 0.00). Twee runs:

| run | route | gem. | p95 | p99 | max | >50 |
|---|---|---:|---:|---:|---:|---:|
| 1 | a7 | 25,3 | 50,0 | 166,4 | 666,7 | 105 |
| 1 | spoor | 27,6 | 50,0 | 66,7 | 3216,9 | 38 |
| 2 | a7 | 24,6 | 50,0 | 266,6 | 966,7 | 107 |
| 2 | spoor | 28,3 | 50,0 | 149,9 | 716,6 | 67 |

De CPU-mediaan (20-24 ms) zit boven één 60Hz-beeld, dus de p95 van 50 ms is werk (drie vsyncs), geen planningsfout. De uitschieters blijven in de frame-gaten en de eerste zware/montageframes. Let op: na een release bestaat desktop/build niet meer; eerst `npm run stage` draaien, anders is de meting PARTIAL.

Benchmark op dezelfde build met de standaardpreset (Vlot): gemiddeld **44,3 fps**, 58,8 spikes/min, JS-heap 3,4 GB (de montage-voorwarm en nieuwe content kosten geheugen; de eerdere sparse meting was 43,4 fps / 2,9 GB). De hitchprobe-norm (p95<=25, max<=100) is nog niet gehaald.

### Geprobeerd en teruggedraaid: routing-graaf niet per frame

Het profiel wees `updateRouting` -> `ensureGraph/buildGraph` (`insideBuilding`, `throughBuilding`) als grote CPU-post aan. `ensureGraph` uit `updateRouting` gehaald en lazy in `computeRoute` gezet (routevraag bepaalt de rebuild). Twee schone nametingen vielen echter slechter uit (a7 28,5/50,2 en 33,9/66,8; spoor 44,6/116,6 en 36,8/66,7 tegen 25,3/50 en 27,6/50 ervoor), zonder duidelijke oorzaak. De wijziging is teruggedraaid; de graaf-cadans blijft zoals hij was. Een volgende poging moet eerst de rebuildfrequentie en de streamwacht apart meten.

## Electron 45 (0.60.7): schone hermeting

Na de upgrade naar Electron 45.2.3 op een stille machine (eerst `npm run stage`, anders is de meting PARTIAL):

| meting | route | gem. | p95 | p99 | max | >50 |
|---|---|---:|---:|---:|---:|---:|
| hitchprobe hoog | a7 | 19,9 | 33,3 | 50,1 | 2416,7 | 36 |
| hitchprobe hoog | spoor | 22,3 | 33,4 | 50,1 | 600,1 | 25 |
| benchmark Vlot | alle shots | **46,7 fps** | — | — | — | 63,8 spikes/min |

De benchmark-steekproef heeft een JS-heap van 2,76 GB. De p95 is op beide routes 33 ms (was 50 ms op Electron 44) en het gemiddelde 20-22 ms; de norm (p95<=25, max<=100) is nog niet gehaald, maar de staart is duidelijk korter. De hoge a7-max blijft een enkele koude/opstartpiek; de eerste benchmark-shots (Zonsopgang/Vismarkt/Noorderplantsoen) zijn nog koud, daarna loopt alles tegen de 60 fps.

## Koude start geprofileerd (0.60.7, Electron 45)

CPU-profiel van de eerste 20 s na navigatie (`--profile-load=20000`, Electron 45, schone build). Drukste self-tijd:

| functie | tijd | aandeel |
|---|---:|---:|
| `createBrickDetailTexture` (pixelart3d) | 2,85 s | 14% |
| tile-decode (`tilestore.js` onmessage) | 0,95 s | 4,7% |
| shader first-use (`(program)`) | 0,94 s | 4,7% |
| `inWater` (waterindex) | 0,89 s | 4,4% |
| `insideBuilding` (routing-graaf) | 0,71 s | 3,5% |
| `pointInPolygon` | 0,70 s | 3,4% |

De uitschieter is de **eerste Canvas2D-bewerking** in `createBrickDetailTexture`; de tekening zelf is deterministisch. De canvas wordt nu één keer bewaard en per materiaal als eigen `CanvasTexture` teruggegeven (geen gedeelde repeat-instellingen), maar de eerste canvasinitialisatie blijft de grootste koude post. Een echte vervolgstap is de tegel als gebakken afbeelding/DataTexture leveren in plaats van bij de start te tekenen; dat is een visuele wijziging en vraagt een screenshotvergelijking.

Het meetharnas is hard gemaakt: `perf/run.mjs` stopt nu met een duidelijke fout als `desktop/build` ontbreekt (na een release), met test `perfstage_test`.
## Profiel: routegraaf-debounce (#804, 11-11)

Aanvullend op de hitch-probes is de CPU zelf geprofiled: `PERF_PROFILE=<route>` laat
`desktop/devtools.js` een CPU-profiel trekken, `GDE_PROFILE_OUT=<map>` bewaart de
`.cpuprofile`, en `scripts/perf/selftime.mjs` / `categories.mjs` geven de hotspots.

- **Profielbeeld vóór de fix** (stilstaande route, quality hoog, ~15 s): routing/
  `throughBuilding` ~14% van de druk, GC 5-15%, `streetfurniture.onFoot` 2-6%,
  render ~19%, streaming ~17%. De routegraaf werd telkens opnieuw gebouwd zodra de
  tegelwachtrij even leeg was, ook als de speler stil stond.
- **Fix:** `ensureGraph` wacht tot de wegen-/gebouwenlagen **1 s stil** zijn en
  bouwt dan één keer; na **4 s** stale bouwt hij alsnog (bovengrens). De pure regel
  staat in `game/js/graphgate.js`, met `scripts/graphgate_test.mjs`; de route-,
  ribbon- en startroutetests blijven groen. In het nieuwe profiel is
  `throughBuilding`/`buildGraph` uit de top verdwenen en GC naar ~2,5%.
- **Indicatieve meting** (machine niet stil; alleen ter vergelijking, geen
  acceptatie): staan gem. **37,6 -> 17,5 ms**, p95 **83 -> 17 ms**, >50 ms
  **71 -> 1** frame; a7 gem. ~20 ms, p95 ~33 ms. De max blijft hoog (~1,6 s) door
  de heavy weg/streaming; dat is het volgende #804-restpunt.
- **A/B op a7** (zelfde release, kort na elkaar; machine 34% vs 48% CPU): zonder
  debounce gem. **39,8** / p95 **116,6** / max **1400** ms; met debounce gem.
  **29,5** / p95 **66,7** / max **683** ms. Indicatief (de runs waren niet even
  stil), maar dezelfde richting als het profiel: ook op een rijdende route wordt
  de staart kleiner. De norm (p95 <= 25, max <= 100) is nog niet gehaald.
- **Open:** de HUD-route kan na een snelle tegelstroom kort (max 4 s) op de oude
  graaf staan; met de hand op een snel traject controleren. Een echte
  acceptatiemeting vereist een stille machine (CPU < 2%, geen andere Electron);
  `run.mjs` waarschuwt boven 35% en `norm_check` markeert zulke bestanden.
