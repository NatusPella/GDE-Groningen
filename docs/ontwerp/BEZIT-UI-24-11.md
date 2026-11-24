# Land en bedrijf (Bezit): ontwerp (fase 1, 24-11)

Status: ontwerp, nog niet gebouwd. Geen spelcode gewijzigd. Aanleiding: feedback eigenaar 24-11 (maak eerst een design voor het bedrijfsonderdeel in het escape-menu, met alle subschermen, daarna pas bouwen). Mockups: `docs/ontwerp/bezit-ui-24-11/` (`bouw.mjs` maakt de schermen, `mock.src.css` bevat de voorgestelde nieuwe componenten, `schiet.mjs` neemt de beelden, `index.mjs` bouwt de vergelijkingspagina). De pagina zelf, de beelden van de huidige schermen en de beelden van het ontwerp staan lokaal in `.scr/bezit-ontwerp/` (niet in git): open `.scr/bezit-ontwerp/index.html`. Alle namen, plaatsen en bedragen in de mockups zijn verzonnen voorbeelden.

Raakt: het onderdeel Land en bedrijf van `pausemenu.js` (tabs Overzicht, Boerderij, Bedrijven, Te koop, Snackwagen, Club), `bezitui.js`, `boerderijui.js`, `snackui.js`, `holdingcards.js`, `holdingsmodel.js`, de kop van Spullen (`spullen.js`) en Garage (`garageui.js`). De inhoud van de tab Club is het ontwerp van de club-agent ([CLUB-UI-24-11.md](CLUB-UI-24-11.md), branch `club-ui-24-11`); hier staat alleen het kader en wat beide ontwerpen delen (hoofdstuk 5).

## 1. Wat een speler hier wil

Zoals bij Farming Simulator, Two Point Hospital en Football Manager gaat het om vier vragen, in deze volgorde: (1) hoe staat het ervoor (geld, waarde, wat levert het per dag), (2) wat vraagt nu mijn aandacht, (3) hoe gaat het met een ding dat ik bezit (veld, pand, wagen), (4) wat kan ik erbij kopen en wat levert dat op. De kop beantwoordt 1, de strook "Nu te doen" 2, het Overzicht 3 en Te koop 4. Elke tab heeft één gele knop op de plek waar het volgende doel ligt.

## 2. Review van de huidige schermen

Alle schermen zijn in Electron gerenderd (1920x1080, wegwerpprofiel, een leeg spel en een spel met vijf gekochte percelen). De beelden staan op de vergelijkingspagina naast het ontwerp. Wat er al goed is: Spullen en Garage (raster, groot voorbeeld, één gele knop), de reden in een knop die op slot staat ("Je mist nog €…", `holdingButton`), de uitleg achter één info-knop (`sectionCard`), de veldiconen en kleurtaal (`farmstatus.js`: braak, stoppel, geploegd, zaailing, groeiend, rijp, met letter en patroon) en `attentionPoints` in `holdingsmodel.js` (aandachtspunten met een prioriteit).

**Overzicht.** Weet ik wat ik moet doen? Nee. Bovenaan staan vijf tegels met bijna alleen nullen (Percelen 5, Panden 0, Opbrengst per dag €0, Loon per dag €165), dan de regel "5 percelen liggen braak", een nieuwsblok met "Geen nieuws", en dan een kaart Percelen met vier filterchips, negen knoppen (Zaai alles, Oogst alles, Zelf werken, Verpachten, Personeel, Verzeker, Zeg op, Bestrijd mieren, Haal wespennest weg) die allemaal op slot staan tot je iets aanvinkt, en dan pas de lijst met een Route-knop per rij. De volgende stap ontbreekt, de kaart ontbreekt en het geld dat het oplevert is een tegel met een nul. "Land en bedrijf" staat drie keer op het scherm (titel, eyebrow, rail) en "Overzicht" twee keer (tab en kop).

**Overzicht, nog niets in bezit.** Eén smalle kaart links met een gele knop; de rest van het scherm is leeg. De eerste stap staat er wel, maar niet wat het kost en wat het oplevert, en niet wat daarna komt. Het lege nieuwsblok ("Geen nieuws: het land is rustig") staat even prominent als de eerste stap.

**Boerderij.** Onder de tabs staan zeven pillen (Werk, Percelen, Erf, Gewas, Machines, Kasboek, Bank), en de vijf stappen in de kaart "Nu: Ploegen" (Ploegen, Zaaien, Groeien, Oogsten, Afleveren) zijn óók pillen. Wat is navigatie, wat is een stap, wat is een keuze? Een grote knop "Uitleg percelen" is het opvallendste element. Eén veld heet drie keer hetzelfde ("Akker De Zonnehoek" in de kaart, in de gele knop en in de veldkaart). De acties van een perceel ("Koop €4.600 Huur €55 per dag Huur €327 per week Zet op kaart") lijken platte tekst. De veldfoto's zijn lege vakken. De inhoud wordt afgesneden op het tweede veld. Het land zelf staat op twee plekken: percelen van de Zonnehoek (Boerderij) en gekochte percelen (Overzicht), met verschillende knoppen.

