# Contextuele minimap (24-11)

Wens van de eigenaar: "binnen een voetbalwedstrijd zou de mini-map het veld moeten tonen in plaats van de wereld, bij padel ook, en bij karten alleen het circuit."

## Mechanisme (één, geen minimap per activiteit)

- `game/js/localmap.js` (puur): een register. Een activiteit meldt zich één keer aan met `registerLocalMap(id, (world) => beschrijving | null)`.
- De minimap (`hud_panel.js drawMinimap`) vraagt elke tekenbeurt `activeLocalMap(world)`. Geeft die iets, dan tekent `localmapdraw.js` die plek; anders de wereldkaart. Er is geen vlag die kan blijven hangen: eindigt de activiteit op welke manier ook (afbreken, sterven, verbinding weg, laden, host-wissel), dan geeft de aanmelder `null` en staat de wereldkaart er meteen weer. De volledige kaart (M) leest dit register niet.
- De beschrijving: vak (`cx, cy, ax, hw, hh` in wereldmeters), `up` (de wereldhoek die omhoog wijst), `paint(g, res)` (vaste laag, één keer op een eigen canvas), `dots` (vooraf gemaakte stippen, per beurt bijgewerkt, geen allocatie).
- `localmapvelden.js` (puur): de bouwers voor voetbal, padel en kartbaan. Elke activiteit heeft in zijn eigen bestand maar een korte aanmelding (voetbal.js, padel.js, kartbaan.js); de voetbal-HUD is niet aangeraakt.

## Draaiing (gekozen)

Sportgames houden de kaart stil. Voetbal en padel: de eigen aanvalsrichting wijst omhoog (zoals de wedstrijdcamera kijkt); in een derby heeft team 1 het veld omgekeerd; een park dat gedraaid in de wereld ligt wordt recht gezet. Karten: noord boven en stil, want een circuit leer je als vorm kennen. Wisselt de oriëntatie (bijvoorbeeld bij een andere speler) dan draait de kaart met dezelfde easing als de wereldkaart (direct bij Beweging beperken).

## Schetsen

```
 voetbal            padel               karten
 +---------+        +---------+         +-----------+
 |  [doel] |        | | net-- |         |  ___      |
 | +-----+ |        | +-----+ |         | /   \__   |
 | | gebd| |        | | :   | |         ||  S/F |  |
 | +--o--+ |  o     | |-----| |         | \____/    |
 |----O----|        | |  o  | |         |  jij,  o  |
 | +-----+ |        | | ^   | |         +-----------+
 | | ^ jij |        | +-----+ |
 +---------+        +---------+
```

Stippen: jouw ploeg een schijf, de andere ploeg een ruit (kleur is nooit het enige verschil), de keeper een maatje groter met een inktpunt, de bal wit, jij een pijl in de groene kring zoals op de wereldkaart. Spelers dragen de clubkleuren van de wedstrijd.

## Stijl (DS3)

Papier (`MINI.meadow`) rondom, het speelvlak in `ink-bord` (padel: het donkere waterblauw van de minimap), crème lijnen, inkt voor randen, doelen en net. Stippen hebben een inktrand en een crème rand. Geen nieuwe kleuren of lettertypes; alleen de clubkleuren komen van de club.

## Prestaties

De vaste laag staat eenmalig op een eigen canvas (opnieuw bij een andere sleutel of een echt andere schaal); per beeld alleen die laag neerleggen en de stippen tekenen. Geen allocaties per beeld (de stippenlijsten zijn vooraf gemaakt).

## Samen spelen

Elke speler ziet zijn eigen lokale kaart met zijn mede- en tegenspelers, uit de bestaande wedstrijdstanden (host: de sim; gast: de spiegel uit de momentopnamen). Geen nieuw protocol. Een gast die niet meedoet heeft geen wedstrijd en ziet dus de wereldkaart. Wie wegvalt wordt door de computer vervangen en blijft een stip.

## Test

`node scripts/localmap_test.mjs`: transformatie, bijsnijden, draaiing, passende schaal, begin en einde van de context (de wereldkaart komt terug na elke eindsoort), bronchecks (aanmelding, geen M-kaart), en de bouwers.

## Niet gedaan

Penalty, training, skatepark, discgolf, pitch-and-putt, zwembad en klimtoren: het mechanisme is er (`registerLocalMap`), de bouwers nog niet.
