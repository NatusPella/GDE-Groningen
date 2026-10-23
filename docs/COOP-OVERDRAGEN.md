# Het spel overdragen (#439)

Voor wie aan `coophostwissel.js`, `coophostwisselnet.js`, `coophostwisselui.js` of `coopnet.js` werkt.
Het ontwerp staat als comment op issue #439; dit is wat er nu is en wat er nog moet.

## Onderdelen

| Bestand | Wat |
|---|---|
| `game/js/coophostwissel.js` | Pure basis: de momentopname, de stukken met controlegetal en de twee toestandsmachines (`OudeHost`, `NieuweHost`). Geen netwerk, geen klok. Test: `scripts/coophostwissel_test.mjs`. |
| `game/js/coophostwisselnet.js` | De koppeling: momentopname vullen uit de wereld (`verzamelMomentopname`) en toepassen (`pasMomentopnameToe`), berichten over de bestaande sessies, het wisselen van hub naar gast en terug. De route komt binnen als `deps` (`zetWisselDeps`). Geen DOM. |
| `game/js/coophostwisselui.js` | De echte route (rtcroom, brokers, diagnose) en het scherm (J/N-vraag, pauzemelding). `koppelWissel` wordt aangeroepen door `samenpanel.js`. |
| `game/js/coopnet.js` | Drie kleine haken: `hw-*`-berichten en de tik gaan naar `coophostwisselnet.js`, en `startClient` bewaart de gewenste figuur (`wens`). |
| `scripts/coop/hostwissel_test.mjs` | Integratietest zonder Electron: vier spelers over een geheugentransport. |

## Verloop

1. Wie het spel opende kiest in Spel › Spelers de knop 'Spel overdragen' bij een speler (`biedOver`). Het mag niet in een voertuig, een filmpje of bij een speler die wegvalt. Wie het spel opende staat stil tot er antwoord is.
2. De gekozen speler krijgt de vraag (J of N; 20 s, daarna is het nee). Ja: de anderen krijgen de pauzemelding (`hw-pauze`).
3. De momentopname gaat in stukken van 800 tekens over dezelfde sessie (`hw-bod`, `hw-stuk`); de ander controleert hem (`hw-geladen`).
4. De ander controleert of hij bereikbaar is (`deps.bereikbaar`, dezelfde meting als Diagnose), opent een kamer (`deps.opKamer`) en meldt `hw-draait` met de kamer.
5. Vanaf dit punt is wie het spel opende geen host meer. Hij geeft `hw-verbind` met de kamer aan de rest, wacht tot dat is aangekomen, verlaat zijn hub (`stopCoopNet`) en sluit aan als gast (`deps.verbind`). De nieuwe host verlaat de sessie van de oude, start zijn hub met de momentopname (`startHost`, `pasMomentopnameToe`) en neemt de aansluitende spelers aan.
6. Bij elke fout, weigering, time-out, versieverschil of een speler die wegvalt vóór stap 5 blijft de oude host host: de pauze gaat weg, iedereen houdt zijn sessie en leest 'Jij houdt het spel.'.

## Wat meegaat en wat niet

Mee: tijd van de dag en dag van de kalender, de weermachine, gezocht niveau, de lopende opdracht, kapotte objecten, voertuigen waar spelers in zaten, het zaad en de plek waar het spel stond (de nieuwe host komt daar).
Niet mee: verkeer, voetgangers en dieren (ontstaan opnieuw), ieders geld en voortgang (blijven op het eigen apparaat en in de eigen save), het verhaal van de nieuwe host zelf.
Na de overdracht kunnen plekken en figuren anders zijn: de nieuwe host is plek 0 en wie het spel opende sluit als eerste gast aan (plek 1, Tessa).

## Haken in de wereld (`deps`)

`pasMomentopnameToe` zet zelf: klok, kalenderdag, weer, gezocht, plek van de nieuwe host. Voor wat per spel anders ligt zijn er haken die `main.js` nog moet geven; zonder haak komt er een melding of blijft het gegeven in `world.coopOverdracht`:
`leesOpdracht`/`zetOpdracht` (een lopende opdracht echt hervatten), `leesKapot`/`zetKapot`, `leesVoertuigen`/`zetVoertuigen`, `zetPlek` (verplaatsen met het laden van tegels), `gastGeld`.

## Wat voor echt internet nog nodig is

- De route is getest met een register in het geheugen. `wisselRoute` in `coophostwisselui.js` gebruikt rtcroom, de brokers en STUN zoals de wachtkamer, maar is nooit over echt internet gedraaid. Te doen: twee Electron-instanties (`scripts/coop/testbank.mjs`) en daarna twee computers achter verschillende routers.
- De kamer van de nieuwe host opent één aanbod per speler tegelijk; spelers proberen 12 keer opnieuw (`VERBIND_POGINGEN`). Bij drie of meer gasten achter een trage broker kan het aansluiten langer duren dan de pauze (80 s); meten.
- Alleen de kamercode-route. Met een IP-adres (TCP, `route: 'direct'`) is overdragen uit (`kanOverdragen`): de nieuwe host zou zijn eigen poort moeten openen (UPnP) en een koppelcode doorgeven.
- Lukt het sluiten van de oude host en het aansluiten van een gast niet na `hw-draait`, dan speelt die gast weer in zijn eigen spel (melding); er is nog geen terugval naar de oude host (ontwerp: variant 2, overname bij wegvallen).
- Het scherm (`teken` in `coophostwisselui.js`) en de knop zijn niet in beeld bekeken.
- Opdrachten en filmpjes: de overdracht begint niet tijdens een filmpje; een opdracht hervatten bij de nieuwe host vraagt de haak `zetOpdracht` in `main.js`.
