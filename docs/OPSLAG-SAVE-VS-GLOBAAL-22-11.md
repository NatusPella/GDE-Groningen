# Opslag: per save of per apparaat (22-11)

Aanleiding: een nieuw spel toonde 12% kaart verkend, 75 prestaties, veroverde gemeenten en een politieauto in de garage. Oorzaak: die gegevens stonden in gedeelde `gde-*`-sleutels van het apparaat, niet in de save.

Regel: **spelvoortgang en wat de wereld van die speler is, hoort bij de save; apparaatvoorkeuren, toegankelijkheid, taal, audio, toestemmingen, toetsindeling en eenmalige uitleg blijven bij het apparaat.** Samen spelen (#429) verandert hier niets: een speler heeft zijn eigen voortgang in zijn eigen save, ook als gast.

## Hoe het nu werkt

- `game/js/savescope.js` (puur) en `savescopeactivate.js` (boot, als tweede import van `main.js`, vóór elke andere module). De modules lezen hun sleutel zoals altijd; bij de boot wordt de inhoud van die werksleutels omgewisseld naar die van de save die opent. Wat bij een andere save hoort, staat opzij onder `gde-scope-<slot>:<sleutel>`; `gde-save-scope` onthoudt wie de eigenaar van de werksleutels is.
- Nieuw spel (herlaad met een lege plek): de vorige voortgang gaat opzij, het nieuwe spel begint leeg.
- Een andere save kiezen in een lopend spel: eerst opslaan, dan herladen en die save openen (`saveslots.js markStay`), omdat modules hun stand in het geheugen houden.
- "Opslaan als nieuw spel" in een lopend spel: het lopende spel wordt de nieuwe save (`forkScope`); de oude houdt een kopie van dat moment.
- Een save wissen of een nieuw spel op een vrijgekomen plek: de opzij gezette voortgang van die plek gaat weg (`dropScope`).
- Migratie: voor deze wijziging was alles gedeeld. De laatst bewaarde save erft de gedeelde inhoud; een nieuw spel (of een tweede oude save) begint leeg. Niets wordt gewist: wie niemands erfgenaam is, staat onder `gde-scope-0:`. Prestaties uit een oude save komen daarnaast terug uit de save zelf (`prestaties.unlocked`).

## Inventaris

Legenda: S = per save (nu), A = apparaat (globaal), D = in de savegame zelf.

| Sleutel / gegeven | Was | Nu | Logisch? Besluit |
|---|---|---|---|
| gde-save-v1-nieuw, gde-save-slot-n-nieuw, herstelkopieen, thumbs, gde-save-slots-nieuw | S | S | Ja. |
| Savegame zelf (D): geld, gezondheid, wapens/munitie, eten, stats, personage, positie, plek, missies, verhaal (done/skipped/flags/gate), bezochte plekken, wijken-gezien, winkels, prestaties (alleen per-save-sets en unlocked), duif, bijbaan, postgame, meubels, financien, thuis, doel, radio aan/uit, streken, kalender, moeilijkheid, speeltijd, coop-gebeurtenissen | D | D | Ja. Cheats ("streken") zijn al per save. |
| gde-prestaties-v1-nieuw (prestaties, missierecords, medailles, uitdagingen) | A | **S** | Besluit: per save. Een nieuw spel met 75 prestaties is verwarrend en ontgrendelt voertuigen (politieauto). Een globale "ooit behaald" is een bewuste keuze die er nu niet is; zie "Beslissing nodig". |
| gde-verkenning-v1 (kaart verkend, mist) | A | **S** | Bug: nieuw spel 12%. |
| gde-gebieden-v1 (wijken/plaatsen/streken, "veroverd") | A | **S** | Bug. |
| gde-wijken-seen-nieuw (wijkkaarten gezien) | S met terugval op apparaat | **S** | Nieuw spel kreeg de apparaatlijst; nu leeg. |
| gde-garage-ontdekt-v1 | A | **S** | Bug (zie ook `unlockbase.js`, commit 8ccfa87d9: voertuigen aan een prestatie). |
| gde-loopbaan-v1, gde-voetbalcarriere-v1 | A | **S** | Loopbaan is spelvoortgang. |
| gde-bezit-v1, gde-boerderij-v1, gde-dieren-v1, gde-hengeltuig-v1, gde-visboek-v1, gde-beleid-v1, gde-reputatie-v1 | A | **S** | Wat de speler bezit hoort bij zijn spel. |
| gde-tuning-v1, gde-tuninglook-v1 | A | **S** | Tuning hoort bij de voertuigen van die save. |
| gde-snackketen-v1 | A | **S** | Voortgang. |
| gde-recap-v1 (recapkaart "Waar waren we?") | A | **S** | Hoort bij de stap van die save. |
| gde-hulp-v1 (stappen met hulp) | A | **S** | Hoort bij verhaalstappen. |
| gde-intro-seen-nieuw | A | A | Wordt alleen geschreven, nergens gelezen. De opening speelt op grond van de verhaalstap `opening` in de save, dus een nieuw spel speelt hem. Overslaan blijft kunnen. |
| gde-settings, gde-muted, gde-gfx-advice, gde-audioglitch-v1, gde-last-version, gde-menu-v1, gde-todo-filter, gde-map-layers | A | A | Ja: apparaat/voorkeur. |
| gde-uitleg, gde-hint-uses, gde-hints-gezien, gde-uitleg-niet-meer, gde-hud-gezien, gde-ovhint-v1, gde-boerderij-uitleg-v1, gde-sim-uitleg-v1, gde-oefenronde | A | A | Ja: wie het spel kent wil geen tutorial opnieuw. Twijfel: zie onder. |
| gde-radio-zender, gde-radio-praat, gde-radio-history-nieuw, gde-wijk-lines-recent | A | A | Ja: voorkeur en "recent gespeeld". |
| gde-voetbal-v1 (duur wedstrijd) | A | A | Ja: voorkeur. |
| gde-flavour-v1-nieuw, gde-banter-v1-nieuw, gde-duif-v1-nieuw | A | A | Herhalingsvoorkomers (recente regels); duif zit ook in de save. Ja. |
| gde-galerij-v1, gde-snapshots, gde-placeshots (foto's, thumbs) | A | A | Persoonlijk bezit van de speler, niet van de save. Twijfel: zie onder. |
| gde-ghosts-v1 (spookrijders) | A | A | Records per baan; twijfel. |
| gde-menuplekken-v1, gde-evenementen-v1 | A | A | Menu-achtergronden, evenementen gezien: apparaat. |
| gde-coop-sessie, gde-coop-signal-v1, gde-serverlijst-verborgen/-favorieten | A | A | Verbinding en lijsten: apparaat. Toestemmingen blijven apparaat. |
| gde-foutlog, gde-benchmark-last-v1, gde-nieuwverhaal, gde-oud-gemigreerd, gde-migrated-v1 | A | A | Techniek. |
| Windowstand (userData/window-state.json) | A | A | Apparaat. |
| Naam, kleur, figuur, outfit | D/A | niet onderzocht | Niet gevonden als aparte sleutel; het personage zit in de save. |

## Beslissing nodig (twijfelgevallen)

1. **Prestaties als "ooit behaald".** Aanbeveling: niet doen. Wie een globaal overzicht wil, krijgt het later als aparte, benoemde weergave. Nu: per save (de save onthoudt `prestaties.unlocked`).
2. **Foto's/galerij.** Aanbeveling: apparaat laten (het zijn herinneringen van de speler, geen voortgang).
3. **Tutorials/hints.** Aanbeveling: apparaat laten; "Uitleg opnieuw tonen" in Instellingen bestaat al.
4. **Ghosts (records per baan).** Aanbeveling: naar de save verplaatsen zodra baanrecords bij prestaties horen; nu apparaat.
5. **Eenmalige import/kopie van een save** (`copySlot`, import): de kopie begint zonder opzij gezette voortgang; prestaties komen uit de save terug. Aanbeveling: acceptabel.

## Niet in beeld bekeken

Alles is op code en pure tests gebaseerd (`scripts/savescope_test.mjs`); geen Electron gedraaid. Het Spel-overzicht met "Verhaal 50 van 71" en de datum van 14 augustus is er niet mee verklaard: de verhaalstand en de kalender zitten al in de save en worden bij een nieuw spel leeg gelezen. Controleer of op die test-save een hoofdstuk-sprong (dev/cheat) is gebruikt.
