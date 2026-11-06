# De lange verover-cutscene per wijk — ontwerp en plan

Status: statische review op `main`, HEAD `41340dd4` (de cutscene-code is gelijk aan `e5e8b712`; daarna
kwamen alleen docs- en dev-commits). Niets runtime getest. Dit hoofdstuk hoort bij de cutscene-review
van 6-11-2026.

## 1. Wat de eigenaar wil

De korte scènes per wijk (nu bij het **eerste bezoek**: een naamkaartje of een korte flyover) mogen
verdwijnen. Daarvoor terug: **één lange cutscene op het moment dat je een wijk hebt veroverd** —
een tocht dóór de wijk, met wat er uniek is, en per veroverbare wijk een echt goede scène.

Dat is een goede ruil, om drie redenen die in de code te bewijzen zijn:

1. **De huidige wijkfilm is bijna nooit te zien.** De flyover is een instelling die standaard
   **uit** staat (`settings.js:60` `wijkFilm: false`; de kaart is de standaard, `pausemenu.js:539`).
   Zelfs wie hem aanzet, ziet hem zelden: alle ontdekmomenten (`wijk`, `landmark`, `ommelanden`)
   delen één cooldown van **210 s** en er geldt een algehele onderbrekingspauze van **40 s**
   (`hudbus.js:103-115`). Met 66 wijkpunten in de stad betekent dat: hooguit één wijkfilm per
   3,5 minuut, en de meeste spelers zijn dan alweer ergens anders. De kaart die wél afgaat is
   één regel tekst plus hooguit drie landmarks (`cinematics.js:846-883`).
2. **De flyover is inhoudelijk mager.** `wijkStreetShot` (`camerapath.js:177-217`) kiest één rechte
   straat bij de speler, glijdt daar in 11 s doorheen en stijgt over de daken terug naar de
   spelercamera (`cinematics.js:897-909`). Eén voice-regel van Rikus
   (`WIJK_LINES`, 33 buurten + generieke pool, `cinematics.js:687-741`). Er gebeurt niets: geen
   mens, geen voertuig, geen prop, geen uniek moment.
3. **De beloning voor veroveren is nu een HUD-bericht van 7 s.** `gebiedenlive.js:132-136`
   (`betaal`) zet titel, grap, geld en de safehouse-sleutel in één bericht. Voor het grootste
   "ik heb dit gebied helemaal gedaan"-moment in het spel is dat te weinig; het is de plek waar een
   film wél een beloning is in plaats van een onderbreking.

## 2. Belangrijk: "wijk" betekent op dit moment twee verschillende dingen

Dit is de grootste logische fout in het huidige systeem en hij moet eerst beslist worden, anders
bouwt de verover-film op drijfzand.

| Laag | Bron | Schaal | Waar de speler het ziet |
|---|---|---|---|
| **Wijkpunten** (huidige kaart/flyover) | `stad.json` → `meta.neighbourhoodPoints`, 66 punten | stad Groningen, deels buurten | "Nieuwe wijk"-kaart, `wijkBlurb` in de HUD, `WIJK_LINES` |
| **Verover-wijken** | `game/grenzen.json` → `wijken` (CBS), 123 in de provincie, **20 in de gemeente Groningen** | CBS-wijken ("Centrum", "Oud-Zuid", "Nieuw-Noord", "Haren-West e.o.") | Veroverd-paneel, kaartlaag Veroverd, titel "Wijkheld van …" |
| **Woonplaatsen** | `grenzen.json` → `woonplaatsen`, 202 | BAG-woonplaatsen (Haren, Zuidhorn, Delfzijl, …) | Veroverd-paneel, "Burgemeester van …" |

Gevolg: je verover­t als speler "Centrum" (CBS-wijk: 8 buurten van Binnenstad tot UMCG), maar de kaart
bij het eerste bezoek heet "Binnenstad" of "Stationsgebied" (een buurtpunt). Het thuisfront van het
verhaal is nog duidelijker: het buurtpunt heet "Oosterparkwijk", maar dat punt valt in de CBS-buurt
**Bloemenbuurt** en dus in de verover-wijk **Oud-Oost**; "Oosterparkwijk" bestaat in `grenzen.json`
helemaal niet als buurt. De lange film hoort bij de **eenheid die je echt verover­t** (CBS-wijk of
woonplaats), niet bij het buurtpunt. Stel dus vast: **de verover-film hoort bij de veroverde eenheid**;
de buurtpunten blijven alleen voor de kleine plaatsnaam in de HUD (of vervallen).

