# Cutscenes en binnenmissies in echte panden (22-11-2026, #1022, #1161, #1150)

> Wens van de eigenaar: "Interieurs in cutscenes zouden idealiter wel bestaan in de echte wereld, met ramen naar buiten, in plaats van als magische off-world
> interieurs." Tak `cutscene-interieurs-22-11` vanaf `origin/main` (`4b307a11c`), met `spawn-binnen-22-11` erbij (de andere twee branches, `interieurs-r6`
> en `cutscene-popin-22-11`, stonden al op main). Niets gepusht of gemerged. **Geen Electron en geen build gedraaid** (er draaide al een Electron-run): alles
> hieronder is bewezen met pure tests, de CPU-geometrie van de interieurs (`interior-frame`) en de echte wereldtegels uit de hoofdmap. Wat er in beeld uitziet
> is **nog niet bekeken** (zie "Nog te bekijken").
> Eerdere stukken: [INTERIEURS-21-11.md](INTERIEURS-21-11.md) (de epic), [INTERIEURS-STAND-22-11.md](INTERIEURS-STAND-22-11.md), [BINNENSETS-21-11.md](BINNENSETS-21-11.md)
> (de losse kamers), [SPAWN-BINNEN-22-11.md](SPAWN-BINNEN-22-11.md), [CUTSCENE-POPIN-22-11.md](CUTSCENE-POPIN-22-11.md).

## 1. Inventaris (`node scripts/cutscene_sets_audit.mjs`)

Een binnenset is een kamer die een cutscene (`set:` in `cutscript.js`) of een missiestap (`set:` en `toastSet:` in `missions_*.js`) om zijn figuren zet. Tot nu toe
stond zo'n kamer als een losse, gesloten doos (alleen de binnenkant wordt getekend) in de open lucht op de plek van de speler, of 40 tot 345 m boven de straat als daar
water of een gebouw staat: een kamer zonder uitzicht, zwevend, los van het gebouw dat je buiten ziet. De audit leest de catalogus (`cutpreview.js`), de bron van de
missies en de terugkeervignetten en vergelijkt ze met de tabel `REAL_SETS` (`game/js/realsets.js`). Stand 22-11: **9 sets, 14 cutscenes, 13 missiestappen, 24 terugkeervignetten.**

| Set | Scènes en stappen | Waar (wijk) | Soort ruimte | Tijdstip | Nu |
|---|---|---|---|---|---|
| `kantoor` | cutscenes M18.intro, M18.2, M18.6, M18.7, M18.outro; keuzestap "Intake bij Wiebelwerk" (`missions_akte4.js`) | het glazen kantoor aan het Julianapark, Veendam | kantoor of gemeentepand | dag | **echt pand** (vast: pand 20271552) |
| `serverkamer` | cutscene M18.3; holdstap "De serverkamer" | dezelfde plek, 11 m zuidelijk | kantoor of gemeentepand | nacht (00:00) | **echt pand** (hetzelfde pand; de stap heeft geen hold: blijft kit) |
| `loket` | M03.intro, M03.2, M03.outro; vier stappen (rij, formulier A, stempel C, inschrijven) | het Stadhuis, Grote Markt (stad) | gemeentepand met balie | dag | **echt pand** (vast: 26523) |
| `omakeuken` | F3, M25.intro, M25.3, M25.outro; bakstap (`missions_akte5.js`) | Oma Trijntjes keuken, Noorderhaven | woning | avond | **echt pand** (vast: 13255) |
| `kroeg` | de toast van M16 (`toastSet`, stap) | de kroeg waar de speler staat | horeca (kroeg, café) | avond | **echt pand**, nabijste |
| `woonkamer` | M27 inpakken, drie holdstappen (variant `inpakken`) | Willemiens huis, Hofstraat, Loppersum | woning | dag | **echt pand** (vast: 20175680) |
| `garage` | geen scène of stap gebruikt hem nu | een werkplaats | garage/werkplaats | dag | **echt pand**, nabijste |
| `keuken` | de opening (`story-opening-keuken`) en 19 terugkeervignetten | Tessa's keuken, flat in Paddepoel (nu 345 m boven de straat) | keuken van de flat | ochtend | **bewuste terugval** (kit) |
| `kruitkelder` | M20, drie holdstappen | het gewelf onder de vesting van Bourtange | kelder | nacht | **bewuste terugval** (binnenset) |

