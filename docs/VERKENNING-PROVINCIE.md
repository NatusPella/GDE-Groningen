# Verkenning van de provincie (#807, punt 74)

Klein plan op de bestaande infrastructuur. Geen nieuwe merken, personen of munten; alles blijft
Nederlands en zomer. Dit document is de basis voor de losse issues A15-A20 uit
`docs/PROVINCIE-VERHAAL.md`; de eerste twee stappen zijn hieronder al veilig klein uitgevoerd.

## Wat er al is

- `game/landmarkkits.json`: **707** herkenningspunten in de provincie, met `k` (kerk, molen, borg,
  station, museum, …) en wereldcoördinaten. Geteld: **391 kerken, 98 molens, 24 borgen**.
- `game/js/menuplekken.js`: 38 vaste camerapunten, verdeeld over de streken (bron voor de
  uitkijkpunten).
- `game/js/regioleven.js`: de acht streken met hart en `reach`, plus zomerevenementen per streek.
- `game/js/reisbeats.js`: de reizen tussen de verhaalstappen (11 beats, met from/to en lengte).
- `game/js/gebieden.js`/`gebiedenui.js` (Veroverd, per speler), `game/js/uitjepaneel.js` en
  `activiteitensfeer.js` (presentatie van een uitje), `game/js/reisview.js` (reisduur).

## Kaart per speler (#825, gedaan)

