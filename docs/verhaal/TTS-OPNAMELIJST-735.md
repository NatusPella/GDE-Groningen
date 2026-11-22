# TTS-opnamelijst #735: definitieve lijst van deze ronde

Gegenereerd door `node scripts/tts_opnamelijst.mjs` uit `game/storydata/script.json`, `scripts/tts_lines.json`, `scripts/gronings_spoken.json` en `scripts/tts_cast.mjs`. Niet met de hand aanpassen; draai `node scripts/tts_opnamelijst.mjs --check` om te zien of deze lijst achterloopt.

**Stand van deze bronnen:** 608 clips staan klaar in de wachtrij (`scripts/tts_lines.json`), 0 verhaalregels wachten nog (0 op een stemkeuze, 0 op een Groningse spreektekst). Samen **608 regels/clips**. De 37 bewust stille appjes (`channel: app-stil`) staan er niet op.

> Het issue #735 noemt 670 regels/671 clips (stand 6-11-2026). De scripts zijn de bron: inmiddels zijn er regels bijgekomen of opgenomen, dus deze lijst telt wat de code nu zegt. Zie "Verschil met #735" onderaan.

## Route (LiteLLM, #689)

- Endpoint: `https://litellm.natuspella.nl/v1beta/interactions` (de gateway van de eigenaar; `LITELLM_BASE_URL` overschrijft het adres).
- Modelalias: `google/gemini-3.8-flash-lite-tts`; stem en stijl komen per regel uit de wachtrij.
- De sleutel staat **niet** in de repo: de eigenaar zet `LITELLM_API_KEY` in zijn eigen `.env` (gitignored, `GDE_ENV` wijst naar een andere plek) of in de omgeving. Deze lijst leest `.env` niet en print geen sleutel.
- Batchcommando (wat de runbook gebruikt): `python3 scripts/tts_lines.py --budget 2.5`; de exacte curl per regel staat in `TTS-OPNAMELIJST-735.jsonl` (kolom `curl`).

## 1. Klaar om op te nemen (in de wachtrij)

