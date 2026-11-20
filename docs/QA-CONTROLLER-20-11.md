# QA-controller van de schermen, 20-11

Een meetronde zonder menselijk oog en zonder echte controller (#985, besluit "Controller soepel"): een nagebootste gamepad
(`navigator.getGamepads`) drukt knoppen en kantelt sticks in Electron, het spel leest hem via `gamepad.js` zoals een echte.
Per scherm is gemeten wat een speler zonder muis zou merken. Niemand heeft de schermen met een echte controller of met het oog beoordeeld.

## Wat het script doet

`node scripts/qa/controller_sweep.mjs [--familie=xbox|ps|switch] [--formaat=1280x720] [--schermen=kaart,garage] [--subs=0]`
(start een Electron met een wegwerpprofiel, zelfde variabelen als de schermen-sweep: `GDE_GAME_DIR`, `ELECTRON_EXE`, `GDE_ELECTRON_FLAGS`, `GDE_PROFILE_DIR`).
`--samenvatting=<controller-xbox.json>` drukt een tabel. De beoordeling per scherm staat puur in `scripts/qa/controller_sweep_logic.mjs`.

Per scherm (en per onderdeel/subtab van het pauzemenu, tenzij `--subs=0`):

- **startfocus**: waar staat de focus direct na het openen.
- **bereik**: D-pad omlaag, rechts, omhoog en links tot de focus terugkomt; daarna probeert het script elk niet-bereikt klikdoel vanaf de drie dichtstbijzijnde bereikte knoppen in alle vier de richtingen. Wat dan nog ontbreekt is "onbereikbaar". De hintknoppen onderin (`.m-hint`) tellen niet mee: ze dupliceren de knop zelf.
- **A** klikt de gefocuste knop (de klik wordt afgevangen, dus er wordt niets gekocht of gewist), **B** sluit of gaat een niveau terug.
- **bumpers/triggers** (LB/RB en LT/RT) wisselen van onderdeel of sectie; **rechterstick** scrolt de lijst met focus.
- **hints**: staat er na een controllerknop nog een toetsenbord-keycap (`kbd`, `.hud-key`, `[data-gk]` zonder `is-pad`/`pad-none`) of een tekst als "druk op" en "klik op"?
- **focusval en dubbele ring**: valt de focus op `body` tijdens het lopen, en is er naast het gefocuste element nog een tweede element met een focusring.
- Los: **kaartbediening** (zoomen met de triggers, pannen met de stick, A op het kruis, de kaartkaart, L3), **tekstveld** (A opent het schermtoetsenbord) en de **winkel**.

De borging zonder Electron staat in `scripts/controller_nav_test.mjs` (focusvolgorde met `spatialNext`, de menu-indeling, de schermenlijst van de sweep, de kaartnavigatie).

## Meetresultaat (Xbox-indeling, 1280x720, 14 schermen met 42 onderdelen en de winkel)

0 console-fouten. In elk gemeten scherm: er is een startfocus, A klikt, B gaat terug of sluit, de bumpers wisselen van onderdeel, de rechterstick scrolt waar een lijst scrolt,
geen enkele toetsenbordhint blijft staan als de controller de laatste invoer was, geen focusval in het pauzemenu en geen dubbele focusring.
Na de fix hieronder zijn alle klikdoelen met de D-pad (en op de kaart met L3) te bereiken op:
pauze Spel (alle vier de onderdelen), Spel-rail Acties, Samen spelen-hub, Te doen (62 van 62), Kaart (5 van 5 met L3), Verhaal/telefoon (alle vier), Loopbaan, Veroverd.

| Bevinding | Waar | Stand |
| --- | --- | --- |
| Op het kaartdoek panen de pijlen, dus zoeken, Lagen, zoomknoppen, Naar jezelf en de kaartkaart (Zet waypoint, Reis erheen, Info, Sluiten) waren niet te bereiken: na A op het kruis kon alleen de eerste kaartknop worden bevestigd. | `pausemenu.js` (`onKey`), kaartlaag van `mapview.js` | **Gefixt**: `padmapnav.js`. L3 gaat van het doek naar de kaartknoppen en terug, met focus op een kaartknop loopt de D-pad er doorheen; omhoog of links voorbij de eerste knop geeft het doek terug aan de D-pad. Alleen voor invoer van het pad (`e.__gde === 'pad'`). |
| De kaartknoppen hadden geen hint voor L3. | `mapview.js` (`.m-hint` onderin) | Open: `mapview.js` is van een andere agent; de regel "L3 knoppen" moet erbij zodra het ontwerp vrij is. |
| Garage, tab Alles: bij de lange lijst (81 klikdoelen) werden in 3 van 4 runs 8 of 9 kaarten (Te koop, Op slot) niet bereikt | `garageui.js`, lijst `.gar-list` | **Meetartefact, geen spelbug (20-11)**: `scripts/qa/garage_pad_probe.mjs` bouwt per kaart de graaf van wat de D-pad doet en loopt hem met echte D-pad-druk door vanaf de startfocus: alle 56 kaarten (en 81 klikdoelen) zijn bereikt, ook die in de linkerkolom onderaan (via links vanuit de rechterkolom). De sweep probeerde per ronde maar 14 onbereikte doelen vanaf de drie dichtstbijzijnde buren, en de tabknoppen (Scooters, Boten, Lucht) gebruikten dat budget op; de sweep klikt nu eerst de tab Alles en geeft de Garage een budget van 70 (`controller_sweep.page.js`): 81 van 81. Wat blijft: de eerste D-pad omlaag vanaf de tab gaat via het 3D-model en Laten afleveren naar de rechterkolom, dus de linkerkolom bereik je met links; niet in beeld bekeken. |
| `button.ra "Spel"` (eerste railknop) leek buiten de eigen sectie onbereikbaar | rail `.pm-game` | Meetartefact: een aparte railtest (omhoog/omlaag vanaf de huidige sectie) bereikt alle 13 secties; de rail loopt rond. |
| Zoekvelden in Spullen en Besturing worden met de D-pad overgeslagen | `pausemenu.js` (`visibleFocusables`: "a controller can't type") | Bewust: de pijlen verlaten een tekstveld niet. De filterchips (Spullen) en de groepen doen hetzelfde werk; zoeken in die lijsten kan alleen met toetsenbord. |
| Winkel: de knop "Kopen voor €…" in het detailvlak wordt niet met de D-pad bereikt | `shopui.js` | Bewust: A op een rij koopt ("A om te kopen"). |
| Op de kaart en in Besturing/Instellingen noemen teksten nog een klik of toets ("Klik op een plek...", "Shift + klik op de kaart") | `mapview.js`, `pausemenu.js` | Laag: de tekst is op toetsenbord en muis geschreven; de hints onderin tonen wel de controllerknop. |

## Wat niet kan of niet is gezien

- **Dialogen met een personage** en de **regelkaarten en wachtstappen van missies**: geen vaste ingang zonder NPC of missiestand; niet met de emulatie gemeten. De indeling die ze erven (`PAD_MAPS.minigame`: D-pad is 1 tot 4, A/B als bevestigen en terug; `coopvraag`: A is ja, B is nee) is door `padscreens_test` en `pad_input_audit` gedekt, niet in beeld bekeken.
- **Activiteiten en minigames**: alleen de indelingen (`PAD_MAPS`, `GAME_PAD_CTX`) en de toetsdekking zijn getest (`pad_input_audit`: 43 toetsen, allemaal een knop of een reden). Geen enkele minigame is met de emulatie doorgespeeld.
- **Echte controllers**: de emulatie volgt de W3C-standaardmapping. Xbox, PlayStation en Switch zijn alleen op `data-pad` en de glyphs (`is-pad`) in het pauzemenu en op de kaart gemeten; trillen, hot-plug, twee controllers (Samen spelen) en de Steam Deck zijn niet gezien. Een controller zonder standaardmapping valt niet onder deze meting.
- **Het schermtoetsenbord**: A op de zoekbalk van de kaart opent het (`.pk-val`); het naam-veld (Hernoemen in de opslaglijst) is niet bereikt, want de opslaglijst had geen tekstveld zonder bestaand spel. Het typen zelf is door `padkeys_test` gedekt.
- **Het startscherm**, Samen spelen met een tweede speler en de Spel-rail op andere venstergroottes (800x360, 21:9): niet gemeten.

## Focusvolgorde per scherm (voor het designsysteem)

De regels staan niet per scherm in de code maar in drie lagen. Een nieuwe indeling moet ze behouden of vervangen, anders breekt de controller.

**Laag 1, `gamepad.js` en `controls.js` (`PAD_MAPS.menu`).** A is Enter, B en Start zijn Escape, X is Delete, Y is Spatie, LB/RB zijn Q/E,
LT/RT zijn `[`/`]`, View is M, L3 is Tab, de D-pad en de linkerstick (één richting tegelijk, `stick: 'nav'`) zijn de pijlen met herhaling na 380 ms.
Alle toetsen gaan als `KeyboardEvent` naar `document.activeElement` met `ev.__gde = 'pad'`. De rechterstick scrolt de dichtstbijzijnde scrolcontainer van het gefocuste element.
Een dialoog zonder eigen toetsenafhandeling werkt via `menuFallback`: de pijlen lopen met `spatialNext` (padlogic.js) langs `FOCUSABLE = button:not([disabled]), [href], input:not([disabled]), select, [tabindex]:not([tabindex="-1"])`
binnen het dichtstbijzijnde `[role="dialog"]`, A klikt `button, a, [role=button], [role=tab], [role=radio], summary, input[type=checkbox]`. De sweep en `schermen_sweep_test` houden `FOCUSABLE` gelijk aan die van `gamepad.js`.

**Laag 2, pauzemenu (`pausemenu.js`: `onKey`, `moveFocus`, `focusSheet`).** Drie vlakken met eigen volgorde:

| Vlak | Selector | Volgorde |
| --- | --- | --- |
| Rail | `.pm-game` (`.pm-rail-group`, knoppen `button.ra`) | omhoog/omlaag door de secties; rechts gaat naar het blad (`focusSheet`: laatst gefocust element van de sectie, anders het geselecteerde `[role="tab"][aria-selected="true"]`, anders de eerste focusbare, zonder zoekveld) |
| Bladkop | `.pm-sheet-head` (tabs `button.m-tab`, `[role="tab"][data-subtab]`) | linkse en rechtse pijlen langs de tabs wisselen ook van onderdeel (`showSubtab`) |
| Blad | `[data-panel="<sectie>"]` | dichtstbijzijnde in de richting (zelfde kolom wint van een schuine buur); links van de rand gaat naar de huidige railknop (`[aria-current="true"]`); omlaag voorbij het einde scrolt de lijst |

LB/RB (Q/E) en LT/RT (`[` `]`) doen: zichtbare tabrij (binnenste rij eerst, bijvoorbeeld Spel > Samen spelen), dan de eigen tabs van de sectie, dan de vorige of volgende sectie.
Een open vraag (`visibleQuestion`, #915) houdt de pijlen binnen de vraag. Schuifregelaars (`input[type=range]`) stappen met links/rechts, keuzeknoppen `.m-pk` met links/rechts, `select` met de eigen pijlen.

Startfocus per sectie (gemeten): Spel: `button.m-bp` Doorgaan; Opslaan & stoppen: `button.m-tab.pm-ingame`; Samen spelen: `button.m-tab`;
Te doen: `button.td-card-main` (de eerste kaart; A op een kaart zet meteen het doel, de knoppen in het detail zijn er niet voor nodig);
Prestaties, Instellingen, Verhaal, Besturing: de eerste `button.m-tab`; Spullen: `button.m-chip` (Alles); Garage: `button.m-tab` (Alles), omlaag loopt door `button.m-li.gar-card` naar `canvas.on` (3D-model: links/rechts draait) en `button.ds-knop.gar-go`;
Loopbaan: `button.m-li.lb-li`; Veroverd: `button.ds-tab`; Foto's: `button.ds-knop` Fotomodus starten; winkel (`#shop-menu`): `button.m-li.sm-item` (A koopt, LB/RB wisselen van afdeling).
Te doen heeft per kaart twee focusdoelen (`button.td-card-main` en `button.ds-knop` Kaart) en daaronder de filterchips `button.m-chip`, dan de lijsten (`button.m-li`, `button.m-more`).

**Laag 3, de kaart (`mapview.js` met `padmapnav.js`).** Het doek (`canvas.mapview-canvas`, `tabindex=-1`) heeft de focus bij openen. Linkerstick en D-pad panen,
LT/RT zoomen (`-`/`+`), Y is "Naar jezelf" (Spatie), X wist het waypoint (Delete), A klikt onder het kruis in het midden: de kaartkaart `.mapview-card` opent en de focus gaat naar zijn eerste knop.
L3 (Tab) gaat van het doek naar de kaartknoppen in `.mapview-overlay` (zoekveld, `.mv-layers`, `button.m-bg` zoom en Naar jezelf, de kaartkaart met `button.mv-actie` en `.mapview-btn`) en terug. Met de focus op zo'n knop loopt de D-pad er van knop naar knop;
omhoog of links voorbij de eerste knop geeft de focus aan het doek terug. LB/RB wisselen van onderdeel, View of B sluiten de kaart (B sluit eerst de kaartkaart). Het zoekveld krijgt via A het schermtoetsenbord (`padkeyboard.js`).

**Hints.** `glyphs.js` vervangt elk element met `[data-gk]`, `kbd` of `.hud-key` door de controllerknop van de huidige situatie (`is-pad`, `data-gslot`) en verbergt het als er geen knop is (`pad-none`).
De familie (`html[data-pad]` = `xbox`, `ps` of `switch`; A en B wisselen bij Switch) komt uit het controller-id of de instelling `padLayout`. De knoppenrij onderin het pauzemenu is `PAD_KEYS` in `pausemenu.js`; `padscreens_test` controleert dat elke glyph doet wat hij zegt.
Wie de controls herontwerpt: houd `[data-gk]`/`.hud-key`/`kbd` op elke hint en `.m-hint` voor de voetknoppen, of breng de glyphs zelf mee.

## Voor wie het ontwerp vervangt (checklist)

- Elk klikdoel is een `button`, `a[href]`, `input`, `select` of heeft `tabindex` (niet `-1`): anders ziet de controller het niet (`geenControllerFocus` in de schermen-sweep).
- Houd de drie vlakken (rail, bladkop, blad) en hun selectors; `moveFocus` rekent met schermposities, dus een kolomindeling moet in DOM-volgorde en op het scherm kloppen.
- Een tekstveld heeft `type=text` (of `search`) zodat `padkeyboard.js` het herkent; `visibleFocusables` slaat `type=search` voor het pad over.
- Eén zichtbare focusring, op het gefocuste element zelf (`:focus-visible`); geen tweede element met een eigen ring (de sweep telt dat).
- Draai na elke wijziging `node scripts/controller_nav_test.mjs` en, met Electron, `node scripts/qa/controller_sweep.mjs --subs=0`.