Een tweede naamprobleem: `weergaveNamen` (`gebieden.js:94-99`) haalt het CBS-nummer voor nette namen
weg ("Wijk 03 Veendam-kern" → "Veendam-kern"), maar **namen zonder plaatsnaam blijven lelijk**:
Pekela heeft "Wijk 00" en "Wijk 01", Westerkwartier heeft "Wijk 13" t/m "Wijk 17".
Een titel als *"Wijkheld van Wijk 14"* of *"Wijkheld van Wijk 00"* mag nooit in beeld komen; ook niet
op de kaart, in het Veroverd-paneel of in een filmtitel. Fix: elke kale "Wijk NN" krijgt de naam van
de dichtstbijzijnde woonplaats of het dorp erin (bv. "Wijk 14 (Westerkwartier-Noord)"), of de laag
wordt voor die gemeenten overgeslagen.

## 3. Wat er per wijk uniek is (en dus in de film moet)

De wereld heeft meer dan genoeg unieke inhoud; de film hoeft niets te verzinnen. Per veroverde
eenheid is dit beschikbaar:

- **De taken die je deed** — letterlijk de plekken van de film. `ind.gebied.get(gid).taken`
  (gevuld in `gebieden.js:126-139`) geeft de taak-id's; `ind.taak` geeft per taak `soort`, `naam`,
  `x`, `y`. Dus: de missiestart, de bijbaan, de minigame, de vondst — dat zijn de stops.
- **Landmarks** — `w.map.meta.landmarks` (naam, x, y, `LANDMARK_HEIGHT` in `cinematics.js:49-52`).
- **Echte gebouwen en plekken** — `stad.json`, `mapextras.json`, `facilities.json`,
  `echteplekken.json`, `streekplekken.json`, `waterplekken.json` (allemaal al in de wereld geladen).
- **Bewoners en voertuigen** — `models3d_people.js`, `vehicle.js`, `wildlife.js`, plus de sets van
  `cutscenehost.js` (`PROP_MAKERS` r. 79-98).
- **Geluid** — Rikus (narrator, `linevoice.js`) heeft al stemopnames voor dit soort regels; de
  wijkkaart gebruikt hem nu ook.

Hieronder staan de echte inhoud per stadswijk (uit `grenzen.json` + `stad.json` + `echteplekken.json`,
via een wegwerpscript met punt-in-polygoon). Dat is de basis van de scène-uitwerking.

## 4. Raamwerk: één film, data-gedreven, per veroverde eenheid

### 4.1 Trigger en flow

Nu: laatste taak → `G.markeer()` in `gebieden.js:256-271` → `betaal()` toont 7 s HUD-bericht
(`gebiedenlive.js:132-136`).

Wordt:

```
laatste taak klaar
  → beloning geregistreerd (p.beloond, huis, geld)     [blijft zoals het is]
  → film in de wachtrij (niet meteen: eerst rust)
  → als het rustig is: verover-film (25-40 s), letterbox, skipbaar
  → daarna de bestaande beloningskaart (titel, geld, huis) — 7 s, zoals nu
  → klaar; de wijk staat op de kaart met vlag
```

