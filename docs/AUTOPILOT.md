# Autopilot-wachtrij

`sh scripts/autopilot.sh` pakt de eerste onafgevinkte taak (`- [ ]`), laat een
begrensde Claude-run het in een eigen branch `autopilot/<datum>-<taak>` doen,
draait de node-tests en vinkt af (`[x]`), of markeert `[!]` als het niet slaagt.
Het script merget, pusht en released nooit: jij of ik bekijken de branch, draaien
één verhaaltest en mergen. Zie de kop van het script voor de instellingen
(`MAX_TASKS`, `DAILY_CAP`, `MODEL`, `TURNS`, `BUDGET_USD`, stopbestand
`.claude/autopilot.stop`).

Regels voor taken: klein en afgebakend (een uur werk), geen zware Electron-metingen,
geen nieuwe data downloaden, geen stemopnames. Voeg bovenaan of onderaan een
regel toe in dezelfde vorm. Grotere dingen (F2, water per tegel, 3D BAG voor de
provincie, Deel 4 bouwen) blijven voor interactieve sessies.

## Taken

- [ ] Verwijder de winterinhoud en het natuurijs uit docs/PROVINCIE-VERHAAL.md en docs/verhaal/deel4-f4*.md (het is altijd zomer): vervang door zomerse varianten, pas verwijzingen aan.
- [ ] Voeg prestaties toe voor driften (eerste driftzone, gouden medaille), meerijden in de trein (eerste rit) en de helikopter (eerste landing op het dak); Nederlandse teksten in de bestaande achievements-vorm, met een test.
- [ ] Laat in fetch_corridor.py en extract/fetch-scripts de Overpass-aanroep robuuster worden: Accept- en User-Agent-headers, exponentiële backoff, nette foutmelding; test met --dry-run (geen netwerk).
- [ ] Voeg een coach op de fiets toe naast de roeiacht in streetlife (rijdt langs de kade mee, oranje hesje, geen nieuwe modellen nodig als een bestaande fiets met rijder kan).
- [ ] NPC-fietsers en -voetgangers met een telefoon in de hand als zeldzaam gedrag (pose of eenvoudige handhoudingsmarkering) in pedestrians/streetlife, met spawnregels-test.
- [ ] Laat Esc in een lopende minigame (discgolf, pitch & putt, skatepark, karten, zwembad, klimtoren, waterskiën) eerst een kleine bevestiging 'Stoppen? Backspace/B' tonen in plaats van het pauzemenu, als dat met de bestaande minigamekit past; test.
- [ ] Schrijf de README bij: Nederlandse beschrijving van wat er sinds 0.30 is gekomen (hele provincie, schakelen/drift/motoren, nieuwe menu's/HUD, minigames), met bestaande screenshots uit docs/steam/beelden/screenshots; verifieer de gedocumenteerde commando's.
- [ ] Controleer alle 'de Grunn'-schrijfwijzen en echte merknamen in speltekst, ondertitels en teksten van docs/verhaal (niet de ingesproken manifests aanpassen): maak een lijst in docs/FEEDBACK-MATHIJS.md en pas tekstregels aan waar geen stem aan hangt.
