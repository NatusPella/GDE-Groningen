# Eigen boerderij: een perceel, gewassen, machines en een kasboek (#415)

Voor wie aan `boerderij.js`, `werkgang.js`, `boerderijlive.js`, `sidejob_boerderij.js` of `boerderijui.js` werkt. Tests: `scripts/boerderij_test.mjs`.
Het vak in de loopbaan is Landbouw ([LOOPBAAN.md](LOOPBAAN.md)); de losse oogstbaan is Bietenoogst (`sidejob_bieten.js`, #393).

## Wat de speler doet

Boerderij De Zonnehoek (verzonnen) is van jou: één akker bij Hoogkerk, in de buurt van Suikerhal Hoogkerk. Het werk gaat in vaste stappen:

1. **Ploegen** (ploeg), 2. **zaaien** (zaai- en strooimachine; je kiest het gewas in Pauzemenu › Boerderij › Gewas en betaalt het zaaigoed),
3. **bemesten** (optioneel, €25 mest, tot +20% opbrengst), 4. het gewas **groeit in speltijd**, 5. **oogsten** (rooier), 6. **afleveren**: laden bij het perceel en
rustig naar de afnemer rijden (Coöperatie Noorderveld voor aardappelen, Suikerhal Hoogkerk voor suikerbieten). Een ronde is daarna weer braak.

Het werk zelf is de bijbaan **Eigen boerderij** (start bij Hoogkerk, zie de kaart): hij kiest zelf de volgende taak uit de stand van het land, rekent
de huur en het zaaigoed af en gaat door met de taak erna tot er niets meer te doen is (bijvoorbeeld omdat het gewas nog groeit). Elke rijtaak is vier
rijen van honderd meter rijden in een snelheidsband (`BAND` in `werkgang.js`) en binnen de rij: te hard werkt slordig (de helft telt), te langzaam of
naast de rij niets, een overgeslagen stuk is gemist. De machine hangt zichtbaar achter de trekker. De afleverrit werkt zoals Suikerbieten: hard remmen
of scherp sturen strooit de kar leeg (de helft van de lading blijft liggen als dat misgaat).

Pauzemenu › **Boerderij** toont de stand van het perceel en de volgende taak (met kosten), het gewas voor het volgende zaaien, de machines (huren per keer of
kopen: dan geen huur en een ruimere rij) en het kasboek.

## Het model

| Gewas | Zaaigoed | Groeitijd | Opbrengst per perceel | Prijs per kg |
|---|---|---|---|---|
| Aardappelen | €40 | 30 speluren | 1800 kg | €0,22 |
| Suikerbieten | €30 | 48 speluren | 4000 kg | €0,10 |

Een speldag is 24 minuten (`DAY_LENGTH_S`): aardappelen zijn na ruim een halve speldag rijp, bieten na twee. De opbrengst is `kgBasis` keer de
kwaliteit van het ploegen (0,6 tot 1), het zaaien (0,5 tot 1) en het bemesten (+20%), keer de oogstfractie van de rijen; de prijs krijgt de kwaliteit
van de afleverrit. Machines: ploeg €15 huur of €300 koop, zaai- en strooimachine €10 of €250, rooier €20 of €600. Een volledige ronde levert ongeveer
€300 tot €350 winst op voor tien minuten werk: dat is in de buurt van een bijbaan (`boerderij_test.mjs` bewaakt de verhouding). De verkoop loopt
via `loopbaanVerdien` met de loonfactor van Landbouw (tot +30%) en het vak krijgt punten per taak.

## Speltijd en groei

`boerderijTijd(world)` (elk beeld in `updateGameplay`, na de dagcyclus) telt de speluren uit `world.clock`: ook over middernacht en na slapen of een
treinreis, niet bij een sprong terug (een lading). De boerderij heeft dus een eigen teller en hangt niet aan de kalenderdag van een savegame
(die schuift mee met het verhaal en hoort bij het opgeslagen spel). Altijd zomer: het groeiseizoen is meerdere rondes, er is geen winter en geen modder.

## Opslag en Samen spelen

- De boerderij is **van de speler** en leeft in zijn eigen opslag onder `gde-boerderij-v1` (`KEYS.boerderij`), nooit in een savegame (net als de
  loopbaan), en geldt voor elk opgeslagen spel op dit apparaat. Het perceel staat vast zodra het gevonden is (`vindAkker` uit `sidejob_bieten.js`).
- Een leeg, oud of kapot profiel geeft een geldige lege boerderij (`normaliseer`); een gezaaid veld zonder gewas of zaaitijd wordt braak; volle of
  geblokkeerde opslag laat het spel gewoon doorlopen.
- **Samen spelen:** iedereen heeft zijn eigen boerderij op zijn eigen apparaat. Een gast draait `updateGameplay` niet en mag geen bijbaan starten
  (docs/COOP-GAST.md): zijn gewassen groeien dus niet terwijl hij in andermans wereld meespeelt, ze wachten op hem. Wat wie het spel opende met een
  verkoop verdient deelt hij zoals alle verdiensten met de gasten.

## Niet gedaan (de uitbreiding)

Eggen als aparte stap, graan, uien, koolzaad en gras, meer percelen, een kleine veestapel of weide (koeien, schapen en paarden bestaan als
wereldleven), machines kiezen uit meerdere typen en koppelen met een eigen keuzescherm, en het werk met andere voertuigen dan de trekker. De
tabellen in `boerderij.js` (`GEWASSEN`, `MACHINES`, `TAKEN`) en `BAND` zijn de plekken waar je ze toevoegt.
