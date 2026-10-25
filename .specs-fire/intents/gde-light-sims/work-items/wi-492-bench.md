# #492 Eerste-start-prestatietest en automatische grafische preset

- **Issue:** #492
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** wi-492-boot

## Acceptatie

- Een eerste start zonder save, met de standaardinstellingen en zonder eerder advies, meet ongeveer 3,5 seconden echte frames op het laadscherm.
- De mediaan en de GPU-tier kiezen een preset via `adviseFromSample`; een sterke machine houdt Hoog, een zwakke zakt naar Laag/Gemiddeld/Vlot.
- De keuze wordt één keer opgeslagen; een volgende start slaat de meting over.
- Overslaan met Esc of Spatie start met de huidige instellingen en slaat de meting ook over.
- Een verborgen tab, een testrun (`?storytest`, `?stil`, `?noattract`, `?autoplay`, enz.) of aangepaste graphics slaan de meting over.
- `node --check`, `gfx_profile_test`, `startscreen_version_test`, `undef_check` en `text_audit` groen.
- In beeld: de eerste start met een zwakke en een sterke preset. Lukt dat niet in deze worktree (geen gestagede wereld), dan staat dat als "nog niet bekeken" in #492.

## Aanpak

De meting is glue in `startscreen.js`: elke frame `opts.render` tekenen, de frame-tijden meten en `adviseFromSample` uit `gfxprofile.js` gebruiken. `readAdvice`/`writeAdvice` zijn nu exportbaar; de uitslag gaat onder de bestaande `gfxAdvice`-sleutel, zodat het latere advies niet nog eens langskomt. Geen nieuwe opslagsleutel.

## Samen spelen

De meting gebeurt vóór de wereld en raakt geen sessie of speler (N). Een gast doet de meting op zijn eigen apparaat bij zijn eerste start; de host en gast delen geen graphics.

## Niet

Geen volledige benchmark over alle presets (dat blijft Instellingen > Beeld), geen nieuwe presets, geen wijziging aan de automatische kwaliteit.
