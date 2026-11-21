# UI-fixes 21-11 (#1053 tot #1058): voor en na

Build: `origin/main` (d2f451a18) plus de commits van branch `ui-fix-21-11`, gestaged met de wereld uit de hoofdmap, echte Electron
(`--no-sandbox --in-process-gpu`), wegwerpprofiel, vaste klok 13:00. Alleen door een agent bekeken; niets door een mens gespeeld.
De "voor"-beelden zijn de referentiebeelden van de beeldronde (lokaal in `agent-a9a1cb8bcc4a260bf/docs/beeld-21-11/beeldronde`, niet gekopieerd);
alleen bij Usquert is een eigen "voor"-beeld gemaakt, op de ongewijzigde build.

| Issue | Na (deze map) | Voor (beeldronde) | Uitkomst |
|---|---|---|---|
| #1053 duivenmodus | `na-80-duivenspot-ver-1920`, `na-81-duivenspot-dichtbij-1920`, `na-m5-duivenspot-stap0-1920`, `na-m5-duivenspot-stap0-1280` | `missies2/m5-duivenspot-stap0-1920` | kaarten en pijl overlappen niet meer, naamplaten klein en op elkaar afgestemd, toetsen alleen in de balk onderaan |
| #1058 heli-ronde | `na-m3-heli-stap0-1920`, `na-m3-heli-stap0-1280` | `missies3/m3-heli-rooster-stap0-1920` | missiekaart onder het paneel |
| #1054 reisopties | `na-61-kaart-reisopties-1920` | `hud3/61-kaart-reisopties-taxi-beschikbaar-1920` | kaart binnen het scherm met scroll; in dit beeld staat het paneel Lagen open (door de scene) en ligt dus over de kaart, de knop Lagen zelf is vrij |
| #1055 Loopbanen | `na-04-loopbanen-1920` | `menu/04-escape-loopbanen-1920` | Nu starten volledig in beeld (plakt onderaan), vinkje rechtsonder |
| #1056 penaltyserie | `na-x1-penalty-1920` | `wereld2/x1-penalty-uitleg-1920` | "0 VAN 5 DOELPUNTEN", stappen eronder |
| #1057 Usquert | `voor-usquert-camera-in-de-kerk-1920`, `na-usquert-45m-naast-de-kerk-1920` | `wereld/w17-wereldkleur-k2-ommeland-1920` | zie hieronder |
| Kleine punten | `na-01-spel-overzicht-1920`, `na-30-samen-keuze-1920` | `menu/01-...`, `menu/30-...` | geen losse kop bij Spel, geen getal bij Verhaal, Samen-spelen-kader past |

## Usquert (#1057)

Niet opgelost in het spel, wel gediagnosticeerd. De zwarte zuilen en de brede schaduw verschijnen alleen als de camera in het midden van de kerkkit van
de Petrus en Pauluskerk staat (2769.7, -20431.3): de QA-plek van de beeldronde was precies dat punt (`voor-usquert-camera-in-de-kerk-1920`).
45 m ernaast staat de kerk er normaal (`na-usquert-45m-naast-de-kerk-1920`; ook vanaf de grond ziet de kerk er goed uit). De QA-plekken
(`beeldronde_wereld.page.js` set kleur, `wereldkleur_beeld.mjs` plek 6) staan nu 45 m ernaast. Daarnaast negeert `metres()` in `landmarkkit.js` een hoogtetag
buiten 1 tot 150 m (dat gaf een toren van 3300 m; de data van Usquert heeft zo'n tag niet, dus dit is voorkomend, geen bewezen oorzaak), met `landmark_kerk_schaal_test.mjs`.
Niet nagegaan: of een speler te voet het midden van een kerkkit kan bereiken.

## Wat niet (opnieuw) is gedaan of gezien

- 1280x720: alleen duivenspot en heli in beeld; Loopbanen, reisopties, Spel en Samen spelen alleen op 1920x1080.
- De lobby- en gastbeelden van Samen spelen (31, 32, 34 tot 37) zijn met de bestaande mock opnieuw gemaakt (lokaal in `_uifix`, niet in git); alleen 30 staat hier.
- Beelden 80 en 81 en de duivenspot op 1280 (eerste run) toonden een foutmelding ("Cannot read properties of undefined (reading 'opdracht')", op 1280 "idx.inWater is not a function"):
  die kwam niet voor in de run van de missiescene (1920) en lijkt van de scene-volgorde (samen-mock vóór de duif) te komen; niet uitgezocht.
- Op 1280x720 overlapt de afstand "40 m" in de routekaart van de gewone HUD de titel van die kaart: bestond al, niet van deze wijziging.
- De routekaart en doelregel van de gewone HUD zelf zijn niet aangepast; de stapel past zich eraan aan.
