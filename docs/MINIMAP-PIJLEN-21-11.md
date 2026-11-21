# Minimap: pijlen en doelkleuren (21-11, #1078)

Vraag van de eigenaar: de kleine pijltjes op de minimap naar bepaalde doelen zijn soms niet duidelijk (wat is het, welke moet ik volgen?). Misschien is geel altijd de volgende missie in de autoroute en krijgt de rest de kleur van het icoon op de kaart, en is paars een route die je zelf bepaald hebt. Wat zijn alle scenario's en wat is het advies, ook gezien het designsysteem (ADR 0040 en 0041)?

**Besluit van de eigenaar (21-11):** geel is het actieve doel van de autoroute (de volgende missie), paars is wat je zelf koos, alle andere doelen houden de kleur van hun icoon en zijn hol (secundair). Dat is alternatief A2 hieronder. Het is gebouwd als token-mapping (`NAV_ROL` in `game/js/navtarget.js`, `--nav-actief`, `--nav-eigen`, `--nav-secundair` in `ds-tokens.css`), zodat een kleur met één regel wisselt.

Alles hieronder is uit de code nagelopen (stand `main` = 828ec9f57, daarna de commit van dit werk). Er is niets in beeld in het echte spel gezien (geen Electron tijdens de releasegate): de tekening is alleen bekeken in de mock (`docs/beeld-21-11/minimap-pijlen/mock.html`) en gemeten in de tests. Alles wat de speler ziet staat dus als **nog niet bekeken in het spel**.

## 1. Hoe het nu werkt (kort)

- **Eén eigen doel** (`goal.js`): hoogstens één ding dat de speler zelf koos: een plek (klik op de kaart), een missie of klus uit "Te doen" (`todo.js`, "Zet als doel"), een minigame, een uitdaging. `getUserWaypoint()` geeft zijn plek aan pin, pijl en 3D-baken.
- **Drie routeslots** (`routing.js`): `user` (het eigen doel), `objective` (heli-run, klus, missie in uitvoering, anders de gids van het verhaal, de uitdaging of een missie op de kaart) en `care` (opknappen of garage). Het actieve slot is `user || objective || care`. Een lopende klus, missie of heli-run zet het eigen slot uit (`busyTarget`): wat loopt gaat voor je eigen route. Een eigen doel gaat voor de verhaalgids ("het verhaal wacht").
- **De minimap** (`hud_panel.js`, `drawMinimap`): tekent alle drie de routelijnen (de actieve dikker), de markers in beeld (budget van 10 iconen), en aan de rand een pijl voor wat buiten beeld ligt. De 3D-wereld toont alleen de actieve route (lint) en één baken per doel (`worldmarker3d.js`, `scene3d/routeribbon3d.js`). De grote kaart tekent dezelfde drie routes (`mapview.js`).
- **Kleuren zijn rollen van `a11y.js` `PALETTES`** (`mission` geel, `user` paars, `job` oranje, `care` roze) en wisselen mee met de drie kleurenblindpaletten. De route-soorten hebben ook een streeppatroon (`ROUTE_DASH`: effen, streep, stip, streep-stip).

## 2. Scenario-inventaris

Kolom "Nu" is de stand vóór dit werk. Kleur: geel = `#e8c93a` (palet `mission`), paars `#c068ff`, oranje `#ff9a3c`, roze `#ff5fb4`. "Rand" = pijl aan de rand van de minimap voor iets buiten beeld.

