---
name: no-inapp-browser-game
description: "Don't leave the game running in the in-app Browser pane; it wrecks performance on the user's Mac"
metadata:
  node_type: memory
  type: feedback
  originSessionId: db0f77d6-a25f-4120-b327-40ccf58600d2
  modified: 2026-10-03T06:55:18.748Z
---

Do not leave GTE VI open in the in-app Browser pane (mcp__Claude_Browser__*), and tell subagents the same. One open game page used about 480% CPU in the Claude renderer.

**Why:** the user said on 2026-10-03 that it ruins all performance on their Mac. It also slows the other agents and invalidates perf measurements.

**How to apply:**
- Prefer one short-lived headless Chrome over CDP, or Electron, for visual checks.
- If the pane is truly needed, take the shots and `preview_stop` the server right away.
- Before finishing, check that no game tab, dev server or headless Chrome is left running.
- Related: [[max-parallel-agents]].
