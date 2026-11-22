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
# Sprint 22-11: mensen, voertuigen en dieren (graphics)

Gebied: kwaliteit en variatie van NPC-modellen, voertuigen en dieren; animaties zonder glitches; culling en LOD zonder zichtbare overgangen.
Werkwijze: geen Electron en geen build; alles is in Node gemeten en met de softwarerenderer (`scripts/lib/kleding_clip_png.mjs`) in een PNG bekeken.
Eigen branch `sprint-graphics-mensen-22-11`; het spel zelf is **nog niet in beeld bekeken**.

## Voor en na

| Onderdeel | Voor | Na | Bewijs |
| --- | --- | --- | --- |
| Kippen van Bezit (`herdview3d.js`) | een eend (`buildDuckMesh3D('hen')`) stond voor elke kip | een echte kip: `buildChickenMesh3D`, vier looks, hennen en hanen, kam, lellen, staart, poten met tenen; 340 tot 540 driehoeken | `scripts/dierenmodel_test.mjs` |
| Houding van het vee op je weide | alle dieren in dezelfde rust-pose, een rij standbeelden | `poseHerdAnimal`: vast per zaad rechtop, opzij kijkend, grazend of diep grazend (koe, schaap, kip) | idem, plus beeldblad |
| Schapen | een model voor elk schaap (witte wol, zwart gezicht) | `SHEEP_LOOKS`: vier soorten, het zaad kiest; weiland (`countryside.js`, een sjabloon en een sleutel per soort) en kudde | idem |
| Bestuurder in verkeer (`scene3d.js`) | aan en uit op een kale drempel van 70 m | `hystVisible` (zoals de gevels): geen geknipper bij een auto die rond 70 m rijdt | `scripts/lod_figuren_test.mjs` |
| Kleur van het verkeer (`trafficfleet.js`) | standaardpalet: 3 van 11 kleurig en donker | 7 van 16 kleurig, met een echt blauw, rood, champagne, grasgroen en zilverblauw; grijs blijft de meerderheid in beeld | `scripts/verkeerkleur_test.mjs` |

## Wat gemeten is en niet gevonden
- Alle wildlife-modellen (koe, schaap, eend, gans, reiger, zeehond, vis, duif, meeuw, kat, hond): eindige hoekpunten, driehoeken 62 tot 690. De geanimeerde poses (lopen, rennen, grazen, zitten, poetsen, aaien, snuffelen) van koe, schaap, kat en hond komen niet door de grond (laagste punt -0,035 m bij het grazen van een koe: de snuit in het gras, gewenst).
- Voetglijden van lopende NPC's: een eerste meetopzet (`animatePersonWalk`, voorwaartse kinematica) liet bij het begin van de stand een korte plateau zien (de voet staat 0,1 s stil ten opzichte van het lichaam), maar de stand-detectie was niet betrouwbaar genoeg om er een drempel op te zetten; de proefwijziging (driehoeksgolf voor de heupzwaai) is teruggedraaid. Open: een betere meting (heel- en teenpunt uit de gevilde mesh) en dan de heupzwaai.
- Geen kinderen in de menigte: bewust niet toegevoegd (18+, zie constitution 6 en de PvP-regels); een besluit voor de eigenaar.

