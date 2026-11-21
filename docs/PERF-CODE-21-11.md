# Prestaties, code-ronde (21-11): #1015, #1016, #1039

Alleen statisch en met node-microbenchmarks; geen Electron, niets in beeld bekeken. Elke wijziging heeft een meetpunt voor de eindsweep.
Samen spelen: alles hier is lokaal per speler (benchmark en streamen zijn per spel); geen netwerkwijziging.

## #1015 Benchmarkadvies (Hoog = 24 fps op een sterke AMD-pc)

**Bevinding.** `recommendStand` besliste op het gemiddelde over alle frames (1000 / gemiddelde frametijd) en de 1%-low. Dat gemiddelde
wordt door een paar ingestorte scenes (shadercompiles, tegelstroom in de opwarmfase: Vismarkt 10 fps, Noorderplantsoen 12 fps)
naar beneden getrokken, ook als de rest van de route soepel loopt. Het advies liep ook nooit naar de eigen presetmeting
(`presetFps`): "een stap omlaag" werd geadviseerd terwijl de lagere stand niet sneller was (Ultra 24, Hoog 24). Dat advies is dan onwaar en nutteloos.

**Wijziging** (`benchstats.js`, `runDiagnosis`; aangeroepen in `trailer.js showBenchmarkResults`, doorgegeven via `reportCard`):

| Soort | Herkenning | Gevolg |
|---|---|---|
| stand-ongevoelig | de snelste lagere stand is minder dan 15% sneller dan de huidige (`DIAG_LOWER_GAIN`) | geen stap omlaag, uitleg: de rem zit niet in de grafische stand |
| ongelijk | gemiddelde < 70% van de mediaan over de scenes (`DIAG_UNEVEN_RATIO`), minstens 5 scenes | geen stap omlaag, uitleg: een paar scenes haperen (laden, shaders) |
| normaal | anders | als voorheen |

Een gladde run met ruimte (stap omhoog) verandert niet; de diagnose werkt alleen op een run die al als ruw telt. De drukke-pc-melding
(`benchLooksBusy`) heeft voorrang in de kaart, zoals eerst.

**Test:** `node scripts/benchstats_test.mjs` (de blok #1015: Ultra 24 / Hoog 24,5 blijft Ultra met uitleg; duidelijk snellere lagere stand blijft "omlaag"; ongelijke run met mediaan 69; Laag heeft niets lager).

**Meetpunt eindsweep (Electron, sterke pc):** `--benchmark=1` op Ultra: staat `advice.diag` op de rapportkaart (`stand-ongevoelig` of `ongelijk`)
als de run onder 40 fps blijft, en is `lowerGain` (in `runDiagnosis`) 1,15 of hoger als Hoog echt sneller is? Grens: een run met een echte
GPU-beperking (Hoog duidelijk sneller) mag nooit als stand-ongevoelig gelden.

**Niet gedaan:** GPU-gebonden detectie met een timerquery (op de machine van Nikky leeg), geen aanpassing van de drempels 40/22/40 zelf.

## #1016 Pop-in: vooruitkijken van het streamen

**Bevinding.** `advanceStreamAhead` middelde de snelheid met één tijdconstante van 0,35 s. Na een sprint of een vol gas gevende auto
las het vooruitzicht (`lead`, 3 s snelheid) pas na ca. 0,5 s een bruikbare snelheid: de eerste tientallen meters vooruit stonden dus laat in de wachtrij
van tegels, gebouwen en wegen. Een korte rem of bocht liet het vooruitzicht juist te snel instorten.

**Wijziging** (`streambudget.js`): snelle aanloop (0,35 x 0,35 s), trage loslating (0,35 x 1,5 s). De richting blijft zoals ze was.

**Meetpunt (node, `streambudget_test.mjs`, 52 controles):** na 0,2 s vol gas (30 m/s, 60 fps) leest de schatting 24,8 m/s (voorheen ca. 13), het vooruitzicht is dan boven de 54 m;
een rem van 0,25 s houdt het vooruitzicht boven 10 m/s; na 3 s stilstand is het nul. Kosten: `advanceStreamAhead` ca. 100 ns per aanroep.
Eindsweep: `scripts/qa/popin.mjs` (afstand en frequentie per categorie) bij optrekken en bij de heli; verwachting: minder pop-in in de eerste 2 s na optrekken, geen verandering bij constante snelheid.

**Niet gedaan:** de laadstraal zelf vergroten (kost frametijd, zie PERF-STREAM-SOEPEL-21-11.md); niets in beeld bekeken.

## #1039 Render/GPU in de stad

**Bevinding (statische doorlichting).** De grote posten waren al aangepakt (gebouw- en wegbatches, multidraw-pool, vogels, perrons, trafficlights,
verkeersvoertuigen en personen zijn samengevoegde lagen, per-beeld-allocatie in scene3d is leeg, de schaduwronde heeft haak en overslagregels). Wat overblijft aan losse meshes
in lussen staat niet in het stadsbeeld (missies, binnenruimtes, minigames) of is zeldzaam (politielampen, richtingaanwijzers die verborgen zijn en dus geen drawcall kosten).

**Wijziging:** `scripts/perf/meshloopscan.mjs` (statische telling van lussen met losse meshes, zonder missies en minigames) met `scripts/meshloopscan_test.mjs`:
48 lussen in 28 bestanden nu, de test bewaakt een bovengrens zodat nieuwe herhaalde meshes in de stad opvallen. Grootste: `models3d_vehicles.js`
(politie- en paneelmeshes per voertuig, 2 per stuk), `werktuigen3d.js`, `flavour3d.js`, `railway3d.js`.

**Niet bewezen:** geen drawcall-daling in dit commit (er is geen instancing toegevoegd); de doelen -30% drawcalls, -25% GPU-p50 en p95 <= 22 ms
zijn niet gemeten. Open uit PERF-GPU-21-11.md blijft: 30 van 83 wegen los, kapplaten per cel, vereenvoudigde verre laag.

**Meetpunt eindsweep:** `renderer.info.render.calls` per preset op de vier vaste plekken (zie PERF-GPU-21-11.md "Herhalen"); verwachting dat dit commit niets verandert.

## Alle meetpunten kort

| Issue | Commando of test | Maat | Grens |
|---|---|---|---|
| #1015 | `node scripts/benchstats_test.mjs` en `--benchmark=1` | `advice.diag`, `lowerGain` | diag alleen bij ruwe run; Hoog duidelijk sneller geeft nooit `stand-ongevoelig` |
| #1016 | `node scripts/streambudget_test.mjs`, `scripts/qa/popin.mjs` | schatting na 0,2 s vol gas; pop-in per categorie na optrekken | >= 18 m/s na 0,2 s; ns per aanroep < 2000 |
| #1039 | `node scripts/meshloopscan_test.mjs`, renderer.info | lussen met losse meshes; drawcalls | <= 48 lussen; drawcalls gelijk aan main |
