# GTE VI - UI Design System

Small, deliberately simple. Every UI surface in this game (HUD, start screen,
map view, phone notifications, future menus) should read as *one* system:
fresh Gronings green, on dark GTA-poster chrome, in a tall condensed
GTA-style font. If a screen doesn't match this, it's a bug.

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
| wanted stars | `#e8c93a` (unfilled: `rgba(255,255,255,0.25)`) | wanted level only - legacy yellow stays here on purpose, it's a universal GTA convention, not branding |

Never use plain black backgrounds, blue accents, or a second unrelated
brand color. Yellow is reserved for the wanted-stars convention above and
for the mission/waypoint marker (matches the existing GTA-marker language)
— everything else is green.

## Typography

- Font stack: `'Bebas Neue', 'Arial Narrow', Arial, sans-serif` everywhere.
  Bebas Neue is a free Google Font - tall, condensed, all-caps-leaning -
  that reads much closer to a real GTA HUD/poster than plain Arial Narrow
  without copying an actual Rockstar typeface. Loaded once via a
  `<link>` in `game/index.html`'s `<head>` (Google Fonts, no build step);
  every other file just references the family name and gets it for free
  via the cascade or by repeating the same font-family string. `Arial
  Narrow` stays in the stack as the immediate fallback (same tall/
  condensed character) if the webfont hasn't loaded yet.
- Headings / wordmarks: bold, `letter-spacing: 1-2px`, uppercase where it's
  a label (SIKKOM, station names) not a sentence.
- Body/HUD text: normal weight is fine, keep letter-spacing subtle (0.3px).
- Exception: pedestrian speech bubbles (`scene3d.js`'s `syncSpeechBubbles`)
  deliberately stay on plain `'Arial Narrow', Arial, sans-serif` - short
  conversational chat text at ~13px reads better in a normal-case body
  font than in a display face like Bebas Neue, which is designed for
  short, large, punchy labels, not sentences.

## Chrome (the "GTA poster" look)

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
- Keycap chips (on-screen control hints): dark gradient
  (`#4a4f47` → `#2a2e28`), green text, a harder bottom border for a
  pressed-key look - see `.hud-key` in hud_panel.css, this is the canonical
  keycap and every other "press X" hint should reuse that exact class/style
  rather than re-inventing bracket text.

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
