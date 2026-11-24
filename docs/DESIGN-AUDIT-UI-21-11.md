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

Commando's: `node scripts/ds3_ratel_test.mjs` (de ratel), `--lijst` (elke regel die nog meetelt), `--write` (de stand omlaag zetten). De ratel (`scripts/ds3_dekking_basis.json`) laat een aantal alleen dalen; een stijging faalt en een daling vraagt om `--write`. Dezelfde telling draait per diffregel in `rules_audit` (`checkDs3Line` in `scripts/release/design_rules.mjs`): een nieuwe regel met harde kleur, glas, oude klasse of tekst onder 13 px is blokkerend; een regel met een commentaar `ds3-uitzondering` (met reden) of een bestand in `BEWUST` is vrij.

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
7. **Ratel en regelaudit**: `ds3_ratel_test.mjs` (42 controles), `ds3_schermen_test.mjs` (98 controles: contrast 4,5:1 in vol en Rustig drukwerk, geen hex/glas in `ds-schermen.css`, 13 px, beweging hooguit 250 ms, de benchmarkstructuur, de audit, en een schatting van de indeling op 1280x720 en 1920x1080: resultaat 494 van 688 px en 646 van 1048 px hoog, de foutmelding hooguit een derde van het scherm), `foutbronnen_test.mjs` (31 controles).

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

## Dekkinglijst per bestand (stand na de rondes van 21-11, #1064)

Deze lijst komt uit dezelfde telling als de ratel en `node scripts/ds3_dekkinglijst_test.mjs` faalt als ze achterloopt; zet ze gelijk met `--write`. Een leeg vak is nul. De tabel "Aantallen voor en na" hierboven is de stand van de eerste ronde; de actuele stand staat hier.

<!-- ds3-dekkinglijst:begin -->

Totaal nog te doen: kleur 5, glas 113, oud 0, font 15, klein 1, lus 0, lang 1, emoji 0, svg 33 in 58 bestanden (bewust buiten de telling: 21).

