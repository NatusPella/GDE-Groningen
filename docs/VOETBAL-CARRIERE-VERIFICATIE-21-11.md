# Voetbalcarrière: gebouwd, getest en nog in beeld te controleren (21-11, epic #1106)

> Hoort bij [VOETBAL-CARRIERE-21-11.md](VOETBAL-CARRIERE-21-11.md) (ontwerp), ADR [0042](../.specs-fire/standards/adr/0042-voetbalcarriere-eigen-profiel-en-dagteller.md) en [0043](../.specs-fire/standards/adr/0043-parodienamen-voor-voetbalclubs.md). Er is in deze fase **geen Electron** gedraaid (een releasegate liep): alles wat hieronder staat als "nog niet bekeken" is nooit in beeld gezien.

## Besluiten van de eigenaar die erin zitten

- Per ronde **zelf spelen** (contractdeel plus bonus, volle ervaring) of **laten uitrekenen** (alleen het contractdeel, 60% ervaring): sim is nooit sneller geld per uur dan spelen.
- Een **kort seizoen**: 7 competitierondes, een ronde per 3 speldagen. De competitie loopt op de speldagen 3, 6, ... 21; met de pauze van 3 dagen is seizoen 1 (de lichte vorm) 24 speldagen. Beker (4 rondes, op 4, 10, 16 en 22) en Waddenbeker (op 5, 11, 17 en 23) liggen ertussen vanaf seizoen 2.
- **Ontgrendeling per akte** (akte 4 = voetbal en regio): `voetbalpoort.js` is een stub met dezelfde vorm als `unlockgate.js` van de verhaal-epic (`worldOpen('voetbal', progress)`); bij de merge vervangt `zetPoort(...)` de stub. Zonder `gate`-veld (bestaande save) is alles open.
- Canon: Tammo en Tessa zijn net afgestudeerd en werkloos; geld is krap; geen jeugd of leeftijd in de beats (test).

## Wat er is (pure modules, alle met tests)

| Pakket | Bestanden | Test |
|---|---|---|
| #1107 spelers, ratings, 24 clubs | `voetbalplayers.js`, `voetbalclubs.js`, `voetbalmatch.js` (opties `ratings`, `teams`) | `voetbal_spelers_test` |
| #1117 velden uit de kaart | `scripts/world/build_voetbalparken.mjs`, `voetbalparkendata.js` (281 parken, 139 plaatsen, 27 kB), `voetbalparken.js` | `voetbalparken_test` |
| #1108 seizoenen en agenda | `voetbalseason.js`, `voetbalagenda.js` | `voetbal_seizoen_test`, `voetbal_ontwikkeling_test` |
| #1109 ontwikkeling | `voetbalontwikkeling.js` | `voetbal_ontwikkeling_test` |
| #1110 opslag, menu, start | `voetbalcarriere.js`, `voetbalcarrierelive.js`, `voetbalcarriereui.js`, sleutel `gde-voetbalcarriere-v1` | `voetbal_carriere_test`, `voetbal_carrierelive_test`, `voetbal_ui_test` |
| #1111 transfers, managers | `voetbaltransfers.js` | `voetbal_transfers_test` |
| #1112 beats en poort | `voetbalbeats.js`, `voetbalpoort.js` | `voetbal_beats_test` |
| #1114 Samen spelen | `voetbalsamen.js` | `voetbal_samen_test` |
| #1115 wereld, beeld, geluid | `voetbalworld.js` (regels en gegevens), `voetbal.js` (veld op het park, uitshirt) | `voetbal_wereld_test` |
| #1118 sponsors | `voetbalsponsors.js` | `voetbal_sponsors_test` |
| #1113 clubbezit | `voetbalclub_bezit.js` (interface, eigen profielveld tot Bezit er is) | `voetbal_sponsors_test` |
| #1116 prestaties en balans | 11 prestaties in `achievements.js` en `steam/achievements.json`, `scripts/voetbal_carriere_sim.mjs` | `voetbal_carrierelive_test`, `steam_test` |

**Headless sim-testbank:** `node scripts/voetbal_carriere_sim.mjs [--seizoenen=3] [--char=anita|tammo] [--strategie=speel|reken|mix]` rekent seizoenen door (promotie, standen, economie, determinisme: dezelfde seed geeft dezelfde uitkomst voor alle spelers). Meting 21-11 over drie seizoenen: wie elke ronde zelf speelt verdient ongeveer 420 euro per actief uur (ruim onder het gemiddelde van 1.100); wie alles laat uitrekenen ongeveer 18 euro per uur wereldtijd. Een goed ontwikkelde speler stijgt en zakt weer, want de lokale club is zwak: de speler groeit mee door training.

