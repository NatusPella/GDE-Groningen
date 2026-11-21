# Voetbal Sim Light in de Euroborg (21-11, #981)

Een echte, korte voetbalwedstrijd als light sim: vijf tegen vijf op een klein veld binnen de tribunes van de Euroborg, in de speelstijl van een voetbalgame. Alles is verzonnen (teams, namen, commentaar); er komen geen echte clubs, spelers, competities, merken of logo's in (constitutie 2) en er wordt geen geweld getoond (constitutie 6). Gebouwd zonder Electron: alles is bewezen met pure tests en node-simulaties, **niets is in beeld bekeken** (zie de lijst onderaan).

Spec: [.specs-fire/standards/mechanica.md](../.specs-fire/standards/mechanica.md) (sectie "Voetbal in de Euroborg"). Samen spelen: [COOP-GAST.md](COOP-GAST.md).

## Wat er is

| Onderdeel | Bestand | Wat |
|---|---|---|
| Regels, afmetingen, teams | `game/js/voetbalrules.js` | veld 26 x 42 m, doelen 4,4 x 1,7 m, helften (90 of 45 s), invoerbits, vormingen, moeilijkheid, medailles, beloning, record |
| Bal | `game/js/voetbalbal.js` | rollen met wrijving, stuiten, paal en lat, net, doelpunt, uit; deterministisch |
| Computerspelers | `game/js/voetbalai.js` | rollen, vorming die met de bal meeschuift, druk, aanname, pass, schot, keeper |
| Wedstrijd | `game/js/voetbalmatch.js` | fasen, klok, aftrap, uitbal, overtreding, doelpunt, wisselen, mensen, momentopname en spiegel |
| HUD-model | `game/js/voetbalstatus.js` | strook (simhud) en bord (createBoard), uitleg, wat-nu-zin |
| Teksten | `game/js/voetbaldata.js` | Verslaggever Hilbrand, Oma Trijntje, alles verzonnen |
| Tessa | `game/js/voetbalkarakter.js` | dunne, ontkoppelde laag (zie onder) |
| De activiteit | `game/js/voetbal.js` | veld, doelen, spelers, camera, invoer, Samen spelen, einde en beloning |
| Penaltyserie | `game/js/penalty.js` | blijft bestaan als bonusmodus (Strafschoppen) |
| Tests | `scripts/voetbal_test.mjs`, `scripts/voetbal_botsim.mjs` | zie onder |

De plek: bij de spelerspoort aan de zuidkant van de Euroborg (E), een paar meter naast de poort van de penaltyserie. Het veld ligt in het midden van de pitch (de lange as noord-zuid); jij valt aan naar het zuiden en de camera hangt achter het noordelijke doel.

## Spelregels (light)

- Twee helften van 90 seconden (kort: 45). De keuze staat in `gde-voetbal-v1` (alleen dit apparaat, geen savegame); `window.__voetbal.zetDuur('kort')` zet hem (een keuze in de UI is nog niet gebouwd, zie "Niet gedaan").
- Aftrap voor jou, na de rust voor de tegenpartij, na een doelpunt voor wie hem kreeg. De klok loopt alleen in het spel.
- Uitbal: de bal gaat uit, een korte pauze, dan een herstart: inworp (zijlijn), hoekschop of doelschop (achterlijn, afhankelijk van wie hem het laatst raakte).
- Doelpunt: korte viering van de schutter, een slow-motionflits (de bal beweegt de eerste seconde op 35%), een witte flits (uit bij verminderde beweging) en het commentaar.
- Geen buitenspel, geen kaarten. Overtreding: een mislukte tackle van achteren, of een sprinter die van achteren op de bal bij een tegenstander botst, geeft de ander een vrije bal.
- Er is geen sidewissel na de rust: team 0 valt altijd aan naar het zuiden, zodat de camera en je richting kloppen (zie "Niet gedaan").

## Besturing

Alle toetsen zijn canonieke toetsen van de echte keymap (herbinding en de controller volgen via de toetsplaatjes `{TOKEN}`).

| Actie | Toetsenbord | Controller |
|---|---|---|
| Lopen | WASD of pijltjes | linker stick |
| Sprinten | Shift (kost adem, de meter loopt leeg en herstelt) | LT |
| Korte pass | F | A |
| Lange pass of voorzet | E (houd vast voor kracht) | B |
| Schot | Spatie (houd vast voor kracht; richt met de stick, links/rechts kiest de hoek) | X |
| Tackle, druk zetten | Ctrl | LB |
| Wisselen van speler | Q (naar wie het dichtst bij de bal staat) | Y |
| Keeper | Spatie of Ctrl duikt in de richting van de stick; F of E speelt de bal uit | idem |
| Stoppen | Backspace | D-pad rechts |

