# Audit uiterlijk, 23-11: "goedkope assets, lege luie game"?

Rol: kritische art director bij een publisher. Branch `audit-uiterlijk-23-11`, vanaf `origin/main` (b9086c127, v0.65.0).

**Wat dit is, en wat niet.** Geen Electron gedraaid (andere agents hebben de slot). Dit is gebaseerd op:
bestaande screenshots (`docs/screenshots/*.webp`, `docs/beeld-21-11/wereldkleur/overzicht.png`, `docs/beeld-21-11/beeldronde/wereld2`, `C:\Users\abuis\gde-gate-22-11\owner-review`) en de code (`greenery.js`, `scene3d.js`, `models3d_buildings.js`, `landmarkkit.js`, `countrymodels.js`, `terrain3d.js`, `parkedcars/trafficfleet.js`, `streetclutter.js`, `worldlife.js`, `sfx/`).
Alles wat hieronder als **gezien** staat, zit op een bestaande screenshot. Alles als **code** is uit de bron gelezen. **Niets van mijn eigen wijzigingen is in beeld gezien**: zie "Nog niet bekeken".

**Eerlijke eindconclusie vooraf.** Dit spel is geen lege luie game. De variatiesystemen zijn er al, vaak beter dan verwacht: 12 boomsoorten met kroonvorm en tweede kroonlob, gevels per bouwstijl en kleurfamilie in een shader, 349 kerken uit een parametrische kit (toren, koor, baksteen, dak, ramen, steunberen uit een hash), verkeer per wijkprofiel, geparkeerde auto's in 16 tinten, pachtvlakken, dagelijks leven per kalenderdag (`worldlife.js`), 375 geluidsbestanden met 193 groepen en toonhoogtevariatie. Wat een publisher op een screenshot WEL ziet is anders: gladde bolvormen, egale vlakken en een paar plekken waar het handwerk ophoudt. Hieronder staat dat op volgorde van ernst.

Ernst: **A** valt op een screenshot of trailer meteen op, **B** valt op bij even kijken, **C** alleen bij nauwkeurig zoeken.
Kosten: **S** een dag of minder, **M** enkele dagen, **L** een week of meer (of externe kunst).

## Gedaan in deze branch

| # | Wat | Waar | Prestatie |
|---|---|---|---|
| W1 | Boomkronen waren gladde icosfeers (twee identieke bollen per boom, in elke straat). Nu: bobbels uit drie sinussen van de positie (continu, dus geen barsten), een schaduwverloop in vertexkleur (onder donkerder, boven lichter) en voor kegels (dennen) hetzelfde verloop | `greenery.js` `crownBump`, `crownShade`; `scene3d.js` `shapeCrown` | eenmalig bij het laden; dezelfde 4 instanced draws; geen per-frame werk |
| W2 | Elke boom had maar een helderheidsverschil (+-10%). Nu ook een tint per boom (geelgroener of blauwgroener, maximaal 9% en 14%) | `greenery.js` `treeColor` | rekenwerk bij het synchroniseren van de boomlijst, geen allocatie (bestaand `out`) |
| W3 | Gevels: lange steen- en pleisterwanden waren per gebouw een egale tint. Nu zachte verweringsvlekken (+-7,5%) in vlakken van enkele meters, naast de bestaande contactschaduw | `models3d_buildings.js` `wallContactOnBeforeCompile` | alleen drie sinussen in het fragment van een materiaal dat al een hook had; geen extra draw, geen textuur |
| W4 | Dakpannen: zelfde idee per dakvlak (zon, mos, vuil), +-9% | `models3d_buildings.js` `roofWeatherOnBeforeCompile` | idem |
| W5 | Test voor de pure delen (bobbel binnen 25%, schaduw monotoon, tint per boom ruim verschillend) | `scripts/kroon_variatie_test.mjs` | 64/64 |

