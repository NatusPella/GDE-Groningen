# Personagedossiers (21-11): elk personage een goed gevulde castingkaart

Opdracht van de eigenaar (21-11): *"Zorg ook dat elk personage een goed gevulde detailkaart heeft (ook al is niet alles van toepassing). Dus ze wonen ergens, ze hebben een bepaalde achtergrond, leeftijd, relaties, etc."* Aanvulling (21-11): behandel het verhaal als een film, met castingkaarten, een castlijst en een wie-komt-wanneer-matrix; de woonplek wisselt per akte; Jelle's oma draagt de eierbal-kwestie; gaswinning en aardbevingen verdwijnen uit het verhaal; de extra kaart in het escape-menu (Verhaal › Personages) is de plek waar de dossiers in het spel komen.

Dit document is de index en de werkwijze. De bron van waarheid is de data zelf: `game/js/characterdossiers*.js`. Wijkt dit document af van de data, dan is dit document de fout. Het canonblad blijft [VERHAALCANON-21-11.md](VERHAALCANON-21-11.md) voor de besluiten; de dossiers houden de uitwerking per personage bij, zodat het canonblad die niet dubbel hoeft te bevatten.

## 1. Waar staat wat

| Wat | Waar |
|---|---|
| Schema, hulpfuncties, regels (puur) | `game/js/characterdossiers_base.js` |
| Hoofdpersonen en de kern eromheen (Tammo, Tessa, Rikus, Jelle, Oma Trijntje, Mem, Beppe) | `game/js/characterdossiers_leads.js` |
| Bijrollen van het verhaal (Berend, Durk, Douwe, Bert, Sjabbe, Hoving, Henk, Sjoerd, Jelmer, Geesje, Klaas, Dijkstra, Lammert, Roelfien, Wubbo, Tinus, Willemien, Geert, de torenwachter) | `game/js/characterdossiers_story.js` |
| Kleine rollen, rolfiguren uit het script, het Ommeland, radio en media, groepen, familie buiten beeld, kandidaten uit de inspiratielijst | `game/js/characterdossiers_minor.js` |
| Relaties (één keer verklaard, per kant afgeleid) | `game/js/characterdossiers_relations.js` |
| Samengevoegd met opzoekfuncties en `cardFacts()` voor de kaart | `game/js/characterdossiers.js` |
| De kaart in het spel ("Wie is dit?") | `game/js/verhaalui.js` (Verhaal › Personages) |
| Consistentietest | `scripts/characterdossiers_test.mjs` |
| Castingboekje (markdown en HTML) | `scripts/characterdossiers_export.mjs` |

**Waarom een JS-module en geen JSON.** Het spel, de tests en de export lezen hem zonder netwerkopvraag of laadstap (zoals `characters.js` en `storycast.js`); de wereld en het verhaal blijven data in de repo. JSON zou een fetch of een importattribuut vragen en geeft geen eigen opmaak. Bestandsnamen en sleutels zijn Engels (naamtaal), de waarden Nederlands.

## 2. Wat een kaart bevat

Elke kaart heeft elk veld; wat niet van toepassing is, zegt `n.v.t.`. `card()` vult vergeten velden zelf met `n.v.t.`, dus een kaart is nooit leeg.

