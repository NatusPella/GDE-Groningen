# Kaartpalet: drie kandidaten en de keuze (22-11, #1009)

De eigenaar vond dat het kleurenschema van de kaart minder past bij Design System v3 (crème papier, inkt, bordgroen, geel, misdrukroze). De kaart stond op het
donkere glas. Er zijn drie kandidaten gemaakt, allemaal uit de tokens (`meng()` over `dsKleur`) plus het ene grachtwater (`WATER_BLAUW`, het DS kent geen blauw).
De definities staan in `scripts/lib/kaart_paletten.mjs`; het vergelijkbeeld maak je met `node scripts/kaart_ds3_beeld.mjs <uitmap> paletten huidig,A,B,C`.
Het beeld met voor (donker) en A, B, C op drie schalen (provincie, stad, wijk): `docs/beeld-22-11/kaart-ds3/kandidaten-voor-A-B-C.png`.

| element | A (gekozen) | B | C |
|---|---|---|---|
| land | papier met 35% papier-2 | papier met 50% papier-2 | papier met 45% wit |
| water | 55% grachtwater op papier, rand donkerder | 42%, zachte rand | 72% grachtwater, donkerder dan het groen |
| park, bos, akker | 16/34/10% bordgroen | 20/38/14% | 24/50/14%, lichter land |
| wegen | inkt (hoofd), inkt-zacht, lichter voor straat en pad | alles een toon zachter | alles inkt |
| spoor | inkt met papieren bielzen | inkt-zacht | inkt |
| gebouwen | papier-2 met 50% inkt-zacht | papier-2 met misdrukroze | 50% inkt-zacht, donker |
| kerken | misdrukroze op papier-2 | roze, sterker | roze op inkt |
| labels | inkt, papieren halo | inkt-zacht | inkt |

**Keuze: A.** Leesbaarheid van de markers: elke badge heeft een donkere buitenlijn (3:1 tegen elke ondergrond, gemeten) en op crème wint die altijd;
B is mooier maar de wegen halen alleen net 3:1 en het roze van gebouwen botst met de rode politiemarkers; C is het sterkst voor kleurenblinden maar harder en
past minder bij de papieren schermen. C blijft het alternatief als iemand de kaart met kleurenblindheid slecht leest: het onderscheid zit daar in helderheid.

## Uit, Subtiel, Drukwerk

De Wereldkleur-instelling (Instellingen > Beeld) bepaalt de sterkte van de vlaktinten (`kaartTintSterkte`): uit 1,25 (meer groen en blauw), subtiel 1 (standaard), drukwerk 0,8
(vlakker, lichter, zeefdruk). Papier, inkt en wegen blijven gelijk, dus het contrast klopt bij elke stand (`kaart_ds3_test`). Net als de 3D-wereld werkt een nieuwe stand na een herstart.

## Eén bron

`kaartLand()` in `game/js/kaartkleuren.js` bouwt zowel de grote kaart (`MAP_PALETTE`) als de minikaart (`MINI_PALETTE`); namen op het land gaan door `kaartTekst()` en
`labelHalo()` in `mapstyle.js` (inkt met papieren halo), op beide kaarten. De voorgerenderde provinciepiramide van 21-11 (`zeef-1`) en die van vóór 21-11 worden bij het laden
herkleurd naar het nieuwe palet (`piramideVan`); een nieuwe bouw draagt `zeef-2`. 's Nachts dimt `nightPalette` het papier.

Samen spelen: kaartstijl is lokaal, er gaat niets over het net.
