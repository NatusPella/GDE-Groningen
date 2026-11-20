# Open bugs en wensen op 20-11 (voor de build van 0.64.0)

Stand van de open issues met label `bug` (zonder `hertest`) plus de genoemde wensen, op HEAD van 20-11. Per issue: wat er al in zit, wat niemand in beeld heeft gezien, en wat te groot is voor nu (met oorzaakshypothese en schatting). Bron is de code, de tests en de laatste comments; er is voor dit overzicht geen Electron gedraaid. Wat hier "niet gezien" heet, staat ook zo in het issue. Zie ook [HERTEST-TRIAGE.md](HERTEST-TRIAGE.md) en [PROEFSPELER-DOORLOOP-20-11.md](PROEFSPELER-DOORLOOP-20-11.md).

## Wat vier spelers vanmiddag het eerst raakt

| Issue | Stand in code | Wat open staat | Schatting |
|---|---|---|---|
| #982 Samen spelen: wegvallen, gast kon niet lopen | Gefixt (`coopnet.js` stand pas bijwerken als `announce` lukte; `session.js` verbreekt pas als de gast stil is; filmklok loopt). `net_hub_test` 16/16, `net_lifecycle_test` 6/6. De net-testbank draaide op 20-11 groen met host en drie gasten (zie #983). | Alleen echt internet tussen vier netwerken (NAT, CGNAT: geen TURN) is niet gezien. | open: een speltest met vier mensen |
| #983 Gast uit de lijst hervat niet | Gefixt (`lijsthervat_test`, `joingate.js`, `hervatViaLijst`). Daarnaast de lekkende `cancel()` in `lobbyui.openRoom` (elke gast viel na enkele seconden weg) en het tegelijk aansluiten. | De host staat 10 tot 57 s stil na Spel starten (de opening laadt); gasten 3 en 4 die dan aansluiten krijgen "Deze sessie antwoordt niet". Advies in de speelgids: pas starten als iedereen in de lijst staat. Na een hostwissel (#439) is de bron voor hervatten leeg. | stilstand: M (laden over frames verdelen); hostwissel-bron: S |
| #986 Opening speelt niet eerst | Gefixt in code (`openingstart.js`, vlucht-in slaat over bij een nieuw spel), `openingstart_test` 54/54; opening in beeld gezien op 20-11 (`986-opening-*.png`). | De verhuisdag-scène is niet apart bekeken; haperingen van 0,4 tot 1,1 s op cuts naar verre plekken (tegels laden); een Tammo-close-up staat erg dicht op het gezicht. | hapering: M (tegels van het volgende shot vooraf aanvragen); close-up: S |

## Wereld en voertuigen

| Issue | Stand in code | Wat open staat | Schatting |
|---|---|---|---|
| #953 Bourtange | Missieplekken op droge wal; `bourtange_test` 71 controles. Gemeten op HEAD (20-11, tegels van de hoofdmap, zelfde rooster van 3 m rond het plein, straal 450 m): de vaarnet-waterstukken zetten 2.197 cellen extra onder water, waarvan 1.787 onder een gebouw (onschuldig) en 410 op open grond. Van die 410 grenzen er 300 aan echt water (een gracht die breder wordt) en 110 (circa 1.000 m2) liggen op drie plekken zonder echt water: rond (42287, 22655), (42500, 23050 tot 23100) en (42563, 22850). | De eerdere zin "105 van 108 stukken liggen op droog land" meet vooral stukken onder gebouwen en bruggen en overdrijft het probleem; de echte natte plekken zijn die drie. De wallen ogen rommelig: een mens moet door de vesting lopen. | S: een dam of weglaten van die drie stukken in `vaarnet_fixes.json` (`gaten`), daarna `vaarnet.mjs --fixes`; M voor de rommelige wal (beeld) |
| #919 Bruggen transparant | Dekken van 411 bruggen in cijfers goed (`bridge_all_test`); Visvliet in beeld dicht. | Het voorbeeld uit het issue (Nieuwstad/Farmsum, 's nachts) is niet in beeld bekeken. Hypothese: iets 's nachts (nachtlicht, emissive of een verre laag), niet de dekgeometrie. | S om te kijken, onbekend om te fixen |
| #917 Z-fighting gebouwen | Nudge van hoogstens 4 mm per pand, near-vlak dynamisch (`ZFIGHT-METING.md`), `building_nudge_test` 6/6. | Geen speler of beeld bevestigt dat het weg is op alle panden; de volledige `zfight_audit` over de stad is niet gedraaid. | M |
| #958 Uit het water klimmen | `findClimbSpot` kiest een plek met vrij pad (`climbPathClear`), `zwemklim_test` 22 controles. | Niet langs elke kade in de provincie bekeken. | S per kade |

## Missies en overige

| Issue | Stand | Wat open staat | Schatting |
|---|---|---|---|
| #990 Kaartontdekking | Gebouwd en in beeld gezien (twee mistniveaus, onthulling, teller, Te doen). | Geluid niet gehoord, ontdekking door binnenrijden en kleine schermen niet gezien. Blijft open tot de eigenaar het zag. | S |
| #956 Missies binnen | M03, M25, M18, M22 spelen binnen. | De rest niet geïnventariseerd. | L |
| #963 Wachten in een cirkel | Houd-scène met props (`wachtprops_test` 61). | Geen animatie voor personages. | M |
| #962 QTE | Timing-QTE's in M24 en M26 weg. | Vier actie-QTE's (M18, M20, M21, M22) nog niet vervangen. | L |
| #950 Accountmanager in weiland | Intake van Wiebelwerk speelt binnen (M18/M03). | Onduidelijk welke scène bedoeld is; vraag aan de melder. | S zodra bekend |
| #944 Van de fiets slaan | `requestRiderOff` hangt aan de melee-regel (`combat.js`), `bikerider_test`. | Niet gespeeld, ook niet wat er met de fiets gebeurt. | S |
| #943 First person handen | Handen en wapens hangen aan de camera. | Geen gevecht in first person bekeken. | S |
| #959 Over objecten springen | `vaultkit.js` kent `ledge` tot 2,2 m, hooibalen tellen mee. | Niet gespeeld; kisten en containers wel te beklimmen, geen perch voor andere props. | M |
| #922 Live bussen als USP | Bussen volgen echte diensten en koppelen los bij kapen. | Presentatie (kaartlaag, label) kan beter. | M |
| #921, #937 (hertest) | Opgelost sinds 0.63.0 (`farlod_stream_test`, `streambudget_test`). | Geen rit door de stad na de wijziging bekeken; hertest door een mens. | |
| #1005 Farming | Veldstanden, vlag, strook en kaartkleur gebouwd. | Niet door een mens gespeeld. | |
