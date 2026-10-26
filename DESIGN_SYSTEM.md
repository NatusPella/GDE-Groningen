# GDE Groningen - UI Design System

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
| `--gron-green-dark` | `#0f5c30` | pressed/active button shade |
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
- Focus is always visible: a 2 px cream ring in menus, green with a controller attached (`html.pad-active`). Never remove an outline without giving another.
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
damage, the "niet voor jou" dash, the age badge).

**Attention budget** (`attention.js`, `hudbus.js`, `hudrules.js`; numbers in [docs/DESIGN-COMPONENTEN.md](docs/DESIGN-COMPONENTEN.md)):
the order of who may interrupt is story, then wanted and danger, then money and achievement, then discovery and flavour, then tips (P0 to P3 on the HUD).
One card at a time in zone A, one objective line, one phone card with a "+N" counter, at most two key hints, at most six elements besides the minimap, and nothing at all that takes a click.
During a chase, fight or race only P0 to P2 show; during a call or a subtitle tips and the radio wait. A new element asks `mayShow()` in `hudbus.js` and is listed in `SURFACES` ([docs/KANALEN.md](docs/KANALEN.md)).
Messages are Dutch sentences of at most 14 words; subtitles at most 18. Subtitles sit at the bottom centre, dim the objective, and a Frisian or Gronings line shows the Dutch under it in italic.
The boot screen is dark green from the first paint and needs no key; the load screen shows a render of where you are going, the story so far and a real progress bar (details in the component page).

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

**Pause menu structure** (`pausemenu.js` `SECTIONS`, `RAIL_GROUPS`, `SUBTABS`). A fixed rail on the left never changes shape; the sheet beside it shows one section. Three groups:
**Spel** (tabs Overzicht, Samen spelen, Spelers, Opslaan & stoppen, Spelen, Camera & richten, Hints & uitleg), **Verhaal** (Opdrachten, Personages, Aanwijzingen, Veroverd), **Loopbanen** (vakken, bijbanen, Vissen, Boerderij), **Activiteiten** (Alles, Dichtbij) /
**Kaart** (full screen, no rail), **Spullen**, **Garage**, **Prestaties**, **Foto's** / **Instellingen** (Beeld, Geluid & ondertitels, Besturing, Interface, Toegankelijkheid, Foutrapport, Cheats; Besturing and Cheats also open as their own sections).
Spel > Overzicht is home: the menu opens there, Esc from another section goes back to it, then closes; from M or the phone Esc closes at once. A section that belongs under another goes back to its parent.
The footer shows two to four hints per section (`HINTS`: keys or controller glyphs, clickable). Before a game has started only Spel, Instellingen and Besturing exist.
**Spelers** shows only in a Samen spelen session. Settings use switches, sliders and previous/value/next pickers; one setting per row with a line of explanation under it, rare options folded behind "Meer opties".
A section has one focal point, at most 125 words (a choice screen) or 270 (a reference screen), pictures before words. In a session the rule is that the menu pauses only the player who opened it
(see "Samen spelen in the design"); the code does not fully do that yet, it is in the debt list.

## Map icons and world markers

One icon language on the big map, the minimap and in the world. Every place is a **badge**: one silhouette per category next to its colour (so colour is never the only cue), a saturated fill with a lighter top and a lighter inner rim, a dark outline with a thin cream line outside it, a soft shadow, and the place's own glyph enlarged to about 60 % of the badge in cream (dark ink on yellow, lime, orange or teal, whichever reaches 3:1). Shapes and colours: care = red circle with a cross, police station = blue shield, garage = amber hexagon, station and halt = purple rounded rectangle, side job = teal diamond, shop = pink rounded square (a glyph per type), activity = green circle, food = orange circle, Ommeland = sky-blue circle, speed camera = yellow square, landmark = cream circle with a star. You (a glowing green arrow with a cream edge), goals (purple pin), missions (yellow ring), police units and your own places keep their own look so they stand out from the badges. Icons are 21 to 32 px; zoomed out only the important categories show (mapicons.js), the rest fade in over a short zoom range, and where icons collide the higher priority wins. A place has a state: present, discovered (softer) or locked (grey, dimmed; `opts.state`). The legend stays a short list of icon and name; the explanation sits in the tooltip. In the world the marker is a thin light column of fixed height, a ring on the ground and one icon above it (worldmarker3d.js), never a filled screen. `node scripts/ui_shots.mjs --scenes=scripts/ui/kaarticons_scenes.js` makes the icon sheet and the minimap and big map in town, village and Ommeland, day and night.

