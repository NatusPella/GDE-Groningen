# Samen spelen (multiplayer): ontwerp (fase 1, 24-11)

Status: ontwerp, nog niet gebouwd. Geen spelcode gewijzigd. Aanleiding: opdracht van de coördinator (24-11) om alle schermen en meldingen van Samen spelen te herontwerpen in dezelfde taal als het club- en het bezitontwerp ([CLUB-UI-24-11.md](CLUB-UI-24-11.md), [BEZIT-UI-24-11.md](BEZIT-UI-24-11.md); door de eigenaar goedgekeurd). Mockups: `docs/ontwerp/multiplayer-ui-24-11/` (`bouw.mjs` maakt de schermen met `helpers.mjs` en `scenes_a|b|c.mjs`, `mock.src.css` bevat de voorgestelde nieuwe componenten, `schiet.mjs` neemt de beelden, `index.mjs` bouwt de vergelijkingspagina, `huidig_beeld.mjs` met `huidig_scenes.js` rendert de huidige schermen in Electron). De pagina zelf, de beelden van de huidige schermen en de beelden van het ontwerp staan lokaal in `.scr/multiplayer-ontwerp/` (niet in git): open `.scr/multiplayer-ontwerp/index.html`. Alle namen, codes en cijfers in de mockups zijn verzonnen voorbeelden.

Raakt: het onderdeel Spel > Samen spelen van `pausemenu.js` (`samenpanel.js`, `lobbyui.js`, `lobby.js`, `multiplayerwizard.js`, `multiplayerwizardui.js`, `coopspelersui.js`, `playercards.js`, `playerstatus.js`), de eerste-keerkaart en de toestemming (`launchchoiceui.js`, `onlineconsentui.js`, `onlineconsent.js`), Instellingen > Samen spelen, de HUD (`coophud.js`, `coopmeedoen.js`, `coophold.js`, `coopoverlay.js`, `multiplayerhostwisselui.js`, de naamplaat in `avatarlabel3d.js`, de kaart in `mapview.js`), de gezamenlijke keuzes (`coopgroep.js`, `difficultyvote.js`, `cooploadrules.js`) en een nieuwe kaart voor de beloning (bij `coopbeloning.js` en `groepsbonus.js`). Het netwerkprotocol, de beveiligingsregels en de wachtkamerlogica van `lobby.js` veranderen niet; het ontwerp is een andere weergave, plus een paar gedragsregels die de eigenaar al wilde (hoofdstuk 5n).

## 1. Wat een speler hier wil

Zoals bij Among Us, Sea of Thieves en Watch Dogs 2 draait het om drie momenten, in deze volgorde.

**Als hij met vrienden begint**: (1) hoe komen we in hetzelfde spel, (2) wie is er en werkt het, (3) kunnen we beginnen. De code moet groot op het scherm staan met één knop om hem te kopiëren; wie binnenkomt typt hem op het eerste scherm; de lijst met spelers zegt per speler of hij klaar is en, als hij dat niet is, waarom.

**Tijdens het spelen**: (1) wie is waar, (2) wie doet wat mee, (3) wat gebeurt er als iemand wegvalt. De spelerslijst (Tab) en de naamplaten zeggen wie en waar; Meedoen? is een korte vraag met een aftelling en zegt wat het oplevert; wegvallen is een gewone melding met een volgende stap, nooit een schrikbeeld.

**Na afloop**: (1) wat heb ik verdiend, (2) wat hebben we samen gedaan, (3) is mijn voortgang veilig. Een gezamenlijke activiteit eindigt met één kaart; het logboek staat bij Sessie.

## 2. Review van de huidige schermen

