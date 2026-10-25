# #492 Bootflow: geen hoofdmenu, laatste save, minimaal laadscherm

- **Issue:** #492
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** geen

## Acceptatie

Het normale spelen start zonder hoofdmenu:

- Een save: de save met de nieuwste **opslagtijd** wordt geladen, ook als een andere plek actief was.
- Geen save: het verhaal begint meteen en er wordt een save aangemaakt.
- De oude `#start-screen` is verborgen; het bestaande `#loading` blijft het minimale laadscherm.
- QA-harnassen die het oude menu nodig hebben, gebruiken `?menu`; `window.__menuStart` blijft in die menuflow.
- De QA-, trailer- en attractpaden (`?menu`, `--trailer`, `--preview`, `--attract`, `--benchmark`, `--storytest`, `--noattract`) houden de oude menuflow.
- Een andere save laden bewaart eerst de huidige voortgang; mislukt dat, dan wordt er niet geladen.
- `node --check`, `saveslots_test`, `save_migration_test`, `alleenspelen_test`, `menuplekken_test` groen.
- In beeld: eerste start zonder save en een start met een save. Lukt dat niet in deze worktree (geen gestagede wereld), dan staat dat als "nog niet bekeken" in #492.

## Aanpak

Volg AGENTS.md en docs/SPECS-FIRE.md: eigen worktree/branch, kleine commits met `Refs #492`, alleen de tests van dit gebied, geen push/merge/tag/release. De pure keuze (welke save) staat in `saveslots.pickLatest`; `startscreen.js` is de glue.

## Samen spelen

Het laden van een andere save is wereldgedrag van de host (J). Een gast laadt zijn eigen save alleen door de sessie te verlaten; de host die een andere save laadt, vraagt de gasten om akkoord en beëindigt anders de sessie. Dat laatste is een bestaand netwerkpunt (#434/#486) en wordt in `wi-492-samen` afgemaakt; deze run legt de regel vast en test de savekeuze.

## Niet

Geen prestatiebenchmark, geen verhuizing van nieuws/credits, geen nieuwe co-op-instap. Dat zijn `wi-492-bench`, `wi-492-over` en `wi-492-samen`.