## Map (`mapview.js`, `kaartactie.js`, `kaartactieui.js`)

The full map is the pause menu's one full-screen section (M opens and closes it). Chrome is the radial dark green with a 2 px green border and Bebas headings, drawn from the `INK` table, not from hexes in the file.

- **Click on a place or an icon** opens a bar with exactly three actions, each with an icon and one line: **Zet waypoint** (a line and the distance), **Reis erheen** (cost and time), **Info**. A waypoint that is already there turns the first one into **Haal weg**;
  a story place says **Volg het verhaal**. Travel is its own step: **Snel reizen** (costs time and money, the recommended mode is marked) or **Zelf gaan** (sets a waypoint and you drive or walk), never both at once. A first-time explanation of three lines is shown next to the map and stays findable in Besturing > Hulp.
- **One waypoint at a time**: a line on the map, the distance, a beacon in the world (`worldmarker3d.js`). Clear it by clicking it again, right click, `Del`, or X on a controller. A click within 30 m of it counts as a click on it.
- **Travel mode** selector in the header, opening on how you travel now; roads you may not use dim and trunk roads dash red for walkers and cyclists ("niet voor jou").
- **Legend and layers**: a short list of icon and name in collapsible groups that are also switches, open the first time; the explanation sits in the tooltip, not in the legend. Footer hints at 13 px under the map.
- **Controller**: a crosshair in the middle, A sets a goal under it, X clears it, Y goes to yourself; Shift+click moves you (on by default, switch it off in Instellingen > Interface; never during a mission, a cutscene or with police behind you).
- **Routes** have a colour and a pattern each: story solid yellow, your goal dashed purple, a klus dotted orange, the care route (food, garage) dash-dotted pink (`ROUTE_COLORS`, `ROUTE_DASH`, up to three at once from `routing.js`).
- A guest can set a waypoint but cannot travel (see Samen spelen).

## Menurust (meetbare criteria, #92)

`node scripts/ui_shots.mjs --sizes=1920x1080 --scenes=scripts/ui/menumeting_scenes.js` meet per pauzemenuscherm (zonder rail en voet, alleen wat in het venster staat) de woorden, de pictogrammen en de kleinste letter.

- **Tekst:** een keuzescherm (Overzicht, Kaart, Telefoon, Spullen, Garage, Prestaties, Instellingen, Foto's) toont hooguit 125 woorden; een naslagscherm (Te doen, Personages, Loopbaan, Boerderij, Besturing) hooguit 270.
- **Lettergrootte:** geen tekst onder 13 px, behalve toetsplaatjes (WASD, LT/RT).
- **Beeld boven tekst:** een scherm met een lijst van dingen (Garage, Prestaties, Personages, Overzicht) heeft pictogrammen of plaatjes per item; onbekende items zijn één regel, geen muur van vraagtekens.
- **HUD:** de woordbudgetten van `hudtext.js` (`hud_text_audit`, ratchet 0 boven budget), hooguit zes elementen naast de minimap (hudrules.js) en geen overlappende vlakken (`scripts/ui/overlays2_scenes.js`).
- Stand 20 oktober (1080p): 21 schermen gemeten, alle binnen de criteria; het drukste keuzescherm is Instellingen › Camera met 123 woorden. Daarna is het pauzemenu herschikt (#430: Spel, Verhaal, Loopbanen, Activiteiten, Instellingen); de meting en de namen hierboven zijn niet opnieuw gedaan.
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

## Known deviations and open UX debt

The honest list (24 October) is [docs/DESIGN-SCHULD.md](docs/DESIGN-SCHULD.md). The ones that matter most: the map's action bar and its footer hint are not yet seen in the game (#445) and use an 11 px label;
the mouse and pointer lock on several monitors (#435); a number of screens still use hexes of their own (choice panel, minigame board, card kinds, the players list); the Samen spelen screens do not use the shared menu set;
messages that are longer than the 14-word budget; when the opener pauses, the world stops for the guests too; and the players list has no way on touch. Fix a row, delete the row.

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
- `game/js/menu.css` and `game/js/pausemenu.js` - the menu set and the pause menu; `game/js/shopui.js` - a shop on the same panel
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