Constitution: geen merken, geen tekst, geen winter (alleen groene tinten en bruin/rood baksteen). Kleuren blijven binnen de wereldpalet-filter (`worldpalette.js`) omdat de vermenigvuldiging per kanaal klein is en op de al gefilterde basis werkt.
Let op, bekend risico: de gevel- en dakvlekken gebruiken wereldcoördinaten. Het drijvend oorsprong (`floatingorigin.js`, drempel nu `Infinity`) is niet aan; zodra het aangaat verspringen de vlekken bij een rebase. Dan hoort `uRenderOrigin` in de shader (zelfde plek, twee regels).

## Bevindingen, gerangschikt

### 1. Ernst A

| Plek | Probleem | Voorstel | Kosten | Bron |
|---|---|---|---|---|
| Alle landmarks behalve Martinitoren (`landmarkmodels.js`: een enkel GLB) | De Martinikerk, het Goudkantoor, Hoofdstation, Forum, Academiegebouw, warenhuis en museum zijn procedurele dozen met dakkap (`landmarks3d.js` 1175 regels, `addLandmarkDetail`). De prompts A2 tot A8 staan klaar in `docs/3d-model-prompts.md`, maar alleen A1 is ingebouwd. Voor een publisher IS de Grote Markt de etalage en daar staan geen herkenbare gebouwen behalve de toren. | A2 (Martinikerk) en A3 (Goudkantoor) eerst, dan A4 en A5 (station, Forum). Zelfde laadpad als de toren (`MODEL_PATHS`); budget bewaken met `landmark_budget`. Zonder externe kunst: de kit-aanpak van `landmarkkit.js` (parametrisch, met handplaatsing per naam) uitbreiden naar stadsgebouwen: gevelritme, trapgevel, kroonlijst per naam. | L (GLB) of M (kit) | code, `docs/3d-model-prompts.md` |
| Lucht (alle dagscreenshots) | Wolken zijn drie grote, vlakke, spiegelende veelhoeken (zie `docs/screenshots/stad-dag.webp`, `regio-eemshaven.webp`). Op de trailer-still het zwakste punt. | Andere agent (wolken/water). Mijn noot: ze hebben nu geen zachte rand en geen dikte; een verlooptextuur op de rand of dieptefade zou ook met weinig driehoeken veel doen. | M | gezien |
| Water (`kust-sluis.webp`, `regio-eemshaven.webp`) | Het water is een grof facet-net met harde driehoekspiegelingen zonder schuim en zonder oeverlijn. Het is bewust low-poly, maar de facetten zijn groot genoeg om als "geen shader" gelezen te worden. | Andere agent. Noot: schuimrand bij oever en brugpijlers, kleinere facetten dicht bij de camera. | M | gezien |

### 2. Ernst B

