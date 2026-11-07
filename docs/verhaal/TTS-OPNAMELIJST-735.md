# TTS-opnamelijst #735: definitieve lijst van deze ronde

Gegenereerd door `node scripts/tts_opnamelijst.mjs` uit `game/storydata/script.json`, `scripts/tts_lines.json`, `scripts/gronings_spoken.json` en `scripts/tts_cast.mjs`. Niet met de hand aanpassen; draai `node scripts/tts_opnamelijst.mjs --check` om te zien of deze lijst achterloopt.

**Stand van deze bronnen:** 65 clips staan klaar in de wachtrij (`scripts/tts_lines.json`), 592 verhaalregels wachten nog (0 op een stemkeuze, 592 op een Groningse spreektekst). Samen **657 regels/clips**. De 37 bewust stille appjes (`channel: app-stil`) staan er niet op.

> Het issue #735 noemt 670 regels/671 clips (stand 6-11-2026). De scripts zijn de bron: inmiddels zijn er regels bijgekomen of opgenomen, dus deze lijst telt wat de code nu zegt. Zie "Verschil met #735" onderaan.

## Route (LiteLLM, #689)

- Endpoint: `https://litellm.natuspella.nl/v1beta/interactions` (de gateway van de eigenaar; `LITELLM_BASE_URL` overschrijft het adres).
- Modelalias: `google/gemini-3.8-flash-lite-tts`; stem en stijl komen per regel uit de wachtrij.
- De sleutel staat **niet** in de repo: de eigenaar zet `LITELLM_API_KEY` in zijn eigen `.env` (gitignored, `GDE_ENV` wijst naar een andere plek) of in de omgeving. Deze lijst leest `.env` niet en print geen sleutel.
- Batchcommando (wat de runbook gebruikt): `python3 scripts/tts_lines.py --budget 2.5`; de exacte curl per regel staat in `TTS-OPNAMELIJST-735.jsonl` (kolom `curl`).

## 1. Klaar om op te nemen (in de wachtrij)

