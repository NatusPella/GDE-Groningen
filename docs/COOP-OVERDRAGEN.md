# Het spel overdragen (#439)

Voor wie aan `coophostwissel.js`, `coophostwisselnet.js`, `coophostwisselui.js` of `coopnet.js` werkt.
Het ontwerp staat als comment op issue #439; dit is wat er nu is en wat er nog moet.

## Onderdelen

| Bestand | Wat |
|---|---|
| `game/js/coophostwissel.js` | Pure basis: de momentopname, de stukken met controlegetal en de twee toestandsmachines (`OudeHost`, `NieuweHost`). Geen netwerk, geen klok. Test: `scripts/coophostwissel_test.mjs`. |
| `game/js/coophostwisselnet.js` | De koppeling: momentopname vullen uit de wereld (`verzamelMomentopname`) en toepassen (`pasMomentopnameToe`), berichten over de bestaande sessies, het wisselen van hub naar gast en terug. De route komt binnen als `deps` (`zetWisselDeps`). Geen DOM. |
| `game/js/coophostwisselui.js` | De echte route (rtcroom, brokers, diagnose) en het scherm (J/N-vraag, pauzemelding). `koppelWissel` wordt aangeroepen door `samenpanel.js`. |
| `game/js/coophostwisselwereld.js` | De haken met de wereld: opdracht hervatten, kapotte objecten, voertuigen, plek, geld per gast. Test: `scripts/coophostwisselwereld_test.mjs`. |
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

`pasMomentopnameToe` zet zelf: klok, kalenderdag, weer, gezocht. De haken met de wereld staan in `game/js/coophostwisselwereld.js` (`wisselWereldHaken`, toegevoegd door `wisselRoute`); zonder haak komt er een melding of blijft het gegeven in `world.coopOverdracht`:
- `leesOpdracht`/`zetOpdracht`: de lopende opdracht (plek in de keten uit `world.mission.index`) opnieuw starten via `missionDebug.start`. De opdracht begint dus weer bij haar start (de tussenstand gaat niet mee) en de nieuwe host staat dan daar; een aparte verplaatsing is dan niet nodig.
- `leesKapot`/`zetKapot`: `brokenKeysAll` (breakables.js) en `breakPropByKey`; een prop die nog niet is ingeladen wordt elke 3 s opnieuw geprobeerd (hoogstens 12 keer).
- `zetVoertuigen`: een voertuig van een speler wordt (als er geen is binnen 3 m) als gewoon voertuig op de plek gezet; het model, de schade en wie erin zat gaan niet mee.
- `zetPlek`: `verplaatsStil` (cheats.js): met de tegels laden en zonder streken-melding.
- `gastGeld`: wat de gast in deze sessie verdiende (`payGuest` houdt `world.coopNet.betaald` bij). Het echte geld staat in de save van de gast en gaat nooit mee.
`main.js` roept `tickCoopNet` nu ook aan als `world.coopWissel` bestaat, zodat de zoektocht naar een host doorloopt als de eigen sessie weg is.

## Terugval bij het aansluiten (variant 1)

Het bod draagt een terugvalkamer (`terug`, een kamercode die `maakKamer` maakt) en `hw-verbind` geeft hem door. Na `hw-draait` heeft iedereen `AANSLUIT_S` (40 s) om bij de kamer van de nieuwe host aan te sluiten; wie het spel opende meldt zich met `hw-aangesloten` zodra hij is binnengekomen. Lukt dat niet, dan opent wie het spel opende de terugvalkamer en neemt het weer over (zijn eigen wereld is nooit veranderd). De nieuwe host ziet na `AANSLUIT_S + 3` s geen `hw-aangesloten`, stuurt zijn gasten met `hw-verbind` naar de terugvalkamer, stopt zijn hub en sluit zelf daar aan. Test: `scripts/coop/hostwissel_test.mjs` (twee terugvallen, en geen terugval als het wel lukt).

## Overname bij wegvallen (variant 2)

