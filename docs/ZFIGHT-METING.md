# Z-fight-meting (#917, #919)

Vraag: flikkeren gevels, daken en bruggen nog, en zo ja, komt dat door te weinig diepteprecisie (verdwijnt bij een groter near-vlak) of door echte dubbele vlakken op dezelfde plek (verdwijnt niet)? Gemeten in Electron op HEAD (stage met de vooraf gebouwde wereld), 1600x900, zomermiddag, wegwerpprofiel. Gereedschap: `scripts/qa/zfight_meting.mjs` (+ `.page.js`), `brug_beeld_analyse.mjs --stabiel`, `zfight_tabel.mjs`, `zfight_nearverschil.mjs`, `near_cam.page.js`; plekken in `scripts/qa/zfight_plekken.json`.

## Rekenregel

De dieptebuffer is 24 bit (de HDR-doelbuffer met stencil is DEPTH24_STENCIL8). Het kleinste diepteverschil dat hij nog onderscheidt is op afstand d bij near n ongeveer d^2 / (n * (2^24 - 1)). Twee vlakken die minder dan die stap uit elkaar liggen, kiezen hun winnaar op afrondingsfouten: ze flikkeren als de camera beweegt, of de achterste wint steeds (verkeerde winnaar).

| afstand | near 0,5 | near 1 | near 1,5 | near 2,5 |
|---:|---:|---:|---:|---:|
| 100 m | 1,2 mm | 0,6 mm | 0,4 mm | 0,2 mm |
| 150 m | 2,7 mm | 1,3 mm | 0,9 mm | 0,5 mm |
| 250 m | 7,5 mm | 3,7 mm | 2,5 mm | 1,5 mm |
| 350 m | 14,6 mm | 7,3 mm | 4,9 mm | 2,9 mm |
| 500 m | 29,8 mm | 14,9 mm | 9,9 mm | 6,0 mm |

De nudge van een gebouw (4 tot 8 mm, `buildingNudge`) houdt dus stand tot ongeveer 224 m (6 mm) bij near 0,5 en tot ongeveer 502 m bij near 2,5 (`maxSafeDistance` in `cameranear.js`). De weergave van het spel heeft standaard `kort` (150 m, far-vlak 210 m): daar komt de ondergrens van 224 m niet in beeld. Bij `normaal` (350 m), `ver` (600 m) en `heel ver` (900 m) wel.

## Methode

Per plek en per camera-variant drie beelden: a, b en c (= a). Mensen, verkeer, dieren en de routestrook staan uit. b heeft dezelfde camera met near 3% groter: de dieptestappen schuiven, dus alleen pixels die op de dieptestap een winnaar kiezen, wisselen. `brug_beeld_analyse.mjs --stabiel` telt pixels in vlakke delen die tussen a en b wisselen en tussen a en c niet (wolken, water en bewegende dingen vallen zo grotendeels weg). Een eerdere opzet met 4 cm verschoven camera gaf parallaxruis op nabije muren en een tweede met 5 cm vooruit gaf randruis; beide zijn niet gebruikt voor de tabellen.

Zwakte: de meting ziet alleen wat wisselt. Een vlak dat bij elk near steeds verkeerd wint (een raam achter de muur, een dak onder het dak) is wel fout maar flikkert niet; daarvoor staat het near-verschil hieronder (a bij near 0,5 tegen a bij near 1,5 en 2,5).

## Positieve controle

Om te bewijzen dat de meting iets ziet, staan er vijf paren vlakke platen (achter groen, ervoor rood) recht tegenover de camera op 100, 200, 300, 400 en 500 m, onder een andere hoek, met een vaste afstand tussen de platen van een paar millimeter. Een goed paar is helemaal rood. Camera op 40 m hoogte boven de Grote Markt (`controle-6mm`, `controle-20mm`).

| plek | near 0,5 | near 1 | near 1,5 | near 2,5 |
|---|---:|---:|---:|---:|
| platen 20 mm uit elkaar | 4144 wisselpixels | 3 | 3 | 3 |
| platen 6 mm uit elkaar | 1057 | 3 | 159 | 3 |

