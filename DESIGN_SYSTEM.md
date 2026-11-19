# GDE Groningen - UI Design System

> **Leeswijzer (Nederlands).** Dit document is technische naslag (het designsysteem; de regels voor wat de speler ziet staan in ui-taal.md); de tekst is daarom Engels (uitzondering in ADR 0017, #692). De regels staan in [ui-taal.md](.specs-fire/standards/ui-taal.md) en `AGENTS.md` wint bij twijfel. Nederlands is de taal van proza en van alles wat de speler ziet of hoort.

Small, deliberately simple. Every UI surface in this game (HUD, start screen,
map view, phone notifications, future menus) should read as *one* system:
fresh Gronings green, on dark crime-poster chrome, in a tall condensed
poster font. If a screen doesn't match this, it's a bug.

This page holds the overview and the rules. The details live next to it, each read from the code with file names:

| Page | What is in it |
|---|---|
| [docs/DESIGN-COMPONENTEN.md](docs/DESIGN-COMPONENTEN.md) | scale, type sizes and the 12 px floor, spacing, buttons and states, keycaps, HUD zones in numbers, cards and subtitles, dialogs, shops and horeca, minigame boards, sound, boot and load screens |
| [docs/DESIGN-BEDIENING.md](docs/DESIGN-BEDIENING.md) | keyboard, controller and touch, device detection, hints, rebinding, the mouse, accessibility settings and the colour-blind palettes |
| [docs/DESIGN-SAMEN-SPELEN.md](docs/DESIGN-SAMEN-SPELEN.md) | designing for more than one player, the players list, passive mode, Meedoen? J or N, host handover, the wait screens |
| [docs/DESIGN-SCHULD.md](docs/DESIGN-SCHULD.md) | where the code breaks these rules, honest and dated, and what could not be checked |
| [docs/DESIGN-AUDIT-CSS.md](docs/DESIGN-AUDIT-CSS.md) | what the UI CSS actually uses (colours, radii, sizes, spacing, with counts) against this page, #980 |

The second surface, the tokens and the components of **Design system v2** are in the chapter of that name below (files `game/js/ds-tokens.css` and `game/js/ds-components.css`, gallery `game/ds-galerij.html`).

**The principles behind every choice**

1. *One system.* Green on dark crime-poster chrome in a tall condensed font; one keycap, one button set, one icon language.
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
- **Minimum size: 12 px for any sentence**, on every screen (the Steam Deck's 1280x800 held at arm's length, CHANGELOG #64); menu text 13 px and up (Menurust below).
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

**Beeld en tekst.** Over een render ligt een donkergroene sluier
(`linear-gradient` van `rgba(12,20,14,.92)` links naar `rgba(12,20,14,.1)`
rechts), zodat tekst leesbaar blijft; zie `.ls-shade` in loadscreen.css.
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

## Chrome (the crime-poster look)

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

One icon language on the big map, the minimap and in the world. Every place is a **badge**: one silhouette per category next to its colour (so colour is never the only cue), a saturated fill with a lighter top and a lighter inner rim, a dark outline with a thin cream line outside it, a soft shadow, and the place's own glyph enlarged to about 60 % of the badge in cream (dark ink on yellow, lime, orange or teal, whichever reaches 3:1). Shapes and colours: care = red circle with a cross, police station = blue shield, garage = amber hexagon, station and halt = purple rounded rectangle, side job = teal diamond, shop = pink rounded square (a glyph per type), activity = green circle, food = orange circle, Ommeland = sky-blue circle, speed camera = yellow square, landmark = cream circle with a star. You (a glowing green arrow with a cream edge), goals (purple pin), missions (yellow ring), police units and your own places keep their own look so they stand out from the badges. Icons are 21 to 32 px; zoomed out only the important categories show (mapicons.js), the rest fade in over a short zoom range, and where icons collide the higher priority wins. A place has a state: present, discovered (softer) or locked (grey, dimmed; `opts.state`). The legend stays a short list of icon and name; the explanation sits in the tooltip. In the world the marker is a thin light column of fixed height, a ring on the ground and one icon above it (worldmarker3d.js), never a filled screen. `node scripts/ui_shots.mjs --scenes=scripts/ui/kaarticons_scenes.js` makes the icon sheet and the minimap and big map in town, village and Ommeland, day and night.

## Map (`mapview.js`, `kaartactie.js`, `kaartactieui.js`)

The full map is the pause menu's one full-screen section (M opens and closes it). Chrome is the radial dark green with a 2 px green border and Bebas headings, drawn from the `INK` table, not from hexes in the file.

- **Click on a place or an icon** opens a bar with exactly three actions, each with an icon and one line: **Zet waypoint** (a line and the distance), **Reis erheen** (cost and time), **Info**. A waypoint that is already there turns the first one into **Haal weg**;
  a story place says **Volg het verhaal**. Travel is its own step: **Snel reizen** (costs time and money, the recommended mode is marked) or **Zelf gaan** (sets a waypoint and you drive or walk), never both at once. The bar is on the menu set (#602): 56 px rows, 26 px Bebas labels, 18 px explanation, all colours from the tokens. A first-time explanation is shown in the map column under the search field, so it never covers the title, the search field or the zoom buttons, and it stays findable in Besturing > Hulp.
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

Menu sounds are rules (`sfx/menunav.js`), not calls: a tick for moving, a select, a back, a toggle and a rising tone for a slider, all on the UI bus, one sound per gesture, none for hover or typing; any `.gm` menu gets them for free.
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

## Design system v2 (#980, phase 1: the system; phase 2 under way: Winkel, Beleidswinkel, Garage, Te doen, Loopbanen, Verhaal and Veroverd are migrated, see docs/DESIGN-SCHULD.md)

The glass-on-dark look above stays the HUD, the pause menu's rail and the map layer. v2 adds a second surface and one shared set of tokens and components so the shop, offers, missions and careers read as *one* system with the world instead of a template repeated per screen.
It lives in two new files, `game/js/ds-tokens.css` and `game/js/ds-components.css`, which no screen loads yet (phase 2 migrates them in the order below). `game/ds-galerij.html` shows every token and component in every state on paper and on glass; `node scripts/qa/ds_galerij.mjs` takes screenshots of it in Electron (not run in phase 1, so nothing here was seen in the game). The audit of what the CSS does today, with counts, is [docs/DESIGN-AUDIT-CSS.md](docs/DESIGN-AUDIT-CSS.md).

**Where it comes from.** Principles, not a copy: the UI and the world share one palette; light cards with dark heavy text on a mid-tone scene stay readable where dark glass on dark falls away; very few colours with one fixed meaning; one shape language; type hierarchy through size and weight; the UI sits on the edges and the middle stays the world; a decision screen shows the consequence before the choice. Our own identity supplies the look: Dutch street signs and paper receipts. **Bordgroen** (sign green with white) for navigation and headings, **kentekengeel** (plate yellow) as the one accent for "you can do this now", a **cream paper receipt** for shops, offers, missions and careers, and **dark glass** only for the pause and map layers and the HUD. No real signage colour codes or organisation names are used or implied; the names are invented.

**The AAA critique (#980 comment) as rules.** Every screen was the same template, there was no hero, empty states were dead, small helper texts had low contrast and nothing moved. v2 answers each with a rule (see "Rules v2"): a hero or a stated reason why not, an empty state with a hook and an action, helper text of at least 13 px at 4.5:1, a defined motion scale that respects "Beweging beperken", and more than one card shape per screen type (offer card, receipt, ladder, character card, list row).

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

- **Status is never colour alone.** A chip carries an icon and a word; a selected card carries the edge, a tick and `aria-current`; a problem has a triangle and a sentence. The three colour-blind palettes (`--mk-*`) keep deciding the world markers; the v2 roles are UI chrome and keep a shape or word with every colour.
- **The old yellow rule is not changed for old screens.** `#e8c93a` stays the wanted star, special-day badge and mission marker. v2's `#f9c80e` is a second yellow; at migration the HUD keeps `#e8c93a` and the v2 surfaces use `#f9c80e`, and the owner decides whether the two merge (open).
- **No blue accent (kept).** "Neutral / selection" is bordgroen plus ink, not blue; the earlier rule "blue would be the only blue in the game" still stands. A blue selection colour is an open choice for the owner; it would be one token (`--ds-selectie`), changed in two places.
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
| Class | What | Parts | Modifiers and states |
|---|---|---|---|
| `.ds-papier`, `.ds-glas` | surface scope that sets the roles | none | paper is the default; nest a paper card on glass with `.ds-papier` |
| `.ds-t-*` | type roles (`display`, `kop`, `subkop`, `cijfer`, `body`, `label`, `hulp`) | none | none |
| `.ds-icoon` | one icon style: filled, one stroke weight, 24 px, colour by category | none | `--klein`, `--groot`, `--probleem`, `--succes`, `--waarschuwing`, `--selectie`, `--zacht` |
| `.ds-kaart` | paper receipt or glass card: thin edge, status edge, soft shadow | `__kop`, `__titel`, `__label`, `__cijfer`, `__tekst`, `__voet` | `--klik` (hover lifts 1 px), `--selectie` (edge + tick), `--probleem`, `--succes`, `--waarschuwing`, `--uit` (dashed, with a reason), `--kop` (bordgroen header band), `--plat`, `--in` (fade-in) |
| `.ds-chip` | status or consequence: icon or shape plus word | `__icoon` | `--primair` (Kan nu), `--selectie`, `--probleem`, `--succes`, `--waarschuwing` |
| `.ds-knop` | button; yellow is the one primary, outlined is the risky choice | `__sub` (cost, payback) | `--secundair`, `--gevaar` (outlined, risk colour), `--tekst`, `--vol`; hover, active, `:focus-visible`, `:disabled` and `[aria-disabled]` (dashed, says why), `[aria-busy]` |
| `.ds-tabs`, `.ds-tab` | row of white pills, the active one filled | none | `[aria-selected="true"]` or `--actief`, `:disabled` |
| `.ds-streep` | micro progress for time or count, always with a number beside it | `__baan`, `__vul`, `__label` | `--tijd` (amber), `--laag` (red), `--dik`; set `--ds-streep-w` |
| `.ds-cijfer` | number with context: unit, delta, n/m | `__waarde`, `__eenheid`, `__delta` | `__delta--op` (triangle up), `__delta--neer` (triangle down) |
| `.ds-callout` | the problem panel: what goes wrong with numbers, then the solution button, then the risk as a footnote | `__kop`, `__tekst`, `__cijfers`, `__oplossing`, `__terug`, `__risico` | `--waarschuwing` |
| `.ds-tip` | explanation bubble (position it in code) | none | none |
| `.ds-badge` | hotkey badge: the key as a token, the only 12 px | none | none |
| `.ds-leeg` | empty state: a picture, a hook, one action | `__beeld`, `__kop`, `__tekst` | none |
| `.ds-hero` | hero slot: one picture (3D, map fragment, character, ladder) and the text beside it, never over it | `__beeld`, `__tekst`, `__oog`, `__kop`, `__lead`, `__feiten` | `--omgekeerd`, `--smal` (stacked) |
| `.ds-rij` | list row: icon, name with a line under it, value, action | `__naam`, `__sub`, `__waarde` | `--selectie` or `[aria-current]`, `--probleem`, `--uit`, hover, `:focus-visible` |
| `.ds-hud` | frame with the four corner roles | `__links`, `__boven`, `__rechts`, `__minimap`, `__toetsen` | none |
<!-- ds-componenten:end -->

**Anatomy and states, in one place.**

- **Card (`.ds-kaart`).** Edge 1 px ink, left status edge 6 px, radius `--ds-r`, soft shadow. Header row (title left, chip right), a small label, the number (`cijfer`), one or two lines of body, a time streep under it, a footnote row for the consequence. Selected: tinted fill, the edge in the selection role, a tick top right and `aria-current="true"`. Disabled: dashed edge, quiet fill, no shadow, and the card says *why* in a line ("Niet beschikbaar: pas na 20:00 uur."); never plain grey without a reason. A card that can be clicked is `tabindex="0"` or a `button` with the focus ring.
- **Chip.** Height 32, a pill, icon (or a shape) plus a word in capitals, role colours. It names a status ("Kan nu", "Te duur") or a consequence ("+€20 bonus"); it is never a button.
- **Buttons.** Primary: yellow, ink text, ink edge, 56 px, one per screen or per card group. Secondary: transparent, 2 px edge in ink. Risk (`--gevaar`): outlined in the problem colour, never a solid red; the risk goes in a footnote under it. Text: underlined, for the third option. Under a primary that costs something, the `__sub` line says cost and payback ("€60, terugverdiend in 5 min"). States: hover lightens the yellow and raises the shadow, pressed darkens it and drops 1 px, focus is one ring, disabled is dashed with a reason, busy shows a progress cursor.
- **Tab pill.** White pill (glass: dark pill), 40 px high, label in capitals; the active one is filled (ink on paper, cream on glass), so it is never colour alone. Q and E switch tabs as in the menus.
- **Streep.** 4 px track with a fill and a label that always says the numbers ("70 van 120 min", "3 van 5"). Time uses amber, a low level red, a count the selection colour; the label carries the meaning, not the colour.
- **Problem callout.** The "consequence before the choice" pattern, in this order: (1) a red panel (soft pink fill, dark red text) with the problem as a title and an icon, (2) one or two sentences, (3) the numbers that matter (`cijfer` with a delta: "4 min over", "−€200 bij zinken"), (4) a yellow primary with the **solution**, its cost and its payback time, next to an outlined button for the risky choice, (5) the risk as a footnote. The reader sees what goes wrong, what fixes it and what it costs before anything is chosen.
- **Tooltip and explanation.** A dark bubble on paper, a light one on glass, 36 characters wide at most, a sentence of at most 14 words; shows on hover and on focus, never only on hover. A hotkey inside it is a badge.
- **Hotkey badge.** The canonical keycap as a token (`{E}`, `glyphHtml()`): follows rebinding and the pad glyph. 12 px is allowed only inside it.
- **Empty state.** A dashed card with a picture, a **hook** (what this space is for) and **one action** that fills it ("Naar de markt", "Zet een waypoint"). Never "Niets gevonden" alone. A locked state names what unlocks it.
- **Hero slot.** Each screen has one picture or a stated reason why not (a settings page is allowed none; write it in the migration card). The hero shows the thing itself: a turning vehicle, a map fragment, a character card, the ladder as a staircase. Text sits beside it, never over a 3D view, so contrast never depends on the scene.
- **List row.** 56 px, icon, name (bold) with a sub line, value in Bebas on the right, an action or chip at the end; hover tints, selection has the left edge, a problem row has the red edge plus a chip.
- **Number with context.** A bare number is never enough: add the unit, the delta (triangle up in the success tone, down in the problem tone; the triangle is the shape cue) or the n/m ("3 van 5").

### HUD corners

The HUD sits on the edges with a fixed margin (`--ds-rand-hud`, 32 px at 1080p; the real HUD keeps `--hud-edge` and `--hud-top` from `hud_panel.css`). Every corner has one role; **the middle is the world** and nothing but a subtitle, a prompt or a cinematic may enter it (the existing rules of "HUD, load screen and boot screen" and `hudrules.js` still decide *whether* an element shows).

| Corner | Role | Examples | Never |
|---|---|---|---|
| top left | incoming work | phone card, new offer, objective card | a settings control |
| top centre | time and speed, with the goal directly under it | clock, day, speed, "Naar de Grote Markt, 840 m" | more than two lines |
| top right | status and tools | money, wanted level, health, weapon | a list of more than three items |
| bottom left | minimap with the place label under it | minimap, "Binnenstad" | text over the map |
| bottom right | key hints, at most two | badge plus one word | a hint that is not a key |

No HUD element takes a click; a HUD chip is `.ds-chip`, a HUD card is `.ds-kaart--plat` on `.ds-glas`. Wording stays inside the 14-word budget.

### Motion and sound

- **Scale:** `--ds-m-snel` 120 ms (a hover or press), `--ds-m` 200 ms (a fade-in, a streep), `--ds-m-max` 250 ms (the longest anything may take). Easing is `--ds-ease`, an ease-out (`cubic-bezier(0.2, 0.7, 0.2, 1)`). Only opacity, a 1 to 8 px move and fills animate; nothing bounces, flashes or loops.
- **Reduced motion:** `prefers-reduced-motion: reduce` and `html.reduce-motion` (the game's "Beweging beperken") set the three durations to 0, so every component stops moving with no rule of its own. Meaning never depends on motion. No flash above three a second (`reduce-flash` stays).
- **Sound hooks:** components make no sound themselves; the rules in `sfx/menunav.js` do (a tick, select, back, toggle, slider). A `.ds-knop`, `.ds-tab` and `.ds-rij` are real buttons and `role="tab"`, so they are already `ITEMS`; phase 2 adds `.ds-papier, .ds-glas` to `ROOTS` and nothing else. A callout that appears is announced with the existing alert caption and, where the screen has one, the existing sound call; no new sound.

### Rules v2 (additions to the checklist)

1. **No loose hex.** `ds-components.css` has no hex, `rgb()` or `hsl()`; only `var(--ds-...)`. `ds-tokens.css` has hex only as palette (`--ds-c-*`) and `rgba()` only in a shadow. New screens use the roles, not the palette.
2. **Text.** Never under 13 px except a hotkey badge (12). Helper text uses `--ds-t-hulp` and 4,5:1. No `opacity` to make text quiet; use `--ds-tx-zacht`.
3. **No colour-only meaning.** Every colour comes with an icon, a shape, a mark or a word.
4. **One primary.** One yellow button per screen or per card group; the risky choice is outlined; the rest is secondary or text.
5. **A hero or a reason.** Every screen has a hero slot with a picture of the thing, or a line in its migration card saying why it has none.
6. **A designed empty state.** Every list, grid and offer area has a `.ds-leeg` with a hook and an action, and a locked state that says what opens it.
7. **Consequence before the choice.** A screen that asks for a decision shows the numbers first (cost, gain, time, payback, risk) in a callout or a chip row.
8. **More than one card shape per screen type.** Offers are cards with chips and a time streep, shops are receipts, careers are a ladder, characters are a character card, long lists are rows. The same card is not repeated on every screen.
9. **Motion** at most 250 ms, ease-out, off when reduced; a screen opening may fade in once (`.ds-kaart--in`), nothing loops.
10. **Two surfaces only.** Paper for shop, offers, missions, careers and anything you read and decide; glass for the pause rail, the map layer and the HUD. Do not put a glass card on paper or the reverse without the scope class.
11. **Checks.** `scripts/release/design_rules.mjs` (`checkDsLine`, `checkDsFiles`) enforces rules 1, 2 and 9 on the two files and the contrast, motion and focus checks in `scripts/ds_tokens_test.mjs`; the rest is review and the checklist below.

Extra checklist items for a v2 screen (on top of "New UI checklist"): [ ] roles only, no palette colour; [ ] one yellow primary; [ ] hero or its reason named; [ ] empty and locked states drawn in the gallery; [ ] every status has an icon and a word; [ ] tab, shift-tab and a controller reach everything with one visible ring; [ ] seen with "Beweging beperken" on; [ ] Samen spelen: the six questions.

### Migration cards (phase 2)

One card per screen: which components, which hero, and what the screen must show before a choice. **Order**, by impact against effort and by how little a screen shares with the others: (1) Winkel and beleidswinkel, (2) Te doen, (3) Garage, (4) Loopbanen, (5) Verhaal, (6) Kaart, (7) Prestaties and Foto's, (8) Samen spelen, (9) the HUD last (rules first, only for new elements).

| # | Screen | Surface | Components | Hero | Decision shown before the choice |
|---|---|---|---|---|---|
| 1 | **Winkel and beleidswinkel** (`shopui.js`, `shopui.css`, `beleidswinkel.js`) | paper receipt in the glass pause layer | `ds-kaart--kop` per item or bundle, `ds-rij` for the list, `ds-callout` for a policy with a downside, `ds-chip`, `ds-knop`, `ds-leeg` for an empty shop | the receipt itself with the shop's invented name and sign (`shopsign.js`) | price, delta on the balance, payback ("verdiend in 6 dagen") on the yellow button, the risk as a footnote under an outlined button |
| 2 | **Te doen** (`todoui.js`, `todo.js`, `todofilter.js`) | paper | `ds-kaart` offer cards with `ds-chip` (Kan nu, Nog 2 uur, Te ver) and a `ds-streep--tijd`, `ds-tabs` for Alles and Dichtbij, `ds-leeg` | a map fragment of the offer, or the giver's character | reward with bonus delta, distance, time left; "Kan nu" only when the player can start now |
| 3 | **Garage** (`garageui.js`, `garagepics.js`) | glass list, paper detail | `ds-hero` with the turning vehicle (the one renderer stays in the Garage), `ds-rij`, `ds-cijfer`, `ds-streep` for damage and fuel, `ds-callout` for a repair | the **turning vehicle** | repair cost and what it fixes, fuel for the next trip, outlined "Zo laten" for the risk |
| 4 | **Loopbanen** (`loopbaanui.js`, `loopbaankaarten.js`, `carrieresfeer.js`) | paper | `ds-hero` with the ladder drawn as a staircase (one step per level, the current one yellow-edged and ticked), `ds-kaart--selectie`, `ds-streep` (n/m to next rung) | the **ladder as a staircase**, keeping the sfeer band | what the next rung pays and asks, with the delta |
| 5 | **Verhaal** (`verhaalui.js`) | paper | `ds-hero` with a character card, `ds-rij` for chapters (current open, done ticked, locked says what unlocks it) | a **character card** (the invented person, a render of the game) | for a choice: both outcomes in chips before the buttons |
| 6 | **Kaart** (`mapview.js`, `kaartactieui.js`) | glass (the map layer) with a paper place card | `ds-kaart` for the selected place, `ds-knop` (waypoint, travel, info), `ds-chip` for cost and time | a **map fragment** of the place | travel cost and time on the button's sub line ("Snel reizen", "Zelf gaan") |
| 7 | **Prestaties and Foto's** (`achievementsui.js`, `fotomodusui.js`) | paper grid | `ds-kaart` tiles with `ds-streep` (n/m), `ds-chip`, `ds-leeg` (no photos yet: "Druk op F8") | the latest photo or the next achievement; none for an empty grid (the empty state is the hero) | for a locked one: what it needs (n/m) |
| 8 | **Samen spelen** (`lobbyui.js`, the pause menu tab) | glass | `ds-rij` for players, `ds-chip` (Meedoen, Passief), `ds-callout` for Meedoen? J/N, `ds-leeg` for an empty room | the room code and the players' shapes | who is asked and what a yes costs the others |
| 9 | **HUD** (`hud_panel.css`, `hudcards.css`, `prompts.css`) | glass | corner roles, `ds-chip`, `ds-kaart--plat`, `ds-streep`, `ds-badge` | none (the world is the picture) | the attention budget still decides what shows |

**Status after round 3 (#980):** rows 1 and 3 (round 2) and rows 2, 4 and 5 are migrated, each with what is still glass listed in `docs/DESIGN-SCHULD.md`. Row 2 (Te doen): the three nearest things are `ds-kaart` offer cards with `ds-chip` statuses, a `ds-streep--tijd` where the source has an end time, one yellow `ds-knop` ("Zet als doel") and an outlined one, and a `ds-leeg` that invites; the long list stays `.m-li` rows (shared keyboard and controller behaviour). Row 4 (Loopbanen): an empty career screen is one invitation with three steps (no dead "0 van 19" cards); the ladder is a paper card of rungs (reached ticked, the current one selected with its `ds-streep`, wage per rung). Row 5 (Verhaal): the character is a paper card with the turning portrait in an outlined field. Veroverd got two tabs (Gebieden, Beleidswinkel) so the Beleidswinkel is reachable at 720p.

**Phase 2 touches**, one PR per row so the other agents' files change one at a time: `game/index.html` (two `<link>`s), then per row the files in brackets above, plus `game/js/sfx/menunav.js` (`ROOTS`), `game/js/a11y.css` (one focus ring), `scripts/hud_kleuren_test.mjs` (accept the new tokens), `scripts/release/design_rules.mjs` (turn the loose-hex rule on for migrated files), `docs/DESIGN-SCHULD.md` (a row per deviation fixed) and `docs/DESIGN-AUDIT-CSS.md` (re-count).

## Known deviations and open UX debt

The honest list (24 October) is [docs/DESIGN-SCHULD.md](docs/DESIGN-SCHULD.md). The ones that matter most: the map's rebuilt action bar follows the menu set since #602 but has not been seen in the game by a human;
the mouse and pointer lock on several monitors (#435); the Samen spelen screens do not use the shared menu set;
messages that are longer than the 14-word budget; when the opener pauses, the world stops for the guests too; and the players list has no way on touch. Fix a row, delete the row.

### Status colours and identity colours

Two kinds of colour, and they never mix (#479):

- **Status** — danger, ok, mission, missionActive, user, job, care, police — always comes from `--mk-*`, set by `markerColors()` (`game/js/a11y.js`) from `PALETTES`. That is what makes the three colour-blind modes work. The HUD cards (`hudcards.css`), the choice panel (`choicepanel.js`) and the minigame board (`minigamekit.js`) read them with a fallback: `var(--mk-danger, #d93f3f)`.
- **Identity** — the accent of one minigame — is a single hex in the `MINIGAMES` table of `minigamekit.js`, one per game, and it is never used for status. It says *which* game you are in, not *how it goes*.

**Samen spelen** follows the same rule (#809): the "Kom hier", "Help!" and "Kijk daar" pings take the **user**, **danger** and **mission** roles from `markerColors()` (with the shape — triangle, cross, star — as the second cue), never a second blue or red; the passive player state uses the existing ok/danger status roles, never a second orange or amber. Player colours are **identity colours** (one per player, shape included), not status colours. The map's `INK` table (`mapstyle.js`, including police blue and `#5fb4d9` for the selected area) is a deliberate **map style** with police/selection meaning, not a HUD status palette; it is documented here instead of being replaced by `--mk-*`.

`scripts/hud_kleuren_test.mjs` enforces both: a hex outside a `var()` fallback, the text/chrome colours or that one accent table fails the test.

## New UI checklist

Before a new screen, panel, card or toast merges, tick all of these (or write why not in the issue):

- [ ] **Tokens.** Only colours, fonts and radii from this page; no new hex, no flat black, no second red, no blue accent. Role colours via `markerColors()` / `--mk-*`.
- [ ] **Text.** Dutch, from the word list, within the word budget (`hudtext.js`), no sentence under 12 px (menus 13 px and up), checked at 1280x720 and 1280x800 (Deck) and at 4K.
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
- `game/js/menu.css` and `game/js/pausemenu.js` - the menu set and the pause menu; `game/js/shopui.js` - a shop on the same panel; `game/js/spullen.js` - the Spullen section on the same panel (a list left and a detail pane right, no 3D preview: the Garage owns the one renderer)
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
