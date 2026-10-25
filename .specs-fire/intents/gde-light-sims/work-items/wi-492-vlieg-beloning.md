# #492 Vluchtdienst: beloning en ATC-parodie

- **Issue:** #492
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** geen

## Acceptatie

De rondvlucht bij Eelde levert geld en voelt als een dienst met een toren.

- De bestaande `VLUCHTDIENST` in `game/js/activities.js` betaalt bij een geslaagde
  rondvlucht via `loopbaanVerdien('lucht', …)`; een afgebroken of mislukte vlucht betaalt
  niets. De beloning schaalt met de medaille (bijv. €18/€28/€40) en blijft onder de
  eenmalige vliegschoolmedailles (€25-60), zodat herhalen niet de beste geldbron wordt.
- Nieuwe pure module `game/js/luchtverkeer.js`: per dienst één departure- en één
  approach-regel, deterministisch per veld, zonder radio, invoer of netwerk. De regels
  staan als bordrij in de bestaande dienst-UI (dezelfde vorm als de andere bordregels).
- De rondvlucht blijft host-only; een gast ziet de kist maar kan niet vliegen. Geen
  nieuwe beloningssplitsing en geen netwerkbericht.
- Nieuwe test `scripts/luchtverkeer_test.mjs` (determinisme, één departure/approach,
  onbekend veld) en `scripts/vluchtdienst_test.mjs` uitgebreid met geld/xp bij goud,
  zilver, brons en een afgebroken vlucht.
- `node --check`, `vluchtdienst_test`, `luchtverkeer_test`, `arcadeplane_test`,
  `planecontrol_test`, `undef_check`, `import_check`, `import_cycles_test` en
  `text_audit` groen.

## Samen spelen

N (host-werk): de vluchtdienst is van de host; een gast kan niet besturen. De beloning
gaat naar de host via de bestaande `loopbaanVerdien`-haak; geen gedeelde kas, geen
netwerkbericht. Het bestaande gastgat voor diensten hoort bij #365/#371.

## Niet

Geen tweede veld als bestemming, geen vracht/passagiers aan boord, geen autopilot,
VOR/ILS, failures of copiloot, geen wijziging aan de vliegschool.
