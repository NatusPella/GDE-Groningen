# QoL-stand 21-11 (epic #985, de 52 bevindingen van 17-11)

Nummering: de volgorde van de lijst in #985 (Invoer 1-7, Opslaan 8-14, HUD 15-19, Economie 20-26,
Samen spelen 27-30, Audio 31-36, Wereld 37-40, Voortgang 41-45, Voertuigen 46-52).
Alles is in de code gezien en met pure tests of brontests gedekt; **niets is in een draaiend spel bekeken.**

Telling: 41 al gedaan (in main of integratie voor deze ronde), 5 nu gedaan, 6 niet of maar deels (met reden).

## Nu gedaan in deze ronde

| # | Punt | Wat |
|---|------|-----|
| 11 | Savekaart: donkere thumbnail | `thumbLift` in `savegame.js`: een te donker kaartje wordt lichter getekend (maximaal 2,2 keer). Brontest in `savegame_test`. De plek ("waar je was") stond er al. |
| 16 | "Opnieuw beginnen" verloopt na 40 s | Overzicht toont na een mislukking de rij Mislukt met Opnieuw beginnen (`retryBeschikbaar`, `herstartMissie`). |
| 18 | Geld in Slim meestal onzichtbaar | Na het sluiten van het pauzemenu blijft het saldo een paar seconden in beeld (`hud_panel.js`). |
| 19 | Herstarthint "Enter (of E)" op een telefoon | De hint volgt de echte besturing (`keyWord`, `touchLabelForToken`). |
| 42 | Prestaties zonder voortgangsbalk: detail zegt alleen "Nog niet behaald" | Het detail noemt de categorie en of de prestatie in één keer gaat. |

## Al gedaan

1 toets 5 in het Toetsenoverzicht (pausemenu) · 2 hintvoorbeeld volgt de herbonden instaptoets · 3 schuiven zonder
betekenisloos percentage · 4 ondertitels hebben een uit-stand (`sub-uit`) · 5 schermnarratie leest de echte springtoets ·
6 Standaard herstellen bewaart de online-identiteit · 7 tabblad heet Spelregels · 8 Opslaan mislukt: één uitleg en een
blijvend chipje · 9 F5 slaat op · 10 nieuwe spellen krijgen een naam · 12 laadscherm te onderbreken met Verder, Enter of
Escape (de tweede helft staat hieronder) · 13 Afsluiten zegt wat niet bewaard is · 14 opslaan in een boot zegt dat de boot
blijft liggen · 15 waarschuwing bij 30 en 10 s missietijd · 17 minimap opent de kaart (`minimaptap.js`) · 20 eigen
voertuig verkopen · 21 beleidswinkel met saldo en `betaalbaar` · 22 boerderij-aankopen vragen een tweede druk · 23
loonschatting uit de regels van de baan (`loonSchatting`) · 24 duizendscheiding · 25 afleverfee vraagt bevestiging ·
26 Upgrades-teller · 27 dubbele naam en kleur · 28 Verbinden met voortgangsregel · 29 wachtscherm Opnieuw verbinden · 30
`sessieVan` leest `net.code` · 31 voorlaadvoortgang (`setBootPlan`/`setBootStep`, concrete statusregels) · 33 radiostand bewaard
(`gde-radio-praat`) · 34 reclames korter · 35 spraakdemping onder motor · 36 geluidsondertitels uitgebreid · 37 Te doen
verbergt onbekende streken · 38 evenementen in de agenda · 39 galerij zegt dat de oudste foto vervalt · 40 klok in Minimaal ·
41 streken: teller en lijst · 44 prestaties staan stil bij een cheat: uitleg · 46 vastgelopen-hint · 48 lekke band: uitleg en
gloed op de minimap · 49 eigen voertuig buiten beeld: randpijl · 50 Q-hint (alleen in een voertuig) · 51 schadebalk met fase ·
52 politiezoekcirkel volgt het niveau.

## Niet, of maar deels

| # | Punt | Reden en voorstel |
|---|------|-------------------|
| 1 (deel) | Toets 5 op controller of aanraakscherm | Op de voetindeling zijn alle D-pad-richtingen bezet (n, k, o, r) en de Meer-knop op aanraak leest de D-padslots uit `PAD_MAPS`. Een plek geven is een ontwerpkeuze van de eigenaar: voorstel een nieuwe `extra`-slot (D-pad plus L3 houden) of 5 als vaste Meer-rij. |
| 12 (deel) | Tweede laadscherm na een reis | Hoort bij `loadscreen.js`/`loadlogic.js` waar een andere agent aan werkt. Eerst meten in een draaiend spel welk tweede scherm het is. |
| 32 (deel) | Radiopools zijn piepklein | Alleen de volgorde is verbeterd (nooit direct dezelfde regel). Grotere pools vragen nieuwe opnames (`voice_coverage` eist een stem per regel; AGENTS.md: audio is van de eigenaar). Voorstel: per pool minstens vier regels in de volgende opnameronde. |
| 43 | "De hele kaart verkend" zonder tussenstap | Een tussenprestatie (bijvoorbeeld `kaart_75`) verandert het aantal prestaties (221), dat in vijf documenten en de Steam-checklist staat. Bundelen met de volgende prestatieronde, met `spec_check --write`. |
| 45 | De Duizendpoot betaalt weinig | Gedaan op balans-21-11 (#1050): €750 wordt €2.000, onderbouwing in docs/BALANS-21-11.md. |
| 47 | Afgeleverde eigen auto slaapt nooit in | Een slaapstand haalt het voertuig uit `world.vehicles`; kaartmarker, `statusOf`, opruimen, bezorgen en de gastweergave lezen die lijst. Raakt `vehicle.js` (andere agent) en vraagt een meting. Voorstel: een slaapset naast `parkedcars.js`. |

Eerder bewust niet gebouwd en niet in deze lijst: F9 (snelladen) vraagt eerst een besluit over de bevestiging, want laden overschrijft je stand.
