# Samen spelen: wat een gast mag doen (#291)

Voor wie aan `coopgast.js`, `coopgastlokaal.js`, `companion.js` of `coopnet.js` werkt. De regels staan als data in
`game/js/coopgast.js` (`GAST_REGELS`); deze pagina en `scripts/coopgast_test.mjs` lezen hetzelfde. Over welk spel er gespeeld
wordt en wat er bewaard wordt: [COOP-OPSLAAN.md](COOP-OPSLAAN.md). Test: [COOP-TESTBANK.md](COOP-TESTBANK.md), suite `gastacties`.

## Het uitgangspunt

De wereld, het verhaal, de missies en de voertuigen zijn van wie het spel opende (intern de host). Een gast draait de wereld niet zelf
(`updateGameplay` doet niets zolang `world.coopRole === 'client'`), maar speelt mee. Wat hij zelf doet, doet hij op een van twee manieren:

1. **Op zijn eigen scherm, met zijn eigen geld en spullen** (winkels, automaten, horeca): `coopgastlokaal.js` laat de gast die
   interacties zelf draaien, tegen de vaste kaartgegevens die hij toch al heeft.
2. **Bij de host, op zijn lichaam**: een gebaar (E, Y) gaat als betrouwbaar bericht naar de host, die het lichaam van de gast
   (de metgezel, plek 1) laat in- of uitstappen of het stuur geeft. De gast ziet het gevolg in de snapshots.

Alles wat de wereld van de host buiten zijn lichaam zou veranderen kan niet: een voertuig kopen, praten met een voorbijganger, een bijbaan
starten. De gast krijgt dan een korte melding ("Dat kan alleen in je eigen spel").

## De regels per actie

| Actie | Mag een gast | De regel |
|---|---|---|
| Lopen en rennen | ja | Zoals altijd, met de muis draait je camera. Je kunt zo ver van wie het spel opende als de wereld daar geladen is: na 80 m een melding, na 110 m (of meteen bij een sprong) zet het spel je bij de groep. Pauzeert wie het spel opende, dan loop je door. |
| Winkelen | ja | Winkels met spullen voor jezelf (kleding, kapper, tabak en loterij, avondwinkel, snackbar, woonwarenhuis) en automaten: op je eigen scherm, met je eigen geld; wat je koopt is van jou en gaat in je eigen opgeslagen spel. |
| Eten | ja | Eten en drinken bij een horecaplek en de muurkroket: met je eigen geld en je eigen gezondheid. |
| Voertuigen, boten, helikopters, wapens, tuning en lak kopen | nee | Kan alleen in je eigen spel: ze zouden in de wereld van de ander verschijnen. Bij zo'n winkel zie je "Alleen in je eigen spel" en na E een melding. |
| Bijrijden | ja | De eerste gast (Tessa) stapt zelf in met E als wie het spel opende in een voertuig zit en dicht bij is (ze gaat niet vanzelf mee; ze leest een melding); met E stap je uit (als het voertuig bijna stilstaat, 2 m/s). Blijft ze te ver achter, dan wordt ze na een paar seconden naast de gastheer gezet (`bandMetgezel`); ze wordt nooit vanzelf in het voertuig gezet. De derde en vierde speler (figuren) stappen ook met E in (auto: drie extra plekken, bus: zes; binnen 9 m) en zijn dan niet meer te zien; ze stappen uit onder dezelfde regel, of naast het voertuig als de gastheer uitstapt. Fietsen, scooters en helikopters hebben geen extra plek. Te ver weg (110 m) zet de gastheer een speler na een paar seconden naast zich (`bandFiguren`), nooit vanzelf in het voertuig. |
| Sturen | deels | Met **Y** geeft de bestuurder het stuur aan zijn bijrijder (en neemt het terug); de bijrijder kan met Y om het stuur vragen en het teruggeven. De bestuurder blijft de bestuurder: schade en politie zijn van hem. Alleen auto's, fietsen en boten (geen helikopter of vliegtuig). |
| Zelf een voertuig nemen en ermee rijden | nee | Kan alleen in je eigen spel. |
| Gesprekken met voorbijgangers en personages | nee | Kan alleen in je eigen spel; wat de ander zegt zie je als ondertitel. |
| Bijbanen en minigames | nee | Een bijbaan of minigame start en speelt wie het spel opende; jij kijkt mee. |
| Missies en het verhaal | deels | Dat speelt wie het spel opende; jij loopt mee en krijgt je deel als beloning in je eigen geld. |

## Hoe het werkt

**Winkelen.** In `updateGameplay` (main.js) draait voor een gast alleen `updateGastLokaal`: eerst `tryShopInteract`, `tryMachineInteract`
en `tryHorecaInteract` (dezelfde functies als in een gewoon spel, met de wereld van de gast: zijn geld, zijn gezondheid); pakt geen van drieën
E op, dan gaat E als bericht `gebruik` naar de host. `shops.js` kijkt naar `world.coopRole === 'client'` en `winkelMagVoorGast(type)`.
Zijn positie komt uit de snapshots (zijn lichaam bij de host), de winkels zelf staan in de kaartgegevens van beide kanten.

**Bewaren.** Een aankoop verandert zijn geld, zijn gezondheid en zijn winkelstand. `saveGuestEarnings` (savegame.js) bewaart nu die velden
(`GAST_VELDEN` in `coopsave.js`) in zijn eigen opgeslagen spel (`applyGuestChanges`); zijn verhaal, plek en personage blijven zoals ze waren.

**Bijrijden (E).** Bericht `gebruik` (gast → host, alleen van plek 1). `companion.js` `coopGastGebruik`: zit ze in het voertuig en is het bijna stil,
dan stapt ze uit en loopt ze zelf (`coopUit`, de volg-AI neemt het niet over zolang de host in het voertuig zit); anders stapt ze in als de
host in een voertuig zit met een vrije plek binnen bereik. Een weigering komt als `melding` bij de gast ("Stap uit als het voertuig bijna stilstaat.").

**Het stuur (Y).** `wielGebaar` in `coopnet.js`. De host zet `world.coopWielSlot = 1` en stuurt `wiel`; de gast zet `world.coopWiel`. In
`player.js` `driveVehicle` krijgt het voertuig dan de invoer van de gast (`wielInvoer`: zijn stick en zijn knoppen, bit 1 sprint, bit 2 handrem
= Spatie zolang hij het stuur heeft). Het stuur gaat terug bij Y, bij uitstappen van een van beide en als de verbinding stopt. De bestuurder
(`world.player`) blijft de bestuurder voor alles wat het spel daarmee doet.

**Berichten.** Gast → host: `gebruik`, `wielvraag` (met `terug` om het stuur terug te geven). Host → gast: `wiel` (aan of uit),
`melding` (een korte tekst, alleen voor die gast).

## Niet gedaan

Zelf een voertuig kiezen en besturen, gesprekken met voorbijgangers, bijbanen en minigames meedoen, en het stuur met een controller (Y heeft
geen knop op een pad). Dat blijven aparte wensen.
