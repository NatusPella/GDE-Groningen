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

## Reproduceren

```
cd desktop && npm run stage
cd .. && PERF_DUR=15000 node scripts/perf/run.mjs <naam> --preset=quality:hoog --hitch
node scripts/perf/norm_check.mjs <PERF_OUT>/<naam>.json
```
