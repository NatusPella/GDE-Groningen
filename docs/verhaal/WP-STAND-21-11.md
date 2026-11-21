# Stand van de verhaalwerkpakketten WP3, WP4 en WP5 (21-11)

Controle van #1126 (WP3, akte 2), #1127 (WP4, akte 3) en #1128 (WP5, akte 4) tegen wat in `game/storydata/script.json`, `game/js/storyarc_nieuw.js` en de cutscene-bestanden staat. Bron van de eisen: de issuetekst en [VERHAAL-ANALYSE-21-11.md](../VERHAAL-ANALYSE-21-11.md) hoofdstuk 7 (ruggengraat per akte) en 15 (missies die herschreven moeten worden). Wat gedaan blijkt, is niet opnieuw gebouwd: het staat nu vast in `scripts/verhaal_wp345_test.mjs` (44 controles, zuiver node). Wat ontbrak, is gebouwd als stap met eigen ID-prefix `K` (K1 tot en met K3). Niets hieronder is in beeld of gehoor gezien: alles is "nog niet bekeken" tot de Electron-sweep van de coördinator.

## WP3, akte 2 (#1126)

| Eis | Stand | Waar |
|---|---|---|
| Doelverschuiving naar het recept krijgt een aankondiging en reden | gedaan | `WHY.romp`; M08.3 in 14 korte regels (geen monoloog langer dan 25 woorden); clue "Het lijstje van Oma"; commit 33cb29eee |
| M07.1 in korte beurten, Jelle belt zelf over zijn vet | gedaan | M07.1 opent met Jelle; hoogstens 16 woorden per beurt; commits 33cb29eee, 51a1ef75c |
| M08.3 het recept van Oma in beurten met reacties | gedaan | M08.3 (Tessa en Tammo reageren per ingrediënt; Geesje, Klaas, Dijkstra als aanloop) |
| Het prikbord met de vijf vrienden | gedaan (scène), open (3D-prop) | N8 "Een avond bij Oma" (punaise, de vijf namen); de prop zelf is niet gebouwd (`furniture.js` heeft alleen de wandkaart "Woar Bin'k") |
| M11.3 oefenbal schrappen of vervangen door een briefje van Mem | gedaan | M11.3: broodtrommel en briefje "Eet wat. Ik wil niks." getekend M; "oefenbal" komt in akte 2 niet meer voor |
| Mem krijgt een stem (twee telefoontjes) | gedaan (tekst), open (opname) | O4 "Een jas" en O5 "Straks" als telefoon-kanaal; de opname staat op de wachtlijst (`voice_wacht.json`) |
| Tessa's thuis (Warffum) wordt getoond | gedaan | N5 "De boerderij in Warffum" (het erf, melken, de koe, de verbazing van Tammo); M09.1 (de kippen, "dat zeg je nu pas?") |
| Opent de boerderij- en Landbouw-wereld | **ontbrak als beat, nu K1** | `unlockgate.js` opent `farm` bij akte 2, maar niemand zei het in beeld; K1 "Het land achter de pastorie" (Geesje, het bordje TE HUUR) |
| Sterren (M11.5 en M11.6) met een duidelijke romantische reactie | gedaan | M11.5 (Melkweg), M11.6 ("Je kijkt naar mij, Tammo.") |
| Eén regel waaruit blijkt dat Tammo het al lang weet | **ontbrak, nu K2** | K2 "De kade in de ochtend": "Ik wist het al lang." zonder het woord; de kus in akte 3 blijft het kantelpunt |
| Aanloop Dijkstra, Geesje, Klaas | gedaan | M08.3 (Oma noemt ze), M11.8 (Dijkstra belt), M12.1 (Dijkstra via Oma) |
| De dagdroom in T2 heeft regie | **open** | T2 heeft regie en tekst in `script.json` maar geen 3D-uitwerking: T2 is een reisbeat (`reisbeats.js`) zonder cutscene-spec. Voorstel: een korte droomsequens als spec naast de busrit; vraagt beeld, dus nog niet gebouwd |
| Test `akte2_doelen_test` | bestaat | draait alleen met wereldgegevens; hier overgeslagen (geen `data/cache/province`) |

## WP4, akte 3 (#1127)

