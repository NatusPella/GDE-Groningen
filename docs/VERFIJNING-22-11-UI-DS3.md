# Verfijnronde 22-11: UI en Design System 3

Eigenaarsopdracht: geen nieuwe features, wel verfijnen wat er is (QoL, QA, UX, leesbaarheid). Dit is de stand voor de epic UI en DS3.
Branch `verfijn-ui-ds3-22-11`. Regressietest, fuzz en simulatie: `node scripts/verfijn_ui_ds3_test.mjs` (74 controles).
De ui_critic-tripwires (branch `ui-kritiek-harnas-22-11`) waren in deze worktree niet gemerged en zijn dus niet gedraaid.

## Inventarisatie (wat eerst is nagelopen)

CSS: lettergroottes onder 13 px (geen, op een taxi-opschrift na), animaties boven 250 ms (alleen verblijven en films, behalve de oude `--dur-*`), lussen (alleen de live-stip), focus (overal een zichtbare ring).
Pure UI-logica (a11y, meldingen, HUD-maten, prestatiemoment, toetsplaatjes, grote momenten) met rare invoer (NaN, Infinity, `constructor`, lege tekst, 0 px). Afsluitvraag en foutkaart met een DOM-nabootsing. Een meldingenrij over twee uur spel.

## Verbeteringen

| # | Wrijving | Oplossing | Bewijs |
|---|---|---|---|
| 1 | `--dur-slow` (320 ms) en `--dur-bar` (300 ms) lagen boven de DS3-grens van 250 ms: HUD-balken, wapen-pop, speedometer en teamgenoot schoven te traag | beide op 250 ms in `index.html`, Beweging beperken blijft 0 | verfijn_ui_ds3_test (tokens) |
| 2 | de minimaprand-gloed (2,2 s) telde als "lange animatie" en brak de ds3_ratel op main | als verblijf gemarkeerd (`ds3-dwell`) | ds3_ratel_test 68/68 |
| 3 | een lange menumelding verdween na vaste 4 s, voor je hem kon lezen | duur volgt de tekst (4, 6, 9 of 10 s, de gedeelde klassen), balkje loopt mee | verfijn_ui_ds3_test |
| 4 | korte hexkleur (`#fff`) las het contrast als zwart | `toRgb` verdubbelt de korte schrijfwijze | verfijn_ui_ds3_test |
| 5 | idem in `hudlook.contrast` (NaN) | zelfde herstel | verfijn_ui_ds3_test |
| 6 | een kapotte instelling `constructor` of `toString` gaf een functie als tekstschaal | `textScale` kent alleen eigen sleutels | verfijn_ui_ds3_test |
| 7 | idem: `simulate` (kleurenblind) gooide een fout | alleen eigen sleutels | verfijn_ui_ds3_test |
| 8 | idem: `noticeDuration` met een prototypenaam als klas | alleen eigen sleutels | verfijn_ui_ds3_test |
| 9 | idem: toetsplaatje-label `constructor` werd een glyph | `labelToken` en `keyLabelGlyph` alleen eigen sleutels | verfijn_ui_ds3_test |
| 10 | een venster van 0 px of NaN gaf `--ui: NaN` | `uiScaleFor` valt terug op het ontwerp (1440x900) | verfijn_ui_ds3_test (ook 720p tot 4K bij schaal 0,8 en 2) |
| 11 | `hudEdge` gaf NaN bij een oneindige of kapotte maat | valt terug op de kleinste rand | verfijn_ui_ds3_test |
| 12 | `textPx` gaf NaN, dus mogelijk tekst onder 13 px | blijft minstens 13 px | verfijn_ui_ds3_test |
| 13 | `queueDuration` met NaN liep door in de timer | niet-eindige duur blijft ongewijzigd | verfijn_ui_ds3_test |
| 14 | `shortening` met NaN rest | zelfde | verfijn_ui_ds3_test |
| 15 | `wachtrijPlan(Infinity)` hing de lus op | begrensd en NaN-veilig | verfijn_ui_ds3_test |
| 16 | "Nog NaN prestaties" bij een kapotte teller | valt terug op "Nog 1 prestatie" | verfijn_ui_ds3_test |
| 17 | `queueStep` met NaN koos een rare variant | begint met een volle kaart | verfijn_ui_ds3_test |
| 18 | een bedrag onder een halve euro toonde "− € 0" | lege tekst | verfijn_ui_ds3_test |
| 19 | `toelatenFlits` zonder historie gooide een fout | lege historie | verfijn_ui_ds3_test |
| 20 | de foutkaart toonde "null" bij een lege fout | "Onbekende fout" | verfijn_ui_ds3_test |
| 21 | afsluitvraag: Enter na naast de kaart klikken deed niets (dode toets) | Enter kiest dan de veilige knop Annuleren | verfijn_ui_ds3_test, quitconfirm_test |
| 22 | afsluitvraag: dubbele klik kon de actie twee keer starten | een tweede klik of toets doet niets | verfijn_ui_ds3_test |
| 23 | geen simulatie voor de meldingenrij | twee uur spel met willekeurige aanvoer: nooit twee tegelijk, altijd een gedeelde duurklasse, de rij loopt niet vol | verfijn_ui_ds3_test |

Samen spelen: alles hierboven is lokaal per speler (HUD, menu, instellingen); er is niets gesynchroniseerd of verstuurd.

## Bewust niet

- Het opschrift TAXI (7 px) op het taxitje in de reisrit (`reisrit.js`): de enige tekst onder 13 px; vervangen vraagt een blik op de scène.
- De zoekbalk van de gezochtheid (`.hud-search`) en `.hud-time` animeren nog `width` en `font-size`; omzetten naar `scale` raakt de JS en de lay-out.
- De foutkaart sluit niet met een toets (alleen met de knop): Esc opent het pauzemenu, dus een eigen toets vraagt een besluit.
- De instelling Interfacegrootte gaat tot 1,5; de opdracht noemt 2 (`settings.js`, het ontwerp zelf laat 4 toe). Een besluit voor de eigenaar.
- Grote ratelposten (kleur 66, glas 117, oud 51, font 33, svg 31) zijn een eigen migratie per scherm.

## Alleen in beeld of met een echte speler te bekijken (nog niet bekeken)

- HUD-balken, wapen-pop en speedometer met de nieuwe 250 ms (voelt het strakker?).
- De lange menumelding in het pauzemenu (stapelt het netjes naast een tweede melding?).
- 1280x720 en 4K bij ui-schaal 0,8 en 1,5 met een echt venster (alleen de maten zijn getest, niet het beeld).
- Kleurenblindmodi op de nieuwe kleurberekening met korte hex (alleen de berekening is getest).