Rustvoorwaarden (in deze volgorde): geen lopende cinematic (`!isCinematicActive()`), geen
resultaatkaart (`!isBannerUp()`), geen missie/bijbaan/race (`playerBusy(w, ['missionPhase',
'sideJob','challenge','race'])`), geen respawn, geen pauzemenu/kaart (`isPauseMenuOpen()`,
`isMapOpen()`), geen telefoongesprek (`narrativeBusy()`), niet in de lucht (`aloft(w)` — de
helikopterregel uit `cinematics.js:92-96`), en `sinceCinematic() > 2.5` (`cinematics.js:45`), zodat
een missie-outro en de film niet in elkaar overlopen. Als de speler in een auto zit is dat geen
probleem: de film zet de auto één keer stil (`cinematics.js:328-338`). Let op: `pause: true` pauzeert
op dit moment de wereld en de speler **niet** (#729) — de intocht moet wachten op die fix of de
speler tijdens de film expliciet blokkeren, anders kan hij wegrijden terwijl de camera door de wijk
gaat.

Belangrijk: **niet** door de gewone `mayInterrupt('wijk')`-poort. Die is bedoeld voor optionele
ontdekkingen en heeft 210 s cooldown en 40 s wereldpauze (`hudbus.js:103-115`). De verover-film is
een verhaalbeloning (niveau `story`): hij wacht op rust, maar wordt niet gerantsoeneerd. Voeg
daarom een eigen momentsoort toe (`veroverd: { level: 'story', cooldown: 0 }`) of houd hem buiten
`attention.js` en gebruik alleen de rustcheck hierboven.

### 4.2 Eenmalig, herstart en herbeleven

- De beloning is al eenmalig per profiel (`p.beloond`, `gebieden.js:263-268`) en het profiel staat
  los van de save (`gde-gebieden-v1`, `gebieden.js:8-9`). De film hangt aan die beloning: één keer.
- Randgeval: speler verover­t de wijk, sluit het spel vóór de film, start opnieuw. Het profiel kent
  de beloning, de film is nooit geweest. Oplossing zonder het profiel uit te breiden: de
  verover-paneelknop hieronder, plus bij het laden één keer controleren of er een beloond gebied is
  zonder "gezien"-markering. Wil je dat waterdicht, voeg dan `p.films = []` toe aan
  `nieuwProfiel()`/`normaliseer()` (`gebieden.js:167-180`) en bewaar de gebied-id's — klein en
  achterwaarts compatibel (net als `bezocht`).
- **Herbeleven**: zet in het Veroverd-paneel (`veroverdpanel.js`) bij elk veroverd gebied een knop
  "Bekijk de intocht" (of "Opnieuw bekijken"). Dat lost meteen het probleem op dat een speler de
  film mist als hij wegklikt, en het maakt het paneel levendiger. Dezelfde knop in de
  cutscene-preview (`cutpreview.js`) is gratis voor ontwikkelaars.

### 4.3 Duur en opbouw (25-40 s)

Eén vaste vorm, per wijk gevuld:

| Deel | Duur | Wat |
|---|---|---|
| **1. Aankomst** | 4-6 s | hoog overzicht: kraan of orbit boven het hart van de wijk, de wijk in één beeld |
| **2. Drie tot vijf stops** | 4-6 s per stop | op ooghoogte (1,6 m) langs de plekken van de taken/landmarks; elke stop één regel Rikus |
| **3. Detail/gevoel** | 3-5 s | één uniek ding: een bewoner, dier, voertuig, terras, brug, fabriek, reclamebord |
| **4. Eindbeeld** | 5-7 s | kraan omhoog of orbit om het landmark, de titel "Wijkheld van …" (naamkaart), dan terug naar de spelercamera |

Sluit altijd aan op de live camera zoals `flyInShot` (`cinematics.js:606-632`) en `wijkStreetShot`
(`camerapath.js:200-217`) dat al doen: laatste key = de volgpose van de speler, met `follow` in de
laatste 25 % — anders hangt de camera na de film in de lucht.

### 4.4 Camera: geen nieuw systeem nodig

Er is al alles wat nodig is:

- `pathShot(keys, ease)` voor elke segment (`camerapath.js:20`), met `cut: true` op de grens.
- `clearKeys` (`camerapath.js:79`) en `roofAt` om niet door gebouwen te vliegen.
- `buildingReach(map, x, y)` (`camerapath.js:59`) voor de juiste orbit-afstand om een landmark.
- `orbitShot` (`cinematics.js:942-964`) als voorbeeld van een orbit die zelf een vrije hoek kiest.
- `wijkStreetShot` voor de straatstop; de "home"-sectie is precies de landing die de film nodig heeft.
- `flyInShot` voor de aankomst/landing.

Nieuwe functie: `veroverTourShot(w, gebied, stops)` in `camerapath.js` (of een nieuw
`veroverfilm.js`), die uit de stops een keyframe-lijst per segment bouwt. De scène zelf speelt via
`playCinematic` met een `shot(u, t)`-functie die per tijdvak het juiste segment kiest en op de
segmentgrens `cut: true` teruggeeft. Geen cutscript-def nodig; dat scheelt een tweede regietaal.

### 4.5 Tekst en stem

- Eén stem: **Rikus** (narrator). Hij is al de stem van de wijkkaart (`lineVoiceFor('', text)` in
  `showWijkCard`, `cinematics.js:878-879`) en van "Eerder in GDE" (`story.js:582-620`). Drie tot vijf
  korte regels per film, droog en Gronings, in de toon van `WIJK_LINES` en `banterlines.js`.
- Eén uitzondering per film mag: een bewoner of personage zegt één regel (naamkaart via `fx: naam`,
  zoals `cutscenehost.js:285-287`). Maar alleen als de stem al bestaat (`voicebank.js`), anders wordt
  de film stil of tekst-only.
- Ondertitels: dezelfde `lines`-vorm als elke cutscene; ondertitels en stem blijven automatisch
  synchroon via `attachVoices` (`cinematics.js:275-295`).
- Muziek: de theme duckt al onder gesproken lijnen (`theme.js:24`). Laat de laatste 2 s de
  verover-sting horen (`stings.js`) en daarna de bestaande beloningskaart.

### 4.6 Samen spelen

Dit is het punt waar de film het snelst stukloopt, dus expliciet:

- **De film is van de wereld (de host)**, zoals elke scène: de gastheer speelt hem, gasten horen
  dezelfde stem en zien dezelfde ondertitels.
- **Maar de camera niet.** `playCinematic` met een eigen `shot` wordt niet naar gasten gestuurd;
  `coopcut.js` stuurt alleen `playScript`-scènes als data (`cutscenehost.js:334-336`,
  `coopcut.js:22-38`), en anders ziet een gast alleen de laag "de gastheer kijkt een filmpje"
  (`coopscene.js:20-43`). Voor de belangrijkste beloning van het spel is dat te mager.
- **Oplossing (klein, geen nieuwe scènetaal):** stuur één bericht `{ k: 'verover', id, gid, stops,
  duration, lines }` mee (`coopcut.js` uitbreiden, `coopgast.js`/`coopworld.js` afhandelen). De gast
  bouwt dezelfde tour lokaal uit dezelfde stops (de grenzen en taken zijn bij elke client gelijk) en
  speelt hem met dezelfde `shot`-functie. Dat is klein: vijf stops + vier regels < 2 kB, ruim onder
  `CUT_MAX_CHARS` (32.000, `coopcut.js:11-13`). Wel dezelfde tijd-tik (`cuttijd`) gebruiken die er al
  is, zodat beide schermen gelijk lopen.
- **Als de host skipt**, stopt de film bij de gasten ook (bestaand gedrag, `coopcut.js:131-137`).
  Een gast mag zijn eigen weergave skippen.
- **Late join / wegvallen**: gast die later aansluit ziet de film niet (geeft niets: de beloning is
  per speler en het is een wereld-moment). Val­t de host weg tijdens de film, dan stopt de gast na
  een time-out; toon dan geen tweede beloningskaart.
- **Wie is "de speler" in de film?** De film toont de wijk, niet de avatars. Verberg de
  online-figuren tijdens de film (`hidePlayers: true`, dat doet `cutscenehost.js` al voor
  cutscript-scènes) — anders loopt er een gast door het eindbeeld.

### 4.7 Waar het in de code hoort

| Nieuw/gewijzigd | Wat |
|---|---|
| `game/js/veroverfilm.js` (nieuw, ~150-250 regels) | wachtrij, rustcheck, bouwt de stops uit `ind.gebied`, roept `playCinematic` met de tour-shot, regelt de beloningskaart erna |
| `game/js/gebiedenlive.js` | in `doeTaak`/`betaal`: bij `b.niveau === 'wijk' \|\| 'woonplaats'` de film in de wachtrij zetten i.p.v. meteen het bericht; `betaal` pas na de film |
| `game/js/camerapath.js` | `veroverTourShot(w, gebied, stops, behind)` — herbruikt `pathShot`, `clearKeys`, `buildingReach`, `roofAt` |
| `game/js/cinematics.js` | niets structureels; alleen de film aanroepen (of de wachtrij hier laten lopen, naast `checkTriggers`) |
| `game/js/cutpreview.js` | de films in de previewlijst (net als de huidige scènes) |
| `game/js/veroverdpanel.js` | knop "Bekijk de intocht" per veroverd gebied |
| `game/js/coopcut.js`, `coopgast.js`, `coopworld.js` | `verover`-bericht + lokale replay |
| `docs/GEBIEDEN.md`, `.specs-fire/standards/verhaal.md` | de regel "verover-film" bij de verovering |
| tests | `scripts/veroverfilm_test.mjs` (puur: stops kiezen, duur, eenmalig, geen dubbele beloningskaart), testbankstap in `docs/COOP-TESTBANK.md` |

Risico's: (1) een film starten terwijl de wereld nog streamt (houd de `prewarm`-route van
`playCinematic`/`holdShotTiles` aan, `cinematics.js:251-261`); (2) de beloningskaart twee keer
(huidige `showBanner` dedupliceert op kind+titel, `cinematics.js:1162`); (3) de film na een
missie-outro dubbel laten voelen — vandaar `sinceCinematic()` en de wachtrij.

