# Verfijnronde 22-11: spullen, wapens, inventaris en winkels

Geen nieuwe functies: wat er al is gladder, duidelijker en veiliger gemaakt. Bron: code, data en tests lezen (geen Electron-run). Samen spelen: wapen in je hand, munitie, eten en Spullen zijn per speler (#429); niets hier raakt het netwerkprotocol of de wereld van de host.

## Wrijving, oplossing, bewijs

| # | Wrijving | Oplossing | Bewijs |
|---|----------|-----------|--------|
| 1 | Spullen: elke hertekening (iets opeten, zoeken, soort kiezen) zette de keuze terug op de eerste tegel (het geld), omdat `zichtbaarSet.has(sel)` op een Set van objecten stond | Vergelijken op sleutel; de gekozen tegel blijft staan | `scripts/spullen_verfijn_test.mjs` (regressie) |
| 2 | Het laatste stuk eten op: de focus sprong naar de bovenste tegel | De buurtegel wordt gekozen en krijgt de focus (`pausemenu.js` spullenApi) | `spullen_verfijn_test.mjs` |
| 3 | Een wapen zonder patronen stond op de tegel zonder teken (geen badge, geen 0) | Badge "Leeg", naam voor de voorlezer "leeg", regel "geen patronen meer" in het detail | `spullen_verfijn_test.mjs`, `spullenmodel` |
| 4 | Een leeg wapen in de hand nemen zei alleen "in de hand" | Melding noemt dat het leeg is en waar munitie is | `spullen_verfijn_test.mjs` |
| 5 | EHBO-doos stond als "Opeten" met "lekker!" | "Gebruiken", eigen melding en eigen geluid | `spullen_verfijn_test.mjs` |
| 6 | HUD toonde "0" bij een leeg wapen | "leeg" (pure regel `weaponAmmoText`, nu ook echt gebruikt) | `scripts/hudmoney_test.mjs`, `spullen_verfijn_test.mjs` |
| 7 | Muiswiel liep ook langs lege wapens (de opmerking zei al "met patronen") | `wielWapens`: lege wapens overgeslagen, het wapen in je hand blijft bereikbaar | `scripts/wapenwissel_test.mjs`, `scripts/ammorules_test.mjs` |
| 8 | Laatste carbidbus of pijl gegooid: lege hand met alleen een klikje | `terugvalWapen`: het volgende wapen met patronen, anders vuisten (vuurwapens blijven in je hand) | `wapenwissel_test.mjs` |
| 9 | Een pak patronen dat nog maar half past kostte de volle prijs en zei "+36" | Echte winst in de tekst ("+10 patronen (past nog)") en een evenredige prijs | `scripts/winkel_wapens_test.mjs` |
| 10 | Pandjeshuis: het wapen in je hand of een grote voorraad ging met één druk weg | Tweede druk met een eerlijke zin; omschrijving noemt "nu in je hand" | `winkel_wapens_test.mjs` |
| 11 | Bevestiging bij verkopen zei "€0. Druk nog een keer om te kopen" | `bevestigRegel`: verkopen met het bedrag, kiezen apart | `scripts/shoplist_test.mjs` |
| 12 | Esc sloot de hele winkel midden in een bevestiging | Eerste Esc trekt de bevestiging in (`escActie`), tweede sluit | `shoplist_test.mjs` |
| 13 | Verlopen bevestiging bleef in de statusbalk staan | De vraag verdwijnt als hij verloopt | `shoplist_test.mjs` (bron) |
| 14 | Dubbelklik of dubbele Enter bevestigde een duur ding in één beweging | `bevestigGeldig`: een tweede druk binnen 350 ms telt niet | `shoplist_test.mjs` |
| 15 | Cijfertoets op een leeg slot deed stil niets | Melding "Niets in slot N" | `wapenwissel_test.mjs` |
| 16 | Een leeg wapen kiezen met het cijfer gaf geen waarschuwing | Eenmalige melding "Dit wapen is leeg" | `wapenwissel_test.mjs` |
| 17 | Wapen wisselen klonk nergens | Klikje `ui_item_equip` bij wiel en cijfertoets, niet bij dezelfde keuze | `wapenwissel_test.mjs` |
| 18 | Verkopen onder 40 euro klonk niet (het geldgeluid begint bij 40) | `shop_sell_bills` bij elke verkoop in het pandjeshuis | `wapenwissel_test.mjs` |
| 19 | Eten in Spullen klonk niet | Snackpapier of tasje, alleen als het echt gebruikt is | `spullen_verfijn_test.mjs` |
| 20 | Het detail van een leeg wapen liet "Bij je" weg | "Bij je: geen patronen meer" | `spullen_verfijn_test.mjs` |

## Bewust niet

- Een "vorig wapen"-toets of wapenwiel met radiaal menu: nieuwe functie.
- Gewicht of draaglimiet: bestaat in dit spel niet (zie kop van `spullenmodel.js`).
- Winkelbrede zoek- of sorteerbalk: nieuwe functie; de lijsten zijn per afdeling kort.
- Alles tegelijk opeten of weggooien buiten eten: weggooien bewust alleen voor eten.
- Evenredige prijs bij de achterkamer-pistool van het pandjeshuis: vaste koopjesprijs, laag risico.

## Alleen in beeld of met een echte speler te beoordelen

- De Leeg-badge op de tegel (kleur, leesbaarheid naast de aantal-badge).
- Het klikje bij wapenwissel tegen de rest van de mix en bij snel scrollen met een trackpad.
- Of 350 ms voor de dubbelklik-bescherming goed voelt op controller en toetsenbord.
- De focusring na het opeten van het laatste stuk.
- Controller: de footer van de winkel is niet opnieuw gelopen; geen pad-run gedaan.

## Pre-existent gezien, niet van deze ronde

- `ds3_ratel_test` meldt `hud_panel.css`: lang 0 naar 1 (niet door deze ronde; geen CSS aangeraakt).
