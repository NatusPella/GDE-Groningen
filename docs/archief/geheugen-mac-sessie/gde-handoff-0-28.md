---
name: gde-handoff-0-28
description: "Handoff state of GDE Groningen as of 2026-10-05 (v0.28.0 released): open items, pending decisions, conventions that the repo does not record"
metadata:
  type: project
---

State when the long session ended (2026-10-05). Check `git log` and `gh release list` first; this may be out of date.

**Released:** v0.28.0, a pre-release (unsigned, mac, win, linux), main pushed. The rating is 18+ (PEGI 18, `docs/LEEFTIJD.md`). The cheats section is called "Cheats", not "Streken". The Escape menu has no foldable frame any more; only the folded call/message cards remain. The T phone is gone. Voices speak Gronings by default, with subtitles in standard Dutch; the Frisian characters and the tourists keep their own language.

**Never played by hand yet (ask Maus to retest):** look-back (Q) in the Ommeland, GPS on Ommeland roads, stutter at "Heel ver" (900 m), the loud beep (the waypoint ping was the cause, only code-verified), the horse, the bus job, boat upgrades at the werf, the rewritten cow mission, jump/vault, the Cheats menu, Gronings voices (a native speaker has not checked the spelling).

**Open items:**
- Maus sees an occasional green pixel; see [[green-pixel-bug]].
- The Ommeland has no police spawns or roadblocks, grass drag applies only to the player, and bridges have no railings (`docs/OMMELAND-PARITEIT.md`).
- 9 unused voice clips from the removed Henk wait step; a few HUD texts still say "pauzemenu"; the Fjord Frituur shift pay on death was fixed, other post-game edge cases are untested.
- Dependabot: http-cache-semantics, dev-scope only, no patch available yet.
- Music: all new songs go on the radio only (G-Music, 20 songs now). Maus wants less happy-clappy. Prompts not yet made into songs: dark drill, post-punk, hardstyle/rawstyle, dark phonk, levenslied, smooth R&B, summer hit. To add a song: copy the mp3 to `game/audio/gmusic/`, add it to `manifest.json`, add the artist in `GMUSIC_ARTISTS` (`audio.js`), then `docs/MUZIEK.md` and the CHANGELOG, and run `scripts/music_pick_test.mjs`.
- Budget: OpenRouter credits about $5.6 left after the Gronings re-recording.

**Decisions still with the user:** Tammo's look (bucket hat and clean-shaven proposed), the Natalini tower, replacing the work email in git history (only on approval; the repo-local email is already the noreply address), the licence (none yet, code stays the owner's), the YouTube upload (private first, once the channel exists; trailers are in ~/Downloads, never in the repo).

**Workflow that worked:** agents in worktrees, each on its own branch from main (`git checkout -b <name> main`); I merge with `--no-ff` in the main checkout, run all `scripts/*_test.mjs` plus voice_coverage, ring_probe (0) and seat_audit, and clean up worktrees and branches afterwards. Before a release: `cd desktop && npm run stage`, `zsh scripts/perf/geocheck.sh`, one Electron story test under `nice`, then `npm run release -- minor|patch --linux` after the user says yes. Tests need `desktop/vendor-cache`, which a fresh worktree lacks (symlink it temporarily, never commit it).

**Why:** the user wants steady progress to 1.0 with few tokens, nothing public without permission, and no fees. See [[release-and-publishing]], [[keep-momentum]], [[max-parallel-agents]], [[no-inapp-browser-game]], [[tts-billing-via-openrouter]].