| # | Bron (module) | Wanneer actief | Minimap | Grote kaart en 3D/HUD | Kleur en vorm nu | Stuurt |
|---|---|---|---|---|---|---|
| 1 | Verhaalgids (`routing.js` `objectiveTarget`, `storyguide`) | verhaal loopt, geen eigen doel, geen missie in uitvoering | route geel effen; marker alleen als de gids een missiestart is (gele ring); een winkel krijgt alleen een ring in beeld, **geen rand-pijl** | kaart: gele lijn; 3D: lint (geel, kolommen); HUD: doelkaart geel "Volg de gele route" | geel, cirkelmark in de pijl | `world.storyGuide` |
| 2 | Missie op de kaart, nog niet gestart (`missionOnMap`) | verhaalstap of gekozen als doel | gele ring `mi-N`, rand-pijl geel (op 0,8 als er een eigen doel is) | 3D `start`: geel ruitje | geel | `world.mission` + `goal.js` |
| 3 | Missie in uitvoering (`busyTarget`) | `phase === 'active'` | gele ring met stip `ma-N`, pijl geel met ring, route geel effen | 3D `goal`: **cyaan** driehoek (`missionActive`); HUD geel | geel (minimap), **cyaan (3D)** | `world.mission` |
| 4 | Eigen doel (`goal.js`, kaartklik, "Zet als doel") | `goal` gezet | paarse pin (`userWaypoint`), rand-pijl paars met stip (pulseert), route paars gestreept; een gekozen **missie** krijgt de paarse pin **en** de gele ring op dezelfde plek | kaart: paarse pin en route; 3D: paars baken, lint paars (**groenblauw te fiets**); HUD: "Doel: X" zonder eigen kleur | paars, stip | speler |
| 5 | Klus / bijbaan actief (`sidejobs.js`) | `sideJob.active` | doel `sj-target` oranje, stippen `sj-dot`, rand-pijl oranje met vierkantje, route oranje gestippeld | 3D baken `job` oranje; HUD doelkaart **bordgroen** (ds) of oranje (glas) | oranje, vierkant | `world.sideJob` |
| 6 | Uitdaging na het verhaal (`postgame.js`, `challengeTarget`) | `world.challengeTarget` | hergebruikt het klus-icoon `sj-target` en de **oranje** rand-pijl; stippellijn naar het volgende punt | 3D `checkpoint`: cyaan ring | oranje (minimap), cyaan (3D) | `postgame.js` |
| 7 | Heli-run (`helirun.js`) | `world.heliRun` | ringen goud (`ringNext`), H-pad groen, ballon roze; rand-pijl **groen** (`heliDone`) met ringmark; alles anders weg | luchtlijn, ringen in 3D | groen/goud/geel door elkaar | `heliRunTarget` |
| 8 | Zorgroute (`routing.js` `careTarget`) | gezondheid laag of eigen voertuig beschadigd | route roze streep-stip; **geen marker of pijl** bij eten, wel bij garage | HUD-melding "volg de roze route"; kaart: roze lijn met knop "weg" | roze | `careNeed` |
| 9 | Lekke band (`lekkeBandGarage`) | in een eigen voertuig met lekke band | garage gloeit (roze ring), buiten beeld pulserende roze pijl zonder mark | — | roze | `ownedvehicles.js` |
| 10 | Eigen voertuigen (`ownedvehicles.js`) | schakelaar `car` aan | badge in lakkleur met lichtgroene ring; rand-pijlen **lichtgroen zonder mark** (de Escapade en de dichtstbijzijnde) | kaart: badge | lichtgroen | `getOwnedVehiclesForMap` |
| 11 | Medespelers (Samen spelen, `coopPartners`) | spelers op de kaart | icoon in eigen kleur en vorm, rand-pijl in hun kleur (gevuld, geen mark); roepjes als ster of kruis | kaart: icoon met naam; 3D: `coopentities3d.js` | vrije spelerskleur + vorm (kan geel of paars zijn) | spelerslijst |
| 12 | Doelen van de groep (Samen spelen, `coopmissie.js`) | gast: doel van de gastheer; gastheer: groepsdoelen | gele ring (andere groepen op 50 %), één rand-pijl naar de dichtstbijzijnde | 3D: `coopentities3d.js` baken | geel met cirkelmark | `gastDoelen`, `kaartDoelen` |
| 13 | Politie (`police.js`, `wantedlevels.js`) | wanted of eenheden | één schild (rood/blauw) met warmtering, zoekgebied pulserend; **geen rand-pijl** | HUD: "Ontsnap aan de politie" (rood); sterren (`#e8c93a`) | rood en politieblauw, schildvorm | `world.police` |
| 14 | Geldwagen en buit (`cashvan.js`) | in de buurt | **gele munt** `cash` (max 3) | kaart: zelfde munt | geel (= geld) | `forEachCashTarget` |
| 15 | Winkels, diensten, garage, huis, halte, station (`mapicons.js`, `kaartkleuren.js`) | altijd, naar laagschakelaars | statische badges met vorm en kleur per categorie (bordgroen = winkel en dienst, rood = politiebureau, inktblauw = vervoer, crème = rest) | kaart en 3D-markers | vast per categorie | data |
| 16 | Verhaalwinkel (`storyTargetShop`) | de stap vraagt een winkel | gele ring om het winkelicoon; buiten beeld **niets** | — | geel | `story.js` |
| 17 | Dieren, verzamelitems, foto's, geheimen (duif, onderdelen, wrakduik, uitkijkpunt, perceel) | spots in de buurt | badges, geen pijl | kaart: idem | categorie | spotlijsten |
| 18 | Gebieden en veroveren (`gebiedtoestand.js`, `tekenVeroverdMini`) | schakelaar `veroverd` | vlakken: onzichtbaar, zichtbaar, **bezig geel**, veroverd lichtgroen | kaart: idem | geel = bezig | eigen profiel |
| 19 | Reizen: trein, boot, vliegtuig (`routing.js` modus) | modus ≠ lopen/fiets/auto | boot zonder vaarroute en lucht: gestippelde luchtlijn in routekleur; trein: route met benen | 3D: vaarlijn, luchtlijn, wegwijzers (`waymarkers3d.js`); HUD-GPS: waar uitstappen | routekleur van de soort | `computeRoute` |
| 20 | Taxi (bijbaan en "Reis erheen") | bijbaan `taxi`; snel reizen vanaf de kaart | klant en afzetpunt als klus (oranje); snel reizen heeft geen marker | 3D: tekst zegt "gele kolom", het baken is **oranje** | oranje | `sidejob_taxi.js`, `reiskaart.js` |
| 21 | HUD-navigatiekaart (`hudgps.js`, `hud_panel.js` GPS-kaart) | de actieve route heeft een bocht | geen | "Over 40 m linksaf" met bordgroene pijl, **zonder te zeggen welke route** | bordgroen | `getRouteAhead` |
| 22 | Minigames (padel, kermis, heli) | `gameBusy` | alle doelen weg, alleen de eigen markers | — | — | `busy.js` |
| 23 | Wind en noorden | zeilen; altijd | schijfje met pijl linksonder; N-badge aan de rand | — | glas, crème | `miniWind` |

