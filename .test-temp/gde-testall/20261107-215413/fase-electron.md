# Testrapport 20261107-215413

## Samenvatting

- 1 item mislukt: 10 geslaagd, 1 mislukt, 0 over de tijdslimiet, 0 niet gedraaid.
- Geen nieuwe fouten sinds de vorige run; wat mislukt was al bekend.
- 7 beelden of metingen wijkt duidelijk af van de vorige run (geen fout, wel kijken).
- Niemand heeft dit rapport of deze beelden met eigen ogen bekeken: een geslaagde beeldcheck zegt alleen dat een beeld niet zwart, leeg of ongeldig is en niet sterk afwijkt van de vorige run, niet dat het er goed uitziet.

## Electron (smoke, verhaal, bot, beelden)

Duur 17m56s. 10 geslaagd, 1 mislukt, 0 timeout, 0 niet gedraaid. Vergeleken met de run van 20261107-213544.

**Bleef fout:** `electron:verhaaltest`

### Mislukt

| Item | Status | Duur | Wat |
|---|---|---|---|
| electron:verhaaltest | FAIL | 17m54s | FAIL: 32 stappen, 7 mislukte checks, 0 NaN-waarschuwingen FAIL all 1420 spots reachable missie-doel luik stage 0 goto "Eerst de kras van de wagon: Tinus kijkt ernaar" (NaN, NaN): geen positie; postgame skutsje Skûtsje-sp |

Oorzaak per mislukt item (register in scripts/lib/testoorzaken.mjs):

- `electron:verhaaltest`: oorzaak nog niet onderzocht

### Let op (wijkt af, geen fout)

- `beeld:verhaaltest/01-M01.png`: 10.2% anders dan vorige run
- `beeld:verhaaltest/05-M05.png`: 12.6% anders dan vorige run
- `beeld:verhaaltest/14-T3.png`: 12.3% anders dan vorige run
- `beeld:verhaaltest/29-M28.png`: 10.8% anders dan vorige run
- `beeld:verhaaltest/job-boa-case.png`: 13.4% anders dan vorige run
- `beeld:verhaaltest/mg-kart-grid.png`: 19.0% anders dan vorige run
- `beeld:verhaaltest/mg-kart-race.png`: 9.9% anders dan vorige run

<details><summary>Alle items</summary>

| Item | Status | Duur | Opmerking |
|---|---|---|---|
| electron:verhaaltest | FAIL | 17m54s | FAIL: 32 stappen, 7 mislukte checks, 0 NaN-waarschuwingen FAIL all 1420 spots reachable missie-doel luik stage 0 goto "E |
| nan-geometrie:verhaaltest | PASS | 0.0s |  |
| console:verhaaltest | PASS | 17m54s |  |
| beeld:verhaaltest | PASS | 0.0s | 61 beelden: 0 zwart/leeg/ongeldig, 0 onleesbaar, 7 wijkt af van vorige run (61 vergeleken) |
| beeld:verhaaltest/01-M01.png | PASS | 0.0s | 10.2% anders dan vorige run |
| beeld:verhaaltest/05-M05.png | PASS | 0.0s | 12.6% anders dan vorige run |
| beeld:verhaaltest/14-T3.png | PASS | 0.0s | 12.3% anders dan vorige run |
| beeld:verhaaltest/29-M28.png | PASS | 0.0s | 10.8% anders dan vorige run |
| beeld:verhaaltest/job-boa-case.png | PASS | 0.0s | 13.4% anders dan vorige run |
| beeld:verhaaltest/mg-kart-grid.png | PASS | 0.0s | 19.0% anders dan vorige run |
| beeld:verhaaltest/mg-kart-race.png | PASS | 0.0s | 9.9% anders dan vorige run |

</details>

## Wat niemand heeft gezien

Niemand heeft dit rapport of deze beelden met eigen ogen bekeken: een geslaagde beeldcheck zegt alleen dat een beeld niet zwart, leeg of ongeldig is en niet sterk afwijkt van de vorige run, niet dat het er goed uitziet.