| Groep | Velden |
|---|---|
| Identiteit | `id` (zoals in `characters.js`), `speakerKey` (sleutel in `script.json`), `status` (`canon` of `candidate`), `tier` (hoofdrol, bijrol, kleine rol, cameo, genoemd, groep), `name`, `nick`, `age`, `pronoun` (`hij`/`zij` alleen waar het canon is, anders `neutraal`) |
| Wonen | `homePlace`, `homeAddress` (in woorden, geen echt adres), `household`, **`homeByAct`** (waar ze slapen per akte: 1 tot 5, 6 = Deel 4, E = epiloog, of `all`) , `mapLink` |
| Achtergrond | `origin`, `education`, `work`, `employer` (verzonnen), `hobbies` |
| Karakter | `traits` (3 tot 5), `tagline`, `want` (doel), `need` (behoefte), `fear` (wond of angst), `habits` (tics en running gags), `arc` (boog per akte) |
| Taal en stem | `dialect`, `rhythm`, `phrases`, `voice` en `voiceTag` (uit `scripts/tts_lines_list.mjs`) |
| Uiterlijk | `look`, `outfitRole` (rolpool van epic-kleding), `outfitByAct` (kostuum per akte; voor Tammo en Tessa de set-id's `tammo:stadjer` enzovoort) |
| In het verhaal | `firstStep`, `lastStep`, `introducedBy`, `storyRole`, `needsFromDuo`, `minigames`, `canonNotes`, `sensitive` |
| Bekend-vanaf | `reveal`: per veld `met` (bij de ontmoeting) of een verhaalstap die klaar moet zijn |
| Herkomst | `canon`: de velden die uit een bron komen; **al het andere dat is ingevuld is een voorstel** en blijft overridebaar |

Geboortejaren worden afgeleid (`birthYears()`: 2026 min de leeftijd, twee kandidaten) en nooit getoond; het canonblad schrijft geen geboortejaren uit. Voor Oma Trijntje (92) en Mem (91) geeft `ageIn(d, 1953)` 19 en 18: jonge bakksters, dus de regel "zeventig jaar" is een afronding.

### Relaties

Een relatie is een **rand** met twee kanten: `a`, `b`, `type` (family, friends, colleagues, rivals, neighbours, romantic, mentor, work, acquaintance), `aIs` en `bIs` (wat A voor B is en omgekeerd), `since`, `tone`, `aKnows` en `bKnows` (wat ze van elkaar weten), `shared` (een gedeeld verhaaltje) en `from` (bekend-vanaf in het spel). De kant van elk personage is afgeleid (`relationsFor(id)`), dus A→B en B→A kunnen niet uit elkaar lopen. Er zijn 101 relaties; 44 staan in een bron, de rest is voorstel.

### Wie komt wanneer

De matrix (personage × akte) en het scènebord (per stap: wie praat, wie is nieuw) komen **niet** uit de dossiers maar uit `game/storydata/script.json`: de gesproken regels per akte zijn de waarheid. De dossiers bevatten alleen `firstStep` en `lastStep` (ook voor wie genoemd wordt of niet praat); de test eist dat die niet in tegenspraak zijn met het script (de eerste stap niet later dan de eerste spreekbeurt, de laatste niet eerder dan de laatste spreekbeurt, op aktenivo). Het introductieprotocol ("een ander personage kondigt aan, de scène toont één trek") staat in de schrijfregels van de verhaal-epic; de kolom *Nieuw in beeld* van het scènebord laat zien waar een personage voor het eerst in beeld komt.

## 3. De kaart in het spel (Verhaal › Personages)

De bestaande personagekaart (naam, rol, citaat, korte bio, "Voor het duo", "Samen in") krijgt eronder **Wie is dit?**: leeftijd, woonplaats, werk, herkomst en wat iemand voor Tammo en voor Tessa is. Alles via `cardFacts(id, { met, done })`:

- wie je niet ontmoette toont niets (de tegel bestaat dan ook niet);
- standaard komt een veld zodra je het personage ontmoette (`reveal` ontbreekt of zegt `met`);
- een veld met een spoilerrisico heeft een stap (`reveal: { homePlace: 'M20' }` voor Mem: haar woonplaats pas na het beleg van Bourtange);
- een relatie heeft `from` (Jelle als kleinzoon van Mem pas vanaf M20).

Geen nieuwe schermopmaak: dezelfde `dl`-regels en dezelfde eyebrow als de rest van het scherm. De voortgang is per speler lokaal (dezelfde opslag als "ontmoet", #429). **Samen spelen:** elke speler ziet zijn eigen kaart, zoals zijn eigen "ontmoet"-stand; een gast die later aansluit verliest niets en er is niets te herstellen; geen netwerkbericht. De test dekt de regel (`characterdossiers_test.mjs`, "de kaart in het spel").

## 4. Werkwijze: een personage toevoegen of wijzigen

1. Zoek of het personage al bestaat (`node scripts/characterdossiers_export.mjs --id=<id>`). Een nieuwe naam die al ergens anders voorkomt (Geesje, Lammert, Roelf, Femke, Hindrik) krijgt een andere: zie §6.
2. Maak een `card({...})` in het bestand van de juiste laag (`leads`, `story` of `minor`). Vul wat bekend is en zet de **velden uit een bron** in `canon: [...]`. Wat je zelf verzint is een voorstel: laat het buiten `canon`.
3. Voeg relaties toe in `characterdossiers_relations.js`: één rand per paar (`e(a, b, type, aIs, bIs, since, tone, aKnows, bKnows, shared)`), met `from` waar de kaart niet alles mag laten zien. Elk personage heeft minstens één relatie.
4. Heeft het personage een stem? Zet `voice` zoals in `scripts/tts_lines_list.mjs` (`CAST`); de test vergelijkt. Praat het in het script, zet dan `speakerKey` op de sleutel in `script.json`.
5. Is het een nieuw personage in `characters.js`? Geef dezelfde `id`. De test eist dat elk personage van `characters.js` een dossier heeft.
6. `node scripts/characterdossiers_test.mjs`, `node scripts/text_audit.mjs` en (voor een stap) `node scripts/storydata_test.mjs`. Daarna `node scripts/characterdossiers_export.mjs --html` voor het boekje.
7. Past een besluit van de eigenaar het canonblad aan? Dan zet je dat in [VERHAALCANON-21-11.md](VERHAALCANON-21-11.md) **en** in het veld `canonNotes` van de betrokken kaarten.

De verhaal-lead hoeft het canonblad niet dubbel bij te houden voor personagefeiten (leeftijd, woonplaats, relatie, uiterlijk): die staan in de dossiers. Het canonblad houdt de besluiten en de tijdlijn.

## 5. Besluiten van de eigenaar die in de dossiers zijn verwerkt (21-11)

| Besluit | In de dossiers |
|---|---|
| Tammo en Tessa zijn 24, werkloos, vijf jaar vrienden sinds de eerste Kiezelweek | `age`, `work`, relatie tammo-anita |
| Tessa: pro-voetbalster in wording; Tammo kan er niks van en helpt haar shinen | `want`, `minigames`, `canonNotes` van beiden |
| Jelle's **oma** draagt de eierbal-kwestie; geen moeder-variant | relatie jelle-mem (kleinzoon en oma), `origin` van Jelle, Mem is 91 |
| Gaswinning en aardbevingen verdwijnen uit het verhaal | geen veld leunt erop; Willemien verhuist om een neutrale reden; de test weigert die woorden |
| Het thuis wisselt per akte (soms Beppe, soms Paddepoel, soms elders) | `homeByAct` voor iedereen, voor Tammo en Tessa per akte |
| De kaart zit in het escape-menu, niet in dagboek of telefoon | `verhaalui.js` |
| Verhaal als film: castingkaarten, castlijst, wie-komt-wanneer | `characterdossiers_export.mjs`, kolommen `arc`, `outfitByAct`, `firstStep`, `lastStep` |

## 6. Gevonden inconsistenties en open punten

Niets hiervan is in de speltekst aangepast; de dossiers hebben een keuze gemaakt en noemen die bij `canonNotes`. De verhaal-lead beslist.

1. **Mem is Jelle's oma (besluit eigenaar), maar de teksten zeggen moeder.** `docs/personages.md` ("Jelle's moeder", "een zoon die zijn moeder gelijk wil geven"), `characters.js` (bio Jelle en Mem), de STIJLGIDS (feitenblad: "Moeder van Jelle"), de Steam-tekst en delen van het script (Foar mem, "Ja, mem" blijft kloppen als Jelle bij haar opgroeide: voorstel) moeten mee. De dossiers zeggen oma en kleinzoon.
2. **Gaswinning en aardbevingen.** Het script van Deel 4 (M27 tot M29, Willemien, de wisselwoning) en de naamkaart van Willemien (`storyarc_nieuw.js`) leunen er nog op. Het dossier geeft Willemien een neutrale reden (een grote verbouwing).
3. **Naamdubbelingen.** Geesje komt vier keer voor (kosteres in Warffum, presentatrice van Radio Proat, Boerin Geesje, Oma Geessien); Lammert twee keer (havenmeester, Schipper Lammert); Roelf drie keer (Boer Roelf, Kroegbaas Roelf, Rotor Roelf) naast Roelfien; Femke twee keer (festivalmaker, en de keeper uit de inspiratielijst, die in het dossier Marit heet); Hindrik (Boer Hindrik, en de buurman uit de inspiratielijst, die Auke heet). Voorstel: de kosteres is ook de presentatrice; hernoem Boerin Geesje en Schipper Lammert.
4. **Roelfien.** De synopsis zegt Oma's nicht, `storyarc_nieuw.js` Oma's oudste klant. Het dossier houdt beide open (relatie "nicht (of oudste klant)").
5. **Jelle's leeftijd** is niet vastgelegd. Voorstel 36 (Mem 91, dus een kleinzoon). Durk en Douwe 38.
6. **Tessa's verleden**: "zeven plekken voor haar tiende" botst zacht met "boerderij tot haar achtste" (VERHAALCANON §3.4). Het dossier legt beide naast elkaar en lost het niet op.
7. **Tammo's stemtag** zegt "in his thirties", de canon zegt 24 (besluit 21-11: de tag blijft voor de bestaande clips). Het dossier markeert het.
8. **Het telefooncontact "Mam"** (`phone.js`) is één contact met een Groningse weersregel, terwijl `karakterbonus.js` er Tessa's moeder van maakt (met Pa). Het dossier heeft Tessa's mam en pa (canon) en Tammo's ouders (voorstel); het contact zou per speler moeten wisselen.
9. **Dijkstra**: de naamkaart zegt stap M11, de synopsis M12; het script heeft hem vanaf M11.
10. **`characters.js` `missions`** gebruikt nog oude H-codes (`H3`, `H4`, ...). De chips onder "Samen in" in Verhaal › Personages zoeken die in de nieuwe stappen (M01 tot M30) en vinden dus niets. Voorstel: laat de chips de dossier-stappen of `STEP_ALIAS` gebruiken. Niet aangepast.
11. **Dirk of Durk**: in de code en docs heet de handlanger Durk. De dossiers volgen de code. Het bedrijf heet in de code Us Mem Snacks (niet Usmem).
12. **Kandidaten uit de inspiratielijst** (buurman met duivenhok Auke Veldkamp, Tessa's nichtje Lieke, de frituurmentor Sietske Postma, dorpsteamvriendin Marit, plus Tammo's en Tessa's ouders) staan als `status: 'candidate'` of `mentioned` en zijn volledig voorstel; ze doen niet mee in het spel tot de eigenaar ja zegt.

## 7. Overzicht (ruwe tabel)

Gegenereerd met `node scripts/characterdossiers_export.mjs --matrix`. Het volledige castingboekje (alle kaarten en relaties) maak je met `node scripts/characterdossiers_export.mjs --html --out=<map>`.

### Castlijst

| Id | Naam | Rol | Leeftijd | Woont | Eerste | Laatste | Status |
|---|---|---|---|---|---|---|---|
| tammo | Tammo Wierenga | hoofdrol | 24 | Paddepoel, Grunn | M00 | M30 | canon |
| anita | Tessa Mulder | hoofdrol | 24 | Paddepoel, Grunn | M00 | M30 | canon |
| rikus | Rikus Haverkamp | bijrol | 25 | Oosterparkwijk, Grunn | M00 | M30 | canon |
| jelle | Jelle Terpstra | bijrol | 36 | Ljouwert, Fryslân | M03 | M30 | canon |
| trijntje | Trijntje Wierenga-Boelens | bijrol | 92 | Oosterparkwijk, Grunn | M07 | M30 | canon |
| mem | Gerda Terpstra | bijrol | 91 | Ljouwert, Fryslân | M07 | M26 | canon |
| beppe | Hinke Wiersma | bijrol | 88 | net over de grens bij Kollum, Fryslân (westgrens van de provincie) | M01 | M24 | canon |
| berend | Berend Bos | bijrol | 72 | Schildersbuurt, Grunn | M01 | M30 | canon |
| durk | Durk Oosting | bijrol | 38 | Ljouwert, Fryslân | M02 | M30 | canon |
| douwe | Douwe Oosting | bijrol | 38 | Ljouwert, Fryslân | M02 | M30 | canon |
| bert | Bert Hoekstra | bijrol | 79 | Stationsplein, Grunn | M03 | M30 | canon |
| sjabbe | Sjabbe Kamminga | bijrol | 58 | centrum, Grunn | M02 | M25 | canon |
| bewaarder | Mevrouw Aleida Hoving | bijrol | 81 | Grunn, bij het museum | M03 | M19 | canon |
| henk | Henk Pol | bijrol | 66 | Grunn, Haren-kant | M06 | M22 | canon |
| sjoerd | Sjoerd Dijkman | bijrol | 26 | studentenwijk, Grunn | M05 | M05 | canon |
| jelmer | Jelmer Slagter | bijrol | 21 | Grunn | M01 | M21 | canon |
| geesje | Geesje Tuinstra | bijrol | 84 | Warffum, Hogeland | M09 | M30 | canon |
| klaas | Klaas Brouwer | bijrol | 71 | Noorderhaven, Grunn | M11 | M30 | canon |
| dijkstra | Dokter Pieter Dijkstra | bijrol | 52 | Grunn, UMCG-kant | M11 | M12 | canon |
| lammert | Lammert Visser | bijrol | 66 | Eemshaven en Delfzijl | M13 | M30 | canon |
| roelfien | Roelfien Hofman | bijrol | 58 | Oldambt | M15 | M30 | canon |
| wubbo | Wubbo Zijlstra | bijrol | 61 | Veendam, Veenkoloniën | M17 | M30 | canon |
| tinus | Tinus Kloosterman | bijrol | 64 | Westerkwartier | T4 | M30 | canon |
| willemien | Willemien Bolt | bijrol | 67 | Loppersum, Appingedam-kant | M27 | M29 | canon |
| geert | Geert Hulshof | bijrol | 55 | Poelestraat, Grunn | M16 | M16 | canon |
| torenwachter | Jacob Bruining | bijrol | 88 | d'Olle Grieze (Martinitoren), Grunn | M01 | M26 | canon |
| harm | Harm Dijkhuis | kleine rol | 63 | Zuidelijke Ringweg, Grunn | n.v.t. | n.v.t. | canon |
| snackbar | de snackbarhouder van de Oosterpoort | kleine rol | 61 | Oosterpoort, Grunn | M06 | M07 | canon |
| wiebe | Wiebe Hazenberg | kleine rol | 58 | Diepenring, Grunn | n.v.t. | n.v.t. | canon |
| rotor | Roelf van Eelde | kleine rol | 54 | Eelde | M12 | M12 | canon |
| femke | Femke van der Meer | kleine rol | 33 | Grunn | n.v.t. | n.v.t. | canon |
| hilly | Hilly Boelens | kleine rol | 70 | Oosterparkwijk, Grunn | n.v.t. | n.v.t. | canon |
| roelf | Roelf Hulleman | kleine rol | 68 | Beijumerweg, Grunn | n.v.t. | n.v.t. | canon |
| hilje | Hilje Hulleman-Jager | kleine rol | 66 | Beijumerweg, Grunn | n.v.t. | n.v.t. | canon |
| aaltje | Koe Aaltje | kleine rol | n.v.t. | weiland in het Ommeland | n.v.t. | n.v.t. | canon |
| grietje | Koe Grietje | kleine rol | n.v.t. | weiland in het Ommeland | n.v.t. | n.v.t. | canon |
| loketbediende | de loketbediende | cameo | 45 | Grunn | M03 | M03 | canon |
| accountmanager | de accountmanager van Wiebelwerk | cameo | 34 | Grunn | M18 | M18 | canon |
| jurylid | het jurylid van de Snackprijs | cameo | 60 | Grunn en omstreken | M15 | M26 | canon |
| buschauffeur | de streekbuschauffeur | cameo | 52 | Zoutkamp | T2 | T2 | canon |
| kustwachter | de kustwachter | cameo | 47 | Lauwersoog | M11 | M11 | canon |
| kermisexploitant | de kermisexploitant | cameo | 56 | reizend, standplaats Oldambt | M16 | M16 | canon |
| deurwaarder | de deurwaarder | cameo | 49 | Grunn | M14 | M14 | canon |
| student | de student in de kroeg | cameo | 20 | Grunn | M16 | M16 | canon |
| boer | de boer op het erf | cameo | 60 | Hogeland | M09 | M29 | canon |
| kind | het kind in het publiek | cameo | 8 | Grunn | M26 | M26 | canon |
| buurvrouw | de buurvrouw die voor twintig kookt | cameo | 62 | Loppersum | M29 | M29 | canon |
| terrasgast | de terrasgast op de Grote Markt | cameo | 30 | Grunn | M01 | M01 | canon |
| boer_hindrik | Hindrik de Jong | cameo | 74 | aan de rand van de provincie | n.v.t. | n.v.t. | canon |
| oma_geessien | Geessien Meijer | cameo | 83 | Ommeland | n.v.t. | n.v.t. | canon |
| trainer_bouke | Bouke Rienks | cameo | 38 | Haren | n.v.t. | n.v.t. | canon |
| kroegbaas_roelf | Roelf Brandsma | cameo | 57 | Haren | n.v.t. | n.v.t. | canon |
| schipper_lammert | Lammert Veenstra | cameo | 69 | Starkenborghkanaal en Zuidlaardermeer | n.v.t. | n.v.t. | canon |
| kroegbaas_tjakko | Tjakko Eisinga | cameo | 48 | Sauwerd | n.v.t. | n.v.t. | canon |
| molenaar_fenna | Fenna Wiersema | cameo | 51 | Winsum | n.v.t. | n.v.t. | canon |
| koster_egbert | Egbert Knoop | cameo | 72 | Bedum | n.v.t. | n.v.t. | canon |
| boerin_geesje | Geesje de Vries | cameo | 55 | Stedum-kant (Ommeland) | n.v.t. | n.v.t. | canon |
| koster_menno | Menno Zuidema | cameo | 70 | Loppersum | n.v.t. | n.v.t. | canon |
| kroegbaas_wilma | Wilma Hoving-Kok | cameo | 52 | Loppersum | n.v.t. | n.v.t. | canon |
| strandtent_tineke | Tineke Smit | cameo | 44 | Zuidlaardermeer | n.v.t. | n.v.t. | canon |
| ome_jan | Jan Postma | cameo | 78 | bij Ten Boer | n.v.t. | n.v.t. | canon |
| koe_geertje | Koe Geertje | cameo | n.v.t. | weiland in het Ommeland | n.v.t. | n.v.t. | canon |
| verdwaalde_fries | de verdwaalde Fries | cameo | 22 | Fryslân | n.v.t. | n.v.t. | canon |
| verdwaalde_toeriste | de verdwaalde toeriste | cameo | 40 | de Randstad | n.v.t. | n.v.t. | canon |
| hilbrand | Hilbrand Kuipers | kleine rol | 44 | Grunn | n.v.t. | n.v.t. | canon |
| ubbo | Ubbo (de telefoon-app) | cameo | n.v.t. | in de telefoon | n.v.t. | n.v.t. | canon |
| verkeersinformatie | de verkeersinformatie | cameo | n.v.t. | de radio | n.v.t. | n.v.t. | canon |
| navigatie | de navigatiestem | cameo | n.v.t. | de auto | n.v.t. | n.v.t. | canon |
| kiekdoar | de Kiekdoar-redactie | cameo | n.v.t. | de telefoon (nieuwssite) | n.v.t. | n.v.t. | canon |
| gmusic | de jingle-dj van G-Music | cameo | n.v.t. | de radio | n.v.t. | n.v.t. | canon |
| politie | de agenten en agentes van Grunn | groep | n.v.t. | Politiebureau, Grunn | n.v.t. | n.v.t. | canon |
| stadjers | de voorbijgangers van Grunn | groep | n.v.t. | Grunn | n.v.t. | n.v.t. | canon |
| opa | Opa Wierenga | genoemd (buiten beeld) | n.v.t. | Stad (overleden) | n.v.t. | n.v.t. | canon |
| tammo_pa | Gerrit Wierenga | genoemd (buiten beeld) | 52 | Oosterparkwijk, Grunn | n.v.t. | n.v.t. | kandidaat |
| tammo_mam | Anke Wierenga-Wiersma | genoemd (buiten beeld) | 51 | Oosterparkwijk, Grunn | n.v.t. | n.v.t. | kandidaat |
| tessa_mam | Mam (Tessa's moeder) | genoemd (buiten beeld) | 52 | een dorp op de klei (bewust vaag) | n.v.t. | n.v.t. | canon |
| tessa_pa | Pa (Tessa's vader) | genoemd (buiten beeld) | 54 | een dorp op de klei (bewust vaag) | n.v.t. | n.v.t. | canon |
| tante_aaltje | Tante Aaltje | genoemd (buiten beeld) | 55 | Fryslân | n.v.t. | n.v.t. | canon |
| buurman | Auke Veldkamp | kleine rol | 71 | Paddepoel, Grunn | n.v.t. | n.v.t. | kandidaat |
| lieke | Lieke Mulder | kleine rol | 10 | een dorp op de klei | n.v.t. | n.v.t. | kandidaat |
| frituurmentor | Sietske Postma | kleine rol | 63 | Haren | n.v.t. | n.v.t. | kandidaat |
| marit | Marit Hoogland | kleine rol | 24 | Veendam | n.v.t. | n.v.t. | kandidaat |

### Wie komt wanneer (callsheet)

| Personage | Akte 1 | Akte 2 | Akte 3 | Akte 4 | Akte 5 | Deel 4 |
|---|---|---|---|---|---|---|
| Tammo Wierenga | 95 | 61 | 61 | 59 | 50 | 18 |
| Tessa Mulder | 127 | 83 | 69 | 74 | 74 | 24 |
| Rikus Haverkamp | 18 | 7 | 4 | 3 | 26 | 3 |
| Jelle Terpstra | 9 | 17 | 8 | 7 | 21 | 4 |
| Trijntje Wierenga-Boelens | · | 15 | ○ | 6 | 16 | 2 |
| Gerda Terpstra | · | ○ | ○ | 9 | 12 | · |
| Hinke Wiersma | ○ | ○ | ○ | ○ | ○ | · |
| Berend Bos | 11 | ○ | ○ | 32 | 17 | 16 |
| Durk Oosting | 1 | 2 | 7 | 7 | 9 | 3 |
| Douwe Oosting | 1 | 3 | 5 | 7 | 5 | 2 |
| Bert Hoekstra | 5 | ○ | ○ | ○ | 6 | 1 |
| Sjabbe Kamminga | 10 | ○ | ○ | 1 | 3 | · |
| Mevrouw Aleida Hoving | 4 | ○ | ○ | 1 | · | · |
| Henk Pol | 4 | ○ | ○ | 2 | 7 | · |
| Sjoerd Dijkman | 9 | · | · | · | · | · |
| Jelmer Slagter | 10 | ○ | ○ | 2 | · | · |
| Geesje Tuinstra | · | 10 | ○ | 1 | 5 | 2 |
| Klaas Brouwer | · | 18 | ○ | 1 | 1 | 3 |
| Dokter Pieter Dijkstra | · | 3 | 9 | · | · | · |
| Lammert Visser | · | · | 15 | 1 | 1 | 2 |
| Roelfien Hofman | · | · | 10 | 1 | 1 | 2 |
| Wubbo Zijlstra | · | · | · | 14 | 7 | 3 |
| Tinus Kloosterman | · | · | · | 3 | 13 | 2 |
| Willemien Bolt | · | · | · | · | · | 24 |
| Geert Hulshof | · | · | 3 | · | · | · |
| Jacob Bruining | 2 | ○ | ○ | ○ | 5 | · |
| de snackbarhouder van de Oosterpoort | 1 | 2 | · | · | · | · |
| Roelf van Eelde | · | · | 2 | · | · | · |
| de loketbediende | 9 | · | · | · | · | · |
| de accountmanager van Wiebelwerk | · | · | · | 12 | · | · |
| het jurylid van de Snackprijs | · | · | 3 | 4 | 12 | · |
| de streekbuschauffeur | · | 2 | · | · | · | · |
| de kustwachter | · | 1 | · | · | · | · |
| de kermisexploitant | · | · | 1 | · | · | · |
| de deurwaarder | · | · | 1 | · | · | · |
| de student in de kroeg | · | · | 2 | · | · | · |
| de boer op het erf | · | 1 | ○ | ○ | ○ | 1 |
| het kind in het publiek | · | · | · | · | 1 | · |
| de buurvrouw die voor twintig kookt | · | · | · | · | · | 1 |
| de terrasgast op de Grote Markt | 1 | · | · | · | · | · |

Getal = gesproken regels in het script; ○ = in de akte aanwezig of genoemd zonder regel; · = niet in beeld.

Bronnen: [personages.md](personages.md), [VERHAALCANON-21-11.md](VERHAALCANON-21-11.md), [verhaal/STIJLGIDS.md](verhaal/STIJLGIDS.md), [VERHAAL-SYNOPSIS-21-11.md](VERHAAL-SYNOPSIS-21-11.md), [VERHAAL-INSPIRATIE-21-11.md](VERHAAL-INSPIRATIE-21-11.md), [BEPPE-HUIS-21-11.md](BEPPE-HUIS-21-11.md), [BOERDERIJ.md](BOERDERIJ.md), `game/storydata/script.json`, `scripts/tts_lines_list.mjs`.