- Alleen met een kamercode (niet over een IP-adres) en alleen als er gasten zijn: de herstelmomentopname gaat dan elke 10 s (bij meer dan 3 gasten langzamer, `herstelInterval`) als JSON-gebeurtenissen (`hw-hk`, kop met de lijst van opvolgers, en `hw-hs`, stukken van 800 tekens met controlegetal) naar elke gast. Nieuwe gasten krijgen hem meteen. Groter dan 12 stukken (ca. 9,6 KB) gaat niet mee; een gast met meer dan 12 berichten onderweg slaat een ronde over. PROTO en CODEC_VERSION blijven 2.
- De lijst van opvolgers (`rangschik`): laagste ping (de ping van wie het spel opende naar die gast, in bakken van 20 ms), bij gelijk de laagste plek, met hysterese zodat de nummer één niet bij één meting wisselt. Bij elke opvolger hoort een kamercode die alleen de groep kent (`maakKamer`).
- Een gast neemt het wegvallen aan na `STILTE_S` (12 s) zonder enig bericht (pings tellen mee) en zonder BYE; bij een BYE speelt de gast zoals altijd weer in zijn eigen spel. Hij verlaat dan zijn sessie en start `startZoek`: een lijst van beurten van 30 s. Is het de beurt van de gast zelf, dan opent hij de kamer (eerst de bereikbaarheidscontrole), start de wereld op de herstelmomentopname (`pasMomentopnameToe` met zijn eigen plek in de lijst, eigen klok en weer) en neemt de anderen aan. Anders probeert hij elke 1,5 s bij de kamer van de opvolger van die beurt aan te sluiten. Lukt het niet, dan is de volgende aan de beurt; als niemand het kan, speelt iedereen weer in zijn eigen spel.
- Meldingen: 'Wie het spel opende is weggevallen. X neemt het over. Even wachten.' en 'Jij neemt het over'.
- Bekende randen: (1) lijsten die bij twee gasten verschillen (de host viel weg tijdens het versturen en de nummer één wisselde net) kunnen twee opvolgers geven: dan zijn er twee kamers en splitst de groep; de hysterese maakt dat zeldzaam, het wordt niet hersteld. (2) Een gast die zelf alleen zijn verbinding kwijt is, ziet het ook als wegvallen; de bereikbaarheidscontrole en de beurten maken dat hij alleen in zijn eigen spel eindigt. (3) Komt wie het spel opende binnen de 12 s terug, dan hervat de gast gewoon; daarna niet meer. (4) De ping is de verbinding met wie het spel opende, niet tussen de gasten onderling.

## Wat voor echt internet nog nodig is

- De route is getest met een register in het geheugen. `wisselRoute` in `coophostwisselui.js` gebruikt rtcroom, de brokers en STUN zoals de wachtkamer, maar is nooit over echt internet gedraaid. Te doen: twee Electron-instanties (`scripts/coop/testbank.mjs`) en daarna twee computers achter verschillende routers.
- De kamer van de nieuwe host opent één aanbod per speler tegelijk; spelers proberen 12 keer opnieuw (`VERBIND_POGINGEN`). Bij drie of meer gasten achter een trage broker kan het aansluiten langer duren dan de pauze (80 s); meten.
- Alleen de kamercode-route. Met een IP-adres (TCP, `route: 'direct'`) is overdragen uit (`kanOverdragen`): de nieuwe host zou zijn eigen poort moeten openen (UPnP) en een koppelcode doorgeven.
- Lukt het aansluiten bij de nieuwe host niet na `hw-draait`, dan is er de terugval (zie boven); alleen in de test met een geheugentransport geprobeerd. In `wisselRoute` krijgt `verbind` nu een eigen time-out (`joinRoom` beslist nooit als het misgaat).
- Het scherm (`teken` in `coophostwisselui.js`) en de knop zijn niet in beeld bekeken.
- Opdrachten en filmpjes: de overdracht begint niet tijdens een filmpje; de opdracht zelf begint bij de nieuwe host weer bij haar start. De haken met de wereld (`coophostwisselwereld.js`) zijn niet in het spel zelf gezien: alleen losse functies zijn getest (`scripts/coophostwisselwereld_test.mjs`).