| Eis | Stand | Waar |
|---|---|---|
| Jelle legt zijn plan zelf uit (radio of scène) | gedaan | R3.0 (het koopboek), M14.1 (deurwaarder), M15.5 (kantoorwagen), O6 (het bod); 23 Jelle-regels in akte 3; commits 1606f52f5, 33cb29eee |
| Intro's M12 tot en met M16: Tessa legt minder uit | gedaan | M12.1 tot en met M16.1 herschreven; geen "Daarin staat welk plakje" meer in de mond van Tessa |
| Geert eerst via Roelfien of Tessa | gedaan | M15.3 (Roelfien noemt Geert), M15.6 (Daan), dan pas M16.1 |
| Dijkstra via Oma | gedaan | M11.8 en M12.1 |
| Een bedankbriefje van Jelle aan Tessa | gedaan | M15.5 "Tige tank! – J." in de kantoorwagen |
| Jaloerse grap in M16.1 als signaal van de boog | gedaan | M16.1 |
| De kus blijft het kantelpunt; keerpunt M16.5 | gedaan | M16.5 (Durk verklapt Veendam en de bal in de limo), commit 803587887 |
| Mem schrijft Tessa (Tessa zwijgt erover) | gedaan | A3.3 (stil appje) |
| Sjabbe introduceert Bezit als data-beat | gedaan als appje, **nu ook in persoon: K3** | A3.2 was een stil appje, clue "Een stek aan de kade" bij M13; K3 "Het havenkantoor in de nacht": Sjabbe in het havenkantoor, de sleutel, "Jelle koopt, jullie beheren" |
| Lammerts havenkantoor is het eerste pand dat zij beheren | **ontbrak als beat, nu K3** | homebase.js had het thuis, het verhaal gaf het nooit als pand; K3 geeft de sleutel (alleen de scène: Bezit zelf (#1095) is niet aangeraakt) |
| Eigen test voor dit werkpakket | **ontbrak, nu** | `verhaal_wp345_test.mjs` (WP4-deel), naast `akte3_test` en `akte34_beats_test` |

## WP5, akte 4 (#1128)

| Eis | Stand | Waar |
|---|---|---|
| Akte 4 heeft een doel: de bal terughalen in Bourtange | **ontbrak in `WHY.zuid`, nu aangepast** | `WHY.zuid` zei "Bewijs ... en een team om samen iets te beginnen"; nu: de bal terughalen van Jelle voordat hij hem in Bourtange aan zijn oma geeft, met het bewijs en de jury als stappen. De leads M17 tot en met M21 noemen het doel al |
| Jelle zichtbaar, vaker dan zeven regels | gedaan | 16 regels in R4.0, M17.2, M17.3, J5, M19.2, T4.2, M20.3, M21.2; commit 79e8c63ff |
| Mem's lijn vooraf duidelijk | gedaan | O5 (Mem: "Straks. Eerst het Ontzet."), A4.1 ("Nog vier dagen"), M18.4 |
| Trein en Bourtange niet meer alleen in stille appjes | gedaan | M18.4 (Bourtange) en M21.2 (Zuidhorn) zijn telefoontjes van Mem |
| Het bewijs van M18 heeft een aanleiding | gedaan | R4.0 (Rikus: de chat noemt twee Stadjers), M18.1 (Tessa: wij zijn de dieven); afloop in M26.2 |
| Juryregel in beurten met Berend | gedaan | M19.3 |
| M21.4 een gesprek in plaats van een rollenlijst | gedaan | M21.4 (ruzie Geesje en Klaas, Tammo faalt, Tinus via Henk) |
| Voetbal-aanloop (Veendam, het dorpsteam van Tessa) | gedaan | R4.0b en A4.2 (Femke), V1 tot en met V3 (b25dfa6c0), B4 (autogesprek) |
| M17.1 niet meer onderbroken door "Even over zaterdag" | gedaan | het moment staat in O7 |
| Vier dagen in plaats van vijf | gedaan | A4.1 "Nog vier dagen" |
| Test `akte4_test` | bestaat | 196 controles groen |

## Wat er is bijgebouwd

| Stap | Akte | Plek | Wat |
|---|---|---|---|
| K1 Het land achter de pastorie | 2, na N5 | de pastorie in Warffum [53.3888, 6.5690] | Geesje, Tessa en Tammo: het bordje TE HUUR, de sleutel van de schuur; opent in het verhaal de Landbouw- en boerderijwereld (de poort `farm` zelf bestond al) |
| K2 De kade in de ochtend | 2, na M11 | de haven van Zoutkamp [53.3377, 6.2986] | de ochtend na de sterren: Tessa "Ik zag je kijken. Ik keek ook."; Tammo "Ik wist het al lang." |
| K3 Het havenkantoor in de nacht | 3, na M13 | de Eemshaven [53.4395, 6.8350] | Sjabbe in persoon: Bezit, de sleutel van het havenkantoor, "Jelle koopt, jullie beheren" |

Techniek: activiteiten zonder beloning, kosten of vlag (`added: true`), scène als ondertitelpraat bij aankomst, migratie zoals N1 tot en met N12 en J1 tot en met J6: een oude save voorbij het invoegpunt telt ze als gedaan, een oude save ervoor speelt ze (`storymigratie_k_test`, 28 controles). De coördinaten zijn schattingen: controleer in beeld dat de gids op een begaanbare plek uitkomt. Bron van de scènes: `docs/verhaal/nieuw/09-script-akte2.md` (K1, K2) en `09-script-akte3.md` (K3), gebouwd met `build_story_data.mjs` (prefix K erbij).

**Samen spelen.** Een K-stap is van de speler die hem speelt (eigen voortgang, #429). Een gast speelt hem niet voor de host en er gaat niets over het net dat er niet al was; wie later aansluit mist hooguit een zin. Geen nieuw netwerkbericht, dus geen nieuwe coöp-test; `storymigratie_k_test` dekt de voortgang.

## Humorbeats (voorstel)

Vier voorstellen in `game/storydata/humor.k.json`, elk met drie varianten en een neutrale terugval, nog niet door het paneel beoordeeld (ze staan als "niet beoordeeld" in [HUMOR-KEUZELIJST.md](HUMOR-KEUZELIJST.md)): HK-01 Geesje "Dat hoeft ook niet.", HK-02 Tammo "Dat je je koffie met melk drinkt.", HK-03 Tessa "Hij is lauw.", HK-04 Sjabbe "Dat is mijn zin."

## Stemmen

De nieuwe K-regels van een spreker met een stem staan op `scripts/voice_wacht.json` (na `tts_lines_list.mjs` en `voice_wacht.mjs --write`); de rest is bewust alleen tekst. De opname volgt in de TTS-ronde.

## Nog open

- De 3D-uitwerking van de dagdroom in T2 en de 3D-prop van het prikbord (beeld nodig).
- Beeld en gehoor: K1 tot en met K3, de aankomstradius, de leestijd en het plaatsen van de gids.
- `akte2_doelen_test`, `akte3_test` en `storyflow_nieuw_test` hebben wereldgegevens nodig en zijn in deze worktree overgeslagen.
- Bestaand en niet van deze ronde: `humor_test` meldt de id's HN-05 tot en met HN-08 dubbel (`humor.ronde4.json` en `humor.ronde5.json`).
