# Spel: ontwerp (fase 1, 24-11)

Status: ontwerp, nog niet gebouwd. Geen spelcode gewijzigd. Scope: het onderdeel **Spel** van het pauzemenu (Overzicht, Opslaan en stoppen, de ingang naar Samen spelen), de **rail** zelf, het **hoofdmenu en de start**, het **laadscherm**, het **doodscherm en het arrestatiescherm**, en de **Verhaal-aanwijzingen en de recapkaart** "Waar waren we?". Mockups: `docs/ontwerp/spel-ui-24-11/` (`bouw.mjs` maakt de schermen, `mock.src.css` de voorgestelde componenten, `schiet.mjs` neemt de beelden, `index.mjs` bouwt de vergelijkingspagina); de pagina zelf, de beelden van de huidige schermen en van het ontwerp staan lokaal in `.scr/spel-ontwerp/` (niet in git): open `.scr/spel-ontwerp/index.html`. Alle namen, spelstanden en bedragen in de mockups zijn verzonnen voorbeelden of komen uit het verhaal (Tammo, Tessa, "Een middag op het terras").

Raakt: `pausemenu.js` (`SECTIONS`, `RAIL_GROUPS`, `SUBTABS`, `spelHtml`, `renderOverviewPanel`, de rail), `todoui.js` (`renderOverview`, `heroHtml`, `tilesHtml`), `saveslotsui.js` en `saveslots.css`, `startscreen.js` (`runBootScreen`, `runMenuScreen`), `launchchoiceui.js`, `difficultycard.js`, `loadscene.js` en `loadscreen.js`, `bigmoment.js` (de stempelkaart van opgepakt en buiten westen) met `cinematics.js` en `respawn.js`, `recapcard.js` en `recapcardrun.js`, `storyremind.js`, `ovhint.js` en `vastlopen.js`. Ze deelt de kopband, de tabs, het segment, de status, de tussenkop, de link en de strook met het ontwerp van de club ([CLUB-UI-24-11.md](CLUB-UI-24-11.md)) en van Land en bedrijf ([BEZIT-UI-24-11.md](BEZIT-UI-24-11.md)); de Samen spelen-schermen zelf zijn van `ontwerp-multiplayer-24-11`.

## 1. Wat een speler hier wil

Zoals bij een moderne open-wereldgame (en bij Forza, Cyberpunk, Red Dead of GTA) zijn er twee momenten.

**In het spel, op pauze** (Esc): in vijf seconden vier dingen weten, in deze volgorde. (1) *Waar ben ik* in het verhaal. (2) *Wat moet ik nu doen*, met één knop die me erheen brengt. (3) *Hoe gaat het met me*: geld, gezondheid, gezocht. (4) *Is er iets nieuws of dringends* (een bericht, een evenement, een nieuwe auto). Daarna pas: voortgang, wat er in de buurt is, en dat ik veilig kan stoppen.

**Bij de start**: ik wil *doorgaan waar ik was*, met een bewijs dat het het goede spel is (een beeld, de plek, de speeltijd). Een nieuwe speler wil *beginnen*, zonder lege plekken die zeggen dat hij iets mist. En bij elke keuze die iets kan wegdoen (laden, overschrijven, nieuw spel, terugzetten) wil ik weten **wat ik verlies en wat blijft** voor ik bevestig. Saves mogen nooit stuk gaan.

## 2. Review van de huidige schermen

Alle schermen zijn in Electron gerenderd (1920x1080 en, voor Overzicht en Opslaan en stoppen, 1280x720 en 1280x800; wegwerpprofiel, een leeg spel en een spel met 14 afgeronde missies en drie opgeslagen spellen). De beelden staan op de vergelijkingspagina naast het ontwerp; het harnas staat in `huidig_scenes.js`, `huidig_start_scenes.js` en `huidig_beeld.mjs`. Let op: in de testspelstand staat de speeltijd op "Net begonnen" en loopt het verhaal niet mee met de 14 gezette missies; dat is een artefact van de scène, geen schermfout, en de review leunt er niet op.

**Wat er al goed is.** Eén materiaal en één lettertype overal; de rail met iconen, groepen en een zichtbaar actief onderdeel; de keuzekaart en de moeilijkheidskaart met toets in de knop; de stempelkaart voor opgepakt en buiten westen (de uitroep, het bedrag, geen geweld); het laadscherm met één balk en één statusregel; de kaarten in Opgeslagen spellen met een beeld van de plek, het niveau en een Doorgaan-held bij de start; een kort recap; en een bevestiging bij nieuw spel op een volle opslag, reservekopieën en een route voor een kapotte save.

**Overzicht** (`N-spel-overzicht`, `G-spel-overzicht`). Weet ik in vijf seconden waar ik ben, wat ik moet doen en hoe het met me gaat? Waar en wat: ja. Hoe het met me gaat en wat nieuw of dringend is: nee.
- De kop is "Spel" en de onderregel "VRIJDAG 14 AUGUSTUS 08:07 · NET OPGESLAGEN": de datum staat ook in de rail, dus twee keer, en "Spel" staat als titel, als rail-onderdeel en nog eens als eyebrow ("Het verhaal"). Er staat geen gezondheid en geen zoekniveau; het geld staat in een kleine tegel.
- De volgende stap is platte tekst (de titel in een eigen stijl, anders dan elke andere kop) met **vier even zware knoppen** (Zet als doel, Op de kaart, Alle opdrachten, Opslaan) en geen gele; de gele knop is Doorgaan in de rail, die niets met de stap te maken heeft.
- **De getallen herhalen elkaar of spreken elkaar tegen:** "Stap 11 van 12" (onder de titel), "Verhaal 44 van 71 · 62%" (voortgangsblok), "9/31 Missies klaar" (tegel), "Prestaties 4 van 238 · 2%" en een vierde tegel "38 Te vinden"; in een nieuw spel "Verhaal 1 van 71 · 1%", "Kaart verkend 1 van 644 · 1%", "Prestaties nog niets van 238". Drie tellingen van het verhaal (12 stappen, 71 stappen, 31 missies) op één scherm.
- De vier tegels zijn klein en grijs, het voortgangsblok heeft een eigen kader met vier regels, en daaronder staat een **dichte vouw** "VASTGELOPEN? Naar huis of jezelf vrijzetten": wat iemand die klem zit nodig heeft, is verstopt.
- **Een derde van het paneel is leeg** onder de vouw (op een nieuw spel de helft).

