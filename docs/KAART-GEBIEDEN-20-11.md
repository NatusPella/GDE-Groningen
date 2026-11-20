# Kaart en minikaart: kleuren en gebiedstoestanden (20-11)

Opdracht van de eigenaar: de kleuren van kaart en minikaart bij het nieuwe designsysteem laten aansluiten, en de gebieden veel visueler maken (onzichtbaar, zichtbaar, bezig, veroverd). Dit doc is de inventaris van de stand ervoor en de beschrijving van wat er is veranderd. Naslag; de regels voor de kaart staan in [`.specs-fire/standards/wereld.md`](../.specs-fire/standards/wereld.md) en [`ui-taal.md`](../.specs-fire/standards/ui-taal.md), het designsysteem in [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md).

## Hoe het was (inventaris)

- **`mapstyle.js`** is de ene stijltabel van de kaarten: `MAP_PALETTE` (grote kaart en de voorgerenderde provinciepiramide, donker rustig land), `MINI_PALETTE` (minikaart, lichter) en `INK` (alles wat de kaart bovenop het land tekent: tekst, haloos, paneelchroom, markers, routes, landgrenzen). Alles losse hexen, los van `ds-tokens.css`.
- **Gebiedstoestanden** (`gebiedenkaart.js`, `gebieden.js`): drie toestanden. Onveroverd (stippellijn, geen vulling), bezig (vulling van oker naar groen met een doorgetrokken lijn) en veroverd (vulling en lijn in de vlagkleur plus een getekend vlaggetje). De kleuren waren losse waarden (`rgb(150,184,70)`, `#f3ead3`, `#1d1b17`, `#f0ede4`).
- **Onbezocht** (`kaartontdekking.js`, `mapview.js`): de onbezochte buurten worden als één grijsgroen masker (`INK.discovery`) over het land gelegd, zonder structuur. `mapfog.js` is de oude mistlaag en blijft alleen als naslag en voor zijn test.
- **Legenda** (`tekenLegenda`): drie rijen (Nog niet begonnen, Bezig, Veroverd), alleen op de grote kaart.
- **Minikaart** (`tekenVeroverdMini` in `hud_panel.js`): dezelfde lagen en toestanden, zonder tekst, achter de kaartlaagschakelaar `veroverd`.
- **Veroverd-logica** (`gebieden.js`): `voortgang()` geeft klaar, totaal, deel en voltooid; het eigen profiel (`gde-gebieden-v1`, `bezocht` en `gedaan`) is per speler (#429).

## Wat er veranderd is

### Eén kleurmodule (`game/js/kaartkleuren.js`)

De kleuren van de kaartchroom komen uit de ds-tokens. De tabel `DS_TERUGVAL` is gelijk aan `ds-tokens.css` (de test `kaartkleuren_test.mjs` vergelijkt ze) en `dsKleur(naam)` leest de token uit de pagina als die er is. `INK` in `mapstyle.js` neemt zijn designsysteemrollen daaruit: `cream` (crème), `paper` (papier), `dark` en `panelTop` (glas), `greenLight`, `red` en `amber` (de glaskleuren), `yellow` (geel van de zeefdruk), `amberInk` (inkt) en `greenDark` (bordgroen). De gebiedstoestanden gebruiken de vijf inkten van de zeefdruk (papier, inkt, bordgroen, geel, roze) en het glas, geen losse hex meer.

(Op 21-11 is het land alsnog op de tokens gezet, zie "Kaartlagen in de nieuwe kleuren" verderop.) Het land zelf (`MAP_PALETTE`, `MINI_PALETTE`) was op 20-11 bewust niet veranderd: de grote kaart gebruikt de voorgerenderde provinciepiramide die bij de wereldbouw wordt gemaakt, en een ander land zou tot de volgende wereldbouw niet bij die tegels passen. Het contrast tussen de overlay en het land is getest.

### Vier toestanden van een gebied (`game/js/gebiedtoestand.js`)

| Toestand | Betekenis | Vlak | Lijn | Icoon |
| --- | --- | --- | --- | --- |
| Nog onzichtbaar | nooit bezocht | donker vlak met fijn puntraster (6 px halftone) | zacht en dun | oog doorgestreept (`oog_uit`) |
| Zichtbaar | bezocht, nog niets gedaan | gedempte papiervulling | stippellijn | geen |
| Aan het veroveren | al iets gedaan | gele vulling die met de voortgang meegroeit | effen gele rand | voortgangsring (en `ronde` in de legenda) |
| Veroverd | alles gedaan | volle vulling in lichtgroen (`--ds-c-licht-groen`) | dikke rand met donkere band | vlag (`vlag`) |

Nooit alleen kleur: elke toestand heeft een eigen lijnsoort, vlak en icoon. Een onzichtbaar gebied heeft geen naam op de kaart. Een bezochte buurt maakt zijn wijk, woonplaats en gemeente zichtbaar (`zichtbareGebieden`). Wat je gedaan hebt gaat voor: bezig en veroverd tellen ook als de bezoeklijst het gebied niet kent. De legenda toont de vier toestanden met hetzelfde patroon als op de kaart en met woorden. De minikaart tekent dezelfde toestanden kleiner en zonder tekst (raster, stippellijn, gele rand met ring, vulling met vlag).

**Beweging.** De toestanden zijn statisch: er is geen animatie, dus er is niets dat bij reduce-motion weg moet. De onthulling van een net bezocht gebied (`kaartontdekking.js`) behoudt zijn eigen regels.

## Samen spelen

De veroverde voortgang is per speler (#429) en de kaart is lokaal: de toestanden komen uit het eigen profiel van de speler, er is geen nieuw netwerkveld en geen EXTRA-bericht. Zie [COOP-GAST.md](COOP-GAST.md).

## Tests

`scripts/kaartkleuren_test.mjs` (tokens gelijk aan `ds-tokens.css`, rollen van `INK`, contrast), `scripts/gebiedtoestand_test.mjs` (toestand per gebied, uiterlijk, legenda, iconen, puur) en de bijgewerkte `scripts/gebieden_kaart_test.mjs` en `scripts/mapstyle_test.mjs`. Beelden: `scripts/qa/kaart_toestanden.page.js` met `scripts/qa/gebieden_shots.mjs --page=...`; de beelden staan in `docs/beeld-20-11/kaart/`.

## Kaartlagen in de nieuwe kleuren (21-11)

Het land, het water, de wegen, de gebouwen en de markers staan nu ook op de tokens. De kaart is het GLAS-oppervlak van het designsysteem (donker groen glas), dus het land is glasgroen met bordgroen voor park en bos, het water het grachtwater van DESIGN_SYSTEM.md (`#2c7790`, het designsysteem heeft geen blauwe token), de wegen crème en zacht crème, de gebouwen papier, de bielzen papier. Geel is alleen voor route en doel, licht groen alleen voor veroverd, rood voor politie en gevaar. Eén bron: `kaartLand()` in `kaartkleuren.js`, die `MAP_PALETTE` en `MINI_PALETTE` in `mapstyle.js` voedt (de maten blijven in `mapstyle.js`).

**Goedkoopste route: herkleuren bij het laden, niet de wereld opnieuw bouwen.** De voorgerenderde provinciepiramide (`provmap/z*.png`) is in de oude kleuren gebakken. `provincemap.js` herkleurt een tegel één keer als hij binnenkomt (`herkleurRaster`: elke pixel naar de nieuwe kleur van de dichtstbijzijnde oude kleur, de alfa blijft, een opzoektabel per kleur) en bewaart het canvas. De tegelcache van de kaart (mapview) tekent daarna zoals altijd; er is geen extra tekenpas per frame. Een piramide die al in het nieuwe palet is gebakken (`scripts/world/province_map.mjs` gebruikt `kaartkleuren.js` en zet `palet: KAART_PALET_VERSIE` in `global.map`) wordt niet herkleurd. Dat is de cache-sleutel: zonder `palet` in de meta (een oude wereld) herkleurt het spel, met de huidige versie niet, en bij een volgende paletwijziging gaat `KAART_PALET_VERSIE` omhoog zodat gebakken tegels weer als oud gelden. De volgende wereldbouw bakt het nieuwe palet vanzelf.

**Markers:** vijf rollen uit de tokens (`markerKleuren()`): bordgroen = diensten en winkels, rood = politie en flitspaal, inktblauw = vervoer en water, crème = overig, geel = doelen (alleen een rand, nooit een schijf). De rand is crème (gevaar licht rood, doelen geel), de glyph crème of inkt (`glyphOp`, 4,5:1), de donkere buitenrand 3:1. De vorm zegt de rest (cirkel, schild, zeshoek, ruit, tegel, afgeronde rechthoek). Politiezones op de minikaart houden hun blauw (`INK.policeBlue`, naast het rood van gezocht); perceel-huur blijft blauw in de percelenlaag.

**Tests:** `kaartkleuren_test` (palet uit tokens, contrast 3:1 voor lijnen en 4,5:1 voor tekst en glyph, herkleuren, de versie), `mapstyle_test`, `mapicons_test`.

## Latere aanpassingen (20-11)

- **Kleur van veroverd/klaar is lichtgroen** (`--ds-c-licht-groen`, via `gebiedKleuren().veroverd` in `kaartkleuren.js`), met dikke inkt-rand en vlagicoon. Aan het veroveren blijft geel (`--ds-c-ink-geel`). Voor de percelen (farming) geldt dezelfde taal: klaar is lichtgroen, bezig is geel; neem de kleur uit `gebiedKleuren()`, geen eigen hex.
- **Minder detail in onbezocht gebied:** zwaardere waas (`MIST_ALPHA.buurt` 0,66), geen straatnamen en geen pins behalve jij, medespelers, het gekozen doel en je waypoint (`pinBlijftInMist` in `kaartontdekking.js`). De minikaart doet hetzelfde met `plekOnbezocht()` en een zware waas met raster.
- **Markers uit Phosphor:** winkels, bijbanen en haltes tekenen hun glyph uit de iconenset (`PH_SHOP`, `PH_JOB`, `PH_KIND` in `mapglyphs.js`). Missie-, ommeland- en perceelmarkers hebben nog hun eigen glyph.
- **Compacte kaart-UI:** de kop is een chip met icoon en percentage, de voortgangsstrook één regel (aantal veroverd en bezig), de knop Lagen heeft een eigen icoon. Volledige tekst staat in aria-label en tooltip.
- **Framekosten** (`getMapViewStats`, z2, echt spel): gemiddeld 2,6 ms per frame, samenstellen 2,5 ms, overlay 2,2 ms. Geen extra tekenpas.
- **Niet gedaan:** de vignette boven de kaart-UI en de zeefdrukkleuren van de kaartpanelen staan in `pausemenu.css` (menu-werk) en zijn hier niet aangeraakt.
