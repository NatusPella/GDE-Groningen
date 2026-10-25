# #492 Boerderij fase 1: leveringscontracten

- **Issue:** #492
- **Epic:** #492
- **Complexity:** medium
- **Mode:** confirm
- **Depends on:** wi-492-boer-markt

## Acceptatie

De boerderij krijgt leveringscontracten bovenop de dagmarkt.

- Nieuwe pure module `game/js/boerderijcontracten.js`: per speldag een deterministisch
  aanbod per gewas (zaad uit de dag en de boerderij), maximaal drie actieve contracten,
  elk met een gevraagde kg, een deadline in speluren en een bonus per kg. Aannemen,
  leveren (deellevering telt in kg), afronden en verlopen zijn pure functies; geen DOM,
  THREE, klok, opslag of random.
- `game/js/boerderij.js` bewaart het aanbod, de actieve contracten en een begrensde
  historie in de bestaande boerderijstand; `normaliseer` geeft oude of kapotte opslag een
  geldige lege stand en de roundtrip blijft stabiel. Geen nieuwe opslagsleutel.
- Leveren gebeurt bij de bestaande verkoop/aflevering: de geleverde kg tellen mee voor een
  actief contract van dat gewas, en een afgerond contract keert de bonus uit via
  `loopbaanVerdien('landbouw', …)` in `boerderijlive.js` (geen `world.money +=`).
- Verlopen contracten kosten niets (geen boete); ze verdwijnen uit de actieve lijst en
  komen in de begrensde historie.
- Het Gewas-tabblad in `boerderijui.js` krijgt een blok Contracten met per aanbod het
  gewas, de kg, de deadline en de bonus, een knop Aannemen, en per actief contract de
  voortgang in kg. Nederlands, bestaande stijl, geen "save".
- Nieuwe test `scripts/boerderijcontracten_test.mjs` (aanbod, determinisme, aannemen,
  deellevering, afronden, verlopen, grenzen, normalisatie) en een test in
  `boerderij_test.mjs` dat de bonus via de bestaande haak loopt.
- `node --check`, `boerderijcontracten_test`, `boerderij_test`, `boerderijui_machines_test`,
  `boerderijui_percelen_test`, `undef_check`, `import_check`, `import_cycles_test` en
  `text_audit` groen.

## Samen spelen

J (de boerderij is van de speler). Host en gast hebben elk hun eigen boerderij en hun
eigen contracten in hun eigen opslag; de dag en de deadlines komen uit de eigen `b.uren`,
die tijdens een sessie met de klok van de host meelopen (#471). De gast levert in zijn
eigen spel; in de wereld van de host is de loonwerker-leverknop voor hem verborgen. De
bonus is van de eigen boerderij en wordt niet gedeeld (`deel: false`); de gewone verkoop
volgt de bestaande haak.

## Niet

Geen teeltplan per perceel, geen vijfde gewas, geen extra machines, geen rijdend
AI-personeel, geen boete bij verlopen, geen prijzen of contracten in de savegame.