**Opslaan en stoppen** (`N-spel-opslaan`, `G-spel-opslaan`, `N-spel-herstart-vraag`).
- Een lijst rijen in dezelfde stijl: wat niets wegdoet (Opslaan) en wat iets wegdoet (Opnieuw beginnen) zijn even zwaar. Opnieuw beginnen staat onder de vouw (de lijst scrolt met een scrollbalk) en opent een inline kader met twee knoppen, waarvan de eerste ("Laatste spel laden") grijs is als er geen save is.
- **Twee gele Doorgaan-knoppen**: de rail en een rij "Verder spelen, terug naar het spel". Een statusblok bovenaan toont "Deze sessie 0 MIN", "Laatst opgeslagen VANDAAG 13:22" en "Opslagplek SPEL VAN 24 NOV": "Opslagplek" is jargon en "0 MIN" zegt niets over wat er nu niet is opgeslagen.
- Het rechterpaneel ("Je spel") is twee alinea's die naar Instellingen verwijzen: geen beeld, geen naam, geen status.
- **Niets zegt hoeveel je verliest.** "Alles sinds je laatste opslag gaat verloren" staat er, zonder hoeveel; "Spel herstarten" zegt dat het opslaat en opnieuw start, wat je op een hoofdmenu zou verwachten maar er niet is.

**Opgeslagen spellen** (`N-slots-leeg`, `G-slots`, `G-slots-menu`). Het verst van alle schermen, maar:
- Het is een **modaal blad over paneel en rail** ("PAUZE / Opgeslagen spellen"), een ander kader dan het pauzemenu, met twee kaarten per rij en de helft leeg.
- **Elke kaart heeft een gele Laden-knop**: drie gele knoppen op één scherm (de huidige kaart heeft er geen en toont "Bewaard vanzelf").
- **Hier opslaan** staat alleen achter het "…"-menu; dat menu legt zich over de hele kaart heen met een eigen scrollbalk: met een controller een omweg.
- Bij overschrijven is er **geen vergelijking** (wat staat er nu in die plek, wat komt eroverheen), laden met niet-bewaarde voortgang vraagt niets, en de naam van een plek ("Spel van 24 nov") zegt niets over wat erin zit.

**Hoofdmenu en start** (`S-boot`, `S-keuzekaart`, `S-moeilijkheid`; het titelscherm bestaat alleen voor QA).
- Er is geen hoofdmenu. Na het opstartscherm komt de keuzekaart "Hoe wil je spelen?" met twee grote kaarten (Alleen spelen, Samen spelen). Wie Alleen kiest en een save heeft, gaat zonder verdere vraag verder met "de laatst gespeelde": de speler ziet niet welke, niet waar hij was, niet hoe lang geleden. Nieuw spel, Laden en Instellingen staan niet in de start, alleen in het pauzemenu.
- De kaart "Hoe pittig moet het zijn?" is goed (drie niveaus met meters en woorden, aanbevolen gemarkeerd, toetsen 1 tot 3 en 4), maar **de kaart bedekt het logo** (het stempel staat half achter de kaart, `S-moeilijkheid`) en zegt niet op welke plek het spel komt.
- Een terugkerende speler ziet: opstartscherm, keuzekaart, laadscherm, spel. Een nieuwe speler: opstartscherm, keuzekaart, moeilijkheid, laadscherm.

**Laadscherm** (alleen het opstartscherm is in beeld gezien, als statische render van het echte DOM en de echte CSS; het laadscherm met bestemming en beeld stond niet in mijn Electron-run en de statische render ervan faalde, dus dat is beoordeeld op code, spec en de meting in docs/LAADSCHERM-LAYOUT-22-11.md). Rustig en klopt met zijn spec. Wat ontbreekt is een manier om een lange wacht (de eerste start, een verre reis) te vullen zonder het tekstdieet te breken.

**Opgepakt en buiten westen** (`M-opgepakt`, `M-buiten-westen`, `M-respawn-melding`). De kaart is sterk (stempel, uitroep, bedrag), met twee gebreken:
- Hij vertelt **alleen het bedrag**. Het zoekniveau dat verdwijnt, de missie die mislukt, de auto die klaarstaat en de volgende stap staan niet op de kaart; de speler leest ze in een melding ("Je respawnt bij …") op een ander moment.
- Bij neergaan staat "Rekening" met een bedrag als de aanroeper er een meegeeft; in de code is er bij neergaan geen boete (alleen opgepakt kost geld, en een total loss van de Escapade €50). In mijn scène stond €90 omdat ik dat zelf meegaf; zonder bedrag toont de kaart helemaal geen kostenregel (`formatBeloning` geeft bij 0 niets), dus hij zegt dan niets over wat het kost. Ook overlapt de stempel "BUITEN WESTEN" het bedrag (`M-buiten-westen`).

**Waar waren we? en Verhaal-aanwijzingen** (`M-recap`, `N-verhaal`).
- De recapkaart heeft een eigen stijl met eigen CSS in `recapcardrun.js`: groene titel, drie kleine regels, een gele knop zonder toets. Hij toont "Nu: Anita: Honderdvijftig euro verdienen ..." met het voorvoegsel van de spreker erin, terwijl elders Tessa heet (de save-lijst): het voorvoegsel hoort bij de dialoogmarkering en niet in een recap; te verifiëren voor het bouwen.
- De volgende stap staat op twee plekken met twee uiterlijken: de kaart "Waar je nu bent · Moi, Grunn" bovenaan Verhaal > Opdrachten (met "Zet als doel") en het Overzicht. De aanwijzingen zelf (herinnering na vijf, vijftien en dertig minuten, OV-hint, "Zit je vast?") komen uit drie modules met eigen toon en zijn niet in beeld gezien.

**De rail** (op alle beelden). Hij past op het venster van 1904x993 (Afsluiten en "GDE Groningen v0.65.0" staan onderaan), maar **op 1280x720 scrolt hij**: logo, datum en tijd zijn dan uit beeld en de versie ontbreekt (`1280x720-G-spel-overzicht`). Verder:
- "SPEL" staat als kop boven één onderdeel "Spel" en "SYSTEEM" boven één onderdeel "Instellingen" (en Cheats): de kop herhaalt de naam.
- Datum en tijd staan klein ("Vrijdag 14 augustus · 08:07") onder het logo; de versieregel is lang.
- De stip bij Verhaal en Prestaties betekent "nieuw" maar heeft geen woord of vorm; en Doorgaan is altijd geel, ook als het paneel een eigen gele knop heeft (Opslaan en stoppen heeft er twee).
- De toetsenregel staat als los plaatje rechtsonder, niet onder het paneel.

