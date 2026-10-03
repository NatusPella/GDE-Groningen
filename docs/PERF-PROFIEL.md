# Profiel van de hoofdthread (0.24, Architectuur)

Waar gaat de tijd van de hoofdthread heen op zwakke hardware? Gemeten op
3 oktober 2026 met `scripts/perf`, op de preset Laag (`quality:laag,
shadows:false, drawDistance:kort, resolution:0.75, autoResolution:true`) en
met een vier keer tragere CPU (`--cpu-throttle=4`), op de routes foot, ring,
heli en village. Dit profiel bepaalt wat er naar een worker gaat.

## Hoe

Twee bronnen, omdat de CPU-profiler zelf de meting verstoort:

- **Secties per frame** (`--hitch`): `hitchprobe.js` telt nu per frame de
  tijd van elke sectie op (`summary().sections`, gemiddelde ms per frame),
  zonder profiler. `scripts/perf/sections.py` groepeert ze in categorieën.
  Dit is de hoofdbron.
- **CPU-profiel** (`PERF_PROFILE=<routes>`): met `GTE_PROFILE_OUT=<map>`
  bewaart de desktop-app het ruwe profiel, en `scripts/perf/categories.mjs`
  verdeelt de samples over categorieën (elk sample telt voor de dichtstbij­
  zijnde spelcode op de stack; three.js telt voor wie het aanriep).
  `--incl=fnA,fnB` geeft de inclusieve tijd van functies. Het profiel komt
  hier zonder throttle: met throttle en profiler samen duurt een frame
  seconden. `GTE_PROFILE_INTERVAL` (µs) maakt het samplen grover; met
  `--cpu-throttle` laat de app de debugger nu aangekoppeld, anders viel de
  throttle weg na het eerste profiel.

**Kanttekening.** De machine was tijdens alle metingen zwaar belast: een
geïnstalleerde GTE VI draaide mee (ongeveer 190% CPU en de GPU), plus andere
agents (load average 15 tot 65 op 8 kernen). De absolute frametijden zijn
daardoor onbruikbaar (honderden ms tot seconden per frame). De **verhoudingen**
tussen de categorieën en de aantallen draw calls zijn wel bruikbaar.

## Verdeling per route (secties, Laag + CPU×4)

Aandeel van de hoofdthread-tijd per frame:

| route   | simulatie/AI | streaming/geometrie | actoren 3D | HUD/DOM | audio | render | camera/licht/fx |
|---------|------:|------:|------:|------:|----:|------:|----:|
| foot    | 22% | 32% | 13% |  6% | 0% | 26% | 2% |
| ring    | 12% | 48% |  8% | 12% | 0% | 16% | 5% |
| heli    | 11% | 33% |  3% | 15% | 2% | 30% | 5% |
| village | 12% | 17% | 12% | 20% | 0% | 32% | 8% |

Streaming/geometrie per route:

- **foot**: `cityprops` 14% (het samenvoegen van de straatmeubel-cellen),
  shader-warm-up 8%, gebouwen 5%, wegen 4%.
- **ring**: stadswegen 21% (`roadsurface.js buildRoadGroup`), stadswater 8%,
  warm-up 6.5%, Ommeland 4%, gebouwen 3%.
- **heli**: Ommeland (`3d:rail+country`) 24%, warm-up 5%.
- **village**: Ommeland 9%, warm-up 4%.

Uit het CPU-profiel (zonder throttle), als aandeel van de bezette tijd:

| route | native (GL-driver, stijl/layout) | render (three.js) | streaming | simulatie | actoren 3D | HUD/DOM | GC |
|-------|------:|------:|------:|------:|------:|------:|----:|
| foot  | 29% | 22% | 16% | 10% | 10% | 6% | 3% |
| ring  | 25% | 16% | 24% | 12% |  8% | 6% | 5% |
| heli  | 39% | 27% | 15% |  5% |  4% | 8% | 2% |

GC is klein (2 tot 5%). Audio is verwaarloosbaar: de synthese draait al in
een worker (`sfx/dspworker.js`).

## Grootste losse posten

- `cityprops.js mergeInstances`: 5.5% van de hoofdthread op foot, de grootste
  enkele functie buiten three.js. Een cel wordt bij elke terugkeer opnieuw
  samengevoegd.
- `roadsurface.js buildRoadGroup` en het stadswater (`scene3d.js syncWater`):
  samen 29% op de ring.
- Ommeland op de heli: de skyline (`gatherGen`, 2%), de tegels
  (`genTileSteps` 1.2%, `rebuildChunk` 1.1%), het water (0.6%), dorpen (0.4%).
  Per frame klein, maar in pieken: een chunk met water bemonstert tot 8.000
  punten per tegel.
- De minimap van het Ommeland (`countrymap.js drawCountryDetail`, `miniTile`)
  en `hud_panel.js`: 15 tot 20% op heli en village. Dat is DOM/canvas-werk,
  geen geometrie.
- Shader-warm-up (`scanForPrewarm`): 4 tot 8% op elke route.

## Besluit

1. **Worker voor geometrie** (deze stap): de kernels zonder afhankelijkheden
   van de wereld gaan eerst, omdat die bit voor bit gelijk te houden zijn:
   - het samenvoegen van de straatmeubel-cellen (`cityprops`, 14% op foot);
   - het water van het Ommeland (bemonsteren van het waterveld en de
     kanalen, samenvoegen, normalen).
2. **Niet nu**: stadswegen en stadswater (de grootste post op de ring).
   Die hangen aan het hele wegennet, de hoogtes en de kades, waar mesh
   ronde 4 nu aan werkt; verplaatsen zou daar elke merge breken. Eerst na
   die ronde.
3. **Niet nu**: het uitleggen van de Ommeland-tegels (`genTileSteps`). Die
   code leunt op `countryplan` → `countryvillage` → `pedestrians` → het
   halve spel; in een worker vraagt dat eerst een splitsing in pure
   datamodules. Per frame is het klein (1 tot 2%) en al over frames
   verdeeld.
4. **Laadtijd** (stap 3) en de minimap zijn aparte posten; zie hieronder.
