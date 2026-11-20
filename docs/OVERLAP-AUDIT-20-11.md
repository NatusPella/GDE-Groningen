# Overlap-audit van de HUD, 20-11

Opdracht van de eigenaar (20-11): "Ik zie in jouw screenshots ook nog wat overlappende UI elementen." Deze audit zoekt overlappende en afgekapte UI in het **echte spel** (Electron, wegwerpprofiel) met een detector in plaats van met het oog, en repareert elke klasse met de bestaande HUD-zones (`hud_panel.css` zone B, `hudbus.js`, `prompts.js`), niet met losse z-index-trucs. Epic #985, issue #985.

## De detector

`scripts/qa/overlap.mjs` (driver, in de stijl van `schermen_sweep.mjs`) zet `scripts/qa/overlap.page.js` (de detector, in de stijl van `hoeken.page.js`) en `scripts/qa/overlap_scenes.page.js` (de scènelijst) in één Electron per vensterformaat. De pure helpers testen zonder Electron in `scripts/hud_overlap_test.mjs`; een regel per opgeloste klasse staat in `scripts/overlap_fixes_test.mjs`.

Een **vlak** is een zichtbaar kind van `#hud` of `body` met verf (achtergrond, rand, afbeelding, svg) of eigen tekst; een wikkel zonder verf of tekst telt niet (zijn kinderen wel). Per scène meldt `ovScan`:

| Melding | Betekenis |
| --- | --- |
| `overlap` | twee vlakken (verschillende wortel, niet in elkaar) die elkaar meer dan 4 px snijden in beide richtingen, met de dekking van beide en welke boven ligt. Vlakken onder 15% dekking (een kaart die wegfadet, de HUD onder een schermvullend moment op 12%) en tekst naast tekst in dezelfde HUD-groep tellen niet; de stip en de streep van een wereldlabel zijn aanwijzers en tellen niet |
| `buitenBeeld` | een vlak dat meer dan 2 px buiten het venster loopt (schermvullende momenten en `aria-hidden` zijn uitgezonderd) |
| `afgekapt` / `ellips` | tekst met `overflow: hidden` en `scrollWidth > clientWidth` zonder / met `…` of line-clamp |
| `tekstUit` | tekst die meer dan 3 px uit zijn eigen verfvlak steekt zonder dat overflow hem wegknipt (decoratie met `aria-hidden` en het watermerk zijn uitgezonderd) |
| `filmHud` | HUD die zichtbaar blijft terwijl `#cine` actief is |

`node <slot.mjs> run overlap -- node scripts/qa/overlap.mjs --out=<map onder je werkmap> --formaten=1280x720,1920x1080,1024x600 [--only=a,b] [--prefix=voor|na] [--beeld=fout|alles|geen]`; een beeld met magenta kaders. Zie docs/TESTEN.md.

**Scènes (35):** te voet; doelkaart (kort en met een zeer lange naam); tip + prestatie + "Nieuwe streek" + telefoonbericht tegelijk; Activiteit-kaart + "Nieuwe streek"; politiekaart + geldkaart; wanted 3, wanted 5 met zoektocht; lange tip, lange geldmelding, lange Kiekdoar-kop, telefoongesprek; regelkaart; beide speelbare personages met metgezel; auto, auto met doel en route, auto met politie, motor; minigamebord (discgolf, kartbaan, skatepark, een zeer lang bord, bord met kaarten ernaast), keuzepaneel; taxirit; ondertitel (banter), cutscene-ondertitel, cinekaart, missie-intro, resultaatband, plaatskaart (los en met kaarten); controller-hints (twee scènes).

## Meting

| Ronde | Formaat | Scènes | Overlap | Afgekapt | Tekst uit vlak | Film |
| --- | --- | --- | --- | --- | --- | --- |
| voor (eerste detectorrun) | 1280x720 | 33 | **188** | 0 (19 met `…`) | 5 | 10 |
| na eerste fixes | 1280x720 | 33 | 6 | 0 | 5 (watermerk) | 0 |
| na eerste fixes | 1920x1080 (venster 1904x993) | 33 | 4 | 0 | 5 (watermerk) | 0 |
| na eerste fixes | 1024x600 | 33 | 14 klassen | 0 | 5 + 4 | 0 |
| na de laatste fixes (deelmeting van 7 scènes: voet-doelkaart, auto-politie, geld-politie-kaart, toast-activiteit, bord-discgolf-met-kaarten, karakter-anita, gezocht-5-zoeken) | 1280x720, 1920x1080, 1024x600 | 7 per formaat | **0** op alle drie | 0 | 0 | 0, en 0 console-fouten |

