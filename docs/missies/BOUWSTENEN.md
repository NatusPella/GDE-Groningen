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
