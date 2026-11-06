# Cijfers voor het eindrapport (Lead, geverifieerd op 41340dd4)

Deze cijfers zijn uit de bron gehaald met kleine, pure Node-imports of gerichte greps; ze dienen als
ruggengraat voor `RAPPORT.md` en om de deelrapporten te controleren. Geen runtime, geen spel.

## Stand

- Branch `main`, HEAD `41340dd4` ("Docs: reviewarchieven van de andere sessies bewaard").
- Nieuwste release in `CHANGELOG.md`: **0.57.4** (6-11-2026); geen `[Unreleased]`-sectie.
- Werkboom schoon op het moment van de review.

## Verhaal (bron: `game/js/storyarc.js`)

- 37 verhaalstappen: **30 missies** (`M01`-`M30`) + 7 activiteitenstappen (`k-*`, `r-*`, `s-*`).
- 6 delen: `kop` (Akte 1), `romp` (2), `staart` (3), `zuid` (4), `ontzet` (5, finale) en `nazomer`
  (Deel 4).
- Totale missiebeloning: **€24.350**; kleinste beloning €50 (`minReward`).
- Verplichte aankoop in het verhaal: één stap van **€150** (`M03 Het Loket`); laagste saldo in het
  slechtste geval **€800**; als de helft van de missies wordt overgeslagen eindigt de speler op
  **€12.525**. Geld blokkeert het verhaal dus niet.
- Samen spelen (audit `node scripts/coopmissie_audit.mjs --samenvatting`): **29 van 30 missies
  volledig samen**, 1 solo (M21, bedoeld), 0 deels/niet; 150 stappen, waarvan 2 met de vlag
  `iedereen`.

## Herhaalbare inhoud (bron: modules + docs)

- **47 bijbanen** in `SIDE_JOBS` (`sidejobs.js` + `sidejob_bijbaan/paneel/stad/keuze.js`): 24 losse
  modules, 6 + 3 + 8 uit de datamodules, 2 zeeschipdiensten, bietenoogst, boerderij, snackoverlast.
  Bijbaanniveaus: 5, op 0/5/12/25/45 rondes (`LEVEL_AT`), titels Nieuweling → Legende.
- **26 vrije activiteiten** in `ACTIVITY LIST` (`activities.js`): carbid, kermis, reuzenrad,
  geheimen, driftzone, discgolf, pitchputt, skatepark, kartbaan, zwembad, klimtoren, waterski,
  carillon, pannenkoekenschip, hengelen, boeren (gast), wandeling, snackketen, evenementen, regatta,
  ringrace, vliegschool, safehuizen, PvP-arena, vluchtdienst, vaardienst.
- **20 vlieglessen** (11 vliegtuig + 9 helikopter; `vliegschoolrules.js` `LESSEN`).
- **19 loopbaanvakken** in 3 groepen (`loopbaan.js` `VAKKEN`).
- **5 postgame-uitdagingen**: bruggenrace, fierljeppen, skûtsje, Fjord Frituur, koe
  (`postgame.js` `CHALLENGES`).
- **13 zomerevenementen** in de agenda (`evenementen.js`), 9 dorpen met dorpsuitjes
  (`ommelandlines.js`), 30 verstopte eierballen, 8 geheimpjes, 12 wereld-einden.
- **Prestaties**: 193 statische `ACHIEVEMENTS`-regels + per missie drie gegenereerde regels
  (klaar/zilver/goud) plus extra's.

## Samen spelen (bron: `game/js/coopstatus.js`)

