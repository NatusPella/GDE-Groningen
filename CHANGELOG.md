# Changelog

Alle noemenswaardige wijzigingen in GDE Groningen, per versie. Nieuwste bovenaan.
Versies volgen SemVer: `0.x.y` tot de echte release (1.0.0); `x` voor
nieuwe functies, `y` voor alleen bugfixes.

## [Unreleased]

### Verbeterd
- **Alle kaarticons opnieuw ontworpen (#180, #92; in Electron bekeken op minimap en grote kaart in stad, dorp en Ommeland, dag en nacht, niet door de eigenaar):** elke plek is een badge met een eigen vorm per soort naast de kleur (zorg een rode cirkel, politie een blauw schild, garage een zeshoek, station een paarse afgeronde balk, bijbaan een ruit, winkel een roze vierkant, activiteit een groene cirkel), een groter symbool in crème of donker, een lichtere rand, een zachte schaduw en een dunne lichte lijn voor contrast op elke ondergrond. Jij bent een groene pijl met gloed en lichte rand. Zeldzame soorten komen zacht in beeld bij het inzoomen. Een plek kan aanwezig, ontdekt of vergrendeld zijn (nog nergens aangesloten). `scripts/ui/kaarticons_scenes.js` maakt het iconenblad en de kaartbeelden.
- **Shift+klik op de kaart verplaatst je weer (#180, nog niet in beeld bekeken):** op de grote kaart en de provinciekaart zet shift+klik je op begaanbare grond bij die plek, met je voertuig mee en met dezelfde bewakers als de cheat Overal en nergens (niet tijdens een missie of filmpje, niet met de politie achter je aan, niet op het water). Uit te zetten onder Instellingen › Interface; een regel staat in Hulp.


### Opgelost
- **Der Aa-kerk van binnen stond verkeerd om (nog niet in beeld bekeken, #22):** de torenhal lag aan de oostkant, terwijl de toren in de kaartdata aan de westkant staat. Torenhal en koor, de portalen en de kansel zijn gespiegeld; `interieurs_test` controleert nu dat de torenhal bij de echte toren ligt (1045 checks).

### Nieuw
- **Samen spelen staat nu in het hoofdmenu en het pauzemenu (#95):** zonder speciale vlag. Kies "Samen spelen" in het hoofdmenu: het spel start zoals altijd (Doorgaan, of een nieuw spel) en de wachtkamer staat open om iemand uit te nodigen (kamercode of IP-adres met poort, tot 4 spelers; jij bent Tammo, de eerste gast Tessa) of aan te sluiten. Voor het versturen van een signaal of het gebruik van een openbare STUN-server vraagt het spel eerst toestemming. Valt iemand weg, dan pauzeert het spel met een wachtscherm. Nog niet getest met twee echte computers.
- **Dierenregister, dierenboek en dierenhoek (nog niet in beeld bekeken):** elk dier (koe, schaap, paard, gans, eend, zwaan, meeuw, reiger, vis, zeehond, duif, kat, hond) heeft Ã©Ã©n definitie met model, streek, biotoop en tijd van de dag. Een dier dat je van dichtbij ziet, komt in je dierenboek (prestatie Dierenvriend). In de dierenhoek van de Avondwinkel adopteer je huisdieren en vee, en verzorg, train of rust je ze uit; zeehond, reiger, zwaan en meeuw zijn niet te koop. De duif en de kat in de cutscenes hebben nu dezelfde modellen als in de wereld. Het bezit staat los van je save (gde-dieren-v1); de dieren lopen nog niet zichtbaar bij je thuis rond. (Refs #193)
- **Roeicoach zoekt ruimer (nog niet in beeld bekeken):** als er geen rustige weg binnen 22 m langs de acht ligt, zoekt de coach tot 45 m. (Refs #28)
- **Interceptors bij de politie (nog niet in beeld bekeken):** vanaf drie sterren is elke derde patrouillewagen een interceptor met een sterkere motor (12% sneller). (Refs #204)
- **Voertuigregister (nog niet in beeld bekeken):** alle voertuigmodellen staan nu in één register (`vehicleregister.js`) met hoe ze te koop zijn, te upgraden, te spawnen en in cutscenes mogen. Nieuw: de Ommelander Trekker is te koop bij Ome Harm, zeilboten hebben upgrades (diep roer, zeillier) en het verkeer verandert met de tijd van de dag: 's nachts meer taxi's en opgevoerde auto's, overdag meer bestelbussen en vrachtwagens, 's avonds meer bezorgbussen. Jelles limo, de bakkie en de aanhanger in de colonne en de sloep van Wiebe gebruiken nu de gewone modellen.
- **Tv verplaatsen in de flat (nog niet in beeld bekeken, #206):** de Kiekkast kan via de pc (Flat inrichten) naar drie plekken aan de noordmuur van de woonkamer; het zitpunt en de plek vanwaar je kijkt gaan mee. Bank en bedden blijven op hun plek.
- **Wolken aan de hemel (nog niet in beeld bekeken, #194, #195):** bij helder weer hangen een paar losse wolkjes, bij bewolkt weer vult de lucht zich, bij onweer wordt de laag grijs en trekt sneller. 's Nachts zijn de wolken donker en doorzichtig, zodat sterren en maan zichtbaar blijven.
- **Fotomodus (nog niet in beeld bekeken, #199):** kantelen met Q en E en scherptediepte met Z en X (zachte randen, scherp in het midden); beide staan ook op de opgeslagen foto.
- **Spelstanden hernoemen met een controller (nog niet in beeld bekeken, #208):** in het hernoemscherm staan snelle namen die je met de richtingen en A kiest.
- **Bushalte met reizigers (nog niet in beeld bekeken, #225):** bij een halte van de buslijn lopen wachtende reizigers naar de deur en stappen in, en wie uitstapt komt uit de deur en loopt de stoep op. Alleen beeld; de telling van reizigers is ongewijzigd.
- **Interieur per voertuigklasse (nog niet in beeld bekeken, #51):** in de Binnenin-camera hebben sportauto, taxi (taxameter), politie (portofoon, laptophouder, tussenschot), ambulance, bestelwagen, vrachtwagen (groot stuur, slaapbank) en bus (groot plat stuur, kaartjesautomaat) een eigen inrichting.
- **Schade (nog niet in beeld bekeken, #205):** sierdoppen en uitlaat zijn losse delen van het model en verdwijnen bij een klap; een scheve motorkap met flinke deuken laat de motor al eerder roken.
- **Stoppie op de fiets (nog niet in beeld bekeken, #207):** Ctrl vasthouden en remmen tilt het achterwiel een beetje op; het zakt vanzelf terug.
- **Het vertrekbord volgt de echte treinen (nog niet in beeld bekeken, #198):** de tijden op het stationsbord en de omroep komen nu uit de treinen die je ziet rijden (aankomst uit afstand en snelheid, oponthoud per halte, keren aan het eindstation), omgerekend naar de spelklok. Het rooster blijft de terugval als er geen trein op de lijn rijdt. Alleen de logica is getest (`dienstregeling_test`, `stationlife_test`); in het spel niet bekeken.
- **Pakhuizen in de havens (nog niet in beeld bekeken, #164):** gebouwen met pakhuis, loods of haven in de naam (en een passende grootte) krijgen een langgerekte baksteenhal onder een zadeldak met een hijsbalk en laaddeuren boven elkaar. Alleen getest op synthetische gebouwen (`landmark_everyday_test`), nog niet op de echte tegels.
- **Parkaankleding (nog niet in beeld bekeken, #23):** het Noorderplantsoen (14 banken) en de Prinsentuin (5) krijgen banken met het gezicht naar het midden en hier en daar een prullenbak (`parkplekken.js`, test groen; `streetlife_test` 92/92).
- **Voetgangers die wegtrekken blijven bestaan (nog niet in beeld bekeken, #18):** wie uit beeld wordt weggehaald, blijft als getal per cel in de abstracte laag (`AbstractPool`); komt je terug in de buurt, dan verschijnen die mensen weer in hun eigen cel. Niet getest in het spel, alleen `simlagen_test` en een syntaxcheck.
- **Elke profielstad heeft nu een garage, schuilplaats, bijbaanbord en racebord (nog niet in beeld bekeken, #67):** in Delfzijl, Appingedam, Veendam, Winschoten, Hoogezand-Sappemeer, Leek, Uithuizen, Stadskanaal, Zoutkamp en Winsum staan in het centrum borden met verzonnen namen die iets zeggen als je erlangs loopt. Het zijn borden met een tekst; de bijbaan en race zelf zijn er nog niet.
- **Koplampen bij regen en mist (nog niet in beeld bekeken, #19):** auto's zetten overdag hun lampen aan bij regen of dichte mist, met een zachte overgang (`weerlook.koplampenFactor`, test groen).
- **Samen spelen volgt de stappen van de gastheer (#95):** een gast ziet welke opdracht de gastheer speelt en elke volgende stap als melding. Keuzes in gesprekken worden nog niet doorgegeven. Alleen met tests in het geheugen en twee tot drie Electron-instanties op één computer getest.
- **Samen spelen: gedeelde speelklok en desync-controle (#95):** de tijd van de dag van een gast volgt die van de host, en de host controleert om de paar seconden of de gast hetzelfde ziet (verhaalstap, opdracht, wanted, spelers); bij een afwijking vraagt de gast zijn toestand opnieuw. Alleen met pure tests en in-memory getest, nog niet getest met twee echte computers of met een telefoon.
- **Spelbot (#186, #255):** `--speed=N` speelt tot 8 spelstappen per beeld; de minigame-ronde stopt zelf op de echte-tijdbegroting en bij een vastgelopen speltijd, en bewaart bij een onderbreking de uitvoer (`uitvoer.log`, `result.json` met de lijst minigames).
- **Rottum en Schiermonnikoog als randen (nog niet in beeld bekeken, #6):** de kustketens rond Rottumeroog en Rottumerplaat sturen je terug met een bord "verboden natuur" en zeehonden op de plaat; rond Schiermonnikoog vaart de veerboot dwars voor je langs. Alleen getest op de logica (`randaudit_test`), niet in het spel.
- **Streek Alleen trekkers (nog niet in beeld bekeken, #61):** geen fietsen of brommers meer, de auto's die overblijven zijn grote, groene en rode bakbeesten. Sterft net als de andere verkeerstreken in 45 s uit.
- **Eigenaar loopt terug naar zijn auto (nog niet in beeld bekeken):** laat je een gestolen auto achter, dan loopt de eigenaar die weer terugpakken als hij binnen 45 m staat en er niemand in zit. Staat de auto buiten beeld, dan rijdt hij weg. Een klap van een boze bestuurder klinkt nu ook. (Refs #49, #44)
- **Reigers, zeehonden en vissen (nog niet in beeld bekeken):** aan het water staat soms een reiger (vliegt weg als je dichtbij komt), in de kustwateren liggen zeehonden (duiken weg) en in grachten en sloten zwemmen vissen onder het oppervlak (schieten weg). Koeien en schapen stappen opzij voor jou en voor voertuigen. Reiger, zeehond en vis hebben een eigen geluid. Aantallen volgen de streek en de kwaliteit. (Refs #193)
- **Bijbanen buiten de stad starten altijd (nog niet in beeld bekeken):** als er bij het hart van de streek nog geen weg is geladen (strandwacht, balenrit, melkrit, bergingsdienst), zoekt de baan eerst ruimer en valt dan terug op de dichtstbijzijnde weg in de stad, zodat het voertuig er altijd staat. (Refs #192)
- **Tuning werkt door (nog niet in beeld bekeken):** een heldere koplamp laat 's nachts verder en feller schijnen, een zachte stoel dempt de camera-schok bij een botsing, de onderdelen van de Escapade komen terug als ze verschijnt, en opvallende onderdelen (knalpijp) laten de politie je tot 40% langer zoeken. (Refs #196)
- **Zeilregatta met tegenstanders, omslaan en roeiritme (nog niet in beeld bekeken):** in de zeilregatta varen drie verzonnen zeilers mee (Wiebe, Marrit, Tjeerd) en je ziet je plaats in het bord en in de uitslag. Een zeilboot slaat om bij storm met een strak zeil dwars op de wind: even drijven, nat maar verder niets. De roeiboot vaart op ritme: tik W ongeveer elke seconde voor een hogere topsnelheid. (Refs #197)
- **Evenementen trekken voetgangers (nog niet in beeld bekeken):** bij een lopende kermis, markt, optocht of concert komen er groepjes voetgangers bij tot de drukte van dat evenement, buiten beeld gespawnd. (Refs #203)
- Vuurwerk klinkt nu als een echte bom: harde tik, dreun en knetterend glitter (gerenderd, drie varianten); de overwegbel is een staalslag met nagalm. Offline gecontroleerd op spectrum, niveau en duur; nog niet gehoord.
- Fietsen en scooters hebben kleine knipperlichtjes aan de stuuruiteinden (scooters ook achter) in plaats van grote blokken. Nog niet in beeld bekeken.
- Als iemand praat, worden motorgeluid en omgeving nu zachtjes gedempt (eerder alleen de nieuwe effecten). Nog niet gehoord.
- Het nieuws meldt een kermis in jouw buurt nu als eigen kop met de plaats. Nog niet in het spel gezien.
- Veertien opgevangen gesprekken van drie regels erbij, voor elke streek twee. Nog niet in het spel gezien.
- **Fierljep-duel in Bourtange (M20, nog niet in beeld bekeken, #218):** na de drie timingrondes maak je zelf de polsstoksprong over de gracht, met de zijcamera: een landing als je het duel won, een plons als je verloor.
- **Snelheids-FOV nu zichtbaar (#216):** het beeld werd pas wijder vanaf 70 m/s, terwijl auto's maximaal 33 m/s halen; nu loopt het van 12 tot 36 m/s (tot 8 graden). In het spel gemeten met de bot (+2,7 graden binnen een seconde); het afstellen van het gevoel zelf is niet gespeeld. Nieuwe instelling **Snelheidsgevoel** (Spel) zet dit en de korte botsvertraging uit; Beweging beperken zet het ook uit.
- **Duidelijker doel op de kaart (#93):** de kaartregels van M08, M16 en M24 noemen nu het doel van de missie.
- **Hulp bij schade (nog niet in beeld bekeken, #215):** de optie "minder schade" werkt nu ook bij kogels, klappen en valschade, niet alleen bij voertuigen.

### Opgelost
- **De hele 3D-wereld was zwart (#256, #257):** de wolkenlaag gooide elk frame een fout in `updateSunAndSky` (ontbrekende `world` en `L`), waardoor alleen de HUD in beeld stond. Opnieuw gezien: de wereld rendert weer (beeld van Delfzijl in de sweep).
- **Regenstrepen vlak bij de camera (#258):** streepjes die dichter dan vier meter bij de lens komen worden korter en dunner en verdwijnen op een meter; eerder werden het witte palen door het beeld. In beeld gezien bij drie regenplekken van de sweep, nog niet door een mens bekeken.
- **Sprong naar een verhaalstap (#261, #262):** de dev-sprong kiest een plek buiten gebouwen en water. Bij Zoutkamp (M16) staat de speler nu op de kade (in beeld gezien); bij M11 staat de camera nog tegen een muur (niet opgelost).

### Intern
- **Visuele sweep (`scripts/qa/sweep.mjs`):** willekeurige plekken, tijden, weersoorten en verhaalstappen met een vaste seed, minstens 150 beelden per ronde, automatische checks (zwart, leeg, NaN, textures, HUD buiten beeld of overlappend, speler in water of gebouw) en contactbladen (`scripts/qa/montage.mjs`). Zie docs/TESTEN.md. Alle beelden zijn alleen door een agent bekeken.
- **Overlays wachten op elkaar (#239, gezien in Electron op 1080p en 720p):** de plaatsnaam wacht nu ook onder de resultaatkaart, een keuzepaneel en een duelbalk; de personagenaam staat hoger en niet meer over de minimap of de straatnaam; een prestatie wacht in de rij tot de resultaatkaart weg is.
- **Duif en wandeling (#241, gezien):** een lopende wandeling stopt netjes zodra je de duif start (de wandeling meldde zich als 'niet actief', waardoor hij werd overgeslagen). De telefoonkaarten schuiven onder de duif-HUD in plaats van eroverheen.
- **Aanwijzingen (#92, #34):** de nog niet gevonden aanwijzingen staan als één regel ('12 nog te ontdekken') in plaats van twaalf keer '???'. In Electron bekeken: Aanwijzingen, Personages, Besturing met Controller, de Mislukt-kaart en de Dood- en Opgepakt-kaarten; de garage, prestaties en winkels (#170, drie typen) zagen er rustig uit. Nog niet gezien: touch, een echte controller en 4K.
- **Reisprompt:** Esc en B op de controller sluiten het paneel met de standaardkeuze (#92; nog niet met een echte controller geprobeerd).
- **Nagekeken, niets aangepast:** de resultaatkaart met lange waarden (#250), het richtingbord bij Winsum met een effen achterkant (#228) en het ene laadbalkje op het eerste laadscherm in Electron (#226) zijn in beeld bekeken en kloppen. De winkelinterieurs (#156) tonen nog steeds overal boekenkasten.

## [0.37.1] - 2026-10-19

### Nieuw
- **Cutscenes tonen echte voertuigen en dieren (deels in beeld bekeken):** auto's, bestelbus, bakkie, trekker, politieauto, fietsen, duif en kat komen nu uit dezelfde modellen als in de wereld in plaats van blokjes. De aanhanger (bestaat niet in het spel) is uit Even pinnen gehaald en de validatie weigert zo'n placeholder voortaan. (Refs #136)
- **Naamkaarten in de opening, spoor in de benchmark (nog niet in beeld bekeken):** Tessa en Tammo krijgen een naamkaart linksonder zodra ze in de keuken in beeld komen. De benchmarkroute heeft een nieuw shot langs het spoor met een eigen categorie in de resultaten. (Refs #159)
- **Verkeer en voetgangers rond de cutscene-camera (nog niet in beeld bekeken):** tijdens een cutscene vullen auto's, fietsers en voetgangers zich rond waar de camera kijkt, niet rond de verborgen speler. (Refs #157)
- **Sluizen-audit:** `node scripts/world/sluizen.mjs [--raster] [--write] [--strict]` controleert voor elke sluis dat het water aan beide kanten doorloopt (ook in het vaarnetraster) en schrijft `game/sluizen.json`; `scripts/sluizen_test.mjs` test de deuren per fase, de seinen, schutten in beide richtingen, een wachtrij en geen deadlock.
- **Sluizen werken (nog niet in beeld bekeken, #236):** elk van de 62 sluizen in de provincie heeft deuren die open en dicht gaan, seinlichten (rood, geel, groen) vóór de deur en een schutcyclus. Vaar je op een sluis aan, ligt je boot stil of toeter je, dan vraagt de boot de sluis; bij groen vaar je in, de deur sluit, het water gaat omhoog of omlaag (je boot gaat mee) en de andere deur gaat open. Boten van de computer doen mee en een deur sluit nooit op een boot. Bij Lauwersoog liep een onzichtbare muur dwars door de kolk van de Robbengatsluis (een lange waterrand telde als oever); die is weg. De kolk van de Robbengatsluis en twee kolken van het Reitdiep waren geen vaarwater voor grotere boten of ontbraken in de kaart; dat is gerepareerd.

### Intern
- **Spelbot, testpijplijn en prestaties (niet door een mens bekeken):** de spelbot speelt verder (akte 1 t/m 5 is nog niet achter elkaar gehaald), `node scripts/test_all.mjs` krijgt een coöp-stap, en een nieuwe test `scripts/storyallies_test.mjs` controleert de gevolgen van de M23-keuze. De 60 fps te voet in de stad is nog niet gehaald (45 tot 49 fps).
- **Vaarnettest:** `vaarnet_province_test` hield geen rekening met de gatenpatches die binnenvaartschepen sinds #234 nodig hebben; dat is rechtgezet (26 van 26 groen).

## [0.37.0] - 2026-10-19

### Nieuw
- **Het begin van het verhaal is herbouwd (nog niet gespeeld, wel door onafhankelijke lezers gecontroleerd):** opening en missies 1 t/m 6 hebben nu één doel per missie, een reden vóór de actie, minder personages tegelijk en kortere dialogen. Missies eindigen met het volgende doel.
- **Opnieuw proberen kost niet meer de hele missie (nog niet in beeld bekeken):** na falen begin je bij het laatste checkpoint, met een Opnieuw-knop die je met voertuig en metgezel bij de start zet. Uit je voertuig stappen is niet meteen mislukt: je krijgt een paar seconden om terug te gaan.
- **Hulp en toegankelijkheid (nog niet in beeld bekeken):** een Hulp-tab met meer tijd, minder schade en ruimere vliegpoorten, een aanbod na twee mislukkingen, een oefenronde, bewegingsreductie voor camerabeving en flitsen en nieuwe prestaties (Rookwolk, Raampje open).
- **Voertuigdeuren, motorkap en kofferbak (nog niet in beeld bekeken door een mens):** deuren gaan open bij in- en uitstappen, bussen hebben dubbele deuren, en bij schade raken deuren, kap en kofferbak beschadigd en gaan ze los, met rook en vuur bij zware schade. In de garage kun je ze laten repareren.
- **Autointerieur, lekke band en schade (nog niet in beeld bekeken door een mens):** dakhemel, stijlen en portierbekleding, een kleiner wiel bij een lekke band, deuken per zone, gebarsten glas en een zichtbaar wrak.
- **Zwemmen en klimmen uit het water, en je flat inrichten:** de speler zwemt en klimt uit het water, en in de flat zijn kast en bureau te verplaatsen naar vaste wandplekken.
- **Zeilregatta, evenementen en bijbanen (nog niet in beeld bekeken door een mens):** een regatta met tonnen, rondes en medailles met een windwijzer in beeld (Q en Z voor het zeil), zomerevenementen met kaartmarkers waarvoor de routeplanner afsluitingen mijdt, en de veerdienst, strandpost, kermisdraai en brugdienst als bijbaan.
- **Fotomodus met touchbesturing en een compacte indeling voor een telefoon liggend (nog niet op een echt toestel getest):** slepen kijkt, knijpen zoomt; de linkerknoppen staan naast de minimap en het pauzemenu is compacter.
- **Meer herkenbare plekken (nog niet in beeld bekeken door een mens):** perrons met lantaarns, bankjes en overkappingen, fabrieksschoorstenen, zendmasten met platform en schotel, monumenten met plein en paaltjes en parken met heggen, vijver en lantaarns.
- **Varen (nog niet in beeld bekeken door een mens):** een waypoint op water geeft nu een vaarroute via het vaarnet, binnenvaartschepen varen alleen op hoofdvaarwegen en havens, en het water ligt niet meer dubbel over elkaar.
- **Kaart:** het slotenlabyrint over zee en buiten de grens is weg. Op minimap en kaart staan de grenzen met Friesland, Drenthe en Duitsland, met de landnamen. De procedurele weide wordt alleen nog op provincieland getekend.
- **Sloten en weilandranden uit echte data (nog niet in beeld bekeken door een mens):** echte sloten, greppels en beken uit OSM staan in de tegels, onderbroken waar ze een weg of spoor kruisen; waar het spoor een hek knipt staat aan beide kanten een hekpoort; er staan geen hekken of vee meer op akkerland.
- **Geluid (nog niet gehoord):** sluisgeluiden, een geluid voor het einde van een minigame en harder gemaakte zwakke effecten (deur, motor, fietsbel, overweg, treinhoorn, vuurpijl, camera, alarm, melding). Alle samples worden bij de start voorgerenderd, zodat het eerste effect niet meer stil is.
- **De muziek die door ons zelf was gemaakt is weg:** de gesynthetiseerde nummers, het kermisorgel en het zendersignaal van Nachtstreek zijn verwijderd; de muziek van Gemini en alle geluidseffecten blijven staan.
- **Prestaties:** de provinciekaart vreet geen kwart van de hoofdthread meer (de minimap ververst maximaal elke 33 ms), de gebouw- en wegbatchers mogen 3 ms per frame samenvoegen (de ring ging ongeveer 20 % sneller) en wegen bij snel reizen laden eerst wat voor je ligt. Te voet in de stad haalt een sterke pc nu ongeveer 47 tot 49 fps; dat is nog niet genoeg.
- Bijrijders: sommige auto's hebben een passagier naast de bestuurder; bij autodiefstal stappen zij uit en rennen weg. In een enkele geparkeerde auto wacht iemand, die bij diefstal uit de auto wordt gehaald.
- **Waddenzee, Eems en Dollard zijn open water voor boten (nog niet in beeld bekeken):** je botste op open zee tegen een onzichtbare wal, omdat de kaart daar alleen een kustlijn heeft en geen water. Binnen de zeegrens vaar je nu overal vrij; de kust blijft een oever.
- **Keuzes met gevolg in akte 4 en 5 (nog niet in beeld bekeken):** in M23 kies je wie naast de Fjord Frituur rijdt (Wubbo's bus, Tinus' trekker of Geesjes scooter); dat bepaalt hoe lang Jelles limo wegblijft en keert terug in de finale, met meer tijd bij de limo en een bredere timing voor zijn straat. De intake bij Wiebelwerk (M18) heeft drie vragen: elk fout antwoord maakt de accountmanager argwanender, tot de camerahal sneller wordt en de beveiliging meeloopt. In de finale sluit de colonne van M23 eerst de straten af, daarna volgt de jacht op de limo.
- **Verhaalteksten gevarieerd (nog niet in beeld bekeken):** replay-regels en binnenkomsten per persoon in plaats van één formule, de Krolbrug-grap krijgt een slot in de epiloog, geen gasregel meer bij Loppersum, fietsknooppunten, het Leugenbankje en Appingedam in de autogesprekken.
- **Stijlgids en gelijkenistest voor het verhaal:** `docs/verhaal/STIJLGIDS.md` (stemmen, verboden zinsbouw, feitenblad) en `scripts/story_similarity_test.mjs`, die identieke en bijna-identieke regels en de verboden zinsbouw vlagt.
- **Perrons, schoorstenen, zendmasten, monumenten en parken uit de kaartdata:** bij stations liggen perrons met lantaarns, bankjes en overkappingen, fabrieksschoorstenen en zendmasten steken boven het land uit, wegkruisen en monumenten staan op hun plek en parken hebben bomen, een zandpad en banken. Per cel is er een vast budget.

### Opgelost
- **De spelklok stond stil na twee mislukkingen:** het hulpaanbod bleef open staan en pauzeerde de wereld; bots en spelers kunnen er nu altijd doorheen.
- **Laadschermen toonden twee laadbalken (#226):** er is nu één balk per fase.
- **Overlays over elkaar, een kapot teken in de HUD bij discgolf en wandelen, de wandel-HUD onder de duif en een lege Hulp-tab:** gerepareerd; lange waarden op de resultaatkaart wrappen netjes.
- **Auto's zonken op 19 brugovergangen en op open zee voer je tegen een onzichtbare wal (nog niet in beeld bekeken door een mens):** de waterstukken die over wegen lagen zijn weg en de Waddenzee, Eems en Dollard zijn open water voor boten.
- **Plekken in water of op onbereikbare grond:** de kroegentocht, bruggen, Wiebelwerk, het beleg van Bourtange, de Museumbus en vier evenementen staan een paar meter naar vrije grond, en een groot los wegenstuk in het noordwesten hangt nu aan het net.

### Intern
- **Eén commando voor alle tests:** `node scripts/test_all.mjs` met een rapport, een spelbot die de hele game speelt (de verhaaltest van missie 1 t/m 26 slaagt), een prestatieopname per route, beeldrondes met automatische controle en een coöp-testbank waarin twee echte instances via de lobby verbinden. De speelklok in coöp is nog niet gedeeld.
- **Android:** het spel start op een emulator en je kunt een nieuw spel starten; echt spelen met touch na de openingsscène is nog niet getest. Er is geen APK om te installeren.
- **Minder importcycli en opruiming:** de grootste cyclusgroep ging van 169 naar ongeveer 139 modules; een stijlgids met een test voor het verhaal.

## [0.36.0] - 2026-10-18

### Nieuw
- **Weilandranden en vee houden zich aan wegen, water en spoor:** hekken, heggen en koeien staan niet meer op het spoor (ook ver van de stad), niet in water en niet op wegen; de draad loopt door over de tegelnaden zonder gat, hangt niet over sloten en gemapte hekken lopen niet door voetpaden, spoor en huizen. Een audit (`prop_conflict_audit`) telt dit per streek.
- **Stille levering voor Kliniek Van der Meden (nog niet gespeeld of in beeld bekeken):** een zachte zijmissie: kussens en thee zo rustig naar de verzonnen kliniek rijden dat niets rammelt, en bij de poort wachten tot de portier knikt. (Refs #26)
- **Cutscenes: geen kaal lang shot meer in Even pinnen en Mems poederkelder (nog niet in beeld bekeken):** M02.intro en M20.3 krijgen camerabeweging, ook met de echte stemduren. (Refs #224)
- **Cutscenes laden de omgeving langs het camerapad vooraf (nog niet in beeld bekeken):** verhaalscènes bouwen en houden de tegels rond hun shots, en geparkeerde auto's volgen waar de camera kijkt. (Refs #157, #20)
- **Hints volgen wat je gebruikt (#151, #200, nog niet met een echte controller of toestel getest):** het spel merkt zelf of je toetsenbord en muis, een controller of aanraking gebruikt en wisselt tussen toetsletters en knopsymbolen, zonder instelling. Ook bij gemengd gebruik wint de laatste echte invoer; een muisrimpel of een toets die de controller zelf maakt telt niet. Met een controller verdwijnt de muiscursor tot je de muis beweegt.
- **Geluiden beschrijven (#200, nog niet in beeld bekeken):** onder Instellingen › Geluid › Ondertitels staat 'Geluiden beschrijven' (standaard uit). Aan: bij belangrijke geluiden staat kort wat het is, bijvoorbeeld [sirene], [claxon], [explosie] of [alarm, in de verte]. Zelfde geluid niet vaker dan eens per ruim twee seconden, hooguit drie tegelijk.
- **Zuinige modus en notch (#96, niet op een echt toestel getest):** Instellingen › Beeld heeft 'Zuinige modus': 30 beelden per seconde in plaats van het maximum, voor minder batterijgebruik en warmte. De HUD-hoeken (speler, tijd en geld, minimap) blijven buiten de uitsparing van een telefoonscherm.
- **Schermtoetsenbord voor de controller (#151, niet met een echte controller of in beeld getest):** druk met de onderste knop op een tekstveld (spelnaam, coöpcode, zoeken) en er opent een toetsenbord dat je met het D-pad bedient: onderste knop typt, linker knop wist, bovenste knop spatie, LB/RB verplaatst de cursor, rechter knop sluit. De schermgraaf voor de controller kent nu ook het reuzenrad en het toetsenbord.
- **Spijkermat van de politie:** vanaf vier sterren ligt er voor een wegblokkade een spijkermat dwars over de weg. Rijd je er overheen, dan krijg je meestal een lekke band (naar de garage). Verder niets.
- **Akte 1 duidelijker, appjes op de goede stap (nog niet in beeld bekeken):** Gronings Ontzet wordt in de opening uitgelegd, de complimentenladder van Berend begint in de eerste missie, de hoedgrap en het slot van missie 1 zijn helderder, Jelle is in akte 1 één persoon, en 'stelen om te bewaken' heeft een reden. Mem-appjes en andere stille berichten komen op de stap waar ze over gaan, zonder dubbele bezorging. Akte 3 en 5 krijgen een terugblik, Jelle en de Zitmoi komen vrij in het verhaal, de reisbeats beginnen op de goede plek.
- **Eén nacht, volgens de zon:** de straatverlichting, de nachtzender, de rustige straten, de beroving en de missies die 's nachts moeten, gebruiken nu allemaal dezelfde nacht: wanneer de zon laag genoeg staat. In de zomer begint de nacht later en is hij korter, en alles schakelt tegelijk.
- **Politie let op opgevoerde brommers in het verkeer (niet in beeld bekeken):** rijdt een opgevoerde AI-brommer langs een politiewagen, dan staat er één keer per bestuurder een korte melding in de berichten. Geen ster en geen boete. (Refs #17)
- **Bord voor het verlaten van de plaats, aanvaringsmelding en schepen op de grote wateren (nog niet in beeld bekeken):** bij het uitrijden van een plaats staat een bord met de naam doorgestreept, plaatsnamen staan gecentreerd, een schip dat een brug raakt geeft een korte melding, en het Eemskanaal, het Reitdiep, de Dollard en de Waddenzee zijn vaarwater voor binnenvaartschepen.
- **Laadschermen scherper en rustiger (#188):** de achtergrond is niet meer vervaagd of te donker, de beelden zoomen minder, de overlay is rustiger en bij het laden van een missie kan het beeld van die missiesoort worden gekozen. Op het allereerste laadscherm staat nu alleen het 18-pictogram, zonder tekst.
- **Wegdekken lopen soepel in elkaar over (nog niet in beeld bekeken):** waar asfalt, klinkers, fietspad of grind op elkaar aansluiten (ook asfalt van een hoofdweg tegen dat van een gewone weg) lopen de kleuren over een paar meter in elkaar over in plaats van met een rand. Op de kartbaan in Ulrum lopen de rood-witte biezen aan het begin en einde smal uit in het asfalt.
- **Meer leven in de provincie (nog niet in beeld bekeken):** drie streken erbij (Westerwolde, Lauwerskust en Hunsingo) met een zomerevenement, ontmoetingen onderweg en elk drie vondsten en een geheim, en stadsprofielen voor Stadskanaal, Zoutkamp en Winsum. Straatnamen en vondstplekken zijn gecontroleerd tegen de kaart; vier vondsten lagen in een gebouw of in het water en liggen nu langs een weg. De prestaties voor streekvondsten en streekgeheimen vragen nu 24 en 8.
- **Laad- en startscherm weer in de stijl van het spel (nog niet in het echte spel bekeken):** achter het laadscherm en het startscherm staan weer echte beelden uit het spel (de gracht, de markt, de ringweg, de kermis bij nacht, Grunn van boven) in plaats van de losse getekende scène, met het echte logo.
- **Varen van de stad tot de Waddenzee (nog niet in beeld bekeken):** er is nu een vaarnetwerk van de Groninger grachten, het Reitdiep en het Eemskanaal tot Lauwersoog, de Eems bij Delfzijl en de Dollard bij Termunterzijl, en tot het Lauwersmeer. Beweegbare bruggen gaan voor je open, voor een sluis reken je een wachttijd, en gaten in het water onder bruggen en bij sluizen zijn gedicht. De grote kanalen (Reitdiep, Eemskanaal, Van Starkenborghkanaal, Winschoterdiep, Noord-Willemskanaal) en het Lauwersmeer zijn vaarwater voor binnenvaartschepen; die kiezen een route zonder te lage brug. Voor de kust ligt een stuk zee tot de omkeerlijn, waar de Grenswacht of de Kustwacht je terugstuurt. De tegels langs je route laden vroeg.
- **Varen van de stad tot de Waddenzee (nog niet in beeld bekeken):** er is nu een vaarnetwerk van de Groninger grachten, het Reitdiep en het Eemskanaal tot Lauwersoog, de Eems bij Delfzijl en de Dollard bij Termunterzijl, en tot het Lauwersmeer. Beweegbare bruggen gaan voor je open, voor een sluis reken je een wachttijd, en gaten in het water onder bruggen en bij sluizen zijn gedicht. De grote kanalen (Reitdiep, Eemskanaal, Van Starkenborghkanaal, Winschoterdiep, Noord-Willemskanaal) en het Lauwersmeer zijn vaarwater voor binnenvaartschepen; die kiezen een route zonder te lage brug. Voor de kust ligt een stuk zee tot de omkeerlijn, waar de Grenswacht of de Kustwacht je terugstuurt. De tegels langs je route laden vroeg. Al het bevaarbare water van de provincie zit in het net (duizenden kilometers vaarten, kanalen en meren); sloten en kleine vijvers bewust niet. De kaartroute voor een boot loopt over dat net, langs bruggen en sluizen en onder de hoogte van je boot.
- **Kaart en minimap volgen je missie (nog niet in beeld bekeken):** tijdens een missie zoomt de minimap in op het gebied dat telt en laat de rest weg. Bij een kartrace zie je het parcours met de controlepunten en de tegenstanders, bij een achtervolging het zoekgebied en de politie, bij de duif het volgende voerplekje, bij boten de bruggen met hun doorvaarthoogte en bij de heli de ringen en de landingsplek. Op de kaart staan afstand, richting en aankomsttijd van het doel, met een waarschuwing bij een te lage brug of een gevaar vlakbij.
- **Nieuw verhaal, akte 2 "Het Noorden is groot" (proefversie):** Fatbikes en Oma's lijstje, de trein naar Winsum, zestig eieren heel over de wierdepaden naar de kerkkelder in Usquert, een achtervolging met Jelles trekker-limo op een quad (met Jelle in de sloot bij Uithuizen), de streekbus naar Zoutkamp en de kustmissie: Jelles skûtsje inhalen over het Reitdiep en het Lauwersmeer, een nacht op de zandplaat en zout halen op de kwelder bij Noordpolderzijl, terwijl het zoeklicht van de kustwacht heen en weer gaat (bukken met Ctrl) en het water komt. Daarna wacht akte 3. De plekken zijn nog niet in beeld bekeken.
- **Nieuw verhaal, akte 5 "Ontzet" (nog niet in beeld bekeken):** Een luik erin (de modder in, Tinus trekt je eruit, de avond in de schuur), de colonne van Oma's vrienden naar de Grote Markt, de vlag van d'Olle Grieze, het bod in Oma's keuken en de finale met bakken, blokkade bij de notaris en de jury. Bakken doe je met de toetsen 1 tot en met 6 in Oma's volgorde. De nieuwe regels zijn nog niet ingesproken en verschijnen als ondertitel.
- **Nieuw verhaal, akte 4 (Zuidwaarts, proefversie):** elf bruggen in Veendam met de sloep, een intake bij een webbureau en het logboek van 12 augustus, een stilstaande stoomtrein bij Stadskanaal, het Beleg van Bourtange met de kruitkelder, en de twee solodelen bij Zuidhorn (Tessa en de wagon, Tammo en de vrienden). De plekken zijn nog niet in beeld bekeken; de akte is pas speelbaar als akte 2 en 3 zijn gebouwd.
- **Padel voelt als padel:** je serveert nu onderhands (bal laten stuiteren, onder de heup raken, schuin in het servicevak; twee fouten zijn een punt), de bal mag tegen glas en gaas terugspelen met eigen geluid, je speelt met een pala en een potje is een korte set tot vier games met 15-30-40 en een golden point.
- **Padel en Pitch & putt op de echte plekken:** padelbanen staan nu waar ze echt zitten, in de stad en in het Ommeland, met de echte stand van de banen. Pitch & putt heeft zes holes op de echte golfbanen (onder meer Pitch & Putt Groningen bij het Hunzepark); loop naar de eerste tee en druk E. Alles staat ook als icoon op de kaart.
- **Tammo in de mand:** bij de ballonvlucht in het verhaal staat Tammo nu op de vloer van de mand, kijkt naar de heli en schommelt mee met de ballon, in plaats van op heli-hoogte te hangen.
- **Rustigere HUD:** de melding "x prestaties wachten" is weg uit beeld. Nieuwe prestaties zie je als stille stip bij Prestaties in het pauzemenu.
- **Rustiger winkelscherm:** elk product heeft een eigen laagpoly-icoon, een korte eigenschap en een duidelijk label (Kan ik kopen, Heb ik al, Te duur, Op slot). Winkels met meerdere afdelingen krijgen tabs (pijltjes links/rechts, of de knoppen op het scherm). Als je te weinig geld hebt, zie je hoeveel je nog mist. Bediening met toetsen, muis, controller en aanraking; de hints onderin zijn witte toetsknoppen of controllerknoppen.
- **Nieuw verhaal, akte 3 "Aan de Eems":** vijf missies tussen Lauwersoog, de Eemshaven, Delfzijl en Winschoten. In de heli van Dokter Dijkstra naar het UMCG en de gele ballon boven de Dollard (Tammo hangt aan de lier), een sluipmissie tussen de containers van de Eemshaven met een kraankooi, een race over de dijk naar de sluis van Delfzijl tegen Jelles trekker-limo, een treinreis naar Winschoten, een vlucht in Roelfiens gewasspuiter met een spandoek laag over de kermis, en een kroegentocht langs drie kermistenten, en dan een scène bij de botsauto's met de eerste kus en de stille dijk. Alle nieuwe regels zijn tekst, zonder stem.
- **Betere benchmark:** de benchmark rijdt nu een vaste route van ongeveer een halve minuut door stad, provincie, water, een drukke scène en een cutscene. De resultaatkaart toont gemiddelde fps, p95-frametijd, laagste 1% en geheugen (als je computer dat geeft), per situatie, de vergelijking met de vorige keer en een aanbevolen stand (Laag, Gem. of Hoog) met uitleg. Esc stopt de benchmark; de knop staat in beeld.
- **Reizen met het openbaar vervoer:** kies je op de kaart een bestemming, dan zie je naast zelf rijden ook de trein-, bus- en bootopties, met lijnkleuren, haltes, overstappen, prijs en reistijd, en de lijnen op de kaart. Meerijden speelt een korte reisscène; houd je niet van wachten, dan sla je hem over met Spatie en sta je meteen op je bestemming.
- **Geen magisch snelreizen meer:** Shift-klikken op de kaart om te teleporteren is weg. Reizen kan zelf rijden of meerijden.
- **Beweegbare bruggen met stoplicht:** bij elke brug die open kan staat nu aan beide waterkanten een bootstoplicht (rood tot de brug open ligt, dan groen), en je krijgt een korte melding als de brug open gaat en als hij openligt. Ook de wegmarkering gaat nu mee met het brugdek.
- **Drie nieuwe zijmissies in de stad:** "Het Loket" (formulier, wachtrij en stempel), de "StudieStaat-balie" (rekenen aan een verzonnen studieloket) en "Borrel bij Vigilantia" (tafelspeech van een verzonnen studentenvereniging). Telkens drie vragen aan een balie; een fout antwoord betaalt alleen minder.
- **Low-poly beeld op de laadschermen:** het startscherm en alle laadschermen tonen nu een rustige low-poly scène (stad, nacht, platteland of gracht met boot) met langzame wolken, zon en een draaiende molen, in plaats van een foto.
- **Radio valt niet meer stil:** als de muziek hoort te spelen maar stil staat (vastgelopen nummer, een gemist einde, een pauze die nooit eindigt), probeert de radio het eerst opnieuw en kiest daarna zelf het volgende nummer; N hoeft niet meer.
- **Zeven nieuwe radionummers:** G-Music draait nu ook donkere drill, post-punk, hardstyle, phonk, een levenslied, smooth R&B en een zomerhit, helemaal door het spel zelf gemaakt. Ze verschijnen een paar seconden na het opstarten één voor één in de afspeellijst.
- **Rustiger laadschermen:** de voortgang van het laden staat nu als twaalf tegels die oplichten, met korte tips van één regel. Een korte sprong (snelreizen in de buurt) krijgt een klein scherm met alleen de plaatsnaam, en het scherm dekt direct, zodat je de nieuwe plek niet even ziet verschijnen.
- **Brommers en motoren in het verkeer:** er rijden nu brommers en motoren rond, meer in studentenwijken en het centrum, minder 's nachts. Ze blijven op de weg en nooit op het fietspad; een gewone brommer houdt zich aan 45 km/u, een enkele is opgevoerd.
- **Spookrijder op de kartbaan en in de driftzones:** je beste race bij Kardinge en je beste ronde per driftzone worden bewaard en rijden de volgende keer als doorzichtige spook mee.
- **Machinist:** in een gekaapte of geparkeerde trein start G een dienst: halte voor halte stoppen op de streep, op tijd en onder de snelheidsborden. Het bord toont snelheid, maximum, remweg en je vertraging; je krijgt punten en een medaille. Backspace stopt de dienst.
- **Binnenvaartschepen:** op de brede vaarten varen nu spitsen en Kempenaars met een stuurhut, luiken en eigen namen. Ze trekken langzaam op en draaien ruim. Ze varen niet onder lage vaste bruggen door en blijven ervoor stilstaan.
- **Jachthavens:** acht jachthavens met vingersteigers en afgemeerde sloepen, kano's en andere pleziervaartuigjes langs de kades van de stad.
- **Meer variatie in het verkeer:** elektrische auto's (Wadden Stroomer, Hunze Zoemer, Reitdiep Voltje) met een stille zoemende motor, en opgevoerde tokkie-auto's (Dollard Dreunbak, Eemshaven Knalpot, Hunze Bonkerd) met vleugel, dikke uitlaat, blauw licht onder de auto en een luide, schelle motor. Elektrisch rijdt vooral in de rijkere buurten, tokkie vooral bij de studenten.
- **Lekke band:** na een harde klap kan een band van je eigen auto, fiets of scooter lek gaan. Je rijdt dan trager en de wagen trekt scheef. De garage (of fietsenmaker) plakt hem, tegen een kleine meerprijs. Een lekke band blijft bewaard in je savegame.
- **Vier nieuwe minigames:** pannenkoeken bakken op het pannenkoekenschip De Gouden Pan (afgemeerd bij de Noorderhaven), hengelen aan het Meerstad-meer, de stempelwandeling door Winsum (je blijft vrij om te lopen) en discgolf met keuze uit de achterste negen, alle achttien holes of een dichtstbij-de-mand-wedstrijd. In de Martinitoren speel je op het carillon.
- **Kroketkoning:** een verzonnen snackbarketen door de provincie: koop de snackbars een voor een, verbeter ze en leeg de kassa's zelf.
- **Zeven steden met eigen karakter:** Delfzijl, Appingedam, Veendam, Winschoten, Hoogezand-Sappemeer, Leek en Uithuizen krijgen eigen straten, sfeer, props en winkels en een regel onder de plaatsnaam. Per streek zijn er zomerevenementen, toevalsontmoetingen, verzamelspullen en geheimen.
- **Hoogvlieger:** rijd mee in het reuzenrad op de kermis.
- **Politie let op meer dan sterren:** de politie beschrijft je voertuig; wissel van voertuig of verf het en de zoektocht stopt sneller. Rood licht, tegen het verkeer in en te hard rijden kosten een boete, maar alleen met een agent in zicht en zonder ster. Bij schieten vanaf drie sterren geldt een vaste grens. Wie een auto steelt, merkt dat de bestuurder reageert: hij zwaait, rent mee, klopt op het raam, belt of wijst een agent aan.
- **Busdienst:** buslijnen met haltes, een dienstregeling, op tijd rijden, in- en uitstappen en een score per rit. Daarnaast een bijbaan met een vrachtwagen met oplegger die je koppelt en aflevert, en een arcade-vliegtuig met opstijgen, overtrek, landen en crash.
- **Rand van de wereld:** bij de rand van de kaart staat nu een reden om om te keren: een grenspost met slagboom, een patrouilleboot, mist of een hunebed op de weg. Je wordt teruggezet met je gezicht naar binnen.
- **Rustigere wereldmarker:** een zachte gloeiende marker met een dunne kolom en ring en een trage puls.
- **Kaart bij nacht:** de minimap en de grote kaart krijgen 's nachts een donker palet, met lijndikte die meeschaalt.
- **Duidelijker bij kleurenblindheid:** de HUD toont meters met vorm naast kleur, en de minimapring, tijd en sterren volgen het gekozen palet.
- **Nieuw HUD-uiterlijk:** het voertuig-HUD toont per voertuigsoort wat erbij hoort; randen en afstand schalen van 720p tot 4K.
- **Controller en aanraakbediening:** een betere dode zone, keuze van het pad, menunavigatie met de richtingspijlen, een indeling met wisselende letters, de radio op het kruis te voet; de toetsknoppen veranderen op het scherm in knopsymbolen als je de controller gebruikt. Op telefoon en tablet is er een virtuele stick, camerabeweging met een veeg en knoppen per situatie, met veilige randen, zonder zoomen of doorveren en met grafische profielen voor mobiel.
- **Eén verhaal (nog niet in beeld bekeken):** het oude verhaal is weg; het nieuwe verhaal is nu het enige. De keuze tussen Klassiek en Nieuw is verdwenen uit Instellingen en van het startscherm: Nieuw spel begint gewoon bij het begin. Had je een savegame van het oude verhaal, dan gaat die door in het nieuwe verhaal: je geld, spullen, voertuigen, kleding, prestaties, streken en instellingen blijven, het verhaal begint opnieuw bij het begin. Dat meldt het spel één keer als je laadt. Je oude savegame blijft op je apparaat staan.
- **Garage en prestaties:** de garage is een kaartenraster met een silhouet per voertuig; bij de prestaties staan voortgangsringen.
- **Nieuwe verhaaldelen:** reisbeats in het nieuwe verhaal (meerijden, zelf rijden of overslaan bij een lange sprong, met aankomsttijd; nog achter een schakelaar) en een lokale co-op voor twee spelers (nog achter een schakelaar). De thuisavonden en de huisopening zijn opnieuw geregisseerd, met acteurs die lopen, gebaren en kijken.

### Opgelost
- **Bussen rijden hun lijn (nog niet in beeld bekeken):** als er een echte buslijn in de buurt is, zijn de bussen om je heen die van die lijnen (meerdere lijnen per plek) en niet meer willekeurige bussen op de hoofdwegen (#80).
- **Plaatsnaamborden op de grens van het bebouwde gebied (nog niet in beeld bekeken):** de afstand van het bord tot het dorpscentrum volgt nu uit het aantal inwoners (een geschatte straal) in plaats van één vaste afstand per soort. Echte bebouwde-komgrenzen blijven een schatting (#73).
- **Dubbele voertuigen (nog niet in beeld bekeken):** een voertuig dat tweemaal in de lijst staat of twee identieke voertuigen op één plek (bijvoorbeeld een busje van een missie dat dubbel gespawnd is) worden samengevoegd, zodat een botsing er geen drie busjes van maakt. De oorzaak van de melding is niet gereproduceerd (#211).
- **Rijstrookstrepen bij wisselend aantal stroken (nog niet in beeld bekeken):** waar een weg meer rijstroken heeft dan de weg waarmee hij doorloopt, buigt de overtollige strook over 35 m naar de streep van de andere weg in plaats van abrupt te stoppen (#130).
- **Minimap en kaart in het Ommeland (nog niet in beeld bekeken):** het platteland wordt nu ook getekend op kaarttegels ver buiten de proefstrook en zonder provinciebestanden, in plaats van een leeg vlak (#244).
- **Opgeslagen spellen:** het scherm en menu-item heten "Opgeslagen spellen"; de knoppen heten Spel opslaan, Spel laden, Spel verwijderen, Spel exporteren en Spel importeren. De plekken heten standaard "Opgeslagen spel 1", "Opgeslagen spel 2" (#150). Je bestaande savegames en namen blijven werken.
- **Samen spelen, foutmelding:** als de verbinding met de gastheer mislukt, praat de melding nu Nederlands over de gastheer (#150).
- **Verhaal, akte 1:** M12 begint op het UMCG-dak en eindigt in de Eemshaven, M13 slaapt in het havenkantoor, de Mem-aftelling klopt met de kalender; het Loket krijgt een wachtbeat en doelen worden hardop gezegd. Een vluchtende tankwagen met vet remt niet meer voor je: inhalen of stukschieten. Een geheime deur zit op de gevel van de Martinitoren. Zonder stem krijgen regels in een scène een zacht gemurmel.
- **Routes en wandelen:** bruggen tellen niet meer als dwars door een gebouw, zodat de route van het station naar de Kerk de goede brug neemt; voetgangers mogen tweerichtingsviaducten oversteken (Hereweg); de route verdwijnt als het doel binnen bereik is.
- **Wereld:** huizen, hekken en heggen staan niet meer in water, op wegen of in huizen; steigers van dorpen blijven van wegen en gebouwen af; naast elkaar liggende rijbanen van een dubbele weg nemen elkaars breedte over; geen verkeer of politie in de privégarage van Tammo en Tessa.
- **Kleine dingen:** de duif schopt geen fietsen meer om; Jelle springt niet meer over een gracht waar een brug in de buurt is; je eigen boot bij het huis verdwijnt niet bij het opruimen van het verkeer; een fatbike telt als fiets voor missies; de automatische versnelling schakelt niet meer heen en weer; schaduwen slaan geen beeld over als de camera snel beweegt; de rondvaartfiguren gaan mee met een zinkende boot.
- **Kaart en berichten:** open water in de Ommelanden is even vol als stadswater op kaart en minimap; kaart-iconen zijn groter met een gekleurde rand per categorie; in het pauzemenu zijn de legenda-, lagen- en routebalken weg; telefoonberichten hebben geen Esc-hint meer.
- **Radio:** stilte en te korte bestanden komen niet meer in de keuze.
- **Viaducten bij het Emmaviaduct:** het viaduct en de Brailleweg gaan nu hoog genoeg over de Zaanstraat-busbaan (die lag eerder bijna onder het dek). Schuine kruisingen met fietspaden houden de vrije hoogte over de hele breedte van het pad.
- De meldingen van de politie dat je ergens niet mag rijden, lopen of fietsen zijn weg. Blijf je lang op zo'n plek, dan krijg je nog wel een ster.
- **Verkeersruzie:** na een harde botsing of lang getoeter stapt een boze bestuurder soms uit, scheldt en deelt kleine klappen uit (nooit het laatste stukje gezondheid, geen bloed). Sommigen hebben een klomp, bezem, fietspomp of waterpistool bij zich (slapstick, geen knuppels of echte wapens). Een agent te voet in de buurt komt erop af. Instelbaar onder Instellingen › Meer opties › Verkeersruzie (uit, weinig, normaal, veel).
- **Wapens oppakken:** sla een ruziemaker neer, of tot hij het opgeeft, dan laat hij zijn spullen vallen. Loop erheen en pak ze op met E.

- **Meer leven op straat:** skateboarders rollen door de studentenwijken en het centrum. Een kennismakingsweek-groepje (Dispuut De Gulle Gans) loopt met pluche ganzen door de stad. Wijken hebben nu ook eigen kleding en tassen voor voetgangers. Er zijn meer bezorgers op de fiets, een vierde keten (Pakkie Pronto) en bezorgers te voet met een grote tas.
- Het weer is nu per streek van de provincie verschillend: zon, bewolking, mist in de ochtend, motregen, buien en onweer. Altijd zomer.
- **Binnenin-camera in de auto:** druk op V tot 'Binnenin': je zit achter het stuur, met dashboard, stuur dat meedraait, instrumenten, stoelen en een achterbank in laag-poly stijl. Alleen voor personenauto's; bussen, vrachtwagens en trekkers houden de gewone camera.

## [0.35.0] - 2026-10-18

### Nieuw
- **Nieuw verhaal, nu standaard (proefversie, alleen akte 1):** een nieuw verhaal in vijf akten door de hele provincie. Akte 1 (de stad, M01 tot en met M07) is speelbaar; daarna zie je 'Akte 2 volgt' en wacht het verhaal op de volgende versie. Het nieuwe verhaal is de standaard voor iedereen, ook voor wie al een save had. Je oude save is niet weg: die staat onaangeroerd onder Klassiek. Op het startscherm staat 'Doorgaan met Klassiek' als je een oude spelstand hebt; onder Instellingen › Verhaal (en op het startscherm) wissel je tussen Klassiek en Nieuw. De nieuwe tekst is nog niet ingesproken: die verschijnt als ondertitel.
- **Tekst zonder stem:** regels die nog niet zijn ingesproken verschijnen als ondertitel met naam en kleur, en appjes worden niet voorgelezen. Rikus praat op de radio niet tijdens een missie.

### Opgelost
- **Lantaarns verdwijnen niet meer na het opnieuw laden van een tegel:** een weg die opnieuw wordt geladen, krijgt zijn lantaarns terug in plaats van ze als te dichtbij af te wijzen.
- **Geen deuren en automaten meer in gebouwen:** de kaartautomaat van station Uithuizen, de frituur aan de stadsrand bij Ulgersmaborg en de winkels aan de rand van het gebied waar winkels, cafés en garages een deur krijgen stonden in een pand. Ze stappen eruit zodra de tegels eromheen binnen zijn.
- **Scrollen in 'Wat is er nieuw':** met het muiswiel scrol je nu in de lijst met wijzigingen en in 'Over' op het startscherm.
### Verbeterd
- **Eén waterpad voor de hele provincie:** de oude Ommeland-waterlaag (`countrywater.js`, `countrywatergeo.js`, de watergeometrie in de worker) is weg. Het water van de tegels is overal de enige bron: boten, zwemmers, waden, zinkende auto's, politieboten en het geluid van klotsend water gebruiken dezelfde `waterAt`. De grondshader opent de grond boven het tegelwater en tekent het water zelf waar de grond nog niet open is (`tilewatermask.js`).
### Verbeterd
- **Huizen in smalle straten:** woningen die in oude straten tot op een meter van het wegmidden stonden, houden nu 1,5 m afstand, zodat je auto er niet meer tegenaan botst (`scripts/world/building_clearance.mjs`).
### Verbeterd
- **Kaart en minimap kennen de hele provincie:** een lijn op de provinciegrens (gestippeld, per buurland een eigen kleur), buiten Groningen een donkerder tint, en de namen FRIESLAND, DRENTHE, DUITSLAND, WADDENZEE, EEMS, DOLLARD en NOORDZEE in de kaart. De grote kaart zoomt uit tot de hele provincie past. Nieuw: `regions.js`, `regiondata.js`, `scripts/regions_test.mjs`.
- **De zee is te zien:** de Waddenzee, de Eems, de Dollard en de zee om de eilanden zijn water in dezelfde kleur als het stadswater, met een oeverlijn, op de kaart en op de minimap. OSM heeft alleen de kustlijn; het zeevlak wordt daaruit getekend.
- **Plaatsnamen op de kaart en minimap:** steden, plaatsen, dorpen en buurtschappen uit de provinciegegevens, per zoomniveau en zonder dat namen over elkaar vallen. Op de minimap staan de grote plaatsen ook als ze net buiten beeld liggen, aan de rand.
- **Echte gebiedsnaam in plaats van "Ommeland":** onder de muis op de kaart en op het HUD staat de plaats, de wijk of de streek (Friesland, Drenthe, Duitsland, Waddenzee, Eems, Dollard). "Ommeland" blijft alleen voor open Gronings land, met "bij <plaats>" eronder.
- **Scherpe kaart bij inzoomen:** bij inzoomen in de provincie laadt de kaart de tegels onder het beeld, zodat wegen, gebouwen en water als vectoren scherp zijn in plaats van de grove 20 m-pixels van de basiskaart.
- **Het hele oude Ommeland loopt over de tegels:** de 27 tegels in de zuidwesthoek (Peize, Foxwolde, Winde: voorbij de strook van het OSM-extract) worden uit de oude gegevens gebouwd, en elke stadstegel met een restje buiten de stadsdata krijgt een overlay. Elk gebouw, elke weg en elk spoorpunt van het oude gebied ligt nu in een tegel (`scripts/ommelandtegels_test.mjs`).
- **Oude Ommeland-lagen weg:** de gebouwdozen en wegen van het oude Ommeland, de dorpslaag (`countryvillage.js`), de huizen in de verre skyline, de gebouw-, weg- en boomdekken van het platteland en het schilderen van wegen op de grond bestaan niet meer; alles wat daar stond, komt uit de tegels.
- **Het Ommeland is helemaal weg, de provincie is één systeem:** buiten de stad zijn de tegels het enige: `countryreal.js`, `ommeland.json` en `ommeland.bin`, het oude waterveld, de wegen en kanalen van `countryedge.js` (met de gokstroken en randbebouwing van 500 regels), `countrybake.js` en `countryskyline.js` bestaan niet meer. Water, plaatsen, spoor, treinroutes, stations en molens komen uit de provinciegegevens; de grond toont het water van de tegels zo ver als er tegels zijn (een tweede, grovere watermasker van ~4 km), ook voorbij de oude 700 m. Alles buiten de stad werkt nu op dezelfde regels: respawn, helikopter, verkeer, boten en winkels hoeven de oude kaart niet meer te kennen.
- **Echte windmolens en hoogspanningsmasten:** de turbines en masten aan de horizon staan op de plekken waar OSM ze heeft (457 turbines, 1.121 masten, verbonden tot lijnen) in plaats van op een verzonnen rooster; ze zijn massief aan hun voet. De verzonnen poldermolens, gaswinning-vlammen, boomgordels en boerderijsilhouetten aan de horizon zijn weg: molens en kerken komen uit de landmarkkits.
- **Treinen en spoor overal:** de zes treinroutes uit de stad lopen over het echte spoor door naar elk station van de provincie (bakken bij de bouw: `provincie-land.json`), en het spoor buiten de stad is overal te zien, niet alleen in het oude gebied.
- **Plaatsing leest de tegels:** winkels, cafés, garages, dorpsuitjes, eierballen en De Koe van Ome Jan zoeken hun plek op de gebouwen en wegen van de tegels (`tileplace.js`). Wat ver van je vandaan vastligt laadt eerst zijn tegels: de deuren van winkels, cafés en garages achter het titelscherm (het spel wacht alleen als je eerder start), de dorpen en de schuur van Ome Jan op de achtergrond erna, een teleport via de kaart en de plekkencontrole voor ze te controleren.
- **Landverkeer op de tegelwegen:** trekkers, fietsers, quads en auto's rijden over de wegen van de tegels (voorheen alleen over de oude Ommeland-wegen en het polderrooster).
- **Geparkeerde trekkers bij schuren:** de schuren van de tegels krijgen hun trekker op het erf; auto's langs dorpsstraten zijn de gewone geparkeerde auto's.
### Verbeterd
- **Kaart-iconen groter en duidelijker (#114):** op de grote kaart en de minimap zijn de iconen 15 tot 24 px, op een donkere schijf met lichte rand, met per categorie een eigen vorm en kleur. Uitgezoomd blijven alleen de belangrijkste categorieën (jij, doel, missie, thuis, station); inzoomen brengt garages, ziekenhuis en politiebureau (nieuw), bijbaantjes, minigames, winkels en eten. Waar iconen over elkaar vallen wint de belangrijkste. De legenda is een korte lijst van icoon en naam.
- **Rustiger HUD (#92):** de verhaaltelefoon is kleiner (geen statusbalk, geen tweede kopregel), de sleutelhint op berichten is weg, het doel krimpt na een paar seconden tot doel en afstand, de GPS-kaart noemt alleen de straat, de afstand staat maar één keer, het toerental heeft geen woorden meer, het zoekvak van de politie is een rode balk zonder tekst en een metgezel is een klein portret in plaats van een zin. Van bericht, radio of prestatie en ondertitel staan er hooguit twee tegelijk; het plafond van losse onderdelen is 6.
- **Rustiger menu's en laadschermen (#92):** de rail van het pauzemenu heeft pictogrammen, Prestaties herhaalt zijn telling niet meer, het laadscherm toont de plaats groot met één voortgangsbalk en één korte regel, en het opstartscherm laat de twee disclaimers rusten.
- **Missiemarkers in de wereld (#115):** één markervorm per soort (start: ruit, doel: pijl, optioneel: kubus, deur of winkel: zeshoek, voertuig: piramide, checkpoint: ring), een dunne lichtkolom van vaste hoogte met een ring op de grond, de afstand erbij, in de kleuren van de kaart. Icoon en afstand groeien mee met de afstand maar vullen het beeld nooit; muren verbergen de marker.
### Toegevoegd
- **Kruispunten en verkeerslichten in de tegels van de provincie:** de kruispuntregels van de stad (rotonde, voorrang, rechts voor links, stoplijnen) zijn voor 53.000 kruispunten in de tegels uitgerekend, met 780 verkeerslichten uit OSM op hun weg gezet en 455 erbij volgens de regel voor drukke kruisingen. Het spel leest ze nog niet.
- **Boomrijen, kerkbomen en echte lantaarns in de provincie:** langs lanen en dijken staat een boom om de 6 m (OSM `tree_row`, zo'n 24.000 bomen), een rij heeft één soort, en lantaarns staan op de plek waar OSM ze kent (7.500 in de provincie) met de regellantaarns ertussen. Stopborden, voorrangsborden, zebra's, hekken en brievenbussen staan in de tegels klaar (nog niet getekend).
- **Provinciegebouwen krijgen de afleiding van de stad:** perrondaken en open daken (`building=roof`) zijn luifels in plaats van massieve blokken, dubbele voetafdrukken zijn samengevoegd, een voetafdruk binnen een andere stapt 0,4 m omhoog, paadjes eindigen aan de gevel van een massief blok en huizen houden 1,5 m afstand tot het wegmidden (`js/derive.js`, `scripts/world/derive_tiles.mjs`).
- **Echte gebouwhoogtes en daken in heel Groningen:** huizen, schuren en flats buiten de stad hebben nu de hoogte en dakvorm van het echte gebouw (3D BAG, CC BY 4.0) in plaats van een standaardhoogte.

## [0.34.0] - 2026-10-17

### Toegevoegd
- **Regen, eerder groen voor fietsers:** bij regen lopen de autofases van de verkeerslichten sneller, zodat het fietsgroen eerder komt.
- **Fietsers aan de telefoon:** een deel van de fietsers in de stad scrolt tijdens het fietsen op de telefoon.
- **Esc in een minigame vraagt eerst "Stoppen?":** Esc of Enter bevestigt, Spatie gaat door. Backspace en B op de controller stoppen nog direct.
- **Cutscene-camera laadt vooruit:** een scène die ver van je vandaan speelt, laadt de tegels rond haar shots vooraf en houdt ze vast tot de scène klaar is. Bij een camerasprong kijkt het laden niet meer de verkeerde kant op.
- **Geldwagen overvallen:** blaas een Poen Express uit het verkeer open (total loss), pak de geldzak en de politie zit je achterna. Geldwagen en geldzak staan op de minimap en de kaart.
- **Water in de hele provincie (eerste stap):** meren, plassen, sloten en kanalen buiten de stad hebben nu soort, diepte en peil, net als in het Ommeland. Boten, zwemmen en waden zien dat water zodra de provincie opnieuw is gebouwd.
- **Water in de provincie, tweede stap:** water krijgt per watergang een eigen lichaam (sloten aan een kanaal horen erbij), grote open meren een eigen peil (`meer`), en kades of natuurlijke oevers per stuk. Sluizen uit OSM staan in de provincielaag, beweegbare bruggen (`bridge:movable`) worden bij de volgende extract meegenomen. Nieuw: `scripts/province_water_audit.mjs` telt soorten, vaarklassen, bruggen en sluizen van een gebouwde provincie.
- **Water in de provincie, derde stap:** het water van de provinciegegevens gaat door dezelfde regels als het stadswater. Vrij water voor boten en zwemmers wordt ook over tegelgrenzen heen berekend (een kanaal dat op de tegelrand is afgesneden loopt gewoon door, zonder kade of oever op de rand). Kades en natuurlijke oevers volgen wat de gegevens zeggen (`kade` of `oever`). Een sluis splitst het water in aparte lichamen. Auto's zinken in diep water en rijden door ondiepe sloten (`ondiep water`). Nieuw: `scripts/tilewater_test.mjs`.

### Verbeterd
- **Routes, GPS en politie rijden over de tegelwegen:** de routegraaf (`roadgraph.js`) komt uit de wegen van de provinciegegevens (`provincie-roads.json.gz`, een uitvoerbestand van `build_province.mjs`) in plaats van uit de oude Ommeland-wegen en het polderrooster. Routes lopen nu over de hele provincie, ook tussen stad en Eemshaven of Ter Apel; `countryroute.js` is weg en `country_route_test` is `road_route_test` geworden.
- **De provinciegegevens zijn nu overal de bron, ook in het oude Ommeland:** de tegels staan standaard aan en de schakelaars `?legacy`, `?provincie`, `?corridor` en `?ommelandtegels` (desktop `--legacy`, `--provincie`, `--corridor`) bestaan niet meer. Waar een gebouwde tegel ligt, tekenen de oude gebouwdozen, wegen en skyline niet meer; wegen die helemaal in tegels liggen verdwijnen uit het oude verkeer, de geparkeerde auto's en de kaarten. Plaatsing (winkels, deuren, spawnplekken) houdt nog rekening met de oude dozen.
- **Overlaytegels vullen de randen van de stad:** waar de stadsdata ophoudt (de randen van de 54 stadstegels, 37 daarvan) bouwt `build_province.mjs` tegels met alleen wat buiten die data ligt (sleutel `o` + tegelsleutel, vlag 64). Ze laden bij het starten en blijven staan; zo hoeven de oude Ommeland-lagen daar niets meer te tekenen. De geometrie-worker laadt dezelfde overlays.
- **Bewegwijzering op de snelweg:** de blauwe portalen boven afritten noemen nu steden en dorpen uit de hele provincie in plaats van alleen die rond de stad, en kiezen er een in de goede richting.
- **Even pinnen:** de opdrachtregels zeggen nu duidelijk dat de pinautomaat achterin de auto ligt.
- **Stuntavond op de Grote Markt:** het doel staat nu in de uitleg, en terrasstoelen en -tafels leveren ook punten op.
- **Water onder gras:** waar een groenvlak over water ligt, wint nu het water. Geen gras meer boven plekken waar je zwemt.
- **Bejaarden op de e-bike:** sommigen fietsen nu aarzelend: even nadenken bij een kruispunt, traag optrekken en een beetje slingeren.
- **Politie is niet meer zo tolerant:** een agent aanrijden, te voet of in zijn auto, kost meteen een ster.
- **Fatbikers schelden terug:** toeter je naar een fatbiker in de missie, dan krijg je een Gronings antwoord in een tekstbubbel.

### Opgelost
- **Groninger Museum:** de paviljoenen stonden na de RD-omzetting 12 m naast het gebouw, waardoor je tegen onzichtbare muren botste en vanuit de hal het water in kon. Muren, vloer en voetafdruk vallen weer samen en de H.N. Werkmanbrug loopt niet meer door het gebouw (#79).

## [0.33.0] - 2026-10-16

### Nieuw
- **De hele provincie.** Voorbij het oude Ommeland ligt nu het echte
  Groningen: elke weg, elk huis, elke boerderij en elk dorp van Lauwersoog
  tot Ter Apel en van Grijpskerk tot Bad Nieuweschans, met een strookje
  Friesland en Drenthe langs de grens. Waar de echte wegen liggen zijn de
  verzonnen polderwegen, maren en dorpjes weg. Het water is daar voorlopig nog
  plat: varen en zwemmen kan er nog niet. Wie de oude wereld wil houden start
  met `--legacy`.
- **Plaatsnamen overal.** De locatie noemt elke stad, elk dorp en elk gehucht
  in de provincie, met de wijk erbij.
- **Treinen naar alle stations.** De stoptreinen rijden door over het echte
  spoor naar Grijpskerk, Hoogezand-Sappemeer, Zuidbroek, Scheemda,
  Winschoten, Bad Nieuweschans, Appingedam, Delfzijl, Baflo, Warffum,
  Usquert, Uithuizen, Uithuizermeeden, Roodeschool en Eemshaven, en er is een
  nieuwe lijn naar Veendam. Met de kaartautomaat reis je naar elk station.
- **De kaart van de hele provincie.** De grote kaart laat heel Groningen
  zien, van de Wadden tot Westerwolde.

### Veranderd
- **Voorzieningen** (ziekenhuizen, politie, tankstations, winkels, parkeren)
  komen nu uit één verse kaart van de hele provincie, plus een strook over
  de grens.

## [0.32.0] - 2026-10-16

### Nieuw
- **Events in de zomer.** Soms trilt de grond even: een lichte aardbeving met een
  korte rommel, een trillend beeld, rammelende fietsen, verbaasde voorbijgangers
  en een rustig Kiekdoar-berichtje zonder schade. Op sommige dagen zit er
  blauwalg in de grote plassen: groene vlekken op het water, borden "Niet
  zwemmen" langs de kant, en wie er toch doorheen zwemt wordt trager, moe en
  een beetje ziek. Op Gronings Ontzet gaat 's avonds vuurwerk op boven de stad,
  te zien en te horen vanaf de hele binnenstad en aan het eind een slotsalvo. En
  op de bloemetjesmarkt (12 september) lopen er veel Duitse toeristen met
  rugzak en pet rond, die in het Duits om zich heen praten.
- **Minigames, deel 2.** Drie nieuwe dingen om tussendoor te doen, gratis,
  overslaanbaar (Backspace) en met medailles, records en prestaties:
  - **Zwembad Het Natte Papier** aan de Papiermolenlaan. Vier banen van
    vijfentwintig meter: duik vanaf het blok als de balk in het groen is, zwem
    met A en D om en om in een rustig ritme en draai vlak voor de muur om met
    Spatie. Wie spartelt wordt moe; de badmeester geeft commentaar.
  - **Klimtoren Zernike.** Twaalf meter klimwand tegen de klok. Houd A (linker)
    en D (rechter hand) vast om een greep te pakken en laat steeds één hand los
    om hem hoger te zetten. Rust op de grote grepen, anders geven je armen het
    op; vallen kan, op de mat, en kost vier seconden.
  - **Waterskibaan bij het Grunopark.** Een boot trekt je over het meer. Leun uit
    met A en D, zwaai ruim om de boeien, spring met Spatie over de golven en
    draai of grab in de lucht voor extra punten. Drie valpogingen.
- **Drie zijmissies met tekst.** Overslaan mag altijd en geld blokkeert nooit:
  - **BOA voor een dag** (bij het Stadhuis). Loop op een overtreder af, lees de
    regel uit het dikke boekje van onzin en reken de boete uit: kies met 1, 2 of
    3 het goede bedrag. Een foute boete betaalt minder en de overtreder
    protesteert; Backspace laat de zaak rusten.
  - **Dossier naar de rechtbank** (bij het Politiebureau). Lees de drie feiten
    van een verzonnen zaak, breng het dossier naar het Gerechtsgebouw en
    beantwoord drie vragen van de griffier. Met Tab lees je de feiten nog eens.
  - **Cabaret in de Stadsschouwburg.** De Friese cabaretier Ype Tjaarda speelt;
    jij roept op de maat iets terug. Druk Spatie als de balk in het groen is.
- **Berovingen na donker.** In een paar wijken (het station en de uitgaansstraten
  van de binnenstad, en de lege bedrijventerreinen) kan je 's avonds en 's nachts
  je portemonnee kwijtraken: iemand botst tegen je op en je verliest een deel van
  je geld, zonder geweld. Ren hem achterna en pak het terug. Op de kaart krijgen
  die wijken na donker een oranje naam en een driehoek, en bij het binnenlopen
  waarschuwt een kaartje je.
- **Fietsen over de Grote Markt is duidelijk.** De fietsroute over het plein heeft
  nu witte streeplijnen en een fietssymbool op de klinkers, en bij elke ingang
  staat een bord "Fietsroute, stapvoets". De eerste keer dat je erop fietst zegt
  een kaartje dat het mag; op marktdag (dinsdag, vrijdag, zaterdag, overdag) stap
  je af en loop je met je fiets.
- **Het spoor ligt zoals het hoort.** Elke spoorlijn heeft een eigen
  hoogteprofiel: flauwe hellingen en lange bogen, dus een trein schiet niet
  meer vlak na het perron steil omhoog. Perrons liggen vlak, overwegen precies
  op de hoogte van de weg, station Noord ligt op een verhoogde baan met de
  straten eronderdoor, en het Emmaviaduct en de Hereweg gaan over het spoor
  heen, zoals in het echt.
- **Bruggen gaan open.** De ophaal- en draaibruggen van Stad (33 stuks, van de
  Sint Jansbrug tot de Europaweg) gaan open als je in een boot ervoor toetert:
  rode lichten, slagbomen omlaag, het val gaat omhoog en het verkeer wacht.
  Ben je net te laat met de auto, dan sta je voor de slagboom; rijd je erdoor,
  dan lig je in het kanaal.
- **Vangrails, portalen en hectometerpaaltjes.** Langs de snelwegen, de
  N-wegen en hun op- en afritten staan vangrails (ook in de middenberm), met
  een opening waar een weg aansluit; ram je er hard tegenaan, dan vliegt een
  stuk eruit. Voor elke afrit hangt een blauw portaal met echte plaatsnamen,
  en langs de berm staan hectometerpaaltjes. Hekken en drempels die op de kaart
  staan, staan nu ook in het spel. Lantaarnpalen verschillen per soort weg: hoge
  palen met een arm langs de grote wegen, lagere lantaarns in de woonstraten.
- **Meer soorten bomen, en bossen vol bomen.** Linden, platanen, eiken,
  beuken, essen, esdoorns, kastanjes, berken, dennen, wilgen langs het water,
  hoge populieren en hier en daar een roze Japanse sierkers: elke soort met zijn
  eigen kleur, hoogte en kroon. Volwassen straatbomen zijn 12 tot 20 meter hoog
  en een rij langs een laan is één soort. De bossen rond de stad (Kardinge, het
  Stadspark en meer) staan nu echt vol bomen, ook van verder weg te zien.
- **Echte gebouwhoogtes en daken.** Bijna elk gebouw in Stad heeft nu zijn
  echte hoogte en dakvorm uit de 3DBAG (TU Delft en 3DGI): rijtjeshuizen met
  een zadeldak, platte daken waar ze plat zijn, en torens als het Cruiseschip
  aan de Kempkensberg en de Tasmantoren op hun echte hoogte. De skyline is van
  ver te herkennen.
- **Sloten liggen dieper.** In het Ommeland zie je dat een sloot echt diep
  ligt, en als je erdoorheen loopt sta je tot je knieën in het water en ga je
  langzamer.
- **Meerijden met de trein.** Bij de kaartautomaat staat nu ook "Meerijden":
  je zit de hele rit in de stoptrein, halte voor halte (naar Loppersum stopt hij
  in Bedum en Stedum), met uitzicht door het raam, naast de trein of van boven.
  Een bord laat de volgende halte zien en hoe lang het nog duurt. Houd Spatie
  ingedrukt om naar je halte te springen: de trein rolt het station binnen en
  de klok loopt door. Snel reizen zoals eerst kan nog steeds.
- **Plaatsnamen verder de provincie in.** Voorbij de dorpen rond de stad weet
  de locatie nu ook waar je bent: Appingedam, Delfzijl, Winsum, Uithuizen,
  Eemshaven en de dorpen ertussen, en in een wijk van zo'n plaats "wijk ·
  plaats".

### Veranderd
- **Eén bouwer voor stad en dorp.** De straten en huizen van de dorpen rond de
  stad worden nu door dezelfde bouwer gemaakt als de stad zelf (je ziet
  hetzelfde, maar het is de basis voor de hele provincie). De eerste strook
  naar Delfzijl en Eemshaven is als proef gebouwd; die komt in het spel zodra
  de kaartgegevens ervan binnen zijn.

## [0.31.0] - 2026-10-16

### Nieuw
- **Wegen kloppen beter.** Elke weg heeft nu zijn eigen hoogteprofiel, dus
  bruggen, viaducten en afritten liggen op de goede hoogte en je blijft op het
  dek waar je rijdt. De viaductrand bij het Julianaplein (de N7) waar de auto
  van de weg viel, is opgelost. Rijstroken kloppen met de kaart: de A7 heeft
  twee stroken per richting in plaats van vier, met de juiste belijning en
  voorsorteerpijlen, en het verkeer houdt rechts en gaat links staan voor een
  linksaf. Kruispunten hebben een eigen regel (voorrang, rotonde, lichten) en
  auto's stoppen netjes voor de haaientanden. Een controle rijdt elke weg in
  beide richtingen af (7.084 ritten). In de dev-modus laat F8 het hoogteprofiel
  zien.
- **Minigames, deel 1.** Vier nieuwe dingen om tussendoor te doen, allemaal
  gratis, overslaanbaar (Backspace, B op een controller) en met medailles,
  records en prestaties:
  - **Discgolf in het Stadspark.** Negen holes met manden en vlaggen. Richt met
    A en D, kies de hoek met W en S, wissel met E tussen hyzer, vlak en anhyzer
    en met F van disc, houd Spatie om te laden en laat los om te gooien. Let op
    de wind, de bomen en het water (kost een worp). Een scorekaart telt tegen par.
  - **Pitch & putt aan de Concourslaan.** Zes korte holes op de open grond in het
    Concoursterrein: pitchen naar de green, daar putten. De pijltjes op de green
    laten zien waar de bal heen loopt, en het witte streepje op de meter is de
    kracht voor een rechte slag.
  - **Skatepark Stadspark.** Negentig seconden op een skateboard tussen
    quarterpipes, kickers, een box en rails: ollie, kickflip, heelflip, spins,
    grabs en grinds. Een keten van verschillende tricks telt zwaarder; een val
    kost je de keten.
  - **Karten bij Kardinge.** Drie ronden tegen drie rijders op een eigen
    kartbaan naast Kardinge: gas, rem en handrem. Een lange drift geeft een
    boost. Eerste is goud, tweede zilver, derde brons; er zijn records voor de
    racetijd en de snelste ronde.
- **Meer leven op straat.** Roeiers in een skiff en soms een acht op het brede
  water, vaker iemand op een SUP, studenten die verhuizen met een bankstel,
  matras of plant (op de bakfiets of lopend), bezorgers met een grote kubustas
  (drukker rond etenstijd), Wisselwiel-deelfietsen met een gekleurd voorwiel
  en gammele studentenfietsen die 's nachts geen licht voeren. Een busje van
  Noord-Nieuws rijdt door de stad.
- **Op straat gebeurt iets.** Verkopers van De Reep (E: een krant, twee euro),
  iemand met een bekertje (E: een muntje geven) en Bernhard met de Karretje
  bij de Grote Markt, die graag een praatje maakt. Aan de kade staan
  magneetvissers: help mee trekken en haal van alles uit het water. Soms zit
  er een oude granaat aan: laat hem liggen en meld hem bij de politie voor een
  beloning.

## [0.30.1] - 2026-10-16

### Nieuw
- **Richtingaanwijzers en alarmlichten.** [ en ] zetten de knipperlichten links
  en rechts aan (nog eens: uit), P de alarmlichten; op een controller zijn het
  links, rechts en omhoog op het D-pad. Na de bocht gaat de richtingaanwijzer
  vanzelf uit. Oranje lampjes knipperen op alle voertuigen, ook bij andere
  auto's en fietsers die een bocht maken.
- **Je merkt het als je zwaar gewond bent.** Onder een kwart gezondheid wordt
  het beeld rood aan de randen en grauw, het klopt mee met je hartslag (je hoort
  hem ook) en je loopt trager. Bij beterschap is het meteen voorbij.
- **Muurkroket.** Een snackautomaat bij de snackbars en de stations: drie euro,
  en er rolt een eierbal, kroket of frikandel uit die je een beetje opknapt.
- **Boetes.** Een agent in de buurt ziet het als je de telefoon openvouwt op de
  fiets of achter het stuur, en als je 's nachts zonder licht fietst.
- **Hintbron.** Onder Instellingen kies je of de hints toetsenbord, controller
  of automatisch tonen, in de hele HUD en in het menu.
- **Politiepaarden** laten af en toe een hoopje achter. Er rijden meer fietsen
  in het centrum, en op een reclamebord vraagt iemand of u uit Steden komt of
  naar Stedum gaat.

### Aangepast
- **Een nieuwe wijk** krijgt standaard een korte naamkaart met de stem van Rikus
  en wat er te zien is. De volledige rondvlucht staat onder Instellingen als
  Filmpje bij nieuwe wijken.
- **Eén keycap-stijl:** overal waar een toets staat is het dezelfde witte,
  heldere knop (HUD, hints, kaarten, menu en de kraak-schermen).
- **Het laadscherm** toont steeds één korte regel tegelijk.
- **De Herestraat en andere voetgangersstraten** zijn minder volgestouwd met
  fietsen, rekken en mensen.
- De kaartlabel bij de Apenrots noemt geen echt bedrijf meer.

### Opgelost
- **De minimap stond scheef.** Op gewone schermen (zonder retina, bij 1080p) werd
  hij twee keer zo hoog uitgerekt en stond je onderaan in plaats van in het
  midden; bij het draaien leek de kaart te vervormen. Dat is hersteld en
  wordt voortaan getest.
- De teller "+N in de wacht" bovenin is weg, en "Missie geslaagd" komt
  maar één keer in beeld.
- "Missie geslaagd" verschijnt maar één keer.

## [0.30.0] - 2026-10-15

### Nieuw
- **Handmatig schakelen, driften en motoren.** Onder Instellingen kies je
  Schakelen: Automaat (zoals altijd), Handmatig (. en , of de bumpers van je
  controller) of Handmatig + koppeling (J of L3: zonder koppeling kraakt het
  en de motor kan afslaan). Auto's, bestelbussen, vrachtwagens, de bus en de
  trekker hebben elk hun eigen versnellingen, toerenbegrenzer en motorrem;
  de HUD toont de versnelling (N ook), een schakellampje en MOTOR AF. Driften
  gaat met de handrem: een tegenstuurhulp houdt de slip beheersbaar (uit =
  realistischer), punten en combo's tellen mee en op drie rotondes zijn
  driftzones met medailles. Nieuw in Trap & Toeter: de sportmotor Wadden
  Stormvogel, de naked Hunze Knetter, de Dollard Klassieker en de brommer
  Tweetakt Pruttelaar met koppeling en vier versnellingen (45 km/u; opvoeren
  trekt de aandacht van de politie). Motoren leunen in de bocht, doen
  wheelies en stoppies (Shift) en je vliegt eraf bij een harde klap.
- **Nieuwe HUD, laadscherm en opstartscherm.** De HUD toont alleen wat nu
  telt (instelling HUD: Slim, Altijd alles of Minimaal): sterren alleen als je
  gezocht wordt, geld bij een wijziging, een afslagkaart met de GPS vlak voor
  een bocht, de naam van een nieuwe wijk groot in beeld. De minimap is een
  vierkant linksonder en past zich aan hoe je reist. De kaart heeft een
  keuze voor lopen, fiets, auto, boot, OV en lucht; wegen die niet voor jou
  zijn staan rood gestreept. Bij Doorgaan en lange sprongen komt een
  laadscherm met je verhaal tot nu toe. Het spel opent donkergroen, met
  "Druk op een toets".
- **Routes per reiswijze.** De GPS kent nu lopen, fiets, auto, boot, trein
  en lucht. Te voet en op de fiets blijf je van de snelweg af, een auto van
  fiets- en voetpaden; "Snelwegen vermijden" staat op de kaart bij Auto. Een
  doel klikt vast op de juiste weg, op de brug of eronder. Een boot krijgt een
  route over het water met boeien, de trein een route met "Uitstappen bij" en
  een stationsbord, een heli een lijn om verboden gebied met hoogteadvies en
  een landingsplek. Loop of fiets je toch op de snelweg, of rij je met een
  auto over een fietspad, dan krijg je eerst een waarschuwing en na twaalf
  seconden een ster.
- **Nieuwe menu's.** Alle menu's hebben een rustige, nieuwe stijl: een
  zijbalk met alleen tekst, links de lijst en rechts wat je geselecteerd
  hebt, één hoofdknop per scherm. Het pauzemenu opent met je verhaal en
  "Doorgaan"; Instellingen heeft zes tabs met "Meer opties"; winkel,
  garage, station, telefoon, prestaties, besturing en cheats volgen
  dezelfde indeling. Het hoofdmenu toont je opgeslagen spel en
  verhaalvoortgang.
- **Een spelkalender.** De game speelt in de zomer van 2026: dag 1 is
  vrijdag 14 augustus en Gronings Ontzet valt op vrijdag 28 augustus. Na
  22 september blijft het nazomer. De datum staat onder de klok, speciale
  dagen krijgen een kaartje "Vandaag in Grunn", en KEI-week, Noorderzon,
  de kermis en de markten volgen de kalender. De zon gaat in augustus
  steeds eerder onder.
- **Echte plekken.** Na een val of arrestatie kom je bij het dichtstbijzijnde
  echte ziekenhuis, de dichtstbijzijnde echte huisartsenpost of het
  dichtstbijzijnde echte politiebureau, ook in het Ommeland. Ambulances
  wachten bij echte posten. In het Ommeland staan tankstations, garages,
  winkels en cafés op echte plekken (met verzonnen namen), en parkeerplaatsen
  en parkeerstroken zijn echt: 37.866 vakken waar auto's staan en jij ook
  kunt parkeren.
- **Dorpen en landmarks.** Dorpsstraten en huizen in het Ommeland worden
  met dezelfde bouwers gemaakt als de stad. Kerken, molens, torens en
  borgen hebben een eigen model, 's nachts aangelicht; Bedum heeft zijn
  scheve toren en Garmerwolde zijn kerkruïne.

### Veranderd
- **Realistischer tempo.** Te voet 3 m/s (sprint 6,8), een fiets 25 km/u, de
  fatbike 50, een brommer 45. Auto's trekken rustiger op: 0 naar 100 in
  ongeveer 7,5 seconden. Springen is een halve meter, normale zwaartekracht.
  Missietijden, medailles, de politie en de tegenstanders zijn daarop
  afgestemd. Straatbomen zijn 10 tot 19 meter, de harmonicabus 18 meter, de
  rondvaartboot 14 en het skûtsje 15 meter; de trekker, vrachtwagen,
  ambulance, sloep en het perron zijn bijgewerkt.
- **Onder de motorkap:** de kaart is nu in de Nederlandse RD-meters en in
  tegels die onderweg worden geladen. Je merkt het aan een snellere start
  (de kaart staat 1 seconde eerder klaar) en iets minder geheugen. Je
  opgeslagen spel wordt vanzelf omgezet.

### Opgelost
- Het winkelcentrum Paddepoel had bij de nieuwe coördinaten kapotte
  glazen luifelhoeken; dat is hersteld en wordt voortaan getest.

## [0.29.0] - 2026-10-15

### Nieuw
- **Het Ommeland werkt nu net als de stad.** De politie rijdt er over de
  wegen, zet wegblokkades op en komt met boten op het water. Bruggen hebben
  railings waar je tegenaan botst, dorpsmeubels en wereldeinden zijn massief
  voor iedereen. Verkeer verdwijnt niet meer vlak voor je neus bij de
  stadsrand. Op de kaart staat een Ommeland-laag met dorpsuitjes en gevonden
  wereldeinden. "Waar staat hij?" in de garage noemt het dorp.
- **Klinkt als platteland:** vogels, krekels 's nachts, kabbelend water en
  meer wind; boerenverkeer is te horen en trekkers klinken als een diesel.

### Veranderd
- **Gras remt minder.** Een auto houdt op gras zo'n driekwart van zijn
  topsnelheid en slingert minder. Het geldt nu voor iedereen, ook voor de
  politie.
- **Water in het Ommeland** heeft één duidelijke regel: diep water = zinken
  of zwemmen, de rand van een meer = waden, een sloot = een kuil.
- **Ook de interne namen heten nu GDE.** Saves, instellingen en prestaties
  staan onder nieuwe namen (`gde-*` in plaats van `gte-*`); bij de eerste
  start worden ze eenmalig gekopieerd, je verliest niets. De desktopapp
  bewaart alles voortaan in de map `GDE Groningen` (eenmalig gekopieerd uit
  `GTE VI`; die oude map blijft staan, zodat terug naar 0.28 ook nog kan).
- **Licenties.** De code valt onder de GPL-3.0 (of later), de eigen inhoud
  (stemmen, muziek, verhaal) onder CC BY-NC-SA 4.0; de naam GDE en het logo
  niet. *Over* in het startmenu zegt het ook.
- **De aftiteling** noemt Tammo en Tessa nu als personages.

## [0.28.0] - 2026-10-05

### Veranderd
- **De stemmen praten nu Gronings.** Tammo, Tessa, Rikus, de Stadjers op straat, de agenten, het nieuws, de radio en alle bijbaantjes zeggen hun regels in het Gronings (de Friezen en de toeristen blijven zoals ze waren). De ondertitels veranderen niet: die blijven Nederlands tot je de streek *Gronings ondertiteld* aanzet. Alle opnames zijn opnieuw gemaakt; de gesproken spelling staat in `scripts/gronings_spoken.json`.
- **Cheats kritisch bekeken.** *Voertuig hier* heeft geen eigen plaatsing meer: het is dezelfde bezorging als "Laten afleveren" (garage en telefoon), alleen gratis, meteen en pal naast je (nooit in een gebouw, boten alleen op water, de heli met ruimte voor de rotor). Je stapt er niet meer automatisch in. *Geld uit de muur* is weg (verdienen kan genoeg, en het zette je prestaties voor de hele sessie uit); oude saves worden bijgewerkt. Teleporteren en Voertuig hier werken niet meer met de politie op je hielen. Slow-mo en Zomer? Ja. lekken niet meer door na uitzetten of laden. Hints bij op-slot-cheats noemen nu de verhaalstap bij naam.
- **Het Escape-menu is weer gewoon een menu.** De vouwtelefoon-rand eromheen (rand, scharnier, cameragaatje, statusbalk en de uitvouw-animatie) is weg. Telefoon en Spullen blijven als onderdelen van het menu; oproepen en berichten verschijnen nog steeds op de dichtgevouwen telefoon.
- **Het Escape-menu noemt het nu "Cheats"** in plaats van "Streken".

### Opgelost
- **De kaart stond uitgerekt.** Het menu bepaalde zijn afmetingen pas na het
  openen, waardoor het kaartbeeld in een andere verhouding werd getoond.
- **De harde piep.** Het geluid van "doel gezet" werd elk beeld opnieuw
  afgespeeld zolang je een doel had. Nu hooguit eens per 2 seconden, en zachter.
- **Minder stotteren op "Heel ver":** nieuw landschap hoeft de grafische
  buffers niet meer opnieuw aan te maken.
- **De GPS in het Ommeland** raakt de route niet meer kwijt: wegen met een
  fietsstrook, wegen binnen de stadsgrens en eenrichtingswegen ontbraken of
  werden verkeerd gelezen. Alle 10.711 wegen zijn in een simulatie nagereden.
- **Voertuigen botsen in het Ommeland** zoals in de stad (schade en geluid) en
  rijden niet meer door schuren en boomstammen. Ook de camera kijkt er niet
  meer dwars door gebouwen heen. Boomstammen zijn massief en AI-auto's stappen
  uit.
- **Cheats:** Slow-mo loopt niet meer door na uitzetten en wacht tijdens
  missies, "Zomer? Ja." laat de storm niet meer hangen na laden, en teleporteren
  en Voertuig hier werken niet terwijl de politie je zoekt.

## [0.27.1] - 2026-10-05

### Nieuw
- **Dark trap op G-Music:** "Koplampen in de Mist" van Lil Polder, 's nachts
  (ook op Nachtstreek).

### Opgelost
- **Wisselen tussen Tammo en Tessa blijft niet meer hangen.** Na hooguit
  8 seconden wisselt het op een veilig moment, ook als het spel traag loopt
  of er nog een melding in beeld staat.
- **Een overgeslagen missie telt pas als je hem wint.** Hij gaf stilletjes de
  prestatie "klaar", waardoor de aftiteling te vroeg kon komen.
- **De skûtsje kan niet meer vastlopen** als je W vasthoudt bij "SEIL LOS!".
- **Zwemmen in smalle sloten:** je kunt er altijd weg zwemmen. Op 17 plekken in
  de stad zat je vast.
- **Over een reling het water in springen** teleporteert je niet meer.
- **De geheime kamer in de Martinitoren** sluit na 9 seconden echt, ook bij
  slow motion, en de camera wordt altijd losgelaten.
- **Laden zet alles netjes terug:** een lopende quiz, missie of treinrit, de
  winkel, de camera, en je tellers beginnen bij nul als de save ze niet kent.
  Ook zwemmen, klimmen, springen en op een autodak staan worden gewist.
- **Fjord Frituur:** als je tijdens een dienst doodgaat of wordt gearresteerd,
  krijg je wat je al verdiend had.
- **Kleding klopt na laden:** een oudere save hield outfits uit je huidige
  sessie vast, zoals de incognito-outfit voor H6.
- **Opslaan:** de garagevolgorde, de Streken en de radio zorgen nu ook voor een
  autosave.
- **Duiven als Tessa:** de intro noemt de juiste naam.
- **Dood of gearresteerd tijdens een duivenvlucht:** de vlucht stopt eerst.
- **Een missiemarker gaat niet meer af midden in padel of een activiteit.**
- **Ome Jans bromfiets** is na de koeienmissie weer gewoon verkeer.
- **Een telefoongesprek** wordt niet meer twee keer afgesloten.

## [0.27.0] - 2026-10-04

Een grote speeltestronde met Maus. De hoogtepunten:
- **De telefoon is een vouwtelefoon:** de Pixie Vouw 11. Opengevouwen is het
  het Escape-menu, dichtgevouwen zie je oproepen en berichten. De oude
  telefoon onder T is weg.
- **Spullen:** een inventaris in het menu met alles wat je hebt.
- **Springen en klimmen:** over hekken en heggen, en op het dak van auto's.
- **Het Ommeland leeft:** echte auto's, trekkers, fietsers en een quad,
  navigatie over de landwegen, wegen zoals in de stad, en weilanden met randen.
- **De game is 18+:** bloed, burgers en agenten die doodgaan, en de krasloten
  zijn terug.
- **Streken:** een cheat-onderdeel in het menu.
- **Natuurlijkere dialogen**, een kortere koeienmissie, en de aftiteling pas
  helemaal aan het eind.
- **Snelle boten** met upgrades bij de werf, en een skûtsjerace die te winnen is.
- **Meer muziek op G-Music:** drill, punk, eurodance en Grunneger rock.

### Nieuw
- **De Pixie Vouw 11.** Tammo en Tessa hebben een vouwtelefoon. Esc vouwt
  hem open: dat is het menu, met de stad wazig erachter, gedempt geluid en
  G-Music zacht door. Een binnenkomende oproep of een bericht staat op de
  dichtgevouwen buitenkant; Esc opent dat gesprek. Contacten (Berend, Henk,
  Mam, Jelle, je maat) en Berichten staan onder Telefoon. De oude telefoon
  onder T is weg; wat erin zat staat nu in het menu (Te doen, Kaart, Garage).
- **Spullen.** Een inventaris in het menu: geld, wapens met munitie,
  werpspul, kleding, meubels thuis met hun voordeel, kaarten en
  verzamelingen, en upgrades. Wat je nog niet hebt blijft verborgen; per
  soort zie je hoeveel je er hebt ("12 van 40").
- **Springen en klimmen.** Met Spatie spring je over hekken, heggen, lage
  muurtjes en paaltjes, en klim je op het dak van een auto. Van een rijdende
  auto val je af. Busjes, bussen en muren houden je tegen.
- **Snelle boten en de werf.** De speedboot haalt 90 km/u, de rubberboot 58.
  Bij de botenverhuur zit nu een werf: met R koop je een snellere motor,
  een raceschroef, een groter roer of laat je de romp maken.
- **Het politiepaard is te berijden.** Je zit in het zadel, met een
  paardicoon en galop onder Shift.
- **Quad.** Bij boerderijen in het Ommeland staan quads die je kunt
  meenemen, en boeren rijden er soms op over de landwegen. Hij rijdt
  makkelijk door de wei. Te koop bij de autodealer als Wierde Quad.
- **Zichtafstand "Heel ver"** (Instellingen › Beeld): op een sterke
  videokaart kijk je nu anderhalf keer zo ver over de stad en het Ommeland:
  900 meter in plaats van 600. Kies je de voorinstelling Hoog, dan krijg je
  hem meteen; standaard blijft de zichtafstand Ver.
  Hapert het beeld, dan gaat de zichtafstand vanzelf even terug naar Ver.
- **Wegen in het Ommeland zien eruit als in de stad**: hetzelfde asfalt met
  steentjes, slijtsporen en vlekken, dezelfde witte strepen (de
  middenstreep van een provinciale weg doorgetrokken, kleinere wegen 3 m
  streep en 6 m gat) en een grindberm langs de weg; in de dorpen een
  stoeprand met tegels.
- **Streken: een beetje vals spelen.** Een nieuw onderdeel in het
  pauzemenu, tussen Prestaties en Instellingen, met 21 streken. Vanaf het
  begin: *Overal en nergens* (kies een plek op de kaart en je staat er, op de
  dichtstbijzijnde weg, in de stad en in het Ommeland, met je auto als je
  erin zit), *Voertuig hier* (je eigen voertuig meteen naast je, of een
  stukje opzij als het daar niet past; een boot alleen op het water, de heli
  alleen met ruimte voor de rotor), lage zwaartekracht, grote koppen,
  Gronings ondertiteld, altijd zomeravond, nachtstad en geen verkeer. Het
  verhaal speelt er meer vrij (Fietsenstad, Slow-mo bij botsingen,
  Duivenstorm, *Zomer? Ja.*, Geen politie, Eeuwige eierbal, Frituurvet-wegen,
  Turbo-Escapade), prestaties nog een paar (Stuiterwagens, De dag vliegt, Vol
  magazijn), en na het verhaal Geld uit de muur en Showroom (elk voertuig via
  Voertuig hier). Wat nog op slot zit, staat er als ??? met een hint; een
  nieuwe streek krijgt een kaartje. Wat je vrijspeelt blijft in je save en
  ook voor een nieuw spel.
- **Streken en missies.** Streken die het spel veranderen, wachten tijdens
  missies, filmpjes, uitdagingen, bijbaantjes en minigames, en gaan daarna
  vanzelf weer door. Grote koppen, Gronings ondertiteld en Duivenstorm blijven
  aan.
- **Streken en prestaties.** Zolang er een streek aan staat die het spel
  verandert, kun je geen prestaties halen en tellen je totalen niet door.
  Het menu zegt dat er ook bij. Teleporteren, Voertuig hier en de streken
  die alleen het uiterlijk veranderen laten prestaties aan. Na Geld uit de
  muur staan prestaties uit tot je een save laadt.
- **Grunneger rock op G-Music:** "Trots op mien grond" van Wierde Wind, overdag.
- **Eurodance op G-Music:** "Zomerse droom in de Stad" van DJ Dageraad feat. MC Zernike.
- **Punk op G-Music:** "Hatchback op de Ring" van De Uitlaatjes, overdag.
- **Twee drillnummers op G-Music:** "Geen stoplicht houdt ons tegen" (Ringweg Drillers) en "Goud in de Nacht" (Nachtbus Nino, 's nachts ook op Nachtstreek).

### Veranderd
- **De bus rijdt als een bus**: kleinere draaicirkel, betere remmen, stabiel
  in de bocht en een camera verder naar achteren. De busdienst rijdt een
  rondje zonder keren, en je wacht hooguit een halve minuut bij een halte.
- **De toeter is harder.**
- **Duiven met Tessa:** druk E bij de duiven en Tammo neemt het over.
- **De skûtsje klinkt als een zeilboot**, met kraken, boeggolf en klapperende
  zeilen in plaats van een motor.
- **De game is 18+: alles wat voor PEGI 16 weg moest, is terug.** Bloed en
  rondvliegende ledematen in Carmageddon-stijl, met de instelling "Bloed en
  ledematen" (standaard aan). Burgers gaan weer dood door auto's, treinen,
  wapens en explosies, kogels en de richthulp raken iedereen, en agenten
  gaan dood in plaats van "uitgeschakeld". De uitslag van een missie toont
  weer de kills; een save met knock-outtellers wordt omgezet naar kills.
  Rook & Geluk verkoopt weer kraskaarten en loten met de kras-animatie; de
  spaarkaart blijft. Kiekdoar zegt weer "gewond". De stuntavond van H3
  blijft non-letaal, met sterretjes. Verwachte leeftijd: PEGI 18 / USK 18
  (docs/LEEFTIJD.md).
- **Natuurlijkere dialogen.** Maus vond dat sommige verhaalregels nergens
  op sloegen. Daarom zijn ongeveer 120 regels herschreven, ingesproken met
  dezelfde stemmen. Regels die vóór een missie klinken, verklappen niets
  meer uit de scène erna. Niemand antwoordt nog op iets wat niet gezegd is.
  Tammo houdt geen betogen meer. Het geforceerde Gronings is eruit, en
  grappen komen niet meer drie keer achter elkaar terug. De feiten kloppen
  weer: ze wonen in Paddepoel met een garage, het verhaal duurt twee weken,
  en Rikus wil de eerste friet en krijgt de tweede. Wat er veranderde en
  waarom staat in `docs/verhaal/DIALOOG-REVIEW.md`.
- **Elke wijk klinkt anders.** Als je een wijk voor het eerst binnenkomt,
  zegt Rikus een van twee à drie regels die bij die wijk passen. 38 wijken
  en buurten hebben nu een eigen regel; de andere buurten krijgen de regels
  van hun wijk. Een regel komt niet terug zolang je hem pas gehoord hebt.
  Tammo en Tessa hebben acht nieuwe wijkgesprekken.
- **De Koe van Ome Jan is te volgen.** Jelle legt aan de telefoon uit
  waarom Durk en Douwe Geertje meenamen: ze wilden hem toch nog iets laten
  winnen, op de keuring in Ljouwert. Het slot vertelt hoe het met de
  tweeling afloopt. De missie is ook eenvoudiger en
  korter: de schuur ligt op een minuut rijden van het erf, je maakt Geertje
  los met E (ook vanuit de auto) en rijdt haar naar huis. Ze rent mee met
  wat je ook rijdt, en als je wegloopt wacht ze op je. Rammen hoeft niet:
  na een minuut rijden Durk en Douwe vanzelf de sloot in. De HUD geeft elke
  stap met een marker, laat zien of Geertje meeloopt, telt de rammen (0/3)
  en waarschuwt als de trekker vlak achter haar zit.
- **Na een gewonnen uitdaging weet je wat je nu moet doen.** Je krijgt
  een bericht, en de GPS wijst meteen naar de dichtstbijzijnde uitdaging
  zonder medaille (niet naar de uitdaging die je net deed). Zijn ze allemaal
  gedaan, dan zegt het bericht dat ook. Dit geldt voor alle uitdagingen na
  het verhaal.
- **De aftiteling komt pas aan het eind.** Na het verhaal zie je de epiloog,
  "Wij tweeën vóór Grunn." en de Fjord Frituur. De aftiteling, het logo en
  "Einde" wachten tot alle 18 missies gehaald zijn en alle uitdagingen na het
  verhaal gedaan zijn. Een overgeslagen missie telt pas als je hem alsnog
  haalt. Overzicht en Te doen tellen af ("Nog 3 uitdagingen van Jelle tot het
  einde"). De aftiteling speelt één keer en staat daarna onder Overzicht
  (Aftiteling bekijken). Wie het verhaal al uit had houdt alles en krijgt de
  aftiteling bij de eerstvolgende kans als alles al gedaan is.
- **Onderduiken met de trein gaat echt het Ommeland in.** De kaartautomaat
  zet de dorpen bovenaan ("Onderduiken"), een ritje binnen Stad telt niet
  meer, en in het dorp lopen Tammo en Tessa eerst even naar het eerste
  dorpsuitje. Daar, tussen de koeien, speelt hun scène.
- **Eén radiozender: G-Music.** Geen lijst met zenders meer, maar één
  station met korte programma's die de klok in het spel volgen: *Proat in
  de ochtend* (06:00-10:00, vlot, elke twee nummers Geesje met het nieuws,
  het verkeer of het weer), *De hits* (10:00-18:00, vooral muziek met af en
  toe Kiekdoar-nieuws), *Avondproat* (18:00-22:00) en vanaf 22:00
  *Nachtstreek*, met Rikus en zijn rustigere streekmuziek door een oude
  radio. Alle praatjes zijn bestaande opnames. N zet de radio aan of uit, te
  voet en in elk voertuig; op de controller is dat LB in een voertuig, en
  Instellingen › Geluid heeft een knop Aan/Uit naast het volume. B doet
  niets meer. De melding bij een nieuw nummer noemt de zender en het
  programma. Rikus' telefoontjes onderbreken een praatje net als eerst. Een
  save met een oude zender zet de radio aan; stond hij op uit, dan blijft
  hij uit.
- **Grotere knoppen onderin het pauzemenu.** Hoofdmenu, Afsluiten en
  Opnieuw beginnen zijn nu echte knoppen in plaats van kleine linkjes.
  Opnieuw beginnen staat apart onder een rode lijn en vraagt nog steeds
  eerst om bevestiging. Op een Steam Deck (1280×800) past het hele menu
  zonder scrollen.

### Opgelost
- **De skûtsjerace is te winnen.** Jelle liep altijd uit; met een goede
  koers win je nu. Beide skûtsjes liggen al klaar bij de start, en onder een
  brug kruip je niet meer.
- **Geen vreemde piep meer** bij radio-jingles en oproepen.
- **Achterom kijken (Q) werkt ook bij hoge snelheid.**
- **Het hoofdmenu toont de Pleiadenlaan zoals in de game**, met bomen,
  straatmeubels en naambordjes.
- **Voetstappen klinken altijd**, op elke ondergrond, met een landingsgeluid na
  een sprong.
- **Een overgespoten politieauto krijgt echt de nieuwe kleur.**
- **De kaart flikkert niet meer bij inzoomen.**
- **Navigatie in het Ommeland volgt de wegen.** De route op de minikaart,
  de kaart en de lijn op de weg loopt nu over de landwegen en sluit netjes
  aan op de straten van Stad, ook naar boerderijen ver in de polder. Geen
  rechte strepen meer dwars door de weilanden, geen routes die ineens
  ophouden, en wie van de route afwijkt krijgt meteen een nieuwe. Sta je
  midden in een weiland, dan wijst de lijn je eerst naar de dichtstbijzijnde
  weg.
- **Geen plotselinge noodstops meer in de wei.** Over gras rijd je wat
  langzamer, maar je remt niet meer ineens af; een smalle sloot is een hobbel
  in plaats van een muur. Alleen in een maar of kanaal kom je echt vast.
- **Echte voertuigen in het Ommeland.** Auto's, bestelbussen, trekkers en
  fietsers op de landwegen zijn dichtbij echte voertuigen: je kunt ze kapen,
  van de fiets duwen, rammen en in elkaar rijden, net als in de stad. In de
  dorpen staan auto's langs de stoep en bij de boerderijen staan trekkers
  die je kunt meenemen.
- **Laten afleveren werkt nu ook in het Ommeland.** De bezorger zet je auto
  in de berm van de dichtstbijzijnde landweg neer, in plaats van te melden
  dat hij nergens kan parkeren.
- **Geen huizen en schuren meer midden op de weg in het Ommeland.** Een
  gebouw dat op een weg uitstak wordt aan die kant ingekort, en een aanbouw
  of gebouw dat er echt op stond is weg.
- **De ringweg ziet er weer heel uit.** Waar de ring een tunnel of verdiepte
  bak in duikt, flikkerde het gras en de grond door het asfalt heen; dat is
  weg. De grasbermen van de dijken en viaducten liggen niet meer over een
  weg ernaast, en hun voet knippert niet meer met het gras eromheen.
- **Geen bomen, heggen, hekken en riet meer op de wegen in het Ommeland.**
  Alles in het buitengebied blijft nu van de weg, de berm, fietspaden en
  opritten af; ook de bomenrijen in de verte stoppen waar een weg ze kruist.
- **Je kunt in het Ommeland weer rakelings langs tegenliggers rijden.** Auto's,
  trekkers en fietsers daar botsten al op meer dan een meter naast hun
  carrosserie; nu tellen ze, net als in de stad, alleen nog hun echte vorm.
- **Koplampen en achterlichten blijven aan de auto vast.** In verdiepte en
  verhoogde stukken van de ring en op hellingen hing de lichtbundel niet meer
  op straatniveau of in de lucht, maar volgt hij de hoogte en helling van de
  auto. Verkeer uit het Ommeland keert nu om voor het de stad in rijdt.
- **Uit het water klimmen doe je nu met Spatie** (A op de controller). E is
  voor instappen: zwem je naast een boot langs de kade, dan klim je met Spatie
  de kade op en met E aan boord, in plaats van per ongeluk in de boot.
- **H6: allebei in het zwart.** Koop je zwart incognito, dan trekken Tammo
  en Tessa het meteen allebei aan (ook na het laden van een spel), niet pas
  als je in een voertuig stapt.
- **H6, de kraak, is eerlijker en duidelijker.** In zaal 3 staat boven je
  hoofd wat de volgende laser vraagt (bukken met Ctrl, springen met Spatie,
  wachten of met het gat meelopen), de lasers zijn iets minder streng en na
  twee keer piepen zet Tessa er al één uit. De drie minuten lopen niet door
  terwijl je teruggestuurd wordt, en zijn ze toch om, dan zet Tammo de
  camera's nog één keer anderhalve minuut op herhaling. Een tweede poging
  slaat het hele plan-gesprek over en gaat meteen naar de keuze. Op de
  vlucht over het water zit er twee sterren politie achter je in plaats van
  drie.
- **De camera's bij het museum staan weer op de kaart.** Ze werden
  geplaatst langs de route vanaf waar je de missie toevallig startte, en
  konden zo buiten de bouwtekening of in het kanaal belanden. Nu staan ze
  altijd op droge grond langs de route vanaf het startpunt. De verhaaltest
  controleert dat, en ook dat geen enkele filmcamera buiten de wereld staat.
- **Je auto laten afleveren werkt nu ook in het Ommeland.** De bezorger
  zocht alleen een parkeerplek in de stad en gaf het buiten de stad op; nu
  zet hij je auto in de berm van de dichtstbijzijnde landweg. Een auto die
  je in het Ommeland hebt geparkeerd staat er na het laden ook nog.
- **"US MEM VET" zit vast op de tankwagen.** De letters op de tank deinden
  niet mee met de vering; nu kantelen en veren ze mee met de wagen.
- **H11: ze drinken echt.** Bij het proosten houden Tammo en Tessa hun glas
  rechtop bij het klinken, brengen het daarna naar hun mond en nemen een
  flinke slok met het hoofd achterover, in plaats van het glas naast hun
  wang te houden.
- **H16: de Escapade terugpakken telt.** Stap je zelf in de gestolen
  Escapade, of zet je hem klem zodat hij een paar tellen stilstaat met jou
  ernaast, dan is hij gestopt: Durk en Douwe vluchten en de trein gaat
  zonder hem. Klem zetten vlak bij de trein laadt hem niet meer alsnog in.
- **H18, de finale, is te winnen.** Het vuurwerk bij de kraam raakt minder
  vaak en kost minder tijd. De trekker-limo van Jelle bleef soms eindeloos
  staan aan het eind van een straat waar zijn route niet verder kwam; nu rijdt
  hij door. Tammo fluit de duiven al als je een derde van de meter hebt
  geramd, als je 25 seconden vlak achter de trekker blijft of als je hem
  klemzet, en dat staat in de opdracht. Geen politie meer tijdens de
  achtervolging, meer tijd en ruimte om bij te blijven, en vier in plaats van
  tweeënhalve minuut terug naar de kraam.
- **H13: de zoen op het voordek, niet op het dak.** Op de rondvaartboot
  stonden Tammo en Tessa midden onder de glazen kap, met hun hoofd erdoorheen.
  Nu staan ze in de open punt voor de kap, op de vloer van de boot, en daar
  leunen ze ook samen over de reling.
- **Fierljeppen reageert weer op Spatie.** Tijdens het mikken liep er een
  camerashot, en dat slikte elke Spatie in alsof je een filmpje wilde
  overslaan (daarom werkte het pas weer na "Zet me vrij"). Dat shot laat
  Spatie nu door. En een knop die nog focus had van een kaartje of menu
  maakt van Spatie of Enter geen klik meer zolang je speelt.
- **De ringweg-race (H9) vraagt een snelle auto.** Starten in de
  frituurvet-tankwagen of op de fiets kan niet meer: je hebt een
  sportwagen nodig, of een auto die 200 km/u haalt. De Escapade haalt dat
  pas na een tuning-upgrade bij Knal & Kolder. De stap ervoor wijst de weg:
  de Escapade halen en opvoeren, of een sportwagen kopen. Kom je in het
  verkeerde voertuig aan, dan zegt Tessa wat er mis is ("Met die vetwagen
  win je geen race. Haal je snelste auto.").
- **De KEI-weekrace (H5) rijd je op een gewone fiets**, niet op een
  fatbike of te voet. Bij de rondvaart (H13) stap je uit je eigen boot en
  in de rondvaartboot; de route wijst nu ook echt naar die boot.
- **Geleende voertuigen gaan terug.** Na H1 rijdt Berend zelf weg in zijn
  bakkie. De decorauto (H7) en de tankwagen (H8) blijven op hun plek, en
  de rondvaartboot (H13) blijft aan de kade. Je loopt verder, en de route
  gaat eerst langs je eigen vervoer als de volgende stap ver weg is.
- **Vuurwerk en de jachtgeweer maken weer geluid.** Een drukke frame
  (schoten, voetstappen, vogels) gooide alle geluiden na de eerste acht
  weg; die spelen nu een frame later. Elk schot is een eigen geluid, ook
  als de kogel meteen raakt. Vuurpijlen fluiten bij de lancering, het
  vuurwerk van H18 fluit naar beneden en knalt. Vuisten en een leeg
  magazijn hebben nu ook een geluid. `node scripts/weapon_audio_test.mjs`
  controleert dat elk wapen zijn geluiden heeft.
- **Het jachtgeweer schiet waar het vizier staat.** Door de scope vliegt
  de kogel vanaf het oog, recht langs het kruisje: zonder hand-afwijking,
  spreiding of aim assist, en het vizier kijkt waterpas.

### Verbeterd
- **Heggen en hekken in het Ommeland houden je tegen.** Je loopt er niet
  meer dwars doorheen; met Spatie spring je eroverheen, net als over de
  hekjes in de stad. Door een hek op de dam loop je gewoon het land op.
- **De weilanden in het Ommeland hebben echte randen.** Langs de sloten
  ligt een lage, donkere grasrand met hier en daar een pol pitrus, de
  weiden staan achter prikkeldraad op houten palen, langs de polderwegen
  loopt een afrastering achter de berm met af en toe een hek naar het
  land, en soms staat er een heg of een houtwal tussen twee percelen.
  Op Laag is het wat kaler, zodat het spel net zo soepel blijft lopen.
- **Twee kamers in de flat.** Tammo en Tessa huren de flat als huisgenoten,
  dus nu heeft elk een eigen kleine slaapkamer met een eenpersoonsbed:
  Tammo's kamer naast de gang, die van Tessa achter de keuken. Lift, gang,
  woonkamer en de glazen gevel zitten waar ze zaten. Je slaapt in je eigen
  bed, als Tammo of als Tessa; het andere bed zegt beleefd dat het niet jouw
  kamer is. Elke kamer heeft een kledingkast. EIKEA's Sloapstee is nu een
  setje van twee eenpersoonsbedden, met dezelfde bonus.
- **Je garage laat zien wat je hebt.** De garage onder de flat heeft 18
  vakken voor auto's (plus het eigen vak van de Escapade). Heb je er meer,
  dan wachten de rest in de parkeerlift. Het paneel bij de deur heet nu
  "Kies welke auto's in de garage staan": je ziet welke auto in welk vak
  staat en welke in de lift wachten, en je haalt er een naar voren. Die
  keuze blijft in je save. Een vreemde auto in een vak blokkeert dat vak
  niet meer voor de rest: de volgende auto krijgt een vrij vak. In het
  Garage-menu staat bij elk eigen voertuig waar het thuis staat: "vak 7",
  "in de parkeerlift", "langs de stoep", "in het fietsenrek", "aan jullie
  steiger" of "op het helidek". Voertuigen die nog niet van jou zijn, heten
  nu duidelijk "Te koop · €…", vrijgespeelde specials "Vrijgespeeld", en de
  kop telt van jou, te koop en op slot apart.
- **Minder herhaling op de radio.** Een nummer dat je net hoorde, komt pas
  terug als ruim de helft van de andere nummers is geweest, ook in een
  nieuwe sessie. Nummers die lang niet speelden, komen eerder. 's Nachts
  draaien de nachtnummers vaker, en Nachtstreek heeft een eigen, rustigere
  lijst. Er zit niet meer tussen elk nummer een jingle, en nooit twee keer
  dezelfde achter elkaar.

### Verhaal
- **Het verhaal brengt je weer thuis.** Wachten tot middernacht voor de
  museumkraak doe je nu in de flat in Paddepoel, niet meer bij Henk in de
  garage. Ga naar huis, met de lift naar boven, en even later volgt een
  kort scènetje op de bank. Even slapen tot de avond mag ook: de scène komt
  als je wakker wordt. Henk belt tijdens het wachten: hij heeft een zender
  in de Escapade gezet (die heb je in H16 nodig), vraagt niet waarom jullie
  nog op zijn en gunt je één koekje. Een missie die het donker nodig heeft,
  stuurt je voortaan ook naar huis in plaats van naar een garage.
- **Nieuw: de flat inrichten bij EIKEA.** Na Berend (H1) slapen Tammo en
  Tessa nog op een luchtbed. Rij met de Escapade (of een andere auto) naar
  EIKEA aan de Sontweg. Bij het laadperron volgt een scène: het lijstje, de
  kast die niet in de lift past, en wie de kamer met uitzicht krijgt. Daarna
  staan er drie dozen op je dak. Een flinke klap onderweg kost een doos:
  eerst de lamp, dan de boekenkast, de bedden als laatste. Thuis gaan de
  dozen met de lift naar boven en zet je alles in elkaar ("Er blijft één
  schroefje over"). Wat heel aankomt, staat in de flat met zijn bonus:
  Sloapstee, Buukenkaas en Lichtje Tjoek. Overslaan geeft ze ook. Een oude
  save die al verder is, slaat deze stap over. Alle nieuwe zinnen zijn
  ingesproken.
- **Een avond thuis.** Tussen de fatbikes (H12) en de rondvaartboot (H13)
  zit een nieuwe, rustige stap: Tessa vraagt of Tammo naar huis komt, en op
  de bank overhoort ze haar gids voor morgen. Met nieuwe stemmen. Een oude
  save die al verder is, slaat hem over.
- **Een klein lampje in september.** In het slot van het verhaal heeft
  Rikus één zin meer over de elfde verdieping in Paddepoel.

## [0.26.1] - 2026-10-04

### Opgelost
- **De kaart in het pauzemenu flikkert niet meer bij het zoomen.** Zolang
  de tegels van de nieuwe zoomstap nog niet klaar waren, zag je alleen het
  grove stadsoverzicht op een kale weide, en in het Ommeland helemaal niets.
  Op een groot scherm met een hoge resolutie paste één beeld niet eens in de
  tegelcache, waardoor zichtbare tegels elk frame opnieuw getekend werden. Nu
  blijft het laatste complete beeld eronder liggen, verschoven en geschaald
  naar de nieuwe stand, en worden zichtbare tegels nooit weggegooid.
- **Geen zwarte flitsen meer.** Als de automatische resolutie een stap
  zette, was het scherm één frame helemaal zwart. Dat gebeurt niet meer.
- **De automatische resolutie blijft rustig** op een snelle videokaart: hij
  schakelt alleen nog terug als de videokaart echt een paar seconden achter
  elkaar te druk is, en springt niet meer heen en weer.
- **Geen grote hapering meer bij de eerste luchtballon**: die wordt nu al
  tijdens het laden voorbereid.
- **De minimap draait weer vloeiend mee** in plaats van te stotteren.
- Een verloren grafische context komt nu in het foutrapport.

## [0.26.0] - 2026-10-04

### Veranderd
- De kaartautomaat op het station toont alleen nog stations waar je echt
  heen kunt; de grijze "Verder weg"-lijst buiten het speelgebied is weg.

### Verbeterd
- De uitlegkaartjes voor nieuwe spelers tonen de knop van je controller als
  je die het laatst gebruikte, en anders je eigen toetsindeling, net als de
  andere toetshints.
- Geen haperingen meer in de HUD na een sprong of bij snel rijden over de
  ring: de minimap tekent nieuwe stukken Ommeland in de rusttijd tussen
  frames, en instappen, een nieuwe melding, een ander wapen of doel en een
  nieuw nummer op de radio dwingen geen extra opmaakberekening meer af.
- Het spel is 17 MB kleiner: 746 stemopnames die nergens meer werden
  gebruikt zijn weg (`scripts/audio_unused.mjs`).
- Minder haperingen op de ring: viaducten, taluds, keermuren, vangrails en
  tunneldaken worden nu in de achtergrond opgebouwd. Na een sprong over de
  ring kost het wegennet de helft minder tijd per frame en geen frames
  meer van 8 ms of langer.
- De portretjes van Tammo en Tessa in de HUD worden bewaard, zodat het spel
  ze bij een volgende start niet opnieuw tekent (alleen na een nieuwe outfit
  of een nieuwe versie).
- Geen hapering meer als je voor het eerst instapt: het plaatje van je
  voertuig bij de snelheidsmeter wordt vooraf en in de rusttijd tussen
  frames gemaakt (je eigen Escapade bij de start, en elk voertuig waar je
  naartoe loopt).
- De toetsen onder de heli-HUD volgen je eigen toetsindeling.

- **Netter Grunn**: een stoep op een oprit hangt niet meer boven de rijbaan
  van een lagere oprit, minder gaten langs het water, en de galerijflats in
  Paddepoel en het tankstation flikkeren niet meer.

### Opgelost
- In de browser sloot Ctrl+W het tabblad als je bukte of met de heli
  omlaag ging terwijl je W vasthield. In de webversie zitten bukken, heli
  omlaag en pikken nu standaard op C (koeren op G); de desktopversie houdt
  Ctrl. Besturing en alle toetshints tonen de toets van jouw versie, en de
  drie ingesproken tips die "Ctrl" zeiden noemen geen toets meer.
- Kiekdoar meldt niet meer dat een agent of voetganger "gewond" is: ze gaan
  tegen de vlakte of van de sokken, en staan weer op (opnieuw ingesproken).
- Je eigen boot liep vast net buiten de stad in het smalle kanaal aan de
  noordkant; nu vaar je uit alle zeven kanalen het Ommeland in en weer
  terug (`node scripts/boat_edge_sim.mjs`).

## [0.25.0] - 2026-10-04

### Nieuw
- **Uitleg voor nieuwe spelers:** korte tips op het moment dat je ze nodig
  hebt, één tegelijk en elk maar één keer: je eerste klus en waar je heen
  moet, geld en winkels, zelf een doel kiezen op de kaart, en Te doen. Speel
  je vaker zulke games, zet ze dan uit onder Instellingen › Weergave ›
  "Uitleg voor nieuwe spelers".
- **Foutrapport** onder Instellingen: gaat er iets mis, dan schrijft het spel
  dat op in een logboek op je eigen apparaat. Je kunt het kopiëren of, in de
  desktopversie, als bestand opslaan om mee te sturen met een melding. Er
  wordt niets verstuurd.
- **Save-garantie:** elke save heeft nu een versienummer, en oudere saves
  worden stap voor stap bijgewerkt als je ze laadt. Saves vanaf 1.0 blijven
  werken in elke latere versie. Voor de eerste bijwerking bewaart het spel
  een kopie van je oude save.
- **Twee Steam-trailers.** `--trailer-cut=gameplay` (~63 s) begint met het
  logo en laat in shots van twee seconden zo veel mogelijk missies zien, met
  de echte HUD: van Berends bakkie en de pinautomaat tot het skûtsje,
  sterren en politie, de heli door de ringen, de stuntavond met zijn score,
  een bijbaantje, Ubbo op de telefoon, dag en nacht, met droge kaarten
  ("Een hele stad. Een heel Ommeland.", "18 missies.", "Gratis ·
  Nederlands gesproken"). `--trailer-cut=verhaal` (~80 s) vertelt het
  verhaal tot de geplande kraak, met echte regels uit de game: de Fjord
  Frituur, de Gouden Eierbal, Jelle, en Rikus over het Ontzet.

### Gewijzigd
- **Anita heet nu Tessa.** Het duo is nu Tammo en Tessa, overal waar je het
  ziet of hoort: dialogen, ondertitels, naamkaarten, HUD, het Verhaal-menu,
  prestaties, besturing, aftiteling en trailer. De zinnen waarin haar naam
  valt zijn opnieuw ingesproken. Je opslag blijft gewoon werken.
- De disclaimer staat niet meer op het laad- en startscherm, alleen nog in
  Over, de aftiteling en de README.
- **Minder toetshints:** lopen, rondkijken, rennen, springen, bukken,
  zwemmen, en gas, handrem, toeter, radio en filmcamera in voertuigen wijzen
  zichzelf. De hints linksonder gaan nu alleen nog over in- en uitstappen,
  je telefoon, de kaart, het pauzemenu (nieuw), kusjes, wapens en de
  helikopter en de trein.
- **Trailer: geen lege vitrine meer.** Shot 11 toont de Gouden Eierbal in
  zijn vitrine, gloeiend, ook in de benchmark. De tankwagen laat dikkere
  druppels vet vallen, Durk zingt in de Poelestraat onder een terraslamp, en
  ondertitels en naamkaarten zijn groter. De fades naar en van zwart staan
  nu ook in de video-export (dat waren harde cuts).
- **H6: de lege vitrine is nu een echte onthulling.** De koepel is van
  matglas met een gouden gloed, dus je ziet pas wat er (niet) op het kussen
  ligt als je het slot gekraakt hebt: de camera schuift in stilte naar binnen,
  de koepel gaat omhoog, een leeg kussen, het kaartje in close-up. Kort en
  wegklikbaar. Het kaartje is nu getekend "– J.", en na Jelles telefoontje
  naar Nachtstreek valt bij Tessa het kwartje: "J. Van Jelle. Natuurlijk."
- Oude saves nemen de tellers mee van vóór 0.24 ("kills" heten nu
  knock-outs), in plaats van ze te laten vallen.
- Een save van een nieuwere versie van het spel wordt niet meer
  overschreven zonder kopie.

### Verbeterd
- **Netter Grunn**: stoepen flikkeren niet meer in scherpe bochten, de
  Osloweg sluit aan, gaten bij kademuren en in verdiepte wegen zijn dicht,
  geen zwevende gebouwtjes meer aan het water, en minder flikkerende banden
  op het Stadhuis, de Korenbeurs, het Groot Handelshuis en de A-kerk.

## [0.24.0] - 2026-10-03

### Nieuw
- **De game heet nu GDE Groningen – Zomer vol misdaad.** GDE staat voor
  Grootste Diefstal Ever. Het nieuwe logo zet GRONINGEN op een groen
  plaatsnaambord, op het laadscherm, het titelscherm, in het pauzemenu, de
  trailer, de aftiteling en het app-icoon. "GTE VI" en "Grand Theft" zijn
  overal weg. Je saves, instellingen en prestaties blijven gewoon staan.
- **H15 is één vlucht: "Het staat niet in het rooster"** (was "Spoedeisende
  duif"). Je stijgt op bij Rotor Roelf op Eelde, onderweg belt Dokter
  Dijkstra met een spoedje (de nachtdienst heeft honger), je landt op de H
  van het UMCG, Dijkstra stapt in met de lier, en dan door de ringen naar
  Jelles ballon in het Oosterpark. Tammo haalt de Eierbal uit de mand en je
  zet de heli netjes terug op de H. Geen tweede heli meer; de proefvlucht is
  nu kennismaken met Roelf op Eelde. Nieuwe zinnen, ingesproken.
- **Padel tegen Durk en Douwe heeft een reden:** bij de baan dagen ze Tammo
  uit, want Jelle wil dat ze jullie een uur bezighouden. Dat had Douwe niet
  moeten zeggen.
- **Samen gaan wonen** in de opening: de zolder in de Korenbloemstraat is te
  klein (en te duur voor één), dus huren Tammo en Anita samen een flat in de
  House of Groningen in Paddepoel. "Als huisgenoten." Met een verhuisdag bij
  de toren, en daarna is Paddepoel thuis. Nieuwe autogesprekken over de lift
  en de afwas.
- **Even onderduiken** na de kraak heeft nu een duidelijke bestemming en drie
  keuzes, allemaal op de kaart: de trein vanaf het Hoofdstation, een ijsje in
  het Noorderplantsoen of de zonsondergang aan de Hoge der A. Elke keuze heeft
  een korte scène waarin ze naar elkaar toe groeien.
- **Een eigen icoon per missie** in Te doen, op de kaart en minimap, in de
  telefoon en op de missiekaart in de HUD.
- **De complimentenladder** staat uitgelegd in "Wat weten we?" (Ow, Goud,
  Valt mie nait of, Braid noar de zin, Kon minder en de stilte).
- **Controllersupport** voor Xbox-, PlayStation- en Steam Deck-controllers:
  lopen, rennen, springen, bukken, de camera, rijden met gas en rem op de
  triggers, de handrem, in- en uitstappen, richten en schieten, wapens
  wisselen, telefoon, kaart, pauzemenu, filmpjes overslaan en kusjes. Ook de
  helikopter, de duif, de trein, het skûtsje, de Fjord Frituur, padel,
  carbid, de botsauto's en de andere minigames. Alle menu's werken met de
  D-pad of de stick: kiezen met A, terug met B, onderdelen op de bumpers en
  tabbladen op de triggers. Op de kaart zet A een doel onder het kruis.
- **De hints wisselen vanzelf** tussen toetsen en controllerknoppen, naar wat
  je het laatst gebruikte. Xbox en Steam Deck krijgen letters, PlayStation de
  vormen.
- **Trillen** bij klappen, schoten en botsingen (als de controller dat kan),
  uit te zetten onder Instellingen › Controller.
- **Toetsen en knoppen opnieuw indelen** onder Besturing › Toetsenbord en
  Besturing › Controller. Zit een toets al op iets anders, dan ruilen ze; met
  "Standaard herstellen" staat alles weer zoals het was.
- **Toegankelijk** onder Instellingen: ondertitels klein, normaal, groot of
  extra groot (filmpjes, gesprekken in de auto, de intro, telefoon, radio en
  naamkaarten), met een donker vlak erachter als je wilt; kleurenblinde
  paletten (deuteranopie, protanopie, tritanopie) voor markers, routes, de
  kaart en de HUD.
- **Meer leven op het water**: suppers (stand-up paddle), meer kano's,
  kajaks en waterfietsen tussen de sloepen, en hier en daar een paar zwanen.
  Op Laag varen er wat minder.
- **Zwemmers in zwemkleding** (zwembroek, badpak of bikini). Ze zwemmen een
  rustige schoolslag, drijven op hun rug of watertrappelen kalm, en soms zit
  er iemand op de oever met de voeten in het water. Ze zwaaien niet meer.
- **Stuntavond (H3) met een scorebord**: vooraf zie je wat punten oplevert
  en hoeveel je nodig hebt. Daarna toont een paneel je punten tegen het doel
  met een voortgangsbalk en je combo. Elke actie geeft een pop-up ("+120
  parasol", "combo x2", "-250 iemand geraakt"), en tegen het eind staat er
  "nog X punten".
- **Een proost in elke kroeg (H11)**: een kort, overslaanbaar moment waarin
  Tammo en Anita klinken en drinken. Elke kroeg heeft een ander glas, een
  ander shot en één zin of geen.
- **Meer op de rondvaart (H13)**: een scène waarin Schipper Wiebe zegt
  waarom hij zo boos is (één biertje, en zijn boot met betalende toeristen
  was weg), een scène als hij zijn hoofd stoot onder de H.N. Werkmanbrug,
  en daarna gaat Tammo gewoon verder als gids. Onderweg groeit er iets
  tussen hen (een blik, hun handen op de reling, "praat straks eens tegen
  mij") tot aan de kus. Na de intro zie je vanaf het water hoe ze aan boord
  zijn.
- **"US MEM VET"** staat in Friese stijl op de tankwagen (H8): de banen en
  pompeblêden, en Us Mem de koe.
- **Een Linux-versie, ook voor de Steam Deck** (nog niet op het toestel
  getest): een AppImage en een tar.gz voor x64, niet ondertekend, net als de
  Mac- en Windows-versie. Saves en instellingen staan in `~/.config/GTE VI`.
  Het releasescript bouwt hem mee met `--linux`, en met `--web` de webzip
  (alleen lokaal, die wordt nergens geüpload). Voor Steam staan er
  SteamPipe-sjablonen en een kopieerscript klaar in `steam/`; er wordt nog
  niets naar Steam gestuurd.

### Verbeterd
- **Nieuwe heli-besturing:** W/S vooruit en remmen, A/D draaien, Shift
  sneller, Spatie omhoog en Ctrl omlaag. In Besturing, de hints en op de
  controller (de linkerstick vliegt, A of RT omhoog, B of LT omlaag, RB
  sneller). Alles blijft aan te passen.
- **De ballonjacht is te doen:** je vliegt de heli zelf, met grote ringen, een
  pijl met afstand en hoogte naar het volgende doel, een lichtzuil op de H,
  een beetje stuur- en hoogtehulp en een ruimere zone naast de mand. Tegen de
  ballon botsen kost voortgang, geen mislukte vlucht meer.
- **Routes het Ommeland in:** de weg naar carbid bij boer Roelf en naar Rotor
  Roelf op Eelde, en vanaf daar terug de stad in, ook naar een padelbaan.
- **H6: allebei in het zwart.** Tijdens de kraak dragen Tammo en Anita
  allebei zwart incognito, wie het ook kocht. In de trein bij het onderduiken
  trekken ze hun eigen kleren weer aan.
- **H6: de vlucht eindigt bij het station.** Na de kraak wijst de waypoint
  niet meer naar het museum maar naar een kade bij het Hoofdstation. Schud
  de politie af en leg daar aan.
- **H8: de tankwagen staat waar het verhaal zegt**, bij de groothandel aan
  de Bornholmstraat, en rijdt pas weg als je dichtbij komt. Erin springen is
  de bedoelde route: dan rij je meteen door naar de Oosterpoort. Banden plat
  schieten kan nog steeds.
- **H5: ieder op een eigen fiets.** Anita fietst niet meer achterop, dus het
  oogcontact op het kruispunt waar alles groen is klopt weer.
- **H13: een eerlijke medaille.** Goud vroeg een snellere tijd dan de boot
  kan varen, dus je kreeg bijna altijd brons. Goud en zilver zijn nu haalbaar
  (nog steeds met blije toeristen), en de uitslag toont ook hoeveel verhalen
  je hebt verteld.
- **H14: aan boord van het skûtsje** filmt de camera vanaf de boeg, zodat
  het zeil niet meer voor de scène hangt.
- **Durk en Douwe fietsen niet meer door muren** na Jelles polsstoksprong
  (H8, H14): ze nemen de vrije kant op, of slaan buiten beeld de hoek om.
- **Niet meer alles tegelijk**: één wachtrij voor het verhaal. Telefoontjes,
  "Bel Rikus" op de radio, autogesprekken, berichten, prestaties en HUD-kaarten
  komen na elkaar, met een korte pauze ertussen, en nooit tijdens een filmpje.
  Autogesprekken wachten tot het verhaal klaar is. Kaarten gaan even opzij als
  er een ondertitel of de radio in beeld is. Een "Bel Rikus" die door een
  filmpje werd onderbroken, speelt de rest later.
- **De delen hebben gewone namen**: "Deel 1: KEI-week", "Deel 2: Noorderzon" en
  "Deel 3: Kermis en Ontzet", in Te doen, het Overzicht, het Verhaal-menu en
  op de titelkaarten.
- **"Huur een boot"** in plaats van "koop een huurboot"; boten en dorpsfietsen
  hebben een knop "Huren voor".
- **De treden** worden duidelijk: Anita zegt "trede twee van de
  complimentenladder", en Tammo telt ze in de auto op.

- **Minder haperingen en minder geheugen**: wegen, terrein, straatobjecten,
  oevers en het water in het Ommeland worden in een aparte thread gebouwd. Op
  de ring zijn de laatste pieken weg, en de game gebruikt ongeveer 170 MB
  minder geheugen. Heeft je computer het druk, dan tekent de minimap minder
  vaak.
- **De ring ziet er netter uit**: geen zwarte laag meer tussen de straat en de
  verdiepte rijbanen, minder losse randen naast verhoogde wegen, en een
  gebouw aan de Expositielaan zakt niet meer weg.
- **Boten kunnen de stad uit varen**, het Ommeland in en weer terug.

### Opgelost
- De minimap draaide niet mee tijdens de heli-missie en de ringen stonden er
  niet goed op; nu draait de kaart met de heli en staan de ringen, de H en de
  ballon op hun plek. In een heli is de route een rechte lijn.
- Tijdens padel waren de tegenstanders niet te horen. Tijdens padel, carbid
  en de botsauto's stonden er waypoints en een missiebaken naar de volgende
  missie; die zijn nu weg tot het spel klaar is.
- Kusjes konden te vroeg als je "Alles klopt, behalve de papieren" vooruit
  speelde vanuit Te doen. Nu pas als het verhaal er echt is.

- **Voertuigbadge**: het merk en de naam van je voertuig staan erbij, en de
  staat ervan is een hartje met een balk die leegloopt bij schade (rood als
  het slecht gaat), in plaats van "Schade".
- **"Prestatie wacht" en "meldingen wachten"** staan nog maar een paar
  seconden in beeld na iets nieuws en vervagen dan. Na het pauzemenu komt
  "prestatie wacht" nog even terug zolang je hem niet bekeken hebt.
- **De brommer klinkt prettiger**: zachter, ronder en minder schel, een
  tweetakt zonder zaaggeluid. De Snorscooter klinkt nu ook als brommer en
  niet meer als een e-step.
- **Boten drijven echt**: ze deinen op dezelfde golven als het water,
  kantelen bij snelheid, remmen en bochten, en hun boord komt nooit meer
  onder water (ook de achterkant van de rondvaartboot niet).
- **Hekgolf en boeggolf**: langere zogen achter grote boten, de golfjes in
  de V, een lichte sliert tussen de armen, en een boeggolf die met de boot
  meedeint.
- **Remsporen** volgen het wegdek onder elke band (ook op bruggen, op- en
  afritten en de verhoogde en verdiepte ring), liggen boven de wegmarkering
  en blijven veel langer liggen.
- **Cutscenes, de trailer en het titelscherm** laden de stad rond de camera
  in plaats van rond de speler: gebouwen, wegen, water, bomen, gras,
  schaduwen en het Ommeland. De wijkvlucht en de volgende trailershot worden
  vooraf opgebouwd.
- **De minimap in het Ommeland** lijkt op die in de stad: wegen in dezelfde
  kleuren en breedtes, fietspaden rood, gebouwen in de stadskleuren en de
  namen van dorpen. Tijdens het in- en uitzoomen valt er geen leeg weiland
  meer in.
- Routes en markers verschillen nooit alleen in kleur: de verhaalroute is
  doorgetrokken, je eigen doel gestreept, een klus gestippeld en opknappen
  streep-punt; de pijlen aan de rand van de minimap dragen een ring, punt of
  vierkant, en de 3D-missiemarker is een bol als hij wacht en een pijl als de
  missie loopt.

### Veranderd
- **Geschikt voor 16 jaar (PEGI 16).** Er is geen bloed meer en er vliegen
  geen ledematen meer rond. Ook de instelling "Bloed en ledematen" is weg.
  Wie neergaat, krijgt een stofwolkje en sterretjes boven het hoofd.
- **Niemand gaat meer dood in Grunn.** Wie door een auto of trein wordt
  geraakt, of naast een ontploffende auto staat, ligt een paar seconden
  knock-out. Daarna staat hij suf op en scheldt of rent weg. Wie in de
  gracht belandt, klimt er weer uit.
- **Wapens zijn alleen voor de politie.** Kogels gaan langs voorbijgangers,
  en de richthulp kiest alleen agenten. Een klap tegen een voorbijganger is
  een duw. Je eigen carbidbus blaast mensen alleen omver. Het blijft wel
  strafbaar: getuigen bellen en je krijgt sterren.
- **Agenten worden uitgeschakeld** in plaats van doodgeschoten. Na een
  seconde of negen staan ze weer op en doen ze weer mee.
- **Dieren die je aanrijdt**, vallen even om en lopen dan weg. Vogels
  fladderen op en laten een paar veren achter.
- In de uitslag van een missie staat geen regel "Kills" meer.
- De downloads heten nu `GDE-Groningen-<versie>-mac.dmg` en
  `GDE-Groningen-<versie>-windows-portable.exe`. Op de Mac kun je de oude
  app "GTE VI" weggooien nadat je de nieuwe hebt geïnstalleerd.
- **De nieuwssite heet nu Kiekdoar** ("kijk daar"), een eigen parodienaam:
  de telefoon-app, de pushberichten, Kiekdoar TV en het journaal, de
  nieuwslezers en wat voetgangers en personages erover zeggen. Het scherm
  "Sikkom." bij een net mislukte missie blijft: dat is het Groningse woord
  voor "bijna".
- **De praatzender heet nu Radio Proat**, met nieuwe idents van Geesje.
- **Geen kraskaarten en loten meer.** De winkel Rook & Geluk heet nu
  **Krant & Kauwgom** (kranten, strips, snoep en een eierbal uit de muur).
  In plaats van gokken krijg je een **spaarkaart**: elke aankoop daar is een
  stempel, en een volle kaart van 10 stempels lever je in voor €10. Geen
  inzet en geen geluk nodig. Nieuwe prestatie: "Stempeltje erbij".
- Alle regels met de oude namen zijn opnieuw ingesproken. De oudere clips
  van voetgangers, politie, het nieuws en de G-Music-jingles zijn ook
  opnieuw ingesproken, met dezelfde stemmen als de rest. Nu is van elke
  stem vastgelegd hoe hij gemaakt is.
- Cafés heten in meldingen en bij het bestellen nu naar verzonnen zaken,
  zoals Café De Lallende Koe; de kaart toont nog de echte namen. Ook de
  kroegentocht doet verzonnen kroegen aan.
- Na een ziekenhuisrit word je opgelapt bij een "Huisartsenpost" in de wijk,
  niet meer bij een echte praktijk.
- De gevels van Kruidvet, Albert Hijgt, DUMBO, Blokkie en Wiebel en het bord
  van Bakkie Prut hebben eigen kleuren, niet meer die van de echte ketens.

## [0.23.0] - 2026-10-03

### Nieuw
- **Over** in het hoofdmenu: credits, licenties en privacy. De kaartdata
  komt van OpenStreetMap; dat staat nu ook op het laadscherm, linksonder op
  de grote kaart en in de aftiteling.
- Duidelijke disclaimer: GTE VI is een fanparodie en heeft niets met
  Rockstar Games of Take-Two te maken. Namen en gebeurtenissen zijn verzonnen.

### Veranderd
- **Kusjes geven kan pas na de eerste kus** in "Alles klopt, behalve de
  papieren". Daarvoor staat de optie nergens: geen K-hint, niet in
  Besturing en geen kusjes-prestaties. Op dat moment meldt de game "Nieuw:
  geef elkaar een kusje met K".
- Het tankstation aan de Pleiadenlaan heet nu Bakkie Prut.

### Verbeterd
- **Boerderijen en huizen in het Ommeland hebben hun echte vorm.** Een
  L-vormig huis of een boerderij met een aanbouw was één doos; nu zijn het
  twee of drie delen met daken die netjes in elkaar overlopen.
- **Echte fietspaden in het Ommeland**: rode fietspaden en fietsstroken
  liggen waar ze in het echt liggen, niet meer op elke smalle landweg.
- **Winkelpuien in de dorpen** staan niet meer voor een geschilderde deur of
  een raam.
- **Dorpskerken** hebben bakstenen muren en rondboogramen, en zijn lichter
  om te tekenen.
- **Maren en smalle vaarten zijn echt water**, net als de brede kanalen; de
  oevers van smalle vaarten lopen niet meer in trapjes.
- **Rond de House of Groningen en Atlas** staan nu bomen en hagen langs het
  water, bankjes met uitzicht op de vaart, parklantaarns, jonge bomen in
  bakken langs de garagegevel en lantaarns aan de kant van de Pleiadenlaan.
- **Grote Markt en Vismarkt kloppen beter.** Mutua Fides (Vindicat) is nu
  het okergele bakstenen gebouw met grote ramen, een balkon op de markt en
  een penthouse. Merckt heeft zijn slanke bogen, lichte baksteen met gouden
  lijnen en een kroon. Van Gend & Loos op de Vismarkt 34 staat er met zijn
  trapgevels en de leeuw. De Drie Gezusters hebben hun schilddak, en een
  zijgevel die boven een lagere buurman uitsteekt heeft nu ramen.
- **De galerijflats van Paddepoel** (Pollux-, Castor- en Morgensterflat)
  hebben hun galerijen, raamstroken, balkons en dichte kopgevels.
- **Het Groninger Museum** heeft een gouden toren van panelen, Mendini's
  gekleurde stippen op het oostpaviljoen en naden in de pastelvleugels.
- **Winkelcentrum Paddepoel heeft weer daglicht.** Het glazen dak over de
  winkelstraten is nu echt glas: je ziet de lucht erdoor en de straten
  eronder zijn niet meer donker. De winkelblokken zijn voor helikopter en
  camera even hoog als ze eruitzien (6,6 m, het nieuwe blok 10,8 m).

- **Sneller opstarten**: van het laden tot het titelmenu duurt nu ongeveer
  6 seconden in plaats van 10.
- **Soepeler rijden**: vangrails en muren langs de ring, de horeca-bordjes en
  de gebouwen worden samengevoegd getekend, ook als je hard rijdt.
- **Minder flikkerende gevels**: ramen, luifels, lijsten en panelen liggen
  niet meer precies op de muur, en rijtjeshuizen in het Ommeland vechten
  niet meer om dezelfde voorgevel.
- **Minder flikkerende wegen**: stoepen die elkaar net raken op kruispunten,
  water tegen water en de markering flikkeren niet meer. De Griffeweg sluit
  netjes aan op de brug, en er zijn minder gaten en naden in spoor en oever.

### Opgelost
- **Je garage staat er weer.** Kwam je thuis met de helikopter, als duif of
  na padel of een uitje, dan ontbrak de garage onder de House of Groningen.
  Hij staat er nu altijd, en van ver zie je zijn gevel en dakrand ook.

- Chauffeurs zitten weer in de cabine. In de vrachtwagens (ook de
  vettankwagen uit H8 en de tankwagen van de stuntavond) zat de bestuurder
  laag in de laadbak, in de trekker-limo in de dichte limo en in de
  geldwagen achter in de laadruimte; nu zitten ze achter het stuur, op
  hoogte, met het hoofd achter de ruiten. De trekker heeft een glazen
  cabine gekregen, met een bijrijdersstoeltje. Buschauffeurs en de SUV
  zitten hoger, met het hoofd in de ruiten in plaats van eronder.
- In de trailer zit er geen tweede, onbekende bestuurder meer door Tammo
  heen in de Escapade.
- De race op de ringweg in de trailer (ook achter het titelscherm) rijdt
  weer als een race: de auto's draaien vloeiend door de bochten in plaats
  van bij elk wegstuk een ruk te maken en zijwaarts te verspringen, rijden
  op de oprit en het viaduct op de weg in plaats van erboven of erin, en
  kantelen mee met de helling. De trekker rijdt niet meer dwars door twee
  auto's heen. Ook de trekker-limo op Ring Zuid in de opening van Nieuw
  spel volgt de weg vloeiend.
- In de ringweg-race (H9) komt een vastgelopen tegenstander na het
  terugzetten weer op het viaduct of in de verdiepte ligging terecht, en
  niet meer op de straat eronder of erboven.

## [0.22.0] - 2026-10-03

### Nieuw
- **Het definitieve verhaal: een zomer in Grunn.** Twee weken augustus, van
  de KEI-week via Noorderzon naar de kermis en Gronings Ontzet, met een
  epiloog in september. Alle cutscènes, telefoontjes en berichten zijn
  herschreven en opnieuw ingesproken. Jelle wil de Gouden Eierbal eerlijk
  winnen op de Noordelijke Snackprijs, "foar mem", en Oma Trijntje heeft in
  1953 iets nooit gezegd.
- **Nieuw spel** opent als een trailer, met naamkaarten voor Anita en Tammo,
  en daarna de keukentafel in de Oosterparkwijk, met Nachtstreek op de radio.
- **Bel Rikus.** Elke missie begint op Nachtstreek: een Stadjer met een
  probleem belt in. Na missies de rubrieken: de fietstunnel-update, het
  storingsbericht, de torenwachter en de peiling "Woist ja wel?".
- **Naamkaarten** in GTA-stijl bij elke eerste ontmoeting, met één droge regel.
- **Berend telt de krassen** heeft een nieuwe Berend: Berend Bos, die al
  veertig jaar Bommen Berend speelt. Hij zit in de finale ook in de jury.
- **Iets met de Grote Markt** is een zomerse stuntavond: punten voor
  parasols, kliko's, borden, duiven en de waterwagen, strafpunten als je
  iemand raakt. Er vallen geen slachtoffers meer.
- Missies die mislukken eindigen met "Sikkom.".
- Elke missie heeft een korte afsluiter voor als je hem opnieuw speelt als klus.

- **Nieuwe trailer: "GTE VI — Een zomer in Grunn".** Anderhalve minuut
  zomer: terrassen op de Vismarkt, kleedjes in het Noorderplantsoen, de
  kermis op de Grote Markt bij nacht, een tankwagen vol frituurvet op de
  Europaweg, carbid in het Ommeland. Met naamkaarten voor Anita, Tammo,
  Jelle Terpstra en Durk & Douwe, Rikus op de radio en Berend na het logo.
  Het is ook de benchmark onder Instellingen › Beeld.
- **Desktop: de trailer als video.** `--trailer-video` maakt er een MP4 van
  (1080p60, met muziek en stemmen) in je Downloads, plus een thumbnail.
- **Verhaal in het pauzemenu**: alle personages die je gesproken hebt, met
  hun 3D-model om rond te draaien, hun bekendste uitspraak, wie ze zijn en
  welke missies je samen speelt. Wie je nog niet sprak, is een silhouet.
  Daarnaast alle aanwijzingen per deel van het verhaal.
- **Kies zelf je doel.** Zet een missie, minigame, bijbaantje of plek als
  doel en de route gaat erheen; het verhaal wacht. Bovenin staat dan
  "Doel: …". Klaar of gewist? Dan pakt de route vanzelf het verhaal weer op.
- **Te doen** in het pauzemenu: het hele verhaal per deel, alles wat er te
  doen is per soort, en wat er dichtbij is. Met medailles, records en
  "Zet als doel".
- **Overzicht**: Esc opent op je verhaalstap, wat er dichtbij te doen is en
  welke prestaties bijna binnen zijn.
- **Overzicht laat de plek zien** van de huidige stap: een plaatje uit de
  stad, met de gele marker, zodra je er in de buurt bent geweest.
- **Een dag en datum in Grunn.** Overzicht en de telefoon zeggen welke dag
  het is ("Vrijdag 14 augustus"): elk deel begint op zijn eigen datum, de
  stappen lopen door de dagen heen tot Gronings Ontzet op vrijdag 28
  augustus, en na het verhaal is het september. Wie een nacht doorspeelt,
  gaat een dag verder.
- **Missies opnieuw spelen** levert klusloon op, en de eerste keer brons,
  zilver of goud een bonus.
- **Vooruit spelen mag**, maar het spel vraagt eerst of je dat echt wilt.
- **HUD: echte gezichten.** Linksboven zie je Tammo of Anita zoals ze er
  nu bij lopen, en je maat met een eigen fotootje zolang die meerijdt of
  meeloopt. Tijd, sterren, geld en wapen staan rechtsboven in één blok; in
  een voertuig staan snelheid en schade onder de minimap. Wachtende
  meldingen tellen mee onder de kaartjes, en "opgeslagen" staat bij je
  locatie. Niks in de HUD is klikbaar.
- **"1 prestatie wacht"** in de HUD tot je Prestaties opent; daar staan de
  nieuwe dan bovenaan bij Onlangs behaald.
- **Garage** opnieuw: elk voertuig met een plaatje van het echte model,
  balkjes voor snelheid en trekkracht, en één viewer die draait.
- **Prestaties** opnieuw: een overzicht bovenaan, de categorieën links met
  Bijna binnen eerst, en wat je onlangs behaalde.
- **Ubbo** opnieuw: wat nu loopt, je verhaalstap, wat er dichtbij te doen
  is en de bijbaantjes, dichtstbij eerst.
- **Ballonjacht heeft zilver**: brons voor de ballon, zilver vanaf 2.600 en
  goud vanaf 3.300 punten, met B/Z/G in Te doen.
- **Eén klik naar een stand die past.** Merkt de game bij de eerste start
  dat je computer het zwaar heeft, dan stelt hij rechtsonder een lichtere
  stand voor: één keer op Toepassen en alles staat goed. Bij Instellingen ›
  Beeld kies je nu Laag, Gemiddeld of Hoog in één keer, en de benchmark
  vertelt welke stand het best past, met de fps die je ermee haalt.
- **Wat is er nieuw na een update.** Open je een nieuwe versie, dan begint
  het startscherm bij "Wat is er nieuw", met de versies sinds je vorige keer
  gemarkeerd. De allereerste keer niet.
- **Het startscherm klinkt als de stad**: gedempt verkeer, meeuwen en
  fietsbellen, zonder muziek. De themesong begint pas bij Doorgaan of Nieuw
  spel en speelt één keer de game in.
- **Geen intro meer vóór het menu**: je ziet meteen de levende stad. De
  trailer blijft als benchmark onder Instellingen.
- **Beweging beperken** onder Instellingen › Weergave: geen animaties in
  menu's en tellers.
- **Tammo en Anita wonen nu in echte gebouwen.** De House of Groningen aan
  de Pleiadenlaan en buurtoren Atlas zijn goudgeel gecementeerd metselwerk
  met Franse balkons, echte balkons op de lagere verdiepingen en een kroon
  rond het helidek. De parkeergarage ertussen is van dezelfde steen, met een
  borstwering op het parkeerdek. Het tankstation ernaast heet Bakkie Peut:
  groen-witte luifel, pompeilanden, prijsmast en winkel. In de opening staat
  de Korenbloemstraat er nu uit zoals Bouma hem bouwde: rode baksteen, rode
  pannen, dakkapellen en één verlicht zolderraam.
- **De Grote Markt en de Vismarkt lijken nu echt.** De gevelwanden zijn
  opgedeeld in panden van 5 tot 9 meter, elk met een eigen gevel:
  lijstgevels, gepleisterde gevels met consoles, trapgevels, klokgevels,
  winkelpanden van rond 1900 en de wederopbouw aan de noordkant. Ze hebben
  hoge schuiframen, winkelpuien en markiezen. Nieuw of herbouwd:
  - het Stadhuis met zijn vier zuilen en fronton op de markt;
  - het Goudkantoor met drie topgevels;
  - het Waagstraatcomplex van Natalini;
  - Het Groot Handelshuis in grijs mozaïek;
  - De Drie Gezusters, het Market Hotel en Merckt;
  - de Korenbeurs met Mercurius, Neptunus en Ceres;
  - het zwarte Calmershuis;
  - een glazen kiosk.
- **Dorpskernen in het Ommeland**: bij de kerk ligt een brink met bankjes,
  linden, een pomp en een fietsenrek, langs de straten een snackbar, een
  café met terras, een bakker en meer, met lantaarnpalen, wandelende mensen
  en geparkeerde auto's.

### Veranderd
- **Ontzet, net als in 1672:** de achtervolging volgt het script. Jelle scheurt
  vanaf de hoek van de Grote Markt de Oude Boteringestraat in, over de
  Boteringebrug, langs de Spilsluizen en de Oude Ebbingestraat weer terug naar
  de markt, en de torenwachter meldt elke straat. Blijf erbij (rammen helpt):
  dan fluit Tammo en vliegen de duiven van d'Olle Grieze door het vuurwerk op de
  voorruit van de trekker.
- **Wind tegen, beide kanten op:** het oogcontact is een echte scène. Op het kruispunt waar alles groen is komt Anita op haar eigen
  fiets van de andere kant, ze kijken elkaar aan en remmen allebei.
- **Fatbikes tellen niet als fiets** loopt nu zoals in het script: van de Grote
  Markt de Oude Ebbingestraat uit, over de Ebbingebrug en langs het water naar
  Oma Trijntje aan de Noorderhaven. De fatbikes komen overal om je heen, niet
  alleen aan de uiteinden; de klok en de medailletijden zijn langer.
- Minder verplichte aankopen: alleen een fiets, kraakspullen (zwart of een
  bootje) en een huurboot. De eierbal, het pistool, de uzi, de auto, de bank
  en de bijbaantjes zijn geen verhaalstap meer (te koop blijven ze). Tuning
  van de Escapade blijft aanbevolen. Oude saves lopen gewoon door.
- De Escapade is vanaf het begin van Tammo, en die wordt in H16 gejat (niet
  "Anita's Fjord"). Anita haalt hem alleen terug.
- H2: Durk en Douwe trekken de pinautomaat uit de muur, met Anita's pas erin.
- H6: na de stroomkast heb je drie minuten.
- H18: kraam heel houden, Jelle inhalen en terug naar de jury voordat de
  eierballen koud zijn.
- De autogesprekken volgen het nieuwe verhaal.
- **Zomerweer tijdens het verhaal**: langere droge periodes en geen zware
  stormen meer.
- H1 levert nu de vijftig euro op die Berend belooft.

### Verbeterd
- **Het water in het Ommeland is nu hetzelfde water als in de stad.** De
  kanalen, diepen en meren buiten de stad liggen op dezelfde hoogte als de
  grachten, met dezelfde golfjes, weerspiegeling van de lucht, regen,
  nachtlichtjes en kroos, tussen modderige oevers. Waar een gracht de stad
  uit loopt, stroomt hij nu zonder dijkje door het Ommeland in. Je kunt erin
  vallen en zwemmen, en een auto die erin rijdt zinkt, net als in de stad.
  Sloten en maren hebben de kleur van het stadswater en glanzen mee.
- **Winkelcentrum Paddepoel lijkt nu op het echte.** Vanuit je flat kijk je
  uit op lage winkelblokken met donkere gevels, een glazen kapdak over de
  winkelstraten en een glazen piramide boven het binnenplein. De ingangen
  zijn hoge glazen puntgevels met witte "Paddepoel"-letters, langs de
  buitenkant hangt een glazen luifel met bolle lantaarns en bloembakken.
  Aan de Eikenlaan wonen mensen boven de winkels, en aan de zuidkant staat
  het nieuwe blok van aluminium met een supermarkt en een sportschool erop.
- **De game draait veel soepeler op laptops zonder losse videokaart** en
  op een drukke computer: resolutie en details gaan vanzelf even omlaag
  als het beeld hapert en komen terug als er weer ruimte is.
- **De stad achter het pauzemenu en het hoofdmenu kost minder**: hij loopt
  gewoon door, maar je computer wordt minder warm.
- Het pauzemenu heeft één vaste kolom links die niet meer verspringt.
- Op de kaart staan alleen nog je verhaalmissie en je doel; gespeelde
  missies kun je aanzetten als Klussen. Klik op iets voor een kaartje met
  "Zet als doel", en zoek ook op missies en minigames.
- De kaartlegenda heet nu "Op de kaart", met Diensten en Onderweg ingeklapt.
- Kleine animaties als iets verandert: tellers lopen op, balkjes vullen
  zich en je ziet wat je aan gezondheid verloor.
- De missies hebben nieuwe, drogere namen.
- **Alle stemmen zijn opnieuw ingesproken** met een nieuwer spraakmodel.
  Iedereen klinkt natuurlijker en de emotie per zin komt beter over.
- **Tammo heeft een nieuwe stem** en praat nu als een echte Stadjer, met
  hier en daar een Gronings woord ("Mien droom"). Douwe en de
  taxicentralist hebben Tammo's oude stem gekregen.
- **Het Ommeland ziet er net zo goed uit als de stad.** Rijtjeshuizen zijn
  één rij met één hoogte, één baksteen en de nok langs de straat;
  boerderijen hebben een schilddak. Gevels hebben ramen op maat, een
  voordeur aan de straatkant, metselwerk en dakpannen, en 's avonds brandt
  hier en daar licht, ook in dorpen ver weg. Dorpslantaarns en erven geven
  een plas licht op de grond, auto's en trekkers rijden met koplampen.
  Kerken staan op hun echte plek en maat, met een kruiskerk en een kerkje
  met dakruiter erbij. Wegen hebben middenstrepen en op de smalle
  polderwegen rode fietsstroken.
- **Snelheid en schade met je voertuig erbij**: het badge onder de minimap
  toont een plaatje van de auto, fiets of boot waar je in zit. Hoe meer
  schade, hoe grauwer hij wordt.
- Zonder bescherming verdwijnt het lege schildbalkje uit je kaartje
  linksboven; het komt terug zodra je weer bescherming hebt.
- **Minder haperingen boven het Ommeland**: de minimap tekent het platteland
  niet meer elk frame opnieuw. Wielen, gevels, wegen en winkelborden in de
  dorpen worden samengevoegd getekend, en heeft je computer het druk, dan
  rijdt er tijdelijk wat minder verkeer en lopen er minder mensen.
- **Wegen sluiten beter aan**: geen kieren meer naast verhoogde wegen en
  bij op- en afritten, geen flikkerend asfalt op kruispunten, en kademuren
  steken niet meer door de straat.
- Gebouwen aan het water staan op een fundering in plaats van te zweven,
  woonboten liggen in het water in plaats van op de kant, en wegen lopen
  niet meer dwars door gebouwen.
- **Laptops met twee videokaarten** gebruiken nu de snelle.
- **Nieuwe stukken stad en Ommeland laden in kleine stapjes**, zodat het
  beeld niet meer hapert als je rijdt of vliegt. Verre boerderijen en
  dorpen zijn eenvoudiger tot je dichterbij komt.

### Opgelost
- Telefoontjes, voicemails en Bel Rikus vallen niet meer over het blok
  rechtsboven (tijd, sterren, geld, wapen): de telefoon schuift eronder,
  en ook onder het racepaneel. Is er te weinig ruimte, dan wordt hij
  compacter of gaat hij ernaast staan, vrij van de minimap.

## [0.21.0] - 2026-10-01

### Nieuw
- **Het escape-menu is helemaal nieuw**: één menu als overlay over het
  gepauzeerde spel. Kaart, Missies, Garage, Prestaties, Instellingen en
  Besturing schuiven er als paneel naast. Esc of Backspace gaat een stap
  terug, Q/E wisselt van onderdeel, en het menu onthoudt waar je was.
  Missies is opgedeeld in Verhaal, Missies en Bijbaantjes, zonder
  overlappende kolommen. Het startscherm gebruikt hetzelfde menu.
- **Drie nieuwe verhaalstappen**:
  - Tammo rijdt Durk en Douwe klem in de botsauto's op de kermis.
  - Anita maakt een gratis proefvlucht met Rotor Roelf.
  - Tammo schiet carbid bij boer Roelf aan de Beijumerweg.

  Ze kosten niks en zijn over te slaan.
- De **Bloemetjesmarkt** is nu echt te zien: kramen over de hele Grote
  Markt, een spandoek en een kaartje "Vandaag in Grunn".

### Verbeterd
- De intro van de eerste missie is half zo lang en de camera beweegt mee.
- Een missie overslaan kan pas als je hem een keer hebt geprobeerd.
- Toetshints komen één voor één, maximaal drie tegelijk, en vooral als
  icoontje.
- "Missie mislukt" verdwijnt na een paar seconden of zodra je iets doet.
- De wissel tussen Tammo en Anita wacht tot je het resultaat hebt gezien.
- Na een aankoop voor het verhaal zie je meteen "Gelukt! Terug naar het
  verhaal".
- Tips raken niet meer kwijt voordat je ze hebt gezien.

### Opgelost
- Een opgeslagen spel laden stopte een heli-rit, padel, dorpstennis, carbid
  of de botsauto's niet: je werd teruggetrokken.
- "Naar huis" deed niets tijdens padel, dorpsspelletjes, carbid of de
  botsauto's.
- De dorpsquiz ging door met een nieuwe vraag terwijl je al weg was.
- Bij de ballonjacht verschenen Tammo en Anita ineens onder de heli.

## [0.20.0] - 2026-10-01

### Nieuw
- **Je eigen helikopter**: koop de Wieken Wubbo (€5500) bij Rotor Roelf op
  vliegveld Eelde. Stijgen en dalen met W/S, vooruit met de pijltjes, Shift
  voor extra vaart, Spatie om stil te hangen. Landen kan op vlakke grond,
  platte daken en helipads. Op het dak van je flat ligt nu een eigen
  helidek met een trap vanuit de hal, en je boten liggen voortaan aan
  **Jouw steiger**. Allebei staan ze op de kaart. In de garage zit een
  nieuwe tab Luchtvaart, met drie nieuwe prestaties.
- **Carbid schieten** bij boer Roelf aan de Beijumerweg: richt de melkbus,
  giet water bij, steek hem op tijd aan en schiet het deksel zo ver
  mogelijk. Vijf schoten, medailles en een record.
- **Kermis op de Grote Markt**: de botsauto's zijn altijd open. 's Avonds
  en in de Meikermis-weken staat de hele kermis er, met reuzenrad,
  kraampjes en een draaiorgel.
- **Autoradio**: wissel met N/B tussen G-Music, Radio Nachtstreek, Radio
  Grunn (praatradio met Geesje) en uit. Elk voertuig onthoudt zijn zender.
- **Acht geheimen** verstopt in de stad, met een geheime prestatie. Ga maar
  zoeken.
- **Einde van de wereld**: op twaalf plekken waar de weg in het Ommeland
  ophoudt, wacht iets op je. Vind ze allemaal voor een prestatie.
- **Dorpsuitjes**: bij elk treinstation in het Ommeland is nu wat te doen,
  zoals tennis, een rondvaart, de Groningse quiz, de molen, de scheve toren
  of het strand. Er is ook een plek om te eten of een fiets te huren, met
  een verstopte eierbal en een wegwijzer op het perron.
- **Nieuwe missie na het verhaal: De Koe van Ome Jan.** Durk en Douwe
  hebben koe Geertje gestolen. Haal haar terug over de velden, met de
  tweeling achter je aan in Jelles trekker-limo.

### Opgelost
- Een tankstation in het Ommeland stond deels in een gebouw.

## [0.19.1] - 2026-10-01

### Opgelost
- **Vijftien winkels in de buitenwijken waren niet binnen te komen**, waaronder
  de snackbar voor de eierbal, de fietsenwinkel en de supermarkt voor de
  finale. Ook een paar cafés en een padelbaan.
- **Padel** is eerlijker en leuker: tegenstanders maken fouten, het
  slagmoment is ruimer, en klikken schiet niet meer met je wapen.
- De ontspannen rondvaart: de boot voer weg voordat je kon instappen.
- Het bed in de flat liet "Kledingkast" zien, en de boekenkast liet zich
  niet in elkaar zetten.
- Bij het skûtsje draaide de camera om als je je zeil aantrok.
- Toetsen staan overal als duidelijke icoontjes in beeld.

## [0.19.0] - 2026-09-30

### Nieuw
- **De Museumkraak is helemaal nieuw**: maak een plan aan de hand van een
  plattegrond en kies je aanpak (via de achterdeur of vermomd als
  schoonmakers). Zet de camera's op herhaling, kraak een slot, pik een pasje,
  sluip langs bewakers met zaklampen, kom door een lasergrid, draai de code
  van de vitrine (1953) en ontsnap met Tammo in een speedboot. Vergevingsgezind:
  mis je iets, dan begin je alleen dat stukje opnieuw.

### Verbeterd
- **Je weet altijd wat je moet doen**: missies zeggen precies wat de opdracht
  is, en tussen missies door staat de volgende verhaalstap bovenin beeld.
- **Rustiger begin**: de openingsscène loopt vloeiend over in het spel, geen
  wijk-filmpje direct na een missie en berichten komen niet allemaal tegelijk.
- **Thuis**: de ingang zit nu aan de kant van de garage, de woonkamer kijkt
  uit op het winkelcentrum, en de camera blijft binnen.
- Het pauzemenu en de kaartlegenda schalen mee met "Grootte interface".

### Opgelost
- Je kon uit de flat naar beneden vallen en langzaam wegglijden.
- Ondergrondse garages en fietskelders stonden als dichte blokken op straat,
  en paden liepen door dichte gebouwen. Waar een pad bij een gebouw eindigt,
  is nu een deur.
- Gaten langs de verdiepte ringweg en ontbrekende tunnelmonden.
- Zwart gras, zwarte struiken en heggen.
- Na opgepakt worden keek de camera tegen een muur.

## [0.18.0] - 2026-09-29

### Nieuw
- **Nieuwe landmarks**: het Stadhuis aan de Grote Markt met zijn zuilengalerij,
  het Prinsenhof met klokkentorentje, het Gasuniegebouw ("de Apenrots") en het
  DUO-kantoor aan de Kempkensberg ("het Cruiseschip"), waar je onderdoor kunt
  rijden.

## [0.17.0] - 2026-09-29

### Nieuw
- **EIKEA-meubels in je flat**, elk met een eigen voordeel: bank "Zitmoi"
  (zitten geneest), bed "Sloapstee" (kies je wektijd, pantser terug), tv
  "Kiekkast" (Sikkom TV en cutscenes terugkijken), boekenkast "Buukenkaas"
  (verstopte eierballen op de kaart), wandkaart, frituurpan, plant, bureau
  met pc (+10% bij bijbaantjes) en een lamp die 's avonds echt licht geeft.
  Bezorgd "tussen 8 en 18 uur", en de boekenkast zet je zelf in elkaar
  (met één schroefje te weinig).
- **Padel** op acht echte padelbanen rond Grunn: een dubbelpotje tegen een
  Gronings kletsend duo, met volle gezondheid en een tijdje "Padelfit" als
  beloning, medailles en prestaties.
- **Ontspannen rondvaart**: een los rondje Diepenring met toeristen en de
  rondleiding, zonder Schipper Wiebe en zonder tijdsdruk.
- Nieuwe verhaalstappen: onderduiken met een bank van de EIKEA, en stoom
  afblazen met een potje padel tegen Durk en Douwe.
- **Sms'jes en hints worden voorgelezen** in de stem van wie ze stuurt,
  en Sikkom krijgt een eigen nieuwslezer.

### Verbeterd
- **De rondvaartmissie** gaat nu met een echte rondvaartboot vol toeristen,
  met twee keer zoveel rondleiding. Tammo vertelt, Anita verbetert hem.
- **Winkels in het verhaal** zijn veel duidelijker: een balk "Voor het
  verhaal: …", het juiste artikel bovenaan met "Nodig voor je missie", een
  gouden ring om de winkel op de kaart, en daarna "Gelukt!".
- Eten kun je ook met volle gezondheid kopen (om mee te nemen).
- Sikkom-berichten komen veel minder vaak.
- Bij de stroomkast in de museumkraak spring je niet meer mee met de
  spatiebalk, en de toets staat duidelijk in beeld.

## [0.16.0] - 2026-09-28

### Nieuw
- **Nieuw pauzemenu**: Esc opent een compacte kaart met Doorgaan bovenaan, en
  de game blijft zichtbaar. De Besturing is ingedeeld in groepen met
  toetsiconen en een zoekvak.
- **Garage met tabbladen** per soort voertuig, filters (van jou, te koop, op
  slot) en sorteren op naam, prijs of snelheid.
- **Alle winkels als de autoshop**: eerst bekijken in 3D, dan pas kopen.
  Wapens met schade en bereik, kleding en kapsels op Tammo of Anita zelf,
  snacks en producten in 3D, upgrades op je eigen auto met voor/na, en
  kraslotjes om te krassen. Bij het pandjeshuis staat kopen bovenaan.
- **Nieuwe HUD linksboven**: portret van wie je speelt, hart en schild met
  duidelijke balken. Ook de autonaam, de straat en wijk en de duif-modus
  hebben de nieuwe stijl.
- Eigen kaarticonen voor thuis en je garage, en een grotere legenda.
- Vangrails en hekken langs de ring breken als je er hard tegenaan rijdt.

### Verbeterd
- **Minder haperingen**, vooral op de laagste stand en tijdens het rijden
  langs het Ommeland, en de flitspaal is niet meer zwaar.
- Bij het aftellen van een race sta je echt stil tot GO.
- De Fjord Frituur staat stil tijdens een dienst en klanten wachten netjes
  op de stoep.
- Geen automatische paarse route meer naar je garage.

### Opgelost
- Je gleed opzij in de flat.
- Overlappende kolommen bij Missies in het menu.
- Geld dat door de NaN-bug kwijt was, wordt bij het laden hersteld.

## [0.15.0] - 2026-09-28

### Nieuw
- **Een thuis voor Tammo en Anita**: een appartement aan de Pleiadenlaan in
  Paddepoel, met een eigen garage waar al je voertuigen echt geparkeerd staan.
  Instappen en wegrijden, en terugzetten slaat hem weer op. Slapen, een
  eierbal uit de frituur en je kledingkast. Een nieuw spel begint thuis.
- **De Ommelanden op de echte kaart**: echte wegen, spoorlijnen, kanalen en
  dorpen tot zo'n 12 km rond de stad, met Groningse dorpsnamen op de borden.
  De trein stopt nu ook in Haren, Zuidhorn, Sauwerd, Winsum, Bedum, Stedum,
  Loppersum en Kropswolde.
- **Tien nieuwe wapens**: honkbalknuppel, hockeystick, bezem, fietspomp,
  klomp en polsstok, plus een jachtgeweer met vizier, de carbidbus,
  vuurwerkpijlen en een waterpistool (waarmee je ook brandjes blust).
- **Na het einde** krijg je de Fjord Frituur te zien en rijd je er meteen
  mee weg, en wijst de route je naar de volgende uitdaging.

### Opgelost
- Een crash ("Cannot read properties of undefined") door de traumaheli.
- Het geld kon "NaN" worden. Dat kan niet meer, en een kapotte save krijgt
  geld terug.
- Soms viel al het geluid weg en kwam niet meer terug.
- De legenda van de kaart is in logische groepen ingedeeld.

## [0.14.0] - 2026-09-28

Een grote bundel: mooiere opening, rustiger beeld, levendiger personages.

### Nieuw
- **Nieuwe openingsscène**: een filmpje van anderhalve minuut met een echt
  verhaal. Grunn bij zonsopgang, de Gouden Eierbal, Tammo en Anita met hun
  droom, een schim van Jelle, en zo door naar de eerste missie.
- **Rikus**, Tammo's jeugdvriend en nacht-dj van Radio Nachtstreek, vertelt
  het verhaal, belt af en toe en juicht mee in de finale.
- **Tammo is duivenfluisteraar**: hij stuurt de duiven. Anita heeft een
  geheim Fries contact, en Tammo is daar niet blij mee.
- **Gekleurde namen** in alle ondertitels, per personage een eigen kleur.
- **Automatisch richten** met de rechtermuisknop, met richtkruis en
  wisselen met Tab. Schoten raken nu ook echt.
- **Politie te paard** patrouilleert door de binnenstad en de parken.
- **Dronken** tijdens de kroegentocht, per kroeg erger (instelbaar).
- **Het Groninger Museum van binnen**, met de vitrine in zaal 3.
- **Nieuw Escape-menu** met iconen en een 3D-garage om je voertuigen te
  bekijken.
- **Routes in kleuren**: paars voor je eigen bestemming, geel voor missies en
  roze als je moet opknappen of je eigen auto moet laten repareren.
- **Fietsen**: met Shift even flink doortrappen, en de fatbike is sneller.
- De trailer speelt bij elke start (overslaan met de spatiebalk ingedrukt).

### Verbeterd
- **Veel rustiger beeld**: de witte teksten bovenin zijn weg. Meldingen komen
  als één duidelijke kaart tegelijk, met één doelregel, en telefoon en Sikkom
  schuiven netjes in beeld. Toetshints zijn iconen die vanzelf verdwijnen.
- **Stemmen lopen niet meer door elkaar**; jingles worden overgeslagen als
  iemand praat.
- Wijk-flyovers en andere onderbrekingen hooguit eens per paar minuten.
- Teksten passen beter bij wie ze zegt (Tammo eigenwijs, Anita weet beter).
- Winkels: eerst kiezen, dan pas kopen, met een voorbeeld van je nieuwe lak.
- De legenda van de kaart is ingedeeld in duidelijke onderdelen.
- Jelle springt met zijn polsstok nu echt over het water.
- Wielen draaien in cutscenes, en de minimap draait mee als duif.

### Opgelost
- Missies die niet te starten waren omdat de start in een gebouw lag, en
  winkels en horeca die in gebouwen zaten.
- Het UMCG en het Groninger Museum zagen er kapot uit.
- Wegen en fietspaden door gebouwen: nu een echte doorgang, of dicht.
- Een blokkade op de ringweg tijdens de ringrace, een dubbel zwart plafond in
  de verdiepte ligging, en rook boven straatniveau.
- Het spoor kon je niet altijd omhoog volgen.
- Bij de spuiterij kreeg je auto een andere kleur dan gekozen.
- Met de auto aankomen bij de fatbike-missie liet hem meteen mislukken.
- Bij het fietsdepot werden het steeds meer fietsen (nu hooguit vijf).

## [0.13.0] - 2026-09-27

Het verhaal komt tot leven.

### Nieuw
- **Jelle, Durk en Douwe in beeld**: de Friese schurk en zijn tweeling-
  handlangers zie je nu echt, met hun trekker-limo, een livestream, de
  tweeling op één fatbike en een dronken Durk die zich verspreekt.
- **Jelle neemt contact op** met telefoontjes, voicemails, een livestream op
  je telefoon, Sikkom-posts en handgeschreven kaartjes, allemaal ingesproken.
- **De verteller** vat bij het begin van elk deel samen wat er eerder
  gebeurde en komt terug bij de grote keerpunten.
- **Wat weten we?** in het menu bij Missies: alle aanwijzingen en keerpunten
  tot nu toe, zonder spoilers. Aanwijzingen vallen ook op in cutscenes.
- **Wissel tussen Tammo en Anita** met een eigen overgang en een reden waarom
  juist die het beste past bij de volgende stap.
- De vlag op d'Olle Grieze krijgt eerst een eigen shot, en valt als echt doek
  naar beneden.

### Verbeterd
- Cutscenes met bewegende camera's, personages die gebaren en naar elkaar kijken.
- Minder duivenmissies: de vliegles zit in de verkenning van het museum, en
  in "Waar is de Fjord?" vraag je een getuige en volg je een tracker.
- Rustige momenten tussen Tammo en Anita in de auto bij de belangrijkste
  gebeurtenissen.

### Opgelost
- Aan het einde van het verhaal kon je missies niet overslaan. Nu kan dat bij
  elke stap, ook tijdens de finale.
- Een duivenstap stuurde je eerst naar het verkeerde duivenbord.

## [0.12.0] - 2026-09-27

Minder Fries, meer Grunnegers.

### Nieuw
- **Dubbele ondertitels**: alle Friese tekst krijgt de Nederlandse vertaling
  eronder, en moeilijke Grunneger uitdrukkingen ook. Overal: in cutscenes,
  tekstwolkjes, de telefoon, Sikkom en meldingen.
- **Meer Grunnegers op straat**: voetgangers, politie, marktkooplui,
  buspassagiers, taxiklanten en klanten van de Fjord Frituur praten nu
  echt Gronings, en ingesproken.

### Verbeterd
- Jelle praat vooral Nederlands met een Fries sausje, Durk en Douwe gewoon
  Nederlands. Het blijft een Grunneger game.

## [0.11.1] - 2026-09-27

### Verbeterd
- **Meer geld, lagere kosten**: missies en bijbaantjes betalen flink beter,
  en repareren, spuiten, tunen, wapens, munitie, vesten, boetes en
  kentekens zijn goedkoper. Na zo'n half uur spelen kun je een auto of een
  wapen plus reparaties betalen, en de duurste voertuigen zijn haalbaar na
  de Romp.
- Verstopte eierballen leveren €50 op (en een bonus voor alle 30), en de
  Fjord Frituur betaalt na het verhaal een dagloon.
- Te weinig geld in een winkel? Je krijgt nu de tip om via Ubbo bij te
  verdienen.

## [0.11.0] - 2026-09-27

### Nieuw
- **De Museumkraak is een echte kraak**: sluip langs bewakers met
  zaklampen en draaiende camera's (bukken helpt), zet met een timing-spelletje
  de stoppenkast uit, en ontdek de lege vitrine met het kaartje van Jelle.
  Word je gezien, dan begin je dat stukje opnieuw; na drie keer leidt
  Tammo iedereen af.
- **Waar is de Fjord?** met een echte goederentrein: je gestolen Fjord rijdt
  een autowagon op. Ram hem op tijd tot stilstand, of ga bij de overweg aan
  de Peizerweg staan zodat de machinist moet stoppen.
- Jelle's ontsnappingen gebruiken nu de echte fierljep-sprong over het water.

### Opgelost
- Auto's maken geen sprongen meer over toppen en opritten van de ringweg, en
  springen niet meer naar een andere rijbaan waar wegen over elkaar lopen.

## [0.10.1] - 2026-09-27

### Opgelost
- **Geheugenlek**: de game hield onderweg steeds meer grafisch geheugen vast
  (vooral bij voetgangers en vonken), waardoor hij na een tijdje trager werd.
  Dat blijft nu stabiel, ook na lang spelen.
- De trailer en **Benchmark draaien** lopen zo'n 40 tot 60% soepeler, met
  mooiere shots van de traumaheli en de ringweg-race en een goed leesbaar logo.

## [0.10.0] - 2026-09-27

Na het einde is het nog lang niet klaar.

### Nieuw
- **Uitdagingen tegen Jelle Terpstra**, vrij te spelen na het einde van het
  verhaal, met medailles en records:
  - **Elf Bruggenrace**: een rondje Diepenring onder elf bruggen door, per
    speedboot tegen Jelle.
  - **Fierljep-duel** bij het Hoornsediep: aanloop, stok pakken en klimmen,
    op tijd, anders lig je in het water.
  - **Skûtsje-sprint** van de Oosterhaven naar de Hoge der A, met je zeil
    op de wind.
- **De Fjord Frituur** is van jou: Anita's foodtruck. Parkeer op drukke
  plekken (Grote Markt, Vismarkt, Noorderplantsoen, Euroborg op wedstrijddagen,
  de Poelestraat 's nachts), serveer eierballen en frikandellen en verdien
  bij met fooien en upgrades.
- **Een echt skûtsje** met zwaarden, gaffel en bruinrood zeil, ook in de
  skûtsje-missie van het verhaal.

## [0.9.0] - 2026-09-27

Grunn voelt nog meer als Grunn.

### Nieuw
- **Reclameborden** langs de grote wegen met *"Er … niets boven Groningen"*-
  varianten, die meeveranderen met je voortgang in het verhaal.
- **De Gerrit Krolbrug** meldt elke keer een andere storing, en de
  omleiding wordt steeds indrukwekkender dan de brug zelf.
- **Bijnamen**: d'Olle Grieze, de Kiekdeuse, de Apenrots en het Cruiseschip
  hoor je op straat en zie je op de kaart.
- **"Kon minder."**: het hoogste compliment na een perfecte missie.
- **Het Noorderplantsoen** loopt vol met kleedjes, speakers en barbecues
  zodra het warm en droog is.
- **Aaltje en Grietje**, twee droge koeien met commentaar op je chaos, op
  het laadscherm en in Sikkom.
- **Evenementen**: de Bloemetjesmarkt (vol touringcars en kamerplanten),
  Bommen Berend met vlaggen op de Grote Markt en KEI-week, soms ook als
  verrassingsdag.
- Het **Peerd van Ome Loeks** staat elke nacht op een andere rotonde.
- 's Nachts buiten de stad: **Radio Nachtstreek**.
- Een plaquette waar het Oosterpark-stadion stond, en supporters die blijven
  zingen.
- Fietsers nemen voorrang, en gestolen fietsen duiken later ergens anders op.
- De navigatie heeft bij Ring Zuid zo zijn eigen mening.

## [0.8.0] - 2026-09-27

**Het verhaal is compleet**: deel 3, de Staart. Speel *Alles voor één
eierbal* van begin tot eind.

### Nieuw
- **De Staart**:
  - Kaap Jelle's skûtsje op de Diepenring (met een huurboot).
  - Vlieg met de traumaheli achter zijn luchtballon aan.
  - Zoek als duif je gestolen Fjord en ram hem tot stilstand voordat de
    trein vertrekt.
  - Haal mosterd, eieren en stoetbrood voor het beslissende bod, en
    verdedig je kraam op **Gronings Ontzet** in de grote finale, met
    Bommen Berend in de jury.
- **Een echt einde**, met epiloog en aftiteling. Daarna speel je gewoon
  verder in Grunn.
- Nieuwe gesprekjes van Tammo en Anita in de auto over de finale.
- Alle nieuwe teksten zijn ingesproken, met twee nieuwe stemmen.

## [0.7.0] - 2026-09-27

Maus' tweede speelsessie verwerkt, en een grote schoonmaak van bekende bugs.

### Nieuw
- **Elk voertuig is te koop of vrij te spelen**: 46 voertuigen, van
  studentenbarrel tot midibus, taxi en speedboot. Speciale voertuigen (de
  Poen Express, ambulance, tankwagen, Jelles trekker-limo, stadsbus,
  politieauto en politieboot) speel je vrij via het verhaal, bijbaantjes en
  prestaties. Alles staat in de Garage in het Escape-menu, met prijs of hoe
  je hem vrijspeelt.
- **Steel de trein**: stap in de cabine van een stilstaande trein en rijd
  over het spoor. De politie vindt dat minder leuk.
- **Ubbo**: bijbaantjes op afroep in je telefoon, met verdienste en afstand.
- **Grootte interface** in Instellingen → Weergave. De hele HUD schaalt nu
  mee met je scherm (1080p, 1440p en 4K), en berichten blijven lang genoeg
  staan om ze te lezen.

### Verbeterd
- De politie komt minder snel achter je aan: een klein ongelukje zonder
  getuigen levert niet meteen een ster op.
- Reclamezuilen vliegen om als je er hard tegenaan rijdt, en je kunt ze
  kapotschieten.
- Bij de bushalte gaan de deuren snel weer dicht, en de dienstregeling is
  ruimer.
- Paraplu's worden gewoon boven het hoofd gehouden, en Anita's benen gaan
  niet meer door haar jas.
- De Poen Express is herkenbaar als gepantserde geldwagen, en geparkeerde
  scooters zijn echte scooters om mee weg te rijden.
- Doorzichtige ramen in alle auto's, busjes, bussen en vrachtwagens.
- Geparkeerde auto's, straatmeubilair en bomen verschijnen verder weg.
- De camera gaat niet meer door bomen en bushokjes.
- Kano's en waterfietsen klinken als peddelen in plaats van als een motor.
- Kortere wachttijden bij stoplichten.
- Personages zonder naden bij schouders en heupen, en zonnebrillen waar je
  doorheen kunt kijken.

### Opgelost
- Er zaten mensen in geparkeerde auto's.
- Opstoppingen in het Gasthuisstraatje en rijders die vastliepen bij de Waag
  tijdens de KEI-race.
- Voetgangers liepen door elkaar heen en over het spoor zonder overgang.
- Tammo of Anita bleef hangen bij doorgangen door gebouwen.
- Te lage doorrijhoogtes rond het Julianaplein, en opritten van de ringweg
  die niet aansloten op de rijbaan.
- Brokstukken van een ontploffing op een viaduct vielen naar de straat.
- De crash-replay speelde af bij elke ontploffing in de buurt.
- De driehoekige inham bij de kade met een verkeerde rand, en steigers bij
  woonboten waar je doorheen zakte.
- De wijk-flyover direct na een treinreis.

## [0.6.0] - 2026-09-27

Het verhaal gaat verder: deel 2, **de Romp**. En Grunn praat nu echt.

### Nieuw
- **De Romp**: Jelle Terpstra's plan ontvouwt zich. Kaap een tankwagen vol
  frituurvet, race tegen Jelle in zijn zwarte trekker-limousine op de
  ringweg, pik als duif de Friese vlag van d'Olle Grieze los, en ontdek waar
  de Gouden Eierbal is. Tot en met de kus op de rondvaartboot. Wordt vervolgd…
- **Tammo en Anita om de beurt**: het verhaal bepaalt wie je speelt, passend
  bij het moment. Zelf wisselen met C kan niet meer.
- **Een verteller** opent het verhaal, en tussendoor-activiteiten hebben nu
  een reden in het verhaal (onderduiken met de trein, verkennen als duif…).
- **Gesprekjes in de auto**: Tammo en Anita praten onderweg over de missies,
  het verhaal, plekken in de stad en het weer. Meer dan 140 ingesproken
  gesprekjes.
- **Alles ingesproken**: elk tekstwolkje en elke ondertitel heeft nu een stem,
  van voetgangers en klanten tot de duiven-modus.
- **Ballonjacht**: vlieg met de gele traumaheli van het UMCG achter een
  luchtballon aan, door ringen over de stad. Starten bij het UMCG.
- **Trailer**: bij de eerste start (ook één keer voor wie de game al had)
  speelt een korte trailer van Grunn. Later terug te zien als
  **Benchmark draaien** onder Instellingen → Beeld, met je fps als uitslag.
- **Vastgelopen? Zet me vrij** en **Missie afbreken** in het menu, zodat je
  nooit meer vast komt te zitten.

### Verbeterd
- Cutscenes, doodgaan en opgepakt worden kunnen niet meer blijven hangen;
  vastzittende toetsen worden losgelaten.
- Laden zet je nooit meer in het water of midden in een oude cutscene.

## [0.5.0] - 2026-09-27

Het verhaal begint: deel 1, **de Kop**.

### Nieuw
- **Alles voor één eierbal**: Tammo en Anita willen de Gouden Eierbal uit
  het Groninger Museum, en Anita droomt van haar eigen frietwagen, de
  *Fjord Frituur*. Drie nieuwe missies: pinnen met de hele automaat, als
  duif het museum verkennen, en de museumkraak. Maar de vitrine is leeg,
  op een kaartje na: *"Tige tank! – W."* Maak kennis met de Friese
  snackbaron **Jelle Terpstra**. Wordt vervolgd…
- **Je hoeft nooit te zoeken wat je kunt doen**: de route wijst steeds de
  volgende stap aan, afwisselend missies en andere dingen (een eierbal
  halen, een wapen of fiets kopen, duif worden, wachten tot het donker is),
  met een berichtje van Tammo of Anita. Je eigen waypoint gaat altijd voor.
- **Geld is geen probleem**: het verhaal levert ruim genoeg op voor alles
  wat een volgende stap vraagt, en komt je toch iets tekort, dan schiet
  iemand het voor.
- **Missie overslaan**: lukt een missie niet, dan kun je hem overslaan en
  verder met het verhaal (knop na het mislukken, of in het menu bij Missies).

### Opgelost
- **Ringweg**: geen zwart blok, zwevend hek of gaten naast de taluds meer,
  geen hokken en losse daken op de weg, pijlers naast de wegen eronder,
  en een vangrail waar een oprit langs de verdiepte ring omhoog komt. Auto's
  blijven op hun eigen rijbaan waar wegen over elkaar lopen, en de
  lijnmarkeringen lopen niet meer dwars over andere rijbanen.
- Voetgangers lopen niet meer over de ringweg.
- Het verhoogde spoor is berijdbaar in plaats van dat je door de kaart zakt.

## [0.4.0] - 2026-09-26

Een grote ronde op basis van de speelsessie van Maus.

### Nieuw
- **Wat is er nieuw** in het hoofdmenu: de volledige changelog van alle
  versies, gewoon over de stad heen.
- **Nieuwe muziek**: zeven nieuwe nummers op G-Music, elk met een verzonnen
  artiest, en na elk nummer een jingle. Eigen muziek tijdens races en
  politieachtervolgingen; G-Music pauzeert en gaat daarna verder waar hij was.
- **Garages**: 56 werkplaatsen en tankstations met een rolluik dat opengaat.
  Repareren (ook de deuken), spuiten, nieuwe kentekens en upgrades. Monteur
  Henk belt als je auto beschadigd is. Schade aan je eigen auto's wordt onthouden.
- **Verkeer**: stoplichten met een eigen fase voor fietsers, voorsorteren,
  haaientanden en voorrangsborden, echte busbanen, en ambulances, taxi's en
  een geldtransport die gewoon rondrijden. Met **L** zet je zwaailichten en
  sirene aan in een gestolen politieauto of ambulance, en het verkeer gaat
  voor je aan de kant.
- **Meer voertuigen en boten**: midibus, SUV, roestbak, bakfiets,
  bestelbus, vrachtwagen, e-step, en zeven soorten boten van kano tot
  rondvaartboot. Boten hebben schippers, passagiers en 's nachts lichten.
- **De EIKEA** aan de Sontweg, het complete UMCG en zwerfvuil op straat.
- **Politie op de fiets en te paard**, die afstapt om je op te pakken.
- **Race-info in beeld**: positie, tijd, resterende tijd en checkpoints.
- Achterom kijken in een voertuig met **Q** of de middelste muisknop.
- Schuiven voor helderheid en voor stemmen (los van muziek en effecten).
- Wisselen tussen volledig scherm en venster met **Alt+Enter** of **F11**
  (op de Mac ook Ctrl+Cmd+F).
- Ingesproken bazen bij de bijbaantjes, en Tammo of Anita vertelt echte
  feitjes tijdens de rondvaart.

### Verbeterd
- **Rijden**: auto's veren en hellen over, halen hogere topsnelheden (een
  sportwagen 230 km/u), wielen draaien en sturen mee, en in plassen verlies
  je grip. Een kapotte auto vliegt eerst in brand en ontploft dan, met een
  flinke explosie. Uit een rijdende auto duik je eruit.
- **Schieten** voelt als schieten: vuurflits, terugslag, inslagen per
  oppervlak en kogelgaten die blijven zitten.
- **Minder haperingen**, vooral bij de overgang naar de avond en het eerste schot.
- **Missies**: KEI-week is een fietsrace tegen studenten, de ringrace heeft
  eerlijkere tegenstanders, Noorderzon is lastiger, schade telt goed mee,
  en een aangereden voetganger laat een missie of bijbaantje niet meer mislukken.
- **Politie** ramt je, stapt uit om je op te pakken en zet grotere wegblokkades neer.
- **Cutscenes**: wijk-flyovers vliegen laag door een echte straat en komen
  niet meer tijdens missies; overslaan doe je door de spatiebalk even
  ingedrukt te houden. Mooiere scènes bij doodgaan en opgepakt worden, en een
  duidelijkere openingsscène.
- **Beeld**: grotere minimap, een nieuwe klok, een grotere "Nu op G-Music"
  en één kleur voor stad en Ommeland op de kaart. Eén vinkje per categorie
  in de legenda, voor kaart en minimap samen.
- Tammo en Anita rijden altijd samen, ook achterop de fiets of step, en er
  zijn animaties voor in- en uitstappen en iemand uit een auto trekken.
- Mensen zitten echt op de boot, zwemmen bij mooi weer bij bruggen en
  zwaaien als je langsvaart. Anita's haar is netter.
- Over lage hekjes springen, brugleuningen breken makkelijker en de toeter
  is veel harder.

### Opgelost
- Je werd een NPC als je op een fiets stapte, en er verscheen een
  voetganger als je afstapte.
- Door woonboten lopen, en voertuigen die vlak voor je neus verschenen.
- Geparkeerde auto's hadden hun lampen aan.
- De rondvaartboot ligt nu aan de kade.

## [0.3.0] - 2026-09-26

### Nieuw
- **Nieuwe bootmissie**: een heel rondje Diepenring onder twaalf bruggen door.
  Rustig beginnen, en dan komt Schipper Wiebe met zijn megafoon achter je aan
  in zijn sloep. Hou de toeristen tevreden (botsingen maken ze bang, verhalen
  bij de bezienswaardigheden maken ze blij) en schud Wiebe af — bij het
  museum weet hij de brug niet zo goed.
- **Doodgaan en opgepakt worden als in GTA**: de traumaheli brengt je naar
  het UMCG (of de ambulance naar een dichtere huisartsenpraktijk), of de
  politie brengt je naar het dichtstbijzijnde bureau. Daar staat je partner
  met je rode auto al klaar.
- **Je eigen voertuigen**: gekochte voertuigen blijven van jou, met hun lak
  en upgrades. Laat ze via de telefoon-app *Voertuigen* of het nieuwe
  tabblad **Garage** in het Escape-menu afleveren: ze staan dan om de hoek
  op een veilige plek, buiten beeld. In je eigen voertuig stappen is nooit
  meer diefstal.

### Verbeterd
- **Flink hogere framerate** (zo'n 1,6 tot 1,8 keer sneller), zonder dat het
  beeld er minder mooi van wordt.
- **Kaart**: waypoints zetten werkt weer (rechtermuisklik of Del om te
  wissen), en de route is nu ook op de grote kaart goed te zien, in paars,
  geel (missie) of oranje (bijbaantje).
- **Minimap**: veel rustiger, verder ingezoomd en met pictogrammen in plaats
  van stippen. Per categorie kies je in de legenda of die ook op de minimap
  staat.
- **Geen gratis spullen meer op straat**: geld, wapens, gezondheid en vesten
  koop je nu in de winkels. Een nieuwe game begint met €250.
- Kusjes geven doe je nu met **K**, zodat je niet meer per ongeluk Anita of
  Tammo kust als je in je auto wilt stappen.
- De naam van je voertuig verschijnt groter en langer rechtsonder in beeld
  als je instapt.
- Brugleuningen zijn stevig, maar breken af (en plonzen het water in) als je
  er hard tegenaan rijdt.

### Opgelost
- Boten voeren door de kademuren, en zwemmend kon je onder de kaderand door.
- In je eigen auto stappen telde soms als autodiefstal.

## [0.2.0] - 2026-09-26

### Nieuw
- **De hele ringweg**, rondom de stad en op de echte hoogte: de Zuidelijke
  Ringweg ligt verdiept (tot 8 meter onder het Winschoterdiep door, via het
  aquaduct), elders rijd je over taluds en viaducten met soepele opritten.
  De kaart is daarvoor flink groter geworden.
- **Ringrace** over de volledige ring van 17,5 km, met getunede raceauto's.
- **Zes bijbaantjes**: Hap & Rap bezorger, Grunn Taxi, stadsbus lijn 3,
  rondvaartgids, fietsdepot-handhaver en KEI-week verhuizer. Met levels,
  streaks, records en een eigen prestatie-categorie.
- **Duif-modus in de stad**: bij zes duivenborden (o.a. Vismarkt met Opa
  Geert en de duiventil bij de volkstuinen) word je met E een duif; met X
  land je weer als Tammo of Anita, precies waar je stopt.
- **Fast travel met de trein** tussen Hoofdstation, Noord en Europapark,
  inclusief vertrekbord met Groningse vertragingen.
- **57 winkels** door de hele stad, plus nieuwe soorten: avondwinkel,
  snackbar, fietsenmaker, tuning-garage, pandjeshuis en bootverhuur.
- **Naadloze overgang naar de Ommelanden**, ook op de kaart en minimap:
  doorlopende wegen, volkstuinen, sportparken, lintbebouwing, kanalen en
  dorpen met naambordjes.

### Verbeterd
- Elke nieuwe game begint met de openingsscène (de knop is uit het menu).
- Rustigere wijk-flyovers die de hele wijk in beeld brengen.
- Muziek dipt niet meer mee met auto- en sirenegeluid; rijker motorgeluid.

### Opgelost
- De rondvaartboot zat vast tussen een woonboot en de kade.
- Bomen op de weg en auto's die bij het aquaduct in het water zakten tijdens
  de ringrace.

## [0.1.1] - 2026-09-26

### Opgelost
- Ringrace: geen bomen meer midden op de weg, en bij het Europaplein rijd je
  over het water in plaats van erin (geldt voor 18 van zulke plekken).

## [0.1.0] - 2026-09-25

### Nieuw
- **Voertuigen**: snellere (fat)bikes, scooters en boten, veel beter
  remmen, auto's stelen met één druk op E, geparkeerde auto's en fietsen
  die je kunt meenemen, en voertuigen die voor je remmen.
- **Politie** met echte zwaailichten en een zoeklicht in de heli; ze
  spawnen buiten beeld en arresteren je niet meer door je aan te rijden.
- **Ringrace met tegenstanders**, winkels (wapens, kleding, kapper,
  fietsen, auto's, loterij), 80 prestaties met medailles en 30 verstopte
  verzamelobjecten.
- **Carmageddon-stijl** spetters (uit te zetten bij Weergave).
- **Nieuwe landmarks**: Martinikerk, Der Aa-kerk, Forum, Groninger Museum,
  Hoofdstation, Academiegebouw, Goudkantoor en Euroborg.
- **Ommelanden** vol boerderijen, wierdedorpen, windmolens en kanalen.

### Verbeterd
- Botsingen tussen alle soorten objecten, loopbare doorgangen door gebouwen
  en stevige brugleuningen.
- Tammo en Anita lopen naast elkaar in plaats van achter elkaar.
- Rustigere camera's in cutscenes, te voet en in de auto.

### Opgelost
- Muur op een brug waar je doorheen kon, zwevende woonboten, en je hoofd
  dat door bruggen ging in een boot.
- Spawnen in een afgesloten binnenplaats bij het Academiegebouw.

## [0.0.0] - 2026-09-25

De eerste versie: alles wat er tot de eerste desktop-release gebouwd is.

### Wereld
- **Groningen op echte schaal**, gebouwd uit OpenStreetMap-data: zo'n 35.000
  echte gebouwen, wegen met stoepen en fietspaden, bruggen, de Diepenring en
  kanalen, parken, bomen en een terrein met echte gaten voor het water.
- **Landmarks** met een echt 3D-model van de Martinitoren en eigen modellen
  voor andere herkenningspunten; ramen met nep-interieurs die 's avonds
  oplichten, en straatnaambordjes op de gevels en op de weg.
- **Dag- en nachtritme** met straatverlichting, natte straten na een bui,
  gevarieerd weer (vooral motregen en buien, zelden een echte storm), echte
  3D-regen en post-processing met bloom.
- **Spoorwegen** met treinen tussen Hoofdstation, Noord en Europapark,
  spoorwegovergangen met slagbomen, en viaducten waar het spoor over wegen gaat.
- **Verkeerslichten** op alle echte kruispunten uit OSM, waar het verkeer
  netjes voor stopt en in de rij aansluit.
- **Straatmeubilair**: massa's fietsen, kliko's, ondergrondse containers,
  paaltjes, bloembakken, reclamezuilen, bushokjes en bordjes, en platte daken
  met luiken, zonnepanelen en installaties.
- **De Ommelanden** voorbij de stadsrand: eindeloos weiland met sloten,
  boerderijen en koeien, schapen en paarden, plus een eenmalige cutscene.

### Leven in de stad
- Verkeer met auto's, bussen, fietsers, scooters en boten; voetgangers die
  lange routes lopen, oversteken bij zebrapaden en op bankjes gaan zitten.
- Meeuwen, eenden en duiven, luchtballonnen, en de UMCG-traumaheli die af en
  toe op het dak van het ziekenhuis landt.
- Ragdolls voor iedereen, en losse objecten die wegvliegen als je ze raakt.

### Rijden en lopen
- GTA V-achtige besturing: de muis draait de camera om je personage heen,
  WASD beweegt ten opzichte van de camera.
- Auto's, bussen, fietsen, scooters en boten met botsingen, schade, wrakken
  die blijven liggen en roken, en je eigen rode auto.
- Springen, bukken (met een echte sluip-animatie), zwemmen en uit het water
  klimmen, slaan en schieten met animaties, en wapens wisselen met het
  scrollwiel.
- Tammo en Anita samen: wissel met C, en ze lopen met je mee.

### Politie en misdaad
- Wanted-level met politieauto's, agenten te voet, een politieboot en een
  helikopter.
- Sikkom-nieuwsberichten en telefoonmeldingen over wat je in de stad uitspookt.

### Missies en verhaal
- Acht missies met een eigen verhaal rond Tammo en Anita, grappige lokale
  teksten en ingesproken tussenfilmpjes.
- Een openingsmontage in de stijl van de GTA 6-trailers, ook ingesproken.
- Wijk-flyovers als je voor het eerst in een nieuwe wijk komt.
- Horeca waar je met E iets bestelt om op te knappen.

### Duif-modus
- Vlieg als duif over Grunn, poep op alles en verzamel punten en prestaties.

### Kaart en interface
- Grote kaart met routeplanner, waypoints, zoeken, fog of war en een legenda
  met filters; draaiende minimap in GTA V-stijl.
- Contextuele toetshints (Watch Dogs 2-stijl), wapenicoon, de naam van je
  voertuig bij het instappen, en een Escape-menu met instellingen in tabbladen.
- Opslaan en laden.

### Geluid
- G-Music met echte nummers en jingles, het GTE VI-themanummer in het
  hoofdmenu, ruimtelijk 3D-geluid, gesynthetiseerde motoren en effecten, en
  ingesproken stemmen voor Tammo, Anita, NPC's, politie en Sikkom.

### Speelbaar op elke computer
- Standalone desktop-app voor macOS (Apple Silicon en Intel) en Windows,
  volledig offline, standaard op volledig scherm.
- Voor wie het liever zonder app doet: een ZIP met `START DE GAME.bat` die op
  Windows zelf Python regelt en de game in de browser opent.
