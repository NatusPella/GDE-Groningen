# Art direction: visuele stijlgids GDE Groningen

> **Canonieke stijlgids voor de 3D-wereld.** Vastlegging van kleurpaletten, licht,
> materialen, vormen en kwaliteitsnormen. Voor UI-design zie [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md);
> deze gids richt zich op gebouwen, vegetatie, voertuigen, personages en werelddetails.
> Zie ook [.specs-fire/standards/wereld.md](../.specs-fire/standards/wereld.md).

**Kernprincipes:**
- **Low-poly, maar herkenbaar**: architectonische low-poly met vlakke facetten; Groningen moet herkenbaar blijven
- **Altijd zomer** (constitution regel 3): geen sneeuw, ijs of winterlicht
- **Groningse kleuren**: baksteenrood/bruin, natuursteen crème, daken leisteen/terracotta
- **Consistentie**: één materiaalbehandeling per type, geen willekeur per object
- **Wereldpaletsysteem**: sinds ADR 0040 trekt `worldpalette.js` kleuren subtiel richting designsysteem-inkten (papier, inkt, bordgroen, zomergeel, roze)

---

## 1. Kleurpaletten per materiaalsoort

Alle hexwaarden in `0xRRGGBB`-notatie. De spreiding geeft de toegestane variatie per kleurgroep.
Sinds 21-11 lopen alle wereldkleuren door `dsWereld()` (worldpalette.js), wat ze SUBTIEL (meng 0,4)
naar het designsysteem trekt.

### 1.1 Baksteen (gevels)

**Bron:** HABBO_PALETTE + models3d_buildings.js, BRICKS-set en PALETTE_FAMILIES.

| Kleur | Hex | Rol | Spreiding |
|---|---|---|---|
| **Gronings baksteenrood** | `0x8f4634` | hoofdkleur historisch centrum | ±10% luma, zelfde tint |
| **Baksteenoranje** | `0xa9623f` | warme woonwijken | ±12% luma |
| **Donkere baksteen** | `0x6e3a2c` | oudere panden, schaduwtoon | −5% tot +8% luma |
| **Bruine baksteen** | `0x7d4b37` | 19e/20e-eeuws | ±10% luma |
| **Geelbruine baksteen (buff)** | `0xb08a5e` | nieuwe bouw, modern | ±15% luma, mag lichter |
| Historische muren | `0x9a5a44`, `0x84503c` | monumenten (HISTORIC_FACADE) | ±8% luma |

**Uitschieters:**
- Te verzadigd rood (>60% saturatie bij >50% luma) trekt te veel aandacht
- Puur grijs (`S < 0,05`) is geen baksteen: dat is beton/steen

**Regel:** Baksteen krijgt brickTexture (createBrickDetailTexture) en shade(hex, 1,1) voor wat glans.

### 1.2 Pleisterwerk en gevelbekleding

| Kleur | Hex | Rol | Spreiding |
|---|---|---|---|
| **Pleisterwit** | `0xe3ddd0` | stucwerk, wit geschilderd | ±5% luma, warme tint |
| **Crème** | `0xd6cab0` | klassiek pleister | ±8% luma |
| **Roze/zalm** | `0xc2a293` | woonwijken jaren '20–'60 | ±10% luma |
| **Mint** | `0xa3b2a0` | art deco, bijzondere panden | ±10% luma, groenig |
| **Okergeel** | `0xcfb46c` | gele gevels | ±12% luma |

**Uitschieters:**
- Neonwit (`>0xf0f0f0`) zonder warme ondertoon (rol 'papier' in worldpalette forceert papier = `0xf3ead3`)
- Te koude tint (blauwgrijs) bij pleister

### 1.3 Daken

**Bron:** PALETTE_FAMILIES roofs, roofMaterial + tileTexture.

