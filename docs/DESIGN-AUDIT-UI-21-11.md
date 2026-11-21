# Alle UI via het designsysteem: inventaris en stand (21-11, issue #1064)

De eigenaar zegt (21-11): "Alle UI moet via Design System 3. Dus ook de benchmark-UI, etc." Dit document is de inventaris van alles in spelerzichtbare UI dat nog niet via de tokens en de `.ds-z-*`-componenten loopt, met aantallen voor en na deze ronde, wat is omgezet, wat bewust blijft en wat nog een beeldverificatie vraagt. De regels staan in [`ui-taal.md`](../.specs-fire/standards/ui-taal.md) en [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md); deze pagina is naslag.

**Niets hieronder is in beeld gezien.** Er is geen Electron gedraaid (de releasegate had de machine); alles is gecontroleerd met pure tests, node-scripts en statische controles. De lijst "vraagt beeld" onderaan is wat de beeldverificatie moet doen.

## Hoe er geteld wordt

`scripts/lib/ds3_regels.mjs` (puur) en `scripts/lib/ds3_telling.mjs` (leest `game/`, `desktop/`, `web/`) tellen per bestand vijf soorten, in `*.css`, `*.html` en `*.js`:

| soort | wat telt |
|---|---|
| kleur | harde kleur (hex of `rgb()`/`rgba()`) in een CSS-declaratie; in JS alleen binnen CSS-tekst (`color: #abc;`, `.style.x = '...'`, `style="..."`), nooit een datatabel, canvas of 3D-materiaal; een zwarte slagschaduw en een `var(--x, #hex)`-terugval tellen niet |
| glas | het donkere glas: `--gron-green`, `.gm` (zonder `gm-zeef`), `backdrop-filter` anders dan `none`, een zacht verloop (`linear-`, `radial-`, `conic-gradient`; niet een mask, niet `repeating-`, niet de rasterstip) |
| oud | de oudere componentklassen `.ds-kaart`, `.ds-knop`, `.ds-chip`, `.ds-papier`, `.ds-glas`, `.ds-streep` |
| font | een los `font-family` of `font:`-shorthand met een letternaam in plaats van `var(--ds-font-*)` |
| klein | `font-size` onder 13 px zonder token (de binnenkant van een toetsplaatje is `var(--ds-t-toets)`) |

Commando's: `node scripts/ds3_dekking_test.mjs` (de ratel), `--lijst` (elke regel die nog meetelt), `--write` (de stand omlaag zetten). De ratel (`scripts/ds3_dekking_basis.json`) laat een aantal alleen dalen; een stijging faalt en een daling vraagt om `--write`. Dezelfde telling draait per diffregel in `rules_audit` (`checkDs3Line` in `scripts/release/design_rules.mjs`): een nieuwe regel met harde kleur, glas, oude klasse of tekst onder 13 px is blokkerend; een regel met een commentaar `ds3-uitzondering` (met reden) of een bestand in `BEWUST` is vrij.

## Aantallen voor en na (zonder de bewuste uitzonderingen)

Voor = `origin/main` (828ec9f57) met dezelfde telling; na = deze branch.

| soort | voor | na |
|---|---|---|
| kleur | 1002 | 105 |
| glas | 194 | 140 |
| oud | 64 | 64 |
| font | 255 | 37 |
| klein (tekst onder 13 px) | 27 | 1 |
| bestanden met een rest | 77 | 62 |

`oud` is 53 keer de definitie in `ds-components.css` (zie "Hernoeming" hieronder) en 11 keer de galerij, `a11y.css` en `farmhud.js`/`bakeround.js`; geen enkel scherm gebruikt de oude set nog (`ds_versies_test`).

Grootste bestanden, voor en na (kleur/glas/oud/font/klein):

| bestand | voor | na |
|---|---|---|
| `game/js/pausemenu.css` | 151/18/0/46/0 | 1/18/0/3/0 |
| `game/js/hud_panel.css` | 151/32/0/22/1 | 12/12/0/0/0 |
| `game/js/menu.css` | 90/39/0/22/0 | 16/39/0/0/0 |
| `game/js/heist.css` | 73/8/0/17/0 | 13/6/0/0/0 |
| `game/js/trailer.js` | 56/5/0/16/1 | 1/2/0/3/0 |
| `game/js/prompts.css` | 39/14/0/3/0 | 0/5/0/0/0 |
| `game/js/storycontact.js` | 32/2/0/5/7 | 14/2/0/1/0 |
| `game/index.html` | 26/9/0/4/1 | 1/5/0/0/0 |
| `game/js/saveslots.css` | 30/4/0/5/0 | 8/4/0/0/0 |
| `game/js/stunthud.js` | 16/10/0/7/0 | 2/0/0/0/0 |
| `game/js/gpudiag.js` | 13/0/0/4/0 | 0/0/0/0/0 |

