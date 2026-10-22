---
name: release-and-publishing
description: "Road to GTE VI 1.0: no paid fees, unsigned downloads, maybe a web version, nothing made public without explicit permission"
metadata:
  node_type: memory
  type: project
  originSessionId: db0f77d6-a25f-4120-b327-40ccf58600d2
  modified: 2026-10-03T07:12:19.094Z
---

**Decided with the user, 2026-10-03:**

- **Goal:** work together towards a 1.0.0 release.
- **No fees:**
  - no Apple or Windows signing certificates;
  - downloads stay unsigned, and the release notes say so (desktop/release.sh adds the note);
  - possibly also a browser version.
- **The repo is private.** It may go public around 1.0, but only with the user's explicit permission. That covers anything else made public too: visibility, Pages, itch, YouTube and posts. Watch the risks closely.
- **Free hosting once public:** GitHub Pages and Actions.
- **Commit author email:**
  - Replace the work email <werkadres> in history with the GitHub noreply 5644798+NatusPella@users.noreply.github.com. That is a history rewrite plus force push, so it needs the user's go and must wait until all agent branches are merged.
  - Since 2026-10-03, repo-local `user.email` is the noreply address. The global config is still the work email.
- **Legal:** tighten everything. All music and all voices are generated with Google Gemini (TTS via OpenRouter); the map is OSM (ODbL attribution needed); fonts are OFL; three.js is MIT. A legal audit runs on branch `claude/juridisch` (docs/LICENTIES.md, docs/PUBLICEREN.md).

**Why:** the user wants zero cost and no surprises in public.

**How to apply:** never push to a public place or change visibility without asking. Related: [[youtube-channel]], [[tts-billing-via-openrouter]].

**Update 2026-10-15:**
- **Licence decided:** code under GPL-3.0-or-later. Own content (voices, music, story, art) under CC BY-NC-SA 4.0. The name "GDE" and the logo stay all rights reserved.
- **GitHub repo description and topics are set.** All 35 releases are renamed to "GDE Groningen x.y.z"; the backup is in the session scratchpad release-backup/.
- **History audit:** `.claude/review/history-audit.md`. The rewrite covers the work email, the Esri satellite_reference.jpg, the TikTok Tammo references, the GTA messages and, optionally, old brand voice clips. It is still waiting for the user's go.
- **History rewritten 2026-10-15 (user approved):**
  - Author, committer and tagger are all NatusPella with the noreply address.
  - Removed: Esri photo, sikkom audio, old GTE VI icon, TikTok and real-person references, GTA wording in commit messages.
  - main and the tags are force-pushed. The mirror backup is in ~/GIT/gde-backup-2026-10-15.git.
  - Repo-local user.name is NatusPella. Agent branches based on the old main (846c2fe6) must be rebased onto the new main: `git rebase --onto main 846c2fe6 <branch>`.
- **Still open:** rotate the OpenRouter key (user), private vulnerability reporting (public repos only), going public (user decides).

**Platforms (2026-10-17):** from 0.34.1 on release WITHOUT `--linux`: macOS and Windows have priority, Linux is ignored for now (`npm run release -- minor|patch`). 0.34.0 was started with --linux already and is left running.
