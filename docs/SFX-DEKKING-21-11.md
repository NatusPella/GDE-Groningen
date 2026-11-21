# SFX-dekking en uitbreiding (21-11)

> **Naslag.** De regels staan in de canonieke spec [`.specs-fire/standards/mechanica.md`](../.specs-fire/standards/mechanica.md); dit document is de audit en de bouwlijst van SFX ronde 5. De eerdere rondes staan in [SFX-GAPS.md](SFX-GAPS.md); bronnen en licenties in [AUDIO-LICENTIES.md](AUDIO-LICENTIES.md) (ADR [0039](../.specs-fire/standards/adr/0039-licentievrije-audio-met-credits.md)).

Aanleiding: de eigenaar vroeg "kunnen we ook nog meer SFX toevoegen?". Deze ronde brengt **221 nieuwe opnames in 100 gebeurtenissen** (14 gebieden, samen 2,2 MB, ruim binnen de 25 MB), een **centrale geluidstabel** (`game/js/sfx/sfxmap.js`) en **39 koppelingen** in de bestaande code. De rest (61 gebeurtenissen) is klaar voor de leads van de epics die nog bouwen; hun sleutels staan onderaan.

**Wat niet is gedaan.** Niets is beluisterd door een mens en er is geen Electron gedraaid: de keuze van de opnames is gedaan op titel en meting (lengte, niveau, pop aan het begin, ruisstaart, ruisburst na het coderen). Het luisterpaneel [SFX-LUISTER.html](SFX-LUISTER.html) is er voor een veto. De coördinator doet de ene grote sweep.

## 1. Audit: wat had geluid, wat niet

Methode: de aanroepen van `pushAudioEvent`, `haakFx`, `haakUi`, `uiFx`, de `case`-regels van `playAudioEvents` (audio.js), `FX_INFO`, `SAMPLE_INFO`, de ambience-lagen en de dierenlijst gelezen, en gezet naast de acties in de moduleslijst van `game/js` (winkel, boerderij, voetbal, interieurs, telefoon, indicatoren, tram en bus). Vóór deze ronde: 113 synth-effecten (`FX_INFO`) en 154 opnames; na: 375 opnames. De kolom "Voor" is een schatting uit de code, niet gemeten bij het spelen.

