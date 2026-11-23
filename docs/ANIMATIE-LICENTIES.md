# Licenties van mensmodellen en animaties

> Beleid: [ADR 0050](../.specs-fire/standards/adr/0050-gelicenseerde-modellen-en-animatiesets.md). Alleen CC0 en CC BY 3.0/4.0, gratis en ook commercieel bruikbaar; geen Mixamo, geen NC, ND of SA.
> Het spel haalt niets op. Alleen omgezette, gebruikte bestanden staan in de repo; ruwe packs blijven buiten git (`<thuismap>/gde-assets/`).
> Bij CC-BY staat de handle van de maker hier en in de credits van het spel (`game/js/credits.js`). Geen echte namen: alleen de handle die de bron toont.

## Bronnen

| Set | Maker (handle) | Bron | Licentie (zoals de bron toont) | Gecontroleerd | Gebruik in de repo |
| --- | --- | --- | --- | --- | --- |
| Universal Animation Library (Standard) | Quaternius | [quaternius.com/packs/universalanimationlibrary.html](https://quaternius.com/packs/universalanimationlibrary.html) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), "free to use in personal, educational and commercial projects" | 23-11-2026 | 27 clips geretarget op de modulaire mensen (in `game/models/mensen/*.bin`, naam `UAL_*`) |
| Ultimate Modular Men Pack (11 figuren, 24 animaties) | Quaternius | [quaternius.com/packs/ultimatemodularcharacters.html](https://quaternius.com/packs/ultimatemodularcharacters.html) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), "free to use in personal and commercial projects" | 23-11-2026 | Nieuwe basis voor mensen (besluit eigenaar 23-11); omgezet in `game/models/mensen/man.*` |
| Ultimate Modular Women Pack (10 figuren, 24 animaties) | Quaternius | [quaternius.com/packs/ultimatemodularwomen.html](https://quaternius.com/packs/ultimatemodularwomen.html) (glb via [poly.pizza](https://poly.pizza/bundle/Ultimate-Modular-Women-Pack-aCBDXDdTNN), ook CC0) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), "free to use in personal and commercial projects" | 23-11-2026 | Nieuwe basis voor mensen (besluit eigenaar 23-11); omgezet in `game/models/mensen/vrouw.*` |

## Bestanden in de repo

Gemaakt door `node scripts/people/quaternius_import.mjs --write` uit de packs buiten git (`<thuismap>/gde-assets/quaternius/`).

| Bestand | Bron | Licentie | Bewerking | Datum |
| --- | --- | --- | --- | --- |
| `game/models/mensen/man.json`, `man.bin` | Ultimate Modular Men Pack, glb: Casual Character, Hoodie Character, Business Man, Worker, Farmer, Punk, Beach Character | CC0 1.0 | alleen hoofd, romp, benen en voeten (geen wapens of rugzak); skelet van 62 naar 22 botten (vingers in de pols); vertices gelast zonder normalen en uv's, kleur als paletindex, posities Int16; twee LOD's per deel (vertex-clustering); alleen de clips Idle, Idle_Neutral, Walk, Run, Wave en Interact op 30 beelden/s (quaternionen Int16); importschaal 1 (man, 1,80 m tot de kruin) en 0,965 (vrouw, 1,69 m), gemeten met `scripts/people/mensen_maten.mjs` | 2026-11-23 |
| (in beide bestanden) | Universal Animation Library Standard, `UAL1_Standard.glb`: Idle_Talking_Loop, Sprint_Loop, Jog_Fwd_Loop, Walk_Formal_Loop, Crouch_Idle_Loop, Crouch_Fwd_Loop, Jump_Start/Loop/Land, Sitting_Enter/Idle_Loop/Talking_Loop/Exit, Driving_Loop, Swim_Fwd_Loop, Swim_Idle_Loop, PickUp_Table, Push_Loop, Hit_Chest, Hit_Head, Death01, Dance_Loop, Interact, Punch_Jab, Punch_Cross, Pistol_Idle_Loop, Pistol_Shoot | CC0 1.0 | geretarget per rig (romp, hoofd, schouders, polsen en voeten als draaiing ten opzichte van de rust; armen en benen op botrichting), alleen de hoogte van het bekken, 30 beelden/s, quaternionen Int16 | 2026-11-23 |
| `game/models/mensen/vrouw.json`, `vrouw.bin` | Ultimate Modular Women Pack, glb: Animated Woman (twee varianten), Suit, Worker, Punk, Adventurer | CC0 1.0 | zoals hierboven | 2026-11-23 |