## Wat de tests niet dekken (in Electron te controleren)

Alles hieronder is **nog niet bekeken**. Controleer op 1280x720, 1280x800 en 4K.

1. **Het kindscherm Voetbal** (Loopbanen, vak Buiten, knop "Open je voetbalcarrière"): tabs Vandaag, Selectie, Kalender, Stand, Training (en Trainer, Manager na ontgrendeling), DS3-uitstraling, microanimaties, focusvolgorde met toetsenbord en controller, Esc terug naar Loopbanen. `voetbal_ui_test` bewaakt alleen de HTML.
2. **De carrièrewedstrijd** (knop "Speel de wedstrijd"): `voetbal.js` zet het veld op het sportpark van de thuisploeg (middelpunt en lengteas van het grootste veld uit `voetbalparkendata.js`; veld over het park heen, op de gemiddelde hoogte). Controleer: past het veld, staan lijnen en doelen goed, kijkt de camera de goede kant op, lopen de poppetjes met de juiste hoek (`rotation.y = face - pi - site.a`), verdwijnt het veld en de speler terug naast het veld, werkt de Euroborg-wedstrijd nog precies als eerst (de bouw gebeurt nu in de eigen ruimte van een groep). `voetbal_rook_test` draaide hier niet (THREE niet gestaged).
3. **Uitslag, banner en geld** na de wedstrijd, en dat een gestopte wedstrijd de ronde laat staan.
4. **Nachten**: de speldag loopt op het nachtsignaal (de klok die meer dan vier uur terugspringt); controleer slapen, een late trein en middernacht.
5. **De uitnodiging en beats** als stille appjes (`kind: 'tip'`), niet tijdens een missie, scène of kaart; hooguit een per speldag.
6. **Shirts en publiek** (ronde 3): het publiek langs de lijn van een dorpspark staat er nu (`voetbalpubliek.js buildCrowd`, een `InstancedMesh` van 30 tot 140 figuren naar klasse, een sprong bij een doelpunt, uit bij kwaliteit laag en bij verminderde beweging; regels en aantallen in `voetbalworld.js`, test `voetbal_wereld_test`), **niet in beeld bekeken**. Shirtpatronen zijn **niet getekend**: de poppetjes (`buildPersonMesh`) hebben vertexkleuren in een gedeelde geometrie, dus een streep of helften vraagt een eigen shirtlaag; alleen het uitshirt bij gelijke teams is gekoppeld. Geluiden (fluit, publiek, doelpunt) lopen via `sfxEvent` met bijschrift (test: elke gebruikte sleutel staat in `sfxmap.js`); eigen bestanden uit Freesound of Kenney zijn niet opgehaald (downloaden vraagt toestemming, ADR 0039).
7. **Kaartlaag Voetbal** en **trainende teams** (ronde 3): met een carrière staan het thuispark, het trainingsveld en bij een uitwedstrijd het park van de tegenstander op de kaart (`mapSpots`, `kaartlaagSpots` in `voetbal.js`; nooit alle 281 parken); trainende figuren (`makeTrainers`, jogrondjes en een bal, op de velden binnen 150 m, elke halve seconde bijgewerkt, niet tijdens een wedstrijd) zijn aangesloten, **niet in beeld bekeken**.
8. **Reizen naar een uitwedstrijd**: de wedstrijd start nu vanuit het menu (de speler wordt naar het park gezet); de reis via de kaart met reisopties is niet gebouwd.
9. **Samen spelen** (`voetbalsamen.js`, ronde 3): gekoppeld. Een gast geeft bij J zijn ratings mee in `wedgast` (`r`, hexblok, de host klemt), de derby-indeling reist in de start-`v` (`t1_3`), `makeMatch` kent `team` per mens (de uitslag is per eigen team) en de host zet Derby aan met toets 8 in het keuzescherm. Test: `coopwedstrijd_voetbal_test` (42 controles, onder meer een derby met vier bots) en `voetbal_samen_test`. **Niet in beeld bekeken**: de camera is niet gedraaid voor team 1. Het protocol (`net/protocol.js`) is ongewijzigd (test).
10. **Sponsorpanden**: gekoppeld via de dunne adapter `voetbalbezit.js` (alleen lezen: de Bezit-pandindex en `ownsBuilding`; Bezit zelf is niet gewijzigd, `voetbal_bezit_test`). `main.js` geeft de pandindex door zodra Bezit hem geladen heeft; zonder index kiest een sponsor geen pand. De gevelborden (`shopsigns3d.js`) lezen `facadeNames(sponsors)` nog niet: die koppeling en het zien van het bord op een pand zijn niet in beeld bekeken.
11. **Clubbezit**: de aandelen zitten nu in het carrièreprofiel (`buyClubShare`, `sellClubShare`, dividend per competitieronde via `clubDividends`; het eerste aandeel komt klaar na 3.000 euro voetbalverdiensten of bij de Manager-rol) en het Manager-scherm toont ze (kopen en verkopen). Er is nog geen subtab Club in Bezit: `EXT_KEYS` van Bezit kent de sleutel `club` niet en Bezit blijft ongewijzigd. Het Manager-scherm is niet in beeld bekeken.
12. **Reclameborden en sponsor op het shirt** staan als gegevens (`boardNames`, `shirtText`), niet in beeld.
13. **Rol van de speler in de sim**: de mens krijgt in de sim altijd een aanvallersplek (de bestaande volgorde); Tammo (middenvelder) speelt daardoor op een aanvallersplek tot `makeMatch` een voorkeursrol kent.