**Bedrijven.** Vier kaarten met dezelfde groene band: Jouw bedrijven (0), een verwijzing naar Snackwagen, In de buurt, Woningen in de buurt. Wat je bezit en wat je kunt kopen staat door elkaar. Een pand heeft alleen onderhoud en waarde; omzet, kosten, personeel, klanten en tevredenheid ontbreken, terwijl dat is wat een eigenaar wil weten.

**Te koop.** Tien percelen in een lijst met kadastrale codes tussen haakjes (K6899), zonder kaart en zonder vergelijking. Op elke rij staat een gele Koop-knop (drie of meer gele knoppen tegelijk, plus de gele Doorgaan in de rail). Een bevestiging is een zin in de rij ("Voor €5.450? Je houdt €12.550 over. Ja Nee") die de naam over vier regels breekt. Wat een koop oplevert staat nergens.

**Snackwagen.** Vier tegels ("Reputatie 50 van 100", "Snackimperium 5 van 100", "Standplaatsen 0 tegen 4 van Us Mem", "Wagens 0"), vier alinea's uitleg, en met een wagen een rij van acht knoppen met "Af:" en "Op:" voor het menu, plus zes knoppen voor uren en prijs (-1 uur, +1 uur, Korter, Langer, Lager, Hoger). Er is geen dagomzet, geen urenbalk, geen menu als raster en geen kaart van de standplaats. Een knop met een slot toont de reden pas bij nader inzien.

**Club.** Eén lange zin zonder iets om aan te klikken. Met een carrière komt er een shirt-editor onder een rij tegels; de rest van het clubwerk staat in het voetbalmenu.

**Spullen en Garage.** Het beste van de sectie, maar de kop wijkt af van Land en bedrijf: een titel met een eyebrow die de cijfers draagt, filters als pillen, geen waardeplaatjes en geen tabs op dezelfde plek. De kop van de drie Bezit-onderdelen is dus drie verschillende koppen.

**Over alle schermen.** (1) Statusbadges, filterchips, stappen en tabs zijn allemaal dezelfde pil, dus de speler weet niet wat je kunt aanklikken. (2) Elke tussenkop is een groene band met de rode misdruk: vier tot zeven per scherm, dus er is geen niveauverschil. (3) Getallen staan dubbel: prijs in de feitenregel en in de knop, het aantal in de kop en in de tab, het geld op elk scherm. (4) Er is geen kaart. (5) Lege ruimte rechts, afgesneden inhoud onderaan: een kolom van 700 px in een paneel van 1440. (6) Tekstmuren op Snackwagen en Club. (7) Meer dan één gele knop op een scherm.

## 3. Principes

1. **Vier soorten dingen, vier uiterlijken** (gelijk aan het clubontwerp). Status is platte tekst met icoon en woord, zonder rand, schaduw of pil (`ds-z-status`). Navigatie is een tabrij met onderstreping. Een keuze is een segment, rechthoekig en aan elkaar, gekozen is bordgroen met een vinkje (`ds-z-segment`). Een actie is een knop met harde schaduw; ghost-knoppen zijn weg, de derde actie is een onderstreepte link met pijl (`ds-z-link`).
2. **Eén gele knop per scherm**, bij het volgende doel: Overzicht heet "Naar het veld" (of de eerste koopstap bij een leeg bezit), Velden "Oogsten" of "Bel de dierenarts", Team "Aannemen", Bedrijven "Uitbreiden", Te koop "Kopen", Snackwagen "Verleng". De strook "Nu te doen" is navigatie en krijgt dus geen gele knop.
3. **Gevolg vóór de keuze.** Onder een knop die geld kost staat wat het kost, wat je overhoudt en wat het per dag oplevert; bij een keuze (Zelf, Personeel, Verpacht) staat het bedrag per dag in elk segment.
4. **Elk getal één keer per scherm**, op zijn eigen niveau. De kop draagt geld, totale waarde, dagbedrag en aandacht; een kaart draagt zijn eigen aandeel; het detail voegt iets toe en herhaalt niets. De uitleg staat achter één info-knop, niet in alinea's.
5. **Een kaart waar land is.** De velden staan op een kaartje met de bestaande kleurtaal (raster = braak, geel = groeit, bordgroen = oogstklaar, streeprand = verpacht) en altijd een letter erbij (B, G, O, V). Kleur is nooit het enige.
6. **Twee niveaus van koppen** (gelijk aan het clubontwerp): de schermtitel en de kaartkop op de bordgroene band houden de rode misdruk; een tussenkop binnen een blok is bordgroen in kleine hoofdletters, zonder schaduw (`ds-z-tussenkop`). Kaartkoppen alleen waar een kaart een eigen onderwerp heeft.
7. **Indeling in plaats van lege breedte.** Master en detail: links een lijst met een kaart, rechts het detail met een hero (de gele actie), daaronder blokken. Lijsten en het detail scrollen binnen hun vak met de DS3-scrollbalk (`ds-scroll`), de kop en de strook blijven staan.
8. **Altijd zomer.** Geen maanden en seizoenen: de seizoensbalk van een gewas heet "groeifasen" (Zaaien, Kiemen, Groeien, Rijp, Oogsten) met een dagtelling. Geen echte merken: alle voorbeelden zijn verzonnen (Tam & Tes, SC Ommelanden).

