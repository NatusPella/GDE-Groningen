# 0029 - Hostsleutel in de aankondiging bindt het join-antwoord aan de host

- **Status:** besloten
- **Datum:** 2026-11-08
- **Spec:** `.specs-fire/standards/multiplayer.md`
- **Gebied:** Samen spelen: de openbare lijst, de join-poort en het bootpad
- **Gerelateerd:** #777, #795, #583, #589, constitutie 10, ADR 0022 (toestemming)

## Context

Een gast die op een rij uit de openbare lijst klikt, vraagt de host om een eenmalige kamercode
(`game/js/net/joingate.js`). Dat verzoek staat onversleuteld op een openbaar onderwerp van de
brokers: sessie-id, nonce en de publieke sleutel van de gast zijn voor iedereen leesbaar (#583).
De host antwoordt met een postvak waarvan alleen die gast het antwoord kan ontsleutelen.

Het antwoord was niet aan de host gebonden (#777). Wie het verzoek ziet, kan met de publieke
sleutel van de gast zélf een gedeelde sleutel afleiden, een eigen kamercode versleutelen en
sneller antwoorden dan de host. De gast accepteerde het eerste geldige antwoord en verbond met
de aanvaller: zijn IP-adres ging naar iemand die geen medespeler is (constitutie 10), hij speelde
in een nagemaakte wereld en de echte host zag hem nooit. De controle op het welkom (vast
sessie-id en naam) kwam pas ná het verbinden; de kamer was dan al gebruikt en de IP-uitwisseling
al gebeurd.

De lijst is een vindplaats, geen identiteit (#589): de CRC16 is geen handtekening. Dat blijft zo;
deze beslissing gaat over de vraag hoe een gast zeker weet dat een join-antwoord van de host van
de rij komt.

## Besluit

**Eén ECDH-sleutelpaar per sessie; de publieke helft staat in de aankondiging en het
join-antwoord wordt daarmee versleuteld, zodat een gast een antwoord van een niet-host verwerpt
vóórdat hij verbindt.**

- De gastheerhub maakt bij het openbaar maken één ECDH P-256-sleutelpaar voor de sessie
  (`ensureHostKey`, `net/hub.js`). Het paar blijft ook na privé en weer openbaar hetzelfde. De
  **privéhelft blijft in het geheugen van de hub**: hij gaat nooit over de lijn, nooit naar de
  opslag en is geen persoonsgegeven.
- De aankondiging draagt de **publieke hostsleutel** (`net/serverlijst.js`, lijstformaat 3, veld
  `h`, meegenomen in de CRC). `decodeer` eist een geldige sleutel, en de lijst weigert een andere
  sleutel onder hetzelfde sessie-id, net als bij versie en protocol.
- Het join-antwoord is versleuteld met de gedeelde sleutel van de hostsleutel en de sleutel van
  de gast, met de nonce als additional data (`net/joingate.js`, joinformaat 2). Alleen de host
  met de privéhelft kan dat antwoord maken.
- De gast neemt de hostsleutel uit de rij waarop hij klikte en ontsleutelt daarmee. Een postvak
  van iemand anders ontsleutelt niet — ook niet als de aanvaller de echte hostsleutel als etiket
  meezet — en wordt dus **vóór het verbinden** verworpen. Zonder hostsleutel in de rij vraagt de
  gast niets aan.
- De welkom-controle (vast sessie-id en naam uit het welkom tegen de rij) blijft als **tweede
  slot** bestaan in de lobby (`lobbyui.js`) en doet hetzelfde in het automatische bootpad
  (`sessionboot.js` -> `openSession`).

## Afgewezen

- **Geen binding, alleen het welkom controleren** (de toestand van #777). Te laat: de kamer is
  dan al gebruikt en het IP-adres al uitgewisseld. Het welkom blijft nuttig als tweede slot,
  maar kan het eerste gat niet dichten.
- **Een gedeeld token per sessie** in de aankondiging, dat de gast met het verzoek meestuurt.
  Dat token staat dan onversleuteld in de lijst en is dus voor iedereen te lezen: beveiliging
  die niets kost om te omzeilen. Een geheim dat je publiceert is geen geheim.
- **Een langlevende ondertekeningssleutel met handtekeningen per bericht** (ECDSA). Cryptografisch
  sterker op papier, maar vraagt sleutelbeheer, rotatie en opslag van een sleutel die langer
  meegaat dan één sessie. Het probleem is een identiteit per sessie; een per-sessie ECDH-paar
  lost dat op zonder sleutelopslag.
- **Twee onafhankelijke kanalen vergelijken** (tracker én MQTT). Een aanvaller kan op beide
  publiceren; het verhoogt alleen de kosten en maakt de code een stuk ingewikkelder.
- **Een rij ondertekenen met een sleutel via het join-kanaal** (de suggestie in #589). Dat is
  circulair: de gast moet de sleutel vertrouwen voordat er een kanaal is. De hostsleutel in de
  aankondiging is de ankerpost; dat de rij zelf door een derde overschreven kan worden blijft
  een bekende grens van de lijst (#589) en is een apart probleem.

## Gevolgen

- **Protocolwijziging:** lijstformaat 2 -> 3 en joinformaat 1 -> 2. Oudere en nieuwere clients
  zien elkaars aankondigingen niet meer en kunnen niet meer samen joinen; dat past bij de
  bestaande regel dat je alleen met dezelfde versie samen speelt. Het hoort in de
  release-notities (CHANGELOG).
- De aankondigingsregels zijn strenger: een sleutel is verplicht, zit in de CRC, en een ander
  paar onder hetzelfde id wordt geweigerd (`decodeer`/`Serverlijst.ontvang`). Een aankondiging
  zonder sleutel bestaat niet meer; de host wacht op de sleutel vóór hij aankondigt en blijft
  anders privé met een melding.
- Het bootpad doet dezelfde welkom-controle: een ander sessie-id (of een andere naam bij een
  sessie met naam) laat de wereld terugzetten en de volgende kandidaat proberen.
- De hostsleutel is een publieke sleutel, geen persoonsgegeven; de privéhelft staat alleen in
  het geheugen van de gastheerhub. Er is niets aan opslag toegevoegd (constitutie 10).
- De join-poort kan niet zonder hostsleutel bestaan (`bedienKamer` geeft dan `null`): een host
  die geen sleutel kan maken, kan geen openbare sessie aanbieden.
- Tests: de aanval staat in `scripts/net_joingate_test.mjs` (aanvaller publiceert een postvak
  met de echte hostsleutel als etiket; de gast verwerpt het), het bootpad in
  `scripts/sessionboot_test.mjs`, en de aankondigingsregels in `scripts/net_serverlijst_test.mjs`.
