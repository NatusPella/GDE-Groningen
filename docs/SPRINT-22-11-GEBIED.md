# Sprint 22-11: snelheid van de spellogica

> Tak `sprint-snelheid-logica-22-11` (vanaf origin/main 4b307a11c). Geen Electron, geen build, niets in beeld bekeken en niets op een GPU gemeten: alleen microbenchmarks in node met synthetische data (de `game/world` met de echte provincie stond niet in deze werkboom, dus de weg- en busdata zijn nagebootst).
> Aanpak: eerst meten, dan sneller maken zonder de uitkomst te veranderen. Elke test vergelijkt de nieuwe code met een referentie (de oude code of een onafhankelijke implementatie) en meet de winst.

## Voor en na

| Onderdeel | Wijziging | Voor | Na | Test |
|---|---|---|---|---|
| Bordkaart in de bus en haltezoeker (`busroutes.js` `nearestLine`, `linesNear`) | omhullend vak per lijn: een lijn die verder weg ligt dan de grens wordt niet punt voor punt afgezocht | 1,8 ms per beeld (30 lijnen van 900 tot 1500 punten) | 0,03 ms (x30 tot x60) | `snelheid_buslijn_test` |
| Bus-AI per tik (`busroutes.js` `project` met venster) | het venster begint met een binaire zoektocht op de boogafstand en stopt bij de eerste grens | 0,13 ms voor 20 bussen | 0,02 ms (x6) | idem |
| Minimap en kaart: sporen (`railway.js` `drawRailsOnMap`) | alleen de rasterbakjes onder het beeld, zichtbaarheid één keer in plaats van in beide lagen | 2,7 ms per tekenbeurt (2.500 sporen) | 0,03 ms (x80) | `snelheid_spoorkaart_test` |
| Wegroute over het provincienet (`roadgraph.js` `roadCostsFor`) | hervatbare Dijkstra: rekent tot de knopen die de vraag nodig heeft vaststaan, bewaart de stand in de cache en rekent door als een latere vraag meer nodig heeft. Heap in getypte arrays (geen `[d, v]`-paren) | hele net per route: 11 ms (67.600 knopen) | route over 750 m: 0,9 ms (x13); een route over de hele kaart blijft even duur | `snelheid_wegroute_test` |

De uitkomst is gelijk: de weg-test vergelijkt afstanden en padlengtes met een onafhankelijke Dijkstra (met eenrichtingswegen, deels, hervat en volledig), de bus- en spoortest vergelijken tegen de oude code op duizenden willekeurige vragen. De volgorde van de heap is niet gewijzigd, dus bij gelijke kosten kiest hij dezelfde voorganger.

## Gekeken en bewust niet aangeraakt