| Plek | Probleem | Voorstel | Kosten | Bron |
|---|---|---|---|---|
| Boomkronen (opgelost voor vorm en tint, W1/W2) | Alle loofbomen waren dezelfde bol met twee bollen. In `docs/screenshots/stad-dag.webp` staat een rij bijna identieke roze bollen (`kers`) langs het marktplein, met een vlakke roze kleur. | W1 en W2 gedaan. Nog open: de kers is op het plein een rij van acht; de `kers` heeft in `speciesFor` een straatkans van 0,45 maar de marktplein-rij is handplaatsing. Meng er twee, drie andere soorten door (esdoorn, linde) en laat de roze minder verzadigd. | S | gezien |
| Station en parkeerplaats Veendam (`w1-station-veendam-schuin-1920.png`) | Een rij rode auto's even groot en even rood naast elkaar. De algemene parkeerplaatsen hebben 16 tinten, deze stationsparkeerplaats (wachtprops of stationkit) niet. | Tint uit hetzelfde GREYS/FADED-palet laten trekken met `hash2(x, y)`; zelfde `lookModel` pad als `parkedcars.js`. | S | gezien, code niet uitgezocht |
| Weiland (Veendam, Eemshaven) | Heel groot, egaal groen, met alleen maaistrepen. De provincie bestaat uit zulke vlakken en op afstand leest het als een kleurvlak. Er is perceelvariatie (`percelen.js`, kleurvlakken) maar ze valt in de mist weg. | Op L1/L2 afstand een macro-ruis (twee octaven, tientallen meters) in de weidekleur; hoort bij `greenwater.js`/`countryfield.js`. Of wolkschaduwen: een bewegende donkere vlek is gratis en geeft leven aan elk vlak. | S/M | gezien |
| Landmarks buiten de stad (349 kerken, 96 molens) | De kit is parametrisch en de bekende kerken zijn met de hand ingesteld (`landmarkkit.js` regel 79 e.v.), maar de overige ~330 kerken kiezen uit dezelfde zes kenmerken. Vanaf de weg leest het snel als "weer dezelfde kerk". | Twee extra kenmerken per kerk uit de hash: een topgevel of dakruiter, en een lengte-breedte-verhouding die het OSM-grondvlak volgt. De kit heeft het grondvlak al (`footprint fit`). | S/M | code |
| UI-iconen (zie punt 6) | Een paar resterende typografische tekens in plaats van iconen. | Zie 6. | S | code |
| Geluid, uniek, vaak gehoord | 78 van de 193 groepen hebben een enkel bestand (`ui_klik`, `kassa_koop`, `winkelbel_deur`, `klok_tik`, `bus_halte_ding`, `trein_deur_*`, `deur_*_op`, `dobber_plons`). De toonhoogte varieert (`rate` in `sfx/ui.js`), maar een enkele opname in een winkelstraat of een instaphalte is de meest herhaalde klank. | `ui_klik` is al `rate`-gevarieerd; voor `winkelbel_deur`, `trein_deur_open/dicht` en `bus_deur_sis` een tweede en derde opname, of een kleine toonhoogte- en filter-jitter in `audio.js`. Vermelden in `docs/AUDIO-LICENTIES.md` (ADR 0039). | S per klank | code, `game/audio/sfx/manifest.json` |

### 3. Ernst C

| Plek | Probleem | Voorstel | Kosten | Bron |
|---|---|---|---|---|
| Rijen windmolens (Eemshaven) | De rotor heeft een fase per positie (`farprops.js`), de torens zijn identiek en de gondel kijkt in dezelfde richting (`WIND_YAW`), wat klopt bij een windrichting. Verder verveelt het niet. | Laten staan. Evt. een paar torens iets hoger/lager via `hub`. | S | gezien |
| Kleine winkelgevels (Binnenstad, Woonwijk) | Vlakke kleurblokken met een raamrij; geen luiken, bloembakken, dakkapellen of schoorstenen als variatie op de dozen. In de "Woonwijk, overdag" en "Binnenstad" screenshots zie je grote, nette, maar egale gevels. | Een gedeelde "gevelaccessoire"-laag: per huis uit hash 0 tot 2 van rolluik, bloembak, schoorsteen, dakkapel, vlaggenstok. InstancedMesh per soort, op L0/L1 afstand. Past in het staticbatch-pad. | M | gezien (overzicht.png), code |
| Cutscene-props (`storyprops.js`) | 49 soorten, 36 tot 516 driehoeken, procedureel (`docs/PROPS-STAND-22-11.md`). `doos` (24 driehoeken), `briefje`, `deken` zijn dozen. In een cutscene-close-up leest een doos van 24 driehoeken als plaatshouder. | Alleen de close-up-props (`aktetas`, `klembord`, `pan`, `soepketel`) een afschuining en een tweede materiaal; de rest is prima op afstand. | S | code |
| Dag-nacht (`overzicht.png` nacht-rij) | Straatlantaarns geven een warme vlek, maar het pleintje blijft grotendeels donker; in de avondfoto's valt het contrast hard weg. | Past bij de vloertegel-lichtkegel van `nightlights3d.js`; meten tegen de nachtbudgetten voor je het opvoert. | M | gezien |

## De zeven vragen