De eigenaar koos op 9-11-2026: de wereld blijft bestaan en navigeerbaar, op de kaart wordt van een
onbekende streek alleen de naam, het streeklabel en de activiteiten-iconen verborgen (geen mist over
de wereld, niets onbereikbaar). `game/js/verkenpunten.js` heeft daarvoor de pure regels
(`newExplorationProfile`, `normaliseExploration`, `revealArea`, `areaProgress`, `awardAreaStamp`,
`areaLabels`, `travelFactor`, `isHiddenOnMap`); `game/js/explorationlive.js` houdt het eigen profiel
bij (`gde-verkenning-v1`), legt de eigen plek langs de streken, doet de E-actie bij een uitkijkpunt
en de meldingen. Wie hier al was begint niet bij nul: de bezochte buurten van gebieden.js
(`bezocht`, #435) zijn het startpunt. Alle missies van een streek klaar en alle uitkijkpunten
gebruikt geeft een stempel op de kaart en 10% kortere reistijd naar die streek (het kleinste
bestaande reisvoordeel, via `reisOptiesVoor`; geen munt en geen snelreizen). Wat deze laag niet
verbergt: wegen, water, de eigen positie en de missies. De kaarttekst en de meldingen zijn Nederlands;
de test is `scripts/verken_ontdekking_test.mjs`. Nog niet in beeld gezien: de kaart met een
gedeeltelijk ontdekte provincie (bronchecks en de pure selectie zijn wel getest).

## Gekozen kleine stappen (nu gedaan)

1. **`game/js/verkenpunten.js`** (puur, geen DOM):
   - `uitkijkpunten()`: één uitkijkpunt per streek. Eerst een bestaand `MENU_PLEKKEN`-punt; voor
     Lauwerskust en Hunsingo (geen menupiek) het eerste kerk-/molen-/borgpunt in die streek. Zo heeft
     elke streek een concreet punt zonder nieuwe data of nieuwe namen.
   - `albumStand()`: per streek het aantal herkenningspunten en de kerken/molens/borgen. Punten
     buiten de `reach` vallen bij de dichtstbijzijnde streek, zodat het album de hele provincie telt.
2. **`scripts/verken_dichtheid_test.mjs`** (26 checks): elke streek een uitkijkpunt; albumtotalen
   (kerken ≥ 380, molens ≥ 90, borgen ≥ 20); en langs de reisbeats de grootste afstand tot het
   eerstvolgende herkenningspunt, met een ratchet op de gemeten basis (T2 1662 m, T3 3617 m,
   M13 5432 m, M17 2693 m, T4 2204 m, M27 3286 m, T5 3063 m; 7 van de 11 beats hebben herkenbare
   eindpunten). De test gebruikt de rechte lijn tussen de eindpunten; de volgende stap haalt de
   echte routepunten uit de kaart en verlaagt de ratchet.
3. **A15 op de kaart** (kleinste echte laag, gedaan): `installeerUitkijkpunten()` zet de acht punten in
   `map.meta.uitkijkpunten` zodra `ommelandlandmarks.js` de kits heeft geladen. `mapview.js` tekent ze
   met een eigen icoon en legendarische schakelaar (`layerOn('uitkijkpunt')`), de minimap en hover
   komen mee; een klik zet er een waypoint. Geen nieuwe namen of coördinaten, geen magisch
   snelreizen (dat is sinds #97 geen reisoptie meer). De test bewaakt de installatie, de laag en de
   wiring in kaart/minimap.

## Aanvulling #834 (13-11-2026)

Van een onbekende streek worden naast de activiteiten nu ook de bijbanen, vondsten, paden en overige spots op de kaart en minikaart verborgen. Wegen, water, de eigen positie en de missies blijven zichtbaar; ontdekken via betreden of een uitkijkpunt onthult alles in één keer. Zo werkt de ontdekkingslaag uit #825 door op alle lagen, niet alleen op de attracties.
## Voorstel per activiteit (A15-A20)

| Id | Kleinste veilige vervolgstap | Hergebruikt |
|---|---|---|
| **A15 Uitkijkpunten** | **Op de kaart gezet** (punt per streek, eigen icoon/legenda/minimap, klik = waypoint). De kaart onthullen is met #825 gedaan: per speler ontdekken, alleen naam/streeklabel/activiteiten-iconen verbergen, E bij het punt, stempel en reisvoordeel. Wat nog een eigenaarsbesluit is: een regel in Activiteiten (`uitjepaneel`); geen nieuwe scène en geen magisch snelreizen. | `verkenpunten.js`, `explorationlive.js`, `menuplekken.js`, `landmarkkits.json`, `mapview.js`/`hud_panel.js` |
| **A16 Kieken: het album** | Teller per streek op de bestaande 707 punten (nu gemeten); in Activiteiten één regel per streek. Doel expliciet: **25 per streek** (niet stilzwijgend 500). | `albumStand()`, `activiteitensfeer.js`, `uitjepaneel.js` |
| **A17 Kerkenpad** | Zelfde teller, alleen `k: 'church'` (391); stempel per kerk pas later. | `albumStand()`, `markeer`/`gebieden.js` |
| **A20 Molenaar** | Teller over de 98 molens; de minispel-variant is een eigen issue, niet nodig voor de verkenlaag. | `albumStand()` |
| **A18/A19** | Wierden/borgen: de 24 borgen zijn al geteld; wierden vragen eigen data (niet in de kit) → later of laten vallen. | landmarkkits |
| **A21-A36** | Bestaande of al geplande activiteiten; geen nieuwe data nodig. | bestaande modules |

## Open besluiten (voor het bord)

- **A15-A20 als issues aanmaken of expliciet schrappen** in `docs/PROVINCIE-VERHAAL.md`. Zonder dat
  blijft het een wens in een doc (constitutie 7). Voorstel: A15, A16, A17 en A20 als losse issues;
  A18/A19 pas na eigen data, anders met reden schrappen.
- **Dichtheidsdoel**: voorstel **geen gat groter dan 4 km** langs een reisbeat (ongeveer 5 minuten
  fietsen of 2-3 minuten auto). De huidige basis haalt dat nog niet overal (M13 5,4 km); de ratchet
  in de test voorkomt in elk geval verslechtering tot de routepunten en de eerste extra bestemmingen
  er zijn.
- **Kaart onthullen** (A15) is met #825 gedaan als ontdekking per speler: geen mist en geen
  onbereikbare plekken, alleen de naam, het streeklabel en de activiteiten-iconen van een onbekende
  streek weg. De bestaande `ontvouw`/`grenzen`-laag en de mistinstelling blijven zoals ze waren.

## Samen spelen

De uitkijkpunten en albumteller zijn per speler (profiel/opslag), net als Veroverd; de punten zelf
staan in de wereld voor iedereen op dezelfde plek. Een gast ziet dezelfde punten en houdt zijn eigen
teller. Sinds #825 geldt dat ook voor de ontdekking: `gde-verkenning-v1` is van deze speler, er gaat
geen netwerkbericht over en de wereld, de punten en de missies zijn voor iedereen gelijk. Een gast
ontdekt op zijn eigen scherm (`coopgastlokaal.js`) en kan niets van de opener kapotmaken. Wat nog
niet samenwerkt, zegt dat via `coopstatus` (bestaand patroon).