| Kleur | Hex | Rol | Spreiding |
|---|---|---|---|
| **Terracotta** | `0x8a4a33` | pannendaken historisch | ±10% luma |
| **Leisteen** | `0x464b52` | grijze pannen, modern | ±8% luma, mag blauwer |
| **Bruinrood** | `0x5b3a2e` | oude dakpannen | ±10% luma |
| **Blauwgrijs** | `0x3e4449` | leien | ±8% luma |
| **Industriedak (bitumen)** | `0x5a5d60` | plat dak, grijs | ±5% luma |
| Platte daken (4 tonen) | `0x747478`, `0x5e5f63`, `0x7e7a73`, `0x6c6e6a` | FLAT_ROOF_TONES | ±8% luma |

**Regel:**
- Dakpannen krijgen tileTexture en shade(hex, 1,08) voor iets glans
- Platte daken krijgen flatRoofTexture (bitumenstroken met verwering)
- Sinds 23-11 roofWeatherOnBeforeCompile: dakpannen verkleuren per dakvlak (zon, mos)

### 1.4 Natuursteen, stoepen, klinkers

**Bron:** worldpalette.js rol 'steen', STONE/HARDSTONE, models3d_buildings.

| Kleur | Hex | Rol | Spreiding |
|---|---|---|---|
| **Natuursteen (zandsteen)** | `0xcdc8bd` | STONE, geveldetails | ±10% luma |
| **Hardsteen** | `0x55575a` | HARDSTONE, dorpels | ±8% luma |
| **Stoeptegels** | `0x7b776d`, `0x837e74` | crème/grijs | ±10% luma |
| **Klinkers rood** | `0x6c4236` | straat historisch | ±12% luma |
| **Klinkers grijs** | `0x7a766e` | modern | ±10% luma |
| **Grind** | `0x9a8f78` | paden | ±15% luma |

**Uitschieters:**
- Koud blauwgrijs (`h > 200`) bij stoep/steen; worldpalette rol 'steen' trekt naar papier (warm)

### 1.5 Wegdek

**Bron:** worldpalette.js rol 'weg', WERELD_KLEURPLAAT.

| Kleur | Hex | Rol | Spreiding |
|---|---|---|---|
| **Asfalt hoofdweg** | `0x57595c` | rijbaan groot | ±5% luma |
| **Asfalt gewoon** | `0x4b4d50` | woonwijk | ±5% luma |
| **Fietspad rood** | `0x823b2d` | Groningse standaard | ±10% luma, mag oranje |

**Regel:** worldpalette rol 'weg' trekt naar inkt (`0x1d1b17`, warm inktgrijs), geen koud blauwgrijs.

### 1.6 Groen: gras, velden, loof

**Bron:** greenery.js, worldpalette.js rol 'groen' en 'loof'.

#### Gras en velden

| Kleur | Hex | Rol | Spreiding |
|---|---|---|---|
| **Park** | `0x4f7234` | verzorgd gazon | ±8% luma |
| **Weide** | `0x557434` | grasland | ±10% luma |
| **Bos (ondergroei)** | `0x405e2c` | donkerder groen | ±10% luma |
| **Gazon** | `0x4a6c31` | tuin | ±10% luma |
| **Droog gras** | `0x9c9153` | zomer uitgedroogd | ±15% luma, gelig |
| **Mos** | `0x3b5a2c` | schaduw | ±8% luma |
| **Grasrand** | `0x3b5529` | overgang | ±10% luma |

#### Boomkronen (loofbomen)

**Bron:** worldpalette.js WERELD_KLEURPLAAT 'Bomen'.

| Soort | Hex | Spreiding |
|---|---|---|
| **Linde** | `0x4f7d3a` | ±10% luma |
| **Plataan** | `0x5d8a42` | ±10% luma |
| **Eik** | `0x48703a` | ±10% luma |
| **Beuk** | `0x527a33` | ±10% luma |
| **Es** | `0x6a9148` | ±12% luma |
| **Populier** | `0x6a9352` | ±10% luma |
| **Wilg** | `0x82a35e` | ±12% luma, lichter |
| **Den (naaldboom)** | `0x2e4d2a` | ±10% luma, donker |
| **Kers (bloesem)** | `0xe58fb4` | roze lente; zomer = groen | alleen bloesem |

