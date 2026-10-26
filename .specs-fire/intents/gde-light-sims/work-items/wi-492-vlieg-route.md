# #492 Vliegen: een tweede veld als bestemming

- **Issue:** #492
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** wi-492-vlieg-beloning

## Acceptatie

De rondvlucht wordt een route tussen twee velden, niet alleen een rondje boven Eelde.

- `game/vliegplekken.json` levert een tweede veld met een eigen baan; `planeflight.js`
  kan daar landen zonder crash en zonder de eigen strip te verlaten.
- De vluchtdienst (`activities.js`/`arcadeplane.js`) kiest een bestemming uit de
  bestaande velden, toont de route op het bord en betaalt bij een geslaagde landing op
  het tweede veld; terugvliegen is een volgende dienst of een nieuwe etappe.
- De gastheer blijft de dienst doen; een gast kan als passagier mee (bestaande
  passagiersrol). Geen nieuwe beloning per speler; `deel:false` blijft.
- Tests: `vluchtdienst_test` (tweede veld, landing, beloning), `arcadeplane_test`,
  `planecontrol_test`, `luchtverkeer_test`; bestaande tests groen.

## Samen spelen

N (host-werk). De route is van de wereld; een gast ziet de kist en kan als passagier
mee, maar bestuurt niet. Geen gedeelde kas, geen netwerkbericht.

## Niet

Geen autopilot/VOR/ILS/failures/copiloot, geen vracht- of passagiersgewichten, geen
derde veld, geen wijziging aan de vliegschool.
