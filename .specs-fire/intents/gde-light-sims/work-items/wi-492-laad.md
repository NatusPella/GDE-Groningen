# #492 Laden tijdens een sessie: bevestigen en de sessie beëindigen

- **Issue:** #492
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** wi-492-boot

## Acceptatie

- Kiest een speler in een sessie een ander opgeslagen spel, dan opent een bevestiging in
  plaats van de oude blokkade.
- De host leest dat de sessie voor iedereen eindigt; een gast leest dat hij de sessie
  verlaat en de anderen doorspelen.
- Bevestigen: `stopCoopNet`, de huidige voortgang bewaren, dan het gekozen spel laden.
  Annuleren: niets verandert.
- De eigen actieve save van de host toont "Huidig spel" en opent geen bevestiging.
- `node --check`, `coopladen_test`, `spelmenu_test`, `undef_check`,
  `import_cycles_test` en `text_audit` groen.
- In beeld: de bevestiging op een echte sessie. Lukt dat niet in deze worktree (geen
  gestagede wereld), dan staat dat als "nog niet bekeken" in #492.

## Aanpak

`savegame.js` blijft `applySave`/`loadSlot` weigeren zolang `world.coopNet` bestaat;
`saveslotsui.js` stopt de sessie eerst met `stopCoopNet` en laadt daarna. Geen nieuwe
opslagsleutel en geen wijziging aan het netwerkprotocol.

## Samen spelen

J: de initiator bevestigt, de sessie eindigt en de andere spelers gaan terug naar hun
eigen save. Dit is de veilige fase 1; een stemming onder de gasten in plaats van een
loskoppeling volgt in `wi-492-samen`.

## Niet

Geen naadloos herladen met reconnect, geen groepsstemming, geen gedeelde kas.