| # | Bron (scène) | Stem | Bestandsnaam | Commando |
|---|---|---|---|---|
| 1 | C00.2 | Tammo (Orus) | `lines/tammo/is_dat_het_plan_een_frietwagen_0c0dafc8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #1 |
| 2 | C00.2 | Tammo (Orus) | `lines/tammo/dan_rijd_ik_hem_tot_je_het_weet_768701fb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #2 |
| 3 | M01.1 | Berend Bos (Charon) | `lines/berend_bos/vijftig_euro_voor_wie_mijn_bakki_e727e9ce.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #3 |
| 4 | M01.1 | Tammo (Orus) | `lines/tammo/waarom_doe_je_het_niet_zelf_36051a66.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #4 |
| 5 | M01.1 | Berend Bos (Charon) | `lines/berend_bos/gips_2805e48a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #5 |
| 6 | M01.1 | Anita (Callirrhoe) | `lines/anita/hij_is_de_bisschop_die_grunn_in__734ed0de.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #6 |
| 7 | M01.1 | Berend Bos (Charon) | `lines/berend_bos/niet_erbij_vertellen_c7c9cc98.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #7 |
| 8 | M02.3 | Sjabbe (Rasalgethi) | `lines/sjabbe/dan_moet_je_groter_denken_durk_e_c34a357e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #8 |
| 9 | M02.3 | Sjabbe (Rasalgethi) | `lines/sjabbe/jelle_terpstra_betaalt_contant_u_efd286c4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #9 |
| 10 | M02.3 | Tammo (Orus) | `lines/tammo/een_klomp_87e9e1c9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #10 |
| 11 | M02.3 | Sjabbe (Rasalgethi) | `lines/sjabbe/een_klomp_is_snel_leeg_60801aff.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #11 |
| 12 | M02.3 | Sjabbe (Rasalgethi) | `lines/sjabbe/daarom_halen_ze_pinautomaten_uit_0ee32f61.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #12 |
| 13 | M02.3 | Anita (Callirrhoe) | `lines/anita/het_museum_de_gouden_eierbal_de__c361a9db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #13 |
| 14 | M02.5 | Tammo (Orus) | `lines/tammo/fijn_die_nieuwe_band_henk_vroeg__182167d1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #14 |
| 15 | O1 | Tammo (Orus) | `lines/tammo/welke_mensen_9cf67a78.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #15 |
| 16 | O1 | Tammo (Orus) | `lines/tammo/dan_zet_ik_hem_zo_neer_dat_het_p_a0e66ff5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #16 |
| 17 | O1 | Tammo (Orus) | `lines/tammo/staat_thee_erbij_2a02e5e9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #17 |
| 18 | O1 | Tammo (Orus) | `lines/tammo/het_was_er_al_980e77d9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #18 |
| 19 | O1 | Tammo (Orus) | `lines/tammo/dat_is_beppe_mijn_friese_oma_f646015c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #19 |
| 20 | O1 | Tammo (Orus) | `lines/tammo/ja_beppe_436a2dc1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #20 |
| 21 | O1 | Tammo (Orus) | `lines/tammo/ja_9b6238a7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #21 |
| 22 | N1 | Sjabbe (Rasalgethi) | `lines/sjabbe/ik_vraag_niks_ik_zeg_alleen_dit__f8ba45a9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #22 |
| 23 | N1 | Tammo (Orus) | `lines/tammo/hoe_zwaar_9de36c04.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #23 |
| 24 | N1 | Sjabbe (Rasalgethi) | `lines/sjabbe/dat_hangt_af_van_wie_hem_tilt_ik_61992b02.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #24 |
| 25 | N1 | Sjabbe (Rasalgethi) | `lines/sjabbe/dertig_met_de_trap_erbij_de_trap_baea6e0f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #25 |
| 26 | N1 | Sjabbe (Rasalgethi) | `lines/sjabbe/een_man_in_een_blauw_colbert_koc_7b1e17f3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #26 |
| 27 | N1 | Sjabbe (Rasalgethi) | `lines/sjabbe/hij_was_vriendelijk_dat_vind_ik__c065357d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #27 |
| 28 | N2 | Tammo (Orus) | `lines/tammo/dat_is_de_buurman_hij_woont_hier_4b52c648.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #28 |
| 29 | N2 | Tammo (Orus) | `lines/tammo/nee_maar_de_duif_heeft_mijn_adre_768b8f0c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #29 |
| 30 | N2 | Meneer Veldkamp (Alnilam) | `lines/meneer_veldkamp/die_zat_hier_al_hij_wacht_op_jou_04b6466c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #30 |
| 31 | N2 | Tammo (Orus) | `lines/tammo/duiven_wachten_op_niemand_e4a2ea70.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #31 |
| 32 | N2 | Meneer Veldkamp (Alnilam) | `lines/meneer_veldkamp/zes_jaar_zit_ik_hier_dat_is_de_e_a6b30200.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #32 |
| 33 | N2 | Meneer Veldkamp (Alnilam) | `lines/meneer_veldkamp/ik_eet_liever_alleen_maar_de_dui_bfd79f32.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #33 |
| 34 | N3 | Tammo (Orus) | `lines/tammo/dit_is_tessa_beppe_94200274.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #34 |
| 35 | N3 | Tammo (Orus) | `lines/tammo/eerst_eten_dan_praten_eb62f702.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #35 |
| 36 | N4 | Tammo (Orus) | `lines/tammo/links_of_rechts_660d10ad.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #36 |
| 37 | N4 | Tammo (Orus) | `lines/tammo/ik_wacht_buiten_95b24b42.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #37 |
| 38 | N4 | Tammo (Orus) | `lines/tammo/wie_koopt_een_stoep_5a860c21.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #38 |
| 39 | M03.2 | Anita (Callirrhoe) | `lines/anita/hoe_dan_a1b7ffec.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #39 |
| 40 | M03.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/met_papier_f2cf083a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #40 |
| 41 | M03.2 | Mevrouw Hoving (Gacrux) | `lines/mevrouw_hoving/ik_bewaar_de_gouden_eierbal_de_w_38a35e9d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #41 |
| 42 | M03.2 | Loketbediende (Autonoe) | `lines/loketbediende/is_zij_er_niet_dan_zit_berend_bo_8ef3dc04.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #42 |
| 43 | M03.2 | Mevrouw Hoving (Gacrux) | `lines/mevrouw_hoving/maar_ik_ben_er_maandag_niet_mene_3c30b6ac.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #43 |
| 44 | M03.2 | Loketbediende (Autonoe) | `lines/loketbediende/met_volpension_68079cc2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #44 |
| 45 | M03.2 | Mevrouw Hoving (Gacrux) | `lines/mevrouw_hoving/tot_na_het_ontzet_alleen_berend__926637ac.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #45 |
| 46 | M03.2 | Mevrouw Hoving (Gacrux) | `lines/mevrouw_hoving/een_bijzonder_aardige_man_meneer_70b053e0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #46 |
| 47 | M03.2 | Tammo (Orus) | `lines/tammo/bijzonder_0d99b920.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #47 |
| 48 | M03.4 | Anita (Callirrhoe) | `lines/anita/hij_vroeg_sjabbe_waar_het_museum_da7f826d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #48 |
| 49 | M03.4 | Tammo (Orus) | `lines/tammo/hij_wil_de_bal_1491e9ec.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #49 |
| 50 | M03.4 | Anita (Callirrhoe) | `lines/anita/wie_de_bal_heeft_zit_de_jury_voo_1f3a486a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #50 |
| 51 | M03.4 | Tammo (Orus) | `lines/tammo/als_iemand_het_museum_kent_is_he_3c1bb2e5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #51 |
| 52 | M03.4 | Duivenmelker Bert (Iapetus) | `lines/duivenmelker_bert/tammo_bert_van_de_duiven_fb27d783.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #52 |
| 53 | M03.4 | Tammo (Orus) | `lines/tammo/bert_wij_wilden_je_net_bellen_13525e5b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #53 |
| 54 | M03.4 | Duivenmelker Bert (Iapetus) | `lines/duivenmelker_bert/ik_weet_het_elke_nacht_staat_er__d7ae4b32.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #54 |
| 55 | R1.1 | Rikus (Schedar) | `lines/rikus/een_beller_voor_de_zaterdagavond_485a9097.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #55 |
| 56 | R1.1 | Rikus (Schedar) | `lines/rikus/dat_is_een_helder_plan_ik_zeg_ni_712256db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #56 |
| 57 | O2 | Rikus (Schedar) | `lines/rikus/tammo_ben_je_wakker_ik_draai_je__b661f4da.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #57 |
| 58 | O2 | Tammo (Orus) | `lines/tammo/welke_plaat_68576192.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #58 |
| 59 | O2 | Rikus (Schedar) | `lines/rikus/die_van_de_zomer_dat_we_twaalf_w_5f740105.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #59 |
| 60 | O2 | Rikus (Schedar) | `lines/rikus/en_jij_woont_ineens_op_de_elfde__fd83b9fd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #60 |
| 61 | O2 | Tammo (Orus) | `lines/tammo/ze_is_mijn_huisgenoot_653b429f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #61 |
| 62 | O2 | Rikus (Schedar) | `lines/rikus/vijf_jaar_tammo_ik_zeg_niks_8986efa3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #62 |
| 63 | O2 | Tammo (Orus) | `lines/tammo/ik_weet_het_b309795e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #63 |
| 64 | O2 | Rikus (Schedar) | `lines/rikus/slaap_lekker_jongen_7b49d6bf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #64 |
| 65 | M06.0 | Meneer Veldkamp (Alnilam) | `lines/meneer_veldkamp/jullie_lamp_brandt_het_is_bijna__7512aa3f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #65 |
| 66 | M06.0 | Meneer Veldkamp (Alnilam) | `lines/meneer_veldkamp/mijn_duiven_doen_dat_bij_niemand_b6499569.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #66 |
| 67 | B1.1 | Tammo (Orus) | `lines/tammo/wij_delen_een_koelkast_b1c77566.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #67 |
| 68 | B1.1 | Tammo (Orus) | `lines/tammo/het_is_een_hele_goede_koelkast_2dd411ff.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #68 |
| 69 | B1.2 | Tammo (Orus) | `lines/tammo/eigenlijk_een_ringmus_hij_heeft__b67df498.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #69 |
| 70 | B1.2 | Tammo (Orus) | `lines/tammo/het_was_het_enige_ac7e1924.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #70 |
| 71 | B1.3 | Tammo (Orus) | `lines/tammo/dat_hangt_van_de_jas_af_8fc2a60c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #71 |
| 72 | B1.3 | Tammo (Orus) | `lines/tammo/het_is_een_eerlijk_antwoord_9f34899b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #72 |
| 73 | O3 | Tammo (Orus) | `lines/tammo/hij_had_hem_al_95c19a1e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #73 |
| 74 | O3 | Tammo (Orus) | `lines/tammo/en_daarna_057d994f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #74 |
| 75 | O3 | Tammo (Orus) | `lines/tammo/oma_trijntje_won_in_1953_816fb695.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #75 |
| 76 | O3 | Tammo (Orus) | `lines/tammo/tessa_eigenlijk_b1837532.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #76 |
| 77 | M07.1 | Tammo (Orus) | `lines/tammo/regels_vergunningen_trucs_c439de34.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #77 |
| 78 | M08.1 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/tammo_met_je_oma_kom_naar_de_noo_58285932.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #78 |
| 79 | M08.3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/1953_dat_ik_won_weet_je_6f5bd29d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #79 |
| 80 | M08.3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/tweede_werd_gerda_terpstra_haar__b53366dd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #80 |
| 81 | M08.3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/haar_kleinzoon_zeker_ik_heb_het__9db5c8d3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #81 |
| 82 | M08.3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/zeventig_jaar_trots_dat_is_lang__c5070f0a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #82 |
| 83 | M08.3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/het_recept_van_1953_had_vijf_din_d730ecb0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #83 |
| 84 | M08.3 | Anita (Callirrhoe) | `lines/anita/vijf_vrienden_vijf_ingredie_nten_c57d5d85.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #84 |
| 85 | M08.3 | Tammo (Orus) | `lines/tammo/en_de_rest_2966db1b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #85 |
| 86 | M08.3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/klaas_in_zoutkamp_heeft_het_zout_6b363c10.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #86 |
| 87 | M08.3 | Anita (Callirrhoe) | `lines/anita/vijf_namen_aan_ons_prikbord_dat__54e57b3f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #87 |
| 88 | O4 | Tammo (Orus) | `lines/tammo/wie_was_dat_b4d9ce84.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #88 |
| 89 | O4 | Tammo (Orus) | `lines/tammo/een_jas_in_augustus_eb66828b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #89 |
| 90 | N10 | Tammo (Orus) | `lines/tammo/ik_kantel_niet_ik_rijd_e5eab1c4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #90 |
| 91 | N10 | Terrasgast (Erinome) | `lines/terrasgast/zijn_jullie_al_samen_86ccebcf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #91 |
| 92 | N10 | Tammo (Orus) | `lines/tammo/dat_ligt_eraan_wat_je_met_samen__4d1fcb8a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #92 |
| 93 | N10 | Terrasgast (Erinome) | `lines/terrasgast/ik_bedoelde_de_rekening_c826d81b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #93 |
| 94 | N10 | Tammo (Orus) | `lines/tammo/ah_ja_samen_15dfcdf7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #94 |
| 95 | N10 | Tammo (Orus) | `lines/tammo/dit_is_niet_mijn_vak_d6fbb383.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #95 |
| 96 | N10 | Tammo (Orus) | `lines/tammo/dat_kan_ik_a82778ee.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #96 |
| 97 | N8 | Tammo (Orus) | `lines/tammo/deze_02885650.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #97 |
| 98 | N8 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/jullie_slapen_niet_ik_hoor_het_cad98799.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #98 |
| 99 | N8 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/dat_is_geen_slapen_dat_is_stilte_4984e7cd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #99 |
| 100 | N8 | Tammo (Orus) | `lines/tammo/een_punaise_ja_a44cfe84.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #100 |
| 101 | N5 | Tammo (Orus) | `lines/tammo/dat_wist_ik_niet_7b3a1e67.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #101 |
| 102 | N5 | Tammo (Orus) | `lines/tammo/de_koe_kijkt_naar_mij_ze_kent_mi_f6cb748e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #102 |
| 103 | N5 | Tammo (Orus) | `lines/tammo/hij_is_zacht_20330dfc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #103 |
| 104 | N11 | Tammo (Orus) | `lines/tammo/welke_zwarte_koe_hier_staan_er_v_fb939bbe.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #104 |
| 105 | N11 | Tammo (Orus) | `lines/tammo/pakket_drie_op_de_minuut_e5c5fc20.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #105 |
| 106 | N11 | Tammo (Orus) | `lines/tammo/twaalf_pakketten_tien_minuten_te_a301ef3f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #106 |
| 107 | N12 | Tammo (Orus) | `lines/tammo/er_staat_niks_tussen_b511f647.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #107 |
| 108 | N12 | Tammo (Orus) | `lines/tammo/dat_wordt_een_mooie_regel_a2def7be.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #108 |
| 109 | N12 | Tammo (Orus) | `lines/tammo/dit_zijn_mijn_laatste_schone_362e0574.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #109 |
| 110 | N6 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/praat_tegen_het_water_dan_vangt__7c363759.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #110 |
| 111 | N6 | Tammo (Orus) | `lines/tammo/_bcb498da.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #111 |
| 112 | N6 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/dat_telt_7738a237.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #112 |
| 113 | N6 | Tammo (Orus) | `lines/tammo/ik_heb_er_e_e_n_96f4de4a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #113 |
| 114 | N6 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/jij_zit_stil_en_je_vangt_zij_pra_251f2c79.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #114 |
| 115 | N7 | Buschauffeur (Alnilam) | `lines/buschauffeur/dankjewel_jongen_dat_doet_bijna__2e74b5c1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #115 |
| 116 | N7 | Tammo (Orus) | `lines/tammo/graag_gedaan_56e5f10b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #116 |
| 117 | N7 | Tammo (Orus) | `lines/tammo/hij_reed_goed_5b145448.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #117 |
| 118 | N7 | Tammo (Orus) | `lines/tammo/een_bus_met_principes_75b66f4c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #118 |
| 119 | M09.1 | Geesje (Pulcherrima) | `lines/geesje/jelle_terpstra_heeft_alle_eieren_872a28d0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #119 |
| 120 | M09.1 | Anita (Callirrhoe) | `lines/anita/alle_a0af206f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #120 |
| 121 | M09.1 | Geesje (Pulcherrima) | `lines/geesje/behalve_de_mijne_mijn_kippen_heb_7b2aac6a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #121 |
| 122 | M09.1 | Tammo (Orus) | `lines/tammo/vijf_jaar_en_dat_zeg_je_nu_pas_5f942d3d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #122 |
| 123 | M09.1 | Geesje (Pulcherrima) | `lines/geesje/zijn_oma_gerda_belt_trijntje_elk_a90a104a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #123 |
| 124 | M09.1 | Geesje (Pulcherrima) | `lines/geesje/ze_zeggen_dan_allebei_niks_833bd45b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #124 |
| 125 | M10.1 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/u_bent_in_het_museum_geweest_mij_9ee5940e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #125 |
| 126 | M10.1 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/die_verdwijnen_als_u_grunn_en_de_9e2c3cd8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #126 |
| 127 | M10.1 | Anita (Callirrhoe) | `lines/anita/het_kaartje_in_de_vitrine_dat_wi_2f4fff23.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #127 |
| 128 | M10.1 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/bewaker_twee_belde_mij_vooraf_de_6decc8f3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #128 |
| 129 | M10.2 | Tammo (Orus) | `lines/tammo/ook_dit_weet_je_b0cf3bbd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #129 |
| 130 | M10.5 | Tammo (Orus) | `lines/tammo/ik_wil_dit_niet_kwijt_99d79126.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #130 |
| 131 | M10.5 | Tammo (Orus) | `lines/tammo/nee_dit_alles_7ea1851f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #131 |
| 132 | M10.5 | Tammo (Orus) | `lines/tammo/ik_bedoel_ik_blijf_a2a85644.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #132 |
| 133 | O5 | Tammo (Orus) | `lines/tammo/wat_zei_ze_d2dcf742.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #133 |
| 134 | T2 | Tammo (Orus) | `lines/tammo/kijk_allemaal_hij_rijdt_5cfddcdf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #134 |
| 135 | T2 | Tammo (Orus) | `lines/tammo/welke_kant_is_de_zon_1bca8eb6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #135 |
| 136 | T2 | Tammo (Orus) | `lines/tammo/ik_droomde_over_verkeer_b7e2ba41.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #136 |
| 137 | M11.1 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/van_trijntje_he_jullie_sliepen_o_16389409.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #137 |
| 138 | M11.1 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/dertig_jaar_viste_ik_fietsen_uit_60934192.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #138 |
| 139 | M11.1 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/jelle_vaart_met_een_sku_tsje_naa_b0657cc1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #139 |
| 140 | M11.1 | Anita (Callirrhoe) | `lines/anita/dat_is_een_val_4dfabf52.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #140 |
| 141 | M11.1 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/natuurlijk_33f906fb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #141 |
| 142 | M11.1 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/maar_zolang_hij_naar_het_water_k_6fc62817.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #142 |
| 143 | M11.1 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/hier_een_snelle_boot_ik_kijk_de__ddee8153.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #143 |
| 144 | M11.3 | Tammo (Orus) | `lines/tammo/een_broodtrommel_geen_bal_01ea8101.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #144 |
| 145 | M11.3 | Tammo (Orus) | `lines/tammo/zijn_oma_pakt_nog_zijn_brood_in_d4b3bbf9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #145 |
| 146 | M11.4 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/eerst_zit_je_een_uur_vast_op_een_130f73c2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #146 |
| 147 | B2.1 | Tammo (Orus) | `lines/tammo/koe_4ab375ce.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #147 |
| 148 | B2.2 | Tammo (Orus) | `lines/tammo/ee_n_f2b225c3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #148 |
| 149 | B2.2 | Tammo (Orus) | `lines/tammo/ee_n_en_zeventig_jaar_a5991b8d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #149 |
| 150 | K1 | Geesje (Pulcherrima) | `lines/geesje/ze_sorteert_zonder_te_kijken_1a1f3456.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #150 |
| 151 | K1 | Tammo (Orus) | `lines/tammo/dat_kon_ze_al_voor_ze_kon_lezen_de944142.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #151 |
| 152 | K1 | Anita (Callirrhoe) | `lines/anita/grote_links_kleine_rechts_gebars_cbae2446.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #152 |
| 153 | K1 | Geesje (Pulcherrima) | `lines/geesje/een_boerendochter_trijntje_zei_h_2abde4a7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #153 |
| 154 | K1 | Geesje (Pulcherrima) | `lines/geesje/het_kerkbestuur_wil_dat_land_kwi_f6b3b1dd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #154 |
| 155 | K1 | Anita (Callirrhoe) | `lines/anita/ik_ben_hier_voor_oma_niet_voor_h_323461aa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #155 |
| 156 | K1 | Tammo (Orus) | `lines/tammo/je_kijkt_al_een_kwartier_naar_da_76b85b4a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #156 |
| 157 | K1 | Anita (Callirrhoe) | `lines/anita/ik_lees_1a7bab1a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #157 |
| 158 | K1 | Tammo (Orus) | `lines/tammo/zo_langzaam_lees_je_niet_b99ef348.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #158 |
| 159 | K1 | Geesje (Pulcherrima) | `lines/geesje/de_sleutel_van_de_schuur_hangt_a_5e331a99.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #159 |
| 160 | K1 | Anita (Callirrhoe) | `lines/anita/dat_zeg_ik_niet_a8fc1c61.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #160 |
| 161 | K1 | Geesje (Pulcherrima) | `lines/geesje/dat_hoeft_ook_niet_9de99a97.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #161 |
| 162 | K2 | Anita (Callirrhoe) | `lines/anita/gisteren_op_de_zandplaat_zei_je__d4b0d865.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #162 |
| 163 | K2 | Tammo (Orus) | `lines/tammo/ik_zei_groter_dan_een_vlek_1cb6f2b1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #163 |
| 164 | K2 | Anita (Callirrhoe) | `lines/anita/dat_is_niks_c90ac0f7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #164 |
| 165 | K2 | Tammo (Orus) | `lines/tammo/voor_mij_was_het_veel_24d24b34.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #165 |
| 166 | K2 | Anita (Callirrhoe) | `lines/anita/ik_zag_je_kijken_ik_keek_ook_8d3bea69.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #166 |
| 167 | K2 | Tammo (Orus) | `lines/tammo/ik_wist_het_al_lang_ik_wist_alle_43c988a0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #167 |
| 168 | K2 | Anita (Callirrhoe) | `lines/anita/wat_wist_je_al_lang_3d218918.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #168 |
| 169 | K2 | Tammo (Orus) | `lines/tammo/dat_je_je_koffie_met_melk_drinkt_7f667f09.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #169 |
| 170 | K2 | Anita (Callirrhoe) | `lines/anita/dat_is_geen_antwoord_5501349b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #170 |
| 171 | K2 | Tammo (Orus) | `lines/tammo/het_is_een_begin_7cd43b40.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #171 |
| 172 | K2 | Anita (Callirrhoe) | `lines/anita/hij_is_lauw_1acd52ae.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #172 |
| 173 | R3.0 | Rikus (Schedar) | `lines/rikus/vrijdag_21_augustus_een_beller_m_4dddb7ce.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #173 |
| 174 | R3.0 | Rikus (Schedar) | `lines/rikus/het_luchtruim_is_van_niemand_men_8d9b6434.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #174 |
| 175 | R3.0 | Rikus (Schedar) | `lines/rikus/ik_draai_een_plaat_6088abd3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #175 |
| 176 | M12.1 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/dijkstra_komt_jullie_halen_jong__047ed9e1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #176 |
| 177 | M12.1 | Tammo (Orus) | `lines/tammo/een_dokter_met_een_heli_5d52382d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #177 |
| 178 | M12.1 | Dokter Dijkstra (Sadachbia) | `lines/dokter_dijkstra/eerst_de_lunch_voor_mijn_collega_a08548bb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #178 |
| 179 | M12.1 | Dokter Dijkstra (Sadachbia) | `lines/dokter_dijkstra/dan_de_ballon_ik_heb_een_lier_en_68c20829.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #179 |
| 180 | M12.2 | Rotor Roelf (Achird) | `lines/rotor_roelf/moi_rotor_roelf_is_mijn_heli_nog_d362f646.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #180 |
| 181 | M12.2 | Rotor Roelf (Achird) | `lines/rotor_roelf/zeg_maar_misschien_dan_is_het_ee_04d768a7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #181 |
| 182 | M12.4 | Tammo (Orus) | `lines/tammo/wat_zit_erin_51510fd5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #182 |
| 183 | J1 | Tammo (Orus) | `lines/tammo/dat_is_veel_aandacht_9e83dc09.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #183 |
| 184 | J1 | Tammo (Orus) | `lines/tammo/wij_hebben_nog_geen_bezwaar_018fb4e2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #184 |
| 185 | J1 | Tammo (Orus) | `lines/tammo/wat_ben_jij_partner_huisgenoot_o_dbeb594d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #185 |
| 186 | J1 | Tammo (Orus) | `lines/tammo/huisgenoot_is_het_kortst_a6c7bffc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #186 |
| 187 | J1 | Tammo (Orus) | `lines/tammo/je_gaat_tegen_hem_vechten_met_zi_03cdebf3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #187 |
| 188 | M13.1 | Lammert (Iapetus) | `lines/lammert/moi_lammert_havenmeester_ik_vert_7c09b81f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #188 |
| 189 | M13.1 | Lammert (Iapetus) | `lines/lammert/klaas_zei_dat_jullie_kwamen_mijn_6f8b4c5d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #189 |
| 190 | M13.1 | Lammert (Iapetus) | `lines/lammert/onder_een_stapel_kabelrollen_naa_6b34a8d1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #190 |
| 191 | M13.3 | Lammert (Iapetus) | `lines/lammert/mijn_vrachtwagen_brengt_het_naar_d8de7301.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #191 |
| 192 | M13.3 | Lammert (Iapetus) | `lines/lammert/het_vet_van_1953_voor_oma_8f22291b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #192 |
| 193 | M13.3 | Tammo (Orus) | `lines/tammo/dan_wil_jelle_het_terug_223a91d7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #193 |
| 194 | M13.3 | Lammert (Iapetus) | `lines/lammert/om_acht_uur_komt_zijn_deurwaarde_35436c08.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #194 |
| 195 | M13.3 | Lammert (Iapetus) | `lines/lammert/en_als_jullie_ooit_een_wagen_heb_2885034f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #195 |
| 196 | M13.3 | Tammo (Orus) | `lines/tammo/prima_fc7cf607.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #196 |
| 197 | M13.3 | Anita (Callirrhoe) | `lines/anita/ik_vroeg_niks_542f0da0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #197 |
| 198 | O6 | Tammo (Orus) | `lines/tammo/het_is_niet_eens_van_ons_het_is__c766d926.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #198 |
| 199 | M14.3 | Lammert (Iapetus) | `lines/lammert/de_overdracht_is_getekend_om_vij_fd2a995b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #199 |
| 200 | R3.4 | Rikus (Schedar) | `lines/rikus/mijn_verzoekplaat_van_de_week_el_087ad1ba.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #200 |
| 201 | R3.4 | Rikus (Schedar) | `lines/rikus/voor_twee_stadjers_die_elk_een_k_dc01d551.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #201 |
| 202 | J2 | Lammert (Iapetus) | `lines/lammert/van_terpstra_gratis_frikandellen_3eeb9fbb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #202 |
| 203 | J2 | Lammert (Iapetus) | `lines/lammert/ik_ben_havenmeester_voor_een_kad_8946c8fc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #203 |
| 204 | J2 | Tammo (Orus) | `lines/tammo/wat_neem_je_wel_aan_3830a245.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #204 |
| 205 | J2 | Lammert (Iapetus) | `lines/lammert/een_vraag_zonder_envelop_dat_hee_61191c42.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #205 |
| 206 | J2 | Lammert (Iapetus) | `lines/lammert/dat_is_geen_vraag_dat_is_een_buu_0230839a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #206 |
| 207 | T3 | Tammo (Orus) | `lines/tammo/het_koopboek_plakje_zes_bloem_en_242783ab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #207 |
| 208 | T3 | Tammo (Orus) | `lines/tammo/roelfien_1ec1df60.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #208 |
| 209 | T3 | Tammo (Orus) | `lines/tammo/een_vliegtuigje_357c40d1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #209 |
| 210 | M15.1 | Tammo (Orus) | `lines/tammo/dat_klopt_wel_8e2ccc69.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #210 |
| 211 | M15.1 | Roelfien (Laomedeia) | `lines/roelfien/mijn_vliegtuigje_sleept_al_twint_b87f0ccd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #211 |
| 212 | M15.3 | Roelfien (Laomedeia) | `lines/roelfien/doe_de_groeten_aan_trijntje_vana_c1bea736.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #212 |
| 213 | M15.5 | Tammo (Orus) | `lines/tammo/wij_hebben_de_jury_weggejaagd_2c4fd19d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #213 |
| 214 | M15.5 | Tammo (Orus) | `lines/tammo/hij_laat_die_koffer_niet_los_e6976559.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #214 |
| 215 | M15.6 | Daan (Puck) | `lines/daan/jij_bent_van_het_spandoek_dat_ik_3ea9814e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #215 |
| 216 | M15.6 | Daan (Puck) | `lines/daan/dan_heb_je_veel_ongelukken_nodig_84df6d75.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #216 |
| 217 | M15.6 | Tammo (Orus) | `lines/tammo/ze_moet_nog_eten_e6620456.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #217 |
| 218 | M15.6 | Daan (Puck) | `lines/daan/ee_n_couplet_over_een_meisje_met_f978d0e8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #218 |
| 219 | M15.6 | Tammo (Orus) | `lines/tammo/ik_heb_niks_gezegd_bc4c3a4e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #219 |
| 220 | M16.1 | Geert (Zubenelgenubi) | `lines/geert/moi_geert_van_de_poelestraat_twe_0d145850.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #220 |
| 221 | M16.1 | Geert (Zubenelgenubi) | `lines/geert/ik_weet_alles_van_iedereen_zij_v_6104dbfd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #221 |
| 222 | M16.1 | Geert (Zubenelgenubi) | `lines/geert/hij_kijkt_al_sinds_de_ingang_naa_e4f421e6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #222 |
| 223 | M16.5 | Tammo (Orus) | `lines/tammo/heeft_hij_de_bal_bij_zich_4a824da5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #223 |
| 224 | M16.5 | Tammo (Orus) | `lines/tammo/over_twee_dagen_1b1e2b36.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #224 |
| 225 | B3.1 | Tammo (Orus) | `lines/tammo/eigenlijk_heet_een_groep_van_die_4edc6370.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #225 |
| 226 | B3.1 | Tammo (Orus) | `lines/tammo/het_is_ook_iets_een_park_97f9758d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #226 |
| 227 | B3.2 | Tammo (Orus) | `lines/tammo/net_zo_hoog_als_zijn_frikandel_7167ca90.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #227 |
| 228 | B3.2 | Tammo (Orus) | `lines/tammo/het_is_een_eenheid_8ac9190e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #228 |
| 229 | B3.3 | Tammo (Orus) | `lines/tammo/jij_zingt_het_refrein_ik_de_bas_7d9652b7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #229 |
| 230 | B3.3 | Tammo (Orus) | `lines/tammo/iemand_moet_de_bodem_leggen_f53c93fc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #230 |
| 231 | O7 | Tammo (Orus) | `lines/tammo/over_zaterdag_475af7e1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #231 |
| 232 | O7 | Tammo (Orus) | `lines/tammo/laat_maar_efae8585.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #232 |
| 233 | O7 | Tammo (Orus) | `lines/tammo/ja_444a5864.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #233 |
| 234 | J3 | Anneke (Achernar) | `lines/anneke/dus_jij_bent_tammo_ze_belt_nooit_a9e6dbdd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #234 |
| 235 | J3 | Anneke (Achernar) | `lines/anneke/jullie_zitten_ver_uit_elkaar_6ed736cd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #235 |
| 236 | J3 | Anneke (Achernar) | `lines/anneke/een_bank_voor_drie_jullie_gebrui_70185f7f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #236 |
| 237 | J3 | Anneke (Achernar) | `lines/anneke/dit_kwam_gisteren_voor_jullie_al_d22a2b33.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #237 |
| 238 | J3 | Anneke (Achernar) | `lines/anneke/wij_hebben_kippen_sinds_1987_hij_e61829f6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #238 |
| 239 | J3 | Anneke (Achernar) | `lines/anneke/ja_779ada18.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #239 |
| 240 | J3 | Tammo (Orus) | `lines/tammo/eigenlijk_is_de_koffie_heel_goed_7ced1d9d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #240 |
| 241 | J3 | Anneke (Achernar) | `lines/anneke/dat_dacht_ik_al_00f37a27.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #241 |
| 242 | K3 | Sjabbe (Rasalgethi) | `lines/sjabbe/ik_vraag_niks_ik_was_in_de_buurt_f3a9fa26.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #242 |
| 243 | K3 | Tammo (Orus) | `lines/tammo/het_is_drie_uur_s_nachts_2e26490a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #243 |
| 244 | K3 | Sjabbe (Rasalgethi) | `lines/sjabbe/pand_poen_slaapt_nooit_jelle_koo_a24d109d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #244 |
| 245 | K3 | Anita (Callirrhoe) | `lines/anita/en_wie_een_pand_beheert_654fabef.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #245 |
| 246 | K3 | Sjabbe (Rasalgethi) | `lines/sjabbe/die_kiest_wie_erin_slaapt_lammer_201e1616.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #246 |
| 247 | K3 | Tammo (Orus) | `lines/tammo/twee_bedden_voor_een_kasboekje_a46b9e27.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #247 |
| 248 | K3 | Sjabbe (Rasalgethi) | `lines/sjabbe/twee_bedden_ea737a63.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #248 |
| 249 | K3 | Sjabbe (Rasalgethi) | `lines/sjabbe/dat_is_mijn_zin_1c49b761.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #249 |
| 250 | K3 | Anita (Callirrhoe) | `lines/anita/dit_is_onze_eerste_sleutel_898485f9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #250 |
| 251 | K3 | Sjabbe (Rasalgethi) | `lines/sjabbe/jullie_eerste_pand_jelle_koopt_j_bed5a306.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #251 |
| 252 | R4.0 | Rikus (Schedar) | `lines/rikus/maandag_24_augustus_in_de_chat_z_00b6e0df.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #252 |
| 253 | R4.0 | Rikus (Schedar) | `lines/rikus/dat_is_een_erfstuk_meneer_terpst_eaefefa6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #253 |
| 254 | R4.0b | Rikus (Schedar) | `lines/rikus/een_beller_van_het_platteland_fe_2b12c529.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #254 |
| 255 | R4.0b | Rikus (Schedar) | `lines/rikus/elfde_verdieping_van_de_fietstun_4375c28e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #255 |
| 256 | M17.1 | Wubbo (Sadaltager) | `lines/wubbo/open_of_dicht_31171e3f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #256 |
| 257 | M17.1 | Wubbo (Sadaltager) | `lines/wubbo/nooit_allebei_1eeadb40.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #257 |
| 258 | M17.1 | Tammo (Orus) | `lines/tammo/is_dat_een_regel_678987ae.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #258 |
| 259 | M17.1 | Wubbo (Sadaltager) | `lines/wubbo/dat_is_mijn_hele_werkfilosofie_t_3f30a7b1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #259 |
| 260 | M17.1 | Wubbo (Sadaltager) | `lines/wubbo/elf_bruggen_toeter_bij_een_geslo_373a72b4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #260 |
| 261 | M17.1 | Tammo (Orus) | `lines/tammo/en_als_we_de_maat_missen_c53010be.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #261 |
| 262 | M17.1 | Wubbo (Sadaltager) | `lines/wubbo/dan_wacht_je_open_of_dicht_37ef6a5f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #262 |
| 263 | M17.1 | Wubbo (Sadaltager) | `lines/wubbo/onder_brug_elf_staat_stien_met_h_ea1fd3e0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #263 |
| 264 | M17.2 | Wubbo (Sadaltager) | `lines/wubbo/op_brug_acht_zit_een_duif_hij_ki_9a41f3e0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #264 |
| 265 | M17.2 | Tammo (Orus) | `lines/tammo/hij_kijkt_altijd_c099be31.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #265 |
| 266 | M17.3 | Wubbo (Sadaltager) | `lines/wubbo/open_of_dicht_nooit_allebei_vand_078cb1bd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #266 |
| 267 | M17.5 | Stien (Vindemiatrix) | `lines/stien/wubbo_zei_dat_jullie_kwamen_ee_n_4d192626.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #267 |
| 268 | M17.5 | Stien (Vindemiatrix) | `lines/stien/eerst_het_vet_warm_dan_de_mensen_23f473e4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #268 |
| 269 | M17.5 | Tammo (Orus) | `lines/tammo/en_de_mensen_dan_8fdafdaf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #269 |
| 270 | M17.5 | Stien (Vindemiatrix) | `lines/stien/die_komen_op_de_geur_dat_is_het__7f0d7d23.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #270 |
| 271 | M17.5 | Stien (Vindemiatrix) | `lines/stien/nee_maar_het_is_een_begin_kom_te_23b05516.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #271 |
| 272 | J4 | Femke (Leda) | `lines/femke/wat_leuk_een_dubbele_date_4ea5b153.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #272 |
| 273 | J4 | Tammo (Orus) | `lines/tammo/het_is_geen_date_576d45b4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #273 |
| 274 | J4 | Femke (Leda) | `lines/femke/een_kaars_een_terras_twee_stelle_23a961ef.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #274 |
| 275 | J4 | Femke (Leda) | `lines/femke/hij_zegt_het_wel_heel_mooi_a9467272.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #275 |
| 276 | J4 | Tammo (Orus) | `lines/tammo/hij_betaalde_onze_tafel_en_de_ka_5da0eca4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #276 |
| 277 | J4 | Femke (Leda) | `lines/femke/neem_je_een_kasboekje_mee_naar_e_4f6ae0b9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #277 |
| 278 | J4 | Femke (Leda) | `lines/femke/dat_zegt_hij_ook_8b07103c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #278 |
| 279 | J4 | Tammo (Orus) | `lines/tammo/dat_is_van_mij_d0eac254.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #279 |
| 280 | J4 | Rikus (Schedar) | `lines/rikus/dan_leen_ik_hem_0b20f32a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #280 |
| 281 | M18.1 | Tammo (Orus) | `lines/tammo/we_waren_er_wel_5a250bfc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #281 |
| 282 | M18.1 | Sjabbe (Rasalgethi) | `lines/sjabbe/wiebelwerk_zij_beheren_ook_de_ca_a9a96cd0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #282 |
| 283 | M18.3 | Tammo (Orus) | `lines/tammo/voor_wie_439433c0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #283 |
| 284 | M18.4 | Tammo (Orus) | `lines/tammo/mem_weer_wat_zei_ze_b7c8947b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #284 |
| 285 | M18.4 | Tammo (Orus) | `lines/tammo/het_is_augustus_478597e4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #285 |
| 286 | O8 | Rikus (Schedar) | `lines/rikus/tammo_de_politie_zoekt_twee_stad_ffa33c52.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #286 |
| 287 | O8 | Tammo (Orus) | `lines/tammo/wij_zijn_niet_de_dieven_fc766cc7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #287 |
| 288 | O8 | Rikus (Schedar) | `lines/rikus/dat_weet_ik_hebben_jullie_dat_lo_96a3512e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #288 |
| 289 | O8 | Rikus (Schedar) | `lines/rikus/bewaar_het_ik_heb_dit_niet_gezeg_85861be5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #289 |
| 290 | N9 | Rikus (Schedar) | `lines/rikus/moi_nachtstreek_voor_wie_vannach_090c8a24.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #290 |
| 291 | N9 | Tammo (Orus) | `lines/tammo/dat_is_een_vliegtuig_ede311b5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #291 |
| 292 | N9 | Tammo (Orus) | `lines/tammo/ik_kijk_naar_de_beer_9b84154a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #292 |
| 293 | N9 | Tammo (Orus) | `lines/tammo/dat_is_een_schaap_5c7a8d80.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #293 |
| 294 | N9 | Tammo (Orus) | `lines/tammo/dat_was_mijn_laatste_schone_10a84225.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #294 |
| 295 | N9 | Tammo (Orus) | `lines/tammo/welterusten_80228df7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #295 |
| 296 | J5 | Tammo (Orus) | `lines/tammo/wij_hebben_er_drie_ad06f6a2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #296 |
| 297 | J5 | Deurwaarder (Rasalgethi) | `lines/deurwaarder/mevrouw_heeft_gelijk_ik_haal_hem_4c750643.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #297 |
| 298 | M19.3 | Mevrouw Hoving (Gacrux) | `lines/mevrouw_hoving/ik_stap_niet_uit_ik_blijf_in_de__d7e01721.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #298 |
| 299 | M19.3 | Berend Bos (Charon) | `lines/berend_bos/het_oudste_jurylid_dat_ben_ik_si_ece1511f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #299 |
| 300 | M19.3 | Tammo (Orus) | `lines/tammo/vier_van_de_vijf_zijn_dan_niet_v_2b63e747.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #300 |
| 301 | M19.3 | Berend Bos (Charon) | `lines/berend_bos/vrijdag_om_drie_uur_gaat_jelle_n_d0f5200a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #301 |
| 302 | M19.3 | Berend Bos (Charon) | `lines/berend_bos/daar_schrijft_hij_zich_in_als_be_ea2cc468.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #302 |
| 303 | M19.3 | Tammo (Orus) | `lines/tammo/daarom_zit_mevrouw_hoving_in_zij_c0c5d7e7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #303 |
| 304 | M19.3 | Berend Bos (Charon) | `lines/berend_bos/dinsdag_komt_de_man_die_mijn_bak_49bf8edd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #304 |
| 305 | M19.3 | Berend Bos (Charon) | `lines/berend_bos/ik_heb_een_bus_nodig_kom_naar_te_a0132671.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #305 |
| 306 | J6 | Tammo (Orus) | `lines/tammo/huisgenoten_cf272748.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #306 |
| 307 | J6 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/wil_jij_tessa_65dca97d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #307 |
| 308 | J6 | Tammo (Orus) | `lines/tammo/het_is_goede_soep_c9ee700a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #308 |
| 309 | T4.1 | Henk (Sadaltager) | `lines/henk/moi_ik_rij_de_escapade_achter_ju_ee0fdb81.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #309 |
| 310 | M20.3 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/mem_u_houdt_hem_vast_tot_ik_win__6743e798.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #310 |
| 311 | M20.3 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/er_is_geen_afspraak_jonge_429a0515.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #311 |
| 312 | M20.3 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/er_is_een_oma_16bfdd8a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #312 |
| 313 | M20.3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/gerda_belde_mij_ze_zei_mijn_jong_a52f6c89.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #313 |
| 314 | M20.3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/ik_zei_dan_nemen_we_de_bal_van_h_44de2cfa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #314 |
| 315 | M20.3 | Berend Bos (Charon) | `lines/berend_bos/ik_reed_nul_krassen_op_de_heenwe_b2da10b2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #315 |
| 316 | M20.3 | Anita (Callirrhoe) | `lines/anita/van_de_jas_tammo_en_van_het_brie_4599ac54.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #316 |
| 317 | M20.3 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/altijd_bedanken_dat_heb_ik_hem_g_ed946aea.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #317 |
| 318 | M20.3 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/omdat_mijn_kleinzoon_gekke_dinge_dbaf8dde.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #318 |
| 319 | M20.3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/gerda_0c6e2493.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #319 |
| 320 | M20.3 | Mem Terpstra (Gacrux) | `lines/mem_terpstra/in_1953_werd_ik_tweede_trijntje__c5dae79c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #320 |
| 321 | M20.5 | Tammo (Orus) | `lines/tammo/tige_tank_foar_de_auto_j_hij_bed_1f4983a3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #321 |
| 322 | M21.4 | Geesje (Pulcherrima) | `lines/geesje/mijn_kerkvoogdij_is_gebeld_de_ke_f950d1f0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #322 |
| 323 | M21.4 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/mij_hebben_ze_als_eerste_gebeld__284666ef.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #323 |
| 324 | M21.4 | Geesje (Pulcherrima) | `lines/geesje/mij_als_eerste_om_negen_uur_14a34bc9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #324 |
| 325 | M21.4 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/ik_om_half_negen_a46cedc9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #325 |
| 326 | M21.4 | Tammo (Orus) | `lines/tammo/het_maakt_niet_uit_wie_eh_05ff323e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #326 |
| 327 | M21.4 | Tammo (Orus) | `lines/tammo/ik_zeg_het_niet_goed_734abef1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #327 |
| 328 | B4 | Tammo (Orus) | `lines/tammo/een_veldje_met_doelen_ik_regel_e_c7dcc2b3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #328 |
| 329 | B4.1 | Tammo (Orus) | `lines/tammo/precies_dat_bedoelde_ik_e998a39f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #329 |
| 330 | B4.2 | Tammo (Orus) | `lines/tammo/nemen_ze_de_koe_mee_3089f0a5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #330 |
| 331 | B4.2 | Tammo (Orus) | `lines/tammo/dan_weet_zij_het_eerder_dan_ik_d5efa224.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #331 |
| 332 | O9 | Tammo (Orus) | `lines/tammo/niet_goed_ik_heb_het_niet_goed_g_2842ea93.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #332 |
| 333 | O9 | Tammo (Orus) | `lines/tammo/je_koos_de_auto_niet_de_bal_35500f2d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #333 |
| 334 | O9 | Tammo (Orus) | `lines/tammo/dat_is_waar_ik_kom_naar_tinus_dc3da0a9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #334 |
| 335 | M22.2 | Tammo (Orus) | `lines/tammo/welke_naam_50a4fe25.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #335 |
| 336 | M22.2 | Henk (Sadaltager) | `lines/henk/tam_tes_f4a47ccb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #336 |
| 337 | M22.2 | Tammo (Orus) | `lines/tammo/het_rijmt_7147bbea.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #337 |
| 338 | M22.2 | Henk (Sadaltager) | `lines/henk/ik_zeg_niks_ee_n_koekje_de8bd59c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #338 |
| 339 | M22.4 | Tammo (Orus) | `lines/tammo/en_die_jas_in_augustus_111df8fa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #339 |
| 340 | M23.1 | Tinus (Enceladus) | `lines/tinus/ik_de_trekker_wat_jelle_ook_neer_42c306ae.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #340 |
| 341 | M23.1 | Kapitein Klaas (Enceladus) | `lines/kapitein_klaas/ik_heb_mijn_rubberboot_terug_op__c7d73c8b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #341 |
| 342 | M23.1 | Berend Bos (Charon) | `lines/berend_bos/ik_achteraan_vijftien_kanonnen_e_b84b817e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #342 |
| 343 | M24.1 | Tammo (Orus) | `lines/tammo/geen_idee_2e3afc6f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #343 |
| 344 | M24.1 | Duivenmelker Bert (Iapetus) | `lines/duivenmelker_bert/hij_weet_het_niet_jong_zij_ook_n_d3f7b515.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #344 |
| 345 | O10 | Tammo (Orus) | `lines/tammo/hoeveel_f6b424a2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #345 |
| 346 | O10 | Tammo (Orus) | `lines/tammo/dat_is_nieuw_f3a4c2bc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #346 |
| 347 | O10 | Tammo (Orus) | `lines/tammo/er_zit_nog_een_vel_in_141d2580.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #347 |
| 348 | O10 | Tammo (Orus) | `lines/tammo/waarom_stuurt_hij_ons_die_2f813424.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #348 |
| 349 | M25.6 | Anneke (Achernar) | `lines/anneke/we_waren_in_de_buurt_met_een_man_247309c1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #349 |
| 350 | M25.6 | Anneke (Achernar) | `lines/anneke/jij_belt_nooit_dan_komen_wij_924332d8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #350 |
| 351 | M25.6 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/ga_zitten_eet_een_eierbal_er_zit_16286e96.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #351 |
| 352 | M25.6 | Anneke (Achernar) | `lines/anneke/bij_ons_gaan_eieren_niet_in_het__46f21839.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #352 |
| 353 | M25.6 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/dan_gaan_ze_er_later_in_6c3a2485.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #353 |
| 354 | M25.6 | Lieke (Leda) | `lines/lieke/zijn_jullie_al_samen_7216dd53.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #354 |
| 355 | M25.6 | Lieke (Leda) | `lines/lieke/jullie_zijn_al_samen_jullie_wete_3a1d8713.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #355 |
| 356 | M25.6 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/en_wanneer_trouwen_jullie_dfcd192e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #356 |
| 357 | M25.6 | Tammo (Orus) | `lines/tammo/ik_zeg_liever_niks_19071d3e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #357 |
| 358 | M25.6 | Anneke (Achernar) | `lines/anneke/dat_zag_ik_al_dat_is_een_goed_te_46cab4db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #358 |
| 359 | M26.2 | Berend Bos (Charon) | `lines/berend_bos/voor_iedereen_de_beste_eierbal_w_f9b3419b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #359 |
| 360 | M26.2 | Berend Bos (Charon) | `lines/berend_bos/die_gaat_terug_naar_het_museum_t_5f3122a5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #360 |
| 361 | M26.2 | Anita (Callirrhoe) | `lines/anita/berend_dit_is_het_logboek_van_wi_a98afefa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #361 |
| 362 | M26.2 | Berend Bos (Charon) | `lines/berend_bos/wat_staat_erin_c8558f62.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #362 |
| 363 | M26.2 | Anita (Callirrhoe) | `lines/anita/twaalf_augustus_jelle_nam_de_bal_a8322f69.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #363 |
| 364 | M26.2 | Rikus (Schedar) | `lines/rikus/mevrouw_hoving_de_bewaarder_zit__6f3803a9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #364 |
| 365 | M26.2 | Berend Bos (Charon) | `lines/berend_bos/regel_twee_zonder_bewaarder_zit__0b29d2d6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #365 |
| 366 | M26.2 | Anita (Callirrhoe) | `lines/anita/dan_zit_u_voor_cd8984b4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #366 |
| 367 | M26.2 | Berend Bos (Charon) | `lines/berend_bos/ik_658568b5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #367 |
| 368 | M26.2 | Berend Bos (Charon) | `lines/berend_bos/ik_heb_nog_nooit_iets_gewonnen_n_c79759de.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #368 |
| 369 | M26.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/een_notaris_gaat_boven_een_bissc_1bef3699.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #369 |
| 370 | M26.2 | Berend Bos (Charon) | `lines/berend_bos/ik_ben_maar_een_nepbisschop_6e668a07.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #370 |
| 371 | M26.2 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/om_drie_uur_schrijf_ik_mij_in_al_3687e6d8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #371 |
| 372 | M26.5 | Tammo (Orus) | `lines/tammo/ik_heb_ze_niet_gevraagd_3f1a4d71.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #372 |
| 373 | M26.5 | Tammo (Orus) | `lines/tammo/eierbal_hij_is_warm_315ded2b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #373 |
| 374 | M26.6 | Berend Bos (Charon) | `lines/berend_bos/ee_n_verschil_dan_stemmen_we_de__13584983.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #374 |
| 375 | M26.6 | Berend Bos (Charon) | `lines/berend_bos/die_heeft_een_korrel_van_grof_me_55a1aa08.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #375 |
| 376 | M26.6 | Berend Bos (Charon) | `lines/berend_bos/dat_is_een_eierbal_die_ergens_va_5d000443.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #376 |
| 377 | M26.10 | Jurylid (Umbriel) | `lines/jurylid/tam_tes_b2547bf5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #377 |
| 378 | M26.10 | Berend Bos (Charon) | `lines/berend_bos/tam_tes_vijf_van_de_vijf_mijn_st_366b971e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #378 |
| 379 | M26.11 | Berend Bos (Charon) | `lines/berend_bos/tam_tes_vier_van_de_vijf_ik_was__a6b0d02e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #379 |
| 380 | M26.12 | Berend Bos (Charon) | `lines/berend_bos/tam_tes_drie_van_de_vijf_het_is__939b1804.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #380 |
| 381 | M26.13 | Berend Bos (Charon) | `lines/berend_bos/de_standplaats_op_de_vismarkt_ga_622b9348.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #381 |
| 382 | M26.17 | Tammo (Orus) | `lines/tammo/ik_heb_geen_woorden_meer_1c2c1a69.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #382 |
| 383 | M26.17 | Berend Bos (Charon) | `lines/berend_bos/dat_duurde_elf_seconden_ce917952.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #383 |
| 384 | M26.17 | Rikus (Schedar) | `lines/rikus/ik_zeg_niks_86542a8c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #384 |
| 385 | E1 | Tammo (Orus) | `lines/tammo/derde_keer_deze_week_uitverkocht_20e1f551.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #385 |
| 386 | E1 | Tammo (Orus) | `lines/tammo/op_de_achterkant_staat_elf_secon_44d0e026.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #386 |
| 387 | E2 | Tammo (Orus) | `lines/tammo/dat_zegt_hij_heel_hard_2914d9a2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #387 |
| 388 | E2 | Rikus (Schedar) | `lines/rikus/jelle_kocht_vanochtend_een_pand__ff3073e4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #388 |
| 389 | E2 | Tammo (Orus) | `lines/tammo/wij_bakken_door_f052f01c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #389 |
| 390 | E3 | Rikus (Schedar) | `lines/rikus/de_loketbediende_van_loket_b_sto_92d0807f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #390 |
| 391 | E3 | Rikus (Schedar) | `lines/rikus/een_oude_vrouw_met_een_rollator__f17b7089.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #391 |
| 392 | E3 | Rikus (Schedar) | `lines/rikus/het_jongetje_van_het_bankje_ston_973a1cb6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #392 |
| 393 | E3 | Rikus (Schedar) | `lines/rikus/durk_en_douwe_werken_nu_voor_jel_453c6136.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #393 |
| 394 | F1 | Tammo (Orus) | `lines/tammo/tessa_we_moeten_naar_tinus_bb4b39f3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #394 |
| 395 | F1 | Tammo (Orus) | `lines/tammo/je_zei_het_is_een_tekening_28fd815b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #395 |
| 396 | F1 | Tammo (Orus) | `lines/tammo/je_kijkt_naar_die_wagen_zoals_ik_7672ee95.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #396 |
| 397 | F1 | Tammo (Orus) | `lines/tammo/naar_de_motor_cd2a2c97.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #397 |
| 398 | F1 | Tammo (Orus) | `lines/tammo/dan_naar_de_trekhaak_3f024d45.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #398 |
| 399 | F1 | Tammo (Orus) | `lines/tammo/de_escapade_kan_trekken_93511248.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #399 |
| 400 | F2 | Tammo (Orus) | `lines/tammo/de_gasslang_is_goed_alles_klopt__3d4f4bf6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #400 |
| 401 | F2 | Tammo (Orus) | `lines/tammo/niks_ik_zeg_het_uit_gewoonte_7e8fbb47.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #401 |
| 402 | F2 | Tammo (Orus) | `lines/tammo/zoals_oma_zei_c7b49001.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #402 |
| 403 | F2 | Tammo (Orus) | `lines/tammo/is_dat_een_knop_of_een_gebed_0bcb3ef7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #403 |
| 404 | F2 | Tammo (Orus) | `lines/tammo/ik_kan_hem_laten_rijden_ik_kan_h_a4027632.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #404 |
| 405 | F2 | Tammo (Orus) | `lines/tammo/dat_was_mijn_plan_al_ded2f476.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #405 |
| 406 | F2 | Tammo (Orus) | `lines/tammo/sinds_de_escapade_cd5e5aa5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #406 |
| 407 | F3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/dit_is_mijn_keuken_a14041f2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #407 |
| 408 | F3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/wat_zegt_ze_e874b107.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #408 |
| 409 | F3 | Tammo (Orus) | `lines/tammo/oma_trijntje_beppe_beppe_oma_tri_f5d378b6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #409 |
| 410 | F3 | Tammo (Orus) | `lines/tammo/ik_ben_het_compromis_79b9be01.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #410 |
| 411 | F3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/moi_het_is_soep_met_een_eierbal__18e1d161.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #411 |
| 412 | F4 | Tammo (Orus) | `lines/tammo/ik_heb_ook_geen_vergunning_11157e3e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #412 |
| 413 | F5 | Tammo (Orus) | `lines/tammo/het_is_een_gelegenheid_7ed74ad8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #413 |
| 414 | F5 | Tammo (Orus) | `lines/tammo/eten_wandelen_en_eentje_doorgest_ab61152d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #414 |
| 415 | F5 | Tammo (Orus) | `lines/tammo/zeggen_dat_ik_je_leuk_vind_dat_i_7ff1057e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #415 |
| 416 | F5 | Tammo (Orus) | `lines/tammo/hier_dat_is_goed_c564677e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #416 |
| 417 | F5 | Tammo (Orus) | `lines/tammo/berend_telde_elf_seconden_dat_is_64cd77a4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #417 |
| 418 | F5 | Tammo (Orus) | `lines/tammo/hier_met_jou_erbij_e0d450ab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #418 |
| 419 | M27.1 | Willemien (Aoede) | `lines/willemien/ik_ken_jullie_van_het_luik_woens_b30c641f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #419 |
| 420 | M27.1 | Willemien (Aoede) | `lines/willemien/de_aannemer_zet_het_huis_op_nieu_56a8d40d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #420 |
| 421 | M27.1 | Willemien (Aoede) | `lines/willemien/het_duurt_alleen_langer_dan_een__12fe1cb5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #421 |
| 422 | M27.1 | Willemien (Aoede) | `lines/willemien/dat_zegt_trijntje_van_alles_bree_0d19ad1c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #422 |
| 423 | M27.1 | Tammo (Orus) | `lines/tammo/en_de_kat_12d06093.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #423 |
| 424 | M27.1 | Willemien (Aoede) | `lines/willemien/de_kat_weet_het_al_f59128a0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #424 |
| 425 | M27.1 | Willemien (Aoede) | `lines/willemien/hij_zit_sinds_gisteren_onder_de__b04213c6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #425 |
| 426 | O11 | Tammo (Orus) | `lines/tammo/wat_wilde_hij_nou_ad2edf35.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #426 |
| 427 | M29.2 | Willemien (Aoede) | `lines/willemien/trijntjes_recept_het_is_een_bal_44740714.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #427 |
| 428 | M30.1 | Lammert (Iapetus) | `lines/lammert/ik_heb_de_sleutel_van_de_sluis_v_bd97f447.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #428 |
| 429 | M30.1 | Roelfien (Laomedeia) | `lines/roelfien/ik_vlieg_boven_zes_zakken_meel_e_83773f70.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #429 |
| 430 | M30.1 | Wubbo (Sadaltager) | `lines/wubbo/ik_doe_de_lier_van_de_brug_open__965e635d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #430 |
| 431 | M30.1 | Tinus (Enceladus) | `lines/tinus/de_trekker_heeft_een_toren_zonde_7a459dd3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #431 |
| 432 | M30.1 | Anita (Callirrhoe) | `lines/anita/zeven_mensen_die_niet_weglopen_ebef4e4a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #432 |
| 433 | M30.1 | Anita (Callirrhoe) | `lines/anita/ik_weet_niet_wat_ik_moet_zeggen_c2047779.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #433 |
| 434 | M30.6 | Geesje (Pulcherrima) | `lines/geesje/de_bieten_staan_tot_aan_de_weg_t_e550c5c9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #434 |
| 435 | M30.6 | Berend Bos (Charon) | `lines/berend_bos/in_veendam_zoeken_ze_een_aanvals_27cb79f6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #435 |
| 436 | M30.6 | Sjabbe (Rasalgethi) | `lines/sjabbe/ik_heb_een_pand_het_staat_leeg_j_c190694f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #436 |
| 437 | O12 | Tammo (Orus) | `lines/tammo/rijden_ae689725.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #437 |
| 438 | O12 | Tammo (Orus) | `lines/tammo/waar_jij_wilt_a0d451de.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #438 |
| 439 | O12 | Tammo (Orus) | `lines/tammo/dan_beginnen_we_overal_5766cc7a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #439 |
| 440 | O12 | Meneer Veldkamp (Alnilam) | `lines/meneer_veldkamp/de_duiven_vragen_of_jullie_blijv_f304455f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #440 |
| 441 | F6 | Tammo (Orus) | `lines/tammo/dat_is_een_goede_verhouding_voor_77f6c84d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #441 |
| 442 | F6 | Tammo (Orus) | `lines/tammo/en_een_escapade_die_trekt_bfa8b99d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #442 |
| 443 | F6 | Rikus (Schedar) | `lines/rikus/het_is_half_tien_het_luik_is_ope_8c3333b8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #443 |
| 444 | F6 | Tammo (Orus) | `lines/tammo/alles_blijft_open_de_boerderij_d_a71a51f5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #444 |
| 445 | F6 | Tammo (Orus) | `lines/tammo/dan_rijden_we_a72f86ca.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #445 |
| 446 | F6 | Tammo (Orus) | `lines/tammo/eerst_de_hereweg_77dadf67.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #446 |
| 447 | Wereld levend | ~m (Iapetus) | `lines/bubbles/m/moi_kom_moar_kieken_t_kost_niks_0f2b6c2e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #447 |
| 448 | Wereld levend | ~f (Sulafat) | `lines/bubbles/f/moi_kom_moar_kieken_t_kost_niks_5821037c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #448 |
| 449 | Wereld levend | ~m (Sadaltager) | `lines/bubbles/m/drie_haring_voor_de_prijs_van_tw_9b448020.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #449 |
| 450 | Wereld levend | ~f (Laomedeia) | `lines/bubbles/f/drie_haring_voor_de_prijs_van_tw_091561df.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #450 |
| 451 | Wereld levend | ~m (Umbriel) | `lines/bubbles/m/vandoag_vers_de_vis_de_kaas_en_m_67704879.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #451 |
| 452 | Wereld levend | ~f (Despina) | `lines/bubbles/f/vandoag_vers_de_vis_de_kaas_en_m_e31d732f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #452 |
| 453 | Wereld levend | ~m (Umbriel) | `lines/bubbles/m/hai_wie_wil_der_nog_een_tompouce_219a6a87.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #453 |
| 454 | Wereld levend | ~f (Aoede) | `lines/bubbles/f/hai_wie_wil_der_nog_een_tompouce_1ec0fc60.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #454 |
| 455 | Wereld levend | ~m (Iapetus) | `lines/bubbles/m/pas_op_de_kist_staat_nog_open_949f461e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #455 |
| 456 | Wereld levend | ~f (Autonoe) | `lines/bubbles/f/pas_op_de_kist_staat_nog_open_4bdd2928.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #456 |
| 457 | Wereld levend | ~m (Iapetus) | `lines/bubbles/m/is_dit_een_echte_haring_of_een_k_c27d9b94.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #457 |
| 458 | Wereld levend | ~f (Despina) | `lines/bubbles/f/is_dit_een_echte_haring_of_een_k_2a935761.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #458 |
| 459 | Wereld levend | ~m (Puck) | `lines/bubbles/m/mag_ik_die_proeven_ik_bedoel_ete_a0e05061.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #459 |
| 460 | Wereld levend | ~f (Autonoe) | `lines/bubbles/f/mag_ik_die_proeven_ik_bedoel_ete_0a8c5098.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #460 |
| 461 | Wereld levend | ~m (Puck) | `lines/bubbles/m/nog_e_e_n_nummer_dan_stopt_hij_e_8fb6a4bb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #461 |
| 462 | Wereld levend | ~f (Autonoe) | `lines/bubbles/f/nog_e_e_n_nummer_dan_stopt_hij_e_d42412f6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #462 |
| 463 | Wereld levend | ~m (Rasalgethi) | `lines/bubbles/m/is_dit_kunst_ik_denk_van_wel_edf33b33.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #463 |
| 464 | Wereld levend | ~f (Aoede) | `lines/bubbles/f/is_dit_kunst_ik_denk_van_wel_def0d366.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #464 |
| 465 | Wereld levend | ~m (Iapetus) | `lines/bubbles/m/een_euro_in_de_hoed_dat_is_ook_e_119be65a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #465 |
| 466 | Wereld levend | ~f (Despina) | `lines/bubbles/f/een_euro_in_de_hoed_dat_is_ook_e_82ca1c5d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #466 |
| 467 | Wereld levend | ~m (Alnilam) | `lines/bubbles/m/hij_speelt_vals_maar_met_overtui_b8e8cb78.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #467 |
| 468 | Wereld levend | ~f (Autonoe) | `lines/bubbles/f/hij_speelt_vals_maar_met_overtui_e9c29024.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #468 |
| 469 | Wereld levend | ~m (Umbriel) | `lines/bubbles/m/mooi_joh_doe_t_nog_ais_dd277d3f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #469 |
| 470 | Wereld levend | ~f (Pulcherrima) | `lines/bubbles/f/mooi_joh_doe_t_nog_ais_f7899710.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #470 |
| 471 | Wereld levend | ~m (Puck) | `lines/bubbles/m/dit_zet_ik_op_mijn_vakantiefilmp_aa361b55.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #471 |
| 472 | Wereld levend | ~f (Sulafat) | `lines/bubbles/f/dit_zet_ik_op_mijn_vakantiefilmp_003f7896.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #472 |
| 473 | Wereld levend | ~m (Puck) | `lines/bubbles/m/wie_heeft_er_nog_iets_koels_voor_5ad60b47.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #473 |
| 474 | Wereld levend | ~f (Despina) | `lines/bubbles/f/wie_heeft_er_nog_iets_koels_voor_94da44a9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #474 |
| 475 | Wereld levend | ~m (Charon) | `lines/bubbles/m/ik_heb_morgen_tentamen_dat_is_mo_1c9a740c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #475 |
| 476 | Wereld levend | ~f (Sulafat) | `lines/bubbles/f/ik_heb_morgen_tentamen_dat_is_mo_b317ffb0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #476 |
| 477 | Wereld levend | ~m (Puck) | `lines/bubbles/m/dit_is_geen_feest_dit_is_netwerk_ae015399.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #477 |
| 478 | Wereld levend | ~f (Aoede) | `lines/bubbles/f/dit_is_geen_feest_dit_is_netwerk_484748e6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #478 |
| 479 | Wereld levend | ~m (Iapetus) | `lines/bubbles/m/iemand_nog_een_oplader_voor_mijn_8a25c596.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #479 |
| 480 | Wereld levend | ~f (Erinome) | `lines/bubbles/f/iemand_nog_een_oplader_voor_mijn_9dcd0570.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #480 |
| 481 | Wereld levend | ~m (Zubenelgenubi) | `lines/bubbles/m/kiek_de_zon_komt_er_al_aan_of_is_48c04aab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #481 |
| 482 | Wereld levend | ~f (Leda) | `lines/bubbles/f/kiek_de_zon_komt_er_al_aan_of_is_ec9b284b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #482 |
| 483 | Wereld levend | ~m (Rasalgethi) | `lines/bubbles/m/nog_e_e_n_rondje_dan_ga_ik_naar__a44c3f39.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #483 |
| 484 | Wereld levend | ~f (Sulafat) | `lines/bubbles/f/nog_e_e_n_rondje_dan_ga_ik_naar__cf98f202.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #484 |
| 485 | Wereld levend | ~m (Alnilam) | `lines/bubbles/m/nog_e_e_n_ritje_dan_stoppen_we_e_0a45ae88.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #485 |
| 486 | Wereld levend | ~f (Despina) | `lines/bubbles/f/nog_e_e_n_ritje_dan_stoppen_we_e_234674ed.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #486 |
| 487 | Wereld levend | ~m (Puck) | `lines/bubbles/m/mien_suikerspin_is_groter_dan_jo_06b21385.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #487 |
| 488 | Wereld levend | ~f (Vindemiatrix) | `lines/bubbles/f/mien_suikerspin_is_groter_dan_jo_bc54baf9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #488 |
| 489 | Wereld levend | ~m (Rasalgethi) | `lines/bubbles/m/wie_heeft_de_zweefmolen_vastgeze_ce25380b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #489 |
| 490 | Wereld levend | ~f (Leda) | `lines/bubbles/f/wie_heeft_de_zweefmolen_vastgeze_610e0681.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #490 |
| 491 | Wereld levend | ~m (Alnilam) | `lines/bubbles/m/ik_win_die_knuffel_dat_zeg_ik_el_65580280.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #491 |
| 492 | Wereld levend | ~f (Sulafat) | `lines/bubbles/f/ik_win_die_knuffel_dat_zeg_ik_el_bdef08de.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #492 |
| 493 | Wereld levend | ~m (Puck) | `lines/bubbles/m/hai_de_poffertjes_ruiken_weer_na_b2d7cfe7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #493 |
| 494 | Wereld levend | ~f (Sulafat) | `lines/bubbles/f/hai_de_poffertjes_ruiken_weer_na_f454fbcc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #494 |
| 495 | Wereld levend | ~m (Zubenelgenubi) | `lines/bubbles/m/eerst_de_botsauto_dan_de_college_18d10ba5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #495 |
| 496 | Wereld levend | ~f (Pulcherrima) | `lines/bubbles/f/eerst_de_botsauto_dan_de_college_23fa0790.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #496 |
| 497 | Wereld levend | ~m (Charon) | `lines/bubbles/m/nog_twee_kilometer_zegt_de_gids_8a9b28ca.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #497 |
| 498 | Wereld levend | ~f (Laomedeia) | `lines/bubbles/f/nog_twee_kilometer_zegt_de_gids_1c7e12f3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #498 |
| 499 | Wereld levend | ~m (Puck) | `lines/bubbles/m/dat_is_een_eend_geloof_ik_7f88168d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #499 |
| 500 | Wereld levend | ~f (Vindemiatrix) | `lines/bubbles/f/dat_is_een_eend_geloof_ik_340059ab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #500 |
| 501 | Wereld levend | ~m (Umbriel) | `lines/bubbles/m/zullen_we_bij_de_volgende_bank_s_81c6b1e5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #501 |
| 502 | Wereld levend | ~f (Pulcherrima) | `lines/bubbles/f/zullen_we_bij_de_volgende_bank_s_e70c5a30.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #502 |
| 503 | Wereld levend | ~m (Rasalgethi) | `lines/bubbles/m/moi_mooi_weertje_voor_een_wandel_d4632dd1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #503 |
| 504 | Wereld levend | ~f (Leda) | `lines/bubbles/f/moi_mooi_weertje_voor_een_wandel_ca264f4d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #504 |
| 505 | Wereld levend | ~m (Zubenelgenubi) | `lines/bubbles/m/wie_heeft_er_koffie_in_de_thermo_f2828207.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #505 |
| 506 | Wereld levend | ~f (Achernar) | `lines/bubbles/f/wie_heeft_er_koffie_in_de_thermo_5f3c9861.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #506 |
| 507 | Wereld levend | ~m (Sadaltager) | `lines/bubbles/m/ik_loop_niet_hard_ik_loop_vaak_93873120.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #507 |
| 508 | Wereld levend | ~f (Sulafat) | `lines/bubbles/f/ik_loop_niet_hard_ik_loop_vaak_5d8ac1cc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #508 |
| 509 | Wereld levend | ~m (Zubenelgenubi) | `lines/bubbles/m/nog_e_e_n_rondje_dat_zei_ik_net__79030717.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #509 |
| 510 | Wereld levend | ~f (Leda) | `lines/bubbles/f/nog_e_e_n_rondje_dat_zei_ik_net__48671c99.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #510 |
| 511 | Wereld levend | ~m (Iapetus) | `lines/bubbles/m/moi_niet_kieken_ik_hou_t_vol_34a9b92e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #511 |
| 512 | Wereld levend | ~f (Aoede) | `lines/bubbles/f/moi_niet_kieken_ik_hou_t_vol_e635b952.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #512 |
| 513 | Wereld levend | ~m (Iapetus) | `lines/bubbles/m/mien_horloge_zegt_dat_ik_rust_mo_22b16f0a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #513 |
| 514 | Wereld levend | ~f (Leda) | `lines/bubbles/f/mien_horloge_zegt_dat_ik_rust_mo_91c64e7d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #514 |
| 515 | Wereld levend | ~m (Rasalgethi) | `lines/bubbles/m/hoe_ver_nog_zeg_maar_niks_250cab55.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #515 |
| 516 | Wereld levend | ~f (Pulcherrima) | `lines/bubbles/f/hoe_ver_nog_zeg_maar_niks_40a8dce0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #516 |
| 517 | Wereld levend | ~m (Charon) | `lines/bubbles/m/nog_e_e_n_foto_met_de_toren_erbi_7ab5878e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #517 |
| 518 | Wereld levend | ~f (Laomedeia) | `lines/bubbles/f/nog_e_e_n_foto_met_de_toren_erbi_a5f5dd3b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #518 |
| 519 | Wereld levend | ~m (Sadaltager) | `lines/bubbles/m/kun_je_me_met_de_toren_erop_zett_61edcf3e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #519 |
| 520 | Wereld levend | ~f (Achernar) | `lines/bubbles/f/kun_je_me_met_de_toren_erop_zett_07b496b1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #520 |
| 521 | Wereld levend | ~m (Puck) | `lines/bubbles/m/is_dit_nou_grunn_het_is_prachtig_002420ad.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #521 |
| 522 | Wereld levend | ~f (Autonoe) | `lines/bubbles/f/is_dit_nou_grunn_het_is_prachtig_bb12c0aa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #522 |
| 523 | Wereld levend | ~m (Charon) | `lines/bubbles/m/wacht_mijn_duim_zat_ervoor_fe9e5512.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #523 |
| 524 | Wereld levend | ~f (Aoede) | `lines/bubbles/f/wacht_mijn_duim_zat_ervoor_b02e9c2a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #524 |
| 525 | Wereld levend | ~m (Puck) | `lines/bubbles/m/ze_zeggen_moi_tegen_iedereen_ik__f28904cb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #525 |
| 526 | Wereld levend | ~f (Laomedeia) | `lines/bubbles/f/ze_zeggen_moi_tegen_iedereen_ik__608e9175.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #526 |
| 527 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/zeven_rondes_in_een_seizoen_wie__6b41b2ce.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #527 |
| 528 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/het_seizoen_is_kort_en_de_zomer__e441f5ae.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #528 |
| 529 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_nieuwe_ronde_in_de_competiti_31ae4c35.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #529 |
| 530 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/in_een_kort_seizoen_mag_je_e_e_n_8a9049cb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #530 |
| 531 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/bij_het_dorpsteam_was_een_seizoe_87b152f0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #531 |
| 532 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/elke_ronde_is_een_kwartfinale_ze_02622f23.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #532 |
| 533 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_heb_de_stand_gezien_ik_zeg_ni_1a5f95bd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #533 |
| 534 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/punten_tellen_mooi_voetbal_telt__eaa15ddc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #534 |
| 535 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/zeven_rondes_is_niks_een_koffiep_26e35c9e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #535 |
| 536 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/wie_bovenaan_staat_heeft_alleen__6294fbd0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #536 |
| 537 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/hoog_in_de_stand_en_dat_zie_je_a_434042b8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #537 |
| 538 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/aan_de_top_is_de_lucht_dun_en_he_551cc04d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #538 |
| 539 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/bovenaan_staan_is_makkelijk_er_b_ff82ebab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #539 |
| 540 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_heb_ooit_twee_weken_bovenaan__956a7293.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #540 |
| 541 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/wie_bovenaan_staat_krijgt_altijd_0fd0b9ca.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #541 |
| 542 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/als_je_bovenaan_staat_is_iederee_f34f46dd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #542 |
| 543 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/de_top_is_gezellig_maar_je_moet__a5a4c502.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #543 |
| 544 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/hoge_ogen_gooien_joh_dat_doen_ze_6cc9fcc8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #544 |
| 545 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/onderin_de_stand_maar_het_gras_i_c7914404.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #545 |
| 546 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_onderste_plekken_zijn_gevaarl_016e360e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #546 |
| 547 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/wie_onderaan_staat_moet_iets_lat_7fda20ad.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #547 |
| 548 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/onderin_heb_je_niks_te_verliezen_c80dd276.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #548 |
| 549 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/degradatie_is_geen_ramp_het_is_a_08e07c63.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #549 |
| 550 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_heb_ooit_onderaan_gestaan_de__dc690827.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #550 |
| 551 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/als_het_tegenzit_zit_het_tegen_m_6384400b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #551 |
| 552 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/onderaan_leer_je_het_meest_zegge_251e535b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #552 |
| 553 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/je_moet_ergens_beginnen_liefst_n_fc3c5d2d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #553 |
| 554 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_laatste_ronde_van_het_seizoen_e4287e77.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #554 |
| 555 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/dit_is_de_slotdag_wie_nu_wint_ka_d0bebc15.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #555 |
| 556 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/ronde_zeven_de_laatste_de_stand__d2c9115a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #556 |
| 557 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/het_hele_seizoen_komt_hier_samen_0a0de010.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #557 |
| 558 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/dit_is_het_moment_de_laatste_flu_21f2a104.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #558 |
| 559 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/de_laatste_ronde_alles_of_niks_z_62c408f1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #559 |
| 560 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/slotdag_alle_rekensommen_op_de_t_c7af6d9c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #560 |
| 561 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/zo_n_laatste_dag_duurt_altijd_la_99327e0c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #561 |
| 562 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/de_nagelbijters_zitten_vandaag_v_d9adede8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #562 |
| 563 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/na_afloop_weten_we_alles_of_niks_62294a1f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #563 |
| 564 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/spannend_joh_het_wordt_een_lange_69d46c59.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #564 |
| 565 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_dijkbeker_wie_verliest_gaat_n_ea6708f2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #565 |
| 566 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_bekerwedstrijd_geen_tweede_k_1a176c54.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #566 |
| 567 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_beker_heeft_zijn_eigen_wetten_fd82b769.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #567 |
| 568 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/bekervoetbal_is_eerlijk_er_blijf_e657b723.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #568 |
| 569 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/hier_wordt_het_gras_nog_zenuwach_05b466eb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #569 |
| 570 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/bekervoetbal_negentig_minuten_en_d5fdc9a2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #570 |
| 571 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/in_de_beker_bestaat_geen_morgen__47e7a78b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #571 |
| 572 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_ben_ooit_door_in_de_beker_geg_91d49502.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #572 |
| 573 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_beker_is_gemaakt_om_te_verli_11944412.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #573 |
| 574 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/alle_kleine_clubs_dromen_hier_va_decc3350.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #574 |
| 575 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/bij_strafschoppen_helpt_geen_bel_ee8a0648.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #575 |
| 576 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_waddenbeker_clubs_van_over_de_de3d2b37.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #576 |
| 577 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_buitenlandse_tegenstander_de_8f6a1086.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #577 |
| 578 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/waddenbeker_een_toernooi_met_zou_2d645f92.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #578 |
| 579 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_internationale_avond_in_grun_1faaef3e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #579 |
| 580 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/welkom_bij_de_waddenbeker_iedere_ae3ce22d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #580 |
| 581 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/buitenlandse_clubs_ik_begrijp_ze_3390254c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #581 |
| 582 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/zout_in_de_lucht_en_een_bal_aan__79848e83.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #582 |
| 583 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_internationale_avond_ik_heb__18c56a6f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #583 |
| 584 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/het_zijn_dezelfde_regels_hoor_al_0c567e51.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #584 |
| 585 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ver_van_huis_spelen_is_moeilijk__de73d887.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #585 |
| 586 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dit_is_waarvoor_je_op_zaterdag_j_1d5e901f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #586 |
| 587 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_eerste_wedstrijd_en_een_heel_545a1e12.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #587 |
| 588 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/debuteren_is_moeilijk_vooral_als_2af833e4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #588 |
| 589 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/mijn_debuut_was_een_eigen_doelpu_842ba6a0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #589 |
| 590 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/de_eerste_wedstrijd_is_de_zwaars_8596fdbb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #590 |
| 591 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_zie_talent_of_een_goede_jas_h_59e7951c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #591 |
| 592 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/wie_een_debuut_overleeft_overlee_748d09fd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #592 |
| 593 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_ster_van_de_ploeg_doet_wat_ee_7b65b0d6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #593 |
| 594 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dat_had_ik_zelf_niet_beter_gedaa_2c1d3760.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #594 |
| 595 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_ster_is_geboren_of_hij_was_h_5b7bb191.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #595 |
| 596 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dit_zijn_de_doelpunten_waar_je_k_869721ca.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #596 |
| 597 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/zie_je_daar_zit_werk_achter_en_e_8d23757d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #597 |
| 598 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/het_talent_zit_in_de_voeten_de_r_3e8a0338.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #598 |
| 599 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dat_wordt_een_mooi_verhaal_in_de_736cae1a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #599 |
| 600 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_warme_groet_voor_onze_sponso_474d35b1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #600 |
| 601 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/zonder_sponsor_geen_netten_en_zo_3bd0e742.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #601 |
| 602 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_borden_langs_het_veld_zijn_we_e95e5c33.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #602 |
| 603 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/sponsors_maken_het_mogelijk_en_i_a14a8894.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #603 |
| 604 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/fijn_zo_n_bedrijf_dat_in_ons_gel_d3e887df.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #604 |
| 605 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_sponsor_is_als_een_goede_kee_63ca9a57.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #605 |
| 606 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_bedankje_aan_de_borden_die_k_ab4b86e5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #606 |
| 607 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/zonder_sponsor_betalen_we_de_noo_6cef6245.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #607 |
| 608 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/mooi_dat_ze_meekijken_maar_ze_mo_90f8287f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #608 |

De wachtrij heeft 608 clips (1 manifest(en): lines).

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

Het issue telt 670 regels/671 clips (67 klaar + 604 wachtend, plus de laadhint van 2 clips). De huidige bronnen geven 608 regels/clips: 608 klaar + 0 wachtend. Dat verschil komt doordat `script.json`, `gronings_spoken.json` en de opnames sinds 6-11 zijn bijgewerkt; deze lijst volgt de code, niet het issue.
