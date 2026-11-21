# Issues-opschoning 21-11

Aanleiding: de eigenaar zag "ziek veel" open issues en vroeg of een deel dicht kan. Dit rapport legt vast wat er op 21-11 is nagelopen, gesloten en bijgewerkt. Bron: `gh issue list` (224 open issues), de commits op origin/main (`146d1bcc7`), de issue-comments en project 5. De ruwe export staat lokaal buiten git (`.work/issues/`).

## Aantallen

| Categorie | Aantal | Wat er mee gebeurde |
|---|---|---|
| Open aan het begin | 224 | |
| A. Klaar en gemerged in origin/main | 15 | gesloten als voltooid |
| C. Dubbel of niet reproduceerbaar | 2 | gesloten als niet gepland |
| B. Klaar op een lokale branch, niet gemerged | 7 | label `klaar-op-branch` plus comment met de branch |
| E. Wacht op eigenaar (label `eigenaar`) | 15 | open gelaten |
| Wacht op beeld of hertest (`wacht-beeld`, `hertest`) | 6 | open gelaten |
| Epics (beschermd) | 8 | open gelaten |
| D. Echt werk, nog open | de rest | labels en bordkolom gecontroleerd |
| Open na de opschoning | 209 | inclusief twee issues die na de export zijn aangemaakt |

Er zijn 17 van de 224 issues gesloten. Dat is bewust streng: bijna alle andere issues hebben wel code op main, maar de agent die ze bouwde schreef er zelf bij dat het niet in beeld is bekeken, dat een deel nog open is, of dat een mens moet hertesten. Zulke issues sluiten tegen het oordeel van de bouwer in zou echte fouten verbergen. Zie "Sluitkandidaten na één beeldronde": dat is de snelste weg naar een veel kleinere lijst.

## Gesloten issues

| Nr | Titel | Reden |
|---|---|---|
| #1089 | Webbuild: idx.inWater is not a function tijdens de openingsfilm (web, eerste start) | A, completed: Fout idx.inWater (a23de445f) |
| #1012 | Nieuwsmelding/popup wordt afgekapt (playtest 0.64.0) | A, completed: Nieuwsmelding afgekapt (78d2879bb) |
| #1028 | Plaatsnaamborden en wegwijzers zijn onverwoestbaar: omver te rijden maken | A, completed: Borden omver te rijden (1d17fb40b) |
| #1031 | Sloten: auto rijdt er soms overheen en de randen zijn kartelig | A, completed: Sloten: rem en rand (21e21133d, d3eeff48c) |
| #1034 | Spelers worden ten onrechte en herhaaldelijk teruggestuurd naar de grens (grenslogica, knooppunten, Dollard) | A, completed: Grensterugzetting (190c7fda7) |
| #1054 | Kaart: de reisopties-kaart is boven afgesneden en dekt de Lagen-knop | A, completed: Reisopties-kaart (7dd7382bb) |
| #1055 | Loopbanen: knop Nu starten is onderaan afgekapt en het vinkje ligt over de pill | A, completed: Nu starten afgekapt (7dd7382bb) |
| #1056 | Penaltyserie-HUD: "0 van 5" in de kop is afgekapt tot "0 VAN" | A, completed: Penaltyserie-kop (e2ee1dd2c) |
| #1058 | Heli-missie: de heli-kaart ligt over de missiekaart linksboven | A, completed: Heli-kaart (f5a36ca86) |
| #1041 | Toetsen en knoppen overal als icoon: nog losse letters in spelertekst (melding Kist Kees) | A, completed: Toetsen als icoon (48e31e44d, 7226d397f) |
| #984 | Laden zet je altijd buiten je flat, ook als je ergens anders opsloeg | A, completed: Laden op de plek van de save (ab9bc3701) |
| #950 | Gesprek met de accountmanager vindt plaats in een weiland i.p.v. een kantoor | A, completed: Accountmanager in kantoorset (2ab7107ca) |
| #844 | Automatische navigatie: Begin hier alleen nu-doelen en meer variatie voor playtesters | A, completed: Acceptatie gehaald: drie Te-doen-rijen (bc87cdc47, 6063384fd) |
| #982 | Samen spelen: sessie viel weg bij een korte netwerkhik, en een gast kon niet meer lopen | A, completed: Samen: netwerkhik en gast lopen, bewezen in vier vensters (db4b8b551) |
| #1017 | Benchmark op een sterke pc: lage score, advies Ultra als Hoog, resultaatscherm leek niet te klikken (0.64.1) | A, completed: Benchmark: cursor en advies (1f2a7fe6c); fps-oorzaak verder in #1015 |
| #1014 | Na de benchmark kun je niets meer aanklikken (playtest Nikky 0.64.0) | C, not planned: Dubbel van #1017 |
| #1094 | Gate 0.65: met de verse wereld falen landfile_test (79 landsporen op het stadsspoor) en country_vehicles_test (politie Ommeland 118 in het water) | C, not planned: Niet reproduceerbaar met verse wereld (landfile_test 38/38) |