- Opslaan en laden: `stateSignature`, `lastWritten`, het terugleesvergelijk en het herstel zijn al op tekstgelijkheid gebouwd (#655); een tweede parse per autosave komt niet meer voor.
- Minimap: cadans (`minimapcadence`), `minimapView` (cache 0,4 s met marge), polygonen per kleur in één pad: al aanwezig.
- Stadsroute (`astar` in `routing.js`): stempels in plaats van wissen, eigen heap: al goed.
- Samen-snapshot (`kiesVoetgangers`): `Math.hypot` kost 50 ns tegen 14 ns voor `sqrt`, maar bij 300 voetgangers en 4 spelers is dat 60 microseconden per bericht: de winst is het risico op een andere afronding niet waard.
- NPC-lussen (`updatePedestrians`): sim-worker, ver-weg-AI en spreiding over frames bestaan al (#58, #653).

## Wat in beeld bekeken moet worden (nog niet bekeken)

1. Minimap met spoor: station Groningen en de lijn naar Haren, ook uitgezoomd (trein, heli): de sporen moeten er hetzelfde uitzien als voorheen, niets valt weg aan de rand van het beeld.
2. Een route van dorp naar dorp op de volledige kaart (GPS): komt hij aan, ook als je buiten de route rijdt en opnieuw plant; eenrichtingswegen en de laatste meters naar het doel kloppen.
3. Een route van de stad de provincie in en terug (poorten): de keuze van de poort verandert niet.
4. Een buschauffeur (G, dienst overnemen) en een bus buiten dienst: het bord met lijn en halte klopt, de halte-aankondiging komt op tijd.
5. Frametijd in de bus en bij een route: `window.__profile` (Electron-run, 3 afwisselende runs) moet lager of gelijk zijn.

Samen spelen: alles hier is lokaal per speler (routeberekening, minimap, bord in een bus op de eigen computer); geen snapshot, geen netwerkbericht, geen beloning of voortgang.
# Sprint 22-11: graphics, licht en kleur

Gebied: zonlicht, schaduw, hemel en wolken, mist en kleurvariatie van gras. Uitgangspunt: Wereldkleur-DS3 ([WERELDKLEUR-21-11.md](WERELDKLEUR-21-11.md)). Alles hieronder is zonder Electron gemaakt en getest (pure tests en shader-tekst); **niets is in beeld bekeken**.

## Wat veranderde

| Onderwerp | Voor | Na | Test |
|---|---|---|---|
| Dichte mist en de Martinitoren (#1202) | In dichte mist kromp `fog.far` naar 150 m; de skylinemist (vast 55% tot `fog.far`, 95% op 3x) zette een toren op 400 m op ca. 87%: een spookachtig silhouet | De grenzen zakken met de mist: 55% naar 40% en 95% naar 78% (`SKYLINE_FOG` in `weatherlook.js`, uniforms in de skylinematerialen van `scene3d.js`). Zonder mist ongewijzigd; de mist zelf (kleur, afstand, zichtbodem #866) blijft | `weatherlook_test.mjs` |
| Schaduwen bij lage zon | Vaste schaduwrand (radius 1,2 tot 1,5) de hele dag | `shadowSoftness(elev)` in `sunrules.js`: tot 35% bredere rand naarmate de zon zakt (gouden uur), 1 bij hoge zon; per beeld vermenigvuldigd op de basisstraal van het schaduwniveau, geen extra kosten | `sunrules_test.mjs` |
| Gras: kale effen vlakken (#1203, #1193) | Verre groenvlakken en streamtegels: één egale kleur per vlak | `grassVariation` in `farlod.js`: twee ruisschalen (ca. 40 m en 9 m) in de wereldruimte, helderheid en een tikje geel-groen, gemiddeld neutraal, tussen -18% en +18%; geldt voor `green` en `greenNear` | `farlod_test.mjs` |
| Wolken bij zonsopkomst en -ondergang | Altijd wit | Tint tot 45% richting de gloedkleur van `sunGlow`, minder onder een dicht wolkendek, niet 's middags | `cloudlook_test.mjs` |
| Bewaking van het daglichtprofiel | Geen test op de lichtkleuren over het etmaal | `daglicht_profiel_test.mjs`: warm gouden uur, zachte schaduwverhouding (zon tegen hemel 2,2 tot 3,9), mist en horizon overdag binnen 25% helderheid, geen sprongen, koel maanlicht | zelf |

## Wat in beeld bekeken moet worden

1. **Dichte mist in de Binnenstad** (weer Mist, Martinitoren op ca. 300 tot 450 m): de toren moet als herkenbaar silhouet met wat kleur blijven staan, niet bijna verdwijnen; controleer dat de gewone mistsfeer en de zichtbodem niet veranderden.
2. **Gouden uur** (zonshoogte 3 tot 14 graden): schaduwranden zacht zonder zichtbare banding in de schaduwkaart (Laag en Midden gebruiken radius 1,5, dus tot ca. 2,0; als de rand ruisig of gestreept oogt, de 0,35 in `shadowSoftness` verlagen). Wolken met een gouden randje.
3. **Verre weilanden en dorpsplein** (Usquert, Bourtange): de groenvlakken tonen vlekkerige variatie in schaal en tint; geen zichtbare naad op de grens met het gedetailleerde gras (de variatie is gemiddeld neutraal gehouden), geen flikkering.
4. Shadercompilatie op Windows en Mac: de grasvariatie voegt een varying `vGrassXZ` en een kleine functie toe aan twee grondmaterialen; geen GL-run gedaan.

## Wat bewust niet is gedaan

- Het bruine grondvlak met horizontale strepen in Usquert (#1193) is niet opgelost voor zover het schaduwbanding van de schaduwkaart is; daarvoor is een beeld nodig. De variatie is alleen voor gras.
- Waterkleur, bloom-instellingen en nachtlantaarns zijn gelezen maar niet gewijzigd: de lantaarnkleur (`0xffb66e`) is al warm, bloom en tonemapping volgen de Wereldkleur-tabel.

## Samen spelen

Alles is een lokale weergave: licht, mist, wolken en grasvariatie volgen de eigen klok en het eigen weer van elke speler. Niets wordt gesynchroniseerd; geen snapshot, beloning of voortgang. Een gast die later aansluit rekent hetzelfde uit.
# Sprint 22-11: graphics, materialen en detail

Branch `sprint-graphics-materialen-22-11`. Alleen lokaal beeld; bij Samen spelen bouwt en ziet elke speler zijn eigen wereld uit dezelfde data, er gaat niets over het net.

## Gedaan

| Onderdeel | Voor | Na | Test |
| --- | --- | --- | --- |
| Brug- en viaductonderkant (#1192, #919) | onderkant en plaat onder een verhoogde weg in hetzelfde `concrete`-materiaal als de zijkanten, zonder zon: een egaal donker vlak | eigen materiaal `soffit` (lichter beton, eigenlicht) voor de onderkant van het dek en de plaat onder een verhoogde weg (`game/js/roadstructures3d.js`) | `scripts/brugonderkant_test.mjs` |
| Anisotropie (textuurresolutie) | canvastexturen zonder opgave hadden anisotropie 1 (65 aanroepen van `canvasTex`); wegatlas 4 | standaard 4 in `canvastex.js` (`DEFAULT_ANISOTROPY`), wegmarkering 8 | `scripts/canvastex_aniso_test.mjs` |

## Bekeken met tellingen, niet gewijzigd

- `gfx_budget_test`, `roadstructure_dispose_test`, `borden_test`, `tegellezers_test` blijven groen; geen nieuwe draw calls (de onderkant is een extra part per brugweg, dezelfde mesh-opbouw als `tunnel`).
- Z-fight-audit (`scripts/zfight_audit.mjs`) op de echte kaart is gestart; zie het issuecomment voor de uitkomst als die op tijd klaar was.

## Niet gedaan (te groot of niet te toetsen zonder Electron)

- Windzwaai van boomkruinen (gras heeft het al in `grass.js`; bomen niet): vraagt een shaderpatch op de instance-materialen in `countryside.js`.
- Gevelvariatie, schoorstenen, putdeksels, voetpadslijtage en props-dichtheid: geen meting zonder wereldbouw.

## Nog niet bekeken in beeld

- Onderkant van een viaduct (Rijksweg) en een brug over water: leest het als beton in de schaduw, niet te licht of te vlak? Kijk bij overdag en 's nachts (eigenlicht blijft dan staan; als het 's nachts te licht oogt, dempen met de zonnestand).
- Wegmarkering op schuine hoek ver weg (zebrapad, fietssymbool): scherper en zonder flikker?
- Mogelijk verschil in framekosten door anisotropie 4 op alle canvastexturen: meten met de perf-sonde.
