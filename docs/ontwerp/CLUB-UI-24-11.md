# Club-UI: ontwerp (fase 1, 24-11)

Status: ontwerp, nog niet gebouwd. Geen spelcode gewijzigd. Aanleiding: feedback eigenaar 24-11 ("de UI voor de club is absoluut nog niet goed") en de review van de coördinator. Mockups: `docs/ontwerp/club-ui-24-11/*.html` (gemaakt door `bouw.mjs`, nieuwe componenten in `ontwerp.css`), beelden en vergelijking voor/na op `.scr/club-ontwerp/index.html` (lokaal, niet in git). Alle clubs, spelers en cijfers in de mockups zijn verzonnen voorbeelden.

Raakt: `voetbalcarriereui.js` (Vandaag, Selectie, Kalender, Stand, Training, Trainer, Manager), `clubui.js` (tab Club in Land en bedrijf), `voetbalclub_bezit.js` (aandelen), de opstellingskaart en HUD van de wedstrijd (`voetbalstatus.js`, `voetbalpresentatie.js`, `voetbaltvlayer.js`).

## 1. Wat een speler hier wil

Zoals bij Football Manager, EA FC en Motorsport Manager draait het om vier vragen, in deze volgorde: (1) hoe staat mijn club ervoor, (2) wat is mijn volgende wedstrijd en wat staat er op het spel, (3) wat moet ik regelen voor ik speel (opstelling, training, tenue), (4) wat kan ik uitbreiden (aandeel, sponsor, stadion). Het Clubhuis beantwoordt 1 en 2 zonder te klikken; de tabs beantwoorden 3 en 4.

## 2. Principes

1. **Vier soorten dingen, vier uiterlijken** (de kern van probleem 1 in de review). Wat je kunt aanklikken ziet er anders uit dan wat je alleen leest.
   - Status (niet klikbaar): platte tekst met icoon of letter. Geen rand, geen schaduw, geen pil. Klassen `vb-st`, `vb-feit`, `vb-vorm`, `vb-pos`, `vb-trend`.
   - Navigatie: tabs met een onderstreping (`vb-tabs`, de glijdende lijn van `ds-micro.css`), geen pillen.
   - Keuze: een segmentknop (`vb-seg`), rechthoekig en aan elkaar; gekozen = bordgroen gevuld met een vinkje.
   - Actie: een knop met harde schaduw (`ds-z-knop`); één gele per scherm, secundair is papier, de derde actie is een onderstreepte link met pijl (`vb-link`).
2. **Eén gele knop per scherm**, op de plek waar het volgende doel ligt: Overzicht = Speel de wedstrijd, Tactiek = Coach de wedstrijd, Training = Train, Club = geen (kopen is een bewuste keuze), Wedstrijdintro = Aftrap.
3. **Gevolg voor de keuze** (DS-regel 7): bij Speel en Laat uitrekenen staat wat het is (jij speelt mee, of de club speelt zonder jou) en wat het oplevert (€55 bij winst, €25 vaste vergoeding). Geen onuitgelegde chips.
4. **Twee niveaus van koppen**: de schermtitel en de kaartkop (op de bordgroene band) houden de rode misdruk; een tussenkop (`vb-tussenkop`) is bordgroen, kleine hoofdletters met een lijn en zonder schaduw. Zo is er niveauverschil.
5. **Indeling in plaats van lege breedte**: op 1920 breed staat een hoofdkolom (held, tabel, veld) naast een smalle zijkolom (stand, speler, details). Niets zweeft in een lege kaart.
6. **Een beeld waar een voetballer het verwacht**: wapens bij elke club, formatieveld bij vorming, 3D-shirt bij tenue.
7. **Kleur is nooit het enige**: vorm W (vierkant), G (neutraal), V (rond) met letter; positie met letter K, V, M, A en eigen vulling; zones met woord in de legenda; slot met raster en reden.
8. **Altijd zomer, geen echte merken**: alle namen verzonnen. De clubkleuren in het wapen komen uit de clubdata (`voetbalclubs.js`: shirt, accent, patroon), niet uit de CSS.

## 3. Ontwerpmaten

De menu-stage is 1920 ontwerppixels breed en wordt ingezoomd met `--mz = min(h/1080, b/1920)` (menu.css, uiscale.js). In de mockups is dezelfde formule en dezelfde vloer (`--menu-min`, hulptekst nooit onder 13 echte px) nagebootst:

