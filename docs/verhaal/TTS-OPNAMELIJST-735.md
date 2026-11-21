# TTS-opnamelijst #735: definitieve lijst van deze ronde

Gegenereerd door `node scripts/tts_opnamelijst.mjs` uit `game/storydata/script.json`, `scripts/tts_lines.json`, `scripts/gronings_spoken.json` en `scripts/tts_cast.mjs`. Niet met de hand aanpassen; draai `node scripts/tts_opnamelijst.mjs --check` om te zien of deze lijst achterloopt.

**Stand van deze bronnen:** 920 clips staan klaar in de wachtrij (`scripts/tts_lines.json`), 398 verhaalregels wachten nog (26 op een stemkeuze, 372 op een Groningse spreektekst). Samen **1318 regels/clips**. De 37 bewust stille appjes (`channel: app-stil`) staan er niet op.

> Het issue #735 noemt 670 regels/671 clips (stand 6-11-2026). De scripts zijn de bron: inmiddels zijn er regels bijgekomen of opgenomen, dus deze lijst telt wat de code nu zegt. Zie "Verschil met #735" onderaan.

## Route (LiteLLM, #689)

- Endpoint: `https://litellm.natuspella.nl/v1beta/interactions` (de gateway van de eigenaar; `LITELLM_BASE_URL` overschrijft het adres).
- Modelalias: `google/gemini-3.8-flash-lite-tts`; stem en stijl komen per regel uit de wachtrij.
- De sleutel staat **niet** in de repo: de eigenaar zet `LITELLM_API_KEY` in zijn eigen `.env` (gitignored, `GDE_ENV` wijst naar een andere plek) of in de omgeving. Deze lijst leest `.env` niet en print geen sleutel.
- Batchcommando (wat de runbook gebruikt): `python3 scripts/tts_lines.py --budget 2.5`; de exacte curl per regel staat in `TTS-OPNAMELIJST-735.jsonl` (kolom `curl`).

## 1. Klaar om op te nemen (in de wachtrij)

