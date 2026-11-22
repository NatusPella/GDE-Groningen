# Stand van alle verhaalwerkpakketten #1122 tot en met #1139 (22-11)

Audit van WP-A en WP0 tot en met WP16 tegen de code op main, met de toets als bewijs. Vervolg op [WP-STAND-21-11.md](WP-STAND-21-11.md) (WP3 tot en met WP5). Wat gedaan blijkt, is niet opnieuw gebouwd; wat ontbrak als beat, is gebouwd als stap met eigen ID-prefix `W` (W1, W2). Alle tests hieronder zijn op 22-11 gedraaid met gewoon `node` (three via `GDE_VENDOR_CACHE`). Niets is in beeld of gehoor gezien: alles blijft "nog niet bekeken" tot de Electron-sweep van de coordinator.

## Matrix

| Issue | WP | Stand | Bewijs (commit of test) | Open |
|---|---|---|---|---|
| #1122 | WP-A: Aanwijzingen weg, recapkaart | gedaan | `recapcard_test` 52/52, `spelmenu_test`; code `recapcard.js`, `recapcardrun.js` | alleen beeld (label wacht-beeld) |
| #1123 | WP0: ruggengraat en toetsen | gedaan | `RUGGENGRAAT.md`; `story_spine_test` 154/154, `dialogue_rhythm_test` 550/550, `introduction_test` 16/16; commit fb7ac82ae | allowlists mogen alleen korter |
| #1124 | WP1: akte 1 laat het motief zien | gedaan, plus W1 | `verhaal_akte1_bridges_test` (47), `regie_sleutelscenes_test`; **nu W1 "Half drie"**: het frietmoment dat de opening miste, `storymigratie_w_test` | 3D-prop prikbord (beeld) |
| #1125 | WP2: overgangsscenes O1 tot en met O12 | gedaan | `storybridge_test` 151/151, `verhaal_akte1_bridges_test` | scenes hebben 8 tot 14 regels in plaats van 2 tot 6 (inkorten raakt de O-stappen en de opnames, bewust niet aangeraakt); SFX-sleutels |
| #1126 | WP3: akte 2 | gedaan, plus K1 en K2 | `verhaal_wp345_test` 44/44, `storymigratie_k_test` 28/28; matrix in WP-STAND-21-11.md | dagdroom T2 en 3D-prop prikbord (beeld) |
| #1127 | WP4: akte 3 | gedaan, plus K3 | `verhaal_wp345_test` (WP4-deel), `akte3_test`; commit c42fdfa43 | beeld |
| #1128 | WP5: akte 4 | gedaan | `akte4_test` 196/196, `verhaal_wp345_test`; `WHY.zuid` noemt de bal | beeld |
| #1129 | WP6: akte 5 en epiloog | gedaan | `akte5_test` 230/230 (eierbal wint, Berend in korte beurten, epiloog gesplitst), F1 tot en met F6 | beeld |
| #1130 | WP7: Deel 4 aan de wagen | gedaan | `deel4_wagen_test` 10/10, `akte6_test` 180/180; commits 874a8b52d en a6a83e6fb | beeld |
| #1131 | WP8: poort per akte | gedaan, kaart open | `unlockgate_test` 41/41 (migratie: een save zonder `gate` leest als alles open), bedraad in Loopbaan-menu, loopbaanstart, Bezit, voetbal en snackwagen | de gedimde startplekken op de kaart zijn niet gebouwd (vraagt beeld en een kaartontwerp) |
| #1132 | WP9: beeld en Electron-verhaaltest | niet door een agent | node- en statische delen gedaan (cutscene_lint 0 blokkerend) | Electron-verhaaltest en beeldrun: coordinator |
| #1133 | WP10: stemmen opnieuw opnemen | alleen de lijst | `voice_wacht.json` (nu 219 sleutels), `voice_coverage` | de TTS-ronde zelf: niet door een agent |
| #1134 | WP11: dialoogvorm ov, cut, pause | gedaan voor tekst en ondertitels | `dialoogvorm_test` 22/22; `dialogueform.js` | een tweede stemkanaal voor echte audio-overlap en een afkap op een ingesproken regel: audio-engine, vraagt gehoor |
| #1135 | WP12: lichte reputatie | gedaan | `reputation_test` 37/37; commits ab6948b4d, 6b53243c9, 84317dd35 | het 5%-prijseffect staat bewust niet in de economie (balans); andere NPC-regels buiten de wagenpagina lezen de reputatie niet |
| #1136 | WP13: wagen-mijlpalen | gedaan | `storymilestones_test` 12/12; commit 3d717acc2 | niets |
| #1137 | WP14: romantiek als keuzes | gedaan | `storyromance_test` 62/62; commit 3d717acc2 | beeld |
| #1138 | WP15: regie in de sleutelscenes | gedeeltelijk | `regie_sleutelscenes_test` 41; `cutscene_lint --strict` 0 blokkerend; commit 07fc2950d | de sloot (M10.3) is een stage van de missie zelf zonder eigen regie; 217 belangrijk-vondsten; alles vraagt beeld (label hertest) |
| #1139 | WP16: Jelle als eindbaas | gedaan, plus W2 | `jellebaas_test` (6 groepen), `rival.js`; **nu W2 "Verkocht, zegt het bord"**: het panden-plakje buiten de snackwagen als beat | speelbaar opkopen van Bezit-panden door Jelle (Bezit-lead, #1095) |