| Gebied | Voor | Gat | Na (deze ronde) | Prioriteit |
| --- | --- | --- | --- | --- |
| Menu en meldingen | synth-tabs, toast, kassa, `ui_klik` | geen terug-klank (synth), schuifregelaar (synth), prestatie en eindkaart (synth), geen microtik, kaartpin, zoom, popup | 19 gebeurtenissen, 40 opnames; terug, schakelaar, schuifregelaar, prestatie goud en eindkaart gekoppeld | hoog |
| Winkels, bar, snackwagen | kassa, winkelbel, deurbel van het pand | geen munten, biljetten, kassalade, scanner, tasje, koffie, glazen, schenken, frituur | 12 gebeurtenissen, 25 opnames; munten, biljetten en drie extra deurbellen gekoppeld | hoog |
| Interieurs | houten deuren, huisdeur, flat-ambience | binnendeuren, deurbel, trap, lift, sleutel, lichtknop, stappen op tegel, parket en tapijt | 11 gebeurtenissen, 27 opnames; binnendeuren gekoppeld | hoog |
| Kleding en kapper | niets | ritselen, rits, gordijn, schaar, föhn, tondeuse | 6 gebeurtenissen, 11 opnames (voor de lead) | midden |
| Tuning en voertuig | claxon (synth), motor, handrem-slip | korte opname-claxon, richtingaanwijzer, ratel, spuitbus, slagmoersleutel, neon, motorkap, handrem, gordel | 9 gebeurtenissen, 20 opnames; claxon en richtingaanwijzer gekoppeld | midden |
| Bezit: boerderij | alleen "oogstklaar"-UI en voertuiglussen | oogsten, spitten, graan, melken, paal, hek, emmer, akte, trekker starten | 9 gebeurtenissen, 19 opnames; klus afgerond (oogsten, spitten, graan) gekoppeld | hoog |
| Dieren | koe, schaap, paard, eend, meeuw (opname), hond en kat (synth) | kip ontbrak, weinig variatie | 5 gebeurtenissen, 12 opnames, alles gekoppeld in `ambience.js` (kip is nieuw) | midden |
| Voetbal | hole, rand en slag van de minigolf-klank, spraak | bal trappen, paal, net, publiek, fluit, stuit, jingle | 6 gebeurtenissen, 15 opnames; alles gekoppeld in `voetbal.js` | hoog |
| Publiek | gejuich en applaus bij races | doelpuntgebrul, kreun, zingen | 3 gebeurtenissen, 6 opnames; gebrul en kreun gekoppeld | midden |
| Natuur en weer | vogels, kikkerlus, krekels, regen, donder (opname en synth) | losse kikker, uil, windvlaag, kerkklok, druppels | 6 gebeurtenissen, 15 opnames; vogel, kikker, uil, wind en kerkklok gekoppeld | midden |
| Reacties van voorbijgangers | synth-gegiechel, hik, schreeuw | lach, grinnik, hap naar adem, hoest, zucht | 5 gebeurtenissen, 11 opnames; lach en grinnik gekoppeld in het `giggle`-event | midden |
| Openbaar vervoer | trein- en busdeur, tram- en busbel, omroepbel | luchtremmen, tramdeuren, stopknop, stationsjingle | 4 gebeurtenissen, 8 opnames; luchtremmen en stationsbel als extra varianten van bestaande haken | midden |
| Tussenscenes | scene_in en scene_uit (synth) | dreun, opbouw | 2 gebeurtenissen, 5 opnames (voor de lead) | laag |
| Telefoon | buzz en ping (synth) | rinkelen, sms-toon, trillen | 3 gebeurtenissen, 7 opnames; rinkelen gekoppeld | hoog |

**Klinkt het hetzelfde?** De drie bestaande UI-klanken (select, tick, kassa) delen één opname (`ui_klik`, `kassa_koop`): dat is het grootste "klinkt hetzelfde"-gat, en daarom heeft het menu nu 3 knopvarianten (`ui_button_press`) en 2 hoververianten klaarstaan. **Te zacht of te hard?** Alle nieuwe opnames zijn op RMS gelijkgetrokken (UI rond -26 dB, effecten rond -22 dB, omgeving rond -25 dB) en pieken op hoogstens -1,5 dB; het niveau per gebeurtenis staat in `sfxmap.js` (`gain`) en gaat door het `categoryLevel` van het mixplan, dus de schuiven Effecten en Omgeving en de dempknop werken erop.

## 2. De centrale tabel: `game/js/sfx/sfxmap.js`

Eén tabel van **gebeurtenis-sleutel** naar clips, bus, niveau, afstand, afkoeltijd en het Samen-spelen-beleid. Een feature roept `sfxEvent(world, 'shop_buy_coins', x, y)` aan (`sfx/haken.js`) en de tabel beslist wat klinkt; geen audiocode aanraken.