| # | Bron (scène) | Stem | Bestandsnaam | Commando |
|---|---|---|---|---|
| 1 | C00.2 | Anita (Callirrhoe) | `lines/anita/zonder_bank_blijft_er_e_e_n_weg__b2a7de92.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #1 |
| 2 | C00.2 | Anita (Callirrhoe) | `lines/anita/wij_winnen_op_28_augustus_wij_kr_2172b078.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #2 |
| 3 | C00.2 | Anita (Callirrhoe) | `lines/anita/het_is_een_tekening_tammo_ik_wee_4aa5d29d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #3 |
| 4 | C00.2 | Anita (Callirrhoe) | `lines/anita/vierentwintig_net_afgestudeerd_e_4ef0b85a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #4 |
| 5 | C00.3 | Anita (Callirrhoe) | `lines/anita/een_streamer_betaalt_honderdvijf_09c09484.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #5 |
| 6 | C00.3 | Anita (Callirrhoe) | `lines/anita/dus_we_lenen_een_bakkie_rijden_n_7a0fd0fd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #6 |
| 7 | M01.1 | Anita (Callirrhoe) | `lines/anita/hij_is_de_bisschop_die_grunn_in__734ed0de.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #7 |
| 8 | M02.1 | Anita (Callirrhoe) | `lines/anita/ik_ken_sjabbe_hij_opent_wat_niem_4d2aa7a4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #8 |
| 9 | M02.5 | Anita (Callirrhoe) | `lines/anita/alleen_of_we_een_koekje_wilden_59e24e38.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #9 |
| 10 | O1 | Anita (Callirrhoe) | `lines/anita/het_luik_moet_aan_de_zijkant_dan_d46358ca.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #10 |
| 11 | O1 | Anita (Callirrhoe) | `lines/anita/de_mensen_die_gaan_komen_tammo_810c5e62.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #11 |
| 12 | O1 | Anita (Callirrhoe) | `lines/anita/ik_heb_ook_een_lijst_gemaakt_op__11026c8b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #12 |
| 13 | O1 | Anita (Callirrhoe) | `lines/anita/je_hebt_dat_kaartje_nog_van_die__93e31165.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #13 |
| 14 | O1 | Anita (Callirrhoe) | `lines/anita/ja_natuurlijk_efc4f2c2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #14 |
| 15 | O1 | Beppe (Aoede) | `lines/beppe/jonge_hast_al_iten_5410cd93.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #15 |
| 16 | O1 | Beppe (Aoede) | `lines/beppe/is_tessa_der_ek_dan_meitsje_ik_s_1315e504.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #16 |
| 17 | N1 | Anita (Callirrhoe) | `lines/anita/wij_doen_het_voor_twintig_euro_1035557b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #17 |
| 18 | N1 | Anita (Callirrhoe) | `lines/anita/wat_moet_hij_met_kopieerpapier_8f9b8246.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #18 |
| 19 | N2 | Anita (Callirrhoe) | `lines/anita/je_kent_hem_ffcfdb3a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #19 |
| 20 | N2 | Anita (Callirrhoe) | `lines/anita/zal_ik_soep_maken_voor_drie_b5cc245c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #20 |
| 21 | N3 | Beppe (Aoede) | `lines/beppe/de_r_bisto_jonge_kom_yn_kom_yn_d_22363820.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #21 |
| 22 | N3 | Beppe (Aoede) | `lines/beppe/ytst_dan_mar_earst_dan_prate_wy_069d6532.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #22 |
| 23 | N3 | Anita (Callirrhoe) | `lines/anita/wat_zegt_ze_81203427.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #23 |
| 24 | N3 | Beppe (Aoede) | `lines/beppe/hy_seit_neat_mar_hy_docht_it_goe_464c01d8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #24 |
| 25 | N3 | Anita (Callirrhoe) | `lines/anita/ik_weet_het_hij_zegt_niets_met_z_c709cf67.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #25 |
| 26 | N4 | Anita (Callirrhoe) | `lines/anita/taxi_jij_rijdt_79dc629f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #26 |
| 27 | N4 | Anita (Callirrhoe) | `lines/anita/dat_merk_je_vanzelf_ik_schreeuw__c0a335ac.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #27 |
| 28 | N4 | Anita (Callirrhoe) | `lines/anita/formulieren_dit_doe_ik_liever_al_09be605b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #28 |
| 29 | N4 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_tessa_uw_auto_staat_op_e_7b5bba8c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #29 |
| 30 | N4 | Anita (Callirrhoe) | `lines/anita/het_is_een_stoep_e40e96a8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #30 |
| 31 | N4 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/een_stoep_met_een_overeenkomst_cf6e53a2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #31 |
| 32 | N4 | Anita (Callirrhoe) | `lines/anita/iemand_die_alle_regels_kent_beha_ca79c038.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #32 |
| 33 | M03.2 | Anita (Callirrhoe) | `lines/anita/hoe_dan_a1b7ffec.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #33 |
| 34 | M03.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/met_papier_f2cf083a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #34 |
| 35 | M03.2 | Anita (Callirrhoe) | `lines/anita/voor_zijn_oma_hij_doet_alles_voo_077aacbd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #35 |
| 36 | M03.4 | Anita (Callirrhoe) | `lines/anita/hij_vroeg_sjabbe_waar_het_museum_da7f826d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #36 |
| 37 | M03.4 | Anita (Callirrhoe) | `lines/anita/wie_de_bal_heeft_zit_de_jury_voo_1f3a486a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #37 |
| 38 | M03.4 | Anita (Callirrhoe) | `lines/anita/eerst_kijken_hoe_het_museum_bewa_6962ee4d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #38 |
| 39 | R1.1 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/jelle_terpstra_us_mem_snacks_u_k_62a988b5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #39 |
| 40 | O2 | Tammo (Orus) | `lines/tammo/dat_zeg_je_elke_keer_7af04035.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #40 |
| 41 | M06.0 | Anita (Callirrhoe) | `lines/anita/we_wachten_op_iets_ff5f2f91.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #41 |
| 42 | B1.1 | Anita (Callirrhoe) | `lines/anita/waarom_denkt_iedereen_dat_wij_ee_06e3818b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #42 |
| 43 | B1.1 | Anita (Callirrhoe) | `lines/anita/dat_is_geen_argument_a460f66b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #43 |
| 44 | B1.2 | Anita (Callirrhoe) | `lines/anita/kijk_een_mus_af57b7fc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #44 |
| 45 | B1.2 | Anita (Callirrhoe) | `lines/anita/dat_is_het_leukste_wat_je_vandaa_e6e26c77.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #45 |
| 46 | B1.3 | Anita (Callirrhoe) | `lines/anita/vraag_van_de_dag_hoe_lang_kan_ee_410982c7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #46 |
| 47 | B1.3 | Anita (Callirrhoe) | `lines/anita/dat_noem_ik_geen_antwoord_6dcef7d3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #47 |
| 48 | O3 | Anita (Callirrhoe) | `lines/anita/wij_staan_op_de_camera_93e53bab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #48 |
| 49 | O3 | Anita (Callirrhoe) | `lines/anita/dan_moeten_we_weten_wat_hij_nog__f82f5db0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #49 |
| 50 | O3 | Anita (Callirrhoe) | `lines/anita/daarna_winnen_we_gewoon_eerlijk__f9fe8400.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #50 |
| 51 | O3 | Anita (Callirrhoe) | `lines/anita/dan_weet_zij_hoe_dat_moet_efa1405a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #51 |
| 52 | O3 | Anita (Callirrhoe) | `lines/anita/wat_zei_je_d4387878.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #52 |
| 53 | M07.1 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_al_het_vet_van_grunn_e_e_7df98541.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #53 |
| 54 | M07.1 | Anita (Callirrhoe) | `lines/anita/zonder_vet_bakt_niemand_een_eier_d16195a1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #54 |
| 55 | M08.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_een_fatbike_is_juridisch_4ded92f2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #55 |
| 56 | M08.2 | Anita (Callirrhoe) | `lines/anita/dan_rennen_we_a73c5051.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #56 |
| 57 | M08.3 | Tammo (Orus) | `lines/tammo/ik_ben_vierentwintig_oma_5af68f6d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #57 |
| 58 | M08.3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/dan_eet_je_hem_al_vierentwintig__baa9b0d6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #58 |
| 59 | M08.3 | Anita (Callirrhoe) | `lines/anita/vijf_vrienden_vijf_ingredie_nten_c57d5d85.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #59 |
| 60 | M08.3 | Anita (Callirrhoe) | `lines/anita/vijf_namen_aan_ons_prikbord_dat__54e57b3f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #60 |
| 61 | O4 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/famke_heb_je_een_jas_aan_ebd3a7ca.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #61 |
| 62 | O4 | Anita (Callirrhoe) | `lines/anita/het_is_augustus_mem_edfa6d61.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #62 |
| 63 | O4 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/het_waait_jas_00f02dee.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #63 |
| 64 | O4 | Anita (Callirrhoe) | `lines/anita/ja_mem_1e15e512.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #64 |
| 65 | O4 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/is_de_jongen_er_ook_zeg_dat_hij__19781a41.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #65 |
| 66 | O4 | Anita (Callirrhoe) | `lines/anita/mem_ik_logeerde_elke_zomer_naast_5a008ff6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #66 |
| 67 | O4 | Anita (Callirrhoe) | `lines/anita/jij_weet_niet_hoe_lang_ze_dat_al_89a9c077.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #67 |
| 68 | N10 | Anita (Callirrhoe) | `lines/anita/twee_koffie_een_thee_een_tosti_a_b1957a38.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #68 |
| 69 | N10 | Anita (Callirrhoe) | `lines/anita/nee_tammo_e8635f2c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #69 |
| 70 | N10 | Anita (Callirrhoe) | `lines/anita/jouw_vak_is_stilstaan_als_ik_pra_881d04d0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #70 |
| 71 | N8 | Anita (Callirrhoe) | `lines/anita/die_7dc29a94.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #71 |
| 72 | N8 | Anita (Callirrhoe) | `lines/anita/we_slapen_oma_c7e83f58.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #72 |
| 73 | N8 | Anita (Callirrhoe) | `lines/anita/een_punaise_we_hebben_hem_al_een_c369673a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #73 |
| 74 | N5 | Anita (Callirrhoe) | `lines/anita/dit_is_het_erf_van_mijn_oom_hier_f5007fcc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #74 |
| 75 | N5 | Anita (Callirrhoe) | `lines/anita/je_vroeg_ook_niet_naar_de_kippen_ef0e98d8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #75 |
| 76 | N5 | Anita (Callirrhoe) | `lines/anita/geef_me_je_hand_niet_wegtrekken_6d6e960a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #76 |
| 77 | N5 | Anita (Callirrhoe) | `lines/anita/ik_zei_het_toch_ea5c5fd6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #77 |
| 78 | N11 | Anita (Callirrhoe) | `lines/anita/links_bij_de_zwarte_koe_8b1c98bf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #78 |
| 79 | N11 | Anita (Callirrhoe) | `lines/anita/die_met_dat_gezicht_bfa77c60.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #79 |
| 80 | N11 | Anita (Callirrhoe) | `lines/anita/dat_is_jouw_vak_5ca4a98a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #80 |
| 81 | N11 | Tammo (Orus) | `lines/tammo/en_jij_1ef5c630.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #81 |
| 82 | N11 | Anita (Callirrhoe) | `lines/anita/ik_kan_geen_kaart_lezen_wel_een__4b0a2df8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #82 |
| 83 | N11 | Anita (Callirrhoe) | `lines/anita/ik_heb_elf_koeien_geteld_55e063bf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #83 |
| 84 | N12 | Anita (Callirrhoe) | `lines/anita/tammo_rijden_wachten_de_chauffeu_75c576e0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #84 |
| 85 | N12 | Anita (Callirrhoe) | `lines/anita/plannen_koeien_praten_met_mensen_cd5aba9d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #85 |
| 86 | N12 | Anita (Callirrhoe) | `lines/anita/dat_is_de_bedoeling_daar_komt_he_dab1da58.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #86 |
| 87 | N12 | Anita (Callirrhoe) | `lines/anita/pak_je_sokken_8c1e0494.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #87 |
| 88 | N12 | Anita (Callirrhoe) | `lines/anita/dan_wees_er_zuinig_op_4bd0ed05.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #88 |
| 89 | N6 | Anita (Callirrhoe) | `lines/anita/mag_ik_weer_aan_land_43ed5bc4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #89 |
| 90 | N6 | Anita (Callirrhoe) | `lines/anita/ik_heb_het_water_niet_gekozen_eff77a38.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #90 |
| 91 | N7 | Anita (Callirrhoe) | `lines/anita/je_bedankt_altijd_de_chauffeur_c6a0d7be.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #91 |
| 92 | N7 | Anita (Callirrhoe) | `lines/anita/het_was_een_bus_f1557f9f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #92 |
| 93 | T1 | Anita (Callirrhoe) | `lines/anita/jij_zei_dat_de_zee_achter_de_dij_4aae769f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #93 |
| 94 | M09.1 | Anita (Callirrhoe) | `lines/anita/alle_a0af206f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #94 |
| 95 | M09.1 | Anita (Callirrhoe) | `lines/anita/mijn_vader_had_kippen_ik_sorteer_ae99a6bb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #95 |
| 96 | M09.1 | Anita (Callirrhoe) | `lines/anita/je_vroeg_nooit_naar_de_kippen_7946f7de.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #96 |
| 97 | M10.1 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/u_bent_in_het_museum_geweest_mij_9ee5940e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #97 |
| 98 | M10.1 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/die_verdwijnen_als_u_grunn_en_de_9e2c3cd8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #98 |
| 99 | M10.1 | Anita (Callirrhoe) | `lines/anita/het_kaartje_in_de_vitrine_dat_wi_2f4fff23.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #99 |
| 100 | M10.1 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/bewaker_twee_belde_mij_vooraf_de_6decc8f3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #100 |
| 101 | M10.1 | Anita (Callirrhoe) | `lines/anita/uithuizen_heeft_een_sloot_en_een_b7977546.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #101 |
| 102 | M10.2 | Anita (Callirrhoe) | `lines/anita/boerendochter_elke_wierde_heeft__6ff101c4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #102 |
| 103 | M10.5 | Anita (Callirrhoe) | `lines/anita/de_escapade_henk_heeft_een_zende_3fe505d6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #103 |
| 104 | M10.5 | Anita (Callirrhoe) | `lines/anita/de_recepten_oma_heeft_kopiee_n_fecd25aa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #104 |
| 105 | M10.5 | Anita (Callirrhoe) | `lines/anita/natuurlijk_blijf_je_je_hebt_een__630c4b10.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #105 |
| 106 | O5 | Anita (Callirrhoe) | `lines/anita/mem_vandaag_was_er_een_man_met_e_9070b4f8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #106 |
| 107 | O5 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/dat_zegt_hij_al_jaren_3c02e352.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #107 |
| 108 | O5 | Anita (Callirrhoe) | `lines/anita/kent_u_hem_d0268528.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #108 |
| 109 | O5 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/doe_je_jas_aan_famke_6477e254.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #109 |
| 110 | O5 | Anita (Callirrhoe) | `lines/anita/mem_281fc1d8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #110 |
| 111 | O5 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/straks_eerst_het_ontzet_60bb71e1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #111 |
| 112 | O5 | Anita (Callirrhoe) | `lines/anita/dat_ik_mijn_jas_moet_aandoen_900c6d03.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #112 |
| 113 | T2 | Anita (Callirrhoe) | `lines/anita/ik_ben_de_koningin_van_de_friteu_346e226d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #113 |
| 114 | T2 | Anita (Callirrhoe) | `lines/anita/waar_jij_rijdt_7dca9ea6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #114 |
| 115 | T2 | Anita (Callirrhoe) | `lines/anita/je_lacht_in_je_slaap_1e7cd6d2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #115 |
| 116 | M11.1 | Anita (Callirrhoe) | `lines/anita/ee_n_keer_9b592a6c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #116 |
| 117 | M11.1 | Tammo (Orus) | `lines/tammo/twee_75069400.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #117 |
| 118 | M11.1 | Anita (Callirrhoe) | `lines/anita/dat_is_een_val_4dfabf52.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #118 |
| 119 | M11.1 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/natuurlijk_33f906fb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #119 |
| 120 | M11.3 | Anita (Callirrhoe) | `lines/anita/er_zit_een_briefje_bij_eet_wat_i_b2ca1a53.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #120 |
| 121 | M11.3 | Anita (Callirrhoe) | `lines/anita/dat_doen_oma_s_32581a97.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #121 |
| 122 | M11.3 | Tammo (Orus) | `lines/tammo/je_kijkt_raar_8e4db7bd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #122 |
| 123 | M11.3 | Anita (Callirrhoe) | `lines/anita/het_schommelt_het_is_een_boot_3a07f54b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #123 |
| 124 | M11.3 | Anita (Callirrhoe) | `lines/anita/geen_bal_dan_halen_we_het_zout_v_2df45184.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #124 |
| 125 | B2.1 | Anita (Callirrhoe) | `lines/anita/zeg_het_maar_d81e9290.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #125 |
| 126 | B2.1 | Anita (Callirrhoe) | `lines/anita/remmen_tammo_272d3adf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #126 |
| 127 | B2.2 | Anita (Callirrhoe) | `lines/anita/vraag_van_de_dag_hoeveel_eieren__09028774.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #127 |
| 128 | B2.2 | Anita (Callirrhoe) | `lines/anita/ik_bedoel_in_oma_s_recept_0c88d287.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #128 |
| 129 | R3.0 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/jelle_terpstra_vanmiddag_vlieg_i_50ba8b3b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #129 |
| 130 | R3.0 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/sinds_vanochtend_wel_mijn_jurist_51a9fddd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #130 |
| 131 | M12.1 | Anita (Callirrhoe) | `lines/anita/wij_zoeken_jelles_ballon_die_han_b7f5222e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #131 |
| 132 | M12.1 | Anita (Callirrhoe) | `lines/anita/behalve_naar_jou_881e1513.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #132 |
| 133 | M12.1 | Anita (Callirrhoe) | `lines/anita/ik_vlieg_drie_lessen_en_een_jaar_cb5ef556.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #133 |
| 134 | M12.2 | Anita (Callirrhoe) | `lines/anita/nog_wel_ec796b7c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #134 |
| 135 | M12.3 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mijn_juristen_hebben_alles_voorz_df546a30.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #135 |
| 136 | M12.3 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/dat_boek_is_mijn_plan_de_haven_d_27c6f610.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #136 |
| 137 | M12.3 | Anita (Callirrhoe) | `lines/anita/dat_gaan_we_proberen_7dfd6232.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #137 |
| 138 | M12.4 | Anita (Callirrhoe) | `lines/anita/plakje_vijf_de_haven_vannacht_ee_66503cda.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #138 |
| 139 | M12.4 | Anita (Callirrhoe) | `lines/anita/oma_s_vet_en_alles_wat_haar_vrie_da5bc4e3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #139 |
| 140 | M12.4 | Anita (Callirrhoe) | `lines/anita/de_bewaarder_notaris_28_augustus_e708f5aa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #140 |
| 141 | J1 | Anita (Callirrhoe) | `lines/anita/zeven_brieven_allemaal_van_de_ge_faa80619.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #141 |
| 142 | J1 | Anita (Callirrhoe) | `lines/anita/bezwaar_tegen_uw_parkeervergunni_5071b715.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #142 |
| 143 | J1 | Anita (Callirrhoe) | `lines/anita/dat_is_het_probleem_hij_was_eerd_0fc0ea2d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #143 |
| 144 | J1 | Anita (Callirrhoe) | `lines/anita/wat_jij_wil_1467a2b9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #144 |
| 145 | J1 | Anita (Callirrhoe) | `lines/anita/dat_is_niet_waarom_je_het_kiest_c4105067.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #145 |
| 146 | J1 | Anita (Callirrhoe) | `lines/anita/kasboekje_postzegels_twee_euro_t_b7f5e01f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #146 |
| 147 | J1 | Anita (Callirrhoe) | `lines/anita/ik_leer_vanavond_hoe_dit_werkt_e_474678c2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #147 |
| 148 | J1 | Anita (Callirrhoe) | `lines/anita/niet_vechten_lezen_dat_is_erger_bda93ed4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #148 |
| 149 | M13.1 | Anita (Callirrhoe) | `lines/anita/container_4471_het_schip_vertrek_f393f791.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #149 |
| 150 | M13.3 | Anita (Callirrhoe) | `lines/anita/en_alles_wat_we_gered_hebben_e2640fed.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #150 |
| 151 | M13.3 | Anita (Callirrhoe) | `lines/anita/ik_vroeg_niks_542f0da0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #151 |
| 152 | O6 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_tessa_jelle_terpstra_u_h_ff899445.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #152 |
| 153 | O6 | Anita (Callirrhoe) | `lines/anita/dat_was_een_misverstand_675a7785.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #153 |
| 154 | O6 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/er_zijn_geen_misverstanden_er_zi_120e687e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #154 |
| 155 | O6 | Anita (Callirrhoe) | `lines/anita/hij_is_niet_te_koop_89fdbb3b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #155 |
| 156 | O6 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/alles_is_te_koop_mevrouw_mijn_mo_4d920782.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #156 |
| 157 | O6 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/ik_wacht_foar_mem_b8173b36.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #157 |
| 158 | O6 | Anita (Callirrhoe) | `lines/anita/dat_weet_hij_ook_daarom_belt_hij_613a22c9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #158 |
| 159 | M14.1 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/goedemorgen_ik_heb_lammerts_huur_8241874e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #159 |
| 160 | M14.1 | Anita (Callirrhoe) | `lines/anita/met_het_vet_erin_939041f2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #160 |
| 161 | M14.1 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/dat_is_nu_inboedel_8169ac01.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #161 |
| 162 | M14.1 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mijn_deurwaarder_is_om_acht_uur__98212624.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #162 |
| 163 | M14.1 | Anita (Callirrhoe) | `lines/anita/eerste_aan_de_sluis_wint_fd32ea0e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #163 |
| 164 | M14.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_mijn_juristen_vinden_dat_3c4402b3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #164 |
| 165 | J2 | Anita (Callirrhoe) | `lines/anita/dat_is_omkoping_790ccdac.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #165 |
| 166 | J2 | Durk (Algieba) | `lines/durk/het_is_een_cadeau_baas_zegt_cade_ec2f1716.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #166 |
| 167 | J2 | Anita (Callirrhoe) | `lines/anita/een_cadeau_met_een_voorwaarde_is_b9fee969.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #167 |
| 168 | J2 | Douwe (Algenib) | `lines/douwe/contract_5e94d71a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #168 |
| 169 | J2 | Anita (Callirrhoe) | `lines/anita/dan_vraag_ik_het_helpt_u_ons_4b89b86b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #169 |
| 170 | J2 | Durk (Algieba) | `lines/durk/mijn_oma_bakt_ook_ze_zegt_een_ei_ce43823b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #170 |
| 171 | J2 | Anita (Callirrhoe) | `lines/anita/dan_weet_jouw_oma_meer_dan_jelle_519d1aa9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #171 |
| 172 | J2 | Douwe (Algenib) | `lines/douwe/zout_ffae330d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #172 |
| 173 | T3 | Anita (Callirrhoe) | `lines/anita/dan_gaan_wij_daar_ook_heen_roelf_70ced563.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #173 |
| 174 | T3 | Anita (Callirrhoe) | `lines/anita/van_het_meel_in_oma_s_lijstje_ze_9cff5bea.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #174 |
| 175 | M15.1 | Anita (Callirrhoe) | `lines/anita/jelle_wil_de_jury_kopen_met_een__ab5ea1db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #175 |
| 176 | M15.3 | Anita (Callirrhoe) | `lines/anita/twee_weg_dat_scheelt_ec0b2437.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #176 |
| 177 | M15.5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_tessa_een_moment_mijn_ju_c9e0a851.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #177 |
| 178 | M15.5 | Anita (Callirrhoe) | `lines/anita/een_dagvaarding_da0c7deb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #178 |
| 179 | M15.5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/een_bedankbriefje_voor_het_spand_48de1970.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #179 |
| 180 | M15.5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/twee_van_de_vier_de_mensen_kwame_8ad89388.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #180 |
| 181 | M15.5 | Anita (Callirrhoe) | `lines/anita/dat_was_niet_de_bedoeling_730245db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #181 |
| 182 | M15.5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/dat_staat_nergens_in_het_contrac_37b5e948.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #182 |
| 183 | M15.5 | Anita (Callirrhoe) | `lines/anita/nee_waar_hij_heen_gaat_gaat_de_b_f95c8176.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #183 |
| 184 | M15.6 | Anita (Callirrhoe) | `lines/anita/het_was_een_ongeluk_285b2a83.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #184 |
| 185 | M15.6 | Anita (Callirrhoe) | `lines/anita/kom_geert_wacht_f4b94b1d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #185 |
| 186 | M16.3 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/durk_mijn_juristen_willen_een_ra_93b62778.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #186 |
| 187 | M16.3 | Durk (Algieba) | `lines/durk/op_een_kermis_baas_919c3d11.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #187 |
| 188 | M16.3 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/ik_hoor_botsauto_s_ik_betaal_jul_09a965cb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #188 |
| 189 | M16.3 | Durk (Algieba) | `lines/durk/nee_baas_douwe_hang_op_79df57d8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #189 |
| 190 | M16.3 | Douwe (Algenib) | `lines/douwe/op_40b135e8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #190 |
| 191 | M16.3 | Anita (Callirrhoe) | `lines/anita/die_zeg_ik_als_ik_win_557bdc25.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #191 |
| 192 | M16.5 | Anita (Callirrhoe) | `lines/anita/niemand_won_want_iedereen_werd_e_e4b9d385.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #192 |
| 193 | M16.5 | Durk (Algieba) | `lines/durk/gelijkspel_is_ook_een_antwoord_v_f43c5f47.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #193 |
| 194 | M16.5 | Anita (Callirrhoe) | `lines/anita/waar_gaat_jelle_maandag_heen_36d4b9c7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #194 |
| 195 | M16.5 | Durk (Algieba) | `lines/durk/baas_rijdt_maandag_naar_veendam__f2f4ebea.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #195 |
| 196 | M16.5 | Durk (Algieba) | `lines/durk/gaat_mee_in_de_koffer_onder_het__74d4f500.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #196 |
| 197 | M16.5 | Anita (Callirrhoe) | `lines/anita/maandag_veendam_c8fbfb25.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #197 |
| 198 | M16.5 | Anita (Callirrhoe) | `lines/anita/heel_goed_maandag_e2be0e06.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #198 |
| 199 | B3.1 | Anita (Callirrhoe) | `lines/anita/wat_dan_3d929414.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #199 |
| 200 | B3.1 | Anita (Callirrhoe) | `lines/anita/ik_dacht_even_dat_het_iets_was_9fae63f7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #200 |
| 201 | B3.2 | Anita (Callirrhoe) | `lines/anita/vraag_van_de_dag_hoe_hoog_vliegt_92071e8d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #201 |
| 202 | B3.2 | Anita (Callirrhoe) | `lines/anita/dat_is_geen_hoogte_95160d63.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #202 |
| 203 | B3.3 | Anita (Callirrhoe) | `lines/anita/dit_nummer_ken_ik_zet_harder_195cabbc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #203 |
| 204 | B3.3 | Anita (Callirrhoe) | `lines/anita/jij_zingt_altijd_de_bas_3ad6dc54.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #204 |
| 205 | O7 | Anita (Callirrhoe) | `lines/anita/het_is_mooi_weer_9b860bdc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #205 |
| 206 | J3 | Anita (Callirrhoe) | `lines/anita/mam_c24c79db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #206 |
| 207 | J3 | Anita (Callirrhoe) | `lines/anita/het_is_een_bank_f61fec36.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #207 |
| 208 | J3 | Tammo (Orus) | `lines/tammo/en_377e47bb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #208 |
| 209 | R4.0 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/jelle_terpstra_ik_bied_een_klomp_7a576a14.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #209 |
| 210 | R4.0 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/dan_bied_ik_twee_klompen_foar_me_db55de9e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #210 |
| 211 | M17.3 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_tessa_mijn_schip_staat_v_69126ddc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #211 |
| 212 | M17.5 | Anita (Callirrhoe) | `lines/anita/ik_kijk_alleen_zo_n_wagen_is_voo_73cd3ffe.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #212 |
| 213 | M17.5 | Anita (Callirrhoe) | `lines/anita/dat_is_het_hele_vak_4d561b53.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #213 |
| 214 | J4 | Anita (Callirrhoe) | `lines/anita/femke_is_mijn_keeper_ze_weet_bij_8a3ddc0c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #214 |
| 215 | J4 | Rikus (Schedar) | `lines/rikus/ik_zeg_niks_f7f51bb4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #215 |
| 216 | J4 | Anita (Callirrhoe) | `lines/anita/een_voorschot_daar_komt_een_reke_b8c32c87.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #216 |
| 217 | J4 | Anita (Callirrhoe) | `lines/anita/het_is_geen_date_83db1ed9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #217 |
| 218 | J4 | Rikus (Schedar) | `lines/rikus/ik_zeg_niks_dat_is_ook_een_antwo_60939b18.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #218 |
| 219 | M18.1 | Anita (Callirrhoe) | `lines/anita/volgens_de_chat_van_rikus_zijn_w_870ec6e1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #219 |
| 220 | M18.1 | Anita (Callirrhoe) | `lines/anita/staat_in_het_logboek_dat_jelle_d_6f7a89d6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #220 |
| 221 | M18.3 | Anita (Callirrhoe) | `lines/anita/zodat_zij_niets_merkte_dat_is_vi_ac9bcc9a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #221 |
| 222 | M18.3 | Anita (Callirrhoe) | `lines/anita/voor_iedereen_die_ons_een_dief_n_18c3682f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #222 |
| 223 | M18.4 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/famke_dinsdag_naar_bourtange_voo_aca10cba.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #223 |
| 224 | M18.4 | Anita (Callirrhoe) | `lines/anita/ik_kom_5ca3e3df.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #224 |
| 225 | M18.4 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/doe_je_jas_aan_6911ac77.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #225 |
| 226 | M18.4 | Anita (Callirrhoe) | `lines/anita/dat_zei_ik_ook_28afc592.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #226 |
| 227 | O8 | Anita (Callirrhoe) | `lines/anita/geprint_53af6875.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #227 |
| 228 | N9 | Anita (Callirrhoe) | `lines/anita/dat_daar_is_de_grote_beer_3d6cc0a6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #228 |
| 229 | N9 | Anita (Callirrhoe) | `lines/anita/dan_is_dat_de_grote_beer_29602144.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #229 |
| 230 | N9 | Anita (Callirrhoe) | `lines/anita/je_kijkt_niet_1b09932d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #230 |
| 231 | N9 | Anita (Callirrhoe) | `lines/anita/dat_is_geen_beer_e724c885.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #231 |
| 232 | N9 | Anita (Callirrhoe) | `lines/anita/het_eet_je_sok_0a0adfc2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #232 |
| 233 | N9 | Anita (Callirrhoe) | `lines/anita/welterusten_tammo_cb733d40.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #233 |
| 234 | J5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_de_klem_zit_er_legaal_ar_990845b8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #234 |
| 235 | J5 | Anita (Callirrhoe) | `lines/anita/artikel_4_gaat_over_stoepen_22786e35.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #235 |
| 236 | J5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/artikel_4a_gaat_over_wielen_sind_3ea0c862.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #236 |
| 237 | J5 | Anita (Callirrhoe) | `lines/anita/dan_artikel_9_geen_klem_op_een_v_eb201956.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #237 |
| 238 | J5 | Anita (Callirrhoe) | `lines/anita/brief_vier_ik_heb_ze_allemaal_ge_7dc7515c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #238 |
| 239 | J5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/ja_moeder_omzet_ja_moeder_ab8c2242.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #239 |
| 240 | J5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/ze_houdt_hem_altijd_warm_df6e79f3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #240 |
| 241 | J5 | Anita (Callirrhoe) | `lines/anita/het_is_een_eierbal_6f84bade.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #241 |
| 242 | J5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/dit_is_niet_gebeurd_durk_de_limo_7bfedfc0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #242 |
| 243 | J5 | Douwe (Algenib) | `lines/douwe/eet_wat_9dab9fbc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #243 |
| 244 | M19.1 | Anita (Callirrhoe) | `lines/anita/de_machinist_is_omgekocht_hij_ee_361aad50.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #244 |
| 245 | M19.1 | Anita (Callirrhoe) | `lines/anita/in_jelles_salonrijtuig_zitten_de_352ea865.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #245 |
| 246 | M19.1 | Anita (Callirrhoe) | `lines/anita/wie_de_jury_koopt_hoeft_niet_te__1280e2d5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #246 |
| 247 | M19.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_een_eierbal_is_een_gesch_648f1be8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #247 |
| 248 | M19.3 | Anita (Callirrhoe) | `lines/anita/berend_wie_zit_de_jury_voor_als__d30fd68e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #248 |
| 249 | J6 | Beppe (Aoede) | `lines/beppe/ik_haw_sop_meinommen_jimme_ite_t_8e7ab6ec.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #249 |
| 250 | J6 | Beppe (Aoede) | `lines/beppe/wannear_trouwe_jim_19b03989.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #250 |
| 251 | J6 | Anita (Callirrhoe) | `lines/anita/beppe_wij_zijn_37bfc15d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #251 |
| 252 | J6 | Anita (Callirrhoe) | `lines/anita/overig_62ebc256.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #252 |
| 253 | J6 | Beppe (Aoede) | `lines/beppe/ik_freegje_mar_aa803b41.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #253 |
| 254 | J6 | Anita (Callirrhoe) | `lines/anita/je_lacht_naar_de_soep_68627b23.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #254 |
| 255 | M20.3 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mem_u_houdt_hem_vast_tot_ik_win__6743e798.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #255 |
| 256 | M20.3 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/er_is_geen_afspraak_jonge_429a0515.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #256 |
| 257 | M20.3 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/er_is_een_oma_16bfdd8a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #257 |
| 258 | M20.3 | Anita (Callirrhoe) | `lines/anita/van_de_jas_tammo_en_van_het_brie_4599ac54.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #258 |
| 259 | M20.3 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/altijd_bedanken_dat_heb_ik_hem_g_ed946aea.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #259 |
| 260 | M20.3 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/omdat_mijn_kleinzoon_gekke_dinge_dbaf8dde.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #260 |
| 261 | M20.3 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/in_1953_werd_ik_tweede_trijntje__c5dae79c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #261 |
| 262 | M20.5 | Anita (Callirrhoe) | `lines/anita/henks_zender_piept_onze_auto_sta_779a7d18.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #262 |
| 263 | M21.2 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/famke_de_trein_met_de_rode_auto__732f0c29.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #263 |
| 264 | M21.2 | Anita (Callirrhoe) | `lines/anita/dank_u_mevrouw_terpstra_db3640ff.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #264 |
| 265 | M21.2 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/zeg_maar_weer_mem_c341dbeb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #265 |
| 266 | B4 | Anita (Callirrhoe) | `lines/anita/ik_speelde_thuis_in_een_dorpstea_03583ba1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #266 |
| 267 | B4.1 | Anita (Callirrhoe) | `lines/anita/dat_ik_te_veel_praat_fab06448.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #267 |
| 268 | B4.2 | Anita (Callirrhoe) | `lines/anita/mijn_moeder_belde_anneke_ze_komt_0e422942.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #268 |
| 269 | B4.2 | Anita (Callirrhoe) | `lines/anita/alleen_lieke_mijn_nichtje_ze_is__0d7db67a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #269 |
| 270 | O9 | Anita (Callirrhoe) | `lines/anita/ik_heb_de_auto_31b5e933.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #270 |
| 271 | O9 | Anita (Callirrhoe) | `lines/anita/hoe_is_het_met_de_vrienden_van_o_64126236.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #271 |
| 272 | O9 | Anita (Callirrhoe) | `lines/anita/dat_doet_er_niet_toe_b58d6f56.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #272 |
| 273 | O9 | Anita (Callirrhoe) | `lines/anita/zonder_auto_sta_jij_nergens_5854a97f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #273 |
| 274 | O9 | Anita (Callirrhoe) | `lines/anita/ik_ook_9e34229c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #274 |
| 275 | M22.1 | Anita (Callirrhoe) | `lines/anita/wij_maken_van_de_escapade_de_sna_face5df1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #275 |
| 276 | M22.2 | Anita (Callirrhoe) | `lines/anita/dat_is_een_snackwagen_148b4aee.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #276 |
| 277 | M22.2 | Anita (Callirrhoe) | `lines/anita/het_is_een_voordeur_een_voordeur_46e80c72.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #277 |
| 278 | M22.2 | Anita (Callirrhoe) | `lines/anita/het_is_een_naam_83e303b3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #278 |
| 279 | M22.4 | Anita (Callirrhoe) | `lines/anita/ik_moet_je_iets_vertellen_ik_woo_126a1af3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #279 |
| 280 | M22.4 | Anita (Callirrhoe) | `lines/anita/mem_zegt_elke_zomer_jas_het_enig_4224b857.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #280 |
| 281 | M22.4 | Anita (Callirrhoe) | `lines/anita/de_snackwagen_is_een_thuis_op_wi_5845b0cb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #281 |
| 282 | M24.1 | Anita (Callirrhoe) | `lines/anita/de_vlag_hangt_precies_boven_de_p_6d464267.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #282 |
| 283 | M24.1 | Anita (Callirrhoe) | `lines/anita/foar_mem_voor_zijn_oma_b00b6df2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #283 |
| 284 | M24.1 | Anita (Callirrhoe) | `lines/anita/en_waarom_luistert_die_duif_naar_0316bafb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #284 |
| 285 | O10 | Anita (Callirrhoe) | `lines/anita/rekening_voor_het_gebruik_van_de_4d913bd8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #285 |
| 286 | O10 | Anita (Callirrhoe) | `lines/anita/genoeg_om_te_zien_dat_hij_bang_i_0df15930.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #286 |
| 287 | O10 | Anita (Callirrhoe) | `lines/anita/hij_stuurt_een_rekening_hij_belt_8df99fac.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #287 |
| 288 | O10 | Anita (Callirrhoe) | `lines/anita/zijn_vergunning_voor_morgen_even_c66a45e9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #288 |
| 289 | O10 | Anita (Callirrhoe) | `lines/anita/hij_stuurt_altijd_alles_in_driev_731de779.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #289 |
| 290 | M25.3 | Anita (Callirrhoe) | `lines/anita/je_biedt_geld_voor_iets_wat_geen_7a19a11a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #290 |
| 291 | M25.6 | Anita (Callirrhoe) | `lines/anita/mam_het_is_half_twaalf_6c86280f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #291 |
| 292 | M25.6 | Anita (Callirrhoe) | `lines/anita/wij_wonen_samen_5c1745e2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #292 |
| 293 | M26.2 | Anita (Callirrhoe) | `lines/anita/en_de_gouden_eierbal_20aae43c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #293 |
| 294 | M26.2 | Anita (Callirrhoe) | `lines/anita/berend_dit_is_het_logboek_van_wi_a98afefa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #294 |
| 295 | M26.2 | Berend Bos (Charon) | `lines/berend_bos/wat_staat_erin_c8558f62.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #295 |
| 296 | M26.2 | Anita (Callirrhoe) | `lines/anita/twaalf_augustus_jelle_nam_de_bal_a8322f69.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #296 |
| 297 | M26.2 | Anita (Callirrhoe) | `lines/anita/dan_zit_u_voor_cd8984b4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #297 |
| 298 | M26.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/een_notaris_gaat_boven_een_bissc_1bef3699.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #298 |
| 299 | M26.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/om_drie_uur_schrijf_ik_mij_in_al_3687e6d8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #299 |
| 300 | M26.4 | Anita (Callirrhoe) | `lines/anita/de_snackwagen_is_breder_dan_de_s_45a8c3b9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #300 |
| 301 | M26.5 | Anita (Callirrhoe) | `lines/anita/je_eigen_vergunning_jelle_deze_s_cc6911f1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #301 |
| 302 | M26.5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/voor_mijn_vlag_225598b4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #302 |
| 303 | M26.5 | Anita (Callirrhoe) | `lines/anita/op_een_evenement_staat_een_kraam_351df14c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #303 |
| 304 | M26.5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/jouw_duiven_hadden_geen_vergunni_71dc2491.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #304 |
| 305 | M26.6 | Anita (Callirrhoe) | `lines/anita/en_de_onze_df92f2e6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #305 |
| 306 | M26.13 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/dat_is_mijn_kleinzoon_1a39d933.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #306 |
| 307 | M26.7 | Anita (Callirrhoe) | `lines/anita/mien_jong_dat_duurde_vijf_jaar_d0a579f9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #307 |
| 308 | E1 | Anita (Callirrhoe) | `lines/anita/willemien_staat_weer_vooraan_haa_b37272c2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #308 |
| 309 | E1 | Anita (Callirrhoe) | `lines/anita/berend_heeft_de_foto_laten_inlij_624cdaff.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #309 |
| 310 | E1 | Anita (Callirrhoe) | `lines/anita/de_duiven_staan_weer_in_de_rij_1c7c2c25.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #310 |
| 311 | E2 | Anita (Callirrhoe) | `lines/anita/hij_zegt_niks_4a5de544.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #311 |
| 312 | E2 | Anita (Callirrhoe) | `lines/anita/hij_koopt_door_0a590412.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #312 |
| 313 | F1 | Anita (Callirrhoe) | `lines/anita/even_3c612c20.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #313 |
| 314 | F1 | Anita (Callirrhoe) | `lines/anita/dit_tekende_ik_in_het_cafe_op_ee_2fd0d0c3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #314 |
| 315 | F1 | Anita (Callirrhoe) | `lines/anita/het_is_een_tekening_met_een_luik_98572797.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #315 |
| 316 | F1 | Anita (Callirrhoe) | `lines/anita/zoals_jij_naar_wat_edc0e788.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #316 |
| 317 | F1 | Anita (Callirrhoe) | `lines/anita/er_zit_geen_motor_in_het_is_een__41800103.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #317 |
| 318 | F1 | Anita (Callirrhoe) | `lines/anita/een_snackwagen_geen_frietwagen_d_14e6c4dd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #318 |
| 319 | F1 | Anita (Callirrhoe) | `lines/anita/bel_henk_hij_had_een_luik_0b1e537c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #319 |
| 320 | F2 | Anita (Callirrhoe) | `lines/anita/wat_is_er_met_de_rem_b1c31760.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #320 |
| 321 | F2 | Anita (Callirrhoe) | `lines/anita/het_beslag_staat_vet_eieren_zout_95405f9c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #321 |
| 322 | F2 | Anita (Callirrhoe) | `lines/anita/doe_de_friteuse_aan_b9492f7c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #322 |
| 323 | F2 | Anita (Callirrhoe) | `lines/anita/eerst_een_knop_dan_een_gebed_6f7dc500.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #323 |
| 324 | F2 | Anita (Callirrhoe) | `lines/anita/ik_kan_hem_laten_smaken_ik_kan_h_ddefb23e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #324 |
| 325 | F2 | Anita (Callirrhoe) | `lines/anita/dus_we_blijven_bij_elkaar_e4a682e3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #325 |
| 326 | F2 | Anita (Callirrhoe) | `lines/anita/sinds_wanneer_231b776e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #326 |
| 327 | F3 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/dat_ze_eerst_wil_eten_ze_is_een__9c0aefa3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #327 |
| 328 | F3 | Anita (Callirrhoe) | `lines/anita/jij_bent_van_beide_jij_bent_de_v_0b90513a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #328 |
| 329 | F3 | Douwe (Algenib) | `lines/douwe/mogen_wij_ook_soep_6df5bd1f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #329 |
| 330 | F3 | Durk (Algieba) | `lines/durk/wij_passen_er_niet_in_30d75135.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #330 |
| 331 | F3 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/dan_eet_je_in_de_gang_op_een_fri_7389ac67.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #331 |
| 332 | F3 | Anita (Callirrhoe) | `lines/anita/dat_is_het_menu_ee_n_kom_twee_om_27496e75.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #332 |
| 333 | F4 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/ee_n_eierbal_met_mosterd_f74ad044.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #333 |
| 334 | F4 | Anita (Callirrhoe) | `lines/anita/je_staat_achteraan_fb20724e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #334 |
| 335 | F4 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/ik_had_een_vergunning_om_voor_te_2f2f6916.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #335 |
| 336 | F4 | Durk (Algieba) | `lines/durk/rij_maar_gewoon_baas_e8638fc6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #336 |
| 337 | F4 | Douwe (Algenib) | `lines/douwe/het_werkt_he_ef2b3a1a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #337 |
| 338 | F4 | Anita (Callirrhoe) | `lines/anita/je_mag_hem_e_e_n_klap_geven_add30bf0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #338 |
| 339 | F4 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/dat_staat_niet_in_de_vergunning_bba98101.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #339 |
| 340 | F4 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mems_mosterd_van_1953_zij_zegt_d_b98d4023.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #340 |
| 341 | F4 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/ik_zei_niet_mogen_ik_zei_ik_heb__598610e1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #341 |
| 342 | F4 | Anita (Callirrhoe) | `lines/anita/een_euro_vijftig_dat_is_de_prijs_3c067a3d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #342 |
| 343 | F4 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/dat_is_de_eerste_prijs_die_ik_ni_ae2787d4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #343 |
| 344 | F5 | Anita (Callirrhoe) | `lines/anita/is_dit_een_afspraak_64fdfa97.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #344 |
| 345 | F5 | Anita (Callirrhoe) | `lines/anita/er_hangt_een_lijstje_uit_je_zak_7f5e1575.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #345 |
| 346 | F5 | Anita (Callirrhoe) | `lines/anita/wat_stond_er_51b3b9d8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #346 |
| 347 | F5 | Anita (Callirrhoe) | `lines/anita/waar_zet_ik_mijn_hand_67805acb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #347 |
| 348 | F5 | Anita (Callirrhoe) | `lines/anita/zijn_we_nu_een_stel_13a9cf01.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #348 |
| 349 | F5 | Anita (Callirrhoe) | `lines/anita/wat_wil_jij_eigenlijk_b33ed90e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #349 |
| 350 | F5 | Anita (Callirrhoe) | `lines/anita/dat_waren_er_drie_kon_meer_b92d25c7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #350 |
| 351 | O11 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_tessa_ee_n_eierbal_met_m_c927fd99.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #351 |
| 352 | O11 | Anita (Callirrhoe) | `lines/anita/de_snackwagen_staat_op_de_vismar_c9043c3a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #352 |
| 353 | O11 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mijn_assistent_haalt_hem_ik_beta_5432ae72.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #353 |
| 354 | O11 | Anita (Callirrhoe) | `lines/anita/uit_een_klomp_f5444363.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #354 |
| 355 | O11 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mijn_juristen_kijken_naar_die_kl_99e5df1b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #355 |
| 356 | O11 | Anita (Callirrhoe) | `lines/anita/een_eierbal_voor_zijn_oma_d6b4453e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #356 |
| 357 | M29.2 | Anita (Callirrhoe) | `lines/anita/en_de_eierballen_die_staan_er_mo_44402c57.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #357 |
| 358 | M29.2 | Tammo (Orus) | `lines/tammo/een_eierbal_dat_is_anders_e75b2145.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #358 |
| 359 | M30.1 | Anita (Callirrhoe) | `lines/anita/zeven_mensen_die_niet_weglopen_ebef4e4a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #359 |
| 360 | M30.1 | Anita (Callirrhoe) | `lines/anita/ik_weet_niet_wat_ik_moet_zeggen_c2047779.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #360 |
| 361 | M30.6 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/dat_pand_ken_ik_ik_wacht_tot_de__59f83380.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #361 |
| 362 | O12 | Anita (Callirrhoe) | `lines/anita/wat_nu_64c9b123.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #362 |
| 363 | O12 | Anita (Callirrhoe) | `lines/anita/waarheen_186b2466.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #363 |
| 364 | O12 | Anita (Callirrhoe) | `lines/anita/een_pand_de_bieten_veendam_een_t_9b2335f1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #364 |
| 365 | O12 | Anita (Callirrhoe) | `lines/anita/samen_fe4daed9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #365 |
| 366 | F6 | Anita (Callirrhoe) | `lines/anita/eenenveertig_tegen_e_e_n_d2478ac8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #366 |
| 367 | F6 | Anita (Callirrhoe) | `lines/anita/wij_hebben_een_wagen_een_standpl_5dfebd57.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #367 |
| 368 | F6 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_tessa_ik_hoor_dat_u_een__8d74ac8a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #368 |
| 369 | F6 | Anita (Callirrhoe) | `lines/anita/wedstrijd_7affbd1a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #369 |
| 370 | F6 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/wedstrijd_foar_mem_cb26881d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #370 |
| 371 | F6 | Anita (Callirrhoe) | `lines/anita/en_de_wagen_hij_rijdt_tammo_560a2623.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #371 |
| 372 | F6 | Anita (Callirrhoe) | `lines/anita/eerst_de_hereweg_741894b3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #372 |
| 373 | Missie-cutscenes | Tammo (Orus) | `lines/tammo/hij_hangt_een_vlag_aan_onze_tore_180bffcc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #373 |
| 374 | Missie-cutscenes | Anita (Callirrhoe) | `lines/anita/een_oefenbal_hij_oefent_hoe_hij__b4840ae1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #374 |
| 375 | Missie-cutscenes | Tammo (Orus) | `lines/tammo/tige_tank_foar_de_auto_j_de_snac_bece8bc9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #375 |
| 376 | Missie-cutscenes | Tammo (Orus) | `lines/tammo/iemand_uit_friesland_dat_was_zij_8e0a74d6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #376 |
| 377 | Intro-montage | Tammo (Orus) | `lines/tammo/dan_rijdt_hij_nauwelijks_voor_jo_6d30f2bd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #377 |
| 378 | Missie-intro (terugval) | Tammo (Orus) | `lines/tammo/gronings_ontzet_de_noordelijke_s_c980a213.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #378 |
| 379 | Missie-intro (terugval) | Anita (Callirrhoe) | `lines/anita/gronings_ontzet_de_noordelijke_s_60a120cf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #379 |
| 380 | Na het verhaal (intro) | Anita (Callirrhoe) | `lines/anita/onze_eigen_snackwagen_met_kentek_4ef39a32.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #380 |
| 381 | Telefoon (gesprekken) | Anita (Callirrhoe) | `lines/anita/en_de_snackwagen_is_van_ons_hij__2e025aac.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #381 |
| 382 | Berichten (app) | Ubbo (Laomedeia) | `sms/ubbo/alles_gedaan_grunn_is_van_jou_de_ef9cfbeb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #382 |
| 383 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/ver_weg_he_open_de_kaart_daar_be_8bf3f56b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #383 |
| 384 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/ver_weg_he_open_de_kaart_daar_be_ee6a704c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #384 |
| 385 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/dat_is_een_heel_eind_via_de_kaar_5774d079.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #385 |
| 386 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/dat_is_een_heel_eind_via_de_kaar_11802675.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #386 |
| 387 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/ver_weg_he_er_rijdt_ook_een_bus__f3131ee5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #387 |
| 388 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/ver_weg_he_er_rijdt_ook_een_bus__90efd1c6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #388 |
| 389 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/wist_je_dat_het_ook_met_het_ov_k_b4f8fbae.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #389 |
| 390 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/wist_je_dat_het_ook_met_het_ov_k_db6f7b65.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #390 |
| 391 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/geen_zin_om_zo_ver_te_rijden_pak_52a181c4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #391 |
| 392 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/geen_zin_om_zo_ver_te_rijden_pak_e095e9f5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #392 |
| 393 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/instappen_met_e_bij_de_kop_w_is__9bbe11a8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #393 |
| 394 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/blijf_op_de_noordwal_staan_tot_h_c4513247.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #394 |
| 395 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/durk_en_douwe_houden_je_bezig_na_34ed86d4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #395 |
| 396 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/durk_en_douwe_houden_je_bezig_na_1f297e34.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #396 |
| 397 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/durk_en_douwe_springen_mee_aanlo_12c36149.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #397 |
| 398 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/durk_en_douwe_springen_mee_aanlo_ea108637.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #398 |
| 399 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/mem_en_oma_trijntje_zitten_in_de_f06b7018.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #399 |
| 400 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/mem_en_oma_trijntje_zitten_in_de_b9e248a6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #400 |
| 401 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/houd_de_deur_van_de_kruitkelder__c4aaa50f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #401 |
| 402 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/houd_de_deur_van_de_kruitkelder__cc44a6c6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #402 |
| 403 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_tweede_deur_geeft_mee_rennen_c1608fb9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #403 |
| 404 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_tweede_deur_geeft_mee_rennen_8750afb8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #404 |
| 405 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/houd_ook_de_tweede_deur_daarna_d_c0796402.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #405 |
| 406 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/houd_ook_de_tweede_deur_daarna_d_a921c676.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #406 |
| 407 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_derde_deur_de_bal_blijft_hier_5c29331b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #407 |
| 408 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_derde_deur_de_bal_blijft_hier_256b1e2b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #408 |
| 409 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_laatste_deur_daarna_naar_de_p_51cf9b30.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #409 |
| 410 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_laatste_deur_daarna_naar_de_p_c7e152c7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #410 |
| 411 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/links_is_vrij_naar_de_poort_bere_bf9402a5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #411 |
| 412 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/links_is_vrij_naar_de_poort_bere_2916f3a9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #412 |
| 413 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_naspeling_is_klaar_blijf_even_f1dc5452.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #413 |
| 414 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_naspeling_is_klaar_blijf_even_c59705d5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #414 |
| 415 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_kras_van_de_wagon_zit_op_de_e_947f02ce.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #415 |
| 416 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_kras_van_de_wagon_zit_op_de_e_57099ad9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #416 |
| 417 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/mems_appje_de_trein_met_de_rode__47a5cae7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #417 |
| 418 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/mems_appje_de_trein_met_de_rode__03403f60.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #418 |
| 419 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_trein_rijdt_druk_op_spatie_om_e87508db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #419 |
| 420 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_trein_rijdt_druk_op_spatie_om_2d4f0e71.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #420 |
| 421 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/jelles_mannen_staan_op_de_wagon__7c76ec5e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #421 |
| 422 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/jelles_mannen_staan_op_de_wagon__0f9ae746.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #422 |
| 423 | Keuzegesprekken | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/u_kunt_de_auto_redden_of_de_bal__4c61688a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #423 |
| 424 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/oma_heeft_alle_vrienden_met_hun__9e75fa96.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #424 |
| 425 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/oma_heeft_alle_vrienden_met_hun__528b3c1d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #425 |
| 426 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/blijf_bij_de_wagen_henk_bouwt_he_23021a92.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #426 |
| 427 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/blijf_bij_de_wagen_henk_bouwt_he_ab31ccde.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #427 |
| 428 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/henk_zaagt_een_gat_in_de_zijkant_6eeaa325.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #428 |
| 429 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/henk_zaagt_een_gat_in_de_zijkant_573b88df.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #429 |
| 430 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/instappen_tinus_wijst_naar_het_w_e086fa47.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #430 |
| 431 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/instappen_tinus_wijst_naar_het_w_f2bed051.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #431 |
| 432 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/gas_sturen_niet_vastlopen_henk_w_1ad93cad.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #432 |
| 433 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/gas_sturen_niet_vastlopen_henk_w_2c595403.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #433 |
| 434 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/houd_de_snelheid_erin_in_de_modd_37cff950.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #434 |
| 435 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/houd_de_snelheid_erin_in_de_modd_7c1d2904.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #435 |
| 436 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/rij_hem_de_modder_in_als_de_acht_feed3d3d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #436 |
| 437 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/rij_hem_de_modder_in_als_de_acht_149308d5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #437 |
| 438 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/vast_tinus_haakt_de_trekker_aan__1c10146f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #438 |
| 439 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/vast_tinus_haakt_de_trekker_aan__7b1fee60.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #439 |
| 440 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/rij_voorop_de_colonne_volgt_zola_91ac2b9b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #440 |
| 441 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/rij_voorop_de_colonne_volgt_zola_5ebadc50.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #441 |
| 442 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/ee_n_vriend_rijdt_vlak_naast_jul_7596b732.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #442 |
| 443 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/ee_n_vriend_rijdt_vlak_naast_jul_d2c7de23.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #443 |
| 444 | Keuzegesprekken | Anita (Callirrhoe) | `lines/anita/alle_vrienden_rijden_mee_maar_e__65994f51.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #444 |
| 445 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/instappen_tessa_zei_wij_voorop_010388aa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #445 |
| 446 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/rij_voorop_naar_aduard_wie_te_ve_b6a4af07.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #446 |
| 447 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/rij_voorop_naar_aduard_wie_te_ve_fde26a4b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #447 |
| 448 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/wubbo_opent_de_brug_op_afstand_m_6ac8b600.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #448 |
| 449 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/wubbo_opent_de_brug_op_afstand_m_fd276ec5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #449 |
| 450 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/nog_vijf_kilometer_de_hele_colon_3f1e45dc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #450 |
| 451 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/nog_vijf_kilometer_de_hele_colon_083b1d83.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #451 |
| 452 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/bak_in_oma_s_keuken_ei_zout_grof_8245aa8b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #452 |
| 453 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/bak_in_oma_s_keuken_ei_zout_grof_f29c248d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #453 |
| 454 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/oma_s_volgorde_eerst_het_ei_dan__ec64947f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #454 |
| 455 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/oma_s_volgorde_eerst_het_ei_dan__ac2e806f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #455 |
| 456 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/kwart_voor_drie_de_limo_rijdt_na_964ada11.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #456 |
| 457 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/kwart_voor_drie_de_limo_rijdt_na_a46268a8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #457 |
| 458 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/oma_s_volgorde_ei_zout_grof_meel_f0d16170.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #458 |
| 459 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/oma_s_volgorde_ei_zout_grof_meel_a14dbbd9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #459 |
| 460 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/kwart_voor_drie_instappen_de_lim_49ac03e7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #460 |
| 461 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/kwart_voor_drie_instappen_de_lim_e776dbd1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #461 |
| 462 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/berend_proeft_voor_het_laatst_ze_62b01348.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #462 |
| 463 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/berend_proeft_voor_het_laatst_ze_2c906a7a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #463 |
| 464 | Keuzegesprekken | Berend Bos (Charon) | `lines/berend_bos/wat_maakt_deze_eierbal_gronings__e0a308e6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #464 |
| 465 | Keuzegesprekken | Berend Bos (Charon) | `lines/berend_bos/en_waarom_moet_de_standplaats_na_cb573f08.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #465 |
| 466 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/willemiens_huis_in_loppersum_boe_f98990b9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #466 |
| 467 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/willemiens_huis_in_loppersum_boe_c2e58fec.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #467 |
| 468 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/boeken_in_kleine_dozen_blijf_bij_fdc6386a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #468 |
| 469 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/boeken_in_kleine_dozen_blijf_bij_63e22e0e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #469 |
| 470 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/breekbaar_in_de_krant_blijf_in_d_7f7b7f24.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #470 |
| 471 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/breekbaar_in_de_krant_blijf_in_d_efaa96a3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #471 |
| 472 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_kat_wil_nergens_in_blijf_bij__68e4842a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #472 |
| 473 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_kat_wil_nergens_in_blijf_bij__92e13d56.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #473 |
| 474 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_dozen_staan_klaar_naar_de_ver_bac6a78e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #474 |
| 475 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_dozen_staan_klaar_naar_de_ver_596f56a7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #475 |
| 476 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_verhuisbus_staat_voor_het_hui_1a6213e6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #476 |
| 477 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_verhuisbus_staat_voor_het_hui_c10d0560.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #477 |
| 478 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/instappen_tammo_rijdt_rustig_7b1e92a9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #478 |
| 479 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/rustig_rijden_niet_om_de_spullen_39698032.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #479 |
| 480 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/rustig_rijden_niet_om_de_spullen_8234dbba.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #480 |
| 481 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/een_buurtfeest_op_het_erf_in_lop_2616ebd4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #481 |
| 482 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/een_buurtfeest_op_het_erf_in_lop_50020713.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #482 |
| 483 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/tafels_op_het_erf_blijf_staan_to_c000632a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #483 |
| 484 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/tafels_op_het_erf_blijf_staan_to_aa717e1c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #484 |
| 485 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_foto_hangt_in_de_gang_waar_je_e13e3c7c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #485 |
| 486 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_foto_hangt_in_de_gang_waar_je_8d7e09ba.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #486 |
| 487 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/een_hooiberg_op_de_heide_ten_noo_1080b90b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #487 |
| 488 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/een_hooiberg_op_de_heide_ten_noo_a6ef2d47.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #488 |
| 489 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/aanvallen_eerst_de_gracht_lammer_21ccc193.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #489 |
| 490 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/aanvallen_eerst_de_gracht_lammer_9d72285e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #490 |
| 491 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/wubbo_staat_bij_de_lier_hij_open_70d8aa4a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #491 |
| 492 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/wubbo_staat_bij_de_lier_hij_open_60e1ea73.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #492 |
| 493 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/boven_jullie_komt_meel_hoofd_oml_05122999.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #493 |
| 494 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/boven_jullie_komt_meel_hoofd_oml_dc71c330.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #494 |
| 495 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/blijf_op_het_bolwerk_staan_tot_d_91f0e960.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #495 |
| 496 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/blijf_op_het_bolwerk_staan_tot_d_0b423f46.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #496 |
| 497 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/het_tweede_bolwerk_de_duiven_lui_4209ae51.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #497 |
| 498 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/het_derde_bolwerk_tinus_trekt_de_6d7ab59c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #498 |
| 499 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/het_derde_bolwerk_tinus_trekt_de_95651283.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #499 |
| 500 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/blijf_op_het_bolwerk_staan_tot_d_23d6f271.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #500 |
| 501 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/blijf_op_het_bolwerk_staan_tot_d_9a253293.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #501 |
| 502 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/drie_vlaggen_naar_de_poort_beren_1a9344a6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #502 |
| 503 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/drie_vlaggen_naar_de_poort_beren_a868d1cf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #503 |
| 504 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_snackwagen_staat_open_iederee_0a1ce2d5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #504 |
| 505 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_snackwagen_staat_open_iederee_38820ad8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #505 |
| 506 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_rij_staat_binnen_achter_de_gl_bb1d8947.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #506 |
| 507 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_rij_staat_binnen_achter_de_gl_0743bdf5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #507 |
| 508 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/blijf_in_de_rij_staan_tot_4117_w_679bfc91.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #508 |
| 509 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/blijf_in_de_rij_staan_tot_4117_w_830e2386.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #509 |
| 510 | Keuzegesprekken | Loketbediende (Autonoe) | `lines/loketbediende/welk_formulier_had_u_nodig_7c955923.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #510 |
| 511 | Keuzegesprekken | Loketbediende (Autonoe) | `lines/loketbediende/en_waar_haalt_u_de_stempel_0834d0ca.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #511 |
| 512 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/alles_bij_elkaar_nu_inschrijven__c1c11d35.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #512 |
| 513 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/alles_bij_elkaar_nu_inschrijven__8d8ac02a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #513 |
| 514 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/eerst_de_grote_markt_vijftienhon_424120cf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #514 |
| 515 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/eerst_de_grote_markt_vijftienhon_affd2864.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #515 |
| 516 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/in_de_kooi_van_de_kraan_lammert__1683774a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #516 |
| 517 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/in_de_kooi_van_de_kraan_lammert__2c8123c9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #517 |
| 518 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/van_boven_zag_je_hem_de_blauwe_n_f4086149.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #518 |
| 519 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/van_boven_zag_je_hem_de_blauwe_n_ff7df391.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #519 |
| 520 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/papieren_eruit_papieren_erin_eve_b99da06f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #520 |
| 521 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/papieren_eruit_papieren_erin_eve_b9751011.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #521 |
| 522 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/klaar_terug_naar_de_kade_voor_he_0e3246ab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #522 |
| 523 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/klaar_terug_naar_de_kade_voor_he_52a29308.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #523 |
| 524 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_auto_blijft_bij_de_sluis_lamm_2a083678.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #524 |
| 525 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_auto_blijft_bij_de_sluis_lamm_447f169f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #525 |
| 526 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/instappen_de_trekker_limo_van_je_d9cbd146.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #526 |
| 527 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/instappen_de_trekker_limo_van_je_80c774db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #527 |
| 528 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/naar_de_sluis_van_delfzijl_over__24b97c12.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #528 |
| 529 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/naar_de_sluis_van_delfzijl_over__f2ecbc57.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #529 |
| 530 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/roelfiens_rode_gewasspuiter_staa_e9f47e39.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #530 |
| 531 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/opstijgen_en_laag_over_het_graan_5ebb9c06.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #531 |
| 532 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/opstijgen_en_laag_over_het_graan_4b4f21a9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #532 |
| 533 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/spandoek_opgepikt_laag_blijven_n_028b69f4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #533 |
| 534 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/spandoek_opgepikt_laag_blijven_n_d71247b8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #534 |
| 535 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/ze_lezen_het_door_de_rij_kramen_3b76a234.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #535 |
| 536 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/ze_lezen_het_door_de_rij_kramen_6143a3f3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #536 |
| 537 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/voorbij_de_kermis_nu_terug_naar__959c5f21.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #537 |
| 538 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/voorbij_de_kermis_nu_terug_naar__89cd0799.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #538 |
| 539 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/terug_naar_de_strook_gas_terug_m_4167ca05.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #539 |
| 540 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/terug_naar_de_strook_gas_terug_m_7053dbe9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #540 |
| 541 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/podium_in_de_kiezelrace_dan_vert_48887f24.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #541 |
| 542 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/podium_in_de_kiezelrace_dan_vert_1d8eb0c2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #542 |
| 543 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/instappen_de_tankwagen_staat_bij_ce5b97f5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #543 |
| 544 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/instappen_de_tankwagen_staat_bij_325c65a4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #544 |
| 545 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/instappen_bij_dijkstra_spatie_om_64a6e3c8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #545 |
| 546 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/instappen_bij_dijkstra_spatie_om_101e075b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #546 |
| 547 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/loop_langs_drie_tenten_en_drink__8059ba59.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #547 |
| 548 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/loop_langs_drie_tenten_en_drink__0f02c918.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #548 |
| 549 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/die_pan_staat_hier_al_sinds_gist_0c3ca9ea.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #549 |
| 550 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dat_is_een_pan_met_een_verhaal_b4ad0266.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #550 |
| 551 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/het_verhaal_heet_wie_wast_hem_af_1e74667c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #551 |
| 552 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_morgen_06f3414d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #552 |
| 553 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/wie_neemt_de_badkamer_als_eerste_336b767f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #553 |
| 554 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ik_ik_sta_er_al_drie_minuten_voo_e8f17e9b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #554 |
| 555 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/je_zit_hier_aan_tafel_fea6e5c5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #555 |
| 556 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/in_gedachten_cd1938da.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #556 |
| 557 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/wie_heeft_mijn_yoghurt_opgegeten_bbae9fba.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #557 |
| 558 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/er_stond_geen_naam_op_b7efcbb8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #558 |
| 559 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/er_stond_tessa_op_b9de03ab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #559 |
| 560 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_las_dat_als_een_suggestie_94c081ce.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #560 |
| 561 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/koffie_f36dc5b3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #561 |
| 562 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ja_eh_nee_ja_c9337043.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #562 |
| 563 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_zet_er_twee_neer_dan_kies_jij_841b8af1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #563 |
| 564 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_is_eigenlijk_heel_redelijk_90a24600.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #564 |
| 565 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ik_heb_een_schoonmaakrooster_gem_a2c5009f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #565 |
| 566 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_zie_mijn_naam_zeven_keer_4c93519f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #566 |
| 567 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ik_zie_jouw_pan_zeven_keer_f860a899.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #567 |
| 568 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dat_is_een_eerlijke_ruil_538fc4bb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #568 |
| 569 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/je_wekker_ging_om_zes_uur_af_b3a0faa4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #569 |
| 570 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_weet_ik_ik_leg_hem_ver_weg_15c690f5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #570 |
| 571 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dat_wist_de_hele_flat_nu_ook_036f0bde.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #571 |
| 572 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dan_zijn_we_eerlijk_tegen_elkaar_27338a29.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #572 |
| 573 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/roerei_of_spiegelei_fbb82d0d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #573 |
| 574 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/wat_wordt_het_als_jij_er_verstan_c5e35f06.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #574 |
| 575 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/roerei_dan_zie_je_niet_dat_het_m_6fa95b47.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #575 |
| 576 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ik_eet_het_toch_op_5923d272.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #576 |
| 577 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/proef_eens_f7f31f40.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #577 |
| 578 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/het_is_goed_97201844.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #578 |
| 579 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_zeg_je_altijd_1f2a3223.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #579 |
| 580 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/omdat_het_altijd_goed_is_d92e590d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #580 |
| 581 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/je_hebt_een_kruimel_op_je_kin_1e0cca39.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #581 |
| 582 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/waar_c8edf50c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #582 |
| 583 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/links_nee_jouw_links_6b2fbb5a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #583 |
| 584 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/nu_zit_hij_op_je_mouw_b7a485bc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #584 |
| 585 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/je_haar_zit_anders_644e671d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #585 |
| 586 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/het_is_dinsdag_a7479158.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #586 |
| 587 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/het_staat_je_goed_op_dinsdag_d90c71d7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #587 |
| 588 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dank_je_eet_je_boterham_8ee2f095.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #588 |
| 589 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_heb_een_eierbal_gebakken_voor_cc47fdbb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #589 |
| 590 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/hij_is_vierkant_66cb3b09.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #590 |
| 591 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/hij_is_creatief_edae7e63.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #591 |
| 592 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ik_eet_hem_toch_op_voor_de_vrien_d412758c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #592 |
| 593 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/als_we_winnen_wat_dan_13f04b08.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #593 |
| 594 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dan_krijgt_de_frietwagen_een_nie_8a2c5b1e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #594 |
| 595 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/een_lamp_50e0b284.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #595 |
| 596 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/een_grote_zodat_jij_hem_ziet_d9bbeb81.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #596 |
| 597 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/wat_kijken_we_db231066.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #597 |
| 598 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/maakt_niet_uit_6bb74591.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #598 |
| 599 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/omdat_jij_naast_me_zit_be3522fc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #599 |
| 600 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_was_aardig_zet_maar_iets_aan_696edcd0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #600 |
| 601 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dit_nummer_ken_ik_e32aa27a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #601 |
| 602 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dans_je_mee_8a0a7d71.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #602 |
| 603 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/in_de_keuken_5747ce43.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #603 |
| 604 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/overal_waar_jij_staat_3baa671e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #604 |
| 605 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/goedemorgen_9cc8e12a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #605 |
| 606 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/koffie_staat_klaar_027f0493.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #606 |
| 607 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/je_bent_de_beste_2f6f533c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #607 |
| 608 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/wacht_ik_moet_even_gaan_zitten_c976ceff.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #608 |
| 609 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/eerst_de_vismarkt_c7c3faaa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #609 |
| 610 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dan_de_kade_7aff1578.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #610 |
| 611 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/en_daarna_95bcc718.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #611 |
| 612 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/daarna_iets_met_jou_08fdcd3e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #612 |
| 613 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_staat_al_op_de_lijst_b670c12b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #613 |
| 614 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/met_melk_niet_te_veel_2d33f190.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #614 |
| 615 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/je_weet_het_nog_43472179.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #615 |
| 616 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ik_weet_alles_van_jou_cd14dfdc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #616 |
| 617 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dat_is_veel_6de340a5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #617 |
| 618 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/het_is_tweee_ntwintig_graden_631b8d35.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #618 |
| 619 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_zeg_je_elke_dag_439b008d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #619 |
| 620 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/omdat_ik_het_fijn_vind_fccf497e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #620 |
| 621 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/het_is_stil_in_de_flat_ce68a564.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #621 |
| 622 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/niemand_zoekt_ons_ac33b0eb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #622 |
| 623 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_is_nieuw_e5b8edc6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #623 |
| 624 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_wen_eraan_f6cb9f1f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #624 |
| 625 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/roerei_zoals_jij_het_wilt_04f2dcd3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #625 |
| 626 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/zonder_dat_het_mislukt_is_4321bb33.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #626 |
| 627 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dat_was_de_oefening_43009ff6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #627 |
| 628 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/en_dit_is_de_les_42c3b3a8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #628 |
| 629 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/hoeveel_woorden_waren_het_ook_al_d34c455f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #629 |
| 630 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/vijf_98324fee.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #630 |
| 631 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/zeg_ze_nog_eens_26f4f9ff.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #631 |
| 632 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/je_wast_af_2da188bd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #632 |
| 633 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_zei_toch_morgen_597766da.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #633 |
| 634 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_was_twee_weken_geleden_38580660.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #634 |
| 635 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_ben_een_man_van_mijn_woord_22c2d0db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #635 |
| 636 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/wat_doen_we_vandaag_a4252802.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #636 |
| 637 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/niks_a0b352a1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #637 |
| 638 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/niks_is_een_goed_plan_073a6a22.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #638 |
| 639 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dan_is_het_al_gelukt_390e85a2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #639 |
| 640 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/rikus_zegt_dat_het_zomer_blijft_f3e0692a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #640 |
| 641 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/rikus_heeft_altijd_gelijk_0b3dddc3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #641 |
| 642 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_zegt_hij_zelf_ook_5ac623dd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #642 |
| 643 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dan_zal_het_wel_kloppen_4bcf6172.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #643 |
| 644 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/welkom_in_de_euroborg_de_zon_sch_84ac7958.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #644 |
| 645 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/goedemiddag_allemaal_het_is_zome_9a005ca6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #645 |
| 646 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/daar_komen_de_spelers_het_veld_o_bb1d52dc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #646 |
| 647 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_tribunes_zitten_vol_nou_ja_vo_3ed21133.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #647 |
| 648 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/hier_zijn_we_dan_elf_tegen_elf_e_79bcc99f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #648 |
| 649 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_scheidsrechter_kijkt_op_zijn__74db8827.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #649 |
| 650 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_heb_er_zin_in_hilbrand_het_gr_4e2c2c5e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #650 |
| 651 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/let_op_de_middenmoot_vandaag_daa_9d841f89.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #651 |
| 652 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/mooie_dag_voor_voetbal_slechte_d_7f8a8fc2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #652 |
| 653 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_zeg_de_eerste_tien_minuten_zi_a6046190.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #653 |
| 654 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/oma_trijntje_zit_op_haar_vaste_p_a925caf7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #654 |
| 655 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/en_we_zijn_weer_begonnen_de_twee_2ceccfae.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #655 |
| 656 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_spelers_staan_weer_klaar_alle_d34a8cbc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #656 |
| 657 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/daar_gaan_we_weer_de_thermosfles_9335d95c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #657 |
| 658 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/tweede_helft_wie_heeft_in_de_rus_2e0db135.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #658 |
| 659 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/in_de_rust_wordt_het_gewonnen_ze_880341c5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #659 |
| 660 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_ben_benieuwd_wie_er_nog_benen_76b020bf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #660 |
| 661 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/nu_komt_het_op_conditie_aan_en_o_e012734a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #661 |
| 662 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/dit_is_wat_we_noemen_een_groning_0a8155b5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #662 |
| 663 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_echte_derby_vandaag_dat_is_z_ee2d29de.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #663 |
| 664 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/het_is_een_derby_de_tribunes_zij_2ca05dc6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #664 |
| 665 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/bij_een_derby_zijn_de_regels_dez_e8cb0596.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #665 |
| 666 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_heb_in_mijn_tijd_drie_derby_s_20309283.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #666 |
| 667 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/niemand_wil_de_buurman_laten_win_b3cfb1c4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #667 |
| 668 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/wat_een_kans_hij_kon_alles_doen__bc27a4d2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #668 |
| 669 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/gevaar_dat_scheelde_niet_veel_3198c3cb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #669 |
| 670 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/dat_had_een_doelpunt_moeten_zijn_12c03d0a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #670 |
| 671 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_grote_kans_en_de_bal_gaat_ne_6f591e8d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #671 |
| 672 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/dichtbij_heel_dichtbij_e649364e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #672 |
| 673 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/daar_komt_een_schot_net_niet_net_aa417887.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #673 |
| 674 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/bijna_bijna_de_tribunes_zuchten_2da616ac.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #674 |
| 675 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/wat_een_mogelijkheid_maar_de_afw_327dccc1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #675 |
| 676 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/die_moet_er_in_hilbrand_zelfs_mi_f4831b83.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #676 |
| 677 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dat_is_het_verschil_tussen_een_g_281c4e2e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #677 |
| 678 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/net_als_bij_het_dorpsteam_eerst__9500524f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #678 |
| 679 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/hij_keek_te_veel_naar_de_keeper__5a10e0bc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #679 |
| 680 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/pech_en_een_beetje_onhandig_21990078.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #680 |
| 681 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_schot_het_gaat_hard_3636ba3c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #681 |
| 682 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/hij_haalt_uit_5b5948d3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #682 |
| 683 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/daar_gaat_de_bal_richting_het_do_8852fa34.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #683 |
| 684 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/schieten_en_het_is_een_harde_e5a70099.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #684 |
| 685 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/hij_probeert_het_van_afstand_5ea6ad54.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #685 |
| 686 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_poging_de_keeper_moet_oplett_25196d21.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #686 |
| 687 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_kogel_wat_doet_de_keeper_35942b0a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #687 |
| 688 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/hij_schiet_hij_schiet_8956b730.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #688 |
| 689 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/rustig_aan_jongen_eerst_richten__093d992a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #689 |
| 690 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/daar_zit_kracht_achter_3bcce8b0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #690 |
| 691 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dat_doe_je_met_je_hele_been_niet_879237d9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #691 |
| 692 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_mooie_poging_maar_vooral_een_d4894999.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #692 |
| 693 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/wat_een_redding_de_keeper_houdt__7e07c642.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #693 |
| 694 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/gestopt_die_ging_er_bijna_in_7d7d4317.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #694 |
| 695 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_keeper_vloog_erheen_er_zat_gr_4f546e98.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #695 |
| 696 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/daar_is_hij_de_keeper_redt_met_z_9b3865d2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #696 |
| 697 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/weggeslagen_wat_een_reflex_1e36b4e0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #697 |
| 698 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/hij_pakt_hem_zekerheid_in_het_do_50bcaf2a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #698 |
| 699 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/op_de_lijn_gered_die_keeper_heef_a3d6eb75.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #699 |
| 700 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_bal_is_veilig_bij_de_keeper_fac88333.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #700 |
| 701 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dat_noem_ik_keeperswerk_alleen_d_8c16c7b7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #701 |
| 702 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/hij_stond_precies_goed_dat_is_ge_e1316304.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #702 |
| 703 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_keeper_is_een_eenzaam_beroep_2c912e4a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #703 |
| 704 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/bij_ons_in_het_dorp_heette_zo_ie_83665b12.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #704 |
| 705 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/de_spits_dacht_dat_hij_hem_had_d_3e0afd0b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #705 |
| 706 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/mooi_gedaan_hij_verdient_een_pep_c4324016.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #706 |
| 707 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/tegen_de_paal_dat_scheelde_een_h_de148eb7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #707 |
| 708 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/op_de_lat_de_hele_tribune_hield__8fb649fd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #708 |
| 709 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_paal_redt_het_doelpunt_blijft_d45fd784.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #709 |
| 710 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/ping_dat_klonk_als_een_klok_net__80c8ee6b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #710 |
| 711 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/hout_het_doel_staat_nog_81121743.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #711 |
| 712 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dat_is_nog_net_zo_erg_als_missen_83f5d0fd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #712 |
| 713 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/de_paal_is_de_beste_verdediger_v_ee6e4612.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #713 |
| 714 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/zo_dicht_bij_het_hout_was_zijn_v_a46a8431.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #714 |
| 715 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_hoor_het_nog_galmen_23fc4832.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #715 |
| 716 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/goal_voor_de_stadjers_dat_noem_i_87d1bcda.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #716 |
| 717 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/binnen_de_stadjers_vieren_het_me_0c751af1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #717 |
| 718 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/wat_een_schot_de_keeper_keek_nog_2ecc69ab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #718 |
| 719 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/doelpunt_wat_een_mooi_moment_voo_52c235f7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #719 |
| 720 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/en_hij_zit_de_bal_ligt_in_het_ne_b94ea5f6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #720 |
| 721 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/ja_daar_is_het_doelpunt_de_eurob_f0b85a5c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #721 |
| 722 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/zo_spelen_we_het_thuis_ook_zonde_7c42cd0d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #722 |
| 723 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/mooi_dat_was_niet_alleen_een_goa_ad66a5ce.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #723 |
| 724 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dat_was_verdiend_hilbrand_heel_v_0710c7fb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #724 |
| 725 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/als_dat_niet_binnen_gaat_eet_ik__27d74a40.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #725 |
| 726 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/de_keeper_had_geen_schijn_van_ka_64b2dac0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #726 |
| 727 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dit_is_het_mooiste_geluid_van_he_3694113f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #727 |
| 728 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/oma_trijntje_is_opgestaan_dat_do_a5fe612e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #728 |
| 729 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_zou_zeggen_dikke_goal_d4be43b5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #729 |
| 730 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_tegenstander_scoort_even_slik_92cc948c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #730 |
| 731 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/tegendoelpunt_oma_trijntje_schud_6a2df40f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #731 |
| 732 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/binnen_de_keeper_wil_de_grasmat__5917b263.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #732 |
| 733 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/tegenvaller_de_bal_zit_achter_de_7e049ebb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #733 |
| 734 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_doelpunt_voor_de_bezoekers_h_cbd89844.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #734 |
| 735 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dat_doet_pijn_hilbrand_maar_het__871253a0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #735 |
| 736 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/daar_had_de_verdediging_bij_moet_1451e43e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #736 |
| 737 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/je_moet_het_toegeven_dat_was_moo_abe96ea3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #737 |
| 738 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/even_doorademen_en_opnieuw_begin_994e4806.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #738 |
| 739 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/in_het_dorpsteam_zeiden_we_dan_v_fbd560b1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #739 |
| 740 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/bij_een_tegendoelpunt_kijkt_de_h_79f0a137.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #740 |
| 741 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/nou_dat_was_effe_niet_best_4e054b02.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #741 |
| 742 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_eigen_doelpunt_dat_gaat_in_d_2f5750c8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #742 |
| 743 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/oei_die_gaat_in_zijn_eigen_doel__93e298c1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #743 |
| 744 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/dat_was_niet_de_bedoeling_de_bal_dc461ec9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #744 |
| 745 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dit_kan_elke_speler_overkomen_be_f52c9834.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #745 |
| 746 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/het_is_geen_schande_het_is_een_a_5baf3c9b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #746 |
| 747 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/hij_kijkt_nu_heel_erg_naar_de_lu_dc9ec8cf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #747 |
| 748 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/pech_zeg_ik_pure_pech_ik_heb_er__a439cf92.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #748 |
| 749 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_comeback_is_compleet_wie_had__a892bbeb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #749 |
| 750 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/terug_in_de_wedstrijd_wat_een_ve_54690b5b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #750 |
| 751 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/wat_een_wedstrijd_eerst_achter_n_3ff93987.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #751 |
| 752 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/zie_je_wel_nooit_opgeven_dat_is__64441190.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #752 |
| 753 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dat_is_karakter_dat_kan_je_niet__4ddbcafc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #753 |
| 754 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dit_is_waarom_we_naar_voetbal_ki_ff62b103.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #754 |
| 755 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_gele_kaart_de_scheidsrechter_e8413527.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #755 |
| 756 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/geel_dat_was_een_gele_kaart_71cf2f54.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #756 |
| 757 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_scheidsrechter_trekt_geel_dat_6cf8fd0e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #757 |
| 758 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/gele_kaart_en_terecht_voorzichti_ee1e1b53.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #758 |
| 759 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_waarschuwing_met_een_kaartje_7a89b86b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #759 |
| 760 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dat_is_de_goedkoopste_les_van_he_7209da73.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #760 |
| 761 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/hij_mag_nu_niet_meer_te_vurig_wo_187c203b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #761 |
| 762 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/geel_is_een_vriendelijk_verzoek__b133dc39.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #762 |
| 763 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dat_hadden_we_kunnen_zien_aankom_98406990.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #763 |
| 764 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/eerlijk_is_eerlijk_dat_was_een_t_b964ac25.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #764 |
| 765 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/rood_de_scheidsrechter_stuurt_he_d8ed534f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #765 |
| 766 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/hij_moet_eraf_dat_wordt_lastig_ea4f0ec0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #766 |
| 767 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dat_wordt_een_lange_middag_met_t_a2f5d081.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #767 |
| 768 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/rood_hij_had_beter_kunnen_kiezen_ba89dfaf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #768 |
| 769 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dit_verandert_alles_het_hele_pla_00a4ade4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #769 |
| 770 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/niemand_wil_dit_zien_maar_de_reg_e68bd825.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #770 |
| 771 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/er_is_nu_ruimte_en_die_ruimte_mo_c2983bf1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #771 |
| 772 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/hij_blijft_even_liggen_het_medis_e75ea035.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #772 |
| 773 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_blessure_we_hopen_dat_het_me_bdf064d1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #773 |
| 774 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_spelers_houden_even_in_een_ge_aac9f81f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #774 |
| 775 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/hij_haalt_de_wedstrijd_niet_er_k_3017b933.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #775 |
| 776 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/rustig_aan_even_uitlopen_zo_gaat_8b0187f1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #776 |
| 777 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/de_wedstrijd_gaat_daarna_gewoon__82b9b47c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #777 |
| 778 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_goede_wissel_is_soms_het_bes_6d4c3c40.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #778 |
| 779 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/beterschap_alvast_a4994777.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #779 |
| 780 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/er_wordt_gewisseld_verse_benen_o_3c1e8148.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #780 |
| 781 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/nieuwe_speler_nieuwe_kansen_41d4e3a5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #781 |
| 782 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_wissel_daar_zit_een_idee_ach_a9e38e7d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #782 |
| 783 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/de_trainer_weet_iets_wat_wij_nie_6c9ccd4d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #783 |
| 784 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/verse_benen_zijn_goud_waard_in_d_36088499.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #784 |
| 785 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/die_was_moe_hilbrand_dat_zag_je__000421ad.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #785 |
| 786 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_goede_wissel_verandert_de_we_94fc7e68.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #786 |
| 787 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/strafschop_de_scheidsrechter_wij_40608f27.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #787 |
| 788 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/penalty_dit_wordt_spannend_986b89d7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #788 |
| 789 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_bal_ligt_op_de_stip_het_hele__fb09c958.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #789 |
| 790 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/alle_ogen_op_de_stip_ee_n_speler_fa384da8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #790 |
| 791 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/straf_en_nu_is_het_stil_8d69927d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #791 |
| 792 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dit_is_het_enige_moment_waarop_h_249c50db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #792 |
| 793 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/je_kijkt_niet_naar_de_keeper_je__638ebd7f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #793 |
| 794 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dat_is_alleen_maar_zenuwen_het_d_20c1c37e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #794 |
| 795 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_heb_er_eens_een_gemist_op_een_47f641b8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #795 |
| 796 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_hoekschop_alle_lange_spelers_25ca58c1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #796 |
| 797 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_bal_gaat_de_hoek_in_kan_dit_g_f0a6be08.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #797 |
| 798 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_corner_en_dat_levert_altijd__cf752f0b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #798 |
| 799 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/hoekschop_het_wordt_druk_voor_he_7d4c2dcc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #799 |
| 800 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_hoekschop_is_een_uitnodiging_85cde7f3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #800 |
| 801 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/bij_een_corner_telt_alleen_de_ee_6b5dac4c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #801 |
| 802 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dit_kan_een_goede_kans_worden_al_0df00bfe.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #802 |
| 803 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_bal_gaat_uit_de_ingooi_is_voo_68b2cca9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #803 |
| 804 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_inworp_aan_de_zijlijn_4895da6a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #804 |
| 805 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/even_rust_bij_de_zijlijn_een_ing_04022ba4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #805 |
| 806 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_ingooi_is_de_enige_keer_dat__f1f3182d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #806 |
| 807 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/vergeet_je_voeten_niet_op_de_gro_9faf027f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #807 |
| 808 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/altijd_opletten_bij_een_ingooi_d_1850bc91.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #808 |
| 809 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_keeper_pakt_de_bal_en_gaat_he_68025a35.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #809 |
| 810 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/doelschop_rustig_opbouwen_is_het_593e8635.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #810 |
| 811 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_bal_ging_over_de_achterlijn_d_b8038e8f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #811 |
| 812 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_doelschop_is_een_tweede_kans_a31bc218.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #812 |
| 813 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dit_is_het_ideale_moment_om_je_e_8d784cf0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #813 |
| 814 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/de_keeper_heeft_alle_tijd_en_geb_ae69d52f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #814 |
| 815 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/vrije_bal_wie_gaat_hem_nemen_cde15e7b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #815 |
| 816 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_scheidsrechter_geeft_een_vrij_43b46e32.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #816 |
| 817 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_vrije_trap_en_dat_kan_gevaar_24c99aa0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #817 |
| 818 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/bij_een_vrije_trap_telt_de_muur__b85aa25d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #818 |
| 819 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dat_is_een_kans_om_iets_moois_te_461ad335.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #819 |
| 820 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dit_zijn_de_momenten_waar_je_voo_c77680d8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #820 |
| 821 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/buitenspel_de_vlag_gaat_omhoog_9e9450e5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #821 |
| 822 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/hij_stond_buitenspel_vrije_bal_v_f4d2b82e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #822 |
| 823 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/buitenspel_dat_is_de_regel_c548acbd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #823 |
| 824 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/te_vroeg_gestart_buitenspel_7c7fcbbb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #824 |
| 825 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/het_is_een_heel_simpele_regel_da_2977b145.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #825 |
| 826 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_stap_te_ver_en_het_hele_plan_6ca3e209.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #826 |
| 827 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/hij_liep_mooi_maar_iets_te_vroeg_e84b655b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #827 |
| 828 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_bal_is_uit_38242b35.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #828 |
| 829 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/naar_de_tribune_oma_trijntje_van_3d9149f7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #829 |
| 830 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/uit_even_de_adem_inhouden_7c97920f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #830 |
| 831 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_bal_verlaat_het_veld_d84fd3ea.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #831 |
| 832 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/zo_gaan_er_elk_jaar_veertig_ball_c4fa1e23.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #832 |
| 833 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_balletje_over_de_lijn_is_noo_4e853e86.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #833 |
| 834 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_mooie_poging_maar_buiten_ber_88cc3c86.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #834 |
| 835 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/overtreding_vrije_bal_de_scheids_d741bb59.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #835 |
| 836 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/dat_was_te_fel_vrije_bal_voor_de_436758be.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #836 |
| 837 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_overtreding_het_spel_ligt_ev_451d5c38.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #837 |
| 838 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_scheidsrechter_fluit_dat_was__17af5bd2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #838 |
| 839 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/hard_spel_een_vrije_bal_830df0ea.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #839 |
| 840 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_tackle_van_achteren_is_nooit_218b97d2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #840 |
| 841 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/je_mag_best_hard_spelen_maar_nie_022b65b6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #841 |
| 842 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dat_is_een_kleine_overtreding_me_916bd225.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #842 |
| 843 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/van_achteren_dat_doe_je_niet_cdd7cced.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #843 |
| 844 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/rust_de_thermosfles_gaat_rond_adbf7996.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #844 |
| 845 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/rust_even_bijkomen_en_dan_weer_v_3ff1d09f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #845 |
| 846 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/het_fluitsignaal_klinkt_het_is_r_01c6e1e4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #846 |
| 847 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_eerste_helft_zit_erop_tijd_vo_64163be4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #847 |
| 848 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/rust_wat_vond_roelie_ervan_14b1d3df.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #848 |
| 849 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/dat_was_de_eerste_helft_de_tweed_f4d20226.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #849 |
| 850 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_zou_zeggen_een_helft_vol_bijn_9d8edc92.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #850 |
| 851 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/de_trainer_heeft_vijftien_minute_b6d2f2d0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #851 |
| 852 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_ga_even_in_de_statistieken_ki_4d9a630f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #852 |
| 853 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/het_is_te_warm_dat_zeg_ik_elke_z_a089919b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #853 |
| 854 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_goede_rust_is_half_gewonnen__15ff1be1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #854 |
| 855 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/zoveel_gras_zo_weinig_schaduw_44d6ffe8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #855 |
| 856 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/gewonnen_de_stadjers_dansen_over_493cd138.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #856 |
| 857 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_overwinning_in_de_euroborg_o_7b2566b8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #857 |
| 858 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/het_eindsignaal_en_het_is_winst__2c440ac8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #858 |
| 859 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/gewonnen_het_is_een_feest_op_de__93f4cc08.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #859 |
| 860 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/verdiend_hilbrand_heel_verdiend__f044f1a1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #860 |
| 861 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/het_is_een_dag_om_in_te_lijsten__51837ded.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #861 |
| 862 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dat_doe_je_niet_vaak_maar_vandaa_c53df683.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #862 |
| 863 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/verloren_de_volgende_keer_beter__142253d0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #863 |
| 864 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/dat_was_niet_ons_dagje_het_gras__b0128a05.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #864 |
| 865 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/het_eindsignaal_dit_was_geen_moo_c7494d8d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #865 |
| 866 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/verloren_maar_de_zon_schijnt_nog_b5595fb3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #866 |
| 867 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/het_is_maar_voetbal_hilbrand_zeg_e04bfd57.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #867 |
| 868 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/we_leren_ervan_ik_zeg_dat_elke_k_c26ea2db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #868 |
| 869 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/de_tribune_klapt_toch_dat_is_een_974e7f40.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #869 |
| 870 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/gelijkspel_niemand_wint_niemand__e7c19546.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #870 |
| 871 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/gelijk_de_pepermunt_wordt_eerlij_55da23b8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #871 |
| 872 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/het_eindsignaal_klinkt_het_blijf_a4a3cbc2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #872 |
| 873 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_gelijkspel_beide_teams_nemen_d173c34d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #873 |
| 874 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_gelijkspel_is_een_lekker_neu_0e22468c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #874 |
| 875 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/eerlijk_gedeeld_eerlijk_gespeeld_8ac2dc09.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #875 |
| 876 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/daar_is_niemand_ongelukkig_mee_e_f8bb9a00.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #876 |
| 877 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_bal_gaat_heen_en_weer_en_de_z_3ccedc23.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #877 |
| 878 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/rustig_opbouwen_kijk_eens_hoe_ze_609560c3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #878 |
| 879 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/het_is_een_tactisch_spel_elke_zi_382fe5e9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #879 |
| 880 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/er_wordt_geduldig_gespeeld_een_k_f2a0ebd3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #880 |
| 881 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_middenvelders_voeren_de_strij_d200943e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #881 |
| 882 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/het_spel_verplaatst_zich_naar_de_69ba6ba5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #882 |
| 883 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/mooie_passing_dat_zie_je_niet_va_82600f6e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #883 |
| 884 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/ze_zoeken_een_opening_en_die_is__ff0cf0d5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #884 |
| 885 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/let_op_de_achterhoede_die_staat__3adaf5f7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #885 |
| 886 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_bal_rolt_over_het_gras_zomer__d13e04d4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #886 |
| 887 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/de_wind_draait_een_beetje_dat_me_5d5c3c8f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #887 |
| 888 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/op_een_warme_dag_is_het_tempo_va_49a2a3bb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #888 |
| 889 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dit_is_ouderwets_voetbal_ik_hou__6cd02eca.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #889 |
| 890 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_goede_pass_is_een_geheugenoe_fbf8f1cb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #890 |
| 891 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/kijk_naar_de_ruimte_ruimte_is_wa_9152b2ea.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #891 |
| 892 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/niet_alles_hoeft_een_schot_te_zi_e12aad13.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #892 |
| 893 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/in_het_dorp_zeiden_we_eerst_de_b_2c2a52fc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #893 |
| 894 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/het_gras_is_erg_kort_dat_is_ook__fa6ad643.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #894 |
| 895 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/mooie_middag_voor_een_pakje_frie_1807ad9f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #895 |
| 896 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/die_verdediger_weet_precies_wat__b68a1d96.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #896 |
| 897 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_stadjers_houden_de_bal_lekker_943a19c1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #897 |
| 898 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/veel_balbezit_voor_de_thuisploeg_21a0da46.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #898 |
| 899 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/als_je_de_bal_hebt_kan_de_tegens_a897e94c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #899 |
| 900 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/balbezit_is_mooi_maar_het_moet_w_b2c6b08a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #900 |
| 901 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_tegenstander_heeft_de_bal_vee_b3e5ba43.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #901 |
| 902 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_bezoekers_houden_de_bal_vast_6dec03ef.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #902 |
| 903 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/als_je_de_bal_niet_hebt_moet_je__cdd0181e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #903 |
| 904 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/eerst_de_bal_terugwinnen_dan_pas_70c82e2d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #904 |
| 905 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_laatste_minuten_alles_of_niet_7fad1783.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #905 |
| 906 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/het_loopt_naar_het_einde_wat_kun_3ac0876e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #906 |
| 907 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/nog_maar_even_te_gaan_de_spannin_18ca9cce.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #907 |
| 908 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_klok_tikt_de_laatste_kansen_3374a09d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #908 |
| 909 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/nu_merk_je_wie_het_meest_conditi_8199af0b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #909 |
| 910 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/de_laatste_minuten_zijn_voor_hel_523d24bd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #910 |
| 911 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_zeg_alles_op_de_laatste_lange_e65eb9ac.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #911 |
| 912 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/wat_een_spanning_het_kan_nog_all_4144caa3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #912 |
| 913 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/dit_blijft_tot_het_einde_spannen_b4b8d75f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #913 |
| 914 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/het_is_een_heel_gelijkopgaande_w_7a5261e6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #914 |
| 915 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/zo_wil_je_voetbal_zien_iedereen__d1a575f3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #915 |
| 916 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/met_e_e_n_doelpunt_verschil_is_h_6c34a328.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #916 |
| 917 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_durf_er_niets_over_te_zeggen__379ad5e7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #917 |
| 918 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_had_hem_ook_gekozen_ik_zeg_he_c64a3631.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #918 |
| 919 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_prima_prestatie_die_niet_zom_b083e308.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #919 |
| 920 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dat_is_een_speler_die_je_in_je_t_78a151aa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #920 |

