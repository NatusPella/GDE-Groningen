# Duif-modellen (22-11)

Aanleiding (eigenaar): "Op sommige plekken zie ik hele low-poly duiven. Blokken met vleugels. Soms in screenshots, soms in de game, soms in cutscenes."
Nu bestaat er één glad duivenmodel met drie detailniveaus, `game/js/pigeonmodel.js`, en elke duif in het spel is dat model. Samen spelen: de modellen zijn lokaal; de
duif van een medespeler gebruikt hetzelfde model (`coopextra3d.js` bouwt hem met `buildPigeonBird`), er is niets aan het netwerk veranderd.

## Inventaris voor en na

Gemeten met `node scripts/pigeon_inventory.mjs` (na) en op `origin/main` van 22-11 (voor).

| Variant | Waar | Voor | Na |
|---|---|---|---|
| Spelersduif, duivenhokken en -plekken, duiven in cutscenes van de opening en trailer, medespeler-duif | `pigeonmode.js` `buildPigeonBird` (hi) | 755 driehoeken, 11 meshes, bollen en dozen voor vleugels, tail en tenen, gefacetteerd | 1172, 10 meshes, glad, vleugels met veren, staart als waaier, poten met tenen |
| Meeuw van de duivenmodus en de opening | `buildPigeonBird('gull')` | 735, 9 meshes | 1172, 9 meshes, lange vleugels, gele snavel |
| Zwerm (opening, trailer, duivenmissie, Beppe's tuin) | `birds.js` | **16 driehoeken per vogel: een doos (12) met twee platte vlakken (4)**: de blokken met vleugels | 391 (romp 215 + 2 x 88 per vleugel), instanced, glad |
| Stadsduif, ambient (pleinen) | `wildlife.js` `buildPigeonMesh3D` | 336, ellipsoïden van 7x5 met platte plaatjes als vleugel | 391 (mid), in een filmpje (`lod: 'hi'`) 1172 |
| Meeuw, ambient | `wildlife.js` `buildSeagullMesh3D` | 372, platte plaatvleugels | 391 (mid, kind `gull`), in een filmpje 1172 |
| Wereldleven (dagelijkse evenementen: duiven, eenden, schapen, zwaluwen) | `worldlife3d.js` | **een afgeplatte bol (36 driehoeken) voor elk dier** | 106 (far): afgeronde romp, kop, vleugels en staart |
| Weidevogels (kievit, spreeuw, gans) | `countrylife.js` | ca. 45 driehoeken: drie dozen en twee vleugelvlakken per frame | 391 (mid), drie standen (gevouwen, omhoog, omlaag) |
| Duif in cutscenes (props `duif`, M12, M15, opening) | `cutscenehost.js` -> `buildWildlifeMesh3D` | 336 (de wereldduif) | 1172 (hi) |
| Minimap en HUD | `pigeonspots.js` `drawPigeonGlyph`, `drawPigeonMapIcon` | 2D canvas, geen 3D | ongewijzigd |
| Tuning- en spullenpreview | geen duif (modellen in `models3d_spullen.js` bevatten geen vogels) | n.v.t. | n.v.t. |

De "blokken met vleugels" waren dus drie plekken: de zwerm in `birds.js` (in screenshots van de opening en de trailer en in de duivenmissie), de dierlaag van het wereldleven
(duiven en zwaluwen als bol) en de weidevogels. De duif zelf (755 driehoeken, bolletjes met platte vlakken) was zichtbaar gefacetteerd met dozen als vleugel, tail en tenen.
De "traumaduif" (M12) is geen vogel maar de helikopter-variant van missie H15 (`helirun.js`); er is dus geen aparte traumaduif-mesh. De duif op Tammo's schouder (M15)
is de duif-prop van het filmpje: die gebruikt nu het hoogste niveau.

## Het model

- Romp: een gelofte ellips-achtige vorm (negen ringen, twaalf zijden) met een borst die vooruitsteekt, rug die in de staart loopt en een nek die opstijgt; kop met
  snavel, was (cere), oog en pupil; iriserende halsring (paars onder, groen boven, glanzend materiaal) bij de stadsduif.
- Staart: waaier van zeven veren met een donkere eindband. Vleugel: dekveren (een gladde ovale kap), twee vleugelbalken, zes armpennen en vijf handpennen in een
  waaier met donkere toppen. Poten met drie tenen en een achterteen.
- Drie niveaus (budget in `PIGEON_LOD`, getest): **hi 600-1200** (1172), **mid 200-400** (391), **far 80-120** (106). Ver weg is geen blok: een gladde romp van acht zijden,
  een kop, een gebogen vleugelvorm per kant en een staart.
- Kleuren: grijs (stadsduif), wit, bruin, gevlekt, een eigen tint (`pigeonPalette`); de meeuw is het kind `gull` met een witte romp en grijze vleugels met zwarte toppen.
- Pose: `poseBird` in `pigeonmode.js` beweegt de groepen (slag, buigen, gevouwen, lopen, pikken); het skelet van `wildlife.js` beweegt dezelfde delen met botten; de zwerm
  klapt per vleugel met een instance-matrix. Gevouwen ligt de vleugel langs de flank (rol 0,5 rad), niet als een zeil op de rug.
- Prestaties: elke kind-en-kleur-geometrie wordt één keer gebouwd en gedeeld (`SHARED_GEO`, `userData.shared`), dus de duif is 10 draw calls (was 11 en elk met een eigen
  geometrie); de zwerm is nog twee `InstancedMesh`-aanroepen; het wereldleven blijft drie (de dierlaag is een geometrie van 106 driehoeken). Het geheugen per duif daalt
  (geen eigen geometrie per exemplaar meer).

Eerlijk over wat er niet is: er is geen aparte afstandsschakelaar tussen mid en far voor dieren (geen bestaand LOD-systeem voor wildlife; `lodstable.js` en `farlod.js` gaan
over gebouwen). De far-variant is het wereldleven-dier (`worldlife3d.js`); een ver-impostor als billboard is niet gebouwd, omdat een gladde vorm van 106 driehoeken goedkoper
en mooier is dan een plaatje met alfa. De zwerm blijft overal mid. De spelersduif heeft geen vleugelpunten in beeld in eerste persoon (zie onderaan).

## Andere dieren (ronde 4)

`node scripts/animal_tris_count.mjs`: meeuw 391 (was 372), koe 690, schaap 472, eend 276, reiger 272, zeehond 232, vis 62, duif 391, kat 352, hond 374. Er zijn geen vleermuismodellen
in het spel. Geen van de overige dieren is een doos met poten: ze zijn opgebouwd uit ellipsoïden en gelofte vormen op een skelet. De ergste, de meeuw (platte plaatvleugels), is
nu hetzelfde gladde model als de duif. Open punten, niet gerepareerd: de vis (62 driehoeken, klein en meestal onder water) en de gans (de eend-bouwer met opgeklapte vleugels) hebben
geen eigen ronding; de kleine vee-dieren in het wereldleven (schaap, eend) zijn nu de far-duif op hun maat in plaats van een bol, wat van ver een vogelachtig schaap geeft.

## Eerste persoon: geen handen bij een duif

`firstpersonhands.js`: `firstPersonHandsHidden(world, player)` is de ene plek die zegt wanneer er geen handen of wapen zijn: in een voertuig, zwemmend, dragend, tijdens een
ragdoll, bij de scope, het menu, een filmcamera, de treincamera, en nu ook bij `player.vorm === 'duif'` of `player.nonHuman` en de vlaggen `pigeonMode` en `pigeonIntro`
(`HANDS_HIDE_FLAGS`). `startPigeonMode` haalt het viewmodel zelf meteen weg (`hideFirstPersonHands`), niet pas bij de volgende sync. `disposeFirstPersonHands()` geeft de meshes,
geometrieën en materialen vrij. Terug als mens komen handen en wapen vanzelf terug. De duivencamera is een volgcamera (`cameraOverride`), geen echte eerste persoon; de optionele
vleugelpunten voor een eerste-persoonduif zijn niet gebouwd (er is geen eerste-persoonduif om ze aan te hangen).

## Tests en beeld

- `scripts/pigeonmodel_test.mjs` (16): driehoeken per niveau binnen de grenzen, geen NaN, de romp vult minder dan 65% van zijn omhullende doos (een doos 100%, een bol 52%),
  silhouet in zij- en bovenaanzicht via `scripts/lib/pigeon_render.mjs` (hoogte/breedte, vulling, gespreide breedte), kleurvarianten, gedeelde geometrie, de zwerm, de meeuw,
  het skelet, en dat de oude blokvogels niet meer in de bron staan.
- `scripts/firstpersonhands_test.mjs` (30): handen weg bij stilstaan, vliegen, landen, pikken, in een voertuig, in de intro en bij een gedaante-vlag; terug als mens; geen lek.
- Beeld: `node scripts/pigeonmodel_sheets.mjs` maakt de contactbladen in `docs/beeld-22-11/duif/` (zij-, voor- en bovenaanzicht): `duif-niveaus.png` (hi, mid, far, zittend, meeuw),
  `duif-varianten.png` (grijs, wit, bruin, gevlekt) en `duif-poses.png` (vliegen met slag omhoog en omlaag, zitten, lopen, pikken).
- De bladen zijn met een kleine softwarerenderer gemaakt (geen belichting uit het spel, geen schaduw); in het spel zien de duiven er door licht en schaduw anders uit.
  **Nog niet bekeken in het spel zelf** (geen Electron in deze ronde): de duivenmodus in beeld, de zwerm in de opening, de cutscene-duif dichtbij.