## Balansgetallen die de balansronde (#1116) moet bevestigen

Startwaarden: contractdeel 25, 60, 90 per ronde (Talent, Terp, Kroon); winst 30, 60, 80; seizoensbeloningen 200 (promotie), 400 (beker), 500 en 1.200 (kampioen), 1.000 (Waddenbeker); sponsorsommen 150 tot 800; clubaandeel 0,45% per speldag. Een echte meting hoort bij Electron en de economie-sim (`economie_sim_test`).

## Verhaallijn V1 tot en met V3 in akte 4 (#1179)

Tessa is de ster, Tammo helpt haar shinen. Drie stappen op bestaande doeltypes (`storyarc_nieuw.js`, na M19, voor de bus naar Bourtange), alle stil (telefoonregels, geen stem):

| Stap | Doel | Wat |
|---|---|---|
| V1 Schoenen voor de ster | `shop` (kledingwinkel) | Tammo heeft haar opgegeven bij de club in Veendam en betaalt de eerste maat |
| V2 De eerste training | `reis` naar Veendam | Training; Tammo regelt de papieren, Tessa schittert |
| V3 Het is jouw avond | `shop` (avondwinkel) | Een sponsor geeft een rondje; de selectie vindt haar aardig |

- **Migratie:** de stappen zijn tussenstappen (`BETWEEN_STEPS`, zoals A1 en A2): een oude save die al voorbij M20 was krijgt ze als gedaan, een save bij M19 of de bus krijgt ze nog te spelen. `passedBetweenSteps` kijkt nu naar de eerste stap na een reeks tussenstappen, zodat opeenvolgende tussenstappen kloppen (`loopbaanstart_test`).
- **Geen voorwaarde:** de carrière zelf opent via `voetbalpoort.js` al in akte 4; de stappen geven de reden en de eerste aanloop. De canon blijft: net afgestudeerd, geld is krap, geen jeugd of leeftijd in de tekst.
- **Samen spelen:** een verhaalstap is per speler (eigen voortgang, #429). Elke speler loopt V1 tot en met V3 in zijn eigen spel; er is geen hostactie en een gast die later aansluit loopt ze in zijn eigen verhaal. Dekking: de bestaande migratie- en coöp-verhaaltests (`coopverhaal_test`).
- **Nog niet bekeken:** de verhaalstroom (`storyflow_nieuw_test`, `akte4_test`) draait op three.js en kon in deze omgeving niet (niet gestaged); de coördinator draait ze bij de merge.

## Humorbeats (voorstel, nog niet door het panel)

Voorstellen voor de humor van de carrière. Ze zijn bewust droog en nooit gemeen; de bewerking met drie varianten en drie reviewers is nog niet gedaan, dus alles hieronder is een voorstel en staat niet in de code, behalve waar het al in het commentaar zit.

1. **De koffiebon als kantoor.** Tammo's kantoortje is een app en een koffiebon; bij elke transfer vraagt hij of het contract ook op een bierviltje mag.
2. **De scheidsrechter met een thermosfles.** Een vaste grap in het commentaar: de scheidsrechter fluit pas als zijn thermosfles dicht is (voorstel voor Roelie).
3. **Oma Trijntjes hoed.** Elk doelpunt van de ster gaat de hoed een gracht verder; na het derde doelpunt zwemt de hoed terug (voorstel, bij B4 en B7).
4. **De sponsor die te vroeg juicht.** De Gouden Bakkerij bedankt in de rust al voor het kampioenschap (voorstel voor Hilbrand).
5. **Dividend in natura.** Een clubaandeel van tien procent levert elke ronde "een zak krentenbollen" op in de ondertitel, naast het geld (voorstel).
6. **De spoedcursus.** Tessa's teamgenoten vragen waar ze het geleerd heeft; haar antwoord is altijd "bij het dorpsteam, weet je nog", terwijl Tammo verbaasd kijkt (voorstel voor de V-stappen).
7. **De waterdrager.** Tammo draagt in V3 de tassen en zegt dat hij alleen de papieren draagt (staat al in V3).
8. **Zeven rondes.** Roelie rekent in het commentaar elke ronde zijn kansen uit en komt nooit op zeven (voorstel; de rondetelling staat al in de seizoensregels).

## Ronde 4 (22-11, branch voetbal-r4-22-11): balans, exploits, shirts, borden en het tabblad Club

Geen Electron, geen beeld: alles hieronder is met pure tests of een mock-scene (echte three.js, geen renderer) gecontroleerd en **nog niet bekeken of beluisterd**.

- **Balans (#1116):** `scripts/lib/economiesim.mjs` kent nu een bron `voetbal` (420 euro per actief uur, gemeten met `voetbal_carriere_sim.mjs`); `economie_sim_test` bewaakt dat de sim dit blijft opleveren en dat een tiende van de speeltijd in voetbal het netto per uur met minder dan 15% verschuift. `scripts/voetbal_balans_test.mjs` rekent zes seizoenen over beide personages en alle drie de strategieën en bewaakt: spelen is duidelijk beter dan laten rekenen, het geld per actief uur blijft onder 115% van het gemiddelde van de hele economie, en de nachtlus (elke vier echte minuten slapen en alles laten rekenen) haalt hooguit 15% van dat gemiddelde.
- **Exploit-audit (#1116):** kopen en meteen verkopen van een aandeel kost altijd geld (75% terug); het dividend betaalt een aandeel pas na ruim twaalf seizoenen terug; een sponsordoel betaalt eenmalig, ook na opslaan en laden; een ronde is niet twee keer te spelen en opnieuw laden geeft dezelfde uitrekening; een tweede training op dezelfde speldag kan niet; kopen en verkopen van spelers is een verlies en de clubkas komt nooit bij het geld van de speler. **Gevonden en gerepareerd:** een bewerkte save kon een aandeelprijs tot 1 miljard dragen (dan keerde dat aandeel miljoenen dividend per ronde uit); `normClubBezit` klemt de prijs nu op de duurste hele club met volle schaalopslag (750.000).
- **Prestaties en tellers (#1116):** elke `vc_`-prestatie heeft een ontgrendelpad in `achievementsFor` en elk pad een definitie; `steam/achievements.json` volgt titel en omschrijving (`steam_test` 126 groen, `spec_check` 0 fouten).
- **Shirtpatronen (#1115):** de rompgeometrie is gedeeld en heeft vertexkleuren, dus een streep of helft komt als eigen laag: `attachShirtBands` in `models3d_people.js` zet een mesh (samengevoegde dunne dozen in de tweede kleur) aan het borstbeen, een drawcall per speler, gedeelde geometrie en materiaal; `shirtBands` en `shirtBandsFor` in `voetbalworld.js` leiden de banden af uit `shirtRects`. De keeper en een effen shirt krijgen niets. Test: `voetbal_shirt_test`. De afmetingen volgen de doorsnede van de romp: of de strepen er goed uitzien is **niet bekeken**.
- **Trainers via sfxEvent (#1115):** `makeTrainers.tik(t, kick)` geeft per ploeg een trap per 2,4 tot 3,6 s; `voetbal.js` speelt `football_kick` zacht (gain 0,35) en alleen binnen 60 m. Test: `voetbal_publiek_test`. Niet beluisterd.
- **Reclameborden (#1118):** `buildAdBoards` (`voetbalpubliek.js`) zet vier borden per zijlijn met de verzonnen namen van de geaccepteerde sponsors (hooguit drie), op het sportpark en in de Euroborg; ze verdwijnen na de wedstrijd. De gevelborden op het sponsorpand lopen sinds de Bezit-epic via `signSpecFor` (`bezitinterior.js`) in `shopsigns3d.js`: dat deel was al af.
- **Tabblad Club in Land en bedrijf (#1113):** `clubui.js` (pure HTML plus knoppen) staat in het pausemenu naast Snackwagen; de aandelen blijven in het carrièreprofiel (geen eigen opslag, `EXT_KEYS` van Bezit is niet gewijzigd). Test: `clubui_test`, `bezitui_test`.
- **Nog open (alles vraagt beeld):** publiek op de tribunes van de Euroborg zelf (de tribunegeometrie is niet te controleren zonder beeld; `crowdSeats` bestaat als pure functie), eigen geluidsbestanden (downloaden vraagt toestemming, ADR 0039), een perf-meting met 22 spelers plus publiek en borden (fps-metingen zijn exclusief), en een echte balansronde in Electron.