| Venster | Stage | Opmerking |
|---|---|---|
| 1920x1080 | 1920x1080 | referentie |
| 1280x720 | 1920x1080 | hulptekst groeit naar 19,5 stage-px: de strakste maat, hierop is getoetst |
| 1280x800 (Steam Deck) | 1920x1200 | meer hoogte, zelfde breedte |

Het paneel is dus op alle drie ca. 1440 stage-px breed. Kop en tabs nemen ca. 190 px; de inhoud van Overzicht past zonder scroll op 1080 en 720; lange lijsten (selectie, sponsors) scrollen binnen hun vak en houden de gekozen rij in beeld.

## 4. Per scherm

Alle schermen delen: eyebrow "Loopbanen · Voetbal", de kopband (wapen, clubnaam, klasse en plek; rechts Plek, Vorm als W/G/V, Geld) en de tabrij **Overzicht, Selectie, Tactiek, Stand, Kalender, Training, Club** (Q en E wisselen; een rood punt met aria-label "nieuw" bij nieuws, zoals een sponsor die wacht). De kopband is groot op Overzicht en compact (één regel) op de andere tabs, zodat de inhoud ruimte houdt.

**Rollen.** De tabs Trainer en Manager verdwijnen: Trainer wordt Tactiek (voor iedereen zichtbaar; Coach de wedstrijd alleen met de rol Trainer), Manager (transfers, contracten) wordt een segment "Selectie | Transfers" bovenin Selectie (open punt 3). Aandelen en sponsors gaan naar Club.

### a. Clubhuis (Overzicht), `a-clubhuis.html`
- Links de held-kaart **Volgende wedstrijd** (`ds-z-kaart`, kop "Competitie · ronde 4 van 7"): twee wapens (xl), korte clubnaam met de volle naam eronder, Thuis/Uit-label, plek en vorm van beide teams; in het midden datum, tijd en plaats; daaronder sterkte tegen sterkte met een korte uitspraak ("Bijna gelijk · korte reis"). Onderaan twee keuzevakken: links de gele **Speel de wedstrijd** met "Je speelt zelf mee, telt als training; winst levert €55, verlies €25"; rechts secundair **Laat uitrekenen** met "De club speelt zonder jou; €25 vaste vergoeding, geen winstbonus" en de link **Eerst trainen**.
- Onder de kaart de Tessa-tip als één regel (`vb-notitie`) met een link naar Training: kleiner dan de wedstrijd.
- Rechts **Stand** (top drie plus de volgende tegenstander, jij gemarkeerd, link "Alles") en **Jouw speler** (rugnummer, naam, positie, rating, energie, vorm, blessure; één regel dat er sponsors wachten, met link naar Club).
- Weg van het hoofdscherm: de sponsorlijst en de statuspillen.
- Leeg (geen wedstrijd): de held-kaart wordt een `ds-z-leeg` "Seizoen 2 loopt ten einde" met datum van het volgend seizoen; **Naar training** wordt dan de gele knop. Wedstrijd nu te spelen: een stempel "Nu te spelen" in het midden; verre rit: "Twee speldagen onderweg".

### a2. Clubhuis, gast, `a2-clubhuis-gast.html`
Zie hoofdstuk 7.

### b. Tabs en componenten, `b-componenten.html`
Eén pagina met de vier soorten dingen naast elkaar, de tabs, segmenten, wapenmaten, tussenkop, stat-met-teamgemiddelde en de staten leeg (`ds-z-leeg`), laden (rasterbalk `vb-skelet`, `aria-busy`) en fout (`ds-z-kaart--probleem`, knop Opnieuw, de zin dat de carrière veilig is).

### c. Selectie, `c-selectie.html`
- Links een tabel (`vb-tabel`): rugnummer, naam (met JIJ of TEAMGENOOT), positiebadge, rating, vorm-pijl (met woord als tooltip en aria), conditie (Fit, of blessure met rood plusje en tekst). Filter als segment Alle, K, V, M, A. Sorteren op kolomkop. De gekozen rij blijft in beeld.
- Rechts het zijpaneel (`vb-zij`, hooguit 480 px): rugnummer, naam, positie, vorm, rating met "team 41"; vijf vaardigheden als balk met teamgemiddelde (streep) en plafond (gestippeld) en het verschil (▲ +3, ▼ −9; teken én kleur); groei dit seizoen (rating, beste groei, trainingen); talent; link **Train Pass**.
- "Nog geen talent" wordt "Talent geen" met, als er een regel voor is, één zin hoe je er een krijgt (open punt 5).

