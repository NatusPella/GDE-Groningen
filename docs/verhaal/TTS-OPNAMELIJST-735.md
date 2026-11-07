# TTS-opnamelijst #735: definitieve lijst van deze ronde

Gegenereerd door `node scripts/tts_opnamelijst.mjs` uit `game/storydata/script.json`, `scripts/tts_lines.json`, `scripts/gronings_spoken.json` en `scripts/tts_cast.mjs`. Niet met de hand aanpassen; draai `node scripts/tts_opnamelijst.mjs --check` om te zien of deze lijst achterloopt.

**Stand van deze bronnen:** 528 clips staan klaar in de wachtrij (`scripts/tts_lines.json`), 20 verhaalregels wachten nog (0 op een stemkeuze, 20 op een Groningse spreektekst). Samen **548 regels/clips**. De 37 bewust stille appjes (`channel: app-stil`) staan er niet op.

> Het issue #735 noemt 670 regels/671 clips (stand 6-11-2026). De scripts zijn de bron: inmiddels zijn er regels bijgekomen of opgenomen, dus deze lijst telt wat de code nu zegt. Zie "Verschil met #735" onderaan.

## Route (LiteLLM, #689)

- Endpoint: `https://litellm.natuspella.nl/v1beta/interactions` (de gateway van de eigenaar; `LITELLM_BASE_URL` overschrijft het adres).
- Modelalias: `google/gemini-3.8-flash-lite-tts`; stem en stijl komen per regel uit de wachtrij.
- De sleutel staat **niet** in de repo: de eigenaar zet `LITELLM_API_KEY` in zijn eigen `.env` (gitignored, `GDE_ENV` wijst naar een andere plek) of in de omgeving. Deze lijst leest `.env` niet en print geen sleutel.
- Batchcommando (wat de runbook gebruikt): `python3 scripts/tts_lines.py --budget 2.5`; de exacte curl per regel staat in `TTS-OPNAMELIJST-735.jsonl` (kolom `curl`).

## 1. Klaar om op te nemen (in de wachtrij)

