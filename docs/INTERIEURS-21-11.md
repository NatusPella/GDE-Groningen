# Interieurs: echt naar binnen lopen in panden (epic #1150, 21-11)

Wens van de eigenaar: "Kunnen we ook meer panden een echt enterable interieur geven? Zoals in Watch Dogs 2?" Besluit en alternatieven: [ADR 0044](../.specs-fire/standards/adr/0044-interieurs-in-het-pand-zelf.md). Spec: [wereld.md](../.specs-fire/standards/wereld.md). Wat in beeld nog gecontroleerd moet worden: [INTERIEURS-VERIFICATIE-21-11.md](INTERIEURS-VERIFICATIE-21-11.md).

## Besluit (eigenaar)

Het interieur zit **in het pand zelf**, in de wereld, op die plek, achter de echte voordeur in de gevel. Je loopt te voet naar binnen: geen menu, geen laadscherm, geen teleport, geen fade. Een apart interieurgebied (optie B) valt af, ook als terugval voor grote panden: past een pand niet, dan is het niet betreedbaar. De binnenruimte komt overeen met de buitenkant (voetafdruk, verdiepingshoogte, deur en ramen op de juiste plek) en met de nepkamer achter het raam (`interiorglass.js`): wie door het raam kijkt ziet dezelfde kamer als hij betreedt, waar het kan.

## Wat er was

| Wat | Hoe | Gebruikt voor |
| --- | --- | --- |
| `interiorglass.js` | nepkamer in de ruit (ray/box in de shader), kamer uit een paneelsleutel; winkels uit de winkelkit | alle ramen |
| `museum3d.js`, `interieur3d.js`, `b.rooms`, `b.interior` | handgemaakte kamers per landmark, openknippen met `portalcut3d`, botsing in `collision.js` | vijf landmarks |
| `beppe_binnen.js`, `binnenset.js`, `stagesets.js` | een kamer op het erf of op de plek, vaste camera | Beppes huis, binnenmissies |
| `shops.js`, `shopui.js`, `horeca.js` | menu bij een marker buiten | winkels en cafés |

Wat dit werk hergebruikt: de gevel openknippen (`portalcut3d`), het botsingshaakje van `b.rooms`, de camera-doelen (`addCamTargetSource`), de winkelkit, `buildPersonMesh`, het activiteitenregister en het promptsysteem. Wat nieuw is: één generator voor alle panden.

## Architectuur

```
gevelbouwer (models3d_buildings.js)  ->  b.entrance { rand, plek, maat deur, ruiten, kamer van het raam }
        |                                      (en synthEntrance voor kerken, scholen, hallen zonder getekende deur)
interiorrules.js  planInterior(b)    ->  soort (kinds), hal (frame), hoogte, indeling (layout), deur
        |
interiors.js  (activiteit, per frame)  ->  bouwt bij <20 m, gooit weg bij >32 m, hooguit 2
        |-- interiorbuild3d.js        een geometrie, 3 materiaalgroepen + deurvleugel
        |-- portalcut3d.js            de gevel wordt bij de deur opengeknipt (alleen zolang het interieur leeft)
        |-- collision.js (b.walk)     open deur = doorloopbaar, hal + meubels vervangen de voetafdruk
        |-- addCamTargetSource        de camera botst op de muren en het plafond binnen
        |-- prompts.js / E-toets      kassa, bar, balie, kaars, pashokje, ...
```