**Niet bekeken.** Een controller (geen padhardware in deze run), het Samen spelen-tabblad (andere ontwerper), 4K, Rustig drukwerk, de aanwijzingen en het laadscherm van een verre reis in de echte app, en het hoofdmenu op de levende wereld (de mockup gebruikt een laadschermrender als achtergrond).

## 3. Principes

1. **Eén gele knop per scherm, op de plek van het volgende doel.** Overzicht: "Verder met deze stap". Opslaan en stoppen: "Nu opslaan". Hoofdmenu: "Doorgaan" (of "Nieuw spel" zonder save). Een bevestiging: de *veilige* keuze is geel en heeft de focus; wat iets wegdoet is rood en vraagt vasthouden. De gele Doorgaan in de rail wordt secundair zodra het paneel een eigen gele knop heeft (afspraak van de coördinator, ook gevraagd in [BEZIT-UI-24-11.md](BEZIT-UI-24-11.md) 9.1).
2. **Vier soorten dingen, vier uiterlijken** (gelijk aan club en bezit). Status is platte tekst met icoon en woord (`ds-z-status`), navigatie zijn tabs met een lijn, een keuze is een segment met vinkje (`ds-z-segment`), een actie is een knop; de derde actie is een link met pijl (`ds-z-link`).
3. **Elk getal één keer per scherm.** Geld, gezondheid en gezocht staan in de kopband en nergens anders; de voortgang heeft één groot getal; de datum en tijd staan één keer, in de rail. Een tegel die een getal van een ander blok herhaalt, verdwijnt.
4. **Gevolg vóór de keuze.** Elke knop die iets wegdoet of vervangt zegt in woorden wat verloren gaat en wat blijft, met de echte getallen (min speeltijd, geld, missie) en een voor-na-vergelijking waar twee spellen botsen.
5. **Controller eerst, bank-afstand en Steam Deck.** Alles bereikbaar met D-pad, A, B, X, Y, LB en RB; geen verstopte "…"-menu's voor wat je vaak doet; doelen minstens 44 px; leesbaar op 1280x720 en 1280x800.
6. **Tekstdieet blijft** (laadscherm: één statusregel; geen tekstmuren). De uitleg die nu in alinea's staat, wordt een zin bij de knop of een link.
7. **Altijd zomer, geen echte merken, Grunn, Nederlands.** Een bevestiging dreigt niet: ze zegt het. Geen getoond geweld in de uitslagkaarten.

## 4. Ontwerpmaten

Dezelfde als bij club en bezit: de menustage is 1920 ontwerppixels breed en wordt ingezoomd met `--mz = min(h/1080, b/1920)`; de hulptekst krijgt de vloer van 13 echte pixels (`--menu-min`). 1280x720 is de strakste maat (hulptekst 19,5 stage-px) en daarop is getoetst; 1280x800 (Steam Deck) heeft een stage van 1920x1200. De rail is 260 stage-px breed met een paneel van ca. 1444. Het hoofdmenu en de uitslagkaarten staan op de volle stage, zonder rail.

## 5. Per scherm

### a. De rail (`h-rail.html`)
- **Volgorde blijft Spel, Doen, Bezit, Voortgang, Systeem** (vaste plekken voor wie het weet). Wat verandert: een groep met één onderdeel (Spel, Instellingen) krijgt geen kop meer, want de kop herhaalt de naam eronder; Instellingen staat onder een lijn onderaan. Afsluiten en de versie staan in een voet. Een Terug-knop onderaan de rail komt er niet bij (Esc, B en Doorgaan doen hetzelfde); vanuit het hoofdmenu heet de bovenste knop **Terug** en staat er alleen Instellingen (zonder spel valt de rest weg, zoals nu `PRESTART_SECTIONS`).
- **Kop**: het GDE-logo links; rechts de tijd groot en de dag klein ("08:07 / Vrijdag 14 augustus"). Dat is de enige plek van datum en tijd.
- **Doorgaan**: geel, tenzij het paneel een eigen gele knop heeft; dan secundair (papier met harde schaduw). Ernaast de zoekknop (toets `/`).
- **Nieuws**: een rode ruit rechts van een onderdeel dat nieuws heeft (Verhaal bij een ongelezen bericht, Garage bij een nieuwe auto). Nooit een getal erachter: dat stond er dubbel (de "n" van `data-n`, het aantal spelers in de rail).
- **Cheats** blijft verborgen tot de speler het aanzet (22-11); het ontwerp telt twaalf onderdelen.