| # | Bron (scène) | Stem | Bestandsnaam | Commando |
|---|---|---|---|---|
| 1 | M01.4 | Tammo (Orus) | `lines/tammo/alleen_spullen_e1a27bfc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #1 |
| 2 | M01.4 | Berend Bos (Charon) | `lines/berend_bos/dat_klinkt_als_een_kras_met_een__3e1e4edb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #2 |
| 3 | M01.4 | Jelmer (Puck) | `lines/jelmer/chat_vindt_dat_niet_leuk_een_ter_21b381bf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #3 |
| 4 | M02.3 | Sjabbe (Rasalgethi) | `lines/sjabbe/netjes_de_automaat_is_vierhonder_7b531403.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #4 |
| 5 | M02.3 | Sjabbe (Rasalgethi) | `lines/sjabbe/dan_moet_je_groter_denken_die_tw_e4aa8f19.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #5 |
| 6 | M02.3 | Sjabbe (Rasalgethi) | `lines/sjabbe/hij_betaalt_alles_contant_uit_ee_a0b551f3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #6 |
| 7 | M02.3 | Tammo (Orus) | `lines/tammo/wat_wil_hij_b7780f76.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #7 |
| 8 | M02.3 | Sjabbe (Rasalgethi) | `lines/sjabbe/alles_wat_met_frituren_te_maken__44aa1c72.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #8 |
| 9 | M02.5 | Tammo (Orus) | `lines/tammo/waarom_vraagt_een_snackbaron_naa_af1a77dd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #9 |
| 10 | M02.5 | Tammo (Orus) | `lines/tammo/dan_eerst_het_loket_586dc693.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #10 |
| 11 | M03.1 | Loketbediende (Autonoe) | `lines/loketbediende/nummer_4117_aan_loket_a_op_het_s_6877c194.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #11 |
| 12 | M03.1 | Tammo (Orus) | `lines/tammo/vierentwintig_mensen_voor_ons_c0600d90.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #12 |
| 13 | M03.1 | Loketbediende (Autonoe) | `lines/loketbediende/formulier_7b_in_drievoud_niet_vo_e802f313.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #13 |
| 14 | M03.1 | Tammo (Orus) | `lines/tammo/wie_vouwt_er_nou_een_formulier_766cb8e6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #14 |
| 15 | M03.1 | Loketbediende (Autonoe) | `lines/loketbediende/loket_c_is_vandaag_een_stempel_l_47f96ccd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #15 |
| 16 | M03.1 | Sjabbe (Rasalgethi) | `lines/sjabbe/loket_c_heeft_een_zijdeur_bij_de_06d63d2e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #16 |
| 17 | M03.2 | Tammo (Orus) | `lines/tammo/hij_kocht_onze_plek_2804f9e7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #17 |
| 18 | M03.2 | Tammo (Orus) | `lines/tammo/wat_zei_hij_434c1260.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #18 |
| 19 | M03.2 | Mevrouw Hoving (Gacrux) | `lines/mevrouw_hoving/ik_bewaar_de_gouden_eierbal_de_w_71b6265f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #19 |
| 20 | M03.2 | Loketbediende (Autonoe) | `lines/loketbediende/is_de_bewaarder_er_niet_dan_zit__e86e6b85.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #20 |
| 21 | M03.2 | Mevrouw Hoving (Gacrux) | `lines/mevrouw_hoving/meneer_terpstra_heeft_de_vier_an_780373cc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #21 |
| 22 | M03.2 | Mevrouw Hoving (Gacrux) | `lines/mevrouw_hoving/berend_bos_bedankte_want_hij_hee_ab292105.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #22 |
| 23 | M03.2 | Mevrouw Hoving (Gacrux) | `lines/mevrouw_hoving/het_museum_de_koepel_hangt_sinds_451de35e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #23 |
| 24 | M03.3 | Loketbediende (Autonoe) | `lines/loketbediende/uw_formulier_is_gevouwen_ba449455.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #24 |
| 25 | M03.3 | Loketbediende (Autonoe) | `lines/loketbediende/dan_was_het_gisteren_ongevouwen_95859621.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #25 |
| 26 | M03.3 | Tammo (Orus) | `lines/tammo/ik_haal_de_stempel_bij_loket_b_90967942.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #26 |
| 27 | M03.3 | Loketbediende (Autonoe) | `lines/loketbediende/loket_b_is_nu_loket_a_e74726a9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #27 |
| 28 | M03.3 | Tammo (Orus) | `lines/tammo/een_draaimolen_50aa616d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #28 |
| 29 | M03.4 | Tammo (Orus) | `lines/tammo/wij_stelen_de_gouden_eierbal_e21fbc43.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #29 |
| 30 | M03.4 | Duivenmelker Bert (Iapetus) | `lines/duivenmelker_bert/tammo_bert_van_de_duiven_er_staa_fbff8ce8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #30 |
| 31 | M03.5 | Loketbediende (Autonoe) | `lines/loketbediende/weer_bij_ons_loket_b_is_nog_stee_4b5e6ba4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #31 |
| 32 | M04.1 | Tammo (Orus) | `lines/tammo/bert_was_de_beste_vriend_van_mij_511465b8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #32 |
| 33 | M04.1 | Tammo (Orus) | `lines/tammo/en_wat_jelle_daar_doet_75d4d09f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #33 |
| 34 | M04.2 | Sjabbe (Rasalgethi) | `lines/sjabbe/bewakers_zijn_goedkoper_dan_came_dfbe2d54.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #34 |
| 35 | M04.2 | Tammo (Orus) | `lines/tammo/een_fries_in_een_blauw_colbert_ec3b343a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #35 |
| 36 | M04.2 | Tammo (Orus) | `lines/tammo/ik_fotografeer_zijn_colbert_98f2bb3d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #36 |
| 37 | M04.3 | Tammo (Orus) | `lines/tammo/en_de_camera_s_fa8f8a92.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #37 |
| 38 | M04.3 | Tammo (Orus) | `lines/tammo/sjoerd_van_de_kiezelweek_die_fie_dc9fc08e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #38 |
| 39 | M05.1 | Sjoerd (Umbriel) | `lines/sjoerd/regels_zijn_regels_behalve_de_mi_fa5532df.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #39 |
| 40 | M06.2 | Tammo (Orus) | `lines/tammo/waarmee_96df2134.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #40 |
| 41 | M06.2 | Tammo (Orus) | `lines/tammo/een_compliment_5c8417fb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #41 |
| 42 | M06.2 | Tammo (Orus) | `lines/tammo/misschien_is_hij_ziek_298718e6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #42 |
| 43 | M06.2 | Tammo (Orus) | `lines/tammo/de_vitrine_daar_is_hij_b6ea8a4e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #43 |
| 44 | R1.3 | Rikus (Schedar) | `lines/rikus/er_is_iets_gestolen_dat_niemand__3d61f1cf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #44 |
| 45 | R1.3 | Rikus (Schedar) | `lines/rikus/de_politie_zoekt_twee_stadjers_i_ee4931b1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #45 |
| 46 | B1 | Tammo (Orus) | `lines/tammo/dat_is_de_krolbrug_hij_gaat_zo_o_cb4cc8f7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #46 |
| 47 | B1 | Tammo (Orus) | `lines/tammo/dat_is_de_kiekdeuse_8b44a83a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #47 |
| 48 | B1 | Tammo (Orus) | `lines/tammo/daar_gaat_tessa_de_wandelende_en_4e7e7a2b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #48 |
| 49 | B1 | Tammo (Orus) | `lines/tammo/dan_ken_je_het_slecht_04ba58d1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #49 |
| 50 | B1 | Tammo (Orus) | `lines/tammo/de_ring_daar_sta_ik_elke_dag_201234dc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #50 |
| 51 | B1 | Tammo (Orus) | `lines/tammo/ik_haat_omleidingen_1f85b581.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #51 |
| 52 | R2.0 | Rikus (Schedar) | `lines/rikus/kiekdoar_meldt_dat_er_geen_vet_m_8a9a3ff5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #52 |
| 53 | M07.1 | Tammo (Orus) | `lines/tammo/salamitactiek_plakje_voor_plakje_35d70adf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #53 |
| 54 | M07.1 | Tammo (Orus) | `lines/tammo/en_de_bal_89f6f954.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #54 |
| 55 | M07.2 | Tammo (Orus) | `lines/tammo/je_kunt_geen_weg_kopen_1f9993d9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #55 |
| 56 | M07.2 | Tammo (Orus) | `lines/tammo/dus_niet_remmen_b76607eb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #56 |
| 57 | M07.2 | Tammo (Orus) | `lines/tammo/ik_draai_als_een_tankwagen_4e47efe8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #57 |
| 58 | M07.5 | Snackbarhouder (Rasalgethi) | `lines/snackbarhouder/nog_een_tank_voor_jou_zet_ik_de__01ff543a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #58 |
| 59 | M08.1 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/tammo_kom_naar_de_noorderhaven_i_4aeca094.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #59 |
| 60 | M08.2 | Tammo (Orus) | `lines/tammo/een_fatbike_54cf4e6e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #60 |
| 61 | M08.2 | Tammo (Orus) | `lines/tammo/op_e_e_n_fatbike_467c5f31.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #61 |
| 62 | M08.2 | Tammo (Orus) | `lines/tammo/weer_die_twee_ce636589.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #62 |
| 63 | M08.3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/1953_dat_ik_won_weet_je_wat_je_n_73af94d7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #63 |
| 64 | M08.3 | Tammo (Orus) | `lines/tammo/foar_mem_mem_is_gerda_7d3c71b5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #64 |
| 65 | M08.3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/het_recept_van_1953_had_vijf_din_781665c0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #65 |
| 66 | M08.3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/ik_weet_waar_hij_was_in_een_vitr_23779b4c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #66 |
| 67 | M08.3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/eerst_geesje_in_warffum_zij_heef_126ffe64.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #67 |
| 68 | T1 | Tammo (Orus) | `lines/tammo/warffum_is_dat_nog_grunn_3d23cba4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #68 |
| 69 | T1 | Tammo (Orus) | `lines/tammo/je_zegt_joa_als_een_vraag_75d50a33.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #69 |
| 70 | M09.1 | Tammo (Orus) | `lines/tammo/ik_rij_nooit_rap_c5c23bf6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #70 |
| 71 | M09.1 | Tammo (Orus) | `lines/tammo/ee_n_keer_27983801.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #71 |
| 72 | M09.2 | Boer (Charon) | `lines/boer/een_eierkoek_per_week_levenslang_6e6f6b2c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #72 |
| 73 | M09.3 | Tammo (Orus) | `lines/tammo/die_koe_kijkt_naar_me_c5e74b11.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #73 |
| 74 | T2 | Buschauffeur (Alnilam) | `lines/buschauffeur/uitstappen_bij_de_haven_allemaal_d26a57dc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #74 |
| 75 | M11.1 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/van_trijntje_he_jullie_sliepen_o_52b1ef2f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #75 |
| 76 | M11.1 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/wil_je_weten_wat_de_vissers_hier_631ab274.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #76 |
| 77 | M11.1 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/het_is_een_val_maar_zolang_hij_n_23f1a568.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #77 |
| 78 | M11.1 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/hier_een_snelle_boot_ik_zit_bove_64b69863.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #78 |
| 79 | M11.1 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/praat_tegen_je_boot_mensen_dat_h_6cda3c19.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #79 |
| 80 | M11.1 | Tammo (Orus) | `lines/tammo/hij_luistert_niet_06c97fb8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #80 |
| 81 | M11.1 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/hij_luistert_wel_alleen_niet_naa_c9691042.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #81 |
| 82 | M11.2 | Tammo (Orus) | `lines/tammo/groter_dan_ik_dacht_f49a1364.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #82 |
| 83 | M11.2 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/niet_voorbij_de_sluizen_mensen_d_c8240d09.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #83 |
| 84 | M11.4 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/het_zout_van_oma_ligt_bij_noordp_79905095.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #84 |
| 85 | M11.4 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/een_zijl_is_een_sluis_die_denkt__1b817845.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #85 |
| 86 | M11.4 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/eerst_zit_je_een_uur_vast_op_een_e795d382.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #86 |
| 87 | M11.4 | Tammo (Orus) | `lines/tammo/waarom_zout_f44286ed.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #87 |
| 88 | M11.4 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/oma_s_eierbal_van_1953_had_zout__3ed887ed.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #88 |
| 89 | M11.5 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/wij_zitten_vast_mensen_dat_is_ge_f727ad2e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #89 |
| 90 | M11.5 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/kijk_omhoog_boven_het_lauwersmee_fb0ace45.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #90 |
| 91 | M11.5 | Tammo (Orus) | `lines/tammo/dat_zie_ik_9cea6af7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #91 |
| 92 | M11.5 | Tammo (Orus) | `lines/tammo/ik_dacht_dat_dat_een_vlek_was_39651b07.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #92 |
| 93 | M11.5 | Tammo (Orus) | `lines/tammo/groter_dan_een_vlek_14cfba4d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #93 |
| 94 | M11.6 | Tammo (Orus) | `lines/tammo/die_gaan_toch_niet_onder_020be8db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #94 |
| 95 | M11.6 | Tammo (Orus) | `lines/tammo/nog_steeds_lang_ee926ca9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #95 |
| 96 | M11.7 | Kustwachter (Achird) | `lines/kustwachter/kustwacht_melding_van_twee_mense_b7744970.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #96 |
| 97 | M11.7 | Tammo (Orus) | `lines/tammo/ik_ben_geen_schaap_f7287b65.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #97 |
| 98 | M11.7 | Tammo (Orus) | `lines/tammo/drie_emmers_zout_11fa3d13.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #98 |
| 99 | M11.7 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/nu_terug_mensen_het_water_denkt__3a744521.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #99 |
| 100 | M11.8 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/dat_zout_is_van_oma_jelle_kocht__5f985a10.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #100 |
| 101 | M11.8 | Dokter Dijkstra (Sadachbia) | `lines/dokter_dijkstra/dijkstra_van_het_umcg_het_zieken_24ea35b9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #101 |
| 102 | M11.8 | Dokter Dijkstra (Sadachbia) | `lines/dokter_dijkstra/morgen_vliegt_jelle_met_zijn_koo_847de15a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #102 |
| 103 | M11.8 | Dokter Dijkstra (Sadachbia) | `lines/dokter_dijkstra/ik_heb_een_heli_en_ik_haal_julli_d1361787.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #103 |
| 104 | M11.8 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/en_daarna_naar_de_eemshaven_dat__615acffe.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #104 |
| 105 | R2.3 | Rikus (Schedar) | `lines/rikus/het_plantsoenfestijn_opent_vanda_54ecb1c8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #105 |
| 106 | R2.3 | Rikus (Schedar) | `lines/rikus/het_festival_heeft_een_hoofdspon_79c93a92.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #106 |
| 107 | R2.3 | Rikus (Schedar) | `lines/rikus/storingsbericht_de_krolbrug_is_i_9f49956f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #107 |
| 108 | R2.3 | Rikus (Schedar) | `lines/rikus/de_torenwachter_belde_niet_dat_i_7278aee0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #108 |
| 109 | B2 | Tammo (Orus) | `lines/tammo/voor_honderd_mensen_a5bea9be.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #109 |
| 110 | M12.3 | Tammo (Orus) | `lines/tammo/de_aktetas_naast_jelle_6f616776.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #110 |
| 111 | M12.3 | Tammo (Orus) | `lines/tammo/doe_bist_schier_48033102.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #111 |
| 112 | M12.4 | Tammo (Orus) | `lines/tammo/en_het_laatste_plakje_a77081ab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #112 |
| 113 | M12.4 | Tammo (Orus) | `lines/tammo/container_4471_staat_bij_de_have_c70a4baf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #113 |
| 114 | M13.1 | Lammert (Iapetus) | `lines/lammert/hier_vaart_de_borkum_veerboot_en_bff67525.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #114 |
| 115 | M13.1 | Lammert (Iapetus) | `lines/lammert/mijn_vader_danste_in_1953_met_tr_df8e68a5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #115 |
| 116 | M13.1 | Tammo (Orus) | `lines/tammo/ee_n_container_tussen_alle_windm_8c652039.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #116 |
| 117 | M13.1 | Lammert (Iapetus) | `lines/lammert/wij_hebben_geen_containertermina_5bc1ae07.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #117 |
| 118 | M13.1 | Lammert (Iapetus) | `lines/lammert/hij_staat_onder_een_stapel_kabel_5af5424e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #118 |
| 119 | M13.1 | Tammo (Orus) | `lines/tammo/ze_zijn_bijna_allemaal_rood_42c24a9c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #119 |
| 120 | M13.1 | Lammert (Iapetus) | `lines/lammert/dan_moet_je_de_blauwe_zoeken_e4f9714a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #120 |
| 121 | M13.2 | Lammert (Iapetus) | `lines/lammert/de_kraan_piept_de_bewaker_kijkt__c50e579f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #121 |
| 122 | M13.2 | Tammo (Orus) | `lines/tammo/ik_beweeg_niet_bcbaa034.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #122 |
| 123 | M13.2 | Tammo (Orus) | `lines/tammo/niet_te_voorkomen_9b9a1c70.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #123 |
| 124 | M13.2 | Tammo (Orus) | `lines/tammo/ik_doe_mijn_best_7a77306d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #124 |
| 125 | M13.3 | Lammert (Iapetus) | `lines/lammert/het_schip_vaart_leeg_weg_jelle_k_c1b11b81.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #125 |
| 126 | M13.3 | Lammert (Iapetus) | `lines/lammert/mijn_vrachtwagen_brengt_alles_wa_fdfc897e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #126 |
| 127 | M13.3 | Lammert (Iapetus) | `lines/lammert/dit_vat_is_van_mijn_vader_het_ve_9d5f9733.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #127 |
| 128 | M13.3 | Lammert (Iapetus) | `lines/lammert/vanochtend_om_acht_uur_tekent_tr_9ae4b2db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #128 |
| 129 | M13.3 | Lammert (Iapetus) | `lines/lammert/jullie_slapen_in_mijn_havenkanto_9c76d262.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #129 |
| 130 | M13.3 | Tammo (Orus) | `lines/tammo/een_kantoor_1e9277d7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #130 |
| 131 | M13.3 | Lammert (Iapetus) | `lines/lammert/met_een_bed_twee_bedden_d0cad023.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #131 |
| 132 | M13.4 | Lammert (Iapetus) | `lines/lammert/de_bewaker_kijkt_nog_steeds_omho_09d45f91.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #132 |
| 133 | M14.1 | Tammo (Orus) | `lines/tammo/daar_heb_ik_niks_aan_decfc905.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #133 |
| 134 | M14.2 | Tammo (Orus) | `lines/tammo/ik_zie_het_3ab7a8cd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #134 |
| 135 | M14.2 | Tammo (Orus) | `lines/tammo/ik_trek_nooit_aan_het_stuur_34bbd078.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #135 |
| 136 | M14.3 | Lammert (Iapetus) | `lines/lammert/de_overdracht_is_getekend_om_vij_7cba0c35.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #136 |
| 137 | M14.3 | Deurwaarder (Rasalgethi) | `lines/deurwaarder/dat_is_nu_officieel_daar_kan_ik__e4518239.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #137 |
| 138 | M14.3 | Tammo (Orus) | `lines/tammo/je_ziet_er_goed_uit_met_wind_df9b09ab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #138 |
| 139 | M14.3 | Tammo (Orus) | `lines/tammo/dat_bedoelde_ik_niet_a36963e4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #139 |
| 140 | M14.3 | Tammo (Orus) | `lines/tammo/dat_bedoelde_ik_wel_d1cd904a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #140 |
| 141 | M14.3 | Tammo (Orus) | `lines/tammo/dat_is_de_wind_9e826567.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #141 |
| 142 | M15.1 | Roelfien (Laomedeia) | `lines/roelfien/trijntje_zei_dat_tammo_niks_kan__db83d077.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #142 |
| 143 | M15.1 | Roelfien (Laomedeia) | `lines/roelfien/dan_laten_we_de_hele_kermis_zien_287c0733.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #143 |
| 144 | M15.1 | Roelfien (Laomedeia) | `lines/roelfien/vlieg_laag_houd_de_molen_rechts__eafdb11e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #144 |
| 145 | M15.1 | Roelfien (Laomedeia) | `lines/roelfien/het_graan_staat_er_nog_dat_wacht_2b91b9c6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #145 |
| 146 | M15.1 | Tammo (Orus) | `lines/tammo/ik_heb_nog_nooit_gevlogen_b30da04a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #146 |
| 147 | M15.1 | Tammo (Orus) | `lines/tammo/dat_telt_niet_ba4cc238.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #147 |
| 148 | M15.2 | Tammo (Orus) | `lines/tammo/links_rechts_links_ba937a6e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #148 |
| 149 | M15.2 | Roelfien (Laomedeia) | `lines/roelfien/het_spandoek_staat_recht_ze_leze_b66d7258.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #149 |
| 150 | M15.2 | Tammo (Orus) | `lines/tammo/het_staat_goed_c839175c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #150 |
| 151 | M15.3 | Jurylid (Umbriel) | `lines/jurylid/is_dit_waar_jelle_koopt_de_jury_6e50e740.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #151 |
| 152 | M15.3 | Jurylid (Umbriel) | `lines/jurylid/ik_stap_eruit_239df8a4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #152 |
| 153 | M15.3 | Jurylid (Umbriel) | `lines/jurylid/ik_ook_dc81d597.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #153 |
| 154 | M15.3 | Roelfien (Laomedeia) | `lines/roelfien/twee_van_de_vier_andere_jurylede_f61435a7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #154 |
| 155 | M15.3 | Roelfien (Laomedeia) | `lines/roelfien/de_molen_in_midwolda_is_van_jell_0eb029fe.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #155 |
| 156 | M15.3 | Roelfien (Laomedeia) | `lines/roelfien/oma_s_recept_lust_grof_hier_is_h_0d723180.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #156 |
| 157 | M15.3 | Tammo (Orus) | `lines/tammo/dank_je_roelfien_909dd021.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #157 |
| 158 | M15.3 | Roelfien (Laomedeia) | `lines/roelfien/doe_de_groeten_aan_trijntje_en_z_a3385384.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #158 |
| 159 | M15.4 | Roelfien (Laomedeia) | `lines/roelfien/het_spandoek_is_gewassen_het_gra_c272d76b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #159 |
| 160 | M16.1 | Geert (Zubenelgenubi) | `lines/geert/moi_geert_van_de_poelestraat_er__3b286420.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #160 |
| 161 | M16.1 | Geert (Zubenelgenubi) | `lines/geert/en_tessa_mijn_nieuwe_barman_wil__52d0b029.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #161 |
| 162 | M16.1 | Tammo (Orus) | `lines/tammo/ik_drink_maar_e_e_n_ac2a7f7c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #162 |
| 163 | M16.2 | Student (Puck) | `lines/student/proost_nog_eentje_dan_8e34dafc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #163 |
| 164 | M16.2 | Tammo (Orus) | `lines/tammo/een_eerstejaars_ze_zijn_overal_7f999e11.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #164 |
| 165 | M16.2 | Tammo (Orus) | `lines/tammo/dat_geloof_ik_7167b2d1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #165 |
| 166 | M16.4 | Tammo (Orus) | `lines/tammo/links_tessa_links_e2e86bcf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #166 |
| 167 | M16.4 | Tammo (Orus) | `lines/tammo/dat_deel_kan_ik_1a871e51.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #167 |
| 168 | M16.4 | Kermisexploitant (Erinome) | `lines/kermisexploitant/eruit_hier_wordt_gebotst_niet_ge_eb79ce54.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #168 |
| 169 | M16.4 | Tammo (Orus) | `lines/tammo/au_2499c834.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #169 |
| 170 | M16.5 | Tammo (Orus) | `lines/tammo/dan_pakken_we_hem_in_veendam_5ce9b4dc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #170 |
| 171 | M16.6 | Tammo (Orus) | `lines/tammo/in_de_botsauto_mocht_ik_niet_stu_c8a41b33.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #171 |
| 172 | M16.7 | Geert (Zubenelgenubi) | `lines/geert/drie_tenten_nog_eentje_dan_4b538120.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #172 |
| 173 | R3.3 | Rikus (Schedar) | `lines/rikus/zondag_het_is_stil_in_winschoten_b0f1c73b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #173 |
| 174 | B3 | Tammo (Orus) | `lines/tammo/wat_draait_daar_84103f1b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #174 |
| 175 | B3 | Tammo (Orus) | `lines/tammo/dan_is_het_een_grote_molen_8568dbd0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #175 |
| 176 | B3 | Tammo (Orus) | `lines/tammo/wel_1d98e767.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #176 |
| 177 | B3 | Tammo (Orus) | `lines/tammo/keukens_75178e14.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #177 |
| 178 | B3 | Tammo (Orus) | `lines/tammo/een_tante_van_mij_kookte_erin_ze_030c6fcd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #178 |
| 179 | B3 | Tammo (Orus) | `lines/tammo/dan_zet_ik_mijn_friteuse_daar_9f65225e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #179 |
| 180 | B3 | Tammo (Orus) | `lines/tammo/de_dollard_een_bocht_in_de_zee_f8eb40bc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #180 |
| 181 | B3 | Tammo (Orus) | `lines/tammo/een_bocht_met_ambitie_8acfa9c2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #181 |
| 182 | B3 | Tammo (Orus) | `lines/tammo/jij_ook_niet_421865b6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #182 |
| 183 | M17.1 | Wubbo (Sadaltager) | `lines/wubbo/open_of_dicht_nooit_allebei_dat__56ff3342.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #183 |
| 184 | M17.1 | Wubbo (Sadaltager) | `lines/wubbo/vaar_jij_voor_zijn_schip_uit_dan_47167daf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #184 |
| 185 | M17.1 | Tammo (Orus) | `lines/tammo/hoe_weten_we_wanneer_c974b6a0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #185 |
| 186 | M17.1 | Wubbo (Sadaltager) | `lines/wubbo/elf_bruggen_toeter_bij_een_geslo_622357f2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #186 |
| 187 | M17.1 | Wubbo (Sadaltager) | `lines/wubbo/mijn_brug_is_op_tijd_laat_je_boo_0a261efd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #187 |
| 188 | M17.1 | Tammo (Orus) | `lines/tammo/tessa_even_over_zaterdag_in_de_b_1e8df217.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #188 |
| 189 | M17.2 | Wubbo (Sadaltager) | `lines/wubbo/de_fanfare_is_vertrokken_iemand__e521d1c0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #189 |
| 190 | M17.2 | Wubbo (Sadaltager) | `lines/wubbo/ik_fluit_ee_n_keer_fluiten_is_op_7ea6136c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #190 |
| 191 | M17.2 | Tammo (Orus) | `lines/tammo/fluiten_kan_ik_5d0c0235.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #191 |
| 192 | M17.2 | Wubbo (Sadaltager) | `lines/wubbo/brug_acht_open_nu_f9253f5b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #192 |
| 193 | M17.2 | Tammo (Orus) | `lines/tammo/ik_zie_alleen_een_brug_321db361.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #193 |
| 194 | M17.2 | Wubbo (Sadaltager) | `lines/wubbo/brug_negen_dicht_nog_niet_6b842d9a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #194 |
| 195 | M17.2 | Tammo (Orus) | `lines/tammo/dicht_nu_0c9a050a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #195 |
| 196 | M17.2 | Wubbo (Sadaltager) | `lines/wubbo/nu_pas_db79196d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #196 |
| 197 | M17.3 | Tammo (Orus) | `lines/tammo/de_limo_met_de_koffer_cf755dc4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #197 |
| 198 | M17.3 | Wubbo (Sadaltager) | `lines/wubbo/die_brug_draait_niet_voor_een_li_4d9b700d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #198 |
| 199 | M17.3 | Wubbo (Sadaltager) | `lines/wubbo/het_schip_zit_vast_de_mosterd_is_dd2c6a77.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #199 |
| 200 | M17.3 | Wubbo (Sadaltager) | `lines/wubbo/er_is_een_webbureau_in_veendam_d_20e48118.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #200 |
| 201 | M17.3 | Tammo (Orus) | `lines/tammo/om_middernacht_net_als_de_museum_179e51ac.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #201 |
| 202 | M17.3 | Tammo (Orus) | `lines/tammo/dat_moeten_we_weten_1c58bbfb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #202 |
| 203 | M17.4 | Wubbo (Sadaltager) | `lines/wubbo/weer_elf_bruggen_open_dicht_ik_h_d229550b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #203 |
| 204 | M18.1 | Tammo (Orus) | `lines/tammo/wiebelwerk_websites_met_karakter_895abfbf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #204 |
| 205 | M18.1 | Tammo (Orus) | `lines/tammo/wie_de_camera_s_uitzet_heeft_de__dc0ff2b1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #205 |
| 206 | M18.1 | Sjabbe (Rasalgethi) | `lines/sjabbe/wiebelwerk_daar_liet_ik_mijn_web_3c8b0599.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #206 |
| 207 | M18.1 | Accountmanager (Zubenelgenubi) | `lines/accountmanager/welkom_bij_wiebelwerk_wij_maken__26db633d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #207 |
| 208 | M18.1 | Accountmanager (Zubenelgenubi) | `lines/accountmanager/prachtig_dan_beginnen_we_met_een_7abc40ae.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #208 |
| 209 | M18.2 | Accountmanager (Zubenelgenubi) | `lines/accountmanager/warm_droog_en_een_beetje_groning_5c89903e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #209 |
| 210 | M18.2 | Accountmanager (Zubenelgenubi) | `lines/accountmanager/ik_maak_een_offerte_dat_duurt_ee_9d2d10d1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #210 |
| 211 | M18.2 | Accountmanager (Zubenelgenubi) | `lines/accountmanager/de_serverkamer_is_niet_voor_klan_fccfc380.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #211 |
| 212 | M18.2 | Tammo (Orus) | `lines/tammo/dat_ging_makkelijk_9b6f57c0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #212 |
| 213 | M18.6 | Accountmanager (Zubenelgenubi) | `lines/accountmanager/interessant_bijna_alle_antwoorde_fa17ff0c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #213 |
| 214 | M18.6 | Accountmanager (Zubenelgenubi) | `lines/accountmanager/iedereen_is_nieuw_bij_een_intake_2da88382.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #214 |
| 215 | M18.6 | Tammo (Orus) | `lines/tammo/die_staat_bij_de_serverdeur_377a6c89.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #215 |
| 216 | M18.6 | Accountmanager (Zubenelgenubi) | `lines/accountmanager/dan_is_dat_uw_route_e168102f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #216 |
| 217 | M18.7 | Accountmanager (Zubenelgenubi) | `lines/accountmanager/twee_antwoorden_die_geen_klant_g_06ef0c66.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #217 |
| 218 | M18.7 | Tammo (Orus) | `lines/tammo/is_dat_gratis_cf2f6f86.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #218 |
| 219 | M18.7 | Accountmanager (Zubenelgenubi) | `lines/accountmanager/bij_wiebelwerk_is_alles_gratis_b_5832b5ff.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #219 |
| 220 | M18.3 | Tammo (Orus) | `lines/tammo/de_update_altijd_om_middernacht__4a805caa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #220 |
| 221 | M18.3 | Tammo (Orus) | `lines/tammo/jelle_2a43911c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #221 |
| 222 | M18.3 | Tammo (Orus) | `lines/tammo/de_bewaker_met_het_koekje_en_twe_4480a4e0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #222 |
| 223 | M18.3 | Tammo (Orus) | `lines/tammo/de_toegangspas_van_mevrouw_hovin_ad5082d0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #223 |
| 224 | M18.3 | Tammo (Orus) | `lines/tammo/dus_wij_kraakten_een_leeg_museum_9013140a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #224 |
| 225 | M18.3 | Tammo (Orus) | `lines/tammo/waarvoor_656aeb78.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #225 |
| 226 | M18.4 | Accountmanager (Zubenelgenubi) | `lines/accountmanager/wiebelwerk_doet_niets_verkeerds__a53a26c0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #226 |
| 227 | M18.4 | Tammo (Orus) | `lines/tammo/een_alibi_5ea15927.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #227 |
| 228 | M18.4 | Tammo (Orus) | `lines/tammo/dan_is_het_niet_wiebelwerk_9a501059.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #228 |
| 229 | M18.5 | Accountmanager (Zubenelgenubi) | `lines/accountmanager/nog_een_intake_de_koffie_is_nog__4c2f15ce.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #229 |
| 230 | M19.1 | Tammo (Orus) | `lines/tammo/wie_rijdt_hem_dan_266b6c9a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #230 |
| 231 | M19.1 | Tammo (Orus) | `lines/tammo/ik_heb_nog_nooit_een_trein_bestu_b095c311.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #231 |
| 232 | M19.1 | Tammo (Orus) | `lines/tammo/vergelijkbaar_e4a5539b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #232 |
| 233 | M19.2 | Tammo (Orus) | `lines/tammo/dit_is_de_rem_4f5950ae.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #233 |
| 234 | M19.2 | Tammo (Orus) | `lines/tammo/dit_is_gas_f8099f9d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #234 |
| 235 | M19.2 | Tammo (Orus) | `lines/tammo/die_ook_2f0b6966.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #235 |
| 236 | M19.2 | Jurylid (Umbriel) | `lines/jurylid/heerlijk_wie_is_die_mevrouw_924e579a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #236 |
| 237 | M19.2 | Jurylid (Umbriel) | `lines/jurylid/dat_is_toch_niet_waar_94a58e73.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #237 |
| 238 | M19.3 | Jurylid (Umbriel) | `lines/jurylid/ik_stap_hier_uit_ik_laat_me_niet_dc7121d1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #238 |
| 239 | M19.3 | Jurylid (Umbriel) | `lines/jurylid/ik_niet_ik_heb_een_contract_leve_c202a0e9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #239 |
| 240 | M19.3 | Mevrouw Hoving (Gacrux) | `lines/mevrouw_hoving/ik_stap_niet_uit_ik_blijf_in_de__c816136d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #240 |
| 241 | M19.3 | Tammo (Orus) | `lines/tammo/vier_van_de_vijf_staan_niet_meer_c8172386.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #241 |
| 242 | M19.3 | Tammo (Orus) | `lines/tammo/ik_heb_een_trein_bestuurd_3dd674eb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #242 |
| 243 | M19.3 | Berend Bos (Charon) | `lines/berend_bos/goidag_die_man_in_dat_blauwe_col_76ea8f37.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #243 |
| 244 | M19.3 | Berend Bos (Charon) | `lines/berend_bos/dinsdag_komt_hij_naar_het_beleg__ce406160.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #244 |
| 245 | T4.1 | Berend Bos (Charon) | `lines/berend_bos/goidag_ik_heb_veertig_man_vijfti_0f276189.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #245 |
| 246 | T4.1 | Berend Bos (Charon) | `lines/berend_bos/op_tijd_het_beleg_begint_om_nege_da215086.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #246 |
| 247 | T4.1 | Tammo (Orus) | `lines/tammo/je_valt_de_vesting_aan_d81d18ac.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #247 |
| 248 | T4.1 | Berend Bos (Charon) | `lines/berend_bos/elk_jaar_en_elk_jaar_verlies_ik__56c0c923.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #248 |
| 249 | T4.1 | Berend Bos (Charon) | `lines/berend_bos/omdat_grunn_te_klein_is_voor_een_6dc03f7b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #249 |
| 250 | T4.1 | Berend Bos (Charon) | `lines/berend_bos/kom_mor_rijden_ad161415.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #250 |
| 251 | T4.1 | Tinus (Enceladus) | `lines/tinus/ik_ben_tinus_ik_beleg_mee_mijn_t_239ba4cc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #251 |
| 252 | T4.1 | Tammo (Orus) | `lines/tammo/welkom_in_de_bus_tinus_1754584e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #252 |
| 253 | T4.2 | Berend Bos (Charon) | `lines/berend_bos/je_kijkt_vaker_naar_die_telefoon_d223e71f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #253 |
| 254 | T4.2 | Berend Bos (Charon) | `lines/berend_bos/wie_het_ook_is_e408e810.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #254 |
| 255 | T4.2 | Tammo (Orus) | `lines/tammo/er_zijn_genoeg_stoelen_deb18de5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #255 |
| 256 | T4.2 | Tammo (Orus) | `lines/tammo/ik_zit_hier_056842b5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #256 |
| 257 | T4.2 | Tammo (Orus) | `lines/tammo/dat_was_jelle_9636c543.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #257 |
| 258 | T4.2 | Berend Bos (Charon) | `lines/berend_bos/ik_heb_niks_gezien_ik_ben_belege_b8579c80.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #258 |
| 259 | T4.3 | Berend Bos (Charon) | `lines/berend_bos/op_tijd_dat_is_e_e_n_minuut_te_v_ed2859dc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #259 |
| 260 | T4.3 | Tammo (Orus) | `lines/tammo/jij_telde_ze_70d005ca.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #260 |
| 261 | T4.3 | Berend Bos (Charon) | `lines/berend_bos/ik_tel_alles_3633df84.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #261 |
| 262 | T4.3 | Berend Bos (Charon) | `lines/berend_bos/mijn_bakkie_staat_al_bij_de_poor_7198346f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #262 |
| 263 | T4.4 | Berend Bos (Charon) | `lines/berend_bos/weer_veertig_man_kom_mor_9c05b10d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #263 |
| 264 | M20.1 | Berend Bos (Charon) | `lines/berend_bos/het_beleg_van_bourtange_elk_jaar_f16452ca.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #264 |
| 265 | M20.1 | Tammo (Orus) | `lines/tammo/wie_valt_aan_0c79e97e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #265 |
| 266 | M20.1 | Berend Bos (Charon) | `lines/berend_bos/ik_met_veertig_man_en_een_paard__8e8e0468.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #266 |
| 267 | M20.1 | Berend Bos (Charon) | `lines/berend_bos/jelle_is_geen_bisschop_hij_komt__f561b00d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #267 |
| 268 | M20.1 | Tammo (Orus) | `lines/tammo/een_ding_voor_friezen_b0338154.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #268 |
| 269 | M20.1 | Berend Bos (Charon) | `lines/berend_bos/fierljepen_met_een_stok_over_een_586d3b68.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #269 |
| 270 | M20.2 | Tammo (Orus) | `lines/tammo/wat_is_de_bezigheid_e7ea6b53.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #270 |
| 271 | M20.2 | Tammo (Orus) | `lines/tammo/houd_even_vast_de_sleutel_zit_er_61645050.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #271 |
| 272 | M20.2 | Tammo (Orus) | `lines/tammo/ik_spring_als_ik_val_was_het_de__eb9d4340.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #272 |
| 273 | M20.3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/gerda_belde_mij_ze_zei_mijn_jong_b21f962e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #273 |
| 274 | M20.3 | Berend Bos (Charon) | `lines/berend_bos/nul_krassen_op_de_heenweg_dc8f289c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #274 |
| 275 | M20.3 | Tammo (Orus) | `lines/tammo/jij_kende_mem_528e38ea.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #275 |
| 276 | M20.4 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/de_bal_blijft_bij_ons_tammo_de_d_4dcbab44.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #276 |
| 277 | M20.4 | Tammo (Orus) | `lines/tammo/ik_houd_hem_0d1f3e34.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #277 |
| 278 | M20.4 | Berend Bos (Charon) | `lines/berend_bos/het_bakkie_staat_bij_de_poort_a953ada2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #278 |
| 279 | M20.4 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/dat_zeg_jij_nu_d0ea38c2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #279 |
| 280 | M20.5 | Tammo (Orus) | `lines/tammo/wie_heb_je_verteld_waar_we_waren_a7262ac7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #280 |
| 281 | M20.5 | Tammo (Orus) | `lines/tammo/je_zegt_nooit_iets_ebff8b06.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #281 |
| 282 | M20.5 | Berend Bos (Charon) | `lines/berend_bos/twee_keer_nooit_in_tien_seconden_1f1a8845.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #282 |
| 283 | M20.5 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/wij_waren_jullie_voor_686e2175.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #283 |
| 284 | M20.5 | Berend Bos (Charon) | `lines/berend_bos/ik_rijd_jullie_na_de_snackprijs__d2b3c43f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #284 |
| 285 | M20.5 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/ee_n_zin_jong_083ed58c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #285 |
| 286 | M20.5 | Tammo (Orus) | `lines/tammo/ik_heb_er_geen_d7ed97c8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #286 |
| 287 | M20.6 | Berend Bos (Charon) | `lines/berend_bos/het_beleg_verliest_nooit_van_mij_090ce5a6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #287 |
| 288 | R4.1 | Rikus (Schedar) | `lines/rikus/storingsbericht_de_krolbrug_en_n_4d9ab71c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #288 |
| 289 | M21.1 | Berend Bos (Charon) | `lines/berend_bos/ik_rij_jij_zoekt_het_piepje_5dc640cc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #289 |
| 290 | M21.1 | Berend Bos (Charon) | `lines/berend_bos/ik_rij_nooit_sneller_dan_negenti_8372a4ac.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #290 |
| 291 | M21.1 | Berend Bos (Charon) | `lines/berend_bos/je_hebt_negen_keer_op_je_telefoo_a827ee33.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #291 |
| 292 | M21.2 | Berend Bos (Charon) | `lines/berend_bos/ik_wacht_bij_de_overweg_8b300e36.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #292 |
| 293 | M21.3 | Berend Bos (Charon) | `lines/berend_bos/nul_krassen_op_de_auto_ee_n_bal__5bfd4a59.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #293 |
| 294 | M21.3 | Henk (Sadaltager) | `lines/henk/tinus_schuur_is_hier_vlakbij_ik__fc729b13.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #294 |
| 295 | M21.6 | Berend Bos (Charon) | `lines/berend_bos/ee_n_kras_op_de_auto_ee_n_bal_kw_3fa397f5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #295 |
| 296 | M21.6 | Berend Bos (Charon) | `lines/berend_bos/dat_is_een_kras_henk_heeft_er_ve_5e6a1214.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #296 |
| 297 | M21.4 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/houd_mijn_vrienden_bij_elkaar_jo_cd0479e0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #297 |
| 298 | M21.4 | Tinus (Enceladus) | `lines/tinus/laat_ze_gaan_jong_praten_kun_je__fb752b8a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #298 |
| 299 | M21.4 | Tammo (Orus) | `lines/tammo/wacht_4d571e34.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #299 |
| 300 | M21.4 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/mijn_rubberboot_is_in_beslag_gen_56e91637.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #300 |
| 301 | M21.4 | Tammo (Orus) | `lines/tammo/alsjeblieft_7d39d358.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #301 |
| 302 | M21.4 | Lammert (Iapetus) | `lines/lammert/mijn_kade_is_verhuurd_voor_een_e_0314c6a1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #302 |
| 303 | M21.4 | Wubbo (Sadaltager) | `lines/wubbo/de_brug_draait_op_tijd_maar_vand_994db72c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #303 |
| 304 | M21.4 | Tammo (Orus) | `lines/tammo/ik_zeg_het_niet_goed_68f401ae.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #304 |
| 305 | M21.4 | Roelfien (Laomedeia) | `lines/roelfien/mijn_vliegvergunning_is_ingetrok_bc77d518.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #305 |
| 306 | M21.4 | Tinus (Enceladus) | `lines/tinus/mijn_schuur_is_leeg_maar_henk_ko_1d9748ac.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #306 |
| 307 | M21.4 | Tammo (Orus) | `lines/tammo/voor_ons_a9d62008.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #307 |
| 308 | R4.2 | Rikus (Schedar) | `lines/rikus/een_luisteraar_meldt_dat_er_gist_59594a0a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #308 |
| 309 | B4 | Tammo (Orus) | `lines/tammo/dat_is_veendam_bijna_net_zo_groo_d8c9d796.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #309 |
| 310 | B4 | Tammo (Orus) | `lines/tammo/ik_ben_hier_nog_nooit_afgeslagen_28ba0df3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #310 |
| 311 | B4 | Tammo (Orus) | `lines/tammo/dat_bedoel_ik_8151fda0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #311 |
| 312 | B4 | Tammo (Orus) | `lines/tammo/ik_dacht_dat_het_de_buren_waren_6b421007.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #312 |
| 313 | B4 | Tammo (Orus) | `lines/tammo/dat_is_ook_een_antwoord_456219aa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #313 |
| 314 | B4 | Tammo (Orus) | `lines/tammo/een_goed_antwoord_5dbb9c27.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #314 |
| 315 | M22.1 | Tinus (Enceladus) | `lines/tinus/welkom_in_mijn_schuur_henk_belde_2050839f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #315 |
| 316 | M22.1 | Henk (Sadaltager) | `lines/henk/ik_heb_een_luik_een_uitlaat_en_e_9b489c39.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #316 |
| 317 | M22.1 | Tammo (Orus) | `lines/tammo/de_escapade_is_van_mij_e4d4e6ad.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #317 |
| 318 | M22.1 | Henk (Sadaltager) | `lines/henk/jullie_praten_niet_dat_is_slecht_f82cdf8e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #318 |
| 319 | M22.1 | Henk (Sadaltager) | `lines/henk/elke_deuk_is_een_karaktertrek_di_dd62f9a5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #319 |
| 320 | M22.2 | Henk (Sadaltager) | `lines/henk/het_luik_zit_aan_de_zijkant_dan__5bc65ae2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #320 |
| 321 | M22.2 | Tammo (Orus) | `lines/tammo/een_escapade_met_een_gat_be5e5c91.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #321 |
| 322 | M22.2 | Henk (Sadaltager) | `lines/henk/een_karaktergat_38164b0e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #322 |
| 323 | M22.2 | Tammo (Orus) | `lines/tammo/het_bovenstuk_is_blauw_dat_was_n_801ec107.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #323 |
| 324 | M22.2 | Henk (Sadaltager) | `lines/henk/het_luik_is_betaald_sjabbe_verte_d8b19780.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #324 |
| 325 | M22.2 | Sjabbe (Rasalgethi) | `lines/sjabbe/tammo_belde_vannacht_via_henk_hi_6b775cbd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #325 |
| 326 | M22.2 | Tammo (Orus) | `lines/tammo/het_liep_vijf_minuten_voor_opa_z_055a7def.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #326 |
| 327 | M22.3 | Tinus (Enceladus) | `lines/tinus/de_modder_pakt_eerst_je_auto_je__6de62f0b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #327 |
| 328 | M22.3 | Tinus (Enceladus) | `lines/tinus/met_een_luik_is_de_zijkant_zwakk_ccb049dc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #328 |
| 329 | M22.3 | Tinus (Enceladus) | `lines/tinus/dan_trekt_mijn_trekker_hem_eruit_4c2aeeec.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #329 |
| 330 | M22.3 | Tammo (Orus) | `lines/tammo/ik_zit_vast_6360f1a1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #330 |
| 331 | M22.3 | Tinus (Enceladus) | `lines/tinus/dan_trek_ik_je_los_houd_vast_70c015ab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #331 |
| 332 | M22.3 | Tinus (Enceladus) | `lines/tinus/aan_je_zelfvertrouwen_958e9f4a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #332 |
| 333 | M22.3 | Tammo (Orus) | `lines/tammo/dat_heb_ik_niet_f66c50ab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #333 |
| 334 | M22.3 | Tinus (Enceladus) | `lines/tinus/dan_aan_de_trekker_ee611de2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #334 |
| 335 | M22.4 | Tammo (Orus) | `lines/tammo/jij_zweeg_voor_een_ander_ik_zwee_dc1429cd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #335 |
| 336 | M22.4 | Tammo (Orus) | `lines/tammo/je_ging_alleen_achter_de_trein_a_e0e4b1f1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #336 |
| 337 | M22.4 | Tammo (Orus) | `lines/tammo/zeven_c6a9bf1a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #337 |
| 338 | M22.4 | Tammo (Orus) | `lines/tammo/jij_fries_9e971020.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #338 |
| 339 | M22.4 | Tammo (Orus) | `lines/tammo/dat_verklaart_waarom_je_moi_zegt_782d1a17.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #339 |
| 340 | M22.4 | Tammo (Orus) | `lines/tammo/twee_keer_50b3fb22.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #340 |
| 341 | M22.4 | Tammo (Orus) | `lines/tammo/je_bleef_nergens_e90a6e76.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #341 |
| 342 | M22.5 | Henk (Sadaltager) | `lines/henk/het_luik_zit_er_al_een_deuk_meer_74a4610f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #342 |
| 343 | M23.1 | Wubbo (Sadaltager) | `lines/wubbo/ik_rij_de_bus_een_bus_is_een_bru_a179ed6b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #343 |
| 344 | M23.1 | Tinus (Enceladus) | `lines/tinus/ik_rij_de_trekker_wat_jelle_ook__3cb0fa1d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #344 |
| 345 | M23.1 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/ik_heb_mijn_rubberboot_terug_de__0afd32de.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #345 |
| 346 | M23.1 | Berend Bos (Charon) | `lines/berend_bos/ik_rij_achteraan_met_vijftien_ka_8039061d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #346 |
| 347 | M23.2 | Lammert (Iapetus) | `lines/lammert/ik_zit_achterin_bij_wubbo_in_de__499a8727.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #347 |
| 348 | M23.2 | Roelfien (Laomedeia) | `lines/roelfien/ik_vlieg_boven_jullie_mijn_vergu_37896071.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #348 |
| 349 | M23.2 | Wubbo (Sadaltager) | `lines/wubbo/brug_open_ga_maar_2040941d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #349 |
| 350 | M23.2 | Tinus (Enceladus) | `lines/tinus/ik_trek_hem_weg_efe523ab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #350 |
| 351 | B5 | Tammo (Orus) | `lines/tammo/waar_zie_je_dat_aan_dc2be555.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #351 |
| 352 | B5 | Tammo (Orus) | `lines/tammo/ik_heb_nooit_ergens_anders_gewoo_baac3006.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #352 |
| 353 | B5 | Tammo (Orus) | `lines/tammo/een_tegeltje_651cb7f2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #353 |
| 354 | M23.3 | Tammo (Orus) | `lines/tammo/van_jelles_mem_2c7fcc2e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #354 |
| 355 | M23.6 | Wubbo (Sadaltager) | `lines/wubbo/ik_rijd_naast_jullie_een_bus_is__ceb48595.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #355 |
| 356 | M23.6 | Wubbo (Sadaltager) | `lines/wubbo/die_open_ik_op_afstand_met_mijn__16f12ac1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #356 |
| 357 | M23.6 | Tammo (Orus) | `lines/tammo/en_jelle_32685490.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #357 |
| 358 | M23.6 | Wubbo (Sadaltager) | `lines/wubbo/die_komt_een_minuut_later_zijn_v_cd1896e8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #358 |
| 359 | M23.7 | Tinus (Enceladus) | `lines/tinus/ik_rij_naast_jullie_met_de_trekk_024c4198.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #359 |
| 360 | M23.7 | Tinus (Enceladus) | `lines/tinus/ook_een_limo_aan_de_trekhaak_als_43a809df.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #360 |
| 361 | M23.7 | Tammo (Orus) | `lines/tammo/dat_zei_hij_in_de_modder_ook_944e0fc3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #361 |
| 362 | M23.4 | Tammo (Orus) | `lines/tammo/de_grootste_stoet_die_grunn_ooit_4c3c76c8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #362 |
| 363 | M23.4 | Rikus (Schedar) | `lines/rikus/de_colonne_is_aangekomen_het_is__a87bb958.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #363 |
| 364 | M24.2 | Torenwachter (Iapetus) | `lines/torenwachter/touw_e_e_n_doorgepikt_108bb9e7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #364 |
| 365 | M24.2 | Duivenmelker Bert (Iapetus) | `lines/duivenmelker_bert/hij_luistert_jong_5a1e542b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #365 |
| 366 | M24.3 | Tammo (Orus) | `lines/tammo/voor_de_grip_d5a4691c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #366 |
| 367 | M25.1 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/mosterd_van_wubbo_eieren_van_gee_73c37131.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #367 |
| 368 | M25.1 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/dat_weet_ik_gerda_a98c02ed.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #368 |
| 369 | M25.1 | Sjabbe (Rasalgethi) | `lines/sjabbe/de_notaris_zit_in_de_oude_boteri_0c1d113a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #369 |
| 370 | M25.1 | Sjabbe (Rasalgethi) | `lines/sjabbe/ik_zeg_alleen_breder_dan_een_str_156ad602.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #370 |
| 371 | M25.2 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/eerst_het_ei_dan_het_zout_dan_he_ec8a3dec.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #371 |
| 372 | M25.2 | Tammo (Orus) | `lines/tammo/zo_721cc867.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #372 |
| 373 | M25.2 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/met_liefde_jong_anders_wordt_het_628ce502.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #373 |
| 374 | M25.2 | Tammo (Orus) | `lines/tammo/het_is_een_bal_26cd9882.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #374 |
| 375 | M25.2 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/een_eierbal_dat_is_anders_a6050491.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #375 |
| 376 | M25.2 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/dat_zei_je_in_1953_ook_8f8f7743.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #376 |
| 377 | M25.4 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/dan_hoef_ik_niet_te_bellen_9b219395.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #377 |
| 378 | R5.2 | Rikus (Schedar) | `lines/rikus/de_peiling_staat_al_twee_weken_o_5eb2a3a5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #378 |
| 379 | M26.2 | Berend Bos (Charon) | `lines/berend_bos/voor_iedereen_de_beste_eierbal_w_f2a2687d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #379 |
| 380 | M26.2 | Berend Bos (Charon) | `lines/berend_bos/regel_een_wie_partij_is_zit_niet_c19e2017.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #380 |
| 381 | M26.2 | Berend Bos (Charon) | `lines/berend_bos/regel_twee_mevrouw_hoving_zit_no_25506e10.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #381 |
| 382 | M26.3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/eerst_het_ei_dan_het_zout_dan_he_94aeb172.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #382 |
| 383 | M26.3 | Tammo (Orus) | `lines/tammo/grof_meel_dat_knispert_5d93f089.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #383 |
| 384 | M26.4 | Torenwachter (Iapetus) | `lines/torenwachter/tammo_de_limo_gaat_de_oude_boter_9dd842de.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #384 |
| 385 | M26.4 | Tammo (Orus) | `lines/tammo/de_ballen_staan_bij_de_jury_de_k_0b864a38.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #385 |
| 386 | M26.4 | Tammo (Orus) | `lines/tammo/bert_mijn_duiven_24ab59dc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #386 |
| 387 | M26.4 | Duivenmelker Bert (Iapetus) | `lines/duivenmelker_bert/ze_staan_klaar_jong_79334dc5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #387 |
| 388 | M26.4 | Tammo (Orus) | `lines/tammo/ik_fluit_87e258bc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #388 |
| 389 | M26.4 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_u_staat_op_de_openbare_w_b383d5f1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #389 |
| 390 | M26.4 | Tammo (Orus) | `lines/tammo/hij_is_consistent_09e843e0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #390 |
| 391 | M26.4 | Torenwachter (Iapetus) | `lines/torenwachter/tammo_de_klok_staat_op_drie_uur__46cd1c68.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #391 |
| 392 | M26.14 | Wubbo (Sadaltager) | `lines/wubbo/poelestraat_dicht_bus_dwars_de_d_1d371aad.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #392 |
| 393 | M26.14 | Anita (Callirrhoe) | `lines/anita/dank_je_wubbo_5e278373.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #393 |
| 394 | M26.14 | Wubbo (Sadaltager) | `lines/wubbo/open_of_dicht_tessa_vandaag_alle_da1d9502.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #394 |
| 395 | M26.14 | Anita (Callirrhoe) | `lines/anita/dat_mag_niet_f9fb2a11.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #395 |
| 396 | M26.14 | Tammo (Orus) | `lines/tammo/zijn_bus_zijn_regels_3994f241.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #396 |
| 397 | M26.15 | Tinus (Enceladus) | `lines/tinus/gelkingestraat_dicht_trekker_dwa_173e668d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #397 |
| 398 | M26.15 | Anita (Callirrhoe) | `lines/anita/je_trekker_past_er_net_in_cc59fdde.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #398 |
| 399 | M26.15 | Tinus (Enceladus) | `lines/tinus/ik_trek_hem_weg_de_limo_niet_de__8990ecdd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #399 |
| 400 | M26.15 | Tammo (Orus) | `lines/tammo/in_de_stad_ziet_hij_er_nog_grote_773b9bfc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #400 |
| 401 | M26.16 | Anita (Callirrhoe) | `lines/anita/je_zit_te_breien_aa9ec6b0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #401 |
| 402 | M26.5 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/jelle_geef_hem_aan_mij_eed08523.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #402 |
| 403 | M26.5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mem_de_notaris_sluit_2a097cf3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #403 |
| 404 | M26.5 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/dat_is_zijn_probleem_jij_bent_mi_2bbcf9c4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #404 |
| 405 | M26.5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/ja_mem_ac52508e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #405 |
| 406 | M26.5 | Anita (Callirrhoe) | `lines/anita/het_is_drie_uur_geweest_de_notar_61c078ec.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #406 |
| 407 | M26.6 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/ik_heb_vandaag_in_zijn_kraam_ges_28fcf35f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #407 |
| 408 | M26.6 | Berend Bos (Charon) | `lines/berend_bos/ee_n_verschil_dan_stemmen_we_de__1dcb7443.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #408 |
| 409 | M26.6 | Berend Bos (Charon) | `lines/berend_bos/stemmen_jurylid_e_e_n_a5c16b35.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #409 |
| 410 | M26.10 | Jurylid (Umbriel) | `lines/jurylid/fjord_frituur_5a89a42d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #410 |
| 411 | M26.10 | Berend Bos (Charon) | `lines/berend_bos/fjord_frituur_vijf_van_de_vijf_m_6e7111ed.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #411 |
| 412 | M26.10 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/vijf_van_de_vijf_mijn_juristen_w_02ce53b9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #412 |
| 413 | M26.11 | Jurylid (Umbriel) | `lines/jurylid/us_mem_snacks_ik_heb_een_contrac_a55d9ab8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #413 |
| 414 | M26.11 | Berend Bos (Charon) | `lines/berend_bos/fjord_frituur_vier_van_de_vijf_i_e2f3c999.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #414 |
| 415 | M26.12 | Jurylid (Umbriel) | `lines/jurylid/us_mem_snacks_de_korrel_is_te_gr_6f233386.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #415 |
| 416 | M26.12 | Berend Bos (Charon) | `lines/berend_bos/fjord_frituur_drie_van_de_vijf_h_b6b17891.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #416 |
| 417 | M26.12 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/drie_tegen_twee_mijn_juristen_wi_302eed48.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #417 |
| 418 | M26.13 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/zie_je_ik_had_het_niet_nodig_maa_0ab7f1db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #418 |
| 419 | M26.13 | Berend Bos (Charon) | `lines/berend_bos/de_standplaats_op_de_vismarkt_ga_61c470fc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #419 |
| 420 | M26.13 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/de_bal_gaat_terug_naar_het_museu_88560f88.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #420 |
| 421 | M26.13 | Berend Bos (Charon) | `lines/berend_bos/en_na_afloop_ga_ik_naar_de_polit_d2b570dd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #421 |
| 422 | M26.13 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/de_standplaatsen_houd_ik_dat_is__3187547d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #422 |
| 423 | M26.13 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/dat_is_mijn_zoon_a0333c07.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #423 |
| 424 | M26.13 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/ja_mem_8c9a9a40.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #424 |
| 425 | M26.7 | Anita (Callirrhoe) | `lines/anita/dat_bedoelde_ik_ook_312ee50f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #425 |
| 426 | M26.8 | Anita (Callirrhoe) | `lines/anita/wij_komen_met_de_frituur_54eb6783.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #426 |
| 427 | M26.8 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/dan_stuur_ik_een_rekening_voor_h_fdc95351.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #427 |
| 428 | M26.9 | Berend Bos (Charon) | `lines/berend_bos/elk_jaar_hetzelfde_ontzet_ik_ver_7b3bff11.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #428 |
| 429 | E1 | Rikus (Schedar) | `lines/rikus/het_ruikt_naar_suiker_dat_komt_u_ab8a98dc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #429 |
| 430 | E1 | Anita (Callirrhoe) | `lines/anita/het_is_tweee_ntwintig_graden_59ab799b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #430 |
| 431 | E1 | Tammo (Orus) | `lines/tammo/nee_van_de_volgende_ook_niet_alv_784c92a8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #431 |
| 432 | E2 | Rikus (Schedar) | `lines/rikus/jelle_gaf_bijna_alles_terug_hele_1c2bffc3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #432 |
| 433 | E2 | Rikus (Schedar) | `lines/rikus/oldenhuis_bakt_sluit_alle_eenenv_51973f51.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #433 |
| 434 | E2 | Rikus (Schedar) | `lines/rikus/mevrouw_hoving_stapt_na_bijna_vi_83668980.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #434 |
| 435 | E2 | Rikus (Schedar) | `lines/rikus/de_krolbrug_staat_nu_open_nieman_56da4400.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #435 |
| 436 | E2 | Rikus (Schedar) | `lines/rikus/de_politie_sloot_de_zaak_van_de__29b6513a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #436 |
| 437 | E2 | Rikus (Schedar) | `lines/rikus/sjabbe_bracht_een_horloge_terug__9c2628fd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #437 |
| 438 | E2 | Rikus (Schedar) | `lines/rikus/durk_en_douwe_werken_nu_voor_jel_5af10f09.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #438 |
| 439 | E2 | Rikus (Schedar) | `lines/rikus/het_jurylid_met_het_contract_eet_4be4cb24.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #439 |
| 440 | M27.1 | Willemien (Aoede) | `lines/willemien/jullie_zijn_van_trijntje_kom_bin_2eb78cc3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #440 |
| 441 | M27.1 | Anita (Callirrhoe) | `lines/anita/hoe_lang_28f33768.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #441 |
| 442 | M27.1 | Willemien (Aoede) | `lines/willemien/een_paar_weken_zeggen_ze_dat_zeg_444c9786.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #442 |
| 443 | M27.1 | Tammo (Orus) | `lines/tammo/graag_f0d04895.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #443 |
| 444 | M27.1 | Willemien (Aoede) | `lines/willemien/delfstof_noord_zet_het_huis_op_n_183d73a7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #444 |
| 445 | M27.1 | Anita (Callirrhoe) | `lines/anita/oma_zei_gewoon_dozen_4607867a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #445 |
| 446 | M27.1 | Willemien (Aoede) | `lines/willemien/dat_zegt_trijntje_van_alles_bree_37059d28.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #446 |
| 447 | M27.2 | Tammo (Orus) | `lines/tammo/de_kat_wil_niet_in_de_mand_ffd2be53.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #447 |
| 448 | M27.2 | Willemien (Aoede) | `lines/willemien/hij_wil_nergens_in_hij_woont_hie_52578380.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #448 |
| 449 | M27.2 | Anita (Callirrhoe) | `lines/anita/willemien_een_foto_twee_tieners__1431db82.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #449 |
| 450 | M27.2 | Willemien (Aoede) | `lines/willemien/mijn_oma_en_trijntje_negentienho_b4becdf2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #450 |
| 451 | M27.2 | Tammo (Orus) | `lines/tammo/dat_is_een_eind_fietsen_e10b80bc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #451 |
| 452 | M27.2 | Willemien (Aoede) | `lines/willemien/tegen_de_wind_in_dat_stond_er_ni_be4fce76.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #452 |
| 453 | M27.3 | Willemien (Aoede) | `lines/willemien/het_is_een_huis_het_moet_alleen__03c22a84.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #453 |
| 454 | M27.3 | Anita (Callirrhoe) | `lines/anita/het_blijft_staan_0e6253d5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #454 |
| 455 | M27.3 | Willemien (Aoede) | `lines/willemien/dat_zeggen_ze_ik_zeg_het_ook_dan_499e7079.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #455 |
| 456 | M27.4 | Willemien (Aoede) | `lines/willemien/nog_een_doos_er_is_altijd_nog_ee_0fef6485.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #456 |
| 457 | M28.1 | Willemien (Aoede) | `lines/willemien/rustig_rijden_niet_om_de_spullen_d1d162b5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #457 |
| 458 | M28.1 | Tammo (Orus) | `lines/tammo/ik_rij_altijd_rustig_7f7ae3a5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #458 |
| 459 | M28.1 | Willemien (Aoede) | `lines/willemien/dat_zei_trijntje_al_ze_zei_dat_i_1776c781.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #459 |
| 460 | M28.2 | Rikus (Schedar) | `lines/rikus/nachtstreek_een_nummer_voor_iede_b258a7d9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #460 |
| 461 | M28.2 | Willemien (Aoede) | `lines/willemien/daar_woonde_mijn_buurvrouw_die_i_a14a4085.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #461 |
| 462 | M28.2 | Tammo (Orus) | `lines/tammo/en_u_ca344d24.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #462 |
| 463 | M28.2 | Willemien (Aoede) | `lines/willemien/ik_geloof_het_als_ik_het_zie_dat_45c93e64.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #463 |
| 464 | M28.3 | Willemien (Aoede) | `lines/willemien/hij_vindt_het_niks_fffa07b5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #464 |
| 465 | M28.3 | Tammo (Orus) | `lines/tammo/hij_went_wel_8d63ac1c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #465 |
| 466 | M28.3 | Willemien (Aoede) | `lines/willemien/hij_niet_ik_wel_dank_je_jong_zeg_e8964e61.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #466 |
| 467 | M28.3 | Tammo (Orus) | `lines/tammo/dat_weet_ze_5c3a8ab4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #467 |
| 468 | M28.4 | Willemien (Aoede) | `lines/willemien/nog_een_ritje_de_kat_blijft_hier_0411b238.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #468 |
| 469 | M29.1 | Willemien (Aoede) | `lines/willemien/een_paar_weken_zeiden_ze_dit_kee_85eb4638.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #469 |
| 470 | M29.1 | Anita (Callirrhoe) | `lines/anita/en_hij_staat_goed_7fc594b2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #470 |
| 471 | M29.1 | Willemien (Aoede) | `lines/willemien/de_kat_was_eerder_terug_dan_ik_h_710a9676.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #471 |
| 472 | M29.1 | Tammo (Orus) | `lines/tammo/die_wist_de_weg_b59c4759.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #472 |
| 473 | M29.1 | Willemien (Aoede) | `lines/willemien/die_wist_het_al_die_tijd_aaf05a7e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #473 |
| 474 | M29.2 | Rikus (Schedar) | `lines/rikus/nachtstreek_op_tournee_vanavond__f4240b14.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #474 |
| 475 | M29.2 | Buurvrouw (Despina) | `lines/buurvrouw/ik_ben_de_buurvrouw_ik_heb_gekoo_31717b9c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #475 |
| 476 | M29.2 | Boer (Charon) | `lines/boer/ik_heb_de_tafels_gebracht_en_wee_0f23b65d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #476 |
| 477 | M29.2 | Anita (Callirrhoe) | `lines/anita/waar_hangt_de_foto_fec2a1e2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #477 |
| 478 | M29.2 | Willemien (Aoede) | `lines/willemien/in_de_gang_waar_je_hem_ziet_als__e5bfd462.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #478 |
| 479 | M29.3 | Willemien (Aoede) | `lines/willemien/zeg_tegen_trijntje_ik_ben_thuis_05c70697.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #479 |
| 480 | M29.3 | Tammo (Orus) | `lines/tammo/ik_zal_het_zeggen_e684a0fc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #480 |
| 481 | M29.3 | Willemien (Aoede) | `lines/willemien/ee_n_keer_is_genoeg_dan_is_het_w_ecc1f505.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #481 |
| 482 | M29.4 | Willemien (Aoede) | `lines/willemien/kom_maar_binnen_koffie_staat_het_3fe9d79a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #482 |
| 483 | T5.1 | Berend Bos (Charon) | `lines/berend_bos/goidag_het_echte_beleg_is_volgen_11546727.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #483 |
| 484 | T5.1 | Berend Bos (Charon) | `lines/berend_bos/met_jullie_en_met_iedereen_van_t_c24e3bc9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #484 |
| 485 | T5.1 | Tammo (Orus) | `lines/tammo/waarom_een_proef_d0357400.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #485 |
| 486 | T5.1 | Berend Bos (Charon) | `lines/berend_bos/omdat_ik_wil_weten_hoe_het_is_ee_8dabbcc0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #486 |
| 487 | T5.1 | Berend Bos (Charon) | `lines/berend_bos/ik_zei_niks_over_winnen_ik_tel_a_bbff1282.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #487 |
| 488 | T5.2 | Berend Bos (Charon) | `lines/berend_bos/op_tijd_dat_is_twee_minuten_te_v_fb8b8ee5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #488 |
| 489 | T5.2 | Tammo (Orus) | `lines/tammo/je_hebt_de_klok_bijgehouden_02752332.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #489 |
| 490 | T5.3 | Berend Bos (Charon) | `lines/berend_bos/weer_naar_de_heide_kom_mor_d7695de2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #490 |
| 491 | M30.1 | Berend Bos (Charon) | `lines/berend_bos/allemaal_het_proefbeleg_van_bour_cd713c3e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #491 |
| 492 | M30.1 | Lammert (Iapetus) | `lines/lammert/ik_heb_de_sleutel_van_de_sluis_v_636ec483.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #492 |
| 493 | M30.1 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/een_gracht_is_ook_water_ik_vaar__02141455.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #493 |
| 494 | M30.1 | Roelfien (Laomedeia) | `lines/roelfien/ik_vlieg_boven_meel_zes_zakken_e_ac4e13d9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #494 |
| 495 | M30.1 | Wubbo (Sadaltager) | `lines/wubbo/ik_doe_de_lier_van_de_brug_open__fc2c8ab2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #495 |
| 496 | M30.1 | Tinus (Enceladus) | `lines/tinus/trekker_heeft_een_toren_hij_trek_fdd62aa4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #496 |
| 497 | M30.1 | Duivenmelker Bert (Iapetus) | `lines/duivenmelker_bert/veertig_duiven_ze_luisteren_naar_be672a27.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #497 |
| 498 | M30.1 | Berend Bos (Charon) | `lines/berend_bos/zeg_aanvallen_dat_is_wat_een_gen_d84a5a0c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #498 |
| 499 | M30.2 | Lammert (Iapetus) | `lines/lammert/sluis_open_het_water_komt_het_ko_13dd6582.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #499 |
| 500 | M30.2 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/stuurboord_tessa_dat_is_rechts_d_f34eb3b6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #500 |
| 501 | M30.2 | Tammo (Orus) | `lines/tammo/dat_is_meedoen_c38a78e5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #501 |
| 502 | M30.2 | Anita (Callirrhoe) | `lines/anita/jelle_ligt_in_de_gracht_006f2cbd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #502 |
| 503 | M30.2 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/hij_ligt_er_elke_keer_in_dat_is__d0bf78f0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #503 |
| 504 | M30.3 | Wubbo (Sadaltager) | `lines/wubbo/lier_nu_een_tel_te_vroeg_het_is__e5ce743a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #504 |
| 505 | M30.3 | Wubbo (Sadaltager) | `lines/wubbo/te_vroeg_dat_is_ook_een_soort_op_587682a6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #505 |
| 506 | M30.3 | Berend Bos (Charon) | `lines/berend_bos/voor_mu_nster_voor_het_bisdom_vo_4e8c89a1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #506 |
| 507 | M30.4 | Roelfien (Laomedeia) | `lines/roelfien/boven_jullie_meel_komt_hoofd_oml_0f9f6577.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #507 |
| 508 | M30.4 | Tammo (Orus) | `lines/tammo/duiven_links_op_de_hoeden_nu_0aa26d26.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #508 |
| 509 | M30.4 | Durk (Algieba) | `lines/durk/dat_kanon_is_van_karton_c7d36f12.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #509 |
| 510 | M30.4 | Douwe (Algenib) | `lines/douwe/karton_a8938285.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #510 |
| 511 | M30.4 | Durk (Algieba) | `lines/durk/dat_is_onze_specialiteit_469c691a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #511 |
| 512 | M30.4 | Tinus (Enceladus) | `lines/tinus/toren_trekt_hij_leunt_hij_leunt__e7d7f89e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #512 |
| 513 | M30.4 | Anita (Callirrhoe) | `lines/anita/vlag_vlag_vlag_drie_0b54944f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #513 |
| 514 | M30.5 | Berend Bos (Charon) | `lines/berend_bos/het_is_open_7bdfe138.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #514 |
| 515 | M30.5 | Anita (Callirrhoe) | `lines/anita/het_is_open_berend_ca414520.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #515 |
| 516 | M30.5 | Berend Bos (Charon) | `lines/berend_bos/ik_heb_gewonnen_422189d5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #516 |
| 517 | M30.5 | Tammo (Orus) | `lines/tammo/u_heeft_gewonnen_b4855710.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #517 |
| 518 | M30.5 | Berend Bos (Charon) | `lines/berend_bos/dit_is_verkeerd_251d1c15.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #518 |
| 519 | M30.5 | Anita (Callirrhoe) | `lines/anita/dat_is_winnen_berend_ba281f0d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #519 |
| 520 | M30.5 | Berend Bos (Charon) | `lines/berend_bos/dan_is_winnen_verkeerd_dd2e24ba.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #520 |
| 521 | M30.5 | Rikus (Schedar) | `lines/rikus/grunn_het_beleg_van_bourtange_is_678cb9d9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #521 |
| 522 | M30.5 | Berend Bos (Charon) | `lines/berend_bos/volgend_jaar_verlies_ik_weer_dat_acef1867.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #522 |
| 523 | M30.5 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/is_hij_blij_dcdac1fa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #523 |
| 524 | M30.5 | Anita (Callirrhoe) | `lines/anita/hij_zegt_van_niet_de7dbd69.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #524 |
| 525 | M30.5 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/dan_is_hij_blij_babe4d41.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #525 |
| 526 | M30.6 | Tammo (Orus) | `lines/tammo/thuis_is_waar_de_kar_staat_0a2d542b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #526 |
| 527 | M30.6 | Anita (Callirrhoe) | `lines/anita/zes_a69300f5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #527 |
| 528 | M30.7 | Berend Bos (Charon) | `lines/berend_bos/nog_een_proefbeleg_ik_win_nog_st_6c0096b9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #528 |

De wachtrij heeft 528 clips (1 manifest(en): lines).

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

Het issue telt 670 regels/671 clips (67 klaar + 604 wachtend, plus de laadhint van 2 clips). De huidige bronnen geven 548 regels/clips: 528 klaar + 20 wachtend. Dat verschil komt doordat `script.json`, `gronings_spoken.json` en de opnames sinds 6-11 zijn bijgewerkt; deze lijst volgt de code, niet het issue.
