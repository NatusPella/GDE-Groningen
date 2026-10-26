# Design system: Samen spelen

How the UI of Samen spelen (multiplayer) looks and behaves, and what every new screen has to answer about it. The rules of the model are in ARCHITECTURE.md "Multiplayer" and AGENTS.md
("Multiplayer bij ontwerp"); the player's manual is [SAMEN-SPELEN-HANDLEIDING.md](SAMEN-SPELEN-HANDLEIDING.md); what a guest sees in game is in [COOP-GAST.md](COOP-GAST.md) and the handover in [COOP-OVERDRAGEN.md](COOP-OVERDRAGEN.md).
Back to [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). None of the screens below has been seen by a human in the finished game; the lists and cards were checked in code and in the bot tests only.

## Design for more than one player

**Every player is equal.** The one who opened the game only runs the world; that can change (host handover). The only thing that player may do that others may not is remove players from the shared game.
Time, travel, sleeping, loading, cheats and pausing are group decisions, never host rights. So for any new UI:

1. **Who sees it?** Say what a guest sees (a snapshot, an EXTRA message, or nothing) before the screen is called done. A screen that only the opener sees is a bug unless it is a world setting.
2. **Who may press it?** No button that only the opener gets, except "Eruit zetten" and the lobby controls of a session that is being opened.
3. **Whose is the result?** Money, progress and story belong to the player's own save and are given per event, never at the end. Say who gets the reward on the result card in the player's own words.
4. **What if someone drops or joins late?** The screen must have a sentence for it (see "Waiting").
5. **Is it a question for everyone?** Then it asks each player (Meedoen? J or N), with a stated default, and never decides for another.
6. **Where is it tested?** A pure test in `scripts/coop/` or a step in the test bank ([COOP-TESTBANK.md](COOP-TESTBANK.md)). The rule goes in the changelog or the issue, and in `docs/COOP-GAST.md` when it is new.

The 600 or so `world.player` references mean new code must not add another single-player assumption: take the player from the list, never "the" player.

## Words

- The mode is **Samen spelen**, never co-op, coöp or multiplayer; the waiting room is the **wachtkamer** or **kamer**, never "lobby". The main menu has **Alleen spelen** and **Samen spelen**.
- **Do not name a role.** Not "gastheer", "gastgever" or "host" in anything shown. Use the player's name (the character: Tammo, Tessa, or the profile name): "Tammo heeft het spel geopend",
  "Wacht tot Tammo het spel start". Without a name: "de ander". "Gast" only where it cannot be avoided. The buttons are **Een spel openen** and **Meedoen**. In code and docs the name stays `host`.
- Everything is the player's own words: "Je speelt weer in je eigen spel." Always say where the player lands after something ends ("je komt terug waar je was").
- No real names in session names (24 characters at most, with a word filter).

## The players list

Never permanent. Two places, same data (`coopspelersui.js`, data from `coopspelers.js`):

- **Hold Tab** (R3 on a controller, on foot): a list at the top centre (`#coop-spelers`, width `min(560px, 62vw)`, from 104 px down), a title in Bebas 22 px, a footer with the ping keys. It does not show over the map, a shop, the pause menu or a cutscene.
- **Pause menu > Spel > Spelers** (only in a session, `.pm-spelers`): the same list at 22 px, and the actions.

One row per player: **a shape and a colour** (16 shapes, `VORM_TEKEN`: triangle, diamond, square, circle, pentagon, star, plus, cross, moon, heart, bolt, drop, block, wave, shield, flower), the name (and "(jij)"),
what they are doing and how far away, and the connection: a dot (green `#3fc97a`, amber `#f2c94c`, red `#ff5a4f`) **plus a word** (goed, haperd, weg) and the ping in ms where known.
Shape plus colour, so the colour is never the only cue; a guest knows only its own ping, the opener knows all.
Per row, in the pause menu only: **Ga erheen** (sets a waypoint to that player), and for the opener **Spel overdragen** and **Eruit zetten** (the second asks "Zeker weten?" on the same button).
Roepen: **Kom hier** (7), **Help!** (8), **Kijk daar** (9); the beacon in the world is coloured per sender, and for an unknown sender blue, red and yellow (`SOORT_KLEUR`).

## Passive mode and fighting between players

- A button in Spelers: "Passieve stand: aan" or "Passieve stand: uit" (`aria-pressed`) and one explanation underneath (`PVP_TEKST`). On means no damage to or from players; switching back is not instant (a cooldown, said in words: "Even wachten: over N s kun je weer wisselen.").
- Players can only hurt each other when both are **uit**. Going down by another player costs nothing: "X heeft je neergeslagen. Je staat zonder kosten weer op en bent even beschermd." The others read "X heeft Y neergeslagen."
- The button only shows when the game knows the mode; an older version says "Dat spel kent de passieve stand nog niet."
- Blood and gore are shown only in PvP (constitution 6, 24-10); outside PvP the rule "zonder getoond geweld" stays. The game is 18+.

## Meedoen? (J or N)

When the opener starts a mission, side job or prize, every guest gets a card in zone A: **"Meedoen met X? J = ja, N = nee (anders doe je over 10 seconden mee)."** (`coopmeedoen.js`, `MEEDOEN_WACHT` 10 s.)

