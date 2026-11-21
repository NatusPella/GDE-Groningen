# 0047 - Snelle zinnen en emotes: vaste lijst, opt-in, geen vrije tekst

- **Status:** voorgesteld (21-11-2026; issue #1159, verwant #451). Wacht op de eigenaar omdat het raakt aan constitutie 10 (tekstchat komt later, opt-in).
- **Datum:** 21-11-2026
- **Spec:** `.specs-fire/standards/multiplayer.md`, `docs/COOP-GAST.md` (Snelle zinnen en doel delen)
- **Verwant:** constitutie 10 (AGENTS.md), `docs/MULTIPLAYER-VISIE.md`

## Context

Spelers in Samen spelen kunnen elkaar nu alleen met drie roepjes (7, 8, 9) iets laten weten. De eigenaar wil een gewoon, vriendelijk communicatiemiddel (zoals de pings en emotes van andere spellen) zonder dat het spel een chatkanaal wordt: tekstchat en voicechat blijven voor later, opt-in, met dempen en blokkeren en zonder opslag (#451).

## Besluit

1. **Alleen een vaste lijst Nederlandse zinnen en emotes** (`game/js/multiplayerphrases.js`). Over het net gaat het id van de zin (`{ k: 'zin', z: 'dank' }`); de ontvanger zet er zelf de tekst bij. Een bericht met een onbekend id of eigen tekst valt weg. Er is nergens een invoerveld.
2. **Opt-in per speler** (`samenZinnen` in `gde-settings`, standaard uit): wie het niet aanzet verstuurt en ziet geen zinnen, emotes of gedeelde doelen. Het wiel (T, controller X) legt dat uit en heeft een knop om het aan te zetten.
3. **Dempen en blokkeren per speler**, zonder opslag: alleen in het geheugen en op naam, zodat het na een hostwissel (andere plekken) blijft gelden. Dempen verbergt zinnen en emotes; blokkeren verbergt ook pings en gedeelde doelen.
4. **Rate limit**: 1,5 s tussen twee zinnen en vijf per vijftien seconden per speler, door de host bij het doorsturen en door elke ontvanger. Een gedeeld doel hooguit eens per vijf seconden.
5. **Een doel delen is een voorstel**, geen opdracht: de ontvanger kiest J (volgen op zijn eigen kaart) of N. In een voertuig deelt de navigator met de bestuurder en de bestuurder met wie meerijdt (`game/js/multiplayergoal.js`).
6. Geen PROTO-wijziging: dezelfde JSON-gebeurtenissen als de ping; `PROTO` en `CODEC_VERSION` blijven 2. Een oudere host negeert het bericht.

## Afgewezen

- **Vrije tekst met een woordfilter:** is tekstchat, valt onder #451 en vraagt een eigen moderatiebesluit; een filter dekt nooit alles, en het opslaan of tonen van wat spelers typen raakt aan constitutie 4 en 10.
- **Standaard aan:** past niet bij opt-in voor communicatie met onbekenden; een oude installatie mag nooit stil iets gaan tonen.
- **Dempen op plek:** na een hostwissel krijgen spelers andere plekken, dan zou een ander gedempt zijn.
- **Dempen opslaan in de instellingen of savegame:** het zou namen van andere spelers bewaren (persoonsgegevens, constitutie 4) en gaat dus niet.
- **Een doel automatisch overnemen:** een medespeler zou dan je navigatie kunnen kapen; het voorstel met J of N houdt de keuze bij de ontvanger.

## Gevolgen

- `scripts/multiplayerphrases_test.mjs` en `scripts/multiplayergoal_test.mjs` bewaken dit, inclusief dat `multiplayerphrases.js` nergens schrijft en dat het wiel geen invoerveld heeft.
- Komt tekstchat later, dan hergebruikt die dezelfde dempen- en blokkeerstand en dezelfde opt-in.