Gerenderd in Electron (1920x1080, wegwerpprofiel; de spelerslijst en het wachtscherm met een nepsessie, zonder netwerk; `huidig_beeld.mjs`) en met de echte lobbycode en CSS in een nagebouwd menuvak (headless Chrome; `scripts/ui/multiplayerflow_meet.mjs`). Wat er al goed is: het pauzemenu zonder sessie is één plek; de wizard heeft een vaste voet met één gele hoofdactie (#1011); de privacyregels zitten in de code (geen IP in beeld, standaard privé, vinkje vóór openbaar, filter op sessienamen); “nee” is nooit een doodlopend pad (`SAMEN_KAN_REGEL`); dempen en blokkeren zijn al per speler.

Wat niet goed is, per onderwerp (de beelden staan op de pagina naast het ontwerp):

- **Start.** Twee reuzenkaarten met de helft van het scherm leeg; de code typ je pas twee schermen later. “Samen spelen” staat drie keer in beeld; “Verbinding testen” en “Meer info” hebben geen uitleg. Wat er naar buiten gaat staat nergens.
- **Toestemming (#95).** De eerste-keerkaart vraagt akkoord met één zin (“mijn IP-adres wordt gedeeld”); de rest zit achter “Meer info”. De melding bij het verbinden is één regel van 12 pixels plus “Niet meer vragen” (de schakelaar springt over zijn eigen rand). Instellingen > Samen spelen zegt “STUN-server” en “brokers”: jargon. Nergens staat dat er niets naar ons gaat.
- **Openen (#438).** Drie stappen voor je de code ziet; stap 1 (“Wie ben jij”) herhaalt wat Instellingen al weet. Privé en Openbaar zijn twee kaarten; wat in de lijst komt staat in één regel naast een vinkje. Een geweigerde sessienaam krijgt de reden pas na “Open je spel”.
- **Meedoen.** Tien pillen (filter en sortering), een zoekveld waarvan de toetsenbordknop het woord “Zoeken” afsnijdt, rijen als één zin; “Melden” naast elke rij betekent “verberg voor mij” maar leest als aanmelden; de versie wordt niet met de jouwe vergeleken; een fout is één regel in een leeg scherm.
- **Wachtkamer.** De code, een pil “Privé” en spelers als pillen; geen “klaar” of reden waarom starten niet kan; de helft van het scherm is leeg; “Iedereen stoppen” staat op de plek van de hoofdactie.
- **Spelers.** Elke speler is een kaart van ruim 120 pixel met drie knoppen, dus vijf spelers passen niet. De verbinding staat als “Verbonden · 40 ms” en “Haperd · 420 ms”: getallen zonder betekenis. “Passief” is een pil bij iedereen, “Eruit zetten” staat rood bij elke ander, dempen en blokkeren zijn twee pictogrammen zonder tekst. Onder de tabrij Spel staat nog een tabrij (Sessie, Spelers), dus Q en E zijn dubbelzinnig (de hint heet “spelers-tab”).
- **In het spel.** De Tab-lijst toont milliseconden en “actief” als losse tekst. De naamplaat is een donker kaartje met alleen de naam (`avatarlabel3d.js`): geen vorm, geen verbinding, geen passief-teken. De kaart toont medespelers al (`mapview.js`, `coopPartners`). In de proefopname waren naamplaten en minikaartmarkeringen niet te beoordelen (de nepsessie heeft geen figuren): dat is op code beoordeeld, nog niet in beeld.
- **Meedoen?** De kaart breekt: “Nee” valt onder “Ja” omdat de titel alle breedte neemt; geen aftelling, niet te zien wie al antwoordde, niet wat het oplevert.
- **Gezamenlijke keuzes.** Een gast kan geen tijdvoorstel doen: “Vraag het aan wie het spel opende” (`coopgroep.js`, `STEM_HOST.gast`). Een ander spel laden is bij wie het spel opende een besluit dat de sessie voor iedereen stopt zonder stem (`cooploadrules.js`). Dat zijn hostrechten, terwijl tijd, laden en cheats gezamenlijke keuzes horen te zijn.
- **Hostwissel.** De vraag en het wachtscherm zijn goed van woorden maar zeggen niet wat er blijft; een onverwachte overname heeft geen eigen melding.
- **Verbindingsverlies.** Eén kaart zonder titelband, drie knoppen zonder rangorde; “Wil je niet wachten? Dan verwijder je Liv” is een kick onder een vriendelijke naam; “Verbinding testen” staat op een moment dat je dat niet zoekt; niet te zien hoe lang het al duurt of wat er met je voortgang gebeurt. Een hervatvenster bestaat niet.
- **Beloning.** Bestaat niet: losse meldingen. Nergens staat wat je verdiende, wat de groepsbonus deed en dat het bewaard is.
- **Praten (#451).** Er is geen plek die chat of voice later opvangt zonder herontwerp.
- **Over alle schermen.** (1) Pillen voor status, filter, stap en keuze: de speler weet niet wat aan te klikken is. (2) Technische getallen en woorden in de hoofdweergave. (3) Lege ruimte naast kaarten die niets te zeggen hebben. (4) Meerdere gele knoppen of geen enkele. (5) Rollen die de speler niet nodig heeft (“gastheer” komt niet voor, “host” ook niet; goed) maar waar de UI de opener toch een eigen paneel geeft.

## 3. Principes

Afgestemd met het Spel-ontwerp ([SPEL-UI-24-11.md](SPEL-UI-24-11.md), branch `ontwerp-spel-24-11`): de tabnaam is **Opslaan en stoppen** (met “en”), de rail, de kopband van Spel (Geld, Gezondheid, Gezocht), de strook **Aandacht** en de bevestigingstaal zijn die van dat ontwerp. Dezelfde vier soorten dingen als het club- en bezitontwerp: status is platte tekst (`ds-z-status`), navigatie een tabrij met onderstreping, een keuze een segment met vinkje (`ds-z-segment`), een actie een knop; de derde actie is een link (`ds-z-link`). Eén gele knop per scherm, op de plek van het volgende doel. Een tussenkop (`ds-z-tussenkop`) zonder misdruk onder de schermtitel (`ds-z-kopband`). Daarbij voor Samen spelen:

1. **Gelijkwaardig, ook op het scherm.** Geen paneel voor “de host”. De opener is “wie het spel opende”, een zin in de onderregel en een regel in de tabel, nooit een knoppenbalk. Het enige extra is “Uit het spel zetten”, als link op het detail van een andere speler, met een zin waarom alleen jij dat kunt. Een gast ziet dezelfde schermen met alleen dat verschil; wat hij niet kan, staat als één grijze zin met de reden en niet als dode knop.
2. **De kamer is een plek.** Zodra er een sessie is, vervangen Spelers, Uitnodigen en Sessie het ene tabblad Samen spelen in één tabrij (geen tweede rij meer). De kopband is die van Spel (titel is het tabblad, rechts Geld, Gezondheid, Gezocht) met de sessie in de eyebrow: “Spel · Zomeravond · 5 van 8 spelers”. Wat er mis is met de sessie staat in de strook **Aandacht** (Liv is weg, Jouw verbinding is matig, Tijn verbindt nog, Gijs staat op Actief); leeg = weg. Wie de sessie kan vinden (Privé of Openbaar) staat op Uitnodigen en Sessie.
3. **Verbinding in gewone woorden.** Drie streepjes en een woord: Goed, Matig, Slecht, Weg (en Verbindt). Nooit milliseconden of ping, NAT of STUN in de hoofdweergave. Bij Matig, Slecht en Weg staat één zin wat het betekent en wat je kunt doen, en of het aan jou of aan de ander ligt. Technische getallen staan alleen achter “Meer details” in de verbindingstest.
4. **Eerlijk over wat naar buiten gaat.** Een tabel “Wie ziet wat”, per partij (medespelers, hulpservers, postbussen, de lijst, wij) wat ze zien en waarom, op het moment dat de keuze valt en in Instellingen. “Wij: niets.” staat er letterlijk. Geen woorden die een speler niet kent in de koppen.
5. **Gezamenlijke keuzes zijn voor iedereen.** Elke speler kan een voorstel doen; het voorstel verschijnt bij iedereen als dezelfde kaart met wie wat zei; geen antwoord is nee; de uitslag staat in woorden bij iedereen.
6. **Voortgang is van jezelf.** Elke kaart die over beloning gaat zegt dat het in jouw eigen spel is bewaard. Wegvallen, wegsturen en stoppen laten je eigen spel ongemoeid.
7. **Kleur is nooit het enige.** Elke speler heeft een vorm en een kleur (de 16 vormen en 8 kleuren van het spel, `VORM_TEKEN`, `PROFIEL_KLEUREN`); verbinding heeft streepjes en een woord; passief heeft een schild en een woord.
8. **Altijd zomer, geen echte merken of personen.** Alle namen verzonnen (Sem, Iris, Tijn, Liv, Gijs); sessienamen volgen het filter.

## 4. Ontwerpmaten

De menu-stage is 1920 ontwerppixels breed en wordt ingezoomd met `--mz = min(h/1080, b/1920)`; in de mockups is dezelfde formule en dezelfde vloer (`--menu-min`, hulptekst nooit onder 13 echte px) nagebootst. Op 1280x720 groeit de hulptekst naar 19,5 stage-px: de strakste maat, hierop is getoetst (de Sessie-tabel kreeg daarom compactere rijen). Het paneel is op alle drie ca. 1440 stage-px breed. Spelerstabel en lijst met openbare sessies scrollen binnen hun vak; kop, tabrij en voet blijven staan. De HUD-mockups staan op een echte schermfoto van het spel (Electron) met de kaartjes op de plekken van de bestaande HUD.

## 5. Per scherm

### a. De structuur van Spel

Zonder sessie: **Overzicht · Samen spelen · Opslaan en stoppen** (zoals nu, met de nieuwe naam). Met een sessie: **Overzicht · Spelers (n) · Uitnodigen · Sessie · Praten (later) · Opslaan en stoppen**; Samen spelen is dan vervangen (dit komt overeen met `a4-overzicht-gast` van het Spel-ontwerp, dat het tabblad Praten niet toont). **Rail, kopband en Aandacht** zijn die van het Spel-ontwerp: geen kop boven een groep van één, tijd rechtsboven, Doorgaan secundair zodra het paneel een eigen gele knop heeft (op Spelers en Sessie is Doorgaan dus geel, in de wachtkamer en op Uitnodigen secundair), een rode ruit bij nieuws en bij Spel het aantal spelers. Dat lost de dubbele tabrij op (#434) en maakt Q en E eenduidig. De rail toont bij Spel het aantal spelers (bestaat al, #435). “Praten · later” is een gestippeld tabblad dat niet te focussen is: de gereserveerde plek (zie r).

### b. Samen spelen starten, `a1-start`

Twee doelen naast elkaar op het eerste scherm, zonder tussenstappen. **Meedoen**: het codeveld staat er al in (Kamercode, de toetsenbordknop in het veld), de knop Verbinden en een link naar de openbare sessies. **Open je spel**: de drie feiten (Zichtbaar: Privé, Spelers: tot 8, Wachtwoord: geen), de gele knop en een link “Instellingen eerst”. De gele knop volgt de focus (heb je een code getypt, dan wordt Verbinden geel). Onder de kaarten drie regels “Zo werkt samen spelen” (één wereld, eigen spel, meedoen is een keuze) en in de voet één zin over wat er naar buiten gaat met een link “Wat precies?” naar de toestemmingstabel. De kopband is die van Spel (titel Samen spelen); wat naar buiten gaat staat in de voet. Waar speel je (Alleen spelen of Samen spelen bij het hoofdmenu, `launchchoice.js`) blijft zoals het is, met bij Samen spelen dezelfde ene zin over wat naar buiten gaat.

### c. Eerste keer en toestemming, `b-eerste-keer`, `j-toestemming`

**Eerste keer** (het spel vraagt dit één keer, op het moment dat de speler Samen spelen kiest): één kaart met links de naam en een voorbeeld van de naamplaat, rechts de tabel “Wie ziet wat als je verbindt” met drie rijen (medespelers, hulpservers, wij). Gele knop Akkoord en doorgaan; secundair Terug naar alleen spelen. **Toestemming bij het verbinden** (`j-toestemming`): dezelfde tabel met vijf rijen: je medespelers (naam, kleur, IP-adres, want een rechtstreekse verbinding kan niet anders), hulpservers (IP-adres en dat je een verbinding zoekt, “zoals elke server die je bereikt”), postbussen (alleen versleutelde berichten), de lijst met openbare sessies (alleen als jij kiest: naam, spelers, versie) en wij (niets). Eronder één regel dat het spel los daarvan openbare gegevens ophaalt (live bussen en treinen) zonder iets over jou, en dat dat uit kan. Vinkje “Niet meer vragen op dit apparaat”. Dit is dezelfde inhoud als `CONSENT_TEXT`, `CONSENT_DETAIL` en `OPENBAAR_TEXT`, in een tabel in plaats van alinea's; het zegt niet meer en niet minder dan de constitutie (punt 4 en 10) toestaat.

### d. Je spel openen, `c1-openen-prive`, `c2-openen-openbaar`, `c3-sessienaam`

Eén scherm, geen drie stappen: de naam komt uit je profiel (de eerste keer gevraagd, zie c). Links één segment **Privé: alleen met de code | Openbaar: in de lijst**, daaronder wachtwoord (niet verplicht) en het maximum (stapper). Bij Openbaar verschijnt de naam van je sessie met de controle bij elke toets, en twee blokken: “Dit staat in de lijst” (naam, aantal spelers en maximum, versie, een willekeurig sessie-id) en “Dit staat er nooit in” (IP-adres, wachtwoord en kamercode, je eigen naam). Rechts “Zo zien anderen het”: een voorbeeldrij in de tabel van de lijst, en de feiten over de lijst (elke 15 seconden, onversleuteld, “Weer privé maken” geeft een nieuwe code). Open je spel is geblokkeerd tot het vinkje “Ik snap dat dit voor iedereen met het spel zichtbaar is” staat, zoals nu. **Sessienaam** (`c3`): drie toestanden van het veld: toegestaan (vinkje), verboden woord (rood, met de zin die al in `schoonNaam` staat), adres of nummer (rood); de reden staat meteen onder het veld. De speler ziet de lijst met verboden woorden nooit, alleen de reden. Vijf ideeën als knop voor wie niets weet (“Zomeravond”).

### e. Meedoen via code of lijst, verbinden, `d1-lijst`, `d2-verbinden`

**Code**: staat op het startscherm (b). **Lijst** (`d1`): een tabel in plaats van pillen: ster (favoriet), Sessie, Spelers (3/8), Wereld (Ontspannen, Standaard, Uitdagend, bestaat al in de lijst), Versie met een woord (“0.66.0 gelijk”, of een waarschuwing “0.65.2 (jij 0.66.0)”). Filter is één segment (Kan meedoen, Favorieten, Alles), sortering één stapper. Rechts het detail van de gekozen rij met de gele knop **Meedoen**; “Melden” heet **Verberg deze sessie** (het verstuurt niets, en dat zegt de regel eronder). Een volle of niet-passende rij is grijs en zegt waarom. **Verbinden** (`d2`): drie stappen als platte regels met vinkje (De kamer zoeken, Contact leggen met Sem, Binnenkomen) en een rasterbalk; vier toestanden met altijd een volgende stap: wachtwoord nodig, code klopt niet, sessie vol.

### f. Je figuur, `e-figuur`

Bij het meedoen (en later bij Instellingen): naam met teller, acht kleuren als vierkante vakjes met hun vorm (de gekozen heeft een vinkje en een dikke rand), Je figuur als segment (Tessa, Tammo, een andere figuur), Kleding als segment (Mijn eigen kleding, Vaste set) en links een voorbeeld: de naamplaat boven het 3D-voorbeeld van de figuur (`vehiclepreview`-achtig, het plaatje in de mockup is een stand-in). Je verhaal blijft Tammo of Tessa; dit gaat alleen over hoe anderen je zien. De voet zegt dat je dit later aanpast.

### g. De wachtkamer, `f1-wachtkamer-opener`, `f2-wachtkamer-gast`

Dezelfde tabbladen als in het spel; het is het tabblad Spelers met een voet die start. Links de tabel Speler, Verbinding en **Klaar** (Klaar, Verbindt, Weg), met één regel waarom starten nog niet kan (“Tijn verbindt nog”). Rechts Nodig vrienden uit: de code groot met Kopieer de code en drie stappen; onder de tabel “Dit kunnen jullie samen” (de positieve lijst uit `SAMEN_KAN_REGEL`). Voet: links **Sessie stoppen** (opener) of **Spel verlaten** (gast) als secundair, rechts de gele **Spel starten** (opener) of **Vraag om te starten** (gast; de regel zegt dat de opener het verzoek krijgt, #642). Het verschil opener en gast zit alleen in de rechterkolom (de gast mag de code ook delen) en in de tekst van de knop.

### h. Spelers, `g1-spelers-opener`, `g2-spelers-gast`, `g3-spelers-verbinding`

Master en detail. De Aandacht-strook bovenaan (Liv is weg, Gijs staat op Actief). Links een tabel (`ds-z-tabel`): Speler (vorm, naam, JIJ, “Opende het spel”), Doet, Waar (plek en afstand met richting), Verbinding (streepjes en woord) en Stand (Passief of Actief). Een speler die weg is, is grijs met een gestippelde linkerrand. Onder de tabel twee blokken: **Jouw stand** (segment Passief | Actief (PvP) met de consequentie in één zin) en **Roepen naar de anderen** (7, 8, 9). Rechts het detail van de gekozen rij: vorm, naam, Doet mee of Opende het spel, de verbinding met de uitleg bij Matig of Slecht, de acties **Ga erheen** en voor wie het spel opende **Spel overdragen**, het segment **Alleen voor jou: Gewoon | Gedempt | Geblokkeerd** en voor wie het spel opende de link **Uit het spel zetten** (met “Zeker weten?” zoals nu). Een gast ziet in plaats daarvan één grijze zin: spelers verwijderen kan alleen wie het spel opende. `g3`: jouw eigen verbinding is matig: een Aandacht-regel bovenaan en rechts “Wat de woorden betekenen” (Goed, Matig, Slecht, Weg met één zin en één tip), plus de link Verbinding testen met wat de test doet. De verbindingsniveaus komen uit de bestaande `lag` en `lost` (open punt 3).

### i. Uitnodigen en Sessie, `h1`, `h2`, `i1`, `i2`

**Uitnodigen**: de code groot met de gele **Kopieer de code**, drie stappen (“Je vriend kiest Spel, Samen spelen, Meedoen”), rechts wie er al is met zijn verbinding. Is de sessie openbaar, dan zegt het scherm dat vrienden hem in de lijst vinden en dat een gast de kamercode zelf niet kent (alleen wie het spel opende kent hem); de opener heeft er **Weer privé maken** bij. **Sessie**: links wat is ingesteld (naam, zichtbaarheid, maximum, wachtwoord) en een tabel **Hoe jullie samen kiezen** (zie n); rechts **Dit deden jullie samen**, het logboek van de sessie, en de zin dat je voortgang en geld in je eigen spel staan. Wie het spel opende kan de instellingen wijzigen, want de sessie draait op zijn computer; een gast ziet ze met een slotje en de zin dat dit zo is door de techniek, niet door een recht. Onderaan **Stel voor om te stoppen** (opener: een voorstel aan de groep) of **Spel verlaten** (gast).

### j. In het spel: Tab, naamplaten, minikaart, kaart, `k1-hud-tab`, `k2-kaart`

De **Tab-lijst** (bovenin, zolang Tab of R3 vast is): per speler vorm en kleur, naam, Doet, afstand, verbinding (streepjes en woord, geen ms) en een schild of zwaard. **Naamplaten** boven de figuur: vorm en kleur in een cirkel, de naam; op afstand kleiner en doorzichtiger; matige verbinding krijgt een klein streepjes-icoon, een speler die weg is een gestippelde rand en “weg”. De rest van de plaat blijft rustig: geen status die je moet lezen terwijl je loopt. **Minikaart**: elke speler zijn eigen vorm en kleur; buiten beeld wijst een pijl met zijn vorm naar hem; wie weg is, staat als holle vorm op de laatste plek. **Kaart (M)**: dezelfde vormen met naam, links de kaart en rechts de lijst met Ga erheen; S verbergt of toont spelers. Jouw route zien anderen niet. Alleen op het stilstaande beeld uitgewerkt; niet in beweging bekeken.

### k. Meedoen?, `l1-meedoen-gast`, `l2-meedoen-opener`

Eén kaart onderin: titelband “Meedoen?”, de vraag (“Meedoen met Race naar het Hoofdstation?”), één zin wat het oplevert (“Sem begint hem. Je krijgt de volledige beloning en je eigen verhaalstap. Geen antwoord: je kijkt mee.”), een aftelbalk met seconden, wie al antwoordde (vinkje, zandloper, kruis met naam) en de knoppen **Ja (J)** geel en **Nee (N)** secundair op één regel. Wie de activiteit startte ziet geen knoppen maar “Nu beginnen” (secundair) en dezelfde antwoordregel; het begint vanzelf als iedereen antwoordde of de tijd om is. Een late speler krijgt één zin dat hij niet halverwege kan aansluiten (race, golfronde, dienst, `LATE_GRENS`) en dat het spel het bij de volgende weer vraagt. Verplichte opdrachten (`presence 'beide'`) tonen geen knoppen maar één zin.

### l. Gezamenlijke keuzes, `m-stemming`

Eén kaart, vier toestanden, voor iedereen gelijk: **voorstel doen** (op een bed of bij het kaartmenu: “Slapen tot 07:00? ... [Stel voor (E)]”; alleen op een sessie van één gebeurt het meteen), **stemmen** (titelband “Samen kiezen”, wie het voorstelde, aftelbalk, wie al stemde, Ja (J) geel en Nee (N) secundair; de voorsteller telt als ja en ziet geen knoppen), **uitslag akkoord** en **uitslag niet akkoord** (“Tijn zei nee. Er verandert niets. Een nieuw voorstel kan over een minuut.”). Regels per soort (de tabel staat ook in Sessie):

| Keuze | Wie stelt voor | Wie stemt | Gevolg |
|---|---|---|---|
| Slapen, tijd verzetten, reizen met tijdverlies | iedereen | iedereen die verbonden is; wie wegvalt telt niet mee | de tijd springt voor iedereen |
| Een ander spel laden | iedereen (als je alleen je eigen spel verlaat, is dat een eigen keuze) | iedereen | de sessie stopt voor iedereen; ieder zijn eigen voortgang bewaard |
| Iedereen stoppen | iedereen | iedereen | de sessie stopt; iedereen terug in zijn eigen spel |
| Politie en verkeer (moeilijkheid van de wereld) | iedereen | iedereen | de wereld verandert voor iedereen |
| Cheats en testmenu | niemand | nvt | staan uit zolang jullie samen spelen (blijft; open punt 5) |
| Pauzeren | jezelf | nvt | je menu stopt alleen jouw invoer; anderen zien “Pauzeert” |

Een stemming duurt 10 seconden (`STEM_SEC`), geen antwoord is nee, er loopt er één tegelijk, een voorstel dat is afgewezen kan pas na een minuut opnieuw (nieuw, tegen herhalen). Het gedrag voor gasten (voorstellen) is nieuw: nu stuurt de gast een bericht dat de opener ziet, zoals bij `moeilijkheidverzoek`.

### m. Hostwissel, `n-hostwissel`

Vier kaarten in dezelfde stijl: **de vraag** aan wie het spel moet overnemen (J of N, 20 seconden, zonder antwoord is het nee, met de zin wat blijft: tijd, weer, voortgang), **even wachten** voor iedereen met een tijdbalk (alleen de oude opener kan stoppen), **klaar** voor iedereen (“Iris heeft nu het spel. Tijd, weer, verkeer en je opdracht zijn gelijk gebleven.”) en **onverwachte overname** (“Sem is weg: Iris neemt het over”, na 12 seconden stilte). Altijd de naam van wie het spel nu heeft; nooit “host”.

### n. Verbindingsverlies en hervatten, `o1-weg-jij`, `o2-weg-ander`, `p-hervat`

**Jij raakt weg** (`o1`): titelband “Je verbinding is weg”, de zin dat je eigen spel veilig is (geld en voortgang net bewaard), een tijdbalk met “poging 2 van 5”, de uitleg wat er gebeurt als het niet lukt (terug naar je eigen spel, precies waar je was), de gele **Opnieuw verbinden**, secundair **Terug naar mijn eigen spel** en een link Verbinding testen. **Een ander valt weg** (`o2`): een kleine melding rechtsboven (“Liv is weg. Het spel gaat door.”) en, alleen als de activiteit hem nodig heeft, de kaart **Wachten op Liv** met een tijdbalk en de knop **Nu zonder Liv verder**; na 30 seconden gaat het vanzelf verder. Liv blijft in de sessie en kan de volgende keer meedoen; verwijderen is iets anders en blijft alleen aan wie het spel opende (Spelers). **Hervatten** (`p`): “Je bent weer verbonden”, hoe lang je weg was, wat ondertussen gebeurde in twee regels (je hebt niets gemist: wie niet antwoordt kijkt mee), de gele **Verder spelen** en **Naar de anderen toe (B)**.

### o. Beloning en voortgang, `q-beloning`

Na een gezamenlijke activiteit één kaart: links de **Uitslag** (plek, vorm, naam, tijd; wie niet meedeed staat in één zin: “keken mee, geen beloning, niets verloren”), rechts **Voor jou** als bon: beloning, de groepsbonus (“Samen gedaan, 3 spelers (×2)”, de 1+1=3-regel van `groepsbonus.js`), verdiend, loopbaanpunten en “Je verhaal: ongewijzigd”; daaronder dat het in jouw eigen spel is bewaard en dat je alleen je eigen bedrag ziet. Gele **Doorgaan**, secundair **Nog een keer voorstellen** (een voorstel, zie l). Wedstrijden belonen per plek; een opdracht zonder uitslag toont alleen de bon. Het logboek van de sessie (Sessie) herhaalt de activiteiten zonder bedragen.

### p. Praten, `r-praten` (#451, alleen een plek)

Er wordt niets gebouwd. Het ontwerp reserveert drie plekken: een gestippeld tabblad **Praten · later** (niet te focussen), een stem-slot in de rij van de spelerslijst en een leeg plekje naast de naam in de naamplaat. Het scherm zegt wat vaststaat: opt-in (standaard uit), dempen en blokkeren per speler (zoals nu, ook na een hostwissel), niets wordt opgeslagen, het spel is 18+. De vaste zinnen en emotes van #1159 blijven. Bij Instellingen staat een uitgegrijsd vinkje “Chat en voice gebruiken”.

### q. Instellingen, Samen spelen, `s-instellingen`

Links **Zo zien anderen je**: naam, voorbeeld van de naamplaat, kleur en vorm als segment, snelle zinnen. Rechts **Wat het spel naar buiten stuurt**: vier regels (Alleen spelen: niets over jou; Samen spelen: je IP-adres naar medespelers en hulpservers, akkoord staat aan; Openbare lijst: alleen als jij kiest; Live bussen en treinen: openbare gegevens zonder iets over jou, uit te zetten), de knop **Akkoord intrekken** en de link Wat precies?. De kopband zegt “Akkoord: Gegeven”.

### r. Bevestigingen, `v-bevestig`

Dezelfde taal als het Spel-ontwerp ([SPEL-UI-24-11.md](SPEL-UI-24-11.md) hoofdstuk 5c en 6): een kaart met de vraag, een rij **Je verliest** en een rij **Blijft**, de veilige keuze geel met de focus (“Nee, laat hem”), het onomkeerbare rood met **Houd vast om … (Enter)** (600 ms, zoals `tweedruk.js`). Gebruikt voor: **Uit het spel zetten** (alleen wie het spel opende; vervangt het “Zeker weten?” op dezelfde knop), **Weer privé maken** (de oude code werkt niet meer), **Akkoord intrekken** en, zonder vasthouden omdat er niets onomkeerbaars gebeurt, **Het spel verlaten** door wie het spel had (“Iris neemt het spel over”; Ja is secundair, Nee blijft de veilige gele). Spel verlaten door een gast heeft geen bevestiging: er gaat niets verloren.

### s. Toestanden en bediening, `t-toestanden`, `u-bediening`

Elke toestand een kaart met een volgende stap: lijst laden (rasterbalk, `aria-busy`), geen openbare sessies, de lijst komt niet binnen, je bent nog alleen, andere versie, je bent uit het spel gezet (“Sem heeft je uit de sessie gezet. Je speelt weer je eigen spel; je voortgang is bewaard”), offline, de sessie is gestopt, toestemming ingetrokken. Bediening: Q en E wisselen tab (LB en RB), pijlen kiezen de rij, Enter opent de acties, Esc is B; J en N zijn A en B bij een vraag; Tab (R3) toont de lijst; 7, 8 en 9 roepen (radiaal). Vragen met een tijd nemen de focus pas als je een knop indrukt.

## 6. Componenten

Hergebruikt van DS3 en van de gedeelde set van het club- en bezitontwerp (`game/js/ds-components.css` op `club-ui-24-11` en `bezit-ui-24-11`): `ds-z-kopband`, `ds-z-status` (`--blok`, `--goed`, `--probleem`, `--zacht`), `ds-z-segment` (`--blok`, `--klein`), `ds-z-stapper`, `ds-z-tussenkop`, `ds-z-link`, `ds-z-tabel`, `ds-z-kaart` (`__kop`, `--recht`, `--probleem`), `ds-z-knop` (primair, `--secundair`, `--toets`), `ds-z-toets`, `ds-z-bon`, `ds-z-waarde`, `ds-z-leeg`, de tokens `--ds-c-*`, `--ds-lijn-*`, `--ds-schaduw-hard*` en de menuvloer `--menu-min`. Er zijn geen varianten van die componenten gemaakt.

Nieuw (alleen tokens, geen hex; in `mock.src.css`, bij het bouwen naar `game/js/ds-samen.css`; de generieke naar `ds-components.css`):

| Component | Doel | Generiek? |
|---|---|---|
| `mp-sig` (+ `--goed`, `--matig`, `--slecht`, `--weg`, `--bezig`) | verbinding: streepjes en woord | ja, `ds-z-signaal` |
| `mp-vorm` (+ `--s`, `--l`, `--weg`) | spelersvorm en -kleur uit de profielvormen | Samen spelen |
| `mp-naamplaat` | naam boven een figuur (wereld; textuur, geen UI-kleur) | Samen spelen |
| `mp-tabel` | kader om `ds-z-tabel` met rijen voor spelers, weg gestippeld | ja, `ds-z-tabel--kader` |
| `mp-menu` | acties achter een knop (vervangt de drie knoppen per rij; alleen als het detail te krap is) | ja, `ds-z-menu` |
| `mp-code` | de kamercode groot | Samen spelen |
| `mp-wie` | de tabel “Wie ziet wat” | Samen spelen |
| `mp-keuze`, `mp-hero`, `mp-blok`, `mp-notitie`, `mp-feiten` | kaarten op het scherm | `mp-notitie` en `mp-feiten` zijn al generiek (`vb-notitie`, `bz3-feiten`) |
| `mp-input` (+ `--ok`, `--fout`) | invoer met teller en reden | ja, `ds-z-invoer` |
| `mp-tijd`, `mp-stemmen` | aftelbalk en wie antwoordde | Samen spelen |
| `hudkaart` (+ `--kop`) | kaart met titelband in de HUD (stand-in voor `ds-z-kaart`) | nee, bestaat als `ds-z-kaart` |
| `mp-gereserveerd` | de gestippelde plek voor chat en voice | Samen spelen |

## 7. Toestanden, toetsenbord en controller

Per scherm: **laden** (rasterbalk met `aria-busy`, geen spinner), **leeg** (woord en één actie), **fout** (probleemkaart met de zin dat je eigen spel veilig is en een knop Opnieuw), **op slot** (alleen als een recht niet bestaat, met de reden). Bediening: menu-patroon (Q/E tab, pijlen, Enter of A, Esc of B) en voor vragen J/N (A/B); één focusring; alle doelen minstens 44 px; met “Beweging beperken” springt de onderstreping. De Tab-lijst en de naamplaten tonen nooit een IP-adres of een code; de kamercode staat alleen op Uitnodigen en in de wachtkamer. Een directe (IP-)route blijft zoals nu achter “Meer acties” in de wizard, zonder IP in beeld.

## 8. Samen spelen (de zes vragen)

Dit ontwerp is de Samen-UI zelf; per onderdeel:

| Vraag | Antwoord |
|---|---|
| Van wie is het? | De schermen zijn van de speler zelf; de sessie en de wereld zijn van wie het spel opende, en die rol wisselt. De instellingen van de sessie (naam, zichtbaar, maximum, wachtwoord) wijzigt alleen wie het spel draait, want het is zijn computer; dat geeft geen ander recht. |
| Doet een gast mee? | Elke gast ziet dezelfde schermen. Verschillen: geen Uit het spel zetten, geen Spel overdragen aanbieden, Vraag om te starten in plaats van Spel starten, instellingen met slotje. |
| Wat ziet een gast? | Alles uit snapshot en EXTRA-berichten zoals nu; nieuw is alleen de weergave (verbinding in woorden, Klaar, logboek, beloningskaart). |
| Wie krijgt beloning en voortgang? | Per speler, zoals nu (#429, `coopbeloning.js`): iedereen die meedoet de volledige beloning en de eigen verhaalstap; de kaart toont alleen je eigen bedrag. |
| Wat als iemand wegvalt of later aansluit? | Wegvallen: melding en, alleen als nodig, de wachtkaart met Nu zonder … verder; verwijderen is aan wie het spel opende. Later aansluiten: kijkt mee bij een lopende activiteit; krijgt Meedoen? bij de volgende. Hervatten: kaart met wat je miste. |
| Welke test dekt het? | Bestaand: `multiplayerwizard_test`, `playercards_test`, `lobby_test`, `coopui_test`, `coop/groep_test`, `difficultyvote_test`, `lobbyui_consent_test`, `coopui_test`, `multiplayerflow_meet`. Nieuw: `samen_ui_test.mjs` (HTML van de viewfuncties: kamer, spelers, toestemmingstabel, kopband; geen IP, geen jargon, geen milliseconden in beeld), `samen_stem_test.mjs` (voorstel door een gast, uitslagen, geen antwoord is nee, wegvallen telt niet mee), `samen_beloning_test.mjs` (de kaart toont alleen eigen bedrag en de groepsbonus), een testbankstap met twee instanties (`gastkant`) voor de kamer en Meedoen?. |

Regel voor de changelog: “Samen spelen heeft nu één kamer: Spelers, Uitnodigen en Sessie in één rij, de verbinding in gewone woorden (Goed, Matig, Slecht, Weg), een toestemming die per partij zegt wat er naar buiten gaat, en een beloningskaart na elke gezamenlijke activiteit. Iedereen kan voorstellen om te slapen, de tijd te verzetten of te stoppen; iedereen stemt.”

## 9. Wat het bouwen kost

Fase 2, zes stappen met elk een eigen commit en test:

1. **Componenten**: nieuw `game/js/ds-samen.css` (uit `mock.src.css`), de gedeelde set uit club- en bezitbranch via de merge, de galerij `game/ds-galerij.html`; nieuw `game/js/samensignaal.js` (puur: niveau uit `verbinding` en ms, de woorden en de uitleg per niveau). Tests: `ds_tokens_test`, `samen_signaal_test`.
2. **De kamer** (`pausemenu.js` tabrij, `samenpanel.js`, `lobbyui.js`, `multiplayerwizardui.js`, `coopspelersui.js`, `playercards.js`, `playerstatus.js`): één tabrij, Spelers als tabel met detail, Uitnodigen en Sessie nieuw, de wachtkamer met Klaar; `multiplayerwizard.js` krijgt Open je spel als één scherm. Test: `samen_ui_test.mjs`, `multiplayerwizard_test`, `playercards_test` aanpassen, `multiplayerflow_meet` met nieuwe scenes.
3. **Toestemming en eerste keer** (`onlineconsentui.js`, `onlineconsent.js`, `launchchoiceui.js`, Instellingen, `lobby.js` teksten): de tabel “Wie ziet wat”. Test: `lobbyui_consent_test`, `coopui_test`.
4. **HUD** (`coophud.js`, `coopmeedoen.js`, `coophold.js`, `coopoverlay.js`, `multiplayerhostwisselui.js`, `avatarlabel3d.js`, `mapview.js`, minikaart): Meedoen?, wachtkaarten, hostwissel, naamplaat met vorm, kaartmarkering. Test: `coopui_test`, `coop/hostwissel_test`.
5. **Gezamenlijke keuzes** (`coopgroep.js`, `coopnet.js`, `cooploadrules.js`, `difficultyvote.js`): een gast kan voorstellen (bericht naar de opener, zoals `moeilijkheidverzoek`; `PROTO` blijft), laden als voorstel. Test: `samen_stem_test.mjs`, `coop/groep_test`.
6. **Beloning** (nieuw `game/js/samenbeloning.js` bij `coopbeloning.js` en `groepsbonus.js`; de kaart): Test: `samen_beloning_test.mjs`.

Samen: ca. 5 nieuwe en 14 herschreven bronbestanden, 1 nieuw CSS-bestand, 3 nieuwe tests en 6 aangepaste. Niet in dit werk: het netwerkprotocol, chat en voice (#451), dedicated servers (#450), geluid en nieuwe spelregels.

## 10. Wat nog niet is besloten

0. **Afgestemd met het Spel-ontwerp.** De tabnaam is Opslaan en stoppen; rail, kopband (Geld, Gezondheid, Gezocht), Aandacht en bevestigingen volgen dat ontwerp. Eén verschil: dit ontwerp toont in een sessie een gestippeld tabblad **Praten · later** als gereserveerde plek (#451); het Spel-ontwerp (`a4`) toont dat niet. Eén van beide, voor beide ontwerpen.

1. **Eén tabrij.** Spelers, Uitnodigen en Sessie vervangen Samen spelen zodra er een sessie is (hoofdstuk 5a). Dat wijkt af van #434 (Sessie en Spelers als tweede rij) en #530 (Spelers ook zonder sessie voor het profiel; het profiel staat nu bij Instellingen, Samen spelen en bij Je figuur).
2. **Een gast mag voorstellen.** Tijd, laden, stoppen en de moeilijkheid van de wereld: nu alleen wie het spel opende. Dit vraagt een bericht van de gast naar de opener (zoals `moeilijkheidverzoek`); `PROTO` en `CODEC_VERSION` blijven 2 als het een JSON-bericht is.
3. **Verbindingsniveaus.** Nu zijn er `ok`, `lag` en `lost`. Voorstel: Goed (onder 150 ms, geen verlies), Matig (150 tot 350 ms of af en toe een gemiste update), Slecht (boven 350 ms of merkbaar verlies), Weg (geen contact, `lost`). De drempels meet de coördinator met een echte sessie; ze staan nu nergens vast.
4. **Wie telt mee bij een stem.** Nu is iedereen die niet antwoordt “nee”: één speler die afwezig is, blokkeert slapen. Voorstel: wie wegvalt telt niet mee (bestaat al); of wie 60 seconden geen invoer gaf ook niet. Of meerderheid in plaats van iedereen, blijft een keuze van de eigenaar.
5. **Cheats.** Nu uit zolang er anderen zijn (`CHEATS_UIT_TEKST`); de spec noemt ze een gezamenlijke keuze. Voorstel: laten zoals het is tot iemand erom vraagt, en dan een stem “cheats aan voor deze sessie”.
6. **Instellingen van de sessie.** Openbaar, maximum en wachtwoord kan alleen wie het spel draait (technisch); een gast kan het alleen vragen. Is een voorstel-knop voor de gast nodig?
7. **Nu zonder Liv verder.** Door iedereen (voorstel) of door een stem? Nu is “Niet wachten” het verwijderen van de speler door wie het spel opende. Het ontwerp scheidt verder gaan (activiteit zonder Liv) en verwijderen (alleen opener).
8. **Beloningskaart.** Eigen bedrag alleen, of ieders? Voorstel: alleen eigen bedrag, ieders plek; geld is privé (constitutie 4 raakt dit niet).
9. **“Melden” wordt “Verberg deze sessie”** (het verstuurt niets). Is een echte melding aan de eigenaar later gewenst? Dat vraagt een bestemming buiten de repo (constitutie 4).
10. **Spel overdragen door een gast.** Nu biedt alleen wie het spel opende het aan. Gelijkwaardig zou zijn: iedereen kan vragen of een ander het wil overnemen. Niet uitgewerkt.
11. **Beeldmateriaal.** De naamplaat en de minikaart zijn alleen op een stilstaand beeld uitgewerkt; hun gedrag in beweging (afstand, vervagen, pijlen buiten beeld) is nog niet bekeken. Het pausemenu-kader en de rail zijn nagebouwd; de toets in het echte menu gebeurt in fase 2. Een echte sessie met meerdere spelers is niet bekeken: de “Nu”-beelden van de spelerslijst en het wachtscherm komen uit een nepsessie.
12. **Taal.** “Wie het spel opende” blijft de enige term voor de opener (nooit “gastheer” of “host”); “kamer” blijft het woord voor de plek, “lobby” komt niet voor. De tabel “Wie ziet wat” gebruikt “hulpservers” en “postbussen” voor STUN en de brokers; de eigenaar kan een betere naam kiezen.
