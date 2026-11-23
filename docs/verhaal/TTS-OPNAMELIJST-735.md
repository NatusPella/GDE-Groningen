# TTS-opnamelijst #735: definitieve lijst van deze ronde

Gegenereerd door `node scripts/tts_opnamelijst.mjs` uit `game/storydata/script.json`, `scripts/tts_lines.json`, `scripts/gronings_spoken.json` en `scripts/tts_cast.mjs`. Niet met de hand aanpassen; draai `node scripts/tts_opnamelijst.mjs --check` om te zien of deze lijst achterloopt.

**Stand van deze bronnen:** 64 clips staan klaar in de wachtrij (`scripts/tts_lines.json`), 0 verhaalregels wachten nog (0 op een stemkeuze, 0 op een Groningse spreektekst). Samen **64 regels/clips**. De 37 bewust stille appjes (`channel: app-stil`) staan er niet op.

> Het issue #735 noemt 670 regels/671 clips (stand 6-11-2026). De scripts zijn de bron: inmiddels zijn er regels bijgekomen of opgenomen, dus deze lijst telt wat de code nu zegt. Zie "Verschil met #735" onderaan.

## Route (LiteLLM, #689)

- Endpoint: `https://litellm.natuspella.nl/v1beta/interactions` (de gateway van de eigenaar; `LITELLM_BASE_URL` overschrijft het adres).
- Modelalias: `google/gemini-3.8-flash-lite-tts`; stem en stijl komen per regel uit de wachtrij.
- De sleutel staat **niet** in de repo: de eigenaar zet `LITELLM_API_KEY` in zijn eigen `.env` (gitignored, `GDE_ENV` wijst naar een andere plek) of in de omgeving. Deze lijst leest `.env` niet en print geen sleutel.
- Batchcommando (wat de runbook gebruikt): `python3 scripts/tts_lines.py --budget 2.5`; de exacte curl per regel staat in `TTS-OPNAMELIJST-735.jsonl` (kolom `curl`).

## 1. Klaar om op te nemen (in de wachtrij)