## 5. Per-wijk scènes (de "echt goede scènes")

Hieronder per stadswijk een uitgewerkte film. De inhoud (buurten, landmarks, horeca, padel, golf) is
uit de werelddata gehaald; de shots zijn zo gekozen dat ze met bestaande modellen en sets te bouwen
zijn. Duur is inclusief ondertitels. Rikus-regels zijn voorstellen; de redactie mag ze aanscherpen.

### 5.1 Centrum (WK001400) — 34 s
Buurten: Binnenstad-Noord/Zuid/Oost/West, Noorderplantsoen, Hortusbuurt-Ebbingekwartier, UMCG,
Stationsgebied. Landmarks: Martinitoren, Martinikerk, Grote Markt, Vismarkt, Der Aa-kerk, Forum,
Groninger Museum, Hoofdstation, Prinsentuin, Academiegebouw, Goudkantoor.
**Film:** (1) kraan vanaf 55 m over de Grote Markt, omlaag langs d'Olle Grieze; (2) dolly over de
Vismarkt langs de eierbalstand en de terrassen; (3) cut naar het Hoofdstation: een trein rolt
binnen, reizigers met fiets; (4) cut naar het Groninger Museum aan het water, een rondvaartboot
vaart door het beeld; (5) kraan omhoog om de toren, naamkaart "Wijkheld van Centrum".
**Rikus:** "Dit is van jou. Alle terrassen, alle fietsen, en één toren die het ziet." / "De
binnenstad. Je mag er nog steeds niet met de auto in." **Uniek:** de opening van het spel speelt hier
(C00.1); de film is de terugkeer op de plek waar het begon.