De wachtrij heeft 920 clips (3 manifest(en): lines, sms, hints).

## 2. Wacht op een Groningse spreektekst of stemkeuze

| Stap | Reden | Regels |
|---|---|---|
| E | Groningse spreektekst ontbreekt | 10 |
| F1 | Groningse spreektekst ontbreekt | 6 |
| F2 | Groningse spreektekst ontbreekt | 7 |
| F3 | Groningse spreektekst ontbreekt | 5 |
| F4 | Groningse spreektekst ontbreekt | 2 |
| F5 | Groningse spreektekst ontbreekt | 6 |
| F6 | Groningse spreektekst ontbreekt | 6 |
| J1 | Groningse spreektekst ontbreekt | 5 |
| J2 | Groningse spreektekst ontbreekt | 5 |
| J3 | Groningse spreektekst ontbreekt | 6 |
| J4 | Groningse spreektekst ontbreekt | 9 |
| J5 | Groningse spreektekst ontbreekt | 2 |
| J6 | Groningse spreektekst ontbreekt | 3 |
| M00 | Groningse spreektekst ontbreekt | 3 |
| M01 | Groningse spreektekst ontbreekt | 4 |
| M02 | Groningse spreektekst ontbreekt | 13 |
| M03 | Groningse spreektekst ontbreekt | 14 |
| M04 | Groningse spreektekst ontbreekt | 8 |
| M06 | Groningse spreektekst ontbreekt | 10 |
| M07 | Groningse spreektekst ontbreekt | 1 |
| M08 | Groningse spreektekst ontbreekt | 10 |
| M09 | Groningse spreektekst ontbreekt | 5 |
| M10 | Groningse spreektekst ontbreekt | 5 |
| M11 | Groningse spreektekst ontbreekt | 15 |
| M12 | Groningse spreektekst ontbreekt | 7 |
| M13 | Groningse spreektekst ontbreekt | 10 |
| M14 | Groningse spreektekst ontbreekt | 3 |
| M15 | Groningse spreektekst ontbreekt | 7 |
| M16 | Groningse spreektekst ontbreekt | 15 |
| M17 | Groningse spreektekst ontbreekt | 12 |
| M18 | Groningse spreektekst ontbreekt | 9 |
| M19 | Groningse spreektekst ontbreekt | 8 |
| M20 | Groningse spreektekst ontbreekt | 5 |
| M21 | Groningse spreektekst ontbreekt | 14 |
| M22 | Groningse spreektekst ontbreekt | 5 |
| M23 | Groningse spreektekst ontbreekt | 3 |
| M24 | Groningse spreektekst ontbreekt | 7 |
| M25 | Groningse spreektekst ontbreekt | 4 |
| M26 | Groningse spreektekst ontbreekt | 28 |
| M27 | Groningse spreektekst ontbreekt | 7 |
| M28 | Groningse spreektekst ontbreekt | 1 |
| M29 | Groningse spreektekst ontbreekt | 1 |
| M30 | Groningse spreektekst ontbreekt | 10 |
| N1 | Groningse spreektekst ontbreekt | 6 |
| N10 | Groningse spreektekst ontbreekt | 7 |
| N11 | Groningse spreektekst ontbreekt | 3 |
| N12 | Groningse spreektekst ontbreekt | 3 |
| N2 | Groningse spreektekst ontbreekt | 3 |
| N3 | Groningse spreektekst ontbreekt | 2 |
| N4 | Groningse spreektekst ontbreekt | 3 |
| N5 | Groningse spreektekst ontbreekt | 3 |
| N6 | Groningse spreektekst ontbreekt | 5 |
| N7 | Groningse spreektekst ontbreekt | 4 |
| N8 | Groningse spreektekst ontbreekt | 4 |
| N9 | Groningse spreektekst ontbreekt | 6 |
| T2 | Groningse spreektekst ontbreekt | 3 |
| T3 | Groningse spreektekst ontbreekt | 3 |
| T4 | Groningse spreektekst ontbreekt | 1 |
| J3 | stemkeuze ontbreekt in CAST | 7 |
| M06 | stemkeuze ontbreekt in CAST | 2 |
| M15 | stemkeuze ontbreekt in CAST | 3 |
| M17 | stemkeuze ontbreekt in CAST | 4 |
| M25 | stemkeuze ontbreekt in CAST | 6 |
| M30 | stemkeuze ontbreekt in CAST | 1 |
| N2 | stemkeuze ontbreekt in CAST | 3 |

