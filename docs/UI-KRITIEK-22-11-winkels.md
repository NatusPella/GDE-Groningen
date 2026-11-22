# UI-kritiek 22-11: winkels, balies en bezit

Beoordeling van de harnasbeelden (branch `ui-kritiek-harnas-22-11`, beelden in `C:\Users\abuis\gde-ui-critic-22-11\`) voor winkels, Spullen, Garage, Land en bedrijf en de standplaats- en te-koopkaarten. Patronen P1 tot en met P12 komen uit de eigenaar-feedback. Alles is bekeken op 1080p; 720p alleen waar vermeld. Geen gamecode gewijzigd.

Bekeken: `winkel-snackbar`, `winkel-kleding`, `winkel-wapens`, `winkel-voertuigen`, `pauze-spullen`, `pauze-garage`, `pauze-boerderij-*` (overzicht, boerderij, bedrijven, tekoop, snack, club), `kaart-pitch`, `kaart-tekoop`.

**Niet beoordeeld (zit niet in het harnas):** telefoon met apps, vertrekbord/OV, tuning-showroom, kast, pashokje, kapper, spullendetail als los scherm. Ook niet te zien in statische beelden: controllerbediening (P10) en toetsplaatjes per apparaat. Zie bevinding 25.

**Harnasbeperkingen:** `kaart-pitch` en `kaart-tekoop` zijn zonder DS3-CSS gerenderd (kale browseropmaak); alleen de inhoud is beoordeeld. De `ui15`-beelden zijn niet apart beoordeeld; bij steekproef lijken ze op 1080p.

## Bevindingen

Ernst: hoog, middel, laag. Beeldnamen: `<scherm>_<720p|1080p|ui15>.jpg` in de beeldmap.

| # | Scherm | Patroon | Wat is er mis | Ernst | Voorstel |
|---|---|---|---|---|---|
| 1 | winkel-voertuigen, winkel-kleding | P2 | Op 720p worden bijna alle autonamen afgekapt ("Reitdiep...", "Dollard K...", "Wadden..."); op 1080p staan 7 (voertuigen) en 3 (kleding) omschrijvingen op "..." (tripwire afgekapt). De keuze tussen auto's is niet te maken zonder de naam. | hoog | Naam altijd volledig (twee regels toestaan), omschrijving weg uit de lijstrij (staat al in het detail), pill op de rij compact. |
| 2 | winkel-voertuigen | P2 | Detailpaneel is onderaan afgesneden: de onderrand van het kader ontbreekt en het kopen-blok zit tegen de rand, terwijl de lijst links wel doorloopt. | hoog | Detailkolom laten meegroeien of intern scrollen met een vaste kopen-balk; statbalken compacter. |
| 3 | winkel-kleding | P3 | Preview toont een kleine hele pop (set "Groen-wit") in een leeg puntkader in plaats van het kledingstuk of de set. Lijstminiaturen zijn voor elke rij hetzelfde zwarte shirt-icoon. | hoog | Per set de stukken als kleine plaatjes en een grote preview van het stuk; miniaturen per stuk uit de itemrender. |
| 4 | pauze-spullen | P3 | Zes van de tegels (Stadjerspet, Stoppelbaardje, Jack, Spijkerbroek, Gympen en de set) tonen dezelfde hele pop; het kledingstuk is niet te zien. Het label "Kleding" en "Aan" moeten het werk doen. | hoog | Item-eigen render per stuk (zoals Eierballen en Spaarkaart al hebben); bij een set de stukken als mozaiek. |
| 5 | pauze-garage | P12, P3, P8 | Eigen auto heet "Voertuig" (naam niet gevuld), "Afgeschreven" staat dubbel (tegel en detailkop plus pill), de tegelminiatuur is bruin terwijl preview en kop rood zijn. Het hele detailkader kleurt rood voor een statuslabel. | hoog | Naam uit het voertuigmodel of de eigen naam; een statuslabel; een kleurbron voor miniatuur en preview. |
| 6 | pauze-garage | P5 | Zes van zeven categorietabs zijn leeg: BUSSEN 0, FIETSEN 0, SCOOTERS 0, BOTEN 0, LUCHT 0, SPECIAAL 0. | middel | Tabs met 0 verbergen of dempen. |
| 7 | pauze-garage | P2 | Detailkolom onderaan afgesneden midden in een kopje ("UITVOERING"); de lijst Te koop eindigt in een afgesneden rij zonder scrollindicatie. 17 bijna identieke auto's (alleen de kleur verschilt). | middel | Interne scroll met DS3-scrollbalk; Te koop per model groeperen met kleurstippen. |
| 8 | pauze-garage | P6, P7 | "Toon: alles" en "Op naam" zijn kale tekst zonder knopvorm; onduidelijk dat ze klikbaar zijn. In Spullen is hetzelfde een echte chip ("Sorteren: standaard"). | middel | Dezelfde chip-component als Spullen. |
| 9 | pauze-boerderij-boerderij | P4, P6, P8 | Twee tabrijen boven elkaar (Overzicht/Boerderij/Bedrijven... en daarbinnen Overzicht/Percelen/Erf/Gewas/Machines/Kasboek/Bank) met verschillende stijl, dan een banner BOERENZAKDOEK, een groenkop "Boerderij De Zonnehoek", de kop "Overzicht" en een kaart "Begin je boerderij". Vier kopniveaus voor de hoofdactie. | hoog | Eén tabrij; subtabs als segmentbalk; banner en kopjes samenvoegen. |
| 10 | pauze-boerderij-boerderij | P8, P2 | "Vandaag speldag 1" en "Vandaag: Aardappelen..." eronder zeggen twee keer "Vandaag". Het stappenlint (1 PLOEGEN, 2 ZAAIEN...) is onderaan afgesneden. | middel | Eén regel "Vandaag"; stappenlint volledig tonen, huidige stap uitlichten. |
| 11 | pauze-boerderij-overzicht | P7 | Vier native `select`-elementen (Sorteren, Streek, Soort, Beheer) met browseropmaak en systeemletter, niet DS3. | hoog | DS3-chips of de keuzelijst-component uit Instellingen. |
| 12 | pauze-boerderij-overzicht | P1, P11, P6 | Lappen uitlegtekst voor lege secties (Nieuws, Personeel, Vee, Ketens), tegels 0 0 0 EUR0 zonder plaatje. Kopjes staan in de standaard lichte sans, niet in de DS3-kopfont. "Stel beginner aan - EUR70" enz. zijn vette tekstregels, geen knoppen. | hoog | Lege staten met icoon en een knop; echte knoppen voor personeel; DS3-kop. |
| 13 | pauze-boerderij-snack | P12 | Tegel "Naam" toont "50": dat getal is de reputatie (`effRep`, `snackui.js:101`). | hoog | Label "Reputatie". |
| 14 | pauze-boerderij-snack, pauze-boerderij-bedrijven | P6, P7 | "Koop een snackwagen", "Neem over" en "Koop" zijn lichtgrijs op beige (contrast 1,95, tripwire) en lijken uitgeschakeld; het zijn geen herkenbare knoppen. "Doel" staat als label voor elke rij zonder betekenis. | hoog | DS3-knop (geel hoofd, groen secundair); alleen echt uitgeschakeld bij te weinig geld, met reden. |
| 15 | pauze-boerderij-snack | P1, P8 | Drie alinea's uitleg boven de lijst, prijs twee keer per rij (tekst en knop), geen plaatje of kaartpositie per standplaats. | middel | Standplaatsen als kaartrijen; uitleg als een regel. |
| 16 | pauze-boerderij-bedrijven | P8 | Sectie Snackwagen herhaalt de tab Snackwagen (met dezelfde Koop-knop). De introregel staat tegen de kop aan. | middel | Een plek voor de snackwagen; hier een verwijzing. |
| 17 | pauze-boerderij-tekoop | P11 | Lege staat in een dubbelzinnige zin ("De index ... wordt geladen, of er is niets te koop") en 600 px leegte. De speler weet niet of het laadt of leeg is. | middel | Twee toestanden: laden en leeg (icoon plus knop naar de kaartlaag Te koop). |
| 18 | pauze-boerderij-club | P11 | Lege staat zonder plaatje, een tekstregel. | laag | Zelfde lege-staat-patroon als 17. |
| 19 | winkel-snackbar, -kleding, -wapens, -voertuigen | P8 | De pill KAN IK KOPEN staat op elke rij en in de detailkop, naast "Kopen voor EUR120". De prijs staat vier keer (rij, "Na aankoop", groot bedrag, knop). De detailkop herhaalt de winkelnaam in plaats van het gekozen item. | middel | Pill alleen bij uitzondering (TE DUUR, HEB IK AL); een prijs; detailkop is de categorie. |
| 20 | winkel-snackbar | P8 | "+8 gezondheid" staat twee keer als tekst en nog eens in de balk "80 -> 88"; los regeltje "Gezondheid nu 80" boven de lijst. | middel | Alleen de balk. |
| 21 | winkel-wapens, -voertuigen, -snackbar | P3, P5 | Preview-kader is een leeg puntkader met een klein voorwerp (pistool ca. 70 px). Lijstminiaturen zijn voor iedereen hetzelfde icoon (pistool, auto, brood); een kleurstip naast elke auto i.p.v. een mini-render. | middel | Preview schalen op de inhoud; miniatuur uit dezelfde render. |
| 22 | winkel-wapens | P12 | Omschrijving van het Jachtgeweer toont letterlijk "{RMB}" ("Met kijker: houd {RMB} vast"); `shopui.js:317` zet `textContent` zonder de placeholder te vervangen (tekst in `shops.js:81`). | hoog | Placeholder vervangen door een toetsplaatje of de zin zonder toets herschrijven. |
| 23 | kaart-pitch, kaart-tekoop | P12, P3 | Knop toont "Vergunning EUR450" zonder spatie (twee spans naast elkaar); "Bodem goed" met tekenblokken als balk; "Drukte 1,20 (1 is een gewone drukke plek)" is jargon. | middel | Spatie en prijs rechts in de knop; echte balk; "Drukke plek" met pictogram. |
| 24 | winkels en pauzemenu | P6, P10 | Toetsbalk in winkels toont omlijnde pijlen en "Enter" als tekst; in het pauzemenu gevulde pijlblokjes en een ENTER-glyph. De Enter-hint in de gele knop is 12 px. Controllerplaatjes niet te zien in het harnas. | middel | Een toetsplaatje-component overal; hint in de knop groter. |
| 25 | harnas | P10, P11 | Telefoon, vertrekbord/OV, tuning-showroom, kast, pashokje en kapper zitten niet in het harnas en zijn onbeoordeeld. | middel | Die schermen in het harnas opnemen met een fixture. |
| 26 | pauze-spullen | P1, P5 | Detailtekst van "Geld" is een lap uitleg; "Terugzetten" is een los label rechts zonder icoon; "Bezit - 1 van 3" in de hoek is nauwelijks leesbaar. | laag | Een regel; icoonknop; paginering als stippen. |
| 27 | winkel-kleding | P1 | Introtekst "Alle stukken in een keer..." boven de sets (twee regels). | laag | Een regel of tooltip. |
| 28 | pauze-boerderij-boerderij | P2 | 18 overlap-tripwires (decoratieve svg over tekst); de hoofdknop "Zet de akker op de kaart" snijdt de kaartrand rechtsonder. | laag | Hoofdknop 8 px binnen de kaart. |
| 29 | pauze-nav (alle schermen) | P9 | Zijbalk toont "Cheats" en de voetregel "ontwikkelversie" aan de speler. Buiten mijn scope, alleen genoteerd. | laag | Cheats achter het ontwikkelaarsmenu. |

## Tripwires uit index.json (1080p)

winkel-voertuigen: afgekapt 7, leeg 15; winkel-kleding: afgekapt 3, leeg 24 (lege `i`-icoonelementen); pauze-spullen: contrast 10; pauze-garage: leeg 2; pauze-boerderij-boerderij: overlap 18, tekstmassa 1; pauze-boerderij-snack: contrast 16 (knoppen 1,95), tekstmassa 1; kaart-pitch en kaart-tekoop: contrast 6 en 13 (komt door de ontbrekende CSS in de render). `b#pm-title` "afgekapt" is een bewust verborgen schermlezerkop en geen bevinding.

## Top 10

1. Winkel-voertuigen: afgekapte namen en omschrijvingen, detailpaneel afgesneden (1, 2).
2. Snackwagen: "Naam 50" en acties die uitgeschakeld lijken (13, 14).
3. Land en bedrijf Overzicht: native selects en lappen tekst voor lege secties (11, 12).
4. Land en bedrijf Boerderij: twee tabrijen en vier kopniveaus voor de hoofdactie (9).
5. Spullen: dezelfde hele pop op zes tegels (4).
6. Kledingwinkel: hele pop als preview in plaats van het kledingstuk (3).
7. Garage: eigen auto heet "Voertuig", dubbel "Afgeschreven", afwijkende kleur (5).
8. Winkelwapens: letterlijk "{RMB}" in de tekst (22).
9. Winkels: KAN IK KOPEN en prijs drie tot vier keer per scherm (19).
10. Garage: zes lege categorietabs en tekst als bediening (6, 8).

## Aantallen per patroon

Een bevinding met meer patronen telt bij elk patroon mee. P1: 4. P2: 5. P3: 5. P4: 1. P5: 3. P6: 5. P7: 3. P8: 7. P9: 1. P10: 2. P11: 4. P12: 4. Dubbele informatie (P8), generiek beeld (P3) en afkapping (P2) wegen het zwaarst in deze scope.

## Issues

Titels op het bord eindigen op "(UI-kritiek)". Het repo heeft `impact-midden` en geen `impact-middel`; ernst middel is daarom `impact-midden`. Er bestaat geen `ui`-label. Verwant en niet vervangen: #1013 (Boerderij- en Spullen-schermen visueel verfijnen), #1147 (Spullen: galerij van 3D-plaatjes), #1086 (Spullen: 3D-model bij elk ding), #999 (DS3: winkels en andere v2-schermen).

Niet getest: alles hierboven is op beelden bekeken; geen scherm in het echte spel gezien en geen controller geprobeerd.
