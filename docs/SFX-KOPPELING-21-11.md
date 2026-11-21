# SFX-koppeling (ronde 6, 21-11)

> **Naslag.** De regels staan in de canonieke spec [`.specs-fire/standards/mechanica.md`](../.specs-fire/standards/mechanica.md); dit document is het vervolg op [SFX-DEKKING-21-11.md](SFX-DEKKING-21-11.md) (ronde 5: 100 gebeurtenissen, 39 gekoppeld). Issue #1166.

**Stand: 76 van 100 gebeurtenissen gekoppeld** (was 39). Alleen code die in `origin/main` staat is gekoppeld; de epic-branches (kleding, tuning, interieurs, Bezit, verhaal) bevatten geen eigen koppelpunten voor de resterende 24 (hun commits raken menu's, haar, kaartstijlen, verhaalregels en changelog), dus er is geen patchbestand nodig. Gecontroleerd met `git merge-tree`: deze branch merget schoon met de vijf epic-branches en voetbal-fifa op de code na; alleen `CHANGELOG.md` botst met epic Bezit (beide voegen een regel onder `[Unreleased]` toe, houd ze allebei).

Niet beluisterd door een mens en geen Electron gedraaid: alles hieronder is "nog niet bekeken" in beeld en op het gehoor.

## 1. Nieuwe koppelingen (37)

| Waar | Actie in het spel | Sleutel | Samen spelen |
| --- | --- | --- | --- |
| `shops.js` (`clothesRustle`) | kleding aan of uit (kledingwinkel, kast, Spullen, wisseltoets) | `clothes_rustle` | lokaal |
| `shops.js` (`onWear`) | een jas (slot `outer`) aantrekken | `zipper_pull` | lokaal |
| `interiors.js` | kapper-balie zonder winkelmenu: om de beurt schaar, tondeuse, föhn | `scissors_snip`, `hair_clipper`, `hairdryer_blast` | lokaal |
| `interiors.js` | pashokje-balie zonder winkelmenu | `curtain_pull` | lokaal |
| `interiors.js` (`COUNTER_SFX`) | gelukte koop bij de balie: supermarkt scanner, bakker/slager/bloemist tasje, snackbar frituur, overig kassalade | `shop_scanner_beep`, `shop_bag_rustle`, `fryer_sizzle`, `shop_drawer` | wereld (de kassa van de UI blijft lokaal) |
| `interiors.js` (`COUNTER_SFX`) | gelukte bestelling: café koffie, kroeg schenken of fles open (om de beurt), restaurant glazen | `coffee_brew`, `bar_pour`, `bar_bottle_open`, `bar_glass_clink` | wereld |
| `interiors.js` | een dichte voordeur van een woning (bij de melding) | `key_lock_turn` | wereld |
| `interiors.js` | op de trap van een binnenruimte (hoogte verandert, hoogstens elke 0,7 s) | `stairs_steps` | lokaal |
| `interiors.js` | woning binnen 's avonds of 's nachts | `light_switch` | wereld |
| `snackketen.js` | kassa legen bij een eigen snackbar (naast de bel) | `shop_drawer` | wereld |
| `pg_foodtruck.js` | hapje in de frituur (toets 1 tot 3), bakje over de toonbank bij een juiste bestelling | `fryer_sizzle`, `snack_wrap` | lokaal (de minigame draait in eigen spel) |
| `garages.js` | nieuwe lak, upgrade kopen, koffie van Henk | `spray_can`, `wrench_ratchet`, `coffee_brew` | wereld |
| `tuningbind.js` | tuning installeren in de werkplaats | `impact_wrench` | wereld |
| `audio.js` (`updateSampleTriggers`) | handrem aantrekken bij stilstand of lage snelheid (hoge snelheid houdt de slip-opname) | `handbrake_ratchet` | wereld |
| `player.js` (`pushVehicleAudio`) | instappen in auto, bestelwagen of taxi | `seatbelt_click` | wereld |
| `bezitlive.js` | perceel of pand kopen: akte gestempeld | `deed_stamp` | lokaal (voortgang per speler) |
| `boerderijwereld.js` | werktuig koppelen aan de trekker | `gate_latch` | wereld |
| `sidejob_bus.js` | een passagier drukt op de stopknop, één keer per halte | `bus_stop_button` | wereld |
| `weapondrops.js` | wapen of voorwerp van straat oppakken | `ui_item_pickup` | lokaal |
| `spullen.js` | wapen in de hand nemen vanuit Spullen | `ui_item_equip` | lokaal |
| `storytravel.js` | verhaalreis (scherm wisselt) | `ui_travel_whoosh` | lokaal |
| `stagechoice.js` | keuze bevestigd in de missiekeuze (de menuklik blijft de terugval) | `ui_confirm` | lokaal |
| `phonefeed.js` | sms-kaartje (de synthtik blijft de terugval) | `phone_message` | lokaal |
| `sfx/ui.js` | melding op de telefoon trilt (synth blijft de terugval); speld op de kaart; kaart in- of uitzoomen | `phone_vibrate`, `ui_map_pin`, `ui_map_zoom` | lokaal |
| `audio.js` | een kijker die filmt hapt naar adem (in plaats van roepen, zwakke kreet) | `npc_gasp` | wereld |
| `voetbal.js` | het publiek zingt bij de aftrap | `crowd_chant` | wereld (per machine, op de gedeelde wedstrijdgebeurtenis) |
| `sfx/ambience.js` | bij regen soms druppels van een dak of in een plas | `rain_drips` | wereld |

## 2. Geen dubbele geluiden

Per actie is gecontroleerd of er al een geluid klinkt. Waar een opname een bestaand synthgeluid vervangt, staat de synth als terugval (`if (!uiFx(...)) synth()`): kaartspeld, zoom, trillen, sms-tik, keuze. Waar een bestaand geluid van een ander soort al klinkt, komt de nieuwe klank erbij omdat hij iets anders is: de tuning (metaalimpact van de werkplaats plus slagmoersleutel), de bestelling (de hap van `horeca_hap` plus de baliehandeling), de snackbar-kassa (bel plus lade). De afkoeltijd en de anti-herhaling komen uit de tabel; een gebeurtenis die vaker per handeling zou kunnen vallen (kleding via menu en toets) wordt door de afkoeltijd (`clothes_rustle`: 0,4 s) opgevangen. De test `scripts/sfx_round5_test.mjs` keurt: elke `sfxEvent`-sleutel staat in de tabel, geen sleutel binnen drie regels twee keer in één bestand, en de teller van gekoppelde gebeurtenissen.

## 3. Nog niet gekoppeld (24) en waarom

| Sleutel | Reden |
| --- | --- |
| `ui_button_press`, `ui_button_hover`, `ui_tick_soft` | bewust niet gewisseld: `select()` en `tick()` gebruiken al een opname met toonhoogte (DS3-ritme van de microanimaties, `dsmicro.js`); eerst luisteren en dan wisselen |
| `ui_notify_pop` | zou elk onopvallend toastje een geluid geven; de toasts met een soort hebben al `ui_toast` |
| `ui_popup_open`, `ui_bag_open`, `ui_page_turn` | het tabblad en de pauzekaart hebben al `ui_tab` en `phoneSnd`; een dagboek of boek met bladzijden bestaat nog niet in main |
| `step_tile`, `step_parquet`, `step_carpet` | de stappen per ondergrond staan al in `foley.js` (`stap_binnen`); er is geen vloersoort per binnenruimte in het plan, dus koppelen zou dubbele stappen geven |
| `door_bell_ring`, `elevator_ding`, `elevator_doors` | geen aanleiding in main: woningen hebben geen aanbelhandeling en er zijn geen liften |
| `neon_buzz_on`, `hood_slam` | geen neon of motorkap als speleractie in main (epic Tuning) |
| `tractor_start`, `milking_machine`, `fence_hammer`, `bucket_water` | geen melken, paal plaatsen, drinkbak of AI-werker die start in main (epic Bezit; `tractor_start` past bij de AI-trekker van een loonwerker) |
| `npc_cough`, `npc_sigh` | NPC-reacties die erbij passen bestaan niet in main |
| `tram_doors` | geen tram in main |
| `cutscene_hit`, `cutscene_riser` | een tussenscene roept ze zelf aan met `{ fx: 'sfx', kind: 'fx', name: 'cutscene_hit' }` in de scènedefinitie (`cutscenehost.js` pakt dat op); dat is schrijfwerk van epic Verhaal, niet van een koppelpunt |

## 4. Samen spelen

Elke koppeling volgt de kolom `mp` van `sfxmap.js`. Lokale klanken (UI, eigen handen, eigen voortgang zoals de akte) klinken alleen op het scherm van de speler die iets doet; wereldklanken horen spelers in de buurt van de machine die het veroorzaakt. Er is geen `from`-aanroep toegevoegd: de machine die iets doet speelt het zelf, een geluid van een ander komt pas als EXTRA-berichten het doorgeven (zie `docs/COOP-GAST.md`). Voor een gast: de balie, de trap en het licht zijn wereld (de gast in de buurt hoort ze via de eigen koppeling in zijn spel), de akte, de reis en de bevestiging zijn lokaal. Test: `scripts/sfx_round5_test.mjs` (beleid en koppelfunctie) en `scripts/sfx_haken_test.mjs`.
