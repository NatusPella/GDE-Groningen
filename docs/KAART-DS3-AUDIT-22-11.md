# Kaart en DS3: audit van alle markers en lagen (22-11, #1009)

Vraag van de eigenaar: zijn de iconen op de kaart al aangepast aan Design System v3 (iconenset, kleuren)? Dit document is de audit; de data staat in
`scripts/lib/kaart_audit.mjs` en `scripts/kaart_ds3_test.mjs` loopt hem na. Het document wordt gemaakt door `node scripts/kaart_audit_doc.mjs --write`.

## Voor en na

| | voor (21-11) | na (22-11) |
|---|---|---|
| soorten met een Phosphor-icoon | ca. 45 van 150 (de rest: getekende glyph, uitgesneden uit een eigen tekening) | 121 van 150 |
| bewust eigen teken (met reden) | niet vastgelegd | 29 |
| badgevulling uit DS3-tokens | ja (vijf rollen) | ja, zelfde rollen |
| basiskaart | donker glas, crème wegen | crème papier, inktlijnen (docs/KAART-PALETTEN-22-11.md) |
| ruwe hex in kaartcode buiten de palettabellen | niet gemeten | 0 (test) |
| vormen kleurenblind | station en horeca delen een vorm, flitspaal en winkel ook | alle paren met dezelfde vorm liggen minstens 25 apart bij elke kleurenblindheid |

## Markers

Kolommen: soort, categorie (mapicons.js), icoonbron, vorm, kleurtoken, zichtbaar vanaf zoom, legendarij.