### d. Tactiek, `d-tactiek.html`
- Links het formatieveld (veld van boven, eigen doel onder, aanvallen omhoog) met elf klikbare plekken: rugnummer en achternaam. Jij staat geel, de gekozen plek bordgroen.
- Rechts **Vorming** als segment met een voorbeeldveldje per keuze (4-4-2, 4-3-3, 3-5-2) en één zin uitleg; **Speelstijl** als segment met één zin uitleg; **Bank** met de kandidaten voor de gekozen plek bovenaan en het verschil in rating; link **Beste elf** (vervangt "Laat het spel de beste elf kiezen").
- Onderaan een actiebalk met de gele **Coach de wedstrijd** en één zin wat het is. De rij-knoppen "Naar de bank" en "In de basis" verdwijnen: je kiest op het veld een plek en dan een speler van de bank (wissel). "Vast" en "Los" blijven als kleine stand op de speler, in te stellen met een tweede druk op dezelfde speler.

### e. Stand, `e-stand.html`
- Segment voor de klasse (Kroonklasse, Terpklasse, Talentenklasse · jouw klasse) boven een echte tabel: plek, wapen, naam, Gesp., W, Gel., V, DS, Ptn, Vorm. Jouw rij is bordgroen met JIJ, de volgende tegenstander heeft TEGEN. Promotiezone (bovenste twee) en degradatiezone (onderste twee) als gekleurde linkerrand, met legenda in woorden.
- Rechts Jouw seizoen (plek, rondes), Bekers (Dijkbeker, Waddenbeker; vinkje of streep plus woord) en Vorig seizoen.

### f. Club, `f-club.html`, `f2-club-aandeel.html`
- Links de **tenue-editor als eigen kaart**: groot shirt (in het spel het 3D-voorbeeld van `vehiclepreview.renderSnapshot`; in de mockup een plaatje), segment Thuis/Uit/Derde (Derde op slot met reden "vanaf Prof"), rugnummer-stepper (ook met de toetsen 1, 2, 3 en min en plus), sponsor op het shirt, één zin over wanneer je het draagt.
- Rechts **Wapen en kleuren**, **Stadion en trainingsveld** (plaatsen, velden, tribune na je eerste aandeel) en **Aandeel en dividend**: dicht = de echte voorwaarde in één zin ("Dat kan zodra je €3.000 met voetbal hebt verdiend, of manager van je club wordt") met een balk "€120 van €3.000"; open = bezit, dividend per ronde, de vier koopkeuzes (10, 25, 51, 100 procent) met een reden bij grijs, en de verkooplink met bedrag.
- Onder de kaarten **Sponsors** (verhuisd van het hoofdscherm): rij met naam, soort, doel, bedrag en Neem aan; aangenomen rijen krijgen vinkje en bordgroene rand.
- De intro van één lange zin met "€3.000 ... nu €0" verdwijnt: de cijfers staan in de balk.

