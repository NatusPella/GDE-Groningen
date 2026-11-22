# Nepinterieur in de ramen: perspectief (#1076, 22-11)

Naslag bij issue #1076 ("nepinterieurs verliezen hun perspectief"). De shader staat in `game/js/interiorglass.js` (interior mapping);
de ruitcodering in `game/js/paneuv.js`. De rekenkunde is nagebouwd als CPU-referentie in `scripts/lib/interior_shader_ref.mjs` en
getest in `scripts/interior_shader_ref_test.mjs` en `scripts/staticbatch_normals_test.mjs`. Geen Electron en geen GL gebruikt:
**de agent heeft niets in beeld bekeken**.

## Oorzaken

1. **De hoofdoorzaak: de batcher maakte van elke gevelnormaal een nulvector.** De glasshader haalt het ruitframe (tangent T = up x n,
   diepte -n) uit de normaalattribuut van het glas. `GeoBuilder.build` slaat die op als Int8 (genormaliseerd, `round(n * 127)`). De
   statische batcher (`staticbatch3d.js`, `addPiece`) draait de normaal door de normaalmatrix, normaliseert en schrijft hem terug in
   een `Int8Array`: een zwevende waarde onder 1 wordt daarbij afgekapt tot 0. Elk pand krijgt sinds #917 een millimeter-nudge
   (`buildingNudge`), dus de wereldmatrix is nooit de eenheidsmatrix en **elke gebatchte gevel kreeg normaal (0,0,0)**. De shader viel
   dan terug op (0,0,1): alle ruiten werden behandeld alsof hun gevel op +z stond. Op een gevel die toevallig daarop lijkt klopt het,
   op elke andere hoek zit de kamer scheef (in de test tot ca. 9 m naast het juiste punt, gemiddeld 1 tot 4 m). Vlakke schaduw
   (`flatShading`) leest de normaal niet, dus de rest van het gebouw merkte niets. Het raakte alle gebatchte gevels (de gebouwbatch is de standaard in de ring)
   en is gevonden doordat de referentie op de nulnormaal zo groot afweek.
2. **Het frame draaide mee met de kant van het pixel.** De shader draaide de normaal naar de camera (`igN = -igN`) en leidde T daaruit
   af, terwijl de ruit-x in de uv aan de uitwaartse normaal gebonden is. Voor een achterkant-pixel spiegelde de kamer. Nu komt T uit de
   ongedraaide normaal en draait alleen het teken van `rd.z` mee (`igSide`). Het glas wordt met FrontSide getekend, dus dit raakte
   zelden een pixel; het is wel de juiste invariant.
3. **Geen afstandsregel.** Voorbij ca. 100 m is een kamer een paar pixels breed: de straal blijft rekenen en de details (meubel,
   wandpatroon, gordijn, lamp) flikkeren zonder dat het perspectief betekenis heeft. Er is nu een gladde menging op alfa naar een
   vlakke kamertoon (zie onder).

Wat **niet** de oorzaak bleek (met de test uitgesloten): view-vector in de verkeerde ruimte (de straal is wereld naar lokaal via T en n,
exact), de genormaliseerde T, niet-uniforme of negatieve schaal (de gebouwgroep krijgt alleen een positie), interpolatie van de
kijkrichting (V komt uit de wereldpositie van het pixel, per pixel), ontbrekende normalisatie, polygonOffset of logaritmische
diepte (geen `gl_FragDepth`), y-flip van de uv, mipmap of anisotropie (de shader leest geen texturen), de kamerdiepte (D schaalt met
de raambreedte, en wereldassen zijn niet nodig voor de wiskunde).

Bekende, aanvaarde restjes:
- Int8-normaal: de gevelhoek zit op hooguit 0,3 graden na (127 niveaus). Het hele kamerframe draait dat mee: een stijve zwenking van
  de kamer, geen vervorming (zie de tabel). Niet gerepareerd: een precieze normaal vraagt een breder attribuut of een extra
  attribuut in alle gevelgeometrie (andere code leest `normal.array` als Int8) en pixelderivaten zijn op 1 tot 20 m te ruisig.
