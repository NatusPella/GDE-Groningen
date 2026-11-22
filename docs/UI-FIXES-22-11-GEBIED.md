# UI-fixes 22-11: pauzemenu en instellingen

Uitvoering van de UI-kritiek op het pauzemenu (issues #1257 tot en met #1259 en #1263 tot en met #1282; het rapport staat in `docs/UI-KRITIEK-22-11-menu.md` op de branch `ui-kritiek-menu-22-11`). Branch: `ui-fix-menu-22-11`. Bewijs: pure tests in `scripts/menu_accolades_test.mjs` en de bestaande suites, en een harnasrender (`scripts/ui_critic/render.mjs`, statische DOM met de echte CSS) van Spel, Prestaties, Garage, Over en Veroverd. **Nog niet bekeken in het echte spel.**

## Opgelost

| Issue | Oplossing | Bewijs |
|---|---|---|
| #1257 ruwe `{ACCOLADES}` | `braceKeysHtml` (keycap.js) zet alleen `{TOKEN}`s om; `rowName`, kiezernotities, uitklappers, de bindnotitie, de benchmarkvraag en `FOTO_TIPS` gaan er doorheen | `menu_accolades_test`, render Spel (Doorgaan met toetsplaatje) |
| #1259 Overzicht | "Stap 1 van n" in plaats van "Stap 0", geen tegel "0/0 Missies klaar", Doorgaan met toetsplaatje | render Spel, `menu_accolades_test` |
| #1263 gekantelde banner | brede kopkaarten (Prestaties, Foto's, Voetbal) krijgen `ds-z-kaart--recht` | render Prestaties: banner recht, geen overlap met tabs of teller |
| #1264 Loopbanen | geen herhaalde "Open voor je", geen dubbele kop bij een lege loopbaan, racket (padel) en trekker herkenbaar | `careertimeline_test` |
| #1265 Verhaal > Opdrachten | zonder open missie kiest het detail het verhaalitem, geen minigame (Padel) | `menu_accolades_test` |
| #1267 Activiteiten | "Op de kaart" overal; "Meer details" in plaats van de debugregel "Alle cijfers 13 regels" | `menu_aaa_test` |
| #1269 Veroverd | geen "0 van 0"-tegels en geen "alles gedaan" zolang de gebieden niet geladen zijn | `gebieden_test` |
| #1270 Visboek | een pictogram per watertype, gestijlde kop "Per water" | `menu_accolades_test` |
| #1271 Over | zonder wijzigingenlijst blijven versie, credits en licenties staan (geen foutzin), "Ruwe meldingen" in plaats van "(in het Engels)", Wissen vraagt een tweede klik | `over_menu_test` |
| #1273 Snackwagen | tegel heet "Reputatie" en toont "50 van 100"; plekknop "Op de kaart" in plaats van "Doel" | `snackui_test` |
| #1275 Moeilijkheid | de uitleg staat op dezelfde linkerrand als de rijen | `menu_accolades_test` |
| #1276 Instellingen | omschrijving van Bloed en ledematen beschrijft beide standen; kaartrichting past bij de standaard "In de lucht" | `menu_accolades_test` |
| #1277 Geluid | "Binnenkort" in de zenderlijst is een etiket | `menu_accolades_test`, `radiochannels_test` |
| #1281 Opslaan en stoppen | "Opslagplek" in plaats van "Savegame", "Missie stoppen" alleen bij een lopende missie | `spelmenu_test`, `coopgaten_test` |
| #1282 Garage | geen tab "Alles" bij één categorie, tabs zonder eigen voertuig zonder "0" en gedimd | `menumodels_test` |

## Overgeslagen

- #1266 (Personages) en #1268 (Cheats): staan al op de lopende branch `personages-ui-22-11` (vaste kop, Overig als Nieuws en meldingen; Cheats alleen in dev of na opt-in). Alleen commentaar. Wat daarna nog open is van #1268 (lege koppen, vier keer "CHEATS") hoort bij die branch.
- #1278 (Samen spelen in het menu): wordt opgelost door `samen-flow-ux-22-11` (wizard, spelerskaartjes).
- #1258, #1272, #1274, #1279, #1280: ontwerpwerk (een tabcomponent voor het hele menu, native keuzelijsten vervangen, tekstmuren omzetten naar plaatjes, toetsbalken samenvoegen) dat een visuele beslissing en echte beeldrondes vraagt; zonder dat is het risico op een slechter menu groter dan de winst. Alleen commentaar.

## Samen spelen

Alle gewijzigde schermen zijn per speler (lokale weergave van het pauzemenu); niets verandert aan de snapshot, de beloningen of de voortgang. De Snackwagen-tegel toont de reputatie van wie het spel opende (de wereld), zoals eerder.
