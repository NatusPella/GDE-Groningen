# Loopbaan: een vak per soort werk, met niveaus en titels (#381)

Voor wie aan `loopbaan.js`, `loopbaanlive.js`, `loopbaanui.js` of een vak werkt dat geld uitbetaalt. Tests: `scripts/loopbaan_test.mjs`,
`scripts/loopbaan_balans_test.mjs`, `scripts/loopbaan_coop_test.mjs`.

## Wat de speler ziet

Pauzemenu › **Loopbaan**: zestien vakken in drie groepen (vervoer, werk, sport en spel). Per vak een icoon, het niveau (1 tot 6), de
functietitel van dat niveau en een balk naar het volgende. Rechts staat wat je in het gekozen vak gedaan hebt (kilometers, ritten,
potjes, verschillende plekken), wat er nog nodig is voor de volgende titel en hoeveel meer het vak betaalt. Voor de vakken met
bijbanen staan alle bijbanen eronder, met een vinkje voor wat je al gedaan hebt. Een niveau omhoog komt als een kaartje: *"Kaartjesknipper: Spoor niveau 3, 10% meer loon"*.

| Groep | Vakken (titel op niveau 1 → 6, bijvoorbeeld bij Spoor: Perronstaander → Spoorbaas van het Noorden) |
|---|---|
| Vervoer | Spoor (km), Bus (km), Taxi, Bezorging, Water (km), Lucht |
| Werk | Handhaving, Kantoor, Podium, Horeca, Kermis, Klussen |
| Sport en spel | Padel, Golf (disc en pitch and putt), Racen (kart, drift, regatta, bruggenrace), Buiten (hengelen, skaten, skiën, klimmen) |

Alle titels zijn verzonnen (geen echte bedrijven of beroepsorganisaties) en staan in `VAKKEN` in `loopbaan.js`.

## Hoe het telt

Elk vak heeft ervaringspunten (`xp`), een teller in zijn eigen eenheid (`n`: km, ritten, potjes, ...) en een lijst met verschillende
plekken (`uniek`: stations, padelbanen, bijbanen). Een nieuwe plek geeft eenmalig 8 punten extra, dus variatie loopt sneller dan
dezelfde baan herhalen.

| Niveau | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| Punten vanaf | 0 | 50 | 140 | 300 | 560 | 950 |
| Loon ten opzichte van niveau 1 | basis | +5% | +10% | +16% | +22% | +30% |

Waar de punten vandaan komen (de haken zijn klein en staan bij de bestaande plek waar het geld of de teller al zat):

- **Bijbanen** (`sidejobs.js`, `completeRound`): elke ronde 8 punten (10 zonder fout) in het vak van de baan (`BAAN_VAK`; wat nergens
  in staat is een klus). Het loon van de ronde krijgt de loonfactor van het vak, bovenop de bestaande bijbaanniveaus.
- **Spoor**: kilometers van elke treinreis (`stationtravel.js`, 1,5 punt per km, plus het station als nieuwe plek), een dienst als machinist
  (`machinist.js`, loon met de factor) en korting op het kaartje (`loopbaanPrijs`: de prijs gedeeld door de factor).
- **Bus en Water**: kilometers die je zelf in een bus of een boot rijdt (`achievementtracker.js`, 3 punten per km), naast de ronden van de bijbanen.
- **Padel, Racen, Kermis, Buiten**: de plek die de prijs uitbetaalt roept `loopbaanVerdien` aan (`padel.js`, `driftzone.js`,
  `kermis.js`, `carbid.js`, `postgame.js`); kart en regatta betaalden niets en krijgen een kleine **premie** (tot €30, afnemend per plaats).
- **De rest** (discgolf, pitch and putt, hengelen, skaten, skiën, klimmen, helikopter, pannenkoekenschip, reuzenrad, zwemmen, wandelen):
  `STAT_VAK` in `loopbaan.js` hangt aan de bestaande prestatietellers (`recordStat`, via `setStatListener` in `achievements.js`), met een premie
  van €10 tot €20 waar het vak anders niets uitbetaalt.
