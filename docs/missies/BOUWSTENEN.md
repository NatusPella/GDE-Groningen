# Bouwstenen voor de missie-agents

Gedeeld bestand: elke bouwsteen-agent voegt alleen zijn eigen sectie toe. Het plan staat in [AAA-UPGRADEPLAN.md](AAA-UPGRADEPLAN.md) (sectie 4, playbook; sectie 5, Golf 0). Missie-agents wijzigen alleen defs (data) en vragen een bouwsteen declaratief aan; ze raken `missions.js` niet aan.

## Regelkaart per missiestap en wachtfiguur (G0a, stap 1 en 3 van het playbook)

Code: `game/js/regelkaart.js` (nieuw), `game/js/wachtprops.js` (uitgebreid), drie kleine haken in `game/js/missions.js` (`enterStage`, `updateStages`, `meldRegelkaart`). Tests: `node scripts/regelkaart_test.mjs`, `node scripts/wachtprops_test.mjs`. Beeld (nog niet gedraaid): `scripts/qa/bouwsteen_regelkaart_beeld.mjs` en `scripts/qa/bouwsteen_wachtfiguur_beeld.mjs`.

### De regelkaart: `step.kaart`

```js
{ kind: 'goto', target: ..., label: 'Breng de eieren naar de bakker',
  kaart: {
    doel: 'Breng de eieren heel naar de bakker',      // eerste kaartje, 7 s
    druk: 'drie minuten',                              // optioneel: tijdsdruk, staat bij het doel
    afloop: 'alle eieren stuk: opnieuw proberen',      // optioneel: wat er misgaat, staat bij het doel
    regels: [                                          // hoogstens drie, elk een regelwidget-type
      { type: 'limiet', inv: { waarde: 0, limiet: 40, label: 'Snelheid' } },                       // volgt het doel
      { type: 'voorraad', inv: { heel: 60, totaal: 60, icoon: 'ei', label: 'Eieren' }, bij: 'eierstoot' }, // pas na die melding
      { type: 'teller', inv: { rest: 180, totaal: 180, label: 'Tijd' }, na: 30 },                  // vanaf 30 s in de stap
    ] } }
```

- **Types** zijn die van `regelwidget.js`: limiet, teller, voorraad, wijzer, timing, toets, stappen. De zin op het kaartje is het tekstalternatief van die vorm (`vorm(type, inv).alt`); een eigen `tekst` mag. Een regel met kapotte of NaN-invoer en zonder eigen tekst valt weg.
- **Progressive disclosure:** eerst het doelkaartje, daarna één regel tegelijk. Een regel is aan de beurt bij `na` (seconden sinds het begin van de stap) of bij een melding `bij` (`meldRegelkaart('sleutel')` uit `missions.js`); zonder beide volgt hij de vorige. Een regel wacht tot het vorige kaartje zijn `duur` (3 tot 20 s, standaard 8) heeft gehad. Daarna is de kaart stil; een regel waarvan de `bij` nooit komt, blijft stil.
- **Terugval:** een stap zonder `kaart`, of met een kaart zonder doel en zonder bruikbare regel, krijgt niets (`startKaart` geeft `null`) en loopt ongewijzigd. Een fout in de kaart zet hem stil en raakt de missie niet.
- **Pure API:** `kaartVan(stap)`, `startKaart(stap, id)`, `tikKaart(staat, dt)` (geeft de `showCard`-spec of `null`), `meldKaart(staat, sleutel)`; de dunne laag `toonRegelkaart(world, staat, dt)`.

### De wachtfiguur: `step.wacht` (bij `hold`)

```js
{ kind: 'hold', label: 'Wacht op het perron', time: 20, wacht: { figuur: true, prop: 'koffie', seed: 0.4 } }
```

- Zonder `wacht` verandert er niets (de kring en de spullen kiezen op de tekst zoals altijd). Met `wacht.figuur` staat er naast de kring een persoon die rondkijkt, op zijn horloge kijkt, wipt, koffie drinkt of een krant leest (`IDLE_CLIPS`; bewust niet roken). De clip volgt de plek: bank en plant vaker het horloge, koffie het kopje, krant het lezen, hengel rondkijken.
- `wacht.prop` kiest de spullen zelf uit `PROP_KINDS` (bank, kist, baal, ton, plant, en nieuw: koffie, krant, hengel); `wacht.seed` (0 tot 1) of anders het label bepaalt de variatie (kleren, plek om de kring, volgorde en duur van de clips). `wacht.figuur: false` zet hem uit.
- Wachten blijft gewoon wachten: de figuur is alleen beeld; klok, cirkel en slagen veranderen niet. Per beeld: geen allocaties (`idlePose` hergebruikt de pose, `figureClipAt` het tijdsvak).
- **Pure API:** `waitFigureFor(stap, seed)`, `waitSeed(stap)`, `figureClipAt(plan, t, uit)`, `idlePose(pose, clip, tl, dur)`; tekenen via `buildWaitDressing` en `tickWaitFigure(group, dt)`.

