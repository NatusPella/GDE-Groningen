# Iconeninventaris 20-11 (Phosphor, ADR 0041)

Gemeten met een grep door `game/js` op de stand van 20-11. Doel: alle iconen via `game/js/icons.js` (`icoon('betekenis')`), met Phosphor als bron.

## Aantallen

- 95 inline `<svg>`-literals in 47 bestanden van `game/js/*.js` (zwaartepunt: `hud_panel.js` 10, `achievementsui.js` 5, `regelwidget.js` 4, `pausemenu.js` 4, `garageui.js` 4, `missionicons.js` 4).
- Eigen icoonbestanden met tekenfuncties of padtabellen: `mapicons.js`, `mapglyphs.js`, `achievementicons.js`, `missionicons.js`, `shopicon.js`, `shopicons.js`, `golficons.js`.
- Emoji en unicode-symbolen als icoon: verspreid over ongeveer 50 bestanden, vooral in `shops.js`, `shopui.js`, `lobbyui.js`, `sidejob_paneel.js`, `garages.js`, `coop*.js`.
- De sim-strook (`simhud.js`, `simicoon.js`) wordt door een andere agent herwerkt en wordt als laatste aangeraakt.

## Soorten iconen en de aanpak

| Soort | Plek | Aanpak |
|---|---|---|
| Menu-iconen (lijn, 24 px) | `pausemenu.js` (`ICONS`, `GROUP_ICONS`), hoofdmenu (`startscreen.js` via `menuIcon`) | **Gedaan:** ICONS wijst naar betekenisnamen; CSS-lijnregels worden door de inline stijl van `icoon()` genegeerd |
| Pijlen en chevrons | `pausemenu.js` (`CHEV_L`, `CHEV_R`), garage, winkel | per scherm, met `pijl_*`, `terug`, `volgende` |
| HUD-chips en -icoontjes | `hud_panel.js` (voertuig, GPS-pijl, missie, nu-spelend, aangeschoten) | via `icoon()` waar het een betekenis is; wapensilhouetten en toerentalmeter blijven tekeningen |
| Kaartglyphs op de kaart | `mapglyphs.js`, `mapicons.js` (canvas) | later: canvas tekent geen SVG-string; de plek krijgt een Path2D uit `iconInner()` |
| Winkel, garage, boerderij | `shopui.js`, `shopicons.js`, `garageui.js`, `farmhud.js` | per scherm |
| Telefoon, Te doen, regelkaart | `phonefeed.js`, `todoui.js`, `regelwidget.js` | per scherm |
| Lobby en Samen spelen | `lobbyui.js`, `samenhubui.js`, `coop*ui.js` | per scherm; emoji vervangen |
| Prestaties en missies | `achievementicons.js`, `missionicons.js` | tekeningen per prestatie blijven eerst staan |

## Stand per scherm (laatste commit van deze ronde)

| Scherm | Stand |
|---|---|
| Pauzemenu en hoofdmenu (ICONS, kopjes, pijlen) | overgezet |
| Hoofd-HUD: voertuig, route-afslag, doel, muziek, aangeschoten | overgezet |
| Hoofd-HUD: wanted-sterren (vol of raster, vorm draagt de betekenis), wapensilhouetten, toerentalmeter, portret | blijven eigen tekening |
| Kaart: zoekveld, in-, uitzoomen, naar jezelf, acties bij een plek | overgezet |
| Kaart: de 15 schijf-glyphs op het canvas (`mapglyphs.js`, Path2D uit `iconInner()`, met de eigen tekening als terugval in node) en het stuurkruis | overgezet |
| Kaart: overige markeringen (`mapicons.js` tekent afbeeldingen per categorie) | nog niet |
| Te doen (`todoui.js`), winkelchips, garage (chips, slot, plek, zoeken), Samen-hub-chips | overgezet |
| Telefoon (`phonefeed.js`) | overgezet |
| Prestaties (`achievementsui.js`) en bedieningsplaatjes (`prompts.js`, zes van de dertien) | overgezet; de rest blijft eigen tekening |
| Lobby (favoriet, vinkje) en boerderijmenu | overgezet |
| Sim-strook (`simhud.js`, `simicoon.js`) | bestaat nog niet in deze tak; de andere agent koppelt via `icoon('hoogte')` enzovoort |
| HUD-kaarten (`hudcards.js`: missie, bijbaan, geld, politie, gevaar, prestatie, tip) | overgezet; missie- en kalenderkaarten houden hun eigen tekening |
| Mobiele overlays (`touch.js`, 35 van de ca. 80 knoplabels via `PH_TOUCH`) | overgezet; de rest houdt de eigen tekening |
| Regelkaart (`regelwidget.js`): de iconen worden met CSS-vulkleuren per toestand ingekleurd (ok, let, breekt) en zijn eigen tekeningen (kliko, zout, meel) | bewust nog niet |
| Boerderij-HUD (`farmstatus.js`, `farmcards.js`): de groeistadia zijn eigen tekeningen, Phosphor heeft geen stadia | bewust nog niet |
| Wapensilhouetten, toerentalmeter, wanted-sterren (vol of raster draagt de betekenis), garage-silhouetten, missie- en prestatietekeningen, toasts van prestaties | blijven eigen tekening |
