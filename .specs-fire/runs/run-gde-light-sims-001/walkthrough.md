# Walkthrough — wi-492-boot (#492)

## Wat er is gedaan

- Het normale spel start zonder hoofdmenu. Met een save laadt de save met de nieuwste
  opslagtijd (`pickLatest`); zonder save begint het verhaal meteen en wordt een plek
  aangemaakt.
- De oude startschermflow blijft alleen voor QA, trailer en attract, achter `?menu` of
  de bestaande testvlaggen. `repl_boot.mjs` zet `?menu=1` bij het herladen.
- Een andere save laden bewaart eerst de huidige voortgang. De save waarin deze tab
  schrijft toont "Huidig spel" en is niet opnieuw te laden; een gast ziet zijn eigen
  gebonden plek.
- Bij een kapotte of nieuwere save, of als de lijst niet geschreven kan worden, valt de
  boot terug op het oude save scherm in plaats van stil een verkeerde save te laden.
- Het eerste frame wordt getekend voordat het laadscherm weggaat; de menu-shots worden
  vrijgegeven. De prewarm leest de laatste save.
- "Naar het hoofdmenu" heet nu "Spel herstarten" (het spel slaat op en start opnieuw).
- ADR `0015-een-ingang-geen-hoofdmenu.md`, de woordenlijst, speeltest, playtestplan,
  samen-spelen-handleiding en de coop-docs zijn bijgewerkt.

## Checks

- `node --check` op de gewijzigde JS en `scripts/trailer/repl_boot.mjs`.
- `saveslots_test` 71/71; `save_migration_test` 1299/1299; `alleenspelen_test` 17/17;
  `spelmenu_test` 243/243; `menuplekken_test` 107/107; `devflags_test` 1047/1047;
  `startscreen_version_test` 3/3; `coopboot_test` 8/8; `undef_check` 1705 modules;
  `import_check` 1857 bestanden; `text_audit` 0 bevindingen.
- `test_all --fase=licht`: 407 geslaagd, 3 mislukt. `text_audit` is daarna opgelost;
  `vehicle_zfight_test` faalt omdat deze worktree geen gestagede wereld heeft
  (`cd desktop && npm run stage`), niet door deze wijziging.

## Niet getest

- `runBootScreen` in beeld: eerste start zonder save, start met een save, de
  laadscherm- en camera-overgang, en de zwarte-flits na het eerste frame. Deze worktree
  heeft geen `game/world/`.
- Twee vensters op één profiel en de "Huidig spel"-kaart in de praktijk.
- De `?menu`-route in een echte Electron-run.

## Open / volgende

- `wi-492-bench`: eerste-start-prestatietest en automatische preset.
- `wi-492-over`: nieuws, credits en versie naar het pauzemenu.
- `wi-492-samen`: laden tijdens een sessie als groepsbeslissing; nu weigert de code het
  nog (`COOP_LADEN_TEKST`).