Beeld `docs/img/qa/917-near-controle-20mm-near-0.5-1-2.5.png` (boven near 0,5, midden 1, onder 2,5; platen op 100 tot 500 m): bij near 0,5 flikkert de plaat op 400 m in strepen en wint op 500 m het groene vlak dat achter hoort te liggen. Bij near 1 en 2,5 zijn alle vijf rood. De precisie-oorzaak bestaat dus en is bij near 0,5 vanaf ongeveer 300 m te zien, bij vlakken die minder dan ongeveer de dieptestap uit elkaar liggen.

## Echte plekken: wisselpixels bij near 0,5, 1,5 en 2,5

Weergave `kort` (far 210 m, `meting3`), aantal wisselpixels (tussen haakjes: a-b en a-c ruw):

| plek | near 0,5 | near 1,5 | near 2,5 |
|---|---:|---:|---:|
| usquert-kerk-45m (kit-kerk) | 30 | 0 | 0 |
| usquert-kerk-120m | 0 | 824 | 545 |
| usquert-straat (op straat, gevels) | 7498 | 105 | 732 |
| stad-grotemarkt-straat (Grote Markt, eye level) | 20 | 1 | 2 |
| stad-grotemarkt-150m (lucht) | 0 | 0 | 0 |
| stad-binnenstad-straat | 600 | 62 | 0 |
| eendrachtskade-80m (kade) | 188 | 143 | 113 |
| detailrand-250m (rand detailbereik) | 122 | 0 | 0 |
| woonwijk-500m | 0 | 0 | 0 |
| visvliet-brug (testplek uit bridge_dek_test) 80 m | 21 | 4 | 15 |

Weergave `ver` (far 1650 m, `meting4`):

| plek | near 0,5 | near 1,5 | near 2,5 |
|---|---:|---:|---:|
| usquert-kerk-45m | 18 | 0 | 7 |
| usquert-kerk-120m | 50 | 42 | 109 |
| usquert-straat | 1653 | 0 | 1 |
| stad-grotemarkt-straat | 0 | 3 | 9 |
| stad-grotemarkt-150m | 0 | 0 | 0 |
| stad-binnenstad-straat | 3871 | 18973 | 5943 |
| eendrachtskade-80m | 80 | 74 | 84 |
| detailrand-250m | 52 | 0 | 0 |
| woonwijk-500m | 0 | 0 | 0 |
| visvliet-brug 80 m | 47 | 28 | 89 |

Visvliet, de brug van de N355 (x -20758, y -5195; `meting9`, weergave `ver`): schuin op 60 m 588 / 459 / 591; schuin op 200 m 283 / 1 / 1; onder het dek 1444 / 0 / 816. Beeld `docs/img/qa/917-visvliet-n355-brug-60m.png`: het dek is dicht en doorlopend, vangrail en talud staan scherp, geen speckles.

De grote getallen zijn bijna steeds restruis: in de hitkaart zijn het waarschijnlijk geparkeerde auto's (de verbergregel van de meting dekt alleen rijdende voertuigen, mensen en dieren), de omtrek van de wolken, het draaiende waypointteken en het water. Ze veranderen niet met near. Wat bij near 0,5 hoger is en bij 1,5 en 2,5 wegvalt (usquert-straat `kort`, detailrand-250m, stad-binnenstad-straat `kort`, Visvliet op 200 m) is wel precisie, maar het zijn enkele honderden tot enkele duizenden pixels per beeld, geen geveldekkende speckles.

Near-verschil (a bij near 1,5 en 2,5 tegen a bij near 0,5, `zfight_nearverschil.mjs`): op de plekken waar de omgeving stil is (detailrand-250m 1465 / 3721, woonwijk-500m 2235 / 7147, stad-grotemarkt-150m 2114 / 5294, usquert-kerk-120m 1359 / 3788) zit het hele verschil in de rand van een wolk. Op gevels, daken en straten op 150 tot 500 m verandert geen pixel door near: de gevels staan er bij near 0,5 even goed als bij 2,5.