## 3. Stapeling: wat gebeurt er als er meer tegelijk is

| Situatie | Nu | Na dit werk (A2) |
|---|---|---|
| Verhaal + eigen doel | route paars (user wint); de gele missie blijft als **gedimde** rand-pijl (0,8) zonder route; twee pijlen van bijna gelijk gewicht | één gevulde paarse pijl met afstand en vlag; gele ster hol erbij |
| Eigen doel is een missie (Te doen) | paarse pin **en** gele ring op één plek; beide rand-pijlen | één paarse pijl met ster: de gele ring verdwijnt (zelfde plek, het eigen doel wint) |
| Missie loopt + eigen doel | missie wint de route, maar de paarse pijl pulseert nog vol mee | gele gevulde pijl; paars hol (wacht), HUD zegt het al ("verhaal wacht" geldt andersom) |
| Klus + verhaal + eigen doel | klus oranje wint; gele pijl 0,8; paarse pijl pulseert | oranje gevulde ruit met afstand; hooguit twee holle pijlen (geel ster, paars vlag) |
| Zorg erbij | roze route naast de rest, pulserende roze pijl bij lekke band | zorg is altijd secundair, hol met kruis |
| Medespelers | gevulde pijlen in vrije kleuren, gelijk aan doelpijlen | holle pijlen zonder vorm in het pijltje (mensen, geen doel) |
| Politie | schild en ring, geen pijl | ongewijzigd; rood komt nooit voor als doelkleur |
| Heli-run of minigame | andere doelen weg, heli-pijl groen | alle andere doelen weg; heli-pijl geel met ring |
| Twee pijlen in dezelfde richting | de laatst getekende (paars) dekt de ander | de gevulde pijl ligt altijd bovenop (laatst getekend) en de holle zijn kleiner |
| Meer dan drie doelen | alle pijlen | hooguit één gevuld en twee hol (`MAX_SECUNDAIR`); de rest staat als "te veel pijlen" in de lijst en op de grote kaart |

Het `route`-slot wijzigt niet: dezelfde rangorde (heli, klus, missie in uitvoering, eigen doel, verhaal, uitdaging, zorg) staat nu in `navtarget.js` (`NAV_TYPES.rank`) en de test bewaakt dat ze gelijk blijft aan `routing.js`.

## 4. Inconsistenties (gevonden)

Status: **opgelost** = in deze ronde gebouwd (zie §9); **open** = wacht op beeld of een besluit.

