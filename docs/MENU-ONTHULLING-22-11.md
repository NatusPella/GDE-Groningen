# Menu-onthulling (22-11)

Aanleiding: wie een nieuwe save begon zag in het pauzemenu meteen Land en bedrijf (boerderij, panden kopen, snackwagen, club) en Voetbal, terwijl het verhaal die dingen pas laat tegenkomen. Besluit eigenaar (21-11): aktes ontgrendelen werelden; bijbanen en loopbanen (voetbal, landbouw en Bezit, de snackwagen Tam & Tes, bedrijven) komen pas via het verhaal. Dit document legt vast wanneer elk menu-onderdeel verschijnt.

## De regel

Een onderdeel dat het verhaal nog niet opende is er niet: geen slotje, geen naam, geen spoiler (keuze: verbergen). De bron is dezelfde poort als overal (`unlockgate.js`, `storyGateProgress`, `worldOpen`): een wereld staat open als de akte is bereikt, het verhaal uit is, of de speler er al aan begonnen is. Daarbovenop telt wat de speler al heeft (een begonnen akker of gekocht perceel, een pand, een gestarte club, de vlaggen `carriere:bezit-start` en `carriere:voetbal-start` van de begincutscenes in `careerdebut.js`): dat toont het onderdeel meteen. Eén module (`game/js/featurereveal.js`, test `scripts/featurereveal_test.mjs`) beantwoordt de vraag voor het menu, de kaart, de activiteitenlijst en de loopbanen; `featurerevealrun.js` is de dunne laag met de wereld (bron, melding).

## Tabel: onderdeel, onthulmoment, wat de speler ervoor ziet

| Onderdeel (menu) | Zichtbaar vanaf | Ervoor |
| --- | --- | --- |
| Spel (Overzicht, Samen spelen, Opslaan & stoppen) | altijd | n.v.t. |
| Verhaal (Opdrachten, Personages) | altijd | n.v.t. |
| Activiteiten | altijd; minigames en evenementen volgen hun eigen plekken | wat bij een wereld hoort (voetbaltraining, snackketen) staat er niet |
| Loopbanen (de vakken) | per vak: de akte van het vak (`unlockgate.js`, CAREER_BY) of begonnen | een dicht vak staat niet in de lijst Vakken; de tour toont een naamloze, dichte stop zonder icoon |
| Loopbanen > Voetbal (de carrière) | akte 4 (`voetbal`, Veendam, Tammo) of een gestarte club | niets; ook de knop "Open je voetbalcarrière" in het vak staat er niet |
| Loopbanen > Visboek | het vak Hengelen (Kapitein Klaas) is open of begonnen | niets; ook de knop "Open je visboek" |
| Kaart | altijd | Percelen en Te koop staan er pas met de akker (zie Land en bedrijf), standplaatsen met de snackwagen |
| Spullen, Garage | altijd | n.v.t. |
| Land en bedrijf (Bezit) | zodra een van de vijf tabbladen open is: akte 2 (Percelen, Tessa), akte 3 (panden) | niets: niet in de rail, niet in zoeken, niet op de kaart |
| Land en bedrijf > Overzicht | zodra een tabblad open is | n.v.t. |
| Land en bedrijf > Boerderij en Percelen | akte 2 (`farm`, Oma Trijntjes recept) of een begonnen akker / gekocht perceel (de begincutscene Landbouw hoort hierbij) | niets |
| Land en bedrijf > Bedrijven en Te koop (panden) | akte 3 (`bezit`, Sjabbe van Pand & Poen) of een eigen pand | niets |
| Land en bedrijf > Snackwagen (Tam & Tes) | akte 5 (`snackwagen`, Tessa) | niets |
| Land en bedrijf > Club | akte 4 (`voetbal`) of een gestarte club (de begincutscene Voetbal hoort hierbij) | niets |
| Veroverd, Prestaties, Foto's | altijd | n.v.t. |
| Instellingen, Samen spelen (Instellingen), Over | altijd | n.v.t. |

Niet verborgen en bewust gelaten: Spel, Verhaal, Activiteiten, Kaart, Spullen, Garage, Veroverd, Prestaties, Foto's en Instellingen. Ze tonen geen verhaalgeheim: Spullen en Garage beginnen leeg, Veroverd en Prestaties tellen op.

## Onthul-melding

Zodra het verhaal (of het begin van de speler) een onderdeel opent, komt er eenmaal per speler een rustige melding via de ene meldingenwachtrij (`notifyqueue.js`, een kaart, nooit tijdens laden of film):

- eerste onderdeel van een sectie: "Nieuw in je menu: Land en bedrijf" (voor Voetbal: "Nieuw in je menu: Voetbal (bij Loopbanen)");
- een tak erbij in een al zichtbare sectie: "Nieuw bij Land en bedrijf: Bedrijven en Te koop";
- alles tegelijk (een sprong in het verhaal): hooguit een melding per sectie.

Het bewijs van wat gemeld is staat in `bezit.x.menuTold` (per speler, in de bezitsopslag; `EXT_KEYS` in `bezit.js`).

## Bestaande saves (migratie, geen savebreuk)

- Een save zonder nieuwe poort (alle saves van voor de poort) is "alles open": alles staat meteen in het menu en `menuTold` wordt stil gevuld, dus geen meldingen.
- Een nieuwe save begint met een lege lijst en een dicht menu; elke akte meldt zijn onderdeel.
- Er wordt niets weggegooid: de opslag van de boerderij, het bezit en de carrière blijft zoals hij is; alleen de weergave wacht. Een opgeslagen voorkeur voor een verborgen tabblad (Land en bedrijf) valt terug op Overzicht van Spel.
- De agent `save-context-22-11` herstelt dat een nieuw spel oude voortgang toont (globale opslag). Deze wijziging raakt die data niet: ze leest alleen.

## Samen spelen

Per speler (#429): `storyWorldOpen` leest de eigen verhaalstand, dus een gast ziet in zijn menu wat hij zelf ontgrendelde; de opener ziet wat hij ontgrendelde. De melding is lokaal, geen netwerkverkeer. Wie wegvalt of later aansluit houdt zijn eigen lijst. Test: `scripts/featurereveal_test.mjs` (twee spelers, eigen stand). Zie ook `docs/COOP-GAST.md`.

## Nog niet gedaan

- Winkels (`shops`): er is nog geen winkel die zaden of panden verkoopt buiten het menu; mocht die komen, dan gebruikt hij `revealOpen('farm')` of `revealOpen('bezit')`.
- De 3D-wereld: markeringen van Bezit (`bezitmarker3d`) en de voetbalvelden in de wereld volgen hun eigen poort (`branchOpen`, `voetbalOpen`); de kaart en het menu volgen nu de onthulregel. Niet in beeld bekeken (geen Electron gedraaid).