| # | Bron (scène) | Stem | Bestandsnaam | Commando |
|---|---|---|---|---|
| 1 | C00.2 | Anita (Callirrhoe) | `lines/anita/zonder_bank_blijft_er_e_e_n_weg__5844bb5d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #1 |
| 2 | C00.3 | Tammo (Orus) | `lines/tammo/honderdvijftig_euro_ik_heb_er_ac_292d241e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #2 |
| 3 | M01.1 | Anita (Callirrhoe) | `lines/anita/hij_is_de_bisschop_die_de_stad_i_cd86ea13.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #3 |
| 4 | M02.1 | Tammo (Orus) | `lines/tammo/ik_rij_rustig_met_alle_richtinga_fab65259.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #4 |
| 5 | M02.5 | Tammo (Orus) | `lines/tammo/fijn_die_nieuwe_band_van_henk_va_ac2cee4a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #5 |
| 6 | M02.5 | Tammo (Orus) | `lines/tammo/waarom_vraagt_jelle_naar_alarmen_2a3ad7a7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #6 |
| 7 | M02.5 | Tammo (Orus) | `lines/tammo/dan_eerst_het_loket_nummer_4140__7a74eacd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #7 |
| 8 | N2 | Tammo (Orus) | `lines/tammo/dat_is_de_buurman_hij_woont_hier_950e9484.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #8 |
| 9 | N4 | Tammo (Orus) | `lines/tammo/en_als_ik_de_verkeerde_kant_op_r_d0f6d62f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #9 |
| 10 | M03.1 | Tammo (Orus) | `lines/tammo/vierentwintig_mensen_dat_is_een__f42cbb70.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #10 |
| 11 | M03.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/verder_koop_ik_alle_standplaatse_b76335a1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #11 |
| 12 | M04.1 | Tammo (Orus) | `lines/tammo/en_waarom_jelle_in_augustus_een__77e1348b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #12 |
| 13 | M05.3 | Tammo (Orus) | `lines/tammo/eerst_wachten_daar_ben_ik_in_opg_ef930e84.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #13 |
| 14 | W1 | Tammo (Orus) | `lines/tammo/het_is_half_drie_c648280e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #14 |
| 15 | W1 | Tammo (Orus) | `lines/tammo/te_bleek_te_zout_goed_c21f82d5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #15 |
| 16 | W1 | Tammo (Orus) | `lines/tammo/in_een_pannetje_607f58e6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #16 |
| 17 | W1 | Tammo (Orus) | `lines/tammo/dan_rijd_ik_jij_bakt_ddab7c7a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #17 |
| 18 | W1 | Tammo (Orus) | `lines/tammo/naar_waar_ze_wakker_zijn_ffbb8292.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #18 |
| 19 | M07.1 | Tammo (Orus) | `lines/tammo/ee_n_klomp_voor_een_stad_vol_vet_addd967c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #19 |
| 20 | M08.2 | Anita (Callirrhoe) | `lines/anita/dan_zijn_wij_een_fatbike_tammo_o_971d9387.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #20 |
| 21 | N10 | Terrasgast (Erinome) | `lines/terrasgast/ik_bedoelde_de_rekening_samen_of_61fd50c2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #21 |
| 22 | N5 | Tammo (Orus) | `lines/tammo/de_koe_kijkt_weer_ze_kent_mijn_d_6067fcf1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #22 |
| 23 | N12 | Tammo (Orus) | `lines/tammo/daar_kan_ik_geen_bezwaar_tegen_m_6c98cd24.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #23 |
| 24 | M10.4 | Tammo (Orus) | `lines/tammo/of_hij_mist_haar_dat_is_ook_een__6c30bd8b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #24 |
| 25 | M11.6 | Tammo (Orus) | `lines/tammo/wie_appt_je_nou_weer_f6be9b31.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #25 |
| 26 | B2 | Tammo (Orus) | `lines/tammo/in_de_stad_hebben_we_de_martinit_440e8896.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #26 |
| 27 | K1 | Geesje (Pulcherrima) | `lines/geesje/nee_hij_hangt_er_al_veertig_jaar_653502a3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #27 |
| 28 | K2 | Tammo (Orus) | `lines/tammo/hoeveel_melk_je_in_je_koffie_doe_38ff886d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #28 |
| 29 | R3.0 | Rikus (Schedar) | `lines/rikus/ik_draai_een_plaat_een_lange_3b04e3a7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #29 |
| 30 | M12.3 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/u_nadert_prive_luchtruim_mevrouw_da692130.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #30 |
| 31 | M12.4 | Anita (Callirrhoe) | `lines/anita/dan_weten_we_waar_we_vannacht_mo_3c8a35bc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #31 |
| 32 | M12.4 | Dokter Dijkstra (Sadachbia) | `lines/dokter_dijkstra/jelle_is_geland_in_een_weiland_b_3ca57634.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #32 |
| 33 | J1 | Tammo (Orus) | `lines/tammo/dan_maken_wij_eerst_bezwaar_tege_93616713.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #33 |
| 34 | M14.2 | Tammo (Orus) | `lines/tammo/oogcontact_gemaakt_hij_gaf_voorr_59a6f295.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #34 |
| 35 | M14.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_u_rijdt_te_hard_in_mijn__8f3aea30.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #35 |
| 36 | M14.3 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/durk_douwe_schrijf_op_de_sluis_w_89313b41.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #36 |
| 37 | T3 | Anita (Callirrhoe) | `lines/anita/let_op_de_trein_gaat_eerst_terug_71c6994d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #37 |
| 38 | M15.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/dat_is_waar_dat_is_hinderlijk_b535869b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #38 |
| 39 | M15.3 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/het_is_een_proeverij_wat_u_proef_a8749e71.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #39 |
| 40 | M16.3 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/botsauto_s_dat_was_mems_favoriet_e83eabf2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #40 |
| 41 | J3 | Anneke (Achernar) | `lines/anneke/dit_kwam_gisteren_voor_jullie_al_73e7409c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #41 |
| 42 | J3 | Anneke (Achernar) | `lines/anneke/dat_was_niet_de_zin_waar_je_mee__715bdac6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #42 |
| 43 | W2 | Tammo (Orus) | `lines/tammo/zo_werkt_verkopen_niet_162c762f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #43 |
| 44 | W2 | Tammo (Orus) | `lines/tammo/waarom_een_foto_4cb6b71e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #44 |
| 45 | M17.3 | Tammo (Orus) | `lines/tammo/toeval_heeft_ook_een_server_en_e_1c58d23e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #45 |
| 46 | J4 | Femke (Leda) | `lines/femke/jullie_zijn_al_een_koor_dat_is_e_bf66ebb2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #46 |
| 47 | N9 | Tammo (Orus) | `lines/tammo/ik_kijk_naar_de_beer_hij_kijkt_t_a0e94892.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #47 |
| 48 | M19.3 | Berend Bos (Charon) | `lines/berend_bos/vanavond_komt_de_man_die_mijn_ba_cb51da28.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #48 |
| 49 | J6 | Tammo (Orus) | `lines/tammo/een_man_mag_naar_soep_lachen_4c92b678.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #49 |
| 50 | T4.1 | Berend Bos (Charon) | `lines/berend_bos/omdat_de_stad_te_klein_is_voor_e_5ea3b959.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #50 |
| 51 | M20.5 | Tammo (Orus) | `lines/tammo/tige_tank_foar_de_auto_j_hij_bed_4d242a35.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #51 |
| 52 | B4 | Tammo (Orus) | `lines/tammo/dat_is_veendam_bijna_net_zo_groo_43a39943.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #52 |
| 53 | B4 | Anita (Callirrhoe) | `lines/anita/het_is_een_negende_van_de_stad_cda0d42d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #53 |
| 54 | M23.4 | Tammo (Orus) | `lines/tammo/de_grootste_stoet_van_de_stad_me_b2e63acd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #54 |
| 55 | M26.15 | Tammo (Orus) | `lines/tammo/de_trekker_en_de_martinitoren_ki_57e609c7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #55 |
| 56 | E1 | Tammo (Orus) | `lines/tammo/vaste_klant_uitverkocht_voor_vie_d7602217.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #56 |
| 57 | F1 | Tammo (Orus) | `lines/tammo/naar_de_motor_die_ik_er_in_gedac_28cc8f17.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #57 |
| 58 | F1 | Tammo (Orus) | `lines/tammo/met_deze_aanhanger_492de6f3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #58 |
| 59 | F3 | Tammo (Orus) | `lines/tammo/ik_ben_het_niemandsland_met_soep_0042ce18.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #59 |
| 60 | F4 | Tammo (Orus) | `lines/tammo/ik_heb_erover_nagedacht_86c3baf8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #60 |
| 61 | F5 | Tammo (Orus) | `lines/tammo/berend_telde_elf_seconden_en_een_04b7a183.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #61 |
| 62 | F5 | Anita (Callirrhoe) | `lines/anita/vier_woorden_op_de_grote_markt_w_8794f0d9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #62 |
| 63 | F6 | Tammo (Orus) | `lines/tammo/ee_n_stip_maar_wel_de_onze_2a7c7de4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #63 |
| 64 | F6 | Tammo (Orus) | `lines/tammo/en_een_escapade_met_karakter_b63a9950.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #64 |

De wachtrij heeft 64 clips (1 manifest(en): lines).

## 2. Wacht op een Groningse spreektekst of stemkeuze

| Stap | Reden | Regels |
|---|---|---|

Alle 0 regels staan met bron, spreker, stem en beoogde bestandsnaam in `TTS-OPNAMELIJST-735.jsonl` (status `stemkeuze` of `spreektekst`); die kunnen pas in de wachtrij als de stem of de spreektekst er is.

## 3. Technische laadhint (aparte beslissing)

De nieuwe laadhint `"De weg hier wordt nog geladen. Even wachten…"` staat bewust **niet** in de wachtrij: `scripts/voicelines_collect.mjs` zet hem in `TECH_HINTS` (een technische melding, geen stem). Het issue #735 noemt hier 2 clips (Tammo/Anita) voor. Wil de eigenaar die toch, dan is dat een aparte opname en een uitzondering in `TECH_HINTS`; deze lijst telt hem niet mee. (TECH_HINTS bevestigd in de bron.)

## 4. Wat de eigenaar daarna doet

1. `node scripts/tts_opnameronde.mjs --budget 2.5` (vraagt niets en leest geen sleutel; de TTS-module leest de eigenaar-sleutel zelf).
2. `node scripts/build_story_data.mjs` zet de opgenomen regels op voiced (de wrapper doet dit al).
3. `node scripts/voice_coverage.mjs --quiet` moet daarna zonder ontbrekende regels blijven.
4. Deze lijst verversen met `node scripts/tts_opnamelijst.mjs` en het issue #735 bijwerken met de nieuwe stand.

## 5. Verschil met #735

Het issue telt 670 regels/671 clips (67 klaar + 604 wachtend, plus de laadhint van 2 clips). De huidige bronnen geven 64 regels/clips: 64 klaar + 0 wachtend. Dat verschil komt doordat `script.json`, `gronings_spoken.json` en de opnames sinds 6-11 zijn bijgewerkt; deze lijst volgt de code, niet het issue.
