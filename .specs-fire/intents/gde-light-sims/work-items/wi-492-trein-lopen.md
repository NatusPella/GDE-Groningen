# #492 Trein: conducteur loopt door de trein en controleert kaartjes

- **Issue:** #492
- **Epic:** #492
- **Complexity:** high
- **Mode:** confirm
- **Depends on:** wi-492-trein-crew

## Acceptatie

Een gast als conducteur kan door de trein lopen en kaartjes controleren, zoals de
busconducteur in Bus Simulator 17, maar dan in de trein.

- De conducteur kan in de trein een loopmodus openen (T), met de bestaande
  `treinlayout.js`-indeling (`walkMove`, `carPoint`, `passengers`): lopen over het gangpad,
  van wagen naar wagen, met de binnencamera. De gastheer ziet de conducteur in de juiste
  wagen (positie via een bestaand/nieuw `trein`-bericht, geen `PROTO`-bump).
- De treininterieurweergave (`treininterieur.js`, `railway3d.js`) bouwt ook voor de gast
  de wagen bij zijn trein; de conducteur ziet de stoelen, gangpaden en reizigers.
- Met E bij een zittende reiziger controleert de conducteur een kaartje: een korte
  deterministische uitkomst (in orde / even zoeken / automaat), de teller loopt, en na
  een ronde (5 reizigers) volgt loon en XP via `loopbaanVerdien('trein', …)` met
  `deel: false` (eigen geld/loopbaan, geen hostdeling).
- De machinist blijft rijden; de conducteur kan alleen lopen en controleren. De role
  `conducteur` uit `treincoop.js` is leidend; een passagier kan niet controleren.
- Het spel blijft werken als de trein rijdt, stopt of de conducteur uitstapt; de
  loopmodus stopt bij uitstappen, wegvallen en het einde van de sessie.
- Tests: pure loop-/controlelogica (`scripts/treincontrole_test.mjs`), de koppeling in
  `cooptrein_test.mjs`, en de bestaande trein-/coöptests blijven groen.
- `node --check`, `treincontrole_test`, `cooptrein_test`, `coop/treincoop_test`,
  `coopnet_test`, `coopgast_test`, `gasttrein_test`, `coopregressie_test`,
  `undef_check`, `import_check`, `import_cycles_test` en `text_audit` groen.

## Samen spelen

J. De gastheer is machinist; de conducteur is de eerste gast. De conducteur loopt en
controleert op zijn eigen scherm; de gastheer ziet hem in de wagen. De beloning is per
speler en wordt niet gedeeld. Geen nieuwe opslag, geen gedeelde kas, geen protocolbump.

## Niet

Geen gast als machinist, geen tweede trein, geen conducteur die de trein bestuurt, geen
interieur voor de machinist (bestaat al), geen hostwissel-herstel.
