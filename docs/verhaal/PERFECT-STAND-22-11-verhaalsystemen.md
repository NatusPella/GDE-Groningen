# PERFECT-STAND 22-11: verhaalsystemen

Scope: ontgrendelpoort (`unlockgate.js`, `storyGateProgress`), snackwagen (Tam & Tes) en Bezit met de verhaalvlaggen, voetbalcarrière-integratie, bijbanen en loopbanen via het verhaal, reputatie (#1135), Jelle (`rival.js`, `jellebaas.js`), moeilijkheid en balans, Samen-regels, opslag en migratie. Epic: #1121.
Nieuw: `scripts/verhaal_systemen_audit.mjs` (83 controles, 0 fout, 1 info) loopt over alle 69 stappen, 6 aktes, 23 poortwerelden en 7 wagenvlaggen.

## Wat de audit controleert

| Groep | Controleert | Controles |
|---|---|---|
| A structuur | unieke stap-id's, aktes lopen vooruit, elke akte heeft een stap, alles gebouwd, overgangsscènes en aliassen wijzen naar bestaande stappen | 12 |
| B bereikbaar | de keten loopt zonder lus van M00 naar de nazomer, elke stap precies een keer, vanaf elke stand is de volgende stap de eerstvolgende | 5 |
| C poort | monotone ontgrendeling, elke wereld gaat open, een nieuw spel begint dicht, elk doel dat een loopbaan nodig heeft (trein, padel, kermis, bietenoogst) staat open op zijn eigen stap, elk vak komt in een stap voor | 13 |
| D vlaggen | elke gelezen vlag wordt ergens gezet, mijlpalen kloppen met hun akte, romantiekkeuzes vallen voor de scène die erop wacht | 12 |
| E beloning | elke missie hoort bij precies een stap (geen dubbele uitbetaling), toegevoegde stappen geven geen geld | 7 |
| F Bezit en wagen | tak, wereld en akte lopen gelijk, snackfasen volgen de mijlpalen, Tam & Tes pas bij M22 (akte 5), voetbalstappen in de voetbalakte | 17 |
| G Jelle | per akte een offerte en handlanger, zes streken per akte, deterministisch | 7 |
| H migratie | save zonder poort leest als alles open, de poort groeit alleen, een oude save zonder toegevoegde stappen blijft doorgaan, nooit terug en nooit vast | 10 |

## Gedaan en gefixt

| Wat | Stand |
|---|---|
| Deadlockcontrole poortvolgorde en vlaggen over alle aktes | gedaan, geen deadlock gevonden |
| Jelle na het einde van het verhaal: `bezitlive.js storyPartNow` gaf `null` (c.end), dus zijn teruggetrokken offerte uit de nazomer ("mijn moeder zei dat de eierbal de beste was") en de akteregel kwamen nooit in beeld | gefixt: na het einde levert hij de laatste akte |
| Een dichte Bezit-tak zei "gaat open in akte 3" (aktenummers verdwenen uit het menu, #912) | gefixt: noemt het hoofdstuk ("Aan de Eems"); `bezit_test` en `bezitui_test` bijgewerkt |
| Snackwagen-hint in de poort hield een aktenummer ("In akte 5 ontdekt Tessa de wagen") | gefixt: zin ingekort, geen nummer |
| Samen-regel voor poort, wagenmijlpalen, reputatie en Jelle | toegevoegd in `docs/COOP-GAST.md` |
| Wagenmijlpalen, snackfasen, voetbalpoort, reputatie (eigen sleutel, niet in de savegame), moeilijkheid (alleen inkomsten, begrensd) | gecontroleerd, in orde |
| Oude saves: `v:1` en `v:2`, een save zonder poort of met `legacy` houdt alles open; de poort schrijft nooit minder | gecontroleerd en in de audit vastgelegd |

## Open en besluiten

- Een bijbaan of loopbaan kan nog steeds op zijn eigen startplek beginnen, zonder het verhaal (alleen het Loopbaan-scherm is gedimd en geeft de hint). Dat volgt de bestaande afspraak in `storyarc_nieuw.js` ("geen slot"). De startplek dimmen vraagt een hook in `sidejobs.js` en beeld; niet gedaan. Besluit nodig als de eigenaar het harder wil.
- De wagen en `snack`-tak: de tak gaat open bij de eerste stap van akte 5 (F1), de naam Tam & Tes pas bij M22. Dat is bedoeld ("pas laat"), maar de speler kan tussen F1 en M22 de tak al openen zonder wagenbelettering.
- Jelles `kop`-offerte en handlangerregels van akte 1 tot en met 4 zien alleen spelers met een oude save of via dev, omdat de snacktak pas in akte 5 opengaat. Geen fout; de tekst is bewust nog bewaard.
- Introducerend personage 'Berend' (golf) staat niet als sprekersnaam in de verhaaldata (C4, informatief).
- Niet bekeken: beeld en gehoor van poort-hints, menu's en de Bezit-schermen; geen Electron gedraaid. `akte3_test`, `storyflow_nieuw_test` en andere tests met wereldgegevens zijn niet gedraaid in deze worktree.
- Niet in deze scope en niet aangeraakt: teksten, TTS (`voice_wacht`), props en cutscenes.
