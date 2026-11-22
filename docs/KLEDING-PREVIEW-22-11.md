# Kledingvoorbeelden: het stuk zelf, niet Tammo (22-11, #1086, #1147)

Feedback van de eigenaar (pauzemenu, Spullen, categorie Alles): "Ik verwacht per kledingstuk een preview van dat kledingstuk, niet van Tammo."
De kaartjes van Stadjerspet, Stoppelbaardje, Jack, Spijkerbroek, Gympen en "Set: Stadjer classic" en het detailpaneel toonden allemaal het hele poppetje met zijn complete outfit, zodat je het stuk zelf niet zag.
Stand: gebouwd en getest zonder beeld in het echte spel (geen Electron, geen build). Eigen beeld: een software-render naar PNG, zie onderaan.

## 1. Hoe een stuk los wordt getoond

De bouwers in `models3d_people.js` maken een kledingstuk als onderdeel van één huidmesh (`buildPersonMesh`). `game/js/clothingpreview.js` hergebruikt die bouwers en splitst het stuk eruit:

1. Het poppetje wordt gebouwd met **alleen dit stuk** aan (`outfitToLook({ [slot]: stuk })`), een neutrale kleur voor al het andere en kaal haar, met de meetlagen van de bouwer (`personProbe.layers`; dezelfde lagen als de kleding-clippingaudit, [KLEDING-CLIPPING-22-11.md](KLEDING-CLIPPING-22-11.md)).
2. Per slot worden alleen de lagen overgenomen die bij het stuk horen (tabel `PLAN`). Alles van een personage (`head`, `neck`, `face`, `hair`, behalve bij baard en bril, zie hieronder) komt er nooit in; een test bewaakt dat.
3. Wat het stuk nodig heeft om te staan is een **neutrale, matte etalagevorm** in warm grijs (`MANNEQUIN`): geen gezicht, geen huid, geen haar, geen ander stuk.
4. De driehoeken worden een gewone `THREE.Mesh` met een gedeeld materiaal; er blijft geen skelet of personage over. De rustpose van de bouwer is de pose.

De meetbouw blijft uit de geometrie-cache van de wereld (`personGeometries`): hij staat in de cachesleutel (`'lagen'`) en wordt niet bewaard, dus 67 voorbeelden verdringen geen voetganger.

### Per slot

| Slot | Stukken | Lagen van het stuk | Etalagevorm | Kader |
|---|---|---|---|---|
| hoofddeksel (`hat`) | pet, platte pet, mutsje, krans, feestoren, kroontje, sluier | `hatshell`, `hattrim` | geen: los zwevend | hele stuk |
| bril (`glasses`) | leesbril, zonnebril | `glasses` | neutrale kop zonder gezicht | hele kop |
| gezicht (`face`) | stoppels, baard, snor, sik | `facial` | lichtere neutrale kop; haarkleur donker | close-up op het stuk |
| hals (`neck`) | sjaal, nekdoek, strandsjaal | `scarf` | buste (romp vanaf de borst, schoon afgeknipt) | hele buste |
| sieraad (`jewel`) | ketting, parels, kralen, hanger | losse mesh | buste | close-up op het stuk |
| shirt (`top`) | t-shirt, polo, overhemd, trui, hoodie, jurk, enz. | romp, mouwen, kraag, details (+ rok bij een jurk) | armen en handen in etalagegrijs | romp met armen |
| jas (`outer`) | jack, korte en lange jas, colbert, regenjas, enz. | idem; het hemd onder een open jas is etalagegrijs | idem | romp met armen |
| broek of rok (`bottom`) | spijkerbroek, chino, korte broek, rok, enz. | `torsoLow`, `leg`, `hem`; een rok zonder benen; blote onderbenen bij een korte broek vallen weg | geen: heupen en benen | hele stuk |
| schoenen (`shoes`) | gympen, instappers, laarzen, enz. | `shoe` (het paar) | geen | bijna in profiel |
| tas (`back`) | rugzak, schoudertas, boodschappentas, sporttas | `bag` | buste (de band loopt erover); rugzak van achteren | hele buste |
| pols (`wrist`) | horloge, polsbandje, armband | losse mesh | onderarm met hand (links) | close-up op het stuk |
| handen (`hands`) | fiets-, werk-, tuinhandschoenen | losse meshes | twee onderarmen, naar elkaar toe geschoven | beide handen |

