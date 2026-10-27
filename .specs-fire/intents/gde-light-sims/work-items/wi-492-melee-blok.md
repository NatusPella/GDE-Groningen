# #492 Melee: blokkeren met gewicht

- **Issue:** #492
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** wi-492-melee-combo

## Acceptatie

Melee krijgt de GTA IV-laag na de reeks: blokkeren.

- Nieuwe pure `game/js/blockregels.js`: blok maximaal 2 s, 0,35 s herstel, melee-schade
  ×0,20, kogels ongewijzigd, en een geblokkeerde PvP-slag geeft 20% van de wapenschade
  (onder de bestaande cap van 60). Geen DOM/THREE/klok/opslag.
- Rechtermuisknop blokkeert zolang je een melee-wapen vasthoudt; met een vuurwapen blijft
  rechts richten. Blokkeren werkt voor de host en de gast via dezelfde `meleeHit`/
  `pvpSlag`-weg.
- Een geblokkeerde slag geeft een korte terugslag en een eigen geluid; geen bloed.
- Tests: `blockregels_test`, `coopwapen_test` (gast blokkeert), `cooppvp_test`
  (geblokkeerde PvP-slag), `gamefeel_test`; bestaande gevechtstests groen.

## Samen spelen

J. De host rekent de slag uit, ook als een gast blokkeert; de gast ziet de terugslag.
Geen nieuwe beloning, geen gedeelde kas en geen protocolbump.

## Niet

Geen ontwijken/rollen, geen nieuwe wapens, geen PvP-herbalans, geen bloed.