## Wat er is bijgebouwd

| Stap | Akte | Plek | Wat |
|---|---|---|---|
| W1 Half drie | 1, na N4 | de flat in Paddepoel, thuisscene om 2.30 uur | Tessa bakt friet in een pannetje, Tammo komt thuis van een late rit: "Een thuis met wielen", "Dan rijd ik. Jij bakt." Het motief van de opening, in beeld in plaats van alleen in een zin |
| W2 Verkocht, zegt het bord | 3, na J2 | het havenhuis in Delfzijl [53.3330, 6.9180] | Durk en Douwe hangen een bord VERKOCHT voor de koop er is; Tessa wijst op het formulier in drievoud en maakt een foto. Jelle koopt het pand, zij beheren het (de lijn van K3), met zijn eigen wapen, het papier |

Techniek: activiteiten zonder beloning, kosten of vlag (`added: true`), scene als ondertitelpraat, migratie zoals K1 tot en met K3: een oude save voorbij het invoegpunt telt ze als gedaan, een oude save ervoor speelt ze (`scripts/storymigratie_w_test.mjs`, 24 controles). De coordinaten van W2 zijn een schatting: controleer in beeld dat de gids op een begaanbare plek uitkomt. Bron van de scenes: `docs/verhaal/nieuw/09-script-akte1.md` (W1) en `09-script-akte3.md` (W2), gebouwd met `build_story_data.mjs` (prefix W erbij). Geen bestaande M-, O-, N-, J-, F-, V-, K- of E-stap is aangeraakt.

**Samen spelen.** Een W-stap is van de speler die hem speelt (eigen voortgang, #429). Een gast speelt hem niet voor de host en er gaat niets over het net dat er niet al was; wie later aansluit mist hooguit een zin. Geen nieuw netwerkbericht, dus geen nieuwe coop-test; `storymigratie_w_test` dekt de voortgang.

**Stemmen.** De nieuwe regels van Tessa, Durk en Douwe staan op `scripts/voice_wacht.json`; Tammo is bewust alleen tekst. De opname volgt in de TTS-ronde.

## Nog open (niet door een agent te doen)

- Beeld en gehoor: alles, ook W1 en W2 (aankomstradius, plek van de gids, leestijd).
- De 3D-uitwerking van de dagdroom in T2 en het prikbord als prop.
- Het tweede stemkanaal (audio-overlap) en de gedimde startplekken op de kaart.
- Inkorten van de overgangsscenes O1 tot en met O12 naar 2 tot 6 regels hangt aan de opnames.
