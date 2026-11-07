# Testrapport 20261107-211504

## Samenvatting

- 1 item mislukt: 13 geslaagd, 1 mislukt, 0 over de tijdslimiet, 0 niet gedraaid.
- Geen nieuwe fouten sinds de vorige run; wat mislukt was al bekend.
- Fasen niet gedraaid: licht, zwaar.
- 10 beelden of metingen wijkt duidelijk af van de vorige run (geen fout, wel kijken).
- Niemand heeft dit rapport of deze beelden met eigen ogen bekeken: een geslaagde beeldcheck zegt alleen dat een beeld niet zwart, leeg of ongeldig is en niet sterk afwijkt van de vorige run, niet dat het er goed uitziet.

## Licht (modules, audits, tests)

**Niet gedraaid** in deze run.

## Zwaar (wereldchecks)

**Niet gedraaid** in deze run.

## Electron (smoke, verhaal, bot, beelden)

Duur 18m23s. 13 geslaagd, 1 mislukt, 0 timeout, 0 niet gedraaid. Vergeleken met de run van 20261107-205552.

**Bleef fout:** `electron:verhaaltest`

### Mislukt

| Item | Status | Duur | Wat |
|---|---|---|---|
| electron:verhaaltest | FAIL | 18m21s | FAIL: 32 stappen, 9 mislukte checks, 0 NaN-waarschuwingen FAIL all 1420 spots reachable missie-doel luik stage 0 goto "Eerst de kras van de wagon: Tinus kijkt ernaar" (NaN, NaN): geen positie; postgame skutsje Skûtsje-sp |

Oorzaak per mislukt item (register in scripts/lib/testoorzaken.mjs):

- `electron:verhaaltest`: oorzaak nog niet onderzocht

### Let op (wijkt af, geen fout)

- `beeld:verhaaltest/01-M01.png`: 9.4% anders dan vorige run
- `beeld:verhaaltest/02-M02.png`: 11.5% anders dan vorige run
- `beeld:verhaaltest/03-M03.png`: 10.9% anders dan vorige run
- `beeld:verhaaltest/job-boa-case.png`: 11.7% anders dan vorige run
- `beeld:verhaaltest/mg-kart-grid.png`: 20.5% anders dan vorige run
- `beeld:verhaaltest/mg-kart-race.png`: 9.7% anders dan vorige run
- `beeld:verhaaltest/mg-pitchputt-next.png`: 23.5% anders dan vorige run
- `beeld:verhaaltest/mg-skatepark-air.png`: 8.4% anders dan vorige run
- `beeld:verhaaltest/mg-skatepark-ride.png`: 8.1% anders dan vorige run
- `beeld:verhaaltest/om-dorp.png`: 13.0% anders dan vorige run

<details><summary>Alle items</summary>

| Item | Status | Duur | Opmerking |
|---|---|---|---|
| electron:verhaaltest | FAIL | 18m21s | FAIL: 32 stappen, 9 mislukte checks, 0 NaN-waarschuwingen FAIL all 1420 spots reachable missie-doel luik stage 0 goto "E |
| nan-geometrie:verhaaltest | PASS | 0.0s |  |
| console:verhaaltest | PASS | 18m21s |  |
| beeld:verhaaltest | PASS | 0.0s | 61 beelden: 0 zwart/leeg/ongeldig, 0 onleesbaar, 10 wijkt af van vorige run (42 vergeleken) |
| beeld:verhaaltest/01-M01.png | PASS | 0.0s | 9.4% anders dan vorige run |
| beeld:verhaaltest/02-M02.png | PASS | 0.0s | 11.5% anders dan vorige run |
| beeld:verhaaltest/03-M03.png | PASS | 0.0s | 10.9% anders dan vorige run |
| beeld:verhaaltest/job-boa-case.png | PASS | 0.0s | 11.7% anders dan vorige run |
| beeld:verhaaltest/mg-kart-grid.png | PASS | 0.0s | 20.5% anders dan vorige run |
| beeld:verhaaltest/mg-kart-race.png | PASS | 0.0s | 9.7% anders dan vorige run |
| beeld:verhaaltest/mg-pitchputt-next.png | PASS | 0.0s | 23.5% anders dan vorige run |
| beeld:verhaaltest/mg-skatepark-air.png | PASS | 0.0s | 8.4% anders dan vorige run |
| beeld:verhaaltest/mg-skatepark-ride.png | PASS | 0.0s | 8.1% anders dan vorige run |
| beeld:verhaaltest/om-dorp.png | PASS | 0.0s | 13.0% anders dan vorige run |

</details>

## Wat niemand heeft gezien

Niemand heeft dit rapport of deze beelden met eigen ogen bekeken: een geslaagde beeldcheck zegt alleen dat een beeld niet zwart, leeg of ongeldig is en niet sterk afwijkt van de vorige run, niet dat het er goed uitziet.