#### Stammen

| Kleur | Hex | Rol |
|---|---|---|
| **Eikenstam** | `0x4a3a2c` | WERELD_KLEURPLAAT |
| **Hout midden** | `0x8a6440` | HABBO woodMid |
| **Hout donker** | `0x5a3d26` | HABBO woodDark |
| **Hout licht** | `0xb8956a` | HABBO woodLight |

**Regel:**
- worldpalette rol 'groen' trekt naar bordzacht (`0x5e9771`, bordgroen + papier 35%), zodat groen gedempt wordt
- rol 'loof' trekt iets minder (w 0,55), zodat boomsoorten herkenbaar blijven
- Geen neongroen (`S > 0,8` bij `L > 60`); zomer is mat en stoffig

### 1.7 Water

**Bron:** worldpalette.js rol 'water', WERELD_KLEURPLAAT.

| Kleur | Hex | Rol | Spreiding |
|---|---|---|---|
| **Diep water** | `0x0b2420` | grachten, kanalen | ±8% luma |
| **Ondiep water** | `0x2c4a38` | sloot | ±10% luma |
| **Kroos** | `0x5d7f2c` | groen oppervlak | ±12% luma |
| **Schuim** | `0xb9c2b0` | rimpelingen | ±10% luma |
| **Wereldpalet waterdoel** | `0x1f4654` | inktblauwgroen (tussen bordgroen en rustig blauw) | vaste tint |

**Uitschieters:**
- Neonblauw (`h 190–220`, `S > 0,65`, `L > 50`) is te spelsituatie-achtig
- Puur grijs water (`S < 0,08`) mist de groenblauwe Groningse tint

### 1.8 Metaal, glas, details

#### Metaal en constructie

| Kleur | Hex | Rol |
|---|---|---|---|
| **Metaalgrijs** | `0x7b7e82` | HABBO metalGrey, staal |
| **Industriemuren** | `0x7b7e82`, `0x8c8a82`, `0x5f6468`, `0x6e5a48` | INDUSTRIAL_WALLS |
| **Hardsteen/beton** | `0x55575a` | HABBO hardstone |
| **Bitumen** | `0x4a4a4c` | HABBO bitumen |

#### Glas

| Kleur | Hex | Rol | Spreiding |
|---|---|---|---|
| **Glastonen** | `0x26323a`, `0x2c3a44`, `0x34434d`, `0x4b5b64`, `0x5a4a3a` | GLASS_TONES | ±10% luma |
| **Glasblauw** | `0x51666f` | HABBO glassBlue | ±8% luma |

**Regel:**
- Glas krijgt glassMaterial (interiorglass.js), met paneUV en nachtverlichting (setGlassNight)
- Glaspuien bij GLASS_FACADE_AREA (>2500 m² vloer, publieksgebouw)

#### Kozijnen, deuren, luifels

| Kleur | Hex | Rol |
|---|---|---|---|
| **Kozijn wit** | `0xece8de`, `0xf2f2f2` | HABBO frameWhite | ±5% luma |
| **Kozijn groen** | `0x2f4a3a` | HABBO frameGreen, klassiek | ±8% luma |
| **Kozijn rood** | `0x6b2a24` | HABBO frameRed | ±8% luma |
| **Deuren** | `0x2f4a3a`, `0x6b2a24`, `0x1f2a3a`, `0x4a3322`, `0x232323`, `0x3a5a6a` | DOOR_COLORS | ±10% luma |
| **Luifels** | `0x2f5a3a` (groen), `0x7a2424` (rood), `0x24386a` (blauw), `0x8a6a2a` (geel), `0x3a3a3c` (grijs) | AWNING_COLORS | ±12% luma |