Niet gesloten ondanks een commit op main (voorbeelden): #882 en #926 (label `hertest`), #1044 en #1148 (`wacht-beeld`), #1023 (geen beeld van een rijdende NPC-auto), #952 (blijft open voor hertest), #1029 (hertest door de eigenaar), #1007 (een tester op 0.64.0 moet bevestigen), #917 en #919 (geen beeld; blijven open voor een beeldronde). Geen enkel open issue had een commit op main met `Closes #n`; wat daar wel had gestaan is al automatisch gesloten.

Er is geen open issue gevonden dat onder besluit 21-11 (gaswinning, aardbevingen) valt. #1136 noemt de Fjord Frituur nog in de titel (frietwagen-mijlpalen); de code en de changelog zeggen Snackwagen. Hij hoort bij de verhaal-epic, is al gebouwd (storymilestones.js) en blijft open tot die epic is gekeurd.

## Klaar op een branch (categorie B)

Label `klaar-op-branch` (groen, "Gebouwd op een branch, wacht op merge/verificatie") met een comment bij elk issue.

| Nr | Branch |
|---|---|
| #1059, #1060 | samen-overname-21-11 |
| #1174 | spullen-wapens-21-11 |
| #1175 | hud-ronde-21-11 |
| #1078 | minimap-rand-21-11 |
| #1075 | keycap-opening-21-11 |
| #1016 | ramen-dichtbij-21-11 |

Ook de epics hebben nog werk op eigen branches (epic-bezit-21-11, epic-tuning-21-11, epic-interieurs-21-11, epic-verhaal-21-11, epic-kleding-21-11). Die zijn niet gelabeld omdat epics beschermd zijn.

## Sluitkandidaten na één beeldronde

Open issues waarvan de oplossing al op origin/main staat en waarvan een agent-comment "Gedaan" meldt, maar die nog niet in een draaiend spel zijn bekeken. Bij een groene beeldronde, of een akkoord van de eigenaar, kunnen ze dicht (105 issues, waaronder een aantal kinderen van epics):

#1169, #1148, #1147, #1141, #1139, #1138, #1137, #1136, #1135, #1134, #1131, #1130, #1129, #1128, #1127, #1126, #1125, #1124, #1123, #1120, #1118, #1117, #1116, #1115, #1114, #1113, #1112, #1111, #1110, #1109, #1108, #1107, #1093, #1092, #1088, #1086, #1085, #1084, #1083, #1081, #1080, #1079, #1077, #1076, #1069, #1066, #1064, #1063, #1053, #1052, #1050, #1047, #1046, #1044, #1040, #1039, #1038, #1036, #1029, #1027, #1021, #1020, #1019, #1015, #1013, #1011, #1010, #1008, #1007, #1006, #1005, #1004, #1003, #1002, #1001, #997, #996, #994, #991, #990, #989, #987, #986, #983, #981, #980, #963, #962, #959, #958, #956, #955, #953, #952, #943, #926, #922, #919, #917, #882, #846, #833, #804, #735, #116

## Wat open blijft per thema

