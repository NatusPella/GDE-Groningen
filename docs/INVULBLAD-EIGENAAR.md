# Invulblad voor de eigenaar (#72, #62, #13)

Stand: 19 oktober 2026. **Niets is verstuurd, geüpload of ingesteld.** Dit blad
verzamelt de velden die alleen de eigenaar kan invullen, met een voorstel erbij.
Vul in wat je wilt; zeg daarna welke regels een agent in de repo mag verwerken.

## 1. GitHub-profiel van de repo (#72)

Voorstel-teksten staan in [SOCIAL-EN-WEBSITE.md](SOCIAL-EN-WEBSITE.md). Pas
invullen nadat de repo publiek is (zie [PUBLICATIECHECKLIST.md](PUBLICATIECHECKLIST.md)).

| Veld | Voorstel | Jouw keuze |
|---|---|---|
| About (max. 350 tekens) | zie SOCIAL-EN-WEBSITE.md ("Gratis open-wereldkomedie in een low-poly Groningen …") | ☐ akkoord ☐ aanpassen: _… _ |
| Topics | `threejs`, `electron`, `open-world`, `groningen`, `low-poly`, `comedy`, `dutch`, `game`, `javascript` | ☐ akkoord ☐ aanpassen: _… _ |
| Website-veld | leeg tot de webversie is besloten (#57) | ☐ leeg ☐ URL: _… _ |
| Social preview (1280×640, < 1 MB) | zomerbeeld Martinitoren of Grote Markt, logo + "Zomer vol misdaad", geen bloed/wapens/HUD | ☐ Martinitoren ☐ Grote Markt ☐ anders: _… _ |
| Landingspagina met "18+" | alleen op de winkelpagina of ook op de site | ☐ site ook ☐ alleen winkelpagina |

## 2. Credits en disclaimer samenvoegen (#72)

Nu staan twee teksten naast elkaar in `game/js/credits.js`: de `DISCLAIMER`
(regel 7: "…fanparodie op GTA, niet gelieerd aan of goedgekeurd door Rockstar
Games of Take-Two Interactive. Namen, personages, merken en gebeurtenissen zijn
verzonnen.") en de aftitelregel `Fanparodie` (regel 22: "niet van Rockstar Games
of Take-Two. Alles verzonnen"). Dezelfde tekst staat in `NOTICE.md` (regels 24-25).

Voorstel: laat de volledige `DISCLAIMER` staan als enige plek die de uitgever
noemt (juridisch nodig, staat op de allowlist van `scripts/text_audit.mjs`), en
kort de aftitelregel in tot "Fanparodie: alles verzonnen" zodat de
namen niet twee keer in het spel staan. Mogelijke consequentie: niemand; geen
stemopnames hangen eraan.

| Keuze | |
|---|---|
| ☐ Voorstel doorvoeren (agent past `credits.js` aan en de test) | ☐ Laten zoals het is |
| De releasetekst over de oude naam ("Grand Theft Eierbal", MERKENREGISTER.md §1) | ☐ laten staan ☐ weghalen |

## 3. Muziekproduct (#62)

Vul de tabel in [LICENTIES.md §4.3](LICENTIES.md#43-muziekproduct-vastleggen-invullen-door-de-eigenaar-62) in (product, account, periode) en zeg het daarna; een agent haalt dan de openstaande zin in §2 weg. Zonder deze vastlegging kan LICENTIES.md het product niet noemen.

## 4. Merkenregisters (#62)

Zoek met de hand (ca. 15 minuten) in EUIPO (eSearch plus), TMview en BOIP op
"GDE", "Grootste Diefstal Ever" en "Zomer vol misdaad" en vul de uitkomst in
[MERKENCHECK.md](MERKENCHECK.md) in. Het register van namen in het spel staat in
[MERKENREGISTER.md](MERKENREGISTER.md).

## 5. Gronings en Fries (#13)

Besloten: geen echte nalezer; de woorden zijn zelf gecontroleerd. Zie [DIALECT-CONTROLE.md](DIALECT-CONTROLE.md) (methode, bronnen, twijfelgevallen) en `scripts/dialect_woorden_test.mjs`. De lijst uit `node scripts/nalezerlijst.mjs` blijft te maken als een speler of kennis zelf wil meelezen. Voor de opgesomde twijfelgevallen in ingesproken regels is opnieuw inspreken nodig (jouw akkoord).
