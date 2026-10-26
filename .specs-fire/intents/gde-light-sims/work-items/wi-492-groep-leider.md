# #492 Groepen: leider in de staat en een groeps-API naast de missie

- **Issue:** #492
- **Epic:** #492
- **Complexity:** small
- **Mode:** confirm
- **Depends on:** wi-492-trein-samen

## Acceptatie

De basis voor "iedereen kan starten en leider zijn; meerdere groepen tegelijk" staat in
de staat, zonder al een tweede missieketen te bouwen.

- `coopmissie.js` kent per groep een `leider`: de starter bij `beginVerzoek`, anders de
  eerste deelnemer. `leiderVan` en `isLeider` zijn pure helpers; `zichtbaar` geeft de
  leider mee.
- `coopnet.js` krijgt op de host `coopGroepStart`, `coopGroepZet` en `coopGroepEind`.
  **Een groep ontstaat pas bij de start van een activiteit**: `coopGroepStart` eist een
  `activiteit` en minstens één deelnemer, maakt dan de groep met de starter als leider,
  en `coopGroepEind` (of het einde van de activiteit) haalt hem weer weg. Er is geen
  groep zonder activiteit en geen leider die blijft bestaan als de activiteit stopt.
  De missiegroep (`werkGroepenBij`) raakt geen andere groep; een tweede groep houdt stap,
  doelen, deelnemers en leider zolang zijn activiteit loopt.
- De bestaande per-slot levering van doelen (`hostSim.extra`) blijft werken; een test
  bewijst dat twee groepen elk hun eigen doel houden.
- Geen nieuwe opslag, geen protocolbump, geen wijziging aan `world.mission` of de
  missieketen.
- `node --check`, `coopmissie_test`, `coopnet_test`, `undef_check`,
  `import_check`, `import_cycles_test` en `text_audit` groen.

## Samen spelen

J. De host blijft de wereld simuleren; de leider is de starter van de groep, niet de
host. Deze stap maakt het mogelijk om groepen naast de missie te boekhouden; de startpaden
en de UI volgen in de volgende slice.

## Niet

Geen tweede missieketen, geen tweede bijbaan/wedstrijd, geen UI voor groepen, geen
hostwissel-herstel.