| # | Bron (scène) | Stem | Bestandsnaam | Commando |
|---|---|---|---|---|
| 1 | M16.2 | Student (Puck) | `lines/student/ik_hou_van_jullie_allemaal_9b1c42a0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #1 |
| 2 | M20.5 | Anita (Callirrhoe) | `lines/anita/ik_wist_niet_waar_de_bal_lag_mem_24249717.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #2 |
| 3 | M26.2 | Anita (Callirrhoe) | `lines/anita/berend_dit_is_het_logboek_van_wi_120add6e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #3 |
| 4 | M26.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/een_notaris_gaat_boven_een_bissc_5215eb04.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #4 |
| 5 | M26.3 | Anita (Callirrhoe) | `lines/anita/dat_is_onze_korrel_zijn_bal_is_g_4d781432.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #5 |
| 6 | M26.3 | Durk (Algieba) | `lines/durk/douwe_de_kraam_3636ff04.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #6 |
| 7 | M26.3 | Douwe (Algenib) | `lines/douwe/de_kraam_c3e579aa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #7 |
| 8 | M26.3 | Durk (Algieba) | `lines/durk/wij_houden_hem_heel_baas_zegt_ne_74965931.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #8 |
| 9 | M26.3 | Anita (Callirrhoe) | `lines/anita/dank_je_durk_dank_je_douwe_1e33cd6c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #9 |
| 10 | M26.4 | Anita (Callirrhoe) | `lines/anita/de_fjord_frituur_is_breder_dan_d_9ae304de.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #10 |
| 11 | M26.4 | Anita (Callirrhoe) | `lines/anita/hij_fluit_61a5969f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #11 |
| 12 | M26.4 | Durk (Algieba) | `lines/durk/douwe_niet_aanraken_328dd420.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #12 |
| 13 | M26.4 | Anita (Callirrhoe) | `lines/anita/rook_links_de_fjord_blijft_staan_1929654d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #13 |
| 14 | M26.4 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_u_staat_op_de_openbare_w_b383d5f1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #14 |
| 15 | M26.4 | Anita (Callirrhoe) | `lines/anita/hij_houdt_de_koffer_weer_boven_w_c6f47e0d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #15 |
| 16 | M26.14 | Anita (Callirrhoe) | `lines/anita/dank_je_wubbo_5e278373.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #16 |
| 17 | M26.14 | Anita (Callirrhoe) | `lines/anita/dat_mag_niet_f9fb2a11.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #17 |
| 18 | M26.15 | Anita (Callirrhoe) | `lines/anita/je_trekker_past_er_net_in_cc59fdde.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #18 |
| 19 | M26.16 | Anita (Callirrhoe) | `lines/anita/je_zit_te_breien_aa9ec6b0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #19 |
| 20 | M26.5 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/jelle_geef_hem_aan_mij_eed08523.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #20 |
| 21 | M26.5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mem_de_notaris_sluit_2a097cf3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #21 |
| 22 | M26.5 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/dat_is_zijn_probleem_jij_bent_mi_2bbcf9c4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #22 |
| 23 | M26.5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/ja_mem_ac52508e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #23 |
| 24 | M26.5 | Anita (Callirrhoe) | `lines/anita/het_is_drie_uur_geweest_de_notar_61c078ec.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #24 |
| 25 | M26.6 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/ik_heb_vandaag_in_zijn_kraam_ges_28fcf35f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #25 |
| 26 | M26.10 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/vijf_van_de_vijf_mijn_juristen_w_02ce53b9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #26 |
| 27 | M26.12 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/drie_tegen_twee_mijn_juristen_wi_302eed48.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #27 |
| 28 | M26.13 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/zie_je_ik_had_het_niet_nodig_maa_0ab7f1db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #28 |
| 29 | M26.13 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/de_bal_gaat_terug_naar_het_museu_88560f88.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #29 |
| 30 | M26.13 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/de_standplaatsen_houd_ik_dat_is__3187547d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #30 |
| 31 | M26.13 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/dat_is_mijn_zoon_a0333c07.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #31 |
| 32 | M26.13 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/ja_mem_8c9a9a40.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #32 |
| 33 | M26.7 | Anita (Callirrhoe) | `lines/anita/dat_bedoelde_ik_ook_312ee50f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #33 |
| 34 | M26.8 | Anita (Callirrhoe) | `lines/anita/wij_komen_met_de_frituur_54eb6783.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #34 |
| 35 | M26.8 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/dan_stuur_ik_een_rekening_voor_h_fdc95351.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #35 |
| 36 | E1 | Anita (Callirrhoe) | `lines/anita/het_is_tweee_ntwintig_graden_59ab799b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #36 |
| 37 | M27.1 | Anita (Callirrhoe) | `lines/anita/hoe_lang_28f33768.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #37 |
| 38 | M27.1 | Anita (Callirrhoe) | `lines/anita/oma_zei_gewoon_dozen_4607867a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #38 |
| 39 | M27.2 | Anita (Callirrhoe) | `lines/anita/willemien_een_foto_twee_tieners__1431db82.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #39 |
| 40 | M27.3 | Anita (Callirrhoe) | `lines/anita/het_blijft_staan_0e6253d5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #40 |
| 41 | M29.1 | Anita (Callirrhoe) | `lines/anita/en_hij_staat_goed_7fc594b2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #41 |
| 42 | M29.2 | Anita (Callirrhoe) | `lines/anita/waar_hangt_de_foto_fec2a1e2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #42 |
| 43 | M29.2 | Anita (Callirrhoe) | `lines/anita/dansen_6b542be1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #43 |
| 44 | T5.1 | Anita (Callirrhoe) | `lines/anita/met_veertig_man_en_een_paard_van_aee98743.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #44 |
| 45 | T5.1 | Anita (Callirrhoe) | `lines/anita/hoe_het_is_om_te_winnen_fff4c93e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #45 |
| 46 | T5.2 | Anita (Callirrhoe) | `lines/anita/dan_beginnen_we_37ea2523.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #46 |
| 47 | M30.1 | Anita (Callirrhoe) | `lines/anita/vier_fronten_water_land_lucht_br_44fbab8c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #47 |
| 48 | M30.1 | Durk (Algieba) | `lines/durk/wij_zijn_de_stormram_wij_hebben__cfad9e66.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #48 |
| 49 | M30.1 | Douwe (Algenib) | `lines/douwe/tegen_3eee8776.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #49 |
| 50 | M30.1 | Anita (Callirrhoe) | `lines/anita/zeven_mensen_die_niet_weglopen_i_10630a02.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #50 |
| 51 | M30.1 | Anita (Callirrhoe) | `lines/anita/aanvallen_0adf8976.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #51 |
| 52 | M30.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/jelle_springt_altijd_met_polssto_8db28e35.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #52 |
| 53 | M30.2 | Anita (Callirrhoe) | `lines/anita/jelle_je_zou_niet_meedoen_edc0ca58.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #53 |
| 54 | M30.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/ik_doe_niet_mee_ik_spring_alleen_ccbc4295.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #54 |
| 55 | M30.2 | Anita (Callirrhoe) | `lines/anita/jelle_ligt_in_de_gracht_006f2cbd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #55 |
| 56 | M30.3 | Anita (Callirrhoe) | `lines/anita/hij_is_open_voor_we_toeterden_f4fca25b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #56 |
| 57 | M30.4 | Durk (Algieba) | `lines/durk/dat_kanon_is_van_karton_c7d36f12.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #57 |
| 58 | M30.4 | Douwe (Algenib) | `lines/douwe/karton_a8938285.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #58 |
| 59 | M30.4 | Durk (Algieba) | `lines/durk/dat_is_onze_specialiteit_469c691a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #59 |
| 60 | M30.4 | Anita (Callirrhoe) | `lines/anita/vlag_vlag_vlag_drie_0b54944f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #60 |
| 61 | M30.5 | Anita (Callirrhoe) | `lines/anita/het_is_open_berend_ca414520.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #61 |
| 62 | M30.5 | Anita (Callirrhoe) | `lines/anita/dat_is_winnen_berend_ba281f0d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #62 |
| 63 | M30.5 | Anita (Callirrhoe) | `lines/anita/hij_zegt_van_niet_de7dbd69.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #63 |
| 64 | M30.6 | Anita (Callirrhoe) | `lines/anita/elke_zomer_e_e_n_ronde_langs_de__8cc726ff.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #64 |
| 65 | M30.6 | Anita (Callirrhoe) | `lines/anita/zes_a69300f5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #65 |

