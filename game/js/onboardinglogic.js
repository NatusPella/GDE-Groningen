// De pure regels van de uitlegkaarten (onboarding.js): welke ids er zijn, wanneer alles gezien is en wanneer een kaart
// die aan een eerdere kaart hangt mag komen. Geen DOM en geen opslag: scripts/verfijn_onboarding_test.mjs draait het in node.
export const LESSON_IDS = Object.freeze(['doel', 'geld', 'kaart', 'tedoen', 'eerstedag', 'samen']);

// Alles gezien? Telt alleen de echte kaarten: een vreemd id in de opslag (een oudere versie, een met de hand bewerkt bestand)
// telde eerst mee in seen.size, waardoor de uitleg te vroeg "af" was en de laatste kaart nooit meer kwam.
export const lessonsAllSeen = (seen) => !!seen && LESSON_IDS.every((id) => seen.has(id));

// De eerste kaart ("Je eerste klus") hoort bij een spel zonder gehaalde missie. Wie een bestaand spel laadt (missionsDone > 0)
// krijgt hem nooit, en de kaarten die erop volgen ('Zelf kiezen') wachtten daar eeuwig op: voor die speler komen ze nu gewoon.
export const goalHandled = (seen, missionsDone) => !!seen && (seen.has('doel') || (Number(missionsDone) || 0) > 0);

// Hoeveel woorden een uitlegkaart hooguit heeft (het tekstdieet, ui-taal.md): kort genoeg om in één blik te lezen.
export const LESSON_MAX_WORDS = 22;

// De melding na "Uitleg opnieuw tonen". Staat "Uitleg voor nieuwe spelers" uit, dan komen er geen kaarten: de melding zegt dat,
// in plaats van te beloven dat ze vanzelf komen (22-11).
export const explanationResetMessage = (tipsAan) => (tipsAan === false
  ? 'De uitleg begint opnieuw. Zet "Uitleg voor nieuwe spelers" aan om de kaarten te zien.'
  : 'De uitleg begint opnieuw; de eerstvolgende kaarten en hints komen vanzelf.');