| bestand | kleur | glas | oud | font | klein | lus | lang | emoji | svg |
|---|---|---|---|---|---|---|---|---|---|
| `game/js/menu.css` |  | 36 |  |  |  |  |  |  |  |
| `game/js/pausemenu.css` |  | 18 |  |  |  |  |  |  |  |
| `game/js/hud_panel.css` |  | 11 |  |  |  |  |  |  |  |
| `game/index.html` | 1 | 5 |  |  |  |  |  |  |  |
| `game/js/hud_panel.js` |  |  |  |  |  |  |  |  | 6 |
| `game/js/bigmoment.css` |  |  |  | 5 |  |  |  |  |  |
| `game/js/prompts.css` |  | 5 |  |  |  |  |  |  |  |
| `game/js/trailer.js` | 1 | 2 |  | 2 |  |  |  |  |  |
| `game/js/heist.css` |  | 4 |  |  |  |  |  |  |  |
| `game/js/regelwidget.js` |  |  |  |  |  |  |  |  | 4 |
| `game/js/furniture.js` |  |  |  | 3 |  |  |  |  |  |
| `game/js/intromontage.js` |  | 3 |  |  |  |  |  |  |  |
| `game/js/onlineconsent.css` |  | 3 |  |  |  |  |  |  |  |
| `game/js/startscreen.css` |  | 3 |  |  |  |  |  |  |  |
| `game/js/storycontact.js` |  | 2 |  | 1 |  |  |  |  |  |
| `game/js/bezitkaart.js` |  |  |  |  |  |  |  |  | 2 |
| `game/js/loopbaanui.js` |  |  |  |  |  |  |  |  | 2 |
| `game/js/lowhealth.js` |  | 2 |  |  |  |  |  |  |  |
| `game/js/main.js` | 2 |  |  |  |  |  |  |  |  |
| `game/js/missionicons.js` |  |  |  |  |  |  |  |  | 2 |
| `game/js/padtest.js` | 1 |  |  | 1 |  |  |  |  |  |
| `game/js/pigeonmode.js` |  |  |  |  |  |  |  |  | 2 |
| `game/js/reisrit.js` |  |  |  | 1 | 1 |  |  |  |  |
| `game/js/sfx/menunav.js` |  | 2 |  |  |  |  |  |  |  |
| `game/js/treincabine.js` |  | 1 |  | 1 |  |  |  |  |  |
| `game/js/achievementicons.js` |  |  |  |  |  |  |  |  | 1 |
| `game/js/achievements.js` |  |  |  |  |  |  |  |  | 1 |
| `game/js/achievementsui.js` |  |  |  |  |  |  |  |  | 1 |
| `game/js/aimassist.js` |  | 1 |  |  |  |  |  |  |  |
| `game/js/busboard3d.js` |  | 1 |  |  |  |  |  |  |  |
| `game/js/calendar.js` |  |  |  |  |  |  |  |  | 1 |
| `game/js/carrieresfeer.js` |  | 1 |  |  |  |  |  |  |  |
| `game/js/cheatsui.js` |  |  |  |  |  |  |  |  | 1 |
| `game/js/choicepanel.js` |  | 1 |  |  |  |  |  |  |  |
| `game/js/coopoverlay.js` |  | 1 |  |  |  |  |  |  |  |
| `game/js/drunk.js` |  | 1 |  |  |  |  |  |  |  |
| `game/js/ds-bezit.css` |  |  |  |  |  |  | 1 |  |  |
| `game/js/ds-menu-zeef.css` |  | 1 |  |  |  |  |  |  |  |
| `game/js/farmcards.js` |  |  |  |  |  |  |  |  | 1 |
| `game/js/garageui.js` |  |  |  |  |  |  |  |  | 1 |
| `game/js/gfxprofile.js` |  |  |  |  |  |  |  |  | 1 |
| `game/js/golficons.js` |  |  |  |  |  |  |  |  | 1 |
| `game/js/heliflight.js` |  | 1 |  |  |  |  |  |  |  |
| `game/js/hudcards.css` |  | 1 |  |  |  |  |  |  |  |
| `game/js/hudcards.js` |  |  |  |  |  |  |  |  | 1 |
| `game/js/instrumenten.js` |  | 1 |  |  |  |  |  |  |  |
| `game/js/pausemenu.js` |  | 1 |  |  |  |  |  |  |  |
| `game/js/prompts.js` |  |  |  |  |  |  |  |  | 1 |
| `game/js/regelwidget.css` |  | 1 |  |  |  |  |  |  |  |
| `game/js/saveslotsui.js` |  |  |  |  |  |  |  |  | 1 |
| `game/js/shopicons.js` |  |  |  |  |  |  |  |  | 1 |
| `game/js/shopui.js` |  | 1 |  |  |  |  |  |  |  |
| `game/js/simhud.js` |  |  |  |  |  |  |  |  | 1 |
| `game/js/story.js` |  | 1 |  |  |  |  |  |  |  |
| `game/js/touch.js` |  |  |  | 1 |  |  |  |  |  |
| `game/js/uitjepaneel.js` |  | 1 |  |  |  |  |  |  |  |
| `game/js/visboekui.js` |  |  |  |  |  |  |  |  | 1 |
| `game/js/wrakduikenlive.js` |  | 1 |  |  |  |  |  |  |  |

<!-- ds3-dekkinglijst:eind -->