| Soort | Werkt | Deels | Nee | Toelichting |
|---|---|---|---|---|
| Missiestappen | 27 | 1 | 1 | alleen `train` is nee; `convoy` deels |
| Missietypes (zonder stappen) | 3 | 1 | 1 | `stunt` deels, `boat` nee |
| Bijbanen (register) | 5 | 0 | 13 | werkt: taxi, bezorger, krantenwijk, vracht + bus; de rest van de 47 valt terug op nee |
| Activiteiten (register) | 13 | 7 | 7 | werkt o.a. discgolf, pitchputt, kartbaan, klimtoren, hengelen, pannenkoek, carillon, boeren, regatta, ringrace; nee: carbid, kermis, reuzenrad, drift, zwembad, waterski, vliegschool |
| Minigames (register) | 3 | 0 | 9 | werkt: padel, kartrace, bruggenrace; nee: racers, kegelspellen, heli, duif, postgame-behalve bruggenrace |
| Voertuigen | 12 | 1 | 2 | trein deels; trekker en heli nee |

- Een gast kan lokaal zelf doen (`GAST_ACTIVITEITEN`): **hengelen, pannenkoeken bakken, beiaard,
  boeren** — vier activiteiten.
- Bijbanen met een gastregel (`BIJBAAN_REGELS`): **taxi (passagier), bezorger (tweede bezorger),
  krantenwijk (helper), vracht (bijrijder)**; de bus werkt via `buscoop.js`.
- Gedeelde wedstrijden (iedereen start met E, tegen elkaar): discgolf, pitchputt, kartbaan,
  klimtoren, padel, skatepark, ringrace en de hengelwedstrijd in Meerstad.
- Groepsbonus 1+1=3: elke extra deelnemer geeft elk lid 50% meer loon, tot 3× per persoon
  (`groepsbonus.js`); de eigen loopbaanfactor komt daar nog overheen.

## Economie (bron: `game/js/economy.js`, `loopbaan.js`, `sidejobs.js`, `postgame.js`)

- Startsaldo **€500**.
- Missie opnieuw: klusloon **50%** van de beloning; medaillebonus per trede 15/25/40% van de
  missiebeloning (eenmalig per trede).
- Bijbaanloon: basis × **1,5**, plus **15%** per niveau boven 1.
- Loopbaan: drempels 0/50/140/300/560/950 punten; loonfactor **1,00 → 1,30**; een nieuwe plek
  geeft 8 punten extra; een bijbaanronde 8 punten (10 zonder fout).
- Postgame: prijs per medaille **€0/200/400/700**; Fjord-shiftbonus **€0/120/250/450**; Fjord
  verdient daarnaast **€250 per speldag** (dag = 24 minuten) op uur 7.
- Vliegschool: medaille betaalt **€25/€40/€60** (alleen de eerste keer), opnieuw 6 punten, les
  zonder medaille 2 punten.
- Speldag duurt **24 minuten** (`daynight.js`), weer kent 6 typen en geen winter.

## Observaties om te controleren in de deelrapporten

1. De `Te doen`-catalogus toont in `minigameItems` zestien minigames (padel, carbid, botsauto,
   drift, discgolf, pitchputt, skatepark, kartbaan, ringrace, zwembad, klimtoren, waterski,
   vliegschool, ballonjacht, duivenmodus) en verder de missies, bijbanen, Ommeland, verzamelen en
   postgame. Activiteiten zonder `legend`/`todo`-regel (o.a. regatta, reuzenrad, carillon,
   pannenkoek, wandeling, snackketen, evenementen, hengelen, vaardiensten, safehuizen, PvP) moeten
   via hun eigen module of `activityTodoItems` in de lijst komen; controleer of dat echt gebeurt.
2. De vliegschool-tekst in `todo.js:213` zegt "Zes lessen met het vliegtuig en zeven met de
   helikopter" terwijl `vliegschoolrules.js` 20 lessen heeft (11 + 9). Vermoedelijk een
   verouderde detailtekst.
3. `sidejob`-niveaus tellen **rondes** (herhaling), terwijl de loopbaan **variatie** beloont
   (unieke plekken). Twee progressies naast elkaar kunnen verschillend gedrag uitlokken; check of
   dat in de UI uitgelegd wordt.
4. De postgame verdient **€250 per speldag** passief, naast uitdagingen van maximaal €700; check of
   dat de endgame-economie niet te vrijblijvend maakt.