- 32-bit varyings: wereldcoordinaten tot 30 km laten 1 tot 2 mm ruis in de straal; de uv-codering kost hooguit enkele mm.
- `paneUV` kapt `y` af op 3,99 m: een ruit hoger dan dat klemt (bekende grens, gedekt door een test).

## De afstandsregel

In `igInterior`: `igFar = smoothstep(IG_FAR0 = 100, IG_FAR1 = 150, dist)`. De toon is de achterwand van de kamer onder hetzelfde licht
(lamp, daglicht, straatlicht), voor een winkel de kleur van het type (`uShopAccent`). Tussen 100 en 150 m wordt de gerenderde kamer op alfa
(`mix`) naar die toon gemengd, voorbij 150 m wordt de straal niet meer geworpen (`return flatCol`). De geometrie (de straal, het
kamerpunt) is niet aan de afstand gekoppeld; de bestaande detailfade (`smoothstep(90, 30)`) blijft ongemoeid. Budget: geen extra
textuurlookups en geen lussen (de test leest de GLSL); ver weg wordt het goedkoper, want de straal en de patronen vervallen. Het
programma blijft hetzelfde (twee sleutels).

## Testmatrix (`interior_shader_ref_test.mjs`)

15.933 monsters op de ruit, willekeurige gevelhoek (0 tot 360 graden, niet alleen 0 en 90), ruiten van 0,4 tot 6 m breed en 0,5 tot 3,9 m
hoog (niet vierkant), alle vier de soorten, wereldcoordinaten tot 30 km, camera op 2, 5, 20, 50, 100 en 300 m, ooghoogte 1,7 m (eerste
persoon) en tot 10 m (derde persoon), FOV 60, 75 en 90, aspect 16:9, 4:3 en 21:9, kijkhoek tot 85 graden schuin, een rij ruiten op
verschillende hoogte. De referentie is onafhankelijk: draaimatrix in de wereld, slabmethode vanaf het ruitpunt.

| toestand | fout kamerpunt |
|---|---|
| exacte normaal, 64 bit | hooguit 0,6 mm (de epsilons van de shader) |
| 32-bit camera/uv/varying, 2 tot 300 m | hooguit 0,03 m |
| Int8-normaal (nu), inval < 60 graden | hooguit 0,19 m bij 5,5 m kamerdiepte (gemiddeld 1 cm) |
| nulnormaal (de oude batchtoestand) | tot 9,5 m, gemiddeld 1 tot 4 m |

Verder in de test: encode/decode van `paneUV` voor alle K, soorten en maten; het frame bij een achterkant-pixel; gladde afstandsalfa;
regel-voor-regel de GLSL-formules die de referentie nabootst (een wijziging zonder de referentie laat de test falen); geen texturen en
geen lussen in de glasshader; de gebouwgroep krijgt alleen een positie. `staticbatch_normals_test.mjs` draait de echte batcher en eist dat een
gebatchte normaal niet 0 wordt, ook niet bij draaiing.

## In beeld te controleren (Electron-ronde)

Scene `1076` in `scripts/ui/hertest_scenes.js` (4 beelden, 1920x1080, eerste persoon, ooghoogte 1,7 m, FOV 70):
- Stad (`H.stad`), midden op de dag (kalender vast, helder). Dichtbij (6 m): loop zijwaarts langs een ruit op een gedraaide gevel (niet
  evenwijdig aan een as): de achterwand en de zijwanden schuiven mee, de kamer is niet gespiegeld. Vergelijk met een gevel recht voor je.
- 40 m: schuin langs de straat: zelfde diepte, geen vlak plaatje.
- 90 en 140 m: geen flikkering van meubels of patronen en geen harde rand; de ramen worden een vlakke, warme of koele toon.
- Zelfde plekken 's avonds (verlichte kamers): de lampkleur is op afstand gelijkmatig.
- Pas op: `kwaliteit laag` zet de interieurs uit (gewoon glas); niet daarmee beoordelen. Eerst een regelcontrole van de shaderbron
  (`node scripts/shader_check.mjs` compileert de GLSL niet voor dit glas; een compileerfout zou het glas zwart of zonder kamer laten: kijk
  daarom ook naar de console op `INTERIOR_GLASS`).

Samen spelen: de shader en de batcher zijn lokaal, er gaat niets over het net.
