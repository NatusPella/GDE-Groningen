# Interieurs: in beeld te controleren (epic #1150, 21-11)

Niets hiervan is in Electron of in het echte spel gezien; de agent had alleen node-tests en een headless mock ([beeld-21-11/interieurs/](beeld-21-11/interieurs/): deurbeeld en plattegrond per soort). Ontwerp: [INTERIEURS-21-11.md](INTERIEURS-21-11.md). Tests die wel draaien: `interior_core_test`, `interior_budget_test`, `interior_look_test`, `interior_collision_test`, `interiorglass_test`.

## De deur en de gevel

1. Loop naar een winkel, een huis met open deur en een kerk: opent de vleugel, is de gevel op die plek echt opengeknipt (ook de deurglas en het kozijn), blijft er geen gat naast de deur, geen flikkering aan de rand van de snede?
2. Staat de vleugel op de plek van de getekende deur, met een passende kleur, en zwaait hij naar binnen zonder door de muur te gaan?
3. Is de deurstap (de stenen drempel) weg binnen de deuropening en loop je er zonder haperen overheen?
4. Zit er bij de deur geen straatmeubilair (fietsenrek, bankje, bak) in de weg? De clearzone van binnensets wordt hier niet gebruikt.
5. Alles is altijd open: een winkel, café of kantoor opent zijn deur ook 's nachts; een woning van een ander zit op slot (een regel bij de deur) of staat open ("open huis"); een eigen woning staat altijd open.
6. De winkelbel klinkt (geluid `shop_bell`).

## Binnen

7. Past de binnenruimte bij de buitenkant: ramen op de goede plek (de ruiten van de gevel zijn gaten met dagkanten), de hoogte, geen kruisende muren van de buren?
8. Zie je door de ruiten de straat (de exterieurmuur is van binnenuit onzichtbaar), en geen donkere "tussenruimte" van 0,3 m?
9. Klopt het raamzicht met binnen: dezelfde wandkleur, vloer en meubelsoort bij woningen (de integer-hash in de shader moet op elke GPU kloppen: kijk bij meerdere ramen), en bij winkels dezelfde kleuren en schappen?
10. Licht: leesbaar bij dag en 's nachts, geen te felle zon op de vloer door het dak (er zijn geen schaduwen binnen), geen donkere hoeken.
11. Camera: blijft binnen de muren en onder het plafond, trekt niet te dichtbij in kleine winkels, geen flits bij het binnenlopen, mouse-look werkt.
12. Collision: je glijdt langs kassa, schappen, tafels; in smalle gangen blijf je niet hangen; de tussenmuren hebben een doorloopbare opening; de trottoirrand voor de deur is geen obstakel.
13. De mensen: staan ze op de goede plek (achter de kassa, aan de bar, zittend), kijken ze de goede kant op, zijn ze zichtbaar goed gekleed per rol, en verdwijnen ze netjes bij vertrek (geen restmeshes)?
14. De E-prompts staan op de goede plek en de teksten kloppen (Kopen, Bestellen, Passen, Naar de balie, Kaarsje aansteken, Rondkijken). Opent een winkel van het spel (Stoer & Stads, Nait Duur) zijn eigen menu bij de kassa?

## Kosten en veiligheid

15. Frametijd en geheugen: loop 10 minuten door een winkelstraat, kijk naar het aantal geometrieën (leakwatch) en de fps; er mogen niet meer dan twee interieurs tegelijk bestaan en de tellers moeten terugkeren.
16. De eerste scan bij een pand (`findHall`) geeft geen hapering.
17. Sneltravel, respawn of een filmpje terwijl je binnen bent: je staat buiten zonder restanten (de collision-haak `b.walk` moet weg zijn).
18. Politie: vlucht met 2 sterren een open winkel in en kijk of de sterren sneller zakken als er niemand naast je staat.
19. Samen spelen: twee spelers in één pand zien elkaar en dezelfde kamer; een gast die later aansluit en erheen loopt ziet hetzelfde interieur.
20. Voetgangers: komt er een voorbijganger de open deur in? Zo ja, is dat acceptabel?
21. Een pand dat ook een landmark of een museum is blijft zijn handgemaakte interieur houden (geen tweede interieur erop).
22. Winkels in dorpen en de Ommelanden: heeft de gevelbouwer daar dezelfde deur; en heeft een kerk de kopgevel-deur op een plek die er logisch uitziet (de kerk heeft geen getekende deur; de vleugel is de enige)?

## Ronde 2: trap, mensen, geluid, kaart

