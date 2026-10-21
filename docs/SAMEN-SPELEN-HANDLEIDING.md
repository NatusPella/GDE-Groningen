# Samen spelen: handleiding voor 4 spelers

Voor wie met maximaal vier mensen op vier verschillende computers wil spelen (Windows of macOS, thuis of op kantoor, niet op hetzelfde netwerk).
Je hoeft niets technisch te kunnen. Lukt iets niet, ga dan naar [Als het niet lukt](#als-het-niet-lukt).

## Wat je nodig hebt

- Iedereen **dezelfde versie** van het spel, het liefst de nieuwste. Kijk onder *Over* in het hoofdmenu welke versie je hebt.
- Internet bij iedereen. Een VPN uit te zetten kan helpen.
- Eén persoon die het spel opent (die speelt Tammo, de tweede speler Tessa, de anderen krijgen een eigen figuur) en drie die meedoen.
- Wie het spel opent bepaalt het spel: de wereld, het verhaal, de missies en de tijd van de dag zijn van die speler. Wat de anderen verdienen bewaart het spel in hun eigen spel.

## Stap voor stap

### 1. Alle vier: installeer dezelfde versie

Start het spel. Komt er bij het koppelen "Andere versie", dan hebben jullie niet allemaal dezelfde versie. Installeer allemaal de nieuwste en probeer het opnieuw.

### 2. De speler die het spel opent

1. Kies in het hoofdmenu **Samen spelen** en dan **Een spel openen**.
2. Kies een opgeslagen spel, of een lege plek voor een nieuw spel.
3. Het spel opent in de wachtkamer. Kies **Iemand uitnodigen** en dan **Kamercode**.
4. Lees het toestemmingsscherm en kies **Akkoord en verbinden**. Je IP-adres gaat naar je medespelers; er worden openbare servers gebruikt om elkaar te vinden. Wat daarover gaat is versleuteld met de kamercode.
5. Er verschijnt een **kamercode**. Stuur die naar de drie anderen (bijvoorbeeld in jullie groepsapp). Dezelfde code werkt voor alle drie.
6. Zodra er minstens één speler bij is, kun je **Spel starten**. Wacht tot alle drie er zijn als je met zijn vieren wilt beginnen: de wachtkamer laat zien wie er is.

### 3. De drie die meedoen

1. Kies in het hoofdmenu **Samen spelen** en dan **Meedoen**.
2. Typ of plak de kamercode en kies **Verder**.
3. Lees het toestemmingsscherm en kies **Akkoord en verbinden**.
4. Je komt in de wachtkamer. Wacht tot de speler die het spel opende het start.
5. Kom je er later bij, dan krijg je een eigen figuur; je kunt in de wachtkamer een figuur kiezen.

### 4. De Windows-firewall

De eerste keer dat je een spel opent met het **IP-adres** (niet bij de kamercode) of de eerste keer dat het spel het netwerk gebruikt, kan Windows vragen of "GDE Groningen" het netwerk mag gebruiken. Kies **Toestaan** voor **privé netwerken**. Per ongeluk op Annuleren gedrukt? Zoek in Windows naar *Een app toestaan via Windows Firewall*, zet GDE Groningen aan voor *Privé* en probeer opnieuw. Op een Mac vraagt het systeem om "inkomende verbindingen toe te staan": kies **Sta toe**.

### 5. Tijdens het spelen

- **Wie speelt er mee?** Houd **Tab** ingedrukt voor de lijst met spelers (naam, wat ze doen, verbinding en afstand). In het pauzemenu staat daarvoor het onderdeel **Spelers**, met de roepknoppen *Kom hier*, *Help!* en *Kijk daar* (ook op de toetsen 7, 8 en 9). De lijst staat niet de hele tijd in beeld, zodat de kaart vrij blijft.
- Valt iemand weg, dan pauzeert het spel en staat er wie ontbreekt. Als de verbinding terugkomt, gaat het vanzelf door. Wil de speler die het spel opende niet wachten, dan kiest die **Niet wachten**.
- Wil je stoppen? Kies in het pauzemenu **Samen spelen** en dan **Spel verlaten** (of, voor wie het spel opende, **Iedereen stoppen**). Je komt terug waar je was in je eigen spel.
- Iemand later toevoegen kan altijd: geef de code, tot het maximum van vier spelers.

## Als het niet lukt

Kies in de wachtkamer **Verbinding testen** en dan **Test starten**. Na ongeveer tien seconden staat er in gewone taal wat er mis is en wat je kunt doen. De test neemt contact op met dezelfde openbare servers als de kamercode en stuurt niets van jou mee.

| Wat je ziet | Wat het betekent | Wat je kunt doen |
|---|---|---|
| *Andere versie* | Jullie hebben niet dezelfde versie | Installeer allemaal de nieuwste |
| *Er kwam geen enkel antwoord van de testservers* | Geen internet, of een VPN, firewall of werknetwerk blokkeert het | Zet een VPN uit, probeer de hotspot van je telefoon |
| *Servers voor de kamercode: mis* | De kamercode kan niet worden doorgegeven | Probeer later opnieuw, of gebruik het IP-adres |
| *Streng NAT* (Soort thuisnetwerk) | Je router maakt rechtstreeks verbinden moeilijk | Probeer de hotspot van je telefoon, of laat iemand anders het spel openen |
| *UPnP: let op* | Je router opent geen poort automatisch | Alleen belangrijk voor het IP-adres: zet UPnP aan in je router, of gebruik de kamercode |
| *Geen verbinding met de ander na de kamercode* | Meestal een firewall of streng NAT | Controleer de Windows-firewall (hierboven), probeer een andere speler als opener |
| *De sessie zit al vol* | Er zijn al vier spelers | Eén speler stopt, dan kan een ander meedoen |
| *Geen kamercode, een verkeerde code* | Typfout of de code is verlopen | Vraag een nieuwe code aan de speler die het spel opende; een code verloopt als die speler stopt |

Blijft het mis? Kies na de test **Foutrapport kopiëren** en plak het in een bericht aan degene die het spel beheert, of kies **Logbestand opslaan** (in de app). Het rapport bevat de versie, wat de test vond en het verloop van de verbinding. Er staan geen IP-adressen of codes in.

### Zonder het spel te starten: de snelle controle

Op een computer met de broncode (of voor wie de beheerder het zo wil): `node scripts/coop/preflight.mjs` test in ongeveer tien seconden internet, de openbare servers, UPnP en een vrije poort en schrijft een rapport. Met `--out=rapport.txt` bewaart het dat.

## Checklist voor vrijdag

Doe dit een uur van tevoren, elk voor zich:

- [ ] Dezelfde versie geïnstalleerd (kijk onder *Over*).
- [ ] Spel gestart en de oefenronde of een bestaand spel werkt.
- [ ] Internet stabiel; geen VPN aan; liefst een kabel of goed wifi.
- [ ] **Verbinding testen** gedaan en alles op *Goed* of een begrijpelijk *Let op*. Zo niet, los dat nu op.
- [ ] Windows-firewall: Toestaan voor privé netwerken bij de eerste melding.
- [ ] Wie het spel opent: een opgeslagen spel gekozen, de kamercode gedeeld met drie anderen.
- [ ] Een groepsapp klaar om codes te delen en te melden als iemand wegvalt.
- [ ] Iemand houdt de pauze-uitleg in de gaten: wie weg is staat in beeld.
- [ ] Een plan B: lukt de kamercode niet, probeer dan een andere speler als opener of de hotspot van een telefoon.

## Eerlijk over wat niet getest is

Deze handleiding is geschreven op basis van tests op één computer met meerdere exemplaren van het spel, een nagebootst slecht netwerk (vertraging en pakketverlies) en de echte openbare servers vanaf één internetverbinding. Verbinden tussen vier echte computers op vier verschillende netwerken, via routers van verschillende merken en met verschillende firewalls, is nog niet geprobeerd. De uitkomst van **Verbinding testen** is een indicatie, geen garantie.
