# Fixes 22-11: beveiliging en build/release

Bron: `docs/reviews/CODE-REVIEW-22-11-security-build.md` (branch `review-security-build-22-11`). Branch: `fix-security-22-11`.

| Bevinding | Commit | Test |
|---|---|---|
| 1. `web/serve.mjs` mapgrens met `startsWith` en `URIError` bij `/gde/%` | ecc913aed | `scripts/web_serve_path_test.mjs` (pure resolver plus echte server) |
| 2. `android-branch.yml` zonder owner-guard, `world_tag` in `run` | 0d775e568 | `scripts/workflow_inputs_test.mjs` |
| 3. `pages-deploy.yml` `inputs.ref` in `run` (ook `inputs.speel`, voor consistentie) | 0d775e568 | zelfde test |
| 4. Getrackte tijdelijke bestanden | d6f44e13d | n.v.t. |
| 5. Gedeelde localStorage-origin op Pages | d6f44e13d | docs: sectie in `docs/PAGES-WORKFLOW-21-11.md` |

Niet getest: de workflows zelf (geen actionlint, geen run op GitHub). Geen spelerzichtbare wijziging, dus geen changelogregel.
`rules_audit --from=origin/main` geeft 0 blokkerend; `--from=v0.64.0` meldt 1 bestaande blokkerende regel in
`game/js/worldlifelines.js` (niet door deze fixes).