| # | Wat | Status |
|---|---|---|
| I1 | Een gekozen missie krijgt twee markers (paarse pin en gele ring) en twee rand-pijlen op dezelfde plek; zelfde bij een lopende missie die het eigen doel is | opgelost: zelfde plek is één doel |
| I2 | Twee geeltjes: `#e8c93a` (palet `mission`, minimap, route, 3D-lint, oud HUD) en `#f9c80e` (ds `ink-geel`: HUD-doelkaart, missielaag `routeLine`, kaart-legenda); DESIGN_SYSTEM.md noemt dit al als open vraag | open: één geel, voorstel `#f9c80e` overal (raakt `PALETTES.uit.mission` en de HUD-kleurentest) |
| I3 | Geel betekent ook: geld (`cash`), gebied "bezig", perceel "bezig", sterren, eierbal, ringen van de heli-run, speciale dag | open: geel als "volg dit" botst met geld en bezig; voorstel: gebied "bezig" naar bordgroen met halftoon, geldwagen naar crème met munt-vorm |
| I4 | Eigen doel is paars, maar het 3D-lint van een eigen fietsroute is groenblauw (`MODE_COLOR.bike`) | open: te fiets paars houden |
| I5 | Actieve missie is geel op de minimap en cyaan in 3D (`goal`, `checkpoint` = `missionActive`); de uitdaging is oranje op de minimap en cyaan in 3D | open: wacht op beeld; cyaan is bewust het "actief"-signaal in 3D en valt in het tritanopie-palet samen met roze |
| I6 | Een klus is oranje op minimap, route en 3D, **bordgroen** in de HUD-doelkaart en in de ds-kaarticoon (ruit bordgroen); de taxitekst zegt "gele kolom" bij een oranje baken | open: klus-kleur kiezen (icoonkleur volgt de categorie: bordgroen), taxitekst herschrijven |
| I7 | De heli-pijl was groen (`heliDone`), de ringen goud, de route geel | opgelost: heli-pijl volgt `NAV_ROL` (geel) |
| I8 | Pijlen naar eigen voertuigen waren lichtgroen zonder mark: "wat is dat?"; lichtgroen is ook "veroverd" | opgelost: hol met een autoblokje; open: lichtgroen blijft de kleur |
| I9 | Marks van 1,5 px in een pijl van 11 px (stip, vierkant, ring) waren niet te lezen; zorg en medespelers hadden helemaal geen mark | opgelost: vormen 5 px (ster, vlag, ruit, kruis, ring, auto), gevulde pijl 1,25 keer groter en met afstand |
| I10 | Pijlen van dingen die niet actief zijn liepen vol mee (verhaalpijl naast het eigen doel, pulserende zorgpijl) | opgelost: alleen het actieve doel is gevuld en pulseert |
| I11 | Een doelpijl kon blijven bestaan na het afronden (de routeslot stopt op 16 m, het eigen doel op 8 m, een missie in afkoeling nergens expliciet) | opgelost: `afgerond`, `aangekomen` (10 m) en `klaar` verbergen elke pijl |
| I12 | De verhaalwinkel kreeg een ring in beeld maar geen pijl erbuiten; de gids van het verhaal had nooit een rand-pijl | opgelost: de gids is een doel met een pijl |
| I13 | Raakte het iconenbudget (10) op, dan kreeg een doel in beeld toch een rand-pijl (`icon()` gaf false) | opgelost: een pijl alleen als het doel buiten de kaart ligt |
| I14 | Een holle of gevulde pijl op een donker bos haalde geen 3:1 (paars op bos 2,7; groen op bos 2,5 in de kleurenblindpaletten) | opgelost: crème buitenrand om de gevulde pijl (zie §7) |
| I15 | De HUD-bochtkaart ("Over 40 m linksaf") zegt niet welke route hij volgt; hij is altijd bordgroen | open: de kaart krijgt de kleur en vorm van het actieve doel (`--nav-actief`/`--nav-eigen`); wacht op HUD-beeld |
| I16 | Drie routelijnen tegelijk (zorg, doel, eigen) onderscheiden zich alleen met een streeppatroon van 3 px | open: de niet-actieve lijnen dun en 50 % (zelfde regel als de pijlen) |
| I17 | In het deuteranopie- en tritanopie-palet liggen eigen doel en klus dicht bij elkaar (ΔE 18) en is zorg crème (= de kleur van een holle pijl); `missionActive` is in tritanopie roze (= zorg in de standaard) | open: palet bijstellen (Okabe-Ito heeft meer tinten) |
| I18 | Spelerskleuren (`coopplayers.js`) bevatten geel- en paarstinten (`#e8b923`, `#911eb4`, `#bcd02c`) die op een doelpijl lijken | gedempt: medespelerpijlen zijn hol en zonder vorm in het pijltje; open: die tinten uit de spelerskleuren halen |
| I19 | Het routechip "Missie" op de kaart (zeefdruk) onderstreepte met `#f9c80e` terwijl de lijn `#e8c93a` is | opgelost: volgt `--nav-actief` |
| I20 | Het eigen-doel-pulsje op de grote kaart is lichtgroen terwijl de pin paars is | open (klein) |

## 5. Advies

### Principes

1. **Eén gevulde pijl.** Wat de speler volgt is precies één ding, en dat is overal herkenbaar: gevuld, pulserend, met afstand. Alles anders wacht en is hol. Zo is het antwoord op "welke moet ik volgen" altijd "de gevulde".
2. **Kleur zegt de rol, vorm zegt het type.** Geel is de autoroute (verhaal, missie, heli, groep), paars wat je zelf koos, de rest houdt de kleur van zijn icoon (klus oranje, zorg roze). Het type staat in de vorm in de pijl: ster is missie of verhaal, vlag is een plek die je koos, ruit is klus, kruis is opknappen, ring is heli. Nooit alleen kleur (ADR 0040).
3. **Hol is wachten.** Een holle pijl is er om te laten weten "dit bestaat nog", niet om te volgen. Hij houdt de kleur van zijn type, zodat je ziet wat er wacht, maar hij heeft geen afstand en pulseert niet.
4. **Mensen zijn geen doelen.** Medespelers en eigen voertuigen zijn hol en zonder vorm of met een autoblokje; politie heeft geen pijl (het schild en de ring doen het werk) en rood komt nooit als doelkleur voor.
5. **Een doel dat niet meer kan, verdwijnt.** Afgerond, aangekomen, verborgen door een klus of minigame: weg, niet gedimd.
6. **Eén bron.** `navtarget.js` beslist; minimap, route-kleuren, 3D-lint, baken en kaart-CSS lezen hem. Een kleur wijzigen is `NAV_ROL`.

### Per scenario

