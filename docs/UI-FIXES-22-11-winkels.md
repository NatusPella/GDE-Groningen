# UI-fixes 22-11: winkels, garage en Land en bedrijf

Naslag bij de issues #1232 tot en met #1261 (UI-kritiek, rapport `docs/UI-KRITIEK-22-11-winkels.md` op branch `ui-kritiek-winkels-22-11`). Branch `ui-fix-winkels-22-11`. Bewijs: voor-beelden in `C:\Users\abuis\gde-ui-critic-22-11\`, na-beelden in `C:\Users\abuis\gde-ui-fix-winkels-22-11\` (harnas `scripts/ui_critic/render.mjs`, headless Chrome op eigen PID; zie [UI-KRITIEK-HARNAS-22-11.md](UI-KRITIEK-HARNAS-22-11.md)). Alles is op harnasbeelden en met pure tests gecontroleerd; niets in de echte app of met een controller bekeken.

## Opgelost

| Issue | Oplossing | Bewijs |
|---|---|---|
| #1232 namen afgekapt | `.sm-naam` breekt af op twee regels; een voertuig toont de omschrijving niet in de rij (staat in het detail); de chip is weg bij Kan ik kopen, dus meer breedte | harnasbeeld winkel-voertuigen 720p en 1080p; `winkel_tekst_test` |
| #1235 detail afgesneden | de preview krimpt (flex) en de kaart is compacter (geen grote prijs, geen "Op zak" op de bon); de kaart houdt zijn onderrand | harnasbeeld winkel-voertuigen 1080p |
| #1252 KAN IK KOPEN en prijs 3 tot 4 keer | `toonStatus` in `shoplist.js`: chip alleen bij Te duur, Heb ik al, Op slot; de grote prijs is weg; de bon toont alleen "Na aankoop"; de kaartkop is de afdeling | `winkel_tekst_test`, harnasbeeld |
| #1253 snackbar drievoud | omschrijving zonder "+N gezondheid", het effect alleen als je vol zit, geen losse regel "Gezondheid nu"; de balk blijft | harnasbeeld winkel-snackbar; `winkel_tekst_test` |
| #1255 `{RMB}` | detail via `keyTextHtml` (toetsplaatje), rij via `plainKeyText` (woord) | `winkel_tekst_test` |
| #1233, #1256 bodem als blokletters | `soilMeter` met de DS3-balk (`ds-z-balk`); `soilBar` blijft voor schermlezers en tests | `forsalecard_test` |
| #1234, #1256 Vergunning€450, jargon | spatie tussen label en prijs in `act()`, label "Vergunning kopen", `crowdWord` (Rustig, Gewoon druk, Druk, Erg druk) in plaats van "1,20 (1 is een gewone drukke plek)" | `pitchmap_test`, `forsalecard_test` |
| #1239, #1261 Voertuig, dubbel Afgeschreven, rood | `nameOf` geeft de Escapade zijn naam ook zonder voertuig in de wereld (de oorzaak: `vehicleDisplayName` kende hem dan niet); geen chip meer voor Afgeschreven; geen `ds-z-kaart--probleem` voor een statuslabel | `garage_naam_test`, `garagetoestand_test`, harnasbeeld pauze-garage |
| #1240 lege tabs | de teller toont alleen het aantal eigen voertuigen als dat boven nul is (de tab bleef bestaan: er staat wel iets te koop), met een toegankelijke naam | `garage_naam_test`, harnasbeeld |
| #1241 detail afgesneden | de scrollbalk van de detailkolom en lijst is zichtbaar (DS3, dun) in plaats van verborgen | `pausemenu.css`; scroll zelf niet in een statisch beeld te zien |
| #1242 kale tekst | Toon en Sorteren zijn `ds-z-chip` | `garage_naam_test`, harnasbeeld |
| #1243 tabrijen en koppen | de paneelkop herhaalt de actieve tab en is nu alleen voor schermlezers; eerste subtab heet Werk (niet nog eens Overzicht); de hoofdkaart staat hoger | `boerderijdag_test`, harnasbeeld pauze-boerderij-boerderij |
| #1244 Vandaag dubbel | de regel hoeft het woord niet te herhalen (`replace(/^Vandaag: /, '')`) | `boerderijdag_test` |
| #1245 vier native selects | `cycleChip` en `nextOption` in `bezitui.js`: chips die doorschakelen; ook Product. De keuze van een pand per keten blijft een `select` (lange lijst) | `bezitui_test`, harnasbeeld pauze-boerderij-overzicht |
| #1246 uitleg en kopjes | kopjes in de DS3-kopletter, personeelsregel in een zin, de huurknoppen zijn echte knoppen (geel) | harnasbeeld |
| #1247 Naam toont 50 | tegel heet Reputatie (ook die van Usmem) | `snackui_test` |
| #1248 knoppen lijken uitgeschakeld | `m-bt[data-bz]` en `[data-sn]` als DS3-knop: omlijnd, hoofdacties geel, uitgeschakeld gestippeld met volle kleur; de tripwire contrast gaat van 51 naar 0 in de pauzebladen | harnas-index: contrast 0 |
| #1249 uitleg en dubbele prijs | de prijs staat niet meer als feit naast de knop, Doel heet Route, de uitleg bij Standplaatsen is een zin | `snackui_test` |
| #1250 Snackwagen herhaald | Bedrijven toont `snackVerwijsHtml`; kopen en beheren alleen op het tabblad Snackwagen | `bezitui_test`, `bezitlive_keten_test` |
| #1251 lege staat Te koop | `leegTeKoop(laden)`: "Percelen laden" tegenover "Niets te koop in de buurt" | `bezitui_test` |

## Niet of deels opgelost

- #1236 (harnas: inline-CSS, ui-schaal, ontbrekende schermen): hoort bij branch `ui-kritiek-harnas-22-11`, geen winkelwerk; niet gewijzigd.
- #1237, #1238 (kledingpreviews): lopen op `spullen-kleding-preview-22-11`; niet aangeraakt.
- #1254 (previews en miniaturen): deels. De preview krimpt of groeit mee met de ruimte en de rijen hebben meer breedte, maar de miniaturen per ding zijn nog het categorie-icoon; een eigen render per ding is groter werk.
- #1241: "Te koop per model groeperen met kleurstippen" niet gedaan; alleen de zichtbare scrollbalk.
- #1249: een plaatje of kaartpositie per standplaats ontbreekt nog.
- #1243: de twee tabrijen blijven twee rijen (de binnenste is geen segmentbalk geworden); de banner BOERENZAKDOEK staat er nog. Het stappenlint en de afgesneden hoofdknop (bevinding 10 en 28) zijn niet apart aangepakt.
- #1245: de `select` voor het koppelen van een pand in Ketens is bewust gebleven.
- `scripts/text_audit_test.mjs` faalt op een verouderde allowlist-regel voor `gpudiag.js`; dat zat al in main en is niet van deze branch.

## Samen spelen

Geen nieuwe spelfunctie of regel: alles is lokale weergave in het eigen spel; wat per speler is (snackwagen, #429) blijft zo.