- **UI, HUD, kaart en menu** (47): #915, #922, #980, #988, #989, #990, #992, #993, #994, #995, #996, #997, #998, #999, ...
- **Verhaal en cutscenes** (34): #63, #846, #962, #986, #987, #1046, #1062, #1063, #1119, #1121, #1122, #1123, #1124, #1125, ...
- **Overig** (22): #59, #60, #64, #65, #83, #116, #353, #357, #358, #952, #956, #959, #985, #1022, ...
- **Interieurs, kleding, tuning en spullen** (20): #833, #943, #955, #1013, #1076, #1086, #1147, #1150, #1151, #1152, #1153, #1154, #1155, #1156, ...
- **Prestaties en geheugen** (15): #57, #804, #953, #1008, #1015, #1016, #1039, #1040, #1044, #1052, #1057, #1065, #1066, #1074, ...
- **Bezit en economie** (14): #1095, #1096, #1097, #1098, #1099, #1100, #1101, #1102, #1103, #1105, #1113, #1118, #1136, #1163
- **Samen spelen** (14): #72, #983, #991, #1001, #1011, #1059, #1060, #1061, #1087, #1104, #1114, #1157, #1159, #1160
- **Verkeer en vervoer** (14): #882, #926, #944, #1018, #1019, #1020, #1027, #1037, #1038, #1047, #1048, #1080, #1085, #1143
- **Wereld en beeld** (12): #917, #919, #958, #963, #1007, #1025, #1029, #1030, #1032, #1045, #1073, #1090
- **Voetbal** (11): #981, #1106, #1107, #1108, #1109, #1110, #1111, #1112, #1115, #1116, #1117
- **Geluid en stemmen** (6): #62, #735, #1021, #1049, #1070, #1166

