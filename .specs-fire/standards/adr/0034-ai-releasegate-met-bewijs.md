# 0034 - Een releasegate met bewijs, AI-beeldreview en AI-code-review

- **Status:** besloten
- **Datum:** 2026-11-13
- **Spec:** [testing-standards.md](../testing-standards.md), [publicatie.md](../publicatie.md)
- **Gevraagd door:** de eigenaar (werkwens 13-11-2026: elke release zonder regressie in performance, graphics, design system, regels en UI/UX/gameplay, zonder de mens als bottleneck)

## Context

De bestaande releasepoort was `run_tests.mjs` in `desktop/release.sh`: een groene
lichte suite en dan bouwen. De zware wereldchecks en de Electron-beeldronde
draaide de coördinator los, maar hun uitslag was geen voorwaarde, en de
beeldchecks zeiden zelf dat niemand de beelden had bekeken. Performance had een
norm (#804) maar geen releasebaseline; design system en constitutie waren losse
tests zonder diffcontrole; code review was geen vast onderdeel van een release.
Daardoor kon een release groen doorkomen terwijl performance, beeld, design,
regels of speelbaarheid achteruit waren gegaan — en hing het eindoordeel aan een
mens die uren naar beelden en diffs keek.

## Besluit

Er komt één releasegate, `scripts/release_gate.mjs`, die vijf fasen met bewijs
samenbrengt: **static**, **world** (alleen als wereld/tegels geraakt zijn),
**perf**, **visual** en **review**. De gate kiest de fasen uit de diff sinds de
vorige tag, schrijft één machineleesbaar rapport plus een Nederlands rapport, en
is nooit stil groen: een niet-gedraaide fase heet onvolledig (exit 3). Baselines
voor perf en beeld staan gecommit en worden alleen met een expliciete reden
bijgewerkt.

De reviewfase is verplicht en werkt met AI:

1. `review_pack.mjs` maakt een begrensd reviewpakket uit de diff, gegroepeerd per
   systeem, met per aspect een checklist en een strikte outputvorm;
2. één reviewer-subagent per verplicht aspect (correctheid, regels, design, perf,
   UX/gameplay, multiplayer, en `vision` voor de beelden) schrijft een
   reviewrapport volgens `scripts/release/findings-schema.json`;
3. `findings.mjs` valideert, dedupliceert en triageert; blokkerende bevindingen
   moeten gedicht zijn voordat de gate groen kan zijn, belangrijke en nit gaan
   als issue-concept naar het bord;
4. de beeldfase levert een compact pakket (contactbladen plus de gewijzigde
   volledige beelden, standaard max 36) dat een AI met beeldherkenning beoordeelt;
5. na een fix worden de geraakte deterministische fasen opnieuw gedraaid en de
   reviewdelta opnieuw beoordeeld.

`desktop/release.sh` verifieert het bewaarde gate-rapport op de te releasen
commit (`--verify --allow-release-commit`, omdat de versiecommit alleen
release-metadata raakt) en stopt zonder groen bewijs. De bestaande nooduitgangen
blijven, met luide melding: `GDE_RELEASE_SKIP_TESTS=1` en `GDE_RELEASE_SKIP_GATE=1`.

## Afgewezen

- **Alleen de bestaande suite als poort houden.** Die dekt performance, beeld,
  design, regels en review niet, en de ervaring tot nu toe is dat juist daar de
  releasefouten zaten.
- **De mens alle beelden en de diff laten beoordelen.** Dat is de bottleneck die
  de eigenaar wil wegnemen en kost uren per release; AI met beeldherkenning kan
  het scanwerk doen, de mens houdt het publicatierecht.
- **Alles in CI draaien.** De zware en Electron-fase passen niet in de 2000
  gratis Actions-minuten (ADR 0013); de gate draait lokaal bij de coördinator.
- **Elke release de volledige suite plus alle beelden plus een volledige
  repo-review.** Dat kost te veel tijd en tokens; daarom fasekeuze op de diff,
  een begrensde reviewset en alleen de delta opnieuw beoordelen.
- **De baseline automatisch bijwerken als een meting slechter is.** Dan wordt een
  regressie een stille gewoonte; de baseline vraagt een expliciete reden en een
  groene meting.
- **Een tweede meetmethode naast `scripts/perf` en de QA-rondes.** De gate
  hergebruikt wat er is; een nieuwe meting zou een tweede waarheid maken.

## Gevolgen

- Elke release heeft een bewaard rapport (`%TEMP%/gde-release/<stamp>-<commit>/`)
  met per fase het bewijs; `--verify` is de technische poort in `release.sh`.
- Een release kost ongeveer 45-75 minuten deterministisch werk plus 5-25 minuten
  parallel AI-review (exclusief fixen), minder dan de oude volledige
  Electron-poort en met meer dekking.
- Wat niet gedraaid kon worden (geen wereld, geen Electron, geen beelden) staat
  als onvolledig en "niet getest" in het rapport en het issue; de gate doet geen
  belofte die ze niet kan meten.
- De perf- en beeldbaselines zijn nu releasegegevens in git; na een bewuste
  release worden ze met reden bijgewerkt. De beelden zelf blijven buiten git.
- Nieuwe QA- of perf-metingen horen vanaf nu in de gate (één poort), niet in een
  los script dat niemand aanroept.
- Dezelfde regels- en designcontrole draait ook mee in `run_tests` en dus in CI op elke
  pull request en push naar `main` (basis via `GDE_RULES_BASE`), zodat elke merge die
  controle krijgt zonder de 45-75 minuten van de volledige gate. De AI-review en de
  perf- en beeldcontrole blijven bij de releasegate.
