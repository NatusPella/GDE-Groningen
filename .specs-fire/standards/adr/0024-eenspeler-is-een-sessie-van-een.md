# 0024 - Eenspeler is een sessie van één

- **Status:** besloten
- **Datum:** 2026-11-06
- **Spec:** `.specs-fire/standards/multiplayer.md`
- **Gebied:** Samen spelen, de ingang, opslaan en laden
- **Gerelateerd:** #554 (het besluit), #486 (omgedraaid), #553 (performance zonder gasten), ADR 0022 (altijd een sessie), ADR 0007 (wie het spel opent is geen baas)

## Context

Tot nu toe waren het twee paden: "Alleen spelen" startte een wereld zonder sessie,
"Samen spelen" was een laag erop (#486, ADR 0016). Dat kost dubbel werk. Elke functie
die spelers raakt moet zich afvragen of er een sessie is, en een gast die later
aansluit of de rol overneemt komt binnen in een wereld die tot dan toe anders liep dan
in een gewone sessie. De eigenaar draaide dat op 6-11-2026 om: **"Alleen spelen is
gewoon multiplayer in je 1tje (zonder andere medespelers), zodat het goed werkt."**

De sessie van één is bovendien bijna gratis: de gastheer simuleert de wereld zelf en
stuurt niets zolang er geen gast is (`game/js/net/session.js:155`). Wat overblijft is
de vraag of "alleen" een eigen pad moet zijn of dezelfde sessie met één speler.

## Besluit

**Elke spelstart is een gastheer-sessie; "Alleen spelen" is een sessie van één.**

- **Altijd een sessie.** `game/js/coopsolo.js` start met `startSoloHost()` de gewone
  gastheer-sessie (`startHost`), met ruimte voor alleen plek 0 (`SOLO_MAX = 1`) en
  zonder gasten. `world.coopRole` is `host`, plek 0 is de lokale speler.
- **Besloten en stil.** De sessie van één maakt geen aankondiging en opent geen poort:
  er gaat niets naar buiten en er staat niets in de openbare lijst, ook niet als de
  speler bij de eerste start "nee" zei (constitutie 4, ADR 0022). Wie het spel opent
  host dus altijd, maar hoeft niets te delen.
- **Eén pad voor iedereen.** Pauzeren, opslaan en laden, uitnodigen, een gast die later
  aansluit, kicken en host-overdracht lopen door dezelfde code als in een gewone
  sessie. Daarom werkt een latere gast of host-overdracht precies zoals in een gewone
  sessie.
- **Alleen spelen blijft alleen.** Zolang er geen gast is, pauzeert het menu de wereld
  gewoon: de doorloop achter het menu eist minstens twee spelers
  (`game/js/coopnet.js:1588`), en de metgezel volgt via de gewone volg-AI omdat de
  gast-invoer ontbreekt (`game/js/coopglue.js:35`).
- **Overgang zonder herstart.** Wie Samen spelen opent (pauzemenu, hoofdmenu of de
  openbare lijst), stopt de sessie van één en de lobby neemt over
  (`game/js/main.js:639`, `game/js/pausemenu.js:1593`,
  `game/js/startscreen.js:617`); andersom start de sessie van één weer zodra er geen
  Samen-scherm open staat. De voortgang gaat mee.
- **Geen snapshotwerk zonder gasten.** `tickCoopNet` heeft een snelle route zonder
  gasten: hub, kloktellers en de eigen spelerslijst blijven bij, maar foci, figuren,
  `hostView`, snapshots en scene- en missieberichten worden overgeslagen (#553). Zo
  kost de sessie van één geen netwerk- of snapshotwerk per frame.

## Afgewezen

- **Eenspeler als eigen pad (#486, tot 6-11).** Twee paden: elke functie kent een
  sessie- en een eigen eenspelerpad, en een gast of host-overdracht gedraagt zich anders
  dan in een sessie die vanaf het begin meerdere spelers had. Dat verschil is precies wat
  "zodat het goed werkt" wegneemt.
- **Solo zonder hub** (alleen een vlag, of helemaal geen sessie). Lijkt goedkoper,
  maar dan moet elke functie alsnog twee keer nadenken, en een latere gast moet een
  bestaande wereld ombouwen tot sessie — met de vraag wat er met tijd, verkeer,
  politie en bezit gebeurt. De hub ís de sessie; hem niet maken levert alleen het oude
  tweede pad op.
- **De sessie van één pas maken zodra iemand meedoet.** Dat is het oude pad met een
  omweg: tot het eerste contact is de wereld geen sessie, en de eerste gast krijgt een
  andere wereld dan hij gewend is. De sessie moet er vanaf de start zijn, anders valt
  er niets over te nemen.
- **De sessie van één openbaar of aankondigbaar maken.** Dan host elke speler die
  alleen speelt een sessie die in de lijst staat: een aankondiging zonder dat de
  speler iets deelt, en in strijd met constitutie 4 en ADR 0022. De sessie van één
  heeft ruimte voor één en doet niets naar buiten.

## Gevolgen

- Elke nieuwe functie hoeft niet meer te vragen "is er een sessie?" — er is er altijd
  één. Wel moet ze blijven vragen "doet er iemand mee?" (`meerdereSpelers`, #446).
- De spelerslijst van de sessie van één bevat alleen de eigen speler; knoppen en hints
  voor Samen spelen blijven verborgen zolang er niemand meedoet.
- Opslaan, laden, stoppen en afsluiten gaan door het sessiepad: het einde van de
  sessie verrekent en bewaart (`stopCoopNet` → `verrekenEinde`). Een functie die een
  sessie start of stopt, doet dat via `coopsolo.js` en niet zelf met
  `startHost`/`stopCoopNet`, anders blijft de vlag `coopSolo` achter.
- De automatische zoektocht naar een sessie bij de start (#528, ADR 0022) kan niet meer
  aansluiten of zelf een sessie openen zolang de sessie van één draait:
  `canBootSession` ziet een lopende sessie (`game/js/sessionboot.js:61`). Wie met
  anderen wil spelen, opent Samen spelen; de keuze "ja" bij de eerste start leidt
  daardoor niet meer vanzelf naar een sessie met anderen. Dat gedrag moet nog worden
  bijgesteld in `multiplayer.md` ("Het bootpad") of de volgorde in `main.js` moet
  veranderen; tot die tijd is de spec op dit punt te ruim.
- De performance van de sessie zonder gasten moet gemeten worden (#553): de snelle
  route is er, maar de vaste last per frame (hub, spelerslijst, hosttikken) blijft.
- De koploze gastheer (#450) en de sessie van één zijn niet hetzelfde: de een heeft
  geen plek 0, de ander heeft er precies één. Ze mogen niet door elkaar lopen.
