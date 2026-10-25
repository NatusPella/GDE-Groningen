# Constitutie (FIRE)

> **Dit bestand is een verwijzing, geen tweede bron.**
> De bindende afspraken staan in [AGENTS.md](../../AGENTS.md) (de constitution,
> de werkwijze, testen en code) en in [CONTRIBUTING.md](../../CONTRIBUTING.md).
> Bij twijfel of tegenspraak wint AGENTS.md altijd.

## Wat hier geldt, in het kort

- **Nederlands** is de taal van alles wat een speler ziet of hoort. Code,
  commentaar en commitberichten mogen Engels zijn.
- **Geen echte merken, bedrijven of personen**; verzonnen namen voor parodieën.
  Echte straten en openbare gebouwen mogen als decor.
- **Altijd zomer.** Geen winter, sneeuw of natuurijs.
- **Geheimen blijven geheim**: nooit `.env` lezen, printen of committen.
- **Geen persoonsgegevens** in de repo, speltekst of tests; niets naar externe
  diensten behalve de uitzonderingen die AGENTS.md noemt.
- **Saves blijven werken.** Wie de vorm van een save wijzigt, voegt een migratie
  toe in `game/js/savemigrate.js` plus een fixture in `scripts/fixtures/saves/`.
- **Opslagsleutels** heten `gde-*` en staan in `game/js/storagekeys.js`.
- **Git**: agents committen in hun eigen worktree en branch, in kleine commits,
  en pushen, mergen, taggen of releasen nooit. Dat doet de coördinator.
- **Eén bron voor de roadmap**: GitHub-issues. Geen roadmap-markdown in git.

## Git-workflow in dit project

- **Commitstijl**: `<onderwerp>: <wat en waarom>` in het Nederlands, met
  `Refs #n` of `Closes #n` naar het issue. Geen conventional-commit-prefixen.
- **Branch**: per agent een eigen worktree en branch; de coördinator merget na
  de tests. `main` is altijd releasebaar.
- **Review**: geen verplichte pull-request-review (hobbyproject, één eigenaar).
  De reviewersrol is een `reviewer`-subagent op de diff, geen goedkeuringsproces.