### 5.2 Oud-Zuid (WK001401) — 32 s
Buurten: De Meeuwen, Oosterpoort, Herewegbuurt, Rivierenbuurt, Grunobuurt, Badstratenbuurt,
Zeeheldenbuurt, Laanhuizen, Stadspark, Martini Trade Park, Peizerweg. Horeca: Oosterpoort-concertzaal
("De kleine Oosterpoort"), kroegen op de Hereweg.
**Film:** (1) dolly onder de bomen van de Hereweg; (2) cut: de concertzaal, de bas hoorbaar door de
gevel, een gitarist laadt zijn kist uit; (3) door het Stadspark, een hardloper en een eend; (4) de
rivierenbuurt: een straatnaambord met een riviernaam en een tuinslang; (5) orbit om de Oosterpoort,
titel. **Rikus:** "Muziek, kroegen en altijd herrie. En nu is het jouw herrie." **Uniek:** de enige
wijk met een concertzaal als landmark.

### 5.3 Oud-West (WK001402) — 30 s
Buurten: Oranjebuurt, Noorderplantsoenbuurt, Schildersbuurt, Kostverloren.
**Film:** (1) een waslijn tussen twee huizen, de camera glijdt eronderdoor; (2) de Schildersbuurt:
Berend staat op de stoep met een brief, zwaait niet terug; (3) het Noorderplantsoen: half Stad ligt
in het gras; (4) een schilder met een ladder voor een gevel; (5) eindshot: de heg met de tuinman.
**Rikus:** "Hier woont iedereen vlak bij het park. Dat zeggen ze ook op elk feestje." **Uniek:**
Berend (de burenruzie uit het verhaal) woont hier.

### 5.4 Oud-Noord (WK001403) — 28 s
Buurten: Indische buurt, Professorenbuurt, De Hoogte, Bedrijventerrein De Hoogte. Landmark:
Noorderplantsoen.
**Film:** (1) straat met studentenhuizen, drie fietsen op één slot; (2) "moi" van een oud vrouwtje
naar de camera; (3) de Professorenbuurt: een hoogleraar zet een doos boeken bij het grofvuil;
(4) een straatfeest met een partytent; (5) eindshot vanaf de dakrand over de wijk.
**Rikus:** "De Hoogte. Volkswijk met een eigen park en een eigen mening." **Uniek:** het dorpse
"moi" van de De Hoogte.

### 5.5 Oud-Oost (WK001404) — 32 s
Buurten: Gorechtbuurt, Vogelbuurt, Bloemenbuurt, Florabuurt, Damsterbuurt. Let op: het buurtpunt
"Oosterparkwijk" (de thuisplek van het verhaal) valt in **Bloemenbuurt**; de naam Oosterparkwijk
bestaat in de verover-data niet.
**Film:** (1) de Oosterparkwijk in de ochtend: de straat van de opening, het zolderraam, de
Escapade met de lekke band; (2) de buurvrouw hangt de was buiten; (3) de oude stadionplek: een
jongen schopt tegen een bal, een hond rent mee; (4) de Bloemenbuurt: een bloemenkraam op de hoek;
(5) eindshot vanaf de dakrand terug naar de stoep. **Rikus:** "Het Oosterpark. Mijn oude stoep.
Doe er voorzichtig mee." **Uniek:** hier begint het verhaal (C00.2/C00.3); de film is thuiskomen.
Dit is de kandidaat voor de eerste hero-film.

