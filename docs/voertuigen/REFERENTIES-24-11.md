# Referenties voor voertuigen (24-11)

Alleen gelezen om maten, verhoudingen en herkenningspunten te bepalen; er is niets gedownload of overgenomen, en in het spel staan
alleen verzonnen namen (Fjord Escapade, Korenwolf). Maten zijn afgerond; wat de bron niet gaf staat als "niet gevonden".

| Voertuig | Bron | Maten (echt) | Herkenningspunten | Maat in het spel |
|---|---|---|---|---|
| Bestelbus (middelgroot) | https://www.carwow.co.uk/editorial/commercial-vehicles/types-and-classifications/van-size-guide en https://en.wikipedia.org/wiki/Volkswagen_Transporter_(T6) | lengte 4,9 tot 5,3 m, breedte ca. 1,9 m (zonder spiegels), hoogte 2,0 tot 2,5 m, wielbasis 3,0 tot 3,4 m | korte neus, vlakke zijkant met schuifdeur, tweede spiegelset, achterdeuren, laadvloer op ca. 0,55 m | 5,0 x 2,0 x 2,08 m |
| Bestelbus (groot) | https://vanreviewer.co.uk/volkswagen/crafter/dimensions/9651/ | lengte 6,0 tot 7,4 m, breedte 2,04 m (2,43 m met spiegels), hoogte 2,36 tot 2,80 m | hoog dak, schuifdeur, verhoogde cabine | niet gebruikt |
| Ambulance (busuitvoering) | https://brauninternational.com/product/mercedes-sprinter-ambulance/ en https://www.flsheriffs.org/uploads/demersfsa09exesprintervan.pdf | 5,9 x 2,0 x 2,84 m, wielbasis 3,66 m (andere uitvoering: 6,17 m lang, wielbasis 3,66 m) | hoog dak, lichtbalk op de cabine, reflecterende blokken, achterdeuren, laadvloer 0,7 m | 5,6 x 2,0 x 2,6 m |
| Stationwagen | niet opgezocht (bekende maten van een middenklasse-stationwagen: 4,5 tot 4,8 m lang, 1,8 m breed, 1,5 m hoog) | zie VOERTUIG_NORM in propregister.js | dakrails, lange achterruit, klep | 4,5 x 1,8 x 1,5 m |
| Trekker (ca. 100 pk) | https://www.tractordata.com/farm-tractors/010/3/7/10379-new-holland-powerstar-100-dimensions.html en https://www.tractordata.com/farm-tractors/009/3/6/9368-zetor-forterra-100-dimensions.html | lengte 4,1 tot 4,7 m, breedte 1,9 m, wielbasis 2,3 tot 2,5 m, cabinehoogte 2,6 tot 2,8 m, achterband ca. 1,5 m doorsnee | afgeronde kap die naar voren afloopt, grille met koplampen, frontgewichten, grote achterwielen met noppen, spatborden, uitlaatpijp, zwaailicht | 4,3 x 2,3 x 2,9 m, wielbasis 2,45 m, achterwiel 1,76 m |
| Quad (landbouw) | https://www.cfmoto.co.uk/atv/cforce-520/ en https://mchaleagri.ie/shop/honda-quads-mayo-ireland-connacht/honda-trx520fm6/ | 2,1 tot 2,3 m lang, 1,15 tot 1,3 m breed, 1,2 m hoog, wielbasis 1,29 m, zithoogte 0,87 tot 0,93 m | brede spatborden over elk wiel, tank voor de zitting, bagagerekken voor en achter, stuur met kap | 2,1 x 1,2 x 1,3 m |
| Stadsbus | https://en.wikipedia.org/wiki/Scania_Citywide en https://en.wikipedia.org/wiki/Solaris_Urbino_18 | 12 m of 18 m lang (geleed), breedte 2,55 m, hoogte 2,85 tot 3,4 m; wielbasis niet gevonden | lage vloer, twee of drie dubbele deuren, groot voorraam, bestemmingsbord, dakunits | 11,2 m + 6,8 m aanhanger, 2,55 breed |
| Sprinter (trein) | https://en.wikipedia.org/wiki/Sprinter_Lighttrain | 69,4 m (vier wagens) of 100,5 m (zes), breedte 2,84 m; hoogte niet gevonden (de nieuwere generatie is 2,88 x 4,3 m) | afgeronde kop, brede deuren, getrapte vloer | zie railway3d.js |
| Foodtruck, vrachtwagen (bakwagen), laadmachine, maaidorser, scooter, fiets, bakfiets, tram, boten | nog niet opgezocht in deze ronde | zie voertuigschaal_test.mjs voor de maten in het spel | | |

Regels voor de bouw (stijl): lage polygoncount maar geen krap budget (hoofdvoertuigen 2.500 tot 7.500 driehoeken op niveau 0), vlakke
vertexkleuren zonder textuur, afgeronde grote vlakken met vaste facetten (`extrudeProfile` met bevel), dikke wielen, ruiten als donker
glas, spiegels, bumpers en lampen als blokjes in een contrastkleur. Meer detail wordt gekocht met geometrie (bogen, stijlen, rekken),
niet met textuur; de lichtere niveaus komen uit het centrale LOD-systeem (`vehiclelod3d.js`, soort `vehicle`).