- **Bussen:** `ui` (UI-bus, geen plek), `sfx` (Effecten: wereldbus, op een plek), `ambient` (Omgeving: dieren, weer, publiek). De mixcategorie (`cat`) bepaalt niveau en spraakdemping (`mixplan.js`).
- **Variantenbeleid:** een pool van 1 tot 3 opnames; nooit dezelfde opname twee keer achter elkaar (`pickClip`, en in `vervangSleutel` van `samples.js` voor het pad van `haakFx` en `haakUi`; de dierenlijst en de omgeving hebben dezelfde regel); een lichte toonhoogte (±4 procent, ±3 procent op de UI-bus) en volumevariatie (±1,5 dB).
- **Afkoeltijd per gebeurtenis** (`gap`, niet per clip), zodat roterende varianten geen salvo geven (`eventCoolOk` in `audio.js playFx`, `UI_COOLDOWN` in `uitaal.js` voor de UI-bus).
- **Luie lading:** alleen de korte, vaak gebruikte UI-opnames worden bij de start gedecodeerd (`eager`); de rest laadt bij de eerste vraag en blijft tot dan stil of valt terug op de synth. De nieuwe opnames voegen minder dan 3,5 MB PCM toe bij de start (gemeten in de test).
- **Instellingen, dempen, pauze:** het pad is dat van de bestaande opnames (`playSample`, `uiFx`): `Effecten` en dempen raken alles; een pauze of het menu dempt zoals de rest. Er is geen nieuwe geluidskaart of timer.
- **Samen spelen:** elke gebeurtenis heeft `mp: 'local'` (alleen de speler die het doet hoort het: UI, eigen handen, eigen voortgang zoals de aktestempel) of `mp: 'world'` (een wereldgeluid dat spelers in de buurt ook horen). Een geluid van een ANDERE speler gaat via `sfxEvent(world, key, x, y, { from: 'p2', d: afstand })`: het mag alleen voor `world`, binnen 60 procent van het bereik en spaarzaam (hoogstens één per gebeurtenis per 0,8 s en vier per seconde in totaal, `remoteAllowed`). De machine die het geluid veroorzaakt speelt het zelf; de aanroeper geeft `from` alleen mee voor wat hij ONTVING, nooit voor wat hij zelf simuleerde: zo klinkt het nooit dubbel bij host en gast. Wie ontvangt via EXTRA-berichten roept `sfxEvent` aan met `from`; de wedstrijdgeluiden van het voetbal draaien per machine op de gedeelde wedstrijdgebeurtenissen en zijn dus lokaal.
- **Nieuwe gebeurtenis toevoegen:** `def(...)` in `sfxmap.js`, een rij in `scripts/audio/sfx_round5_list.mjs` (zoekterm en mastering), `master_sfx_round5.mjs --bron=<inbox>` (zie 4), `node scripts/audio/licenties_bouw.mjs --write`, en een regel hieronder of een koppeling in de code (de test eist een van beide).

## 3. Gekoppeld in deze ronde (39 gebeurtenissen)

| Waar | Gebeurtenis | Sleutels |
| --- | --- | --- |
| `sfx/ui.js` (menu) | terug, schakelaar aan en uit, schuifregelaar (synth blijft terugval) | `ui_cancel`, `ui_toggle_on`, `ui_toggle_off`, `ui_slider_tick` |
| `audio.js` | goud-prestatie, eindkaart-whoosh, korte claxon, binnendeuren, gegiechel | `ui_achievement`, `ui_endcard_whoosh`, `car_horn_short`, `door_interior_open`, `door_interior_close`, `npc_laugh`, `npc_chuckle` |
| `shops.js`, `ownedvehicles.js` | betalen, verkopen; drie extra deurbellen via `FX_VERVANG` | `shop_buy_coins`, `shop_sell_bills`, `shop_door_chime` |
| `voetbal.js` | trap, paal, net, doelpunt, redding, fluit (aftrap, rust, einde), stuit, jingle | `football_kick`, `football_post`, `football_net`, `crowd_goal_roar`, `crowd_groan`, `referee_whistle`, `ball_bounce`, `sport_stinger` |
| `boerderijwereld.js` | klus afgerond: oogsten, spitten (ploegen, zaaien), graan (bemesten, afleveren) | `harvest_cut`, `dig_soil`, `grain_pour` |
| `indicators.js` | tik van de eigen richtingaanwijzer, 1,5 keer per seconde | `car_blinker` |
| `phone.js` | een gesprek begint te rinkelen | `phone_ringtone` |
| `sfx/ambience.js` | dieren (kip is nieuw; hond, kat, koe, schaap kregen opnames), vogels, kikker en uil 's nachts, windvlaag, kerkklok bij het beiaardspel | `chicken_cluck`, `dog_bark`, `cat_meow`, `cow_moo`, `sheep_bleat`, `bird_chirp`, `frog_croak`, `owl_hoot`, `wind_gust`, `church_bell` |
| `sfx/samples.js` | extra varianten voor bestaande haken: busdeur-sis en perronbel | `train_air_brake`, `station_chime` |

