# UI-kritiek 22-11: kaarten, overlays en Samen-flow

Beoordeling van de schermen uit het UI-kritiekharnas (branch `ui-kritiek-harnas-22-11`, beelden in
`C:\Users\abuis\gde-ui-critic-22-11\<scherm>_<720p|1080p|ui15>.jpg`, tripwires in `index.json`).
Scope: startkeuze, naamkaart, toestemming, moeilijkheid, oude-saves-kaart, laadscherm, afsluit-bevestiging, meldingen,
Meedoen/Samen-flow, lobby, opgeslagen spellen, benchmark, kaartkaarten (bigmoment, kaartuitleg, reispopup, foutmelding, heist).
Patronen P1 t/m P12 volgens de feedback van de eigenaar. Alle 1080p-beelden zijn bekeken; 720p en ui15 steekproefsgewijs.

## Lees dit eerst: wat het harnas hier niet goed toont

- Het harnas laadt de inline `<style>` uit `game/index.html` niet mee. Daardoor zijn `startscherm` (logo `.gde-logo`),
  `laadscherm-boot`, `samenhub`, `lobby`, `onlineinstelling`, `kaart-pitch`, `kaart-tekoop` en deels `kaart-reispopup` en
  `kaart-kaartuitleg` kaal of verkeerd geplaatst. De tekst en structuur in die beelden komen wel uit de echte module en zijn
  beoordeeld; de opmaak niet. De titel "GDEGroningenZomer vol misdaad" over het menu van `startscherm` is dus een
  harnasartefact (de logo-CSS staat in index.html), geen spelfout. `laadscherm-boot` toont "dev · NatusPella" alleen in een
  ontwikkelbuild (`startscreen.js`); een release toont het versienummer.
- `ui15` is in de beelden gelijk aan `1080p`: de ui-schaal 1,5 wordt in de pagina niet toegepast. Die kolom zegt niets.
- `kaart-naamkaart` is leeg (waarschijnlijk een animatie-begintoestand) en `kaart-heist-plan` toont een lege bouwtekening
  (geen nepdata). Niet beoordeelbaar.
- Niet in de catalogus, dus niet beoordeeld: eindkaarten, keuzekaarten en dialoogkeuze, prestatietoast, Meedoen?-vraag als
  eigen scherm. Dat het harnas geen verbonden schermen mist, is niet gecontroleerd.
- `reis-vraag` ("NaN km") en `kaart-reispopup` (vraagtekeniconen) komen mogelijk mede door nepdata (ontbrekende lengte en
  iconennamen). Een module hoort een ontbrekende waarde niet als "NaN" te tonen, dus het blijft een bevinding.

## Bevindingen

Ernst: hoog, middel, laag.

