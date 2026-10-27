# #492 Per-groep wereldstaat: de host simuleert N activiteiten

- **Issue:** #492
- **Epic:** #492
- **Complexity:** large
- **Mode:** confirm
- **Depends on:** wi-492-groep-ui, wi-492-vracht-bezit

## Acceptatie

Twee groepen kunnen tegelijk een verschillende **door de host gesimuleerde** activiteit
doen, zonder dat de een de ander stopt of overschrijft.

### Slice 1: bijbanen — afgerond (commits fb4eb437, 6aaaa6ea; gemerged in main)

- `game/js/sidejobs.js` heeft een register `contexts` per eigenaar (slot) in plaats van
  één `ctx`; de host heeft `ctx` als alias voor zijn eigen plek.
- Elke context heeft een eigen `owner`, `world` (een proxy met het lichaam en de invoer
  van die speler), voertuig, peds, meshes, data, timer en beloning.
- Een gast bestuurt zijn eigen baanvoertuig (`jobOwner`), zonder diefstal of
  `missionCar`-blokkade; de host bestuurt het zijne.
- `coopbijbaan.js` houdt per eigenaar een staat (`n.bijbanen[slot]`), een eigen
  uitnodiging, doel, ronde en beloning; de gast ziet alleen zijn eigen baan.
- Twee gasten kunnen twee verschillende bijbanen starten; elke baan houdt zijn eigen
  voertuig, doel en loon. Stopt de een, dan loopt de ander door.
- Tests: `scripts/sidejobcontext_test.mjs` (16) en
  `scripts/coop/bijbaanparallel_test.mjs` (9). Lichte suite op de samengevoegde branch:
  603 geslaagd, 0 mislukt, 34 niet gedraaid.

### Slice 2: missies

- `missions.js` krijgt een keten per groep in plaats van één `chain`; de bestaande
  lezers blijven voor de eigen groep werken.
- Twee missiegroepen kunnen tegelijk lopen; de host ziet zijn eigen keten, een gast
  de zijne.
- `succeed`/`fail`/`save`/`hostwissel` gaan per groep; een gastmissie is niet
  savebaar tenzij expliciet anders besloten.

## Samen spelen

Dit is de kern van Samen spelen: elke groep is gelijkwaardig, de host simuleert maar
is geen leider. De beloning blijft per speler (1+1=3, ADR 0016). De wereld blijft van
de host; elke groep krijgt een eigen view op dezelfde wereld.

## Niet

Geen tweede wereld, geen tweede physics-engine, geen protocolbump, geen nieuwe
opslagsleutel. Geen hostwissel voor meerdere groepen in deze slice (blijft een
open punt).
