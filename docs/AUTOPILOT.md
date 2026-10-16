# Autopilot

De wachtrij staat niet meer in dit bestand: **het GitHub-bord is de bron van waarheid**
(https://github.com/users/NatusPella/projects/5, issues in `NatusPella/GDE-Groningen`).

`sh scripts/autopilot.sh` pakt de issue met het label `autopilot` die in de kolom
**Volgende** staat (laagste nummer eerst), zet hem op **Bezig**, laat een begrensde
Claude-run het doen in een eigen branch `autopilot/<datum>-issue-<n>-...`, draait de
node-tests, en zet hem op **Review** met een commentaar (of terug naar **Volgende**
met een commentaar als het niet slaagt). Het merget, pusht en released nooit.

Instellingen en rem: zie de kop van het script (`MAX_TASKS`, `DAILY_CAP`, `MODEL`,
`TURNS`, `BUDGET_USD`, stopbestand `.claude/autopilot.stop`). Kleine, afgebakende
taken (een uur werk) krijgen het label `autopilot`; grote dingen blijven voor
interactieve sessies.
