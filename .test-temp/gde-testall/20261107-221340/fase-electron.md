# Testrapport 20261107-221340

## Samenvatting

- 1 item mislukt: 11 geslaagd, 1 mislukt, 0 over de tijdslimiet, 0 niet gedraaid.
- Geen nieuwe fouten sinds de vorige run; wat mislukt was al bekend.
- 8 beelden of metingen wijkt duidelijk af van de vorige run (geen fout, wel kijken).
- Niemand heeft dit rapport of deze beelden met eigen ogen bekeken: een geslaagde beeldcheck zegt alleen dat een beeld niet zwart, leeg of ongeldig is en niet sterk afwijkt van de vorige run, niet dat het er goed uitziet.

## Electron (smoke, verhaal, bot, beelden)

Duur 17m32s. 11 geslaagd, 1 mislukt, 0 timeout, 0 niet gedraaid. Vergeleken met de run van 20261107-215413.

**Bleef fout:** `electron:verhaaltest`

### Mislukt

| Item | Status | Duur | Wat |
|---|---|---|---|
| electron:verhaaltest | FAIL | 17m30s | FAIL: 29 stappen, 5 mislukte checks, 0 NaN-waarschuwingen FAIL all 1420 spots reachable missie-doel luik stage 0 goto "Eerst de kras van de wagon: Tinus kijkt ernaar" (NaN, NaN): geen positie; postgame skutsje Skûtsje-sp |

Oorzaak per mislukt item (register in scripts/lib/testoorzaken.mjs):

- `electron:verhaaltest`: oorzaak nog niet onderzocht

### Let op (wijkt af, geen fout)

- `beeld:verhaaltest/01-M01.png`: 9.2% anders dan vorige run
- `beeld:verhaaltest/02-M02.png`: 9.8% anders dan vorige run
- `beeld:verhaaltest/03-M03.png`: 12.2% anders dan vorige run
- `beeld:verhaaltest/04-M04.png`: 8.1% anders dan vorige run
- `beeld:verhaaltest/19-M20.png`: 8.5% anders dan vorige run
- `beeld:verhaaltest/23-M25.png`: 8.9% anders dan vorige run
- `beeld:verhaaltest/job-boa-case.png`: 9.2% anders dan vorige run
- `beeld:verhaaltest/mg-kart-grid.png`: 18.7% anders dan vorige run

<details><summary>Alle items</summary>

| Item | Status | Duur | Opmerking |
|---|---|---|---|
| electron:verhaaltest | FAIL | 17m30s | FAIL: 29 stappen, 5 mislukte checks, 0 NaN-waarschuwingen FAIL all 1420 spots reachable missie-doel luik stage 0 goto "E |
| nan-geometrie:verhaaltest | PASS | 0.0s |  |
| console:verhaaltest | PASS | 17m30s |  |
| beeld:verhaaltest | PASS | 0.0s | 58 beelden: 0 zwart/leeg/ongeldig, 0 onleesbaar, 8 wijkt af van vorige run (58 vergeleken) |
| beeld:verhaaltest/01-M01.png | PASS | 0.0s | 9.2% anders dan vorige run |
| beeld:verhaaltest/02-M02.png | PASS | 0.0s | 9.8% anders dan vorige run |
| beeld:verhaaltest/03-M03.png | PASS | 0.0s | 12.2% anders dan vorige run |
| beeld:verhaaltest/04-M04.png | PASS | 0.0s | 8.1% anders dan vorige run |
| beeld:verhaaltest/19-M20.png | PASS | 0.0s | 8.5% anders dan vorige run |
| beeld:verhaaltest/23-M25.png | PASS | 0.0s | 8.9% anders dan vorige run |
| beeld:verhaaltest/job-boa-case.png | PASS | 0.0s | 9.2% anders dan vorige run |
| beeld:verhaaltest/mg-kart-grid.png | PASS | 0.0s | 18.7% anders dan vorige run |

</details>

## Wat niemand heeft gezien

Niemand heeft dit rapport of deze beelden met eigen ogen bekeken: een geslaagde beeldcheck zegt alleen dat een beeld niet zwart, leeg of ongeldig is en niet sterk afwijkt van de vorige run, niet dat het er goed uitziet.
