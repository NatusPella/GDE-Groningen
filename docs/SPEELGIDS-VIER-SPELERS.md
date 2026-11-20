# Samen spelen met vier: korte speelgids

> Naslag. De regels staan in de canonieke spec [.specs-fire/standards/multiplayer.md](../.specs-fire/standards/multiplayer.md); de volledige handleiding is [SAMEN-SPELEN-HANDLEIDING.md](SAMEN-SPELEN-HANDLEIDING.md). Deze gids is de korte versie voor vier spelers over internet (stand 20-11, #983).

## Wat is er getest, en wat niet

Getest met echte Electron-instanties op één computer (127.0.0.1, wegwerpprofielen, een lokale nep-tracker en nep-broker, dus niets verliet de machine):

- Vier spelers (een host en drie gasten) verbinden via de **kamercode** (WebRTC) en via de **openbare sessielijst**, zien elkaar en blijven verbonden. Beelden van host en gast staan in `docs/img/qa/983-*`.
- De spelerslijst klopt bij allen, er gaat geen IP-adres of kamercode over de lijn van de lijstberichten, en vóór **Akkoord** gaat er niets naar buiten.
- Een fout is gevonden en gerepareerd: sinds #589 viel elke gast van de kamercode-route enkele seconden na het binnenkomen weg, zodra de host het volgende aanbod klaarzette. Zorg dus dat **iedereen de build heeft met die reparatie** (zie "Versie").

Niet te testen zonder echt internet, dus **niet bewezen**: of jullie routers elkaar via STUN vinden (NAT, firewall, mobiel netwerk). Zie "Als het niet lukt".

## Versie

Iedereen dezelfde versie, en wel een build **met de #983-reparatie** (commit "de host sluit een verbonden gast niet meer"). Met een oudere build lukt het koppelen wel, maar de gast valt na enkele seconden weg. Is de versie anders, dan meldt het spel "Andere versie" en kun je niet aansluiten.

## Hosten (één speler)

1. Hoofdmenu: **Samen spelen**, dan **Een spel openen**. Kies **Nieuw spel** of een opgeslagen spel.
2. Kies **Iemand uitnodigen** en daarna **Kamercode** (de standaard; de IP-route is alleen een noodoplossing).
3. Lees het toestemmingsscherm en kies **Akkoord**. Je IP-adres gaat dan naar je medespelers en naar openbare servers die jullie helpen elkaar te vinden.
4. Er staat een code als `K3J9D-8F2MN`. Stuur die naar de drie anderen. Dezelfde code werkt voor iedereen; hij blijft zichtbaar zolang er plekken vrij zijn.
5. Wacht tot de spelerslijst drie gasten toont (standaard maximaal 8 spelers). Daarna **Spel starten**. De opening zien jullie samen; alleen de host kan hem overslaan.

Liever een lijst dan een code? Kies in de wachtkamer **Maak deze sessie openbaar**, geef een naam (geen echte persoonsnaam) en lees de melding. De sessie staat dan in de lijst Openbare sessies voor iedereen met dit spel. Standaard is een sessie privé. Voor vier vrienden is de code veiliger.

## Meedoen (de drie anderen)

1. Hoofdmenu: **Samen spelen**, dan **Meedoen**.
2. Typ of plak de kamercode en kies **Verder**, of kies **Openbare sessies** en klik op de sessie van de host.
3. Kies **Akkoord** op het toestemmingsscherm.
4. Je komt in de wachtkamer. Wacht tot de host start. Je houdt je eigen geld en voortgang.

## Tijdens het spelen

- **Tab** (ingedrukt): wie speelt er mee. Het pauzemenu heeft een tabblad **Spelers** (naam, kleur, passief of niet).
- Iedereen staat standaard op **passief**: medespelers kunnen je geen schade doen. Alleen als beiden dat kiezen mag het tegen elkaar.
- Bij een opdracht vraagt het spel **Meedoen?**: druk **J** of **N**. Geen antwoord is nee: dan kijk je mee. Meedoen geeft jou de volle beloning in je eigen geld; de voortgang is per speler.
- **Valt iemand weg?** Die speler ziet "Verbinding weg" en kiest **Opnieuw verbinden**; de rest wacht kort of speelt door. Een gast uit de lijst komt via de lijst terug, een gast met de code via dezelfde code.
- **Valt de host weg?** Een andere speler kan het spel overnemen (Spel overdragen / de groep beslist). Dit is alleen in code getest, niet met echte Electron-instanties over WebRTC: reken er niet op.
- **Opslaan**: elke speler bewaart zijn eigen voortgang. Stop via het pauzemenu, **Samen spelen**, **Spel verlaten**.

## Als het niet lukt

De kamercode gebruikt alleen **STUN**: er is geen doorgeefserver (geen TURN). Een paar netwerken laten dat niet toe: strenge routers (symmetrische NAT), providers die één IP-adres delen (CGNAT), werk- en schoolnetwerken, en sommige hotspots. Dan zie je "Er kwam geen verbinding tot stand".

Probeer in deze volgorde:

1. **Verbinding testen** in de wachtkamer (kost ongeveer tien seconden, stuurt niets van jou) en lees de uitkomst.
2. Windows vraagt bij de eerste keer of GDE Groningen het netwerk mag gebruiken: kies **Toestaan** voor privé netwerken. Per ongeluk geweigerd? Zoek in Windows naar *Een app toestaan via Windows Firewall*.
3. VPN uit. Een kabel of goed wifi is beter dan een hotspot.
4. Wissel van host: probeer dezelfde code met iemand anders als host. Eén strenge router is genoeg om alleen die ene host onbereikbaar te maken.
5. Noodoplossing: **IP-adres (direct)**. De host kiest de IP-route; het spel vraagt de router om een poort tussen 41000 en 41999 te openen (UPnP). Lukt dat niet, dan moet de host die poort zelf doorsturen naar zijn computer. Iedereen met de code kan verbinden zolang die poort openstaat; hij sluit zodra je stopt.

## Bekende beperkingen

- Vier instanties op **één** computer geven ongeveer 20 beelden per seconde (meting hieronder). Op vier eigen computers is dat per speler gunstiger; de netwerklast is klein.
- Drie van de vier spelers zijn gast: de wereld (tijd, weer, politie) draait bij de host. Valt de host weg, dan staat de wereld stil tot een overname of tot de host terug is.
- Een ander netwerkprobleem (pakketverlies, hoge vertraging) merk je als haperende figuren; het spel meldt "Verbinding weg" pas na enkele seconden.
- De sessie wordt niet opgeslagen door de gasten voor de host: elke speler bewaart zijn eigen spel.
- Alleen NL en alleen het spel zelf; er is geen tekst- of voicechat.