#### Uithangborden, reclame

| Kleur | Hex | Rol |
|---|---|---|---|
| **Bordengroen** | `0x2f4a3a` | hoofdkleur | ±10% luma |
| **Borderrood** | `0x5a1f22` | accent | ±10% luma |
| **Borderblauw** | `0x1f2a3a` | accent | ±10% luma |
| **Bordcrème** | `0xd6cab0` | lichte achtergrond | ±8% luma |
| **Bordgeel** | `0x7a5a2a` | accent (geen mission-geel) | ±10% luma |

**Uitschieters:**
- Mission-geel (`0xf9c80e`, sinds 21-11 het ene navigatiegeel) is NIET voor winkelluifels; gebruik `0x8a6a2a`
- Neonkleuren (`S > 0,75`, `L > 55`) zijn te schreeuwerig; Groningen is mat en ingetogen

### 1.9 Woonboten

**Bron:** models3d_buildings.js, HOUSEBOAT_WALLS.

| Kleur | Hex | Rol |
|---|---|---|---|
| `0x6b8a5a` | groen | ±10% luma |
| `0x3f6f8a` | blauw | ±10% luma |
| `0x8a5a3c` | bruin | ±10% luma |
| `0xd6cab0` | crème | ±8% luma |
| `0xcfb46c` | geel | ±10% luma |
| `0x5b3a2e` | donkerbruin | ±8% luma |
| `0xa3b2a0` | mint | ±10% luma |
| `0x2f4a3a` | donkergroen | ±8% luma |

**Regel:**
- Woonboten krijgen houseboatWallMaterial (geen contactschaduw, zitten onder straatniveau)
- Hull `HOUSEBOAT_HULL_H = 0,85 m`, draft `WOONBOOT_DIEPTE` (waterlevels.js)

---

## 2. Licht per dagdeel

**Bron:** worldpalette.js WERELD_KLEURPLAAT 'Lucht en licht', worldgrade.js, worldenvironment.js.

### 2.1 Zon hoog (11:00–16:00)

| Eigenschap | Waarde | Toelichting |
|---|---|---|
| **Zonkleur** | `0xfff4e2` | warm wit, licht crème |
| **Zenit** | `0x3a78c4` | helder zomerblauw |
| **Horizon** | `0xc8d9e2` | licht blauwgrijs |
| **Mist/atmosfeer** | `0xc6d4dc` | zachte luchtperspectief |
| **Schaduwtint** | `0xf6f6f6` | bijna wit, zacht |
| **Schaduwhardheid** | 0,75–0,85 | harde schaduwranden, zomer |
| **Ambient** | 0,25–0,35 relatief | vult schaduwen, niet te donker |

**Regel:**
- DirectionalLight intensity ~1,2–1,4
- AmbientLight intensity ~0,3–0,4 (relatief tot zon)
- Geen pure witte zon (`0xffffff`): altijd warme tint

### 2.2 Avond (17:00–19:30, bijna zonsondergang)

| Eigenschap | Waarde | Toelichting |
|---|---|---|
| **Zonkleur** | `0xf2a060` ~ `0xf1ae74` | warm oranje |
| **Horizon** | `0xf1ae74` | oranje gloed |
| **Mist** | `0xd9a67e` | warme nevel |
| **Schaduwtint** | `0xd6eaf2` | koel blauw (tegenkleur) |
| **Schaduwhardheid** | 0,6–0,7 | zachter, lage zon |
| **Ambient** | 0,35–0,45 relatief | meer fill, lange schaduwen |

**Regel:**
- Lange schaduwen richting oost
- Warme raamverlichting gaat aan (setGlassNight, vanaf glow 0,3)
- Lantaarns gaan aan rond 19:00

### 2.3 Nacht (21:00–05:00)

