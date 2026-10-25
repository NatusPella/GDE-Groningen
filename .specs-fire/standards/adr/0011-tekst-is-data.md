# 0011 - Tekst is data: canon, script, build, spel

- **Status:** besloten
- **Datum:** 2026-10-24 (vastgelegd 2026-10-25)
- **Spec:** `.specs-fire/standards/verhaal.md`

## Context

De verhaaltekst stond verspreid over JavaScript: een herschrijving moest in zeven
bestanden tegelijk gebeuren, en niemand kon zien of een regel al was ingesproken.
Een verhaalronde kostte daardoor dagen en leesrondes landden niet in de code.

## Besluit

Vier lagen, in deze volgorde: **canon** (`docs/verhaal/nieuw/00-OVERZICHT.md` plus
de akten) → **script** (`09-script-akte1..6.md`, `SPREKER: tekst [BEHOUDEN|NIEUW]`)
→ **build** (`scripts/build_story_data.mjs` → `game/storydata/script.json`, "do not
edit by hand") → **spel** (`storytext.js`, `storyarc.js`). Bewerken gebeurt in het
script, nooit in de gebouwde data.

## Afgewezen

- **Dialoog in JS laten.** Geen enkele bron, geen diff die een redacteur kan lezen,
  en elke herschrijving is een codeklus.
- **Een CMS of database.** Geen server, en de git-diff ís het reviewmiddel: een
  redacteur leest liever een patch dan een beheerpaneel.
- **Tekst en opname aan elkaar koppelen.** Dan is een tekstfix een nieuwe opname;
  in plaats daarvan is een regel zonder opname een ondertitel met leestijd.

## Gevolgen

`build_story_data.mjs --check` faalt als de build achterloopt. `[BEHOUDEN]` betekent
letterlijk: dezelfde tekst bestaat in de code, want anders is de opname stil
verdwenen. Een nieuwe regel zonder opname is zichtbaar in de opnamelijst
(`node scripts/opnamelijst.mjs`).