## Wat is omgezet (met bewijs in tests, niet in beeld)

1. **Benchmark-UI** (`trailer.js`, `ds-schermen.css`): het resultaat is een zeefdrukpaneel: `.ds-z-kaart` met kop (titel, formaat als chip), de cijfers als `.ds-z-feit`-tegels (nieuw component, fps gemiddeld, p95-frametijd, laagste 1%, fps in het spel, JS-heap), de categorieën als `.ds-z-chip` (de zwakste met `--probleem` en het woord "laagste", dus niet alleen kleur), het advies in een bordgroene kaart (`.ds-z-kaart--bord`, nieuw), de knoppen als `.ds-z-knop` met `Toepassen` als de ene gele hoofdknop en de rest `--secundair` (zonder Toepassen is `Terug` de hoofdknop), de hints als `{ARROWS}`, `{ENTER}`, `{ESC}`-toetsplaatjes. Tijdens de meting zijn de stopknop en de fps papieren plaatjes met inktrand. De ondertitels (`#banter-sub`, `#radio-sub`, `#sound-captions`, `#cine`) zwijgen tijdens de meting en op het resultaat, en het resultaat ligt op z-index 95. De metingen zelf zijn ongewijzigd (`computeStats`, `recommendStand`, `setBenchResult`, `writeLastRun`; test). Het startscherm van de benchmark is de bevestiging in het pauzemenu (`pausemenu.js`, "Benchmark starten? … {ESC} stopt") en de knop in het hoofdmenu (`startscreen.js`); die zijn een gewone pauzemenu-bevestiging en menuknop en niet apart omgebouwd of bekeken (een eigen startscherm met uitleg ontbreekt: open punt voor de beeldronde).
2. **Foutmelding** (`fouttoast.js`, nieuw; `streetpopulation.js` verwijst ernaar): de rode balk "Er ging iets mis: …" is een zeefdrukkaart met rode inktrand, waarschuwingsicoon (Phosphor via `icons.js`), de titel "Er ging iets mis", één korte Nederlandse zin, "Kopieer foutrapport" (het gescrubde rapport uit `errorlog.js`) en "Sluiten" als secundaire knoppen; de technische tekst staat onder "Details". Eén per sessie, zoals voorheen.
3. **Technische-info-overlay** (Ctrl+Shift+G, `gpudiag.js`): `.ds-z-kaart` met een witte, geranderde strook voor de tekst en `.ds-z-knop`-knoppen (Kopiëren geel).
4. **Tokens in plaats van harde waarden** (`scripts/ds3_tokeniseer.mjs`, dev-tool, idempotent): 808 kleuren (een hex die exact een palettoken is, een `rgba()` daarvan als `color-mix(in srgb, var(--ds-c-…) A%, transparent)`) en 223 lettertypestapels (`var(--ds-font-kop|tekst|zeef-kop|zeef-tekst|logo)`) in 55 bestanden, uiterlijk gelijk; daarna 183 plekken waar een eenmalige glaskleur naar de dichtstbijzijnde token ging (verschil kleiner dan een tint). Nieuw in `ds-tokens.css`: `--ds-font-logo`, `--ds-c-toets-vlak`, `--ds-c-toets-rand` (het witte toetsplaatje) en `--ds-c-id-1` tot `-8` met rollen `--ds-id-*` (de identiteit van medespelers; de tabel zelf blijft `coopidentiteit.js`). `--gron-green*` is weg (63 gebruiken en de definities); zeven verlopen van twee gelijke tokens zijn nu een vlak.
5. **Tekst onder 13 px**: 25 regels naar 13 px (HUD, instrumenten, duivenmodus, contacten, uitjepaneel, Nederlandse regel onder een ondertitel `max(13px, 0.85em)`), de binnenkant van een toetsplaatje is `var(--ds-t-toets)`. Eén rest: het woord TAXI (7 px) op het dakbordje in de taxi-tekening van `reisrit.js`.
6. **Fouten uit het spel** (zie hieronder): twee guards met een test.
7. **Ratel en regelaudit**: `ds3_dekking_test.mjs` (42 controles), `ds3_schermen_test.mjs` (98 controles: contrast 4,5:1 in vol en Rustig drukwerk, geen hex/glas in `ds-schermen.css`, 13 px, beweging hooguit 250 ms, de benchmarkstructuur, de audit, en een schatting van de indeling op 1280x720 en 1920x1080: resultaat 494 van 688 px en 646 van 1048 px hoog, de foutmelding hooguit een derde van het scherm), `foutbronnen_test.mjs` (31 controles).

