---
name: gemini-38-tts-findings
description: "How Gemini 3.8 TTS behaves via OpenRouter, and the casting choices made when the whole cast moved to it (2026-10-02)"
metadata:
  node_type: memory
  type: project
  originSessionId: db0f77d6-a25f-4120-b327-40ccf58600d2
  modified: 2026-10-02T16:49:55.197Z
---

On 2026-10-02 the whole cast was re-recorded on Gemini 3.8 Flash TTS (scripts/gemini_tts.py, scripts/tts_cast.mjs); about $2.70 from OpenRouter credits.

Non-obvious behaviour:
- 3.8 reads `input` verbatim, so a `[who, tag, accent] text` prompt gets spoken aloud. OpenRouter ignores `instructions`.
- Delivery only works via `provider.options["google-ai-studio"].speech_metadata.style`. It is not billed, and the limit via OpenRouter is about 22 KB.
- 3.8 is AI Studio-only on OpenRouter (no ZDR endpoint); the user turned ZDR off for it.
- Google's 33 Dutch library voices (`nl-nl-techagent-6`, …) pass through OpenRouter on shared capacity.
- Custom designed voices (`voice_…`) are tied to a Google project, so they would need BYOK, which Google bills. The `POST /v1beta/voices` body format was not found.

Casting chosen by ear:
- Tammo = Orus with an English "Gronings dialect" style on Flash. The user likes that it swaps in Gronings words ("Mien droom").
- Anita = Callirrhoe. Douwe and the taxi dispatcher = Algenib. Schipper Wiebe = Alnilam.
- The bark texts in tts_barks_lines.mjs were reconstructed from Whisper transcripts of the old WAVs; a few were rewritten.

Listening page: https://claude.ai/artifact/SvjH87bvatW4jMJgVNM29V

Related: [[tts-billing-via-openrouter]].