De terugkeervignetten in de `woonkamer` (5) zijn de flat van Tammo en Tessa en spelen met `realSet: false` altijd in de kit: nooit het huis van een vreemde.
Rijen zonder scène of stap staan klaar in de tabel voor later: `kapper`, `cafe`, `museum`, `rechtbank`, `ziekenhuis`, `kerk`, `schuur`, `cabaret`, `snackoverlast`
(status `geen-set`; de schuur en de zalen hebben nog geen interieur van het juiste soort, zie de tabel). De flat in Paddepoel zelf is al echt: een verdieping van de
echte toren (`home.js`, `flatplan.js`); de thuisavonden (`flatScene`) en de binnenspawn spelen daar al.

**Het tijdstip.** Een scène speelt op het uur van het spel: er wordt geen klok verzet. Het licht door de ramen van het echte pand is dus wat buiten staat (zon of
avondlicht); de kolom "Tijdstip" is het uur waarop het verhaal hem meestal speelt, ter controle in de hertest. Een eigen scèneklok bestaat niet (de verhaalklok
`world.clock` is een verhaaldaad, geen cameraknop).

## 2. Ontwerp: een scène gebruikt het echte pand bij zijn anker

```
cutscene / stap  ->  pickRealSet (realsets.js)  ->  holdInterior (interiors.js)  ->  de scène in de hal
 anker + punten      pand kiezen, plek in de hal      de hal NU bouwen en pinnen        env: acteurs en camera binnen de muren
```

1. **Pandkeuze (puur, deterministisch).** Kandidaten zijn de gebouwen binnen `r` m van het anker (`map.buildingsNear`). Eerst de vaste verhaalplek: staat het anker
   binnen 60 m van een `fixed`-plek en klopt de gid met het vastgelegde middelpunt (6 m), dan is dat pand de eerste kandidaat. Verder geldt: afstand tot het anker
   (afgerond op 10 cm), dan de laagste gid. Een bezienswaardigheid (`landmark`, een eigen interieur) of bijgebouw wordt overgeslagen; het soort moet bij de tabel passen
   (`kantoor` mag ook het gemeentepand), de hal moet minstens 70 % van de kamer van de set zijn (in een van beide standen) en de scène moet erin passen. De uitkomst
   hangt alleen van de wereld af, nooit van de speler of de host. Een pand zonder getekende gevel telt niet mee, behalve de vaste plek: die wacht (`pending`).
2. **De scène in de hal (`fitSceneInHall`).** De scène wordt gesampled (`sceneSamples`: elke halve seconde elke figuur en de camera, lokaal t.o.v. het anker). Het anker
   zoekt een plek op een raster van 0,5 m in de hal, in vier standen langs de assen van de hal, zodat elk punt van elke figuur: in de hal staat (0,35 m van de muur),
   25 cm vrij van meubels en tussenmuren, een zittende figuur binnen 0,9 m van een zitplek, en de camera (door de muren gedrukt) niet in een tussenmuur staat en de
   figuren en haar blikpunt niet door een tussenmuur ziet. De beste plek ligt het dichtst bij het midden van de hal. Past niets: terugval op de kit.
3. **Geen verplaatsing van gebouwen.** De hal is de hal van `interiorrules.js`/`interiorframe.js` (de voetafdruk, de deur en de ramen van het echte pand). Het anker
   (`x, y, facing, z = vloerhoogte`) komt in die hal; de figuren, de props en de camera lopen zoals altijd relatief aan het anker.
4. **Grenzen voor de regie (`hallEnv`).** De `env` van `cutscript.js`: figuren en props binnen de muren (0,35 m), de camera binnen de muren (0,45 m) en 0,3 m onder het
   plafond (`CEIL_MARGIN`); niets is "vast" (de hal is voor de scène leeggemaakt van eigen figuren). De scène bouwt dan geen kit meer (`buildScriptRun(..., noKit)`):
   de effecten van de kit (radio, deur, kopjes) bestaan niet, sfx en naamkaarten wel.
5. **De camera tilt niet over het dak.** `scene3d.js guardCinematicCamera` tilde elke filmcamera in een gebouwvoetafdruk over het dak. Een pose met `interior: true`
   (de cutscene-host zet hem voor een echte set, `hallCameraPose` ook) slaat dat over, zoals `follow`.