## De twee fouten uit de foutbalk

- **`Cannot read properties of undefined (reading 'opdracht')`.** Niet in `pigeonguide`/`pigeonmode`/`missions` (daar staat `.opdracht` niet). Alle plekken waar `.opdracht` van een mogelijk ontbrekend object gelezen wordt zitten in de Samen-spelen-staat: de standaardwaarde `id = st.opdracht` van `laat`, `einde`, `antwoord` en `bevestig` in `coopmeedoen.js` las uit `st` terwijl een gast of een host zonder meedoen-stand die niet heeft. Die vier, plus `begin`, `beginGast` en `tik`, kennen een ontbrekende stand nu (`st && st.opdracht`, een lege uitkomst). Wat niet is aangeraakt: `coopnet.js` regel 884 (`n.meedoen.opdracht` in `nodigUit`; netwerkcode, buiten de opdracht) is de enige onbeschermde leesplek die overblijft; die is veilig zolang `n.meedoen` bij een host bestaat (`maakMeedoen()` bij het starten). De exacte bron is niet in een draaiend spel gezien; dit is de guard op alle bekende leesplekken, getest met `foutbronnen_test`.
- **`idx.inWater is not a function`.** `idx` komt van `getWaterIndex(map)` (`routing.js` `boatContext`) en `waterIndexAt` (`greenwater.js`, `quaywalls.js`, `terrain3d.js`). Een gecachete `map._waterIndex`, een `poly._wi` of een tegelindex zonder functies (een kaartkopie, een mislukte opbouw, een kaart zonder waterraster) werd teruggegeven zoals hij was. `waterindex.js` controleert nu dat de index `inWater` kent (`heelIndex`), bouwt anders opnieuw, en geeft zonder kaart een lege index. Getest met een kaart zonder raster, een kapotte cache en een kapotte `_wi`.

## Wat bewust blijft (met reden)

| wat | waarom |
|---|---|
| `ds-tokens.css` | de definitie van het palet: hex hoort hier en alleen hier |
| `ds-galerij.js`, `ds-galerij.html` | de galerij toont de oude set naast de zeefdruk |
| `fonts/fonts.css`, `desktop/vendor-fonts.css` | `@font-face` en de build-fetch van de zelf gehoste fonts |
| `testmenu.js`, `storydev.js`, `storytest.js`, `sfx/sfxtest.js`, `cutpreviewui.js`, `cutpreview.html` | ontwikkelaarsgereedschap dat alleen met een URL-vlag of `--dev` wordt geladen; geen speler-UI |
| `mapstyle.js`, `kaartkleuren.js`, `minimap*`, `mapview.js`, `mapdraw*`, `mapicons`, `kaarticons` | kaartstijl op canvas (eigen kaartpalet, `docs/WERELDKLEUREN-21-11.md`) |
| `a11y.js`, `colorblind.js`, `kleurenblind.js` | de kleurenblindpaletten zijn data |
| `coopidentiteit.js`, `ctxidentiteit.js`, `minigamekit.js` | identiteitskleuren per speler en context: één tabel |
| 3D-materialen, canvas-teksten in de wereld, kleuren van voertuigen | de telling kijkt in JS alleen naar CSS-declaraties, dus deze tellen niet mee |
| `rgba(0,0,0,x)` in een schaduw en `#fff` als hooglicht in een schaduw | chroom |
| de donkere scrim over de wereld (`color-mix(... var(--ds-c-ink-inkt) 55%, transparent)`) achter een modaal paneel | een dimlaag, geen glas |

## Wat blijft staan als glas of harde kleur (en waarom nog niet omgezet)

