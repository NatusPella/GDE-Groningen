# Verhaalronde 3: reviews van de hele keten M01-M26

Doel: nog een ronde over de nieuwste main, met onafhankelijke lezers per perspectief, de zwakke plekken verwerken in teksten en scène-data
(zonder nieuwe opnames) en herhalen tot koude lezers de keten kunnen navertellen. Het werk staat in de branch `verhaal-ronde3`;
de tests zijn gedraaid, het spel is **niet gespeeld** en niet in beeld bekeken. De opnamevragen komen uit `node scripts/opnamelijst.mjs` (het bestand staat niet in git).

## Zo is het gedaan

Drie rondes, elke lezer een los subagent dat alleen de teksten kreeg (de vijf scripts in `nieuw/09-script-akte*.md` en een uittreksel van de HUD-doelen):

| Ronde | Lezers | Uitslag |
|---|---|---|
| 1 | koude lezer, redacteur humor en couleur locale, continuïteit en geografie, spelontwerper, taaltoegankelijkheid | koude lezer kon de keten navertellen met gaten (notaris en bewaarder, M10/M11, Tessa en Mem); 60 continuïteitspunten, 25 humorvoorstellen, ca. 150 taalpunten |
| 2 | dezelfde vijf, nieuwe agents, met hun ronde-1-review als controlelijst | koude lezer: quiz **12 van 12**; continuïteit 40 van 60 opgelost, 23 nieuwe punten; doelhelderheid 16 naar 22 van 26 missies helder |
| 3 | verse koude lezer met quiz van 15 vragen, en een regressiecheck continuïteit | koude lezer: **13,5 van 15** (streng); daarna zijn de laatste fouten en de twee gemiste antwoorden (het vet, waarom de bewaarder in de trein blijft) hersteld |

Voorbehoud: het zijn taalmodellen die het script in één keer lazen. Een quizscore meet hoe duidelijk de tekst is bij een doorlezing, niet wat een speler na twintig uur onthoudt.
De reviews zelf staan in de sessie-notitiemap (`verhaal3/ronde1..3`), niet in git.

## Wat zwak was en wat ermee gebeurd is

