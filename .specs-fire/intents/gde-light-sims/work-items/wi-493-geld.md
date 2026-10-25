# #493 Geldcurve fase 1: mildere start, flitswaarschuwing en hoger startbudget

- **Issue:** #493
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** geen

## Acceptatie

De eerste twee speeluren lopen niet stuk op geld. Concreet:

- Eén bron voor het startbudget in `economy.js`; new game, wereld en save-herstel gebruiken hem. €250 → €500.
- Flitsboete €20-45 → €10-25; marge 25 → 35 km/h.
- Eerste overtreding per camera is een waarschuwing, daarna pas een boete.
- Het bericht noemt waarschuwing of boete, de gereden snelheid en de limiet.
- Geld gaat nooit onder nul.
- Pure regelmodule `flitspaalrules.js` met de keuze (geen/waarschuwing/boete) en `scripts/flitspaal_test.mjs`.
- `node --check`, `flitspaal_test`, `wanted_balance_test` en `loopbaan_balans_test` groen.
- In het spel: één camera op te hoge snelheid → waarschuwing; nog eens → boete. Lukt dat niet in beeld, dan staat dat als "nog niet bekeken" in #493.

## Aanpak

Volg AGENTS.md en docs/SPECS-FIRE.md: eigen worktree/branch, kleine commits met `Refs #493`, alleen de tests van dit gebied, geen push/merge/tag/release. De regelmodule is puur (geen THREE, DOM of klok); `flitspaal.js` blijft de glue.

## Samen spelen

De camera's en de waarschuwing zijn wereldgedrag van de host (J). De boete raakt de eigen speler; een gast in de hostwereld ziet de waarschuwing maar betaalt nog niet, omdat zijn kas op zijn eigen apparaat staat. Dat bestaande gat wordt in golf 2 gedicht met de gast-economie. De test legt vast dat de host-boete niet dubbel bij een gast terechtkomt.

## Niet

Geen nieuwe flitspalen, geen extra boetesoorten, geen hervorming van alle bijbaanlonen. Dat is een volgend work item.
