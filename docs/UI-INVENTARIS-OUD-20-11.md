# Inventaris: schermen buiten het menu die nog de oude stijl droegen (20-11)

Opdracht van de eigenaar (20-11): "overal de nieuwe UI". Dit bestand is de lijst van wat buiten de menuschermen (pauze, zijbalk en subtabs, winkel, telefoon en Te doen, kaartpanelen, Samen-hub) nog donker glas, eigen hexkleuren, Bebas Neue of Arial Narrow droeg, en wat ermee gedaan is. De regels staan in [ui-taal.md](../.specs-fire/standards/ui-taal.md) en ADR 0040. Gevonden met `grep` op `rgba(12, 20, 14`, `#0c140e`, `#17301f`, `backdrop-filter` en losse `font-family`.

Oude stijl: donker glas (`rgba(12,20,14,..)`, verlopen naar groen), cream tekst op glas, groene gloed, `Bebas Neue` en `Arial Narrow`.
Nieuwe stijl: papier (`--ds-c-ink-papier`), inkt (`--ds-c-ink-inkt`), bordgroen als kop, één gele hoofdknop, harde schaduw, misdruk alleen op titels en cijfers, Barlow Condensed (`--ds-font-kop-v3`) en Atkinson Hyperlegible (`--ds-font-tekst-v3`), tekst vanaf 13 px.

Status: **omgezet en gezien** (beeld in `docs/beeld-20-11/ui/`), **omgezet, nog niet bekeken** (CSS gelezen en gecontroleerd door de tests, geen beeld), **al zeefdruk** (stond al op het systeem), **blijft** (met reden).

| Bestand | Scherm | Oude stijl | Omzetting | Status |
|---|---|---|---|---|
| `loadscreen.css`, `logo.js` | laadscherm en boot | al papier, raster, gele balk | geen werk nodig | al zeefdruk, gezien: `laadscherm-buurt.png` |
| `startscreen.css` | hoofdmenu (titelscherm), nieuwsvenster | glasverloop over de stad, cream op glas, groene balk | papieren kaart met raster, gele selectie, nieuwsvenster als papier | omgezet, nog niet bekeken (het titelscherm is niet te beelden: de testrun start het spel zelf) |
| `bigmoment.css` | missie geslaagd of mislukt | al zeefdruk | geen werk nodig | al zeefdruk |
| `hud_panel.css` (HUD) | geld, klok, wapen, doel, minimap, prestatietoast, tips | al een zeefdruklaag onderaan | geen werk nodig | al zeefdruk |
| `hud_panel.css` (`#cine`) | filmlaag: titelkaart, naam, chip, overslaan | cream op zwart en glas, Bebas | papieren plaatjes met inktrand, balken in inkt | omgezet en gezien: `cinekaart.png`, `cutscene-ondertitel.png` |
| `hud_panel.css`, `a11y.css`, `banter.js`, `radiosub.js`, `postgame.js` | ondertitels (cutscene, auto, radio, rondvaart) en geluidsondertitels | wit op beeld met schaduw, bij "Ondertitelvak" donker glas | papieren plaatje met inktrand; sprekernaam in bordgroen | omgezet en gezien: `cutscene-ondertitel.png`, `ondertitel-spel.png`; de varianten Ondertitelvak en Hoog contrast niet bekeken |
| `story.js` + `hud_panel.css` | "Sla deze missie over" | groen glas, groene rand | gele hoofdknop met inktrand (CSS verhuisd naar `hud_panel.css`) | omgezet en gezien: `verhaal-overslaan.png` |
| `namecard.js` | naamkaart bij een personage | cream op beeld met schaduw | papieren kaart, naam met misdruk | omgezet, nog niet bekeken |
| `minigamekit.js` | minigamebord, stopvenster | glasverloop, Bebas, Arial Narrow | papier, accent als dikke linkerrand, stopvenster met één gele knop | omgezet en gezien: `bord-discgolf.png`, `bord-stand.png`, `stopvenster.png` |
| `choicepanel.js` | keuzepaneel van tekstklusjes | glasverloop | papier, gele gekozen optie | omgezet en gezien: `keuzepaneel.png` |
| `regelwidget.css` | regelmeters (eierrit e.d.) | al een zeefdruklaag | geen werk nodig | al zeefdruk |
| `uitjepaneel.js` | uitjekaart bij een activiteit | glasverloop | papier met accentrand | omgezet en gezien: `uitjekaart.png` |
| `treincabine.js` | treincabine: bord, uitleg, eindstand | glasverloop, groene rand | papier, hendel met gele actieve stand | omgezet en gezien: `treincabine.png`, `treincabine-eind.png` |
| `reisrit.js`, `reisrit3d.js`, `stationtravel.js` | ritoverlay taxi en trein, rit-HUD, ritbord | `#0f5c30` vlak, cream tekst, `rgba(12,20,14,.62)` | bordgroen vlak, papieren plaat, gele voortgangsbalk | omgezet; treinrit gezien (`rit-trein.png`), taxirit, rit-HUD en ritbord niet bekeken |
| `heliflight.js`, `helirun.js` | helikopter: vluchtkaart en opdracht-HUD | glasverloop, bruin glas | papier met inktrand | omgezet, nog niet bekeken |
| `instrumenten.js` | vliegtuiginstrumenten | glasverloop | papier met inktrand | omgezet, nog niet bekeken |
| `heist.css` | museumklus: panelen, bouwtekening, kaarten, chips | groen glas, radiaal verloop | papieren panelen; de bouwtekening blijft een donker getekend canvas in een inktlijst | omgezet en gezien: `heist-zekering.png`, `heist-slot.png`, `heist-briefje.png`, `heist-chips.png`; de bouwtekening niet bekeken |
| `pigeonmode.js` | duivenmodus-HUD | donker glas | papier met inktrand | omgezet en gezien: `duivenmodus.png` |
| `stunthud.js` | stuntscore en stuntbord | donker glas | papier met inktrand | omgezet en gezien: `stunthud.png` |
| `postgame.js` | paneel van de aflevermissies (blauw glas) | blauw glas, eigen blauwe rand | papier, bordgroene rand | omgezet, nog niet bekeken |
| `dorpsuitjes.js` | minibalk van het dorpsuitje | inline blauw glas | papier met inktrand | omgezet, nog niet bekeken |
| `storycontact.js` | verhaaltelefoon in de HUD | zwart scherm met groene rand | scherm op papier, toestel in inkt | omgezet, nog niet bekeken |
| `wrakduikenlive.js` | duikscène | cream op blauwe waas | papieren naamplaat; de waas blijft een scène-effect | omgezet, nog niet bekeken |
| `touch.js` | aanraakbesturing | doorzichtige donkere cirkels | papieren toetsen met inktrand, gele ingedrukte stand | omgezet, nog niet bekeken |
| `a11y.css` | ondertitelvak, hoog contrast, geluidscaptions | `rgba(12,20,14,..)` | papier met inkt | omgezet, nog niet bekeken |
| `prompts.css`, `hudcards.css` | hints, doelkaarten | al een zeefdruklaag | geen werk nodig | al zeefdruk |

