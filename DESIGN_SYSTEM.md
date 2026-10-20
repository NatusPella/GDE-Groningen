# GDE Groningen - UI Design System

Small, deliberately simple. Every UI surface in this game (HUD, start screen,
map view, phone notifications, future menus) should read as *one* system:
fresh Gronings green, on dark crime-poster chrome, in a tall condensed
poster font. If a screen doesn't match this, it's a bug.

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
  hover state lightens to `--gron-green-light`.
- Keycap chips (on-screen control hints): one white, bright cap
  (`#fbfaf5`, dark text `#0c140e`, a grey `#a9a69b` edge underneath for a
  pressed-key look); the menu's `.m-kc` matches it - see `.hud-key` in hud_panel.css, this is the canonical
  keycap and every other "press X" hint should reuse that exact class/style
  rather than re-inventing bracket text.

## HUD, load screen and boot screen

The AAA HUD, the load screen and the boot screen follow the approved
mockups; the rules (eight zones, one thing per zone, what shows when) are in
ARCHITECTURE.md "HUD zones and rules". Cards are `linear-gradient(180deg,
rgba(23,48,31,.84), rgba(12,20,14,.84))` with a 1 px green ring, 10 px radius;
the minimap is a rounded square (18 px) with a green ring that turns red when
you are wanted; keys at the bottom right are cream caps with a hard shadow
(`#f0ede4` on `#9c998f`). Red `#d93f3f` only for danger (search box, vehicle
damage, the "niet voor jou" dash, the age badge).

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

## Map icons and world markers

One icon language on the big map, the minimap and in the world. Every place is a **badge**: one silhouette per category next to its colour (so colour is never the only cue), a saturated fill with a lighter top and a lighter inner rim, a dark outline with a thin cream line outside it, a soft shadow, and the place's own glyph enlarged to about 60 % of the badge in cream (dark ink on yellow, lime, orange or teal, whichever reaches 3:1). Shapes and colours: care = red circle with a cross, police station = blue shield, garage = amber hexagon, station and halt = purple rounded rectangle, side job = teal diamond, shop = pink rounded square (a glyph per type), activity = green circle, food = orange circle, Ommeland = sky-blue circle, speed camera = yellow square, landmark = cream circle with a star. You (a glowing green arrow with a cream edge), goals (purple pin), missions (yellow ring), police units and your own places keep their own look so they stand out from the badges. Icons are 21 to 32 px; zoomed out only the important categories show (mapicons.js), the rest fade in over a short zoom range, and where icons collide the higher priority wins. A place has a state: present, discovered (softer) or locked (grey, dimmed; `opts.state`). The legend stays a short list of icon and name; the explanation sits in the tooltip. In the world the marker is a thin light column of fixed height, a ring on the ground and one icon above it (worldmarker3d.js), never a filled screen. `node scripts/ui_shots.mjs --scenes=scripts/ui/kaarticons_scenes.js` makes the icon sheet and the minimap and big map in town, village and Ommeland, day and night.

## Menurust (meetbare criteria, #92)

`node scripts/ui_shots.mjs --sizes=1920x1080 --scenes=scripts/ui/menumeting_scenes.js` meet per pauzemenuscherm (zonder rail en voet, alleen wat in het venster staat) de woorden, de pictogrammen en de kleinste letter.

- **Tekst:** een keuzescherm (Overzicht, Kaart, Telefoon, Spullen, Garage, Prestaties, Instellingen, Foto's) toont hooguit 125 woorden; een naslagscherm (Te doen, Personages, Besturing) hooguit 270.
- **Lettergrootte:** geen tekst onder 13 px, behalve toetsplaatjes (WASD, LT/RT).
- **Beeld boven tekst:** een scherm met een lijst van dingen (Garage, Prestaties, Personages, Overzicht) heeft pictogrammen of plaatjes per item; onbekende items zijn één regel, geen muur van vraagtekens.
- **HUD:** de woordbudgetten van `hudtext.js` (`hud_text_audit`, ratchet 0 boven budget), hooguit zes elementen naast de minimap (hudrules.js) en geen overlappende vlakken (`scripts/ui/overlays2_scenes.js`).
- Stand 20 oktober (1080p): 21 schermen gemeten, alle binnen de criteria; het drukste keuzescherm is Instellingen › Camera met 123 woorden.

## Where this already applies (reference implementations)

- `game/index.html` - start screen, buttons, controls grid
- `game/js/hud_panel.css` - in-game HUD, keycap chips, minimap border
- `game/js/phonefeed.js` - phone-notification card accent bar
- `game/js/mapview.js` - full map view chrome (bring into line if it still
  shows the old yellow accent - check `#e8c93a`/`#cfcfcf` in its injected
  `<style>` block and swap for the tokens above)

## Rule for new UI

Before shipping any new screen/panel/toast, check it against this file.
If it introduces a new color, a new font, or flat-black chrome, fix it
before merging - don't let one-off styling drift back in.
