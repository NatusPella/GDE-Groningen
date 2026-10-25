# #492 Eenmalige hint over Samen spelen

- **Issue:** #492
- **Epic:** #492
- **Complexity:** low
- **Mode:** autopilot
- **Depends on:** wi-492-boot

## Acceptatie

- Na de eerste missie verschijnt één keer een uitlegkaart over Samen spelen, met de route
  via Esc.
- De kaart komt niet tijdens een missie, een bijbaan of een activiteit, en niet als de
  speler al in een sessie zit (`w.coopNet`).
- De kaart staat in de bestaande uitlegrij, wordt één keer per apparaat bewaard en valt
  onder de schakelaar `onboardingTips`.
- `.specs-fire/standards/mechanica.md` noemt vijf kaarten in plaats van vier.
- `node --check`, `undef_check`, `text_audit` en `spelmenu_test` groen.
- In beeld: de kaart op een echte eerste missie. Lukt dat niet in deze worktree (geen
  gestagede wereld), dan staat dat als "nog niet bekeken" in #492.

## Aanpak

Eén les in `LESSONS` in `onboarding.js`, na `tedoen`, met dezelfde `when`-poort als de
eerste-missiekaart en een extra `!w.coopNet`. Geen nieuwe opslagsleutel.

## Samen spelen

De kaart is van de speler (J voor de host, N voor een gast die al in een sessie zit). De
host ziet hem één keer; een gast leert Samen spelen via het paneel zelf.

## Niet

Geen nieuwe tutorialflow, geen extra UI, geen wijziging aan de vier bestaande kaarten.
