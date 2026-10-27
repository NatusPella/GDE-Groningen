# Walkthrough — wi-492-loopbaan-sfeer (#492)

## Wat er is gedaan

- `game/js/carrieresfeer.js` (nieuw, puur): per loopbaanvak een Nederlandse naam, een
  motief en een patroon. Dezelfde invoer geeft altijd hetzelfde patroon; een onbekend vak
  geeft niets. De patronen gebruiken alleen cream en groen (`rgba` van de tokens), nooit
  een losse hex of een tweede rood.
- `game/js/loopbaanui.js`: een dunne sfeerstrip in elke rij van de loopbaanlijst en een
  sfeerband boven het detail. De titel en het icoon blijven leidend; de band is decoratie
  met een korte Nederlandse regel.
- **Boerenzakdoek**: geblokt cream/groen met een gevouwen punt bij Landbouw. Rood is in
  dit designsysteem de enige gevarenkleur; een rode doek in de UI zou als waarschuwing
  lezen. De vorm (ruit en vouw) draagt de verwijzing.
- `DESIGN_SYSTEM.md` en `docs/LOOPBAAN.md` leggen de regel vast; `CHANGELOG.md` noemt de
  sfeer per loopbaan.

## Checks

- `node --check` op de nieuwe en gewijzigde JS.
- `carrieresfeer_test` 6/6: elk vak, unieke namen, alleen de tokens, de zakdoek, de
  UI-bron en een onbekend vak.
- `loopbaan_test` 32/32, `loopbaanstart_test` 11/11, `loopbaan_balans_test` 9/9,
  `a11y_test` 39 checks.
- `import_check` 1887 bestanden, `import_cycles_test` 0 cycli, `undef_check` 1734
  modules, `text_audit` 0 bevindingen.
- De patronen zijn in een losse HTML-preview in Chromium bekeken: alle 19 banden
  renderen, geen horizontale overflow; de gevouwen punt van de zakdoek zit binnen de band.

## Review

Autopilot: geen aparte reviewer. De diff is klein en de patronen zijn puur; de
belangrijkste risico's (een nieuwe kleur, een lege band, een verkeerd vak) zijn in de
test afgedekt.

## Niet getest

- De echte Loopbaan-pagina in het spel (pauzemenu/Electron) is niet in beeld bekeken;
  alleen de losse preview en de bron.
- De sfeer bij een gast in een echte sessie: het is UI van de speler zelf, dus geen
  netwerkpad, maar niet samen nagespeeld.
- De leesbaarheid van de band op een klein scherm is niet met een echte Deck-opname
  gemeten; de mediaquery verkleint de band naar 34 px.

## Open / volgende

- De per-groep wereldstaat voor twee gelijktijdige missies/bijbanen is het laatste grote
  SIM-stuk.
