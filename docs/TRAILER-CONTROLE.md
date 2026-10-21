# Trailers: wat is gecontroleerd (#63)

Twee nieuwe trailers van de nieuwste main, opgenomen in het echte spel (geen nagebouwde beelden): een **gameplaytrailer** en een **verhaaltrailer**,
beide 1080p60. Reproduceren: [scripts/trailer/README.md](../scripts/trailer/README.md). Het pakket staat buiten git in `C:\Users\abuis\GIT\GDE-Uploadpakket2`;
er is **niets** geüpload of aangemaakt (constitution 8).

## Eisen van de eigenaar en hoe ze zijn aangepakt

| Eis | Aanpak |
|---|---|
| A. Nieuwste main, preset Hoog, nieuwste UI, geen oude elementen | Build van origin/main (zie "Bron"), `?preset=quality:hoog,shadows:true,drawDistance:heelver,resolution:1,autoResolution:false`. Alle UI-beelden zijn schermen van het spel zelf (pauzemenu, kaart, garage met 3D-voorbeelden, Opgeslagen spellen, Samen spelen); geen aparte trailer-HUD. |
| B. Geen inladende mapdelen | Opnemen met vaste tijdstap en **wachten op de wereld voor elk beeld** (tegels, gebouwen, wegen, geometrie-worker); zie hieronder. |
| C. Audio zonder dips | Eén mix per trailer met ducking in plaats van losse stukken; alleen schone stukken van de Gemini-nummers; analyse per 100 ms. |
| D. Montage | Snijden op de maat (135,469 en 119,47 bpm), hook in 3 s, opbouw, slotkaart met titel en 18+. |
| E. Controle | Dit document en de rapporten per trailer in `controle/`. |

## Bron en instellingen

(wordt aangevuld met de commit, de build en de instellingen van de uiteindelijke opnames)

## Controle van het beeld

(wordt aangevuld)

## Controle van het geluid

(wordt aangevuld)

## Niet gecontroleerd

(wordt aangevuld)
