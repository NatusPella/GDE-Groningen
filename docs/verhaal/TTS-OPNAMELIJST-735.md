# TTS-opnamelijst #735: definitieve lijst van deze ronde

Gegenereerd door `node scripts/tts_opnamelijst.mjs` uit `game/storydata/script.json`, `scripts/tts_lines.json`, `scripts/gronings_spoken.json` en `scripts/tts_cast.mjs`. Niet met de hand aanpassen; draai `node scripts/tts_opnamelijst.mjs --check` om te zien of deze lijst achterloopt.

**Stand van deze bronnen:** 10 clips staan klaar in de wachtrij (`scripts/tts_lines.json`), 20 verhaalregels wachten nog (0 op een stemkeuze, 20 op een Groningse spreektekst). Samen **30 regels/clips**. De 37 bewust stille appjes (`channel: app-stil`) staan er niet op.

> Het issue #735 noemt 670 regels/671 clips (stand 6-11-2026). De scripts zijn de bron: inmiddels zijn er regels bijgekomen of opgenomen, dus deze lijst telt wat de code nu zegt. Zie "Verschil met #735" onderaan.

## Route (LiteLLM, #689)

- Endpoint: `https://litellm.natuspella.nl/v1beta/interactions` (de gateway van de eigenaar; `LITELLM_BASE_URL` overschrijft het adres).
- Modelalias: `google/gemini-3.8-flash-lite-tts`; stem en stijl komen per regel uit de wachtrij.
- De sleutel staat **niet** in de repo: de eigenaar zet `LITELLM_API_KEY` in zijn eigen `.env` (gitignored, `GDE_ENV` wijst naar een andere plek) of in de omgeving. Deze lijst leest `.env` niet en print geen sleutel.
- Batchcommando (wat de runbook gebruikt): `python3 scripts/tts_lines.py --budget 2.5`; de exacte curl per regel staat in `TTS-OPNAMELIJST-735.jsonl` (kolom `curl`).

## 1. Klaar om op te nemen (in de wachtrij)

| # | Bron (scène) | Stem | Bestandsnaam | Commando |
|---|---|---|---|---|
| 1 | C00.2 | Anita (Callirrhoe) | `lines/anita/zonder_bank_blijft_er_e_e_n_weg__708a9e71.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #1 |
| 2 | C00.3 | Anita (Callirrhoe) | `lines/anita/eerst_geld_meedoen_aan_die_wedst_37697d43.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #2 |
| 3 | M01.1 | Anita (Callirrhoe) | `lines/anita/gronings_ontzet_tammo_elk_jaar_s_a2eee016.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #3 |
| 4 | M01.1 | Anita (Callirrhoe) | `lines/anita/vijftig_euro_van_berend_en_honde_945aef08.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #4 |
| 5 | M01.2 | Anita (Callirrhoe) | `lines/anita/honderdvijftig_euro_dat_is_preci_64087414.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #5 |
| 6 | M01.2 | Anita (Callirrhoe) | `lines/anita/zonder_krassen_want_het_is_beren_d45e6d6f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #6 |
| 7 | M01.2 | Anita (Callirrhoe) | `lines/anita/eerst_de_stunts_op_de_grote_mark_89f3ba03.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #7 |
| 8 | M01.6 | Anita (Callirrhoe) | `lines/anita/goud_tammo_van_berend_is_dat_een_45a474d5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #8 |
| 9 | M02.1 | Anita (Callirrhoe) | `lines/anita/ik_ken_iemand_die_opent_wat_niem_9d6d0b5c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #9 |
| 10 | M02.3 | Anita (Callirrhoe) | `lines/anita/het_museum_daar_staat_de_gouden__de7781d9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #10 |

De wachtrij heeft 10 clips (1 manifest(en): lines).

## 2. Wacht op een Groningse spreektekst of stemkeuze

| Stap | Reden | Regels |
|---|---|---|
| M09 | Groningse spreektekst ontbreekt | 10 |
| M12 | Groningse spreektekst ontbreekt | 2 |
| M21 | Groningse spreektekst ontbreekt | 1 |
| M23 | Groningse spreektekst ontbreekt | 3 |
| M26 | Groningse spreektekst ontbreekt | 2 |
| M30 | Groningse spreektekst ontbreekt | 2 |

Alle 20 regels staan met bron, spreker, stem en beoogde bestandsnaam in `TTS-OPNAMELIJST-735.jsonl` (status `stemkeuze` of `spreektekst`); die kunnen pas in de wachtrij als de stem of de spreektekst er is.

## 3. Technische laadhint (aparte beslissing)

De nieuwe laadhint `"De weg hier wordt nog geladen. Even wachten…"` staat bewust **niet** in de wachtrij: `scripts/voicelines_collect.mjs` zet hem in `TECH_HINTS` (een technische melding, geen stem). Het issue #735 noemt hier 2 clips (Tammo/Anita) voor. Wil de eigenaar die toch, dan is dat een aparte opname en een uitzondering in `TECH_HINTS`; deze lijst telt hem niet mee. (TECH_HINTS bevestigd in de bron.)

## 4. Wat de eigenaar daarna doet

1. `node scripts/tts_opnameronde.mjs --budget 2.5` (vraagt niets en leest geen sleutel; de TTS-module leest de eigenaar-sleutel zelf).
2. `node scripts/build_story_data.mjs` zet de opgenomen regels op voiced (de wrapper doet dit al).
3. `node scripts/voice_coverage.mjs --quiet` moet daarna zonder ontbrekende regels blijven.
4. Deze lijst verversen met `node scripts/tts_opnamelijst.mjs` en het issue #735 bijwerken met de nieuwe stand.

## 5. Verschil met #735

Het issue telt 670 regels/671 clips (67 klaar + 604 wachtend, plus de laadhint van 2 clips). De huidige bronnen geven 30 regels/clips: 10 klaar + 20 wachtend. Dat verschil komt doordat `script.json`, `gronings_spoken.json` en de opnames sinds 6-11 zijn bijgewerkt; deze lijst volgt de code, niet het issue.
