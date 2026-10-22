---
name: prioritering
description: Simple priority rule for the GitHub board: bugs first, then impact vs cost, then later
metadata:
  type: feedback
---

Priority order on the GitHub board (project 5): 1) label `bug` (broken or wrong behaviour) goes above new things; 2) new work by high impact + low cost (`impact-*`, `kosten-S/M/L`); 3) `later` at the bottom. No P0–P3 labels (deleted 2026-10-16, they duplicated impact/cost); no `blokkerend` label.

**Why:** the user wants one simple mechanism; P-levels overlapped with impact/cost.
**How to apply:** label new bugs `bug`, new ideas with impact + cost; pick next work in that order. Also see [[roadmap-on-github]].

Labels kept minimal: every issue is a `bug` or a `wens`, plus one `impact-*` and one `kosten-*`. Only workflow flags besides that: `autopilot`, `eigenaar`. No thematic/bundle labels.

**Werkafspraak:** whenever we do anything with an issue (start, commit, merge, release, decision), update the issue too (comment, close with "Closes #n", board status).

**Board (2026-10-16):** columns Bugs, Wensen, Bezig, Review, Klaar (Volgende to be removed by the user in the UI). Roadmap/backlog exist ONLY as GitHub issues; ROADMAP.md, docs/BACKLOG.md, autopilot script/label were deleted. Don't recreate roadmap markdown in git. Autopilot dropped as over-engineered; work goes via Sonnet worktree agents.

**Milestones = epics (2026-10-16, overrides the earlier "no milestones"):** Tegelwereld werkt, Levende open wereld, Verhaal Deel 4 en missies, Provincie leeft, Publiceren en 1.0, Afwerking en menu's. Never use version numbers as milestones. Repo rules live in AGENTS.md (constitution); CLAUDE.md just imports it.

**Decisions 2026-10-17:** 3D BAG for the whole province: YES (#2); manage disk smartly (user is near disk limits): stream per tile, extract heights only, delete raw downloads right after. Perf measurement (#4) optional, run whenever. Visual checks (#5): judge screenshots yourself and only bring open questions to the user. "Provincie-epic" = milestone "Tegelwereld werkt" (one world, old Ommeland way gone).

**Input van de eigenaar nodig:** wijs het issue aan NatusPella (de eigenaar) toe op GitHub met een duidelijke vraag in een comment (@NatusPella vraag: ...). Verwijder de toewijzing als de vraag beantwoord is.

**Kwaliteitsdoel (2026-10-17):** the PROVINCE must reach the CITY's level (quality, speed, loading, LOD); the city must NOT regress. Moving the city onto the tile pipeline (#90) needs a measured baseline, parity criteria per category and go/no-go thresholds; province is upgraded to city quality first, the city switches per layer behind flags.

**Metingen (2026-10-17):** the owner does NOT want heavy measuring/benchmark tooling. Keep verification light: before/after screenshots judged by Claude, existing audits/tests, a quick fps check. Don't build baseline harnesses with thresholds.
Measure/benchmark only reactively: when a performance issue is reported (issue or playtest), then investigate and measure; no proactive baselines.
Performance is checked at each release build (not per component): no before/after measurements per work item; at release do a quick fps/load sanity check.

**Testen (2026-10-18):** full suite, province_test, heavy audits and the Electron story test are run by the coordinator when making a RELEASE, not inside subagents. Subagents run only node --check and the few tests directly covering their change; never retry flaky timing tests (province_test decode p95) in loops. Only one heavy process at a time.
