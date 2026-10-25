# Design system: known deviations and open UX debt

Where the code differs from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) and its detail pages, found by reading the code on 24 October. It is a list of facts, not a plan; the issue board decides the order.
Nothing here was seen on screen by a human unless it says so; most was found by reading CSS and strings. Status words: **open** (code breaks the rule), **besluit nodig** (the rule or the code has to change, the owner decides), **docs** (the text was wrong, fixed or to fix).
When you fix one, remove the row in the same commit.

## Rules the code breaks

| # | What | Where | Rule | Status |
|---|---|---|---|---|
| 1 | The map's action bar was rebuilt as three clear actions (Zet waypoint, Reis erheen, Info), one waypoint, a first-time explanation. Not seen in the game by a human ("Niet in beeld bekeken", CHANGELOG, #445). Its small sub-label is 11 px; the pause menu's footer hint for the map still says only "Klik: plek kiezen" and does not show Del or X to remove the waypoint | `kaartactieui.js:44`, `pausemenu.js` `HINTS.map` | min text 12 px; a hint shows what you can do now | open, check in the game |
| 2 | Mouse and pointer lock: Esc releases the lock and opens the pause menu; embedded browsers refuse the lock, after three refused gestures the cursor steers freely and on several monitors it can leave the window. Fixed for the start of a game (#328), not tried by a human with 360 degree turns on several monitors | `input.js` `tryLock`, `LOCK_FAILS`; `main.js` `pointerlockchange` | the mouse stays in the game window | open (#435) |
| 3 | Text under 12 px: the HUD status chips (drunk, mute) at `max(11px, ...)`; the map action sub-label 11 px; the pigeon's combo tags 11 px. (Keycap interiors are exempt: `prompts.css:231` 10 px, `heist.css:26` 11 px, `index.html:128` 10.5 px) | `hud_panel.css:217`, `kaartactieui.js:44`, `pigeonmode.js:477` | no sentence under 12 px | open |
| 4 | Colours that are not tokens. **Deels opgelost (#479):** het keuzepaneel, de minigamebalk en de kaartsoorten lezen nu `--mk-*` (met terugval), dus de kleurenblindmodi doen mee; de per-minigame accenten zijn identiteitskleuren in één tabel (`minigamekit.js`) en staan zo in DESIGN_SYSTEM.md. **Wat overblijft:** Samen spelen: amber `#f2c94c`, een tweede rood `#ff5a4f`, oranje `#d9822b` voor "Passieve stand: uit", blauw `#4fb3ff` voor de "Kom hier"-ping, en de kaart-INK-tabel met politieblauw en `#5fb4d9` voor geselecteerd | `coopspelersui.js`, `coopping.js` `SOORT_KLEUR`, `mapstyle.js` `INK` | one red, no blue accent, no second brand colour | open voor die twee bestanden; de HUD is klaar |
| 5 | ~~Card category colours are fixed hex in CSS~~ **Opgelost (#479):** de kaartsoorten lezen `var(--mk-*, …)`, dus de kleurenblindmodi verven ze mee; het pictogram per kaart blijft als tweede aanwijzing | `hudcards.css`, `a11y.js` | canvas and 3D read `markerColors()`; CSS cards use icons as well | klaar |
| 6 | The Samen spelen screens carry their own CSS and inline styles instead of the shared `.gm` set: the Spelers panel buttons are bold Arial Narrow 20 px (no Bebas, no `.m-bp` / `.m-bg`, no `.m-li` rows), the wait screen and the guest's scene layer are inline styles (radius 6, black bars) | `coopspelersui.js`, `coophold.js`, `coopscene.js` | one surface, one button set | open |
| 7 | Messages longer than the 14-word card budget: the Meedoen? card counts 17 words with a mission name, the handover offer 19 (counted with `hudtext.js` `wordCount` on example names) | `coopmeedoen.js` `uitnodigingTekst`, `coophostwissel.js` `bodTekst` | `WORD_BUDGET.cardBody` 14 | open, split into a card and a hint |
| 8 | The players list has no way on touch and none in a vehicle on a controller (R3 means Tab on foot, but look back in a vehicle). The code comment says "left in the screen" while the CSS puts it top centre | `controls.js` `PAD_MAPS`, `coopspelersui.js` | every action has a way on every device | open |
| 9 | The pause menu's Besturing table says Q/E mean "vorige of volgende sectie", but the code switches tabs first and sections only on a screen without tabs | `pausemenu.js:121` against the Q/E handler at `:826` | text says what the key does | docs fix in the code text |
| 10 | Two focus rings: cream 2 px in menus, green 2 px with a controller (`!important`). Both visible, but the player sees two styles | `menu.css`, `a11y.css` | one visible focus | besluit nodig |

## Where equality of players is only partly true in the UI

| What | Why it is that way | Status |
|---|---|---|
| The first guest always plays Tessa; she belongs to the story. Others choose a figure | the story needs two leads | by design, say it in the wait screen (it does) |
| A story choice is made by the one who opened the game; guests read "X kiest:" | the world and story belong to that game; handover lets another take the world | besluit nodig: does a guest get a vote? |
| "Eruit zetten" and the lobby buttons "Iedereen stoppen", "Maximaal N spelers" are the opener's | the one thing the opener may do that others may not is remove players | by design |
| When the opener opens the pause menu, the map or a shop the world stands still for the guests too (`coopnet.js`, the guest's figure stays put); since 24-10 no notice says so. A guest's own menu stops only that guest's figure | pausing should be only for yourself, the world is one simulation | besluit nodig: this is the largest gap with "pausing is no host right" |
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