6. **Het pand wordt gebouwd en vastgehouden (`interiors.js holdInterior`).** De hal wordt nu gebouwd, waar de speler ook staat, vastgepind (de afstandsregel laat hem
   niet los) en zonder de eigen mensen van het pand (`sceneHeld`: de scène brengt haar eigen figuren). `releaseSceneInterior` bij het einde van de scène: de gewone
   regels (bouwen op 24 m, loslaten op 34 m) nemen het over.
7. **Terugval (nooit een vastloper).** Geen resolver (de test, de gast zonder spel), geen kaart, geen pand binnen de straal, geen pand waar de scène in past, het
   interieur is niet te bouwen, de schakelaar `world.noRealSets`, of een bewuste terugval (keuken, kruitkelder): de bestaande kit, met één logregel
   (`[echte set] loket: terugval op de bestaande set (...)`) en een regel in `window.__realSets` (de laatste 60 beslissingen, ook de gelukte met pand-id en afstand).

### Missiestappen (#1022 "Binnenmissies spelen echt binnen")

`stagesets.js buildStageSet` probeert eerst een echt pand voor de stappen met een hold (`realStage`): de figuren van de stap (de klerk, de rij, Oma, Mem, Willemien) en de
plek van de speler (`hold`) moeten in de hal passen. Dan hangt de figurengroep op de vloer van het pand, gedraaid met het anker, en wordt de speler daarheen gezet
(`shift`, zoals bij een verschoven kamer: de hold-stap meet het doel mee). De kamercamera is `hallCameraPose`: achter de speler, 1,75 m hoog, binnen de muren, harde
snee, lichte inzoom, geen pan, met `interior: true`. Bij het einde (`disposeStageSet`) staat de speler weer op zijn beginplek (of, lag die zelf in de hal, vlak buiten de
deur; `restorePlace`) en het pand gaat los. Een stap zonder hold (de wachtstap in de serverkamer) of een pand waar het niet past: de losse kamer zoals voorheen.
`stageSetBinnen` (`chainState().binnen`) en `binnenHerstel` werken ongewijzigd.

### Waar het hangt

- `game/js/realsets.js` (puur): tabel `REAL_SETS`, `pickRealSet`, `fitSceneInHall`, `sceneSamples`, `hallEnv`, `hallCameraPose`, `restorePlace`.
- `game/js/realsetrun.js`: `resolveRealSet(w, key, anchor, points, cams)` aan de wereld en het interieursysteem. `cutscenehost.js` kent het alleen via
  `assignRealSetResolver` (main.js geeft hem mee: anders een importcirkel `cutscenehost > realsetrun > interiors > shops > ... > cutscenehost`).
- `cutscenehost.js playScript`: vraagt een echt pand voor een scène met een set (`realSet: false` slaat het over: de terugkeerscènes), geeft de gast het
  oorspronkelijke anker mee, laat het pand los bij het einde.
- `stagesets.js`, `interiors.js` (`planForScene`, `holdInterior`, `releaseSceneInterior`), `scene3d.js` (`interior`).

## 3. Op de echte tegels (`node scripts/cutscene_sets_audit.mjs --world`)

Gemeten met de wereld uit de hoofdmap (`game/world`, stads- en provinciehoofdtegels), met dezelfde gevelbouwer en `planInterior` als het spel:

| Set | Plek | Gekozen pand | Hal (m) | Afstand tot het anker |
|---|---|---|---|---|
| kantoor, serverkamer | Wiebelwerk, Veendam | 20271552 (gemeentepand, glazen gevel) | 21,8 x 15,4 | 0,8 en 11,8 m |
| loket | Stadhuis, Grote Markt | 26523 (gemeentepand naast het Stadhuis; het Stadhuis zelf is een bezienswaardigheid zonder interieur) | 15,1 x 18 | 24 m |
| omakeuken | Noorderhaven | 13255 (woning; de nabijste woning, 13433, is 8,1 x 5,5 m en past M25.3 niet) | 16,6 x 6 | 21 m |
| woonkamer | Loppersum, Hofstraat | 20175680 (woning) | 16 x 5,8 | 26 m |
| garage (steekproef Paddepoel) | Paddepoel | 8770 (magazijn) | 10,4 x 13,3 | 68 m |
| kroeg (steekproef Grote Markt en Paddepoel) | | **geen**: binnen 150 m staat geen horecapand met een deur en een passende hal | | terugval |

