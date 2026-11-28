# Stand van het Antigravity-werk

Zet hier na elke reeks de commits (hash, korte omschrijving, tests). De coordinator zet er "overgenomen" of "overgeslagen (reden)" achter.

| Hash | Wat | Tests | Status |
|---|---|---|---|
| 506c207f4 .. 98bac0769 | Eerste reeks (`code-quality-improvements-27-11`): gitignore, 304-validatie, devWarn, escapeHtml, AbortController, tekstballon, kernsplitsing (deels), lobby, UI-fixes | zie commits | overgenomen op `antigravity-port-25-11` (nog niet in `main`) |
| 2f907bffe | Ronde 5 deel 1 (`code-quality-improvements-27-11`): Tab-focustrap en focusherstel in `saveslotsui.js`, Escape-volgorde voor tekstveldmenu (`textfield.js`, `main.js`, `tuningworkshopui.js`), blokkeer `aria-disabled` reset in `difficultypanel.js` | `node --check`, 16 gerichte UI/HUD-tests (ronde 5) | klaar voor port |
| 06fa4ee87 | Ronde 5 deel 2 (`code-quality-improvements-27-11`): focusbehoud + actieve wereld in `coopspelersui.js`, prestatietoasts blokkeren bij werkplaats/laadscherm en lettergrootte in `achievements.js`, dubbele stack/null-guard in `phonefeed.js` | `node --check`, `coopspelers_test.mjs` (13/13), `coopspeler_test.mjs` (8/8) | klaar voor port |
