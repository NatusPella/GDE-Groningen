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
| Lopen en rennen | ja | Zoals altijd, met de muis draait je camera. Je kunt zo ver van wie het spel opende als de wereld daar geladen is: na 80 m een melding, na 110 m (of meteen bij een sprong) zet het spel je bij de groep. Pauzeert wie het spel opende, dan loop je door. Staat een speler meer dan 150 m van de anderen, dan laadt het spel de wereld en zet het verkeer, voetgangers en dieren ook rond hem (hoogstens acht gebieden samen); dan geldt die grens niet meer en is er geen vaste maximale afstand. Met B kom je weer bij de groep (#429). |
| Winkelen | ja | Winkels met spullen voor jezelf (kleding, kapper, tabak en loterij, avondwinkel, snackbar, woonwarenhuis) en automaten: op je eigen scherm, met je eigen geld; wat je koopt is van jou en gaat in je eigen opgeslagen spel. |
| Eten | ja | Eten en drinken bij een horecaplek en de muurkroket: met je eigen geld en je eigen gezondheid. |
| Voertuigen, boten, helikopters, wapens, tuning en lak kopen | nee | Kan alleen in je eigen spel: ze zouden in de wereld van de ander verschijnen. Bij zo'n winkel zie je "Alleen in je eigen spel" en na E een melding. |
| Bijrijden | ja | De eerste gast (Tessa) stapt zelf in met E als wie het spel opende in een voertuig zit en dicht bij is (ze gaat niet vanzelf mee; ze leest een melding); met E stap je uit (als het voertuig bijna stilstaat, 2 m/s). Blijft ze te ver achter, dan wordt ze na een paar seconden naast de gastheer gezet (`bandMetgezel`); ze wordt nooit vanzelf in het voertuig gezet. De derde en vierde speler (figuren) stappen ook met E in (auto: drie extra plekken, bus: zes; binnen 9 m) en zijn dan niet meer te zien; ze stappen uit onder dezelfde regel, of naast het voertuig als de gastheer uitstapt. Fietsen, scooters en helikopters hebben geen extra plek. Te ver weg (110 m) zet de gastheer een speler na een paar seconden naast zich (`bandFiguren`), nooit vanzelf in het voertuig. |
| Sturen | deels | Met **Y** geeft de bestuurder het stuur aan zijn bijrijder (en neemt het terug); de bijrijder kan met Y om het stuur vragen en het teruggeven. De bestuurder blijft de bestuurder: schade en politie zijn van hem. Alleen auto's, fietsen en boten (geen helikopter of vliegtuig). |
| Zelf een voertuig nemen en ermee rijden | nee | Kan alleen in je eigen spel. |
| Gesprekken met voorbijgangers en personages | nee | Kan alleen in je eigen spel; wat de ander zegt zie je als ondertitel. |
| Bijbanen | nee | Een bijbaan (trekker, taxi, bezorging) start en speelt wie het spel opende: het voertuig zou in zijn wereld verschijnen. Bij zo een plek krijg je "Alleen bij wie het spel opende". |
| Hengelen | ja | Hengelen aan elk water (I) en de wedstrijd in Meerstad (E) draaien op je eigen scherm. De vangst, het visboek, het loopbaanpunt en het geld komen in je eigen spel; er verdwijnt niets uit de wereld van wie het spel opende. Je lichaam blijft staan zolang je hengelt. De anderen zien je (nog) zonder hengel. Vanaf een boot kan het nog niet. |
| Boerderij | deels | Je eigen akker staat in het pauzemenu (Boerderij): het gewas groeit ook terwijl je meespeelt, je kiest gewassen, koopt machines met je eigen geld en zet de akker op je kaart. De klussen op het land (trekker) doe je in je eigen spel: de trekker zou in de wereld van wie het spel opende staan. |
| Minigames | deels | Pannenkoeken bakken en de beiaard speel je zelf, op je eigen scherm. Discgolf, pitch en put, skatepark, kartbaan, zwemmen, klimmen, waterskiën, vliegles, botsautootjes en padel zetten je lichaam of een voertuig in de wereld: die starten bij wie het spel opende, en jij krijgt "Alleen bij wie het spel opende". |
| Missies en het verhaal | deels | Dat speelt wie het spel opende. Bij het begin van een opdracht vraagt het spel "Meedoen?" (J of N, zonder antwoord doe je na 10 s mee): meedoen betekent meelopen en je deel van de beloning in je eigen geld; niet meedoen betekent vrij rondlopen, winkelen, hengelen en boeren, zonder deel (#429). Waar het verhaal jouw rol nodig heeft is meedoen verplicht. |

## Zelf een activiteit doen (#429, #434)

Een gast kiest per opdracht of hij meedoet (J of N). Wie niet meedoet is vrij en kan nu ook zelf iets doen dat de wereld van wie het spel opende niet raakt. De lijst staat in `GAST_ACTIVITEITEN` (`coopgast.js`): hengelen, pannenkoeken bakken en de beiaard. Hoe het werkt:

- `updateGastLokaal` (`coopgastlokaal.js`) draait een lokale activiteit door `updateActivitiesGast` (`activities.js`); E bij een plek start hem (`tryActivityInteractGast`), de I-toets bij het water start vrij hengelen via `tickActivitiesGast`. Bij een andere activiteit (discgolf enzovoort) staat er "Alleen bij wie het spel opende".
- Zolang zo'n activiteit loopt staat het lichaam van de gast bij de host stil: `input.stil` (`input.js`) zet zijn stick en zijn sprong-, ren- en bukknop op nul, en telt per beeld af, zodat het niet blijft hangen. Spatie en de letters voor de minigame komen wel aan.
- De voortgang is van de gast: het visboek en de loopbaan staan in zijn eigen opslag (`gde-visboek-v1`, `gde-loopbaan-v1`), de boerderij in `gde-boerderij-v1`, het geld en de prestaties gaan mee in `saveGuestEarnings` (`GAST_VELDEN`, `coopsave.js`).
- De gast meldt een wisseling als `{ k: 'bezig', a: 'hengelen' | null }`, een gewoon JSON-bericht (geen nieuw formaat; PROTO en CODEC_VERSION blijven 2). Een host die het nog niet kent, slaat het over. De host laat de andere spelers dit nog niet zien: dat (een staande speler met hengel) vraagt een handler in `coopnet.js` en de tekenkant in `hengelanim.js`.
- De boerderij groeit bij een gast in `updateGameplay` (`boerderijTijd`); het sprongetje naar de klok van de host telt niet mee (`boerderijKlokNul`).

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

## Spelers uit elkaar (#429)

Zie `game/js/coopfoci.js`. De gastheer houdt een register bij van de plekken van alle spelers. `bouwFoci` voegt spelers binnen 150 m samen tot een focus en houdt hoogstens `FOCI_MAX` (8) bij; wie er niet meer bij kan krijgt een melding en valt terug op de oude band. Rond elke focus laden de tegels (`tilestore.js` `prefetch`, `foci`; de straal krimpt van 800 m naar 400 m naarmate er meer groepen zijn, `tegelStraal`), en verkeer, voetgangers en dieren delen een totaalbudget van anderhalf keer wat een speler alleen krijgt (`aandeel`). Verhaalmissies, filmpjes, bijbanen en gesprekken blijven bij de gastheer. De band (`bandFiguren`, `bandMetgezel`) zet een speler met een eigen focus niet terug, ook niet als hij ver weg is, ook niet als hij ver weg is (geen vaste maximale afstand). Een sprong van de gastheer haalt iedereen nog bij. Is de tegel onder hem nog niet geladen, dan staat hij stil en wordt hij na 10 s bij de groep gezet. B (bericht `bijgroep`) zet je lichaam naast de gastheer. Het snapshot verdeelt zijn plekken eerlijk over de groepen (`coopworld.js` `groepenVan`). Het formaat verandert niet: PROTO en CODEC_VERSION blijven 2.

**De wereld rond een gast (#434).** Zit er minstens een gast in de sessie, dan loopt `updateGameplay` bij wie het spel opende door achter het pauzemenu, de kaart en de winkel (`coopWereldDoorloop` in `coopnet.js`, `input.blocked` in `input.js`: alleen de eigen invoer staat stil). Een gast bouwt de garages en safehouses ook zelf (`gastTick`, `updateGarages(dt, w, true)`), omdat zijn lichaam bij de host tegen de muren botst. Het begin van de volgende opdracht gaat als entiteit `SOORT_START` (101, id = `ID_START0` + nummer van de opdracht) mee zolang een speler binnen 350 m is. Treinen gaan mee tot 450 m, boten en schepen tellen met hun halve lengte. Boten worden bij de gast gladgestreken (`coopboot.js`). Test: `scripts/coop434_test.mjs`.
## Bewegen, springen, meerijden en wapens (#434)

**Vloeiend bewegen.** `game/js/net/interp.js`. Snapshots komen met 20 Hz; de gast toont de wereld 0,12 s in het verleden en tekent voertuigen, mensen, boten, treinen en de figuren van andere spelers tussen twee snapshots. De weergavetijd loopt zacht mee met aankomstjitter en met het tempo van de klok van de host (een trage host kapt zijn stap af op 0,05 s en loopt dan op 0,75 van de echte tijd), komt er even geen snapshot dan gaat de beweging tot 0,25 s door met de laatste snelheid, en een sprong van meer dan 20 m tussen twee snapshots is een teleport (geen glijden). Met de mogelijkheid `snaptijd` (CAPS) staat de tijd van een snapshot in zijn kop (ms van de sessieklok van de host): dan rekent de gast niet meer met `seq / 20`. Een oudere host zonder die mogelijkheid werkt nog, met de oude tijd.

**Springen en bukken.** Een gast stuurt ze als knoppen in de invoer (bit 2 en 3; Spatie met het stuur blijft de handrem). De gastheer laat het lichaam van de gast springen en bukken (`coopspeler.js` `stapSprong`, dezelfde sprong als `player.js`: ongeveer 0,6 m) en zet hoogte en bukvlag in het snapshot; iedereen ziet het.

**Meerijden.** Wie in een voertuig zit staat in het snapshot met het voertuig (`vehicle`), `driver` en een stoelnummer (`seat`: 0 bestuurder, 1 bijrijder voorin, 2 en hoger achterin). `coopzitten3d.js` zet die speler als echt persoonsmodel op zijn stoel in het voertuigmodel (zelfde stoelen en houdingen als het spel), en een bestuurder op een fiets met de trapbeweging mee.

**Wapen en aanval** van de gastheer staan in het snapshot (`weapon`, `attack`) en bij de gast op de figuur van de gastheer, met dezelfde houdingen als bij voetgangers. Het formaat van het snapshot is niet gewijzigd: de nieuwe velden zitten in bytes die al gereserveerd waren (de drie reservebytes en een vlagbit per speler), een oudere ontvanger slaat ze over. PROTO en CODEC_VERSION blijven 2.

## Niet gedaan

Zelf een voertuig kiezen en besturen, gesprekken met voorbijgangers, bijbanen en de minigames die je lichaam of een voertuig verplaatsen, en het stuur met een controller (Y heeft
geen knop op een pad). Dat blijven aparte wensen.