## 4. Indeling per scherm

Alle schermen delen de **kopband**: eyebrow "Bezit", de titel Land en bedrijf, en rechts vier waardeplaatjes (`ds-z-waarde`): Geld, Totale waarde, Per dag (met de misdruk alleen als het verandert) en Aandacht (rood, het aantal dingen dat aandacht vraagt). Eronder de **tabrij** (Q en E wisselen; een getal per tab en een rode ruit bij een tab met iets dringends) en de **strook "Nu te doen"**: hoogstens drie klussen met een dringendheid, elk één groot doel ("Zieke kudde bij Eenrum", "Dierenarts €120 · 14 koeien") met een pijl, en "+n meer" dat de rest opent. Dringendheid is vorm, woord en kleur: NU (rood, alleen voor schade: zieke kudde, loon dat niet betaald kan worden), VANDAAG (geel streepje: kan nu, levert iets op), LATER (gestippeld: wacht, bijvoorbeeld "groeit nog 3 dagen"). Bron: `attentionPoints` plus de vergunning van de snackwagen, onderhoud en huurders. Spullen en Garage gebruiken dezelfde kopband zonder strook; hun tabs en filters worden tabs en stappers.

**a. Overzicht** (`overzicht.html`). Links vier portfoliokaarten in een raster van twee bij twee: Boerderij en land, Bedrijven, Snackwagen, Club. Elke kaart heeft een kaartminiatuur (de omtrek van de percelen of de plek van het pand, met de kleurtaal), statuslabels (1 oogstklaar, Zieke kudde, 1 braak), drie feiten (aantal, per dag, waarde), een lijntje over zeven dagen met "+5% t.o.v. gisteren" en "Open"; de hele kaart is klikbaar en opent die tab. Rechts een smalle kolom: **Volgende stap** (bordgroene kaart met de gele knop), **Gisteren per bron** (een bon die optelt tot het dagbedrag in de kop) en het nieuws van het land (één regel; het blok verdwijnt als er niets is). De negen bulkknoppen en de perceellijst verhuizen naar Boerderij.

**b. Leeg** (`leeg.html`). "Nog niets in bezit" met één zin waarom het loont, daaronder drie stappen als kaart met een beeld: 1 Koop een perceel (gele knop, "Vanaf €2.400 · levert ± €14 per dag"), 2 Koop een pand, 3 De snackwagen (op slot, met de reden "komt later in het verhaal"). Zonder bezit blijft alleen het geld in de kop staan en vervalt de strook (geen nullen).

