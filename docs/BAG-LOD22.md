# 3D BAG LoD 2.2 offline voorbereid (#410)

Besluit van de eigenaar: de 3D BAG-modellen (LoD 2.2: echte daken met dakkapellen, overstekken en schoorstenen) kunnen straks gebruikt worden,
maar **het spel gebruikt ze nu niet**. Dit document beschrijft de offline voorbereiding: ophalen, omzetten, ramen, en het plan voor een latere
prototypelaag. Niets hiervan staat in `game/js`, in de stage (`desktop/build.mjs`), in de release of in de poort (`scripts/test_all.mjs`);
`scripts/bag_lod22_test.mjs` controleert dat laatste. Het spelgedrag is ongewijzigd.

## Wat er ligt

| Bestand | Wat |
|---|---|
| `scripts/world/fetch_3dbag_lod22.py` | haalt de CityJSON-tegels (`cj_download` uit de tegelindex) op naar `data/cache/3dbag-lod22/<versie>/`; alleen op verzoek |
| `scripts/world/bag_lod22.mjs` | `convert`: CityJSON naar `.gbl` per kilometertegel; `inspect`; `estimate`: ramingen en dichtheid |
| `scripts/world/bag_lod22_voorbeeld.mjs` | maakt een kleine voorbeeldtegel (echte BAG-plekken, verzonnen geometrie) voor de test en de ramingen |
| `scripts/bag_lod22_test.mjs` | tests op de conversielogica, de bestandsindeling, het haalscript en de scheiding van het spel |

## Draaien

Niets hiervan draait vanzelf. Het haalscript gebruikt het netwerk alleen met `--fetch` (ophalen) of `--sizes` (groottes opvragen).

```
python3 scripts/world/fetch_3dbag_lod22.py --tile 8/760/72                 # plan: URL's uit de tegelindex in de cache, geen netwerk
python3 scripts/world/fetch_3dbag_lod22.py --province --sizes              # de groottes van alle tegels van de provincie (HEAD-verzoeken)
python3 scripts/world/fetch_3dbag_lod22.py --fetch --bbox 233000,581500,234500,582500   # de tegels die de RD-box raken
node scripts/world/bag_lod22.mjs convert data/cache/3dbag-lod22/v20250903/10-876-1098.city.json.gz
node scripts/world/bag_lod22.mjs estimate                                  # provincie en frametijd uit data/world/3dbag_province.json.gz
node scripts/bag_lod22_test.mjs                                            # de tests (geen netwerk)
```

Voor het ophalen controleert het script: de licentie in de `metadata.json` van de versie (moet CC BY 4.0 noemen, anders stopt het), de grootte per
tegel tegen `--max-mb` (standaard 600) en de vrije schijf (4 maal de tegel plus 2 GB), en na het ophalen de sha256 uit de tegelindex. De versie en
de licentieregel komen in `<out>/<versie>/VERSIE.json`. Een tegel die er al staat wordt overgeslagen (hervatbaar). Een neutrale User-Agent, geen
persoonsgegevens, een pauze tussen tegels. De tegelindex van `v20250903` staat al in `data/cache/3dbag-province/`, dus het plan (zonder netwerk) werkt.

**Nog niet gedaan:** er is geen echte tegel opgehaald. Het haalscript en de CityJSON-structuur die de omzetting leest (Building met BuildingPart,
LoD 2.2 als Solid of MultiSurface, `semantics` met GroundSurface / WallSurface / RoofSurface, `transform`, `b3_h_maaiveld`) zijn geschreven naar de
beschrijving van 3D BAG en de tegelindex (`cj_download`, `cj_sha256`), niet tegen een echte tegel getest. Eerste echte tegel: draai `convert`, kijk
naar het rapport en pas zo nodig `buildingsOf` aan.

## Het formaat `.gbl` (GBL1)

Een bestand per kilometertegel van het wereldframe (hetzelfde raster als de `.gdt`-tegels, `gdt.js tileIndexOf`; de sleutel is `tileKey`, bijvoorbeeld
`246_574.gbl`). Een gebouw hoort bij de tegel waar het middelpunt van zijn omhullende in ligt.