### b. Overzicht (`a-overzicht.html`, `a2-overzicht-nieuw.html`, `a3-overzicht-missie.html`, `a4-overzicht-gast.html`)
- **Kopband** (`ds-z-kopband`): eyebrow "Spel · Akte 2: Het Noorden is groot", titel Overzicht, rechts drie statusblokken: **Geld**, **Gezondheid**, **Gezocht** (platte tekst; rood bij gevaar: gezondheid onder 35 of een of meer sterren). Dit beantwoordt vraag 3 zonder te lezen. Speeltijd gaat naar de voet.
- **Tabs** (Q en E): Overzicht, Samen spelen, Opslaan en stoppen; een rode ruit bij nieuws (nu: een spel dat nog niet is opgeslagen). In een sessie vervangt de Samen spelen-ontwerper dit tabblad door Spelers, Uitnodigen en Sessie (`a4`).
- **Strook "Aandacht"** (dezelfde vorm als "Nu te doen" in Land en bedrijf): hoogstens drie regels, elk één groot doel met een woord (NU rood, VANDAAG geel streepje, NIEUW bordgroen) en een pijl; bronnen: ongelezen berichten (`phoneUnread`), evenementen en bijbanen van vandaag, nieuw ontgrendelde plekken, een spel dat al lang niet is opgeslagen. Leeg = de strook verdwijnt (nooit "Geen nieuws"). Zonder spelvoortgang (nieuw spel) ook weg.
- **Heldkaart "Volgende stap"** (links, `ds-z-kaart` met een bordgroene band met het hoofdstuk): de titel van de stap groot, de zin die het verhaal erbij geeft (maximaal twee regels, de bestaande `lead`), drie feiten als platte status (plek en afstand, beloning ± bedrag, dag of nacht), een balk "Stap 6 van 14 in Akte 2" (hier één keer; de oude "Verhaal 1 van 71" en "Stap 2 van 12" verdwijnen), de gele **Verder met deze stap** met Enter in de knop, en daarnaast de links **Op de kaart** en **Eerder: Soep bij Beppe (Waar waren we?)**. Rechts in de kaart een kaartminiatuur met jou, de route en het doel. "Verder met deze stap" zet het doel op deze stap (als dat niet zo was) en sluit het menu; dat vervangt "Zet als doel", "Alle opdrachten" en "Opslaan" als even zware knoppen (opslaan staat in de voet, alle opdrachten is Verhaal in de rail).
- **Missie bezig** (`a3`): de band wordt geel ("Je bent bezig"), de knop heet **Verder met de missie**, en **Missie stoppen** is een link met de zin dat stoppen niets kost (de huidige tekst, nu achter een vouw en een tweede bevestiging).
- **Nieuw spel** (`a2`): geen nullen. Geen voortgangsblok maar één lege toestand ("Je zomer begint hier"); de eerste stap is de held; geen strook; de reden dat niets te zien is staat erbij.
- **Gast** (`a4`): de band zegt "Verhaal van Anke" met de status "Alleen kijken"; de gele knop heet **Verder spelen**; de aandacht noemt de wedstrijd van de host. Zie hoofdstuk 8.
- **Rechterkolom**: **Voortgang** met één groot percentage, één balk en vier platte regels (Verhaal, Prestaties, Kaart verkend, Gebieden); **Bijna gehaald** met twee prestaties en hun stand. Daaronder niets meer.
- **Links onder de held**: **Dichtbij** met de twee dichtstbijzijnde activiteiten (soort, plek, afstand) en de link naar Activiteiten.
- **Voetstrook** (rustig, onderaan, altijd zichtbaar in plaats van een vouw): "Vastgelopen? **Naar huis** → **Jezelf vrijzetten** →", rechts "Speeltijd 6 u 12 · opgeslagen 4 min geleden" en de link **Nu opslaan**. Naar huis alleen als dat kan (`canGoHome`); met een lopende bijbaan komt "Stoppen met <naam>" erbij; in de duif-modus "Duif-modus stoppen" en "Naar huis vliegen". Het "Zet me vrij" doet wat het nu doet (`safety.js`).
- **Weg van het scherm**: de vier tegels (Geld, Speeltijd, Missies te doen, Te vinden), het tweede voortgangsblok en de vouwen "Snel instellen" en "Vastgelopen?".

### c. Opslaan en stoppen (`b-opslaan.html`, `b2-terugzetten.html`, `b3-nieuw-bevestig.html`, `b4-opslaan-fout.html`)
- Dezelfde kopband en tabs. **Links de kaart "Dit spel"**: het beeld van de plek (de miniatuur die de save al bewaart), de naam met de link **Hernoemen**, platte feiten (speler, hoofdstuk, speeltijd, niveau), één statusregel ("Opgeslagen · 4 min geleden", rood als de laatste opslag lang geleden is, of "Opslaan mislukt" met de reden en dat het spel nog openstaat), de zin dat het spel ook vanzelf bewaart, en de knoppen: de gele **Nu opslaan** en **Opgeslagen spellen**. Hier heeft het paneel een gele knop, dus de rail-Doorgaan is secundair.
- **Links onder**: **Het spel verlaten**: *Naar het hoofdmenu* (je spel wordt eerst opgeslagen) en *Afsluiten* (alleen in de app). Eén zin bij elke knop; geen bevestiging (er gaat niets verloren), behalve in een sessie (zie hoofdstuk 8). Dit zijn de huidige "Spel herstarten" en "Spel sluiten", met de namen die de speler herkent.
- **Rechts**: **Opnieuw beginnen** is geen knop meer die twee dingen doet, maar twee rijen: **Nieuw spel** (veilig: je huidige spel wordt eerst opgeslagen en blijft staan) en **Laatste opslag terugzetten** (gevaarstijl, rood, de enige rij die iets wegdoet).
- **Bevestigingen** (hoofdstuk 6): *Terugzetten* toont wat je verliest (4 min speeltijd, +€640, de lopende missie) en wat blijft, de gele knop is **Nee, doorspelen** en de rode **Houd vast om terug te zetten**. *Nieuw spel* zegt op welke plek het komt, dat het oude spel blijft staan en gaat daarna naar de niveaukaart (d3).
- **Weg van het scherm**: "Naar mijn boerderij" (staat al in de rail), de tweede "Doorgaan", "Missie stoppen" (staat nu op Overzicht, bij de missie), het rechterpaneel met uitleg.

### d. Opgeslagen spellen (`c-slots.html`, `c2-overschrijven.html`, `c3-verwijderen.html`, `c4-laden-ongeslagen.html`, `d4-hoofdmenu-laden.html`)
Eén scherm voor het pauzemenu en voor het hoofdmenu (alleen de knoppen en de kop verschillen).
- **Raster van kaarten** (vier kolommen, acht plekken): beeld, naam, speeltijd en plek en wanneer, het niveau als platte tekst (Uitdagend, Ontspannen), het huidige spel gemarkeerd met een groene rand en "Huidig". Een kapotte of nieuwere save is rood en zegt in één zin waarom, met **Reservekopie** erbij. Een lege plek is één gestippelde kaart.
- **Acties staan op de kaart**: *Laden* en *Hier opslaan* zijn knoppen (X is hier opslaan op de controller), "…" is voor Hernoemen, Kopiëren, Exporteren en Verwijderen (Y). In het hoofdmenu heet de eerste knop *Doorgaan* (voor het laatst gespeelde spel) of *Laden*.
- **Overschrijven** (`c2`): een vergelijking *Nu in deze plek → Straks in deze plek* met beeld, speeltijd, hoofdstuk en geld naast elkaar, een regel of het veilig is (zelfde verhaal, meer speeltijd) of niet, de gele **Nee, bewaar allebei** (met de keuze **Naar een lege plek**) en de rode **Houd vast om te overschrijven**. Zijn er minder speeltijd of een ander verhaal in de plek die je overschrijft dan erin zit, dan staat er een waarschuwing "Dit spel heeft *meer* speeltijd dan je huidige spel".
- **Laden met niet-bewaarde voortgang** (`c4`): wat je verliest (26 min, +€640, stap 6 van 14) en drie keuzes: **Opslaan en laden** (geel), **Laden zonder opslaan**, **Annuleren**.
- **Verwijderen** (`c3`): beeld, naam, speeltijd, de zin dat ook de herstelkopie weggaat en dat het niet ongedaan kan, **Nee, bewaren** (geel) en **Houd vast om te verwijderen** (rood). Het spel dat nu loopt kan niet verwijderd worden (dat doet het nu al, `spelDatNuLoopt`).
- **Volle opslag** (alle acht in gebruik): "Nieuw spel" noemt de plek die het zou wissen en vraagt vasthouden; liever eerst een andere plek kiezen.