| Eigenschap | Waarde | Toelichting |
|---|---|---|
| **Hemelkleur** | `0x0d1b2f` | nachtblauw |
| **Maanlicht** | `0xa0b8d0` | koel wit-blauw |
| **Raamverlichting** | `0xffd580` | warm geel (glow 0,8–1,0) |
| **Straatlampen** | `0xf2d8a0` | warm wit |
| **Schaduwhardheid** | 0,3–0,4 | zacht, verspreide bronnen |
| **Ambient** | 0,15–0,25 relatief | donker, spots dominant |

**Regel:**
- setGlassNight(glow, litFrac, shopFrac, officeFrac): litFrac = fractie ramen aan
- setLandmarkNight(glow), setLandmarkModelNight(glow)
- Geen pure zwarte schaduwen (`0x000000`): altijd subtiele ambient

### 2.4 Mist en atmosfeer

**Bron:** worldgrade.js, worldenvironment.js (sinds 21-11 postprocessing).

- **Nabij (<500 m):** geen mist
- **Middel (500–2000 m):** subtiele luchtperspectief, `0xc6d4dc` dag / `0x8a9aaa` avond
- **Ver (>2000 m):** duidelijke mist, horizonkleur mengt in
- **Geen dichte mist** in zomer: altijd helder, ver zicht

**Uitschieters:**
- Witte mist (`0xffffff`): te scherp; gebruik de luchtkleur hierboven
- Groene of gele nevel: onnatuurlijk

---

## 3. Materiaalregels

### 3.1 Vertexkleur vs textuur

**Bron:** pixelart3d.js, models3d_buildings.js.

| Type | Methode | Reden |
|---|---|---|
| **Gebouwen (muren, daken)** | Materiaal per kleur + textuur | Veel herhaling, caching per hex |
| **Details (kozijnen, deuren, daklijsten)** | Vertexkleur (vcMaterial, GeoBuilder) | Veel kleuren in één mesh, één drawcall |
| **Vegetatie (bomen, struiken)** | Vertexkleur | Gradaties per blad/tak |
| **Wegen, tegels** | Textuur + vertexkleur | Herhaling + variatie |
| **Props (lantaarns, banken)** | Vertexkleur | Klein, uniek per instantie |

**Regel:**
- habboMaterial(color): roughness 0,85, metalness 0, flatShading true, color door dsWereld()
- vcMaterial(): vertexColors true, zelfde PBR-waarden
- Geen glossy oppervlakken (`roughness < 0,5`) behalve glas, gelakt hout, water, gepolijst metaal

### 3.2 Ruwheid (roughness) en glans

| Materiaal | Roughness | Metalness | Toelichting |
|---|---|---|---|
| **Baksteen** | 0,85 | 0 | Mat, licht textuur (brickTexture) |
| **Pleister/stuc** | 0,85 | 0 | Mat |
| **Dakpannen** | 0,80 | 0 | Licht geglazuurd (tileTexture, shade 1,08) |
| **Bitumen (plat dak)** | 0,75 | 0 | Iets gladder |
| **Hout (onbehandeld)** | 0,85 | 0 | Mat |
| **Hout (gelakt)** | 0,35–0,50 | 0 | Glanzend |
| **Glas** | 0,15 | 0 | Spiegelend (glassMaterial) |
| **Metaal (geborsteld)** | 0,65 | 0,8 | Staal, aluminium |
| **Metaal (gelakt)** | 0,30 | 0 | Kleur dominant, niet spiegelend |
| **Water** | 0,10 | 0 | Spiegelend oppervlak |
| **Wegdek** | 0,90 | 0 | Zeer mat, asfalt |
| **Natuursteen** | 0,70 | 0 | Licht ruw |

**Uitschieters:**
- Alles glossy (`roughness < 0,4`): te plasticky, niet Gronings
- Metalness > 0 bij gekleurde oppervlakken (gelakt metaal is gewoon kleur + glans)

