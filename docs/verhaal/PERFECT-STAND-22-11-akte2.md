# Perfect-ronde 22-11, akte 2: stand (#1121, WP3 #1126)

Eigenaarsbesluit 22-11: het nieuwe verhaal moet helemaal perfect. Dit blad is het verslag van de scope akte 2 (Oma, Mem als stem, Warffum, Beppe, N5 tot en met N12, K1 en K2, de carrière-proefjes en M07 tot en met M11). Werkwijze: per stap (a) bereikbaarheid, (b) tekst, (c) audio, (d) props en beeld, (e) systemen. Niets is in beeld of gehoor gezien (geen Electron in deze ronde): wat hier "gedaan" heet, is met node-tests en audits op de echte tegels (`game/world` van de hoofdmap) vastgesteld, de rest staat als "nog niet bekeken". Toetsen: `scripts/verhaal_akte2_perfect_test.mjs` (239 controles, zuiver node), `scripts/akte2_beats_audit.mjs` (151 regiebeats) en `scripts/akte2_bereik_audit.mjs` (11 reisdoelen op de tegels; vraagt `GAME_WORLD` met de provincie).

## Genomen besluiten (uit de opdracht, toegepast)

Dubbele of zwakke grappen mogen weg, ook als ze al zijn ingesproken (de wachtlijst groeit, de TTS-ronde volgt). Gronings-droog wint; de humorkeuze is door mij gemaakt langs drie lenzen (Gronings-droog, absurd, warm), de eigenaar mag achteraf vetoën. Oude saves: de migratie van N1 tot en met N12 en K1 tot en met K3 blijft (`storymigratie_test` en `storymigratie_k_test` groen); er is niets aan ID's, volgorde of beloning veranderd. Samen spelen: de wereld is van wie het spel opende, een gast speelt een N- of K-stap lokaal mee (J of N bij Meedoen), voortgang en beloning zijn per speler (#429); geen nieuw netwerkbericht, dus geen nieuwe coöptest (`multiplayerstorysteps_test` groen).

## Per stap

| Stap | Gedaan en gefixt | Open |
|---|---|---|
| M07 Al het vet van Grunn | Regie: de beats van M07.1 stonden op regels van vóór de humorkeuze (7 beatregels vielen stil weg) en volgen nu de echte regels. Mem's appje (M07.3) en Tessa's telefoontjes blijven alleen tekst. | Beeld nog niet bekeken. |
| M08 Fatbikes | Lead van 27 naar 24 woorden. Regie: 5 beatregels van M08.1 en M08.3 stonden op oude regels (de kleinzoon, de vijf namen) en zijn hersteld. Het prikbord waar Tessa naar verwijst hangt nu in Oma's kamer (nieuwe prop `prikbord`, 160 driehoeken). | Het prikbord in beeld (N8, logeerkamer) nog niet bekeken. |
| O4 Een jas (Mem als stem) | Mem spreekt (telefoon, twee regels), Tessa legt aan Tammo uit wie Mem is; de Friese woorden in de ondertitel zijn gecontroleerd. | Opname van Mem staat op de wachtlijst (TTS-ronde). |
| N10 Een middag op het terras | Reisdoel stond in een gebouw (8 m naast open grond): verschoven naar open grond bij de weg. Regie: "laat in de middag" (M08 is dinsdagmiddag). | Beeld: de scène is ondertitelpraat, niet geregisseerd. |
| N8 Een avond bij Oma | Doel was al open grond (18 m van een weg). | Het prikbord als geregisseerde scène (de scène is ondertitelpraat). |
| T1 Trein naar Warffum | Doel op open grond, weg op 3 m. | De 3D-droomsequens van T2 (zie daar). |
| M09 Heel aankomen | Lead korter (Geesje werd twee keer aangekondigd). Regie: de beatregel "Je vroeg niet naar" volgt de gekozen regel. De missiestukken zijn door `akte2_doelen_test` gedekt (250 controles, in een eerdere ronde groen; niet opnieuw gedraaid, het duurt elf minuten). | Beeld nog niet bekeken. |
| N5 De boerderij bij Warffum | Reisdoel stond bij de pastorie (75 m van K1, binnen beide stralen: K1 liep direct na N5 af) en op een gebouwrand; nu 1,4 km westelijk bij een boerderijcluster op open grond. De kippengrap stond in M09.1 én N5 (humorbeat HN-13): N5 heeft nu een nieuwe grap ("Je vroeg nooit naar mijn jeugd. Alleen of er internet was."); de koegrap (HN-14) is een terugkomer geworden ("De koe kijkt weer."). Naam van het doel: "het erf bij Warffum". | Eén nieuwe Tessa-regel wacht op opname. |
| K1 Het land achter de pastorie | Reisdoel stond 230 m van de weg in een weiland: nu bij de Pastorieweg (de start van M09), open grond. Tammo's echo van de eierensorteergrap is geschrapt (dubbel met M09.1). | Beeld nog niet bekeken. |
| M10 Trekker-limo | Regie en tekst onveranderd (beats vonden hun regel). | De sloot-sting (muziekcue C10) ontbreekt als nummer. |
| A1 Bietenoogst | Bijbaan, stil; onveranderd. | |
| N11 Bezorgrondje bij Bedum | Doel op open grond, weg op 38 m (aanvaardbaar voor een dorpsrand). | |
| N12 Lijst op de koelkast | Doel op open grond bij de weg (8 m). | |
| N6 Een dag op het water | Dag in de regie: "donderdag, vroeg in de ochtend" (was donderdagmiddag, tegelijk met M11). Doel open grond, weg op 57 m. Humor van Klaas en Tessa blijft op de neutrale regel (kort en droog). | |
| N7 Streekbus naar Winsum | Dag: donderdag, laat in de ochtend (was vrijdag, buiten akte 2). Doel stond in een gebouw (3 m): verschoven. | |
| T2 Streekbus naar Zoutkamp | Doel op open grond, weg op 2 m. | De 3D-droomsequens (Tammo in een stuntpak, Tessa met een kroon van frituurmandjes) blijft een open punt: beeld nodig. |
| M11 Geleend van de Friezen | Regie: 9 beatregels van M11.1 en M11.8 stonden op oude regels (het havenkantoor, Dijkstra, Lammerts haven) en zijn hersteld. M11.3 kreeg een eigen regie: de broodtrommel met het briefje van Mem (nieuwe prop `broodtrommel`, 36 driehoeken) en een sleutelshot op Tessa's gezicht. M11.6: het appje had geen aanleiding (Tessa antwoordde zonder vraag) en herhaalde de "Is hij lang?"-grap van M07.4; nu trilt haar telefoon, vraagt Tammo "Wie appt je nou weer?" en volgt "Nog steeds lang?". | C09 (de zandplaat) als nummer ontbreekt. |
| K2 De kade in de ochtend | Dag: "vrijdag, bij zonsopgang" (de zandplaat is donderdagnacht; donderdag klopte niet). Doel op open grond, weg op 2 m. | |

