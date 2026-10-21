# Plan naar 1.0 (#65)

Stand: 20 oktober 2026, laatste pre-release 0.37.1. Dit is een **plan**; het is
niets uitgevoerd, geen tag gemaakt en niets gepubliceerd. De lijst van werk zelf
staat op het bord (constitution 7); dit document beschrijft alleen de afspraak
voor het eindspel: wat 1.0 betekent, in welke volgorde, en wie wat beslist.

## Wat 1.0 betekent

1.0.0 is de eerste versie die we zonder voorbehoud aan onbekende spelers geven.
Voorwaarden (allemaal controleerbaar op het bord of met een script):

1. **Geen open issue met label `bug` en impact `hoog` of `zeer-hoog`** zonder besluit van de eigenaar om het uit te stellen (comment in het issue).
2. **Het hele verhaal is door een mens gespeeld** (akte 2 tot en met 5 nog niet; zie [PLAYTESTPLAN.md](PLAYTESTPLAN.md), #221 en #116) en de uitkomst staat als issues op het bord.
3. **Tests groen** zoals vóór elke release in [AGENTS.md](../AGENTS.md): `node --check`, `voice_coverage --quiet`, alle `scripts/*_test.mjs`, één Electron-verhaaltest, zware wereldchecks. Dit draait de coördinator.
4. **Teksten kloppen met de constitution**: `node scripts/text_audit.mjs` geeft 0 bevindingen (#150); Gronings/Fries is nagelezen of de eigenaar heeft besloten het zo te laten (#13, lijst in [NALEZEN-GRONINGS-FRIES.md](NALEZEN-GRONINGS-FRIES.md)).
5. **Publicatie is besloten**: de checklist in [PUBLICATIECHECKLIST.md](PUBLICATIECHECKLIST.md) is doorlopen of per punt bewust overgeslagen (#83, #37, #62); leeftijdsantwoorden klaar ([IARC-ANTWOORDEN.md](IARC-ANTWOORDEN.md), #60).
6. **Een speelbare webversie of een bewuste keuze om die niet te hosten** (#57; nu niet besloten).

## Tijdlijn (volgorde, geen datums)

| Fase | Inhoud | Wie |
|---|---|---|
| 0.x blijft | pre-releases van wat in Klaar staat, `npm run release -- minor\|patch` | coördinator |
| Playtestronde | testers T1..Tn spelen scenario's A tot en met F uit PLAYTESTPLAN; `scripts/playtest_feedback.mjs` zet feedback om in concept-issues | begeleider, eigenaar kiest testers |
| Release candidate | de laatste feature-pre-release (`0.N.0`); feature freeze: vanaf nu alleen issues met label `bug` | coördinator |
| Twee weken bugfixes | alleen `bug`-issues; elke dag een korte controle van de lijst; patch-pre-releases bij een nuttige hoeveelheid fixes | agents, coördinator |
| Definitieve trailer | teaser en hoofdtrailer opnemen volgens [youtube/trailers.md](youtube/trailers.md); uploaden doet de eigenaar (#63) | eigenaar |
| 1.0.0 | `CHANGELOG.md` krijgt `## [1.0.0]`, release met downloads (SHA-256 in de notities, zie checklist), webversie als die is besloten, daarna pas zichtbaarheid van de repo als de eigenaar dat wil | coördinator, eigenaar |

De "twee weken" beginnen pas als de release candidate is gemaakt en de tests
groen zijn. Komt er in die twee weken een bug met impact `hoog` bij, dan begint
de teller niet opnieuw, maar de eigenaar beslist of 1.0.0 wacht.

## Wat niet in 1.0 hoeft

Alles wat nu `wens` is (nieuwe features, grafische uitbreidingen, Android #227,
Steam #64) blijft op het bord; 1.0 is een stabiliteitsmijlpaal. De
opslagsleutel-opruiming (`removeLegacyKeys()` in `game/js/storagekeys.js`, TODO
"1.1 or later") hoort expliciet **niet** bij 1.0.

## Beslissingen voor de eigenaar

1. Is 1.0 ook het moment om de repo publiek te maken, of komt dat vóór of na 1.0?
2. Gaat de webversie mee (#57), en waar wordt die gehost?
3. Hoeveel testers en welke scenario's moeten gespeeld zijn voor de release candidate (voorstel: minstens één complete speelronde per akte)?
