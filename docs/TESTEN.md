# Testen met één commando

`node scripts/test_all.mjs` draait de tests in fasen en schrijft een rapport met een korte Nederlandse samenvatting bovenaan. Het hoort bij #186 (spelbot), #5 en #4. De werkafspraken staan in [AGENTS.md](../AGENTS.md) (sectie Testen); dit document beschrijft het commando.

```
node scripts/test_all.mjs [--fase=licht|zwaar|electron|alles] [--rapport=<map>]
                          [--only=<tekst>] [--jobs=2] [--test-timeout=120]
                          [--issues [--create]] [--force] [--list]
```

`--fase` mag ook een lijst zijn (`--fase=licht,zwaar`). Standaard is `licht`. `--only=<tekst>` draait alleen de items waarvan de naam de tekst bevat (handig om één test of één audit te proberen). `--list` toont de items.

## De fasen

Het onderstaande over duur en belasting zijn schattingen op een gewone ontwikkelmachine, niet gemeten op een volle run. De rapportage houdt per item de echte duur bij; kijk daar na de eerste run naar.

| Fase | Wat | Duur (schatting) | Belasting |
|---|---|---|---|
| `licht` | module-check van alle JS (`node --check`, module-bewust), `import_check`, `voice_coverage`, `text_audit`, dode-code-bewaking, alle `scripts/*_test.mjs` (dus ook `import_cycles_test` voor de cyclusbewaking) met duur en tijdslimiet per test | 5 tot 15 minuten | 2 Node-processen tegelijk (`--jobs`), geen GPU |
| `zwaar` | de wereldchecks uit AGENTS.md en de audits: `ring_probe`, `seat_audit`, `province_test`, `province_detail_test`, `drive_audit`, `junction_sim_test`, `network_drive_test`, `vaarnet_province_test`, `bridge_province_test`, weiland-randen (`prop_conflict_audit`), water-lagen, `landmark_audit`, `overlap_check`, `prop_water_audit`, placement, rand-, hoogte-, terrein-, spoor- en wateraudits | 20 tot 60 minuten | één Node-proces tegelijk, veel geheugen en een kern vol |
| `electron` | smoke-run, Electron-verhaaltest (`--story-test`), `geocheck`, spelbot-sweeps (missies, minigames) en de beeldrondes (`scripts/qa/*`, `scripts/ui_shots.mjs`) met beeldchecks | 1 tot 2 uur | één Electron tegelijk, GPU en een kern vol; de machine is merkbaar bezet |

`zwaar` en `electron` hebben `game/world` nodig (`cd desktop && npm run stage`); `electron` ook `desktop/node_modules` (`cd desktop && npm install`, of `ELECTRON_EXE=<pad>`). Ontbreekt dat, dan staat het item in het rapport als **niet gedraaid** met de reden, en niet als geslaagd.

### Aanbevolen volgorde

1. `licht` na elke wijziging en vóór elke merge.
2. `zwaar` na wijzigingen aan wereld, tegels, wegen, water of props, en vóór een release.
3. `electron` vóór een release en 's nachts; nooit tijdens het spelen.
4. `alles` is `licht`, `zwaar` en `electron` achter elkaar.

## Visuele sweep

`node scripts/qa/sweep.mjs --seed=<n> [--part=wereld,verhaal,cut] [--wereld=45] [--verhaal=26] [--cut=14] [--slot] [--plan]` maakt met een vaste seed minstens 150 beelden op willekeurige momenten en beoordeelt ze. Met dezelfde seed krijg je hetzelfde plan (`plan.json`); een nieuwe seed geeft nieuwe plekken, tijden en weersoorten.

- **Wereld:** plekken in stad, wijken, dorpen, gehuchten, Ommeland, A7, kust, Eemshaven, Delfzijl en Waddenzee, met een willekeurige tijd van de dag en een willekeurig weer. Per plek een beeld op straat (met HUD) en een hoog beeld.
- **Verhaal:** een willekeurige stap van elke missie M01 t/m M26 via `__story.jump`, twee beelden (HUD, gesprekken, cutscenes die vanzelf starten) en om de andere stap een pauzemenu-paneel.
- **Cutscenes:** een steekproef van de geregisseerde scènes via `cutscene_shots.page.js` (`sample`).
- **Poort:** zwarte of lege beelden, een bijna lege wereld, een consolefout (zoals een ReferenceError per frame) of een scriptfout laten de run falen met exitcode 1 en "POORT GEFAALD" in het logboek.
- **Automatische beoordeling** (`bevindingen.json`, `logboek.md`): zwart, leeg of ongeldig beeld, NaN-geometrie, ontbrekende textures, (bijna) lege wereld, HUD buiten beeld of overlappende HUD-tekst, speler in water of gebouw of zwevend, consolefouten, mislukte sprong. Drijvende of verzonken props en z-fighting vangt dit niet; die vind je met de Read-tool op de beelden.
- Daarna kijkt een mens (of agent) alle beelden door, schrijft per probleem een korte vondst en maakt per unieke vondst een issue met `bug`, één impact- en één kostenlabel en `wacht-beeld` zolang geen mens het beeld zag. Beelden gaan niet naar GitHub; in het issue staan seed, beeldnaam en beschrijving.
- Eén Electron-instantie per deel, wegwerpprofiel, `--slot` neemt een slot uit `gde-locks`. `ELECTRON_EXE` en `GAME_WORLD` wijzen een Electron en een gestagede wereld aan als de worktree er geen heeft. Het logboek zegt altijd dat niemand de beelden heeft gezien.