### Samen spelen

Het is van niemand en van iedereen: de kaart en de figuur zijn lokaal beeld bij de speler die de stap zelf draait (eigen staat, eigen tijdlijn, `showCard` in het eigen venster). Er gaat niets over het net en er wordt niets in de wereld, de beloning of de voortgang geschreven (per speler, zie #429), dus wegvallen of later aansluiten verandert niets aan de beloning. Een gast die de stap niet zelf draait ziet geen kaart; dekking: de pure tests (twee spelers delen geen staat, de invoer blijft ongewijzigd).

### Eerste gebruikers

Regelkaart: M17, M10, M14, M08 (snelle winst 6 van het plan) en M09 (de eierrit: limiet, voorraad, tijd). Wachtfiguur: de `hold`-stappen van M03, M13, M20, M26 en M29 (snelle winst 5), en de wachtstappen van BB-rij en BB-weg.

### Nog niet bekeken

Geen enkel beeld van de kaartjes of de figuur is in de app gezien; de armhoeken (horloge, koffie, lezen) zijn uit de bestaande poses afgeleid en niet beoordeeld. De runner-haken zijn niet door een gedreven missie getest, alleen door de bestaande missietests.

## Missie-stings (G0c, stap 7 van het playbook)

Eén korte, herkenbare set voor het verloop van een missie: `sfx/missiebank.js` (de klanken, procedureel, geen opname) en `sfx/stingen.js` (de regie en de API). Alles is één familie: dezelfde toonladder als de UI-taal (C-groot pentatonisch) en één motief, C-E-G-C, dat omhoog klinkt bij een begin of winst en omlaag in mineur bij mislukken. Elke sting duurt hooguit 2,5 s, heeft varianten per aanroep (zelfde toonladder, andere volgorde), een afkoeltijd per naam en een rangorde (een lagere sting klinkt niet door een hogere heen, nooit meer dan twee tegelijk). Niveau: de categorie `sting` van het mixplan (0,8, onder de 0,6 gain x niveau), met spraakdemping tot 60 procent; alles gaat over de sting-bus, dus onder de Effecten-schuif en de dempknop.

### De namen

| Naam | Klank | Duur | Wanneer |
| --- | --- | --- | --- |
| `'start'` | lage grondtoon, het motief omhoog, een hangende klok | 1,9 s | de missie begint (automatisch, zie hieronder) |
| `'stap'` | twee zachte noten omhoog | 0,8 s | een tussenstap is voltooid |
| `'bijna'` | drie korte pulsen op een spanningsinterval, geen sirene | 1,1 s | bijna mislukt: argwaan hoog, schade, de klok |
| `'mislukt'` | het motief omlaag in mineur, langzame uitklinker | 2,2 s | de missie is mislukt (automatisch) |
| `'geslaagd'` | het motief als snelle trap en een slotakkoord | 1,6 s | de missie is gelukt (automatisch) |
| `'geslaagd_groot'` | het motief, breed akkoord met lage grondtoon en sprankeling | 2,45 s | het slot van een akte of een finale |
| `'brons'`, `'zilver'`, `'goud'` | dezelfde klank in drie lengtes: twee noten, drie noten, het hele motief met akkoord | 1,0 / 1,4 / 2,2 s | een medaille (minigames automatisch) |
| `'scene_in'`, `'scene_uit'` | een aanzwellend, dan een uitdovend akkoord (licht) | 1,7 / 1,9 s | het begin en einde van een cutscene |

### API

```js
import { stingen } from './sfx/stingen.js';
stingen.speel('stap');            // true = gespeeld of bewust stil; false = de bank rendert nog (val terug op het oude geluid)
stingen.push(world, 'stap');      // dezelfde sting als gebeurtenis in world.audioEvents (soort 'missiesting'); audio.js speelt hem
```

`stingen.push(world, naam)` is de aanroep voor de runner en de scènes: een regel, zonder audio-import. Een onbekende naam of een volle rij speelt niets. De pure delen (`STING_NAAM`, `STING_REGEL`, `maakPoort`, `stingVanEvent`, `medailleSting`, `stingDuur`) zijn te testen zonder audio (`scripts/sfx_stingen_test.mjs`).

### Wat al vanzelf klinkt (zonder missions.js aan te raken)

- `'start'`: audio.js speelt hem bij de overgang van de missiefase naar `active` (in plaats van het oude vierstemmige akkoord, dat blijft als terugval).
- `'geslaagd'`: audio.js, op de melding met "geklaard!" (zelfde plek als de stem).
- `'mislukt'`: `sfx/ui.js`, op een melding met "mislukt" (met de bestaande rust na een dood of arrestatie).
- `'brons'`, `'zilver'`, `'goud'`: `recordChallengeResult` (achievements.js) geeft de medaille nu mee in de gebeurtenis; audio.js speelt de sting van de medaille voor elke minigame en uitdaging (voorheen klonk zilver als goud).

### De aanroepregels voor de runner-agent (niet in deze bouwsteen gedaan: missions.js is van een ander)

Eén regel per plek, op de wereld van de speler die de stap draait (`world` is de wereld die de runner al heeft):

```js
stingen.push(world, 'stap');            // bij een voltooide tussenstap (stage-overgang, checkpoint dat telt als stap)
stingen.push(world, 'bijna');           // bij bijna mislukken (argwaan boven de drempel, schade boven 80 procent); de afkoeltijd is 6 s
stingen.push(world, 'geslaagd_groot');  // in plaats van de automatische 'geslaagd' alleen bij het slot van een akte (de afkoeltijd van 3 s houdt de kleine weg als de grote net klonk)
stingen.push(world, 'scene_in');        // cutscenehost: bij het begin van een scene (en 'scene_uit' bij het einde)
```

Voeg nooit zelf een `'start'`, `'geslaagd'` of `'mislukt'` toe: die komen vanzelf, en een tweede binnen de afkoeltijd klinkt toch niet. Een sting klinkt niet in de pauze of bij `menuMuffle`.

### Samen spelen

Het is lokaal bij wie de gebeurtenis draait: iedere speler hoort de stings van zijn eigen missievoortgang (per speler, #429). Een gast die meedoet aan een stap met `iedereen: true` hoort `'stap'` bij zijn eigen voltooiing; de host hoort die van de host. Een sting gaat niet over het net (geen verkeer, nooit dubbel). Wie wegvalt hoort niets meer; wie later aansluit hoort niets van wat al voorbij is, want een sting hoort bij een gebeurtenis van dat moment. Medailles zijn per speler. Test: `scripts/sfx_stingen_test.mjs` draait de regie met een nagemaakte kit (afkoeltijd, rangorde, stemmen); een testbankstap is niet nodig omdat er geen netwerkgedrag bij zit.

### Ook in deze bouwsteen (SFX-GAPS)

- `winkel_kassa`: een aankoop in een winkel klinkt als een kassa (shops.js zet `world.kassaKlik` in `pay`, `sfx/ui.js` speelt hem in plaats van `ui_uitgave`).
- `tram_bel` en `bus_bel`: een bel bij het wegrijden van een tram of bus waarvan de deuren open waren (linkup `ov-vertrek`).

### Eerste gebruikers

M19 (stoomfluit en aankomst: `'geslaagd_groot'`, de stap-sting bij elke halte), M29 (`'scene_in'` en een rustige `'geslaagd'`), M26 (`'stap'` bij elke ronde, `'goud'` bij de uitslag), M05 en alle races (`'bijna'` bij een lage tijd), en elke missie met `iedereen: true`. De luistergalerij is `node scripts/qa/bouwsteen_stings_beeld.mjs` (Electron, speelt ze af en meet het niveau; nog niet gedraaid).

### Nog niet bekeken

Niets is gehoord: de klanken zijn gerekend en getest (deterministisch, geen NaN, onder de piek, korte duur, toonladder, stemmen), niet beluisterd. Of de sting bij `'start'` een stem op het zelfde moment (`missie_gestart`) verstaanbaar laat is niet gemeten. Het rolgeluid per ondergrond is niet gebouwd (zie SFX-GAPS). De radio gaat niet zachter van deze stings (alleen de omgeving, via `duckAmb`).

## Publiek, racesjablonen en binnensets (G0b, stap 2, 5 en 6 van het playbook)

Code: `game/js/crowdplan.js` (puur) en `crowd.js` (tekenen), `cinetemplates.js` (puur), `roomspec.js` (puur) en `rooms3d.js` (tekenen), uitbreidingen in `racedecor.js`, `missiedecor.js`, `stagesets.js`, `cutscenehost.js` en `cutscript.js` (validatie van `def.crowd`). Tests: `node scripts/crowd_test.mjs`, `node scripts/cinetemplates_test.mjs`, `node scripts/binnensets_cine_test.mjs` (plus de bestaande `stagesets_test`, `missiedecor_test`, `racedecor_test`, `cutscript_test`, `coopcut_test`). Beeld (nog niet gedraaid): `scripts/qa/bouwsteen_publiek_beeld.mjs`.

### Publiek

```js
// puur: de plaatsing (spec in wereldmaten, ground = crowdGround(map))
crowdPlan({ shape: 'line', pts: [[x, y], ...], count: 36, seed, side: 8.5, spread: 3, sides: 'both', clear: [{ x, y, r }] }, ground)
crowdPlan({ shape: 'ring', x, y, radius: 9, depth: 4, count: 40, seed, gapA: Math.PI, gapW: 0.9 }, ground)  // gapA: de opening voor de actie
// tekenen
const c = buildCrowd(world, spec, { key: 'M26.plein' });   // null bij een gedeelde sleutel of zonder plek
updateCrowd(c, dt, { x, y } /* wie voorbijkomt */, camera); disposeCrowd(c);
```

- 8 tot 60 figuren (een gewoon publiek 20 tot 60; een klein, zoals de 12 van de stuntarena, mag), uit een pool van acht looks van de gewone personenmodellen: de rompgeometrie wordt gedeeld. Nooit in water, gebouw of op de rijbaan (`crowdGround`: een voetpad of fietspad mag); een plek die niet mag schuift naar buiten en valt anders weg (`plan.short`). Min. 0,9 m tussen figuren; `clear` houdt cirkels leeg (finishlijn, voertuigpad, props).
- Deterministisch per spec en seed (`seedFromKey('M05.finish')`). Reactie bij het passeren (`crowdReact`): binnen 18 m kijken ze mee, binnen 7 m juichen of zwaaien ze met een eigen vertraging en het houdt even aan. LOD (`crowdLod`): tot 40 m volle animatie, tot 130 m elk vierde beeld, daarna niet getekend. Opruimen geeft de rompgeometrie terug en de sleutel vrij.
- **In een cutscene:** `def.crowd = { shape, ... }` (of een lijst) in lokale maten f/s; cutscenehost bouwt het, houdt het uit de buurt van het wegvolgende voertuigpad (`roadPropPaths` na `roadPathDef`), laat het het voertuig of de eerste acteur nakijken en ruimt het mee op. Niet in een binnenset (de validatie keurt het af).
- **In de aankleding:** `dressingPlan(kind).crowd` (lokale maten along/side); `buildMissionDressing` bouwt het buiten de stage-cirkel en buiten de props, `updateMissionDressing` laat het reageren op de speler.

### Sjablonen voor races en checkpointmissies

```js
const { def, anchor } = raceFinishScene(route, { id: 'M05.finish', vehicle: 'auto', speed: 14, crowd: 36 });
playScript(world, def, { anchor, lines: [], duration: def.duration });       // overzicht, volg, finishlijn, reactie
const st = raceStartScene(route, { id: 'M05.start' });                       // wacht op het startsein, rijdt weg
startSignalState(t)  // { lit: 0..3, go, goAt }: drie rood, dan groen
buildCheckpointRaceDecor(world, route, { key })   // start- en finishboog, twee groepen publiek, startlicht
updateCheckpointRaceDecor(h, dt, speler, t); disposeCheckpointRaceDecor(h);
```

- `route` zijn wereldpunten van start naar finish (de checkpoints). Het voertuig krijgt `road: true`: bij de start zet `roadPathDef` zijn pad op de echte weg (#862), en het publiek blijft er 3 m vandaan (geen doorrijden door figuren, #964). `cameraTemplate(naam, { t0, prop })` (overzicht, volg, finishlijn, reactie) en `vehicleCues(id, pad, { kind, speed })` zijn ook los te gebruiken in een eigen scène.
- Nieuwe `dressing`-soorten voor `step.dressing`: `plein` (jurytafel, kramen, publiek met opening naar de speler), `stuntarena` (12 hekken, 12 toeschouwers rond de stuntmarker), `kade` (kisten, tonnen, publiek langs de kade), `perron` (banken, halteboord, reizigers en een fotograaf).
- De runner (`missions.js`) is niet aangeraakt: een missie-agent koppelt `buildCheckpointRaceDecor` aan de `checkpoint`-race (waar `buildRaceDecor` nu alleen een finish bouwt) en roept de scènes aan met `playScript`.

### Binnensets

`step.set` en `def.set` kennen er drie bij: `kroeg` (bar met krukken, tafels, dartbord, jukebox), `woonkamer` (bank, salontafel, tv, eettafel, raam) en `garage` (auto op de hefbrug, werkbank, banden, vaten). Zelfde mechanisme als Oma's keuken: een gesloten kamer, alleen de binnenkant, eigen licht en frame, de speler kijkt naar +u. `ROOMS` in `roomspec.js` heeft de maten, de voetafdrukken, de plek van de speler en twee figuren per kamer (NPC-sleutels uit `missionstory.js`; pas ze aan per missie).

- **Fit-regels** (`roomFit`): speler en figuren staan 0,45 m van de muur en niet in een meubel; de tests lopen alle drie de kamers langs.
- **Terugval:** in een missiestap bouwt `buildStageSet` geen kamer (`null`, de stap speelt in de open lucht) als de grond onbekend is of er water of een gebouw in de voetafdruk staat, want de speler blijft op de grond. In een cutscene hangt de kamer dan 40 m boven de straat (`roomBaseHeight` met `allowLift`), zoals de keuken van de opening; de camera blijft binnen de muren (`roomClamp`).
- Eerste gebruikers: kroeg in M16, woonkamer in #950/#956-dialogen thuis, garage in M02 (kantoor, loket, serverkamer en Oma's keuken bestonden al).

### Samen spelen

Het is van iedereen en van niemand: publiek en kamers zijn lokaal beeld, zonder netwerkstaat. Wie meedoet ziet dezelfde scène: de gast krijgt de definitie (met `def.crowd`) in het scenepakket (`coopcut.js`, het pakket blijft binnen de maat) en bouwt uit spec en seed hetzelfde publiek, op dezelfde plekken. `claimCrowd` houdt per apparaat één publiek per sleutel, dus een gast die de scène naspeelt en ook de aankleding van de stap draait, krijgt het publiek niet dubbel. Beloning en voortgang zijn per speler (#429); wie wegvalt of later aansluit mist alleen het beeld. Dekking: `binnensets_cine_test` (pakket als JSON over het net, zelfde posities, geen dubbele crowd) en `crowd_test`.

### Nog niet bekeken

Geen enkel beeld is in de app gezien: de uiterlijke maat van kamers en figuren, de reactie-animaties van het publiek (armhoeken van juichen en zwaaien), de camerastanden van de finishscène en de plaatsing op echte kaartgrond (nu alleen met nagebootste kaarten en een nagebootste weg getest). Perf van 60 figuren is niet gemeten.

## Haken van akte 3 (AAA akte 3: M12 tot M16 en de kermisrit)

Code: `game/js/missions_akte3.js` (alleen data: `applyAkte3`, aangeroepen aan het eind van `applyNieuw`), `kermis_uitslag.js` (puur), kleine haken in `missions.js`, `planestage.js` en `missiedecor.js`. Test: `node scripts/akte3_aaa_test.mjs`. Beeld: `scripts/qa/akte3_beeld.mjs`.

- **`step.dressingAt: { x, y }`:** de aankleding van `step.dressing` staat op die plek in plaats van om het doel van de stap. Nodig als het doel in de lucht is (de landing van M15) of als de aankleding naast een baan moet staan. De plannen die hiervoor bedoeld zijn reiken niet verder dan 16 m van het anker, zodat ze in elke kijkrichting buiten een strook van 34 m blijven als het anker 45 m van de as ligt (de test loopt alle richtingen na).
- **`registreerAankleding(kind, plan)` (`missiedecor.js`):** een akte meldt eigen plannen aan, zonder het gedeelde bestand te vullen; een bestaande naam wordt nooit overschreven. Akte 3 voegt `haven` (kade bij nacht, twee havenwerkers, geen publiek), `graanstrook` (Roelfiens erf) en `graanlanding` (hetzelfde erf met tien kermisgangers en een spandoek) toe.
- **`def.toastSet`:** een tochtmissie met toasts (M16) zet de toast in een binnenset (`'kroeg'`): de kamer komt bij het tentpunt om de speler en gaat weg zodra de toast voorbij is of de missie eindigt. Past de kamer niet (water, gebouw, in een voertuig), dan speelt de toast buiten zoals eerst.
- **`meldRegelkaart('punt' + n)`:** na elk tochtpunt (n is het aantal gehaalde punten) kan een regel van `def.kaart` met `bij: 'punt2'` verschijnen. `planestage.js` meldt `'poort' + n` na elke gehaalde poort en laat een stap-sting klinken.
- **Koe in een scène:** `{ kind: 'koe' }` is een cutscene-prop (het dierenregister, `cutscene: 'koe'`).

Samen spelen: alles is lokaal beeld bij wie de stap draait (zie de secties hierboven); de kermisreactie is alleen beeld bij wie de rit reed.