Alle 67 stukken (63 winkelstukken en 4 rolstukken), elk in elke kleur (265 combinaties), hebben een eigen voorbeeld. De kleur en variant komen uit de data: "Jack (blauw)" is blauw, "Spijkerbroek (nachtblauw)" nachtblauw.

### Het kader

`framing()` kadert op de omhullende doos van het stuk: de breedte telt als de grootste afstand tot de draaias en de hoogte als de halve hoogte plus wat de camerahoek van boven erbij geeft. Een lang stuk (broek) vult zo het beeld in de hoogte in plaats van door een omhullende bol klein te worden. Kleine stukken op een vorm (baard, ketting, horloge) krijgen een close-up op het stuk zelf; de vorm loopt door aan de randen. De camera, het licht en de hoek zijn die van de gedeelde renderer (licht 3/4-aanzicht, hoek 0,6).

### Sets

Een set (`kind: 'pieceset'`) is een raster van de losse voorbeelden: 2 kolommen tot en met 4 stukken, daarboven 3; de laatste rij staat gecentreerd. Elk stuk past in een vakje van 1 bij 1 en draait om zijn eigen as (`turnPreview`), het raster blijft staan. De volgorde is die van de slots. "Set: Stadjer classic" toont dus pet, jack, spijkerbroek en gympen.

### Kapsels

`haarSpec` toont een kapsel op een neutrale kop zonder gezicht in de gekozen haarkleur (voor Tammo en Tessa, de lengte volgt het personage). De kapper gebruikt dit (zie onder).

## 2. Hoe de lijsten het gebruiken

| Plek | Wat het toont | Waarom |
|---|---|---|
| Spullen (raster en detail) | het stuk, de set als raster | de wens van de eigenaar |
| Kledingwinkel (winkelmenu) | het stuk, de set als raster | je beoordeelt wat je koopt, niet jezelf; passen kan in het pashokje |
| Kast | het stuk; complete sets als raster | idem |
| Kast: Outfits, Bewaar, Postuur | **het personage** met die samenstelling | een outfit is een samenstelling en een postuur is een lichaamsvorm: hoe de hele look staat is hier de vraag |
| Pashokje | **het personage**, ook voor winkelstukken en code | het hele doel van het pashokje is passen over je eigen outfit |
| Kapper | het kapsel op een neutrale kop, in de haarkleur | het kapsel is het stuk; de kleur zie je zonder gezicht |
| Tuning (velgen, spoilers, banden) | niet aangepast | de keuzetegels tonen al het onderdeel zelf (`tuningtiles.js`: het echte velgontwerp, de sticker, een bol voor de afwerking); het grote beeld toont bewust de hele auto (daar gaat Tuning over). De upgrades in Spullen (remschijven, banden, uitlaat) hadden al een eigen onderdeelmodel (`models3d_spullen.js`) |

De winkelmenu's krijgen `pieceOf` en `setOf` mee van `shops.js` (`clothingCtx`); `clothingpanel.js` kiest per item (`viewPiece`, `viewSet`). Een aanroeper zonder `pieceOf` valt terug op het personage. Het pashokje zet `fitting: true`.

## 3. Renderer, cache en bediening

- Één gedeelde WebGL-context (`vehiclepreview.js`, `renderSnapshot` voor het raster en `createSharedPreview` voor het detail); de winkel heeft zoals altijd zijn eigen kleine renderer. Er komt geen context bij.
- Raster: stilstaand plaatje, gerenderd bij eerste zichtbaarheid (`spullenthumbs.js`), gecachet per spec (dus per stuk en kleur) en bij sluiten teruggegeven (`releaseSnapshots`). Gelijke stukken delen één plaatje.
- Detail: live roterend, slepen of pijltjes draaien (`createSharedPreview`), onder het bestaande budget; "Minder beweging" zet de draai op nul. Buiten beeld pauzeert de lus.
- De tegel en het detail krijgen een zachte tint van de kleur van het stuk (`tintVoor`: donkere stukken een lichte tint, lichte een donkere, zodat het stuk altijd afsteekt). Een vlakke kleur, geen verloop (DS3: geen glas).
- Opruimen: elke geometrie van een voorbeeld is van het voorbeeld zelf en wordt bij `dispose` vrijgegeven; het materiaal is gedeeld.