### 5.6 Zuidoost (WK001405) — 34 s
Buurten: De Linie, Europapark, Kop van Oost, Woonschepenhaven, Driebond, Eemspoort, Euvelgunne,
Winschoterdiep, Stainkoel'n, Roodehaan, Waterhuizen, Eemskanaal-Noord, Eemskanaal-Zuid. Landmark:
Euroborg.
**Film:** (1) het stadion van buiten, de lichtmasten aan; (2) een doelpunt: het publiek juicht, een
bal rolt over de stoep; (3) de Eemskanaal-kades: kranen, containers, een vrachtschip; (4) padelbanen
bij Europapark, twee ballen; (5) orbit om de Euroborg met de titel. **Rikus:** "Voetbal, kantoren en
een hoop glas. Als de club scoort, hoor je het tot in Haren." **Uniek:** de Euroborg is het enige
stadion in het spel.

### 5.7 Midden-Zuid (WK001406) — 26 s
Buurten: Sterrebosbuurt, Coendersborg, Klein Martijn, Villabuurt, Helpman, De Wijert, De Wijert-Zuid.
Horeca: Paviljoen Sterrebos.
**Film:** (1) laan met villa's en hoge bomen; (2) een tuinman op een grasmaaier; (3) het paviljoen
in het Sterrebos, een dienblad op een terras; (4) een schoolplein, kinderen rennen uit; (5) eindshot
over de daken. **Rikus:** "Grote huizen, grote bomen. Hier heeft de heg een eigen tuinman."
**Uniek:** het groenste stuk Stad.

### 5.8 Zuidwest (WK001407) — 28 s
Buurten: Corpus den Hoorn, Hoornse Meer, Hoornse Park, Van Swieten, Piccardthof, Bruilweering.
Padel: Corpus den Hoorn (5 banen).
**Film:** (1) het Hoornse Meer: riet, een roeiboot, de zon op het water; (2) padel: vier spelers,
een smash; (3) de volkstuinen van Piccardthof: een gieter en een vogelverschrikker; (4) een
woonboulevard met een klusbus; (5) kraan omhoog over het meer. **Rikus:** "Water, riet en
volkstuinen. En de beste padelbaan van de provincie, zeggen ze hier." **Uniek:** water + padel.

### 5.9 Hoogkerk e.o. (WK001408) — 26 s
Buurten: Hoogkerk Dorp, Hoogkerk-Zuid, Westpoort, Vierverlaten, Zuidwending, Leegkerk, Gravenburg,
Bangeweer, De Buitenhof, Kranenburg, De Kring. Padel: Hoogkerk-zuid.
**Film:** (1) het dorp vanaf het water: kerk, brug, boten; (2) de suikerfabriek: stoom uit de pijp,
een suikerbiet op een vrachtwagen; (3) een trekker op de weg, een auto wacht; (4) het dorpsterras;
(5) eindshot over het kanaal. **Rikus:** "Suiker, bieten en een dorp dat groter is dan het lijkt."
**Uniek:** suikerfabriek en bieten (M-vracht/bieten-bijbaan).

### 5.10 Nieuw-West (WK001409) — 28 s
Buurten: Vinkhuizen-Noord/Zuid, Hoendiep, Reitdiepswaard, Reitdiep, Dorkwerd, De Held, Westpark,
De Suikerzijde-Noord/Zuid, De Nieuwe Held. Padel: Suikerfabriekterrein, Kostverloren.
**Film:** (1) nieuwe huizen aan het Reitdiep, de brug open, een zeilboot wacht; (2) Vinkhuizen:
een flat, een balkon met wasgoed; (3) de Suikerzijde: padelbanen in de oude fabriekshal; (4) het
Westpark: een hardloper en een reiger; (5) kraan omhoog over het water. **Rikus:** "Nieuwe huizen
aan oud water. De schippers kijken toe." **Uniek:** het Reitdiep + de oude suikerfabriek.

### 5.11 Nieuw-Noord (WK001410) — 32 s
Buurten: Selwerd, Paddepoel-Zuid/Noord, Zernike Campus, Selwerderhof, Tuinwijk. Landmark:
Winkelcentrum Paddepoel. Padel: Reitdiephaven.
**Film:** (1) Paddepoel: flats op een rij, de wind jaagt een plastic zak over het plein; (2) Tammo's
flat: het balkon, een plant, de Pleiadenlaan; (3) Zernike: duizend fietsen naar de campus, tegenwind;
(4) de klimtoren van Zernike (`klimtoren.js:16`), iemand klimt net boven; (5) eindshot over de flats.
**Rikus:** "Paddepoel. Voor een Stadjer uit het Oosterpark is dit buitenland. Tammo woont er nu."
**Uniek:** Tammo's flat, de sterrenbuurt (elke straat een sterrenbeeld) en de klimtoren.