Bewust niet gewisseld: `select()` en `tick()` van het menu gebruiken al een opname (`ui_klik`) met toonhoogte-afwijking en eigen tests; `ui_button_press` en `ui_button_hover` staan klaar om te vergelijken, maar een wissel doen we na luisteren.

## 4. Productie

`scripts/audio/sfx_round5_list.mjs` (100 zoekrijen, 221 opnames) naar `freesound_fetch.mjs` (alleen CC0 en CC BY, ADR 0039, tijdens de ontwikkeling) naar `master_sfx_round5.mjs`: DC weg, hoog- en laagdoorlaat, stilte van de randen, ingekort met een cosinus-fade-uit, 3 tot 5 ms fade-in, niveau op RMS met -1,5 dB piekgrens, mono 44,1 kHz Vorbis q2. Elke kandidaat gaat door de detectors van de witte-ruisronde ([WITTE-RUIS-21-11.md](WITTE-RUIS-21-11.md)): een pop aan het begin (`pop_begin.mjs`) of een ruisburst aan het eind (`ruisachtig_scan.mjs eindBurst`) wijst af, ook na het coderen (het bestand wordt teruggelezen); een ruisstaart telt als strafpunt behalve bij groepen die van nature ruis zijn (sis, regen, wind, whoosh). Per groep komen de beste kandidaten uit één zoekopdracht, met voorkeur voor verschillende auteurs. Resultaat: 35 van de 221 opnames zijn CC BY (de auteurshandle staat in de credits en in [AUDIO-LICENTIES.md](AUDIO-LICENTIES.md)), de rest CC0; 179 verschillende auteurs. Geen synthese was nodig: voor alle 100 groepen was een open bron te vinden.

Nog niet gelukt: een echte scheidsrechtersfluit en een kerkklok met veel galm zijn gekozen op titel; een groep met te weinig goede kandidaten kreeg minder varianten (`ui_tick_soft` 2, `shop_sell_bills` 1, `scissors_snip` 2, `harvest_cut` 2, `shop_drawer` 2 van wie er één na coderen afviel en uit een eerdere ronde stamt).

## 5. Tests

`node scripts/sfx_round5_test.mjs` (5.600 controles, zonder Electron): elke clip van de tabel bestaat als bestand en in het manifest met bron-URL, auteur en CC0- of CC-BY-licentie; de bronnenlijst en de tabel hebben dezelfde sleutels; duur, piek en niveau binnen de grenzen; geen DC, geen klik aan de randen, geen pop en geen ruisburst op het gedecodeerde bestand; totaal binnen 25 MB; bussen, categorieën en Samen-spelen-beleid kloppen; de variantenpool en de anti-herhaling (60 trekkingen per gebeurtenis, ook met een vaste toevalsgetal); de afkoeltijd per gebeurtenis; het Samen-spelen-beleid (lokaal nooit van een ander, wereld spaarzaam, geen dubbel); de koppelfunctie op een nagemaakte wereld; en dat elke gebeurtenis in de code gekoppeld is of hieronder staat. `sfxsamples_test`, `sfx_haken_test`, `sfx_linkups_test`, `sfx_test`, `sfx_audit_test`, `sfx_uitaal_test`, `sfx_stingen_test`, `audio_licenties_test` en de ruistests blijven groen.