Vanzelf wisselen: bij verdedigen of een losse bal neem je de speler die het dichtst bij de bal staat (met een marge, zodat het niet heen en weer springt); na een pass neemt de dichtstbijzijnde mens de ontvanger over.

Bal-gevoel: de bal blijft vlak voor de voet van wie hem heeft (een dribbel die meeloopt); de aanname hangt af van snelheid en afstand: een rollende bal neem je aan, een kogel ketst af; de radius waarin je hem pakt wordt kleiner naarmate hij harder gaat.

## Computerspelers

- Rollen en vorming 1-2-2: een keeper, twee verdedigers, twee aanvallers; de lijnen schuiven met de bal mee en met bezit.
- Pressing: bij een tegenstander met de bal zetten de twee dichtstbijzijnden druk; bij een losse bal gaat de dichtstbijzijnde erop af. Tackles volgen de moeilijkheid.
- Balbezit: schieten binnen ongeveer 13 meter (de hoek kiest de computer weg van de keeper), overspelen naar de beste vrije maat (vooruit en open), dribbelen om de dichtstbijzijnde heen, een lange bal vanaf de eigen helft onder druk.
- Keeper: staat op de lijn tussen de bal en het doel, voorspelt waar de bal de lijn kruist, duikt met een kans die bij de stand hoort, vangt langzame ballen en slaat harde ballen weg.
- Moeilijkheid (de bestaande instelling, ontspannen, standaard of uitdagend): reactietijd, snelheid, schotspreiding, keeper en tackle van de tegenstander; je eigen maatjes spelen altijd op standaard, zodat een hogere stand de tegenstander lastiger maakt en je maatjes niet dommer. De test meet dat een uitdagende tegenstander vaker scoort dan een ontspannen.

## Beloning

- Medailles: brons winst, zilver winst met de nul, goud winst met een hattrick (drie eigen doelpunten). De eisen veranderen niet met de stand; de stand verandert de tegenstander.
- Record: het doelsaldo van je beste winst, per moeilijkheidsstand (de bestaande uitdagingen, `recordChallengeResult`; geen eigen save).
- Geld klein: €40 winst, €15 gelijk, €5 verlies, €10 extra bij de nul, plus de loopbaanpremie van `footballMatches` (€10, 14 punten).
- Prestaties: `voetbal_winst` en `voetbal_hattrick` (de teller klopt met `node scripts/spec_check.mjs --write`; Steam-teksten bijgewerkt).
- Kaartlaag (`act-voetbal`), startkaart, Te doen (`mg:voetbal`), hint, doel (`goal.js`), gebiedstat, Ubbo-regel.

## Samen spelen

Zie [COOP-GAST.md](COOP-GAST.md), rij "Voetbal Euroborg". Kort:

- **Van wie:** de wereld, de bal en alle computerspelers zijn van wie het spel opende (autoritatief). Een gast stuurt zijn invoer en tekent.
- **Meedoen:** E bij de poort nodigt iedereen uit (Meedoen? J of N), minstens twee spelers; twee tot vier mensen spelen in één team tegen de computer. 2 tegen 2 (mensen tegen elkaar) is niet gebouwd.
- **Zien:** de momentopname `lv` (het bestaande live-bericht, 12 keer per seconde, 60 getallen: fase, klok, stand, bal, eigenaar, jouw speler, tien spelers).
- **Invoer:** dezelfde byte als bij een voertuig; tijdens de wedstrijd krijgen de bits de betekenis van de voetbalknoppen. Daarvoor is één regel in `coopnet.js` gekomen (`world.coopKnoppenHaak`); er is geen nieuw bericht en het protocol is ongewijzigd (de test controleert dat `net/protocol.js` niets over voetbal zegt).
- **Beloning:** geld en loopbaanpunten per uitslag van wie het spel opende (met de groepsbonus), record, medaille en prestaties per speler uit zijn eigen uitslagsregel (`tijd` is zijn eigen doelpunten, `tekst` de stand).
- **Wegvallen:** de computer neemt zijn speler over, hij krijgt niets. **Later aansluiten:** geen instap halverwege. **Wissel van wie het spel opent:** de wedstrijd stopt, niemand verliest iets.
- **Test:** `voetbal_test` (invoer van drie mensen samengevoegd, nooit twee mensen in één speler, momentopname heen en terug door het kader, uitslag en beloning, wegvallen).