1. **Kale, simpele of plaatshoudende modellen.** Het meest zichtbaar: landmarks op Martinitoren na (A), cutscene-props op 24 tot 60 driehoeken (C), parkeer- en stationsauto's als rij gelijke dozen (B). Voertuigdeuren en trekker-limo, personages en dieren, wolken en water, cutscenes en effecten: andere agents; ik noteer alleen dat wolken en water het zwakst op de stills zijn.
2. **Herhaling.** Bomen waren de grootste herhaling (opgelost voor vorm en tint). Kerken: parametrisch maar met een kleine kenmerkenverzameling. Geluid: 78 enkele opnames. Verkeer, voetgangers en kleding hebben al rol- en wijkprofielen (`trafficfleet.js`, `npcOutfit`).
3. **Lege plekken.** Weilanden zijn egale vlakken op afstand (B). De stad is goed gevuld (`streetclutter.js`: fietsen, kliko's, zuilen, abri's, nietjes, stoepborden, scooters, kiosken; `worldlife.js`: markt, artiesten, studentenfeest, kermis, wandelaars, hardlopers). Herkenbaarheid: Martinitoren heeft een model; Grote Markt, Noorderplantsoen en Hoogkerk hebben een gebied, een naam en leven, maar het gebouw dat je ziet is een procedurele doos. Op de Grote Markt is dat zichtbaar, in Hoogkerk niet (een dorp; geen aparte kit gezien).
4. **Materialen, kleur, belichting.** De wereldkleur-pass (`worldpalette.js`, `worldgrade.js`, `docs/WERELDKLEUR-21-11.md`) werkt: het overzicht toont warme baksteen, bordgroen gras. Gevels waren daarbinnen vlak; W3 en W4 geven ze vlekken. Dat is geen PBR, wel zichtbaar op een lange gevel. Straatstenen hebben al macro-ruis en baksteenvoegen (`terrain3d.js` `terrainAlbedo`).
5. **Stijl-inconsistentie.** Gevelwanden met baksteenvoegen en hoge detailtextuur naast lage-poly wolken en water zonder dikte of schuim: de wolken en het water zijn het minst gedetailleerd van alles en vallen daardoor uit de stijl (A). De UI (zeefdruk, ADR 0040) is consistent; de wereld is lager gedetailleerd dan de UI. Dat is bewust ("low-poly, maar herkenbare plekken", `DESIGN_SYSTEM.md`), maar dan moeten wolken en water bij het gebouwdetail passen.
6. **UI-iconen en afbeeldingen.** Phosphor is bijna overal doorgevoerd (`docs/ICONEN-INVENTARIS-20-11.md`; 88 `icoon('...')`-aanroepen). Resterend: 32 typografische tekens in 14 bestanden (sterren `★ ☆` voor waardering en politie in `busbestuurhud.js`, `sidejob_lijn.js`, `missions.js`, `cinematics.js`, `vliegschool.js`; pijlen `↑ ↗ → ↘` in `playerstatus.js`, `discgolf.js`, `streetfurniture3d.js`; vormtekens in `coopspelers.js`; taakmarkeringen in `boerderijgast.js`). Het zijn geen emoji, maar ze hangen aan het lettertype van het systeem en zien er per machine anders uit. 55 inline `<svg>`-literals staan in 32 bestanden (bewust eigen tekening voor wapens, wanted-sterren, toerental en groeistadia). Laag risico; voorstel: sterren en pijlen via `icoon('ster')`/`icoon('pijl_*')`. Kosten S. Niet gedaan omdat de vervangingen per regel in de tekst van een HUD-regel zitten en ik die niet in beeld kan toetsen.
7. **Geluid.** Alleen vastgesteld uit bestanden: 375 bestanden uit 320 bronnen, 50 onder CC BY, namen in `docs/AUDIO-LICENTIES.md` (ADR 0039). Stappen hebben 6 varianten per ondergrond (goed). 78 groepen hebben een enkel bestand; de gevaarlijkste voor herhaling zijn de winkelbel, bus- en treindeuren, `klok_tik`, `dobber_plons` en de kassa. Ambience-lussen (`regen_*`, `wind_gras`, `zomer_vogels`) zijn enkele opnames; als de lus kort is hoor je het ritme. Dit is niet beluisterd. Er ontbreekt (in de manifestnamen) geen groep die een veelgebruikt object nodig heeft, behalve per-oppervlak vliegtuigen/boten (staan er al). Een luisterronde van een mens blijft nodig (`docs/SFX-LUISTERLIJST.md`).

