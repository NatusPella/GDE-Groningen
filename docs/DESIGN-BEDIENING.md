# Design system: controls, hints and accessibility

Details behind [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). Keyboard and mouse, controller and touch drive the same actions; the game code only knows the default keys and everything that changes
controls sits in front of it (ARCHITECTURE.md "Controls and accessibility"). Values are read from the code at the file named.
Sizes, buttons and messages: [DESIGN-COMPONENTEN.md](DESIGN-COMPONENTEN.md). Known gaps: [DESIGN-SCHULD.md](DESIGN-SCHULD.md).

## Three devices, one rule

`inputdevice.js` keeps the active device: `kb` (keyboard and mouse), `pad` (controller) or `touch`. **The last real input wins**, also in mixed use: take the mouse for a moment while driving
with a pad and the hints show keys, the next button press brings the pad glyphs back. The mouse must move more than 6 px to count (`MOUSE_MOVE_MIN`); synthetic keys of the pad and untrusted events
never count. `<html>` carries `dev-kb|dev-pad|dev-touch` and `data-device`; `html.pad-active` and `data-pad` (xbox, ps, deck) style the pause menu footer.
Spel > Hints & uitleg "Hints tonen voor" can override it (`hintSource`: auto, keys, pad) and `padLayout` picks the glyph set (auto, xbox, ps, switch, deck).
`node scripts/inputdevice_test.mjs`.

Design rules that follow:

1. **Every action has a way on every device the player may use**, or the screen says why not. A new feature maps to a controller slot in `controls.js` `PAD_MAPS` (touch buttons are those same slots) in the same change.
2. **Never name a key in text.** Write a key token (`{E}`, `{ESC}`) or use `glyphHtml()`; the glyph code swaps it for the player's own (rebound) key or the pad button. Menus, minigames and dialogs that read keys directly still follow rebinding
   because a rebound key is sent on as the default key (`__gde = 'remap'`).
3. **The hint shows what you can do now**, not everything: the key hints at the bottom right are at most two rows (`MAX_ROWS`), appear 2.5 s after spawning or a cutscene and then one per 1.4 s, are hidden while a card, call or subtitle is up,
   and show only with something to do. One secondary prompt at most (`MAX_SECONDARY`).
4. **Teach once.** A hint is counted per use (`hintUses`); a context card (first time in a vehicle kind or a minigame) shows once per device and never in the first quiet minutes (`hintkit.js`, `contexthints.js`).
   "Uitleg voor nieuwe spelers" and "Toetshints" can be switched off in Spel > Hints & uitleg.

## Keyboard and mouse

The table in the pause menu (Instellingen > Besturing > Toetsenoverzicht, `CONTROL_GROUPS` in `pausemenu.js`) is the source of truth; it is searchable and shows pad glyphs when a pad is in use. The keys that define the scheme:

| Key | Does | Notes |
|---|---|---|
| W A S D, mouse | walk and turn, camera | `Shift` runs, `Space` jumps (handbrake in a vehicle), `Ctrl` crouches |
| E (or F) | the use key: enter, shop, talk, start a side job | the one world prompt shows this key |
| Esc | open the pause menu; in a section go back to Spel > Overzicht, then close | the same key backs out of everything |
| M | the map (it closes with M or Esc) | |
| Q / E, `[` / `]` | in the menu: previous and next tab (sections when a screen has no tabs) | |
| Tab (hold) | the players list (Samen spelen only); while aiming: next target | see [DESIGN-SAMEN-SPELEN.md](DESIGN-SAMEN-SPELEN.md) |
| 1 to 4, wheel | weapon groups, next and previous weapon | `Ctrl+LMB` places a carbidbus |
| `[` `]` P | turn signals and hazard lights (in a vehicle) | |
| U | sound off and on | a crossed speaker with "U" shows top left while it is off |
| O | skip the story step (when it is shown) | after a failed mission too |
| F8, F11 | photo mode, full screen (desktop app) | |
| 7, 8, 9 | Samen spelen pings: Kom hier, Help!, Kijk daar | |

Rules: a key that is used for one thing in one situation may mean another in another situation (vehicle versus foot), but **not inside the same situation**; the rebind screen swaps two keys instead of letting them clash (`controls.js` `bindKey`).
A text field never remaps and stops the game keys while it has focus (`input.js` `typing`). A synthetic `keydown` in a test is always followed by a `keyup`.

