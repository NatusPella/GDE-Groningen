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
