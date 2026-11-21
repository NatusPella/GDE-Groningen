# Kaart en kijkrichting: wie ben jij op de kaart? (21-11, #1141)

Melding van de eigenaar: in sommige missies bestuur je iets anders dan Tammo of Tessa (een duif, een voertuig). Dan draait op de minimap het driehoekje (jij) soms niet mee, en de kaart ook niet. Hoe gaat de grote kaart daarmee om?

Alles hieronder is uit de code nagelopen (`main` na 21-11). Er is niets in beeld in het echte spel gezien (geen Electron in deze ronde): wat de speler ziet staat onderaan als **nog niet bekeken in het spel**.

## 1. Hoe het werkte

- De wereld heeft één lichaam van de speler (`hoofdspeler(world)`, `players.js`). Wie iets anders bestuurt, laat dat lichaam meelopen: `player.x/y/angle` volgen het voertuig (`player.js driveVehicle`), de duif (`pigeonmode.js` zet `pl.x/y/angle` op de duif), de heli-run (`helirun.js`) en de trein (`traindrive.js syncRider`). Plek was dus zelden het probleem.
- De **richting** was het probleem. De minimap draaide op `world.camYaw` (de camerahoek, door `scene3d.js` en `firstpersoncam.js` bijgehouden), met één uitzondering: bij `world.pigeonMode` op `player.angle`. De driehoek is `player.angle + draaiing`. Wijkt de camera af van het ding dat je bestuurt, dan staat de driehoek scheef of staat de kaart verkeerd:
  - **heli-run en heli:** `camYaw` is de hoek van de volgcamera (`helicam.js chaseStep`, een filmstand of de scènecamera), niet van de heli.
  - **trein:** `camYaw` is wagenhoek + muisblik; rondlopen in een wagon zet `player.angle` op de kijkrichting in de wagon en `camYaw` ergens anders.
  - **scènes, fotomodus en minigames met `cameraOverride`:** `camYaw` blijft hangen op de laatste waarde van het volgbeeld; de kaart draait mee met iets wat niet meer klopt.
  - **duif in de intro:** de duif zit nog bij Tammo; het lichaam staat nog niet op de duif.
- De grote kaart (`mapview.js`) is altijd noord boven en tekende je marker met `player.angle`; hij had dus dezelfde bron als de driehoek op de minimap.

## 2. Wat er nu geldt (`game/js/viewanchor.js`)

`getViewAnchor(world, { body, pigeon })` geeft `{ x, y, z, heading, upYaw, kind, camera }` en is puur (geen DOM, geen three). Voorrang: **duif > trein > voertuig > te voet**.

- `heading`: de kijk- of rijrichting van het bestuurde ding. De driehoek en de marker op de grote kaart wijzen hierheen.
- `upYaw`: wat op de minimap omhoog staat als de kaart meedraait (`mapUpRotation(anchor, northUp)`: 0 als noorden boven staat, anders `-90° - upYaw`). Dat is de camerahoek (te voet, auto, fiets, boot, paard), maar de eigen richting bij duif, heli, vliegtuig, trein en altijd bij een scènecamera (`world.cameraOverride`: scène, fotomodus, minigamecamera).
- `easeAnchor(state, anchor, dt)`: na een wissel van soort (instappen, uitstappen, duif aan of uit) draait de richting 0,4 s het korte eind om in plaats van te springen; verder ongewijzigd, nooit NaN.
- De bestaande instelling `minimapNorth` ('nooit', 'lucht', 'altijd', `roadaccess.js northUp`) blijft: de kijkanker kiest alleen de hoek, `northUp` kiest of de kaart draait.

## 3. Tabel: per besturingsmodus

Kolommen: (a) kaartdraaiing van de minimap, (b) driehoek, (c) grote kaart, (d) N-badge en windschijf, (e) kompasboog en afstanden, (f) Samen spelen. "Was" is de stand voor dit werk, "Nu" de stand erna.