**The mouse.** The game asks for pointer lock when the world is loaded and on a click or key; **Esc releases it and opens the pause menu** (`main.js`, `pointerlockchange`). The pause menu, map, phone and shops release the mouse and show the system cursor.
Embedded browsers refuse the lock; after three refused gestures in a row the cursor steers freely (`LOCK_FAILS` in `input.js`, #328), which on several monitors can let the cursor leave the window. See debt (#435).
Mouse sensitivity and invert Y are in Instellingen > Besturing, auto-aim in Spel > Camera & richten; the right stick steers the camera without any lock (`padLook`).

## Controller

Any controller in the standard layout works, in menus too. The menu rule: **the controller sends the same keys as the keyboard** (`gamepad.js`), moves the same focus, and makes the same sounds.

| Button | On foot | In a vehicle | In menus |
|---|---|---|---|
| Left stick | walk (L3 run) | steer (L3 bike sprint) | choose |
| Right stick | camera | camera (R3 look back) | scroll |
| RT / LT | attack / aim | gas / brake and reverse | `]` and `[`: next and previous tab; on the map they zoom |
| A / B | jump / crouch (in a minigame: stop) | handbrake / lights and siren | ok / back |
| X / Y | second use key / enter, use, talk | horn / exit | clear the map goal / to yourself on the map |
| LB / RB | previous / next weapon | radio / shoot from the window | `Q` and `E`: previous and next tab (sections on a screen without tabs) |
| D-pad | up phone, down kiss, left skip story step, right paint or garage | up phone, down film camera | choose |
| View / Menu | map / pause menu | map / pause menu | map / close |
| R3 (hold) | the players list (Tab) | not available | |

Per situation (`menu`, `foot`, `vehicle`, `heli`, `pigeon`, `train`, `skutsje`, `foodtruck`, `minigame`, and the minigames with their own layout) `PAD_MAPS` picks the table; the hints in each Besturing group follow it (`data-pad-ctx`).
Buttons can be swapped under Besturing > Controller (a permutation of physical buttons; Start is fixed). Rumble follows hits and crashes and can be switched off (Instellingen > Besturing). The glyph is the same white cap as a key:
Xbox and Deck letters, PlayStation shapes, the Deck's L1/R1 names. A dialog without own key handling still works: arrows walk its buttons, A clicks the focused one. `node scripts/controls_test.mjs`.

## Touch

A device counts as touch when the main pointer is coarse and cannot hover (or there are touch points and no fine pointer); a laptop with a touchscreen keeps its mouse (`touchlogic.js` `detectTouch`).
`html.touch-device` is set once the game starts. The setting "Aanraakknoppen" is auto, aan or uit (`touchControls`); `?touch=1|0` forces it.

- A virtual stick (radius 56 px, dead zone 15 %), camera swipes, and the situation's buttons are the controller's slots, so touch drives exactly what the pad does.
- Targets: the on-screen buttons are 64 px round (48 px for pause and "meer"), every other button at least 44 px high.
- A phone (shorter side under 700 px) gets a smaller HUD (down to 0.62) and the safe-area insets are respected.
- A minigame cell with a key becomes a 44 px button (`html.touch-play`).

## Accessibility

Everything below is in Instellingen > Toegankelijkheid, Geluid & ondertitels and Interface; it is applied live (`a11y.js`, pure logic in `a11ylogic.js`, `node scripts/a11y_test.mjs`).

| Need | Setting | What it does |
|---|---|---|
| Hard to read small text | `uiScale` "Grootte interface", `textSize` normaal, groot, extragroot | scales the HUD, or the map and card text by 1, 1.15, 1.3 |
| Subtitles | `subtitleSize` klein 0.85 to extragroot 1.5, `subtitleBox`, `subtitleContrast` hoog | optional dark box; "hoog" = pure white, heavier weight, nearly opaque box, at least 7:1 on any backdrop |
| Cannot hear | `soundCaptions` | `[sirene]`, `[claxon]`, `[knal, in de verte]` for non-spoken sounds; spoken lines already have a subtitle |
| Colour blindness | `colorBlind`: uit, deuteranopie, protanopie, tritanopie | swaps the marker palette (Okabe-Ito), see below |
| Motion sickness | `reduceMotion` (also on when the OS asks), `speedFeel`, `driftAssist` | no camera shake or sway, UI motion tokens go to 0, no speed FOV |
| Flashes | `reduceFlash` | removes the screen flashes (intro, trailer, searching stars, urgent stunt timer); the flashes that remain stay under three a second (WCAG 2.3.1) |
| Time pressure | `helpTime`, `helpDamage`, `helpGates`, `helpOffer` | more time, less vehicle damage, wider flight gates, and the offer after two failures |

**Colour.** Colour is never the only cue. Every map badge has its own silhouette next to its colour; routes differ by pattern (story solid, your goal dashed, a klus dotted, the care route dash-dotted, `ROUTE_DASH`);
the minimap's edge arrows carry a ring, a dot or a square; the 3D mission marker differs by shape (a ball idle, an arrow active); good and bad answers carry a check or a cross.
The marker palette in `a11y.js` (`PALETTES`, read through `markerColors()`, exposed as `--mk-*`):

| Role | uit (default) | deuteranopie | protanopie | tritanopie |
|---|---|---|---|---|
| ok | `#3fc97a` | `#56b4e9` | `#56b4e9` | `#009e73` |
| danger | `#d93f3f` | `#d55e00` | `#ff7f0e` | `#d55e00` |
| mission | `#e8c93a` | `#f0e442` | `#f0e442` | `#f0ede4` |
| missionActive | `#3fd0ff` | `#ffffff` | `#ffffff` | `#ff5fb4` |
| your goal | `#c068ff` | `#cc79a7` | `#cc79a7` | `#cc79a7` |
| job (klus) | `#ff9a3c` | `#009e73` | `#009e73` | `#e69f00` |
| care | `#ff5fb4` | `#f0ede4` | `#f0ede4` | `#56b4e9` |
| police | `#3f6fd9` | `#0072b2` | `#0072b2` | `#0072b2` |

Pairs that must stay apart in every mode are checked by distance (ok/danger, mission/missionActive, mission/job, danger/police, goal/job; `closePairs`, minimum 18) and text by contrast (4.5:1 for text, 3:1 for graphics: `MIN_TEXT`, `MIN_GRAPHIC`).
Canvas and 3D code **must read `markerColors()` and redraw on `onPaletteChange`**, never hard-code a marker colour.

**Reading.** Body text on dark chrome is `#f0ede4` or `#f2f2f2` on `#0c140e` (about 15:1). Text over the 3D world gets the `--hud-shadow` outline, and a dark veil goes under text on a picture.
Muted text is 60 to 68 % cream; do not go lower for anything a player must read.

**Time.** Nothing needs a fast reaction to read: cards stay at least 4 s, longer when long (reading time); a countdown to answer is stated in words and has a default; a menu pauses the game for the player (see Samen spelen for what that means for others).

**Language of the interface.** Dutch only; Samen spelen and not co-op or multiplayer; no role names in text ([DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md), "Language rules").
