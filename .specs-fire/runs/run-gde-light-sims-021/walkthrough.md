# Walkthrough — wi-492-groep-ui (#492)

## Wat er is gedaan

- Het `missie`-bericht draagt de leider; `coopworld.js` leest hem en oude berichten
  zonder leider blijven werken. Een leiderwissel geeft geen overbodige stapmelding.
- `coopspelers.js`/`coopspelersui.js`: de leider ziet "leidt <label>", deelnemers hun
  groep; de host ziet alle groepen, een gast alleen zijn eigen groep en de leider.
- `mapview.js`/`hud_panel.js`: de eigen groep staat vol en bovenop, andere groepen
  gedempt; de randpijl wijst naar het eigen doel. Tijdens een minigame blijven andere
  groepen van de minimap.
- **Groepen ontstaan pas bij een activiteit**: `coopmissie.begin` eist een deelnemer,
  `coopGroepStart` eist een `activiteit` + deelnemer, en `coopGroepEind` weigert een
  groep waarvan de missie nog loopt. Na het einde verdwijnt de groep en de leider.
- `multiplayer.md` en de changelog bijgewerkt.

## Checks

- `node --check` op de gewijzigde JS.
- `coopmissie_test` 29/29, `coopspelers_test` 9/9, `coopworld_test` 19/19,
  `coopnet_test` 36/36, `spelmenu_test` 244/244, `hud_test` 292/0,
  `coopregressie_test` 462 controles.
- `undef_check` 1730 modules, `import_check` 1875 bestanden, `import_cycles_test` 0 cycli,
  `text_audit` 0 bevindingen.

## Review

- Een leider-only bericht gaf een overbodige "volgende stap"-regel; opgelost.
- `coopGroepEind` op een nog lopende missie kon de groep opnieuw laten ontstaan met de
  host als leider; nu geweigerd.
- Andere groepen stonden op de minimap tijdens een minigame; nu verborgen.

## Niet getest

- De spelerslijst, kaart en minimap in beeld (geen browser/Electron).
- Een echte sessie met twee gelijktijdige groepen; de tests gebruiken een nagebootste
  host/gast.
- Hostwissel: het groepenregister gaat nog niet mee in de momentopname.
- Late join met een door een gast gestarte opdracht is niet in een sessietest gedekt.

## Open / volgende

- De startpaden (missie/bijbaan/wedstrijd) gebruiken de groeps-API nog niet; de opener
  voert verzoeken nog uit.
- Twee gelijktijdige missies/bijbanen vragen de per-groep wereldstaat.