### 3.3 Polygonoffset voor details

**Bron:** models3d_buildings.js, detailMaterial.

```javascript
export const detailMaterial = vcMaterial({
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -2
});
```

**Regel:** Kozijnen, deuren, daklijsten liggen mm–cm voor de gevel; polygonOffset houdt ze voor het vlak ook op 100+ m (#382).

---

## 4. Vorm- en detailregels

### 4.1 Silhouet en herkenning

- **Herkenbare plekken eerst**: Martinitoren, Academiegebouw, A-kerken zijn landmarks (landmarkmodels.js, landmarks3d.js)
- **Silhouet voor detail**: grote vormen (gevel, dak, toren) zijn het belangrijkst; details (ramen, ornamenten) volgen
- **Geen kale primitieven**: een kubus is geen gebouw; voeg dak, ramen, deur, kleur toe

### 4.2 Afronding en bevels

- **Harde hoeken** zijn de standaard (flatShading, low-poly); geen chamfers tenzij architectonisch relevant (dakgoot, dakrand)
- **Dakranden** krijgen subtiele bevel (0,05–0,1 m) om de lijn tegen de lucht te breken
- **Geen overmatige rondingen**: dit is geen Pixar-stijl; hoeken blijven hoeken

### 4.3 Detailniveau per afstand

**Bron:** landmarks3d.js (landmarkLodObject), LOD-groepen in scene3d.

| Afstand | Detailniveau | Voorbeelden |
|---|---|---|
| **0–50 m** | Vol detail | Ramen individueel, deuren, kozijnen, dakpannen (textuur) |
| **50–200 m** | Middel | Ramen in groepen (paneUV), daken vlak, geen kleine details |
| **200–1000 m** | Laag | Vlakke gevels, daken, kleur draagt herkenning |
| **>1000 m** | Minimal | Silhouet, kleur, één of twee vlakken |

**Regel:**
- Landmarks (Martinitoren, kerken) krijgen LOD-groepen: `landmarkLodObject(near, mid, far, distances)`
- Gewone gebouwen hebben geen LOD: één geometrie, caching per footprint

### 4.4 Schaal: mens, deur, verdieping

**Bron:** models3d_buildings.js, worldframe.js.

| Maat | Waarde | Toelichting |
|---|---|---|
| **Eenheid** | 1 unit = 1 m | three.js world space |
| **Mens (staand)** | 1,78 m | gemiddelde volwassene |
| **Deur** | 2,05 m hoog, 0,9 m breed | Nederlandse standaard |
| **Verdieping** | `LEVEL_HEIGHT = 3,1 m` | vloer tot vloer |
| **Raam (woning)** | ~1,4 m hoog, ~1,0 m breed | typisch |
| **Toren (Martinitoren)** | `TOWER_HEIGHT = 95 m` | landmark |

**Uitschieters:**
- Deur van 3 m of mens van 2,5 m: schaal klopt niet
- Verdiepingen van 2,5 m: te laag voor Groningse panden

---

## 5. Personages, dieren, voertuigen, props

### 5.1 Quaternius-lijn als referentie

**Besluit eigenaar 23-11** (assets-centraal-echte-modellen.md, animatiesets-licentie.md):
- **Quaternius-mensen als basis**: Ultimate Animated Characters CC0, herkenbare low-poly-stijl
- **Centrale registers en kwaliteitsnormen**: propregister.js, dierenregister.js, voertuiglijst
- **Geen willekeur**: elk nieuw model door centraal register, controle op kwaliteit en stijl

### 5.2 Personages

**Bron:** docs/PERSONAGES-21-11.md, actor.js, actoranim.js.

- **Stijl**: Quaternius Ultimate Animated Characters (low-poly, duidelijke silhouetten, geen realisme)
- **Kleding**: Nederlandse zomerkleding, geen extreme mode (kleding.js, kledingsets)
- **Animaties**: CC0/CC-BY bruikbaar (animatiesets-licentie.md), geen Mixamo (ADR + constitution 4)
- **Gezichten**: eenvoudig, geen fotorealisme, herkenbaar als 'mens'
- **Schaal**: 1,78 m gemiddeld, handen ~0,18 m, hoofd ~0,22 m

**Kleurgebruik personages:**
- Huidtinten: natuurlijke variatie, geen neonkleuren
- Kleding: alledaags palet (jeans blauw `0x3a5a7a`, shirt wit/grijs/groen, zomerjas okergeel)
- Geen felle primaire kleuren (`S > 0,8`) tenzij functioneel (politie, veiligheidsvest)

### 5.3 Dieren

**Bron:** dierenregister.js, birds.js, cattle.js.

- **Stijl**: zelfde low-poly-lijn als personages (Quaternius Animals CC0)
- **Soorten**: vogels (duif, meeuw, kraai, eend), vee (koe, schaap, paard), hond, kat
- **Kleur**: natuurlijke dierenkleuren (koe zwart-wit, schaap wit/grijs, duif grijs-paars)
- **Animaties**: lopen, staan, pikken/grazen; simpel, geen overcomplexe cycles

**Dierenkleurenpalet (animalregister):**
- Koe: `0x1c1c1c` (zwart), `0xe8e6e0` (wit), vlekken
- Schaap: `0xe8e6e0` (wit), `0x6d6a62` (grijs)
- Duif: `0x6c6a5e` (grijs), `0x5a4a3a` (bruin), `0x2e4d2a` (nek groen-glans)
- Hond: bruin `0x6a4a30`, zwart `0x232323`, wit `0xe8e6e0`

### 5.4 Voertuigen

**Bron:** models3d_vehicles.js, voertuigen.js, propregister (fiets, brommer).

- **Stijl**: low-poly, herkenbare Nederlandse modellen (bakfiets, Stint, DAF, stadsbus)
- **Kleur**: realistische autokleur (rood `0xb93a32`, blauw `0x1d4f9c`, zilver `0x90b0d1`, zwart `0x23262a`)
- **Details**: wielen zwart, ramen donker glas, kentekenplaat geel (NL) `0xe8c93a`
- **Schaal**: auto ~4,5 m lang, bus ~12 m, fiets ~1,8 m

**Uitschieters:**
- Neon-roze auto (`0xff00ff`): té opvallend, niet realistisch
- Verkeerde kentekenplaat (blauw, wit): NL is geel

### 5.5 Props (kleine objecten)

**Bron:** propregister.js, wereldprops.js.

- **Stijl**: zelfde faceted low-poly, één of twee kleuren per object
- **Categorieën**: straatmeubilair (lantaarn, bank, prullenbak), borden, hekken, bloembakken, marktkramen
- **Kleur**: functionele kleuren (bank groen `0x2f4a3a`, lantaarn zwart `0x232323`, prullenbak grijs `0x5f6468`)
- **Textuur**: meestal geen; vertex colors volstaan

**Voorbeelden propregister:**
- Lantaarn: paal zwart `0x232323`, kap wit `0xe8e6e0`
- Bank: hout `0x6a4a30`, ijzer groen `0x2f4a3a`
- Prullenbak: grijs `0x5a7392`
- Verkeersbord: paal grijs, bord rood/blauw volgens RVV (geen echte tekst, pictogram)

---

## 6. UI blijft DS3

**Geen overlap met 3D-wereld.** UI-design volgt [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md):
- **UI-kleuren**: papier `#f3ead3`, inkt `#1d1b17`, bordgroen `#0e6b3c`, zomergeel `#f9c80e`, roze `#e8505b`
- **Typografie**: Barlow Condensed, Atkinson Hyperlegible (OFL, self-hosted)
- **HUD, menu's, kaart**: designsysteem-tokens (ds-tokens.css, ds-components.css)

**Kruispunten:**
- **Wereldmarkers** (worldmarker3d.js): ring op de grond, icoon, lichtkolom; gebruikt UI-kleuren voor herkenning
- **Minikaart en grote kaart** (mapstyle.js, kaartkleuren.js): INK-palet, door worldpalette.js
- **In-world tekst** (billboards, borden): gebruikt wereldkleuren, geen UI-groen

---

## 7. Verificatie en audit

### 7.1 Wat wordt gecontroleerd

Zie `scripts/artdirection_audit.mjs` (nieuw):

1. **Kleurgebruik in registers**: models3d_buildings.js, greenery.js, propregister.js, dierenregister.js, models3d_vehicles.js
2. **Uitschieters**:
   - Verzadiging buiten range per kleurgroep (neonkleuren: S>0,75 bij L>50)
   - Luma (helderheid) buiten spreiding per palet
   - Koud wit (te licht + blauwige tint, L>220 bij S<0,05)
3. **Materiaalregels**:
   - Roughness binnen norm
   - Metalness alleen waar het hoort
   - Glossy oppervlakken (`roughness < 0,4`) alleen bij glas, water, gelakt
4. **Schaal**:
   - LEVEL_HEIGHT = 3,1 m
   - Deurhoogte ~2,05 m
   - Personage ~1,78 m

### 7.2 Baseline en ratchet

**Test:** `scripts/artdirection_audit_test.mjs`
- Baseline: huidige telling uitschieters (mag alleen dalen)
- Nieuwe kleuren moeten binnen palet
- Ratchet: bij fix daalt de drempel, nooit omhoog

### 7.3 Visuele verificatie

**Beeldrun** (optioneel, scripts/lib/electronrunner.cjs):
- Stad dag (Vismarkt, x=100, y=76, tijd 13:00)
- Ommeland (Leek, x=-5300, y=-3200)
- Avond (centrum, tijd 18:30, warme zon)
- Interieur (winkel, Herestraat, nachtverlichting aan)

**Screenshots** `scripts/ui_shots.mjs --scenes=scripts/artdirection_scenes.js` (na implementatie audit).

---

## 8. Toekomstige uitbreidingen

- **Seizoensvariatie**: constitution staat alleen zomer toe; geen winter/herfst
- **Weersituatie**: regen, onweer (wel zomer, geen sneeuw)
- **Dynamische materialen**: natte straat, modder (zomer na regen)
- **Extra LOD-niveaus**: provincie ver (>5 km), nog verder vereenvoudigd

---

## Referenties

- [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) – UI-design (HUD, menu's, typografie)
- [.specs-fire/standards/wereld.md](../.specs-fire/standards/wereld.md) – Wereldspec (tegels, projectie, LOD)
- [AGENTS.md](../AGENTS.md) – Constitution (altijd zomer, low-poly, herkenbaar)
- worldpalette.js – Kleurafstemmings systeem (dsWereld, wereldMeng, rollen)
- pixelart3d.js – Gedeelde materialen (habboMaterial, vcMaterial, GeoBuilder)
- models3d_buildings.js – Gebouwprocedurals (PALETTE_FAMILIES, BRICKS, daken)
- greenery.js – Vegetatie (bomen, gras, struiken)
- propregister.js, dierenregister.js, models3d_vehicles.js – Objectenregisters
- ADR 0040 – Zomerse zeefdruk als designsysteem (21-11)
- docs/WERELDKLEUREN-21-11.md – Wereldpalet besluit en meting
- docs/PERSONAGES-21-11.md – Personagestijl
- docs/assets-centraal-echte-modellen.md – Centrale registers, kwaliteitsnormen (23-11)
- docs/animatiesets-licentie.md – CC0/CC-BY, geen Mixamo (23-11)

---

**Laatste update:** 23 november 2026, branch artdirection-23-11.