## Speelchecks per functie en de spelbot met reizen

- `node scripts/qa/feature_smoke.mjs [--only=winkelen,bijbanen,voertuigen,...]` draait korte scripted checks in één Electron (wegwerpprofiel). Naast de oudere checks (kaart, wanted, bus, interieur, ...) zijn er `winkelen` (per winkeltype naar de deur, E, paneel lezen, het eerste item kopen), `bijbanen` (elke bijbaan starten, vier seconden draaien, stoppen; meldt ook bijbanen die op één plek staan of niet starten) en `voertuigen` (elk winkelvoertuig neerzetten, instappen, drie seconden gas). Uitvoer in `features.json` en `shots-*.png`.
- `node scripts/bot/run.mjs --reizen` laat de spelbot de reisbeats (T1 tot en met T4) spelen: hij kiest Meerijden en slaat de reisscène over. `--from=<stap> --skip-from` begint een doorlopende run bij die stap en slaat de stap zelf over, zodat de reisstap erna bij jouw plek begint (een sprong van `--mode=missions` slaat reisstappen over). `--max-game=<s>` begrenst de speltijd (standaard 3600 s: bij een sweep over alle stappen op 30000 zetten).
- Een tweede build voor een run naast een draaiende: `GDE_STAGE_OUT=<map>/game node desktop/build.mjs` en dan `GDE_GAME_DIR=<map>\game` (met backslashes op Windows) bij de run. Zo hoeft een herbouw geen lopende Electron te slopen.
- Het titelmenu opent pas als de poort open is en negeert toetsen daarvoor; `--perf-script` drukt daarom Enter tot het menu weg is (op een drukke machine speelde het spel anders onder een blijvend menu).

## Brug-QA (#235, #9, #154)

Beeld voor beeld vanaf een vaste camera; zonder de cinematic-camera van het spel, want die tilt zichzelf over gebouwen en duwt zich van muren en staat dus niet stil. Eén Electron-slot, wegwerpprofiel, `GDE_GAME_DIR` naar een gestagede map met de provinciewereld.

- `node scripts/qa/brug_beeld.mjs --game-dir=<map> --lijst=<json [{naam,x,y}]>`: per brug drie beelden per stand (a, b = 4 cm verschoven, c = a) schuin langs het water, op het dek en eronder, en bij een beweegbare brug een reeks tijdens het openen en sluiten met een toestandslog (`rep.log`). `--plekken=<json>` maakt een luchtbeeld en een straatbeeld van losse plekken (water, gebouwen, hekken). `--alleen-lijst` toont de beweegbare bruggen van de geladen kaart.
- `node scripts/qa/brug_beeld_analyse.mjs <map>`: telt per stand de pixels in vlakke delen die a-b meer verschillen dan a-c (ruis van water en verkeer) en schrijft heatmaps naar `heat/`. Het is een hulpmiddel: dichtbij geeft textuur en bewegende mensen veel ruis, dus kijk de beelden zelf door.
- `node scripts/qa/brug_beeld.mjs --modus=boot --lijst=<json { open: [{naam,x,y,boot}], bots: [{naam,x,y}] }>`: een binnenvaartschip vaart op een beweegbare brug aan (opent op tijd, onderdoor, weer dicht) of vaart tegen een vaste brug (aanvaring, terugduwen, dekschade).
- `node scripts/qa/png_crop.mjs <png> <x> <y> <b> <h> [schaal]` vergroot een stuk van een beeld; `node scripts/qa/montage.mjs <map> --filter=<regex>` maakt een contactblad.
- `node scripts/qa/brug_probe.mjs` leest het dek zonder Electron (hoogtestappen, dekverschil per brug); `scripts/qa/brug_qa.mjs` is de oudere, enkelvoudige versie.

## Veiligheid

- De Electron-stappen gebruiken een wegwerpprofiel (`GDE_TEST_PROFILE=gde-testall-<pid>-<stap>` in de tijdelijke map) en schrijven nooit naar `gde-save-v1`, `gde-settings` of `gde-prestaties-v1`. De profielen worden na afloop verwijderd.
- Het commando raakt poort 9000 en de geïnstalleerde app niet aan.
- Er draait één Electron tegelijk. Draait er al een (bijvoorbeeld omdat de eigenaar speelt), dan start de fase niet en staan alle Electron-items als niet gedraaid in het rapport. `--force` slaat die controle over; gebruik dat alleen op een machine waar niemand speelt.
- Bij een tijdslimiet wordt de hele processtructuur afgesloten.
- `--issues` is een droge run: de concepten komen in `issues-concept.md`. Pas met `--create` worden issues aangemaakt, via `gh` (labels die niet bestaan worden weggelaten).

