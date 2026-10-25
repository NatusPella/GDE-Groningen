# Testing standards

## Overzicht

Geen testframework. Tests zijn gewone Node-scripts die met `node` draaien en met
exitcode 0 of 1 antwoorden. Dat houdt de game dependency-vrij en de tests leesbaar.
De volledige gids staat in [docs/TESTEN.md](../../docs/TESTEN.md).

## Frameworks en runners

| Soort | Gereedschap | Locatie | Wanneer |
| --- | --- | --- | --- |
| Unittest (pure modules) | `node <script>.mjs` | `scripts/*_test.mjs` | bij elke wijziging aan die module |
| Syntax/modulecheck | `node --check`, `import_check`, `undef_check` | `scripts/test_all.mjs --fase=licht` | vóór elke merge |
| Wereld-audits | eigen scripts | `scripts/world/`, `scripts/*_audit.mjs` | bij wereld-, weg-, water- of propwijzigingen |
| Electron-verhaaltest | `--story-test=<dir>` via `desktop/devtools.js` | `desktop/` | vóór een release |
| Visuele sweep | `scripts/qa/sweep.mjs`, `scripts/qa/cutscene_shots.mjs` | `scripts/qa/` | vóór een release, 's nachts |

Alles in één keer: `node scripts/test_all.mjs --fase=licht|zwaar|electron|alles`
(default `licht`), met een Nederlands rapport en per item de echte duur.

## Wie draait wat

- **Een agent** draait alleen wat bij zijn wijziging hoort: `node --check` op de
  gewijzigde JS plus de paar `*_test.mjs` die die code dekken.
- **De coördinator** draait bij een release de volledige suite, `province_test`,
  de zware audits en de Electron-verhaaltest. Geen agent doet dat zelf, en er
  draait nooit meer dan één Electron-instantie tegelijk.
- Wat niet gedraaid is, heet **niet getest** — nooit "geslaagd".

## Verplichte poorten per wijziging

1. `node --check` op elk gewijzigd JS-bestand.
2. De tests die de gemaakte code dekken (pure regelmodule → eigen `*_test.mjs`).
3. `node scripts/voice_coverage.mjs --quiet` bij nieuwe of gewijzigde spelertekst.
4. `node scripts/text_audit.mjs` bij nieuwe spelertekst (allowlist in
   `scripts/text_audit_allow.json`).
5. `node scripts/import_cycles_test.mjs` als je imports toevoegt of verplaatst.

## Namen en vorm

- Bestandsnaam: `<onderwerp>_test.mjs`, in `scripts/` of naast de bron in
  `scripts/<domein>/`.
- Eén script test één onderwerp, print bij falen de oorzaak en eindigt met een
  niet-nul exitcode.
- Pure modules (geen THREE, geen DOM, geen klok) worden direct geïmporteerd; is er
  THREE of DOM nodig, test dan de pure kern en laat de glue aan de verhaaltest.
- Testdata staat in `scripts/fixtures/` (bijvoorbeeld oude saves per versie).

## Harde regels

- **Nooit naar echte opslag schrijven.** Blokkeer `localStorage` voor
  `gde-save-v1`, `gde-settings` en `gde-prestaties-v1` in elke test.
- **Een synthetische `keydown` krijgt altijd een `keyup`**, anders blijft de invoer
  hangen.
- **Geen echte persoonsgegevens** in fixtures of testdata.
- **Geen netwerk** in tests, behalve de bestaande brokers-/STUN-tests die daarvoor
  zijn bedoeld.
- **NaN-waarschuwingen in geometrie laten de verhaaltest falen**; dat is geen ruis.

## Dekking

Er is geen procentueel doel. Wat dekking moet hebben:

- saves en migraties (`save_migration_test`, `storage_migration_test`),
- het multiplayer-protocol (`protocol`, `Reliable`, sessie- en brokerherstel),
- plaatsing in de wereld (spots, passages, stoelen, vaarnet),
- spelertekst en stemmen (`text_audit`, `voice_coverage`),
- de importgraaf (cycli 0, dode code bekend).

## CI

`.github/workflows/test.yml` draait `scripts/run_tests.mjs` op Linux en Windows bij
elke push. De zware fases en de Electron-verhaaltest draaien lokaal, niet in CI.
