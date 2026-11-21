# Interieurs: echt naar binnen lopen in panden (epic #1150, 21-11)

Wens van de eigenaar: "Kunnen we ook meer panden een echt enterable interieur geven? Zoals in Watch Dogs 2?" Besluit en alternatieven: [ADR 0042](../.specs-fire/standards/adr/0042-interieurs-in-het-pand-zelf.md). Spec: [wereld.md](../.specs-fire/standards/wereld.md). Wat in beeld nog gecontroleerd moet worden: [INTERIEURS-VERIFICATIE-21-11.md](INTERIEURS-VERIFICATIE-21-11.md).

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

NPC's (winkelier achter de balie, klanten, barman, gasten, receptionist, medewerkers, koster, reizigers, monteur) komen uit `interiornpc.js` met een deterministische look per rol en plek; `assignRoleOutfit` is het haakje voor de kledingset van epic Kleding. Ze staan op hun plek (idle, zittend of staand), alleen als het pand open is en de speler binnen 16 m is, hooguit zes. Ze lopen niet rond (open punt).

Interactie (E): kopen of bestellen (een winkel van het spel in het pand opent zijn eigen menu, anders een klein product uit `interiorbuy.js` met geld en gezondheid), passen (kledingwinkel: het menu van de winkel), balie (een regel van de medewerker), kaarsje, loket, boeken, rondkijken (woning). Alle tekst in `interiortexts.js`, alleen tekst, verzonnen namen.

Openingstijden per type (winkels sluiten 's nachts, kroegen na middernacht, kantoor kantoortijd, politie en hotel altijd): een dichte deur blijft dicht met een regel ("Gesloten. Open vanaf 8:00."). Een woning staat voor 22% open (deterministisch, "open huis") of altijd als de speler hem bezit of huurt (`assignInteriorHooks({ owned })`); de rest zit op slot met een grap.

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

Redenen dat een gemeten pand niet kan: hal te klein 13.581, te laag (minder dan 2,3 m onder het plafond) 992, geen betreedbaar soort 782, geen deur 72, geen indeling 24. De grootste groep is `yes` (174.042 panden, 18%): OSM zonder soort, vaak schuurtjes en bijgebouwen.

### Dekkingsplan

1. **Fase 1 (nu in de code):** alle winkels en voorzieningen met een plek (2.183 winkelplekken, 9.653 voorzieningen waar het pand past), horeca, kantoor, kerk, station, bibliotheek, garage, publiek. Dit is wat aan elk pand met een soort hangt.
2. **Fase 2:** per soort meer variatie (meer recepten per winkeltype, restaurants met een keuken en toiletten, kantoren met meer kamers) en de mensen laten rondlopen.
3. **Fase 3:** woningen via Bezit en Homebase (eigen interieur, beheer, verhuizen: epic verhaal) en de "open huizen"; een tweede verdieping met een trap waar het zin heeft.
4. **Fase 4:** dorpen en de Ommelanden (de gevelbouwer is dezelfde: elk pand met een deur is al meegeteld in de audit; de aanbodlijst voor dorpen is een kwestie van typevolgorde).

## Integraties

| Onderdeel | Stand |
| --- | --- |
| Bezit (eigen pand) | haakje `assignInteriorHooks({ owned })`; het beheer binnen (kassa, beheerder) is nog niet gebouwd |
| Kleding | pashokje met menu van de kledingwinkel; `assignRoleOutfit` voor outfits per rol |
| Homebase / verhuizen | `owned` laat de deur altijd open; de woning als eigen thuis is epic verhaal |
| Politie | gebouwd: zichtlijnen (zie boven) |
| Missies en verhaalbeats in een interieur | interface: `onInteriorChange({ type, plan, b })`, `insideInterior()` en `interiorSeed(b)`; een missie kan een pand vragen via `planInterior(b)` en erin spelen zonder eigen kamer. Nog geen missie gebouwd |
| Geluid | `onInteriorChange` + `KINDS[kind].ambience` (muziek en gedempt buiten); de koppeling aan geluid.js is nog niet gedaan |
| Kaartlaag "Betreedbaar" | nog niet gedaan; de data staat klaar (`planInterior` op de panden in de buurt) |

## Prestaties

Alles is lui: niets wordt gebouwd buiten 20 m, hooguit twee interieurs, een per scan van 0,3 s, geometrie en mensen worden bij vertrek vrijgegeven. Meting (node en headless mock, `scripts/interior_mock_render.mjs`): bouwen 1 tot 10 ms per interieur, 2 tot 4 draw calls in beeld, 760 tot 7300 driehoeken. In het spel nog niet gemeten (geen Electron): de frametijd met een interieur in beeld, de kosten van `findHall` op de eerste scan, en leakwatch na een uur wandelen door winkelstraten.

## Wat niet is gedaan

- Geen Electron-beeld; zie de verificatielijst. De portal-snede door de gevel, de raam-shader (integer-hash) en de camera binnen zijn nooit in het echte spel gezien.
- Geen tweede verdieping, geen trappen, geen achterdeur (de hal heeft één deur: de voordeur).
- NPC's lopen niet; geen eigen gesprekken behalve de balieregel.
- Geen geluid, geen kaartlaag, geen beheer van eigen panden.
- Interieur en raam komen overeen in kleur, vloer en meubelsoort; de exacte plaats van het meubel in het raam en dat in de hal zijn niet gelijk.