| # | Scherm | Patroon | Wat is er mis | Ernst | Voorstel |
|---|---|---|---|---|---|
| 1 | reis-vraag | P12, P8 | "NaN km" als afstand; "je verdient € 0"; elke optie herhaalt "gratis · ± 1 min"; voetregel "Snel reizen kost tijd" tegenover "gratis" | hoog | Waarde ontbreekt: regel weglaten. Eén getal per optie, geen "gratis"; voetregel schrappen |
| 2 | kaart-reispopup | P12, P3, P7 | Vraagtekens als vervoersicoon, "Trein12" en "Bus4" zonder spatie, minuscule standaardknopjes naast DS3-knoppen | hoog | Echte trein- en busicoon, "Trein 12", chips als DS3-rijen met toetsplaatje |
| 3 | reis-vraag en kaart-reispopup | P8, P6 | Twee verschillende reisdialogen (andere kop, andere optiestijl, "Reis nu" tegenover genummerde rijen) | middel | Eén reiskeuze-component voor kaart en reisvraag |
| 4 | kaart-bigmoment, -mislukt | P8, P3 | "MISSIE GESLAAGD" en "Opdracht geslaagd" zeggen hetzelfde; generieke titel in plaats van de missienaam; geen beloning in beeld; "Probeer het nog eens." generiek | hoog | Titel = missienaam, label = uitkomst, beloning als groot getal, één actie |
| 5 | kaart-bigmoment (geslaagd) | P2, P7 | Titel dof olijfbruin op geel en een lichte baan over de "O" (waarschijnlijk animatieframe); stippelpatroon bij mislukt drukt de leesbaarheid | middel | Titel in inkt op geel, sheen onder de tekst, vast frame voor de test |
| 6 | kaart-bigmoment-opgepakt | P8, P2, P1 | "BOETE" staat twee keer; bedrag € 250 is klein terwijl het het belangrijkste getal is; stempel ligt over de rand | middel | Eén label, bedrag groot, stempel binnen het kader |
| 7 | kaart-bigmoment-gebied | P3, P5 | Leeg stippelvierkant rechtsboven in plaats van een plaatje van de plek | middel | Silhouet of icoon van de plek, of het vierkant weglaten |
| 8 | coop-overlay (Verbinding weg) | P4, P6 | "Wil je het spel overnemen?" zonder knoppen; donkere glaskaart buiten DS3 | hoog | DS3-kaart met twee knoppen ("Overnemen" met toets, "Wachten") |
| 9 | samenhub | P9, P8, P1, P3 | "Stap 1 van 3: ..." zichtbaar en de ondertitel staat er nog eens; alle drie de opties dragen "KAN NU"; tekstglyphs ↔, + en . als icoon; titel "Waar speel je" zonder vraagteken; lange uitleg bij Meedoen; "Escape" als woord | hoog | Stapregel schrappen, badge alleen bij een uitzondering, DS3-iconen, uitleg achter een info-icoon |
| 10 | lobby | P1, P4 | Drie alinea's tekst, acht kleurknoppen met naam, vier gelijke knoppen (ook "Verbinding testen") naast de hoofdactie; "figuur (Blauw)" | hoog | Eén regel, kleurstippen zonder naam, één hoofdknop, rest als secundaire rij; vgl. #277 |
| 11 | toestemming-samen, online-start, onlineinstelling | P8 | Drie kaarten met dezelfde zin "Ik ga akkoord met online verbinden (mijn IP-adres wordt gedeeld)" | middel | Eén toestemmingsmoment in de flow, de rest toont alleen de stand |
| 12 | toestemming-samen, online-start | P7, P10, P6 | Standaard checkbox, kleine grijze "Meer info"-link, geen toetsplaatjes bij Akkoord en Terug (quit en moeilijkheid hebben ze wel) | middel | DS3-schakelaar, toetsplaatjes op alle knoppen |
| 13 | legacy-save-kaart | P1, P4, P10 | Vage uitleg zonder gevolg; "Doorgaan" heeft ENTER, "Nieuw spel" geen toets; geen eyebrow | middel | Eén regel gevolg ("je save blijft bewaard"), toets op beide knoppen |
| 14 | moeilijkheid-kaart | P6, P3 | "ESC standaard": start of sluit dat? Drie kaarten alleen tekst; "Aanpassen" valt uit de kaartenrij | middel | Esc = terug; per niveau drie icoonbalkjes (tijd, politie, verkeer); vgl. #1169 |
| 15 | startkeuze, quit-bevestigen, legacy-save-kaart, moeilijkheid-kaart, toestemming-samen, online-start | P2, P11 | Alle kaarten staan onderaan het scherm met een leeg bovenste deel | middel | Eerst in de echte app controleren; centreren of bewust onderaan met achtergrond |
| 16 | saveslots-start, saveslots-game | P11, P5 | Eén "Leeg"-slot bij "0 van 8", paneel voor 80% leeg | middel | Alle acht slots als raster of een compacte lege staat met plaatje |
| 17 | benchmark-keuze | P12, P4, P6 | Titel "Benchmark" is Engels; twee keuzegroepen zonder kop (twee groene tegels lijken beide gekozen); duur-pillen groter dan titels en alleen op twee tegels; "30 s" breekt over twee regels; "Annuleren ESC" en voetregel "terug ESC" dubbel | middel | "Prestatietest", groepskoppen, gelijke pillen, voetregel schrappen; vgl. #1173 |
| 18 | kaart-kaartuitleg (+ gast) | P1, P12, P10, P2 | Vier stappen tekst, "waypoint" (Engels), "LMB" zonder controllerglyph; gastzin in grotere letter dan de stappen; paneel over de volle breedte | middel | Drie icoonregels, "markering", muis- en controllerplaatje, gastregel met slotje |
| 19 | kaart-tekoop | P7, P1, P3 | Bodemkwaliteit als blokletters in een tabel van zes rijen, geen plaatje van het perceel | middel | DS3-meter, kaartfoto bovenaan, drie kernregels |
| 20 | kaart-pitch | P12, P1 | Knoplabel "Vergunning€450" aan elkaar; "1,20 (1 is een gewone drukke plek)" als ruw getal | middel | "Vergunning kopen · € 450"; drukte als drie stippen |
| 21 | harnas | P11 | Zonder index.html-CSS zijn acht schermen niet te beoordelen; ui15 gelijk aan 1080p; naamkaart leeg; eindkaarten, keuzekaarten en prestatietoast ontbreken | middel | Inline-CSS meenemen, uiScale toepassen, naamkaart na animatie vastleggen, ontbrekende schermen toevoegen |
| 22 | kaart-foutmelding | P12, P7 | "Meld je het? Kopieer dan het foutrapport." is onduidelijk; native uitklapdriehoek; kleine knoppen zonder hoofdactie | laag | "Kopieer het foutrapport en stuur het ons", DS3-uitklap, "Kopieer" primair |
| 23 | kaart-heist-notitie | P6, P12 | Arial cursief buiten de DS3-lettertypen; "Het kussen is leeg." zegt niet wat | laag | DS3-lettertype, naam van het voorwerp met icoon |
| 24 | kaart-meldingen (+ -lang, -gevaar) | P7 | Gele vlag op crème heeft laag contrast; groen balkje onderaan zonder duidelijke betekenis; vgl. #1149 | laag | Donkere rand om het icoon, balkje alleen met tijd |
| 25 | startkeuze | P6 | Cijferbadges klein; vier pijltoetsen voor twee kaarten | laag | Twee pijltoetsen |
| 26 | quit-bevestigen | P10 | Geen controllerglyph naast ENTER of J; verder rustig en goed | laag | Glyph uit de toetsplaatjeset |

