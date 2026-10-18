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