Bord (project 5): alle open issues staan nu op het bord. Bugs in Bugs, wensen in Wensen, epics in Bezig, issues op een branch of met hertest of wacht-beeld in Review. Alle open issues hebben nu één type-, één impact- en één kostenlabel (#1007 kreeg impact-hoog en kosten-S).

### Top 10 open bugs (impact, dan kosten; zonder epics en eigenaar-issues)

| Nr | Titel | Labels |
|---|---|---|
| #1039 | Render/GPU-prestaties: drawcalls en frametijd omlaag in de stad (Hoog/Ultra, AMD) | kosten-L, impact-zeer-hoog |
| #1040 | Geheugen: JS-heappiek 3,1 GB en laadtijd (bisect 0.50 naar 0.63) | kosten-L, impact-zeer-hoog |
| #1052 | Regressie opwarmfase sinds 0.58: stad wordt niet meer vastgepind en streamt in de eerste minuut (bisect) | kosten-L, impact-zeer-hoog |
| #1007 | Textuur error ? alles rond dom de auto blijft zelfde textuur. | kosten-S, impact-hoog |
| #1029 | Derde persoon in de trekker: scherm vol cabine, geen zicht op bestuurder en weg | kosten-S, impact-hoog |
| #1145 | Cutscenes: spreker staat niet in de scène (4 cutscenes) | kosten-S, impact-hoog |
| #882 | Taxi: tijdens de rit is er geen taxi te zien, alleen een progressbar en skip-knop | kosten-M, impact-hoog, hertest |
| #917 | Z-fighting op gebouwen | kosten-M, impact-hoog |
| #919 | Bruggen zijn volledig transparant | kosten-M, impact-hoog |
| #926 | Treinreis toont geen trein of omgeving, alleen progressbalk en skip | kosten-M, impact-hoog, hertest |

### Top 10 open wensen (zelfde volgorde)

| Nr | Titel | Labels |
|---|---|---|
| #991 | Designsysteem v3: inkten als tokens en lettertypen zelf hosten | kosten-M, impact-zeer-hoog |
| #993 | Designsysteem v3: HUD-proef in zeefdruk, door de eigenaar gekeurd | kosten-M, impact-zeer-hoog |
| #995 | Designsysteem v3: HUD die verschijnt bij behoefte, minimap en wanted | kosten-L, impact-zeer-hoog |
| #1101 | Bezit 6: tak Percelen: gebruik, schaal, AI-personeel, vee en beheerscherm | kosten-L, impact-zeer-hoog |
| #1102 | Bezit 7: tak Bedrijven: panden, omzet, personeel, beheer en klanten | kosten-L, impact-zeer-hoog |
| #1161 | Interieurs pakket 1: verticale slice (deur, hal, collision, camera, lui bouwen) | kosten-L, impact-zeer-hoog |
| #915 | Bevestiging bij afsluiten met melding dat voortgang wordt opgeslagen | kosten-S, impact-hoog |
| #1122 | Verhaal WP-A: Aanwijzingen weg uit het pauzemenu en recapkaart Waar waren we? (gebouwd, wacht op beeld) | kosten-S, impact-hoog, wacht-beeld |
| #1123 | Verhaal WP0: ruggengraat per akte en toetsen (ritme, introductie, leads) | kosten-S, impact-hoog |
| #1130 | Verhaal WP7: Deel 4 koppelen aan de wagen en de open wereld | kosten-S, impact-hoog |

## Wacht op eigenaar

| Nr | Titel |
|---|---|
| #57 | Webversie publiceren: plek kiezen (itch.io of GitHub Pages) en uploaden |
| #59 | Spelers die de game niet kennen laten testen en echte controllers proberen |
| #60 | IARC-leeftijdsvragenlijst invullen (doel PEGI 18 / USK 18) |
| #62 | Voor het publiek maken: merkenregister (GDE, Grootste Diefstal Ever), secrets-scan, muziekproduct in LICENTIES.md |
| #63 | YouTube: kanaal, gameplaytrailer en verhaaltrailer met Tessa |
| #64 | Steam-klaar: regels nalopen, SteamPipe-build, overlay- en Deck-test, achievements, planning |
| #65 | 1.0: twee weken alleen bugfixes, definitieve trailer, 1.0.0 met downloads en webversie |
| #72 | Social-preview-plaatje en website invullen op GitHub; credits van een gameontwikkelaar en een uitgever samenvoegen met de disclaimer |
| #83 | Publiceren: checklist afronden |
| #353 | Luistertest door een mens: het gemurmel onder regels zonder opname en de sirene in M02.intro |
| #357 | Gronings en Fries in de straatgesprekken laten nalopen door een kenner (rest van #190) |
| #358 | Luistertest door een mens: de nieuwe effecten (zwaaien, klikje, huisdeuren, motor uit, alarm, camera) en de niveaus (rest van #173) |
| #988 | Meer geluid in de wereld: luistertest door een mens van de nieuwe SFX-set (UI, hengelen, streeklagen) |
| #1070 | Muziek van 192 kbps naar 128 kbps en WAV-barks naar ogg: -80 MB pakket |
| #1090 | Pages-workflow voor de game-webversie (handmatig, owner-guard, wereld uit release) |

Wacht op beeld of hertest: #882, #926, #1044, #1087, #1122, #1148.

Beschermde epics (niet gesloten): #985, #1095, #1106, #1121, #1150, #1151, #1155, #1170.

## Wat niet is gedaan

- Er is geen code gewijzigd en niets gepusht. Geen issue is in een draaiend spel getest; "klaar" betekent hier: commit op origin/main, tests en changelogregel, en geen openstaand restpunt in de laatste agent-comment.
- Issues zonder commit op main en zonder comment (bijvoorbeeld #1009, #1061, #1067, #1071, #1072, #1074, #1073, #1082) zijn niet op dubbel werk beoordeeld. #1068 en #1082 zijn allebei een verzamelissue voor de reviewfixes 21-11; de coördinator kan ze samenvoegen.
- Kinderen van epics (Bezit 1 tot 10, Voetbalcarrière 1 tot 12, Verhaal WP0 tot WP16, Kleding en Interieurs) zijn gebouwd en grotendeels gemerged, maar nog niet bekeken. Ze blijven open tot hun epic wordt gekeurd.
- De lijst met sluitkandidaten is op de comments gebaseerd, niet op een eigen controle van elk gedrag.