- kop (niet gecomprimeerd): `GBL1`, u16 formaatversie (1), u16 vlaggen, i32 i, i32 j, u32 aantal gebouwen, f32 `quant` (m); daarna deflate-raw van:
- per gebouw: f64 BAG-id (als getal, zonder leidende nullen, zoals in `3dbag_province.json.gz`), i32 ox, i32 oy (cm, wereldframe, de hoek van het gebouw),
  f32 `hg` (m NAP, het maaiveld), u16 hoekpunten, u16 wanddriehoeken, u16 dakdriehoeken, de hoekpunten (3 x i16: x, y, hoogte in eenheden van `quant`;
  x en y vanaf ox, oy; de hoogte vanaf `hg`) en de indices (3 x u16 per driehoek, eerst de wanden, dan de daken).

Wat de omzetting doet: alleen daken en wanden (de grondvlakken vallen weg); de hoogte relatief aan het maaiveld van het gebouw (het spel bouwt vlak: y = 0
is straatniveau; met `?terrain` komt het reliëf eronder, #269); gekwantiseerd op 5 cm (`--quant`) met samenvoegen van dubbele hoekpunten; vlakken onder
0,05 m2 (`--min-area`: nokversiering, rommel) en driehoeken zonder oppervlak vallen weg; een vlak zonder soort gaat op zijn normaal (omhoog = dak,
bijna loodrecht = wand, omlaag weg). Een gebouw dat niet in 16 bits past (meer dan 65.535 hoekpunten of driehoeken, of verder dan 1,6 km van zijn hoek)
wordt als "te groot" geteld en niet weggeschreven. Voor three.js: de opgeslagen (x, y, hoogte) is (x, hoogte, y), zonder de volgorde van de indices te
veranderen; de buitenkant blijft tegen de klok in (de omzetting van RD naar three is een draaiing, geen spiegeling).

Beperkingen, eerlijk: vlakken met gaten worden zonder de gaten getekend (geteld in het rapport, `holes`); er is geen vereenvoudiging van de vorm zelf (geen
samenvoegen van vlakke driehoeken, geen vervangen van kleine dakkapellen door blokjes); de driehoekenaantallen van echte gebouwen zijn onbekend tot er een
tegel is omgezet.

## Maten

**Gemeten, maar alleen op de voorbeeldtegel.** De voorbeeldtegel heeft echte BAG-plekken en verzonnen geometrie (een blok, bij een schuin dak een dakkapel en
een schoorsteen): 200 gebouwen gaven 5.388 driehoeken (27 per gebouw), 4.372 hoekpunten en ongeveer 0,18 ms omzetten per gebouw. Dat zegt iets over de
omzetting, niets over de hoeveelheid die een echt LoD 2.2-gebouw heeft.

**Uit echte data.** `data/world/3dbag_province.json.gz` heeft 454.941 gebouwen in de provincie met een rand van 3 km. Gebouwen binnen 150 m van een gebouw
(telling per cel van 50 m): mediaan 143, p90 308, p99 509, maximum 794. De tegelindex van `v20250903` heeft voor de provincie en de rand 436 tegels (samen
4.474 km2); de tegels zijn een quadtree met zijden van 0,5 tot 64 km (de meeste 1 of 2 km). De bestandsgrootte per tegel is niet bekend zolang `--sizes` niet
gedraaid is.

**Geraamd** (`node scripts/world/bag_lod22.mjs estimate`; aannames: 0,6 hoekpunt per driehoek, 6 B per hoekpunt en per driehoek, deflate 0,6, 0,4 ms omzetten
per gebouw zonder het inlezen van de JSON): per gebouw is het aantal driehoeken de grote onbekende, dus drie scenario's.

| driehoeken per gebouw (aanname) | opslag provincie | driehoeken provincie | binnen 150 m: p50 / p90 / p99 / max |
|---|---|---|---|
| 60 | 165 MB | 27 M | 9k / 18k / 31k / 48k |
| 150 | 401 MB | 68 M | 21k / 46k / 76k / 119k |
| 300 | 794 MB | 136 M | 43k / 92k / 153k / 238k |

Bouwtijd: de omzetting zelf is minuten (3 min voor de hele provincie bij 0,4 ms per gebouw); de tijd gaat naar het ophalen en het inlezen van de JSON:
een gepakte tegel kan ongepakt een halve gigabyte of meer zijn en `JSON.parse` heeft een stringgrens van ongeveer 512 MB (zie risico's). Reken op uren voor de
hele provincie, vooral door het downloaden; dat is een schatting, geen meting.

## Risico's voor de frametijd en de rest

Het spel tekent nu 450k tot 830k driehoeken per frame (`docs/PERF-METING-2026-10-19.md`, de rijen `driehoeken`); de renderer-CPU is de bekende bottleneck (14 tot
41 ms per frame op hoog, 450 tot 820 draw calls). Daartegen:

1. **Driehoeken.** Alleen de gebouwen binnen 150 m, vervangen (niet erbij): bij 150 driehoeken per gebouw 21k (mediaan) tot 119k (drukste plek) extra, minus wat de
   procedurele gebouwen nu kosten. Op de zwakke instellingen en op de Android-build kan het erboven. Schaduwpassen tekenen de gebouwen opnieuw: tel ze dubbel.
2. **Draw calls.** Eén mesh per gebouw is onmogelijk; per kilometertegel samenvoegen (zoals `staticbatch3d.js`) en per tegel cullen. Meer batches betekent meer calls,
   en `perf/run.mjs` meet draw calls apart.
3. **Opbouwhitches.** Decoderen (inflate plus omzetten naar `BufferGeometry`) hoort in een worker (zoals `tileworker.js`/`geojobs.js`), per tegel binnen een tijdsbudget,
   in dezelfde stroom als de tegels; een tegel van 1 km kan in de stad duizenden gebouwen hebben.
4. **Geheugen.** 70 tot 300 M driehoeken voor de provincie past nooit tegelijk: alleen de omgeving van de speler, met dezelfde in- en uitlaadregels als de tegels.
5. **Gedrag.** Botsing, daken om op te lopen (`roofTopAt`), camera-verbergen en `setBuildingHidden` zijn gebouwd op voetafdruk en `h`; de LoD 2.2-laag moet alleen
   tekenen en niets van dat veranderen (anders breekt het spel op daken).
6. **Landmarks en handwerk.** De landmarks en het handwerk (Grote Markt, museum) hebben eigen modellen; die gaan voor. Een 3D BAG-gebouw dat samenvalt met een
   handgemaakt model moet wegvallen, anders zie je het dubbel.
7. **Inlezen van grote tegels.** Een tegel groter dan de stringgrens van `JSON.parse` wordt geweigerd (`--max-mb`). Dan is een streamende lezer nodig (per `CityObject`)
   of een tegel in kleinere stukken; dat is niet gebouwd.
8. **Licentie en stijl.** Zie `docs/LICENTIES.md`. In low-poly beeldstijl (DESIGN_SYSTEM.md) zijn echte dakkapellen en schoorstenen soms te fijn; de prototypelaag moet
   de kleuren van het spel gebruiken, niet de 3D BAG-textuur (die is er niet), en kleine onderdelen kunnen weg.

## Plan voor een latere prototypelaag

Niet nu bouwen; dit is de volgorde als het besluit valt.

1. **Eerste echte tegel** (stadsrand en dorp): ophalen, `convert`, de werkelijke driehoeken per gebouw en bytes in dit document invullen; de CityJSON-aannames controleren.
2. **Viewer zonder spel**: een kleine pagina (of een `scripts/qa`-script) die een `.gbl` tekent met de spelkleuren, om de stijl en het aantal driehoeken te beoordelen.
3. **Instelling**: een optie "Gedetailleerde daken" (standaard uit), voor landmarks en gebouwen binnen ~150 m van de speler; achter een `?`-vlag in `devflags.js` tot het stabiel is.
4. **Laden**: de `.gbl`-tegels naast de `.gdt`-tegels in de wereldmap (een eigen laag in de index, niet in de bestaande packs), gelezen door de bestaande tegelopslag,
   gedecodeerd in een worker, per tegel één samengevoegde mesh; de procedurele gebouwen binnen de straal verbergen (`setBuildingHidden`), de rest ongemoeid.
5. **Meten**: `scripts/perf/run.mjs` op de vaste standen (`stad-markt`, `stad-straat`, `dorp-winsum`) met en zonder de laag: frametijd, draw calls, driehoeken, heap, hitches.
   Doel: geen merkbare achteruitgang op "hoog" en uit op "laag". Haalt het dat niet, dan alleen de landmarks.
6. **Besluit**: pas daarna de stage en de release; tot dan blijven de bestanden buiten `desktop/build` en buiten de poort.

## Licentie

3D BAG: TU Delft en 3DGI, https://3dbag.nl, CC BY 4.0; de aftiteling (NOTICE.md, `docs/LICENTIES.md`, de credits) bestaat al voor de hoogtes. Het omgezette formaat is een
afgeleid werk: dezelfde vermelding. Extra voorwaarden zijn niet gevonden in wat al in de repo staat; het haalscript controleert de metadata van de gedownloade versie op
CC BY 4.0. De actuele voorwaarden van data.3dbag.nl zijn bij het maken van dit document niet opnieuw gelezen: bij de eerste echte download nalopen.