### e. Hoofdmenu en start (`d-hoofdmenu.html`, `d2-hoofdmenu-nieuw.html`, `d3-nieuw-spel.html`)
- **Wat er nu is**: geen hoofdmenu. Na het opstartscherm komt de keuzekaart "Hoe wil je spelen?" met Alleen spelen en Samen spelen en gaat Alleen spelen door met de laatste save zonder dat je weet welke; het titelscherm met de wereld erachter (`runMenuScreen`) is alleen nog voor QA en trailers. Het ontwerp haalt dat titelscherm terug als *het* hoofdmenu, op de levende wereld, en laat het de keuzekaart vervangen: Doorgaan is Alleen spelen, Samen spelen is Samen spelen. Constitutie 4 en 10 en het besluit van 21-11 blijven kloppen: er gaat niets over het netwerk voor de speler Samen spelen kiest, en de kaart wordt nooit overgeslagen.
- **Terugkerende speler** (`d`): links een papieren paneel met het logo en **Doorgaan** als held (geel): het beeld van de save, de naam, de speler en de stap ("Een middag op het terras"), speeltijd, geld en wanneer ("gisteren 21:40"), een balk voor de voortgang en Enter in de knop. Daaronder rijen: **Nieuw spel**, **Opgeslagen spellen** (met het aantal), **Samen spelen** ("Speel met vrienden in een eigen, besloten sessie"), **Instellingen**, **Afsluiten** (alleen in de app). Onderaan de leeftijdsmarkering 18, de versie en de link **Over en nieuws** (Over blijft het naslagscherm onder Instellingen > Interface, #601). Rechts de wereld, met de naam van de plek ("Martinikerk, Grunn"). De focus start op Doorgaan, of op Samen spelen als de speler de vorige keer Samen koos (`startKeuze`).
- **Nieuwe speler** (`d2`): geen Doorgaan en geen Opgeslagen spellen (niets te laden, dus ook geen uitgeschakelde rijen). De held is **Nieuw spel** ("Begin je zomer in Grunn. Je kiest straks hoe pittig het is.").
- **Nieuw spel** (`d3`): één kaart "Hoe pittig moet het zijn?" met de drie niveaus als segment, elk met de echte uitleg en getal (Ontspannen: meer tijd, rustige politie; Standaard (aanbevolen, voorgekozen); Uitdagend: minder tijd, scherpe politie, druk verkeer), de naam van de plek ("Opgeslagen spel 4", met **Wijzigen**), de link **Eigen opties aanpassen** en de gele **Begin het spel**. 1, 2 en 3 kiezen een niveau. Dit is de bestaande kaart (#1169) in de taal van de rest, met de plek erbij.
- **Instellingen vanuit het hoofdmenu** opent het blad met de rail van `h-rail` (alleen Instellingen, bovenste knop Terug).
- **Overgang naar Samen spelen**: de rij opent de hub van de Samen spelen-ontwerper (branch ontwerp-multiplayer-24-11; het document stond nog niet op die branch toen dit ontwerp af was, dus de tabnamen zijn afgestemd op zijn mockups); de eerste keer komt eerst de naamkaart en de toestemmingsregel (ongewijzigd, #95). Titel, rail en tabnamen volgen dat ontwerp; mijn kant is alleen de rij en de tab "Samen spelen" in Spel.

### f. Laadscherm (`e-laad-save.html`, `e2-laad-reis.html`, `e3-laad-lang.html`, `e4-laad-klaar.html`)
- Het huidige scherm is goed en blijft: logo, bestemmingsbord ("Verder in Grote Markt", "Naar Drenthe"), een render van het spel, één balk, één statusregel, stempel- en driftbeweging (`ds-laad.css`). Het tekstdieet van 21-11 blijft: geen tips en geen verhaaltekst als vaste inhoud.
- **Toegevoegd, alleen als het nodig is**: bij een wacht van meer dan acht seconden wisselt de ene statusregel af met één tip uit de bestaande hints (`e3`), met het toetsplaatje als token. Nooit een tweede regel.
- **Voortgang**: de balk blijft de enige voortgang; de echte stap staat in de regel. De regel wordt "Klaar, Grunn staat te wachten" en het scherm gaat zelf door (`e4` toont alleen het geval met de recapkaart, zie g).
- **Beweging**: stil bij Beweging beperken en Rustig drukwerk (bestaand).

### g. Opgepakt en buiten westen (`f-opgepakt.html`, `f2-buiten-westen.html`)
- **Wat er gebeurt** (code): bij opgepakt volgt een boete van ten hoogste €60 per zoekster en nooit meer dan een vijfde van je geld (op het gekozen niveau geschaald), gratis in een auto die de missie leende; het zoekniveau gaat naar nul; een lopende missie of bijbaan mislukt; je komt aan bij het bureau. Bij neergaan: gezondheid weer vol, het ziekenhuis kost niets, je Escapade staat bij de voordeur (een total loss vervangen kost €50).
- **De kaart** is de bestaande stempelkaart (`momentVanOpgepakt`) maar *vertelt de volgende stap*: een bon met wat het kost (boete), wat verdwijnt (zoekniveau), wat er met de missie is (opnieuw te starten) en wat je overhoudt; de gele **Verder**, en een link **Missie opnieuw proberen** als er een lopende missie was. Zonder druk gaat het scherm na acht seconden vanzelf weg; Spatie slaat over. Geen geweld getoond (constitutie 6): alleen de stempel "Bekeuring" of "Opgelapt".
- **Samen spelen**: de uitslag is van de speler zelf; bij een medespeler (PvP) kost dood niets en toont de kaart geen bon.

### h. Waar waren we? en de aanwijzingen (`g-recap.html`, `g2-aanwijzingen.html`)
- **Recapkaart**: dezelfde kaarttaal als de rest (nu heeft hij eigen CSS in `recapcardrun.js`): de titel "Waar waren we?", het hoofdstuk en de stap, drie rijen met een icoon en een kleine kop (*Waar het om draait*, *Laatst gedaan*, *Nu*), de gele **Verder** en de link **Naar het Overzicht**. Hij komt na Doorgaan, alleen als de speler Terugkeerscène aan heeft, alleen alleen spelen, niet binnen tien minuten voor dezelfde stap (alle regels van `recapcard.js` blijven). Esc en Enter sluiten hem.
- **Aanwijzingen**: één taal voor de drie zachte hints: de herinnering na vijf, vijftien en dertig minuten (`storyremind.js`), de OV-hint bij een ver doel (`ovhint.js`) en "Zit je vast?" (`vastlopen.js`). Ze komen van het personage dat je niet speelt, op dezelfde plek, met dezelfde duurbalk, nemen nooit een klik of toets en gaan uit met Instellingen > Hints en uitleg. Het doel staat altijd in de HUD en in het Overzicht; de aanwijzingen zijn aanvullend en nooit de enige plek.

## 6. Componenten

**Hergebruikt van DS3** (`game/js/ds-*.css`): `ds-z-kaart` (`--bord`, `--probleem`, `--uit`), `ds-z-knop` (primair, `--secundair`, `--ghost`, `--gevaar`, `aria-disabled` met reden), `ds-z-knop__toets` (toets in de knop), `ds-z-balk`, `ds-z-bon` (de uitslagkaarten), `ds-z-rij`, `ds-z-leeg`, `ds-z-toets`, de tokens en `ds-laad.css`.

**Hergebruikt van het club- en bezitontwerp** (gedeelde set, ongewijzigd): `ds-z-kopband`, `ds-z-status` (en `--blok`), `ds-z-tussenkop`, `ds-z-link`, `ds-z-segment`, `ds-z-stapper`, `ds-z-tabel`; de tabrij met onderstreping (`bz3-tabs`, `vb-tabs`, `ds-z-tabs--lijn` in beide voorstellen); de strook "Nu te doen" (`bz3-nu`/`bz3-klus`), hier met het label "Aandacht".

**Nieuw voor dit ontwerp** (alleen tokens, geen hex; in `mock.src.css`, bij het bouwen naar `game/js/ds-spel.css`, voorvoegsel `sp-`):

| Component | Doel |
|---|---|
| `sp-held` | de heldkaart: titel, zin, feiten, balk, gele knop en een kaartminiatuur (Overzicht) |
| `sp-voortgang`, `sp-regels` | één percentage, één balk, platte regels |
| `sp-spel` en `sp-thumb` | de kaart "Dit spel" en het beeld van een save |
| `sp-slot` | een opgeslagen spel als kaart met beeld en acties |
| `sp-bevestig`, `sp-vergelijk`, `sp-verlies`, `sp-vasthoud` | de bevestigingskaart: wat verandert, wat blijft, vasthouden voor het onomkeerbare (zelfde 600 ms als `tweedruk.js` en het bezitontwerp) |
| `sp-menu`, `sp-doorgaan`, `sp-keuze` | het hoofdmenu: paneel, de Doorgaan-held en de rijen |
| `sp-niveaus`, `sp-niveau` | de drie niveaus als een segment met uitleg (`ds-z-segment` met een regel eronder zodra dat in de gedeelde set staat) |
| `sp-uitslag`, `sp-stempel` | de uitslagkaart met bon |
| `sp-recap`, `sp-toast` | de recapkaart en de aanwijzing met duurbalk |
| `sp-laad` | de laadschermvariant met tip (alleen CSS-aanvulling op `ds-laad.css`) |

Wat verdwijnt: de tegels (`ov-tile`), het voortgangsblok met vier tegels, de vouwen (`m-disc`) in Overzicht, de rij-lijsten met `m-li` in Opslaan en stoppen, de eigen CSS van de recapkaart in JS, het "…"-menu als enige weg naar Laden en Hier opslaan.

## 7. Toestanden, toetsenbord en controller

Per scherm: **laden** (rasterbalken met `aria-busy`, geen spinner), **leeg** (nieuw spel zonder voortgang, geen opgeslagen spellen: één zin, een beeld en één actie), **fout** (probleemkaart: opslaan mislukt, de schijf is vol, het spel staat nog open, met Opnieuw proberen), **op slot** (een kapotte of nieuwere save: gestippeld, de reden in woorden, nooit een nette "Laden"-knop), **Samen spelen** (gast: zie 8) en **Rustig drukwerk** (zelfde vorm en woorden, zonder raster en misdruk). Zie `h2-toestanden.html`.

Bediening (menu-patroon van `ui-taal.md`): **Q en E** (LB en RB) wisselen tab; **omhoog en omlaag** kiezen binnen de kolom; **links en rechts** tussen de kolommen en tussen de strook en de inhoud; **Enter of A** doet de gele knop of de focus; **Esc of B** gaat een laag terug, daarna sluit het menu (op Overzicht) of gaat naar het hoofdmenu (in de prestart). Op de kaarten van Opgeslagen spellen: **A laden, X hier opslaan, Y meer**, B terug. Een onomkeerbare actie vraagt **vasthouden** (Enter of A, 600 ms); een gewone bevestiging heeft de veilige keuze als eerste focus. Hoofdmenu: omhoog en omlaag, A, 1 tot 5 als snelkeuze; B doet niets (Afsluiten is een rij). Eén focusring (de DS-ring), alle doelen minstens 44 px. Met Beweging beperken springt de onderstreping en vult de vasthoudbalk in één stap. `h3-bediening.html` toont de volgorde.

## 8. Samen spelen

De zes vragen (uitgangspunt: [COOP-GAST.md](../COOP-GAST.md) en #429):

| Vraag | Antwoord |
|---|---|
| Van wie is het? | Het Overzicht, de opslag, het hoofdmenu, de uitslagkaarten en de recapkaart zijn van de speler zelf (lokaal). Het verhaal (de volgende stap) is van wie het spel opende; de wereld ook. |
| Doet een gast mee (J of N)? | Er is geen Meedoen voor dit onderdeel; alles werkt in het eigen menu van elke speler. |
| Wat ziet een gast? | Op Overzicht de band "Verhaal van <host>" met "Alleen kijken" en de gele knop **Verder spelen**; de aandacht noemt wat de host doet; geld, gezondheid en gezocht zijn zijn eigen (`a4`). Opslaan bewaart alleen zijn eigen verdiensten (de bestaande zin `GAST_BEWAARD_TEKST`). Laden en Nieuw spel zijn tijdens een sessie niet mogelijk: de kaart zegt dat en biedt "Sessie verlaten" (`coopLoadTekst`, `coopActieTekst`); "Naar het hoofdmenu" verlaat de sessie met dezelfde vraag voor de host. De hoofdmenu-rij Samen spelen is de ingang; de tabs in een sessie zijn die van de Samen spelen-ontwerper. |
| Wie krijgt beloning en voortgang? | Per speler. De boete van opgepakt gaat van het eigen geld; een gast krijgt geen verhaalvoortgang, wel zijn eigen verdiensten. |
| Wat als iemand wegvalt of later aansluit? | De kaart "Dit spel" en de strook lezen de eigen stand; wie wegvalt landt in zijn hoofdmenu met zijn eigen laatste opslag; wie later aansluit ziet direct "Verhaal van <host>". Een host die wisselt (#439) verandert alleen die band. |
| Welke test dekt het? | Nieuwe pure tests voor de viewfuncties (Overzicht met held, strook en gastband; de verlieslijst bij terugzetten, laden en overschrijven; de uitslagbon uit `bustFine`), de bestaande `recapcard_test`, `saveslots_test`, `launchchoice_test`, `cooploadrules_test` en `bigmoment_test`, en een testbankstap voor Laden tijdens een sessie. |

Regel voor de changelog: "Het Overzicht begint met je volgende stap en één knop die je erheen brengt; Opslaan en stoppen zegt altijd wat je verliest en wat blijft; er is een hoofdmenu met Doorgaan; opgepakt en buiten westen tonen wat het kostte en wat nu."

## 9. Wat het bouwen kost

Fase 2, zes stappen met elk een eigen commit en test (alleen de tests die de code dekt):

1. **Componenten**: nieuw `game/js/ds-spel.css` (uit `mock.src.css`) en de ontbrekende gedeelde delen (`ds-z-segment` met regel, `ds-z-tabs--lijn`, de strook) als de club- en bezit-agent ze nog niet hebben gemerged; de galerij `game/ds-galerij.html`. Tests: `ds_tokens_test`, `ds3_dekking_test`.
2. **Puur model** (nieuw, met tests): `spelstatus.js` (geld, gezondheid, gezocht, voortgang, de aandacht-regels uit bestaande bronnen), `verlies.js` (wat je verliest bij terugzetten, laden, overschrijven en nieuw spel, uit de save en de wereld), `uitslagbon.js` (boete uit `bustFineIn`, wat verdwijnt, wat blijft).
3. **Overzicht en rail**: `todoui.js` (`renderOverview`, `heroHtml`, `tilesHtml`, `voortgangHtml`, `agendaHtml` worden de held, de strook en de voet; ca. 330 regels naar 260), `pausemenu.js` (`RAIL_GROUPS`, de koppen, de rail-voet, de secundaire Doorgaan, de rode ruit, de kopband van Spel). Tests: `todoui_test`, `pausemenu_test`, `progressoverview_test` aanpassen.
4. **Opslaan en stoppen en Opgeslagen spellen**: `spelHtml` in `pausemenu.js` (acht rijen worden de kaart "Dit spel" en de stoprijen), `saveslotsui.js` (kaarten met acties, vergelijking, vasthouden; ca. 610 regels blijft ongeveer gelijk), `saveslots.css`. Test: `saveslots_test`, `saveslotsui_test` aanpassen en uitbreiden.
5. **Hoofdmenu en nieuw spel**: `startscreen.js` (`runMenuScreen` wordt de standaardroute en `runBootScreen` leest de keuze daaruit; de keuzekaart `launchchoiceui.js` vervalt of wordt de ingang van Samen spelen), `difficultycard.js` (de kaart in de nieuwe taal). Tests: `launchchoice_test`, `qa_start_test`, `difficultycard_test`. De raakste stap: het opstartpad.
6. **Uitslag, recap, aanwijzingen**: `bigmoment.js` (de bon), `recapcardrun.js` (CSS naar `ds-spel.css`, de gele knop), `storyremind.js` en `ovhint.js` (een toast). Tests: `bigmoment_test`, `recapcard_test`, `ovhint_test`.

Samen: ca. 3 nieuwe pure bronbestanden met tests, 1 nieuw CSS-bestand, 9 aangepaste bronbestanden (`todoui.js`, `pausemenu.js`, `saveslotsui.js`, `startscreen.js`, `launchchoiceui.js`, `difficultycard.js`, `bigmoment.js`, `recapcardrun.js`, `loadscreen.js`), 2 CSS-bestanden aangepast (`saveslots.css`, `loadscreen.css`) en ca. 8 tests nieuw of aangepast. Niet in dit werk: nieuwe spelregels, het Samen spelen-scherm zelf, geluid, het wereldlaadpad.

## 10. Wat nog niet is besloten

1. **Het hoofdmenu vervangt de keuzekaart.** Dat is groter dan een nieuw scherm: het draait het besluit van 21-11 ("bij elke start eerst Hoe wil je spelen?") om in "bij elke start het hoofdmenu", met dezelfde uitkomst en meer informatie. Akkoord van de eigenaar nodig; zo niet, dan blijft de keuzekaart en wordt alleen de Doorgaan-held (beeld, plek, speeltijd) in die kaart gezet.
2. **Wat "Verder met deze stap" doet.** Voorstel: het zet het doel op deze stap als dat niet zo was en sluit het menu. Alternatief: het opent de kaart met de route (dat is nu "Op de kaart"). Beide staan er; de vraag is welke de gele is.
3. **Gezondheid en Gezocht in de kopband** zijn nieuw in het pauzemenu (de HUD toont ze alleen bij een verandering). Voorstel: altijd tonen in het menu; geen nieuwe spelregel.
4. **Het "Aandacht"-bronnenlijstje** (ongelezen bericht, evenement van vandaag, nieuw ontgrendeld, lang niet opgeslagen) is een voorstel; welke bronnen mee mogen (en in welke volgorde) is een besluit, net als "+n meer" bij meer dan drie.
5. **Vasthouden om te overschrijven of te verwijderen** is nieuw gedrag voor Opgeslagen spellen (het bezitontwerp stelt het voor Te koop voor). Alternatief: twee kliks met de veilige keuze als focus. Voorstel: vasthouden alleen voor verwijderen en voor overschrijven van een spel met meer speeltijd.
6. **Een kleine "Laatste opslag terugzetten" is nieuw**: nu is "Opnieuw beginnen" een kaart met Laatste spel laden en Nieuw spel. Voorstel: twee rijen zoals getekend; de code (`restart`, `load`, `new`) is er al.
7. **De kaartminiatuur in de held** wordt een SVG uit de bestaande route (`ovkaart.js`, de minimap) of een canvas; niet in de mockup uitgewerkt.
8. **Het laadscherm met recap.** Een recap op het laadscherm (de wachttijd is dood tijd) zou een stap besparen, maar breekt het tekstdieet van 21-11; daarom blijft de recapkaart een aparte kaart na het laden. Als de eigenaar de recap liever in het laadscherm heeft, past dat in `e4`.
9. **"Opslaan en stoppen" of "Opslaan & stoppen".** De code heeft de ampersand; de Samen spelen-ontwerper gebruikt hem ook; dit ontwerp schrijft "en" (ui-taal vraagt om woorden). Eén van beide, voor alle schermen.
10. **De naam van een opgeslagen spel.** Nu "Spel van 24 nov" of "Opgeslagen spel 4"; het ontwerp toont ook de stap en de speeltijd naast de naam, zodat de naam er minder toe doet. Een standaardnaam met de plek ("Grote Markt") is mogelijk.
11. **Een groep met één onderdeel zonder kop** in de rail wijkt af van #911 (elke groep een kop met aantal). Voorstel: wel doen; de kop herhaalt anders de naam.
12. **Niet bekeken in het echte menu**: pausemenu-kader en 3D-achtergrond in de mockups zijn nagebootst (de achtergrond is een laadschermrender); het hoofdmenu is op de levende wereld getekend, de camera en de snelheid zijn niet getest.

## 11. De mockups opnieuw maken

```
node docs/ontwerp/spel-ui-24-11/bouw.mjs          # schermen naar .scr/spel-ontwerp/scherm/
node docs/ontwerp/spel-ui-24-11/schiet.mjs        # beelden (headless Chrome, eigen profiel) op 1920x1080, 1280x720 en 1280x800
node docs/ontwerp/spel-ui-24-11/index.mjs         # .scr/spel-ontwerp/index.html
```

De beelden van de huidige schermen: `huidig_beeld.mjs` met `huidig_scenes.js` en `huidig_start_scenes.js` (Electron via `electronrunner.cjs`, een gestagede game-map met een wereld, een uitvoermap binnen `.claude/worktrees`). De stage is 1920 ontwerppixels breed (`--mz`); de hulptekst krijgt de vloer van 13 echte pixels, dus op 1280x720 groeit die naar 19,5 stage-px: de strakste maat. De gedeelde set (`gedeeld.css`) is een kopie van `club-ui-24-11` (d651766f7) tot die branch gemerged is.

## 12. Stand van de bouw (fase 2, 24-11)

Besluiten van de coördinator verwerkt: het hoofdmenu met Doorgaan als held vervangt de keuzekaart en laat "Hoe pittig moet het zijn?" bij Nieuw spel (bestaande kaart, opties en tests); "Verder met deze stap" zet het doel, sluit het menu en laat het spel doorgaan; Gezondheid en Gezocht staan altijd in de kopband; de bronnen van Aandacht zijn berichten, het evenement van vandaag en een spel dat lang niet is opgeslagen (garage en bezitklussen zijn weggelaten: de bezit-agent levert ze nog niet); vasthouden alleen bij overschrijven en verwijderen van een save en bij de laatste opslag terugzetten; de recap blijft een aparte kaart; de naam "Opslaan en stoppen" (met "en") is doorgegeven aan de multiplayer-ontwerper; een groep van één onderdeel zonder kop is goedgekeurd (comment op #911); de recap noemt de gekozen hoofdpersoon (Tammo of Anita) en een test bewaakt dat.

Gebouwd, met de bestanden:
- **Puur**: `spelstatus.js` (kopband, Aandacht, verlies, vergelijking, vasthouden, uitslagbon, naam van de hoofdpersoon; `spelstatus_test.mjs`, 31 controles), `hoofdmenu.js` (rijen, toetsen, uitkomst, wat Nieuw spel en Laden met de saves doen; `hoofdmenu_test.mjs`, 36 controles).
- **Componenten**: `ds-spel.css` (de `sp-*`-componenten, alleen tokens) en de gedeelde set uit club-ui-24-11 (cherry-pick van `d651766f7`, geen kopie meer); `spelbevestig.js` (de bevestigingskaart met vasthouden).
- **Overzicht en rail**: `todoui.js` (held, strook, voortgangsblok, Dichtbij, voet; de tegels en vouwen zijn weg), `pausemenu.js` en `pausemenu.css` (kopband, tijd groot in de rail, geen kop boven een groep van één, Doorgaan secundair, de rail houdt logo en versie op 720p), `recapcardrun.js` (`toonRecapNu` voor de link Waar waren we?).
- **Opslaan en stoppen en Opgeslagen spellen**: `pausemenu.js` (de kaart Dit spel, de stoprijen, de vragen Nieuw spel en Laatste opslag terugzetten), `saveslotsui.js` en `saveslots.css` (kaarten met beeld en acties, oud tegenover nieuw bij overschrijven, vasthouden bij overschrijven en verwijderen, laden met niet-bewaarde voortgang).
- **Uitslag en recap**: `bigmoment.js`, `bigmoment.css` en `cinematics.js` (de bon op de stempelkaart; de kaart blijft zichzelf wegfaden en neemt geen toets), `recapcard.js` en `recapcardrun.js` (kaarttaal, gele knop met toets, de gekozen hoofdpersoon).
- **Hoofdmenu**: `launchchoiceui.js` (`openHoofdmenu`, de zware modules pas bij het openen zodat `launchchoice_test` licht blijft) en `main.js` (de startvraag gebruikt het hoofdmenu).

Afwijkingen van het ontwerp, eerlijk: de uitslagkaart heeft geen Verder-knop en geen "Missie opnieuw proberen"-link (de kaart is een overlay die zichzelf wegfaadt en nooit een toets neemt, ADR 0040; de mislukte missie biedt zijn eigen herstart in Overzicht); het hoofdmenu staat over het opstartscherm en niet over de levende wereld (de wereld is dan nog niet gebouwd); de kaartminiatuur in de held is een vogelvlucht-schets (jij, het doel en een lijn), niet de route; het gast-tabblad Praten · later van de Samen spelen-ontwerper is niet gebouwd (andere ontwerper, ander scherm); "Doorgaan" in de rail is alleen secundair op Spel > Overzicht en Opslaan en stoppen.
