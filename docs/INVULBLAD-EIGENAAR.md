# Invulblad voor de eigenaar (#72, #62, #13)

Stand: 13 november 2026. **Niets is verstuurd, geüpload of ingesteld.** Dit blad
verzamelt de velden die alleen de eigenaar kan invullen, met een voorstel erbij.
Vul in wat je wilt; zeg daarna welke regels een agent in de repo mag verwerken.

## 1. GitHub-profiel van de repo (#72)

Voorstel-teksten staan in [SOCIAL-EN-WEBSITE.md](SOCIAL-EN-WEBSITE.md). Pas
invullen nadat de repo publiek is (zie [PUBLICATIECHECKLIST.md](PUBLICATIECHECKLIST.md)).

| Veld | Voorstel | Jouw keuze |
|---|---|---|
| About (max. 350 tekens) | zie SOCIAL-EN-WEBSITE.md ("Gratis open-wereldkomedie in een low-poly Groningen …") | ☐ akkoord ☐ aanpassen: _… _ |
| Topics | `threejs`, `electron`, `open-world`, `groningen`, `low-poly`, `comedy`, `dutch`, `game`, `javascript` | ☐ akkoord ☐ aanpassen: _… _ |
| Website-veld | de marketingpagina staat klaar in `website/`; na Public: `https://natuspella.github.io/GDE-Groningen/` | ☐ dit invullen ☐ anders: _… _ |
| Social preview (1280×640, < 1 MB) | zomerbeeld Martinitoren of Grote Markt, logo + "Zomer vol misdaad", geen bloed/wapens/HUD | ☐ Martinitoren ☐ Grote Markt ☐ anders: _… _ |
| Landingspagina met "18+" | De marketingpagina in `website/` vermeldt 18+; de eigenaar kan dat aanpassen | ☐ site ook ☐ alleen winkelpagina |

## 2. Credits en disclaimer samenvoegen (#72): doorgevoerd

Doorgevoerd op 13 november 2026: de disclaimer in `game/js/credits.js`,
`NOTICE.md` en `README.md` is één generieke tekst zonder namen van andere games
of uitgevers; de aftitelregel "Fanparodie: alles verzonnen" blijft. De
allowlist van `text_audit` is daarop opgeschoond. De oude werktitel wordt
nergens meer gebruikt; de GitHub-releasenotes zijn op dezelfde dag opgeschoond.

| Keuze | Status |
|---|---|
| Generieke disclaimer in README, NOTICE en credits | ✅ doorgevoerd (13-11-2026) |
| Releasetekst over de oude werktitel | ✅ uit de releasenotes gehaald; back-up in `%TEMP%` |

## 3. Muziekproduct (#62)

Vul de tabel in [LICENTIES.md §4.3](LICENTIES.md#43-muziekproduct-vastleggen-invullen-door-de-eigenaar-62) in (product, account, periode) en zeg het daarna; een agent haalt dan de openstaande zin in §2 weg. Zonder deze vastlegging kan LICENTIES.md het product niet noemen.

## 4. Merkenregisters (#62)

Zoek met de hand (ca. 15 minuten) in EUIPO (eSearch plus), TMview en BOIP op
"GDE", "Grootste Diefstal Ever" en "Zomer vol misdaad" en vul de uitkomst in
[MERKENCHECK.md](MERKENCHECK.md) in. Het register van namen in het spel staat in
[MERKENREGISTER.md](MERKENREGISTER.md).

## 5. Gronings en Fries (#13)

Besloten: geen echte nalezer; de woorden zijn zelf gecontroleerd. Zie [DIALECT-CONTROLE.md](DIALECT-CONTROLE.md) (methode, bronnen, twijfelgevallen) en `scripts/dialect_woorden_test.mjs`. De lijst uit `node scripts/nalezerlijst.mjs` blijft te maken als een speler of kennis zelf wil meelezen. Voor de opgesomde twijfelgevallen in ingesproken regels is opnieuw inspreken nodig (jouw akkoord).
