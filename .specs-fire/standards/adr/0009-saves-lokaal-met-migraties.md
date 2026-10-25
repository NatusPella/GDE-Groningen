# 0009 - Saves lokaal, met migraties en zonder account

- **Status:** besloten
- **Datum:** 2026-10-19 (vastgelegd 2026-10-25)
- **Spec:** `.specs-fire/standards/constitution.md` en `coding-standards.md`

## Context

Het spel heeft geen server: de wereld is data en de voortgang staat op de machine
van de speler. Tegelijk mag een save nooit stukgaan, ook niet als de vorm verandert
— en de vorm verandert vaak, want het spel is in ontwikkeling.

## Besluit

Opslag in `localStorage` onder `gde-*`-sleutels (`gde-save-v1`, `gde-settings`,
`gde-prestaties-v1`, `gde-loopbaan-v1`, …), met een versienummer en een migratie in
`savemigrate.js`. Oude of kapotte data levert een geldig leeg profiel op, geen
crash. Oude `gte-*`-sleutels worden gemigreerd.

## Afgewezen

- **IndexedDB.** Meer ruimte en async, maar complexer, en de save is klein genoeg
  voor localStorage.
- **Een server of account.** Accounts betekenen persoonsgegevens, een privacyverhaal
  en kosten; het spel werkt offline en dat is een eigenschap, geen beperking.
- **Eén blob zonder versie.** Dan breekt elke vormwijziging de save van iedereen die
  het spel al speelde.

## Gevolgen

Een vormwijziging vereist een migratie plus een fixture in
`scripts/fixtures/saves/` en een test. Tests blokkeren de echte sleutels, zodat een
testrun nooit iemands save raakt. Een levenslang profiel (loopbaan, visboek,
boerderij, prestaties) staat in zijn eigen sleutel, nooit in de savegame.
