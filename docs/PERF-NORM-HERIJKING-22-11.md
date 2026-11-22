# Perf-norm herijking ring en spoor (22-11-2026, #1184)

> Besluit van de eigenaar, vooraf gegeven: haalt de fix van de perf-regressie de norm net niet, dan wordt de norm herijkt met onderbouwing. Dit document is die onderbouwing. Analyse en bisect: [PERF-REGRESSIE-22-11.md](PERF-REGRESSIE-22-11.md). Vervolgwerk: issue #1184.

## Besluit in vier regels

1. Voor de routes **ring** en **spoor** geldt in de gate-set **`release`** tijdelijk p95 <= **52 ms** (3 vsync op 60 Hz is 50,0 ms, plus marge) in plaats van 37 ms.
2. **Foot** en alle andere routes blijven op 37 ms. Ook max (1000 ms) en werktijd-p95 (35 ms) blijven voor ring en spoor hard.
3. De herijking is data in `scripts/perf/normrules.mjs` (`TIJDELIJKE_NORMEN`: norm, set, datum, issue, reden, opheffing). De gate meldt zo'n route als **tijdelijk herijkt** (status `herijkt`, geel, bevinding `belangrijk`) en nooit stilzwijgend groen. Rood blijft rood: p95 boven 52 ms, max of werktijd boven de norm.
4. Opheffen kan pas als het tegelwerk uit de eerste minuut is: zie "Opheffingsvoorwaarde".

## Meetreeks

Opzet en machine zoals in PERF-REGRESSIE-22-11: `node scripts/perf/run.mjs <naam> --hitch` met `PERF_ONLY=foot,ring,spoor`, 1920x1080, RTX 3060, gecachte wereld van 20-11, drie runs per punt. p95 in ms; de meting is bimodaal (33,4 of 50,0, twee of drie vsync).

| stand | foot | ring | spoor |
|---|---|---|---|
| HEAD `3f0f4acc7` (gate-run, voor de fix) | 54,4; 54,6; 53,6 | 88,4; 87,6; 70,8 | 53,6; 53,4; 53,0 |
| v0.64.0 (tag) | 36,3; 35,5; 35,5 | 35,5; 35,3; 18,7 | 51,5; 36,5; 36,6 |
| na de fix `df6ea5c4b` | 33,4; 33,4; 33,4 | 50; 49,9; 50,1 | 50; 50; 50 |

Zonder `--hitch` hetzelfde beeld: foot terug op de norm, ring en spoor in de reeks net erboven (50). Spoor was op de tag zelf al bimodaal (33 of 50): daar zit geen eigen schuldige commit achter.

## Oorzaak