### g. Wedstrijdintro en HUD, `g-intro.html`, `g2-hud.html`, `g3-hud-toetsen.html`
- **Intro**: één kaart. Kop met twee wapens, korte clubnamen (Roodehaan, Dorkwerd: breken nooit over twee regels), Thuis/Uit en speelstijl; midden datum, tijd, plaats. Daaronder drie kolommen op één raster: opstelling thuis, **één formatieveld met beide teams** (thuis zwart, uit wit, jij geel), opstelling uit. Beide lijsten hebben dezelfde kolommen (#, positie, naam, rating) en rijhoogte; namen krimpen met een ellips. Onderaan: wie je speelt, de toetsen in groepen en de gele **Aftrap**.
- **HUD tijdens de wedstrijd**: hoogstens drie dingen spreken tegelijk: scorebalk (wapens, korte namen, stand, tijd), één meldingplek (volgorde: doelpunt of scheidsrechter, dan tip, dan commentaar) en de spelerskaart (energie, rol). De minikaart blijft klein en zwijgt. Weg tijdens de wedstrijd: de uitlegkaart (alleen bij de intro), de losse doelpuntenkaart (de scorebalk toont de stand; details in de rust), de plaatsnaam (verdwijnt zodra de wedstrijd loopt, zodat commentaar niets overlapt) en Bezit, Tegen en Eerst (naar het pausemenu).
- **Toetsregel**: vier groepen op één regel (Lopen, Bal, Verdedigen, Tactiek). De eerste seconden en op verzoek (H) neemt de toetsregel de meldingplek over; daarna verdwijnt hij.

## 5. Componenten

Hergebruikt van DS3 (`game/js/ds-*.css`): `ds-z-kaart` (`__kop`, `--recht`, `--probleem`), `ds-z-knop` (primair, `--secundair`, `--ghost`, `aria-disabled` met reden), `ds-z-toets`, `ds-z-balk`, `ds-z-feit`, `ds-z-leeg`, `ds-m-tabs` met de glijdende lijn, de tokens `--ds-c-*`, `--ds-s-*`, `--ds-lijn-*`, `--ds-schaduw-hard*`, `--ds-motief-voren` (veldstrepen), `--ds-raster` (slot) en de menuvloer `--menu-min`. `ds-z-chip` blijft voor labels in lopende tekst, niet meer voor status of keuze.

Nieuw (alleen tokens, geen hex; in `ontwerp.css`, bij het bouwen naar `game/js/ds-voetbal.css`; de generieke naar `ds-components.css`):

| Component | Doel | Generiek? |
|---|---|---|
| `vb-tabs`, `vb-tab` | tabrij met onderstreping (op `ds-m-tabs`) | ja, `ds-z-tabs--lijn` |
| `vb-seg` (+ `--vol`, `--stapel`, `--groot`) | segmentknop met vinkje | ja, `ds-z-segment` |
| `vb-link` | derde actie, onderstreept met pijl | ja, `ds-z-link` |
| `vb-tussenkop` | tussenkop zonder misdruk | ja, `ds-z-tussenkop` |
| `vb-tabel` | tabel met kolommen, jouw rij, zones | ja, `ds-z-tabel` |
| `vb-hint` | toetsregel in groepen | ja, `ds-z-toetsregel` |
| `vb-wapen` (+ `crestSvg(club)`) | clubwapen uit kleur en patroon | voetbal |
| `vb-vorm`, `vb-pos`, `vb-trend`, `vb-delta`, `vb-st`, `vb-kop` | status en kopband | voetbal |
| `vb-hero`, `vb-keuze`, `vb-uitleg`, `vb-notitie` | held-kaart en uitleg | voetbal |
| `vb-veld`, `vb-spot` | formatieveld (staand en breed) | voetbal |
| `vb-zij`, `vb-stat`, `vb-groei`, `vb-rating`, `vb-nr`, `vb-bank`, `vb-actiebalk` | Selectie en Tactiek | voetbal |
| `vb-stepper`, `vb-shirtvak`, `vb-sponsor`, `vb-slot`, `vb-optie` | Club | voetbal |
| `intro`, `lijst11`, `hud-score`, `hud-melding`, `hud-speler` | intro en HUD | voetbal |

## 6. Toestanden, toetsenbord en controller

Per scherm: **laden** (rasterbalk met `aria-busy`, geen spinner), **leeg** (`ds-z-leeg` met woord en één actie), **fout** (probleemkaart met de zin dat de carrière veilig is en een knop Opnieuw), **op slot** (gestippeld met raster en altijd de reden in de melding; dat is de bestaande `uitReden()`).

Bediening (menu-patroon, ui-taal "Navigatie met controller en toetsenbord"): Q en E wisselen tab (op de pad LB en RB); pijlen kiezen binnen het vak; Enter of A doet de gele knop of de focus; Esc of B gaat terug. Tactiek: pijlen verplaatsen de focus over de plekken in veldvolgorde, Enter kiest de plek, Tab gaat naar de bank. Selectie: pijlen door de tabel, het paneel volgt de gekozen rij. Club: 1, 2, 3 kiezen het tenue, min en plus het rugnummer (blijft). Eén focusring (de DS-ring), alle doelen minstens 44 px. Met "Beweging beperken" springt de onderstreping in plaats van te glijden.

Toetsregel: in groepen met een naam of een streep, hoogstens vier groepen op één regel.

## 7. Samen spelen

De zes vragen voor de club-UI (uitgangspunt: docs/COOP-GAST.md, Voetbalcarrière):

| Vraag | Antwoord |
|---|---|
| Van wie is het? | Carrière en Clubhuis zijn van de speler zelf (`gde-voetbalcarriere-v1`). De wedstrijd en de computer rekent wie het spel opende. |
| Doet een gast mee? | Een gast doet mee met Meedoen (J of N) als zijn eigen figuur in het team van de host. |
| Wat ziet een gast? | Zijn eigen Clubhuis; zodra de host een wedstrijd start wordt de gele knop **Meedoen (J)**, is **Laat uitrekenen** op slot met een reden en is **Nee, dank (N)** zichtbaar (`a2-clubhuis-gast.html`). Tactiek is dan alleen-lezen met een regel dat hij in het team van de host speelt. Intro en HUD komen uit de snapshot en het EXTRA-bericht. |
| Wie krijgt beloning en voortgang? | Per speler: geld, loopbaanpunten en ervaring uit zijn eigen uitslagsregel, geen competitiepunten (bestaande regel, `voetbalsamen.js`). |
| Wat als iemand wegvalt of later aansluit? | Een gast die wegvalt keert terug naar zijn Clubhuis zonder verlies; wie later aansluit krijgt de Meedoen-vraag zolang de eerste helft loopt. Bij een derby toont de intro beide teams met de namen van de spelers. |
| Welke test dekt het? | Een nieuwe pure test `club_ui_test.mjs` (HTML van de pure viewfuncties met een gastomgeving: Meedoen, op slot, alleen-lezen), de bestaande `voetbal_samen_test.mjs` en een testbankstap met twee instanties voor de derby-intro. |

Regel voor de changelog: "Het Clubhuis is van jezelf; bij een gedeelde wedstrijd zie je Meedoen en kun je niet uitrekenen of de tactiek wijzigen."

## 8. Wat het bouwen kost

Fase 2, vier stappen met elk een eigen commit en test:

1. **Componenten**: nieuw `game/js/ds-voetbal.css` (uit `ontwerp.css`); generieke delen in `ds-components.css` en de galerij `game/ds-galerij.html`; nieuw `game/js/voetbalwapen.js` (`crestSvg`, puur) en `voetbalformatie.js` (veld en plekken, puur). Tests: `ds_tokens_test`, nieuwe `voetbal_wapen_test`.
2. **Voetbalscherm** (`voetbalcarriereui.js`, 267 regels, wordt ca. 450): nieuwe viewfuncties voor Overzicht, Selectie, Tactiek en Stand; Trainer en Manager samenvoegen; sponsors eruit; tabs met onderstreping. Een pure functie voor sterkte en verwachting in `voetbalcarriere.js`. Test: `voetbal_ui_test.mjs` aanpassen.
3. **Club** (`clubui.js`, 105 regels): kaarten, sponsors erbij; `footballkit.js` krijgt een leesfunctie voor het volgende niveau. Test: `clubui_test.mjs`.
4. **Wedstrijd** (`voetbalstatus.js`, `voetbalpresentatie.js`, `voetbaltvlayer.js`, `voetbaltv.css` en de HUD-prioriteiten): intro met formatieveld, drie dingen spreken, toetsregel in groepen. Test: `voetbal_uitzending_test.mjs` en een beeldstap.

Samen: ca. 6 nieuwe of herschreven bronbestanden, 4 CSS-bestanden, 3 tests. Niet in dit werk: het 3D-shirt (bestaat al), geluid en nieuwe spelregels.

## 9. Wat nog niet is besloten

1. **Wedstrijdverwachting**: "Bijna gelijk" en sterkte 43 tegen 41 komen uit club- en selectiesterkte; er is geen functie die een kans uitrekent. Voorstel: sterkte tegen sterkte met een zin (gelijk, licht favoriet, underdog), geen percentage.
2. **Beloningstekst**: "€25 vaste vergoeding, €55 bij winst" volgt `payFor()` (vergoeding plus winstbonus); de bedragen komen bij het bouwen per klasse uit de code. Of gelijkspelen een bonus geeft, is nog te controleren.
3. **Manager-inhoud** (transfers, contracten): als segment in Selectie getekend, niet uitgewerkt. Alternatief: een achtste tab Manager alleen voor wie de rol heeft.
4. **Degradatie in de laagste klasse**: de Talentenklasse is de laagste, de huidige code toont toch een degradatiepijl. Wat betekent dat daar (naar de lokale pool)? Bij "geen degradatie" valt de rode zone weg.
5. **Talenten**: "Talent geen" laat niet zien hoe je er een krijgt; als daar een regel voor is, hoort die in één zin eronder.
6. **Stadion en tribune**: 800 plaatsen en "tribune na je eerste aandeel" volgen `voetbalclub_bezit.js` (`TRIBUNES`, `capacityOf`); "1 trainingsveld, gras" is een aanname tot er een bron voor is.
7. **Tabs en de andere agent**: de onderstreping van de tabs wordt op `voetbal-24-11` door een andere agent gebouwd (met NaN-fixes in `vehiclepreview.js`). Dit ontwerp raakt dat niet aan; bij de merge moet die onderstreping samenvallen met `vb-tabs` (zelfde idee, andere klassenaam).
8. **Wapen**: een schild uit kleur en patroon is een eerste voorstel; een eigen symbool per club (toren, golf, kroon) vraagt illustratiewerk.
9. **Niet in het echte menu bekeken**: pausemenu-kader en 3D-achtergrond zijn nagebootst; de toets in het spel gebeurt in fase 2.