### 5.12 Noordoost (WK001411) — 26 s
Buurten: Beijum-West/Oost, De Hunze, Van Starkenborgh, Noorderhoogebrug, Het Witte Lam,
Koningslaagte, Hunzeboord.
**Film:** (1) het kanaal bij Van Starkenborgh, een brugwachter; (2) Beijum: flats en gras, een
speeltuin; (3) een schaap op de dijk (Koningslaagte); (4) de Hunze: riet en een fuut; (5) eindshot
over het water. **Rikus:** "Hier houdt Stad op en begint het land. Zeg maar gedag." **Uniek:** de
grens stad/land in één beeld.

### 5.13 Nieuw-Oost (WK001412) — 30 s
Buurten: Lewenborg-Noord/Zuid/West, Hunzepark, Zilvermeer, Kardinge, Drielanden, Noorddijk,
Ruischerbrug, Ruischerwaard, Oosterhoogebrug, Ulgersmaborg. Padel: Hunzepark, Vogelbuurt.
**Film:** (1) Kardinge: het meer, een windsurfer, het strandje; (2) een brug over het
Eemskanaal; (3) golfafslag op de driving range (echteplekken: golf in Nieuw-Oost); (4) Lewenborg:
een rijtje huizen met een voortuin; (5) kraan omhoog over het Zilvermeer. **Rikus:** "Water, weiland
en een golfbaan. Iemand moet het doen." **Uniek:** Kardinge + golf.

### 5.14 Meerdorpen / Meerstad / Ten Boer / Ten Post (WK001413-416) — 24-28 s
Dit zijn geen stadswijken maar dorpen en buitengebied. Filmvorm: één establishing shot over het
dorp, één stop bij de kerk of het dorpsplein, één uniek ding (een tractor, een kerkhof, een
roeibaan, een weids uitzicht), eindshot. **Uniek per plek:** Meerdorpen = de Eems en het
polderlandschap; Meerstad = nieuwbouw aan het water; Ten Boer = de borg en het dorp; Ten Post =
de kronkelende weg en de kerk. Zelfde template, andere props.

### 5.15 Haren-West / Haren-Oost / Glimmen-Onnen-Noordlaren (WK001417-419) — 28 s
Haren: villawijk, het Paterswoldsemeer, de Hortus (die allang naar Haren verhuisde,
`WIJK_LINES`). Film: (1) het meer met zeilbootjes; (2) de villalaan met een hek en een hond;
(3) de Hortus: een tuinman en een bordje "Hortus"; (4) Glimmen: het Zuidlaardermeer en een
roeiboot; (5) eindshot over het water. **Rikus:** "De Hortus is allang naar Haren. De naam is
gebleven." **Uniek:** het enige stuk Stad met een heuse hortus en een meer.

## 6. Buiten de stad: woonplaatsen en gemeenten

De verover-lagen provincie/gemeente/woonplaats vragen om een andere maat:

- **Woonplaats (202, ~€400):** korte film van 15-20 s: één establishing shot, één stop bij het
  dorpshart of de unieke plek, de titel "Burgemeester van …". Zelfde template, twee stops.
  Voorbeelden met echte inhoud: Zuidhorn (station en kanaal), Winsum (wierde en kerk), Delfzijl
  (haven en zee), Appingedam (hangende keukens), Veendam (kanaal en fabriek), Stadskanaal
  (veenkolonie en kanalen), Winschoten (station en markt), Ter Apel (klooster), Bourtange (vesting),
  Eemshaven (windmolens en zeeschepen), Lauwersoog (vissershaven en veerboot).
- **Gemeente (10, €1.500):** geen nieuwe film; de gemeentefilm is de **montage van de drie mooiste
  wijken/plaatsen** die je al veroverde (hergebruik van de stops), 25 s, met de gemeentenaam in de
  titel. Dat spaart handwerk en geeft een mooie "overzichtskaart".
- **Provincie (1, €10.000):** de bestaande finale (Martinitoren, `story.js:561-571`) is hier al de
  beloning; geen extra film, of hooguit een uitbreiding van de bestaande finale.

## 7. Wat er met de huidige per-wijk-scène gebeurt

Advies:

1. **Eerste bezoek = alleen de HUD-plaatsnaam**, zonder kaart en zonder flyover. De
   `wijkBlurb` (`cinematics.js:747-750`) blijft als tekst in de HUD. Dat is één regel, geen scène,
   en het haalt de 210 s-cooldown en de instelling `wijkFilm` weg (die twee bestaan dan niet meer).
2. **De `WIJK_LINES` verhuizen naar de verover-film**: dezelfde stem, dezelfde toon, maar nu op het
   moment dat de speler iets te vieren heeft. De generieke pool blijft als de wijk geen eigen regels
   heeft.
3. **`wijkFilm`-instelling vervalt** (of wordt "Verover-films", standaard aan). De instelling
   `cinematicMoments` blijft voor landmark/crash/wanted.
4. **`wijkenSeen`-opslag** (`KEYS.wijkenSeen`) wordt alleen nog gebruikt voor de HUD-plaatsnaam;
   de "gezien"-logica kan blijven.
5. **`landmark`-momenten blijven** (los van veroveren); die zijn juist goedkoop en vaak mooi.

## 8. Concrete issues in het huidige systeem (issue-klaar)

| # | Severity | Issue | Waar | Fix | Labels |
|---|---|---|---|---|---|
| V1 | Hoog | Veroveren van een wijk is een HUD-bericht van 7 s; geen scène, geen titelkaart, geen vlag in beeld | `gebiedenlive.js:132-136` | verover-film zoals §4, beloningskaart erna | impact-hoog, kosten-M |
| V2 | Hoog | "Wijk" betekent twee dingen: HUD gebruikt 66 buurtpunten (`stad.json`), veroveren gebruikt 123 CBS-wijken (`grenzen.json`) | `cinematics.js:765-773`, `gebieden.js:121-124` | één eenheid kiezen voor de film; buurtpunten alleen voor de HUD | impact-hoog, kosten-S |
| V3 | Midden | Veroverde gebieden heten in de provincie "Wijk 00", "Wijk 01", "Wijk 13" — titel wordt "Wijkheld van Wijk 14" | `gebieden.js:94-99`, `grenzen.json` | naamgeving aanvullen (dichtstbijzijnde woonplaats) of laag overslaan | impact-midden, kosten-S |
| V4 | Midden | De wijkflyover is standaard uit (`wijkFilm: false`) en heeft 210 s cooldown; de meeste wijken krijgen nooit een film | `settings.js:60`, `hudbus.js:103-115` | vervangen door de verover-film; instelling laten vallen | impact-midden, kosten-S |
| V5 | Midden | De film kan niet naar gasten: `playCinematic`-shots worden niet verstuurd, alleen cutscript-scènes | `cutscenehost.js:334-336`, `coopcut.js:22-38` | `verover`-bericht in `coopcut.js` (klein) | impact-midden, kosten-M |
| V6 | Laag | Safehouse-naam en -adres zijn verzonnen per gebied, maar de titel "Safehouse Wijk 00" is niet spelersvriendelijk | `gebieden.js:337-342` | idem V3 | impact-laag, kosten-S |
| V7 | Midden | Na de laatste taak (vaak een missie-outro) komt de beloningskaart meteen; een film zou in de outro vallen | `gebiedenlive.js:139-148` | wachtrij met `sinceCinematic()` en `playerBusy()` | impact-midden, kosten-S |
| V8 | Laag | De film is nu nergens vooruit te bekijken of te herbeleven | `cutpreview.js`, `veroverdpanel.js` | preview + "Bekijk de intocht" | impact-laag, kosten-S |

## 9. Wat ik niet heb bekeken

- De exacte lijst veroverbare wijken is **niet statisch te bewijzen**: welke gebieden ≥ 2 taken
  hebben hangt af van de runtime-catalogus (`verzameltaken()` in `gebiedenbronnen.js` met missies,
  bijbanen, minigame-plekken, vondsten en geheimen). De hierboven gebruikte inhoud per wijk is
  wél uit de werelddata geverifieerd; welke daarvan veroverbaar zijn moet het spel zelf laten zien
  (Veroverd-paneel of een debug-dump).
- Niet in de engine gekeken of een 34 s durende tour met 5 segmenten soepel streamt op de laagste
  kwaliteitsstand; de `prewarm`/`holdShotTiles`-route is er, maar niet gemeten.
- Geen voice-opnames gegenereerd of gecontroleerd; de Rikus-regels zijn voorstellen.
- De precieze indeling van CBS-wijken in de stad (welke buurten erin vallen) komt uit
  `grenzen.json`; de grenzen zijn vereenvoudigd, dus een stop kan enkele meters naast de echte
  plek liggen. Voor een film op ooghoogte is dat acceptabel, maar het is niet gecontroleerd.
