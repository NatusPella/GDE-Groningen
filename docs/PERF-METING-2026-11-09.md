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

## Reproduceren

```
cd desktop && npm run stage
cd .. && PERF_DUR=15000 node scripts/perf/run.mjs <naam> --preset=quality:hoog --hitch
node scripts/perf/norm_check.mjs <PERF_OUT>/<naam>.json
```
