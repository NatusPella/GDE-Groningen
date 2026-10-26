# Walkthrough — wi-492-vis-tuig (#492)

## Wat er is gedaan

- `game/js/hengeltuig.js` (nieuw, puur): vier hengels, zes aassoorten, lijnsterkte
  (0-1), twee lijnverbeteringen en koop/upgrade-regels. Zonder tuig is het gedrag exact
  het oude: peurhengel, geen aas, lijn 0,5.
- `game/js/hengeltuiglive.js`: eigen opslag `gde-hengeltuig-v1`, veilige standaard,
  vertraagd schrijven en een flush bij `pagehide`.
- `hengelen.js`/`hengelrules.js`: hengel bepaalt de wachttijd, lijn het beetvenster en
  aas de doelsoort; elke worp bij vrij hengelen kost een beet aas. De wedstrijd houdt
  zijn vijf vaste vissen en gebruikt hengel + lijn.
- `shops.js`: hengels, aas en lijn bij de Avondwinkel en de botenverhuur; eigen geld,
  gasten mogen in de Avondwinkel kopen. `visboekui.js` en de HUD noemen hengel/aas/lijn.
- `docs/COOP-GAST.md`, `mechanica.md` en `CHANGELOG.md` bijgewerkt.

## Checks

- `node --check` op alle gewijzigde JS.
- `hengeltuig_test` 13/13, `vis_test` 19/19, `shops_test` 7/7, `shoplist_test` 223/223,
  `coopstatus_test` 11 groepen, `coopgast_test` 13/13, `hud_test` 292/0.
- `loopbaan_balans_test` 9/9, `undef_check` 1732 modules, `import_check` 1883 bestanden,
  `import_cycles_test` 0 cycli, `text_audit` 0 bevindingen.

## Review

- Het laatste beet uit een pak aas werd verbruikt vóór de vis gekozen werd, waardoor die
  worp geen aasinvloed had. De aas-id wordt nu bij de worp vastgelegd en daarna gebruikt.
- De test bewijst nu dat die aas-id echt vóór het verbruik wordt gezet en bij het kiezen
  wordt gebruikt.
- De winkelteksten noemen nu ook de botenverhuur aan de steiger.
- `gde-hengeltuig-v1` staat in de per-speler-opslag van de spec en `COOP-GAST.md`.

## Niet getest

- De winkel, HUD en het hengelen in beeld (geen browser/Electron).
- Een gast in een echte sessie, en de `pagehide`-flush.
- De wedstrijd met een hengel end-to-end (`minigames3_test` skipt zonder provincie).

## Open / volgende

- De treinblokseinen en de vliegroute lopen nog; daarna de per-groep wereldstaat.