## Beppe-bezoeken en Fries

Beppes Friese regels (O1, N3, J6 en F3: 8 verschillende) hadden al een Nederlandse ondertitel (`subtitles.js` FY). Nieuw: een grove uitspraakmarkering onder de regel (`FY_UITSPRAAK`, klemtoon in hoofdletters, geen fonetiek, stijl `.fy-uitspraak`). Het huis van Beppe zelf (briefjes, soep, prikbord) is Nederlands en onveranderd. Open: de uitspraakmarkeringen en de Friese regels zijn niet door een Friestalige gecontroleerd (constitution 1: Fries met zorg); de opname klinkt naar de Gemini-stem Aoede met een Friese accentaanwijzing en is niet beluisterd.

## Muziek

Bestaande cues zijn gekoppeld (`missiesfeer.js`): M08 flaneren (C14), M09 caper (C12), M10 wandeling (C13), M11 water (C21). Open (nummer ontbreekt, niet gekoppeld): C08 Oma's keuken, C09 de zandplaat, C10 de sloot.

## Aantallen

- 17 stappen van akte 2 gecontroleerd; 11 reisdoelen op de echte tegels, 4 daarvan gecorrigeerd (N5, N7, N10, K1).
- 22 beatregels in 5 regiespecs stonden op oude regels (14 verschillende zinnen) en zijn hersteld; 151 van 151 beats vinden nu hun regel.
- 3 dag-fouten in de regie (N6, N7, K2) en 1 N10-dagdeel hersteld.
- 3 dubbele grappen opgelost (kippen N5, eierensorteren K1, appje M11.6), 1 humorbeat herzien (HN-13) en 1 aangepast (HN-14); `humor_test` 1008/1008.
- 2 nieuwe props (`prikbord`, `broodtrommel`) met bouwer, 1 nieuwe regie (M11.3) en een prikbord in M08.3; `cutscene_lint --strict`: 0 blokkerend.
- Stem: 1 nieuwe Tessa-regel op `voice_wacht.json`; `voice_coverage` 3491/3491.

## Nog niet bekeken (geen Electron in deze ronde)

Alle scènes in beeld en gehoor, de leestijd van de ondertitelpraat bij de N- en K-stappen, de plaatsing van de gids op de nieuwe doelen, de uitspraakmarkering als ondertitelregel, de twee nieuwe props en de regie van M11.3 en M08.3.
