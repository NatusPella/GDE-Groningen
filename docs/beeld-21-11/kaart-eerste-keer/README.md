# Kaart: eerste-keer-uitleg en Reis erheen (21-11, #1088)

Statische mock, **geen Electron en niet het echte spel**: echte tokens en echte opmaak uit `kaartactieui.js`, `ds-components.css` en `pausemenu.css`, met een nagemaakte kaart eromheen.
De ringen met cijfer staan hier vast; in het spel plaatst `plaatsWijzers()` (mapview.js) ze op het echte zoekveld en de knop Lagen.

| Bestand | Wat |
|---|---|
| `oud-eerste-keer-1920.png` | oud: minuscule tekst, breed leeg paneel, Enter-icoon in de knop, Lagen-paneel en legenda open |
| `nieuw-eerste-keer-1920.png`, `nieuw-eerste-keer-1280.png` | nieuw: 460 px, vier genummerde rijen, Lagen dicht, rustige dim, wijzers 1 en 2 |
| `nieuw-eerste-keer-rustig-drukwerk-1920.png` | nieuw met Rustig drukwerk |
| `oud-reis-uitklap-1920.png` | oud: Reis erheen klapt de plekkaart uit |
| `nieuw-reis-popup-1920.png` | nieuw: de plekkaart blijft compact, Reis erheen is een eigen venster |

Opnieuw maken (de oude kant komt uit `git archive origin/main game/js game/fonts` in een tijdelijke map):

```
node scripts/ui/kaart_eerste_keer_mock.mjs
node scripts/ui/kaart_eerste_keer_mock.mjs --oud=<map met game/js> --uit=<map>/mock-oud.html
node scripts/ui/kaart_eerste_keer_shots.mjs --oud=<map>/mock-oud.html
```

Nog in het echte spel te bekijken (niet in beeld gezien): de ringen op zoekveld en Lagen bij ui-schaal 1,0 tot 1,5, de Enter- en Esc-glyph naast de knop, controller (A en B), de focus bij openen, en de popup met een gast en met te weinig geld.