**c. Boerderij** (`velden.html`, `bulk.html`, `vee.html`, `team.html`). Een segment onder de tabs: **Velden | Team | Machines | Erf en opslag | Kasboek** (nu zeven; Werk gaat op in Velden en de strook, Percelen is Velden, Gewas is een blok in het veld, Bank gaat naar Kasboek).
- *Velden*: links de kaart (540x184) met legenda en daaronder de lijst met een vinkvak, een veldicoon, naam, een regel (ha, gewas, gebruik) en rechts de stand of het groeipercentage; sorteren met een stapper. Rechts het detail: naam en stand, een **hero** met de groeifasen (vinkjes, nu = geel, volgende gestippeld) en de gele **Oogsten** met de opbrengst, daaronder blokken **Wie werkt hier** (Zelf, Personeel, Verpacht als segment, met het bedrag per dag erbij), **Volgend gewas** (met prijs en trend), **Team** (balk "14 van 18 ha per dag bezet") en **Verzekering**.
- *Meerdere velden* (`bulk.html`): de kop van het detail wordt "3 velden gekozen" met "Kies niets"; de hero toont wat past op deze keuze ("Oogst 1 veld, alleen Wierdeakker is rijp") met de gele knop, en de bulkacties staan in blokken (Wie werkt hier, Verzekering, Ongedierte) met de reden achter een knop die niet kan.
- *Weiland met vee* (`vee.html`): de hero wordt rood bij een zieke kudde (koeienicons, de zieke met een kruis), met "Bel de dierenarts" als gele knop; daaronder blokken Kudde (aantal, per dag, waarde, Uitbreiden, Verkopen als gevaarknop) en Wie werkt hier.
- *Team* (`team.html`): links het team (naam, rang, loon, waar hij werkt, hoeveel ha) met capaciteitsbalk; rechts "Iemand aannemen" met drie kaarten (Leerling, Vakman, Meester: wat hij haalt en wat hij kost) en een bon met wat er per dag verandert. Het AI-personeel werkt zelf; hier stel je alleen aan en wijs je toe.
- *Machines, Erf en opslag, Kasboek* volgen hetzelfde sjabloon (lijst links, detail rechts, tabel voor het Kasboek met `ds-z-tabel`) en zijn in fase 2 een verplaatsing van bestaande inhoud, geen nieuw ontwerp.

**d. Bedrijven** (`bedrijven.html`). Links de lijst van je panden (naam, soort, personeel, per dag), daaronder de kaart met de panden en "Panden te koop bekijken" (naar Te koop, gefilterd). Rechts het detail: een hero "Beste volgende stap" (Een tweede kassa, `Uitbreiden €4.800`, "+€38 per dag · terugverdiend in ± 126 dagen · je houdt €13.650 over"), en zes blokken: Omzet en kosten (bon met netto), Klanten (getal, lijntje, "+8%", gemist), Tevredenheid (balk, reden), Personeel (aannemen), Onderhoud (balk, Renovatie met prijs) en Waarde en verkoop (Verkopen als gevaarknop). Woningen staan in dezelfde lijst als verhuurd pand.

**e. Te koop** (`tekoop.html`, `bevestig.html`). Filters als stappers (Soort, Sorteren op "snelst terug", Binnen 3 km) met "9 van 12 · 2 nog te duur". Links de lijst: naam zonder code, ha, bodem en afstand, prijs en "159 dagen terug"; wat je niet kunt betalen is gestippeld met "je mist €20.050". Rechts de kaart (jouw land, de aanbiedingen genummerd, de gekozen geel met rand) en het detail met twee bonnen: kosten (prijs, geld nu, geld erna) en opbrengst (verpacht per dag, zelf bewerkt per dag, terugverdiend in). De gele **Kopen** opent de bevestigingskaart: dezelfde bon, "Je dagbedrag nu +€559, erna +€576" en **Houd vast om te kopen** (een vulling van links naar rechts, 600 ms) naast Terug. Muis en touch drukken en houden; het toetsenbord houdt Enter vast. Voor kleine bedragen (onder €1.000, zoals de regel van `tweedruk.js`) en voor niet-onomkeerbare acties (aanvullen, renoveren) is er geen bevestiging: de kosten staan op de knop.

**f. Snackwagen** (`snack.html`). Links **Gisteren** (omzet 186, winst, klanten, gemist, en balken per uur met het piekuur geel), **Dienst** (een dagbalk met de openingstijd geel en een streep voor nu, met stappers voor Open vanaf, Open en Prijs) en **Menu** (kaarten met een vinkje, prijs en marge; wat nog dicht is is gestippeld met de reden "Eerst koeling"). Rechts **Standplaats** (kaartje, plek, "Nog 3 dagen", gele **Verleng €480** als de vergunning bijna afloopt), **Voorraad** (balk, "Vul aan €40") en **Upgrades** (naam, effect, prijs). De tegels Reputatie en Snackimperium worden balken in een blok "Imperium" (niet in de mockup; zelfde `ds-z-balk`); de uitleg staat achter de info-knop.

**g. Club** (`club.html`). Het kader (kop, tabs, strook) is van Land en bedrijf; de inhoud is onderdeel f van het clubontwerp: de tenue-kaart (shirt, segment Thuis, Uit, Derde, rugnummer), Aandeel en dividend (vier koopkeuzen met reden bij grijs) en Sponsors. De mockup toont dat met onze componenten; de club-agent blijft eigenaar van de inhoud.

**h. Spullen en Garage** (`spullen.html`, `garage.html`). Dezelfde kopband en dezelfde kaarten en rasters: Garage drie kolommen met voertuigkaarten (voorbeeld, naam, status als platte tekst, gestippeld voor "Nog niet ontdekt") en rechts het grote voorbeeld, de gele **Naar de kaart** en cijfers als balk; Spullen vier kolommen met zoeken, Soort en Sorteren als stappers. De huidige indeling blijft; alleen de kop, de filters en de status volgen het nieuwe kader.

