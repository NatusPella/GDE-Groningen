# HUD links: de locatiekaart en het wanted-systeem (21-11, #1079, #1142)

Naslag bij `game/js/hudlinks.js` (de regel, puur), `game/js/hud_panel.js` (`watchLocatie`, het meten) en `game/js/wantedstate.js` (de status en de schermlezertekst van de wanted-kaart).
Tests: `scripts/hudlinks_test.mjs`, `scripts/wanted_een_test.mjs`, `scripts/hud_layout_issues_test.mjs`, `scripts/hud_linkerkolom_test.mjs`.

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

## Eén wanted-systeem (#1142)

Eerder waren er drie weergaven van "gezocht": lege sterren rechtsboven, een schild-chip met aantal eenheden en `n/5` op de minimap (met een heat-ring om het politie-icoon) en een rij sterren op de kaart "Weg uit beeld / Vrij". Dat las als een dubbel systeem (bij 0 sterren stond er toch een `3` en vijf lege sterren). Nu is er één plek met sterren: de minimap (#1175, eigenaar 21-11: "Ik vond alleen de sterren op de mini-map prima"; de grote sterren rechtsboven zijn weer weg).

| onderdeel | regel |
|---|---|
| sterren op de minimap | de enige plek met sterren: een klein papieren vak linksboven op de kaart (`.hud-mm-sterren`), alleen bij 1 ster of meer (ook in Alles; geen lege rij, geen 4 s nagloed), geen cijfers; de schermlezer hoort ze niet apart (aria-hidden) |
| statuskaart rechtsboven | alleen tekst, zonder sterren: "Ze zoeken je" tijdens de achtervolging, "Weg uit beeld" met de aftelbalk als ze je kwijt zijn (`wantedStatus`); verborgen bij 0 sterren |
| kaart "Weg uit beeld / Vrij" | kort statuskaartje onder de HUD-kolom rechts (zone C), zonder eigen sterren; hetzelfde voor "Gezocht" en "Rustiger" |
| minimap | geen chip, geen ring, geen stippen, geen sterren; de politie staat als gewone politie-iconen (hoogstens de drie dichtstbijzijnde) en de rand van de kaart is rood tijdens de achtervolging en roze als ze zoeken (geen beweging) |
| schermlezer | één tekst, `wantedAnnounce`: "Gezocht: 3 van 5 sterren, achtervolging" (aria-label van de kaart en de aankondiging bij een wijziging); de minimap heeft alleen "Kaart openen" |
| legenda "Zo werkt de kaart" | "Politie-eenheid: de dichtstbijzijnde eenheden in beeld; de sterren staan linksboven op de kaart (alleen als je gezocht wordt), en de rand van de kaart is rood tijdens een achtervolging" |

HUD-zones: de statuskaart (geen sterren) staat in zone C (rechtsboven, onder de klok). De kaart "Achtervolging eindigt zonder arrestatie" staat in zone A (links boven) en het doel in zone B (midden boven); ze delen geen kolom met de wanted-kaart, en de rand-tag zakt onder de kolom rechts (`randTop`).

Samen spelen: de politie jaagt op één doelwit (`docs/COOP-GAST.md`, "Politie voor gasten"). Iedereen ziet de sterren van dat doelwit (snapshot); bij wie het spel opende staat het niveau van een gezochte gast ook in het HUD (`world.coopHudWanted`). Dat blijft zo: de sterren op de minimap en de statuskaart tonen `max(world.wanted, world.coopHudWanted)`, op elke client.

## Te verifiëren in beeld (nog niet bekeken: er is geen Electron gedraaid)

Per formaat 1280x720, 1920x1080 en 1024x600 (en `--ui` 1,0 tot 1,5):

- zonder speler-blok (Slim-HUD, vol leven): de straat en plaats staan met hun onderkant gelijk aan de minimap.
- met het speler-blok (meters zichtbaar, bijvoorbeeld na schade): de kaart staat erboven, zonder overlap, en zakt 600 ms na het verdwijnen weer.
- met en zonder voortgangskaart (die is er niet meer; controleer dat er niets in zijn plaats staat).
- tijdens ondertitels (auto-gesprek, radio): geen overlap met de kaart; op 1280x720 staan ze hoog (200 px) en raken ze de kaart niet.
- tijdens de duivenspot-stapel (`hudstapel.js` zones, plaats-zone 230 px breed): geen overlap met de zones.
- tijdens de politieachtervolging: sterren op de minimap en rechtsboven alleen de statuskaart Ze zoeken je, de minimaprand rood, geen chip; bij 0 sterren geen sterren en geen kaart rechtsboven.
- kortstondige items (minder dan 400 ms): de kaart beweegt niet; geen flikkering.
- Rustig drukwerk en Beweging beperken: de kaart springt zonder glijden.
