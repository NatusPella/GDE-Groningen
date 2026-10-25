# #492 Pauzemenu: Over met nieuws, credits en versie

- **Issue:** #492
- **Epic:** #492
- **Complexity:** low
- **Mode:** autopilot
- **Depends on:** wi-492-boot

## Acceptatie

- Het pauzemenu heeft een sectie **Over** in de rail, naast Instellingen en Cheats.
- De sectie toont de versie, de changelog (met "Nieuw sinds je vorige keer") en de credits/het
  privacy- en licentieblok uit `credits.js`.
- Het openen van Over markeert de versie als gezien; bij een volgende start is de changelog
  niet opnieuw "nieuw", maar wel leesbaar.
- De oude startschermflow (QA/trailer) gebruikt dezelfde loader via `over.js`; `loadChangelog`
  bestaat maar op één plek.
- `node --check`, `spelmenu_test`, `startscreen_version_test`, `undef_check`, `import_check`
  en `text_audit` groen.
- In beeld: de tab op een echte pauze. Lukt dat niet in deze worktree (geen gestagede wereld),
  dan staat dat als "nog niet bekeken" in #492.

## Aanpak

`over.js` heeft de changelog-parser en de versie-boekhouding; `pausemenu.js` rendert de tab;
`startscreen.js` importeert dezelfde loader. Geen tweede parser, geen tweede opslagsleutel.

## Samen spelen

De tab is lokaal voor iedere speler (N): nieuws, credits en versie zijn van het apparaat, niet
van de sessie.

## Niet

Geen nieuwe changelog-parser, geen wijziging aan de inhoud van credits of licenties.