| Situatie | Actief (gevuld) | Wachtend (hol) | Opmerking |
|---|---|---|---|
| Geen doel | geen | geen | rustige kaart, geen pijlen; de HUD biedt geen leeg kader aan |
| Verhaal | gids van het verhaal, geel ster | — | de volgende missie in de autoroute |
| Eigen route gezet | paars (vlag, of ster/ruit als je een missie of klus koos) | verhaal geel ster | eigen doel wint van het verhaal, de HUD zegt al "verhaal wacht" |
| Missie loopt | geel ster | eigen doel paars | wat loopt, gaat voor je eigen route; na afloop is je eigen doel weer actief |
| Klus | oranje ruit | verhaal en eigen doel | de missie is verborgen (er is maar één taak tegelijk) |
| Taxi, trein, boot, vliegtuig | hetzelfde doel | idem | de manier van reizen verandert de **lijn** (weg, vaarlijn, luchtlijn, ov), niet het doel; de pijl wijst hemelsbreed naar het eindpunt, de bochtkaart en de halte-informatie doen de rest |
| Meerdere gevolgde missies | één | andere missies staan alleen als icoon op de kaart | "Te doen" zet er één als doel (`goal.js` zegt al: precies één); er komt geen lijst pijlen |
| Samen spelen | eigen doel of het doel van de groep | rest | doelen zijn per speler lokaal; groepsdoelen komen uit `kaartDoelen`/`gastDoelen` |
| Politie | geel blijft de pijl | — | rood schild met warmtering is een toestand, geen doel |
| Tijdsgebonden | gele pijl, afstand | — | de klok staat in de HUD-doelkaart (`time-low` bij 10 s); een tweede getal in een pijl van 11 px is onleesbaar |
| Zorg | alleen als er niets anders is | anders hol met kruis | roze lijn voor opknappen |
| Minigame, heli-run | alleen eigen markers (heli: geel ring) | geen | zoals nu |
| Aankomst | pijl weg bij 10 m, marker blijft | — | bij een missie begint de marker zelf |

**Wat gebeurt er als de speler een eigen route kiest terwijl er een missie-route is?** Tijdens het wachten op de volgende missie wint je eigen route (paars gevuld, de gele missie hol erbij). Loopt de missie al, dan wint de missie (de route stond al op de missie, een eigen doel zou midden in een opdracht storen) en wacht je eigen doel hol. Dat is geen nieuwe regel: het is wat `routing.js` al deed, nu zichtbaar.

**In één oogopslag:** de gevulde pijl heeft een vormpje en de afstand ("420 m", dezelfde waarde als de doelregel in de HUD: langs de route als die er is, anders hemelsbreed). Een holle pijl heeft alleen het vormpje. Voor de eerste keer komt er een uitleg in "Zo werkt de kaart" (de mock toont hem): "Een gevulde pijl met een afstand is wat je volgt. Een holle pijl wacht even. Geel is de route van het verhaal, paars is jouw eigen doel." Hij hoort in `.ds-uitleg` en blijft vindbaar in Besturing > Hulp (zie DESIGN_SYSTEM.md, "Map"). **Nog niet gebouwd**: de tekst zelf, omdat het kaartmenu een eigen uitlegkaart heeft die met beeld moet worden afgestemd.

## 6. Drie alternatieven

| | A1 Eén geel | **A2 Geel en paars (gekozen)** | A3 Per categorie (opgeruimd) |
|---|---|---|---|
| Idee | alles wat je volgt is geel, ook je eigen doel (vlag); wachtend is hol en crème | geel = autoroute, paars = eigen doel; wachtend is hol in zijn eigen kleur | elke soort een vaste kleur (geel, paars, oranje, roze), alles gevuld |
| Voordelen | één kleur voor "volg dit": past bij ADR 0040 ("één gele hoofdkleur voor de volgende actie"); geen vijfde kleur; nooit twee kleuren om uit te kiezen | je herkent je eigen keuze aan de kleur; kleinste wijziging (de kleuren bestonden al); geel en paars liggen in de vier paletten van het spel ΔE 148, 85, 105 en 49 uit elkaar (normaal, deuteranopie, protanopie, tritanopie) | minst werk; elke soort herkenbaar zonder vorm |
| Nadelen | de eigen route verliest zijn herkenning (alleen de vlag zegt het); wie nu paars kent moet omleren; hol-crème zegt niet wat er wacht | paars is geen inkt van ADR 0040 (het is `--mk-user`, een statuskleur uit ADR 0010); twee "volg-kleuren" tegelijk kan alleen als de regels (§5) kloppen; paars en roze liggen dicht bij elkaar voor sommige kleurenblinden | vier kleuren om te onthouden; elke pijl even luid; geen antwoord op "welke moet ik volgen"; kleurenblindpaletten hebben geen vier onderscheidbare tinten (ΔE 18) |
| Risico | de bekende paarse pin verdwijnt | laag | het probleem van de eigenaar blijft |

**Voorkeur van de analyse:** A1 en A2 zijn allebei goed; A1 is eenvoudiger en past bij het designsysteem, A2 geeft de speler herkenning van zijn eigen keuze en heeft het kleinste risico. De eigenaar heeft A2 gekozen; de implementatie maakt A1 mogelijk met één regel (`NAV_ROL.eigen = 'mission'`), zodat A1 later zonder werk uit te proberen is. A3 raden we af.

## 7. Contrast en kleurenblindheid

`node scripts/minimap_pijlen_test.mjs` (faalt bij een onderschrijding; `--tabel` schrijft deze tabellen). Achtergronden uit `kaartLand().mini` (de minimap is glasgroen met papieren gebouwen), contrast met de WCAG-2-formule van `kaartkleuren.js`, kleurenblindheid met de Machado-matrices (2009, ernst 1,0, lineair RGB) en een CIE76 ΔE in Lab.

**Contrast van de pijl.** De kleur zelf haalt 3:1 niet op elk vlak: geel op weg 1,3 en paars op bos 2,7. Daarom heeft de gevulde pijl twee randen (crème buiten, donker binnen) en de holle een donkere rand met de kleur als lijn ertussen. Het effectieve contrast van de omtrek is het beste van vulling, glas en crème: minimaal 4,40 op elke minikaartkleur, voor alle vier de paletten (de test eist 3,0). De kleur haalt op glas minstens 3 (de test eist dat ook voor de holle pijl).