## Het rapport

Standaard in `%TEMP%/gde-testall` (buiten de repo); met `--rapport=<map>` elders. Per run een map `<tijdstempel>/` met:

- `fase-<naam>.json` en `fase-<naam>.md` per gedraaide fase;
- `rapport.json` en `rapport.md` voor de hele run, samenvatting bovenaan; `laatste-rapport.md` in de hoofdmap is een kopie;
- `issues-concept.md` met `--issues`;
- per Electron-stap de map met `run.log` en de beelden.

`state.json` in de hoofdmap onthoudt per fase de laatste run (resultaten en kleine beeldhandtekeningen). Daarmee toont het rapport per item pass, fail, timeout en niet gedraaid, **nieuwe fouten** (een andere of nieuwe foutregel dan de vorige run), wat opgelost is, wat trager is geworden (minstens 1,5 keer en 5 seconden) en welke fasen niet gedraaid zijn. Met `--only` worden alleen de gedraaide items vervangen.

Het exitcode is 1 bij een mislukt item of timeout, 2 bij een crash van het script zelf. Een fase die crasht wordt als mislukt item vermeld; er faalt niets stil.

### Beeldchecks (fase electron)

Elk beeld uit de smoke-run, de verhaaltest, de spelbot en de beeldrondes wordt gecontroleerd op:

- **zwart** (meer dan 98% bijna zwart), **leeg** (vrijwel één kleur), **ongeldig** (meer dan de helft doorzichtig, of meer dan 20% foutkleur-magenta; een NaN in de GPU-uitvoer laat zich zo zien);
- afwijking van de vorige run: een 32x18 helderheidsraster per beeld, gemiddeld verschil boven 8% geeft een waarschuwing "let op". Dat is geen fout: beelden met verkeer en weer verschillen altijd een beetje.

Daarnaast: consolefouten uit de renderer, TDZ-fouten (`Cannot access ... before initialization`), importfouten, NaN-waarschuwingen in geometrie (`computeBoundingSphere`), de uitslag van de verhaaltest en de frametijd van de smoke-run (fout alleen bij een bijna stilstaand beeld, waarschuwing bij veel trager dan de vorige run).

**Het rapport zegt altijd dat niemand de beelden heeft gezien.** Een geslaagde beeldcheck betekent alleen: niet zwart, niet leeg, niet sterk anders dan de vorige run. Of het er goed uitziet, beoordeelt een mens. Wat een agent niet in beeld heeft gezien, staat als "nog niet bekeken" in het issue.

## Voorstel: nachtelijke run

Dit is een voorstel; er is niets ingericht. De eigenaar beslist of en wanneer.

Een taak om 03:00 die `licht`, `zwaar` en `electron` achter elkaar draait en in de ochtend `laatste-rapport.md` oplevert, bijvoorbeeld op Windows:

```
schtasks /Create /SC DAILY /ST 03:00 /TN "GDE Testrun" /TR "node <repo>\scripts\test_all.mjs --fase=alles --issues"
```

Aandachtspunten:

- Alleen op een moment dat niemand speelt; de Electron-fase start dan niet en meldt dat, dus er gaat niets stuk.
- Geen `--create` in de taak: kijk eerst een paar nachten naar de concepten en maak de issues pas aan als de dubbelen en de ruis kloppen.
- Draai niet tegelijk met een releasebouw (AGENTS.md: geen nieuwe agents tijdens een releasebouw) en houd de schijf vrij: de beelden van de Electron-stappen staan in de runmappen onder `%TEMP%/gde-testall` en kunnen oude runs vervangen worden.
- De spelbot heeft eigen dagelijkse tooling (`scripts/bot/daily.mjs`, zie [SPELBOT-RAPPORT.md](SPELBOT-RAPPORT.md)). `test_all.mjs` draait alleen de sweeps voor missies en minigames; wie `daily.mjs` al plant, kan de bot-stappen met `--only` overslaan of de twee op verschillende tijden zetten.

## Beperkingen

- De Electron-fase is niet op deze machine uitgeprobeerd tijdens het schrijven (de eigenaar speelde, en de worktree had geen `desktop/node_modules` of `game/world`). De stappen zijn gebouwd op de bestaande scripts en de pure delen (rapportage, diff, logscans, PNG-checks) hebben tests in `scripts/test_all_test.mjs`. Eerste echte run: kijk of de vlaggen voor `--perf-test` (frametijd) en de uitvoermappen kloppen.
- De frametijd is alleen te lezen als de run een `[perf]`-regel met `fps` schrijft; anders staat het item als niet gedraaid.
- Een fingerprint van een fout is de itemnaam plus de eerste foutregel zonder getallen en paden. Wisselt een test zijn foutmelding, dan telt dat als een nieuwe fout.
