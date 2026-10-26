# Walkthrough — wi-492-vlieg-route (#492)

## Wat er is gedaan

- `game/js/arcadeplane.js`: de vluchtdienst kiest een bestemming (vanaf Eelde het
  dichtstbijzijnde andere veld, vanaf een veld terug naar Eelde), bouwt de route met twee
  poorten en markeert overvliegen als `gemist` (geen medaille, geen beloning).
- `game/js/planeflight.js`: de gemeten velden en hun banen komen uit
  `game/vliegplekken.json`; landen kan op de eigen strip, de lesstrip of een gemeten veld.
  Een les zonder baan (`planeStrip === null`) blijft crashen.
- `game/js/activities.js`: de startplek is het veld waar de Kist staat, het bord en de
  toren gebruiken de echte van/naar-namen; de beloning blijft `deel:false`.
- `game/js/coopstatus.js`/`minigamekit.js`: de vluchtdienst is `deels` (passagier), het
  bord heet niet langer "Rondvlucht Eelde".
- `CHANGELOG.md` bijgewerkt.

## Checks

- `node --check` op alle gewijzigde JS.
- `arcadeplane_test`, `planecontrol_test`, `vluchtdienst_test`, `luchtverkeer_test`,
  `vliegschool_test` 166 controles, `simdienst_test`, `coopstatus_test` 11 groepen.
- `undef_check` 1732 modules, `import_check` 1883 bestanden, `import_cycles_test` 0 cycli,
  `text_audit` 0 bevindingen.

## Review

- `opBaan` viel terug op de gemeten velden terwijl een les bewust `planeStrip = null`
  zet; daardoor landde een ringen-/slalomles zacht in plaats van te crashen. Null betekent
  nu echt geen baan; de vliegschool blijft ongewijzigd.
- Het bord heette nog "Rondvlucht Eelde"; nu "Vlucht" met de echte bestemming.
- De vluchtdienst heeft een `deels`-status met uitleg.

## Niet getest

- De vlucht en de landing op het tweede veld in beeld (geen browser/Electron).
- De fetch van `vliegplekken.json` vóór de eerste start in de verpakte build.
- Of een mens gemakkelijk goud haalt; de poorten zijn nog niet getuned.

## Open / volgende

- De treinblokseinen-review loopt nog; daarna de per-groep wereldstaat.