| Alternatief | Rol | Hex | op glas | weiland | park | water | weg | hoofdweg | bos | dorp | gebouw | gebouw2 | minimum | met rand |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A2 Geel en paars | actief | `#f9c80e` | 11.85 | 6.56 | 3.26 | 2.11 | 1.27 | 1.35 | 5.42 | 6.23 | 1.48 | 1.00 | 1.00 | 4.40 |
| A2 Geel en paars | eigen | `#c068ff` | 5.94 | 3.29 | 1.64 | 1.06 | 1.57 | 2.69 | 2.72 | 3.12 | 1.35 | 1.99 | 1.06 | 4.40 |
| A2 Geel en paars | secundair | `#f0ede4` | 15.99 | 8.85 | 4.40 | 2.84 | 1.72 | 1.00 | 7.31 | 8.40 | 1.99 | 1.35 | 1.00 | 4.40 |
| A2 Geel en paars | zorg | `#ff5fb4` | 6.73 | 3.73 | 1.85 | 1.20 | 1.38 | 2.38 | 3.08 | 3.54 | 1.19 | 1.75 | 1.19 | 4.40 |
| A3 Per categorie | missie | `#e8c93a` | 11.45 | 6.34 | 3.15 | 2.04 | 1.23 | 1.40 | 5.24 | 6.02 | 1.43 | 1.03 | 1.03 | 4.40 |
| A3 Per categorie | eigen | `#c068ff` | 5.94 | 3.29 | 1.64 | 1.06 | 1.57 | 2.69 | 2.72 | 3.12 | 1.35 | 1.99 | 1.06 | 4.40 |
| A3 Per categorie | klus | `#ff9a3c` | 8.86 | 4.91 | 2.44 | 1.58 | 1.05 | 1.80 | 4.05 | 4.66 | 1.10 | 1.33 | 1.05 | 4.40 |
| A3 Per categorie | zorg | `#ff5fb4` | 6.73 | 3.73 | 1.85 | 1.20 | 1.38 | 2.38 | 3.08 | 3.54 | 1.19 | 1.75 | 1.19 | 4.40 |

**Kleurenblindheid** (ΔE tot 20 is "nauwelijks te onderscheiden zonder vorm"). Geel en paars (de twee pijlen waar het om gaat) liggen in alle vier de paletten van het spel ver uit elkaar (kleinste 49, in tritanopie, waar het gele palet crème is); de test faalt onder 20. Het smalste paar in een palet is steeds een ander: geel/oranje in het standaardpalet (36), eigen doel/klus in deuteranopie en tritanopie (18). De vorm in de pijl is het tweede kanaal en altijd aanwezig.

Onderscheid tussen twee pijlkleuren (CIE76 ΔE; vanaf 20 zijn ze ook zonder vorm te scheiden), met kleurenblindheid gesimuleerd

| Alternatief | Paar | normaal | deuteranopie | protanopie | tritanopie |
|---|---|---|---|---|---|
| A2 Geel en paars | actief / eigen | 157 | 141 | 148 | 34 |
| A2 Geel en paars | actief / secundair | 79 | 76 | 78 | 31 |
| A2 Geel en paars | actief / zorg | 117 | 88 | 110 | 45 |
| A2 Geel en paars | eigen / secundair | 96 | 72 | 78 | 42 |
| A2 Geel en paars | eigen / zorg | 49 | 54 | 39 | 48 |
| A2 Geel en paars | secundair / zorg | 77 | 28 | 48 | 73 |

De huidige paletten (a11y.js) per kleurenblindstand, ΔE tussen missie (geel), eigen doel, klus en zorg zoals de speler ze ziet (alle paren; het kleinste staat erbij)

| Instelling | missie | eigen | klus | zorg | geel/eigen | kleinste ΔE (waargenomen) | welk paar |
|---|---|---|---|---|---|---|---|
| uit | `#e8c93a` | `#c068ff` | `#ff9a3c` | `#ff5fb4` | 148 | 36 | missie/klus |
| deuteranopie | `#f0e442` | `#cc79a7` | `#009e73` | `#f0ede4` | 85 | 18 | eigen/klus |
| protanopie | `#f0e442` | `#cc79a7` | `#009e73` | `#f0ede4` | 105 | 36 | klus/zorg |
| tritanopie | `#f0ede4` | `#cc79a7` | `#e69f00` | `#56b4e9` | 49 | 18 | eigen/klus |

Wat dit zegt: het geel-paars-onderscheid (A2) is robuust voor alle drie de soorten kleurenblindheid. De zwakke plekken zijn de paren klus/eigen doel (18) en geel/oranje (36): daar draagt de vorm in de pijl (ruit tegen vlag of ster) het onderscheid, niet de kleur (§4, I17).

## 8. De mocks

**Ronde 1** (kleurstelsel A1 tot A3, de pijl als in de eerste bouw): `docs/beeld-21-11/minimap-pijlen/mock-ronde1.html` (het maakscript is vervallen toen de eerste pijl vervangen werd door de kompasboog; de pagina blijft als vastgelegd beeld).

