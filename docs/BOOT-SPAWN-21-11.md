# Boten alleen waar dat logisch is (21-11, #1083)

Aanleiding (eigenaar): "Spawn alleen boten waar dat logisch is, dus niet op een random sloot of watertje."
Eén regel voor alle bootspawns: `game/js/vehicle/bootplekken.js`. Meten doet `scripts/world/boot_spawn_audit.mjs`.

## Wat is "logisch"

Een boot staat of vaart op een plek als

1. er water is (`isInWater`) en het waterlichaam geen **sloot** of **vijver** is (alleen een kano, kajak of sup bij een steiger mag daar wel);
2. de **waterbreedte** rond het punt minstens de minimale breedte van de klasse is (het minimum over vier assen door het punt, gemeten tot de oevers, begrensd op 60 m);
3. voor klasse 1 tot 3 de diepte en de vaarklasse van het water bij de boot passen (`DRAFT`, `BOAT_CLASS`); een groot schip (klasse 4) laat dat aan de rand van het vaarnet (`edgeOpen`);
4. er een **context** is: of het punt ligt op het **vaarnet** (binnen halve breedte + 6 m van een vaargeul die de klasse mag varen), of **bij een kade-anker** (steiger, jachthaven, haven, helling, sluis, brugwachtplek, verhuursteiger, aanlegplek van een bijbaan; binnen 60 m), of het is **open water** van minstens 40 m breed (meer, haven, zee).

Zonder vaarnet (een build zonder `vaarnet.json`, een test zonder net) beoordeelt niemand de vaarweg; dan tellen alleen 1 tot 3.

### Minimale breedte per klasse

| Klasse | Breedte (m) | Opmerking |
| --- | --- | --- |
| kano, kajak, sup | 2 | alleen op sloot of vijver bij een steiger |
| dinghy | 3 | |
| sloep, rubberboot, skiff, waterfiets | 4 | |
| acht, rondvaart, skutsje | 9 | |
| binnenvaart | 24 | CEMT-klasse; alleen hoofdvaarwegen en havens |
| zeeschip, sleper | 24 | via het vaarnet (kust en haven) |

De tabel komt uit `vaarnet.MIN_WIDTH` (dezelfde breedte waaronder water niet in het vaarnet staat); `zeeschip` en `sleper` zijn erbij gezet.

## Afgemeerd

`isMooringSpotValid`: de plek is geldig water, een anker ligt binnen 30 m, de hartlijn ligt hoogstens 4,5 m van de oever (dus niet midden in het water), de boot ligt **evenwijdig** aan de oeverlijn (marge 0,55 rad), niet op een brug (brugopening) en niet op een andere boot (afstand minstens de bootlengte). Ligplaatsen in een jachthaven liggen met de neus naar de steiger (`vinger: true`): daar tellen water, breedte, anker en de onderlinge afstand (de breedte).

## Waar de regel zit

| Plek | Wat |
| --- | --- |
| `spawnBoatOnWater` (vehicle/boatwater.js) | elke kandidaat uit de kanaalpunten gaat door `isBoatSpotValid`: ambient AI, politieboot, zeeschepen, golven. `opts.plek === false` voor wie de plek zelf kiest (verhuur en eigen boot bij de steiger, de warmup) |
| `manageBoatPopulation` | via `spawnBoatOnWater`; de uitkijk (`spawnWouldPop`) houdt de spawn buiten beeld, dus geen pop-in |
| `countrylife.spawnBoat` | de decorboten op de maren (polderslootjes van 7 m) vervallen op elke plek die niet logisch is |
| `spawnJobBoat` (sidejobkit.js), `spawnStoryBoat` en `spawnMissionBoat` (missions.js) | `ensureBoatValid`: een bijbaan- of missieboot vervalt nooit, maar schuift naar de dichtstbijzijnde geldige plek binnen 120 m waar de romp vrij ligt |
| `bootPlekOpKaart` (bootplek.js, Reis nu met boot en de kaartsprong) | zoekt eerst alleen geldige plekken, daarna zoals voorheen alleen water (de sprong gaat voor) |
| `shops.initShops` | meldt de verhuursteigers als anker aan (`voegAnkersToe`) |
| `vaarload.loadVaarnet` | geeft het vaarnet, `waterplekken.json` en `marinas.json` aan `configureBoatSource` |

Het zoeken naar een andere plek is `findValidBoatSpot` (ringen van 6 m, eerst de vaargeul, maximaal 150 m, anders `null`: de boot vervalt). Resultaten worden per cel (3 m voor de breedte, 0,5 m voor de plek) en per kaart onthouden en gewist zodra de watertegels veranderen (`map._waterVer`).

## Samen spelen

De wereld van wie het spel opende bepaalt de spawns: de regel is deterministisch (geen willekeur, alleen kaart, vaarnet en ankers), dus dezelfde seed geeft dezelfde plekken (`boot_spawn_test`: "zelfde seed, zelfde plekken"). Gasten zien de boten via de snapshot; de gast rekent niets zelf uit.

## Audit voor en na (echte wereld)

`node scripts/world/boot_spawn_audit.mjs --seeds=3 --posities=40`; categorieën: marina (93 liggers in 8 jachthavens), verhuur (4 steigers), bijbaan (6 plekken: rondvaart, veerdienst, rondvaarttour, 2 zeeschepen, heistboot), ai (40 plekken x 3 seeds, 40 pogingen elk), sier (200 kandidaten op maarlijnen).

| Categorie | Plekken voor | Afwijkers voor | Plekken na | Afwijkers na |
| --- | --- | --- | --- | --- |
| marina | 93 | 0 | 93 | 0 |
| verhuur | 4 | 0 (2 zonder anker gemeten, zie noot) | 4 | 0 |
| bijbaan en missie | 6 | 0 | 6 | 0 |
| ai | 383 | 45 (2 sloot of vijver, 1 te smal, 42 niet op een vaarweg of kade) | 291 | 0 |
| sier (decor op maren) | 200 | 194 (5 sloot of vijver, 187 geen water in de kaart, 2 geen vaarweg) | 6 | 0 (194 vervallen) |

Noot: de verhuursteigers (Hoge der A, Noorderhaven) lagen 108 en 149 m van een bekend anker; de steiger is zelf een kade en wordt nu bij `initShops` aangemeld. De AI-afwijkers stonden onder andere bij Haren (3518,5444; 12 tot 18 m breed 'diep' water buiten het vaarnet) en op smal kanaalwater bij (31161,-9689).

## Tests

- `node scripts/bootplekken_test.mjs`: 43 eenheidschecks (breedte, vaarnet, kade, haven, sloot, vijver, afmeren, verplaatsen, cache en prestaties).
- `node scripts/boot_spawn_test.mjs`: de audit als regressie op de echte wereld (0 afwijkers, 20 seeds AI, determinisme, < 1 ms per keuze). SKIP zonder `game/world`.

## Niet gemeten of niet gedaan

- Race- en minigameboten (regatta, bruggenrace, skutsje) volgen een vaste route; die staan niet in de audit.
- De decorboot bij dorpsuitjes (`dorpsuitjes.js`) staat op een dorpsvijver of waterkant van het uitje zelf; niet gemeten.
- De missieboten van akte 2 (M11 rubberboot) en akte 4 (Veendam) zijn alleen via `ensureBoatValid` afgedekt, niet in de audit gemeten (de coördinaten staan als lengte en breedtegraad).
- Beeldcheck gevraagd: een jachthaven of verhuursteiger op het scherm (boten evenwijdig of neus naar de steiger), en een wandeling langs een polderkanaal zonder boten op de maren.