## Tessa

De eigenaar wil dat de speler voetbalt als Tessa. De tak `tessa-platteland-21-11` (`game/js/karakterbonus.js`) levert daarvoor de gegevens (sprint +6%, schot +8%, aanname +10%) en een `karakterVoorActiviteit('voetbal')`. Die tak staat nog niet op main; daarom is `game/js/voetbalkarakter.js` een interface met standaard-implementaties (geen bonus, geen wissel, geen extra teksten):

- `voetbalBonusVan(karakter)`: de factoren per speler; de sim past ze toe op sprint, schotspreiding en de aanname (per mens, dus per speler in Samen spelen).
- `karakterStart(w, 'voetbal')` bij het begin van een wedstrijd of penaltyserie en `karakterEind(w, bon)` bij het einde: het bestaande wisselmechanisme, terug aan het einde; een kapotte haak stopt de wedstrijd nooit.
- `tessaRegel('viering')`: alleen tekst uit `TESSA_REGELS.voetbal`, gebruikt bij een doelpunt.

**Bij de merge één regel** (bijvoorbeeld in `init` van `voetbal.js`, of waar de tak zijn eigen haken zet):

```js
zetVoetbalKarakterHaken({
  bonus: (k) => ({ sprint: voetbalSprint(k), schot: voetbalSchot(k), aanname: voetbalAanname(k) }),
  voorActiviteit: karakterVoorActiviteit,
  regels: TESSA_REGELS.voetbal,
});
```

De test (`voetbal_test`, "De aansluiting op Tessa") bewijst het gedrag met nep-haken, ook dat Tessa sneller sprint. Niet bewezen: het echte wisselen van het model (afhankelijk van de tak).

## Tests en bewijs

- `node scripts/voetbal_test.mjs`: 50 groepen: bal-fysica (deterministisch, rollen, stuiten, doelpunt, paal, lat, uit), invoer naar actie, wedstrijdstatus (klok, aftrap, helften, doelpunt, eigen doelpunt, slow-motion, uitbal, hoekschop, doelschop, overtreding, geen buitenspel), AI (vorming blijft in het veld, geen spelers door elkaar, keeper), moeilijkheid, mensen (lopen, sprint, dribbelen, aanname, schot, pass, voorzet, tackle, wisselen, keeper), Samen (invoer samenvoegen, momentopname heen en terug, wegvallen, uitslag), medailles, records en opslag, HUD, teksten (geen echte merken of clubs), de Tessa-laag en een robuustheidstest met drie mensen met willekeurige invoer.
- `node scripts/voetbal_botsim.mjs [aantal] [--duur=kort] [--stand=uitdagend]`: 100 wedstrijden computer tegen computer: gemiddeld ongeveer 3,0 doelpunten (eis 2 tot 5), geen vastlopers, geen NaN, niemand buiten het veld; thuis en uit even sterk (de volgorde van de spelers wisselt per stap, anders had team 0 een nadeel).
- `node scripts/coopwedstrijd_voetbal_test.mjs`: de host- en gastkant met een nephub (zoals de padeltest): uitnodigen en starten, 10 tot 12 momentopnamen per seconde, de stick en knoppen van een gast, wegvallen en zelf stoppen, een hele wedstrijd met vier botmensen, uitbetalen per speler (`betaalGast`, vak buiten), de uitslag, een rematch, het scherm van de gast met zijn spiegel (31 controles).
- `node scripts/voetbal_rook_test.mjs` (vraagt de gevendorde three.js, `cd desktop && npm run stage`): laadt `voetbal.js` met de echte three.js en een eigen scene in node en speelt een hele wedstrijd als speler en als gast uit; geen fouten, tien spelers in de scene, na afloop alles opgeruimd, het einde boekt een beloning. Dit bewijst de code, niet het beeld.
- Bijgewerkte tests: `activiteitensfeer_test`, `activiteitencatalogus_test`, `activiteitenspots_test`, `loopbaan_balans_test`, `padlogic_test`, `hud_test`, `steam_test`, `controls_test`, `uitleg_test`, `hintkit_test`, `coopstatus_test`, `spec_check` groen. `startkaart_test` en de difficulty-tests konden hier niet draaien (three is niet gevendord in deze werkmap).

