# Randen om percelen en weilanden (21-11, #1092)

Aanleiding (eigenaar): "Kan het kloppen dat ik nog steeds de procedurele randen om landbouwpercelen heen zie? ... Maak gewoon echte
randen bij de kavelranden uit de kaart, maar niet deze onzin. De dingen die daaruit komen hebben soms ook hele andere of juist geen
collisions, ze lijken soms op sloten en soms niet, al met al chaos."

Besluit: **een rand bestaat alleen waar de kaart een lijn heeft.** Het spel leidt geen heg, hek, draad, berm of rij meer af uit een
perceelpolygoon of uit het hashraster. De randen die er zijn, komen uit de tegeldata en lopen door één tabel,
`game/js/edgeclasses.js`, zodat uiterlijk en collision samenhangen.

## 1. Onderzoek: wat het spel aan randen maakte (voor 21-11)

Alles in `game/js/countryside.js` (de poldergenerator: 160 m-tegels, deterministisch uit een hash van blok, kolom en rij; `chash`),
tenzij anders vermeld. De ruimte is een raster van strooklijnen (40 m breed) met dwarssloten om de 240 m.

| # | Bron (functie) | Hoe geplaatst | Uiterlijk | Collision | Opmerking |
|---|---|---|---|---|---|
| 1 | Strookranden: boomrij en wilgenrij (`genTileSteps`, `TREE_ROW_P` 11%, `WILLOW_ROW_P` 5%) | hash per strooklijn; een boom per 7 m, 2,1 m naast de lijn | `tree`, `willow` | stam (r 0,22 m): ja | geen kaartlijn |
| 2 | Strookranden: hegrij (`HEDGE_ROW_P`, rest van de 19%) | hash per strooklijn, stukken van 2,2 m, 2,0 m naast de lijn | `hedge` 2,6 m lang, 0,9 tot 1,25 m hoog | loopmuur 1,25 m hoog, 0,3 m dik: alleen wandelaar (overspringen); voertuigen rijden er doorheen | geen kaartlijn |
| 3 | Strookranden: draadrij (`WIRE_ROW_P`) | hash, palen per 3,5 m, twee draden | `post` 1,15 m, `wire` | loopmuur 1,15 m x 0,08 m, alleen wandelaar | geen kaartlijn |
| 4 | Slootbermen (`genFieldEdges`, `bank`) | langs de geschilderde raster-sloten, stukken van 20 m, 1,25 m naast de lijn | lage berm 0,16 m hoog (`bankGeometry`) | geen | lijkt op een sloot, ook waar de tegels een echte sloot ergens anders hebben; de berm volgt het raster, niet het water |
| 5 | Biezen op de bermen (`rush`) | 10% van de bermstukken bij een weide | bies | geen | idem |
| 6 | Prikkeldraad om weides (`genFieldEdges`, `fenceLine`, `fencedParcel`) | 80% van de weide- en boomgaardpercelen (sinds #945 alleen waar de tegels `weide` zeggen), palen per 5 m, draden op 0,4, 0,68 en 0,96 m | `post`, `wire` | loopmuur: alleen wandelaar; geen voertuigcollision | bij de randen van een perceelpolygoon, maar de lijn is die van het raster |
| 7 | Eindhekken en poorten bij dwarssloten (`gate`, `genParcel`: 45% van de percelen) | hash | `gate` met draadvleugels | geen | |
| 8 | Overweghekken (`railGate`) | waar een draad door het spoor wordt geknipt | `gate` | geen | |
| 9 | Heg of houtwal op een dwarssloot of polderweg (`hedgeLine`, 9% en 12%) | hash, een boom per 8 m erachter | `hedge` + boom | loopmuur, geen voertuigen | bleef weg waar OSM een heg had (`hedgeMapped`) |
| 10 | Draad en poorten achter de bermen van polderwegen (`genFieldEdges`) | 60% van de polderwegen, een poort per 48 m met 45% kans | `post`, `wire`, `gate` | loopmuur | |
| 11 | Riet langs raster-sloten (`reedItems`) | op 1,25 m stap langs de geschilderde raster-sloten, ook in blokken waar de geschilderde sloot uit stond | `reed` | geen | rietkraag zonder sloot |
| 12 | Geschilderde raster-sloot (shader `uProvDitch`, `countrySurface` = `sloot`) | het raster, **buiten** de blokken die de tegels dekken | grondverf in de shader | water-regel (`ditch`, ditchsweep) | blijft, zie 3 |
| 13 | Erfheg van een verzonnen boerderij (`countryplan.js`) en terpring van een verzonnen dorp (`genVillage`) | vaste ring en rij | `hedge` | loopmuur | geen perceelrand, wel een procedurele heg |
| 14 | Heggen langs groenvlakken (`grass.js`: `K.hedge` 0,08 tot 0,3 per soort groen) | hash per vlakrand, een heg per 0,8 m, 0,55 tot 1,05 m hoog | `hedge`-instanties | geen | afgeleid uit de polygoonrand, geen collision |
| 15 | Rijen langs polderwegen (`ROAD_ROW`) | op procedurele polderwegen buiten de tegels, een boom per 8 of 10 m | `tree`, `poplar` | stam: ja | hoort bij de weg, niet bij een perceel: blijft |

Waarom het een warboel was: dezelfde rand had een andere hoogte en profiel per bron (een heg 0,9 tot 1,25 m met een muur voor de
wandelaar, een kaartheg 1,4 m met een vaste collider voor voertuigen en wandelaar), voertuigen reden door elke procedurele heg en elk
procedureel draad, een hek van de kaart brak juist bij 3,4 m/s, banken en riet zetten een sloot neer waar geen water was, en een
poort of draad kon op de rand van een tegel ophouden. Geen van die objecten wist wat de tegels op die plek hadden, behalve via losse
filters (`edgeBlocked`, `hedgeMapped`, `propVrij`).

## 2. Wat de kaart wel heeft (kaartlijnen in onze data)

De provincietegels (`game/world`, `randlagen_telling.mjs`) hebben: 1.358 hekrijen (OSM `barrier=fence`) en 1.266 hegrijen
(`barrier=hedge`, samen 61 km) in de FURNITURE-sectie, 6.190 sloten, greppels en beken (WATER-rijen met `kind: 'sloot'`, een lint rond
de OSM-lijn met peil en diepte), 25.477 landgebruikvlakken (`weide`, `akker`, `boomgaard`) en bomen (waaronder die van
`natural=tree_row`, een boom per 6 m; de rij zelf bewaart de tegel niet). Rijen die over een tegelrand lopen staan per tegel
(de lengtes die het script telt kunnen dubbel zijn). Landgebruikvlakken zijn vlakken, geen lijnen: ze krijgen **geen** rand (een veld
zonder gemapt hek of heg blijft open, zoals in het echt de meeste Groningse velden).

## 3. Wat er veranderd is

**Verwijderd uit de generatie** (niet verborgen): de rijen 1, 2, 3 (de hele lus per strooklijn), 4 tot 10 (`genFieldEdges`,
`fenceLine`, `hedgeLine`, `fencedParcel`, `parcelGate`, `lineRuns`, `spanOnDitch`, de poort met draadvleugels in `genParcel`), 11
(rietkragen langs raster-sloten; de oevers van de verzonnen maren houden hun riet), 13 (erfheg en terpring) en 14 (groenvlakheggen in
`grass.js`). Mee gingen de proptypes `post`, `wire`, `gate`, `bank`, `rush` en `hedge`, hun modellen in `countrymodels.js`, de
loopmuren van velden in `countryside.js`, de constanten `TREE_ROW_P` e.d. (ook op de minikaart) en `setExtraHedge`/`hedgeMapped`/`realHedgeNear`.

**Blijft, met reden:**
- Rij 15, de bomenlanen langs procedurele polderwegen: een rand van de weg, niet van een perceel, met stamcollision.
- Rij 12, de geschilderde raster-sloot buiten de tegeldekking (Ommelanden zonder kaartblok): het is grondverf met dezelfde
  waterregel (`countrySurface` = `sloot`, `ditchsweep`) en geen geometrie. Binnen de tegeldekking is hij uit, daar zijn de echte sloten
  van de tegels. Mocht de eigenaar ook die verf kwijt willen, dan is dat een aparte shader-wijziging (`uProvDitch`).
- De boomrijen en heggen van de kaart zelf (`natural=tree_row`, `barrier=hedge`) en de sloten.

**Eén regelset: `game/js/edgeclasses.js`.** De tabel `EDGE_CLASSES` heeft per randklasse de kaartbron, de geometrie en kleur (via
`worldpalette.js`, dus de DS-wereldkleuren), de hoogte en de collision:

| Klasse | Kaartbron | Uiterlijk | Hoogte | Collision |
|---|---|---|---|---|
| `ditch` (sloot) | WATER-rij, `waterway=ditch\|drain\|stream` | water-lint, kind `sloot` (breedte 2,4 / 1,6 / 3 m zonder OSM-breedte) | peil en diepte in de rij | water: `ditch` voor voertuigen (harde rem, niet over te rijden, `ditchsweep.js`), waden voor wandelaars; duiker waar een weg kruist (`markDryRoad`) |
| `hedge` (heg, houtwal) | FURNITURE `barrier=hedge` | bak 1 m plus kap, 0,9 m diep | OSM-hoogte, anders 1,4 m | `heg`: vast (r 0,4 m), voor voertuigen en wandelaars, overal gelijk |
| `fence` (hek) | FURNITURE `barrier=fence` | paneel 1,4 m, paal 1,6 m, 3 cm dik | 1,4 m | `hek`: dun (r 0,08 m), breekt bij een flinke klap en komt terug |
| `treerow` (boomrij) | bomen van `natural=tree_row` | een boom per 6 m | boomhoogte | stam (r 0,28 m, `breakables.js` `tree`) |

`streetfurniture.js` (colliders), `streetfurniture3d.js` (maten en kleuren) en `worldbuilder.js` (sloot- en boomrijmaten) lezen de
tabel; er staat geen eigen hek- of hegprofiel meer in de tekencode. De poorten van de kaart (`barrier=gate`, 2.784 punten in de data)
worden niet getekend (dat was al zo); een vervolgstap zou er een gat in het hek en een poortmodel bij zetten.

## 4. Controles

- `scripts/edgeclasses_test.mjs` (290 controles): elke klasse met uiterlijk heeft een collision en omgekeerd (de keuring zelf wordt
  getest met een kapotte tabel), elke klasse heeft een kaartbron; de collider van een stuk is die van de tabel; de straal van hek en
  boom is die van `breakables.js`; de tekencode leest de tabel; de stukken van een gemapte lijn liggen op die lijn; 256 tegels van
  het hashraster hebben geen paal, draad, poort, berm, bies of heg.
- `scripts/fielderand_test.mjs` en `scripts/proprail_test.mjs`: bijgewerkt (geen hashrand meer; de graasregels blijven).
- `scripts/world/prop_conflict_audit.mjs`, nieuw (`--strict`, drempels dalen alleen): `edgeObjects` en `edgeWalls` (procedurele randen,
  moeten nul zijn), `edgeNoSource` (een hek- of hegstuk zonder gemapte bronlijn binnen 1,5 m, moet nul zijn), `ditchNoWater` (een
  sloot zonder diepte), en gemeten: `osmPieces`, `ditchRows`, `ditchMeters`, `edgeDraws`, `drawsAll`, `edgeBytes`.
  De bestaande nullen (stuk over spoor, weg, water of gebouw) blijven gelden voor de kaartstukken.

### Cijfers: 24 vensters van 1 km (12 met spoor, 12 willekeurig, seed 7), `prop_conflict_audit`

| Meting | Voor | Na |
|---|---:|---:|
| Procedurele randobjecten | 33.315 | 0 |
| waarvan heggen / palen / draad / poorten / bermen / biezen | 21.162 / 4.841 / 4.698 / 1.223 / 1.103 / 288 | 0 |
| Loopmuren van die randen | 31.324 | 0 |
| Tekencalls van de randsoorten (tegel x soort) | 2.634 van 5.476 | 0 |
| Tekencalls alle prop-soorten (tegel x soort) | 5.476 | 481 |
| Matrixgeheugen van de randen (64 byte per stuk) | 2,13 MB | 0 |
| Kaartstukken (hek en heg uit OSM) | 813 | 813 |
| Over spoor / weg / water / gebouw (kaartstukken) | 0 | 0 |
| Draad over een sloot, palen op akkerland, poorten bij het spoor | 2, 4, 26 | 0 |
| Vee in het venster | 5.537 | 6.225 |

Dat de tekencalls van alle soorten zo veel meer dalen dan die van de randsoorten, komt omdat de strookrijen ook de bomen en
wilgen waren die er stonden; de bomen van de kaart en van de bomenlanen langs polderwegen zijn er nog. Het vee neemt toe omdat de
randen niet meer in de weg zaten bij het plaatsen. De audit meet alleen de gebieden die de tegels dekken; Ommelanden zonder tegel
zijn niet gemeten.

## 5. Samen spelen

De randen zijn deterministisch uit de tegeldata: dezelfde wereld, dezelfde stukken en dezelfde collisions voor elke speler; er is
geen toeval, geen hostkeuze en geen aparte toestand. Een gebroken hek volgt de bestaande regel van `breakables.js` (EXTRA-bericht
`KAPOT_SOORTEN` in `coopextra.js`, dat `hek` al kende); er komt niets bij voor gasten.

## 6. Nog niet bekeken in beeld

Er is geen Electron gestart (de releasegate draait). Alles hierboven is met node-tests en audits gemeten; niets is in beeld gezien.
In beeld te controleren: (1) velden zonder hek of heg zien er kaal maar rustig uit, ook langs polderwegen; (2) een gemapte heg en een
gemapt hek hebben dezelfde hoogte, kleur en botsing als eerst (de kleuren lopen nu door de wereldpalet-regel); (3) een sloot van de
kaart houdt een auto tegen en het water ligt er echt; (4) de minikaart toont geen boomstrepen meer op de strooklijnen; (5) de
grasranden van parken zonder rand-heg (de heggen om groenvlakken zijn weg).
