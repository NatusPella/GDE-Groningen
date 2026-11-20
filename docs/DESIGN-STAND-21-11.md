# Designsysteem (epic milestone 14): stand per issue, 21-11

Opgemaakt vanuit `gh issue view`, de commitgeschiedenis van `main` (v0.64.0) en de beelden in `docs/beeld-20-11/` en `docs/beeld-21-11/ds/`.
"Gezien" betekent: een beeld uit het draaiende spel in Electron, bekeken door een agent. Niets is al door de eigenaar gekeurd.
Geen enkel issue is gesloten: voor sluiten is beeldbewijs in `docs/beeld-20-11/` of `docs/beeld-21-11/` nodig én, waar het issue dat vraagt, het oordeel van de eigenaar.

Naamgeving: het systeem heet in code en docs gewoon "het designsysteem"; de lettertokens heten `--ds-font-zeef-kop` en `--ds-font-zeef-tekst` (geen `-v3` meer, #1006).

## #991 Inkten als tokens en lettertypen zelf hosten
- **Gedaan:** inkt-, drukeffect- en Rustig-drukwerk-tokens in `game/js/ds-tokens.css` (27b85b7ea); Barlow Condensed en Atkinson Hyperlegible zelf gehost in `game/fonts/` met OFL (b65c0368c); Bebas Neue en Big Shoulders Display ook zelf gehost, de Google Fonts-link in `game/index.html` is weg (024ebb154). De build meldt "offline check: geen externe load-time-URL's".
- **Open:** `desktop/build.mjs` haalt bij het stagen nog Bebas/Big Shoulders van Google Fonts om ze te vendoren (alleen bij de ontwikkeling, met sha256-lock; het spel zelf vraagt niets op). `#e8c93a` staat nog als terugvalwaarde in `heist.css` (`var(--mk-mission, #e8c93a)`) en `hudcards.css`.
- **Volgende stap:** de ontwikkel-fetch vervangen door de bestanden in `game/fonts/`; de terugvalwaarden naar `var(--ds-c-...)`. Daarna kan het issue dicht (met de controle dat een koud profiel geen verzoek naar fonts.googleapis.com doet).

## #992 Galerij, token- en componenttest, Rustig drukwerk
- **Gedaan:** componenten in `ds-components.css` (a21868cbe), `ds-galerij.html`, `ds_tokens_test` (620 controles), `release_designrules_test` (296), instelling Rustig drukwerk (edcfb886a, standaard aan op Steam Deck).
- **Open:** de galerij is nog niet in beide standen (vol en Rustig drukwerk) gefotografeerd; Rustig drukwerk is niet op alle schermen in beeld gezien.
- **Volgende stap:** `scripts/qa/ds_galerij.mjs` draaien in twee standen en de beelden in `docs/beeld-21-11/` zetten.

## #993 HUD-proef in zeefdruk
- **Gedaan:** HUD als papieren plaatjes met inktrand en misdruk bij verandering (f0ab364ba, a7916eb32, f7175c869); beelden in `docs/beeld-20-11/feedback/06-hud-te-voet.png`, `07-hud-rijden-politie.png`, `15-minikaart.png`.
- **Open:** het oordeel van de eigenaar; beelden op het Hogeland, schemer, 4K en Rustig drukwerk; de hexwaarden staan nog als voorlopig.
- **Volgende stap:** de eigenaar keurt de beelden; daarna de hexwaarden in `ui-taal.md` vastzetten.

## #994 Beeldregressie per scherm in drie resoluties
- **Gedaan:** niets specifieks voor dit issue; de bestaande beeldfase van de releasegate (`release/visual_gate.mjs`, `ui_shots.mjs`, `scripts/qa/overlap.mjs`) controleert alleen op zwart, leeg of kapot.
- **Open:** het hele issue: goedgekeurde referenties, vergelijking met drempel, vlag om te verversen, gastweergave als scène.
- **Volgende stap:** een script dat de scenebestanden in `scripts/ui/*_scenes.js` per formaat draait en tegen `docs/beeld-*/` vergelijkt (pixelverschil met drempel). Valt buiten deze ronde.

## #995 HUD die verschijnt bij behoefte, minimap en wanted
- **Gedaan:** waarden verschijnen bij behoefte en gaan na 4 s weg, wapen bij wissel of vastgehouden knop, instelling Altijd tonen (bc062f6f1, `hudrules.js`); minimap op papier met buurtlabel, roze wantedsterren met rasterlege ster (f0ab364ba).
- **Open:** zoom per vervoermiddel op de minimap en de identiteitskleur plus vorm van medespelers op de minimap zijn niet in beeld gezien.
- **Volgende stap:** een Samen-spelen-beeld van de minimap met twee medespelers.

## #996 Vier grote schermmomenten
- **Gedaan:** `bigmoment.js` en `bigmoment.css` (373d995cd), gekoppeld aan missieresultaat, opgepakt of buiten westen, nieuw gebied en wanted (b74a48c18); band niet meer links afgekapt (a59f0834e); beelden `docs/beeld-20-11/feedback/12-missie-geslaagd.png`, `13-nieuw-gebied-rijdend.png`.
- **Open:** opgepakt/buiten westen en wanted-rand zijn niet in een eigen beeld vastgelegd; Rustig drukwerk-variant niet gezien.
- **Volgende stap:** scènes voor de overige drie momenten in `scripts/ui/`.

## #997 Pauzemenu en kaart
- **Gedaan:** rail, tabbladen, kaartlaag, legenda en actiebalk in zeefdruk; Overzicht zonder scrollen op 1280x720 en 1024x600 (c0bb2494b); Boerderij met smalle lijst (3fbc3f1d4); beelden in `docs/beeld-20-11/menu/`, `docs/beeld-20-11/kaart/`.
- **Open:** Boerderij rechts nog visueel druk (hero-blok klaar, rest rustiger te maken); Spullen: afgekapte groepskoppen en zoekveld op de kop (21-11 aangepast in CSS, zie hieronder); `mapstyle.js` politieblauw/selectie volgens de spec niet apart gecontroleerd.
- **Volgende stap:** Boerderij-rechts rustiger; beeld van de nieuwe Spullen-lijst.

## #998 Telefoon met parodie-apps
- **Gedaan:** meldingen en gesprekken als papieren kaartjes, verzonnen apps Kletsmaar, Knipbank, Hoorndoar, Klusjesbord, Waarzit (fde7085fe); naam één keer (bb8fb7afd); `phonefeed.css` gebruikt alleen tokens (test: geen hex in `phonefeed.css`).
- **Open:** het telefoonmenu (`phone.js`: contacten, berichten) en lege toestanden niet allemaal in beeld.
- **Volgende stap:** beelden van Verhaal > Contacten en Berichten naast de meldingen.

## #999 Winkels, missies, loopbanen en andere v2-schermen
- **Gedaan:** Winkel en Beleidswinkel (2690d9b8d, `ds-menu-zeef.css`, kassabon als `.ds-z-bon`); Te doen, Garage, Verhaal, Prestaties, Loopbanen, Veroverd en Foto's (389c07369); beelden in `docs/beeld-20-11/menu/`.
- **Open:** Garage "Te koop"-miniaturen die als silhouet blijven; de oude `.ds-*`-componenten en glas (`.gm`) staan nog in de CSS van de pauze en een deel van de HUD (`docs/DESIGN-SCHULD.md`), dus de grote opruiming van #1006 kan pas daarna.
- **Volgende stap:** zie "Afronding 21-11".

## #1000 Minigames
- **Gedaan:** bord, stopvenster en emblemen als zeefdruk (43c262f65); identiteit via vorm en de vijf inkten; beelden `docs/beeld-20-11/ui/bord-discgolf.png`, `bord-stand.png`, `stopvenster.png`.
- **Open:** niet elk bord is apart gezien; scorebord met alle deelnemers en "weg" bij wegvallen in Samen spelen niet in beeld.
- **Volgende stap:** zie "Afronding 21-11".

## #1001 Samen spelen-schermen
- **Gedaan:** wachtkamer, wachtscherm, sessielijst, spelerslijst en Meedoen? met tokens en `.ds-z-knop` (65597d486); hub vult de breedte (32c9b4038); lobby-knoprij ondoorzichtig (3e8841b48); Samen spelen-keuze, Opgeslagen spellen en Samen starten (consent) in beeld (08067067f).
- **Open:** lobby met meerdere spelers, wachtscherm en spelerslijst (Tab) in beeld.
- **Volgende stap:** zie "Afronding 21-11".

## #1002 Laad- en bootscherm
- **Gedaan:** bootscherm vanaf de eerste paint in papier en inkt (0aa17a942); laadscherm met de render als ingelijste afdruk, gele balk met inktrand en de stap in woorden, `loadStepAt` getest (0e97fdac5); `docs/beeld-20-11/ui/laadscherm-buurt.png`.
- **Open:** wachten op host of sessie in dezelfde stijl; Rustig drukwerk.
- **Volgende stap:** zie "Afronding 21-11".

## #1003 Website, logo's, iconen en marketingbeeld
- **Gedaan:** toets- en knopglyphs (Kenney Input Prompts, CC0) als fonts met `.ds-z-glyph`, `keycap.js`, `key_literals_test` (b87783104, 705ae4dc1, fc00eb395); toetsenaudit in `docs/KEYS-AUDIT-20-11.md`.
- **Open:** de website, het logo als los bestand, app-iconen, Steam-capsules en trailer-titelkaarten zijn niet omgezet; de inventaris ontbreekt.
- **Volgende stap:** inventaris van alle plekken buiten het spel (eerste stap van het issue). Valt buiten deze ronde.

## #1004 Eigen identiteit per context, proefset golf en farming
- **Gedaan:** de minigame-emblemen in de vijf inkten (43c262f65) zijn een eerste stap; er is nog geen proefset van twee met motief, embleem, kopband, stempeltekst en 24 px kaarticoon.
- **Open:** de proefset, de tabel zonder hex met test, de keuring door de eigenaar.
- **Volgende stap:** de eigenaar kiest of golf en farming de proefset worden. Valt buiten deze ronde.

## #1006 Verwijzingen naar v1, v2 en v3 opruimen
- **Gedaan (21-11):** de designdocumenten (`DESIGN_SYSTEM.md`, `ui-taal.md`, `docs/DESIGN-*.md`) bevatten al geen v1/v2/v3 meer; de laatste restanten zijn weg: de tokens `--ds-font-kop-v3` en `--ds-font-tekst-v3` heten nu `--ds-font-zeef-kop` en `--ds-font-zeef-tekst` (328 plekken in 51 bestanden) en "designsysteem v2/v3" in commentaar van ds-bestanden, hud-bestanden, scripts en tests is geschrapt.
- **Open:** de voorwaarde van het issue (geen v2-component meer in gebruik) is niet gehaald: `.ds-kaart`, `.ds-knop`, `.ds-chip`, `.ds-papier`, `.ds-glas` en het glas-op-donker (`.gm`, `--gron-green`) staan nog in de pauze- en HUD-CSS. Verouderde hoofdstukken verwijderen zou schermen breken.
- **Volgende stap:** per scherm de laatste oude componenten omzetten (zie `docs/DESIGN-SCHULD.md`), daarna de oude componenten en de hoofdstukken verwijderen.

## Afronding 21-11 (deze ronde)
- **Gedaan in code, nog niet in beeld gezien:** de ondertitel boven de locatiekaart op 1024x600 (de regel in `a11y.css` stond met gelijke specificiteit tegenover `hud_panel.css` en verloor door de laadvolgorde; nu `html body :is(...)`); Kiekdoar-nieuws past helemaal op de telefoonkaart (`WORD_BUDGET.news`, 30 woorden; de kop mag de hele eerste zin zijn; getest in `hud_test`); toetsglyphs uit de glyphfont 60 px in plaats van 48 (pauzemenu 64 en 72 px); Spullen: groepskoppen wrappen, zoekveld met 14 px lucht.
- **Wel getest (puur):** hud_kleuren, hudbus_surfaces, ds_tokens, a11y, release_designrules, key_literals, icons, hud_layout (beide), overlap_fixes, text_audit, docs_index, lineendings, import_cycles, firstperson (scene3d.js niet aangeraakt), hud_test, hud_text_audit.
- **Niet gedaan:** beeld op 1280x720, 1920x1080 en 1024x600 van de nieuwe wijzigingen en van de schermen uit #998 tot #1002. De eerste Electron-run (Samen spelen-keuze en Opgeslagen spellen) liep wel: `docs/beeld-21-11/ds/samen-keuze-menu/` (zeefdruk, goed leesbaar). De overige runs wachtten meer dan 10 minuten op een vrij slot (3 van 3 bezet) en daarna kwam het perf-venster van de coördinator. Klaarstaand voor de volgende run: `scripts/ui/ds_afronding_scenes.js` (garage, Te koop, Spullen, Te doen, Loopbaan, Verhaal, Veroverd, telefoon, besturing, Samen spelen, tien minigamebord-varianten, winkel, laadscherm) en `scripts/ui/nieuws_scenes.js` (nieuws op de telefoon, als tipkaart en samen met een ondertitel), met de runner `scripts/ui/ds_run.sh <scenebestand> <map> <formaten> [stage]` (ds2 is het gestagede resultaat van deze branch, in `desktop/build/`, niet in git).
- **Niet opgepakt (geen beeld, dus niet blind aangepast):** Boerderij rechts rustiger; Garage "Te koop"-miniaturen die silhouet blijven (de code in `garageui.js` `fillPics` tekent ze één voor één in rusttijd; verdacht is dat de lijst vaker herbouwd wordt dan de wachtrij leeg raakt, maar dat is niet gemeten); prestatie-toast over regel in de auto-politie-scène op 1024x600; `scripts/qa/overlap.mjs` faalt op deze stage met "Failed to fetch dynamically imported module: app://game/js/cinematics.js" (de scènes in `ui_shots.mjs` draaien wel; oorzaak niet uitgezocht).
- **Voor de eigenaar:** de nieuwe scenes voor het nieuwsbericht staan ook in `scripts/qa/overlap_scenes.page.js` (nieuws-telefoon-lang, nieuws-telefoon-kiezelweek, nieuws-tipkaart, nieuws-met-ondertitel).

## Ronde 21-11 (b): code, nog niet in beeld gezien
- **#1006:** de laatste `-v3`-tokens (`index.html`, `hud_panel.css`, `pigeonguide.js`) heten nu `--ds-font-zeef-*`; dit document heet niet meer `V3` in de naam. `scripts/ds_versies_test.mjs` telt versieverwijzingen (nu 0 buiten de allowlist: changelog, ADR-geschiedenis, archief, beeldmappen en dit document) en bewaakt als ratel de oude componentenset (`.ds-kaart`, `.ds-knop`, `.ds-chip`, `.ds-papier`, `.ds-glas`): nog in 12 bestanden (de HUD-strook van de light sims, de bakronde, Boerderij, de definitie en de galerij), een nieuw bestand ermee faalt. Omgezet: de kaartuitleg (`kaartactieui.js`) en de Samen spelen-hub (`samenhubui.js`). Niet omgezet: de sim-strook (leunt op de rolvariabelen) en Boerderij (buiten deze ronde).
- **#994:** `scripts/ui/beeldregressie.mjs` (`--lijst`, `--run`, `--vergelijk`, `--ververs`), eigen PNG-lezer in `scripts/lib/pngdiff.mjs`, eerste set van vijf schermen in `scripts/ui/beeldregressie_scenes.js` (garage, te doen, verhaal, telefoon, Samen spelen-hub) in 1024x600, 1280x720 en 1920x1080; groepen voor de afronding, HUD, kaart en de gastweergave staan klaar. Puur getest (`beeldregressie_test`, 52 controles). Er zijn nog geen referenties: de eerste Electron-run en de keuring volgen; zie docs/RELEASEGATE.md.
- **#1004:** proefset golf en farming: `data-ctx` op het paneel, een tabel in `game/js/ctxidentiteit.js` (band, tekst, embleem, stempel), regels in `ds-components.css`, bedraad in `minigamekit.js` (discgolf, pitch & putt) en `farmhud.js`, twee kaarten in de galerij. Test: `ctxidentiteit_test` (25 controles, contrast 4,5:1, 13 px, geen hex). Nog niet in beeld gezien en nog niet gekeurd door de eigenaar.
- **#999:** de plaatjes in de garagelijst: wat in beeld staat komt vooraan de wachtrij, ook bij het scrollen (`vehiclepreview.js` `prio`, `garageui.js`). De oorzaak van het silhouet is niet gemeten; dit is een gerichte verbetering, geen bewezen oplossing.
