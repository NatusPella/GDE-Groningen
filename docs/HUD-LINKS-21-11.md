# HUD links: de locatiekaart en de politiechip (21-11, #1079)

Naslag bij `game/js/hudlinks.js` (de regel, puur), `game/js/hud_panel.js` (`watchLocatie`, het meten) en `game/js/minimapheat.js` (de chip).
Tests: `scripts/hudlinks_test.mjs`, `scripts/minimapheat_test.mjs`, `scripts/hud_layout_issues_test.mjs`, `scripts/hud_linkerkolom_test.mjs`.

## De locatiekaart naast de minimap

Eigenaar: de straat en de plaats naast de minimap staan onderin beeld als er niets onder wordt getoond; alleen als er wel iets getoond moet
worden, gaat het blok iets omhoog.

Wat er was: `.hud-fcol` (rechts van de minimap) bevat de locatiekaart en daaronder het speler-blok (portret en meters). Dat blok is bij
Slim-HUD vaak verborgen (`hv-off` is alleen doorzichtig), maar het hield zijn ruimte: de kaart zweefde boven een lege plek.

```
 zonder wat eronder      met het speler-blok       met een ondertitel (smal scherm)
 (de standaard)          (meters zichtbaar)        die onder de kaart komt

 +--------------+        +--------------+          +--------------+
 | minimap      |        | minimap      | Straat   | minimap      | Straat
 |              |        |              | Plaats   |              | Plaats   <- lift = overlap + gap
 |              | Straat |              | [meters] |              | ======== ondertitel
 +--------------+ Plaats +--------------+          +--------------+
  onderkant minimap = onderkant kaart     lift = hoogte meters + gap
```

### De regels

1. Standaard (`lift` 0) staat de onderkant van de kaart gelijk aan de onderkant van de minimap (`--mm-bottom`, geen extra 4 px meer).
2. `locatieLift` rekent hoeveel de kaart omhoog moet: de som van de hoogtes (plus de gap van 10 px) van alles in de kolom eronder dat zichtbaar is,
   en voor een ondertitel (`#banter-sub`, `#radio-sub`, `#story-talk`, `#rv-sub`) die horizontaal onder de kaart komt: zijn overlap plus de gap.
   De hoogste eis wint (ze tellen niet dubbel op). Maximaal 400 px; een verschil van minder dan 2 px is meetruis.
3. Hysterese (`locatieHysterese`): omhoog pas na 300 ms aaneen, omlaag pas na 600 ms aaneen. Een item dat korter dan 400 ms zichtbaar is, een
   knipperend item of een wisselend item laat de kaart dus niet bewegen. De eerste stand bij het opstarten geldt meteen.
4. De beweging is een CSS-`translate` van 0,2 s (maximaal 250 ms) op `.hud-location`, via één variabele `--hud-loc-y`. Uit bij Rustig drukwerk
   (`html.rustig-drukwerk`), Beweging beperken (`html.reduce-motion`) en `prefers-reduced-motion`. `translate` (niet `transform`), omdat `hud-rise`
   `transform` animeert.
5. Meten alleen bij verandering: `ResizeObserver` en `MutationObserver` op het speler-blok, en een lichte stijlcontrole elke 250 ms voor de
   ondertitels (geen layoutmeting zolang er niets verandert). Geen `getBoundingClientRect` per frame. Alle maten gaan via de zoom van `#hud` (`--ui`).
6. Alleen de kaart beweegt, de minimap blijft staan. Er is één bron (`hudlinks.js`); geen element heeft een eigen offset.

Op een aanraakscherm staat de kolom boven de minimap (touch.js); de kaart zakt daar naar de onderkant van die kolom als het speler-blok verborgen is.

Samen spelen: lokaal (elke speler ziet zijn eigen HUD); er gaat niets over het net.

### Wat er niet is

De voortgangskaart "N% klaar" staat sinds #898/#985 niet meer in de HUD en telt dus niet mee. De toetsbalk (`.hud-ctx`) staat rechtsonder en raakt de kaart niet.
Een extra item dat onder de kaart komt hoort in `onder` (hoogte in de kolom) of in `LOCATIE_HINDERNIS` (hud_panel.js, een element in de onderrand).

## De politiechip op de minimap

| situatie | chip |
|---|---|
| 0 sterren, 0 eenheden | geen chip |
| 0 sterren, 2 eenheden | alleen het schild met `2` |
| 3 sterren, 2 eenheden | schild `2` en ster `3/5` |
| 3 sterren, niemand in beeld | alleen het ster-deel `3/5` (gezocht maar niemand in beeld) |
| 1 ster, niemand in beeld | alleen het ster-deel `1/5` |

De tooltip en het aria-label noemen bij 0 sterren niets over sterren ("2 politie-eenheden in beeld"); zonder politie in beeld staat er alleen
"gezocht: 3 van 5 sterren" (zonder de legenda van de ring). Elk deel schuift met een korte breedte-overgang (0,2 s) in en uit; uit bij Rustig drukwerk
en Beweging beperken.

## Te verifiëren in beeld (nog niet bekeken: er is geen Electron gedraaid)

Per formaat 1280x720, 1920x1080 en 1024x600 (en `--ui` 1,0 tot 1,5):

- zonder speler-blok (Slim-HUD, vol leven): de straat en plaats staan met hun onderkant gelijk aan de minimap.
- met het speler-blok (meters zichtbaar, bijvoorbeeld na schade): de kaart staat erboven, zonder overlap, en zakt 600 ms na het verdwijnen weer.
- met en zonder voortgangskaart (die is er niet meer; controleer dat er niets in zijn plaats staat).
- tijdens ondertitels (auto-gesprek, radio): geen overlap met de kaart; op 1280x720 staan ze hoog (200 px) en raken ze de kaart niet.
- tijdens de duivenspot-stapel (`hudstapel.js` zones, plaats-zone 230 px breed): geen overlap met de zones.
- tijdens de politieachtervolging: de chip en de ster-delen kloppen (0 sterren: alleen het schild; 3 sterren: schild en ster) en de kaart blijft rustig.
- kortstondige items (minder dan 400 ms): de kaart beweegt niet; geen flikkering.
- Rustig drukwerk en Beweging beperken: de kaart springt zonder glijden.
