# Live bussen als USP (#922, #395): stand 21-11

> Naslag bij de issues #395 (live buslocaties) en #922 (live bussen als USP). De regels van de bron staan in `game/js/livebussen.js` en `game/js/buslive.js`; de presentatie in
> `game/js/busbron.js`, `game/js/busmap.js` en `game/js/busmelding.js`. Wijkt dit af van de code, dan is dit document de fout. Constitutie punt 4 (AGENTS.md): openbare gegevens alleen OPHALEN,
> met een uitzetter in Instellingen en een terugval op de eigen dienst (goedgekeurd door de eigenaar op 24-10).

## Wat er was (gecontroleerd op de code van 21-11)

| Onderdeel | Stand |
|---|---|
| Bron | open GTFS-Realtime-feed van OVapi (`https://gtfs.ovapi.nl/nl/vehiclePositions.pb`), alleen GET, protobuf, ca. 0,5 MB, het gebied rond Groningen |
| Opvraag | `haalLiveBussen`: vaste url, `credentials: 'omit'`, `referrerPolicy: 'no-referrer'`, geen cookies, geen id, geen querystring; time-out 8 s, maximaal 3 MB, hooguit 300 voertuigen; faalt zacht (netwerk, time-out, status, te-groot, ongeldig, leeg) |
| Electron | het main-proces doet de opvraag (`desktop/livebussen.cjs`, `gde:live-bussen`, zonder argumenten); het web doet hem direct |
| Ritme | één opvraag per minuut, bij fouten verdubbelend tot 10 minuten; een lege feed is geen fout |
| Uitzetter | Instellingen, `liveBussen`, standaard aan; uit of een test-/devrun betekent geen opvraag |
| Koppelen | een voertuig wordt aan een eigen lijn gekoppeld op plek en rijrichting; de lijnnummers van de feed komen niet in beeld, wel de verzonnen lijnnaam van het spel |
| Wereld | een live bus vervangt een dienstbus binnen bereik (`vehicle/buspop.js`); stapt de speler in, dan raakt hij los van de live data; geen willekeurige bussen meer zonder dienst |
| Kaart | alleen live bussen (`liveBusMarks`) met lijn en "Live bus" |

## Wat er nu bij is (21-11)

1. **Live of Rooster, in woorden.** `busbron.js` (puur) maakt uit de stand van de bron en de instelling één van drie soorten: `live`, `rooster` (de terugval) of `uit`. Elke
   terugval heeft een rustige zin zonder foutcode ("de bron is niet bereikbaar", "er zijn nu geen bussen gemeld", "de gegevens zijn te oud"). Gegevens ouder dan 180 s (zelfde
   grens als de bron) tellen niet meer als live.
2. **De kaart toont de bron.** Een live bus staat op de grote kaart en de minikaart met lijn, richting (naar het eindpunt van de lijn, alleen als de data namen heeft) en de leeftijd
   van de positie ("Live bus · positie 14 s geleden"). Alleen **zonder** live gegevens tonen de kaarten de bussen van het spel zelf, als **Rooster** (grijsgroene bus met een klokje, in
   plaats van de rode live-stip, en het woord "Rooster (eigen dienst)" in de regel). Met live gegevens staan er alleen echte bussen op de kaart, geen verzonnen erbij. De bron staat
   nooit alleen in een kleur of stip: er staat altijd een woord. De legenda heeft rijen voor "Live bus" en "Rooster".
3. **Een rustige melding bij de eerste live bus.** Komt er een live bus binnen 300 m, dan staat er één keer per apparaat een melding op de HUD: "Live bus: lijn 3 rijdt hier nu echt,
   richting ...". Valt de bron daarna weg, dan staat er één keer per sessie "Live bussen even niet beschikbaar: de bussen rijden het rooster." (`busmelding.js`, de onthouding is de
   bestaande uitlegsleutel `gde-sim-uitleg-v1`, alleen dit apparaat, geen savegame).
4. **Caching en backoff.** De laatste goede stand blijft staan tot hij 180 s oud is (daarna Rooster). Elk interval krijgt ±15% spreiding, zodat niet alle spelers op dezelfde seconde
   bij de bron aankloppen. Een 429 of 503 geeft meteen de lange rust (10 minuten); andere fouten verdubbelen het wachten per fout tot dat maximum. De opvraag wordt vanuit het verkeerslot van
   de bevolking aangeroepen en beslist zelf of hij mag; nooit in test- of devruns.
5. **Privacy.** Er gaat niets van de speler mee: geen id, naam, opslagsleutel, cookie, account, taal of browsergegevens; alleen de vaste url en neutrale kopregels. `busbron_test`
   controleert de opvraagopties en dat de bronbestanden niets van de speler lezen. De uitzetter in Instellingen vermeldt nu ook dat de terugval als Rooster gemarkeerd staat.

## Samen spelen

Elke speler heeft zijn eigen opvraag en zijn eigen kaart; de wereld van de host rekent de bussen in de wereld (zoals eerst: de host bezit de verkeerspopulatie). Een gast ziet op zijn
kaart de live bussen uit zijn eigen opvraag. De Rooster-markers lezen de dienst van een bus (`busRun`) en die zit niet in de snapshot van de host, dus een gast ziet die waarschijnlijk niet (niet nagekeken). De melding bij de eerste live bus is per apparaat. Valt iemand weg,
dan verandert er niets voor de anderen. Niet gezien met twee instanties.

## Niet gedaan

- **Vertraging per bus.** De feed met voertuigposities heeft geen vertraging; die staat in de aparte TripUpdates-feed van dezelfde bron. Dat is een tweede opvraag (en een grote) en is
  hier niet gebouwd. In plaats daarvan staat de leeftijd van de positie op de kaart (eerlijk: hoe vers de data is). Open vraag aan de eigenaar: tweede feed ja of nee.
- **Bus-tab of lijnkeuze in de bijbaan "bus".** De bijbaan rijdt de verzonnen stadsbuslus lijn 3 met eigen haltes en dienstregeling; een lijnkeuze past daar niet zonder de lus te
  veranderen, en de bijbaan heeft geen tabblad-mechanisme. De bron is wel zichtbaar op de kaart en in de legenda. Voorstel voor later: een "Live lijnen in de buurt" in de
  startkaart van de bijbaan.
- **Beeld.** Niets is in het spel bekeken: de kaartmarkers, de melding en de legenda zijn alleen met pure tests en een syntaxiscontrole gecontroleerd.
- `livebus_map_test` kon in deze werkmap niet draaien (three is er niet gevendord); de gewijzigde asserts zijn wel nagelopen met `busbron_test`.

## Tests

`node scripts/busbron_test.mjs` (stand, labels, melder, privacy, markers en tekenaar), `node scripts/livebussen_test.mjs` (opvraag, backoff, spreiding, 429),
`node scripts/livebus_map_test.mjs` (alleen met gevendorde three).
