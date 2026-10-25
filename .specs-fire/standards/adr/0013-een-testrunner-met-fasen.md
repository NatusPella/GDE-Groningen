# 0013 - Eén testrunner met drie fasen

- **Status:** besloten (25-10-2026)
- **Datum:** 2026-10-25
- **Spec:** `.specs-fire/standards/publicatie.md` en `testing-standards.md`

## Context

Er zijn twee runners: `scripts/test_all.mjs` met de fasen licht, zwaar en electron
(en een rapport met trend), en `scripts/run_tests.mjs` met een snelle selectie die
CI draait. Ze dekken verschillend: `run_tests` kent geen `text_audit`,
`undef_check`, dode-code-bewaking en geen fasen. Daardoor meldt CI groen wat lokaal
kan falen (#481), en niemand weet welke runner "de" waarheid is.

## Besluit

`test_all.mjs` is de runner; `run_tests.mjs` blijft bestaan als de snelle
selectie voor CI en deelt zijn lijsten (`EXCLUDED`, `SLOW`, `MISSING_DATA`,
`listFiles`) met `test_all`, zodat CI nooit iets anders meet dan de lichte fase.
CI draait de lichte fase plus de drie Python-tests; de zware en Electron-fase
blijven lokaal bij de coördinator. `undef_check` en `text_audit` zitten sinds #482
in `run_tests` en dus in CI: dat zijn de twee poorten die een echte fout
(`heist.js`) vingen die CI miste.

## Afgewezen

- **Twee gelijkwaardige runners houden.** Twee definities van "groen" is erger dan
  een langzame run: de een mist een gate die de ander heeft.
- **Alles in CI.** De zware en Electron-fase kosten 20-60 minuten per stuk, en de
  wereld moet eerst gestaged worden; dat past niet in 2000 gratis minuten.
- **`run_tests.mjs` schrappen.** CI heeft een snelle selectie nodig, en de lijsten
  zijn nuttig los van de runner.

## Gevolgen

De keuze is nog niet genomen; dit is een voorstel bij #481. Zodra hij besloten is,
krijgt deze ADR status `besloten` en verwijst `testing-standards.md` naar één runner.
Tot die tijd geldt: wie een gate toevoegt, zet hem in `test_all` en niet alleen in
`run_tests`.
