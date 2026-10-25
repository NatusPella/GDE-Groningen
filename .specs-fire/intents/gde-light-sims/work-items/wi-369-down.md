# #369 Samen spelen: neer/gepakt-status in de snapshot en voor iedereen zichtbaar

- **Issue:** #369
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** geen

## Acceptatie

Een gast ziet dat de gastheer of Tessa neergeslagen of gepakt is, in plaats van altijd "levend".

- `spelerRecord` in `game/js/coopnet.js` stuurt de echte gezondheid van de host en Tessa mee
  in plaats van de vaste 100; `alive` blijft "dood of gepakt".
- Een neergeslagen speler (ragdoll, niet dood) krijgt een eigen `down`-vlag in de
  snapshot. De vlagbyte van de codec krijgt bit 32; oude lezers negeren die bit en een
  oude zender geeft `false`, dus geen protocolversie-bump en geen wijziging aan `PROTO`.
- `applyHostState` in `game/js/coopclient.js` neemt `health` en `down` over op het lichaam
  en laat de figuur van een neergeslagen speler achterover vallen; bij opstaan staat hij
  weer recht. De Tab-lijst, de marker en de kaart tonen "neergeslagen" (of het bestaande
  equivalent) op basis van `down`, niet van `alive`.
- `meldNeer` reageert ook op een ragdoll. De host krijgt één lokale regel, plek 1 houdt
  zijn eigen "Je bent geraakt…", en plek 2+ hoort "Tessa is neergeslagen" / de host is
  neergeslagen. Eén regel per overgang, niet elke tik.
- Een gast die later aansluit ziet de toestand in de eerstvolgende snapshot, ook zonder
  de melding van de overgang.
- Tests: codec-roundtrip met `health`/`down`, `coopgaten_test` bijgewerkt (de huidige test
  verankert dat een extra speler niet neer is), `partnerhud_test`, en een test met 3
  gasten voor de meldingen. Geen netwerkversie-bump.
- `node --check`, `net_codec_test`, `coopgaten_test`, `partnerhud_test`,
  `coopfiguur_test`, `coopnet_test`, `coopgast_test`, `gasttrein_test`, `undef_check`,
  `import_check`, `import_cycles_test` en `text_audit` groen.

## Samen spelen

J (iedereen ziet dezelfde toestand). De host is de autoriteit; de snapshot is leidend,
de melding is alleen de tekst bij de overgang. Geen beloning, geen opslag, geen gedeelde
kas. Plek 2+ kan zijn eigen neergang al melden via het bestaande `pvpdood`-pad; het
uitbreiden van hun gezondheid in de snapshot is een latere stap en valt buiten deze run.

## Niet

Geen wijziging aan de PvP-schade of -cap, geen nieuw netwerkbericht, geen protocolversie,
geen bloed/gore, geen `world.player`-aannames toevoegen.
