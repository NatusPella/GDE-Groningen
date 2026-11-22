# TTS-opnamelijst #735: definitieve lijst van deze ronde

Gegenereerd door `node scripts/tts_opnamelijst.mjs` uit `game/storydata/script.json`, `scripts/tts_lines.json`, `scripts/gronings_spoken.json` en `scripts/tts_cast.mjs`. Niet met de hand aanpassen; draai `node scripts/tts_opnamelijst.mjs --check` om te zien of deze lijst achterloopt.

**Stand van deze bronnen:** 86 clips staan klaar in de wachtrij (`scripts/tts_lines.json`), 47 verhaalregels wachten nog (0 op een stemkeuze, 47 op een Groningse spreektekst). Samen **133 regels/clips**. De 37 bewust stille appjes (`channel: app-stil`) staan er niet op.

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
| 2 | M01.1 | Anita (Callirrhoe) | `lines/anita/hij_is_de_bisschop_die_de_stad_i_cd86ea13.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #2 |
| 3 | M03.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/verder_koop_ik_alle_standplaatse_b76335a1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #3 |
| 4 | M08.2 | Anita (Callirrhoe) | `lines/anita/dan_zijn_wij_een_fatbike_tammo_o_971d9387.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #4 |
| 5 | B2 | Tammo (Orus) | `lines/tammo/in_de_stad_hebben_we_de_martinit_440e8896.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #5 |
| 6 | M12.3 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/u_nadert_prive_luchtruim_mevrouw_da692130.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #6 |
| 7 | M12.4 | Anita (Callirrhoe) | `lines/anita/dan_weten_we_waar_we_vannacht_mo_3c8a35bc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #7 |
| 8 | M14.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_u_rijdt_te_hard_in_mijn__8f3aea30.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #8 |
| 9 | M14.3 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/durk_douwe_schrijf_op_de_sluis_w_89313b41.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #9 |
| 10 | T3 | Anita (Callirrhoe) | `lines/anita/let_op_de_trein_gaat_eerst_terug_71c6994d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #10 |
| 11 | M15.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/dat_is_waar_dat_is_hinderlijk_b535869b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #11 |
| 12 | M15.3 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/het_is_een_proeverij_wat_u_proef_a8749e71.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #12 |
| 13 | M16.3 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/botsauto_s_dat_was_mems_favoriet_e83eabf2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #13 |
| 14 | T4.1 | Berend Bos (Charon) | `lines/berend_bos/omdat_de_stad_te_klein_is_voor_e_5ea3b959.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #14 |
| 15 | B4 | Tammo (Orus) | `lines/tammo/dat_is_veendam_bijna_net_zo_groo_43a39943.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #15 |
| 16 | B4 | Anita (Callirrhoe) | `lines/anita/het_is_een_negende_van_de_stad_cda0d42d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #16 |
| 17 | F5 | Anita (Callirrhoe) | `lines/anita/vier_woorden_op_de_grote_markt_w_8794f0d9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #17 |
| 18 | Rondvaart-missie | Schipper Wiebe (megafoon) (Alnilam) | `lines/schipper_wiebe_megafoon/ik_ken_elke_brug_in_de_stad_jull_9e78d549.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #18 |
| 19 | Rondvaart (gids) | Tammo (gids) (Orus) | `lines/tammo_gids/welkom_aan_boord_we_varen_een_ro_f27d6e64.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #19 |
| 20 | Rondvaart (gids) | Tammo (gids) (Orus) | `lines/tammo_gids/dit_is_het_schuitendiep_hier_leg_de7554ec.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #20 |
| 21 | Rondvaart (gids) | Anita (Callirrhoe) | `lines/anita/de_stad_staat_erom_bekend_dat_de_7edc1155.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #21 |
| 22 | Rondvaart (gids) | Anita (Callirrhoe) | `lines/anita/hij_kreeg_de_stad_niet_op_28_aug_9e6f44de.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #22 |
| 23 | Rondvaart (gids) | Anita (Callirrhoe) | `lines/anita/rechts_de_praediniussingel_verno_404313b4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #23 |
| 24 | Rondvaart (gids) | Tammo (gids) (Orus) | `lines/tammo_gids/het_riviertje_heet_de_a_omdat_ze_4142736a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #24 |
| 25 | Rondvaart (gids) | Anita (Callirrhoe) | `lines/anita/in_de_stad_is_tijdelijk_een_rekb_64746405.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #25 |
| 26 | Rondvaart (gids) | Anita (Callirrhoe) | `lines/anita/daar_gaat_het_reitdiep_naar_het__81bd154a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #26 |
| 27 | Bijbaantjes (baas) | Verhuisbedrijf Van Kamer naar Kamer (Sadachbia) | `lines/verhuisbedrijf_van_kamer_naar_kamer/het_is_kei_week_half_nederland_z_9f97c6c7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #27 |
| 28 | Wijken & landschap (verteller) | Rikus (Schedar) | `lines/rikus/het_hart_van_de_stad_klopt_het_h_a1fd39a6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #28 |
| 29 | Wijken & landschap (verteller) | Rikus (Schedar) | `lines/rikus/de_zeeheldenbuurt_zeehelden_in_d_cb166a6e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #29 |
| 30 | Carrièrescènes (begin voetbal en Bezit) | Anita (Callirrhoe) | `lines/anita/tammo_ik_heb_een_lijstje_gemaakt_963cb15b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #30 |
| 31 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/dan_rolt_hij_door_ballen_kunnen__7c8bd70d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #31 |
| 32 | Carrièrescènes (begin voetbal en Bezit) | Anita (Callirrhoe) | `lines/anita/dat_is_geen_troost_f7e4d256.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #32 |
| 33 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/het_is_een_feit_troost_komt_na_a_abaf4e87.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #33 |
| 34 | Carrièrescènes (begin voetbal en Bezit) | Trainer Eppo (Alnilam) | `lines/trainer_eppo/jij_bent_de_nieuwe_je_staat_op_m_72237f44.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #34 |
| 35 | Carrièrescènes (begin voetbal en Bezit) | Anita (Callirrhoe) | `lines/anita/potlood_is_een_begin_8aa54126.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #35 |
| 36 | Carrièrescènes (begin voetbal en Bezit) | Trainer Eppo (Alnilam) | `lines/trainer_eppo/potlood_gaat_weg_met_een_gum_wel_3c072763.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #36 |
| 37 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/ik_ben_haar_zaakwaarnemer_ik_reg_6a335f99.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #37 |
| 38 | Carrièrescènes (begin voetbal en Bezit) | Trainer Eppo (Alnilam) | `lines/trainer_eppo/sinds_wanneer_e1da47fc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #38 |
| 39 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/sinds_vanochtend_half_negen_973f5ba1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #39 |
| 40 | Carrièrescènes (begin voetbal en Bezit) | Anita (Callirrhoe) | `lines/anita/hij_heeft_een_map_f3883695.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #40 |
| 41 | Carrièrescènes (begin voetbal en Bezit) | Trainer Eppo (Alnilam) | `lines/trainer_eppo/zit_er_ook_een_bal_in_4e83e9ab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #41 |
| 42 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/er_zit_een_contract_in_voor_als__c49236b3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #42 |
| 43 | Carrièrescènes (begin voetbal en Bezit) | Trainer Eppo (Alnilam) | `lines/trainer_eppo/de_club_wil_iemand_die_een_bal_k_7abbd86e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #43 |
| 44 | Carrièrescènes (begin voetbal en Bezit) | Anita (Callirrhoe) | `lines/anita/gestopt_binnen_de_lijn_ffd28dea.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #44 |
| 45 | Carrièrescènes (begin voetbal en Bezit) | Trainer Eppo (Alnilam) | `lines/trainer_eppo/mijn_vorige_linksbuiten_stopte_h_aae8b010.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #45 |
| 46 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/is_dat_een_compliment_2b4027c6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #46 |
| 47 | Carrièrescènes (begin voetbal en Bezit) | Trainer Eppo (Alnilam) | `lines/trainer_eppo/het_is_een_trainer_vijf_rondjes__58a403c7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #47 |
| 48 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/ik_ben_de_zaakwaarnemer_f018a6dc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #48 |
| 49 | Carrièrescènes (begin voetbal en Bezit) | Trainer Eppo (Alnilam) | `lines/trainer_eppo/dan_loopt_de_zaakwaarnemer_mee_z_c4223bb0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #49 |
| 50 | Carrièrescènes (begin voetbal en Bezit) | Anita (Callirrhoe) | `lines/anita/tammo_970a6793.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #50 |
| 51 | Carrièrescènes (begin voetbal en Bezit) | Anita (Callirrhoe) | `lines/anita/je_hoeft_niet_mee_te_rennen_1c5c818a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #51 |
| 52 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/ik_sta_bij_het_hek_waar_jij_het__6f887176.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #52 |
| 53 | Carrièrescènes (begin voetbal en Bezit) | Anita (Callirrhoe) | `lines/anita/dat_is_niet_slecht_voor_een_zaak_2599b4d4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #53 |
| 54 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/ik_heb_ook_een_map_adcb9566.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #54 |
| 55 | Carrièrescènes (begin voetbal en Bezit) | Trainer Eppo (Alnilam) | `lines/trainer_eppo/rennen_zaakwaarnemer_de_map_blij_f06378eb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #55 |
| 56 | Carrièrescènes (begin voetbal en Bezit) | Anita (Callirrhoe) | `lines/anita/hier_de_akte_met_stempel_en_al_a4ceb88c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #56 |
| 57 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/hij_is_zwaar_eacfa744.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #57 |
| 58 | Carrièrescènes (begin voetbal en Bezit) | Anita (Callirrhoe) | `lines/anita/het_is_papier_tammo_807882ed.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #58 |
| 59 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/het_is_een_perceel_dat_weegt_mee_489b68c0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #59 |
| 60 | Carrièrescènes (begin voetbal en Bezit) | Buurman Aldert (Enceladus) | `lines/buurman_aldert/moi_aldert_ik_woon_aan_de_overka_9dfd8cc4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #60 |
| 61 | Carrièrescènes (begin voetbal en Bezit) | Anita (Callirrhoe) | `lines/anita/tessa_en_dit_is_tammo_hij_heeft__f3cb16ea.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #61 |
| 62 | Carrièrescènes (begin voetbal en Bezit) | Buurman Aldert (Enceladus) | `lines/buurman_aldert/dat_is_het_zwaarste_werk_van_het_8299e3c6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #62 |
| 63 | Carrièrescènes (begin voetbal en Bezit) | Buurman Aldert (Enceladus) | `lines/buurman_aldert/mooie_grond_klei_die_houdt_het_w_53b10c09.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #63 |
| 64 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/ik_heb_geen_verstand_van_koeien_24b9c6ed.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #64 |
| 65 | Carrièrescènes (begin voetbal en Bezit) | Buurman Aldert (Enceladus) | `lines/buurman_aldert/een_koe_merkt_dat_meteen_c8ab94b0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #65 |
| 66 | Carrièrescènes (begin voetbal en Bezit) | Anita (Callirrhoe) | `lines/anita/beppe_had_koeien_jij_zat_er_elke_b1972e5f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #66 |
| 67 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/ik_zat_erbij_dat_is_niet_hetzelf_f5772141.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #67 |
| 68 | Carrièrescènes (begin voetbal en Bezit) | Anita (Callirrhoe) | `lines/anita/ze_zou_hier_een_bankje_neergezet_047e263d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #68 |
| 69 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/met_soep_3b379d63.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #69 |
| 70 | Carrièrescènes (begin voetbal en Bezit) | Buurman Aldert (Enceladus) | `lines/buurman_aldert/hier_de_sleutel_van_de_schuur_hi_4af0e894.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #70 |
| 71 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/ik_til_8d62b2db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #71 |
| 72 | Carrièrescènes (begin voetbal en Bezit) | Buurman Aldert (Enceladus) | `lines/buurman_aldert/mijn_trekker_staat_daar_die_moge_9168d561.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #72 |
| 73 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/is_er_een_handleiding_e2a80ce5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #73 |
| 74 | Carrièrescènes (begin voetbal en Bezit) | Buurman Aldert (Enceladus) | `lines/buurman_aldert/er_is_een_knop_links_44105287.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #74 |
| 75 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/welke_knop_0c02790f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #75 |
| 76 | Carrièrescènes (begin voetbal en Bezit) | Buurman Aldert (Enceladus) | `lines/buurman_aldert/die_doet_het_14bbb5cb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #76 |
| 77 | Carrièrescènes (begin voetbal en Bezit) | Anita (Callirrhoe) | `lines/anita/tammo_we_hebben_een_plekje_805b60e0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #77 |
| 78 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/een_plekje_09afc851.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #78 |
| 79 | Carrièrescènes (begin voetbal en Bezit) | Anita (Callirrhoe) | `lines/anita/ik_ben_blij_dat_we_dit_samen_doe_3b0be84e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #79 |
| 80 | Carrièrescènes (begin voetbal en Bezit) | Anita (Callirrhoe) | `lines/anita/is_dat_je_hele_antwoord_8399635f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #80 |
| 81 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/het_is_een_goed_woord_cb5882d3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #81 |
| 82 | Carrièrescènes (begin voetbal en Bezit) | Buurman Aldert (Enceladus) | `lines/buurman_aldert/ik_ga_koffie_halen_tot_morgen_ze_d689eb01.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #82 |
| 83 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/zes_uur_waarvoor_42ae6b11.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #83 |
| 84 | Carrièrescènes (begin voetbal en Bezit) | Buurman Aldert (Enceladus) | `lines/buurman_aldert/opstaan_een_perceel_heeft_geen_v_9b545f0b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #84 |
| 85 | Carrièrescènes (begin voetbal en Bezit) | Tammo (Orus) | `lines/tammo/het_is_zomer_ef8ea11b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #85 |
| 86 | Carrièrescènes (begin voetbal en Bezit) | Buurman Aldert (Enceladus) | `lines/buurman_aldert/daarom_8c03e5fe.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #86 |