Goed en laten staan: quit-bevestigen, startkeuze en moeilijkheid-kaart (kop, korte regel, duidelijke hoofdknop), de
meldingen (kort, getekend, leesbaar), "Opgepakt" (grappig en kort) en de groene eyebrow-koppen.

## Aantallen per patroon

Bevindingen met meerdere patronen tellen bij elk patroon mee.
P1: 7. P2: 4. P3: 6. P4: 4. P5: 2. P6: 7. P7: 6. P8: 6. P9: 1. P10: 4. P11: 3. P12: 7.

## Top 10

1. reis-vraag en reispopup tonen "NaN km", "?" als icoon en "Trein12" zonder spatie (#1, #2).
2. Missie geslaagd en mislukt zeggen tweemaal hetzelfde en noemen missie en beloning niet (#4).
3. "Verbinding weg" vraagt iets zonder knoppen (#8).
4. Samenhub toont "Stap 1 van 3", glyphs als icoon en een badge op elke optie (#9).
5. Lobby is een tekstmuur met veel gelijke knoppen (#10).
6. Drie toestemmingskaarten met dezelfde zin en een standaard checkbox (#11, #12).
7. Alle kaarten staan onderaan het scherm (#15, eerst in de echte app controleren).
8. Opgeslagen spellen: een leeg slot bij "0 van 8" en een leeg paneel (#16).
9. Benchmark: Engelse titel, groepen zonder kop, ongelijke pillen (#17).
10. Kaartuitleg: vier stappen tekst met "waypoint" en "LMB" (#18).

## Niet getest

Geen Electron en geen echte app bekeken; alles is gebaseerd op de harnasbeelden. Bevindingen 15 en 21 en de opmaak van 9, 10
en 20 moeten in de echte app worden bevestigd. Gamecode is niet gewijzigd.