## Samen spelen
- Het vee is per speler (#429, `herdsVisible`): een gast ziet het niet; de nieuwe kip, de poses en de schaapsoorten raken dus alleen de wereld van wie het spel opende en gaan niet over het net.
- Schapen en koeien in het weiland van de provincie (`countryside.js`) worden lokaal door elke speler uit het eigen zaad gebouwd; het zaad bepaalt de soort. Een gast kan dus een andere soort schaap op dezelfde plek zien als de host als zijn zaad afwijkt (dat gold al voor de plek zelf); er is niets om te synchroniseren.
- De bestuurdersfiguur en de verkeerskleur zijn beeld bij elke speler lokaal.

## Wat in beeld bekeken moet worden (nog niet bekeken in het spel)
1. Een eigen weide met kippen, schapen en koeien (Bezit): lijken de kippen op kippen vanaf 5 en vanaf 30 m, staan de poses natuurlijk (grazende dieren niet in de grond)?
2. Weilanden in de provincie: zijn de vier schaapsoorten zichtbaar zonder dat een kudde bont lijkt; geen haperingen bij het bouwen van een kudde (een sjabloon per soort, vier in plaats van een).
3. Verkeer rond 70 m: een stilstaande of schommelende auto met bestuurder: geen geknipper.
4. Een straat in het centrum: is de kleurmix aangenaam en niet te bont?
5. Beeldbladen opnieuw maken: `node scripts/dieren_blad_render.mjs <map> kip|koe|schaap|eend [n]` en `node scripts/npc_blad_render.mjs <map> [n] [rol] [voor|zij]`.

## Scripts
- `scripts/dierenmodel_test.mjs` (kip, schapen, poses, begroting), `scripts/lod_figuren_test.mjs`, `scripts/verkeerkleur_test.mjs`.
- `scripts/dierenmodel_audit.mjs` (bouw en grootte van alle dieren), `scripts/dierenpose_audit.mjs` (laagste en hoogste punt per pose; de eend zit op kanaalhoogte, de duif en de meeuw hangen met hun poten onder het lichaamsmiddelpunt: die getallen zijn hoogtes, geen fouten).
# Sprint 22-11: beleving en juice (passanten, claxon, motor)

> Naslag voor de coördinator. Spec: [.specs-fire/standards/mechanica.md](../.specs-fire/standards/mechanica.md). Gebied: beloningsmomenten,
> camerafeedback, geluid bij acties, passantenreacties en voertuigfeedback. Branch `sprint-beleving-juice-22-11`.

## Wat al stond (niet opnieuw gebouwd)

Geldteller met pop en tik (`hud_panel.js`), Rakelings-beloning, timescale-dip en snelheids-FOV (`gamefeel.js`), Schermschudden en
Beweging beperken (`a11ylogic.js`), voetstappen per ondergrond (`sfx/steps.js`), bandenrook, stof, regenspat en wrakrook (`fx3d.js`),
passanten die vluchten, filmen en uitwijken (`pedestrians.js`). Het laadscherm heeft bewust geen tips meer (tekstdieet 21-11).

## Voor en na

| Gebied | Voor | Na | Bestanden | Test |
|---|---|---|---|---|
| Passanten bij een wandelende speler | negeren je, alleen een zwaai naar boten | soms een zwaai of "Moi!", nooit bij rennen, rijden, wapen of wanted, geen koor | `pedgreet.js`, `pedestrians.js` | `pedgreet_test.mjs` |
| De claxon | alleen geluid | wie voor de auto loopt draait zich om en moppert, per persoon 8 s afkoeltijd | `pedhorn.js`, `pedestrians.js` | `pedhorn_test.mjs` |
| Rakelings voorbij gerend | stilte tot er contact is | een geschrokken "Hé, kijk uit!" (geen aanraking, geen wanted) | `pedgreet.js`, `pedestrians.js` | `pedgreet_test.mjs` |
| Beschadigde motor | alleen rook uit de kap | onder 40% gezondheid hoest de motor bij gas, vaker naarmate het erger wordt, met ondertitel | `enginesputter.js`, `player.js`, `audio.js`, `soundcaptions.js` | `enginesputter_test.mjs` |

## Samen spelen

Alles is lokaal per speler: passanten, claxonreacties en het motorgeluid horen bij het eigen spel van de bestuurder. Er is geen
voortgang of beloning aan gekoppeld. Een gast ziet de zwaai via de bestaande groetvlag in `coopextra.js` (alleen voor wat de host synchroniseert).

## Nog niet in beeld bekeken (geen Electron in deze run)

- De zwaaiende arm bij een groet op een wandelende speler (scene3d tekent hem uit `greetUntil`, gedrag is voor boten al bekeken).
- Het sprekende tekstballonnetje bij de claxonreactie en de 'angry'-pose: komt het overeen met wat de bumpreactie toont?
- De klank van `engine_sputter` (twee zaagtandstoten op de UI-bus, 0,1 en 0,08 gain): niet beluisterd, alleen de regels en de bedrading zijn getest.
- Of de dichtheid van groeten in een drukke straat gevoelsmatig goed is (nu hoogstens één per 7 s, kans 16% per scan).
# Sprint 22-11, gebied Beleving: een levende wereld

Doel: de wereld laat zichtbaar en hoorbaar merken dat het weer, de tijd van de dag en de plek ertoe doen. Alleen tekstbellen en weerlogica, geen nieuwe modellen, geen geluid. Zie ook [WERELD-LEVEN-21-11.md](WERELD-LEVEN-21-11.md) (evenementen en dieren) en `game/js/straatpraat.js` (gesprekken van voorbijgangers, #190).

## Voor en na

| Onderdeel | Voor | Na |
|---|---|---|
| Weer in de straatpraat | vier soorten: droog, regen, mist, onweer; een helder uur klonk als elk droog uur | vijfde soort `zon` (helder, 11 tot 19 uur): 18 nieuwe gesprekken over volle terrassen, zwemmen, picknick en warm zand, twee of meer per streek; een zon-moment hoort ook alle droog-gesprekken, andersom niet |
| Weerwisseling | voorbijgangers merkten niets als het ging regenen, onweren, mistig werd of opklaarde | `weatherreaction.js`: na 3 tot 8 seconden roepen een of twee wandelaars binnen gehoorafstand een korte regel; 75 seconden rust; niet bij het weer waarmee een spel laadt; een verouderde reactie vervalt |
| Nachtpraat | twee of drie gesprekken per streek | drie of meer per streek, zes in de stad (nachtbus, snackbar, sterren, vuurtoren, kanaal in het maanlicht) |

## Wat er is veranderd

- `game/js/gebabbel.js`: `WETS` krijgt `zon`; `wetOf(kind, hour)` geeft `zon` bij `helder` tussen 11 en 19 uur; `gebabbelFor` laat `zon` ook de `droog`-gesprekken horen.
- `game/js/straatpraat.js` en `game/js/regiolevenrt.js`: geven het uur door aan `wetOf`.
- `game/js/weatherreaction.js` (nieuw, puur plus een tik) en de aanroep in `regiolevenrt.js`, achter dezelfde poort als de straatpraat (`playerBusy`, geen snel voertuig).
- Tests: `scripts/gebabbel_test.mjs` (zon, nacht), `scripts/weatherreaction_test.mjs` (klassen, overgangen, regels zonder merken of leed, de tik met pauze, verouderde reacties, geen luisteraars, een lopend gesprek blijft ongemoeid).

## Samen spelen

Decor per speler. Het weer van een gast volgt de gastheer (coopweer.js); elke speler ziet de bellen van zijn eigen wereld. Geen voortgang, geen beloning, geen netwerkverkeer, niemand valt weg of sluit later aan met gevolgen. Dekking: de pure tests hierboven.

## Nog niet bekeken (hertest)

Niets is in beeld of in Electron bekeken, alleen met pure tests en bronnen gecontroleerd. In beeld te bekijken:

- Komt de bel van een wandelaar na een weerwisseling goed leesbaar boven het hoofd, en niet tegelijk met een straatpraatgesprek van dezelfde wandelaars (`canTalk` sluit dat uit, in beeld nog niet gezien)?
- Voelt 75 seconden rust goed, of is het te druk of te stil bij vlot wisselend weer (regionale weergrenzen kunnen ook een reactie geven)?
- De zon-gesprekken: kloppen ze met wat de speler ziet (terrassen vol, zwemmers uit de evenementenlaag)?
- Niet gedaan in deze sprint: schuilen onder een luifel, paraplus die pas opgaan bij regen, claxon en voorrang, per-plek geluid (de laagindeling van 21-11 staat in `game/js/sfx/lagenplan.js`).

## Verder

Voorstel voor een vervolg: plaatsgebonden gebabbel (Bourtange, station, haven, Vismarkt) op `map.meta.landmarks`, en schuilgedrag bij regen in `pedestrians.js` (nu alleen een paraplu bij de uiterlijke kenmerken, `models3d_people.js`).
# Sprint 22-11: flow en bediening (UX)

Gebied: de belangrijkste speler-flows van begin tot eind (nieuw spel, doorgaan, reizen, Samen aansluiten), met toetsenbord en controller gelijk.
Meting: `node scripts/flow_stappen_test.mjs` (pure scenario's met de echte UI-regels, zonder Electron en zonder netwerk).

## Stappen per flow (voor en na)

| Flow | Voor | Na | Opmerking |
| --- | --- | --- | --- |
| Nieuw spel, alleen | 2 bevestigingen (startkaart, moeilijkheid) | 2 | al kort; het budget staat nu in de test |
| Doorgaan | 1 bevestiging (de laatste keuze staat gekozen) | 1 | idem |
| Samen aansluiten, eerste keer | 3 schermen (keuze, naam met akkoord, sessie) | 3 | geen netwerk vóór het akkoord, in de test vastgelegd |
| Samen aansluiten, daarna | keuze + sessie, op de sessiekeuze eerst omlaag naar Meedoen | keuze + sessie, Meedoen staat al gekozen | nieuw: `samenRol` onthoudt de laatste rol |
| Reizen | Enter of 1 voor de aanbevolen keuze; de markering verplaatsen kon alleen met een controller | Tab (Shift terug) verplaatst de markering ook met het toetsenbord | toetsenbord en controller bereiken dezelfde drie keuzes |

## Wat er is veranderd
- Reiskeuze (`reisview.js` keyAction, `reispanel.js`): Tab en Shift+Tab verplaatsen de markering, Enter of spatie bevestigt, 1/2/3 kiezen meteen, Escape sluit met de standaardkeuze. Bewust geen pijlen of WASD: het paneel hangt in het spel en die toetsen sturen te voet en in een voertuig.
- Sessiekeuze Samen spelen (`launchchoice.js` rolVoorkeur en bewaarRol, `samenkeuze.js`, `settings.js` samenRol): onthoudt de laatste rol die lukte als voorselectie. Terug bewaart niets; een ongeldige waarde in het bestand wordt null; de keuze blijft per speler en lokaal.
- `scripts/flow_stappen_test.mjs`: budget per flow, de toetsen die de controller in een menu stuurt (PAD_MAPS.menu), een volgende actie en een terugweg op elke kaart, en foutstaten met een actie (herlaadknop bij een bootfout; een mislukte sessie zet je terug op de keuze met de fout erbij).

## Samen-regel
De reiskeuze is lokaal per speler. De voorselectie van de sessiekeuze is een lokale instelling (gde-settings, samenRol) en verandert niets aan wie host is of wie wat krijgt; er is geen netwerkbericht voor nodig.

## Gevonden en niet aangepast (conservatief)
- De eerste-start-meting "Beeld instellen..." duurt ca. 3,5 s en is over te slaan met spatie of Escape; er staat geen hint bij. Klein, niet aangepast.
- De benchmark- en bootkaarten hebben hun eigen terugweg en zijn dus in orde; coopoverlay.js is alleen een opmaakbouwer en heeft geen eigen Escape nodig.

## Nog in beeld te bekijken (niet gedaan: geen Electron)
- De reiskeuze in het spel: Tab verplaatst de gele markering, Enter bevestigt, Escape sluit; met een controller nog steeds omhoog/omlaag en A.
- De sessiekeuze Samen spelen na een eerdere Meedoen: de focus staat op Meedoen.
