# Witte ruis in het spel (melding eigenaar, 21-11, issue #1084)

Melding: "Soms hoor ik een white noise in game, had je dat al weggehaald?" Dit document is de audit van alle ruisbronnen, zegt wat er gefixt is en wat nog **beluisterd** moet worden. Niets is beluisterd door de agent: alles is uit de code gelezen of gemeten zonder Electron (`node scripts/audio/ruisbronnen_test.mjs`, `node scripts/audio/ruisachtig_scan.mjs`).

## Eerder werk (al weggehaald)

Commit 48ab4afa6 en [AUDIO-GLITCHES-21-11.md](AUDIO-GLITCHES-21-11.md) (melding Nikky): diagnoseblok Geluid, limiter, NaN-guard in de centrale parameterschrijver, DC-correctie van de procedurele bedden, een regressietest voor alle opnames en synths. Er is geen `ScriptProcessorNode`. Dat dekte clipping, gelijkspanning en NaN in de synth, maar niet: een mixer die blijft hangen na een fout, een NaN in een bed, en het ontbreken van een teller voor ruislussen.

## Alle ruisbronnen: wanneer horen ze aan en uit

| Bron | Waar | Aan | Uit | Opgeruimd door |
|---|---|---|---|---|
| Noise-bursts (schot, botsing, regen op de paraplu, sis) | `audio.js` playNoiseBurst, uit `noiseBuffer` (2 s wit, door een filter) | per gebeurtenis, 0,01 tot 1,7 s | gain-ramp naar 0,0001 en `stop()` na `duration + 0,03` | `onended` ruimt de nodes op en telt `activeVoices` terug. **Gat gevonden:** een NaN of Infinity in een parameter gooide na het tellen, de teller bleef staan. Nu geweigerd en gemeld |
| Motor en weg (banden, wind, nat, water, gras, vrijloop) | AudioWorklet `gde-engine` (`sfx/engineworklet.js`, RoadVoice) | rijdend; nat = sis boven 2,2 kHz bij regen | `T.gain` naar 0 buiten een voertuig, bij pauze, in een vliegtuig met opnames | worklet zet zichzelf op nul bij NaN en bouwt de stem opnieuw |
| Helikoptersynth (verkeer) | `audio/vehiclevoices.js` buildHeliVoice, `noiseBuffer` als lus | `world.policeHeli` | gain 0 | nu bewaakt: staat de gain open terwijl er geen politieheli is, dan dicht na twee controles (4 s) |
| Schuren, bandenpiep-synth, rommel | `audio/vehiclevoices.js`, `noiseBuffer` als lus | contact, slip, rijden | gain naar 0 | bewaakt zoals de heli |
| Helikopter en burner (sky.js) | `sfx/sky.js`, bruinruis | rotor draait | gain naar 0, voice blijft als nodes bestaan | niet aangepast; de gain gaat naar 0 |
| Ambience-bedden: wind, regen (licht, bui, plens, auto, dak), stad, kust, polder, riet, industrie, menigte, terras, krekels, kikkers | `sfx/ambience.js` driveBeds, buffers uit `sfx/dsp.js` of opnames | `target` > 0,002 | na 4 s onder 0,0015 `stop()` | **Gat gevonden:** een NaN-doel of NaN-niveau bleef in `b.level` hangen, `setTargetAtTime(NaN)` gooide, het bed ging nooit meer uit. Nu afgevangen en geteld als lus onder `bed:<naam>` |
| Motorlaag, ritmotor, bandpiep- en drift-lussen | `audio.js` | rijdend of slippend | gain naar 0 en `stop()` | nu geteld (`motorlaag`, `ritmotor`, `bandpiep`, `banddrift`) |
| Radio en G-Music | `audio/radio.js`, mp3 via media-element | zender aan | pauze bij menu, watchdog | geen eigen statica of ruisgenerator: `grep static` vindt niets |
| Scenariomuziek | `audio/scenario.js`, één gedecodeerde track | scenario | fade en `evictScenarioBuffers` | niet aangepast |
| Spraak, nieuws, NPC en politieclips | mp3 per clip | per regel | clip eindigt | zie de scan hierboven (ruisstaarten) |
| Microfoon, WebRTC-voicechat | niet aanwezig (komt later, #451) | | | `grep getUserMedia`: geen treffers |

## Wat er mis kon gaan en nu gefixt is

1. **Een mixer die gooit, houdt alles erna op de laatste stand.** `updateWorldMixers` riep engine, squeal, rumble, scrape, ambience, foley, sky en UI achter elkaar aan in één `guarded`. Gooit één (een NaN in een AudioParam), dan werd elke volgende mixer overgeslagen, elk beeld opnieuw: het regenbed, de wind, de schuurstem bleven op hun laatste gain staan. Nu staat elke mixer in zijn eigen `guarded`.
2. **NaN in een bed.** Zie de tabel. Een plaatsmeting die één keer NaN geeft vergiftigde het bed voor de rest van de sessie.
3. **NaN in een noise-burst.** Zie de tabel (teller `activeVoices` bleef hangen, uiteindelijk stilte, geen ruis, maar wel een stem minder).
4. **Een doorlopende ruisstem die dicht moet maar open staat.** Een vangnet: `audio/ruisbronnen.js` bewaakt de vier synthruisstemmen. Meer dan 4 s open terwijl de bron uit hoort te zijn: dichtgezet, geteld, gemeld in de technische info (regel "Ruis die bleef hangen") en in het watchdoglogboek (`ruis-vast:<naam>`).
5. **Stapelende lussen.** Een lus die er twee tegelijk heeft terwijl er één bedoeld is, wordt als "te veel tegelijk" geteld (`bed:*` max 1, motorlaag en ritmotor max 2, bandpiep en banddrift max 2). Geen stapeling gevonden in de code; de teller is er om het in een echte sessie te zien.

## Technische info (Ctrl+Shift+G, blok Geluid)

Nieuw: "Ruisbronnen (lussen)": aantal levende ruislussen met hun namen, en "Ruis die bleef hangen": hoe vaak er een stem is dichtgezet, hoe vaak er te veel tegelijk klonk, en de laatste melding. Een speler die witte ruis hoort kan dit blok meesturen: staat daar een lus die niet bij de plek hoort, dan weten we de bron.

## Scan van alle clips

`node scripts/audio/ruisachtig_scan.mjs --paneel` decodeert elke clip (ffmpeg, 22,05 kHz mono) en meet per frame van 1024 monsters de spectrale vlakheid (1 = witte ruis), de nulkruisingsgraad en de toonhoogte (autocorrelatie). Een frame is ruisachtig als het hoorbaar is, vlak en zonder toonhoogte. Spraak en muziek zijn verdacht bij meer dan 60 procent ruisframes of een ruisstaart van minstens 8 frames (0,37 s). Bij de effecten (sfx) zijn ruisachtige clips juist normaal (regen, wind, sis): daar is de lijst alleen informatie. De uitkomst en het luisterpaneel: zie "Uitkomst van de scan" onderaan.

## Wat de agent niet kon

- Niets beluisterd, geen Electron-run, geen echte uitvoer. De aansluiting in `audio.js` is gecontroleerd met `node --check`, de bestaande audiotests en de nieuwe bronnentest, niet in een draaiend spel. Nog niet bekeken.
- De regenhiss van de wegvoice (`wetAmp`, hoogdoorlaat 2,2 kHz, tot 0,14 maal de wegvoicegain) is witte ruis op bedoeling bij regen op een rijdend voertuig. Als dat de "white noise" is, is het niet kapot maar te hard of te vlak: dat kan alleen de eigenaar horen.
- Een stem die per ongeluk wel in een van de bewaakte stemmen zit maar niet bij `verwacht` hoort, wordt na 4 s dichtgezet: kloppen de verwachtingen niet, dan hoor je een stem wegvallen. Ze zijn conservatief gekozen (heli: alleen `policeHeli`; schuren: tot 1,5 s na het laatste contact).

## Wat de eigenaar zelf moet beluisteren

1. Het luisterpaneel [WITTE-RUIS-LUISTER.html](WITTE-RUIS-LUISTER.html) (open het in een browser vanuit de map docs): de verdachte spraak- en muziekclips en de ruisachtigste effecten. Hoor je daar sissen zonder stem, noteer de bestandsnaam.
2. In het spel: rijden in de regen (de wegsis), een boot stilstaand, de politieheli die weggaat, schuren langs een muur, de overgang van menu naar spel. Staat de witte ruis er nog, open dan Ctrl+Shift+G en kijk bij "Ruisbronnen (lussen)" welke lus levend is en bij "Ruis die bleef hangen" of er iets is dichtgezet.
3. `?geenlimiter` (zie AUDIO-GLITCHES-21-11.md) om de limiter als oorzaak uit te sluiten.

## Uitkomst van de scan

Gemeten op 21-11: 4.193 spraak-, nieuws-, NPC- en politieclips, 150 effecten en 63 muziek- en scenariotracks (de eerste 40 s per bestand).

- **Spraak, eerste scan (ruisframes en ruisstaart): 0 verdacht, en dat was fout.** De eigenaar hoorde daarna toch witte ruis aan het einde van spraakclips. Het patroon is geen ruisstaart maar een korte harde burst (zie "Ruis-einde en pop-begin" hieronder); de eerste scan zocht naar ruis over meerdere frames en miste hem.
- **Muziek: 0 verdacht.** Hoogste is `scenario/Redline_Ascent.mp3` met 0,10.
- **Effecten: 1 boven de grens, en dat is bedoeld:** `sfx/stap_gras_2.ogg` is een voetstap op gras van 0,3 s (grasritsel is ruis). Verder `hydrauliek_sis`, `ei_breuk_1`, `stap_wet_*`, `plons_groot`: alles waar ruis bij hoort.
- Er is dus **geen opname gevonden die als witte ruis fout is**; er is niets aan clips aangepast. De drempels zijn niet gekalibreerd op een bekende foute clip (die is er niet): een ruisstaart onder 0,37 s of een zachte sis in een lange clip valt buiten de scan. Het luisterpaneel toont daarom altijd de ruisachtigste clips per groep, ook onder de grens: [WITTE-RUIS-LUISTER.html](WITTE-RUIS-LUISTER.html) (40 per groep), de ruwe lijst staat in `witte-ruis-scan.json`.

Conclusie: **de witte ruis zit (ook) in de spraakclips**: 90 clips hebben een ruis-einde (zie hieronder). De procedurele bronnen (wegsis bij regen, bedden) en het uitvoerapparaat blijven kandidaten voor wat daarna nog overblijft.

## Ruis-einde in spraakclips (gemeld door de eigenaar)

<!-- RAPPORT-BEGIN (gegenereerd door scripts/audio/witte_ruis_rapport.mjs; niet met de hand bewerken) -->

**Ruis-einde en pop-begin:** 134 van 4193 spraakclips hebben een van beide of beide (hoog = beide: 86; midden = een van beide: 48); 24 clips staan er ter controle bij (ruisaandeel 8 procent of meer, zonder een van beide).

Per stem (alleen ruis-einde): Anita 63, Tammo 27, Geesje 18, Rikus 9, ~f 4, Rotor Roelf 2, ~m 2, Berend Bos 2, Douwe 1, Handhaver Ria 1, Accountmanager 1, Dokter Dijkstra 1, Duivenmelker Bert 1, Tammo (gids) 1, Wubbo 1.

Per map: lines 87, hints 27, banter 15, anita 2, story 2, jobs 1.

Gerangschikt: ernst, bestand, sleutel (Stem|tekst), stem, duur, het ruis-einde. Het volledige rijtje met bronbestanden (manifest en tts.json) en TTS-stem staat in `witte-ruis-scan.json` onder `bronnen`; het luisterpaneel is [WITTE-RUIS-LUISTER-VERDACHT.html](WITTE-RUIS-LUISTER-VERDACHT.html).

| Ernst | Bestand | Sleutel | Stem | Duur | Ruis-einde | Pop-begin |
|---|---|---|---|---|---|---|
| hoog | banter/wk-oosterpark-stoep_3_a_033661.mp3 | Anita\|Twee. | Callirrhoe | 1.32 s | ja (200 ms vanaf 1.04 s) | ja (-6 dB) |
| hoog | anita/missie_gelukt_v2.wav | Anita\|Die is weer af! | Callirrhoe | 1.68 s | ja (180 ms vanaf 1.4 s) | ja (-6.3 dB) |
| hoog | lines/anita/alleen_75b2d578.mp3 | Anita\|Alleen? | Callirrhoe | 1.41 s | ja (200 ms vanaf 1.12 s) | ja (-6.3 dB) |
| hoog | lines/anita/jij_stuurt_ik_zeg_wanneer_f6514353.mp3 | Anita\|Jij stuurt, ik zeg wanneer. | Callirrhoe | 2.48 s | ja (180 ms vanaf 2.2 s) | ja (-5.8 dB) |
| hoog | lines/anita/dat_weet_je_gewoon_27acfb05.mp3 | Anita\|Dat weet je gewoon. | Callirrhoe | 1.92 s | ja (200 ms vanaf 1.64 s) | ja (-7.6 dB) |
| hoog | anita/missie_gelukt_v1.wav | Anita\|Nou, dat is geregeld! | Callirrhoe | 2.04 s | ja (180 ms vanaf 1.76 s) | ja (-6.9 dB) |
| hoog | story/m2/intro_4_anita.mp3 | Anita\|Van het studeren? | Callirrhoe | 1.8 s | ja (200 ms vanaf 1.52 s) | ja (-7.5 dB) |
| hoog | lines/geesje/dan_koopt_u_een_eierkoek_b46628c6.mp3 | Geesje\|Dan koopt u een eierkoek. | Pulcherrima | 2.34 s | ja (200 ms vanaf 2.06 s) | ja (-6 dB) |
| hoog | lines/anita/wat_8e0c039a.mp3 | Anita\|Wat? | Callirrhoe | 1.41 s | ja (200 ms vanaf 1.12 s) | ja (-6.8 dB) |
| hoog | lines/anita/dat_is_geen_noodgeval_efbed5f9.mp3 | Anita\|Dat is geen noodgeval. | Callirrhoe | 2.41 s | ja (200 ms vanaf 2.12 s) | ja (-5.8 dB) |
| hoog | lines/anita/mijn_vriend_de_duivenkoning_1b952b25.mp3 | Anita\|Mijn vriend de duivenkoning. | Callirrhoe | 2.48 s | ja (180 ms vanaf 2.2 s) | ja (-5.5 dB) |
| hoog | lines/anita/het_is_een_gronings_bedrijf_0a7e0ead.mp3 | Anita\|Het is een Gronings bedrijf. | Callirrhoe | 2.12 s | ja (180 ms vanaf 1.84 s) | ja (-8.1 dB) |
| hoog | story/m2/intro_2_anita.mp3 | Anita\|Tammo heeft hier nog gestudeerd. Twee weken. | Callirrhoe | 3.34 s | ja (180 ms vanaf 3.06 s) | ja (-2.3 dB) |
| hoog | banter/h2-pass-weigering_4_a_121f2b.mp3 | Anita\|…Je mag nee zeggen. | Callirrhoe | 1.84 s | ja (200 ms vanaf 1.56 s) | ja (-7.6 dB) |
| hoog | lines/anita/je_praatte_de_hele_tijd_aan_dat__bd1ed937.mp3 | Anita\|Je praatte de hele tijd, aan dat touw. | Callirrhoe | 3.05 s | ja (220 ms vanaf 2.76 s) | ja (-3.1 dB) |
| hoog | lines/anita/dan_neem_ik_die_bij_de_koelkast_6aca03e9.mp3 | Anita\|Dan neem ik die bij de koelkast. | Callirrhoe | 2.47 s | ja (220 ms vanaf 2.18 s) | ja (-5.4 dB) |
| hoog | lines/anita/een_oefenbal_hij_oefent_hoe_hij__92a52b03.mp3 | Anita\|Een oefenbal. Hij oefent hoe hij hem aan zijn moeder geeft. | Callirrhoe | 4.4 s | ja (180 ms vanaf 4.12 s) | ja (-2.9 dB) |
| hoog | lines/geesje/weer_eieren_de_kippen_sturen_een_7286c593.mp3 | Geesje\|Weer eieren? De kippen sturen een kaartje. | Pulcherrima | 3.72 s | ja (200 ms vanaf 3.42 s) | ja (-2.6 dB) |
| hoog | lines/rikus/weer_een_stukje_grunn_dat_je_nu__353b4c36.mp3 | Rikus\|Weer een stukje Grunn dat je nu kent. | Schedar | 2.62 s | ja (220 ms vanaf 2.32 s) | ja (-4.6 dB) |
| hoog | lines/geesje/een_limo_past_niet_in_een_steegj_b65487a0.mp3 | Geesje\|Een limo past niet in een steegje, jong. | Pulcherrima | 3.81 s | ja (220 ms vanaf 3.52 s) | ja (-2.4 dB) |
| hoog | lines/geesje/de_kratten_staan_heel_dat_is_een_d111d030.mp3 | Geesje\|De kratten staan heel. Dat is een kerkelijk wonder. | Pulcherrima | 3.54 s | ja (200 ms vanaf 3.24 s) | ja (-2.4 dB) |
| hoog | lines/anita/het_museum_de_gouden_eierbal_70526a93.mp3 | Anita\|Het museum. De Gouden Eierbal. | Callirrhoe | 3.04 s | ja (200 ms vanaf 2.76 s) | ja (-5.6 dB) |
| hoog | lines/anita/goud_tammo_van_berend_is_dat_een_45a474d5.mp3 | Anita\|Goud, Tammo. Van Berend is dat een medaille. | Callirrhoe | 3.94 s | ja (180 ms vanaf 3.66 s) | ja (-3.5 dB) |
| hoog | lines/anita/iedereen_is_romantischer_dan_jij_d4d4b30b.mp3 | Anita\|Iedereen is romantischer dan jij. | Callirrhoe | 2.99 s | ja (200 ms vanaf 2.7 s) | ja (-7 dB) |
| hoog | lines/anita/ik_vraag_het_tammo_wil_je_hangen_e3cbabd0.mp3 | Anita\|Ik vraag het, Tammo. Wil je hangen? | Callirrhoe | 2.69 s | ja (200 ms vanaf 2.4 s) | ja (-7.2 dB) |
| hoog | lines/geesje/de_trekker_staat_bij_de_schuur_h_74f1f08a.mp3 | Geesje\|De trekker staat bij de schuur. Hij trekt hard. | Pulcherrima | 3.92 s | ja (200 ms vanaf 3.62 s) | ja (-2.4 dB) |
| hoog | lines/anita/dan_kijk_jij_naar_de_plaatjes_ik_855fc1c3.mp3 | Anita\|Dan kijk jij naar de plaatjes. Ik draai. | Callirrhoe | 2.68 s | ja (200 ms vanaf 2.38 s) | ja (-6.6 dB) |
| hoog | lines/anita/er_blijft_e_e_n_schroefje_over_6df42c16.mp3 | Anita\|Er blijft één schroefje over. | Callirrhoe | 2.52 s | ja (220 ms vanaf 2.22 s) | ja (-6 dB) |
| hoog | lines/anita/hij_heeft_mijn_pas_hij_heeft_mij_cdca4be2.mp3 | Anita\|Hij heeft mijn pas. Hij heeft mijn pas en hij… | Callirrhoe | 3.49 s | ja (200 ms vanaf 3.2 s) | ja (-2.7 dB) |
| hoog | lines/anita/zonder_krassen_want_het_is_beren_d45e6d6f.mp3 | Anita\|Zonder krassen, want het is Berends bakkie. | Callirrhoe | 3.37 s | ja (200 ms vanaf 3.08 s) | ja (-4.4 dB) |
| hoog | lines/anita/jij_zei_dat_de_zee_achter_de_dij_727756f5.mp3 | Anita\|Jij zei dat de zee achter de dijk lag. Ik heb het twintig jaar geloofd. | Callirrhoe | 4.86 s | ja (200 ms vanaf 4.56 s) | ja (-2.8 dB) |
| hoog | hints/anita/de_trekker_staat_bij_de_schuur_i_3476d507.mp3 | Anita\|De trekker staat bij de schuur. Instappen, de kratten staan achterop. | Callirrhoe | 4.09 s | ja (200 ms vanaf 3.8 s) | ja (-2.5 dB) |
| hoog | hints/tammo/de_trekker_staat_bij_de_schuur_i_9fc0de96.mp3 | Tammo\|De trekker staat bij de schuur. Instappen, de kratten staan achterop. | Orus | 4.39 s | ja (220 ms vanaf 4.1 s) | ja (-2.5 dB) |
| hoog | lines/anita/daar_koop_je_nog_geen_halve_frie_ecce29a2.mp3 | Anita\|Daar koop je nog geen halve frietwagen van. | Callirrhoe | 3.24 s | ja (200 ms vanaf 2.96 s) | ja (-2.5 dB) |
| hoog | lines/anita/drie_camera_s_twee_bewakers_en_e_1f1c59e0.mp3 | Anita\|Drie camera's, twee bewakers, en een stroomkast achter de fietsenstalling. | Callirrhoe | 4.88 s | ja (180 ms vanaf 4.6 s) | ja (-3.8 dB) |
| hoog | hints/anita/de_quad_van_geesjes_neef_staat_k_e514661f.mp3 | Anita\|De quad van Geesjes neef staat klaar. Springen, Tammo, hij rijdt. | Callirrhoe | 4.47 s | ja (200 ms vanaf 4.18 s) | ja (-5.4 dB) |
| hoog | hints/tammo/halfweg_even_stil_de_kratten_zij_ab3a2ac5.mp3 | Tammo\|Halfweg. Even stil: de kratten zijn op de bulten verschoven. Achterin nog niets gebroken? | Orus | 6.69 s | ja (200 ms vanaf 6.4 s) | ja (-2.8 dB) |
| hoog | lines/anita/stap_e_e_n_niet_in_paniek_raken_2e793252.mp3 | Anita\|Stap één: niet in paniek raken. | Callirrhoe | 3.01 s | ja (200 ms vanaf 2.72 s) | ja (-2.6 dB) |
| hoog | hints/tammo/als_jelle_de_koffer_loslaat_pakk_e70a5784.mp3 | Tammo\|Als Jelle de koffer loslaat, pakken wij hem. Op de quad. Schud de limo af en haal de sloot bij Uithuizen. | Orus | 6.39 s | ja (220 ms vanaf 6.1 s) | ja (-2.4 dB) |
| hoog | lines/geesje/wie_blijft_staan_mag_breien_a771e557.mp3 | Geesje\|Wie blijft staan, mag breien. | Pulcherrima | 2.92 s | ja (200 ms vanaf 2.62 s) | ja (-5.8 dB) |
| hoog | hints/anita/door_naar_usquert_de_kerk_staat__abd2a7cc.mp3 | Anita\|Door naar Usquert. De kerk staat op de wierde, de kelder is koel. | Callirrhoe | 5 s | ja (180 ms vanaf 4.72 s) | ja (-2.2 dB) |
| hoog | lines/rotor_roelf/moi_rotor_roelf_die_heli_is_van__f8a1479b.mp3 | Rotor Roelf\|Moi! Rotor Roelf. Die heli is van mij, ik zette hem gisteren op het UMCG-dak. | Achird | 5.72 s | ja (180 ms vanaf 5.44 s) | ja (-2.6 dB) |
| hoog | hints/anita/daar_vaart_hij_het_reitdiep_af_z_b269aa6d.mp3 | Anita\|Daar vaart hij, het Reitdiep af! Zwart skûtsje, rood zeil. Ga er vlak naast varen, dan spring je aan boord. Tot de sluis, zei Klaas. | Callirrhoe | 8.74 s | ja (220 ms vanaf 8.44 s) | ja (-2.8 dB) |
| hoog | lines/geesje/dat_is_meer_dan_de_dominee_ooit__8125541c.mp3 | Geesje\|Dat is meer dan de dominee ooit haalde. | Pulcherrima | 3 s | ja (200 ms vanaf 2.7 s) | ja (-6.6 dB) |
| hoog | banter/h2-pass-weigering_0_a_902c27.mp3 | Anita\|Als iemand die bal steelt, Tammo, dan liever wij. Dan is hij tenminste nog in Stad. | Callirrhoe | 4.94 s | ja (200 ms vanaf 4.64 s) | ja (-2.9 dB) |
| hoog | lines/rotor_roelf/de_lunch_is_van_dijkstra_nait_te_863a6851.mp3 | Rotor Roelf\|De lunch is van Dijkstra. Nait tegen d'Olle Grieze aan, hè? | Achird | 3.86 s | ja (220 ms vanaf 3.58 s) | ja (-2.2 dB) |
| hoog | hints/tammo/haal_jelles_sku_tsje_in_en_sprin_cd0b8279.mp3 | Tammo\|Haal Jelles skûtsje in en spring aan boord. Daarna het zout: blijf uit het licht van de kustwacht en wees terug voor het water komt. | Orus | 8.81 s | ja (220 ms vanaf 8.52 s) | ja (-2.5 dB) |
| hoog | lines/anita/eerst_de_stunts_op_de_grote_mark_89f3ba03.mp3 | Anita\|Eerst de stunts op de Grote Markt, dan brengen we het bakkie naar Berends zus. | Callirrhoe | 4.72 s | ja (200 ms vanaf 4.44 s) | ja (-3.9 dB) |
| hoog | lines/rikus/vijf_sterren_nu_even_rustig_aan__b24ba19b.mp3 | Rikus\|Vijf sterren. Nu even rustig aan doen. | Schedar | 3.93 s | ja (220 ms vanaf 3.64 s) | ja (-2.5 dB) |
| hoog | hints/anita/halfweg_even_stil_de_kratten_zij_edd17617.mp3 | Anita\|Halfweg. Even stil: de kratten zijn op de bulten verschoven. Achterin nog niets gebroken? | Callirrhoe | 6.57 s | ja (200 ms vanaf 6.28 s) | ja (-2.2 dB) |
| hoog | lines/geesje/jullie_brengen_ze_heel_naar_de_k_7912a188.mp3 | Geesje\|Jullie brengen ze heel naar de kerkkelder in Usquert. Daar is het koel, en daar komt Jelle niet. | Pulcherrima | 6.54 s | ja (180 ms vanaf 6.26 s) | ja (-2.4 dB) |
| hoog | banter/h4-pass-tegeltje_1_a_1189ed.mp3 | Anita\|We gaan hem eerder halen dan die Fries. Daarna zien we wel. | Callirrhoe | 3.93 s | ja (200 ms vanaf 3.64 s) | ja (-2.4 dB) |
| hoog | lines/geesje/mijn_kerkvoogdij_is_gebeld_de_ke_4df0eb55.mp3 | Geesje\|Mijn kerkvoogdij is gebeld. De kerkkelder is verhuurd. Het spijt me, jong. | Pulcherrima | 5.53 s | ja (200 ms vanaf 5.24 s) | ja (-2.6 dB) |
| hoog | hints/tammo/drie_kuipen_zout_rennen_naar_de__41380aff.mp3 | Tammo\|Drie kuipen zout. Rennen naar de steiger, Klaas wacht. | Orus | 4.28 s | ja (200 ms vanaf 3.98 s) | ja (-3.9 dB) |
| hoog | hints/anita/breng_geesjes_zestig_eieren_heel_7dec031d.mp3 | Anita\|Breng Geesjes zestig eieren heel naar de kerkkelder in Usquert. Vol gas mag tot 40 km/u; rem rustig en ontwijk de gaten. | Callirrhoe | 10.28 s | ja (180 ms vanaf 10 s) | ja (-2.2 dB) |
| hoog | lines/anita/vijftig_euro_van_berend_en_honde_945aef08.mp3 | Anita\|Vijftig euro van Berend en honderdvijftig van de streamer. Dan kunnen we ons inschrijven, Tammo. | Callirrhoe | 6.48 s | ja (200 ms vanaf 6.2 s) | ja (-2.1 dB) |
| hoog | lines/anita/mijn_pas_zit_in_die_automaat_en__cbcd453b.mp3 | Anita\|Mijn pas zit in die automaat. En die automaat zit op die aanhanger. En die aanhanger is van niemand. | Callirrhoe | 7.2 s | ja (200 ms vanaf 6.92 s) | ja (-3.4 dB) |
| hoog | hints/tammo/het_zout_van_oma_ligt_bij_noordp_8755ba1a.mp3 | Tammo\|Het zout van Oma ligt bij Noordpolderzijl. Eerst de zandplaat: de wind duwt het water weg, daar wachten we. | Orus | 7.38 s | ja (200 ms vanaf 7.1 s) | ja (-2.4 dB) |
| hoog | hints/tammo/over_het_kerkenpad_door_de_kerkt_98401152.mp3 | Tammo\|Over het kerkenpad, door de kerktuin, langs de wierdepaden. De limo kan niet overal heen. | Orus | 6.12 s | ja (180 ms vanaf 5.84 s) | ja (-2.3 dB) |
| hoog | lines/anita/honderdvijftig_euro_dat_is_preci_64087414.mp3 | Anita\|Honderdvijftig euro. Dat is precies de inschrijving. Die betaal je bij het Loket, het stadsloket. | Callirrhoe | 5.48 s | ja (200 ms vanaf 5.18 s) | ja (-2.2 dB) |
| hoog | lines/geesje/jullie_zijn_van_trijntje_het_zij_50a9fdca.mp3 | Geesje\|Jullie zijn van Trijntje. Het zijn eieren, geen relikwieën. Maar ik ben kosteres, dus ik behandel ze zo. | Pulcherrima | 7.38 s | ja (200 ms vanaf 7.1 s) | ja (-2.8 dB) |
| hoog | lines/anita/zonder_bank_blijft_er_e_e_n_weg__708a9e71.mp3 | Anita\|Zonder bank blijft er één weg over: een wedstrijd. Wie wint, krijgt de enige vrije standplaats van Grunn, een plek voor een frietwagen. | Callirrhoe | 8.85 s | ja (220 ms vanaf 8.56 s) | ja (-3.3 dB) |
| hoog | lines/geesje/ik_rij_naast_jullie_op_mijn_scoo_8e1cc8b7.mp3 | Geesje\|Ik rij naast jullie, op mijn scooter. Dit is een bedevaart. Ik ken elk steegje van hier tot de Grote Markt. | Pulcherrima | 6.38 s | ja (220 ms vanaf 6.08 s) | ja (-2.2 dB) |
| hoog | hints/tammo/daar_vaart_hij_het_reitdiep_af_z_fc508ddd.mp3 | Tammo\|Daar vaart hij, het Reitdiep af! Zwart skûtsje, rood zeil. Ga er vlak naast varen, dan spring je aan boord. Tot de sluis, zei Klaas. | Orus | 9.83 s | ja (220 ms vanaf 9.54 s) | ja (-2.7 dB) |
| hoog | hints/tammo/drie_zoutkuipen_op_de_kwelder_he_0a279425.mp3 | Tammo\|Drie zoutkuipen op de kwelder. Het water komt over een kleine vier minuten. Het licht van de kustwacht gaat heen en weer: bukken (Ctrl) als het komt. | Orus | 8.1 s | ja (200 ms vanaf 7.8 s) | ja (-2.8 dB) |
| hoog | lines/geesje/ik_rij_op_mijn_scooter_een_bedev_e5adb45b.mp3 | Geesje\|Ik rij op mijn scooter. Een bedevaart op twee wielen. Hij is sneller dan hij lijkt. | Pulcherrima | 6.15 s | ja (200 ms vanaf 5.86 s) | ja (-2.6 dB) |
| hoog | lines/geesje/links_het_derde_bolwerk_ze_kijke_74714841.mp3 | Geesje\|Links. Het derde bolwerk. Ze kijken niet. Ze eten. | Pulcherrima | 5.16 s | ja (200 ms vanaf 4.88 s) | ja (-2.7 dB) |
| hoog | lines/anita/eerst_geld_meedoen_aan_die_wedst_37697d43.mp3 | Anita\|Eerst geld. Meedoen aan die wedstrijd, de Noordelijke Snackprijs, kost honderdvijftig euro, contant, uiterlijk morgen om twaalf uur. | Callirrhoe | 9.73 s | ja (200 ms vanaf 9.44 s) | ja (-2.2 dB) |
| hoog | hints/anita/klaas_zit_bovenin_en_kijkt_de_an_dc509023.mp3 | Anita\|Klaas zit bovenin en kijkt de andere kant op. Instappen, Tammo stuurt. | Callirrhoe | 5.44 s | ja (200 ms vanaf 5.14 s) | ja (-2.3 dB) |
| hoog | lines/anita/ik_ken_iemand_die_opent_wat_niem_9d6d0b5c.mp3 | Anita\|Ik ken iemand die opent wat niemand kan. Wij brengen de automaat naar hem. | Callirrhoe | 5.27 s | ja (220 ms vanaf 4.98 s) | ja (-2.4 dB) |
| hoog | hints/anita/als_jelle_de_koffer_loslaat_pakk_89b4fad8.mp3 | Anita\|Als Jelle de koffer loslaat, pakken wij hem. Op de quad. Schud de limo af en haal de sloot bij Uithuizen. | Callirrhoe | 7.12 s | ja (200 ms vanaf 6.84 s) | ja (-3 dB) |
| hoog | lines/geesje/de_steeg_bij_de_notaris_is_dicht_3cfcb1dd.mp3 | Geesje\|De steeg bij de notaris is dicht. Scooter dwars. Ik zit erop te breien. | Pulcherrima | 5.31 s | ja (200 ms vanaf 5.02 s) | ja (-2.4 dB) |
| hoog | lines/geesje/zijn_moeder_gerda_belt_trijntje__19d448d2.mp3 | Geesje\|Zijn moeder, Gerda, belt Trijntje elk jaar op haar verjaardag. Ze zeggen dan allebei niks. | Pulcherrima | 7.11 s | ja (200 ms vanaf 6.82 s) | ja (-2.5 dB) |
| hoog | hints/anita/het_zout_van_oma_ligt_bij_noordp_444b7b5b.mp3 | Anita\|Het zout van Oma ligt bij Noordpolderzijl. Eerst de zandplaat: de wind duwt het water weg, daar wachten we. | Callirrhoe | 7.29 s | ja (220 ms vanaf 7 s) | ja (-2.1 dB) |
| hoog | hints/tammo/door_naar_usquert_de_kerk_staat__0a263686.mp3 | Tammo\|Door naar Usquert. De kerk staat op de wierde, de kelder is koel. | Orus | 6.21 s | ja (200 ms vanaf 5.92 s) | ja (-2.6 dB) |
| hoog | hints/anita/de_dorpsweg_is_afgezet_via_de_wi_c7c42288.mp3 | Anita\|De Dorpsweg is afgezet. Via de wierdepaden dan: bulten en gaten. Rustig aan. | Callirrhoe | 5.89 s | ja (200 ms vanaf 5.6 s) | ja (-2.4 dB) |
| hoog | lines/anita/het_museum_daar_staat_de_gouden__de7781d9.mp3 | Anita\|Het museum. Daar staat de Gouden Eierbal, de wisselprijs van de Snackprijs. | Callirrhoe | 5.76 s | ja (200 ms vanaf 5.48 s) | ja (-2.7 dB) |
| hoog | banter/h2-pass-weigering_2_a_d89523.mp3 | Anita\|Je opa huilde bij elke voetbalwedstrijd. | Callirrhoe | 3.91 s | ja (200 ms vanaf 3.62 s) | ja (-3.2 dB) |
| hoog | lines/geesje/ze_staan_in_de_kerkkelder_jullie_fdb977fe.mp3 | Geesje\|Ze staan in de kerkkelder. Jullie komen te laat. | Pulcherrima | 4.05 s | ja (200 ms vanaf 3.76 s) | ja (-2.2 dB) |
| hoog | hints/anita/drie_kuipen_zout_rennen_naar_de__49418607.mp3 | Anita\|Drie kuipen zout. Rennen naar de steiger, Klaas wacht. | Callirrhoe | 4.24 s | ja (180 ms vanaf 3.96 s) | ja (-3.3 dB) |
| hoog | hints/tammo/de_dorpsweg_is_afgezet_via_de_wi_b5b77de8.mp3 | Tammo\|De Dorpsweg is afgezet. Via de wierdepaden dan: bulten en gaten. Rustig aan. | Orus | 6.04 s | ja (200 ms vanaf 5.74 s) | ja (-2.4 dB) |
| hoog | lines/anita/gronings_ontzet_tammo_elk_jaar_s_a2eee016.mp3 | Anita\|Gronings Ontzet, Tammo. Elk jaar spelen ze na hoe Grunn in 1672 de bisschop buiten hield. | Callirrhoe | 7.66 s | ja (200 ms vanaf 7.36 s) | ja (-2.8 dB) |
| hoog | lines/geesje/ik_zie_alles_vanaf_mijn_toren_di_55010d87.mp3 | Geesje\|Ik zie alles vanaf mijn toren. Dit is geen toren. Het is een hooiberg. Ik zie alles toch. | Pulcherrima | 6.49 s | ja (200 ms vanaf 6.2 s) | ja (-2.5 dB) |
| hoog | hints/tammo/breng_geesjes_zestig_eieren_heel_4196b08a.mp3 | Tammo\|Breng Geesjes zestig eieren heel naar de kerkkelder in Usquert. Vol gas mag tot 40 km/u; rem rustig en ontwijk de gaten. | Orus | 9.75 s | ja (220 ms vanaf 9.46 s) | ja (-7.2 dB) |
| hoog | hints/anita/haal_jelles_sku_tsje_in_en_sprin_372d7597.mp3 | Anita\|Haal Jelles skûtsje in en spring aan boord. Daarna het zout: blijf uit het licht van de kustwacht en wees terug voor het water komt. | Callirrhoe | 9.17 s | ja (220 ms vanaf 8.88 s) | ja (-2.4 dB) |
| hoog | hints/anita/drie_zoutkuipen_op_de_kwelder_he_0ba90726.mp3 | Anita\|Drie zoutkuipen op de kwelder. Het water komt over een kleine vier minuten. Het licht van de kustwacht gaat heen en weer: bukken (Ctrl) als het komt. | Callirrhoe | 8.35 s | ja (200 ms vanaf 8.06 s) | ja (-2.4 dB) |
| midden | lines/verteller/koeien_sloten_en_een_horizon_ver_49683977.mp3 | Rikus\|Koeien, sloten en een horizon. Verder niks. Heerlijk. | Schedar | 5.29 s | ja (520 ms vanaf 4.68 s) | nee |
| midden | lines/bubbles/m/wie_heeft_mijn_pet_773c62f5.mp3 | ~m\|Wie heeft mijn pet? | Schedar | 1.43 s | ja (200 ms vanaf 1.14 s) | nee |
| midden | lines/douwe/draait_50a0f80a.mp3 | Douwe\|…draait. | Algenib | 1.22 s | ja (240 ms vanaf 0.88 s) | nee |
| midden | lines/tammo/eerst_het_umcg_dan_jelles_ballon_d07b4162.mp3 | Tammo\|Eerst het UMCG, dan Jelles ballon: Tessa vliegt, Tammo hangt aan het touw. | Orus | 4.76 s | ja (260 ms vanaf 4.4 s) | nee |
| midden | lines/bubbles/f/ach_wat_n_dikke_duif_85c5bf43.mp3 | ~f\|Ach, wat n dikke duif. | Despina | 2.7 s | nee | ja (-3.9 dB) |
| midden | banter/h13-pass-gids_1_t_885db9.mp3 | Tammo\|Het klopte wel. | Orus | 0.78 s | nee | ja (-14.3 dB) |
| midden | lines/rikus/krak_iemand_lette_even_niet_op_fc5cefe1.mp3 | Rikus\|Krak. Iemand lette even niet op. | Schedar | 3.11 s | nee | ja (-2.1 dB) |
| midden | lines/tammo/die_wist_de_weg_b59c4759.mp3 | Tammo\|Die wist de weg. | Orus | 0.98 s | nee | ja (-10.7 dB) |
| midden | lines/geesje/jelle_terpstra_heeft_alle_eieren_c58ce0a7.mp3 | Geesje\|Jelle Terpstra heeft alle eieren van het Hogeland gekocht, behalve de mijne. Mijn kippen hebben geen contract. | Pulcherrima | 7.28 s | nee | ja (-2.8 dB) |
| midden | lines/tammo/hij_schrijft_er_vast_een_brief_o_10ea5381.mp3 | Tammo\|Hij schrijft er vast een brief over. | Orus | 1.7 s | nee | ja (-14.9 dB) |
| midden | lines/tammo/een_groot_nat_veld_fde19033.mp3 | Tammo\|Een groot nat veld. | Orus | 1.81 s | nee | ja (-10 dB) |
| midden | lines/bubbles/f/hai_vlugt_hai_vlugt_5a816ee7.mp3 | ~f\|Hai vlugt! Hai vlugt! | Despina | 2.21 s | nee | ja (-5.9 dB) |
| midden | hints/tammo/slotje_openpeuteren_spatie_als_h_1f24d39f.mp3 | Tammo\|Slotje openpeuteren. Spatie als het pinnetje in het groen staat. Ik hou de wacht. | Orus | 4.35 s | nee | ja (-5.2 dB) |
| midden | lines/rikus/geert_dat_is_geen_klus_dat_is_ee_a19470b8.mp3 | Rikus\|Geert, dat is geen klus. Dat is een avond. | Schedar | 2.48 s | nee | ja (-4.6 dB) |
| midden | banter/id-drachten_3_t_d0425b.mp3 | Tammo\|Het was heel rustig. Ik heb er goed geslapen. | Orus | 2.56 s | nee | ja (-13.1 dB) |
| midden | lines/anita/voor_de_grip_7a6af210.mp3 | Anita\|Voor de grip. | Callirrhoe | 2.61 s | nee | ja (-6.1 dB) |
| midden | lines/tammo/tessa_even_over_zaterdag_in_de_b_1e8df217.mp3 | Tammo\|Tessa. Even over zaterdag. In de botsauto. | Orus | 4.36 s | nee | ja (-9 dB) |
| midden | lines/anita/eerst_het_umcg_dan_jelles_ballon_9df04da3.mp3 | Anita\|Eerst het UMCG, dan Jelles ballon: Tessa vliegt, Tammo hangt aan het touw. | Callirrhoe | 6.03 s | nee | ja (-6.9 dB) |
| midden | hints/anita/instappen_bij_roelf_spatie_omhoo_196b8237.mp3 | Anita\|Instappen bij Roelf. Spatie omhoog, W vooruit, A/D draaien. De rest staat in beeld. | Callirrhoe | 6.18 s | nee | ja (-6.6 dB) |
| midden | lines/anita/dat_ben_ik_5b19ad30.mp3 | Anita\|Dat ben ik. | Callirrhoe | 1.96 s | nee | ja (-12.4 dB) |
| midden | lines/anita/het_heette_eerst_het_ciboga_terr_69d91998.mp3 | Anita\|Het heette eerst het CiBoGa-terrein: circusterrein, Bodenterrein en gasfabriek. Nu wonen en werken er mensen. | Callirrhoe | 7.7 s | nee | ja (-12.4 dB) |
| midden | lines/anita/hoe_weet_jij_dat_089a86d9.mp3 | Anita\|…Hoe weet jij dat? | Callirrhoe | 1.72 s | nee | ja (-14.4 dB) |
| midden | lines/anita/welterusten_gids_f7e69464.mp3 | Anita\|Welterusten, gids. | Callirrhoe | 1.29 s | nee | ja (-14.9 dB) |
| midden | banter/h15-fail_0_t_9a1c58.mp3 | Tammo\|Die ballon ging harder dan wij. | Orus | 1.74 s | nee | ja (-14.8 dB) |
| midden | banter/h18-pass-kloet_4_t_87650f.mp3 | Tammo\|Kloet. | Orus | 0.9 s | nee | ja (-14.5 dB) |
| midden | banter/h8-pass-fierljepper_5_a_cf2581.mp3 | Anita\|Rijden, niet praten. | Callirrhoe | 1.97 s | nee | ja (-8.9 dB) |
| midden | banter/id-eierbal-denken_4_t_8e17e2.mp3 | Tammo\|…Nou ja. Ook. | Orus | 1.35 s | nee | ja (-14.5 dB) |
| midden | banter/id-steigers_0_t_aafad4.mp3 | Tammo\|Is Grunn eigenlijk ooit af? | Orus | 1.55 s | nee | ja (-14.1 dB) |
| midden | banter/q-h12-gerda_1_a_93444c.mp3 | Anita\|En dat zei ze zeventig jaar niet. | Callirrhoe | 1.99 s | nee | ja (-2.9 dB) |
| midden | banter/si-nacht-rikus_2_a_6b7cb4.mp3 | Anita\|Nee. Wij bellen Rikus niet. Rikus belt ons. | Callirrhoe | 4.89 s | nee | ja (-4.8 dB) |
| midden | banter/st-eierbal_0_t_c3510a.mp3 | Tammo\|Ik heb dromen, Tessa. Ze zijn rond en gepaneerd. | Orus | 4.72 s | nee | ja (-14.8 dB) |
| midden | jobs/fietsdepot/done_1.mp3 | Handhaver Ria\|Netjes. Die student vindt hem nooit meer terug. | Kore | 3.28 s | nee | ja (-7.3 dB) |
| midden | lines/accountmanager/welkom_bij_wiebelwerk_wij_maken__26db633d.mp3 | Accountmanager\|Welkom bij Wiebelwerk. Wij maken websites. Wat is uw behoefte? | Zubenelgenubi | 4.42 s | nee | ja (-14.7 dB) |
| midden | lines/berend_bos/het_bakkie_staat_bij_de_poort_a953ada2.mp3 | Berend Bos\|Het bakkie staat bij de poort. | Charon | 2.1 s | nee | ja (-11.8 dB) |
| midden | lines/berend_bos/ik_zei_niks_over_winnen_ik_tel_a_bbff1282.mp3 | Berend Bos\|Ik zei niks over winnen. Ik tel alleen. | Charon | 2.85 s | nee | ja (-13.4 dB) |
| midden | lines/bubbles/f/eh_was_dat_er_al_af_964f7c55.mp3 | ~f\|Eh... was dat er al af? | Despina | 2 s | nee | ja (-13.3 dB) |
| midden | lines/bubbles/f/he_kiek_es_uut_2cd702d5.mp3 | ~f\|Hé, kiek es uut! | Achernar | 1.34 s | nee | ja (-14.2 dB) |
| midden | lines/bubbles/m/kiek_uut_woarst_lopst_mien_jong_f78b07c7.mp3 | ~m\|Kiek uut woarst lopst, mien jong! | Schedar | 1.82 s | nee | ja (-8.8 dB) |
| midden | lines/dokter_dijkstra/eerst_de_lunch_achterin_staat_ee_40b49a0c.mp3 | Dokter Dijkstra\|Eerst de lunch. Achterin staat een koeltas voor mijn collega's. Zij hebben twaalf uur niets gegeten. | Sadachbia | 5.97 s | nee | ja (-14.3 dB) |
| midden | lines/duivenmelker_bert/kon_minder_jong_06b2d862.mp3 | Duivenmelker Bert\|Kon minder, jong. | Iapetus | 1.22 s | nee | ja (-3.4 dB) |
| midden | lines/rikus/de_binnenstad_met_de_auto_mag_je_0f2eea59.mp3 | Rikus\|De binnenstad. Met de auto mag je er niet door. Sinds 1977. | Schedar | 4.95 s | nee | ja (-6.9 dB) |
| midden | lines/rikus/er_is_iets_gestolen_dat_niemand__3d61f1cf.mp3 | Rikus\|Er is iets gestolen dat niemand ooit zag, maar dat iedereen mist. 't Het nog nooit zo donker west, of 't wer altied wel weer licht. | Schedar | 7.6 s | nee | ja (-14.7 dB) |
| midden | lines/tammo/elk_jaar_vissen_ze_er_honderden__7ce375d6.mp3 | Tammo\|Elk jaar vissen ze er honderden uit. De rest heeft zich aangepast. | Orus | 4.06 s | nee | ja (-11.6 dB) |
| midden | lines/tammo/oei_dat_zag_de_pliesie_d8c06d61.mp3 | Tammo\|Oei. Dat zag de pliesie. | Orus | 2.05 s | nee | ja (-14.7 dB) |
| midden | lines/tammo_gids/het_is_allemaal_e_e_n_ring_mevro_35665ad0.mp3 | Tammo (gids)\|Het is allemaal één ring, mevrouw. Je kunt niet verdwalen. | Orus | 2.93 s | nee | ja (-14.1 dB) |
| midden | lines/verteller/elke_straat_een_schilder_elke_bu_d147e45b.mp3 | Rikus\|Elke straat een schilder. Elke buur een mening. | Schedar | 3.69 s | nee | ja (-12.7 dB) |
| midden | lines/verteller/stoer_eerlijk_en_met_de_fiets_to_8a05ff2a.mp3 | Rikus\|Stoer, eerlijk en met de fiets tot aan de voordeur. | Schedar | 3.36 s | nee | ja (-12.6 dB) |
| midden | lines/wubbo/het_schip_zit_vast_de_mosterd_is_dd2c6a77.mp3 | Wubbo\|Het schip zit vast. De mosterd is van jullie. Grove mosterd, niet dat zoete spul. | Sadaltager | 5.58 s | nee | ja (-12.3 dB) |

<!-- RAPPORT-EINDE -->

## Ruis-einde en pop-begin: wat het is (analyse van de gemelde clips)

Per 20 ms-frame gemeten in de laatste 0,5 s van de clip (rms dB / nulkruisingsgraad), bijvoorbeeld `lines/anita/alleen_75b2d578.mp3`: de stem eindigt, daarna ca. 0,3 s bijna-stilte (-60 tot -77 dB), dan **10 frames (ca. 0,2 s) ruis op -9 tot -13 dBFS met nulkruising 0,25 tot 0,45**, daarna digitale stilte (-180 dB). De reeks niveaus (-12, -13, -12, -43, -16, -12, -12, -12, -9, -24) is in alle clips vrijwel gelijk: het is een vast artefact van de TTS-uitvoer, geen toeval. Het zit niet in de clip door ffmpeg: de post-keten (`silenceremove` op -45 dB aan begin en einde, daarna `loudnorm`) laat de burst staan omdat hij luid is, en `loudnorm` kan de zachte stem er juist omhoog duwen. Geen clipping (piek -9 dB), geen sample-rate-fout, geen truncatie.

**Pop-begin:** dezelfde clips hebben aan het begin na digitale stilte op ca. 40 ms een losse klik van 5 ms (piek -2 tot -8 dBFS) direct gevolgd door -35 tot -60 dB. Geen fade-in. Het zijn twee kanten van hetzelfde artefact: in de bekende set gaan ze altijd samen.

**Detectors** (`scripts/audio/ruisachtig_scan.mjs` eindBurst, `scripts/audio/pop_begin.mjs`): ruis-einde = in de laatste 0,7 s minstens 4 harde frames (> -25 dB, nulkruising > 0,2, gaten tot 3 frames) na minstens 3 stille frames (< -45 dB); pop-begin = in de eerste 80 ms een blok van 5 ms boven -15 dB dat 15 dB of meer boven de 10 tot 30 ms erna ligt.

**Kalibratie** (`node scripts/audio/ruis_kalibratie.mjs --tabel`, de 38 spraakclips uit de luisterlijst van de eigenaar): de 10 bij naam gemelde clips worden alle 10 gevonden door beide detectors (recall 1,00). Daarnaast markeren de detectors 9 clips uit de lijst waarvan de eigenaar de naam niet doorgaf; omdat hij 19 fouten meldde (10 + 9 = 19) zijn dit vrijwel zeker de overige 9: dan is de precisie 19/19 voor het ruis-einde. Eén clip (`bubbles/f/ach_wat_n_dikke_duif_85c5bf43.mp3`) heeft alleen een pop-begin. Ruisaandeel alleen scheidt niet (de positieven zitten op 9 tot 29 procent, de gewone clips ook). **Te bevestigen door de coördinator: de 9 namen.**

## Lijst van alle verdachte spraakclips (ruis-einde en/of pop-begin)

Volledige scan van 4.193 spraak-, NPC-, politie- en nieuwsclips (`node scripts/audio/spraak_fouten_scan.mjs`, 5 minuten, daarna `node scripts/audio/witte_ruis_rapport.mjs`): 90 clips met ruis-einde, 130 met pop-begin, 86 met beide, 4 alleen ruis-einde, 44 alleen pop-begin. Vooral de Anita-stem (Callirrhoe, 63 van de 134), Tammo (Orus), Geesje (Pulcherrima), Rikus (Schedar). Alle clips komen van `google/gemini-3.8-flash(-lite)-tts` (via litellm), met datums 2026-11-15 en 2026-11-20 als zwaartepunt: het is geen eigenschap van één stem maar van de TTS-uitvoer. Per clip de sleutel, tekst, bestand en stem: zie de tabel in de sectie "Ruis-einde in spraakclips" hierboven en `witte-ruis-scan.json` (veld `bronnen`, met manifest, `tts.json` en model per clip). Luisteren: [WITTE-RUIS-LUISTER-VERDACHT.html](WITTE-RUIS-LUISTER-VERDACHT.html).

Nabewerking voor nieuwe clips: `scripts/audio/staart_trimmer.mjs` (`trimClip`: pop-begin op nul met fade-in, ruis-einde afgeknipt met fade-out; puur getest in `staart_trimmer_test.mjs`; CLI `node scripts/audio/staart_trimmer.mjs in.mp3 uit.mp3 [--controle]`). Aansluiten in de TTS-scripts na de post-keten. Niet zelf clips vervangen: dat doet de TTS-agent.
