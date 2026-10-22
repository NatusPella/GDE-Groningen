---
name: province-autonomy
description: 2026-10-15 user ordered to run ALL province phases (F0-F5 + LK1) autonomously without asking or waiting
metadata:
  type: project
---

On 2026-10-15 the user said: "Ga gewoon door en door totdat alles af is! Wacht niet op mij, vraag mij niks. Doorloop ALLE fasen!"

This covers docs/PROVINCIE-PLAN.md and PROVINCIE-VERHAAL.md: F0, LK1, F1 (go/no-go is mine to judge), F2, F3, F4a/b/c and F5.

**Decisions taken on the plan's advice (§7):**
- 1:1 scale.
- RD New, introduced through a P() helper.
- Download size: up to ~1 GB is fine (user 2026-10-15: "mag echt wel richting de GB"). Spend it on fidelity: AHN heights, 3D BAG roofs, textures, landmarks.
- A web version with streaming.
- Deel 4 "Nazomer"; the existing three parts stay unchanged.
- Gas extraction only as a quiet, respectful side line.
- Neighbouring regions only as a simple border.
- Rottum seen from the sea; Schiermonnikoog first as a cinematic.
- 3D BAG with attribution.
- The train can be driven by the player as a minigame, or ridden as a passenger (skippable).

**Why:** the user wants the whole province playable, a living world and the story spread across it.

**How to apply:**
- Keep about 3–4 agents busy.
- Merge each branch, run the full test round, then release a tested pre-release per finished phase without asking.
- Nothing public (repo visibility, Pages, posts) and no money.
- The history rewrite is done; agent branches based on 846c2fe6 need `git rebase --onto main 846c2fe6`.

See [[keep-momentum]], [[max-parallel-agents]] and [[release-and-publishing]].
- **Always summer:** the user said so on 2026-10-15. There is no season cycle; the weather varies within summer only, and Deel 4 is at most late summer.
- **Festivals:** summer ones only, on their real dates (Gronings Ontzet 28 Aug, kermis, harvest). Koningsdag is dropped (user, 2026-10-15). Carbid stays the existing activity.
- **Release before the limit:** the user said on 2026-10-15 to always have a working release before usage runs out. Release around 85–95% of the 5-hour or weekly limit; check with ccd_session_mgmt get_usage.
- **Decisions of 15 Oct (user):**
  - The solar time stays as is.
  - The invented calendar feast days stay (bloemetjesmarkt 12 Sep, suikercampagne 15 Sep, laatste zomerdag 22 Sep).
  - Rottum is forbidden nature; Schiermonnikoog is a cutscene.
  - **The whole province in one go**: after 0.32.0 go straight on with F2; no pause to polish city and corridor first.
  - NatusPella instead of the real name everywhere.
  - Release at about 90% of the 5-hour limit.
- **Feedback of Mathijs and Alexander (15 Oct):** triage in docs/FEEDBACK-MATHIJS.md.
  - **iWink:** a wink only (a fictional agency, nothing literal).
  - **Mining damage:** a fictional company, with care.
  - **Tessa feeling unsafe:** subtle social commentary, with verified real statistics.