**Ronde 2 (21-11, na de reactie "nog niet duidelijk en lelijk")**: drie visueel verschillende ontwerpen op de echte minimap (uitsneden uit de spelbeelden), met de echte tokens en Phosphor-iconen in de marker. Gemeenschappelijk: één actief doel met afstand (14 px, papieren plaatje met inktrand en harde schaduw), hooguit twee wachtende doelen als klein rond icoon-punt zonder pijl, markers die langs de rand uit elkaar schuiven (nooit gestapeld) en een vaste afstand tot de kaartrand.

- **A Schoon-minimaal**: één grote wijzer (driehoek, dikke inktrand, crème randje, harde schaduw) met het icoon erin.
- **B Icoon-in-schild**: een bordje met een papieren schijf en een groot icoon, plus een punt naar het doel; wachtende doelen zijn ronde bordjes.
- **C Kompasboog**: een stippellijn langs de rand met een dikke boog en een rond icoon op de plek van de richting.

Bestanden: `mock.html` (`node scripts/minimap_pijlen_mock.mjs`), PNG's met `node scripts/minimap_pijlen_shots.mjs` (headless Chrome): `ontwerp-a.png`, `ontwerp-b.png`, `ontwerp-c.png` (acht scenario's), `vergelijking.png`, `zoom.png`.

**Keuze van de eigenaar (21-11): ontwerp C, de kompasboog.** Die is gebouwd (zie §9). De pijl van ronde 1 is vervangen.

## 9. Gebouwd (deel 2)

- **`game/js/navtarget.js`** (puur): `resolveNavTargets(snapshot)` geeft het actieve doel, de holle doelen (hooguit 2), wat verborgen is en waarom, en de lijnsoort per manier van reizen. `NAV_ROL` koppelt een type aan een paletrol (de enige plek voor de kleurkeuze), `NAV_TYPES` heeft rang, vorm en label, `navColor` en `pathRole` geven de kleur. Regels: één actief, dezelfde plek is één doel, afgerond/aangekomen/klaar geen pijl, klus verbergt missie en uitdaging, minigame en heli-run laten alleen hun eigen doel.
- **`game/js/navpijl.js`** (ontwerp C): de meetkunde (afgeronde baan op 23 px van de rand, `sVoor`, `spreid`, `plaats`: één boog, de rest schuift uit elkaar) en `drawKompasRand` (stippellijn, boog met crème, inkt en kleur, rond Phosphor-icoon, punten, afstandsplaatje van 14 px met harde schaduw; `beweging: false` bij Beweging beperken). `GLYPH` in `navtarget.js` koppelt een vorm aan een Phosphor-naam (ster, vlag, tas, ehbo, helikopter, auto, doel, speler).
- **`hud_panel.js`**: de minimap bouwt één momentopname (`resolveNavTargets`) en tekent de kompasboog daaruit; `missionEdge`, `jobEdge`, `wpEdge`, `heliEdge` en `lekEdge` en de oude pijl zijn weg. Medespelers en eigen voertuigen zijn punten (hooguit drie); een dubbel doel verliest zijn dubbele marker. `ROUTE_COLORS` volgt `NAV_ROL`. De GPS-kaart (bocht) krijgt een kleurrand in de kleur van zijn route (`--nav-doel`). "Zo werkt de kaart" (`KAART_UITLEG`) legt de boog uit.
- **Nog in beeld te controleren (Electron, na de releasegate):** de boog en de punten op de echte minikaart (maat, schaduw, hoeken, de N-badge en het windschijfje die op de rand liggen), het afstandsplaatje in de hoeken, de kleurrand van de GPS-kaart (geen verschuiving van de tekst, ook bij 1280 breed), het uitlegvenster, en Beweging beperken.
- **Kleur als tokens:** `ds-tokens.css` heeft `--nav-actief`, `--nav-eigen`, `--nav-klus`, `--nav-zorg` (terugvallen) en `--nav-secundair` (crème); `a11y.js` zet ze live op het kleurenblindpalet; `mapview.js` (routechips), `worldmarker3d.js` (baken) en `scene3d/routeribbon3d.js` (lint) lezen ze via `NAV_ROL`.
- **Tests:** `scripts/navtarget_test.mjs` (prioriteit, stapeling, aankomst, afgerond, modus-wissel, Samen spelen, kleur in één regel, tekening, bedrading) en `scripts/minimap_pijlen_test.mjs` (contrast en kleurenblindheid). Gecontroleerd: `hud_test`, `hud_kleuren_test`, `kaartkleuren_test`, `mapicons_test`, `a11y_test`, `markerlook_test`, `minimaptap_test`, `partnerhud_test`, `ds_tokens_test`.

**Derde ronde (21-11): de drie open punten zijn gedaan.**