De resterende 140 glas-regels en 105 kleuren zijn de basislaag van schermen die een zeefdruklaag erbovenop hebben (`ds-menu-zeef.css`, `hud_panel.css`) of die nog een eigen donker oppervlak zijn. Een blinde vervanging door papier verandert de indeling; daarom niet gedaan zonder beeld. Per bestand: `menu.css` (39 glas: panelen, tabs, knoppen van de pauze-basis), `pausemenu.css` (18; de scrim met blur achter het pauzemenu, de kaartlaag, de bindingsrijen), `hud_panel.css` (12 en 12; kaarten, wanted, race), `heist.css` (de kluis-HUD: sloten, schaal, lampen), `prompts.css` (5), `storycontact.js` (14 kleuren; krant- en hout-tinten van het contactenkaartje), `saveslots.css`, `onlineconsent.css`, `startscreen.css` (de donkere scrim en het nieuwskader), `postgame.js`, `helirun.js`, `stunthud.js`, `treincabine.js`, `achievements.js`, `coopscene.js`, `intromontage.js`, `trailer.js` (de titelkaarten: crème tekst met roze misdruk, al zeefdrukachtig, met enkele eenmalige kleuren). De volledige lijst staat in `node scripts/ds3_dekking_test.mjs --lijst`.

## Hernoeming `.ds-z-*` naar `.ds-*`

Niet gedaan. Reden: `.ds-kaart`, `.ds-knop`, `.ds-chip`, `.ds-papier` en `.ds-glas` bestaan nog als definitie in `ds-components.css` en `ds-tokens.css`, in de galerij en in `a11y.css`, en `ds_tokens_test` (686 controles) toetst ze; een hernoeming zou de namen laten botsen. De volgorde is: eerst de oude set uit de definitie, de galerij en de test halen (er is geen gebruiker meer, `ds_versies_test`), daarna `.ds-z-*` hernoemen met een alias-laag (`.ds-z-knop` blijft als alias van `.ds-knop` zolang er code is) en de testlijsten in dezelfde commit. Dat is een aparte stap met een eigen test van de galerij in beide standen.

## Wat de beeldverificatie moet doen (vraagt beeld)

Alles hieronder is code- en testmatig klaar maar niet gezien. Formaten: 1280x720, 1920x1080 en 1024x600; vol en Rustig drukwerk.

1. Benchmark: het resultaat (met en zonder Toepassen, met een zwakste categorie, met "Eerst nog een keer meten") en tijdens de meting (stopknop, fps); of de ondertitel er niet over ligt; of Toepassen de enige gele knop is.
2. Foutmelding: de kaart met Details open en dicht; te forceren met `window.dispatchEvent` of een tijdelijke worp.
3. Technische info (Ctrl+Shift+G).
4. Alle schermen waar tokens de harde waarden vervingen (55 bestanden, uiterlijk bedoeld gelijk): pauzemenu en kaart, HUD te voet en in voertuigen, prompts, heist-HUD, stunt-HUD, treincabine, duivenmodus, contacten en telefoon, uitjepaneel, instrumenten van het vliegtuig, golf, opslagen, online-toestemming, hoofdmenu.
5. De plekken waar een eenmalige glaskleur naar de dichtstbijzijnde token ging: heist-HUD (schaal, sloten, lampen), HUD-chips (dronken, wanted), de keycap-tokens, de spelerskleuren in de lijst (`.coop-kleur-*`), hover van groene knoppen.
6. De 25 regels naar 13 px: past de tekst nog (instrumenten, duivenmodus, uitjepaneel, contactkaartjes, hudcards)?
7. Het wegvallen van `--gron-green*`: HUD-geld, gps, wanted-ster, stunt- en race-HUD.
8. Het glas dat nog staat (zie hierboven): per scherm beslissen of het papier wordt of een dimlaag blijft.
9. Rustig drukwerk op alle bovenstaande schermen; Steam Deck (13 px-vloer) en 4K.
10. Het hoofdmenu en de laadschermen: de donkere scrim over de vliegende stad blijft een dimlaag; beoordelen.

## Geen aanpassing in deze ronde

`tilestream`, `roadindex`, audio, netwerkcode (ook `coopnet.js`) en TTS zijn niet aangeraakt. `scene3d.js` is niet aangeraakt (onder 4500 regels).