## Te verifiëren in beeld (nog niet bekeken)

Niets van het volgende is gezien; de eerste beeldronde moet het nalopen.

1. **De plek van de poort** (1797,3; 1549,5) en de pitch: staat de poort vrij naast die van de penaltyserie, en lijkt het veld (midden 1804,3; 1458,1) binnen de pitch en de tribunes te liggen? De afmetingen en de plaats zijn uit de gebouwdata afgeleid.
2. **De richting**: valt het team van de speler naar het zuiden aan, hangt de camera achter het noordelijke doel, en is rechts op het scherm ook rechts voor de speler (veld-x loopt tegen de wereld-x in)?
3. **De spelers**: draaien de modellen de goede kant op (`rotation.y = hoek - pi`), lopen de benen mee, kantelt de keeper bij een duik de goede kant op (`rotation.z`, zoals bij de penaltykeeper), zijn de armen omhoog bij een viering, en zijn de shirtkleuren en broeken leesbaar (Stadjers groen, Hunebedders rood)?
4. **De bal**: de maat (zichtbare straal 0,17 m, fysieke 0,11 m), de schaduw, het rollen over het gras, de hoogte van een voorzet, de lat en de palen, het net.
5. **De camera**: volgt hij de bal zonder te trillen, ziet de speler zijn eigen speler (ring en pijl), is het zicht bij een doelschop en een hoekschop goed?
6. **Het bord en de strook**: de stand en klok bovenin, de krachtmeter tijdens het laden, de strook rechtsonder met stappen, adem, cijfers, de uitleg bij de aftrap, toetsplaatjes (ook op een controller), 13 px-vloer en contrast (4,5:1).
7. **De flits en de slow-motion** bij een doelpunt, en dat de flits uit staat bij verminderde beweging.
8. **De bediening**: voelt het dribbelen, passen en schieten goed; is de aanname niet te streng of te makkelijk; klopt de kracht van een schot bij het houden van Spatie; werken Q en de automatische wissel naar wens; is de keeper bestuurbaar?
9. **De AI**: loopt de computer zinvol, schiet hij niet te vaak of te weinig, vangt de keeper redelijk, is "ontspannen" echt makkelijker en "uitdagend" echt lastiger?
10. **De regels**: zijn de overtredingen niet te vaak (bot-sim: ongeveer 6 per wedstrijd), kloppen de herstarten (inworp, hoekschop, doelschop) en de pauzes.
11. **Samen spelen** met twee, drie en vier echte vensters: uitnodiging J/N, dezelfde stand en klok bij iedereen, vloeiende spelers en bal bij de gast, de knoppen van de gast (F, E, Q, Ctrl, Spatie) doen wat ze moeten doen, wegvallen, de uitslagkaart, geld en record per speler.
12. **De controller**: de indeling (`PAD_MAPS.voetbal`) in een echte run, ook in een Samen-sessie als gast.
13. **De kaart en de startkaart**: marker (zonder eigen glyph krijgt hij het balletje uit `drawIcon`), legenda, startkaart, Te doen, hint en de Tessa-teksten na de merge.
14. **Prestaties en loopbaan**: de twee prestaties, de premie en het record na een wedstrijd; dat het record en de medaille in de kaart en in Te doen kloppen.

## Niet gedaan

- 2 tegen 2 (mensen tegen elkaar): alle mensen spelen in één team tegen de computer.
- Een keuze kort of normaal in de UI (er is een voorkeur in `gde-voetbal-v1` en `window.__voetbal.zetDuur`).
- Van helft wisselen na de rust en een verlenging of strafschoppen bij gelijkspel (de strafschoppenserie blijft een aparte bonusmodus; een gelijkspel is een gelijkspel).
- Aanraakbediening (touch) voor het voetbal: alleen toetsenbord en controller (de laagdrempelige knoppen van `touch.js` kennen de voetbalknoppen niet).
- Eigen geluiden (menigte, fluitje): alleen de bestaande geluiden (`golf` slag, hole, rand) en de UI-tonen.
- Een echt Phosphor-voetbalicoon: de kaart tekent een eigen balletje met doelpalen, de HUD gebruikt bestaande iconen.
- De netwerkdekking in een echt venster en de wissel van wie het spel opent tijdens een wedstrijd.
