# Testrapport 20261107-205552

## Samenvatting

- 1 item mislukt: 3 geslaagd, 1 mislukt, 0 over de tijdslimiet, 0 niet gedraaid.
- Nieuw sinds de vorige run: 1 (electron:verhaaltest).
- Fasen niet gedraaid: licht, zwaar.
- Niemand heeft dit rapport of deze beelden met eigen ogen bekeken: een geslaagde beeldcheck zegt alleen dat een beeld niet zwart, leeg of ongeldig is en niet sterk afwijkt van de vorige run, niet dat het er goed uitziet.

## Licht (modules, audits, tests)

**Niet gedraaid** in deze run.

## Zwaar (wereldchecks)

**Niet gedraaid** in deze run.

## Electron (smoke, verhaal, bot, beelden)

Duur 18m21s. 3 geslaagd, 1 mislukt, 0 timeout, 0 niet gedraaid. Geen vorige run om mee te vergelijken.

**Nieuwe fouten:** `electron:verhaaltest`

### Mislukt

| Item | Status | Duur | Wat |
|---|---|---|---|
| electron:verhaaltest | FAIL (nieuw) | 18m19s | FAIL: 29 stappen, 10 mislukte checks, 0 NaN-waarschuwingen FAIL all 1420 spots reachable missie-doel luik stage 0 goto "Eerst de kras van de wagon: Tinus kijkt ernaar" (NaN, NaN): geen positie; postgame skutsje Skûtsje-s |

Oorzaak per mislukt item (register in scripts/lib/testoorzaken.mjs):

- `electron:verhaaltest`: oorzaak nog niet onderzocht

<details><summary>Alle items</summary>

| Item | Status | Duur | Opmerking |
|---|---|---|---|
| electron:verhaaltest | FAIL | 18m19s | FAIL: 29 stappen, 10 mislukte checks, 0 NaN-waarschuwingen FAIL all 1420 spots reachable missie-doel luik stage 0 goto " |
| nan-geometrie:verhaaltest | PASS | 0.0s |  |
| console:verhaaltest | PASS | 18m19s |  |
| beeld:verhaaltest | PASS | 0.0s | 59 beelden: 0 zwart/leeg/ongeldig, 0 onleesbaar, 0 wijkt af van vorige run (0 vergeleken) |

</details>

## Wat niemand heeft gezien

Niemand heeft dit rapport of deze beelden met eigen ogen bekeken: een geslaagde beeldcheck zegt alleen dat een beeld niet zwart, leeg of ongeldig is en niet sterk afwijkt van de vorige run, niet dat het er goed uitziet.
