# Binnenmissies spelen echt binnen, 21-11

Aanleiding: feedback van de eigenaar op de missie met het Loket (M03, het Stadhuis): "Interieur is leuk! Soms spawn je alleen weer buiten. Het interieur is ook buiten. De camera toont soms random dingen. Er staat nu bijv. een fietsenstalling binnen. Iets te veel pannende camerashots en soms het dak." Dit is de kern van #956. Code: `game/js/binnenset.js` (puur), `stagesets.js`, `missions.js`, `cineshots.js`, `cutscript.js`. Test: `scripts/binnenset_test.mjs` (139 controles). Zie ook [COOP-GAST.md](COOP-GAST.md) (Binnensets).

## Hoe een binnenset werd gebouwd (en wat er misging)

`stagesets.js` zet de kamer (een `THREE.Group` met een BackSide-doos: wanden, vloer en plafond zijn alleen van binnen te zien) op de plek van de speler, in de open lucht, op de vloerhoogte van de kaart. Daardoor:

1. **De wereld staat er dwars doorheen:** een fietsenstalling, lantaarn, voetganger of auto op die plek staat gewoon in de kamer (de kamer is een decor, geen apart gebouw).
2. **De spelcamera (volgcamera) loopt naar buiten:** de camera botst tegen gebouwen, niet tegen de kamer. Hij zakt door een wand (BackSide: van buiten onzichtbaar), kijkt de wereld in, of hangt boven het plafond en toont het dak of de buitenkant.
3. **Soms geen kamer:** zat de speler in een voertuig, of paste de kamer niet (gebouw, water, onbekende grond), dan speelde de stap gewoon buiten.

## Ontwerp: één generiek "echt binnen"-mechanisme

Gekozen is optie (b) uit de opdracht: de set blijft op de plek, maar wordt **exclusief**: de wereld wijkt, de camera blijft erbinnen en de speler staat er altijd. Een eigen "binnenplek" op een afgelegen vaste locatie (een pocket) is niet gekozen: het vraagt een teleport weg van de wereld, tegels, achtergrondverkeer, opslag en Samen spelen (andere spelers zien de speler verdwijnen) en een tweede wereldlaag; de bestaande bouwstenen (kamers van `rooms3d.js`, de sets) hebben dit niet nodig. Afgewezen alternatief: de gevel van een echt gebouw "uithollen": gebouwen hebben geen binnenwerk en elk gebouw heeft een andere voetafdruk, dus de kamer zou per gebouw moeten passen.

| Onderdeel | Hoe |
| --- | --- |
| Maten | `SET_DIMS` (kantoor, serverkamer, loket, omakeuken, kroeg, woonkamer, garage, kruitkelder); de test houdt ze gelijk aan de bouwers. |
| Wereld erbuiten | Bij het bouwen komt er een clearzone (`clearzone.js`, id `binnenset`) om voetafdruk + 2 m (`PROP_MARGIN`) en een directe sweep (`forceClearSweep`): voetgangers lopen eruit, AI-verkeer verdwijnt, losse props (fietsenstalling/nietjes, bankjes, bakken, lantaarns) worden weggeduwd. Bij het opruimen van de set gaat de zone weg. Props worden verplaatst, niet teruggezet. Statische bomen en gebouwmassa blijven staan, maar de gesloten kamer (wanden, vloer, plafond) houdt ze uit beeld. |
| Camera | Tijdens een stap met `hold` zet `missions.js` een vaste kamercamera (`world.cameraOverride`, `bron: 'binnenset'`): achter de speler (max 3,2 m), 1,75 m hoog, altijd binnen de wanden (0,45 m) en onder het plafond (kamerhoogte - 0,3 m), een harde snee, met een lichte inzoom (fov 64 naar 56 in 40 s) en **geen pan**. Een lopende cutscene gaat voor; bij het einde van de stap gaat de override weg. Een stap zonder `hold` (de wachtstap in de serverkamer) heeft geen kamercamera: de speler loopt vrij. |
| Plek | Past de kamer niet bij de speler (gebouw, water, onbekende grond), dan zoekt `findSetSpot` op ringen van 6, 12, 20, 32 en 48 m de dichtstbijzijnde plek die wel past en zet de speler daar (de `hold` houdt hem er). Past nergens iets, dan speelt de stap buiten zoals voor deze wijziging. De kroeg en de kruitkelder mogen in een gebouw staan. |
| Voertuig | Een stap met een binnenset laat de speler eerst uit het voertuig stappen, zodat de kamer er altijd is (voor deze wijziging werd de set overgeslagen). |