- Een speler die al lang speelt begint niet bij nul: de eerste keer zaait het profiel uit wat de prestaties al telden (hooguit tot niveau 3,
  `zaaiUitPrestaties`). Bijbanen zaaien niet: die staan per spel in de savegame.
- Cheats: zolang de prestaties geblokkeerd zijn (`setAchievementGate`) tellen er ook geen punten. Het loon blijft de gewone factor.

## Balans

De loonfactor is begrensd op +30%, geldt alleen voor wat een vak zelf betaalt en raakt missies, winkels, vondsten en reparaties niet.
Bovenop de bijbaanniveaus (tot ×1,6, `economy.js`) komt dus hooguit ×1,3. De premies zijn klein ten opzichte van een bijbaanronde. Het tempo:
niveau 2 komt binnen een kwartier van het vak, niveau 6 kost uren echt spelen (zo'n 3 tot 8 uur per vak bij wie er alleen dat doet;
wie het hele spel speelt haalt niet alle vakken op het hoogste niveau). De test `loopbaan_balans_test.mjs` bewaakt de verhoudingen met de
tijden per gebeurtenis die in de test staan (geschat uit de speeltesten); een nieuwe haak die geld uitbetaalt moet bewust in de lijst
`haken` van die test komen.

## Opslag en Samen spelen

- De loopbaan is **van de speler** en leeft in zijn eigen opslag onder `gde-loopbaan-v1` (`storagekeys.js`, `KEYS.loopbaan`; geen
  `-nieuw`-achtervoegsel: ze hoort niet bij een verhaallijn). Ze staat nooit in een savegame, ook niet in die van wie het spel opende,
  en geldt voor elk opgeslagen spel op dit apparaat (zoals de prestaties). Een gast neemt zijn loopbaan dus mee naar elke wereld.
- Het profiel wordt na elke verandering met een korte vertraging geschreven (en bij `pagehide`); een tweede tabblad kan niets
  terugdraaien (`voegSamen` neemt per vak het grootste). Een leeg, oud of kapot profiel geeft een geldig leeg profiel (`normaliseer`);
  een volle of geblokkeerde opslag laat het spel gewoon doorlopen.
- **Samen spelen:** wie het spel opende verdient volgens zijn eigen niveau. Elke gast ook, op zijn eigen apparaat. De bestaande
  `beloning` van de gastheer (de helft van het bedrag, `GAST_DEEL`) krijgt er twee velden bij: `vak` en `xp` (de helft van de punten).
  De gast rekent daar zijn eigen loonfactor over (`loopbaanGast`, `coopnet.js`) en telt de punten bij zijn eigen profiel. De gastheer deelt het bedrag
  vóór zijn eigen factor, zodat een hoog niveau van de een niet de ander beloont of benadeelt (`loopbaanDeel`: `{ vak, basis, xp }`).
  Er is geen nieuw bericht en geen extra netwerkverkeer: de punten van een gast lopen alleen mee met geld dat de gastheer toch al deelt.
  Een gast draait `updateGameplay` niet, dus zijn tellers (kilometers, potjes) lopen niet; wat hij als meekijker verdient telt wel.
  Een beloning zonder `vak` (een missie) werkt zoals voor de loopbaan.
- Niet gedaan: de titel bij de naam van een speler (optioneel in het ontwerp) en punten voor kilometers die een gast als passagier maakt.

## Een haak toevoegen

1. Vak en eenheid staan in `VAKKEN`; een nieuwe bijbaan komt in `BAAN_VAK` (de test controleert dat elke bijbaan uit de bron er staat).
2. Geld uitbetalen: `loopbaanVerdien(w, vak, basisbedrag, { xp, n, uniek })` in plaats van `w.money += x; w.coopDeel(x)`. Het geeft het bedrag
   terug dat is uitbetaald (voor de banner). Geen geld, alleen punten: `loopbaanTel(w, vak, { xp, n, uniek })`.
3. Een prestatieteller zonder eigen haak: een regel in `STAT_VAK`.
4. Draai `node scripts/loopbaan_test.mjs`, `loopbaan_balans_test.mjs` en `loopbaan_coop_test.mjs`.

Niet door een mens in beeld bekeken: zie het changelog voor wat Claude in beeld heeft gezien.