| soort | categorie | icoon | vorm | kleur | zoom | legenda |
|---|---|---|---|---|---|---|
| player | player | eigen (pijl die draait met je richting; een icoon kan niet draaien ) | pijl | licht-groen | 0 | Jij |
| partner | partner | eigen (vorm en kleur per medespeler (kleurenblind: nooit alleen kle) | zestien vormen per speler | id-1..8 | 0 | Jij |
| companion | companion | Phosphor: speler | cirkel | ink-bord | 1.6 | Jij |
| cash | police | Phosphor: geld | cirkel | ink-geel | 0 | Politie-eenheid |
| userWaypoint | goal | eigen (de paarse pin van je eigen doel: het ene teken dat altijd pa) | pin | a11y-palet | 0 | Jouw waypoint |
| missionIdle | mission | eigen (de gele ring van een missie die wacht: een doelmarkering, ge) | ring | ink-geel | 0 | Verhaal |
| missionActive | goal | eigen (de gele ring met stip van je actieve doel; pulseert 250 ms, ) | ring met stip | ink-geel | 0 | Verhaal |
| waypoint | mission | eigen (het kleine gele punt van een verhaalstap) | stip | ink-geel | 0 | Verhaal |
| eierbalTip | tip | Phosphor: ei | circle | creme | 4 | Verhaal |
| own | own | eigen (je eigen voertuig in de kleur van je voertuig, met het voert) | cirkel met ring | voertuigkleur | 0.6 | Jouw voertuigen |
| home | home | Phosphor: thuis | cirkel | blauw | 0 | Thuis |
| homeGarage | home | Phosphor: garage | eigen | eigen | 0 | Thuis |
| homeMooring | home | Phosphor: anker | eigen | eigen | 0 | Thuis |
| homeHelipad | home | Phosphor: helikopter | eigen | eigen | 0 | Thuis |
| garage | garage | Phosphor: gereedschap | hex | WATER_BLAUW (gemengd met inkt 10 procent) | 1.1 | Garage en pomp |
| hospital | zorg | Phosphor: ehbo | circle | ink-bord (gemengd met licht-groen 10 procent) | 0.9 | Ziekenhuis en huisarts |
| politiebureau | politiebureau | Phosphor: politie | shield | rood-glas (gemengd met inkt 18 procent) | 0.9 | Politiebureau |
| station | station | Phosphor: trein | pill | WATER_BLAUW (gemengd met inkt 10 procent) | 0 | Treinstation |
| ov-halte | station | Phosphor: bus | pill | WATER_BLAUW (gemengd met inkt 10 procent) | 0 | Bushalte |
| livebus | other | Phosphor: bus | circle | creme | 2 | Live bus |
| roosterbus | other | Phosphor: bus | circle | creme | 2 | Rooster |
| horeca | horeca | Phosphor: eten | squircle | ink-bord (gemengd met licht-groen 10 procent) | 6 | Horeca |
| flitspaal | flitspaal | Phosphor: camera | octagon | rood-glas (gemengd met inkt 18 procent) | 4 | Flitspaal |
| landmark | other | Phosphor: ster | circle | creme | 2 | Bezienswaardigheid |
| uitkijkpunt | ommeland | Phosphor: verrekijker | eigen | eigen | 0.34 | Uitkijkpunten |
| beppe | ommeland | Phosphor: stoel | pin | WATER_BLAUW (gemengd met inkt 10 procent) | 0.34 | Ommeland |
| police | police | eigen (de blauwe politie-eenheid die beweegt (te voet, fiets, paard) | schild | a11y-palet | 0 | Politie-eenheid |
| policeFoot | police | eigen (de blauwe politie-eenheid die beweegt (te voet, fiets, paard) | eigen | eigen | 0 | Politie-eenheid |
| policeBike | police | eigen (de blauwe politie-eenheid die beweegt (te voet, fiets, paard) | eigen | eigen | 0 | Politie-eenheid |
| policeHorse | police | eigen (de blauwe politie-eenheid die beweegt (te voet, fiets, paard) | eigen | eigen | 0 | Politie-eenheid |
| dorp | ommeland | Phosphor: veroverd | pin | WATER_BLAUW (gemengd met inkt 10 procent) | 0.34 | Ommeland |
| dorpKlaar | ommeland | Phosphor: vlag | pin | WATER_BLAUW (gemengd met inkt 10 procent) | 0.34 | Ommeland |
| wereldeinde | ommeland | Phosphor: wereldbol | pin | WATER_BLAUW (gemengd met inkt 10 procent) | 0.34 | Ommeland |
| perceel-koop | ommeland | eigen (een perceel is een vlak met een letter voor zijn stand (B, S) | pin | WATER_BLAUW (gemengd met inkt 10 procent) | 0.34 | Percelen |
| perceel-huur | ommeland | eigen (een perceel is een vlak met een letter voor zijn stand (B, S) | pin | WATER_BLAUW (gemengd met inkt 10 procent) | 0.34 | Percelen |
| perceel-eigen | home | eigen (een perceel is een vlak met een letter voor zijn stand (B, S) | eigen | eigen | 0 | Percelen |
| perceel-eigen-rijp | home | eigen (een perceel is een vlak met een letter voor zijn stand (B, S) | eigen | eigen | 0 | Percelen |
| perceel-machine | home | eigen (een perceel is een vlak met een letter voor zijn stand (B, S) | eigen | eigen | 0 | Percelen |
| perceel-afnemer | home | eigen (een perceel is een vlak met een letter voor zijn stand (B, S) | eigen | eigen | 0 | Percelen |
| pigeon | fun | Phosphor: duif | circle | creme | 1.6 | Minigames |
| heli | fun | Phosphor: helikopter | circle | creme | 1.6 | Minigames |
| padel | fun | Phosphor: padel | circle | creme | 1.6 | Minigames |
| onderdeel | fun | Phosphor: tandwiel | circle | creme | 1.6 | Minigames |
| wrakduik | fun | Phosphor: anker | circle | creme | 1.6 | Minigames |
| streekuitdaging | fun | Phosphor: route | circle | creme | 1.6 | Minigames |
| pg-jelle | fun | Phosphor: hart_vol | circle | creme | 1.6 | Minigames |
| pg-fjord | fun | Phosphor: eten | circle | creme | 1.6 | Minigames |
| mi-0 | mission | eigen (missie- en doelmarkers: ringen, pijlen en nummers uit navtar) | ring | eigen | 0 | Verhaal |
| ma-0 | goal | eigen (missie- en doelmarkers: ringen, pijlen en nummers uit navtar) | ring | eigen | 0 | Verhaal |
| sj-target | goal | eigen (het doel van een bijbaan: een doelmarkering in de kleur van ) | eigen | eigen | 0 | Verhaal |
| sj-dot | mission | eigen (de stip van een bijbaan onderweg: een doelmarkering, geen pl) | eigen | eigen | 0 | Verhaal |
| mm-gevaar | gevaar | eigen (missie- en doelmarkers: ringen, pijlen en nummers uit navtar) | eigen | eigen | 0 | Verhaal |
| mm-rival | rival | eigen (missie- en doelmarkers: ringen, pijlen en nummers uit navtar) | eigen | eigen | 0 | Verhaal |
| mm-halte | halte | eigen (missie- en doelmarkers: ringen, pijlen en nummers uit navtar) | eigen | eigen | 0 | Verhaal |
| mm-ring | halte | eigen (missie- en doelmarkers: ringen, pijlen en nummers uit navtar) | eigen | eigen | 0 | Verhaal |
| mm-pad | halte | eigen (missie- en doelmarkers: ringen, pijlen en nummers uit navtar) | eigen | eigen | 0 | Verhaal |
| mm-brug | halte | eigen (missie- en doelmarkers: ringen, pijlen en nummers uit navtar) | eigen | eigen | 0 | Verhaal |
| mm-subdoel | subdoel | eigen (missie- en doelmarkers: ringen, pijlen en nummers uit navtar) | eigen | eigen | 0 | Verhaal |
| mm-hulp | subdoel | eigen (missie- en doelmarkers: ringen, pijlen en nummers uit navtar) | eigen | eigen | 0 | Verhaal |
| shop-wapens | shop | Phosphor: doel | tile | ink-bord (gemengd met licht-groen 10 procent) | 2 | Wapens & pandjeshuis |
| shop-pand | shop | Phosphor: gebouw | tile | ink-bord (gemengd met licht-groen 10 procent) | 2 | Wapens & pandjeshuis |
| shop-kleding | shop | Phosphor: kleding | tile | ink-bord (gemengd met licht-groen 10 procent) | 2 | Winkels |
| shop-kapper | shop | Phosphor: schaar | tile | ink-bord (gemengd met licht-groen 10 procent) | 2 | Winkels |
| shop-tabak | shop | Phosphor: sigaret | tile | ink-bord (gemengd met licht-groen 10 procent) | 2 | Winkels |
| shop-super | shop | Phosphor: kar | tile | ink-bord (gemengd met licht-groen 10 procent) | 2 | Winkels |
| shop-snack | shop | Phosphor: burger | tile | ink-bord (gemengd met licht-groen 10 procent) | 2 | Winkels |
| shop-fietsen | shop | Phosphor: fiets | tile | ink-bord (gemengd met licht-groen 10 procent) | 2 | Voertuigwinkels |
| shop-fietsenmaker | shop | Phosphor: gereedschap | tile | ink-bord (gemengd met licht-groen 10 procent) | 2 | Voertuigwinkels |
| shop-auto | shop | Phosphor: auto | tile | ink-bord (gemengd met licht-groen 10 procent) | 2 | Voertuigwinkels |
| shop-tuning | shop | Phosphor: tandwiel | tile | ink-bord (gemengd met licht-groen 10 procent) | 2 | Voertuigwinkels |
| shop-boot | shop | Phosphor: boot | tile | ink-bord (gemengd met licht-groen 10 procent) | 2 | Voertuigwinkels |
| shop-spuit | shop | Phosphor: spuit | tile | ink-bord (gemengd met licht-groen 10 procent) | 2 | Winkels |
| shop-eikea | shop | Phosphor: stoel | tile | ink-bord (gemengd met licht-groen 10 procent) | 2 | Winkels |
| shop-heli | shop | Phosphor: helikopter | tile | ink-bord (gemengd met licht-groen 10 procent) | 2 | Voertuigwinkels |
| sj-bezorger | job | Phosphor: pakket | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-krantenwijk | job | Phosphor: krant | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-taxi | job | Phosphor: taxi | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-bus | job | Phosphor: bus | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-rondvaart | job | Phosphor: boot | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-fietsdepot | job | Phosphor: fiets | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-verhuizing | job | Phosphor: vrachtwagen | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-rondvaarttour | job | Phosphor: boot | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-boa | job | Phosphor: schild | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-rechtbank | job | Phosphor: rechter | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-cabaret | job | Phosphor: podium | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-vracht | job | Phosphor: oplegger | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-loket | job | Phosphor: stempel | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-studiestaat | job | Phosphor: studie | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-vigilantia | job | Phosphor: verrekijker | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-promotie | job | Phosphor: promotie | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-kamerkoning | job | Phosphor: kroon | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-wolkenhal | job | Phosphor: wolk | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-helix | job | Phosphor: gebouw | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-niemeyer | job | Phosphor: gebouw | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-bernard | job | Phosphor: auto | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-energielabel | job | Phosphor: energie | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-tjalke | job | Phosphor: boot | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-lijn | job | Phosphor: bus | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-fietssoep | job | Phosphor: kookpot | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-taxinacht | job | Phosphor: taxi | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-balenrit | job | Phosphor: tractor | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-berging | job | Phosphor: auto | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-schoolrit | job | Phosphor: bus | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-melkrit | job | Phosphor: koe | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-veerdienst | job | Phosphor: boot | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-zeeschipwad | job | Phosphor: boot | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-zeeschipeems | job | Phosphor: boot | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-strandpost | job | Phosphor: tent | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-kermisdraai | job | Phosphor: reuzenrad | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-brugdienst | job | Phosphor: anker | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-museumbus | job | Phosphor: bus | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-suikerbieten | job | Phosphor: gewas | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-herstelploeg | job | Phosphor: gereedschap | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-oogtv | job | Phosphor: camera | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-telefoonrave | job | Phosphor: telefoon | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-vandermeden | job | Phosphor: gebouw | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-schouwburg | job | Phosphor: kaartje | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-bernardrit | job | Phosphor: auto | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-vismarktkoerier | job | Phosphor: vis | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-studentenfeest | job | Phosphor: bier | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-marktkraam | job | Phosphor: mand | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-toeristengids | job | Phosphor: kaart | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-bietenoogst | job | Phosphor: gewas | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-boerderij | job | Phosphor: boerderij | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| sj-snackoverlast | job | Phosphor: burger | diamond | ink-bord (gemengd met licht-groen 10 procent) | 1.1 | Bijbaantjes |
| act-carbid | fun | Phosphor: water | circle | creme | 1.6 | Minigames |
| act-kermis | fun | Phosphor: reuzenrad | circle | creme | 1.6 | Minigames |
| act-hoogvlieger | fun | Phosphor: parachute | circle | creme | 1.6 | Minigames |
| act-drift | fun | Phosphor: stuur | circle | creme | 1.6 | Minigames |
| act-discgolf | fun | Phosphor: golf | circle | creme | 1.6 | Minigames |
| act-pitchputt | fun | Phosphor: par | circle | creme | 1.6 | Minigames |
| act-penalty | fun | Phosphor: doel | circle | creme | 1.6 | Minigames |
| act-voetbal | fun | Phosphor: rennen | circle | creme | 1.6 | Minigames |
| act-skatepark | fun | Phosphor: skate | circle | creme | 1.6 | Minigames |
| act-kartbaan | fun | Phosphor: vlag | circle | creme | 1.6 | Minigames |
| act-zwembad | fun | Phosphor: zwembad | circle | creme | 1.6 | Minigames |
| act-klimtoren | fun | Phosphor: hoogte | circle | creme | 1.6 | Minigames |
| act-waterski | fun | Phosphor: zwemmen | circle | creme | 1.6 | Minigames |
| act-carillon | fun | Phosphor: bel | circle | creme | 1.6 | Minigames |
| act-pannenkoek | fun | Phosphor: kookpot | circle | creme | 1.6 | Minigames |
| act-hengelen | fun | Phosphor: vis | circle | creme | 1.6 | Minigames |
| act-wandeling | fun | Phosphor: wandeling | circle | creme | 1.6 | Minigames |
| act-snackketen | fun | Phosphor: kroon | circle | creme | 1.6 | Minigames |
| act-evenementen | fun | Phosphor: tent | circle | creme | 1.6 | Minigames |
| act-regatta | fun | Phosphor: zeilboot | circle | creme | 1.6 | Minigames |
| act-ringrace | fun | Phosphor: ronde | circle | creme | 1.6 | Minigames |
| act-vliegschool | fun | Phosphor: vliegtuig | circle | creme | 1.6 | Minigames |
| act-safehuis | fun | Phosphor: sleutel | circle | creme | 1.6 | Minigames |
| act-vluchtdienst | fun | Phosphor: wereldbol | circle | creme | 1.6 | Minigames |
| act-vaardienst | fun | Phosphor: boot | circle | creme | 1.6 | Minigames |

Wat bewust eigen blijft, en waarom, staat in `EIGEN_SYMBOOL` in `game/js/mapmarkers.js`: je eigen richtingspijl (draait), de vorm per medespeler (kleurenblind),
de doelmarkeringen en ringen, de politie-eenheden, de percelen (een letter per stand) en je eigen voertuig.

## Lagen, routelijnen en overige kaartelementen

| laag | kleur | bron | toelichting |
|---|---|---|---|
| Routelijn: verhaal en missie (actief doel) | ink-geel | mapstyle INK.routeLine / a11y PALETTES.mission | dik en geel met een inktrand; het enige geel op de kaart |
| Routelijn: jouw eigen doel | a11y-palet: user (paars) | a11y.js PALETTES.uit.user (#c068ff) en de drie kleurenblindpaletten | paars gestreept; bewust een palet voor kleurenblinden, geen DS-token |
| Routelijn: klus | a11y-palet: job (oranje) | a11y.js PALETTES | puntjes |
| Routelijn: opknappen of repareren | a11y-palet: care (roze) | a11y.js PALETTES | streep-punt |
| Te koop (percelen) | laagTekoop = inktblauw (markerRollen().blauw) | kaartkleuren.js kaartLaag, forsalemap.js STATES | streeplijn en vlak 16 procent met prijskaartje |
| Van jou (percelen) | laagEigen = ink-bord | kaartkleuren.js kaartLaag | volle lijn, vlak 26 procent |
| Van een medespeler (percelen) | laagMedespeler = amber-tx (of de spelerkleur) | kaartkleuren.js kaartLaag | stippellijn |
| Niet te koop (percelen) | laagSlot = inkt-zacht gemengd met papier | kaartkleuren.js kaartLaag | korte streepjes en een slot |
| Betreedbaar | ICON_FILL.shop (bordgroen) en INK.locked als hij dicht is | interiormap.js drawDoorBadge | tegel met de Phosphor-deur uitgang gespiegeld |
| Ontdekking: onzichtbaar | glas-3 met punt-raster | kaartkleuren.js gebiedKleuren | donker glas over het papier: nog niet verkend |
| Ontdekking: zichtbaar / bezig / veroverd | ink-papier / ink-geel / licht-groen met glas-onderlijn | kaartkleuren.js gebiedKleuren | dikke lijn met donkere onderlijn, altijd leesbaar op papier |
| OV: station en bushalte | blauw (markerRollen().blauw) | MARKER_ROL station | pil-vorm; live bus is een crème cirkel |
| Verkeer: flitspaal | rood (markerRollen().rood) | MARKER_ROL flitspaal | achthoek |

## Legenda

Gegroepeerd per categorie (Altijd, Te doen, Diensten, Onderweg), als DS3-zeefdrukkaart. Rijen: Jij, Verhaal, Jouw waypoint, Route, Doel dat je volgt, Minigames, Bijbaantjes, Klussen, Ommeland, Percelen, Te koop, Standplaatsen, Je velden, Alleen oogstklaar, Na het verhaal, Thuis, Jouw voertuigen, Garage en pomp, Ziekenhuis en huisarts, Politiebureau, Politie-eenheid, Horeca, Betreedbaar, Winkels, Voertuigwinkels, Wapens & pandjeshuis, Treinstation, Bushalte, Live bus, Rooster, Maat, Flitspaal, Bezienswaardigheid, Uitkijkpunten, Safehouse, Veroverd, Straatnamen, Wijknamen, Gebouwen.

## Afspraken en afwijkingen

- Geel is het actieve routedoel en het doel van een missie; het staat altijd met een inktrand (op papier haalt geel maar 1,4:1). Afwijking: de perceelmarker "te koop" is nog geel.
- Eigen route is paars (a11y-palet `user`), klus oranje, opknappen roze: de kleurenblindpaletten van `a11y.js` zijn bewust geen DS-tokens.
- Overige iconen: gevuld in de categoriekleur met een crème of inkt glyph (hol zijn alleen de crème categorieën: activiteit en rest).
- Het actieve doel pulseert één keer 250 ms bij het verschijnen, daarna stil; bij Minder beweging nooit.
- Nog niet in beeld bekeken in het echte spel: zie het rapport onderaan docs/KAART-MARKERSTIJL-22-11.md.
