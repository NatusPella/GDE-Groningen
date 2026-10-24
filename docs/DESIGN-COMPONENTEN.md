# Design system: components and patterns

Details behind [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md): sizes, buttons and states, messages, dialogs, shops, minigame panels, sound and the boot and load screens.
Every value below is read from the code at the file named; if the code and this page disagree, the code is the fact and this page is a bug
(fix the page, or fix the code when the page states the rule, see [DESIGN-SCHULD.md](DESIGN-SCHULD.md)).
Input, hints and accessibility: [DESIGN-BEDIENING.md](DESIGN-BEDIENING.md). Samen spelen: [DESIGN-SAMEN-SPELEN.md](DESIGN-SAMEN-SPELEN.md).

## Scale, size and spacing

Two layouts, both zoomed so a 1280x720 window and a 4K screen show the same picture:

| Surface | Laid out in | Zoom | Where |
|---|---|---|---|
| HUD, cards, load screen, boot screen | 1440x900 "HUD px" | `--ui` on `<html>` | `uiscale.js`, `hudlook.js` `uiScaleFor` |
| Menus (`.gm-stage`) | 1920x1080 | `--mz` = `--ui` / 1.2 | `menu.css` |

- `--ui` = `max(1, min(height / 900, width / 1440))` times the player's "Grootte interface" (`uiScale`), clamped to 0.8 to 4. It never goes below 1 on a desktop
  or a Steam Deck (1280x800 keeps the full-size layout, `deck.js` `isDeckShape`). A touch phone (shorter side under 700 px) goes down to 0.62.
  Inside a zoomed root `vw`/`vh` lengths are divided by `var(--ui)`.
- The HUD edge is `--hud-edge` (46 px, never inside the safe area), the top margin `--hud-top` 34 px, the minimap `--mm-size` 250 px.
  `hudEdge()` in `hudlook.js` gives the TV-safe variant (5 % of the short side, 24 to 64 HUD px).
- **Menu spacing** works on an 8 px grid in the 1920x1080 stage: panel head padding `56px 64px 0`, body `32px 64px 48px`, list rows 56 px high
  with `0 24px` padding and a 24 px gap, a pane 64 px from its list, 48 px between head parts, tabs 56 px high with a 40 px gap.
- **Radius:** keycap 5 px (menu cap 6), legacy button 4, row and menu button 8, HUD card 10, menu panel 16, minimap 18.
- **Motion tokens** (`index.html`): `--dur-fast` 120 ms, `--dur-base` 200, `--dur-slow` 320, `--dur-bar` 300, `--ease-out`, `--ease-pop`. Only transform, opacity and bar widths animate.
  "Beweging beperken" or the OS setting adds `reduce-motion` to `<html>` and the durations go to 0 (`motion.js`).

## Type sizes

All in Bebas Neue unless noted (Arial Narrow for running text).

| Role | Size | Where |
|---|---|---|
| Menu title `.m-h1` / `.m-h2` / number `.m-num` | 80 / 64 / 44 px | `menu.css` |
| Menu tab, primary button, ghost button | 26 / 26 / 24 px | `.m-tab`, `.m-bp`, `.m-bg` |
| Menu body (`.gm`), eyebrow `.m-eb`, row value `.v` | 20 / 20 / 24 px | |
| Menu small (`.mut`, tab count, `.m-note`, row time) | 18 px | |
| HUD labels and hints | 12 to 13 px floor, see below | `hud_panel.css` |
| Subtitle | about 16 to 21 px (scales with the window) times `--sub-scale` | `a11y.css` |

