# Speelgids voor de speeltest met vier (18+)

> Voor de eigenaar en drie vrienden. Kort, in gewoon Nederlands. De verbinding zelf (kamercode, wat getest is, als het niet lukt) staat uitgebreid in [SPEELGIDS-VIER-SPELERS.md](SPEELGIDS-VIER-SPELERS.md); de volledige regels in [SAMEN-SPELEN-HANDLEIDING.md](SAMEN-SPELEN-HANDLEIDING.md). Dit is het spelen zelf. Het spel is 18+.

## Installeren

1. Pak de build van de releasepagina, voor jouw systeem: Windows `GDE-Groningen-<versie>-windows-portable.exe`, macOS `.dmg`, Linux `.AppImage` of `.tar.gz`, Android `-android-debug.apk`.
2. De bestanden zijn niet ondertekend: Windows of macOS kan bij het eerste starten om bevestiging vragen. Dat is te verwachten.
3. **Iedereen dezelfde versie.** Bij een andere versie meldt het spel "Andere versie" en kun je niet meedoen. De versie staat in het hoofdmenu.
4. De eerste keer dat het spel het netwerk wil gebruiken, vraagt Windows om toestemming: kies **Toestaan** voor privé netwerken.

## Samen spelen starten en meedoen

- **Host (één van jullie):** Hoofdmenu, **Samen spelen**, **Een spel openen**, kies een nieuw of opgeslagen spel, **Iemand uitnodigen**, **Kamercode**, lees het toestemmingsscherm en kies **Akkoord**. Stuur de code naar de anderen. Als de spelerslijst iedereen toont: **Spel starten**.
- **Gasten:** Hoofdmenu, **Samen spelen**, **Meedoen**, de kamercode invullen, **Verder**, **Akkoord**. Wacht in de wachtkamer tot de host start.
- **Wie is host?** Wie het spel opende. Het spel en de wereld (tijd, weer, politie) draaien bij de host. Iedereen is verder even belangrijk; de host kan alleen spelers uit het spel zetten.
- **Bijbanen en klussen:** begint iemand een bijbaan, dan vraagt het spel de anderen **Meedoen?** Druk **J** (ja) of **N** (nee). Geen antwoord binnen de tijd is nee: dan kijk je mee en krijg je geen loon. Wie meedoet krijgt de volledige beloning in zijn eigen geld.
- **Wat is gezamenlijk, wat lokaal?** Gezamenlijk: de wereld, de tijd, het verkeer en de politie, de bijbanen waar je aan meedoet, en de spelers zelf (je ziet elkaar). Lokaal, per speler: je geld, je voortgang, je opgeslagen spel, je eigen missies en verhaal, een taxi- of treinrit, de camera en je menu's. Een gast bewaart zijn eigen voortgang.
- **Wie speelt er mee?** Houd **Tab** ingedrukt, of open het pauzemenu (**Esc**) en kies **Spelers**.

## Passive mode en PvP

- Iedereen begint op **passief**: medespelers kunnen je geen schade doen en jij hen niet.
- Schade tussen spelers (PvP) is **alleen aan als beide spelers bewust op actief staan**. Je zet het in het pauzemenu onder **Spelers**, **Passieve stand**. Staat één van jullie op passief, dan vliegt de kogel er dwars doorheen.
- Dood door een medespeler kost niets. Het blijft een spel onder vrienden; buiten PvP is er geen geweld te zien.

## Opnieuw verbinden

Valt je verbinding weg, dan zie je **Verbinding weg**: kies **Opnieuw verbinden**. De rest wacht kort of speelt door; de sessie blijft ruim twee minuten staan. Je komt terug via dezelfde kamercode. Valt de host weg, dan staat de wereld stil; een andere speler kan het spel overnemen, maar dat is nog niet met echte verbindingen geprobeerd. Lukt verbinden niet, lees "Als het niet lukt" in [SPEELGIDS-VIER-SPELERS.md](SPEELGIDS-VIER-SPELERS.md).

## Opening en missies overslaan

- **De opening overslaan:** een nieuw spel begint altijd met de opening. Houd **spatie** ingedrukt (op een controller **A**) tot hij sluit; de hint onderin zegt welke knop. Bij Samen spelen zien jullie hem samen en kan alleen de host hem overslaan. Opnieuw bekijken kan later onder Verhaal, Personages.
- **Een missie overslaan met O:** zit je vast, dan verschijnt onderin "Sla deze missie over, verder met het verhaal" (bij een stap van een missie: "Sla deze stap over"). Druk dan **O**. De knop komt niet meteen: na een mislukte poging of als je een tijd niet verder komt. Daarna gaat het verhaal door, zonder de beloning van die missie.

## Bugs melden

Bij elke bug graag:

1. Een **screenshot** (Windows: Windows-toets + Shift + S) van wat je zag.
2. **Wat deed je** vlak ervoor, in een paar zinnen: waar in de wereld, welke missie of bijbaan, wat je indrukte.
3. Of je **host of gast** was, welke **versie**, hoe laat en welk systeem.
4. Bij een verbindingsprobleem: wat het scherm zei, bijvoorbeeld "Er kwam geen verbinding tot stand".

Stuur het naar de eigenaar, of plaats het in het playtest-issue op GitHub (#116). Eén bug per bericht is het handigst.

## Bekende beperkingen

- Dit is een **testbuild**: niet alles is in beeld bekeken. Van een groot deel van de oudere gesloten bugs is alleen de code en de test gecontroleerd en geen beeld; zie [HERTEST-TRIAGE.md](HERTEST-TRIAGE.md). Je kunt dus oude glitches tegenkomen met wegen, bruggen, camera's of overlappende voorwerpen.
- De verbinding is alleen op **één computer** bewezen. Of jullie routers elkaar vinden (strenge routers, een gedeeld IP-adres van de provider, een hotspot, een VPN) weten we pas als jullie het proberen.
- Er is **geen tekst- of voicechat**; praat via een eigen programma.
- Het overnemen van het spel als de host wegvalt is alleen in code getest.
- Het spel heeft **geen nieuwe muziek**: wat er klinkt is de radio en de bestaande nummers. Wat nog van de eigenaar moet komen staat in [MUZIEK-TE-VRAGEN.md](MUZIEK-TE-VRAGEN.md).
- Een doorloop van het verhaal door de proefspeler (de testbot) staat in [PROEFSPELER.md](PROEFSPELER.md); er is nog geen doorloop van 20-11. Een paar missies zijn niet in beeld doorlopen door een mens (onder meer de landing in Laag over het graan en delen van Geleend van de Friezen).
- Vier spelers op één computer geven ongeveer 20 beelden per seconde; op vier eigen computers is dat per speler gunstiger.
- Het spel is een satire in een verzonnen verhaal: de personages en bedrijven zijn verzonnen, de plekken in Groningen zijn echt.