- **Frame (`interiorframe.js`).** Per deur een eigen assenstelsel: u langs de gevel, v het gebouw in. De hal is de grootste rechthoek binnen de voetafdruk (marge 0,25 m aan de zijkanten, 0,3 m binnenmuur) die achter de deur begint, tot 26 x 18 m. Een deur in een hoek of een te kleine hal betekent niet betreedbaar.
- **Soorten (`interiorkinds.js`).** Negen: winkel (12 winkeltypen uit de winkelkit), horeca (café, kroeg, restaurant), kantoor, woning, kerk, station, bibliotheek, garage (werkplaats, magazijn), publiek (gemeente, politie, apotheek, ziekenhuis, school, hotel). Het type komt uit de gevel (winkeltype), dan uit de voorziening in het pand (`interiorspots.js`, FAC en shopplaces), dan uit het OSM-bouwtype.
- **Indeling (`interiorlayout.js`).** Per soort een recept dat items (boxen met een kant waar de voorkant naartoe kijkt), tussenmuren met een deuropening, mensen en gebruiksplekken plaatst, deterministisch uit het pandzaad. Elke indeling is gevalideerd: alles binnen de hal, niets in de deur, alles bereikbaar met 0,3 m ruimte (vloedvulling), anders wordt het meubilair uitgedund. 1080 willekeurige indelingen in de test, 0 uitgedund.
- **Tekenen (`interiorbuild3d.js`).** Eén geometrie per interieur: vloer (tegels, planken), plafond, wanden met deuropening en de ruiten van de gevel (inclusief dagkanten), lampen (groep 1, onbelicht), glas (groep 2) en 52 itemtypes uit 2 tot 10 boxen. Budget 9000 driehoeken en 3 groepen, 1,5 MB (test); zwaarste nu 8242 (bibliotheek), de rest 800 tot 3500.
- **Deur.** De deurvleugel zwaait om een scharnier (0,3 s), bij winkels klinkt de winkelbel. De deur gaat open voor wie in lijn met de deur binnen 3 m komt en naar binnen mag; wie binnen is kan altijd naar buiten. Voertuigen blijven buiten (alleen te voet).
- **Lopen (`interiorwalk.js`).** Puur, in het deurframe: buiten de gevellijn alleen vrij in lijn met de open deur; erbinnen de hal, tussenmuren en solide meubels (cirkel tegen boxen). `collision.js` vraagt een pand met een live interieur eerst `b.walk.resolve`, dus voetgangers, metgezel en NPC's gebruiken hetzelfde.
- **Camera.** De volgcamera raycast tegen de doelen; het interieur doet mee zolang de speler erbinnen is, dus de camera blijft onder het plafond en binnen de muren (geen `cameraOverride`: de speler behoudt alle besturing).
- **Licht.** Eigen lampen (emissieve panelen) en een emissief basismateriaal, geen echte lichten en geen schaduwen: geen schaduwbudget, wel zichtbaar in de nacht.
- **Opruimen.** `disposeObject` bij weggooien (gedeelde materialen blijven, personen geven hun geometrie terug); leakwatch ziet de tellers terugkeren. Het plan (pure data) staat in een `WeakMap` op het pand.

## Mensen en gebruik

NPC's (winkelier achter de balie, klanten, barman, gasten, receptionist, medewerkers, koster, reizigers, monteur) komen uit `interiornpc.js` met een deterministische look per rol en plek; `assignRoleOutfit` is het haakje voor de kledingset van epic Kleding. Ze staan op hun plek (idle, zittend of staand), alleen als het pand open is en de speler binnen 16 m is, hooguit zes. De mensen doen dingen, zie hieronder.

Interactie (E): kopen of bestellen (een winkel van het spel in het pand opent zijn eigen menu, anders een klein product uit `interiorbuy.js` met geld en gezondheid), passen (kledingwinkel: het menu van de winkel), balie (een regel van de medewerker), kaarsje, loket, boeken, rondkijken (woning). Alle tekst in `interiortexts.js`, alleen tekst, verzonnen namen.

Panden en bedrijven zijn **altijd open** (eigenaarsbesluit 21-11): winkels, cafés, kantoren, kerken, stations, bibliotheken, garages en publieke gebouwen hebben geen openingstijden en de deur opent op elk uur. Alleen de woningen van anderen zijn beperkt: ruim drie op de vier zitten op slot en zijn niet betreedbaar (een regel bij de deur, bijvoorbeeld "De deur zit op slot."), de rest staat open ("open huis", 22%, deterministisch uit het pandzaad), en een woning die de speler bezit of huurt staat altijd open (`assignInteriorHooks({ owned })`).

## Samen spelen

