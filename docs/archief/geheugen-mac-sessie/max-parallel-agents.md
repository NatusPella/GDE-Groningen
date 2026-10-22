---
name: max-parallel-agents
description: "Parallel agents are OK, but heavy runs lag the user's own play; pause heavy work when the user plays"
metadata:
  node_type: memory
  type: feedback
  originSessionId: db0f77d6-a25f-4120-b327-40ccf58600d2
  modified: 2026-10-03T12:03:43.498Z
---

On 2026-10-02 the user said more than 3 agents at once is fine, and that testing should happen only when everything is done.

On 2026-10-03 the user was playing an old build and lost missions to lag from agent work: "mag wel iets minder tegelijk".

**Why:**
- The heavy load comes from agent runs, not from the number of agents: Electron perf runs, mesh_audit, headless Chrome and dev servers.
- On 2026-10-01, 5 agents running all of that pushed the load average to about 400.
- The Mac also carries Nextcloud's fileproviderd and Bitdefender.

**How to apply:**
- Default to about 3 agents.
- When the user says they're playing or testing:
  - pause the agents that do Electron, perf or audit work (commit WIP);
  - kill any stray dev Electron at `desktop/node_modules/electron`;
  - never touch the user's own "GTE VI.app" or "GDE Groningen.app";
  - keep at most one light agent doing edits only.
- Run heavy tests in one integrated round, not per agent.
- Never leave game pages running. See [[no-inapp-browser-game]].