**Minimum text size.** No sentence under 12 px, whatever the screen: 12 px is the floor for a 1280x800 handheld held at arm's length
(the Steam Deck rule, CHANGELOG #64). In the HUD `--hud-min` is 13 px divided by `--ui`, and text uses `max(12px, var(--hud-min))`.
Menus keep 13 px or more per screen (the Menurust measure in [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md)). Only keycap interiors (WASD, LT/RT) may be smaller.
`hudlook.js` `textPx` and `READABLE_MIN` (13) say the same: the HUD grows the text, never shrinks it. A few places stay below 12 px; they are listed as debt.
Players can raise map and card text one or two steps (`textSize`: normaal 1, groot 1.15, extragroot 1.3) and subtitles (`subtitleSize`: klein 0.85, normaal 1, groot 1.25, extragroot 1.5).
On a Steam Deck the first start uses `textSize` groot, controller hints and the Deck layout (`deck.js` `DECK_DEFAULTS`); the player's own choice always wins.

## Buttons and states

One set for every menu (`menu.css`); nothing else defines buttons, rows or tabs for a menu.

| Kind | Class | Look | Use |
|---|---|---|---|
| Primary | `.m-bp` | green `--g` fill, dark text, 56 px high, 8 px radius; hover `#62d792`; disabled grey fill and 50 % text | the one main action per screen |
| Ghost | `.m-bg` | 1 px cream ring (24 %), 56 px; hover a 6 % wash; disabled 45 % | secondary actions |
| Quiet | `.m-bt` | text only | tertiary, "Terug" style |
| Row | `.m-li` | 56 px; hover a 4 % wash; selected `rgba(63,201,122,.12)` with a 4 px green bar on the left; `.off` is dimmed | list items, settings |
| Tab | `.m-tab` | 26 px Bebas, selected = 3 px green underline, a small green dot for something new | tabs |
| Switch | `.m-sw` | 56x32, knob left = off, green with a dark knob = on | on/off settings |
| Slider | `.m-sl` | 4 px track, 20 px thumb, track turns green on the focused row | volumes, scale |
| Picker | `.m-pk` | previous / value / next, 40 px buttons | choices from a short list |
| Fold | `.m-disc` | row with a chevron that turns when open | rarely used options, "Meer opties" |

States, in this order of importance: **focus** (a 2 px cream ring, 4 px outside; rows, tabs and folds take it inside; `.gm :focus-visible`), **selected** (green wash and bar),
**hover** (a faint wash; tabs also lift their text colour), **disabled** (opacity, no hover, `cursor: default`; say why in text near it), **pressed** (`--gron-green-dark` `#0f5c30` for the legacy green button).
With a controller attached `html.pad-active` draws a 2 px green (`#3fc97a`) focus ring on everything focusable (`a11y.css`, `!important`), so the focus is never lost.
Red (`--red` `#d93f3f`, text `--redtx` `#f08a8a`) only for what destroys something: "Opnieuw beginnen" sits apart under a red line and still asks first.
A confirm step asks the same question again on the same button ("Zeker? Nog eens: €1200", `shoplist.js` `buyLabel`; "Zeker weten?" for "Eruit zetten").
On a touch device every button is at least 44 px high (`html.touch-device`); the touch controls are 64 px round (48 px for pause and "meer").

## Keycaps and hints

One keycap everywhere: `.hud-key` (HUD, 20 px high, 5 px radius), `.m-kc` (menu, 32 px high), `.pad-g` (controller glyph, same white cap): background `#fbfaf5`, ink `#0c140e`, a `#a9a69b` edge as a 2 px hard shadow
(`--keycap-*` in `a11y.css`). A hint is a cap plus one or two words ("E  instappen"). Never write a key as bracket text.
Caps and glyphs follow the player's keys and device automatically (`glyphs.js`), see [DESIGN-BEDIENING.md](DESIGN-BEDIENING.md). Each menu footer shows two to four hints, bottom right.

## HUD zones

The eight zones A to H and the rule "one thing per zone" are in ARCHITECTURE.md "HUD zones and rules"; the numbers that matter for design:

- At most **6 elements besides the minimap**, at most two of message, radio or achievement, and subtitle at once. Order of removal: P3, clock, money, keys, weapon (`hudrules.js`).
- P0 (banner, dangers, police) to P3 (tips, radio, place name, money in). During a chase, fight or race only P0 to P2 show, P3 waits at most 30 s.
- Slim mode (default) hides everything but the minimap after 8 s without input; `alles` and `minimaal` are in Instellingen > Weergave.
- Word budgets per element in `hudtext.js` `WORD_BUDGET` (label 2, hint 3, objective 6, card title 4, card body 14, phone card 14, prompt 8, subtitle 18, first-time explanation 16,
  shown twice at most). `node scripts/hud_text_audit.mjs` holds the line.
- Nothing in the HUD takes a click. Status uses icons and meters first, words second.
- A new element asks `mayShow(channel, ctx)` in `hudbus.js` and is listed in `SURFACES` ([KANALEN.md](KANALEN.md)); `scripts/hudbus_surfaces_test.mjs` fails on a surface that is not listed.

## Messages, cards, toasts and subtitles

| What | Where and how long | File |
|---|---|---|
| Message card | zone A, **one at a time**, queue of 5, 4 to 10 s (reading time), a tip at most every 20 s and stale after 35 s; same text or key updates the card instead of stacking | `hudcards.js`, `attention.js` |
| Card category | `missie` yellow `#e8c93a`, `bijbaan` orange `#ff9a3c`, `geld` green `#3fc97a`, `politie` blue `#6c9bff`, `gevaar` red `#ff5a4a`, `prestatie` purple `#d68cff`, tip cream; each also has its own icon | `hudcards.css` |
| Countdown ("3", "GO!") | one big number mid-screen, not a card | `hudcards.js` |
| Achievement | zone E, waits for result card, choice panel and duel bar | `achievements.js` |
| Phone call or message | zone A, `+N` counter for the rest, none during a call | `phonefeed.js` |
| Menu message | at the bottom of the open pause menu or map, 3 at most, 3.5 s, `role="status"`; the same text is not repeated as a card | `menumelding.js` |
| Subtitle | zone G, bottom centre; the objective dims beneath it. A Frisian or Gronings line shows as written with the Dutch under it in italic at 0.8 em (`.nl-sub`) | `subtitles.js`, `cinematics.js` |
| Sound caption | `[sirene]`, `[knal, in de verte]`: off by default, 3 at most, 2.2 s apart | `soundcaptions.js` |
| Result card | one banner (`showBanner`), holds the small cards while it is up | `cinematics.js` |

Rules: a message is **one sentence of 14 words at most**, Dutch, no exclamation chains, a key shown as a cap token (`{E}`) so it follows rebinding. Do not repeat what the HUD already shows
(the `DROP` list in `hudcards.js`). An attention order decides who may interrupt: story, then wanted and danger, then money and achievement, then discovery and flavour, then tips
(`attention.js` `PRIORITY`). Cutscenes and calls hold toasts; no new module may start its own toast timer.
The narrative scheduler (`narrative.js`) lets one talking item run at a time, 2 s apart, and waits 2.5 s after a scene.

## Dialogs and choice panels

- **Modal dialog** (a question the game needs answered; a rule, not yet checked in every dialog): one `.m-panel`-style surface, a title in Bebas, one or two lines, one primary button, the safe answer first and focused,
  Esc or B means "no". A panel the player opens (pause, map, shop, phone) releases the mouse (`exitPointerLock`) and holds the game.
- **Choice panel** (`choicepanel.js`, top centre, text jobs): kicker, the case, up to three numbered answers, one line of key hints, `body.mg-on` clears the speedometer and phone cards;
  each answer is a row with a badge; good and bad answers also differ by a mark, not only by colour. Width `min(640px, ...)`, left border 3 px in the job's accent.
- **Question with J or N** (Meedoen, host handover): a card in zone A with the question and "J = ja, N = nee", a countdown in words, and a default that is stated ("anders doe je over 10 seconden mee").
- Buttons in a dialog are real `<button>`s, so the controller's arrows walk them and A clicks the focused one even without own key handling.

## Shops and horeca

- **Shop and station machine** (`shopui.js`, `shoplist.js`): the same `.gm` panel for every shop; tabs and sections per type; an icon per item (`shopicons.js`, a vehicle preview for vehicles);
  **selecting only shows the item, buying is the one button of the detail bar** (`Kopen voor €50`, `Betalen` in tuning, `Verkopen voor €N`). A purchase asks again ("Zeker? Nog eens: €N", armed for 4 s)
  when the item has a `confirmText`, costs 1000 or more, or costs 300 or more and more than half of your money (`needsConfirm`). A refusal says why ("dat heb je al", "te duur" with the missing amount).
- **Shop names and signs** are invented (`winkelkit.js` `winkelNaam`): no real brand. Types: supermarkt, bakker, slager, snackbar, kleding, fietsen, bloemist, kapper, elektronica, tweedehands, souvenir, kiosk, kermiskraam.
- **Horeca** has no screen. Near a snackbar or kroeg (within 4 m) the E prompt appears; one press spends EUR 12 to 35 and heals 15, a toast says what happened, a 60 s cooldown answers with
  "Je hebt net al wat gehad bij X. Even laten zakken." and no money gives "Geen geld voor een hapje bij X. Eerst wat verdienen." (`horeca.js`). The pattern for a small
  transaction is: prompt, one press, one toast, a stated cooldown, no menu.
- Prices show as `€ 45` or `€45`; free is "gratis". A shop never mentions a real company.

## Minigame UI

A minigame HUD is the **board** of `minigamekit.js` (or the choice panel for text games): top centre, `.mg-board`, one at a time, `body.mg-on` clears the speedometer, route, GPS, place and phone cards.
`world.minigameUntil` stops the number keys and Space from switching weapons while it is up.

- **Kicker** (12 px, spaced caps, the game's accent colour `--mg-acc`), then one row of 20 px values: score in 24 px, turn (`Baan 3/9`, `Ronde 2/3`), time via `fmtTime` (`m:ss.cc`), wind via `windText` (`Wind 3 Bft`).
- **Cells** (`.mg-cells`): one cell per hole, bell or step; `on` yellow wash, `good` and `bad` also a check or a cross as a prefix. On touch a cell with a key is a 44 px button.
- **Power meter** (`.mg-meter`, 9 px high, a bar in the accent, a cream tick for the target): the one place a gauge appears.
- **Flash line** (22 px) for the last result, green for good and orange for bad (both with a mark), one line, replaced not stacked.
- **Medals** (`medalFrom`): 0 to 3 against [bronze, silver, gold], shown on the one result banner, not in a new screen. The key help is one line of caps (`.mg-help`) under the board.
- Keys: the controller's `minigame` table keeps B as stop; a minigame with its own layout names it in `GAME_PAD_CTX`.
- Samen spelen: say in the issue and `docs/COOP-GAST.md` who sees the board (see [DESIGN-SAMEN-SPELEN.md](DESIGN-SAMEN-SPELEN.md)).

## Sound in the UI

- Menu sounds are rules, not calls: `sfx/menunav.js` decides which key, click or focus in which menu makes which sound (tick for moving, select, back, toggle on/off, a rising tone for a slider), with a 0.04 s gap
  so one gesture never plays twice. Any menu gets them by taking the class `gm` or by being part of the pause menu; a menu that moves without DOM focus calls `menuSound('move' | 'select' | 'back' | 'toggle' | 'open')`.
  `node scripts/menugeluid_test.mjs`. The controller needs nothing of its own: it sends the same keys.
- The sounds sit on the UI bus (`sfx/ui.js`), separate from music, effects and voice (Instellingen > Geluid: master, music, effects, voice; `U` mutes and shows a crossed speaker with a "U" top left).
- The map ticks on zoom (`2200` Hz in, `1500` Hz out). Money, a wanted sting and "opgeslagen" have their own short cues in `sfx/ui.js`.
- Nothing important is sound only: a siren has a caption option (`soundCaptions`), a spoken line has a subtitle, every speech bubble and subtitle is voiced (`node scripts/voice_coverage.mjs`).
- Do not add sound to a hover.

## Boot, load and title screens

- **Boot screen** (`#loading`, `index.html`, `startscreen.js`): dark green from the first paint (inline `--ui` script, Electron `backgroundColor`), radial `#17301f` to `#0c140e`, the logo builds up, Gronings status
  lines rotate, **no key to press**; the menu waits for `menuready.js`, then slides in under it and the boot screen fades out over it (0.7 s). It shows only the age sign and the version; disclaimers and the map credit live elsewhere.
- **Title menu** (`startscreen.js`): Alleen spelen, Samen spelen, Wat is er nieuw, Instellingen, Over, Afsluiten (desktop app only). One primary choice, text navigation on the left, the same `.gm` surface as the pause menu.
  Alleen spelen opens "Opgeslagen spellen" with Doorgaan first and Nieuw spel as the first card; without a savegame it starts a new game at once.
- **Load screen** (`loadscreen.js`, `.css`): a slow Ken Burns render from `game/img/laad/` chosen by where you go, the logo, "Eerder in het verhaal", a "Je gaat verder in" card, one rotating tip line and a real progress bar
  (one tile lights up per twelfth, from `streamPending`). For loading a save, fast travel and jumps over 700 m; fast travel shows only the place and the tiles. Reduced motion stops the drift.
- A black fade (0.35 s, `coophud.js` `fadeFlash`) marks a player joining or leaving; it is a fade, not a flash.