**i. Toestanden** (`toestanden.html`). Laden (`bz-skel`, rasterbalken met `aria-busy`, geen spinner), fout (probleemkaart: "Je land en je geld zijn veilig. Alleen het aanbod kon niet worden opgehaald", Opnieuw proberen), dicht (gestippelde kaart met voortgangsbalk door het verhaal en "Naar het verhaal"), leeg (`ds-z-leeg` met icoon en één actie), gast bij Samen spelen en Rustig drukwerk (dezelfde vorm en woorden, zonder raster en misdruk).

## 5. Componenten

**Bestaand en hergebruikt** (DS3, `game/js/ds-*.css`): `ds-z-kaart` (`__kop`, `--bord`, `--uit`, `--probleem`), `ds-z-knop` (primair, `--secundair`, `--gevaar`, gestippeld met reden als `disabled`), `ds-z-waarde` (de plaatjes in de kop), `ds-z-balk` (capaciteit, tevredenheid, voorraad, reputatie), `ds-z-bon` (kosten en opbrengst), `ds-z-rij` (lijsten), `ds-z-leeg`, `ds-z-toets` (de toetsregel), `ds-paneel`, `ds-lijst` en `ds-detail` (het paneelmodel, lijst links en detail rechts; de mockup tekent het met een eigen raster `bz3-md`, het bouwwerk gebruikt het bestaande model), `ds-scroll` (de scrollbalk en de vervagende rand), de tabrij `m-tab` van `pausemenu.js` (met `data-count` en de stip van `ds-m-nieuw`), `sectionCard` en `holdingButton` uit `holdingcards.js`, `farmstatus.js` (kleurtaal van de velden) en `perceelmap.js`/`parcelindex.shapeOf` (de omtrek van een perceel voor de kaart).

**Nieuw en gedeeld met het clubontwerp** (één component, één naam, door wie het eerst bouwt in `ds-components.css` en `ds-galerij.html`):

| Hier | Clubontwerp | Gedeelde naam | Wat |
|---|---|---|---|
| `bz3-seg` | `vb-seg` | `ds-z-segment` | segment, gekozen = bordgroen met vinkje, ook met een regel eronder en met `--blok` |
| `bz3-stand` | `vb-st` | `ds-z-status` | status als platte tekst met icoon en woord |
| `bz3-label` | `vb-tussenkop` | `ds-z-tussenkop` | tussenkop zonder misdruk |
| `bz3-stap` | `vb-stepper` | `ds-z-stapper` | pijl, waarde, pijl voor sorteren, filter en rugnummer (links en rechts op de controller) |
| `bz3-kop` | de kopband | `ds-z-kopband` | eyebrow, titel en `ds-z-waarde`-plaatjes rechts |
| (tabel) | `vb-tabel` | `ds-z-tabel` | tabel met een gekozen rij, voor het Kasboek en de prijzen per streek |
| (link) | `vb-link` | `ds-z-link` | derde actie, onderstreept met pijl |

**Nieuw en alleen voor Bezit** (`game/js/ds-bezit.css`, voorvoegsel `bz-`; vervangt de oude `bz-`-regels in `farm.css`): `bz-nu` en `bz-klus` (de strook en een klus met dringendheid), `bz-fasen` (de groeifasen van een gewas), `bz-kaartvlak` (de SVG-kaart met percelen, markers en legenda), `bz-feiten` (een `dl` met label en waarde), `bz-lijst` (de lijst met vinkvak en vervagende rand), `bz-hero` (het gekleurde blok met de gele actie), `bz-blok` (een blok met tussenkop), `bz-spark` (het lijntje over zeven dagen), `bz-skel` (laadvlak). In de mockups heten ze `bz3-*`; in `mock.src.css` staat alles in tokens, zonder hex of eigen lettertype.

Wat verdwijnt: de pillenrij van de Boerderij (`bd-seg`, `bd-seg-tab`), de cyclus-chips (`cycleChip`), de tegels (`bz-tegel`), de grote uitlegknop (`meerHtml` als knop), het inline "Ja, Nee" (`bd-zeker`) en de `m-bt`-knoppen die op platte tekst lijken.

## 6. Toestanden, toetsenbord en controller

Per scherm: **laden** (rasterbalken, geen spinner), **leeg** (één zin, een beeld en één actie), **fout** (de zin dat niets verloren is en Opnieuw proberen), **dicht** (gestippeld, de reden in woorden en een voortgangsbalk door het verhaal) en **op slot** (een knop met de reden erin, zoals nu).

