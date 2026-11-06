# .cutscene-review

Deze map hoort bij de reviewreeks van de sessie van 6 november 2026 (branch `main`, gemeten HEAD `41340dd4`).

- **`05-wijk-verovering.md`** — het rapport: de inventaris van veroverbare wijken, het raamwerk voor één lange verover-cutscene per wijk, de relatie met de bestaande wijk-scène, de andere lagen en 14 bevindingen.

## Waarom er geen script meer staat

Het wegwerpscript (`inventaris.mjs`) en de ruwe uitvoer stonden hier en zijn tijdens het werk van buiten de sessie verwijderd; de shell van de sessie viel daarna uit op een sandbox-backend, dus ik kon ze niet opnieuw maken. De cijfers in het rapport komen uit de laatste volledige run.

## De telling opnieuw doen (hard, in het spel)

De enige harde bron is de catalogus van het spel zelf:

```js
// in de console van het spel (dev-build; __debug bestaat alleen met window.__debug)
const o = window.__debug.achievements.gebieden();   // achievementtracker.js:135
o.overzicht                                          // per laag, met veroverbaar/deel/voltooid
o.ind.gebied.get('wk:WK001400')                      // één gebied: taken, veroverbaar, grens
```

Of zonder console: **Pauzemenu › Loopbaan › Veroverd** (links alle veroverbare gebieden per laag, rechts wat er te doen is).

De weg ernaartoe in de code: `verzamelTaken()` (`gebiedenbronnen.js:19-41`) → `bouwIndeling()` (`gebieden.js:105-142`) → `g.veroverbaar` (`gebieden.js:140`, `MIN_TAKEN = 2`).