Sinds `c5b375720` (#1052) lopen de plaatsingsvensters `placement` (187 tegels), `kits` (76) en `koe` (42) als druppel via de achtergrondwachtrij, die tijdens de openingsfilm en `cineQuiet` (tot ca. 50 s) wordt vastgehouden. Daarna blijft ca. 6 s tegelwerk (305 tegels) over de eerste ~100 s na de start verdeeld; dat valt in de gate-routes foot, ring en spoor. In v0.64.0 was hetzelfde werk klaar op 21 s, midden in de film. Elke tegel verhoogt `junctionVer` en `geoVer`, waarna kruispuntmodel, signaalgrid, lichtenlijst en straatmeubilair meebewegen; een tegel heeft in `addTileSteps` bovendien ongeknipte stappen van 20 tot 73 ms.

De fix (`1ca119f31`, `df6ea5c4b`) haalde foot terug op 33,4 en kapte de pieken af (ring p99 233 naar 100 tot 150 ms). Het werk zelf is niet weg: zonder afvoer (proef) halen ring 16,8 en 33,3 en foot 33,4 de norm wel. Alleen het werk wegnemen haalt dus 37 ms. Bewezen niet werkend: de vasthouding korter maken met een grotere druppel (ring 50 tot 66,6; spoor tot 149,9), de druppel kleiner maken (geen winst) en de koe-plekken pas bij nabijheid starten (305 naar 263 tegels, nog 50).

## Afweging

| | voor | tegen |
|---|---|---|
| **Terugdraaien van #1052** | p95 van ring en spoor terug op v0.64.0 | de eerste scenes zakken terug van 35,3 naar 25,9 fps op Hoog: het tegelstream-werk is juist daarvoor gedaan |
| **Doorgaan met de herijking** | de winst uit het tegelstream-werk blijft (de eerste scenes 25,9 naar 35,3 fps op Hoog); foot haalt de norm weer | ring en spoor hebben in de eerste minuut p95 50 ms (3 vsync) in plaats van 33 tot 36; de eerste minuut is het tegelwerk, daarna loopt het spel op de gewone norm |
| **Meteen het werk wegnemen** (bakken, per cluster) | haalt 37 ms echt | een eigen epic (L): plaatsing is geen pure functie van een tegel (gebouwen, wegen, water en bomen van meerdere tegels, module-toestand); zie #1184 |

Gekozen: de herijking, tijdelijk en zichtbaar. De winst op de eerste scenes (waar spelers de game beoordelen) weegt zwaarder dan 50 ms in plaats van 33 ms in de eerste minuut, zolang dat niet blijft hangen: daarom staat de herijking als data met een opheffingsvoorwaarde in elke gate-run.

Waarom 52 en niet 50: p95 op een 60 Hz-lus is gekwantiseerd (16,7 / 33,3 / 50,0 ms); de gemeten waarden zijn 49,9 tot 50,1. 52 houdt ze binnen en laat 66,7 (4 vsync) rood. Een route die op 3 vsync zit is dus geel, op 4 vsync rood.

## Wat de gate doet

- `node scripts/release/perf_gate.mjs --set=release` (de releasegate zet dat zelf) past de tijdelijke normen toe op ring en spoor. Zonder `--set`, of met een andere set, geldt overal 37 ms.
- Binnen 52 maar boven 37: status `herijkt`, bevinding `belangrijk` met issue, reden en opheffing; het verdict blijft groen. De releasegate noemt het in het perf-detail ("GEEL, tijdelijk herijkt: ring (#1184), spoor (#1184)") en `perf-gate.json` bevat `tijdelijkeNormen`.
- Een herijkte route wordt niet rood op de relatieve p95-baseline (die staat op de gewone waarde); avg en max blijven bewaakt.
- De baseline wordt nooit met herijkte waarden bijgewerkt: `--update` blijft de gewone norm eisen.
- `node scripts/perf/norm_check.mjs <json> --set=release` toont dezelfde routes als `GEEL`.
- Tests: `scripts/perf_norm_test.mjs` (de norm per route en set, foot niet verruimd) en `scripts/release_perf_test.mjs` (status, bevinding, rapport, samenvatting, baseline).

## Opheffingsvoorwaarde

Ring en spoor halen p95 <= 37 ms in de gate-set `release` in drie opeenvolgende runs, op dezelfde machine, zonder tegelafvoer die in de routes loopt. Dan verdwijnt `TIJDELIJKE_NORMEN` uit `normrules.mjs` (en de bijbehorende `--set`-doorgifte mag blijven staan). Uiterlijk bij de release na de oplevering van #1184 wordt gekeken of de herijking nog nodig is; blijft ze langer dan twee releases staan zonder voortgang op het issue, dan legt de coordinator dat opnieuw aan de eigenaar voor.

## Vervolg-epic

Issue #1184: *Deterministische plaatsing van winkels, garages en horeca (id uit positie) zodat plaatsing per cluster/gebakken kan*. Kern: id uit positie, daarna per cluster plaatsen of bakken in het `.gdt`-formaat (nieuwe sectie, loader met terugval, gelijkheidstest op een sample van de wereldbouw), koe-plekken bij nabijheid. Samen spelen: de tegelstroom is per speler lokaal; geen nieuw bericht of voortgang.

## Niet gemeten

De volledige gate-set `release` na de fix, op de wereld van de gate (met `bezit-percelen.json`); `heli`, `a7`, `platteland`, `varen`, `druk`, `nacht` en `regen` (die waren in het gate-rapport binnen de norm). Een gate-run op de merge-commit moet de cijfers bevestigen. Deze wijziging zelf is alleen met pure tests gedekt; er is geen perf-run gedraaid.
