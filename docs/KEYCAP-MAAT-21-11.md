# Toetsplaatjes en tekst: maat en uitlijning (#1075, 21-11)

Eigenaar: "de grootte van de control hints en de teksten kwamen niet altijd mooi overeen" en "ik wil dat die iconen in de lopende tekst lijken te staan; soms staan ze heel raar uitgelijnd".
Stand: ontworpen, gebouwd en met pure tests gedekt; **nog niet in beeld bekeken** (geen Electron tijdens de releasegate). Zie "Te verifiëren in beeld".

## Ontwerpbesluit: toetsplaatjes zijn inline zetwerk

Eén regel, één bron: `game/js/ds-keycap.css` met de tokens `--ds-kc-*` onderaan `game/js/ds-tokens.css`.

- Het plaatje is een **factor van de omliggende tekst**, nooit een vaste px-maat. De tokens zijn getallen zonder eenheid, zodat elke eigen `em` ze zelf oplost.
- **Glyphs** (toets, muis, controller; Kenney Input Prompts, ADR 0041). Gemeten in de fonts (`game/fonts/input`, alle zes dezelfde indeling): `unitsPerEm` 2048, elke glyph staat met de onderkant op de basislijn (`yMin` 0), de inkt is 983/2048 = 0,48 em hoog en 0,48 em breed, de vooruitgang is 0,5 em; de muis is 901/2048 hoog (0,44), schouderknoppen en spatie zijn lager. De glyph is daarom `display: inline`, `line-height: 0` (de regel wordt er niet hoger van), `font-size = cap / 0,48` in tekst-em en `vertical-align: calc(-0,125 * 1em)` (in glyph-em): het midden van het plaatje valt dan op 0,30 em boven de basislijn, de halve letterhoogte van gemengde tekst (x-hoogte 0,5, kapitaal 0,7). Omdat dit uit de fontmetrics volgt en niet uit `middle` of `line-height`, is het in elke context gelijk.
- **Maten:** `--ds-kc-cap` 1,25 (in lopende tekst het maximum), 1,5 in een hintrij (`.ds-kc-rij`, onderbalk, HUD-hints, doelregel, pauzemenu-voeten, besturingstabel). Vloeren: plaatje minstens 18 px (`--ds-kc-floor`), in de HUD-hintrijen 26 px (#985 blijft gelden), letter in een tekstplaatje minstens 13 px (`--ds-kc-letter-min`).
- **Tekstplaatje** (toets zonder glyph, zoals `[`): `inline-block`, letter 0,8 em, hoogte `cap` em, `min-height` 18 px, `vertical-align` +0,05 em (letterbasislijn op de tekstbasislijn, het plaatje midden op 0,30 em). Geen schaduw of diepte in lopende tekst; kleur en rand komen van de context (zeefdruk: inkt op papier).
- **Optische maat:** de muisglyph krijgt factor 1,09 (`--ds-kc-opt`, 983/901) zodat muis, toets en controllerknop even groot ogen; Xbox, PlayStation en Steam Deck hebben dezelfde inkt als de toets (983) en blijven 1,0.
- **Spatiëring als een woord:** de normale spatie van de zin links en rechts; de glyph heeft zelf maar 0,02 glyph-em (0,05 tekst-em) marge. Letterspatiëring van de tekst wordt niet geërfd (`letter-spacing: 0`).
- **Afbreken:** een toetsgroep (`{A} / {D}`, `{A}/{D}`, `{SHIFT} + {LMB}`, `{Q} en {E}`, `{W}{A}{S}{D}`) en het woord vlak voor een toets ('Houd {SPACE}', 'Druk op E') zijn één `.ds-kc-eenheid` (`white-space: nowrap`), gemaakt door `keyTextHtml` en door `sweepTokens` (`groupKeyRuns` in `keycap.js`). Een toets zonder woord ervoor heeft geen wikkel nodig. De WASD-cluster in twee rijen is vervallen: de vier toetsen staan naast elkaar (een tweerijig blokje maakt een zin twee regels hoog).
- `!important` op de maatregels in `ds-keycap.css`: contextregels als `#hud .hc-text span` raken ook de plaatjes (dat is waarom `a11y.css` het al deed). De losse maten in de context-CSS zijn weggehaald, zie de tabel.
- Rustig drukwerk en verminderde beweging: `ds-keycap.css` bevat geen animatie, overgang of schaduw (getest). De animaties van `.ds-uitleg__stap[data-anim]` blijven in `ds-components.css`.
- **Uitzonderingen** (staan in `ALLOW` van `scripts/ui/keycap_maat.mjs`, met reden): `#pause-menu .pm-bindbtn .hud-key` (vaste cel van de besturingstabel). Platen die zelf een onderdeel zijn van een tabel of widget en geen plaatje in een zin: `.m-kc` (32 px, menuvoet en tabel), `.rw-toets` (regelwidget, uitleganimatie), `kbd` in `#foto-ui`, `#load-screen .ls-skip`. Die vallen buiten `KEY_SEL`.

## Inventaris: voor en na

"Voor" is gelezen uit de CSS op `main` (828ec9f57), "na" uit de nieuwe regel. Tekstgroottes volgen de tokens (`--ds-t-kaart-body` 16 px, `--ds-t-kaart-hulp` 13 px, `--hud-min` 13 px) en de CSS van de context. Alles is rekenwerk; de beeldmeting staat nog open.

De kern van het probleem zat in `a11y.css`: elke toetsglyph was **28 px hoog** (`font-size: 56px; line-height: 28px; height: 28px; vertical-align: middle`), in menu's 30 px, in sommige rijen 24 tot 36 px, ongeacht de tekst ernaast. Naast 16 px tekst is dat 1,75 em, naast 21 px 1,33 em, naast 13 px 2,15 em: te groot, te laag (`middle` zonder baseline) en een eigen regelhoogte, waardoor de regel opzwol en de D naar de volgende regel sprong.

| Context | Tekst | Voor (glyph / tekstplaat) | Na | Afbreken |
|---|---|---|---|---|
| HUD-hintbalk onderbalk (`.ctx-row`, `.ctx-glyphs`) | 16 tot 17 px | 28 px / plaat 30 px, WASD als blok van 2 rijen | hintrij 1,5 em, vloer 26 px: 26 px | rij; groep `nowrap` |
| Doelregel (`.hud-obj-keys`) | 13 px | 26 px (#985) | 26 px (vloer, hintrij) | `nowrap` per item |
| Hintkaart / doelkaart (`.hc-text`, o.a. Kist Kees-instaptip) | 16 px, lh 1,3 | glyph 28 px (1,75 em), plaat 26 px, `vertical-align: middle` of 0,08 em | 20 px (1,25 em), midden op 0,30 em | eenheid (A/D, W A S D) |
| Missiekaart (`#hud .wp-*`, `.wp-learn`) | 13 tot 24 px | plaat 24/28 px, muis 17x24/20x28 px | glyph via de regel; muissvg `cap` em hoog | `nowrap` |
| Ondertitel (`#cine .cine-sub`, `#banter-sub`, `#radio-sub`) | 16 tot 21 px | 28 px glyph, `#cine .hud-key` 26 px | 1,25 em: 20 tot 26 px | eenheid via `keyTextHtml` en `sweepTokens` |
| Uitleg (`.ds-uitleg__tekst`) | 13 tot 16 px | 28 px glyph | 18 tot 20 px | eenheid |
| Pauzemenu-voetbalk (`.m-foot .m-hint`) | 18 px | glyph 30 px (font 60 px), padglyph 28 px, `.m-kc` 32 px | hintrij 1,5 em van 19 px: 28,5 px (`.m-kc`-plaat blijft 32 px: uitzondering) | `.m-hint` is `nowrap` |
| Besturingsoverzicht (`.pm-ckeys`) | 13 tot 16 px | glyph 30 px, plaat 26 px, WASD-blok met 22 px | hintrij 1,5 em | rij |
| Bindrijen (`.pm-bind`) | 15 tot 16 px | glyph 24 px (font 48 px) | hintrij 1,5 em: 24 px | rij |
| Instellingen / winkels (`shopui`, `.m-kc`) | 15 tot 19 px | `.m-kc` 32 px, glyph 22 tot 30 px | glyph volgt de tekst; `.m-kc` blijft (uitzondering) | rij |
| Light-sim-HUD (`.sh-hud`) | 13 tot 14 px | plaat 26 px, `vertical-align: baseline` | 1,25 em, midden op 0,30 em | eenheid |
| Minigames, padel, cabine, keuzepaneel, uitjes | 13 tot 16 px | marges `0 2px`, `vertical-align: middle` (per bestand), plaat 28 px | overal dezelfde regel; de losse marges zijn weg | eenheid |
| Heist (`#heist-ui`) | 13 px | plaat 22 px, 17 px met letter 11 px (onder de 13 px) | 1,25 em, letter minstens 13 px | eenheid |
| Heli-help (`.hh-help`) | 12 px letter | plaat met `padding: 1px 6px`, 12 px | 1,25 em, letter minstens 13 px | eenheid |
| Wegwijzer (`#windwijzer`) | 14 px | padding 1px 6px | 1,25 em | eenheid |
| Benchmark, laadscherm, toasts, telefoon | n.v.t. | de globale glyphregel van 28 px | de globale regel; zie "Te verifiëren" | eenheid waar `keyTextHtml` loopt |

Bewust niet aangeraakt: `.hud-hold` met de houdring (`prompts.css`, een eigen onderdeel met 3 px speling), de bindknop in de besturingstabel, `.m-kc`, `.rw-toets`, de `kbd` in de fotomodus en het laadscherm. Reden hierboven; de test (`ALLOW`) dwingt af dat een nieuwe plaat niet ongemerkt met px wordt gemaakt zodra hij `.hud-key`, `.pad-g`, `.hud-wasd` of `.hud-mouse` heet.

## De drie voorbeelden als tekstmodel (`node scripts/keycap_maat_test.mjs --toon`)

Het model telt de breedte per letter (eenvoudige lettertabel), neemt de glyphbreedte uit de fonts (0,5 em maal de schaal, plus marge), leest `nowrap` uit `ds-keycap.css` en breekt gulzig. Tussen haakjes staat de toets.

1. Kist Kees-instaptip ("Gas: {W}. Stijgen: {SPACE}. Rollen: {A}/{D}. Kleppen: {K}. Gestel: {G}. Landen: zacht."), uitleg 260 px:
   `Gas: [W]. Stijgen: [Spatie].` / `Rollen: [A]/[D]. Kleppen: [K].` / `Gestel: [G]. Landen: zacht.`
   Op 200 px: `Rollen: [A]/[D].` staat samen op één regel; `[D]` staat nooit alleen of aan het begin van een regel. Zonder `nowrap` op `.ds-kc-eenheid` breekt het model de groep wel (de test kan dus falen).
2. Hintkaart: `[W] en [S] gas · [A] en [D] rollen · [Pijl omhoog]/[Spatie]` / `neus omhoog · [Q] en [E] roer`, 300 px.
3. Ondertitel: `Houd [Spatie] ingedrukt om te` / `rennen, [W][A][S][D] sturen.`, 420 px.

Over alle contexten, breedtes (55 tot 120 procent) en negen zinnen (Houd {SPACE}..., {W}{A}{S}{D}..., Landingsgestel uit met {G}!, Gas/Stijgen/Rollen, Shift + klik, Druk op E...) breekt geen groep halverwege, begint geen regel met een scheidingsteken en raakt het plaatje de volgende regel niet (ruimte: regelhoogte min 0,7 min 0,325 em; vanaf regelhoogte 1,1 ruim voldoende). Het plaatje steekt alleen met inkt buiten de regelstrut bij `lh` 1,1 (titel, 0,07 em) en bij 13 px (0,07 em): geen lay-outgroei, alleen inkt.

## Tests en bewaking

- `scripts/keycap_maat_test.mjs` (nieuw, 3145 controles): fontmetrics (inkt 983/2048 op de basislijn in vier fonts, muis 901), tokens (cap <= 1,25, vloeren 13 en 18 px, midden op de halve letterhoogte), regels van `ds-keycap.css` (inline, `line-height: 0`, `vertical-align` uit het token, `em`-relatief, geen animatie of schaduw), markup van `keyTextHtml` (geen `style`, `width`, `height` of px; toetsgroepen en woord plus toets als `nowrap`-eenheid), het lay-outmodel (zie boven) en de px-bewaking zelf (een synthetische CSS met een nieuwe vaste px-maat moet falen).
- `scripts/ui/keycap_maat.mjs`: de px-scan op alle `game/js/*.css` en de CSS in `.js`-sjabloonstrings; op `main` vindt hij 141 plekken, nu 0. `scripts/ui/icon_sweep.mjs` (en dus `icon_sweep_test`) roept hem aan: een nieuwe plek met een vaste px-maat voor een toetsplaatje faalt daar ook.
- Aangepast omdat de regel waar ze naar keken is vervallen: `controlhint_test` (de doelregel krijgt zijn maat uit `ds-keycap.css`), `machinist_hud_test` (cabine heeft geen eigen keycapstijl). Gedraaid en groen: `key_literals_test`, `key_tokens_test`, `besturing_overzicht_test`, `hud_layout_issues_test`, `hudcards_layout_test`, `icon_sweep_test`, `ds_tokens_test`, `ctxidentiteit_test`, `kaartactie_test`, `a11y_test`, `hud_test`, `hud_layout_test`, `hud_typo_test`, `spelmenu_test`, `touch_wiring_test`, `spec_check`, de regelsaudit op de diff. Niet kunnen draaien (vereist `npm run stage` voor three): `hud_linkerkolom_test`, `startkaart_test`.

## Gedeelde bestanden (parallel met ds3-alles-21-11 en reviewfixes-a/b)

Klein gehouden en met tokens. Toegevoegd: `game/js/ds-keycap.css` (nieuw), onderaan `game/js/ds-tokens.css` (één blok `--ds-kc-*`, alleen aan het eind toegevoegd), één `<link>` in `game/index.html` en `game/ds-galerij.html`, één lijstelement in `game/js/shopui.js`. Maatregels verwijderd uit: `a11y.css`, `hud_panel.css`, `prompts.css`, `hudcards.css`, `pausemenu.css`, `menu.css`, `heist.css`, `sim.css`, `helirun.js` en de marges in `busbestuurhud.js`, `choicepanel.js`, `cockpit.js`, `minigamekit.js`, `padel.js`, `pigeonmode.js`, `treincabine.js`, `uitjepaneel.js`. Logica: `keycap.js` (`groupKeyRuns`, `endKeyRuns`, `keyTextHtml`) en `glyphs.js` (`sweepText`). Bij een conflict met de zeefdrukronde: kies hun kleuren en tokens, houd van mij het wegvallen van de maatregels. Ook `DESIGN_SYSTEM.md` regel 3 van "Controls and key hints" is herschreven.

## Te verifiëren in beeld (1280x720 en 1920x1080)

Per context een screenshot met het toetsplaatje in de zin; kijk naar: staat het midden van het plaatje op de halve letterhoogte (niet te hoog of te laag, op Windows en macOS; Windows leest de typografische ascender van de glyphfonts (USE_TYPO_METRICS), macOS en Linux de hhea-waarden: verschil hooguit 0,03 glyph-em, ruim 1 px), is de regelafstand gelijk met en zonder plaatje, breekt niets halverwege.

1. Kist Kees-instaptip (vliegschool, `UITLEG_INSTAPPEN`) en de BEDIENING-regel in de hintkaart: W, SPACE, A, D, K, G op één lijn met de tekst; A/D bij elkaar.
2. HUD-onderbalk (`.ctx-row`): glyph 26 px, geen blokje van WASD meer, rijbreedte bij vier toetsen en de pijltjes.
3. Doelregel (`.hud-obj-keys`) en missiekaart (`.wp-learn`).
4. Hintkaarten en doelkaarten in alle accentkleuren; `hc-text` met twee regels en een toets op de tweede regel (regelafstand).
5. Ondertitels (cine, banter, radio) met een toets, ook 1920x1080 en met de tekstschaal van Instellingen op 1,5.
6. Uitleg (`.ds-uitleg`) en compacte uitleg met `data-anim="druk"` (de animatie raakt nu de inline glyph: kijk of die niet verspringt).
7. Pauzemenu: voetbalk (`.m-foot`) in elk tabblad, de besturingstabel (rebind), `.pm-ckeys` in het besturingsoverzicht, controller-voettekst (Xbox, PlayStation, Steam Deck) naast toets en muis: even groot?
8. `.m-kc` met een glyph erin (het plaatje verdwijnt via `.is-kbg`): staat de glyph midden in de 32 px-plaat (flex-container met een `display: inline`-wikkel).
9. Muis (`{LMB}`, `{WHEEL}`, `{MOUSE}`) naast een toets: even groot voor het oog (factor 1,09). Controllerknoppen, schouderknoppen (lager) en sticks.
10. Light-sim-HUD, minigames (golf, padel, keuzepaneel, cabine), heist, heli-help, wegwijzer, winkels, benchmark, laadscherm, toasts, telefoon: één voorbeeld per scherm.
11. De tekstplaat ('[' en ']') in lopende tekst op een donker en een licht vlak: hoogte 1,25 em, letter minstens 13 px, geen schaduw.
12. Rustig drukwerk aan en verminderde beweging aan: niets beweegt in de toets zelf.
13. De houdring (`.hud-hold`) om een glyph: past de ring nog om de glyph (nu inline, zonder vaste maat)?

Bekende risico's om daar te zoeken: een glyph direct als flex-kind van een rij die `align-items: center` zet (de wikkel is `inline` maar wordt als flex-kind een blok; het midden kan dan een paar tienden em afwijken), de `.hud-hold`-ring (vaste speling van 3 px), en de WASD-rij in een smalle hintrij.

## Vervolg 21-11: de overslaan-hint in de echte render (#1075)

De eerste fix (inline, zonder flex) bleek in een echt screenshot niet te werken: Spatie stond lager en klein, de label onleesbaar. Met `scripts/ui/keycap_meet.mjs` (headless Chrome, echte CSS en echte glyphfonts, geen Electron) is dat gemeten en gereproduceerd (`docs/beeld-21-11/keycap-skip/voor.png`, `na.png`, `mock.html`).

**Oorzaken (gemeten)**
1. De Spatie-glyph is maar 573/2048 hoog (Shift 655, Tab 614...), de toets 983. Een vaste schaal voor "0,48 em inkt" gaf Spatie 16 px inkt bij 18 px tekst, met een label van enkele pixels; en de daling was voor 0,48 berekend, dus Spatie stond 4,3 px te laag (Shift 3,3, Tab 1,8).
2. De fonts hebben typografische metrics (ascent 0,8, descent 0,2; hhea 0,667/0 op macOS en Linux). Bij een grotere schaal ligt het nulhoge regelvak van de glyph (`line-height: 0`) ver boven de basislijn en groeit de regel of het flexvak: in flexrijen (HUD-hint, hold-ring, menuvoet) stond de glyph 3 tot 6 px te hoog of te laag.
3. Flexrijen centreren de vakken van toets en tekst; die hebben een andere regelhoogte.

**Oplossing, centraal**
- `data-ink` (uit de fonts, `scripts/input_glyph_ink.mjs` schrijft `inputglyphs_ink.js` en het blok in `ds-keycap.css`): de INKT is overal even hoog (`--ds-kc-cap`), een lage toets krijgt een groter lettertype en een leesbaar label. Spatie is nu ook 20 tot 27 px hoog en ongeveer 1,7 keer zo breed als hoog.
- `vertical-align` volgt uit `--ds-kc-mid` (0,30 em) en de inkthoogte: het midden staat op de halve letterhoogte, voor elke glyph.
- `ascent-override: 10%; descent-override: 0%` op de zes glyphfonts (`fonts.css`): het regelvak ligt vlak bij de basislijn, op elk platform, hoe groot de glyph ook is. Het verschil tussen Windows en macOS (0,03 em) verdwijnt hiermee.
- Flexrijen (`.ctx-row`, `.wp-chip`, `.wp-glyph`, `.hud-hold`, `.m-hint`, `.m-foot`, `.sk-hulp > span`, `.hud-obj-key`, `.mg-stopask`) staan op `align-items: baseline`.
- De ring links (`.cine-skip-ring`, heist, trailer) staat via dezelfde `--ds-kc-mid` op de tekstregel; de vloer `--ds-kc-floor` is 20 px.

**Meting (px, + is lager dan het midden van de tekst; 6 toetsen x 10 varianten, 1920x1080-achtige maten)**

| Variant | voor (SPACE / SHIFT / W) | na (SPACE / SHIFT / W) |
|---|---|---|
| cine-skip | +4,3 (16 px hoog) / +3,3 / -1,2 | -0,2 (27 px hoog) / -0,2 / -0,2 |
| heist-skipchip | +3,2 / +2,2 / -0,8 | -0,8 / -1,3 / -1,3 |
| hud-hold | +3,1 / +2,1 / -1,9 | -0,1 / -0,2 / -0,4 |
| prompts (ctx-row) | +2,0 / +1,0 / -3,0 | +0,3 / +0,3 / +0,3 |
| hintkaart, uitleg, ondertitel | +4,0 tot +4,5 / +3,0 tot +3,5 / -0,5 | -0,1 tot +0,4 / -0,6 tot -0,1 / -0,6 tot -0,1 |
| knop, launchchoice-pil, menuvoet | +1 tot +7 (SPACE) | -1,2 tot +0,3 |

De test staat op 1,5 px (1 px plus 0,5 voor het afronden van de canvasmeting); de grootste restwaarde is -1,3 px in de heist-chip (14 px tekst: de vloer van 20 px duwt het plaatje 0,6 px omhoog). De Esc- en Enter-glyph blijven kleine labels in de Kenney-tekening houden.

**Te verifiëren in het echte spel (Electron)**: de overslaan-hint rechtsonder in de opening op 1920x1080 en 1280x720 (inclusief de grotere pil van `launchchoice*`), de hold-ring om een glyph (ring en glyph concentrisch), en een glyph in een knop met `Bebas`-kop.

## Vervolg 21-11 (2): de overslaan-hint in de openings-/montagefilm (#1075)

Eigenaar: de hint is na de fix beter, maar in het openingsbeeld (`90-overslaan-hint-opening-1920`) nog te laag en klein. `node scripts/ui/keycap_meet.mjs --opening` rendert nu de echte markup van `cinematics.js` (de toets als tekst `SPATIE`, door `glyphs.js` een glyph) in de echte `#cine` met letterbox (balken 11vh), met en zonder ondertitel, op 1280x720 en 1920x1080 en bij `--ui` 1, 1,25 en 1,5.

- **Met de huidige CSS en `data-ink`:** glyph -0,2 tot +0,1 px van het tekstmidden, ring -0,6 tot -0,2 px, inkt 1,5 keer de tekst (27, 34 en 41 px), op alle zes combinaties. Letterbox, `translateY(50%)` van de pil en `--ui` verplaatsen de glyph niet.
- **Zonder `data-ink`** (`--zonder-ink`: een build van vóór de ink-tabel, commit b1954c58d) is het beeld van de eigenaar gereproduceerd: de Spatie-glyph staat +5,3 px (ui 1) tot +8,4 px (ui 1,5) te laag en is 40% te klein (16 px inkt bij 18 px tekst). Het screenshot komt dus van een build zonder de ink-tabel; `docs/beeld-21-11/keycap-opening/voor-1920.png` en `na-1920.png` tonen het verschil.
- `scripts/keycap_maat_test.mjs` (sectie 8) bewaakt de zes combinaties: glyph en ring binnen 1 px en de inkt 1,4 tot 1,6 keer de tekst.

Nog te bekijken in het echte spel: de openingsfilm in een build mét de ink-tabel.
