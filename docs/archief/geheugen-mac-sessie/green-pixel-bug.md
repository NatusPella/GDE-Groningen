---
name: green-pixel-bug
description: "Open playtest bug (Maus, 5 Oct 2026): an occasional single green pixel on screen that lingers a while and then disappears"
metadata:
  type: project
---

Maus sometimes sees a green pixel in the game. It stays for a while, then goes away. Reported 2026-10-05, for later; not investigated yet. Not reproduced.

**Why:** possible causes to check later: a stuck pixel or dead-pixel artefact on the display, a GPU/driver glitch with the adaptive render scale, a one-pixel particle or decal (a green marker, minimap blip or waypoint) or a shader NaN/precision speck on integrated graphics. Ask Maus: which GPU and OS, which graphics preset and resolution scale, whether it is always at the same screen spot, and whether it is also visible in screenshots.

**How to apply:** when Maus's next playtest round comes up, ask those questions. If it is reproducible, check the adaptive resolution and the post-processing path (see [[max-parallel-agents]] for how to run heavy checks).