Wat de lijst niet dekt, met reden: `website/` (de marketingpagina, losse bron met eigen zeefdrukstijl, #1003; `website_test`), de Steam- en socialbeelden (`merkbestanden_test`, #1003) en de galerij `game/ds-galerij.html` (toont de oude set bewust als referentie).

## Hernoeming `.ds-z-*` naar `.ds-*`

Niet gedaan. Reden: `.ds-kaart`, `.ds-knop`, `.ds-chip`, `.ds-papier` en `.ds-glas` bestaan nog als definitie in `ds-components.css` en `ds-tokens.css`, in de galerij en in `a11y.css`, en `ds_tokens_test` (686 controles) toetst ze; een hernoeming zou de namen laten botsen. De volgorde is: eerst de oude set uit de definitie, de galerij en de test halen (er is geen gebruiker meer, `ds_versies_test`), daarna `.ds-z-*` hernoemen met een alias-laag (`.ds-z-knop` blijft als alias van `.ds-knop` zolang er code is) en de testlijsten in dezelfde commit. Dat is een aparte stap met een eigen test van de galerij in beide standen.

Botsingen bij de hernoeming (gecontroleerd 21-11): van de 53 `ds-z-*`-namen bestaat de kortere naam al voor `ds-kaart`, `ds-knop`, `ds-chip` (de oude set), maar ook voor `ds-feit`, `ds-lijst`, `ds-leeg`, `ds-tab` en `ds-componenten`, en `.ds-streep`, `.ds-icoon` en `.ds-t-*` worden door schermen gebruikt. Daarom blijft de oude set staan tot die klassen eerst omgezet of hernoemd zijn; zie ook `ds_versies_test` (de lijst van vijf bestanden).

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

## Vervolg 21-11 (branch `ds3-vervolg-21-11`): de bevindingen F1 tot F27 uit het compliance-rapport

Bron: `docs/reviews/CODE-REVIEW-21-11-ds3-compliance.md` (branch `review-ds3-21-11`). De ratel heeft vier nieuwe soorten: **lus** (een oneindige animatie), **lang** (een animatie of transitie boven 250 ms), **emoji** (een echte emoji in spelertekst) en **svg** (een eigen `<svg>` buiten `icons.js`). Een regel met `ds3-dwell` (een verblijftijd), `ds3-film` (een scène of cutscene: de speler kijkt), `ds3-lus` (de bel en de live-stip) of `ds3-uitzondering` telt niet mee; de regelaudit (`design_rules.mjs`, `checkDs3Line`) blokkeert elke nieuwe regel in die soorten.

Aantallen (ds3-alles-21-11, daarna dit vervolg): kleur 105 naar 85, glas 140 naar 130, oud 64, font 37, klein 1; **lus 25 naar 0, lang 124 naar 0, emoji 7 naar 0, svg 63 naar 35**. De regelaudit (`rules_audit --from=v0.64.0`): 174 naar 138 blokkerend.

| # | Stand | Wat er is gedaan |
|---|---|---|
| F1 | **gefixt** | `game/js/ds-beweging.css`: één regel voor `html.reduce-motion *` én `@media (prefers-reduced-motion)`: geen lus, geen vertraging, transitie 0,01 ms, voor alle UI (ook JS-stijlen). Verblijfsanimaties (kaarttimer, plaatsnaam) lopen door en hebben hun eigen regel. Test: `ds3_dekking_test` (beide takken, link in `index.html`, `motion.js` zet de klasse). |
| F3 | **gefixt** | Eén scrollbalk voor papier: tokens `--ds-scroll-duim` (inkt), `--ds-scroll-spoor`, `--ds-scroll-breed` (12 px), `--ds-scroll-rond`; alle crème-alfa balken in `pausemenu.css`, `touch.js`, `verhaalui.js`, `veroverdpanel.js`, `shopui.css`, `startscreen.css` en `coopspelersui.js` gebruiken ze. Test: geen crème of alfa als scrollkleur, duim tegen baan en papier minstens 3:1. |
| F4 | gedaan in de eerste ronde | `fouttoast.js`. |
| F5 | **gefixt** | Emoji weg: mute-chip (`icoon('geluid_uit')`), bijbaanpaneel (`icon:` op de opties van het keuzepaneel: hart, boot, auto, mail; cabaret: bericht), credits (hart via `icoon('hart_vol')` in `startscreen.js`). Ratel emoji 0. |
| F6 | **deels** | 12 eigen `<svg>`-constanten naar Phosphor (vinkje, vlag, volgende, slot, camera, speler, plek, opslaan, waarschuwing, afspelen). Meetgeometrie (voortgangsringen, wijzerplaat, kompas- en windpijl, richtkijker, muis- en controllervormen) staat in `SVG_GEOMETRIE` (`ds3_regels.mjs`) met een reden; de iconensets `missionicons`, `achievementicons`, `golficons`, `shopicons`, `ICONEN` in `regelwidget.js`/`loopbaanui.js`, `calendar.js`, `garageui.js`, de wapenicoontjes en de HUD-glyphs blijven schuld (svg 35, ratel). |
| F7 | niet | tekstsymbolen (`✓`, `★`, `▲`): nit, issue. |
| F8 | **gefixt** | `verhaalui.js`: de roze tekst is `--ds-c-rood-tx` (7,6:1); Rustig drukwerk-roze is `#8e1a25` (7,54:1, was 6,58:1). Test: geen roze tekst op papier in menu's; Rustig-roze 7:1. |
| F9 | **gefixt** | `heist.css`: het briefje (`hx-note`) is papier met inkt en `.kick` in `--ds-c-inkt-zacht` (was 3,9:1). |
| F10 | **deels** | `.pl-kick` is papier met inktschaduw (geen geel tekst meer); `.hud-count[data-go]` (geel cijfer) en wit op `#d93f3f` (`bb-stop.on`) blijven: issue. |
| F11 | niet | zonebeheer voor de onderband vraagt beeld (`scripts/qa/overlap.mjs`): issue. De drift-kaart krijgt een eigen zone (`driftZone` in `hudstapel.js`, getest tegen de andere zones). |
| F12 | **gefixt (in code)** | Duivenspot: het basisglas is papier met tokens (de zeeflaag overschreef het al), balk in bordgroen. Heli-run (`helirun.js`), postgame-paneel (`postgame.js`) en padelbord (`padel.js`) zijn omgezet naar papier met inktrand, harde schaduw, Barlow en tokens; geen glas, geen gradient, geen rgba. `heliflight.js`, `instrumenten.js`, `stunthud.js`, `busbestuurhud.js` en `treincabine.js` blijven glas (issue). |
| F13 | **deels** | `.nl-sub`, scorebordkoppen, `.mg-sfeer`, touch-tekst, `lb-volg` en de bus-HUD naar 13 px. Het toetsplaatje op `prompts.css:161` (8,5 px) hoort bij de keycap-branch. |
| F14 | niet | ellipsen (nit): issue. |
| F15 | **gefixt** | Alle 25 lussen weg: bel, live-stip en telefoonschud staan met `ds3-lus` (bewust), de rest speelt hooguit 2 of 3 keer of is statisch (`ach-rays` glans is weg, het hart op de titelkaart klopt 3 keer). |
| F16 | **gefixt** | Alle beweging boven 250 ms is `var(--ds-m-max)` (250 ms, 0 bij Beweging beperken), of gemarkeerd: `ds3-dwell` (16 regels: kaarttimer, plaatsnaam, bedragen, punten) of `ds3-film` (44 regels: cutscenes, laadscherm, titelkaart, trailer, intromontage). |
| F17 | niet | `.ds-z-balk__vul` transitie op `width`: vraagt JS (`--ds-z-w` naar schaal): issue. |
| F18 | **deels** | `carrieresfeer.js` en `activiteitensfeer.js` lezen tokens (`--ds-c-creme`, `--ds-c-licht-groen`, `--ds-c-glas`), geen eigen rgba meer; test. Samenvoegen met `ctxidentiteit.js` (één tabel: accent, stempel, icoon) en de sfeerbanden naar zeefdruk: issue. |
| F19 | **gefixt** | `design_rules.mjs`: `ALLOWED_FONTS` bevat alleen Barlow, Atkinson, Big Shoulders (logo) en de `GDE`-toetsfonts; Bebas Neue, Arial Narrow en Arial alleen als terugval (`FALLBACK_FONTS`); `TEXT_FLOOR_PX` is 13, `TEXT_KEY_FLOOR_PX` 12. `ui-taal.md`, `DESIGN_SYSTEM.md`, `spec_check` en `release_designrules_test` zijn mee. |
| F20, F22, F24, F25, F27 | niet | nits: issue. |
| F21 | gedaan | eerste ronde. |
| F23 | niet | vals alarm van `rules_audit` op `{TOKEN}`-syntax: de audit moet het leren (issue). |
| F26 | **gefixt** | de dubbele preload van `input-keys.ttf` en `input-xbox.ttf` is weg (test). |

### Drift-HUD (verzoek van de eigenaar: "de drift multiplier UI mag ook in Design System v3")

`driftzone.js` bouwt de HUD als `.ds-z-kaart` met een groot multipliercijfer (`.ds-z-feit__n`, "x3"), de score met tabelcijfers, een balkje tot de volgende multiplier (`.ds-z-balk`, `driftVoortgang` in `drift.js`), en een rand die per niveau oploopt in bordgroen (x1 inkt, x2 bordgroen, x3 en x4 met bordgroene schaduw, x5 selectievlak; tokens). Een korte pop (`ds-z-puls`, 250 ms) bij een multiplier-sprong, uit bij OS-instelling, Beweging beperken en Rustig drukwerk. Vaste zone `driftZone` in `hudstapel.js` (214 px boven de onderrand, 340 px breed), getest tegen de andere HUD-zones bij 1024x600, 1280x720 en 1920x1080. Geen hint in de kaart (de startkaart van de driftzone legt de toetsen al uit). Test: `scripts/drift_hud_test.mjs` (144 controles). Samen spelen: lokaal per speler, ongewijzigd.

### Nog in beeld te verifiëren (vervolg)

1. Drift-kaart: x1 tot x5, de pop, Rustig drukwerk, naast ondertitel en minikaart (1024x600).
2. Duivenspot, heli-run, postgame en padel: leesbaarheid van papier op de wereld, tips en berichten in papier met inktschaduw (`hh-msg`, `hh-catch`), de hoogtemeter.
3. Scrollbalken in pauzemenu, verhaal, Samen spelen: duim zichtbaar, 12 px breed, geen verspringing van de lijst.
4. De korte animaties (250 ms): meldingen, pop-ups, de HUD-kaarten, het menu-openen; of de pop van het geld en de plaatsnaam nog goed aanvoelen; Beweging beperken aan: niets beweegt behalve de verblijfstimers.
5. Mute-chip, bijbaanpaneel (hart, boot, auto, mail) en het hart in de credits (Phosphor, 20 px).
6. Het Rustig-roze (`#8e1a25`) op sterren en misdruk.
7. Sfeerbanden van Loopbanen, Boerderij en het minigamebord (kleuren nu via `color-mix`).

## Geen aanpassing in deze ronde

`tilestream`, `roadindex`, audio, netwerkcode (ook `coopnet.js`) en TTS zijn niet aangeraakt. `scene3d.js` is niet aangeraakt (onder 4500 regels).

## Regelaudit op nul blokkerend (21-11, #1064)

De releasegate (static) eist 0 blokkerende bevindingen van `node scripts/release/rules_audit.mjs --from=v0.64.0`. Die audit keurt elke toegevoegde diffregel sinds de tag, dus ook een regel die alleen is herschreven (de tokeniser zette 808 kleuren om, `linear-gradient(...)` met tokens bleef een verloop). Niets hieronder is in beeld gezien; alles is gecontroleerd met `release_designrules_test` (nieuw blok, 361 controles), de ratel en de aangrenzende tests.

| | voor | na |
|---|---|---|
| blokkerend | 136 | 0 |
| belangrijk | 70 | 15 |
| nit | 35 | 6 |

Per categorie van de 136 blokkerende:

| categorie | aantal | wat | middel |
|---|---|---|---|
| "Niet via het designsysteem" (kleur, verloop) en "Kleur buiten de tokens" in een herschreven regel | 130 (105 + 30, met overlap) | de regel stond er al; de diff herschreef hem (tokeniser) of verplaatste hem | **aangescherpt (c)**: `nettoVrij()` in `rules_audit.mjs` telt per bestand en per soort (kleur, glas, oud, klein, lus, lang, emoji, svg, losse kleur) de toegevoegde min de verwijderde regels; alleen een netto stijging blijft blokkerend. Nieuwe code en nieuwe bestanden (geen verwijderde regels) tellen volledig; dezelfde afspraak als de ratel (het totaal mag niet stijgen). Getest, ook dat een extra kleur boven wat verwijderd is blijft blokkeren |
| `--ds-kaart-rand` als "oude klasse" | 1 | de eigenschapsnaam in `ds-components.css` leek op `.ds-kaart` | **aangescherpt (c)**: `ds3_regels.mjs` telt `ds-kaart` e.d. niet meer na `-`; de ratel is mee omlaag (`ds3_dekking_basis.json`: oud 62 naar 57) |
| eigen `<svg>` in `hud_panel.js` (schild) | 1 | beschermingsschild in de politiechip | **gefixt (a)**: `icoon('schild')` (Phosphor), kleur via `color: var(--ds-c-ink-inkt)` in `hud_panel.css` |
| eigen `<svg>` in `hud_panel.js` (toerentalboog) | 1 | de dash-lengte volgt het toerental | **uitzondering (b)**: `ds3-uitzondering` op de regel met reden (meetgeometrie, geen icoon) |
| eigen `<svg>` in `pigeonguide.js` (richtingspijl) | 1 | de pijl draait mee met de hoek | **uitzondering (b)**: `SVG_GEOMETRIE` in `ds3_regels.mjs` met reden (zoals de windpijl van helirun en zeilvaren) |
| `https://gtfs.ovapi.nl/...` in `livetrains.js` | 1 | de goedgekeurde openbare leesopvraag (#1085, besluit eigenaar 21-11, `docs/TREINEN-LIVE-21-11.md`) | **uitzondering (b)**: `NETWERK_GOEDGEKEURD` in `rules_audit.mjs`, alleen deze host in dit bestand; een andere host, een `fetch(` of dezelfde host elders blijft blokkerend |

De 55 belangrijke en nits die verdwenen, per categorie: eigen lettertype buiten de tokens 21 (netto), webadres in commentaar 13 (de three-import, die het bouwen omzet, en de goedgekeurde bron), echte merknaam in speltekst 7 (regex-literal `/apple/i`, de variabele `ns`, de selector `[data-set="xbox"]`: de merkenregel kijkt nu alleen naar stringliteralen en `content:`; `credits.js` noemt jsDelivr en Google Fonts bij naam als bronvermelding en staat met reden in `MERKEN_BESTAND_OK`), merkenrisico 5 (de held-auto Escapade staat bewust in vier tekstbestanden: `docs/MERKENREGISTER.md` mag nu meer bestanden in de bron-cel hebben, `parseRegister` geeft `bronnen`), typografie 7 (een `var(--token, 'terugval')` is het token zelf, net als bij kleuren; de code-lettertypen `Consolas`, `Menlo` werden `--ds-font-code`; `font-size: max(13px, 0.9em)`), toetsnaam als woord 2 (`cheatsui.js`: `{ENTER}` via `keyTextHtml`, `startkaart.js`: `{SPATIE}`), TODO 2 (`TODO.sub` was een identifier; een aantekening moet in commentaar staan), `!important` 27 (bewust in `ds-beweging.css`, `ds-keycap.css`, `a11y.css`: `IMPORTANT_BEWUST` met reden).

Wat blijft (niet blokkerend):

- 12 nieuwe bestanden met een Nederlandse naam (`endcardimpact`, `livetreinen`, `navdoel`, `pathgraphbuild`, `startchoice`, `startchoiceui`, `treinbron`, `treindienst`, `treinlive`, `treinrooster`, `bootplekken`, `wijkat`): hernoemen raakt imports, tests en docs; `naamtaal_check` meldt ook identifiers in `districtat.js`. Besluit voor de coördinator.
- Het logo in `index.html` (`.gde-sign` 0.25em en `.gde-meaning` 0.065em): relatieve maat zonder vloer; het woordmerk is beeld en hangt aan de afmetingen van het logo. Vraagt beeld.
- Het handschrift van `storycontact.js` (`'Segoe Print'`): geen token voor een handschriftfont.
- 6 nits `!important` in `hud_panel.css`, `pausemenu.css` en `ds-schermen.css`.

Nog niet in beeld gezien: het schild in de politiechip van de minikaart (nu een Phosphor-icoon, 15 px, kleur inkt), de sessiecode en -invoer in het pauzemenu en het nieuws op het startscherm met `--ds-font-code`, en de uitleg bij de cheats (`{ENTER}`-plaatje).