De wachtrij heeft 86 clips (1 manifest(en): lines).

## 2. Wacht op een Groningse spreektekst of stemkeuze

| Stap | Reden | Regels |
|---|---|---|
| E | Groningse spreektekst ontbreekt | 1 |
| F1 | Groningse spreektekst ontbreekt | 2 |
| F3 | Groningse spreektekst ontbreekt | 1 |
| F4 | Groningse spreektekst ontbreekt | 1 |
| F5 | Groningse spreektekst ontbreekt | 1 |
| F6 | Groningse spreektekst ontbreekt | 2 |
| J1 | Groningse spreektekst ontbreekt | 1 |
| J3 | Groningse spreektekst ontbreekt | 2 |
| J4 | Groningse spreektekst ontbreekt | 1 |
| J6 | Groningse spreektekst ontbreekt | 1 |
| K1 | Groningse spreektekst ontbreekt | 1 |
| K2 | Groningse spreektekst ontbreekt | 2 |
| M00 | Groningse spreektekst ontbreekt | 1 |
| M02 | Groningse spreektekst ontbreekt | 4 |
| M03 | Groningse spreektekst ontbreekt | 1 |
| M04 | Groningse spreektekst ontbreekt | 1 |
| M05 | Groningse spreektekst ontbreekt | 1 |
| M07 | Groningse spreektekst ontbreekt | 1 |
| M10 | Groningse spreektekst ontbreekt | 1 |
| M11 | Groningse spreektekst ontbreekt | 1 |
| M12 | Groningse spreektekst ontbreekt | 1 |
| M14 | Groningse spreektekst ontbreekt | 1 |
| M17 | Groningse spreektekst ontbreekt | 1 |
| M19 | Groningse spreektekst ontbreekt | 1 |
| M20 | Groningse spreektekst ontbreekt | 1 |
| M23 | Groningse spreektekst ontbreekt | 1 |
| M26 | Groningse spreektekst ontbreekt | 1 |
| N10 | Groningse spreektekst ontbreekt | 1 |
| N12 | Groningse spreektekst ontbreekt | 1 |
| N2 | Groningse spreektekst ontbreekt | 1 |
| N4 | Groningse spreektekst ontbreekt | 1 |
| N5 | Groningse spreektekst ontbreekt | 1 |
| N9 | Groningse spreektekst ontbreekt | 1 |
| W1 | Groningse spreektekst ontbreekt | 5 |
| W2 | Groningse spreektekst ontbreekt | 2 |

