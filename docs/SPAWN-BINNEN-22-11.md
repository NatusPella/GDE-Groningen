# Binnenspawn: thuis beginnen in de woning (22-11, #1022, #1161)

Wens van de eigenaar: "in Paddepoel in het appartement spawnen in plaats van beneden voor de deur, alleen als je daar spawnt; we hebben het ook over andere huizen gehad." Eén algemene regel voor elke thuisplek met een betreedbaar interieur. Niets hieronder is in beeld of in het spel bekeken: alles is met pure code en mocks gemeten (geen Electron).

Code: `game/js/spawnbinnen.js` (de keuze, puur), `game/js/flatplan.js` (de plattegrond van de flat, puur, verhuisd uit `home.js`), `home.js` (bouwen en neerzetten in de flat), `interiors.js` (`binnenplekInPand`, een pand met een gewoon interieur), `loadscreen.js` en `loadlogic.js` (het laadscherm wacht), `settings.js` en `pausemenu.js` (Instellingen > Spel > Start binnen (thuis)). Test: `scripts/spawnbinnen_test.mjs`.

## De regel

Verschijnt de speler bij een thuisplek, dan staat hij **binnen** op een logische plek, met de deur of de lift als uitweg. Een plek is logisch als hij binnen het pand ligt, loopbaar is (de bestaande botsing), niet in een meubel of wand ligt en de deur of de lift bereikbaar is. Kan dat niet (het interieur bouwt niet, de wacht loopt over de tijd, de instelling staat uit), dan staat hij **buiten voor de deur**, zoals voorheen. Een save die buiten stond blijft buiten; een save midden in een missie of ergens anders in de provincie houdt zijn plek.

## De spawnmatrix