Van de 188 meldingen op 1280x720 waren de meeste: het wereldlabel "Fluit een duif" met zijn stip en streep over de HUD (ca. 60), de plaatsnaam-tekst tegen zichzelf (ca. 50, een artefact van de detector: tekstvakken met een strakke regelafstand), het doel dat onderin onder de ondertitel lag (7) en de plaatskaart over de onderrij (6).

## Bevindingen, oorzaak, fix en status

| Scène | Overlap | Oorzaak | Fix | Status |
| --- | --- | --- | --- | --- |
| geld-politie-kaart, gezocht | de "Gezocht"-tag (groot moment, vorm `rand`) over het wapenchip en het ster-/geldblok | `.bm-wanted` stond op een vaste `top: 30vh` terwijl de rechterkolom van zone C op 720p tot y 228 loopt | `randTop()` in `bigmoment.js` hangt de tag 12 px onder de gemeten kolom (`#hud .hud-top-right`) | gefixt, test `overlap_fixes_test` |
| geld-politie-kaart | de politiemelding "dubbel" (een kaart links en een bijna doorzichtige tag rechts) | geen dubbele component: de tag is de bedoelde "Gezocht"-tag van #996 die 1,8 s over de rand fadet; mijn scène gaf de kaart dezelfde woorden. In het echte spel zijn de woorden van kaart en tag verschillend | niets aan de duplicatie; de tag valt niet meer over de HUD | geen bug, wel gefixt als overlap |
| voet, auto, gezocht | wereldlabel (chip, stip, streep) over kaarten, minikaart, doel, wapenchip | `prompts.js` klemde alleen op de vensterrand | `labelDy()` (nieuw, `promptclear.js`) schuift de chip onder of boven het HUD-onderdeel (`#hud` kaarten, doel, locatie, minikaart, route, klokkolom); `anchorCovered()` verbergt een label waarvan het anker onder een minigamebord of paneel ligt (`wp-weg`) | gefixt |
| bord-lang, bord-discgolf | minigamebord over de klok rechtsboven en over het wereldlabel; bij 1024 breed over alles | `max-width` van het bord rekende met een vaste 310 px of 330 px voor zone C; de klok is 400 HUD-px breed | de reserve is de gemeten `--hud-c-right`; onder 1100 px hangt het bord rechts onder zone C (`--hud-tr-bottom`) | gefixt (1280 gemeten; 1024 niet opnieuw gemeten) |
| bord-discgolf | watermerk "SCHIJF IN DE BOSJES" achter "Mooie worp! / ESC stoppen" | `.mg-watermark` rechtsonder in het bord, 54 px | verborgen (dubbel met de sfeernaam in de kop; het element blijft in het DOM voor de sfeertest) | gefixt |
| bord-discgolf | cellen "Hole 1" breken af in twee regels | scènefout van mij: het echte spel zet getallen in de cellen | scène gebruikt echte cellen | geen bug |
| doel-lang, voet, wijkkaart | plaatskaart ("Binnenstad, Het hart van Grunn") onderin over het doel, de locatiekaart en de klok | `.bm-gebied` op `bottom: 14vh`, `min-width: 640` | boven in de vrije middenzone D, `plaatsTop()` houdt hem onder zone B (gemeten), breedte tussen de kolommen | gefixt |
| ondertitel-banter, alle met doel | de ondertitel (zone G) over de doelkaart (stond onderin) | doel en ondertitel deelden de onderrand | **de eigenaar verplaatste het doel naar zone B** (zie hieronder); daarmee is de overlap weg | gefixt door de verhuizing |
| alle | de plaatsnaam (grote tekst, bovenin) tegen zijn eigen regels | detector: tekstvakken met `line-height: 0.95` raken elkaar zonder dat het beeld dat doet | de detector slaat tekst naast tekst in dezelfde HUD-groep over | geen bug |
| tip-prestatie-toast, toast-activiteit | Activiteit-kaart (links) over de "Nieuwe streek"-toast; Kiekdoar-kaart tegen de E-kaart op 1024x600 | `LEFT_COLUMN_LINES` was 18 voor elk venster en telde de telefoonkaart niet mee | `leftColumnLines(viewH)` (18 op 720, 12 op 600, 26 op 1080p) en `extraLines` voor de telefoonkaart in `leftColumnFits` (`hudbus.js`, `hudcards.js columnOpts()`) | gefixt (de eerdere `hudbus leftColumnFits`-fix klopte op 720, niet op 600) |
| auto, telefoon-lang | Kiekdoar-kop breekt uit de kaart ("WESTERKWARTI") | `.pf-title` met een lang woord en zonder regelgrens | `overflow-wrap: anywhere` en vier regels | gefixt |
| auto-politie 1024x600 | de naamkaart ("Statig") onder de toetshintstapel ("Uitstappen", E, M) | `--hud-vehname-bottom` kende de stapel niet | `--hud-vehname-ctx` gemeten uit `.hud-ctx` (`hud_panel.js`, `hud_panel.css`) | gefixt |
| auto-politie 1024x600 | in de afslagkaart ligt "990 m / ± 2 min" over "Over 40 m linksaf"; de doelregel steekt uit de kaart ("bij Spuit & Klaar") | de strook van zone B is hier 240 px; `white-space: nowrap` en geen ellips | onder 1100 px breekt de routekaart om en laat het doel de bedieningsregel weg; de doelregel kapt met `…` af | gefixt (niet opnieuw gemeten) |
| doel, 1024x600 | de titel "Nul krassen, vijftienhond…" afgekapt | zone B was gecentreerd met twee keer de grootste reserve (240 px) | `.hud-zone-b` vult nu de strook van 12 px na de berichtkolom (`min(30vw, 350 px)`) tot zone C: 463 px op 1280, ca. 290 px op 1024x600 | gefixt (niet opnieuw gemeten) |
| gezocht-5-zoeken | de politie-/achtervolgingskaart links raakt de doelkaart rond x = 380 | zone B begon op een vaste `edge + 330` terwijl de kaartkolom 350 px is | zone B begint 12 px rechts van `min(30vw, 350 px)` | gefixt (niet opnieuw gemeten) |
| rijden | twee balken onder de naam zonder te zeggen wat ze zijn (de tweede is de voertuigstaat) | geen icoon | 16 px-icoon voor elke balk: hartje, schild, voertuigicoon dat het soort volgt (auto, fiets, boot, vliegtuig, scooter, bus), tooltip en `aria-label` (Gezondheid, Pantser, Voertuig); de balken lijnen uit (159 px) | gefixt (`na-ic-1280x720-voet.png`, `-auto.png`) |
| alle HUD-beelden | het kaartje "Tammo [portret] N% klaar": een tweede portret (de metgezel) naast de naam | `.hud-mate-pic` met het portret van de metgezel; het voortgangschipje `hud-done` | het metgezel-portret is weg (de metgezel blijft voor schermlezers); het kaartje toont het personage van `hoofdspeler(world)` (ook een gast ziet zijn eigen figuur); **het voortgangschipje en het welkom-terugbericht met het cijfer zijn weg** (besluit eigenaar), de voortgang staat nog in Spel > Overzicht en in het savegame-overzicht | gefixt |

