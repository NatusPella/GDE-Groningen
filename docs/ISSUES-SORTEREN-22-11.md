# Issues sorteren 22-11

Aanleiding: de eigenaar vroeg of met de nieuwe versie (0.65) de open issues dicht kunnen. Nagelopen: 94 van 207 open issues (zonder label hertest, wacht-beeld, eigenaar of klaar-op-branch), op basis van `git log origin/main --grep "#n"`, de code en de tests. Alleen licht gecontroleerd (node-tests); geen Electron, niets in beeld bekeken.

## Aantallen

| Categorie | Betekenis | Aantal |
|---|---|---|
| A | gebouwd en getest op main, geen visueel deel: gesloten | 11 |
| B | gebouwd, visuele of hoor-controle nodig: label wacht-beeld | 37 |
| C | deels gebouwd (of epic): comment met wat ontbreekt | 33 |
| D | niet gestart | 13 |

Epics, issues met label eigenaar en bugs die visueel gecontroleerd moeten worden zijn niet gesloten.

## Tabel

| Nummer | Titel | Cat. | Bewijs |
|---|---|---|---|
| #1167 | Personagedossiers: elk personage een volledige castingkaart (wonen per akte, achtergrond, relaties) | A | game/js/characterdossiers*.js; scripts/characterdossiers_test.mjs (16/16, 84 dossiers) |
| #1165 | Interieurs pakket 9: bereikbaarheidsaudit en dekkingsplan (fasen 1 t/m 4) | A | 3fc7a64cb, 483c66254; scripts/interieur_dekking_test.mjs (67 controles) |
| #1158 | Tuning: onderdelen reizen niet mee als een eigen auto bij een medespeler wordt neergezet | A | 926acfb28 (TUNING_VELD in coopbezit.js); scripts/coopbezit_test.mjs (17/17) |
| #1140 | 12 Nederlandse bestandsnamen in game/js naar Engels (ADR 0027) | A | e7ee86607, 6d27d541e e.a. (hernoemd op main); scripts/naamtaal_check.mjs (0 fouten), naamtaal_test (8/8) |
| #1135 | Verhaal WP12: lichte reputatie (fame, kind, buurt) per speler | A | ab6948b4d, 6b53243c9, 84317dd35; scripts/reputation_test.mjs (37/37) |
| #1119 | Verhaalcanon: Tammo en Tessa zijn net afgestudeerd | A | 410e3d171; scripts/verhaalcanon_test.mjs (4 groepen) |
| #1107 | Voetbalcarrière 1/12: spelers, ratings en clubs (data en koppeling aan de sim) | A | eea593f86; scripts/voetbal_spelers_test.mjs (12 groepen), voetbal_botsim (100 wedstrijden) |
| #1105 | Bezit 10: balans, exploits en prestaties | A | 1cf1e79c5, e35258402; scripts/bezit_exploits_test.mjs (21 tests), economie_sim_test (7/7) |
| #1104 | Bezit 9: Samen spelen: claim, omtrek van medespelers en meewerken | A | fc9131513, 01ab2250c; scripts/bezitnet_test.mjs (20/20), scripts/bezitcoop_test.mjs (12/12) |
| #1097 | Bezit 2: bezit-opslag (gde-bezit-v1), prijsmodel en namen | A | 0d312d414; scripts/bezit_test.mjs (23/23) |
| #1096 | Bezit 1: data en stabiele ID's voor percelen en panden | A | 602a48536; scripts/bezit_index_test.mjs (22/22) |
| #1180 | Zomervariatie per kalenderdag: hitte, bewolkt, bui met onweer, mist, regenboog, kustbries, warme avond | B | 54cd7b660, 8fdf393ab; scripts/summerday_test.mjs. Controle: hitte, bui, mist en regenboog in beeld |
| #1178 | De 3D-routelijn loopt door een gebouw; de route moet de snelste zijn (eigenaar) | B | 7b27ce27c, 0fe865a09, 46a57e951 (routeregels, gebouwaudit, docs/ROUTEREGELS.md). Controle: de 3D-routelijn in beeld langs een rit door een bebouwde buurt |
| #1176 | Pauzemenu: te veel lege ruimte tussen kop en tabs, nutteloze omschrijving, Loopbaan alles rechtsonder | B | e1bceaf18, c4b14d79e. Controle: het pauzemenu (kop, tabs, Loopbanen) in beeld |
| #1169 | Moeilijkheid per save: niveau en opties, kaart bij een nieuw spel, Instellingen > Moeilijkheid | B | 4bbc24e44, 792cfa0d4, 5fba53780 (tabblad Moeilijkheid, niveau zichtbaar). Controle: Instellingen > Moeilijkheid en de kaart bij een nieuw spel in beeld |
| #1168 | Wereldkleur: subtiele DS3-kleurtaal voor de 3D-wereld (grading, instelling Uit/Subtiel/Drukwerk) | B | game/js/worldgrade.js, worldgrade3d.js, worldcolormode.js; scripts/worldgrade_test.mjs; docs/WERELDKLEUR-VERIFICATIE-21-11.md. Controle: Uit/Subtiel/Drukwerk in beeld (draaiboek in de verificatiedoc) |
| #1166 | Meer SFX: 221 nieuwe opnames en een centrale geluidstabel (SFX ronde 5) | B | b7dea5302, 6315a5e2d, b2e4e252e (SFX ronde 6, 76 van 100 gekoppeld). Controle: de nieuwe geluiden op het gehoor (docs/SFX-LUISTER.html) |
| #1159 | Samen spelen: ping op een gekozen kaartpunt en een waypoint delen (ook in de auto) | B | 7dc79ba08, 4d9f79ff1 (ping en doel delen). Controle: een ping op de kaart met twee spelers, ook in de auto |
| #1157 | Voetbalcarrière: koppel voetbalsamen.js aan coopnet.js en registreerWedstrijd | B | 383127b30, dc7ba1bac (testbank over TCP). Controle: een echte Samen-voetbalwedstrijd met twee instanties |
| #1145 | Cutscenes: spreker staat niet in de scène (4 cutscenes) | B | 92fdbd025 (test: elke spreker in de scene en in beeld). Controle: de vier cutscenes in beeld |
| #1144 | Cutscenes: spreker niet in beeld tijdens zijn regel (6 cutscenes) | B | 816af9284 en 92fdbd025 (cutscene-audit). Controle: de zes cutscenes in beeld: spreker in beeld tijdens zijn regel |
| #1134 | Verhaal WP11: dialoogvorm met overlap, onderbreking en stilte (ov, cut, pause) | B | bcca67ff2; scripts/dialoogvorm_test.mjs (22/22). Controle: de overlap, onderbreking en stilte op het gehoor (geen bugindruk bij Durk en Douwe) |
| #1131 | Verhaal WP8: ontgrendeling per akte met migratieregel (storygate) | B | 796763ede, 77ec8b618; scripts/unlockgate_test.mjs (41/41). Controle: de gedimde startplek met een zin van het personage in het spel |
| #1125 | Verhaal WP2: overgangsscenes en telefoontjes (bridges) tussen missies | B | 7095df4d3, 07fc2950d (storybridge, twaalf scenes O1-O12). Controle: de overgangsscenes in beeld en in het gehoor |
| #1124 | Verhaal WP1: akte 1 laat het motief zien (opening, aanloop Rikus, Oma, Henk, een spelregel voor de bal) | B | c86dcb309, 07fc2950d (opening akte 1 toont het motief). Controle: de opening en de aanloop in beeld |
| #1118 | Voetbalcarrière 12/12: sponsors als panden in de wereld (parodiebedrijven, koppeling aan Bezit) | B | a14b6fe6f (sponsors, pandkoppeling). Controle: sponsorpanden in de wereld in beeld |
| #1115 | Voetbalcarrière 9/12: wereld, beeld en geluid (shirts, publiek, fluit, trainende teams) | B | 1bfc9db46 (publiek, trainende figuren). Controle: publiek, shirts en fluit in beeld en op het gehoor |
| #1114 | Voetbalcarrière 8/12: Samen spelen (Tammo en Tessa, teamgenoten, tegenstanders, beloning per speler) | B | 05fff1ae7, 1ef152fd3, 9697cc8b2 (derby, klem, beloning). Controle: een Samen-voetbalwedstrijd met twee spelers |
| #1113 | Voetbalcarrière 7/12: clubbezit als tak van Bezit (aandeel in een club, stadion, omzet) | B | 2d09829b5 (clubaandelen), a14b6fe6f. Controle: het subtabblad Club in beeld |
| #1111 | Voetbalcarrière 5/12: rollen Trainer en Manager, transfers en AI-clubs | B | d9cc1c53c, f45ef097e (tabs Trainer en Manager). Controle: de tabs Trainer en Manager in beeld |
| #1109 | Voetbalcarrière 3/12: ontwikkeling, training, vorm, vermoeidheid en blessures | B | f1ed5ceee, 4a09b1ac8, 726b07c14 (vijf oefeningen). Controle: de trainingsoefeningen in beeld |
| #1103 | Bezit 8: productieketen, dynamische prijzen en events | B | 8e78032fd, 67f154bfa, e35258402 (ketens, markt, events). Controle: de keten en de events in beeld |
| #1101 | Bezit 6: tak Percelen: gebruik, schaal, AI-personeel, vee en beheerscherm | B | c2b98f479, 47fd1f5e0 (vee in het beheer, Dieren-kaart). Controle: het beheerscherm met vee in beeld |
| #1100 | Bezit 5: wereldmarkering, minimap en streamen | B | ee6565cae, 0583b4919 (palen met borden, pins, grenslijn). Controle: palen, pins op kaart en minikaart in beeld |
| #1099 | Bezit 4: menu Bezit (Land en bedrijf), start na akte 1 en Mijn bezit | B | 2792474ac, 45a0da536 (menu Land en bedrijf). Controle: het menu Land en bedrijf in beeld |
| #1098 | Bezit 3: kaartlaag "Te koop", perceelkaart en kopen | B | 506924d8d (kaartlaag Te koop, perceelkaart). Controle: de kaartlaag en de aankoop in beeld |
| #1011 | Spelersmenu en Samen-spelen-flow: UX flink beter | B | b107c12bc e.a. (vier echte vensters Samen spelen). Controle: de Samen-vensters in beeld |
| #1010 | Escape-menu: UX per tab beter (playtest 0.64.0) | B | 1c2420155, d29ff55a5, 046774cad. Controle: de tabs van het Escape-menu in beeld |
| #1005 | Farming: zichtbaar werk, veldstanden, HUD-strook en kaartstatus (audit en eerste bouw 20-11) | B | fd1fe3da6 (kaartfilter Alleen oogstklaar), 912317fd5. Controle: zichtbaar werk, veldstanden en de HUD-strook in beeld |
| #998 | Designsysteem v3: telefoon met parodie-apps | B | cabc78405, f6b80bd4a (telefoon, Kiekdoar-nieuws). Controle: de telefoon met parodie-apps in beeld |
| #997 | Designsysteem v3: pauzemenu en kaart | B | 88b89a179, c59d8c17e, 99814fa3e (pauzemenu en kaart in DS3). Controle: pauzemenu en kaart in beeld |
| #994 | Designsysteem v3: beeldregressie per scherm in drie resoluties | B | 25af243b8, f7e7fd861 (beeldregressie 1280x800, 1920x1080 en 4K). Controle: een echte beeldregressierun en keuring van de uitslag |
| #993 | Designsysteem v3: HUD-proef in zeefdruk, door de eigenaar gekeurd | B | f7175c869, a7916eb32 (HUD in zeefdruk). Controle: de HUD-proef door de eigenaar |
| #992 | Designsysteem v3: galerij, token- en componenttest en Rustig drukwerk | B | a21868cbe, edcfb886a, 6bf3934cc (componenten, Rustig drukwerk). Controle: de galerij en Rustig drukwerk in beeld |
| #980 | Escape-menu's nog veel meer AAA-kwaliteit geven | B | 1c2420155, 55143d4e0, ac09285e7. Controle: de menu's in beeld |
| #959 | Je kunt over sommige objecten niet heen springen of erop klimmen | B | bd6a3bd4f, 112649af4 (klimmen op balen en kisten). Controle: klimmen en springen over objecten in het spel |
| #956 | Missies die zich binnen horen af te spelen ook binnen laten plaatsvinden | B | a405e91cb, b37c583dc (binnenmissies, kamercamera). Controle: de binnenmissies in beeld |
| #833 | Voertuiginterieurs op LOD's en een eerste-persooncamera in de hele game | B | 18e90f3df, 5a73886eb, 44b4d5fcd (interieurs op LOD, eerste persoon). Controle: de eerste-persooncamera in meerdere voertuigfamilies |
| #1181 | Epic Wereld levend: dagelijkse evenementen en dierenleven per kalenderdag | C | e5515c8d7, 82179a580, 660cf8ac1 (epic). Ontbreekt: epic blijft open: kinderen (o.a. #1180) wachten op beeld |
| #1179 | Voetbal als uitzending: de hele wedstrijd voorop met tv-regie, commentaar, kaarten en wissels | C | 63bcf0238, 2d09829b5, 9cd1cc4e8 (commentaar op seizoen en carrière). Ontbreekt: de tv-regie, de uitzending van de hele wedstrijd, kaarten en wissels in beeld |
| #1172 | Verhaaltrailer ontdek (75 s) opnemen en controleren (epic #1170) | C | a75f1155f (opnamelijst en fasetijden in het filmscript). Ontbreekt: de opname van de trailer van 75 s en de controle zijn niet gedaan |
| #1170 | Opening, verhaaltrailer en benchmark opnieuw voor DS3 en het nieuwe verhaal (epic) | C | epic. Ontbreekt: epic blijft open: trailer (#1172) en benchmark niet opnieuw opgenomen |
| #1163 | Interieurs pakket 7: integraties (Bezit-beheer, kleding, Homebase, missies in een pand) | C | game/js/bezitinterior.js en voetbalbezit.js bestaan. Ontbreekt: integratie met kleding, Homebase en missies in een pand; geen commit met #1163 |
| #1162 | Interieurs pakket 2 t/m 6: soorten (winkel, horeca, kantoor, woning, kerk, station, bibliotheek, garage, publiek) | C | gebouwd onder #1150 (interiorkinds.js, interior_pandtypes_test.mjs). Ontbreekt: alle soorten (winkel, horeca, kantoor, woning, kerk, station, bibliotheek, garage) nog niet bevestigd |
| #1161 | Interieurs pakket 1: verticale slice (deur, hal, collision, camera, lui bouwen) | C | gebouwd onder #1150: cec4c32ad, 078946e7a, 45c90c6d3. Ontbreekt: geen commit met #1161 zelf; controleer de verticale slice (deur, hal, collision, camera, lui bouwen) in het spel |
| #1155 | Epic: Autotuning (Pimp my Ride) | C | 4b9ecb287 e.a. (11 commits, epic). Ontbreekt: epic blijft open |
| #1151 | Epic Kleding: losse kledingstukken, kast per personage, winkel, NPC-outfits | C | epic. Ontbreekt: epic blijft open |
| #1150 | Epic Interieurs: veel panden echt te betreden, in het pand zelf (zoals Watch Dogs 2) | C | cec4c32ad e.a. (14 commits, epic). Ontbreekt: epic blijft open |
| #1139 | Verhaal WP16: Jelle als eindbaas (handlangers per akte, panden-plakje, bureaucratische ontknoping) | C | 6a7a6a880 (offerte per akte, handlanger bij zijn streken). Ontbreekt: het panden-plakje en de bureaucratische ontknoping zijn niet terug te vinden op main; beeld ontbreekt |
| #1132 | Verhaal WP9: beeld en Electron-verhaaltest voor de nieuwe scenes en de recapkaart | C | scripts/qa en storytest bestaan; geen commit met #1132. Ontbreekt: beeld en Electron-verhaaltest voor de nieuwe scenes en de recapkaart ontbreken |
| #1121 | Verhaal: rode draad, introducties en natuurlijke dialogen (epic) | C | 2844030b1, 803978c29, 9ad4e2f01 (epic). Ontbreekt: epic blijft open |
| #1116 | Voetbalcarrière 10/12: balans, prestaties, tellers en docs (doorlopend) | C | 8e9d8ec57 (elf prestaties, docs). Ontbreekt: doorlopend: de economiesim moet nog met de laatste voetbalpakketten (clubdividend, sponsors) worden bijgewerkt |
| #1106 | Epic: Voetbalcarrière (Tessa speelt, Tammo regelt: van talent tot kapitein en manager) | C | 8e9d8ec57, 359e6d0e5 (epic). Ontbreekt: epic blijft open: 12 pakketten, nog niet bekeken |
| #1095 | Bezit: percelen, bedrijven en productieketen voor de hele provincie (epic) | C | fc9131513, ee6565cae, 2792474ac (epic). Ontbreekt: epic blijft open |
| #1086 | Spullen: een 3D-model bij elk ding, net als bij voertuigen | C | 2636e3300, 039bdd9e2, 81a090bd7 (spullen ronde 2). Ontbreekt: nog niet elk ding heeft een eigen 3D-model; een lijst van wat kaal blijft ontbreekt |
| #1074 | Lekken: restpunten (caches, pollers, audio, rendertargets) | C | 962a99855 (LRU kaartbladen, reizigersgeometrie, placeSoon). Ontbreekt: nog open: lampByKey, pollers pauzeren bij document.hidden, kart-motor en coop-stemmen stop(), rendertargets in placeshot, gde:save-text zonder try/catch; Electron-soak |
| #1072 | Opstart: 1.186 modulebestanden bundelen of voorladen? | C | 2b9039d1c (modulepreload-hint voor skatestatus en padtest). Ontbreekt: de meting in Electron (loadcheck, __loadMarks) en de keuze tussen preload, codecache en bundelen ontbreken |
| #1071 | Ongebruikte voiceline-clips opruimen: 37,8 MB | C | ca1ba273f (979 bestanden opgeruimd, 96 naar 72 MB). Ontbreekt: scripts/audio_unused.mjs meldt nog 381 ongebruikte bestanden (6,8 MB); beslis of die blijven (tekst nog in code) of weg |
| #1065 | Geheugenlekken en stabiliteit | C | 0e8266976, db14c5d7b, 3a818fb32 (lekken gedicht, docs/LEKKEN-21-11.md). Ontbreekt: de Electron-soak en de open lijst uit docs/LEKKEN-21-11.md |
| #1062 | Tessa komt van het platteland | C | 912317fd5, 47d99fdfe (farmbonus, Boerendochter, wissel). Ontbreekt: Kiekdoar-kop en voetbalregels koppelen aan karakterbonus.js; geen beeld |
| #1049 | AI-auto's snijden hoeken bij kruispunten en schaven langs gevels (restpunt verkeersaudit) | C | 9a6fb3769, d9fb507c8 (wegtoets, taxirit-audit). Ontbreekt: de bochtsnelheid en het stuurdoel per voertuiglengte zijn niet aangepast; STRICT=1 in verkeer_wereld_test toont nog gevelschaafjes |
| #1048 | Verkeers-AI: ~13 KB kortlevend afval per auto-stap (budget per frame) | C | 570535e7e, d9fb507c8 (minder afval per stap). Ontbreekt: de rest van de ca. 13 KB per stap; per functie meten met een eigen teller |
| #1045 | Wereldaudit: gebouwen op weg of water, bomen in water, brugdekken: herbouw nodig | C | 3f75c6783, ae0e827c3, 571a3af17 (filters tegelwereld). Ontbreekt: de wereldherbouw en een nieuwe world_audit-run ontbreken |
| #1033 | Heli-missie: logica en HUD na/tijdens de vlucht (Ballonjacht, M12) | C | 70a9b0edb (vaste heli-plekken op de echte kaart; staat op branch tts-niks-22-11, nog niet op main). Ontbreekt: merge naar main, en de HUD na en tijdens de vlucht in het spel |
| #1025 | Duivenspotmissie: doelen in de wereld | C | scripts/qa/duifspot_beeld.mjs bestaat; geen commit met #1025 op main. Ontbreekt: uitslag van de beeldrun en de doelen in de wereld vastleggen |
| #1022 | Binnenmissies spelen echt binnen | C | 1ad43c380 (binnenset-test; staat op branch tts-niks-22-11, nog niet op main). Ontbreekt: merge naar main en spelen van een binnenmissie |
| #1006 | Designsysteem: alle verwijzingen naar v1, v2 en v3 opruimen | C | 2a84550b7, bec0f3344, 88b89a179 (20 commits). Ontbreekt: de laatste verwijzingen naar v1, v2 en v3 opruimen en tellen |
| #985 | Epic: de 52 open QoL-bevindingen uit de review van 17-11 (0.66.0) | C | 222 commits (epic). Ontbreekt: epic blijft open: 52 punten |
| #955 | Missies mogen meer aankleding/AAA-niveau krijgen | C | bdaa3acca, 676007eb7, 407b6b26a (M08, M15, duivenspot, 103 commits). Ontbreekt: doorlopend: nog niet elke missie is gedaan; per missie beeld |
| #804 | Frametijd-staart: streaming-hitches en frame pacing meten en dempen (punten 53 en 55 uit de UX-top100) | C | 0e70da93a, d71c5a68f, 770a39d5d (Perf #804). Ontbreekt: 4 punten in de lijst open; Electron-fps-meting ontbreekt |
| #735 | TTS-opnameronde: alle nog op te nemen stemregels (670 regels, 671 clips) | C | b90cc3314 e.a. (TTS-ronde, 252 regels nog open). Ontbreekt: de overige opnames (252) en de bijbehorende voice_coverage-run |
| #1183 | Releasegate: world-fase meldt PASS terwijl 35 items niet draaiden (zoekt alleen game/world, niet desktop/build/game/world) | D | geen commit; alleen docs/GATE-RAPPORT-22-11.md |
| #1182 | Plaatsstempel (wijkkaart) kan over een schermvullend scherm hangen (kaart, tuning-werkplaats) | D | geen commit; alleen docs/GATE-RAPPORT-22-11.md |
| #1149 | Meldingen: gelijke duur en een aflopend balkje voor bijna alle meldingen | D | geen commit of code |
| #1143 | Vertrekbord: eerstvolgende treinen als tijdlijn | D | geen commit |
| #1133 | Verhaal WP10: stemmen opnieuw opnemen (ca. 350 regels, TTS-ronde) | D | geen commit; hangt aan #735 |
| #1082 | Reviewfixes 0.65 | D | branch reviewfixes-a-21-11 niet op main (geen commit met #1082) |
| #1068 | Reviewfixes 0.65 | D | verzamelissue, geen commit |
| #1067 | Meten: kost het discard in de boommaterialen (edgefade3d) GPU-tijd op Laag en Midden? | D | geen commit; meting nog niet gedraaid (docs/PERF-RONDE-21-11.md) |
| #1043 | QoL-restpunten uit #985: besluiten en groter werk | D | geen commit; 7 open vinkjes |
| #1037 | Vaarroutelijn op het water in plaats van boeien | D | geen commit |
| #1032 | Flits en volledige wereldherbouw bij verloren beeldcontext (Nikky, 0.64.0) | D | geen commit; meetpunten in docs/PERF-MEETPUNTEN-21-11.md |
| #944 | Je kunt iemand niet van de fiets af slaan | D | geen commit; docs/BUGS-OPEN-20-11.md |
| #116 | Playtest: nieuwe versies proberen en feedback geven | D | lopend playtest-issue, nooit sluiten |

Epics (9) kregen geen comment en blijven open. Gesloten zijn alleen de A-issues; de B-issues kregen het label wacht-beeld en een comment met de gewenste controle.