Alle 47 regels staan met bron, spreker, stem en beoogde bestandsnaam in `TTS-OPNAMELIJST-735.jsonl` (status `stemkeuze` of `spreektekst`); die kunnen pas in de wachtrij als de stem of de spreektekst er is.

## 3. Technische laadhint (aparte beslissing)

De nieuwe laadhint `"De weg hier wordt nog geladen. Even wachten…"` staat bewust **niet** in de wachtrij: `scripts/voicelines_collect.mjs` zet hem in `TECH_HINTS` (een technische melding, geen stem). Het issue #735 noemt hier 2 clips (Tammo/Anita) voor. Wil de eigenaar die toch, dan is dat een aparte opname en een uitzondering in `TECH_HINTS`; deze lijst telt hem niet mee. (TECH_HINTS bevestigd in de bron.)

## 4. Wat de eigenaar daarna doet

1. `node scripts/tts_opnameronde.mjs --budget 2.5` (vraagt niets en leest geen sleutel; de TTS-module leest de eigenaar-sleutel zelf).
2. `node scripts/build_story_data.mjs` zet de opgenomen regels op voiced (de wrapper doet dit al).
3. `node scripts/voice_coverage.mjs --quiet` moet daarna zonder ontbrekende regels blijven.
4. Deze lijst verversen met `node scripts/tts_opnamelijst.mjs` en het issue #735 bijwerken met de nieuwe stand.

## 5. Verschil met #735

Het issue telt 670 regels/671 clips (67 klaar + 604 wachtend, plus de laadhint van 2 clips). De huidige bronnen geven 133 regels/clips: 86 klaar + 47 wachtend. Dat verschil komt doordat `script.json`, `gronings_spoken.json` en de opnames sinds 6-11 zijn bijgewerkt; deze lijst volgt de code, niet het issue.