Alle 13 cutscenes met een echte set vinden een plek in hun vaste pand (de audit meldt het per scène). De vaste plekken (gid, middelpunt) staan in `REAL_SETS.<set>.fixed`;
`--strict` met `--world` faalt als een vaste plek niet meer uit de wereld komt (bijvoorbeeld na een herbouw van de tegels met nieuwe gid's).
Het Wiebelwerk-pand is gemeentepand-soort: het krijgt de balie-hal van `publiek/gemeente` en geen kantoorindeling; de scène speelt daar aan een balie in een hal van 22 m.

## 4. Samen spelen

Is het van wie het spel opende, doet een gast mee, of doet iedereen het lokaal? **Iedereen lokaal, zoals de scène zelf.** Een cutscene en een binnenmissie spelen in het
eigen spel van elke speler; de wereld (en dus elk pand) is voor iedereen gelijk.

- **Deterministisch.** De pandkeuze hangt alleen af van de gebouwen rond het anker en van de tabel (vaste gid of de nabijste, laagste gid): bij host en gast dezelfde
  wereld, dezelfde keuze, hetzelfde pand-id (`window.__realSets` noteert gid en afstand). De gastheer stuurt in het scènepakket het **oorspronkelijke** anker mee (niet het
  anker in de hal), zodat de gast zelf dezelfde keuze maakt; het pakket wordt er niet groter van. Een gast waarvoor het niet lukt (pand niet gebouwd, geen kaart) valt terug op de
  kit en speelt de scène gewoon.
- **Je verstoort niemand.** Het pand houdt voor de duur van de scène geen eigen mensen (`sceneHeld`); de speler van de stap staat in zijn eigen hal (de gast ziet het niet,
  want de hal wordt lokaal gebouwd en de plek van de speler gaat alleen als gewone positie over het net: wie in een ander pand staat, staat daar). Een andere speler kan de
  scène niet verstoren en ziet niemand in andermans scène-interieur dan zijn eigen schermen (de hal is er voor wie hem bouwt).
- **Beloning en voortgang** blijven per speler (#429); er is geen beloning aan de binnenset. **Wegvallen en later aansluiten:** er is niets over het net te herstellen; een gast die
  later aansluit speelt de volgende scène met zijn eigen keuze. **Hostwissel:** geen effect (de scène is lokaal en het pand is geen hostbezit).
- Test: `scripts/realsets_test.mjs` (pandkeuze bij omgekeerde en geschudde lijsten, vaste plek, wachten op de gevel, het pakketanker), regel in `docs/COOP-GAST.md` (Echte-wereld-sets)
  en `scripts/coop_coverage.json` (systeem `interieurs`).

## 5. Tests

| Test | Wat |
|---|---|
| `scripts/cutscene_sets_audit_test.mjs` | elke binnenset heeft een tabelrij en een mapping of een bewuste terugval met reden; een nieuwe `set:` in een missie of cutscene zonder rij valt op |
| `scripts/realsets_test.mjs` (185) | tabel; pandkeuze (nabijste, determinisme bij elke volgorde, gelijke afstand, vaste plek, vaste plek met verkeerd middelpunt, wachten op de gevel, landmark, buiten de straal, onbekende set, kapper en keuken als terugval); de scène in de hal (vrij van meubels, zitplek, nergens); **camera- en acteurscontrole op 13 scènes** (de camera blijft in de hal en onder het plafond, niet in een tussenmuur, de zichtlijn gaat hoogstens 10 % van de tijd door een tussenmuur); de kamercamera van een stap; terugzetten van de speler; een Loket-stap in een echt pand met opruimen; het terugvalpad; broncontrole van de koppelingen |
| bestaand | `binnenset_test`, `binnensets_cine_test`, `cutscenewarm_test`, `spawnbinnen_test`, `terugkeer_test`, `cutscene_lint --strict` (0 blokkerend), alle `cutscene*_test`, alle `interior_*_test`, `import_cycles_test` (0), `naamtaal_check` (0), `undef_check` (0) |

## 6. Nog te bekijken (de agent heeft niets in beeld bekeken)

Hertest en screenshotjacht (nog niet opgenomen in `scripts/ui/hertest_scenes.js`: `hertest_test.mjs` houdt de lijst van 95 issues met het label `hertest` of
`wacht-beeld` vast; bij het label op #1022, #1161 en #1150 komen daar drie vragen bij):

1. **Loket (M03):** staan de klerk, de rij en de speler in een gemeentehal van 15 x 18 m zonder in een meubel of balie te staan? Zie je door de ramen het plein? Komt de speler
   na de stap buiten het gemeentepand uit?
2. **Wiebelwerk (M18):** de intake in een hal van 22 m is ruim; staat de accountmanager achter iets dat op een balie lijkt? Is de camera niet in beeld "boven" iets?
3. **Oma's keuken (M25) en Willemiens huis (M27):** een woning van 16 m breed en 6 m diep: staat Oma niet in de hal met haar rug naar een muur? Past de keuken-sfeer? Valt het op
   dat er geen kit (kopjes, fornuis) is?
4. **De overgang:** het pand wordt gebouwd bij het begin van de scène (een paar ms tot tientallen ms); is er een zichtbare hapering of pop-in? Bij een stap: komt de speler niet
   in een hal "gestopt" terwijl de wereld buiten nog loopt?
5. **Terug naar buiten:** staat de speler na een stap weer op zijn beginplek of buiten de deur? Komt hij niet vast te zitten in de deur of de gevel (de deur-uitsnede)?
6. **Camera:** geen dak, geen wand, geen gevel in beeld; de lichte inzoom van de kamercamera; `world.cameraOverride.interior` in de console tijdens een scène.
7. **Terugvallen:** `window.__realSets` na elke scène: hoeveel gelukt, hoeveel terugval, en waarom (verwacht: kroeg zonder pand in de buurt, de keuken en de kruitkelder bewust).
8. **Samen spelen (twee vensters):** host en gast spelen M18 en M03: staan ze in hetzelfde pand (`__realSets` bij beiden), en ziet de één de ander niet in zijn scène?

## 7. Wat niet is gedaan of bewezen

- **Geen beeld.** Of de scène in het pand er goed uitziet (figuren naast meubels, een balie op de verkeerde plek, een camera die langs een muur kijkt) is niet bekeken; de CPU-controle
  houdt alleen vast dat de camera en de figuren in de hal staan, vrij van meubels en tussenmuren, en dat de zichtlijn bijna nooit door een muur gaat.
- **De keuken en de flat.** De opening en de 19 keukenvignetten spelen nog in de keukenkit (345 m boven de straat), bewust: hun effecten (radio, deur, kopjes in de hand) en
  de zitplekken aan de tafel bestaan in de echte flat niet. De flat is al een echte plek (de thuisavonden, de binnenspawn); de keukenscènes er heen verplaatsen vraagt eigen
  zitplekken en kopjes in de flat en een besluit over de opening (die springt tussen plekken); dat is een vervolg met beeld.
- **De kruitkelder** (een kelder) is geen pand; het gewelf blijft een binnenset.
- **Het tijdstip** wordt niet gezet (zie 1); de gate van de klok bij de scène is geen deel van deze ronde.
- **De kroeg en de garage** hebben geen vaste plek; de keuze is de nabijste. Op de twee steekproefplekken (Grote Markt, Paddepoel) is er geen passende kroeg; in het spel valt de toast
  dan terug op de losse kamer. Een vaste kroeg voor M16 vraagt een besluit over waar de toast speelt.
- **Interieurs zonder deur.** Panden waarvan de gevelbouwer geen deur tekent (veel bezienswaardigheden) komen nooit in aanmerking. De wachtlogica voor de vaste plek bestaat (`pending`), maar
  de scène zelf wacht niet: bij `pending` speelt de kit. Een scène die op het laden van het pand moet wachten (de laadpoort van `cutscenewarm.js`) is niet gebouwd: de vaste panden
  liggen bij het anker en zijn bij de aankomst van de speler al getekend.
- **Prestatie.** Het bouwen van een hal bij het begin van een scène (10 tot 60 ms in node) en de pandkeuze voor sets zonder vaste plek (hoogstens 40 kandidaten, planmaken per pand
  een paar ms) zijn niet in het spel gemeten.
- Het `import()`-pad voor `realsetrun.js` in `main.js` is een nieuwe statische import; de bundelgrootte is niet gemeten.