- **Eén geel:** `PALETTES.uit.mission` is `#f9c80e` (het hoofdgeel `--ds-c-ink-geel`); `mapstyle.js` en de 3D-lintkleur ook. Contrast: geel op glas 11,9:1, op de minikaartkleuren (weiland, park, bos, dorp) minstens 3,3:1, inkt op geel 10,9:1; tegen papier 1,4:1, dus altijd met inktrand. Vastgelegd in DESIGN_SYSTEM.md (Colour roles) en bewaakt door `navtarget_test`. Niet aangeraakt: wanted-sterren, speciale dag, modelkleuren en de `var(--mk-mission, #e8c93a)`-terugvallen (die worden live overschreven; hun tests hangen aan de oude hex).
- **3D-bakens:** `worldmarker3d.js` leest `NAV_ROL`: `goal` en `checkpoint` zijn geel (waren cyaan), `start` geel, `user` paars, `job` oranje, `optional` roze, `garage` en `vehicle` oranje (de spuitdienst), `door` groen. De vorm onderscheidt ze (ruit, driehoek, ring, ruit-met-deur, enz.). De ringen van de actieve missie (`MARKER_COLOR_ACTIVE`) zijn geel. Cyaan en blauw blijven waar het water betekent: de vaarlijn en boeien (`vaarlijn3d.js`, `waymarkers3d.js` `MODE_COLOR.boat`, het zoekgebied van de politie is blauw/rood en blijft). `missionActive` bestaat nog als paletsleutel voor de kleurenblind-paren (`a11ylogic.js KEY_PAIRS`) maar is geen markerkleur meer.
- **Grote kaart (`mapview.js`):** de route die je volgt is dik (1,3 keer), de andere routes dun (0,55) en gedempt (60 %); het doel dat je volgt is een rond icoon met de afstand eronder, wachtende doelen zijn kleine ronde iconen (`drawMapTargets` in `navpijl.js`); jouw eigen doel houdt zijn paarse pin en krijgt de afstand. De legenda heeft een nieuwe rij "Doel dat je volgt" en de routerij legt dik en dun uit. Alles uit `resolveNavTargets(snapshotFromWorld(...))`: dezelfde momentopname als de minikaart (`navtarget.js`).
- **Nog in beeld te controleren (Electron, na de releasegate):** de 3D-bakens in geel op dag en nacht (leesbaarheid tegen lucht en straat, en de verwarring start/doel nu beide geel: ruit tegen driehoek); de dikke gele route en de dunne routes op de grote kaart bij elke zoom; het ronde icoon en de afstand op de grote kaart (overlap met de bestaande missiepins, schaal bij uitzoomen); de nieuwe legenda-rijen; hover en klik op pins onder het icoon; de boog en punten op de minikaart (N-badge, wind), het afstandsplaatje in de hoeken, de kleurrand van de GPS-kaart (ook op 1280), het uitlegvenster en Beweging beperken.
- **Nog open:** de HUD-doelkaart (job bordgroen tegenover oranje, I6), het kleurenblindpalet (I17), de spelerskleuren met geel- en paarstinten (I18) en de lichtgroene eigen-voertuigpijl.
- `mapstyle_test`, `routeribbon3d_test` en `mode_route_test` draaien niet in deze worktree (three.js niet gestaged); de 3D-wijzigingen zijn met `--check` en `navtarget_test` bekeken.

**Vierde ronde (21-11): compact.** Feedback op de echte screenshot: de boog met plaat stond te ver van de rand en nam een derde van de kaart. Nu: één rond icoon (straal 12) met 3 px inzet tegen de rand, een tag van 13 px (17 px hoog) direct ernaast aan de binnenkant (`tagPlek`), wachtende doelen en mensen als punten (straal 8,5) op dezelfde rand; geen stippellijn, boog of plaat. `compactDistance` (`navtarget.js`): onder 1 km tientallen meters, 1 tot 10 km een decimaal, daarboven hele kilometers. Obstakels (`place`): de N-badge, het windschijfje en de hitte-chip (zolang hij bestaat) duwen markers langs de rand weg; het doel dat je volgt wijkt alleen voor die vaste dingen. De richting volgt `mapRotation`, dus de rotatie-fix van `kaart-heading-21-11` (viewanchor.js, nog niet in main) werkt vanzelf mee zodra die er is. Beelden: `docs/beeld-21-11/minimap-pijlen/ronde4/` (`oud-nieuw.png`, `overzicht.png`, het oude spelbeeld van de eigenaar), gemaakt door de echte spelcode in een headless Chrome (`node scripts/minimap_pijlen_ronde4.mjs`). Nog in beeld te controleren: het icoon van 12 px en de tag op de echte minikaart bij 1280 en 1920 breed, de hoeken, en de wijkplek naast de N-badge.

## 10. Samen spelen

Het doel is van de speler zelf: elke speler heeft zijn eigen doel (`goal.js`, per speler lokaal), dus de pijlen zijn per speler lokaal en er is geen nieuw netwerkveld of EXTRA-bericht. Een gast ziet het doel van de gastheer en de groepsdoelen als missie van de groep (geel, rang tussen missie en eigen doel; `kaartDoelen`, `gastDoelen`); de gastheer ziet zijn eigen groepen. Wegvallen of later aansluiten: de lijst komt elke frame uit de bestaande bronnen, een doel dat wegvalt heeft geen pijl meer. Medespelers staan als holle pijlen in hun eigen kleur, uit dezelfde lijst als nu. Beloning en voortgang veranderen niet. Test: `navtarget_test` (Samen spelen-blok) en de bestaande `partnerhud_test`.
