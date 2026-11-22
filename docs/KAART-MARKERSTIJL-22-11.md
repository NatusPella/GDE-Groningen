# Markerstijlgids van de kaart (22-11, #1009)

Eén stijl voor de grote kaart, de minikaart en de legenda. Soort, icoon, vorm, kleur en maat per soort staan in
[KAART-DS3-AUDIT-22-11.md](KAART-DS3-AUDIT-22-11.md) (gemaakt uit `scripts/lib/kaart_audit.mjs`); `scripts/kaart_ds3_test.mjs` bewaakt de regels.
Icoonbladen (alle 126 soorten, minikaart 14 px, grote kaart 24 px, legenda 32 px, op land, water, groen, gebouw en weg): `docs/beeld-22-11/kaart-ds3/iconenblad.png`,
met de simulaties `iconenblad-deuteranopie.png` en `iconenblad-tritanopie.png`; legenda: `legenda.png`. Maken: `node scripts/kaart_ds3_beeld.mjs <uitmap> iconen [deuteranopie|tritanopie|protanopie] [dpr]`.

## Regels

1. **Badge** = vorm in de categoriekleur, een Phosphor-glyph (bold) in crème of inkt (wat 4,5:1 haalt), een donkere buitenlijn met een dunne crème lijn en een zacht schaduwtje.
   Het glyph staat optisch gecentreerd per vorm (`BADGE_GLYPH` in `mapicons.js`).
2. **Vorm draagt de betekenis, kleur is nooit het enige verschil.** Cirkel zorg en activiteiten, afgeronde tegel winkel, afgeronde rechthoek horeca, ruit bijbaan, zeshoek garage,
   schild politiebureau, pil station en bushalte, achthoek flitspaal, pin Ommeland en percelen. Twee categorieën met dezelfde vorm liggen bij elke kleurenblindheid minstens 25 (CIE76) uit elkaar.
3. **Kleuren** (vijf rollen uit de tokens): bordgroen diensten en winkels, rood politie en gevaar, inktblauw vervoer, water en Bezit, crème activiteit en de rest. Geel alleen doel en route, licht groen alleen veroverd.
4. **Glyph**: elke soort een eigen Phosphor-icoon via `markerIcoon()` (`game/js/mapmarkers.js`, namen uit `ICON_MAP`); soorten van één dienst (bus, taxi, rondvaart, bernard) delen glyph, vorm en kleur (`FAMILIES`), de rest niet.
5. **Maten**: een badge is minstens 21 px (`MIN_ICON_PX`), de minikaart schaalt mee met de ui-schaal; onder 16 px (`MIN_GLYPH_PX`) draagt alleen de vorm, maar zo klein komt het niet voor. Het glyph is bij de kleinste badge minstens 10 px.
6. **Actief doel**: geel, groter, één puls van 250 ms bij het verschijnen, stil bij Minder beweging (`pulsWaarde`, `navpijl.js`). Eigen route paars, klus oranje, opknappen roze (a11y-paletten). Wanted-sterren linksboven. Medespelers: eigen kleur en vorm (zestien vormen).
7. **Declutter**: hogere prioriteit wint (`mapicons.js`, `mapdeclutter.js`); lage categorieën verschijnen pas bij hun zoom (`ICON_MIN_ZOOM`).
8. **Ongelezen of nieuw**: een klein punt; nog niet ingebouwd, zie hieronder.

## Vervangen en waarom

- Alle badges tekenen hun Phosphor-glyph nu direct; voorheen werd de crème van een getekende glyph uitgesneden (gaf vlekken). Ziekenhuis en huisarts: `ehbo` (kruis in een koffertje) in plaats van een eigen kruis; politiebureau: sirene op het schild; flitspaal, station, garage, horeca: Phosphor.
- Bijbanen en activiteiten die nog een getekend glyph hadden (23 soorten, o.a. kermis, drift, discgolf, zwembad, veerdienst) kregen een Phosphor-naam.
- Vormen: station werd een pil, Ommeland een pin, flitspaal een achthoek (kleurenblind: groen/blauw en groen/rood vielen samen).
- Bezit (thuis, steiger, helidek, garage) en je eigen voertuig: Phosphor op een schijf in het inktblauw van Bezit (oud v1-blauw weg); geld bij een beroving: munten in plaats van de euroletter; Betreedbaar: de Phosphor-deur.
- Te-koop- en perceellagen kregen donkere lijnkleuren die op papier 3:1 halen.

## Nog niet gedaan of niet bekeken

Niet in het echte spel bekeken (geen Electron): de grote kaart en minikaart in dag en nacht, de provinciepiramide na herkleuren, de gebiedenlaag op papier (donker glas voor onverkend) en de regionamen langs de grens. Het stipje voor ongelezen of nieuw is niet gebouwd.
De ruwe hexen in de INK-tabel van `mapstyle.js` (51) zijn de resterende schuld; de test laat dat aantal alleen dalen. Perceel-marker "te koop" is nog geel.
Samen spelen: kaartstijl is lokaal, geen netwerk, geen beloning.
