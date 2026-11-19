# Audit van de UI-CSS tegen het designsysteem (#980, fase 1)

Naslag. De regels staan in [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) en [ui-taal.md](../.specs-fire/standards/ui-taal.md); dit is een telling van wat de CSS feitelijk doet, op papier gelezen en geteld (nog niet op het scherm bekeken). Gemeten op de acht bestanden `menu`, `pausemenu`, `hud_panel`, `hudcards`, `shopui`, `prompts`, `a11y` en `loadscreen` in `game/js/` (samen 2.600 regels CSS zonder commentaar), met een eenmalig telscript; de getallen zijn een momentopname, geen test.

## Wat er feitelijk staat

| Onderwerp | Telling | Wat het zegt |
|---|---|---|
| Kleur: zes-cijferige hex | 166, waarvan 42 buiten de (al ruime) lijst van `design_rules.mjs`, in 31 unieke waarden | Naast `#f0ede4` (47 keer), `#3fc97a` (32), `#0c140e` (22) en `#e8c93a` (16) staan losse tinten als `#1b2027`, `#a3b2a6`, `#f3dc6a`, `#62d792`, `#13221a` |
| Kleur: `rgba()` | 404 | Het grootste deel zijn doorzichtige varianten van crème en groen (lijnen, vlakken); ze zijn niet te tellen als eigen kleur |
| Kleur via een token (`var(--g)`, `--ink`, `--gron-*`, `--hud-*`, `--mk-*`) | 364 | Meer dan de losse hex, maar de tokens leven op drie plekken (`.gm`, `:root` in `hud_panel.css`, `a11y.css`) en heten overal anders |
| Tokens die een bestand zelf definieert | `menu` 18, `hud_panel` 25, `hudcards` 7, `prompts` 6, `pausemenu` 4, `a11y` 4; `shopui` en `loadscreen` 0 | Geen gedeeld bestand: `shopui` en `loadscreen` hebben 31 en 3 `var()`-gebruiken zonder eigen definitie |
| Verlopen (`gradient(`) | 65 | Het huidige glas-op-donker gebruikt ze overal (kaart, paneel, sluier); v2 kent er geen |
| Afrondingen (`border-radius`) | 20 verschillende waarden over 144 declaraties | `8px` 29x, `50%` 17x, `10px` 15x, `12px` 14x, `2px` 12x, `6px` 10x, `999px` 8x, `16px` 7x, `4px` 7x, daarnaast `5px`, `14px`, `3px`. Het document kent 4, 8, 10 en 18 px |
| Lettergrootte (`font-size`) | 411 declaraties in 77 verschillende waarden; 160 daarvan op een van de menumaten 80/64/44/26/24/20/18 px; 50 zijn geen px (`em`, `%`, `max()`, `calc()`) | `18px` 76x, `20px` 38x, `16px` 38x, `22px` 27x, `15px` 23x, `24px` 17x, `28px` 14x, `14px` 14x, `26px` 13x. Maten als 15, 16, 17, 19, 22 en 30 staan niet in de schaal van het document |
| Lettergrootte onder 13 px | 5 declaraties: `prompts.css` 8,5 px en 10 px (toetsplaatje in de WASD-hint), `pausemenu.css` 12 px (toetsplaatje), `a11y.css` 12 px (padknop) en 12 px (`.pk-help`, een hulpzin met `opacity: .7`) | De vier toetsplaatjes mogen; `.pk-help` is een zin onder de leesnorm en met laag contrast (zie DESIGN-SCHULD rij 3) |
| Lettertypestack | 61x `'Bebas Neue', 'Arial Narrow', Arial, sans-serif`, 26x `'Arial Narrow', Arial, sans-serif`, 3x monospace (`Consolas`), 4x `inherit` en dubbele aanhalingstekens | De stack klopt; de monospace staat voor codevelden |
| Ruimte (`padding`, `margin`, `gap` in px) | 922 waarden in 37 verschillende maten; 335 (36 procent) niet op de 4-px-basis | Meest gebruikt: 8 (127x), 24 (93x), 12 (92x), 16 (84x), 4 (80x), 10 (77x), 6 (69x), 14 (44x), 2 (42x), 18 (32x). Oneven maten (10, 6, 14, 18, 3, 5, 7) zijn de afwijking |
| `!important` | 42 (a11y 24, hud_panel 9, menu 4, pausemenu 3, hudcards 2) | `a11y.css` overschrijft per ontwerp; de rest is meestal reduced-motion |
| Beweging beperken | Een eigen tak in `menu` (5), `hud_panel` (8), `hudcards` (1), `prompts` (1) en `loadscreen` (3); niet in `pausemenu`, `shopui`, `a11y` | `pausemenu` en `shopui` vallen onder de globale regel `.gm *` in `menu.css`; `html.reduce-motion` en `prefers-reduced-motion` worden niet overal beide gelezen |
| Transities en animaties | 132 | Geen enkele gedeelde tijdschaal; de duur staat overal als losse waarde |

## Waar dit afwijkt van DESIGN_SYSTEM.md

1. **Kleur buiten de tokens.** Het document zegt "nooit een bijna-gelijke hex bedenken"; 42 hex-waarden buiten de lijst zijn dat toch. Dit staat al in DESIGN-SCHULD rij 4 en in #479.
2. **Twee rood- en twee geeltinten.** `#d93f3f` is het enige rood, maar op een crème ondergrond haalt het geen 4,5:1; en `#e8c93a` (wanted en missie) staat naast losse gelen als `#f3dc6a` en `#f2c230`.
3. **Radius.** Het document noemt 8 px voor menuknoppen, 10 px voor HUD-kaarten, 4 px voor de oude knop en 18 px voor de minimap; de code kent 20 waarden. Er is geen "één afrondingsradius".
4. **Typografieschaal.** 77 lettergroottes tegen een schaal van zes; veel tussenmaten (15, 17, 19, 22) zijn zoektochten naar passen, geen rol.
5. **Ruimte.** Een derde van de ruimtewaarden valt buiten een 4-px-basis. Het document heeft geen ruimteschaal; alleen de menurijen zijn vast (56 px).
6. **Tokens zonder eigenaar.** Het document noemt drie plekken voor tokens; `shopui.css` en `loadscreen.css` gebruiken er zonder ze te definiëren, en `pausemenu.css` definieert er vier terwijl het 172 keer een `var()` leest.
7. **Verlopen.** 65 verlopen staan in de huidige "crime-poster look" (de radiale achtergrond en de kaart); dat is bewust en blijft in de bestaande schermen. De v2-componenten gebruiken alleen vlakken.
8. **Contrast van hulptekst.** `muted` is crème op 68 procent (`--mut`); op glas haalt dat de norm, maar kleine tekst met `opacity` (`.pk-help` op .7) en de kleinste maten zijn de plekken waar het laag blijft. Het v2-systeem heeft daarom een aparte rol voor hulptekst (`--ds-tx-zacht`, minstens 4,5:1) en een vloer van 13 px.
9. **Eén focusring.** Twee stijlen (crème in `.gm`, groen met een pad); v2 kent er één per oppervlak (inkt op papier, crème op glas).

## Wat dit niet is

Geen test: er is geen drempel die hierop faalt. De bestaande schermen blijven zoals ze zijn tot fase 2 (migratie); `scripts/release/design_rules.mjs` keurt alleen nieuwe regels, en voor de twee nieuwe bestanden (`ds-tokens.css`, `ds-components.css`) strenger. Niets hier is op het scherm bekeken.