| Modus | Bron plek en richting (nu) | (a) Minimap draait op | (b) Driehoek | (c) Grote kaart | (d) N-badge, wind | (e) Kompasboog, afstanden | Was fout |
|---|---|---|---|---|---|---|---|
| Te voet, zwemmen | lichaam: `x`, `y`, `angle` | camerahoek (`camYaw`) | `angle` + draaiing | marker `angle`, noord boven | volgen de draaiing | plek van het lichaam | klopte |
| Auto, bus, taxi, trekker (ook gast achter het stuur) | voertuig: `x`, `y`, `angle` | camerahoek (muisblik mee) | rijrichting | rijrichting | idem | idem | klopte, behalve bij een scènecamera |
| Motor, scooter, fiets, paard (`_mount`) | voertuig | camerahoek | rijrichting | idem | idem | idem | idem |
| Boot, kano, sup, zeilboot | voertuig; `travelModeOf` 'boot'; wind alleen bij zeilen | camerahoek | vaarrichting | idem | idem | idem | idem |
| Vliegtuig | voertuig | **eigen richting** (was: camerahoek) | vliegrichting | idem | idem | idem | volgcamera loopt achter bij bochten |
| Helikopter, heli-run | voertuig `isHeli` | **eigen richting** (was: `camYaw` van `chaseStep`, filmstand of scène) | heli-neus | idem | idem | idem | kaart draaide op de camera, driehoek scheef |
| Duif (`pigeonmode.js`) | duif `P` (lichaam volgt) | eigen richting (al zo) | vliegrichting | vliegrichting | idem | idem | alleen de duifintro: lichaam nog bij Tammo |
| Trein (machinist, kapen) | wagenhoek `trainCam.angle` | **eigen richting** | rijrichting (cabine achteraan: omgekeerd, zoals `facingOf`) | idem | idem | idem | `camYaw` = wagen + muisblik; driehoek scheef in de cabine |
| Rondlopen in een wagon (`trainWalk`) | lichaam | **eigen richting** | kijkrichting in de wagon | idem | idem | idem | draaide op de camera, driehoek op het lichaam |
| Meerijden per trein (`stationtravel.js`, `trainCam` zonder `trainDriving`) | `trainCam.angle` | eigen richting | rijrichting | idem | idem | idem | idem |
| OV-meerijden, taxirit | de bus of taxi is een voertuig | camerahoek | rijrichting | idem | idem | idem | klopte |
| Kar, kruiwagen, ski, skate | geen eigen voertuig: lichaam (`skatefiets.js` is een fiets) | camerahoek | lichaam | idem | idem | idem | klopte |
| Kartbaan, botsauto, reuzenrad, kermis | lichaam of voertuig; de minigame zet `p.x/p.angle` zelf | camerahoek, bij `cameraOverride` eigen richting | lichaam of voertuig | idem | idem | doelen zijn bij een minigame weg (`busy.js`) | scènecamera liet de kaart tollen |
| Scène, fotomodus, heli-camera (`cameraOverride`) | lichaam of voertuig | **eigen richting** (was: stilstaande `camYaw`) | idem | idem | idem | idem | kaart draaide met de laatste camerahoek |
| Gast (Samen spelen) | `lokaalLichaam`; in het stuur of op de stoel het voertuig van de host | camerahoek van de gast | richting van het voertuig of lichaam van de gast | idem | idem | idem | klopte |

Het lichaam en de entiteit zijn dus meestal al gelijk; de kijkanker maakt dat expliciet en leest de plek en de richting bij een voertuig van het voertuig zelf (dat blijft kloppen als een gast stuurt of het lichaam even achterloopt).

## 4. Medespelers (Samen spelen)

- De snapshot (`coopnet.js spelerRecord`) stuurt per speler `x`, `y`, `angle` van het voertuig als iemand erin zit (`posOf`), anders van het lichaam. `partnerhud.js partnerInfo` maakt daar `heading` van; de minimap (`partner`-icoon, `p.heading + mapRotation`) en de grote kaart (`angle: p.heading`) tekenen die. Dat klopt voor voertuigen en te voet.
- **Open:** de duif van de gastheer is voor gasten een eigen tekening (`getPigeonPosition`, #525); de marker van de gastheer gebruikt `angle` van zijn lichaam, dat `pigeonmode.js` op de duif zet. Dat klopt in vlucht; in de duifintro staat het lichaam nog bij Tammo. Geen wijziging nodig, wel nog niet in beeld bekeken.
- De bestuurde entiteit is per speler lokaal: elk apparaat leest zijn eigen `hoofdspeler` of `lokaalLichaam`; er gaat niets extra over het net.

## 5. Wat niet is gedaan en wat in beeld bekeken moet worden

- Icoon per soort (duif, auto, boot) in plaats van de neutrale pijl: `anchor.kind` staat klaar, maar de tekening is alleen een pijl gebleven (de taak liet "of een neutrale pijl" toe; een nieuw icoon moet in beeld beoordeeld worden en raakt het ontwerpsysteem).
- Waymarkers, de missiekaart (`missionmap.js`) en de reiskaart gebruiken `hoofdspeler` voor de plek, niet voor de richting; die zijn niet aangepast.
- **Nog niet bekeken in het spel:** duivenspot (aan- en uitstappen, intro), heli-missie (filmstanden met V), boot (zeilen met wind), trein (cabine, rondlopen in de wagon, meerijden), taxi, en een scène waarin de camera vastligt. Controleer bij elk: staat de driehoek rechtop op de meedraaiende kaart, en klopt de N-badge; en met "noorden boven" aan: wijst de driehoek de goede kant op.

## 6. Tests

- `scripts/viewanchor_test.mjs`: per modus de bron en de richting, de voorrang, de twee kaartstanden (draait mee, noorden boven), de wissel van soort zonder sprong en zonder NaN, en dat de minimap en de grote kaart de kijkanker gebruiken.
- `scripts/hud_test.mjs`: regressiecontrole op de aansluiting in `hud_panel.js` en `mapview.js`.
