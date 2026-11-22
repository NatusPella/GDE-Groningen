# TTS-opnamelijst #735: definitieve lijst van deze ronde

Gegenereerd door `node scripts/tts_opnamelijst.mjs` uit `game/storydata/script.json`, `scripts/tts_lines.json`, `scripts/gronings_spoken.json` en `scripts/tts_cast.mjs`. Niet met de hand aanpassen; draai `node scripts/tts_opnamelijst.mjs --check` om te zien of deze lijst achterloopt.

**Stand van deze bronnen:** 224 clips staan klaar in de wachtrij (`scripts/tts_lines.json`), 46 verhaalregels wachten nog (0 op een stemkeuze, 46 op een Groningse spreektekst). Samen **270 regels/clips**. De 37 bewust stille appjes (`channel: app-stil`) staan er niet op.

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
| 17 | F2 | Tammo (Orus) | `lines/tammo/niks_ik_zeg_het_uit_gewoonte_7e8fbb47.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #17 |
| 18 | F2 | Tammo (Orus) | `lines/tammo/dat_was_mijn_plan_al_ded2f476.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #18 |
| 19 | F2 | Tammo (Orus) | `lines/tammo/sinds_de_escapade_cd5e5aa5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #19 |
| 20 | F3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/dit_is_mijn_keuken_a14041f2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #20 |
| 21 | F3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/wat_zegt_ze_e874b107.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #21 |
| 22 | F3 | Tammo (Orus) | `lines/tammo/oma_trijntje_beppe_beppe_oma_tri_f5d378b6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #22 |
| 23 | F3 | Anita (Callirrhoe) | `lines/anita/hij_is_gronings_ik_ben_fries_wij_5ae0b0f3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #23 |
| 24 | F3 | Beppe (Aoede) | `lines/beppe/it_smakket_6c1fff32.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #24 |
| 25 | F3 | Oma Trijntje (Sulafat) | `lines/oma_trijntje/moi_het_is_soep_met_een_eierbal__18e1d161.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #25 |
| 26 | F4 | Tammo (Orus) | `lines/tammo/ik_heb_ook_geen_vergunning_11157e3e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #26 |
| 27 | F4 | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/een_prijs_zonder_bijlage_wie_doe_33f41f1b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #27 |
| 28 | F5 | Tammo (Orus) | `lines/tammo/het_is_een_gelegenheid_7ed74ad8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #28 |
| 29 | F5 | Tammo (Orus) | `lines/tammo/eten_wandelen_en_eentje_doorgest_ab61152d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #29 |
| 30 | F5 | Tammo (Orus) | `lines/tammo/zeggen_dat_ik_je_leuk_vind_dat_i_7ff1057e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #30 |
| 31 | F5 | Tammo (Orus) | `lines/tammo/hier_dat_is_goed_c564677e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #31 |
| 32 | F5 | Tammo (Orus) | `lines/tammo/hier_met_jou_erbij_e0d450ab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #32 |
| 33 | F5 | Anita (Callirrhoe) | `lines/anita/drie_kon_meer_7939164b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #33 |
| 34 | F5 | Anita (Callirrhoe) | `lines/anita/dat_waren_er_vier_kon_meer_8c0f449e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #34 |
| 35 | M27.1 | Willemien (Aoede) | `lines/willemien/ik_ken_jullie_van_het_luik_woens_b30c641f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #35 |
| 36 | M27.1 | Willemien (Aoede) | `lines/willemien/de_aannemer_zet_het_huis_op_nieu_56a8d40d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #36 |
| 37 | M27.1 | Willemien (Aoede) | `lines/willemien/het_duurt_alleen_langer_dan_een__12fe1cb5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #37 |
| 38 | M27.1 | Willemien (Aoede) | `lines/willemien/dat_zegt_trijntje_van_alles_bree_0d19ad1c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #38 |
| 39 | M27.1 | Tammo (Orus) | `lines/tammo/en_de_kat_12d06093.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #39 |
| 40 | M27.1 | Willemien (Aoede) | `lines/willemien/de_kat_weet_het_al_f59128a0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #40 |
| 41 | M27.1 | Willemien (Aoede) | `lines/willemien/hij_zit_sinds_gisteren_onder_de__b04213c6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #41 |
| 42 | O11 | Tammo (Orus) | `lines/tammo/wat_wilde_hij_nou_ad2edf35.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #42 |
| 43 | M29.2 | Willemien (Aoede) | `lines/willemien/trijntjes_recept_het_is_een_bal_44740714.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #43 |
| 44 | M30.1 | Lammert (Iapetus) | `lines/lammert/ik_heb_de_sleutel_van_de_sluis_v_bd97f447.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #44 |
| 45 | M30.1 | Roelfien (Laomedeia) | `lines/roelfien/ik_vlieg_boven_zes_zakken_meel_e_83773f70.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #45 |
| 46 | M30.1 | Wubbo (Sadaltager) | `lines/wubbo/ik_doe_de_lier_van_de_brug_open__965e635d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #46 |
| 47 | M30.1 | Tinus (Enceladus) | `lines/tinus/de_trekker_heeft_een_toren_zonde_7a459dd3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #47 |
| 48 | M30.1 | Anita (Callirrhoe) | `lines/anita/zeven_mensen_die_niet_weglopen_ebef4e4a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #48 |
| 49 | M30.1 | Anita (Callirrhoe) | `lines/anita/ik_weet_niet_wat_ik_moet_zeggen_c2047779.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #49 |
| 50 | O12 | Tammo (Orus) | `lines/tammo/waar_jij_wilt_a0d451de.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #50 |
| 51 | O12 | Tammo (Orus) | `lines/tammo/dan_beginnen_we_overal_5766cc7a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #51 |
| 52 | O12 | Meneer Veldkamp (Alnilam) | `lines/meneer_veldkamp/de_duiven_vragen_of_jullie_blijv_f304455f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #52 |
| 53 | F6 | Rikus (Schedar) | `lines/rikus/het_is_half_tien_het_luik_is_ope_8c3333b8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #53 |
| 54 | F6 | Tammo (Orus) | `lines/tammo/alles_blijft_open_de_boerderij_d_a71a51f5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #54 |
| 55 | F6 | Tammo (Orus) | `lines/tammo/dan_rijden_we_a72f86ca.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #55 |
| 56 | F6 | Tammo (Orus) | `lines/tammo/eerst_de_hereweg_77dadf67.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #56 |
| 57 | Rondvaart-missie | Schipper Wiebe (megafoon) (Alnilam) | `lines/schipper_wiebe_megafoon/ik_ken_elke_brug_in_de_stad_jull_9e78d549.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #57 |
| 58 | Rondvaart (gids) | Tammo (gids) (Orus) | `lines/tammo_gids/welkom_aan_boord_we_varen_een_ro_f27d6e64.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #58 |
| 59 | Rondvaart (gids) | Tammo (gids) (Orus) | `lines/tammo_gids/dit_is_het_schuitendiep_hier_leg_de7554ec.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #59 |
| 60 | Rondvaart (gids) | Anita (Callirrhoe) | `lines/anita/de_stad_staat_erom_bekend_dat_de_7edc1155.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #60 |
| 61 | Rondvaart (gids) | Anita (Callirrhoe) | `lines/anita/hij_kreeg_de_stad_niet_op_28_aug_9e6f44de.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #61 |
| 62 | Rondvaart (gids) | Anita (Callirrhoe) | `lines/anita/rechts_de_praediniussingel_verno_404313b4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #62 |
| 63 | Rondvaart (gids) | Tammo (gids) (Orus) | `lines/tammo_gids/het_riviertje_heet_de_a_omdat_ze_4142736a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #63 |
| 64 | Rondvaart (gids) | Anita (Callirrhoe) | `lines/anita/in_de_stad_is_tijdelijk_een_rekb_64746405.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #64 |
| 65 | Rondvaart (gids) | Anita (Callirrhoe) | `lines/anita/daar_gaat_het_reitdiep_naar_het__81bd154a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #65 |
| 66 | Bijbaantjes (baas) | Verhuisbedrijf Van Kamer naar Kamer (Sadachbia) | `lines/verhuisbedrijf_van_kamer_naar_kamer/het_is_kei_week_half_nederland_z_9f97c6c7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #66 |
| 67 | Wijken & landschap (verteller) | Rikus (Schedar) | `lines/rikus/het_hart_van_de_stad_klopt_het_h_a1fd39a6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #67 |
| 68 | Wijken & landschap (verteller) | Rikus (Schedar) | `lines/rikus/de_zeeheldenbuurt_zeehelden_in_d_cb166a6e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #68 |
| 69 | Wereld levend | ~m (Iapetus) | `lines/bubbles/m/moi_kom_moar_kieken_t_kost_niks_0f2b6c2e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #69 |
| 70 | Wereld levend | ~f (Sulafat) | `lines/bubbles/f/moi_kom_moar_kieken_t_kost_niks_5821037c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #70 |
| 71 | Wereld levend | ~m (Sadaltager) | `lines/bubbles/m/drie_haring_voor_de_prijs_van_tw_9b448020.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #71 |
| 72 | Wereld levend | ~f (Laomedeia) | `lines/bubbles/f/drie_haring_voor_de_prijs_van_tw_091561df.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #72 |
| 73 | Wereld levend | ~m (Umbriel) | `lines/bubbles/m/vandoag_vers_de_vis_de_kaas_en_m_67704879.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #73 |
| 74 | Wereld levend | ~f (Despina) | `lines/bubbles/f/vandoag_vers_de_vis_de_kaas_en_m_e31d732f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #74 |
| 75 | Wereld levend | ~m (Umbriel) | `lines/bubbles/m/hai_wie_wil_der_nog_een_tompouce_219a6a87.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #75 |
| 76 | Wereld levend | ~f (Aoede) | `lines/bubbles/f/hai_wie_wil_der_nog_een_tompouce_1ec0fc60.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #76 |
| 77 | Wereld levend | ~m (Iapetus) | `lines/bubbles/m/pas_op_de_kist_staat_nog_open_949f461e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #77 |
| 78 | Wereld levend | ~f (Autonoe) | `lines/bubbles/f/pas_op_de_kist_staat_nog_open_4bdd2928.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #78 |
| 79 | Wereld levend | ~m (Iapetus) | `lines/bubbles/m/is_dit_een_echte_haring_of_een_k_c27d9b94.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #79 |
| 80 | Wereld levend | ~f (Despina) | `lines/bubbles/f/is_dit_een_echte_haring_of_een_k_2a935761.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #80 |
| 81 | Wereld levend | ~m (Puck) | `lines/bubbles/m/mag_ik_die_proeven_ik_bedoel_ete_a0e05061.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #81 |
| 82 | Wereld levend | ~f (Autonoe) | `lines/bubbles/f/mag_ik_die_proeven_ik_bedoel_ete_0a8c5098.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #82 |
| 83 | Wereld levend | ~m (Puck) | `lines/bubbles/m/nog_e_e_n_nummer_dan_stopt_hij_e_8fb6a4bb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #83 |
| 84 | Wereld levend | ~f (Autonoe) | `lines/bubbles/f/nog_e_e_n_nummer_dan_stopt_hij_e_d42412f6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #84 |
| 85 | Wereld levend | ~m (Rasalgethi) | `lines/bubbles/m/is_dit_kunst_ik_denk_van_wel_edf33b33.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #85 |
| 86 | Wereld levend | ~f (Aoede) | `lines/bubbles/f/is_dit_kunst_ik_denk_van_wel_def0d366.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #86 |
| 87 | Wereld levend | ~m (Iapetus) | `lines/bubbles/m/een_euro_in_de_hoed_dat_is_ook_e_119be65a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #87 |
| 88 | Wereld levend | ~f (Despina) | `lines/bubbles/f/een_euro_in_de_hoed_dat_is_ook_e_82ca1c5d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #88 |
| 89 | Wereld levend | ~m (Alnilam) | `lines/bubbles/m/hij_speelt_vals_maar_met_overtui_b8e8cb78.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #89 |
| 90 | Wereld levend | ~f (Autonoe) | `lines/bubbles/f/hij_speelt_vals_maar_met_overtui_e9c29024.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #90 |
| 91 | Wereld levend | ~m (Umbriel) | `lines/bubbles/m/mooi_joh_doe_t_nog_ais_dd277d3f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #91 |
| 92 | Wereld levend | ~f (Pulcherrima) | `lines/bubbles/f/mooi_joh_doe_t_nog_ais_f7899710.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #92 |
| 93 | Wereld levend | ~m (Puck) | `lines/bubbles/m/dit_zet_ik_op_mijn_vakantiefilmp_aa361b55.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #93 |
| 94 | Wereld levend | ~f (Sulafat) | `lines/bubbles/f/dit_zet_ik_op_mijn_vakantiefilmp_003f7896.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #94 |
| 95 | Wereld levend | ~m (Puck) | `lines/bubbles/m/wie_heeft_er_nog_iets_koels_voor_5ad60b47.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #95 |
| 96 | Wereld levend | ~f (Despina) | `lines/bubbles/f/wie_heeft_er_nog_iets_koels_voor_94da44a9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #96 |
| 97 | Wereld levend | ~m (Charon) | `lines/bubbles/m/ik_heb_morgen_tentamen_dat_is_mo_1c9a740c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #97 |
| 98 | Wereld levend | ~f (Sulafat) | `lines/bubbles/f/ik_heb_morgen_tentamen_dat_is_mo_b317ffb0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #98 |
| 99 | Wereld levend | ~m (Puck) | `lines/bubbles/m/dit_is_geen_feest_dit_is_netwerk_ae015399.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #99 |
| 100 | Wereld levend | ~f (Aoede) | `lines/bubbles/f/dit_is_geen_feest_dit_is_netwerk_484748e6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #100 |
| 101 | Wereld levend | ~m (Iapetus) | `lines/bubbles/m/iemand_nog_een_oplader_voor_mijn_8a25c596.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #101 |
| 102 | Wereld levend | ~f (Erinome) | `lines/bubbles/f/iemand_nog_een_oplader_voor_mijn_9dcd0570.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #102 |
| 103 | Wereld levend | ~m (Zubenelgenubi) | `lines/bubbles/m/kiek_de_zon_komt_er_al_aan_of_is_48c04aab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #103 |
| 104 | Wereld levend | ~f (Leda) | `lines/bubbles/f/kiek_de_zon_komt_er_al_aan_of_is_ec9b284b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #104 |
| 105 | Wereld levend | ~m (Rasalgethi) | `lines/bubbles/m/nog_e_e_n_rondje_dan_ga_ik_naar__a44c3f39.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #105 |
| 106 | Wereld levend | ~f (Sulafat) | `lines/bubbles/f/nog_e_e_n_rondje_dan_ga_ik_naar__cf98f202.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #106 |
| 107 | Wereld levend | ~m (Alnilam) | `lines/bubbles/m/nog_e_e_n_ritje_dan_stoppen_we_e_0a45ae88.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #107 |
| 108 | Wereld levend | ~f (Despina) | `lines/bubbles/f/nog_e_e_n_ritje_dan_stoppen_we_e_234674ed.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #108 |
| 109 | Wereld levend | ~m (Puck) | `lines/bubbles/m/mien_suikerspin_is_groter_dan_jo_06b21385.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #109 |
| 110 | Wereld levend | ~f (Vindemiatrix) | `lines/bubbles/f/mien_suikerspin_is_groter_dan_jo_bc54baf9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #110 |
| 111 | Wereld levend | ~m (Rasalgethi) | `lines/bubbles/m/wie_heeft_de_zweefmolen_vastgeze_ce25380b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #111 |
| 112 | Wereld levend | ~f (Leda) | `lines/bubbles/f/wie_heeft_de_zweefmolen_vastgeze_610e0681.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #112 |
| 113 | Wereld levend | ~m (Charon) | `lines/bubbles/m/nog_twee_kilometer_zegt_de_gids_8a9b28ca.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #113 |
| 114 | Wereld levend | ~f (Laomedeia) | `lines/bubbles/f/nog_twee_kilometer_zegt_de_gids_1c7e12f3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #114 |
| 115 | Wereld levend | ~m (Puck) | `lines/bubbles/m/dat_is_een_eend_geloof_ik_7f88168d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #115 |
| 116 | Wereld levend | ~f (Vindemiatrix) | `lines/bubbles/f/dat_is_een_eend_geloof_ik_340059ab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #116 |
| 117 | Wereld levend | ~m (Umbriel) | `lines/bubbles/m/zullen_we_bij_de_volgende_bank_s_81c6b1e5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #117 |
| 118 | Wereld levend | ~f (Pulcherrima) | `lines/bubbles/f/zullen_we_bij_de_volgende_bank_s_e70c5a30.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #118 |
| 119 | Wereld levend | ~m (Rasalgethi) | `lines/bubbles/m/moi_mooi_weertje_voor_een_wandel_d4632dd1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #119 |
| 120 | Wereld levend | ~f (Leda) | `lines/bubbles/f/moi_mooi_weertje_voor_een_wandel_ca264f4d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #120 |
| 121 | Wereld levend | ~m (Zubenelgenubi) | `lines/bubbles/m/wie_heeft_er_koffie_in_de_thermo_f2828207.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #121 |
| 122 | Wereld levend | ~f (Achernar) | `lines/bubbles/f/wie_heeft_er_koffie_in_de_thermo_5f3c9861.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #122 |
| 123 | Wereld levend | ~m (Sadaltager) | `lines/bubbles/m/ik_loop_niet_hard_ik_loop_vaak_93873120.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #123 |
| 124 | Wereld levend | ~f (Sulafat) | `lines/bubbles/f/ik_loop_niet_hard_ik_loop_vaak_5d8ac1cc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #124 |
| 125 | Wereld levend | ~m (Zubenelgenubi) | `lines/bubbles/m/nog_e_e_n_rondje_dat_zei_ik_net__79030717.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #125 |
| 126 | Wereld levend | ~f (Leda) | `lines/bubbles/f/nog_e_e_n_rondje_dat_zei_ik_net__48671c99.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #126 |
| 127 | Wereld levend | ~m (Iapetus) | `lines/bubbles/m/moi_niet_kieken_ik_hou_t_vol_34a9b92e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #127 |
| 128 | Wereld levend | ~f (Aoede) | `lines/bubbles/f/moi_niet_kieken_ik_hou_t_vol_e635b952.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #128 |
| 129 | Wereld levend | ~m (Iapetus) | `lines/bubbles/m/mien_horloge_zegt_dat_ik_rust_mo_22b16f0a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #129 |
| 130 | Wereld levend | ~f (Leda) | `lines/bubbles/f/mien_horloge_zegt_dat_ik_rust_mo_91c64e7d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #130 |
| 131 | Wereld levend | ~m (Rasalgethi) | `lines/bubbles/m/hoe_ver_nog_zeg_maar_niks_250cab55.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #131 |
| 132 | Wereld levend | ~f (Pulcherrima) | `lines/bubbles/f/hoe_ver_nog_zeg_maar_niks_40a8dce0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #132 |
| 133 | Wereld levend | ~m (Charon) | `lines/bubbles/m/nog_e_e_n_foto_met_de_toren_erbi_7ab5878e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #133 |
| 134 | Wereld levend | ~f (Laomedeia) | `lines/bubbles/f/nog_e_e_n_foto_met_de_toren_erbi_a5f5dd3b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #134 |
| 135 | Wereld levend | ~m (Sadaltager) | `lines/bubbles/m/kun_je_me_met_de_toren_erop_zett_61edcf3e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #135 |
| 136 | Wereld levend | ~f (Achernar) | `lines/bubbles/f/kun_je_me_met_de_toren_erop_zett_07b496b1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #136 |
| 137 | Wereld levend | ~m (Puck) | `lines/bubbles/m/is_dit_nou_grunn_het_is_prachtig_002420ad.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #137 |
| 138 | Wereld levend | ~f (Autonoe) | `lines/bubbles/f/is_dit_nou_grunn_het_is_prachtig_bb12c0aa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #138 |
| 139 | Wereld levend | ~m (Charon) | `lines/bubbles/m/wacht_mijn_duim_zat_ervoor_fe9e5512.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #139 |
| 140 | Wereld levend | ~f (Aoede) | `lines/bubbles/f/wacht_mijn_duim_zat_ervoor_b02e9c2a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #140 |
| 141 | Wereld levend | ~m (Puck) | `lines/bubbles/m/ze_zeggen_moi_tegen_iedereen_ik__f28904cb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #141 |
| 142 | Wereld levend | ~f (Laomedeia) | `lines/bubbles/f/ze_zeggen_moi_tegen_iedereen_ik__608e9175.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #142 |
| 143 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/zeven_rondes_in_een_seizoen_wie__6b41b2ce.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #143 |
| 144 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/het_seizoen_is_kort_en_de_zomer__e441f5ae.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #144 |
| 145 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_nieuwe_ronde_in_de_competiti_31ae4c35.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #145 |
| 146 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/in_een_kort_seizoen_mag_je_e_e_n_8a9049cb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #146 |
| 147 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/bij_het_dorpsteam_was_een_seizoe_87b152f0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #147 |
| 148 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/elke_ronde_is_een_kwartfinale_ze_02622f23.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #148 |
| 149 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_heb_de_stand_gezien_ik_zeg_ni_1a5f95bd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #149 |
| 150 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/punten_tellen_mooi_voetbal_telt__eaa15ddc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #150 |
| 151 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/zeven_rondes_is_niks_een_koffiep_26e35c9e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #151 |
| 152 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/wie_bovenaan_staat_heeft_alleen__6294fbd0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #152 |
| 153 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/hoog_in_de_stand_en_dat_zie_je_a_434042b8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #153 |
| 154 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/aan_de_top_is_de_lucht_dun_en_he_551cc04d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #154 |
| 155 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/bovenaan_staan_is_makkelijk_er_b_ff82ebab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #155 |
| 156 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_heb_ooit_twee_weken_bovenaan__956a7293.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #156 |
| 157 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/wie_bovenaan_staat_krijgt_altijd_0fd0b9ca.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #157 |
| 158 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/als_je_bovenaan_staat_is_iederee_f34f46dd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #158 |
| 159 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/de_top_is_gezellig_maar_je_moet__a5a4c502.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #159 |
| 160 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/hoge_ogen_gooien_joh_dat_doen_ze_6cc9fcc8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #160 |
| 161 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/onderin_de_stand_maar_het_gras_i_c7914404.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #161 |
| 162 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_onderste_plekken_zijn_gevaarl_016e360e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #162 |
| 163 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/wie_onderaan_staat_moet_iets_lat_7fda20ad.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #163 |
| 164 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/onderin_heb_je_niks_te_verliezen_c80dd276.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #164 |
| 165 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/degradatie_is_geen_ramp_het_is_a_08e07c63.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #165 |
| 166 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_heb_ooit_onderaan_gestaan_de__dc690827.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #166 |
| 167 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/als_het_tegenzit_zit_het_tegen_m_6384400b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #167 |
| 168 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/onderaan_leer_je_het_meest_zegge_251e535b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #168 |
| 169 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/je_moet_ergens_beginnen_liefst_n_fc3c5d2d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #169 |
| 170 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_laatste_ronde_van_het_seizoen_e4287e77.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #170 |
| 171 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/dit_is_de_slotdag_wie_nu_wint_ka_d0bebc15.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #171 |
| 172 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/ronde_zeven_de_laatste_de_stand__d2c9115a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #172 |
| 173 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/het_hele_seizoen_komt_hier_samen_0a0de010.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #173 |
| 174 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/dit_is_het_moment_de_laatste_flu_21f2a104.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #174 |
| 175 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/de_laatste_ronde_alles_of_niks_z_62c408f1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #175 |
| 176 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/slotdag_alle_rekensommen_op_de_t_c7af6d9c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #176 |
| 177 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/zo_n_laatste_dag_duurt_altijd_la_99327e0c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #177 |
| 178 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/de_nagelbijters_zitten_vandaag_v_d9adede8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #178 |
| 179 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/na_afloop_weten_we_alles_of_niks_62294a1f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #179 |
| 180 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/spannend_joh_het_wordt_een_lange_69d46c59.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #180 |
| 181 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_dijkbeker_wie_verliest_gaat_n_ea6708f2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #181 |
| 182 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_bekerwedstrijd_geen_tweede_k_1a176c54.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #182 |
| 183 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_beker_heeft_zijn_eigen_wetten_fd82b769.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #183 |
| 184 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/bekervoetbal_is_eerlijk_er_blijf_e657b723.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #184 |
| 185 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/hier_wordt_het_gras_nog_zenuwach_05b466eb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #185 |
| 186 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/bekervoetbal_negentig_minuten_en_d5fdc9a2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #186 |
| 187 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/in_de_beker_bestaat_geen_morgen__47e7a78b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #187 |
| 188 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_ben_ooit_door_in_de_beker_geg_91d49502.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #188 |
| 189 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_beker_is_gemaakt_om_te_verli_11944412.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #189 |
| 190 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/alle_kleine_clubs_dromen_hier_va_decc3350.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #190 |
| 191 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/bij_strafschoppen_helpt_geen_bel_ee8a0648.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #191 |
| 192 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_waddenbeker_clubs_van_over_de_de3d2b37.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #192 |
| 193 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_buitenlandse_tegenstander_de_8f6a1086.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #193 |
| 194 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/waddenbeker_een_toernooi_met_zou_2d645f92.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #194 |
| 195 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_internationale_avond_in_grun_1faaef3e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #195 |
| 196 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/welkom_bij_de_waddenbeker_iedere_ae3ce22d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #196 |
| 197 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/buitenlandse_clubs_ik_begrijp_ze_3390254c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #197 |
| 198 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/zout_in_de_lucht_en_een_bal_aan__79848e83.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #198 |
| 199 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_internationale_avond_ik_heb__18c56a6f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #199 |
| 200 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/het_zijn_dezelfde_regels_hoor_al_0c567e51.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #200 |
| 201 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ver_van_huis_spelen_is_moeilijk__de73d887.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #201 |
| 202 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dit_is_waarvoor_je_op_zaterdag_j_1d5e901f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #202 |
| 203 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_eerste_wedstrijd_en_een_heel_545a1e12.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #203 |
| 204 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/debuteren_is_moeilijk_vooral_als_2af833e4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #204 |
| 205 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/mijn_debuut_was_een_eigen_doelpu_842ba6a0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #205 |
| 206 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/de_eerste_wedstrijd_is_de_zwaars_8596fdbb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #206 |
| 207 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/ik_zie_talent_of_een_goede_jas_h_59e7951c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #207 |
| 208 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/wie_een_debuut_overleeft_overlee_748d09fd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #208 |
| 209 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_ster_van_de_ploeg_doet_wat_ee_7b65b0d6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #209 |
| 210 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dat_had_ik_zelf_niet_beter_gedaa_2c1d3760.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #210 |
| 211 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_ster_is_geboren_of_hij_was_h_5b7bb191.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #211 |
| 212 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dit_zijn_de_doelpunten_waar_je_k_869721ca.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #212 |
| 213 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/zie_je_daar_zit_werk_achter_en_e_8d23757d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #213 |
| 214 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/het_talent_zit_in_de_voeten_de_r_3e8a0338.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #214 |
| 215 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/dat_wordt_een_mooi_verhaal_in_de_736cae1a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #215 |
| 216 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/een_warme_groet_voor_onze_sponso_474d35b1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #216 |
| 217 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/zonder_sponsor_geen_netten_en_zo_3bd0e742.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #217 |
| 218 | Voetbalcommentaar | Hilbrand (Sadachbia) | `lines/hilbrand/de_borden_langs_het_veld_zijn_we_e95e5c33.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #218 |
| 219 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/sponsors_maken_het_mogelijk_en_i_a14a8894.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #219 |
| 220 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/fijn_zo_n_bedrijf_dat_in_ons_gel_d3e887df.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #220 |
| 221 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_sponsor_is_als_een_goede_kee_63ca9a57.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #221 |
| 222 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/een_bedankje_aan_de_borden_die_k_ab4b86e5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #222 |
| 223 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/zonder_sponsor_betalen_we_de_noo_6cef6245.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #223 |
| 224 | Voetbalcommentaar | Roelie (Achird) | `lines/roelie/mooi_dat_ze_meekijken_maar_ze_mo_90f8287f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #224 |

De wachtrij heeft 224 clips (1 manifest(en): lines).

## 2. Wacht op een Groningse spreektekst of stemkeuze

| Stap | Reden | Regels |
|---|---|---|
| E | Groningse spreektekst ontbreekt | 1 |
| F1 | Groningse spreektekst ontbreekt | 2 |
| F3 | Groningse spreektekst ontbreekt | 1 |
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

Alle 46 regels staan met bron, spreker, stem en beoogde bestandsnaam in `TTS-OPNAMELIJST-735.jsonl` (status `stemkeuze` of `spreektekst`); die kunnen pas in de wachtrij als de stem of de spreektekst er is.

## 3. Technische laadhint (aparte beslissing)

De nieuwe laadhint `"De weg hier wordt nog geladen. Even wachten…"` staat bewust **niet** in de wachtrij: `scripts/voicelines_collect.mjs` zet hem in `TECH_HINTS` (een technische melding, geen stem). Het issue #735 noemt hier 2 clips (Tammo/Anita) voor. Wil de eigenaar die toch, dan is dat een aparte opname en een uitzondering in `TECH_HINTS`; deze lijst telt hem niet mee. (TECH_HINTS bevestigd in de bron.)

## 4. Wat de eigenaar daarna doet

1. `node scripts/tts_opnameronde.mjs --budget 2.5` (vraagt niets en leest geen sleutel; de TTS-module leest de eigenaar-sleutel zelf).
2. `node scripts/build_story_data.mjs` zet de opgenomen regels op voiced (de wrapper doet dit al).
3. `node scripts/voice_coverage.mjs --quiet` moet daarna zonder ontbrekende regels blijven.
4. Deze lijst verversen met `node scripts/tts_opnamelijst.mjs` en het issue #735 bijwerken met de nieuwe stand.

## 5. Verschil met #735

Het issue telt 670 regels/671 clips (67 klaar + 604 wachtend, plus de laadhint van 2 clips). De huidige bronnen geven 270 regels/clips: 224 klaar + 46 wachtend. Dat verschil komt doordat `script.json`, `gronings_spoken.json` en de opnames sinds 6-11 zijn bijgewerkt; deze lijst volgt de code, niet het issue.
