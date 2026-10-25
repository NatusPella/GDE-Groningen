# Specs (specsmd FIRE) en UltraCode: wie doet wat

Twee systemen die elkaar aanvullen, zolang de rolverdeling vastligt. Dit bestand
is die afspraak. Bij twijfel wint [AGENTS.md](../AGENTS.md).

## De rolverdeling

| Laag | Eigenaar | Waar |
| --- | --- | --- |
| Intent, work items, run-state, walkthroughs | **specsmd FIRE** | `.specs-fire/` |
| Standaarden en conventies | **AGENTS.md** (niet FIRE's `constitution.md`) | repo-root |
| Uitvoering: opknippen, parallel, integreren, verifiëren | **UltraCode** | sessie |
| Bewaking van de uitvoering | **reviewer** en **test-runner** subagents | sessie |

FIRE levert het papier en de state-machine. UltraCode doet het werk. Er is één
uitvoeringspad: we gebruiken **niet** de `builder`-skill van FIRE als
uitvoeringsmotor naast UltraCode — alleen de scripts van FIRE als state-API. Twee
motoren naast elkaar betekent twee waarheden in `state.yaml`.

## De loop

1. **Bord eerst.** Een work item hoort bij een GitHub-issue (`Refs #n`). Geen
   issue, geen werk — behalve voor pure tooling.
2. **Plannen met FIRE.** `/specsmd-fire-planner` maakt een intent-brief en knipt
   die in work items. Elke work item krijgt een `mode` (autopilot, confirm of
   validate) en een issue-nummer in de titel of brief.
3. **Uitvoeren met UltraCode.** `/ultracode voer work item <id> uit`. UltraCode
   leest de brief, doet de triage, en gebruikt de FIRE-scripts voor de state:
   - `node .specsmd/fire/agents/builder/skills/run-execute/scripts/init-run.cjs <root> <workItemId> <intentId> <mode>`
   - `node .specsmd/fire/agents/builder/skills/run-execute/scripts/update-phase.cjs <root> <runId> <phase>` (plan, execute, test, review)
   - `node .specsmd/fire/agents/builder/skills/run-execute/scripts/complete-run.cjs <root> <runId>`
4. **Verifiëren.** `test-runner` voor de checks van het project, `reviewer` op de
   diff bij confirm en validate. Bevindingen eerst oplossen, dán afronden.
5. **Afronden.** Walkthrough genereren, `complete-run.cjs`, en de
   spelerzichtbare regel in `CHANGELOG.md` onder `[Unreleased]` (zie AGENTS.md).
   Commits met `Refs #n`; geen push, merge, tag of release door een agent.

## Mode-mapping

De FIRE-mode is leidend, want die staat per work item in `state.yaml`. UltraCode
vertaalt hem naar de juiste hoeveelheid team:

| FIRE-mode | UltraCode-inzet | Checkpoints |
| --- | --- | --- |
| `autopilot` | geen recon-team, hooguit één subagent, checks: syntax + de directe tests | 0 |
| `confirm` | één parallelle recon-ronde, dan zelf implementeren of 1–2 subagents, reviewer op de diff | 1 |
| `validate` | volledige loop: recon, gescheiden implementatie-units, reviewer én test-runner, design-doc | 2 |

Wijkt de mode af van de werkelijkheid (een "autopilot"-klus blijkt een
architectuurwijziging), dan pas je de mode aan in de brief — niet stilzwijgend
zwaarder gaan werken.

## De canonieke specs

De inhoudelijke specs staan in `.specs-fire/standards/` en zijn het *hoe*: één per
systeem, met de regels, de bestanden, de tests en de open punten. `docs/` houdt de
naslag (detail, metingen, wettelijke teksten, handleidingen); een gebiedsdoc dat
iets unieks heeft blijft en verwijst naar zijn spec.

| Spec | Gaat over |
| --- | --- |
| `constitution.md` | verwijzing naar `AGENTS.md`; nooit een tweede bron |
| `tech-stack.md` | de techniek en waarom |
| `coding-standards.md` | stijl, naamgeving, modules, imports |
| `testing-standards.md` | de testfasen en wat een test moet bewijzen |
| `system-architecture.md` | schillen, componenten, framevolgorde, beperkingen |
| `multiplayer.md` | Samen spelen: rollen, opdrachtstand, overdracht, PvP, beloningen |
| `wereld.md` | wereld, kaart, tegels, provincie, POI's, gebieden |
| `mechanica.md` | loopbaan, boerderij, vliegschool, geluid, prestaties, weer |
| `verhaal.md` | verhaal, personages, stem, de keten van script naar spel |
| `ui-taal.md` | kleur, typografie, bediening, menu's, taalregels |
| `publicatie.md` | releaseketen, checks, licenties, leeftijd, privacy, merken |

`ARCHITECTURE.md` in de root blijft de bestandskaart (ca. 200 KB). Dat is naslag,
geen spec: grep erin, lees hem nooit in zijn geheel. `README.md` is voor mensen op
GitHub, `AGENTS.md` voor agents; die twee blijven zoals ze zijn.

## Harde regels

- **`state.yaml` nooit met de hand.** Altijd via de scripts; die bewaken run-ids,
  fases en checkpoints.
- **Eén work item = één run = één branch/worktree.** Zo blijft de repo-regel
  "agents werken in een eigen worktree" overeind en is een run terug te draaien.
- **FIRE's `constitution.md` is een verwijzing, geen tweede bron.** `project-init`
  maakt er een; de inhoud moet naar AGENTS.md wijzen en mag die nooit tegenspreken.
- **Work items zijn file-eigenaarschap, niet feature-beschrijvingen.** Twee work
  items die hetzelfde bestand raken, horen bij elkaar of moeten na elkaar.
- **Beloftes alleen met bewijs.** Geen "klaar" zonder de checks uit de stap
  Verifiëren; wat niet gedraaid is, staat als "niet getest" in de walkthrough.

## Wat waar staat in git

| Wat | In git? | Waarom |
| --- | --- | --- |
| `.specs-fire/intents/` (brief + work items) | **ja** | dit is de spec; hij hoort bij de code, net als `docs/DESIGN-*.md` |
| `.specs-fire/standards/` | **ja** | projectkennis, naast `AGENTS.md` en `docs/` |
| `.specs-fire/runs/<run-id>/` | **ja** | plan, testrapport, review en walkthrough per run: het papieren spoor |
| `.specs-fire/state.yaml` | **ja, met een regel** | zie hieronder |
| `.specsmd/` en `.opencode/` | nee | lokale agent-tooling, net als `.claude/` |

De issues op het bord blijven de bron voor *wat* we doen; de spec is het *hoe*. Een
work item verwijst naar zijn issue (`Refs #n`), en de walkthrough is wat een run
heeft opgeleverd. Geen dubbele roadmap: geen werkitem zonder issue.

### `run.md` is een startsnapshot, `state.yaml` is de waarheid

Verwar de twee niet en synchroniseer ze niet met de hand:

- `init-run.cjs` schrijft `run.md` **één keer** bij de start (fase `plan`,
  checkpoint `none`) en zet de run in `state.yaml`.
- `update-phase.cjs` werkt **alleen** `state.yaml` bij (plan → execute → test →
  review) en raakt `run.md` niet aan.
- `complete-run.cjs` zet aan het eind `run.md` en `state.yaml` allebei op
  `completed`, inclusief het runverslag en de walkthrough.

Een run die halverwege is, laat dus bewust twee verschillende fases zien. Dat is
geen conflict en geen fout: wie `run.md` met de hand bijwerkt, maakt er juist een
tweede waarheid van.

### De regel voor `state.yaml`

`state.yaml` is het enige bestand dat bij elke run verandert, en agents werken in
parallelle worktrees. Daarom:

- **Een run-id is per worktree uniek** (`run-<worktree>-<NNN>`), dus run-mappen
  botsen nooit bij het mergen.
- **`state.yaml` is het enige botspunt.** Het bestand is klein en zelfbeschrijvend:
  bij een conflict neem je de work-itemstatussen over zoals ze feitelijk zijn
  (pending/in_progress/completed) en laat je de runs-lijst aansluiten. Niet
  handmatig "kiezen" tussen twee kanten.
- **De coördinator bezit `state.yaml` bij het mergen**, net zoals hij de merge en
  de release bezit. Een agent schrijft zijn eigen run erin via de scripts, niet met
  de hand.

### In een worktree

`.specsmd/` en `.opencode/` staan in `.gitignore`, dus die maak je per worktree aan
met `npx specsmd@latest install` (OpenCode + FIRE); de versie staat in
`.specsmd/manifest.yaml`. De spec zelf komt gewoon mee met de branch.

## Snel beginnen

```text
/specsmd-fire-planner   maak een intent + work items voor issue #n
/ultracode              voer het volgende work item uit
/specsmd-fire           status en volgende stap volgens FIRE
```
