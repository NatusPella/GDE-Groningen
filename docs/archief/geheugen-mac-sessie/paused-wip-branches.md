---
name: paused-wip-branches
description: "GDE state 2026-10-04 evening: 0.26.1 released; agents running on Maus feedback; weekly budget cap ~75%; merge/test/release flow"
metadata:
  type: project
---

State on 2026-10-04, evening. The game is now "GDE Groningen – Zomer vol misdaad" (formerly GTE VI). Released v0.22.0 through v0.26.1 as GitHub pre-releases (mac, win, linux) via `cd desktop && npm run release -- minor|patch --linux`.

**Agent branches still running:** each gets merged from the main checkout with `git merge --no-ff <branch>`.
- `claude/maus-missies`: H6 clothes and heist, off-map cameras, Ommeland delivery, hideout, tanker decal, H11 toast, H16, H18, the H13 kiss on the boat roof, the fierljeppen Space focus bug.
- `claude/maus-wereld`, which includes sub-branch `claude/maus-ring`:
  - Ommeland: props and buildings on roads, collisions, delivery, parked and stealable cars, drivable tractors, field edges;
  - vehicle lights;
  - the "Ver" draw distance;
  - Space to climb out of the water.
- `claude/thuis-verhaal`: the garage shows all vehicles, the night wait happens at home, the EIKEA mission, two bedrooms.
- `claude/dialoog`: a natural-dialogue rewrite plus varied neighbourhood (wijk) lines, with a TTS budget of at most $2.60.
- `claude/aftiteling`: credits only play after all missions, post-game included.
- `claude/missie-voertuigen`: H9 needs a fast tuned car, vehicle requirements per mission, and Berend takes his car back after H1.
- `claude/cheats`: a pause-menu cheats section (map teleport plus modifiers, some unlockable).

**After merging:**
1. Run the full test round:
   - the node tests;
   - ring_probe, seat_audit, heli_sim and boat_edge_sim;
   - `zsh scripts/perf/geocheck.sh` (after `npm run stage`);
   - the Electron story test.
2. Write the changelog.
3. Ask the user, then release 0.27.0.

**Budget:** this run may use up to about 75–76% of the weekly limit; it was at 68% at 18:00 on 2026-10-04. Near 75%, stop starting agents and release what's done.

**Open user decisions:**
- Tammo's look: the proposal is a bucket hat and clean-shaven, to differ from TikTok Tammo (always a cap, beard, red Ford Escort).
- The Natalini tower.
- Licences: none beyond the required ones.
- Web hosting, Steam and hardware tests: later.
- The YouTube channel: waiting the 24 h.

See [[max-parallel-agents]], [[keep-momentum]] and [[release-and-publishing]].