## Oorzaak per plek

| plek | oorzaak | uitkomst |
|---|---|---|
| Usquert-kerk (kit) op 45, 120 en 200 m | geen z-fighting gezien; de verre doos onder de kit is al verborgen (`farlod.hideBuilding`, `farlod_hide_test`) | schoon in beeld |
| stadsstraat met gevels (Grote Markt, binnenstad) | geen z-fighting gezien; de rest is bewegende ruis | schoon in beeld |
| Visvliet-brug (N355) | geen z-fighting gezien; dek dicht (#919) | schoon in beeld |
| kade (Eendrachtskade) | enkele honderden pixels verspreid op verre weg, bij elk near gelijk | restruis, geen fix |
| rand van het detailbereik 150 tot 350 m | alleen precisie, 122 pixels bij near 0,5 en 0 bij 1,5 | gedekt door een groter near, niet zichtbaar als speckle |
| woonwijk op 400 tot 600 m | geen verschil bij een ander near | schoon in beeld |

Niet bekeken: een dijk (geen vaste plek gekozen), het effect op de overgang van de dichte naar de verre laag bij 140 tot 190 m op gevels van kit-gebouwen en de meest recente klachten uit de playtest (de eigenaar zag speckles op de kerkmuur van Usquert in een build vóór de nudge en de verborgen verre doos). Met de huidige HEAD is die muur in drie afstanden en twee weergaven schoon. De echte coplanaire dubbele vlakken in de gebouwen (kit tegen kit, extruderende gevel tegen gevel, een raam van de buurman) zijn alleen door `scripts/zfight_audit.mjs` te tellen; die vraagt `data/cache/province` en kon in deze worktree niet draaien.

## Wat is gebouwd

Het goedkoopste dat werkt, op grond van de meting: `game/js/cameranear.js`. Het near-vlak groeit met de vrije ruimte onder de camera (0,5 m tot 10 m vrij, daarna zacht tot 2,5 m bij 60 m vrij) en blijft 0,5 m op de grond, in de eerste persoon, in een auto of trein, en in elke scriptcamera (cutscene, binnenkamer). Een vliegende helikopter mag wel groeien: de camera hangt boven de stad en de dichtstbijzijnde vlakken zijn de daken ver onder de lens. Omhoog zacht (e^(-3 dt)), omlaag direct (een te groot near knipt de omgeving weg). `?near=<m>` en `?far=<m>` zetten de waarden vast voor metingen.

Gemeten in de echte camera (`near_cam.page.js`, weergave `ver`, far 1650 m):

| stand | near | camerahoogte |
|---|---:|---:|
| te voet, derde persoon | 0,5 | 1,9 m |
| te voet, eerste persoon | 0,5 | 1,7 m |
| auto, eerste persoon | 0,5 | 1,2 m |
| auto, derde persoon | 0,5 | 2,8 m |
| helikopter op 70 m | 2,5 | 76 m |
| dezelfde helikopter op 5 m (direct na het dalen) | 0,50 | 11 m |

Beelden: `917-near-helikopter-70m.png` (de stad op 76 m, niets weggeknipt) en `917-near-auto-eerste-persoon.png` (dashboard en stuur nog zichtbaar, near 0,5). Test: `scripts/cameranear_test.mjs` (dieptestap, regels, zacht omhoog en direct omlaag, vlaggen, helikoptersimulatie).

Bewust niet gebouwd: het gesplitste dieptebereik (de verre laag in een eigen pass). De meting vraagt er niet om: op de plekken die we bekeken, op de grond tot 500 m, verandert geen pixel met near. Pas als de playtest op `normaal` of verder alsnog flikkering op de grond laat zien (de nudge van 4 tot 8 mm tegenover een stap van 7,5 mm op 250 m), is dat de volgende stap; dan met een hoger near op de verre laag, niet met een grotere nudge.

Samen spelen: de camera is lokaal per speler; er gaat niets over het net en een gast regelt zijn eigen near.
