# Sprint 22-11: leesbaarheid en taal

Naslag bij de sprint "alle speltekst nalopen op Nederlands, toon, lengte en consistentie, en de leesbaarheid van HUD-teksten". Bewaking: `scripts/tekst_kwaliteit_audit.mjs` (test `scripts/tekst_kwaliteit_audit_test.mjs`, uitzonderingen met reden in `scripts/tekst_kwaliteit_allow.json`). Aanvulling op `scripts/text_audit.mjs` (merken, namen, winter, leenwoorden, inclusieve taal) en `scripts/hud_text_audit.mjs` (woordbudget per soort).

## Wat de audit bewaakt

| Regel | Voorbeeld van een fout |
|---|---|
| dubbele-spatie | twee spaties, een spatie voor een komma |
| placeholder | `undefined`, `${x}`, `{{naam}}`, een codewaarde als in de tekst (`{E}`-toetstokens, `{naam}` en `%s` worden bij het tonen ingevuld en tellen niet) |
| toets-token | een `{NAAM}` die geen bekende toets is (lijst: `BRACE_KEY_RE` in `keycap.js`): blijft als ruwe accolades in beeld staan, zoals in #1257. De audit ziet alleen de bron; of een tekst ook echt door `keyText` gaat, bewaakt hij niet |
| afgekapt | een volledige regel die op "en", "van" of een komma eindigt |
| engels-restant | het Engelse woord voor het kaartpunt, de muisknop in het Engels, loading, press, click |
| eenheid | de Engelse snelheids- en lengte-eenheden (het is km/u en meter) |
| getalformaat | 1,000 in plaats van 1.000; 3.5 km in plaats van 3,5 km; €1000 in plaats van €1.000 |
| datumtijd | 12-uursklok, ISO-datum, tijd met een punt (16.00 uur) |
| leesteken | `!!`, `,,`, geen spatie na een komma of punt |
| hoofdletter | kleine letter na een punt, "grunn" zonder hoofdletter |
| css-grootte | tekst onder 12 px (px en rem; em hangt van de ouder af) |
| css-leesbaar | HUD-tekst die over de wereld staat zonder vlak, schaduw of halo |

Markup (tags, attributen, toetstokens, kleurverlopen, bestandsnamen) telt niet als tekst. De allowlist heeft 18 regels (23 toegestane vondsten), elk met reden (ontwikkelaarsmeldingen, bordtekst met bewuste spaties, de Engelse toerist in de taxi, bestandsnamen in de geluidslicenties).

## Voor en na

| Onderdeel | Voor | Na |
|---|---|---|
| Kaartpunt | "Zet waypoint", "Jouw waypoint", "Haal waypoint weg", "Waypoint naar je doel" in kaart, hulp, besturingslijst, eerste-keer-scherm en hints (ruim dertig plekken) | "Zet routepunt", "Jouw routepunt", "Haal routepunt weg", "Routepunt naar je doel"; het is een het-woord ("haalt het weg") |
| Duizendtallen | €1000, 5000 punten, 1500 stuntpunten, €2500 naast €10.000 | €1.000, 5.000 punten, 1.500 stuntpunten, €2.500 |
| Tijd op het krijtbord | "16.00 uur" | "16:00 uur", zoals de spelklok |
| Bezit-uitleg | "(NaN)" | "(een waarde die geen getal is)" |
| Melding "opgeslagen" linksonder | geen schaduw, op een lichte achtergrond slecht te lezen | zelfde halo als de rest van de HUD (`--hud-shadow`) |
| Toetsen in het wasd-plaatje van het pauzemenu | 10,5 px | 12 px |
| Knoppen | "Kopieer technische info" naast "Technische info kopiëren"; "Zet de akker op je kaart" naast "op de kaart" | elk één vorm |
| Woordenlijst | geen regel voor het kaartpunt | `docs/WOORDENLIJST.md`: waypoint, routepunt |

## Gemeten, niet veranderd

- De audit liep eerst met 500 bevindingen; na het uitsluiten van opmaak en toetstokens bleven er 83 over, waarvan het merendeel het kaartpunt. Alles wat overbleef is gefixt of staat met reden op de lijst.
- Ondertitels hebben al grootte-instellingen, een donker vlak ("Hoog" contrast) en een woordbudget van 18 (`hud_text_audit.mjs`, ratel op 0). Geen wijziging nodig.
- Aanspreekvorm: "u" komt alleen voor in de mond van ambtelijke en deftige personages (notaris, rondvaartgids, loket); de HUD zegt overal "je".
- Drie puntjes ("...") en het beletselteken ("…") staan door elkaar (ruim 45 tegen enkele). Niet aangeraakt: ingesproken regels hangen aan de exacte tekst (opnieuw inspreken vraagt akkoord van de eigenaar).
- Knoppen wisselen tussen de gebiedende wijs ("Zet als doel") en de onbepaalde ("Annuleren", "Wissen"). Er is geen vastgelegde regel; alleen de dubbele gevallen zijn gelijkgetrokken.

- De UI-kritiekissues #1257 (ruwe accolades in Instellingen en Foto's), #1281 ("Savegame") en #1267 (wisselende werkwoorden) zijn al in behandeling op `ui-fix-menu-22-11`; hier niet dubbel gedaan. Het woord "waypoint" uit #1212 en #1231 is wel hier opgelost; de muisknop-token `{LMB}` in de kaartuitleg is een geldig toetsplaatje.

## Samen spelen

Alleen tekst en stijl; niets van de spelregels of het netwerkprotocol verandert. Het routepunt blijft per speler lokaal, een gast kan er een zetten en kan niet reizen (zoals voorheen).

## Nog niet in beeld bekeken (voor een mens of de beeldrun)

- De kaartbalk en de plekkaart: past "Zet routepunt" en "Haal routepunt weg" nog in de knop en in de kaartlegenda zonder af te breken?
- Het hulpscherm "De kaart: routepunt en reizen" en het eerste-keer-scherm (5 zet een routepunt).
- De melding "opgeslagen" linksonder bij een lichte achtergrond (zand, een wit dak): is de halo genoeg?
- Het wasd-plaatje in het pauzemenu na de 12 px: past de toets in 17 x 16 px?
- Het krijtbord van het café ("16:00 uur") in de straat.
