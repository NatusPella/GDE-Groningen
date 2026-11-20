# Design system: known deviations and open UX debt

> **Leeswijzer (Nederlands).** Dit document is technische naslag (bekende ontwerpschuld; de regels staan in ui-taal.md); de tekst is daarom Engels (uitzondering in ADR 0017, #692). De regels staan in [ui-taal.md](../.specs-fire/standards/ui-taal.md) en `AGENTS.md` wint bij twijfel. Nederlands is de taal van proza en van alles wat de speler ziet of hoort.

Where the code differs from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) and its detail pages, found by reading the code on 24 October. It is a list of facts, not a plan; the issue board decides the order.
Nothing here was seen on screen by a human unless it says so; most was found by reading CSS and strings. Status words: **open** (code breaks the rule), **besluit nodig** (the rule or the code has to change, the owner decides), **docs** (the text was wrong, fixed or to fix).
When you fix one, remove the row in the same commit.

## Rules the code breaks

| # | What | Where | Rule | Status |
|---|---|---|---|---|
| 1 | The map's action bar was rebuilt as three clear actions (Zet waypoint, Reis erheen, Info), one waypoint and a first-time explanation. Since #602 it follows the menu set (56 px rows, 26 px Bebas labels, 18 px explanation, colours from the tokens) and the explanation sits in the map column under the search field; the legend and the Lagen button are reachable again (the route bar stays hidden). Not seen in the game by a human | `kaartactieui.js`, `pausemenu.js` `HINTS.map`, `mapview.js` `syncKaartUitleg` | min text 12 px; a hint shows what you can do now | open, check in the game |
| 2 | Mouse and pointer lock: Esc releases the lock and opens the pause menu; embedded browsers refuse the lock, after three refused gestures the cursor steers freely and on several monitors it can leave the window. Fixed for the start of a game (#328), not tried by a human with 360 degree turns on several monitors | `input.js` `tryLock`, `LOCK_FAILS`; `main.js` `pointerlockchange` | the mouse stays in the game window | open (#435) |
| 3 | Text under 12 px: the HUD status chips (drunk, mute) at `max(12px, ...)`; the pigeon's combo tags were 11 px and are 12 px since #630 (keycap interiors are exempt: `prompts.css:231` 10 px, `heist.css:26` 11 px, `index.html:128` 10.5 px) | `hud_panel.css:217`, `pigeonmode.js` `.ph-combo`/`.ph-tag` | no sentence under 12 px | klaar voor de HUD (#803); mobiele menu-tekst staat als apart mobiel punt in MOBIEL-RAPPORT |
| 4 | Colours that are not tokens. **Deels opgelost (#479):** het keuzepaneel, de minigamebalk en de kaartsoorten lezen nu `--mk-*` (met terugval), dus de kleurenblindmodi doen mee; de per-minigame accenten zijn identiteitskleuren in één tabel (`minigamekit.js`) en staan zo in DESIGN_SYSTEM.md. **Deels opgelost (#636):** de avatar- en partnerkleuren komen nu uit één identiteitstabel (`coopidentiteit.js`). **Wat overblijft:** Samen spelen: amber `#f2c94c`, een tweede rood `#ff5a4f`, oranje `#d9822b` voor "Passieve stand: uit", blauw `#4fb3ff` voor de "Kom hier"-ping, en de kaart-INK-tabel met politieblauw en `#5fb4d9` voor geselecteerd | `coopspelersui.js`, `coopping.js` `SOORT_KLEUR`, `mapstyle.js` `INK` | one red, no blue accent, no second brand colour | **Opgelost (#809):** de pingkleuren komen uit `markerColors()` (dus de kleurenblindmodi doen mee) en spelerskleuren zijn identiteit; de kaart-INK-tabel is een bewuste kaartstijl met politie-/selectiesemantiek. |
| 5 | ~~Card category colours are fixed hex in CSS~~ **Opgelost (#479):** de kaartsoorten lezen `var(--mk-*, …)`, dus de kleurenblindmodi verven ze mee; het pictogram per kaart blijft als tweede aanwijzing | `hudcards.css`, `a11y.js` | canvas and 3D read `markerColors()`; CSS cards use icons as well | klaar |
| 6 | The Samen spelen screens carry their own CSS and inline styles instead of the shared `.gm` set: the Spelers panel buttons are bold Arial Narrow 20 px (no Bebas, no `.m-bp` / `.m-bg`, no `.m-li` rows), the wait screen and the guest's scene layer are inline styles (radius 6, black bars) | `coopspelersui.js`, `coophold.js`, `coopscene.js`, `lobbyui.js` | one surface, one button set | **Grotendeels opgelost (#636/#634):** wachten en hostwissel gebruiken de gedeelde overlaycomponent `coopoverlay.js` (`.cp-*`, menu-tokens, één primaire knop, aria-modal); de spelerslijst gebruikt tokens, Bebas-knoppen, `.m-bp`/`.m-bg` en een 44px-aanraakknop; de gastlaag leest tokens; `lobbyui`/`sessiekeuze`/`onlineconsentui` hebben geen inline style meer (wachtkamer, sessielijst en profiel/wachtwoord op klassen); het toestemmingsvinkje komt uit `onlineconsentui.js`. Bewust: de spelerslijst houdt zijn compacte `.cs-*`-lijst (HUD, geen menulijst) en de gastlaag houdt inline captionposities omdat de percentages per frame meebewegen |
| 7 | Messages longer than the 14-word card budget: the Meedoen? card counts 17 words with a mission name, the handover offer 19 (counted with `hudtext.js` `wordCount` on example names) | `coopmeedoen.js` `uitnodigingTekst`, `coophostwissel.js` `bodTekst` | `WORD_BUDGET.cardBody` 14 | **Opgelost (#636):** beide teksten zijn ingekort en `coopui_test` bewaakt `wordCount ≤ WORD_BUDGET.cardBody` |
| 8 | The players list has no way on touch and none in a vehicle on a controller (R3 means Tab on foot, but look back in a vehicle). The code comment says "left in the screen" while the CSS puts it top centre | `controls.js` `PAD_MAPS`, `coopspelersui.js` | every action has a way on every device | **Opgelost (#636):** een 44px-knop `Spelers` op de HUD (aanraking) en `PAD_COOP` zet `rs` in voertuigen op Tab; de lijst staat boven in het scherm en de comment is bijgewerkt |
| 10 | Two focus rings: cream 2 px in menus, green 2 px with a controller (`!important`). Both visible, but the player sees two styles | `menu.css`, `a11y.css` | one visible focus | opgelost (#809): één crème 2px-ring voor toetsenbord en controller; de offset per component blijft |
| 11 | The in-world TV overlay (turning the Kiekdoar TV on or off) carries its own inline `<style>` with 17 px Arial and its own hexes; the Spullen screen itself is the shared `.gm` panel in `spullen.js` (no 3D preview), so only this HUD overlay is outside the set | `furniture.js:572` | one surface, one button set | deels opgelost (#803): de kleuren komen uit eigen `--fm-*`-tokens in de overlay (bewaakt door `hud_kleuren_test`); de typografie blijft een bewuste HUD-uitzondering, geen menuvlak; die uitzondering staat in DESIGN_SYSTEM.md (#803) |

## Where equality of players is only partly true in the UI

| What | Why it is that way | Status |
|---|---|---|
| The roles are not tied to a seat: everybody plays their own local lead, others see an online avatar (#455) | the story has two leads | by design |
| ~~A story choice is made by the one who opened the game; guests read "X kiest:"~~ **Opgelost (#686):** een keuze is een stemming van de groep. De gast leest "Jullie kiezen samen" en stemt met zijn cijfertoets; de host telt (`coopgroep.js` `stemKeuze`): meerderheid wint, gelijkspel beslist de stem van de opener, wie niet antwoordt telt niet mee, en zonder stemmen valt de keuze terug op de standaardkeuze van de ronde. Berichten `stem`/`stemantwoord`/`stemuitslag` met `opties` en `keuze` (zelfde JSON, PROTO/CODEC_VERSION blijven 2). Test: `scripts/coop/groep_test.mjs`, `scripts/coopchoice_test.mjs` | the world and story belong to that game; handover lets another take the world | **Opgelost (#686)** |
| "Eruit zetten" and the lobby buttons "Iedereen stoppen", "Maximaal N spelers" are the opener's | the one thing the opener may do that others may not is remove players | by design |
| When the opener opens the pause menu, the map or a shop the world stands still for the guests too (`coopnet.js`, the guest's figure stays put); since 24-10 no notice says so. A guest's own menu stops only that guest's figure | pausing should be only for yourself, the world is one simulation | **Opgelost (#434/#687):** achter pauzemenu, kaart en winkel loopt de wereld van de opener door; alleen zijn eigen invoer staat stil (`coopWereldDoorloop`, `main.js`). Een film die iedereen ziet en het wachtscherm pauzeren nog hard. Test: `coop/groep_test.mjs`; docs bijgewerkt |
| A guest knows only its own ping, the opener everyone's | the connection is a star | open (#377) |
| Reizen (fast travel) is off for a guest, a waypoint works | travel would move the world's time and traffic | by design, with a stated reason |

## Text and structure of the docs themselves

- ARCHITECTURE.md "Menus" still lists the pause menu's old rail (Overzicht, Te doen, Kaart, Telefoon / Verhaal, Spullen, Garage, Prestaties / Instellingen, Besturing, Cheats). The code today has three groups:
  Spel, Verhaal, Loopbanen, Activiteiten / Kaart, Spullen, Garage, Prestaties, Foto's / Instellingen, Cheats (`RAIL_GROUPS` in `pausemenu.js`), with Besturing under Instellingen and Overzicht inside Spel. docs.
- The old DESIGN_SYSTEM.md said in its HUD paragraph that the keycap is `#f0ede4` on `#9c998f`; the code is `#fbfaf5` on `#a9a69b` (`hud_panel.css`, `a11y.css`), as its own Chrome section already said. Fixed in this version.
- The old "bring mapview.js into line" note is done: `mapview.js` takes its colours from `INK` in `mapstyle.js`, no `#e8c93a` or `#cfcfcf` is left in its style block.
- `docs/ONTWIKKELEN.md` says LB/RB are "previous and next section" and LT/RT zoom the map (or change tab) in menus; the menu table in `controls.js` sends Q/E on the bumpers and `[` `]` on the triggers, which switch tabs first. docs.

## What this page could not check

- No screen was run for this page. Sizes, colours and texts come from the CSS and the strings; whether they look right at 720p, 1080p, 4K, on a Steam Deck or on a phone is not checked here.
- The 12 px floor for the Deck is the rule from the changelog (#64, "nog niet in beeld bekeken en niet op een echte Deck"); no real Deck was used.
- The colour-blind palettes were checked by the distance and contrast tests (`scripts/a11y_test.mjs`), not by a person with colour blindness.
- Sound: the rules are read from `sfx/menunav.js` and `sfx/ui.js`; no one listened.
- Samen spelen: no real session over the internet was joined for this page (see the notes in [COOP-OVERDRAGEN.md](COOP-OVERDRAGEN.md)).


## Schermmigratie designsysteem v2, fase 2 (#980): stand na Winkel, Beleidswinkel en Garage

Gemigreerd in deze ronde: de winkel (`shopui.js`, `shopui.css`, `shopbon.js`), de Beleidswinkel (`beleidswinkel.js`) en de Garage (`garageui.js`, `garagetoestand.js`). `game/index.html` laadt nu `ds-tokens.css` en `ds-components.css`; `a11y.css` heeft één focusring voor papieren kaarten (inkt in plaats van crème). Beeldbewijs staat in `docs/img/qa/` en in het issue.

Wat nog niet gemigreerd is (blijft schuld, een regel weghalen zodra het klaar is):

| Wat | Waar | Waarom nog niet |
|---|---|---|
| De lijst links in de winkel en de garage zijn nog `.m-li`-rijen met eigen focus en selectiestijl, geen `.ds-rij` | `shopui.js` `rowHtml`, `garageui.js` `row` | de rijen delen toetsenbord-, controller- en scrollgedrag met het pauzemenu; alleen de statuschip is `ds-chip` geworden |
| De winkelkop, de tabbladen en de voetregel met toetsen zijn nog het glazen menu (`.m-head`, `.m-tab`, `.m-kc`) | `shopui.js` | glas voor navigatie is bedoeld; tabs naar `.ds-tab` vraagt een besluit over het actieve tabblad |
| De winkelstages (3D-voorbeeld, kraslot) zijn geen `.ds-hero` met een eigen kader | `shopui.css` `.sm-stage` | de renderer en het kraslot-canvas hebben een vaste plek; alleen de garage heeft nu een omlijnde hero |
| Terugverdientijd ("verdiend in 6 dagen") op de gele knop ontbreekt | `shopbon.js` | het spel heeft geen inkomstenmodel per artikel; zonder echte cijfers tonen we niets |
| De gele knop en de bevestiging staan in de garage onder de feiten: bij een kort paneel moet je scrollen om ze te zien (de vraag scrolt zelf in beeld) | `garageui.js` | het paneel is 440 px hoog op 900p; een compactere kaart of een tweede kolom vraagt een besluit |
| Reparatiekosten en brandstof in de garage ontbreken als chip of kaart | `garageui.js` | de reparatie loopt via de werkplaatswinkel, niet via de garage; de chips tonen alleen schade en banden |
| Kleine tekst in de bonregels van de winkel volgt `--ds-t-*`, maar de lijst links houdt de oude maten van `menu.css` | `shopui.css` | menu-brede maten, niet per scherm te wijzigen |
| `scripts/hud_kleuren_test.mjs` faalt al vóór deze ronde op `reisrit3d.js` (niet als surface geauditeerd) | `scripts/hud_kleuren_test.mjs` | buiten het domein; hoort bij de eigenaar van dat bestand |
| Niet met een controller of op touch bekeken in het spel | alle drie | alleen muis en synthetische toetsen in Electron (1600x900) gezien; 720p en 4K niet; de focusring met `pad-active` is bedoeld maar niet gezien |


## Schermmigratie designsysteem v2, fase 3 (#980): stand na Te doen, Loopbanen, Verhaal en Veroverd

Gemigreerd in deze ronde: Te doen/Activiteiten (`todoui.js`, `todotijd.js`, de kop en de Begin-hier-kaarten), Loopbanen (`loopbaanui.js`: lege hero en de ladder als papieren trap), Verhaal (`verhaalui.js`: personagekaart als hero, aanwijzingen zonder muur van lege blokken; `todoui.js` voor Opdrachten) en Veroverd (`veroverdpanel.js`: twee tabbladen, taakkaarten als papier). De Beleidswinkel is bereikbaar op een eigen tabblad (Q en E wisselen). Voor-en-nabeelden op 1280x720 en 1920x1080 staan in `docs/img/qa/ds3-*` en in het issue.

Wat nog niet gemigreerd is (een regel weghalen zodra het klaar is):

| Wat | Waar | Waarom nog niet |
|---|---|---|
| De lijst in Te doen en in Verhaal > Opdrachten zijn nog `.m-li`-rijen (alleen de statuschip is `ds-chip`), geen `.ds-rij` of aanbod-kaarten | `todoui.js` `row`, `stepRow` | de rijen delen toetsenbord-, controller- en scrolgedrag met het pauzemenu, en elke soort telt tientallen rijen; alleen de drie dichtstbijzijnde (Begin hier) zijn kaarten |
| Een tijdstreepje bestaat alleen voor het evenement van vandaag; andere dingen (kermis, nachtdienst) hebben geen eindtijd in de brondata | `todo.js` `evenementItem` | geen brondata; zonder echte tijd tonen we geen streep |
| "Kan nu" volgt `status === 'nu'` uit todo.js; een controle op saldo, voertuig of afstand ("Te ver") zit er niet in | `todoui.js` `beginCard` | todo.js kent die voorwaarden niet per rij |
| Het detail rechts in Te doen is nog het glazen `m-pane`: kpi-blokjes (`td-kpi`) en `pm-pane-top`, geen papieren kaart met een kaartfragment als hero | `todoui.js` `detailHtml` | een kaartfragment per plek vraagt `placeshot.js`-werk buiten dit domein |
| Loopbanen: de lijst links (`lb-li`) en de bezigheden zijn nog glas; het sfeervlak en het koppelstuk met de hero (`lb-hero-sfeer`) blijven zoals ze waren | `loopbaanui.js` | de sfeerband (`carrieresfeer.js`) is een eigen onderdeel met een eigen test |
| Verhaal: Opdrachten (hoofdstukken, `td-chapter`) en Personages-lijst zijn nog glas; de aanwijzingen zijn tekstregels, geen `.ds-kaart` per aanwijzing | `todoui.js` `storyHtml`, `verhaalui.js` | het hoofdstukkenmodel (#912) en de personagetegels (#608) zijn recent en hebben eigen tests |
| Veroverd: de gebiedenlijst en het gebiedsdetail (`gebiedenui.js`) zijn nog glas met eigen `gb-*`-CSS; de hero (`pm-hero`) en de stats zijn nog de oude gedeelde opmaak | `gebiedenui.js`, `veroverdpanel.js` | `gebiedenui.js` is niet in dit domein |
| Niet met een controller of op touch bekeken in het spel; 4K niet; "Beweging beperken" niet | alle vier | alleen muis en synthetische toetsen in Electron (1280x720 en een venster van 1904x993) gezien |


## Schermmigratie designsysteem v2, fase 4 (#980): stand na Prestaties, Foto's, de kaartuitleg en de hub van Samen spelen

Besluiten van de eigenaar op 20-11 die hierin verwerkt zijn: de selectiekleur is bordgroen (niet blauw; `DESIGN_SYSTEM.md`, bewaakt door `ds_tokens_test`) en er is **één gele hoofdknop per scherm**. Daarom zijn de "Zet als doel"-knoppen in de Begin-hier-kaarten en in "Waar je nu bent" van Te doen omlijnd (de gele knop staat in het detail), de oplossing in de winkelcallout is omlijnd naast de gele koopknop, en de beeldscripts (`ds_schermen*_beeld.page.js`) tellen per beeld de zichtbare gele knoppen (`geel` in het resultaat). Controle van de andere gemigreerde schermen met `geel` in de beeldscripts (1280x720): in de winkel (zes beelden), Te doen, Loopbanen, Verhaal (drie tabs), Veroverd (taken en het tabblad Beleidswinkel apart) en in Prestaties, Foto's en de kaartuitleg staat per beeld hooguit één gele knop (Veroverd: de eerste taakkaart geel, de rest omlijnd). Garage en Beleidswinkel zijn niet schoon geteld: `ds_schermen_beeld.page.js` isoleert panelen (`isoleer`) waardoor het beleidspaneel in het garagebeeld blijft staan; uit de code volgt één gele knop per garage-item (Kopen of Laten afleveren, de rest omlijnd) en één per beleidsregel-lijst (de eerste koopbare).

Gemigreerd in deze ronde: Prestaties (`achievementsui.js`: kop en categorietegels als papieren kaart met chip en streep; de lege detailkolom heeft één gele knop), Foto's (`fotomodusui.js`: hero, galerijkaarten, lege staat, voetstrook), de eenmalige uitleg van de Kaart (`kaartactieui.js`) en de hub "Waar speel je" van Samen spelen (`samenhubui.js`). Beelden op 1280x720 en 1920x1080 staan in `docs/img/qa/ds4-*`.

| Wat | Waar | Waarom nog niet |
|---|---|---|
| De rijen binnen een opgeklapte categorie, "Bijna binnen" en "Behaald" zijn nog `.m-li`-rijen op glas; de losse blokken Gebieden, Cijfers, Medailles en Records zijn nog vouwen met `pa-grid` | `achievementsui.js` `row`, `extras` | de rijen delen toetsenbord- en scrolgedrag met het pauzemenu; een prestatiedetail als papieren kaart vraagt een besluit over de lege kolom |
| De kaartkaart bij een geklikte plek (`mv-acties`, `mv-keuze`, "Reis nu", "Sluiten") gebruikt nog de glazen set en `mapview-btn`; de plek heeft geen kaartfragment als hero | `kaartactieui.js` `actiesHtml`/`reisHtml`, `mapview.js` regel 2326 en 2354 | `mapview.js` tekent de kaart in een eigen laag met eigen toetsen en focus; de plekkaart is niet in beeld gezien in deze ronde |
| De lobby, de wachtkamer, de sessielijst en de spelerslijst van Samen spelen zijn nog glas met `.coop-*`-opmaak en `m-bp`/`m-bg`-knoppen; alleen de hub (stap 1 tot 3) is papier | `lobbyui.js`, `coopspelersui.js`, `samenhubui.js` stap 2 en 3 (`pm-hub-rijen`) | de lobby deelt zijn knoppen met `coopoverlay.js` en de testbank (`coop-btn`-selectors); een tweede-instantie-test is nodig voor elke wijziging |
| De drie "Kan nu"-chips in de hub zijn alle drie geel (`ds-chip--primair`): het zijn chips, geen knoppen, maar op één scherm leest dat als veel geel | `samenhubui.js` `kanChip` | de chiprol "Kan nu" is het ontwerp; een besluit of de hub er één chip van maakt (alleen "Aanbevolen") is aan de eigenaar |
| Niet met een controller of op touch bekeken in het spel; 4K niet | alle vier | alleen muis en synthetische toetsen in Electron (1280x720 en 1920x1080) gezien |


## Overzicht voor het nieuwe designsysteem: wat gemigreerd is, wat niet, en wat elk scherm gebruikt (20-11)

Bedoeld voor wie een nieuw designsysteem over deze schermen legt (de eigenaar laat dat in een andere chat ontwerpen). Stand: er zijn geen nieuwe migraties meer gestart na deze tabel; alleen bugfixes (focus, raakdoelen, leesbaarheid) gaan door. Alle schermen die hieronder "gemigreerd" heten, lezen hun kleuren, maten en lettertypen uit `game/js/ds-tokens.css` (rollen: `--ds-bg`, `--ds-tx`, `--ds-rand`, `--ds-primair*` = de ene gele knop, `--ds-selectie*` = bordgroen, `--ds-probleem*`, `--ds-succes*`, `--ds-waarschuwing*`, `--ds-kop-bg`/`--ds-kop-tx` = de bordgroene kopband; maten `--ds-s-*`, `--ds-t-*`, `--ds-r*`, `--ds-lijn*`, `--ds-doel-aanraken`) en gebruiken de componenten uit `game/js/ds-components.css`. Oppervlak: papier (`.ds-papier`) voor kaarten, glas (`.ds-glas`) voor wat op het donkere menu blijft staan (omlijnde knoppen, lege staten, voetstroken).

| Scherm (bestand) | Gemigreerd | Componenten en tokens (aantal gebruiken in de bron) | Nog oud (glas, `.m-*`) |
|---|---|---|---|
| Winkel (`shopui.js`, `shopui.css`, `shopbon.js`) | ja (fase 2) | `ds-kaart` (bon), `ds-knop` (koop, oplossing omlijnd), `ds-cijfer`, `ds-chip`, `ds-callout`, `ds-leeg`, `ds-icoon`, `ds-badge` | lijst links (`.m-li`), kop en tabs (`.m-head`, `.m-tab`), 3D-stage |
| Beleidswinkel (`beleidswinkel.js`) | ja (fase 2) | `ds-kaart--kop` per beleid, `ds-chip`, `ds-callout`, `ds-knop`, `--ds-selectie`, `--ds-probleem` | de lijst als tab onder Veroverd |
| Garage (`garageui.js`, `garagetoestand.js`) | ja (fase 2) | `ds-kaart`, `ds-knop` (Kopen of Laten afleveren geel; Verkopen en Waar staat hij omlijnd of `--gevaar`), `ds-streep`, `ds-cijfer`, `ds-callout`, `ds-leeg`, `ds-chip` | lijst links (`.m-li`) |
| Te doen / Activiteiten (`todoui.js`, `todotijd.js`) | ja (fase 3) | `ds-kaart` (Begin hier, omlijnde knoppen), `ds-chip`, `ds-streep--tijd`, `ds-knop` (de gele staat in het detail), `ds-leeg`, `ds-badge`, `--ds-selectie` | lijsten (`.m-li`), detailkolom (`m-pane`, `td-kpi`) |
| Loopbanen (`loopbaanui.js`) | ja (fase 3) | `ds-kaart` (ladder als papieren trap), `ds-chip`, `ds-streep`, `ds-knop`, `--ds-selectie` | lijst links, bezigheden, sfeerband (`carrieresfeer.js`) |
| Verhaal (`verhaalui.js`, `todoui.js` Opdrachten) | ja (fase 3) | `ds-kaart` (personagekaart), `ds-chip`, `ds-leeg`, `ds-knop`, `ds-kop-*` | hoofdstukken en personagelijst, aanwijzingen als tekst |
| Veroverd (`veroverdpanel.js`) | ja (fase 3) | `ds-kaart`, `ds-streep`, `ds-chip`, `ds-tabs`/`ds-tab`, `ds-knop` (eerste taak geel) | gebiedenlijst en gebiedsdetail (`gebiedenui.js`) |
| Prestaties (`achievementsui.js`) | ja (fase 4) | `ds-kaart--kop` (kop), `ds-kaart` (categorietegel), `ds-streep`, `ds-cijfer`, `ds-chip` (Bijna binnen, Alles gehaald), `ds-knop` (Bekijk in de lijst), `--ds-selectie` | rijen in een categorie en in Bijna binnen en Behaald (`.m-li`), Gebieden, Cijfers, Medailles, Records (vouwen) |
| Foto's (`fotomodusui.js`) | ja (fase 4) | `ds-kaart--kop` (kop), `ds-kaart` (foto), `ds-leeg`, `ds-chip`, `ds-knop` (Fotomodus starten of Nog een foto maken geel, Weghalen omlijnd), `--ds-selectie` | de voetstrook met toetsen is glas (`ds-glas`) |
| Kaart (`kaartactieui.js`, `mapview.js`) | alleen de eenmalige uitleg (fase 4) | `ds-kaart--kop`, `ds-knop` (Begrepen geel), `ds-kop-*`, `ds-focus` | de kaartkaart bij een plek (`mv-acties`, `mv-keuze`, `mapview-btn`), de legenda, lagen, de zoekbalk en de kaart zelf |
| Samen spelen (`samenhubui.js`, rest `lobbyui.js`, `coopspelersui.js`) | alleen de hub, stap Waar speel je (fase 4) | `ds-kaart--kop`, `ds-kaart--klik` en `--uit` (keuzekaarten), `ds-chip--primair` (Kan nu), `ds-knop` (geel of omlijnd) | stap Met wie en Start, lobby, wachtkamer, sessielijst, spelerslijst (`.coop-*`, `m-bp`, `m-bg`) |
| Spel (Overzicht, Opslaan & stoppen), Instellingen, Spullen, Besturing, Cheats, HUD, minikaart, prompts, minigames | nee | zijn glas met `.m-*`/`.hud-*`; `ds-tokens.css` staat er wel op de pagina | alles |

Waar het nieuwe systeem op kan aansluiten zonder schermen te herschrijven: (1) de rollen in `ds-tokens.css` zijn de enige plek voor kleur, een nieuw systeem vervangt daar waarden of voegt rollen toe (`ds_tokens_test` bewaakt contrast en dat `--ds-selectie` groen blijft); (2) de componenten zijn klassen met een vaste naam (`ds-kaart`, `ds-knop`, `ds-chip`, `ds-streep`, `ds-cijfer`, `ds-callout`, `ds-leeg`, `ds-tabs`, `ds-hero`, `ds-rij`), de schermen noemen alleen die klassen en hun modifiers; (3) alle schermen volgen "één gele hoofdknop per scherm, de rest omlijnd", gemeten door het `geel`-veld van de beeldscripts (`scripts/qa/ds_schermen*_beeld.page.js`); (4) geen scherm schrijft een eigen kleur: de uitzonderingen zijn de glazen resten uit de laatste kolom, die nog `--line`, `--ink`, `--g` en vaste `rgba()`-waarden van `menu.css` gebruiken.