### Het doel naar zone B (besluit eigenaar)

De doelkaart ("Nul krassen, vijftienhonderd punten", afstand, hulpregel) hangt bovenin het midden. `hud_panel.js` zet het doel en de routekaart in één kolom `.hud-zone-b` (doel eerst, routekaart eronder, 8 px ertussen); de kolom loopt van 12 px rechts van de berichtkolom tot zone C en centreert daarin. De plaatsnaam en de plaatskaart hangen eronder (`--hud-b-bottom`). Een minigamebord, een filmlaag (`body.cine-hide-hud`) en een cutscene verbergen de kolom. Weggehaald: alle `bottom:`-regels van het doel (treincabine `tc-on`, vliegtuig, bus, aanraak, smalle schermen, `--hud-g-floor`). De bedieningsregel in het doel staat alleen de eerste seconden van een nieuw doel (`obj-fresh`) en niet in een smalle strook. Onderin is de ruimte vrij voor de minikaart, de locatiekaart en de snelheidsmeter. Tests: `hud_layout_issues_test` (blok #985), `hud_test`, `busui_test`, `onboarding_help_test` (de eerste uitleg zegt nu "Je doel staat bovenin").

## Niet gefixt

| Scène | Overlap | Reden | Beeld |
| --- | --- | --- | --- |
| keuzepaneel 1024x600 | het keuzepaneel (`.cw-panel`) over de klok, 79 x 55 px | het paneel zit boven op dezelfde plek als zone C; geen tijd meer | `docs/beeld-20-11/overlap/open-1024x600-keuzepaneel.png` |
| ondertitel-banter 1024x600 | de ondertitel (drie regels) tot in de F-kolom (id-kaart), 235 x 64 px | de ondertitels (`banter.js`, `radiosub.js`, `storytalk.js`) staan op `bottom: 27vh`; hoger zetten raakt op een laag venster de rest; geen tijd meer | `open-1024x600-ondertitel-banter.png` |
| pad-hints 1024x600 | een `div` over de geldregel, 141 x 23 px | niet uitgezocht welk element het is | `open-1024x600-pad-hints.png` |
| missie-geslaagd (alle formaten) | de resultaatband en de gedimde HUD (12%) over elkaar | **bedoeld**: een schermvullend groot moment dimt de HUD | geen |
| alle | `np-artist` ("Geesje met het nieuws, het ver…") en `mg-sfeer` met `…` | bedoeld: de volle tekst staat in het detailvlak | geen |
| E-kaart tegen een telefoonkaart die later komt | een telefoonkaart die verschijnt terwijl een E-kaart al staat, duwt de E-kaart niet weg (alleen de omgekeerde volgorde is gefixt) | `phonefeed.js` kent `leftColumnFits` niet | geen beeld |

## Niet gezien

- **Beelden na de laatste commits:** na de laatste wijzigingen (zone B vanaf `min(30vw, 350 px)`, voortgangschip weg, ResizeObserver in een frame) is alleen een beeldronde van zeven scènes op de drie formaten gedraaid (`docs/beeld-20-11/overlap/na-<formaat>-*`); de balkiconen zijn alleen op 1280x720 te voet en rijdend bekeken (`na-ic-*`). De volledige scènelijst (35) is na de laatste wijzigingen niet opnieuw gemeten; de rij "na eerste fixes" is de laatste volledige meting.
- **Scènes die ontbreken:** boot (geen water op de teststek), vliegtuig, helikopter, trein, boerderij-HUD, wijkkaart met controller en Samen spelen (host en gast naast elkaar). Daar is niets gemeten.
- **Cinekaart/titelkaart (naamchip, minikaart en telefoon zichtbaar achter de filmlaag):** mijn scène zet `cine-hide-hud` zoals de echte filmlaag; het geval van de eigenaar (een titelkaart zonder `hideHud`) is dus **niet** gereproduceerd. De overige-UI-agent heeft dat.
- Geen mens heeft de beelden beoordeeld; alles is gemeten en door de coördinator en mij bekeken.
- Console: "ResizeObserver loop completed with undelivered notifications" kwam 30 tot 38 keer per run voor; de metingen staan nu in een `requestAnimationFrame`. Niet opnieuw gemeten.

## Beelden

`docs/beeld-20-11/overlap/`: `voor-<formaat>-<scène>.png` (het begin van de dag), `na-<formaat>-<scène>.png` (laatste ronde) en `open-1024x600-<scène>.png` (wat niet is opgelost).

## Ronde 2 (20-11, 0.64.0): 1024x600, toetsglyphs

Deelmeting van 8 scènes (keuzepaneel, ondertitel, pad-hints x2, voet-doelkaart, auto-politie, bord-lang, bord-discgolf) met de laatste code; beelden `n3-<formaat>-<scène>.png`.

| Formaat | Scènes | Overlap | Console-fouten |
| --- | --- | --- | --- |
| 1280x720 | 8 | **0** | 0 |
| 1920x1080 | 8 | **0** | 0 |
| 1024x600 | 8 | **10** (was 14 klassen) | 0 |

- **Gefixt:** het keuzepaneel hangt onder 1100 px rechts onder zone C (de klok is vrij); de spraakbel ("Dan ben ik dus op tijd.") over de geldregel schuift nu uit de HUD-onderdelen (`hudrules.js bubblePlace` met obstakels uit `prompts.js`; de oorspronkelijke "onbekende div"); een ondertitelregel boven de locatiekaart staat als CSS (`@media (max-height: 720px)`, `a11y.css`); toetsplaatjes in de HUD zijn minstens 26 px (doelkaart, kaarten, prompts); stopvenster-glyph 28 px.
- **Nog open op 1024x600:** (a) de ondertitel ligt nog over de locatie- en id-kaart (235 x 54 px): de CSS-regel `bottom: 200px` greep in de meting niet, oorzaak niet gevonden (`n3-1024x600-ondertitel-banter.png`); (b) keuzepaneel en minigamebord raken de toetshintstapel rechtsonder (24 x 48 px, de Esc-toets): daarvoor is een regel toegevoegd die de stapel verbergt zolang paneel of bord er staat, maar die is niet opnieuw gemeten; (c) een prestatie-toast over een regel van de auto-politie-scène (191 x 23 px).
- **Glyphs niet gemeten:** de nieuwe toetsplaatjes van 26 px zijn alleen in de bovenstaande beelden te zien, niet per scherm (startkaart, menu-voetregel, stopvenster) bekeken; controllerglyphs waren al 26 tot 30 px (`a11y.css`) en zijn niet aangepast.