23. Trap: loop de trap van een huis, kantoor of kleine kledingwinkel op: stijgt de speler vloeiend mee (geen sprong, geen zinken in de trede), is de leuning boven te zien en houdt hij je uit het gat, en lopen camera en prompts normaal door op de tweede verdieping? Werkt dat ook in een wereld zonder hoogtemodel (daar blijft de speler beneden)?
24. Boven: de vloer, het plafond, de ruiten van de tweede verdieping in de gevel en de mensen boven staan op de goede hoogte.
25. Rondlopers: lopen klanten zonder door meubels te gaan, draaien ze mooi bij, en lopen ze niet op een vervelende manier door jou heen?
26. Geluid: binnen klinkt de straat gedempt, het kamergeluid past bij het soort (café druk, kerk en bibliotheek stil), de deur klinkt open en dicht, de winkelbel klinkt, de kassa en de bar klinken bij kopen en bestellen.
27. Kaart: de laag "Betreedbaar" in de legenda en de volledige kaart (zoom in), de badge is leesbaar (er is geen bordje bij de deur en geen openingstijd).
28. Kapper en pashokje: de kappersstoel en het pashokje openen het menu van de winkel in het pand.
29. Politie: schuil in een open pand; de sterren zakken sneller als niemand binnen 9 m is.
30. Beppe-huis: de verhaalboog is ongewijzigd, het binnengeluid en de politiezichtlijnen tellen mee.
31. Eerste scan: loop snel langs veel panden: geen hapering van het plan (2 tot 9 ms, hoogstens een per scan).

## Ronde 3: mensen met werk, inrichting, ramen, balie

32. Mensen: kijk in een winkel, café, kantoor, kerk, bibliotheek, station, garage en woning: doen ze iets herkenbaars (afrekenen, schappen aanvullen, een bestelling brengen, typen, knielen, lezen, sleutelen, koken)? Kloppen de houdingen (zitten op de stoel zonder erdoorheen, bukken bij een laag schap, de handen van de winkelier), draaien ze mooi bij en staan er niet twee op één stoel?
33. Wachtrij: lopen klanten naar de kassa en blijven ze netjes achter elkaar staan?
34. Inrichting: de hangende lampen, schilderijen, klokken, prikborden, posters en menukaarten zien er goed uit; het licht is warm in een café en koud wit in een kantoor; de deurmat ligt goed.
35. Ramen: loop op een winkel of café af: vanaf ongeveer 24 m verschijnt het echte interieur door de ruiten (indeling, kleur, mensen) in plaats van de nepkamer; is de overgang (een flits of een sprong in beeld) acceptabel, zijn de randen van de snede in het glas netjes, en zie je geen gaten naast de ruiten in een pand dat smaller is dan zijn gevel?
36. Kopen aan de balie: bij een winkel of café met een interieur is de marker op straat weg en werkt E alleen aan de balie; bij een pand zonder interieur (kiosk, te klein) werkt de marker nog; de kaartmarker en de missiedoelen wijzen nog naar de deur.

## Ronde 5: kamertoon, nieuwe panden, dekking

37. Museum, bioscoop, school, ziekenhuis en kapel: loop er naar binnen (een kerk met bouwtype chapel, een school, een ziekenhuis, een museum of bioscoop uit de provincie). Staan vitrines, schilderijen, schermen en stoelen goed, zijn de kamers (klaslokaal, afdeling, zaal) bereikbaar door de deuropening, en zien de mensen eruit en doen ze wat bij de plek hoort (leraar bij het bord, arts op de afdeling, bezoekers voor de vitrines)?
38. Bioscoop: is het scherm in de zaal lichtgevend zonder dat het hapert, en klopt de kleur van de rode stoelen met de donkere muur? (Het scherm is een bord met `glow`; nooit in beeld bekeken.)
39. Aan de balie: museumkaartje en filmkaartje met popcorn kosten geld en geven (bij de film) een beetje gezondheid; de regel van het loket past bij de plek.
40. Muziek binnen: zet de radio of G-Music aan en loop een kerk, een woning en een café in: klinkt de muziek in een kerk dofst, in een woning het helderst, en komt hij bij het naar buiten lopen weer open? Is de overgang (laagdoorlaat in 0,4 s) prettig, niet hoorbaar als een klik?
41. Kamertoon: klinkt een garage of magazijn met een zachte brom, een school en sportschool met gemurmel, een museum en kapel stil? (De niveaus staan als data in `sfx/binnenklank.js`; nooit gehoord.)
42. Woningen met de deur aan de rand: staan er nog huizen waar de keuken of slaapkamer niet te bereiken is? (Gevonden met de dekkingsaudit; de test dekt het, het beeld niet.)
