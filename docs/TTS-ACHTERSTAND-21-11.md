# TTS-achterstand 21-11: stand van de opnameronde

Stand 21-11 (16:35 tot 17:00): **geen enkele clip opgenomen**; de gateway weigerde elke aanvraag.

## Wat er is vastgesteld

- Gateway (`litellm.natuspella.nl`) is zelf gezond (`/health/readiness` geeft 200, db verbonden).
- `POST /v1/audio/speech` voor `google/gemini-3.8-flash-lite-tts` geeft steeds **HTTP 429**: "No deployments available for selected model ... All deployments for selected model are in cooldown ... Try again in 300 seconds."
- Vier proeven met 320 s tussenpoos (16:42, 16:48, 16:53, 16:58) gaven alle vier hetzelfde antwoord. De cooldown verloopt dus niet; waarschijnlijk is de bovenliggende quota van de gateway op (of andere processen houden hem in cooldown). Elke aanvraag kostte 0 dollar.
- Een eerdere proef met `tts_lines.py` (3 clips, `--rpm 4`) bleef in de ingebouwde cooldown-wachtlus hangen (2 x 310 s per clip) en is gestopt; er is niets weggeschreven.

## Wachtlijst na een verse `tts_lines_list.mjs`

- 474 opdrachten (voice_wacht.json heeft er nog 483: draai bij de volgende ronde `node scripts/tts_lines_list.mjs && node scripts/voice_wacht.mjs --write`).
- Per spreker: Anita 291 (211 lines + 80 hints), Tammo 136 (56 lines + 80 hints), Jelle Terpstra 31, Mem Terpstra 13, Durk 5, Berend Bos 2, Loketbediende 2, Oma Trijntje 1, Douwe 1, Ubbo 1 (sms).
- 9 Tammo-regels zijn GEBLOKKEERD: er is nog geen Groningse spreektekst voor in `scripts/gronings_spoken.json` (o.a. "Iemand uit Friesland. Dat was zijn oma.", de reishints). Eerst die tekst toevoegen, dan opnemen.
- Schatting alles: ca. 1977 s audio, ca. 0,30 dollar via litellm (lite-tts), ruim binnen het budget van 2,50.

## Voorgestelde volgorde voor de volgende ronde

1. Tammo (lines), Jelle, Mem, Oma Trijntje, Durk, Douwe, Berend, Loketbediende, Ubbo; daarna Anita; daarna de hints (sorteer de jobs en geef ze mee met `--jobs`).
2. `python scripts/tts_lines.py N --jobs <gesorteerde lijst> --budget 0.5 --rpm 4`; de nabewerking (`voice_tailfix`) zit al in `tts_lines.py`; controleer daarna met de ruis- en popdetectoren.
3. Daarna `voice_wacht.mjs --write` en `voice_coverage.mjs --quiet`.

Eerst één proefaanvraag doen; pas bij een 200 de volledige ronde starten.