Alle 398 regels staan met bron, spreker, stem en beoogde bestandsnaam in `TTS-OPNAMELIJST-735.jsonl` (status `stemkeuze` of `spreektekst`); die kunnen pas in de wachtrij als de stem of de spreektekst er is.

## 3. Technische laadhint (aparte beslissing)

De nieuwe laadhint `"De weg hier wordt nog geladen. Even wachten…"` staat bewust **niet** in de wachtrij: `scripts/voicelines_collect.mjs` zet hem in `TECH_HINTS` (een technische melding, geen stem). Het issue #735 noemt hier 2 clips (Tammo/Anita) voor. Wil de eigenaar die toch, dan is dat een aparte opname en een uitzondering in `TECH_HINTS`; deze lijst telt hem niet mee. (TECH_HINTS bevestigd in de bron.)

## 4. Wat de eigenaar daarna doet

1. `node scripts/tts_opnameronde.mjs --budget 2.5` (vraagt niets en leest geen sleutel; de TTS-module leest de eigenaar-sleutel zelf).
2. `node scripts/build_story_data.mjs` zet de opgenomen regels op voiced (de wrapper doet dit al).
3. `node scripts/voice_coverage.mjs --quiet` moet daarna zonder ontbrekende regels blijven.
4. Deze lijst verversen met `node scripts/tts_opnamelijst.mjs` en het issue #735 bijwerken met de nieuwe stand.

## 5. Verschil met #735

Het issue telt 670 regels/671 clips (67 klaar + 604 wachtend, plus de laadhint van 2 clips). De huidige bronnen geven 1318 regels/clips: 920 klaar + 398 wachtend. Dat verschil komt doordat `script.json`, `gronings_spoken.json` en de opnames sinds 6-11 zijn bijgewerkt; deze lijst volgt de code, niet het issue.
