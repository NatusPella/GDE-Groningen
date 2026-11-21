# Samen missies: audit en voorstel (20-11, #983)

> **Naslag.** De regels staan in de canonieke spec [`.specs-fire/standards/multiplayer.md`](../.specs-fire/standards/multiplayer.md); dit document is een audit en een voorstel. Bij verschil wint de spec. De bouwregels per functie staan in [COOP-GAST.md](COOP-GAST.md).

Eigenaarsprioriteit: **samen missies doen**: meer missies, bijbanen en wedstrijden waarin alle spelers echt meedoen in plaats van meekijken. Dit document zegt eerst wat een gast nu doet, welke onderdelen van nature gezamenlijk zijn, en geeft per onderdeel een voorstel (rol per speler, beloning en voortgang, wegvallen en later aansluiten, schaal van 1 tot 4 spelers). Daarna staat erin wat in deze ronde is gebouwd en wat niet is gezien.

## 1. Hoe een gast nu meedoet

- **Meedoen? J of N** (`coopmeedoen.js`). Bij een opdracht, bijbaan of wedstrijd krijgt elke andere speler een korte vraag (10 seconden). Geen antwoord is nee. Wie ja zei is *deelnemer* (`opdrachtSpelers` in `spelersregister.js`: de gastheer als hij meedoet, plus elke verbonden gast met J en niet neer of weg). Wie nee zei is toeschouwer: vrij, kan zelf iets lokaals doen of kijkt mee. Late instap is er niet bij een race, wedstrijd of kluisklus; een laatkomer kijkt mee tot de volgende ronde.
- **De wereld is van wie het spel opende.** Alleen die wereld draait de simulatie van opdrachten (`updateGameplay`); een gast draait die niet. Wat de gast ziet komt als bericht: het scènebericht (`coopscene.js`), de EXTRA-berichten (`coopextra.js`: doelen, spreekbeurten, de duif, de wereldlijst), het veldje MISC (`maakMisc`: kermis, stunt, `punten` = de controlepunten van de opdracht) en het doelbericht van de bijbaan (`doelEvent`, ongeveer twee keer per seconde).
- **De opdrachtstand per groep** (`coopmissie.js`, #452): elke opdracht heeft een eigen id en een eigen stand; twee groepen overschrijven elkaar niet.
- **Voortgang en beloning per speler** (#429, #448): geld, loopbaan, prestaties en verhaalstap staan in de eigen save; de beloning komt per gebeurtenis met een vaste id (`coopbeloning.js`), nooit dubbel, nooit pas aan het einde. Wie wegvalt houdt wat hij had.
- **Een stap leest de groep, niet één lichaam** (`stagegroep.js`): `goto`, `hold`, `board`, `escape` en `chase` kijken naar elke deelnemer (`doelStand`, `teamActor`); met de vlag `iedereen` moet iedereen erbij zijn. Een gast die het doel haalt telt dus mee.
- **Drie kaders voor herhaalbare inhoud:** de bijbaan (`coopbijbaan.js`: `BIJBAAN_REGELS`, rol en hulp per baan), de wedstrijd (`multiplayerwedstrijd.js`: race, score, tijd, punt, live, baan; de gast speelt op zijn eigen scherm of in de wereld van de host) en de lokale activiteit (`GAST_ACTIVITEITEN`: hengelen, pannenkoeken, beiaard, boeren).

## 2. Wat een gast nu doet, per soort

| Soort | Nu | Bron |
|---|---|---|
| Verhaalstappen `goto`, `hold`, `board`, `escape`, `chase`, `scene`, `choice`, `timing`, `bake`, `convoy`, `garage`, museumrollen | werkt: de gast telt mee voor het doel, stemt bij een keuze, drukt mee bij een timing of bakronde, krijgt een eigen museumrol | `coopstatus.js` `STAP`, `heistrollen.js` |
| Stappen met rekwisieten alleen bij de host (heist-stappen, vliegen, trein, duif) | deels of nee: de gast kijkt mee | `coopstatus.js` |
| Opdrachtsoorten `checkpoint`, `deliver`, `fatbike` | werkt (de motor leest de groep) | `MISSIE_SOORT` |
| Bijbanen: taxi, bezorger, krantenwijk, vracht, bus, rondvaart, veerdienst, rechtbank, cabaret, loket, snackoverlast, tjalke, bietenoogst, ontspannen rondvaart | werkt, met een rol (passagier, tweede bezorger, helper, bijrijder, tweede jurylid, mede-optreder, tweede balie, handhaver, bemanning) | `BIJBAAN_REGELS` |
| Bijbanen: boerderij (trekker), boa, fietsdepot, lijn, verhuizing | nee: alleen in het eigen spel | `coopstatus.js` `BIJBAAN` |
| Wedstrijden tegen elkaar: kartrace, pitch en put, discgolf, padel, klimtoren, skatepark, hengelen, bruggenrace, regatta, ringrace, dijkrace | werkt (score, tijd, punt, live of baan; per plek betaald) | `registreerWedstrijd` |
| Lokale activiteiten: hengelen, pannenkoeken, beiaard, boeren | werkt op het eigen scherm, eigen voortgang | `GAST_ACTIVITEITEN` |
| Minigames: carbid, botsauto's, driftzone, waterskiën, zwembad, fierljeppen, koe, skûtsje-uitdaging, vliegschool | nee | `coopstatus.js` |

Wat opvalt: de meeste *herhaalbare* inhoud heeft al een rol, maar die rol is vaak een kleine hulp (E-toets met een vaste fooi) of een passagiersstoel. De *verhaalopdrachten* laten de groep alleen meetellen: het doel is "iemand staat erbij", niet "iedereen heeft een eigen taak". Daar zit de winst: taken die tegelijk gedaan kunnen worden, en een wedstrijd waarin iedereen een eigen beurt heeft.

## 3. Wat van nature gezamenlijk is, met een voorstel per onderdeel

Elk voorstel volgt dezelfde vorm: **rol** (wat doet elke speler), **beloning en voortgang** (altijd per speler, volle beloning, #429), **wegvallen en later aansluiten**, **schaal 1 tot 4**. Overal geldt: zonder gasten verandert er niets, en geen rol geeft de host extra rechten (#439).

### Gebouwd in deze ronde

1. **Het proefbeleg bij Bourtange (M30): drie bolwerken tegelijk** (`samenposten.js`, `missionposts.js`).
   - *Rol:* elke speler neemt een eigen bolwerk (de dichtstbijzijnde, bij gelijke afstand de laagste plek) en blijft staan tot de klok vol is.
   - *Beloning en voortgang:* gewone opdrachtbeloning per speler; de verhaalstappen en stemmen blijven die van de gewone stappen.
   - *Wegvallen en later aansluiten:* valt iemand weg, dan loopt de groep door met de overblijvers (wat klaar is blijft klaar); een laatkomer kijkt mee.
   - *Schaal:* 1 speler: de oude volgorde (3 x 6 s); 2: twee tegelijk, de derde erna (ongeveer 12 s); 3 of 4: alles in ongeveer één vlag (6 s); een vierde helpt bij een bolwerk.
2. **Wedstrijd: pannenkoeken bakken op het Pannenkoekenschip** (`pannenkoek.js`, soort `punt`, vak horeca).
   - *Rol:* iedereen bakt twee minuten op het eigen scherm met dezelfde bestellingen (vaste zaadwaarde); de hoogste punten winnen.
   - *Beloning en voortgang:* €90, €55, €30, €15 per plek in de eigen portemonnee en loopbaan Horeca; record, dienst en prestatie in de eigen opslag.
   - *Wegvallen en later aansluiten:* wie stopt of wegvalt telt niet mee en krijgt niets; wie na de start aanklopt kijkt mee op het bord; de host hoeft niet mee te doen.
   - *Schaal:* 1: de gewone minigame; 2 tot 4: wedstrijd (de AI doet niet mee).
3. **Bijbaan: bezorgen met verdeelde adressen** (`deliveryteam.js`, `sidejob_bezorger.js`).
   - *Rol:* na het ophalen heeft de bestelling één adres per bezorger; jullie verdelen de stad en wie er het eerst staat geeft af.
   - *Beloning en voortgang:* elk extra adres geeft iedereen €9 extra basisloon; de beloning is per speler volledig, niets wordt gedeeld.
   - *Wegvallen en later aansluiten:* de adressen blijven te halen voor wie er is; een laatkomer kijkt mee tot de volgende baan.
   - *Schaal:* 1: één adres, ongewijzigd; 2 tot 4: twee tot vier adressen, 14 s extra warmtebudget per extra adres.

### Voorstellen, nog niet gebouwd (op volgorde van winst en veiligheid)

4. **Het beleg van Bourtange (M20): de drie deuren van de kruitkelder.** Drie keer goto en hold, nu na elkaar. Past op dezelfde posten-laag (stappen taggen met `posten: 'deuren'`), maar de vuurwerkklappen (`fireworks`) mikken alleen op de host en halen tijd van de hold af; die moeten per speler gaan (de klap raakt de speler in de buurt, de straf gaat van de post af, niet van de host). *Rol:* een deur per speler. *Schaal:* zoals M30. Eerst de klappen per speler oplossen, dan taggen.
5. **Inpakken (M27) en de wisselwoning (M28): kamers per speler.** M27 heeft drie `hold`-stappen. De posten liggen op één plek, dus eerst per kamer een eigen punt in het huis geven; dan dezelfde posten-laag: een speler pakt de boekenkast, een de keuken, een de kat in.
6. **De bietenoogst met meerdere trekkers.** Nu is de tweede speler een helper met E. Voorstel: elke speler die in een trekker zit rooit een eigen rij (vier rijen, 1 tot 4 trekkers); de ronde is klaar als alle rijen gerooid en de lading bij de hoop is. De regels (`bietenrules.js`) zijn per rij en per voertuig al los te denken. *Beloning:* per speler vol; *wegvallen:* de rij blijft open voor een ander. *Schaal:* 1 trekker, vier rijen na elkaar (zoals nu); 4 trekkers, vier rijen tegelijk.
7. **Het containerlabyrint (M13): kraankooi en container tegelijk.** De kraankooi (9 s stil) en de container (6 s) kunnen tegelijk als de ene speler de bewaker afleidt terwijl de ander de papieren verwisselt. Het verhaal wil nu eerst de kraan (daar zie je welke container blauw is), dus dit vraagt een scriptwijziging; niet in een bugfixbuild. *Rol:* kijker in de kooi, wisselaar bij de container.
8. **De skûtsje-sprint als bemanning** (`pg_skutsje.js`, nu `nee`). Een skûtsje heeft stuurman, fokkenist en zwaardenman; elke speler een taak (sturen, zeil, zwaard) met een gezamenlijke tijd. Groot werk (nieuwe regels voor de boot); eerst een pure regelmodule `skutsjebemanning.js`, dan koppelen.
9. **Kermisrace en bruggenrace.** De bruggenrace is al een baanwedstrijd. Voor de kermis: een puntenwedstrijd op één attractie (carbid is `nee`: de rondes zijn lokaal en kort, dus past in het kader `punt` zoals pannenkoeken). Goedkoopste vervolg na deze ronde.
10. **M26 het plein: rollen.** Het plein heeft een bakronde (`bake`, al gezamenlijk: drukken mee), een frituurrij en een wachtstap. Voorstel: één speler bakt, één serveert (toetsen 1 tot 6 versus Q tot R in de bakronde zijn al gescheiden), één houdt de rij tevreden. *Schaal:* alleen alles zelf; met meer spelers per rol één. Vraagt wel ontwerp van wat "rij tevreden houden" is.
11. **De containerterminal (Eemshaven) als bijbaan** (nog niet in het spel): met meerdere kranen en vrachtwagens is dit de natuurlijke samenwerkingsbaan (kraanmachinist, chauffeur, bewaker van de lijst).
12. **Kluisklus en museumkraak (M06 en M10).** Rollen bestaan al (`heistrollen.js`: uitkijk, loper, kluisspecialist, schipper). Wat ontbreekt is de gastkant van de stappen met rekwisieten die alleen bij de host staan (`deels`): de gast voert zijn eigen stap nog niet zelf uit. Netwerkwerk, niet voor nu.

### Wat bewust niet is gedaan

- Geen rolverdeling die de host extra rechten geeft; de verdeling is op afstand of op plek, niet op host.
- Geen samenwerkingsbonus of delen van geld: de beloning blijft per speler vol (#448).
- Geen nieuwe verbindingsberichten behalve de puntjes `o` in het bestaande doelbericht van de bijbaan (zelfde JSON, `PROTO` en `CODEC_VERSION` blijven 2).

## 4. Bewijs

- **Puur:** `scripts/samenposten_test.mjs` (13 tests), `scripts/coop/deliveryteam_test.mjs` (12, inclusief de echte baan op een platte kaart), `scripts/multiplayermatch_pannenkoek_test.mjs` (8, met nephub en de gastkant).
- **Echte `missions.js`:** `scripts/multiplayer_missionposts_test.mjs` (9): alleen, toeschouwer, twee, drie en vier spelers, rollen per speler, wegvallen, nieuwe poging. Zonder de koppeling falen vijf van de negen: de test meet dus echt het verschil.
- **Testbank, twee en vier spelers over echte TCP-verbindingen (127.0.0.1), zonder Electron:** `scripts/coop/samenmissies_tcp_test.mjs` (de gastheer draait de echte netlaag `coopnet.js` en de echte `missions.js`; de gasten zijn headless via `mockclient.mjs`): elke gast krijgt zijn bolwerk als melding, drie bolwerken in ongeveer één vlag bij vier spelers, een gast die midden in de opdracht weggaat (de rest maakt af) en een late gast die nee zegt (bezet niets). `scripts/coop/samenwedstrijd_tcp_test.mjs`: uitnodiging bij elke gast, J en N, de start alleen voor wie ja zei, betaald per plek, een gast die weggaat krijgt niets, een late gast doet niet mee. Beide draaien ook mee in `scripts/coop_licht_test.mjs`. Dit zijn geen Electron-instanties: de machine zat vol (zie de slotenregel) en de gastheer is hier een Node-proces met de echte koppelingen; de bezorgronde heeft geen TCP-stap (alleen de pure regels, de echte baan op een platte kaart en het doelbericht).

## 5. Niet gezien

Niets hiervan is in beeld bekeken of met echte Electron-instanties of echte spelers gespeeld. Wat ontbreekt: het beeld van de drie bolwerken met meer spelers (staan de kringen goed, is de melding goed leesbaar); of de puntjes bij de bezorgronde op de kaart van een gast duidelijk genoeg zijn en of een gast te voet de adressen in de tijd haalt (de extra adressen liggen binnen 480 m van de zaak); het scorebord van de pannenkoekenwedstrijd in beeld en de keuze van 60 s wachttijd na de eerste. De beelden en de speelervaring met vier spelers zijn dus de eerste volgende stap.
