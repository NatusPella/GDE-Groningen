---
name: handoff-0-34
description: State on 2026-10-17 when paused for a Claude restart: 0.34.0 release in progress, local main unpushed, one failing test to investigate
metadata:
  type: project
---

**Paused 2026-10-17 on user request (UI frozen).** No agents, tests or Electron running. Working tree clean.

Local `main` = 10b4c6f6 (NOT pushed; origin/main = 17073120). It contains all merged work: tile path default (#3 partial), water steps (#1), signposting (#73), cutscene LOD (#20), mini-fixes (#29 #32 #27 #40), research docs (#39 #38 #62 #60), #77 building clearance, #79 museum fix, findRoute fix (#81), story-test fixes, edge smoke test. Electron story test PASSED (30 steps, 0 failed) at df44d689 before the last merges.

**Open problem:** after merging #79 (10b4c6f6) `node scripts/junction_sim_test.mjs` fails 15/17 ("equal at 728,-2441" standstill 192 s, signals 10 hard crashes); it passes 17/17 at 36a91dff (after #77) and c4a92f42. The only diff 36a91dff..10b4c6f6 is the museum merge: game/citymap.json (my python re-serialisation patch of 5 buildings' parts/pitch; check it did not alter other data or number formatting; compare with `git diff 36a91dff 10b4c6f6 --stat`, maybe redo patch more surgically or check test nondeterminism by running the test 3x at 36a91dff), scripts/world/rebase_data.py, museum_placement_test, CHANGELOG. Also province_test has a timing-threshold flake ("decode p95") under load.

**To finish the release (in order):** 1) fix/explain junction_sim_test; 2) full test run (`for t in scripts/*_test.mjs`, voice_coverage, drive_audit expects 0 failed); 3) one Electron story test again (`cd desktop && npm run stage && GDE_TEST_PROFILE=gde-test-story-034 ./node_modules/.bin/electron . --windowed --story-test=<scratchpad>/st`, only one Electron, never port 9000/installed app); 4) turn CHANGELOG [Unreleased] into `## [0.34.0] - <date>` and commit; 5) push main; 6) `cd desktop && npm run release -- minor --linux` (clean tree needed); 7) update issues/board (close: #77 #79 #29 #32 #27 #40 if verified; comment others), unassign nothing else.

**Issues still to do after release:** #4 perf measurement, #5/#33/#34 visual checks via screenshots (Claude judges itself), #81 awaiting owner retest; #2 3D BAG download approved (manage disk smartly: ~20 GB free of 228, stream per tile, delete raw), #78 AHN, #8 via #78; many old worktrees in .claude/worktrees can be removed (git worktree remove) to free disk — branches stay.
Related: [[prioritering]], [[release-and-publishing]].

**UPDATE 2026-10-17 evening:** 0.34.0 RELEASED (pre-release, v0.34.0, mac+win+linux). Docs cleanup merged, worktrees removed. Owner decision: NO separate 0.34.1 patch release; release only AFTER the "Tegelwereld werkt" epic work is done (one release with #77 redo, #3 old layers removed, #1 old water removed, #2 3D BAG). Agents running in worktrees: #77 redo (a48cb18...), #2 BAG, #3 finish, #1 water finish. Always test with a REAL copy of desktop/vendor-cache in worktrees (symlinked vendor-cache changes sim results: junction_sim_test passed falsely). Release WITHOUT --linux. #81 awaits owner retest at Lauwersmeer.
