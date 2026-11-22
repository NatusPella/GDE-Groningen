# Sprint 22-11: beleving en juice (passanten, claxon, motor)

> Naslag voor de coördinator. Spec: [.specs-fire/standards/mechanica.md](../.specs-fire/standards/mechanica.md). Gebied: beloningsmomenten,
> camerafeedback, geluid bij acties, passantenreacties en voertuigfeedback. Branch `sprint-beleving-juice-22-11`.

## Wat al stond (niet opnieuw gebouwd)

Geldteller met pop en tik (`hud_panel.js`), Rakelings-beloning, timescale-dip en snelheids-FOV (`gamefeel.js`), Schermschudden en
Beweging beperken (`a11ylogic.js`), voetstappen per ondergrond (`sfx/steps.js`), bandenrook, stof, regenspat en wrakrook (`fx3d.js`),
passanten die vluchten, filmen en uitwijken (`pedestrians.js`). Het laadscherm heeft bewust geen tips meer (tekstdieet 21-11).

## Voor en na

| Gebied | Voor | Na | Bestanden | Test |
|---|---|---|---|---|
| Passanten bij een wandelende speler | negeren je, alleen een zwaai naar boten | soms een zwaai of "Moi!", nooit bij rennen, rijden, wapen of wanted, geen koor | `pedgreet.js`, `pedestrians.js` | `pedgreet_test.mjs` |
| De claxon | alleen geluid | wie voor de auto loopt draait zich om en moppert, per persoon 8 s afkoeltijd | `pedhorn.js`, `pedestrians.js` | `pedhorn_test.mjs` |
| Rakelings voorbij gerend | stilte tot er contact is | een geschrokken "Hé, kijk uit!" (geen aanraking, geen wanted) | `pedgreet.js`, `pedestrians.js` | `pedgreet_test.mjs` |
| Beschadigde motor | alleen rook uit de kap | onder 40% gezondheid hoest de motor bij gas, vaker naarmate het erger wordt, met ondertitel | `enginesputter.js`, `player.js`, `audio.js`, `soundcaptions.js` | `enginesputter_test.mjs` |

## Samen spelen

Alles is lokaal per speler: passanten, claxonreacties en het motorgeluid horen bij het eigen spel van de bestuurder. Er is geen
voortgang of beloning aan gekoppeld. Een gast ziet de zwaai via de bestaande groetvlag in `coopextra.js` (alleen voor wat de host synchroniseert).

## Nog niet in beeld bekeken (geen Electron in deze run)

- De zwaaiende arm bij een groet op een wandelende speler (scene3d tekent hem uit `greetUntil`, gedrag is voor boten al bekeken).
- Het sprekende tekstballonnetje bij de claxonreactie en de 'angry'-pose: komt het overeen met wat de bumpreactie toont?
- De klank van `engine_sputter` (twee zaagtandstoten op de UI-bus, 0,1 en 0,08 gain): niet beluisterd, alleen de regels en de bedrading zijn getest.
- Of de dichtheid van groeten in een drukke straat gevoelsmatig goed is (nu hoogstens één per 7 s, kans 16% per scan).
