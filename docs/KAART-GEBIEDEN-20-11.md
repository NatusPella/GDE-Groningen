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

Het land zelf (`MAP_PALETTE`, `MINI_PALETTE`) is bewust niet veranderd: de grote kaart gebruikt de voorgerenderde provinciepiramide die bij de wereldbouw wordt gemaakt, en een ander land zou tot de volgende wereldbouw niet bij die tegels passen. Het contrast tussen de overlay en het land is getest.

### Vier toestanden van een gebied (`game/js/gebiedtoestand.js`)

| Toestand | Betekenis | Vlak | Lijn | Icoon |
| --- | --- | --- | --- | --- |
| Nog onzichtbaar | nooit bezocht | donker vlak met fijn puntraster (6 px halftone) | zacht en dun | oog doorgestreept (`oog_uit`) |
| Zichtbaar | bezocht, nog niets gedaan | gedempte papiervulling | stippellijn | geen |
| Aan het veroveren | al iets gedaan | gele vulling die met de voortgang meegroeit | effen gele rand | voortgangsring (en `ronde` in de legenda) |
| Veroverd | alles gedaan | volle vulling in de kleur van het gebied | dikke rand met donkere band | vlag (`vlag`) |

Nooit alleen kleur: elke toestand heeft een eigen lijnsoort, vlak en icoon. Een onzichtbaar gebied heeft geen naam op de kaart. Een bezochte buurt maakt zijn wijk, woonplaats en gemeente zichtbaar (`zichtbareGebieden`). Wat je gedaan hebt gaat voor: bezig en veroverd tellen ook als de bezoeklijst het gebied niet kent. De legenda toont de vier toestanden met hetzelfde patroon als op de kaart en met woorden. De minikaart tekent dezelfde toestanden kleiner en zonder tekst (raster, stippellijn, gele rand met ring, vulling met vlag).

**Beweging.** De toestanden zijn statisch: er is geen animatie, dus er is niets dat bij reduce-motion weg moet. De onthulling van een net bezocht gebied (`kaartontdekking.js`) behoudt zijn eigen regels.

## Samen spelen

De veroverde voortgang is per speler (#429) en de kaart is lokaal: de toestanden komen uit het eigen profiel van de speler, er is geen nieuw netwerkveld en geen EXTRA-bericht. Zie [COOP-GAST.md](COOP-GAST.md).

## Tests

`scripts/kaartkleuren_test.mjs` (tokens gelijk aan `ds-tokens.css`, rollen van `INK`, contrast), `scripts/gebiedtoestand_test.mjs` (toestand per gebied, uiterlijk, legenda, iconen, puur) en de bijgewerkte `scripts/gebieden_kaart_test.mjs` en `scripts/mapstyle_test.mjs`. Beelden: `scripts/qa/kaart_toestanden.page.js` met `scripts/qa/gebieden_shots.mjs --page=...`; de beelden staan in `docs/beeld-20-11/kaart/`.