## Blijft (bewust)

| Wat | Reden |
|---|---|
| `#cine .cine-big` (de grote filmtitel) en de inktbalken op het scherm | het is een titel in beeld, geen paneel; hij heeft geen vlak nodig en een band zou lange titels breken |
| Fade-vlakken `#0c140e` (`respawn.js`, `story.js`, `stationtravel.js`, `reisrit3d.js`) | een fade naar zwart is scène-effect, geen oppervlak |
| Tinten van de sfeer (`activiteitensfeer.js`, `carrieresfeer.js`, `TINT_RGBA`) | scène- en vormtint, getest door `activiteitensfeer_test` |
| Canvas- en SVG-tekeningen met `#0c140e` (`activitykit.js`, `helirun.js`, `shops.js`, `sidejobs.js`, `postgame.js`, `heistui.js`, `vliegschool.js`) | tekening of pictogram, geen UI-vlak |
| Pictogramkleuren en identiteitskleuren per minigame | zo afgesproken in `hud_kleuren_test` en DESIGN_SYSTEM.md |
| `aimassist.js`, `profileoverlay.js`, `testmenu.js`, `padtest.js`, `storydev.js`, `storytest.js` | ontwikkel- en meetlagen, geen speler-UI |
| `trailer.js`, `intromontage.js` | opname- en openingsmontage over eigen beeld |

## Aan de andere agent (menuschermen, niet aangeraakt)

`pausemenu*`, `menu.css`, `shopui.css`, `phonefeed.css` (de telefoonkaarten in de HUD, nog donker: `a11y.css` noemt dit al #998, dus telefoon), `spullen.js`, `verhaalui.js`, `kaartactieui.js`, `carrieresfeer.js` (loopbaanbanden), `coopspelersui.js`, `onlineconsent.css`, `saveslots.css`, `samenkeuze.js`, `menumelding.js`, `furniture.js` (tv-overlay).