## 4. Samen spelen

Een voorbeeld is lokale weergave van een lijst: van wie het spel opende of wie meedoet verandert niets. Er is geen netwerkwijziging, geen nieuw bericht en geen nieuwe opslag. Kast, winkel en Spullen blijven per speler (#429). Wie wegvalt of later aansluit merkt niets.

## 5. Tests

- `scripts/kledingvoorbeeld_test.mjs` (20 tests): elk stuk in elke kleur heeft driehoeken zonder NaN; de lagen zijn alleen die van het slot (nooit `head`, `neck`, `face`, `hair` bij een stuk, de kop alleen bij bril en baard); geen `SkinnedMesh` of bot in een voorbeeld; de vorm heeft alleen etalagekleuren (geen huid of haar); elk stuk ligt op de hoogte van zijn slot; korte broek zonder blote benen, rok zonder benen; het kader (vulling 0,4 tot 1,3, het stuk ligt in het beeld); sets met een vakje per stuk; elk kapsel voor beide personages; opruimen (de cache van de wereld is ongemoeid, een gewone persoon heeft nog steeds gedeelde geometrie zonder meetlagen); de pure helpers; en welke lijst welk voorbeeld kiest (winkel, kast, pashokje).
- `scripts/ui/spullen3d_dekking.mjs` telt nu 87 kledingdingen (67 stukken, 12 sets, 8 looks), alle met een model.
- Eigen beeld: `node scripts/ui/kledingvoorbeeld_blad.mjs` rendert met een kleine softwarerenderer (`scripts/lib/stuk_png.mjs`, orthografisch, eenvoudig licht) een contactblad zoals de tegel hem zou tonen. Zes bladen staan in `docs/beeld-22-11/spullen-kleding/` (blad 1: hoofd en gezicht, 2: sieraden, pols, handen en shirts, 3: shirts en jassen en broeken, 4: broeken, schoenen, tassen, 5: sets, 6: kapsels).

## 6. Wat het nog niet is en wat in het echte spel bekeken moet worden

**Agent heeft niets in het echte spel bekeken.** Alleen de software-render hierboven is gezien (zonder echt licht, zonder schaduw, zonder de DS3-tegel eromheen). Te bekijken in Electron:

1. Het raster van Spullen op het tabblad Kleding en Alles: zien de stukken eruit als stukken (geen poppetje meer), is het kader goed bij een lange broek, een korte baard en een horloge, en staat de tint er mooi bij (vooral donkere stukken en wit)?
2. Het detail: draait het stuk soepel, werken slepen en pijltjes, staat het stil bij "Minder beweging", en klopt het kader in het hogere detailpaneel (het kader gaat uit van een beeld hooguit 1,15 keer zo breed als hoog)?
3. De set "Stadjer classic" en de looks: is het raster leesbaar op de kleine tegel (vier mini-voorbeelden)?
4. De kledingwinkel en de kast: de grote preview toont het stuk; is dat een verbetering voor het kopen, of mist de eigenaar het "past dat bij mijn outfit" (dan een knop "Op mij" toevoegen)?
5. De kapper: kapsel en kleur op de neutrale kop (lange stijlen als `long` en `afro` in het kader).
6. Schoenen, hoofddeksels met veel losse delen (krans, feestoren, sluier) en handschoenen: lezen ze op een tegel als wat ze zijn?
7. Een rugzak (van achteren) en de schoudertas met band op de buste.

Bekende beperkingen: een broek is lang en smal in een liggende tegel (het kader is al op de hoogte afgestemd, maar het stuk blijft smal); de riem van een shirt dat in de broek zit is te zien als een donkere streep op de vorm; stoppels zijn bewust subtiel (zoals in het spel) en staan daarom op een lichtere kop.
