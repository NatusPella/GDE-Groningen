# TTS-opnamelijst #735: definitieve lijst van deze ronde

Gegenereerd door `node scripts/tts_opnamelijst.mjs` uit `game/storydata/script.json`, `scripts/tts_lines.json`, `scripts/gronings_spoken.json` en `scripts/tts_cast.mjs`. Niet met de hand aanpassen; draai `node scripts/tts_opnamelijst.mjs --check` om te zien of deze lijst achterloopt.

**Stand van deze bronnen:** 303 clips staan klaar in de wachtrij (`scripts/tts_lines.json`), 0 verhaalregels wachten nog (0 op een stemkeuze, 0 op een Groningse spreektekst). Samen **303 regels/clips**. De 37 bewust stille appjes (`channel: app-stil`) staan er niet op.

> Het issue #735 noemt 670 regels/671 clips (stand 6-11-2026). De scripts zijn de bron: inmiddels zijn er regels bijgekomen of opgenomen, dus deze lijst telt wat de code nu zegt. Zie "Verschil met #735" onderaan.

## Route (LiteLLM, #689)

- Endpoint: `https://litellm.natuspella.nl/v1beta/interactions` (de gateway van de eigenaar; `LITELLM_BASE_URL` overschrijft het adres).
- Modelalias: `google/gemini-3.8-flash-lite-tts`; stem en stijl komen per regel uit de wachtrij.
- De sleutel staat **niet** in de repo: de eigenaar zet `LITELLM_API_KEY` in zijn eigen `.env` (gitignored, `GDE_ENV` wijst naar een andere plek) of in de omgeving. Deze lijst leest `.env` niet en print geen sleutel.
- Batchcommando (wat de runbook gebruikt): `python3 scripts/tts_lines.py --budget 2.5`; de exacte curl per regel staat in `TTS-OPNAMELIJST-735.jsonl` (kolom `curl`).

## 1. Klaar om op te nemen (in de wachtrij)