Bediening (menu-patroon van `ui-taal.md`): **Q en E** (op de controller LB en RB) wisselen tab; **omhoog** vanuit de inhoud gaat naar de strook "Nu te doen" (links en rechts tussen klussen, Enter gaat ernaartoe), nog een keer omhoog naar de tabrij; **links en rechts** op het segment onder de tabs kiest Velden, Team, Machines... direct, zonder Enter; **omhoog en omlaag** kiest in de lijst, **Spatie of X** vinkt een veld aan, **Enter of A** opent of doet de focus; rechts of Tab gaat van de lijst naar de hero (de gele knop heeft als eerste de focus), dan de blokken; in een segment kiezen links en rechts; **Esc of B** gaat een niveau terug (detail, lijst, tabrij) en daarna uit het menu. Eén focusring (de DS-ring), doelen minstens 44 px. Een onomkeerbare koop of verkoop vraagt vasthouden (Enter of A, 600 ms). `bediening.html` toont de volgorde met nummers. Met "Beweging beperken" springt de onderstreping en vult de vasthoudbalk in één stap.

## 7. Samen spelen

De zes vragen (uitgangspunt: [COOP-GAST.md](../COOP-GAST.md), Bezit, en #429):

| Vraag | Antwoord |
|---|---|
| Van wie is het? | Land, panden, snackwagen, aandelen en de kuddes zijn van de speler zelf (per speler, `bezitlive.js`, `coopbezit.js`). De wereld (de kaart, de percelen die te koop zijn, de prijsmarkt) is van wie het spel opende. |
| Doet een gast mee (J of N)? | Er is geen Meedoen: elke speler beheert zijn eigen bezit in zijn eigen menu. Het scherm is overal hetzelfde. |
| Wat ziet een gast? | Zijn eigen kop, strook en kaarten. Wat het werk in de wereld vraagt (het veld oogsten met de trekker, de route) wordt voor een gast "Zet op de kaart" met één regel dat de klus in zijn eigen spel gebeurt; personeel, gebruik, gewas, kopen en verkopen werken gewoon. Bij Te koop en Snackwagen staat een perceel of standplaats dat een medespeler claimde als "van een medespeler" (`claimOfKey`). |
| Wie krijgt beloning en voortgang? | Per speler: het dagbedrag, de oogst en de ervaring gaan naar zijn eigen geld en voortgang (#429); niets hiervan is een hostrecht. |
| Wat als iemand wegvalt of later aansluit? | Een claim op een perceel of standplaats van een speler die wegvalt komt vrij (`releaseLostClaim`, `releaseLostSpot`); zijn bezit blijft van hem. Wie later aansluit ziet zijn eigen bezit en de claims van de anderen. |
| Welke test dekt het? | Pure tests voor de nieuwe viewfuncties met een gastomgeving (geen Oogsten, wel Zet op de kaart; claim zichtbaar), de bestaande `bezitui_test`, `bezitcoop_test`, `coopbezit_test`, `snackui_test` en `holdingcards_test`, en de testbankstap van Samen spelen voor de claim van een perceel. |

Regel voor de changelog: "Land en bedrijf heeft een vaste kop met je geld, je waarde en je dagbedrag en een strook met wat je nu moet doen; je bezit en je beheer blijven van jezelf, ook bij Samen spelen."

## 8. Wat het bouwen kost

Fase 2, acht stappen met elk een eigen commit en test (alleen de tests die de code dekt):

1. **Componenten**: de gedeelde set (`ds-z-segment`, `ds-z-status`, `ds-z-tussenkop`, `ds-z-stapper`, `ds-z-kopband`, `ds-z-tabel`, `ds-z-link`) in `ds-components.css` en `ds-galerij.html` (afspreken met de club-agent wie eerst bouwt), en nieuw `game/js/ds-bezit.css`. Tests: `ds_tokens_test`, `ds_galerij`-beeld.
2. **Puur model** (nieuw, met tests): `bezitklussen.js` (de strook: klussen met dringendheid uit `attentionPoints`, vergunning, onderhoud), `bezitwaarden.js` (geld, totale waarde, per dag, aandacht), `bezitkaart.js` (de SVG-kaart uit `shapeOf`, met de kleurtaal van `farmstatus.js`; zonder vormen de bestaande schets).
3. **Kader**: kop, strook en tabs in `pausemenu.js` (tellers, aandachtsruit, `HINTS`) en een nieuw `bezitframe.js`.
4. **Overzicht en leeg**: nieuw `bezitoverzicht.js`; `summaryHtml` in `bezitui.js` valt weg.
5. **Boerderij**: nieuw `bezitvelden.js` (kaart, lijst, detail, bulk; neemt perceellijst, vee, ketens en prijzen uit `bezitui.js` over en de tabs Werk, Percelen, Gewas uit `boerderijui.js`) en `bezitteam.js`; Machines, Erf en Kasboek verhuizen naar het nieuwe sjabloon.
6. **Bedrijven en Te koop**: nieuw `bezitbedrijven.js` en `bezitkoop.js` (met de bevestiging via `tweedruk.js` en vasthouden); een pure `rendement` voor "terugverdiend in".
7. **Snackwagen**: `snackui.js` (176 regels, wordt ca. 350).
8. **Spullen en Garage**: kop en filters in `spullen.js` en `garageui.js`; beeldregressie voor twaalf schermen in `scripts/ui/`; `docs/DESIGN-SCHULD.md` bijwerken.

Samen: ca. 9 nieuwe bronbestanden, 1 nieuw CSS-bestand (en uitbreiding van `ds-components.css`), 6 aangepaste bestanden (`bezitui.js`, `boerderijui.js`, `snackui.js`, `pausemenu.js`, `spullen.js`, `garageui.js`), `farm.css` kleiner, ca. 6 nieuwe pure tests en aanpassingen aan ca. 8 bestaande (`bezitui_test`, `boerderijui_percelen_test`, `boerderijui_rust_test`, `boerderijui_machines_test`, `snackui_test`, `holdingcards_test`, `bezitui_iconmaat_test`, `holdingsmodel_test`). Niet in dit werk: nieuwe spelregels, het ketenscherm (blijft een blok in Velden), geluid.

## 9. Wat nog niet is besloten

1. **De Doorgaan-knop in de rail** is geel en staat naast de gele knop van het paneel: twee gele knoppen op één scherm. Dat is het pauzemenu zelf, buiten dit ontwerp; voorstel aan de DS3-eigenaar: secundair.
2. **Twee registers voor land.** De percelen van de Zonnehoek (`bedrijf.percelen` en erven in `boerderijlive.js`) en de gekochte percelen (`bezit.parcels`) zijn twee gegevensbronnen met verschillende koop- en huurfuncties. Het ontwerp toont ze in één lijst Velden; voorstel: in fase 2 een adapter in `bezitvelden.js`, het samenvoegen van de data niet.
3. **Totale waarde** is hier de som van de waarde van land, panden, wagen, machines en aandelen (niet wat het bij verkoop oplevert; dat staat per pand). Akkoord?
4. **Terugverdientijd en "levert ± per dag"** zijn schattingen: voor verpachten bestaat de berekening (`leaseOutPerDay`), voor panden en zelf bewerken is een pure functie `rendement` nodig. Het is geen nieuwe spelregel, wel een nieuwe belofte aan de speler; daarom altijd met "±".
5. **Vasthouden om te kopen** met de muis (indrukken en houden) is nieuw gedrag voor een winkelscherm. Alternatief: twee kliks. Voorstel: vasthouden voor alles boven €1.000 en voor verkopen, anders direct.
6. **Meer dan drie klussen**: "+2 meer" opent een lijst; die staat niet in de mockups.
7. **Dichte takken** (Bedrijven en Snackwagen gaan open bij een akte): de voortgangsbalk door het verhaal vraagt gegevens van `unlockgate.js`; zonder die gegevens blijft het bij de zin.
8. **Kaartminiatuur**: een SVG (zoals in de mockups, scherp en klein) of een canvas van `perceelmap.js` (dezelfde taal als de grote kaart). Voorstel: SVG, omdat `shapeOf` de omtrek al levert.
9. **Strook en de club**: of de strook ook clubdingen toont (sponsor wacht) hangt af van het clubontwerp; nu niet.

## 10. De mockups opnieuw maken

```
node docs/ontwerp/bezit-ui-24-11/bouw.mjs          # schermen naar .scr/bezit-ontwerp/scherm/
node docs/ontwerp/bezit-ui-24-11/schiet.mjs        # beelden (headless Chrome, eigen profiel) op 1920x1080, 1280x720 en 1280x800
node docs/ontwerp/bezit-ui-24-11/index.mjs         # .scr/bezit-ontwerp/index.html
```

De stage is 1920 ontwerppixels breed (`--mz`); de hulptekst krijgt de vloer van 13 echte pixels (`--menu-min`), zoals `menu.css`, dus op 1280x720 groeit die naar 19,5 stage-px: de strakste maat, hierop is getoetst. Op 1280x800 is de stage 1920x1200. De beelden van de huidige schermen komen uit `huidig_beeld.mjs` met `huidig_scenes.js` (Electron via `electronrunner.cjs`, een gestagede game-map met een wereld, een uitvoermap binnen `.claude/worktrees`).

## 11. Stand van de bouw (fase 2, 24-11)

Besluiten van de coördinator verwerkt: totale waarde is een som van waarden; rendement is een pure functie met ± en valt weg zonder gegevens; land blijft twee registers met alleen een presentatie-adapter (de Zonnehoek-percelen staan al in `bezit.parcels` met de vlag `lg`, dus Velden toont ze in één lijst); "+n meer" is een uitklaplijst achter de strook; vasthouden om te kopen vanaf €1.000; dichte takken tonen alleen een voortgangsbalk als er een echt getal bestaat (nu is dat er niet, dus de zin met de reden).

Gebouwd, in kleine commits op `bezit-ui-24-11`:
- **Gedeelde componenten:** de set van `club-ui-24-11` (`d651766f7`) is overgenomen in `ds-components.css`; mijn eigen versie is teruggedraaid, er zijn geen twee sets. Namen: `ds-z-segment` (kinderen zijn gewoon `button`), `ds-z-status` (`__l`, `__w`, `--goed`), `ds-z-tussenkop`, `ds-z-stapper` (`button`, `output`), `ds-z-kopband`, `ds-z-tabel`, `ds-z-link`.
- **Kader en Overzicht:** kopband met waardeplaatjes, strook "Nu te doen" met "+n meer", tabgetallen en ruit, portfolio, lege stappen (`bezitframe.js`, `bezitoverzicht.js`, `bezitwaarden.js`, `bezitklussen.js`).
- **Boerderij:** het segment Velden, Team, Machines, Erf en opslag, Kasboek; Velden met kaart (`bezitkaart.js`), lijst met vinkvakken, detail met groeifasen, de gele hoofdactie, gebruik, gewas, team, verzekering, kudde en bulk; Team met capaciteit en aannemen; de dierenarts (`bezitvelden.js`, `veldenActie` in `bezitui.js`). Machines, Erf en Kasboek (met de Bank) staan zonder eigen sfeerband in hetzelfde kader. De oude pagina's perceel, percelen, gewas en bank blijven bereikbaar (sneltoetsen en tests); het land van de Zonnehoek dat te koop of te huur is staat achter een uitklap onder Velden.
- **Te koop en Bedrijven:** één lijst van percelen, panden en woningen met stappers voor soort en sorteren, kaart, vergelijking met ±, bevestiging met vasthouden (muis, Enter of Spatie; een controller-A die alleen klikt telt als eerste van twee drukken) (`bezitkoop.js`, `bezitbedrijven.js`, `bezitrendement.js`). Bedrijven toont geen klanten of tevredenheid: het spel houdt ze niet bij.
- **Snackwagen:** dienstbalk met stappers, menu als kaarten, upgrades, balken voor het imperium, één gele knop (`snackui.js`).
- **Spullen en Garage:** dezelfde waardeplaatjes bovenin (`bezitplaat.js`).
- **Doorgaan:** is secundair (omlijnd) zodra het zichtbare paneel zelf een gele knop heeft (`pm-eigen-primair` in `pausemenu.js`).

Bewust niet gebouwd of nog open: de dagomzet per uur en "Gisteren" van de snackwagen (het spel bewaart geen omzet per uur), het verloop over zeven dagen in het portfolio, klanten en tevredenheid van een pand, het verlengen van een vergunning (er is geen actie voor), de uitlegpagina achter "+n meer" als aparte lijst (het is een uitklap).

**Wat is gezien en wat niet (24-11, na de beeldronde).** Het echte spel (de gestagede game-map) is in headless Chrome via CDP gedraaid (`cdp_beeld.mjs --traag=3`, software-rendering, dus 3D-voorbeelden zoals het erf-plaatje blijven leeg) en alle beelden zijn bekeken op 1920x1080 (stage st11), 1280x720 en 1280x800: Overzicht, Boerderij (Velden, bulk, Team, Machines, Erf, Kasboek), Bedrijven (leeg), Te koop met de bevestiging, Snackwagen, Club, Spullen, Garage en de menuschermen Spel, Verhaal en Instellingen. Gebreken uit die ronde zijn verholpen: kadastrale code in perceelnamen, inspringing van Velden/Team/Machines/Erf/Kasboek, het smalle Bedrijven-blad, de dagregel boven machines/erf/kas en een Doorgaan dat omlijnd werd door een badge in Verhaal (nu telt alleen een knop in de gele hoofdkleur). De Electron-route (`huidig_beeld.mjs`) hing bij drukte op de machine telkens op het opstartscherm en is daarom niet gebruikt. Niet gezien: de Kaart (het kaartvenster sluit het menu in deze scene, dus Doorgaan daar is niet beoordeeld), de voor-beelden van Doorgaan (alleen de code: voorheen altijd geel), en echte Electron-weergave met GPU.
