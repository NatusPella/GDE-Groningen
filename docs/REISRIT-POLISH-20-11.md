# Taxi- en treinrit: audit en polijsten, 20-11

Bekeken in Electron (wegwerpprofiel, `scripts/qa/taxirit_beeld.mjs`, 1920x1080 en 1280x720, taxi Groningen naar Winsum, trein Groningen naar Delfzijl).
Doel van de eigenaar (#882, #926): als passagier een taxi of trein door de echte wereld zien rijden naar het doel op de kaart.
Alleen wat in beeld gezien is staat bij "gezien"; geluid is niet beluisterd.

## Audit

| Onderdeel | Stand vóór | Gedaan |
|---|---|---|
| Cabine: licht en materialen | Donkere massa: dashboard, paneel en stijlen bijna zwart, de interieurkant van de vlakken kreeg weinig zon (`882-taxi-cabine-vooruit-1080.png`) | Lichtere kleuren (warm grijs dashboard en paneel, lichte hemel), sterkere emissive op het ene gedeelde materiaal, gedimd met het daglicht (`updateRitCabine`) |
| Kijkhoek | Het dashboard nam een derde van het beeld | Basisstand 0,04 rad omhoog |
| Ruiten: reflectie, regen | Geen glas, geen reflectie, geen druppels | Niet gedaan (zou een overlay-materiaal met eigen blending vragen; kost een teken-aanroep per beeld) |
| Chauffeur: animatie en blik | Stilstaand beeld, handen vast | Stuur en handen draaien met de bocht mee (eigen kleine mesh, één aanroep erbij); blik en schouders nog niet |
| Meter | Zevensegmentscherm leest goed, loopt op naar de prijs | Ongewijzigd |
| Camera: schokjes, bochten, remmen | Alleen een lichte deining en blikken | Kijkt mee in een bocht, leunt iets naar buiten, knikt bij remmen, trilt zacht van het wegdek (alleen met snelheid) |
| Straatbeeld en verkeer | Echte wereld met verkeer en voetgangers, gezien | Ongewijzigd |
| Snelheid en ritme | 9 s echt begin, sprong, 9 s echt einde; dit leest als een rit | Ongewijzigd |
| Geluid | De passagier zit niet zelf in het voertuig: geen motor te horen | Gedempte motor van binnen (bestaande opname, toonhoogte en niveau volgen de snelheid), portier dicht bij het instappen en open bij het uitstappen (bestaande opnames). Richtingaanwijzer, radio en wegdek niet gedaan |
| Tijdsprong | Zwart met tekst ("Drie kwartier later", klok) | Ongewijzigd |
| Begin en einde | De eerste seconden zat de camera zonder cabine op de weg; na de sprong ontbrak de cabine soms een tijdje | De verborgen speler staat er vanaf het eerste beeld; de taxi van de rit krijgt zijn mesh vóór de rest van het verkeer |
| Trein: raam, parallax | Kader van de coupé met stoel, tafeltje en raamstijl; het uitzicht schuift langs | Zachte rammeling van het spoor (alleen in de coupé, sterker met de snelheid) |
| Trein: station en perron | Perronaankomst gezien (`926-trein-perron-aankomst.png`); binnenrijden onder de overkapping is te zien | Ongewijzigd, reizigers op het perron niet toegevoegd |
| Nacht, regen | Niet gezien | Niet gezien; de cabine dimt met het daglicht maar is 's nachts niet beoordeeld |

## Wat nog open is

- Glas met reflectie of regendruppels in de taxi en de trein, richtingaanwijzer en radio in de taxi.
- Blik en schouders van de chauffeur naast het stuur.
- Reizigers op het perron bij de aankomst, een taxi die blijft staan na het uitstappen.
- Nacht en regen in de cabine beoordelen; 4:3 en smalle schermen.

## Samen spelen

De rit is lokaal (geen netwerkbericht); het portiergeluid gaat via de lokale audiowachtrij. Er is niets veranderd aan wat een gast ziet.

## Frametijd

De machine was tijdens de runs niet stil (gemiddeld 54 tot 87 ms per beeld, ook zonder cabine), dus een voor/na is niet bruikbaar als maat.
Wat erbij komt per beeld: één extra tekenaanroep (het stuur), één gedeeld materiaal, geen licht en geen shader.
