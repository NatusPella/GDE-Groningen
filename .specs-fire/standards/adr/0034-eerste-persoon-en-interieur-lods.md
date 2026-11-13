# 0034 - Eerste persoon is een speelcamera, voertuiginterieurs krijgen drie LOD's

- **Status:** besloten
- **Datum:** 2026-11-13
- **Spec:** `.specs-fire/standards/system-architecture.md` (camera en voertuigen)
- **Gerelateerd:** #833, #51, #389, #442, #444, #804

## Context

Voertuiginterieurs bestonden al, maar op één detailniveau en alleen dichtbij: de
cabine van auto's, bestelbussen en vrachtwagens hing binnen 25 m in de wereld
(`cabin3d.js`) en de passagiersruimte van de bus binnen 18 m
(`businterieur3d.js`). Verder weg was een auto door de ruiten leeg, en het
gedetailleerde interieur van de eigen auto (`carinterior.js`) was alleen te zien
als de filmcamera-stand BINNENIN aan stond: een vaste blik vooruit, zonder
muisLOOK, en alleen in een voertuig. De eigenaar vroeg om interieurs op
verschillende LOD's, door de ramen zichtbaar, én om een eerste-persooncamera in
de hele game (te voet en in voertuigen). Tegelijk loopt #804: er mag geen
meetbare frametijd bij komen.

## Besluit

1. **Eerste persoon is een speelcamera, geen filmcamera.** C (in de browser G)
   zet hem aan en uit, met een schakelaar onder Camera & richten in het
   pauzemenu (`firstPersoon` in `gde-settings`, standaard uit). De camera staat
   op het hoofd van het eigen figuur (`playerMesh.userData.head`, met een
   terugval op de spelerpositie), het eigen lichaam en zijn schaduw zijn
   onzichtbaar, en de muis kijkt vrij rond (yaw en pitch). Te voet draait het
   lichaam mee met de kijkrichting; in een voertuig blijft de besturing zoals
   hij was en draait alleen het hoofd. De stand is per speler en lokaal.
2. **De bestaande filmcamera's blijven.** V fietst nog steeds door de
   filmcamera's, en de BINNENIN-stand blijft daarin bereikbaar; C hangt niet
   langer aan die stand.
3. **Drie afstandsniveaus per interieur.** Auto's en bussen krijgen LOD0
   (volledig, dichtbij), LOD1 (midden: stoelen, dashboard, achterbank, vloer en
   wanden) en LOD2 (ver: alleen vloer, zitblokken en een dashboardblok). De
   cabine geldt tot 14/38/64 m, de buspassagiersruimte tot 20/45/85 m; voorbij
   de laatste straal is het interieur weg. De reizigers in de bus alleen bij
   LOD0 en LOD1.
4. **Eén mesh per voertuig, geometrie wisselen.** Elk interieur is één
   samengevoegde, gedeelde geometrie per (soort, maat, niveau) in één mesh per
   voertuig; op een drempel wisselt alleen `mesh.geometry`. Bouwen gebeurt lazy
   met een budget per frame (cabines 3, bussen 2), zodat een straat met veel
   geparkeerde auto's geen hapering geeft.
5. **Het interieur van de eigen auto is samengevoegd.** In plaats van een eigen
   mesh en materiaal per onderdeel (tientallen draw calls) zijn de stilstaande
   delen één geometrie met vertexkleuren en één gedeeld materiaal; het draaiende
   stuur en de portierbekleding blijven losse, kleine meshes. Interieurs casten
   geen schaduw en hebben geen eigen licht of transparency-pass.

## Afgewezen

- **Eerste persoon als extra filmcamera-stand in de V-cyclus.** Dat was de
  BINNENIN-stand: geen vrije blik en geen echte speelstand. De eigenaar vroeg om
  kunnen spelen in eerste persoon, niet om nog een filmstand.
- **Eerste persoon als standaardcamera.** Derde persoon is de stand waar de
  beweging, de cameracollisie, de verhaalregie en de HUD op gebouwd zijn; de
  speler kiest zelf, per apparaat bewaard.
- **De bestaande stralen gewoon vergroten (25 m vol detail).** Dan worden alle
  auto's in een straat volledig gedetailleerd getekend: meer driehoeken en
  dezelfde draw calls, zonder dat je het verschil ziet.
- **Drie aparte meshes per voertuig (één per LOD).** Dat verdrievoudigt de draw
  calls; één mesh waarvan de geometrie wisselt is cheaper en even eenvoudig.
- **Het interieur per onderdeel als eigen mesh laten (huidige
  `carinterior.js`).** Dertig tot veertig draw calls en materialen voor één auto,
  precies de auto waar de speler in eerste persoon in zit.
- **Interieurdata over het net (Samen spelen).** Het interieur is beeld dat elke
  client zelf uit het voertuigmodel bouwt; het snapshot en de berichten blijven
  ongewijzigd en elke speler kiest zijn eigen camerastand.
- **Interieurs in de schaduwpass of met eigen licht.** De binnenkant is nooit
  een zichtbare schaduwgever en kost alleen tijd.

## Gevolgen

- Nieuwe module `game/js/firstperson.js` (pure meetkunde en stand), gebruikt
  door `scene3d.js` (camera en het verbergen van het eigen figuur) en
  `player.js` (lichaamsrichting); `cinematics.js` levert de C-toets af,
  `controls.js` en `pausemenu.js` noemen de nieuwe stand.
- `cabin3d.js` en `businterieur3d.js` krijgen een LOD-parameter, een pure
  niveau-functie en een bouwbudget; `carinterior.js` bouwt zijn binnenkant als
  samengevoegde geometrie.
- Instelling `firstPersoon` in `gde-settings`; de stand gaat niet mee in een
  savegame (het is een camera-instelling, geen voortgang).
- Tests: `scripts/firstperson_test.mjs`, uitgebreide `scripts/cabin_test.mjs`,
  nieuw `scripts/businterieur3d_test.mjs`, en een Electron-beeldronde
  (`scripts/qa/interieur_firstpersoon_shots.mjs`) met de LOD-drempels,
  driehoekaantallen en draw calls. De meting staat in het issue.
- Beperking: fietsen, boten, helikopters en vliegtuigen hebben geen ingerichte
  cabine (open of alleen een cockpit); eerste persoon werkt daar wel, maar je
  ziet geen dashboard. De trein houdt zijn eigen cabinecamera.
