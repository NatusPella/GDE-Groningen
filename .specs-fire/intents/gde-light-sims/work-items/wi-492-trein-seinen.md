# #492 Trein: blokseinen op het spoor

- **Issue:** #492
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** wi-492-trein-passagiers

## Acceptatie

De trein krijgt echte blokseinen in plaats van alleen de gescripte rode-sein-storing.

- Nieuwe pure `game/js/blokseinen.js`: per baanvak (tussen twee seinen) of een trein
  bezet is, met een veilige marge en de rijrichting; geen DOM/THREE/klok/opslag.
- `railway.js` levert de bezetting per route/train aan de machinist; `machinistrules.js`
  geeft een rood/groen sein door aan de bestaande `sein`-storing en het bord.
- Een tweede trein op hetzelfde spoor blokkeert het vak; een trein op een ander spoor of
  achter de eigen trein niet. De bestaande gescripte storingen blijven werken.
- Tests: `blokseinen_test` (bezet/vrij, richting, marge, twee treinen), `machinist_test`
  (sein op het bord), `railway`-tests; alle bestaande treintests groen.
- Geen protocolbump, geen nieuwe opslag, geen wijziging aan de conducteur/tickets.

## Samen spelen

N (host-werk). De blokken zijn wereldgedrag van de host; een gast ziet de trein en het
bord via de bestaande snapshot. Geen beloning of gedeelde kas.

## Niet

Geen ATB/ERTMS, geen materieelbeheer, geen rangeersysteem, geen vast dienstrooster in
deze slice (dat is een volgende).
