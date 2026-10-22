---
name: roadmap-on-github
description: The roadmap lives on the GitHub Project board (issues) as of 2026-10-16, continuous kanban, no milestones
metadata:
  type: project
---

The user decided on 2026-10-16 that **GitHub is the source of truth for the roadmap**.

- **Board:** https://github.com/users/NatusPella/projects/5 (project 5, owner NatusPella), issues in NatusPella/GDE-Groningen.
- **Columns (Status field):** Backlog, Volgende, Bezig, Review, Klaar. It is a continuous kanban: no version milestones. Releases bundle whatever is in Klaar.
- **Labels:** P0–P3 (priority), wereld, leven, minigame, verhaal, tech, ui, balans, stem, eigenaar (waits on the owner), provincie, autopilot (small tasks scripts/autopilot.sh may take from 'Volgende').
- docs/BACKLOG.md and ROADMAP.md point to the board; new wishes and bugs become issues, not doc edits.

**How to apply:** `gh project item-list 5 --owner NatusPella`; create issues with `gh issue create` and add them with `gh project item-add`. Move items with `gh project item-edit` (Status field). Needs gh scopes project and read:project (granted).

See [[province-autonomy]] and [[max-parallel-agents]].
