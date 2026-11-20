# Iconen: licentie en naamsvermelding

Alle iconen in het spel zijn van **Phosphor Icons** (`@phosphor-icons/core` 2.1.1, https://phosphoricons.com), MIT-licentie, © 2023 Phosphor Icons. Zie ADR 0041.

Alleen de gebruikte iconen zitten in de repo, gebundeld in `game/js/phosphordata.js` door `scripts/ui/phosphor_kies.mjs`. De volledige licentietekst staat in `licenses/MIT-phosphor-icons.txt`; de vermelding staat in de credits van het spel (`game/js/credits.js`) en in `NOTICE.md`.

## Licentietekst

```text
MIT License

Copyright (c) 2023 Phosphor Icons

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Een icoon toevoegen

1. Zet een betekenisnaam in `game/js/iconmap.js` (naam in het Nederlands, Phosphor-naam als waarde).
2. Draai `node scripts/ui/phosphor_kies.mjs <map met het uitgepakte pakket>`; er wordt niets opgehaald.
3. Draai `node scripts/icons_test.mjs`.
