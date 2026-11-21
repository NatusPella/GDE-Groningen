# Thuis per verhaalstap: verhuizen (21-11)

Pakket "verhuizen" van epic #1121 (eigenaar-verzoek: "nu is het altijd in Paddepoel"). Datamodel: `game/js/homebase.js`; test: `scripts/homebase_test.mjs`. Besluit (eigenaar, 21-11): geen vaste reeks verhuizingen maar per stap van het verhaal een andere logische plek; het actieve thuis wisselt mee; de speler kan altijd naar zijn huidige thuis en kan zelf een thuis vastpinnen.

## De verhaalplekken

| Akte | Thuis | Waarom | Interieur (variant van het bestaande flat-interieur) |
|---|---|---|---|
| 1 (M00 tot M07) | de flat in Paddepoel | huisgenoten sinds 14 augustus, buurman Veldkamp met zijn duiven | `flat-standaard` |
| 2 (M07 tot M12) | Oma Trijntjes logeerkamer, Noorderhaven | ze logeren bij Oma terwijl het recept van 1953 wordt gered | `kamer-oma` |
| 3 (M12 tot M17) | Lammerts havenkantoor, Eemshaven | twee bedden in een kantoor (Lammerts grap); hun eerste eigen stek | `kantoor-haven` |
| 4 en begin 5 (M17 tot M23) | Tinus' schuur bij Zuidhorn | de Escapade krijgt zijn luik; slapen tussen de trekkers | `schuur-tinus` |
| rond het Ontzet (M23 tot M27) | Oma's keuken, Noorderhaven | de dagen voor de finale | `kamer-oma` |
| Deel 4 en daarna (M27 en verder) | de flat in Paddepoel, nu als stel | weer thuis; de kamerindeling is anders, de koelkastlijst hangt vol | `flat-stel` |

Dat zijn vier verhuizingen tussen vijf verhaalhuizen (Paddepoel keert terug). Dit wijkt licht af van `homeByAct` in de personagedossiers (docs/PERSONAGES-DOSSIERS-21-11.md: akte 2 de flat en Geesje in Warffum); de dossiers zijn voorstel en volgen deze tabel bij de eerstvolgende ronde. Beppe's huis (bezoekjes in akte 1) blijft een bezoek, geen thuis.

## Het model

Eén actief thuis per speler: `{ v: 1, active, unlocked: [...], pinned }`. Elk thuis heeft `id`, naam, soort, interieurvariant, ankerplek (een startplek van een missie of een eigen spot, geen echt adres), buren (personage-id's), slaap-, kast- en garagemogelijkheid, de stap vanaf wanneer het vrijkomt en een zin met de reden. `activeHome(state, stepId)` geeft het vastgepinde thuis (als het open is) of het verhaalthuis van die stap. Een thuis dat het verhaal heeft laten zien, komt open en blijft open (de verzameling wordt alleen groter).

**Migratie:** een bestaande save heeft geen `home`-veld en leest als Paddepoel, niets extra open, niet vastgepind: dat is precies wat het spel nu doet. Er wordt niets in de save geschreven tot de speler iets doet (pinnen) of het verhaal verhuist.

**Bezit:** `registerHome({ id, name, ref })` laat de Bezit-epic een gekocht pand als thuis aanbieden; het komt nooit vanzelf uit het verhaal, de speler pint het zelf.

## Wie leest het actieve thuis (te koppelen)

Het model is klaar en getest; de consumenten lezen `activeHome()` en bouwen hun gedrag daarop. Wat nog moet (alle kleine aanpassingen, per consument één import): slapen en opslaan (waar je kunt slapen), "naar huis" (taxi en snelreizen: waarheen), respawn na het ziekenhuis, het flat-interieur (variant per thuis), de garage (waar de Escapade staat), de kast (kleding-epic: de kast reist mee of staat per thuis), kaartmarkering "Thuis", de startkaart en Spullen. Samen spelen: elke speler heeft zijn eigen thuis (lokaal, zoals zijn voortgang); een gast ziet in andermans wereld zijn eigen thuis, de host dat van de host; er is geen netwerkbericht voor nodig.

**Eén bron:** `homebase.js` is de bron voor de verhaalplekken; de `homeByAct` van Tammo en Tessa in de personagedossiers volgt dat bestand (besluit 21-11).

**Waarom het nog niet in de wereld hangt:** `home.js` bouwt de fysieke flat in Paddepoel (geometrie, garage, spots) en kent maar één gebouw; een thuis per verhaalplek vraagt de interieur-, kleding- en tuning-werkstromen (epic-interieurs `homeStyle`/`pinInterior`, epic-kleding `wardrobeMenu`), die op deze branch nog niet zitten. De koppeling is klein zodra die gemerged zijn: lees `activeHome()` in `home.js` (spawn, garage), de slaapplek en de reis "naar huis".

## Verhuisscènes en continuïteit

Elke verhuizing krijgt een kort moment, geen losse missie: een overgangsscène of een regel in de eerste scène op de nieuwe plek (de nieuwe buren via het introductieprotocol: Oma's buurvrouw, Lammert, Tinus en Henk). Spullen, outfits en props verhuizen mee: de Escapade en de kast gaan mee, de matras ook (de grap uit de opening). Cutscene-continuïteit: een scène die in een thuis speelt, gebruikt het interieur van het actieve thuis (regie-regel in de scène, geen nieuwe assets).

## Nog niet bekeken

Niets hiervan is in beeld gezien: de interieurvarianten bestaan alleen als naam (`interior`) tot ze in het flat-interieursysteem zijn gebouwd; zie docs/VERHAAL-VERIFICATIE-21-11.md.