| # | Bron (scène) | Stem | Bestandsnaam | Commando |
|---|---|---|---|---|
| 1 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/over_het_kerkenpad_door_de_kerkt_f21cf8d5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #1 |
| 2 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/bijna_bij_de_sloot_jelle_zit_er__83facecc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #2 |
| 3 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/bijna_bij_de_sloot_jelle_zit_er__19ebb9d2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #3 |
| 4 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/jelle_ligt_in_de_sloot_naar_de_b_8613e1d9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #4 |
| 5 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/jelle_ligt_in_de_sloot_naar_de_b_8a4c1272.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #5 |
| 6 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/loop_heelhuids_door_de_fatbikes__b50edf9d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #6 |
| 7 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/loop_heelhuids_door_de_fatbikes__c89b4f29.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #7 |
| 8 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/een_sloep_op_het_oosterdiep_elf__0c965364.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #8 |
| 9 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/een_sloep_op_het_oosterdiep_elf__f753712f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #9 |
| 10 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/instappen_de_sloep_ligt_aan_de_k_fd061817.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #10 |
| 11 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/instappen_de_sloep_ligt_aan_de_k_fc068bd4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #11 |
| 12 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/toeter_bij_een_gesloten_brug_wub_2f305acc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #12 |
| 13 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/toeter_bij_een_gesloten_brug_wub_4aab79be.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #13 |
| 14 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_fanfare_is_weg_jelle_kocht_ha_3dce9f68.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #14 |
| 15 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_fanfare_is_weg_jelle_kocht_ha_c8aebe48.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #15 |
| 16 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/brug_acht_negen_en_tien_niet_te__307c9ec5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #16 |
| 17 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/brug_acht_negen_en_tien_niet_te__4fa29048.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #17 |
| 18 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/brug_elf_aan_de_overkant_staat_d_4cb80d6a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #18 |
| 19 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/brug_elf_aan_de_overkant_staat_d_0dac6d0e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #19 |
| 20 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/wiebelwerk_websites_met_karakter_9b0ee7d3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #20 |
| 21 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/wiebelwerk_websites_met_karakter_ba310d18.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #21 |
| 22 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/wiebelwerk_websites_met_karakter_9f3359e6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #22 |
| 23 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/wiebelwerk_websites_met_karakter_db221426.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #23 |
| 24 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/beantwoord_de_intake_een_fout_an_3aec82c8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #24 |
| 25 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/beantwoord_de_intake_een_fout_an_51f2b9db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #25 |
| 26 | Keuzegesprekken | Accountmanager (Zubenelgenubi) | `lines/accountmanager/wat_is_uw_merkpersoonlijkheid_2c829bb8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #26 |
| 27 | Keuzegesprekken | Accountmanager (Zubenelgenubi) | `lines/accountmanager/wilt_u_een_chatbot_a0037fb0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #27 |
| 28 | Keuzegesprekken | Accountmanager (Zubenelgenubi) | `lines/accountmanager/en_hoe_lang_bestaat_uw_bedrijf_1d31a83a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #28 |
| 29 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_accountmanager_belt_een_colle_22463d3f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #29 |
| 30 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_accountmanager_belt_een_colle_0c73e412.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #30 |
| 31 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/hij_loopt_twee_stappen_achter_je_e2090ad3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #31 |
| 32 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/hij_loopt_twee_stappen_achter_je_f652e476.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #32 |
| 33 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/drie_camera_s_in_de_gang_wacht_t_1987446b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #33 |
| 34 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/drie_camera_s_in_de_gang_wacht_t_c8e2d3f1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #34 |
| 35 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/het_logboek_van_12_augustus_blij_86b32ed7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #35 |
| 36 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/het_logboek_van_12_augustus_blij_4d89f6cc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #36 |
| 37 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/tessa_heeft_het_logboek_geprint__d999167b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #37 |
| 38 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/het_perron_in_veendam_de_machini_313015c0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #38 |
| 39 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/het_perron_in_veendam_de_machini_0769a2f2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #39 |
| 40 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_trein_staat_stil_de_machinist_aa5be044.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #40 |
| 41 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_trein_staat_stil_de_machinist_0922bc74.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #41 |
| 42 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/instappen_met_e_bij_de_kop_w_is__88265648.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #42 |
| 43 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/instappen_met_e_bij_de_kop_w_is__097291eb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #43 |
| 44 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/vesting_bourtange_fakkels_een_gr_5a320fa1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #44 |
| 45 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/vesting_bourtange_fakkels_een_gr_1fd359cd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #45 |
| 46 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/het_beleg_begint_berend_is_de_bi_d17a7d8f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #46 |
| 47 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/het_beleg_begint_berend_is_de_bi_983218f1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #47 |
| 48 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/blijf_op_de_wal_staan_de_kartonn_6715d693.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #48 |
| 49 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/blijf_op_de_wal_staan_de_kartonn_bb304e97.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #49 |
| 50 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/het_leger_van_de_bisschop_komt_a_3df1c6c4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #50 |
| 51 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/het_leger_van_de_bisschop_komt_a_5c18047f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #51 |
| 52 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/blijf_op_de_noordwal_staan_tot_h_4b4f7d1a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #52 |
| 53 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/blijf_op_de_noordwal_staan_tot_h_c4513247.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #53 |
| 54 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/durk_en_douwe_houden_je_bezig_na_34ed86d4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #54 |
| 55 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/durk_en_douwe_houden_je_bezig_na_1f297e34.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #55 |
| 56 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/durk_en_douwe_springen_mee_aanlo_12c36149.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #56 |
| 57 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/durk_en_douwe_springen_mee_aanlo_ea108637.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #57 |
| 58 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/mem_en_oma_trijntje_zitten_in_de_f06b7018.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #58 |
| 59 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/mem_en_oma_trijntje_zitten_in_de_b9e248a6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #59 |
| 60 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/houd_de_deur_van_de_kruitkelder__c4aaa50f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #60 |
| 61 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/houd_de_deur_van_de_kruitkelder__cc44a6c6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #61 |
| 62 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_tweede_deur_geeft_mee_rennen_c1608fb9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #62 |
| 63 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_tweede_deur_geeft_mee_rennen_8750afb8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #63 |
| 64 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/houd_ook_de_tweede_deur_daarna_d_c0796402.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #64 |
| 65 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/houd_ook_de_tweede_deur_daarna_d_a921c676.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #65 |
| 66 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_derde_deur_de_bal_blijft_hier_5c29331b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #66 |
| 67 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_derde_deur_de_bal_blijft_hier_256b1e2b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #67 |
| 68 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_laatste_deur_daarna_naar_de_p_51cf9b30.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #68 |
| 69 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_laatste_deur_daarna_naar_de_p_c7e152c7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #69 |
| 70 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/links_is_vrij_naar_de_poort_bere_bf9402a5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #70 |
| 71 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/links_is_vrij_naar_de_poort_bere_2916f3a9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #71 |
| 72 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_naspeling_is_klaar_blijf_even_f1dc5452.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #72 |
| 73 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_naspeling_is_klaar_blijf_even_c59705d5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #73 |
| 74 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_kras_van_de_wagon_zit_op_de_e_947f02ce.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #74 |
| 75 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_kras_van_de_wagon_zit_op_de_e_57099ad9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #75 |
| 76 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/mems_appje_de_trein_met_de_rode__47a5cae7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #76 |
| 77 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/mems_appje_de_trein_met_de_rode__03403f60.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #77 |
| 78 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_trein_rijdt_druk_op_spatie_om_e87508db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #78 |
| 79 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_trein_rijdt_druk_op_spatie_om_2d4f0e71.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #79 |
| 80 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/jelles_mannen_staan_op_de_wagon__7c76ec5e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #80 |
| 81 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/jelles_mannen_staan_op_de_wagon__0f9ae746.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #81 |
| 82 | Keuzegesprekken | Jelle Terpstra (Fenrir) | `lines/jelle_terpstra/u_kunt_de_auto_redden_of_de_bal__4c61688a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #82 |
| 83 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/oma_heeft_alle_vrienden_met_hun__9e75fa96.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #83 |
| 84 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/oma_heeft_alle_vrienden_met_hun__528b3c1d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #84 |
| 85 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/blijf_bij_de_wagen_henk_bouwt_he_23021a92.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #85 |
| 86 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/blijf_bij_de_wagen_henk_bouwt_he_ab31ccde.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #86 |
| 87 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/henk_zaagt_een_gat_in_de_zijkant_6eeaa325.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #87 |
| 88 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/henk_zaagt_een_gat_in_de_zijkant_573b88df.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #88 |
| 89 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/instappen_tinus_wijst_naar_het_w_e086fa47.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #89 |
| 90 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/instappen_tinus_wijst_naar_het_w_f2bed051.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #90 |
| 91 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/gas_sturen_niet_vastlopen_henk_w_1ad93cad.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #91 |
| 92 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/gas_sturen_niet_vastlopen_henk_w_2c595403.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #92 |
| 93 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/houd_de_snelheid_erin_in_de_modd_37cff950.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #93 |
| 94 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/houd_de_snelheid_erin_in_de_modd_7c1d2904.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #94 |
| 95 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/rij_hem_de_modder_in_als_de_acht_feed3d3d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #95 |
| 96 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/rij_hem_de_modder_in_als_de_acht_149308d5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #96 |
| 97 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/vast_tinus_haakt_de_trekker_aan__1c10146f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #97 |
| 98 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/vast_tinus_haakt_de_trekker_aan__7b1fee60.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #98 |
| 99 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/rij_voorop_de_colonne_volgt_zola_91ac2b9b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #99 |
| 100 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/rij_voorop_de_colonne_volgt_zola_5ebadc50.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #100 |
| 101 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/ee_n_vriend_rijdt_vlak_naast_jul_7596b732.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #101 |
| 102 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/ee_n_vriend_rijdt_vlak_naast_jul_d2c7de23.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #102 |
| 103 | Keuzegesprekken | Anita (Callirrhoe) | `lines/anita/alle_vrienden_rijden_mee_maar_e__65994f51.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #103 |
| 104 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/instappen_tessa_zei_wij_voorop_010388aa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #104 |
| 105 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/rij_voorop_naar_aduard_wie_te_ve_b6a4af07.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #105 |
| 106 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/rij_voorop_naar_aduard_wie_te_ve_fde26a4b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #106 |
| 107 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/wubbo_opent_de_brug_op_afstand_m_6ac8b600.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #107 |
| 108 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/wubbo_opent_de_brug_op_afstand_m_fd276ec5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #108 |
| 109 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/nog_vijf_kilometer_de_hele_colon_3f1e45dc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #109 |
| 110 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/nog_vijf_kilometer_de_hele_colon_083b1d83.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #110 |
| 111 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/bak_in_oma_s_keuken_ei_zout_grof_8245aa8b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #111 |
| 112 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/bak_in_oma_s_keuken_ei_zout_grof_f29c248d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #112 |
| 113 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/oma_s_volgorde_eerst_het_ei_dan__ec64947f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #113 |
| 114 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/oma_s_volgorde_eerst_het_ei_dan__ac2e806f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #114 |
| 115 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/kwart_voor_drie_de_limo_rijdt_na_964ada11.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #115 |
| 116 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/kwart_voor_drie_de_limo_rijdt_na_a46268a8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #116 |
| 117 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/oma_s_volgorde_ei_zout_grof_meel_f0d16170.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #117 |
| 118 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/oma_s_volgorde_ei_zout_grof_meel_a14dbbd9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #118 |
| 119 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/kwart_voor_drie_instappen_de_lim_49ac03e7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #119 |
| 120 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/kwart_voor_drie_instappen_de_lim_e776dbd1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #120 |
| 121 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/berend_proeft_voor_het_laatst_ze_62b01348.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #121 |
| 122 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/berend_proeft_voor_het_laatst_ze_2c906a7a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #122 |
| 123 | Keuzegesprekken | Berend Bos (Charon) | `lines/berend_bos/wat_maakt_deze_eierbal_gronings__e0a308e6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #123 |
| 124 | Keuzegesprekken | Berend Bos (Charon) | `lines/berend_bos/en_waarom_moet_de_standplaats_na_cb573f08.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #124 |
| 125 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/willemiens_huis_in_loppersum_boe_f98990b9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #125 |
| 126 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/willemiens_huis_in_loppersum_boe_c2e58fec.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #126 |
| 127 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/boeken_in_kleine_dozen_blijf_bij_fdc6386a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #127 |
| 128 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/boeken_in_kleine_dozen_blijf_bij_63e22e0e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #128 |
| 129 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/breekbaar_in_de_krant_blijf_in_d_7f7b7f24.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #129 |
| 130 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/breekbaar_in_de_krant_blijf_in_d_efaa96a3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #130 |
| 131 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_kat_wil_nergens_in_blijf_bij__68e4842a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #131 |
| 132 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_kat_wil_nergens_in_blijf_bij__92e13d56.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #132 |
| 133 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_dozen_staan_klaar_naar_de_ver_bac6a78e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #133 |
| 134 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_dozen_staan_klaar_naar_de_ver_596f56a7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #134 |
| 135 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_verhuisbus_staat_voor_het_hui_1a6213e6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #135 |
| 136 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_verhuisbus_staat_voor_het_hui_c10d0560.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #136 |
| 137 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/instappen_tammo_rijdt_rustig_7b1e92a9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #137 |
| 138 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/rustig_rijden_niet_om_de_spullen_39698032.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #138 |
| 139 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/rustig_rijden_niet_om_de_spullen_8234dbba.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #139 |
| 140 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/een_buurtfeest_op_het_erf_in_lop_2616ebd4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #140 |
| 141 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/een_buurtfeest_op_het_erf_in_lop_50020713.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #141 |
| 142 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/tafels_op_het_erf_blijf_staan_to_c000632a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #142 |
| 143 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/tafels_op_het_erf_blijf_staan_to_aa717e1c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #143 |
| 144 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_foto_hangt_in_de_gang_waar_je_e13e3c7c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #144 |
| 145 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_foto_hangt_in_de_gang_waar_je_8d7e09ba.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #145 |
| 146 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/een_hooiberg_op_de_heide_ten_noo_1080b90b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #146 |
| 147 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/een_hooiberg_op_de_heide_ten_noo_a6ef2d47.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #147 |
| 148 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/aanvallen_eerst_de_gracht_lammer_21ccc193.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #148 |
| 149 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/aanvallen_eerst_de_gracht_lammer_9d72285e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #149 |
| 150 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/wubbo_staat_bij_de_lier_hij_open_70d8aa4a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #150 |
| 151 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/wubbo_staat_bij_de_lier_hij_open_60e1ea73.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #151 |
| 152 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/boven_jullie_komt_meel_hoofd_oml_05122999.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #152 |
| 153 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/boven_jullie_komt_meel_hoofd_oml_dc71c330.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #153 |
| 154 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/blijf_op_het_bolwerk_staan_tot_d_91f0e960.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #154 |
| 155 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/blijf_op_het_bolwerk_staan_tot_d_0b423f46.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #155 |
| 156 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/het_tweede_bolwerk_de_duiven_lui_4209ae51.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #156 |
| 157 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/het_derde_bolwerk_tinus_trekt_de_6d7ab59c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #157 |
| 158 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/het_derde_bolwerk_tinus_trekt_de_95651283.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #158 |
| 159 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/blijf_op_het_bolwerk_staan_tot_d_23d6f271.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #159 |
| 160 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/blijf_op_het_bolwerk_staan_tot_d_9a253293.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #160 |
| 161 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/drie_vlaggen_naar_de_poort_beren_1a9344a6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #161 |
| 162 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/drie_vlaggen_naar_de_poort_beren_a868d1cf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #162 |
| 163 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_fjord_frituur_staat_open_iede_92a6524e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #163 |
| 164 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_fjord_frituur_staat_open_iede_522b54ea.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #164 |
| 165 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_rij_staat_binnen_achter_de_gl_bb1d8947.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #165 |
| 166 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_rij_staat_binnen_achter_de_gl_0743bdf5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #166 |
| 167 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/blijf_in_de_rij_staan_tot_4117_w_679bfc91.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #167 |
| 168 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/blijf_in_de_rij_staan_tot_4117_w_830e2386.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #168 |
| 169 | Keuzegesprekken | Loketbediende (Autonoe) | `lines/loketbediende/welk_formulier_had_u_nodig_7c955923.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #169 |
| 170 | Keuzegesprekken | Loketbediende (Autonoe) | `lines/loketbediende/en_waar_haalt_u_de_stempel_0834d0ca.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #170 |
| 171 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/alles_bij_elkaar_nu_inschrijven__c1c11d35.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #171 |
| 172 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/alles_bij_elkaar_nu_inschrijven__8d8ac02a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #172 |
| 173 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/eerst_de_grote_markt_vijftienhon_424120cf.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #173 |
| 174 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/eerst_de_grote_markt_vijftienhon_affd2864.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #174 |
| 175 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/in_de_kooi_van_de_kraan_lammert__1683774a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #175 |
| 176 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/in_de_kooi_van_de_kraan_lammert__2c8123c9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #176 |
| 177 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/van_boven_zag_je_hem_de_blauwe_n_f4086149.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #177 |
| 178 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/van_boven_zag_je_hem_de_blauwe_n_ff7df391.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #178 |
| 179 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/papieren_eruit_papieren_erin_eve_b99da06f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #179 |
| 180 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/papieren_eruit_papieren_erin_eve_b9751011.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #180 |
| 181 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/klaar_terug_naar_de_kade_voor_he_0e3246ab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #181 |
| 182 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/klaar_terug_naar_de_kade_voor_he_52a29308.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #182 |
| 183 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/de_auto_blijft_bij_de_sluis_lamm_2a083678.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #183 |
| 184 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/de_auto_blijft_bij_de_sluis_lamm_447f169f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #184 |
| 185 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/instappen_de_trekker_limo_van_je_d9cbd146.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #185 |
| 186 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/instappen_de_trekker_limo_van_je_80c774db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #186 |
| 187 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/naar_de_sluis_van_delfzijl_over__24b97c12.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #187 |
| 188 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/naar_de_sluis_van_delfzijl_over__f2ecbc57.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #188 |
| 189 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/roelfiens_rode_gewasspuiter_staa_e9f47e39.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #189 |
| 190 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/opstijgen_en_laag_over_het_graan_5ebb9c06.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #190 |
| 191 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/opstijgen_en_laag_over_het_graan_4b4f21a9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #191 |
| 192 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/spandoek_opgepikt_laag_blijven_n_028b69f4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #192 |
| 193 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/spandoek_opgepikt_laag_blijven_n_d71247b8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #193 |
| 194 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/ze_lezen_het_door_de_rij_kramen_3b76a234.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #194 |
| 195 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/ze_lezen_het_door_de_rij_kramen_6143a3f3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #195 |
| 196 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/voorbij_de_kermis_nu_terug_naar__959c5f21.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #196 |
| 197 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/voorbij_de_kermis_nu_terug_naar__89cd0799.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #197 |
| 198 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/terug_naar_de_strook_gas_terug_m_4167ca05.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #198 |
| 199 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/terug_naar_de_strook_gas_terug_m_7053dbe9.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #199 |
| 200 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/podium_in_de_kiezelrace_dan_vert_48887f24.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #200 |
| 201 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/podium_in_de_kiezelrace_dan_vert_1d8eb0c2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #201 |
| 202 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/instappen_de_tankwagen_staat_bij_ce5b97f5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #202 |
| 203 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/instappen_de_tankwagen_staat_bij_325c65a4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #203 |
| 204 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/instappen_bij_dijkstra_spatie_om_64a6e3c8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #204 |
| 205 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/instappen_bij_dijkstra_spatie_om_101e075b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #205 |
| 206 | Hints (Tammo/Tessa) | Tammo (Orus) | `hints/tammo/loop_langs_drie_tenten_en_drink__8059ba59.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #206 |
| 207 | Hints (Tammo/Tessa) | Anita (Callirrhoe) | `hints/anita/loop_langs_drie_tenten_en_drink__0f02c918.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #207 |
| 208 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/die_pan_staat_hier_al_sinds_gist_0c3ca9ea.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #208 |
| 209 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dat_is_een_pan_met_een_verhaal_b4ad0266.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #209 |
| 210 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/het_verhaal_heet_wie_wast_hem_af_1e74667c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #210 |
| 211 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_morgen_06f3414d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #211 |
| 212 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/wie_neemt_de_badkamer_als_eerste_336b767f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #212 |
| 213 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ik_ik_sta_er_al_drie_minuten_voo_e8f17e9b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #213 |
| 214 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/je_zit_hier_aan_tafel_fea6e5c5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #214 |
| 215 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/in_gedachten_cd1938da.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #215 |
| 216 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/wie_heeft_mijn_yoghurt_opgegeten_bbae9fba.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #216 |
| 217 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/er_stond_geen_naam_op_b7efcbb8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #217 |
| 218 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/er_stond_tessa_op_b9de03ab.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #218 |
| 219 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_las_dat_als_een_suggestie_94c081ce.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #219 |
| 220 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/koffie_f36dc5b3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #220 |
| 221 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ja_eh_nee_ja_c9337043.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #221 |
| 222 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_zet_er_twee_neer_dan_kies_jij_841b8af1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #222 |
| 223 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_is_eigenlijk_heel_redelijk_90a24600.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #223 |
| 224 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ik_heb_een_schoonmaakrooster_gem_a2c5009f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #224 |
| 225 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_zie_mijn_naam_zeven_keer_4c93519f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #225 |
| 226 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ik_zie_jouw_pan_zeven_keer_f860a899.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #226 |
| 227 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dat_is_een_eerlijke_ruil_538fc4bb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #227 |
| 228 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/je_wekker_ging_om_zes_uur_af_b3a0faa4.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #228 |
| 229 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_weet_ik_ik_leg_hem_ver_weg_15c690f5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #229 |
| 230 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dat_wist_de_hele_flat_nu_ook_036f0bde.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #230 |
| 231 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dan_zijn_we_eerlijk_tegen_elkaar_27338a29.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #231 |
| 232 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/roerei_of_spiegelei_fbb82d0d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #232 |
| 233 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/wat_wordt_het_als_jij_er_verstan_c5e35f06.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #233 |
| 234 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/roerei_dan_zie_je_niet_dat_het_m_6fa95b47.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #234 |
| 235 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ik_eet_het_toch_op_5923d272.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #235 |
| 236 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/proef_eens_f7f31f40.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #236 |
| 237 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/het_is_goed_97201844.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #237 |
| 238 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_zeg_je_altijd_1f2a3223.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #238 |
| 239 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/omdat_het_altijd_goed_is_d92e590d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #239 |
| 240 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/je_hebt_een_kruimel_op_je_kin_1e0cca39.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #240 |
| 241 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/waar_c8edf50c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #241 |
| 242 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/links_nee_jouw_links_6b2fbb5a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #242 |
| 243 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/nu_zit_hij_op_je_mouw_b7a485bc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #243 |
| 244 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/je_haar_zit_anders_644e671d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #244 |
| 245 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/het_is_dinsdag_a7479158.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #245 |
| 246 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/het_staat_je_goed_op_dinsdag_d90c71d7.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #246 |
| 247 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dank_je_eet_je_boterham_8ee2f095.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #247 |
| 248 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_heb_een_eierbal_gebakken_voor_cc47fdbb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #248 |
| 249 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/hij_is_vierkant_66cb3b09.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #249 |
| 250 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/hij_is_creatief_edae7e63.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #250 |
| 251 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ik_eet_hem_toch_op_voor_de_vrien_d412758c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #251 |
| 252 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/als_we_winnen_wat_dan_13f04b08.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #252 |
| 253 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dan_krijgt_de_frietwagen_een_nie_8a2c5b1e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #253 |
| 254 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/een_lamp_50e0b284.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #254 |
| 255 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/een_grote_zodat_jij_hem_ziet_d9bbeb81.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #255 |
| 256 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/wat_kijken_we_db231066.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #256 |
| 257 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/maakt_niet_uit_6bb74591.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #257 |
| 258 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/omdat_jij_naast_me_zit_be3522fc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #258 |
| 259 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_was_aardig_zet_maar_iets_aan_696edcd0.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #259 |
| 260 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dit_nummer_ken_ik_e32aa27a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #260 |
| 261 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dans_je_mee_8a0a7d71.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #261 |
| 262 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/in_de_keuken_5747ce43.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #262 |
| 263 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/overal_waar_jij_staat_3baa671e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #263 |
| 264 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/goedemorgen_9cc8e12a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #264 |
| 265 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/koffie_staat_klaar_027f0493.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #265 |
| 266 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/je_bent_de_beste_2f6f533c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #266 |
| 267 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/wacht_ik_moet_even_gaan_zitten_c976ceff.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #267 |
| 268 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/eerst_de_vismarkt_c7c3faaa.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #268 |
| 269 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dan_de_kade_7aff1578.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #269 |
| 270 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/en_daarna_95bcc718.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #270 |
| 271 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/daarna_iets_met_jou_08fdcd3e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #271 |
| 272 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_staat_al_op_de_lijst_b670c12b.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #272 |
| 273 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/met_melk_niet_te_veel_2d33f190.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #273 |
| 274 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/je_weet_het_nog_43472179.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #274 |
| 275 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ik_weet_alles_van_jou_cd14dfdc.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #275 |
| 276 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dat_is_veel_6de340a5.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #276 |
| 277 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/het_is_tweee_ntwintig_graden_631b8d35.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #277 |
| 278 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_zeg_je_elke_dag_439b008d.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #278 |
| 279 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/omdat_ik_het_fijn_vind_fccf497e.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #279 |
| 280 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/ik_ook_9e34229c.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #280 |
| 281 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/het_is_stil_in_de_flat_ce68a564.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #281 |
| 282 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/niemand_zoekt_ons_ac33b0eb.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #282 |
| 283 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_is_nieuw_e5b8edc6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #283 |
| 284 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_wen_eraan_f6cb9f1f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #284 |
| 285 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/roerei_zoals_jij_het_wilt_04f2dcd3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #285 |
| 286 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/zonder_dat_het_mislukt_is_4321bb33.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #286 |
| 287 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dat_was_de_oefening_43009ff6.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #287 |
| 288 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/en_dit_is_de_les_42c3b3a8.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #288 |
| 289 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/hoeveel_woorden_waren_het_ook_al_d34c455f.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #289 |
| 290 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/vijf_98324fee.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #290 |
| 291 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/zeg_ze_nog_eens_26f4f9ff.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #291 |
| 292 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/je_wast_af_2da188bd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #292 |
| 293 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_zei_toch_morgen_597766da.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #293 |
| 294 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_was_twee_weken_geleden_38580660.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #294 |
| 295 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/ik_ben_een_man_van_mijn_woord_22c2d0db.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #295 |
| 296 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/wat_doen_we_vandaag_a4252802.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #296 |
| 297 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/niks_a0b352a1.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #297 |
| 298 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/niks_is_een_goed_plan_073a6a22.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #298 |
| 299 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dan_is_het_al_gelukt_390e85a2.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #299 |
| 300 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/rikus_zegt_dat_het_zomer_blijft_f3e0692a.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #300 |
| 301 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/rikus_heeft_altijd_gelijk_0b3dddc3.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #301 |
| 302 | Terugkeer (vignetten) | Anita (Callirrhoe) | `lines/anita/dat_zegt_hij_zelf_ook_5ac623dd.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #302 |
| 303 | Terugkeer (vignetten) | Tammo (Orus) | `lines/tammo/dan_zal_het_wel_kloppen_4bcf6172.mp3` | `python3 scripts/tts_lines.py` · zie jsonl #303 |

De wachtrij heeft 303 clips (2 manifest(en): hints, lines).

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

Het issue telt 670 regels/671 clips (67 klaar + 604 wachtend, plus de laadhint van 2 clips). De huidige bronnen geven 303 regels/clips: 303 klaar + 0 wachtend. Dat verschil komt doordat `script.json`, `gronings_spoken.json` en de opnames sinds 6-11 zijn bijgewerkt; deze lijst volgt de code, niet het issue.
