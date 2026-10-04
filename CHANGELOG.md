# Changelog

Alle noemenswaardige wijzigingen in GDE Groningen (tot 0.24: GTE VI), per versie. Nieuwste bovenaan.
Versies volgen SemVer: `0.x.y` tot de echte release (1.0.0); `x` voor
nieuwe functies, `y` voor alleen bugfixes.

## [Unreleased]

### Veranderd
- **Eén radio.** Muziek en praatradio zitten nu in één lijst: G-Music,
  Radio Nachtstreek, Radio Proat en uit. N en B wisselen van zender, te voet
  en in elk voertuig. Op de controller doet LB dat in een voertuig, en
  Instellingen › Geluid heeft dezelfde lijst. Je zender gaat mee van auto
  naar auto en blijft in je save. Een oudere save begint op G-Music. Rikus'
  telefoontjes onderbreken de praatradio net als eerst. De melding bij een
  nieuw nummer noemt nu de zender die echt speelt.
- **Grotere knoppen onderin het pauzemenu.** Hoofdmenu, Afsluiten en
  Opnieuw beginnen zijn nu echte knoppen in plaats van kleine linkjes.
  Opnieuw beginnen staat apart onder een rode lijn en vraagt nog steeds
  eerst om bevestiging. Op een Steam Deck (1280×800) past het hele menu
  zonder scrollen.

### Verbeterd
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
  draaien de nachtnummers vaker. Nachtstreek heeft een eigen, rustigere
  lijst. Er zit niet meer tussen elk nummer een jingle, en nooit twee keer
  dezelfde achter elkaar.

## [0.26.1] - 2026-10-04

### Opgelost
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