| Situatie | Waar | Waarom | Code |
|---|---|---|---|
| Nieuw spel | buiten, voor de deur | de openingsfilm en de eerste missie beginnen bij de Escapade in de garage; de film (`intromontage.js`, `story.js` via `homeSpawnPoint`) eindigt daar en blijft ongewijzigd | `main.js`, `homeSpawnPoint` |
| Opening (filmstaging) | buiten | zelfde plek als hierboven: de film gaat naadloos over in de spelerspositie voor de deur, de cutscene is niet aangeraakt | `story.js` `playOpening` |
| Laden: save bij het huis, zonder veld (oude save) | **binnen** | "doorgaan" was altijd thuis; de positie werd al vervangen door de lobby, dus er gaat niets verloren | `applyHomeOnLoad` |
| Laden: save die binnen stond (`thuis.binnen` is true), bijvoorbeeld na slapen | **binnen** | de speler sloeg boven op | `applyHomeOnLoad` |
| Laden: save die buiten stond (`thuis.binnen` is false) | buiten, bij de lobby | die speler stond buiten en blijft dat | `applyHomeOnLoad` |
| Laden: save midden in een missie of ergens anders in de provincie | de bewaarde plek | `laadtOpOpslagplek`; staat de plek in de toren, dan bij de lobby | `applyHomeOnLoad` |
| Laden als gast (Samen spelen) | buiten | een gast staat bij de host; zijn eigen woning zou hem van de groep scheiden | `chooseSpawn` rol `gast` |
| Slapen of rusten | in de woning, blijft | je slaapt al boven; de save na het slapen krijgt `binnen: true` | `sleepNu` |
| Naar huis (pauzemenu) | **binnen** | "naar huis" is naar je woning; stock en garage worden bijgewerkt, de lift is de uitweg | `goHome` |
| Taxi, OV of kaartreis naar het Thuis-icoon | buiten, voor de deur | een reis brengt je naar het gebouw; of je naar boven gaat is je eigen keuze (lift) | ongewijzigd |
| Een missie die thuis eindigt | buiten, bij de deur | je komt zelf aanrijden; het doel is de deur | ongewijzigd |
| Dood, opgepakt, ziekenhuis | het ziekenhuis of het bureau | `respawn.js` zet je nooit thuis | ongewijzigd |
| Hostwissel (#439) | blijft waar hij is | niemand wordt verplaatst | niets |
| Gast sluit aan of later aan | naast de host, buiten | bestaande plaatsing (`coopnet.js`); staat de host boven in de flat, dan weigert `coopVrij` plekken in het torengebouw | `initHome` |
| Start binnen (thuis) staat uit | buiten, voor de deur | de speler kiest zelf | `startBinnen` |

## Welke woningen

| Thuis (`homebase.js`) | Interieur | Gedrag |
|---|---|---|
| De flat in Paddepoel (en "als stel") | de flat van `home.js`, een uitsnede op de elfde verdieping | woonkamer tussen de bank en de keuken, kijkend naar het glas; valt terug op de uitgang van de lift |
| Een Bezit-woning (`registerHome`, `kind: 'pand'`, met `ref`) | het gewone interieur van het pand (`interiors.js`) | `binnenplekInPand`: de loopbare, bereikbare cel met de meeste ruimte nabij het midden van de woonruimte, kijkend naar de gevel. **Niet bedraad:** niets roept dit aan zolang Homebase niet in het spel hangt (#1121) |
| Oma Trijntjes logeerkamer, Oma's keuken, Lammerts havenkantoor, Tinus' schuur | nog geen interieur (alleen een naam in `homebase.js`) | buiten voor de deur |
| Beppe's huis | een bezoek (`beppe_binnen.js`), geen thuis | ongewijzigd |

Zolang Homebase niet in het spel hangt, is de enige fysieke woning de flat in Paddepoel (`huidigThuis()` in `home.js` leest `homeOf('paddepoel')`; daar komt `activeHome()` te staan).

## Wat de save opslaat

`thuis.binnen` (boolean) komt naast `thuis.front` te staan. Een oude save heeft het veld niet en begint boven (geen dataverlies: de plek van een save bij het huis werd al vervangen door de lobby). De positie in de flat wordt nooit als een interieurpositie bewaard: de flat is een uitsnede op de elfde verdieping die alleen bestaat als `home.js` hem bouwt; laden bouwt hem eerst (`spawnInFlat`) en zet de speler daarna neer. Een save met de speler in een gewoon pand (de hal van een winkel of huis) is nog niet afgedekt: zie "Niet gedaan".

## Het laadscherm

`applyHomeOnLoad` bouwt de flat synchroon vóór het laadscherm opent (`loadBootSave` loopt vóór `startLoadScreen`). Is de scène er nog niet, dan zet het de speler bij de lobby en wacht: `world.homeLaad` (door `initHome` gezet) wordt elk beeld door het laadscherm gevoed en telt als een openstaande stap (`loadPending(..., binnen)`). `tickBinnenWacht`: klaar zodra de flat staat, terugval bij een fout meteen of na 6 s (`BINNEN_MAX_S`, korter dan de 12 s waarmee het laadscherm zelf afkapt). Dan blijft de speler voor de deur.

## Samen spelen (de zes vragen)

- **Van wie:** de speler zelf. De binnenspawn is lokaal per speler; er gaat geen bericht over het net. Het interieur is lokaal (elke client bouwt hem; de ander zie je binnen of door het raam).
- **Wat ziet een gast:** een gast die aansluit komt naast de host, buiten; hij laadt zijn eigen save nooit in een woning waar de groep niet is (`rol: 'gast'`). Doet hij zelf Naar huis, dan staat hij boven in zijn eigen flat (lokale keuze, zoals slapen).
- **Beloning en voortgang:** geen; een plek verandert niets aan geld, voortgang of einde.
- **Wegvallen, later aansluiten, hostwissel:** niets te herstellen. Een hostwissel verplaatst niemand; wie later aansluit komt naast de host. Staat de host boven, dan weigert `coopVrij` plekken binnen het torengebouw, zodat een gast of Tessa niet in het massieve gebouw wordt gezet.
- **Enkelspeler-aanname:** geen nieuwe; `hoofdspeler(w)` overal.
- **Test:** `scripts/spawnbinnen_test.mjs` (pure test; geen testbankstap, er gaat niets over het net). Regel in `docs/COOP-GAST.md` (Binnenspawn (thuis)) en `scripts/coop_coverage.json` (`spawnbinnen`).

## Besluiten van deze ronde (conservatief, zonder te vragen)

1. Nieuw spel en opening beginnen buiten: de film en de eerste missie zijn voor de deur geregisseerd (`intromontage.js`: de Escapade bij het House of Groningen, "Elf hoog"). Binnen beginnen kan later, als een eigenaar dat wil, door `chooseSpawn` voor `nieuw-spel` te veranderen, maar dan moet de verhuisdag-scène erbij.
2. Een oude save zonder `thuis.binnen` begint boven (het was altijd thuis). Een save die later buiten wordt gemaakt (`binnen: false`) blijft buiten.
3. Een gast die aansluit komt bij de host, niet in zijn eigen woning: de groep gaat voor.
4. Reizen naar het Thuis-icoon (taxi, kaart) zet je voor de deur: de reis gaat naar het gebouw.

## Niet gedaan

- Een gewone woning (Bezit, `binnenplekInPand`) is nog nergens aangeroepen: Homebase hangt niet in het spel (#1121). De code en de test zijn er, de bedrading volgt met `activeHome()`.
- Een save met de speler in een willekeurig pand (de hal van een winkel of huis, geen thuis): zo'n save heeft geen `ctx: 'home'` en laadt op de bewaarde plek. Het interieur bouwt dan via de gewone scan (`interiors.js`, binnen 24 m, hooguit 0,3 s na het eerste beeld) en laat de speler pas dan door `b.walk`; tot dat moment is het pand massief. Dit is niet veranderd en niet bekeken; de harde variant (eerst bouwen met `binnenplekInPand` of de speler voor de deur zetten) is niet gebouwd.
- Oma's kamer, het havenkantoor en Tinus' schuur hebben nog geen interieur.
- Geen enkele run in Electron: de flat bouwen bij laden, de camera, het laadscherm en de plek in beeld zijn niet gezien.

## Wat in beeld bekeken moet worden (hertest)

1. Doorgaan met een save die boven is opgeslagen (slapen): na het laadscherm sta je in de woonkamer, kijkend naar het raam; de camera staat niet in een muur; het laadscherm blijft tot de kamer er staat; geen flits van de straat.
2. Dezelfde save met Start binnen (thuis) uit: je staat voor de deur, zoals voorheen.
3. Een save die buiten werd gemaakt (naast het huis): je blijft voor de deur.
4. Naar huis in het pauzemenu, vanaf een straat in de stad: fade, dan boven; de lift en de voordeur (E) brengen je naar beneden; de Escapade staat in de garage.
5. Nieuw spel: de film eindigt voor de deur en de speler kan meteen verder (niets veranderd).
6. De bank, de tv-kast en de keuken staan niet in je weg bij de plek; EIKEA-stukken en de Sloapstee veranderen de plek zonder dat je in een meubel staat.
7. Samen spelen (twee vensters, een testbank): de host boven in de flat, een gast sluit aan: de gast staat buiten naast de toren, niet erin; Tessa ook.
8. Scène voor de hertest: `scripts/ui/hertest_scenes.js` (het issue "Spawn binnen in de woning").