Is het van wie het spel opende, doet een gast mee, of doet iedereen het lokaal? **Iedereen lokaal.** De wereld (panden, deuren) is voor allen gelijk; het interieur wordt per client uit het pandzaad gebouwd (zelfde uitkomst), dus er is geen netwerkverkeer. Spelers in hetzelfde pand zien elkaar (posities synchroniseren al; ze botsen op dezelfde hal). De mensen in het interieur zijn lokaal decor op vaste plekken (niet gesynchroniseerd). Kopen, bestellen, geld en gezondheid zijn van de speler zelf (#429); niemand krijgt een recht bij, en een gast draait dit zonder host. Een gast die later aansluit bouwt het interieur zelf als hij in de buurt komt. Een voetganger die langs een open deur loopt kan naar binnen; dat is onschuldig. Test: de pure kern (`interior_core_test`, `interior_collision_test`); een testbankstap met twee spelers in één pand is nog niet gedaan.

## Politie

Binnen een pand zijn de muren de zichtlijnen: `world.insideBuilding` maakt dat `police.js anyUnitSees` alleen nog eenheden binnen 9 m telegt. Wie naar binnen vlucht verliest de politie dus sneller, tenzij ze vlakbij zijn (verstoppen). Dichte winkel, dichte deur: geen schuilplek.

## Bereikbaarheid (audit, `node scripts/interior_audit.mjs`)

370.144 panden in de provincie; gemeten met de echte gevelbouwer en `planInterior`: alle 1.945 panden met een winkel of voorziening, en een steekproef van 1 op 15 (24.547) voor de rest, opgeschaald per bouwtype.

| Soort | Geschat betreedbaar | Opmerking |
| --- | --- | --- |
| Alle panden | ca. 145.000 (39%) | de rest is te klein, te laag of geen gebouw |
| Woningen (house, detached, semi) | ca. 107.000 (house 62%, detached 71%, semi 58%) | 22% daarvan staat open (open huis), eigen woningen altijd |
| Appartementen | ca. 3.050 (92%) | |
| Winkels en horeca (met plek) | 899 winkels, 201 cafés | van 1.945 pand met plek; 566 daarvan te klein (kiosken, hokjes) |
| Bedrijfshallen | ca. 2.700 (57%) | magazijnindeling |
| Kerken | ca. 150 van 229 (67%) | deur gemaakt in de kopgevel (synth) |
| Scholen en publiek | ca. 165 van 185 | |
| Schuren, bouwplaatsen, woonboten, caravans, kassen | 0 | geen kamer: bewust niet betreedbaar |

Redenen dat een gemeten pand niet kan: hal te klein 13.581, te laag (minder dan 2,3 m onder het plafond) 992, geen betreedbaar soort 779, geen deur 72, geen indeling 0 (22 voor de reparatie van ronde 5; herhaal met `node scripts/interieur_dekking_audit.mjs`, dat hetzelfde per bouwtype toont). De grootste groep is `yes` (174.042 panden, 18%): OSM zonder soort, vaak schuurtjes en bijgebouwen.

### Dekkingsplan

1. **Fase 1 (nu in de code):** alle winkels en voorzieningen met een plek (2.183 winkelplekken, 9.653 voorzieningen waar het pand past), horeca, kantoor, kerk, station, bibliotheek, garage, publiek. Dit is wat aan elk pand met een soort hangt.
2. **Fase 2 (gestart in ronde 5: school, ziekenhuis, museum, bioscoop, kapel; 28 varianten hebben een recept, audit `fase2`):** per soort meer variatie (meer recepten per winkeltype, restaurants met een keuken en toiletten, kantoren met meer kamers) en de mensen laten rondlopen.
3. **Fase 3:** woningen via Bezit en Homebase (eigen interieur, beheer, verhuizen: epic verhaal) en de "open huizen"; een tweede verdieping met een trap waar het zin heeft.
4. **Fase 4:** dorpen en de Ommelanden (de gevelbouwer is dezelfde: elk pand met een deur is al meegeteld in de audit; de aanbodlijst voor dorpen is een kwestie van typevolgorde).

## Integraties

| Onderdeel | Stand |
| --- | --- |
| Bezit (eigen pand) | contract hieronder; de deur gaat altijd open voor een eigen pand (`owned`), de kassa wordt het beheer (`manage`). Wiring aan `bezit.js` (`ownsBuilding(bezit, b.osm)`) is aan de Bezit-lead |
| Kleding | pashokje met het menu van de kledingwinkel; mensen worden aangekleed uit de rolpools van epic Kleding (`opts.role`: winkelier, bakker, kok, zakenman, bouwvakker, toerist, student, feestganger, voetganger); `assignRoleOutfit` blijft het haakje voor een eigen outfit per rol; de kappersstoel (`kappen`) opent het kappermenu van de winkel in het pand |
| Homebase / verhuizen | `assignInteriorHooks({ homeStyle(b) })` geeft wand, vloer en bekleding van een woning waar je woont; `owned` laat de deur open; de woning als eigen thuis en het verhuizen zelf zijn van epic verhaal |
| Garage en tuning | een garage of werkplaats met een winkel van het spel erin (tuning, fietsenmaker, spuiterij) opent bij de balie zijn eigen menu; zonder die winkel een regel van de monteur |
| Politie | gebouwd: zichtlijnen, `world.insideBuilding` |
| Missies en verhaalbeats in een interieur | `interiorscene.js`: ankerpunten (`sceneAnchors`), camera's binnen de hal (`sceneCamera`), `pinInterior(b)` houdt het interieur in leven zolang de scène speelt, `onInteriorChange` meldt binnenkomen en vertrekken |
| Geluid | gebouwd: binnen dempt het buitengeluid (de bestaande binnen-occlusie), kamertoon per soort en variant (`sfx/binnenklank.js`, ronde 5), de muziek door de muren per soort, deurgeluid, winkelbel, kassa, bar |
| Kaartlaag "Betreedbaar" | gebouwd: laag `betreedbaar` in de volledige kaart (deurbadge, vanaf stadsniveau) (de badge is er alleen voor wat betreedbaar is; er zijn geen openingstijden en dus geen groen of rood bordje) |
| Beppe-huis | bewust niet gemigreerd, zie hieronder |

### Tweede verdieping en trap

Woningen, kantoren, hotels, gemeentehuizen, scholen en winkels met een etage (kleding, tweedehands, elektronica, souvenir, supermarkt) krijgen een tweede verdieping als het pand twee lagen of meer heeft, de hal 4,2 x 8,2 m of groter is en de verdiepingshoogte minstens 2,6 m (`interiorupper.js`). Eén rechte trap langs een zijmuur (helling 36 graden, treden van 19 cm), een vlak bordes achter, een gat in de vloer boven de trap met een leuning. Boven: slaapkamer en toilet, open kantoor, hotelkamer of meer winkelvloer, met eigen mensen. De trap is een helling die je loopt: `interiors.js` zet `map.surfaceAt` en `groundHeightAt` zo dat de trap en de tweede verdieping de grondhoogte van de speler zijn zolang zo'n interieur leeft (de gewone `followGround` van `player.js` doet de rest), en de botsing kiest de benedenste of bovenste indeling uit de hoogte. Geen teleport. `planInterior(b, { upper: false })` zet de verdieping uit. Beperking: werkt alleen in een wereld met hoogtemodel (`map.elev.has`); anders staat de speler beneden op de grond terwijl de trap omhoog loopt.

### Mensen die dingen doen (ronde 3)

Elke rol heeft een schema van 3 tot 6 activiteiten als data (`interioractivity.js`, `SCRIPTS`), een lichte toestandsmachine per persoon, deterministisch uit het pandzaad (dezelfde mensen doen op elke client dezelfde dingen in dezelfde volgorde; alleen de beeldklok verschilt). Een activiteit is een plek (een anker uit de indeling: voor een schap, een zitplek, de kassa of wachtrij, een machine, een kaars, een bord, een werkplek), een houding uit het bestaande personensysteem (`sit`, `crouch`, `vendor`, `phone`, `call` via `registerPoseSource`) en een duur. Ze lopen over het looprooster (nooit door meubels), staan op bij een zitplek en pakken een vrije plek (geen twee op één stoel).

| Rol | Wat ze doen |
| --- | --- |
| winkelier, barman | afrekenen en inpakken (`vendor`), wachten, schappen aanvullen (`crouch`, alleen wat ze achter de balie kunnen bereiken), bellen |
| klant | producten bekijken, iets pakken (`crouch`), rondkijken, naar de kassa en afrekenen (wachtrij), slenteren |
| gast | eten, praten (zittend), naar de bar, slenteren |
| serveerster | bestelling halen aan de bar, brengen naar een tafel, afruimen |
| medewerker | typen, overleggen (zittend), koffie halen, kopiëren |
| bezoeker (kerk) | zitten, knielen, een kaarsje, rondkijken; koster ruimt op |
| lezer, bibliothecaris | lezen, zoeken, boeken terugzetten, uitlenen |
| reiziger | wachten, vertrektijden bekijken, kaartje halen |
| monteur | sleutelen, gereedschap, onder de auto |
| bewoner | tv kijken, koken, lezen |

Het budget is acht actieve mensen per interieur (`MAX_ACTORS`), een persoon op een kleine toestandsmachine, één drawcall elk (de rompgeometrie wordt gedeeld); alleen binnen 24 m van de deur. Kleding uit de rolpools van epic Kleding (`opts.role`), `assignRoleOutfit` blijft het haakje. In de stresstest kosten de mensen van twee interieurs hooguit 2,4 ms per beeld (met inloop). De mensen zijn lokaal decor.

### Meer inrichting (ronde 3)

Elk interieur krijgt na zijn recept `decorate`: wandhangers per soort (verzonnen posters, schilderijen, klokken, prikborden, menukaarten), planten in de achterhoeken, een deurmat, een nieuwe koffiemachine en krantenrek, en een lampstemming per soort (hangende lampen met warm licht in horeca, woning, kerk en bibliotheek; panelen met koud wit in kantoor en garage) met variatie uit het zaad. Wandhangers passen alleen waar niets hoogs tegen de muur staat. Vijf nieuwe itemtypes (klok, schilderij, prikbord, koffiemachine, krantenrek); het budget voor een interieur is nu 12.000 driehoeken (zwaarste 8.316).

### Naar binnen kijken door de ramen (ronde 3)

De ruiten van de gevel worden net als de deur uit de gevel gesneden (`portalcut3d`, tot zeven ruiten per interieur, de grootste eerst) zolang het interieur gebouwd is: vanaf buiten kijk je door het glas in het echte interieur, met zijn indeling, kleur en mensen (de muur van het interieur heeft op die plekken openingen). Het interieur wordt gebouwd binnen 24 m en weggegooid voorbij 34 m, de mensen zijn zichtbaar tot 24 m; verder weg blijft de nepkamer van `interiorglass.js` zichtbaar. Het glas zelf is dan open (geen weerspiegeling). Beperking: tegen de rand van het bouwen springt het beeld van nepkamer naar echte kamer; nog niet in beeld bekeken.

### Kopen aan de balie, niet op straat (ronde 3)

Een winkel of café van het spel waarvan het pand een interieur met een balie heeft (`markerHasInterior`: het dichtstbijzijnde betreedbare pand binnen 9 m van de marker) verliest zijn marker op straat: `nearestShop` (shops.js) en `nearestHorecaSpot` (horeca.js) slaan hem over via een haakje, en E bij de balie binnen opent het winkelscherm (`openShopFromInterior`) of bestelt bij de bar. Panden zonder interieur (te klein, geen balie, niet geladen) houden de buitenkoop. De kaartmarker en de missiedoelen blijven op de marker (die staat bij de deur); afleverpunten van missies zijn niet aangepast. De winkel van het spel wordt aan zijn pand gekoppeld op afstand, niet op "binnen de voetafdruk" (de marker staat op het trottoir).

### Bezit-beheer in het pand: het contract met epic Bezit

Bezit hangt twee haken aan `assignInteriorHooks` (in `bezitlive.js`, zoals `bezithooks.js` dat voor de boerderij doet):
- `owned(b) -> boolean`: is dit pand van de speler (`ownsBuilding(bezit, b.osm)`); de deur opent dan altijd, ook een woning die anders op slot zit.
- `manage(b, plan) -> { label, sub, run(w) } | null`: het beheer van dit pand; bij de kassa, bar of balie staat dan "Beheer" in plaats van kopen en `run(w)` opent het beheerscherm van Bezit (omzet, personeel, klanten van dat pand). `plan.kind` en `plan.sub` zeggen wat voor zaak het is.
De mensen in een eigen zaak kunnen later via `assignRoleOutfit` een eigen outfit krijgen. Bezit weet niets van de binnenkant; de binnenkant weet alleen of er een beheerscherm is.

### Het Beppe-huis blijft zoals het is

Beppes huis (`beppe_binnen.js`) is geen pand uit de tegels: het staat op een plek die uit de weg en de grens wordt afgeleid, heeft geen `b.entrance`, een eigen kamer met een vaste camera en een verhaalstand met scènes. Migreren naar het interieursysteem zou betekenen dat de kamer, de camera en de scènes opnieuw gebouwd moeten worden zonder winst en met kans op regressie (de verhaalboog is getest met 2.553 en 998 controles). Gekozen: niet migreren; wel consistent: terwijl je in het Beppe-huis bent telt `w.insideExternal` mee voor de politiezichtlijnen en het binnengeluid, en een volgende scène kan `interiorscene.js` gebruiken voor echte panden.

### Samen spelen (regels)

- **Het interieur** is deterministisch uit de gebouwsleutel (`interiorSeed`: het zaad van het pand, geen RNG-toestand, geen volgorde): host, gast, een gast die later aansluit en de nieuwe host na een hostwissel bouwen dezelfde kamer. Test: `scripts/interior_coop_test.mjs`.
- **Spelers in dezelfde kamer** zien elkaar: posities synchroniseren al; ze botsen op dezelfde hal (`b.walk` is overal gelijk).
- **De mensen** zijn lokaal decor, op dezelfde plekken, met dezelfde look uit zaad en rol en met een deterministisch schema (de duur van een handeling komt uit dezelfde zaadgenerator; de plek in het schema kan door de beeldklok per speler een moment verschillen); ze worden niet door de host gesimuleerd en niet gesynchroniseerd (de wereld buiten is van de host, de binnenkant van iedereen zelf). Een bijkomend gevolg: twee spelers zien een klant op verschillende plekken lopen.
- **Kopen en beheer** zijn per speler (#429): geld en gezondheid van wie koopt, nooit een host-recht, niets over het netwerk. Een winkelmenu van het spel volgt de bestaande gastregel (`winkelMagVoorGast`).
- **Een speler binnen bij een hostwissel** merkt niets: het interieur hangt aan zijn eigen spel. **Een gast die later aansluit** terwijl een ander binnen is, bouwt het interieur zodra hij in de buurt komt.

### Ronde 4: meer soorten, drukte per uur, zicht door de ramen

- **Nieuwe panden.** `sportschool` (variant van publiek: een sporthal of fitnesscentrum uit de OSM-typen en de voorzieningen; balie met dagkaart, loopbanden, gewichtsrekken, banken, spiegelwand, matten, kluisjes, een waterpunt, sporters en een trainer) en `studentenkamer` (variant van woning: OSM `dormitory`; bed, bureau met stoel, keukentje, tafel, bank, fiets in de hal, studenten). Bestaande recepten kregen mensen die iets doen: de kapper (rol `kapper` achter de stoel en `knipklant` in de stoel, een wachtende klant op de bank), de bakker (rol `bakker` en een oven), de supermarkt (tot vijf klanten). De bibliotheek, het kantoor, het café en de stationshal hadden al hun eigen recept en schema (ronde 2 en 3).
- **Schema per dagdeel.** Een activiteit kan een `when` hebben (`dag` 6 tot 18, `avond` 18 tot 23, `nacht`): de bewoner kookt overdag en in de avond en kijkt in de avond en nacht tv, de student studeert overdag en gamet 's nachts, een gast eet niet 's nachts. `stage.phase` zet het spel uit de klok; zonder phase (tests) geldt elk schema. Nieuwe schema's: kapper, knipklant, bakker, student, sporter, trainer. Een nieuw ankertype `lift` (bank, rek, mat) voor gewichten.
- **Drukte per uur (`interiorcrowd.js`).** Per soort (en per `soort:sub`) een curve van het uur naar 0..1: de bakker piekt om 8 uur, de kroeg 's nachts, het kantoor overdag, de sportschool om 6 tot 9 en na het werk, een woning in de avond. Personeel is er altijd (businesses sluiten nooit); de rest is aanwezig als hun rang (hash van pandzaad en volgnummer) onder het niveau ligt, de eerste bezoeker zolang het niveau boven 0,15 is. Eens per spelhalfuur herberekend (geen herbouw: alleen `visible`).
- **Zicht door de ramen (`interiorsight.js`).** De gesneden ruiten (ronde 3) bleven; nieuw is dat een figuur die buiten niet door een raam of de deur te zien is (zichtlijn van het oog door de gevellijn) niet wordt getekend en niet wordt geanimeerd. Dat kost niets extra en spaart tekencalls: het budget in de test (`interior_crowd_test`) is 100.000 zichttoetsen onder 150 ms (per beeld hooguit acht) en nooit meer dan acht figuren per interieur.
- **Kleding.** Elke rol kiest een bestaande rolpool van epic Kleding via `opts.role` (`CLOTHING_ROLE` in `interiornpc.js`): sporter en trainer `sporter`, student `student`, bakker `bakker`, kapper `winkelier`, de rest zoals eerder. De test houdt de lijst met poolnamen vast; niets in epic Kleding is aangepast.
- **Kopen.** De sportschool verkoopt een dagkaart aan de balie (`interiorbuy.js`, geld en gezondheid van de speler zelf).
- **Geluid.** `assignInteriorSfx(fn)` in `interiors.js`: standaard een audio-event, straks `sfxEvent` van de geluidskaart; sleutels `shop_buy_coins`, `shop_scanner_beep` (supermarkt), `coffee_brew` (horeca) en `scissors_snip` (kapperstoel). `sfxEvent` zit nog niet in deze branch; de koppeling is dus één regel bij de merge.
- **Samen spelen.** Zie COOP-GAST.md (Interieurs ronde 4): lokaal per speler, de drukte volgt de gezamenlijke klok en het pandzaad.
- **Nog niet in beeld bekeken:** de nieuwe recepten (sportschool, studentenkamer, kapper en bakker met mensen), de drukte per uur, het weglaten van figuren achter de muur, geluid.

### Ronde 5: kamertoon en muziek binnen, nieuwe pandtypes, dekkingsaudit (#1164, #1165)

- **Kamertoon en muziek (#1164).** `sfx/binnenklank.js` is de ene bron: per ambience-id van `KINDS[kind].ambience` (winkel, horeca, kantoor, woning, kerk, station, bibliotheek, garage) de niveaus van de menigtelaag, de kamertoon (`ruimte_binnen`) en een machinebrom (de bestaande industrielaag), en een laagdoorlaat voor de muziek; varianten (school, ziekenhuis, museum, bioscoop, sportschool, hotel, kapel, magazijn) overschrijven dat. `interiors.js` zet `world.insideKind` en nieuw `world.insideSub`; `sfx/ambience.js` leest de toon (de vaste tabel in de laag-regels is weg) en `audio.js` zet de muziek-laagdoorlaat via `roomMusicHz` (900 Hz in een kerk, 3800 Hz in een woning, 20.000 Hz buiten). De deur- en kassageluiden bleven zoals ze waren (`assignInteriorSfx`, standaard een audio-event); een `onInteriorChange`-luisteraar bleek niet nodig, omdat de vlaggen elk beeld volgen en de lagen zelf kruisvloeien. Een nieuwe soort zonder toon valt op in `scripts/binnenklank_test.mjs`.
- **Kaartlaag Betreedbaar.** De laag bestond al (ronde 2) en toont de voorzieningen met een soort; nieuw: museum en bioscoop (`kindOfFacility`), labels per variant (`labelOf`: Museum, Bioscoop, Ziekenhuis, School, Kapel). Panden die geen voorziening zijn (kerken, scholen, woningen) staan niet op de kaart: dat vraagt een lijst uit de tegels (open).
- **Nieuwe pandtypes.** Eigen recepten voor `school` (balie, kluisjes, een klaslokaal met bureaus en een bord, leraar en leerlingen), `ziekenhuis` (balie, wachtkamer, afdeling met bedden en een arts), `museum` (kaartjesbalie, vitrines in rijen, schilderijen, een loper, suppoost en kijkende bezoekers), `bioscoop` (foyer met kassa en popcorn, zaal met een lichtgevend scherm en stoelen) en `kerk/kapel` (klein, één blok banken, kaarsen). Bouwtypes `museum`, `cinema`, `sports_hall` en `chapel` komen erbij. Rollen: arts, leraar, leerling, suppoost, museumbezoeker, filmbezoeker (uiterlijk, rolpool en eigen schema). Aan de balie een museumkaartje en een filmkaartje met popcorn (`interiorbuy.js`), elk loket zijn eigen regels (`interiortexts.js`). Een tussenwand met deuropening (`backRoom`) maakt de kamers alleen als de hal diep genoeg is en er geen trap staat. Geen nieuwe itemtypes: alles uit de bestaande 56. Zwaarste nieuwe interieur 4956 driehoeken (school), onder het budget van 12.000.
- **Dekkingsaudit (#1165).** `node scripts/interieur_dekking_audit.mjs` (met de wereld, ca. 80 tot 100 s voor de hele provincie) telt per bouwtype hoeveel panden betreedbaar zijn en waarom de rest niet (`small`, `low`, `nodoor`, `layout`, `type`), en rapporteert de fasen 1 tot 4 van het dekkingsplan; `--typen` toont zonder wereld wat elk OSM-bouwtype wordt en of elk recept slaagt; `--json` en `--out=<bestand>` voor verdere verwerking. Meting van 21-11 (1 op 15 gemeten, panden met een plek allemaal): 370.144 panden, ca. 146.200 betreedbaar (39,5%). Fase 1: ca. 5.460 winkels en voorzieningen (garage en magazijn 2.845, winkel 1.918, publiek 261, horeca 201, kerk 152, kantoor 78); van de 1.945 panden met een plek zijn er 1.379 betreedbaar en 566 niet (te klein). Fase 2: 28 van 28 varianten hebben een recept, 24 zijn in de data gezien. Fase 3: ca. 140.800 woningen betreedbaar, daarvan ca. 31.000 open huis en ca. 15.900 met een tweede verdieping. Fase 4: buiten de stad ca. 145.500 van 367.350 panden (39,6%), in de stad 695 van 2.643. De grootste restgroep blijft het type yes (82% niet: te klein) en de garageboxen (220 van 223 te klein). Test: `scripts/interieur_dekking_test.mjs`.
- **Een echte vondst.** De audit vond 22 panden (19 huizen) waar `generateLayout` geen indeling kon maken: bij een voordeur vlak bij de rand van de hal begon de wand van de slaapkamer in het deurgat naar de keuken. De doorgang houdt nu 1,6 m afstand (`homeRecipe`); 0 van 10.493 proefindelingen zonder indeling, regressietest in `interior_pandtypes_test.mjs`.
- **Samen spelen.** Zie COOP-GAST.md (Interieurs ronde 5): alles lokaal per speler uit het pandzaad.
- **Nog niet in beeld of gehoor bekeken:** de nieuwe recepten, het lichtgevende scherm, de muziekdemping en de kamertonen; zie de punten 37 tot 42 in de verificatielijst.

## Prestaties

Alles is lui: niets wordt gebouwd buiten 20 m, hooguit twee interieurs, een per scan van 0,3 s, geometrie en mensen worden bij vertrek vrijgegeven. Meting (node en headless mock, `scripts/interior_mock_render.mjs`): bouwen 1 tot 10 ms per interieur, 2 tot 4 draw calls in beeld, 760 tot 7300 driehoeken. In het spel nog niet gemeten (geen Electron): de frametijd met een interieur in beeld, de kosten van `findHall` op de eerste scan, en leakwatch na een uur wandelen door winkelstraten.

Stress (`scripts/interior_stress_test.mjs`, node): een wandeling van 5 m/s door een straat met tien betreedbare panden: 20 bouwen en 18 weggooien over twee passages, nooit meer dan twee tegelijk, geen bouwen-weggooien-bouwen aan de grens (hysterese 20 m / 32 m), alles vrijgegeven na de wandeling, de zwaarste scan (geometrie bouwen) 11 ms, wat leeft hooguit 580 KB. Een plan maken kost 2 tot 9 ms in rust (eenmalig per pand, hoogstens een per scan van 0,3 s, en nooit in dezelfde scan als een bouw). De planregel van `interiorplanner.js` is pure code en dezelfde als in het spel.

## Wat niet is gedaan

- Geen Electron-beeld; zie de verificatielijst. De portal-snede door de gevel, de raam-shader (integer-hash), de camera binnen, de trap in het echte spel en alle geluid zijn nooit in het echte spel gezien.
- Geen achterdeur, geen tweede trap, geen verdiepingen boven de tweede, geen liften.
- De mensen lopen niet naar boven en botsen niet met de speler; geen echte voorwerpen in hun handen (alleen houdingen).
- De SFX-sleutels van de geluidsronde (kassa, bar, deurbel, trap, enzovoort via `sfxEvent`) zijn nog niet gekoppeld: `sfxEvent` zit nog niet in deze branch; nu `w.audioEvents`.
- Het beheer van eigen panden is een contract: de Bezit-kant is nog niet gewired.
- Interieur en raam komen overeen in kleur, vloer en meubelsoort; de exacte plaats van het meubel in het raam en dat in de hal zijn niet gelijk.
- De kaartlaag toont alle winkels en voorzieningen (ze zijn altijd open); een pand dat te klein blijkt wordt pas van de kaart gehaald als je er in de buurt komt.