## Voor de leads

Elke lead koppelt zijn eigen gebeurtenissen met `sfxEvent(world, '<sleutel>', x, y)` uit `game/js/sfx/haken.js` (zonder `x` en `y`: op de plek van de eigen speler). De sleutels hieronder hebben opnames, een niveau en een afkoeltijd; wat een gast hoort staat in de kolom `mp` van `sfxmap.js` (`local` of `world`). Elke nieuwe koppeling hoort een regel over Samen spelen in de changelog te krijgen.

- **Bezit** (adc738a5063982b26): `deed_stamp` (akte gestempeld bij het kopen; per speler, `local`), `fence_hammer` (paal plaatsen), `gate_latch` (hek), `bucket_water` (drinkbak vullen), `milking_machine` (melkmachine), `tractor_start` (trekker AI-werker start), `grain_pour` (silo vullen; al gekoppeld voor "afleveren" in `boerderijwereld.js`). Dieren: de lijsten in `ambience.js` kennen `kip`, `koe` en `schaap` als `kind` van `world.wildlife`; voeg dierenbezit toe aan `world.wildlife` of `world.countryAudible` en ze klinken vanzelf.
- **Verhaal** (ad8b6aabe03db6268): `cutscene_hit` (wending in een tussenscene), `cutscene_riser` (opbouw), `phone_message` (sms-tik per bericht), `phone_vibrate`, `ui_page_turn` (dagboek of boek), `ui_confirm` (keuze bevestigd), `npc_gasp`, `npc_cough`, `npc_sigh` (reacties van een NPC in een scène).
- **Kleding** (a3c0c4963023e94bb): `clothes_rustle` (aan of uit), `zipper_pull`, `curtain_pull` (pashokje), `scissors_snip` (kapper, in een lus van knippen: gap 0,25 s), `hairdryer_blast` (föhn), `hair_clipper` (tondeuse), `ui_item_equip` (uitrusten), `shop_scanner_beep`, `shop_bag_rustle`. Alles is `local` (eigen handen): een gast ziet de outfit, hoort niet je rits.
- **Interieurs** (a9dba0ee6d714403b): `door_bell_ring`, `stairs_steps`, `elevator_ding`, `elevator_doors`, `key_lock_turn`, `light_switch`, `step_tile`, `step_parquet`, `step_carpet` (stappen per binnenvloer: koppel aan `steps.js` via het ondergrondtype of roep `sfxEvent` per stap aan; `cat: 'voetstap'`, gap 0), `coffee_brew`, `bar_glass_clink`, `bar_pour`, `bar_bottle_open`, `fryer_sizzle`, `snack_wrap`, `shop_drawer` (horeca en winkels), `crowd_chant` (kroeg), `rain_drips` (druppels van een dak), `ui_bag_open`. Voor een gedempt binnenaccent: laat `stepContext.indoors` en de kamertoon (`ruimte_binnen`) zoals ze zijn.
- **Tuning** (a828a982f56f81629): `wrench_ratchet`, `spray_can`, `impact_wrench`, `neon_buzz_on`, `hood_slam`, `handbrake_ratchet`, `seatbelt_click` (alle op de plek van het voertuig), `ui_item_equip`.
- **Meldingen en microanimaties** (UI-lead): `ui_button_press`, `ui_button_hover`, `ui_tick_soft`, `ui_notify_pop`, `ui_popup_open`, `ui_map_pin`, `ui_map_zoom`, `ui_travel_whoosh`, `ui_item_pickup`. Allemaal UI-bus en `local`.
- **Openbaar vervoer:** `tram_doors`, `bus_stop_button` (nog zonder koppelpunt).

Nog niet gebouwd door niemand: de opnames die lussen moeten zijn (regen op daken, een draaiende föhn) zijn korte eenmalige klanken; een lus vraagt `maakLus` uit `master_sfx_ronde3.mjs`.
