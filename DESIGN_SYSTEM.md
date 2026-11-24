# GDE Groningen - UI Design System

> **Leeswijzer (Nederlands).** Dit document is technische naslag (het designsysteem; de regels voor wat de speler ziet staan in ui-taal.md); de tekst is daarom Engels (uitzondering in ADR 0017, #692). De regels staan in [ui-taal.md](.specs-fire/standards/ui-taal.md) en `AGENTS.md` wint bij twijfel. Nederlands is de taal van proza en van alles wat de speler ziet of hoort.
>
> **Voor 3D-wereld (gebouwen, vegetatie, voertuigen)** zie [docs/ART-DIRECTION.md](docs/ART-DIRECTION.md).

Small, deliberately simple. Every UI surface in this game (HUD, start screen,
map view, phone notifications, future menus) should read as *one* system:
one hand-pulled summer screen print: cream paper, hard ink, a hard offset shadow,
in a tall condensed poster font. If a screen doesn't match this, it's a bug.

This page holds the overview and the rules. The details live next to it, each read from the code with file names:

| Page | What is in it |
|---|---|
| [docs/DESIGN-COMPONENTEN.md](docs/DESIGN-COMPONENTEN.md) | scale, type sizes and the 12 px floor, spacing, buttons and states, keycaps, HUD zones in numbers, cards and subtitles, dialogs, shops and horeca, minigame boards, sound, boot and load screens |
| [docs/DESIGN-BEDIENING.md](docs/DESIGN-BEDIENING.md) | keyboard, controller and touch, device detection, hints, rebinding, the mouse, accessibility settings and the colour-blind palettes |
| [docs/DESIGN-SAMEN-SPELEN.md](docs/DESIGN-SAMEN-SPELEN.md) | designing for more than one player, the players list, passive mode, Meedoen? J or N, host handover, the wait screens |
| [docs/DESIGN-SCHULD.md](docs/DESIGN-SCHULD.md) | where the code breaks these rules, honest and dated, and what could not be checked |
| [docs/DESIGN-AUDIT-CSS.md](docs/DESIGN-AUDIT-CSS.md) | what the UI CSS actually uses (colours, radii, sizes, spacing, with counts) against this page, #980 |

The tokens and the components are in the chapters "The design system: summer screen print" and "Tokens and components in use" below (files `game/js/ds-tokens.css` and `game/js/ds-components.css`, gallery `game/ds-galerij.html`).

**The principles behind every choice**

1. *One system.* One summer screen print: cream paper, hard ink, a tall condensed font; one keycap, one button set, one icon language.
2. *Show less, say it once.* One thing per HUD zone, one card at a time, one primary button per screen, the picture before the paragraph (attention budget, Menurust).
3. *Never one cue.* Colour always comes with a shape, a pattern, a mark or a word; sound with a caption; a key with the pad glyph.
4. *Every device, same actions.* Keyboard, controller and touch drive the same slots; the hint follows what you used last.
5. *Calm and honest.* Dutch, short, no shouting, no real brands, always summer, a refusal says why, a cooldown says how long.
6. *Everyone is equal.* More than one player is the normal case, not an extra (see "Samen spelen in the design" below).

**This file covers 2D screen-space UI only.** The 3D world (buildings,
vehicles, people, wildlife) follows its own visual language. The Habbo
pixel-art direction has been dropped. New models follow the style of the
Martinitoren model (`game/models/martinitoren.glb`): architectural low-poly,
PBR materials, no outlines, an earthy realistic palette, 1 unit = 1 m. The
shared style brief lives in `docs/3d-model-prompts.md`. The procedural
models still use the older helpers in `game/js/pixelart3d.js` until they are
replaced.

## Color

Use these exact tokens everywhere - never invent a near-miss hex.

| Token | Hex | Use |
|---|---|---|
| `--gron-green` | `#1e9e56` | primary accent - buttons, active states, borders |
| `--gron-green-light` | `#3fc97a` | headings, key labels, glow/hover state |
| `--gd` | `#0f5c30` | pressed/active button shade |
| background base | `#0c140e` → `#17301f` | radial dark-green gradient, never flat black |
| foreground text | `#f2f2f2` / `#f0ede4` | body text on dark chrome |
| warning/danger | `#d93f3f` | health-low, busted, fines - the ONE red allowed |
| wanted stars | `#e8c93a` (unfilled: `rgba(255,255,255,0.25)`) | wanted level only - legacy yellow stays here on purpose, it's a universal genre convention, not branding |

Never use plain black backgrounds, blue accents, or a second unrelated
brand color. Yellow is reserved for the wanted-stars convention above, the
special-day badge in the clock (approved with the AAA HUD) and
for the mission/waypoint marker (the genre's usual marker language)
— everything else is green.

### Loopbaansfeer

Each career has its own pattern, its own icon as a low-contrast watermark and one of four
tonalities (dark, forest, field, milk), not a new accent colour (`game/js/carrieresfeer.js`).
The patterns use large colour fields rather than fine lines, and the names are dry and
satirical like the rest of the game. Red stays the danger colour. The farmer's handkerchief
is therefore gingham in cream and green, with a folded corner as the recognisable motif: a
red version in the UI would read as a warning. The pattern is a thin strip in the career
list and a band above the career detail, never a replacement for the icon or the title.
Visboek and Boerderij hang under Loopbanen and carry the same band (`sfeerBandHtml` and
`SFEER_BAND_CSS` in `game/js/carrieresfeer.js`), with their own sfeer from that one table
(hengelen, landbouw), so every activity screen speaks the same visual language.

Where the tokens live: `--gron-*` and `--hud-*` in `game/js/hud_panel.css` (`:root` of the HUD), the menu's own set on `.gm` in `game/js/menu.css`,
the keycap in `game/js/a11y.css`, the 2D maps in `INK`, `MAP_PALETTE` and `MINI_PALETTE` in `game/js/mapstyle.js`, and the marker roles in `PALETTES` in `game/js/a11y.js`.

| Menu token (`.gm`) | Value | Use |
|---|---|---|
| `--g` / `--g2` / `--gd` | `#3fc97a` / `#1e9e56` / `#0f5c30` | the three greens above |
| `--ink` | `#f0ede4` | text on glass; muted text `--mut` is the same at 68 % |
| `--line` / `--line2` | cream at 8 % / 16 % | hairlines and ghost rings |
| `--red` / `--redtx` | `#d93f3f` / `#f08a8a` | danger fill / danger text on dark |
| card gradient | `linear-gradient(180deg, rgba(23,48,31,.84), rgba(12,20,14,.84))` | HUD card (`--hud-card`), ring `rgba(63,201,122,.28)` |
| panel gradient | `linear-gradient(180deg, rgba(20,40,27,.8), rgba(12,20,14,.88))` | menu panel `.m-panel` |

**Status colours.** The game also draws marker roles that are not brand colours and change per colour-blind mode: ok, danger, mission, active mission, your goal, job (klus), care and police
(`PALETTES`, default `#3fc97a`, `#d93f3f`, `#e8c93a`, `#3fd0ff`, `#c068ff`, `#ff9a3c`, `#ff5fb4`, `#3f6fd9`). Canvas and 3D code read them through `markerColors()`; CSS reads `--mk-*`.
A role colour is never the only cue (see [docs/DESIGN-BEDIENING.md](docs/DESIGN-BEDIENING.md)). Some screens still use extra hexes of their own; they are listed in [docs/DESIGN-SCHULD.md](docs/DESIGN-SCHULD.md) and a new screen must not add to them.
Text on dark chrome keeps 4.5:1 (3:1 for large text and icons); `a11ylogic.js` measures it.

## Typography

- Font stack: `'Bebas Neue', 'Arial Narrow', Arial, sans-serif` everywhere.
  Bebas Neue is a free Google Font - tall, condensed, all-caps-leaning -
  that gives the HUD and posters a bold, condensed look without imitating
  any existing game's typeface. Loaded once via a
  `<link>` in `game/index.html`'s `<head>` (Google Fonts, no build step);
  every other file just references the family name and gets it for free
  via the cascade or by repeating the same font-family string. `Arial
  Narrow` stays in the stack as the immediate fallback (same tall/
  condensed character) if the webfont hasn't loaded yet.
- Headings / wordmarks: bold, `letter-spacing: 1-2px`, uppercase where it's
  a label (KIEKDOAR, station names) not a sentence.
- Body/HUD text: normal weight is fine, keep letter-spacing subtle (0.3px).
- Exception: pedestrian speech bubbles (`scene3d.js`'s `syncSpeechBubbles`)
  deliberately stay on plain `'Arial Narrow', Arial, sans-serif` - short
  conversational chat text at ~13px reads better in a normal-case body
  font than in a display face like Bebas Neue, which is designed for
  short, large, punchy labels, not sentences.
- **Menu running text** is Arial Narrow too (`.gm`, 20 px, line height 1.45); Bebas is for titles, tabs, buttons, numbers and eyebrows. In the menus the scale is
  80 / 64 / 44 px for title, section title and number, 26 for tabs and buttons, 20 body, 18 small (full table in [docs/DESIGN-COMPONENTEN.md](docs/DESIGN-COMPONENTEN.md)).
- **Minimum size: 13 px for any sentence (a keycap badge inside: 12 px)**, on every screen (the Steam Deck's 1280x800 held at arm's length, CHANGELOG #64); menu text 13 px and up (Menurust below).
  Only keycap interiors may be smaller. The HUD grows text with the window and never shrinks it below 13 px divided by `--ui`. Players can add one or two steps
  (`textSize`) and the Deck starts on "groot". A few places are still under 12; see [docs/DESIGN-SCHULD.md](docs/DESIGN-SCHULD.md).

## Logo

The wordmark is HTML/CSS, never an image: `logoHtml()` in `game/js/logo.js`
and `.gde-logo` in `game/index.html` (the static copy on the loading and
title screens must match it). Lockup, top to bottom:

1. **GDE** in Big Shoulders Display Black (900), cream `#f0ede4` fading to
   `--gron-green-light` at the foot, with a soft green glow.
2. **The place** (GRONINGEN) on a place-name-sign plate: white Big Shoulders
   ExtraBold (800) caps on `--gron-green`, rounded corners, an inset white
   border. A sequel only changes this word and the subtitle.
3. **The subtitle** (*Zomer vol misdaad*) in italic bold Arial Narrow,
   `--gron-green-light`.
4. Optional, title screen only: GROOTSTE DIEFSTAL EVER in tiny spaced caps.

Why a green plate and not the blue of a real Dutch plaatsnaambord: blue
would be the only blue in the game (this file rules out blue accents), and
a blue-and-white sign reads as an actual road sign more than as our brand.
The shape (rounded plate, inset white border, condensed caps) already says
"place-name sign"; green and white are the colours of the city of Groningen
and of our UI. Rules: no round heavy display letters, no sunset
gradient, no roman numeral, no small word stacked over a big word in the
same style (see docs/LICENTIES.md §8.2). Big Shoulders Display is for the
logo only; all other UI stays Bebas Neue.

## Beeldstijl (laadschermen, kanaal- en winkelbeelden)

Alle losse beelden buiten het spel (laad- en startscherm, YouTube-kanaal,
Steam) zien eruit als het spel zelf. Eén huisstijl; wie een eigen
illustratiestijl bedenkt, breekt hem (zie #182: een eigen SVG-scène paste niet).

**Basis: echte spelrenders.** Achtergronden zijn schermafbeeldingen van het
spel, 16:9, in `game/img/laad/` (de goedgekeurde set, zie `game/js/loadscene.js`):
vismarkt (dag, de markt), luchtfoto en duif (Grunn van boven), rondvaart
(gracht bij zonsondergang), kermis (nacht, reuzenrad), ringrace (ringweg),
achtervolging (straat bij nacht met politie). Een nieuwe achtergrond is een
render van het spel, geen tekening, en komt in die set.

**Vormtaal.** Low-poly, vlakke facetten, geen omlijning. Gebouwen zijn blokken
met puntdaken en trapgevels; bomen zijn gefacetteerde bollen; mensen en
voertuigen zijn kantig. De Martinitoren is het herkenningspunt. Geen ronde
glanzende iconen, geen cartoon-contouren, geen fotorealisme.

**Palet in beeld** (bij benadering van de renders afgelezen). Baksteenrood `#a8442c` tot `#c9876a`, donkere daken
`#2b2a38`, crème kozijnen en stoepen `#f0ede4`, boomgroen `#3f8f3a`,
grachtwater groenblauw `#2c7790`. Lucht: bleekblauw overdag, oranje bij
zonsondergang (`#e8975a`), nachtblauw `#0d1b2f` met sterren. Chrome eroverheen
blijft het groen en donkergroen van hierboven (`#1e9e56`, `#3fc97a`, `#0c140e`).

**Belichting.** Zachte zon, mist in de verte, warme lantaarns en gele
raamlichten bij nacht, lange schaduwen bij zonsondergang. Altijd zomer: geen
sneeuw, geen kaal winterlicht.

**Beeld en tekst.** Op het laadscherm ligt geen sluier over de render: het
plaatje staat gekanteld in een kader met harde schaduw in een eigen kolom
(`.ls-pic`), naast het logo en het bord "Naar <plaats>", nooit eronder. De
vaste kolomstructuur, de marges en de meting staan in
docs/LAADSCHERM-LAYOUT-22-11.md (`loadscreen.css`, `laadscherm_layout_test`).
Lettertypen: het logo in Big Shoulders Display, rest in Bebas Neue; ondertitel
cursief in Arial Narrow. Alleen Nederlands.

**Logo-gebruik.** Het echte logo is de HTML-lockup (`logoHtml()`, `.gde-logo`),
nooit nagetekend of in een andere letter. Op beelden zonder HTML (YouTube-
avatar, banner) komt het uit de echte opmaak gerenderd
(`scripts/youtube_images.mjs`). Niet doen: een eigen mascotte of toren-icoon
als logo, een gele zon-cirkel, GDE in Bebas Neue, de plaatnaam zonder bord,
een slagzin die niet in het spel staat, echte merken.

**Per missiesoort een achtergrond** (`MISSION_PICTURE` in loadscene.js):
verhaal en winkel vismarkt, rondvaart rondvaart, race ringrace, achtervolging
achtervolging, kermis kermis, duif duif, overzicht luchtfoto.

**Kanaalbeelden:** `docs/youtube/kanaalbeelden/avatar.svg` en `banner.svg`
omlijsten de renders in `docs/youtube/beelden/` (profielfoto: GDE op de
donkergroene radiale achtergrond; banner: luchtbeeld van Grunn met logo,
ondertitel en een label in de veilige zone). Exporteren:
`node scripts/export_kanaalbeelden.mjs --out=<map buiten de repo>`.

## Glass chrome (the older HUD and menu look, still in the code)

- Dark backgrounds are a **radial gradient**, not flat: center `#17301f`
  fading to `#0c140e`. Any full-screen panel (start screen, map view) uses
  this.
- Borders on containers/cards: `1-2px solid`, either `var(--gron-green)`
  or `rgba(63,201,122, 0.35-0.6)` for a softer inline chip.
- Text shadow on anything sitting over the 3D world (HUD labels): 
  `0 1px 3px rgba(0,0,0,0.9), 0 0 1px rgba(0,0,0,0.9)` (the `--hud-shadow`
  token in hud_panel.css) - keeps text legible over any background.
- Glow accents (used sparingly, for emphasis - a title, an active state):
  `text-shadow` or `box-shadow` with `rgba(63,201,122, 0.3-0.4)`.
- Buttons: green fill, dark text (`#0c140e`), bold, `border-radius: 4px`,
  hover state lightens to `--gron-green-light`. That is the older button of the first screens;
  in every menu the button is `.m-bp` / `.m-bg` / `.m-bt` (56 px high, 8 px radius, hover `#62d792`), see "Menus" and the state table in
  [docs/DESIGN-COMPONENTEN.md](docs/DESIGN-COMPONENTEN.md) (focus, selected, hover, disabled, pressed, confirm).
- Focus is always visible: **one** 2 px cream ring (`var(--ink)`) for every input, including a controller (`html.pad-active`; #809). The offset per component may differ, the style does not. Never remove an outline without giving another.
- Keycap chips (on-screen control hints): one white, bright cap
  (`#fbfaf5`, dark text `#0c140e`, a grey `#a9a69b` edge underneath for a
  pressed-key look); the menu's `.m-kc` and the controller glyph `.pad-g` match it - see `.hud-key` in hud_panel.css, this is the canonical
  keycap and every other "press X" hint should reuse that exact class/style
  rather than re-inventing bracket text. A hint is a cap plus one or two words.

## HUD, load screen and boot screen

The AAA HUD, the load screen and the boot screen follow the approved
mockups; the rules (eight zones, one thing per zone, what shows when) are in
ARCHITECTURE.md "HUD zones and rules". Cards are `linear-gradient(180deg,
rgba(23,48,31,.84), rgba(12,20,14,.84))` with a 1 px green ring, 10 px radius;
the minimap is a rounded square (18 px) with a green ring that turns red when
you are wanted; keys at the bottom right are the canonical white keycaps with a hard
`#a9a69b` shadow. Red `#d93f3f` only for danger (search box, vehicle
damage, the age badge).

**Attention budget** (`attention.js`, `hudbus.js`, `hudrules.js`; numbers in [docs/DESIGN-COMPONENTEN.md](docs/DESIGN-COMPONENTEN.md)):
the order of who may interrupt is story, then wanted and danger, then money and achievement, then discovery and flavour, then tips (P0 to P3 on the HUD).
One card at a time in zone A, one objective line, one phone card with a "+N" counter, at most two key hints, at most six elements besides the minimap, and nothing at all that takes a click.
During a chase, fight or race only P0 to P2 show; during a call or a subtitle tips and the radio wait. A new element asks `mayShow()` in `hudbus.js` and is listed in `SURFACES` ([docs/KANALEN.md](docs/KANALEN.md)).
Messages are Dutch sentences of at most 14 words; subtitles at most 18. Subtitles sit at the bottom centre, dim the objective, and a Frisian or Gronings line shows the Dutch under it in italic.
The boot screen is dark green from the first paint and needs no key; the load screen shows a render of where you are going, the story so far and a real progress bar (details in the component page). Both bars name their steps in words instead of sitting at one percentage (#600).

## Menus

The menus (main menu, pause menu and its sections, shop and station machine,
result screen) follow the approved Menu-*.dc.html mockups; the shared parts are
in `game/js/menu.css` (`.gm`, `.m-*`), nothing else defines buttons, rows or
tabs for them. Rules: one dark-green glass surface (`.m-panel`) over a blurred,
darkened backdrop; text navigation on the left (`.ra`, a 4 px green bar marks
the current one); a list left and a detail pane right (`.m-list` + `.m-pane`);
one focal point and one primary button (`.m-bp`, green) per screen, the rest
ghost (`.m-bg`) or quiet text (`.m-bt`); green only for selected or primary,
red (`--red`) only for danger, yellow only for the mission marker and special
days; big Bebas titles; rarely used options folded behind `.m-disc` (`Meer
opties`); two to four outlined keycaps (`.m-kc`) bottom right as the hints;
body text at least 18 px at 1080p, 56 px rows, a visible 2 px cream focus
ring, reduced motion respected. Everything inside a `.gm-stage` is laid out in
the mockups' 1920x1080 px and zoomed by `--mz` (`--ui` / 1.2), so it scales with
"Grootte interface" and works from 1280x720 to 4K.

**Pause menu structure** (`pausemenu.js` `SECTIONS`, `RAIL_GROUPS`, `SUBTABS`; the canonical table is in [.specs-fire/standards/ui-taal.md](.specs-fire/standards/ui-taal.md), "Menu's"). A fixed rail on the left never changes shape; the sheet beside it shows one section. Three groups:
**Spel** (tabs Overzicht, Samen spelen, Opslaan & stoppen), **Verhaal** (Opdrachten, Personages, Aanwijzingen, Veroverd), **Loopbanen** (the vakken with their side jobs), **Activiteiten** (Alles, Dichtbij) /
**Kaart** (full screen, no rail), **Spullen**, **Garage**, **Prestaties**, **Foto's** / **Instellingen** (Beeld, Geluid & ondertitels, Spel, Besturing, Camera, Interface, Hints & uitleg, Toegankelijkheid), **Cheats** (its own place in the rail since #435).
**Visboek** and **Boerderij** hang under Loopbanen and **Besturing** (Toetsenbord en muis, Controller, Toetsenoverzicht, Hulp) under Instellingen; each opens as its own screen and goes back to its parent.
**Over** is not a rail row: it is a row under Instellingen > Interface (#601). The rail rows are 56 px at every window size (the stage is always laid out in 1920x1080 design px, so the rail never shrinks or scrolls on 1280x720 or 1920x1080).
**Samen spelen** is a tab of Spel with its own two tabs, Samen spelen and Spelers; the players list only exists while you play together (#434).
Spel > Overzicht is home: the menu opens there, Esc from another section goes back to it, then closes; from M or the phone Esc closes at once. A section that belongs under another goes back to its parent.
The footer shows two to four hints per section (`HINTS`: keys or controller glyphs, clickable). Before a game has started only Spel, Instellingen and Besturing exist.
**Q** and **E** switch the visible tab row of the section; on a screen with a second row (Spel > Samen spelen) that innermost row wins, and on a screen without any tabs they go to the previous or next section. `[` and `]` (the controller's triggers) do exactly the same. The footer hint names the outcome ("tabblad", "spelers-tab", "onderdeel"), and the Besturing table says the same (#601).
Settings use switches, sliders and previous/value/next pickers; one setting per row with a line of explanation under it, rare options folded behind "Meer opties".
A section has one focal point, at most 125 words (a choice screen) or 270 (a reference screen), pictures before words. In a session the rule is that the menu pauses only the player who opened it
(see "Samen spelen in the design"); the code does not fully do that yet, it is in the debt list.

**Screens since #903–#908** (Samen spelen, Verhaal, Loopbanen, Veroverd, Activiteiten and Spullen) share one opening and one way of counting, defined once in `pausemenu.css` and reused by the section modules: a hero (`.pm-hero`, a dark-green panel with a 4 px green edge, an eyebrow, one Bebas title, a lead of one or two lines and a row of facts), a strip of at most three stats (`.pm-stats` + `.pm-stat`, a Bebas number with a word and a `.m-bar` where a bar helps), and a state as a word in a pill (`.pm-badge`, green for ok, mission yellow for waiting). The hero says where you are or what the screen is for; the stats never repeat a number that is already in the list, and a screen keeps one primary button. Detail panes use the same tokens (`.lb-kpi`, `.gb-kpi`, `.td-dhead`) instead of a second card style. The sections keep the `.m-*` components for their rows, buttons and tabs; only the opening, the counting and the detail header are these shared pieces. `Spullen` adds a category count and a bar per category (`.sp-cat`), and `Verhaal` shows its chapters as one calm list (`td-chapter`): the current chapter open, completed chapters one row with their state, and a chapter that is not available as a quiet locked row, never a button that does nothing.

## Map icons and world markers

One icon language on the big map, the minimap and in the world. Every place is a **badge**: one silhouette per category next to its colour (so colour is never the only cue), a saturated fill with a lighter top and a lighter inner rim, a dark outline with a thin cream line outside it, a soft shadow, and the place's own glyph enlarged to about 60 % of the badge in cream (dark ink on yellow, lime, orange or teal, whichever reaches 3:1). Colours (21 November, one source `kaartkleuren.js`): five roles from the tokens, the shape says the rest. Bordgroen = services and shops (care = circle with a cross, side job = diamond, shop = rounded square with a glyph per type, food = rounded rectangle), red = police station (shield) and speed camera (square), ink blue = transport and water (garage = hexagon, station and halt = rounded rectangle, Ommeland = circle), cream = activity and the rest (circle), landmark = cream circle with a star. Yellow is only for goals and your route and light green only for conquered, so a place disc is never yellow or light green. The rim is cream, the glyph cream or ink, whichever reaches 4.5:1 on the fill, and the dark outline reaches 3:1 (`kaartkleuren_test`). The land follows the glass surface: glass-green meadow, bordgroen parks and forest, the canal-water blue of the palette below, cream roads, paper buildings; lines reach 3:1 against the meadow and label text 4.5:1. You (a glowing green arrow with a cream edge), goals (purple pin), missions (yellow ring), police units and your own places keep their own look so they stand out from the badges. Icons are 21 to 32 px; zoomed out only the important categories show (mapicons.js), the rest fade in over a short zoom range, and where icons collide the higher priority wins. A place has a state: present, discovered (softer) or locked (grey, dimmed; `opts.state`). The legend stays a short list of icon and name; the explanation sits in the tooltip. In the world the marker is a thin light column of fixed height, a ring on the ground and one icon above it (worldmarker3d.js), never a filled screen. `node scripts/ui_shots.mjs --scenes=scripts/ui/kaarticons_scenes.js` makes the icon sheet and the minimap and big map in town, village and Ommeland, day and night.

## Map (`mapview.js`, `kaartactie.js`, `kaartactieui.js`)

The full map is the pause menu's one full-screen section (M opens and closes it). Chrome is the radial dark green with a 2 px green border and Bebas headings, drawn from the `INK` table, not from hexes in the file.

- **Click on a place or an icon** opens a bar with exactly three actions, each with an icon and one line: **Zet waypoint** (a line and the distance), **Reis erheen** (cost and time), **Info**. A waypoint that is already there turns the first one into **Haal weg**;
  a story place says **Volg het verhaal**. **Reis erheen** is only about HOW you travel (21 November): its popup lists train, bus, taxi and boat (and later flight, your own vehicle and a bike) with price, time, "aanbevolen" and, where a mode cannot be used, the reason in the row. There is no "Zelf gaan" option: **Zet waypoint is the one way to go yourself.** All map popups follow "Key in the button" and "Navigation with controller and keyboard" below (docs/KAART-POPUPS-21-11.md). The bar is on the menu set (#602): 56 px rows, 26 px Bebas labels, 18 px explanation, all colours from the tokens. A first-time explanation is shown in the map column under the search field, so it never covers the title, the search field or the zoom buttons, and it stays findable in Besturing > Hulp.
- **One waypoint at a time**: a line on the map, the distance, a beacon in the world (`worldmarker3d.js`). Clear it by clicking it again, right click, `Del`, or X on a controller. A click within 30 m of it counts as a click on it.
- **Travel mode** selector in the header, opening on how you travel now; roads you may not use dim.
- **Legend and layers**: a short list of icon and name in collapsible groups that are also switches; the explanation sits in the tooltip, not in the legend. In the pause menu the map stays calm (the #132 choice): no permanent legend and no route bar, and the **Lagen** button top right opens the legend, the first time automatically; Esc closes it again. The footer hints at 13 px under the map.
- **Controller**: a crosshair in the middle, A sets a goal under it, X clears it, Y goes to yourself; Shift+click moves you (on by default, switch it off in Instellingen > Interface; never during a mission, a cutscene or with police behind you).
- **Routes** have a colour and a pattern each: story solid yellow, your goal dashed purple, a klus dotted orange, the care route (food, garage) dash-dotted pink (`ROUTE_COLORS`, `ROUTE_DASH`, up to three at once from `routing.js`).
- A guest can set a waypoint but cannot travel (see Samen spelen).

## Menurust (meetbare criteria, #92)

`node scripts/ui_shots.mjs --sizes=1920x1080 --scenes=scripts/ui/menumeting_scenes.js` meet per pauzemenuscherm (zonder rail en voet, alleen wat in het venster staat) de woorden, de pictogrammen en de kleinste letter.

- **Tekst:** een keuzescherm (Overzicht, Kaart, Telefoon, Spullen, Garage, Prestaties, Instellingen, Foto's) toont hooguit 125 woorden; een naslagscherm (Te doen, Personages, Loopbaan, Boerderij, Besturing) hooguit 270.
- **Lettergrootte:** geen tekst onder 13 px, behalve toetsplaatjes (WASD, LT/RT).
- **Beeld boven tekst:** een scherm met een lijst van dingen (Garage, Prestaties, Personages, Overzicht) heeft pictogrammen of plaatjes per item; onbekende items zijn één regel, geen muur van vraagtekens.
- **HUD:** de woordbudgetten van `hudtext.js` (`hud_text_audit`, ratchet 0 boven budget), hooguit zes elementen naast de minimap (hudrules.js) en geen overlappende vlakken (`scripts/ui/overlays2_scenes.js`).
- Stand 20 oktober (1080p): 21 schermen gemeten, alle binnen de criteria; het drukste keuzescherm is Instellingen › Camera met 123 woorden. Daarna is het pauzemenu herschikt (#430: Spel, Verhaal, Loopbanen, Activiteiten, Instellingen) en verder opgeruimd (#601: Over uit de rail, "Snel instellen" ingevouwen op Overzicht, Over met twee vouwen). De meting van 20-10 is daarna **niet opnieuw gedaan**; de volgende run van `scripts/ui/menumeting_scenes.js` moet de getallen voor Overzicht, de Spel-tabs, Instellingen en Over opnieuw vastleggen. Tot die tijd gelden de criteria hierboven als de lat, niet de oude getallen.
- Vloer voor de Steam Deck: geen zin onder 12 px, ook in de HUD (zie Typography); de plekken die dat nog breken staan in [docs/DESIGN-SCHULD.md](docs/DESIGN-SCHULD.md).

## Language rules

Constitution 1 and 2 in [AGENTS.md](AGENTS.md) apply to every pixel of UI. In practice:

- **Dutch only** in everything a player sees or hears. Code names, file names and storage keys stay as they are. Where an English loanword tempts, take the word from [docs/WOORDENLIJST.md](docs/WOORDENLIJST.md)
  (opslaan not save, savegame, controlepunt, hervatpunt, uitzending, reeks, ronde, topscore, uitleg, einde spel); `node scripts/text_audit.mjs` fails on the English form. Allowed: app, HUD, minimap, cheat, score, update, minigame.
- **Fixed names.** *Alleen spelen* and *Samen spelen* in the main menu; *Doorgaan* (back into the game), *Naar het hoofdmenu*, *Opgeslagen spellen*, *Spel opslaan / laden*; **Samen spelen** and never co-op, coöp or multiplayer; *wachtkamer* or *kamer*, never lobby.
- **Who opened the game.** No role names in what is shown: not gastheer, gastgever or host. Use the player's name (Tammo, Tessa, the profile name) or "de ander": "Tammo heeft het spel geopend". Buttons: *Een spel openen*, *Meedoen*. "Gast" only where it must be.
- **Grunn, not "de Grunn".** Gronings and Frisian only with care; a dialect line is shown as written with the Dutch translation under it (`subtitles.js`, `FY` and the Gronings tables), the voices speak Gronings and the subtitles stay Dutch.
- **Inclusive.** No man as the default, no group-address like "jongens" or "dames en heren", no illness as a curse; satire of behaviour stays ([docs/INCLUSIEVE-TAAL.md](docs/INCLUSIEVE-TAAL.md)).
- **No real brands, companies or people** in any text or picture; parody has invented names (shops: `winkelNaam`). Real places and buildings may appear. **Always summer**: no snow, ice or winter light, in a picture, an icon or a sentence.
- **Tone:** short, calm, concrete; a refusal says why ("dat heb je al", "Reizen kan alleen in je eigen spel"); a cooldown says how long; no shouting. A second confirmation repeats the question on the same button ("Zeker weten?", "Zeker? Nog eens: €1200").
- Credits: only the owner's name is a real name; everyone else is NatusPella.

## Iconography

- **Interface icons** are one line style: a 24 px grid, stroke 2, round caps and joins, `currentColor`, no fill (`ICONS` in `pausemenu.js`, drawn at 20 to 22 px in rows and buttons). One icon per concept, next to its word.
- **Map badges** have their own system (above): one silhouette per category plus its colour; the world marker is a ring, a light column and one icon.
- **Items and places** (shops, missions, vehicles) have their own picture sets (`shopicons.js`, `missionicons.js`, the garage's real-model previews); they follow Beeldstijl: low-poly, flat facets, no outline, no glossy round icons.
- **Player shapes** in Samen spelen are the only characters used as symbols (triangle, diamond, star ...), with a colour, so two players are never told apart by colour alone.
- A picture of a person, shop or brand is invented or a render of the game; never the logo of a real company.

## Sound in the UI

Menu sounds are rules (`sfx/listnav.js`), not calls: a tick for moving, a select, a back, a toggle and a rising tone for a slider, all on the UI bus, one sound per gesture, none for hover or typing; any `.gm` menu gets them for free.
Nothing important is sound only (captions, subtitles); every spoken line is voiced and subtitled; `U` mutes. Details in [docs/DESIGN-COMPONENTEN.md](docs/DESIGN-COMPONENTEN.md).

## Accessibility at a glance

Text size (interface, map and cards, subtitles with an optional box and a high-contrast step), sound captions, three colour-blind palettes, "Beweging beperken" and "Flitsen beperken", more time and less damage, a rebindable keyboard and controller, a visible focus,
targets of 44 px on touch, and no flash above three a second. Colour is never the only cue. All of it is live, in Instellingen > Toegankelijkheid; the table of what each setting does and the palettes are in [docs/DESIGN-BEDIENING.md](docs/DESIGN-BEDIENING.md).

## Samen spelen in the design

Single player is a session of one; every screen is designed for more than one player first. All players are equal; the one who opened the game only runs the world and can be replaced (host handover).
For every new screen, mission, side job or minigame answer, in the issue or changelog:

1. **What does a guest see?** (a snapshot, an EXTRA message, or the opener's scene layer); never a screen that exists only for the opener unless it is a world setting.
2. **Who may press it?** No host rights: time, travel, sleeping, loading, cheats and pausing are group choices. The one exception is removing a player ("Eruit zetten").
3. **Who gets the reward and progress?** Each player's own save, per event, never at the end.
4. **What if someone drops or joins late?** A sentence for it, and a way back ("je komt terug waar je was").
5. **Is it a question for everyone?** Ask each player (J or N, a stated default); never answer for another.
6. **Which test covers it?** A pure test in `scripts/coop/` or a test-bank step.

The wording, the players list (hold Tab), passive mode, Meedoen?, host handover and the wait screens are in [docs/DESIGN-SAMEN-SPELEN.md](docs/DESIGN-SAMEN-SPELEN.md).

## The design system: summer screen print (decided 20 November, ADR 0040)

> **Status.** This chapter is the target and the vocabulary. The owner chose it in three question rounds on 20 November; the work is the epic of ADR 0040 (#991 and on; [ADR 0040](.specs-fire/standards/adr/0040-zomerse-zeefdruk-als-designsysteem.md)). The tokens and components exist (`ds-tokens.css`, `ds-components.css`, `ds-galerij.html`); screens move over one by one, and what still uses glass or the older paper components is listed in [docs/DESIGN-SCHULD.md](docs/DESIGN-SCHULD.md). Until a screen has moved, the chapters on glass chrome, menus and components below describe what its code does. When one of them disagrees with this chapter about the *target*, this chapter wins. The hex values are provisional until the owner has approved the HUD in the game.

**One material everywhere: a summer screen print.** HUD, menus, phone, map, load screens and big moments all read as one hand-pulled poster: cream paper, hard ink, a hard offset shadow instead of a glow, misregistration as the signature, a halftone for empty or unavailable. Dark glass and the paper receipt are retired as surfaces as screens move over; the mechanism (`ds-tokens.css`, `ds-components.css`, `ds-galerij.html`) carries the screen-print values.

### Inks (the whole palette)

| Ink | Provisional hex | Role | Never |
|---|---|---|---|
| `papier` | `#f3ead3` | every surface, also behind HUD numbers as a plate | flat white |
| `inkt` | `#1d1b17` | text, outlines, hard shadows | pure black |
| `bordgroen` | `#0e6b3c` | headers, navigation, selection edge, GPS-free map ink | a button fill |
| `zomergeel` | `#f9c80e` | the one thing you can do now, the route line, the moment band | text, or anything without an ink edge |
| `roze` | `#e8505b` | misregistration, wanted, the second print pass | status other than wanted |
| `gevaar` | `#d93f3f` (on paper `#b3261e` edge, `#8c1d18` text) | danger only (ADR 0010) | decoration |
| `--mk-*` | from `PALETTES` | world markers and the colour-blind modes | replaced by an ink |

Five inks plus two status roles, nothing else: a hex outside this table fails the token test. `#e8c93a` merges into `zomergeel`; the wanted stars become `roze` stars with an ink edge and a halftone for an empty star (shape plus count, never colour alone).

### Print effects (each one has a job)

- **Misregistration:** a hard 2 to 3 px offset in `roze` under display type and numbers. It marks *change* and *identity*, not body text: never on a sentence, never on a keycap.
- **Hard shadow:** 3 to 4 px offset in `inkt`, `bordgroen` or `roze`, no blur. It is the elevation scale (one shadow = raised, none = flat, pressed = shadow gone and the card moved by the same offset).
- **Halftone raster:** a 6 px dot pattern in `inkt` at low opacity. It means empty, unavailable or locked; never a background decoration behind text.
- **Tilt:** cards may sit at -1.5 to 1.5 degrees; text in a sentence is never rotated more than that, and a focused card straightens.

### Type

- **Barlow Condensed** (600, 800) for titles, numbers, HUD values, buttons and stamps; mixed case is allowed and preferred for words longer than a label.
- **Atkinson Hyperlegible** (400, 700) for every sentence: messages, subtitles, descriptions, receipts.
- Both are OFL and **self-hosted** under `game/fonts/`; the Google Fonts links in `game/index.html` go (constitution rule 4). Big Shoulders stays only for the logo, also self-hosted.
- The reading norm stays: 13 px floor for every sentence, 12 px only inside a keycap badge, sized for the controller-first couch distance.

### Rustig drukwerk (setting)

One switch, next to "Beweging beperken" and high contrast: no misregistration, no tilt, no halftone (an empty state becomes a word plus an outline), no stamp animation, and every text pair at least 7:1. Same inks, same layout, same components: a component reads `html.rustig-drukwerk` through tokens, never a screen of its own. On by default on the Steam Deck. The visual regression runs every screen in both modes.

### HUD

- **Appears when needed.** The minimap and the objective line always show; money, health, weapon and wanted appear on a change, in danger or on a held button, and fade after 4 s. Setting "Altijd tonen" keeps them. The attention budget and `mayShow()` still decide *whether* something shows.
- **HUD values sit on a paper plate** with an ink outline, so the print look holds over any scene; misregistration only pulses on a change.
- **Minimap:** a rounded square on paper with an ink edge and a hard shadow, the route as a thick `zomergeel` line with ink chevrons, zoomed in on foot and by bike and out in a car, the neighbourhood name on an ink label underneath. Its layer and hierarchy rules live in one pure module, `minimapstyle.js` (23 November, kept by `minimapstyle_test`): the route you follow has a paper halo, an ink casing and chevrons (purple, orange and pink keep their dash pattern), other routes are thin and quiet; with a goal the places step back (0.86) and the faster you go the fewer places (eight on foot, three at top speed); the player is a crisp light-green arrow with a cream edge and a hard ink shadow; the N is a paper badge with an ink point towards north. The canvas gets exactly the device pixels of its box (no browser scaling), the land is one cached layer laid down rotated, zoom and rotation ease independently of the frame rate, and under "Beweging beperken" the zoom jumps between two steps.
- The corner roles of "HUD corners" stay.

### Big moments

Four moments get the full treatment; all respect Rustig drukwerk (no slow motion, no stamp motion, the same words):

| Moment | Form |
|---|---|
| Mission passed or failed | full screen: a tilted `zomergeel` band, a Gronings exclamation in large print with the Dutch line under it, reward and time, a stinger |
| Opgepakt (busted) or knocked out | a stamp on a fine or a receipt with what it cost; no violence shown (constitution rule 6) |
| New area or village | a place-name stamp like a postcard on the first visit |
| Wanted up or down | a short misregistration flash at the edge next to the stars, not full screen, no flash above three a second |

### Voice

Full personality in the UI itself: parody apps, stamps, Gronings exclamations, dry empty states. Labels on controls stay verbs and stay plain ("Kopen", "Terug"); the jokes live in titles, empty states, moments, receipts and apps. Every Gronings line has the Dutch with it, no real brands or persons, and the 14-word budget stays.

### Controller first

Layouts are designed at couch distance and on the Steam Deck: large targets, d-pad focus order, bumpers for tabs, hold to confirm for anything irreversible. Mouse, keyboard and touch drive the same slots (unchanged rule); a screen is never designed for hover.

### Enforcement

1. **Token and component test:** a hex, font size or font family outside `ds-tokens.css`, or a button outside `ds-components.css`, fails (extends `ds_tokens_test`, `hud_kleuren_test` and `design_rules.mjs`).
2. **The gallery is the only source:** `ds-galerij.html` shows every component in every state (focus, disabled, error, empty, Samen spelen, Rustig drukwerk). A new screen uses existing components or extends the gallery first.
3. **Visual regression per screen:** Electron screenshots of every screen at 1280x800, 1920x1080 and 4K, in both modes, against approved references.
4. **Migration as one epic:** HUD trial first, then pause and map, phone, shops and offers, minigames, Samen spelen, load and boot screens. No release ships a half-migrated screen.

## HUD-kaarten: typografische rollen

Every HUD card (tip, music card, phone and news card, achievement toast, activity and wait card, goal, chase and police card) takes its text size from five roles, never from its own pixel value. The same role is the same size on every card kind. Tokens in `ds-tokens.css`, audit and the before-and-after sizes in [docs/HUD-TYPO-21-11.md](docs/HUD-TYPO-21-11.md), enforced by `scripts/hud_typo_test.mjs`.

| Role | Token | Size | Use |
|---|---|---|---|
| eyebrow | `--ds-t-kaart-eyebrow` | 13 px, Barlow 800, caps, 0.12em | kind or sender above a title |
| title | `--ds-t-kaart-titel` | 21 px, Barlow 800, line 1.1 | the card's headline |
| body | `--ds-t-kaart-body` | 16 px, Atkinson, line 1.3 | the text of the card |
| help | `--ds-t-kaart-hulp` | 13 px | time, source, key line, small explanation |
| number | `--ds-t-kaart-getal` | 28 px | a big number on a card |

- A long text (news, phone) is not set bigger: it uses the body role and the card gets a fitting width and grows with the text (up to the news budget of 30 words).
- The roles are declared on `:root` and again on `#hud`, because `--hud-min` (13 px divided by `--ui`) only exists there: after the HUD zoom (`--ui`) the floor stays 13 px. Text size in Accessibility (`.text-groot`) zooms the card text, so the roles scale with it.
- The moment size (`--ds-t-moment-getal`, the on-screen countdown) and the full-screen moments (`bigmoment.css`, the name card) are not cards and keep their own clamp values; they do not use the card roles.
- `hud_typo_test` fails on a loose `font-size` in px in the card CSS (`hudcards.css`, the HUD part of `phonefeed.css`, `regelwidget.css`, the achievement toast, the music card) and on a card part that uses another role than the table above.

## Tokens and components in use

The glass look above is still the HUD, the pause menu's rail and the map layer. The roles, tokens and components below are what the shop, offers, missions, careers and the Samen spelen hub already use, so they read as *one* system with the world instead of a template repeated per screen. The screen-print components (`.ds-z-*`) in the chapter above replace them as screens move over (open point in docs/DESIGN-SCHULD.md).
They live in `game/js/ds-tokens.css` and `game/js/ds-components.css`, which `game/index.html` loads (tokens first). `game/ds-galerij.html` shows every token and component in every state; `node scripts/qa/ds_galerij.mjs` takes screenshots of it in Electron. The audit of what the CSS does, with counts, is [docs/DESIGN-AUDIT-CSS.md](docs/DESIGN-AUDIT-CSS.md).

**Where it comes from.** Principles, not a copy: the UI and the world share one palette; light cards with dark heavy text on a mid-tone scene stay readable where dark glass on dark falls away; very few colours with one fixed meaning; one shape language; type hierarchy through size and weight; the UI sits on the edges and the middle stays the world; a decision screen shows the consequence before the choice. Our own identity supplies the look: Dutch street signs and paper receipts. **Bordgroen** (sign green with white) for navigation and headings, **kentekengeel** (plate yellow) as the one accent for "you can do this now", a **cream paper receipt** for shops, offers, missions and careers, and **dark glass** only for the pause and map layers and the HUD. No real signage colour codes or organisation names are used or implied; the names are invented.

**The AAA critique (#980 comment) as rules.** Every screen was the same template, there was no hero, empty states were dead, small helper texts had low contrast and nothing moved. The rules answer each (see "Rules for components"): a hero or a stated reason why not, an empty state with a hook and an action, helper text of at least 13 px at 4.5:1, a defined motion scale that respects "Beweging beperken", and more than one card shape per screen type (offer card, receipt, ladder, character card, list row).

### Colour roles

One palette (`--ds-c-*`), a handful of roles, two surfaces. A component reads the role (`--ds-tx`, `--ds-probleem-vlak`, ...), never a palette colour, so it works on paper and on glass (`.ds-papier`, `.ds-glas`; paper is the default).

| Role | Means | On paper | On glass | Never |
|---|---|---|---|---|
| `ink` (`--ds-tx`) | text, edges | `#1d1b17` | cream `#f0ede4` | flat black |
| `paper` (`--ds-bg`, `--ds-bg-2`) | card and quiet fill | `#f5efe0`, `#ebe2cb` | `#17301f`, `#1f3a28` | white card on paper |
| `primair` (kentekengeel) | the one thing you can do now: primary button, "Kan nu" chip | `#f9c80e` with an ink edge | same yellow | a status, a link or an icon on paper (1,4:1 against the paper; the edge carries it) |
| `bord` (bordgroen) | navigation, card header band, selection edge | `#0e6b3c` on white text | `#3fc97a` on `#0c140e` | a button fill (that is yellow) |
| `probleem` | something is wrong, with numbers | `#fbe1dc` fill, `#8c1d18` text, `#b3261e` edge | `#3a1816` fill, `#f5b5ad` text, `#d93f3f` edge | decoration; a second red |
| `selectie` | neutral selection or focus of a choice | bordgroen edge on `#dcebdd` | `#3fc97a` edge on `#1d3a23` | the only cue (add the check mark) |
| `succes` | done, right, earned | `#14582f` on `#dcefdc` | `#3fc97a` | without a check or a word |
| `waarschuwing` | be careful, time running out | `#7a4a00` on `#fdebc8` | `#ffbe46` on `#3a2a0c` | without an icon and a word |

Rules that come with it:

- **Status is never colour alone.** A chip carries an icon and a word; a selected card carries the edge, a tick and `aria-current`; a problem has a triangle and a sentence. The three colour-blind palettes (`--mk-*`) keep deciding the world markers; the roles are UI chrome and keep a shape or word with every colour.
- **Doelkleuren van kaart en wereld (#1078, 21 November): één geel.** Het geel van de missie, de route en het actieve doel is overal het hoofdgeel `#f9c80e` (`--ds-c-ink-geel`, palet `mission` in `a11y.js`); `#e8c93a` is daar niet meer voor. Gemeten (`scripts/navtarget_test.mjs`): geel op glas 11,9:1, tegen weiland, park, bos en dorp van de minikaart minstens 3,3:1, inkt op geel 10,9:1; tegen papier haalt geel maar 1,4:1 en staat daarom altijd met een inktrand. Paars (`--nav-eigen`) is wat je zelf koos, een klus oranje en opknappen roze (`--nav-klus`, `--nav-zorg`); de wereldbakens (goal, checkpoint, start) en de routelijn volgen dezelfde tokens, dus geen cyaan meer voor het doel van een missie. Cyaan en blauw blijven alleen waar het water of een vaarlijn betekent. Vorm en kleur: elk type heeft een eigen Phosphor-icoon (`GLYPH` in `navtarget.js`). Wanted-sterren, de speciale dag en andere oude `#e8c93a`-plekken staan nog in de lijst van docs/DESIGN-SCHULD.md tot hun scherm is overgezet.
- **The old yellow rule is not changed for glass screens.** `#e8c93a` stays the wanted star, special-day badge and mission marker. `#f9c80e` is a second yellow; the HUD keeps `#e8c93a` and the paper surfaces use `#f9c80e`, and the owner decides whether the two merge (open).
- **Selection is bordgroen, not blue (owner decision 20 November).** "Neutral / selection" is bordgroen plus ink on paper (`#0e6b3c` edge on `#dcebdd`) and licht groen on glass (`#3fc97a` edge on `#1d3a23`); the rule "no blue accent" stands, because blue would be the only blue in the game. The choice is final, not open: it lives in one token (`--ds-selectie`, with `--ds-selectie-vlak` and `--ds-selectie-tx`) in `ds-tokens.css`, which paper, glass and the high-contrast variant all read, and every component takes it from there (`.ds-kaart--selectie`, `.ds-chip--selectie`, `.ds-icoon--selectie`, `.ds-streep`); a screen never writes its own selection colour. `ds_tokens_test` guards that the token stays green.
- **Red on paper is the same red family at a different lightness.** `#d93f3f` stays the one red on glass and in the HUD; on cream it only reaches 3,9:1, so paper uses `#8c1d18` for text and `#b3261e` for edges. One hue, two surfaces; no further reds.
- **Yellow never carries text.** Text on yellow is ink; yellow text on paper does not exist. Yellow on glass may be a fill, an edge or text (7,9:1 and up).

#### Contrast table

Every pair the components draw, computed from the tokens by `scripts/ds_tokens_test.mjs` (WCAG 2 ratio; norm 4.5 for text, 3 for large text, edges, icons and fills). The test fails when a ratio drops under its norm or this table differs from the tokens; `node scripts/ds_tokens_test.mjs --write` regenerates it.

<!-- ds-contrast:start -->
| Surface | Role pair | Foreground | Background | Norm | Ratio |
|---|---|---|---|---|---|
| papier | `--ds-tx` on `--ds-bg` | `--ds-c-inkt` | `--ds-c-papier` | 4.5 | 14.99 |
| papier | `--ds-tx` on `--ds-bg-2` | `--ds-c-inkt` | `--ds-c-papier-2` | 4.5 | 13.32 |
| papier | `--ds-tx-zacht` on `--ds-bg` | `--ds-c-inkt-zacht` | `--ds-c-papier` | 4.5 | 7.93 |
| papier | `--ds-tx-zacht` on `--ds-bg-2` | `--ds-c-inkt-zacht` | `--ds-c-papier-2` | 4.5 | 7.05 |
| papier | `--ds-probleem-tx` on `--ds-probleem-vlak` | `--ds-c-rood-tx` | `--ds-c-rood-vlak` | 4.5 | 7.34 |
| papier | `--ds-probleem-tx` on `--ds-bg` | `--ds-c-rood-tx` | `--ds-c-papier` | 4.5 | 7.94 |
| papier | `--ds-succes-tx` on `--ds-succes-vlak` | `--ds-c-groen-tx` | `--ds-c-groen-vlak` | 4.5 | 7.06 |
| papier | `--ds-succes-tx` on `--ds-bg` | `--ds-c-groen-tx` | `--ds-c-papier` | 4.5 | 7.42 |
| papier | `--ds-waarschuwing-tx` on `--ds-waarschuwing-vlak` | `--ds-c-amber-tx` | `--ds-c-amber-vlak` | 4.5 | 6.37 |
| papier | `--ds-selectie-tx` on `--ds-selectie-vlak` | `--ds-c-inkt` | `--ds-c-sel-vlak` | 4.5 | 13.89 |
| papier | `--ds-primair-tx` on `--ds-primair` | `--ds-c-inkt` | `--ds-c-geel` | 4.5 | 10.89 |
| papier | `--ds-primair-tx` on `--ds-primair-hover` | `--ds-c-inkt` | `--ds-c-geel-hover` | 4.5 | 12.21 |
| papier | `--ds-primair-tx` on `--ds-primair-druk` | `--ds-c-inkt` | `--ds-c-geel-druk` | 4.5 | 8.50 |
| papier | `--ds-kop-tx` on `--ds-kop-bg` | `--ds-c-wit` | `--ds-c-bord` | 4.5 | 6.59 |
| papier | `--ds-tab-tx` on `--ds-tab-bg` | `--ds-c-inkt` | `--ds-c-wit` | 4.5 | 17.19 |
| papier | `--ds-tab-actief-tx` on `--ds-tab-actief-bg` | `--ds-c-papier` | `--ds-c-inkt` | 4.5 | 14.99 |
| papier | `--ds-rand` on `--ds-bg` | `--ds-c-inkt` | `--ds-c-papier` | 3 | 14.99 |
| papier | `--ds-selectie` on `--ds-bg` | `--ds-c-bord` | `--ds-c-papier` | 3 | 5.74 |
| papier | `--ds-probleem` on `--ds-bg` | `--ds-c-rood` | `--ds-c-papier` | 3 | 5.70 |
| papier | `--ds-waarschuwing` on `--ds-bg` | `--ds-c-amber` | `--ds-c-papier` | 3 | 4.52 |
| glas | `--ds-tx` on `--ds-bg` | `--ds-c-creme` | `--ds-c-glas-2` | 4.5 | 12.13 |
| glas | `--ds-tx` on `--ds-bg-2` | `--ds-c-creme` | `--ds-c-glas-3` | 4.5 | 10.59 |
| glas | `--ds-tx-zacht` on `--ds-bg` | `--ds-c-creme-zacht` | `--ds-c-glas-2` | 4.5 | 7.06 |
| glas | `--ds-tx-zacht` on `--ds-bg-2` | `--ds-c-creme-zacht` | `--ds-c-glas-3` | 4.5 | 6.16 |
| glas | `--ds-probleem-tx` on `--ds-probleem-vlak` | `--ds-c-rood-glas-tx` | `--ds-c-rood-glas-vlak` | 4.5 | 9.15 |
| glas | `--ds-probleem-tx` on `--ds-bg` | `--ds-c-rood-glas-tx` | `--ds-c-glas-2` | 4.5 | 8.18 |
| glas | `--ds-succes-tx` on `--ds-succes-vlak` | `--ds-c-licht-groen` | `--ds-c-sel-glas-vlak` | 4.5 | 5.86 |
| glas | `--ds-succes-tx` on `--ds-bg` | `--ds-c-licht-groen` | `--ds-c-glas-2` | 4.5 | 6.66 |
| glas | `--ds-waarschuwing-tx` on `--ds-waarschuwing-vlak` | `--ds-c-amber-glas-tx` | `--ds-c-amber-glas-vlak` | 4.5 | 8.38 |
| glas | `--ds-selectie-tx` on `--ds-selectie-vlak` | `--ds-c-creme` | `--ds-c-sel-glas-vlak` | 4.5 | 10.67 |
| glas | `--ds-primair-tx` on `--ds-primair` | `--ds-c-inkt` | `--ds-c-geel` | 4.5 | 10.89 |
| glas | `--ds-primair-tx` on `--ds-primair-hover` | `--ds-c-inkt` | `--ds-c-geel-hover` | 4.5 | 12.21 |
| glas | `--ds-primair-tx` on `--ds-primair-druk` | `--ds-c-inkt` | `--ds-c-geel-druk` | 4.5 | 8.50 |
| glas | `--ds-kop-tx` on `--ds-kop-bg` | `--ds-c-licht-groen` | `--ds-c-glas` | 4.5 | 8.78 |
| glas | `--ds-tab-actief-tx` on `--ds-tab-actief-bg` | `--ds-c-glas` | `--ds-c-creme` | 4.5 | 15.99 |
| glas | `--ds-rand` on `--ds-bg` | `--ds-c-creme-zacht` | `--ds-c-glas-2` | 3 | 7.06 |
| glas | `--ds-selectie` on `--ds-bg` | `--ds-c-licht-groen` | `--ds-c-glas-2` | 3 | 6.66 |
| glas | `--ds-probleem` on `--ds-bg` | `--ds-c-rood-glas` | `--ds-c-glas-2` | 3 | 3.20 |
| glas | `--ds-waarschuwing` on `--ds-bg` | `--ds-c-amber-glas-tx` | `--ds-c-glas-2` | 3 | 8.59 |
| glas | `--ds-primair-rand` on `--ds-bg` | `--ds-c-geel` | `--ds-c-glas-2` | 3 | 8.99 |
<!-- ds-contrast:end -->

### Type, space, shape, elevation, stroke

Roles, not loose px. The values are design pixels at the 1080p stage (`.gm-stage` zooms them with `--mz`; outside a stage multiply by `--ui`). Tokens in `ds-tokens.css`.

| Role | Token | Value | Use |
|---|---|---|---|
| display | `--ds-t-display` | 64 px Bebas | hero title, screen title (one per screen) |
| kop | `--ds-t-kop` | 44 px Bebas | section and hero heading |
| subkop | `--ds-t-subkop` | 28 px Bebas | card title, button label, row value |
| cijfer-groot | `--ds-t-cijfer` | 48 px Bebas | price, balance, count; always with its context (delta, n/m, unit) |
| body | `--ds-t-body` | 20 px Arial Narrow, 1,4 | running text |
| label | `--ds-t-label` | 16 px Bebas, caps, +0,06 em | eyebrow, chip, tab, small label; calm, not loud |
| kleine hulptekst | `--ds-t-hulp` | `max(14px, --menu-min)`, never under 13 | footnote, sub line, explanation, risk |
| toets | `--ds-t-toets` | 12 px | the inside of a hotkey badge only |

Space is a 4 px base: `--ds-s-1` to `--ds-s-8` = 4, 8, 12, 16, 24, 32, 48, 64. A card has 16 px above and below and 24 px at the sides; the HUD margin is `--ds-rand-hud` (32). Row and button height `56` (`--ds-hoogte-rij`, `--ds-hoogte-knop`), chip 32, tab 40, touch target 44 (`--ds-doel-aanraken`).

Shape: **one radius**, `--ds-r` 10 px (the HUD card's), plus `--ds-r-pil` for pills (tabs, chips) and `--ds-r-toets` 6 px for the keycap only. **One thin dark edge**: `--ds-lijn` 1 px in ink (cream-grey on glass), `--ds-lijn-dik` 2 px for outlined buttons and the focus ring. A **status edge** on the left of a card, `--ds-status-rand` 6 px, in the role colour. **No gloss and no gradient**; flat fills.
Elevation is only a soft shadow: `--ds-schaduw-laag` (a pressed or flat element) and `--ds-schaduw` (a card, a raised button). Nothing glows.

### Components

Classes in `ds-components.css` (block, `__part`, `--modifier`). The list below is checked against the CSS and against the gallery (`scripts/ds_tokens_test.mjs`).

<!-- ds-componenten:start -->
Since the UX audit of 23 November there is one component set, the screen print (`.ds-z-*`). The older set (`.ds-kaart`, `.ds-knop`, `.ds-chip`, `.ds-streep`, and `.ds-papier`/`.ds-glas` as components) is gone; paper and glass remain only as token scopes in `ds-tokens.css`.

| Class | What | Parts | Modifiers and states |
|---|---|---|---|
| `.ds-t-*` | type roles (`display`, `kop`, `subkop`, `cijfer`, `body`, `label`, `hulp`) | none | none |
| `.ds-icoon` | one icon style: filled, one stroke weight, 24 px, colour by category | none | `--klein`, `--groot`, `--probleem`, `--succes`, `--waarschuwing`, `--selectie`, `--zacht` |
| `.ds-uitleg` | short numbered how-to steps with a key or icon and a small animation that plays three times (uitleg.js, #989); off when motion is reduced | `__titel`, `__lijst`, `__stap`, `__beeld`, `__icoon`, `__tekst`, `__balk`, `__rimpel`, `__pijl`, `__meer`, `__weg`, `__nr` | `--compact`, `--rij` (first-time card as numbered rows: one icon per row on a shared column, keys as keycaps inside the sentence, text 15 px or more; the map's "Zo werkt de kaart") |
| `.ds-uitleg-wijzer` | ring and row number on the real screen part a `.ds-uitleg--rij` row points at (placed by the host, `aria-hidden`, still when motion is reduced) | `__nr` | none |
| `.ds-toetsregel` | a key inside running text or next to a button (the Enter next to Begrepen): a white keycap in em sizes that grows with the text, also in the pause menu where `.hud-key` has no plate; a key with its own icon (`.is-kbg`) keeps its own edge | none | none |
| `.ds-paneel` | the panel model: a list left and a detail right, fixed widths and margins as tokens of the panel | `--enkel` (detail only) | `--ds-paneel-lijst-b`, `--ds-paneel-rij-h`, `--ds-paneel-rand` |
| `.ds-lijst` | the list of a panel: rows with one title line, one status line and one right-aligned value | `__rij`, `__t`, `__w` | `aria-current` marks the chosen row |
| `.ds-detail` | the detail of a panel: head, hero with the one yellow action, three or four facts, a fold "meer" | `__kop`, `__hero`, `__feiten`, `__meer` | |
| `.ds-feit` | one key fact: icon, number, label; no frame | `__n`, `__l` | |
| `.ds-leeg` | an empty, locked or reached state that says something useful and offers an action | | |
| `.ds-zeef`, `.ds-rustig` | surface scope: cream paper, ink text; `.ds-rustig` scopes Rustig drukwerk to one panel (the game sets `html.rustig-drukwerk`) | none | see "Screen-print components" |
| `.ds-z-knop` | button: yellow primary with ink edge and hard shadow; pressed = shadow gone and the button moved by the offset | none | `--secundair`, `--ghost`, `--gevaar`; hover, `:focus-visible`, `:disabled`, `[aria-disabled]`, `[aria-busy]` |
| `.ds-z-kaart` | card: paper, hard shadow, tilt, bordgroen header with misregistration under the title | `__kop`, `__titel`, `__tekst`, `__voet` | `--recht`, `--klik`, `--selectie` or `[aria-current]`, `--probleem`, `--uit`, `--bord` (solid bordgroen with white text: an advice card) |
| `.ds-z-chip` | status pill: icon or shape plus a word | `__icoon` | `--primair`, `--selectie`, `--probleem`, `--succes`, `--uit` |
| `.ds-z-tabs`, `.ds-z-tab` | tab pills, the active one filled ink | none | `[aria-selected="true"]` or `--actief`, `:disabled` |
| `.ds-z-rij` | list row: icon, name with sub line, value | `__naam`, `__sub`, `__waarde` | `--selectie` or `[aria-current]`, `--probleem`, `--uit` |
| `.ds-z-toets` | keycap, never with misregistration | none | `--druk` or `[aria-pressed]` |
| `.ds-z-glyph` | one key or button glyph (keyboard, mouse, controller, Steam Deck, touch) on a white plate with ink edge; `data-set` picks the font | none | none |
| `.ds-z-stempel` | stamp: a tilted print with an edge | none | `--geel`, `--gevaar`, `--in` (drops in within 250 ms; none in Rustig drukwerk) |
| `.ds-z-bon` | receipt line: name, dotted leader, amount, double rule above the total | `__regel`, `__stippen`, `__bedrag`, `__totaal` | none |
| `.ds-z-feit` | fact tile: a number with a word under it, paper with an ink edge (benchmark result, summaries); the number is a Barlow figure | `__n`, `__l` | `--probleem` |
| `.ds-z-leeg` | halftone empty state: raster block with a dashed edge, a word and one action | `__beeld`, `__kop`, `__tekst` | none (Rustig drukwerk: no raster, the dashed edge and the word stay) |
| `.ds-z-balk` | progress bar: raster track, ink fill, a label with the numbers; set `--ds-z-w` | `__baan`, `__vul`, `__label` | `--tijd` (yellow), `--laag` (red) |
| `.ds-z-waarde` | plate for HUD values: paper with an ink edge | `__icoon`, `__getal`, `__eenheid` | `--wijzig` (misregistration pulse on change), `--gevaar`, `--weg` (faded out) |
| `.ds-z-tussenkop` | section heading one level under the screen title: small bordgroen capitals with a rule, no misregistration | none | none |
| `.ds-z-link` | the third action: underlined with an arrow | none | `aria-disabled` |
| `.ds-z-segment` | segment: one choice of a few, joined; the chosen one is bordgroen with a tick, a closed one is grey and says why (title) | none | `--blok` (full width), `--klein`, `aria-checked` |
| `.ds-z-stapper` | stepper: arrow, value, arrow (filter, sort, shirt number) | none | none |
| `.ds-z-status` | status as flat text with an icon and a word: no edge, no shadow, no pill | `__l`, `__w` | `--goed`, `--probleem`, `--zacht`, `--blok` (small label above the value) |
| `.ds-z-kopband` | head band: subject (crest or icon), title with a sub line, status on the right | `__eb`, `__titel`, `__sub`, `__rechts` | `--compact` |
| `.ds-z-tabel` | table with real columns, tabular figures, a sticky head and a chosen row | none | `aria-selected` or `aria-current`, `zone-op`, `zone-neer` |
<!-- ds-componenten:end -->

**Screen-print components (#992).** They live in `ds-components.css`, named `.ds-z-*`, next to the older paper components, so a screen moves one component at a time. They read only the screen-print tokens in `ds-tokens.css` (inks, `--ds-schaduw-hard*`, `--ds-misdruk`, `--ds-schuin`, `--ds-raster`) and one surface, `.ds-zeef`. Rules: a hard shadow and its pressed state use the same offset (`--ds-hard-x`, `--ds-hard-y`); misregistration (`text-shadow: var(--ds-misdruk)`, the only text shadow allowed) sits on titles and HUD changes, never on a sentence or a keycap; the raster is never behind text (a strip or its own block); no animation over 250 ms. **Rustig drukwerk** (`html.rustig-drukwerk`, set by the setting of the same name; `.ds-rustig` scopes it to a gallery panel) zeroes misregistration, tilt, raster and motion through the tokens and swaps the bordgroen and roze inks for darker ones; every text pair is at least 7:1 there, which `ds_tokens_test` computes. An empty or unavailable thing keeps a dashed edge and a word. `ds-galerij.html` shows every component in every state, left in normal print and right in Rustig drukwerk.

**Anatomy and states, in one place.**

- **Card (`.ds-kaart`).** Edge 1 px ink, left status edge 6 px, radius `--ds-r`, soft shadow. Header row (title left, chip right), a small label, the number (`cijfer`), one or two lines of body, a time streep under it, a footnote row for the consequence. Selected: tinted fill, the edge in the selection role, a tick top right and `aria-current="true"`. Disabled: dashed edge, quiet fill, no shadow, and the card says *why* in a line ("Niet beschikbaar: pas na 20:00 uur."); never plain grey without a reason. A card that can be clicked is `tabindex="0"` or a `button` with the focus ring.
- **Chip.** Height 32, a pill, icon (or a shape) plus a word in capitals, role colours. It names a status ("Kan nu", "Te duur") or a consequence ("+€20 bonus"); it is never a button.
- **Buttons.** Primary: yellow, ink text, ink edge, 56 px, one per screen (owner decision 20 November: not one per card; the other actions of a card list are secondary, outlined). Secondary: transparent, 2 px edge in ink. Risk (`--gevaar`): outlined in the problem colour, never a solid red; the risk goes in a footnote under it. Text: underlined, for the third option. Under a primary that costs something, the `__sub` line says cost and payback ("€60, terugverdiend in 5 min"). States: hover lightens the yellow and raises the shadow, pressed darkens it and drops 1 px, focus is one ring, disabled is dashed with a reason, busy shows a progress cursor.
- **Streep.** 4 px track with a fill and a label that always says the numbers ("70 van 120 min", "3 van 5"). Time uses amber, a low level red, a count the selection colour; the label carries the meaning, not the colour.

### HUD corners

The HUD sits on the edges with a fixed margin (`--ds-rand-hud`, 32 px at 1080p; the real HUD keeps `--hud-edge` and `--hud-top` from `hud_panel.css`). Every corner has one role; **the middle is the world** and nothing but a subtitle, a prompt or a cinematic may enter it (the existing rules of "HUD, load screen and boot screen" and `hudrules.js` still decide *whether* an element shows).

| Corner | Role | Examples | Never |
|---|---|---|---|
| top left | incoming work | phone card, new offer, objective card | a settings control |
| top centre | time and speed, with the goal directly under it | clock, day, speed, "Naar de Grote Markt, 840 m" | more than two lines |
| top right | status and tools | money, wanted level, health, weapon | a list of more than three items |
| bottom left | minimap with the place label under it | minimap, "Binnenstad" | text over the map |
| bottom right | key hints, at most two | badge plus one word | a hint that is not a key |

No HUD element takes a click; a HUD value is a `.ds-z-waarde` plate and a HUD card a `.ds-z-kaart`. Wording stays inside the 14-word budget.

### Motion and sound

- **Scale:** `--ds-m-snel` 120 ms (a hover or press), `--ds-m` 200 ms (a fade-in, a streep), `--ds-m-max` 250 ms (the longest anything may take). Easing is `--ds-ease`, an ease-out (`cubic-bezier(0.2, 0.7, 0.2, 1)`). Only opacity, a 1 to 8 px move and fills animate; nothing bounces, flashes or loops.
- **Reduced motion:** `prefers-reduced-motion: reduce` and `html.reduce-motion` (the game's "Beweging beperken") set the three durations to 0, so every component stops moving with no rule of its own. Meaning never depends on motion. No flash above three a second (`reduce-flash` stays).
- **Sound hooks:** components make no sound themselves; the rules in `sfx/listnav.js` do (a tick, select, back, toggle, slider). A `.ds-knop` is a real button, so it is already an `ITEMS` entry; `.ds-papier, .ds-glas` are in `ROOTS`. No new sound.

### Microinteractions

One small library, `game/js/ds-motion.css` (the `.ds-mi-*` classes, loaded after `ds-components.css`) plus two helpers in `game/js/microinteractions.js`. It adds no new durations: everything runs on `--ds-m-snel` 120 ms, `--ds-m` 200 ms and `--ds-m-max` 250 ms and `--ds-ease`, so "Beweging beperken", Rustig drukwerk and `prefers-reduced-motion` set it all to 0 ms and the words stay exactly the same. The dwell time of a notification is **not** an animation and may be longer than 250 ms; everything that moves is not.

**Rules.** Never a loop (no `infinite`, no iteration count above one). Only `opacity`, the individual `translate` property (1 to 8 px, never a scale or rotation; the tilt of a card stays on `transform`), fills and `scaleX` of a bar. No flash above three a second. Meaning never lives in the motion alone: the kicker, the icon and the words are there when nothing moves. Performance: transitions on state classes the component already has (`.on`, `.aan`, `.out`, `.uit`), `opacity` and `translate` only (no `width`, `top`, `filter`, `all`), no JS per frame for a notification (the one exception is a money counter that runs for at most 250 ms). `scripts/microinteracties_test.mjs` guards the lot.

| Name | Class | What it does | Time |
|---|---|---|---|
| **Inschuiven** (slide in) | `.ds-mi-in` + `.on`/`.aan` | opacity 0 to 1 and 8 px from the edge where the notification belongs (`--ds-mi-x` / `--ds-mi-y`: left card `-8px 0`, phone card `0 -8px`, wanted tag `8px 0`), ease-out | `--ds-m` 200 ms |
| **Verblijven** (dwell) | none (the component owns it) | HUD cards: `cardtime.js` (4 to 10 s by text length, longer in reading mode `ruim`, sticky for an important card in mode `geen`); achievements: `toastDuur()`; big moments: 1,8 s (wanted), 3,6 s (area), 4,2 s (mission, busted). A notification that can take a click or focus pauses its timer on hover and focus. Stays put under reduce-motion (only the fade and the move are off). | seconds |
| **Uitfaden** (fade out) | `.ds-mi-in` + `.out`/`.uit` | opacity to 0, **no move** (it leaves where it stands) | `--ds-m` 200 ms |
| **Stapelen / opschuiven** (stack) | `opschuiven(container, fn)` + `.ds-mi-schuift` | when a notification is removed the next one slides to the freed place (FLIP, one measure before and after, then a `translate` transition), no jump, no overlap; one notification per zone is still the attention budget | `--ds-m` 200 ms |
| **Teller oplopen** (counter) | `telStap()`, `.ds-mi-teller` | a money value runs linear to its target, then stands still; the `+/-` delta next to it fades in with a 6 px step | at most `--ds-m-max` 250 ms |
| **Voortgang vullen** (progress fill) | `.ds-mi-vul` + `--ds-mi-p` | a bar fills with `scaleX` once, no loop, no width animation | `--ds-m-max` 250 ms |
| **Aantikken** (press) | `.ds-mi-druk` | the press state of a button: it moves the shadow offset and the shadow drops, the same offset as "pressed" in the elevation scale | `--ds-m-snel` 120 ms |
| **Einde missie** (landing) | `.ds-mi-in .ds-mi-landing` (+ `.ds-mi-na`) | the big moments keep their form (band, stamp on a slip, place stamp, wanted tag). One landing: opacity plus 8 px from the side that belongs to the form (band from the left, slip and place stamp from below, wanted tag from the right, stamp from above, one step (200 ms) after the slip), then it stands still; the fade out is 200 ms with no move. Rustig drukwerk and reduce-motion: no motion at all, the same words and the same layout. While driving (in a vehicle, boat or plane, or faster than 3 m/s) the new-area stamp and the wanted tag are **compact**: about 40% smaller, at the top clear of the goal card and the minimap, a shorter dwell, the same landing; busted and the mission band stay full. | 250 ms, a stamp starts 200 ms later |

**Where it is applied** (a class and a few lines of CSS per component, no new structure): HUD cards (`hudcards.js`: toasts, tips, "Geplaatst", "Nieuwe streek", money and mission cards; the name card of `namecard.js`), the phone card (`phonefeed.js`), the achievement toast (`achievements.js`), the five big-moment forms (`bigmoment.js`: mission passed and failed, busted, new area, wanted up and down) and the money counter of the HUD (`hud_panel.js`). Samen spelen: notifications and moments are local to each player (each plays their own HUD); nothing here is shared or synced.

**Left alone, with the reason.** The ringing of an incoming call (`pf-ring`, `pf-buzz`) and the live dot are functional states, not decoration, and still loop; the rule "never a loop" applies to everything new and they are listed in the known deviations below for the phone pass. The old district card of `cinematics.js` (`#wijk-card`) is replaced by the big moment and stays as the fallback in the old style.

### Load screens: motion (23 November)

Every load screen moves a little, so the wait feels shorter (owner's wish: the boot screen's stamped logo is the model). One shared set, `game/js/ds-laad.css`, used by the boot screen (`#loading`, also the benchmark preload) and by the load screen of `loadscreen.js` (a save, travel, fast travel, a world switch, a mission start, waiting for the host in Samen spelen): the logo parts and the destination card stamp in one after another (`.ds-laad__stempel`, staggered with `--i`), the render drifts slowly inside its frame (`.ds-laad__drift`), the place name breathes (`.ds-laad__adem`), a skewed paper shine runs over the bar fill (`.ds-laad__balk`) and a new status line slides in (`.ds-laad__status--nieuw`). Only transform and opacity, times from the `--ds-laad-*` tokens, no JavaScript per frame. Beweging beperken (setting and system) and Rustig drukwerk stop all of it; nothing disappears. The earlier decisions stand: one bar, no Enter, automatic, one status line, no tips. `scripts/laadbeweging_test.mjs` guards it.

### Microanimaties (DS3)

The owner's wish (21 November): *achievements should feel more like an achievement, and many cards, HUD items, UI and menus may move a little more.* The microinteractions above are the floor (notifications, a counter, a press); this section is the catalogue on top of it: one fixed pattern per component type, in `game/js/ds-micro.css` (`.ds-m-*` for micro, `.ds-moment-*` for the few big moments), with tokens `--ds-m-*` and `--ds-moment-*` in `ds-tokens.css`, the pure logic in `game/js/dsmicro.js` and `game/js/achievementunlock.js`, and the rules as code in `scripts/lib/ds3_regels.mjs`, kept by `scripts/ds3_dekking_test.mjs`. The older `.ds-mi-*` classes stay as they are; a card may carry both (`ds-mi-in ds-m-overshoot`).

**Motion language (tokens).** Three micro durations, three easings, one stagger, and a separate family for moments:

| Token | Value | For |
|---|---|---|
| `--ds-m-kort` | 80 ms | a tick: tooltip, tick mark, number heartbeat, press |
| `--ds-m-midden` | 150 ms | button, chip, switch, tab underline, selection, dot |
| `--ds-m-lang` | 250 ms (= `--ds-m-max`) | card, panel, bar, toast; the longest a micro animation may take |
| `--ds-m-staffel` | 40 ms | gap between list rows, at most 8 rows delayed (320 ms) |
| `--ds-m-uit` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | ease-out: coming in, filling (same curve as `--ds-ease`) |
| `--ds-m-inuit` | `cubic-bezier(0.45, 0, 0.2, 1)` | ease-in-out: a swap between two states |
| `--ds-m-stempel` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | a light overshoot, like a stamp that lands |
| `--ds-m-druk-x` | 2 px | the screen-print press: the shadow offset jumps 2 px |
| `--ds-moment-stap` | 120 ms (= `--ds-m-snel`) | stagger step of a moment |
| `--ds-moment-duur` | 400 ms | one part of a moment |
| `--ds-moment-max` | 1600 ms | the whole moment, flat through to the sheen |
| `--ds-moment-leven` | 2000 ms | one slow breath of the live dot (the only thing that may keep running) |

The hard limit of 250 ms stays for every micro animation (`--ds-m-*`; the release rules refuse a `--ds-m-*` token above 250 ms). Only a **moment** may go longer, up to 1,6 s, staggered: an achievement, the end card of a mission and a level-up. A moment has its own class family (`.ds-moment-*`), its own tokens (`--ds-moment-*`) and never fires from a hover, a list or a counter. Under "Beweging beperken", Rustig drukwerk and `prefers-reduced-motion` every token above is 0 ms (`--ds-m-druk-x`, the 2 px offset, stays: it is a state, not motion).

**Rules** (a test checks each one):
1. **One animation per event.** A card that comes in does not also pulse; an achievement is one moment, not a moment plus a toast plus a chip animation.
2. **Only `transform`, `opacity` and the individual properties `translate`, `scale` and `rotate`.** No layout animation (`width`, `height`, `top`, `left`, `margin`, `padding`, `font-size`), no `filter`, no `all`. The one paint exception is `box-shadow` on `.ds-m-knop`, at most `--ds-m-midden`. A bar fills with `scale` (`--ds-m-p` from 0 to 1), a tab underline glides with `transform`.
3. **Times only from tokens.** No literal `ms` in `ds-micro.css` (except `0ms` in the reduced-motion branches), and a `.ds-m-*` rule never uses a `--ds-moment-*` time.
4. **Never blocks input.** Pointer events and focus stay on the element; a moment that holds attention (the end card) can be skipped with a key or a click and then shows its end state at once (`.ds-moment-klaar`). A toast that blocks nothing needs no skip.
5. **No loops**, except the live dot and the bell (`.ds-m-stip--live`, one slow opacity breath, never above 0,5 per second). Everything else runs once and stays put.
6. **Reduced motion has a counterpart for every class.** Each `.ds-m-*` and `.ds-moment-*` class that animates or transitions is listed in all three branches at the bottom of `ds-micro.css` (`html.reduce-motion`, `html.rustig-drukwerk`, `@media (prefers-reduced-motion: reduce)`) with `animation: none` and zero duration and delay: no motion, no stagger, no shock, the same words on the same place. "Rustig drukwerk" gets only a fade or an instant end state, never a shake or a stagger. Meaning never lives in the motion alone.
7. **Performance budget.** At most 12 elements with their own animation at once (`MAX_GELIJK` in `dsmicro.js`: more rows simply stand there), at most 8 delayed rows, no JS per frame (timers at moment steps only), no continuous loop besides the live dot.
8. **Sound.** A moment may sound; a micro animation does not (menu sounds stay in `sfx/listnav.js`). Sound goes through the existing SFX bus (`playTone`, `playNoiseBurst` on the sting bus, so it follows the Effects volume and mute): a UI tick (`tik`), a whoosh, a stamp slam (`slag`, `inslag`, `stempel`), a coin (`munt`). Never twice for one event: the achievement waits until the end card is gone (`isOverlayHeld`), so the slam of the end card and of the achievement never overlap, and the achievement sting (`achievementgeluid.js`) is the chime while `slag` is the slam under it.
9. **Samen spelen.** Animations are local: each player plays their own HUD, menus and sounds; nothing here is synced or sent over the net. An achievement is per player (#429), so a guest sees and hears only their own.

**Catalogue.** Each row is the fixed pattern; use the class, not a new CSS rule.

| Component | Class | Pattern | Time |
|---|---|---|---|
| Card or panel in | `.ds-m-binnen` (+ `.on` / `.aan`; `--ds-m-x`, `--ds-m-y`) | opacity, rise 8 px (or from an edge), scale 0,98 to 1 with a light overshoot | `--ds-m-lang` |
| Card out | `.ds-m-weg`, or `.out` / `.uit` on `.ds-m-binnen` | fade only, no move | `--ds-m-midden` |
| Existing card with an overshoot | `.ds-m-overshoot` (next to `.ds-mi-in`) | the same slide with the stamp easing | `--ds-m-lang` |
| Toast | `.ds-m-toast` (+ `.on`, `--ds-m-x`) | fade and slide from the edge where it belongs | `--ds-m-lang` |
| Button | `.ds-m-knop` | hover or focus: 1 px up; press: 2 px into the shadow, the shadow offset jumps 2 px and the edge of the shadow does not move; on a `.ds-z-knop` only the transition and the lift are added | `--ds-m-midden`, press `--ds-m-kort` |
| List row | `.ds-m-rij` (+ `.on`, `--ds-m-i`) | fade and 6 px rise, staggered 40 ms per row, at most 8 steps; after the stagger the classes come off so the row keeps its own hover | `--ds-m-lang` |
| Number or counter | `.ds-m-tik` (+ `.ds-m-tikt` per step) | tabular figures; each step a heartbeat (scale 1 to 1,08 to 1); the figures themselves run in `counterSteps` | `--ds-m-kort` |
| Badge or chip | `.ds-m-pop` (+ `.on`) | scale 0,6 to 1 with the stamp easing | `--ds-m-midden` |
| Progress bar | `.ds-m-vul` (`--ds-m-p`) on the fill, `.ds-m-glans` + `.ds-m-glanst` on the track | fills with `scale`; a flat sheen sweeps once when it is full (no gradient) | `--ds-m-lang` |
| Tab or segment | `.ds-m-tabs` on the tab row, `.ds-m-tabs__lijn` inside it, `.ds-m-tabs--aan` set by JS once measured | a sliding underline (`--ds-m-tab-x`, `--ds-m-tab-w`); until it is measured the tab keeps its own underline; the content swap fades with `.ds-m-wissel` | `--ds-m-midden` |
| Switch, checkbox, slider | `.ds-m-schakel` + `.ds-m-schakel__knop`, `.ds-m-vink`, `.ds-m-greep` | the knob slides with a light overshoot, the tick pops in, the handle grows 12% while held or focused | `--ds-m-midden`, handle `--ds-m-kort` |
| Tooltip | `.ds-m-tip` (+ `.on`, or its parent hovered or focused) | fade and 4 px rise | `--ds-m-kort` |
| Scrolling | `.ds-m-scrollfade` (`data-boven`, `data-onder` from `scrollRanden`) | the edge fades where more content is | `--ds-m-midden` |
| Selection | `.ds-m-puls` (+ `.aan`, or `.ds-m-gepulst`) | one pulse, scale 1 to 1,04 to 1 | `--ds-m-midden` |
| New-notification dot | `.ds-m-stip` (+ `.aan`), `.ds-m-nieuw` on a tab or rail button with `[data-new]`; `.ds-m-stip--live` for a live state | the dot pops in once and then stands still; only the live dot breathes | `--ds-m-midden` (live: `--ds-moment-leven`) |
| Reward to the HUD | `.ds-moment-vlieg` (`--ds-moment-dx`, `--ds-moment-dy`) | the coin or amount flies to the HUD counter, which ticks (`.ds-m-tik`) on arrival; one at a time, only above a threshold the component sets | `--ds-moment-duur` |
| Accent | `.ds-m-inkt--bord`, `.ds-m-inkt--roze`, `.ds-m-inkt--geel`, `.ds-m-inkt--inkt` | sets `--ds-m-accent` from the ink tokens; no raw colour | none |

**Moments** (`.ds-moment-*`, each part at most `--ds-moment-duur`, stagger `--ds-moment-stap`, the whole at most `--ds-moment-max`; set `--ds-moment-n` on each part from the plan): `.ds-moment-stempel` (the card slams in: scale 1,35 to 0,97 to 1 with opacity), `.ds-moment-binnen` (a part slides in from 24 px left), `.ds-moment-ploft` (an icon pops with an overshoot and a small turn), `.ds-moment-glans` + `.ds-moment-veeg` (a flat sheen sweeps over the card once), `.ds-moment-vlieg` (reward to the HUD), and `.ds-moment-klaar` (skip: the end state at once). The end card of a mission (`endcardimpact.js`) and the achievement (`achievementunlock.js`) plan their steps with the same stagger helper (`counterSteps`, `FAST_MS`, `STEP_MS`, `MAX_TOTAAL_MS`).

**The achievement as a moment** (`achievements.js`, `achievementunlock.js`, `achievementsui.js`). The card slams in with a screen-print shadow in the accent ink (`.ds-moment-stempel`, a hard 6 px shadow, no soft glow), the icon pops (`.ds-moment-ploft`), kicker, title and description come staggered (120 ms apart), a bar "x/y prestaties" fills while the number ticks, and a flat sheen sweeps over the card at the end; the whole moment is about 1 s. The accent ink is the rarity: gold is yellow (a medal or "alle goud", with the word *Goud* in a chip), a secret one is pink (the word *Geheim*), and an ordinary one takes the ink of its category. Several at once: the first of a series is a full card, the next two are short (title only, no bar, 60% of the dwell, a chip *nog N*), and what is left after three becomes one summary card (*Nog N prestaties*); the achievements themselves are in the menu. Sound: the existing sting (full card only), a short slam, a tick per counter step, a coin on the last and a soft sheen note. In the menu (Pauze, Prestaties): rows stagger in when the section or a tab opens (never on a fold or a selection), a just-unlocked row sweeps its sheen once per session, the category counter ticks up, a bar fills from what it was (never again on a fold) and a bar that is just full sweeps once. Under "Beweging beperken" and Rustig drukwerk: the card stands there with one slam, the bar and the number are final, no stagger.

**Where it is applied (first set).** Pause-menu tabs (sliding underline, pop of the new dot on tabs and rail), HUD cards (`.ds-m-overshoot`), the money counter in the HUD (`.ds-m-tik` on money coming in), the objective card (the swap now runs on the tokens: 250 ms, the stamp easing, off under reduced motion), the achievement toast, the achievement menu (rows, chips, bars, counters, the button *Bekijk in de lijst*). Still to move over: the other `.ds-z-balk__vul` bars (their width transition predates this rule), the phone card and the other menus' rows.

**Components move on every screen (21-11).** The DS3 components themselves carry the micro animation, so a screen that uses them needs no class of its own: `.ds-z-knop` lifts 1 px on hover and focus (the press is the 2 px shadow jump it already had), `.ds-z-kaart--klik` rises 2 px, `.ds-z-tab` rises 1 px and shrinks to 0,96 while pressed, and a choosable `.ds-z-rij` (a button, link or element with `tabindex`) slides 2 px to the right. All of it is `translate` or `scale` on the `--ds-m-snel` or `--ds-m-midden` token, wrapped in `@media (prefers-reduced-motion: no-preference)` and `html:not(.reduce-motion, .rustig-drukwerk)`, so under "Beweging beperken", Rustig drukwerk and `prefers-reduced-motion` the component simply stays where it is. No layout shift: `translate` does not move neighbours. Kept by `scripts/ds3_dekking_test.mjs` (block 6b). Samen spelen: local to each player, nothing is sent.

### Meldingen: duur en aflopend balkje

The owner's wish (21 November): *some HUD items have a bar that runs down, so you know when a notice goes away; almost all notices may have that and stay in view about equally long, so you have time to read and you know when it goes.* One building block does it for every temporary notice: `game/js/noticetiming.js` (pure: duration, timer, queue, the register `NOTICE_TYPES`), `game/js/melding.js` (the DOM side: `noticeBar`, `runNoticeTimer`, `adjustRemaining`) and `game/js/ds-melding.css`. The inventory of every notice type is in [docs/MELDINGEN-21-11.md](docs/MELDINGEN-21-11.md).

**Duration classes** (tokens `--ds-melding-*` in `ds-tokens.css`, kept equal to `DURATION_CLASSES` by `scripts/meldingtijd_test.mjs`):

| Class | Time | For |
|---|---|---|
| `kort` | 4 s | a name, a few words, a menu notice, a queue with two or more waiting |
| `normaal` | 6 s | one short sentence or a tip |
| `lang` | 9 s | an explanation, or a sentence that teaches a key |
| max | 10 s | the ceiling; a longer text lives in the text log (Pause > Help) |

The time for a text is `2 s + characters / 15`, limited to 4 to 10 s and then rounded **up** to a class, so all notices have one of four durations. A notice that names a class keeps it as a floor; the text may lengthen it, never shorten it (a sentence is never cut before it can be read). Reading times are not animations: they do not go to 0 under "Beweging beperken".

**The bar** (`.ds-melding__tijd`, inside an element with `.ds-melding`): 4 px (`--ds-melding-balk-h`) at the bottom edge, full at first and empty at the end, linear, moved **only with `transform: scaleX`** (never `width`); the duration is `--ds-melding-duur` on the notice, one of the four classes. Colour from tokens: **board green** (`--ds-melding-balk`) by default, **red** (`--ds-melding-balk-waarschuwing`, `.ds-melding--waarschuwing`) for danger and police, a light green (`--ds-melding-balk-donker`, `.ds-melding--donker`) on a dark card; **never yellow** (reserved). A critical notice (`.ds-melding--kritiek`, or a card that waits for a click) has no bar and closes with a button or a key; today that is the frame error and a card under "Leestijd: geen timer".

**Pause and hover.** The timer stops while the game is paused, the pause menu is open, a cutscene hides the HUD (`cine-hide-hud`), a story call or subtitle holds the card back, or the player hovers over the notice (`.ds-melding--hover`, only for a notice that may take the pointer, today the achievement toast; HUD cards stay click-through to the world on purpose, #801). While it stands still the bar stands still (`.ds-melding--pauze`, `animation-play-state: paused`). A notice that belongs to a film (the name card) keeps running during that film (`film: false`).

**Queue.** At most `max` visible (HUD cards: one), the rest wait in order of priority (`precedence`: critical, then higher priority, then the oldest); with two or more waiting, a notice that comes out of the queue is `kort` (`queueDuration`), and the one that is up is shortened only after it was readable for 3 s (`shortening`, the bar follows through `adjustRemaining`). A notice stays inside its zone (`hudstack.js`, `hudrules.js`): no overlap with other zones.

**Reduced motion (decided).** The bar is information, not decoration: under "Beweging beperken", Rustig drukwerk and `prefers-reduced-motion` it stays visible and runs **in ten steps** (`steps(var(--ds-melding-stappen), end)`) instead of smoothly. The reading time does not change. Rejected: hiding the bar (the player no longer knows when it goes) and a static bar (it says nothing about what is left).

**Screen reader.** The bar is `aria-hidden`; the text stays in the existing `aria-live` regions (the card stack, the toast, the menu notice). No new live region: one voice per notice.

**Exceptions (with a reason, in `NOTICE_TYPES`).** The frame error (critical), the end card and big moments (their own direction and skip), banners, the district card and landmark shot (a cinematic moment), subtitles (their own reading time: the length of the spoken line), the saved tick (a 2 s status symbol), the loading screen, and the stunt brief (the activity decides; a follow-up). `scripts/ds3_dekking_test.mjs` fails a new file that removes an element with `.add('out')` on a timer and is not in the register.

**Samen spelen.** Notices are local per player: nothing is synced or sent over the net; a guest sees only their own cards, toasts and bars.

### Rules for components (additions to the checklist)

1. **No loose hex.** `ds-components.css` has no hex, `rgb()` or `hsl()`; only `var(--ds-...)`. `ds-tokens.css` has hex only as palette (`--ds-c-*`) and `rgba()` only in a shadow. New screens use the roles, not the palette.
2. **Text.** Never under 13 px except a hotkey badge (12). Helper text uses `--ds-t-hulp` and 4,5:1. No `opacity` to make text quiet; use `--ds-tx-zacht`.
3. **No colour-only meaning.** Every colour comes with an icon, a shape, a mark or a word.
4. **One primary.** One yellow button per screen (owner decision 20 November; a list of cards has outlined buttons, the yellow one sits in the detail or the single next step); the risky choice is outlined; the rest is secondary or text.
5. **A hero or a reason.** Every screen has one picture of the thing, or a stated reason why not (a settings page is allowed none; write it in the issue).
6. **A designed empty state.** Every list, grid and offer area has a `.ds-z-leeg` with a hook and an action, and a locked state that says what opens it.
7. **Consequence before the choice.** A screen that asks for a decision shows the numbers first (cost, gain, time, payback, risk) in a chip row or a `.ds-z-bon`.
8. **More than one card shape per screen type.** Offers are cards with chips and a time streep, shops are receipts, careers are a ladder, characters are a character card, long lists are `.ds-z-rij` rows. The same card is not repeated on every screen.
9. **Motion** at most 250 ms, ease-out, off when reduced; a screen opening may fade in once (`.ds-kaart--in`), nothing loops.
10. **Two surfaces only.** Paper for shop, offers, missions, careers and anything you read and decide; glass for the pause rail, the map layer and the HUD. Do not put a glass card on paper or the reverse without the scope class.
11. **Checks.** `scripts/release/design_rules.mjs` (`checkDsLine`, `checkDsFiles`) enforces rules 1, 2 and 9 on the two files and the contrast, motion and focus checks in `scripts/ds_tokens_test.mjs`; the rest is review and the checklist below.

Extra checklist items for a screen (on top of "New UI checklist"): [ ] roles only, no palette colour; [ ] one yellow primary; [ ] hero or its reason named; [ ] empty and locked states drawn in the gallery; [ ] every status has an icon and a word; [ ] tab, shift-tab and a controller reach everything with one visible ring; [ ] seen with "Beweging beperken" on; [ ] Samen spelen: the six questions. Every new screen passes `node scripts/ds3_dekking_test.mjs` (a ratchet on hard colours, dark glass, old classes, loose fonts and text under 13 px) and `rules_audit` blocks new ones in a diff; a deliberate exception carries a `ds3-uitzondering` comment with its reason (see docs/DESIGN-AUDIT-UI-21-11.md).

## Panels

One model for every tab of the pause menu (21 November; audit in `docs/ESCAPEMENU-UX-21-11.md`). Components: `.ds-paneel`, `.ds-lijst`, `.ds-detail`, `.ds-feit`, `.ds-chip`, `.ds-leeg` (`ds-components.css`).

- **List (left).** Selectable rows, one line of title and one line of status, one value right-aligned (an amount, "3 van 8", a price). No third line, no bar per row. The chosen row is `aria-current`; the focus ring is the one of the design system.
- **Detail (right), fixed build, top to bottom.** (1) Head: name plus a status chip. (2) Hero: the next step in one sentence, with the one yellow main button and its key hint (the controller glyph when the pad is the last input). (3) Three or four key facts: icon, number, label, without frames. (4) "Meer" as a fold, closed; everything else goes in there. The same sentence never appears twice in one panel.
- **Hierarchy by type, not by frames.** Size and weight make the order; one accent per panel (the yellow button). No frame in a frame: a fact is not a card.
- **States.** Empty (nothing yet), locked (not yet, and why) and reached (done) say something useful and offer an action: "Nog geen meubels. EIKEA heeft ze" with a button to the map, not "Leeg".
- **Focus and keys.** One order: list, then the detail action. Q and E switch tabs or groups, the arrows move in the list, Enter is the main action, Esc goes back. A tab that has its own sub-sections (Boerderij: Percelen, Erf, Gewas, Machines, Kasboek, Bank) shows them as a tab row in the panel itself, so Q and E work there too.
- **Size.** Widths and margins are tokens of `.ds-paneel` (list 320 px, 256 px under 1100 px wide or 640 px high; row 56 px; side margin 24 px, 16 px when small). The hero does not scroll from 1024x600 up to 1920x1080; the "meer" fold and the list scroll.
- **Applied so far (22 November).** Boerderij (overview as field cards with state, crop, next step and expected yield, two buttons per field, machines with status, "Meer land" always on the overview; `farmcards.js`, `farmmodel.js`), Spullen (a grid of tiles with amount badges, category tabs, sort, a detail with actions and an inline "Weggooien? Dit kan niet terug." confirmation; `spullen.js`, `spullenmodel.js`) and Loopbanen (cards with level, progress and next reward, the one yellow button "Doorgaan" or "Nu starten" in the detail, need and earnings as facts; `loopbaanui.js`, `careermodel.js`). They use the tokens and the focus ring of the panel model in their own markup; moving them onto the `.ds-paneel` grid itself is open debt.

## Known deviations and open UX debt

The honest list (24 October) is [docs/DESIGN-SCHULD.md](docs/DESIGN-SCHULD.md). The ones that matter most: the map's rebuilt action bar follows the menu set since #602 but has not been seen in the game by a human;
the mouse and pointer lock on several monitors (#435); the Samen spelen screens do not use the shared menu set;
messages that are longer than the 14-word budget; loops that predate the microinteractions rule (the ringing of an incoming call, the live dot, the "knipper" and "schud" states of the rule widgets in `regelwidget.css`), which stay until their screen is moved over; when the opener pauses, the world stops for the guests too; and the players list has no way on touch. Fix a row, delete the row.

### Status colours and identity colours

Two kinds of colour, and they never mix (#479):

- **Status** — danger, ok, mission, missionActive, user, job, care, police — always comes from `--mk-*`, set by `markerColors()` (`game/js/a11y.js`) from `PALETTES`. That is what makes the three colour-blind modes work. The HUD cards (`hudcards.css`), the choice panel (`choicepanel.js`) and the minigame board (`minigamekit.js`) read them with a fallback: `var(--mk-danger, #d93f3f)`.
- **Identity** — the accent of one minigame — is a single hex in the `MINIGAMES` table of `minigamekit.js`, one per game, and it is never used for status. It says *which* game you are in, not *how it goes*.

**Samen spelen** follows the same rule (#809): the "Kom hier", "Help!" and "Kijk daar" pings take the **user**, **danger** and **mission** roles from `markerColors()` (with the shape — triangle, cross, star — as the second cue), never a second blue or red; the passive player state uses the existing ok/danger status roles, never a second orange or amber. Player colours are **identity colours** (one per player, shape included), not status colours. The map's `INK` table (`mapstyle.js`, including police blue and `#5fb4d9` for the selected area) is a deliberate **map style** with police/selection meaning, not a HUD status palette; it is documented here instead of being replaced by `--mk-*`.

`scripts/hud_kleuren_test.mjs` enforces both: a hex outside a `var()` fallback, the text/chrome colours or that one accent table fails the test.

## New UI checklist

Before a new screen, panel, card or toast merges, tick all of these (or write why not in the issue):

- [ ] **Tokens.** Only colours, fonts and radii from this page; no new hex, no flat black, no second red, no blue accent. Role colours via `markerColors()` / `--mk-*`.
- [ ] **Text.** Dutch, from the word list, within the word budget (`hudtext.js`), no sentence under 13 px, checked at 1280x720 and 1280x800 (Deck) and at 4K.
- [ ] **Surface.** A menu uses `.gm` and the `.m-*` set (one primary button, a visible focus, hints at the bottom right); a HUD element has a zone, a priority, a `SURFACES` entry and a `mayShow()` answer and takes no click.
- [ ] **One cue is never enough.** Shape, pattern, mark or word next to every colour; a caption next to every sound; the key as a token so it follows rebinding and the pad glyph.
- [ ] **Devices.** Works with keyboard, controller (a `PAD_MAPS` slot) and touch (44 px), and the hint follows the active device. Esc or B always backs out.
- [ ] **Comfort.** Respects `reduce-motion` and `reduce-flash`, no flash above three a second, no motion needed to read.
- [ ] **Samen spelen.** The six questions above are answered; no role names in text; no host-only button.
- [ ] **Picture.** Low-poly, no real brand, always summer; a render of the game, not a drawing.
- [ ] **Seen.** Looked at on screen at 1080p and at the smallest size, or marked "nog niet bekeken" in the issue (a bot's screenshot is not a human's look).
- [ ] **Docs.** A new component or token is added to this page or a detail page in the same commit; a deviation you leave goes in `docs/DESIGN-SCHULD.md`.

## Where this already applies (reference implementations)

- `game/index.html` - boot screen, logo, motion tokens, start screen
- `game/js/menu.css` and `game/js/pausemenu.js` - the menu set and the pause menu; `game/js/shopui.js` - a shop on the same panel; `game/js/spullen.js` - the Spullen section on the same panel (a list left and a detail pane right; the detail shows a turnable 3D model through the Garage's one shared renderer, `createSharedPreview`, with the arrows as `glyphHtml` keycaps and the icon as fallback, #1086)
- `game/js/hud_panel.css`, `hudcards.css`, `prompts.css` - in-game HUD, cards, hints, keycap chips, minimap border
- `game/js/phonefeed.js` - phone-notification card accent bar
- `game/js/mapview.js` and `game/js/mapstyle.js` - the map's chrome and its one colour table (`INK`)
- `game/js/minigamekit.js` and `game/js/choicepanel.js` - the minigame board and the choice panel
- `game/js/a11y.js`, `a11ylogic.js`, `a11y.css` - the accessibility settings, palettes and the pad glyph styling
- `game/js/loadscreen.js` - the load screen; `game/js/lobbyui.js` - the Samen spelen wait screens

## Rule for new UI

Before shipping any new screen/panel/toast, check it against this file and its checklist.
If it introduces a new color, a new font, or flat-black chrome, fix it
before merging - don't let one-off styling drift back in.
- **HUD:** de woordbudgetten van `hudtext.js` (`hud_text_audit`, ratchet 0 boven budget), hooguit
  zes elementen naast de minimap (hudrules.js) en geen overlappende vlakken (`scripts/ui/overlays2_scenes.js`).
- **Kiekdoar TV-overlay (HUD):** the small in-world TV on/off overlay (`furniture.js`) is a deliberate HUD exception: its colours come from its own `--fm-*` tokens (checked by `hud_kleuren_test`) and it keeps 17 px Arial as family-specific HUD typography; it is not a menu surface (`docs/DESIGN-SCHULD.md` row 11, #803).

## Input glyphs (keys and buttons)

Keys, mouse and controller buttons are one character of a CC0 font (Kenney Input Prompts 1.5, `game/fonts/input`, licence next to it), always on the white `.ds-z-glyph` plate. `game/js/inputglyphs.js` maps a key code (`KeyW`, `Escape`) or a controller button (0 to 15, or `a`, `lt`, `dpad_up`) to the glyph of the set in use (`keys`, `xbox`, `ps`, `deck`, `generic`, `touch`); the table `inputglyphs_data.js` is generated by `node scripts/input_glyph_map.mjs`. The hint shows the set of the device used last. No brand name appears in a text: a controller button is a shape or a letter. A steering wheel is not in this set and needs a separate icon.

Controller hints (`padGlyphInner` in `glyphs.js`) draw the face buttons, shoulders, triggers, sticks and d-pad with this font per controller family (`padSlotGlyph`): Xbox, shapes (PlayStation), Steam Deck, and Switch (Xbox glyphs with the Switch letters). A slot the font lacks (Switch shoulders, PlayStation view) keeps the earlier cap. Keyboard keys stay the white text cap `.hud-key`; mouse, scroll wheel and arrows use the glyph font. A key named in a player-visible text is written as a token (`{E}`, `{SPACE}`, `[E]`, "druk op E"), which `game/js/keycap.js` turns into the keycap, so it follows rebinding and the controller; `scripts/key_literals_test.mjs` fails a new literal key name.

## Controls and key hints

Every key, mouse or controller reference in a player-visible text is an icon, never a word (assignment of 21 November, #1003; the audit is `docs/KEYS-AUDIT-20-11.md`). The rules below are checked by `scripts/key_literals_test.mjs`, `scripts/key_tokens_test.mjs` and the release gate (`checkKeyLine` in `scripts/release/design_rules.mjs`, run by `rules_audit.mjs` on every added line of `game/js`).

1. **A token, nothing else.** A key or button in a player text is a `{TOKEN}`: `{E}`, `{SPACE}`, `{ESC}`, `{ENTER}`, `{SHIFT}`, `{CTRL}`, `{ALT}`, `{TAB}`, `{BACKSPACE}`, `{F8}`, `{WASD}`, `{ARROWS}`, `{ARROWUP}`/`{ARROWDOWN}`/`{ARROWLEFT}`/`{ARROWRIGHT}`, `{LMB}`, `{RMB}`, `{MOUSE}`, `{WHEEL}` (the spoken form "druk op E" and "[E]" still work). Never a key name as a word ("Spatie", "Esc", "Enter", "Shift", "WASD", "pijltjes", "LMB"), never an arrow as text (↑ ↓ ← →), never "de muisknop" for a hint. A token follows rebinding and the controller.
2. **One display path.** HTML goes through `keyTextHtml(html)` (running text), `glyphHtml(token)` (one key) or `keyLabelHtml(label)` (a hint-row label such as 'Klik', 'Pijltjes', 'F8'); labels that cannot show an icon (aria-label, title, document.title, canvas text, a log line) go through `plainKeyText(text)`, which writes the key name of the active device. A `{TOKEN}` that still reaches the screen through textContent is turned into an icon by `sweepTokens` (glyphs.js), a plain text keycap (`.hud-key`, `.m-kc`, `kbd` with a key name) is turned into its icon by `render` in the same file; do not rely on that for new code.
3. **Size: inline typesetting (#1075).** A key in running text is a factor of the surrounding text, so it reads as a word of the sentence: the glyph is 1.25 em high (never under 18 px), stands on the half letter height of the line (`--ds-kc-drop`, from the font metrics) and does not make the line taller (`line-height: 0`); a text plate has a letter of 0.8 em (never under 13 px). A hint row (HUD hints, menu footers) uses 1.5 em, in the HUD with the 26 px floor of #985. The size lives only in `game/js/ds-keycap.css` with the tokens `--ds-kc-*` in `ds-tokens.css`: no context sets a px size for a key (`scripts/keycap_maat_test.mjs`, `scripts/ui/icon_sweep.mjs`). A group of keys ("A / D", "Shift + {LMB}", "{W}{A}{S}{D}") or a word with its key is one nowrap unit (`.ds-kc-eenheid`). A larger icon never pushes the layout: the row grows, the text wraps, no hint is clipped at 1280 x 720. Details and the pictures still to check: docs/KEYCAP-MAAT-21-11.md.
4. **Controller families.** In pad mode every hint shows the button of the active family (Xbox, PlayStation shapes, Steam Deck, Switch letters) and switches live when another controller or the keyboard is used (`onPadChange`, `onDeviceChange`, the MutationObserver in glyphs.js). A world label and a canvas label ask `plainKeyText` again when the device changes. Mouse and wheel are icons (`.hud-mouse`), not words. A step the controller cannot do is hidden, not left as a key.
5. **Fallback.** A key without a Kenney glyph (a bracket, a punctuation mark, a key of a set that lacks it) is a neat text keycap in the same style (`.hud-key`, same height and plate), never bare text and never an empty box.
6. **Accessibility.** An icon carries an `aria-label` with the name ("Spatie", "Pijl links", "onderste knop"); the plate and the icon are not the only carrier of the meaning: the hint always says what the key does ("{E} instappen"), and the state is never colour alone.
7. **Rustig drukwerk.** The key is a flat plate in the paper and ink tokens, without gloss or glow; calm print (ADR 0040) switches the key animation off. The plate steps back (`.is-kbg`) around a glyph that draws its own key.
8. **Mouse.** The mouse is the Kenney mouse set in the same font and look as the keys (`mouseGlyph` in inputglyphs.js): `{LMB}` left button, `{RMB}` right button, `{MMB}` middle button, `{WHEEL}` scroll wheel, `{MOUSE}` movement (aim, look), `{DRAG}` drag side to side. 'Klik' on a menu button or in the map footer is the `{LMB}` icon (`keyLabelHtml('Klik')`); with a controller the icon becomes the matching stick or button (`padSlotFor`). The words 'muisknop', 'linkermuis', 'rechtermuis', 'muiswiel', 'scrollwiel', 'LMB', 'RMB' in a game text are findings like any key name.
9. **Findings.** A new hint without a token (a key name as a word in a game text, or a text keycap in HTML without an icon) is an important finding of the release gate. Only spoken lines and subtitles (the text must follow the clip), files that render tokens themselves, and a line marked `keywords-ok` (search words) are exempt, each with a reason in `scripts/key_literals_test.mjs`.


## Key in the button

A button that has a key or a controller button shows it as a keycap glyph **inside the button itself**, never as a loose hint next to it (assignment of 21 November, map popups). One component builds it: `dsButtonKey` and `knopToets` in `game/js/dsbutton.js`, which wrap `glyphHtml` (keycap.js). Rules:

1. **Inside, after the label** (`.ds-z-knop__label` then `.ds-z-knop__toets`); a list row puts the key on the right edge (`.ds-z-knop__toets--rechts`). `voor` puts it before the label where a button reads left to right with a leading key.
2. **The token system, nothing else.** The glyph carries `data-gk`, so `glyphs.js` follows rebinding and switches live to the device in use (keyboard, Xbox, PlayStation, Steam Deck, Switch); on touch, or where the controller has no such button (a digit), the glyph and its wrapper disappear and the button keeps its label.
3. **One size and colour.** The size is the hint-row size of ds-keycap.css (1.5 em, never a px size in a component); the glyph inherits the button's text colour, so its contrast follows the button, also in Rustig drukwerk and the colour-blind modes.
4. **The pattern keys.** Confirm is `ENTER` (A), back is `ESC` (B); a row choice is its digit 1 to 9. A disabled button shows no key.
5. **Accessible.** The wrapper is `aria-hidden`; the button carries `data-key` and `aria-keyshortcuts` (Enter, Escape, the digit).
6. **Enforced.** `controleerToetsInKnop` (scripts/lib/ds3_regels.mjs, run by ds3_dekking_test): a button with `data-key` has its glyph in the button, and no `.hint`, `.ds-toetsregel` or `.mv-help-toets` stands directly after a `</button>`.

## Navigation with controller and keyboard (menu pattern)

One pattern for every popup and menu list, so it works the same everywhere. The pad sends the same keys as the keyboard (`PAD_MAPS.menu` in controls.js), so there is one code path.

- **Confirm** Enter or A. **Back** Esc or B, one layer per press (a popup, then the card, then the screen). **Secondary action** X or Delete where it exists (clear the waypoint). **Choose a row** the digits 1 to 9, shown in the row. **Tabs and pages** Q and E or LB and RB (the pause menu's pages); they do nothing inside a modal popup.
- **Walk** ArrowUp and ArrowDown or the D-pad and stick through the buttons in reading order, ArrowLeft and ArrowRight between the footer buttons, Home and End to the ends (`navIndex`, game/js/listnav.js). A list stops at its edge; a modal popup also takes Tab and Shift+Tab round (a focus trap).
- **First focus** on the primary action (Reis nu, Begrepen, the first action of a card), so Enter or A does the main thing at once. **After closing** the focus returns to the control that opened it.
- **Visible focus** is the DS3 ring (`--ds-focus`, 2 px, offset 2), always for keyboard and pad, never after a mouse click (`:focus-visible`); `html.pad-active` keeps it for the pad.
- **Modal or not.** A popup that covers the screen is modal (focus trap, the pad stays inside, the map under it stays still); a card on the map is not (no trap; Esc gives the map back).
- **Mouse and touch keep working**: hover and click do what Enter does; a click outside a modal popup is Back.

## Context identity (#1004, trial set golf and farming)

A context (a minigame, a side job, a mission line) gets its own look with one attribute on the panel, `data-ctx="golf"` or `data-ctx="farming"`, and one row in the table in `game/js/ctxidentiteit.js`: the ink of the header band, the ink of the text on it, an emblem from `icons.js` (24 px) and a short stamp text. The rules sit in `ds-components.css` ("Context-identiteit") and use only existing inks and tokens: no hex, no font of its own, text on the band at least 4.5:1, stamp at least 13 px, never misprint on a yellow band. Calm print sets the stamp straight. No engine: a panel that wants it sets the attribute (`zetContext`). The trial: golf is the green band with the stamp GOLF, farming the yellow band with the stamp BOERDERIJ; the minigame boards of discgolf and pitch and putt and the farm HUD carry it. The owner approves the trial before the other contexts follow. Test: `scripts/ctxidentiteit_test.mjs`.
