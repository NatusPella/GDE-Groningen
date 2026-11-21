# TTS-opnamelijst #735: definitieve lijst van deze ronde

Gegenereerd door `node scripts/tts_opnamelijst.mjs` uit `game/storydata/script.json`, `scripts/tts_lines.json`, `scripts/gronings_spoken.json` en `scripts/tts_cast.mjs`. Niet met de hand aanpassen; draai `node scripts/tts_opnamelijst.mjs --check` om te zien of deze lijst achterloopt.

**Stand van deze bronnen:** 534 clips staan klaar in de wachtrij (`scripts/tts_lines.json`), 282 verhaalregels wachten nog (19 op een stemkeuze, 263 op een Groningse spreektekst). Samen **816 regels/clips**. De 37 bewust stille appjes (`channel: app-stil`) staan er niet op.

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
| 7 | M02.1 | Anita (Callirrhoe) | `lines/anita/ik_ken_sjabbe_hij_opent_wat_niem_4d2aa7a4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #7 |
| 8 | M02.5 | Anita (Callirrhoe) | `lines/anita/alleen_of_we_een_koekje_wilden_59e24e38.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #8 |
| 9 | O1 | Anita (Callirrhoe) | `lines/anita/het_luik_moet_aan_de_zijkant_dan_d46358ca.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #9 |
| 10 | O1 | Anita (Callirrhoe) | `lines/anita/de_mensen_die_gaan_komen_tammo_810c5e62.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #10 |
| 11 | O1 | Anita (Callirrhoe) | `lines/anita/ik_heb_ook_een_lijst_gemaakt_op__11026c8b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #11 |
| 12 | O1 | Anita (Callirrhoe) | `lines/anita/je_hebt_dat_kaartje_nog_van_die__93e31165.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #12 |
| 13 | O1 | Anita (Callirrhoe) | `lines/anita/ja_natuurlijk_efc4f2c2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #13 |
| 14 | O1 | Beppe (Aoede) | `lines/beppe/jonge_hast_al_iten_5410cd93.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #14 |
| 15 | O1 | Beppe (Aoede) | `lines/beppe/is_tessa_der_ek_dan_meitsje_ik_s_1315e504.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #15 |
| 16 | N1 | Anita (Callirrhoe) | `lines/anita/wij_doen_het_voor_twintig_euro_1035557b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #16 |
| 17 | N1 | Anita (Callirrhoe) | `lines/anita/wat_moet_hij_met_kopieerpapier_8f9b8246.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #17 |
| 18 | N2 | Anita (Callirrhoe) | `lines/anita/je_kent_hem_ffcfdb3a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #18 |
| 19 | N2 | Anita (Callirrhoe) | `lines/anita/zal_ik_soep_maken_voor_drie_b5cc245c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #19 |
| 20 | N3 | Beppe (Aoede) | `lines/beppe/de_r_bisto_jonge_kom_yn_kom_yn_d_22363820.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #20 |
| 21 | N3 | Beppe (Aoede) | `lines/beppe/ytst_dan_mar_earst_dan_prate_wy_069d6532.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #21 |
| 22 | N3 | Anita (Callirrhoe) | `lines/anita/wat_zegt_ze_81203427.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #22 |
| 23 | N3 | Beppe (Aoede) | `lines/beppe/hy_seit_neat_mar_hy_docht_it_goe_464c01d8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #23 |
| 24 | N3 | Anita (Callirrhoe) | `lines/anita/dat_heb_ik_ook_al_gezien_55ca7332.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #24 |
| 25 | N4 | Anita (Callirrhoe) | `lines/anita/taxi_jij_rijdt_79dc629f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #25 |
| 26 | N4 | Anita (Callirrhoe) | `lines/anita/ik_zeg_het_wel_als_het_fout_gaat_debb2858.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #26 |
| 27 | N4 | Anita (Callirrhoe) | `lines/anita/formulieren_dit_doe_ik_liever_al_09be605b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #27 |
| 28 | N4 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_tessa_uw_auto_staat_op_e_7b5bba8c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #28 |
| 29 | N4 | Anita (Callirrhoe) | `lines/anita/het_is_een_stoep_e40e96a8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #29 |
| 30 | N4 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/een_stoep_met_een_overeenkomst_cf6e53a2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #30 |
| 31 | N4 | Anita (Callirrhoe) | `lines/anita/iemand_die_alle_regels_kent_beha_ca79c038.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #31 |
| 32 | M03.2 | Anita (Callirrhoe) | `lines/anita/regels_vergunningen_trucs_hij_wi_97996937.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #32 |
| 33 | M03.2 | Anita (Callirrhoe) | `lines/anita/voor_zijn_oma_hij_doet_alles_voo_077aacbd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #33 |
| 34 | M03.4 | Anita (Callirrhoe) | `lines/anita/hij_vroeg_sjabbe_waar_het_museum_065bdfa9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #34 |
| 35 | M03.4 | Anita (Callirrhoe) | `lines/anita/eerst_kijken_hoe_het_museum_bewa_6962ee4d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #35 |
| 36 | R1.1 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/jelle_terpstra_us_mem_snacks_u_k_62a988b5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #36 |
| 37 | O2 | Tammo (Orus) | `lines/tammo/dat_zeg_je_elke_keer_7af04035.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #37 |
| 38 | M06.0 | Anita (Callirrhoe) | `lines/anita/we_wachten_op_iets_ff5f2f91.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #38 |
| 39 | B1.1 | Anita (Callirrhoe) | `lines/anita/waarom_denkt_iedereen_dat_wij_ee_06e3818b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #39 |
| 40 | B1.1 | Anita (Callirrhoe) | `lines/anita/dat_is_geen_argument_a460f66b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #40 |
| 41 | B1.2 | Anita (Callirrhoe) | `lines/anita/kijk_een_mus_af57b7fc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #41 |
| 42 | B1.2 | Anita (Callirrhoe) | `lines/anita/dat_is_het_leukste_wat_je_vandaa_e6e26c77.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #42 |
| 43 | B1.3 | Anita (Callirrhoe) | `lines/anita/vraag_van_de_dag_hoe_lang_kan_ee_410982c7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #43 |
| 44 | B1.3 | Anita (Callirrhoe) | `lines/anita/dat_noem_ik_geen_antwoord_6dcef7d3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #44 |
| 45 | O3 | Anita (Callirrhoe) | `lines/anita/wij_staan_op_de_camera_93e53bab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #45 |
| 46 | O3 | Anita (Callirrhoe) | `lines/anita/dan_moeten_we_weten_wat_hij_nog__f82f5db0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #46 |
| 47 | O3 | Anita (Callirrhoe) | `lines/anita/daarna_winnen_we_gewoon_eerlijk__f9fe8400.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #47 |
| 48 | O3 | Anita (Callirrhoe) | `lines/anita/dan_weet_zij_hoe_dat_moet_efa1405a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #48 |
| 49 | O3 | Anita (Callirrhoe) | `lines/anita/wat_zei_je_d4387878.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #49 |
| 50 | M07.1 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_al_het_vet_van_grunn_e_e_7df98541.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #50 |
| 51 | M07.1 | Anita (Callirrhoe) | `lines/anita/zonder_vet_bakt_niemand_een_eier_d16195a1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #51 |
| 52 | M08.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_een_fatbike_is_juridisch_4ded92f2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #52 |
| 53 | M08.2 | Anita (Callirrhoe) | `lines/anita/dan_rennen_we_a73c5051.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #53 |
| 54 | M08.3 | Tammo (Orus) | `lines/tammo/ik_ben_vierentwintig_oma_5af68f6d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #54 |
| 55 | M08.3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/dan_eet_je_hem_al_vierentwintig__baa9b0d6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #55 |
| 56 | M08.3 | Anita (Callirrhoe) | `lines/anita/die_vijf_namen_hangen_vanavond_a_569ae08f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #56 |
| 57 | O4 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/famke_heb_je_een_jas_aan_ebd3a7ca.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #57 |
| 58 | O4 | Anita (Callirrhoe) | `lines/anita/het_is_augustus_mem_edfa6d61.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #58 |
| 59 | O4 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/het_waait_jas_00f02dee.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #59 |
| 60 | O4 | Anita (Callirrhoe) | `lines/anita/ja_mem_1e15e512.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #60 |
| 61 | O4 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/is_de_jongen_er_ook_zeg_dat_hij__19781a41.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #61 |
| 62 | O4 | Anita (Callirrhoe) | `lines/anita/mem_ik_logeerde_elke_zomer_naast_5a008ff6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #62 |
| 63 | O4 | Anita (Callirrhoe) | `lines/anita/jij_weet_niet_hoe_lang_ze_dat_al_89a9c077.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #63 |
| 64 | N10 | Anita (Callirrhoe) | `lines/anita/twee_koffie_een_thee_een_tosti_a_b1957a38.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #64 |
| 65 | N10 | Anita (Callirrhoe) | `lines/anita/nee_tammo_e8635f2c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #65 |
| 66 | N10 | Anita (Callirrhoe) | `lines/anita/jouw_vak_is_stilstaan_als_ik_pra_881d04d0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #66 |
| 67 | N8 | Anita (Callirrhoe) | `lines/anita/die_7dc29a94.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #67 |
| 68 | N8 | Anita (Callirrhoe) | `lines/anita/we_slapen_oma_c7e83f58.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #68 |
| 69 | N8 | Anita (Callirrhoe) | `lines/anita/het_is_een_punaise_29c76599.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #69 |
| 70 | N5 | Anita (Callirrhoe) | `lines/anita/dit_is_het_erf_van_mijn_oom_hier_f5007fcc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #70 |
| 71 | N5 | Anita (Callirrhoe) | `lines/anita/je_vroeg_niet_naar_de_koeien_a0bbf724.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #71 |
| 72 | N5 | Anita (Callirrhoe) | `lines/anita/geef_me_je_hand_niet_wegtrekken_6d6e960a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #72 |
| 73 | N5 | Anita (Callirrhoe) | `lines/anita/ik_zei_het_toch_ea5c5fd6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #73 |
| 74 | N11 | Anita (Callirrhoe) | `lines/anita/links_bij_de_zwarte_koe_8b1c98bf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #74 |
| 75 | N11 | Anita (Callirrhoe) | `lines/anita/die_met_dat_gezicht_bfa77c60.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #75 |
| 76 | N11 | Anita (Callirrhoe) | `lines/anita/dat_is_jouw_vak_5ca4a98a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #76 |
| 77 | N11 | Tammo (Orus) | `lines/tammo/en_jij_1ef5c630.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #77 |
| 78 | N11 | Anita (Callirrhoe) | `lines/anita/ik_kan_geen_kaart_lezen_wel_een__4b0a2df8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #78 |
| 79 | N11 | Anita (Callirrhoe) | `lines/anita/ik_heb_elf_koeien_geteld_55e063bf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #79 |
| 80 | N12 | Anita (Callirrhoe) | `lines/anita/tammo_rijden_wachten_de_chauffeu_75c576e0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #80 |
| 81 | N12 | Anita (Callirrhoe) | `lines/anita/plannen_koeien_praten_met_mensen_cd5aba9d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #81 |
| 82 | N12 | Anita (Callirrhoe) | `lines/anita/dat_is_de_bedoeling_daar_komt_he_dab1da58.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #82 |
| 83 | N12 | Anita (Callirrhoe) | `lines/anita/pak_je_sokken_8c1e0494.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #83 |
| 84 | N12 | Anita (Callirrhoe) | `lines/anita/dan_wees_er_zuinig_op_4bd0ed05.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #84 |
| 85 | N6 | Anita (Callirrhoe) | `lines/anita/mag_ik_weer_aan_land_43ed5bc4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #85 |
| 86 | N6 | Anita (Callirrhoe) | `lines/anita/ik_heb_het_water_niet_gekozen_eff77a38.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #86 |
| 87 | N7 | Anita (Callirrhoe) | `lines/anita/je_bedankt_altijd_de_chauffeur_c6a0d7be.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #87 |
| 88 | N7 | Anita (Callirrhoe) | `lines/anita/het_was_een_bus_f1557f9f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #88 |
| 89 | T1 | Anita (Callirrhoe) | `lines/anita/jij_zei_dat_de_zee_achter_de_dij_4aae769f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #89 |
| 90 | M09.1 | Anita (Callirrhoe) | `lines/anita/mijn_vader_had_kippen_ik_sorteer_ae99a6bb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #90 |
| 91 | M09.1 | Anita (Callirrhoe) | `lines/anita/je_vroeg_nooit_naar_de_kippen_7946f7de.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #91 |
| 92 | M10.1 | Anita (Callirrhoe) | `lines/anita/uithuizen_heeft_een_sloot_en_een_b7977546.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #92 |
| 93 | M10.2 | Anita (Callirrhoe) | `lines/anita/boerendochter_elke_wierde_heeft__6ff101c4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #93 |
| 94 | M10.5 | Anita (Callirrhoe) | `lines/anita/de_escapade_henk_heeft_een_zende_3fe505d6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #94 |
| 95 | M10.5 | Anita (Callirrhoe) | `lines/anita/de_recepten_oma_heeft_kopiee_n_fecd25aa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #95 |
| 96 | M10.5 | Anita (Callirrhoe) | `lines/anita/natuurlijk_blijf_je_je_hebt_een__630c4b10.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #96 |
| 97 | O5 | Anita (Callirrhoe) | `lines/anita/mem_vandaag_was_er_een_man_met_e_9070b4f8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #97 |
| 98 | O5 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/dat_zegt_hij_al_jaren_3c02e352.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #98 |
| 99 | O5 | Anita (Callirrhoe) | `lines/anita/kent_u_hem_d0268528.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #99 |
| 100 | O5 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/doe_je_jas_aan_famke_6477e254.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #100 |
| 101 | O5 | Anita (Callirrhoe) | `lines/anita/mem_281fc1d8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #101 |
| 102 | O5 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/straks_eerst_het_ontzet_60bb71e1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #102 |
| 103 | O5 | Anita (Callirrhoe) | `lines/anita/dat_ik_mijn_jas_moet_aandoen_900c6d03.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #103 |
| 104 | T2 | Anita (Callirrhoe) | `lines/anita/ik_ben_de_koningin_van_de_friteu_346e226d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #104 |
| 105 | T2 | Anita (Callirrhoe) | `lines/anita/waar_jij_rijdt_7dca9ea6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #105 |
| 106 | T2 | Anita (Callirrhoe) | `lines/anita/je_lacht_in_je_slaap_1e7cd6d2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #106 |
| 107 | M11.1 | Anita (Callirrhoe) | `lines/anita/ee_n_keer_9b592a6c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #107 |
| 108 | M11.1 | Tammo (Orus) | `lines/tammo/twee_75069400.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #108 |
| 109 | M11.3 | Anita (Callirrhoe) | `lines/anita/er_zit_een_briefje_bij_eet_wat_i_b2ca1a53.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #109 |
| 110 | M11.3 | Anita (Callirrhoe) | `lines/anita/dat_doen_oma_s_32581a97.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #110 |
| 111 | M11.3 | Tammo (Orus) | `lines/tammo/je_kijkt_raar_8e4db7bd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #111 |
| 112 | M11.3 | Anita (Callirrhoe) | `lines/anita/het_schommelt_het_is_een_boot_3a07f54b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #112 |
| 113 | M11.3 | Anita (Callirrhoe) | `lines/anita/geen_bal_dan_halen_we_het_zout_v_2df45184.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #113 |
| 114 | B2.1 | Anita (Callirrhoe) | `lines/anita/zeg_het_maar_d81e9290.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #114 |
| 115 | B2.1 | Anita (Callirrhoe) | `lines/anita/remmen_tammo_272d3adf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #115 |
| 116 | B2.2 | Anita (Callirrhoe) | `lines/anita/vraag_van_de_dag_hoeveel_eieren__09028774.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #116 |
| 117 | B2.2 | Anita (Callirrhoe) | `lines/anita/ik_bedoel_in_oma_s_recept_0c88d287.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #117 |
| 118 | R3.0 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/jelle_terpstra_vanmiddag_vlieg_i_50ba8b3b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #118 |
| 119 | R3.0 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/sinds_vanochtend_wel_mijn_jurist_51a9fddd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #119 |
| 120 | M12.1 | Anita (Callirrhoe) | `lines/anita/wij_zoeken_jelles_ballon_die_han_b7f5222e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #120 |
| 121 | M12.1 | Anita (Callirrhoe) | `lines/anita/behalve_naar_jou_881e1513.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #121 |
| 122 | M12.1 | Anita (Callirrhoe) | `lines/anita/ik_vlieg_drie_lessen_en_een_jaar_cb5ef556.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #122 |
| 123 | M12.2 | Anita (Callirrhoe) | `lines/anita/nog_wel_ec796b7c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #123 |
| 124 | M12.3 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mijn_juristen_hebben_alles_voorz_df546a30.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #124 |
| 125 | M12.3 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/dat_boek_is_mijn_plan_de_haven_d_27c6f610.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #125 |
| 126 | M12.3 | Anita (Callirrhoe) | `lines/anita/dat_gaan_we_proberen_7dfd6232.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #126 |
| 127 | M12.4 | Anita (Callirrhoe) | `lines/anita/plakje_vijf_de_haven_vannacht_ee_66503cda.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #127 |
| 128 | M12.4 | Anita (Callirrhoe) | `lines/anita/oma_s_vet_en_alles_wat_haar_vrie_da5bc4e3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #128 |
| 129 | M12.4 | Anita (Callirrhoe) | `lines/anita/de_bewaarder_notaris_28_augustus_e708f5aa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #129 |
| 130 | M13.1 | Anita (Callirrhoe) | `lines/anita/container_4471_het_schip_vertrek_f393f791.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #130 |
| 131 | M13.3 | Anita (Callirrhoe) | `lines/anita/en_alles_wat_we_gered_hebben_e2640fed.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #131 |
| 132 | O6 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_tessa_jelle_terpstra_u_h_ff899445.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #132 |
| 133 | O6 | Anita (Callirrhoe) | `lines/anita/dat_was_een_misverstand_675a7785.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #133 |
| 134 | O6 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/er_zijn_geen_misverstanden_er_zi_120e687e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #134 |
| 135 | O6 | Anita (Callirrhoe) | `lines/anita/hij_is_niet_te_koop_89fdbb3b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #135 |
| 136 | O6 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/alles_is_te_koop_mevrouw_mijn_mo_4d920782.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #136 |
| 137 | O6 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/ik_wacht_foar_mem_b8173b36.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #137 |
| 138 | O6 | Anita (Callirrhoe) | `lines/anita/dat_weet_hij_ook_daarom_belt_hij_613a22c9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #138 |
| 139 | M14.1 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/goedemorgen_ik_heb_lammerts_huur_8241874e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #139 |
| 140 | M14.1 | Anita (Callirrhoe) | `lines/anita/met_het_vet_erin_939041f2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #140 |
| 141 | M14.1 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/dat_is_nu_inboedel_8169ac01.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #141 |
| 142 | M14.1 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mijn_deurwaarder_is_om_acht_uur__98212624.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #142 |
| 143 | M14.1 | Anita (Callirrhoe) | `lines/anita/eerste_aan_de_sluis_wint_fd32ea0e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #143 |
| 144 | M14.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_mijn_juristen_vinden_dat_3c4402b3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #144 |
| 145 | T3 | Anita (Callirrhoe) | `lines/anita/dan_gaan_wij_daar_ook_heen_roelf_70ced563.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #145 |
| 146 | T3 | Anita (Callirrhoe) | `lines/anita/van_het_meel_in_oma_s_lijstje_ze_9cff5bea.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #146 |
| 147 | M15.1 | Anita (Callirrhoe) | `lines/anita/jelle_wil_de_jury_kopen_met_een__ab5ea1db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #147 |
| 148 | M15.3 | Anita (Callirrhoe) | `lines/anita/twee_weg_dat_scheelt_ec0b2437.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #148 |
| 149 | M15.5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_tessa_een_moment_mijn_ju_c9e0a851.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #149 |
| 150 | M15.5 | Anita (Callirrhoe) | `lines/anita/een_dagvaarding_da0c7deb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #150 |
| 151 | M15.5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/een_bedankbriefje_voor_het_spand_48de1970.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #151 |
| 152 | M15.5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/twee_van_de_vier_de_mensen_kwame_8ad89388.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #152 |
| 153 | M15.5 | Anita (Callirrhoe) | `lines/anita/dat_was_niet_de_bedoeling_730245db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #153 |
| 154 | M15.5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/dat_staat_nergens_in_het_contrac_37b5e948.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #154 |
| 155 | M15.5 | Anita (Callirrhoe) | `lines/anita/nee_waar_hij_heen_gaat_gaat_de_b_f95c8176.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #155 |
| 156 | M15.6 | Anita (Callirrhoe) | `lines/anita/het_was_een_ongeluk_285b2a83.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #156 |
| 157 | M15.6 | Anita (Callirrhoe) | `lines/anita/kom_geert_wacht_f4b94b1d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #157 |
| 158 | M16.3 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/durk_mijn_juristen_willen_een_ra_93b62778.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #158 |
| 159 | M16.3 | Durk (Algieba) | `lines/durk/op_een_kermis_baas_919c3d11.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #159 |
| 160 | M16.3 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/ik_hoor_botsauto_s_ik_betaal_jul_09a965cb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #160 |
| 161 | M16.3 | Durk (Algieba) | `lines/durk/nee_baas_douwe_hang_op_79df57d8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #161 |
| 162 | M16.3 | Douwe (Algenib) | `lines/douwe/op_40b135e8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #162 |
| 163 | M16.3 | Anita (Callirrhoe) | `lines/anita/die_zeg_ik_als_ik_win_557bdc25.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #163 |
| 164 | M16.5 | Anita (Callirrhoe) | `lines/anita/niemand_won_want_iedereen_werd_e_e4b9d385.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #164 |
| 165 | M16.5 | Durk (Algieba) | `lines/durk/gelijkspel_is_ook_een_antwoord_v_f43c5f47.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #165 |
| 166 | M16.5 | Anita (Callirrhoe) | `lines/anita/waar_gaat_jelle_maandag_heen_36d4b9c7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #166 |
| 167 | M16.5 | Durk (Algieba) | `lines/durk/baas_rijdt_maandag_naar_veendam__f2f4ebea.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #167 |
| 168 | M16.5 | Durk (Algieba) | `lines/durk/gaat_mee_in_de_koffer_onder_het__74d4f500.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #168 |
| 169 | M16.5 | Anita (Callirrhoe) | `lines/anita/maandag_veendam_c8fbfb25.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #169 |
| 170 | M16.5 | Anita (Callirrhoe) | `lines/anita/heel_goed_maandag_e2be0e06.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #170 |
| 171 | B3.1 | Anita (Callirrhoe) | `lines/anita/wat_dan_3d929414.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #171 |
| 172 | B3.1 | Anita (Callirrhoe) | `lines/anita/ik_dacht_even_dat_het_iets_was_9fae63f7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #172 |
| 173 | B3.2 | Anita (Callirrhoe) | `lines/anita/vraag_van_de_dag_hoe_hoog_vliegt_92071e8d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #173 |
| 174 | B3.2 | Anita (Callirrhoe) | `lines/anita/dat_is_geen_hoogte_95160d63.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #174 |
| 175 | B3.3 | Anita (Callirrhoe) | `lines/anita/dit_nummer_ken_ik_zet_harder_195cabbc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #175 |
| 176 | B3.3 | Anita (Callirrhoe) | `lines/anita/jij_zingt_altijd_de_bas_3ad6dc54.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #176 |
| 177 | O7 | Anita (Callirrhoe) | `lines/anita/het_is_mooi_weer_9b860bdc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #177 |
| 178 | R4.0 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/jelle_terpstra_ik_bied_een_klomp_7a576a14.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #178 |
| 179 | R4.0 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/dan_bied_ik_twee_klompen_foar_me_db55de9e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #179 |
| 180 | M17.3 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_tessa_mijn_schip_staat_v_69126ddc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #180 |
| 181 | M17.5 | Anita (Callirrhoe) | `lines/anita/ik_kijk_alleen_zo_n_wagen_is_voo_73cd3ffe.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #181 |
| 182 | M17.5 | Anita (Callirrhoe) | `lines/anita/dat_is_het_hele_vak_4d561b53.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #182 |
| 183 | M18.1 | Anita (Callirrhoe) | `lines/anita/volgens_de_chat_van_rikus_zijn_w_870ec6e1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #183 |
| 184 | M18.1 | Anita (Callirrhoe) | `lines/anita/staat_in_het_logboek_dat_jelle_d_6f7a89d6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #184 |
| 185 | M18.3 | Anita (Callirrhoe) | `lines/anita/zodat_zij_niets_merkte_dat_is_vi_ac9bcc9a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #185 |
| 186 | M18.3 | Anita (Callirrhoe) | `lines/anita/voor_iedereen_die_ons_een_dief_n_18c3682f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #186 |
| 187 | M18.4 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/famke_dinsdag_naar_bourtange_voo_aca10cba.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #187 |
| 188 | M18.4 | Anita (Callirrhoe) | `lines/anita/ik_kom_5ca3e3df.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #188 |
| 189 | M18.4 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/doe_je_jas_aan_6911ac77.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #189 |
| 190 | M18.4 | Anita (Callirrhoe) | `lines/anita/dat_zei_ik_ook_28afc592.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #190 |
| 191 | O8 | Anita (Callirrhoe) | `lines/anita/geprint_53af6875.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #191 |
| 192 | N9 | Anita (Callirrhoe) | `lines/anita/dat_daar_is_de_grote_beer_3d6cc0a6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #192 |
| 193 | N9 | Anita (Callirrhoe) | `lines/anita/dan_is_dat_de_grote_beer_29602144.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #193 |
| 194 | N9 | Anita (Callirrhoe) | `lines/anita/je_kijkt_niet_1b09932d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #194 |
| 195 | N9 | Anita (Callirrhoe) | `lines/anita/dat_is_geen_beer_e724c885.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #195 |
| 196 | N9 | Anita (Callirrhoe) | `lines/anita/het_eet_je_sok_0a0adfc2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #196 |
| 197 | N9 | Anita (Callirrhoe) | `lines/anita/welterusten_tammo_cb733d40.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #197 |
| 198 | M19.1 | Anita (Callirrhoe) | `lines/anita/de_machinist_is_omgekocht_hij_ee_361aad50.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #198 |
| 199 | M19.1 | Anita (Callirrhoe) | `lines/anita/in_jelles_salonrijtuig_zitten_de_352ea865.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #199 |
| 200 | M19.1 | Anita (Callirrhoe) | `lines/anita/wie_de_jury_koopt_hoeft_niet_te__1280e2d5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #200 |
| 201 | M19.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_een_eierbal_is_een_gesch_648f1be8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #201 |
| 202 | M19.3 | Anita (Callirrhoe) | `lines/anita/berend_wie_zit_de_jury_voor_als__d30fd68e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #202 |
| 203 | M20.3 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/er_is_geen_overeenkomst_jonge_er_52b695e3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #203 |
| 204 | M20.3 | Anita (Callirrhoe) | `lines/anita/van_de_jas_tammo_en_tige_tank_j__8afbf9b5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #204 |
| 205 | M20.3 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/omdat_mijn_kleinzoon_gekke_dinge_00bf2429.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #205 |
| 206 | M20.5 | Anita (Callirrhoe) | `lines/anita/henks_zender_piept_onze_auto_sta_779a7d18.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #206 |
| 207 | M21.2 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/famke_de_trein_met_de_rode_auto__732f0c29.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #207 |
| 208 | M21.2 | Anita (Callirrhoe) | `lines/anita/dank_u_mevrouw_terpstra_db3640ff.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #208 |
| 209 | M21.2 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/zeg_maar_weer_mem_c341dbeb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #209 |
| 210 | B4 | Anita (Callirrhoe) | `lines/anita/ik_speelde_thuis_in_een_dorpstea_03583ba1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #210 |
| 211 | B4.1 | Anita (Callirrhoe) | `lines/anita/dat_ik_te_veel_praat_fab06448.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #211 |
| 212 | B4.2 | Anita (Callirrhoe) | `lines/anita/mijn_moeder_belde_anneke_ze_komt_0e422942.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #212 |
| 213 | B4.2 | Anita (Callirrhoe) | `lines/anita/alleen_lieke_mijn_nichtje_ze_is__0d7db67a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #213 |
| 214 | O9 | Anita (Callirrhoe) | `lines/anita/ik_heb_de_auto_31b5e933.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #214 |
| 215 | O9 | Anita (Callirrhoe) | `lines/anita/hoe_is_het_met_de_vrienden_van_o_64126236.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #215 |
| 216 | O9 | Anita (Callirrhoe) | `lines/anita/dat_doet_er_niet_toe_b58d6f56.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #216 |
| 217 | O9 | Anita (Callirrhoe) | `lines/anita/zonder_auto_sta_jij_nergens_5854a97f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #217 |
| 218 | O9 | Anita (Callirrhoe) | `lines/anita/ik_ook_9e34229c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #218 |
| 219 | M22.1 | Anita (Callirrhoe) | `lines/anita/wij_maken_van_de_escapade_de_sna_face5df1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #219 |
| 220 | M22.2 | Anita (Callirrhoe) | `lines/anita/dat_is_een_snackwagen_148b4aee.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #220 |
| 221 | M22.2 | Anita (Callirrhoe) | `lines/anita/het_is_een_voordeur_een_voordeur_46e80c72.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #221 |
| 222 | M22.2 | Anita (Callirrhoe) | `lines/anita/het_is_een_naam_83e303b3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #222 |
| 223 | M22.4 | Anita (Callirrhoe) | `lines/anita/ik_moet_je_iets_vertellen_ik_woo_126a1af3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #223 |
| 224 | M22.4 | Anita (Callirrhoe) | `lines/anita/mem_zegt_elke_zomer_jas_het_enig_4224b857.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #224 |
| 225 | M22.4 | Anita (Callirrhoe) | `lines/anita/de_snackwagen_is_een_thuis_op_wi_5845b0cb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #225 |
| 226 | M24.1 | Anita (Callirrhoe) | `lines/anita/de_vlag_hangt_precies_boven_de_p_6d464267.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #226 |
| 227 | M24.1 | Anita (Callirrhoe) | `lines/anita/foar_mem_voor_zijn_oma_b00b6df2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #227 |
| 228 | M24.1 | Anita (Callirrhoe) | `lines/anita/en_waarom_luistert_die_duif_naar_0316bafb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #228 |
| 229 | O10 | Anita (Callirrhoe) | `lines/anita/rekening_voor_het_gebruik_van_de_4d913bd8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #229 |
| 230 | O10 | Anita (Callirrhoe) | `lines/anita/genoeg_om_te_zien_dat_hij_bang_i_0df15930.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #230 |
| 231 | O10 | Anita (Callirrhoe) | `lines/anita/hij_stuurt_een_rekening_hij_belt_8df99fac.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #231 |
| 232 | O10 | Anita (Callirrhoe) | `lines/anita/zijn_vergunning_voor_morgen_even_c66a45e9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #232 |
| 233 | O10 | Anita (Callirrhoe) | `lines/anita/hij_stuurt_altijd_alles_in_driev_731de779.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #233 |
| 234 | M25.3 | Anita (Callirrhoe) | `lines/anita/je_biedt_geld_voor_iets_wat_geen_7a19a11a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #234 |
| 235 | M25.6 | Anita (Callirrhoe) | `lines/anita/mam_het_is_half_twaalf_6c86280f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #235 |
| 236 | M25.6 | Anita (Callirrhoe) | `lines/anita/wij_wonen_samen_5c1745e2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #236 |
| 237 | M26.2 | Anita (Callirrhoe) | `lines/anita/en_de_gouden_eierbal_20aae43c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #237 |
| 238 | M26.4 | Anita (Callirrhoe) | `lines/anita/de_snackwagen_is_breder_dan_de_s_45a8c3b9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #238 |
| 239 | M26.5 | Anita (Callirrhoe) | `lines/anita/je_eigen_vergunning_jelle_deze_s_cc6911f1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #239 |
| 240 | M26.5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/voor_mijn_vlag_225598b4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #240 |
| 241 | M26.5 | Anita (Callirrhoe) | `lines/anita/op_een_evenement_staat_een_kraam_351df14c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #241 |
| 242 | M26.5 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/jouw_duiven_hadden_geen_vergunni_71dc2491.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #242 |
| 243 | M26.6 | Anita (Callirrhoe) | `lines/anita/en_de_onze_df92f2e6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #243 |
| 244 | M26.13 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/dat_is_mijn_kleinzoon_1a39d933.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #244 |
| 245 | M26.7 | Anita (Callirrhoe) | `lines/anita/mien_jong_dat_duurde_vijf_jaar_d0a579f9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #245 |
| 246 | E1 | Anita (Callirrhoe) | `lines/anita/willemien_staat_weer_vooraan_haa_b37272c2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #246 |
| 247 | E1 | Anita (Callirrhoe) | `lines/anita/berend_heeft_de_foto_laten_inlij_624cdaff.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #247 |
| 248 | E1 | Anita (Callirrhoe) | `lines/anita/de_duiven_staan_weer_in_de_rij_1c7c2c25.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #248 |
| 249 | E2 | Anita (Callirrhoe) | `lines/anita/hij_zegt_niks_4a5de544.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #249 |
| 250 | E2 | Anita (Callirrhoe) | `lines/anita/hij_koopt_door_0a590412.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #250 |
| 251 | O11 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mevrouw_tessa_ee_n_eierbal_met_m_c927fd99.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #251 |
| 252 | O11 | Anita (Callirrhoe) | `lines/anita/de_snackwagen_staat_op_de_vismar_c9043c3a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #252 |
| 253 | O11 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mijn_assistent_haalt_hem_ik_beta_5432ae72.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #253 |
| 254 | O11 | Anita (Callirrhoe) | `lines/anita/uit_een_klomp_f5444363.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #254 |
| 255 | O11 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mijn_juristen_kijken_naar_die_kl_99e5df1b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #255 |
| 256 | O11 | Anita (Callirrhoe) | `lines/anita/een_eierbal_voor_zijn_oma_d6b4453e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #256 |
| 257 | M29.2 | Anita (Callirrhoe) | `lines/anita/en_de_eierballen_die_staan_er_mo_44402c57.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #257 |
| 258 | M29.2 | Tammo (Orus) | `lines/tammo/een_eierbal_dat_is_anders_e75b2145.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #258 |
| 259 | M30.6 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/dat_pand_ken_ik_ik_wacht_tot_de__59f83380.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #259 |
| 260 | O12 | Anita (Callirrhoe) | `lines/anita/wat_nu_64c9b123.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #260 |
| 261 | O12 | Anita (Callirrhoe) | `lines/anita/waarheen_186b2466.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #261 |
| 262 | O12 | Anita (Callirrhoe) | `lines/anita/een_pand_de_bieten_veendam_een_t_9b2335f1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #262 |
| 263 | O12 | Anita (Callirrhoe) | `lines/anita/samen_fe4daed9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #263 |
| 264 | Missie-cutscenes | Tammo (Orus) | `lines/tammo/hij_hangt_een_vlag_aan_onze_tore_180bffcc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #264 |
| 265 | Missie-cutscenes | Anita (Callirrhoe) | `lines/anita/een_oefenbal_hij_oefent_hoe_hij__b4840ae1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #265 |
| 266 | Missie-cutscenes | Tammo (Orus) | `lines/tammo/tige_tank_foar_de_auto_j_de_snac_bece8bc9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #266 |
| 267 | Missie-cutscenes | Tammo (Orus) | `lines/tammo/iemand_uit_friesland_dat_was_zij_8e0a74d6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #267 |
| 268 | Intro-montage | Tammo (Orus) | `lines/tammo/dan_rijdt_hij_nauwelijks_voor_jo_f1f6d7cc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #268 |
| 269 | Missie-intro (terugval) | Tammo (Orus) | `lines/tammo/gronings_ontzet_de_noordelijke_s_c980a213.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #269 |
| 270 | Missie-intro (terugval) | Anita (Callirrhoe) | `lines/anita/gronings_ontzet_de_noordelijke_s_60a120cf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #270 |
| 271 | Na het verhaal (intro) | Anita (Callirrhoe) | `lines/anita/onze_eigen_snackwagen_met_kentek_4ef39a32.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #271 |
| 272 | Telefoon (gesprekken) | Anita (Callirrhoe) | `lines/anita/en_de_snackwagen_is_van_ons_hij__2e025aac.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #272 |
| 273 | Berichten (app) | Ubbo (Laomedeia) | `sms/ubbo/alles_gedaan_grunn_is_van_jou_de_ef9cfbeb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #273 |
| 274 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/ver_weg_he_open_de_kaart_daar_be_8bf3f56b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #274 |
| 275 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/ver_weg_he_open_de_kaart_daar_be_ee6a704c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #275 |
| 276 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/dat_is_een_heel_eind_via_de_kaar_5774d079.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #276 |
| 277 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/dat_is_een_heel_eind_via_de_kaar_11802675.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #277 |
| 278 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/ver_weg_he_er_rijdt_ook_een_bus__f3131ee5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #278 |
| 279 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/ver_weg_he_er_rijdt_ook_een_bus__90efd1c6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #279 |
| 280 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/wist_je_dat_het_ook_met_het_ov_k_b4f8fbae.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #280 |
| 281 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/wist_je_dat_het_ook_met_het_ov_k_db6f7b65.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #281 |
| 282 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/geen_zin_om_zo_ver_te_rijden_pak_52a181c4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #282 |
| 283 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/geen_zin_om_zo_ver_te_rijden_pak_e095e9f5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #283 |
| 284 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/instappen_met_e_bij_de_kop_w_is__9bbe11a8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #284 |
| 285 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/blijf_op_de_noordwal_staan_tot_h_c4513247.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #285 |
| 286 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/durk_en_douwe_houden_je_bezig_na_34ed86d4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #286 |
| 287 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/durk_en_douwe_houden_je_bezig_na_1f297e34.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #287 |
| 288 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/durk_en_douwe_springen_mee_aanlo_12c36149.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #288 |
| 289 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/durk_en_douwe_springen_mee_aanlo_ea108637.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #289 |
| 290 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/mem_en_oma_trijntje_zitten_in_de_f06b7018.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #290 |
| 291 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/mem_en_oma_trijntje_zitten_in_de_b9e248a6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #291 |
| 292 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/houd_de_deur_van_de_kruitkelder__c4aaa50f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #292 |
| 293 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/houd_de_deur_van_de_kruitkelder__cc44a6c6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #293 |
| 294 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_tweede_deur_geeft_mee_rennen_c1608fb9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #294 |
| 295 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_tweede_deur_geeft_mee_rennen_8750afb8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #295 |
| 296 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/houd_ook_de_tweede_deur_daarna_d_c0796402.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #296 |
| 297 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/houd_ook_de_tweede_deur_daarna_d_a921c676.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #297 |
| 298 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_derde_deur_de_bal_blijft_hier_5c29331b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #298 |
| 299 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_derde_deur_de_bal_blijft_hier_256b1e2b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #299 |
| 300 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_laatste_deur_daarna_naar_de_p_51cf9b30.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #300 |
| 301 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_laatste_deur_daarna_naar_de_p_c7e152c7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #301 |
| 302 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/links_is_vrij_naar_de_poort_bere_bf9402a5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #302 |
| 303 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/links_is_vrij_naar_de_poort_bere_2916f3a9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #303 |
| 304 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_naspeling_is_klaar_blijf_even_f1dc5452.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #304 |
| 305 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_naspeling_is_klaar_blijf_even_c59705d5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #305 |
| 306 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_kras_van_de_wagon_zit_op_de_e_947f02ce.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #306 |
| 307 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_kras_van_de_wagon_zit_op_de_e_57099ad9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #307 |
| 308 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/mems_appje_de_trein_met_de_rode__47a5cae7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #308 |
| 309 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/mems_appje_de_trein_met_de_rode__03403f60.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #309 |
| 310 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_trein_rijdt_druk_op_spatie_om_e87508db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #310 |
| 311 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_trein_rijdt_druk_op_spatie_om_2d4f0e71.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #311 |
| 312 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/jelles_mannen_staan_op_de_wagon__7c76ec5e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #312 |
| 313 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/jelles_mannen_staan_op_de_wagon__0f9ae746.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #313 |
| 314 | Keuzegesprekken | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/u_kunt_de_auto_redden_of_de_bal__4c61688a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #314 |
| 315 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/oma_heeft_alle_vrienden_met_hun__9e75fa96.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #315 |
| 316 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/oma_heeft_alle_vrienden_met_hun__528b3c1d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #316 |
| 317 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/blijf_bij_de_wagen_henk_bouwt_he_23021a92.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #317 |
| 318 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/blijf_bij_de_wagen_henk_bouwt_he_ab31ccde.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #318 |
| 319 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/henk_zaagt_een_gat_in_de_zijkant_6eeaa325.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #319 |
| 320 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/henk_zaagt_een_gat_in_de_zijkant_573b88df.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #320 |
| 321 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/instappen_tinus_wijst_naar_het_w_e086fa47.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #321 |
| 322 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/instappen_tinus_wijst_naar_het_w_f2bed051.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #322 |
| 323 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/gas_sturen_niet_vastlopen_henk_w_1ad93cad.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #323 |
| 324 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/gas_sturen_niet_vastlopen_henk_w_2c595403.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #324 |
| 325 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/houd_de_snelheid_erin_in_de_modd_37cff950.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #325 |
| 326 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/houd_de_snelheid_erin_in_de_modd_7c1d2904.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #326 |
| 327 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/rij_hem_de_modder_in_als_de_acht_feed3d3d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #327 |
| 328 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/rij_hem_de_modder_in_als_de_acht_149308d5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #328 |
| 329 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/vast_tinus_haakt_de_trekker_aan__1c10146f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #329 |
| 330 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/vast_tinus_haakt_de_trekker_aan__7b1fee60.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #330 |
| 331 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/rij_voorop_de_colonne_volgt_zola_91ac2b9b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #331 |
| 332 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/rij_voorop_de_colonne_volgt_zola_5ebadc50.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #332 |
| 333 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/ee_n_vriend_rijdt_vlak_naast_jul_7596b732.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #333 |
| 334 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/ee_n_vriend_rijdt_vlak_naast_jul_d2c7de23.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #334 |
| 335 | Keuzegesprekken | Anita (Callirrhoe) | `lines/anita/alle_vrienden_rijden_mee_maar_e__65994f51.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #335 |
| 336 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/instappen_tessa_zei_wij_voorop_010388aa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #336 |
| 337 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/rij_voorop_naar_aduard_wie_te_ve_b6a4af07.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #337 |
| 338 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/rij_voorop_naar_aduard_wie_te_ve_fde26a4b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #338 |
| 339 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/wubbo_opent_de_brug_op_afstand_m_6ac8b600.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #339 |
| 340 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/wubbo_opent_de_brug_op_afstand_m_fd276ec5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #340 |
| 341 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/nog_vijf_kilometer_de_hele_colon_3f1e45dc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #341 |
| 342 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/nog_vijf_kilometer_de_hele_colon_083b1d83.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #342 |
| 343 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/bak_in_oma_s_keuken_ei_zout_grof_8245aa8b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #343 |
| 344 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/bak_in_oma_s_keuken_ei_zout_grof_f29c248d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #344 |
| 345 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/oma_s_volgorde_eerst_het_ei_dan__ec64947f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #345 |
| 346 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/oma_s_volgorde_eerst_het_ei_dan__ac2e806f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #346 |
| 347 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/kwart_voor_drie_de_limo_rijdt_na_964ada11.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #347 |
| 348 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/kwart_voor_drie_de_limo_rijdt_na_a46268a8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #348 |
| 349 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/oma_s_volgorde_ei_zout_grof_meel_f0d16170.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #349 |
| 350 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/oma_s_volgorde_ei_zout_grof_meel_a14dbbd9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #350 |
| 351 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/kwart_voor_drie_instappen_de_lim_49ac03e7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #351 |
| 352 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/kwart_voor_drie_instappen_de_lim_e776dbd1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #352 |
| 353 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/berend_proeft_voor_het_laatst_ze_62b01348.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #353 |
| 354 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/berend_proeft_voor_het_laatst_ze_2c906a7a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #354 |
| 355 | Keuzegesprekken | Berend Bos (Charon) | `lines/berend_bos/wat_maakt_deze_eierbal_gronings__e0a308e6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #355 |
| 356 | Keuzegesprekken | Berend Bos (Charon) | `lines/berend_bos/en_waarom_moet_de_standplaats_na_cb573f08.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #356 |
| 357 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/willemiens_huis_in_loppersum_boe_f98990b9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #357 |
| 358 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/willemiens_huis_in_loppersum_boe_c2e58fec.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #358 |
| 359 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/boeken_in_kleine_dozen_blijf_bij_fdc6386a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #359 |
| 360 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/boeken_in_kleine_dozen_blijf_bij_63e22e0e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #360 |
| 361 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/breekbaar_in_de_krant_blijf_in_d_7f7b7f24.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #361 |
| 362 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/breekbaar_in_de_krant_blijf_in_d_efaa96a3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #362 |
| 363 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_kat_wil_nergens_in_blijf_bij__68e4842a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #363 |
| 364 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_kat_wil_nergens_in_blijf_bij__92e13d56.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #364 |
| 365 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_dozen_staan_klaar_naar_de_ver_bac6a78e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #365 |
| 366 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_dozen_staan_klaar_naar_de_ver_596f56a7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #366 |
| 367 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_verhuisbus_staat_voor_het_hui_1a6213e6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #367 |
| 368 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_verhuisbus_staat_voor_het_hui_c10d0560.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #368 |
| 369 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/instappen_tammo_rijdt_rustig_7b1e92a9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #369 |
| 370 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/rustig_rijden_niet_om_de_spullen_39698032.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #370 |
| 371 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/rustig_rijden_niet_om_de_spullen_8234dbba.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #371 |
| 372 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/een_buurtfeest_op_het_erf_in_lop_2616ebd4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #372 |
| 373 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/een_buurtfeest_op_het_erf_in_lop_50020713.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #373 |
| 374 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/tafels_op_het_erf_blijf_staan_to_c000632a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #374 |
| 375 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/tafels_op_het_erf_blijf_staan_to_aa717e1c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #375 |
| 376 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_foto_hangt_in_de_gang_waar_je_e13e3c7c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #376 |
| 377 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_foto_hangt_in_de_gang_waar_je_8d7e09ba.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #377 |
| 378 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/een_hooiberg_op_de_heide_ten_noo_1080b90b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #378 |
| 379 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/een_hooiberg_op_de_heide_ten_noo_a6ef2d47.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #379 |
| 380 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/aanvallen_eerst_de_gracht_lammer_21ccc193.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #380 |
| 381 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/aanvallen_eerst_de_gracht_lammer_9d72285e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #381 |
| 382 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/wubbo_staat_bij_de_lier_hij_open_70d8aa4a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #382 |
| 383 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/wubbo_staat_bij_de_lier_hij_open_60e1ea73.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #383 |
| 384 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/boven_jullie_komt_meel_hoofd_oml_05122999.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #384 |
| 385 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/boven_jullie_komt_meel_hoofd_oml_dc71c330.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #385 |
| 386 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/blijf_op_het_bolwerk_staan_tot_d_91f0e960.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #386 |
| 387 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/blijf_op_het_bolwerk_staan_tot_d_0b423f46.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #387 |
| 388 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/het_tweede_bolwerk_de_duiven_lui_4209ae51.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #388 |
| 389 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/het_derde_bolwerk_tinus_trekt_de_6d7ab59c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #389 |
| 390 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/het_derde_bolwerk_tinus_trekt_de_95651283.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #390 |
| 391 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/blijf_op_het_bolwerk_staan_tot_d_23d6f271.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #391 |
| 392 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/blijf_op_het_bolwerk_staan_tot_d_9a253293.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #392 |
| 393 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/drie_vlaggen_naar_de_poort_beren_1a9344a6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #393 |
| 394 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/drie_vlaggen_naar_de_poort_beren_a868d1cf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #394 |
| 395 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_snackwagen_staat_open_iederee_0a1ce2d5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #395 |
| 396 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_snackwagen_staat_open_iederee_38820ad8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #396 |
| 397 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_rij_staat_binnen_achter_de_gl_bb1d8947.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #397 |
| 398 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_rij_staat_binnen_achter_de_gl_0743bdf5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #398 |
| 399 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/blijf_in_de_rij_staan_tot_4117_w_679bfc91.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #399 |
| 400 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/blijf_in_de_rij_staan_tot_4117_w_830e2386.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #400 |
| 401 | Keuzegesprekken | Loketbediende (Autonoe) | `lines/loketbediende/welk_formulier_had_u_nodig_7c955923.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #401 |
| 402 | Keuzegesprekken | Loketbediende (Autonoe) | `lines/loketbediende/en_waar_haalt_u_de_stempel_0834d0ca.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #402 |
| 403 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/alles_bij_elkaar_nu_inschrijven__c1c11d35.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #403 |
| 404 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/alles_bij_elkaar_nu_inschrijven__8d8ac02a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #404 |
| 405 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/eerst_de_grote_markt_vijftienhon_424120cf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #405 |
| 406 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/eerst_de_grote_markt_vijftienhon_affd2864.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #406 |
| 407 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/in_de_kooi_van_de_kraan_lammert__1683774a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #407 |
| 408 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/in_de_kooi_van_de_kraan_lammert__2c8123c9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #408 |
| 409 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/van_boven_zag_je_hem_de_blauwe_n_f4086149.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #409 |
| 410 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/van_boven_zag_je_hem_de_blauwe_n_ff7df391.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #410 |
| 411 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/papieren_eruit_papieren_erin_eve_b99da06f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #411 |
| 412 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/papieren_eruit_papieren_erin_eve_b9751011.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #412 |
| 413 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/klaar_terug_naar_de_kade_voor_he_0e3246ab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #413 |
| 414 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/klaar_terug_naar_de_kade_voor_he_52a29308.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #414 |
| 415 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_auto_blijft_bij_de_sluis_lamm_2a083678.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #415 |
| 416 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_auto_blijft_bij_de_sluis_lamm_447f169f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #416 |
| 417 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/instappen_de_trekker_limo_van_je_d9cbd146.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #417 |
| 418 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/instappen_de_trekker_limo_van_je_80c774db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #418 |
| 419 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/naar_de_sluis_van_delfzijl_over__24b97c12.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #419 |
| 420 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/naar_de_sluis_van_delfzijl_over__f2ecbc57.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #420 |
| 421 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/roelfiens_rode_gewasspuiter_staa_e9f47e39.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #421 |
| 422 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/opstijgen_en_laag_over_het_graan_5ebb9c06.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #422 |
| 423 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/opstijgen_en_laag_over_het_graan_4b4f21a9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #423 |
| 424 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/spandoek_opgepikt_laag_blijven_n_028b69f4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #424 |
| 425 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/spandoek_opgepikt_laag_blijven_n_d71247b8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #425 |
| 426 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/ze_lezen_het_door_de_rij_kramen_3b76a234.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #426 |
| 427 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/ze_lezen_het_door_de_rij_kramen_6143a3f3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #427 |
| 428 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/voorbij_de_kermis_nu_terug_naar__959c5f21.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #428 |
| 429 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/voorbij_de_kermis_nu_terug_naar__89cd0799.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #429 |
| 430 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/terug_naar_de_strook_gas_terug_m_4167ca05.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #430 |
| 431 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/terug_naar_de_strook_gas_terug_m_7053dbe9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #431 |
| 432 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/podium_in_de_kiezelrace_dan_vert_48887f24.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #432 |
| 433 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/podium_in_de_kiezelrace_dan_vert_1d8eb0c2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #433 |
| 434 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/instappen_de_tankwagen_staat_bij_ce5b97f5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #434 |
| 435 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/instappen_de_tankwagen_staat_bij_325c65a4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #435 |
| 436 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/instappen_bij_dijkstra_spatie_om_64a6e3c8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #436 |
| 437 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/instappen_bij_dijkstra_spatie_om_101e075b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #437 |
| 438 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/loop_langs_drie_tenten_en_drink__8059ba59.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #438 |
| 439 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/loop_langs_drie_tenten_en_drink__0f02c918.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #439 |
| 440 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/die_pan_staat_hier_al_sinds_gist_0c3ca9ea.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #440 |
| 441 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dat_is_een_pan_met_een_verhaal_b4ad0266.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #441 |
| 442 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/het_verhaal_heet_wie_wast_hem_af_1e74667c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #442 |
| 443 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_morgen_06f3414d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #443 |
| 444 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/wie_neemt_de_badkamer_als_eerste_336b767f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #444 |
| 445 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ik_ik_sta_er_al_drie_minuten_voo_e8f17e9b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #445 |
| 446 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/je_zit_hier_aan_tafel_fea6e5c5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #446 |
| 447 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/in_gedachten_cd1938da.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #447 |
| 448 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/wie_heeft_mijn_yoghurt_opgegeten_bbae9fba.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #448 |
| 449 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/er_stond_geen_naam_op_b7efcbb8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #449 |
| 450 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/er_stond_tessa_op_b9de03ab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #450 |
| 451 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_las_dat_als_een_suggestie_94c081ce.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #451 |
| 452 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/koffie_f36dc5b3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #452 |
| 453 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ja_eh_nee_ja_c9337043.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #453 |
| 454 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_zet_er_twee_neer_dan_kies_jij_841b8af1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #454 |
| 455 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_is_eigenlijk_heel_redelijk_90a24600.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #455 |
| 456 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ik_heb_een_schoonmaakrooster_gem_a2c5009f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #456 |
| 457 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_zie_mijn_naam_zeven_keer_4c93519f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #457 |
| 458 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ik_zie_jouw_pan_zeven_keer_f860a899.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #458 |
| 459 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dat_is_een_eerlijke_ruil_538fc4bb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #459 |
| 460 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/je_wekker_ging_om_zes_uur_af_b3a0faa4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #460 |
| 461 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_weet_ik_ik_leg_hem_ver_weg_15c690f5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #461 |
| 462 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dat_wist_de_hele_flat_nu_ook_036f0bde.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #462 |
| 463 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dan_zijn_we_eerlijk_tegen_elkaar_27338a29.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #463 |
| 464 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/roerei_of_spiegelei_fbb82d0d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #464 |
| 465 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/wat_wordt_het_als_jij_er_verstan_c5e35f06.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #465 |
| 466 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/roerei_dan_zie_je_niet_dat_het_m_6fa95b47.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #466 |
| 467 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ik_eet_het_toch_op_5923d272.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #467 |
| 468 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/proef_eens_f7f31f40.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #468 |
| 469 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/het_is_goed_97201844.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #469 |
| 470 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_zeg_je_altijd_1f2a3223.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #470 |
| 471 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/omdat_het_altijd_goed_is_d92e590d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #471 |
| 472 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/je_hebt_een_kruimel_op_je_kin_1e0cca39.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #472 |
| 473 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/waar_c8edf50c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #473 |
| 474 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/links_nee_jouw_links_6b2fbb5a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #474 |
| 475 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/nu_zit_hij_op_je_mouw_b7a485bc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #475 |
| 476 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/je_haar_zit_anders_644e671d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #476 |
| 477 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/het_is_dinsdag_a7479158.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #477 |
| 478 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/het_staat_je_goed_op_dinsdag_d90c71d7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #478 |
| 479 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dank_je_eet_je_boterham_8ee2f095.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #479 |
| 480 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_heb_een_eierbal_gebakken_voor_cc47fdbb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #480 |
| 481 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/hij_is_vierkant_66cb3b09.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #481 |
| 482 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/hij_is_creatief_edae7e63.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #482 |
| 483 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ik_eet_hem_toch_op_voor_de_vrien_d412758c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #483 |
| 484 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/als_we_winnen_wat_dan_13f04b08.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #484 |
| 485 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dan_krijgt_de_frietwagen_een_nie_8a2c5b1e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #485 |
| 486 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/een_lamp_50e0b284.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #486 |
| 487 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/een_grote_zodat_jij_hem_ziet_d9bbeb81.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #487 |
| 488 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/wat_kijken_we_db231066.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #488 |
| 489 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/maakt_niet_uit_6bb74591.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #489 |
| 490 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/omdat_jij_naast_me_zit_be3522fc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #490 |
| 491 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_was_aardig_zet_maar_iets_aan_696edcd0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #491 |
| 492 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dit_nummer_ken_ik_e32aa27a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #492 |
| 493 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dans_je_mee_8a0a7d71.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #493 |
| 494 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/in_de_keuken_5747ce43.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #494 |
| 495 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/overal_waar_jij_staat_3baa671e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #495 |
| 496 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/goedemorgen_9cc8e12a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #496 |
| 497 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/koffie_staat_klaar_027f0493.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #497 |
| 498 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/je_bent_de_beste_2f6f533c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #498 |
| 499 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/wacht_ik_moet_even_gaan_zitten_c976ceff.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #499 |
| 500 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/eerst_de_vismarkt_c7c3faaa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #500 |
| 501 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dan_de_kade_7aff1578.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #501 |
| 502 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/en_daarna_95bcc718.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #502 |
| 503 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/daarna_iets_met_jou_08fdcd3e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #503 |
| 504 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_staat_al_op_de_lijst_b670c12b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #504 |
| 505 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/met_melk_niet_te_veel_2d33f190.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #505 |
| 506 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/je_weet_het_nog_43472179.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #506 |
| 507 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ik_weet_alles_van_jou_cd14dfdc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #507 |
| 508 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dat_is_veel_6de340a5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #508 |
| 509 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/het_is_tweee_ntwintig_graden_631b8d35.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #509 |
| 510 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_zeg_je_elke_dag_439b008d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #510 |
| 511 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/omdat_ik_het_fijn_vind_fccf497e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #511 |
| 512 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/het_is_stil_in_de_flat_ce68a564.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #512 |
| 513 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/niemand_zoekt_ons_ac33b0eb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #513 |
| 514 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_is_nieuw_e5b8edc6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #514 |
| 515 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_wen_eraan_f6cb9f1f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #515 |
| 516 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/roerei_zoals_jij_het_wilt_04f2dcd3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #516 |
| 517 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/zonder_dat_het_mislukt_is_4321bb33.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #517 |
| 518 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dat_was_de_oefening_43009ff6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #518 |
| 519 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/en_dit_is_de_les_42c3b3a8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #519 |
| 520 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/hoeveel_woorden_waren_het_ook_al_d34c455f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #520 |
| 521 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/vijf_98324fee.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #521 |
| 522 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/zeg_ze_nog_eens_26f4f9ff.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #522 |
| 523 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/je_wast_af_2da188bd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #523 |
| 524 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_zei_toch_morgen_597766da.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #524 |
| 525 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_was_twee_weken_geleden_38580660.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #525 |
| 526 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_ben_een_man_van_mijn_woord_22c2d0db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #526 |
| 527 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/wat_doen_we_vandaag_a4252802.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #527 |
| 528 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/niks_a0b352a1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #528 |
| 529 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/niks_is_een_goed_plan_073a6a22.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #529 |
| 530 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dan_is_het_al_gelukt_390e85a2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #530 |
| 531 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/rikus_zegt_dat_het_zomer_blijft_f3e0692a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #531 |
| 532 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/rikus_heeft_altijd_gelijk_0b3dddc3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #532 |
| 533 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_zegt_hij_zelf_ook_5ac623dd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #533 |
| 534 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dan_zal_het_wel_kloppen_4bcf6172.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #534 |

De wachtrij heeft 534 clips (3 manifest(en): lines, sms, hints).

## 2. Wacht op een Groningse spreektekst of stemkeuze

| Stap | Reden | Regels |
|---|---|---|
| E | Groningse spreektekst ontbreekt | 10 |
| M00 | Groningse spreektekst ontbreekt | 3 |
| M02 | Groningse spreektekst ontbreekt | 8 |
| M03 | Groningse spreektekst ontbreekt | 6 |
| M04 | Groningse spreektekst ontbreekt | 8 |
| M06 | Groningse spreektekst ontbreekt | 10 |
| M07 | Groningse spreektekst ontbreekt | 1 |
| M08 | Groningse spreektekst ontbreekt | 7 |
| M09 | Groningse spreektekst ontbreekt | 2 |
| M10 | Groningse spreektekst ontbreekt | 5 |
| M11 | Groningse spreektekst ontbreekt | 13 |
| M12 | Groningse spreektekst ontbreekt | 7 |
| M13 | Groningse spreektekst ontbreekt | 8 |
| M14 | Groningse spreektekst ontbreekt | 3 |
| M15 | Groningse spreektekst ontbreekt | 7 |
| M16 | Groningse spreektekst ontbreekt | 19 |
| M17 | Groningse spreektekst ontbreekt | 5 |
| M18 | Groningse spreektekst ontbreekt | 9 |
| M19 | Groningse spreektekst ontbreekt | 8 |
| M20 | Groningse spreektekst ontbreekt | 1 |
| M21 | Groningse spreektekst ontbreekt | 14 |
| M22 | Groningse spreektekst ontbreekt | 5 |
| M23 | Groningse spreektekst ontbreekt | 1 |
| M24 | Groningse spreektekst ontbreekt | 7 |
| M25 | Groningse spreektekst ontbreekt | 4 |
| M26 | Groningse spreektekst ontbreekt | 26 |
| M27 | Groningse spreektekst ontbreekt | 2 |
| M28 | Groningse spreektekst ontbreekt | 1 |
| M29 | Groningse spreektekst ontbreekt | 1 |
| M30 | Groningse spreektekst ontbreekt | 6 |
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
| M06 | stemkeuze ontbreekt in CAST | 2 |
| M15 | stemkeuze ontbreekt in CAST | 3 |
| M17 | stemkeuze ontbreekt in CAST | 4 |
| M25 | stemkeuze ontbreekt in CAST | 6 |
| M30 | stemkeuze ontbreekt in CAST | 1 |
| N2 | stemkeuze ontbreekt in CAST | 3 |

Alle 282 regels staan met bron, spreker, stem en beoogde bestandsnaam in `TTS-OPNAMELIJST-735.jsonl` (status `stemkeuze` of `spreektekst`); die kunnen pas in de wachtrij als de stem of de spreektekst er is.

## 3. Technische laadhint (aparte beslissing)

De nieuwe laadhint `"De weg hier wordt nog geladen. Even wachten…"` staat bewust **niet** in de wachtrij: `scripts/voicelines_collect.mjs` zet hem in `TECH_HINTS` (een technische melding, geen stem). Het issue #735 noemt hier 2 clips (Tammo/Anita) voor. Wil de eigenaar die toch, dan is dat een aparte opname en een uitzondering in `TECH_HINTS`; deze lijst telt hem niet mee. (TECH_HINTS bevestigd in de bron.)

## 4. Wat de eigenaar daarna doet

1. `node scripts/tts_opnameronde.mjs --budget 2.5` (vraagt niets en leest geen sleutel; de TTS-module leest de eigenaar-sleutel zelf).
2. `node scripts/build_story_data.mjs` zet de opgenomen regels op voiced (de wrapper doet dit al).
3. `node scripts/voice_coverage.mjs --quiet` moet daarna zonder ontbrekende regels blijven.
4. Deze lijst verversen met `node scripts/tts_opnamelijst.mjs` en het issue #735 bijwerken met de nieuwe stand.

## 5. Verschil met #735

Het issue telt 670 regels/671 clips (67 klaar + 604 wachtend, plus de laadhint van 2 clips). De huidige bronnen geven 816 regels/clips: 534 klaar + 282 wachtend. Dat verschil komt doordat `script.json`, `gronings_spoken.json` en de opnames sinds 6-11 zijn bijgewerkt; deze lijst volgt de code, niet het issue.