- No answer means yes after 10 s. **N** means "je kijkt even mee": the guest is free to walk, shop and eat, and gets no share of that reward; the world stays the opener's.
- Where the story needs the guest's lead (`presence 'beide'` or `needsTwo`) the card says **"X speelt Y. Het verhaal heeft jou nodig: je doet mee."** and there is no choice. Spoiler warnings need an explicit answer (no default yes).
- Races and rounds: a "Meedoen?" card on the board with the line "Wie finisht krijgt een beloning in het eigen geld." Nobody joins halfway a race or a golf round.
- Use the same two keys everywhere (J and N), shown as caps, and the same wording of the default.

## What does not work together yet

With two or more players, anything that does not fully work in Samen spelen says so (`coopstatus.js`, status `werkt` | `deels` | `nee`; with one player nothing changes, not even on a session of one).

- Map: a `nee` icon is greyed out (grayscale plus lower opacity, same grey as the passive players), a `deels` icon gets a small half-filled dot at the top right (shape, not only colour). Hover and click show **"Dit werkt nog niet samen."** or **"Dit werkt nog maar deels samen."** as a line of text (12 px or more, 14 words at most). A waypoint to such a goal shows the same line.
- Starting: one toast before the start, **"Dit werkt nog niet samen. Je kunt het toch proberen."** The player is never blocked; the guest and the opener both read it.
- A new thing that works together is set to `werkt` in the register, in the same change; `scripts/coopstatus_test.mjs` fails when a known activity, side job or minigame has no status.

## Host handover

Any player may be asked to take over the game (`coophostwissel*.js`, `multiplayerhostwisselui.js`).

1. The asked player gets a card (stays up to 20 s): **"X wil het spel aan je overdragen: jij houdt de wereld dan draaiend. J = ja, N = nee."**
2. While it happens everybody reads **"X neemt het spel over. Even wachten, het duurt een paar seconden."**; time, weather, police and traffic stay as they were.
3. After: **"X heeft het spel overgenomen. Je speelt nu mee in dat spel."** (the others) and **"Je hebt het spel overgenomen. De anderen verbinden nu met jou."** (the new opener).
4. When it fails every message says who keeps the game: "De ander wilde het spel niet overnemen. Jij houdt het spel.", "De overdracht duurde te lang. Jij houdt het spel.", "Verbinden met het nieuwe spel lukte niet. Je speelt weer in je eigen spel."
5. When the opener drops: **"Wie het spel opende is weggevallen. X neemt het over. Even wachten."**; if nobody can: "… Je speelt weer in je eigen spel." Nobody types a code (the route is a room that the old opener passes on).

Rule for any handover or drop message: it says what happened, who has the game now, and what the reader does (nothing, wait, or press J or N).

## Waiting

- **Lobby / wachtkamer** (`lobby.js`, `lobbyui.js`, the `.gm` surface): steps "Iemand uitnodigen" (a code to copy; "Kopieer" is primary until the start gate is open), "Aansluiten" (type the code; a figure to choose when you are third or later; the first guest is always Tessa because she belongs to the story),
  "Je speelt samen" (the list, "Spel starten" primary but disabled until two players are connected, "Wacht tot X het spel start", **Spel verlaten** or **Iedereen stoppen**).
- **Consent first**: "Eerst even toestemming" with the route's text; the primary button is **Akkoord en verbinden**, the other **Annuleren**. Nothing goes out before it. "Maak deze sessie openbaar" and "Openbare sessies" ask separately
  (name, player count and version only; no IP address, no password; constitution 4).
- **Connection lost** ("Verbinding weg", `coophold.js`): the game pauses for the player, the text names who is unreachable ("X is niet meer bereikbaar. Het spel staat stil tot jullie weer verbonden zijn."), and offers
  **Opnieuw verbinden** (primary), **Niet wachten** (the opener removes that player and goes on) or **Stoppen** (a guest leaves and lands in their own game), and **Verbinding testen**. It sits at z-index 9000 over everything.
- **While the opener watches a cutscene** a guest plays the same scene itself and may skip its own view (hold Space); if it cannot, a layer shows black bars, "X kijkt een filmpje. Je wacht even.", the spoken line with its speaker, and a choice
  the opener faces with "X kiest:" (`coopscene.js`). The choice is the opener's because the story belongs to that world. The notice "X heeft het spel op pauze" was **removed on 24-10** at the owner's request: no message when the opener opens a menu. The world itself still stands still for the guests while the opener is in a menu, the map or a shop (see debt); the design rule is that a menu pauses only the person who opened it.
- **Guest and the map**: "Reis erheen" is disabled for a guest with the reason "Reizen kan alleen in je eigen spel. Zet wel een waypoint en ga zelf." (`kaartactie.js`). A waypoint always works.
- **Joining or leaving** is a 0.35 s black fade (`fadeFlash`), not a message and not a flash.

## What stays to do

The list of known deviations, among them the extra colours of the players list and the pings and the Tab list without a touch or vehicle way, is in [DESIGN-SCHULD.md](DESIGN-SCHULD.md).