## Wat de andere agents missen (alleen genoteerd)

- Wolken: harde randen, geen dikte of beweging in de vorm; ze lezen als platte veelhoeken.
- Water: grote facetten, geen schuim, geen reflectie van lucht in de kleur; het scheepspad (`kust-sluis`) toont het beste voorbeeld.
- Personages: ik zag ze alleen klein en op afstand; de spelerfiguur onderin beeld (`overzicht.png`, rij 2 en 5) heeft een zwart gezicht in het straatlicht, dat gaat over huidtint en rim light, niet over dit document.
- Effecten: wegfladder en regen op de weg staan al; geen opmerking.

## Nog niet bekeken

Alles wat ik wijzigde (W1 tot W4) is **niet in beeld gezien** en is niet in Electron getest. Mijn verwachtingen, ter toetsing door de coördinator:

- Kronen: bobbelrand 25% op een straalfactor van 1 kan bij zeer kleine kronen (`kers`, 3 m) bijna onzichtbaar zijn en bij grote (`plataan`, 7 m) duidelijk. De botsing en camera-verberging (`treeBlocksPoint`) gebruiken nog de gladde ellipsoïde zonder bobbels; de bobbels liggen gemiddeld rond 1 maar steken op enkele plekken tot ruim 20% uit. Kijk of een stuk kroon door de camera of een gevel steekt.
- Verlopen: `vertexColors: true` op `TREE_CANOPY_MAT` en de klonen. Een geometrie zonder `color`-attribuut zou zwart worden; beide kroongeometrieën kregen er een. De omgevallen boom (`buildTreeMesh`) en de schaduw-kroon gebruiken andere materialen en blijven gelijk.
- De `emissive`-vulling bij nacht is niet veranderd; de vertexkleur dempt de onderkant nu een stuk (0,72), dus een kroon bij avond kan iets donkerder lijken dan voorheen. De gemiddelde helderheid van het verloop is ~1,0, dus overdag gelijk aan voorheen.
- Gevel- en dakvlekken: kijk op `1-grotemarkt-dag` en `9-woonwijk` of de vlekken niet als vlekkerig behang lezen en of de nachtmaterialen (ramen, `uBNight`) geen verschil tonen. Sterkte staat in de twee shaderregels (0,075 en 0,09).
- Prestaties: niet gemeten. Ik verwacht geen verschil (drie `sin` per fragment op wanden en daken, nul draws, geen allocaties). Meten met de bestaande renderperf-run (`docs/PERF-RENDER-21-11.md`) voor de release.

## Open werk, op volgorde

1. Landmark-GLB's A2 en A3 (Martinikerk, Goudkantoor): L, grootste zichtbare winst op trailer en eerste beeld.
2. Wolken en water bij het gebouwdetail laten aansluiten (andere agents).
3. Gevelaccessoires (luik, bloembak, schoorsteen, dakkapel) als gedeelde instanced laag: M.
4. Macro-ruis en wolkschaduw op weilanden: S/M.
5. Stationsparkeerplaats, marktplein-kersenrij en kerk-kenmerken: S elk.
6. Eén extra opname voor winkelbel, deur en tram/trein: S per klank.
7. Typografische sterren en pijlen naar `icoon()`: S.

## Samen spelen

Alleen rendering: geen spelstaat, geen netwerkbericht. De kroonvorm en tint komen uit de positie van de boom en zijn dus bij elke speler gelijk. Wie later aansluit krijgt hetzelfde beeld. Geen test nodig voor Samen spelen.