## Spawnregels

- De speler wordt in een setstap elk beeld op de `hold` van de set gezet; hij staat dus per constructie binnen.
- Na een herstart of checkpoint van de stap wordt de set opnieuw om de (nieuwe) positie gebouwd (`enterStage`), dus ook daar staat hij binnen.
- `chainState().binnen` (`stageSetBinnen`: kamer, variant en x/y, alleen getallen en tekst) onthoudt de binnenplek; `binnenHerstel` zegt waar een speler terug moet als hij buiten de kamer van zijn stap staat. De opslag van een actieve missie (`gde-save-v1`) is niet uitgebreid: een geladen spel begint een missie opnieuw bij haar start, en dan bouwt de stap zijn kamer opnieuw. Niets in `gde-*` veranderd.

## Camera en dak (cutscenes)

- Filmcamera's in een kamer blijven binnen de wanden en onder het plafond - 0,3 m (de clamps in `cutscenehost.js`, `roomspec.js` en `setCameraClamp`); de test bemonstert elke scène met een kamer.
- **Pan-budget** (`cineshots.js` `calmShots`, toegepast in `compileScene`): een pan is een dolly of crane van meer dan 1,2 m of een orbit van meer dan 12 graden. Hooguit **één pan per scène**, nooit twee achter elkaar, hooguit 25% van de shots (bij minder dan vier shots: één). De langste blijft (ingekort tot 4 m of 35 graden), de andere worden een bijna-vaste drift (hooguit 1 m of 10 graden). Voor de wijziging had 100 van 115 scènes meer dan één pan en tot tien achter elkaar. Volgen (`follow`, `tracking`) en inzoomen (`push`) tellen niet als pan: ze volgen een figuur of ademen.

## Samen spelen

Eerder besluit (COOP-GAST, Binnensets): de kamer van een stap is decor van wie het spel opende; een gast ziet de keuze- en wachtpanelen en de scènes (die bij hem in dezelfde kamer worden nagespeeld) maar de stap-kamer zelf niet. Dat blijft zo: de clearzone, de kamercamera en de binnenplek zijn **lokaal bij wie de stap draait** (per speler, niet voor de hele sessie); een gast die later aansluit krijgt ze niet en wordt dus nooit "naar binnen" gezet. Een gast die zelf Meedoen? kiest op een missie speelt zijn eigen weergave; de spelcamera van de gast verandert niet. Alle spelers blijven gelijkwaardig: niemand krijgt hier een recht bij.

## Wat niet is gedaan of bewezen

- Geen Electron-beeld voor/na van het Loket (perf-venster; alleen pure tests). Eerder beeld van M27 (woonkamer) en M20 staat bij #956.
- Bomen en gebouwen in de voetafdruk worden niet verborgen, alleen afgesloten; of een hoge boom boven het plafond uitsteekt is niet bekeken.
- Buitenshots: een controle dat het anker niet boven de gebouwhoogte ligt (geen dak in beeld) is niet gebouwd; de host heeft al `roofAt` (camera uit daken). Alleen binnenshots zijn getoetst.
- De spelcamera bij een spel zonder hold-stap, de kamers van cabaret, rechtbank en snackoverlast (geen binnenset bestaat; alleen de acht kamers hierboven vallen onder het mechanisme).