De wachtrij heeft 65 clips (1 manifest(en): lines).

## 2. Wacht op een Groningse spreektekst of stemkeuze

| Stap | Reden | Regels |
|---|---|---|
| E | Groningse spreektekst ontbreekt | 10 |
| M00 | Groningse spreektekst ontbreekt | 8 |
| M01 | Groningse spreektekst ontbreekt | 14 |
| M02 | Groningse spreektekst ontbreekt | 9 |
| M03 | Groningse spreektekst ontbreekt | 22 |
| M04 | Groningse spreektekst ontbreekt | 7 |
| M05 | Groningse spreektekst ontbreekt | 10 |
| M06 | Groningse spreektekst ontbreekt | 17 |
| M07 | Groningse spreektekst ontbreekt | 6 |
| M08 | Groningse spreektekst ontbreekt | 9 |
| M09 | Groningse spreektekst ontbreekt | 19 |
| M10 | Groningse spreektekst ontbreekt | 6 |
| M11 | Groningse spreektekst ontbreekt | 42 |
| M12 | Groningse spreektekst ontbreekt | 13 |
| M13 | Groningse spreektekst ontbreekt | 20 |
| M14 | Groningse spreektekst ontbreekt | 11 |
| M15 | Groningse spreektekst ontbreekt | 18 |
| M16 | Groningse spreektekst ontbreekt | 23 |
| M17 | Groningse spreektekst ontbreekt | 21 |
| M18 | Groningse spreektekst ontbreekt | 26 |
| M19 | Groningse spreektekst ontbreekt | 15 |
| M20 | Groningse spreektekst ontbreekt | 25 |
| M21 | Groningse spreektekst ontbreekt | 29 |
| M22 | Groningse spreektekst ontbreekt | 28 |
| M23 | Groningse spreektekst ontbreekt | 24 |
| M24 | Groningse spreektekst ontbreekt | 3 |
| M25 | Groningse spreektekst ontbreekt | 12 |
| M26 | Groningse spreektekst ontbreekt | 40 |
| M27 | Groningse spreektekst ontbreekt | 13 |
| M28 | Groningse spreektekst ontbreekt | 12 |
| M29 | Groningse spreektekst ontbreekt | 12 |
| M30 | Groningse spreektekst ontbreekt | 31 |
| T1 | Groningse spreektekst ontbreekt | 2 |
| T2 | Groningse spreektekst ontbreekt | 3 |
| T3 | Groningse spreektekst ontbreekt | 4 |
| T4 | Groningse spreektekst ontbreekt | 19 |
| T5 | Groningse spreektekst ontbreekt | 9 |

Alle 592 regels staan met bron, spreker, stem en beoogde bestandsnaam in `TTS-OPNAMELIJST-735.jsonl` (status `stemkeuze` of `spreektekst`); die kunnen pas in de wachtrij als de stem of de spreektekst er is.

## 3. Technische laadhint (aparte beslissing)

De nieuwe laadhint `"De weg hier wordt nog geladen. Even wachten…"` staat bewust **niet** in de wachtrij: `scripts/voicelines_collect.mjs` zet hem in `TECH_HINTS` (een technische melding, geen stem). Het issue #735 noemt hier 2 clips (Tammo/Anita) voor. Wil de eigenaar die toch, dan is dat een aparte opname en een uitzondering in `TECH_HINTS`; deze lijst telt hem niet mee. (TECH_HINTS bevestigd in de bron.)

## 4. Wat de eigenaar daarna doet

1. `node scripts/tts_opnameronde.mjs --budget 2.5` (vraagt niets en leest geen sleutel; de TTS-module leest de eigenaar-sleutel zelf).
2. `node scripts/build_story_data.mjs` zet de opgenomen regels op voiced (de wrapper doet dit al).
3. `node scripts/voice_coverage.mjs --quiet` moet daarna zonder ontbrekende regels blijven.
4. Deze lijst verversen met `node scripts/tts_opnamelijst.mjs` en het issue #735 bijwerken met de nieuwe stand.

## 5. Verschil met #735

Het issue telt 670 regels/671 clips (67 klaar + 604 wachtend, plus de laadhint van 2 clips). De huidige bronnen geven 657 regels/clips: 65 klaar + 592 wachtend. Dat verschil komt doordat `script.json`, `gronings_spoken.json` en de opnames sinds 6-11 zijn bijgewerkt; deze lijst volgt de code, niet het issue.
