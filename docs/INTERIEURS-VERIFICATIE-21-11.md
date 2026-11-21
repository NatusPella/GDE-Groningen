# Interieurs: in beeld te controleren (epic #1150, 21-11)

Niets hiervan is in Electron of in het echte spel gezien; de agent had alleen node-tests en een headless mock ([beeld-21-11/interieurs/](beeld-21-11/interieurs/): deurbeeld en plattegrond per soort). Ontwerp: [INTERIEURS-21-11.md](INTERIEURS-21-11.md). Tests die wel draaien: `interior_core_test`, `interior_budget_test`, `interior_look_test`, `interior_collision_test`, `interiorglass_test`.

## De deur en de gevel

1. Loop naar een winkel, een huis met open deur en een kerk: opent de vleugel, is de gevel op die plek echt opengeknipt (ook de deurglas en het kozijn), blijft er geen gat naast de deur, geen flikkering aan de rand van de snede?
2. Staat de vleugel op de plek van de getekende deur, met een passende kleur, en zwaait hij naar binnen zonder door de muur te gaan?
3. Is de deurstap (de stenen drempel) weg binnen de deuropening en loop je er zonder haperen overheen?
4. Zit er bij de deur geen straatmeubilair (fietsenrek, bankje, bak) in de weg? De clearzone van binnensets wordt hier niet gebruikt.
5. Dichte deur 's nachts: de regel "Gesloten. Open vanaf ..." verschijnt een keer per nadering; een woning op slot geeft een grap.
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
