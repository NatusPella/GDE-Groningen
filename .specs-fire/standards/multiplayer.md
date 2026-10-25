# Spec: Samen spelen (multiplayer)

> Canonieke spec. Vervangt de regelinhoud van `docs/MULTIPLAYER-VISIE.md`,
> `docs/COOP-GAST.md`, `docs/COOP-OPSLAAN.md` en `docs/COOP-OVERDRAGEN.md`;
> die blijven als detailnaslag. `AGENTS.md` wint bij twijfel.

## Doel

Eén wereld, meer spelers: één spel draait de wereld, de anderen tekenen snapshots
en sturen invoer. Eenspeler is een sessie van één. Iedereen houdt zijn eigen geld,
verhaal en bezit; elke nieuwe functie krijgt een regel over Samen spelen.

## Rollen

- **Wie het spel opende** (intern `host`) draait de wereld (tijd, weer, verkeer,
  politie, opdrachten), maar is geen baas: iedereen is gelijkwaardig en de rol kan
  wisselen (#439).
- **Gast** is een dunne client: `updateGameplay` doet niets bij
  `coopRole === 'client'`.
- **Lokaal is iedereen de hoofdpersoon** van zijn eigen verhaal en ziet de anderen
  als online-avatar; geen rol per plek (#455).
- **Enige extra recht:** kicken en de wachtkamer van zijn sessie.

## Opdrachtstand per groep

- Elke opdracht heeft een id (`<index>|<label>`); stand en deelnemers staan per id
  in `coopmissie.js`, zodat groepen elkaar niet overschrijven. De host stuurt de id
  mee in `missie`; een gast kent alleen zijn eigen id en keuze.
- **Meedoen?**: J of N, 10 s, **geen antwoord is nee** (toeschouwer); verplicht bij
  `presence 'beide'`/`needsTwo`; een spoilerwaarschuwing vraagt een eigen J; geen
  late instap bij race, kluisklus of timer (een J later dan 15 s telt niet).
- Meedoen geeft de volledige beloning en de eigen verhaalstap; nee of wegvallen
  geeft niets.

## Overdracht

- Elke speler kan gevraagd worden (20 s, J/N); de momentopname gaat in stukken van
  800 tekens over de sessie. Bij mislukken houdt de oude host het spel
  (terugvalkamer, 40 s); bij wegvallen neemt de opvolger (`rangschik`) over na 12 s
  stilte.
- Mee: klok, dag, weer, gezocht, opdracht met stage en tijd, kapotte objecten,
  bezette voertuigen (model, kleur, schade), zaad en plek. Niet mee: verkeer,
  voetgangers en dieren, geld en voortgang per speler, het verhaal van de nieuwe
  host.
- Elke melding zegt wat er gebeurde, wie het spel heeft en wat de lezer doet.

## Passive mode en PvP

- Iedereen begint passief; schade tussen spelers alleen als beiden actief staan,
  met 10 s afkoel. Een kogel gaat door een passieve speler; wie weggaat is weer
  passief.
- Neergaan door een speler kost niets (volle gezondheid, zelfde plek, 6 s
  bescherming); dood door de wereld blijft zoals hij was.
- PvP alleen buiten passief; bloed en gore mogen daar (constitutie 6) maar worden
  nog niet getekend. Een aanval op een passieve speler meldt dat één keer per 5 s.
- Arena (#454): 2–8 niet-passieve spelers, 2,5 minuut, geen late instap of
  teamwissel.

## Beloningen en bewaren

- Beloning per gebeurtenis met een id, nooit dubbel (`coopbeloning.js`,
  `BONUS_FACTOR` 1); wedstrijden belonen per plek.
- Iedere speler schrijft zijn eigen save: elke 60 s, na een gelukte opdracht, bij
  binnenkomst en bij het einde van de sessie.
- Geld, loopbaan, gebieden, prestaties en de eigen verhaalstap gaan naar de eigen
  save; wereld en klok van de wereld.

## Wat een gast wel en niet kan

**Wel:** lopen (eigen focus boven 150 m, B haalt je bij de groep), winkelen, eten,
bijrijden (E), stuur doorgeven (Y), een vrij voertuig besturen (niet bus, trein,
heli of vliegtuig), hengelen, boeren, wapen uit eigen save, taxi/bezorgen/krant
samen, wedstrijd of opdracht aanvragen met E, passief/PvP, roepen.

**Niet:** voertuigen, wapens of tuning voor de wereld kopen, gesprekken met
personages, spuiten en gooien, minigames die een lichaam of voertuig in de wereld
zetten, heli besturen, een filmpje voor iedereen overslaan (wel de eigen weergave),
snelreizen via de kaart (het safehouse-anker wel), de tijd verzetten, cheats of
testmenu, en de hostrol.

## Bestanden

Net: `net/hub|session|brokers|codec|protocol|interp.js`, `coopnet.js`,
`coopfoci.js`, `coopextra*.js`. Regels:
`coopmeedoen|missie|gast|gastlokaal|bestuur|gezocht|wapen|pvp|pvpwereld|wedstrijd*|bijbaan|status|hostwissel*|beloning|deel|checkpoint|save|bezit.js`,
`spelersregister.js`, `pvparena.js`. Schermen: `lobby.js`, `lobbyui.js`,
`samenpanel.js`, `coopgate.js`, `coopspelersui.js`, `coopscene.js`, `coophold.js`.

## Tests

Puur (`scripts/*_test.mjs`): per module hierboven, plus `net_*`, `coop_scenarios`,
`coopregressie`, `vrijdag`, `coopduur`, `coopwedstrijd_padel`. Electron
(`scripts/coop/testbank.mjs`): `basis`, `net`, `opening`, `gastkant`, `bestuur`,
`wedstrijd`, `uitelkaar`, `gastkant_443`, `gastkant_434`; avondscenario
`playtest_sim.mjs`.

## Open punten (met issue)

1. Hostrechten zijn incompleet: startknop, "Iedereen stoppen" en
   filmpje-overslaan zijn ook van de opener.
2. Opdrachtstand per groep gaat nog niet mee bij overdracht (#452); bloed in PvP:
   regel zegt mag, code niet.
3. De afstandsregel (110 m tegenover focus boven 150 m) is niet eenduidig.
4. Gastenkant arena, chat/voice (#451) en dedicated servers (#450) staan open.
5. Niets met echte spelers op meerdere computers over internet bekeken.
