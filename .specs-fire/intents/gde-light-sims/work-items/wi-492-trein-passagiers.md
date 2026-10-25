# #492 Treinpassagiers: tellen en per halte laten betalen

- **Issue:** #492
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** geen

## Acceptatie

De machinistendienst krijgt de eerste B+ rooster-laag: reizigers die tellen en betalen.

- Pure functie in `game/js/machinistrules.js`: per halte een deterministisch aantal
  instappers en uitstappers uit de perrondrukte en de treincapaciteit, begrensd zodat
  de trein nooit boven de capaciteit komt en nooit negatief wordt.
- De dienst (`begin`/`stepService`) houdt het aantal reizigers bij; een halte levert
  naast het bestaande haltenloon een kaartinkomst per meegereden reiziger.
- De uitslag (`finish`) en `payFor` nemen de reizigersopbrengst mee; de uitbetaling
  blijft via `loopbaanVerdien('trein', …)` lopen (geen `world.money +=`).
- Het machinistenbord toont tijdens de dienst het aantal reizigers en per stop hoeveel
  er in- en uitstappen, in het Nederlands en in de bestaande stijl.
- Nieuwe/uitgebreide test in `scripts/machinist_test.mjs`: vaste drukte geeft
  deterministisch N in/uit, capaciteit wordt nooit overschreden, 0 reizigers geeft
  alleen het haltenloon, de uitslag en `payFor` kloppen.
- `node --check`, `machinist_test`, `simdienst_test`, `dienstregeling_test`,
  `treincabine_test`, `undef_check`, `import_check`, `import_cycles_test` en
  `text_audit` groen.

## Samen spelen

N (host-werk): alleen de host kan een treindienst starten; een gast ziet de trein en
kan niet instappen als machinist. De reizigers zijn wereldgedrag van de host en staan
niet in de savegame. Deze unit verandert de beloningsverdeling niet; het bestaande
gastgat (elke gast krijgt het volle bedrag zonder `slots`) hoort bij #365/#371 en
wordt daar aangepakt. Geen netwerkbericht en geen gedeelde kas.

## Niet

Geen blokseinen, geen vast dienstrooster, geen rangeermissie, geen ATB/ERTMS, geen
materieelbeheer, geen wijziging aan `treincoop.js` of de gastbesturing.
