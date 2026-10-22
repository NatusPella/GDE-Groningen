---
name: tts-billing-via-openrouter
description: "User wants TTS paid from OpenRouter credits, as little as possible billed directly by Google"
metadata:
  node_type: memory
  type: feedback
  originSessionId: db0f77d6-a25f-4120-b327-40ccf58600d2
  modified: 2026-10-02T15:50:47.019Z
---

Run TTS generation through OpenRouter on its shared capacity so it is paid from the OpenRouter balance; keep direct Google (Gemini API key / BYOK) usage to a minimum and ask before spending there.

**Why:** the user has OpenRouter credit and does not want a second bill; Google's $300 Cloud trial does not cover the AI Studio Gemini API (since March 2026). Stated 2026-10-02.

**How to apply:** check `is_byok` on `/api/v1/generation?id=` after test runs; a `GEMINI_API_KEY` in the root `.env` exists for voice listing/design only. Related: [[gemini-38-tts-findings]].

**Budget is limited (2026-10-02):** the OpenRouter key has a $20 limit, of which $10.23 was left at 19:35; the account had $12.71. When it is gone, no more TTS can be recorded. Check `GET /api/v1/key` (`limit_remaining`) before and during big runs. Record lines in priority order: story-critical first, then missions, then banter. Never run sample rounds or experiments on the remaining budget without asking.

**NO TTS SPEND (2026-10-17):** spend nothing on TTS (OpenRouter/Gemini) until the owner explicitly says so. New or rewritten spoken lines stay text-only; list what would need recording plus a cost estimate instead. Agents must not run scripts/tts_* or any OpenRouter call.
