# #492 Pauzemenu: savebeheer, nieuw spel en stoppen

- **Issue:** #492
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** wi-492-boot

## Acceptatie

Het savebeheer staat er al (plekken, hernoemen, kopiëren, exporteren, importeren, verwijderen,
autosave: `saveslotsui.js`, `saveslots.js`, `savegame.js`). Wat ontbreekt is de sessie eromheen: nieuw spel en verwijderen zeggen "stop eerst de sessie".

### Slice 1: nieuw spel
- Nu: `pausemenu.js:1276-1279` en `saveslotsui.js:279` blokkeren met `COOP_NIEUW_TEKST`
  (`savegame.js:437`); de speler moet zelf naar het paneel Samen spelen.
- Wordt: bevestiging met `coopLoadTekst(world, 'Een nieuw spel')`, dan `stopCoopNet` → bewaren
  → `startNewSlot()` (`savegame.js:173`) → herladen; een mislukte stap start niets
  (`scripts/coopladen_test.mjs:115`, nu nog "nieuw spel geblokkeerd").

### Slice 2: actief spel verwijderen
- Nu: `saveslotsui.js:365-368` weigert met `COOP_WISSEN_TEKST` (`savegame.js:438`), ook voor
  een gast die zijn eigen save wil opruimen. Wordt: dezelfde bevestiging en volgorde.
- Toets: `scripts/coopladen_test.mjs` (broncheck), `scripts/saveslots_test.mjs` groen.

### Slice 3: stoppen
- Nu: `pausemenu.js:1246-1253` bewaart en herlaadt of sluit, zonder `stopCoopNet`; de anderen
  zien een weggevallen verbinding in plaats van `{ k: 'weg', reden: 'spel gestopt' }`.
- Wordt: eerst `stopCoopNet(world)` (`coopnet.js:1557`), dan bewaren, dan herladen of sluiten.
  Toets: `scripts/coopladen_test.mjs` (volgorde), `spelmenu_test` en `alleenspelen_test` groen.

## Samen spelen

Alleen stoppen raakt een ander: de host beëindigt de sessie voor iedereen, een gast verlaat
hem en de rest speelt door (`cooploadrules.js:6-11`). Wie stopt, stopt.

## Niet

Geen nieuwe opslagsleutel, geen extra plek, geen gedeelde kas, geen tweede bevestigingsstijl
(één `data-coop-load-confirm`-blok) en geen opruimactie voor de saves van anderen.