| Zwak punt | Wat is gedaan |
|---|---|
| **De notaris- en bewaarderregel** was het onduidelijkste punt (artikelnummers, "nietig", twee gevolgen door elkaar) | Eén regel, overal gelijk: *wie de bal bewaart, zit de jury voor en tekent de uitslag*; Jelle laat zich om drie uur bij de notaris inschrijven als nieuwe bewaarder en tekent dan zelf de uitslag. Artikelnummers en "nietig" zijn weg uit script, clues en HUD. Mevrouw Tuinstra heet nu mevrouw Hoving (te dicht bij Terpstra). Waarom de bewaarder in de trein zit staat nu in M19.3. Feitenblad in de STIJLGIDS bijgewerkt |
| **Ingrediënten en vrienden** (het vet had geen vriend, "plakje vier" in de dialoog) | Het vet van 1953 is van Lammerts vader (M13.3); de plakjes-telling is uit de dialoog (de HUD telt); "bloem" is overal "meel" |
| **Motivatie** (Oma's recept vóór Oma, waarom het museum niet bellen, waarom een wagen, Jelle en de alarmen) | M07.1 laat Oma als winnares van 1953 bakken; M03.4 beantwoordt "waarom bellen we het museum niet"; de loketbediende noemt de wagen; Jelle telt de alarmen "voor de gezelligheid" (M10.1); Mem hint eerder op Ljouwert (M10.4) |
| **Doelen en HUD** (meerdere taken per zin, "pakken wij hem", spoilers, kleurgebonden "streep in het groen") | Elke intro heeft een `Doel:`-zin met één taak; M10 heeft een haalbaar doel (als eerste bij de sloot); M16/M21/M25/M26 hebben een helder doel; "het groene vak" is "het vak"; touwen, bruggen en as kloppen met het script |
| **Tegenspraken** (Berend 1982/1985, twee contractjuryleden, twintig of twaalf jaar, "morgen" of "maandag", de ladder, het horloge) | Allemaal gelijkgetrokken; de twintig jaar kennen en twaalf jaar zwijgen staan in het feitenblad; horloge keert terug in E2; M26.12 heeft één contractjurylid |
| **Humor en stem** (Tammo legt zijn gevoel uit in M22.4, Mem te lang, uitleg door wie het weet, scoreboekhouding) | M22.4 spaart Tammo's zin voor M26.7; Mem, Oma en Berend zijn korter en droger; telefoonopeners en "Ik ben X, beroep" gevarieerd; verboden zinsbouw blijft onder het plafond (`story_similarity_test`) |
| **Taal** (juristentaal, lange beurten, onduidelijke verwijzingen, dialect zonder ondertitel) | Beslag, beleg, fierljep, zijl en skûtsje in de scène zelf uitgelegd; beurten van meer dan 30 woorden gesplitst; ondertitels toegevoegd voor *Kon minder*, *Foar mem*, *Kom mor*, *Wat mout, dat mout*, *Mien jong*, *jonge* en het Groningse spreekwoord; fouten in bestaande ondertitels hersteld |
| **Geografie** (Eemshaven is geen Eemsdelta, kwelder bij Noordpolderzijl vanaf het meer, kermis en dijk, B5, Herestraat is voetgangersgebied) | Waddenkust, zijl en kwelder in korte beurten, bus naar Blauwestad, B5 bij Aduard, straten rond de notaris vervangen door Poelestraat en Gelkingestraat (**niet op de kaart gecontroleerd**) |
| **Couleur locale** | Zijl, schapen op de kwelder, Appingedam met eenden, Grijpskerk, kerkenpad, bedevaart-Geesje, "geen containerterminal"; Tessa zegt geen "Stad" meer |

## Bewust niet gedaan (andere ronde of een mens)

- **Tempo.** Alleen tekst schrappen verlicht het; de opening telt nog ruim 60 regels voor de eerste stuntpunt en M20, M22, M26 zijn lang. Echt oplossen vraagt een speelbare opening, **M26 herschikken** (bakken ná de blokkade), **M11 en M20 splitsen**, een eerste bakmoment vóór M25 en een speelbare M21-Tammo-beat. Dat zijn ontwerp- en codewerk, geen tekstwerk.
- **Tegenslag.** De helden winnen tussen M06 en M20 bijna elke missie; één echte tegenslag (en een HUD-teller "Gronings Ontzet over X dagen") vraagt ontwerp.
- **M18 en M21** (de keuzes) zijn nog een gok en een schijnkeuze; **M05** en **T4** zijn sleutelmissie en lange rit.
- **Rotor Roelf** (te dicht bij Roelfien) en **UMCG** (echte instelling, nu "het ziekenhuis" erbij) blijven; hernoemen raakt ca. 30 bestanden en opnames.
- **KALENDER.md** is het oude arc; `calendar.js` `STEP_DATES` zet T2 nog op 20 augustus (script: 19e).
- **Nagekeken door een mens:** het dialect (zie [DIALECT-NALEZING.md](DIALECT-NALEZING.md)), de straten rond de Oude Boteringestraat en of daar water ligt (M26.4), de namen Oldenhuis Bakt, Pand & Poen en Spuit & Klaar op echte bedrijven, "House of Groningen" (C00.3 regie) als echte naam, en "al sinds 2019" bij het museum (M05.3, opgenomen).

## Tests

`build_story_data`, `story_similarity_test`, `storydata_test`, `storychoice_test`, `storyflow_nieuw_test`, `storyapps_test`, `akte1..5`-tests, `cutscenes_akte1..4_test`, `text_audit`, `voice_coverage --quiet`, `hud_test`, `reis*_test` en `calendar_test` slagen op de branch.
Niet gedraaid: de Electron-verhaaltest en de zware wereldchecks (voor de coördinator, bij een release). `voice_coverage` kon op main niet draaien (de `export`-woorden waren weg uit `sidejobvoice.js`); `voicelines_collect.mjs` is daarvoor aangepast.
