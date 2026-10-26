# #492 Loopbaan: een eigen sfeer per carrière

- **Issue:** #492
- **Epic:** #492
- **Complexity:** low
- **Mode:** autopilot
- **Depends on:** wi-492-trein-rooster

## Acceptatie

Elk van de negentien loopbaanvakken heeft een eigen, herkenbaar sfeermotief in de
Loopbaan-UI, zonder een nieuwe merkkleur.

- `game/js/carrieresfeer.js` (nieuw, puur) geeft per vak een Nederlandse naam, een
  motief en een patroon in cream en groen; dezelfde invoer geeft altijd hetzelfde
  patroon, en een onbekend vak geeft niets.
- `game/js/loopbaanui.js` toont het patroon als een dunne strip in de lijst en als
  een band boven het detail; de titel en het icoon blijven leidend.
- De boerenzakdoek bij Landbouw is geblokt cream/groen met een gevouwen punt. Rood
  blijft de enige gevarenkleur; een rode doek in de UI zou als waarschuwing lezen.
- `DESIGN_SYSTEM.md` en `docs/LOOPBAAN.md` leggen de regel vast; `CHANGELOG.md`
  krijgt een Nederlandse regel.
- Tests: `carrieresfeer_test` (elk vak, alleen tokens, zakdoek, UI-bron),
  `loopbaan_test`, `text_audit`, `undef_check`, `import_check`, `import_cycles_test`.

## Samen spelen

N (UI van de speler zelf). De sfeer hangt aan het vak, niet aan de wereld; elke
speler ziet hem in zijn eigen pauzemenu. Geen netwerk, geen gedeelde stand.

## Niet

Geen nieuwe 3D-kleding of wereldprop, geen tweede rood, geen wijziging aan de
loopbaangegevens of de beloning.
