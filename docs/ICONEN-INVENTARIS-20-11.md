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

## Stand per scherm

Zie het changelog en de commits met `Refs #985`; deze tabel wordt bijgewerkt met elke commit.

| Scherm | Stand |
|---|---|
| Pauzemenu en hoofdmenu | overgezet |
| Hoofd-HUD | zie commit |
| Kaart en legenda | nog niet |
| Sim-strook | laatst, andere agent |
| Regelkaart, telefoon, winkel, garage, boerderij, toasts, lobby | nog niet |
