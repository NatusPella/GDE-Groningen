# Missiecurve en de uitschieters (#829)

Bron: `node scripts/missiebalans_audit.mjs` op 10-11-2026 (stage v0.60.3). De audit
telt nu een tak van een inbraak één keer: de zwaarste `only`-tak, niet alle
takken opgeteld. Daardoor is M06 geen 12 maar **10** speelbare stappen.

## Voor/na

| missie | speelbaar | uitdagend | bijzonder |
|---|---:|---:|---|
| M06 Het museum stond er al zo | 12 → **10** | 6 → 5 | tak-telling gecorrigeerd; checkpoint na de entree |
| M20 Het beleg van Bourtange | 13 | 6 | checkpoint na het fierljep-duel; vijf houdmomenten 16/14/12/12/12 s → 12/10/10/10/10 s |
| M26 Ontzet, net als in 1672 | 6 | 5 | vuurwerkhold 30 → 22 s |
| M30 Het proefbeleg | 10 | 3 | drie bolwerk-houdmomenten 8 → 6 s |

De sprongen blijven zichtbaar: M19 (2) → M20 (13) → M21 (3) en M29 (2) → M30
(10). Dat is een **ontwerpbesluit**, geen meetfout: M20 is de act-finale en M30
de epiloog. Voor een volgende contentronde is de aanbeveling om M20 in twee
missies te knippen of M21 een rustiger start te geven; dat is een grotere
verhaalwijziging dan deze ronde toelaat.

## Ontwerpregel

Een lange missie (≥8 speelbare stappen) wordt niet direct gevolgd door een heel
korte (≤4) zonder rustpunt. Een checkpoint, scene, board of hold in de korte
missie geldt als rustpunt. `game/js/missioncurve.js` legt de telregel en
`longThenShort` vast; `scripts/missioncurve_test.mjs` test beide.

## Wat niet is veranderd

- Geen missie-ID's, labels, beloningen of opslagsleutels.
- Geen medaille-drempels (`MISSION_GOALS`) of recordopslag; Standaard/records
  blijven werken. De hold-tijden zijn spelerservaring, geen recordveld.
- Geen split van een missie in nieuwe stappen; dat vraagt een playtest en een
  verhaalwijziging.
